// components/reports/StockTrendsChart.tsx
'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StockCountReport } from '@/types';

interface StockTrendsChartProps {
  reports: StockCountReport[];
}

export function StockTrendsChart({ reports }: StockTrendsChartProps) {
  const chartData = reports.map((report) => ({
    date: new Date(report.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    missing: report.missingStock,
    excess: report.excessStock,
    variance: Math.abs(report.totalVariance),
  })).reverse(); // Show oldest to newest

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Stock Variance Trends
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="missing"
            stroke="#ef4444"
            strokeWidth={2}
            name="Missing Stock"
            dot={{ fill: '#ef4444', r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="excess"
            stroke="#10b981"
            strokeWidth={2}
            name="Excess Stock"
            dot={{ fill: '#10b981', r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="variance"
            stroke="#f59e0b"
            strokeWidth={2}
            name="Total Variance"
            dot={{ fill: '#f59e0b', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}