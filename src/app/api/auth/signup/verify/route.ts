import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { sendWelcomeEmail } from '@/lib/email';
import { platformDetails } from '@/lib/billing.server';
import { invalidatePlans } from '@/lib/plans.server';

const MAX_ATTEMPTS = 5;
const BAD = NextResponse.json({ error: 'That code is wrong or has expired' }, { status: 400 });

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// POST /api/auth/signup/verify  { slug, email, code } — activates the merchant
export async function POST(request: NextRequest) {
  if (!rateLimit(`signup-verify:${clientIp(request)}`, 20, 15 * 60_000)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 });
  }
  const b = await request.json().catch(() => null);
  const slug = String(b?.slug ?? '').trim().toLowerCase();
  const email = String(b?.email ?? '').trim().toLowerCase();
  const code = String(b?.code ?? '').trim();
  if (!slug || !email || !/^\d{6}$/.test(code)) return BAD.clone();

  const merchant = await prisma.merchant.findFirst({ where: { slug, email, verifiedAt: null } });
  if (!merchant) return BAD.clone();

  const otp = await prisma.otpCode.findFirst({
    where: { merchantId: merchant.id, email, purpose: 'SIGNUP', usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp) return BAD.clone();
  if (otp.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: 'Too many wrong codes. Request a new code.' }, { status: 429 });
  }
  if (!same(otp.code, code)) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return BAD.clone();
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.merchant.update({ where: { id: merchant.id }, data: { isActive: true, verifiedAt: now } }),
    prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: now } }),
  ]);
  invalidatePlans();

  sendWelcomeEmail(email, merchant.name, `${platformDetails().appUrl}/login?business=${merchant.slug}`, merchant.slug, merchant.planIsTrial ? merchant.planExpiresAt : null)
    .catch((e) => console.error('[signup] welcome email failed', e));

  return NextResponse.json({ ok: true, slug: merchant.slug });
}
