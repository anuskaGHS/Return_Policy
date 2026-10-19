import { useEffect, useRef } from 'react';
import { createParticleScenes } from '../../lib/aboutParticles.js';

/** Fixed full-screen canvas behind the About page. `sectionIds` are the ids of the scenes, in order (keep it a constant array). */
export default function ParticleScenes({ sectionIds }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return undefined;
    return createParticleScenes(ref.current, sectionIds);
  }, [sectionIds]);
  return <canvas ref={ref} className="ab-cv" aria-hidden="true" />;
}
