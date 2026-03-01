import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/stock-calculations';
// import { getSalesReport } from '@/lib/reports';
import { StockReportsPage } from '@/components/reports/StockReportsPage';

export default async function ReportsPage() {
  // const data = await getSalesReport();

  return (
    <StockReportsPage />
  );
}