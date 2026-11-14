// src/lib/password-policy.ts
export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(pw)) return 'Password needs an uppercase letter';
  if (!/[0-9]/.test(pw)) return 'Password needs a number';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Password needs a special character';
  return null;
}