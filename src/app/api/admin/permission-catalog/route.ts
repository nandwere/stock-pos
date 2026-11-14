
// src/app/api/admin/permission-catalog/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/auth';
import { getCatalogForClient, invalidateCatalog } from '@/lib/permissions.server';
import { DEFAULT_ROLE_KEYS, PLATFORM_PERMISSIONS } from '@/lib/permissions';

const GROUP_KEY = /^[a-z][a-z0-9_-]*$/;
const PERM_KEY = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/;
const bad = (msg: string) => NextResponse.json({ error: msg }, { status: 400 });

export async function GET() {
  if (!(await hasPermission('catalog.manage'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ groups: await getCatalogForClient() });
}

export async function PUT(request: NextRequest) {
  if (!(await hasPermission('catalog.manage'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { groups } = await request.json();
  if (!Array.isArray(groups)) return bad('groups must be an array');

  const gKeys = new Set<string>();
  const pKeys = new Set<string>();
  for (const g of groups) {
    if (!g.label?.trim() || !GROUP_KEY.test(g.key ?? '')) return bad(`Invalid group "${g.label}"`);
    if (gKeys.has(g.key)) return bad(`Duplicate group key "${g.key}"`);
    gKeys.add(g.key);
    for (const p of g.permissions ?? []) {
      if (!p.label?.trim() || !PERM_KEY.test(p.key ?? '')) return bad(`Invalid permission "${p.key}"`);
      if (PLATFORM_PERMISSIONS.includes(p.key)) return bad(`"${p.key}" is reserved`);
      if (pKeys.has(p.key)) return bad(`Duplicate permission key "${p.key}"`);
      pKeys.add(p.key);
    }
  }

  const [existingPerms, existingGroups] = await Promise.all([
    prisma.permission.findMany({ select: { key: true, isSystem: true } }),
    prisma.permissionGroup.findMany({ select: { key: true, isSystem: true } }),
  ]);
  const removedPerms = existingPerms.filter(p => !pKeys.has(p.key));
  if (removedPerms.some(p => p.isSystem)) return bad('Built-in permissions cannot be deleted');
  if (existingGroups.some(g => g.isSystem && !gKeys.has(g.key))) return bad('Built-in groups cannot be deleted');
  const existingKeys = new Set(existingPerms.map(p => p.key));

  await prisma.$transaction(async tx => {
    for (const [gi, g] of groups.entries()) {
      const row = await tx.permissionGroup.upsert({
        where: { key: g.key },
        update: { label: g.label.trim(), sortOrder: gi },
        create: { key: g.key, label: g.label.trim(), sortOrder: gi },
      });
      for (const [pi, p] of (g.permissions ?? []).entries()) {
        const data = {
          label: p.label.trim(), groupId: row.id, sortOrder: pi,
          adminOnly: !!p.adminOnly,
          defaultRoleKeys: p.adminOnly ? [] : (p.defaultRoleKeys ?? []).filter((k: string) => DEFAULT_ROLE_KEYS.includes(k)),
        };
        await tx.permission.upsert({ where: { key: p.key }, update: data, create: { key: p.key, ...data } });

        if (!existingKeys.has(p.key) && data.defaultRoleKeys.length) {
          const roles = await tx.role.findMany({ where: { isSystem: true, key: { in: data.defaultRoleKeys } }, select: { id: true } });
          await tx.roleGrant.createMany({
            data: roles.map(r => ({ roleId: r.id, permission: p.key })),
            skipDuplicates: true,
          });
        }

      }
    }

    const removedKeys = removedPerms.map(p => p.key);
    if (removedKeys.length) {
      await tx.roleGrant.deleteMany({ where: { permission: { in: removedKeys } } });
      await tx.permission.deleteMany({ where: { key: { in: removedKeys } } });
    }
    await tx.permissionGroup.deleteMany({ where: { key: { notIn: [...gKeys] } } });
  });

  invalidateCatalog();
  return NextResponse.json({ success: true });
}