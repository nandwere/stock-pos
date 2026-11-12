import { prisma } from '@/lib/prisma';
import type { ReceiptData, ReceiptPayment } from './receipt-shared';

export async function getReceiptData(
  merchantId: string,
  saleId: string,
  paymentId?: string | null
): Promise<ReceiptData | null> {
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, merchantId },
    include: {
      merchant: { select: { name: true, phone: true, address: true, logoUrl: true, currency: true, timezone: true } },
      user: { select: { name: true } },
      items: { include: { product: { select: { name: true, unit: true } } } },
      payments: { orderBy: { createdAt: 'asc' }, include: { user: { select: { name: true } } } },
    },
  });
  if (!sale) return null;

  const payments: ReceiptPayment[] = sale.payments.map((p) => ({
    id: p.id,
    kind: p.kind,
    method: p.method as ReceiptPayment['method'],
    amount: Number(p.amount),
    balanceAfter: Number(p.balanceAfter),
    reference: p.reference,
    createdAt: p.createdAt.toISOString(),
    receivedBy: p.user?.name ?? null,
  }));

  const payment = paymentId ? payments.find((p) => p.id === paymentId) ?? null : null;
  if (paymentId && !payment) return null;

  return {
    kind: payment ? 'PAYMENT' : 'SALE',
    merchant: sale.merchant,
    sale: {
      id: sale.id,
      saleNumber: sale.saleNumber,
      createdAt: sale.createdAt.toISOString(),
      cashier: sale.user?.name ?? null,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      paymentMethod: sale.paymentMethod,
      subtotal: Number(sale.subtotal),
      discount: Number(sale.discount),
      tax: Number(sale.tax),
      total: Number(sale.total),
      amountPaid: Number(sale.amountPaid),
      change: Number(sale.change),
      balance: Number(sale.total) - Number(sale.amountPaid),
      dueDate: sale.dueDate?.toISOString() ?? null,
      notes: sale.notes,
    },
    items: sale.items.map((i) => ({
      name: i.product.name,
      unit: i.product.unit,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      discount: Number(i.discount),
      subtotal: Number(i.subtotal),
    })),
    payments,
    payment,
  };
}