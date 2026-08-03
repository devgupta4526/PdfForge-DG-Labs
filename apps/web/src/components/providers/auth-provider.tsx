'use client';

import * as React from 'react';
import { ClerkProvider } from '@clerk/nextjs';

interface AuthProviderProps {
  children: React.ReactNode;
}

const HAS_CLERK = Boolean(process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY']);

/**
 * Conditionally wraps the tree in `ClerkProvider`. When Clerk isn't
 * configured (no publishable key), we render children unwrapped — the rest
 * of the app already handles the "anonymous-only" code path.
 *
 * Lives in its own file (instead of inline in layout.tsx) so the bundle that
 * ships Clerk's React tree is only included when actually needed.
 */
export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  if (!HAS_CLERK) return <>{children}</>;

  return (
    <ClerkProvider
      // ClerkProvider picks up the publishable key from NEXT_PUBLIC_* envs by
      // default. We don't need to pass it explicitly.
      appearance={{
        layout: { socialButtonsVariant: 'blockButton', shimmer: true },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
