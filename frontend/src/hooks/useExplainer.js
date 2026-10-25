import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeFund, getExplainerFunds } from '../services/explainerApi.js';

// State for the Return Explainer page.
//   status: 'loading' (first load) | 'ready' | 'error'
//   busy:   true while an analysis is running (the old result stays on screen, dimmed)
//   slow:   true when a request has taken more than 6 seconds (the free server is waking up)
export default function useExplainer(language) {
  const [funds, setFunds] = useState([]);
  const [fundId, setFundId] = useState('');
  const [period, setPeriod] = useState('1Y');
  const [status, setStatus] = useState('loading');
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null); // 'offline' | 'unavailable' | 'failed'
  const reqId = useRef(0);
  const hasData = useRef(false);
  const slowTimer = useRef(null);
  const langRef = useRef(language);
  useEffect(() => {
    langRef.current = language;
  }, [language]);

  const clearSlow = () => {
    clearTimeout(slowTimer.current);
    setSlow(false);
  };

  const run = useCallback(async (fid, per) => {
    const id = ++reqId.current;
    setBusy(true);
    clearTimeout(slowTimer.current);
    slowTimer.current = setTimeout(() => setSlow(true), 6000);
    try {
      const res = await analyzeFund({ fund_id: fid, period: per, language: langRef.current });
      if (id !== reqId.current) return;
      hasData.current = true;
      setData(res);
      setError(null);
      setStatus('ready');
    } catch (err) {
      if (id !== reqId.current) return;
      setError(err.status === 503 ? 'unavailable' : err.status ? 'failed' : 'offline');
      // Keep showing the last good result if there is one; otherwise show the error page.
      setStatus(hasData.current ? 'ready' : 'error');
    } finally {
      if (id === reqId.current) {
        setBusy(false);
        clearSlow();
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    hasData.current = false;
    setStatus('loading');
    setError(null);
    clearTimeout(slowTimer.current);
    slowTimer.current = setTimeout(() => setSlow(true), 6000);
    try {
      const res = await getExplainerFunds();
      const list = Array.isArray(res.funds) ? res.funds : [];
      if (!list.length) throw Object.assign(new Error('No funds'), { status: 503 });
      setFunds(list);
      const first = list[0];
      const per = first.periods.includes('1Y') ? '1Y' : first.periods[0];
      setFundId(first.id);
      setPeriod(per);
      await run(first.id, per);
    } catch (err) {
      setError(err.status === 503 ? 'unavailable' : err.status ? 'failed' : 'offline');
      setStatus('error');
      setBusy(false);
      clearSlow();
    }
  }, [run]);

  useEffect(() => {
    load();
    return () => {
      reqId.current += 1;
      clearTimeout(slowTimer.current);
    };
  }, [load]);

  const selectFund = (id) => {
    const f = funds.find((x) => x.id === id);
    if (!f) return;
    setFundId(id);
    if (!f.periods.includes(period)) setPeriod(f.periods[0]);
  };

  const explain = () => {
    if (fundId && !busy) run(fundId, period);
  };

  const fund = funds.find((f) => f.id === fundId) || null;
  return { funds, fund, fundId, period, status, busy, slow, data, error, setPeriod, selectFund, explain, retry: load };
}
