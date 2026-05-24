import { prisma } from '@/lib/prisma';

export async function getSalesReport(merchantId: string) {
  const merchantFilter = { merchantId };

  const [totalSales, salesCount, cashSales, cardSales, mobileSales, creditSales] =
    await Promise.all([
      prisma.sale.aggregate({
        where: merchantFilter,
        _sum: { total: true },
      }),
      prisma.sale.count({
        where: merchantFilter,
      }),
      prisma.sale.aggregate({
        where: { ...merchantFilter, paymentMethod: 'CASH' },
        _sum: { total: true },
      }),
      prisma.sale.aggregate({
        where: { ...merchantFilter, paymentMethod: 'CARD' },
        _sum: { total: true },
      }),
      prisma.sale.aggregate({
        where: { ...merchantFilter, paymentMethod: 'MOBILE_MONEY' },
        _sum: { total: true },
      }),
      prisma.sale.aggregate({
        where: { ...merchantFilter, paymentMethod: 'CREDIT' },
        _sum: { total: true },
      }),
    ]);

  return {
    totalSales:  totalSales._sum.total  ?? 0,
    salesCount,
    cashSales:   cashSales._sum.total   ?? 0,
    cardSales:   cardSales._sum.total   ?? 0,
    mobileSales: mobileSales._sum.total ?? 0,
    creditSales: creditSales._sum.total ?? 0,
  };
}