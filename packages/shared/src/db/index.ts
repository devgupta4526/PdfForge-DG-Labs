/**
 * Public DB surface for the monorepo.
 *
 *   import { db, schema, users, getUserByClerkId } from '@pdf-forge/shared/db';
 *
 * The connection is lazy — importing this module never opens a socket.
 */

export {
  closeDb,
  createDbClient,
  db,
  getDirectDb,
  sql,
  type Database,
} from './client.js';
export * from './schema.js';
export * as queries from './queries/index.js';
export * from './queries/index.js';
