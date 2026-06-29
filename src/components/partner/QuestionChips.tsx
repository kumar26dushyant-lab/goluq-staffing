import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { KineticText } from "../KineticText";

const QKEYS = ["earn", "paid", "tech", "find", "fee", "track"] as const;

/**
 * Curated, tappable question-chips with crafted answers (zero hallucination —
 * a free-form fallback is a deliberate phase-2 seam). After any answer the bot
 * nudges toward registration.
 */
export function QuestionChips({ onRegister }: { onRegister: () => void }) {
  const { t } = useTranslation();
  const [active, setActive] = useState<(typeof QKEYS)[number] | null>(null);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {QKEYS.map((k) => {
          const on = k === active;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setActive(k)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                on
                  ? "bg-teal-glow/20 text-brand-luq ring-1 ring-teal-glow/40"
                  : "glass text-muted hover:text-fg"
              }`}
            >
              <HelpCircle size={14} className="text-brand-luq" />
              {t(`partner.questions.${k}.q`)}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-bright mt-4 rounded-2xl p-5"
          >
            <KineticText
              key={active}
              text={t(`partner.questions.${active}.a`)}
              className="text-[0.95rem] font-medium leading-relaxed text-fg"
            />
            <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">{t("partner.calc.ask")}</p>
              <button
                type="button"
                onClick={onRegister}
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-teal-glow/15 px-4 py-2 text-sm font-semibold text-brand-luq ring-1 ring-teal-glow/30"
              >
                {t("partner.guideRegister")} <ArrowRight size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
