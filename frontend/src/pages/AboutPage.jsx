import { Fragment, useEffect } from 'react';
import '../styles/about.css';
import { Icon } from '../data/homeFeatures.jsx';
import {
  GAP_CARDS,
  GAP_SOURCES,
  NAME_CARDS,
  HOW_CARDS,
  PRODUCT_CARDS,
  ASK_ROWS,
  PRIVACY_CARDS,
  PRIVACY_CAPTION,
} from '../data/aboutContent.jsx';
import ParticleScenes from '../components/about/ParticleScenes.jsx';
import Reveal from '../components/about/Reveal.jsx';
import { CardGroup, PalCard } from '../components/about/CardSelection.jsx';

// ids of the five scenes the particle cloud morphs between, in order
const SCENE_IDS = ['ab-hero', 'ab-gap', 'ab-name', 'ab-how', 'ab-end'];

/**
 * About page (product story). The site header is NOT rendered here: this assumes the app's shared header sits above it.
 * tryHref / homeHref: where the closing buttons go (wire them to your router).
 */
export default function AboutPage({ tryHref = '#', homeHref = '#', financesHref = '#finances' }) {
  useEffect(() => {
    document.body.classList.add('ab-route');
    return () => {
      document.body.classList.remove('ab-route');
    };
  }, []);

  return (
    <div className="ab" id="ab">
      <ParticleScenes sectionIds={SCENE_IDS} />

        <main className="ab-main">
          {/* 1. hero */}
          <section className="ab-hero" id="ab-hero" aria-label="Introduction">
            <div className="ab-hero-copy">
              <span className="ab-tag"><i></i>The product story</span>
              <h1 className="ab-h1">
                <span className="ab-ln"><span>Your money has a</span></span>
                <span className="ab-ln"><span>return policy.</span></span>
              </h1>
            </div>
            <p className="ab-hero-sub">Return Policy reads your SIPs, loans and insurance together, then tells you what to do next. In rupees, in English or Hindi.</p>
            <span className="ab-cue" aria-hidden="true"></span>
          </section>

          {/* 2. the gap */}
          <section className="ab-sec" id="ab-gap" aria-labelledby="ab-gap-h">
            <Reveal className="ab-head">
              <span className="ab-tag"><i></i>The gap</span>
              <h2 id="ab-gap-h">Every product works alone.</h2>
              <p>SIPs, loans and insurance each get their own app. None of them check whether your choices work together.</p>
            </Reveal>
            <CardGroup id="gap" className="ab-grid ab-grid-3">
              {GAP_CARDS.map((c, i) => (
                <PalCard key={c.num} group="gap" index={i} palette={c.palette} className="ab-card" delay={c.delay}>
                  <span className="ab-num">{c.num}</span>
                  <span className="ab-stat">
                    {c.stat.map(([v, risk], j) => (
                      <Fragment key={v}>{j > 0 && <i>vs</i>}<b className={risk ? 'r' : undefined}>{v}</b></Fragment>
                    ))}
                  </span>
                  <span className="ab-stat-l">{c.label}</span>
                  <h3>{c.title}</h3>
                  <p>{c.text}</p>
                </PalCard>
              ))}
            </CardGroup>
            <Reveal as="p" className="ab-cap">{GAP_SOURCES}</Reveal>
          </section>

          {/* 3. the name */}
          <section className="ab-sec" id="ab-name" aria-labelledby="ab-name-h">
            <Reveal className="ab-head">
              <span className="ab-tag"><i></i>The name</span>
              <h2 id="ab-name-h">One name, two meanings.</h2>
            </Reveal>
            <CardGroup id="name" className="ab-two">
              <PalCard group="name" index={0} palette={NAME_CARDS[0].palette} className="ab-card" delay={NAME_CARDS[0].delay}>
                <span className="ab-num">{NAME_CARDS[0].num}</span>
                <span className="ab-word">{NAME_CARDS[0].word}</span>
                <p>{NAME_CARDS[0].text}</p>
              </PalCard>
              <Reveal as="span" className="ab-plus" aria-hidden="true">+</Reveal>
              <PalCard group="name" index={1} palette={NAME_CARDS[1].palette} className="ab-card" delay={NAME_CARDS[1].delay}>
                <span className="ab-num">{NAME_CARDS[1].num}</span>
                <span className="ab-word">{NAME_CARDS[1].word}</span>
                <p>{NAME_CARDS[1].text}</p>
              </PalCard>
            </CardGroup>
          </section>

          {/* 4. how it works */}
          <section className="ab-sec ab-how" id="ab-how" aria-labelledby="ab-how-h">
            <Reveal className="ab-head">
              <span className="ab-tag"><i></i>How it works</span>
              <h2 id="ab-how-h">From your numbers to your next move.</h2>
            </Reveal>
            <CardGroup id="how" className="ab-grid ab-grid-4">
              {HOW_CARDS.map((c, i) => (
                <PalCard key={c.num} group="how" index={i} palette={c.palette} className="ab-card" delay={c.delay}>
                  <span className="ab-num">{c.num}</span>
                  <span className="ab-ico" aria-hidden="true"><Icon name={c.icon} /></span>
                  <h3>{c.title}</h3>
                  <p>{c.text}</p>
                </PalCard>
              ))}
            </CardGroup>
          </section>

          {/* 5. what you can use */}
          <section className="ab-sec" id="ab-products" aria-labelledby="ab-products-h">
            <Reveal className="ab-head">
              <span className="ab-tag"><i></i>What you can use</span>
              <h2 id="ab-products-h">Two tools, one picture.</h2>
              <p>Test a decision, or look at your own money.</p>
            </Reveal>
            <CardGroup id="products" className="ab-grid ab-grid-2">
              {PRODUCT_CARDS.map((c, i) => (
                <PalCard key={c.title} group="products" index={i} palette={c.palette} className="ab-card ab-product-card" delay={c.delay}>
                  <h3>{c.title}</h3>
                  <p>{c.text}</p>
                  <ul className="ab-bullet-list">
                    {c.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  <a className="ab-card-btn" href={i === 0 ? tryHref : financesHref}>
                    {c.btnText}
                  </a>
                </PalCard>
              ))}
            </CardGroup>
          </section>

          {/* 6. ask: example questions */}
          <section className="ab-sec" id="ab-ask" aria-labelledby="ab-ask-h">
            <Reveal className="ab-head">
              <span className="ab-tag"><i></i>Ask anything</span>
              <h2 id="ab-ask-h">The questions you would ask a friend who knows money.</h2>
              <p>Plain answers, with the rupees worked out.</p>
            </Reveal>
            <CardGroup id="ask" className="ab-panel" reveal delay=".05s">
              {ASK_ROWS.map((r, i) => (
                <PalCard key={r.num} as="div" group="ask" index={i} palette={r.palette} className="ab-qa" reveal={false}>
                  <p className="ab-q"><span className="ab-qn">{r.num}</span>{r.q}</p>
                  <p className="ab-a">{r.a}<span className="ab-v">{r.verdict}</span></p>
                </PalCard>
              ))}
            </CardGroup>
            <Reveal as="p" className="ab-cap">Example answers.</Reveal>
          </section>

          {/* 7. privacy */}
          <section className="ab-sec" id="ab-privacy" aria-labelledby="ab-privacy-h">
            <Reveal className="ab-head">
              <span className="ab-tag"><i></i>Privacy</span>
              <h2 id="ab-privacy-h">What happens to your data.</h2>
              <p>Plain facts, so you can decide what to share.</p>
            </Reveal>
            <CardGroup id="privacy" className="ab-grid ab-grid-4">
              {PRIVACY_CARDS.map((c, i) => (
                <PalCard key={c.num} group="privacy" index={i} palette={c.palette} className="ab-card ab-priv-card" delay={c.delay}>
                  <span className="ab-num">{c.num}</span>
                  <h3>{c.title}</h3>
                  <p>{c.text}</p>
                </PalCard>
              ))}
            </CardGroup>
            <Reveal as="p" className="ab-cap">{PRIVACY_CAPTION}</Reveal>
          </section>

          {/* 8. promise + CTA */}
          <section className="ab-sec ab-end" id="ab-end" aria-labelledby="ab-end-h">
            <Reveal className="ab-head">
              <h2 id="ab-end-h">Built to inform, not to replace your CA.</h2>
              <p>A clear second opinion, so you walk into the next conversation better prepared.</p>
            </Reveal>
            <Reveal className="ab-ctas" delay=".06s">
              <a className="ab-btn p" href={tryHref}>Open Decision Engine</a>
              <a className="ab-btn p" href={financesHref}>Open My Finances</a>
              <a className="ab-btn g" href={homeHref}>Back to Home</a>
            </Reveal>
          </section>
        </main>
      </div>
  );
}
