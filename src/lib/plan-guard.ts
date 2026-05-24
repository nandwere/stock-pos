import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPlanLimits, hasFeature, Feature, Plan } from '@/lib/plans';

interface Session {
  merchantId: string;
  role: string;
}

/**
 * Call at the top of any API route that should be gated.
 * Returns a 402 response if the merchant is over limit or missing the feature,
 * or null if the check passes (proceed normally).
 */
export async function guardFeature(session: Session, feature: Feature): Promise<NextResponse | null> {
  const merchant = await prisma.merchant.findUnique({
    where:  { id: session.merchantId },
    select: { plan: true, isActive: true, trialEndsAt: true },
  });

  if (!merchant?.isActive) {
    return NextResponse.json(
      { error: 'Your workspace is suspended. Contact support.', code: 'SUSPENDED' },
      { status: 402 }
    );
  }

  // Trial expiry check
  if (merchant.trialEndsAt && new Date(merchant.trialEndsAt) < new Date()) {
    return NextResponse.json(
      { error: 'Your trial has expired. Please upgrade to continue.', code: 'TRIAL_EXPIRED' },
      { status: 402 }
    );
  }

  if (!hasFeature(merchant.plan as Plan, feature)) {
    const limits = getPlanLimits(merchant.plan as Plan);
    return NextResponse.json(
      {
        error:   `This feature requires a higher plan.`,
        code:    'PLAN_LIMIT',
        feature,
        current: merchant.plan,
        upgrade: true,
      },
      { status: 402 }
    );
  }

  return null;
}

export async function guardLimit(
  session: Session,
  resource: 'maxProducts' | 'maxUsers',
  current: number
): Promise<NextResponse | null> {
  const merchant = await prisma.merchant.findUnique({
    where:  { id: session.merchantId },
    select: { plan: true },
  });

  const limits = getPlanLimits(merchant!.plan as Plan);
  const limit  = limits[resource];

  if (current >= limit) {
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