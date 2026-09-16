import { Fragment } from "react";

/**
 * Renders a string but paints every "GoLuQ" the way the logo does — "Go" in
 * the teal→blue gradient, "LuQ" in the orange→pink gradient — so the brand
 * looks the same inside a paragraph as it does in the header and the footer.
 * (It used to paint Go in ink and LuQ in cyan, which was a third brand.)
 */
export function BrandText({ text, className = "" }: { text: string; className?: string }) {
  const parts = text.split(/(GoLuQ(?:\.com)?)/gi);
  return (
    <span className={className}>
      {parts.map((p, i) =>
        /^goluq(\.com)?$/i.test(p) ? (
          <Fragment key={i}>
            <span className="brand-go font-bold">Go</span>
            <span className="brand-luq font-bold">LuQ</span>
            {/\.com$/i.test(p) ? ".com" : ""}
          </Fragment>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </span>
  );
}
