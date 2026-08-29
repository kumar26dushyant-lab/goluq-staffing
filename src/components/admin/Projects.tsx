import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Send } from "lucide-react";
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

type Act = (b: Record<string, unknown>) => Promise<any>;

/**
 * Projects — the owner's side of the customer portal.
 *
 * Everything a customer sees at /portal is driven from here: their account, the
 * stage their work is at, each update, and what has been delivered. Moving a
 * stage emails them, so a customer never has to ask where things stand.
 */
export function Projects() {
  const [d, setD] = useState<any>({ customers: [], projects: [], events: [], files: [], stages: [] });
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
      <NewProject customers={d.customers || []} act={act} />

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

function NewProject({ customers, act }: { customers: any[]; act: Act }) {
  const [f, setF] = useState({ customerId: "", title: "", priceInr: "", targetDate: "" });
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
        <input className={inputClass} value={f.targetDate} onChange={set("targetDate")} placeholder="Target date (optional)" />
      </div>
      <Button
        onClick={async () => {
          const r = await act({ action: "addProject", ...f });
          if (r.ok) setF({ customerId: "", title: "", priceInr: "", targetDate: "" });
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
