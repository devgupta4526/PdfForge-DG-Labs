'use client';

import * as React from 'react';

import { loadPdfDocument, ThumbnailError, type PdfDocumentHandle } from '@/lib/pdf/thumbnails';

export interface PdfPageEntry {
  pageNum: number;
  /** `null` until the IntersectionObserver / parent triggers `requestThumbnail`. */
  thumbnail: string | null;
}

export interface UsePdfPagesResult {
  pageCount: number;
  pages: PdfPageEntry[];
  /** True while the document is being opened (or thumbnails first sized). */
  isLoading: boolean;
  /** Latest open / render error, or null. */
  error: string | null;
  /** Lazily render the thumbnail for a single page. Safe to call repeatedly. */
  requestThumbnail: (pageNum: number, signal?: AbortSignal) => Promise<void>;
  /** Replace the page list (e.g. after deletes / rotations) without reloading the doc. */
  setPages: React.Dispatch<React.SetStateAction<PdfPageEntry[]>>;
  /** Drop the current document + pages. Idempotent. */
  reset: () => Promise<void>;
}

export interface UsePdfPagesOptions {
  /** Source PDF bytes. When `null`, the hook is in the empty state. */
  bytes: Uint8Array | null;
  /** Override the JPEG quality used for thumbnails (default 0.78). */
  quality?: number;
  /** Override the max width in CSS pixels (default 240). */
  maxWidth?: number;
  /** Override the max height in CSS pixels (default 320). */
  maxHeight?: number;
}

/**
 * Owns a `PdfDocumentHandle` and the per-page thumbnail cache for a tool.
 *
 * Re-opens the document whenever `bytes` changes (handle is destroyed first).
 * `requestThumbnail` is the single place that talks to pdfjs — call it from
 * an IntersectionObserver in your grid for lazy rendering.
 */
export function usePdfPages(opts: UsePdfPagesOptions): UsePdfPagesResult {
  const { bytes, quality = 0.78, maxWidth = 240, maxHeight = 320 } = opts;

  const [pageCount, setPageCount] = React.useState(0);
  const [pages, setPages] = React.useState<PdfPageEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleRef = React.useRef<PdfDocumentHandle | null>(null);

  const reset = React.useCallback(async () => {
    const handle = handleRef.current;
    handleRef.current = null;
    if (handle) {
      try {
        await handle.destroy();
      } catch {
        // best-effort; the handle may already be torn down
      }
    }
    setPageCount(0);
    setPages([]);
    setIsLoading(false);
    setError(null);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    if (!bytes) {
      void reset();
      return () => {
        cancelled = true;
      };
    }

    setIsLoading(true);
    setError(null);

    void (async () => {
      const previous = handleRef.current;
      handleRef.current = null;
      if (previous) {
        try {
          await previous.destroy();
        } catch {
          /* ignore */
        }
      }

      try {
        const handle = await loadPdfDocument(bytes);
        if (cancelled) {
          await handle.destroy();
          return;
        }
        handleRef.current = handle;
        setPageCount(handle.pageCount);
        setPages(
          Array.from({ length: handle.pageCount }, (_, i) => ({
            pageNum: i + 1,
            thumbnail: null,
          })),
        );
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ThumbnailError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Could not open the PDF.';
        setError(message);
        setPageCount(0);
        setPages([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bytes, reset]);

  // Tear the document down on unmount. We do this in a separate effect so the
  // bytes-change effect above can race with it cleanly.
  React.useEffect(() => {
    return () => {
      void handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, []);

  const requestThumbnail = React.useCallback(
    async (pageNum: number, signal?: AbortSignal): Promise<void> => {
      const handle = handleRef.current;
      if (!handle) return;
      try {
        const dataUrl = await handle.renderThumbnail(pageNum, {
          maxWidth,
          maxHeight,
          format: 'image/jpeg',
          quality,
          ...(signal ? { signal } : {}),
        });
        if (signal?.aborted) return;
        setPages((prev) => {
          const idx = pageNum - 1;
          if (idx < 0 || idx >= prev.length) return prev;
          const existing = prev[idx];
          if (!existing || existing.thumbnail === dataUrl) return prev;
          const next = prev.slice();
          next[idx] = { ...existing, thumbnail: dataUrl };
          return next;
        });
      } catch (err) {
        if (err instanceof ThumbnailError && err.code === 'ABORTED') return;
        // Non-fatal — the cell stays in skeleton state and may retry later.
        console.warn(`[usePdfPages] thumbnail render failed for page ${pageNum}`, err);
      }
    },
    [maxHeight, maxWidth, quality],
  );

  return {
    pageCount,
    pages,
    isLoading,
    error,
    requestThumbnail,
    setPages,
    reset,
  };
}
