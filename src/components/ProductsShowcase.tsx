import { motion } from "framer-motion";
import { Eye, Compass, Activity, ExternalLink, Sparkles, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

const PRODUCTS: { key: string; url: string; icon: LucideIcon }[] = [
  { key: "eagleeye", url: "https://eagleeye.work", icon: Eye },
  { key: "sarathi", url: "https://sarathi-ai.com", icon: Compass },
  { key: "nidaan", url: "https://nidaanpartner.com", icon: Activity },
];

/**
 * Proof — three real, delivered, live products (each with Digital Employee
 * capabilities). Builds trust on the homepage that GoLuQ ships working software.
 */
export function ProductsShowcase({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <section className={className}>
      <p className="font-mono text-sm uppercase tracking-[0.28em] text-brand-luq">
        {t("products.kicker")}
      </p>
      <h2 className="mt-2 text-balance font-display text-2xl font-bold text-fg sm:text-4xl">
        {t("products.title")}
      </h2>
      <p className="mt-2 text-base text-muted sm:text-lg">{t("products.subtitle")}</p>

      <div className="mt-7 grid gap-5 md:grid-cols-3">
        {PRODUCTS.map((p, i) => {
          const Icon = p.icon;
          return (
            <motion.a
              key={p.key}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="glass glass-interactive group flex flex-col rounded-2xl p-6"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-14 w-14 place-items-center rounded-xl bg-teal-glow/10 text-brand-luq ring-1 ring-teal-glow/25">
                  <Icon size={28} strokeWidth={2} />
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-glow/10 px-3 py-1 text-xs font-semibold text-brand-luq ring-1 ring-teal-glow/20">
                  <Sparkles size={12} /> {t("products.tag")}
                </span>
              </div>
              <h3 className="mt-5 font-display text-xl font-bold text-fg">{t(`products.${p.key}.name`)}</h3>
              <p className="mt-2 flex-1 text-base leading-relaxed text-muted">
                {t(`products.${p.key}.desc`)}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-base font-semibold text-brand-luq">
                {t("products.visit")} <ExternalLink size={16} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </motion.a>
          );
        })}
      </div>
    </section>
  );
}
