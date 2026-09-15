import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Search, Bot, Check, User, MessageSquare, Globe, Radio, CalendarClock, ImageIcon, XCircle, RotateCcw, ExternalLink, ChevronUp } from "lucide-react";
import { usePoll } from "../../lib/usePoll";
import { inputClass } from "../../lib/ui";
import { adminGet, adminPost } from "../../lib/adminApi";

/**
 * Conversations, built like WhatsApp Web.
 *
 * Two panes with their own scroll; the page never scrolls. Left: search,
 * filter chips, a dense list with avatar, channel, time, last line, unread
 * count. Right: the thread with day separators, "load earlier" at the top,
 * and a composer with the three things the owner actually does besides
 * typing — send a product card, send the calendar button, switch the guide.
 * Polling fetches only what is new (messages after the last id), every 4 s
 * while the tab is visible. On a phone it is one pane at a time.
 */
interface Row { id: string; visitor_name: string | null; visitor_phone: string | null; page: string | null; lang: string | null; last_at: string | null; unread_for_agent: number; needs_human: number; bot_off: number; closed: number; ref_code: string | null; last_message: string | null; last_role: string | null }
interface Msg { id: number; role: "visitor" | "guide" | "agent"; content: string; created_at: string }
interface Thread { session: any; messages: Msg[]; hasMore: boolean; booking: { whenIst: string; meetUrl: string | null } | null; lead: { id: number; name: string; status: string; industry: string | null; ref_code: string | null } | null; cards: { retailer_id: string; name: string }[]; bookingUrl: string }

