'use client';

import { useState, useEffect } from 'react';
import {
  Building2, Search, Plus, Edit, Trash2,
  CheckCircle, XCircle, MoreVertical, Globe,
  Mail, Phone, CreditCard, Loader2, Crown,
  TrendingUp, Users, Package
} from 'lucide-react';
import { useCreateMerchant, useMerchants, useToggleMerchant } from '@/lib/hooks/use-merchants';

// ── Types ──────────────────────────────────────────────────────────────────

const PLANS = ['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE'] as const;
const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-700',
  STARTER: 'bg-blue-100 text-blue-700',
  GROWTH: 'bg-purple-100 text-purple-700',
  ENTERPRISE: 'bg-amber-100 text-amber-700',
};

interface Merchant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  currency: string;
  timezone: string;
  plan: 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  isActive: boolean;
  trialEndsAt?: string;
  createdAt: string;
  _count?: {
    users: number;
    products: number;
    sales: number;
  };
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function MerchantsPage() {
  const { data: merchants = [], isLoading } = useMerchants();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const filtered = merchants.filter((m: { name: string; slug: string; email: string; }) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.slug.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Merchants</h1>
          <p className="text-gray-600 mt-1">Manage all tenants on this platform</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
                     font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Merchant
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {PLANS.map(plan => {
          const count = merchants.filter((m: { plan: string; }) => m.plan === plan).length;
          return (
            <div key={plan} className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">{plan}</p>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, slug or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Merchant', 'Slug', 'Plan', 'Currency', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium
                                         text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    No merchants found
                  </td>
                </tr>
              ) : filtered.map((m: Merchant) => (
                <MerchantRow key={m.id} merchant={m} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <CreateMerchantModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

// ── Table row ──────────────────────────────────────────────────────

function MerchantRow({ merchant: m }: { merchant: Merchant }) {
  const toggle = useToggleMerchant();

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4">
        <div className="font-medium text-gray-900">{m.name}</div>
        <div className="text-sm text-gray-500">{m.email}</div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Globe className="w-3.5 h-3.5" />
          {m.slug}
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${PLAN_COLORS[m.plan]}`}>
          {m.plan}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">{m.currency}</td>
      <td className="px-6 py-4">
        {m.isActive ? (
          <span className="flex items-center gap-1 text-xs font-medium text-green-700">
            <CheckCircle className="w-4 h-4" /> Active
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium text-red-600">
            <XCircle className="w-4 h-4" /> Suspended
          </span>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggle.mutate({ id: m.id, isActive: !m.isActive })}
            disabled={toggle.isPending}
            className={`text-sm font-medium ${m.isActive
              ? 'text-red-600 hover:text-red-800'
              : 'text-green-600 hover:text-green-800'
              }`}
          >
            {m.isActive ? 'Suspend' : 'Activate'}
          </button>
          <a
            href={`/merchants/${m.id}`}
            className="text-blue-600 hover:text-blue-800"
          >
            <Edit className="w-4 h-4" />
          </a>
        </div>
      </td>
    </tr>
  );
}

// ── Create modal ───────────────────────────────────────────────────

function CreateMerchantModal({ onClose }: { onClose: () => void }) {
  const create = useCreateMerchant();
  const [form, setForm] = useState({
    // Merchant
    name: '', slug: '', email: '', phone: '',
    currency: 'KES', timezone: 'Africa/Nairobi',
    plan: 'FREE', isActive: 'true',
    // Owner user
    ownerName: '', ownerEmail: '', ownerPassword: '',
  });
  const [error, setError] = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setForm(f => ({
      ...f,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await create.mutateAsync({ ...form });
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New Merchant</h2>
          <p className="text-sm text-gray-500 mt-0.5">Creates the workspace and the owner account together.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Merchant details */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Workspace
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Business name</label>
              <input value={form.name} onChange={handleNameChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input value={form.slug} onChange={set('slug')} required
                pattern="[a-z0-9\-]+"
                title="Lowercase letters, numbers and hyphens only"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Billing email</label>
              <input type="email" value={form.email} onChange={set('email')} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <input value={form.currency} onChange={set('currency')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select value={form.plan} onChange={set('plan')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Owner user */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">
            Owner account
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input value={form.ownerName} onChange={set('ownerName')} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Login email</label>
              <input type="email" value={form.ownerEmail} onChange={set('ownerEmail')} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={form.ownerPassword} onChange={set('ownerPassword')}
                required minLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={create.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
                         font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
              {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Merchant
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
// ── Helpers ────────────────────────────────────────────────────────────────

const inputCls = `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`;

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="text-xs text-gray-400 font-normal ml-1">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}