import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  // 1. Create the Baraka merchant (tenant root)
  const baraka = await prisma.merchant.upsert({
    where: { slug: 'baraka' },
    update: {},
    create: {
      id: 'cm7x9k2p40000ld0hq3j5n8vk',
      name: 'Baraka Shop',
      slug: 'baraka',
      email: 'admin@baraka.com',
      currency: 'KES',
      timezone: 'Africa/Nairobi',
      plan: 'STARTER',
      isActive: true,
    },
  });
  console.log(`✔ Merchant: ${baraka.name} (${baraka.id})`);

  // 2. Owner user — scoped to Baraka
  const hashedPassword = await bcrypt.hash('Koyn@22!', 10);
  const owner = await prisma.user.upsert({
    where: {
      merchantId_email: {
        merchantId: baraka.id,
        email: 'nandwere@baraka.com',
      },
    },
    update: {},
    create: {
      merchantId: baraka.id,
      email: 'nandwere@baraka.com',
      name: 'Nandwere Owner',
      password: hashedPassword,
      role: 'OWNER',
    },
  });
  console.log(`✔ Owner: ${owner.name} (${owner.id})`);

  // 3. Categories — all scoped to Baraka
  //    upsert on the compound unique [merchantId, name] so the seed
  //    is safe to re-run without duplicate-key errors.
  const [cereals, flour, cookingOil, rice] = await Promise.all([
    prisma.category.upsert({
      where: { merchantId_name: { merchantId: baraka.id, name: 'Cereals' } },
      update: {},
      create: { merchantId: baraka.id, name: 'Cereals', description: 'Cereals' },
    }),
    prisma.category.upsert({
      where: { merchantId_name: { merchantId: baraka.id, name: 'Flour' } },
      update: {},
      create: { merchantId: baraka.id, name: 'Flour', description: 'Flour (Unga)' },
    }),
    prisma.category.upsert({
      where: { merchantId_name: { merchantId: baraka.id, name: 'Cooking Oil' } },
      update: {},
      create: { merchantId: baraka.id, name: 'Cooking Oil', description: 'Cooking Oil' },
    }),
    prisma.category.upsert({
      where: { merchantId_name: { merchantId: baraka.id, name: 'Rice' } },
      update: {},
      create: { merchantId: baraka.id, name: 'Rice', description: 'Rice' },
    }),
  ]);
  console.log('✔ Categories created');

  // 4. Products — scoped to Baraka via merchantId + compound SKU unique key
  const products = [
    {
      name: 'Kamande', sku: 'KDE-111', barcode: '5449000000996',
      categoryId: cereals.id, costPrice: 170, sellingPrice: 200,
      currentStock: 60, reorderLevel: 2, unit: 'Kg',
    },
    {
      name: 'Pishori', sku: 'PSI-111', barcode: '5449000000997',
      categoryId: rice.id, costPrice: 155, sellingPrice: 170,
      currentStock: 60, reorderLevel: 2, unit: 'Kg',
    },
    {
      name: 'Maize', sku: 'MIZ-111', barcode: '5449000000999',
      categoryId: cereals.id, costPrice: 48, sellingPrice: 65,
      currentStock: 90, reorderLevel: 10, unit: 'Kg',
    },
    {
      name: 'Njahe', sku: 'NJE-111', barcode: '5449000000946',
      categoryId: cereals.id, costPrice: 76, sellingPrice: 110,
      currentStock: 16, reorderLevel: 2, unit: 'Kg',
    },
    {
      name: 'Muthokoi', sku: 'MTK-111', barcode: '5449000000896',
      categoryId: cereals.id, costPrice: 48, sellingPrice: 65,
      currentStock: 16, reorderLevel: 1, unit: 'Kg',
    },
    {
      name: 'Sindano', sku: 'SDN-111', barcode: '5449000000998',
      categoryId: rice.id, costPrice: 134, sellingPrice: 160,
      currentStock: 24, reorderLevel: 2, unit: 'Kg',
    },
    {
      name: 'Basmati', sku: 'BST-111', barcode: '5449000000976',
      categoryId: rice.id, costPrice: 126, sellingPrice: 150,
      currentStock: 22, reorderLevel: 2, unit: 'Kg',
    },
    {
      name: 'Biryani', sku: 'BJRN-111', barcode: '5449000000696',
      categoryId: rice.id, costPrice: 94, sellingPrice: 120,
      currentStock: 10, reorderLevel: 2, unit: 'Kg',
    },
  ];

  // createMany doesn't support upsert, so we upsert individually
  // on the compound unique [merchantId, sku] to stay idempotent.
  for (const p of products) {
    await prisma.product.upsert({
      where: { merchantId_sku: { merchantId: baraka.id, sku: p.sku } },
      update: {},
      create: { merchantId: baraka.id, ...p },
    });
  }
  console.log(`✔ ${products.length} products seeded`);

  // 5. Default settings for Baraka
  const defaults = [
    { key: 'tax_rate', value: '16', description: 'VAT rate (%)' },
    { key: 'receipt_footer', value: 'Thank you for shopping at Baraka!', description: 'Receipt footer message' },
    { key: 'low_stock_alert', value: 'true', description: 'Enable low stock notifications' },
  ];

  for (const s of defaults) {
    await prisma.settings.upsert({
      where: { merchantId_key: { merchantId: baraka.id, key: s.key } },
      update: {},
      create: { merchantId: baraka.id, ...s },
    });
  }
  console.log('✔ Default settings seeded');

  // ── Expense Categories ───────────────────────────────────────────────────────
const expenseCategoryDefs = [
  { id: 'ecat_salaries',   name: 'Salaries & Wages',      color: '#6366f1', isSystem: true },
  { id: 'ecat_rent',       name: 'Rent & Utilities',      color: '#f59e0b', isSystem: true },
  { id: 'ecat_supplies',   name: 'Office Supplies',        color: '#3b82f6', isSystem: true },
  { id: 'ecat_travel',     name: 'Travel & Transport',     color: '#ec4899', isSystem: true },
  { id: 'ecat_stock',      name: 'Stock Purchases',        color: '#8b5cf6', isSystem: true },
  { id: 'ecat_marketing',  name: 'Marketing',              color: '#f97316', isSystem: true },
  { id: 'ecat_repairs',    name: 'Repairs & Maintenance',  color: '#84cc16', isSystem: true },
  { id: 'ecat_bank',       name: 'Bank Charges',           color: '#94a3b8', isSystem: true },
  { id: 'ecat_misc',       name: 'Miscellaneous',          color: '#6b7280', isSystem: true },
];

for (const cat of expenseCategoryDefs) {
  await prisma.expenseCategory.upsert({
    where:  { merchantId_name: { merchantId: baraka.id, name: cat.name } },
    update: {},
    create: { merchantId: baraka.id, ...cat },
  });
}
console.log(`✔ Expense categories: ${expenseCategoryDefs.length}`);

  console.log('\n🌱 Baraka seed complete.');

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });