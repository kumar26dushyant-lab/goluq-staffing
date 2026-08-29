import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  MessageCircle, PhoneCall, Radio, Workflow, ArrowRight, Check, type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/Button";
import { WhatsAppCta } from "./WhatsAppCta";
import { usePricing, useMoney, useSiteConfig } from "../lib/siteConfig";

/** The three things we sell, in the order a business owner recognises them. */
const CARDS: { id: string; icon: LucideIcon }[] = [
  { id: "wa", icon: MessageCircle },
  { id: "voice", icon: PhoneCall },
  { id: "software", icon: Workflow },
];

/**
 * The homepage hero.
 *
 * Leads with communication rather than Digital Employees, deliberately: a shop
 * owner in a tier-2 city already knows what a WhatsApp campaign or a missed-call
 * number is, and has probably watched a competitor use one. "Digital Receptionist"
 * needs a paragraph before it means anything. Selling the familiar thing first is
 * the shorter route to a first payment — and the first payment is what makes the
 * software conversation possible at all.
 *
 * The phone is NOT a mockup. It is a real exchange with the guide that answers on
 * our own WhatsApp number, with the live catalogue price dropped in. Anyone can
 * draw a chat bubble; the claim is only worth making because a visitor can send
 * the same message from the same page and get the same answer.
 */
export function CommsHero({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const money = useMoney();
  const pricing = usePricing();
  const hasWhatsApp = Boolean(useSiteConfig()?.whatsapp);

  const tollfree = pricing.find((p) => p.id === "tollfree");
  const price = tollfree ? money(tollfree.offer ?? tollfree.from) : "";

  const rise = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section className={className} aria-labelledby="comms-hero-title">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ── Left: the pitch ─────────────────────────────────────────── */}
        <div>
          <motion.p
            {...rise(0.02)}
            className="inline-block rounded-full border border-teal-glow/30 bg-teal-glow/[0.08] px-4 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.22em] text-brand-luq sm:text-xs"
          >
            {t("commsHero.eyebrow")}
          </motion.p>

          <motion.h1
            {...rise(0.1)}
            id="comms-hero-title"
            className="mt-5 max-w-2xl text-balance font-display text-[2rem] font-bold leading-[1.12] text-fg sm:text-5xl"
            style={{ textShadow: "0 2px 24px rgb(0 0 0 / 0.35)" }}
          >
            {t("commsHero.title")}{" "}
            <span className="text-gradient-accent">{t("commsHero.titleAccent")}</span>
          </motion.h1>

          <motion.p
            {...rise(0.2)}
            className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg"
          >
            {t("commsHero.subtitle")}
          </motion.p>

          <motion.div {...rise(0.3)} className="mt-7 flex flex-wrap items-center gap-3">
            {/* One tap to a real conversation is the highest-converting thing on
                the page, so it is the primary action — not a phone number that
                cannot ring, and not a form nobody fills in.
                WhatsAppCta renders NOTHING when the public number is unset, which
                has happened before and silently removed every contact route on the
                site. The hero must never be left without a primary action, so it
                falls back to the enquiry form rather than to empty space. */}
            {hasWhatsApp ? (
              <WhatsAppCta variant="inline" context="pricing" />
            ) : (
              <Link to="/build#enquiry">
                <Button size="lg">
                  {t("commsHero.ctaFallback")} <ArrowRight size={18} />
                </Button>
              </Link>
            )}
            <Link to="/services">
              <Button variant="ghost" size="lg">
                {t("commsHero.ctaSecondary")} <ArrowRight size={18} />
              </Button>
            </Link>
          </motion.div>

          {/* Real numbers only. An invented "150+ businesses" would undo every
              honesty rule the rest of this site is built on, and it is the one
              claim a competitor could disprove with a screenshot. */}
          <motion.dl
            {...rise(0.4)}
            className="mt-9 flex flex-wrap gap-x-9 gap-y-4 border-t border-hairline/15 pt-6"
          >
            {["claims", "offices", "always"].map((k) => (
              <div key={k}>
                <dt className="font-display text-xl font-bold text-fg sm:text-2xl">
                  {t(`commsHero.stats.${k}.v`)}
                </dt>
                <dd className="mt-0.5 max-w-[13rem] text-sm text-muted">
                  {t(`commsHero.stats.${k}.l`)}
                </dd>
              </div>
            ))}
          </motion.dl>
        </div>

        {/* ── Right: a real conversation ──────────────────────────────── */}
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-[19rem]"
        >
          <div className="glass glow-teal overflow-hidden rounded-[2rem] p-3 shadow-glass">
            <div className="overflow-hidden rounded-[1.5rem] bg-panel/70">
              {/* Header */}
              <div className="flex items-center gap-2.5 border-b border-hairline/10 bg-abyss/40 px-4 py-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-teal-glow/15 text-brand-luq ring-1 ring-teal-glow/30">
                  <MessageCircle size={15} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold text-fg">
                    {t("commsHero.phone.name")}
                  </p>
                  <p className="flex items-center gap-1.5 text-[0.7rem] text-brand-luq">
                    <Radio size={10} className="shrink-0" />
                    {t("commsHero.phone.status")}
                  </p>
                </div>
              </div>

              {/* The exchange */}
              <div className="space-y-2.5 px-3.5 py-4">
                <Bubble side="them" delay={reduced ? 0 : 0.9} reduced={reduced}>
                  {t("commsHero.phone.q")}
                </Bubble>
                <Bubble side="us" delay={reduced ? 0 : 1.5} reduced={reduced}>
                  {t("commsHero.phone.a1", { price })}
                </Bubble>
                <Bubble side="us" delay={reduced ? 0 : 2.1} reduced={reduced}>
                  {t("commsHero.phone.a2")}
                </Bubble>
              </div>
            </div>
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-sm text-muted">
            <Check size={14} className="shrink-0 text-brand-luq" />
            {t("commsHero.phone.caption")}
          </p>
        </motion.div>
      </div>

      {/* ── What we actually do ─────────────────────────────────────── */}
      <div className="mt-14 grid gap-4 sm:grid-cols-3">
        {CARDS.map(({ id, icon: Icon }, i) => (
          <motion.div
            key={id}
            initial={reduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: Math.min(i, 3) * 0.06, duration: 0.5 }}
            className="glass glass-interactive rounded-2xl p-6"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-glow/12 text-brand-luq ring-1 ring-teal-glow/25">
              <Icon size={20} />
            </span>
            <h2 className="mt-4 font-display text-lg font-bold text-fg">
              {t(`commsHero.cards.${id}.t`)}
            </h2>
            <p className="mt-2 text-base leading-relaxed text-muted">
              {t(`commsHero.cards.${id}.d`)}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Bubble({
  side,
  delay,
  reduced,
  children,
}: {
  side: "us" | "them";
  delay: number;
  reduced: boolean | null;
  children: React.ReactNode;
}) {
  const us = side === "us";
  return (
    <motion.p
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`max-w-[88%] text-[0.82rem] leading-relaxed ${
        us
          ? "rounded-[1rem_1rem_1rem_0.25rem] border border-teal-glow/25 bg-teal-glow/[0.09] px-3 py-2 text-fg"
          : "ml-auto rounded-[1rem_1rem_0.25rem_1rem] bg-panel px-3 py-2 text-muted ring-1 ring-hairline/15"
      }`}
    >
      {children}
    </motion.p>
  );
}
