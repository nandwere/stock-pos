'use client';

// components/ProductImageUpload.tsx
//
// For an existing product. Uploads immediately on file selection, or saves an image
// link (the picture stays hosted where it is; nothing is uploaded).

import { useRef, useState } from 'react';
import { Loader2, ImagePlus, Link2, Trash2 } from 'lucide-react';
import { parseImageUrl } from '@/lib/image-url';

export function ProductImageUpload({
  productId,
  currentImageUrl,
  onUploaded,
}: {
  productId: string;
  currentImageUrl?: string | null;
  onUploaded: (url: string | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [link, setLink] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endpoint = `/api/admin/products/${productId}/image`;

  async function send(init: RequestInit): Promise<string | null | undefined> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Could not save image');
      setPreview(data.imageUrl);
      onUploaded(data.imageUrl);
      return data.imageUrl;
    } catch (err: any) {
      setError(err.message ?? 'Could not save image');
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const body = new FormData();
    body.append('file', file);
    await send({ method: 'POST', body });
  }

  async function applyLink() {
    const parsed = parseImageUrl(link);
    if ('error' in parsed) return setError(parsed.error);
    const saved = await send({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: parsed.url }),
    });
    if (saved) { setShowLink(false); setLink(''); }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Product image</label>

      <div
        onClick={() => !busy && fileInputRef.current?.click()}
        className="relative w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50
                   flex items-center justify-center cursor-pointer overflow-hidden hover:border-blue-400"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Product" className="w-full h-full object-cover"
            onError={() => setError('That image could not be loaded')} />
        ) : (
          <ImagePlus className="w-8 h-8 text-gray-300" />
        )}
        {busy && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />

      <div className="flex items-center gap-3 mt-2 text-xs">
        <button type="button" onClick={() => { setShowLink(v => !v); setError(null); }}
          className="inline-flex items-center gap-1 text-blue-600 hover:underline">
          <Link2 className="w-3 h-3" /> Use a link
        </button>
        {preview && (
          <button type="button" disabled={busy} onClick={() => send({ method: 'DELETE' })}
            className="inline-flex items-center gap-1 text-red-600 hover:underline">
            <Trash2 className="w-3 h-3" /> Remove
          </button>
        )}
      </div>

      {showLink && (
        <div className="flex gap-2 mt-2">
          <input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://…/photo.jpg"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="button" onClick={applyLink} disabled={busy}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            Use
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-1">JPEG, PNG, or WebP — max 5MB, or paste a link</p>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
