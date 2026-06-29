import { motion, useReducedMotion } from "framer-motion";

/**
 * Word-by-word kinetic reveal used for the assistant's spoken lines (the text
 * stays in sync with the eventual speechSynthesis layer). Reduced-motion shows
 * the whole line at once. `key`-change re-runs the reveal (e.g. on language switch).
 */
export function KineticText({
  text,
  className = "",
  delay = 0,
  stagger = 0.028,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const reduced = useReducedMotion();
  const words = text.split(" ");

  if (reduced) return <p className={className}>{text}</p>;

  return (
    <p className={className} aria-label={text}>
      {words.map((w, i) => (
        <motion.span
          key={`${i}-${w}`}
          aria-hidden="true"
          className="inline-block"
          initial={{ opacity: 0, y: "0.4em", filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            delay: delay + i * stagger,
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </p>
  );
}
