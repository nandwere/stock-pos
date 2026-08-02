import { NextRequest } from 'next/server';
import { OrderError } from './orderService';
import { getSession } from './auth';

// lib/adminAuth.ts
//
// ⚠️  PLACEHOLDER — wire this to whatever auth you already have.
//
// Your schema has User (with merchantId + role) but nothing in what's been
// shared shows how a request gets authenticated (NextAuth session? a
// custom JWT cookie? something else?). Every admin route below calls
// `requireStaffUser(req)` to get `{ userId, merchantId, role }` — replace
// the body of this function with your real session/JWT lookup and nothing
// else in this add-on needs to change.
//
// Two realistic implementations, pick whichever matches what you have:
//
// ── If you use NextAuth ──────────────────────────────────────────────────
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/authOptions';
//
export async function requireStaffUser(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) throw new OrderError(401, 'Not authenticated');
  return {
    userId: session.userId,
    merchantId: session.merchantId,
    role: session.role,
  };
}
//
// ── If you use a custom JWT cookie ───────────────────────────────────────
// import jwt from 'jsonwebtoken';
//
// export async function requireStaffUser(req: NextRequest) {
//   const token = req.cookies.get('session_token')?.value;
//   if (!token) throw new OrderError(401, 'Not authenticated');
//   const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
//   return { userId: payload.sub, merchantId: payload.merchantId, role: payload.role };
// }


export interface StaffContext {
  userId: string;
  merchantId: string;
  role: 'OWNER' | 'MANAGER' | 'CASHIER';
}
