import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActor } from '@/lib/auth';
import { getMerchantAccess } from '@/lib/plans.server';

export type AppNotification = {
  key: string;
  severity: 'info' | 'warning' | 'danger';
  title: string;
  body: string;
  href: string;
  count: number;
  /** Changes when the underlying data changes, so the client can tell "new" from "already seen". */
  fingerprint: string;
};

const hash = (parts: string[]) => {
  let h = 5381;
  for (const c of parts.join('|')) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  return (h >>> 0).toString(36);
};
const names = (list: string[], max = 3) =>
  list.slice(0, max).join(', ') + (list.length > max ? ` and ${list.length - max} more` : '');
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

// Computed from live data, so nothing needs a table or a background job.
// GET /api/notifications
export async function GET() {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { merchantId } = actor;

  const items: AppNotification[] = [];

  const [merchant, thresholdRow] = await Promise.all([
    prisma.merchant.findUnique({ where: { id: merchantId }, select: { currency: true } }),
    prisma.settings.findUnique({ where: { merchantId_key: { merchantId, key: 'low_stock_threshold' } }, select: { value: true } }),
  ]);
  const currency = merchant?.currency ?? 'KES';
  const threshold = Number(thresholdRow?.value ?? 10) || 10;

  // ── Stock ─────────────────────────────────────────────────────────────────
  if (actor.can('products.view')) {
    // A product's own reorder level wins; otherwise the shop-wide threshold from Settings.
    const rows = await prisma.$queryRaw<{ id: string; name: string; stock: number }[]>`
      SELECT "id", "name", "currentStock"::float8 AS stock
      FROM "Product"
      WHERE "merchantId" = ${merchantId} AND "isActive" = true AND "isService" = false
        AND "currentStock" <= CASE WHEN "reorderLevel" > 0 THEN "reorderLevel" ELSE ${threshold} END
      ORDER BY "currentStock" ASC, "name" ASC
      LIMIT 200`;

    const out = rows.filter((r) => r.stock <= 0);
    const low = rows.filter((r) => r.stock > 0);
    if (out.length) {
      items.push({
        key: 'out-of-stock', severity: 'danger', count: out.length, href: '/inventory',
        title: `${plural(out.length, 'product')} out of stock`,
        body: names(out.map((r) => r.name)),
        fingerprint: hash(out.map((r) => r.id)),
      });
    }
    if (low.length) {
      items.push({
        key: 'low-stock', severity: 'warning', count: low.length, href: '/inventory',
        title: `${plural(low.length, 'product')} running low`,
        body: names(low.map((r) => `${r.name} (${Number(r.stock.toFixed(3))})`)),
        fingerprint: hash(low.map((r) => r.id)),
      });
    }
  }

  if (actor.can('sales.view')) {
    // ── Online orders awaiting confirmation ─────────────────────────────────
    const [pendingOrders, latestOrder] = await Promise.all([
      prisma.order.count({ where: { merchantId, status: 'PENDING' } }),
      prisma.order.findFirst({
        where: { merchantId, status: 'PENDING' }, orderBy: { createdAt: 'desc' },
        select: { orderNumber: true, customerName: true, total: true },
      }),
    ]);
    if (pendingOrders > 0 && latestOrder) {
      items.push({
        key: 'pending-orders', severity: 'info', count: pendingOrders, href: '/orders',
        title: `${plural(pendingOrders, 'online order')} awaiting confirmation`,
        body: `Latest: ${latestOrder.customerName} · ${currency} ${Number(latestOrder.total).toLocaleString('en-KE')}`,
        fingerprint: hash([latestOrder.orderNumber, String(pendingOrders)]),
      });
    }

    // ── Credit sales due or overdue ─────────────────────────────────────────
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const credit = await prisma.sale.findMany({
      where: { merchantId, paymentMethod: 'CREDIT', settledAt: null, dueDate: { lte: endOfToday } },
      select: { id: true, saleNumber: true, customerName: true, total: true, amountPaid: true, dueDate: true },
      take: 200,
    });
    const owing = credit
      .map((s) => ({ ...s, balance: Number(s.total) - Number(s.amountPaid) }))
      .filter((s) => s.balance > 0);
    if (owing.length) {
      const sum = owing.reduce((t, s) => t + s.balance, 0);
      const overdue = owing.filter((s) => s.dueDate && s.dueDate < new Date(new Date().setHours(0, 0, 0, 0))).length;
      items.push({
        key: 'credit-due', severity: overdue ? 'danger' : 'warning', count: owing.length, href: '/sales/credit',
        title: `${plural(owing.length, 'credit payment')} due${overdue ? ` (${overdue} overdue)` : ''}`,
        body: `${currency} ${sum.toLocaleString('en-KE', { maximumFractionDigits: 2 })} outstanding`,
        fingerprint: hash(owing.map((s) => s.id)),
      });
    }
  }

  // ── Plan / trial ending ─────────────────────────────────────────────────────
  if (actor.can('billing.manage')) {
    const access = await getMerchantAccess(merchantId);
    const b = access?.billing;
    if (access && b && b.expiresAt && b.state !== 'active') {
      const what = b.isTrial ? 'free trial' : `${access.plan.name} plan`;
      const on = new Date(b.expiresAt).toLocaleDateString('en-KE', { dateStyle: 'medium', timeZone: 'Africa/Nairobi' });
      items.push({
        key: 'billing', href: '/billing', count: 1,
        severity: b.state === 'expiring' ? 'warning' : 'danger',
        title: b.state === 'expiring' ? `Your ${what} ends in ${b.daysLeft} ${b.daysLeft === 1 ? 'day' : 'days'}`
          : b.state === 'grace' ? `Your ${what} has expired` : `You are now on the ${access.plan.name} plan`,
        body: b.state === 'lapsed' ? 'Renew to get your features back' : `Ends ${on}. Renew to avoid interruption`,
        fingerprint: hash([b.state || 'active', b.expiresAt ? b.expiresAt.toISOString() : '', String(b.daysLeft)]),
      });
    }
  }

  // ── Expenses waiting for approval ───────────────────────────────────────────
  if (actor.can('expenses.approve')) {
    const submitted = await prisma.expense.findMany({
      where: { merchantId, status: 'SUBMITTED' }, select: { id: true }, take: 200,
    });
    if (submitted.length) {
      items.push({
        key: 'expenses-pending', severity: 'info', count: submitted.length, href: '/expenses',
        title: `${plural(submitted.length, 'expense')} awaiting approval`,
        body: 'Review and approve or reject',
        fingerprint: hash(submitted.map((e) => e.id)),
      });
    }
  }

  return NextResponse.json({ data: items });
}
