import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSiteConfig } from "./siteConfig";

/**
 * Accent. English comes in two voices: Indian English for India and the
 * Gulf (where most of the owners we reach are Indian traders), and
 * international English elsewhere. Chosen by the visitor's country, never
 * asked. A film only switches to the Indian cut once that cut exists on
 * the server (ACCENT_READY), so nothing 404s while the re-render runs.
 */
const INDIAN_ACCENT = new Set(["IN", "AE", "SA", "QA", "KW", "OM", "BH", "JO"]);
/** Media stems whose Indian-English cut (`<stem>-enin.mp4`) has been uploaded. */
const ACCENT_READY = new Set<string>(["house", "aioshort", "five", "pharm", "aiostory", "boss", "where", "signed", "roles", "ceo-coach", "ceo-dist", "ceo-ca", "ceo-adv", "ceo-cap", "security-in", "reel-coaching", "reel-distributor", "reel-ca", "reel-garment", "reel-claims", "reel-ceo"]);

export type FilmSuffix = "hi" | "en" | "enin";
export function accentFor(country: string | undefined | null): "in" | "intl" {
  return INDIAN_ACCENT.has(String(country || "").toUpperCase()) ? "in" : "intl";
}
/** The suffix for one film: Hindi, Indian English if ready and wanted, else international English. */
export function filmSuffix(stem: string, lang: VideoLang, accent: "in" | "intl"): FilmSuffix {
  if (lang === "hi") return "hi";
  return accent === "in" && ACCENT_READY.has(stem) ? "enin" : "en";
}

/**
 * The language a visitor wants to HEAR, which is not always the language
 * they read. Every film on the site exists in English and Hindi; the player
 * follows the site language until the visitor picks the other one on any
 * player, and that choice then holds for every film, everywhere, until the
 * site language itself changes.
 */
const KEY = "goluq_video_lang";
export type VideoLang = "en" | "hi";
const EVT = "goluq:videolang";

const siteLang = (l: string): VideoLang => (l.startsWith("hi") ? "hi" : "en");

function read(fallback: VideoLang): VideoLang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "en" || v === "hi") return v;
  } catch { /* storage blocked */ }
  return fallback;
}

export function useVideoLang(): [VideoLang, (l: VideoLang) => void, VideoLang] {
  const { i18n } = useTranslation();
  const site = siteLang(i18n.language);
  const [lang, setLangState] = useState<VideoLang>(() => read(site));

  // A change of site language resets the override: the visitor just told us.
  useEffect(() => {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    setLangState(site);
    window.dispatchEvent(new CustomEvent(EVT));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site]);

  // Every player on the page follows the same choice.
  useEffect(() => {
    const on = () => setLangState(read(site));
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, [site]);

  const setLang = useCallback((l: VideoLang) => {
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
    setLangState(l);
    window.dispatchEvent(new CustomEvent(EVT));
  }, []);

  return [lang, setLang, site];
}

/** The film language plus the suffix picker, for players. */
export function useFilm(): { lang: VideoLang; setLang: (l: VideoLang) => void; sfx: (stem: string) => FilmSuffix } {
  const [lang, setLang] = useVideoLang();
  const cfg = useSiteConfig();
  const accent = accentFor(cfg?.country);
  return { lang, setLang, sfx: (stem) => filmSuffix(stem, lang, accent) };
}
