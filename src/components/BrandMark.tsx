import type { CSSProperties } from "react";

/**
 * The ONE place the brand is rendered, matching the official logo:
 * "Go" teal→blue, "LuQ" orange→pink, ".com" in the text colour, and the
 * optional "Digital Consultancy" line (Digital in the text colour,
 * Consultancy in teal). Sentence case puts capitals at G and L so a stranger
 * reads "Go LuQ" without a caption.
 *
 * Never hardcode the brand as plain text anywhere else — always <BrandMark/>.
 * `com` can be switched off where space is tight (the sticky header on a
 * phone); `tagline` adds the second line.
 */
export function BrandMark({
  className = "",
  as: Tag = "span",
  style,
  com = true,
  tagline = false,
}: {
  className?: string;
  as?: "span" | "h1" | "h2" | "div";
  style?: CSSProperties;
  com?: boolean;
  tagline?: boolean;
}) {
  return (
    <Tag className={`brand-still inline-flex flex-col font-display font-bold leading-none tracking-tight ${className}`} style={style} aria-label="GoLuQ.com Digital Consultancy">
      <span>
        <span className="brand-go">Go</span>
        <span className="brand-luq">LuQ</span>
        {com && <span className="text-current">.com</span>}
      </span>
      {tagline && (
        <span className="mt-1 text-[0.36em] font-bold tracking-[0.04em]">
          Digital <span className="text-[#0E9AAE]">Consultancy</span>
        </span>
      )}
    </Tag>
  );
}
