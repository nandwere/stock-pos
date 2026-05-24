import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasPermission } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        console.log('Session:', session);

        const { merchantId } = session;

        const where: any = { id: merchantId };

        const data = await prisma.merchant.findUnique({
            where,
            include: {
                
            }
        });

        return NextResponse.json({ data, message: 'Merchant fetched successfully' });
    }
    catch (error) {
        console.error('Error fetching merchant:', error);
        return NextResponse.json({ error: 'Failed to fetch merchant' }, { status: 500 });
    }
}