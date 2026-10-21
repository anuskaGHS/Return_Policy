// Small line icons used on the Smart Exit page (same shapes as the approved design).
const base = { className: 'ex-i', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' };

export const ClockIcon = () => (
  <svg {...base}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>
);
export const TrendIcon = () => (
  <svg {...base}><path d="M4 17l5-5 4 4 7-8M15 8h5v5" /></svg>
);
export const ShieldIcon = () => (
  <svg {...base}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
);
export const ChevronIcon = () => (
  <svg {...base}><path d="M6 9l6 6 6-6" /></svg>
);
export const InfoIcon = () => (
  <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.5" /></svg>
);
export const WarnIcon = () => (
  <svg {...base}><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.5" /></svg>
);
export const ArrowIcon = () => (
  <svg viewBox="0 0 12 10" aria-hidden="true" focusable="false"><path d="M0.8 5h10M7.1 1.4 10.9 5l-3.8 3.6" /></svg>
);
