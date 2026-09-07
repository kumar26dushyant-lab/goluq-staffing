import { useCallback, useEffect, useState } from "react";
import {
  Search, RefreshCw, Download, Phone, MessageSquare, Mail, ChevronDown, Trash2, UserCheck, Ban, CheckCircle2, Clock,
} from "lucide-react";
import { inputClass } from "../../lib/ui";
import { adminGet, adminPost, leadsCsvUrl } from "../../lib/adminApi";

/**
 * Enquiries — every person who left their number, as cards you can act on.
 *
 * The previous screen was a seven-column table that wrapped dates over three
 * lines on a phone and hid the only useful field (what they wrote) behind a
 * chevron. This is the reverse: name, what they want and what they said are
 * the card; the actions a founder actually takes — WhatsApp them, call them,
 * mark where the conversation stands — are one tap, on the card.
 */
interface Lead {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  role: string | null;
  industry: string | null;
  cross_sell: string | null;
  wants_training: number;
  ref_code: string | null;
  status: string | null;
  opted_out: number;
  followup_stage: number;
  last_inbound_at: string | null;
  created_at: string;
  source: string | null;
  landing: string | null;
  converted_at?: string | null;
}

const STATUS: { id: string; label: string; tone: string; icon: typeof Clock }[] = [
  { id: "new", label: "New", tone: "bg-warn/15 text-warn", icon: Clock },
  { id: "engaged", label: "Talking", tone: "bg-teal-glow/15 text-brand-luq", icon: MessageSquare },
  { id: "converted", label: "Customer", tone: "bg-success/15 text-success", icon: UserCheck },
  { id: "done", label: "Closed", tone: "bg-panel/60 text-muted", icon: CheckCircle2 },
  { id: "opted_out", label: "Opted out", tone: "bg-danger/10 text-danger", icon: Ban },
];

const ROLE: Record<string, string> = {
  voice: "Voice calling employee", support: "Customer support employee", sales: "Sales employee",
  reception: "Receptionist", workforce: "Complete digital workforce",
};

const dial = (phone: string) => {
  const d = String(phone).replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
};

