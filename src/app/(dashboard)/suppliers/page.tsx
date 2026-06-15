'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSuppliers, useDeleteSupplier } from '@/lib/hooks/use-suppliers';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { Plus, Search, Eye, Edit, PowerOff, Building2 } from 'lucide-react';
import {
    AlertDialog, AlertDialogContent, AlertDialogHeader,
    AlertDialogTitle, AlertDialogDescription,
    AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';

export default function SuppliersPage() {
    const [search, setSearch] = useState('');
    const [activeOnly, setActiveOnly] = useState(true);
    const [skip, setSkip] = useState(0);
    const [deactivate, setDeactivate] = useState<string | null>(null);
    const TAKE = 20;

    const { data, isLoading } = useSuppliers({
        q: search || undefined,
        active: activeOnly ? 'true' : undefined,
        take: TAKE, skip,
    });
    const { mutate: remove } = useDeleteSupplier();

    const suppliers = data?.data ?? [];
    const total = data?.meta?.total ?? 0;

    return (
        <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
                    <p className="text-gray-500 text-sm mt-1">{total} supplier{total !== 1 ? 's' : ''}</p>
                </div>
                <Link href="/suppliers/new">
                    <Button><Plus className="w-4 h-4 mr-1.5" />Add Supplier</Button>
                </Link>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <Input
                            className="pl-9"
                            placeholder="Search by name, email, or phone..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setSkip(0); }}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input id="active" type="checkbox" checked={activeOnly}
                            onChange={e => setActiveOnly(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                        <label htmlFor="active" className="text-sm text-gray-600">Active only</label>
                    </div>
                </div>
            </Card>

            {/* Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array(6).fill(0).map((_, i) => (
                        <Card key={i}><div className="p-5"><Skeleton className="h-28" /></div></Card>
                    ))}
                </div>
            ) : suppliers.length === 0 ? (
                <Card className="p-16 text-center">
                    <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No suppliers found</p>
                    <Link href="/suppliers/new">
                        <Button className="mt-3">
                            <Plus className="w-4 h-4 mr-1.5" />Add First Supplier
                        </Button>
                    </Link>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {suppliers.map((s: any) => (
                        <Card key={s.id} className="hover:shadow-md transition-shadow">
                            <div className="p-5 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center
                      text-blue-700 font-bold text-sm flex-shrink-0">
                                            {s.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 leading-tight">{s.name}</p>
                                            {s.contactName && (
                                                <p className="text-xs text-gray-400">{s.contactName}</p>
                                            )}
                                        </div>
                                    </div>
                                    <Badge className={s.isActive
                                        ? 'bg-green-100 text-green-700 text-xs border-0'
                                        : 'bg-gray-100 text-gray-400 text-xs border-0'}>
                                        {s.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>

                                <div className="space-y-1.5 text-xs text-gray-500">
                                    {s.email && <p>{s.email}</p>}
                                    {s.phone && <p>{s.phone}</p>}
                                    {s.taxPin && <p>PIN: {s.taxPin}</p>}
                                </div>

                                <div className="flex items-center gap-3 pt-1 text-xs">
                                    <span className="text-gray-400">
                                        {s._count?.expenses ?? 0} expense{s._count?.expenses !== 1 ? 's' : ''}
                                    </span>
                                    <span className="text-gray-200">·</span>
                                    <span className="text-gray-400">
                                        {s._count?.products ?? 0} product{s._count?.products !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                <div className="flex gap-1 pt-1 border-t border-gray-50">
                                    <Link href={`/suppliers/${s.id}`} className="flex-1">
                                        <Button variant="outline" className="w-full h-8 text-xs">
                                            <Eye className="w-3.5 h-3.5 mr-1.5" />View
                                        </Button>
                                    </Link>
                                    <Link href={`/suppliers/${s.id}/edit`} className="flex-1">
                                        <Button variant="outline" className="w-full h-8 text-xs">
                                            <Edit className="w-3.5 h-3.5 mr-1.5" />Edit
                                        </Button>
                                    </Link>
                                    {s.isActive && (
                                        <Button variant="outline"
                                            className="h-8 text-xs text-red-400 hover:text-red-600"
                                            onClick={() => setDeactivate(s.id)}>
                                            <PowerOff className="w-3.5 h-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {total > TAKE && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                        Showing {skip + 1}–{Math.min(skip + TAKE, total)} of {total}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" disabled={skip === 0}
                            onClick={() => setSkip(s => Math.max(0, s - TAKE))}>Previous</Button>
                        <Button variant="outline" disabled={skip + TAKE >= total}
                            onClick={() => setSkip(s => s + TAKE)}>Next</Button>
                    </div>
                </div>
            )}

            {/* Deactivate confirm */}
            <AlertDialog open={!!deactivate} onOpenChange={() => setDeactivate(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Deactivate supplier?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The supplier will be marked inactive. Historical expense data is preserved.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700"
                            onClick={() => { if (deactivate) remove(deactivate); setDeactivate(null); }}>
                            Deactivate
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}