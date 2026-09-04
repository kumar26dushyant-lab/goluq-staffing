import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ROLES } from "../content/roles";
import type { RoleId } from "../state/useAppState";

/**
 * Role selection as "deploy slots" — full-width console rows you arm, not a card
 * grid. Each row: index → icon, label, blurb, and a sweep of teal light that
 * floods in from the left on hover/focus. Distinctive, scannable, mobile-true.
 */
export function RoleSlots({ onPick }: { onPick: (id: RoleId) => void }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();

  return (
    <ul className="flex w-full flex-col gap-2.5" aria-label={t("common.selectRole")}>
      {ROLES.map((role, i) => {
        const Icon = role.icon;
        const idx = String(i + 1).padStart(2, "0");
        return (
          <motion.li
            key={role.id}
            initial={reduced ? false : { opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              type="button"
              onClick={() => onPick(role.id)}
              className="group glass relative flex w-full items-center gap-3 overflow-hidden rounded-2xl px-4 py-4 text-left transition-transform duration-300 ease-cinematic hover:translate-x-1 sm:gap-4 sm:px-6 sm:py-5"
            >
              {/* Teal flood sweep on hover/focus */}
              <span className="pointer-events-none absolute inset-y-0 left-0 w-0 bg-gradient-to-r from-teal-glow/22 to-transparent transition-[width] duration-500 ease-cinematic group-hover:w-full group-focus-visible:w-full" />

              {/* Index → morphs to icon on hover */}
              <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-glow/10 ring-1 ring-teal-glow/20 sm:h-14 sm:w-14">
                <span className="font-mono text-base font-semibold text-faint transition-opacity duration-200 group-hover:opacity-0">
                  {idx}
                </span>
                <Icon
                  size={26}
                  strokeWidth={2}
                  className="absolute text-brand-luq opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                />
              </span>

              <span className="relative min-w-0 flex-1">
                <span className="block font-display text-lg font-bold leading-snug text-fg sm:truncate sm:text-xl">
                  {t(`roles.${role.id}.label`)}
                </span>
                <span className="mt-0.5 block text-sm leading-snug text-muted sm:truncate sm:text-base">
                  {t(`roles.${role.id}.blurb`)}
                </span>
              </span>

              <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-faint transition-all duration-300 group-hover:bg-teal-glow/20 group-hover:text-brand-luq">
                <ArrowRight size={20} className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}
