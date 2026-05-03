'use client';

import Link from 'next/link';
import { formatCurrency } from '@/lib/stock-calculations';
import { ShoppingCart, FileText, Search, X, Filter } from 'lucide-react';
import { useSales } from "@/lib/hooks/use-sales";
import { Sale } from '@/types';
import { useState, useMemo } from 'react';

// ── helpers ───────────────────────────────────────────────────────────────────
const toDateInput = (d: Date) =>
    d.toLocaleDateString().slice(0, 10).split('/').reverse().join('-');


const todayStart = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};
const todayEnd = () => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
};

const PAYMENT_METHODS = ['All', 'CASH', 'CREDIT', 'MOBILE_MONEY', 'CREDIT_CARD'];

const QUICK_RANGES = [
    { label: 'Today', getRange: () => ({ from: todayStart(), to: todayEnd() }) },
    { label: 'Yesterday', getRange: () => { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); const e = new Date(d); e.setHours(23, 59, 59, 999); return { from: d, to: e }; } },
    {
        label: 'This Week', getRange: () => {
            const from = new Date();
            from.setDate(from.getDate() - 6);
            from.setHours(0, 0, 0, 0);
            return { from, to: todayEnd() };
        },
    },
    { label: 'This Month', getRange: () => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return { from: d, to: todayEnd() }; } },
    { label: 'All Time', getRange: () => ({ from: null, to: null }) },
];

