import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cat = await prisma.expenseCategory.findFirst({
    where: { id: (await params).id, merchantId: session.merchantId },
  });
  if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { name, description, color } = await request.json();

  const updated = await prisma.expenseCategory.update({
    where: { id: (await params).id },
    data:  { name, description, color },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['OWNER', 'MANAGER'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const cat = await prisma.expenseCategory.findFirst({
    where: { id: (await params).id, merchantId: session.merchantId },
  });
  if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (cat.isSystem)
    return NextResponse.json(
      { error: 'System categories cannot be deleted' },
      { status: 400 }
    );

  // Check if in use
  const inUse = await prisma.expense.count({
    where: { categoryId: (await params).id },
  });
  if (inUse > 0)
    return NextResponse.json(
      { error: `Cannot delete — ${inUse} expense${inUse > 1 ? 's use' : ' uses'} this category` },
      { status: 409 }
    );

  await prisma.expenseCategory.delete({ where: { id: (await params).id } });
  return new NextResponse(null, { status: 204 });
}