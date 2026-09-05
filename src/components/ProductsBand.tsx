import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Building2, Store } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePricing, useMoney } from "../lib/siteConfig";

/**
 * The two productised offers, on the homepage, with live prices.
 *
 * Sits directly under the hero. Everything else on the page is the wedge —
 * services, small builds, the demo. These two are the revenue, and a visitor
 * who is the right buyer (an owner fed up with software he rents and cannot
 * control) should find them before he has to scroll for them.
 */
const ITEMS = [
  { id: "office", setup: "whatsappOffice", managed: "officeManaged", to: "/whatsapp-office", icon: Building2 },
  { id: "store", setup: "whatsappStore", managed: "storeManaged", to: "/whatsapp-store", icon: Store },
] as const;

export function ProductsBand({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const pricing = usePricing();
  const money = useMoney();

  const rows = ITEMS.map((it) => ({
    ...it,
    setupRow: pricing.find((p) => p.id === it.setup),
    managedRow: pricing.find((p) => p.id === it.managed),
  })).filter((it) => it.setupRow);
  if (!rows.length) return null;

  return (
    <section className={className} aria-labelledby="products-title">
      <p className="font-mono text-sm uppercase tracking-[0.28em] text-brand-luq">
        {t("productsBand.kicker")}
      </p>
      <h2 id="products-title" className="mt-2 max-w-3xl text-balance font-display text-2xl font-bold sm:text-4xl">
        <span className="text-gradient-accent">{t("productsBand.title")}</span>
      </h2>
      <p className="mt-3 max-w-2xl text-base text-muted sm:text-lg">{t("productsBand.subtitle")}</p>

      <div className="mt-7 grid gap-4 lg:grid-cols-2">
        {rows.map((it, i) => {
          const Icon = it.icon;
          return (
            <motion.div
              key={it.id}
              initial={reduced ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="border-gradient glow-teal flex flex-col rounded-3xl bg-panel/40 p-6 sm:p-7"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-glow/12 text-brand-luq ring-1 ring-teal-glow/25">
                <Icon size={20} />
              </span>
              <h3 className="mt-4 font-display text-xl font-bold text-fg sm:text-2xl">
                {t(`products.${it.id}.shortName`)}
              </h3>
              <p className="mt-2 text-base leading-relaxed text-muted">{t(`productsBand.${it.id}`)}</p>

              <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-hairline/10 pt-4">
                <span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-faint">{t("productsBand.setup")} </span>
                  <span className="font-display text-xl font-bold text-fg tabular-nums">
                    {it.setupRow && money(it.setupRow.offer ?? it.setupRow.from)}
                  </span>
                </span>
                {it.managedRow && (
                  <span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-faint">{t("productsBand.managed")} </span>
                    <span className="font-display text-lg font-bold text-brand-luq tabular-nums">
                      {money(it.managedRow.offer ?? it.managedRow.from)}{t("products.common.perMonth")}
                    </span>
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-faint">{t("productsBand.days")}</p>

              <Link to={it.to} className="mt-5 inline-flex items-center gap-2 font-semibold text-brand-luq hover:underline">
                {t("productsBand.cta")} <ArrowRight size={16} />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
