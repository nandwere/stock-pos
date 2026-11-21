'use client';

import { useState } from 'react';
import { Check, Zap, Phone, Copy, CheckCheck, X, Loader2, Receipt, FileText } from 'lucide-react';
import { FEATURE_NAMES, formatPlanPrice, limitLabel, planColorClass, type PlanConfig } from '@/lib/plans';
import { usePlans } from '@/lib/hooks/use-plans';
import { useBillingStatus, useCreateInvoice } from '@/lib/hooks/use-billing';
import { PAY_NAME as MPESA_NAME, PAY_NUMBER as MPESA_NUMBER, PERIOD_OPTIONS, type InvoiceView } from '@/lib/billing-shared';
import { makeMoney } from '@/lib/receipt-shared';

// ── Payment Modal ────────────────────────────────────────────────────────────

function PaymentModal({ invoice, colorKey, onClose }: { invoice: InvoiceView; colorKey?: string; onClose: () => void }) {
  const meta = { label: invoice.planName, color: planColorClass(colorKey), price: makeMoney(invoice.currency)(invoice.amount) };
  const [code, setCode]       = useState('');
  const [copied, setCopied]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]     = useState('');

  function copyNumber() {
    navigator.clipboard.writeText(MPESA_NUMBER.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return setError('Enter your M-Pesa transaction code');
    if (!/^[A-Z0-9]{10}$/i.test(code.trim())) {
      return setError('Transaction codes are 10 characters e.g. QHK2XY1234');
    }
    setError('');
    setLoading(true);
    try {
      const res  = await fetch('/api/merchants/payment-requests', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ invoiceId: invoice.id, transactionCode: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Submission failed');
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Pay via M-Pesa</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Activating <span className={`font-semibold px-1.5 py-0.5 rounded text-xs ${meta.color}`}>{meta.label}</span> plan
              {' · '}{invoice.periodMonths} {invoice.periodMonths === 1 ? 'month' : 'months'}
            </p>
            <a href={`/api/billing/invoices/${invoice.id}/pdf?type=invoice`}
               className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
              <FileText className="w-3 h-3" /> Invoice {invoice.number}
            </a>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          /* ── Success state ── */
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCheck className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Request received!</h3>
              <p className="text-gray-500 text-sm mt-1">
                We'll verify your payment and activate your <strong>{meta.label}</strong> plan
                within <strong>30 minutes</strong> during business hours.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-left text-sm">
              <p className="text-gray-500">Transaction code submitted:</p>
              <p className="font-mono font-bold text-gray-900 mt-0.5">{code.toUpperCase()}</p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Amount */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-sm text-green-700 font-medium">Amount to send</p>
              <p className="text-3xl font-bold text-green-800 mt-1">{meta.price}</p>
            </div>

            {/* Step 1 — Send money */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  1
                </span>
                <p className="text-sm font-semibold text-gray-800">Send M-Pesa to this number</p>
              </div>
              <div className="ml-8 bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-green-600" />
                    <span className="text-2xl font-bold text-gray-900 tracking-wide">{MPESA_NUMBER}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{MPESA_NAME}</p>
                </div>
                <button
                  onClick={copyNumber}
                  title="Copy number"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300
                             rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {copied
                    ? <><CheckCheck className="w-3.5 h-3.5 text-green-600" /> Copied</>
                    : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              </div>
              <p className="ml-8 text-xs text-gray-400">
                Use <strong>Lipa na M-Pesa → Send Money</strong> or Paybill
              </p>
            </div>

            {/* Step 2 — Enter code */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  2
                </span>
                <p className="text-sm font-semibold text-gray-800">Enter the M-Pesa confirmation code</p>
              </div>
              <div className="ml-8 space-y-2">
                <div className="relative">
                  <Receipt className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    value={code}
                    onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
                    placeholder="e.g. QHK2XY1234"
                    maxLength={10}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg font-mono uppercase
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest"
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Found in the SMS M-Pesa sends after a successful payment
                </p>
                {error && (
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                )}
              </div>

              <div className="ml-8 pt-1">
                <button
                  type="submit"
                  disabled={loading || code.length < 6}
                  className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700
                             disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2
                             transition-colors"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Submitting...' : 'Submit Payment'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function UpgradePage() {
  const [invoice, setInvoice] = useState<{ invoice: InvoiceView; color: string } | null>(null);
  const [months, setMonths] = useState<number>(1);
  const [error, setError] = useState('');
  const { data: plans = [], isLoading } = usePlans();
  const { data: status } = useBillingStatus();
  const createInvoice = useCreateInvoice();
  const subscribedKey = status?.subscribedPlan.key;

  async function choose(plan: PlanConfig) {
    setError('');
    try {
      const inv = await createInvoice.mutateAsync({ plan: plan.key, months });
      setInvoice({ invoice: inv, color: plan.color });
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
          <Zap className="w-4 h-4" /> Upgrade your plan
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Choose the right plan</h1>
        <p className="text-gray-500 mt-2">Scale as your business grows. Pay via M-Pesa.</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm text-gray-500 mr-1">Billing period</span>
        {PERIOD_OPTIONS.map(m => (
          <button key={m} onClick={() => setMonths(m)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border ${months === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
            {m === 12 ? '12 months' : m === 1 ? '1 month' : `${m} months`}
          </button>
        ))}
      </div>
      {error && <p className="text-center text-sm text-red-600">{error}</p>}

      {isLoading && (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map(plan => {
          const meta      = { label: plan.name, color: planColorClass(plan.color), price: formatPlanPrice(plan), description: plan.description };
          const isPopular = plan.isPopular;
          const subscribed = plan.key === subscribedKey;
          const renewable  = subscribed && !!status?.expiresAt;               // paid plan with an end date
          const isCurrent  = subscribed && !renewable;                         // no expiry: nothing to buy
          const payable    = !plan.contactOnly && plan.price > 0 && !isCurrent;

          return (
            <div
              key={plan.key}
              className={`relative bg-white rounded-xl border-2 p-6 flex flex-col gap-4
                ${isPopular ? 'border-blue-500 shadow-lg' : 'border-gray-200'}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most popular
                  </span>
                </div>
              )}

              <div>
                <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full mb-3 ${meta.color}`}>
                  {meta.label}
                </span>
                <p className="text-2xl font-bold text-gray-900">{meta.price}</p>
                {payable && months > 1 && (
                  <p className="text-xs text-gray-500 mt-0.5">{makeMoney('KES')(plan.price * months)} for {months} months</p>
                )}
                <p className="text-sm text-gray-500 mt-1">{meta.description}</p>
              </div>

              <ul className="space-y-2 flex-1">
                <FeatureLine label={`${limitLabel(plan.maxProducts)} products`} />
                <FeatureLine label={`${limitLabel(plan.maxUsers)} user${plan.maxUsers === 1 ? '' : 's'}`} />
                {plan.features.map(f => (
                  <FeatureLine key={f} label={FEATURE_NAMES[f]} />
                ))}
              </ul>

              <button
                onClick={() => payable && !createInvoice.isPending && choose(plan)}
                className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors
                  ${isCurrent || (!payable && !plan.contactOnly)
                    ? 'border border-gray-200 text-gray-400 cursor-default'
                    : plan.contactOnly
                      ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      : isPopular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'border border-blue-300 text-blue-700 hover:bg-blue-50'
                  }`}
                disabled={!payable && !plan.contactOnly}
              >
                {isCurrent
                  ? 'Current plan'
                  : plan.contactOnly
                    ? 'Contact us'
                    : renewable
                      ? `Renew ${meta.label}`
                      : payable
                        ? `Choose ${meta.label}`
                        : `${meta.label} plan`}
              </button>
            </div>
          );
        })}
      </div>

      {/* M-Pesa note */}
      <p className="text-center text-sm text-gray-400">
        Payments are manually verified within 30 minutes on business days.
        Questions? <a href="mailto:support@stockpos.app" className="text-blue-600 hover:underline">support@stockpos.app</a>
      </p>

      {/* Payment modal */}
      {invoice && (
        <PaymentModal
          invoice={invoice.invoice}
          colorKey={invoice.color}
          onClose={() => setInvoice(null)}
        />
      )}
    </div>
  );
}

function FeatureLine({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm text-gray-700">
      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
      {label}
    </li>
  );
}
