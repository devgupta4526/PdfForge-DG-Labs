/**
 * Re-export the shared database surface so the API never reaches across
 * package boundaries with relative paths. Anything DB-related should be
 * imported from `@/lib/db` (or directly from `@pdf-forge/shared/db`).
 */
export {
  closeDb,
  createDbClient,
  db,
  getDirectDb,
  sql,
  type Database,
} from '@pdf-forge/shared/db';
export * from '@pdf-forge/shared/db/schema';
export * as queries from '@pdf-forge/shared/db/queries';

import { closeDb } from '@pdf-forge/shared/db';

/**
 * Backwards-compatible alias for the previous `shutdownDb()` export
 * used by `src/index.ts`.
 */
export async function shutdownDb(): Promise<void> {
  await closeDb();
}
