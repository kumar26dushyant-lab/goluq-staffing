import { useCallback, useEffect, useState } from "react";
import { Users, Wallet, MousePointerClick, UserPlus, ShieldCheck, ChevronDown, Copy } from "lucide-react";
import { Button } from "../ui/Button";
import { inputClass } from "../../lib/ui";
import { adminGet, adminPost } from "../../lib/adminApi";

/**
 * Partners — the people who bring customers, and what they are owed.
 *
 * The model: a partner earns a share of GoLuQ's PROFIT on each project they
 * introduced, booked when a payment is recorded in Projects. So this screen
 * has exactly three jobs — show each partner and what they have produced, show
 * what is owed and let the owner approve and pay it, and hold the terms the
 * whole thing runs on. Nothing here creates money; Projects does that.
 */
interface Partner {
  id: number; code: string; name: string; phone: string; email: string | null; city: string | null;
  upi_id: string; status: string; created_at: string; clicks: number; leads: number; earnings: number;
}
interface Row {
  id: number; affiliate_code: string; partner: string | null; upi_id: string | null; customer: string | null; project: string | null;
  basis_inr: number | null; rate: number; amount_inr: number; status: string; created_at: string; note: string | null;
}
interface Terms { rate: number; enhancementMonths: number; typicalMargin: number; minPayoutInr: number; attributionDays: number }

const inr = (n: unknown) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const day = (s: string) => String(s).slice(0, 10);

