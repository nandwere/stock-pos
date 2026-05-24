import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const { email, code, password } = await request.json();
  const slug = request.headers.get('x-merchant-slug') ?? 'baraka';

  if (!email || !code || !password) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const merchant = await prisma.merchant.findUnique({ where: { slug } });
  if (!merchant) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

  const otp = await prisma.otpCode.findFirst({
    where: {
      merchantId: merchant.id,
      email,
      code,
      usedAt:    null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!otp) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
  }

  // Mark OTP as used and update password atomically
  await prisma.$transaction([
    prisma.otpCode.update({
      where: { id: otp.id },
      data:  { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { merchantId_email: { merchantId: merchant.id, email } },
      data:  { password: await bcrypt.hash(password, 10) },
    }),
  ]);

  return NextResponse.json({ success: true });
}