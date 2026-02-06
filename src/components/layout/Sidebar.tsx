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
  ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/auth';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ('OWNER' | 'MANAGER' | 'CASHIER')[];
}

const navigationItems: NavItem[] = [
  { 
    href: '/', 
    label: 'Dashboard', 
    icon: LayoutDashboard 
  },
  { 
    href: '/pos', 
    label: 'Point of Sale', 
    icon: ShoppingCart 
  },
  { 
    href: '/inventory', 
    label: 'Inventory', 
    icon: Package 
  },
  { 
    href: '/sales', 
    label: 'Sales History', 
    icon: ShoppingBag 
  },
  { 
    href: '/stock-count', 
    label: 'Stock Count', 
    icon: ClipboardList 
  },
  { 
    href: '/reports', 
    label: 'Reports', 
    icon: BarChart3,
    roles: ['OWNER', 'MANAGER']
  },
  { 
    href: '/settings', 
    label: 'Settings', 
    icon: Settings,
    roles: ['OWNER', 'MANAGER']
  },
];

interface SidebarProps {
  user: User;
}

export function Sidebar({ user }: SidebarProps) {
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
            <div className="text-lg font-bold text-gray-900">Stock POS</div>
            <div className="text-xs text-gray-500">{user.role}</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;

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
                </Link>
              </li>
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