import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActor } from '@/lib/auth';
import { parseImageUrl } from '@/lib/image-url';
import { loadStorage, StorageUnavailableError } from '@/lib/storage-loader';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'];

/** Best-effort: recover the Cloudinary public id of one of OUR uploads from its URL. */
function ownPublicId(url: string | null | undefined, merchantId: string): string | null {
  if (!url) return null;
  const m = url.match(new RegExp(`/upload/(?:[^/]+/)*?(?:v\\d+/)?(logos/${merchantId}/[^./]+)\\.[A-Za-z0-9]+$`));
  return m ? m[1] : null;
}

async function dropOld(url: string | null | undefined, merchantId: string) {
  const publicId = ownPublicId(url, merchantId);
  if (!publicId) return;
  try { await (await loadStorage()).deleteImage(publicId); } catch { /* best effort */ }
}

// POST multipart { file }  → upload to Cloudinary and save as the business logo
// POST json { url }        → use an image link as the logo
export async function POST(request: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!actor.can('settings.edit')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const current = await prisma.merchant.findUnique({ where: { id: actor.merchantId }, select: { logoUrl: true } });
    let logoUrl: string;

    if ((request.headers.get('content-type') ?? '').includes('application/json')) {
      const parsed = parseImageUrl((await request.json().catch(() => null))?.url);
      if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
      logoUrl = parsed.url;
    } else {
      const file = (await request.formData()).get('file');
      if (!(file instanceof File)) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Use a PNG, JPG or WebP image' }, { status: 400 });
      if (file.size > MAX_LOGO_BYTES) return NextResponse.json({ error: 'Logo must be smaller than 2MB' }, { status: 400 });

      const storage = await loadStorage();
      const uploaded = await storage.uploadFile(Buffer.from(await file.arrayBuffer()), `logos/${actor.merchantId}`);
      logoUrl = uploaded.url;
    }

    await prisma.merchant.update({ where: { id: actor.merchantId }, data: { logoUrl } });
    await dropOld(current?.logoUrl, actor.merchantId);
    return NextResponse.json({ logoUrl });
  } catch (err) {
    if (err instanceof StorageUnavailableError) return NextResponse.json({ error: err.message }, { status: 503 });
    console.error('POST /api/settings/logo', err);
    return NextResponse.json({ error: 'Could not save the logo' }, { status: 500 });
  }
}

export async function DELETE() {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!actor.can('settings.edit')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const current = await prisma.merchant.findUnique({ where: { id: actor.merchantId }, select: { logoUrl: true } });
  await prisma.merchant.update({ where: { id: actor.merchantId }, data: { logoUrl: null } });
  await dropOld(current?.logoUrl, actor.merchantId);
  return NextResponse.json({ logoUrl: '' });
}