function when(s: string): string {
  const t = Date.parse(String(s).replace(" ", "T") + "Z");
  if (!Number.isFinite(t)) return s;
  const d = new Date(t);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

function list(raw: unknown): string {
  try {
    const a = JSON.parse(String(raw ?? "[]"));
    return Array.isArray(a) && a.length ? a.join(", ") : "";
  } catch {
    return "";
  }
}

export function Enquiries() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    const d = await adminGet(`/api/admin/leads?${p.toString()}`);
    setRows(d.leads || []);
    setTotal(d.total || 0);
    setLoading(false);
  }, [q, status]);
  useEffect(() => { load(); }, [load]);

  const setLeadStatus = async (l: Lead, s: string) => {
    setNote("");
    const r = s === "converted"
      ? await adminPost("/api/admin/commission", { action: "convert", leadId: l.id })
      : await adminPost("/api/admin/lead", { id: l.id, action: "status", status: s });
    if (!r.ok) setNote(r.error || "Failed.");
    else if (s === "converted") setNote(`${l.name} is a customer. Open a project for them under Deliver → Projects to record payments${l.ref_code ? ` and ${l.ref_code}'s commission` : ""}.`);
    load();
  };
  const remove = async (l: Lead) => {
    if (!confirm(`Delete ${l.name}? This cannot be undone.`)) return;
    await adminPost("/api/admin/lead", { id: l.id, action: "delete" });
    load();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar: one row on a phone — search, filter, refresh, export. */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input className={`${inputClass} pl-9`} placeholder="Search name, phone, email" value={q}
            onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
        </div>
        <button type="button" onClick={load} aria-label="Refresh" className="glass grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted hover:text-fg">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
        <a href={leadsCsvUrl(q, status)} aria-label="Download CSV" className="glass grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted hover:text-fg">
          <Download size={16} />
        </a>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[{ id: "", label: `All · ${total}` }, ...STATUS].map((s) => (
          <button key={s.id} type="button" onClick={() => setStatus(s.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${status === s.id ? "bg-teal-glow/20 text-brand-luq ring-1 ring-teal-glow/40" : "glass text-muted hover:text-fg"}`}>
            {s.label}
          </button>
        ))}
      </div>
      {note && <p className="rounded-xl bg-teal-glow/10 px-4 py-2.5 text-sm text-fg">{note}</p>}

      <div className="space-y-3">
        {!loading && rows.length === 0 && (
          <p className="glass rounded-2xl p-6 text-center text-muted">No enquiries match.</p>
        )}
        {rows.map((l) => {
          const st = STATUS.find((s) => s.id === (l.status || "new")) ?? STATUS[0];
          const open = openId === l.id;
          const want = l.role ? ROLE[l.role] ?? l.role : l.industry ? l.industry : "";
          return (
            <article key={l.id} className="glass overflow-hidden rounded-2xl">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-base font-bold text-fg">{l.name}</h3>
                    <p className="mt-0.5 text-sm text-muted">
                      {want && <span className="text-fg">{want}</span>}
                      {want && l.industry && l.role && <span> · {l.industry}</span>}
                      {l.source && <span> · via {l.source}</span>}
                      {l.ref_code && <span> · partner <span className="font-mono text-brand-luq">{l.ref_code}</span></span>}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.tone}`}>
                      <st.icon size={12} /> {st.label}
                    </span>
                    <p className="mt-1 text-xs text-faint">{when(l.created_at)}</p>
                  </div>
                </div>

                {l.message && (
                  <p className={`mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted ${open ? "" : "line-clamp-3"}`}>{l.message}</p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a href={`https://wa.me/${dial(l.phone)}`} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3.5 py-2 text-sm font-semibold text-success">
                    <MessageSquare size={15} /> WhatsApp
                  </a>
                  <a href={`tel:+${dial(l.phone)}`} className="inline-flex items-center gap-1.5 rounded-full bg-teal-glow/15 px-3.5 py-2 text-sm font-semibold text-brand-luq">
                    <Phone size={15} /> Call
                  </a>
                  {l.email && (
                    <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1.5 rounded-full glass px-3.5 py-2 text-sm font-semibold text-muted">
                      <Mail size={15} /> Email
                    </a>
                  )}
                  <span className="ml-auto font-mono text-xs text-faint">+{dial(l.phone)}</span>
                  <button type="button" onClick={() => setOpenId(open ? null : l.id)} aria-expanded={open} aria-label={open ? "Less" : "More"}
                    className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-fg">
                    <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </div>

              {open && (
                <div className="space-y-4 border-t border-hairline/10 bg-panel/20 p-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">Where does this stand?</p>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS.map((s) => (
                        <button key={s.id} type="button" onClick={() => setLeadStatus(l, s.id)}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold ${(l.status || "new") === s.id ? `${s.tone} ring-1 ring-current/30` : "glass text-muted hover:text-fg"}`}>
                          <s.icon size={13} /> {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                    {[
                      ["Email", l.email],
                      ["Industry", l.industry],
                      ["Landed on", l.landing],
                      ["Also wants", list(l.cross_sell)],
                      ["Training", l.wants_training ? "Asked for the walkthrough" : ""],
                      ["Follow-up", l.opted_out ? "Stopped" : l.followup_stage >= 4 ? "Sequence finished" : `Step ${l.followup_stage} of 4`],
                      ["Last replied", l.last_inbound_at ? when(l.last_inbound_at) : ""],
                      ["Customer since", l.converted_at ? when(l.converted_at) : ""],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={String(k)}>
                        <dt className="text-xs text-faint">{k}</dt>
                        <dd className="text-fg">{v}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="flex justify-end">
                    <button type="button" onClick={() => remove(l)} className="inline-flex items-center gap-1.5 text-sm text-faint hover:text-danger">
                      <Trash2 size={14} /> Delete enquiry
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
