// Indian-grouped rupee formatting used across the What-if page.
// The optional `lang` argument only changes the units: L / Cr in English, लाख / करोड़ in Hindi.

export function inr(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

const UNIT = {
  en: { lakh: 'L', crore: 'Cr' },
  hi: { lakh: ' लाख', crore: ' करोड़' },
};
const unit = (lang) => UNIT[lang === 'hi' ? 'hi' : 'en'];

// 1234567 -> ₹12.35L, 25000000 -> ₹2.50Cr, 9000 -> ₹9,000
export function compact(n, lang) {
  const a = Math.abs(n);
  const u = unit(lang);
  if (a >= 1e7) return '₹' + (n / 1e7).toFixed(2) + u.crore;
  if (a >= 1e5) return '₹' + (n / 1e5).toFixed(2) + u.lakh;
  return inr(n);
}

// 5000000 -> ₹50L, 14000000 -> ₹1.4Cr, 9000000 -> ₹90L (drops trailing zeros)
export function short(n, lang) {
  const a = Math.abs(n);
  const u = unit(lang);
  const t = (x) => String(parseFloat(x.toFixed(2)));
  if (a >= 1e7) return '₹' + t(n / 1e7) + u.crore;
  if (a >= 1e5) return '₹' + t(n / 1e5) + u.lakh;
  return inr(n);
}
