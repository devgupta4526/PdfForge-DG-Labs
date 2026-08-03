import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit configuration.
 *
 *   - Schema lives in `packages/shared/src/db/schema.ts`.
 *   - Migrations are written under `packages/shared/drizzle/`.
 *   - Migrations always go through the DIRECT connection (port 5432
 *     on Supabase), never the transaction pooler.
 *
 * Commands (run from repo root):
 *   npm run db:generate    # create SQL from schema diff
 *   npm run db:migrate     # apply pending migrations
 *   npm run db:push        # push schema directly (dev only — no SQL files)
 *   npm run db:studio      # browse the database in the Drizzle Studio
 */

const directUrl = process.env['DIRECT_URL']?.trim();
const fallbackUrl = process.env['DATABASE_URL']?.trim();
const url = directUrl && directUrl.length > 0 ? directUrl : fallbackUrl;

if (!url) {
  throw new Error(
    '[drizzle.config] Missing DATABASE_URL (and DIRECT_URL). Set one in your root .env file.',
  );
}

export default defineConfig({
  schema: './packages/shared/src/db/schema.ts',
  out: './packages/shared/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url,
  },
  strict: true,
  verbose: true,
});
