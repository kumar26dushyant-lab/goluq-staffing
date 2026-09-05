import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Quote } from "lucide-react";
import { useTranslation } from "react-i18next";

interface T {
  id: number;
  name: string;
  title: string | null;
  company: string | null;
  quote: string;
  video_path: string | null;
  poster_path: string | null;
  lang: string;
  product: string | null;
}

/**
 * Real customers, in their own words — and, when there is one, their own voice.
 *
 * Renders nothing at all until the owner has switched a testimonial live, so an
 * empty section never appears on a page. `product` narrows what shows on a
 * product page; the homepage shows everything.
 *
 * Videos are self-hosted MP4s under /media, played inline with the browser's
 * own controls. No third-party player, no tracking, no competitor's video
 * suggested at the end.
 */
export function Testimonials({ product, className = "" }: { product?: string; className?: string }) {
  const { t, i18n } = useTranslation();
  const reduced = useReducedMotion();
  const [rows, setRows] = useState<T[]>([]);

  useEffect(() => {
    let alive = true;
    fetch("/api/testimonials")
      .then((r) => r.json())
      .then((d) => alive && setRows(d?.testimonials || []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const lang = i18n.language.startsWith("hi") ? "hi" : "en";
  // Prefer the visitor's language, but never hide a testimonial for lacking one.
  const shown = rows
    .filter((r) => !product || !r.product || r.product === product)
    .sort((a, b) => (a.lang === lang ? -1 : 0) - (b.lang === lang ? -1 : 0));

  if (!shown.length) return null;

  return (
    <section className={className} aria-labelledby="testimonials-title">
      <p className="font-mono text-sm uppercase tracking-[0.28em] text-brand-luq">
        {t("testimonials.kicker")}
      </p>
      <h2 id="testimonials-title" className="mt-2 max-w-3xl text-balance font-display text-2xl font-bold sm:text-4xl">
        <span className="text-gradient-accent">{t("testimonials.title")}</span>
      </h2>

      <div className={`mt-8 grid gap-5 ${shown.length > 1 ? "lg:grid-cols-2" : ""}`}>
        {shown.map((r, i) => (
          <motion.figure
            key={r.id}
            initial={reduced ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: Math.min(i, 3) * 0.06, duration: 0.5 }}
            className="glass glow-teal overflow-hidden rounded-3xl"
          >
            {r.video_path && (
              <video
                className="aspect-video w-full bg-abyss/60 object-cover"
                controls
                preload="metadata"
                playsInline
                poster={r.poster_path || undefined}
                src={r.video_path}
              />
            )}
            <div className="p-6">
              <Quote size={22} className="text-brand-luq" aria-hidden="true" />
              <blockquote className="mt-3 text-base leading-relaxed text-fg sm:text-lg">
                “{r.quote}”
              </blockquote>
              <figcaption className="mt-4 text-sm text-muted">
                <span className="font-semibold text-fg">{r.name}</span>
                {r.title || r.company ? ` — ${[r.title, r.company].filter(Boolean).join(", ")}` : ""}
              </figcaption>
            </div>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}
