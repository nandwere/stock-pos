import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSaleNumber } from '@/lib/stock-calculations';
import { getCurrentUser, getSession } from '@/lib/auth';
import { PaymentMethod } from '@prisma/client';

// Thrown from inside the transaction when a product can't cover the
// requested quantity at the moment of the actual decrement (not at some
// earlier, now-stale check) — caught below and mapped to a 400, everything
// else falls through to the generic 500.
class InsufficientStockError extends Error {
  constructor(public productName: string, public available: number, public requested: number) {
    super(`Insufficient stock for ${productName}. Available: ${available}, Requested: ${requested}`);
    this.name = 'InsufficientStockError';
  }
}

// Guards against float drift (e.g. 19.999999999998) ever reaching a
// Decimal(10,3) column — round every computed monetary value before it's
// used in a Prisma write.
const round3 = (n: number) => Math.round(n * 1000) / 1000;

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
    const { items, paymentMethod, customerName, notes } = body;

    // ── Input validation ──────────────────────────────────────────────────
    // None of this existed before — a malformed request (empty items,
    // garbage payment method, negative quantity) previously fell all the
    // way through to a Prisma-level error and a confusing generic 500.
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

    // Cost snapshot — a plain read, doesn't need the same per-row locking
    // the stock decrement below does, so it's fine to do up front rather
    // than inside the transaction.
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

    // ── Build line items ────────────────────────────────────────────────
    // SaleItem.subtotal is NET of that line's own discount (what this line
    // actually contributed) — this is what makes profit reporting simple:
    // revenue for a line is just item.subtotal, no separate discount
    // allocation needed. Sale.subtotal/discount/total instead follow the
    // conventional gross → discount → net pattern at the whole-sale level.
    const lineItems = items.map((item: any) => {
      const product = productById.get(item.productId)!;
      const gross = round3(item.quantity * item.unitPrice);
      const discount = round3(item.discount ?? 0);
      const net = round3(gross - discount);

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costPrice: Number(product.costPrice), // snapshot — historical profit stays correct even after Product.costPrice later changes
        discount,
        subtotal: net,
        _gross: gross, // not persisted — only used below to build Sale-level totals
      };
    });

    const saleSubtotal = round3(lineItems.reduce((sum, li) => sum + li._gross, 0));
    const saleDiscount = round3(lineItems.reduce((sum, li) => sum + li.discount, 0));
    const saleTotal = round3(saleSubtotal - saleDiscount); // add + tax here once tax is computed elsewhere in this route

    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          saleNumber: generateSaleNumber(),
          merchantId,
          userId: user.id,
          customerName,
          notes,
          paymentMethod,
          subtotal: saleSubtotal,
          discount: saleDiscount,
          total: saleTotal,
          amountPaid: saleTotal, // if you want cash change-due support, accept amountPaid from the request body instead and compute `change` from it
          items: {
            create: lineItems.map(({ _gross, ...li }) => li), // strip the local-only _gross field before persisting
          },
        },
        include: { items: true },
      });

      // Atomic, race-safe stock decrement. The WHERE clause's
      // `currentStock: { gte: quantity }` and the decrement happen as ONE
      // conditional UPDATE — so two concurrent checkouts for the same
      // product can't both pass a "there's enough stock" check and then
      // both decrement past zero. Whichever transaction's UPDATE commits
      // first wins; the second sees `count === 0` and the whole sale rolls
      // back instead of overselling.
      //
      // This replaces the old pattern of checking stock in a separate
      // query BEFORE the transaction even started, then decrementing
      // unconditionally inside it — which had exactly that race.
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
