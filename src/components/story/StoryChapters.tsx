import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useVoice } from "../../lib/voice";
import { useMoney, usePricing } from "../../lib/siteConfig";

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
 *
 * On a phone the scene is the screen and the words sit at the bottom on a
 * dark gradient — theme-independent, because the art is always light and the
 * page background is light in light mode. On a desk the scene is a portrait
 * card beside the words.
 */
export const CHAPTERS = ["coaching", "distributor", "ca", "garment", "claims", "ceo"] as const;
export type ChapterId = (typeof CHAPTERS)[number];

const BEAT_MS = 2200;

export function StoryChapters() {
  const [active, setActive] = useState(0);
  return (
    <div className="relative">
      {CHAPTERS.map((id, i) => (
        <Chapter key={id} id={id} index={i} onEnter={() => setActive(i)} />
      ))}
      <div className="pointer-events-none fixed right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2 sm:flex" aria-hidden="true">
        {CHAPTERS.map((id, i) => (
          <span key={id} className={`h-2 w-2 rounded-full transition-all ${i === active ? "scale-125 bg-brand-luq" : "bg-fg/25"}`} />
        ))}
      </div>
    </div>
  );
}

function Scene({ id, after, eager, reduced, className = "" }: { id: ChapterId; after: boolean; eager: boolean; reduced: boolean | null; className?: string }) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <img src={`/story/${id}_before.webp`} alt="" className="absolute inset-0 h-full w-full object-cover" loading={eager ? "eager" : "lazy"} decoding="async" />
      <motion.img
        src={`/story/${id}_after.webp`}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        initial={false}
        animate={{ opacity: after ? 1 : 0 }}
        transition={{ duration: reduced ? 0 : 0.9, ease: "easeInOut" }}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
    </div>
  );
}

function Chapter({ id, index, onEnter }: { id: ChapterId; index: number; onEnter: () => void }) {
  const { t, i18n } = useTranslation();
  const reduced = useReducedMotion();
  const { say, muted, supported } = useVoice();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const [after, setAfter] = useState(false);
  const [played, setPlayed] = useState(false);
  const timer = useRef<number | null>(null);

  const before = t(`story.chapters.${id}.before`);
  const afterLine = t(`story.chapters.${id}.after`);
  // The closing chapter names a real, live price — the managed plan — in the
  // visitor's currency, so "less than one salary" is a checkable claim.
  const pricing = usePricing();
  const money = useMoney();
  const managed = pricing.find((p) => p.id === "officeManaged");
  const productLabel = t(`story.chapters.${id}.product`, { price: managed ? money(managed.offer ?? managed.from) : "" });

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

  const words = (dark: boolean) => (
    <div className={dark ? "text-white" : "text-fg"}>
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brand-luq sm:text-xs">
        {String(index + 1).padStart(2, "0")} · {t(`story.chapters.${id}.who`)}
      </p>
      <div className="mt-3 min-h-[8rem] sm:min-h-[9rem] lg:min-h-[11rem]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={after ? "after" : "before"}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className={`text-balance font-display text-[1.95rem] font-bold leading-[1.08] sm:text-4xl lg:text-5xl ${after ? "" : dark ? "text-white/80" : "text-muted"}`}
          >
            <span className={`mb-2 block font-mono text-[11px] tracking-[0.24em] ${after ? "text-brand-luq" : dark ? "text-white/50" : "text-faint"}`}>
              {(after ? t("story.after") : t("story.before")).toUpperCase()}
            </span>
            {after ? afterLine : before}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="mt-4 min-h-[3.25rem]">
        <AnimatePresence>
          {after ? (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.25 }}
              className="flex flex-wrap items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="rounded-full border border-brand-luq/50 bg-brand-luq/15 px-3 py-1.5 text-sm font-semibold text-brand-luq">
                {productLabel}
              </span>
              <button
                type="button"
                onClick={ask}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-base font-bold shadow-lg ${dark ? "bg-white text-[#0B1020]" : "bg-fg text-[rgb(var(--c-base))]"}`}
              >
                {t("story.cta")} <ArrowRight size={17} />
              </button>
            </motion.div>
          ) : (
            !played && <p className={`text-sm ${dark ? "text-white/60" : "text-faint"}`}>{t("story.tap")}</p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <section
      ref={ref}
      id={`story-${id}`}
      className="relative snap-start overflow-hidden bg-black lg:bg-transparent"
      onClick={() => setAfter((a) => !a)}
    >
      {/* Phone: the scene is the screen. */}
      <div className="relative min-h-[100svh] lg:hidden">
        <Scene id={id} after={after} eager={index === 0} reduced={reduced} className="absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-[66%] bg-gradient-to-t from-black/95 via-black/65 to-transparent" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-28 pr-24 sm:px-8">{words(true)}</div>
        {index === 0 && (
          <motion.div aria-hidden="true" animate={reduced ? undefined : { y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-white/70">
            <ChevronDown size={22} />
          </motion.div>
        )}
      </div>

      {/* Desk: portrait scene beside the words. */}
      <div className="mx-auto hidden min-h-[100svh] w-full max-w-6xl grid-cols-2 items-center gap-12 px-8 lg:grid">
        <Scene id={id} after={after} eager={index === 0} reduced={reduced} className="relative aspect-[4/5] max-h-[82vh] rounded-3xl shadow-glass" />
        <div>{words(false)}</div>
      </div>
    </section>
  );
}
