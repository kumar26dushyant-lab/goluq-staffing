import { Check, Globe, Smartphone, ShieldOff, MessageCircle, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

export type CrossSellId = "website" | "app" | "local" | "whatsapp";

const ITEMS: { id: CrossSellId; icon: LucideIcon; highlight?: boolean }[] = [
  { id: "website", icon: Globe },
  { id: "app", icon: Smartphone },
  { id: "local", icon: ShieldOff, highlight: true }, // Zero-Internet Local Software
  { id: "whatsapp", icon: MessageCircle },
];

/** Cross-sell matrix (BUILD_SPEC §STEP 5). Zero-Internet option is emphasised. */
export function CrossSellGrid({
  selected,
  onToggle,
}: {
  selected: CrossSellId[];
  onToggle: (id: CrossSellId) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const on = selected.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => onToggle(item.id)}
            className={`group flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
              on
                ? "border-teal-glow/50 bg-teal-glow/10"
                : item.highlight
                ? "border-teal-glow/30 bg-teal-glow/[0.04]"
                : "border-hairline/12 bg-panel/30"
            }`}
          >
            <span
              className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${
                on ? "border-teal-glow bg-teal-glow text-ink" : "border-hairline/30"
              }`}
            >
              {on && <Check size={13} strokeWidth={3.5} />}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 font-display text-base font-semibold text-fg sm:text-lg">
                <Icon size={18} className="text-brand-luq" />
                {item.highlight && <span aria-hidden="true">🔒</span>}
                {t(`booking.cross.${item.id}`)}
              </span>
              {item.highlight && (
                <span className="mt-1 block text-sm text-muted">
                  {t("booking.cross.localDesc")}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
