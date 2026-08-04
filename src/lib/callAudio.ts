import { isSpeechSupported, pronounceBrand } from "./speak";

/**
 * Audio for the mock call.
 *
 * Clips are ONE FILE PER TURN — `/audio/<lang>/<role>-<industry>/<n>.mp3` —
 * rather than one mixed file per conversation. That way captions stay in perfect
 * sync with no timing metadata to maintain, and a single missing clip degrades
 * to the device voice instead of breaking the whole call.
 *
 * Generate the clips with `node scripts/generate-call-audio.mjs` (see the file
 * for the key it needs). Until they exist, every turn falls back to the browser's
 * built-in voice, so the demo works today and upgrades the moment the files land.
 */
/**
 * The call has its own language, separate from the site's. An India-centric
 * visitor wants to hear the worker speak Hindi even while reading the site in
 * English — that is the whole point of the demonstration.
 */
export type CallLang = "hi" | "en" | "mr";

export const CALL_LANGS: { id: CallLang; label: string; speech: string }[] = [
  { id: "hi", label: "हिन्दी", speech: "hi-IN" },
  { id: "en", label: "English", speech: "en-IN" },
  { id: "mr", label: "मराठी", speech: "mr-IN" },
];

export function speechCode(lang: CallLang): string {
  return CALL_LANGS.find((l) => l.id === lang)?.speech ?? "hi-IN";
}

export function clipUrl(
  lang: CallLang,
  role: string,
  industry: string,
  index: number
): string {
  return `/audio/${lang}/${role}-${industry}/${index}.mp3`;
}

/** Different voice per side, so a listener can tell who is speaking. */
function fallbackVoice(who: "caller" | "agent"): { rate: number; pitch: number } {
  return who === "agent" ? { rate: 1.0, pitch: 1.0 } : { rate: 1.02, pitch: 0.88 };
}

export interface PlayHandle {
  stop: () => void;
}

/**
 * Speaks one turn and resolves when it finishes. Tries the pre-generated clip
 * first; falls back to the device voice; if neither is available, resolves after
 * a readable pause so the call still advances rather than hanging.
 */
export function playTurn(
  text: string,
  who: "caller" | "agent",
  lang: CallLang,
  url: string,
  onHandle?: (h: PlayHandle) => void,
  onStart?: () => void
): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };

    const audio = new Audio(url);
    audio.preload = "auto";

    // A failed load fires BOTH `onerror` AND rejects `play()`. Without this
    // latch the fallback ran twice and every line was spoken twice — which also
    // desynced the on-screen speaker, because turn N's audio was still going
    // while turn N+1 was displayed.
    let fellBack = false;
    const useFallback = () => {
      if (fellBack || done) return;
      fellBack = true;
      onStart?.();
      // Device voice. Rate/pitch differ per side so the two speakers are
      // distinguishable even without generated clips.
      if (!isSpeechSupported()) {
        // No audio at all — hold on the caption long enough to read it.
        const ms = Math.max(1400, Math.min(6000, text.length * 55));
        const timer = window.setTimeout(finish, ms);
        onHandle?.({ stop: () => { window.clearTimeout(timer); finish(); } });
        return;
      }
      const u = new SpeechSynthesisUtterance(pronounceBrand(text, lang === "en" ? "en" : "hi"));
      u.lang = speechCode(lang);
      const v = fallbackVoice(who);
      u.rate = v.rate;
      u.pitch = v.pitch;
      u.onend = finish;
      u.onerror = finish;
      onHandle?.({ stop: () => { window.speechSynthesis.cancel(); finish(); } });
      window.speechSynthesis.speak(u);
    };

    // The on-screen speaker lights up only once sound is genuinely coming out,
    // so the waveform can never run ahead of the audio.
    audio.onplaying = () => {
      if (!fellBack) onStart?.();
    };
    audio.onended = finish;
    audio.onerror = useFallback;
    onHandle?.({
      stop: () => {
        audio.pause();
        window.speechSynthesis?.cancel();
        finish();
      },
    });

    audio.play().catch(useFallback);
  });
}

/** True once at least one generated clip for this conversation is reachable. */
export async function hasGeneratedAudio(
  lang: CallLang,
  role: string,
  industry: string
): Promise<boolean> {
  try {
    const r = await fetch(clipUrl(lang, role, industry, 0), { method: "HEAD" });
    return r.ok;
  } catch {
    return false;
  }
}
