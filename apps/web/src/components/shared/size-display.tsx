import * as React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

import { formatBytes } from '@pdf-forge/shared';
import { cn } from '@/lib/utils';

export interface SizeDisplayProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in bytes. */
  bytes: number;
  /** When > 0, render with two decimals (useful for sizes < 100 MB). */
  decimals?: number;
  /** Override the formatted text (rarely needed). */
  override?: string;
}

/**
 * Inline file-size badge. Pure formatting — no semantics about colour or trend.
 * Use {@link SizeComparison} when you want to show "12 MB → 4 MB (-67%)".
 */
export function SizeDisplay({
  bytes,
  decimals = 1,
  override,
  className,
  ...rest
}: SizeDisplayProps): JSX.Element {
  const text =
    override ??
    (Number.isFinite(bytes) && bytes >= 0 ? formatBytes(bytes, decimals) : '—');
  return (
    <span
      className={cn('inline-flex items-baseline font-medium tabular-nums', className)}
      {...rest}
    >
      {text}
    </span>
  );
}

export interface SizeComparisonProps {
  /** Original / source size in bytes. */
  originalBytes: number;
  /** Resulting / target size in bytes. */
  resultBytes: number;
  /** Caption above the row. */
  label?: string;
  /** When `false`, the trend arrow + percent badge are hidden. */
  showTrend?: boolean;
  className?: string;
}

/**
 * Two-column "before → after" comparison with a trend arrow + percent badge.
 *
 * Renders gracefully when sizes are equal (no badge) or when result > original
 * (red badge with up-arrow, "increased by N%").
 */
export function SizeComparison({
  originalBytes,
  resultBytes,
  label,
  showTrend = true,
  className,
}: SizeComparisonProps): JSX.Element {
  const safeOriginal = Math.max(0, originalBytes);
  const safeResult = Math.max(0, resultBytes);
  const delta = safeOriginal === 0 ? 0 : ((safeResult - safeOriginal) / safeOriginal) * 100;
  const isReduction = delta < 0;
  const isIncrease = delta > 0;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label ? (
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <SizeDisplay bytes={safeOriginal} className="text-muted-foreground line-through" />
        <span aria-hidden className="text-muted-foreground">
          →
        </span>
        <SizeDisplay bytes={safeResult} className="text-foreground" />
        {showTrend && safeOriginal > 0 ? (
          <TrendBadge isReduction={isReduction} isIncrease={isIncrease} delta={delta} />
        ) : null}
      </div>
    </div>
  );
}

function TrendBadge({
  isReduction,
  isIncrease,
  delta,
}: {
  isReduction: boolean;
  isIncrease: boolean;
  delta: number;
}): JSX.Element | null {
  if (!isReduction && !isIncrease) {
    return (
      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        no change
      </span>
    );
  }
  const Icon = isReduction ? ArrowDown : ArrowUp;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        isReduction
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          : 'bg-destructive/10 text-destructive',
      )}
    >
      <Icon aria-hidden className="h-3 w-3" />
      {Math.abs(delta).toFixed(1)}%
    </span>
  );
}
