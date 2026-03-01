// components/reports/VarianceChart.tsx
'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { StockCountReport } from '@/types';

interface VarianceChartProps {
  reports: StockCountReport[];
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b'];

export function VarianceChart({ reports }: VarianceChartProps) {
  const totalMissing = reports.reduce((sum, r) => sum + r.missingStock, 0);
  const totalExcess = reports.reduce((sum, r) => sum + r.excessStock, 0);
  const totalPerfect = reports.reduce(
    (sum, r) => sum + (r.productsCounted - r.productsWithVariance),
    0
  );

  const data = [
    { name: 'Perfect Match', value: totalPerfect },
    { name: 'Missing Stock', value: totalMissing },
    { name: 'Excess Stock', value: totalExcess },
  ];

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Variance Distribution
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) =>
              `${name}: ${((percent || 0) * 100).toFixed(0)}%`
            }
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{totalPerfect}</div>
          <div className="text-xs text-gray-600">Perfect</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{totalMissing}</div>
          <div className="text-xs text-gray-600">Missing</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{totalExcess}</div>
          <div className="text-xs text-gray-600">Excess</div>
        </div>
      </div>
    </div>
  );
}