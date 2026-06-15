'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSupplier } from '@/lib/hooks/use-suppliers';
import { useExpenses } from '@/lib/hooks/use-expenses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExpenseStatusBadge } from '@/components/expenses/expense-status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ArrowLeft, Edit, Mail, Phone,
  MapPin, User, FileText, Package,
  TrendingUp, Plus,
} from 'lucide-react';

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: supplier, isLoading } = useSupplier(id);
  const { data: expensesData } = useExpenses({ supplierId: id, take: 10 });
  const expenses = expensesData?.data ?? [];

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-3 gap-4">
        {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );

  if (!supplier) return (
    <div className="p-6 text-center text-gray-400">Supplier not found</div>
  );

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/suppliers">
            <Button variant="outline" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center
              text-blue-700 font-bold text-lg">
              {supplier.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{supplier.name}</h1>
                <Badge className={supplier.isActive
                  ? 'bg-green-100 text-green-700 border-0 text-xs'
                  : 'bg-gray-100 text-gray-400 border-0 text-xs'}>
                  {supplier.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {supplier.contactName && (
                <p className="text-gray-500 text-sm">Contact: {supplier.contactName}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/expenses/new?supplierId=${supplier.id}`}>
            <Button variant="outline">
              <Plus className="w-3.5 h-3.5 mr-1.5" />New Expense
            </Button>
          </Link>
          <Link href={`/suppliers/${supplier.id}/edit`}>
            <Button variant="outline">
              <Edit className="w-3.5 h-3.5 mr-1.5" />Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: TrendingUp, label: 'Total Spend (Paid)',
            value: formatCurrency(supplier.totalSpend ?? 0),
            sub:   `${supplier.paidExpenses ?? 0} paid invoice${supplier.paidExpenses !== 1 ? 's' : ''}`,
            color: 'bg-green-100 text-green-600',
          },
          {
            icon: FileText, label: 'Total Expenses',
            value: supplier._count?.expenses ?? 0,
            sub:   'All time',
            color: 'bg-blue-100 text-blue-600',
          },
          {
            icon: Package, label: 'Linked Products',
            value: supplier._count?.products ?? 0,
            sub:   'Products from this supplier',
            color: 'bg-purple-100 text-purple-600',
          },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className={`inline-flex p-2 rounded-lg mb-3 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
              <p className="text-xs text-gray-400 mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Contact info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: Mail,    label: 'Email',   value: supplier.email       },
              { icon: Phone,   label: 'Phone',   value: supplier.phone       },
              { icon: MapPin,  label: 'Address', value: supplier.address     },
              { icon: User,    label: 'Contact', value: supplier.contactName },
              { icon: FileText,label: 'KRA PIN', value: supplier.taxPin      },
            ].filter(i => i.value).map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-2.5">
                <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm text-gray-800">{value}</p>
                </div>
              </div>
            ))}
            {supplier.notes && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-xs text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{supplier.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent expenses */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Recent Expenses</CardTitle>
              <Link href={`/expenses?supplierId=${supplier.id}`}
                className="text-xs text-blue-600 hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No expenses yet</p>
                  <Link href={`/expenses/new?supplierId=${supplier.id}`}>
                    <Button variant="outline" className="mt-2">
                      <Plus className="w-3.5 h-3.5 mr-1.5" />Create First Expense
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-0 divide-y divide-gray-50">
                  {expenses.map((exp: any) => (
                    <Link key={exp.id} href={`/expenses/${exp.id}`}
                      className="flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {exp.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {exp.expenseNumber} · {formatDate(exp.expenseDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-3">
                        <ExpenseStatusBadge status={exp.status} />
                        <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                          {formatCurrency(exp.total)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}