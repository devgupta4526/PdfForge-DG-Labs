'use client';

import * as React from 'react';

import { formatBytes } from '@pdf-forge/shared';

export interface UseFileUploadOptions {
  /** Maximum allowed file size in bytes. */
  maxBytes: number;
  /**
   * One or more `accept` patterns — these are matched against MIME type
   * (`application/pdf`) and against file extension (`.pdf`).
   *
   * Defaults to PDFs only.
   */
  accept?: ReadonlyArray<{ mime: string; extension: string }>;
  /** Optional async callback that runs once the file is read. */
  onLoaded?: (payload: LoadedFile) => void | Promise<void>;
}

export interface LoadedFile {
  /** The original `File` reference. */
  file: File;
  /** File contents as a `Uint8Array`. */
  bytes: Uint8Array;
}

export interface UseFileUploadResult {
  file: File | null;
  bytes: Uint8Array | null;
  /** Latest validation/read error (cleared on a successful new upload). */
  error: string | null;
  /** True while the file is being read into memory. */
  isLoading: boolean;
  /** Handle a freshly picked / dropped file. */
  selectFile: (file: File | null | undefined) => Promise<void>;
  /** Reset to the empty state. Idempotent. */
  reset: () => void;
}

const DEFAULT_ACCEPT: ReadonlyArray<{ mime: string; extension: string }> = [
  { mime: 'application/pdf', extension: '.pdf' },
];

/**
 * Tiny state machine around a single uploaded file. Validates type + size,
 * reads the bytes once, and exposes a `reset()` for "Replace" / "Clear" UX.
 *
 * The hook intentionally keeps the parsed `Uint8Array` around — every PDF tool
 * we ship needs raw bytes, so re-reading the `File` per render is wasteful.
 */
export function useFileUpload(opts: UseFileUploadOptions): UseFileUploadResult {
  const { maxBytes, accept = DEFAULT_ACCEPT, onLoaded } = opts;

  const [file, setFile] = React.useState<File | null>(null);
  const [bytes, setBytes] = React.useState<Uint8Array | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Keep the latest onLoaded on a ref so the selectFile identity stays stable.
  const onLoadedRef = React.useRef(onLoaded);
  React.useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  const reset = React.useCallback(() => {
    setFile(null);
    setBytes(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const selectFile = React.useCallback(
    async (incoming: File | null | undefined): Promise<void> => {
      if (!incoming) return;

      const validation = validateFile(incoming, accept, maxBytes);
      if (!validation.ok) {
        setFile(null);
        setBytes(null);
        setError(validation.message);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const buf = await incoming.arrayBuffer();
        const arr = new Uint8Array(buf);
        setFile(incoming);
        setBytes(arr);
        await onLoadedRef.current?.({ file: incoming, bytes: arr });
      } catch (err) {
        setFile(null);
        setBytes(null);
        setError(
          err instanceof Error
            ? `Could not read the file: ${err.message}`
            : 'Could not read the file.',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [accept, maxBytes],
  );

  return { file, bytes, error, isLoading, selectFile, reset };
}

/* ─────────────────────────────────────────────────────────────────
 * Validation
 * ──────────────────────────────────────────────────────────────── */

type ValidationResult = { ok: true } | { ok: false; message: string };

function validateFile(
  file: File,
  accept: ReadonlyArray<{ mime: string; extension: string }>,
  maxBytes: number,
): ValidationResult {
  if (file.size === 0) {
    return { ok: false, message: 'The file is empty.' };
  }
  if (file.size > maxBytes) {
    return {
      ok: false,
      message: `File is too large for in-browser processing (limit ${formatBytes(maxBytes)}).`,
    };
  }
  const lowerName = file.name.toLowerCase();
  const matchesMime = file.type ? accept.some((a) => a.mime === file.type) : false;
  const matchesExt = accept.some((a) => lowerName.endsWith(a.extension));
  if (!matchesMime && !matchesExt) {
    return {
      ok: false,
      message: `Unsupported file type. Expected: ${accept.map((a) => a.extension).join(', ')}.`,
    };
  }
  return { ok: true };
}
