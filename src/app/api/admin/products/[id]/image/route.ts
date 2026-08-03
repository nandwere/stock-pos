// app/api/admin/products/[id]/image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaffUser } from '@/lib/adminAuth';
import { validateImageFile, uploadFile, deleteImage, StorageError } from '@/lib/storage';
import { OrderError } from '@/lib/orderService'; // reusing the same typed-error pattern

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requireStaffUser(req);
    const { id } = await params;

    const product = await prisma.product.findFirst({ where: { id, merchantId: staff.merchantId } });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    validateImageFile({ type: file.type, size: file.size });

    const buffer = Buffer.from(await file.arrayBuffer());
    const folder = `products/${staff.merchantId}`;

    const { url, publicId } = await uploadFile(buffer, folder);

    const previousPublicId = product.imagePublicId;

    await prisma.product.update({
      where: { id },
      data: { imageUrl: url, imagePublicId: publicId },
    });

    // Clean up the old image AFTER the new one is confirmed uploaded and
    // saved — never delete-then-upload, or a failed upload leaves the
    // product with no image at all instead of just keeping the old one.
    await deleteImage(previousPublicId);

    return NextResponse.json({ imageUrl: url });
  } catch (err) {
    if (err instanceof StorageError || err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[product image upload]', err);
    return NextResponse.json({ error: 'Could not upload image' }, { status: 500 });
  }
}
