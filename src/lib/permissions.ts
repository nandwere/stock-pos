export const PLATFORM_PERMISSIONS = ['merchants.manage', 'catalog.manage', 'plans.manage'];

export const DEFAULT_ROLES = [
  { key: 'admin', name: 'Admin', level: 100, isAdmin: true },
  { key: 'manager',     name: 'Manager',     level: 50,  isAdmin: false },
  { key: 'cashier',     name: 'Cashier',     level: 10,  isAdmin: false },
] as const;

// Roles whose default grants the catalog can seed
export const DEFAULT_ROLE_KEYS: string[] = ['manager', 'cashier'];