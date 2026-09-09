import { Fragment, useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard, Users, TrendingUp, MessageSquare, Settings as SettingsIcon,
  LogOut, Download, RefreshCw, ShieldCheck,
  BarChart3, ChevronDown, IndianRupee, Bot, Mail, FileText, Briefcase, Megaphone, Image as ImageIcon, Video,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Projects } from "../components/admin/Projects";
import { Campaigns } from "../components/admin/Campaigns";
import { Marketing } from "../components/admin/Marketing";
import { LiveChat } from "../components/admin/LiveChat";
import { Testimonials as TestimonialsPanel } from "../components/admin/Testimonials";
import { Today } from "../components/admin/Today";
import { Enquiries } from "../components/admin/Enquiries";
import { Partners } from "../components/admin/Partners";
import { EmailInbox } from "../components/admin/EmailInbox";
import { Store } from "../components/admin/Store";
import { BrandMark } from "../components/BrandMark";
import { useTranslation } from "react-i18next";
import { inputClass } from "../lib/ui";
import { EDITABLE_COPY, EDITABLE_KEYS } from "../content/editableCopy";
import {
  getToken, setToken, clearToken, adminGet, adminPost,
  login, logout, setPasswordWithToken, checkSetupToken,
} from "../lib/adminApi";

type Section =
  | "today" | "leads" | "chat" | "visitors" | "pricing"
  | "bot" | "content" | "inbox" | "affiliates" | "projects" | "campaigns" | "marketing" | "testimonials" | "settings" | "store";