const asDate = (s: string) => new Date(String(s).replace(" ", "T") + "Z");
const timeOf = (s: string) => { try { return asDate(s).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
const dayOf = (s: string) => {
  try {
    const d = asDate(s), t = new Date(), y = new Date(); y.setDate(t.getDate() - 1);
    const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    return same(d, t) ? "Today" : same(d, y) ? "Yesterday" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch { return ""; }
};
const agoOf = (s: string) => {
  try {
    const m = Math.round((Date.now() - asDate(s).getTime()) / 60000);
    if (m < 1) return "now"; if (m < 60) return `${m}m`; const h = Math.round(m / 60); if (h < 24) return `${h}h`; return `${Math.round(h / 24)}d`;
  } catch { return ""; }
};
const channelOf = (id: string) => (id.startsWith("wa:") ? "wa" : id.startsWith("tg:") ? "tg" : "web");
const ChannelIcon = ({ id, size = 12 }: { id: string; size?: number }) => {
  const ch = channelOf(id);
  return ch === "wa" ? <MessageSquare size={size} className="text-success" /> : ch === "tg" ? <Send size={size} className="text-brand-blue" /> : <Globe size={size} className="text-brand-luq" />;
};
const initials = (r: Row) => (r.visitor_name || "").split(" ").map((x) => x[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || (channelOf(r.id) === "wa" ? "W" : channelOf(r.id) === "tg" ? "T" : "V");
const labelOf = (r: Row) => r.visitor_name || (r.visitor_phone ? `+${r.visitor_phone}` : channelOf(r.id) === "tg" ? "Telegram visitor" : "Website visitor");
const sourceOf = (page: string | null) => { const p = String(page || ""); const m = /^(whatsapp|telegram):(.+)$/.exec(p); return m ? `via ${m[2]}` : p && !["whatsapp", "telegram"].includes(p) ? `on ${p}` : ""; };

const FILTERS: [string, string][] = [["", "All"], ["waiting", "Waiting"], ["unread", "Unread"], ["wa", "WhatsApp"], ["tg", "Telegram"], ["web", "Web"], ["closed", "Closed"]];

export function Conversations({ initialId = null }: { initialId?: string | null }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [hasMoreRows, setHasMoreRows] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const [waiting, setWaiting] = useState(0);
  const [open, setOpen] = useState<string | null>(initialId);
  const [thread, setThread] = useState<Thread | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [cardPick, setCardPick] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const loadList = useCallback(async (more = false) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (filter) params.set("filter", filter);
    if (more && rows.length) params.set("before", rows[rows.length - 1].last_at || "");
    const d = await adminGet(`/api/admin/chats?${params.toString()}`);
    if (!d.ok) return;
    setRows((prev) => (more ? [...prev, ...(d.chats || [])] : d.chats || []));
    setHasMoreRows(Boolean(d.hasMore));
    setWaiting(d.waiting || 0);
  }, [q, filter, rows]);

  const loadThread = useCallback(async (id: string) => {
    const d = await adminGet(`/api/admin/chats?id=${encodeURIComponent(id)}`);
    if (d.ok) { setThread(d); stickToBottom.current = true; }
  }, []);
  const loadEarlier = async () => {
    if (!thread || !open || !thread.messages.length) return;
    const d = await adminGet(`/api/admin/chats?id=${encodeURIComponent(open)}&before=${thread.messages[0].id}`);
    if (d.ok) { stickToBottom.current = false; setThread((t) => (t ? { ...t, messages: [...d.messages, ...t.messages], hasMore: d.hasMore } : t)); }
  };
  const pollThread = useCallback(async () => {
    if (!open || !thread) return;
    const last = thread.messages.length ? thread.messages[thread.messages.length - 1].id : 0;
    const d = await adminGet(`/api/admin/chats?id=${encodeURIComponent(open)}&after=${last}`);
    if (d.ok && (d.messages?.length || d.session)) {
      setThread((t) => (t ? { ...t, messages: d.messages?.length ? [...t.messages, ...d.messages] : t.messages, session: { ...t.session, ...(d.session || {}) } } : t));
      if (d.messages?.length) stickToBottom.current = true;
    }
  }, [open, thread]);

  useEffect(() => { loadList(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [q, filter]);
  useEffect(() => { if (initialId) { setOpen(initialId); loadThread(initialId); } }, [initialId, loadThread]);
  usePoll(() => { loadList(); }, 10000, [q, filter]);
  usePoll(() => { pollThread(); }, 4000, [pollThread]);
  useEffect(() => {
    if (stickToBottom.current && scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [thread?.messages.length, open]);

  const choose = (id: string) => { setOpen(id); setErr(""); setThread(null); loadThread(id); setRows((r) => r.map((x) => (x.id === id ? { ...x, unread_for_agent: 0 } : x))); };
  const act = async (body: Record<string, unknown>, label: string) => {
    if (!open) return;
    setBusy(label); setErr("");
    const d = await adminPost("/api/admin/chats", { id: open, ...body });
    setBusy("");
    if (!d.ok) { setErr(d.error || "Failed."); return false; }
    await loadThread(open); loadList();
    return true;
  };
  const send = async () => {
    if (!reply.trim()) return;
    const text = reply;
    if (await act({ text }, "send")) setReply("");
  };

  const s = thread?.session;
  const cur = rows.find((r) => r.id === open);
  const title = cur ? labelOf(cur) : open ? (s?.visitor_name || s?.visitor_phone || open) : "";
  const isWa = Boolean(open?.startsWith("wa:"));

  return (
    <div className="grid min-w-0 gap-3 lg:h-[calc(100dvh-150px)] lg:min-h-[520px] lg:grid-cols-[340px_1fr]">
      {/* ── List ─────────────────────────────────────────────────────── */}
      <div className={`flex min-h-0 min-w-0 flex-col rounded-2xl border border-hairline/12 bg-panel/30 ${open ? "hidden lg:flex" : "flex"}`}>
        <div className="border-b border-hairline/10 p-2.5">
          <label className="flex items-center gap-2 rounded-xl bg-base px-3 py-2">
            <Search size={15} className="shrink-0 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, number, words…" className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-faint" />
          </label>
          <div className="mt-2 flex gap-1 overflow-x-auto pb-0.5">
            {FILTERS.map(([id, label]) => (
              <button key={id} type="button" onClick={() => setFilter(id)} className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${filter === id ? "bg-brand-luq/20 text-brand-luq" : "text-muted hover:text-fg"}`}>
                {label}{id === "waiting" && waiting > 0 ? ` ${waiting}` : ""}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {rows.length === 0 && <p className="p-4 text-sm text-muted">Nothing here.</p>}
          {rows.map((r) => (
            <button key={r.id} type="button" onClick={() => choose(r.id)} className={`flex w-full items-start gap-3 border-b border-hairline/8 px-3 py-2.5 text-left ${open === r.id ? "bg-brand-luq/10" : "hover:bg-panel/60"}`}>
              <span className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${r.closed ? "bg-panel text-faint" : "bg-brand-luq/15 text-brand-luq"}`}>
                {initials(r)}
                <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-base"><ChannelIcon id={r.id} size={10} /></span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-fg">{r.needs_human && !r.closed ? <Radio size={12} className="shrink-0 animate-pulse text-warn" /> : null}<span className="truncate">{labelOf(r)}</span></span>
                  <span className={`shrink-0 text-[11px] ${r.unread_for_agent > 0 ? "font-bold text-brand-luq" : "text-faint"}`}>{r.last_at ? agoOf(r.last_at) : ""}</span>
                </span>
                <span className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-muted">{r.last_role === "agent" ? "You: " : r.last_role === "guide" ? "Guide: " : ""}{r.last_message || "—"}</span>
                  {r.unread_for_agent > 0 && <span className="shrink-0 rounded-full bg-brand-luq px-1.5 py-0.5 text-[10px] font-bold text-white">{r.unread_for_agent}</span>}
                </span>
              </span>
            </button>
          ))}
          {hasMoreRows && <button type="button" onClick={() => loadList(true)} className="w-full py-3 text-sm font-semibold text-brand-luq">Load more</button>}
        </div>
      </div>

      {/* ── Thread ───────────────────────────────────────────────────── */}
      <div className={`flex h-[calc(100dvh-240px)] min-h-[420px] min-w-0 flex-col overflow-hidden rounded-2xl border border-hairline/12 bg-panel/30 lg:h-auto lg:min-h-0 ${open ? "flex" : "hidden lg:flex"}`}>
        {!open ? (
          <div className="grid flex-1 place-items-center p-6 text-sm text-muted">Pick a conversation.</div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-hairline/10 px-3 py-2">
              <button type="button" onClick={() => setOpen(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:text-fg lg:hidden" aria-label="Back"><ArrowLeft size={18} /></button>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-luq/15"><ChannelIcon id={open} size={16} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-fg">{title}</p>
                <p className="truncate text-[11px] text-faint">
                  {isWa ? `WhatsApp · +${open.slice(3)}` : open.startsWith("tg:") ? "Telegram" : "Website"}{s?.page ? ` · ${sourceOf(s.page)}` : ""}{s?.lang === "hi" ? " · हिंदी" : ""}{s?.ref_code || thread?.lead?.ref_code ? ` · partner ${s?.ref_code || thread?.lead?.ref_code}` : ""}
                  {thread?.booking ? ` · call ${thread.booking.whenIst}` : ""}{thread?.lead ? ` · lead ${thread.lead.status}` : ""}
                </p>
              </div>
              {isWa && <a href={`https://wa.me/${open.slice(3)}`} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-fg" aria-label="Open in WhatsApp"><ExternalLink size={16} /></a>}
              <button type="button" onClick={() => act({ action: "bot", off: !s?.bot_off }, "bot")} className={`shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-bold ring-1 ${s?.bot_off ? "bg-warn/15 text-warn ring-warn/40" : "bg-brand-luq/15 text-brand-luq ring-brand-luq/40"}`}>
                {s?.bot_off ? "Guide OFF" : "Guide ON"}
              </button>
              {s?.closed ? (
                <button type="button" onClick={() => act({ action: "reopen" }, "reopen")} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-fg" aria-label="Reopen"><RotateCcw size={16} /></button>
              ) : (
                <button type="button" onClick={() => act({ action: "close" }, "close")} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-danger" aria-label="Close conversation"><XCircle size={16} /></button>
              )}
            </div>

            <div ref={scroller} onScroll={(e) => { const el = e.currentTarget; stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40; }} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
              {thread?.hasMore && <button type="button" onClick={loadEarlier} className="mx-auto mb-2 flex items-center gap-1 rounded-full bg-base px-3 py-1 text-xs font-semibold text-muted"><ChevronUp size={14} /> Earlier messages</button>}
              {!thread && <p className="text-sm text-muted">Loading…</p>}
              {thread?.messages.map((m, i, all) => {
                const mine = m.role !== "visitor";
                const showDay = i === 0 || dayOf(m.created_at) !== dayOf(all[i - 1].created_at);
                const system = /^\[.*\]$/.test(m.content.trim());
                return (
                  <div key={m.id}>
                    {showDay && <p className="my-3 text-center text-[11px] font-semibold uppercase tracking-wider text-faint">{dayOf(m.created_at)}</p>}
                    {system ? (
                      <p className="my-1 text-center text-[11px] text-faint">{m.content.replace(/^\[|\]$/g, "")} · {timeOf(m.created_at)}</p>
                    ) : (
                      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3 py-1.5 sm:max-w-[72%] ${m.role === "visitor" ? "rounded-tl-sm bg-panel/80 text-fg ring-1 ring-hairline/10" : m.role === "agent" ? "rounded-tr-sm bg-brand-luq/20 text-fg" : "rounded-tr-sm border border-hairline/15 bg-panel/40 text-muted"}`}>
                          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{m.content}</p>
                          <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-faint">{m.role === "guide" ? <Bot size={10} /> : m.role === "agent" ? <Check size={10} /> : <User size={10} />}{timeOf(m.created_at)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {thread && thread.messages.length === 0 && <p className="text-sm text-muted">No messages yet.</p>}
            </div>

            <div className="border-t border-hairline/10 px-3 py-2">
              {isWa && (
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <select value={cardPick} onChange={(e) => setCardPick(e.target.value)} className={`${inputClass} !w-auto !py-1.5 text-xs`}>
                    <option value="">Send a card…</option>
                    {thread?.cards.map((c) => <option key={c.retailer_id} value={c.retailer_id}>{c.name}</option>)}
                  </select>
                  <button type="button" disabled={!cardPick || busy !== ""} onClick={async () => { if (await act({ action: "card", retailerId: cardPick }, "card")) setCardPick(""); }} className="inline-flex items-center gap-1 rounded-full bg-base px-3 py-1.5 text-xs font-semibold text-fg disabled:opacity-50"><ImageIcon size={13} /> Send card</button>
                  {thread?.bookingUrl && !thread?.booking && <button type="button" disabled={busy !== ""} onClick={() => act({ action: "calendar" }, "calendar")} className="inline-flex items-center gap-1 rounded-full bg-base px-3 py-1.5 text-xs font-semibold text-fg disabled:opacity-50"><CalendarClock size={13} /> Send calendar</button>}
                  {s?.needs_human ? <button type="button" onClick={() => act({ action: "handled" }, "handled")} className="rounded-full bg-warn/15 px-3 py-1.5 text-xs font-semibold text-warn">Mark handled</button> : null}
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea className={inputClass + " max-h-32 min-h-[2.75rem] flex-1 resize-none py-2.5"} rows={1} value={reply} placeholder={s?.closed ? "Closed — reopen to reply" : "Type a reply… (Enter to send, Shift+Enter for a new line)"} disabled={Boolean(s?.closed)}
                  onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
                <button type="button" onClick={send} disabled={busy !== "" || !reply.trim() || Boolean(s?.closed)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-luq text-white disabled:opacity-50" aria-label="Send"><Send size={17} /></button>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-faint">{err ? <span className="text-warn">{err}</span> : s?.bot_off ? "Only you reply on this thread." : isWa ? "Replying pauses the guide 30 min. Free text reaches them for 24 h after their last message." : "Replying pauses the guide for 30 minutes."}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
