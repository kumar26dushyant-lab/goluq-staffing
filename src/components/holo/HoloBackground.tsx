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
      <WebGLBoundary>
        <Suspense fallback={null}>
          <HoloScene />
        </Suspense>
      </WebGLBoundary>

      {/* Readability scrim — lets the reactor glow through but tames it under text */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 85% at 50% 38%, transparent 0%, rgb(var(--c-base) / 0.42) 72%), linear-gradient(180deg, rgb(var(--c-base) / 0.28) 0%, rgb(var(--c-base) / 0.55) 100%)",
        }}
      />
    </div>
  );
}
