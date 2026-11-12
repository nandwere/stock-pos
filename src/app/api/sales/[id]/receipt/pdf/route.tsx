import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { getSession } from '@/lib/auth';
import { getReceiptData } from '@/lib/receipt-data';
import { ReceiptPdf } from '@/lib/receipt-pdf';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const paymentId = new URL(request.url).searchParams.get('paymentId');

    const data = await getReceiptData(session.merchantId, id, paymentId);
    if (!data) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });

    const buffer = await renderToBuffer(<ReceiptPdf data={data} />);
    const name = `${paymentId ? 'payment' : 'receipt'}-${data.sale.saleNumber}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${name}"`,
      },
    });
  } catch (error) {
    console.error('Receipt PDF error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}