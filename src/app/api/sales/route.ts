import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSaleNumber } from '@/lib/stock-calculations';
import { getCurrentUser, getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { merchantId } = session;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { items, paymentMethod, customerName } = body;

    // console.log('Creating sale with items:', JSON.stringify(items, null, 2));

    // Validate stock before transaction
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId, merchantId },
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

      // console.log(`Product ${product.name}: Stock ${product.currentStock}, Selling ${item.quantity}`);
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) =>
      sum + (item.quantity * item.unitPrice), 0
    );

    const total = subtotal;

    // Create sale in transaction
    const sale = await prisma.$transaction(async (tx: any) => {
      // Create sale
      const newSale = await tx.sale.create({
        data: {
          saleNumber: generateSaleNumber(),
          merchantId,
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

      // console.log('Sale created:', newSale.id);

      // Update stock levels with individual error handling
      for (const item of items) {
        try {
          console.log(`Updating stock for product ${item.productId}, decrement by ${item.quantity}`);

          const updated = await tx.product.update({
            where: { id: item.productId, merchantId },
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
        where: { id: item.productId, merchantId },
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
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { merchantId } = session;

    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim();
    const page = Number(url.searchParams.get('page') ?? 0);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 20);
    const take = pageSize;
    const skip = page * pageSize
    const paymentMethod = url.searchParams.get('paymentMethod');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const productId = url.searchParams.get('productId');

    console.log('Fetching sales with filters:', {
      q,
      paymentMethod,
      startDate,
      endDate,
      take,
      skip
    });

    const where: any = { merchantId };
    if (q) {
      where.OR = [
        { saleNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (paymentMethod) where.paymentMethod = paymentMethod;

    if (productId) {
      where.items = {
        some: { productId },
      };
    }

    if (startDate || endDate) where.createdAt = {};
    // Date range filter - IMPORTANT FIX
    if (startDate || endDate) {
      where.createdAt = {};

      // Convert string dates to Date objects in UTC
      if (startDate) {
        // Parse date and set to start of day in UTC
        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        where.createdAt.gte = start;
        console.log('Start date filter (UTC):', start.toISOString());
      }

      if (endDate) {
        // Parse date and set to end of day in UTC
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        where.createdAt.lte = end;
        console.log('End date filter (UTC):', end.toISOString());
      }
    }

    const [sales, total, revenueAgg, itemsAgg, productItemAgg] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: { items: true, user: true },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.sale.count({ where }),
      prisma.sale.aggregate({
        where,
        _sum: { total: true },
      }),
      prisma.saleItem.aggregate({
        where: { sale: { ...where } },
        _sum: { quantity: true },
      }),
      // NEW — only meaningful/used when productId is set
      productId
        ? prisma.saleItem.aggregate({
          where: {
            productId,
            sale: {
              merchantId,
              ...(startDate || endDate ? { createdAt: where.createdAt } : {}),
              ...(paymentMethod ? { paymentMethod } : {}),
              ...(q ? { OR: where.OR } : {}),
            },
          },
          _sum: { quantity: true, subtotal: true },
        })
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      data: sales,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        // When filtering by product, revenue/items should reflect that product's
        // share only — not the full totals of sales that merely contain it.
        totalRevenue: productId
          ? (productItemAgg?._sum.subtotal ?? 0)
          : (revenueAgg._sum.total ?? 0),
        totalItemsSold: productId
          ? (productItemAgg?._sum.quantity ?? 0)
          : (itemsAgg._sum.quantity ?? 0),
      },
    });
  } catch (error) {
    console.error('Get sales error:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}
