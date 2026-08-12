import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useVoice } from "../lib/voice";
import { fetchSiteConfig } from "../lib/siteConfig";

const SEEN_KEY = "goluq_welcomed";
const LANG_KEY = "goluq_lang";

/** The brand moment is never shorter than this, whatever happens with audio. */
const MIN_VISIBLE_MS = 5000;
/** How long to wait for speech to actually begin before offering a tap. */
const AUTOPLAY_GRACE_MS = 1200;
/** If speech never starts and nobody taps, leave anyway. */
const SILENT_HOLD_MS = 8000;
/** Absolute ceiling — nothing may strand a visitor here. */
const HARD_STOP_MS = 25000;

/**
 * The first few seconds: the mark in Latin and Devanagari with the roman
 * pronunciation, so a visitor learns how to say the name before anything else.
 *
 * Language follows the visitor — India gets Hindi (page and voice), everyone
 * else English — unless they have already chosen a language, which always wins.
 *
 * TIMING MODEL: one deadline (`closeAt`) that may only ever move FORWARD, read
 * by one ticker. An earlier version scheduled several independent `setTimeout`
 * closes that raced each other and dismissed the splash after a second or two.
 * Nothing here can pull the deadline in — only the explicit Skip button leaves
 * immediately.
 *
 * AUDIO: `say()` fires `onEnd()` SYNCHRONOUSLY when muted or unsupported, so
 * `onEnd` proves nothing. Only `onStart` proves audio began. Mobile browsers
 * block speechSynthesis without a gesture (desktop usually allows it), so we
 * attempt playback and reveal a tap button only if nothing actually started.
 */
export function WelcomeSplash() {
  const { t, i18n } = useTranslation();
  const { say, supported, muted, toggleMute } = useVoice();
  const reduced = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const started = useRef(false);
  const closeAt = useRef(0);

  /** Ask to leave in `ms`. Never brings the deadline forward. */
  const closeIn = (ms: number) => {
    const want = Date.now() + ms;
    if (want > closeAt.current) closeAt.current = want;
  };

  const speakNow = () => {
    setNeedsTap(false);
    // Hold the splash open while a sentence is in flight; the deadline is
    // pulled back to a short beat as soon as it genuinely ends.
    closeIn(HARD_STOP_MS);
    say(
      t("welcome.spoken"),
      {
        onStart: () => {
          started.current = true;
          setSpeaking(true);
        },
        onEnd: () => {
          setSpeaking(false);
          if (started.current) {
            // Speech really played — leave shortly after, but never before the
            // minimum. Reset then extend so we don't wait out HARD_STOP_MS.
            closeAt.current = 0;
            closeIn(900);
          }
        },
      },
      true
    );
  };

  const unmuteAndSpeak = () => {
    toggleMute();
    window.setTimeout(speakNow, 60); // let the provider's state settle
  };

  useEffect(() => {
    // Never greet the owner into the cockpit, or a partner into their dashboard.
    const p = window.location.pathname;
    if (p.startsWith("/admin") || p.startsWith("/partner")) return;
    if (sessionStorage.getItem(SEEN_KEY)) return;
    sessionStorage.setItem(SEEN_KEY, "1");

    closeAt.current = Date.now() + MIN_VISIBLE_MS;
    setOpen(true);

    let cancelled = false;

    // The single ticker. Nothing else calls setOpen(false) except Skip.
    const tick = window.setInterval(() => {
      if (Date.now() >= closeAt.current) {
        window.clearInterval(tick);
        setOpen(false);
      }
    }, 150);

    (async () => {
      // Resolve the language BEFORE speaking, so the greeting is never in the
      // wrong one. A stored preference always wins over geography.
      try {
        const cfg = await fetchSiteConfig();
        if (!localStorage.getItem(LANG_KEY) && cfg.country) {
          const want = cfg.country === "IN" ? "hi" : "en";
          if (!i18n.language.startsWith(want)) await i18n.changeLanguage(want);
        }
      } catch {
        /* keep whatever the detector picked */
      }
      if (cancelled) return;

      if (!supported) {
        closeIn(SILENT_HOLD_MS);
        return;
      }
      if (muted) {
        setNeedsTap(true); // respect the mute, but offer one tap to hear it
        closeIn(SILENT_HOLD_MS);
        return;
      }

      speakNow();
      window.setTimeout(() => {
        if (cancelled || started.current) return;
        // Nothing began → the platform refused. Ask for one tap.
        setNeedsTap(true);
        closeAt.current = 0;
        closeIn(SILENT_HOLD_MS);
      }, AUTOPLAY_GRACE_MS);
    })();

    return () => {
      cancelled = true;
      window.clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="welcome"
          initial={reduced ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: "-100%" }}
          transition={{ duration: reduced ? 0.25 : 0.8, ease: [0.22, 1, 0.36, 1] }}
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

            {/* How the name is said — shown, never contrasted with a wrong
                version, which only plants the wrong one. */}
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
              className="mt-5 text-balance text-sm leading-relaxed text-muted sm:text-base"
            >
              {t("welcome.tagline")}
            </motion.p>

            {/* Read-along, so the words and the voice arrive together. */}
            <div className="mt-7 flex min-h-[5rem] w-full items-center justify-center">
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
                    onClick={muted ? unmuteAndSpeak : speakNow}
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
                    {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    {muted ? t("welcome.unmute") : t("welcome.listen")}
                  </motion.button>
                ) : null}
              </AnimatePresence>
            </div>

            {speaking && !reduced && (
              <span className="flex items-end gap-1" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((b) => (
                  <span
                    key={b}
                    className="w-[3px] rounded-full bg-brand-luq"
                    style={{ height: 8, animation: `wave 0.9s ${b * 0.1}s ease-in-out infinite` }}
                  />
                ))}
              </span>
            )}

            {/* The only thing allowed to leave immediately. */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-8 min-h-[2.75rem] px-4 text-sm font-semibold text-muted underline-offset-4 hover:text-fg hover:underline"
            >
              {t("welcome.skip")} →
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
