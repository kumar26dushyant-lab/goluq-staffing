import { PhoneCall, MessageCircle, Megaphone, MessageSquare, ArrowRight, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/Button";
import { inr } from "../content/catalogue";
import { usePricing } from "../lib/siteConfig";

/** The four a business owner recognises instantly. The rest live on /services. */
const ITEMS: { id: string; icon: LucideIcon }[] = [
  { id: "tollfree", icon: PhoneCall },
  { id: "waApi", icon: MessageCircle },
  { id: "voiceCampaign", icon: Megaphone },
  { id: "txnSms", icon: MessageSquare },
];

/**
 * Homepage band for the communication catalogue.
 *
 * This is the only route to /services on a phone — the header link is desktop
 * only, and nearly all traffic is mobile, so this band is not decoration.
 *
 * It leads with price because a toll-free number is a purchase business owners
 * have already budgeted for: it is the cheapest possible first "yes", and the
 * software conversation follows the customer rather than preceding them.
 */
export function HomeServices({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const pricing = usePricing();
  const items = ITEMS.filter((i) => pricing.some((p) => p.id === i.id));
  if (!items.length) return null;

  return (
    <section className={`glass rounded-3xl p-6 sm:p-8 ${className}`}>
      <p className="font-mono text-sm uppercase tracking-[0.28em] text-brand-luq">
        {t("comms.kicker")}
      </p>
      <h2 className="mt-2 text-balance font-display text-2xl font-bold sm:text-4xl">
        <span className="text-gradient-accent">{t("comms.homeTitle")}</span>
      </h2>
      <p className="mt-2 max-w-2xl text-base text-muted sm:text-lg">{t("comms.homeSubtitle")}</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map(({ id, icon: Icon }) => {
          const p = pricing.find((x) => x.id === id);
          return (
            <Link
              key={id}
              to="/services"
              className="glass-interactive flex items-start gap-3 rounded-xl border border-hairline/12 bg-panel/30 p-4"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-teal-glow/10 text-brand-luq ring-1 ring-teal-glow/20">
                <Icon size={20} />
              </span>
              <div className="min-w-0">
                <p className="font-display text-base font-semibold text-fg sm:text-lg">
                  {t(`comms.items.${id}.name`)}
                </p>
                {p && (
                  <p className="mt-0.5 text-sm text-muted">
                    {t("comms.setupFrom")}{" "}
                    <span className="font-semibold text-brand-luq tabular-nums">
                      {inr(p.offerInr || p.fromInr)}
                    </span>
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <Link to="/services" className="mt-7 inline-block">
        <Button size="lg">
          {t("comms.homeCta")} <ArrowRight size={18} />
        </Button>
      </Link>
    </section>
  );
}
