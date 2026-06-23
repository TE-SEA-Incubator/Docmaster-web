import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import fr from './locales/fr.json';
import en from './locales/en.json';
import ar from './locales/ar.json';

export const LANGUAGES = {
  fr: { label: 'Français', nativeLabel: 'Français', flag: '🇫🇷', dir: 'ltr' as const },
  en: { label: 'English', nativeLabel: 'English', flag: '🇬🇧', dir: 'ltr' as const },
  ar: { label: 'العربية', nativeLabel: 'العربية', flag: '🇸🇦', dir: 'rtl' as const },
};

export type LanguageCode = keyof typeof LANGUAGES;

// Each top-level key in the locale JSON is registered as its own i18next
// namespace, so screens can use the `t('rendre:title')` style without losing
// keys to the global fallback. Keys that aren't present in a given bundle
// fall back to the same key in another locale (i18next `fallbackLng: 'fr'`).
export const NAMESPACES = [
  'common',
  'language',
  'splash',
  'onboarding',
  'auth',
  'forgotPassword',
  'home',
  'navbar',
  'documents',
  'devices',
  'profile',
  'wallet',
  'card',
  'declarations',
  'search',
  'rechercher',
  'trouver',
  'declarer',
  'recuperer',
  'rendre',
  'parrainage',
  'subscription',
  'report',
  'gains',
  'notifications',
  'banners',
  'plusSheet',
];

function buildResources(bundle: Record<string, any>) {
  return NAMESPACES.reduce<Record<string, any>>((acc, ns) => {
    acc[ns] = bundle[ns] || {};
    return acc;
  }, {});
}

i18next.use(initReactI18next).init({
  resources: {
    fr: buildResources(fr),
    en: buildResources(en),
    ar: buildResources(ar),
  },
  ns: NAMESPACES,
  defaultNS: 'common',
  lng: 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export function applyLanguageRTL(lang: LanguageCode) {
  const dir = LANGUAGES[lang].dir;
  if ((dir === 'rtl') !== I18nManager.isRTL) {
    I18nManager.forceRTL(dir === 'rtl');
    I18nManager.allowRTL(dir === 'rtl');
  }
}

export default i18next;