import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { GoLuqButton } from "../components/GoLuqButton";
import { StageAssistant } from "../components/StageAssistant";
import { ROLES } from "../content/roles";
import { INDUSTRIES } from "../content/industries";
import type { RoleId, IndustryId } from "../state/useAppState";

/** STEP 3 — Launch. Confirms the armed worker + industry, reveals the Go Luq CTA. */
export function Launch({
  role,
  industry,
  onLaunch,
}: {
  role: RoleId;
  industry: IndustryId;
  onLaunch: () => void;
}) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const RoleIcon = ROLES.find((r) => r.id === role)?.icon;
  const IndIcon = INDUSTRIES.find((i) => i.id === industry)?.icon;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 pt-4 sm:px-8">
      <StageAssistant line={t("assist.launch")} className="mb-10" />

      <div className="flex flex-col items-center text-center">
        <motion.span
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-mono text-sm uppercase tracking-[0.3em] text-faint"
        >
          {t("launch.ready")}
        </motion.span>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-5 flex flex-wrap items-center justify-center gap-3"
        >
          <span className="glass flex items-center gap-2.5 rounded-full px-5 py-3 text-base font-semibold text-fg sm:text-lg">
            {RoleIcon && <RoleIcon size={20} className="text-brand-luq" />}
            {t(`roles.${role}.label`)}
          </span>
          <span className="text-xl text-faint">×</span>
          <span className="glass flex items-center gap-2.5 rounded-full px-5 py-3 text-base font-semibold text-fg sm:text-lg">
            {IndIcon && <IndIcon size={20} className="text-brand-luq" />}
            {t(`industries.${industry}`)}
          </span>
        </motion.div>

        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-14"
        >
          <GoLuqButton onClick={onLaunch} className="scale-125" />
        </motion.div>

        <p className="mt-10 text-base text-muted sm:text-lg">{t("launch.helper")}</p>
      </div>
    </div>
  );
}
