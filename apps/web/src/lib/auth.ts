import 'server-only';

import { auth, currentUser as clerkCurrentUser } from '@clerk/nextjs/server';
import {
  getActiveSubscriptionForUser,
  getUsageForAnonymousOnDate,
  getUsageForUserOnDate,
  getUserByClerkId,
  upsertUserByClerkId,
} from '@pdf-forge/shared/db';
import {
  DAILY_OPERATION_LIMITS,
  mapPlanToTier,
  type UserProfile,
  type UserTier,
} from '@pdf-forge/shared';

import type { User } from '@pdf-forge/shared/db/schema';

/**
 * Server-only auth helpers. These hit Clerk + the application DB and MUST NOT
 * be imported by any client component (the `'server-only'` directive will
 * fail the build if you do).
 *
 * All helpers degrade gracefully when:
 *   - Clerk is not configured       → behave as if every visitor is anonymous
 *   - DATABASE_URL is unreachable   → return safe defaults instead of throwing
 *
 * That keeps the zero-cost local dev path working — the Express side enforces
 * the actual quotas, and the dashboard refuses with a clear message when the
 * DB is down rather than crashing the whole request.
 */

const HAS_CLERK = Boolean(process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY']);
const HAS_DB = Boolean(process.env['DATABASE_URL']);

export interface CurrentUserSnapshot {
  /** The DB user row, or null if not authed / not yet provisioned. */
  user: UserProfile | null;
  /** Resolved tier (anonymous / free / premium / business). */
  tier: UserTier;
  /** Active subscription plan (DB enum), or null. */
  plan: 'free' | 'premium_monthly' | 'premium_yearly' | 'business' | null;
}

export interface UsageSnapshot {
  count: number;
  /** `null` means unlimited. */
  limit: number | null;
  /** `null` means unlimited. */
  remaining: number | null;
  bytesProcessed: number;
}

/* ─────────────────────────────────────────────────────────────────
 * getCurrentUser
 * ──────────────────────────────────────────────────────────────── */

export async function getCurrentUser(): Promise<CurrentUserSnapshot> {
  if (!HAS_CLERK) {
    return { user: null, tier: 'anonymous', plan: null };
  }

  const { userId } = auth();
  if (!userId) {
    return { user: null, tier: 'anonymous', plan: null };
  }

  if (!HAS_DB) {
    // Clerk is configured but no DB — surface a "free" tier (anything else
    // would silently downgrade premium users). The dashboard will show a
    // clear "Database not configured" banner.
    return { user: null, tier: 'free', plan: null };
  }

  let dbUser = await safeGetUserByClerkId(userId);

  // First-touch JIT provisioning: if the webhook race meant our DB row hasn't
  // been created yet, build it from Clerk's session data so the dashboard
  // doesn't show a half-broken state.
  if (!dbUser) {
    dbUser = await provisionUserFromClerk(userId);
  }

  const subscription = dbUser
    ? await safeGetActiveSubscription(dbUser.id)
    : null;
  const tier: UserTier = dbUser
    ? mapPlanToTier(subscription?.plan ?? null)
    : 'free';

  return {
    user: dbUser ? toProfile(dbUser) : null,
    tier,
    plan: subscription?.plan ?? null,
  };
}

/* ─────────────────────────────────────────────────────────────────
 * getUserTier — slim convenience for tier checks.
 * ──────────────────────────────────────────────────────────────── */

export async function getUserTier(): Promise<UserTier> {
  const snap = await getCurrentUser();
  return snap.tier;
}

/* ─────────────────────────────────────────────────────────────────
 * getUsageToday(userId?) — operations / limit / remaining for today.
 *
 * When `userId` is omitted, resolves the current Clerk user automatically.
 * Falls back to `anonymous` semantics when no identity is available.
 * ──────────────────────────────────────────────────────────────── */

export async function getUsageToday(userId?: string): Promise<UsageSnapshot> {
  // Resolve the identity + tier first so the limit is correct even when the
  // DB lookup fails.
  const tier: UserTier = userId
    ? await tierForDbUserId(userId)
    : await getUserTier();

  const limitRaw = DAILY_OPERATION_LIMITS[tier];
  const limit = Number.isFinite(limitRaw) ? limitRaw : null;

  if (!HAS_DB) {
    return {
      count: 0,
      limit,
      remaining: limit,
      bytesProcessed: 0,
    };
  }

  let count = 0;
  let bytesProcessed = 0;

  try {
    if (userId) {
      const row = await getUsageForUserOnDate(userId);
      count = row?.operationsCount ?? 0;
      bytesProcessed = Number(row?.bytesProcessed ?? 0);
    } else {
      // Anonymous: rely on a long-lived `anonymous_id` cookie if present,
      // otherwise return zeros (the Express rate limiter is the real source
      // of truth — this UI display is best-effort).
      const anonId = anonymousIdFromCookie();
      if (anonId) {
        const row = await getUsageForAnonymousOnDate(anonId);
        count = row?.operationsCount ?? 0;
        bytesProcessed = Number(row?.bytesProcessed ?? 0);
      }
    }
  } catch (err) {
    // Best-effort — don't crash the dashboard if the DB blips.
    console.warn('[auth.getUsageToday] usage lookup failed', err);
  }

  const remaining = limit == null ? null : Math.max(0, limit - count);
  return { count, limit, remaining, bytesProcessed };
}

/* ─────────────────────────────────────────────────────────────────
 * Internals
 * ──────────────────────────────────────────────────────────────── */

async function tierForDbUserId(userId: string): Promise<UserTier> {
  if (!HAS_DB) return 'free';
  try {
    const subscription = await getActiveSubscriptionForUser(userId);
    return mapPlanToTier(subscription?.plan ?? null);
  } catch (err) {
    console.warn('[auth.tierForDbUserId] subscription lookup failed', err);
    return 'free';
  }
}

async function safeGetUserByClerkId(clerkId: string): Promise<User | null> {
  try {
    return await getUserByClerkId(clerkId);
  } catch (err) {
    console.warn('[auth.safeGetUserByClerkId] lookup failed', err);
    return null;
  }
}

async function safeGetActiveSubscription(
  userId: string,
): Promise<Awaited<ReturnType<typeof getActiveSubscriptionForUser>>> {
  try {
    return await getActiveSubscriptionForUser(userId);
  } catch (err) {
    console.warn('[auth.safeGetActiveSubscription] lookup failed', err);
    return null;
  }
}

async function provisionUserFromClerk(clerkId: string): Promise<User | null> {
  try {
    const cu = await clerkCurrentUser();
    if (!cu) return null;
    const primaryEmail =
      cu.emailAddresses.find((e) => e.id === cu.primaryEmailAddressId)?.emailAddress ??
      cu.emailAddresses[0]?.emailAddress;
    if (!primaryEmail) return null;

    return await upsertUserByClerkId({
      clerkId,
      email: primaryEmail,
      name: [cu.firstName, cu.lastName].filter(Boolean).join(' ').trim() || null,
      avatarUrl: cu.imageUrl ?? null,
      country: null,
      phone: cu.primaryPhoneNumberId
        ? cu.phoneNumbers.find((p) => p.id === cu.primaryPhoneNumberId)?.phoneNumber ?? null
        : null,
      emailVerified: cu.emailAddresses.some(
        (e) => e.id === cu.primaryEmailAddressId && e.verification?.status === 'verified',
      ),
    });
  } catch (err) {
    console.warn('[auth.provisionUserFromClerk] upsert failed', err);
    return null;
  }
}

function anonymousIdFromCookie(): string | null {
  // Server Components & Route Handlers can read cookies via next/headers,
  // but importing it here would force this module into the dynamic-rendering
  // bucket for every importer. Callers that need anonymous lookups should
  // pass the id explicitly (the dashboard never does — anonymous users
  // can't reach /dashboard).
  return null;
}

function toProfile(u: User): UserProfile {
  return {
    id: u.id,
    clerkId: u.clerkId,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  };
}
