import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { fr } from "./js/i18n/fr";
import { en } from "./js/i18n/en";
import { ar } from "./js/i18n/ar";

const rawStored = localStorage.getItem("lang");
const validLangs = ["fr", "en", "ar"];
const stored = validLangs.includes(rawStored) ? rawStored : null;
const browserLang = navigator.language?.slice(0, 2);
const defaultLang = stored || (validLangs.includes(browserLang) ? browserLang : "fr");

i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en }, ar: { translation: ar } },
  lng: defaultLang,
  fallbackLng: "fr",
  ns: ["translation"],
  defaultNS: "translation",
  interpolation: { escapeValue: false },
  debug: true, // Log i18next info to console for debugging
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem("lang", lng);
  document.documentElement.lang = lng;
});

export default i18n;
