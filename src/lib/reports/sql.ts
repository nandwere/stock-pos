import { Prisma } from '@prisma/client';
import type { Group } from './types';

/**
 * `createdAt` is stored as UTC `timestamp`. These convert the merchant-local
 * calendar dates (from/to, inclusive) into UTC bounds, so a sale at 11:30pm
 * Nairobi time lands on the right day, and the plain column can still use
 * the [merchantId, createdAt] index.
 * `col` is always a hard-coded string from our own code, never user input.
 */
export const inRange = (col: string, from: string, to: string, tz: string) => Prisma.sql`
  ${Prisma.raw(col)} >= ((${from}::date)::timestamp AT TIME ZONE ${tz}::text) AT TIME ZONE 'UTC'
  AND ${Prisma.raw(col)} < (((${to}::date + 1)::timestamp) AT TIME ZONE ${tz}::text) AT TIME ZONE 'UTC'`;

/**
 * Start of the day/week/month a row falls in, in merchant-local time, as text.
 * IMPORTANT: always `GROUP BY 1` with this. Postgres treats each bound
 * parameter as distinct, so grouping by the expression itself fails with
 * "must appear in the GROUP BY clause".
 */
export const localPeriod = (col: string, tz: string, group: Group) => Prisma.sql`
  ((date_trunc(${group}::text, (${Prisma.raw(col)} AT TIME ZONE 'UTC') AT TIME ZONE ${tz}::text))::date)::text`;

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const periodLabel = (group: Group, ymd: string) => (group === 'month' ? ymd.slice(0, 7) : ymd);
export const periodHeader = (group: Group) => (group === 'day' ? 'Date' : group === 'week' ? 'Week starting' : 'Month');

export const sumOf = <T,>(rows: T[], pick: (r: T) => number) => round2(rows.reduce((s, r) => s + pick(r), 0));