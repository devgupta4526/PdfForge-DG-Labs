'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface ToolLayoutProps {
  /** Tool title — rendered as <h1>. */
  title: string;
  /** Short description rendered below the title. */
  description: string;
  /**
   * Optional eyebrow rendered above the title (e.g. "PDF tool").
   * Renders nothing when omitted.
   */
  eyebrow?: string;
  /**
   * Crumbs to render in the breadcrumb. Always prepends "Home → ".
   * The last entry is rendered as plain text (the current page).
   */
  breadcrumbs?: ReadonlyArray<{ href: string; label: string }>;
  /**
   * Slot rendered before the main body. Used for the upload area in most tools
   * — can be a Dropzone, a file picker, a preview banner, etc.
   */
  upload?: React.ReactNode;
  /**
   * Bottom action area, typically the primary "Do the thing" button + a status
   * line (e.g. "X pages selected"). Sticks to the bottom of the layout.
   */
  actions?: React.ReactNode;
  /**
   * Optional aside slot rendered to the right of the body (preview, page grid,
   * settings panel). Hidden on small viewports — content there should be
   * complementary, not essential.
   */
  aside?: React.ReactNode;
  /** Main interactive body of the tool. */
  children: React.ReactNode;
  className?: string;
}

/**
 * Consistent shell for the in-tool surface.
 *
 * Pages are responsible for SEO (`<head>`, JSON-LD, breadcrumb HTML in the
 * structured data layer) — `ToolLayout` handles only the visible chrome.
 * Keeps every tool feeling native to PDF Forge without being a hard router.
 */
export function ToolLayout({
  title,
  description,
  eyebrow,
  breadcrumbs,
  upload,
  actions,
  aside,
  children,
  className,
}: ToolLayoutProps): JSX.Element {
  return (
    <section className={cn('container py-10 md:py-14', className)}>
      <Breadcrumbs items={breadcrumbs} />

      <header className="mx-auto mb-8 max-w-3xl space-y-3 text-center">
        {eyebrow ? (
          <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        <p className="text-balance text-sm text-muted-foreground md:text-base">{description}</p>
      </header>

      <div
        className={cn(
          'grid gap-6',
          aside ? 'grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]' : 'grid-cols-1',
        )}
      >
        <div className="flex flex-col gap-6">
          {upload}
          {children}
          {actions ? <div className="flex flex-col gap-3">{actions}</div> : null}
        </div>
        {aside ? <div className="flex flex-col gap-6">{aside}</div> : null}
      </div>
    </section>
  );
}

function Breadcrumbs({
  items,
}: {
  items?: ReadonlyArray<{ href: string; label: string }>;
}): JSX.Element {
  const trail = items ?? [];
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
        </li>
        {trail.map((crumb, idx) => {
          const isLast = idx === trail.length - 1;
          return (
            <React.Fragment key={`${crumb.href}-${idx}`}>
              <ChevronRight aria-hidden className="h-3 w-3 opacity-60" />
              <li>
                {isLast ? (
                  <span className="text-foreground">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="hover:text-foreground">
                    {crumb.label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
