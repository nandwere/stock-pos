import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface Expense {
    id: string;
    expenseNumber: string;
    description: string;
    type: string;
    status: string;
    amount: number;
    tax: number;
    total: number;
    currency: string;
    expenseDate: string;
    dueDate?: string;
    paidAt?: string;
    paymentMethod?: string;
    paymentReference?: string;
    notes?: string;
    isRecurring: boolean;
    recurringDay?: number;
    tags: string[];
    supplierId?: string;
    categoryId?: string;
    supplier?: { id: string; name: string };
    category?: { id: string; name: string; color: string };
    user?: { id: string; name: string };
    items?: ExpenseItem[];
    approvals?: ExpenseApproval[];
    createdAt: string;
}

export interface ExpenseItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

export interface ExpenseApproval {
    id: string;
    status: string;
    comment?: string;
    decidedAt?: string;
    approver: { id: string; name: string };
}

export interface ExpenseCategory {
    id: string;
    name: string;
    color?: string;
    description?: string;
    isSystem: boolean;
    _count?: { expenses: number };
}

// ── List ──────────────────────────────────────────────────────────────────────
export function useExpenses(params?: Record<string, any>) {
    return useQuery({
        queryKey: ['expenses', params],
        queryFn: async () => {
            const response = await fetch(`/api/expenses`);
            if (!response.ok) throw new Error('Failed to fetch expense actions');
            return await response.json();
        },
        staleTime: 30_000,
    });
}

// ── Single ────────────────────────────────────────────────────────────────────
export function useExpense(id: string) {
    return useQuery({
        queryKey: ['expenses', id],
        queryFn: async () => {
            const response = await fetch(`/api/expenses/${id}`);
            if (!response.ok) throw new Error('Failed to fetch expense actions');
            return await response.json();
        },
        enabled: !!id,
    });
}

// ── Summary ───────────────────────────────────────────────────────────────────
export function useExpenseSummary(params?: Record<string, any>) {
    return useQuery({
        queryKey: ['expenses-summary', params],
        queryFn: async () => {
            const response = await fetch(`/api/expenses/summary`);
            if (!response.ok) throw new Error('Failed to fetch expense actions');
            return await response.json();
        },
        staleTime: 60_000,
    });
}

// ── Categories ────────────────────────────────────────────────────────────────
export function useExpenseCategories() {
    return useQuery({
        queryKey: ['expense-categories'],
        queryFn: async () => {
            const response = await fetch(`/api/expenses/categories`);
            if (!response.ok) throw new Error('Failed to fetch expense actions');
            return await response.json();
        },
        staleTime: 300_000,
    });
}

export function useSeedExpenseCategories() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const response = await fetch(`/api/expenses`, { method: 'PUT' });
            if (!response.ok) throw new Error('Failed to fetch expense actions');
            return await response.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['expense-categories'] });
            toast.success('Default categories added');
        },
    });
}

// ── Create ────────────────────────────────────────────────────────────────────
export function useCreateExpense() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const response = await fetch(`/api/expenses`, { method: 'POST', body: JSON.stringify(data) });
            if (!response.ok) throw new Error('Failed to fetch expense actions');
            return await response.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['expenses'] });
            qc.invalidateQueries({ queryKey: ['expenses-summary'] });
            toast.success('Expense created');
        },
        onError: (err: any) => toast.error(err.response?.data?.error ?? 'Failed to create expense'),
    });
}

// ── Update ────────────────────────────────────────────────────────────────────
export function useUpdateExpense() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: any) => {
            const response = await fetch(`/api/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
            if (!response.ok) throw new Error('Failed to fetch expense actions');
            return await response.json();
        },
        onSuccess: (_, vars) => {
            qc.invalidateQueries({ queryKey: ['expenses'] });
            qc.invalidateQueries({ queryKey: ['expenses', vars.id] });
            toast.success('Expense updated');
        },
        onError: (err: any) => toast.error(err.response?.data?.error ?? 'Failed to update expense'),
    });
}

// ── Delete ────────────────────────────────────────────────────────────────────
export function useDeleteExpense() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to fetch expense actions');
            return await response.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['expenses'] });
            qc.invalidateQueries({ queryKey: ['expenses-summary'] });
            toast.success('Expense deleted');
        },
        onError: (err: any) => toast.error(err.response?.data?.error ?? 'Failed to delete expense'),
    });
}

// ── Actions ───────────────────────────────────────────────────────────────────
export function useExpenseAction() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: {
            id: string;
            action: 'submit' | 'approve' | 'reject' | 'pay' | 'void';
            comment?: string;
            paymentMethod?: string;
            paymentReference?: string;
        }) => {
            const response = await fetch(`/api/expenses/${id}/actions`);
            if (!response.ok) throw new Error('Failed to fetch expense actions');
            return await response.json();
        },
        onSuccess: (_, vars) => {
            qc.invalidateQueries({ queryKey: ['expenses'] });
            qc.invalidateQueries({ queryKey: ['expenses', vars.id] });
            qc.invalidateQueries({ queryKey: ['expenses-summary'] });
            toast.success('Expense updated');
        },
        onError: (err: any) => toast.error(err.response?.data?.error ?? 'Action failed'),
    });
}