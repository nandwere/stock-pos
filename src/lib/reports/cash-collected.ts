import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { METHOD_LABELS } from '@/lib/receipt-shared';
import type { ReportCtx } from './context';
import type { ReportResult } from './types';
import { inRange, localPeriod, periodHeader, periodLabel, round2, sumOf } from './sql';

type DayRow = { period: string; cash: number; mpesa: number; card: number; repayments: number; total: number };
type MethodRow = { method: keyof typeof METHOD_LABELS; payments: number; sale: number; deposit: number; repayment: number; total: number };
type UserRow = { person: string; cash: number; mpesa: number; card: number; total: number };

export async function cashCollected(ctx: ReportCtx): Promise<ReportResult> {
  const { merchantId, tz, from, to, group } = ctx;
  const payRange = inRange('p."createdAt"', from, to, tz);
  const saleRange = inRange('s."createdAt"', from, to, tz);

  const [byDay, byMethod, byUser, creditSales, outstanding] = await Promise.all([
    prisma.$queryRaw<DayRow[]>(Prisma.sql`
      SELECT ${localPeriod('p."createdAt"', tz, group)} AS period,
             COALESCE(SUM(p."amount") FILTER (WHERE p."method" = 'CASH'), 0)::float8 AS cash,
             COALESCE(SUM(p."amount") FILTER (WHERE p."method" = 'MOBILE_MONEY'), 0)::float8 AS mpesa,
             COALESCE(SUM(p."amount") FILTER (WHERE p."method" = 'CARD'), 0)::float8 AS card,
             COALESCE(SUM(p."amount") FILTER (WHERE p."kind" = 'REPAYMENT'), 0)::float8 AS repayments,
             COALESCE(SUM(p."amount"), 0)::float8 AS total
      FROM "SalePayment" p
      WHERE p."merchantId" = ${merchantId} AND ${payRange}
      GROUP BY 1 ORDER BY 1`),

    prisma.$queryRaw<MethodRow[]>(Prisma.sql`
      SELECT p."method"::text AS method, COUNT(*)::int AS payments,
             COALESCE(SUM(p."amount") FILTER (WHERE p."kind" = 'SALE'), 0)::float8 AS sale,
             COALESCE(SUM(p."amount") FILTER (WHERE p."kind" = 'DEPOSIT'), 0)::float8 AS deposit,
             COALESCE(SUM(p."amount") FILTER (WHERE p."kind" = 'REPAYMENT'), 0)::float8 AS repayment,
             COALESCE(SUM(p."amount"), 0)::float8 AS total
      FROM "SalePayment" p
      WHERE p."merchantId" = ${merchantId} AND ${payRange}
      GROUP BY 1 ORDER BY 6 DESC`),

    prisma.$queryRaw<UserRow[]>(Prisma.sql`
      SELECT COALESCE(u."name", 'Unknown') AS person,
             COALESCE(SUM(p."amount") FILTER (WHERE p."method" = 'CASH'), 0)::float8 AS cash,
             COALESCE(SUM(p."amount") FILTER (WHERE p."method" = 'MOBILE_MONEY'), 0)::float8 AS mpesa,
             COALESCE(SUM(p."amount") FILTER (WHERE p."method" = 'CARD'), 0)::float8 AS card,
             COALESCE(SUM(p."amount"), 0)::float8 AS total
      FROM "SalePayment" p LEFT JOIN "User" u ON u."id" = p."userId"
      WHERE p."merchantId" = ${merchantId} AND ${payRange}
      GROUP BY u."id", u."name" ORDER BY 5 DESC`),

    prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
      SELECT COALESCE(SUM(s."total"), 0)::float8 AS total
      FROM "Sale" s
      WHERE s."merchantId" = ${merchantId} AND s."paymentMethod" = 'CREDIT' AND ${saleRange}`),

    // Current position, not range-bound
    prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
      SELECT COALESCE(SUM(s."total" - s."amountPaid"), 0)::float8 AS total
      FROM "Sale" s
      WHERE s."merchantId" = ${merchantId} AND s."paymentMethod" = 'CREDIT' AND s."settledAt" IS NULL`),
  ]);

  const total = sumOf(byDay, (r) => r.total);
  const cash = sumOf(byDay, (r) => r.cash);
  const mpesa = sumOf(byDay, (r) => r.mpesa);
  const card = sumOf(byDay, (r) => r.card);
  const repayments = sumOf(byDay, (r) => r.repayments);
  const deposits = sumOf(byMethod, (r) => r.deposit);
  const creditIssued = round2(creditSales[0].total - deposits);

  return {
    report: 'cash-collected',
    title: 'Cash Collected',
    merchantName: ctx.merchantName,
    currency: ctx.currency,
    range: { from, to, tz, group },
    cards: [
      { label: 'Total collected', value: total, type: 'money', tone: 'good' },
      { label: 'Cash', value: cash, type: 'money' },
      { label: 'M-Pesa', value: mpesa, type: 'money' },
      { label: 'Card', value: card, type: 'money' },
      { label: 'Credit repayments collected', value: repayments, type: 'money' },
      { label: 'Credit issued (unpaid at sale)', value: creditIssued, type: 'money', tone: 'warn' },
      { label: 'Credit outstanding now', value: round2(outstanding[0].total), type: 'money', tone: 'warn' },
    ],
    tables: [
      {
        name: 'by-period',
        title: group === 'day' ? 'By day' : group === 'week' ? 'By week' : 'By month',
        columns: [
          { key: 'period', header: periodHeader(group), width: 16 },
          { key: 'cash', header: 'Cash', type: 'money' },
          { key: 'mpesa', header: 'M-Pesa', type: 'money' },
          { key: 'card', header: 'Card', type: 'money' },
          { key: 'total', header: 'Total', type: 'money' },
          { key: 'repayments', header: 'of which repayments', type: 'money' },
        ],
        rows: byDay.map((r) => ({
          period: periodLabel(group, r.period),
          cash: round2(r.cash), mpesa: round2(r.mpesa), card: round2(r.card),
          total: round2(r.total), repayments: round2(r.repayments),
        })),
        totals: { period: 'Total', cash, mpesa, card, total, repayments },
      },
      {
        name: 'by-method',
        title: 'By method',
        columns: [
          { key: 'method', header: 'Method', width: 16 },
          { key: 'payments', header: 'Payments', type: 'int' },
          { key: 'sale', header: 'Paid at sale', type: 'money' },
          { key: 'deposit', header: 'Credit deposits', type: 'money' },
          { key: 'repayment', header: 'Credit repayments', type: 'money' },
          { key: 'total', header: 'Total', type: 'money' },
        ],
        rows: byMethod.map((r) => ({
          method: METHOD_LABELS[r.method] ?? r.method, payments: r.payments,
          sale: round2(r.sale), deposit: round2(r.deposit),
          repayment: round2(r.repayment), total: round2(r.total),
        })),
        totals: {
          method: 'Total', payments: byMethod.reduce((s, r) => s + r.payments, 0),
          sale: sumOf(byMethod, (r) => r.sale), deposit: deposits,
          repayment: sumOf(byMethod, (r) => r.repayment), total,
        },
      },
      {
        name: 'by-user',
        title: 'By person who received the money',
        columns: [
          { key: 'person', header: 'Received by', width: 24 },
          { key: 'cash', header: 'Cash', type: 'money' },
          { key: 'mpesa', header: 'M-Pesa', type: 'money' },
          { key: 'card', header: 'Card', type: 'money' },
          { key: 'total', header: 'Total', type: 'money' },
        ],
        rows: byUser.map((r) => ({
          person: r.person, cash: round2(r.cash), mpesa: round2(r.mpesa),
          card: round2(r.card), total: round2(r.total),
        })),
      },
    ],
    notes: [
      'Counts money on the day it was recorded, so a repayment received today counts today even if the sale was last month.',
      'Reconciles with the Sales Summary: Revenue − Credit issued + Credit repayments collected = Total collected (for the same dates).',
      'The Cash line is what was recorded as cash. Expected drawer cash also depends on the opening float and any expenses paid from the till.',
    ],
  };
}