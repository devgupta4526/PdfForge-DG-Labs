/**
 * Server-side PDF compressor.
 *
 * Strategy:
 *  - Walk every indirect object in the PDF and find image XObjects
 *    (`/Type /XObject /Subtype /Image`).
 *  - For supported filters (DCTDecode → JPEG; FlateDecode of plain RGB/Gray
 *    raster → re-encoded as JPEG), decode → resize via sharp → re-encode
 *    at the level's target quality. The new stream replaces the original
 *    via `PDFContext.assign(ref, newStream)`.
 *  - Level-specific tail steps:
 *      medium / high → strip XMP + standard info dictionary metadata
 *      high          → flatten interactive form fields
 *
 * Filters we deliberately *skip* (image is left untouched):
 *  - JPX / JBIG2 / CCITTFax — would need a JPEG2000 / fax decoder
 *  - Indexed / DeviceN / ICC-tagged image data with non-RGB colour spaces —
 *    decoding those losslessly back into a sharp-friendly pixel buffer is
 *    fiddly and not worth it for the marginal gain.
 *
 * If a per-image re-encode produces a *larger* stream than the original we
 * keep the original — compression should never inflate the file.
 */

import {
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFArray,
  type PDFObject,
  type PDFRef,
} from 'pdf-lib';
import sharp from 'sharp';

import { logger } from '../logger.js';

export type CompressionLevel = 'low' | 'medium' | 'high';

export interface CompressLevelSettings {
  /** sharp JPEG `quality` (0-100). */
  quality: number;
  /**
   * Approximate "downsample-to-DPI" target. We can't trivially compute the
   * true display DPI of every image (placement matrix walking), so we cap
   * the maximum pixel dimension instead — values were picked to roughly map
   * to the requested DPI on Letter / A4 pages.
   */
  maxImageDimensionPx: number;
  /** Strip XMP metadata + the standard PDF info dictionary entries. */
  stripMetadata: boolean;
  /** Flatten AcroForm fields into static page content. */
  flattenForms: boolean;
}

export const COMPRESSION_LEVELS: Record<CompressionLevel, CompressLevelSettings> = {
  low: {
    quality: 85,
    maxImageDimensionPx: 1500, // ~150 DPI on Letter
    stripMetadata: false,
    flattenForms: false,
  },
  medium: {
    quality: 65,
    maxImageDimensionPx: 1100, // ~96 DPI on Letter
    stripMetadata: true,
    flattenForms: false,
  },
  high: {
    quality: 45,
    maxImageDimensionPx: 800, // ~72 DPI on Letter
    stripMetadata: true,
    flattenForms: true,
  },
};

export class PdfCompressionError extends Error {
  public readonly code:
    | 'EMPTY_PDF'
    | 'CORRUPT_PDF'
    | 'ENCRYPTED_PDF'
    | 'COMPRESSION_FAILED';
  public readonly details: Record<string, unknown> | undefined;

  constructor(
    code: PdfCompressionError['code'],
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PdfCompressionError';
    this.code = code;
    this.details = details;
  }
}

export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  reductionPercent: number;
  imagesScanned: number;
  imagesRecompressed: number;
  imagesSkipped: number;
  level: CompressionLevel;
  metadataStripped: boolean;
  formsFlattened: boolean;
  elapsedMs: number;
}

export interface CompressionResult {
  bytes: Uint8Array;
  stats: CompressionStats;
}

/**
 * Compress a PDF in-memory and return the new bytes + stats.
 * Always returns the smaller of (original, recompressed) bytes.
 */
