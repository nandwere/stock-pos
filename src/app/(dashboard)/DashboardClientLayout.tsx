// app/(dashboard)/DashboardClientLayout.tsx
'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ToastProvider } from '@/components/ui/toast-provider';
import type { User } from '@/types';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardClientLayout({
    children,
    user,
}: {
    children: React.ReactNode;
    user: User;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const pathname = usePathname();

    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* ✅ Mobile Sidebar */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                    {/* Overlay */}
                    <div
                        className="fixed inset-0 bg-black/50"
                        onClick={() => setIsSidebarOpen(false)}
                    />

                    {/* Sidebar */}
                    <Sidebar
                        user={user}
                    />
                </div>
            )}

            {/* ✅ Desktop Sidebar */}
            <div className="hidden md:block">
                <Sidebar user={user} />
            </div>

            {/* Main */}
            <div className="flex flex-col flex-1 min-w-0">
                <Header
                    user={user}
                    open={isSidebarOpen}
                    onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
                />

                <main className="flex-1 overflow-y-auto p-4">
                    <ToastProvider>{children}</ToastProvider>
                </main>
            </div>
        </div>
    );
}