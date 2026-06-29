import { useEffect, useRef, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { ROLES } from "../content/roles";

/**
 * The rotating volumetric "5D" HUD core (CSS 3D, no WebGL). A glowing reactor
 * wrapped in gyroscopic rings, with holographic data-tiles (role icons) orbiting
 * in depth. Tilts toward the pointer for parallax. All sizing scales off one
 * CSS var (--d) so it's fully responsive. Decorative (aria-hidden) — selection
 * still happens via the deploy-slots list.
 */
export function HoloCore({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      const el = stageRef.current;
      if (!el) return;
      const rx = (e.clientX / window.innerWidth - 0.5) * 22; // ±11deg
      const ry = -(e.clientY / window.innerHeight - 0.5) * 18;
      el.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
      el.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced]);

  const D = "clamp(78px, 17vmin, 132px)";
  const wrapStyle: CSSProperties = {
    // @ts-expect-error custom property
    "--d": D,
    width: "calc(var(--d) * 3.6)",
    height: "calc(var(--d) * 3.6)",
  };

  const ring = (mult: number): CSSProperties => ({
    width: `calc(var(--d) * ${mult})`,
    height: `calc(var(--d) * ${mult})`,
    marginLeft: `calc(var(--d) * ${mult} / -2)`,
    marginTop: `calc(var(--d) * ${mult} / -2)`,
  });

  return (
    <div className={`holo-scene grid place-items-center ${className}`} aria-hidden="true">
      <div ref={stageRef} className="holo-stage" style={wrapStyle}>
        {/* Reactor */}
        <div
          className="holo-core"
          style={{ width: "var(--d)", height: "var(--d)" }}
        />

        {/* Gyro rings */}
        <div className="holo-ring r1" style={ring(1.85)} />
        <div className="holo-ring r2" style={ring(2.45)} />
        <div className="holo-ring r3" style={ring(3.05)} />

        {/* Orbiting holographic tiles */}
        <div className="holo-orbit">
          {ROLES.map((role, i) => {
            const Icon = role.icon;
            const angle = (360 / ROLES.length) * i;
            return (
              <div
                key={role.id}
                className="holo-tile"
                style={{
                  width: "calc(var(--d) * 0.62)",
                  height: "calc(var(--d) * 0.62)",
                  marginLeft: "calc(var(--d) * 0.62 / -2)",
                  marginTop: "calc(var(--d) * 0.62 / -2)",
                  transform: `rotateY(${angle}deg) translateZ(calc(var(--d) * 1.85))`,
                }}
              >
                <Icon size={20} strokeWidth={2} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