export async function compressPdf(
  pdfBytes: Uint8Array,
  level: CompressionLevel,
): Promise<CompressionResult> {
  if (pdfBytes.byteLength === 0) {
    throw new PdfCompressionError('EMPTY_PDF', 'PDF is empty.');
  }

  const settings = COMPRESSION_LEVELS[level];
  const startedAt = Date.now();

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: false,
      updateMetadata: false,
      throwOnInvalidObject: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown parse error.';
    if (/encrypted/i.test(message)) {
      throw new PdfCompressionError(
        'ENCRYPTED_PDF',
        'Password-protected PDFs cannot be compressed.',
        { cause: message },
      );
    }
    throw new PdfCompressionError('CORRUPT_PDF', `Could not parse PDF: ${message}`, {
      cause: message,
    });
  }

  let imagesScanned = 0;
  let imagesRecompressed = 0;
  let imagesSkipped = 0;

  const indirects = doc.context.enumerateIndirectObjects();
  for (const [ref, obj] of indirects) {
    if (!(obj instanceof PDFRawStream)) continue;

    const dict = obj.dict;
    const subtype = dict.lookup(PDFName.of('Subtype'));
    if (!subtype || subtype.toString() !== '/Image') continue;
    imagesScanned += 1;

    try {
      const replacement = await maybeRecompressImage(obj, settings);
      if (!replacement) {
        imagesSkipped += 1;
        continue;
      }
      doc.context.assign(ref as PDFRef, replacement);
      imagesRecompressed += 1;
    } catch (err) {
      // Don't fail the whole compression if a single image is too funky to
      // re-encode — just leave it untouched and log.
      imagesSkipped += 1;
      logger.warn('Compress: skipped image (recompression failed)', {
        ref: ref.toString(),
        level,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  let metadataStripped = false;
  if (settings.stripMetadata) {
    metadataStripped = stripPdfMetadata(doc);
  }

  let formsFlattened = false;
  if (settings.flattenForms) {
    formsFlattened = tryFlattenForms(doc);
  }

  let saved: Uint8Array;
  try {
    saved = await doc.save({ useObjectStreams: true, addDefaultPage: false });
  } catch (err) {
    throw new PdfCompressionError(
      'COMPRESSION_FAILED',
      `Could not write compressed PDF: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Safety net: never inflate. If our pipeline somehow produced a larger
  // file, return the original bytes (callers still get the stats).
  const finalBytes = saved.byteLength < pdfBytes.byteLength ? saved : pdfBytes;
  const elapsed = Date.now() - startedAt;
  const reductionPercent =
    pdfBytes.byteLength === 0
      ? 0
      : Math.max(0, ((pdfBytes.byteLength - finalBytes.byteLength) / pdfBytes.byteLength) * 100);

  return {
    bytes: finalBytes,
    stats: {
      originalSize: pdfBytes.byteLength,
      compressedSize: finalBytes.byteLength,
      reductionPercent: Number(reductionPercent.toFixed(2)),
      imagesScanned,
      imagesRecompressed,
      imagesSkipped,
      level,
      metadataStripped,
      formsFlattened,
      elapsedMs: elapsed,
    },
  };
}

/* ─────────────────────────────────────────────────────────────────
 * Image recompression helpers
 * ──────────────────────────────────────────────────────────────── */

interface ImageDimensions {
  width: number;
  height: number;
  bitsPerComponent: number;
  channels: 1 | 3 | 4;
}

async function maybeRecompressImage(
  stream: PDFRawStream,
  settings: CompressLevelSettings,
): Promise<PDFRawStream | null> {
  const dict = stream.dict;
  const filter = dict.lookup(PDFName.of('Filter'));
  if (!filter) return null;
  const filters = collectFilterNames(filter);
  if (filters.length === 0) return null;

  const dims = readImageDimensions(stream);
  if (!dims) return null;

  const original = stream.contents; // Uint8Array

  // ── JPEG (DCTDecode) ─────────────────────────────────────────
  if (filters[0] === 'DCTDecode') {
    const buf = await recompressJpeg(Buffer.from(original), settings);
    if (!buf) return null;
    return buildJpegImageStream(stream, buf);
  }

  // ── Plain raster (FlateDecode + DeviceRGB/DeviceGray) ───────
  if (filters[0] === 'FlateDecode' && dims.channels !== 4) {
    const buf = await recompressRawRaster(Buffer.from(original), dims, settings);
    if (!buf) return null;
    return buildJpegImageStream(stream, buf);
  }

  return null;
}

function collectFilterNames(filter: PDFObject | undefined): string[] {
  if (filter instanceof PDFArray) {
    const names: string[] = [];
    filter.asArray().forEach((entry) => {
      const stripped = entry.toString().replace(/^\//, '');
      if (stripped) names.push(stripped);
    });
    return names;
  }
  const stripped = filter?.toString().replace(/^\//, '') ?? '';
  return stripped ? [stripped] : [];
}

function readImageDimensions(stream: PDFRawStream): ImageDimensions | null {
  const dict = stream.dict;
  const widthObj = dict.lookup(PDFName.of('Width'));
  const heightObj = dict.lookup(PDFName.of('Height'));
  const bpcObj = dict.lookup(PDFName.of('BitsPerComponent'));
  const colorSpaceObj = dict.lookup(PDFName.of('ColorSpace'));
  if (!widthObj || !heightObj) return null;

  const width = toInt(widthObj);
  const height = toInt(heightObj);
  const bitsPerComponent = bpcObj ? toInt(bpcObj) : 8;
  if (!width || !height || !bitsPerComponent) return null;

  const channels = inferChannels(colorSpaceObj);
  if (!channels) return null;

  return { width, height, bitsPerComponent, channels };
}

function toInt(obj: { toString(): string } | undefined): number {
  if (!obj) return 0;
  const n = Number.parseInt(obj.toString(), 10);
  return Number.isFinite(n) ? n : 0;
}

function inferChannels(
  colorSpaceObj: PDFObject | undefined,
): ImageDimensions['channels'] | null {
  if (!colorSpaceObj) return 3;
  const cs = colorSpaceObj.toString();
  if (cs.includes('DeviceGray') || cs.includes('CalGray')) return 1;
  if (cs.includes('DeviceRGB') || cs.includes('CalRGB') || cs.includes('sRGB')) return 3;
  if (cs.includes('DeviceCMYK') || cs.includes('Separation')) return 4;
  // Indexed / ICCBased / Pattern → too risky to decode generically. Skip.
  return null;
}

async function recompressJpeg(
  bytes: Buffer,
  settings: CompressLevelSettings,
): Promise<Buffer | null> {
  let pipeline = sharp(bytes, { failOn: 'error' });
  const meta = await pipeline.metadata();
  const max = settings.maxImageDimensionPx;
  if ((meta.width ?? 0) > max || (meta.height ?? 0) > max) {
    pipeline = pipeline.resize({
      width: max,
      height: max,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }
  const out = await pipeline
    .jpeg({ quality: settings.quality, mozjpeg: true, chromaSubsampling: '4:2:0' })
    .toBuffer();
  return out.length < bytes.length ? out : null;
}

async function recompressRawRaster(
  pixelBytes: Buffer,
  dims: ImageDimensions,
  settings: CompressLevelSettings,
): Promise<Buffer | null> {
  if (dims.bitsPerComponent !== 8) return null; // sharp `raw` requires 8-bit
  const expectedLength = dims.width * dims.height * dims.channels;
  // Some PDFs pad rows to byte boundaries — refuse if the size is wrong.
  if (pixelBytes.length !== expectedLength) return null;

  const pipeline = sharp(pixelBytes, {
    raw: { width: dims.width, height: dims.height, channels: dims.channels },
  });
  const max = settings.maxImageDimensionPx;
  const resized =
    dims.width > max || dims.height > max
      ? pipeline.resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
      : pipeline;
  const out = await resized
    .jpeg({ quality: settings.quality, mozjpeg: true, chromaSubsampling: '4:2:0' })
    .toBuffer();
  // Plain raster bitmaps almost always shrink dramatically when JPEG'd, but
  // keep the safety check anyway for tiny images.
  return out.length < pixelBytes.length ? out : null;
}

function buildJpegImageStream(originalStream: PDFRawStream, jpegBytes: Buffer): PDFRawStream {
  const dict = originalStream.dict;
  const ctx = dict.context;

  // Re-derive width/height from the new JPEG via the SOF marker so the
  // dictionary is internally consistent after a resize.
  const dims = readJpegDimensions(jpegBytes);
  const width = dims?.width ?? toInt(dict.lookup(PDFName.of('Width')));
  const height = dims?.height ?? toInt(dict.lookup(PDFName.of('Height')));

  const newDict = ctx.obj({
    Type: 'XObject',
    Subtype: 'Image',
    Width: width,
    Height: height,
    BitsPerComponent: 8,
    ColorSpace: 'DeviceRGB',
    Filter: 'DCTDecode',
    Length: jpegBytes.length,
  });

  return PDFRawStream.of(newDict, new Uint8Array(jpegBytes));
}

/**
 * Parse just enough of a JFIF/JPEG to recover its width × height.
 * Returns null if the bytes don't look like a JPEG.
 */
function readJpegDimensions(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === undefined) return null;
    // Stand-alone markers without payload.
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15 hold the dimensions.
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (offset + 7 >= bytes.length) return null;
    const segLen = bytes.readUInt16BE(offset);
    if (isSof) {
      const height = bytes.readUInt16BE(offset + 3);
      const width = bytes.readUInt16BE(offset + 5);
      return { width, height };
    }
    offset += segLen;
  }
  return null;
}

/* ─────────────────────────────────────────────────────────────────
 * Metadata & form helpers
 * ──────────────────────────────────────────────────────────────── */

function stripPdfMetadata(doc: PDFDocument): boolean {
  try {
    doc.setTitle('');
    doc.setAuthor('');
    doc.setSubject('');
    doc.setKeywords([]);
    doc.setProducer('');
    doc.setCreator('');
    // Drop the catalog's XMP /Metadata stream as well (where /Producer etc.
    // are duplicated in PDF/A-style XMP packets).
    try {
      const catalog = doc.catalog;
      catalog.delete(PDFName.of('Metadata'));
    } catch {
      /* harmless if /Metadata isn't present */
    }
    return true;
  } catch {
    return false;
  }
}

function tryFlattenForms(doc: PDFDocument): boolean {
  try {
    const form = doc.getForm();
    // pdf-lib only flattens fields it understands; it's idempotent + safe.
    form.flatten();
    return true;
  } catch {
    // No form, or pdf-lib couldn't flatten — non-fatal.
    return false;
  }
}
