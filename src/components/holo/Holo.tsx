import { Component, lazy, Suspense, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { HoloCore } from "../HoloCore";

const HoloScene = lazy(() => import("./HoloScene"));

/** If WebGL throws (no GPU / context lost), silently fall back to the CSS core. */
class WebGLBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Hero reactor: full WebGL when the device can handle it, CSS <HoloCore/> as the
 * instant fallback (also used wholesale under reduced-motion). The square box
 * sizes off the parent width; the Canvas fills it absolutely.
 */
export function Holo({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();

  if (reduced) return <HoloCore className={className} />;

  return (
    <div className={`relative aspect-square w-full ${className}`} aria-hidden="true">
      {/* Soft halo behind the canvas */}
      <div
        className="absolute inset-[12%] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgb(var(--c-teal-glow) / 0.22), transparent 70%)" }}
      />
      <WebGLBoundary fallback={<HoloCore className="absolute inset-0" />}>
        <Suspense fallback={<HoloCore className="absolute inset-0" />}>
          <HoloScene />
        </Suspense>
      </WebGLBoundary>
    </div>
  );
}
