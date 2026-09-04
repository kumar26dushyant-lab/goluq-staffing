import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "../ui/Button";
import { inputClass } from "../../lib/ui";
import { adminGet, adminPost } from "../../lib/adminApi";
import { drawPost, FORMATS, type Format, type Mood, type PostCopy } from "../../lib/postCanvas";

const BLANK: PostCopy = {
  eyebrow: "WHATSAPP API · SMS · VOICE · TOLL-FREE",
  title: "Most vendors hand you a login.",
  accent: "We build what runs behind it.",
  body: "The number is the easy part. What matters is what happens when it rings.",
  bullets: [],
  kicker: "",
  cta: "",
};

/** Briefs that produce good posts, as a starting point rather than a menu. */
const IDEAS = [
  "Launch post — GoLuQ is live, what we do, in Hinglish",
  "The billing man takes two days off — the pain and the fix",
  "Toll-free at ₹9,999 when others charge ₹18,000",
  "Stop renting software you barely use",
  "Message our WhatsApp number and it answers in seconds",
  "Nidaan: 4 offices, 2,000+ claims, running on software we built",
];

/**
 * Marketing studio — write a post, see it, download it.
 *
 * The card is drawn on a canvas at full export size rather than screenshotted
 * from the DOM, so what is previewed is exactly what downloads: 1080px, correct
 * gradients, correct font, on any device. One tap saves a PNG.
 *
 * The brief box is the point. Typing "post about the toll-free offer for
 * clinics, in Hinglish" returns copy already fitted to this layout — a headline
 * short enough to survive at 84px, a body that does not overflow — and priced
 * from the live catalogue, so a post can never quote a number the site does not
 * charge.
 */
export function Marketing() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copy, setCopy] = useState<PostCopy>(BLANK);
  const [format, setFormat] = useState<Format>("square");
  const [mood, setMood] = useState<Mood>("dark");
  const [prompt, setPrompt] = useState("");
  const [lang, setLang] = useState("en");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    adminGet("/api/admin/settings")
      .then((d) => setWhatsapp(d.public_whatsapp || ""))
      .catch(() => {});
    // The display font must be loaded before the canvas measures text, or the
    // first draw wraps against a fallback and lines land in the wrong places.
    const fonts = (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts;
    if (fonts?.ready) fonts.ready.then(() => setReady(true));
    else setReady(true);
  }, []);

  const redraw = useCallback(() => {
    if (canvasRef.current) drawPost(canvasRef.current, copy, format, mood, whatsapp);
  }, [copy, format, mood, whatsapp]);

  useEffect(() => {
    if (ready) redraw();
  }, [ready, redraw]);

  const generate = async () => {
    if (!prompt.trim()) return;
    setBusy(true);
    setMsg("");
    const d = await adminPost("/api/admin/marketing", { prompt, lang });
    setBusy(false);
    if (!d.ok) return setMsg(d.error || "Could not write that one.");
    setCopy({ ...BLANK, ...d.copy, bullets: d.copy.bullets || [] });
    setMsg("Written. Edit anything below, then download.");
  };

  const download = () => {
    const c = canvasRef.current;
    if (!c) return;
    const name = `goluq-${format}-${mood}-${Date.now()}.png`;
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoking immediately can cancel the save on some mobile browsers.
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, "image/png");
  };

  const set = (k: keyof PostCopy) => (e: { target: { value: string } }) =>
    setCopy({ ...copy, [k]: e.target.value } as PostCopy);

  return (
    <div className="space-y-6">
      {/* ── Write it ──────────────────────────────────────────────────── */}
      <div className="glass space-y-3 rounded-2xl p-5">
        <p className="flex items-center gap-2 font-display text-base font-bold text-fg">
          <Sparkles size={17} className="text-brand-luq" /> Write a post
        </p>
        <p className="text-sm text-muted">
          Say what you want to post about, in your own words. Prices come from your live catalogue,
          so nothing invented can end up on a card.
        </p>
        <textarea
          className={inputClass + " min-h-[5rem]"}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. post for clinics about missed calls after closing time, mention the toll-free price"
        />
        <div className="flex flex-wrap items-center gap-2">
          <select className={inputClass + " max-w-[11rem]"} value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="en">English</option>
            <option value="hinglish">Hinglish</option>
            <option value="hi">हिन्दी</option>
          </select>
          <Button onClick={generate} disabled={busy || !prompt.trim()}>
            {busy ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {busy ? "Writing…" : "Write it"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {IDEAS.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPrompt(i)}
              className="glass glass-interactive rounded-full px-3 py-1.5 text-xs text-muted hover:text-fg"
            >
              {i}
            </button>
          ))}
        </div>
        {msg && <p className="text-sm text-muted">{msg}</p>}
      </div>

      {/* ── Preview + download ────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div className="glass rounded-2xl p-5">
          <div className="mb-3 flex flex-wrap gap-2">
            {(Object.keys(FORMATS) as Format[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  format === f ? "bg-teal-glow/20 text-brand-luq ring-1 ring-teal-glow/45" : "glass text-muted"
                }`}
              >
                {FORMATS[f].label}
              </button>
            ))}
            {(["dark", "light"] as Mood[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(m)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  mood === m ? "bg-teal-glow/20 text-brand-luq ring-1 ring-teal-glow/45" : "glass text-muted"
                }`}
              >
                {m === "dark" ? "Dark" : "Light"}
              </button>
            ))}
          </div>

          <p className="mb-2 text-xs text-faint">
            {FORMATS[format].w} × {FORMATS[format].h} · {FORMATS[format].where}
          </p>

          {/* The canvas is full export size; CSS only scales it to fit. */}
          <canvas
            ref={canvasRef}
            className="w-full rounded-xl"
            style={{ aspectRatio: `${FORMATS[format].w} / ${FORMATS[format].h}` }}
          />

          <Button onClick={download} className="mt-4" full>
            <Download size={17} /> Download PNG
          </Button>
        </div>

        {/* ── Edit ────────────────────────────────────────────────────── */}
        <div className="glass space-y-3 rounded-2xl p-5">
          <p className="font-display text-base font-bold text-fg">Edit</p>
          <Field label="Eyebrow" v={copy.eyebrow} on={set("eyebrow")} />
          <Field label="Headline" v={copy.title} on={set("title")} />
          <Field label="Headline — coloured half" v={copy.accent} on={set("accent")} />
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-fg">Body</span>
            <textarea className={inputClass + " min-h-[4rem]"} value={copy.body} onChange={set("body")} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-fg">Bullets — one per line</span>
            <textarea
              className={inputClass + " min-h-[4rem]"}
              value={copy.bullets.join("\n")}
              onChange={(e) =>
                setCopy({ ...copy, bullets: e.target.value.split("\n").filter(Boolean).slice(0, 3) })
              }
            />
          </label>
          <Field label="Kicker — the punch line" v={copy.kicker} on={set("kicker")} />
          <p className="text-xs text-faint">
            The WhatsApp pill uses the public number from Settings. Keep the headline short — it is
            set very large, and a long one is what makes a card look amateur.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, v, on }: { label: string; v: string; on: (e: { target: { value: string } }) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-fg">{label}</span>
      <input className={inputClass} value={v} onChange={on} />
    </label>
  );
}
