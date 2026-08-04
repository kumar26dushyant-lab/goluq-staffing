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
export function clipUrl(
  lang: "en" | "hi",
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
  lang: "en" | "hi",
  url: string,
  onHandle?: (h: PlayHandle) => void
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

    const useFallback = () => {
      // Device voice. Rate/pitch differ per side so the two speakers are
      // distinguishable even without generated clips.
      if (!isSpeechSupported()) {
        // No audio at all — hold on the caption long enough to read it.
        const ms = Math.max(1400, Math.min(6000, text.length * 55));
        const timer = window.setTimeout(finish, ms);
        onHandle?.({ stop: () => { window.clearTimeout(timer); finish(); } });
        return;
      }
      const u = new SpeechSynthesisUtterance(pronounceBrand(text, lang));
      u.lang = lang === "hi" ? "hi-IN" : "en-IN";
      const v = fallbackVoice(who);
      u.rate = v.rate;
      u.pitch = v.pitch;
      u.onend = finish;
      u.onerror = finish;
      onHandle?.({ stop: () => { window.speechSynthesis.cancel(); finish(); } });
      window.speechSynthesis.speak(u);
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
  lang: "en" | "hi",
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
