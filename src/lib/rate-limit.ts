// src/lib/rate-limit.ts — small in-memory sliding-window limiter.
// Per server process: with pm2 cluster mode each worker counts separately, so the effective
// limit is (limit × workers). Good enough to stop casual abuse; put a CAPTCHA or an edge
// rate limit in front for anything stronger.
import type { NextRequest } from 'next/server';

const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k); // keep it bounded
  return true;
}

export function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}
