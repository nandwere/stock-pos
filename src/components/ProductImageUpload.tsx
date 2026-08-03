'use client';

// components/ProductImageUpload.tsx
//
// Drop this into your existing product create/edit form. It uploads
// immediately on file selection (rather than waiting for the whole form to
// be submitted) since the image is stored separately from the rest of the
// product fields — this avoids re-architecting your product save flow to
// also carry a file through it.
//
// Usage:
//   <ProductImageUpload
//     productId={product.id}
//     currentImageUrl={product.imageUrl}
//     onUploaded={(url) => setForm(f => ({ ...f, imageUrl: url }))}
//   />

import { useRef, useState } from 'react';
import { Loader2, ImagePlus } from 'lucide-react';

export function ProductImageUpload({
  productId,
  currentImageUrl,
  onUploaded,
}: {
  productId: string;
  currentImageUrl?: string | null;
  onUploaded: (url: string) => void;
}) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Show an immediate local preview while the real upload happens in the
    // background — feels instant even though the network request hasn't
    // finished yet.
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/admin/products/${productId}/image`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');

      setPreview(data.imageUrl);
      onUploaded(data.imageUrl);
    } catch (err: any) {
      setError(err.message ?? 'Could not upload image');
      setPreview(currentImageUrl ?? null); // revert to last known-good image
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localPreview);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Product image</label>

      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className="relative w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50
                   flex items-center justify-center cursor-pointer overflow-hidden hover:border-blue-400"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Product" className="w-full h-full object-cover" />
        ) : (
          <ImagePlus className="w-8 h-8 text-gray-300" />
        )}

        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      <p className="text-xs text-gray-400 mt-1">JPEG, PNG, or WebP — max 5MB</p>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}