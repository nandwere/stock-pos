// src/lib/signup.ts — validation shared by the signup form and API.
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/; // 3–30 chars
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s-]{9,15}$/;

// Words that would collide with routes or look official
export const RESERVED_SLUGS = new Set([
  'admin', 'api', 'app', 'www', 'login', 'logout', 'signup', 'register', 'store', 'stores', 'shop', 'receipt',
  'support', 'billing', 'static', 'assets', 'public', 'help', 'mail', 'root', 'system', 'stockpos', 'superadmin',
]);

export function slugify(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30).replace(/-+$/g, '');
}

export function validateSlug(slug: string): string | null {
  if (!SLUG_RE.test(slug)) return 'Use 3–30 lowercase letters, numbers or hyphens (not starting or ending with a hyphen)';
  if (RESERVED_SLUGS.has(slug)) return 'That business code is reserved';
  return null;
}

export type SignupInput = {
  businessName: string; slug: string; email: string; phone: string; ownerName: string; password: string;
};

/** Returns the first problem, or null. Used on both the form and the server. */
export function validateSignup(i: SignupInput): string | null {
  if (i.businessName.trim().length < 2 || i.businessName.length > 80) return 'Enter your business name';
  const slugError = validateSlug(i.slug);
  if (slugError) return slugError;
  if (!EMAIL_RE.test(i.email) || i.email.length > 120) return 'Enter a valid email address';
  if (i.phone && !PHONE_RE.test(i.phone)) return 'Enter a valid phone number';
  if (i.ownerName.trim().length < 2 || i.ownerName.length > 80) return 'Enter your name';
  if (i.password.length < 8 || !/[A-Za-z]/.test(i.password) || !/\d/.test(i.password)) {
    return 'Password must be at least 8 characters and include a letter and a number';
  }
  return null;
}