export function Admin() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [section, setSection] = useState<Section>("today");
  // A conversation chosen on the Today board opens directly in Conversations.
  const [chatId, setChatId] = useState<string | null>(null);
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

  const group = GROUPS.find((g) => g.sections.some((x) => x.id === section)) ?? GROUPS[0];
  const openChat = (id: string) => { setChatId(id); setSection("chat"); };

  return (
    <div className="cockpit min-h-dvh pb-20 lg:pb-0">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-hairline/10 bg-abyss/80 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3">
          <BrandMark className="text-xl" />
          <span className="truncate text-sm font-semibold text-muted">{SECTION_META[section].title}</span>
        </div>
        <div className="flex items-center gap-2">
          <InstallApp />
          <button type="button" onClick={async () => { await logout(); setAuthed(false); }}
            className="inline-flex items-center gap-2 rounded-full glass px-3 py-2 text-sm font-semibold text-muted hover:text-fg">
            <LogOut size={15} /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl">
        {/* Desktop: a sidebar with the four groups spelled out. */}
        <aside className="sticky top-[57px] hidden h-[calc(100dvh-57px)] w-60 shrink-0 overflow-y-auto border-r border-hairline/10 px-3 py-4 lg:block">
          {GROUPS.map((g) => (
            <div key={g.id} className="mb-4">
              {g.label && <p className="mb-1 px-3 font-mono text-[11px] uppercase tracking-wider text-faint">{g.label}</p>}
              {g.sections.map((n) => {
                const Icon = n.icon; const on = section === n.id;
                return (
                  <button key={n.id} type="button" onClick={() => setSection(n.id)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors ${on ? "bg-teal-glow/15 text-brand-luq" : "text-muted hover:bg-panel/40 hover:text-fg"}`}>
                    <Icon size={16} /> <span className="flex-1">{n.label}</span>
                    {n.id === "chat" && waiting > 0 && <Badge n={waiting} />}
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        <div className="min-w-0 flex-1">
          {/* Phone: the sections of the current group as chips under the header. */}
          {group.sections.length > 1 && (
            <nav className="sticky top-[57px] z-20 flex gap-1 overflow-x-auto border-b border-hairline/10 bg-abyss/70 px-3 py-2 backdrop-blur-xl lg:hidden">
              {group.sections.map((n) => {
                const Icon = n.icon; const on = section === n.id;
                return (
                  <button key={n.id} type="button" onClick={() => setSection(n.id)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${on ? "bg-teal-glow/20 text-brand-luq" : "text-muted hover:text-fg"}`}>
                    <Icon size={15} /> {n.label}
                    {n.id === "chat" && waiting > 0 && <Badge n={waiting} />}
                  </button>
                );
              })}
            </nav>
          )}

          <main className="mx-auto max-w-5xl overflow-x-hidden px-4 py-5 sm:px-6">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-bold text-fg">
                  {section === "today"
                    ? new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })
                    : SECTION_META[section].title}
                </h1>
                <p className="mt-0.5 text-sm text-muted">{SECTION_META[section].desc}</p>
              </div>
            </div>
            {section === "today" && <Today onOpenChat={openChat} onOpenLeads={() => setSection("leads")} />}
            {section === "leads" && <Enquiries />}
            {section === "chat" && <LiveChat initialId={chatId} />}
            {section === "inbox" && <EmailInbox />}
            {section === "visitors" && <Visitors />}
            {section === "pricing" && <Pricing />}
            {section === "content" && <Content />}
            {section === "bot" && <BotPanel />}
            {section === "affiliates" && <Partners />}
            {section === "projects" && <Projects />}
            {section === "campaigns" && <Campaigns />}
            {section === "marketing" && <Marketing />}
            {section === "store" && <Store />}
            {section === "testimonials" && <TestimonialsPanel />}
            {section === "settings" && <SettingsPanel />}
          </main>
        </div>
      </div>

      {/* Phone: five thumbs-reach destinations. Tapping a group opens its first section. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-hairline/10 bg-abyss/90 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {GROUPS.map((g) => {
          const Icon = g.icon; const on = group.id === g.id;
          const badge = g.id === "inbox" ? waiting : 0;
          return (
            <button key={g.id} type="button" onClick={() => setSection(g.sections[0].id)}
              className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${on ? "text-brand-luq" : "text-muted"}`}>
              <Icon size={20} />
              {g.label || "Today"}
              {badge > 0 && <span className="absolute right-1/4 top-1.5"><Badge n={badge} /></span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/** One line each: what the screen is for. Shown under the title on every screen. */
const SECTION_META: Record<Section, { title: string; desc: string }> = {
  today: { title: "Today", desc: "Who is waiting, what came in, what is due." },
  chat: { title: "Conversations", desc: "WhatsApp and website chats, together. Reply here or from Telegram." },
  leads: { title: "Enquiries", desc: "Everyone who left a number. WhatsApp, call, and mark where it stands." },
  inbox: { title: "Email", desc: "Mail to the business address, answered as the domain." },
  pricing: { title: "Pricing & offers", desc: "One list drives the site, the guide and WhatsApp. Live on save." },
  store: { title: "Store", desc: "Products behind your WhatsApp catalog. Photograph, price, sync." },
  campaigns: { title: "Campaigns", desc: "Approved templates to people who gave you their number." },
  testimonials: { title: "Testimonials", desc: "Real customers, in their words. Nothing shows until you switch it live." },
  marketing: { title: "Marketing", desc: "Social cards from a prompt." },
  visitors: { title: "Visitors", desc: "Where people come from and which channel turns into enquiries." },
  projects: { title: "Projects", desc: "Each customer's build, its stage, and the money on it." },
  affiliates: { title: "Partners", desc: "Who brings customers, what they are owed, and the terms." },
  settings: { title: "Settings", desc: "Alerts, booking link, WhatsApp Business API and Telegram." },
  bot: { title: "Guide", desc: "The assistant that answers on the site and on WhatsApp." },
  content: { title: "Content", desc: "Site copy you can change without a deploy." },
};

function Badge({ n }: { n: number }) {
  return <span className="rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{n}</span>;
}

/**
 * Fourteen tabs in a row was a list of tables. Four groups is how the owner
 * thinks about the day: who is talking to me, what am I selling, what am I
 * delivering, and how is it set up.
 */
const GROUPS: { id: string; label: string; icon: typeof Users; sections: { id: Section; label: string; icon: typeof Users }[] }[] = [
  { id: "today", label: "", icon: LayoutDashboard, sections: [{ id: "today", label: "Today", icon: LayoutDashboard }] },
  { id: "inbox", label: "Inbox", icon: MessageSquare, sections: [
    { id: "chat", label: "Conversations", icon: MessageSquare },
    { id: "leads", label: "Enquiries", icon: Users },
    { id: "inbox", label: "Email", icon: Mail },
  ] },
  { id: "sell", label: "Sell", icon: Megaphone, sections: [
    { id: "store", label: "Store", icon: ImageIcon },
    { id: "pricing", label: "Pricing & offers", icon: IndianRupee },
    { id: "campaigns", label: "Campaigns", icon: Megaphone },
    { id: "testimonials", label: "Testimonials", icon: Video },
    { id: "marketing", label: "Marketing", icon: ImageIcon },
    { id: "visitors", label: "Visitors", icon: BarChart3 },
  ] },
  { id: "deliver", label: "Deliver", icon: Briefcase, sections: [
    { id: "projects", label: "Projects", icon: Briefcase },
    { id: "affiliates", label: "Partners", icon: TrendingUp },
  ] },
  { id: "setup", label: "Setup", icon: SettingsIcon, sections: [
    { id: "settings", label: "Settings", icon: SettingsIcon },
    { id: "bot", label: "Guide", icon: Bot },
    { id: "content", label: "Content", icon: FileText },
  ] },
];

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
        <BarList title="Enquiries by source" rows={d.leadSources || []} />
        <BarList title="Visitors by country · 30 days" rows={d.countries || []} />
        <BarList title="Visit sources" rows={d.sources || []} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <BarList title="Top pages" rows={d.pages || []} />
        <BarList title="Devices" rows={d.devices || []} />
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
    const order: Record<string, number> = { product: 0, comms: 1, build: 2 };
    const rows = [...(d.pricing || [])].sort((a: any, b: any) =>
      (order[a.category] ?? 9) - (order[b.category] ?? 9) || (a.sort_order ?? 0) - (b.sort_order ?? 0));
    setRows(rows); setLabels(d.labels || {});
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
      <div className="space-y-3">
        {rows.map((r, i) => (
          <Fragment key={r.id}>
          {(i === 0 || rows[i - 1].category !== r.category) && (
            <p className="pt-3 font-mono text-xs uppercase tracking-wider text-faint">
              {({ product: "Products — the two complete systems", comms: "Communication services", build: "Software builds" } as Record<string, string>)[r.category] || r.category || "Other"}
            </p>
          )}
          <div className="glass rounded-2xl p-4">
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
              <label className="block">
                <span className="mb-1 block text-xs text-faint">International price (US$, optional)</span>
                <input className={inputClass} type="number" value={r.price_intl_usd || ""} placeholder="blank = derive from ₹"
                  onChange={(e) => set(i, "price_intl_usd", e.target.value)} />
              </label>
            </div>
            {r.price_intl_usd ? (
              <p className="mt-2 text-xs text-faint">
                Abroad this is priced from US${r.price_intl_usd} and converted to the visitor's currency; the ₹ figure applies in India only.
              </p>
            ) : null}
          </div>
          </Fragment>
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
function SettingsPanel() {
  const [owner, setOwner] = useState("");
  const [publicWa, setPublicWa] = useState("");
  const [publicTg, setPublicTg] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [bookingSecret, setBookingSecret] = useState("");
  const [followups, setFollowups] = useState(true);
  const [saved, setSaved] = useState("");
  const [tab, setTab] = useState<"general" | "telegram" | "wa">("general");
  // Saving before the current values have loaded would post empty strings and
  // wipe them — which is exactly how the public WhatsApp number got blanked and
  // silently disappeared from the site. Save stays disabled until loaded.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    adminGet("/api/admin/settings").then((d) => {
      setOwner(d.owner_whatsapp || "");
      setPublicWa(d.public_whatsapp || "");
      setPublicTg(d.public_telegram || "");
      setOwnerEmail(d.owner_email || "");
      setBookingUrl(d.booking_url || "");
      setBookingSecret(d.booking_secret || "");
      setFollowups(d.followups_enabled !== "0");
      setLoaded(true);
    });
  }, []);

  const save = async () => {
    if (!loaded) return;
    setSaved("");
    const d = await adminPost("/api/admin/settings", { owner_whatsapp: owner, owner_email: ownerEmail, public_whatsapp: publicWa, public_telegram: publicTg, booking_url: bookingUrl, followups_enabled: followups });
    setSaved(d.ok ? "Saved ✅" : "Failed");
  };
  const TABS = [["general", "Contact & alerts"], ["telegram", "Telegram"], ["wa", "WhatsApp Business API"]] as const;
  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${tab === id ? "bg-teal-glow/20 text-brand-luq ring-1 ring-teal-glow/40" : "glass text-muted hover:text-fg"}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === "general" && (
      <div className="glass space-y-5 rounded-2xl p-5">
        <label className="block">
          <span className="mb-1.5 block text-base font-semibold text-fg">Alert email (private)</span>
          <span className="mb-2 block text-sm text-muted">
            Every new enquiry and every "talk to a person" request is emailed here — the paper
            trail behind the Telegram alerts. Never shown on the site.
          </span>
          <input className={inputClass} type="email" value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-base font-semibold text-fg">Owner WhatsApp (private)</span>
          <span className="mb-2 block text-sm text-muted">Your own number, for the guide to hand people to. Not shown on the site. 10-digit or 91XXXXXXXXXX.</span>
          <input className={inputClass} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="9198XXXXXXXX" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-base font-semibold text-fg">Public contact WhatsApp (shown on site)</span>
          <span className="mb-2 block text-sm text-muted">Optional. If set, visitors can reach you on WhatsApp from the booking form. Leave blank to hide it.</span>
          <input className={inputClass} value={publicWa} onChange={(e) => setPublicWa(e.target.value)} placeholder="Leave blank to hide" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-base font-semibold text-fg">Public Telegram channel or username</span>
          <span className="mb-2 block text-sm text-muted">
            Shown as a "Message on Telegram" button beside WhatsApp — first in Russia, Iran and the CIS,
            where Telegram is the daily app. Paste the channel link or username. Leave blank to hide.
            (Not the cockpit bot — that one stays private.)
          </span>
          <input className={inputClass} value={publicTg} onChange={(e) => setPublicTg(e.target.value)} placeholder="@goluq or https://t.me/goluq" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-base font-semibold text-fg">Booking link (product pages)</span>
          <span className="mb-2 block text-sm text-muted">
            A Google Calendar appointment page or Calendly link. When set, the WhatsApp Office and
            Store pages lead with "Book a 30-minute call"; until then they lead with WhatsApp. A sale
            that size is made on a call.
          </span>
          <input className={inputClass} type="url" value={bookingUrl}
            onChange={(e) => setBookingUrl(e.target.value)} placeholder="https://calendar.app.google/…" />
        </label>
        <div className="rounded-xl border border-hairline/12 bg-panel/30 p-4">
          <p className="text-base font-semibold text-fg">Calendar bridge</p>
          <p className="mt-1 text-sm text-muted">
            Makes each booking appear on Today, on Telegram, and eligible for WhatsApp reminders. A small
            script in your Google account posts bookings here. Install once: open{" "}
            <span className="font-mono text-brand-luq">docs/booking-bridge/Code.gs</span> from the repo,
            paste it at script.google.com, and set this secret as the SECRET property.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-base px-3 py-2 font-mono text-sm text-fg">{bookingSecret || "…"}</code>
            <button type="button" onClick={() => navigator.clipboard?.writeText(bookingSecret)}
              className="rounded-lg glass px-3 py-2 text-sm font-semibold text-muted hover:text-fg">Copy</button>
          </div>
        </div>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={followups} onChange={(e) => setFollowups(e.target.checked)} className="h-5 w-5" />
          <span className="text-base font-semibold text-fg">Automatic follow-ups (day 3 / 5 / 7 / 12)</span>
        </label>
        <div><Button onClick={save} disabled={!loaded}><ShieldCheck size={16} /> Save settings</Button>
        {!loaded && <span className="ml-3 text-sm text-faint">Loading current values…</span>}
        {saved && <span className="ml-3 text-sm text-muted">{saved}</span>}</div>
      </div>
      )}

      {tab === "wa" && <WhatsAppBusiness />}
      {tab === "telegram" && <TelegramCockpit />}
    </div>
  );
}

