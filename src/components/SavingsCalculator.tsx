import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/Button";
import { useMoney, usePricing } from "../lib/siteConfig";

/**
 * "What are you paying every month?" — the single most persuasive thing on the
 * page, because it is the visitor's own number rather than ours.
 *
 * The argument a tier-2 owner responds to is not "we build software". It is
 * "you are paying ₹8,000 a month, forever, and owning it costs ₹50,000 once".
 * Nothing else on this page turns an abstract service into arithmetic he can do
 * in his head while standing in his own shop.
 *
 * It is deliberately honest in both directions: below roughly a year of payback
 * it says buy, above three years it says stay where you are. A calculator that
 * always says "buy" is an advertisement, and people can feel the difference.
 */
const PRESETS = [2000, 5000, 10000, 25000];

export function SavingsCalculator({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const money = useMoney();
  const pricing = usePricing();
  const [monthly, setMonthly] = useState(5000);

  // What owning the equivalent costs. Anchored to the real website/app prices so
  // the sum can never drift from the catalogue the visitor scrolls to next.
  const app = pricing.find((p) => p.id === "app")?.from ?? 50000;
  const buildCost = app;

  const yearly = monthly * 12;
  const threeYear = yearly * 3;
  const saved = Math.max(0, threeYear - buildCost);
  // Months until owning it costs less than renting it.
  const payback = monthly > 0 ? Math.ceil(buildCost / monthly) : Infinity;

  const verdict = payback <= 12 ? "clear" : payback <= 36 ? "worth" : "stay";

  return (
    <section className={className} aria-labelledby="savings-title">
      <div className="border-gradient glow-teal rounded-3xl bg-panel/40 p-6 sm:p-9">
        <p className="font-mono text-sm uppercase tracking-[0.28em] text-brand-luq">
          {t("savings.kicker")}
        </p>
        <h2
          id="savings-title"
          className="mt-2 max-w-2xl text-balance font-display text-2xl font-bold sm:text-4xl"
        >
          <span className="text-gradient-accent">{t("savings.title")}</span>
        </h2>

        <div className="mt-7 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <label htmlFor="spend" className="block text-base font-semibold text-fg">
              {t("savings.question")}
            </label>

            <p className="mt-4 font-display text-4xl font-bold tabular-nums text-fg sm:text-5xl">
              {money(monthly)}
              <span className="ml-1 font-display text-lg font-semibold text-muted">
                {t("savings.perMonth")}
              </span>
            </p>

            <input
              id="spend"
              type="range"
              min={500}
              max={50000}
              step={500}
              value={monthly}
              onChange={(e) => setMonthly(Number(e.target.value))}
              className="mt-4 w-full accent-[rgb(var(--c-teal-glow))]"
              aria-describedby="savings-verdict"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setMonthly(p)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                    monthly === p
                      ? "bg-teal-glow/20 text-brand-luq ring-1 ring-teal-glow/45"
                      : "glass glass-interactive text-muted"
                  }`}
                >
                  {money(p)}
                </button>
              ))}
            </div>

            <p className="mt-4 text-sm leading-relaxed text-faint">{t("savings.hint")}</p>
          </div>

          {/* The arithmetic, shown rather than argued. */}
          <div className="space-y-3">
            <Row label={t("savings.renting")} value={money(threeYear)} sub={t("savings.rentingSub")} />
            <Row label={t("savings.owning")} value={money(buildCost)} sub={t("savings.owningSub")} accent />

            <motion.div
              key={verdict + payback}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              id="savings-verdict"
              className={`rounded-2xl border p-5 ${
                verdict === "stay"
                  ? "border-warn/30 bg-warn/[0.07]"
                  : "border-success/30 bg-success/[0.08]"
              }`}
            >
              {verdict === "stay" ? (
                <>
                  <p className="font-display text-lg font-bold text-warn">{t("savings.stayTitle")}</p>
                  <p className="mt-1.5 text-base leading-relaxed text-muted">{t("savings.stayBody")}</p>
                </>
              ) : (
                <>
                  <p className="flex items-center gap-2 font-display text-lg font-bold text-success">
                    <TrendingDown size={19} className="shrink-0" />
                    {t("savings.saveTitle", { amount: money(saved) })}
                  </p>
                  <p className="mt-1.5 text-base leading-relaxed text-muted">
                    {t("savings.saveBody", { months: payback })}
                  </p>
                </>
              )}
            </motion.div>

            <Link to="/build#enquiry" className="block">
              <Button size="lg" full>
                {t("savings.cta")} <ArrowRight size={18} />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({
  label, value, sub, accent,
}: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-hairline/12 bg-panel/40 p-4">
      <div className="min-w-0">
        <p className="text-base font-semibold text-fg">{label}</p>
        <p className="mt-0.5 text-sm text-muted">{sub}</p>
      </div>
      <p
        className={`shrink-0 font-display text-xl font-bold tabular-nums sm:text-2xl ${
          accent ? "text-brand-luq" : "text-fg"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
