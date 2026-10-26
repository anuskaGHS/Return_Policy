export function cleanNumber(value) {
  const text = String(value ?? '').replace(/,/g, '').trim();
  return text === '' ? NaN : Number(text);
}

export function indianNumber(value, digits = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return number.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function rupees(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `₹${indianNumber(number)}` : '—';
}

export function percent(value, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(digits).replace(/\.0+$|(?<=\.\d)0+$/, '')}%` : '—';
}

export function duration(months, t) {
  const n = Number(months);
  if (!Number.isFinite(n)) return '—';
  const years = Math.floor(n / 12);
  const rest = n % 12;
  const parts = [];
  if (years) parts.push(`${years} ${years === 1 ? t.yearOne : t.yearMany}`);
  if (rest) parts.push(`${rest} ${rest === 1 ? t.monthOne : t.monthMany}`);
  return parts.join(' ') || `0 ${t.monthMany}`;
}

export function template(text, values) {
  return String(text).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '—');
}

export function readFinances() {
  try {
    const value = JSON.parse(sessionStorage.getItem('return-policy-finances') || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

export function loanFieldsFromFinances(loan) {
  const next = {};
  if (!loan || typeof loan !== 'object') return next;
  const toPositive = (val) => {
    if (val == null || val === '') return null;
    const num = cleanNumber(val);
    return Number.isFinite(num) && num > 0 ? num : null;
  };
  const principal = toPositive(loan.outstanding_principal);
  if (principal !== null) next.outstanding_principal = principal;
  const rate = toPositive(loan.interest_rate_pct);
  if (rate !== null) next.annual_interest_rate_pct = rate;
  const months = toPositive(loan.remaining_months);
  if (months !== null) next.remaining_tenure_months = months;
  return next;
}

