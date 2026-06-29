import { useTranslation } from "react-i18next";

/**
 * The large brand lockup. Split is GO | LuQ (not GoLu | Q) — two physically
 * different materials so the two halves read distinctly:
 *   GO  = carved matte stone
 *   LuQ = liquid iridescent chrome with a "look" scan sweeping across it
 * A pronunciation line (Devanagari + roman) prevents the "Golu-Q / golu kyo"
 * misread and reinforces the meaning: Go = जाओ, LuQ = look / देखो.
 */
export function HeroWordmark({ className = "" }: { className?: string }) {
  const { i18n } = useTranslation();
  const isHi = i18n.language.startsWith("hi");

  return (
    <div className={`select-none ${className}`} role="img" aria-label="GoLuQ — go look">
      <div className="flex items-baseline font-display font-bold leading-none">
        <span className="brand-go">GO</span>
        <span className="brand-luq brand-luq-scan ml-[0.06em]">LuQ</span>
      </div>

      {/* Tagline */}
      <div className="mt-3 font-display text-[0.28em] font-bold uppercase tracking-[0.32em]">
        <span className="text-gradient-accent">
          {isHi ? "देखिए · यकीन कीजिए" : "See it · Believe it"}
        </span>
      </div>
    </div>
  );
}
