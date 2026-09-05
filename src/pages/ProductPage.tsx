import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight, Check, CalendarDays, MessageCircle, Building2, ShieldCheck, Clock,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { TopBar } from "../components/TopBar";
import { Button } from "../components/ui/Button";
import { WhatsAppCta } from "../components/WhatsAppCta";
import { Testimonials } from "../components/Testimonials";
import { SiteFooter } from "../components/SiteFooter";
import { usePricing, useMoney, useSiteConfig } from "../lib/siteConfig";

export type ProductId = "office" | "store";

/** Which live pricing rows each product is sold from. */
const ROWS: Record<ProductId, { setup: string; managed: string }> = {
  office: { setup: "whatsappOffice", managed: "officeManaged" },
  store: { setup: "whatsappStore", managed: "storeManaged" },
};

const CARD_ICONS: LucideIcon[] = [MessageCircle, Building2, Check, Clock, CalendarDays, ShieldCheck];

/**
 * A productised offer: one product, one price, one delivery date.
 *
 * Both products render through this one page. The Office is a
 * professional-services firm's whole customer communication on WhatsApp with
 * staff on Telegram; the Store is catalogue broadcast plus native WhatsApp
 * ordering for a wholesaler. Same engine, same price band, different story —
 * so the structure is shared and every word comes from i18n.
 *
 * Prices are never written here. They come from the live catalogue, already
 * converted for the visitor's market, so a UAE visitor sees the AED equivalent
 * of the international price and an Indian visitor sees rupees — and the guide
 * quotes the same figure in chat.
 *
 * The primary action is a booking link when the owner has set one, because a
 * sale this size is made on a call, not in a chat widget. Until then it is
 * WhatsApp, which at least reaches a person.
 */
