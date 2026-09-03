import { useEffect, useState } from "react";
import { Globe2, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteConfig } from "../lib/siteConfig";

/** Markets we price for. Everything else falls through to "International". */
const COUNTRIES: { code: string; flag: string; label: string }[] = [
  { code: "IN", flag: "🇮🇳", label: "India" },
  { code: "AE", flag: "🇦🇪", label: "UAE" },
  { code: "SA", flag: "🇸🇦", label: "Saudi Arabia" },
  { code: "GB", flag: "🇬🇧", label: "United Kingdom" },
  { code: "US", flag: "🇺🇸", label: "United States" },
  { code: "CA", flag: "🇨🇦", label: "Canada" },
  { code: "AU", flag: "🇦🇺", label: "Australia" },
  { code: "SG", flag: "🇸🇬", label: "Singapore" },
  { code: "DE", flag: "🇪🇺", label: "Europe" },
  { code: "BD", flag: "🌏", label: "South Asia" },
];

export const COUNTRY_KEY = "goluq_country";

/**
 * Let a visitor see the site as another country sees it.
 *
 * Geography already decides currency and language from the edge, which is right
 * for the 99% who never think about it. This is for the rest: someone in Indore
 * quoting a client in Dubai, or a visitor whose network resolves to the wrong
 * country. Without it they see AED prices with no way back to rupees, which
 * looks broken rather than clever.
 *
 * The choice is stored and sent as a header on the next config fetch, so the
 * SERVER re-prices — the browser never converts anything itself. That is what
 * keeps the page and the guide quoting the same number.
 */
export function CountryPicker({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const cfg = useSiteConfig();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string>(() => {
    try {
      return localStorage.getItem(COUNTRY_KEY) || "";
    } catch {
      return "";
    }
  });

  // Close on Escape — a dropdown that can only be dismissed by clicking exactly
  // the right thing is a dropdown people get stuck in.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const active = chosen || cfg?.market?.country || cfg?.country || "IN";
  const current = COUNTRIES.find((c) => c.code === active);
  const currency = cfg?.market?.currency ?? "INR";

  const choose = (code: string) => {
    try {
      localStorage.setItem(COUNTRY_KEY, code);
    } catch {
      /* private mode — the reload below still applies it for this visit */
    }
    setChosen(code);
    setOpen(false);
    // Prices are resolved server-side, so a reload is the honest way to apply
    // them everywhere at once rather than leaving half the page in the old
    // currency.
    window.location.reload();
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="glass glass-interactive inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-muted hover:text-fg"
      >
        <Globe2 size={15} className="shrink-0 text-brand-luq" />
        <span>{current ? current.flag : "🌏"}</span>
        <span className="hidden sm:inline">{currency}</span>
      </button>

      {open && (
        <>
          {/* Full-screen catcher so a tap anywhere closes it on a phone. */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <ul
            role="listbox"
            aria-label={t("country.aria")}
            className="glass absolute right-0 z-50 mt-2 max-h-[60vh] w-56 overflow-y-auto rounded-2xl p-1.5 shadow-glass"
          >
            <li className="px-3 py-2 text-xs text-faint">{t("country.title")}</li>
            {COUNTRIES.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.code === active}
                  onClick={() => choose(c.code)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm ${
                    c.code === active ? "bg-teal-glow/15 text-brand-luq" : "text-muted hover:text-fg"
                  }`}
                >
                  <span>{c.flag}</span>
                  <span className="flex-1">{c.label}</span>
                  {c.code === active && <Check size={14} className="shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
