import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/stock-calculations';
import { getSalesReport } from '@/lib/reports';

export default async function ReportsPage() {
  const data = await getSalesReport();

  return (
    <div className="p-6 space-y-6 text-gray-500">
      <div>
        <h1 className="text-2xl text-gray-900 font-bold">Reports</h1>
        <p className="text-gray-600">Sales summary</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded border">
          <div className="text-sm text-gray-500">Total Sales</div>
          <div className="text-2xl font-bold">{formatCurrency(Number(data.totalSales ?? 0))}</div>
          <div className="text-xs text-gray-500 mt-1">{data.salesCount ?? 0} transactions</div>
        </div>

        <div className="bg-white p-4 rounded border">
          <div className="text-sm text-gray-500">Cash Sales</div>
          <div className="text-2xl font-bold">{formatCurrency(Number(data.cashSales ?? 0))}</div>
        </div>

        <div className="bg-white p-4 rounded border">
          <div className="text-sm text-gray-500">Card Sales</div>
          <div className="text-2xl font-bold">{formatCurrency(Number(data.cardSales ?? 0))}</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded border">
        <div className="flex items-center gap-3 text-gray-500">
          <BarChart3 className="w-6 h-6" />
          <div>Sales chart will be added here</div>
        </div>
      </div>
    </div>
  );
}