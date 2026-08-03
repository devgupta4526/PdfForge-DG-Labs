/**
 * POST /api/pdf/compress?level=low|medium|high
 *
 * Multipart upload (`field name: file`) of a single PDF. Validates magic
 * bytes via the shared upload middleware, runs the in-memory compression
 * pipeline, persists the result via the active storage driver, and returns
 * a presigned download URL plus before/after stats.
 *
 * The output is auto-deleted after `TEMP_FILE_TTL_MS` via the file-deletion
 * job (works in both BullMQ and in-memory scheduler modes).
 */

import { Router, type RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { env } from '../../lib/env.js';
import { compressPdf, PdfCompressionError } from '../../lib/pdf/compress.js';
import { scheduleFileDeletion } from '../../jobs/index.js';
import {
  buildKey,
  getPresignedDownloadUrl,
  putObject,
  uploadMiddleware,
} from '../../storage/index.js';

const router = Router();

const QuerySchema = z.object({
  level: z.enum(['low', 'medium', 'high']).default('medium'),
});

const COMPRESS_MAX_BYTES = Math.min(env.MAX_UPLOAD_SIZE_MB * 1024 * 1024, 100 * 1024 * 1024);

const handler: RequestHandler = async (req, res, next) => {
  const requestId = req.id;
  const startedAt = Date.now();

  try {
    const queryParse = QuerySchema.safeParse(req.query);
    if (!queryParse.success) {
      throw new AppError({
        statusCode: 400,
        code: 'INVALID_QUERY',
        message: 'Invalid `level` query parameter. Allowed: low, medium, high.',
        details: queryParse.error.flatten(),
      });
    }
    const { level } = queryParse.data;

    const files = req.files ?? [];
    if (files.length === 0) {
      throw new AppError({
        statusCode: 400,
        code: 'NO_FILE',
        message: 'A single PDF file is required (multipart field "file").',
      });
    }
    if (files.length > 1) {
      throw new AppError({
        statusCode: 400,
        code: 'TOO_MANY_FILES',
        message: 'Compress accepts exactly one PDF per request.',
      });
    }
    const incoming = files[0];
    if (!incoming || incoming.detectedKind !== 'pdf') {
      throw new AppError({
        statusCode: 415,
        code: 'NOT_A_PDF',
        message: 'Compression requires a PDF file.',
      });
    }

    logger.info('Compress: starting', {
      requestId,
      level,
      filename: incoming.filename,
      sizeBytes: incoming.sizeBytes,
    });

    let result;
    try {
      result = await compressPdf(new Uint8Array(incoming.buffer), level);
    } catch (err) {
      if (err instanceof PdfCompressionError) {
        const status = err.code === 'ENCRYPTED_PDF' ? 422 : err.code === 'EMPTY_PDF' ? 400 : 422;
        throw new AppError({
          statusCode: status,
          code: err.code,
          message: err.message,
          details: err.details,
        });
      }
      throw err;
    }

    const outputKey = buildKey('compressed', 'pdf');
    const operationId = randomUUID();

    await putObject(outputKey, {
      body: Buffer.from(result.bytes),
      contentType: 'application/pdf',
      contentLength: result.bytes.byteLength,
    });

    const ttlSec = Math.max(60, Math.floor(env.TEMP_FILE_TTL_MS / 1000));
    const presigned = await getPresignedDownloadUrl(outputKey, ttlSec);

    // Schedule the cleanup. The deletion job is tolerant of a missing DB row
    // (see file-deletion.job.ts), so we don't need to insert an `operations`
    // row here — that would make compress unusable in DB-less local dev.
    try {
      await scheduleFileDeletion(outputKey, operationId, env.TEMP_FILE_TTL_MS);
    } catch (err) {
      logger.warn('Compress: failed to schedule deletion (continuing)', {
        requestId,
        outputKey,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const downloadFilename = buildDownloadFilename(incoming.filename);

    logger.info('Compress: completed', {
      requestId,
      level,
      filename: incoming.filename,
      originalSize: result.stats.originalSize,
      compressedSize: result.stats.compressedSize,
      reductionPercent: result.stats.reductionPercent,
      imagesScanned: result.stats.imagesScanned,
      imagesRecompressed: result.stats.imagesRecompressed,
      imagesSkipped: result.stats.imagesSkipped,
      elapsedMs: Date.now() - startedAt,
    });

    res.status(200).json({
      ok: true,
      downloadUrl: presigned.url,
      downloadFilename,
      key: outputKey,
      expiresAt: presigned.expiresAt,
      originalSize: result.stats.originalSize,
      compressedSize: result.stats.compressedSize,
      reductionPercent: result.stats.reductionPercent,
      level: result.stats.level,
      details: {
        imagesScanned: result.stats.imagesScanned,
        imagesRecompressed: result.stats.imagesRecompressed,
        imagesSkipped: result.stats.imagesSkipped,
        metadataStripped: result.stats.metadataStripped,
        formsFlattened: result.stats.formsFlattened,
        elapsedMs: result.stats.elapsedMs,
      },
    });
  } catch (err) {
    next(err);
  }
};

router.post(
  '/',
  uploadMiddleware({
    maxFiles: 1,
    maxFileSizeBytes: COMPRESS_MAX_BYTES,
    acceptKinds: ['pdf'],
    requireAtLeastOne: true,
  }),
  handler,
);

function buildDownloadFilename(originalName: string): string {
  const trimmed = originalName.replace(/\.pdf$/i, '');
  const safe = trimmed.length > 0 ? trimmed : 'document';
  return `${safe}-compressed.pdf`;
}

export { router as compressRouter };
