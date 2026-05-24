// src/app/api/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalesReport } from '@/lib/reports';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const { merchantId } = session;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type !== "sales") {
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    const data = await getSalesReport(merchantId);
    return NextResponse.json({ data });

  } catch (error) {
    console.error('Reports GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}