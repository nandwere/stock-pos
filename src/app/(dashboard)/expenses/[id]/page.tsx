'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useExpense, useExpenseAction } from '@/lib/hooks/use-expenses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExpenseStatusBadge } from '@/components/expenses/expense-status-badge';
import { ExpenseTypeBadge } from '@/components/expenses/expense-type-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ArrowLeft, Edit, Send, CheckCircle,
  XCircle, Wallet, Ban, User,
  Calendar, Tag, Building2, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogFooter,
  AlertDialogDescription, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';

// ── Action modal (approve / reject / pay) ────────────────────────────────────

function ActionModal({
  open, onClose, title, onConfirm, isPending,
  showComment, showPayment,
}: {
  open:         boolean;
  onClose:      () => void;
  title:        string;
  onConfirm:    (comment: string, paymentMethod?: string, paymentRef?: string) => void;
  isPending:    boolean;
  showComment:  boolean;
  showPayment:  boolean;
}) {
  const [comment, setComment]       = useState('');
  const [method,  setMethod]        = useState('CASH');
  const [ref,     setRef]           = useState('');

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="space-y-4 py-2">
          {showComment && (
            <div className="space-y-1.5">
              <Label>Comment</Label>
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Optional note..." />
            </div>
          )}
          {showPayment && (
            <>
              <div className="space-y-1.5">
                <Label>Payment Method <span className="text-red-500">*</span></Label>
                <select value={method} onChange={e => setMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {['CASH','CARD','MOBILE_MONEY','CREDIT'].map(m => (
                    <option key={m} value={m}>{m.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Payment Reference</Label>
                <input value={ref} onChange={e => setRef(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. M-Pesa code, receipt number" />
              </div>
            </>
          )}
        </div>
        <AlertDialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(comment, method, ref)} disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirm
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: expense, isLoading } = useExpense(id);
  const { mutate: action, isPending } = useExpenseAction();

  const [modal, setModal] = useState<'approve' | 'reject' | 'pay' | null>(null);

  function handleAction(
    type: 'approve' | 'reject' | 'pay',
    comment: string,
    paymentMethod?: string,
    paymentReference?: string,
  ) {
    action(
      { id, action: type, comment, paymentMethod, paymentReference },
      { onSuccess: () => setModal(null) }
    );
  }

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64" />
    </div>
  );

  if (!expense) return (
    <div className="p-6 text-center text-gray-500">Expense not found</div>
  );

  const isOverdue = expense.dueDate &&
    new Date(expense.dueDate) < new Date() &&
    expense.status !== 'PAID';

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/expenses">
            <Button variant="outline" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-gray-900 font-mono">{expense.expenseNumber}</h1>
              <ExpenseStatusBadge status={expense.status} />
              <ExpenseTypeBadge type={expense.type} />
              {expense.isRecurring && (
                <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                  ↻ Recurring (day {expense.recurringDay})
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm mt-0.5">{expense.description}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {['DRAFT', 'REJECTED'].includes(expense.status) && (
            <Link href={`/expenses/${expense.id}/edit`}>
              <Button variant="outline">
                <Edit className="w-3.5 h-3.5 mr-1.5" />Edit
              </Button>
            </Link>
          )}
          {expense.status === 'DRAFT' && (
            <Button onClick={() => action({ id: expense.id, action: 'submit' })} disabled={isPending}>
              <Send className="w-3.5 h-3.5 mr-1.5" />Submit for Approval
            </Button>
          )}
          {expense.status === 'SUBMITTED' && (
            <>
              <Button className="bg-teal-600 hover:bg-teal-700"
                onClick={() => setModal('approve')} disabled={isPending}>
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />Approve
              </Button>
              <Button variant="default" className="bg-red-600 hover:bg-red-700"
                onClick={() => setModal('reject')} disabled={isPending}>
                <XCircle className="w-3.5 h-3.5 mr-1.5" />Reject
              </Button>
            </>
          )}
          {expense.status === 'APPROVED' && (
            <Button className="bg-green-600 hover:bg-green-700"
              onClick={() => setModal('pay')} disabled={isPending}>
              <Wallet className="w-3.5 h-3.5 mr-1.5" />Mark as Paid
            </Button>
          )}
          {!['PAID', 'VOIDED'].includes(expense.status) && (
            <Button variant="outline" className="text-gray-400 hover:text-red-500"
              onClick={() => action({ id: expense.id, action: 'void' })} disabled={isPending}>
              <Ban className="w-3.5 h-3.5 mr-1.5" />Void
            </Button>
          )}
        </div>
      </div>

      {/* Overdue warning */}
      {isOverdue && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 font-medium">
          ⚠ This expense was due on {formatDate(expense.dueDate!)} and has not been paid yet.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-5">

          {/* Amount breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{formatCurrency(expense.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax</span>
                  <span className="font-medium">{formatCurrency(expense.tax)}</span>
                </div>
                <div className="flex justify-between border-t pt-2.5">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-gray-900">{formatCurrency(expense.total)}</span>
                </div>
                {expense.status === 'PAID' && (
                  <div className="flex justify-between text-sm pt-1 text-green-600">
                    <span>Paid via {expense.paymentMethod?.replace('_', ' ')}</span>
                    <span>{expense.paymentReference && `Ref: ${expense.paymentReference}`}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Line items */}
          {(expense.items?.length ?? 0) > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-2 text-left text-xs text-gray-400 font-medium">Description</th>
                      <th className="pb-2 text-right text-xs text-gray-400 font-medium">Qty</th>
                      <th className="pb-2 text-right text-xs text-gray-400 font-medium">Unit Price</th>
                      <th className="pb-2 text-right text-xs text-gray-400 font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {expense.items.map((item: any) => (
                      <tr key={item.id}>
                        <td className="py-2 text-gray-700">{item.description}</td>
                        <td className="py-2 text-right text-gray-500">{item.quantity}</td>
                        <td className="py-2 text-right text-gray-500">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {expense.notes && (
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{expense.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">

          {/* Meta */}
          <Card>
            <CardContent className="pt-5 space-y-4">
              {[
                { icon: User,      label: 'Created by',  value: expense.user?.name },
                { icon: Calendar,  label: 'Expense date',value: formatDate(expense.expenseDate) },
                expense.dueDate && {
                  icon: Calendar,  label: 'Due date',    value: formatDate(expense.dueDate),
                  className: isOverdue ? 'text-red-600' : undefined,
                },
                expense.paidAt && {
                  icon: Wallet,    label: 'Paid on',     value: formatDate(expense.paidAt),
                },
                expense.supplier && {
                  icon: Building2, label: 'Supplier',    value: expense.supplier.name,
                  link: `/suppliers/${expense.supplierId}`,
                },
                expense.category && {
                  icon: Tag,       label: 'Category',    value: expense.category.name,
                  dot:  expense.category.color,
                },
              ].filter(Boolean).map((item: any, i: number) => (
                <div key={i} className="flex items-start gap-2.5">
                  <item.icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    {item.link ? (
                      <Link href={item.link}
                        className="text-sm font-medium text-blue-600 hover:underline">
                        {item.value}
                      </Link>
                    ) : (
                      <p className={`text-sm font-medium text-gray-900 ${item.className ?? ''}`}>
                        {item.dot && (
                          <span className="inline-block w-2 h-2 rounded-full mr-1.5"
                            style={{ background: item.dot }} />
                        )}
                        {item.value}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Approval history */}
          {(expense.approvals?.length ?? 0) > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Approval History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {expense.approvals.map((a: any) => (
                    <div key={a.id} className="flex items-start gap-2.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                        ${a.status === 'APPROVED' ? 'bg-teal-100' : 'bg-red-100'}`}>
                        {a.status === 'APPROVED'
                          ? <CheckCircle className="w-3 h-3 text-teal-600" />
                          : <XCircle    className="w-3 h-3 text-red-500" />}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-900">
                          {a.status === 'APPROVED' ? 'Approved' : 'Rejected'} by {a.approver.name}
                        </p>
                        {a.comment && (
                          <p className="text-xs text-gray-500 mt-0.5">{a.comment}</p>
                        )}
                        {a.decidedAt && (
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(a.decidedAt)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <ActionModal
        open={modal === 'approve'} onClose={() => setModal(null)}
        title="Approve expense" isPending={isPending}
        showComment showPayment={false}
        onConfirm={(comment) => handleAction('approve', comment)}
      />
      <ActionModal
        open={modal === 'reject'} onClose={() => setModal(null)}
        title="Reject expense" isPending={isPending}
        showComment showPayment={false}
        onConfirm={(comment) => handleAction('reject', comment)}
      />
      <ActionModal
        open={modal === 'pay'} onClose={() => setModal(null)}
        title="Mark as paid" isPending={isPending}
        showComment={false} showPayment
        onConfirm={(comment, method, ref) => handleAction('pay', comment, method, ref)}
      />
    </div>
  );
}