import { useState } from 'react';
import WhatIfHeader from '../components/whatif/WhatIfHeader.jsx';
import WhatIfFooter from '../components/whatif/WhatIfFooter.jsx';
import ToolTabs from '../components/whatif/ToolTabs.jsx';
import FundForm from '../components/explainer/FundForm.jsx';
import GapCard from '../components/explainer/GapCard.jsx';
import AttributionCard from '../components/explainer/AttributionCard.jsx';
import SourceCards from '../components/explainer/SourceCards.jsx';
import ExplanationCard from '../components/explainer/ExplanationCard.jsx';
import MethodPanel from '../components/explainer/MethodPanel.jsx';
import Disclaimer from '../components/explainer/Disclaimer.jsx';
import { ChatIcon } from '../components/explainer/icons.jsx';
import useExplainer from '../hooks/useExplainer.js';
import useExplainerText from '../hooks/useExplainerText.js';
import { LangContext } from '../hooks/useLang.js';
import { fmtDate, signOf } from '../lib/explainer/format.js';
import '../styles/whatif.css';
import '../styles/explainer.css';

function Heading({ data }) {
  const { L, lang } = useExplainerText();
  const g = data ? signOf(data.result.gap_pts) : -1;
  return (
    <section className="rx-head" aria-labelledby="rx-h1">
      <span className="rx-eyebrow"><ChatIcon />{L('Return explainer', 'रिटर्न एक्सप्लेनर')}</span>
      <h1 className="rx-h1" id="rx-h1">
        {g > 0 && <>{L('Why did my fund', 'मेरा फ़ंड')} <em>{L('lead?', 'आगे क्यों रहा?')}</em></>}
        {g === 0 && <>{L('How did my fund', 'मेरा फ़ंड')} <em>{L('compare?', 'कैसा रहा?')}</em></>}
        {g < 0 && <>{L('Why did my fund', 'मेरा फ़ंड')} <em>{L('lag?', 'पीछे क्यों रहा?')}</em></>}
      </h1>
      <p className="rx-lede">
        {L(
          'Pick a fund and a period. We show the gap to its benchmark, the sectors behind it and events from the same period, each with its source.',
          'फ़ंड और अवधि चुनें। हम बेंचमार्क से अंतर, उसके पीछे के सेक्टर और उसी अवधि की घटनाएँ दिखाते हैं, हर एक के स्रोत के साथ।',
        )}
      </p>
      {data && (
        <span className="rx-pillnote">
          {L('Data as on', 'डेटा')} {fmtDate(data.as_of, lang)}{lang === 'hi' ? ' तक' : ''}
        </span>
      )}
    </section>
  );
}

function ErrorBox({ kind, onRetry }) {
  const { L } = useExplainerText();
  const msg = {
    offline: [
      'We could not reach the server. It may be waking up (the free plan sleeps when unused) or your connection may be down.',
      'हम सर्वर तक नहीं पहुँच सके। हो सकता है वह जाग रहा हो (मुफ़्त प्लान इस्तेमाल न होने पर सो जाता है) या आपका कनेक्शन बंद हो।',
    ],
    unavailable: [
      'The Explainer data is not available right now. Please try again later.',
      'Explainer का डेटा अभी उपलब्ध नहीं है। कृपया बाद में फिर कोशिश करें।',
    ],
    failed: [
      'Something went wrong while explaining this fund. Please try again.',
      'इस फ़ंड को समझाते समय कुछ गड़बड़ हो गई। कृपया फिर कोशिश करें।',
    ],
  }[kind] || [];
  return (
    <div className="rx-err" role="alert">
      <b>{L('Could not load the explanation', 'व्याख्या लोड नहीं हो सकी')}</b>
      <p>{L(msg[0], msg[1])}</p>
      <button type="button" onClick={onRetry}>{L('Try again', 'फिर कोशिश करें')}</button>
    </div>
  );
}

function Body({ x, onToolChange }) {
  const { L } = useExplainerText();
  const { data, status, busy, slow, error } = x;
  return (
    <main className="wi-main rx-main">
      <ToolTabs active="explainer" onSelect={onToolChange} />
      <Heading data={data} />

      {status === 'loading' && (
        <div aria-busy="true">
          <div className="rx-console">
            <div className="rx-sk rx-tall" />
            <div className="rx-sk rx-tall" />
          </div>
          {slow && (
            <p className="rx-slow" role="status">
              {L(
                'The server is waking up. The first request can take up to a minute.',
                'सर्वर जाग रहा है। पहले अनुरोध में एक मिनट तक लग सकता है।',
              )}
            </p>
          )}
        </div>
      )}

      {status === 'error' && <ErrorBox kind={error} onRetry={x.retry} />}

      {status === 'ready' && data && (
        <>
          <div className="rx-console">
            <FundForm x={x} />
            <div className={`rx-rcol${busy ? ' rx-busy' : ''}`} aria-busy={busy}>
              <GapCard data={data} />
              <AttributionCard data={data} />
            </div>
          </div>
          {error && <ErrorBox kind={error} onRetry={x.explain} />}
          {busy && slow && (
            <p className="rx-slow" role="status">
              {L('Still working. The server may be slow right now.', 'अभी काम चल रहा है। सर्वर थोड़ा धीमा हो सकता है।')}
            </p>
          )}
          <div className={busy ? 'rx-busy' : undefined}>
            <SourceCards documents={data.documents} />
          </div>
          <ExplanationCard explanation={data.explanation} busy={busy} />
          <MethodPanel data={data} />
          <Disclaimer />
        </>
      )}
    </main>
  );
}

// Decision Engine > Return Explainer. Whole page: header, tabs, heading, form, results, footer.
// Same shell as the What-if and Smart Exit pages. Props (all optional):
//   lang / onLangChange   controlled from outside; the page keeps its own language if omitted
//   onToolChange          called with 'whatif', 'smartexit' or 'explainer' when a tab is pressed
export default function ExplainerPage({ lang, onLangChange, onToolChange }) {
  const [ownLang, setOwnLang] = useState('en');
  const language = (lang || ownLang) === 'hi' ? 'hi' : 'en';
  const x = useExplainer(language);
  return (
    <LangContext.Provider value={language}>
      <div className="wi rx" id="rx" lang={language}>
        <WhatIfHeader lang={language} onLangChange={onLangChange || setOwnLang} />
        <Body x={x} onToolChange={onToolChange} />
        <WhatIfFooter />
      </div>
    </LangContext.Provider>
  );
}
