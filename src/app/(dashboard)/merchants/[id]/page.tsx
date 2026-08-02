'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Loader2, Users, Package, TrendingUp,
  CheckCircle, XCircle, Save,
} from 'lucide-react';
import { useMerchant, useUpdateMerchant, useToggleMerchant } from '@/lib/hooks/use-merchants';

const PLANS = ['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE'] as const;
const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-700',
  STARTER: 'bg-blue-100 text-blue-700',
  GROWTH: 'bg-purple-100 text-purple-700',
  ENTERPRISE: 'bg-amber-100 text-amber-700',
};

const inputCls = `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`;

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="text-xs text-gray-400 font-normal ml-1">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}

export default function MerchantEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: merchant, isLoading, error: loadError } = useMerchant(id);
  const update = useUpdateMerchant();
  const toggle = useToggleMerchant();

  const [form, setForm] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    address: '',
    currency: '',
    timezone: '',
    plan: 'FREE' as (typeof PLANS)[number],
    deliveryFee: 0,
    storefrontEnabled: false,
    storefrontTagline: '',
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Populate the form once the merchant loads — merchant arrives async,
  // so this can't just be the initial useState value.
  useEffect(() => {
    if (!merchant) return;
    setForm({
      name: merchant.name ?? '',
      slug: merchant.slug ?? '',
      email: merchant.email ?? '',
      phone: merchant.phone ?? '',
      address: merchant.address ?? '',
      currency: merchant.currency ?? '',
      timezone: merchant.timezone ?? '',
      plan: merchant.plan ?? 'FREE',
      deliveryFee: merchant.deliveryFee ?? 0,
      storefrontEnabled: merchant.storefrontEnabled ?? false,
      storefrontTagline: merchant.storefrontTagline ?? '',
    });
  }, [merchant]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setSaved(false);
  };


  const setChecked = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.checked }));
    setSaved(false);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    try {
      await update.mutateAsync({
        id, ...form,
        data: { id, ...form },
      });
      setSaved(true);
    } catch (err: any) {
      setError(err.message ?? 'Could not save changes');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (loadError || !merchant) {
    return (
      <div className="p-6">
        <p className="text-red-600">{(loadError as any)?.message ?? 'Merchant not found.'}</p>
        <button onClick={() => router.push('/merchants')} className="mt-3 text-blue-600 font-medium">
          ← Back to merchants
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl text-gray-900">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/merchants')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to merchants
        </button>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{merchant.name}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[merchant.plan]}`}>
                {merchant.plan}
              </span>
            </div>
            <p className="text-gray-500 mt-0.5">{merchant.slug}</p>
          </div>

          <button
            onClick={() => toggle.mutate({ id: merchant.id, isActive: !merchant.isActive })}
            disabled={toggle.isPending}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${merchant.isActive
              ? 'bg-red-50 text-red-700 hover:bg-red-100'
              : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
          >
            {merchant.isActive ? (
              <>
                <XCircle className="w-4 h-4" /> Suspend
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" /> Activate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      {merchant._count && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-xs text-gray-500">Users</p>
              <p className="text-xl font-bold text-gray-900">{merchant._count.users}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-3">
            <Package className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-xs text-gray-500">Products</p>
              <p className="text-xl font-bold text-gray-900">{merchant._count.products}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-emerald-500" />
            <div>
              <p className="text-xs text-gray-500">Sales</p>
              <p className="text-xl font-bold text-gray-900">{merchant._count.sales}</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            Changes saved.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Business name" required>
              <input value={form.name} onChange={set('name')} required className={inputCls} />
            </Field>
          </div>

          <Field label="Slug" required hint="used in the storefront URL — changing this breaks old links">
            <input
              value={form.slug}
              onChange={set('slug')}
              required
              pattern="[a-z0-9\-]+"
              title="Lowercase letters, numbers and hyphens only"
              className={inputCls}
            />
          </Field>

          <Field label="Billing email" required>
            <input type="email" value={form.email} onChange={set('email')} required className={inputCls} />
          </Field>

          <Field label="Phone">
            <input value={form.phone} onChange={set('phone')} className={inputCls} />
          </Field>

          <Field label="Currency">
            <input value={form.currency} onChange={set('currency')} className={inputCls} />
          </Field>

          <div className="col-span-2">
            <Field label="Address">
              <input value={form.address} onChange={set('address')} className={inputCls} />
            </Field>
          </div>

          <Field label="Timezone">
            <input value={form.timezone} onChange={set('timezone')} className={inputCls} />
          </Field>

          <Field label="Plan">
            <select value={form.plan} onChange={set('plan')} className={inputCls}>
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {merchant.trialEndsAt && (
          <p className="text-xs text-gray-400">
            Trial ends {new Date(merchant.trialEndsAt).toLocaleDateString()}
          </p>
        )}

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">
          Storefront
        </p>

        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={form.storefrontEnabled}
            onChange={setChecked('storefrontEnabled')}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Public storefront enabled
          <span className="text-xs text-gray-400 font-normal">
            — /store/{form.slug || merchant.slug}
          </span>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Delivery fee">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.deliveryFee}
              onChange={set('deliveryFee')}
              className={inputCls}
            />
          </Field>

          <div>
            <Field label="Storefront tagline">
              <input value={form.storefrontTagline} onChange={set('storefrontTagline')} className={inputCls} />
            </Field>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={update.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
                       font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}
