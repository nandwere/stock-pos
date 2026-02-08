// app/(dashboard)/layout.tsx
import { requireAuth } from '@/lib/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ToastProvider } from '@/components/ui/toast-provider';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <Sidebar user={user} />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <Header user={user} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <ToastProvider>
            {children}
          </ToastProvider>
        </main>
      </div>
    </div>
  );
}