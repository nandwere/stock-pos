import { NextRequest, NextResponse } from 'next/server';
import { getReportContext } from '@/lib/reports/context';
import { cashCollected } from '@/lib/reports/cash-collected';

export async function GET(request: NextRequest) {
  try {
    const r = await getReportContext(request);
    if ('error' in r) return r.error;
    return NextResponse.json(await cashCollected(r.ctx));
  } catch (error) {
    console.error('Cash collected error:', error);
    return NextResponse.json({ error: 'Failed to build report' }, { status: 500 });
  }
}