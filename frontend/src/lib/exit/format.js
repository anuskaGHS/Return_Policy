// Small formatting helpers for the Smart Exit page. No rules live here: the numbers come from services/api.js.
export const DAY_MS = 86400000;

/** 120000 -> "₹1,20,000" (rounded, always positive: callers add their own sign) */
export const inr = (n) => '₹' + Math.round(Math.abs(Number(n) || 0)).toLocaleString('en-IN');

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MON_HI = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];

/** Date -> "16 Sep 2028" (or the Hindi month name). Digits stay Latin. */
export function fmtDate(d, hi) {
  return `${d.getDate()} ${(hi ? MON_HI : MON_EN)[d.getMonth()]} ${d.getFullYear()}`;
}

export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const pad = (n) => String(n).padStart(2, '0');
const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "2028-09-16" -> local Date at midnight */
export function parseISO(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** The purchase date (yyyy-mm-dd, the user's local calendar) for a holding of `days` days. */
export function dateFor(days, now) {
  const t = startOfDay(now);
  return isoLocal(new Date(t.getFullYear(), t.getMonth(), t.getDate() - days));
}

/** Days between a picked purchase date and today (never negative). */
export function daysFromISO(iso, now) {
  const picked = parseISO(iso);
  return Math.max(0, Math.round((startOfDay(now) - picked) / DAY_MS));
}
