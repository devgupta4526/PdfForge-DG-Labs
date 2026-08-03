'use client';

import * as React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  Settings2,
  Sparkles,
  Wand2,
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
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatBytes } from '@pdf-forge/shared';

import { FileDropzone } from '@/components/shared/file-dropzone';
import { SizeComparison } from '@/components/shared/size-display';
import { ApiClientError, api, type CompressResponse, type CompressionLevel } from '@/lib/api';
import { useDownload } from '@/hooks/useDownload';
import { useFileUpload } from '@/hooks/useFileUpload';

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB matches API ceiling

const LEVEL_OPTIONS: ReadonlyArray<{
  value: CompressionLevel;
  title: string;
  estimate: string;
  description: string;
}> = [
  {
    value: 'low',
    title: 'Low',
    estimate: '~10–30% smaller',
    description: 'Image quality 85%, downsample to ~150 DPI. Best fidelity.',
  },
  {
    value: 'medium',
    title: 'Medium',
    estimate: '~40–70% smaller',
    description: 'Image quality 65%, downsample to ~96 DPI. Strips metadata.',
  },
  {
    value: 'high',
    title: 'High',
    estimate: '~70–95% smaller',
    description: 'Image quality 45%, downsample to ~72 DPI. Strips metadata, flattens form fields.',
  },
];

interface FeedbackError {
  kind: 'error';
  message: string;
  details?: string;
}

