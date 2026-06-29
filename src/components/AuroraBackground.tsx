import { ParticleField } from "./ParticleField";
import { Spotlight } from "./Spotlight";

/**
 * Full-bleed cinematic backdrop layered behind all glass:
 *   base gradient floor → large blurred aurora blobs → drifting particles.
 * Fixed + aria-hidden + pointer-events-none so it never interferes with UX.
 * Aurora opacity is theme-tuned via --aurora-opacity (dimmer in light mode).
 */
export function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-20 overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 120% at 50% -10%, rgb(var(--c-abyss)) 0%, rgb(var(--c-base)) 55%)",
      }}
    >
      {/* Aurora blobs (very blurred, slow drift) */}
      <div
        className="absolute -left-[15%] -top-[10%] h-[55vmax] w-[55vmax] rounded-full blur-[120px] animate-aurora-drift"
        style={{
          opacity: "var(--aurora-opacity)",
          background:
            "radial-gradient(circle, rgb(var(--c-indigo-glow)) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute -right-[12%] top-[15%] h-[48vmax] w-[48vmax] rounded-full blur-[120px] animate-aurora-drift"
        style={{
          opacity: "var(--aurora-opacity)",
          animationDelay: "-6s",
          background:
            "radial-gradient(circle, rgb(var(--c-teal-glow)) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute bottom-[-20%] left-[25%] h-[50vmax] w-[50vmax] rounded-full blur-[130px] animate-aurora-drift"
        style={{
          opacity: "calc(var(--aurora-opacity) * 0.8)",
          animationDelay: "-12s",
          background:
            "radial-gradient(circle, rgb(var(--c-indigo-deep)) 0%, transparent 70%)",
        }}
      />

      {/* Blueprint / engineered grid — faint, reinforces "ops deck" feel */}
      <div
        className="absolute inset-0"
        style={{
          opacity: "calc(var(--aurora-opacity) * 0.5)",
          backgroundImage:
            "linear-gradient(rgb(var(--c-hairline) / 0.06) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--c-hairline) / 0.06) 1px, transparent 1px)",
          backgroundSize: "54px 54px",
          maskImage:
            "radial-gradient(120% 100% at 50% 0%, black 35%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(120% 100% at 50% 0%, black 35%, transparent 85%)",
        }}
      />

      {/* Fine grain / vignette to seat the glass */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(130% 100% at 50% 0%, transparent 60%, rgb(var(--c-base) / 0.6) 100%)",
        }}
      />

      <ParticleField />
      <Spotlight />
    </div>
  );
}
