import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Users, IndianRupee, Boxes, UserCog, GraduationCap, Bot,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * The whole office as one system — the section that shows GoLuQ builds operational
 * software, not only WhatsApp automations.
 *
 * Six modules, cycling. It is deliberately NOT a static feature grid: the point
 * being made is that these connect, so the active module and the line feeding the
 * next one both move. A grid of six boxes says "we have six features"; this says
 * "your office runs end to end".
 *
 * Motion is CSS transform and opacity only — no WebGL, no canvas. On the mid-range
 * Android most of our visitors hold, a heavy 3D scene reads as bad engineering,
 * not good design.
 */
const MODULES: { id: string; icon: LucideIcon; rows: string[] }[] = [
  { id: "leads", icon: Users, rows: ["enquiry", "assigned", "followup"] },
  { id: "sales", icon: IndianRupee, rows: ["quote", "approved", "invoice"] },
  { id: "ops", icon: Boxes, rows: ["job", "stage", "delivered"] },
  { id: "hr", icon: UserCog, rows: ["attendance", "leave", "payroll"] },
  { id: "training", icon: GraduationCap, rows: ["module", "progress", "certified"] },
  { id: "digital", icon: Bot, rows: ["answers", "books", "escalates"] },
];

const CYCLE_MS = 2600;

export function OfficeFlow({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const iv = window.setInterval(() => setActive((i) => (i + 1) % MODULES.length), CYCLE_MS);
    return () => window.clearInterval(iv);
  }, [reduced]);

  const current = MODULES[active];

  return (
    <section className={className} aria-labelledby="office-flow-title">
      <p className="font-mono text-sm uppercase tracking-[0.28em] text-brand-luq">
        {t("officeFlow.kicker")}
      </p>
      <h2
        id="office-flow-title"
        className="mt-2 max-w-3xl text-balance font-display text-2xl font-bold sm:text-4xl"
      >
        <span className="text-gradient-accent">{t("officeFlow.title")}</span>
      </h2>
      <p className="mt-3 max-w-2xl text-base text-muted sm:text-lg">{t("officeFlow.subtitle")}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        {/* The chain. Each module lights in turn, and the connector to the next
            fills — the connection is the message, not the boxes. */}
        <ol className="space-y-2">
          {MODULES.map((m, i) => {
            const on = i === active;
            const Icon = m.icon;
            return (
              <li key={m.id} className="relative">
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                    on
                      ? "border-teal-glow/45 bg-teal-glow/[0.10]"
                      : "border-hairline/12 bg-panel/30 hover:border-hairline/25"
                  }`}
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 transition-colors ${
                      on
                        ? "bg-teal-glow/20 text-brand-luq ring-teal-glow/40"
                        : "bg-panel/60 text-muted ring-hairline/15"
                    }`}
                  >
                    <Icon size={19} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block font-display text-base font-bold ${on ? "text-fg" : "text-muted"}`}>
                      {t(`officeFlow.modules.${m.id}.name`)}
                    </span>
                    <span className="block text-sm text-muted">
                      {t(`officeFlow.modules.${m.id}.desc`)}
                    </span>
                  </span>
                </button>

                {i < MODULES.length - 1 && (
                  <span className="ml-[2.05rem] block h-3 w-px bg-hairline/20">
                    <motion.span
                      className="block w-px bg-brand-luq"
                      initial={{ height: 0 }}
                      animate={{ height: i < active ? "100%" : 0 }}
                      transition={{ duration: 0.4 }}
                    />
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        {/* A screen that actually changes — the same office, seen through
            whichever module is live. */}
        <div className="glass glow-teal rounded-3xl p-4 sm:p-5">
          <div className="flex items-center gap-2 border-b border-hairline/10 pb-3">
            <span className="flex gap-1.5">
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
              ))}
            </span>
            <span className="ml-1 font-mono text-xs text-faint">
              {t("officeFlow.window", { module: t(`officeFlow.modules.${current.id}.name`) })}
            </span>
          </div>

          <motion.div key={current.id} initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="pt-4">
            <div className="space-y-2">
              {current.rows.map((r, i) => (
                <motion.div
                  key={r}
                  initial={reduced ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduced ? 0 : 0.1 + i * 0.12, duration: 0.3 }}
                  className="flex items-center justify-between gap-3 rounded-xl border border-hairline/12 bg-panel/40 px-3.5 py-3"
                >
                  <span className="text-sm text-fg">
                    {t(`officeFlow.modules.${current.id}.rows.${r}`)}
                  </span>
                  <motion.span
                    initial={reduced ? false : { scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: reduced ? 0 : 0.35 + i * 0.12, type: "spring", stiffness: 320 }}
                    className="shrink-0 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-bold text-success ring-1 ring-success/30"
                  >
                    {t("officeFlow.auto")}
                  </motion.span>
                </motion.div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {t(`officeFlow.modules.${current.id}.note`)}
            </p>
          </motion.div>
        </div>
      </div>

      <p className="mt-6 text-base text-muted">{t("officeFlow.footnote")}</p>
    </section>
  );
}
