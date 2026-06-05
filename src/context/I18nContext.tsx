import { createContext, useContext } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "../i18n";

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  return (
    <I18nextProvider i18n={i18n}>
      <I18nContext.Provider value={{}}>
        {children}
      </I18nContext.Provider>
    </I18nextProvider>
  );
}

export function useI18n() {
  const { t, i18n: i18nInstance } = useTranslation();
  return {
    lang: i18nInstance.language,
    setLanguage: (code) => i18nInstance.changeLanguage(code),
    t,
  };
}
