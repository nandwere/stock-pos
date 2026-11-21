// src/lib/billing-shared.ts — client-safe billing helpers and constants.

export const GRACE_DAYS = 7;            // paid plans keep working this long after expiry
export const REMIND_DAYS = 7;           // start warning this many days before expiry
export const PERIOD_OPTIONS = [1, 3, 6, 12] as const;
export type PeriodMonths = (typeof PERIOD_OPTIONS)[number];

// Where merchants send plan payments (shown on the upgrade dialog and on invoices)
export const PAY_NUMBER = '0718 535 456';
export const PAY_NAME = 'MARK NANDWERE';

export type BillingStateName = 'active' | 'expiring' | 'grace' | 'lapsed';

export interface BillingState {
  state: BillingStateName;
  isTrial: boolean;
  expiresAt: string | null;
  graceEndsAt: string | null;
  daysLeft: number | null; // negative once expired
}

const DAY = 86_400_000;

/**
 * active   – no expiry, or more than REMIND_DAYS left
 * expiring – within REMIND_DAYS of the expiry
 * grace    – expired, but still on the plan (paid plans only; trials have no grace)
 * lapsed   – past the grace period; the merchant falls back to the default plan
 */
export function billingState(
  planExpiresAt: Date | string | null | undefined,
  isTrial: boolean,
  now: Date = new Date(),
): BillingState {
  if (!planExpiresAt) return { state: 'active', isTrial, expiresAt: null, graceEndsAt: null, daysLeft: null };

  const exp = new Date(planExpiresAt);
  const graceEnd = new Date(exp.getTime() + (isTrial ? 0 : GRACE_DAYS) * DAY);
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / DAY);

  let state: BillingStateName;
  if (now.getTime() >= graceEnd.getTime() && now.getTime() >= exp.getTime()) state = 'lapsed';
  else if (now.getTime() >= exp.getTime()) state = 'grace';
  else if (daysLeft <= REMIND_DAYS) state = 'expiring';
  else state = 'active';

  return { state, isTrial, expiresAt: exp.toISOString(), graceEndsAt: graceEnd.toISOString(), daysLeft };
}

/** Calendar-month addition that clamps (31 Jan + 1 month = 28/29 Feb, not 3 Mar). */
export function addMonths(d: Date, months: number): Date {
  const r = new Date(d.getTime());
  const day = r.getUTCDate();
  r.setUTCDate(1);
  r.setUTCMonth(r.getUTCMonth() + months);
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(day, last));
  return r;
}

export type InvoiceView = {
  id: string;
  number: string;
  plan: string;
  planName: string;
  description: string;
  periodMonths: number;
  amount: number;
  currency: string;
  status: 'OPEN' | 'PAID' | 'VOID';
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
  receiptNumber: string | null;
  paymentRef: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  merchant?: { id: string; name: string; slug: string };
};

export type BillingStatusView = BillingState & {
  plan: { key: string; name: string };            // what the merchant has right now
  subscribedPlan: { key: string; name: string };  // what it last paid for (differs once lapsed)
  canManage: boolean;
  openInvoiceCount: number;
};
