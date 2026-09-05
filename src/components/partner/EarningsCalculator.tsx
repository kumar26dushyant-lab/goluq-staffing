import { useEffect, useState } from "react";
import { motion, useSpring, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSiteConfig, usePricing, useMoney } from "../../lib/siteConfig";
import { RATE_YEAR1 } from "../../content/affiliateConfig";
import { formatINR } from "../../lib/format";

function AnimatedINR({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const spring = useSpring(value, { stiffness: 90, damping: 20 });
  const [disp, setDisp] = useState(formatINR(value));

  useEffect(() => {
    if (reduced) {
      setDisp(formatINR(value));
      return;
    }
    spring.set(value);
  }, [value, spring, reduced]);

  useEffect(() => spring.on("change", (v) => setDisp(formatINR(v))), [spring]);

  return <span>{reduced ? formatINR(value) : disp}</span>;
}

/**
 * Pick the kind of project you would introduce, and how many a year.
 *
 * This used to pick a monthly PLAN and multiply by twelve, which described a
 * subscription business GoLuQ does not run — it promised a partner money every
 * month for work that is paid for once. It now prices what actually happens: a
 * project is delivered, the customer pays, the partner earns a share of it.
 *
 * Projects come from the live catalogue, so the figures a partner is shown can
 * never drift from what the business actually charges.
 */
export function EarningsCalculator() {
  const { t } = useTranslation();
  const [n, setN] = useState(4);

  // Live rate, so a cockpit change reaches this without a deploy.
  const cfg = useSiteConfig();
  const rate = cfg?.affiliate?.year1 ?? RATE_YEAR1;

  // One-off builds only — nobody refers a toll-free number for commission, and
  // a monthly plan is not what this model pays on.
  const projects = usePricing().filter((p) => !p.recurring && p.category !== "comms");
  const [projectId, setProjectId] = useState("");
  const project = projects.find((p) => p.id === projectId) ?? projects[0];
  const price = project?.from ?? 0;

  const perProject = price * rate;
  const perYear = perProject * n;

  const cards = [
    { label: t("partner.calc.perProject"), value: perProject, bright: true },
    { label: t("partner.calc.perYear", { n }), value: perYear, bright: true },
  ];
  const money = useMoney();

  return (
    <div className="glass rounded-2xl p-5 sm:p-6">
      <h3 className="font-display text-lg font-bold text-fg">{t("partner.calc.title")}</h3>

      {/* Project picker */}
      <p className="mt-4 mb-2 text-sm font-medium text-muted">{t("partner.calc.projectLabel")}</p>
      <div className="flex flex-wrap gap-2">
        {projects.map((p) => {
          const on = p.id === (project?.id ?? "");
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setProjectId(p.id)}
              className={`rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                on
                  ? "bg-teal-glow/20 text-brand-luq ring-1 ring-teal-glow/40"
                  : "bg-panel/40 text-muted hover:text-fg"
              }`}
            >
              {t(`catalogue.items.${p.id}.name`, { defaultValue: p.id })} · {money(p.from)}
            </button>
          );
        })}
      </div>

      {/* Referral slider */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-sm font-medium text-muted">
          <span>{t("partner.calc.refsLabel")}</span>
          <span className="font-display text-lg font-bold text-brand-luq">{n}</span>
        </div>
        <input
          type="range"
          min={1}
          max={50}
          value={n}
          onChange={(e) => setN(Number(e.target.value))}
          className="w-full accent-[rgb(var(--c-teal-glow))]"
          aria-label={t("partner.calc.refsLabel")}
        />
      </div>

      {/* Result cards */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <motion.div
            key={c.label}
            layout
            className={`rounded-xl p-4 ${c.bright ? "glass-bright" : "bg-panel/40 border border-hairline/12"}`}
          >
            <p className="text-xs text-muted">{c.label}</p>
            <p className="mt-1 font-display text-xl font-bold text-fg sm:text-2xl">
              <AnimatedINR value={c.value} />
            </p>
          </motion.div>
        ))}
      </div>

      <p className="mt-4 text-xs text-faint">{t("partner.calc.caveat")}</p>
    </div>
  );
}
