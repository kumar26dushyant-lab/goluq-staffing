/**
 * Draw a social card onto a canvas at full export size.
 *
 * Deliberately hand-drawn on a 2D context rather than screenshotting the DOM
 * with html2canvas or similar. Those libraries re-implement CSS approximately,
 * and the two things this design depends on — gradient-clipped text and a
 * specific display font — are exactly what they get wrong. Drawing directly
 * means what is previewed is byte-for-byte what downloads, at 1080px, every
 * time and on every device.
 */

export type Format = "square" | "story" | "wide";
export type Mood = "dark" | "light";

export interface PostCopy {
  eyebrow: string;
  title: string;
  accent: string;
  body: string;
  bullets: string[];
  kicker: string;
  cta: string;
}

export const FORMATS: Record<Format, { w: number; h: number; label: string; where: string }> = {
  square: { w: 1080, h: 1080, label: "Square", where: "Instagram & Facebook feed" },
  story: { w: 1080, h: 1920, label: "Story", where: "WhatsApp Status, IG & FB Story" },
  wide: { w: 1200, h: 627, label: "Wide", where: "LinkedIn & link previews" },
};

const CYAN = "#22D3EE";
const BLUE = "#2563EB";
const INDIGO = "#4F46E5";
const ORANGE = "#EA580C";
const PINK = "#DB2777";
const VIOLET = "#7C3AED";
const WA_GREEN = "#25D366";

interface Theme {
  bg1: string; bg2: string; fg: string; muted: string; line: string;
  glow1: string; glow2: string; kicker: string;
}

const THEMES: Record<Mood, Theme> = {
  dark: {
    bg1: "#070B15", bg2: "#101B3A", fg: "#F2F6FF", muted: "rgba(242,246,255,0.80)",
    line: "rgba(255,255,255,0.18)", glow1: "rgba(34,211,238,0.22)", glow2: "rgba(219,39,119,0.24)",
    kicker: "#F87171",
  },
  light: {
    bg1: "#FFFFFF", bg2: "#EAF0F8", fg: "#0B1020", muted: "rgba(11,16,32,0.72)",
    line: "rgba(11,16,32,0.14)", glow1: "rgba(34,211,238,0.20)", glow2: "rgba(234,88,12,0.16)",
    kicker: "#DC2626",
  },
};

/** Wrap text to a width, returning the lines. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? line + " " + w : w;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** A rounded rectangle path — older Safari has no roundRect. */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Draw text in a horizontal gradient, per line. */
function gradientLines(
  ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number,
  lineHeight: number, stops: string[], width: number
): number {
  let cy = y;
  for (const l of lines) {
    const g = ctx.createLinearGradient(x, 0, x + width, 0);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    ctx.fillStyle = g;
    ctx.fillText(l, x, cy);
    cy += lineHeight;
  }
  return cy;
}

const DISPLAY = `"Space Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
const BODY = `Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
const MONO = `"JetBrains Mono", ui-monospace, "Courier New", monospace`;

