import { and, desc, eq, gt, lte, sql } from 'drizzle-orm';
import { db as defaultDb, type Database } from '../client.js';
import {
  subscriptions,
  type NewSubscription,
  type Subscription,
} from '../schema.js';

interface QueryOptions {
  db?: Database;
}

function client(opts?: QueryOptions): Database {
  return opts?.db ?? defaultDb;
}

export async function getSubscriptionById(
  id: string,
  opts?: QueryOptions,
): Promise<Subscription | null> {
  const rows = await client(opts)
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getActiveSubscriptionForUser(
  userId: string,
  opts?: QueryOptions,
): Promise<Subscription | null> {
  const rows = await client(opts)
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function listSubscriptionsByUser(
  userId: string,
  opts?: QueryOptions,
): Promise<Subscription[]> {
  return client(opts)
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt));
}

export async function getSubscriptionByRazorpayId(
  razorpaySubscriptionId: string,
  opts?: QueryOptions,
): Promise<Subscription | null> {
  const rows = await client(opts)
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.razorpaySubscriptionId, razorpaySubscriptionId))
    .limit(1);
  return rows[0] ?? null;
}

export async function createSubscription(
  values: NewSubscription,
  opts?: QueryOptions,
): Promise<Subscription> {
  const [row] = await client(opts).insert(subscriptions).values(values).returning();
  if (!row) throw new Error('createSubscription: insert returned no rows');
  return row;
}

export async function updateSubscription(
  id: string,
  patch: Partial<Omit<NewSubscription, 'id' | 'createdAt'>>,
  opts?: QueryOptions,
): Promise<Subscription | null> {
  const [row] = await client(opts)
    .update(subscriptions)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(subscriptions.id, id))
    .returning();
  return row ?? null;
}

export async function cancelSubscriptionAtPeriodEnd(
  id: string,
  opts?: QueryOptions,
): Promise<Subscription | null> {
  const [row] = await client(opts)
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
    .where(eq(subscriptions.id, id))
    .returning();
  return row ?? null;
}

/**
 * Subscriptions whose period has ended but haven't been transitioned yet.
 * Run from a cron to mark them `expired` (or trigger Razorpay reconciliation).
 */
export async function listSubscriptionsDueForExpiry(
  now: Date = new Date(),
  opts?: QueryOptions,
): Promise<Subscription[]> {
  return client(opts)
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.status, 'active'), lte(subscriptions.currentPeriodEnd, now)));
}

export async function listSubscriptionsRenewingBefore(
  before: Date,
  opts?: QueryOptions,
): Promise<Subscription[]> {
  return client(opts)
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, 'active'),
        eq(subscriptions.cancelAtPeriodEnd, false),
        gt(subscriptions.currentPeriodEnd, new Date()),
        lte(subscriptions.currentPeriodEnd, before),
      ),
    );
}

export async function countActiveSubscriptions(opts?: QueryOptions): Promise<number> {
  const [row] = await client(opts)
    .select({ count: sql<number>`count(*)::int` })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'active'));
  return row?.count ?? 0;
}
