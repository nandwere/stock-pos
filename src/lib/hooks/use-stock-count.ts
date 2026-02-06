// lib/hooks/use-stock-count.ts
import { StockCountEntry } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// API functions
async function fetchStockCounts(date?: string) {
  const params = date ? `?date=${date}` : '';
  const response = await fetch(`/api/stock-count${params}`);
  if (!response.ok) throw new Error('Failed to fetch stock counts');
  return response.json();
}

async function fetchTodayStockCount() {
  const today = new Date().toISOString().split('T')[0];
  return fetchStockCounts(today);
}

async function createStockCount(data: { counts: StockCountEntry[] }) {
  const response = await fetch('/api/stock-count', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to save stock count');
  }
  return response.json();
}

async function fetchStockVariance(date?: string) {
  const params = date ? `?date=${date}` : '';
  const response = await fetch(`/api/stock-count/variance${params}`);
  if (!response.ok) throw new Error('Failed to fetch stock variance');
  return response.json();
}

async function fetchUnrecordedSales(date?: string) {
  const params = date ? `?date=${date}` : '';
  const response = await fetch(`/api/stock-count/unrecorded-sales${params}`);
  if (!response.ok) throw new Error('Failed to fetch unrecorded sales');
  return response.json();
}

// React Query Hooks

/**
 * Fetch stock counts for a specific date
 */
export function useStockCounts(date?: string) {
  return useQuery({
    queryKey: ['stock-counts', date],
    queryFn: () => fetchStockCounts(date),
    enabled: !!date,
  });
}

/**
 * Fetch today's stock count
 */
export function useTodayStockCount() {
  return useQuery({
    queryKey: ['stock-counts', 'today'],
    queryFn: fetchTodayStockCount,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Create/save stock count
 */
export function useCreateStockCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createStockCount,
    onSuccess: () => {
      // Invalidate stock counts
      queryClient.invalidateQueries({ queryKey: ['stock-counts'] });

      // Invalidate products (stock levels updated)
      queryClient.invalidateQueries({ queryKey: ['products'] });

      // Invalidate variance and unrecorded sales
      queryClient.invalidateQueries({ queryKey: ['stock-variance'] });
      queryClient.invalidateQueries({ queryKey: ['unrecorded-sales'] });

      // Invalidate daily summary
      queryClient.invalidateQueries({ queryKey: ['daily-summary'] });
    },
  });
}

/**
 * Fetch stock variance for a date
 */
export function useStockVariance(date?: string) {
  return useQuery({
    queryKey: ['stock-variance', date],
    queryFn: () => fetchStockVariance(date),
    enabled: !!date,
  });
}

/**
 * Fetch estimated unrecorded sales
 */
export function useUnrecordedSales(date?: string) {
  return useQuery({
    queryKey: ['unrecorded-sales', date],
    queryFn: () => fetchUnrecordedSales(date),
    enabled: !!date,
  });
}

/**
 * Get stock count summary (for dashboard)
 */
export function useStockCountSummary() {
  return useQuery({
    queryKey: ['stock-count-summary'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const [counts, variance, unrecorded] = await Promise.all([
        fetchStockCounts(today),
        fetchStockVariance(today),
        fetchUnrecordedSales(today),
      ]);

      return {
        totalProducts: counts.length,
        countedProducts: counts.filter((c: any) => c.actualQty !== null).length,
        totalVariance: variance.reduce((sum: number, v: any) => sum + Math.abs(v.variance), 0),
        estimatedUnrecordedRevenue: unrecorded.totalRevenue || 0,
        counts,
        variance,
        unrecorded,
      };
    },
  });
}

/**
 * Check if stock count is complete for today
 */
export function useIsStockCountComplete() {
  return useQuery({
    queryKey: ['stock-count-complete'],
    queryFn: async () => {
      const counts = await fetchTodayStockCount();
      const total = counts.length;
      const counted = counts.filter((c: any) => c.actualQty !== null).length;

      return {
        isComplete: total > 0 && counted === total,
        progress: total > 0 ? (counted / total) * 100 : 0,
        counted,
        total,
      };
    },
  });
}