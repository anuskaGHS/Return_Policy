import { useRef } from 'react';
import GlobeHero from './GlobeHero.jsx';
import '../../styles/home-hero.css';

/**
 * Home page hero: globe background, headline, subtitle and two buttons.
 * Defaults match the hash links used by the app; pass onEngineClick / onAboutClick
 * if navigation goes through app state instead.
 */
export default function HomeHero({
  engineHref = '#calculator',
  aboutHref = '#about',
  onEngineClick,
  onAboutClick,
}) {
  const textRef = useRef(null);
  return (
    <section className="rp-hero" id="home-hero">
      <div
        className="rp-hero__visual"
        role="img"
        aria-label="A dot-matrix globe turned toward India, with glowing arcs linking Indian cities and a satellite orbiting the planet"
      >
        <GlobeHero textRef={textRef} theme="violet" />
      </div>
      <div className="rp-hero__inner" ref={textRef}>
        <h1 className="rp-hero__title">
          <span className="rp-hero__line"><span className="rp-hero__line-i">Is your household's money</span></span>{' '}
          <span className="rp-hero__line"><span className="rp-hero__line-i">working for you?</span></span>
        </h1>
        <p className="rp-hero__sub">
          A decision engine for Indian households: SIPs, loans, insurance and tax, explained in plain language, in English or Hindi.
        </p>
        <div className="rp-hero__ctas">
          <a className="rp-btn rp-btn--primary" href={engineHref} onClick={onEngineClick}>Open Decision Engine</a>
          <a className="rp-btn rp-btn--ghost" href={aboutHref} onClick={onAboutClick}>How it works</a>
        </div>
      </div>
    </section>
  );
}
