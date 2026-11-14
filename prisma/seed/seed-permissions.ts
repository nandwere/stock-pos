// prisma/seed-permissions.ts      run: npx tsx prisma/seed-permissions.ts
import { prisma } from "@/lib/prisma";

type P = [key: string, label: string, defaultRoleKeys: string[], adminOnly?: boolean];
const M = ['manager'];
const MC = ['manager', 'cashier'];

const SEED: { key: string; label: string; perms: P[] }[] = [
  { key: 'sales', label: 'Sales', perms: [
    ['sales.create', 'Make sales', MC], ['sales.view', 'View sales history', MC],
    ['sales.refund', 'Refund / void sales', M]] },
  { key: 'products', label: 'Products & Stock', perms: [
    ['products.view', 'View products', MC], ['products.edit', 'Create & edit products', M],
    ['products.delete', 'Delete products', M], ['stock.adjust', 'Adjust stock', M],
    ['suppliers.manage', 'Manage suppliers', M]] },
  { key: 'expenses', label: 'Expenses', perms: [
    ['expenses.view', 'View expenses', M], ['expenses.create', 'Record expenses', M],
    ['expenses.approve', 'Approve expenses', M]] },
  { key: 'reports', label: 'Reports', perms: [['reports.view', 'View reports', M]] },
  { key: 'admin', label: 'Administration', perms: [
    ['users.view', 'View users', M], ['users.create', 'Add users', M],
    ['users.edit', 'Edit users', M], ['users.delete', 'Remove users', []],
    ['settings.edit', 'Change business settings', M],
    ['roles.manage', 'Manage roles & permissions', [], true]] },
];

async function main() {
  for (const [gi, g] of SEED.entries()) {
    const group = await prisma.permissionGroup.upsert({
      where: { key: g.key }, update: {},
      create: { key: g.key, label: g.label, sortOrder: gi, isSystem: true },
    });
    for (const [pi, [key, label, defaultRoleKeys, adminOnly]] of g.perms.entries()) {
      await prisma.permission.upsert({
        where: { key }, update: {},
        create: { key, label, groupId: group.id, sortOrder: pi, defaultRoleKeys, adminOnly: !!adminOnly, isSystem: true },
      });
    }
  }
  console.log('permissions:', await prisma.permission.count());
}
main().finally(() => prisma.$disconnect());