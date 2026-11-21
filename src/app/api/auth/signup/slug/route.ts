import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { validateSlug } from '@/lib/signup';

// GET /api/auth/signup/slug?slug=acme-shop → { available, reason? }
export async function GET(request: NextRequest) {
  if (!rateLimit(`slug:${clientIp(request)}`, 40, 60_000)) {
    return NextResponse.json({ available: false, reason: 'Slow down a little' }, { status: 429 });
  }
  const slug = (new URL(request.url).searchParams.get('slug') ?? '').trim().toLowerCase();
  const problem = validateSlug(slug);
  if (problem) return NextResponse.json({ available: false, reason: problem });

  const taken = await prisma.merchant.findUnique({ where: { slug }, select: { id: true } });
  return NextResponse.json(taken ? { available: false, reason: 'Already taken' } : { available: true });
}
