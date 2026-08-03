/**
 * Local-driver HTTP endpoints — the server-side counterpart of the HMAC
 * "presigned" URLs handed out by `localDriver.getPresignedUploadUrl()` and
 * `getPresignedDownloadUrl()`.
 *
 * These routes are mounted ONLY when STORAGE_DRIVER=local. In R2 mode the
 * client uploads directly to Cloudflare and never hits us, so there's
 * nothing to mount.
 *
 * Endpoints:
 *
 *   POST /api/storage/upload
 *     - multipart/form-data with `file` part + `key`, `Content-Type`,
 *       `X-Max-Size`, `X-Expires`, `X-Token` form fields.
 *     - Verifies HMAC token, enforces tier-independent maxSize from the
 *       token (so a free user can still upload a 50 MB file via a
 *       URL we minted for them), magic-byte-validates the bytes, writes
 *       to disk under LOCAL_STORAGE_DIR.
 *
 *   GET  /api/storage/download/:key
 *     - Query: `token`, `exp`. Verifies HMAC token, streams the file.
 *
 *   GET  /api/storage/raw/:key
 *     - Convenience for `getPublicUrl()` — UNAUTHENTICATED, intended
 *       for dev only, never enabled in production (env safety check
 *       prevents STORAGE_DRIVER=local in prod anyway).
 */

import path from 'node:path';
import { Router, type RequestHandler } from 'express';
import Busboy from 'busboy';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import {
  StorageError,
  isValidKey,
  localStorageRoot,
  putObject,
  verifyDownloadToken,
  verifyUploadToken,
} from '../storage/index.js';
import {
  FileValidationError,
  assertContentTypeMatches,
  detectAndValidate,
} from '../storage/validation.js';

const router = Router();

/* ─────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────── */

interface UploadFormState {
  fields: {
    key?: string;
    contentType?: string;
    maxSize?: number;
    expires?: number;
    token?: string;
  };
  fileBuffer?: Buffer;
  filename?: string;
  fileMime?: string;
  fileSize: number;
  receivedFile: boolean;
  fileLimitHit: boolean;
}

function httpError(
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): AppError {
  return new AppError({ statusCode, code, message, details });
}

const ABSOLUTE_MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GiB hard ceiling

/* ─────────────────────────────────────────────────────────────────
 * POST /api/storage/upload
 * ──────────────────────────────────────────────────────────────── */

