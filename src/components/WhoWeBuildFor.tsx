import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/Button";

/**
 * Who GoLuQ actually builds for.
 *
 * This exists because the demo shows five industries — clinics, labs, coaching,
 * CA firms, travel — and a visitor in a sixth industry reads that as "not for
 * me". The demo is limited to five because there are twenty-five hand-written
 * conversations behind it, not because the practice is. This section says so.
 *
 * Every trade listed is deliberately NON-TECHNICAL. The target is a business that
 * already pays for software and uses a fraction of it: the gym on a per-member
 * plan, the school billed per student, the distributor renting an ERP for three
 * screens. They are not shopping for a developer, which is exactly why nobody is
 * selling to them.
 */
const TRADES = [
  "clinic", "dental", "diagnostic", "pharmacy", "hospital",
  "school", "coaching", "college",
  "ca", "law", "realestate", "insurance",
  "hotel", "restaurant", "salon", "gym",
  "logistics", "transport", "warehouse", "manufacturing",
  "retail", "distributor", "jewellery", "autoservice",
  "eventplanner", "printing", "agri", "ngo",
];

export function WhoWeBuildFor({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();

  return (
    <section className={className} aria-labelledby="who-title">
      <p className="font-mono text-sm uppercase tracking-[0.28em] text-brand-luq">
        {t("whoFor.kicker")}
      </p>
      <h2
        id="who-title"
        className="mt-2 max-w-3xl text-balance font-display text-2xl font-bold sm:text-4xl"
      >
        <span className="text-gradient-accent">{t("whoFor.title")}</span>
      </h2>
      <p className="mt-3 max-w-3xl text-base text-muted sm:text-lg">{t("whoFor.subtitle")}</p>

      {/* The trades, as plain chips. A grid of icon cards would imply these are
          the options; chips read as examples, which is the honest framing. */}
      <div className="mt-7 flex flex-wrap gap-2">
        {TRADES.map((id, i) => (
          <motion.span
            key={id}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: Math.min(i, 14) * 0.02, duration: 0.3 }}
            className="rounded-full border border-hairline/15 bg-panel/40 px-3.5 py-1.5 text-sm text-muted"
          >
            {t(`whoFor.trades.${id}`)}
          </motion.span>
        ))}
        <span className="rounded-full border border-teal-glow/35 bg-teal-glow/[0.08] px-3.5 py-1.5 text-sm font-semibold text-brand-luq">
          {t("whoFor.andYours")}
        </span>
      </div>

      {/* The actual pitch: you are already paying for software. */}
      <div className="border-gradient glow-teal mt-9 rounded-3xl bg-panel/40 p-6 sm:p-8">
        <h3 className="font-display text-xl font-bold text-fg sm:text-2xl">
          {t("whoFor.rentTitle")}
        </h3>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted sm:text-lg">
          {t("whoFor.rentBody")}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {["seats", "features", "forever"].map((k) => (
            <div key={k} className="rounded-2xl border border-hairline/12 bg-panel/40 p-5">
              <p className="font-display text-base font-bold text-fg">{t(`whoFor.signs.${k}.t`)}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{t(`whoFor.signs.${k}.d`)}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 max-w-3xl text-base leading-relaxed text-fg">{t("whoFor.rentClose")}</p>

        <Link to="/build#enquiry" className="mt-6 inline-block">
          <Button size="lg">
            {t("whoFor.cta")} <ArrowRight size={18} />
          </Button>
        </Link>
      </div>
    </section>
  );
}
