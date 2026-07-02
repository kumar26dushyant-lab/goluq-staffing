import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useNudge } from "../lib/useNudge";

/**
 * A polite, dismissable nudge bubble driven by useNudge. Sits bottom-left (the
 * chat launcher is bottom-right, so they never collide). aria-live so screen
 * readers announce it; reduced-motion shows it without the slide.
 */
export function NudgeBubble({ stepKey }: { stepKey: string }) {
  const { nudge, dismiss } = useNudge(stepKey);
  const reduced = useReducedMotion();

  return (
    <AnimatePresence>
      {nudge && (
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          role="status"
          aria-live="polite"
          className="fixed z-40 flex max-w-[280px] items-start gap-2.5 rounded-2xl border border-teal-glow/30 p-4 shadow-neon sm:max-w-xs"
          style={{
            background: "rgb(var(--c-abyss) / 0.95)",
            backdropFilter: "blur(16px)",
            left: "max(1rem, env(safe-area-inset-left))",
            bottom: "max(1.25rem, env(safe-area-inset-bottom))",
          }}
        >
          <Sparkles size={18} className="mt-0.5 shrink-0 text-brand-luq" />
          <p className="text-sm font-medium leading-relaxed text-fg">{nudge}</p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="-mr-1 -mt-1 shrink-0 rounded-full p-1 text-faint hover:text-fg"
          >
            <X size={15} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
