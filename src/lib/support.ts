// src/lib/support.ts — shared by the Contact Support form and its API.
export const SUPPORT_TOPICS = [
  'Signing in or my account',
  'Plans, billing or M-Pesa payment',
  'Something is not working (bug)',
  'Receipts, invoices or reports',
  'Online store',
  'Feature request',
  'Other',
] as const;

export type SupportInput = { name: string; email: string; businessCode: string; topic: string; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSupport(i: SupportInput): string | null {
  if (i.name.trim().length < 2 || i.name.length > 80) return 'Enter your name';
  if (!EMAIL_RE.test(i.email) || i.email.length > 120) return 'Enter a valid email address so we can reply';
  if (i.businessCode && !/^[a-z0-9-]{2,30}$/i.test(i.businessCode.trim())) return 'The business code looks wrong (letters, numbers and hyphens only)';
  if (!(SUPPORT_TOPICS as readonly string[]).includes(i.topic)) return 'Choose what your message is about';
  if (i.message.trim().length < 10) return 'Tell us a little more (at least 10 characters)';
  if (i.message.length > 4000) return 'That message is too long (4,000 characters at most)';
  return null;
}
