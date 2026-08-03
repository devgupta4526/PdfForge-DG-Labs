'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RouteError({ error, reset }: ErrorProps): JSX.Element {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[route-error]', error);
  }, [error]);

  return (
    <section className="container flex min-h-[60vh] flex-col items-center justify-center gap-6 py-20 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium text-destructive">Something went wrong</p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          We hit an unexpected error
        </h1>
        <p className="max-w-md text-muted-foreground">
          The page you were viewing failed to render. You can try again, or head back home.
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>
        ) : null}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <a href="/">Go home</a>
        </Button>
      </div>
    </section>
  );
}
