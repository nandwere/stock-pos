// components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ClipboardList,
  BarChart3,
  Users,
  Settings,
  Tag,
  ShoppingBag,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User } from '@/types';
import { useSettings } from '@/lib/hooks/use-settings';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ('OWNER' | 'MANAGER' | 'CASHIER')[];
  group?: string;
}

const groupLabels: Record<string, string> = {
  main: 'Operations',
  inventory: 'Inventory',
  reports: 'Reporting',
  payment: 'Payments',
  management: 'Administration',
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

export function Sidebar({ user }: SidebarProps) {
  const { data, isLoading, error } = useSettings();

  const pathname = usePathname();

  // Filter nav items based on user role
  const visibleItems = navigationItems.filter(item =>
    !item.roles || item.roles.includes(user.role)
  );

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo/Brand */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
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
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {visibleItems.map((item, index) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            const Icon = item.icon;

            const previousItem = visibleItems[index - 1];
            const showGroupDivider =
              index > 0 && previousItem?.group !== item.group;

            return (
              <div key={item.href}>
                {showGroupDivider && (
                  <div className="px-3 pt-4 pb-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {groupLabels[item.group ?? '']}
                    </p>
                  </div>
                )}
                <li>
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
                  </Link>
                </li>
              </div>
            );
          })}
        </ul>
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.name}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user.email}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}