export function drawPost(
  canvas: HTMLCanvasElement,
  copy: PostCopy,
  format: Format,
  mood: Mood,
  whatsapp: string
): void {
  const { w, h } = FORMATS[format];
  const th = THEMES[mood];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Scale every measurement off the card width so one layout serves all three
  // formats rather than three near-identical copies drifting apart.
  const S = w / 1080;
  const pad = Math.round((format === "wide" ? 64 : 92) * S);
  const inner = w - pad * 2;

  // ── Background ──────────────────────────────────────────────────────────
  const base = ctx.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, th.bg1);
  base.addColorStop(1, th.bg2);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  const g1 = ctx.createRadialGradient(w * 0.15, h * 0.1, 0, w * 0.15, h * 0.1, w * 0.85);
  g1.addColorStop(0, th.glow1);
  g1.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, w, h);

  const g2 = ctx.createRadialGradient(w * 0.9, h * 0.9, 0, w * 0.9, h * 0.9, w * 0.9);
  g2.addColorStop(0, th.glow2);
  g2.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, w, h);

  ctx.textBaseline = "top";
  let y = pad;

  // ── Wordmark: cool "Go", warm "LuQ", exactly as the site draws it ───────
  const markSize = Math.round((format === "wide" ? 44 : 58) * S);
  ctx.font = `800 ${markSize}px ${DISPLAY}`;
  const goW = ctx.measureText("Go").width;
  const luqW = ctx.measureText("LuQ").width;

  const gGo = ctx.createLinearGradient(pad, 0, pad + goW, 0);
  gGo.addColorStop(0, CYAN); gGo.addColorStop(0.62, BLUE); gGo.addColorStop(1, INDIGO);
  ctx.fillStyle = gGo;
  ctx.fillText("Go", pad, y);

  const gLuq = ctx.createLinearGradient(pad + goW, 0, pad + goW + luqW, 0);
  gLuq.addColorStop(0, ORANGE); gLuq.addColorStop(0.55, PINK); gLuq.addColorStop(1, ORANGE);
  ctx.fillStyle = gLuq;
  ctx.fillText("LuQ", pad + goW, y);

  ctx.font = `700 ${Math.round(markSize * 0.45)}px ${DISPLAY}`;
  ctx.fillStyle = th.muted;
  ctx.fillText(".com", pad + goW + luqW + 2 * S, y + markSize * 0.5);
  y += markSize + Math.round(46 * S);

  // ── Eyebrow ─────────────────────────────────────────────────────────────
  if (copy.eyebrow) {
    const size = Math.round((format === "wide" ? 20 : 26) * S);
    ctx.font = `700 ${size}px ${MONO}`;
    ctx.fillStyle = mood === "dark" ? CYAN : "#0E7C8C";
    const spaced = copy.eyebrow.split("").join(" ");
    ctx.fillText(spaced, pad, y);
    y += size + Math.round(28 * S);
  }

  // ── Headline. The accent half carries the brand gradient — that is where
  //    the payoff goes, so it is the part the eye lands on. ───────────────
  const titleSize = Math.round((format === "wide" ? 54 : format === "story" ? 92 : 80) * S);
  const titleLH = Math.round(titleSize * 1.08);
  ctx.font = `800 ${titleSize}px ${DISPLAY}`;

  if (copy.title) {
    ctx.fillStyle = th.fg;
    for (const l of wrap(ctx, copy.title, inner)) {
      ctx.fillText(l, pad, y);
      y += titleLH;
    }
  }
  if (copy.accent) {
    y = gradientLines(ctx, wrap(ctx, copy.accent, inner), pad, y, titleLH,
      [CYAN, BLUE, VIOLET, PINK, ORANGE], inner);
  }
  y += Math.round(26 * S);

  // ── Body ────────────────────────────────────────────────────────────────
  if (copy.body) {
    const size = Math.round((format === "wide" ? 26 : 33) * S);
    ctx.font = `400 ${size}px ${BODY}`;
    ctx.fillStyle = th.muted;
    for (const l of wrap(ctx, copy.body, inner * 0.92)) {
      ctx.fillText(l, pad, y);
      y += Math.round(size * 1.45);
    }
    y += Math.round(18 * S);
  }

  // ── Bullets ─────────────────────────────────────────────────────────────
  if (copy.bullets?.length) {
    const size = Math.round((format === "wide" ? 24 : 31) * S);
    ctx.font = `400 ${size}px ${BODY}`;
    for (const b of copy.bullets) {
      ctx.fillStyle = mood === "dark" ? "#34D399" : "#059669";
      ctx.beginPath();
      ctx.arc(pad + 7 * S, y + size * 0.55, 7 * S, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = th.fg;
      const lines = wrap(ctx, b, inner - 34 * S);
      for (const l of lines) {
        ctx.fillText(l, pad + 30 * S, y);
        y += Math.round(size * 1.35);
      }
      y += Math.round(10 * S);
    }
    y += Math.round(10 * S);
  }

  // ── Kicker ──────────────────────────────────────────────────────────────
  if (copy.kicker) {
    const size = Math.round((format === "wide" ? 28 : 35) * S);
    ctx.font = `800 ${size}px ${DISPLAY}`;
    ctx.fillStyle = th.kicker;
    for (const l of wrap(ctx, copy.kicker, inner)) {
      ctx.fillText(l, pad, y);
      y += Math.round(size * 1.3);
    }
  }

  // ── Footer: site, and the WhatsApp pill when there is a number ──────────
  const footY = h - pad - Math.round((format === "wide" ? 34 : 46) * S);
  ctx.font = `700 ${Math.round((format === "wide" ? 22 : 30) * S)}px ${DISPLAY}`;
  ctx.fillStyle = th.muted;
  ctx.fillText("goluq.com", pad, footY);

  const digits = String(whatsapp || "").replace(/\D/g, "");
  if (digits.length >= 10) {
    const label = `WhatsApp +${digits.replace(/^(\d{2})(\d{5})(\d{5})$/, "$1 $2 $3")}`;
    const size = Math.round((format === "wide" ? 22 : 30) * S);
    ctx.font = `800 ${size}px ${DISPLAY}`;
    const tw = ctx.measureText(label).width;
    const bw = tw + 56 * S;
    const bh = size + 34 * S;
    const bx = w - pad - bw;
    const by = footY - 14 * S;
    ctx.fillStyle = WA_GREEN;
    roundRect(ctx, bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = "#062012";
    ctx.fillText(label, bx + 28 * S, by + 17 * S);
  } else if (copy.cta) {
    ctx.font = `800 ${Math.round((format === "wide" ? 22 : 30) * S)}px ${DISPLAY}`;
    ctx.fillStyle = mood === "dark" ? CYAN : BLUE;
    const tw = ctx.measureText(copy.cta).width;
    ctx.fillText(copy.cta, w - pad - tw, footY);
  }

  // Hairline above the footer, so the card reads as composed rather than
  // whatever happened to fit.
  ctx.strokeStyle = th.line;
  ctx.lineWidth = Math.max(1, 2 * S);
  ctx.beginPath();
  ctx.moveTo(pad, footY - Math.round(34 * S));
  ctx.lineTo(w - pad, footY - Math.round(34 * S));
  ctx.stroke();
}
