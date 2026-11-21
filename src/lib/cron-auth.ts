import type { NextRequest } from 'next/server';

/** Accepts the secret as `Authorization: Bearer …` (Vercel/GitHub cron) or `x-cron-secret` (lib/scheduler.ts). */
export function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}` || request.headers.get('x-cron-secret') === secret;
}
