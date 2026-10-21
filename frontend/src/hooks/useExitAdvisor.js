import { useCallback, useMemo, useRef, useState } from 'react';
import { analyzeExitTax } from '../services/api.js';
import { DB, EQ, INITIAL_STATE, SCENARIOS, buildView, signature, toPayload } from '../lib/exit/model.js';
import { plainText } from '../lib/exit/copy.js';
import { daysFromISO } from '../lib/exit/format.js';

// The AI explanation never changes a number on the page. It is shown only if the server worked out the same
// numbers as the page did, so the words can never contradict what is on screen.
const close = (a, b) => Math.abs(Number(a) - Number(b)) < 0.005;
function sameNumbers(local, server) {
  return !!server
    && close(local.total_cost_now, server.total_cost_now)
    && close(local.net_inhand_now, server.net_inhand_now)
    && close(local.potential_savings, server.potential_savings)
    && local.recommendation === server.recommendation;
}

/**
 * State and results of the Smart Exit page.
 *   s        what the user typed / picked
 *   v        everything shown, worked out from s (see lib/exit/model.js)
 *   quick    the free "Quick summary" in both languages (null while an amount is blank)
 *   ai       { mode, en, hi }: mode is 'quick' | 'loading' | 'ai' | 'stale' | 'fallback'
 *   submit   the "Get my exit advice" button: asks the backend for the AI explanation
 */
export default function useExitAdvisor() {
  const [now] = useState(() => new Date());
  const [s, setS] = useState(INITIAL_STATE);
  const [dragging, setDragging] = useState(false);
  const [aiRes, setAiRes] = useState(null); // { status: 'loading' | 'ai' | 'fallback', sig, en, hi }
  const reqId = useRef(0);
  const aiCardRef = useRef(null);
  const verdictRef = useRef(null);

  const v = useMemo(() => buildView(s, now), [s, now]);
  const quick = useMemo(() => (v.r ? { en: plainText(v, 'en'), hi: plainText(v, 'hi') } : null), [v]);
  const sig = signature(s);

  // any change by the user clears the "picked example" highlight and the "checked just now" note
  const edit = useCallback((patch) => setS((p) => ({ ...p, ...patch, scn: null, checked: false })), []);
  const setType = useCallback((t) => edit({ type: t, cat: t === 'Equity Fund' ? EQ[0] : DB[2] }), [edit]);
  const setDays = useCallback((raw) => {
    const d = parseInt(raw, 10);
    edit({ days: Number.isNaN(d) ? 0 : Math.max(0, d) });
  }, [edit]);
  const setDaysFromDate = useCallback((iso) => {
    if (iso) edit({ days: daysFromISO(iso, now) });
  }, [edit, now]);
  const toggleAdv = useCallback(() => setS((p) => ({ ...p, adv: !p.adv })), []);
  const pickScenario = useCallback((k) => {
    const c = SCENARIOS[k];
    setS((p) => ({ ...p, type: c.type, cat: c.cat, inv: c.inv, cur: c.cur, days: c.days, load: c.load, slab: c.slab || p.slab, scn: k, checked: false }));
  }, []);

  const submit = useCallback(async () => {
    if (!v.r) return;
    const id = ++reqId.current;
    const reqSig = sig;
    const local = v.r;
    setS((p) => ({ ...p, checked: true }));
    setAiRes({ status: 'loading', sig: reqSig });

    // a soft glow on the verdict card, then bring the explanation card into view
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const vEl = verdictRef.current;
    if (vEl && vEl.animate && !reduce) {
      vEl.animate(
        [
          { boxShadow: '0 0 0 0 rgba(255,194,228,.7), 0 28px 56px rgba(0,0,0,.6)' },
          { boxShadow: '0 0 0 22px rgba(255,194,228,0), 0 28px 56px rgba(0,0,0,.6)' },
        ],
        { duration: 900, easing: 'cubic-bezier(.16,1,.3,1)' },
      );
    }
    const card = aiCardRef.current;
    if (card) {
      card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      try { card.focus({ preventScroll: true }); } catch (e) { /* focus is a nicety */ }
    }

    try {
      const res = await analyzeExitTax(toPayload(v.inp));
      if (id !== reqId.current) return; // a newer request replaced this one
      const good = res && res.ai_source === 'ai' && res.ai_explanation_en && res.ai_explanation_hi && sameNumbers(local, res);
      setAiRes(good
        ? { status: 'ai', sig: reqSig, en: res.ai_explanation_en, hi: res.ai_explanation_hi }
        : { status: 'fallback', sig: reqSig });
    } catch (err) {
      if (id === reqId.current) setAiRes({ status: 'fallback', sig: reqSig });
    }
  }, [v, sig]);

  let mode = 'quick';
  if (v.r && aiRes) {
    if (aiRes.status === 'loading') mode = 'loading';
    else if (aiRes.sig === sig) mode = aiRes.status; // 'ai' | 'fallback'
    else mode = aiRes.status === 'ai' ? 'stale' : 'quick'; // a fallback was only the quick summary, so just refresh it
  }
  const ai = { mode, en: aiRes && aiRes.en, hi: aiRes && aiRes.hi };

  return {
    now, s, v, quick, ai, dragging, setDragging,
    edit, setType, setDays, setDaysFromDate, toggleAdv, pickScenario, submit,
    aiCardRef, verdictRef,
  };
}
