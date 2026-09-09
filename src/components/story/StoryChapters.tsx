import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useVoice } from "../../lib/voice";

/**
 * The homepage as a story: five chapters, one screen each.
 *
 * Every chapter is a business owner in an ordinary bad moment, dissolving into
 * the same owner once the thing GoLuQ builds is in place. One line for each
 * state, the product's name, one button. No paragraphs — a visitor on a phone
 * consumes it the way they consume a reel: look, feel it, swipe.
 *
 * Interaction: the chapter plays itself when it scrolls into view (before →
 * after after a beat); a tap flips it; the dots on the right show where you
 * are. Voice narration follows the two lines when the visitor has voice on.
 */
export const CHAPTERS = ["coaching", "distributor", "ca", "garment", "claims"] as const;
export type ChapterId = (typeof CHAPTERS)[number];

const BEAT_MS = 2200;

export function StoryChapters() {
  const [active, setActive] = useState(0);
  return (
    <div className="relative">
      {CHAPTERS.map((id, i) => (
        <Chapter key={id} id={id} index={i} onEnter={() => setActive(i)} />
      ))}
      {/* Progress, story-style, fixed while the chapters scroll. */}
      <div className="pointer-events-none fixed right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2 sm:flex" aria-hidden="true">
        {CHAPTERS.map((id, i) => (
          <span key={id} className={`h-2 w-2 rounded-full transition-all ${i === active ? "scale-125 bg-brand-luq" : "bg-fg/25"}`} />
        ))}
      </div>
    </div>
  );
}

function Chapter({ id, index, onEnter }: { id: ChapterId; index: number; onEnter: () => void }) {
  const { t, i18n } = useTranslation();
  const reduced = useReducedMotion();
  const { say, muted, supported } = useVoice();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.6 });
  const [after, setAfter] = useState(false);
  const [played, setPlayed] = useState(false);
  const timer = useRef<number | null>(null);

  const before = t(`story.chapters.${id}.before`);
  const afterLine = t(`story.chapters.${id}.after`);

  // Play once per entry: before, a beat, then after. Re-entering replays.
  useEffect(() => {
    if (!inView) {
      if (timer.current) window.clearTimeout(timer.current);
      return;
    }
    onEnter();
    setAfter(false);
    timer.current = window.setTimeout(() => { setAfter(true); setPlayed(true); }, reduced ? 600 : BEAT_MS);
    if (supported && !muted) say([before, afterLine]);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, i18n.language]);

  const ask = () => {
    window.dispatchEvent(new CustomEvent("goluq:ask", { detail: { text: t(`story.chapters.${id}.ask`), chapter: id } }));
  };

  const src = (state: "before" | "after") => `/story/${id}_${state}.webp`;

  return (
    <section
      ref={ref}
      id={`story-${id}`}
      className="relative flex min-h-[100svh] snap-start items-end overflow-hidden bg-abyss lg:items-center"
      onClick={() => setAfter((a) => !a)}
    >
      {/* Scene: the two states cross-fade in place. */}
      <div className="absolute inset-0 lg:relative lg:mx-auto lg:grid lg:min-h-[100svh] lg:w-full lg:max-w-6xl lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-8">
        <div className="absolute inset-0 lg:relative lg:aspect-[4/5] lg:max-h-[82vh] lg:overflow-hidden lg:rounded-3xl">
          <img src={src("before")} alt="" className="absolute inset-0 h-full w-full object-cover" loading={index === 0 ? "eager" : "lazy"} decoding="async" />
          <motion.img
            src={src("after")}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            initial={false}
            animate={{ opacity: after ? 1 : 0 }}
            transition={{ duration: reduced ? 0 : 0.9, ease: "easeInOut" }}
            loading={index === 0 ? "eager" : "lazy"}
            decoding="async"
          />
          {/* Legibility on a phone: the words sit on a gradient, never on the art. */}
          <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-abyss via-abyss/70 to-transparent lg:hidden" />
        </div>

        {/* Words */}
        <div className="relative z-10 w-full px-5 pb-24 pt-10 sm:px-8 lg:px-0 lg:pb-0 lg:pt-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brand-luq sm:text-xs">
            {String(index + 1).padStart(2, "0")} · {t(`story.chapters.${id}.who`)}
          </p>
          <div className="mt-3 min-h-[7.5rem] sm:min-h-[8.5rem] lg:min-h-[10rem]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={after ? "after" : "before"}
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className={`text-balance font-display text-[1.9rem] font-bold leading-[1.08] sm:text-4xl lg:text-5xl ${after ? "text-white lg:text-fg" : "text-white/85 lg:text-muted"}`}
              >
                <span className={`mb-2 block font-mono text-[11px] tracking-[0.24em] ${after ? "text-brand-luq" : "text-white/50 lg:text-faint"}`}>
                  {after ? t("story.after").toUpperCase() : t("story.before").toUpperCase()}
                </span>
                {after ? afterLine : before}
              </motion.p>
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {after && (
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-4 flex flex-wrap items-center gap-3"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="rounded-full border border-brand-luq/40 bg-brand-luq/10 px-3 py-1.5 text-sm font-semibold text-brand-luq">
                  {t(`story.chapters.${id}.product`)}
                </span>
                <button
                  type="button"
                  onClick={ask}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-base font-bold text-ink shadow-lg lg:bg-fg lg:text-base"
                >
                  {t("story.cta")} <ArrowRight size={17} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          {!after && !played && (
            <p className="mt-4 text-sm text-white/60 lg:text-faint">{t("story.tap")}</p>
          )}
        </div>
      </div>

      {index === 0 && (
        <motion.div
          aria-hidden="true"
          animate={reduced ? undefined : { y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
          className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 text-white/60"
        >
          <ChevronDown size={22} />
        </motion.div>
      )}
    </section>
  );
}
