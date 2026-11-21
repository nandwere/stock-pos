'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, Clock } from 'lucide-react';
import { useBillingStatus } from '@/lib/hooks/use-billing';

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-KE', { dateStyle: 'medium', timeZone: 'Africa/Nairobi' }) : '';

/** Slim notice at the top of the dashboard when a trial or plan is ending, overdue, or lapsed. */
export function BillingBanner() {
  const { data: s } = useBillingStatus();
  const pathname = usePathname();
  if (!s || !s.expiresAt || s.state === 'active') return null;
  if (pathname.startsWith('/billing') || pathname.startsWith('/upgrade')) return null;

  const what = s.isTrial ? 'free trial' : `${s.subscribedPlan.name} plan`;
  const cfg =
    s.state === 'lapsed'
      ? { cls: 'bg-red-50 border-red-200 text-red-800', Icon: AlertTriangle, text: `Your ${what} ended on ${fmt(s.expiresAt)}. You are on the ${s.plan.name} plan.` }
      : s.state === 'grace'
        ? { cls: 'bg-orange-50 border-orange-200 text-orange-800', Icon: AlertTriangle, text: `Your ${what} has expired. Renew by ${fmt(s.graceEndsAt)} to keep your features.` }
        : { cls: 'bg-amber-50 border-amber-200 text-amber-800', Icon: Clock, text: `Your ${what} ends in ${s.daysLeft} ${s.daysLeft === 1 ? 'day' : 'days'} (${fmt(s.expiresAt)}).` };

  return (
    <div className={`mb-4 flex flex-wrap items-center justify-between gap-2 border rounded-lg px-4 py-2.5 text-sm ${cfg.cls}`}>
      <span className="flex items-center gap-2"><cfg.Icon className="w-4 h-4 shrink-0" /> {cfg.text}</span>
      {s.canManage && (
        <Link href="/billing" className="font-semibold underline underline-offset-2">
          {s.state === 'lapsed' ? 'Choose a plan' : 'Renew now'}
        </Link>
      )}
    </div>
  );
}
