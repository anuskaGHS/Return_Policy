import { useCallback, useContext } from 'react';
import { LangContext } from './useLang.js';
import { tr } from '../lib/whatif/i18n.js';
import { EX_HI, CAT_HI } from '../lib/exit/i18n.js';

// Text helpers for the Smart Exit page, using the same language context as the What-if page.
//   t('English')          static text: Hindi from the Exit dictionary, else from the shared What-if dictionary, else English
//   L('English', 'हिन्दी')  text built from numbers (the two versions are written side by side)
//   cat('Equity: General') fund category label
export default function useExitText() {
  const lang = useContext(LangContext);
  const hi = lang === 'hi';
  const t = useCallback(
    (s) => (hi && Object.prototype.hasOwnProperty.call(EX_HI, s) ? EX_HI[s] : tr(lang, s)),
    [lang, hi],
  );
  const L = useCallback((en, h) => (hi ? h : en), [hi]);
  const cat = useCallback((c) => (hi ? CAT_HI[c] || c : c), [hi]);
  return { lang, hi, t, L, cat };
}
