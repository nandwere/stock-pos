import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActor } from '@/lib/auth';
import { getPlan, invalidatePlans } from '@/lib/plans.server';

// Confirm or reject a merchant's plan payment. Super admin only: confirming changes the merchant's plan.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!actor.can('merchants.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { action, notes } = await request.json().catch(() => ({}));
  if (!['confirm', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { id } = await params;
  const paymentRequest = await prisma.paymentRequest.findUnique({ where: { id } });
  if (!paymentRequest) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (action === 'confirm') {
    const plan = await getPlan(paymentRequest.plan);
    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: 'That plan is no longer active. Reject the request or reactivate the plan.' }, { status: 409 });
    }
  }

  // Resolve only if still PENDING, so two admins can't both act on it
  const resolved = await prisma.$transaction(async tx => {
    const res = await tx.paymentRequest.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: action === 'confirm' ? 'CONFIRMED' : 'REJECTED', notes },
    });
    if (res.count === 0) return false;
    if (action === 'confirm') {
      await tx.merchant.update({ where: { id: paymentRequest.merchantId }, data: { plan: paymentRequest.plan } });
    }
    return true;
  });

  if (!resolved) return NextResponse.json({ error: 'Already resolved' }, { status: 409 });
  invalidatePlans();
  return NextResponse.json({ success: true });
}
