import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSiteConfig } from "../lib/siteConfig";

/** Brand green — WhatsApp is instantly recognisable, so don't restyle it. */
const WA_GREEN = "#25D366";

export type WaVariant = "inline" | "fab" | "bar" | "chip";

/** "+91-8349504400" — hyphen, not a space: a gap reads as two numbers. */
export function prettyWa(digits: string): string {
  return digits.length === 12 ? `+${digits.slice(0, 2)}-${digits.slice(2)}` : `+${digits}`;
}

/**
 * One-tap WhatsApp to a real person.
 *
 * On a phone this is the highest-converting contact route on the site: no form,
 * no waiting, and it lands in the owner's pocket instantly — unlike the lead
 * form, which sits in the cockpit until someone looks.
 *
 * The number is NOT hardcoded. It comes from the `public_whatsapp` admin
 * setting via /api/config, so it can be changed or pulled without a deploy —
 * and if it is unset this renders nothing at all rather than a dead link.
 *
 * `context` tailors the prefilled message so the owner can see where the person
 * was on the site before they wrote.
 */
export function WhatsAppCta({
  className = "",
  variant = "inline",
  context = "general",
}: {
  className?: string;
  variant?: WaVariant;
  context?: "general" | "build" | "chat" | "pricing";
}) {
  const { t } = useTranslation();
  const cfg = useSiteConfig();
  const wa = cfg?.whatsapp || "";

  if (!wa) return null;

  const digits = wa.replace(/\D/g, "");
  const href = `https://wa.me/${digits}?text=${encodeURIComponent(
    t(`whatsapp.prefill_${context}`, { defaultValue: t("whatsapp.prefill") })
  )}`;
  const pretty = prettyWa(digits);

  // ── Floating action button — sits above the chat launcher, never on top of it.
  if (variant === "fab") {
    return (
      <motion.a
        href={href}
        target="_blank"
        rel="noreferrer"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        aria-label={t("whatsapp.aria")}
        className={`fixed z-40 grid h-14 w-14 place-items-center rounded-full text-white shadow-glass ${className}`}
        style={{
          background: WA_GREEN,
          bottom: "calc(max(1.25rem, env(safe-area-inset-bottom)) + 4.75rem)",
          right: "max(1.25rem, env(safe-area-inset-right))",
        }}
      >
        <MessageCircle size={26} />
      </motion.a>
    );
  }

  // ── Compact chip for the header — shows the number itself, because a bare
  //    icon doesn't tell anyone there's a human on the other end.
  if (variant === "chip") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={t("whatsapp.aria")}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-white ${className}`}
        style={{ background: WA_GREEN }}
      >
        <MessageCircle size={16} />
        <span className="hidden font-mono xl:inline">{pretty}</span>
      </a>
    );
  }

  // ── Full-width bar, for the end of a page or inside the chat panel.
  if (variant === "bar") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={`flex w-full items-center justify-center gap-2.5 rounded-full px-5 py-3.5 text-base font-bold text-white ${className}`}
        style={{ background: WA_GREEN }}
      >
        <MessageCircle size={19} />
        {t("whatsapp.talkNow")}
        <span className="font-mono text-sm opacity-90">{pretty}</span>
      </a>
    );
  }

  // ── Default card.
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`glass glass-interactive flex items-center gap-3 rounded-2xl p-4 ${className}`}
    >
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white"
        style={{ background: WA_GREEN }}
      >
        <MessageCircle size={22} />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-base font-bold text-fg">
          {t("whatsapp.title")}
        </span>
        <span className="block text-sm text-muted">
          {t("whatsapp.subtitle")} · <span className="font-mono text-brand-luq">{pretty}</span>
        </span>
      </span>
    </a>
  );
}
