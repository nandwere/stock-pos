import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { action, notes } = await request.json();
  if (!['confirm', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { id } = await params;
  const paymentRequest = await prisma.paymentRequest.findFirst({
    where: { id: id, merchantId: session.merchantId },
  });

  if (!paymentRequest) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (paymentRequest.status !== 'PENDING') {
    return NextResponse.json({ error: 'Already resolved' }, { status: 409 });
  }

  if (action === 'confirm') {
    // Activate the plan and mark request as confirmed atomically
    await prisma.$transaction([
      prisma.paymentRequest.update({
        where: { id: id },
        data: { status: 'CONFIRMED', notes },
      }),
      prisma.merchant.update({
        where: { id: session.merchantId },
        data: { plan: paymentRequest.plan },
      }),
    ]);
  } else {
    await prisma.paymentRequest.update({
      where: { id: id },
      data: { status: 'REJECTED', notes },
    });
  }

  return NextResponse.json({ success: true });
}