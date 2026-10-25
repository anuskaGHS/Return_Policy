import { useCallback } from 'react';
import { useLang } from './useLang.js';

// L('English', 'हिन्दी') -> the text for the page language.
export default function useExplainerText() {
  const lang = useLang();
  const hi = lang === 'hi';
  const L = useCallback((en, hindi) => (hi ? hindi : en), [hi]);
  return { L, lang: hi ? 'hi' : 'en', hi };
}
