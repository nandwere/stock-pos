'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';

// Lightweight local zod resolver to avoid dependency on '@hookform/resolvers/zod'
// Custom zod resolver to avoid dependency on @hookform/resolvers/zod
const zodResolver = (schema: any) => async (values: any) => {
  const result = schema.safeParse(values);
  if (result.success) return { values: result.data, errors: {} };

  const errors: any = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || '_';
    errors[path] = { type: issue.code, message: issue.message };
  }
  return { values: {}, errors };
};
import { useRouter } from 'next/navigation';
import { useCreateExpense, useUpdateExpense, useExpenseCategories } from '@/lib/hooks/use-expenses';
import { useSuppliers } from '@/lib/hooks/use-suppliers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const itemSchema = z.object({
  description: z.string().min(1, 'Required'),
  quantity:    z.coerce.number().positive(),
  unitPrice:   z.coerce.number().positive(),
});

const schema = z.object({
  description:     z.string().min(3, 'Min 3 characters'),
  type:            z.enum(['OPERATIONAL', 'CAPITAL', 'RECURRING', 'ONE_TIME']),
  amount:          z.coerce.number().positive('Must be positive'),
  tax:             z.coerce.number().min(0).default(0),
  expenseDate:     z.string(),
  dueDate:         z.string().optional(),
  supplierId:      z.string().optional(),
  categoryId:      z.string().optional(),
  paymentMethod:   z.string().optional(),
  paymentReference:z.string().optional(),
  notes:           z.string().optional(),
  isRecurring:     z.boolean().default(false),
  recurringDay:    z.coerce.number().min(1).max(31).optional(),
  useLineItems:    z.boolean().default(false),
  items:           z.array(itemSchema).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  expense?: any;   // pass existing expense for edit mode
}

export function ExpenseForm({ expense }: Props) {
  const router  = useRouter();
  const isEdit  = !!expense;

  const { mutate: create, isPending: creating } = useCreateExpense();
  const { mutate: update, isPending: updating } = useUpdateExpense();
  const isPending = creating || updating;

  const { data: categories = [] } = useExpenseCategories();
  const { data: suppliersData   } = useSuppliers({ take: 100 });
  const suppliers = suppliersData?.data ?? [];

  const {
    register, handleSubmit, watch, control,
    setValue, formState: { errors },
  } = useForm<FormData>({
    resolver:      zodResolver(schema),
    defaultValues: expense ? {
      description:      expense.description,
      type:             expense.type,
      amount:           Number(expense.amount),
      tax:              Number(expense.tax),
      expenseDate:      expense.expenseDate?.split('T')[0],
      dueDate:          expense.dueDate?.split('T')[0] ?? '',
      supplierId:       expense.supplierId ?? '',
      categoryId:       expense.categoryId ?? '',
      notes:            expense.notes ?? '',
      isRecurring:      expense.isRecurring,
      recurringDay:     expense.recurringDay,
      useLineItems:     (expense.items?.length ?? 0) > 0,
      items:            expense.items ?? [],
    } : {
      type:        'OPERATIONAL',
      tax:         0,
      expenseDate: new Date().toISOString().split('T')[0],
      isRecurring: false,
      useLineItems:false,
      items:       [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const amount       = watch('amount')       ?? 0;
  const tax          = watch('tax')          ?? 0;
  const isRecurring  = watch('isRecurring');
  const useLineItems = watch('useLineItems');
  const items        = watch('items') ?? [];

  // Auto-calculate amount from line items
  const lineTotal = items.reduce((s, item) => s + (Number(item.quantity) * Number(item.unitPrice)), 0);
  useEffect(() => {
    if (useLineItems && lineTotal > 0) setValue('amount', lineTotal);
  }, [lineTotal, useLineItems, setValue]);

  const grandTotal = Number(amount) + Number(tax);

  function onSubmit(data: FormData) {
    const payload = {
      ...data,
      supplierId:  data.supplierId  || undefined,
      categoryId:  data.categoryId  || undefined,
      items:       data.useLineItems ? data.items : [],
    };
    if (isEdit) {
      update({ id: expense.id, ...payload }, { onSuccess: () => router.push(`/expenses/${expense.id}`) });
    } else {
      create(payload, { onSuccess: (res: any) => router.push(`/expenses/${res.id}`) });
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/expenses"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" />Back to Expenses
      </Link>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Basic info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Expense Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label>Description <span className="text-red-500">*</span></Label>
                <Input placeholder="What was this expense for?" {...register('description')} />
                {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Type</Label>
                <select {...register('type')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {[['OPERATIONAL','Operational'],['CAPITAL','Capital'],['RECURRING','Recurring'],['ONE_TIME','One-time']].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Category</Label>
                <select {...register('categoryId')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select category...</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <select {...register('supplierId')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">No supplier</option>
                  {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Expense Date <span className="text-red-500">*</span></Label>
                <Input type="date" {...register('expenseDate')} />
              </div>

              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" {...register('dueDate')} />
              </div>
            </div>

            {/* Recurring */}
            <div className="flex items-center gap-3 pt-1">
              <input id="recurring" type="checkbox" {...register('isRecurring')}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
              <Label htmlFor="recurring" className="cursor-pointer">This is a recurring expense</Label>
            </div>
            {isRecurring && (
              <div className="space-y-1.5 ml-7">
                <Label>Day of month</Label>
                <Input type="number" min={1} max={31} placeholder="e.g. 5" {...register('recurringDay')}
                  className="w-32" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Amount */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Amount</CardTitle>
            <div className="flex items-center gap-2">
              <input id="lineItems" type="checkbox" {...register('useLineItems')}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
              <Label htmlFor="lineItems" className="text-sm cursor-pointer font-normal">
                Use line items
              </Label>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {useLineItems ? (
              <>
                <div className="space-y-2">
                  {fields.map((field, i) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-5">
                        <Input placeholder="Item description"
                          {...register(`items.${i}.description`)} />
                        {errors.items?.[i]?.description && (
                          <p className="text-xs text-red-500 mt-0.5">{errors.items[i]?.description?.message}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <Input type="number" step="0.01" placeholder="Qty"
                          {...register(`items.${i}.quantity`)} />
                      </div>
                      <div className="col-span-3">
                        <Input type="number" step="0.01" placeholder="Unit price"
                          {...register(`items.${i}.unitPrice`)} />
                      </div>
                      <div className="col-span-1 flex items-center justify-center pt-2 text-sm text-gray-500">
                        {formatCurrency(
                          Number(watch(`items.${i}.quantity`) ?? 0) *
                          Number(watch(`items.${i}.unitPrice`) ?? 0)
                        )}
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        <Button type="button" variant="outline"
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-600"
                          onClick={() => remove(i)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline"
                    onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />Add Line Item
                  </Button>
                </div>
                <div className="flex justify-end text-sm text-gray-600">
                  Subtotal: <span className="font-semibold ml-2">{formatCurrency(lineTotal)}</span>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label>Amount (KES) <span className="text-red-500">*</span></Label>
                <Input type="number" step="0.01" placeholder="0.00" {...register('amount')} />
                {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tax (KES)</Label>
                <Input type="number" step="0.01" placeholder="0.00" {...register('tax')} />
              </div>
              <div className="space-y-1.5">
                <Label>Total</Label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900">
                  {formatCurrency(grandTotal)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent className="pt-5">
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <textarea {...register('notes')} rows={3}
                placeholder="Any additional notes..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Link href="/expenses" className="flex-1">
            <Button type="button" variant="outline" className="w-full">Cancel</Button>
          </Link>
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Expense'}
          </Button>
        </div>
      </form>
    </div>
  );
}