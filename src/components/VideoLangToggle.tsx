import { Languages } from "lucide-react";
import type { VideoLang } from "../lib/videoLang";

/**
 * One chip on every player: hear the film in the other language without
 * changing the language of the page. Reads as an invitation in the language
 * it switches TO, so a Hindi speaker on an English page sees Hindi.
 */
export function VideoLangToggle({ lang, onChange, dark = true, className = "" }: { lang: VideoLang; onChange: (l: VideoLang) => void; dark?: boolean; className?: string }) {
  const other: VideoLang = lang === "hi" ? "en" : "hi";
  const label = other === "hi" ? "हिंदी में सुनिए" : "Hear it in English";
  return (
    <button
      type="button"
      onClick={() => onChange(other)}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${dark ? "bg-white/12 text-white ring-1 ring-white/25 hover:bg-white/20" : "bg-fg/8 text-fg ring-1 ring-hairline/30 hover:bg-fg/12"} ${className}`}
      aria-label={label}
      title={label}
    >
      <Languages size={14} /> {label}
    </button>
  );
}
