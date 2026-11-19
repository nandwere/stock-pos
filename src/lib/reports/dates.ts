export const isYmd = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

/** Today's date (YYYY-MM-DD) in the given IANA timezone. */
export const todayIn = (tz: string) =>
  new Date().toLocaleDateString('en-CA', { timeZone: tz });

export function addDays(ymd: string, n: number) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
/** Offset (ms) of `tz` from UTC at the given instant. */
function tzOffsetMs(utcMs: number, tz: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** The UTC instant at which a wall clock in `tz` reads `ymd 00:00:00`. */
export function zonedDayStart(ymd: string, tz: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  const wall = Date.UTC(y, m - 1, d);
  let t = wall - tzOffsetMs(wall, tz);
  t = wall - tzOffsetMs(t, tz); // second pass for DST edges
  return new Date(t);
}
