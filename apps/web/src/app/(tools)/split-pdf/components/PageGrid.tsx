'use client';

import * as React from 'react';
import { CheckSquare, FileText, Square } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export interface PageInfo {
  pageNum: number;
  /** `null` while the thumbnail has not been generated yet. */
  thumbnail: string | null;
  selected: boolean;
}

export interface PageGridProps {
  pages: readonly PageInfo[];
  /** Toggle a single page's selection. */
  onTogglePage(pageNum: number, selected: boolean): void;
  onSelectAll(): void;
  onDeselectAll(): void;
  /**
   * Asks the parent to render the thumbnail for `pageNum`. Called
   * lazily when the cell scrolls into view. The parent should update
   * `pages[i].thumbnail` once the promise resolves.
   *
   * Returning `null` (or throwing) leaves the cell in its skeleton state.
   */
  onRequestThumbnail(pageNum: number, signal: AbortSignal): Promise<void>;
  /** Heading shown above the grid. */
  title?: string;
  /** Disable all interactions (e.g. while splitting). */
  disabled?: boolean;
  className?: string;
}

const ROOT_MARGIN = '300px 0px';

export function PageGrid({
  pages,
  onTogglePage,
  onSelectAll,
  onDeselectAll,
  onRequestThumbnail,
  title = 'Pages',
  disabled = false,
  className,
}: PageGridProps): JSX.Element {
  const selectedCount = React.useMemo(
    () => pages.reduce((acc, p) => (p.selected ? acc + 1 : acc), 0),
    [pages],
  );
  const allSelected = pages.length > 0 && selectedCount === pages.length;
  const noneSelected = selectedCount === 0;

  return (
    <section
      className={cn('flex flex-col gap-4', className)}
      aria-label="Page selection"
      data-disabled={disabled || undefined}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          <p className="text-xs text-muted-foreground">
            {pages.length === 0
              ? 'Upload a PDF to see its pages here.'
              : `${selectedCount} of ${pages.length} selected`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onSelectAll}
            disabled={disabled || allSelected || pages.length === 0}
          >
            <CheckSquare aria-hidden className="mr-1.5" />
            Select all
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onDeselectAll}
            disabled={disabled || noneSelected}
          >
            <Square aria-hidden className="mr-1.5" />
            Clear
          </Button>
        </div>
      </header>

      <Separator />

      {pages.length === 0 ? (
        <EmptyState />
      ) : (
        <ul
          role="listbox"
          aria-multiselectable="true"
          aria-label="PDF pages"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4"
        >
          {pages.map((page) => (
            <PageCell
              key={page.pageNum}
              page={page}
              disabled={disabled}
              onToggle={onTogglePage}
              onRequestThumbnail={onRequestThumbnail}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Cell
 * ──────────────────────────────────────────────────────────────── */

interface PageCellProps {
  page: PageInfo;
  disabled: boolean;
  onToggle(pageNum: number, selected: boolean): void;
  onRequestThumbnail(pageNum: number, signal: AbortSignal): Promise<void>;
}

const PageCell = React.memo(function PageCell({
  page,
  disabled,
  onToggle,
  onRequestThumbnail,
}: PageCellProps): JSX.Element {
  const ref = React.useRef<HTMLLIElement | null>(null);
  const requestedRef = React.useRef(false);
  // We keep the latest renderer on a ref so the IntersectionObserver effect
  // doesn't tear down/reinitialize each time the parent re-creates the function.
  const requestRef = React.useRef(onRequestThumbnail);
  React.useEffect(() => {
    requestRef.current = onRequestThumbnail;
  }, [onRequestThumbnail]);

  const hasThumb = page.thumbnail !== null;

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
            void requestRef
              .current(page.pageNum, controller.signal)
              .catch(() => {
                // Allow a retry on the next intersection if it failed.
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
  }, [hasThumb, page.pageNum]);

  const handleClick = React.useCallback(() => {
    if (disabled) return;
    onToggle(page.pageNum, !page.selected);
  }, [disabled, onToggle, page.pageNum, page.selected]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLLIElement>) => {
      if (disabled) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onToggle(page.pageNum, !page.selected);
      }
    },
    [disabled, onToggle, page.pageNum, page.selected],
  );

  return (
    <li
      ref={ref}
      role="option"
      aria-selected={page.selected}
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border bg-card p-2 text-xs transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        page.selected
          ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background'
          : 'border-border hover:border-foreground/40 hover:shadow-sm',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <div className="absolute right-2 top-2 z-10">
        <Checkbox
          checked={page.selected}
          aria-label={`Page ${page.pageNum}`}
          tabIndex={-1}
          onClick={(e) => {
            // Prevent the parent <li> click handler from running twice.
            e.stopPropagation();
          }}
          onCheckedChange={(checked) => onToggle(page.pageNum, checked === true)}
          disabled={disabled}
        />
      </div>

      <div
        className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-md border bg-muted"
        aria-busy={!hasThumb}
      >
        {page.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element -- data: URLs cannot use next/image
          <img
            src={page.thumbnail}
            alt={`Page ${page.pageNum}`}
            className="h-full w-full object-contain"
            draggable={false}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <FileText aria-hidden className="h-6 w-6 animate-pulse opacity-60" />
            <span className="sr-only">Loading thumbnail for page {page.pageNum}</span>
          </div>
        )}
      </div>

      <span className="text-[11px] font-medium text-muted-foreground">Page {page.pageNum}</span>
    </li>
  );
});

/* ─────────────────────────────────────────────────────────────────
 * Empty state
 * ──────────────────────────────────────────────────────────────── */

function EmptyState(): JSX.Element {
  return (
    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed bg-muted/40 text-sm text-muted-foreground">
      No pages to display yet.
    </div>
  );
}
