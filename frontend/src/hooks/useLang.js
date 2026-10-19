import { createContext, useCallback, useContext } from 'react';
import { tr } from '../lib/whatif/i18n.js';

// The What-if page language ('en' or 'hi'), shared with every card through context.
export const LangContext = createContext('en');

export function useLang() {
  return useContext(LangContext);
}

// t('English text') -> the text in the current language.
export function useT() {
  const lang = useContext(LangContext);
  return useCallback((s) => tr(lang, s), [lang]);
}
