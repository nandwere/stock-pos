// lib/auth.ts
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { cache } from 'react';
import { loadActor } from '@/lib/permissions.server';
import { MerchantPlan, SessionPayload, UserRole } from '@/types';
import { prisma } from '@/lib/prisma';
import { getSecuritySettings, passwordExpired, sendLoginOtp } from './security.server';
import { redirect } from 'next/navigation';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

const COOKIE_NAME = 'session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
};

/**
 * Create JWT token
 */
export async function createToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

/**
 * Verify JWT token
 */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Create session
 */
export async function createSession(user: CurrentUser) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const payload: SessionPayload = {
    userId: user.id,
    merchantId: user.merchantId,
    email: user.email,
    expiresAt,
    plan: user.plan || 'FREE',
    roleId: user.roleId,
    isSuperAdmin: user.isSuperAdmin,
    role: user.role
  };

  const token = await createToken(payload);

  (await cookies()).set(COOKIE_NAME, token, COOKIE_OPTIONS);
}

/**
 * Get current session
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = await verifyToken(token);

  if (!payload || new Date(payload.expiresAt) < new Date()) {
    return null;
  }

  return payload;
}

/**
 * Get current user
 */


export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  merchantId: string;
  roleId: string;
  role: { id: string; name: string; level: number; isAdmin: boolean };
  plan?: MerchantPlan;
  mustChangePassword?: boolean;
};

// cache() means one DB hit per request, however many times it's called
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true, email: true, name: true, isActive: true,
        isSuperAdmin: true, merchantId: true, roleId: true,
        role: { select: { id: true, name: true, level: true, isAdmin: true } },
      },
    });
    if (!user || !user.isActive) return null;

    return {
      ...user,
      roleId: user.roleId ?? '',
      role: user.role ?? { id: '', name: '', level: 0, isAdmin: false },
      isSuperAdmin: !!user.isSuperAdmin,
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
});
/**
 * Destroy session
 */
export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}

/**
 * Login user scoped to a merchant.
 *
 * Why slug/domain instead of email alone:
 *   Email is unique per merchant, not globally. Two merchants can
 *   have a user with the same email address. We need an identifier
 *   that tells us *which merchant* to look in before we even touch
 *   the users table.
 *
 * Typical sources of merchantIdentifier:
 *   - Subdomain:  acme.yourapp.com  → "acme"
 *   - Custom domain header set by your middleware
 *   - A "workspace" field on the login form
 */
export async function loginUser(
  email: string,
  password: string,
  merchantIdentifier: string     // slug or custom domain
): Promise<{ success: boolean; error?: string; passwordChangeRequired?: boolean; user?: CurrentUser, twoFactorRequired?: boolean; challengeId?: string, maskedEmail?: string }> {
  try {
    const fail = { success: false as const, error: 'Invalid email or password' };

    const merchant = await prisma.merchant.findUnique({
      where: { slug: merchantIdentifier }, select: { id: true, isActive: true },
    });
    if (!merchant?.isActive) return fail;

    const user = await prisma.user.findUnique({
      where: { merchantId_email: { merchantId: merchant.id, email } },
      select: {
        id: true, email: true, name: true, password: true, isActive: true,
        isSuperAdmin: true, passwordChangedAt: true, mustChangePassword: true
      },
    });
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.password))) return fail;

    const sec = await getSecuritySettings(merchant.id);
    if (sec.twoFactor) {
      const r = await sendLoginOtp(user, merchant.id);
      if ('error' in r) return { success: false as const, error: r.error };
      return { success: true as const, twoFactorRequired: true as const, ...r };
    }
    return finishLogin(user.id, merchant.id);
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'An error occurred during login' };
  }
}

export async function finishLogin(userId: string, merchantId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, name: true, isSuperAdmin: true, passwordChangedAt: true, mustChangePassword: true, isActive: true },
  });
  const sec = await getSecuritySettings(merchantId);

  let mustChange: boolean = Boolean(user.mustChangePassword);
  if (!mustChange && sec.rotation && passwordExpired(user.passwordChangedAt)) {
    await prisma.user.update({ where: { id: user.id }, data: { mustChangePassword: true } });
    mustChange = true;
  }

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    isActive: true,
    isSuperAdmin: user.isSuperAdmin, // will be loaded in getCurrentUser
    merchantId,
    roleId: '', // will be loaded in getCurrentUser
    role: { id: '', name: '', level: 0, isAdmin: false }, // will be loaded in getCurrentUser
  });
  return {
    success: true as const,
    passwordChangeRequired: mustChange,
    user: { id: user.id, name: user.name, email: user.email, isSuperAdmin: user.isSuperAdmin, merchantId, isActive: user.isActive, roleId: '', role: { id: '', name: '', level: 0, isAdmin: false, } },
  };
}

/**
 * Register new user (Owner only)
 */
export async function registerUser(data: {
  email: string;
  name: string;
  password: string;
  roleId: string;
  merchantId: string;
}): Promise<{ success: boolean; error?: string; user?: CurrentUser }> {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return { success: false, error: 'User with this email already exists' };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        roleId: data.roleId,
        isActive: true,
        merchantId: data.merchantId, // Assuming you have a merchantId in the registration data
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        merchantId: true,
        roleId: true,
        isSuperAdmin: true,
        role: { select: { id: true, name: true, level: true, isAdmin: true } },
      },
    });

    return {
      success: true,
      user: {
        ...user,
        roleId: user.roleId || '',
        role: user.role || { id: '', name: '', level: 0, isAdmin: false },
      },
    };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'An error occurred during registration' };
  }
}

/**
 * Get role-specific dashboard URL
 */
export function getRoleDashboard(role: UserRole): string {
  // All roles use the same dashboard in this app
  // But you can customize per role if needed
  return '/';
}

export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.mustChangePassword) redirect('/change-password?required=1');
  return user;
}

// Memoised per request, so many hasPermission calls cost one query
export const getActor = cache(async () => {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) return null;
  return loadActor(user);
});

/**
 * Check if user has permission
 */
export async function hasPermission(permission: string) {
  const actor = await getActor();
  return !!actor && actor.can(permission);
}