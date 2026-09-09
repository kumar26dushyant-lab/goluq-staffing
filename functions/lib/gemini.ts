/// <reference types="@cloudflare/workers-types" />

/**
 * Optional Gemini helper (server-side only — the key NEVER touches the browser).
 * Used to (a) craft warm, personalised follow-up messages and (b) read a
 * customer's reply intent. If GEMINI_API_KEY is unset, callers fall back to
 * templates / keyword rules, so the lead engine works with or without it.
 *
 * Sarathi already uses Gemini 2.5 Flash — same family here.
 */
export interface GeminiEnv {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string; // default: gemini-2.0-flash
}

export function geminiEnabled(env: GeminiEnv): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

export async function geminiText(env: GeminiEnv, prompt: string, maxTokens = 400): Promise<string> {
  if (!env.GEMINI_API_KEY) return "";
  const model = env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // thinkingBudget:0 → Gemini 2.5 answers directly instead of spending the
        // token budget on hidden "thinking" (which was truncating short replies).
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: maxTokens,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });
    if (!res.ok) return "";
    const data = await res.json<any>();
    return (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
  } catch {
    return "";
  }
}

/** Classify a customer's WhatsApp reply. Falls back to keywords without Gemini. */
/**
 * An image from Gemini's image models ("Nano Banana"). Optional input images
 * let it work FROM a photo — a clean product shot from a phone picture, a
 * catalogue card with the real product as the hero. Returns PNG bytes as
 * base64, or null with the reason.
 */
export async function geminiImage(
  env: GeminiEnv,
  prompt: string,
  inputs: { mime: string; base64: string }[] = []
): Promise<{ base64: string; mime: string } | { error: string }> {
  if (!geminiEnabled(env)) return { error: "Gemini is not configured." };
  const parts: unknown[] = [{ text: prompt }, ...inputs.map((i) => ({ inlineData: { mimeType: i.mime, data: i.base64 } }))];
  const body = JSON.stringify({
    contents: [{ parts }],
    generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1" } },
  });
  for (const model of ["gemini-3-pro-image-preview", "gemini-2.5-flash-image"]) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": env.GEMINI_API_KEY as string, "Content-Type": "application/json" },
        body,
      });
      const j: any = await res.json().catch(() => ({}));
      if (!res.ok || j.error) continue;
      const img = (j?.candidates?.[0]?.content?.parts || []).find((p: any) => p?.inlineData);
      if (img) return { base64: String(img.inlineData.data), mime: String(img.inlineData.mimeType || "image/png") };
    } catch {
      /* try the next model */
    }
  }
  return { error: "The image model did not return a picture. Try again or change the wording." };
}

export async function classifyReply(
  env: GeminiEnv,
  text: string
): Promise<"stop" | "interested" | "question" | "other"> {
  const t = (text || "").toLowerCase();
  // Fast keyword path (works without Gemini, covers EN + common HI)
  const stopWords = [
    "stop", "unsubscribe", "not interested", "no interest", "leave me", "don't message",
    "dont message", "band karo", "band kro", "mat bhejo", "nahi chahiye", "नहीं चाहिए",
    "बंद करो", "मत भेजो", "रुको", "remove me",
  ];
  if (stopWords.some((w) => t.includes(w))) return "stop";

  if (!env.GEMINI_API_KEY) {
    if (/\?|kaise|kitna|price|cost|kya|how|what|when/.test(t)) return "question";
    if (/yes|haan|ha|interested|chahiye|ok|okay|theek/.test(t)) return "interested";
    return "other";
  }

  const prompt =
    `Classify this WhatsApp reply from a lead into exactly one word: ` +
    `stop, interested, question, or other.\n` +
    `"stop" = wants no more messages / not interested.\n` +
    `Reply: "${text}"\nOne word:`;
  const out = (await geminiText(env, prompt, 5)).toLowerCase();
  if (out.includes("stop")) return "stop";
  if (out.includes("interest")) return "interested";
  if (out.includes("question")) return "question";
  return "other";
}
