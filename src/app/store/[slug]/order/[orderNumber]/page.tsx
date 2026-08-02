'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

const STATUS_STEPS = ['PENDING', 'CONFIRMED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Order received',
  CONFIRMED: 'Confirmed by store',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

interface OrderStatusResponse {
  orderNumber: string;
  status: string;
  total: number;
  deliveryAddress: string;
  items: { productName: string; quantity: number; unitPrice: number; subtotal: number }[];
}

export default function OrderTrackingPage() {
  const params = useParams<{ slug: string; orderNumber: string }>();
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<OrderStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/storefront/orders/${params.orderNumber}?phone=${encodeURIComponent(phone)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Order not found');
      setOrder(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const currentStepIndex = order ? STATUS_STEPS.indexOf(order.status) : -1;

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center px-4 py-10 text-gray-900">
      <div className="w-full max-w-md">
        <h1 className="text-xl font-bold mb-1">Track your order</h1>
        <p className="text-gray-500 mb-6">Order #{params.orderNumber}</p>

        {!order && (
          <div className="bg-white border rounded-xl p-5">
            <label className="block text-sm font-medium mb-1">Phone number used at checkout</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-3"
              placeholder="e.g. 0712345678"
            />
            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
            <button
              onClick={lookup}
              disabled={loading || !phone}
              className="w-full bg-emerald-600 text-white rounded-lg py-2.5 font-semibold disabled:opacity-50"
            >
              {loading ? 'Checking…' : 'Check status'}
            </button>
          </div>
        )}

        {order && (
          <div className="bg-white border rounded-xl p-5">
            {order.status === 'CANCELLED' ? (
              <div className="text-center py-4">
                <p className="text-red-600 font-semibold">This order was cancelled.</p>
              </div>
            ) : (
              <div className="flex justify-between mb-6">
                {STATUS_STEPS.map((step, i) => (
                  <div key={step} className="flex-1 text-center">
                    <div
                      className={`w-6 h-6 mx-auto rounded-full text-xs flex items-center justify-center ${
                        i <= currentStepIndex ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {i + 1}
                    </div>
                    <p className="text-[11px] mt-1 text-gray-500">{STATUS_LABEL[step]}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-sm text-gray-500 mb-2">Delivering to</p>
              <p className="font-medium mb-4">{order.deliveryAddress}</p>

              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span>
                    {item.productName} × {item.quantity}
                  </span>
                  <span>{Number(item.subtotal).toLocaleString()}</span>
                </div>
              ))}

              <div className="flex justify-between font-bold pt-3 border-t mt-2">
                <span>Total</span>
                <span>{Number(order.total).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
