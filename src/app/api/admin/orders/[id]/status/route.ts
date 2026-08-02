// app/api/admin/orders/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireStaffUser } from '@/lib/adminAuth';
import { advanceOrderStatus, cancelOrder, deliverOrder, OrderError } from '@/lib/orderService';

type Action = 'CONFIRM' | 'OUT_FOR_DELIVERY' | 'DELIVER' | 'CANCEL';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requireStaffUser(req);
    const { id } = await params;
    const body = await req.json();
    const action = body.action as Action;

    switch (action) {
      case 'CONFIRM': {
        const order = await advanceOrderStatus(staff.merchantId, id, 'CONFIRMED');
        return NextResponse.json({ success: true, order });
      }
      case 'OUT_FOR_DELIVERY': {
        const order = await advanceOrderStatus(staff.merchantId, id, 'OUT_FOR_DELIVERY');
        return NextResponse.json({ success: true, order });
      }
      case 'DELIVER': {
        if (!body.paymentMethod) {
          return NextResponse.json({ error: 'paymentMethod is required to mark an order delivered' }, { status: 400 });
        }
        const result = await deliverOrder(staff.merchantId, id, staff.userId, body.paymentMethod);
        return NextResponse.json({ success: true, ...result });
      }
      case 'CANCEL': {
        await cancelOrder(staff.merchantId, id, staff.userId, body.reason);
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[admin order status transition]', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
