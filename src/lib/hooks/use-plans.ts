import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { PlanConfig } from '@/lib/plans';

async function json<T>(res: Response, fallback: string): Promise<T> {
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? fallback);
  return body as T;
}

/** Plans a merchant can buy (active + public). Used by /upgrade. */
export function usePlans() {
  return useQuery({
    queryKey: ['plans', 'public'],
    queryFn: async () => (await json<{ data: PlanConfig[] }>(await fetch('/api/plans'), 'Failed to load plans')).data,
    staleTime: 60_000,
  });
}

/** Every plan incl. inactive, with merchant counts. Super admin only. */
export function useAdminPlans() {
  return useQuery({
    queryKey: ['plans', 'admin'],
    queryFn: async () =>
      (await json<{ data: PlanConfig[] }>(await fetch('/api/plans?scope=admin'), 'Failed to load plans')).data,
  });
}

export type PlanInput = Omit<PlanConfig, 'id' | 'merchantCount'>;

export function useSavePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Partial<PlanInput> }) =>
      json<PlanConfig>(
        await fetch(id ? `/api/plans/${id}` : '/api/plans', {
          method: id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }),
        'Failed to save plan'
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      qc.invalidateQueries({ queryKey: ['merchants'] });
      toast.success('Plan saved');
    },
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => json(await fetch(`/api/plans/${id}`, { method: 'DELETE' }), 'Failed to delete plan'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
