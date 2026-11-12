import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const KEY = ['draft-sales'];

async function json(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export function useDraftSales() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => json(await fetch('/api/sales/drafts')),
  });
}

export function useSaveDraft() {
  const qc = useQueryClient();
  return useMutation({
    // pass `id` to update an existing draft, omit to create
    mutationFn: async ({ id, ...payload }: any) =>
      json(
        await fetch(id ? `/api/sales/drafts/${id}` : '/api/sales/drafts', {
          method: id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      json(await fetch(`/api/sales/drafts/${id}`, { method: 'DELETE' })),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}