import { useEffect, useState } from 'react';
import WhatIfHeader from '../components/whatif/WhatIfHeader.jsx';
import WhatIfFooter from '../components/whatif/WhatIfFooter.jsx';
import ToolTabs from '../components/whatif/ToolTabs.jsx';
import ScenarioCards from '../components/exit/ScenarioCards.jsx';
import FundForm from '../components/exit/FundForm.jsx';
import VerdictCard from '../components/exit/VerdictCard.jsx';
import CostChart from '../components/exit/CostChart.jsx';
import OptionCards from '../components/exit/OptionCards.jsx';
import BottomLine from '../components/exit/BottomLine.jsx';
import RuleTiles from '../components/exit/RuleTiles.jsx';
import AiCard from '../components/exit/AiCard.jsx';
import Disclaimer from '../components/exit/Disclaimer.jsx';
import { ClockIcon } from '../components/exit/icons.jsx';
import useExitAdvisor from '../hooks/useExitAdvisor.js';
import useExitText from '../hooks/useExitText.js';
import { LangContext } from '../hooks/useLang.js';
import { prefillNoteText } from '../lib/exit/copy.js';
import '../styles/whatif.css';
import '../styles/exit.css';

function ExitBody({ x, onToolChange }) {
  const { t, lang } = useExitText();
  const { v, prefilled } = x;
  return (
    <main className="wi-main ex-main">
      <ToolTabs active="smartexit" onSelect={onToolChange} />

      <section className="ex-head" aria-labelledby="ex-h1">
        <span className="ex-eyebrow"><ClockIcon />{t('Exit advisor')}</span>
        <h1 className="ex-h1" id="ex-h1">{t('Sell today,')} <em>{t('or wait?')}</em></h1>
        <p className="ex-lede">{t('Tell us what you bought and when. We show what selling today costs, and what waiting saves.')}</p>
      </section>

      <ScenarioCards x={x} />

      <div className="ex-console">
        <div className="ex-form-col">
          {prefilled && <p role="status" className="ex-prefill-note">{prefillNoteText(lang)}</p>}
          <FundForm x={x} />
        </div>
        <div className={`ex-rcol${v.empty ? ' ex-rc-empty' : ''}`}>
          <VerdictCard x={x} />
          <CostChart x={x} />
        </div>
      </div>

      {!v.empty && !v.lockUI && <OptionCards x={x} />}
      {!v.empty && !v.lock && <BottomLine x={x} />}
      <RuleTiles x={x} />
      <AiCard x={x} />
      <Disclaimer />
    </main>
  );
}

// Decision Engine > Smart Exit & Hold Tax Advisor. Whole page: header, tabs, heading, form, results, footer.
// Same shell as the What-if page (header, tabs, footer); only the colours and the cards are its own.
// Props (all optional, same as WhatIfPage):
//   lang / onLangChange   controlled from outside; the page keeps its own language if omitted
//   onToolChange          called with 'whatif' or 'smartexit' when a tab is pressed
export default function ExitPage({ prefill, onPrefillUsed, lang, onLangChange, onToolChange }) {
  const [ownLang, setOwnLang] = useState('en');
  const language = (lang || ownLang) === 'hi' ? 'hi' : 'en';
  const x = useExitAdvisor(prefill);

  useEffect(() => {
    if (prefill && onPrefillUsed) {
      onPrefillUsed();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <LangContext.Provider value={language}>
      <div className="wi ex" id="ex" lang={language}>
        <WhatIfHeader lang={language} onLangChange={onLangChange || setOwnLang} />
        <ExitBody x={x} onToolChange={onToolChange} />
        <WhatIfFooter />
      </div>
    </LangContext.Provider>
  );
}

