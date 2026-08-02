// app/api/storefront/[slug]/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createOrder, OrderError } from '@/lib/orderService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json();

  try {
    const order = await createOrder(slug, {
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      deliveryAddress: body.deliveryAddress,
      deliveryNotes: body.deliveryNotes,
      items: body.items,
    });

    return NextResponse.json(
      {
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[storefront order creation]', err);
    return NextResponse.json({ error: 'Could not place order. Please try again.' }, { status: 500 });
  }
}
