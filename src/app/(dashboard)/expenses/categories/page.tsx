'use client';

import { useState } from 'react';
import {
    useExpenseCategories,
    useSeedExpenseCategories,
} from '@/lib/hooks/use-expenses';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

import {
    AlertDialog, AlertDialogContent, AlertDialogHeader,
    AlertDialogTitle, AlertDialogDescription,
    AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Plus, Tag, Pencil, Trash2, Sprout, Loader2, Lock } from 'lucide-react';
import { DialogContent } from '@radix-ui/react-dialog';
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

// ── Colour swatches ───────────────────────────────────────────────────────────
const SWATCHES = [
    '#6366f1', '#3b82f6', '#14b8a6', '#22c55e', '#f59e0b',
    '#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#94a3b8',
    '#84cc16', '#0ea5e9', '#a78bfa', '#fb923c', '#6b7280',
];

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useCreateCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => fetch('/expenses/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).then(r => r.json()),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['expense-categories'] });
            toast.success('Category created');
        },
        onError: (err: any) => toast.error(err.response?.data?.error ?? 'Failed to create'),
    });
}

function useUpdateCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: any) =>
            fetch(`/expenses/categories/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            }).then(r => r.json()),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['expense-categories'] });
            toast.success('Category updated');
        },
        onError: (err: any) => toast.error(err.response?.data?.error ?? 'Failed to update'),
    });
}

function useDeleteCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => fetch(`/expenses/categories/${id}`, {
            method: 'DELETE',
        }).then(r => r.json()),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['expense-categories'] });
            toast.success('Category deleted');
        },
        onError: (err: any) => toast.error(err.response?.data?.error ?? 'Failed to delete'),
    });
}

// ── Category form ─────────────────────────────────────────────────────────────
const schema = z.object({
    name: z.string().min(2, 'Min 2 characters'),
    description: z.string().optional(),
    color: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function CategoryForm({
    category,
    onClose,
}: {
    category?: any;
    onClose: () => void;
}) {
    const isEdit = !!category;
    const { mutate: create, isPending: creating } = useCreateCategory();
    const { mutate: update, isPending: updating } = useUpdateCategory();
    const isPending = creating || updating;

    const [selectedColor, setSelectedColor] = useState<string>(
        category?.color ?? SWATCHES[0]
    );

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: category?.name ?? '',
            description: category?.description ?? '',
            color: category?.color ?? SWATCHES[0],
        },
    });

    function onSubmit(data: FormData) {
        const payload = { ...data, color: selectedColor };
        if (isEdit) {
            update({ id: category.id, ...payload }, { onSuccess: onClose });
        } else {
            create(payload, { onSuccess: onClose });
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
                <Label>Name <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. Office Supplies" {...register('name')} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
                <Label>Description</Label>
                <Input placeholder="Optional description" {...register('description')} />
            </div>

            <div className="space-y-2">
                <Label>Colour</Label>
                <div className="flex flex-wrap gap-2">
                    {SWATCHES.map(color => (
                        <button
                            key={color}
                            type="button"
                            onClick={() => setSelectedColor(color)}
                            className={cn(
                                'w-7 h-7 rounded-full transition-transform hover:scale-110',
                                selectedColor === color
                                    ? 'ring-2 ring-offset-2 ring-gray-900 scale-110'
                                    : ''
                            )}
                            style={{ background: color }}
                            title={color}
                        />
                    ))}
                </div>
                {/* Preview */}
                <div className="flex items-center gap-2 mt-2">
                    <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: selectedColor }}
                    />
                    <span className="text-sm text-gray-600">
                        Preview: <strong>{(document?.querySelector<HTMLInputElement>('input[name="name"]')?.value) || 'Category name'}</strong>
                    </span>
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                    Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isPending}>
                    {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {isEdit ? 'Save Changes' : 'Create Category'}
                </Button>
            </div>
        </form>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ExpenseCategoriesPage() {
    const { data: categories = [], isLoading } = useExpenseCategories();
    const { mutate: seed, isPending: seeding } = useSeedExpenseCategories();
    const { mutate: remove } = useDeleteCategory();

    const [modal, setModal] = useState<any | null | undefined>(undefined);
    // undefined = closed, null = creating, object = editing
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const filtered = (categories as any[]).filter(c =>
        !search || c.name.toLowerCase().includes(search.toLowerCase())
    );

    const systemCount = (categories as any[]).filter((c: any) => c.isSystem).length;
    const customCount = (categories as any[]).filter((c: any) => !c.isSystem).length;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                        <Tag className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Expense Categories</h1>
                        <p className="text-gray-500 text-sm mt-0.5">
                            {systemCount} system · {customCount} custom
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {(categories as any[]).length === 0 && (
                        <Button variant="outline" onClick={() => seed()} disabled={seeding}>
                            {seeding
                                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Seeding...</>
                                : <><Sprout className="w-4 h-4 mr-2" />Seed Defaults</>}
                        </Button>
                    )}
                    <Button onClick={() => setModal(null)}>
                        <Plus className="w-4 h-4 mr-2" />New Category
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Tag className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input
                    className="pl-9"
                    placeholder="Search categories..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array(6).fill(0).map((_, i) => (
                        <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <Card className="p-16 text-center">
                    <Tag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">
                        {search ? `No categories matching "${search}"` : 'No categories yet'}
                    </p>
                    {!search && (
                        <p className="text-gray-400 text-sm mt-1">
                            Click "Seed Defaults" to add common categories or create your own.
                        </p>
                    )}
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((cat: any) => (
                        <Card
                            key={cat.id}
                            className="group hover:shadow-md transition-shadow overflow-hidden"
                        >
                            {/* Colour strip */}
                            <div className="h-1.5" style={{ background: cat.color ?? '#94a3b8' }} />

                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                        <div
                                            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ background: `${cat.color ?? '#94a3b8'}20` }}
                                        >
                                            <Tag
                                                className="w-4 h-4"
                                                style={{ color: cat.color ?? '#94a3b8' }}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className="font-semibold text-gray-900 truncate">{cat.name}</p>
                                                {cat.isSystem && (
                                                    <Lock className="w-3 h-3 text-gray-300 flex-shrink-0" > System category</Lock>
                                                )}
                                            </div>
                                            {cat.description && (
                                                <p className="text-xs text-gray-400 truncate mt-0.5">{cat.description}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions — visible on hover */}
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                        <Button
                                            variant="outline"
                                            className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600"
                                            onClick={() => setModal(cat)}
                                            title={cat.isSystem ? 'Edit name/colour' : 'Edit'}
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                        {!cat.isSystem && (
                                            <Button
                                                variant="danger"
                                                className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                                                onClick={() => setDeleteId(cat.id)}
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Usage count */}
                                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                                    <span className="text-xs text-gray-400">
                                        {cat._count?.expenses ?? 0} expense{cat._count?.expenses !== 1 ? 's' : ''}
                                    </span>
                                    <span
                                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                                        style={{
                                            background: `${cat.color ?? '#94a3b8'}15`,
                                            color: cat.color ?? '#94a3b8',
                                        }}
                                    >
                                        {cat.isSystem ? 'System' : 'Custom'}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )
            }

            {/* Create / Edit modal */}
            <AlertDialog
                open={modal !== undefined}
                onOpenChange={open => !open && setModal(undefined)}
            >
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {modal ? `Edit "${modal.name}"` : 'New Expense Category'}
                        </AlertDialogTitle>
                    </AlertDialogHeader>
                    {modal !== undefined && (
                        <CategoryForm
                            category={modal ?? undefined}
                            onClose={() => setModal(undefined)}
                        />
                    )}
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete category?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This cannot be undone. Expenses using this category will become uncategorised.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => { if (deleteId) { remove(deleteId); setDeleteId(null); } }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}