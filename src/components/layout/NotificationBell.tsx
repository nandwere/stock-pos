'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Bell, CheckCheck, Info, PackageX } from 'lucide-react';
import type { AppNotification } from '@/app/api/notifications/route';

const dot: Record<AppNotification['severity'], string> = {
  danger: 'bg-red-100 text-red-600',
  warning: 'bg-amber-100 text-amber-600',
  info: 'bg-blue-100 text-blue-600',
};

function Icon({ n }: { n: AppNotification }) {
  const Cmp = n.key === 'out-of-stock' ? PackageX : n.severity === 'info' ? Info : AlertTriangle;
  return <Cmp className="w-4 h-4" />;
}

export function NotificationBell({ userId }: { userId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const storeKey = `pos-notif-seen:${userId ?? 'anon'}`;
  const [seen, setSeen] = useState<Record<string, string>>({});
  const [freshOnOpen, setFreshOnOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    try { setSeen(JSON.parse(localStorage.getItem(storeKey) ?? '{}')); } catch { /* ignore */ }
  }, [storeKey]);

  const { data } = useQuery<AppNotification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error('Failed to load notifications');
      return (await res.json()).data;
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
  const items = data ?? [];

  const unread = useMemo(() => items.filter((n) => seen[n.key] !== n.fingerprint), [items, seen]);

  function markAllSeen() {
    const next = { ...seen };
    items.forEach((n) => { next[n.key] = n.fingerprint; });
    setSeen(next);
    try { localStorage.setItem(storeKey, JSON.stringify(next)); } catch { /* private mode */ }
  }

  function toggle() {
    if (!open) {
      setFreshOnOpen(new Set(unread.map((n) => n.key))); // keep them highlighted while the list is open
      markAllSeen();
    }
    setOpen((o) => !o);
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label="Notifications"
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
            {unread.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-900">Notifications</p>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5" /> {items.length === 0 ? 'All clear' : 'Marked as read'}
              </span>
            </div>

            {items.length === 0 ? (
              <p className="px-4 py-8 text-sm text-gray-500 text-center">Nothing needs your attention right now.</p>
            ) : (
              <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                {items.map((n) => (
                  <li key={n.key}>
                    <button
                      onClick={() => { setOpen(false); router.push(n.href); }}
                      className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 ${freshOnOpen.has(n.key) ? 'bg-blue-50' : ''}`}
                    >
                      <span className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${dot[n.severity]}`}>
                        <Icon n={n} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-900">{n.title}</span>
                        <span className="block text-xs text-gray-500 mt-0.5 truncate">{n.body}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
