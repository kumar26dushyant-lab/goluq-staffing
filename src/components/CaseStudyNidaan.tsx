import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Network,
  ShieldCheck,
  GitBranch,
  Users,
  CreditCard,
  BarChart3,
  ExternalLink,
  Check,
  Building2,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { BrandText } from "./BrandText";
import { Button } from "./ui/Button";

const MODULE_ICONS: LucideIcon[] = [
  Network, // branch & office hierarchy
  ShieldCheck, // role-based access control
  GitBranch, // claim lifecycle engine
  Users, // advisor & partner network
  CreditCard, // subscription & entitlement control
  BarChart3, // roll-up reporting
];

const NIDAAN_URL = "https://nidaanpartner.com";

type Stat = { v: string; l: string };
type Module = { t: string; d: string };

/**
 * Flagship proof block — NidaanPartner.com. This is the strongest asset GoLuQ
 * has: not a website, but a multi-office operations control plane (branch
 * hierarchy, RBAC, claim lifecycle, advisor network, entitlements, roll-up
 * reporting) running a real business. It doubles as the "own it, don't rent it"
 * argument made concrete, so it renders on both "/" and the /build pages.
 *
 * `compact` drops the module grid + stack list for the homepage placement,
 * where the full treatment would out-weigh the demo funnel.
 */
export function CaseStudyNidaan({
  className = "",
  compact = false,
  showCta = true,
}: {
  className?: string;
  compact?: boolean;
  showCta?: boolean;
}) {
  const { t } = useTranslation();
  const stats = t("caseNidaan.stats", { returnObjects: true }) as Stat[];
  const modules = t("caseNidaan.modules", { returnObjects: true }) as Module[];
  const stack = t("caseNidaan.stack", { returnObjects: true }) as string[];

  return (
    <section className={className} aria-labelledby="case-nidaan-title">
      <p className="font-mono text-sm uppercase tracking-[0.28em] text-brand-luq">
        {t("caseNidaan.kicker")}
      </p>
      <h2
        id="case-nidaan-title"
        className="mt-2 text-balance font-display text-2xl font-bold sm:text-4xl"
      >
        <span className="text-gradient-accent">{t("caseNidaan.title")}</span>
      </h2>

      <div className="mt-4 grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div>
          <p className="text-base leading-relaxed text-muted sm:text-lg">
            <BrandText text={t("caseNidaan.lede")} />
          </p>
          <p className="mt-4 rounded-2xl border-l-2 border-teal-glow/50 bg-teal-glow/[0.06] py-3 pl-4 pr-4 text-sm leading-relaxed text-muted sm:text-base">
            <BrandText text={t("caseNidaan.role")} />
          </p>
        </div>

        {/* Operating metrics */}
        <div className="glass glow-blue rounded-2xl p-5">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-faint">
            {t("caseNidaan.statsTitle")}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              >
                <dt className="sr-only">{s.l}</dt>
                <dd>
                  <span className="text-gradient-accent block font-display text-2xl font-bold leading-none sm:text-3xl">
                    {s.v}
                  </span>
                  <span className="mt-1.5 block text-sm leading-snug text-muted">{s.l}</span>
                </dd>
              </motion.div>
            ))}
          </dl>
          <p className="mt-5 border-t border-hairline/10 pt-3 text-xs leading-relaxed text-faint">
            {t("caseNidaan.statsNote")}
          </p>
        </div>
      </div>

      {!compact && (
        <>
          {/* ── The office & branch control layer ─────────────────────── */}
          <div className="mt-10">
            <h3 className="flex items-center gap-2.5 font-display text-xl font-bold text-fg sm:text-2xl">
              <Building2 size={22} className="shrink-0 text-brand-luq" />
              {t("caseNidaan.buildTitle")}
            </h3>
            <p className="mt-2 max-w-3xl text-base text-muted sm:text-lg">
              {t("caseNidaan.buildLede")}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((m, i) => {
                const Icon = MODULE_ICONS[i % MODULE_ICONS.length];
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.45 }}
                    className="glass glass-interactive flex flex-col rounded-2xl p-5"
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-glow/10 text-brand-luq ring-1 ring-teal-glow/25">
                      <Icon size={20} />
                    </span>
                    <p className="mt-4 font-display text-base font-bold text-fg sm:text-lg">{m.t}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted sm:text-base">{m.d}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ── Scale story + what else shipped ───────────────────────── */}
          <div className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-start">
            <div className="border-gradient glow-violet rounded-2xl bg-panel/40 p-6">
              <h3 className="font-display text-lg font-bold text-fg sm:text-xl">
                {t("caseNidaan.scaleTitle")}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-muted">
                {t("caseNidaan.scaleBody")}
              </p>
            </div>

            <div className="glass rounded-2xl p-6">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-faint">
                {t("caseNidaan.stackTitle")}
              </p>
              <ul className="mt-4 space-y-2.5">
                {stack.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted sm:text-base">
                    <Check size={16} className="mt-1 shrink-0 text-brand-luq" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── The point ─────────────────────────────────────────────── */}
          <blockquote className="mt-8 rounded-3xl border border-teal-glow/30 p-6 shadow-neon sm:p-8"
            style={{ background: "rgb(var(--c-abyss) / 0.7)" }}
          >
            <p className="text-balance font-display text-lg font-semibold leading-relaxed text-fg sm:text-2xl">
              <BrandText text={t("caseNidaan.quote")} />
            </p>
          </blockquote>
        </>
      )}

      {showCta && (
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link to="/build">
            <Button size="lg">
              {t("caseNidaan.cta")} <ArrowRight size={18} />
            </Button>
          </Link>
          <a
            href={NIDAAN_URL}
            target="_blank"
            rel="noreferrer"
            className="glass glass-interactive inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-base font-semibold text-fg"
          >
            {t("caseNidaan.visit")} <ExternalLink size={16} />
          </a>
        </div>
      )}
    </section>
  );
}
