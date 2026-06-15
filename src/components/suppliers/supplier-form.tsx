'use client';

import { useForm } from 'react-hook-form';
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
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useCreateSupplier, useUpdateSupplier } from '@/lib/hooks/use-suppliers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

const schema = z.object({
  name:        z.string().min(2, 'Min 2 characters'),
  email:       z.string().email().optional().or(z.literal('')),
  phone:       z.string().optional(),
  address:     z.string().optional(),
  contactName: z.string().optional(),
  taxPin:      z.string().optional(),
  notes:       z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function SupplierForm({ supplier }: { supplier?: any }) {
  const router  = useRouter();
  const isEdit  = !!supplier;

  const { mutate: create, isPending: creating } = useCreateSupplier();
  const { mutate: update, isPending: updating } = useUpdateSupplier();
  const isPending = creating || updating;

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: supplier ?? {},
  });

  function onSubmit(data: FormData) {
    const clean = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? undefined : v])
    );
    if (isEdit) {
      update({ id: supplier.id, ...clean },
        { onSuccess: () => router.push(`/suppliers/${supplier.id}`) });
    } else {
      create(clean, { onSuccess: (res: any) => router.push(`/suppliers/${res.id}`) });
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href="/suppliers"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" />Back to Suppliers
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isEdit ? 'Edit Supplier' : 'New Supplier'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label>Business Name <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. Unga Holdings Ltd" {...register('name')} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="orders@supplier.co.ke" {...register('email')} />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input placeholder="+254 700 000 000" {...register('phone')} />
              </div>

              <div className="space-y-1.5">
                <Label>Contact Person</Label>
                <Input placeholder="Primary contact name" {...register('contactName')} />
              </div>

              <div className="space-y-1.5">
                <Label>KRA PIN</Label>
                <Input placeholder="P051234567A" {...register('taxPin')} />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label>Address</Label>
                <Input placeholder="Physical or postal address" {...register('address')} />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label>Notes</Label>
                <textarea {...register('notes')} rows={3}
                  placeholder="Payment terms, delivery notes, etc."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Link href="/suppliers" className="flex-1">
                <Button type="button" variant="outline" className="w-full">Cancel</Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEdit ? 'Save Changes' : 'Create Supplier'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}