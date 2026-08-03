/**
 * Header names used to propagate the Clerk-resolved identity from the
 * Next.js middleware down to Route Handlers and Server Components.
 *
 * Kept in their own module (instead of `middleware.ts`) so any file that
 * needs to read them — including Edge handlers — can import the constants
 * without pulling in the entire middleware bundle.
 */

export const AUTH_HEADERS = {
  USER_ID: 'x-user-id',
  USER_TIER: 'x-user-tier',
  AUTH_BACKEND: 'x-auth-backend',
} as const;

export type AuthHeaderName = (typeof AUTH_HEADERS)[keyof typeof AUTH_HEADERS];
