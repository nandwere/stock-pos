// permissions.server.ts
import { PrismaClient, Prisma } from '@prisma/client';

// src/lib/permissions.server.ts   (imports nothing from auth, to avoid a cycle)
import { prisma } from '@/lib/prisma';
import { DEFAULT_ROLES, PLATFORM_PERMISSIONS } from '@/lib/permissions';
import { CurrentUser } from './auth';

let cache: { at: number; data: Awaited<ReturnType<typeof load>> } | null = null;
const load = () =>
  prisma.permissionGroup.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { permissions: { orderBy: { sortOrder: 'asc' } } },
  });

export const invalidateCatalog = () => { cache = null; };

export async function getCatalog() {
  if (cache && Date.now() - cache.at < 30_000) return cache.data;
  const data = await load();
  cache = { at: Date.now(), data };
  return data;
}

export async function getCatalogForClient() {
  return (await getCatalog()).map(g => ({
    key: g.key, label: g.label, isSystem: g.isSystem,
    permissions: g.permissions.map(p => ({
      key: p.key, label: p.label, isSystem: p.isSystem,
      adminOnly: p.adminOnly, defaultRoleKeys: p.defaultRoleKeys,
    })),
  }));
}

export async function loadActor(session: CurrentUser) {
  const [role, catalog] = await Promise.all([
    prisma.role.findUnique({
      where: { id: session.roleId },
      select: { id: true, name: true, level: true, isAdmin: true, grants: { select: { permission: true } } },
    }),
    getCatalog(),
  ]);
  if (!role) return null;

  const isSuperAdmin = !!session.isSuperAdmin;
  const all = catalog.flatMap(g => g.permissions);
  const grantable = new Set(all.filter(p => !p.adminOnly).map(p => p.key));

  const permissions = new Set<string>(
    isSuperAdmin || role.isAdmin
      ? all.map(p => p.key)
      : role.grants.map(g => g.permission).filter(k => grantable.has(k))
  );
  if (isSuperAdmin) PLATFORM_PERMISSIONS.forEach(p => permissions.add(p));

  return {
    userId: session.id,
    merchantId: session.merchantId,
    isSuperAdmin,
    role: { id: role.id, name: role.name, level: role.level, isAdmin: role.isAdmin },
    permissions,
    can: (p: string) => isSuperAdmin || (!PLATFORM_PERMISSIONS.includes(p) && permissions.has(p)),
  };
}
export type Actor = NonNullable<Awaited<ReturnType<typeof loadActor>>>;

// You may only manage roles (and users holding them) ranked below your own
export const outranks = (actor: Actor, role: { level: number; isAdmin: boolean }) =>
  actor.isSuperAdmin || actor.role.isAdmin || role.level < actor.role.level;

// Call when creating a merchant. Returns role ids keyed by role key.
export async function createDefaultRoles(tx: Prisma.TransactionClient | PrismaClient, merchantId: string) {
  const perms = (await getCatalog()).flatMap(g => g.permissions);
  const ids: Record<string, string> = {};
  for (const d of DEFAULT_ROLES) {
    const role = await tx.role.create({
      data: {
        merchantId, key: d.key, name: d.name, level: d.level, isAdmin: d.isAdmin, isSystem: true,
        grants: d.isAdmin ? undefined : {
          create: perms.filter(p => !p.adminOnly && p.defaultRoleKeys.includes(d.key)).map(p => ({ permission: p.key })),
        },
      },
    });
    ids[d.key] = role.id;
  }
  return ids;
}

export async function isLastAdmin(u: { id: string; isSuperAdmin: boolean }) {
  if (!u.isSuperAdmin) return false;
  const others = await prisma.user.count({ where: { isSuperAdmin: true, isActive: true, id: { not: u.id } } });
  return others === 0;
}