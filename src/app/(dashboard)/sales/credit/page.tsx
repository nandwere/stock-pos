// app/sales/credit/page.tsx
'use client';

import { formatCurrency } from '@/lib/utils';
import { useEffect, useState } from 'react';


type Payment = {
  id: string;
  kind: 'SALE' | 'DEPOSIT' | 'REPAYMENT';
  method: 'CASH' | 'CARD' | 'MOBILE_MONEY';
  amount: number;
  balanceAfter: number;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  user: { name: string } | null;
};

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
  isSettled: boolean;
  notifiedAt: string | null;
  createdAt: string;
  payments: Payment[];
};

export default function CreditSalesPage() {
  const [sales, setSales] = useState<CreditSale[]>([]);
  const [summary, setSummary] = useState({ count: 0, totalOutstanding: 0, overdueCount: 0 });
  const [loading, setLoading] = useState(true);
  const [repayTarget, setRepayTarget] = useState<CreditSale | null>(null);
  const [status, setStatus] = useState<'open' | 'settled'>('open');
  const [savedPayment, setSavedPayment] = useState<{ saleId: string; paymentId: string } | null>(null);


  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/sales/credit?status=${status}`);
    const data = await res.json();
    setSales(data.sales);
    setSummary(data.summary);
    setLoading(false);
  };

  useEffect(() => { load(); }, [status]);



  if (loading) return <div className="p-4 sm:p-6 text-gray-500">Loading…</div>;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto text-gray-900">
      <h1 className="text-xl sm:text-2xl font-bold mb-4">Credit Sales</h1>

      <div className="flex gap-2 mb-4">
        {(['open', 'settled'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border ${status === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600'
              }`}
          >
            {s === 'open' ? 'Open' : 'Settled'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
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

      {/* Desktop/tablet: table with horizontal scroll if it still overflows */}
      <div className="hidden sm:block bg-white border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
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
                  {s.isSettled ? (
                    <span className="text-green-600 font-medium">Settled</span>
                  ) : s.isOverdue ? (
                    <span className="text-red-600 font-medium">Overdue</span>
                  ) : (
                    <span className="text-gray-500">Pending</span>
                  )}
                </td>
                <td className="p-3">
                  {!s.isSettled && (
                    <button onClick={() => setRepayTarget(s)} className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 whitespace-nowrap">
                      Record Payment
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-gray-400">No outstanding credit sales.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards instead of a cramped table */}
      <div className="sm:hidden space-y-3">
        {sales.length === 0 && (
          <div className="bg-white border rounded-lg p-6 text-center text-gray-400">
            No outstanding credit sales.
          </div>
        )}
        {sales.map((s) => (
          <div
            key={s.id}
            className={`bg-white border rounded-lg p-4 ${s.isOverdue ? 'bg-red-50 border-red-200' : ''}`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-medium">{s.customerName ?? '—'}</div>
                <div className="text-sm text-gray-500">{s.customerPhone ?? '—'}</div>
              </div>
              {s.isSettled ? (
                <span className="text-green-600 font-medium">Settled</span>
              ) : s.isOverdue ? (
                <span className="text-red-600 font-medium">Overdue</span>
              ) : (
                <span className="text-gray-500">Pending</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-y-1 text-sm mb-3">
              <div className="text-gray-500">Sale date</div>
              <div className="text-right">{new Date(s.createdAt).toLocaleDateString()}</div>
              <div className="text-gray-500">Sale total</div>
              <div className="text-right">{formatCurrency(s.total)}</div>
              <div className="text-gray-500">Balance</div>
              <div className="text-right font-semibold">{formatCurrency(s.balance)}</div>
              <div className="text-gray-500">Due date</div>
              <div className="text-right">{s.dueDate ? new Date(s.dueDate).toLocaleDateString() : '—'}</div>
            </div>

            {!s.isSettled && (
              <button onClick={() => setRepayTarget(s)} className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 whitespace-nowrap">
                Record Payment
              </button>
            )}

          </div>
        ))}
      </div>
      {savedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 text-center">
            <div className="text-green-600 font-bold mb-3">Payment recorded</div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={() =>
                  window.open(`/receipt/${savedPayment.saleId}?paymentId=${savedPayment.paymentId}&autoprint=1`, 'receipt', 'width=420,height=720')
                }
                className="py-2 bg-blue-600 text-white rounded-lg font-medium"
              >
                Print receipt
              </button>
              <a
                href={`/api/sales/${savedPayment.saleId}/receipt/pdf?paymentId=${savedPayment.paymentId}`}
                className="py-2 border rounded-lg font-medium flex items-center justify-center"
              >
                PDF
              </a>
            </div>
            <button onClick={() => setSavedPayment(null)} className="w-full py-2 text-gray-500">Done</button>
          </div>
        </div>
      )}

      {repayTarget && (
        <RepayModal
          sale={repayTarget}
          onClose={() => setRepayTarget(null)}
          onComplete={async (paymentId) => {
            const saleId = repayTarget.id;
            setRepayTarget(null);
            setSavedPayment({ saleId, paymentId });
            await load();
          }}
        />
      )}
    </div>
  );
}

const METHOD_LABELS = { CASH: 'Cash', MOBILE_MONEY: 'M-Pesa', CARD: 'Card' } as const;

function RepayModal({ sale, onClose, onComplete }: { sale: CreditSale; onClose: () => void; onComplete: (paymentId: string) => Promise<void> }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'CASH' | 'MOBILE_MONEY' | 'CARD'>('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const readOnly = sale.isSettled;
  const parsed = parseFloat(amount || '0');
  const canSubmit = !readOnly && parsed > 0 && parsed <= sale.balance && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/sales/${sale.id}/repay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsed,
          method,
          reference: method === 'MOBILE_MONEY' || method === 'CARD' ? reference : undefined,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to record payment');
      }
      await onComplete((await res.json()).id);
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6">
        <h2 className="text-lg font-bold mb-1">{readOnly ? 'Payment History' : 'Record Payment'}</h2>
        <p className="text-sm text-gray-500 mb-4">
          {sale.customerName} — {readOnly ? `total ${formatCurrency(sale.total)}` : `balance ${formatCurrency(sale.balance)}`}
        </p>

        {!readOnly && (
          <div className="space-y-3 mb-4">
            <div className="flex gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={submitting}
                max={sale.balance}
                min={0}
                step="0.01"
                placeholder="Amount received"
                className="flex-1 px-4 py-2 border rounded-lg text-base"
              />
              <button
                type="button"
                onClick={() => setAmount(String(sale.balance))}
                disabled={submitting}
                className="px-3 py-2 border rounded-lg text-sm whitespace-nowrap"
              >
                Full balance
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['CASH', 'MOBILE_MONEY', 'CARD'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  disabled={submitting}
                  className={`py-2 rounded-lg border text-sm font-medium ${method === m ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300'
                    }`}
                >
                  {METHOD_LABELS[m]}
                </button>
              ))}
            </div>

            {method !== 'CASH' && (
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={submitting}
                placeholder={method === 'MOBILE_MONEY' ? 'M-Pesa code (e.g. SKL4X7Y2AB)' : 'Reference'}
                className="w-full px-4 py-2 border rounded-lg text-base uppercase"
              />
            )}

            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              placeholder="Notes (optional)"
              className="w-full px-4 py-2 border rounded-lg text-base"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

        {sale.payments.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Payments</div>
            <ul className="divide-y border rounded-lg text-sm">
              {sale.payments.map((p) => (
                <li key={p.id} className="p-2 flex justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {formatCurrency(p.amount)}{' '}
                      <span className="text-gray-400 font-normal">
                        · {p.kind === 'DEPOSIT' ? 'Deposit' : p.kind === 'REPAYMENT' ? 'Repayment' : 'Paid'} · {METHOD_LABELS[p.method]}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {new Date(p.createdAt).toLocaleString()}
                      {p.user?.name ? ` · ${p.user.name}` : ''}
                      {p.reference ? ` · ${p.reference}` : ''}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    Bal {formatCurrency(p.balanceAfter)}
                  </div>
                  <a
                    href={`/receipt/${sale.id}?paymentId=${p.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600"
                  >
                    Receipt
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} disabled={submitting} className="flex-1 px-4 py-2 border rounded-lg">
            {readOnly ? 'Close' : 'Cancel'}
          </button>
          {!readOnly && (
            <button onClick={handleSubmit} disabled={!canSubmit} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300">
              {submitting ? 'Saving…' : 'Confirm'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}