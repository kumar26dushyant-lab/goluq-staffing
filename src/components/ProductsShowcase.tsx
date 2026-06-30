import { motion } from "framer-motion";
import { Eye, Compass, Activity, ExternalLink, Sparkles, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

const PRODUCTS: { key: string; url: string; icon: LucideIcon; logo?: string; glow: string; ring: string; tint: string }[] = [
  { key: "eagleeye", url: "https://eagleeye.work", icon: Eye, logo: "/logos/eagleeye.svg", glow: "glow-teal", ring: "ring-teal-glow/30", tint: "text-brand-luq bg-teal-glow/12" },
  { key: "sarathi", url: "https://sarathi-ai.com", icon: Compass, logo: "/logos/sarathi.png", glow: "glow-violet", ring: "ring-[#8b7cf6]/40", tint: "text-[#a78bfa] bg-[#8b7cf6]/12" },
  { key: "nidaan", url: "https://nidaanpartner.com", icon: Activity, logo: "/logos/nidaan.png", glow: "glow-blue", ring: "ring-[#3b82f6]/40", tint: "text-[#60a5fa] bg-[#3b82f6]/12" },
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
      <h2 className="mt-2 text-balance font-display text-2xl font-bold sm:text-4xl">
        <span className="text-gradient-accent">{t("products.title")}</span>
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
              className={`glass glass-interactive ${p.glow} group flex flex-col rounded-2xl p-6`}
            >
              <div className="flex items-center justify-between">
                <span className={`grid h-14 w-14 place-items-center overflow-hidden rounded-xl ring-1 ${p.tint} ${p.ring}`}>
                  {p.logo ? (
                    <img src={p.logo} alt="" className="h-full w-full object-contain p-1.5" />
                  ) : (
                    <Icon size={28} strokeWidth={2} />
                  )}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${p.tint} ${p.ring}`}>
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