export function Partners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [ledger, setLedger] = useState<Row[]>([]);
  const [terms, setTerms] = useState<Terms | null>(null);
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const [a, c, cfg] = await Promise.all([
      adminGet("/api/admin/affiliates"),
      adminGet("/api/admin/commission"),
      fetch("/api/config").then((r) => r.json()).catch(() => ({})),
    ]);
    setPartners(a.affiliates || []);
    setLedger(c.commissions || []);
    if (cfg?.affiliate) setTerms(cfg.affiliate);
  }, []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: number, status: string) => {
    const r = await adminPost("/api/admin/commission", { action: "status", id, status });
    if (r.ok) load(); else setMsg(r.error || "Failed.");
  };

  // What is owed right now, per partner: approved and not yet paid.
  const owed = new Map<string, number>();
  for (const r of ledger) if (r.status === "approved") owed.set(r.affiliate_code, (owed.get(r.affiliate_code) || 0) + r.amount_inr);
  const pending = ledger.filter((r) => r.status === "pending");
  const totals = {
    pending: ledger.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount_inr, 0),
    approved: ledger.filter((r) => r.status === "approved").reduce((s, r) => s + r.amount_inr, 0),
    paid: ledger.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount_inr, 0),
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile icon={<Users size={15} />} label="Partners" value={partners.length} />
        <Tile icon={<Wallet size={15} />} label="To review" value={inr(totals.pending)} hot={totals.pending > 0} />
        <Tile icon={<Wallet size={15} />} label="To pay out" value={inr(totals.approved)} hot={totals.approved > 0} />
        <Tile icon={<Wallet size={15} />} label="Paid so far" value={inr(totals.paid)} />
      </div>

      {/* Money that needs a decision comes first. */}
      {(pending.length > 0 || owed.size > 0) && (
        <Card title="Needs your decision" hot>
          {pending.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold text-fg">{inr(r.amount_inr)} to <span className="font-mono text-brand-luq">{r.affiliate_code}</span>{r.partner ? ` · ${r.partner}` : ""}</p>
                <p className="text-sm text-muted">{r.project || r.customer || "—"} · payment {r.basis_inr ? inr(r.basis_inr) : "—"} · {Math.round(r.rate * 100)}% of profit · {day(r.created_at)}</p>
              </div>
              <div className="flex gap-2">
                <Button size="md" onClick={() => setStatus(r.id, "approved")}>Approve</Button>
              </div>
            </div>
          ))}
          {[...owed.entries()].map(([code, amt]) => {
            const p = partners.find((x) => x.code === code);
            const ready = terms ? amt >= terms.minPayoutInr : true;
            return (
              <div key={code} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-fg">Pay {inr(amt)} to <span className="font-mono text-brand-luq">{code}</span>{p ? ` · ${p.name}` : ""}</p>
                  <p className="flex items-center gap-2 text-sm text-muted">
                    UPI <span className="font-mono text-fg">{p?.upi_id || "—"}</span>
                    {p?.upi_id && (
                      <button type="button" onClick={() => navigator.clipboard?.writeText(p.upi_id)} aria-label="Copy UPI" className="text-faint hover:text-fg"><Copy size={13} /></button>
                    )}
                    {!ready && terms && <span className="text-warn">· below the {inr(terms.minPayoutInr)} minimum, carries forward</span>}
                  </p>
                </div>
                <Button size="md" variant="secondary" onClick={async () => {
                  for (const r of ledger.filter((x) => x.affiliate_code === code && x.status === "approved")) await setStatus(r.id, "paid");
                }}>Mark all paid</Button>
              </div>
            );
          })}
        </Card>
      )}

      <Card title="Partners">
        {partners.length === 0 && <p className="px-4 py-4 text-sm text-muted">Nobody has registered yet. The partner page is goluq.com/partner.</p>}
        {partners.map((p) => {
          const open = openCode === p.code;
          const rows = ledger.filter((r) => r.affiliate_code === p.code);
          return (
            <div key={p.id}>
              <button type="button" onClick={() => setOpenCode(open ? null : p.code)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-panel/60">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-glow/15 font-display text-sm font-bold text-brand-luq">{p.name.slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-fg">{p.name} <span className="ml-1 font-mono text-xs text-brand-luq">{p.code}</span></p>
                  <p className="truncate text-sm text-muted">{p.phone}{p.city ? ` · ${p.city}` : ""} · since {day(p.created_at)}{p.status !== "active" ? ` · ${p.status}` : ""}</p>
                </div>
                <div className="hidden shrink-0 gap-4 text-right sm:flex">
                  <Mini icon={<MousePointerClick size={12} />} v={p.clicks} l="clicks" />
                  <Mini icon={<UserPlus size={12} />} v={p.leads} l="enquiries" />
                  <Mini icon={<Wallet size={12} />} v={inr(p.earnings)} l="earned" />
                </div>
                <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <div className="space-y-3 border-t border-hairline/10 bg-panel/40 px-4 py-3">
                  <div className="grid grid-cols-3 gap-2 sm:hidden">
                    <Mini icon={<MousePointerClick size={12} />} v={p.clicks} l="clicks" />
                    <Mini icon={<UserPlus size={12} />} v={p.leads} l="enquiries" />
                    <Mini icon={<Wallet size={12} />} v={inr(p.earnings)} l="earned" />
                  </div>
                  <p className="text-sm text-muted">Share link <span className="font-mono text-fg">goluq.com/?ref={p.code}</span> · UPI <span className="font-mono text-fg">{p.upi_id}</span>{p.email ? ` · ${p.email}` : ""}</p>
                  {rows.length === 0 ? (
                    <p className="text-sm text-faint">No commission yet — it appears when a payment is recorded on a project carrying this code.</p>
                  ) : (
                    <ul className="divide-y divide-hairline/8 text-sm">
                      {rows.map((r) => (
                        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                          <span className="text-muted"><span className="font-mono text-xs text-faint">{day(r.created_at)}</span> · {r.project || r.customer || "—"}</span>
                          <span className="flex items-center gap-3">
                            <span className="font-semibold text-fg">{inr(r.amount_inr)}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.status === "paid" ? "bg-success/15 text-success" : r.status === "approved" ? "bg-teal-glow/15 text-brand-luq" : "bg-warn/15 text-warn"}`}>{r.status}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <TermsCard terms={terms} onSaved={load} />
      {msg && <p className="text-sm text-danger">{msg}</p>}
    </div>
  );
}

function TermsCard({ terms, onSaved }: { terms: Terms | null; onSaved: () => void }) {
  const [t, setT] = useState({ rate: 20, enhancementMonths: 24, typicalMargin: 40, minPayoutInr: 500, attributionDays: 90 });
  const [saved, setSaved] = useState("");
  useEffect(() => {
    if (terms) setT({ rate: Math.round(terms.rate * 100), enhancementMonths: terms.enhancementMonths, typicalMargin: Math.round(terms.typicalMargin * 100), minPayoutInr: terms.minPayoutInr, attributionDays: terms.attributionDays });
  }, [terms]);
  const save = async () => {
    setSaved("");
    const d = await adminPost("/api/admin/settings", {
      aff_rate: t.rate / 100, aff_enh_months: t.enhancementMonths, aff_typical_margin: t.typicalMargin / 100,
      aff_min_payout: t.minPayoutInr, aff_attribution_days: t.attributionDays,
    });
    setSaved(d.ok ? "Saved. Live on the partner page and used for every new booking." : "Failed.");
    if (d.ok) onSaved();
  };
  const F = (label: string, key: keyof typeof t, suffix: string, help: string) => (
    <label className="block">
      <span className="block text-sm font-semibold text-fg">{label}</span>
      <span className="mb-1.5 block text-xs text-muted">{help}</span>
      <div className="flex items-center gap-2">
        <input className={`${inputClass} w-28`} type="number" value={t[key]} onChange={(e) => setT({ ...t, [key]: Number(e.target.value) })} />
        <span className="text-sm text-muted">{suffix}</span>
      </div>
    </label>
  );
  const example = Math.round(100000 * (t.typicalMargin / 100) * (t.rate / 100));
  return (
    <Card title="Terms">
      <div className="space-y-5 p-4">
        <p className="text-sm text-muted">
          A partner earns <b className="text-fg">{t.rate}% of your profit</b> on each project they introduce — price minus your cost to
          deliver — booked when you record a payment in Projects. On a ₹1,00,000 build at a {t.typicalMargin}% margin that is about{" "}
          <b className="text-fg">{inr(example)}</b>. Enhancements within {t.enhancementMonths} months earn the same; maintenance never does.
          Existing bookings keep the rate they were made at.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {F("Share of profit", "rate", "%", "The partner's cut of what you actually make.")}
          {F("Enhancement window", "enhancementMonths", "months", "How long after the first project their customer's new work still earns.")}
          {F("Typical margin", "typicalMargin", "%", "Only for the public calculator's estimate. Real bookings use the real cost.")}
          {F("Minimum payout", "minPayoutInr", "₹", "Approved amounts below this carry forward.")}
          {F("Attribution window", "attributionDays", "days", "How long after a click a lead still counts as theirs.")}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save}><ShieldCheck size={16} /> Save terms</Button>
          {saved && <span className="text-sm text-muted">{saved}</span>}
        </div>
      </div>
    </Card>
  );
}

function Card({ title, hot, children }: { title: string; hot?: boolean; children: React.ReactNode }) {
  return (
    <section className={`overflow-hidden rounded-2xl ${hot ? "glass-bright" : "glass"}`}>
      <h2 className="border-b border-hairline/10 px-4 py-3 font-display text-base font-bold text-fg">{title}</h2>
      <div className="divide-y divide-hairline/8">{children}</div>
    </section>
  );
}
function Tile({ icon, label, value, hot }: { icon: React.ReactNode; label: string; value: React.ReactNode; hot?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${hot ? "glass-bright" : "glass"}`}>
      <p className="flex items-center gap-1.5 text-xs text-muted">{icon} {label}</p>
      <p className={`mt-1 font-display text-xl font-bold ${hot ? "text-brand-luq" : "text-fg"}`}>{value}</p>
    </div>
  );
}
function Mini({ icon, v, l }: { icon: React.ReactNode; v: React.ReactNode; l: string }) {
  return (
    <div className="text-left sm:text-right">
      <p className="font-semibold text-fg">{v}</p>
      <p className="flex items-center gap-1 text-[11px] text-faint sm:justify-end">{icon} {l}</p>
    </div>
  );
}
