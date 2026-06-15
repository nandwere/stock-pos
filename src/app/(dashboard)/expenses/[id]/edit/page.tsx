'use client';
import { useExpense } from '@/lib/hooks/use-expenses';
import { ExpenseForm } from '@/components/expenses/expense-form';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditExpensePage({ params }: { params: { id: string } }) {
  const { data: expense, isLoading } = useExpense(params.id);
  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;
  return <ExpenseForm expense={expense} />;
}