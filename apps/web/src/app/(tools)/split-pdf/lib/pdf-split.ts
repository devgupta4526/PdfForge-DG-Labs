/**
 * Pure, in-browser PDF splitting helpers powered by `pdf-lib`.
 *
 * All functions operate on raw bytes — no server roundtrip.
 * They return *named* outputs so the caller can stream them straight into
 * a zip or trigger individual downloads with stable, human-readable filenames.
 */

import { PDFDocument } from 'pdf-lib';

export interface SplitOutput {
  /** Suggested filename including the `.pdf` extension. */
  name: string;
  /** Raw PDF bytes for the output document. */
  bytes: Uint8Array;
}

export class PdfSplitError extends Error {
  public readonly code:
    | 'INVALID_RANGE_FORMAT'
    | 'EMPTY_RANGE'
    | 'OUT_OF_BOUNDS'
    | 'INVERTED_RANGE'
    | 'INVALID_N'
    | 'NO_PAGES_SELECTED'
    | 'EMPTY_DOCUMENT'
    | 'CORRUPT_DOCUMENT';
  public readonly details: Record<string, unknown> | undefined;

  constructor(
    code: PdfSplitError['code'],
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PdfSplitError';
    this.code = code;
    this.details = details;
  }
}

/* ─────────────────────────────────────────────────────────────────
 * Range parsing
 * ──────────────────────────────────────────────────────────────── */

/**
 * Parse a human-readable page-range expression like:
 *
 *     "1-3, 5, 8-10"   → [[1,2,3], [5], [8,9,10]]
 *     "12"             → [[12]]
 *     "  1 - 4 ,  9 "  → [[1,2,3,4], [9]]
 *
 * Validation rules:
 *  - whitespace is ignored
 *  - empty / blank input → EMPTY_RANGE
 *  - any non-digit/non-comma/non-dash token → INVALID_RANGE_FORMAT
 *  - range A-B with A > B → INVERTED_RANGE
 *  - any number ∉ [1, totalPages] → OUT_OF_BOUNDS
 *
 * Pages are deduplicated within a single range token but ranges
 * themselves are preserved in source order (so the caller can name
 * outputs based on the original intent).
 */
export function parsePageRanges(input: string, totalPages: number): number[][] {
  if (!Number.isFinite(totalPages) || totalPages <= 0) {
    throw new PdfSplitError('EMPTY_DOCUMENT', 'The document has no pages to split.', {
      totalPages,
    });
  }

  const cleaned = input.replace(/\s+/g, '');
  if (cleaned.length === 0) {
    throw new PdfSplitError(
      'EMPTY_RANGE',
      'Please enter at least one page or range, e.g. "1-3, 5, 8-10".',
    );
  }

  // Allowed grammar: digits, commas, single dashes between digits.
  if (!/^[0-9]+(?:-[0-9]+)?(?:,[0-9]+(?:-[0-9]+)?)*$/.test(cleaned)) {
    throw new PdfSplitError(
      'INVALID_RANGE_FORMAT',
      'Range must be a comma-separated list like "1-3, 5, 8-10".',
      { input },
    );
  }

  const ranges: number[][] = [];

  for (const token of cleaned.split(',')) {
    if (token.includes('-')) {
      const parts = token.split('-');
      const startStr = parts[0];
      const endStr = parts[1];
      if (parts.length !== 2 || !startStr || !endStr) {
        throw new PdfSplitError('INVALID_RANGE_FORMAT', `Invalid range token: "${token}".`);
      }
      const start = Number.parseInt(startStr, 10);
      const end = Number.parseInt(endStr, 10);
      if (start < 1 || end < 1) {
        throw new PdfSplitError(
          'OUT_OF_BOUNDS',
          `Pages must be ≥ 1 (got "${token}").`,
          { token },
        );
      }
      if (start > totalPages || end > totalPages) {
        throw new PdfSplitError(
          'OUT_OF_BOUNDS',
          `Range "${token}" exceeds document length (${totalPages} pages).`,
          { token, totalPages },
        );
      }
      if (start > end) {
        throw new PdfSplitError(
          'INVERTED_RANGE',
          `Range "${token}" is inverted (start > end).`,
          { token },
        );
      }
      const pages: number[] = [];
      for (let p = start; p <= end; p += 1) pages.push(p);
      ranges.push(pages);
    } else {
      const page = Number.parseInt(token, 10);
      if (page < 1) {
        throw new PdfSplitError('OUT_OF_BOUNDS', `Page must be ≥ 1 (got "${token}").`, {
          token,
        });
      }
      if (page > totalPages) {
        throw new PdfSplitError(
          'OUT_OF_BOUNDS',
          `Page ${page} exceeds document length (${totalPages} pages).`,
          { page, totalPages },
        );
      }
      ranges.push([page]);
    }
  }

  return ranges;
}

/* ─────────────────────────────────────────────────────────────────
 * Naming helpers
 * ──────────────────────────────────────────────────────────────── */

/**
 * `[1,2,3]` → "pages-1-3.pdf"
 * `[5]`     → "page-5.pdf"
 * Mixed/non-contiguous (e.g. `[1,3]`) → "pages-1,3.pdf"
 */
