import { useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Check,
  X,
  ArrowRight,
  ArrowDown,
  BadgeCheck,
  Scale,
  Stethoscope,
  Landmark,
  Factory,
  ShieldAlert,
  Sparkles,
  Globe2,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { TopBar } from "../components/TopBar";
import { BrandText } from "../components/BrandText";
import { Button } from "../components/ui/Button";
import { CaseStudyNidaan } from "../components/CaseStudyNidaan";
import { ProductsShowcase } from "../components/ProductsShowcase";
import { RentVsOwn } from "../components/build/RentVsOwn";
import { BuildEnquiryForm } from "../components/build/BuildEnquiryForm";
import { LINKEDIN_URL } from "./About";
import type { Region } from "../content/buildPricing";

const VERTICAL_ICONS: LucideIcon[] = [Stethoscope, Landmark, Scale, Factory];

type Item = { t: string; d: string };
type Vertical = { t: string; d: string; b: string[] };
type Row = { l: string; a: string; b: string };
type Step = { n: string; t: string; w: string; d: string };
type QA = { q: string; a: string };

/**
 * Routes "/build" (India) and "/build/global". The custom-build practice — a
 * separate funnel from "/" on purpose: "/" is demo-led and sells a ₹799/mo
 * subscription, this is proof-led and sells a one-time owned asset. Merging
 * them would have the homepage arguing against its own price list.
 *
 * Both regions render the same components off different i18n namespaces
 * (`buildIn` / `buildGlobal`) so the copy, currency and compliance framing
 * diverge without the layout forking.
 */
export function BuildPractice({ region }: { region: Region }) {
  const ns = region === "in" ? "buildIn" : "buildGlobal";
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  /**
   * React Router does not scroll to `#hash` on navigation, and this page is
   * lazy-loaded, so the target does not exist on the first frame. Without this,
   * every "Get a quote" link silently dropped the visitor at the top of the
   * page instead of at the form.
   */
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    let tries = 0;
    const find = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (tries++ < 20) window.setTimeout(find, 50); // wait for the chunk to mount
    };
    find();
  }, []);

  // The global page is written for an English-reading audience; the India page
  // keeps the site-wide EN/HI toggle.
  useEffect(() => {
    document.title = t(`${ns}.meta.title`);
    const desc = document.querySelector('meta[name="description"]');
    const prev = desc?.getAttribute("content") ?? "";
    desc?.setAttribute("content", t(`${ns}.meta.desc`));
    return () => {
      desc?.setAttribute("content", prev);
    };
  }, [ns, t]);

  const heroPoints = t(`${ns}.hero.points`, { returnObjects: true }) as string[];
  const problems = t(`${ns}.problem.items`, { returnObjects: true }) as Item[];
  const modelYes = t(`${ns}.model.yes`, { returnObjects: true }) as Item[];
  const modelHonest = t(`${ns}.model.honest`, { returnObjects: true }) as Item[];
  const modelNot = t(`${ns}.model.not`, { returnObjects: true }) as string[];
  const rows = t(`${ns}.tco.rows`, { returnObjects: true }) as Row[];
  const verticals = t(`${ns}.verticals.items`, { returnObjects: true }) as Vertical[];
  const steps = t(`${ns}.process.steps`, { returnObjects: true }) as Step[];
  const objections = t(`${ns}.objections.items`, { returnObjects: true }) as QA[];
  const complianceNote =
    region === "in" ? t(`${ns}.verticals.legalNote`) : t(`${ns}.verticals.complianceBody`);
  const complianceTitle = region === "in" ? "" : t(`${ns}.verticals.complianceTitle`);

  return (
    <div className="relative min-h-dvh">
      <TopBar showBack onBack={() => navigate("/")} />

      <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-2 sm:px-8">
        {/* Region switch. The global variant existed but nothing linked to it,
            so it was reachable only by typing the URL — an entire pricing
            presentation nobody could find. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-sm">
          <span className="flex items-center gap-1.5 text-muted">
            <Globe2 size={15} className="text-brand-luq" />
            {t(`${ns}.region.label`)}
          </span>
          <Link
            to={region === "in" ? "/build/global" : "/build"}
            className="font-semibold text-brand-luq hover:underline"
          >
            {t(`${ns}.region.switch`)}
          </Link>
        </div>

        {/* ── 1 · Hero ──────────────────────────────────────────────── */}
        <section className="grid gap-8 py-8 sm:py-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-brand-luq sm:text-sm">
              {t(`${ns}.hero.kicker`)}
            </p>
            <motion.h1
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4 text-balance font-display text-3xl font-bold leading-[1.12] text-fg sm:text-5xl"
            >
              {t(`${ns}.hero.h1`)}{" "}
              <span className="text-gradient-accent">{t(`${ns}.hero.h1accent`)}</span>
            </motion.h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              {t(`${ns}.hero.sub`)}
            </p>

            <ul className="mt-6 grid gap-2.5">
              {heroPoints.map((p, i) => (
                <motion.li
                  key={i}
                  initial={reduced ? false : { opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.07, duration: 0.5 }}
                  className="flex items-start gap-2.5 text-base text-fg"
                >
                  <Check size={18} className="mt-1 shrink-0 text-brand-luq" />
                  <span>{p}</span>
                </motion.li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#enquiry">
                <Button size="lg">
                  {t(`${ns}.hero.ctaPrimary`)} <ArrowRight size={18} />
                </Button>
              </a>
              <a
                href="#proof"
                className="glass glass-interactive inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-base font-bold text-fg"
              >
                {t(`${ns}.hero.ctaProof`)} <ArrowDown size={17} className="text-brand-luq" />
              </a>
            </div>
          </div>

          {/* Right column: the model, not a stock photo. */}
          <div className="glass glow-teal rounded-3xl p-6 sm:p-7">
            <RentVsOwnTeaser ns={ns} />
          </div>
        </section>

        {/* ── 2 · Proof, before any pitch ───────────────────────────── */}
        <div id="proof" className="scroll-mt-24">
          <CaseStudyNidaan className="mt-12" showCta={false} />
          <ProductsShowcase className="mt-16" />
        </div>

        {/* ── 3 · The architect ─────────────────────────────────────── */}
        <section className="glass mt-16 rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <img
              src="/founder.png"
              alt={t("about.name")}
              className="h-24 w-24 shrink-0 rounded-2xl object-cover ring-2 ring-teal-glow/40"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold text-fg sm:text-2xl">
                  {t("about.name")}
                </h2>
                <BadgeCheck size={19} className="text-brand-luq" />
              </div>
              <p className="text-base font-semibold text-brand-luq">
                Principal Architect · {t("about.role")}
              </p>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
                <BrandText text={t("about.founder3")} />
              </p>
              <p className="mt-3 max-w-2xl text-base font-semibold leading-relaxed text-fg">
                <BrandText text={t("about.founderPunch")} />
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to="/about"
                  className="inline-flex items-center gap-1.5 text-base font-semibold text-brand-luq"
                >
                  {t("about.readMore")} <ArrowRight size={15} />
                </Link>
                <a
                  href={LINKEDIN_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-base font-semibold text-muted hover:text-fg"
                >
                  {t("about.linkedin")}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4 · The cost problem ──────────────────────────────────── */}
        <Section
          className="mt-20"
          kicker={t(`${ns}.problem.kicker`)}
          title={t(`${ns}.problem.title`)}
          lede={t(`${ns}.problem.lede`)}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {problems.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.45 }}
                className="rounded-2xl border border-danger/20 bg-danger/[0.05] p-5"
              >
                <p className="font-display text-base font-bold text-fg sm:text-lg">{p.t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted sm:text-base">{p.d}</p>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ── 5 · The calculator ────────────────────────────────────── */}
        <div className="mt-20">
          <RentVsOwn region={region} ns={ns} />
        </div>

        {/* ── 6 · How it works + honest running costs ───────────────── */}
        <Section
          className="mt-20"
          kicker={t(`${ns}.model.kicker`)}
          title={t(`${ns}.model.title`)}
          lede={t(`${ns}.model.lede`)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {modelYes.map((m, i) => (
              <div key={i} className="glass rounded-2xl p-5">
                <p className="flex items-start gap-2.5 font-display text-base font-bold text-fg sm:text-lg">
                  <Check size={19} className="mt-0.5 shrink-0 text-success" />
                  {m.t}
                </p>
                <p className="mt-1.5 pl-[29px] text-sm leading-relaxed text-muted sm:text-base">
                  {m.d}
                </p>
              </div>
            ))}
          </div>

          {/* The honesty block — the page's main differentiator. */}
          <div className="border-gradient mt-8 rounded-3xl bg-panel/40 p-6 sm:p-8">
            <h3 className="font-display text-xl font-bold text-fg sm:text-2xl">
              {t(`${ns}.model.honestTitle`)}
            </h3>
            <p className="mt-2 max-w-2xl text-base text-muted">{t(`${ns}.model.honestLede`)}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {modelHonest.map((m, i) => (
                <div key={i} className="rounded-2xl border border-warn/25 bg-warn/[0.05] p-5">
                  <p className="font-display text-base font-bold text-fg">{m.t}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted sm:text-base">{m.d}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass mt-6 rounded-2xl p-6">
            <h3 className="font-display text-lg font-bold text-fg">{t(`${ns}.model.notTitle`)}</h3>
            <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {modelNot.map((n, i) => (
                <li key={i} className="flex items-start gap-2.5 text-base text-muted">
                  <X size={17} className="mt-1 shrink-0 text-danger" />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* ── 7 · TCO table ─────────────────────────────────────────── */}
        <Section
          className="mt-20"
          kicker={t(`${ns}.tco.kicker`)}
          title={t(`${ns}.tco.title`)}
          lede={t(`${ns}.tco.lede`)}
        >
          {/* Mobile: stacked comparison cards. A 640px-wide side-scrolling table
              is unusable on a phone, and phones are ~all of the traffic. */}
          <div className="grid gap-3 sm:hidden">
            {rows.map((r, i) => (
              <div key={i} className="glass rounded-2xl p-4">
                <p className="font-display text-base font-bold text-fg">{r.l}</p>
                <div className="mt-3 space-y-2.5">
                  <div className="rounded-xl border border-hairline/12 bg-panel/30 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-faint">
                      {t(`${ns}.tco.colSaas`)}
                    </p>
                    <p className="mt-1 text-base text-muted">{r.a}</p>
                  </div>
                  <div className="rounded-xl border border-teal-glow/25 bg-teal-glow/[0.07] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-luq">
                      {t(`${ns}.tco.colOwn`)}
                    </p>
                    <p className="mt-1 text-base font-medium text-fg">{r.b}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="glass hidden overflow-x-auto rounded-2xl sm:block">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <caption className="sr-only">{t(`${ns}.tco.title`)}</caption>
              <thead>
                <tr className="border-b border-hairline/12">
                  <th scope="col" className="p-4 text-sm font-semibold uppercase tracking-wide text-faint">
                    &nbsp;
                  </th>
                  <th scope="col" className="p-4 font-display text-base font-bold text-muted">
                    {t(`${ns}.tco.colSaas`)}
                  </th>
                  <th scope="col" className="p-4 font-display text-base font-bold text-brand-luq">
                    {t(`${ns}.tco.colOwn`)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-hairline/8 last:border-0">
                    <th scope="row" className="p-4 align-top text-base font-semibold text-fg">
                      {r.l}
                    </th>
                    <td className="p-4 align-top text-base text-muted">{r.a}</td>
                    <td className="bg-teal-glow/[0.05] p-4 align-top text-base font-medium text-fg">
                      {r.b}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Conceding the case we'd lose — this is what makes the table above believable. */}
          <div className="mt-6 rounded-2xl border border-hairline/15 bg-panel/30 p-6">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-fg">
              <Sparkles size={19} className="text-warn" />
              {t(`${ns}.tco.honestTitle`)}
            </h3>
            <p className="mt-2 text-base leading-relaxed text-muted">
              {t(`${ns}.tco.honestBody`)}
            </p>
          </div>
        </Section>

        {/* ── 8 · Verticals ─────────────────────────────────────────── */}
        <Section
          className="mt-20"
          kicker={t(`${ns}.verticals.kicker`)}
          title={t(`${ns}.verticals.title`)}
          lede={t(`${ns}.verticals.lede`)}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            {verticals.map((v, i) => {
              const Icon = VERTICAL_ICONS[i % VERTICAL_ICONS.length];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.45 }}
                  className="glass glass-interactive flex flex-col rounded-2xl p-6"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-teal-glow/10 text-brand-luq ring-1 ring-teal-glow/25">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold text-fg sm:text-xl">{v.t}</h3>
                  <p className="mt-2 text-base leading-relaxed text-muted">{v.d}</p>
                  <ul className="mt-4 space-y-2 border-t border-hairline/10 pt-4">
                    {v.b.map((b, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-muted sm:text-base">
                        <Check size={15} className="mt-1 shrink-0 text-brand-luq" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>

          {/* Regulatory honesty: BCI Rule 36 (India) / no-certification claim (global). */}
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-warn/25 bg-warn/[0.05] p-5">
            <ShieldAlert size={20} className="mt-0.5 shrink-0 text-warn" />
            <div>
              {complianceTitle && (
                <p className="font-display text-base font-bold text-fg">{complianceTitle}</p>
              )}
              <p className={`text-sm leading-relaxed text-muted sm:text-base ${complianceTitle ? "mt-1.5" : ""}`}>
                <BrandText text={complianceNote} />
              </p>
            </div>
          </div>
        </Section>

        {/* ── 9 · Process ───────────────────────────────────────────── */}
        <Section
          className="mt-20"
          kicker={t(`${ns}.process.kicker`)}
          title={t(`${ns}.process.title`)}
          lede={t(`${ns}.process.lede`)}
        >
          <ol className="grid gap-4">
            {steps.map((s, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.45 }}
                className="glass flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-start sm:gap-5"
              >
                <span className="text-gradient-accent shrink-0 font-mono text-2xl font-bold sm:text-3xl">
                  {s.n}
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="font-display text-lg font-bold text-fg">{s.t}</h3>
                    <span className="rounded-full bg-teal-glow/10 px-3 py-0.5 font-mono text-xs font-semibold text-brand-luq ring-1 ring-teal-glow/25">
                      {s.w}
                    </span>
                  </div>
                  <p className="mt-1.5 text-base leading-relaxed text-muted">{s.d}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </Section>

        {/* ── 10 · Objections ───────────────────────────────────────── */}
        <Section
          className="mt-20"
          kicker={t(`${ns}.objections.kicker`)}
          title={t(`${ns}.objections.title`)}
        >
          <div className="grid gap-4">
            {objections.map((o, i) => (
              <details key={i} className="glass group rounded-2xl p-5 sm:p-6" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-display text-base font-bold text-fg sm:text-lg">
                  <span>{o.q}</span>
                  <ArrowDown
                    size={19}
                    className="mt-0.5 shrink-0 text-brand-luq transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="mt-3 text-base leading-relaxed text-muted">{o.a}</p>
              </details>
            ))}
          </div>
        </Section>

        {/* ── 11 · Final CTA ────────────────────────────────────────── */}
        <section id="enquiry" className="mt-20 scroll-mt-20">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div>
              <h2 className="text-balance font-display text-2xl font-bold sm:text-4xl">
                <span className="text-gradient-accent">{t(`${ns}.final.title`)}</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
                {t(`${ns}.final.body`)}
              </p>
              <p className="mt-6 flex items-start gap-2.5 rounded-2xl border border-teal-glow/30 bg-teal-glow/[0.06] p-4 text-base font-semibold text-fg">
                <BadgeCheck size={20} className="mt-0.5 shrink-0 text-brand-luq" />
                {t(`${ns}.final.trust`)}
              </p>
              <p className="mt-4 text-sm text-faint">{t(`${ns}.final.email`)}</p>
            </div>
            <BuildEnquiryForm region={region} ns={ns} />
          </div>
        </section>

        {/* ── 12 · Bridge back to the Digital Employee funnel ───────── */}
        <section className="glass mt-16 rounded-3xl p-6 text-center sm:p-8">
          <h2 className="font-display text-xl font-bold text-fg sm:text-2xl">
            {t(`${ns}.bridge.title`)}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-base text-muted">{t(`${ns}.bridge.body`)}</p>
          <Link to="/" className="mt-5 inline-block">
            <Button size="lg" variant="secondary">
              {t(`${ns}.bridge.cta`)} <ArrowRight size={18} />
            </Button>
          </Link>
        </section>
      </main>
    </div>
  );
}

/** Hero-side condensed value stack — the calculator itself lives further down. */
function RentVsOwnTeaser({ ns }: { ns: string }) {
  const { t } = useTranslation();
  const points = t(`${ns}.model.not`, { returnObjects: true }) as string[];
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-faint">
        {t(`${ns}.model.notTitle`)}
      </p>
      <ul className="mt-4 space-y-3">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-2.5 text-base text-fg">
            <X size={17} className="mt-1 shrink-0 text-danger" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <a
        href="#enquiry"
        className="mt-6 inline-flex items-center gap-2 text-base font-bold text-brand-luq"
      >
        {t(`${ns}.hero.ctaPrimary`)}
        <ArrowRight size={16} />
      </a>
    </div>
  );
}

function Section({
  kicker,
  title,
  lede,
  className = "",
  children,
}: {
  kicker: string;
  title: string;
  lede?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className}>
      <p className="font-mono text-sm uppercase tracking-[0.28em] text-brand-luq">{kicker}</p>
      <h2 className="mt-2 text-balance font-display text-2xl font-bold sm:text-4xl">
        <span className="text-gradient-accent">{title}</span>
      </h2>
      {lede && <p className="mt-2 max-w-2xl text-base text-muted sm:text-lg">{lede}</p>}
      <div className="mt-7">{children}</div>
    </section>
  );
}
