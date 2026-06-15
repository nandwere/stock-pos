'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    useExpenses, useExpenseCategories,
    useExpenseAction, useDeleteExpense,
} from '@/lib/hooks/use-expenses';
import { useSuppliers } from '@/lib/hooks/use-suppliers';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ExpenseStatusBadge } from '@/components/expenses/expense-status-badge';
import { ExpenseTypeBadge } from '@/components/expenses/expense-type-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
    Plus, Search, Send, CheckCircle,
    XCircle, Wallet, Trash2, Eye,
    BarChart2, RefreshCw,
} from 'lucide-react';
import {
    AlertDialog, AlertDialogContent, AlertDialogHeader,
    AlertDialogTitle, AlertDialogDescription,
    AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';

const TAKE = 20;

export default function ExpensesPage() {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [type, setType] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [skip, setSkip] = useState(0);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data, isLoading } = useExpenses({ search: search || undefined, status: status || undefined, type: type || undefined, supplierId: supplierId || undefined, categoryId: categoryId || undefined, take: TAKE, skip });
    const { data: categories = [] } = useExpenseCategories();
    const { data: suppliersData } = useSuppliers({ take: 100 });
    const { mutate: action, isPending } = useExpenseAction();
    const { mutate: remove, isPending: deleting } = useDeleteExpense();

    const expenses = data?.data ?? [];
    const total = data?.meta?.total ?? 0;
    const totalAmt = data?.meta?.totalAmount ?? 0;
    const suppliers = suppliersData?.data ?? [];

    function resetFilters() {
        setSearch(''); setStatus(''); setType('');
        setSupplierId(''); setCategoryId(''); setSkip(0);
    }

    return (
        <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {total} records · Total: <span className="font-semibold text-gray-700">{formatCurrency(totalAmt)}</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/expenses/summary">
                        <Button variant="outline">
                            <BarChart2 className="w-4 h-4 mr-1.5" />Summary
                        </Button>
                    </Link>
                    <Link href="/expenses/new">
                        <Button>
                            <Plus className="w-4 h-4 mr-1.5" />New Expense
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <Card className="p-4 space-y-3">
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <Input
                            className="pl-9"
                            placeholder="Search by number or description..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setSkip(0); }}
                        />
                    </div>
                    <select value={status} onChange={e => { setStatus(e.target.value); setSkip(0); }}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">All Statuses</option>
                        {['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'VOIDED'].map(s => (
                            <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                        ))}
                    </select>
                    <select value={type} onChange={e => { setType(e.target.value); setSkip(0); }}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">All Types</option>
                        {['OPERATIONAL', 'CAPITAL', 'RECURRING', 'ONE_TIME'].map(t => (
                            <option key={t} value={t}>{t.replace('_', ' ')}</option>
                        ))}
                    </select>
                    <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setSkip(0); }}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">All Categories</option>
                        {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={supplierId} onChange={e => { setSupplierId(e.target.value); setSkip(0); }}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">All Suppliers</option>
                        {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    {(search || status || type || categoryId || supplierId) && (
                        <Button variant="outline" onClick={resetFilters}>
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Reset
                        </Button>
                    )}
                </div>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                {['#', 'Description', 'Supplier', 'Category', 'Type', 'Amount', 'Date', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? Array(6).fill(0).map((_, i) => (
                                <tr key={i}>
                                    {Array(9).fill(0).map((_, j) => (
                                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                                    ))}
                                </tr>
                            )) : expenses.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-16 text-center">
                                        <p className="text-gray-400 text-sm">No expenses found</p>
                                        <Link href="/expenses/new">
                                            <Button className="mt-3">
                                                <Plus className="w-4 h-4 mr-1.5" />Add First Expense
                                            </Button>
                                        </Link>
                                    </td>
                                </tr>
                            ) : expenses.map((exp: any) => (
                                <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-xs text-blue-600">{exp.expenseNumber}</span>
                                    </td>
                                    <td className="px-4 py-3 max-w-[180px]">
                                        <p className="text-sm font-medium text-gray-900 truncate">{exp.description}</p>
                                        {exp.isRecurring && (
                                            <p className="text-xs text-orange-500 mt-0.5">↻ Recurring</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                        {exp.supplier?.name ?? <span className="text-gray-300">—</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        {exp.category ? (
                                            <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                                                <span
                                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                                    style={{ background: exp.category.color ?? '#94a3b8' }}
                                                />
                                                {exp.category.name}
                                            </span>
                                        ) : <span className="text-gray-300 text-xs">—</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <ExpenseTypeBadge type={exp.type} />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(exp.total)}</p>
                                        {Number(exp.tax) > 0 && (
                                            <p className="text-xs text-gray-400">Tax: {formatCurrency(exp.tax)}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                                        {formatDate(exp.expenseDate)}
                                        {exp.dueDate && new Date(exp.dueDate) < new Date() && exp.status !== 'PAID' && (
                                            <p className="text-xs text-red-500 mt-0.5">Overdue</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <ExpenseStatusBadge status={exp.status} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <Link href={`/expenses/${exp.id}`}>
                                                <Button variant="outline" className="h-7 w-7 p-0" title="View">
                                                    <Eye className="w-3.5 h-3.5" />
                                                </Button>
                                            </Link>
                                            {exp.status === 'DRAFT' && (
                                                <Button variant="outline" className="h-7 px-2 text-xs text-blue-600"
                                                    onClick={() => action({ id: exp.id, action: 'submit' })} disabled={isPending}>
                                                    <Send className="w-3 h-3 mr-1" />Submit
                                                </Button>
                                            )}
                                            {exp.status === 'SUBMITTED' && (
                                                <>
                                                    <Button variant="outline" className="h-7 px-2 text-xs text-teal-600"
                                                        onClick={() => action({ id: exp.id, action: 'approve' })} disabled={isPending}>
                                                        <CheckCircle className="w-3 h-3 mr-1" />Approve
                                                    </Button>
                                                    <Button variant="outline" className="h-7 px-2 text-xs text-red-500"
                                                        onClick={() => action({ id: exp.id, action: 'reject', comment: 'Rejected' })} disabled={isPending}>
                                                        <XCircle className="w-3 h-3 mr-1" />Reject
                                                    </Button>
                                                </>
                                            )}
                                            {exp.status === 'APPROVED' && (
                                                <Button variant="outline" className="h-7 px-2 text-xs text-green-600"
                                                    onClick={() => action({ id: exp.id, action: 'pay', paymentMethod: 'CASH' })} disabled={isPending}>
                                                    <Wallet className="w-3 h-3 mr-1" />Pay
                                                </Button>
                                            )}
                                            {['DRAFT', 'REJECTED'].includes(exp.status) && (
                                                <Button variant="outline" className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                                                    onClick={() => setDeleteId(exp.id)}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {total > TAKE && (
                    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                        <p className="text-xs text-gray-500">
                            Showing {skip + 1}–{Math.min(skip + TAKE, total)} of {total}
                        </p>
                        <div className="flex gap-2">
                            <Button variant="outline" disabled={skip === 0}
                                onClick={() => setSkip(s => Math.max(0, s - TAKE))}>
                                Previous
                            </Button>
                            <Button variant="outline" disabled={skip + TAKE >= total}
                                onClick={() => setSkip(s => s + TAKE)}>
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Delete confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete expense?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This cannot be undone. Only draft and rejected expenses can be deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => { if (deleteId) remove(deleteId); setDeleteId(null); }}
                        >
                            {deleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}