// lib/hooks/use-dashboard.ts
import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

interface DashboardStats {
  todaySales: number;
  salesCount: number;
  lowStockItems: number;
  totalInventoryValue: number;
  salesChange: number;
  activeWorkers: number;
  yesterdaySales?: number;
  weekSales?: number;
  monthSales?: number;
}

/**
 * Fetch dashboard statistics
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/stats`);
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      return response.json() as Promise<DashboardStats>;
    },
    refetchInterval: 30 * 1000, // Refetch every minute
    staleTime: 30 * 1000, // Consider stale after 30 seconds
  });
}

/**
 * Fetch sales chart data
 */
export function useSalesChartData(days: number = 7) {
  return useQuery({
    queryKey: ['sales-chart', days],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/sales/chart?days=${days}`);
      if (!response.ok) throw new Error('Failed to fetch sales chart data');
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

/**
 * Fetch quick stats for mini dashboard
 */
export function useQuickStats() {
  return useQuery({
    queryKey: ['quick-stats'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/dashboard/quick-stats`);
      if (!response.ok) throw new Error('Failed to fetch quick stats');
      return response.json();
    },
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}