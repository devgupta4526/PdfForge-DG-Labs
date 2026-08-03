import { and, between, desc, eq, isNotNull, lt, sql } from 'drizzle-orm';
import { db as defaultDb, type Database } from '../client.js';
import { operations, type NewOperation, type Operation } from '../schema.js';

interface QueryOptions {
  db?: Database;
}

function client(opts?: QueryOptions): Database {
  return opts?.db ?? defaultDb;
}

export async function getOperationById(
  id: string,
  opts?: QueryOptions,
): Promise<Operation | null> {
  const rows = await client(opts).select().from(operations).where(eq(operations.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listOperationsForUser(
  userId: string,
  limit = 50,
  offset = 0,
  opts?: QueryOptions,
): Promise<Operation[]> {
  return client(opts)
    .select()
    .from(operations)
    .where(eq(operations.userId, userId))
    .orderBy(desc(operations.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function listOperationsByAnonymousId(
  anonymousId: string,
  limit = 50,
  opts?: QueryOptions,
): Promise<Operation[]> {
  return client(opts)
    .select()
    .from(operations)
    .where(eq(operations.anonymousId, anonymousId))
    .orderBy(desc(operations.createdAt))
    .limit(limit);
}

export async function listOperationsInRange(
  params: { from: Date; to: Date; userId?: string; toolSlug?: string },
  opts?: QueryOptions,
): Promise<Operation[]> {
  const conditions = [between(operations.createdAt, params.from, params.to)];
  if (params.userId) conditions.push(eq(operations.userId, params.userId));
  if (params.toolSlug) conditions.push(eq(operations.toolSlug, params.toolSlug));

  return client(opts)
    .select()
    .from(operations)
    .where(and(...conditions))
    .orderBy(desc(operations.createdAt));
}

export async function startOperation(
  values: Omit<NewOperation, 'status'> & { status?: Operation['status'] },
  opts?: QueryOptions,
): Promise<Operation> {
  const [row] = await client(opts)
    .insert(operations)
    .values({ ...values, status: values.status ?? 'started' })
    .returning();
  if (!row) throw new Error('startOperation: insert returned no rows');
  return row;
}

export async function markOperationProcessing(
  id: string,
  opts?: QueryOptions,
): Promise<Operation | null> {
  const [row] = await client(opts)
    .update(operations)
    .set({ status: 'processing' })
    .where(eq(operations.id, id))
    .returning();
  return row ?? null;
}

export async function completeOperation(
  id: string,
  patch: {
    outputSizeBytes: number;
    outputFileUrl: string;
    outputFileExpiresAt: Date;
    processingTimeMs: number;
  },
  opts?: QueryOptions,
): Promise<Operation | null> {
  const [row] = await client(opts)
    .update(operations)
    .set({ ...patch, status: 'completed' })
    .where(eq(operations.id, id))
    .returning();
  return row ?? null;
}

export async function failOperation(
  id: string,
  errorMessage: string,
  processingTimeMs?: number,
  opts?: QueryOptions,
): Promise<Operation | null> {
  const [row] = await client(opts)
    .update(operations)
    .set({
      status: 'failed',
      errorMessage,
      ...(processingTimeMs !== undefined ? { processingTimeMs } : {}),
    })
    .where(eq(operations.id, id))
    .returning();
  return row ?? null;
}

/** Cleanup helper — used by a cron to delete expired output files. */
export async function listExpiredOutputs(
  now: Date = new Date(),
  limit = 500,
  opts?: QueryOptions,
): Promise<Operation[]> {
  return client(opts)
    .select()
    .from(operations)
    .where(
      and(
        isNotNull(operations.outputFileExpiresAt),
        lt(operations.outputFileExpiresAt, now),
        isNotNull(operations.outputFileUrl),
      ),
    )
    .limit(limit);
}

export async function clearOperationOutput(
  id: string,
  opts?: QueryOptions,
): Promise<void> {
  await client(opts)
    .update(operations)
    .set({ outputFileUrl: null, outputFileExpiresAt: null })
    .where(eq(operations.id, id));
}

export async function countOperationsByStatus(
  status: Operation['status'],
  opts?: QueryOptions,
): Promise<number> {
  const [row] = await client(opts)
    .select({ count: sql<number>`count(*)::int` })
    .from(operations)
    .where(eq(operations.status, status));
  return row?.count ?? 0;
}
