// src/components/admin/UsersList.tsx
'use client';

import React, { useEffect, useState } from 'react';

type User = { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string; };
const ROLES = ['OWNER','MANAGER','CASHIER'];

export default function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', role: 'CASHIER', password: '' });

  async function fetchUsers() {
    setLoading(true);
    try {
      const url = new URL('/api/users', location.origin);
      url.searchParams.set('page', String(page));
      url.searchParams.set('pageSize', String(pageSize));
      if (q) url.searchParams.set('q', q);
      const res = await fetch(url.toString());
      const json = await res.json();
      setUsers(json.data || []);
      setTotal(json.meta?.total ?? 0);
    } catch (e) {
      console.error(e);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, [q, page]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || 'Failed');
      }
      setShowCreate(false);
      setForm({ email: '', name: '', role: 'CASHIER', password: '' });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) throw new Error('Failed');
      fetchUsers();
    } catch {
      alert('Failed to update');
    }
  }

  async function changeRole(id: string, role: string) {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error('Failed');
      fetchUsers();
    } catch {
      alert('Failed to update role');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete user? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || 'Failed');
      }
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users..." className="input" />
        <button onClick={() => setShowCreate(true)} className="btn btn-primary">Create User</button>
      </div>

      <div className="bg-white shadow rounded-md overflow-hidden">
        <table className="min-w-full divide-y">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y">
            {users.map(u => (
              <tr key={u.id}>
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2 text-center">
                  <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} className="select">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2 text-center">
                  <button onClick={() => toggleActive(u.id, u.isActive)} className={`px-2 py-1 rounded ${u.isActive ? 'bg-green-100' : 'bg-red-100'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-2">{new Date(u.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2 text-right">
                  <button className="btn btn-ghost mr-2" onClick={() => handleDelete(u.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between">
        <div>{`Showing ${Math.min((page-1)*pageSize+1, total)} - ${Math.min(page*pageSize, total)} of ${total}`}</div>
        <div className="space-x-2">
          <button className="btn" onClick={() => setPage(p => Math.max(1, p-1))}>Prev</button>
          <button className="btn" onClick={() => setPage(p => p+1)}>Next</button>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <form onSubmit={createUser} className="bg-white p-6 rounded shadow z-10 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create User</h3>
            <div className="mb-2">
              <label className="block text-sm">Name</label>
              <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="mb-2">
              <label className="block text-sm">Email</label>
              <input type="email" className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div className="mb-2">
              <label className="block text-sm">Role</label>
              <select className="select" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm">Password</label>
              <input type="password" className="input" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}