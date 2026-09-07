import { useCallback, useEffect, useState } from "react";
import {
  MessageSquare, Globe, Radio, Users, CalendarClock, RefreshCw, ArrowRight, Bot, User,
} from "lucide-react";
import { adminGet } from "../../lib/adminApi";

/**
 * The board the cockpit opens on: who is waiting, what came in, what is due.
 *
 * Every item is a person and every card is a door. Counts sit at the top for a
 * glance; the lists below are the work. Polled every 15 s so it can be left
 * open on a phone beside the till.
 */
interface Session {
  id: string;
  visitor_name: string | null;
  visitor_phone: string | null;
  page: string | null;
  lang: string | null;
  last_at: string;
  created_at: string;
  needs_human: number;
  unread_for_agent: number;
  bot_off: number;
  closed: number;
  last_message: string | null;
  last_role: string | null;
  msg_count: number;
}
interface Lead {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  industry: string | null;
  role: string | null;
  message: string | null;
  source: string | null;
  ref_code: string | null;
  status: string;
  created_at: string;
  next_followup_at: string | null;
}
interface Booking {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  starts_at: string;
  ends_at: string | null;
  meet_url: string | null;
  note: string | null;
  status: string;
}
interface Board {
  waiting: Session[];
  unread: Session[];
  recent: Session[];
  newLeads: Lead[];
  counts: { leadsToday: number; leadsWeek: number; waToday: number; webToday: number; followupsDue: number; visitorsToday: number };
  bookings: Booking[];
}

const isWa = (id: string) => id.startsWith("wa:");

function ago(s: string): string {
  const t = Date.parse(s.replace(" ", "T") + (s.endsWith("Z") ? "" : "Z"));
  if (!Number.isFinite(t)) return "";
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

function when(s: string): string {
  const t = Date.parse(s.replace(" ", "T") + (s.endsWith("Z") ? "" : "Z"));
  if (!Number.isFinite(t)) return s;
  return new Date(t).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function Today({ onOpenChat, onOpenLeads }: { onOpenChat: (id: string) => void; onOpenLeads: () => void }) {
  const [b, setB] = useState<Board | null>(null);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const d = await adminGet("/api/admin/today");
      if (d.ok) { setB(d); setErr(""); } else setErr("Could not load.");
    } catch {
      setErr("Could not reach the server.");
    }
  }, []);
  useEffect(() => {
    load();
    const iv = setInterval(() => { load(); setTick((t) => t + 1); }, 15000);
    return () => clearInterval(iv);
  }, [load]);

  if (err && !b) return <p className="text-danger">{err}</p>;
  if (!b) return <p className="text-muted">Loading…</p>;

  const c = b.counts;
  const tiles: { label: string; value: number | string; hot?: boolean }[] = [
    { label: "Waiting for you", value: b.waiting.length, hot: b.waiting.length > 0 },
    { label: "Unread chats", value: b.unread.length, hot: b.unread.length > 0 },
    { label: "Enquiries today", value: c.leadsToday },
    { label: "This week", value: c.leadsWeek },
    { label: "WhatsApp today", value: c.waToday },
    { label: "Web chats today", value: c.webToday },
    { label: "Follow-ups due", value: c.followupsDue },
    ...(c.visitorsToday >= 0 ? [{ label: "Visitors today", value: c.visitorsToday }] : []),
  ];

  return (
    <div className="space-y-6" data-tick={tick}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className={`rounded-2xl p-4 ${t.hot ? "glass-bright ring-1 ring-warn/40" : "glass"}`}>
            <p className="text-xs text-muted">{t.label}</p>
            <p className={`mt-1 font-display text-2xl font-bold ${t.hot ? "text-warn" : "text-fg"}`}>{t.value}</p>
          </div>
        ))}
      </div>

      {b.waiting.length > 0 && (
        <Section title="Waiting for a person" icon={<Radio size={16} className="animate-pulse text-warn" />} hot>
          {b.waiting.map((s) => <SessionRow key={s.id} s={s} onOpen={onOpenChat} />)}
        </Section>
      )}

      {b.bookings.length > 0 && (
        <Section title="Upcoming calls" icon={<CalendarClock size={16} className="text-brand-luq" />}>
          {b.bookings.map((k) => (
            <div key={k.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-fg">{k.name}</p>
                <p className="text-sm text-muted">{when(k.starts_at)}{k.phone ? ` · ${k.phone}` : ""}</p>
                {k.note && <p className="mt-1 line-clamp-2 text-sm text-muted">{k.note}</p>}
              </div>
              {k.meet_url && (
                <a href={k.meet_url} target="_blank" rel="noreferrer" className="shrink-0 rounded-full bg-teal-glow/15 px-3 py-1.5 text-sm font-semibold text-brand-luq">Join</a>
              )}
            </div>
          ))}
        </Section>
      )}

      <Section
        title="New enquiries"
        icon={<Users size={16} className="text-brand-luq" />}
        action={<button type="button" onClick={onOpenLeads} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-luq">All enquiries <ArrowRight size={14} /></button>}
      >
        {b.newLeads.length === 0 && <p className="px-4 py-3 text-sm text-muted">Nothing new in the last two weeks.</p>}
        {b.newLeads.map((l) => (
          <button key={l.id} type="button" onClick={onOpenLeads} className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-panel/40">
            <div className="min-w-0">
              <p className="truncate font-semibold text-fg">
                {l.name}
                <span className="ml-2 text-xs font-normal text-faint">{l.industry || l.role || ""}</span>
              </p>
              <p className="text-sm text-muted">+{l.phone.length === 10 ? "91 " + l.phone : l.phone}{l.source ? ` · via ${l.source}` : ""}{l.ref_code ? ` · partner ${l.ref_code}` : ""}</p>
              {l.message && <p className="mt-1 line-clamp-2 text-sm text-muted">{l.message}</p>}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-faint">{ago(l.created_at)}</p>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${l.status === "engaged" ? "bg-teal-glow/15 text-brand-luq" : "bg-warn/15 text-warn"}`}>{l.status}</span>
            </div>
          </button>
        ))}
      </Section>

      {b.unread.length > 0 && (
        <Section title="Unread conversations" icon={<MessageSquare size={16} className="text-brand-luq" />}>
          {b.unread.map((s) => <SessionRow key={s.id} s={s} onOpen={onOpenChat} />)}
        </Section>
      )}

      <Section
        title="Recent conversations"
        icon={<MessageSquare size={16} className="text-muted" />}
        action={<button type="button" onClick={load} aria-label="Refresh" className="text-muted hover:text-fg"><RefreshCw size={15} /></button>}
      >
        {b.recent.length === 0 && <p className="px-4 py-3 text-sm text-muted">No conversations yet.</p>}
        {b.recent.map((s) => <SessionRow key={s.id} s={s} onOpen={onOpenChat} />)}
      </Section>
    </div>
  );
}

