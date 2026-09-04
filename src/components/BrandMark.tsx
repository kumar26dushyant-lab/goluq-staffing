import type { CSSProperties } from "react";

/**
 * The ONE place the brand is rendered.
 *
 * "Go" in the cool half of the palette (cyan → blue), "LuQ" in the warm half
 * (orange → pink), taken from the GoLuQ.com banner. The split is not decoration:
 * sentence case puts capitals at G and L to mark two word-starts, and two
 * distinct colour families confirm it — so a stranger reads "Go LuQ" rather than
 * one block ending in a Q, without a caption explaining the pronunciation.
 *
 * Never hardcode the brand as plain text anywhere else — always use <BrandMark/>.
 */
export function BrandMark({
  className = "",
  as: Tag = "span",
  style,
}: {
  className?: string;
  as?: "span" | "h1" | "h2" | "div";
  style?: CSSProperties;
}) {
  return (
    <Tag
      className={`brand-still font-display font-bold tracking-tight ${className}`}
      style={style}
      aria-label="GoLuQ"
    >
      {/* The same two gradients the hero wordmark uses. These were previously
          flat colours here and gradients there, so the brand was literally drawn
          two different ways on one page. `brand-still` holds the shimmer, which
          is a flourish at hero size and a distraction in a sticky header. */}
      <span className="brand-go">Go</span>
      <span className="brand-luq">LuQ</span>
    </Tag>
  );
}
