/* ─────────────────────────────────────────────────────────────────
 * Pure utilities shared between web + api. Must not import any
 * runtime-specific globals (e.g. `window`, `process`, `fs`).
 * ──────────────────────────────────────────────────────────────── */

/** Format a byte count as a human-readable string (e.g. `1.23 MB`). */
export function formatBytes(bytes: number, decimals = 2): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(decimals)} ${sizes[i]}`;
}

/** Clamp a number between min/max (inclusive). */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) throw new Error('clamp: min must be <= max');
  return Math.min(Math.max(value, min), max);
}

/** Sleep for the given number of milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Strip leading/trailing slashes — handy for joining URL segments. */
export function trimSlashes(input: string): string {
  return input.replace(/^\/+|\/+$/g, '');
}

/** Safely join a base URL with one or more path segments. */
export function joinUrl(base: string, ...segments: string[]): string {
  const cleanBase = base.replace(/\/+$/, '');
  const cleanSegments = segments
    .map((segment) => trimSlashes(segment))
    .filter((segment) => segment.length > 0);
  return cleanSegments.length === 0 ? cleanBase : `${cleanBase}/${cleanSegments.join('/')}`;
}

/** Type-narrowed `Object.keys`. */
export function typedKeys<T extends Record<string, unknown>>(obj: T): Array<keyof T> {
  return Object.keys(obj) as Array<keyof T>;
}

/** Returns true when the value is a non-null object (not array). */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
