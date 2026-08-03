/**
 * GET /api/user/profile
 *
 * Returns the current Clerk user (resolved to our DB row), their tier, the
 * active plan, and today's usage. Consumed by the `useCurrentUser` SWR hook.
 *
 * Protected — the Next middleware already gates `/api/user/*`. We still
 * double-check `auth().userId` here so the handler is safe in isolation.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { getCurrentUser, getUsageToday } from '@/lib/auth';
import type { CurrentUserResponse } from '@pdf-forge/shared';

// Responses depend on the authed user — never cache.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(): Promise<NextResponse<CurrentUserResponse | { error: { code: string; message: string } }>> {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Not signed in.' } },
      { status: 401 },
    );
  }

  const snapshot = await getCurrentUser();
  const usage = await getUsageToday(snapshot.user?.id);

  const body: CurrentUserResponse = {
    user: snapshot.user,
    tier: snapshot.tier,
    plan: snapshot.plan,
    usageToday: {
      count: usage.count,
      limit: usage.limit,
      remaining: usage.remaining,
      bytesProcessed: usage.bytesProcessed,
    },
  };
  return NextResponse.json(body, {
    headers: {
      'cache-control': 'private, no-store, max-age=0',
    },
  });
}
