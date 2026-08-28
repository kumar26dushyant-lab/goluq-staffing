import { Component, lazy, Suspense, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";

const HoloScene = lazy(() => import("./HoloScene"));

class WebGLBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * The reactor as a fixed full-screen background "movie". Sits above the aurora
 * base (-z-20) and below content. A scrim keeps text readable over it. Under
 * reduced-motion it renders nothing (the calm aurora remains); if WebGL is
 * unavailable it silently drops out too.
 */
export function HoloBackground() {
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
      {/* Reactor is atmosphere, not content. Dialled well back: on a phone in
          daylight the animation was competing with the words, and the words are
          what sell. If it ever needs to be more visible, raise this — not the
          veil below, which is what guarantees contrast. */}
      <div className="absolute inset-0 opacity-[0.28]">
        <WebGLBoundary>
          <Suspense fallback={null}>
            <HoloScene />
          </Suspense>
        </WebGLBoundary>
      </div>

      {/* Readability veil — stronger now, so text always wins over the background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(110% 80% at 50% 32%, rgb(var(--c-base) / 0.35) 0%, rgb(var(--c-base) / 0.82) 70%), linear-gradient(180deg, rgb(var(--c-base) / 0.7) 0%, rgb(var(--c-base) / 0.9) 100%)",
        }}
      />
    </div>
  );
}
