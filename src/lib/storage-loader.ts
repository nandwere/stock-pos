// src/lib/storage-loader.ts
//
// lib/storage.ts validates the CLOUDINARY_* variables when it is first imported and
// throws if one is missing. Importing it at the top of a route therefore crashes the
// whole route (and every request to it) on a server where Cloudinary isn't set up.
// Load it lazily instead, so routes that don't need file storage keep working and the
// ones that do can return a clear message.
export class StorageUnavailableError extends Error {}

export async function loadStorage() {
  try {
    return await import('@/lib/storage');
  } catch (err: any) {
    console.error('[storage] unavailable:', err?.message);
    throw new StorageUnavailableError(
      'Image storage is not set up on the server. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET, then restart the app. You can paste an image link instead.'
    );
  }
}
