/**
 * Next.js middleware — Clerk auth + tier propagation.
 *
 * Conditional on `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` being set:
 *   - When set:  full Clerk auth gating + `x-user-tier` request header for
 *                downstream Server Components / Route Handlers.
 *   - When unset: a no-op middleware that lets every request through with
 *                `x-user-tier: anonymous`. Keeps the zero-cost local dev path
 *                working out of the box.
 *
 * Public routes (always reachable, no sign-in required):
 *   - "/", "/sign-in/*", "/sign-up/*", "/api/webhooks/clerk"
 *   - All tool pages (/merge-pdf, /split-pdf, /compress-pdf, /rotate-pdf,
 *     /delete-pages)
 *   - All compute API namespaces: /api/pdf/*, /api/convert/*
 *
 * Protected routes (require an authed Clerk session):
 *   - /dashboard/*
 *   - /api/user/*, /api/subscription/*, /api/payments/*
 */

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';

import { AUTH_HEADERS } from '@/lib/auth-headers';

const { USER_ID: HEADER_USER_ID, USER_TIER: HEADER_USER_TIER, AUTH_BACKEND: HEADER_AUTH_BACKEND } =
  AUTH_HEADERS;

const PUBLIC_ROUTES: ReadonlyArray<string> = [
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/clerk(.*)',
  // Tool pages — accessible without an account, anonymous quotas apply.
  '/merge-pdf(.*)',
  '/split-pdf(.*)',
  '/compress-pdf(.*)',
  '/rotate-pdf(.*)',
  '/delete-pages(.*)',
  // Compute APIs — anonymous-friendly. The tier-aware rate limiter on the
  // Express side enforces per-tier daily quotas.
  '/api/pdf(.*)',
  '/api/convert(.*)',
];

const PROTECTED_ROUTES: ReadonlyArray<string> = [
  '/dashboard(.*)',
  '/api/user(.*)',
  '/api/subscription(.*)',
  '/api/payments(.*)',
];

const isPublicRoute = createRouteMatcher(PUBLIC_ROUTES);
const isProtectedRoute = createRouteMatcher(PROTECTED_ROUTES);

const HAS_CLERK = Boolean(process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY']);

/* ─────────────────────────────────────────────────────────────────
 * Tier resolution
 *
 * The "true" tier requires a DB lookup (subscriptions table). Edge middleware
 * can't open a Postgres connection, so we use Clerk's `publicMetadata.tier`
 * as the source of truth for header propagation. The Clerk webhook keeps
 * `publicMetadata.tier` in sync with the user's subscription state.
 *
 * This header is a hint — every protected route should still re-check the
 * tier server-side via `getUserTier()` before granting access to a paid
 * feature.
 * ──────────────────────────────────────────────────────────────── */

const ALLOWED_TIERS = new Set(['anonymous', 'free', 'premium', 'business']);

function tierFromMetadata(metadata: unknown): 'free' | 'premium' | 'business' {
  if (typeof metadata !== 'object' || metadata === null) return 'free';
  const candidate = (metadata as Record<string, unknown>)['tier'];
  if (typeof candidate === 'string' && ALLOWED_TIERS.has(candidate) && candidate !== 'anonymous') {
    return candidate as 'free' | 'premium' | 'business';
  }
  return 'free';
}

/* ─────────────────────────────────────────────────────────────────
 * Middleware
 * ──────────────────────────────────────────────────────────────── */

const clerkAware = clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    auth().protect();
  }

  const session = auth();
  const tier =
    session.userId == null ? 'anonymous' : tierFromMetadata(session.sessionClaims?.['publicMetadata']);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(HEADER_USER_TIER, tier);
  requestHeaders.set(HEADER_AUTH_BACKEND, 'clerk');
  if (session.userId) requestHeaders.set(HEADER_USER_ID, session.userId);

  return NextResponse.next({ request: { headers: requestHeaders } });
});

function noopMiddleware(request: NextRequest): NextResponse {
  // Without Clerk, every protected route is unreachable — return a clear 401
  // for API routes so the SWR hook surfaces "auth not configured", and a
  // redirect to the home page for browser navigations.
  if (isProtectedRoute(request)) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({
          error: {
            code: 'AUTH_NOT_CONFIGURED',
            message:
              'Authentication is not configured for this deployment. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to enable.',
          },
        }),
        {
          status: 503,
          headers: { 'content-type': 'application/json', 'retry-after': '600' },
        },
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('reason', 'auth-disabled');
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(HEADER_USER_TIER, 'anonymous');
  requestHeaders.set(HEADER_AUTH_BACKEND, 'none');
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export default HAS_CLERK ? clerkAware : noopMiddleware;

/* ─────────────────────────────────────────────────────────────────
 * Matcher
 *
 * Match every page + API route except Next.js internals and static assets.
 * Mirrors Clerk's recommended matcher with a tightened static asset filter.
 * ──────────────────────────────────────────────────────────────── */

export const config = {
  matcher: [
    // Skip Next.js internals + all static asset extensions, but still match
    // root-level paths (so /, /dashboard, etc. are gated).
    '/((?!_next|pdfjs|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|woff2?|ttf|otf|mp4|mp3)$).*)',
    // Always run on API routes regardless of extension.
    '/(api|trpc)(.*)',
  ],
};
