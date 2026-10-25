export const SAMPLE_NUMBERS = {
  sip: { monthly_sip_amount: 15000, invested_amount: 360000, current_value: 410000, fund_count: 2, months_invested: 24 },
  loan: { outstanding_principal: 4800000, emi_amount: 48000, interest_rate_pct: 8.5, remaining_months: 180 },
  insurance: { sum_assured: 5000000, annual_premium: 14000 },
  fd: { principal_amount: 200000, interest_rate_pct: 7, maturity_amount: 214000, maturity_date: '2027-06-30' },
  income: { monthly_gross_salary: 120000, monthly_net_salary: 98000 },
};

export function mockExtract(files) {
  const types = ['salary_slip', 'loan_schedule', 'term_policy', 'fd_receipt', 'sip_statement'];
  return Promise.resolve({ documents: files.map((file, index) => ({ index, file_name: file.name, doc_type: types[index] || 'unknown', status: 'read', fields: SAMPLE_NUMBERS[types[index] === 'salary_slip' ? 'income' : types[index] === 'loan_schedule' ? 'loan' : types[index] === 'term_policy' ? 'insurance' : types[index] === 'fd_receipt' ? 'fd' : 'sip'] || {}, message: null })), ai_source: 'fallback' });
}

export function mockDashboard(payload) {
  const c = payload.confirmed || {};
  const income = c.income?.monthly_gross_salary || 0;
  const loan = c.loan;
  const sip = c.sip;
  const insurance = c.insurance;
  const score = income ? 61 : null;
  return Promise.resolve({
    health: score == null ? null : { score, tier: 'Balanced Saver', points: { sip: 23, loan: 14, ins: 8, tax: 10, emg: 6 } },
    cards: { sip: sip ? { current_value: sip.current_value, invested_amount: sip.invested_amount, absolute_return_pct: sip.invested_amount ? ((sip.current_value - sip.invested_amount) / sip.invested_amount) * 100 : null, fund_count: sip.fund_count } : null, loan: loan ? { outstanding_principal: loan.outstanding_principal, emi_amount: loan.emi_amount, interest_rate_pct: loan.interest_rate_pct, emi_share_of_income_pct: income ? (loan.emi_amount / income) * 100 : null } : null, insurance: insurance && income ? { sum_assured: insurance.sum_assured, cover_multiple_of_income: insurance.sum_assured / (income * 12), suggested_cover: income * 120, gap: Math.max(0, income * 120 - insurance.sum_assured) } : null, fd: c.fd ? { principal_amount: c.fd.principal_amount, maturity_date: c.fd.maturity_date, months_to_maturity: 8 } : null },
    findings: insurance && loan ? [{ id: 'loan_vs_cover', title: 'Loan and cover', text_en: `Your home loan is ₹${Math.round(loan.outstanding_principal / 100000)}L and your term cover is ₹${Math.round(insurance.sum_assured / 100000)}L.`, text_hi: 'आपके होम लोन और टर्म कवर के आँकड़े साथ में देखें।', links: [{ label: 'Open in What-If Simulator', target: 'calculator' }] }] : [],
    missing: Object.entries(c).filter(([, value]) => !value || !Object.values(value).some((item) => item !== '' && item != null)).map(([key]) => key), ai_source: 'none', _confirmed: c,
  });
}

export function mockChat(payload) {
  const c = payload.confirmed || {};
  const loan = c.loan?.outstanding_principal;
  const cover = c.insurance?.sum_assured;
  const answer = loan && cover ? `Your term cover is ₹${Math.round(cover / 100000)}L against a ₹${Math.round(loan / 100000)}L loan. Review the remaining income and expenses before deciding.` : 'I need confirmed loan or insurance numbers to answer that question.';
  return Promise.resolve({ answer, ai_source: 'fallback', sources: [{ label: 'Your confirmed numbers' }], suggested_links: [] });
}
