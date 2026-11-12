import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { METHOD_LABELS } from '@/lib/receipt-shared';
import type { ReportCtx } from './context';
import type { ReportResult } from './types';
import { inRange, localPeriod, periodHeader, periodLabel, round2, sumOf } from './sql';

type SeriesRow = { period: string; sales: number; items: number; gross: number; discount: number; revenue: number; cost: number };
type MethodRow = { method: keyof typeof METHOD_LABELS; sales: number; revenue: number };
type CashierRow = { cashier: string; sales: number; revenue: number };
type ProductRow = { product: string; unit: string; qty: number; revenue: number; cost: number };

export async function salesSummary(ctx: ReportCtx): Promise<ReportResult> {
  const { merchantId, tz, from, to, group } = ctx;
  const range = inRange('s."createdAt"', from, to, tz);

  const [series, byMethod, byCashier, topProducts] = await Promise.all([
    prisma.$queryRaw<SeriesRow[]>(Prisma.sql`
      SELECT ${localPeriod('s."createdAt"', tz, group)} AS period,
             COUNT(*)::int AS sales,
             COALESCE(SUM(c.items), 0)::float8 AS items,
             COALESCE(SUM(s."subtotal"), 0)::float8 AS gross,
             COALESCE(SUM(s."discount"), 0)::float8 AS discount,
             COALESCE(SUM(s."total"), 0)::float8 AS revenue,
             COALESCE(SUM(c.cost), 0)::float8 AS cost
      FROM "Sale" s
      LEFT JOIN LATERAL (
        SELECT SUM(si."quantity") AS items, SUM(si."quantity" * si."costPrice") AS cost
        FROM "SaleItem" si WHERE si."saleId" = s."id"
      ) c ON true
      WHERE s."merchantId" = ${merchantId} AND ${range}
      GROUP BY 1 ORDER BY 1`),

    prisma.$queryRaw<MethodRow[]>(Prisma.sql`
      SELECT s."paymentMethod"::text AS method, COUNT(*)::int AS sales,
             COALESCE(SUM(s."total"), 0)::float8 AS revenue
      FROM "Sale" s
      WHERE s."merchantId" = ${merchantId} AND ${range}
      GROUP BY 1 ORDER BY 3 DESC`),

    prisma.$queryRaw<CashierRow[]>(Prisma.sql`
      SELECT u."name" AS cashier, COUNT(*)::int AS sales,
             COALESCE(SUM(s."total"), 0)::float8 AS revenue
      FROM "Sale" s JOIN "User" u ON u."id" = s."userId"
      WHERE s."merchantId" = ${merchantId} AND ${range}
      GROUP BY u."id", u."name" ORDER BY 3 DESC`),

    prisma.$queryRaw<ProductRow[]>(Prisma.sql`
      SELECT p."name" AS product, p."unit" AS unit,
             SUM(si."quantity")::float8 AS qty,
             SUM(si."subtotal")::float8 AS revenue,
             SUM(si."quantity" * si."costPrice")::float8 AS cost
      FROM "SaleItem" si
      JOIN "Sale" s ON s."id" = si."saleId"
      JOIN "Product" p ON p."id" = si."productId"
      WHERE s."merchantId" = ${merchantId} AND ${range}
      GROUP BY p."id", p."name", p."unit" ORDER BY revenue DESC LIMIT 15`),
  ]);

  const revenue = sumOf(series, (r) => r.revenue);
  const cost = sumOf(series, (r) => r.cost);
  const profit = round2(revenue - cost);
  const salesCount = series.reduce((s, r) => s + r.sales, 0);
  const margin = revenue > 0 ? profit / revenue : 0;

  return {
    report: 'sales-summary',
    title: 'Sales Summary',
    merchantName: ctx.merchantName,
    currency: ctx.currency,
    range: { from, to, tz, group },
    cards: [
      { label: 'Revenue', value: revenue, type: 'money' },
      { label: 'Sales', value: salesCount, type: 'int' },
      { label: 'Average sale', value: salesCount ? round2(revenue / salesCount) : 0, type: 'money' },
      { label: 'Gross profit', value: profit, type: 'money', tone: profit >= 0 ? 'good' : 'bad' },
      { label: 'Margin', value: margin, type: 'percent' },
      { label: 'Discounts given', value: sumOf(series, (r) => r.discount), type: 'money', tone: 'warn' },
    ],
    tables: [
      {
        name: 'by-period',
        title: group === 'day' ? 'By day' : group === 'week' ? 'By week' : 'By month',
        columns: [
          { key: 'period', header: periodHeader(group), width: 16 },
          { key: 'sales', header: 'Sales', type: 'int' },
          { key: 'items', header: 'Items sold', type: 'qty' },
          { key: 'gross', header: 'Gross', type: 'money' },
          { key: 'discount', header: 'Discount', type: 'money' },
          { key: 'revenue', header: 'Revenue', type: 'money' },
          { key: 'cost', header: 'Cost', type: 'money' },
          { key: 'profit', header: 'Profit', type: 'money' },
          { key: 'margin', header: 'Margin', type: 'percent' },
        ],
        rows: series.map((r) => {
          const p = round2(r.revenue - r.cost);
          return {
            period: periodLabel(group, r.period),
            sales: r.sales, items: r.items,
            gross: round2(r.gross), discount: round2(r.discount),
            revenue: round2(r.revenue), cost: round2(r.cost),
            profit: p, margin: r.revenue > 0 ? p / r.revenue : 0,
          };
        }),
        totals: {
          period: 'Total', sales: salesCount, items: sumOf(series, (r) => r.items),
          gross: sumOf(series, (r) => r.gross), discount: sumOf(series, (r) => r.discount),
          revenue, cost, profit, margin,
        },
      },
      {
        name: 'by-payment-method',
        title: 'By payment method',
        columns: [
          { key: 'method', header: 'Method', width: 16 },
          { key: 'sales', header: 'Sales', type: 'int' },
          { key: 'revenue', header: 'Revenue', type: 'money' },
          { key: 'share', header: 'Share', type: 'percent' },
        ],
        rows: byMethod.map((r) => ({
          method: METHOD_LABELS[r.method] ?? r.method,
          sales: r.sales, revenue: round2(r.revenue),
          share: revenue > 0 ? r.revenue / revenue : 0,
        })),
      },
      {
        name: 'by-cashier',
        title: 'By cashier',
        columns: [
          { key: 'cashier', header: 'Cashier', width: 24 },
          { key: 'sales', header: 'Sales', type: 'int' },
          { key: 'revenue', header: 'Revenue', type: 'money' },
          { key: 'average', header: 'Average sale', type: 'money' },
        ],
        rows: byCashier.map((r) => ({
          cashier: r.cashier, sales: r.sales, revenue: round2(r.revenue),
          average: r.sales ? round2(r.revenue / r.sales) : 0,
        })),
      },
      {
        name: 'top-products',
        title: 'Top products (by revenue)',
        columns: [
          { key: 'product', header: 'Product', width: 32 },
          { key: 'unit', header: 'Unit' },
          { key: 'qty', header: 'Qty sold', type: 'qty' },
          { key: 'revenue', header: 'Revenue', type: 'money' },
          { key: 'profit', header: 'Profit', type: 'money' },
        ],
        rows: topProducts.map((r) => ({
          product: r.product, unit: r.unit, qty: r.qty,
          revenue: round2(r.revenue), profit: round2(r.revenue - r.cost),
        })),
      },
    ],
    notes: [
      'Revenue is the sale total after discounts, counted on the day of sale, and includes credit sales that have not been paid yet. For money actually received, see Cash Collected.',
      'Profit uses the cost price recorded on each sale line. Sales recorded before cost tracking was added may show a cost of 0 and overstate profit.',
    ],
  };
}