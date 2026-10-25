import { mockLoan } from '../lib/loan/mock.js';

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api';
const TIMEOUT_MS = 70000;

async function readError(response) {
  const body = await response.json().catch(() => ({}));
  const error = new Error(Array.isArray(body.detail) ? 'invalid' : 'failed');
  error.status = response.status;
  throw error;
}

export async function compareLoan(input) {
  if (import.meta.env?.VITE_LOAN_MOCK === '1') return mockLoan(input);
  const response = await fetch(`${API_BASE_URL}/loan-optimizer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) await readError(response);
  return response.json();
}