export function ProductPage({ product }: { product: ProductId }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const money = useMoney();
  const pricing = usePricing();
  const cfg = useSiteConfig();
  const ns = `products.${product}`;

  const setup = pricing.find((p) => p.id === ROWS[product].setup);
  const managed = pricing.find((p) => p.id === ROWS[product].managed);
  const booking = cfg?.bookingUrl || "";

  useEffect(() => {
    document.title = t(`${ns}.meta.title`);
  }, [ns, t]);

  const rise = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
        };

  const cards = t(`${ns}.cards`, { returnObjects: true }) as { t: string; d: string }[];
  const steps = t(`${ns}.steps`, { returnObjects: true }) as { t: string; d: string }[];
  const who = t(`${ns}.who`, { returnObjects: true }) as string[];
  const faq = t(`${ns}.faq`, { returnObjects: true }) as { q: string; a: string }[];
  const setupIncludes = t(`${ns}.pricing.setupIncludes`, { returnObjects: true }) as string[];
  const managedIncludes = t(`${ns}.pricing.managedIncludes`, { returnObjects: true }) as string[];

  const PrimaryCta = ({ size = "lg" as "lg" | "md" }) =>
    booking ? (
      <a href={booking} target="_blank" rel="noreferrer">
        <Button size={size}>
          <CalendarDays size={18} /> {t("products.common.book")}
        </Button>
      </a>
    ) : (
      <WhatsAppCta variant="inline" context="pricing" />
    );

  return (
    <div className="relative min-h-dvh">
      <TopBar showBack onBack={() => navigate("/")} />

      <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-4 sm:px-8">
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="py-8 sm:py-12">
          <motion.p {...rise(0.02)} className="font-mono text-xs uppercase tracking-[0.3em] text-brand-luq sm:text-sm">
            {t(`${ns}.kicker`)}
          </motion.p>
          <motion.h1
            {...rise(0.1)}
            className="mt-4 max-w-3xl text-balance font-display text-3xl font-bold leading-[1.1] text-fg sm:text-5xl"
          >
            {t(`${ns}.title`)} <span className="text-gradient-accent">{t(`${ns}.titleAccent`)}</span>
          </motion.h1>
          <motion.p {...rise(0.2)} className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            {t(`${ns}.subtitle`)}
          </motion.p>

          <motion.div {...rise(0.3)} className="mt-7 flex flex-wrap items-center gap-3">
            <PrimaryCta />
            <a href="#pricing">
              <Button variant="ghost" size="lg">
                {t("products.common.seePrice")} <ArrowRight size={18} />
              </Button>
            </a>
          </motion.div>

          {/* Who it is for — named trades, so a reader finds himself or does not,
              quickly, instead of wondering whether "professional services" means him. */}
          <motion.div {...rise(0.4)} className="mt-8 flex flex-wrap gap-2">
            {who.map((w) => (
              <span key={w} className="rounded-full border border-hairline/15 bg-panel/40 px-3.5 py-1.5 text-sm text-muted">
                {w}
              </span>
            ))}
          </motion.div>
        </section>

        {/* ── Proof ───────────────────────────────────────────────────────── */}
        <section className="border-gradient glow-teal rounded-3xl bg-panel/40 p-6 sm:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-brand-luq">{t(`${ns}.proof.kicker`)}</p>
          <div className="mt-4 flex flex-wrap gap-x-10 gap-y-4">
            {(["a", "b", "c"] as const).map((k) => (
              <div key={k}>
                <p className="font-display text-3xl font-bold text-fg sm:text-4xl">{t(`${ns}.proof.${k}.v`)}</p>
                <p className="mt-1 max-w-[14rem] text-sm text-muted">{t(`${ns}.proof.${k}.l`)}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted">{t(`${ns}.proof.body`)}</p>
        </section>

        {/* ── What you get ────────────────────────────────────────────────── */}
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold text-fg sm:text-3xl">
            <span className="text-gradient-accent">{t("products.common.whatYouGet")}</span>
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c, i) => {
              const Icon = CARD_ICONS[i % CARD_ICONS.length];
              return (
                <motion.div
                  key={c.t}
                  initial={reduced ? false : { opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(i, 5) * 0.05, duration: 0.45 }}
                  className="glass glass-interactive rounded-2xl p-5"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-glow/12 text-brand-luq ring-1 ring-teal-glow/25">
                    <Icon size={19} />
                  </span>
                  <h3 className="mt-3 font-display text-base font-bold text-fg sm:text-lg">{c.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted sm:text-base">{c.d}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── How it works ────────────────────────────────────────────────── */}
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold text-fg sm:text-3xl">
            <span className="text-gradient-accent">{t("products.common.howItWorks")}</span>
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.t} className="glass relative rounded-2xl p-5">
                <span className="font-mono text-xs text-faint">0{i + 1}</span>
                <p className="mt-2 font-display text-base font-bold text-fg">{s.t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Pricing — live, in the visitor's currency ───────────────────── */}
        <section id="pricing" className="mt-16 scroll-mt-20">
          <h2 className="font-display text-2xl font-bold text-fg sm:text-3xl">
            <span className="text-gradient-accent">{t("products.common.pricing")}</span>
          </h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="border-gradient glow-teal rounded-3xl bg-panel/40 p-6 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-wide text-faint">{t(`${ns}.pricing.setupTitle`)}</p>
              <p className="mt-2 font-display text-3xl font-bold text-fg sm:text-4xl">
                {setup ? (
                  <>
                    {t("products.common.from")} <span className="text-gradient-accent">{money(setup.offer ?? setup.from)}</span>
                  </>
                ) : (
                  t("products.common.onRequest")
                )}
              </p>
              <p className="mt-1 text-sm text-muted">
                {t("products.common.oneTime")}{setup?.leadTime ? ` · ${setup.leadTime}` : ""}
              </p>
              <ul className="mt-5 space-y-2">
                {setupIncludes.map((x) => (
                  <li key={x} className="flex items-start gap-2 text-sm text-fg sm:text-base">
                    <Check size={15} className="mt-1 shrink-0 text-brand-luq" /> <span>{x}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass rounded-3xl p-6 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-wide text-faint">{t(`${ns}.pricing.managedTitle`)}</p>
              <p className="mt-2 font-display text-3xl font-bold text-fg sm:text-4xl">
                {managed ? (
                  <>
                    {t("products.common.from")} <span className="text-gradient-accent">{money(managed.offer ?? managed.from)}</span>
                    <span className="ml-1 font-display text-lg text-muted">{t("products.common.perMonth")}</span>
                  </>
                ) : (
                  t("products.common.onRequest")
                )}
              </p>
              <p className="mt-1 text-sm text-muted">{t("products.common.cancelAnytime")}</p>
              <ul className="mt-5 space-y-2">
                {managedIncludes.map((x) => (
                  <li key={x} className="flex items-start gap-2 text-sm text-fg sm:text-base">
                    <Check size={15} className="mt-1 shrink-0 text-brand-luq" /> <span>{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-faint">{t(`${ns}.pricing.note`)}</p>
        </section>

        {/* ── Testimonials for this product ───────────────────────────────── */}
        <Testimonials product={product} className="mt-16" />

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold text-fg sm:text-3xl">
            <span className="text-gradient-accent">{t("products.common.faq")}</span>
          </h2>
          <div className="mt-6 space-y-2">
            {faq.map((f) => (
              <details key={f.q} className="glass group rounded-2xl p-5">
                <summary className="cursor-pointer list-none font-display text-base font-bold text-fg sm:text-lg">
                  {f.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Final CTA ───────────────────────────────────────────────────── */}
        <section className="mt-16 rounded-3xl border border-teal-glow/25 bg-teal-glow/[0.06] p-6 sm:p-8">
          <h2 className="font-display text-2xl font-bold text-fg sm:text-3xl">{t(`${ns}.finalTitle`)}</h2>
          <p className="mt-2 max-w-2xl text-base text-muted sm:text-lg">{t(`${ns}.finalBody`)}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <PrimaryCta />
            {booking && <WhatsAppCta variant="inline" context="pricing" />}
            <Link to={product === "office" ? "/whatsapp-store" : "/whatsapp-office"}>
              <Button variant="ghost" size="lg">
                {t(`products.${product === "office" ? "store" : "office"}.shortName`)} <ArrowRight size={18} />
              </Button>
            </Link>
          </div>
        </section>

        <SiteFooter />
      </main>
    </div>
  );
}
