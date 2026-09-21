import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * A card slideshow as a 9:16 short: the site's own square cards, one after
 * the other, each drifting slowly, with the brand line on top and the call
 * on the bottom. One component renders every language: the card images
 * already carry the words, the props carry the rest.
 */
export type CardShortProps = {
  /** Paths under the site's public dir, e.g. "catalog/aff_boss.jpg" or "catalog/hi/aff_boss.jpg". */
  cards: string[];
  /** Small line above the cards, e.g. "Partner programme". */
  kicker: string;
  /** The call on the last band, e.g. "WhatsApp: goluq.com". */
  cta: string;
  /** Optional voice or music under the short, a path under public/. */
  audio?: string;
  secondsPerCard: number;
};

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
/** Frames the cross-fade between two cards takes. */
const FADE = 12;

const font = "'Segoe UI', 'Noto Sans', 'Noto Sans Devanagari', system-ui, sans-serif";

function Card({ src, index }: { src: string; index: number }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // Every other card drifts the opposite way so the loop never looks mechanical.
  const dir = index % 2 === 0 ? 1 : -1;
  const scale = interpolate(frame, [0, durationInFrames], [1.02, 1.09], { extrapolateRight: "clamp" });
  const x = interpolate(frame, [0, durationInFrames], [0, 18 * dir], { extrapolateRight: "clamp" });
  const inOp = interpolate(frame, [0, FADE], [0, 1], { extrapolateRight: "clamp" });
  const outOp = interpolate(frame, [durationInFrames - FADE, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: Math.min(inOp, outOp), justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: 980, height: 980, borderRadius: 40, overflow: "hidden", boxShadow: "0 40px 120px rgba(0,0,0,.55)", transform: `translateX(${x}px)` }}>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }} />
      </div>
    </AbsoluteFill>
  );
}

function Chrome({ kicker, cta, count }: { kicker: string; cta: string; count: number }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });
  const per = durationInFrames / count;
  const active = Math.min(count - 1, Math.floor(frame / per));
  return (
    <>
      <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center", fontFamily: font, opacity: enter, transform: `translateY(${(1 - enter) * 20}px)` }}>
        <div style={{ fontSize: 34, letterSpacing: 6, textTransform: "uppercase", color: "#22D3EE", fontWeight: 700 }}>{kicker}</div>
        <div style={{ marginTop: 14, fontSize: 64, fontWeight: 800, color: "white" }}>
          <span style={{ color: "#F59E0B" }}>GO</span>LuQ<span style={{ color: "rgba(255,255,255,.55)", fontWeight: 500 }}>.com</span>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 14 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ width: i === active ? 44 : 14, height: 14, borderRadius: 7, background: i === active ? "#22D3EE" : "rgba(255,255,255,.35)", transition: "width .2s" }} />
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 60, left: 0, right: 0, textAlign: "center", fontFamily: font, fontSize: 40, fontWeight: 700, color: "#0B1020" }}>
        <span style={{ display: "inline-block", background: "white", borderRadius: 999, padding: "16px 44px" }}>{cta}</span>
      </div>
    </>
  );
}

export function CardShort({ cards, kicker, cta, audio, secondsPerCard }: CardShortProps) {
  const per = Math.round(secondsPerCard * FPS);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(120% 80% at 50% 0%, #182448 0%, #0B1020 60%)" }}>
      {cards.map((src, i) => (
        <Sequence key={src + i} from={i * per} durationInFrames={per} layout="none">
          <Card src={src} index={i} />
        </Sequence>
      ))}
      <Chrome kicker={kicker} cta={cta} count={cards.length} />
      {audio && <Audio src={staticFile(audio)} />}
    </AbsoluteFill>
  );
}
