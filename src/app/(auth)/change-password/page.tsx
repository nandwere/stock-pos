// app/(auth)/change-password/page.tsx
'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

function Form() {
  const router = useRouter();
  const required = useSearchParams().get('required') === '1';
  const qc = useQueryClient();
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const cls = 'w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (f.newPassword !== f.confirm) return setError('Passwords do not match');
    setLoading(true);
    const res = await fetch('/api/auth/change-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: f.currentPassword, newPassword: f.newPassword }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || 'Could not change password');
    qc.clear();
    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={submit} className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md space-y-4">
        <h1 className="text-xl font-bold text-gray-900">{required ? 'Change your password to continue' : 'Change password'}</h1>
        {required && <p className="text-sm text-gray-600">Your password has expired or was reset by an administrator.</p>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
        <input type="password" placeholder="Current password" autoComplete="current-password" required className={cls}
          value={f.currentPassword} onChange={e => setF({ ...f, currentPassword: e.target.value })} />
        <input type="password" placeholder="New password" autoComplete="new-password" required className={cls}
          value={f.newPassword} onChange={e => setF({ ...f, newPassword: e.target.value })} />
        <input type="password" placeholder="Confirm new password" autoComplete="new-password" required className={cls}
          value={f.confirm} onChange={e => setF({ ...f, confirm: e.target.value })} />
        <p className="text-xs text-gray-500">At least 8 characters, with an uppercase letter, a number and a special character.</p>
        <button disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />} Update password
        </button>
      </form>
    </div>
  );
}

export default function Page() { return <Suspense><Form /></Suspense>; }