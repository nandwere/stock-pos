// src/lib/billing.server.ts
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getPlan, invalidatePlans } from '@/lib/plans.server';
import { addMonths, PERIOD_OPTIONS } from '@/lib/billing-shared';

export class BillingError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/** Issuer details printed on invoices/receipts. Set these in the server environment. */
export function platformDetails() {
  return {
    name: process.env.PLATFORM_NAME || 'Stock POS',
    email: process.env.PLATFORM_EMAIL || process.env.GMAIL_USER || '',
    phone: process.env.PLATFORM_PHONE || '',
    address: process.env.PLATFORM_ADDRESS || '',
    taxPin: process.env.PLATFORM_TAX_PIN || '',
    appUrl: (process.env.APP_URL || '').replace(/\/$/, ''),
  };
}

type Tx = Prisma.TransactionClient;

/** INV-2026-0001 / RCT-2026-0001 / SUP-2026-0001. The counter row is locked by the upsert, so numbers never collide. */
export async function nextNumber(tx: Tx, prefix: 'INV' | 'RCT' | 'SUP'): Promise<string> {
  const year = new Date().getUTCFullYear();
  const key = `${prefix}-${year}`;
  const row = await tx.billingCounter.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1 },
  });
  return `${key}-${String(row.value).padStart(4, '0')}`;
}

/** Creates an invoice for buying `months` of `planKey`, or returns the open one for the same purchase. */
export async function createOrReuseInvoice(merchantId: string, planKey: string, months: number) {
  if (!(PERIOD_OPTIONS as readonly number[]).includes(months)) throw new BillingError('Choose 1, 3, 6 or 12 months');

  const plan = await getPlan(planKey);
  if (!plan || !plan.isActive || !plan.isPublic || plan.contactOnly || plan.price <= 0) {
    throw new BillingError('That plan cannot be purchased online');
  }

  const existing = await prisma.invoice.findFirst({
    where: { merchantId, plan: plan.key, periodMonths: months, status: 'OPEN', issuedAt: { gte: new Date(Date.now() - 14 * 86_400_000) } },
    orderBy: { issuedAt: 'desc' },
  });
  // Reuse only while the price still matches what the plan costs now
  if (existing && existing.amount === plan.price * months) return existing;

  return prisma.$transaction(async (tx) => {
    const number = await nextNumber(tx, 'INV');
    const now = new Date();
    return tx.invoice.create({
      data: {
        number,
        merchantId,
        plan: plan.key,
        planName: plan.name,
        description: `${plan.name} plan – ${months} ${months === 1 ? 'month' : 'months'}`,
        periodMonths: months,
        amount: plan.price * months,
        issuedAt: now,
        dueAt: new Date(now.getTime() + 7 * 86_400_000),
      },
    });
  });
}

/**
 * Marks an invoice paid and gives the merchant what it bought. Run inside the same
 * transaction that confirms the payment request.
 *
 * Renewing the same paid plan extends from the current expiry (no days lost); anything
 * else (upgrade, switch, coming back after a lapse) starts now.
 */
export async function settleInvoice(tx: Tx, invoiceId: string, paymentRef: string, now = new Date()) {
  const invoice = await tx.invoice.findUnique({ where: { id: invoiceId }, include: { merchant: true } });
  if (!invoice) throw new BillingError('Invoice not found', 404);
  if (invoice.status === 'PAID') return invoice; // already settled: idempotent
  if (invoice.status === 'VOID') throw new BillingError('That invoice was voided', 409);

  const m = invoice.merchant;
  const stillRunning = m.planExpiresAt && m.planExpiresAt > now;
  const start = m.plan === invoice.plan && !m.planIsTrial && stillRunning ? m.planExpiresAt! : now;
  const end = addMonths(start, invoice.periodMonths);

  const receiptNumber = await nextNumber(tx, 'RCT');
  const paid = await tx.invoice.update({
    where: { id: invoiceId },
    data: { status: 'PAID', paidAt: now, paymentRef, receiptNumber, periodStart: start, periodEnd: end },
  });
  await tx.merchant.update({
    where: { id: m.id },
    data: { plan: invoice.plan, planExpiresAt: end, planIsTrial: false, billingNotice: null },
  });
  return paid;
}

export function afterBillingChange() {
  invalidatePlans();
}
