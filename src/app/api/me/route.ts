// src/app/api/me/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { loadActor } from '@/lib/permissions.server';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user?.mustChangePassword) {
    return NextResponse.json({ error: 'Password change required', code: 'PASSWORD_CHANGE_REQUIRED' }, { status: 403 });
  }
  const actor = await loadActor(user);
  const permissions = actor ? Array.from(actor.permissions) : [];
  return NextResponse.json({ id: user.id, isSuperAdmin: user.isSuperAdmin, isAdmin: user.role?.isAdmin || false, permissions });
}
