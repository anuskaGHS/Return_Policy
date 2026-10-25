import { useEffect, useMemo, useState } from 'react';
import { askChat, extractDocuments, getDashboard, isFinancesMock } from '../services/financesApi.js';
import { clearSession, money, number, percent, readSession, writeSession } from '../lib/finances/format.js';
import { copy } from '../lib/finances/i18n.js';
import FinancesHeader from '../components/finances/FinancesHeader.jsx';
import FinancesFooter from '../components/finances/FinancesFooter.jsx';
import '../styles/finances.css';

const GROUPS = { sip_statement: 'sip', loan_schedule: 'loan', term_policy: 'insurance', fd_receipt: 'fd', salary_slip: 'income' };
const GROUP_LABELS = { sip: 'SIP investments', loan: 'Home loan', insurance: 'Insurance', fd: 'Fixed deposit', income: 'Income' };
const FIELD_SCHEMA = {
  sip: ['monthly_sip_amount', 'invested_amount', 'current_value', 'fund_count', 'months_invested'],
  loan: ['outstanding_principal', 'emi_amount', 'interest_rate_pct', 'remaining_months'],
  insurance: ['sum_assured', 'annual_premium'],
  fd: ['principal_amount', 'interest_rate_pct', 'maturity_amount', 'maturity_date'],
  income: ['monthly_gross_salary', 'monthly_net_salary'],
};
const EMPTY = { sip: {}, loan: {}, insurance: {}, fd: {}, income: {} };
const SAMPLE_FILES = ['salary-slip.pdf', 'home-loan-schedule.pdf', 'term-policy.pdf', 'fd-receipt.pdf', 'sip-statement.pdf'];
const DEFAULT_USER_INPUTS = { sip_return_pct: 13.9, emergency_months: 2, long_term_pct: 60 };

function hasValues(group) { return Object.values(group || {}).some((value) => value !== '' && value != null); }

function FieldGroup({ title, values, onChange, lang, fields }) {
  const labels = copy[lang].fields;
  return <div className="mf-review-group"><div className="mf-review-title">{title}</div><div className="mf-field-grid">
    {fields.map((key) => <label key={key} className="mf-field"><span>{labels[key] || key}</span><input aria-label={labels[key] || key} type={key.includes('date') ? 'date' : 'number'} value={values?.[key] ?? ''} onChange={(event) => onChange(key, event.target.value)} /></label>)}
  </div></div>;
}

function Upload({ files, docs, onFiles, onRead, onManual, sampleDocs, lang, busy }) {
  const t = copy[lang];
  return <section className="mf-upload">
    <div className="mf-upload-icon" aria-hidden="true">↑</div><div className="mf-upload-copy"><strong>{t.add}</strong><span>{t.pdf}</span></div>
    <label className="mf-btn">{t.choose}<input className="mf-hidden" type="file" accept="application/pdf,.pdf" multiple onChange={onFiles} /></label>
    {files.length > 0 && <button className="mf-text-btn" type="button" disabled={busy} onClick={onRead}>{busy ? t.loading : t.readDocuments}</button>}
    <button className="mf-text-btn" type="button" onClick={onManual}>{t.manual}</button>
    {sampleDocs.length > 0 && <div className="mf-sample-links"><span>{t.sampleDocs}:</span>{sampleDocs.map((name) => <a key={name} href={`/sample-docs/${name}`} download>{name}</a>)}</div>}
    <p className="mf-privacy">{t.privacy}</p>
    <div className="mf-file-list">{docs.map((doc) => <span className="mf-file" key={`${doc.file_name}-${doc.index}`}><i className={doc.status === 'read' ? 'ok' : doc.status === 'reading' ? 'reading' : 'wait'} />{doc.file_name} · {t[doc.status] || doc.status}</span>)}</div>
  </section>;
}

function Card({ tone, label, children }) { return <section className={`mf-card ${tone}`}><div className="mf-card-label">{label}</div>{children}</section>; }

