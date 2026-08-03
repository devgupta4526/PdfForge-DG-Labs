/**
 * Pure, in-browser PDF page-deletion helpers powered by `pdf-lib`.
 *
 * Strategy: copy every page that is NOT in the "delete" set into a fresh
 * document. This is safer than calling `removePage` repeatedly because:
 *   - it preserves the original document's structure / metadata cleanly,
 *   - it's O(n) over kept pages instead of O(n²) over removed pages,
 *   - it side-steps pdf-lib edge cases when deleting the last page.
 */

import { PDFDocument } from 'pdf-lib';

export interface DeletePagesInput {
  pdfBytes: Uint8Array;
  /** 1-based page numbers to remove. Duplicates are ignored. */
  pagesToDelete: ReadonlyArray<number>;
}

export interface DeletePagesResult {
  bytes: Uint8Array;
  /** Page numbers (1-based, in source order) that were KEPT. */
  keptPages: number[];
  /** Page numbers (1-based) that were removed. */
  removedPages: number[];
}

export class PdfDeleteError extends Error {
  public readonly code:
    | 'EMPTY_PDF'
    | 'CORRUPT_PDF'
    | 'NO_SELECTION'
    | 'OUT_OF_BOUNDS'
    | 'WOULD_DELETE_ALL'
    | 'NO_CHANGES';
  public readonly details: Record<string, unknown> | undefined;

  constructor(
    code: PdfDeleteError['code'],
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PdfDeleteError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Validate the requested deletion against the document. Returns the unique,
 * sorted list of pages that would actually be removed. Throws on invalid input.
 */
export function planDeletion(
  totalPages: number,
  pagesToDelete: ReadonlyArray<number>,
): { remove: number[]; keep: number[] } {
  if (!Number.isInteger(totalPages) || totalPages < 1) {
    throw new PdfDeleteError('EMPTY_PDF', 'Document has no pages.');
  }
  const cleaned = new Set<number>();
  for (const raw of pagesToDelete) {
    if (!Number.isInteger(raw) || raw < 1 || raw > totalPages) {
      throw new PdfDeleteError(
        'OUT_OF_BOUNDS',
        `Page ${raw} is outside the document (1..${totalPages}).`,
        { page: raw, totalPages },
      );
    }
    cleaned.add(raw);
  }
  if (cleaned.size === 0) {
    throw new PdfDeleteError(
      'NO_SELECTION',
      'Select at least one page to delete.',
    );
  }
  if (cleaned.size === totalPages) {
    throw new PdfDeleteError(
      'WOULD_DELETE_ALL',
      'You can\u2019t delete every page \u2014 the resulting PDF would be empty.',
    );
  }

  const remove: number[] = [];
  const keep: number[] = [];
  for (let p = 1; p <= totalPages; p += 1) {
    if (cleaned.has(p)) remove.push(p);
    else keep.push(p);
  }
  return { remove, keep };
}

/**
 * Remove the specified pages from the PDF and return new bytes.
 * The result preserves the order of the kept pages.
 */
export async function deletePdfPages(input: DeletePagesInput): Promise<DeletePagesResult> {
  const { pdfBytes, pagesToDelete } = input;
  if (pdfBytes.byteLength === 0) {
    throw new PdfDeleteError('EMPTY_PDF', 'PDF is empty.');
  }

  let source: PDFDocument;
  try {
    source = await PDFDocument.load(pdfBytes, { ignoreEncryption: false });
  } catch (err) {
    throw new PdfDeleteError(
      'CORRUPT_PDF',
      err instanceof Error ? `Could not parse PDF: ${err.message}` : 'Could not parse PDF.',
    );
  }

  const total = source.getPageCount();
  const plan = planDeletion(total, pagesToDelete);

  if (plan.remove.length === 0) {
    throw new PdfDeleteError('NO_CHANGES', 'No pages to remove.');
  }

  const out = await PDFDocument.create();
  const indices = plan.keep.map((p) => p - 1);
  const copied = await out.copyPages(source, indices);
  for (const page of copied) out.addPage(page);

  const bytes = await out.save({ useObjectStreams: true, addDefaultPage: false });
  return { bytes, keptPages: plan.keep, removedPages: plan.remove };
}
