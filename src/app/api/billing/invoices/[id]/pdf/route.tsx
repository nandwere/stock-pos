import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { getActor } from '@/lib/auth';
import { platformDetails } from '@/lib/billing.server';
import { BillingPdf } from '@/lib/billing-pdf';
import type { InvoiceView } from '@/lib/billing-shared';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/billing/invoices/:id/pdf?type=invoice|receipt
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const type = new URL(request.url).searchParams.get('type') === 'receipt' ? 'receipt' : 'invoice';

    const row = await prisma.invoice.findUnique({ where: { id }, include: { merchant: true } });
    // A merchant only sees its own invoices; super admins see all. Same answer either way for a stranger.
    const allowed = row && (row.merchantId === actor.merchantId ? actor.can('billing.manage') : actor.can('merchants.manage'));
    if (!row || !allowed) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    if (type === 'receipt' && (row.status !== 'PAID' || !row.receiptNumber)) {
      return NextResponse.json({ error: 'No receipt yet: this invoice has not been paid' }, { status: 409 });
    }

    const invoice: InvoiceView = {
      id: row.id, number: row.number, plan: row.plan, planName: row.planName, description: row.description,
      periodMonths: row.periodMonths, amount: row.amount, currency: row.currency, status: row.status,
      issuedAt: row.issuedAt.toISOString(), dueAt: row.dueAt.toISOString(), paidAt: row.paidAt?.toISOString() ?? null,
      receiptNumber: row.receiptNumber, paymentRef: row.paymentRef,
      periodStart: row.periodStart?.toISOString() ?? null, periodEnd: row.periodEnd?.toISOString() ?? null,
    };

    const buffer = await renderToBuffer(
      <BillingPdf doc={{
        type, invoice, issuer: platformDetails(),
        customer: { name: row.merchant.name, email: row.merchant.email, phone: row.merchant.phone, address: row.merchant.address },
      }} />,
    );

    const name = `${type === 'receipt' ? row.receiptNumber : row.number}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}"` },
    });
  } catch (err) {
    console.error('Billing PDF error:', err);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
