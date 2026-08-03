/**
 * Postgres + Drizzle client.
 *
 * Two clients are exposed:
 *
 *   - `db`  — runtime Drizzle client. Uses `DATABASE_URL` (Supabase Transaction
 *             pooler in production). Pooled, with `prepare: false` for compatibility
 *             with PgBouncer transaction mode.
 *
 *   - `getDirectDb()` — on-demand direct client built from `DIRECT_URL` (or
 *             `DATABASE_URL` as fallback). Used by drizzle-kit, the seed script,
 *             and any LISTEN/NOTIFY or long-lived workloads.
 *
 * Both wrap the same Drizzle schema, so query types are identical.
 */

import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import { schema, type Schema } from './schema.js';

export type Database = PostgresJsDatabase<Schema>;

interface ClientConfig {
  connectionString: string;
  poolMax?: number;
  idleTimeoutSec?: number;
  connectTimeoutSec?: number;
  /** Defaults to false — required for Supabase Transaction pooler / PgBouncer. */
  prepare?: boolean;
}

function readNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(
      `[db] Missing required environment variable: ${name}. Set it in your .env file.`,
    );
  }
  return value;
}

/**
 * Build a postgres.js client + Drizzle wrapper. Exposed for advanced use
 * (multi-tenant connections, tests with throwaway DBs, etc.). Most code
 * should import `db` instead.
 */
export function createDbClient(config: ClientConfig): { sql: Sql; db: Database } {
  const sql = postgres(config.connectionString, {
    max: config.poolMax ?? 10,
    idle_timeout: config.idleTimeoutSec ?? 20,
    connect_timeout: config.connectTimeoutSec ?? 10,
    prepare: config.prepare ?? false,
    onnotice: () => {
      /* swallow Postgres NOTICE messages (e.g. "relation already exists") */
    },
  });
  const db = drizzle(sql, { schema, logger: process.env['NODE_ENV'] !== 'production' });
  return { sql, db };
}

/* ─────────────────────────────────────────────────────────────────
 * Default singleton — pooled runtime client.
 * Lazily constructed so that just importing this module never opens
 * a connection (important for tests, build steps, edge runtimes).
 * ──────────────────────────────────────────────────────────────── */

let cached: { sql: Sql; db: Database } | undefined;

function getRuntime(): { sql: Sql; db: Database } {
  if (!cached) {
    cached = createDbClient({
      connectionString: requireEnv('DATABASE_URL'),
      poolMax: readNumberEnv('DB_POOL_MAX', 10),
      idleTimeoutSec: readNumberEnv('DB_IDLE_TIMEOUT', 20),
      connectTimeoutSec: readNumberEnv('DB_CONNECT_TIMEOUT', 10),
      prepare: false,
    });
  }
  return cached;
}

/**
 * Proxy that defers client construction until the first property access.
 * Lets consumers `import { db }` without triggering an env read at import time.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    const real = getRuntime().db as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(real, prop, receiver);
    return typeof value === 'function' ? value.bind(real) : value;
  },
}) as Database;

export const sql: Sql = new Proxy({} as Sql, {
  get(_target, prop, receiver) {
    const real = getRuntime().sql as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(real, prop, receiver);
    return typeof value === 'function' ? value.bind(real) : value;
  },
}) as Sql;

/**
 * Close the singleton pool. Call from process shutdown handlers.
 */
export async function closeDb(): Promise<void> {
  if (!cached) return;
  await cached.sql.end({ timeout: 5 });
  cached = undefined;
}

/**
 * Build a one-off direct (non-pooled) client. Prefer this for migrations,
 * seeding, and admin scripts that need session-scoped features.
 *
 * Caller MUST `await client.sql.end()` when finished.
 */
export function getDirectDb(): { sql: Sql; db: Database } {
  const connectionString = process.env['DIRECT_URL']?.trim() || requireEnv('DATABASE_URL');
  return createDbClient({
    connectionString,
    poolMax: 1,
    idleTimeoutSec: 5,
    connectTimeoutSec: 15,
    prepare: true,
  });
}
