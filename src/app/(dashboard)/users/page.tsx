'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Edit, Trash2, Loader2,
  ShieldCheck, ShieldAlert, User, Search, X, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { useCreateUser, useDeleteUser, useUpdateUser, useUsers } from '@/lib/hooks/use-users';

type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  merchant: { id: string; name: string } | null;
}

interface UserFormData {
  name: string;
  email: string;
  role: UserRole;
  password: string;
  isActive: boolean;
}

// ── Hooks ──────────────────────────────────────────────────────────

// function useUsers() {
//   return useQuery({
//     queryKey: ['users'],
//     queryFn: async () => {
//       const res = await fetch('/api/users');
//       if (!res.ok) throw new Error('Failed to fetch users');
//       return res.json() as Promise<StaffUser[]>;
//     },
//   });
// }

// function useCreateUser() {
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationFn: async (data: UserFormData) => {
//       const res = await fetch('/api/users', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(data),
//       });
//       if (!res.ok) {
//         const err = await res.json();
//         throw new Error(err.error || 'Failed to create user');
//       }
//       return res.json();
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['users'] });
//       toast.success('User created successfully');
//     },
//     onError: (err: Error) => toast.error(err.message),
//   });
// }

// function useUpdateUser() {
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationFn: async ({ id, ...data }: Partial<UserFormData> & { id: string }) => {
//       const res = await fetch(`/api/users/${id}`, {
//         method: 'PATCH',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(data),
//       });
//       if (!res.ok) {
//         const err = await res.json();
//         throw new Error(err.error || 'Failed to update user');
//       }
//       return res.json();
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['users'] });
//       toast.success('User updated');
//     },
//     onError: (err: Error) => toast.error(err.message),
//   });
// }

// function useDeleteUser() {
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationFn: async (id: string) => {
//       const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
//       if (!res.ok) {
//         const err = await res.json();
//         throw new Error(err.error || 'Failed to delete user');
//       }
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['users'] });
//       toast.success('User removed');
//     },
//     onError: (err: Error) => toast.error(err.message),
//   });
// }

// ── Role helpers ───────────────────────────────────────────────────

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; icon: React.ReactNode }> = {
  OWNER: { label: 'Owner', color: 'bg-purple-100 text-purple-800', icon: <ShieldCheck className="w-3 h-3" /> },
  MANAGER: { label: 'Manager', color: 'bg-blue-100 text-blue-800', icon: <ShieldAlert className="w-3 h-3" /> },
  CASHIER: { label: 'Cashier', color: 'bg-gray-100 text-gray-700', icon: <User className="w-3 h-3" /> },
};

// ── User Form Modal ────────────────────────────────────────────────

const EMPTY_FORM: UserFormData = { name: '', email: '', role: 'CASHIER', password: '', isActive: true };

function UserFormModal({
  user,
  onClose,
}: {
  user: StaffUser | null;   // null = creating new
  onClose: () => void;
}) {
  const isEdit = !!user;
  const [form, setForm] = useState<UserFormData>(
    user ? { name: user.name, email: user.email, role: user.role, password: '', isActive: user.isActive }
      : EMPTY_FORM
  );
  const [showPassword, setShowPassword] = useState(false);

  const { mutate: create, isPending: creating } = useCreateUser();
  const { mutate: update, isPending: updating } = useUpdateUser();
  const isPending = creating || updating;

  function set<K extends keyof UserFormData>(key: K, value: UserFormData[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEdit) {
      // Don't send empty password on edit
      const payload = form.password ? { id: user.id, ...form } : { id: user.id, name: form.name, email: form.email, role: form.role, isActive: form.isActive };
      update({ id: user.id, data: payload }, { onSuccess: onClose });
    } else {
      create(form, { onSuccess: onClose });
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Modal header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit User' : 'Add New User'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="jane@baraka.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
            <select
              value={form.role}
              onChange={e => set('role', e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="CASHIER">Cashier</option>
              <option value="MANAGER">Manager</option>
              <option value="OWNER">Owner</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {isEdit ? 'New Password (leave blank to keep current)' : 'Password'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required={!isEdit}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder={isEdit ? '••••••••' : 'Min. 8 characters'}
                minLength={isEdit && !form.password ? undefined : 8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="isActive"
              type="checkbox"
              checked={form.isActive}
              onChange={e => set('isActive', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">Active account</label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white
                         rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export default function UsersPage() {
  const { data: users = [], isLoading } = useUsers() as { data?: StaffUser[]; isLoading: boolean };
  const { mutate: deleteUser } = useDeleteUser();

  const [search, setSearch] = useState('');
  const [modalUser, setModalUser] = useState<StaffUser | null | undefined>(undefined);
  // undefined = closed, null = creating new, StaffUser = editing

  const filtered = users.filter((u: StaffUser) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  function confirmDelete(user: StaffUser) {
    if (confirm(`Remove ${user.name}? This cannot be undone.`)) {
      deleteUser(user.id);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-gray-500 text-sm mt-0.5">Manage staff access and roles</p>
          </div>
        </div>
        <button
          onClick={() => setModalUser(null)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {(['OWNER', 'MANAGER', 'CASHIER'] as UserRole[]).map(role => {
          const count = users.filter((u: { role: string; }) => u.role === role).length;
          const cfg = ROLE_CONFIG[role];
          return (
            <div key={role} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
              <span className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${cfg.color}`}>
                {cfg.icon}{cfg.label}s
              </span>
              <span className="text-2xl font-bold text-gray-900">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Merchant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p>No users found</p>
                  </td>
                </tr>
              ) : (
                filtered.map(user => {
                  const cfg = ROLE_CONFIG[user.role];
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                       <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${cfg.color}`}>
                          {user.merchant?.name || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${cfg.color}`}>
                          {cfg.icon}{cfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setModalUser(user)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit user"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmDelete(user)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalUser !== undefined && (
        <UserFormModal
          user={modalUser}
          onClose={() => setModalUser(undefined)}
        />
      )}
    </div>
  );
}