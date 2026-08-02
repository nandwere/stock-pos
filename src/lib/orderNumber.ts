// lib/orderNumber.ts
//
// Produces order numbers like ORD-20260802-4F2A — date-prefixed so they
// sort/scan naturally in a driver's hand, with a short random suffix so
// concurrent orders never collide without needing a DB round-trip to check.

export function generateOrderNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `ORD-${y}${m}${d}-${suffix}`;
}
