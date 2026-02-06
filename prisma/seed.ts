import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  // Create owner user
  const hashedPassword = await bcrypt.hash('art123', 10);
  
  const owner = await prisma.user.upsert({
    where: { email: 'nandwere@baraka.com' },
    update: {},
    create: {
      email: 'nandwere@baraka.com',
      name: 'Nandwere Owner',
      password: hashedPassword,
      role: 'OWNER'
    }
  });

  // Create categories
  const cerials = await prisma.category.create({
    data: {
      name: 'Cerials',
      description: 'Cerials'
    }
  });

  const floor = await prisma.category.create({
    data: {
      name: 'Floor',
      description: 'Floor (UNGA)'
    }
  });

  const cookingOil = await prisma.category.create({
    data: {
      name: 'Cooking Oil',
      description: 'Cooking Oil'
    }
  });

  const rice = await prisma.category.create({
    data: {
      name: 'Rice',
      description: 'Rice'
    }
  });

  // Create sample products
  await prisma.product.createMany({
    data: [
      {
        name: 'Kamande',
        sku: 'KDE-111',
        barcode: '5449000000996',
        categoryId: cerials.id,
        costPrice: 170,
        sellingPrice: 200,
        currentStock: 60,
        reorderLevel: 2,
        unit: 'Kg'
      },
      {
        name: 'Pishori',
        sku: 'PSI-111',
        barcode: '5449000000997',
        categoryId: rice.id,
        costPrice: 155,
        sellingPrice: 170,
        currentStock: 60,
        reorderLevel: 2,
        unit: 'Kg'
      },
      {
        name: 'Maize',
        sku: 'MIZ-111',
        barcode: '5449000000999',
        categoryId: cerials.id,
        costPrice: 48,
        sellingPrice: 65,
        currentStock: 90,
        reorderLevel: 10,
        unit: 'Kg'
      },
      {
        name: 'Njahe',
        sku: 'NJE-111',
        barcode: '5449000000946',
        categoryId: cerials.id,
        costPrice: 76,
        sellingPrice: 110,
        currentStock: 16,
        reorderLevel: 2,
        unit: 'Kg'
      },
      {
        name: 'Muthokoi',
        sku: 'MTK-111',
        barcode: '5449000000896',
        categoryId: cerials.id,
        costPrice: 48,
        sellingPrice: 65,
        currentStock: 16,
        reorderLevel: 1,
        unit: 'Kg'
      },
      {
        name: 'Sindano',
        sku: 'SDN-111',
        barcode: '5449000000998',
        categoryId: rice.id,
        costPrice: 134,
        sellingPrice: 160,
        currentStock: 24,
        reorderLevel: 2,
        unit: 'Kg'
      },
      {
        name: 'Basmati',
        sku: 'BST-111',
        barcode: '5449000000976',
        categoryId: rice.id,
        costPrice: 126,
        sellingPrice: 150,
        currentStock: 22,
        reorderLevel: 2,
        unit: 'Kg'
      },
      {
        name: 'Biryani',
        sku: 'BJRN-111',
        barcode: '5449000000696',
        categoryId: rice.id,
        costPrice: 94,
        sellingPrice: 120,
        currentStock: 10,
        reorderLevel: 2,
        unit: 'Kg'
      },
    ]
  });

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