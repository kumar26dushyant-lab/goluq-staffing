import { AbsoluteFill, Img } from "remotion";

/**
 * A film's thumbnail with its title in the film's language. The old posters
 * were the first frame at one second, before any caption, so a Hindi film
 * and its English twin had the same wordless picture. Now the title and a
 * language pill sit on that frame. Rendered as stills, one per file:
 *   npx remotion still src/index.ts Poster169 out/x.jpg --props=...
 */
export type PosterProps = {
  /** The existing poster frame (any URL). */
  image: string;
  title: string;
  lang: "hi" | "en" | "enin";
  /** Small line above the title, e.g. "Owner story · 1:34". */
  kicker?: string;
};

const font = "'Segoe UI', 'Noto Sans', 'Noto Sans Devanagari', system-ui, sans-serif";

export function Poster({ image, title, lang, kicker, portrait = false }: PosterProps & { portrait?: boolean }) {
  const pill = lang === "hi" ? "हिंदी" : "English";
  const pad = portrait ? 64 : 72;
  const size = portrait ? 74 : 78;
  return (
    <AbsoluteFill style={{ background: "#0B1020", fontFamily: font, color: "white" }}>
      <Img src={image} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      {!portrait && <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(11,16,32,0) 35%, rgba(11,16,32,.88) 72%, #0B1020 100%)" }} />}
      <div style={{ position: "absolute", top: portrait ? 56 : 44, right: pad, display: "flex", gap: 12 }}>
        <span style={{ fontSize: portrait ? 30 : 28, fontWeight: 800, letterSpacing: 1, padding: "10px 22px", borderRadius: 999, background: "#22D3EE", color: "#0B1020" }}>{pill}</span>
      </div>
      {/* The portrait frames already carry their title band in the right language; they only need the pill. */}
      {!portrait && <div style={{ position: "absolute", left: pad, right: pad, bottom: 70 }}>
        {kicker && <div style={{ fontSize: portrait ? 30 : 28, fontWeight: 700, letterSpacing: lang === "hi" ? 0 : 3, textTransform: lang === "hi" ? "none" : "uppercase", color: "#22D3EE", marginBottom: 14 }}>{kicker}</div>}
        <div style={{ fontSize: size, fontWeight: 800, lineHeight: 1.15, textShadow: "0 4px 30px rgba(0,0,0,.7)", textWrap: "balance" as never }}>{title}</div>
        <div style={{ marginTop: 22, fontSize: portrait ? 30 : 28, fontWeight: 700, color: "rgba(255,255,255,.75)" }}>
          <span style={{ color: "#F59E0B" }}>GO</span>LuQ<span style={{ color: "rgba(255,255,255,.5)" }}>.com</span>
        </div>
      </div>}
    </AbsoluteFill>
  );
}

export const Poster169 = (p: PosterProps) => <Poster {...p} />;
export const Poster916 = (p: PosterProps) => <Poster {...p} portrait />;
