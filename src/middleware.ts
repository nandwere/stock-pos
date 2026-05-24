// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { Feature, hasFeature, Plan } from './lib/plans';

export const runtime = 'nodejs';

// ── Merchant resolution ────────────────────────────────────────────
const HOSTNAME_TO_SLUG: Record<string, string> = {
  'stockpos.work.gd': 'baraka',
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
  const hostname = request.nextUrl.hostname;
  return HOSTNAME_TO_SLUG[hostname] ?? DEFAULT_SLUG;
}

// ── Route classification ───────────────────────────────────────────
const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password'];
const AUTH_ROUTES = ['/login', '/forgot-password', '/reset-password'];

// ── Middleware ─────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const slug = resolveMerchantSlug(request);

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

  try {
    const payload = await verifyToken(token);

    console.log('Middleware auth payload:', payload);

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

    console.log('Checking feature gate for route:', pathname);
    // Feature gate check
    const requiredFeature = Object.entries(FEATURE_GATES).find(([route]) =>
      pathname.startsWith(route)
    )?.[1];

    console.log('Required feature for this route:', requiredFeature);

    if (requiredFeature && !hasFeature(payload.plan as Plan, requiredFeature)) {
      return withSlug(NextResponse.redirect(new URL('/upgrade', request.url)));
    }

    // All good — pass through with slug + user context headers
    const response = NextResponse.next();
    response.headers.set('x-merchant-slug', slug);
    response.headers.set('x-user-id', payload.userId);
    response.headers.set('x-user-role', payload.role);
    response.headers.set('x-merchant-plan', payload.plan);
    return response;

  } catch {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('session');
    return withSlug(response);
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};