export default function FinancesPage() {
  const [lang, setLang] = useState('en');
  const [tab, setTab] = useState('dashboard');
  const [files, setFiles] = useState([]);
  const [docs, setDocs] = useState([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(() => readSession('return-policy-finances', EMPTY));
  const [userInputs, setUserInputs] = useState(DEFAULT_USER_INPUTS);
  const [dashboard, setDashboard] = useState(null);
  const [message, setMessage] = useState(null);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chat, setChat] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sampleDocs, setSampleDocs] = useState([]);
  const t = copy[lang];
  const hasNumbers = useMemo(() => Object.values(confirmed).some(hasValues), [confirmed]);

  useEffect(() => { let cancelled = false; Promise.all(SAMPLE_FILES.map(async (name) => { try { const response = await fetch(`/sample-docs/${name}`, { method: 'HEAD' }); return response.ok ? name : null; } catch { return null; } })).then((available) => { if (!cancelled) setSampleDocs(available.filter(Boolean)); }); return () => { cancelled = true; }; }, []);
  useEffect(() => { if (!hasNumbers) return; let cancelled = false; getDashboard({ confirmed, user_inputs: userInputs, language: lang }).then((result) => { if (!cancelled) setDashboard(result); }).catch(() => { if (!cancelled) setMessage(t.offline); }); return () => { cancelled = true; }; }, [hasNumbers, confirmed, userInputs, lang, t.offline]);

  async function loadDashboard(values = confirmed) {
    setBusy(true); setMessage(null);
    try { setDashboard(await getDashboard({ confirmed: values, user_inputs: userInputs, language: lang })); }
    catch (error) { setMessage(error.message || t.offline); }
    finally { setBusy(false); }
  }

  function onFiles(event) {
    const selected = Array.from(event.target.files || []);
    if (selected.length > 5) { setMessage(t.tooMany); setFiles([]); return; }
    const invalid = selected.find((file) => (file.type && file.type !== 'application/pdf') || !file.name.toLowerCase().endsWith('.pdf') || file.size > 5 * 1024 * 1024);
    if (invalid) { setMessage(t.invalidFile); setFiles([]); return; }
    setMessage(null); setFiles(selected); setDocs(selected.map((file, index) => ({ index, file_name: file.name, status: 'reading' })));
  }

  async function readFiles() {
    setBusy(true); setMessage(null);
    try { const result = await extractDocuments(files, lang); setDocs(result.documents || []); setConfirmed((current) => { const next = { ...current }; (result.documents || []).forEach((doc) => { const group = GROUPS[doc.doc_type]; if (group) next[group] = { ...next[group], ...doc.fields }; }); return next; }); setManualOpen(true); }
    catch (error) { setMessage(error.message || t.offline); setDocs(files.map((file, index) => ({ index, file_name: file.name, status: 'unreadable', fields: {} }))); setManualOpen(true); }
    finally { setBusy(false); }
  }

  function updateField(group, key, value) { setConfirmed((current) => ({ ...current, [group]: { ...current[group], [key]: value === '' ? '' : (key.includes('date') ? value : Number(value)) } })); }
  function updateUserInput(key, value) { setUserInputs((current) => ({ ...current, [key]: value === '' ? '' : Number(value) })); }
  function confirmNumbers() { writeSession('return-policy-finances', confirmed); loadDashboard(confirmed); setTab('dashboard'); }
  function clearData() { clearSession('return-policy-finances'); setConfirmed(EMPTY); setDashboard(null); setDocs([]); setFiles([]); setChat([]); setManualOpen(false); }
  async function submitChat(event) { event.preventDefault(); if (!chatQuestion.trim()) return; const question = chatQuestion.trim(); const history = chat.slice(-6).map(({ role, text, answer }) => ({ role, text: text || answer })); setChat((items) => [...items, { role: 'user', text: question }]); setChatQuestion(''); setChatLoading(true); try { const result = await askChat({ question, confirmed, user_inputs: userInputs, history, language: lang }); setChat((items) => [...items, { role: 'ai', ...result }]); if (result.ai_source === 'fallback') setMessage(t.aiFallback); } catch (error) { setMessage(error.message || t.offline); } finally { setChatLoading(false); } }

  const cards = dashboard?.cards || {};
  return <div className="mf-shell"><FinancesHeader lang={lang} onLangChange={setLang} /><main className="mf-main" id="finances">
    <div className="mf-tabs" role="tablist" aria-label="My Finances views"><button type="button" role="tab" aria-selected={tab === 'dashboard'} onClick={() => setTab('dashboard')}>{t.dashboard}</button><button type="button" role="tab" aria-selected={tab === 'chat'} onClick={() => setTab('chat')}>{t.chat}</button></div>
    <section className="mf-head"><span className="mf-eyebrow">{t.eyebrow}</span><h1>{t.title}</h1><p>{t.lede}</p>{isFinancesMock && <span className="mf-sample">{t.sample}</span>}</section>
    <Upload files={files} docs={docs} onFiles={onFiles} onRead={readFiles} onManual={() => setManualOpen(true)} sampleDocs={sampleDocs} lang={lang} busy={busy} />
    {message && <div className="mf-alert" role="status">{message}</div>}
    {(manualOpen || docs.length > 0 || hasNumbers) && <section className="mf-review"><div className="mf-section-top"><div><span className="mf-eyebrow">{t.review}</span><p>{t.privacyShort}</p></div><button className="mf-outline-btn" type="button" onClick={clearData}>{t.clear}</button></div>
      {docs.filter((doc) => GROUPS[doc.doc_type]).map((doc) => { const group = GROUPS[doc.doc_type]; return <FieldGroup key={`${doc.file_name}-${doc.index}`} title={`${doc.file_name} · ${t[doc.status] || doc.status}`} values={confirmed[group]} fields={FIELD_SCHEMA[group]} onChange={(key, value) => updateField(group, key, value)} lang={lang} />; })}
      <div className="mf-manual-groups">{Object.entries(GROUP_LABELS).map(([group, label]) => <FieldGroup key={group} title={label} values={confirmed[group]} fields={FIELD_SCHEMA[group]} onChange={(key, value) => updateField(group, key, value)} lang={lang} />)}</div>
      <div className="mf-user-inputs"><div className="mf-review-title">{t.userInputs}</div><div className="mf-field-grid"><label className="mf-field"><span>{t.sipReturn}</span><input type="number" min="0" max="100" step="0.1" value={userInputs.sip_return_pct} onChange={(event) => updateUserInput('sip_return_pct', event.target.value)} /></label><label className="mf-field"><span>{t.emergencyMonths}</span><input type="number" min="0" max="60" value={userInputs.emergency_months} onChange={(event) => updateUserInput('emergency_months', event.target.value)} /></label><label className="mf-field"><span>{t.longTerm}</span><input type="number" min="0" max="100" value={userInputs.long_term_pct} onChange={(event) => updateUserInput('long_term_pct', event.target.value)} /></label></div></div>
      <button className="mf-btn" type="button" disabled={busy} onClick={confirmNumbers}>{busy ? t.loading : t.confirm}</button></section>}
    {tab === 'dashboard' ? <>
      {!dashboard && <div className="mf-empty"><h2>{t.noData}</h2><p>{busy ? t.loading : t.privacyShort}</p></div>}
      {dashboard && <div className="mf-grid"><Card tone="mf-navy" label={t.health}><div className="mf-score"><strong>{dashboard.health?.score ?? '—'}</strong><span>/ 100 · {dashboard.health?.tier || t.noData}</span></div><div className="mf-points">{Object.entries(dashboard.health?.points || {}).map(([key, value]) => <div key={key}><span>{key.toUpperCase()}</span><i><b style={{ width: `${Math.min(100, value * 4)}%` }} /></i><strong>{value}</strong></div>)}</div></Card>
        <Card tone="mf-cream" label={t.sip}>{cards.sip ? <><strong className="mf-big">{money(cards.sip.current_value)}</strong><span className="mf-muted">{t.acrossFunds.replace('{n}', number(cards.sip.fund_count))}</span><div className="mf-kv"><span>{t.invested}</span><b>{money(cards.sip.invested_amount)}</b></div><div className="mf-kv"><span>{t.absoluteReturn}</span><b className="mf-good">+{percent(cards.sip.absolute_return_pct)}</b></div></> : <span className="mf-muted">{t.addSip}</span>}</Card>
        <Card tone="mf-emerald" label={t.loan}>{cards.loan ? <><strong className="mf-big">{money(cards.loan.outstanding_principal)}</strong><span className="mf-muted">{t.stillToPay}</span><div className="mf-kv"><span>{t.emi}</span><b>{money(cards.loan.emi_amount)}</b></div><div className="mf-kv"><span>{t.interestRate}</span><b>{percent(cards.loan.interest_rate_pct)}</b></div></> : <span className="mf-muted">{t.addLoan}</span>}</Card>
        <Card tone="mf-verm" label={t.insurance}>{cards.insurance ? <><strong className="mf-big">{money(cards.insurance.sum_assured)}</strong><span className="mf-muted">{t.termCover}</span><div className="mf-kv"><span>{t.suggestedCover}</span><b>{money(cards.insurance.suggested_cover)}</b></div><div className="mf-kv"><span>{t.gap}</span><b>{money(cards.insurance.gap)}</b></div></> : <span className="mf-muted">{t.addInsurance}</span>}</Card>
        <Card tone="mf-char" label={t.fd}>{cards.fd ? <><strong className="mf-big">{money(cards.fd.principal_amount)}</strong><span className="mf-muted">{t.maturesOn} {cards.fd.maturity_date}</span><div className="mf-kv"><span>{t.monthsToMaturity}</span><b>{cards.fd.months_to_maturity}</b></div></> : <span className="mf-muted">{t.addFd}</span>}</Card></div>}
      {dashboard && <><h2 className="mf-subhead">{t.findings}</h2><div className="mf-findings">{(dashboard.findings || []).length ? dashboard.findings.map((finding) => <article key={finding.id}><span>{finding.title}</span><p>{lang === 'hi' ? finding.text_hi : finding.text_en}</p></article>) : <article><span>{t.noData}</span></article>}</div><h2 className="mf-subhead">{t.tools}</h2><div className="mf-tools"><a href="#calculator">{t.openWhatIf}</a><a href="#exit-advisor">{t.coming}</a><a href="#loan">{t.coming}</a></div></>}
    </> : <section className="mf-chat"><aside><span className="mf-eyebrow">{t.chat}</span><h2>{t.ask}</h2><p>{t.disclaimer}</p><div className="mf-chat-docs"><strong>{t.documents}</strong>{docs.length ? docs.map((doc) => <span key={`${doc.file_name}-chat`}>{doc.file_name} · {t[doc.status] || doc.status}</span>) : <span>{t.noData}</span>}</div><div className="mf-suggestions"><button type="button" onClick={() => setChatQuestion('Is my term cover enough for my loan?')}>{t.askHint}</button><button type="button" onClick={() => setChatQuestion(t.howScore)}>{t.howScore}</button></div></aside><div className="mf-conversation"><div className="mf-messages">{chat.length === 0 && <p className="mf-muted">{t.noAnswer}</p>}{chat.map((item, index) => <div className={`mf-message ${item.role}`} key={`${item.role}-${index}`}><p>{item.text || item.answer}</p>{item.sources && <small>{t.sources}: {item.sources.map((source) => source.label).join(', ')}</small>}</div>)}{chatLoading && <div className="mf-message ai"><p>{t.loading}</p></div>}</div><form className="mf-chat-form" onSubmit={submitChat}><label className="mf-sr-only" htmlFor="finance-question">{t.ask}</label><input id="finance-question" value={chatQuestion} onChange={(event) => setChatQuestion(event.target.value)} placeholder={t.askHint} maxLength="500" /><button className="mf-btn" type="submit">{t.send}</button></form></div></section>}
  </main><FinancesFooter lang={lang} /></div>;
}
