export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

/** Which page the visitor is on — the guide pitches differently on each. */
export type GuidePage = "home" | "build" | "partner" | "services";

export function pageFromPath(pathname: string): GuidePage {
  if (pathname.startsWith("/build")) return "build";
  if (pathname.startsWith("/partner")) return "partner";
  if (pathname.startsWith("/services")) return "services";
  return "home";
}

/** The country the visitor chose in the header picker, if any. */
function pickedCountry(): string {
  try {
    return localStorage.getItem("goluq_country") || "";
  } catch {
    return "";
  }
}

/** Ask the server-side assistant (Gemini proxy). Never holds the key client-side. */
export async function askAssistant(
  messages: ChatMsg[],
  lang: "en" | "hi",
  page: GuidePage = "home"
): Promise<string> {
  try {
    const res = await fetch("/api/assistant", {
      method: "POST",
      // Carry any country the visitor picked, so the guide quotes the same
      // currency the page is showing. Without this a visitor who switched to
      // UAE reads AED prices and is then quoted rupees in chat.
      headers: {
        "Content-Type": "application/json",
        ...(pickedCountry() ? { "x-country": pickedCountry() } : {}),
      },
      body: JSON.stringify({ messages, lang, page }),
    });
    const data = await res.json();
    return (data?.reply as string) || "";
  } catch {
    return "";
  }
}
