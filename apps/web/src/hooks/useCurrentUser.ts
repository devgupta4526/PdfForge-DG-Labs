'use client';

import * as React from 'react';
import useSWR, { type SWRConfiguration } from 'swr';
import { useUser } from '@clerk/nextjs';

import {
  CurrentUserResponseSchema,
  type CurrentUserResponse,
  type UsageSummary,
  type UserProfile,
  type UserTier,
} from '@pdf-forge/shared';

const PROFILE_KEY = '/api/user/profile';

export interface UseCurrentUserResult {
  /** Fully-hydrated DB user row, or null when anonymous / unprovisioned. */
  user: UserProfile | null;
  /** Resolved tier (anonymous / free / premium / business). */
  tier: UserTier;
  /** Today's operations count + limit + remaining. */
  usageToday: UsageSummary;
  /** True while either Clerk OR the SWR fetch is loading for the first time. */
  isLoading: boolean;
  /** True for background revalidations (focus, manual refresh, etc.). */
  isValidating: boolean;
  /** True when the user is signed in via Clerk. */
  isSignedIn: boolean;
  /** Latest fetch error (network / parse / 5xx), or null. */
  error: Error | null;
  /** Manually re-fetch the profile (returns the latest payload). */
  refresh: () => Promise<CurrentUserResponse | undefined>;
}

const ANONYMOUS_USAGE: UsageSummary = {
  count: 0,
  limit: 3,
  remaining: 3,
  bytesProcessed: 0,
};

const SWR_OPTIONS: SWRConfiguration<CurrentUserResponse, Error> = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  // Re-validate every 60s while the tab is open, so newly-completed operations
  // tick the usage counter down without a manual refresh.
  refreshInterval: 60_000,
  dedupingInterval: 5_000,
  shouldRetryOnError: (err) => !isAuthError(err),
  errorRetryCount: 3,
};

export function useCurrentUser(): UseCurrentUserResult {
  const clerk = useUser();

  const swr = useSWR<CurrentUserResponse, Error>(
    clerk.isSignedIn ? PROFILE_KEY : null,
    fetchProfile,
    SWR_OPTIONS,
  );

  const refresh = React.useCallback(() => swr.mutate(), [swr]);

  if (!clerk.isLoaded) {
    return {
      user: null,
      tier: 'anonymous',
      usageToday: ANONYMOUS_USAGE,
      isLoading: true,
      isValidating: false,
      isSignedIn: false,
      error: null,
      refresh,
    };
  }

  if (!clerk.isSignedIn) {
    return {
      user: null,
      tier: 'anonymous',
      usageToday: ANONYMOUS_USAGE,
      isLoading: false,
      isValidating: false,
      isSignedIn: false,
      error: null,
      refresh,
    };
  }

  const data = swr.data;
  const isLoading = !data && !swr.error;

  return {
    user: data?.user ?? null,
    tier: data?.tier ?? 'free',
    usageToday: data?.usageToday ?? defaultFreeUsage(),
    isLoading,
    isValidating: swr.isValidating,
    isSignedIn: true,
    error: swr.error ?? null,
    refresh,
  };
}

/* ─────────────────────────────────────────────────────────────────
 * Internals
 * ──────────────────────────────────────────────────────────────── */

async function fetchProfile(url: string): Promise<CurrentUserResponse> {
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new ApiError(res.status, await safeReadMessage(res));
  }

  const raw: unknown = await res.json();
  const parsed = CurrentUserResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Profile response failed validation: ${parsed.error.message}`);
  }
  return parsed.data;
}

class ApiError extends Error {
  public readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function isAuthError(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 403);
}

async function safeReadMessage(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (
      body &&
      typeof body === 'object' &&
      'error' in body &&
      typeof (body as Record<string, unknown>)['error'] === 'object'
    ) {
      const err = (body as { error: Record<string, unknown> }).error;
      if (typeof err['message'] === 'string') return err['message'];
    }
  } catch {
    /* fall through */
  }
  return res.statusText || `Request failed with ${res.status}`;
}

function defaultFreeUsage(): UsageSummary {
  return { count: 0, limit: 10, remaining: 10, bytesProcessed: 0 };
}
