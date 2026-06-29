import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg" | "xl";

const SIZES: Record<Size, string> = {
  md: "px-5 py-3 text-base",
  lg: "px-7 py-4 text-lg",
  xl: "px-9 py-5 text-xl",
};

/**
 * One button to rule them all — big tap targets, bold type, consistent across
 * every screen (BUILD_SPEC tap targets ≥44px; user wants buttons large + eye-catchy).
 */
export function Button({
  variant = "primary",
  size = "lg",
  full,
  children,
  className = "",
  ...rest
}: {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  children: ReactNode;
} & HTMLMotionProps<"button">) {
  const base =
    "inline-flex items-center justify-center gap-2.5 rounded-full font-display font-bold tracking-tight transition-all disabled:opacity-70";
  const variants: Record<Variant, string> = {
    primary: "text-base hover:brightness-110",
    secondary: "glass glass-interactive text-fg",
    ghost: "text-brand-luq ring-1 ring-teal-glow/40 bg-teal-glow/12 hover:bg-teal-glow/22",
  };
  const style =
    variant === "primary"
      ? {
          background:
            "linear-gradient(135deg, rgb(var(--c-teal-glow)) 0%, #5EEAD4 45%, rgb(var(--c-teal-neon)) 100%)",
          boxShadow:
            "0 8px 28px rgb(var(--c-teal-glow) / 0.45), 0 0 0 1px rgb(255 255 255 / 0.25) inset, 0 1px 0 rgb(255 255 255 / 0.5) inset",
        }
      : undefined;

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`${base} ${SIZES[size]} ${variants[variant]} ${full ? "w-full" : ""} ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
