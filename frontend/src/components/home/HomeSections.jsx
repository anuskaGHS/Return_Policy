import { useEffect, useRef } from 'react';
import FeatureRing from './FeatureRing.jsx';
import '../../styles/home-sections.css';

/** Fades an element in once, the first time it scrolls into view. */
function Reveal({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !window.IntersectionObserver) { el.classList.add('hs-in'); return undefined; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('hs-in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={`hs-rv ${className}`.trim()} {...rest}>{children}</Tag>;
}

/* The four starter households. `id` is what onSimulatePersona receives; map it to the
   app's existing persona presets. The numbers shown here must match those presets. */
const PERSONAS = [
  { id: 'early-career', name: 'Early Career', income: '₹6.0L', sip: '₹5,000', emi: '₹12,000', rate: '9.5%' },
  { id: 'balanced-builder', name: 'Balanced Builder', income: '₹14.0L', sip: '₹15,000', emi: '₹22,000', rate: '8.5%' },
  { id: 'aggressive-saver', name: 'Aggressive Saver', income: '₹24.0L', sip: '₹35,000', emi: '₹15,000', rate: '7.8%' },
  { id: 'high-debt-stress', name: 'High Debt Stress', income: '₹9.0L', sip: '₹3,000', emi: '₹45,000', rate: '11.5%' },
];

function Arrow() {
  return <svg viewBox="0 0 12 10" aria-hidden="true"><path d="M0.8 5h10M7.1 1.4 10.9 5l-3.8 3.6" /></svg>;
}

/**
 * Home sections that sit under the hero: feature ring, household picker, closing call to action.
 * Navigation is up to the app: pass onSimulatePersona(personaId) and onOpenEngine(), or rely on the
 * hash links (engineHref) when they are omitted.
 */
export default function HomeSections({
  onSimulatePersona,
  onOpenEngine,
  onOpenFinances,
  engineHref = '#calculator',
  financesHref = '#finances',
}) {
  return (
    <div className="hs">
      <section className="hs-ring-sec" aria-labelledby="hs-ring-h">
        <Reveal className="hs-sec-head">
          <h2 id="hs-ring-h">Know before you decide</h2>
          <p>Prepay or invest. Hold or exit. What's live today, and what's coming next.</p>
        </Reveal>
        <FeatureRing />
        <Reveal as="p" className="hs-cap">Sample figures, for illustration.</Reveal>
      </section>

      <section className="hs-try" aria-labelledby="hs-try-h">
        <Reveal className="hs-sec-head">
          <h2 id="hs-try-h">Try a household</h2>
          <p>Tap one to see its numbers.</p>
        </Reveal>
        <Reveal className="hs-pgrid">
          {PERSONAS.map((p) => (
            <a
              key={p.id}
              className="hs-persona"
              href={engineHref}
              onClick={onSimulatePersona ? (e) => { e.preventDefault(); onSimulatePersona(p.id); } : undefined}
            >
              <h3>{p.name}</h3>
              <dl className="hs-pstats">
                <div><dt>Income</dt><dd>{p.income}<small>/yr</small></dd></div>
                <div><dt>SIP</dt><dd className="hs-g">{p.sip}<small>/mo</small></dd></div>
                <div><dt>EMI</dt><dd className="hs-rk">{p.emi}<small>/mo</small></dd></div>
                <div><dt>Rate</dt><dd>{p.rate}</dd></div>
              </dl>
              <span className="hs-go">Simulate <Arrow /></span>
            </a>
          ))}
        </Reveal>
      </section>

      <section className="hs-ways" aria-labelledby="hs-ways-h">
        <Reveal className="hs-sec-head">
          <h2 id="hs-ways-h">Two ways to start</h2>
          <p>Test a decision, or look at your own money.</p>
        </Reveal>
        <Reveal className="hs-ways-grid">
          <article className="hs-way-card">
            <h3>Decision Engine</h3>
            <p>Try a choice before you make it, in rupees.</p>
            <ul className="hs-way-list">
              <li>What-If Simulator: move a slider, watch the numbers</li>
              <li>Smart Exit: hold or sell a fund</li>
              <li>Loan vs Investment: prepay or invest</li>
            </ul>
            <a
              className="hs-btn"
              href={engineHref}
              onClick={onOpenEngine ? (e) => { e.preventDefault(); onOpenEngine(); } : undefined}
            >
              Open Decision Engine
            </a>
          </article>
          <article className="hs-way-card">
            <h3>My Finances</h3>
            <p>Add your own documents and see everything in one place.</p>
            <ul className="hs-way-list">
              <li>SIP statement, loan, term policy and FD in one dashboard</li>
              <li>Health score and insurance gap check</li>
              <li>Ask questions about your own numbers</li>
            </ul>
            <a
              className="hs-btn"
              href={financesHref}
              onClick={onOpenFinances ? (e) => { e.preventDefault(); onOpenFinances(); } : undefined}
            >
              Open My Finances
            </a>
          </article>
        </Reveal>
      </section>
    </div>
  );
}
