'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/stock-calculations';
import {
    ArrowLeft, ShoppingCart, User, Calendar, CreditCard,
    Package, Receipt, Printer, Download, CheckCircle2,
    Clock, Hash, Store, ChevronRight, AlertCircle,
} from 'lucide-react';
import { useSale } from '@/lib/hooks/use-sales';
import { SaleItem } from '@/types';

// ── helpers ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status?: string }) {
    const s = status?.toLowerCase() ?? 'completed';
    const map: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
        completed: { bg: 'bg-green-100 text-green-700',  icon: <CheckCircle2 className="w-3.5 h-3.5" />, text: 'Completed' },
        pending:   { bg: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3.5 h-3.5" />,        text: 'Pending'   },
        refunded:  { bg: 'bg-red-100 text-red-600',       icon: <AlertCircle className="w-3.5 h-3.5" />,  text: 'Refunded'  },
    };
    const cfg = map[s] ?? map.completed;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg}`}>
            {cfg.icon} {cfg.text}
        </span>
    );
}

function PaymentBadge({ method }: { method?: string }) {
    const colours: Record<string, string> = {
        Cash:          'bg-green-100 text-green-700',
        Card:          'bg-blue-100  text-blue-700',
        'Mobile Money':'bg-purple-100 text-purple-700',
        Credit:        'bg-orange-100 text-orange-700',
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colours[method ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
            {method ?? '—'}
        </span>
    );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
            <div className="mt-0.5 text-gray-400 shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-400 font-medium mb-0.5">{label}</div>
                <div className="text-sm font-medium text-gray-800 break-words">{value}</div>
            </div>
        </div>
    );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function SaleDetailSkeleton() {
    return (
        <div className="space-y-5">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-4">
                    <Skeleton className="h-28 w-full rounded-lg" />
                    <Skeleton className="h-64 w-full rounded-lg" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-52 w-full rounded-lg" />
                    <Skeleton className="h-40 w-full rounded-lg" />
                </div>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export function SaleDetail() {
    const { id } = useParams<{ id: string }>();
    const router  = useRouter();
    const { data: sale, isLoading, error } = useSale(id);

    const handlePrint = () => window.print();

    // ── Loading ────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="p-6">
                <SaleDetailSkeleton />
            </div>
        );
    }

    // ── Error ──────────────────────────────────────────────────────────────
    if (error || !sale) {
        return (
            <div className="p-6 flex flex-col items-center justify-center gap-4 min-h-[50vh] text-center">
                <AlertCircle className="w-10 h-10 text-red-400" />
                <div>
                    <p className="text-gray-800 font-semibold">Sale not found</p>
                    <p className="text-gray-500 text-sm mt-1">
                        {error ? 'Failed to load sale details.' : 'This sale does not exist or has been deleted.'}
                    </p>
                </div>
                <Link
                    href="/sales"
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                    Back to Sales
                </Link>
            </div>
        );
    }

    // ── Computed ───────────────────────────────────────────────────────────
    const subtotal  = sale.items?.reduce((s: number, i: SaleItem) => s + Number(i.unitPrice) * Number(i.quantity), 0) ?? 0;
    const discount  = subtotal - Number(sale.total);
    const hasDiscount = discount > 0;

    return (
        <div className="p-6 space-y-5">

            {/* ── Breadcrumb + actions ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Link href="/sales" className="hover:text-blue-600 flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" /> Sales
                    </Link>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-gray-800 font-medium">{sale.saleNumber}</span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                    >
                        <Printer className="w-4 h-4" /> Print
                    </button>
                    <button
                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                            // In production: trigger PDF generation
                            window.print();
                        }}
                    >
                        <Download className="w-4 h-4" /> Export PDF
                    </button>
                    <Link
                        href="/pos"
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                    >
                        <ShoppingCart className="w-4 h-4" /> New Sale
                    </Link>
                </div>
            </div>

            {/* ── Hero header ── */}
            <div className="bg-white rounded-lg border border-gray-200 shadow p-5 flex flex-wrap items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                    <Receipt className="w-7 h-7 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h1 className="text-xl font-bold text-gray-900">{sale.saleNumber}</h1>
                        <StatusBadge status={sale.status} />
                    </div>
                    <p className="text-sm text-gray-500">
                        {new Date(sale.createdAt).toLocaleString('en-US', {
                            weekday: 'long', year: 'numeric', month: 'long',
                            day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(Number(sale.total))}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{sale.items?.length ?? 0} item{(sale.items?.length ?? 0) !== 1 ? 's' : ''}</div>
                </div>
            </div>

            {/* ── Two-column layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* ── LEFT — items table ── */}
                <div className="lg:col-span-2 space-y-5">
                    <div className="bg-white rounded-lg border border-gray-200 shadow overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <h2 className="font-semibold text-gray-900 text-sm">Items Sold</h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                                    <tr>
                                        <th className="text-left px-5 py-3 font-medium">#</th>
                                        <th className="text-left px-5 py-3 font-medium">Product</th>
                                        <th className="text-right px-5 py-3 font-medium">Unit Price</th>
                                        <th className="text-right px-5 py-3 font-medium">Qty</th>
                                        <th className="text-right px-5 py-3 font-medium">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(sale.items ?? []).map((item: SaleItem, idx: number) => {
                                        const lineTotal = Number(item.unitPrice) * Number(item.quantity);
                                        return (
                                            <tr key={item.id ?? idx} className="border-t border-gray-100 hover:bg-gray-50">
                                                <td className="px-5 py-3.5 text-gray-400">{idx + 1}</td>
                                                <td className="px-5 py-3.5">
                                                    <div className="font-medium text-gray-900">
                                                        {item.product?.name ?? item?.product?.name ?? '—'}
                                                    </div>
                                                    {item.product?.sku && (
                                                        <div className="text-xs text-gray-400 mt-0.5">
                                                            SKU: {item.product.sku}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-right text-gray-600">
                                                    {formatCurrency(Number(item.unitPrice))}
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-medium">
                                                        {item.quantity}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right font-semibold text-gray-900">
                                                    {formatCurrency(lineTotal)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* ── Totals footer ── */}
                        <div className="border-t border-gray-200 px-5 py-4 space-y-2 bg-gray-50">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Subtotal</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            {hasDiscount && (
                                <div className="flex justify-between text-sm text-red-500">
                                    <span>Discount</span>
                                    <span>− {formatCurrency(discount)}</span>
                                </div>
                            )}
                            {sale.tax != null && Number(sale.tax) > 0 && (
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Tax</span>
                                    <span>{formatCurrency(Number(sale.tax))}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                                <span>Total</span>
                                <span>{formatCurrency(Number(sale.total))}</span>
                            </div>
                            {sale.amountTendered != null && (
                                <>
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Amount Tendered</span>
                                        <span>{formatCurrency(Number(sale.amountTendered))}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-semibold text-green-600">
                                        <span>Change</span>
                                        <span>{formatCurrency(Number(sale.amountTendered) - Number(sale.total))}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── Notes ── */}
                    {sale.notes && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                            <div className="font-semibold mb-1">Notes</div>
                            <p className="leading-relaxed">{sale.notes}</p>
                        </div>
                    )}
                </div>

                {/* ── RIGHT sidebar ── */}
                <div className="space-y-5">

                    {/* Transaction info */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow px-5 py-4">
                        <div className="flex items-center gap-2 mb-1 pb-3 border-b border-gray-100">
                            <Hash className="w-4 h-4 text-gray-400" />
                            <h2 className="font-semibold text-gray-900 text-sm">Transaction Info</h2>
                        </div>
                        <InfoRow
                            icon={<Hash className="w-4 h-4" />}
                            label="Sale Number"
                            value={sale.saleNumber}
                        />
                        <InfoRow
                            icon={<Calendar className="w-4 h-4" />}
                            label="Date & Time"
                            value={new Date(sale.createdAt).toLocaleString()}
                        />
                        <InfoRow
                            icon={<CreditCard className="w-4 h-4" />}
                            label="Payment Method"
                            value={<PaymentBadge method={sale.paymentMethod} />}
                        />
                        <InfoRow
                            icon={<CheckCircle2 className="w-4 h-4" />}
                            label="Status"
                            value={<StatusBadge status={sale.status} />}
                        />
                        {sale.referenceNumber && (
                            <InfoRow
                                icon={<Hash className="w-4 h-4" />}
                                label="Reference No."
                                value={sale.referenceNumber}
                            />
                        )}
                    </div>

                    {/* Customer info */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow px-5 py-4">
                        <div className="flex items-center gap-2 mb-1 pb-3 border-b border-gray-100">
                            <User className="w-4 h-4 text-gray-400" />
                            <h2 className="font-semibold text-gray-900 text-sm">Customer</h2>
                        </div>
                        <InfoRow
                            icon={<User className="w-4 h-4" />}
                            label="Name"
                            value={sale.customerName ?? 'Walk-in Customer'}
                        />
                        {sale.customerPhone && (
                            <InfoRow
                                icon={<Hash className="w-4 h-4" />}
                                label="Phone"
                                value={sale.customerPhone}
                            />
                        )}
                        {sale.customerEmail && (
                            <InfoRow
                                icon={<Hash className="w-4 h-4" />}
                                label="Email"
                                value={sale.customerEmail}
                            />
                        )}
                    </div>

                    {/* Cashier / store */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow px-5 py-4">
                        <div className="flex items-center gap-2 mb-1 pb-3 border-b border-gray-100">
                            <Store className="w-4 h-4 text-gray-400" />
                            <h2 className="font-semibold text-gray-900 text-sm">Served By</h2>
                        </div>
                        <InfoRow
                            icon={<User className="w-4 h-4" />}
                            label="Cashier"
                            value={sale.user?.name ?? '—'}
                        />
                        {sale.user?.email && (
                            <InfoRow
                                icon={<Hash className="w-4 h-4" />}
                                label="Email"
                                value={sale.user.email}
                            />
                        )}
                        {sale.branch && (
                            <InfoRow
                                icon={<Store className="w-4 h-4" />}
                                label="Branch"
                                value={sale.branch}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}