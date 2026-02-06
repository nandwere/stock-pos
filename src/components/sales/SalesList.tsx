'use client';

import Link from 'next/link';
import { formatCurrency } from '@/lib/stock-calculations';
import { ShoppingCart, FileText, Search } from 'lucide-react';

import { useSales } from "@/lib/hooks/use-sales";
import { Sale } from '@/types';


export function SalesList() {
    const { data: sales = [], isLoading, error } = useSales();

    return (
        <div className="p-6 space-y-6 text-gray-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
                    <p className="text-gray-600 mt-1">All recorded sales and transactions</p>
                </div>
                <div className="flex items-center gap-3">
                    <form method="get" className="flex items-center gap-2">
                        <input
                            type="text"
                            name="q"
                            defaultValue={''}
                            placeholder="Search sale # or customer"
                            className="px-3 py-2 border rounded-md text-sm"
                        />
                        <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm flex items-center gap-2">
                            <Search className="w-4 h-4" />
                            Search
                        </button>
                    </form>
                    <Link href="/pos" className="px-3 py-2 border rounded-md text-sm hover:bg-gray-50">
                        New Sale
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">Sales List</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full table-auto text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left p-3">Sale #</th>
                                <th className="text-left p-3">Date</th>
                                <th className="text-left p-3">Customer</th>
                                <th className="text-left p-3">Items</th>
                                <th className="text-right p-3">Total</th>
                                <th className="text-left p-3">Method</th>
                                <th className="text-left p-3">Cashier</th>
                                <th className="text-left p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales.map((sale: Sale) => (
                                <tr key={sale.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 rounded"><ShoppingCart className="w-4 h-4 text-blue-600" /></div>
                                            <div>
                                                <div className="font-medium text-gray-900">{sale.saleNumber}</div>
                                                <div className="text-xs text-gray-500">{new Date(sale.createdAt).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3">{new Date(sale.createdAt).toLocaleDateString()}</td>
                                    <td className="p-3">{sale.customerName ?? 'Walk-in'}</td>
                                    <td className="p-3">{sale.items?.length ?? 0}</td>
                                    <td className="p-3 text-right font-semibold">{formatCurrency(Number(sale.total))}</td>
                                    <td className="p-3">{sale.paymentMethod}</td>
                                    <td className="p-3">{sale.user?.name ?? '—'}</td>
                                    <td className="p-3">
                                        <Link href={`/sales/${sale.id}`} className="text-blue-600 hover:underline flex items-center gap-2">
                                            <FileText className="w-4 h-4" /> View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {sales.length === 0 && (
                        <div className="p-6 text-center text-gray-500">No sales found.</div>
                    )}
                </div>
            </div>
        </div>
    );
}