'use client';

import { useState, useMemo } from 'react';
import {
  CheckCheck, Loader2, Receipt, Search, Clock,
  CheckCircle2, XCircle, Package, X
} from 'lucide-react';
import { useHandlePaymentRequest, usePaymentRequests } from '@/lib/hooks/use-payments';
import { Plan, PLAN_LABELS } from '@/lib/plans';
import { PaymentRequest } from '@/types';

// ── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon, label, value, color,
}: {
  icon: React.ElementType; label: string; value: number; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

// ── Reject modal ──────────────────────────────────────────────────────────────

function RejectModal({
  req,
  onConfirm,
  onCancel,
  isPending,
}: {
  req: PaymentRequest;
  onConfirm: (notes: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Reject payment request</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
          <p><span className="text-gray-500">Code:</span> <span className="font-mono font-bold">{req.transactionCode}</span></p>
          <p><span className="text-gray-500">Plan:</span> <span className="font-medium">{req.plan}</span></p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Reason <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. Transaction not found, amount mismatch..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(note)}
            disabled={isPending}
            className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold
                       hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PaymentRequestsPage() {
  const { data: requests = [], isLoading } = usePaymentRequests();
  const { mutate: handle, isPending }      = useHandlePaymentRequest();

  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'REJECTED'>('ALL');
  const [rejectTarget, setRejectTarget] = useState<PaymentRequest | null>(null);

  // ── Derived data ────────────────────────────────────────────────
  const summary = useMemo(() => ({
    pending:   requests.filter(r => r.status === 'PENDING').length,
    confirmed: requests.filter(r => r.status === 'CONFIRMED').length,
    rejected:  requests.filter(r => r.status === 'REJECTED').length,
    total:     requests.length,
  }), [requests]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return requests.filter(r => {
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchesSearch =
        !q ||
        r.transactionCode.toLowerCase().includes(q) ||
        r.plan.toLowerCase().includes(q) ||
        r.merchant?.name.toLowerCase().includes(q) ||
        r.merchant?.slug.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [requests, search, statusFilter]);

  // Sort: pending first, then newest
  const sorted = useMemo(() => [
    ...filtered.filter(r => r.status === 'PENDING').sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    ...filtered.filter(r => r.status !== 'PENDING').sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
  ], [filtered]);

  if (isLoading && requests.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading payment requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-9xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Receipt className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Requests</h1>
          <p className="text-gray-500 text-sm mt-0.5">Review and activate M-Pesa plan payments</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={Package}       label="Total"     value={summary.total}     color="bg-blue-100 text-blue-600"   />
        <SummaryCard icon={Clock}         label="Pending"   value={summary.pending}   color="bg-orange-100 text-orange-600"/>
        <SummaryCard icon={CheckCircle2}  label="Confirmed" value={summary.confirmed} color="bg-green-100 text-green-600" />
        <SummaryCard icon={XCircle}       label="Rejected"  value={summary.rejected}  color="bg-red-100 text-red-500"     />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code, plan, or merchant..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['ALL', 'PENDING', 'CONFIRMED', 'REJECTED'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors
                ${statusFilter === s
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'}`}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              {s !== 'ALL' && (
                <span className="ml-1.5 text-gray-400">
                  {summary[s.toLowerCase() as keyof typeof summary]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">M-Pesa Code</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No payment requests found</p>
                    {search && (
                      <button onClick={() => setSearch('')}
                        className="mt-2 text-xs text-blue-600 hover:underline">
                        Clear search
                      </button>
                    )}
                  </td>
                </tr>
              ) : sorted.map(req => (
                <tr key={String(req.id)}
                  className={`hover:bg-gray-50 transition-colors
                    ${req.status === 'PENDING' ? 'bg-orange-50/40' : ''}`}
                >
                  {/* Date */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <p className="text-sm text-gray-900">
                      {new Date(req.createdAt).toLocaleDateString('en-KE', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(req.createdAt).toLocaleTimeString('en-KE', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </td>

                  {/* M-Pesa code */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="font-mono font-bold text-gray-900 text-sm tracking-wider">
                      {req.transactionCode}
                    </span>
                  </td>

                  {/* Plan */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full
                      ${PLAN_LABELS[req.plan as Plan]?.color ?? 'bg-gray-100 text-gray-700'}`}>
                      {req.plan}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {PLAN_LABELS[req.plan as Plan]?.price ?? '—'}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                      ${req.status === 'PENDING'   ? 'bg-orange-100 text-orange-700'
                      : req.status === 'CONFIRMED' ? 'bg-green-100 text-green-700'
                      :                              'bg-red-100 text-red-600'}`}>
                      {req.status === 'PENDING'   && <Clock         className="w-3 h-3" />}
                      {req.status === 'CONFIRMED' && <CheckCircle2  className="w-3 h-3" />}
                      {req.status === 'REJECTED'  && <XCircle       className="w-3 h-3" />}
                      {req.status.charAt(0) + req.status.slice(1).toLowerCase()}
                    </span>
                  </td>

                  {/* Notes */}
                  <td className="px-5 py-4 max-w-[180px]">
                    <p className="text-xs text-gray-500 truncate" title={req.notes ? req.notes.toString() : 'No notes'}>
                      {req.notes ? req.notes.toString() : <span className="text-gray-300">—</span>}
                    </p>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 whitespace-nowrap text-right">
                    {req.status === 'PENDING' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handle({ id: String(req.id), action: 'confirm' })}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg
                                     text-xs font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {isPending
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <CheckCheck className="w-3 h-3" />}
                          Confirm
                        </button>
                        <button
                          onClick={() => setRejectTarget(req)}
                          className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg
                                     text-xs font-semibold hover:bg-red-50 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        {sorted.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            Showing {sorted.length} of {requests.length} requests
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          req={rejectTarget}
          isPending={isPending}
          onConfirm={notes => {
            handle({ id: String(rejectTarget.id), action: 'reject', notes });
            setRejectTarget(null);
          }}
          onCancel={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}