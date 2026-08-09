'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

type Category = {
  id: string;
  name: string;
  description: string | null;
  _count: { products: number };
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Category | 'new' | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/categories');
    const data = await res.json();
    setCategories(data.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Delete "${cat.name}"?`)) return;
    setError('');
    const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Failed to delete');
      return;
    }
    await load();
  };

  if (loading) return <div className="p-6 text-gray-500">Loading…</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto text-gray-900">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Categories</h1>
        <button
          onClick={() => setEditTarget('new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> New Category
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Description</th>
              <th className="p-3">Products</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-t">
                <td className="p-3 font-medium">{cat.name}</td>
                <td className="p-3 text-gray-500">{cat.description ?? '—'}</td>
                <td className="p-3">{cat._count.products}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button onClick={() => setEditTarget(cat)} className="text-gray-500 hover:text-blue-600">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(cat)} className="text-gray-500 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-gray-400">No categories yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editTarget && (
        <CategoryModal
          category={editTarget === 'new' ? null : editTarget}
          onClose={() => setEditTarget(null)}
          onComplete={async () => { setEditTarget(null); await load(); }}
        />
      )}
    </div>
  );
}

function CategoryModal({
  category,
  onClose,
  onComplete,
}: {
  category: Category | null;
  onClose: () => void;
  onComplete: () => Promise<void>;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = name.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(category ? `/api/categories/${category.id}` : '/api/categories', {
        method: category ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to save category');
      }
      await onComplete();
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{category ? 'Edit Category' : 'New Category'}</h2>
          <button onClick={onClose} disabled={submitting}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          className="w-full px-4 py-2 border rounded-lg mb-3"
          placeholder="e.g. Beverages"
          autoFocus
        />

        <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
          className="w-full px-4 py-2 border rounded-lg mb-2"
        />

        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} disabled={submitting} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
          <button onClick={handleSubmit} disabled={!canSubmit} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300">
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}