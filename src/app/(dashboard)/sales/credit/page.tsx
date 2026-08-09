// app/sales/credit/page.tsx
'use client';

import { formatCurrency } from '@/lib/utils';
import { useEffect, useState } from 'react';

type CreditSale = {
  id: string;
  saleNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  total: number;
  amountPaid: number;
  balance: number;
  dueDate: string | null;
  isOverdue: boolean;
  notifiedAt: string | null;
  createdAt: string; // ← new — sale date
};

export default function CreditSalesPage() {
  const [sales, setSales] = useState<CreditSale[]>([]);
  const [summary, setSummary] = useState({ count: 0, totalOutstanding: 0, overdueCount: 0 });
  const [loading, setLoading] = useState(true);
  const [repayTarget, setRepayTarget] = useState<CreditSale | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/sales/credit');
    const data = await res.json();
    setSales(data.sales);
    setSummary(data.summary);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-6 text-gray-500">Loading…</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto text-gray-900">
      <h1 className="text-2xl font-bold mb-4">Credit Sales</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">Open Accounts</div>
          <div className="text-2xl font-bold">{summary.count}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">Total Outstanding</div>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalOutstanding)}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-600">Overdue</div>
          <div className="text-2xl font-bold text-red-600">{summary.overdueCount}</div>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="p-3">Customer</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Sale Date</th>
              <th className="p-3">Sale Total</th>
              <th className="p-3">Balance</th>
              <th className="p-3">Due Date</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id} className={`border-t ${s.isOverdue ? 'bg-red-50' : ''}`}>
                <td className="p-3 font-medium">{s.customerName ?? '—'}</td>
                <td className="p-3">{s.customerPhone ?? '—'}</td>
                <td className="p-3 text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                <td className="p-3">{formatCurrency(s.total)}</td>
                <td className="p-3 font-semibold">{formatCurrency(s.balance)}</td>
                <td className="p-3">{s.dueDate ? new Date(s.dueDate).toLocaleDateString() : '—'}</td>
                <td className="p-3">
                  {s.isOverdue ? (
                    <span className="text-red-600 font-medium">Overdue</span>
                  ) : (
                    <span className="text-gray-500">Pending</span>
                  )}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => setRepayTarget(s)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                  >
                    Record Payment
                  </button>
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-gray-400">No outstanding credit sales.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {repayTarget && (
        <RepayModal
          sale={repayTarget}
          onClose={() => setRepayTarget(null)}
          onComplete={async () => { setRepayTarget(null); await load(); }}
        />
      )}
    </div>
  );
}

function RepayModal({ sale, onClose, onComplete }: { sale: CreditSale; onClose: () => void; onComplete: () => Promise<void> }) {
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const parsed = parseFloat(amount || '0');
  const canSubmit = parsed > 0 && parsed <= sale.balance && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/sales/${sale.id}/repay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parsed }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to record payment');
      }
      await onComplete();
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold mb-1">Record Payment</h2>
        <p className="text-sm text-gray-500 mb-4">{sale.customerName} — balance {formatCurrency(sale.balance)}</p>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={submitting}
          max={sale.balance}
          min={0}
          step="0.01"
          placeholder="Amount received"
          className="w-full px-4 py-2 border rounded-lg mb-2"
        />
        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} disabled={submitting} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
          <button onClick={handleSubmit} disabled={!canSubmit} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300">
            {submitting ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}