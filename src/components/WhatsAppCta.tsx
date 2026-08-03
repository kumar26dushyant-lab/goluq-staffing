import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchPublicConfig } from "../lib/lead";

/**
 * "Just talk to a person" escape hatch.
 *
 * Plenty of visitors will never fill a form or open a chat — they want to send a
 * WhatsApp message and get on with their day. On mobile (which is nearly all the
 * traffic) that is the single lowest-friction conversion on the page.
 *
 * The number is NOT hardcoded: it comes from the `public_whatsapp` admin setting
 * via /api/config, so it can be changed or pulled without a deploy. If it isn't
 * set, this renders nothing at all.
 */
export function WhatsAppCta({
  className = "",
  variant = "inline",
}: {
  className?: string;
  variant?: "inline" | "fab";
}) {
  const { t } = useTranslation();
  const [wa, setWa] = useState("");

  useEffect(() => {
    fetchPublicConfig().then((c) => setWa(c.whatsapp || ""));
  }, []);

  if (!wa) return null;

  const digits = wa.replace(/\D/g, "");
  const href = `https://wa.me/${digits}?text=${encodeURIComponent(t("whatsapp.prefill"))}`;
  // Hyphen, not a space: "+91 8349504400" renders with an awkward gap in the
  // mono face and reads as two separate numbers.
  const pretty = digits.length === 12 ? `+${digits.slice(0, 2)}-${digits.slice(2)}` : `+${digits}`;

  if (variant === "fab") {
    return (
      <motion.a
        href={href}
        target="_blank"
        rel="noreferrer"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        aria-label={t("whatsapp.aria")}
        className={`fixed z-50 grid h-14 w-14 place-items-center rounded-full text-white shadow-glass ${className}`}
        style={{
          background: "#25D366",
          // Sits above the chat launcher, which owns the bottom-right corner.
          bottom: "calc(max(1.25rem, env(safe-area-inset-bottom)) + 4.5rem)",
          right: "max(1.25rem, env(safe-area-inset-right))",
        }}
      >
        <MessageCircle size={26} />
      </motion.a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`glass glass-interactive flex items-center gap-3 rounded-2xl p-4 ${className}`}
    >
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white"
        style={{ background: "#25D366" }}
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
