/**
 * Pure, in-browser PDF rotation helpers powered by `pdf-lib`.
 *
 * Rotation values follow the PDF spec: degrees must be a multiple of 90 and
 * are normalised to the [0, 360) range. When applied to a page, we ADD the
 * delta to the page's existing `/Rotate` value so users can compose rotations
 * over multiple sessions without losing the document's original orientation.
 */

import { PDFDocument, degrees } from 'pdf-lib';

export type RotationDelta = 0 | 90 | 180 | 270;
export type RotationDirection = 'cw' | 'ccw';

export interface PageRotationInfo {
  /** 1-based page number. */
  pageNum: number;
  /** Rotation already encoded in the source PDF (0/90/180/270). */
  baseRotation: RotationDelta;
}

export interface RotatePagesInput {
  /** Source PDF bytes. */
  pdfBytes: Uint8Array;
  /**
   * Map of (1-based) pageNum → user-applied rotation delta in degrees.
   * Anything not in the map is treated as 0 (no change).
   */
  deltas: ReadonlyMap<number, number>;
}

export class PdfRotateError extends Error {
  public readonly code:
    | 'EMPTY_PDF'
    | 'CORRUPT_PDF'
    | 'INVALID_ANGLE'
    | 'OUT_OF_BOUNDS'
    | 'NO_CHANGES';
  public readonly details: Record<string, unknown> | undefined;

  constructor(
    code: PdfRotateError['code'],
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PdfRotateError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Normalise any integer multiple of 90 to {0, 90, 180, 270}. Accepts negative
 * values (so `-90` → `270`) and large positives (`450` → `90`).
 */
export function normaliseRotation(angle: number): RotationDelta {
  if (!Number.isFinite(angle) || angle % 90 !== 0) {
    throw new PdfRotateError('INVALID_ANGLE', `Angle must be a multiple of 90 (got ${angle}).`);
  }
  const mod = ((angle % 360) + 360) % 360;
  return mod as RotationDelta;
}

/** Compose two rotations (a + b) and normalise to [0, 360). */
export function combineRotations(a: number, b: number): RotationDelta {
  return normaliseRotation(a + b);
}

/**
 * Open a PDF and capture its per-page baseline rotations. Used by the UI so
 * the preview can show the correct visual rotation before applying changes.
 */
export async function readPageRotations(pdfBytes: Uint8Array): Promise<PageRotationInfo[]> {
  if (pdfBytes.byteLength === 0) {
    throw new PdfRotateError('EMPTY_PDF', 'PDF is empty.');
  }
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: false });
  } catch (err) {
    throw new PdfRotateError(
      'CORRUPT_PDF',
      err instanceof Error ? `Could not parse PDF: ${err.message}` : 'Could not parse PDF.',
    );
  }
  const pages = doc.getPages();
  return pages.map((page, idx) => ({
    pageNum: idx + 1,
    baseRotation: normaliseRotation(page.getRotation().angle),
  }));
}

/**
 * Apply per-page rotation deltas and save a new PDF.
 *
 * `deltas[pageNum]` is the *additional* rotation the user wants to apply on
 * top of whatever the page already has. Pages absent from `deltas` (or with a
 * normalised delta of 0) are left untouched.
 */
export async function rotatePdfPages(input: RotatePagesInput): Promise<Uint8Array> {
  const { pdfBytes, deltas } = input;
  if (pdfBytes.byteLength === 0) {
    throw new PdfRotateError('EMPTY_PDF', 'PDF is empty.');
  }

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: false });
  } catch (err) {
    throw new PdfRotateError(
      'CORRUPT_PDF',
      err instanceof Error ? `Could not parse PDF: ${err.message}` : 'Could not parse PDF.',
    );
  }

  const pages = doc.getPages();
  const total = pages.length;

  let appliedAny = false;
  for (const [pageNum, rawDelta] of deltas) {
    if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > total) {
      throw new PdfRotateError(
        'OUT_OF_BOUNDS',
        `Page ${pageNum} is out of range (1..${total}).`,
        { pageNum, total },
      );
    }
    const delta = normaliseRotation(rawDelta);
    if (delta === 0) continue;

    const page = pages[pageNum - 1];
    if (!page) continue;
    const base = normaliseRotation(page.getRotation().angle);
    const next = combineRotations(base, delta);
    page.setRotation(degrees(next));
    appliedAny = true;
  }

  if (!appliedAny) {
    throw new PdfRotateError(
      'NO_CHANGES',
      'No pages were rotated. Pick at least one rotation before saving.',
    );
  }

  return doc.save({ useObjectStreams: true, addDefaultPage: false });
}

/**
 * Apply the same rotation to every page in one shot. Convenience for the
 * "Rotate all 90° CW / CCW / 180°" menu items.
 */
export function buildBulkDeltas(
  totalPages: number,
  direction: RotationDirection | 'flip',
): Map<number, number> {
  const delta = direction === 'cw' ? 90 : direction === 'ccw' ? 270 : 180;
  const map = new Map<number, number>();
  for (let p = 1; p <= totalPages; p += 1) map.set(p, delta);
  return map;
}
