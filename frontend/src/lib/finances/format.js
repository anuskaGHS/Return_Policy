export const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function money(value) {
  return value == null || value === '' ? '—' : INR.format(Number(value));
}

export function number(value, digits = 0) {
  return value == null || value === '' ? '—' : Number(value).toLocaleString('en-IN', { maximumFractionDigits: digits });
}

export function percent(value, digits = 1) {
  return value == null || value === '' ? '—' : `${Number(value).toFixed(digits)}%`;
}

export function readSession(key, fallback) {
  try {
    const value = sessionStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function writeSession(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* storage is optional */ }
}

export function clearSession(key) {
  try { sessionStorage.removeItem(key); } catch { /* storage is optional */ }
}
