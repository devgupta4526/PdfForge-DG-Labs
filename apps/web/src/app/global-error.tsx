'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Top-level fallback for errors that escape every nested error boundary.
 * Must declare its own <html> and <body> since it replaces the root layout.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps): JSX.Element {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[global-error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          background: '#0a0a0a',
          color: '#fafafa',
          padding: '2rem',
        }}
      >
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <p style={{ color: '#f87171', fontSize: 14, fontWeight: 500, margin: 0 }}>
            Critical error
          </p>
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: '8px 0 12px' }}>
            The application has crashed
          </h1>
          <p style={{ color: '#a1a1aa', marginBottom: 24 }}>
            Something went wrong outside of any UI boundary. Please try reloading.
          </p>
          {error.digest ? (
            <p style={{ color: '#71717a', fontSize: 12, marginBottom: 24 }}>
              Error ID: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              background: '#fafafa',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Reload application
          </button>
        </div>
      </body>
    </html>
  );
}
