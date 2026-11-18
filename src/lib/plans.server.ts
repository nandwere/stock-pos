// src/lib/plans.server.ts
import { prisma } from '@/lib/prisma';
import type { Plan as PlanRow } from '@prisma/client';
import { FEATURE_KEYS, type Feature, type PlanConfig } from '@/lib/plans';

// Last-resort config, used only if the Plan table is empty or a merchant points at a
// plan that no longer exists. Locked down on purpose.
const EMERGENCY: PlanConfig = {
  id: 'emergency', key: 'FREE', name: 'Free', description: '', price: 0, contactOnly: false,
  maxProducts: 5, maxUsers: 1, features: ['sales', 'inventory'], color: 'gray',
  isPopular: false, isPublic: true, isActive: true, isDefault: true, sortOrder: 0,
};

export function toPlanConfig(row: PlanRow): PlanConfig {
  return {
    id: row.id, key: row.key, name: row.name, description: row.description,
    price: row.price, contactOnly: row.contactOnly,
    maxProducts: row.maxProducts, maxUsers: row.maxUsers,
    // drop feature keys that no longer exist in code
    features: row.features.filter((f): f is Feature => (FEATURE_KEYS as string[]).includes(f)),
    color: row.color, isPopular: row.isPopular, isPublic: row.isPublic,
    isActive: row.isActive, isDefault: row.isDefault, sortOrder: row.sortOrder,
  };
}

// ── Plan cache (same idea as the permission catalog cache) ─────────────────
const TTL = 15_000;
let planCache: { at: number; data: PlanConfig[] } | null = null;
const merchantCache = new Map<string, { at: number; data: MerchantAccess }>();

/** Call after any plan or merchant-plan change in this process. Other processes catch up within TTL. */
export function invalidatePlans() {
  planCache = null;
  merchantCache.clear();
}

export async function getPlans(): Promise<PlanConfig[]> {
  if (planCache && Date.now() - planCache.at < TTL) return planCache.data;
  const rows = await prisma.plan.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  const data = rows.map(toPlanConfig);
  planCache = { at: Date.now(), data };
  return data;
}

export async function getPlan(key: string): Promise<PlanConfig | null> {
  return (await getPlans()).find(p => p.key === key) ?? null;
}

export async function getDefaultPlan(): Promise<PlanConfig> {
  const plans = await getPlans();
  return plans.find(p => p.isDefault && p.isActive) ?? plans.find(p => p.isActive) ?? EMERGENCY;
}

export interface MerchantAccess {
  plan: PlanConfig;
  isActive: boolean;
  trialEndsAt: Date | null;
}

/** The merchant's live plan. Replaces reading `plan` from the JWT, which could be stale. */
export async function getMerchantAccess(merchantId: string): Promise<MerchantAccess | null> {
  const hit = merchantCache.get(merchantId);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  const m = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { plan: true, isActive: true, trialEndsAt: true },
  });
  if (!m) return null;

  const plan = (await getPlan(m.plan)) ?? EMERGENCY;
  const data = { plan, isActive: m.isActive, trialEndsAt: m.trialEndsAt };
  merchantCache.set(merchantId, { at: Date.now(), data });
  return data;
}

export async function merchantHasFeature(merchantId: string, feature: Feature): Promise<boolean> {
  const access = await getMerchantAccess(merchantId);
  return !!access && access.plan.features.includes(feature);
}
