// app/api/inventory/adjustments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createAdjustmentSchema = z.object({
    productId: z.string().min(1, 'Product ID is required'),
    type: z.enum([
        'ADJUSTMENT_ADD',
        'ADJUSTMENT_REMOVE',
        'DAMAGE',
        'THEFT',
        'EXPIRY',
        'CORRECTION',]),
    quantity: z.number().positive('Quantity must be positive'),
    reason: z.string().min(1, 'Reason is required'),
    notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse and validate request body
        let body: any;
        try {
            body = await request.json();
        } catch (error) {
            return NextResponse.json(
                { error: 'Invalid JSON body' },
                { status: 400 }
            );
        }

        const validationResult = createAdjustmentSchema.safeParse(body);
        if (!validationResult.success) {
            const errors = validationResult.error.issues.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }));
            return NextResponse.json(
                { error: 'Validation failed', details: errors },
                { status: 400 }
            );
        }

        const { productId, type, quantity, reason, notes } = validationResult.data;
        const userId = user.id;

        // Start a transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Get current product
            const product = await tx.product.findUnique({
                where: { id: productId },
                select: { id: true, currentStock: true, name: true }
            });

            if (!product) {
                throw new Error('Product not found');
            }

            // 2. Validate removal quantity
            const isRemoval = [
                'ADJUSTMENT_REMOVE',
                'DAMAGE',
                'THEFT',
                'EXPIRY'
            ].includes(type);

            if (isRemoval && Number(quantity) > Number(product.currentStock)) {
                throw new Error(
                    `Cannot remove ${quantity} units. Current stock: ${product.currentStock}`
                );
            }

            // 3. Calculate new stock
            const stockChange = isRemoval ? -quantity : quantity;
            const newStock = Number(product.currentStock) + stockChange;

            // 4. Create stock adjustment record
            const adjustment = await tx.stockAdjustment.create({
                data: {
                    productId,
                    userId,
                    type,
                    quantity,
                    reason,
                    notes,
                },
                include: {
                    product: {
                        select: { id: true, name: true, sku: true }
                    },
                    user: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });

            // 5. Update product stock
            await tx.product.update({
                where: { id: productId },
                data: {
                    currentStock: newStock,
                    updatedAt: new Date(),
                }
            });

            return adjustment;
        }, {
            maxWait: 10000,
            timeout: 30000
        });

        return NextResponse.json({
            success: true,
            message: 'Stock adjustment created successfully',
            adjustment: result,
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating stock adjustment:', error);

        if (error instanceof Error) {
            if (error.message.includes('Cannot remove')) {
                return NextResponse.json(
                    { error: error.message },
                    { status: 400 }
                );
            }

            if (error.message.includes('Product not found')) {
                return NextResponse.json(
                    { error: 'Product not found' },
                    { status: 404 }
                );
            }
        }

        return NextResponse.json(
            { error: 'Failed to create stock adjustment' },
            { status: 500 }
        );
    }
}

// GET endpoint for listing adjustments
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');
        const type = searchParams.get('type');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};

        if (productId) {
            where.productId = productId;
        }

        if (type) {
            where.type = type;
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.createdAt.lte = new Date(endDate);
            }
        }

        // Fetch adjustments with pagination
        const [adjustments, total] = await Promise.all([
            prisma.stockAdjustment.findMany({
                where,
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            unit: true,
                        }
                    },
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.stockAdjustment.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: adjustments,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        });

    } catch (error) {
        console.error('Error fetching adjustments:', error);
        return NextResponse.json(
            { error: 'Failed to fetch adjustments' },
            { status: 500 }
        );
    }
}