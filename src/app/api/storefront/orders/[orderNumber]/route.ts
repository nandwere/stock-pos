// app/api/storefront/orders/[orderNumber]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOrderForCustomer, OrderError } from '@/lib/orderService';

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const phone = req.nextUrl.searchParams.get('phone');

  if (!phone) {
    return NextResponse.json({ error: 'Phone number is required to look up an order' }, { status: 400 });
  }

  try {
    const order = await getOrderForCustomer(orderNumber, phone);
    return NextResponse.json({
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      deliveryAddress: order.deliveryAddress,
      items: order.items.map((i) => ({
        productName: i.product.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.subtotal,
      })),
      createdAt: order.createdAt,
      confirmedAt: order.confirmedAt,
      outForDeliveryAt: order.outForDeliveryAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
    });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[storefront order lookup]', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
