import de from './locales/de.json';
import en from './locales/en.json';

interface TranslationMap {
  [key: string]: string;
}

const lang = navigator.language.startsWith('de') ? 'de' : 'en';
const translations: TranslationMap = lang === 'de' ? de : en;

export function t(key: string): string {
  return translations[key] || key;
} 