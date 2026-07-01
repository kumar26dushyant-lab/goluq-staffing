import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard, Users, TrendingUp, MessageSquare, Settings as SettingsIcon,
  LogOut, Search, Download, Trash2, RefreshCw, Send, ShieldCheck, Circle,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { BrandMark } from "../components/BrandMark";
import { inputClass } from "../lib/ui";
import { getToken, setToken, clearToken, adminGet, adminPost, leadsCsvUrl } from "../lib/adminApi";

type Section = "overview" | "leads" | "affiliates" | "whatsapp" | "settings";

export function Admin() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [section, setSection] = useState<Section>("overview");

  useEffect(() => {
    if (!getToken()) { setChecking(false); return; }
    adminGet("/api/admin/stats").then(() => setAuthed(true)).catch(() => clearToken()).finally(() => setChecking(false));
  }, []);

  if (checking) return <Screen><p className="text-muted">Loading…</p></Screen>;
  if (!authed) return <SignIn onIn={() => setAuthed(true)} />;

  const NAV: { id: Section; label: string; icon: typeof Users }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "leads", label: "Leads", icon: Users },
    { id: "affiliates", label: "Affiliates", icon: TrendingUp },
    { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-hairline/10 bg-abyss/80 px-5 py-3 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-3">
          <BrandMark className="text-xl" />
          <span className="rounded-full bg-teal-glow/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-brand-luq">Admin</span>
        </div>
        <button type="button" onClick={() => { clearToken(); setAuthed(false); }}
          className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-semibold text-muted hover:text-fg">
          <LogOut size={15} /> Sign out
        </button>
      </header>

      <nav className="sticky top-[57px] z-20 flex gap-1 overflow-x-auto border-b border-hairline/10 bg-abyss/70 px-3 py-2 backdrop-blur-xl sm:px-8">
        {NAV.map((n) => {
          const Icon = n.icon; const on = section === n.id;
          return (
            <button key={n.id} type="button" onClick={() => setSection(n.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${on ? "bg-teal-glow/20 text-brand-luq" : "text-muted hover:text-fg"}`}>
              <Icon size={16} /> {n.label}
            </button>
          );
        })}
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8">
        {section === "overview" && <Overview />}
        {section === "leads" && <Leads />}
        {section === "affiliates" && <Affiliates />}
        {section === "whatsapp" && <WhatsApp />}
        {section === "settings" && <SettingsPanel />}
      </main>
    </div>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-dvh place-items-center px-6">{children}</div>;
}

function SignIn({ onIn }: { onIn: () => void }) {
  const [pw, setPw] = useState("");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!pw) return;
    setBusy(true); setErr("");
    setToken(pw, remember);
    try {
      const r = await adminGet("/api/admin/stats");
      if (r.ok) onIn(); else throw new Error();
    } catch { clearToken(); setErr("Incorrect admin secret."); } finally { setBusy(false); }
  };
  return (
    <Screen>
      <div className="glass w-full max-w-sm rounded-3xl p-8">
        <BrandMark className="text-2xl" />
        <h1 className="mt-4 font-display text-2xl font-bold text-fg">Admin sign in</h1>
        <p className="mt-1 text-sm text-muted">Enter your admin secret to continue.</p>
        <input type="password" className={`${inputClass} mt-5`} value={pw} placeholder="Admin secret"
          onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} autoFocus />
        <label className="mt-3 flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me on this device
        </label>
        {err && <p className="mt-2 text-sm text-danger">{err}</p>}
        <Button full className="mt-5" onClick={submit} disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
      </div>
    </Screen>
  );
}

function Card({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 ${accent ? "glass-bright" : "glass"}`}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-fg">{value}</p>
    </div>
  );
}

function Overview() {
  const [s, setS] = useState<any>(null);
  const [err, setErr] = useState("");
  useEffect(() => { adminGet("/api/admin/stats").then(setS).catch(() => setErr("Failed to load")); }, []);
  if (err) return <p className="text-danger">{err}</p>;
  if (!s) return <p className="text-muted">Loading…</p>;
  const flag = (on: boolean, label: string) => (
    <span className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-sm">
      <Circle size={9} className={on ? "fill-success text-success" : "fill-danger text-danger"} /> {label}
    </span>
  );
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card label="Total leads" value={s.leads.total} accent />
        <Card label="Today" value={s.leads.today} />
        <Card label="This week" value={s.leads.week} />
        <Card label="Want training" value={s.leads.trainingWanted} />
        <Card label="Affiliates" value={s.affiliates} />
        <Card label="Referral clicks" value={s.clicks} />
        <Card label="Opted out" value={s.leads.optedOut} />
        <Card label="WhatsApp" value={<span className="text-lg">{s.wa.state}</span>} />
      </div>
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-faint">System status</p>
        <div className="flex flex-wrap gap-2">
          {flag(s.config.gemini, "Smart assistant (Gemini)")}
          {flag(s.config.evolution, "WhatsApp (Evolution)")}
          {flag(s.config.ownerSet, "Owner number set")}
          {flag(s.config.followups, "Follow-ups on")}
        </div>
      </div>
    </div>
  );
}

function Leads() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (q) p.set("q", q); if (status) p.set("status", status);
    const d = await adminGet(`/api/admin/leads?${p.toString()}`);
    setRows(d.leads || []); setTotal(d.total || 0); setLoading(false);
  }, [q, status]);
  useEffect(() => { load(); }, [load]);

  const act = async (id: number, action: string, extra: any = {}) => {
    if (action === "delete" && !confirm("Delete this lead?")) return;
    await adminPost("/api/admin/lead", { id, action, ...extra });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input className={`${inputClass} pl-9`} placeholder="Search name / phone / email" value={q}
            onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
        </div>
        <select className={`${inputClass} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {["new", "engaged", "converted", "opted_out", "done"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button variant="secondary" size="md" onClick={load}><RefreshCw size={16} /></Button>
        <a href={leadsCsvUrl(q, status)}><Button variant="ghost" size="md"><Download size={16} /> CSV</Button></a>
      </div>
      <p className="text-sm text-muted">{total} lead{total === 1 ? "" : "s"}</p>

      <div className="overflow-x-auto rounded-2xl glass">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-faint">
            <tr className="border-b border-hairline/15">
              {["When", "Name", "Phone", "Worker", "Industry", "Status", ""].map((h) => <th key={h} className="p-3 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-b border-hairline/8 align-middle">
                <td className="p-3 text-muted">{String(l.created_at).slice(0, 16)}</td>
                <td className="p-3 font-semibold text-fg">{l.name}</td>
                <td className="p-3"><a className="text-brand-luq" href={`https://wa.me/91${l.phone}`} target="_blank" rel="noreferrer">+91 {l.phone}</a></td>
                <td className="p-3 text-muted">{l.role || "—"}</td>
                <td className="p-3 text-muted">{l.industry || "—"}</td>
                <td className="p-3">
                  <select value={l.status || "new"} onChange={(e) => act(l.id, "status", { status: e.target.value })}
                    className="rounded-lg border border-hairline/20 bg-panel/40 px-2 py-1 text-xs text-fg">
                    {["new", "engaged", "converted", "opted_out", "done"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <button type="button" onClick={() => act(l.id, "delete")} className="text-faint hover:text-danger" aria-label="Delete"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted">No leads.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Affiliates() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { adminGet("/api/admin/affiliates").then((d) => setRows(d.affiliates || [])); }, []);
  return (
    <div className="overflow-x-auto rounded-2xl glass">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="text-faint"><tr className="border-b border-hairline/15">
          {["Code", "Name", "Phone", "Clicks", "Leads", "Earnings", "Status"].map((h) => <th key={h} className="p-3 font-semibold">{h}</th>)}
        </tr></thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="border-b border-hairline/8">
              <td className="p-3 font-mono text-brand-luq">{a.code}</td>
              <td className="p-3 font-semibold text-fg">{a.name}</td>
              <td className="p-3 text-muted">{a.phone}</td>
              <td className="p-3">{a.clicks}</td>
              <td className="p-3">{a.leads}</td>
              <td className="p-3 font-semibold text-fg">₹{Math.round(a.earnings || 0).toLocaleString("en-IN")}</td>
              <td className="p-3 text-muted">{a.status}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted">No affiliates yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function WhatsApp() {
  const [state, setState] = useState("…");
  const [qr, setQr] = useState<string | null>(null);
  const [pairing, setPairing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [to, setTo] = useState(""); const [text, setText] = useState("Test from GoLuQ ✅"); const [sent, setSent] = useState("");

  const refresh = useCallback(async () => {
    const d = await adminGet("/api/admin/wa-status");
    setState(d.configured ? d.state : "not configured");
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const connect = async () => {
    setBusy(true); setQr(null); setPairing(null);
    const d = await adminPost("/api/admin/wa-connect", {});
    setBusy(false);
    if (d.ok) { setQr(d.qr || null); setPairing(d.pairingCode || null); setState(d.state || "connecting");
      const iv = setInterval(async () => { const s = await adminGet("/api/admin/wa-status"); setState(s.state); if (s.state === "open") { setQr(null); clearInterval(iv); } }, 3000);
    }
  };
  const send = async () => {
    setSent("");
    const d = await adminPost("/api/admin/wa-send", { to, text });
    setSent(d.ok ? "Sent ✅" : `Failed: ${d.error || "error"}`);
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-display text-xl font-bold text-fg">Connection</h2>
            <p className="mt-1 text-sm">State: <span className={state === "open" ? "text-success" : "text-warn"}>{state}</span></p></div>
          <Button variant="ghost" onClick={connect} disabled={busy}>{busy ? "Connecting…" : state === "open" ? "Reconnect" : "Connect WhatsApp"}</Button>
        </div>
        {qr && <div className="mt-5 flex flex-col items-center gap-2">
          <img src={qr} alt="WhatsApp QR" className="h-56 w-56 rounded-xl bg-white p-2" />
          <p className="text-sm text-muted">Scan with the GoLuQ number → WhatsApp → Linked devices.</p></div>}
        {pairing && <p className="mt-3 text-center font-mono text-lg text-brand-luq">Pairing code: {pairing}</p>}
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="font-display text-xl font-bold text-fg">Send a test message</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[200px_1fr_auto]">
          <input className={inputClass} placeholder="Phone (10-digit)" value={to} onChange={(e) => setTo(e.target.value)} />
          <input className={inputClass} placeholder="Message" value={text} onChange={(e) => setText(e.target.value)} />
          <Button onClick={send} disabled={!to || !text}><Send size={16} /> Send</Button>
        </div>
        {sent && <p className="mt-2 text-sm text-muted">{sent}</p>}
      </div>
    </div>
  );
}

function SettingsPanel() {
  const [owner, setOwner] = useState("");
  const [publicWa, setPublicWa] = useState("");
  const [followups, setFollowups] = useState(true);
  const [saved, setSaved] = useState("");
  useEffect(() => { adminGet("/api/admin/settings").then((d) => { setOwner(d.owner_whatsapp || ""); setPublicWa(d.public_whatsapp || ""); setFollowups(d.followups_enabled !== "0"); }); }, []);
  const save = async () => {
    setSaved("");
    const d = await adminPost("/api/admin/settings", { owner_whatsapp: owner, public_whatsapp: publicWa, followups_enabled: followups });
    setSaved(d.ok ? "Saved ✅" : "Failed");
  };
  return (
    <div className="max-w-lg space-y-5">
      <div className="glass space-y-5 rounded-2xl p-6">
        <label className="block">
          <span className="mb-1.5 block text-base font-semibold text-fg">Owner WhatsApp (private)</span>
          <span className="mb-2 block text-sm text-muted">Receives a WhatsApp alert for every new lead. Not shown on the site. 10-digit or 91XXXXXXXXXX.</span>
          <input className={inputClass} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="9198XXXXXXXX" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-base font-semibold text-fg">Public contact WhatsApp (shown on site)</span>
          <span className="mb-2 block text-sm text-muted">Optional. If set, visitors can reach you on WhatsApp from the booking form. Leave blank to hide it.</span>
          <input className={inputClass} value={publicWa} onChange={(e) => setPublicWa(e.target.value)} placeholder="Leave blank to hide" />
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={followups} onChange={(e) => setFollowups(e.target.checked)} className="h-5 w-5" />
          <span className="text-base font-semibold text-fg">Automatic follow-ups (day 3 / 5 / 7 / 12)</span>
        </label>
        <div><Button onClick={save}><ShieldCheck size={16} /> Save settings</Button>
        {saved && <span className="ml-3 text-sm text-muted">{saved}</span>}</div>
      </div>
    </div>
  );
}
