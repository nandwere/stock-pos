// components/layout/Header.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LifeBuoy, LogOut, User, ChevronDown } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { Sidebar } from './Sidebar';
import { CurrentUser } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';

interface HeaderProps {
  user: CurrentUser | null;
  onMenuClick?: () => void;
  open?: boolean;
}

export function Header({ user, onMenuClick, open }: HeaderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      queryClient.clear();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <button
        className="md:hidden"
        onClick={onMenuClick}
      >
        ☰
      </button>
      <div className="flex items-center gap-1">
        <h1 className="text-xl font-semibold text-gray-900">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <NotificationBell userId={user?.id} />

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <ChevronDown className="w-4 h-4" />
          </button>
          {open && (
            <div className="fixed inset-0 z-50 bg-black/50">
              <div className="w-64 bg-white h-full">
                <Sidebar user={user} />
              </div>
            </div>
          )}

          {/* Dropdown Menu */}
          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      {user?.role.name || 'User'}
                    </span>
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push('/profile');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <User className="w-4 h-4" />
                  Profile Settings
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push('/support');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <LifeBuoy className="w-4 h-4" />
                  Help &amp; support
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function getPageTitle(): string {
  // This would ideally use the current route
  // For now, return a default
  return 'Dashboard';
}