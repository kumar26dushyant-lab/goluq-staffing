import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Archive, Send, Mail } from "lucide-react";
import { Button } from "../ui/Button";
import { inputClass } from "../../lib/ui";
import { adminGet, adminPost } from "../../lib/adminApi";

/**
 * Email — mail sent to the business address, answered from here as the domain.
 *
 * One pane on a phone (list, or one thread with a back arrow), two panes on a
 * desk. The reply box is disabled, with the reason, until a sending provider
 * is configured; a box that swallows a reply is worse than one that says why.
 */
interface Thread { id: number; counterparty: string; subject: string; preview: string; unread: number; updated_at?: string }
interface Msg { id: number; direction: "in" | "out"; subject: string; body: string; created_at: string }

export function EmailInbox() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");
  const [canSend, setCanSend] = useState(true);
  const [from, setFrom] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const loadList = useCallback(async () => {
    const d = await adminGet("/api/admin/emails");
    setThreads(d.threads || []);
    setCanSend(!!d.canSend);
    setFrom(d.from || "");
  }, []);
  const loadOne = useCallback(async (id: number) => {
    const d = await adminGet(`/api/admin/emails?id=${id}`);
    setMsgs(d.messages || []);
  }, []);
  useEffect(() => {
    loadList();
    const iv = setInterval(loadList, 30000);
    return () => clearInterval(iv);
  }, [loadList]);

  const send = async () => {
    if (!openId || !reply.trim()) return;
    setBusy(true); setErr("");
    const d = await adminPost("/api/admin/emails", { id: openId, text: reply.trim() });
    setBusy(false);
    if (d.ok) { setReply(""); loadOne(openId); loadList(); } else setErr(d.error || "Could not send.");
  };
  const archive = async () => {
    if (!openId) return;
    await adminPost("/api/admin/emails", { id: openId, action: "archive" });
    setOpenId(null); loadList();
  };

  const current = threads.find((t) => t.id === openId);

  const List = (
    <div className="glass overflow-hidden rounded-2xl">
      {threads.length === 0 && (
        <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted"><Mail size={16} /> No email yet.</p>
      )}
      <div className="divide-y divide-hairline/8">
        {threads.map((t) => (
          <button key={t.id} type="button" onClick={() => { setOpenId(t.id); loadOne(t.id); }}
            className={`block w-full px-4 py-3 text-left hover:bg-panel/60 ${openId === t.id ? "bg-teal-glow/10" : ""}`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`truncate text-sm ${t.unread ? "font-bold text-fg" : "font-semibold text-fg"}`}>{t.counterparty}</span>
              {t.unread > 0 && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-danger" aria-label="unread" />}
            </div>
            <p className="mt-0.5 truncate text-sm text-muted">{t.subject}</p>
            <p className="mt-0.5 truncate text-xs text-faint">{t.preview}</p>
          </button>
        ))}
      </div>
    </div>
  );

  const Thread = openId && (
    <div className="glass flex min-h-[60vh] flex-col overflow-hidden rounded-2xl lg:min-h-[560px]">
      <div className="flex items-center gap-2 border-b border-hairline/10 px-3 py-2.5">
        <button type="button" onClick={() => setOpenId(null)} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full text-muted lg:hidden"><ArrowLeft size={18} /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-fg">{current?.counterparty}</p>
          <p className="truncate text-xs text-muted">{current?.subject}</p>
        </div>
        <button type="button" onClick={archive} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-muted hover:text-fg"><Archive size={15} /> Archive</button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {msgs.map((m) => (
          <div key={m.id} className={`rounded-2xl p-3 ${m.direction === "in" ? "bg-base" : "bg-teal-glow/10"}`}>
            <p className="mb-1 text-[11px] text-faint">{m.direction === "in" ? "Received" : "Sent"} · {String(m.created_at).slice(0, 16)}</p>
            <pre className="whitespace-pre-wrap font-sans text-sm text-fg">{m.body}</pre>
          </div>
        ))}
      </div>
      <div className="border-t border-hairline/10 p-3">
        {!canSend && (
          <p className="mb-2 text-xs text-warn">Receiving only — replies need MAIL_API_KEY and MAIL_FROM on the server.</p>
        )}
        {err && <p className="mb-2 text-sm text-danger">{err}</p>}
        <div className="flex items-end gap-2">
          <textarea className={`${inputClass} min-h-[44px] flex-1`} rows={2} value={reply} disabled={!canSend}
            placeholder={canSend ? `Reply as ${from}` : "Sending not configured"} onChange={(e) => setReply(e.target.value)} />
          <Button size="md" onClick={send} disabled={busy || !canSend || !reply.trim()} aria-label="Send"><Send size={16} /></Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="lg:grid lg:grid-cols-[320px_1fr] lg:gap-4">
      <div className={openId ? "hidden lg:block" : ""}>{List}</div>
      <div className={openId ? "" : "hidden lg:block"}>
        {Thread || <div className="glass grid min-h-[300px] place-items-center rounded-2xl p-6 text-sm text-muted">Pick a conversation.</div>}
      </div>
    </div>
  );
}
