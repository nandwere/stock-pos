// lib/auth.ts
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify, SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { MerchantPlan, SessionPayload, User, UserRole } from '@/types';

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
export async function createSession(user: User) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const payload: SessionPayload = {
    userId: user.id,
    merchantId: user.merchantId,
    email: user.email,
    role: user.role,
    expiresAt,
    plan: user.plan || 'FREE',
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
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();

  if (!session) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        merchantId: true,},
    });

    if (!user || !user.isActive) return null;

    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

/**
 * Require authentication
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}

/**
 * Require specific role
 */
export async function requireRole(allowedRoles: UserRole | UserRole[]): Promise<User> {
  const user = await requireAuth();

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!roles.includes(user.role)) {
    redirect('/unauthorized');
  }

  return user;
}

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
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    // 1. Resolve the merchant first — fail fast if it doesn't exist
    //    or is suspended before we do any password work.
    const merchant = await prisma.merchant.findUnique({
      where: { slug: merchantIdentifier },
      select: { id: true, isActive: true, name: true, plan: true, slug: true },
    });
    console.log('Resolved merchant for login:', merchant);

    if (!merchant) {
      return { success: false, error: 'Workspace not found' };
    }

    if (!merchant.isActive) {
      return { success: false, error: 'This workspace has been suspended. Contact support.' };
    }

    // 2. Look up the user scoped to that merchant.
    //    The schema enforces @@unique([merchantId, email]) so this
    //    query is always hitting an indexed, tenant-scoped row.
    const user = await prisma.user.findUnique({
      where: {
        merchantId_email: {         // compound unique index name Prisma generates
          merchantId: merchant.id,
          email,
        },
      },
    });

    // Deliberate: same error for "no user" and "wrong password" to
    // avoid leaking whether an email is registered on a workspace.
    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    if (!user.isActive) {
      return { success: false, error: 'Account is inactive. Contact administrator.' };
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return { success: false, error: 'Invalid email or password' };
    }

    await createSession({
      id: user.id,
      merchantId: user.merchantId,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      plan: merchant.plan as MerchantPlan,
    });

    return {
      success: true,
      user: {
        id: user.id,
        merchantId: user.merchantId,
        email: user.email,
        name: user.name,
        role: user.role,  
        isActive: user.isActive,
        plan: merchant.plan as MerchantPlan,
      },
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'An error occurred during login' };
  }
}

/**
 * Register new user (Owner only)
 */
export async function registerUser(data: {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  merchantId: string;
}): Promise<{ success: boolean; error?: string; user?: User }> {
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
        role: data.role,
        isActive: true,
        merchantId: data.merchantId, // Assuming you have a merchantId in the registration data
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        merchantId: true,
      },
    });

    return { success: true, user };
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

/**
 * Check if user has permission
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const user = await getCurrentUser();

  if (!user) return false;

  const permissions: Record<UserRole, string[]> = {
    OWNER: [
      'users.view',
      'users.create',
      'users.edit',
      'users.delete',
      'products.view',
      'products.create',
      'products.edit',
      'products.delete',
      'sales.view',
      'sales.create',
      'sales.delete',
      'stock.count',
      'stock.adjust',
      'reports.view',
      'settings.edit',
    ],
    MANAGER: [
      'users.view',
      'products.view',
      'products.create',
      'products.edit',
      'sales.view',
      'sales.create',
      'stock.count',
      'stock.adjust',
      'reports.view',
    ],
    CASHIER: [
      'products.view',
      'sales.view',
      'sales.create',
      'stock.count',
    ],
  };

  return permissions[user.role]?.includes(permission) || false;
}