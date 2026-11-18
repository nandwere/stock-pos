import { NextRequest, NextResponse } from 'next/server';
import { getReportContext } from '@/lib/reports/context';
import { salesSummary } from '@/lib/reports/sales-summary';

export async function GET(request: NextRequest) {
  try {
    const r = await getReportContext(request);
    if ('error' in r) return r.error;
    return NextResponse.json(await salesSummary(r.ctx));
  } catch (error) {
    console.error('Sales summary error:', error);
    return NextResponse.json({ error: 'Failed to build report' }, { status: 500 });
  }
}