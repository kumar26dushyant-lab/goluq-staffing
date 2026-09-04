import { useTranslation } from "react-i18next";

/**
 * EN / हिन्दी segmented toggle. Persists via i18next localStorage detector.
 * Switching re-localizes the whole app live (including in-flight sim labels).
 */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith("hi") ? "hi" : "en";

  const set = (l: "en" | "hi") => l !== lang && i18n.changeLanguage(l);

  const other = lang === "en" ? "hi" : "en";

  return (
    <>
      {/* Phones: one button showing the language you would switch TO. Two pills
          cost roughly 95px in a row that had none to spare. */}
      <button
        type="button"
        onClick={() => set(other)}
        aria-label={other === "hi" ? "हिन्दी में बदलें" : "Switch to English"}
        className={`glass glass-interactive rounded-full px-3 py-2 text-sm font-semibold text-muted sm:hidden ${
          other === "hi" ? "font-deva" : ""
        } ${className}`}
      >
        {other === "en" ? "EN" : "हिन्दी"}
      </button>

      <div
        className={`glass hidden items-center rounded-full p-1 text-sm font-semibold sm:flex ${className}`}
        role="group"
        aria-label="Language"
      >
        {(["en", "hi"] as const).map((l) => {
          const active = l === lang;
          return (
            <button
              key={l}
              type="button"
              onClick={() => set(l)}
              aria-pressed={active}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                active ? "bg-teal-glow/20 text-brand-luq" : "text-muted hover:text-fg"
              } ${l === "hi" ? "font-deva" : ""}`}
            >
              {l === "en" ? "EN" : "हिन्दी"}
            </button>
          );
        })}
      </div>
    </>
  );
}
