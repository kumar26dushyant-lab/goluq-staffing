import { useCallback, useEffect, useState } from "react";
import { ChevronDown, IndianRupee, Send } from "lucide-react";
import { Button } from "../ui/Button";
import { inputClass } from "../../lib/ui";
import { adminGet, adminPost } from "../../lib/adminApi";

/** Wording the owner sees. Must stay in step with functions/lib/portal.ts. */
const STAGE_LABEL: Record<string, string> = {
  requirements: "Requirements",
  blueprint: "Blueprint & quote",
  approval: "Awaiting approval",
  build: "Build",
  testing: "Testing & UAT",
  delivery: "Delivery",
  support: "Support",
};

const KIND_LABEL: Record<string, string> = {
  build: "Build (commissionable)",
  enhancement: "Enhancement (commissionable within the window)",
  maintenance: "Maintenance (never commissioned)",
};

const inr = (n: unknown) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

type Act = (b: Record<string, unknown>) => Promise<any>;

/**
 * Projects — the owner's side of the customer portal, and the place money is
 * recorded.
 *
 * Everything a customer sees at /portal is driven from here: their account, the
 * stage their work is at, each update, and what has been delivered. Moving a
 * stage emails them, so a customer never has to ask where things stand.
 *
 * Money is recorded here too, because partner commission is a share of the
 * PROFIT on a project and only exists once a payment has actually arrived. So a
 * project carries its price, its cost and the partner who introduced the
 * customer, and "Record payment" is what books the commission.
 */
