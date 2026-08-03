import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ToolCardProps {
  title: string;
  description: string;
  href: string;
  /** When false, the card renders disabled with a "Coming soon" badge. */
  available?: boolean;
  className?: string;
}

export function ToolCard({
  title,
  description,
  href,
  available = true,
  className,
}: ToolCardProps): JSX.Element {
  const cardInner = (
    <Card
      className={cn(
        'h-full transition-all',
        available
          ? 'group-hover:-translate-y-0.5 group-hover:shadow-md'
          : 'border-dashed bg-muted/40',
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            {title}
            {!available ? (
              <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Soon
              </span>
            ) : null}
          </span>
          {available ? (
            <ArrowRight
              className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );

  if (!available) {
    return (
      <div
        aria-disabled="true"
        title="Coming soon"
        className={cn('block rounded-xl', className)}
      >
        {cardInner}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        'group block rounded-xl outline-none ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
    >
      {cardInner}
    </Link>
  );
}
