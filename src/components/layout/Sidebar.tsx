// components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, Package, ShoppingCart, ClipboardList, BarChart3, Users,
  Settings, Tag, ShoppingBag, Building2, CreditCard, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User } from '@/types';
import { useSettings } from '@/lib/hooks/use-settings';
import { useCreditSummary } from '@/lib/hooks/use-credit-summary';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ('OWNER' | 'MANAGER' | 'CASHIER')[];
  group?: string;
}

const groupLabels: Record<string, string> = {
  main: 'Operations',
  expenses: 'Expenses',
  inventory: 'Inventory',
  reports: 'Reporting',
  payment: 'Payments',
  management: 'Administration',
  other: 'More',
};

const navigationItems: NavItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    group: 'main'
  },
  {
    href: '/pos',
    label: 'Point of Sale',
    icon: ShoppingCart,
    group: 'main'
  },
  {
    href: '/sales',
    label: 'Sales History',
    icon: ShoppingBag,
    group: 'main'
  },
  {
    href: '/sales/credit',
    label: 'Credit Sales',
    icon: CreditCard,
    group: 'main'
  },
  {
    href: '/orders',
    label: 'Orders',
    icon: ShoppingBag,
    group: 'main'
  },
  {
    href: '/expenses',
    label: 'Expenses',
    icon: ClipboardList,
    group: 'expenses'
  },
  {
    href: '/expenses/categories',
    label: 'Exp. Categories',
    icon: Tag,
    group: 'expenses',
    roles: ['OWNER', 'MANAGER'],
  },
  {
    href: '/expenses/summary',
    label: 'Expense Summary',
    icon: BarChart3,
    group: 'expenses',
    roles: ['OWNER', 'MANAGER'],
  },
  {
    href: '/inventory',
    label: 'Inventory',
    icon: Package,
    roles: ['OWNER', 'MANAGER'],
    group: 'inventory'
  },
  {
    href: '/categories',
    label: 'Categories',
    icon: Tag,
    roles: ['OWNER', 'MANAGER'],
    group: 'inventory'
  },
  {
    href: '/stock-count',
    label: 'Stock Count',
    icon: ClipboardList,
    roles: ['OWNER', 'MANAGER'],
    group: 'inventory'
  },
  {
    href: '/inventory/stock-adjustments',
    label: 'Stock Adjustments',
    icon: ClipboardList,
    roles: ['OWNER', 'MANAGER'],
    group: 'inventory'
  },
  {
    href: '/reports/sales',
    label: 'Sales Reports',
    icon: BarChart3,
    roles: ['OWNER', 'MANAGER'],
    group: 'reports'
  },
  {
    href: '/reports',
    label: 'Reports',
    icon: BarChart3,
    roles: ['OWNER', 'MANAGER'],
    group: 'reports'
  },
  {
    href: '/payment-requests',
    label: 'Payment Requests',
    icon: ClipboardList,
    roles: ['OWNER'],
    group: 'payment'
  },
  {
    href: '/suppliers',
    label: 'Suppliers',
    icon: Building2,
    roles: ['OWNER', 'MANAGER'],
    group: 'management'
  },
  {
    href: '/merchants',
    label: 'Merchants',
    icon: Users,
    roles: ['OWNER'],
    group: 'management'
  },
  {
    href: '/users',
    label: 'Users',
    icon: Users,
    roles: ['OWNER'],
    group: 'management'
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
    roles: ['OWNER', 'MANAGER'],
    group: 'management'
  },
];

interface SidebarProps {
  user: User;
}

const STORAGE_KEY = 'sidebar-collapsed-groups';

export function Sidebar({ user }: SidebarProps) {
  const { data } = useSettings();
  const overdueCount = useCreditSummary();
  const pathname = usePathname();

  // { [group]: true } = collapsed. Starts empty (everything open) so server
  // and client render the same; the saved state is applied in an effect.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const visibleItems = useMemo(
    () => navigationItems.filter((item) => !item.roles || item.roles.includes(user.role)),
    [user.role]
  );

  // Group items, preserving the order they're declared in
  const sections = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    for (const item of visibleItems) {
      const key = item.group ?? 'other';
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return Array.from(map, ([group, items]) => ({ group, items }));
  }, [visibleItems]);

  // Longest matching href wins, so /sales doesn't stay lit on /sales/credit
  const activeHref = visibleItems.reduce<string | null>((best, item) => {
    const matches = pathname === item.href || pathname.startsWith(item.href + '/');
    if (!matches) return best;
    if (best === null || item.href.length > best.length) return item.href;
    return best;
  }, null);

  const activeGroup = visibleItems.find((i) => i.href === activeHref)?.group ?? null;

  // 1) Load saved state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCollapsed(JSON.parse(raw));
    } catch {}
  }, []);

  // 2) Make sure the group holding the current page is open.
  //    Declared after the load effect so it applies on top of the saved state.
  //    Not persisted: it's a navigation side effect, not a user choice.
  useEffect(() => {
    if (!activeGroup) return;
    setCollapsed((prev) => (prev[activeGroup] ? { ...prev, [activeGroup]: false } : prev));
  }, [activeGroup]);

  const toggleGroup = (group: string) => {
    const next = { ...collapsed, [group]: !collapsed[group] };
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  return (
    <aside className="w-64 h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Logo/Brand */}
      <div className="h-16 shrink-0 flex items-center px-6 border-b border-gray-200">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">{data?.name || 'Stock POS'}</div>
            <div className="text-xs text-gray-500">{user.role}</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-3">
        {sections.map(({ group, items }) => {
          const isOpen = !collapsed[group];
          const hasActive = items.some((i) => i.href === activeHref);
          const showHeaderBadge =
            !isOpen && overdueCount > 0 && items.some((i) => i.href === '/sales/credit');
          const panelId = `nav-group-${group}`;

          return (
            <section key={group}>
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="w-full flex items-center gap-2 px-3 pt-4 pb-2 rounded-md text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span className={cn(!isOpen && hasActive && 'text-blue-600')}>
                  {groupLabels[group] ?? group}
                </span>
                {!isOpen && hasActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                {showHeaderBadge && (
                  <span className="bg-red-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full normal-case tracking-normal">
                    {overdueCount}
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    'ml-auto w-4 h-4 transition-transform duration-200 motion-reduce:transition-none',
                    !isOpen && '-rotate-90'
                  )}
                />
              </button>

              {/* grid-rows 1fr <-> 0fr animates height without measuring it */}
              <div
                id={panelId}
                className={cn(
                  'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
                  isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                )}
              >
                {/* `invisible` when closed also removes the links from the tab order */}
                <ul
                  className={cn(
                    'min-h-0 overflow-hidden space-y-1 transition-[visibility] duration-200',
                    !isOpen && 'invisible'
                  )}
                >
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.href === activeHref;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          )}
                        >
                          <Icon className="w-5 h-5" />
                          <span>{item.label}</span>
                          {item.href === '/sales/credit' && overdueCount > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                              {overdueCount}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          );
        })}
      </nav>

      {/* User info */}
      <div className="shrink-0 p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}