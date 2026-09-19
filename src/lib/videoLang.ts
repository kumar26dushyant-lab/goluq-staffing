import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

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
