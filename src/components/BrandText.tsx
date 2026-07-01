import { Fragment } from "react";

/**
 * Renders a string but always paints the brand as GO (ink/white) + LuQ (cyan),
 * so "GoLuQ" is consistently two-color wherever it appears in copy — not
 * swallowed into a gradient or a single color.
 */
export function BrandText({ text, className = "" }: { text: string; className?: string }) {
  const parts = text.split(/(GoLuQ)/gi);
  return (
    <span className={className}>
      {parts.map((p, i) =>
        /^goluq$/i.test(p) ? (
          <Fragment key={i}>
            <span className="text-brand-go font-bold">Go</span>
            <span className="text-brand-luq font-bold">LuQ</span>
          </Fragment>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </span>
  );
}
