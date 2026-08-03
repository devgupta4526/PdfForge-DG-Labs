'use client';

import * as React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  RotateCcw,
  RotateCw,
  RotateCwSquare,
  Undo2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatBytes } from '@pdf-forge/shared';

import { FileDropzone } from '@/components/shared/file-dropzone';
import { useDownload } from '@/hooks/useDownload';
import { useFileUpload } from '@/hooks/useFileUpload';
import { usePdfPages } from '@/hooks/usePdfPages';

import {
  combineRotations,
  PdfRotateError,
  rotatePdfPages,
  type RotationDelta,
} from '../lib/pdf-rotate';

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const ROOT_MARGIN = '300px 0px';

interface PageState {
  pageNum: number;
  /** Visible rotation = base (from source) + user delta, normalised. */
  delta: RotationDelta;
}

interface FeedbackState {
  kind: 'success' | 'error';
  message: string;
  details?: string;
}

export function RotateTool(): JSX.Element {
  const upload = useFileUpload({ maxBytes: MAX_UPLOAD_BYTES });
  const pdf = usePdfPages({ bytes: upload.bytes });
  const downloads = useDownload();

  const [pageStates, setPageStates] = React.useState<PageState[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [feedback, setFeedback] = React.useState<FeedbackState | null>(null);

  // Rebuild page states whenever the document changes.
  React.useEffect(() => {
    setFeedback(null);
    if (pdf.pageCount === 0) {
      setPageStates([]);
      return;
    }
    setPageStates(
      Array.from({ length: pdf.pageCount }, (_, i) => ({ pageNum: i + 1, delta: 0 })),
    );
  }, [pdf.pageCount]);

  const rotateOne = React.useCallback((pageNum: number, by: 90 | 180 | 270) => {
    setPageStates((prev) =>
      prev.map((p) =>
        p.pageNum === pageNum ? { ...p, delta: combineRotations(p.delta, by) } : p,
      ),
    );
  }, []);

  const rotateAll = React.useCallback((by: 90 | 180 | 270) => {
    setPageStates((prev) =>
      prev.map((p) => ({ ...p, delta: combineRotations(p.delta, by) })),
    );
  }, []);

  const resetAll = React.useCallback(() => {
    setPageStates((prev) => prev.map((p) => ({ ...p, delta: 0 })));
  }, []);

  const totalChanges = React.useMemo(
    () => pageStates.reduce((acc, p) => (p.delta !== 0 ? acc + 1 : acc), 0),
    [pageStates],
  );

  const downloadRotated = React.useCallback(async () => {
    if (!upload.bytes || !upload.file || totalChanges === 0) return;

    setIsProcessing(true);
    setFeedback(null);
    try {
      const deltas = new Map<number, number>();
      for (const p of pageStates) {
        if (p.delta !== 0) deltas.set(p.pageNum, p.delta);
      }
      const rotated = await rotatePdfPages({ pdfBytes: upload.bytes, deltas });
      const stem = upload.file.name.replace(/\.pdf$/i, '') || 'document';
      downloads.downloadBytes(rotated, `${stem}-rotated.pdf`, 'application/pdf');
      setFeedback({
        kind: 'success',
        message: `Rotated ${totalChanges} ${totalChanges === 1 ? 'page' : 'pages'}.`,
        details: `${formatBytes(rotated.byteLength)} downloaded.`,
      });
      // Clear deltas so the user can keep working from a fresh baseline.
      resetAll();
    } catch (err) {
      const message =
        err instanceof PdfRotateError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not rotate the PDF.';
      setFeedback({ kind: 'error', message });
    } finally {
      setIsProcessing(false);
    }
  }, [downloads, pageStates, resetAll, totalChanges, upload.bytes, upload.file]);

  const handleClear = React.useCallback(() => {
    setPageStates([]);
    setFeedback(null);
    setIsProcessing(false);
    upload.reset();
  }, [upload]);

  const fileMeta =
    upload.file && pdf.pageCount > 0
      ? `${pdf.pageCount} ${pdf.pageCount === 1 ? 'page' : 'pages'}`
      : null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCwSquare aria-hidden className="h-5 w-5" />
            Rotate PDF
          </CardTitle>
          <CardDescription>
            Rotate individual pages or the whole document. Everything happens locally — your file
            never leaves your device.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          <FileDropzone
            file={upload.file}
            isLoading={upload.isLoading || pdf.isLoading}
            onFile={(f) => void upload.selectFile(f)}
            onClear={handleClear}
            maxBytes={MAX_UPLOAD_BYTES}
            meta={fileMeta}
          />

          {upload.error ? <FeedbackBanner kind="error" message={upload.error} /> : null}
          {pdf.error ? <FeedbackBanner kind="error" message={pdf.error} /> : null}

          {pdf.pageCount > 0 ? (
            <div className="flex flex-col gap-3">
              <Separator />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Bulk actions</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" size="sm" variant="outline" disabled={isProcessing}>
                      <RotateCwSquare aria-hidden />
                      Rotate all
                      <ChevronDown aria-hidden className="ml-1 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Apply to every page</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => rotateAll(90)}>
                      <RotateCw aria-hidden />
                      90° clockwise
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => rotateAll(180)}>
                      <RotateCwSquare aria-hidden />
                      180°
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => rotateAll(270)}>
                      <RotateCcw aria-hidden />
                      90° counter-clockwise
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs">
                <span>
                  <strong className="text-foreground">{totalChanges}</strong> of{' '}
                  <strong className="text-foreground">{pdf.pageCount}</strong> pages will rotate.
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={resetAll}
                  disabled={totalChanges === 0 || isProcessing}
                >
                  <Undo2 aria-hidden />
                  Reset
                </Button>
              </div>
            </div>
          ) : null}

          {feedback ? <FeedbackBanner kind={feedback.kind} message={feedback.message} details={feedback.details} /> : null}
        </CardContent>

        <CardFooter className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {pdf.pageCount > 0
              ? totalChanges === 0
                ? 'Pick a rotation to enable download.'
                : `Ready to apply ${totalChanges} rotation${totalChanges === 1 ? '' : 's'}.`
              : 'Upload a PDF to begin.'}
          </p>
          <Button
            type="button"
            size="lg"
            onClick={() => void downloadRotated()}
            disabled={!upload.bytes || totalChanges === 0 || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 aria-hidden className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Download aria-hidden />
                Download rotated PDF
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Pages</CardTitle>
          <CardDescription>
            Use the buttons on each page to spin it 90° in either direction. Thumbnails rotate in
            place — the file is only modified when you press Download.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pdf.pageCount === 0 ? (
            <EmptyPreview />
          ) : (
            <ul
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4"
              aria-label="PDF pages"
            >
              {pageStates.map((p, idx) => {
                const thumbnail = pdf.pages[idx]?.thumbnail ?? null;
                return (
                  <RotatePageCell
                    key={p.pageNum}
                    pageNum={p.pageNum}
                    delta={p.delta}
                    thumbnail={thumbnail}
                    onRequestThumbnail={pdf.requestThumbnail}
                    onRotate={rotateOne}
                    disabled={isProcessing}
                  />
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Cell
 * ──────────────────────────────────────────────────────────────── */

interface RotatePageCellProps {
  pageNum: number;
  delta: RotationDelta;
  thumbnail: string | null;
  onRequestThumbnail: (pageNum: number, signal: AbortSignal) => Promise<void>;
  onRotate: (pageNum: number, by: 90 | 270) => void;
  disabled: boolean;
}

const RotatePageCell = React.memo(function RotatePageCell({
  pageNum,
  delta,
  thumbnail,
  onRequestThumbnail,
  onRotate,
  disabled,
}: RotatePageCellProps): JSX.Element {
  const ref = React.useRef<HTMLLIElement | null>(null);
  const requestedRef = React.useRef(false);
  const fnRef = React.useRef(onRequestThumbnail);
  React.useEffect(() => {
    fnRef.current = onRequestThumbnail;
  }, [onRequestThumbnail]);

  const hasThumb = thumbnail !== null;

  React.useEffect(() => {
    if (hasThumb || requestedRef.current) return;
    const node = ref.current;
    if (!node) return;

    const controller = new AbortController();
    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !requestedRef.current && !cancelled) {
            requestedRef.current = true;
            void fnRef.current(pageNum, controller.signal).catch(() => {
              requestedRef.current = false;
            });
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: ROOT_MARGIN, threshold: 0.01 },
    );
    observer.observe(node);
    return () => {
      cancelled = true;
      controller.abort();
      observer.disconnect();
    };
  }, [hasThumb, pageNum]);

  return (
    <li
      ref={ref}
      className={cn(
        'group relative flex flex-col items-center gap-2 rounded-lg border bg-card p-2',
        delta !== 0 && 'border-primary/60 ring-1 ring-primary/40',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <div className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-md border bg-muted">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element -- data: URLs cannot use next/image
          <img
            src={thumbnail}
            alt={`Page ${pageNum}`}
            className="h-full w-full object-contain transition-transform duration-300"
            style={{ transform: `rotate(${delta}deg)` }}
            draggable={false}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <FileText aria-hidden className="h-6 w-6 animate-pulse opacity-60" />
            <span className="sr-only">Loading thumbnail for page {pageNum}</span>
          </div>
        )}
        {delta !== 0 ? (
          <span className="absolute right-1 top-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
            {delta}°
          </span>
        ) : null}
      </div>

      <div className="flex w-full items-center justify-between gap-1">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-7 w-7"
          aria-label={`Rotate page ${pageNum} 90 degrees counter-clockwise`}
          onClick={() => onRotate(pageNum, 270)}
        >
          <RotateCcw aria-hidden className="h-3.5 w-3.5" />
        </Button>
        <span className="text-[11px] font-medium text-muted-foreground">Page {pageNum}</span>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-7 w-7"
          aria-label={`Rotate page ${pageNum} 90 degrees clockwise`}
          onClick={() => onRotate(pageNum, 90)}
        >
          <RotateCw aria-hidden className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
});

/* ─────────────────────────────────────────────────────────────────
 * Empties + banners
 * ──────────────────────────────────────────────────────────────── */

function EmptyPreview(): JSX.Element {
  return (
    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
      Upload a PDF to see its pages here.
    </div>
  );
}

function FeedbackBanner({
  kind,
  message,
  details,
}: {
  kind: 'success' | 'error';
  message: string;
  details?: string;
}): JSX.Element {
  const isError = kind === 'error';
  const Icon = isError ? AlertTriangle : CheckCircle2;
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-lg border px-3 py-2 text-sm',
        isError
          ? 'border-destructive/40 bg-destructive/5 text-destructive'
          : 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
      )}
    >
      <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-0.5">
        <p className="font-medium">{message}</p>
        {details ? <p className="text-xs opacity-80">{details}</p> : null}
      </div>
    </div>
  );
}
