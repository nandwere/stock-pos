import { NextResponse } from 'next/server';
import { getMerchantAccess } from '@/lib/plans.server';
import type { Feature } from '@/lib/plans';

interface Session {
  merchantId: string;
  role?: unknown;
  isSuperAdmin?: boolean;
}

/**
 * Call at the top of any API route that should be gated.
 * Returns a 402 response if the merchant is suspended, past trial, or missing the feature,
 * or null if the check passes. Reads the live plan from the database, not the session.
 */
export async function guardFeature(session: Session, feature: Feature): Promise<NextResponse | null> {
  if (session.isSuperAdmin) return null; // platform super admins are never plan-gated

  const access = await getMerchantAccess(session.merchantId);

  if (!access?.isActive) {
    return NextResponse.json(
      { error: 'Your workspace is suspended. Contact support.', code: 'SUSPENDED' },
      { status: 402 }
    );
  }

  if (access.trialEndsAt && new Date(access.trialEndsAt) < new Date()) {
    return NextResponse.json(
      { error: 'Your trial has expired. Please upgrade to continue.', code: 'TRIAL_EXPIRED' },
      { status: 402 }
    );
  }

  if (!access.plan.features.includes(feature)) {
    return NextResponse.json(
      { error: 'This feature requires a higher plan.', code: 'PLAN_LIMIT', feature, current: access.plan.key, upgrade: true },
      { status: 402 }
    );
  }

  return null;
}

/**
 * `current` is how many the merchant already has. Blocks creating one more once the plan's limit is reached.
 * A null limit means unlimited.
 */
export async function guardLimit(
  session: Session,
  resource: 'maxProducts' | 'maxUsers',
  current: number
): Promise<NextResponse | null> {
  const access = await getMerchantAccess(session.merchantId);
  if (!access) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });

  const limit = access.plan[resource];
  if (limit !== null && current >= limit) {
    return NextResponse.json(
      {
        error:   `You've reached the ${resource === 'maxProducts' ? 'product' : 'user'} limit for your plan (${limit}).`,
        code:    'USAGE_LIMIT',
        limit,
        current,
        upgrade: true,
      },
      { status: 402 }
    );
  }

  return null;
}
