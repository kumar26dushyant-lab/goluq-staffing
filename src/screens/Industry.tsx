import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { INDUSTRIES } from "../content/industries";
import { StageAssistant } from "../components/StageAssistant";
import type { IndustryId } from "../state/useAppState";

/** STEP 2 — Industry. Glass chip grid (distinct from the role deploy-slots). */
export function Industry({ onPick }: { onPick: (id: IndustryId) => void }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();

  return (
    <div className="mx-auto w-full max-w-4xl px-5 pb-24 pt-4 sm:px-8">
      <StageAssistant line={t("assist.industry")} className="mb-7" />

      <h2 className="mb-7 text-balance text-3xl font-bold leading-tight text-fg sm:text-5xl">
        {t("industries.prompt")}
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INDUSTRIES.map((ind, i) => {
          const Icon = ind.icon;
          return (
            <motion.button
              key={ind.id}
              type="button"
              onClick={() => onPick(ind.id)}
              initial={reduced ? false : { opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.08 + i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="glass glass-interactive group flex items-center gap-4 rounded-2xl p-6 text-left"
            >
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-teal-glow/10 text-brand-luq ring-1 ring-teal-glow/20 transition-colors group-hover:bg-teal-glow/20">
                <Icon size={28} strokeWidth={2} />
              </span>
              <span className="font-display text-xl font-semibold leading-snug text-fg">
                {t(`industries.${ind.id}`)}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
