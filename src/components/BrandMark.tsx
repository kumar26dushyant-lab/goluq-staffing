import type { CSSProperties } from "react";

/**
 * The ONE place the brand is rendered. Hard rule (BUILD_SPEC §2.1):
 * "GO" in vivid white (deep ink in light theme) + "LuQ" in glowing cyan/teal.
 * Never hardcode the brand as plain text anywhere else — always use <BrandMark/>.
 */
export function BrandMark({
  className = "",
  glow = true,
  as: Tag = "span",
  style,
}: {
  className?: string;
  glow?: boolean;
  as?: "span" | "h1" | "h2" | "div";
  style?: CSSProperties;
}) {
  return (
    <Tag
      className={`font-display font-bold tracking-tight ${className}`}
      style={style}
      aria-label="GoLuQ"
    >
      <span className="text-brand-go">GO</span>
      <span className={glow ? "text-luq-glow" : "text-brand-luq"}>LuQ</span>
    </Tag>
  );
}
