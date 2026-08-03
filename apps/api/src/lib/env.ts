import 'dotenv/config';
import { z } from 'zod';

/**
 * Centralized, Zod-validated environment loader.
 *
 * Two backends are configurable independently:
 *
 *   STORAGE_DRIVER = 'local' | 'r2'
 *     - local: writes files to LOCAL_STORAGE_DIR; "presigned" URLs point at our
 *              own /api/storage endpoints (HMAC-signed). Zero external services.
 *     - r2:    Cloudflare R2 (S3-compatible). Requires R2_* credentials.
 *
 *   JOB_RUNNER = 'memory' | 'bullmq'
 *     - memory: setTimeout-based scheduler in-process. Zero external services.
 *               Jobs are lost on restart — fine for dev, never for prod.
 *     - bullmq: BullMQ + Redis (Upstash TCP). Requires REDIS_URL.
 *
 * Defaults pick the zero-cost path in development and force the production
 * path when NODE_ENV=production. We refuse to boot in production with any
 * of the dev-only modes (or with the dev-only LOCAL_STORAGE_SECRET sentinel).
 */

export const DEV_LOCAL_STORAGE_SECRET = 'dev-only-insecure-secret-do-not-use-in-production';

const isProduction = (process.env['NODE_ENV'] ?? 'development') === 'production';

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    PORT: z.coerce.number().int().positive().default(4000),
    HOST: z.string().min(1).default('0.0.0.0'),

    LOG_LEVEL: z
      .enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
      .default('info'),

    CORS_ORIGINS: z
      .string()
      .default('http://localhost:3000')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter((origin) => origin.length > 0),
      ),

    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

    DATABASE_URL: z
      .string()
      .url()
      .default('postgres://postgres:postgres@localhost:5432/pdf_forge'),

    MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(50),
    UPLOAD_DIR: z.string().min(1).default('./uploads'),

    /* ─── Storage backend selection ──────────────────────────────── */
    STORAGE_DRIVER: z.enum(['local', 'r2']).default(isProduction ? 'r2' : 'local'),

    /* ─── Local filesystem driver ────────────────────────────────── */
    LOCAL_STORAGE_DIR: z.string().min(1).default('./storage'),
    LOCAL_STORAGE_SECRET: z.string().min(16).default(DEV_LOCAL_STORAGE_SECRET),
    /** Public base URL of the API itself, used to build local presigned URLs. */
    LOCAL_STORAGE_PUBLIC_URL: z.string().url().default('http://localhost:4000'),

    /* ─── Cloudflare R2 (only required when STORAGE_DRIVER=r2) ───── */
    R2_ACCOUNT_ID: z.string().min(1).optional(),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    R2_BUCKET: z.string().min(1).optional(),
    R2_PUBLIC_URL: z.string().url().optional(),
    R2_PRESIGN_TTL_SEC: z.coerce.number().int().positive().max(7 * 24 * 3600).default(3600),

    /* ─── Job runner selection ───────────────────────────────────── */
    JOB_RUNNER: z.enum(['memory', 'bullmq']).default(isProduction ? 'bullmq' : 'memory'),

    /* ─── Redis (only required when JOB_RUNNER=bullmq OR RATE_LIMIT_BACKEND=redis) ── */
    REDIS_URL: z.string().min(1).optional(),
    WORKER_CONCURRENCY: z.coerce.number().int().positive().max(64).default(4),
    TEMP_FILE_TTL_MS: z.coerce.number().int().positive().default(60 * 60 * 1000),

    /* ─── Tier-aware rate limiter ────────────────────────────────── */
    RATE_LIMIT_BACKEND: z
      .enum(['memory', 'redis'])
      .default(isProduction ? 'redis' : 'memory'),
    /** Sliding window for the per-tier daily quota. */
    RATE_LIMIT_TIER_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(24 * 60 * 60 * 1000),

    /* ─── Clerk (auth) ───────────────────────────────────────────── */
    /**
     * Set to enable Clerk JWT verification on the Express API. When unset, the
     * API treats every request as anonymous (still safe — anonymous tier has
     * the strictest quota). REQUIRED in production.
     */
    CLERK_SECRET_KEY: z.string().min(1).optional(),
    /**
     * Webhook secret from the Clerk Dashboard → Webhooks. Used to verify the
     * Svix signature on POST /api/webhooks/clerk. REQUIRED in production.
     */
    CLERK_WEBHOOK_SECRET: z.string().min(1).optional(),
    /**
     * Optional: pin the JWT issuer (`https://<your-app>.clerk.accounts.dev`)
     * so revoked or misissued tokens fail closed. Falls back to whatever the
     * SDK derives from CLERK_SECRET_KEY when omitted.
     */
    CLERK_JWT_ISSUER: z.string().url().optional(),

    /** Where to send users to upgrade when they hit a tier quota. */
    UPGRADE_URL: z.string().min(1).default('/dashboard/billing'),
  })
  .superRefine((env, ctx) => {
    if (env.STORAGE_DRIVER === 'r2') {
      const required = [
        'R2_ACCOUNT_ID',
        'R2_ACCESS_KEY_ID',
        'R2_SECRET_ACCESS_KEY',
        'R2_BUCKET',
      ] as const;
      for (const key of required) {
        if (!env[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when STORAGE_DRIVER=r2`,
          });
        }
      }
    }

    if (env.JOB_RUNNER === 'bullmq' && !env.REDIS_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['REDIS_URL'],
        message: 'REDIS_URL is required when JOB_RUNNER=bullmq',
      });
    }

    if (env.RATE_LIMIT_BACKEND === 'redis' && !env.REDIS_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['REDIS_URL'],
        message: 'REDIS_URL is required when RATE_LIMIT_BACKEND=redis',
      });
    }

    if (env.NODE_ENV === 'production') {
      if (env.STORAGE_DRIVER !== 'r2') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['STORAGE_DRIVER'],
          message:
            'Refusing to use STORAGE_DRIVER=local in production. Set STORAGE_DRIVER=r2.',
        });
      }
      if (env.JOB_RUNNER !== 'bullmq') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JOB_RUNNER'],
          message:
            'Refusing to use JOB_RUNNER=memory in production. Set JOB_RUNNER=bullmq.',
        });
      }
      if (env.RATE_LIMIT_BACKEND !== 'redis') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['RATE_LIMIT_BACKEND'],
          message:
            'Refusing to use RATE_LIMIT_BACKEND=memory in production. Set RATE_LIMIT_BACKEND=redis.',
        });
      }
      if (env.LOCAL_STORAGE_SECRET === DEV_LOCAL_STORAGE_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['LOCAL_STORAGE_SECRET'],
          message:
            'LOCAL_STORAGE_SECRET must be changed from the default before running in production.',
        });
      }
      if (!env.CLERK_SECRET_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CLERK_SECRET_KEY'],
          message: 'CLERK_SECRET_KEY is required in production.',
        });
      }
      if (!env.CLERK_WEBHOOK_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CLERK_WEBHOOK_SECRET'],
          message: 'CLERK_WEBHOOK_SECRET is required in production.',
        });
      }
    }
  });

export type Env = z.infer<typeof EnvSchema>;

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // We can't use the logger here because it depends on the env.
  // eslint-disable-next-line no-console
  console.error(
    '✖ Invalid environment configuration:\n',
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
  process.exit(1);
}

export const env: Env = parsed.data;
