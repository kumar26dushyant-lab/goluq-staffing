import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronDown, Share2, Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useVoice } from "../../lib/voice";
import { useMoney, usePricing } from "../../lib/siteConfig";
import { useRegion, type Region } from "../../lib/region";

/**
 * The homepage as a story: six chapters, one screen each.
 *
 * Every chapter is a business owner in an ordinary bad moment, dissolving into
 * the same owner once the thing GoLuQ builds is in place. The picture is the
 * chapter's reel — the same 15–20 s film we post on Instagram, with its own
 * voice-over — playing on its own as it scrolls into view and stopping as it
 * leaves. One line for each state, the product's name, one button.
 *
 * Sound: reels start muted (browsers allow nothing else) and the pill turns
 * the voice-over on for whichever chapter is on screen. The browser's own
 * speech synthesis is gone from this page — it stalled and spoke over the
 * wrong card; the reel's recorded voice cannot.
 *
 * Region changes the wording, never the pictures (see lib/region.ts).
 */
export const CHAPTERS = ["coaching", "distributor", "ca", "garment", "claims", "ceo"] as const;
export type ChapterId = (typeof CHAPTERS)[number];

const BEAT_MS = 2200;
/** Bump when posters are regenerated: the edge caches images by URL. */
const STORY_V = "3";
/** Fired from the sound pill inside the click, so iOS lets the video unmute. */
const SOUND_EVENT = "goluq:sound";

export function StoryChapters() {
  const [active, setActive] = useState(0);
  const region = useRegion();
  return (
    <div className="relative">
      {CHAPTERS.map((id, i) => (
        <Chapter key={id} id={id} index={i} region={region} onEnter={() => setActive(i)} />
      ))}
      <div className="pointer-events-none fixed right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2 sm:flex" aria-hidden="true">
        {CHAPTERS.map((id, i) => (
          <span key={id} className={`h-2 w-2 rounded-full transition-all ${i === active ? "scale-125 bg-brand-luq" : "bg-fg/25"}`} />
        ))}
      </div>
      <SoundPill />
    </div>
  );
}

/** Always visible while the story is on screen. */
function SoundPill() {
  const { t } = useTranslation();
  const { muted, toggleMute } = useVoice();
  const onClick = () => {
    // Tell the visible reel first, synchronously, while we are still inside
    // the user's tap — that is the only moment a phone lets audio start.
    window.dispatchEvent(new CustomEvent(SOUND_EVENT, { detail: { on: muted } }));
    toggleMute();
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!muted}
      className="fixed left-4 top-[68px] z-30 inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/70 px-4 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur lg:bottom-6 lg:left-6 lg:top-auto"
    >
      {muted ? <VolumeX size={17} /> : <Volume2 size={17} className="text-brand-luq" />}
      {muted ? t("story.soundOff") : t("story.soundOn")}
    </button>
  );
}

/**
 * The chapter's reel. Plays when the chapter is on screen, pauses when it is
 * not; muted unless the visitor asked for sound. If an unmuted play is refused
 * (autoplay policy), it falls back to muted rather than showing a frozen frame.
 */
