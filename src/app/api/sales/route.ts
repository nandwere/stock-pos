import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSaleNumber } from '@/lib/stock-calculations';
import { getCurrentUser, getSession } from '@/lib/auth';
import { PaymentMethod } from '@prisma/client';

class InsufficientStockError extends Error {
  constructor(public productName: string, public available: number, public requested: number) {
    super(`Insufficient stock for ${productName}. Available: ${available}, Requested: ${requested}`);
    this.name = 'InsufficientStockError';
  }
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

// Loose E.164-ish check — same rule the frontend uses, enforced again here
// because client-side validation is a UX nicety, not a guarantee.
const isValidPhone = (phone: string) => /^\+?\d{7,15}$/.test(phone.trim());

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { merchantId } = session;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { items, paymentMethod, customerName, customerPhone, dueDate, amountPaid, notes } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }
    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      return NextResponse.json({ error: `Invalid payment method: ${paymentMethod}` }, { status: 400 });
    }
    for (const item of items) {
      if (!item.productId || typeof item.quantity !== 'number' || item.quantity <= 0) {
        return NextResponse.json({ error: 'Each item needs a productId and a positive quantity' }, { status: 400 });
      }
      if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
        return NextResponse.json({ error: 'Each item needs a valid unitPrice' }, { status: 400 });
      }
      if (item.discount != null && (typeof item.discount !== 'number' || item.discount < 0)) {
        return NextResponse.json({ error: 'discount must be a non-negative number' }, { status: 400 });
      }
    }

    // ── Credit-specific validation ──────────────────────────────────────
    // Mirrors the PaymentModal's requiredness rules, re-checked server-side.
    let parsedDueDate: Date | undefined;
    if (paymentMethod === PaymentMethod.CREDIT) {
      if (!customerName || typeof customerName !== 'string' || !customerName.trim()) {
        return NextResponse.json({ error: 'customerName is required for credit sales' }, { status: 400 });
      }
      if (!customerPhone || !isValidPhone(customerPhone)) {
        return NextResponse.json({ error: 'A valid customerPhone is required for credit sales' }, { status: 400 });
      }
      if (!dueDate) {
        return NextResponse.json({ error: 'dueDate is required for credit sales' }, { status: 400 });
      }
      parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        return NextResponse.json({ error: 'dueDate is not a valid date' }, { status: 400 });
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsedDueDate < today) {
        return NextResponse.json({ error: 'dueDate cannot be in the past' }, { status: 400 });
      }
      if (amountPaid != null && (typeof amountPaid !== 'number' || amountPaid < 0)) {
        return NextResponse.json({ error: 'amountPaid must be a non-negative number' }, { status: 400 });
      }
    }

    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i: any) => i.productId) }, merchantId },
      select: { id: true, name: true, costPrice: true },
    });
    const productById = new Map(products.map(p => [p.id, p]));

    for (const item of items) {
      if (!productById.has(item.productId)) {
        return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 });
      }
    }

    const lineItems = items.map((item: any) => {
      const product = productById.get(item.productId)!;
      const gross = round3(item.quantity * item.unitPrice);
      const discount = round3(item.discount ?? 0);
      const net = round3(gross - discount);

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costPrice: Number(product.costPrice),
        discount,
        subtotal: net,
        _gross: gross,
      };
    });

    const saleSubtotal = round3(lineItems.reduce((sum, li) => sum + li._gross, 0));
    const saleDiscount = round3(lineItems.reduce((sum, li) => sum + li.discount, 0));
    const saleTotal = round3(saleSubtotal - saleDiscount);

    // Cash/mobile money: must cover the total (enforced by the modal already,
    // re-derived here rather than trusted). Credit: whatever deposit was
    // paid up front, defaulting to 0.
    const resolvedAmountPaid =
      paymentMethod === PaymentMethod.CREDIT
        ? round3(amountPaid ?? 0)
        : saleTotal;

    if (paymentMethod !== PaymentMethod.CREDIT && resolvedAmountPaid < saleTotal) {
      return NextResponse.json({ error: 'amountPaid must cover the total for non-credit sales' }, { status: 400 });
    }
    if (paymentMethod === PaymentMethod.CREDIT && resolvedAmountPaid > saleTotal) {
      return NextResponse.json({ error: 'amountPaid cannot exceed the total' }, { status: 400 });
    }

    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          saleNumber: generateSaleNumber(),
          merchantId,
          userId: user.id,
          customerName,
          customerPhone: paymentMethod === PaymentMethod.CREDIT ? customerPhone.trim() : undefined,
          dueDate: parsedDueDate,
          notes,
          paymentMethod,
          subtotal: saleSubtotal,
          discount: saleDiscount,
          total: saleTotal,
          amountPaid: resolvedAmountPaid,
          items: {
            create: lineItems.map(({ _gross, ...li }) => li),
          },
        },
        include: { items: true },
      });

      for (const item of items) {
        const product = productById.get(item.productId)!;
        const result = await tx.product.updateMany({
          where: { id: item.productId, merchantId, currentStock: { gte: item.quantity } },
          data: { currentStock: { decrement: item.quantity } },
        });

        if (result.count === 0) {
          const current = await tx.product.findUnique({
            where: { id: item.productId },
            select: { currentStock: true },
          });
          throw new InsufficientStockError(product.name, Number(current?.currentStock ?? 0), item.quantity);
        }
      }

      return newSale;
    }, {
      maxWait: 10000,
      timeout: 30000,
    });

    return NextResponse.json(sale, { status: 201 });

  } catch (error: any) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Sale creation error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
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
    const skip = page * pageSize;
    const paymentMethod = url.searchParams.get('paymentMethod');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const productId = url.searchParams.get('productId');

    console.log('Fetching sales with filters:', { q, paymentMethod, startDate, endDate, take, skip });

    const where: any = { merchantId };
    if (q) {
      where.OR = [
        { saleNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (productId) {
      where.items = { some: { productId } };
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        where.createdAt.gte = start;
        console.log('Start date filter (UTC):', start.toISOString());
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        where.createdAt.lte = end;
        console.log('End date filter (UTC):', end.toISOString());
      }
    }

    // Declared separately as `any` BEFORE Promise.all — this is what avoids the
    // strict SaleWhereInput inference that was causing the type error when it
    // was written inline inside the array.
    const productSaleWhere: any = {
      merchantId,
      ...(startDate || endDate ? { createdAt: where.createdAt } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
      ...(q ? { OR: where.OR } : {}),
    };

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
      productId
        ? prisma.saleItem.aggregate({
          where: {
            productId,
            sale: productSaleWhere,
          },
          _sum: { quantity: true, subtotal: true },
        })
        : Promise.resolve(null),
    ]);

    console.log(`Fetched ${sales.length} sales, total matching: ${total}`);

    return NextResponse.json({
      data: sales,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
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
