import { AbsoluteFill, Img, staticFile } from "remotion";

/**
 * The link-preview card (1200×630) that WhatsApp, LinkedIn and Facebook
 * show when someone shares goluq.com. Rendered as a still:
 *   npx remotion still src/index.ts OgImage ../public/og-image.png
 */
const font = "'Segoe UI', 'Noto Sans', system-ui, sans-serif";

export function OgImage() {
  return (
    <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 20% 0%, #182448 0%, #0B1020 60%)", fontFamily: font, color: "white" }}>
      <div style={{ position: "absolute", left: 72, top: 72 }}>
        <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -1 }}>
          <span style={{ color: "#F59E0B" }}>GO</span>LuQ<span style={{ color: "rgba(255,255,255,.55)", fontWeight: 500 }}>.com</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 22, letterSpacing: 5, textTransform: "uppercase", color: "#22D3EE", fontWeight: 700 }}>Digital Consultancy · Indore</div>
      </div>
      <div style={{ position: "absolute", left: 72, top: 250, width: 660, fontSize: 54, fontWeight: 800, lineHeight: 1.1 }}>
        Software your business owns, built in weeks.
      </div>
      <div style={{ position: "absolute", left: 72, bottom: 72, display: "flex", gap: 14 }}>
        {["Fixed price in writing", "Your code, your data", "Run for you"].map((t) => (
          <span key={t} style={{ fontSize: 22, fontWeight: 700, padding: "12px 22px", borderRadius: 999, border: "2px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.06)" }}>{t}</span>
        ))}
      </div>
      <div style={{ position: "absolute", right: 72, top: 150, width: 340, height: 340, borderRadius: 32, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,.5)" }}>
        <Img src={staticFile("catalog/aio_one.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    </AbsoluteFill>
  );
}
