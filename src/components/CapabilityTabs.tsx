import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Workflow,
  MessageCircle,
  Users,
  Globe,
  Smartphone,
  ShieldOff,
  Network,
  Check,
  Clock,
  ArrowRight,
  Sparkles,
  Info,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { CATALOGUE, inr, type TierId } from "../content/catalogue";
import { Button } from "./ui/Button";

const ICONS: Record<TierId, LucideIcon> = {
  automation: Workflow,
  whatsapp: MessageCircle,
  digitalEmployee: Users,
  website: Globe,
  app: Smartphone,
  offline: ShieldOff,
  platform: Network,
};

/**
 * "Everything we build" — the homepage's answer to what GoLuQ actually is.
 *
 * Digital Employees are ONE tab here, deliberately. The old framing made them
 * the whole company, which capped the addressable work at a ₹799/mo product;
 * this presents the full ladder from a ₹3,000 automation to a multi-branch
 * platform, and lets a visitor self-select the rung they can afford today.
 *
 * Tabs hand off to different funnels: the Digital Employee tab scrolls to the
 * live demo deck on this page, build work goes to /build, small automations go
 * straight to an enquiry.
 */
export function CapabilityTabs({
  className = "",
  onPickDemo,
}: {
  className?: string;
  onPickDemo?: () => void;
}) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [active, setActive] = useState<TierId>("automation");

  const offering = CATALOGUE.find((o) => o.id === active) ?? CATALOGUE[0];
  const Icon = ICONS[active];
  const bullets = t(`catalogue.items.${active}.b`, { returnObjects: true }) as string[];

  return (
    <section className={className} aria-labelledby="catalogue-title">
      <p className="font-mono text-sm uppercase tracking-[0.28em] text-brand-luq">
        {t("catalogue.kicker")}
      </p>
      <h2 id="catalogue-title" className="mt-2 text-balance font-display text-2xl font-bold sm:text-4xl">
        <span className="text-gradient-accent">{t("catalogue.title")}</span>
      </h2>
      <p className="mt-3 max-w-3xl text-base text-muted sm:text-lg">{t("catalogue.subtitle")}</p>

      {/* Tab rail — horizontally scrollable on mobile rather than wrapping into
          a wall of chips that pushes the panel off screen. The right-edge fade is
          the only cue a phone user gets that there are more tabs, so keep it. */}
      <div className="relative mt-7">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 lg:hidden"
          style={{ background: "linear-gradient(to right, transparent, rgb(var(--c-base)))" }}
          aria-hidden="true"
        />
        <div
          role="tablist"
          aria-label={t("catalogue.kicker")}
          className="flex gap-2 overflow-x-auto pb-2 pr-8 [scrollbar-width:none] lg:pr-0 [&::-webkit-scrollbar]:hidden"
        >
        {CATALOGUE.map((o) => {
          const TabIcon = ICONS[o.id];
          const on = o.id === active;
          return (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls="catalogue-panel"
              onClick={() => setActive(o.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all sm:text-base ${
                on
                  ? "bg-teal-glow/20 text-brand-luq ring-1 ring-teal-glow/45"
                  : "glass glass-interactive text-muted hover:text-fg"
              }`}
            >
              <TabIcon size={16} className={on ? "text-brand-luq" : ""} />
              {t(`catalogue.items.${o.id}.name`)}
            </button>
          );
        })}
        </div>
      </div>

      {/* Panel */}
      <div id="catalogue-panel" role="tabpanel" className="glass glow-teal mt-4 rounded-3xl p-6 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 1 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start"
          >
            <div>
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-teal-glow/12 text-brand-luq ring-1 ring-teal-glow/25">
                <Icon size={22} />
              </span>
              <h3 className="mt-4 font-display text-xl font-bold text-fg sm:text-2xl">
                {t(`catalogue.items.${active}.name`)}
              </h3>
              <p className="mt-2 text-base leading-relaxed text-muted sm:text-lg">
                {t(`catalogue.items.${active}.desc`)}
              </p>
              <ul className="mt-5 space-y-2.5">
                {bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-base text-fg">
                    <Check size={17} className="mt-1 shrink-0 text-brand-luq" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Price + lead time + the right CTA for this rung of the ladder */}
            <div className="rounded-2xl border border-hairline/15 bg-panel/40 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-faint">
                {t("catalogue.from")}
              </p>
              <p className="text-gradient-accent mt-1 font-display text-3xl font-bold tabular-nums sm:text-4xl">
                {inr(offering.fromInr)}
              </p>
              <p className="text-base font-semibold text-muted">
                {offering.recurring ? t("catalogue.perMonth") : t("catalogue.oneTime")}
              </p>

              <p className="mt-4 flex items-center gap-2 text-base text-muted">
                <Clock size={16} className="shrink-0 text-brand-luq" />
                {t("catalogue.leadTimeLabel")} {offering.leadTime}
              </p>

              <div className="mt-5">
                {offering.cta === "demo" && (
                  <Button size="md" full onClick={onPickDemo}>
                    {t("catalogue.ctaDemo")} <ArrowRight size={16} />
                  </Button>
                )}
                {offering.cta === "build" && (
                  <Link to="/build" className="block">
                    <Button size="md" full>
                      {t("catalogue.ctaBuild")} <ArrowRight size={16} />
                    </Button>
                  </Link>
                )}
                {offering.cta === "enquiry" && (
                  <Link to="/build#enquiry" className="block">
                    <Button size="md" full>
                      {t("catalogue.ctaEnquiry")} <ArrowRight size={16} />
                    </Button>
                  </Link>
                )}
              </div>

              {/* Scope disclaimer sits WITH the price, not buried in a footer —
                  the point is that nobody can say they didn't see it. */}
              <p className="mt-3 text-xs leading-relaxed text-faint">
                {t("catalogue.disclaimerShort")}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Full pricing explanation — framed as transparency, not as a caveat. */}
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-hairline/15 bg-panel/30 p-5">
        <Info size={20} className="mt-0.5 shrink-0 text-brand-luq" />
        <div>
          <p className="font-display text-base font-bold text-fg sm:text-lg">
            {t("catalogue.disclaimerTitle")}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted sm:text-base">
            {t("catalogue.disclaimerBody")}
          </p>
        </div>
      </div>

      {/* The anti-restriction note — "if we build, we build for everyone". */}
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-teal-glow/25 bg-teal-glow/[0.05] p-5">
        <Sparkles size={20} className="mt-0.5 shrink-0 text-brand-luq" />
        <div>
          <p className="font-display text-base font-bold text-fg sm:text-lg">
            {t("catalogue.anythingTitle")}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted sm:text-base">
            {t("catalogue.anythingBody")}
          </p>
        </div>
      </div>
    </section>
  );
}
