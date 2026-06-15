import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session   = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url       = new URL(request.url);
  const startDate = url.searchParams.get('startDate');
  const endDate   = url.searchParams.get('endDate');

  const dateFilter = (startDate || endDate) ? {
    expenseDate: {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate   && { lte: new Date(endDate)   }),
    },
  } : {};

  const base = { merchantId: session.merchantId, ...dateFilter };

  const [
    totalByStatus,
    totalByCategory,
    totalBySupplier,
    monthlyTrend,
    overdueCount,
  ] = await Promise.all([

    // Totals grouped by status
    prisma.expense.groupBy({
      by:    ['status'],
      where: base,
      _sum:  { total: true },
      _count: true,
    }),

    // Totals grouped by category
    prisma.expense.groupBy({
      by:    ['categoryId'],
      where: { ...base, status: { in: ['APPROVED', 'PAID'] } },
      _sum:  { total: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
      take:  10,
    }),

    // Top suppliers by spend
    prisma.expense.groupBy({
      by:    ['supplierId'],
      where: { ...base, status: 'PAID', supplierId: { not: null } },
      _sum:  { total: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
      take:  5,
    }),

    // Monthly trend — last 6 months
    prisma.$queryRaw<{ month: string; total: number }[]>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', "expenseDate"), 'YYYY-MM') AS month,
        SUM(total)::float AS total
      FROM "Expense"
      WHERE
        "merchantId" = ${session.merchantId}
        AND status IN ('APPROVED','PAID')
        AND "expenseDate" >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', "expenseDate")
      ORDER BY DATE_TRUNC('month', "expenseDate")
    `,

    // Overdue — approved but not paid and past due date
    prisma.expense.count({
      where: {
        merchantId: session.merchantId,
        status:     'APPROVED',
        dueDate:    { lt: new Date() },
      },
    }),
  ]);

  // Enrich category data with names
  const categoryIds = totalByCategory.map(c => c.categoryId).filter(Boolean) as string[];
  const categories  = await prisma.expenseCategory.findMany({
    where:  { id: { in: categoryIds } },
    select: { id: true, name: true, color: true },
  });
  const catMap = new Map(categories.map(c => [c.id, c]));

  // Enrich supplier data with names
  const supplierIds = totalBySupplier.map(s => s.supplierId).filter(Boolean) as string[];
  const suppliers   = await prisma.supplier.findMany({
    where:  { id: { in: supplierIds } },
    select: { id: true, name: true },
  });
  const supMap = new Map(suppliers.map(s => [s.id, s]));

  return NextResponse.json({
    byStatus: totalByStatus.map(s => ({
      status: s.status,
      count:  s._count,
      total:  Number(s._sum.total ?? 0),
    })),
    byCategory: totalByCategory.map(c => ({
      category: catMap.get(c.categoryId ?? '') ?? { name: 'Uncategorised' },
      count:    c._count,
      total:    Number(c._sum.total ?? 0),
    })),
    bySupplier: totalBySupplier.map(s => ({
      supplier: supMap.get(s.supplierId ?? '') ?? { name: 'Unknown' },
      count:    s._count,
      total:    Number(s._sum.total ?? 0),
    })),
    monthlyTrend,
    overdueCount,
  });
}