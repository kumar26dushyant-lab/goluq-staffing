import { motion, useReducedMotion } from "framer-motion";
import { Eye } from "lucide-react";

/**
 * The signature CTA (BUILD_SPEC §STEP 3). Massive pulsing cyan-and-white neon.
 * Keep the exact phonetic label "Go Luq" (reads like "Go Look"). An eye motif
 * reinforces "go look" without printing the word. Continuous soft pulse, stronger
 * on hover. Pulse rings disabled under reduced-motion.
 */
export function GoLuqButton({
  onClick,
  label = "Go Luq",
  className = "",
}: {
  onClick?: () => void;
  label?: string;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <div className={`relative inline-grid place-items-center ${className}`}>
      {/* Expanding pulse rings */}
      {!reduced && (
        <>
          <span className="pointer-events-none absolute inset-0 rounded-full border border-teal-glow/40 animate-pulse-ring" />
          <span
            className="pointer-events-none absolute inset-0 rounded-full border border-teal-glow/30 animate-pulse-ring"
            style={{ animationDelay: "1.2s" }}
          />
        </>
      )}

      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        animate={reduced ? undefined : { boxShadow: [
          "0 0 24px rgba(34,211,238,0.45)",
          "0 0 44px rgba(34,211,238,0.65)",
          "0 0 24px rgba(34,211,238,0.45)",
        ] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="relative flex items-center gap-3.5 rounded-full px-12 py-5 font-display text-2xl font-bold tracking-tight text-base"
        style={{
          background:
            "linear-gradient(135deg, rgb(var(--c-teal-glow)) 0%, rgb(var(--c-teal-neon)) 100%)",
        }}
      >
        <Eye size={26} strokeWidth={2.4} />
        {label}
      </motion.button>
    </div>
  );
}
