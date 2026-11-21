import { NextResponse } from 'next/server';
import { getDefaultPlan } from '@/lib/plans.server';

// GET /api/auth/signup/info → what a new account starts with (shown on the sign-up page)
export async function GET() {
  const { name, trialDays } = await getDefaultPlan();
  return NextResponse.json({ planName: name, trialDays });
}
