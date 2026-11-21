'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Mail, RotateCcw } from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/use-users';

type Row = {
  id: string; ref: string; name: string; email: string; businessCode: string | null; topic: string; message: string;
  status: 'OPEN' | 'RESOLVED'; createdAt: string; resolvedAt: string | null; merchant: { id: string; name: string; slug: string } | null;
};

const fmt = (iso: string) => new Date(iso).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Nairobi' });
const TABS = [['OPEN', 'Open'], ['RESOLVED', 'Resolved'], ['all', 'All']] as const;

export default function HelpRequestsPage() {
  const { data: me, isLoading: meLoading } = useCurrentUser();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('OPEN');
  const [openId, setOpenId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery<Row[]>({
    queryKey: ['support-requests', tab],
    queryFn: async () => {
      const res = await fetch(`/api/admin/support-requests?status=${tab}`);
      if (!res.ok) throw new Error('Failed to load support requests');
      return (await res.json()).data;
    },
    enabled: !!me?.isSuperAdmin,
    refetchInterval: 60_000,
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'OPEN' | 'RESOLVED' }) => {
      const res = await fetch(`/api/admin/support-requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Could not update');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['support-requests'] }),
  });

  if (meLoading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  if (!me?.isSuperAdmin) return <div className="p-6 text-gray-600">Only super admins can see support requests.</div>;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support requests</h1>
        <p className="text-gray-600 mt-1">Messages sent from the Contact Support page</p>
      </div>

      <div className="flex gap-2">
        {TABS.map(([v, label]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border ${tab === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-500">Nothing here.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-lg">
              <button onClick={() => setOpenId(openId === r.id ? null : r.id)} className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-mono text-xs text-gray-600">{r.ref}</span>
                <span className="font-medium text-gray-900">{r.topic}</span>
                <span className="text-sm text-gray-600">{r.name} · {r.email}</span>
                <span className="text-xs text-gray-500 ml-auto">{fmt(r.createdAt)}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.status === 'OPEN' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                  {r.status === 'OPEN' ? 'Open' : 'Resolved'}
                </span>
              </button>

              {openId === r.id && (
                <div className="border-t border-gray-200 px-4 py-4 space-y-3">
                  <p className="text-xs text-gray-600">
                    Business code: <strong>{r.businessCode || 'not given'}</strong>
                    {r.merchant && <> · Signed in as <strong>{r.merchant.name}</strong> ({r.merchant.slug})</>}
                  </p>
                  <p className="whitespace-pre-wrap text-gray-900 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">{r.message}</p>
                  <div className="flex flex-wrap gap-3">
                    <a href={`mailto:${r.email}?subject=${encodeURIComponent(`Re: [${r.ref}] ${r.topic}`)}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                      <Mail className="w-4 h-4" /> Reply by email
                    </a>
                    {r.status === 'OPEN' ? (
                      <button onClick={() => setStatus.mutate({ id: r.id, status: 'RESOLVED' })} disabled={setStatus.isPending}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                        <CheckCircle2 className="w-4 h-4" /> Mark resolved
                      </button>
                    ) : (
                      <button onClick={() => setStatus.mutate({ id: r.id, status: 'OPEN' })} disabled={setStatus.isPending}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                        <RotateCcw className="w-4 h-4" /> Reopen
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
