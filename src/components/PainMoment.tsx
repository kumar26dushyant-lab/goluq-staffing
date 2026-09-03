import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  PhoneMissed, Wallet, Smartphone, FileWarning, UserX, Check, Volume2, VolumeX,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useVoice } from "../lib/voice";

/**
 * The recognition moment — "yehi to meri roz ki sir-dardi hai".
 *
 * Abstract words do not sell here. "Automation" means nothing to a shop owner;
 * his billing man taking two days off means everything. So each scene is a small
 * story told in four beats, animated in sequence: the thing happens, it costs
 * him something, then the same moment is replayed with the system in place.
 *
 * Three rules this follows:
 *  - The LOSS is stated in his terms — a customer gone, an evening on the phone
 *    at someone else's wedding — never in ours ("inefficient lead capture").
 *  - The FIX only claims what we actually build. The reminder carries HIS
 *    payment link; the evening summary comes from HIS system. Nothing here
 *    implies we collect money or plug into his accounts, because we do not.
 *  - Every scene is an ordinary week. Nothing aspirational — if the moment is
 *    not familiar it is worthless.
 *
 * Five scenes, all from the market rather than a whiteboard: the billing man's
 * two-day leave, the udhaar he hates chasing, the business living on staff's
 * personal WhatsApp, forty-two calls during a family wedding — and NidaanPartner's
 * own, which is the one we can point at and say we already fixed exactly this.
 *
 * All motion is opacity and transform, so it stays smooth on a mid-range phone.
 */
const SCENES: { id: string; icon: LucideIcon }[] = [
  { id: "staffleave", icon: UserX },
  { id: "udhaar", icon: Wallet },
  { id: "personalwa", icon: Smartphone },
  { id: "awayfromshop", icon: PhoneMissed },
  { id: "claimstuck", icon: FileWarning },
];

/**
 * Eight lines of story, staggered in, then time to actually read them.
 *
 * This was 5.2s, which was barely enough to finish REVEALING the beats, let
 * alone read both columns — the scene changed under the reader mid-sentence.
 * A carousel that outruns its reader is worse than no carousel: it teaches
 * people to stop trying.
 *
 * Auto-advance also STOPS permanently the moment anyone interacts, because at
 * that point they are reading deliberately and moving the page under them is
 * simply rude.
 */
const SCENE_MS = 16000;

