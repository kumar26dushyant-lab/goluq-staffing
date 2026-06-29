import { Globe, Smartphone, ShieldOff, MessageCircle, ArrowUp, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/Button";

const ITEMS: { id: string; icon: LucideIcon; highlight?: boolean }[] = [
  { id: "website", icon: Globe },
  { id: "app", icon: Smartphone },
  { id: "local", icon: ShieldOff, highlight: true },
  { id: "whatsapp", icon: MessageCircle },
];

/**
 * Homepage "build other software" band — mirrors the booking cross-sell, but as
 * marketing (own-it-don't-rent-it). CTA scrolls back up to start a free trial.
 */
export function HomeBuild({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <section className={`glass rounded-3xl p-6 sm:p-8 ${className}`}>
      <p className="font-mono text-sm uppercase tracking-[0.28em] text-brand-luq">
        {t("homeBuild.kicker")}
      </p>
      <h2 className="mt-2 text-balance font-display text-2xl font-bold text-fg sm:text-4xl">
        {t("homeBuild.title")}
      </h2>
      <p className="mt-2 max-w-2xl text-base text-muted sm:text-lg">{t("homeBuild.subtitle")}</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`flex items-start gap-3 rounded-xl border p-4 ${
                item.highlight ? "border-teal-glow/35 bg-teal-glow/[0.06]" : "border-hairline/12 bg-panel/30"
              }`}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-teal-glow/10 text-brand-luq ring-1 ring-teal-glow/20">
                <Icon size={20} />
              </span>
              <div>
                <p className="flex items-center gap-2 font-display text-base font-semibold text-fg sm:text-lg">
                  {item.highlight && <span aria-hidden="true">🔒</span>}
                  {t(`booking.cross.${item.id}`)}
                </p>
                {item.highlight && (
                  <p className="mt-0.5 text-sm text-muted">{t("booking.cross.localDesc")}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Button
        size="lg"
        className="mt-7"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <ArrowUp size={18} /> {t("homeBuild.cta")}
      </Button>
    </section>
  );
}
