import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { speakSequence, stopSpeaking, isSpeechSupported, type SpeakHandlers } from "./speak";

interface VoiceCtx {
  supported: boolean;
  unlocked: boolean; // a user gesture has happened → audio may play
  muted: boolean;
  toggleMute: () => void;
  /** Speak one or more lines. Respects mute; needs unlock unless `force`. */
  say: (lines: string | string[], handlers?: SpeakHandlers, force?: boolean) => void;
  stop: () => void;
}

const Ctx = createContext<VoiceCtx | null>(null);
const MUTE_KEY = "goluq_muted";

/**
 * Showroom-salesperson voice model: the guide starts talking the moment the
 * visitor does ANYTHING (first pointer/touch/key/scroll unlocks audio — browsers
 * block it before that). Visitors can mute/stop anytime. Text guidance is always
 * on screen, so the experience never depends on audio working.
 */
export function VoiceProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const langRef = useRef<"en" | "hi">(i18n.language.startsWith("hi") ? "hi" : "en");
  langRef.current = i18n.language.startsWith("hi") ? "hi" : "en";

  const supported = isSpeechSupported();
  const [unlocked, setUnlocked] = useState(false);
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(MUTE_KEY) === "1";
  });

  // Unlock on the first real user gesture, anywhere on the page.
  useEffect(() => {
    if (unlocked) return;
    const unlock = () => setUnlocked(true);
    const opts = { once: true, passive: true } as AddEventListenerOptions;
    window.addEventListener("pointerdown", unlock, opts);
    window.addEventListener("keydown", unlock, opts);
    window.addEventListener("touchstart", unlock, opts);
    window.addEventListener("scroll", unlock, opts);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("scroll", unlock);
    };
  }, [unlocked]);

  // Stop speech when muted or when the language flips (avoid mixed-language tails).
  useEffect(() => {
    if (muted) stopSpeaking();
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  }, [muted]);
  useEffect(() => {
    const onLang = () => stopSpeaking();
    i18n.on("languageChanged", onLang);
    return () => i18n.off("languageChanged", onLang);
  }, [i18n]);

  const say = useCallback<VoiceCtx["say"]>(
    (lines, handlers = {}, force = false) => {
      if (!supported || muted || (!unlocked && !force)) {
        handlers.onEnd?.();
        return;
      }
      speakSequence(Array.isArray(lines) ? lines : [lines], langRef.current, handlers);
    },
    [supported, muted, unlocked]
  );

  const stop = useCallback(() => stopSpeaking(), []);
  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  const value = useMemo(
    () => ({ supported, unlocked, muted, toggleMute, say, stop }),
    [supported, unlocked, muted, toggleMute, say, stop]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useVoice(): VoiceCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useVoice must be used within <VoiceProvider>");
  return ctx;
}
