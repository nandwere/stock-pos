// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import type { Feature } from './lib/plans';
import { getMerchantAccess } from './lib/plans.server';

export const runtime = 'nodejs';

// ── Merchant resolution ────────────────────────────────────────────
const HOSTNAME_TO_SLUG: Record<string, string> = {
  'stockpos.work.gd': 'baraka',
  'www.stockpos.work.gd': 'baraka',
  'demo.stockpos.work.gd': 'demo',   // 👈 add your demo merchant slug
  'localhost': 'baraka',
};
const DEFAULT_SLUG = 'baraka';

// Map routes → required feature (null = no feature gate, just auth)
const FEATURE_GATES: Record<string, Feature> = {
  '/reports': 'reports',
  '/shifts': 'shifts',
  '/stock-count': 'reports',
  '/inventory/export': 'exports',
  '/settings/users': 'multi_user',
  '/api/': 'api_access', // all API routes require API access feature
  '/inventory/stock-adjustments': 'stock_adjustments',
  '/sales': 'sales',
  '/pos': 'sales',
};

function resolveMerchantSlug(request: NextRequest): string {
  const hostname = request.headers.get('x-forwarded-host') ?? request.nextUrl.hostname;
  // console.log('Resolving merchant slug for hostname:', hostname);
  return HOSTNAME_TO_SLUG[hostname] ?? DEFAULT_SLUG;
}

// ── Route classification ───────────────────────────────────────────
// /support and /terms are public and, unlike the auth pages, stay reachable when signed in
const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password', '/change-password', '/store', '/support', '/terms'];
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password', '/change-password'];

// ── Middleware ─────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  // console.log('All headers:', Object.fromEntries(request.headers));

  const { pathname } = request.nextUrl;
  const slug = resolveMerchantSlug(request);

  const PUBLIC_API_ROUTES = ['/api/storefront'];

  // API routes — only stamp the slug, skip all auth/redirect logic
  if (pathname.startsWith('/api')) {
    if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
      return withSlug(NextResponse.next());
    }
    const response = NextResponse.next();
    response.headers.set('x-merchant-slug', slug);
    return response;
  }

  // Helper: attach the slug header to any outgoing response
  function withSlug(response: NextResponse) {
    response.headers.set('x-merchant-slug', slug);
    return response;
  }

  // Public routes — still stamp the slug so the login API can read it
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return withSlug(NextResponse.next());
  }

  const token = request.cookies.get('session')?.value;

  // No token → redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return withSlug(NextResponse.redirect(loginUrl));
  }

  // Only an unreadable/expired TOKEN means "signed out". Anything else going wrong below must
  // never clear the cookie: that is what made sign-in appear to "bounce back to /login" when the
  // plan lookup failed (for example a database that is missing a new column), with nothing logged.
  let payload: Awaited<ReturnType<typeof verifyToken>> = null;
  try {
    payload = await verifyToken(token);
  } catch {
    payload = null;
  }

  // Expired or invalid payload → clear cookie, redirect to login
  if (!payload || new Date(payload.expiresAt) < new Date()) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('session');
    return withSlug(response);
  }

  // Already authenticated → bounce away from auth routes (e.g. /login)
  if (AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    return withSlug(NextResponse.redirect(new URL('/', request.url)));
  }

  const requiredFeature = Object.entries(FEATURE_GATES).find(([route]) =>
    pathname.startsWith(route)
  )?.[1];

  // Plan is read live (short cache), not from the JWT: the token's plan is set at login,
  // so it would be stale after any upgrade.
  let access: Awaited<ReturnType<typeof getMerchantAccess>> = null;
  let planLookupFailed = false;
  try {
    access = await getMerchantAccess(payload.merchantId);
  } catch (err) {
    // Fail open and say so loudly: a plan-lookup problem must not lock everyone out of the app.
    // (The API routes re-check plan features themselves.)
    planLookupFailed = true;
    console.error('[middleware] plan lookup failed, letting the request through:', err);
  }

  // Super admins are never plan-gated
  if (requiredFeature && !payload.isSuperAdmin && !planLookupFailed && !access?.plan.features.includes(requiredFeature)) {
    return withSlug(NextResponse.redirect(new URL('/upgrade', request.url)));
  }

  // All good — pass through with slug + user context headers
  const response = NextResponse.next();
  response.headers.set('x-merchant-slug', slug);
  response.headers.set('x-user-id', payload.userId);
  response.headers.set('x-user-role', payload.role.id);
  response.headers.set('x-merchant-plan', access?.plan.key ?? '');
  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything EXCEPT:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, public folder (static files)
     * API routes ARE included so x-merchant-slug gets stamped on them
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};