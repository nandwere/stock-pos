'use client';

import { useState } from 'react';
import { Check, Crown, Loader2, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/lib/hooks/use-users';
import { useAdminPlans, useDeletePlan, useSavePlan, type PlanInput } from '@/lib/hooks/use-plans';
import {
  FEATURES, PLAN_COLOR_KEYS, PLAN_COLORS, formatPlanPrice, limitLabel, planColorClass, type PlanConfig,
} from '@/lib/plans';

const inputCls = `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`;

const EMPTY: PlanInput & { key: string } = {
  key: '', name: '', description: '', price: 0, contactOnly: false,
  maxProducts: null, maxUsers: null, features: ['sales', 'inventory'], color: 'gray',
  isPopular: false, isPublic: true, isActive: true, isDefault: false, sortOrder: 0, trialDays: 0,
};

export default function PlansPage() {
  const { data: me, isLoading: meLoading } = useCurrentUser();
  const { data: plans = [], isLoading } = useAdminPlans();
  const del = useDeletePlan();
  const [editing, setEditing] = useState<PlanConfig | 'new' | null>(null);

  if (meLoading) return <Spinner />;
  if (!me?.isSuperAdmin) {
    return <div className="p-6 text-gray-600">Only super admins can manage plans.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plans</h1>
          <p className="text-gray-600 mt-1">Pricing, limits and features for every merchant plan</p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" /> New plan
        </button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 text-gray-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Plan', 'Price', 'Products', 'Users', 'Features', 'Merchants', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {plans.map(p => (
                <tr key={p.id} className={p.isActive ? '' : 'bg-gray-50 text-gray-400'}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${planColorClass(p.color)}`}>{p.name}</span>
                      {p.isDefault && <span title="Given to new merchants"><Crown className="w-4 h-4 text-amber-500" /></span>}
                      {p.isPopular && <span title="Most popular"><Star className="w-4 h-4 text-blue-500" /></span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1 font-mono">{p.key}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatPlanPrice(p)}</td>
                  <td className="px-4 py-3">{limitLabel(p.maxProducts)}</td>
                  <td className="px-4 py-3">{limitLabel(p.maxUsers)}</td>
                  <td className="px-4 py-3">{p.features.length} of {FEATURES.length}</td>
                  <td className="px-4 py-3">{p.merchantCount ?? 0}</td>
                  <td className="px-4 py-3">
                    {!p.isActive ? 'Inactive' : p.isPublic ? 'Public' : 'Hidden'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(p)} className="p-2 text-gray-500 hover:text-blue-600" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete the ${p.name} plan? This can't be undone.`)) del.mutate(p.id);
                        }}
                        className="p-2 text-gray-500 hover:text-red-600" title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Changes apply to merchants within about 15 seconds. Merchants on a deactivated plan keep it, but it can&apos;t be
        given to anyone new. Plans that are in use can be deactivated but not deleted.
      </p>

      {editing && <PlanModal plan={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );
}

