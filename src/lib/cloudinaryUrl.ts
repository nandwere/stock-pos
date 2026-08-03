// lib/cloudinaryUrl.ts
//
// Deliberately separate from lib/storage.ts. That file calls
// cloudinary.config() and validates server-only env vars (API secret) at
// module load time — if a 'use client' component ever imports it (even
// just for this URL helper), Next.js bundles that whole module into the
// browser, which both leaks server config into client code and crashes at
// runtime since CLOUDINARY_API_SECRET isn't available client-side.
//
// This file has zero dependencies and no env access — safe to import from
// both client and server code.

/**
 * Builds a resized delivery URL from a stored Cloudinary URL, for
 * thumbnails without re-uploading or storing a second file — Cloudinary
 * transforms on request via the URL itself.
 */
export function thumbnailUrl(url: string, size = 200): string {
  return url.replace('/upload/', `/upload/w_${size},h_${size},c_fill,f_auto,q_auto/`);
}
