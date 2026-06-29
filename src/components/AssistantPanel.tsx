import { useState } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WaveformOrb } from "./WaveformOrb";
import { KineticText } from "./KineticText";
import { speak, stopSpeaking, isSpeechSupported } from "../lib/speak";

/**
 * The talking Digital Staffing Assistant: a waveform orb + a "Tap to hear"
 * affordance (autoplay is blocked, so audio unlocks on first gesture) + the
 * greeting line as synchronized kinetic text. Speaks in the active language.
 */
export function AssistantPanel({ line }: { line: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("hi") ? "hi" : "en";
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(true);

  const handlePlay = () => {
    if (!isSpeechSupported()) return;
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setMuted(false);
    speak(line, lang, {
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
    });
  };

  return (
    <div className="flex items-start gap-4">
      {/* Orb */}
      <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-teal-glow/10 ring-1 ring-teal-glow/30">
        <WaveformOrb speaking={speaking} bars={14} className="h-7" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-brand-luq">
            {t("greeting.assistant")}
          </span>
          {isSpeechSupported() && (
            <motion.button
              type="button"
              onClick={handlePlay}
              whileTap={{ scale: 0.94 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-teal-glow/12 px-2.5 py-1 text-[0.7rem] font-semibold text-brand-luq ring-1 ring-teal-glow/25"
              aria-label={speaking ? t("greeting.mute") : t("greeting.tapToHear")}
            >
              {speaking ? (
                <>
                  <VolumeX size={12} /> {t("greeting.mute")}
                </>
              ) : muted ? (
                <>
                  <Play size={12} /> {t("greeting.tapToHear")}
                </>
              ) : (
                <>
                  <Volume2 size={12} /> {t("greeting.tapToHear")}
                </>
              )}
            </motion.button>
          )}
        </div>
        <KineticText
          key={lang + line}
          text={line}
          className="text-pretty text-[1rem] font-medium leading-relaxed text-fg sm:text-lg"
        />
      </div>
    </div>
  );
}
