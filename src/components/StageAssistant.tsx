import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX, RotateCcw, Hand } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WaveformOrb } from "./WaveformOrb";
import { KineticText } from "./KineticText";
import { useVoice } from "../lib/voice";

/**
 * The persistent guide, on EVERY stage. Auto-starts speaking the moment audio is
 * unlocked (first gesture anywhere), narrates `line` + any `also` lines in one
 * continuous breath, and ALWAYS shows the text — so a visitor is never left
 * unguided even if speech is blocked/unsupported. Mute + replay controls included.
 */
export function StageAssistant({
  line,
  also = [],
  className = "",
}: {
  line: string;
  also?: string[];
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("hi") ? "hi" : "en";
  const { supported, unlocked, muted, toggleMute, say } = useVoice();
  const [speaking, setSpeaking] = useState(false);

  // Speak whenever the line/language changes, or once audio unlocks/unmutes.
  useEffect(() => {
    if (muted) return;
    say([line, ...also], {
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
    });
    return () => setSpeaking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line, lang, unlocked, muted]);

  const replay = () =>
    say([line, ...also], { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) }, true);

  const showHint = supported && !unlocked && !muted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative flex items-start gap-4 rounded-2xl border border-teal-glow/30 p-4 shadow-neon sm:p-5 ${className}`}
      style={{ background: "rgb(var(--c-abyss) / 0.86)", backdropFilter: "blur(18px)" }}
    >
      <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-teal-glow/15 ring-1 ring-teal-glow/40">
        <WaveformOrb speaking={speaking} bars={14} className="h-7" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-[0.22em] text-brand-luq">
            {t("greeting.assistant")}
          </span>
          {supported && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                className="inline-flex items-center gap-1 rounded-full bg-teal-glow/15 px-2.5 py-1 text-xs font-semibold text-brand-luq ring-1 ring-teal-glow/30"
                aria-label={muted ? "Unmute guide" : "Mute guide"}
              >
                {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
              <button
                type="button"
                onClick={replay}
                className="inline-flex items-center gap-1 rounded-full bg-teal-glow/15 px-2.5 py-1 text-xs font-semibold text-brand-luq ring-1 ring-teal-glow/30"
                aria-label={t("greeting.tapToHear")}
              >
                <RotateCcw size={13} />
              </button>
            </div>
          )}
        </div>

        <KineticText
          key={lang + line}
          text={line}
          className="text-base font-medium leading-relaxed text-fg sm:text-lg"
        />

        {/* Never-silent fallback: nudge the visitor to unlock audio */}
        {showHint && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-luq"
          >
            <Hand size={13} /> {t("greeting.tapToHear")}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}
