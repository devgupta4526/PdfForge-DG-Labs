'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle2, FileText, Loader2, Trash2, Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatBytes } from '@pdf-forge/shared';

import { FileDropzone } from '@/components/shared/file-dropzone';
import { useDownload } from '@/hooks/useDownload';
import { useFileUpload } from '@/hooks/useFileUpload';
import { usePdfPages } from '@/hooks/usePdfPages';

import { deletePdfPages, PdfDeleteError, planDeletion } from '../lib/pdf-delete';

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const ROOT_MARGIN = '300px 0px';

interface FeedbackState {
  kind: 'success' | 'error';
  message: string;
  details?: string;
}

export function DeletePagesTool(): JSX.Element {
  const upload = useFileUpload({ maxBytes: MAX_UPLOAD_BYTES });
  const pdf = usePdfPages({ bytes: upload.bytes });
  const downloads = useDownload();

  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [feedback, setFeedback] = React.useState<FeedbackState | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // Reset selection whenever the doc changes.
  React.useEffect(() => {
    setSelected(new Set());
    setFeedback(null);
  }, [pdf.pageCount]);

  const togglePage = React.useCallback((pageNum: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) next.delete(pageNum);
      else next.add(pageNum);
      return next;
    });
  }, []);

  const selectAll = React.useCallback(() => {
    setSelected(new Set(Array.from({ length: pdf.pageCount }, (_, i) => i + 1)));
  }, [pdf.pageCount]);

  const clearSelection = React.useCallback(() => setSelected(new Set()), []);

  // Validation — preview what would happen WITHOUT throwing.
  const validation = React.useMemo(() => {
    if (pdf.pageCount === 0) {
      return { ok: false as const, reason: 'Upload a PDF first.', remove: 0, keep: 0 };
    }
    if (selected.size === 0) {
      return {
        ok: false as const,
        reason: 'Select at least one page to delete.',
        remove: 0,
        keep: pdf.pageCount,
      };
    }
    if (selected.size === pdf.pageCount) {
      return {
        ok: false as const,
        reason: 'You can\u2019t delete every page \u2014 the result would be empty.',
        remove: selected.size,
        keep: 0,
      };
    }
    try {
      const plan = planDeletion(pdf.pageCount, Array.from(selected));
      return { ok: true as const, remove: plan.remove.length, keep: plan.keep.length };
    } catch (err) {
      return {
        ok: false as const,
        reason: err instanceof Error ? err.message : 'Selection is invalid.',
        remove: selected.size,
        keep: pdf.pageCount - selected.size,
      };
    }
  }, [pdf.pageCount, selected]);

  const performDelete = React.useCallback(async () => {
    if (!upload.bytes || !upload.file || !validation.ok) return;
    setIsProcessing(true);
    setFeedback(null);
    try {
      const result = await deletePdfPages({
        pdfBytes: upload.bytes,
        pagesToDelete: Array.from(selected),
      });
      const stem = upload.file.name.replace(/\.pdf$/i, '') || 'document';
      downloads.downloadBytes(
        result.bytes,
        `${stem}-edited.pdf`,
        'application/pdf',
      );
      setFeedback({
        kind: 'success',
        message: `Removed ${result.removedPages.length} ${
          result.removedPages.length === 1 ? 'page' : 'pages'
        }. ${result.keptPages.length} ${result.keptPages.length === 1 ? 'page' : 'pages'} remain.`,
        details: `${formatBytes(result.bytes.byteLength)} downloaded.`,
      });
      setSelected(new Set());
    } catch (err) {
      const message =
        err instanceof PdfDeleteError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not delete pages.';
      setFeedback({ kind: 'error', message });
    } finally {
      setIsProcessing(false);
      setConfirmOpen(false);
    }
  }, [downloads, selected, upload.bytes, upload.file, validation.ok]);

  const handleClear = React.useCallback(() => {
    setSelected(new Set());
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
            <Trash2 aria-hidden className="h-5 w-5" />
            Delete pages
          </CardTitle>
          <CardDescription>
            Pick the pages you want to remove. Everything stays in your browser — your file never
            leaves your device.
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
              <CounterBanner
                remove={validation.remove}
                keep={validation.keep}
                total={pdf.pageCount}
                ok={validation.ok}
                reason={validation.ok ? undefined : validation.reason}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={selectAll}
                  disabled={isProcessing || selected.size === pdf.pageCount}
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={clearSelection}
                  disabled={isProcessing || selected.size === 0}
                >
                  <Undo2 aria-hidden />
                  Clear selection
                </Button>
              </div>
            </div>
          ) : null}

          {feedback ? (
            <FeedbackBanner kind={feedback.kind} message={feedback.message} details={feedback.details} />
          ) : null}
        </CardContent>

        <CardFooter className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {pdf.pageCount > 0
              ? validation.ok
                ? `Ready to remove ${validation.remove} ${validation.remove === 1 ? 'page' : 'pages'}.`
                : 'Adjust your selection to continue.'
              : 'Upload a PDF to begin.'}
          </p>
          <Button
            type="button"
            size="lg"
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
            disabled={!validation.ok || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 aria-hidden className="animate-spin" />
                Working…
              </>
            ) : (
              <>
                <Trash2 aria-hidden />
                Delete pages
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Pages</CardTitle>
          <CardDescription>
            Click a page to mark it for deletion. Selected pages are highlighted in red.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pdf.pageCount === 0 ? (
            <EmptyPreview />
          ) : (
            <ul
              role="listbox"
              aria-multiselectable="true"
              aria-label="PDF pages"
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4"
            >
              {pdf.pages.map((p) => (
                <DeletePageCell
                  key={p.pageNum}
                  pageNum={p.pageNum}
                  thumbnail={p.thumbnail}
                  selected={selected.has(p.pageNum)}
                  onToggle={togglePage}
                  onRequestThumbnail={pdf.requestThumbnail}
                  disabled={isProcessing}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {validation.remove} pages?</AlertDialogTitle>
            <AlertDialogDescription>
              {validation.remove === 1
                ? 'One page will be removed.'
                : `${validation.remove} pages will be removed.`}{' '}
              The remaining {validation.keep} {validation.keep === 1 ? 'page' : 'pages'} will be
              saved as a new PDF — your original file is untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Stop the dialog from auto-closing — we manage open state inside performDelete.
                e.preventDefault();
                void performDelete();
              }}
              disabled={isProcessing}
              className={cn(
                'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 aria-hidden className="animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 aria-hidden />
                  Delete & download
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Counter banner
 * ──────────────────────────────────────────────────────────────── */

function CounterBanner({
  remove,
  keep,
  total,
  ok,
  reason,
}: {
  remove: number;
  keep: number;
  total: number;
  ok: boolean;
  reason?: string;
}): JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm',
        ok
          ? 'border-border bg-muted/30'
          : remove === total && total > 0
            ? 'border-destructive/40 bg-destructive/5 text-destructive'
            : 'border-border bg-muted/30 text-muted-foreground',
      )}
    >
      <p>
        <strong className="text-destructive">
          {remove} {remove === 1 ? 'page' : 'pages'}
        </strong>{' '}
        selected for deletion,{' '}
        <strong className="text-emerald-700 dark:text-emerald-400">
          {keep} will remain
        </strong>
        {total > 0 ? ` (out of ${total})` : ''}.
      </p>
      {!ok && reason ? <p className="text-xs opacity-80">{reason}</p> : null}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Cell
 * ──────────────────────────────────────────────────────────────── */

interface DeletePageCellProps {
  pageNum: number;
  thumbnail: string | null;
  selected: boolean;
  onToggle: (pageNum: number) => void;
  onRequestThumbnail: (pageNum: number, signal: AbortSignal) => Promise<void>;
  disabled: boolean;
}

const DeletePageCell = React.memo(function DeletePageCell({
  pageNum,
  thumbnail,
  selected,
  onToggle,
  onRequestThumbnail,
  disabled,
}: DeletePageCellProps): JSX.Element {
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

  const handleClick = React.useCallback(() => {
    if (disabled) return;
    onToggle(pageNum);
  }, [disabled, onToggle, pageNum]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLLIElement>) => {
      if (disabled) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onToggle(pageNum);
      }
    },
    [disabled, onToggle, pageNum],
  );

  return (
    <li
      ref={ref}
      role="option"
      aria-selected={selected}
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border bg-card p-2 text-xs transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        selected
          ? 'border-destructive ring-2 ring-destructive ring-offset-2 ring-offset-background'
          : 'border-border hover:border-foreground/40 hover:shadow-sm',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <div className="absolute right-2 top-2 z-10">
        <Checkbox
          checked={selected}
          aria-label={`Mark page ${pageNum} for deletion`}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          onCheckedChange={() => onToggle(pageNum)}
          disabled={disabled}
          className={cn(
            selected &&
              'border-destructive bg-destructive text-destructive-foreground data-[state=checked]:bg-destructive data-[state=checked]:text-destructive-foreground',
          )}
        />
      </div>

      <div className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-md border bg-muted">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element -- data: URLs cannot use next/image
          <img
            src={thumbnail}
            alt={`Page ${pageNum}`}
            className={cn(
              'h-full w-full object-contain transition-opacity',
              selected && 'opacity-60',
            )}
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
        {selected ? (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-destructive/30 mix-blend-multiply"
            />
            <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md bg-destructive px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-destructive-foreground shadow">
              Delete
            </span>
          </>
        ) : null}
      </div>

      <span className="text-[11px] font-medium text-muted-foreground">Page {pageNum}</span>
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
