import { useEffect, useState } from "react";
import { motion, useSpring, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  PLANS,
  DEFAULT_PLAN_ID,
  RATE_YEAR1,
  RATE_LIFETIME,
  planById,
} from "../../content/affiliateConfig";
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

/** The hook of the PartnerBot: pick a plan + how many referrals → live earnings. */
export function EarningsCalculator() {
  const { t } = useTranslation();
  const [planId, setPlanId] = useState(DEFAULT_PLAN_ID);
  const [n, setN] = useState(10);

  const price = planById(planId).priceInr;
  const year1Monthly = n * RATE_YEAR1 * price;
  const year1Total = year1Monthly * 12;
  const ongoingMonthly = n * RATE_LIFETIME * price;
  const cumulative24m = year1Total + ongoingMonthly * 12;

  const cards = [
    { label: t("partner.calc.year1Monthly"), value: year1Monthly, bright: true },
    { label: t("partner.calc.year1Total"), value: year1Total },
    { label: t("partner.calc.ongoingMonthly"), value: ongoingMonthly },
    { label: t("partner.calc.cumulative24m"), value: cumulative24m, bright: true },
  ];

  return (
    <div className="glass rounded-2xl p-5 sm:p-6">
      <h3 className="font-display text-lg font-bold text-fg">{t("partner.calc.title")}</h3>

      {/* Plan picker */}
      <p className="mt-4 mb-2 text-sm font-medium text-muted">{t("partner.calc.planLabel")}</p>
      <div className="flex flex-wrap gap-2">
        {PLANS.map((p) => {
          const on = p.id === planId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlanId(p.id)}
              className={`rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                on
                  ? "bg-teal-glow/20 text-brand-luq ring-1 ring-teal-glow/40"
                  : "bg-panel/40 text-muted hover:text-fg"
              }`}
            >
              {t(p.labelKey)} · {formatINR(p.priceInr)}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-faint">{planById(planId).cap}</p>

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
      <div className="mt-5 grid grid-cols-2 gap-3">
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
