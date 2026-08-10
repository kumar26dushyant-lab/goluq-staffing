import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useVoice } from "../lib/voice";

const SEEN_KEY = "goluq_welcomed";
/** How long the brand moment holds before folding away on its own. */
const AUTO_FOLD_MS = 4200;

/**
 * The first three seconds.
 *
 * Its real job is pronunciation: "GoLuQ" is read as "golu" by most Indian
 * visitors on first sight, so the mark is shown in Latin AND Devanagari with the
 * roman hint underneath. That part is guaranteed — it is pure visuals.
 *
 * The Hindi voice welcome CANNOT auto-play: every modern browser blocks audio
 * until the visitor taps, clicks or presses something. So the tap button IS the
 * gesture — pressing it both unlocks audio and speaks. If nobody taps, the
 * splash folds silently and the visitor has still seen how to say the name.
 *
 * Shown once per session; never blocks the page underneath, which renders behind
 * it and is fully interactive the moment this folds.
 */
export function WelcomeSplash() {
  const { t, i18n } = useTranslation();
  const { say, supported } = useVoice();
  const reduced = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    // Never greet the owner on their way into the cockpit, or a partner opening
    // their dashboard — this is a first-impression device for visitors only.
    // Read from location directly: this mounts outside the router.
    const p = window.location.pathname;
    if (p.startsWith("/admin") || p.startsWith("/partner")) return;
    if (sessionStorage.getItem(SEEN_KEY)) return;
    sessionStorage.setItem(SEEN_KEY, "1");
    setOpen(true);
    timer.current = window.setTimeout(() => setOpen(false), AUTO_FOLD_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const close = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setOpen(false);
  };

  const listen = () => {
    // Cancel the auto-fold so the greeting isn't cut off mid-sentence.
    if (timer.current) window.clearTimeout(timer.current);
    setSpeaking(true);
    // `force` because this click IS the unlocking gesture — waiting for the
    // provider's state to update would drop the very first utterance.
    say(
      t("welcome.spoken"),
      {
        onEnd: () => {
          setSpeaking(false);
          setOpen(false);
        },
      },
      true
    );
    // Safety net: if speech never fires (no voice pack installed, silent
    // failure), don't strand the visitor on the splash.
    timer.current = window.setTimeout(() => setOpen(false), 9000);
  };

  const isHi = i18n.language.startsWith("hi");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="welcome"
          initial={reduced ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: "-100%" }}
          transition={{ duration: reduced ? 0.2 : 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[60] grid place-items-center px-6"
          style={{ background: "rgb(var(--c-base))" }}
          role="dialog"
          aria-label={t("welcome.aria")}
        >
          <div className="text-center">
            {/* The mark, then how to say it. */}
            <motion.p
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="font-display text-[clamp(3rem,15vw,7rem)] font-bold leading-none tracking-tight"
            >
              <span className="brand-go">GO</span>
              <span className="brand-luq ml-[0.06em]">LuQ</span>
            </motion.p>

            <motion.p
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="mt-3 font-deva text-[clamp(1.6rem,7vw,2.6rem)] font-bold text-fg"
            >
              गो&nbsp;लुक़
            </motion.p>

            <motion.p
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-1 font-mono text-sm uppercase tracking-[0.35em] text-muted"
            >
              · go-look ·
            </motion.p>

            {/* The tap that both unlocks audio and plays the welcome. */}
            {supported && (
              <motion.button
                type="button"
                onClick={listen}
                disabled={speaking}
                initial={reduced ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.55, duration: 0.4 }}
                className="relative mt-8 inline-flex items-center gap-2.5 rounded-full px-7 py-4 font-display text-lg font-bold text-ink disabled:opacity-80"
                style={{
                  background:
                    "linear-gradient(135deg, rgb(var(--c-teal-glow)), rgb(var(--c-teal-neon)))",
                  boxShadow: "0 8px 28px rgb(var(--c-teal-glow) / 0.45)",
                }}
              >
                {!speaking && !reduced && (
                  <span className="absolute inset-0 animate-pulse-ring rounded-full border border-teal-glow/60" />
                )}
                <Volume2 size={20} />
                {speaking ? t("welcome.speaking") : t("welcome.listen")}
              </motion.button>
            )}

            <div className="mt-5">
              <button
                type="button"
                onClick={close}
                className="text-sm font-semibold text-muted underline-offset-4 hover:text-fg hover:underline"
              >
                {t("welcome.skip")} →
              </button>
            </div>

            {/* A visitor reading the site in English still needs the hint. */}
            {!isHi && (
              <p className="mt-6 text-sm text-faint">{t("welcome.hint")}</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