export function Projects() {
  const [d, setD] = useState<any>({ customers: [], projects: [], events: [], files: [], stages: [], kinds: [], commissions: [] });
  const [msg, setMsg] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setD(await adminGet("/api/admin/projects"));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const act: Act = async (body) => {
    setMsg("");
    const r = await adminPost("/api/admin/projects", body);
    setMsg(r.ok ? "Done" : r.error || "Failed");
    if (r.ok) await load();
    return r;
  };

  return (
    <div className="space-y-6">
      <NewCustomer act={act} />
      <NewProject customers={d.customers || []} kinds={d.kinds || []} act={act} />

      {msg && <p className="text-sm text-muted">{msg}</p>}

      <div className="space-y-4">
        {(d.projects || []).length === 0 && (
          <p className="text-base text-muted">
            No projects yet. Add a customer, then open a project for them.
          </p>
        )}
        {(d.projects || []).map((p: any) => {
          const events = (d.events || []).filter((e: any) => e.project_id === p.id);
          const files = (d.files || []).filter((f: any) => f.project_id === p.id);
          const commissions = (d.commissions || []).filter((c: any) => c.project_id === p.id);
          const open = openId === p.id;
          return (
            <div key={p.id} className="glass rounded-2xl p-5">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : p.id)}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <div>
                  <p className="font-display text-lg font-bold text-fg">{p.title}</p>
                  <p className="text-sm text-muted">
                    {p.customer_name} · {STAGE_LABEL[p.stage] || p.stage} · {p.status}
                    {p.kind && p.kind !== "build" ? ` · ${p.kind}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-faint">
                    {inr(p.paid_inr)} paid of {inr(p.price_inr)}
                    {p.ref_code ? ` · partner ${p.ref_code}` : ""}
                  </p>
                </div>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>

              {open && (
                <div className="mt-5 space-y-5 border-t border-hairline/10 pt-5">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-fg">
                      Move to stage (emails the customer)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(d.stages || []).map((s: string) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => act({ action: "setStage", projectId: p.id, stage: s })}
                          className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                            p.stage === s
                              ? "bg-teal-glow/20 text-brand-luq ring-1 ring-teal-glow/45"
                              : "glass glass-interactive text-muted hover:text-fg"
                          }`}
                        >
                          {STAGE_LABEL[s] || s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Money project={p} commissions={commissions} act={act} />
                  <AddUpdate projectId={p.id} act={act} />
                  <AddFile projectId={p.id} act={act} />

                  {files.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-fg">Delivered</p>
                      <ul className="mt-1 space-y-1">
                        {files.map((f: any) => (
                          <li key={f.id} className="text-sm">
                            <a href={f.url} target="_blank" rel="noreferrer" className="text-brand-luq hover:underline">
                              {f.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {events.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-fg">History</p>
                      <ul className="mt-1 space-y-1.5">
                        {events.slice(0, 15).map((e: any) => (
                          <li key={e.id} className="text-sm text-muted">
                            <span className="mr-2 font-mono text-xs text-faint">
                              {String(e.created_at).slice(0, 10)}
                            </span>
                            {e.author === "customer" && (
                              <span className="mr-1 font-semibold text-brand-luq">Customer:</span>
                            )}
                            {e.note}
                            {!e.visible && <span className="ml-2 text-xs text-faint">(private)</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="glass rounded-2xl p-5">
        <p className="font-display text-base font-bold text-fg">Customers</p>
        <ul className="mt-2 space-y-1.5">
          {(d.customers || []).map((c: any) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className="font-semibold text-fg">{c.name}</span> · {c.phone}
              {c.has_password ? (
                <span className="text-success">· signed up</span>
              ) : (
                <>
                  <span className="text-warn">· not signed in yet</span>
                  <button
                    type="button"
                    onClick={() => act({ action: "inviteAgain", customerId: c.id })}
                    className="font-semibold text-brand-luq hover:underline"
                  >
                    resend link
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Price, cost, partner — and the button that records a payment. The commission
 * verdict comes back from the server and is shown as-is, including the reason
 * when nothing was booked, so the owner is never left guessing why a partner's
 * ledger did or did not move.
 */
function Money({ project: p, commissions, act }: { project: any; commissions: any[]; act: Act }) {
  const [price, setPrice] = useState(String(p.price_inr ?? ""));
  const [cost, setCost] = useState(String(p.cost_inr ?? ""));
  const [ref, setRef] = useState(String(p.ref_code ?? ""));
  const [pay, setPay] = useState("");
  const [payNote, setPayNote] = useState("");
  const [verdict, setVerdict] = useState("");

  useEffect(() => {
    setPrice(String(p.price_inr ?? ""));
    setCost(String(p.cost_inr ?? ""));
    setRef(String(p.ref_code ?? ""));
  }, [p.id, p.price_inr, p.cost_inr, p.ref_code]);

  const profit = Math.max(0, (Number(price) || 0) - (Number(cost) || 0));
  const dirty = String(p.price_inr ?? "") !== price || String(p.cost_inr ?? "") !== cost || String(p.ref_code ?? "") !== ref;

  return (
    <div className="rounded-xl border border-hairline/12 bg-panel/30 p-4">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-fg">
        <IndianRupee size={14} /> Money
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs text-muted">
          Price
          <input className={inputClass + " mt-1"} value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" />
        </label>
        <label className="text-xs text-muted">
          Cost to deliver
          <input className={inputClass + " mt-1"} value={cost} onChange={(e) => setCost(e.target.value)} inputMode="numeric" placeholder="Your cost" />
        </label>
        <label className="text-xs text-muted">
          Partner code
          <input className={inputClass + " mt-1"} value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} placeholder="None" />
        </label>
      </div>
      <p className="mt-2 text-xs text-faint">
        Profit {inr(profit)} · {inr(p.paid_inr)} paid so far
        {p.kind ? ` · ${KIND_LABEL[p.kind] || p.kind}` : ""}
      </p>
      {dirty && (
        <Button
          className="mt-2"
          onClick={() => act({ action: "setMoney", projectId: p.id, priceInr: Number(price) || 0, costInr: Number(cost) || 0, refCode: ref })}
        >
          Save money details
        </Button>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
        <input className={inputClass} value={pay} onChange={(e) => setPay(e.target.value)} placeholder="Payment received (₹)" inputMode="numeric" />
        <input className={inputClass} value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Note (UPI ref, instalment…)" />
        <Button
          disabled={!(Number(pay) > 0) || dirty}
          onClick={async () => {
            const r = await act({ action: "recordPayment", projectId: p.id, amountInr: Number(pay), note: payNote });
            if (r.ok) {
              const c = r.commission || {};
              setVerdict(
                c.eligible
                  ? `Recorded. Partner commission booked: ${inr(c.amountInr)} (${Math.round(c.rate * 100)}% of the profit share of this payment).`
                  : `Recorded. No commission: ${c.reason || "—"}`
              );
              setPay("");
              setPayNote("");
            }
          }}
        >
          Record payment
        </Button>
      </div>
      {dirty && <p className="mt-1 text-xs text-warn">Save the money details before recording a payment, so the commission is worked out on the right figures.</p>}
      {verdict && <p className="mt-2 text-sm text-muted">{verdict}</p>}

      {commissions.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-muted">
          {commissions.map((c: any) => (
            <li key={c.id}>
              <span className="font-mono text-faint">{String(c.created_at).slice(0, 10)}</span> · {c.affiliate_code} earned{" "}
              <span className="font-semibold text-fg">{inr(c.amount_inr)}</span> on {inr(c.basis_inr)} · {c.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewCustomer({ act }: { act: Act }) {
  const [f, setF] = useState({ name: "", phone: "", email: "", company: "" });
  const [note, setNote] = useState("");
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="glass space-y-3 rounded-2xl p-5">
      <p className="font-display text-base font-bold text-fg">Add a customer</p>
      <p className="text-sm text-muted">
        They get an email with a link to choose their own password. Without an email address there
        is no way to invite them, so add one.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={inputClass} value={f.name} onChange={set("name")} placeholder="Name" />
        <input className={inputClass} value={f.phone} onChange={set("phone")} placeholder="Phone (their login)" />
        <input className={inputClass} value={f.email} onChange={set("email")} placeholder="Email" />
        <input className={inputClass} value={f.company} onChange={set("company")} placeholder="Company (optional)" />
      </div>
      <Button
        onClick={async () => {
          const r = await act({ action: "addCustomer", ...f });
          if (r.ok) {
            setNote(
              r.invited
                ? "Invite emailed."
                : "Created — but no invite went out. Check the email address, and that sending is configured."
            );
            setF({ name: "", phone: "", email: "", company: "" });
          }
        }}
        disabled={!f.name || f.phone.length < 10}
      >
        Add customer
      </Button>
      {note && <p className="text-sm text-muted">{note}</p>}
    </div>
  );
}

function NewProject({ customers, kinds, act }: { customers: any[]; kinds: string[]; act: Act }) {
  const blank = { customerId: "", title: "", priceInr: "", costInr: "", kind: "build", refCode: "", targetDate: "" };
  const [f, setF] = useState(blank);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="glass space-y-3 rounded-2xl p-5">
      <p className="font-display text-base font-bold text-fg">Open a project</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <select className={inputClass} value={f.customerId} onChange={set("customerId")}>
          <option value="">Choose a customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.phone}
            </option>
          ))}
        </select>
        <input className={inputClass} value={f.title} onChange={set("title")} placeholder="What is being built" />
        <input className={inputClass} value={f.priceInr} onChange={set("priceInr")} placeholder="Agreed price (₹)" inputMode="numeric" />
        <input className={inputClass} value={f.costInr} onChange={set("costInr")} placeholder="Your cost to deliver (₹) — for partner commission" inputMode="numeric" />
        <select className={inputClass} value={f.kind} onChange={set("kind")}>
          {(kinds.length ? kinds : ["build", "enhancement", "maintenance"]).map((k) => (
            <option key={k} value={k}>{KIND_LABEL[k] || k}</option>
          ))}
        </select>
        <input className={inputClass} value={f.refCode} onChange={(e) => setF({ ...f, refCode: e.target.value.toUpperCase() })} placeholder="Partner code (auto-filled from their lead if blank)" />
        <input className={inputClass} value={f.targetDate} onChange={set("targetDate")} placeholder="Target date (optional)" />
      </div>
      <Button
        onClick={async () => {
          const r = await act({ action: "addProject", ...f });
          if (r.ok) setF(blank);
        }}
        disabled={!f.customerId || !f.title}
      >
        Open project
      </Button>
    </div>
  );
}

function AddUpdate({ projectId, act }: { projectId: number; act: Act }) {
  const [note, setNote] = useState("");
  const [visible, setVisible] = useState(true);
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-fg">Add an update</p>
      <textarea
        className={inputClass + " min-h-[4.5rem]"}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What happened…"
      />
      <label className="mt-2 flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="h-4 w-4" />
        The customer can see this
      </label>
      <Button
        className="mt-2"
        onClick={async () => {
          const r = await act({ action: "addUpdate", projectId, note, visible });
          if (r.ok) setNote("");
        }}
        disabled={!note.trim()}
      >
        <Send size={15} /> Post update
      </Button>
    </div>
  );
}

function AddFile({ projectId, act }: { projectId: number; act: Act }) {
  const [f, setF] = useState({ label: "", url: "" });
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-fg">Add a deliverable</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={inputClass} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="What it is" />
        <input className={inputClass} value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://…" />
      </div>
      <Button
        className="mt-2"
        onClick={async () => {
          const r = await act({ action: "addFile", projectId, ...f });
          if (r.ok) setF({ label: "", url: "" });
        }}
        disabled={!f.label || !/^https?:\/\//i.test(f.url)}
      >
        Add deliverable
      </Button>
    </div>
  );
}