function Reel({ id, inView, eager, className = "" }: { id: ChapterId; inView: boolean; eager: boolean; className?: string }) {
  const { i18n } = useTranslation();
  const { muted } = useVoice();
  const ref = useRef<HTMLVideoElement>(null);
  const lang = i18n.language.startsWith("hi") ? "hi" : "en";
  const src = `/media/reel-${id}-${lang}.mp4`;

  const play = (withSound: boolean) => {
    const v = ref.current;
    if (!v) return;
    v.muted = !withSound;
    const p = v.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        if (!v.muted) { v.muted = true; v.play().catch(() => {}); }
      });
    }
  };

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (inView) play(!muted);
    else { v.pause(); v.currentTime = 0; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, muted, src]);

  useEffect(() => {
    const onSound = (e: Event) => {
      if (!inView) return;
      const on = Boolean((e as CustomEvent).detail?.on);
      play(on);
    };
    window.addEventListener(SOUND_EVENT, onSound);
    return () => window.removeEventListener(SOUND_EVENT, onSound);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  return (
    <div className={`overflow-hidden bg-black ${className}`}>
      <video
        key={src}
        ref={ref}
        src={src}
        poster={`/story/${id}_before.webp?v=${STORY_V}`}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        loop
        playsInline
        preload={eager ? "auto" : "metadata"}
        aria-hidden="true"
      />
    </div>
  );
}

function Chapter({ id, index, region, onEnter }: { id: ChapterId; index: number; region: Region; onEnter: () => void }) {
  const { t, i18n } = useTranslation();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const [after, setAfter] = useState(false);
  const [played, setPlayed] = useState(false);
  const timer = useRef<number | null>(null);

  // Regional wording where it exists, the base line otherwise.
  const line = (key: "who" | "before" | "after" | "product" | "ask") =>
    t(`story.regions.${region}.chapters.${id}.${key}`, { defaultValue: t(`story.chapters.${id}.${key}`) });

  const pricing = usePricing();
  const money = useMoney();
  const managed = pricing.find((p) => p.id === "officeManaged");
  const price = managed ? money(managed.offer ?? managed.from) : "";
  const before = line("before");
  const afterLine = line("after");
  const product = t(`story.regions.${region}.chapters.${id}.product`, { defaultValue: t(`story.chapters.${id}.product`, { price }), price });

  useEffect(() => {
    if (!inView) {
      if (timer.current) window.clearTimeout(timer.current);
      return;
    }
    onEnter();
    setAfter(false);
    timer.current = window.setTimeout(() => { setAfter(true); setPlayed(true); }, reduced ? 600 : BEAT_MS);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, i18n.language, region]);

  const ask = () => {
    window.dispatchEvent(new CustomEvent("goluq:ask", { detail: { text: line("ask"), chapter: id } }));
  };
  const share = () => {
    const url = `${window.location.origin}${window.location.pathname}#story-${id}`;
    const text = t("story.shareText", { line: afterLine, url });
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    }
  };

  const words = (dark: boolean) => (
    <div className={dark ? "text-white" : "text-fg"}>
      <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold sm:text-base ${dark ? "bg-black/45 text-brand-luq backdrop-blur" : "bg-brand-luq/10 text-brand-luq"}`}>
        <span className="font-mono">{String(index + 1).padStart(2, "0")}</span> · {line("who")}
      </p>
      <div className="mt-2 min-h-0 sm:min-h-[12rem] lg:min-h-[14rem]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={after ? "after" : "before"}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className={`text-balance font-display font-bold leading-[1.1] ${(after ? afterLine : before).length > 75 ? "text-[1.45rem] sm:text-[2.6rem] lg:text-[3rem]" : "text-[1.7rem] sm:text-5xl lg:text-[3.4rem]"} ${after ? "" : dark ? "text-white/85" : "text-muted"}`}
          >
            <span className={`mb-2 block text-sm font-bold uppercase tracking-wide ${after ? "text-brand-luq" : dark ? "text-white/60" : "text-faint"}`}>
              {after ? t("story.after") : t("story.before")}
            </span>
            {after ? afterLine : before}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="mt-3 min-h-[3rem] sm:mt-5">
        <AnimatePresence>
          {after ? (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.25 }}
              className="flex flex-wrap items-center gap-2 sm:gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="rounded-full border border-brand-luq/50 bg-brand-luq/15 px-3 py-1.5 text-sm font-semibold text-brand-luq sm:px-3.5 sm:py-2 sm:text-base">
                {product}
              </span>
              <button
                type="button"
                onClick={ask}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-base font-bold shadow-lg sm:px-6 sm:py-3.5 sm:text-lg ${dark ? "bg-white text-[#0B1020]" : "bg-fg text-[rgb(var(--c-base))]"}`}
              >
                {t("story.cta")} <ArrowRight size={19} />
              </button>
              <button
                type="button"
                onClick={share}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2.5 text-sm font-semibold sm:px-4 sm:py-3 sm:text-base ${dark ? "border-white/30 text-white/90" : "border-hairline/30 text-muted"}`}
              >
                <Share2 size={17} /> {t("story.share")}
              </button>
            </motion.div>
          ) : (
            !played && <p className={`text-base ${dark ? "text-white/65" : "text-faint"}`}>{t("story.tap")}</p>
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
      {/* Phone: the reel on top, words below it — never on top of the film. */}
      <div className="flex min-h-[100svh] flex-col lg:hidden">
        <div className="relative h-[52svh] shrink-0">
          <Reel id={id} inView={inView} eager={index === 0} className="absolute inset-0" />
          {/* A soft fade into the caption panel, so the join reads as one card. */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0B1020] to-transparent" aria-hidden="true" />
          {index === 0 && (
            <motion.div aria-hidden="true" animate={reduced ? undefined : { y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 text-white/70">
              <ChevronDown size={22} />
            </motion.div>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-center bg-[#0B1020] px-5 pb-6 pr-20 pt-3 sm:px-8">{words(true)}</div>
      </div>

      {/* Desk: the reel, phone-shaped, beside the words. */}
      <div className="mx-auto hidden min-h-[100svh] w-full max-w-6xl grid-cols-[minmax(0,420px)_1fr] items-center gap-12 px-8 lg:grid">
        <Reel id={id} inView={inView} eager={index === 0} className="relative aspect-[9/16] max-h-[82vh] w-full rounded-3xl shadow-glass" />
        <div>{words(false)}</div>
      </div>
    </section>
  );
}
