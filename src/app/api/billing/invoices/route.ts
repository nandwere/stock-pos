import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActor } from '@/lib/auth';
import { BillingError, createOrReuseInvoice } from '@/lib/billing.server';

const toView = (i: any) => ({
  ...i,
  issuedAt: i.issuedAt.toISOString(),
  dueAt: i.dueAt.toISOString(),
  paidAt: i.paidAt?.toISOString() ?? null,
  periodStart: i.periodStart?.toISOString() ?? null,
  periodEnd: i.periodEnd?.toISOString() ?? null,
  createdAt: undefined,
  updatedAt: undefined,
});

// GET /api/billing/invoices            → this merchant's invoices
// GET /api/billing/invoices?all=1      → every merchant's (super admin)
export async function GET(request: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const all = new URL(request.url).searchParams.get('all') === '1';
  if (all) {
    if (!actor.can('merchants.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } else if (!actor.can('billing.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rows = await prisma.invoice.findMany({
    where: all ? {} : { merchantId: actor.merchantId },
    orderBy: { issuedAt: 'desc' },
    take: 300,
    include: all ? { merchant: { select: { id: true, name: true, slug: true } } } : undefined,
  });
  return NextResponse.json({ data: rows.map(toView) });
}

// POST /api/billing/invoices  { plan, months } → creates (or reuses) the open invoice for that purchase
export async function POST(request: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!actor.can('billing.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => null);
  try {
    const invoice = await createOrReuseInvoice(actor.merchantId, String(body?.plan ?? ''), Number(body?.months ?? 1));
    return NextResponse.json(toView(invoice), { status: 201 });
  } catch (err) {
    if (err instanceof BillingError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('POST /api/billing/invoices', err);
    return NextResponse.json({ error: 'Could not create the invoice' }, { status: 500 });
  }
}
