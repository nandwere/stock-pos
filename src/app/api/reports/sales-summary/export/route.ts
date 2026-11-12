import { NextRequest, NextResponse } from 'next/server';
import { getReportContext } from '@/lib/reports/context';
import { salesSummary } from '@/lib/reports/sales-summary';
import { cashCollected } from '@/lib/reports/cash-collected';
import { reportToXlsx, tableToCsv } from '@/lib/reports/export';

export const runtime = 'nodejs'; // exceljs needs Node APIs

const BUILDERS = { 'sales-summary': salesSummary, 'cash-collected': cashCollected } as const;

export async function GET(request: NextRequest) {
  try {
    const r = await getReportContext(request);
    if ('error' in r) return r.error;

    const sp = new URL(request.url).searchParams;
    const report = sp.get('report') as keyof typeof BUILDERS;
    const format = sp.get('format') === 'csv' ? 'csv' : 'xlsx';
    if (!(report in BUILDERS)) return NextResponse.json({ error: 'Unknown report' }, { status: 400 });

    const result = await BUILDERS[report](r.ctx);
    const base = `${report}_${r.ctx.from}_to_${r.ctx.to}`;
    const headers = { 'Cache-Control': 'no-store' };

    if (format === 'csv') {
      const table = result.tables.find((t) => t.name === sp.get('table')) ?? result.tables[0];
      return new NextResponse(tableToCsv(table), {
        headers: {
          ...headers,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${base}_${table.name}.csv"`,
        },
      });
    }

    const buffer = await reportToXlsx(result);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        ...headers,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${base}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Report export error:', error);
    return NextResponse.json({ error: 'Failed to export report' }, { status: 500 });
  }
}