export function CompressTool(): JSX.Element {
  const upload = useFileUpload({ maxBytes: MAX_UPLOAD_BYTES });
  const downloads = useDownload();

  const [level, setLevel] = React.useState<CompressionLevel>('medium');
  const [progress, setProgress] = React.useState<number>(0);
  const [phase, setPhase] = React.useState<'idle' | 'uploading' | 'processing'>('idle');
  const [result, setResult] = React.useState<CompressResponse | null>(null);
  const [error, setError] = React.useState<FeedbackError | null>(null);

  const abortRef = React.useRef<AbortController | null>(null);

  // Reset prior result whenever the user picks a new file or changes level.
  React.useEffect(() => {
    setResult(null);
    setError(null);
    setProgress(0);
    setPhase('idle');
  }, [upload.file, level]);

  React.useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleFile = React.useCallback(
    (file: File) => {
      void upload.selectFile(file);
    },
    [upload],
  );

  const handleClear = React.useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    upload.reset();
    setResult(null);
    setError(null);
    setProgress(0);
    setPhase('idle');
  }, [upload]);

  const isProcessing = phase !== 'idle';

  const compressNow = React.useCallback(async () => {
    if (!upload.file) return;

    setError(null);
    setResult(null);
    setProgress(0);
    setPhase('uploading');

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    try {
      const res = await api.compressPdf(upload.file, level, {
        signal: controller.signal,
        onProgress: (p) => {
          setProgress(p.percent);
          if (p.percent >= 100) setPhase('processing');
        },
      });
      setResult(res);
      setPhase('idle');
      setProgress(0);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError({
          kind: 'error',
          message: err.message,
          details: err.code !== 'UNKNOWN_ERROR' ? err.code : undefined,
        });
      } else if (err instanceof Error) {
        setError({ kind: 'error', message: err.message });
      } else {
        setError({ kind: 'error', message: 'Compression failed.' });
      }
      setPhase('idle');
      setProgress(0);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [level, upload.file]);

  const triggerDownload = React.useCallback(() => {
    if (!result) return;
    downloads.downloadFromUrl(result.downloadUrl, result.downloadFilename);
  }, [downloads, result]);

  const fileSizeMeta = upload.file ? formatBytes(upload.file.size) : null;
  const submitDisabled = !upload.file || upload.isLoading || isProcessing;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* ── Settings card ─────────────────────────────────────────── */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 aria-hidden className="h-5 w-5" />
            Compress PDF
          </CardTitle>
          <CardDescription>
            Re-encode embedded images at a smaller quality to shrink the file. Processing happens
            on our server — your file is deleted automatically after one hour.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <FileDropzone
            file={upload.file}
            isLoading={upload.isLoading}
            onFile={handleFile}
            onClear={handleClear}
            maxBytes={MAX_UPLOAD_BYTES}
            meta={fileSizeMeta}
          />

          {upload.error ? (
            <FeedbackBanner kind="error" message={upload.error} />
          ) : null}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Settings2 aria-hidden className="h-4 w-4 text-muted-foreground" />
                Compression level
              </Label>
              <span className="text-xs text-muted-foreground">
                Estimates vary by document content.
              </span>
            </div>
            <RadioGroup
              value={level}
              onValueChange={(v) => setLevel(v as CompressionLevel)}
              aria-label="Compression level"
              className="grid gap-2"
            >
              {LEVEL_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  htmlFor={`compress-level-${opt.value}`}
                  className={cn(
                    'group flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                    level === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-foreground/30',
                  )}
                >
                  <RadioGroupItem
                    value={opt.value}
                    id={`compress-level-${opt.value}`}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{opt.title}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {opt.estimate}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {error ? <FeedbackBanner kind="error" message={error.message} details={error.details} /> : null}

          {isProcessing ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {phase === 'uploading' ? 'Uploading…' : 'Compressing on the server…'}
                </span>
                <span>{phase === 'uploading' ? `${progress}%` : '—'}</span>
              </div>
              <Progress
                value={phase === 'uploading' ? progress : undefined}
                aria-label="Compression progress"
                className={cn(phase === 'processing' && 'animate-pulse')}
              />
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {upload.file ? `Ready to compress at ${level} level.` : 'Upload a PDF to begin.'}
          </p>
          <Button
            type="button"
            size="lg"
            onClick={() => void compressNow()}
            disabled={submitDisabled}
          >
            {isProcessing ? (
              <>
                <Loader2 aria-hidden className="animate-spin" />
                {phase === 'uploading' ? 'Uploading…' : 'Compressing…'}
              </>
            ) : (
              <>
                <Sparkles aria-hidden />
                Compress PDF
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* ── Result card ───────────────────────────────────────────── */}
      <Card className={cn('h-fit', !result && 'border-dashed bg-muted/20')}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2
              aria-hidden
              className={cn('h-5 w-5', result ? 'text-emerald-600' : 'text-muted-foreground')}
            />
            {result ? 'Compression complete' : 'Result will appear here'}
          </CardTitle>
          {result ? (
            <CardDescription>
              {result.details.imagesScanned > 0
                ? `Re-encoded ${result.details.imagesRecompressed} of ${result.details.imagesScanned} images in ${(result.details.elapsedMs / 1000).toFixed(1)}s.`
                : `Compressed in ${(result.details.elapsedMs / 1000).toFixed(1)}s. (No images found to re-encode.)`}
            </CardDescription>
          ) : (
            <CardDescription>
              You'll see a before/after comparison and a download link as soon as compression
              finishes.
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          {result ? (
            <>
              <SizeComparison
                originalBytes={result.originalSize}
                resultBytes={result.compressedSize}
                label="File size"
              />

              <Separator />

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Level</dt>
                  <dd className="font-medium capitalize">{result.level}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Reduction
                  </dt>
                  <dd className="font-medium">{result.reductionPercent.toFixed(1)}%</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Images
                  </dt>
                  <dd className="font-medium">
                    {result.details.imagesRecompressed}/{result.details.imagesScanned}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Form fields
                  </dt>
                  <dd className="font-medium">
                    {result.details.formsFlattened ? 'flattened' : 'unchanged'}
                  </dd>
                </div>
              </dl>

              <p className="text-xs text-muted-foreground">
                The download link expires at{' '}
                <time dateTime={result.expiresAt}>{formatExpiry(result.expiresAt)}</time>.
              </p>
            </>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              No result yet.
            </div>
          )}

          {downloads.error ? (
            <FeedbackBanner kind="error" message={downloads.error} />
          ) : null}
        </CardContent>

        {result ? (
          <CardFooter className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(result.downloadUrl, '_blank', 'noreferrer,noopener')}
            >
              <ExternalLink aria-hidden />
              Open in tab
            </Button>
            <Button type="button" size="sm" onClick={triggerDownload}>
              <Download aria-hidden />
              Download
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────── */

function FeedbackBanner({
  kind,
  message,
  details,
}: {
  kind: 'error' | 'success';
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

function formatExpiry(iso: string): string {
  try {
    const dt = new Date(iso);
    return dt.toLocaleString();
  } catch {
    return iso;
  }
}
