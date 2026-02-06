// lib/hooks/use-sales.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePOSStore } from '@/lib/stores/pos-store';

// API functions
async function fetchSales(params?: {
  startDate?: string;
  endDate?: string;
  userId?: string;
}) {
  const queryParams = new URLSearchParams(params as any);
  const response = await fetch(`/api/sales?${queryParams}`);
  if (!response.ok) throw new Error('Failed to fetch sales');
  const data = await response.json();
  return data?.data;
}

async function fetchSaleById(id: string) {
  const response = await fetch(`/api/sales/${id}`);
  if (!response.ok) throw new Error('Failed to fetch sale');
  return response.json();
}

async function createSale(data: {
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  paymentMethod: string;
  customerName?: string;
  discount?: number;
  tax?: number;
}) {
  const response = await fetch('/api/sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create sale');
  }
  return response.json();
}

async function fetchTodaySales() {
  const today = new Date().toISOString().split('T')[0];
  return fetchSales({ startDate: today, endDate: today });
}

async function fetchSalesStats(period: 'today' | 'week' | 'month' | 'year') {
  const response = await fetch(`/api/sales/stats?period=${period}`);
  if (!response.ok) throw new Error('Failed to fetch sales stats');
  return response.json();
}

// React Query Hooks

/**
 * Fetch all sales with optional filters
 */
export function useSales(params?: {
  startDate?: string;
  endDate?: string;
  userId?: string;
}) {
  return useQuery({
    queryKey: ['sales', params],
    queryFn: () => fetchSales(params),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch single sale by ID
 */
export function useSale(id: string) {
  return useQuery({
    queryKey: ['sales', id],
    queryFn: () => fetchSaleById(id),
    enabled: !!id,
  });
}

/**
 * Fetch today's sales
 */
export function useTodaySales() {
  return useQuery({
    queryKey: ['sales', 'today'],
    queryFn: fetchTodaySales,
    // Refetch every 30 seconds for real-time updates
    refetchInterval: 30 * 1000,
  });
}

/**
 * Fetch sales statistics
 */
export function useSalesStats(period: 'today' | 'week' | 'month' | 'year' = 'today') {
  return useQuery({
    queryKey: ['sales', 'stats', period],
    queryFn: () => fetchSalesStats(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create new sale (process checkout)
 */
export function useCreateSale() {
  const queryClient = useQueryClient();
  const clearCart = usePOSStore(state => state.clearCart);

  return useMutation({
    mutationFn: createSale,
    onSuccess: (newSale) => {
      // Invalidate sales queries
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      
      // Invalidate products (stock updated)
      queryClient.invalidateQueries({ queryKey: ['products'] });
      
      // Invalidate today's stats
      queryClient.invalidateQueries({ queryKey: ['sales', 'stats', 'today'] });
      
      // Clear the cart
      clearCart();
      
      return newSale;
    },
    onError: (error: Error) => {
      console.error('Sale creation failed:', error);
    },
  });
}

/**
 * Get recent sales (last 10)
 */
export function useRecentSales(limit: number = 10) {
  return useQuery({
    queryKey: ['sales', 'recent', limit],
    queryFn: () => fetchSales(),
    select: (data) => data.slice(0, limit),
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}

/**
 * Get sales by user/cashier
 */
export function useSalesByUser(userId: string) {
  return useQuery({
    queryKey: ['sales', 'by-user', userId],
    queryFn: () => fetchSales({ userId }),
    enabled: !!userId,
  });
}

/**
 * Get sales summary for date range
 */
export function useSalesSummary(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['sales', 'summary', startDate, endDate],
    queryFn: async () => {
      const sales = await fetchSales({ startDate, endDate });
      
      // Calculate summary
      const totalSales = sales.reduce((sum: number, sale: any) => sum + Number(sale.total), 0);
      const totalTransactions = sales.length;
      const averageTransaction = totalSales / totalTransactions || 0;
      
      const paymentBreakdown = sales.reduce((acc: any, sale: any) => {
        const method = sale.paymentMethod;
        acc[method] = (acc[method] || 0) + Number(sale.total);
        return acc;
      }, {});

      return {
        totalSales,
        totalTransactions,
        averageTransaction,
        paymentBreakdown,
        sales,
      };
    },
    enabled: !!startDate && !!endDate,
  });
}