const handleUpload: RequestHandler = (req, res, next) => {
  const contentType = req.header('content-type');
  if (!contentType || !contentType.toLowerCase().startsWith('multipart/form-data')) {
    next(
      httpError(
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        'Request Content-Type must be multipart/form-data',
      ),
    );
    return;
  }

  const state: UploadFormState = {
    fields: {},
    fileSize: 0,
    receivedFile: false,
    fileLimitHit: false,
  };
  let settled = false;

  const fail = (err: Error): void => {
    if (settled) return;
    settled = true;
    try {
      req.unpipe(busboy);
    } catch {
      /* ignore */
    }
    busboy.destroy();
    next(err);
  };

  let busboy: Busboy.Busboy;
  try {
    busboy = Busboy({
      headers: req.headers,
      limits: {
        // We don't yet know the per-token maxSize at construction time,
        // so cap at the absolute ceiling and validate against the token
        // value once we've parsed it.
        fileSize: ABSOLUTE_MAX_BYTES,
        files: 1,
        fields: 10,
        fieldSize: 4 * 1024,
      },
    });
  } catch (err) {
    next(
      httpError(400, 'MALFORMED_MULTIPART', 'Could not parse the multipart request', {
        cause: err instanceof Error ? err.message : String(err),
      }),
    );
    return;
  }

  busboy.on('field', (name, value) => {
    switch (name) {
      case 'key':
        state.fields.key = value;
        break;
      case 'Content-Type':
      case 'content-type':
        state.fields.contentType = value;
        break;
      case 'X-Max-Size':
      case 'x-max-size':
        state.fields.maxSize = Number(value);
        break;
      case 'X-Expires':
      case 'x-expires':
        state.fields.expires = Number(value);
        break;
      case 'X-Token':
      case 'x-token':
        state.fields.token = value;
        break;
      default:
        // ignored — unknown fields are not part of the contract
        break;
    }
  });

  busboy.on('file', (_fieldName, stream, info) => {
    state.receivedFile = true;
    state.filename = info.filename;
    state.fileMime = info.mimeType;
    const chunks: Buffer[] = [];
    let total = 0;

    stream.on('data', (chunk: Buffer) => {
      total += chunk.length;
      chunks.push(chunk);
    });
    stream.on('limit', () => {
      state.fileLimitHit = true;
      fail(
        httpError(413, 'FILE_TOO_LARGE', 'Upload exceeded the absolute size ceiling.', {
          attemptedBytes: total,
          ceilingBytes: ABSOLUTE_MAX_BYTES,
        }),
      );
    });
    stream.on('end', () => {
      state.fileBuffer = Buffer.concat(chunks, total);
      state.fileSize = total;
    });
    stream.on('error', (err) => {
      fail(
        httpError(400, 'UPLOAD_STREAM_ERROR', 'Error reading uploaded file', {
          cause: err.message,
        }),
      );
    });
  });

  busboy.on('error', (err: unknown) => {
    fail(
      httpError(400, 'MULTIPART_PARSE_ERROR', 'Could not parse multipart body', {
        cause: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  busboy.on('finish', () => {
    if (settled) return;

    void (async () => {
      try {
        const { key, contentType: ct, maxSize, expires, token } = state.fields;
        if (!key || !ct || !maxSize || !expires || !token) {
          throw httpError(400, 'MISSING_FIELDS', 'Required form fields are missing.', {
            required: ['key', 'Content-Type', 'X-Max-Size', 'X-Expires', 'X-Token'],
          });
        }
        if (!Number.isFinite(maxSize) || maxSize <= 0 || maxSize > ABSOLUTE_MAX_BYTES) {
          throw httpError(400, 'INVALID_MAX_SIZE', 'X-Max-Size is invalid.', { maxSize });
        }
        if (!isValidKey(key)) {
          throw httpError(400, 'INVALID_KEY', 'Storage key is malformed.', { key });
        }
        if (!state.receivedFile || !state.fileBuffer) {
          throw httpError(400, 'NO_FILE', 'No file part was provided.');
        }
        if (state.fileLimitHit) return; // already responded

        // Token verification — pinpoints both expiry and tampering.
        verifyUploadToken({ key, contentType: ct, maxSize, exp: expires, token });

        // Token-driven size cap. The absolute ceiling has already been enforced
        // by busboy; here we enforce the per-URL promise.
        if (state.fileSize > maxSize) {
          throw httpError(
            413,
            'FILE_TOO_LARGE',
            `Upload is ${state.fileSize} bytes which exceeds the URL's max of ${maxSize} bytes.`,
            { sizeBytes: state.fileSize, maxSize },
          );
        }
        if (state.fileSize === 0) {
          throw httpError(400, 'EMPTY_FILE', 'Uploaded file is empty.');
        }

        // Magic-byte validation + cross-check against the promised content type.
        const metadata = detectAndValidate(state.fileBuffer);
        assertContentTypeMatches(ct, metadata);

        await putObject(key, {
          body: state.fileBuffer,
          contentType: ct,
          contentLength: state.fileSize,
        });

        logger.info('Local upload accepted', {
          requestId: req.id,
          key,
          contentType: ct,
          sizeBytes: state.fileSize,
          kind: metadata.kind,
        });

        res.status(200).json({
          ok: true,
          key,
          sizeBytes: state.fileSize,
          mimeType: metadata.mimeType,
          kind: metadata.kind,
        });
        settled = true;
      } catch (err) {
        if (err instanceof AppError) {
          fail(err);
          return;
        }
        if (err instanceof StorageError) {
          fail(httpError(400, err.code, err.message, { key: err.key }));
          return;
        }
        if (err instanceof FileValidationError) {
          fail(httpError(400, err.code, err.message, err.details));
          return;
        }
        fail(err instanceof Error ? err : new Error(String(err)));
      }
    })();
  });

  req.on('aborted', () => {
    fail(httpError(499, 'CLIENT_ABORTED', 'Client aborted the upload'));
  });

  req.pipe(busboy);
};

router.post('/upload', handleUpload);

/* ─────────────────────────────────────────────────────────────────
 * GET /api/storage/download/:key
 *
 * Note on key format: presigned URLs encode the key including any `/`
 * separators. Express's `:key(*)` wildcard captures the whole tail.
 * ──────────────────────────────────────────────────────────────── */

const handleDownload: RequestHandler = async (req, res, next) => {
  try {
    const rawKey = req.params['0'];
    if (!rawKey) {
      throw httpError(400, 'INVALID_KEY', 'Missing key in URL');
    }
    const key = decodeURI(rawKey);
    if (!isValidKey(key)) {
      throw httpError(400, 'INVALID_KEY', 'Storage key is malformed', { key });
    }

    const tokenRaw = req.query['token'];
    const expRaw = req.query['exp'];
    if (typeof tokenRaw !== 'string' || typeof expRaw !== 'string') {
      throw httpError(400, 'MISSING_TOKEN', 'token and exp query parameters are required');
    }
    const exp = Number(expRaw);
    if (!Number.isFinite(exp)) {
      throw httpError(400, 'INVALID_EXP', 'exp must be a number');
    }

    verifyDownloadToken({ key, exp, token: tokenRaw });

    const root = localStorageRoot();
    const filePath = path.resolve(root, key);
    res.sendFile(filePath, (err) => {
      if (!err) return;
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        next(httpError(404, 'NOT_FOUND', 'File not found', { key }));
        return;
      }
      next(err);
    });
  } catch (err) {
    if (err instanceof StorageError) {
      const status = err.code === 'TOKEN_EXPIRED' ? 401 : err.code === 'INVALID_TOKEN' ? 403 : 400;
      next(httpError(status, err.code, err.message, { key: err.key }));
      return;
    }
    next(err);
  }
};

router.get('/download/*', handleDownload);

/* ─────────────────────────────────────────────────────────────────
 * GET /api/storage/raw/:key  (dev-only, unauthenticated)
 * ──────────────────────────────────────────────────────────────── */

const handleRaw: RequestHandler = (req, res, next) => {
  const rawKey = req.params['0'];
  if (!rawKey) {
    next(httpError(400, 'INVALID_KEY', 'Missing key in URL'));
    return;
  }
  const key = decodeURI(rawKey);
  if (!isValidKey(key)) {
    next(httpError(400, 'INVALID_KEY', 'Storage key is malformed', { key }));
    return;
  }
  const filePath = path.resolve(localStorageRoot(), key);
  res.sendFile(filePath, (err) => {
    if (!err) return;
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      next(httpError(404, 'NOT_FOUND', 'File not found', { key }));
      return;
    }
    next(err);
  });
};

router.get('/raw/*', handleRaw);

export { router as storageRouter };
