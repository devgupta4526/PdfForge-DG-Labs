# PDF Forge

A production-grade monorepo for a PDF tools web application. Built with Next.js 14
(App Router) on the frontend, Node.js + Express + Drizzle ORM on the backend, and a
shared TypeScript package for cross-cutting types and utilities.

## Stack

| Layer         | Tech                                                                    |
| ------------- | ----------------------------------------------------------------------- |
| Monorepo      | npm workspaces + Turborepo                                              |
| Frontend      | Next.js 14 (App Router), React 18, TypeScript (strict, no `any`)        |
| Styling / UI  | Tailwind CSS 3.4, shadcn/ui (New York style)                            |
| Backend       | Node.js 20, Express 4, TypeScript                                       |
| Validation    | Zod                                                                     |
| ORM           | Drizzle ORM + postgres.js (Supabase Postgres 15)                        |
| Logging       | Winston (pino-friendly transports configurable)                         |
| Tooling       | ESLint, Prettier, Husky, lint-staged                                    |

## Repository layout

```
pdf-forge/
├── apps/
│   ├── web/          Next.js 14 frontend (App Router)
│   └── api/          Express + TypeScript backend
├── packages/
│   └── shared/       Shared types & utilities (consumed by web + api)
├── turbo.json
├── package.json      npm workspaces root
├── tsconfig.base.json
└── .env.example
```

## Prerequisites

- Node.js **>= 20**
- npm **>= 10**
- (optional) Postgres 14+ if you want to wire up Drizzle to a real database

## Getting started

```bash
# 1. Install dependencies for every workspace
npm install

# 2. Copy environment defaults
cp .env.example .env
cp .env.example apps/web/.env.local
cp .env.example apps/api/.env

# 3. Run everything in parallel (web on :3000, api on :4000)
npm run dev
```

Individual apps:

```bash
npm run dev --workspace=apps/web
npm run dev --workspace=apps/api
```

## Scripts (root)

| Command              | Description                                  |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Start all apps in parallel via Turbo         |
| `npm run build`      | Production build for every workspace         |
| `npm run lint`       | ESLint across all workspaces                 |
| `npm run typecheck`  | `tsc --noEmit` across all workspaces         |
| `npm run format`     | Prettier write                               |
| `npm run clean`      | Remove `node_modules`, `.turbo`, build dirs  |

## Path aliases (apps/web)

- `@/*` → `apps/web/src/*`
- `@shared/*` → `packages/shared/src/*`

## API

- Default base URL: `http://localhost:4000`
- Health check: `GET /api/health` → `200 { status: "ok", uptime, timestamp }`

## Environment variables

See [`.env.example`](./.env.example) for the complete, documented list. Every variable
is consumed via `apps/api/src/lib/env.ts` (Zod-validated) or
`apps/web` (`NEXT_PUBLIC_*`).

## Database

Schema and queries live in `packages/shared/src/db/` and are exposed via the
subpath export `@pdf-forge/shared/db`. The same code is used by the API at
runtime, by the seed script, and by `drizzle-kit` for migrations.

```
packages/shared/src/db/
├── schema.ts            7 tables, 5 enums, full relations(), inferred types
├── client.ts            postgres.js + Drizzle (lazy singleton + getDirectDb)
├── index.ts             public surface
└── queries/             typed helpers per table
    ├── users.ts
    ├── subscriptions.ts
    ├── operations.ts
    ├── payments.ts
    ├── usage-tracking.ts
    ├── api-keys.ts
    └── blog-posts.ts
```

### Connection model

| Variable      | Purpose                                              | Notes                                |
| ------------- | ---------------------------------------------------- | ------------------------------------ |
| `DATABASE_URL` | Runtime queries (Supabase Transaction pooler)       | Pooled, `prepare: false`             |
| `DIRECT_URL`   | Migrations + seed (Supabase direct connection)      | Optional — falls back to DATABASE_URL |

The runtime `db` export is a lazy `Proxy` — importing it never opens a socket,
so build steps and tests are unaffected.

### Migrations & seed

```bash
npm run db:generate     # diff schema → packages/shared/drizzle/*.sql
npm run db:migrate      # apply pending migrations (DIRECT_URL)
npm run db:push         # dev-only: push schema without migration files
npm run db:studio       # open Drizzle Studio
npm run db:seed         # populate dev data (idempotent — truncates first)
```

The initial migration `packages/shared/drizzle/0000_*.sql` is checked in.
Re-run `db:generate` after changing `schema.ts` to add follow-up migrations.

### Usage example

```ts
import { db, users, getUserByClerkId, upsertUserByClerkId } from '@pdf-forge/shared/db';

const existing = await getUserByClerkId('user_2abc');
const user = await upsertUserByClerkId({
  clerkId: 'user_2abc',
  email: 'a@b.com',
  emailVerified: true,
});

const all = await db.select().from(users);
```

## Notes

- shadcn/ui ships with a starter `Button` and `Card` so you can validate the
  Tailwind + components.json setup immediately. Add more with `npx shadcn@latest add <component>`.
