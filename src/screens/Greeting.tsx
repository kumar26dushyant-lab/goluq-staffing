import { motion, useReducedMotion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HeroWordmark } from "../components/HeroWordmark";
import { StageAssistant } from "../components/StageAssistant";
import { RoleSlots } from "../components/RoleSlots";
import { StatReadout } from "../components/StatReadout";
import { PartnerCTA } from "../components/PartnerCTA";
import { ProductsShowcase } from "../components/ProductsShowcase";
import { HomeBuild } from "../components/HomeBuild";
import type { RoleId } from "../state/useAppState";

/**
 * STEP 1 — Greeting. A cinematic split hero: living brand + punchy command on
 * one side, the rotating holographic core on the other; then the talking
 * assistant, then role deploy-slots beside a live instrument readout.
 */
export function Greeting({ onPickRole }: { onPickRole: (id: RoleId) => void }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-24 pt-2 sm:px-8">
      {/* ── Cinematic hero (over the full-screen reactor background) ──── */}
      <div className="flex min-h-[42vh] flex-col justify-center pt-8 sm:min-h-[48vh]">
        <motion.p
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="font-mono text-xs uppercase tracking-[0.3em] text-muted drop-shadow sm:text-sm"
        >
          {t("greeting.kicker")}
        </motion.p>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-2"
          style={{ filter: "drop-shadow(0 6px 30px rgb(0 0 0 / 0.55))" }}
        >
          <HeroWordmark className="text-[clamp(3.4rem,14vw,9rem)]" />
        </motion.div>

        <motion.h1
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-3xl text-balance text-2xl font-bold leading-snug text-fg sm:text-4xl"
          style={{ textShadow: "0 2px 20px rgb(0 0 0 / 0.6)" }}
        >
          {t("greeting.headline")}{" "}
          <span className="text-luq-glow">{t("greeting.headlineAccent")}</span>
        </motion.h1>
      </div>

      {/* Assistant + reassurance */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-stretch">
        <StageAssistant line={t("greeting.intro")} />
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="glass flex items-start gap-3 rounded-2xl p-5 text-sm text-muted"
        >
          <GraduationCap size={20} className="mt-0.5 shrink-0 text-brand-luq" />
          <p>
            <span className="font-semibold text-fg">
              {t("greeting.reassure").split("—")[0].trim()}
            </span>
            {t("greeting.reassure").includes("—")
              ? " — " + t("greeting.reassure").split("—").slice(1).join("—").trim()
              : ""}
          </p>
        </motion.div>
      </div>

      {/* ── Deploy deck ──────────────────────────────────────────── */}
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div>
          <div className="mb-4 flex items-baseline gap-3">
            <span className="font-mono text-sm uppercase tracking-[0.28em] text-brand-luq sm:text-base">
              {t("greeting.pickPrompt")}
            </span>
            <span className="h-px flex-1 bg-hairline/10" />
          </div>
          <RoleSlots onPick={onPickRole} />
        </div>

        <StatReadout className="lg:sticky lg:top-6" />
      </div>

      <PartnerCTA className="mt-10" />

      {/* Below-the-fold homepage sections */}
      <ProductsShowcase className="mt-20" />
      <HomeBuild className="mt-12" />
    </div>
  );
}
