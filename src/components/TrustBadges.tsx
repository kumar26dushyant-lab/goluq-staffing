import { useTranslation } from "react-i18next";

/** Defensible trust badges (BUILD_SPEC §9) — no certification/government claims. */
const BADGES: { emoji: string; key: string }[] = [
  { emoji: "🛡️", key: "encrypted" },
  { emoji: "💼", key: "control" },
  { emoji: "🇮🇳", key: "india" },
  { emoji: "🔒", key: "safe" },
  { emoji: "🎓", key: "training" },
];

export function TrustBadges({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 ${className}`}>
      {BADGES.map((b) => (
        <span
          key={b.key}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted sm:text-base"
        >
          <span aria-hidden="true" className="text-lg">{b.emoji}</span>
          {t(`trust.${b.key}`)}
        </span>
      ))}
    </div>
  );
}
