/**
 * Thin abstraction over the Web Speech API (BUILD_SPEC §8). Always triggered by
 * a user gesture (autoplay policy). Picks a voice matching the active language
 * (hi-IN / en-IN), falls back gracefully. Designed so a pre-rendered audio file
 * can later be swapped in behind the same speak() call without touching callers.
 */

/**
 * ░░ BRAND PRONUNCIATION GROUND RULE (applies to EVERY voice bot on goluq.com) ░░
 * The brand "GoLuQ" must always be SPOKEN as "Go Look" — clearly — in any
 * language, any conversation, every time. The on-screen text still reads
 * "GoLuQ"; only the audio string is phoneticised. Because all speech flows
 * through speak() below, enforcing it here covers the whole site.
 *   EN  → "Go Look"        ("goluq.com" → "Go Look dot com")
 *   HI  → "गो लुक़"          ("goluq.com" → "गो लुक़ डॉट कॉम")
 */
export function pronounceBrand(text: string, lang: "en" | "hi"): string {
  const look = lang === "hi" ? "गो लुक़" : "Go Look";
  const dotCom = lang === "hi" ? `${look} डॉट कॉम` : `${look} dot com`;
  return text
    .replace(/go\s*luq\s*\.\s*com/gi, dotCom)
    .replace(/go\s*luq/gi, look);
}

let voicesCache: SpeechSynthesisVoice[] = [];

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return Promise.resolve([]);
  const existing = window.speechSynthesis.getVoices();
  if (existing.length) {
    voicesCache = existing;
    return Promise.resolve(existing);
  }
  return new Promise((resolve) => {
    const handler = () => {
      voicesCache = window.speechSynthesis.getVoices();
      resolve(voicesCache);
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler, { once: true });
    // Safety timeout
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 600);
  });
}

function pickVoice(lang: "en" | "hi"): SpeechSynthesisVoice | undefined {
  const want = lang === "hi" ? "hi" : "en";
  const pref = lang === "hi" ? ["hi-IN"] : ["en-IN", "en-GB", "en-US"];
  for (const code of pref) {
    const v = voicesCache.find((vo) => vo.lang === code);
    if (v) return v;
  }
  return voicesCache.find((vo) => vo.lang.toLowerCase().startsWith(want));
}

export interface SpeakHandlers {
  onStart?: () => void;
  onEnd?: () => void;
  onBoundary?: () => void;
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking() {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

function makeUtterance(text: string, lang: "en" | "hi"): SpeechSynthesisUtterance {
  // Ground rule: always voice the brand as "Go Look" (see pronounceBrand).
  const u = new SpeechSynthesisUtterance(pronounceBrand(text, lang));
  const v = pickVoice(lang);
  if (v) u.voice = v;
  u.lang = lang === "hi" ? "hi-IN" : "en-IN";
  u.rate = lang === "hi" ? 0.96 : 1.0;
  u.pitch = 1;
  return u;
}

export async function speak(
  text: string,
  lang: "en" | "hi",
  handlers: SpeakHandlers = {}
): Promise<void> {
  return speakSequence([text], lang, handlers);
}

/**
 * Speak several lines back-to-back as one continuous narration (used so the
 * recap actually keeps talking instead of going silent after the first line).
 * onStart fires on the first line; onEnd fires only after the LAST line ends —
 * and is guaranteed to fire even on error/unsupported (so callers never hang).
 */
export async function speakSequence(
  texts: string[],
  lang: "en" | "hi",
  handlers: SpeakHandlers = {}
): Promise<void> {
  const lines = texts.map((t) => t.trim()).filter(Boolean);
  if (!isSpeechSupported() || lines.length === 0) {
    handlers.onEnd?.();
    return;
  }
  await loadVoices();
  window.speechSynthesis.cancel();

  let i = 0;
  let started = false;
  const next = () => {
    if (i >= lines.length) {
      handlers.onEnd?.();
      return;
    }
    const u = makeUtterance(lines[i], lang);
    u.onstart = () => {
      if (!started) {
        started = true;
        handlers.onStart?.();
      }
    };
    u.onend = () => {
      i += 1;
      next();
    };
    u.onerror = () => {
      i += 1;
      next();
    };
    if (handlers.onBoundary) u.onboundary = () => handlers.onBoundary?.();
    window.speechSynthesis.speak(u);
  };
  next();
}
