import { useLang, useT } from '../../hooks/useLang.js';

// The Decision Engine tools. `active` is 'whatif', 'smartexit', 'explainer' or 'loan'; `onSelect` is optional.
// A tab marked `soon` is shown but cannot be opened yet.
const TABS = [
  { id: 'whatif', label: 'What-If Policy Simulator' },
  { id: 'smartexit', label: 'Smart Exit & Hold Tax Advisor' },
  { id: 'explainer', label: 'Return Explainer', hi: 'रिटर्न एक्सप्लेनर' },
  { id: 'loan', label: 'Loan vs Investment', hi: 'लोन बनाम निवेश' },
];

export default function ToolTabs({ active = 'whatif', onSelect }) {
  const t = useT();
  const lang = useLang();
  return (
    <div className="wi-tabs" role="tablist" aria-label={t('Decision Engine tools')}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className="wi-tab"
          role="tab"
          type="button"
          aria-selected={active === tab.id}
          disabled={tab.soon}
          style={tab.soon ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
          onClick={() => !tab.soon && onSelect && onSelect(tab.id)}
        >
          {lang === 'hi' && tab.hi ? tab.hi : t(tab.label)}
          {tab.soon && <small style={{ marginLeft: '.5rem', fontSize: '.7rem', opacity: 0.8 }}>{lang === 'hi' ? 'जल्द' : 'Soon'}</small>}
        </button>
      ))}
    </div>
  );
}
