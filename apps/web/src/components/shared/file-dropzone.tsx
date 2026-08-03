'use client';

import * as React from 'react';
import { CheckCircle2, FileUp, Loader2, Replace, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatBytes } from '@pdf-forge/shared';
import { cn } from '@/lib/utils';

export interface FileDropzoneProps {
  /** Currently selected file (or null when empty). */
  file: File | null;
  /** True while reading the file into memory. */
  isLoading?: boolean;
  /** Called with the selected `File`. */
  onFile: (file: File) => void;
  /** Called when the user clears the selection. */
  onClear: () => void;
  /** Accepted MIME types / extensions for the native file picker. */
  accept?: string;
  /** Maximum allowed size, used only for the helper text. */
  maxBytes?: number;
  /** Override the upload-state hint. */
  emptyHint?: string;
  /** Override the loading hint. */
  loadingHint?: string;
  /** Compact mode (smaller padding) for embedded usage. */
  compact?: boolean;
  className?: string;
  /** Additional metadata rendered next to the filename (e.g. "10 pages"). */
  meta?: React.ReactNode;
}

/**
 * A reusable drag-and-drop / click-to-pick file zone.
 *
 * Renders an empty zone when no file is selected, and a compact "selected
 * file" row with Replace / Clear once a file has been chosen.
 */
export function FileDropzone({
  file,
  isLoading = false,
  onFile,
  onClear,
  accept = 'application/pdf,.pdf',
  maxBytes,
  emptyHint = 'Drop a PDF here or click to browse',
  loadingHint = 'Reading PDF…',
  compact = false,
  className,
  meta,
}: FileDropzoneProps): JSX.Element {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const openPicker = React.useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleDragOver = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) onFile(f);
    },
    [onFile],
  );

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) onFile(f);
      e.target.value = '';
    },
    [onFile],
  );

  if (file) {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3',
          className,
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0 text-emerald-600" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" title={file.name}>
              {file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(file.size)}
              {meta ? <> · {meta}</> : null}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={openPicker}>
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
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleChange}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPicker();
        }
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-muted/30 text-center transition-colors',
        compact ? 'px-4 py-6' : 'px-6 py-10',
        'hover:border-primary/60 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isDragging && 'border-primary bg-primary/5',
        className,
      )}
    >
      {isLoading ? (
        <Loader2 aria-hidden className="h-8 w-8 animate-spin text-muted-foreground" />
      ) : (
        <FileUp aria-hidden className="h-8 w-8 text-muted-foreground" />
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium">{isLoading ? loadingHint : emptyHint}</p>
        <p className="text-xs text-muted-foreground">
          Files stay on your device.
          {maxBytes ? <> Up to {formatBytes(maxBytes)}.</> : null}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
