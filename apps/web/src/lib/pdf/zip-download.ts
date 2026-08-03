/**
 * Browser-only helpers that bundle a list of files into a zip and
 * trigger a download. Pure client side, no server roundtrip.
 *
 * Compression is fixed at level 6 (DEFLATE), which strikes a good
 * balance between speed and size for already-compressed PDFs.
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface ZipFile {
  /** Filename including extension. */
  name: string;
  /** File contents. */
  bytes: Uint8Array;
}

export interface DownloadProgress {
  /** 0..100 */
  percent: number;
  /** Bytes processed by the zip writer so far. */
  currentBytes: number;
  /** Total bytes that will be processed (may be 0 until known). */
  totalBytes: number;
}

export class DownloadError extends Error {
  public readonly code: 'NO_FILES' | 'UNSUPPORTED_BROWSER' | 'ZIP_FAILED';

  constructor(code: DownloadError['code'], message: string) {
    super(message);
    this.name = 'DownloadError';
    this.code = code;
  }
}

/**
 * Bundle `files` into a `.zip` and trigger a browser download.
 *
 * Filename collisions are deduplicated automatically (e.g. `pages-1-3.pdf`,
 * `pages-1-3 (2).pdf`), because some split modes can theoretically yield
 * the same range twice when users craft pathological inputs.
 */
export async function createAndDownloadZip(
  files: readonly ZipFile[],
  zipName: string,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new DownloadError(
      'UNSUPPORTED_BROWSER',
      'createAndDownloadZip can only run in the browser.',
    );
  }
  if (files.length === 0) {
    throw new DownloadError('NO_FILES', 'No files to bundle.');
  }

  const zip = new JSZip();
  const seen = new Map<string, number>();

  for (const file of files) {
    const safe = sanitizeFilename(file.name);
    const dedupedName = nextUniqueName(safe, seen);
    zip.file(dedupedName, file.bytes, {
      binary: true,
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
  }

  let blob: Blob;
  try {
    blob = await zip.generateAsync(
      {
        type: 'blob',
        mimeType: 'application/zip',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
        streamFiles: true,
      },
      (meta) => {
        if (!onProgress) return;
        const percent = Math.max(0, Math.min(100, Math.round(meta.percent)));
        onProgress({
          percent,
          currentBytes: meta.currentFile ? safeNumber(percent) : 0,
          totalBytes: 0,
        });
      },
    );
  } catch (err) {
    throw new DownloadError(
      'ZIP_FAILED',
      err instanceof Error ? `Could not build the zip: ${err.message}` : 'Could not build the zip.',
    );
  }

  saveAs(blob, sanitizeFilename(zipName.endsWith('.zip') ? zipName : `${zipName}.zip`));
}

/**
 * Trigger the browser to download a single PDF without zipping it.
 * Used when only one output file is produced (more user-friendly than a zip-of-one).
 */
export function downloadSinglePdf(name: string, bytes: Uint8Array): void {
  if (typeof window === 'undefined') {
    throw new DownloadError(
      'UNSUPPORTED_BROWSER',
      'downloadSinglePdf can only run in the browser.',
    );
  }
  const safeName = sanitizeFilename(name.endsWith('.pdf') ? name : `${name}.pdf`);
  // Copy into a fresh ArrayBuffer so the resulting Blob is type-safe even when
  // `bytes` is backed by a SharedArrayBuffer or a sliced view.
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], { type: 'application/pdf' });
  saveAs(blob, safeName);
}

/* ─────────────────────────────────────────────────────────────────
 * Internal helpers
 * ──────────────────────────────────────────────────────────────── */

function safeNumber(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

/**
 * Strip path separators and characters that Windows / macOS reject in filenames.
 * We keep it conservative — there's no security boundary here, just UX.
 */
function sanitizeFilename(name: string): string {
  const trimmed = name.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_');
  return trimmed.length > 0 ? trimmed.slice(0, 200) : 'file.pdf';
}

function nextUniqueName(name: string, seen: Map<string, number>): string {
  const count = seen.get(name) ?? 0;
  seen.set(name, count + 1);
  if (count === 0) return name;

  const dot = name.lastIndexOf('.');
  if (dot <= 0) return `${name} (${count + 1})`;
  const stem = name.slice(0, dot);
  const ext = name.slice(dot);
  return `${stem} (${count + 1})${ext}`;
}
