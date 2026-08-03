'use client';

import * as React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  Loader2,
  Replace,
  Scissors,
  X,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatBytes } from '@pdf-forge/shared';

import { PageGrid, type PageInfo } from './PageGrid';
import {
  extractPages,
  parsePageRanges,
  PdfSplitError,
  splitByRanges,
  splitEveryN,
  type SplitOutput,
} from '../lib/pdf-split';
import {
  createAndDownloadZip,
  DownloadError,
  downloadSinglePdf,
} from '@/lib/pdf/zip-download';
import {
  loadPdfDocument,
  ThumbnailError,
  type PdfDocumentHandle,
} from '@/lib/pdf/thumbnails';

type SplitMode = 'range' | 'select' | 'every';

interface UploadedFile {
  file: File;
  bytes: Uint8Array;
  pageCount: number;
}

interface FeedbackState {
  kind: 'success' | 'error';
  message: string;
  details?: string;
}

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB hard ceiling for browser-side splitting

export function SplitTool(): JSX.Element {
  /* ──────────────── state ──────────────── */
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile | null>(null);
  const [pages, setPages] = React.useState<PageInfo[]>([]);
  const [splitMode, setSplitMode] = React.useState<SplitMode>('range');
  const [pageRangeInput, setPageRangeInput] = React.useState('');
  const [splitEveryN_, setSplitEveryN_] = React.useState(1);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isLoadingPdf, setIsLoadingPdf] = React.useState(false);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [feedback, setFeedback] = React.useState<FeedbackState | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const docRef = React.useRef<PdfDocumentHandle | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  /* ──────────────── doc lifecycle ──────────────── */

  React.useEffect(() => {
    return () => {
      void docRef.current?.destroy();
      docRef.current = null;
    };
  }, []);

  const resetState = React.useCallback(async () => {
    if (docRef.current) {
      await docRef.current.destroy();
      docRef.current = null;
    }
    setUploadedFile(null);
    setPages([]);
    setPageRangeInput('');
    setSplitEveryN_(1);
    setProgress(null);
    setFeedback(null);
  }, []);

  const handleFileSelected = React.useCallback(
    async (file: File) => {
      setFeedback(null);
      setProgress(null);

      if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        setFeedback({
          kind: 'error',
          message: 'That file does not look like a PDF.',
          details: file.type ? `Detected MIME: ${file.type}` : undefined,
        });
        return;
      }
      if (file.size === 0) {
        setFeedback({ kind: 'error', message: 'The file is empty.' });
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setFeedback({
          kind: 'error',
          message: `File is too large for in-browser splitting (limit ${formatBytes(MAX_UPLOAD_BYTES)}).`,
        });
        return;
      }

      setIsLoadingPdf(true);
      try {
        if (docRef.current) {
          await docRef.current.destroy();
          docRef.current = null;
        }

        const arrayBuf = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuf);

        const handle = await loadPdfDocument(bytes);
        docRef.current = handle;

        setUploadedFile({ file, bytes, pageCount: handle.pageCount });
        setPages(
          Array.from({ length: handle.pageCount }, (_, i) => ({
            pageNum: i + 1,
            thumbnail: null,
            selected: false,
          })),
        );
        setPageRangeInput(`1-${handle.pageCount}`);
        setSplitEveryN_(Math.min(1, handle.pageCount));
      } catch (err) {
        const message =
          err instanceof ThumbnailError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Could not open the PDF.';
        setFeedback({ kind: 'error', message });
        setUploadedFile(null);
        setPages([]);
      } finally {
        setIsLoadingPdf(false);
      }
    },
    [],
  );

  /* ──────────────── thumbnails ──────────────── */

  const handleRequestThumbnail = React.useCallback(
    async (pageNum: number, signal: AbortSignal): Promise<void> => {
      const handle = docRef.current;
      if (!handle) return;
      try {
        const dataUrl = await handle.renderThumbnail(pageNum, {
          maxWidth: 240,
          maxHeight: 320,
          format: 'image/jpeg',
          quality: 0.78,
          signal,
        });
        if (signal.aborted) return;
        setPages((prev) => {
          const idx = pageNum - 1;
          if (idx < 0 || idx >= prev.length) return prev;
          const next = prev.slice();
          const existing = next[idx];
          if (!existing || existing.thumbnail === dataUrl) return prev;
          next[idx] = { ...existing, thumbnail: dataUrl };
          return next;
        });
      } catch (err) {
        if (err instanceof ThumbnailError && err.code === 'ABORTED') return;
        // Failures are non-fatal — the cell stays in skeleton state and may retry on next view.
        console.warn('[split-pdf] thumbnail render failed', err);
      }
    },
    [],
  );

  /* ──────────────── selection helpers ──────────────── */

  const togglePage = React.useCallback((pageNum: number, selected: boolean) => {
    setPages((prev) => {
      const idx = pageNum - 1;
      if (idx < 0 || idx >= prev.length) return prev;
      const target = prev[idx];
      if (!target || target.selected === selected) return prev;
      const next = prev.slice();
      next[idx] = { ...target, selected };
      return next;
    });
  }, []);

  const selectAll = React.useCallback(() => {
    setPages((prev) => prev.map((p) => (p.selected ? p : { ...p, selected: true })));
  }, []);

  const deselectAll = React.useCallback(() => {
    setPages((prev) => prev.map((p) => (p.selected ? { ...p, selected: false } : p)));
  }, []);

  /* ──────────────── derived ──────────────── */

  const selectedCount = React.useMemo(
    () => pages.reduce((acc, p) => (p.selected ? acc + 1 : acc), 0),
    [pages],
  );

  const everyNPreview = React.useMemo<{ count: number; sample: string[] }>(() => {
    if (!uploadedFile || splitEveryN_ < 1) return { count: 0, sample: [] };
    const total = uploadedFile.pageCount;
    if (splitEveryN_ > total) return { count: 0, sample: [] };
    const count = Math.ceil(total / splitEveryN_);
    const sample: string[] = [];
    for (let i = 0; i < Math.min(count, 3); i += 1) {
      const start = i * splitEveryN_ + 1;
      const end = Math.min(start + splitEveryN_ - 1, total);
      sample.push(start === end ? `page-${start}.pdf` : `pages-${start}-${end}.pdf`);
    }
    if (count > 3) sample.push(`… (+${count - 3} more)`);
    return { count, sample };
  }, [splitEveryN_, uploadedFile]);

  /* ──────────────── split orchestration ──────────────── */

  const splitPdf = React.useCallback(async () => {
    if (!uploadedFile) return;
    setFeedback(null);
    setProgress(null);
    setIsProcessing(true);

    try {
      let outputs: SplitOutput[];

      if (splitMode === 'range') {
        const ranges = parsePageRanges(pageRangeInput, uploadedFile.pageCount);
        outputs = await splitByRanges(uploadedFile.bytes, ranges);
      } else if (splitMode === 'select') {
        const pageNums = pages.filter((p) => p.selected).map((p) => p.pageNum);
        if (pageNums.length === 0) {
          throw new PdfSplitError('NO_PAGES_SELECTED', 'Select at least one page to extract.');
        }
        const single = await extractPages(uploadedFile.bytes, pageNums);
        outputs = [single];
      } else {
        outputs = await splitEveryN(uploadedFile.bytes, splitEveryN_);
      }

      if (outputs.length === 0) {
        throw new PdfSplitError('NO_PAGES_SELECTED', 'No output produced — adjust your inputs.');
      }

      const stem = uploadedFile.file.name.replace(/\.pdf$/i, '') || 'document';

      if (outputs.length === 1) {
        const [only] = outputs;
        if (!only) throw new PdfSplitError('NO_PAGES_SELECTED', 'No output produced.');
        downloadSinglePdf(`${stem}-${only.name}`, only.bytes);
        setFeedback({
          kind: 'success',
          message: `Created 1 file (${formatBytes(only.bytes.byteLength)}).`,
          details: only.name,
        });
      } else {
        await createAndDownloadZip(
          outputs.map((o) => ({ name: o.name, bytes: o.bytes })),
          `${stem}-split`,
          (p) => setProgress(p.percent),
        );
        const totalBytes = outputs.reduce((acc, o) => acc + o.bytes.byteLength, 0);
        setFeedback({
          kind: 'success',
          message: `Created ${outputs.length} files (${formatBytes(totalBytes)} total).`,
          details: `Downloaded as ${stem}-split.zip`,
        });
      }
    } catch (err) {
      const message =
        err instanceof PdfSplitError || err instanceof DownloadError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Something went wrong while splitting.';
      setFeedback({ kind: 'error', message });
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  }, [pageRangeInput, pages, splitEveryN_, splitMode, uploadedFile]);

  /* ──────────────── ui validation gates ──────────────── */

  const splitButtonDisabled = React.useMemo(() => {
    if (!uploadedFile || isProcessing || isLoadingPdf) return true;
    if (splitMode === 'range') return pageRangeInput.trim().length === 0;
    if (splitMode === 'select') return selectedCount === 0;
    if (splitMode === 'every')
      return splitEveryN_ < 1 || splitEveryN_ > uploadedFile.pageCount;
    return false;
  }, [
    isLoadingPdf,
    isProcessing,
    pageRangeInput,
    selectedCount,
    splitEveryN_,
    splitMode,
    uploadedFile,
  ]);

  /* ──────────────── render ──────────────── */

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors aria-hidden className="h-5 w-5" />
            Split PDF
          </CardTitle>
          <CardDescription>
            Choose how you want to split the document. All processing happens locally in your
            browser — your file never leaves your device.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <Dropzone
            uploadedFile={uploadedFile}
            isLoadingPdf={isLoadingPdf}
            isDragging={isDragging}
            onDragStateChange={setIsDragging}
            onPick={() => fileInputRef.current?.click()}
            onFile={handleFileSelected}
            onClear={() => void resetState()}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFileSelected(f);
              e.target.value = '';
            }}
          />

          {uploadedFile ? (
            <Tabs
              value={splitMode}
              onValueChange={(v) => setSplitMode(v as SplitMode)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="range">By range</TabsTrigger>
                <TabsTrigger value="select">Select pages</TabsTrigger>
                <TabsTrigger value="every">Split every N</TabsTrigger>
              </TabsList>

              <TabsContent value="range" className="space-y-3">
                <Label htmlFor="range-input" className="text-sm">
                  Page ranges
                </Label>
                <Input
                  id="range-input"
                  inputMode="text"
                  placeholder="e.g. 1-3, 5, 8-10"
                  value={pageRangeInput}
                  onChange={(e) => setPageRangeInput(e.target.value)}
                  disabled={isProcessing}
                  aria-describedby="range-hint"
                />
                <p id="range-hint" className="text-xs text-muted-foreground">
                  Enter one or more comma-separated ranges. Each range produces one output file
                  (e.g. <code>pages-1-3.pdf</code>, <code>page-5.pdf</code>).
                </p>
              </TabsContent>

              <TabsContent value="select" className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Tick the pages you want to extract — they will be combined into a single PDF.
                </p>
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
                  <strong>{selectedCount}</strong> of <strong>{uploadedFile.pageCount}</strong>{' '}
                  pages selected.
                </div>
              </TabsContent>

              <TabsContent value="every" className="space-y-3">
                <Label htmlFor="every-n" className="text-sm">
                  Pages per output file
                </Label>
                <Input
                  id="every-n"
                  type="number"
                  min={1}
                  max={uploadedFile.pageCount}
                  step={1}
                  value={splitEveryN_}
                  onChange={(e) => {
                    const next = Number.parseInt(e.target.value, 10);
                    setSplitEveryN_(Number.isFinite(next) && next > 0 ? next : 1);
                  }}
                  disabled={isProcessing}
                  aria-describedby="every-hint"
                />
                <div id="every-hint" className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    Will produce{' '}
                    <strong className="text-foreground">{everyNPreview.count}</strong> output{' '}
                    {everyNPreview.count === 1 ? 'file' : 'files'} from{' '}
                    {uploadedFile.pageCount} pages.
                  </p>
                  {everyNPreview.sample.length > 0 ? (
                    <ul className="ml-4 list-disc">
                      {everyNPreview.sample.map((name) => (
                        <li key={name}>
                          <code>{name}</code>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </TabsContent>
            </Tabs>
          ) : null}

          {feedback ? <FeedbackBanner feedback={feedback} /> : null}

          {progress !== null && isProcessing ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Building zip…</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} aria-label="Compression progress" />
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {uploadedFile
              ? `${uploadedFile.pageCount} pages · ${formatBytes(uploadedFile.file.size)}`
              : 'Upload a PDF to begin.'}
          </p>
          <Button
            type="button"
            size="lg"
            onClick={() => void splitPdf()}
            disabled={splitButtonDisabled}
          >
            {isProcessing ? (
              <>
                <Loader2 aria-hidden className="animate-spin" />
                Splitting…
              </>
            ) : (
              <>
                <Scissors aria-hidden />
                Split PDF
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            Page thumbnails are rendered lazily as you scroll. Select pages here to use them in
            the <em>Select pages</em> tab.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PageGrid
            pages={pages}
            onTogglePage={togglePage}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
            onRequestThumbnail={handleRequestThumbnail}
            disabled={isProcessing || isLoadingPdf}
            title={uploadedFile ? `Pages (${uploadedFile.pageCount})` : 'Pages'}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Sub-components
 * ──────────────────────────────────────────────────────────────── */

interface DropzoneProps {
  uploadedFile: UploadedFile | null;
  isLoadingPdf: boolean;
  isDragging: boolean;
  onDragStateChange(dragging: boolean): void;
  onPick(): void;
  onFile(file: File): void;
  onClear(): void;
}

function Dropzone({
  uploadedFile,
  isLoadingPdf,
  isDragging,
  onDragStateChange,
  onPick,
  onFile,
  onClear,
}: DropzoneProps): JSX.Element {
  const handleDragOver = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (e.dataTransfer.types.includes('Files')) {
        onDragStateChange(true);
        e.dataTransfer.dropEffect = 'copy';
      }
    },
    [onDragStateChange],
  );

  const handleDragLeave = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      onDragStateChange(false);
    },
    [onDragStateChange],
  );

  const handleDrop = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      onDragStateChange(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [onDragStateChange, onFile],
  );

  if (uploadedFile) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0 text-emerald-600" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" title={uploadedFile.file.name}>
              {uploadedFile.file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {uploadedFile.pageCount} pages · {formatBytes(uploadedFile.file.size)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onPick}>
            <Replace aria-hidden />
            Replace
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onClear}
            aria-label="Remove file"
          >
            <X aria-hidden />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPick();
        }
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-muted/30 px-6 py-10 text-center transition-colors',
        'hover:border-primary/60 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isDragging && 'border-primary bg-primary/5',
      )}
    >
      {isLoadingPdf ? (
        <Loader2 aria-hidden className="h-8 w-8 animate-spin text-muted-foreground" />
      ) : (
        <FileUp aria-hidden className="h-8 w-8 text-muted-foreground" />
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {isLoadingPdf ? 'Reading PDF…' : 'Drop a PDF here or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground">
          Files stay on your device. Up to {formatBytes(MAX_UPLOAD_BYTES)}.
        </p>
      </div>
    </div>
  );
}

function FeedbackBanner({ feedback }: { feedback: FeedbackState }): JSX.Element {
  const isError = feedback.kind === 'error';
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
        <p className="font-medium">{feedback.message}</p>
        {feedback.details ? (
          <p className="text-xs opacity-80">{feedback.details}</p>
        ) : null}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Re-export PageInfo for the page.tsx server component (typing only).
 * ──────────────────────────────────────────────────────────────── */
export type { PageInfo };
