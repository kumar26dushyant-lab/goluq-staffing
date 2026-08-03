import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { useTranslation } from "react-i18next";

const PRODUCTS = [
  { key: "eagleeye", logo: "/logos/eagleeye.svg" },
  { key: "sarathi", logo: "/logos/sarathi.png" },
  { key: "nidaan", logo: "/logos/nidaan.png" },
];

type Stat = { v: string; l: string };

/**
 * Above-the-fold proof. The full showcase and the Nidaan case study sit further
 * down, but a visitor deciding whether to invest a minute in the demo needs to
 * know we ship real systems BEFORE they commit to the funnel — not after.
 * Deliberately slim so it never competes with the role deck for attention.
 */
export function ProofStrip({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const stats = (t("caseNidaan.stats", { returnObjects: true }) as Stat[]).slice(0, 3);

  return (
    <motion.a
      href="#proof"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className={`glass glass-interactive group flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-brand-luq">
          {t("products.kicker")}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
          {PRODUCTS.map((p) => (
            <span key={p.key} className="flex items-center gap-2">
              {/* White plate — same reason as ProductsShowcase: dark-ink logos. */}
              <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded bg-white ring-1 ring-hairline/15">
                <img src={p.logo} alt="" loading="lazy" className="h-full w-full object-contain p-0.5" />
              </span>
              <span className="text-sm font-semibold text-fg sm:text-base">
                {t(`products.${p.key}.name`)}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4 sm:gap-5">
        <dl className="flex gap-4 sm:gap-5">
          {stats.map((s, i) => (
            <div key={i}>
              <dt className="sr-only">{s.l}</dt>
              <dd>
                <span className="text-gradient-accent block font-display text-lg font-bold leading-none">
                  {s.v}
                </span>
                <span className="mt-1 block text-xs leading-tight text-faint">{s.l}</span>
              </dd>
            </div>
          ))}
        </dl>
        <ArrowDown
          size={20}
          className="shrink-0 text-brand-luq transition-transform group-hover:translate-y-0.5"
          aria-hidden="true"
        />
      </div>
      <span className="sr-only">{t("products.stripCta")}</span>
    </motion.a>
  );
}
