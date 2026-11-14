// app/api/auth/verify-2fa/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { finishLogin } from '@/lib/auth';
import { consumeLoginOtp } from '@/lib/security.server';

export async function POST(request: NextRequest) {
  const { challengeId, code } = await request.json();
  if (!challengeId || !/^\d{6}$/.test(code ?? '')) {
    return NextResponse.json({ error: 'Enter the 6-digit code' }, { status: 400 });
  }

  const r = await consumeLoginOtp(challengeId, code);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { merchantId_email: { merchantId: r.merchantId, email: r.email } },
    select: { id: true, isActive: true },
  });
  if (!user?.isActive) return NextResponse.json({ error: 'Account disabled' }, { status: 401 });

  const result = await finishLogin(user.id, r.merchantId);
  return NextResponse.json(result);
}