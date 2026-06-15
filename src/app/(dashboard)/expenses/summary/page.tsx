'use client';

import { useState } from 'react';
import { useExpenseSummary } from '@/lib/hooks/use-expenses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie,
  Cell, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Clock,
  CheckCircle2, XCircle, Wallet, AlertTriangle,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     '#94a3b8',
  SUBMITTED: '#3b82f6',
  APPROVED:  '#14b8a6',
  REJECTED:  '#ef4444',
  PAID:      '#22c55e',
  VOIDED:    '#e2e8f0',
};

const STATUS_ICONS: Record<string, any> = {
  DRAFT:     Clock,
  SUBMITTED: TrendingUp,
  APPROVED:  CheckCircle2,
  REJECTED:  XCircle,
  PAID:      Wallet,
  VOIDED:    TrendingDown,
};

function SummaryCard({ label, value, count, color, icon: Icon }: any) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className={`inline-flex p-2 rounded-lg mb-3`} style={{ background: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(value)}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        <p className="text-xs text-gray-400 mt-1">{count} expense{count !== 1 ? 's' : ''}</p>
      </CardContent>
    </Card>
  );
}

export default function ExpenseSummaryPage() {
  const today     = new Date();
  const firstDay  = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay   = today.toISOString().split('T')[0];
  const [start, setStart] = useState(firstDay);
  const [end,   setEnd]   = useState(lastDay);

  const { data, isLoading } = useExpenseSummary({ startDate: start, endDate: end });

  const totalPaid     = data?.byStatus?.find((s: any) => s.status === 'PAID')?.total     ?? 0;
  const totalApproved = data?.byStatus?.find((s: any) => s.status === 'APPROVED')?.total ?? 0;
  const totalPending  = data?.byStatus?.find((s: any) => s.status === 'SUBMITTED')?.total ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Summary</h1>
          <p className="text-gray-500 text-sm mt-1">Overview of spending across all categories</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">From</label>
            <input type="date" value={start} onChange={e => setStart(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">To</label>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* Overdue alert */}
      {(data?.overdueCount ?? 0) > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {data.overdueCount} approved expense{data.overdueCount > 1 ? 's are' : ' is'} overdue for payment
          </p>
        </div>
      )}

      {/* Status cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-20" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.byStatus?.map((s: any) => {
            const Icon  = STATUS_ICONS[s.status] ?? Clock;
            const color = STATUS_COLORS[s.status] ?? '#94a3b8';
            return (
              <SummaryCard
                key={s.status}
                label={s.status.charAt(0) + s.status.slice(1).toLowerCase()}
                value={s.total}
                count={s.count}
                color={color}
                icon={Icon}
              />
            );
          })}
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Monthly trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-56" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.monthlyTrend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">By Category</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-56" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data?.byCategory ?? []}
                    dataKey="total"
                    nameKey="category.name"
                    cx="50%" cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: any) =>
                      `${name?.split(' ')[0]} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {(data?.byCategory ?? []).map((_: any, i: number) => (
                      <Cell key={i} fill={[
                        '#3b82f6','#6366f1','#f59e0b','#10b981',
                        '#ef4444','#8b5cf6','#ec4899','#14b8a6',
                      ][i % 8]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Legend
                    formatter={(value: any, entry: any) => entry.payload?.category?.name ?? value}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top suppliers */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Top Suppliers by Spend</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-48" /> : (
            <div className="space-y-3">
              {(data?.bySupplier ?? []).map((s: any, i: number) => {
                const maxTotal = data?.bySupplier?.[0]?.total ?? 1;
                const pct      = (s.total / maxTotal) * 100;
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-800">{s.supplier?.name ?? 'Unknown'}</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(s.total)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400">{s.count} paid invoice{s.count !== 1 ? 's' : ''}</p>
                  </div>
                );
              })}
              {(data?.bySupplier ?? []).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No supplier spend data yet</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}