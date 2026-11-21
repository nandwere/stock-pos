'use client';

import Link from 'next/link';
import { FileText, Loader2, Receipt } from 'lucide-react';
import { useBillingStatus, useInvoices } from '@/lib/hooks/use-billing';
import { makeMoney } from '@/lib/receipt-shared';
import type { BillingStatusView, InvoiceView } from '@/lib/billing-shared';

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-KE', { dateStyle: 'medium', timeZone: 'Africa/Nairobi' }) : '—';

const STATUS_STYLE: Record<InvoiceView['status'], string> = {
  OPEN: 'bg-amber-100 text-amber-800',
  PAID: 'bg-green-100 text-green-800',
  VOID: 'bg-gray-100 text-gray-600',
};
const STATUS_LABEL: Record<InvoiceView['status'], string> = { OPEN: 'Awaiting payment', PAID: 'Paid', VOID: 'Void' };

function summary(s: BillingStatusView): { tone: string; title: string; text: string } {
  const what = s.isTrial ? 'free trial' : `${s.subscribedPlan.name} plan`;
  if (!s.expiresAt) return { tone: 'bg-gray-50 border-gray-200 text-gray-700', title: `${s.plan.name} plan`, text: 'No renewal date: this plan does not expire.' };
  if (s.state === 'lapsed') return { tone: 'bg-red-50 border-red-200 text-red-800', title: `Now on the ${s.plan.name} plan`, text: `Your ${what} ended on ${fmt(s.expiresAt)}. Renew to get your features back.` };
  if (s.state === 'grace') return { tone: 'bg-orange-50 border-orange-200 text-orange-800', title: 'Payment overdue', text: `Your ${what} ended on ${fmt(s.expiresAt)}. Everything keeps working until ${fmt(s.graceEndsAt)}, then your account moves to the ${s.plan.name === s.subscribedPlan.name ? 'Free' : s.plan.name} plan.` };
  if (s.state === 'expiring') return { tone: 'bg-amber-50 border-amber-200 text-amber-800', title: `${s.daysLeft} ${s.daysLeft === 1 ? 'day' : 'days'} left`, text: `Your ${what} ends on ${fmt(s.expiresAt)}.` };
  return { tone: 'bg-green-50 border-green-200 text-green-800', title: `${s.subscribedPlan.name} plan`, text: `${s.isTrial ? 'Free trial runs' : 'Paid'} until ${fmt(s.expiresAt)}.` };
}

export default function BillingPage() {
  const { data: status, isLoading: l1 } = useBillingStatus();
  const { data: invoices = [], isLoading: l2 } = useInvoices();

  if (l1 || l2) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  if (!status?.canManage) return <div className="p-6 text-gray-600">You don&apos;t have access to billing.</div>;

  const s = summary(status);
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-gray-600 mt-1">Your plan, invoices and receipts</p>
        </div>
        <Link href="/upgrade" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
          {status.expiresAt ? 'Renew or change plan' : 'View plans'}
        </Link>
      </div>

      <div className={`border rounded-lg p-5 ${s.tone}`}>
        <p className="font-semibold">{s.title}</p>
        <p className="text-sm mt-1">{s.text}</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Invoice', 'Description', 'Issued', 'Amount', 'Status', 'Documents'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoices.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">No invoices yet. They appear here when you choose a plan.</td></tr>
            )}
            {invoices.map(i => (
              <tr key={i.id}>
                <td className="px-4 py-3 font-mono text-xs">{i.number}</td>
                <td className="px-4 py-3">
                  {i.description}
                  {i.status === 'PAID' && i.periodStart && i.periodEnd && (
                    <p className="text-xs text-gray-500">{fmt(i.periodStart)} – {fmt(i.periodEnd)}</p>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{fmt(i.issuedAt)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{makeMoney(i.currency)(i.amount)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[i.status]}`}>{STATUS_LABEL[i.status]}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <a href={`/api/billing/invoices/${i.id}/pdf?type=invoice`} className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                      <FileText className="w-4 h-4" /> Invoice
                    </a>
                    {i.status === 'PAID' && (
                      <a href={`/api/billing/invoices/${i.id}/pdf?type=receipt`} className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                        <Receipt className="w-4 h-4" /> Receipt
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
