'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { formatCurrency } from '@/lib/stock-calculations';

export function ProductHistoryModal({ productId, onClose }: { productId: string; onClose: () => void }) {
  const [view, setView] = useState<'stock' | 'price'>('stock');
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['product-history', productId, view, page],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/${productId}/history?view=${view}&page=${page}`);
      if (!res.ok) throw new Error('Failed to load history');
      return res.json();
    },
  });

  const rows = data?.data ?? [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col text-gray-900">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{data?.product?.name ?? 'History'}</h2>
            {data?.product && (
              <p className="text-xs text-gray-500">
                Stock: {Number(data.product.currentStock)} {data.product.unit} · Price:{' '}
                {formatCurrency(Number(data.product.sellingPrice))}
              </p>
            )}
          </div>
          <button onClick={onClose}><X className="w-6 h-6" /></button>
        </div>

        <div className="flex border-b">
          {(['stock', 'price'] as const).map(v => (
            <button
              key={v}
              onClick={() => { setView(v); setPage(0); }}
              className={`flex-1 py-2 text-sm font-medium ${view === v ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
            >
              {v === 'stock' ? 'Stock history' : 'Price history'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <p className="p-6 text-center text-gray-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-center text-gray-500">No history yet</p>
          ) : view === 'stock' ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr><th className="p-3">Date</th><th>Type</th><th className="text-right">Change</th><th className="text-right">Balance</th><th className="p-3">By</th></tr>
              </thead>
              <tbody>
                {rows.map((r: any) => {
                  const change = Number(r.quantityChange);
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="p-3 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                      <td>{r.type.replace(/_/g, ' ')}</td>
                      <td className={`text-right font-semibold ${change < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {change > 0 ? '+' : ''}{change}
                      </td>
                      <td className="text-right">{Number(r.stockBefore)} → {Number(r.stockAfter)}</td>
                      <td className="p-3">{r.user?.name ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr><th className="p-3">Date</th><th className="text-right">Cost</th><th className="text-right">Selling</th><th className="p-3">By / reason</th></tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="text-right">
                      {r.oldCostPrice != null && <span className="text-gray-400 line-through mr-1">{formatCurrency(Number(r.oldCostPrice))}</span>}
                      {formatCurrency(Number(r.newCostPrice))}
                    </td>
                    <td className="text-right">
                      {r.oldSellingPrice != null && <span className="text-gray-400 line-through mr-1">{formatCurrency(Number(r.oldSellingPrice))}</span>}
                      {formatCurrency(Number(r.newSellingPrice))}
                    </td>
                    <td className="p-3">{r.user?.name ?? '—'}{r.reason ? ` · ${r.reason}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {data?.meta && data.meta.totalPages > 1 && (
          <div className="p-3 border-t flex justify-between items-center text-sm">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
            <span>Page {page + 1} of {data.meta.totalPages}</span>
            <button disabled={page + 1 >= data.meta.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}