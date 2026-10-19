import { PALETTES } from '../../data/homeFeatures.jsx';
import { GLOW } from '../../data/aboutContent.jsx';
import { useReveal } from './Reveal.jsx';

/**
 * Coloured cards and card groups for the About page.
 * Cards display palette colours from PALETTES and elevate with a glow on hover.
 */

/** Colours come from PALETTES (Home ring) so About always matches Home. GLOW is the halo colour per palette. */
function paletteVars(name) {
  const p = PALETTES[name];
  return {
    '--pbg': p.bg, '--text': p.ink, '--soft': p.soft, '--muted': p.muted, '--accent': p.accent, '--risk': p.risk,
    '--chip': p.chip, '--line': p.line, '--card-edge': p.edge, '--tagbg': p.tagbg, '--tagtx': p.tagtx, '--g': GLOW[name],
  };
}

/** Wrapper whose direct children are PalCards. */
export function CardGroup({ id, as: Tag = 'div', className = '', reveal = false, delay, children }) {
  const [ref, cls] = useReveal();
  const style = delay ? { '--d': delay } : undefined;
  return (
    <Tag
      ref={ref}
      className={`${className}${reveal ? ` ab-rv ${cls}` : ''}`.trim()}
      style={style}
    >
      {children}
    </Tag>
  );
}

export function PalCard({ group, index, palette, as: Tag = 'article', reveal = true, delay, className = '', children }) {
  const [ref, cls] = useReveal();
  const style = { ...paletteVars(palette), ...(delay ? { '--d': delay } : null) };
  return (
    <Tag
      ref={ref}
      className={`${className} pal${reveal ? ` ab-rv ${cls}` : ''}`.trim()}
      style={style}
    >
      {children}
    </Tag>
  );
}
