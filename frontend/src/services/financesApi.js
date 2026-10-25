import { mockChat, mockDashboard, mockExtract } from '../lib/finances/mock.js';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api';
const MOCK = import.meta.env?.VITE_FINANCES_MOCK === '1';

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${API_URL}/finances${path}`, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'Something went wrong. Please try again.');
    return data;
  } finally { clearTimeout(timeout); }
}

export function extractDocuments(files, language = 'en') {
  if (MOCK) return mockExtract(files);
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  form.append('language', language);
  return request('/extract', { method: 'POST', body: form });
}

export function getDashboard(payload) { return MOCK ? mockDashboard(payload) : request('/dashboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); }
export function askChat(payload) { return MOCK ? mockChat(payload) : request('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); }
export const isFinancesMock = MOCK;
