import { and, between, desc, eq, sql } from 'drizzle-orm';
import { db as defaultDb, type Database } from '../client.js';
import { usageTracking, type NewUsageTracking, type UsageTracking } from '../schema.js';

interface QueryOptions {
  db?: Database;
}

function client(opts?: QueryOptions): Database {
  return opts?.db ?? defaultDb;
}

/** ISO date helper (YYYY-MM-DD) — DB column is `date`, not `timestamptz`. */
function toIsoDate(d: Date | string = new Date()): string {
  if (typeof d === 'string') return d;
  const iso = d.toISOString();
  return iso.slice(0, 10);
}

/**
 * Atomically upsert today's row for a user OR an anonymous visitor and
 * increment the counters. Exactly one of `userId` / `anonymousId` must be set.
 */
export async function incrementUsage(
  params: {
    userId?: string;
    anonymousId?: string;
    date?: Date | string;
    operationsCount?: number;
    bytesProcessed?: number;
  },
  opts?: QueryOptions,
): Promise<UsageTracking> {
  if (Boolean(params.userId) === Boolean(params.anonymousId)) {
    throw new Error(
      'incrementUsage: exactly one of `userId` or `anonymousId` must be provided',
    );
  }

  const date = toIsoDate(params.date);
  const opsDelta = params.operationsCount ?? 1;
  const bytesDelta = params.bytesProcessed ?? 0;

  const insertValues: NewUsageTracking = {
    userId: params.userId ?? null,
    anonymousId: params.anonymousId ?? null,
    date,
    operationsCount: opsDelta,
    bytesProcessed: bytesDelta,
  };

  const target = params.userId
    ? [usageTracking.userId, usageTracking.date]
    : [usageTracking.anonymousId, usageTracking.date];

  const [row] = await client(opts)
    .insert(usageTracking)
    .values(insertValues)
    .onConflictDoUpdate({
      target,
      set: {
        operationsCount: sql`${usageTracking.operationsCount} + ${opsDelta}`,
        bytesProcessed: sql`${usageTracking.bytesProcessed} + ${bytesDelta}`,
      },
    })
    .returning();
  if (!row) throw new Error('incrementUsage: insert returned no rows');
  return row;
}

export async function getUsageForUserOnDate(
  userId: string,
  date: Date | string = new Date(),
  opts?: QueryOptions,
): Promise<UsageTracking | null> {
  const rows = await client(opts)
    .select()
    .from(usageTracking)
    .where(and(eq(usageTracking.userId, userId), eq(usageTracking.date, toIsoDate(date))))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUsageForAnonymousOnDate(
  anonymousId: string,
  date: Date | string = new Date(),
  opts?: QueryOptions,
): Promise<UsageTracking | null> {
  const rows = await client(opts)
    .select()
    .from(usageTracking)
    .where(
      and(eq(usageTracking.anonymousId, anonymousId), eq(usageTracking.date, toIsoDate(date))),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listUsageForUserInRange(
  userId: string,
  range: { from: Date | string; to: Date | string },
  opts?: QueryOptions,
): Promise<UsageTracking[]> {
  return client(opts)
    .select()
    .from(usageTracking)
    .where(
      and(
        eq(usageTracking.userId, userId),
        between(usageTracking.date, toIsoDate(range.from), toIsoDate(range.to)),
      ),
    )
    .orderBy(desc(usageTracking.date));
}

export async function sumUserUsageInRange(
  userId: string,
  range: { from: Date | string; to: Date | string },
  opts?: QueryOptions,
): Promise<{ operations: number; bytes: number }> {
  const [row] = await client(opts)
    .select({
      operations: sql<number>`coalesce(sum(${usageTracking.operationsCount}), 0)::int`,
      bytes: sql<number>`coalesce(sum(${usageTracking.bytesProcessed}), 0)::bigint`,
    })
    .from(usageTracking)
    .where(
      and(
        eq(usageTracking.userId, userId),
        between(usageTracking.date, toIsoDate(range.from), toIsoDate(range.to)),
      ),
    );
  return { operations: row?.operations ?? 0, bytes: Number(row?.bytes ?? 0) };
}

/**
 * "Month-to-date" sum convenience for the dashboard tile. Range is computed
 * server-side from the JS clock — callers should pass a date for tests so the
 * answer is deterministic.
 */
export async function sumUserUsageThisMonth(
  userId: string,
  now: Date = new Date(),
  opts?: QueryOptions,
): Promise<{ operations: number; bytes: number }> {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );
  return sumUserUsageInRange(userId, { from: start, to: end }, opts);
}
