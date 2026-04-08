// app/(dashboard)/layout.tsx (SERVER)
import { requireAuth } from '@/lib/auth';
import DashboardClientLayout from './DashboardClientLayout';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <DashboardClientLayout user={user}>
      {children}
    </DashboardClientLayout>
  );
}