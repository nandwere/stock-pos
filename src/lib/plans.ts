export type Plan = 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';

export interface PlanLimits {
  maxProducts:  number;
  maxUsers:     number;
  features:     Feature[];
}

export type Feature =
  | 'sales'
  | 'inventory'
  | 'reports'
  | 'stock_adjustments'
  | 'shifts'
  | 'exports'
  | 'multi_user'
  | 'api_access';

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    maxProducts: 5,
    maxUsers:    1,
    features:    ['sales', 'inventory'],
  },
  STARTER: {
    maxProducts: 200,
    maxUsers:    3,
    features:    ['sales', 'inventory', 'reports', 'stock_adjustments', 'multi_user'],
  },
  GROWTH: {
    maxProducts: 1000,
    maxUsers:    10,
    features:    ['sales', 'inventory', 'reports', 'stock_adjustments', 'shifts', 'exports', 'multi_user'],
  },
  ENTERPRISE: {
    maxProducts: Infinity,
    maxUsers:    Infinity,
    features:    ['sales', 'inventory', 'reports', 'stock_adjustments', 'shifts', 'exports', 'multi_user', 'api_access'],
  },
};

export function getPlanLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
}

export function hasFeature(plan: Plan, feature: Feature): boolean {
  return getPlanLimits(plan).features.includes(feature);
}

export function isWithinLimit(plan: Plan, resource: 'maxProducts' | 'maxUsers', current: number): boolean {
  const limit = getPlanLimits(plan)[resource];
  return current < limit;
}

export const PLAN_LABELS: Record<Plan, { label: string; color: string; description: string; price: string }> = {
  FREE:       { label: 'Free',       color: 'bg-gray-100 text-gray-700',    description: 'For individuals getting started', price: 'KES 0/mo'     },
  STARTER:    { label: 'Starter',    color: 'bg-blue-100 text-blue-800',    description: 'For small shops',                 price: 'KES 999/mo'   },
  GROWTH:     { label: 'Growth',     color: 'bg-purple-100 text-purple-800',description: 'For growing businesses',          price: 'KES 2,499/mo' },
  ENTERPRISE: { label: 'Enterprise', color: 'bg-amber-100 text-amber-800',  description: 'For large operations',            price: 'Contact us'   },
};