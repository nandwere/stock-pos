// prisma/bootstrap-roles.ts      run: npx tsx prisma/bootstrap-roles.ts
import { DEFAULT_ROLES } from '@/lib/permissions';
import { prisma } from "@/lib/prisma";

async function main() {
  const perms = await prisma.permission.findMany();
  if (!perms.length) throw new Error('Run seed-permissions.ts first');

  // Old enum column, if the database still has it (Prisma may have dropped it)
  let legacy = new Map<string, string>();
  try {
    const rows = await prisma.$queryRaw<{ id: string; role: string }[]>`
      SELECT id, role::text AS role FROM "User"`;
    legacy = new Map(rows.map(r => [r.id, r.role]));
    console.log('legacy role column found for', legacy.size, 'users');
  } catch {
    console.log('no legacy role column; using fallback assignment');
  }

  const merchants = await prisma.merchant.findMany({ select: { id: true, name: true } });
  for (const m of merchants) {
    const ids: Record<string, string> = {};
    for (const d of DEFAULT_ROLES) {
      const role = await prisma.role.upsert({
        where: { merchantId_key: { merchantId: m.id, key: d.key } },
        update: {},
        create: { ...d, merchantId: m.id, isSystem: true },
      });
      ids[d.key] = role.id;

      if (!d.isAdmin) {
        await prisma.roleGrant.createMany({
          data: perms
            .filter(p => !p.adminOnly && p.defaultRoleKeys.includes(d.key))
            .map(p => ({ roleId: role.id, permission: p.key })),
          skipDuplicates: true,
        });
      }
    }

    const users = await prisma.user.findMany({
      where: { merchantId: m.id, roleId: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, isSuperAdmin: true },
    });

    for (const [i, u] of users.entries()) {
      const old = legacy.get(u.id);
      let key: string;
      if (old === 'OWNER' || old === 'ADMIN') key = 'admin';
      else if (old === 'MANAGER') key = 'manager';
      else if (old === 'CASHIER') key = 'cashier';
      else key = u.isSuperAdmin || i === 0 ? 'admin' : 'cashier'; // fallback: oldest user, else least privilege

      await prisma.user.update({
        where: { id: u.id },
        data: { roleId: ids[key], ...(old === 'ADMIN' ? { isSuperAdmin: true } : {}) },
      });
      console.log(`${m.name}: ${u.email} -> ${key}${old ? '' : ' (guessed)'}`);
    }
  }

  console.log('users without a role:', await prisma.user.count({ where: { roleId: null } })); // must be 0
}
main().finally(() => prisma.$disconnect());