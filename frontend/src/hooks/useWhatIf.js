import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_INPUTS, PRESETS, derive, sameAs } from '../lib/whatif/healthScore.js';

// All state for the What-if page.
//   initialProfile: optional partial of the eight inputs (for example values read from an uploaded
//   document later). It overrides the defaults, and "Reset default" returns to it.
export default function useWhatIf(initialProfile) {
  const start = useMemo(() => ({ ...DEFAULT_INPUTS, ...(initialProfile || {}) }), [initialProfile]);
  const [inputs, setInputs] = useState(start);
  const [dismissed, setDismissed] = useState(null); // preset chip the user closed with the x

  const base = useMemo(() => derive(start), [start]);
  const d = useMemo(() => derive(inputs), [inputs]);

  const activePreset = useMemo(() => {
    let active = null;
    PRESETS.forEach((p) => {
      if (p.name !== dismissed && sameAs(p.values, inputs)) active = p.name;
    });
    return active;
  }, [inputs, dismissed]);

  const setField = useCallback((field, value) => {
    setDismissed(null);
    setInputs((prev) => ({ ...prev, [field]: value }));
  }, []);

  const applyPreset = useCallback((name) => {
    const p = PRESETS.find((x) => x.name === name);
    if (!p) return;
    setDismissed(null);
    setInputs({ ...p.values });
  }, []);

  const dismissPreset = useCallback((name) => setDismissed(name), []);

  const reset = useCallback(() => {
    setDismissed(null);
    setInputs({ ...start });
  }, [start]);

  return { inputs, d, base, activePreset, setField, applyPreset, dismissPreset, reset };
}
