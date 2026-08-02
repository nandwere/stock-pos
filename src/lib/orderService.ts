// lib/orderService.ts
//
// ── Stock accounting model for storefront orders ────────────────────────
//
// Your existing TransactionType enum (ADJUSTMENT_ADD/REMOVE, SALE, DAMAGE,
// THEFT, EXPIRY, CORRECTION, RETURN) doesn't have a clean "reserved for a
// pending online order" meaning — none of those are quite right for stock
// that's committed but not yet a completed transaction. Rather than force
// a bad fit, the model here is:
//
//   PLACED     → Product.currentStock decremented directly. No
//                StockAdjustment row (nothing "adjusted" — this is a
//                normal, expected stock movement pending fulfillment).
//   CANCELLED  → Product.currentStock restored, AND a StockAdjustment
//                (type: RETURN) IS written — this is an authenticated
//                admin action, so there's a real userId to attribute it
//                to, and "why did stock come back" is exactly what your
//                adjustment audit trail is for.
//   DELIVERED  → A real Sale + SaleItem rows are created (so it shows up
//                in your existing sales reporting / DailySummary), but
//                stock is NOT decremented again — it already was, at
//                placement.
//
// ⚠️  IMPORTANT: if your existing POS checkout code creates a Sale via
// some shared helper that ALSO decrements stock as a side effect (e.g. a
// `createSale()` function, or a Prisma middleware/extension hooked on
// Sale creation), do NOT reuse that helper here — it would double-decrement
// stock that was already removed at order placement. The Sale creation
// below is a plain `prisma.sale.create(...)`, deliberately bypassing
// whatever your POS-side stock-deduction logic is.

import { Prisma, PaymentMethod } from '@prisma/client';
import { prisma } from './prisma';
import { generateOrderNumber } from './orderNumber';

export class OrderError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryNotes?: string;
  items: { productId: string; quantity: number }[];
}

export async function createOrder(merchantSlug: string, input: CreateOrderInput) {
  if (!input.items?.length) throw new OrderError(400, 'Order must include at least one item');
  if (!input.customerName?.trim()) throw new OrderError(400, 'Customer name is required');
  if (!input.customerPhone?.trim()) throw new OrderError(400, 'Customer phone is required');
  if (!input.deliveryAddress?.trim()) throw new OrderError(400, 'Delivery address is required');

  const merchant = await prisma.merchant.findUnique({ where: { slug: merchantSlug } });
  if (!merchant || !merchant.isActive || !merchant.storefrontEnabled) {
    throw new OrderError(404, 'This store is not currently accepting orders');
  }

  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, merchantId: merchant.id, isActive: true },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Validate every requested product exists, belongs to this merchant, and
  // has enough stock — BEFORE the transaction, so we can give a specific
  // error message rather than a generic transaction rollback.
  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) throw new OrderError(400, `Product ${item.productId} is not available`);
    if (item.quantity <= 0) throw new OrderError(400, `Invalid quantity for ${product.name}`);
    if (Number(product.currentStock) < item.quantity) {
      throw new OrderError(409, `${product.name} only has ${product.currentStock} ${product.unit} left`);
    }
  }

  let subtotal = new Prisma.Decimal(0);
  const orderItemsData = input.items.map((item) => {
    const product = productMap.get(item.productId)!;
    const unitPrice = product.sellingPrice;
    const itemSubtotal = unitPrice.times(item.quantity);
    subtotal = subtotal.plus(itemSubtotal);

    return {
      productId: product.id,
      quantity: new Prisma.Decimal(item.quantity),
      unitPrice,
      subtotal: itemSubtotal,
    };
  });

  const deliveryFee = merchant.deliveryFee;
  const total = subtotal.plus(deliveryFee);
  const orderNumber = generateOrderNumber();

  const order = await prisma.$transaction(async (tx) => {
    // Re-check stock INSIDE the transaction too — the pre-check above is
    // for a fast, specific error message; this is what actually prevents
    // a race between two concurrent orders for the last unit of stock.
    for (const item of input.items) {
      const fresh = await tx.product.findUnique({ where: { id: item.productId } });
      if (!fresh || Number(fresh.currentStock) < item.quantity) {
        throw new OrderError(409, `${fresh?.name ?? 'A product'} just went out of stock. Please review your cart.`);
      }
    }

    const created = await tx.order.create({
      data: {
        merchantId: merchant.id,
        orderNumber,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        deliveryAddress: input.deliveryAddress.trim(),
        deliveryNotes: input.deliveryNotes?.trim(),
        subtotal,
        deliveryFee,
        total,
        items: { create: orderItemsData },
      },
      include: { items: { include: { product: true } } },
    });

    for (const item of input.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: item.quantity } },
      });
    }

    return created;
  });

  return order;
}

