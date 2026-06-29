import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * A soft radial light that follows the pointer — reinforces the "Go *Look*"
 * idea: the cursor is a torch sweeping the dark ops deck. Desktop/fine-pointer
 * only; disabled on touch and reduced-motion. Updates a CSS var via rAF (cheap).
 */
export function Spotlight() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight * 0.3;
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf)
        raf = requestAnimationFrame(() => {
          el.style.setProperty("--mx", `${x}px`);
          el.style.setProperty("--my", `${y}px`);
          raf = 0;
        });
    };
    el.style.opacity = "1";
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-[5] opacity-0 transition-opacity duration-700"
      style={{
        background:
          "radial-gradient(420px circle at var(--mx, 50%) var(--my, 30%), rgb(var(--c-teal-glow) / 0.10), transparent 70%)",
      }}
    />
  );
}
