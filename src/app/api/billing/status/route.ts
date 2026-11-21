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
    ...access.billing,
    plan: { key: access.plan.key, name: access.plan.name },
    subscribedPlan: { key: access.subscribedPlan.key, name: access.subscribedPlan.name },
    canManage: actor.can('billing.manage'),
    openInvoiceCount,
  };
  return NextResponse.json(view);
}
