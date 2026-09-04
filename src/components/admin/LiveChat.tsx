import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft, RefreshCw, Send, Radio, MessageSquare, Globe, Check, Bot, User,
} from "lucide-react";
import { Button } from "../ui/Button";
import { inputClass } from "../../lib/ui";
import { adminGet, adminPost } from "../../lib/adminApi";

interface ChatRow {
  id: string;
  visitor_name: string | null;
  visitor_phone: string | null;
  page: string | null;
  last_message: string | null;
  last_at: string | null;
  unread_for_agent: number;
  needs_human: number;
  bot_off: number;
}

interface Msg {
  id: number;
  role: "visitor" | "guide" | "agent";
  content: string;
  created_at: string;
}

/** SQLite stores UTC without a zone marker; make it an instant before formatting. */
const asDate = (s: string): Date => new Date(String(s).replace(" ", "T") + "Z");

function timeOf(s: string): string {
  try {
    return asDate(s).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/** "Today" / "Yesterday" / a real date — what a person actually wants to read. */
function dayOf(s: string): string {
  try {
    const d = asDate(s);
    const today = new Date();
    const y = new Date();
    y.setDate(today.getDate() - 1);
    const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    if (same(d, today)) return "Today";
    if (same(d, y)) return "Yesterday";
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function agoOf(s: string): string {
  try {
    const mins = Math.round((Date.now() - asDate(s).getTime()) / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.round(hrs / 24)}d`;
  } catch {
    return "";
  }
}

/**
 * Live chat, built the way a chat app is built.
 *
 * The previous version put a conversation list and a transcript side by side at
 * every width. On a phone that produced a page wider than the screen with the
 * messages sitting off the right edge — unusable, which is exactly where most
 * of this gets read.
 *
 * So: on a phone this is ONE pane at a time — the list, or the conversation with
 * a back button — and two panes from `lg` up. Long unbroken strings are forced
 * to wrap, because a single pasted URL was enough to push the whole layout
 * sideways.
 *
 * Every message carries a time, and days are separated, because "who said what
 * when" is the entire point of reading a transcript afterwards.
 */
export function LiveChat() {
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [waiting, setWaiting] = useState(0);
  const [openChat, setOpenChat] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendErr, setSendErr] = useState("");
  const [botOff, setBotOff] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    const d = await adminGet("/api/admin/chats");
    setChats(d.chats || []);
    setWaiting(d.waiting || 0);
  }, []);

  const loadOne = useCallback(async (id: string) => {
    const d = await adminGet(`/api/admin/chats?id=${encodeURIComponent(id)}`);
    setMsgs(d.messages || []);
    setBotOff(Boolean(d.session?.bot_off));
  }, []);

  useEffect(() => {
    loadList();
    const iv = setInterval(() => {
      loadList();
      if (openChat) loadOne(openChat);
    }, 5000);
    return () => clearInterval(iv);
  }, [loadList, loadOne, openChat]);

  // Keep the newest message in view, the way every messaging app does.
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length, openChat]);

  const open = (id: string) => {
    setOpenChat(id);
    setSendErr("");
    loadOne(id);
  };

  const send = async () => {
    if (!openChat || !reply.trim()) return;
    setBusy(true);
    setSendErr("");
    const d = await adminPost("/api/admin/chats", { id: openChat, text: reply.trim() });
    setBusy(false);
    if (!d.ok) {
      // Keep what was typed. Clearing the box on failure told the owner the
      // message had gone when it had not.
      setSendErr(d.error || "Could not send.");
      return;
    }
    setReply("");
    loadOne(openChat);
    loadList();
  };

  const toggleBot = async () => {
    if (!openChat) return;
    const d = await adminPost("/api/admin/chats", { id: openChat, action: "bot", off: !botOff });
    if (d.ok) setBotOff(Boolean(d.bot_off));
  };

  const current = chats.find((c) => c.id === openChat);
  const isWa = Boolean(openChat?.startsWith("wa:"));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-sm">
          {waiting > 0 ? (
            <span className="font-semibold text-warn">
              {waiting} waiting for you
            </span>
          ) : (
            <span className="text-muted">No one waiting right now.</span>
          )}
        </p>
        <button
          type="button"
          onClick={loadList}
          className="glass glass-interactive grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted"
          aria-label="Refresh"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* ── Conversation list. Hidden on a phone once one is open. ────── */}
        <div className={`space-y-2 ${openChat ? "hidden lg:block" : "block"}`}>
          {chats.length === 0 && <p className="text-sm text-muted">No conversations yet.</p>}
          {chats.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => open(c.id)}
              className={`block w-full rounded-2xl p-3 text-left transition-colors ${
                openChat === c.id ? "bg-teal-glow/15 ring-1 ring-teal-glow/40" : "glass glass-interactive"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-fg">
                  {c.needs_human ? <Radio size={13} className="shrink-0 animate-pulse text-warn" /> : null}
                  {c.id.startsWith("wa:") ? (
                    <MessageSquare size={13} className="shrink-0 text-success" aria-label="WhatsApp" />
                  ) : (
                    <Globe size={13} className="shrink-0 text-brand-luq" aria-label="Website" />
                  )}
                  <span className="truncate">{c.visitor_name || c.visitor_phone || "Visitor"}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {c.unread_for_agent > 0 && (
                    <span className="rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {c.unread_for_agent}
                    </span>
                  )}
                  <span className="text-[11px] text-faint">{c.last_at ? agoOf(c.last_at) : ""}</span>
                </span>
              </div>
              <p className="mt-1 break-words text-xs leading-snug text-muted line-clamp-2">
                {c.last_message || "—"}
              </p>
            </button>
          ))}
        </div>

        {/* ── The conversation. Full width on a phone. ───────────────────── */}
        <div className={`${openChat ? "block" : "hidden lg:block"}`}>
          {!openChat ? (
            <div className="glass grid min-h-[300px] place-items-center rounded-2xl p-6">
              <p className="text-sm text-muted">Pick a conversation.</p>
            </div>
          ) : (
            <div className="glass flex min-h-[70vh] flex-col overflow-hidden rounded-2xl lg:min-h-[560px]">
              {/* Who, and how to get back to the list on a phone. */}
              <div className="flex items-center gap-2 border-b border-hairline/10 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setOpenChat(null)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:text-fg lg:hidden"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft size={18} />
                </button>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-glow/15 text-brand-luq">
                  {isWa ? <MessageSquare size={16} /> : <Globe size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-fg">
                    {current?.visitor_name || current?.visitor_phone || "Visitor"}
                  </p>
                  <p className="truncate text-[11px] text-faint">
                    {isWa ? `WhatsApp · +${openChat.slice(3)}` : "Website chat"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleBot}
                  className={`shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-bold ring-1 ${
                    botOff
                      ? "bg-warn/15 text-warn ring-warn/40"
                      : "bg-teal-glow/15 text-brand-luq ring-teal-glow/40"
                  }`}
                >
                  {botOff ? "Guide OFF" : "Guide ON"}
                </button>
              </div>

              {/* Transcript */}
              <div ref={scroller} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
                {msgs.map((m, i) => {
                  const mine = m.role !== "visitor";
                  const showDay = i === 0 || dayOf(m.created_at) !== dayOf(msgs[i - 1].created_at);
                  return (
                    <div key={m.id}>
                      {showDay && (
                        <p className="my-3 text-center text-[11px] font-semibold uppercase tracking-wider text-faint">
                          {dayOf(m.created_at)}
                        </p>
                      )}
                      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 sm:max-w-[75%] ${
                            m.role === "visitor"
                              ? "bg-panel/70 text-fg"
                              : m.role === "agent"
                                ? "bg-teal-glow/25 text-fg"
                                : "border border-hairline/15 bg-panel/30 text-muted"
                          }`}
                        >
                          <span className="mb-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-faint">
                            {m.role === "visitor" ? (
                              <><User size={10} /> Them</>
                            ) : m.role === "agent" ? (
                              <><Check size={10} /> You</>
                            ) : (
                              <><Bot size={10} /> Guide</>
                            )}
                            <span className="ml-auto normal-case tracking-normal">{timeOf(m.created_at)}</span>
                          </span>
                          {/* A single pasted URL was enough to push the whole
                              page sideways before this. */}
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {msgs.length === 0 && <p className="text-sm text-muted">No messages yet.</p>}
              </div>

              {/* Composer */}
              <div className="border-t border-hairline/10 px-3 py-2.5">
                <div className="flex items-end gap-2">
                  <textarea
                    className={inputClass + " max-h-32 min-h-[2.75rem] flex-1 resize-none py-2.5"}
                    rows={1}
                    value={reply}
                    placeholder="Type your reply…"
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                  />
                  <Button size="md" onClick={send} disabled={busy || !reply.trim()} aria-label="Send">
                    <Send size={16} />
                  </Button>
                </div>
                {sendErr && <p className="mt-2 text-xs leading-snug text-warn">{sendErr}</p>}
                {!sendErr && (
                  <p className="mt-1.5 text-[11px] leading-snug text-faint">
                    {botOff
                      ? "Only you reply on this thread."
                      : isWa
                        ? "Replying pauses the guide 30 min. Free typing works for 24h after their last message."
                        : "Replying pauses the guide for 30 minutes, then it resumes."}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
