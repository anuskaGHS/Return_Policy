import useExplainerText from '../../hooks/useExplainerText.js';
import { WarnIcon } from './icons.jsx';

export default function Disclaimer() {
  const { L } = useExplainerText();
  return (
    <div className="rx-disc">
      <WarnIcon />
      <p>
        {L(
          'These events happened at the same time as the gap. They may not be its only cause. The sector figures are approximate. Return Policy is informational and not SEBI-registered advice.',
          'ये घटनाएँ अंतर के साथ-साथ हुईं। हो सकता है यही उसका एकमात्र कारण न हों। सेक्टर के आँकड़े अनुमानित हैं। Return Policy सिर्फ़ जानकारी के लिए है, SEBI-पंजीकृत सलाह नहीं।',
        )}
      </p>
    </div>
  );
}
