import { sessionId } from "./track";

export interface AgentMsg {
  id: number;
  role: string;
  content: string;
}

export interface ChatSync {
  messages: AgentMsg[];
  agentJoined: boolean;
  needsHuman: boolean;
  closed: boolean;
}

const EMPTY: ChatSync = { messages: [], agentJoined: false, needsHuman: false, closed: false };

async function post(body: Record<string, unknown>): Promise<ChatSync> {
  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sessionId(), ...body }),
    });
    const d = await r.json();
    return {
      messages: Array.isArray(d?.messages) ? d.messages : [],
      agentJoined: !!d?.agentJoined,
      needsHuman: !!d?.needsHuman,
      closed: !!d?.closed,
    };
  } catch {
    return EMPTY;
  }
}

/** Persist a turn so the owner can read the conversation before taking over. */
export function recordTurn(role: "visitor" | "guide", content: string, page: string, lang: string) {
  return post({ action: "say", role, content, page, lang });
}

/** Visitor asked for a human — flags the session and pings the owner's WhatsApp. */
export function requestHuman(page: string, lang: string, after: number) {
  return post({ action: "handoff", page, lang, after });
}

/** Poll for anything the owner has typed since message id `after`. */
export function syncChat(after: number, page: string, lang: string) {
  return post({ action: "sync", after, page, lang });
}
