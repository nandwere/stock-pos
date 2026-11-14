// src/lib/hooks/use-permissions.ts   (replaces the role-matrix hooks; catalog hooks stay)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type CatalogPermission = {
  key: string; label: string; isSystem: boolean; adminOnly: boolean; defaultRoleKeys: string[];
};
export type CatalogGroup = { key: string; label: string; isSystem: boolean; permissions: CatalogPermission[] };

export type RoleRow = {
  id: string; key: string; name: string; description: string | null; level: number;
  isAdmin: boolean; isSystem: boolean; userCount: number; editable: boolean; permissions: string[];
};
export type RolesData = { catalog: CatalogGroup[]; grantable: string[]; maxLevel: number; roles: RoleRow[] };
export type RoleDraft = { name: string; description: string; level: number; permissions: string[] };

async function json<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? fallback);
  return res.json();
}
const send = (method: string, body?: unknown) => ({
  method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
});

export function useRoles() {
  return useQuery<RolesData>({
    queryKey: ['roles'],
    queryFn: async () => json(await fetch('/api/settings/roles'), 'Failed to load roles'),
    retry: false,
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: RoleDraft) => json<{ id: string }>(await fetch('/api/settings/roles', send('POST', d)), 'Failed to create role'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...d }: RoleDraft & { id: string }) =>
      json(await fetch(`/api/settings/roles/${id}`, send('PATCH', d)), 'Failed to save role'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => json(await fetch(`/api/settings/roles/${id}`, send('DELETE')), 'Failed to delete role'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });
}

export type AssignableRole = { id: string; name: string; level: number; isAdmin: boolean };
export function useAssignableRoles(merchantId?: string) {
  return useQuery<AssignableRole[]>({
    queryKey: ['roles', 'assignable', merchantId ?? 'own'],
    queryFn: async () => {
      const qs = merchantId ? `?merchantId=${merchantId}` : '';
      return (await json<{ data: AssignableRole[] }>(await fetch(`/api/roles/assignable${qs}`), 'Failed to load roles')).data;
    },
  });
}

export function useCatalog() {
  return useQuery<CatalogGroup[]>({
    queryKey: ['permission-catalog'],
    queryFn: async () => (await json<{ groups: CatalogGroup[] }>(await fetch('/api/admin/permission-catalog'), 'Failed to load catalog')).groups,
    retry: false,
  });
}

export function useSaveCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groups: unknown) =>
      json(await fetch('/api/admin/permission-catalog', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groups }),
      }), 'Failed to save catalog'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permission-catalog'] });
      qc.invalidateQueries({ queryKey: ['role-permissions'] });
    },
  });
}