import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSaleNumber } from '@/lib/stock-calculations';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { items, paymentMethod, customerName } = body;
    
    console.log('Creating sale with items:', JSON.stringify(items, null, 2));

    // Validate stock before transaction
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { currentStock: true, name: true }
      });
      
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 404 }
        );
      }
      
      if (product.currentStock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}. Available: ${product.currentStock}, Requested: ${item.quantity}` },
          { status: 400 }
        );
      }
      
      console.log(`Product ${product.name}: Stock ${product.currentStock}, Selling ${item.quantity}`);
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.unitPrice), 0
    );
    
    const total = subtotal;

    // Create sale in transaction
    const sale = await prisma.$transaction(async (tx) => {
      // Create sale
      const newSale = await tx.sale.create({
        data: {
          saleNumber: generateSaleNumber(),
          userId: user.id,
          customerName,
          paymentMethod,
          subtotal,
          total,
          amountPaid: total,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.quantity * item.unitPrice
            }))
          }
        },
        include: { items: true }
      });

      console.log('Sale created:', newSale.id);
      
      // Update stock levels with individual error handling
      for (const item of items) {
        try {
          console.log(`Updating stock for product ${item.productId}, decrement by ${item.quantity}`);
          
          const updated = await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: { decrement: item.quantity }
            },
            select: { id: true, name: true, currentStock: true }
          });
          
          console.log(`Stock updated for ${updated.name}: New stock = ${updated.currentStock}`);
        } catch (updateError) {
          console.error(`Failed to update product ${item.productId}:`, updateError);
          // This will rollback the entire transaction
          throw updateError;
        }
      }

      return newSale;
    }, {
      // Increase timeout for large transactions
      maxWait: 10000,
      timeout: 30000
    });

    // Verify final stock levels
    for (const item of items) {
      const finalProduct = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { name: true, currentStock: true }
      });
      console.log(`Final stock for ${finalProduct?.name}: ${finalProduct?.currentStock}`);
    }

    return NextResponse.json(sale, { status: 201 });
  } catch (error: any) {
    console.error('Sale creation error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    return NextResponse.json(
      { error: 'Failed to create sale', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim();
    const take = Number(url.searchParams.get('take') ?? 50);
    const skip = Number(url.searchParams.get('skip') ?? 0);
    const paymentMethod = url.searchParams.get('paymentMethod');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const where: any = {};
    if (q) {
      where.OR = [
        { saleNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (startDate || endDate) where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: { items: true, user: true },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.sale.count({ where }),
    ]);

    return NextResponse.json({ data: sales, meta: { total } });
  } catch (error) {
    console.error('Get sales error:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}
