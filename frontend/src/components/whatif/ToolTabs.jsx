import { useT } from '../../hooks/useLang.js';

// The two Decision Engine tools. `active` is 'whatif' or 'smartexit'; `onSelect` is optional.
const TABS = [
  { id: 'whatif', label: 'What-If Policy Simulator' },
  { id: 'smartexit', label: 'Smart Exit & Hold Tax Advisor' },
];

export default function ToolTabs({ active = 'whatif', onSelect }) {
  const t = useT();
  return (
    <div className="wi-tabs" role="tablist" aria-label={t('Decision Engine tools')}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className="wi-tab"
          role="tab"
          type="button"
          aria-selected={active === tab.id}
          onClick={() => onSelect && onSelect(tab.id)}
        >
          {t(tab.label)}
        </button>
      ))}
    </div>
  );
}