function PlanModal({ plan, onClose }: { plan: PlanConfig | null; onClose: () => void }) {
  const save = useSavePlan();
  const isNew = !plan;
  const [form, setForm] = useState(plan ? { ...plan } : { ...EMPTY });
  const [error, setError] = useState('');

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({ ...f, [k]: v }));
  const numOrNull = (v: string) => (v === '' ? null : Math.max(0, Math.floor(Number(v)) || 0));

  function toggleFeature(key: string) {
    set('features', (form.features.includes(key as any)
      ? form.features.filter(f => f !== key)
      : [...form.features, key]) as any);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const { id, merchantCount, key, ...rest } = form as any;
    try {
      await save.mutateAsync({ id: plan?.id, data: isNew ? { key, ...rest } : rest });
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const unlimitedProducts = form.maxProducts === null;
  const unlimitedUsers = form.maxUsers === null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center text-gray-900 justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{isNew ? 'New plan' : `Edit ${plan!.name}`}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Name">
              <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} required />
            </Field>
            <Field label="Key" hint={isNew ? 'permanent' : 'cannot be changed'}>
              <input
                className={`${inputCls} font-mono ${isNew ? '' : 'bg-gray-50 text-gray-500'}`}
                value={form.key}
                onChange={e => set('key', e.target.value.toUpperCase())}
                disabled={!isNew} required placeholder="e.g. PRO"
              />
            </Field>
            <div className="col-span-2">
              <Field label="Description">
                <input className={inputCls} value={form.description} onChange={e => set('description', e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price per month (KES)">
              <input
                type="number" min={0} className={inputCls} value={form.price}
                disabled={form.contactOnly}
                onChange={e => set('price', Math.max(0, Math.floor(Number(e.target.value)) || 0))}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-gray-700 mt-6">
              <input type="checkbox" checked={form.contactOnly} onChange={e => set('contactOnly', e.target.checked)} />
              &ldquo;Contact us&rdquo; instead of a price (no online payment)
            </label>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Max products">
              <div className="flex items-center gap-3">
                <input
                  type="number" min={1} className={inputCls} disabled={unlimitedProducts}
                  value={form.maxProducts ?? ''} onChange={e => set('maxProducts', numOrNull(e.target.value))}
                />
                <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                  <input type="checkbox" checked={unlimitedProducts} onChange={e => set('maxProducts', e.target.checked ? null : 100)} />
                  Unlimited
                </label>
              </div>
            </Field>
            <Field label="Max users">
              <div className="flex items-center gap-3">
                <input
                  type="number" min={1} className={inputCls} disabled={unlimitedUsers}
                  value={form.maxUsers ?? ''} onChange={e => set('maxUsers', numOrNull(e.target.value))}
                />
                <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                  <input type="checkbox" checked={unlimitedUsers} onChange={e => set('maxUsers', e.target.checked ? null : 5)} />
                  Unlimited
                </label>
              </div>
            </Field>
          </div>

          {/* Features */}
          <Field label="Features">
            <div className="grid grid-cols-2 gap-2">
              {FEATURES.map(f => (
                <label key={f.key} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.features.includes(f.key)} onChange={() => toggleFeature(f.key)} />
                  {f.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Sales &amp; POS gates the POS and Sales pages. Without it, merchants on this plan are sent to Upgrade.
            </p>
          </Field>

          {/* Appearance + visibility */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Badge colour">
              <div className="flex flex-wrap gap-2">
                {PLAN_COLOR_KEYS.map(c => (
                  <button
                    type="button" key={c} onClick={() => set('color', c)}
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PLAN_COLORS[c]} ${form.color === c ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    {form.color === c && <Check className="w-3 h-3 inline mr-0.5" />}{c}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Free trial for new sign-ups (days)" hint="0 = no trial">
              <input type="number" min={0} max={365} className={inputCls} value={form.trialDays}
                disabled={form.contactOnly}
                onChange={e => set('trialDays', Math.min(365, Math.max(0, Math.floor(Number(e.target.value)) || 0)))} />
            </Field>
            <Field label="Display order" hint="lowest first">
              <input type="number" min={0} className={inputCls} value={form.sortOrder}
                onChange={e => set('sortOrder', Math.max(0, Math.floor(Number(e.target.value)) || 0))} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isActive} disabled={form.isDefault} onChange={e => set('isActive', e.target.checked)} />
              Active (can be assigned to merchants)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isPublic} onChange={e => set('isPublic', e.target.checked)} />
              Show on the merchant Upgrade page
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isPopular} onChange={e => set('isPopular', e.target.checked)} />
              Mark as &ldquo;Most popular&rdquo;
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox" checked={form.isDefault}
                disabled={plan?.isDefault}
                onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked, isActive: e.target.checked ? true : f.isActive }))}
              />
              Default plan for new merchants
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
            <button
              type="submit" disabled={save.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
            >
              {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isNew ? 'Create plan' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{hint && <span className="text-xs text-gray-400 font-normal ml-1">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}
