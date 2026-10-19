import { useEffect, useRef, useState } from 'react';
import WhatIfHeader from '../components/whatif/WhatIfHeader.jsx';
import WhatIfFooter from '../components/whatif/WhatIfFooter.jsx';
import ToolTabs from '../components/whatif/ToolTabs.jsx';
import HeadingBlock from '../components/whatif/HeadingBlock.jsx';
import ControlsCard from '../components/whatif/ControlsCard.jsx';
import WealthStage from '../components/whatif/WealthStage.jsx';
import HealthScoreCard from '../components/whatif/HealthScoreCard.jsx';
import RatioCard from '../components/whatif/RatioCard.jsx';
import BreakdownCard from '../components/whatif/BreakdownCard.jsx';
import ActionPlanCard from '../components/whatif/ActionPlanCard.jsx';
import MiniBar from '../components/whatif/MiniBar.jsx';
import useWhatIf from '../hooks/useWhatIf.js';
import { LangContext } from '../hooks/useLang.js';
import '../styles/whatif.css';
import '../styles/whatif-ai.css';

// Decision Engine > What-If Policy Simulator. Whole page: header, tabs, heading, cards, plan, footer.
// Optional props:
//   initialProfile  partial of the eight inputs (prefill, for example from an uploaded document later)
//   explanation     string that replaces the one-line reason under the Health score
//   aiStatus        'loading' | 'ai' | 'fallback': what the AI parts show (skeleton / AI text / own rules + notice)
//   aiPlan          { rules: [{ title, action }], vulnerability } that replaces the built-in action plan (AI-written)
//   lang/onLangChange, activeTool/onToolChange  controlled from outside; the page keeps its own state if omitted
//   onInputsChange  called with the eight inputs on mount and every time they change
export default function WhatIfPage({ initialProfile, explanation, aiPlan, aiStatus, lang, onLangChange, activeTool, onToolChange, onInputsChange }) {
  const { inputs, d, base, activePreset, setField, applyPreset, dismissPreset, reset } = useWhatIf(initialProfile);
  const [ownLang, setOwnLang] = useState('en');
  useEffect(() => {
    if (onInputsChange) onInputsChange(inputs);
  }, [inputs, onInputsChange]);
  const controlsRef = useRef(null);
  const breakdownRef = useRef(null);
  const [miniOn, setMiniOn] = useState(false);

  // Mobile: show the mini result bar while the sliders or the breakdown are on screen.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const seen = {};
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          seen[e.target.id] = e.isIntersecting;
        });
        setMiniOn(!!(seen['wi-controls'] || seen['wi-bd']));
      },
      { threshold: 0.25 },
    );
    if (controlsRef.current) io.observe(controlsRef.current);
    if (breakdownRef.current) io.observe(breakdownRef.current);
    return () => io.disconnect();
  }, []);

  const language = (lang || ownLang) === 'hi' ? 'hi' : 'en';

  return (
    <LangContext.Provider value={language}>
    <div className="wi" id="wi" lang={language}>
      <WhatIfHeader lang={language} onLangChange={onLangChange || setOwnLang} />

      <main className="wi-main">
        <ToolTabs active={activeTool || 'whatif'} onSelect={onToolChange} />
        <HeadingBlock d={d} onReset={reset} />

        <div className="wi-grid">
          <ControlsCard
            ref={controlsRef}
            inputs={inputs}
            d={d}
            activePreset={activePreset}
            onField={setField}
            onPreset={applyPreset}
            onDismissPreset={dismissPreset}
          />
          <div className="wi-results">
            <WealthStage d={d} base={base} />
            <div className="wi-duo">
              <HealthScoreCard d={d} explanation={explanation} aiStatus={aiStatus} />
              <RatioCard d={d} />
            </div>
            <BreakdownCard ref={breakdownRef} inputs={inputs} d={d} onField={setField} />
          </div>
        </div>

        <ActionPlanCard d={d} aiPlan={aiPlan} aiStatus={aiStatus} />
      </main>

      <WhatIfFooter />
      <MiniBar d={d} visible={miniOn} />
    </div>
    </LangContext.Provider>
  );
}
