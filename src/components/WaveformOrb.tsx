import { motion, useReducedMotion } from "framer-motion";

/**
 * Animated audio-waveform panel standing in for the Digital Staffing Assistant
 * (BUILD_SPEC §STEP 1). In Phase C this gets driven by speechSynthesis events;
 * for now it self-animates a gentle "idle breathing" waveform. `speaking` boosts
 * amplitude. Reduced-motion → a calm static bar set.
 */
export function WaveformOrb({
  speaking = false,
  bars = 28,
  className = "",
}: {
  speaking?: boolean;
  bars?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <div
      className={`flex items-end justify-center gap-[3px] ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: bars }).map((_, i) => {
        // Bell-ish envelope so the centre bars are tallest
        const center = bars / 2;
        const dist = Math.abs(i - center) / center;
        const baseH = 14 + (1 - dist) * 30;
        const amp = speaking ? 1 : 0.45;

        return (
          <motion.span
            key={i}
            className="w-[3px] rounded-full"
            style={{
              background:
                "linear-gradient(to top, rgb(var(--c-teal-neon)), rgb(var(--c-teal-glow)))",
              boxShadow: "0 0 8px rgb(var(--c-teal-glow) / 0.5)",
            }}
            animate={
              reduced
                ? { height: baseH * 0.6 }
                : {
                    height: [baseH * 0.4 * amp, baseH * amp, baseH * 0.55 * amp],
                  }
            }
            transition={
              reduced
                ? undefined
                : {
                    duration: 0.7 + (i % 5) * 0.12,
                    repeat: Infinity,
                    repeatType: "mirror",
                    ease: "easeInOut",
                    delay: i * 0.03,
                  }
            }
          />
        );
      })}
    </div>
  );
}
