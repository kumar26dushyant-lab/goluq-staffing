import { motion, useReducedMotion } from "framer-motion";
import { Infinity as InfinityIcon, IndianRupee, CircleSlash, CalendarOff } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Instrument-style "live readout" — the four reasons a Digital Employee changes
 * the math, shown as glowing gauges rather than a paragraph. Sits beside the
 * deploy slots on desktop, becomes a horizontal scroll strip on mobile.
 */
export function StatReadout({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();

  const stats = [
    { icon: InfinityIcon, label: t("readout.alwaysOn"), val: t("readout.alwaysOnVal") },
    { icon: IndianRupee, label: t("readout.salary"), val: t("readout.salaryVal") },
    { icon: CircleSlash, label: t("readout.errors"), val: t("readout.errorsVal") },
    { icon: CalendarOff, label: t("readout.leave"), val: t("readout.leaveVal") },
  ];

  return (
    <div className={className}>
      <p className="mb-3 font-mono text-[0.7rem] uppercase tracking-[0.28em] text-faint">
        {t("readout.title")}
      </p>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-1">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.08, duration: 0.5 }}
              className="glass flex items-center gap-3 rounded-xl px-3.5 py-3"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-glow/10 text-brand-luq ring-1 ring-teal-glow/20">
                <Icon size={17} strokeWidth={2.2} />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-lg font-bold leading-none text-fg">
                  {s.val}
                </span>
                <span className="block truncate text-[0.72rem] text-muted">{s.label}</span>
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
