import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getReceiptData } from '@/lib/receipt-data';

type Ctx = { params: Promise<{ id: string }> }; // Next 14: { params: { id: string } }, no await

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const paymentId = new URL(request.url).searchParams.get('paymentId');

    const data = await getReceiptData(session.merchantId, id, paymentId);
    if (!data) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Receipt error:', error);
    return NextResponse.json({ error: 'Failed to load receipt' }, { status: 500 });
  }
}