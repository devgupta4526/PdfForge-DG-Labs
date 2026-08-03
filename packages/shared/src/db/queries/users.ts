import { and, desc, eq, sql } from 'drizzle-orm';
import { db as defaultDb, type Database } from '../client.js';
import { users, type NewUser, type User } from '../schema.js';

interface QueryOptions {
  db?: Database;
}

function client(opts?: QueryOptions): Database {
  return opts?.db ?? defaultDb;
}

export async function getUserById(id: string, opts?: QueryOptions): Promise<User | null> {
  const rows = await client(opts).select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getUserByClerkId(
  clerkId: string,
  opts?: QueryOptions,
): Promise<User | null> {
  const rows = await client(opts).select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  return rows[0] ?? null;
}

export async function getUserByEmail(email: string, opts?: QueryOptions): Promise<User | null> {
  const rows = await client(opts)
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return rows[0] ?? null;
}

export async function listActiveUsers(
  limit = 50,
  offset = 0,
  opts?: QueryOptions,
): Promise<User[]> {
  return client(opts)
    .select()
    .from(users)
    .where(eq(users.isActive, true))
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function createUser(values: NewUser, opts?: QueryOptions): Promise<User> {
  const [row] = await client(opts)
    .insert(users)
    .values({ ...values, email: values.email.toLowerCase() })
    .returning();
  if (!row) throw new Error('createUser: insert returned no rows');
  return row;
}

/**
 * Idempotent insert keyed on `clerk_id`. Use this from Clerk webhook handlers
 * so retries don't blow up with unique-violation errors.
 */
export async function upsertUserByClerkId(values: NewUser, opts?: QueryOptions): Promise<User> {
  const normalized: NewUser = { ...values, email: values.email.toLowerCase() };
  const [row] = await client(opts)
    .insert(users)
    .values(normalized)
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email: normalized.email,
        name: normalized.name,
        avatarUrl: normalized.avatarUrl,
        country: normalized.country,
        phone: normalized.phone,
        emailVerified: normalized.emailVerified,
        updatedAt: sql`now()`,
      },
    })
    .returning();
  if (!row) throw new Error('upsertUserByClerkId: insert returned no rows');
  return row;
}

export async function updateUser(
  id: string,
  patch: Partial<Omit<NewUser, 'id' | 'createdAt'>>,
  opts?: QueryOptions,
): Promise<User | null> {
  const [row] = await client(opts)
    .update(users)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return row ?? null;
}

export async function recordUserLogin(id: string, opts?: QueryOptions): Promise<void> {
  await client(opts)
    .update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(and(eq(users.id, id), eq(users.isActive, true)));
}

export async function deactivateUser(id: string, opts?: QueryOptions): Promise<User | null> {
  const [row] = await client(opts)
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return row ?? null;
}

export async function countUsers(opts?: QueryOptions): Promise<number> {
  const [row] = await client(opts).select({ count: sql<number>`count(*)::int` }).from(users);
  return row?.count ?? 0;
}
