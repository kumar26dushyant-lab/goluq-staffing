import { Fragment, useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard, Users, TrendingUp, MessageSquare, Settings as SettingsIcon,
  LogOut, Search, Download, Trash2, RefreshCw, Send, ShieldCheck, Circle,
  BarChart3, ChevronDown, IndianRupee, Bot, Radio, Mail, FileText,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { BrandMark } from "../components/BrandMark";
import { useTranslation } from "react-i18next";
import { inputClass } from "../lib/ui";
import { EDITABLE_COPY, EDITABLE_KEYS } from "../content/editableCopy";
import { PLANS } from "../content/affiliateConfig";
import {
  getToken, setToken, clearToken, adminGet, adminPost, leadsCsvUrl,
  login, logout, setPasswordWithToken, checkSetupToken,
} from "../lib/adminApi";

type Section =
  | "overview" | "leads" | "chat" | "visitors" | "pricing"
  | "bot" | "content" | "inbox" | "affiliates" | "whatsapp" | "settings";

export function Admin() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [section, setSection] = useState<Section>("overview");
  // Waiting-visitor count, polled globally so the badge shows from any tab.
  const [waiting, setWaiting] = useState(0);

  useEffect(() => {
    if (!getToken()) { setChecking(false); return; }
    adminGet("/api/admin/stats").then(() => setAuthed(true)).catch(() => clearToken()).finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!authed) return;
    const poll = () => adminGet("/api/admin/chats").then((d) => setWaiting(d.waiting || 0)).catch(() => {});
    poll();
    const iv = setInterval(poll, 15000);
    return () => clearInterval(iv);
  }, [authed]);

  if (checking) return <Screen><p className="text-muted">Loading…</p></Screen>;
  if (!authed) return <SignIn onIn={() => setAuthed(true)} />;

  const NAV: { id: Section; label: string; icon: typeof Users }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "leads", label: "Leads", icon: Users },
    { id: "chat", label: "Live chat", icon: MessageSquare },
    { id: "inbox", label: "Inbox", icon: Mail },
    { id: "visitors", label: "Visitors", icon: BarChart3 },
    { id: "pricing", label: "Pricing & offers", icon: IndianRupee },
    { id: "content", label: "Content", icon: FileText },
    { id: "bot", label: "Bot", icon: Bot },
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
        <div className="flex items-center gap-2">
          <InstallApp />
          <button type="button" onClick={async () => { await logout(); setAuthed(false); }}
            className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-semibold text-muted hover:text-fg">
            <LogOut size={15} /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <nav className="sticky top-[57px] z-20 flex gap-1 overflow-x-auto border-b border-hairline/10 bg-abyss/70 px-3 py-2 backdrop-blur-xl sm:px-8">
        {NAV.map((n) => {
          const Icon = n.icon; const on = section === n.id;
          return (
            <button key={n.id} type="button" onClick={() => setSection(n.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${on ? "bg-teal-glow/20 text-brand-luq" : "text-muted hover:text-fg"}`}>
              <Icon size={16} /> {n.label}
              {n.id === "chat" && waiting > 0 && (
                <span className="ml-1 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">{waiting}</span>
              )}
            </button>
          );
        })}
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8">
        {section === "overview" && <Overview />}
        {section === "leads" && <Leads />}
        {section === "chat" && <LiveChat />}
        {section === "inbox" && <Inbox />}
        {section === "visitors" && <Visitors />}
        {section === "pricing" && <Pricing />}
        {section === "content" && <Content />}
        {section === "bot" && <BotPanel />}
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

/**
 * "Install app" — captures the browser's install prompt so the cockpit can be
 * added to a phone home screen and opened like a native app (it launches
 * straight into /admin, per the manifest start_url).
 *
 * Chrome/Edge/Android fire `beforeinstallprompt`; iOS Safari never does, so
 * there we fall back to telling the user where the Share → Add to Home Screen
 * option is rather than showing a button that does nothing.
 */
function InstallApp() {
  const [prompt, setPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!prompt && !isIos) return null;

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if (prompt) {
            prompt.prompt();
            const res = await prompt.userChoice.catch(() => null);
            if (res?.outcome === "accepted") setInstalled(true);
            setPrompt(null);
          } else {
            setShowIosHint((v) => !v);
          }
        }}
        className="inline-flex items-center gap-2 rounded-full bg-teal-glow/15 px-4 py-2 text-sm font-semibold text-brand-luq ring-1 ring-teal-glow/30"
      >
        <Download size={15} /> Install app
      </button>
      {showIosHint && (
        <p className="absolute right-4 top-16 z-40 max-w-[16rem] rounded-xl border border-hairline/20 bg-abyss p-3 text-xs text-muted shadow-glass">
          On iPhone: tap the <strong className="text-fg">Share</strong> button, then{" "}
          <strong className="text-fg">Add to Home Screen</strong>.
        </p>
      )}
    </>
  );
}

function SignIn({ onIn }: { onIn: () => void }) {
  const [user, setUser] = useState("");
  const [pw, setPw] = useState("");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user || !pw) return;
    setBusy(true); setErr("");
    try {
      const r = await login(user, pw);
      if (r.ok && r.token) { setToken(r.token, remember); onIn(); }
      else setErr(r.error || "Incorrect username or password.");
    } catch {
      setErr("Could not reach the server. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <Screen>
      <div className="glass w-full max-w-sm rounded-3xl p-8">
        <BrandMark className="text-2xl" />
        <h1 className="mt-4 font-display text-2xl font-bold text-fg">Sign in</h1>
        <p className="mt-1 text-sm text-muted">Your cockpit — leads, live chat and controls.</p>

        <label className="mt-5 block">
          <span className="mb-1.5 block text-sm font-semibold text-muted">Mobile number</span>
          <input className={inputClass} value={user} placeholder="10-digit mobile" inputMode="numeric"
            autoComplete="username" onChange={(e) => setUser(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()} autoFocus />
        </label>
        <label className="mt-3 block">
          <span className="mb-1.5 block text-sm font-semibold text-muted">Password</span>
          <input type="password" className={inputClass} value={pw} placeholder="Your password"
            autoComplete="current-password" onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()} />
        </label>

        <label className="mt-3 flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Keep me signed in
        </label>
        {err && <p role="alert" className="mt-2 text-sm text-danger">{err}</p>}
        <Button full className="mt-5" onClick={submit} disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        <p className="mt-4 text-xs leading-relaxed text-faint">
          Forgot your password? A new setup link can be generated from the server — see DEPLOY_VM.md.
        </p>
      </div>
    </Screen>
  );
}

/**
 * Route "/admin/setup?token=…" — first-time (or reset) password choice.
 * The link is single-use and expires after 24h; using it signs you straight in.
 */
export function AdminSetup() {
  const [status, setStatus] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const token = new URLSearchParams(window.location.search).get("token") || "";

  useEffect(() => {
    checkSetupToken(token).then((r) => {
      setUsername(r.username);
      setStatus(r.valid ? "ready" : "invalid");
    });
  }, [token]);

  const submit = async () => {
    setErr("");
    if (pw.length < 8) return setErr("Please use at least 8 characters.");
    if (pw !== pw2) return setErr("The two passwords do not match.");
    setBusy(true);
    const r = await setPasswordWithToken(token, pw);
    setBusy(false);
    if (r.ok && r.token) {
      setToken(r.token, true);
      setStatus("done");
      setTimeout(() => { window.location.href = "/admin"; }, 900);
    } else {
      setErr(r.error || "Could not set the password.");
    }
  };

  if (status === "checking") return <Screen><p className="text-muted">Checking your link…</p></Screen>;

  if (status === "invalid") {
    return (
      <Screen>
        <div className="glass w-full max-w-sm rounded-3xl p-8 text-center">
          <BrandMark className="mx-auto text-2xl" />
          <h1 className="mt-4 font-display text-xl font-bold text-fg">This link is no longer valid</h1>
          <p className="mt-2 text-sm text-muted">
            Setup links can only be used once and expire after 24 hours. Generate a new one from the
            server, then open it again.
          </p>
        </div>
      </Screen>
    );
  }

  if (status === "done") {
    return (
      <Screen>
        <div className="glass w-full max-w-sm rounded-3xl p-8 text-center">
          <ShieldCheck size={40} className="mx-auto text-success" />
          <h1 className="mt-4 font-display text-xl font-bold text-fg">Password set</h1>
          <p className="mt-2 text-sm text-muted">Signing you in…</p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="glass w-full max-w-sm rounded-3xl p-8">
        <BrandMark className="text-2xl" />
        <h1 className="mt-4 font-display text-2xl font-bold text-fg">Choose your password</h1>
        <p className="mt-1 text-sm text-muted">
          You'll sign in with <span className="font-mono text-brand-luq">{username || "your mobile number"}</span> and
          this password from now on.
        </p>

        <label className="mt-5 block">
          <span className="mb-1.5 block text-sm font-semibold text-muted">New password</span>
          <input type="password" className={inputClass} value={pw} autoComplete="new-password"
            placeholder="At least 8 characters" onChange={(e) => setPw(e.target.value)} autoFocus />
        </label>
        <label className="mt-3 block">
          <span className="mb-1.5 block text-sm font-semibold text-muted">Confirm password</span>
          <input type="password" className={inputClass} value={pw2} autoComplete="new-password"
            placeholder="Type it again" onChange={(e) => setPw2(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()} />
        </label>

        {err && <p role="alert" className="mt-2 text-sm text-danger">{err}</p>}
        <Button full className="mt-5" onClick={submit} disabled={busy}>
          {busy ? "Saving…" : "Set password & sign in"}
        </Button>
        <p className="mt-4 text-xs leading-relaxed text-faint">
          This link works once. Setting a password signs out any other device.
        </p>
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

function Detail({ label, value }: { label: string; value: unknown }) {
  const v = String(value ?? "").trim();
  if (!v || v === "null") return null;
  return (
    <p className="text-sm">
      <span className="text-faint">{label}: </span>
      <span className="text-fg">{v}</span>
    </p>
  );
}

/** cross_sell is stored as a JSON array string; show it readably or not at all. */
function safeList(raw: unknown): string {
  try {
    const a = JSON.parse(String(raw ?? "[]"));
    return Array.isArray(a) && a.length ? a.join(", ") : "";
  } catch {
    return "";
  }
}

function Leads() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

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
              {["", "When", "Name", "Phone", "Source", "Status", ""].map((h, i) => <th key={i} className="p-3 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <Fragment key={l.id}>
                <tr className="border-b border-hairline/8 align-middle">
                  <td className="p-3">
                    <button type="button" onClick={() => setOpenId(openId === l.id ? null : l.id)}
                      aria-label={openId === l.id ? "Collapse" : "Expand"} aria-expanded={openId === l.id}
                      className="text-faint hover:text-fg">
                      <ChevronDown size={16} className={`transition-transform ${openId === l.id ? "rotate-180" : ""}`} />
                    </button>
                  </td>
                  <td className="p-3 text-muted">{String(l.created_at).slice(0, 16)}</td>
                  <td className="p-3 font-semibold text-fg">{l.name}</td>
                  <td className="p-3"><a className="text-brand-luq" href={`https://wa.me/91${l.phone}`} target="_blank" rel="noreferrer">+91 {l.phone}</a></td>
                  <td className="p-3 text-muted">{l.source || "—"}</td>
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
                {openId === l.id && (
                  <tr className="border-b border-hairline/8 bg-panel/30">
                    <td colSpan={7} className="p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Detail label="Email" value={l.email} />
                        <Detail label="Worker" value={l.role} />
                        <Detail label="Industry" value={l.industry} />
                        <Detail label="Landed on" value={l.landing} />
                        <Detail label="Referred by" value={l.ref_code} />
                        <Detail label="Wants training" value={l.wants_training ? "Yes" : "No"} />
                        <Detail label="Also wants" value={safeList(l.cross_sell)} />
                      </div>
                      {/* Chat transcripts and build enquiries land here — this is
                          the most useful field on the record and it was previously
                          not shown anywhere in the admin at all. */}
                      <LeadCommission lead={l} onDone={load} />

                      {l.message && (
                        <div className="mt-3">
                          <p className="mb-1 font-mono text-xs uppercase tracking-wider text-faint">Message / conversation</p>
                          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-hairline/15 bg-ink/40 p-3 text-sm text-fg">{l.message}</pre>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted">No leads.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Horizontal bar list — enough to read a distribution at a glance, no chart lib. */
function BarList({ title, rows }: { title: string; rows: { k: string; sessions: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.sessions));
  return (
    <div className="glass rounded-2xl p-5">
      <p className="mb-3 font-mono text-xs uppercase tracking-wider text-faint">{title}</p>
      {rows.length === 0 && <p className="text-sm text-muted">No data yet.</p>}
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.k} className="relative overflow-hidden rounded-lg bg-panel/40">
            <div
              className="absolute inset-y-0 left-0 bg-teal-glow/20"
              style={{ width: `${(r.sessions / max) * 100}%` }}
              aria-hidden="true"
            />
            <div className="relative flex items-center justify-between gap-3 px-3 py-2">
              <span className="truncate text-sm text-fg">{r.k}</span>
              <span className="shrink-0 font-mono text-sm font-semibold text-brand-luq">
                {r.sessions}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Visitors() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => {
    adminGet("/api/admin/visitors").then(setD).catch(() => setErr("Failed to load"));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (err) return <p className="text-danger">{err}</p>;
  if (!d) return <p className="text-muted">Loading…</p>;

  const f = d.funnel || {};
  const rate = f.sessions ? ((f.leads / f.sessions) * 100).toFixed(1) : "0.0";
  const maxDay = Math.max(1, ...(d.daily || []).map((x: any) => x.sessions));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Cookie-free, first-party. No IP or personal data is stored.
        </p>
        <Button variant="secondary" size="md" onClick={load}><RefreshCw size={16} /></Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card label="Sessions (all time)" value={d.totals.sessions} accent />
        <Card label="Sessions today" value={d.totals.todaySessions} />
        <Card label="Sessions this week" value={d.totals.weekSessions} />
        <Card label="Pageviews" value={d.totals.views} />
      </div>

      {/* The number to actually run the business on. */}
      <div className="glass rounded-2xl p-5">
        <p className="mb-3 font-mono text-xs uppercase tracking-wider text-faint">Funnel</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div><p className="text-sm text-muted">Visited</p><p className="font-display text-2xl font-bold text-fg">{f.sessions}</p></div>
          <div><p className="text-sm text-muted">Saw /build</p><p className="font-display text-2xl font-bold text-fg">{f.buildSessions}</p></div>
          <div><p className="text-sm text-muted">Became leads</p><p className="font-display text-2xl font-bold text-fg">{f.leads}</p></div>
          <div><p className="text-sm text-muted">Visit → lead</p><p className="font-display text-2xl font-bold text-brand-luq">{rate}%</p></div>
        </div>
      </div>

      {/* Last 14 days */}
      <div className="glass rounded-2xl p-5">
        <p className="mb-3 font-mono text-xs uppercase tracking-wider text-faint">Sessions · last 14 days</p>
        {(d.daily || []).length === 0 ? (
          <p className="text-sm text-muted">No data yet.</p>
        ) : (
          <div className="flex h-32 items-end gap-1.5">
            {d.daily.map((x: any) => (
              <div key={x.k} className="flex flex-1 flex-col items-center gap-1" title={`${x.k}: ${x.sessions}`}>
                <div className="w-full rounded-t bg-teal-glow/40" style={{ height: `${(x.sessions / maxDay) * 100}%`, minHeight: 2 }} />
                <span className="text-[10px] text-faint">{String(x.k).slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BarList title="Top pages" rows={d.pages || []} />
        <BarList title="Sources" rows={d.sources || []} />
        <BarList title="Devices" rows={d.devices || []} />
      </div>
    </div>
  );
}

/**
 * Live chat inbox. Polls every 5s so a waiting visitor surfaces without a
 * refresh — the WhatsApp alert is the primary notification, this is where the
 * conversation actually happens.
 */
function LiveChat() {
  const [chats, setChats] = useState<any[]>([]);
  const [waiting, setWaiting] = useState(0);
  const [openChat, setOpenChat] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    const d = await adminGet("/api/admin/chats");
    setChats(d.chats || []);
    setWaiting(d.waiting || 0);
  }, []);

  const loadOne = useCallback(async (id: string) => {
    const d = await adminGet(`/api/admin/chats?id=${encodeURIComponent(id)}`);
    setMsgs(d.messages || []);
  }, []);

  useEffect(() => {
    loadList();
    const iv = setInterval(() => {
      loadList();
      if (openChat) loadOne(openChat);
    }, 5000);
    return () => clearInterval(iv);
  }, [loadList, loadOne, openChat]);

  const send = async () => {
    if (!openChat || !reply.trim()) return;
    setBusy(true);
    await adminPost("/api/admin/chats", { id: openChat, text: reply.trim() });
    setReply("");
    setBusy(false);
    loadOne(openChat);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {waiting > 0
            ? <span className="font-semibold text-warn">{waiting} visitor{waiting === 1 ? "" : "s"} waiting for you</span>
            : "No one waiting right now."}
        </p>
        <Button variant="secondary" size="md" onClick={loadList}><RefreshCw size={16} /></Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="space-y-2">
          {chats.length === 0 && <p className="text-sm text-muted">No conversations yet.</p>}
          {chats.map((c) => (
            <button key={c.id} type="button" onClick={() => { setOpenChat(c.id); loadOne(c.id); }}
              className={`block w-full rounded-2xl p-3 text-left transition-colors ${openChat === c.id ? "bg-teal-glow/15 ring-1 ring-teal-glow/40" : "glass"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                  {c.needs_human ? <Radio size={13} className="animate-pulse text-warn" /> : null}
                  {c.visitor_name || c.page || "Visitor"}
                </span>
                {c.unread_for_agent > 0 && (
                  <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white">{c.unread_for_agent}</span>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-muted">{c.last_message || "—"}</p>
              <p className="mt-1 text-[11px] text-faint">{String(c.last_at || "").slice(0, 16)}</p>
            </button>
          ))}
        </div>

        <div className="glass flex min-h-[420px] flex-col rounded-2xl p-4">
          {!openChat && <p className="m-auto text-sm text-muted">Pick a conversation.</p>}
          {openChat && (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto">
                {msgs.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "visitor" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === "visitor" ? "bg-panel/60 text-fg"
                      : m.role === "agent" ? "bg-teal-glow/25 text-fg"
                      : "border border-hairline/15 text-muted"}`}>
                      <span className="mb-0.5 block text-[10px] uppercase tracking-wider text-faint">
                        {m.role === "visitor" ? "Visitor" : m.role === "agent" ? "You" : "Guide"}
                      </span>
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2 border-t border-hairline/10 pt-3">
                <input className={inputClass} value={reply} placeholder="Type your reply…"
                  onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
                <Button size="md" onClick={send} disabled={busy || !reply.trim()}><Send size={16} /></Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Prices, lead times and promotional offers — live, no deploy needed. */
function Pricing() {
  const [rows, setRows] = useState<any[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState("");

  const load = useCallback(async () => {
    const d = await adminGet("/api/admin/pricing");
    setRows(d.pricing || []); setLabels(d.labels || {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (i: number, k: string, v: any) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, [k]: v } : row)));

  const save = async () => {
    setSaved("");
    const d = await adminPost("/api/admin/pricing", { rows });
    setSaved(d.ok ? "Saved ✅ — live on the site and in the bot immediately" : "Failed");
    load();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        These drive the homepage price list <em>and</em> the prices the guide quotes in chat. Changes are live immediately — no deploy.
      </p>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={r.id} className="glass rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display text-base font-bold text-fg">{labels[r.id] || r.id}</p>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={r.enabled !== 0 && r.enabled !== false}
                  onChange={(e) => set(i, "enabled", e.target.checked)} /> Show on site
              </label>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-1 block text-xs text-faint">Price (₹)</span>
                <input className={inputClass} type="number" value={r.price_inr}
                  onChange={(e) => set(i, "price_inr", Number(e.target.value))} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-faint">Lead time</span>
                <input className={inputClass} value={r.lead_time || ""}
                  onChange={(e) => set(i, "lead_time", e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-faint">Offer label (optional)</span>
                <input className={inputClass} value={r.offer_label || ""} placeholder="e.g. Launch offer"
                  onChange={(e) => set(i, "offer_label", e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-faint">Offer price (₹, optional)</span>
                <input className={inputClass} type="number" value={r.offer_price_inr || ""}
                  onChange={(e) => set(i, "offer_price_inr", e.target.value)} />
              </label>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={save}><ShieldCheck size={16} /> Save pricing</Button>
        {saved && <span className="text-sm text-muted">{saved}</span>}
      </div>
    </div>
  );
}

/** Owner-editable persona instructions appended to the guide's system prompt. */
function BotPanel() {
  const [instr, setInstr] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [announce, setAnnounce] = useState("");
  const [saved, setSaved] = useState("");
  useEffect(() => {
    adminGet("/api/admin/settings").then((d) => {
      setInstr(d.bot_instructions || "");
      setEnabled(d.chat_enabled !== "0");
      setAnnounce(d.announcement || "");
    });
  }, []);
  const save = async () => {
    setSaved("");
    const d = await adminPost("/api/admin/settings", {
      bot_instructions: instr,
      chat_enabled: enabled,
      announcement: announce,
    });
    setSaved(d.ok ? "Saved ✅ — applies to the very next message" : "Failed");
  };
  return (
    <div className="max-w-2xl space-y-5">
      <div className="glass space-y-5 rounded-2xl p-6">
        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-5 w-5" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span className="text-base font-semibold text-fg">Guide is available to visitors</span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-base font-semibold text-fg">Extra instructions for the guide</span>
          <span className="mb-2 block text-sm text-muted">
            Added on top of its built-in selling rules. Use it for things that change often — a push on one service, a
            promotion to mention, a phrase to avoid. Plain sentences work best.
          </span>
          <textarea className={`${inputClass} min-h-[160px]`} value={instr} onChange={(e) => setInstr(e.target.value)}
            placeholder={"e.g. We are pushing WhatsApp automations this month — lead with that when the business handles many customer messages."} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-base font-semibold text-fg">Site announcement (optional)</span>
          <input className={inputClass} value={announce} onChange={(e) => setAnnounce(e.target.value)}
            placeholder="Shown as a banner. Leave blank to hide." />
        </label>
        <div>
          <Button onClick={save}><ShieldCheck size={16} /> Save</Button>
          {saved && <span className="ml-3 text-sm text-muted">{saved}</span>}
        </div>
      </div>
    </div>
  );
}

/**
 * Inbox — email sent to dushyant@goluq.com, mirrored here by the Cloudflare
 * Email Worker. Replying sends AS the domain, so the personal Gmail address is
 * never exposed to the visitor.
 */
function Inbox() {
  const [threads, setThreads] = useState<any[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
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
    if (d.ok) { setReply(""); loadOne(openId); loadList(); }
    else setErr(d.error || "Could not send.");
  };

  return (
    <div className="space-y-4">
      {!canSend && (
        <p className="rounded-2xl border border-warn/30 bg-warn/10 p-4 text-sm text-fg">
          <strong>Receiving only.</strong> Replies are disabled until a sending provider is
          configured — set <code className="font-mono text-brand-luq">MAIL_API_KEY</code> and{" "}
          <code className="font-mono text-brand-luq">MAIL_FROM</code> in the server .env. Until then
          you can read here and reply from Gmail (which would expose your personal address).
        </p>
      )}
      {canSend && from && (
        <p className="text-sm text-muted">Replies are sent as <span className="font-mono text-brand-luq">{from}</span>.</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="space-y-2">
          {threads.length === 0 && <p className="text-sm text-muted">No email yet.</p>}
          {threads.map((t) => (
            <button key={t.id} type="button" onClick={() => { setOpenId(t.id); loadOne(t.id); }}
              className={`block w-full rounded-2xl p-3 text-left ${openId === t.id ? "bg-teal-glow/15 ring-1 ring-teal-glow/40" : "glass"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-fg">{t.counterparty}</span>
                {t.unread > 0 && <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold text-white">new</span>}
              </div>
              <p className="mt-0.5 truncate text-xs font-medium text-muted">{t.subject}</p>
              <p className="mt-1 truncate text-[11px] text-faint">{t.preview}</p>
            </button>
          ))}
        </div>

        <div className="glass flex min-h-[420px] flex-col rounded-2xl p-4">
          {!openId && <p className="m-auto text-sm text-muted">Pick a conversation.</p>}
          {openId && (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto">
                {msgs.map((m) => (
                  <div key={m.id} className={`rounded-2xl p-3 ${m.direction === "in" ? "bg-panel/60" : "bg-teal-glow/15"}`}>
                    <p className="mb-1 flex flex-wrap items-center gap-2 text-[11px] text-faint">
                      <span className="font-semibold uppercase tracking-wider">
                        {m.direction === "in" ? "Received" : "Sent"}
                      </span>
                      <span>{String(m.created_at).slice(0, 16)}</span>
                    </p>
                    <p className="text-sm font-semibold text-fg">{m.subject}</p>
                    <pre className="mt-1.5 whitespace-pre-wrap font-sans text-sm text-muted">{m.body}</pre>
                  </div>
                ))}
              </div>
              {err && <p className="mt-2 text-sm text-danger">{err}</p>}
              <div className="mt-3 space-y-2 border-t border-hairline/10 pt-3">
                <textarea className={`${inputClass} min-h-[90px]`} value={reply} disabled={!canSend}
                  placeholder={canSend ? "Type your reply…" : "Sending not configured"}
                  onChange={(e) => setReply(e.target.value)} />
                <div className="flex gap-2">
                  <Button size="md" onClick={send} disabled={busy || !canSend || !reply.trim()}>
                    <Send size={16} /> {busy ? "Sending…" : "Send reply"}
                  </Button>
                  <Button size="md" variant="secondary"
                    onClick={async () => { await adminPost("/api/admin/emails", { id: openId, action: "archive" }); setOpenId(null); loadList(); }}>
                    Archive
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Content — owner-editable site copy.
 *
 * Each field shows the shipped default as its placeholder, so leaving a box
 * empty means "use the default". That makes reverting obvious: clear the box
 * and save. Only the curated list in content/editableCopy.ts is exposed.
 */
function Content() {
  const { t, i18n } = useTranslation();
  const [vals, setVals] = useState<Record<string, { en: string; hi: string }>>({});
  const [saved, setSaved] = useState("");
  const [openGroup, setOpenGroup] = useState<string>(EDITABLE_COPY[0]?.id ?? "");

  const load = useCallback(async () => {
    const d = await adminGet("/api/admin/content");
    const next: Record<string, { en: string; hi: string }> = {};
    for (const r of d.overrides || []) next[r.key] = { en: r.val_en || "", hi: r.val_hi || "" };
    setVals(next);
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (key: string, lng: "en" | "hi", v: string) =>
    setVals((s) => ({ ...s, [key]: { en: s[key]?.en ?? "", hi: s[key]?.hi ?? "", [lng]: v } }));

  const save = async () => {
    setSaved("");
    const rows = EDITABLE_KEYS.map((key) => ({
      key,
      en: vals[key]?.en ?? "",
      hi: vals[key]?.hi ?? "",
    }));
    const d = await adminPost("/api/admin/content", { rows });
    setSaved(d.ok ? "Saved ✅ — live on the site now (reload to see it)" : "Failed");
    load();
  };

  /** The shipped default, read straight from the bundled translations. */
  const def = (key: string, lng: "en" | "hi") =>
    i18n.getFixedT(lng)(key, { defaultValue: "" }) as string;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Change the words on the site without a deploy. Leave a box <strong>empty</strong> to use the
        built-in default (shown greyed out inside it).
      </p>

      {EDITABLE_COPY.map((g) => {
        const open = openGroup === g.id;
        return (
          <div key={g.id} className="glass rounded-2xl">
            <button type="button" onClick={() => setOpenGroup(open ? "" : g.id)}
              className="flex w-full items-center justify-between gap-3 p-5 text-left">
              <span>
                <span className="block font-display text-base font-bold text-fg">{g.title}</span>
                <span className="mt-0.5 block text-sm text-muted">{g.blurb}</span>
              </span>
              <ChevronDown size={18} className={`shrink-0 text-brand-luq transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
              <div className="space-y-5 border-t border-hairline/10 p-5">
                {g.fields.map((f) => (
                  <div key={f.key}>
                    <p className="text-sm font-semibold text-fg">{f.label}</p>
                    {f.hint && <p className="mt-0.5 text-xs text-faint">{f.hint}</p>}
                    <div className="mt-2 grid gap-2 lg:grid-cols-2">
                      {(["en", "hi"] as const).map((lng) => (
                        <label key={lng} className="block">
                          <span className="mb-1 block text-[11px] uppercase tracking-wider text-faint">
                            {lng === "en" ? "English" : "हिन्दी"}
                          </span>
                          {f.multiline ? (
                            <textarea className={`${inputClass} min-h-[80px]`} value={vals[f.key]?.[lng] ?? ""}
                              placeholder={def(f.key, lng)} onChange={(e) => set(f.key, lng, e.target.value)} />
                          ) : (
                            <input className={inputClass} value={vals[f.key]?.[lng] ?? ""}
                              placeholder={def(f.key, lng)} onChange={(e) => set(f.key, lng, e.target.value)} />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="sticky bottom-4 flex items-center gap-3 rounded-2xl bg-abyss/90 p-3 backdrop-blur-xl">
        <Button onClick={save}><ShieldCheck size={16} /> Save content</Button>
        {saved && <span className="text-sm text-muted">{saved}</span>}
        <span className="ml-auto text-xs text-faint">{t("about.navTitle")}</span>
      </div>
    </div>
  );
}

/**
 * Turns a lead into a paying customer and records each month's payment.
 *
 * This is the step that was missing entirely: `commissions` had no writer, so
 * every partner dashboard showed ₹0 forever no matter how many businesses they
 * brought in. Accrual is one month per recorded payment — never forward-booked,
 * because money that hasn't been collected isn't owed to anyone.
 */
function LeadCommission({ lead, onDone }: { lead: any; onDone: () => void }) {
  const [price, setPrice] = useState(String(lead.plan_price_inr || ""));
  const [planId, setPlanId] = useState(lead.plan_id || "");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const call = async (body: any) => {
    setBusy(true); setMsg("");
    const d = await adminPost("/api/admin/commission", body);
    setBusy(false);
    setMsg(d.ok ? (d.amount !== undefined ? `Recorded ₹${d.amount} at ${Math.round(d.rate * 100)}%` : "Saved ✅") : d.error || "Failed");
    if (d.ok) onDone();
  };

  if (!lead.ref_code) {
    return <p className="text-xs text-faint">Not referred by a partner — no commission applies.</p>;
  }

  return (
    <div className="mt-3 rounded-xl border border-teal-glow/25 bg-teal-glow/[0.05] p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-luq">
        Partner {lead.ref_code}
        {lead.converted_at ? ` · customer since ${String(lead.converted_at).slice(0, 10)}` : ""}
      </p>

      {!lead.converted_at ? (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] text-faint">Plan</span>
            <select className={`${inputClass} w-auto`} value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="">—</option>
              {PLANS.map((p) => <option key={p.id} value={p.id}>{p.id} · ₹{p.priceInr}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-faint">Monthly ₹</span>
            <input className={`${inputClass} w-28`} type="number" value={price}
              onChange={(e) => setPrice(e.target.value)} />
          </label>
          <Button size="md" disabled={busy || !price}
            onClick={() => call({ action: "convert", leadId: lead.id, planId, planPriceInr: Number(price) })}>
            Mark as customer
          </Button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] text-faint">Payment received for</span>
            <input className={`${inputClass} w-36`} type="month" value={period}
              onChange={(e) => setPeriod(e.target.value)} />
          </label>
          <Button size="md" disabled={busy}
            onClick={() => call({ action: "accrue", leadId: lead.id, period })}>
            Record payment
          </Button>
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}
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
  const [busy, setBusy] = useState(false);
  const [to, setTo] = useState(""); const [text, setText] = useState("Test from GoLuQ ✅"); const [sent, setSent] = useState("");
  const connected = state === "open";

  const refresh = useCallback(async () => {
    const d = await adminGet("/api/admin/wa-status");
    setState(d.configured ? d.state : "not configured");
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const connect = async () => {
    setBusy(true); setQr(null);
    const d = await adminPost("/api/admin/wa-connect", {});
    setBusy(false);
    if (d.ok) {
      setState(d.state || "connecting");
      if (d.state !== "open") setQr(d.qr || null);
      const iv = setInterval(async () => {
        const s = await adminGet("/api/admin/wa-status");
        setState(s.state);
        if (s.state === "open") { setQr(null); clearInterval(iv); }
      }, 3000);
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
            <p className="mt-1 text-sm">State: <span className={connected ? "text-success" : "text-warn"}>{connected ? "connected ✅" : state}</span></p></div>
          <Button variant={connected ? "secondary" : "ghost"} onClick={connect} disabled={busy}>{busy ? "Connecting…" : connected ? "Reconnect" : "Connect WhatsApp"}</Button>
        </div>
        {connected && !qr && (
          <p className="mt-4 rounded-xl bg-success/10 px-4 py-3 text-sm text-success">Your WhatsApp number is linked. New leads will trigger alerts + auto-replies (once an owner number is set in Settings).</p>
        )}
        {!connected && qr && <div className="mt-5 flex flex-col items-center gap-2">
          <img src={qr} alt="WhatsApp QR" className="h-56 w-56 rounded-xl bg-white p-2" />
          <p className="text-sm text-muted">Scan with the GoLuQ number → WhatsApp → Linked devices.</p></div>}
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
  const [ownerEmail, setOwnerEmail] = useState("");
  const [followups, setFollowups] = useState(true);
  const [saved, setSaved] = useState("");
  // Saving before the current values have loaded would post empty strings and
  // wipe them — which is exactly how the public WhatsApp number got blanked and
  // silently disappeared from the site. Save stays disabled until loaded.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    adminGet("/api/admin/settings").then((d) => {
      setOwner(d.owner_whatsapp || "");
      setPublicWa(d.public_whatsapp || "");
      setOwnerEmail(d.owner_email || "");
      setFollowups(d.followups_enabled !== "0");
      setLoaded(true);
    });
  }, []);

  const save = async () => {
    if (!loaded) return;
    setSaved("");
    const d = await adminPost("/api/admin/settings", { owner_whatsapp: owner, owner_email: ownerEmail, public_whatsapp: publicWa, followups_enabled: followups });
    setSaved(d.ok ? "Saved ✅" : "Failed");
  };
  return (
    <div className="max-w-lg space-y-5">
      <div className="glass space-y-5 rounded-2xl p-6">
        <label className="block">
          <span className="mb-1.5 block text-base font-semibold text-fg">Alert email (private)</span>
          <span className="mb-2 block text-sm text-muted">
            Every new lead and every "talk to a human" request is emailed here within seconds.
            This is the alert channel that works today — WhatsApp alerts stay silent until the
            number is linked. Never shown on the site.
          </span>
          <input className={inputClass} type="email" value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)} placeholder="you@example.com" />
        </label>
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
        <div><Button onClick={save} disabled={!loaded}><ShieldCheck size={16} /> Save settings</Button>
        {!loaded && <span className="ml-3 text-sm text-faint">Loading current values…</span>}
        {saved && <span className="ml-3 text-sm text-muted">{saved}</span>}</div>
      </div>

      <AffiliateRates />
    </div>
  );
}

/**
 * Partner commission terms. Changing a rate never rewrites history — every
 * commission row snapshots the rate it was accrued at — so this only affects
 * money earned from here on.
 */
function AffiliateRates() {
  const [r, setR] = useState({ year1: 25, lifetime: 12, minPayoutInr: 500, attributionDays: 90 });
  const [saved, setSaved] = useState("");

  useEffect(() => {
    fetch("/api/config").then((x) => x.json()).then((d) => {
      if (d?.affiliate) {
        setR({
          year1: Math.round(d.affiliate.year1 * 100),
          lifetime: Math.round(d.affiliate.lifetime * 100),
          minPayoutInr: d.affiliate.minPayoutInr,
          attributionDays: d.affiliate.attributionDays,
        });
      }
    }).catch(() => {});
  }, []);

  const save = async () => {
    setSaved("");
    const d = await adminPost("/api/admin/settings", {
      aff_rate_year1: r.year1 / 100,
      aff_rate_lifetime: r.lifetime / 100,
      aff_min_payout: r.minPayoutInr,
      aff_attribution_days: r.attributionDays,
    });
    setSaved(d.ok ? "Saved ✅ — live on the site and the earnings calculator" : "Failed");
  };

  const F = (label: string, key: keyof typeof r, suffix: string) => (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-fg">{label}</span>
      <div className="flex items-center gap-2">
        <input className={`${inputClass} w-28`} type="number" value={r[key]}
          onChange={(e) => setR({ ...r, [key]: Number(e.target.value) })} />
        <span className="text-sm text-muted">{suffix}</span>
      </div>
    </label>
  );

  return (
    <div className="glass space-y-5 rounded-2xl p-6">
      <div>
        <h2 className="font-display text-lg font-bold text-fg">Partner commission</h2>
        <p className="mt-1 text-sm text-muted">
          Drives the partner page, the earnings calculator and every future accrual.
          Existing commission rows keep the rate they were created at.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {F("First year", "year1", "% per month")}
        {F("After year one", "lifetime", "% per month")}
        {F("Minimum payout", "minPayoutInr", "₹")}
        {F("Attribution window", "attributionDays", "days")}
      </div>
      <div>
        <Button onClick={save}><ShieldCheck size={16} /> Save commission terms</Button>
        {saved && <span className="ml-3 text-sm text-muted">{saved}</span>}
      </div>
    </div>
  );
}
