// src/lib/plan-schema.ts  — validation for plan create/update (server only)
import { z } from 'zod';
import { FEATURE_KEYS, PLAN_COLOR_KEYS, type Feature } from '@/lib/plans';

const limit = z.number().int().min(1, 'must be at least 1').max(10_000_000).nullable();

export const planCreateSchema = z.object({
  key: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_]{1,29}$/, 'use 2–30 capital letters, numbers or underscores, starting with a letter'),
  name: z.string().trim().min(1, 'is required').max(60),
  description: z.string().trim().max(200).default(''),
  price: z.number().int().min(0).max(10_000_000).default(0),
  contactOnly: z.boolean().default(false),
  maxProducts: limit.default(null),
  maxUsers: limit.default(null),
  features: z.array(z.enum(FEATURE_KEYS as [Feature, ...Feature[]])).default([]),
  color: z.enum(PLAN_COLOR_KEYS as [string, ...string[]]).default('gray'),
  isPopular: z.boolean().default(false),
  isPublic: z.boolean().default(true),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});

// The key is what merchants point at, so it can't change after creation.
export const planUpdateSchema = planCreateSchema.omit({ key: true }).partial();

export function firstIssue(err: z.ZodError): string {
  const i = err.issues[0];
  const path = i.path.join('.');
  return path ? `${path}: ${i.message}` : i.message;
}
