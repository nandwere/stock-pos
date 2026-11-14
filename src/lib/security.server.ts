// src/lib/security.server.ts
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendLoginOtpEmail } from '@/lib/email'; // your existing sender

const ROTATION_DAYS = 90;
const OTP_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;

export async function getSecuritySettings(merchantId: string) {
  const rows = await prisma.settings.findMany({
    where: { merchantId, key: { in: ['two_factor_auth', 'require_password_change'] } },
    select: { key: true, value: true },
  });
  const m = Object.fromEntries(rows.map(r => [r.key, r.value === 'true']));
  return { twoFactor: !!m.two_factor_auth, rotation: !!m.require_password_change };
}

const hashCode = (email: string, code: string) =>
  createHash('sha256').update(`${email}:${code}:${process.env.OTP_SECRET}`).digest('hex');

const mask = (e: string) => e.replace(/^(.).*(@.*)$/, '$1***$2');

export async function sendLoginOtp(user: { email: string }, merchantId: string) {
  const recent = await prisma.otpCode.count({
    where: { merchantId, email: user.email, purpose: 'LOGIN_2FA', createdAt: { gt: new Date(Date.now() - OTP_TTL_MS) } },
  });
  if (recent >= 5) return { error: 'Too many codes requested. Try again in a few minutes.' as const };

  // only the newest code is valid
  await prisma.otpCode.updateMany({
    where: { merchantId, email: user.email, purpose: 'LOGIN_2FA', usedAt: null },
    data: { usedAt: new Date() },
  });

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const otp = await prisma.otpCode.create({
    data: {
      merchantId, email: user.email, purpose: 'LOGIN_2FA',
      code: hashCode(user.email, code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
    select: { id: true },
  });
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId }, select: { name: true },
  });

  try {
    await sendLoginOtpEmail(user.email, code, merchant?.name ?? 'Stock POS');
  } catch (err) {
    console.error('2FA email failed:', err);
    await prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
    return { error: 'Could not send the verification email. Please try again.' as const };
  }
  return { challengeId: otp.id, maskedEmail: mask(user.email) };
}

export async function consumeLoginOtp(challengeId: string, code: string) {
  const otp = await prisma.otpCode.findUnique({ where: { id: challengeId } });
  if (!otp || otp.purpose !== 'LOGIN_2FA' || otp.usedAt || otp.expiresAt < new Date() || otp.attempts >= MAX_ATTEMPTS) {
    return { error: 'Code expired. Please sign in again.' as const };
  }

  const a = Buffer.from(otp.code);
  const b = Buffer.from(hashCode(otp.email, code.trim()));
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return { error: 'Incorrect code' as const };
  }

  // atomic single use, so two concurrent requests can't both succeed
  const used = await prisma.otpCode.updateMany({ where: { id: otp.id, usedAt: null }, data: { usedAt: new Date() } });
  if (used.count !== 1) return { error: 'Code already used' as const };

  return { email: otp.email, merchantId: otp.merchantId };
}

export const passwordExpired = (changedAt: Date) =>
  Date.now() - changedAt.getTime() > ROTATION_DAYS * 86_400_000;