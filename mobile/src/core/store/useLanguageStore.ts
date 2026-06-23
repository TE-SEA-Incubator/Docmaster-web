import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18next, { applyLanguageRTL, type LanguageCode } from '@/i18n/config';

const LANGUAGE_KEY = 'docmaster_language';

type LanguageState = {
  language: LanguageCode;
  hasSelectedLanguage: boolean;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  restoreLanguage: () => Promise<void>;
};

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'fr',
  hasSelectedLanguage: false,

  setLanguage: async (lang: LanguageCode) => {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    await i18next.changeLanguage(lang);
    applyLanguageRTL(lang);
    set({ language: lang, hasSelectedLanguage: true });
  },

  restoreLanguage: async () => {
    try {
      const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (stored && (stored === 'fr' || stored === 'en' || stored === 'ar')) {
        const lang = stored as LanguageCode;
        await i18next.changeLanguage(lang);
        applyLanguageRTL(lang);
        set({ language: lang, hasSelectedLanguage: true });
      } else {
        set({ hasSelectedLanguage: false });
      }
    } catch {
      set({ hasSelectedLanguage: false });
    }
  },
}));
