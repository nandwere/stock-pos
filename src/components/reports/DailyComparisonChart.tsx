// components/reports/DailyComparisonChart.tsx
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StockCountReport } from '@/types';

interface DailyComparisonChartProps {
  reports: StockCountReport[];
}

export function DailyComparisonChart({ reports }: DailyComparisonChartProps) {
  const chartData = reports.map((report) => ({
    date: new Date(report.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    expectedStock: report.expectedStock || 0,
    actualStock: report.actualStock || 0,
    variance: Math.abs(report.totalVariance || 0),
  })).reverse();

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Expected vs Actual Stock Comparison
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
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
          <Bar
            dataKey="expectedStock"
            fill="#3b82f6"
            name="Expected Stock"
            radius={[8, 8, 0, 0]}
          />
          <Bar
            dataKey="actualStock"
            fill="#10b981"
            name="Actual Stock"
            radius={[8, 8, 0, 0]}
          />
          <Bar
            dataKey="variance"
            fill="#f59e0b"
            name="Variance"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}