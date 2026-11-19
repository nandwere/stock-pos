// app/api/admin/products/[id]/image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaffUser } from '@/lib/adminAuth';
import { OrderError } from '@/lib/orderService'; // reusing the same typed-error pattern
import { parseImageUrl } from '@/lib/image-url';
import { loadStorage, StorageUnavailableError } from '@/lib/storage-loader';

type Ctx = { params: Promise<{ id: string }> };

function errorResponse(err: unknown, label: string) {
  if (err instanceof StorageUnavailableError) return NextResponse.json({ error: err.message }, { status: 503 });
  if (err instanceof OrderError || (err as any)?.name === 'StorageError' || typeof (err as any)?.status === 'number') {
    return NextResponse.json({ error: (err as Error).message }, { status: (err as any).status ?? 400 });
  }
  console.error(label, err);
  return NextResponse.json({ error: 'Could not save the image' }, { status: 500 });
}

// POST multipart/form-data { file }   → upload to Cloudinary
// POST application/json   { url }     → use an image link as-is (no upload)
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const staff = await requireStaffUser(req);
    const { id } = await params;

    const product = await prisma.product.findFirst({ where: { id, merchantId: staff.merchantId } });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const previousPublicId = product.imagePublicId;
    let imageUrl: string;
    let imagePublicId: string | null = null;

    if ((req.headers.get('content-type') ?? '').includes('application/json')) {
      const parsed = parseImageUrl((await req.json().catch(() => null))?.url);
      if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
      imageUrl = parsed.url;
    } else {
      const file = (await req.formData()).get('file');
      if (!(file instanceof File)) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

      const storage = await loadStorage();
      storage.validateImageFile({ type: file.type, size: file.size });
      const uploaded = await storage.uploadFile(Buffer.from(await file.arrayBuffer()), `products/${staff.merchantId}`);
      imageUrl = uploaded.url;
      imagePublicId = uploaded.publicId;
    }

    await prisma.product.update({ where: { id }, data: { imageUrl, imagePublicId } });

    // Clean up the old uploaded image AFTER the new one is saved, never before.
    if (previousPublicId) {
      try { await (await loadStorage()).deleteImage(previousPublicId); } catch { /* best effort */ }
    }

    return NextResponse.json({ imageUrl });
  } catch (err) {
    return errorResponse(err, '[product image]');
  }
}

// DELETE → remove the product's image
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const staff = await requireStaffUser(req);
    const { id } = await params;
    const product = await prisma.product.findFirst({ where: { id, merchantId: staff.merchantId } });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    await prisma.product.update({ where: { id }, data: { imageUrl: null, imagePublicId: null } });
    if (product.imagePublicId) {
      try { await (await loadStorage()).deleteImage(product.imagePublicId); } catch { /* best effort */ }
    }
    return NextResponse.json({ imageUrl: null });
  } catch (err) {
    return errorResponse(err, '[product image delete]');
  }
}
