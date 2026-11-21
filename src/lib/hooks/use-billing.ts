import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BillingStatusView, InvoiceView } from '@/lib/billing-shared';

async function json<T>(res: Response, fallback: string): Promise<T> {
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? fallback);
  return body as T;
}

export function useBillingStatus() {
  return useQuery({
    queryKey: ['billing', 'status'],
    queryFn: async () => json<BillingStatusView>(await fetch('/api/billing/status'), 'Failed to load billing status'),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: ['billing', 'invoices'],
    queryFn: async () => (await json<{ data: InvoiceView[] }>(await fetch('/api/billing/invoices'), 'Failed to load invoices')).data,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { plan: string; months: number }) =>
      json<InvoiceView>(
        await fetch('/api/billing/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) }),
        'Could not create the invoice',
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
}
