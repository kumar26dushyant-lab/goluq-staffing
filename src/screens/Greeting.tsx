import { motion, useReducedMotion } from "framer-motion";
import { GraduationCap, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CapabilityTabs } from "../components/CapabilityTabs";
import { ENTRY_PRICE_INR } from "../content/catalogue";
import { usePricing, useMoney } from "../lib/siteConfig";
import { HeroWordmark } from "../components/HeroWordmark";
import { StageAssistant } from "../components/StageAssistant";
import { RoleSlots } from "../components/RoleSlots";
import { StatReadout } from "../components/StatReadout";
import { PartnerCTA } from "../components/PartnerCTA";
import { ProofStrip } from "../components/ProofStrip";
import { WhatsAppCta } from "../components/WhatsAppCta";
import { CaseStudyNidaan } from "../components/CaseStudyNidaan";
import { ProductsShowcase } from "../components/ProductsShowcase";
import { HomeServices } from "../components/HomeServices";
import { HomeBuild } from "../components/HomeBuild";
import { SecuritySection } from "../components/SecuritySection";
import { AboutSection } from "../components/AboutSection";
import type { RoleId } from "../state/useAppState";

/**
 * STEP 1 — Greeting. A cinematic split hero: living brand + punchy command on
 * one side, the rotating holographic core on the other; then the talking
 * assistant, then role deploy-slots beside a live instrument readout.
 */
export function Greeting({ onPickRole }: { onPickRole: (id: RoleId) => void }) {
  const money = useMoney();
  const pricing = usePricing();
  // Cheapest one-off thing we sell, in this visitor's money. Falls back to the
  // bundled rupee figure only if the live list is unavailable.
  const oneOff = pricing.filter((p) => !p.recurring).map((p) => p.from);
  const entryPrice = oneOff.length ? Math.min(...oneOff) : ENTRY_PRICE_INR;
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
          <span className="text-gradient-accent">{t("greeting.headlineAccent")}</span>
        </motion.h1>

        {/* Instant-value hook — the cheapest rung of the ladder, stated in money
            and hours, so a visitor knows within one line that they can afford us. */}
        <motion.p
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.6 }}
          className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold text-fg sm:text-lg"
          style={{ textShadow: "0 2px 16px rgb(0 0 0 / 0.6)" }}
        >
          <Zap size={18} className="shrink-0 text-brand-luq" />
          {t("catalogue.hook")}
          <span className="text-brand-luq">
            {t("catalogue.hookPrice", { p: money(entryPrice) })}
          </span>
        </motion.p>
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

      {/* Proof, high — before the visitor commits a minute to the demo funnel. */}
      <ProofStrip className="mt-5" />

      {/* Lowest-friction conversion on the page — no form, no chat, just talk. */}
      <WhatsAppCta className="mt-4" />

      {/* What GoLuQ actually is. Digital Employees are one tab of seven; that
          tab jumps to the live demo deck below rather than opening a new page. */}
      <CapabilityTabs
        className="mt-14"
        onPickDemo={() =>
          document.getElementById("deploy-deck")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      />

      {/* ── Deploy deck ──────────────────────────────────────────── */}
      <div
        id="deploy-deck"
        className="mt-16 grid scroll-mt-20 gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start"
      >
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

      {/* Below-the-fold: proof first, then the affiliate and cross-sell asks. */}
      <div id="proof" className="scroll-mt-20">
        <ProductsShowcase className="mt-20" />
        <CaseStudyNidaan className="mt-16" compact />
      </div>

      <PartnerCTA className="mt-16" />
      <HomeBuild className="mt-12" />
      <HomeServices className="mt-12" />
      <SecuritySection className="mt-16" />
      <AboutSection className="mt-16" />
    </div>
  );
}