/**
 * The cockpit on the owner's phone. One bot, paired to one chat by a short
 * code, so a stranger who finds the bot gets nothing. The token is written
 * here and never read back.
 */
function TelegramCockpit() {
  const [token, setToken] = useState("");
  const [st, setSt] = useState<any>(null);
  const [pair, setPair] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const refresh = useCallback(() => adminGet("/api/admin/tg-check").then(setSt).catch(() => {}), []);
  useEffect(() => { refresh(); }, [refresh]);

  const saveToken = async () => {
    if (!token.trim()) return;
    setBusy(true); setMsg("");
    const d = await adminPost("/api/admin/settings", { tg_bot_token: token.trim() });
    setMsg(d.ok ? "Token saved. Now press Connect." : "Failed to save.");
    setToken("");
    setBusy(false);
    refresh();
  };
  const connect = async () => {
    setBusy(true); setMsg(""); setPair(null);
    const d = await adminPost("/api/admin/tg-check", { action: "connect" });
    if (d.ok) setPair(d); else setMsg(d.error || "Failed.");
    setBusy(false);
    refresh();
  };
  const test = async () => {
    setBusy(true); setMsg("");
    const d = await adminPost("/api/admin/tg-check", { action: "test" });
    setMsg(d.ok ? "Sent — check your Telegram." : d.error || "Failed.");
    setBusy(false);
  };
  const unpair = async () => {
    if (!confirm("Forget the paired chat? Alerts stop until you pair again.")) return;
    await adminPost("/api/admin/tg-check", { action: "unpair" });
    setPair(null); refresh();
  };

  return (
    <div className="glass space-y-4 rounded-2xl p-6">
      <div>
        <h3 className="font-display text-lg font-bold text-fg">Telegram cockpit</h3>
        <p className="mt-1 text-sm text-muted">
          Every enquiry, every WhatsApp message and every website chat lands in your Telegram the
          moment it happens — with the guide's answer, and buttons to take over. Reply to an alert on
          your phone and the reply goes to that customer.
        </p>
      </div>

      <ol className="space-y-1 text-sm text-muted">
        <li>1. In Telegram open <b className="text-fg">@BotFather</b> → <code className="font-mono">/newbot</code> → name it (e.g. GoLuQ Cockpit) → copy the token.</li>
        <li>2. Paste the token below and save. 3. Press Connect and open the link it gives you. Done.</li>
      </ol>

      <div className="flex flex-wrap items-end gap-2">
        <label className="block min-w-[240px] flex-1">
          <span className="mb-1 block text-sm font-semibold text-fg">Bot token {st?.configured && <span className="ml-1 text-xs font-normal text-success">· set{st.tokenValid ? ", valid" : st.tokenError ? ` — ${st.tokenError}` : ""}</span>}</span>
          <input className={inputClass} type="password" value={token} onChange={(e) => setToken(e.target.value)}
            placeholder={st?.configured ? "Paste a new token to replace" : "123456789:AAH…"} autoComplete="off" />
        </label>
        <Button onClick={saveToken} disabled={busy || !token.trim()}><ShieldCheck size={16} /> Save token</Button>
      </div>

      {st?.configured && (
        <div className="space-y-3 rounded-xl border border-hairline/12 bg-panel/30 p-4 text-sm">
          <p className="text-muted">
            Bot: <span className="font-mono text-fg">{st.username ? `@${st.username}` : "—"}</span>
            {" · "}Webhook: <span className={st.webhookOk ? "text-success" : "text-warn"}>{st.webhookOk ? "registered" : "not registered"}</span>
            {st.webhookError ? <span className="block text-xs text-warn">Last error from Telegram: {st.webhookError}</span> : null}
            {" · "}Paired: <span className={st.paired ? "text-success" : "text-warn"}>{st.paired ? `yes (chat ${st.chatId})` : "not yet"}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={connect} disabled={busy}><MessageSquare size={16} /> {st.paired ? "Reconnect / re-pair" : "Connect"}</Button>
            {st.paired && <Button onClick={test} disabled={busy}>Send test</Button>}
            {st.paired && <button type="button" onClick={unpair} className="text-sm font-semibold text-muted hover:text-fg">Unpair</button>}
          </div>
          {pair && (
            <div className="rounded-lg border border-teal-glow/35 bg-teal-glow/[0.08] p-3">
              <p className="font-semibold text-fg">Open this on your phone and press Start:</p>
              <a href={pair.deepLink} target="_blank" rel="noreferrer" className="break-all font-mono text-brand-luq underline">{pair.deepLink}</a>
              <p className="mt-1 text-xs text-muted">Or send the bot the code <span className="font-mono text-fg">{pair.pairCode}</span>. Valid for {pair.expiresInMin} minutes. Then press "Send test" here.</p>
            </div>
          )}
        </div>
      )}
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}

/**
 * The verified WhatsApp Business number (Meta Cloud API).
 *
 * Once these four values are in, the same guide that answers on the website
 * answers on WhatsApp, 24x7, from the business number — and every conversation
 * lands in Chats beside the website ones.
 *
 * The token and app secret are write-only: the server never sends them back, so
 * this form shows whether each is set and leaves the box blank. Submitting an
 * empty box therefore means "leave it alone", never "erase it".
 */
function WhatsAppBusiness() {
  const [phoneId, setPhoneId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [verify, setVerify] = useState("");
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [hasSecret, setHasSecret] = useState(false);
  const [saved, setSaved] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    adminGet("/api/admin/settings").then((d) => {
      setPhoneId(d.wa_phone_number_id || "");
      setWabaId(d.wa_waba_id || "");
      setVerify(d.wa_verify_token || "");
      setHasToken(Boolean(d.wa_access_token_set));
      setHasSecret(Boolean(d.wa_app_secret_set));
      setLoaded(true);
    });
  }, []);

  const save = async () => {
    if (!loaded) return;
    setSaved("");
    const d = await adminPost("/api/admin/settings", {
      wa_phone_number_id: phoneId,
      wa_waba_id: wabaId,
      wa_verify_token: verify,
      // Only sent when actually typed — see the note above.
      ...(token ? { wa_access_token: token } : {}),
      ...(secret ? { wa_app_secret: secret } : {}),
    });
    if (d.ok) {
      if (token) setHasToken(true);
      if (secret) setHasSecret(true);
      setToken("");
      setSecret("");
    }
    setSaved(d.ok ? "Saved ✅" : "Failed");
  };

  const live = Boolean(phoneId) && hasToken;

  return (
    <div className="glass space-y-5 rounded-2xl p-6">
      <div>
        <h3 className="font-display text-lg font-bold text-fg">WhatsApp Business (official)</h3>
        <p className="mt-1 text-sm text-muted">
          {live
            ? "Connected. The guide answers customers on your verified number."
            : "Not connected yet. Paste the four values from your Meta app below."}
        </p>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-base font-semibold text-fg">Phone number ID</span>
        <span className="mb-2 block text-sm text-muted">
          Meta → WhatsApp → API Setup. A long number — not your phone number itself.
        </span>
        <input className={inputClass} value={phoneId} onChange={(e) => setPhoneId(e.target.value)} placeholder="1234567890123456" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-base font-semibold text-fg">
          WhatsApp Business Account ID
        </span>
        <span className="mb-2 block text-sm text-muted">
          Meta → WhatsApp → API Setup, directly under the phone number ID. Needed only so this page
          can check whether your account is linked to the app — the switch that decides whether
          incoming messages ever reach you.
        </span>
        <input className={inputClass} value={wabaId} onChange={(e) => setWabaId(e.target.value)} placeholder="1234567890123456" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-base font-semibold text-fg">Verify token</span>
        <span className="mb-2 block text-sm text-muted">
          Any phrase you invent. Save it here first, then type the same phrase into Meta when it
          asks — it is only used to prove the two ends belong to each other.
        </span>
        <input className={inputClass} value={verify} onChange={(e) => setVerify(e.target.value)} placeholder="a phrase only you know" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-base font-semibold text-fg">
          Permanent access token {hasToken && <span className="text-success">· set</span>}
        </span>
        <span className="mb-2 block text-sm text-muted">
          From a System User in Business Settings. The temporary 24-hour test token will stop
          working tomorrow — use the permanent one. Leave blank to keep the current token.
        </span>
        <input className={inputClass} type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder={hasToken ? "•••••••• (unchanged)" : "EAAG..."} />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-base font-semibold text-fg">
          App secret {hasSecret && <span className="text-success">· set</span>}
        </span>
        <span className="mb-2 block text-sm text-muted">
          Meta → App Settings → Basic. This proves an incoming message really came from Meta.
          Until it is set, anyone who guesses the webhook address could make the guide reply to
          strangers at your cost — so set it.
        </span>
        <input className={inputClass} type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={hasSecret ? "•••••••• (unchanged)" : "app secret"} />
      </label>

      <div className="rounded-xl border border-hairline/15 bg-panel/40 p-4">
        <p className="text-sm font-semibold text-fg">Callback URL to paste into Meta</p>
        <code className="mt-1 block break-all text-sm text-brand-luq">https://goluq.com/api/wa/meta</code>
        <p className="mt-2 text-sm text-muted">
          Subscribe to the <b>messages</b> field. Save these settings before you verify in Meta,
          or the check will fail.
        </p>
      </div>

      <div>
        <Button onClick={save} disabled={!loaded}>
          <ShieldCheck size={16} /> Save WhatsApp settings
        </Button>
        {!loaded && <span className="ml-3 text-sm text-faint">Loading…</span>}
        {saved && <span className="ml-3 text-sm text-muted">{saved}</span>}
      </div>

      <WhatsAppCheck />
    </div>
  );
}