function Section({ title, icon, hot, action, children }: { title: string; icon: React.ReactNode; hot?: boolean; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={`overflow-hidden rounded-2xl ${hot ? "glass-bright ring-1 ring-warn/30" : "glass"}`}>
      <header className="flex items-center justify-between border-b border-hairline/10 px-4 py-3">
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-fg">{icon} {title}</h2>
        {action}
      </header>
      <div className="divide-y divide-hairline/8">{children}</div>
    </section>
  );
}

function SessionRow({ s, onOpen }: { s: Session; onOpen: (id: string) => void }) {
  const wa = isWa(s.id);
  const who = s.visitor_name || s.visitor_phone || (wa ? `+${s.id.slice(3)}` : "Website visitor");
  const speaker = s.last_role === "visitor" ? <User size={12} className="inline text-muted" /> : s.last_role === "agent" ? <span className="text-[11px] font-semibold text-brand-luq">You:</span> : <Bot size={12} className="inline text-faint" />;
  return (
    <button type="button" onClick={() => onOpen(s.id)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-panel/40">
      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${wa ? "bg-success/15 text-success" : "bg-teal-glow/15 text-brand-luq"}`}>
        {wa ? <MessageSquare size={15} /> : <Globe size={15} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate font-semibold text-fg">
          <span className="truncate">{who}</span>
          {s.needs_human ? <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[11px] font-semibold text-warn">wants a person</span> : null}
          {s.bot_off ? <span className="rounded-full bg-panel/60 px-2 py-0.5 text-[11px] font-semibold text-muted">guide off</span> : null}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted">
          {speaker} <span className="truncate">{s.last_message || "—"}</span>
        </p>
        <p className="mt-0.5 text-xs text-faint">{wa ? "WhatsApp" : `Website · ${s.page || "home"}`} · {s.msg_count} messages</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs text-faint">{ago(s.last_at)}</p>
        {s.unread_for_agent > 0 && <span className="mt-1 inline-block rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">{s.unread_for_agent}</span>}
      </div>
    </button>
  );
}
