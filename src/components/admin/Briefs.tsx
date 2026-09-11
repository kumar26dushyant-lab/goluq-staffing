import { useCallback, useEffect, useState } from "react";
import { FileText, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { inputClass } from "../../lib/ui";
import { adminGet, adminPost } from "../../lib/adminApi";

/**
 * Briefs — what prospects told us on /start, as the plan they confirmed.
 * Each one is a warm lead with its requirements already written down; the
 * owner's job here is to read, call, and move the status.
 */
interface Brd { title: string; summary: string; goals: string[]; users: string[]; scenarios: { name: string; steps: string[] }[]; integrations: string[]; timeline: string; open_questions: string[] }
interface Brief { id: number; lang: string; business_type: string; departments: string[]; raw_text: string; history: { q: string; a: string }[]; brd: Brd | null; name: string; phone: string; email: string | null; company: string | null; source: string; status: string; note: string | null; created_at: string }

const STATUSES = ["new", "contacted", "quoted", "won", "lost"];
const when = (s: string) => { const t = Date.parse(s.replace(" ", "T") + "Z"); return Number.isFinite(t) ? new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : s; };

export function Briefs() {
  const [list, setList] = useState<Brief[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const load = useCallback(async () => { const d = await adminGet("/api/admin/briefs"); setList(d.briefs || []); }, []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: number, status: string) => { await adminPost("/api/admin/briefs", { action: "status", id, status }); load(); };
  const saveNote = async (id: number, note: string) => { await adminPost("/api/admin/briefs", { action: "note", id, note }); };

  if (!list.length) return <p className="text-muted">No briefs yet. They arrive when someone finishes goluq.com/start.</p>;

  return (
    <div className="space-y-3">
      {list.map((b) => {
        const isOpen = open === b.id;
        return (
          <div key={b.id} className="glass rounded-2xl">
            <button type="button" onClick={() => setOpen(isOpen ? null : b.id)} className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left">
              <div className="min-w-0">
                <p className="truncate font-semibold text-fg">{b.name}{b.company ? <span className="ml-2 text-sm font-normal text-muted">{b.company}</span> : null}</p>
                <p className="truncate text-sm text-muted">{b.brd?.title || b.business_type} · {b.business_type} · {b.departments.join(", ")}</p>
                <p className="text-xs text-faint">{when(b.created_at)} · {b.phone}{b.email ? ` · ${b.email}` : ""}{b.source ? ` · via ${b.source}` : ""} · {b.lang}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${b.status === "new" ? "bg-warn/15 text-warn" : b.status === "won" ? "bg-teal-glow/15 text-brand-luq" : "bg-panel text-muted"}`}>{b.status}</span>
                {isOpen ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
              </div>
            </button>
            {isOpen && (
              <div className="space-y-4 border-t border-hairline/10 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <a href={`https://wa.me/${b.phone}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-sm font-semibold text-success"><MessageCircle size={14} /> WhatsApp</a>
                  <select value={b.status} onChange={(e) => setStatus(b.id, e.target.value)} className={`${inputClass} !w-auto !py-1.5 text-sm`}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {b.brd && (
                  <div className="space-y-3 rounded-xl border border-hairline/12 bg-panel/30 p-4 text-sm">
                    <p className="flex items-center gap-2 text-base font-semibold text-fg"><FileText size={16} className="text-brand-luq" /> {b.brd.title}</p>
                    <p className="text-fg">{b.brd.summary}</p>
                    {b.brd.goals.length > 0 && <List title="Goals" items={b.brd.goals} />}
                    {b.brd.users.length > 0 && <List title="Who uses it" items={b.brd.users} />}
                    {b.brd.scenarios.map((s) => <List key={s.name} title={`Scenario · ${s.name}`} items={s.steps} numbered />)}
                    {b.brd.integrations.length > 0 && <List title="Connects to" items={b.brd.integrations} />}
                    {b.brd.timeline && <p className="text-muted"><b className="text-fg">Timeline:</b> {b.brd.timeline}</p>}
                    {b.brd.open_questions.length > 0 && <List title="Still to decide" items={b.brd.open_questions} />}
                  </div>
                )}
                <details className="text-sm">
                  <summary className="cursor-pointer font-semibold text-muted">In their words, and the follow-up</summary>
                  <p className="mt-2 whitespace-pre-wrap text-fg">{b.raw_text}</p>
                  {b.history.map((h, i) => <p key={i} className="mt-2 text-muted"><b className="text-fg">Q:</b> {h.q}<br /><b className="text-fg">A:</b> {h.a}</p>)}
                </details>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-muted">Your note</span>
                  <textarea className={inputClass} rows={2} defaultValue={b.note || ""} onBlur={(e) => saveNote(b.id, e.target.value)} placeholder="What you agreed on the call, the quote, the next step…" />
                </label>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function List({ title, items, numbered = false }: { title: string; items: string[]; numbered?: boolean }) {
  return (
    <div>
      <p className="font-semibold text-fg">{title}</p>
      <ul className={`mt-1 space-y-0.5 pl-5 text-muted ${numbered ? "list-decimal" : "list-disc"}`}>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}
