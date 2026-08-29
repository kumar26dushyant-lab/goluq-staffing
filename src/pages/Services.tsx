import { useNavigate, Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  PhoneCall, Phone, MessageCircle, Megaphone, MessageSquare, Send, PhoneMissed,
  Check, Clock, ArrowRight, Info, Wrench, type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { TopBar } from "../components/TopBar";
import { Button } from "../components/ui/Button";
import { WhatsAppCta } from "../components/WhatsAppCta";
import { usePricing, useMoney } from "../lib/siteConfig";

/** Service id → icon. Order here is the order on the page. */
const ICONS: Record<string, LucideIcon> = {
  tollfree: PhoneCall,
  virtualNumber: Phone,
  waApi: MessageCircle,
  voiceCampaign: Megaphone,
  txnSms: MessageSquare,
  promoSms: Send,
  missedCall: PhoneMissed,
};

/**
 * Route "/services" — the communication catalogue.
 *
 * Commercial logic: a toll-free number or a WhatsApp API is a KNOWN, budgeted
 * purchase, which makes it a far easier first sale than custom software. It is
 * the wedge. The margin is in what we build on top, so every card closes on the
 * one thing a telecom reseller cannot say — that we also build the system which
 * uses the service.
 *
 * Prices come from the same cockpit-editable `pricing` table as the software
 * catalogue, filtered to category "comms".
 */
export function Services() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const pricing = usePricing();
  const money = useMoney();

  const ids = Object.keys(ICONS).filter((id) => pricing.some((p) => p.id === id));
  const priceOf = (id: string) => pricing.find((p) => p.id === id);

  return (
    <div className="relative min-h-dvh">
      <TopBar showBack onBack={() => navigate("/")} />

      <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-4 sm:px-8">
        {/* Hero */}
        <section className="py-8 sm:py-12">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-brand-luq sm:text-sm">
            {t("comms.kicker")}
          </p>
          <motion.h1
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 max-w-3xl text-balance font-display text-3xl font-bold leading-[1.12] text-fg sm:text-5xl"
          >
            <span className="text-gradient-accent">{t("comms.title")}</span>
          </motion.h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            {t("comms.subtitle")}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/build#enquiry">
              <Button size="lg">
                {t("comms.ctaQuote")} <ArrowRight size={18} />
              </Button>
            </Link>
          </div>
          <WhatsAppCta variant="bar" context="pricing" className="mt-4 max-w-sm" />
        </section>

        {/* The differentiator, stated before the price list rather than after */}
        <section className="border-gradient glow-teal rounded-3xl bg-panel/40 p-6 sm:p-8">
          <h2 className="flex items-center gap-2.5 font-display text-xl font-bold text-fg sm:text-2xl">
            <Wrench size={22} className="shrink-0 text-brand-luq" />
            {t("comms.edgeTitle")}
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted sm:text-lg">
            {t("comms.edgeBody")}
          </p>
        </section>

        {/* Services */}
        <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ids.map((id, i) => {
            const Icon = ICONS[id];
            const p = priceOf(id);
            const bullets = t(`comms.items.${id}.b`, { returnObjects: true }) as string[];
            return (
              <motion.div
                key={id}
                initial={reduced ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i, 5) * 0.05, duration: 0.45 }}
                className="glass glass-interactive flex flex-col rounded-2xl p-6"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-teal-glow/12 text-brand-luq ring-1 ring-teal-glow/25">
                  <Icon size={22} />
                </span>

                <h3 className="mt-4 font-display text-lg font-bold text-fg sm:text-xl">
                  {t(`comms.items.${id}.name`)}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-muted">
                  {t(`comms.items.${id}.desc`)}
                </p>

                <ul className="mt-4 space-y-2">
                  {bullets.map((b, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-muted sm:text-base">
                      <Check size={15} className="mt-1 shrink-0 text-brand-luq" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {/* What a reseller cannot offer. */}
                <p className="mt-4 rounded-xl border border-teal-glow/25 bg-teal-glow/[0.06] p-3 text-sm leading-relaxed text-fg">
                  <span className="font-semibold text-brand-luq">+ </span>
                  {t(`comms.items.${id}.build`)}
                </p>

                <div className="mt-5 border-t border-hairline/10 pt-4">
                  {p && (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wide text-faint">
                        {t("comms.setupLabel")}
                      </p>
                      <p className="text-gradient-accent font-display text-2xl font-bold tabular-nums">
                        {money(p.offer ?? p.from)}
                        {p.offer != null && (
                          <span className="ml-2 font-display text-base text-faint line-through">
                            {money(p.from)}
                          </span>
                        )}
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
                        <Clock size={14} className="shrink-0 text-brand-luq" />
                        {t("comms.goLive")} {p.leadTime}
                      </p>
                    </>
                  )}
                  <Link to={`/build?service=${id}#enquiry`} className="mt-4 block">
                    <Button size="md" full>
                      {t("comms.ctaQuote")} <ArrowRight size={16} />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </section>

        {/* Usage is billed separately — said plainly, not buried */}
        <p className="mt-6 flex items-start gap-2 text-sm leading-relaxed text-faint">
          <Info size={15} className="mt-0.5 shrink-0" />
          {t("comms.usageNote")}
        </p>

        {/* Compliance realities a competitor would leave until after the sale */}
        <section className="mt-8 flex items-start gap-3 rounded-2xl border border-warn/25 bg-warn/[0.06] p-5 sm:p-6">
          <Info size={20} className="mt-0.5 shrink-0 text-warn" />
          <div>
            <h2 className="font-display text-base font-bold text-fg sm:text-lg">
              {t("comms.complianceTitle")}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted sm:text-base">
              {t("comms.complianceBody")}
            </p>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link to="/build#enquiry">
            <Button size="lg">
              {t("comms.ctaQuote")} <ArrowRight size={18} />
            </Button>
          </Link>
          <WhatsAppCta variant="bar" context="pricing" className="max-w-xs" />
        </div>
      </main>
    </div>
  );
}
