import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface Supplier {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    contactName?: string;
    taxPin?: string;
    notes?: string;
    isActive: boolean;
    createdAt: string;
    _count?: { expenses: number; products: number };
    totalSpend?: number;
    paidExpenses?: number;
}

export function useSuppliers(params?: Record<string, any>) {
    return useQuery({
        queryKey: ['suppliers', params],
        queryFn: async () => {
            const response = await fetch(`/api/suppliers`);
            if (!response.ok) throw new Error('Failed to fetch expense actions');
            return await response.json();
        },
        staleTime: 60_000,
    });
}

export function useSupplier(id: string) {
    return useQuery({
        queryKey: ['suppliers', id],
        queryFn: async () => {
            const response = await fetch(`/api/suppliers/${id}`);
            if (!response.ok) throw new Error('Failed to fetch expense actions');
            return await response.json();
        },
        enabled: !!id,
    });
}

export function useCreateSupplier() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const response = await fetch(`/api/suppliers`, { method: 'POST', body: JSON.stringify(data) });
            if (!response.ok) throw new Error('Failed to fetch expense actions');
            return await response.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['suppliers'] });
            toast.success('Supplier created');
        },
        onError: (err: any) => toast.error(err.response?.data?.error ?? 'Failed'),
    });
}

export function useUpdateSupplier() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: any) => {
            const response = await fetch(`/api/suppliers/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
            if (!response.ok) throw new Error('Failed to fetch expense actions');
            return await response.json();
        },
        onSuccess: (_, vars) => {
            qc.invalidateQueries({ queryKey: ['suppliers'] });
            qc.invalidateQueries({ queryKey: ['suppliers', vars.id] });
            toast.success('Supplier updated');
        },
        onError: (err: any) => toast.error(err.response?.data?.error ?? 'Failed'),
    });
}

export function useDeleteSupplier() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to fetch expense actions');
            return await response.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['suppliers'] });
            toast.success('Supplier deactivated');
        },
        onError: (err: any) => toast.error(err.response?.data?.error ?? 'Failed'),
    });
}