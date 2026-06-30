export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

/** Ask the server-side assistant (Gemini proxy). Never holds the key client-side. */
export async function askAssistant(messages: ChatMsg[], lang: "en" | "hi"): Promise<string> {
  try {
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, lang }),
    });
    const data = await res.json();
    return (data?.reply as string) || "";
  } catch {
    return "";
  }
}
