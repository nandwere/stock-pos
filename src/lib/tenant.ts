import type { NextRequest } from 'next/server';
import { SLUG_RE } from '@/lib/signup';

/**
 * Which merchant an unauthenticated request (login, password reset) is for.
 * An explicit business code from the form wins; otherwise the host-based slug the
 * middleware resolved. A code only selects WHICH merchant's users to check, the
 * credentials still have to match a user there, so this is not a way into other tenants.
 */
export function resolveTenantSlug(request: NextRequest, body?: { businessCode?: unknown } | null): string | null {
  const code = typeof body?.businessCode === 'string' ? body.businessCode.trim().toLowerCase() : '';
  if (code && SLUG_RE.test(code)) return code;
  return request.headers.get('x-merchant-slug');
}
