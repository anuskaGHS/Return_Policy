// Number, date and sector-name helpers for the Return Explainer page.
// The numbers themselves always come from the backend; this file only formats them.
const MINUS = '−';

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_HI = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];

export const SECTOR_HI = {
  'Financial Services': 'वित्तीय सेवाएँ',
  'Automobile and Auto Components': 'ऑटोमोबाइल और ऑटो कंपोनेंट्स',
  'Information Technology': 'सूचना प्रौद्योगिकी (IT)',
  FMCG: 'FMCG',
  'Metals & Mining': 'धातु और खनन',
  Realty: 'रियल एस्टेट',
  'Other sectors (estimated)': 'अन्य सेक्टर',
};

// 1 decimal, with a proper minus sign. Never prints "-0.0".
export function fmt1(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '–';
  const s = Math.abs(v).toFixed(1);
  return v < 0 && s !== '0.0' ? `${MINUS}${s}` : s;
}
export const fmtPct = (n) => `${fmt1(n)}%`;
export function fmtPts(n, signed = false, lang = 'en') {
  const v = Number(n);
  if (!Number.isFinite(v)) return '–';
  const unit = lang === 'hi' ? 'अंक' : 'pts';
  const s = Math.abs(v).toFixed(1);
  if (s === '0.0') return `0.0 ${unit}`;
  if (v < 0) return `${MINUS}${s} ${unit}`;
  return `${signed ? '+' : ''}${s} ${unit}`;
}
// -1 / 0 / 1, based on what the user sees (1 decimal)
export function signOf(n) {
  const r = Math.round(Number(n) * 10) / 10;
  return r < 0 ? -1 : r > 0 ? 1 : 0;
}

export function fmtDate(iso, lang) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return String(iso || '');
  const months = lang === 'hi' ? MONTHS_HI : MONTHS_EN;
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
}

export const isEstimated = (sector) => /estimated/i.test(sector);

// The name shown to the reader. "Other sectors (estimated)" is shown as "Other sectors" plus an "estimated" tag.
export function sectorLabel(sector, lang) {
  if (lang === 'hi' && SECTOR_HI[sector]) return SECTOR_HI[sector];
  return sector.replace(/\s*\(estimated\)/i, '');
}

export const PERIOD_ORDER = ['6M', '1Y', '3Y'];
