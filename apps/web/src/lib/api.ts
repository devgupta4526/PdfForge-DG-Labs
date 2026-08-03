import {
  ApiErrorSchema,
  HealthStatusSchema,
  joinUrl,
  type HealthStatus,
} from '@pdf-forge/shared';
import { z } from 'zod';

import { API_URL } from './constants';

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T>(
  path: string,
  init: RequestInit | undefined,
  parser: (raw: unknown) => T,
): Promise<T> {
  const url = joinUrl(API_URL, 'api', path);
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const raw: unknown = await res.json().catch(() => ({}));

  if (!res.ok) {
    const parsedError = ApiErrorSchema.safeParse(raw);
    if (parsedError.success) {
      throw new ApiClientError(
        res.status,
        parsedError.data.error.code,
        parsedError.data.error.message,
        parsedError.data.error.details,
      );
    }
    throw new ApiClientError(res.status, 'UNKNOWN_ERROR', res.statusText || 'Request failed');
  }

  return parser(raw);
}

/* ─────────────────────────────────────────────────────────────────
 * Multipart upload helper (XHR-based for upload progress).
 * fetch() in browsers still doesn't expose upload progress events.
 * ──────────────────────────────────────────────────────────────── */

export interface MultipartProgress {
  /** 0..100 */
  percent: number;
  loaded: number;
  total: number;
}

interface MultipartOptions {
  signal?: AbortSignal;
  onProgress?: (progress: MultipartProgress) => void;
}

function requestMultipart<T>(
  path: string,
  body: FormData,
  parser: (raw: unknown) => T,
  options: MultipartOptions = {},
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const url = joinUrl(API_URL, 'api', path);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.responseType = 'json';

    xhr.upload.onprogress = (e) => {
      if (!options.onProgress) return;
      const total = e.lengthComputable ? e.total : 0;
      const percent = total > 0 ? Math.round((e.loaded / total) * 100) : 0;
      options.onProgress({ percent: Math.min(100, percent), loaded: e.loaded, total });
    };

    xhr.onerror = () =>
      reject(new ApiClientError(0, 'NETWORK_ERROR', 'Network error during upload.'));
    xhr.onabort = () =>
      reject(new ApiClientError(0, 'ABORTED', 'Upload was aborted.'));
    xhr.ontimeout = () =>
      reject(new ApiClientError(0, 'TIMEOUT', 'Upload timed out.'));

    xhr.onload = () => {
      const raw: unknown = xhr.response ?? null;
      if (xhr.status < 200 || xhr.status >= 300) {
        const parsedError = ApiErrorSchema.safeParse(raw);
        if (parsedError.success) {
          reject(
            new ApiClientError(
              xhr.status,
              parsedError.data.error.code,
              parsedError.data.error.message,
              parsedError.data.error.details,
            ),
          );
        } else {
          reject(
            new ApiClientError(
              xhr.status,
              'UNKNOWN_ERROR',
              xhr.statusText || 'Request failed',
            ),
          );
        }
        return;
      }
      try {
        resolve(parser(raw));
      } catch (err) {
        reject(
          err instanceof Error
            ? new ApiClientError(xhr.status, 'PARSE_ERROR', err.message)
            : new ApiClientError(xhr.status, 'PARSE_ERROR', 'Could not parse response.'),
        );
      }
    };

    if (options.signal) {
      const onAbort = (): void => xhr.abort();
      if (options.signal.aborted) {
        xhr.abort();
        return;
      }
      options.signal.addEventListener('abort', onAbort, { once: true });
    }

    xhr.send(body);
  });
}

/* ─────────────────────────────────────────────────────────────────
 * Compress contract
 * ──────────────────────────────────────────────────────────────── */

export const CompressionLevelSchema = z.enum(['low', 'medium', 'high']);
export type CompressionLevel = z.infer<typeof CompressionLevelSchema>;

export const CompressResponseSchema = z.object({
  ok: z.literal(true),
  downloadUrl: z.string().url(),
  downloadFilename: z.string().min(1),
  key: z.string().min(1),
  expiresAt: z.string().min(1),
  originalSize: z.number().int().nonnegative(),
  compressedSize: z.number().int().nonnegative(),
  reductionPercent: z.number(),
  level: CompressionLevelSchema,
  details: z.object({
    imagesScanned: z.number().int().nonnegative(),
    imagesRecompressed: z.number().int().nonnegative(),
    imagesSkipped: z.number().int().nonnegative(),
    metadataStripped: z.boolean(),
    formsFlattened: z.boolean(),
    elapsedMs: z.number().nonnegative(),
  }),
});
export type CompressResponse = z.infer<typeof CompressResponseSchema>;

export const api = {
  health: (): Promise<HealthStatus> =>
    request('health', { method: 'GET' }, (raw) => HealthStatusSchema.parse(raw)),

  compressPdf: (
    file: File,
    level: CompressionLevel,
    options: MultipartOptions = {},
  ): Promise<CompressResponse> => {
    const form = new FormData();
    form.append('file', file, file.name);
    return requestMultipart<CompressResponse>(
      `pdf/compress?level=${encodeURIComponent(level)}`,
      form,
      (raw) => CompressResponseSchema.parse(raw),
      options,
    );
  },
};
