import { z } from 'zod';

/* ─────────────────────────────────────────────────────────────────
 * API contracts shared between apps/web and apps/api.
 * Defined as Zod schemas so both runtime validation and static types
 * can be derived from a single source of truth.
 * ──────────────────────────────────────────────────────────────── */

export const HealthStatusSchema = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  uptime: z.number().nonnegative(),
  timestamp: z.string().datetime(),
  version: z.string(),
  environment: z.enum(['development', 'production', 'test']),
});
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
  requestId: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const PaginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(100),
  total: z.number().int().nonnegative(),
});
export type Pagination = z.infer<typeof PaginationSchema>;

export interface ApiSuccess<TData> {
  data: TData;
  pagination?: Pagination;
  requestId?: string;
}

/* ─────────────────────────────────────────────────────────────────
 * Domain — PDF tools.
 * ──────────────────────────────────────────────────────────────── */

export const PdfToolSchema = z.enum([
  'merge',
  'split',
  'compress',
  'rotate',
  'delete-pages',
  'extract-pages',
  'pdf-to-image',
  'image-to-pdf',
  'watermark',
  'protect',
  'unlock',
]);
export type PdfTool = z.infer<typeof PdfToolSchema>;

export const FileMetadataSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  size: z.number().int().nonnegative(),
  mimeType: z.string(),
  createdAt: z.string().datetime(),
});
export type FileMetadata = z.infer<typeof FileMetadataSchema>;

/* ─────────────────────────────────────────────────────────────────
 * Domain — Auth, tiers, quotas.
 * Shared between apps/web (Clerk + Next middleware) and apps/api
 * (Express auth + rate limit middleware) so we never disagree on the
 * vocabulary or the limits.
 * ──────────────────────────────────────────────────────────────── */

export const UserTierSchema = z.enum(['anonymous', 'free', 'premium', 'business']);
export type UserTier = z.infer<typeof UserTierSchema>;

export const SubscriptionPlanSchema = z.enum([
  'free',
  'premium_monthly',
  'premium_yearly',
  'business',
]);
export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>;

/**
 * Map a `subscriptions.plan` value (DB enum) to the simpler `UserTier` we use
 * for quota / feature checks. A null plan (no row) maps to 'free' for
 * authenticated users — anonymous visitors are handled separately.
 */
export function mapPlanToTier(plan: SubscriptionPlan | null | undefined): UserTier {
  switch (plan) {
    case 'business':
      return 'business';
    case 'premium_monthly':
    case 'premium_yearly':
      return 'premium';
    case 'free':
    case null:
    case undefined:
      return 'free';
    default: {
      const _exhaustive: never = plan;
      void _exhaustive;
      return 'free';
    }
  }
}

/**
 * Daily-operation quotas per tier. `Number.POSITIVE_INFINITY` means unlimited.
 *
 * IMPORTANT: This is the single source of truth — the rate limit middleware,
 * the dashboard usage bar, and the upgrade CTA all read from this object.
 */
export const DAILY_OPERATION_LIMITS: Readonly<Record<UserTier, number>> = {
  anonymous: 3,
  free: 10,
  premium: Number.POSITIVE_INFINITY,
  business: Number.POSITIVE_INFINITY,
};

export function getDailyLimit(tier: UserTier): number {
  return DAILY_OPERATION_LIMITS[tier];
}

export function isUnlimited(tier: UserTier): boolean {
  return !Number.isFinite(DAILY_OPERATION_LIMITS[tier]);
}

/* ─────────────────────────────────────────────────────────────────
 * Domain — User profile shared between Next API route and SWR hook.
 * ──────────────────────────────────────────────────────────────── */

export const UsageSummarySchema = z.object({
  /** Operations performed today by the resolved identity. */
  count: z.number().int().nonnegative(),
  /** Daily limit for the user's tier. `null` means unlimited. */
  limit: z.number().int().nonnegative().nullable(),
  /** Operations remaining today. `null` means unlimited. */
  remaining: z.number().int().nonnegative().nullable(),
  /** Bytes processed today (sum of input file sizes). */
  bytesProcessed: z.number().int().nonnegative(),
});
export type UsageSummary = z.infer<typeof UsageSummarySchema>;

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  clerkId: z.string().min(1),
  email: z.string().email(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const CurrentUserResponseSchema = z.object({
  user: UserProfileSchema.nullable(),
  tier: UserTierSchema,
  plan: SubscriptionPlanSchema.nullable(),
  usageToday: UsageSummarySchema,
});
export type CurrentUserResponse = z.infer<typeof CurrentUserResponseSchema>;

export const RateLimitErrorSchema = z.object({
  error: z.object({
    code: z.literal('RATE_LIMITED'),
    message: z.string(),
    details: z
      .object({
        tier: UserTierSchema,
        limit: z.number().int().nonnegative(),
        remaining: z.number().int().nonnegative(),
        resetAt: z.string().datetime(),
        upgradeUrl: z.string().url().or(z.string().startsWith('/')),
      })
      .optional(),
  }),
  requestId: z.string().optional(),
});
export type RateLimitError = z.infer<typeof RateLimitErrorSchema>;
