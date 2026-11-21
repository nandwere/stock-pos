import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { prisma } from '@/lib/prisma';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { sendSignupCodeEmail } from '@/lib/email';

// POST /api/auth/signup/resend  { slug, email } — new code for an unverified sign-up (max one a minute)
export async function POST(request: NextRequest) {
  if (!rateLimit(`signup-resend:${clientIp(request)}`, 10, 3_600_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }
  const b = await request.json().catch(() => null);
  const slug = String(b?.slug ?? '').trim().toLowerCase();
  const email = String(b?.email ?? '').trim().toLowerCase();

  const merchant = slug && email ? await prisma.merchant.findFirst({ where: { slug, email, verifiedAt: null } }) : null;
  if (!merchant) return NextResponse.json({ ok: true }); // same answer whether or not it exists

  const latest = await prisma.otpCode.findFirst({
    where: { merchantId: merchant.id, email, purpose: 'SIGNUP' }, orderBy: { createdAt: 'desc' },
  });
  if (latest && Date.now() - latest.createdAt.getTime() < 60_000) {
    return NextResponse.json({ error: 'Please wait a minute before asking for another code' }, { status: 429 });
  }

  const code = String(randomInt(100000, 1000000));
  await prisma.$transaction([
    prisma.otpCode.updateMany({ where: { merchantId: merchant.id, email, purpose: 'SIGNUP', usedAt: null }, data: { usedAt: new Date() } }),
    prisma.otpCode.create({ data: { merchantId: merchant.id, email, code, expiresAt: new Date(Date.now() + 30 * 60_000), purpose: 'SIGNUP' } }),
  ]);

  try {
    await sendSignupCodeEmail(email, code, merchant.name);
  } catch (err) {
    console.error('[signup] resend email failed', err);
    return NextResponse.json({ error: 'We could not send the email. Try again shortly.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
