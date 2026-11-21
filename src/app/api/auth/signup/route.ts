import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createDefaultRoles } from '@/lib/permissions.server';
import { getSignupPlan } from '@/lib/plans.server';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { validateSignup } from '@/lib/signup';
import { sendSignupCodeEmail } from '@/lib/email';
import { TERMS_VERSION } from '@/lib/legal';

const PENDING_TTL_MS = 24 * 3_600_000; // an unverified sign-up holds its slug/email this long
const CODE_TTL_MS = 30 * 60_000;

// POST /api/auth/signup — creates an INACTIVE merchant + owner and emails a code.
// The merchant only becomes usable after /api/auth/signup/verify proves the email is theirs.
export async function POST(request: NextRequest) {
  if (!rateLimit(`signup:${clientIp(request)}`, 5, 3_600_000)) {
    return NextResponse.json({ error: 'Too many sign-ups from this network. Try again later.' }, { status: 429 });
  }

  const b = await request.json().catch(() => null);
  if (!b) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  // Honeypot: real users never see or fill this field. Pretend it worked.
  if (typeof b.website === 'string' && b.website.trim()) return NextResponse.json({ ok: true, slug: 'pending', emailSent: true });

  const input = {
    businessName: String(b.businessName ?? '').trim(),
    slug: String(b.slug ?? '').trim().toLowerCase(),
    email: String(b.email ?? '').trim().toLowerCase(),
    phone: String(b.phone ?? '').trim(),
    ownerName: String(b.ownerName ?? '').trim(),
    password: String(b.password ?? ''),
  };
  const problem = validateSignup(input);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  if (b.acceptTerms !== true) return NextResponse.json({ error: 'Please accept the terms to continue' }, { status: 400 });

  // Free up slugs/emails held by sign-ups that were never verified
  await prisma.merchant.deleteMany({
    where: { verifiedAt: null, isActive: false, createdAt: { lt: new Date(Date.now() - PENDING_TTL_MS) }, OR: [{ slug: input.slug }, { email: input.email }] },
  }).catch(() => { /* a leftover relation blocked the cleanup: treated as taken below */ });

  const existing = await prisma.merchant.findFirst({
    where: { OR: [{ slug: input.slug }, { email: input.email }] },
    select: { slug: true, email: true, verifiedAt: true },
  });
  if (existing) {
    if (!existing.verifiedAt && existing.email === input.email && existing.slug === input.slug) {
      return NextResponse.json(
        { error: 'This sign-up is waiting for its email code. Enter the code we sent you.', code: 'PENDING_VERIFICATION', slug: existing.slug },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: existing.slug === input.slug ? 'That business code is already taken' : 'That email is already registered' },
      { status: 409 },
    );
  }

  const { plan, trialDays } = await getSignupPlan();
  const code = String(randomInt(100000, 1000000));
  const hashed = await bcrypt.hash(input.password, 10);

  try {
    await prisma.$transaction(async (tx) => {
      const merchant = await tx.merchant.create({
        data: {
          name: input.businessName, slug: input.slug, email: input.email, phone: input.phone || null,
          plan: plan.key, isActive: false, verifiedAt: null,
          termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION,
          planExpiresAt: trialDays > 0 ? new Date(Date.now() + trialDays * 86_400_000) : null,
          planIsTrial: trialDays > 0,
        },
      });
      const roleIds = await createDefaultRoles(tx, merchant.id);
      await tx.user.create({
        data: { merchantId: merchant.id, name: input.ownerName, email: input.email, password: hashed, roleId: roleIds.admin },
      });
      await tx.category.create({ data: { merchantId: merchant.id, name: 'General' } }); // so the first product can be saved straight away
      await tx.otpCode.create({
        data: { merchantId: merchant.id, email: input.email, code, expiresAt: new Date(Date.now() + CODE_TTL_MS), purpose: 'SIGNUP' },
      });
    }, { timeout: 15_000 });
  } catch (err: any) {
    if (err.code === 'P2002') return NextResponse.json({ error: 'That business code or email was just taken' }, { status: 409 });
    console.error('POST /api/auth/signup', err);
    return NextResponse.json({ error: 'Could not create your account. Please try again.' }, { status: 500 });
  }

  let emailSent = true;
  try {
    await sendSignupCodeEmail(input.email, code, input.businessName);
  } catch (err) {
    console.error('[signup] code email failed', err);
    emailSent = false; // the account exists; the page offers "resend code"
  }
  return NextResponse.json({ ok: true, slug: input.slug, emailSent }, { status: 201 });
}
