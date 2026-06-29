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

      {/* Pronunciation / meaning guide */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-deva text-[0.32em] font-medium text-muted">
        <span>
          <span className="text-fg">गो</span>
          <span className="text-luq-glow">·लुक़</span>
        </span>
        <span className="text-faint">·</span>
        <span className="font-sans uppercase tracking-[0.25em] text-faint">
          {isHi ? "“गो लुक” — देखिए, यकीन कीजिए" : "“go-look” — see it, believe it"}
        </span>
      </div>
    </div>
  );
}
