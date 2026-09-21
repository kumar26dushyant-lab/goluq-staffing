import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FPS } from "./CardShort";

/**
 * An original twenty-second story, not a card slideshow: the rent counter.
 * A before scene, a number that keeps climbing while the months tick, the
 * line that lands ("and nothing is yours"), the turn, the ask. The figures
 * are a worked example and say so on screen. One component, every
 * language: the words come in through props.
 */
export type RentStoryProps = {
  /** e.g. "story/ceo_before.webp" and "story/ceo_after.webp" under public/. */
  before: string;
  after: string;
  /** Monthly rent in the worked example, and the years it runs. */
  monthly: number;
  years: number;
  currency: string;
  words: {
    hook: string;      // "Every month, you pay rent for software."
    say: string;       // "Say ₹10,000 a month"
    months: string;    // "months"
    landing: string;   // "and nothing is yours."
    turn: string;      // "Own it once."
    turnSub: string;   // "Built for how you work. The code and the data, yours."
    example: string;   // "worked example"
    cta: string;       // "Ask on WhatsApp · goluq.com"
  };
  audio?: string;
};

const font = "'Segoe UI', 'Noto Sans', 'Noto Sans Devanagari', system-ui, sans-serif";
const S = (s: number) => Math.round(s * FPS);
/** Scene boundaries in seconds: hook, counter, landing, turn, ask. */
export const RENT_SCENES = [0, 3, 10, 13.5, 18, 21];
export const RENT_DURATION = S(RENT_SCENES[5]);

function fmt(n: number, cur: string) {
  return cur + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));
}

function Scene({ img, dim = 0.55, drift = 1, children }: { img?: string; dim?: number; drift?: number; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = interpolate(frame, [0, durationInFrames], [1, 1 + 0.06 * drift]);
  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: fadeIn, background: "#0B1020" }}>
      {img && <Img src={staticFile(img)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})`, filter: `brightness(${1 - dim})` }} />}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(11,16,32,.2) 0%, rgba(11,16,32,.75) 70%, #0B1020 100%)" }} />
      {children}
    </AbsoluteFill>
  );
}

function Words({ children, size = 84, top = "auto", color = "white", weight = 800 }: { children: React.ReactNode; size?: number; top?: string; color?: string; weight?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200, stiffness: 120 } });
  return (
    <div style={{ position: "absolute", left: 80, right: 80, top, bottom: top === "auto" ? 260 : "auto", fontFamily: font, fontSize: size, fontWeight: weight, lineHeight: 1.12, color, opacity: s, transform: `translateY(${(1 - s) * 30}px)`, textShadow: "0 4px 30px rgba(0,0,0,.6)" }}>
      {children}
    </div>
  );
}

function Counter({ monthly, years, currency, say, months, example }: { monthly: number; years: number; currency: string; say: string; months: string; example: string }) {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  // The months tick faster and faster, the way rent feels in hindsight.
  const total = years * 12;
  const t = interpolate(frame, [S(0.6), durationInFrames - S(1.2)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const m = Math.floor(total * t * t);
  const amount = m * monthly;
  const kick = spring({ frame: frame % Math.max(1, Math.round(fps / 6)), fps, config: { damping: 30, stiffness: 400 } });
  return (
    <>
      <Words size={52} top="300px" color="#22D3EE" weight={700}>{say}</Words>
      <div style={{ position: "absolute", left: 60, right: 60, top: 640, textAlign: "center", fontFamily: font }}>
        <div style={{ fontSize: 150, fontWeight: 900, color: "white", letterSpacing: -4, transform: `scale(${1 + (1 - kick) * 0.01})`, textShadow: "0 8px 40px rgba(0,0,0,.6)" }}>{fmt(amount, currency)}</div>
        <div style={{ marginTop: 20, fontSize: 56, fontWeight: 700, color: "rgba(255,255,255,.8)" }}>{m} {months}</div>
        <div style={{ marginTop: 40, display: "inline-block", fontSize: 30, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", color: "#F59E0B", border: "3px solid #F59E0B", borderRadius: 999, padding: "10px 28px" }}>{example}</div>
      </div>
    </>
  );
}

function Landing({ text }: { text: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 12, stiffness: 200 } });
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 80, fontFamily: font, fontSize: 110, fontWeight: 900, lineHeight: 1.05, color: "#F59E0B", textAlign: "center", transform: `scale(${0.7 + 0.3 * s})`, opacity: s, textShadow: "0 8px 40px rgba(0,0,0,.7)" }}>
      {text}
    </div>
  );
}

export function RentStory({ before, after, monthly, years, currency, words, audio }: RentStoryProps) {
  const [a, b, c, d, e, f] = RENT_SCENES.map(S);
  return (
    <AbsoluteFill style={{ background: "#0B1020" }}>
      <Sequence from={a} durationInFrames={b - a} layout="none"><Scene img={before} dim={0.45}><Words>{words.hook}</Words></Scene></Sequence>
      <Sequence from={b} durationInFrames={c - b} layout="none"><Scene img={before} dim={0.8} drift={0.5}><Counter monthly={monthly} years={years} currency={currency} say={words.say} months={words.months} example={words.example} /></Scene></Sequence>
      <Sequence from={c} durationInFrames={d - c} layout="none"><Scene dim={1}><Landing text={words.landing} /></Scene></Sequence>
      <Sequence from={d} durationInFrames={e - d} layout="none"><Scene img={after} dim={0.35}><Words size={88} top="980px" color="#22D3EE">{words.turn}</Words><Words size={42} top="1330px" weight={600}>{words.turnSub}</Words></Scene></Sequence>
      <Sequence from={e} durationInFrames={f - e} layout="none">
        <Scene dim={1}>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: font, textAlign: "center" }}>
            <div>
              <div style={{ fontSize: 120, fontWeight: 800, color: "white" }}><span style={{ color: "#F59E0B" }}>GO</span>LuQ<span style={{ color: "rgba(255,255,255,.5)", fontWeight: 500 }}>.com</span></div>
              <div style={{ marginTop: 40, display: "inline-block", background: "white", color: "#0B1020", borderRadius: 999, padding: "22px 56px", fontSize: 44, fontWeight: 700 }}>{words.cta}</div>
            </div>
          </div>
        </Scene>
      </Sequence>
      {audio && <Audio src={staticFile(audio)} />}
    </AbsoluteFill>
  );
}