export function SalesList() {
    // ── filter state (default: today) ────────────────────────────────────────
    const [query, setQuery] = useState('');
    const [dateFrom, setDateFrom] = useState<string>(toDateInput(todayStart()));
    const [dateTo, setDateTo] = useState<string>(toDateInput(todayEnd()));
    const [paymentMethod, setPaymentMethod] = useState('All');
    const [activeRange, setActiveRange] = useState('Today');
    const { data: sales = [], isLoading, error } = useSales({ startDate: dateFrom || '', endDate: dateTo || '' });

    const applyQuickRange = (label: string, getRange: () => { from: Date | null; to: Date | null }) => {
        setActiveRange(label);
        const { from, to } = getRange();
        setDateFrom(from ? toDateInput(from) : '');
        setDateTo(to ? toDateInput(to) : '');
    };

    const clearFilters = () => {
        setQuery('');
        setPaymentMethod('All');
        applyQuickRange('Today', QUICK_RANGES[0].getRange);
    };

    // ── client-side filtering ─────────────────────────────────────────────────
    const filtered = useMemo(() => {
        return sales.filter((sale: Sale) => {
            const saleDate = new Date(sale.createdAt);

            // date from
            if (dateFrom) {
                const from = new Date(dateFrom);
                from.setHours(0, 0, 0, 0);
                if (saleDate < from) return false;
            }
            // date to
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                if (saleDate > to) return false;
            }
            // payment method
            if (paymentMethod !== 'All' && sale.paymentMethod !== paymentMethod) return false;

            // text search
            const q = query.toLowerCase().trim();
            if (q) {
                const haystack = [
                    sale.saleNumber,
                    sale.customerName ?? '',
                    sale.user?.name ?? '',
                ].join(' ').toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [sales, dateFrom, dateTo, paymentMethod, query]);

    // ── summary stats ─────────────────────────────────────────────────────────
    const totalRevenue = filtered.reduce((sum: number, s: Sale) => sum + Number(s.total), 0);
    const totalItems = filtered.reduce((sum: number, s: Sale) => sum + (s.items?.length ?? 0), 0);

    const hasActiveFilters =
        activeRange !== 'Today' ||
        paymentMethod !== 'All' ||
        query.trim() !== '';

    return (
        <div className="space-y-5 text-gray-500">
            {/* ── Page header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
                    <p className="text-gray-600 mt-1">All recorded sales and transactions</p>
                </div>
                <Link
                    href="/pos"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                    <ShoppingCart className="w-4 h-4" /> New Sale
                </Link>
            </div>

            {/* ── Filter panel ── */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Filter className="w-4 h-4" /> Filters
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="ml-auto text-xs text-gray-500 hover:text-red-500 flex items-center gap-1"
                        >
                            <X className="w-3 h-3" /> Reset to today
                        </button>
                    )}
                </div>

                {/* Quick date range chips */}
                <div className="flex flex-wrap gap-2">
                    {QUICK_RANGES.map(({ label, getRange }) => (
                        <button
                            key={label}
                            onClick={() => applyQuickRange(label, getRange)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${activeRange === label
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Row 2: custom date + payment + search */}
                <div className="flex flex-wrap gap-3 items-end">
                    {/* Custom date from */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500 font-medium">From</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => { setDateFrom(e.target.value); setActiveRange('Custom'); }}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Custom date to */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500 font-medium">To</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => { setDateTo(e.target.value); setActiveRange('Custom'); }}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Payment method */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500 font-medium">Payment Method</label>
                        <select
                            value={paymentMethod}
                            onChange={e => setPaymentMethod(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {PAYMENT_METHODS.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    {/* Search */}
                    <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                        <label className="text-xs text-gray-500 font-medium">Search</label>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Sale # or customer name"
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {query && (
                                <button
                                    onClick={() => setQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Summary stats ── */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Sales', value: filtered.length.toString(), color: 'text-blue-600' },
                    { label: 'Revenue', value: formatCurrency(totalRevenue), color: 'text-green-600' },
                    { label: 'Items Sold', value: totalItems.toString(), color: 'text-purple-600' },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-lg border border-gray-200 shadow p-4">
                        <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* ── Table ── */}
            <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="p-4 border-b flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-900">
                        {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                        {activeRange !== 'All Time' ? ` · ${activeRange}` : ''}
                    </h2>
                </div>

                {isLoading ? (
                    <div className="p-10 text-center text-gray-400 text-sm animate-pulse">Loading sales...</div>
                ) : error ? (
                    <div className="p-10 text-center text-red-500 text-sm">Failed to load sales.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left p-3 font-medium text-gray-600">Sale #</th>
                                    <th className="text-left p-3 font-medium text-gray-600">Date & Time</th>
                                    <th className="text-left p-3 font-medium text-gray-600">Customer</th>
                                    <th className="text-left p-3 font-medium text-gray-600">Items</th>
                                    <th className="text-right p-3 font-medium text-gray-600">Total</th>
                                    <th className="text-left p-3 font-medium text-gray-600">Method</th>
                                    <th className="text-left p-3 font-medium text-gray-600">Cashier</th>
                                    <th className="text-left p-3 font-medium text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((sale: Sale) => (
                                    <tr key={sale.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 rounded">
                                                    <ShoppingCart className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <span className="font-medium text-gray-900">{sale.saleNumber}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-gray-600">
                                            {new Date(sale.createdAt).toLocaleString()}
                                        </td>
                                        <td className="p-3">{sale.customerName ?? 'Walk-in'}</td>
                                        <td className="p-3">{sale.items?.length ?? 0}</td>
                                        <td className="p-3 text-right font-semibold text-gray-900">
                                            {formatCurrency(Number(sale.total))}
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sale.paymentMethod === 'Cash'
                                                ? 'bg-green-100 text-green-700'
                                                : sale.paymentMethod === 'Card'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-purple-100 text-purple-700'
                                                }`}>
                                                {sale.paymentMethod}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-600">{sale.user?.name ?? '—'}</td>
                                        <td className="p-3">
                                            <Link
                                                href={`/sales/${sale.id}`}
                                                className="text-blue-600 hover:underline flex items-center gap-1.5 text-sm"
                                            >
                                                <FileText className="w-4 h-4" /> View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filtered.length === 0 && (
                            <div className="p-10 text-center text-gray-400">
                                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No sales found for the selected filters.</p>
                                {hasActiveFilters && (
                                    <button onClick={clearFilters} className="mt-2 text-blue-500 text-xs hover:underline">
                                        Clear filters
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}