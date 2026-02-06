import { prisma } from "@/lib/prisma";

export async function getSalesReport() {
  // Example query – adjust to your schema
  const [totalSales, salesCount, cashSales, cardSales] =
    await Promise.all([
      prisma.sale.aggregate({ _sum: { total: true } }),
      prisma.sale.count(),
      prisma.sale.aggregate({ where: { paymentMethod: "CASH" }, _sum: { total: true } }),
      prisma.sale.aggregate({ where: { paymentMethod: "CARD" }, _sum: { total: true } }),
    ]);

  return {
    totalSales: totalSales._sum.total ?? 0,
    salesCount,
    cashSales: cashSales._sum.total ?? 0,
    cardSales: cardSales._sum.total ?? 0,
  };
}
