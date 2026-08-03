// lib/storage.ts
//
// Uses Cloudinary instead of a self-hosted S3-compatible service. No
// server to run, no reverse proxy, no bucket policies — an account and
// three env vars is the entire setup. Trade-off going the other way: it's
// a proprietary hosted service, not something you run yourself.
//
// Requires: npm install cloudinary
//
// Env vars needed (all three from your Cloudinary dashboard's "Account
// Details" section):
//   CLOUDINARY_CLOUD_NAME
//   CLOUDINARY_API_KEY
//   CLOUDINARY_API_SECRET

import { v2 as cloudinary } from 'cloudinary';

const REQUIRED_ENV = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable for image storage: ${key}`);
  }
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export class StorageError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function validateImageFile(file: { type: string; size: number }) {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new StorageError(400, `Unsupported file type: ${file.type}. Use JPEG, PNG, or WebP.`);
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new StorageError(400, 'Image must be smaller than 5MB.');
  }
}

export interface UploadResult {
  url: string;
  publicId: string;
}

/**
 * Uploads a buffer to Cloudinary under the given folder, with automatic
 * format/quality optimization applied at delivery time (Cloudinary
 * transforms on the fly per-request, it doesn't need a separate resize
 * step at upload time). `folder` groups images per merchant, e.g.
 * `products/{merchantId}`.
 */
export async function uploadFile(buffer: Buffer, folder: string): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        // f_auto/q_auto equivalents — serves WebP/AVIF to browsers that
        // support it and picks a sensible quality automatically, without
        // you needing to generate multiple sizes/formats yourself.
        transformation: [{ fetch_format: 'auto', quality: 'auto' }],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    uploadStream.end(buffer);
  });
}

/**
 * Best-effort delete — used when replacing a product's image. Failures
 * here are logged, not thrown: an orphaned image sitting in Cloudinary is
 * a much smaller problem than failing the upload the user is waiting on.
 */
export async function deleteImage(publicId: string | null | undefined): Promise<void> {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn('[storage] failed to delete old image (non-fatal):', err);
  }
}

/**
 * Re-exported here purely for convenience so server code can import
 * everything from one place — the actual implementation lives in
 * cloudinaryUrl.ts, which has no server-only dependencies. Import directly
 * from cloudinaryUrl.ts in any 'use client' component instead of from here.
 */
export { thumbnailUrl } from './cloudinaryUrl';