/**
 * Proves the connection instead of leaving the owner to guess.
 *
 * "Check connection" asks Meta who the phone number ID belongs to — which is the
 * only way to tell a wrong id from an expired token from the outside. It cannot
 * prove the webhook works; only a real message does that, so the panel says so
 * rather than showing a green tick that means less than it looks like.
 */
function WhatsAppCheck() {
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testMsg, setTestMsg] = useState("");

  const check = async () => {
    setBusy(true);
    setRes(null);
    setRes(await adminGet("/api/admin/wa-check"));
    setBusy(false);
  };

  // Subscribes the WhatsApp account to the app, then re-checks so the panel
  // reflects reality rather than an assumption about what the click did.
  const link = async () => {
    setBusy(true);
    const d = await adminPost("/api/admin/wa-check", { action: "subscribe" });
    setRes(await adminGet("/api/admin/wa-check"));
    setBusy(false);
    if (!d.ok) setTestMsg(d.error || "Could not link the account.");
  };

  const sendTest = async () => {
    setTestMsg("Sending…");
    const d = await adminPost("/api/admin/wa-check", { to: testTo });
    setTestMsg(d.ok ? "Sent ✅ — check that phone." : d.error || "Failed");
  };

  const tick = (on: boolean) => (on ? "✅" : "⬜");

  return (
    <div className="rounded-xl border border-hairline/15 bg-panel/40 p-4">
      <Button onClick={check} disabled={busy}>
        <ShieldCheck size={16} /> {busy ? "Checking…" : "Check connection"}
      </Button>

      {res && (
        <div className="mt-4 space-y-2 text-sm">
          <p className="text-muted">
            {tick(res.checklist?.phoneNumberId)} Phone number ID &nbsp;
            {tick(res.checklist?.accessToken)} Access token &nbsp;
            {tick(res.checklist?.verifyToken)} Verify token &nbsp;
            {tick(res.checklist?.appSecret)} App secret
          </p>
          {res.ok ? (
            <div className="rounded-lg border border-success/30 bg-success/10 p-3">
              <p className="font-semibold text-success">Meta recognises your number.</p>
              <p className="mt-1 text-muted">
                {/* Meta already returns the number with its leading +, so adding
                    one here produced "++91 …". */}
                {res.name || "—"} · {res.number || "—"}
                {res.quality ? ` · quality ${String(res.quality).toLowerCase()}` : ""}
              </p>
              {res.nameStatus === "DECLINED" && (
                <p className="mt-2 text-warn">
                  Display name declined by Meta. Messages still work; customers just see the number
                  instead of your name. Resubmit a name that matches the website exactly.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-warn/30 bg-warn/10 p-3">
              <p className="font-semibold text-warn">Not connected</p>
              <p className="mt-1 text-muted">{res.error}</p>
            </div>
          )}

          {/* The account↔app link. Separate from the app's webhook settings, and
              invisible from the app side — Meta reports no error when it is
              missing, it simply forwards nothing. */}
          {res.subscription && (
            <div
              className={`rounded-lg border p-3 ${
                res.subscription.apps?.length
                  ? "border-success/30 bg-success/10"
                  : "border-warn/30 bg-warn/10"
              }`}
            >
              {res.subscription.apps?.length ? (
                <p className="font-semibold text-success">
                  Account is linked to: {res.subscription.apps.join(", ")}
                </p>
              ) : (
                <>
                  <p className="font-semibold text-warn">
                    Your WhatsApp account is not linked to this app.
                  </p>
                  <p className="mt-1 text-muted">
                    {res.subscription.error === "no_waba_id"
                      ? "Add your WhatsApp Business Account ID above and save, then check again."
                      : res.subscription.error ||
                        "This is why messages never arrive. Linking it takes one click."}
                  </p>
                  {res.subscription.error !== "no_waba_id" && (
                    <Button className="mt-3" onClick={link} disabled={busy}>
                      Link account to this app
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          {/* The half a Graph call cannot answer. Meta will happily verify the
              callback URL and then never forward a message, so "recognised" and
              "receiving" are genuinely different questions. */}
          {res.inbound && (
            <div
              className={`rounded-lg border p-3 ${
                res.inbound.count > 0
                  ? "border-success/30 bg-success/10"
                  : "border-warn/30 bg-warn/10"
              }`}
            >
              {res.inbound.count > 0 ? (
                <>
                  <p className="font-semibold text-success">Receiving messages.</p>
                  <p className="mt-1 text-muted">
                    {res.inbound.count} received · {res.inbound.threads} conversation
                    {res.inbound.threads === 1 ? "" : "s"} · last {res.inbound.lastAt} UTC
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-warn">No message has ever arrived.</p>
                  <p className="mt-1 text-muted">
                    Sending works, but nothing has come back. Message this number from another
                    phone and press Check again. If it still says none, the gap is on Meta's side:
                    check that your app is <b>Live</b> rather than in development, and that the
                    WhatsApp account is subscribed to the app.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 border-t border-hairline/10 pt-4">
        <p className="text-sm font-semibold text-fg">Send a test message</p>
        <p className="mt-1 text-sm text-muted">
          Only works if that phone has messaged your business number in the last 24 hours — Meta
          allows free typing only inside that window. Outside it, nothing but an approved template
          gets through.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            className={inputClass + " max-w-[16rem]"}
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="Number to test, e.g. 9198XXXXXXXX"
          />
          <Button onClick={sendTest} disabled={!testTo}>
            Send test
          </Button>
        </div>
        {testMsg && <p className="mt-2 text-sm text-muted">{testMsg}</p>}
      </div>
    </div>
  );
}
