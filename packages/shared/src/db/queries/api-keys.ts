import { and, desc, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { db as defaultDb, type Database } from '../client.js';
import { apiKeys, type ApiKey, type NewApiKey } from '../schema.js';

interface QueryOptions {
  db?: Database;
}

function client(opts?: QueryOptions): Database {
  return opts?.db ?? defaultDb;
}

export async function getApiKeyById(id: string, opts?: QueryOptions): Promise<ApiKey | null> {
  const rows = await client(opts).select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Look up by hashed key value. Returns only active, non-expired keys
 * so caller code can treat any returned row as authorisation-valid.
 */
export async function getActiveApiKeyByHash(
  keyHash: string,
  opts?: QueryOptions,
): Promise<ApiKey | null> {
  const now = new Date();
  const rows = await client(opts)
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyHash, keyHash),
        eq(apiKeys.isActive, true),
        or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now)),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listApiKeysForUser(
  userId: string,
  opts?: QueryOptions,
): Promise<ApiKey[]> {
  return client(opts)
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function createApiKey(values: NewApiKey, opts?: QueryOptions): Promise<ApiKey> {
  const [row] = await client(opts).insert(apiKeys).values(values).returning();
  if (!row) throw new Error('createApiKey: insert returned no rows');
  return row;
}

export async function recordApiKeyUsage(id: string, opts?: QueryOptions): Promise<void> {
  await client(opts)
    .update(apiKeys)
    .set({ lastUsedAt: sql`now()` })
    .where(eq(apiKeys.id, id));
}

export async function revokeApiKey(id: string, opts?: QueryOptions): Promise<ApiKey | null> {
  const [row] = await client(opts)
    .update(apiKeys)
    .set({ isActive: false })
    .where(eq(apiKeys.id, id))
    .returning();
  return row ?? null;
}

export async function deleteExpiredApiKeys(
  now: Date = new Date(),
  opts?: QueryOptions,
): Promise<number> {
  const rows = await client(opts)
    .delete(apiKeys)
    .where(and(eq(apiKeys.isActive, false), gt(sql`${now}`, apiKeys.expiresAt)))
    .returning({ id: apiKeys.id });
  return rows.length;
}
