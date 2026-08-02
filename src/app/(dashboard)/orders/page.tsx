'use client';

// app/(dashboard)/orders/page.tsx
//
// Drop this into wherever your existing merchant dashboard routes live —
// it assumes it's rendered inside your own authenticated layout, and that
// requests to /api/admin/orders/** already carry whatever auth cookie/
// header your app uses (once lib/adminAuth.ts is wired up).

import { useEffect, useState, useCallback } from 'react';

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

interface OrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  status: OrderStatus;
  total: string;
  createdAt: string;
  items: { quantity: string; product: { name: string } }[];
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [loading, setLoading] = useState(true);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [deliverModalOrder, setDeliverModalOrder] = useState<OrderRow | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  const load = useCallback(async () => {
    setLoading(true);
    const qs = statusFilter ? `?status=${statusFilter}` : '';
    const res = await fetch(`/api/admin/orders${qs}`);
    const data = await res.json();
    setOrders(data.data ?? []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(orderId: string, action: string, extra?: Record<string, unknown>) {
    setActionOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Action failed');
      await load();
    } catch (e: any) {
      alert(e.message ?? 'Something went wrong');
    } finally {
      setActionOrderId(null);
      setDeliverModalOrder(null);
    }
  }

  return (
    <div className="p-6 text-gray-900">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Orders</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-1.5"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="OUT_FOR_DELIVERY">Out for delivery</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="p-3">Order #</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Items</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3">Placed</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="p-3 font-mono">{o.orderNumber}</td>
                  <td className="p-3">
                    <div>{o.customerName}</div>
                    <div className="text-gray-400">{o.customerPhone}</div>
                  </td>
                  <td className="p-3 text-gray-500">
                    {o.items.map((i) => `${i.product.name} ×${Number(i.quantity)}`).join(', ')}
                  </td>
                  <td className="p-3 font-medium">{Number(o.total).toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[o.status]}`}>
                      {o.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {o.status === 'PENDING' && (
                        <button
                          disabled={actionOrderId === o.id}
                          onClick={() => runAction(o.id, 'CONFIRM')}
                          className="text-blue-600 font-medium"
                        >
                          Confirm
                        </button>
                      )}
                      {o.status === 'CONFIRMED' && (
                        <button
                          disabled={actionOrderId === o.id}
                          onClick={() => runAction(o.id, 'OUT_FOR_DELIVERY')}
                          className="text-indigo-600 font-medium"
                        >
                          Dispatch
                        </button>
                      )}
                      {(o.status === 'CONFIRMED' || o.status === 'OUT_FOR_DELIVERY') && (
                        <button
                          disabled={actionOrderId === o.id}
                          onClick={() => setDeliverModalOrder(o)}
                          className="text-emerald-600 font-medium"
                        >
                          Mark delivered
                        </button>
                      )}
                      {(o.status === 'PENDING' || o.status === 'CONFIRMED') && (
                        <button
                          disabled={actionOrderId === o.id}
                          onClick={() => {
                            const reason = prompt('Reason for cancelling (optional)') ?? undefined;
                            runAction(o.id, 'CANCEL', { reason });
                          }}
                          className="text-red-600 font-medium"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-400">
                    No orders here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {deliverModalOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm">
            <h2 className="font-bold text-lg mb-3">Mark {deliverModalOrder.orderNumber} as delivered</h2>
            <label className="block text-sm font-medium mb-1">How did the customer pay?</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
            </select>
            <div className="flex gap-2">
              <button onClick={() => setDeliverModalOrder(null)} className="flex-1 border rounded-lg py-2">
                Cancel
              </button>
              <button
                onClick={() => runAction(deliverModalOrder.id, 'DELIVER', { paymentMethod })}
                disabled={actionOrderId === deliverModalOrder.id}
                className="flex-1 bg-emerald-600 text-white rounded-lg py-2 font-semibold"
              >
                Confirm delivery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