export function nameForPageGroup(pages: readonly number[]): string {
  if (pages.length === 0) return 'pages-empty.pdf';
  if (pages.length === 1) return `page-${pages[0]}.pdf`;
  if (isContiguous(pages)) return `pages-${pages[0]}-${pages[pages.length - 1]}.pdf`;
  return `pages-${pages.join(',')}.pdf`;
}

function isContiguous(pages: readonly number[]): boolean {
  for (let i = 1; i < pages.length; i += 1) {
    const prev = pages[i - 1];
    const cur = pages[i];
    if (prev === undefined || cur === undefined || cur !== prev + 1) return false;
  }
  return true;
}

/* ─────────────────────────────────────────────────────────────────
 * Document loading
 * ──────────────────────────────────────────────────────────────── */

async function loadSourceDoc(pdfBytes: Uint8Array): Promise<PDFDocument> {
  if (pdfBytes.byteLength === 0) {
    throw new PdfSplitError('EMPTY_DOCUMENT', 'The provided PDF is empty.');
  }
  try {
    // ignoreEncryption: surface a clear error rather than silently failing later.
    return await PDFDocument.load(pdfBytes, { ignoreEncryption: false });
  } catch (err) {
    throw new PdfSplitError(
      'CORRUPT_DOCUMENT',
      err instanceof Error
        ? `Could not parse the PDF: ${err.message}`
        : 'Could not parse the PDF.',
      { cause: err instanceof Error ? err.message : String(err) },
    );
  }
}

async function buildSubDocument(
  source: PDFDocument,
  pageNumbers: readonly number[],
): Promise<Uint8Array> {
  const total = source.getPageCount();
  for (const p of pageNumbers) {
    if (!Number.isInteger(p) || p < 1 || p > total) {
      throw new PdfSplitError('OUT_OF_BOUNDS', `Page ${p} is out of range (1..${total}).`, {
        page: p,
        totalPages: total,
      });
    }
  }

  const out = await PDFDocument.create();
  // pdf-lib uses 0-based indices.
  const indices = pageNumbers.map((p) => p - 1);
  const copied = await out.copyPages(source, indices);
  for (const page of copied) out.addPage(page);
  return out.save({ useObjectStreams: true, addDefaultPage: false });
}

/* ─────────────────────────────────────────────────────────────────
 * Public split helpers
 * ──────────────────────────────────────────────────────────────── */

/**
 * Split by explicit ranges. Each range becomes one output PDF.
 * Returns named outputs in source order.
 */
export async function splitByRanges(
  pdfBytes: Uint8Array,
  ranges: readonly (readonly number[])[],
): Promise<SplitOutput[]> {
  if (ranges.length === 0) {
    throw new PdfSplitError('NO_PAGES_SELECTED', 'Provide at least one page range.');
  }

  const source = await loadSourceDoc(pdfBytes);
  const results: SplitOutput[] = [];

  for (const range of ranges) {
    if (range.length === 0) {
      throw new PdfSplitError('NO_PAGES_SELECTED', 'A range cannot be empty.');
    }
    const bytes = await buildSubDocument(source, range);
    results.push({ name: nameForPageGroup(range), bytes });
  }

  return results;
}

/**
 * Split a PDF into chunks of N pages each. The last chunk holds the remainder.
 *
 *     totalPages=10, n=3 → [1-3, 4-6, 7-9, 10]
 *     totalPages=4,  n=4 → [1-4]
 *     totalPages=5,  n=10 → throws — caller should validate UI-side too.
 */
export async function splitEveryN(pdfBytes: Uint8Array, n: number): Promise<SplitOutput[]> {
  if (!Number.isInteger(n) || n < 1) {
    throw new PdfSplitError('INVALID_N', 'N must be a whole number ≥ 1.', { n });
  }

  const source = await loadSourceDoc(pdfBytes);
  const total = source.getPageCount();

  if (n > total) {
    throw new PdfSplitError(
      'INVALID_N',
      `N (${n}) cannot exceed the document length (${total} pages).`,
      { n, totalPages: total },
    );
  }

  const groups: number[][] = [];
  for (let start = 1; start <= total; start += n) {
    const end = Math.min(start + n - 1, total);
    const chunk: number[] = [];
    for (let p = start; p <= end; p += 1) chunk.push(p);
    groups.push(chunk);
  }

  const results: SplitOutput[] = [];
  for (const group of groups) {
    const bytes = await buildSubDocument(source, group);
    results.push({ name: nameForPageGroup(group), bytes });
  }
  return results;
}

/**
 * Extract a single set of pages into one PDF, preserving the order given.
 * Use this for "Select Pages" mode when the user wants one combined output.
 */
export async function extractPages(
  pdfBytes: Uint8Array,
  pageNums: readonly number[],
): Promise<SplitOutput> {
  if (pageNums.length === 0) {
    throw new PdfSplitError('NO_PAGES_SELECTED', 'Select at least one page.');
  }

  const source = await loadSourceDoc(pdfBytes);
  const sorted = [...pageNums].sort((a, b) => a - b);
  const bytes = await buildSubDocument(source, sorted);
  return { name: nameForPageGroup(sorted), bytes };
}

/**
 * Convenience: get just the page count of a PDF without keeping the
 * pdf-lib document in memory. Used by the UI to validate inputs before
 * the user presses "Split PDF".
 */
export async function getPageCount(pdfBytes: Uint8Array): Promise<number> {
  const doc = await loadSourceDoc(pdfBytes);
  return doc.getPageCount();
}
