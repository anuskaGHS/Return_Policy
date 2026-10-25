// Return Explainer API calls. Same base URL as the rest of the app (VITE_API_URL already ends with /api).
const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api';

// Render's free plan sleeps after 15 minutes, so the first call can take up to a minute.
const TIMEOUT_MS = 70000;

async function readError(res) {
  const body = await res.json().catch(() => ({}));
  const err = new Error(typeof body.detail === 'string' ? body.detail : `Server error: ${res.status}`);
  err.status = res.status;
  return err;
}

// -> { as_of, funds: [{ id, name, category, plan, benchmark_name, periods, as_of }] }
export async function getExplainerFunds() {
  const res = await fetch(`${API_BASE_URL}/explainer/funds`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw await readError(res);
  return res.json();
}

// -> the full analysis (fund, benchmark, result, explanation, documents, data_sources, ...)
export async function analyzeFund({ fund_id, period, language = 'en' }) {
  const res = await fetch(`${API_BASE_URL}/explainer/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fund_id, period, language }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw await readError(res);
  return res.json();
}
