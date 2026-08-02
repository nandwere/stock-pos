'use client';

import { useState, useEffect } from 'react';
import { Calendar, Loader2, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/stock-calculations';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

// ── Hook — lifted out of the component so it's stable ────────────────────────
function useSalesChartData(days: string) {
  const [data,      setData]      = useState<{ date: string; amount: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetch_() {
      setIsLoading(true);
      setError(null);
      try {
        const res  = await fetch(`/api/sales/chart?days=${days}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(Array.isArray(json) ? json : []);
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Failed to load chart');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetch_();
    return () => { cancelled = true; };
  }, [days]);

  return { data, isLoading, error };
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">
        {new Date(label).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
      </p>
      <p className="text-blue-600 font-bold">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function SalesChart() {
  const [days, setDays] = useState('7');
  const { data, isLoading, error } = useSalesChartData(days);

  // Format x-axis tick labels depending on range
  const formatXAxis = (dateStr: string) => {
    const d = new Date(dateStr);
    if (Number(days) <= 7) {
      return d.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue …
    }
    if (Number(days) <= 30) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // Jan 5
    }
    // 90-day range — only show every ~2 weeks to avoid crowding
    return d.getDate() === 1 || d.getDate() === 15
      ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '';
  };

  const totalRevenue = data.reduce((s, d) => s + d.amount, 0);
  const nonZeroDays  = data.filter(d => d.amount > 0).length;

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sales Overview</h2>
          {!isLoading && !error && totalRevenue > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              {formatCurrency(totalRevenue)} across {nonZeroDays} day{nonZeroDays !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <select
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={days}
          onChange={e => setDays(e.target.value)}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 3 months</option>
        </select>
      </div>

      {/* Chart area — always 280px tall so recharts can measure it */}
      <div className="p-6">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="h-64 flex items-center justify-center text-center text-gray-400">
            <div>
              <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Could not load chart data</p>
              <p className="text-xs mt-1 text-red-400">{error}</p>
            </div>
          </div>
        ) : data.every(d => d.amount === 0) ? (
          <div className="h-64 flex items-center justify-center text-center text-gray-400">
            <div>
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No sales in this period</p>
            </div>
          </div>
        ) : (
          // ResponsiveContainer needs an explicit height in px — percentage heights
          // only work when the parent has a defined height, which flex containers
          // often don't provide. Using h-64 (256px) on the wrapper + height={256}.
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                barCategoryGap="30%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatXAxis}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  interval={Number(days) === 90 ? 6 : 0}
                />
                <YAxis
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
                <Bar
                  dataKey="amount"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}