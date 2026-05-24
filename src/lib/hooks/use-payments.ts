import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PaymentRequest } from '@/types';

export function usePaymentRequests() {
  return useQuery({
    queryKey: ['payment-requests'],
    queryFn: async () => {
      const res = await fetch('/api/merchants/payment-requests');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      return data?.data as Promise<PaymentRequest[]>;
    }
  });
}

export function useHandlePaymentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, notes }: { id: string; action: 'confirm' | 'reject'; notes?: string }) => {
      const res = await fetch(`/api/merchants/payment-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      toast.success('Payment request updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
