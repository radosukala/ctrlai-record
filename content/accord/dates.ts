/**
 * Dates in the evidence carry the precision the source gave: "2026-10-07", or "2026-10" if only the month was stated. A date
 * only counts as before or after the accord if every day it could mean is on that side.
 */
const DATE = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/;

function range(value: string): { first: string; last: string } | null {
  const m = DATE.exec(value);
  if (!m) return null;
  const [, y, mo, d] = m;
  if (d) return { first: value, last: value };
  if (mo) {
    const lastDay = new Date(Date.UTC(Number(y), Number(mo), 0)).getUTCDate();
    return { first: `${y}-${mo}-01`, last: `${y}-${mo}-${String(lastDay).padStart(2, '0')}` };
  }
  return { first: `${y}-01-01`, last: `${y}-12-31` };
}

export const isDate = (value: string) => range(value) !== null;
/** Every day this date could mean is on or after `day`. */
export const isProvablyOnOrAfter = (value: string, day: string) => (range(value)?.first ?? '0') >= day;
/** Every day this date could mean is before `day`. */
export const isProvablyBefore = (value: string, day: string) => (range(value)?.last ?? '9') < day;
