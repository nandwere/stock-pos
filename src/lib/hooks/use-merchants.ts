
// React Query Hooks

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMerchantStore } from "../stores/merchants-store";
import { MerchantSettings } from "./use-settings";

async function fetchMerchants() {
  const response = await fetch('/api/merchants');
  if (!response.ok) throw new Error('Failed to fetch merchants');

  const data = await response.json();

  console.log('Fetched merchants:', data);
  return data?.data;
}

async function fetchMerchantById(id: string) {
  const response = await fetch(`/api/merchants/${id}`);
  if (!response.ok) throw new Error('Failed to fetch merchant');
  return await response.json();
}

async function fetchMerchantMe() {
  const response = await fetch('/api/merchants/me');
  if (!response.ok) throw new Error('Failed to fetch merchant');
  return await response.json();
}

async function createMerchant(data: any) {
  const response = await fetch('/api/merchants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create merchant');
  return response.json();
}

async function updateMerchant({ id, data }: { id: string; data: any }) {
  const response = await fetch(`/api/merchants/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update merchant');
  return response.json();
}

async function deleteMerchant(id: string) {
  const response = await fetch(`/api/merchants/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete merchant');
  return response.json();
}

/**
 * Fetch all merchants
 */
export function useMerchants() {
  const setMerchants = useMerchantStore(state => state.setMerchants);
  const setLoading = useMerchantStore(state => state.setLoading);
  const setError = useMerchantStore(state => state.setError);

  return useQuery({
    queryKey: ['merchants'],
    queryFn: fetchMerchants,
  });
}

/**
 * Fetch single merchant by ID
 */
export function useMerchant() {
  return useQuery({
    queryKey: ['merchant-by-id'],
    queryFn: () => fetchMerchantMe(),
    enabled: true,
  });
}

/**
 * Create new merchant
 */
export function useCreateMerchant() {
  const queryClient = useQueryClient();
  const addMerchant = useMerchantStore(state => state.addMerchant);

  return useMutation({
    mutationFn: createMerchant,
    onSuccess: (newMerchant) => {
      // Invalidate and refetch merchants list
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      // Optimistically update store
      addMerchant(newMerchant);
    },
  });
}

/**
 * Update existing merchant
 */
export function useUpdateMerchant() {
  const queryClient = useQueryClient();
  const updateMerchantInStore = useMerchantStore(state => state.updateMerchant);

  return useMutation({
    mutationFn: updateMerchant,
    onSuccess: (updatedMerchant) => {
      // Update specific merchant in cache
      queryClient.setQueryData(
        ['merchants', updatedMerchant.id],
        updatedMerchant
      );
      // Invalidate merchants list
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      // Update store
      updateMerchantInStore(updatedMerchant.id, updatedMerchant);
    },
  });
}

/**
 * Delete merchant 
 */
export function useDeleteMerchant() {
  const queryClient = useQueryClient();
  const deleteMerchantFromStore = useMerchantStore(state => state.deleteMerchant);

  return useMutation({
    mutationFn: deleteMerchant,
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['merchants', deletedId] });
      // Invalidate merchants list
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      // Update store
      deleteMerchantFromStore(deletedId);
    },
  });
}

export function useToggleMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/merchants/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error('Failed to update merchant');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchants'] }),
  });
}



 
export function useMerchantSettings() {
  return useQuery({
    queryKey: ['merchant-settings'],
    queryFn: async () => {
      const res = await fetch('/api/merchant/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json() as Promise<Partial<MerchantSettings>>;
    },
    staleTime: 60_000,
  });
}
 
export function useUpdateMerchantSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<MerchantSettings>) => {
      const res = await fetch('/api/merchant/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save settings');
      }
      return res.json() as Promise<Partial<MerchantSettings>>;
    },
    onSuccess: (updated) => {
      qc.setQueryData(['merchant-settings'], updated);
    },
  });
}
