// prisma/sync-permissions.ts      run: npx tsx prisma/sync-permissions.ts
import { prisma } from "@/lib/prisma";

type P = [key: string, label: string, defaultRoleKeys: string[], adminOnly?: boolean];
const M = ['manager'];
const MC = ['manager', 'cashier'];

// group key -> [group label, permissions]. Edit this list whenever you add features.
const WANTED: Record<string, [string, P[]]> = {
  sales: ['Sales', [
    ['sales.credit', 'Manage credit sales', MC],
    ['orders.view', 'View orders', MC],
    ['orders.manage', 'Process orders', M],
    ['sales.drafts.all', 'View all staff drafts', M],
  ]],
  products: ['Products & Stock', [
    ['categories.manage', 'Manage categories', M],
    ['stock.count', 'Do stock counts', M],
    ['suppliers.manage', 'Manage suppliers', M],
  ]],
  expenses: ['Expenses', [
    ['expenses.categories', 'Manage expense categories', M],
  ]],
  admin: ['Administration', [
    ['billing.manage', 'Manage plan payments', [], true],
  ]],
  reports: ['Reports', [
  ['dashboard.financials', 'See profit & inventory value on dashboard', M],
]],
};

async function main() {
  for (const [groupKey, [groupLabel, perms]] of Object.entries(WANTED)) {
    let group = await prisma.permissionGroup.findUnique({ where: { key: groupKey } });
    if (!group) {
      const count = await prisma.permissionGroup.count();
      group = await prisma.permissionGroup.create({
        data: { key: groupKey, label: groupLabel, sortOrder: count, isSystem: true },
      });
    }

    for (const [key, label, defaultRoleKeys, adminOnly] of perms) {
      if (await prisma.permission.findUnique({ where: { key } })) continue; // never overwrite edits

      const last = await prisma.permission.count({ where: { groupId: group.id } });
      await prisma.permission.create({
        data: { key, label, groupId: group.id, sortOrder: last, defaultRoleKeys, adminOnly: !!adminOnly, isSystem: true },
      });

      if (defaultRoleKeys.length && !adminOnly) {
        const roles = await prisma.role.findMany({
          where: { isSystem: true, key: { in: defaultRoleKeys } },
          select: { id: true },
        });
        await prisma.roleGrant.createMany({
          data: roles.map(r => ({ roleId: r.id, permission: key })),
          skipDuplicates: true,
        });
      }
      console.log('added', key, '->', defaultRoleKeys.join(', ') || 'no default roles');
    }
  }
}
main().finally(() => prisma.$disconnect());