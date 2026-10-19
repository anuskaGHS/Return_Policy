import Rich from './Rich.jsx';
import { rules, dragLine } from '../../lib/whatif/copy.js';
import { useLang, useT } from '../../hooks/useLang.js';

// aiStatus (optional): 'loading' | 'ai' | 'fallback'. Without it the card behaves as a plain offline page:
// it shows the number-based plan and no notice.
//   loading   the AI is still writing: a skeleton, not the built-in plan
//   ai        the AI answered: show `aiPlan`
//   fallback  the AI could not answer: show the built-in plan with a short notice
// Emerald full-width finale: three actions plus the biggest weakness.
// Default: the three score parts that lose the most points, written from the numbers (works offline, EN and HI).
// `aiPlan` (optional): { rules: [{ title, action }], vulnerability } written by the AI. When given, it replaces the
// built-in text and the chip says "AI-tailored". The page never invents an aiPlan; the parent passes it only
// when the backend really used the AI.
export default function ActionPlanCard({ d, aiPlan, aiStatus }) {
  const lang = useLang();
  const t = useT();
  const loading = aiStatus === 'loading';
  const ai = !loading && !!(aiPlan && Array.isArray(aiPlan.rules) && aiPlan.rules.length > 0);
  const failed = !loading && !ai && aiStatus === 'fallback';
  const list = ai
    ? aiPlan.rules.map((r) => [r.title, [r.action]])
    : rules(d, lang);
  const drag = ai ? null : dragLine(d, lang);
  const aiVuln = ai && aiPlan.vulnerability ? aiPlan.vulnerability : null;
  return (
    <article className="wi-card emerald wi-plan wi-hv" id="wi-plan" style={{ '--d': '.1s' }} aria-label={t('Personal policy action plan')}>
      <div className="wi-top">
        <span className="wi-label">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" /></svg>
          {t('Personal policy action plan')}
        </span>
        <span className="wi-chip" data-source={loading ? 'loading' : ai ? 'ai' : 'rules'}>
          {loading ? (
            <span className="wi-ai-state" role="status"><i />{t('AI is preparing your plan…')}</span>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
              {ai ? t('3 AI-tailored rules') : t('3 tailored rules')}
            </>
          )}
        </span>
      </div>
      {failed && (
        <div className="wi-ai-note" role="note">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span>{t("AI couldn't answer this time. This plan is calculated from your score breakdown, using standard thresholds (EMI under 30% of income, cover of 10× income, 6 months of emergency savings).")}</span>
        </div>
      )}
      <div className="wi-rules" aria-busy={loading}>
        {loading
          ? [0, 1, 2].map((i) => (
            <div className="wi-rule skel" key={i} aria-hidden="true">
              <span className="wi-rule-n">{i + 1}</span>
              <div>
                <span className="wi-skel-line w1" />
                <span className="wi-skel-line w2" />
                <span className="wi-skel-line w3" />
                <span className="wi-skel-line w4" />
              </div>
            </div>
          ))
          : list.map((r, i) => (
            <div className="wi-rule" key={i}>
              <span className="wi-rule-n">{i + 1}</span>
              <div><h3>{r[0]}</h3><p><Rich parts={r[1]} /></p></div>
            </div>
          ))}
      </div>
      {loading ? (
        <div className="wi-vuln skel" aria-hidden="true"><span className="wi-skel-line" /></div>
      ) : aiVuln ? (
        <div className="wi-vuln">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          <div><b>{t('Key vulnerability:')}</b> {aiVuln}</div>
        </div>
      ) : drag ? (
        <div className="wi-vuln">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          <div><Rich parts={drag} /></div>
        </div>
      ) : (
        <div className="wi-vuln ok">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
          <div><b>{t('No drag:')}</b> {t('every part of the score is at full marks.')}</div>
        </div>
      )}
    </article>
  );
}
