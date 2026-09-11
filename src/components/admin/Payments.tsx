import { useCallback, useEffect, useState } from "react";
import { IndianRupee, Send, CheckCircle2, Clock, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "../ui/Button";
import { inputClass } from "../../lib/ui";
import { adminGet, adminPost } from "../../lib/adminApi";

/**
 * Payments — every Razorpay link we issued, what it was for, whether it was
 * paid; plus the recent calls, so a link can be pushed at a booking with one
 * tap (a fresh one replaces whatever is still open for that call).
 */
interface Payment { id: number; kind: string; booking_id: number | null; phone: string | null; email: string | null; name: string | null; amount_inr: number; provider: string | null; currency: string | null; amount: number | null; description: string; url: string; status: string; expires_at: string | null; created_at: string; paid_at: string | null; booking_name: string | null; starts_at: string | null }
interface Call { id: number; name: string; email: string | null; phone: string | null; starts_at: string; ends_at: string | null; status: string; pay_status: string | null }
interface Data { ready: boolean; dodo: boolean; call_price_inr: number; payments: Payment[]; calls: Call[]; totals: { paid: number; open: number; paid30: number } }

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const when = (s: string | null) => {
  if (!s) return "";
  const t = Date.parse(s.replace(" ", "T") + "Z");
  return Number.isFinite(t) ? new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : s;
};

export function Payments() {
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState(0);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ phone: "", email: "", name: "", amount: "", description: "" });

  const load = useCallback(async () => setD(await adminGet("/api/admin/payments")), []);
  useEffect(() => { load(); }, [load]);

  const push = async (bookingId: number) => {
    setBusy(bookingId); setMsg("");
    const r = await adminPost("/api/admin/payments", { action: "issue", booking_id: bookingId });
    setBusy(0); setMsg(r.ok ? `Link sent${r.whatsapp ? " on WhatsApp" : ""}${r.whatsapp && r.email ? " and" : ""}${r.email ? " by email" : ""}${!r.whatsapp && !r.email ? " — but nothing was delivered; check WhatsApp and email setup" : ""}.` : r.error || "Failed.");
    load();
  };
  const issue = async () => {
    setBusy(-1); setMsg("");
    const r = await adminPost("/api/admin/payments", { action: "issue", phone: f.phone, email: f.email, name: f.name, amount_inr: Number(f.amount), description: f.description });
    setBusy(0); setMsg(r.ok ? "Link sent." : r.error || "Failed.");
    if (r.ok) setF({ phone: "", email: "", name: "", amount: "", description: "" });
    load();
  };

  if (!d) return <p className="text-muted">Loading…</p>;

  const pill = (s: string) => {
    const map: Record<string, string> = { paid: "bg-teal-glow/15 text-brand-luq", issued: "bg-warn/15 text-warn", expired: "bg-panel text-faint", cancelled: "bg-panel text-faint" };
    return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${map[s] || "bg-panel text-muted"}`}>{s}</span>;
  };

  return (
    <div className="space-y-6">
      {!d.ready && (
        <div className="flex items-start gap-3 rounded-2xl border border-warn/40 bg-warn/10 p-4 text-sm">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warn" />
          <p className="text-fg">Razorpay is not connected yet. Add the key id and key secret under Settings → Payments. Until then carts and bookings in India get no link{d.dodo ? "; customers abroad still get a Dodo link" : ""}.</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[["Paid, 30 days", inr(d.totals.paid30)], ["Paid, all time", inr(d.totals.paid)], ["Open links", inr(d.totals.open)]].map(([l, v]) => (
          <div key={l} className="glass rounded-2xl p-4"><p className="text-xs text-muted">{l}</p><p className="mt-1 font-display text-2xl font-bold text-fg">{v}</p></div>
        ))}
      </div>

      {msg && <p className="text-sm text-muted">{msg}</p>}

      <section className="glass rounded-2xl">
        <div className="flex items-center gap-2 border-b border-hairline/10 px-4 py-3"><Clock size={16} className="text-brand-luq" /><h3 className="font-semibold text-fg">Calls · push the {inr(d.call_price_inr)} link</h3></div>
        {d.calls.length === 0 && <p className="px-4 py-3 text-sm text-muted">No calls in the last two weeks.</p>}
        {d.calls.map((k) => (
          <div key={k.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-fg">{k.name} <span className="ml-1 text-xs font-normal text-faint">{k.status}</span></p>
              <p className="text-sm text-muted">{when(k.starts_at)}{k.phone ? ` · ${k.phone}` : ""}{k.email ? ` · ${k.email}` : ""}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {k.pay_status && pill(k.pay_status)}
              {k.pay_status !== "paid" && (
                <Button onClick={() => push(k.id)} disabled={busy === k.id || !d.ready}><Send size={14} /> {k.pay_status ? "Send again" : "Send link"}</Button>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="glass rounded-2xl p-4">
        <div className="mb-3 flex items-center gap-2"><IndianRupee size={16} className="text-brand-luq" /><h3 className="font-semibold text-fg">Send a link for anything else</h3></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className={inputClass} placeholder="WhatsApp number (10 digits or 91…)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <input className={inputClass} placeholder="Email (optional)" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <input className={inputClass} placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className={inputClass} placeholder="Amount in ₹" inputMode="numeric" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/\D/g, "") })} />
          <input className={`${inputClass} sm:col-span-2`} placeholder="What it is for, in plain words (goes on the link and the message)" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </div>
        <div className="mt-3"><Button onClick={issue} disabled={busy === -1 || !d.ready || !f.amount || !f.description || (!f.phone && !f.email)}><Send size={14} /> Send payment link</Button></div>
      </section>

      <section className="glass rounded-2xl">
        <div className="flex items-center gap-2 border-b border-hairline/10 px-4 py-3"><CheckCircle2 size={16} className="text-brand-luq" /><h3 className="font-semibold text-fg">Links issued</h3></div>
        {d.payments.length === 0 && <p className="px-4 py-3 text-sm text-muted">None yet.</p>}
        {d.payments.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-fg">{p.currency && p.currency !== "INR" ? `${p.currency} ${Number(p.amount || 0).toLocaleString("en-US")}` : inr(p.amount_inr)} · {p.description}{p.provider === "dodo" ? <span className="ml-2 text-xs font-normal text-faint">Dodo</span> : null}</p>
              <p className="truncate text-sm text-muted">{p.name || p.booking_name || ""}{p.phone ? ` · ${p.phone}` : ""}{p.email ? ` · ${p.email}` : ""} · {when(p.created_at)}{p.paid_at ? ` · paid ${when(p.paid_at)}` : p.expires_at ? ` · till ${when(p.expires_at)}` : ""}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {pill(p.status)}
              <a href={p.url} target="_blank" rel="noreferrer" className="text-muted hover:text-fg"><ExternalLink size={16} /></a>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
