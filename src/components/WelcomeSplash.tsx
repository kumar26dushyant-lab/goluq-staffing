import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useVoice } from "../lib/voice";

const SEEN_KEY = "goluq_welcomed";
/** How long to wait for speech to actually begin before offering a tap. */
const AUTOPLAY_GRACE_MS = 900;
/** How long the brand moment holds when there is no voice at all. */
const SILENT_HOLD_MS = 6500;
/** Absolute ceiling — nothing may strand a visitor on the splash. */
const HARD_STOP_MS = 14000;

/**
 * The first few seconds.
 *
 * Its job is pronunciation: most Indian visitors read "GoLuQ" as "golu" on
 * first sight, so the mark appears in Latin AND Devanagari with the roman hint.
 * That half is pure visuals and cannot fail.
 *
 * For the voice we ATTEMPT immediate playback rather than assuming it is
 * blocked — desktop Chrome usually allows speechSynthesis without a gesture.
 * Mobile browsers (which is ~all the traffic) do block it, so if speech hasn't
 * actually begun within a short grace period we reveal a tap button. `onStart`
 * is the only trustworthy signal here: speak() resolves happily even when the
 * platform silently refuses.
 *
 * Built mobile-first: safe-area insets, one-thumb tap target, and the spoken
 * line shown as text so the visitor reads along with the audio.
 */
export function WelcomeSplash() {
  const { t, i18n } = useTranslation();
  const { say, supported } = useVoice();
  const reduced = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const started = useRef(false);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const close = () => {
    clearTimers();
    setOpen(false);
  };

  /** Speak the welcome. `force` because the provider's unlock state may not
   *  have caught up with the gesture that triggered this. */
  const speakNow = () => {
    setNeedsTap(false);
    say(
      t("welcome.spoken"),
      {
        onStart: () => {
          started.current = true;
          setSpeaking(true);
        },
        onEnd: () => {
          setSpeaking(false);
          // A beat after the sentence ends, so it doesn't cut away mid-breath.
          later(close, 700);
        },
      },
      true
    );
  };

  useEffect(() => {
    // Never greet the owner into the cockpit, or a partner into their dashboard.
    // Read location directly — this mounts outside the router.
    const p = window.location.pathname;
    if (p.startsWith("/admin") || p.startsWith("/partner")) return;
    if (sessionStorage.getItem(SEEN_KEY)) return;
    sessionStorage.setItem(SEEN_KEY, "1");
    setOpen(true);

    if (supported) {
      // Try straight away. Browsers that allow it will just start talking.
      speakNow();
      later(() => {
        // Nothing actually began → the platform blocked it. Ask for one tap.
        if (!started.current) setNeedsTap(true);
      }, AUTOPLAY_GRACE_MS);
    } else {
      later(close, SILENT_HOLD_MS);
    }

    // Belt and braces: never leave anyone stuck here.
    later(() => {
      if (!started.current) close();
    }, SILENT_HOLD_MS + AUTOPLAY_GRACE_MS);
    later(close, HARD_STOP_MS);

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  const isHi = i18n.language.startsWith("hi");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="welcome"
          initial={reduced ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: "-100%" }}
          transition={{ duration: reduced ? 0.25 : 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
          style={{
            background: "rgb(var(--c-base))",
            paddingTop: "max(2rem, env(safe-area-inset-top))",
            paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
            paddingLeft: "max(1.25rem, env(safe-area-inset-left))",
            paddingRight: "max(1.25rem, env(safe-area-inset-right))",
          }}
          role="dialog"
          aria-label={t("welcome.aria")}
        >
          <div className="flex w-full max-w-md flex-col items-center text-center">
            {/* The mark */}
            <motion.p
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="font-display font-bold leading-none tracking-tight"
              style={{ fontSize: "clamp(3.2rem, 17vw, 6.5rem)" }}
            >
              <span className="brand-go">GO</span>
              <span className="brand-luq ml-[0.06em]">LuQ</span>
            </motion.p>

            {/* How it is actually said */}
            <motion.p
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-4 font-deva font-bold text-fg"
              style={{ fontSize: "clamp(1.9rem, 9vw, 3rem)" }}
            >
              गो&nbsp;लुक़
            </motion.p>

            <motion.p
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.5 }}
              className="mt-2 font-mono text-xs uppercase tracking-[0.4em] text-brand-luq sm:text-sm"
            >
              go-look
            </motion.p>

            <motion.p
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-4 text-balance text-sm leading-relaxed text-muted sm:text-base"
            >
              {t("welcome.hint")}
            </motion.p>

            {/* Read-along: the spoken sentence appears as it is being said. */}
            <div className="mt-7 min-h-[4.5rem] w-full">
              <AnimatePresence mode="wait">
                {speaking ? (
                  <motion.p
                    key="line"
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-balance font-display text-base font-semibold leading-relaxed text-fg sm:text-lg"
                  >
                    {t("welcome.spoken")}
                  </motion.p>
                ) : needsTap ? (
                  <motion.button
                    key="tap"
                    type="button"
                    onClick={speakNow}
                    initial={reduced ? false : { opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative inline-flex min-h-[3.5rem] items-center gap-2.5 rounded-full px-8 py-4 font-display text-lg font-bold text-ink"
                    style={{
                      background:
                        "linear-gradient(135deg, rgb(var(--c-teal-glow)), rgb(var(--c-teal-neon)))",
                      boxShadow: "0 8px 28px rgb(var(--c-teal-glow) / 0.45)",
                    }}
                  >
                    {!reduced && (
                      <span className="absolute inset-0 animate-pulse-ring rounded-full border border-teal-glow/60" />
                    )}
                    <Volume2 size={20} /> {t("welcome.listen")}
                  </motion.button>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Equaliser only while sound is genuinely coming out. */}
            {speaking && !reduced && (
              <span className="mt-1 flex items-end gap-1" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((b) => (
                  <span
                    key={b}
                    className="w-[3px] rounded-full bg-brand-luq"
                    // Explicit base height: the keyframe animates height, so
                    // without this the bars are 0px until the first frame.
                    style={{ height: 8, animation: `wave 0.9s ${b * 0.1}s ease-in-out infinite` }}
                  />
                ))}
              </span>
            )}

            <button
              type="button"
              onClick={close}
              className="mt-8 min-h-[2.75rem] px-4 text-sm font-semibold text-muted underline-offset-4 hover:text-fg hover:underline"
            >
              {isHi ? t("welcome.skip") : t("welcome.skip")} →
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
