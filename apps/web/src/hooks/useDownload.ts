'use client';

import * as React from 'react';
import { saveAs } from 'file-saver';

export interface UseDownloadResult {
  /** Save raw bytes (PDF / binary) under the given filename. */
  downloadBytes: (
    bytes: Uint8Array,
    filename: string,
    mimeType?: string,
  ) => void;
  /** Save an existing Blob / File. */
  downloadBlob: (blob: Blob, filename: string) => void;
  /**
   * Download a file already hosted at `url`. The browser handles streaming —
   * no buffer is materialised in JS memory. Useful for server-generated
   * presigned URLs (e.g. compressed PDF returned by /api/pdf/compress).
   *
   * Falls back to opening in a new tab if the anchor download attribute is
   * unsupported (older Safari / cross-origin without CORS headers).
   */
  downloadFromUrl: (url: string, filename: string) => void;
  /** Becomes true while a `downloadFromUrl` request is in flight (via fetch fallback). */
  isDownloading: boolean;
  /** Latest error from a download, or null. */
  error: string | null;
}

/**
 * Trigger browser downloads from blobs, byte arrays, or URLs.
 *
 * Sanitizes filenames defensively so we never pass directory separators or
 * control characters to `saveAs`.
 */
export function useDownload(): UseDownloadResult {
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const downloadBlob = React.useCallback((blob: Blob, filename: string): void => {
    setError(null);
    try {
      saveAs(blob, sanitizeFilename(filename));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.');
    }
  }, []);

  const downloadBytes = React.useCallback(
    (bytes: Uint8Array, filename: string, mimeType = 'application/octet-stream'): void => {
      // Copy into a fresh ArrayBuffer so the Blob owns its own memory; this
      // protects against `bytes` being a view over a shared / sliced buffer.
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      downloadBlob(new Blob([buffer], { type: mimeType }), filename);
    },
    [downloadBlob],
  );

  const downloadFromUrl = React.useCallback(
    (url: string, filename: string): void => {
      setError(null);
      const safeName = sanitizeFilename(filename);

      // Modern browsers: the anchor `download` attribute does the right thing
      // for same-origin URLs and for cross-origin URLs that send a
      // Content-Disposition header. We try this first because it streams.
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = safeName;
        a.rel = 'noopener noreferrer';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      } catch {
        // fall through to fetch
      }

      // Fallback: fetch into a Blob and saveAs (works for cross-origin without
      // Content-Disposition, at the cost of buffering the whole file).
      setIsDownloading(true);
      fetch(url, { credentials: 'omit' })
        .then(async (res) => {
          if (!res.ok) throw new Error(`Server responded with ${res.status}`);
          const blob = await res.blob();
          saveAs(blob, safeName);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Download failed.');
        })
        .finally(() => setIsDownloading(false));
    },
    [],
  );

  return { downloadBytes, downloadBlob, downloadFromUrl, isDownloading, error };
}

function sanitizeFilename(name: string): string {
  const trimmed = name.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_');
  return trimmed.length > 0 ? trimmed.slice(0, 200) : 'download';
}
