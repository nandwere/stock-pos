// src/lib/image-url.ts — client- and server-safe validation for "image by link".
export function parseImageUrl(input: unknown): { url: string } | { error: string } {
  if (typeof input !== 'string' || !input.trim()) return { error: 'Paste an image link first' };
  const v = input.trim();
  if (v.length > 2000) return { error: 'That link is too long' };
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return { error: 'That is not a valid link' };
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { error: 'The link must start with https:// or http://' };
  return { url: u.toString() };
}
