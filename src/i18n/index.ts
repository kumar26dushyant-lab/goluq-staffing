import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./en.json";
import hi from "./hi.json";

export const SUPPORTED = ["en", "hi"] as const;
export type Lang = (typeof SUPPORTED)[number];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
    },
    fallbackLng: "en",
    supportedLngs: SUPPORTED as unknown as string[],
    // Detector order: localStorage → browser → fallback. Persist on change.
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "goluq_lang",
      caches: ["localStorage"],
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  });

// Keep <html lang> in sync so :lang(hi) Devanagari styling + a11y work.
const applyHtmlLang = (lng: string) => {
  document.documentElement.setAttribute("lang", lng.startsWith("hi") ? "hi" : "en");
};
applyHtmlLang(i18n.language);
i18n.on("languageChanged", applyHtmlLang);

export default i18n;
