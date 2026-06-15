import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOtpEmail } from '@/lib/email';

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  const { email } = await request.json();
  const slug = request.headers.get('x-merchant-slug') ?? 'baraka';

  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

  const merchant = await prisma.merchant.findUnique({ where: { slug } });
  if (!merchant) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

  const user = await prisma.user.findUnique({
    where: { merchantId_email: { merchantId: merchant.id, email } },
  });

  // Always return success to prevent email enumeration
  if (!user || !user.isActive) {
    console.log("No active user found for email:", email);
    return NextResponse.json({ success: true });
  }

  // Invalidate any existing unused OTPs for this email
  await prisma.otpCode.updateMany({
    where:  { merchantId: merchant.id, email, usedAt: null },
    data:   { usedAt: new Date() },
  });

  const code      = generateOtp();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  console.log(`Generated OTP for ${email}: ${code} (expires at ${expiresAt.toISOString()})`);

  await prisma.otpCode.create({
    data: { merchantId: merchant.id, email, code, expiresAt },
  });

  await sendOtpEmail(email, code, merchant.name);

  return NextResponse.json({ success: true });
}