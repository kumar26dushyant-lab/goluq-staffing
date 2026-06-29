import { motion, useReducedMotion } from "framer-motion";
import { User, Sparkles, TrendingDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getScenario } from "../content/scenarios";
import type { RoleId, IndustryId } from "../state/useAppState";

/** STEP 5 — ROI scorecard: human vs Digital Employee, with a cost-saved ribbon. */
export function RoiScorecard({ role, industry }: { role: RoleId; industry: IndustryId }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("hi") ? "hi" : "en";
  const reduced = useReducedMotion();
  const { roi } = getScenario(role, industry);

  return (
    <div>
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.28em] text-brand-luq">
        {t("booking.scoreKicker")}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Human */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass rounded-2xl p-5"
        >
          <div className="mb-3 flex items-center gap-2.5 text-muted">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-hairline/10">
              <User size={18} />
            </span>
            <span className="font-display text-sm font-semibold">{t("booking.humanLabel")}</span>
          </div>
          <p className="text-lg font-medium leading-snug text-fg">{roi.humanOutput[lang]}</p>
        </motion.div>

        {/* Digital */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5 }}
          className="glass-bright rounded-2xl p-5"
        >
          <div className="mb-3 flex items-center gap-2.5 text-brand-luq">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-teal-glow/15">
              <Sparkles size={18} />
            </span>
            <span className="font-display text-sm font-semibold">{t("booking.digitalLabel")}</span>
          </div>
          <p className="text-lg font-semibold leading-snug text-fg">{roi.digitalOutput[lang]}</p>
        </motion.div>
      </div>

      {/* Cost-saved ribbon */}
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.16, duration: 0.5 }}
        className="mt-4 flex items-center justify-center gap-2.5 rounded-2xl border border-success/35 px-5 py-3.5 text-center font-display text-lg font-bold text-fg"
        style={{ background: "rgb(var(--c-success) / 0.12)" }}
      >
        <TrendingDown size={20} className="text-success" />
        {t("booking.costSaved", { x: roi.costSaved })}
      </motion.div>
    </div>
  );
}