export async function cancelOrder(merchantId: string, orderId: string, adminUserId: string, reason?: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, merchantId }, include: { items: true } });
  if (!order) throw new OrderError(404, 'Order not found');

  if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
    throw new OrderError(400, `Cannot cancel an order that is already ${order.status.toLowerCase()}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
    });

    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { increment: item.quantity } },
      });

      await tx.stockAdjustment.create({
        data: {
          merchantId,
          productId: item.productId,
          userId: adminUserId,
          type: 'RETURN',
          quantity: item.quantity,
          reason: `Order ${order.orderNumber} cancelled${reason ? `: ${reason}` : ''}`,
        },
      });
    }
  });
}

/**
 * Advances an order to CONFIRMED or OUT_FOR_DELIVERY — simple status +
 * timestamp updates, no stock/accounting side effects.
 */
export async function advanceOrderStatus(
  merchantId: string,
  orderId: string,
  nextStatus: 'CONFIRMED' | 'OUT_FOR_DELIVERY',
) {
  const order = await prisma.order.findFirst({ where: { id: orderId, merchantId } });
  if (!order) throw new OrderError(404, 'Order not found');

  const validTransitions: Record<string, string[]> = {
    PENDING: ['CONFIRMED'],
    CONFIRMED: ['OUT_FOR_DELIVERY'],
  };

  if (!validTransitions[order.status]?.includes(nextStatus)) {
    throw new OrderError(400, `Cannot move an order from ${order.status} to ${nextStatus}`);
  }

  const timestampField = nextStatus === 'CONFIRMED' ? 'confirmedAt' : 'outForDeliveryAt';

  return prisma.order.update({
    where: { id: orderId },
    data: { status: nextStatus, [timestampField]: new Date() },
  });
}

/**
 * Marks an order DELIVERED and converts it into a real Sale, so it shows
 * up in existing reporting alongside in-person POS sales. Does NOT touch
 * stock — see the module-level comment for why.
 */
export async function deliverOrder(
  merchantId: string,
  orderId: string,
  staffUserId: string,
  paymentMethod: PaymentMethod,
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, merchantId },
    include: { items: { include: { product: true } } },
  });
  if (!order) throw new OrderError(404, 'Order not found');

  if (order.status !== 'OUT_FOR_DELIVERY' && order.status !== 'CONFIRMED') {
    throw new OrderError(400, `Cannot deliver an order that is ${order.status}`);
  }

  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        merchantId,
        saleNumber: order.orderNumber, // reuse — already unique per merchant
        userId: staffUserId,
        customerName: order.customerName,
        paymentMethod,
        subtotal: order.subtotal,
        tax: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        total: order.total,
        amountPaid: order.total,
        change: new Prisma.Decimal(0),
        notes: `Converted from storefront order ${order.orderNumber}`,
        items: {
          create: order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            // Pulled from the product's current cost price at delivery time
            // (not at order-placement time) — matters for gross profit
            // accuracy if costs change between order and delivery.
            costPrice: item.product.costPrice,
            subtotal: item.subtotal,
          })),
        },
      },
    });

    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        paymentMethod,
        saleId: sale.id,
      },
    });

    return { order: updated, sale };
  });
}

/**
 * Order-status lookup for customers — requires the phone number to match,
 * so an order number alone (easily guessable / sequential-looking) isn't
 * enough to see someone else's delivery address.
 */
export async function getOrderForCustomer(orderNumber: string, phone: string) {
  const order = await prisma.order.findFirst({
    where: { orderNumber, customerPhone: phone.trim() },
    include: { items: { include: { product: true } } },
  });
  if (!order) throw new OrderError(404, 'Order not found. Check your order number and phone number.');
  return order;
}
