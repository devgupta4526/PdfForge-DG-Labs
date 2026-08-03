/**
 * Browser-only thumbnail renderer powered by pdfjs-dist.
 *
 * Why a thin wrapper?
 *  - pdfjs-dist v4 ships ESM; we must point its worker at a static URL we
 *    serve from `/public/pdfjs/pdf.worker.min.mjs` (see `next.config.mjs`).
 *  - The library detaches the input ArrayBuffer when given a `Uint8Array`,
 *    so callers must hand us bytes they don't intend to reuse — we clone
 *    defensively to avoid surprising side effects.
 *  - Rendering canvases outside React keeps the heavy work off the
 *    component tree's commit phase.
 */

import type {
  PDFDocumentProxy,
  PDFPageProxy,
  PageViewport,
  RenderTask,
} from 'pdfjs-dist';

let workerConfigured = false;
async function ensurePdfJs(): Promise<typeof import('pdfjs-dist')> {
  if (typeof window === 'undefined') {
    throw new ThumbnailError(
      'NOT_BROWSER',
      'PDF thumbnail rendering can only run in the browser.',
    );
  }
  // Dynamically import so server bundles never include pdfjs.
  const pdfjs = await import('pdfjs-dist');
  if (!workerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
    workerConfigured = true;
  }
  return pdfjs;
}

export interface ThumbnailRenderOptions {
  /** Target maximum width of the rendered thumbnail in CSS pixels. */
  maxWidth?: number;
  /** Target maximum height of the rendered thumbnail in CSS pixels. */
  maxHeight?: number;
  /** Output image format. */
  format?: 'image/png' | 'image/jpeg' | 'image/webp';
  /** Quality 0..1, used only for jpeg/webp. */
  quality?: number;
  /** Abort the in-flight render (fired by IntersectionObserver / unmount). */
  signal?: AbortSignal;
}

export interface PdfDocumentHandle {
  readonly pageCount: number;
  /**
   * Render a single page to a `data:` URL. Always call inside a try/finally —
   * the underlying canvas + ImageBitmap handles are released eagerly.
   */
  renderThumbnail(pageNum: number, opts?: ThumbnailRenderOptions): Promise<string>;
  /** Release pdf.js resources. Idempotent. */
  destroy(): Promise<void>;
}

export class ThumbnailError extends Error {
  public readonly code:
    | 'NOT_BROWSER'
    | 'CORRUPT_DOCUMENT'
    | 'OUT_OF_BOUNDS'
    | 'CANVAS_UNAVAILABLE'
    | 'ABORTED'
    | 'RENDER_FAILED';
  public readonly details: Record<string, unknown> | undefined;

  constructor(
    code: ThumbnailError['code'],
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ThumbnailError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Open a PDF document for thumbnail rendering.
 *
 * The returned handle holds an open pdfjs `PDFDocumentProxy`; **call
 * `destroy()` when you're done** (e.g. on unmount or when loading a new file)
 * so worker resources are released promptly.
 */
export async function loadPdfDocument(bytes: Uint8Array): Promise<PdfDocumentHandle> {
  const pdfjs = await ensurePdfJs();

  // pdfjs detaches the buffer it receives, so always hand it a clone.
  const cloned = new Uint8Array(bytes.byteLength);
  cloned.set(bytes);

  let doc: PDFDocumentProxy;
  try {
    const task = pdfjs.getDocument({
      data: cloned,
      isEvalSupported: false,
      disableFontFace: false,
    });
    doc = await task.promise;
  } catch (err) {
    throw new ThumbnailError(
      'CORRUPT_DOCUMENT',
      err instanceof Error ? `Could not open PDF: ${err.message}` : 'Could not open PDF.',
      { cause: err instanceof Error ? err.message : String(err) },
    );
  }

  let destroyed = false;

  const renderThumbnail = async (
    pageNum: number,
    opts: ThumbnailRenderOptions = {},
  ): Promise<string> => {
    if (destroyed) {
      throw new ThumbnailError('ABORTED', 'Document handle has been destroyed.');
    }
    if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > doc.numPages) {
      throw new ThumbnailError(
        'OUT_OF_BOUNDS',
        `Page ${pageNum} is out of range (1..${doc.numPages}).`,
        { pageNum, total: doc.numPages },
      );
    }
    if (opts.signal?.aborted) {
      throw new ThumbnailError('ABORTED', 'Render aborted before it started.');
    }

    let page: PDFPageProxy | undefined;
    let renderTask: RenderTask | undefined;
    let canvas: HTMLCanvasElement | undefined;

    try {
      page = await doc.getPage(pageNum);
      const baseViewport = page.getViewport({ scale: 1 });
      const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
      const scale = computeScale(baseViewport, opts, dpr);
      const viewport = page.getViewport({ scale });

      canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        throw new ThumbnailError('CANVAS_UNAVAILABLE', '2D canvas context unavailable.');
      }

      // White background avoids blackouts on transparent PDF pages.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      renderTask = page.render({ canvasContext: ctx, viewport, intent: 'display' });

      const onAbort = (): void => {
        renderTask?.cancel();
      };
      opts.signal?.addEventListener('abort', onAbort, { once: true });

      try {
        await renderTask.promise;
      } finally {
        opts.signal?.removeEventListener('abort', onAbort);
      }

      const format = opts.format ?? 'image/jpeg';
      const quality = clamp01(opts.quality ?? 0.82);
      return canvas.toDataURL(format, quality);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.name === 'RenderingCancelledException' || opts.signal?.aborted === true)
      ) {
        throw new ThumbnailError('ABORTED', 'Thumbnail render aborted.');
      }
      if (err instanceof ThumbnailError) throw err;
      throw new ThumbnailError(
        'RENDER_FAILED',
        err instanceof Error ? `Render failed: ${err.message}` : 'Render failed.',
        { pageNum, cause: err instanceof Error ? err.message : String(err) },
      );
    } finally {
      // Eagerly free resources — canvases on Safari/iOS leak quickly otherwise.
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
      page?.cleanup();
    }
  };

  const destroy = async (): Promise<void> => {
    if (destroyed) return;
    destroyed = true;
    try {
      await doc.destroy();
    } catch {
      // ignore — destroy is best-effort.
    }
  };

  return {
    pageCount: doc.numPages,
    renderThumbnail,
    destroy,
  };
}

/* ─────────────────────────────────────────────────────────────────
 * Internal helpers
 * ──────────────────────────────────────────────────────────────── */

function computeScale(
  baseViewport: PageViewport,
  opts: ThumbnailRenderOptions,
  dpr: number,
): number {
  const targetW = (opts.maxWidth ?? 240) * dpr;
  const targetH = (opts.maxHeight ?? 320) * dpr;
  const scaleW = targetW / baseViewport.width;
  const scaleH = targetH / baseViewport.height;
  // Pick the smaller scale so the rendered image fits the bounding box.
  const scale = Math.min(scaleW, scaleH);
  // Guard against degenerate values from malformed viewports.
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.82;
  return Math.max(0, Math.min(1, n));
}
