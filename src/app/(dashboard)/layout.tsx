// app/(dashboard)/layout.tsx (SERVER)
import { getCurrentUser } from '@/lib/auth';
import DashboardClientLayout from './DashboardClientLayout';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <DashboardClientLayout user={user}>
      {children}
    </DashboardClientLayout>
  );
}