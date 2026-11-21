import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActor } from '@/lib/auth';
import { getMerchantAccess } from '@/lib/plans.server';
import type { BillingStatusView } from '@/lib/billing-shared';

// Used by the dashboard banner and the Billing page.
export async function GET() {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const access = await getMerchantAccess(actor.merchantId);
  if (!access) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });

  const openInvoiceCount = await prisma.invoice.count({ where: { merchantId: actor.merchantId, status: 'OPEN' } });

  const view: BillingStatusView = {
    state: access.billing?.state || 'active',
    isTrial: access.billing?.isTrial || false,
    expiresAt: access?.billing?.expiresAt ? access.billing.expiresAt.toISOString() : null,
    graceEndsAt: access?.billing?.graceEndsAt ? access.billing.graceEndsAt.toISOString() : null,
    daysLeft: access?.billing?.daysLeft || null,
    plan: { key: access.plan.key, name: access.plan.name },
    subscribedPlan: { key: access.plan.key, name: access.plan.name },
    canManage: actor.can('billing.manage'),
    openInvoiceCount,
  };  return NextResponse.json(view);
}
