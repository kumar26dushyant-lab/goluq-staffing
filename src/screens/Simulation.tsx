import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, CheckCircle2, ArrowRight, RotateCcw, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getScenario, TAG_COLOR, type ScenarioStep } from "../content/scenarios";
import { StageAssistant } from "../components/StageAssistant";
import { RoiScorecard } from "../components/RoiScorecard";
import { Button } from "../components/ui/Button";
import type { RoleId, IndustryId } from "../state/useAppState";

type Phase = "run" | "recap";

/** Pick ~5 representative, human-readable highlights (skip BOOT/SCAN noise). */
function pickHighlights(steps: ScenarioStep[], n = 5): ScenarioStep[] {
  const meaty = steps.filter((s) => !["BOOT", "SCAN", "SUCCESS"].includes(s.tag));
  if (meaty.length <= n) return meaty;
  const out: ScenarioStep[] = [];
  const stride = meaty.length / n;
  for (let i = 0; i < n; i++) out.push(meaty[Math.floor(i * stride)]);
  return out;
}

/**
 * STEP 4 — Live simulation, two-phase:
 *   1) RUN: a fast terminal cascade (~5–7s) — shows raw speed.
 *   2) RECAP: the assistant explains, slowly + readably, exactly what got done
 *      and "in X seconds", with ROI — then a big CTA to booking.
 */
export function Simulation({
  role,
  industry,
  onComplete,
}: {
  role: RoleId;
  industry: IndustryId;
  onComplete: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("hi") ? "hi" : "en";
  const reduced = useReducedMotion();
  const scenario = getScenario(role, industry);

  const [phase, setPhase] = useState<Phase>("run");
  const [shown, setShown] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const logRef = useRef<HTMLOListElement>(null);
  const startedAt = useRef(0);
  const [runKey, setRunKey] = useState(0); // bump to replay

  // Drive the fast cascade
  useEffect(() => {
    setShown(0);
    setPhase("run");
    startedAt.current = performance.now();
    const total = scenario.steps.length;
    let i = 0;
    let timer: number;

    const tick = () => {
      i += 1;
      setShown(i);
      if (i >= total) {
        const secs = (performance.now() - startedAt.current) / 1000;
        setElapsed(secs);
        timer = window.setTimeout(() => setPhase("recap"), 650);
        return;
      }
      const progress = i / total;
      const delay = reduced ? 50 : 230 - progress * 130;
      timer = window.setTimeout(tick, delay);
    };
    timer = window.setTimeout(tick, reduced ? 50 : 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, industry, runKey]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [shown]);

  const steps = scenario.steps.slice(0, shown);
  const highlights = pickHighlights(scenario.steps);

  // ── RECAP ────────────────────────────────────────────────────────────────
  if (phase === "recap") {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 pb-28 pt-6 sm:px-8">
        <StageAssistant
          line={t("assist.recap")}
          also={[scenario.outcome[lang]]}
          className="mb-7"
        />

        {/* "Done in X seconds" */}
        <motion.div
          initial={reduced ? false : { scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 16 }}
          className="glass-bright flex flex-col items-center gap-2 rounded-3xl px-6 py-8 text-center"
        >
          <CheckCircle2 size={56} className="text-success" style={{ filter: "drop-shadow(0 0 18px rgb(var(--c-success) / 0.6))" }} />
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-brand-luq">
            {t("recap.doneIn")} <span className="text-fg">{elapsed.toFixed(1)}</span> {t("recap.seconds")}
          </p>
          <h2 className="text-balance font-display text-2xl font-bold leading-tight text-fg sm:text-4xl">
            {t("recap.heading")}
          </h2>
          <p className="max-w-md text-base text-muted sm:text-lg">{t("recap.subtitle")}</p>
        </motion.div>

        {/* Slow, readable highlight reveal */}
        <ul className="mt-6 space-y-3">
          {highlights.map((s, i) => (
            <motion.li
              key={i}
              initial={reduced ? { opacity: 1 } : { opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: reduced ? 0 : 0.4 + i * 0.7, duration: 0.5 }}
              className="glass flex items-center gap-3.5 rounded-2xl px-5 py-4"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                <Check size={18} strokeWidth={3} />
              </span>
              <span className="text-base font-medium text-fg sm:text-lg">{s[lang].replace(/…$/, "")}</span>
            </motion.li>
          ))}
        </ul>

        {/* Outcome */}
        <motion.p
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduced ? 0 : 0.4 + highlights.length * 0.7 }}
          className="mt-6 text-balance text-center text-lg font-semibold text-luq-glow sm:text-xl"
        >
          {scenario.outcome[lang]}
        </motion.p>

        {/* ROI */}
        <div className="mt-8">
          <RoiScorecard role={role} industry={industry} />
        </div>

        {/* CTAs */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="xl" full onClick={onComplete}>
            {t("recap.continue")} <ArrowRight size={22} />
          </Button>
          <Button variant="secondary" size="lg" onClick={() => setRunKey((k) => k + 1)}>
            <RotateCcw size={18} /> {t("recap.replay")}
          </Button>
        </div>
      </div>
    );
  }

  // ── RUN ──────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 pt-6 sm:px-8">
      <StageAssistant line={t("assist.simRun")} className="mb-6" />

      {/* Bottleneck banner */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 rounded-2xl border border-danger/40 px-5 py-4"
        style={{ background: "rgb(var(--c-danger) / 0.12)" }}
        role="status"
      >
        <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full bg-danger ${reduced ? "" : "animate-pulse"}`} />
        <p className="text-base font-semibold leading-snug text-fg sm:text-lg">{scenario.bottleneck[lang]}</p>
      </motion.div>

      {/* Live log */}
      <div className="relative mt-5">
        <div className="mb-2 flex items-center justify-between font-mono text-xs uppercase tracking-[0.2em] text-faint">
          <span className="flex items-center gap-1.5"><Zap size={13} className="text-brand-luq" /> {ROLE_TAG(role)}</span>
          <span className="text-brand-luq">● live</span>
        </div>

        <ol
          ref={logRef}
          className="glass h-[50vh] max-h-[440px] space-y-2 overflow-y-auto rounded-2xl p-4"
          aria-live="off"
        >
          {steps.map((s, i) => (
            <motion.li
              key={i}
              initial={reduced ? { opacity: 1 } : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 font-mono text-sm sm:text-base"
            >
              <span className={`shrink-0 font-semibold ${TAG_COLOR[s.tag]}`}>[{s.tag}]</span>
              <span className="min-w-0 flex-1 text-fg/90">{s[lang]}</span>
              <Check size={16} className="shrink-0 text-success" strokeWidth={3} />
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function ROLE_TAG(role: RoleId) {
  const map: Record<RoleId, string> = {
    voice: "voice_caller.log",
    support: "support_desk.log",
    sales: "sales_agent.log",
    reception: "front_desk.log",
    workforce: "workforce.log",
  };
  return map[role];
}
