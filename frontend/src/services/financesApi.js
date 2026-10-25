import { mockChat, mockDashboard, mockExtract } from '../lib/finances/mock.js';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api';
const MOCK = import.meta.env?.VITE_FINANCES_MOCK === '1';

async function request(path, options = {}, language = 'en') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${API_URL}/finances${path}`, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = Array.isArray(data.detail)
        ? language === 'hi' ? 'कृपया आँकड़े जाँचकर फिर कोशिश करें।' : 'Please check the numbers and try again'
        : data.detail;
      throw new Error(detail || 'Something went wrong. Please try again.');
    }
    return data;
  } finally { clearTimeout(timeout); }
}

export function extractDocuments(files, language = 'en') {
  if (MOCK) return mockExtract(files);
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  form.append('language', language);
  return request('/extract', { method: 'POST', body: form }, language);
}

function removeEmptyFields(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== '' && item !== null && item !== undefined));
}

function toDashboardPayload(payload = {}) {
  const source = payload.confirmed || payload;
  const dashboard = {};
  for (const group of ['sip', 'loan', 'insurance', 'fd', 'income']) {
    const values = removeEmptyFields(source[group]);
    if (values && Object.keys(values).length > 0) dashboard[group] = values;
  }
  const userInputs = removeEmptyFields(payload.user_inputs);
  if (userInputs && Object.keys(userInputs).length > 0) dashboard.user_inputs = userInputs;
  dashboard.language = payload.language || 'en';
  return dashboard;
}

function toChatHistory(history = []) {
  return history.slice(-6).map((item) => ({
    role: item.role === 'ai' || item.role === 'assistant' ? 'assistant' : 'user',
    content: String(item.content ?? item.text ?? item.answer ?? '').slice(0, 1000),
  }));
}

export function getDashboard(payload) {
  if (MOCK) return mockDashboard(payload);
  const dashboard = toDashboardPayload(payload);
  return request('/dashboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dashboard) }, dashboard.language);
}

export function askChat(payload) {
  if (MOCK) return mockChat(payload);
  const dashboard = toDashboardPayload(payload);
  return request('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: payload.question, history: toChatHistory(payload.history), language: dashboard.language, dashboard }) }, dashboard.language);
}
export const isFinancesMock = MOCK;
