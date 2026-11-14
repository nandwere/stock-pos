// app/api/auth/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { validatePassword } from '@/lib/password-policy';

export async function POST(request: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { currentPassword, newPassword } = await request.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Both passwords are required' }, { status: 400 });
  }
  const problem = validatePassword(newPassword);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const row = await prisma.user.findUniqueOrThrow({ where: { id: me.id }, select: { password: true } });
  if (!(await bcrypt.compare(currentPassword, row.password))) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
  }
  if (await bcrypt.compare(newPassword, row.password)) {
    return NextResponse.json({ error: 'Choose a password you haven\'t used just now' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: me.id },
    data: { password: await bcrypt.hash(newPassword, 10), passwordChangedAt: new Date(), mustChangePassword: false },
  });
  return NextResponse.json({ success: true });
}