export function PainMoment({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const { say, stop, supported } = useVoice();
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (reduced || held) return;
    const iv = window.setInterval(() => setI((n) => (n + 1) % SCENES.length), SCENE_MS);
    return () => window.clearInterval(iv);
  }, [reduced, held]);

  // Picking a scene, or asking to hear it, means the reader is now driving.
  const pick = (n: number) => {
    setHeld(true);
    stop();
    setSpeaking(false);
    setI(n);
  };

  // Speak the commentary for whichever scene is showing. `force` is passed
  // because this is an explicit tap: the browser's autoplay lock does not apply
  // to speech the visitor just asked for.
  const narrate = () => {
    if (speaking) {
      stop();
      setSpeaking(false);
      return;
    }
    setHeld(true);
    say(
      t(`pain.scenes.${scene.id}.voice`),
      { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) },
      true
    );
  };

  // Leaving the section, or unmounting, must not leave a voice talking to nobody.
  useEffect(() => () => stop(), [stop]);

  const scene = SCENES[i];
  const Icon = scene.icon;
  const beats = t(`pain.scenes.${scene.id}.beats`, { returnObjects: true }) as string[];
  const fixed = t(`pain.scenes.${scene.id}.fixed`, { returnObjects: true }) as string[];

  return (
    <section className={className} aria-labelledby="pain-title">
      <p className="font-mono text-sm uppercase tracking-[0.28em] text-brand-luq">
        {t("pain.kicker")}
      </p>
      <h2
        id="pain-title"
        className="mt-2 max-w-3xl text-balance font-display text-2xl font-bold sm:text-4xl"
      >
        <span className="text-gradient-accent">{t("pain.title")}</span>
      </h2>

      {/* Scene picker — the labels alone do half the work, because one of them
          is almost certainly the reader's own Tuesday. */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {SCENES.map((s, n) => (
          <button
            key={s.id}
            type="button"
            onClick={() => pick(n)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              n === i
                ? "bg-teal-glow/20 text-brand-luq ring-1 ring-teal-glow/45"
                : "glass glass-interactive text-muted"
            }`}
          >
            {t(`pain.scenes.${s.id}.tab`)}
          </button>
        ))}

        {/* Spoken commentary. Deliberately NOT a reading of the cards — it says
            the part that is hard to put on screen without adding more text to a
            page that already has too much: what this actually costs over a year,
            and why it is worth fixing. Many owners here would rather listen than
            read, and nobody wants a robot reciting what their eyes can see. */}
        {supported && (
          <button
            type="button"
            onClick={narrate}
            aria-label={t("pain.listenAria")}
            className={`ml-auto inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              speaking
                ? "bg-teal-glow/20 text-brand-luq ring-1 ring-teal-glow/45"
                : "glass glass-interactive text-muted"
            }`}
          >
            {speaking ? <Volume2 size={15} /> : <VolumeX size={15} />}
            {speaking ? t("pain.listening") : t("pain.listen")}
          </button>
        )}
      </div>

      {/* How long until this scene changes. A carousel that moves without
          warning is what makes people stop reading it. Stops entirely once the
          reader takes over. */}
      {!held && !reduced && (
        <div className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-hairline/15">
          <motion.div
            key={scene.id}
            className="h-full bg-brand-luq/70"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: SCENE_MS / 1000, ease: "linear" }}
          />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Before — what happens today */}
        <motion.div
          key={scene.id + "-before"}
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-danger/25 bg-danger/[0.05] p-6"
        >
          <p className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.2em] text-danger">
            <Icon size={16} className="shrink-0" />
            {t("pain.today")}
          </p>
          <ol className="mt-4 space-y-3">
            {beats.map((b, n) => (
              <motion.li
                key={n}
                initial={reduced ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: reduced ? 0 : 0.15 + n * 0.55, duration: 0.35 }}
                className="flex gap-3 text-base leading-relaxed text-fg"
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                <span>{b}</span>
              </motion.li>
            ))}
          </ol>
          <motion.p
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduced ? 0 : 0.15 + beats.length * 0.55, duration: 0.4 }}
            className="mt-5 font-display text-lg font-bold text-danger"
          >
            {t(`pain.scenes.${scene.id}.cost`)}
          </motion.p>
        </motion.div>

        {/* After — the same moment, with the system */}
        <motion.div
          key={scene.id + "-after"}
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.2, duration: 0.4 }}
          className="glass glow-teal rounded-3xl p-6"
        >
          <p className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.2em] text-brand-luq">
            <Check size={16} className="shrink-0" />
            {t("pain.withGoluq")}
          </p>
          <ol className="mt-4 space-y-3">
            {fixed.map((b, n) => (
              <motion.li
                key={n}
                initial={reduced ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: reduced ? 0 : 0.4 + n * 0.55, duration: 0.35 }}
                className="flex gap-3 text-base leading-relaxed text-fg"
              >
                <Check size={16} className="mt-1 shrink-0 text-brand-luq" />
                <span>{b}</span>
              </motion.li>
            ))}
          </ol>
          <motion.p
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduced ? 0 : 0.4 + fixed.length * 0.55, duration: 0.4 }}
            className="mt-5 font-display text-lg font-bold text-success"
          >
            {t(`pain.scenes.${scene.id}.gain`)}
          </motion.p>
        </motion.div>
      </div>

      <p className="mt-6 max-w-3xl text-base text-muted">{t("pain.footnote")}</p>
    </section>
  );
}
