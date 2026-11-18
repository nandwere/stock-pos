// src/lib/plans.ts
//
// Client-safe plan types and helpers. Plans themselves now live in the database
// (Plan table, edited by super admins at /plans). What stays in code is the
// list of FEATURES, because each one maps to a gate in the code.
// Server-side lookups are in plans.server.ts.

export type Plan = string; // a Plan.key, e.g. 'FREE'

export type Feature =
  | 'sales'
  | 'inventory'
  | 'reports'
  | 'stock_adjustments'
  | 'shifts'
  | 'exports'
  | 'multi_user'
  | 'api_access';

export const FEATURES: { key: Feature; label: string }[] = [
  { key: 'sales',             label: 'Sales & POS' },
  { key: 'inventory',         label: 'Inventory management' },
  { key: 'reports',           label: 'Reports & analytics' },
  { key: 'stock_adjustments', label: 'Stock adjustments' },
  { key: 'shifts',            label: 'Shift management' },
  { key: 'exports',           label: 'Data exports' },
  { key: 'multi_user',        label: 'Multiple users' },
  { key: 'api_access',        label: 'API access' },
];

export const FEATURE_KEYS = FEATURES.map(f => f.key) as Feature[];
export const FEATURE_NAMES: Record<string, string> = Object.fromEntries(FEATURES.map(f => [f.key, f.label]));

// Full class strings so Tailwind can see them. Plans store the palette key.
export const PLAN_COLORS: Record<string, string> = {
  gray:   'bg-gray-100 text-gray-700',
  blue:   'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
  amber:  'bg-amber-100 text-amber-800',
  green:  'bg-green-100 text-green-800',
  red:    'bg-red-100 text-red-800',
  pink:   'bg-pink-100 text-pink-800',
  teal:   'bg-teal-100 text-teal-800',
};
export const PLAN_COLOR_KEYS = Object.keys(PLAN_COLORS);
export const planColorClass = (color?: string | null) => PLAN_COLORS[color ?? ''] ?? PLAN_COLORS.gray;

/** Plan as sent to the client. null limit = unlimited. */
export interface PlanConfig {
  id: string;
  key: string;
  name: string;
  description: string;
  price: number;
  contactOnly: boolean;
  maxProducts: number | null;
  maxUsers: number | null;
  features: Feature[];
  color: string;
  isPopular: boolean;
  isPublic: boolean;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  merchantCount?: number; // only on the admin list
}

export function formatPlanPrice(p: Pick<PlanConfig, 'price' | 'contactOnly'>, currency = 'KES'): string {
  if (p.contactOnly) return 'Contact us';
  return `${currency} ${p.price.toLocaleString('en-KE')}/mo`;
}

export const limitLabel = (n: number | null) => (n === null ? 'Unlimited' : n.toLocaleString('en-KE'));
