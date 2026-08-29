import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Clock, FileText, Loader2, LogOut, Send } from "lucide-react";
import { TopBar } from "../components/TopBar";
import { Button } from "../components/ui/Button";
import { WhatsAppCta } from "../components/WhatsAppCta";
import { inr } from "../content/catalogue";

const TOKEN_KEY = "goluq_portal_token";
const inputClass =
  "w-full rounded-xl border border-hairline/20 bg-panel/60 px-4 py-3 text-base text-fg outline-none placeholder:text-faint focus:border-teal-glow/50";

/** Customer-facing wording for each SDLC stage. The server owns the order. */
const STAGE_LABEL: Record<string, string> = {
  requirements: "Requirements",
  blueprint: "Blueprint & quote",
  approval: "Your approval",
  build: "Build",
  testing: "Testing & your review",
  delivery: "Delivery",
  support: "Support",
};

const STAGE_MEANS: Record<string, string> = {
  requirements: "We are working out exactly what you need.",
  blueprint: "You get the plan and the price in writing, before any work starts.",
  approval: "Waiting on your go-ahead. Nothing is built until you say so.",
  build: "Being built now.",
  testing: "Working, and being checked against your real cases — including by you.",
  delivery: "Handed over, with training in plain language.",
  support: "Live and looked after.",
};

interface Project {
  id: number;
  title: string;
  stage: string;
  status: string;
  price_inr: number;
  paid_inr: number;
  target_date: string | null;
  updated_at: string;
  events: { stage: string | null; note: string; created_at: string }[];
  files: { label: string; url: string; created_at: string }[];
}

const api = async (path: string, opts: RequestInit = {}) => {
  const token = localStorage.getItem(TOKEN_KEY) || "";
  const r = await fetch(path, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  return r.json().catch(() => ({ ok: false }));
};

/**
 * Route "/portal" — where a customer watches their own build.
 *
 * The point is that a customer never has to ask "where has this got to?". Every
 * stage, every update and every delivered file is here, and nothing is shown
 * that has not actually happened.
 */
export function Portal() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<{ name: string } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stages, setStages] = useState<string[]>([]);
  const setupToken = new URLSearchParams(window.location.search).get("setup") || "";

  const load = async () => {
    const d = await api("/api/customer/projects");
    if (d.ok) {
      setMe(d.customer);
      setProjects(d.projects || []);
      setStages(d.stages || []);
    } else {
      setMe(null);
    }
    setReady(true);
  };

  useEffect(() => {
    if (setupToken) {
      setReady(true);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    await api("/api/customer/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) });
    localStorage.removeItem(TOKEN_KEY);
    setMe(null);
  };

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Loader2 className="animate-spin text-brand-luq" />
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh">
      <TopBar showBack onBack={() => navigate("/")} showPartnerCta={false} />
      <main className="mx-auto w-full max-w-4xl px-5 pb-24 pt-4 sm:px-8">
        {setupToken ? (
          <SetPassword token={setupToken} onDone={load} />
        ) : !me ? (
          <Login onDone={load} />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 py-6">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-brand-luq">
                  Your projects
                </p>
                <h1 className="mt-2 font-display text-2xl font-bold text-fg sm:text-3xl">
                  Hello, {me.name}
                </h1>
              </div>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-2 text-sm font-semibold text-muted hover:text-fg"
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="glass rounded-2xl p-6">
                <p className="text-base text-muted">
                  Nothing here yet. As soon as your first project is opened it appears here, with
                  every update as it happens.
                </p>
                <WhatsAppCta variant="bar" context="general" className="mt-4 max-w-sm" />
              </div>
            ) : (
              <div className="space-y-6">
                {projects.map((p) => (
                  <ProjectCard key={p.id} project={p} stages={stages} onPosted={load} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ProjectCard({
  project,
  stages,
  onPosted,
}: {
  project: Project;
  stages: string[];
  onPosted: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const current = stages.indexOf(project.stage);

  const post = async () => {
    if (!note.trim()) return;
    setBusy(true);
    const d = await api("/api/customer/projects", {
      method: "POST",
      body: JSON.stringify({ projectId: project.id, note }),
    });
    setBusy(false);
    if (d.ok) {
      setNote("");
      onPosted();
    }
  };

  return (
    <section className="glass rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-fg">{project.title}</h2>
          <p className="mt-1 text-sm text-muted">{STAGE_MEANS[project.stage] || ""}</p>
        </div>
        {project.price_inr > 0 && (
          <div className="text-right">
            <p className="font-display text-lg font-bold text-fg tabular-nums">
              {inr(project.price_inr)}
            </p>
            {project.paid_inr > 0 && (
              <p className="text-sm text-muted tabular-nums">{inr(project.paid_inr)} received</p>
            )}
          </div>
        )}
      </div>

      {/* Stage rail — a customer should be able to see progress without reading. */}
      <ol className="mt-6 space-y-1">
        {stages.map((s, i) => {
          const done = i < current;
          const now = i === current;
          return (
            <li key={s} className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0">
                {done ? (
                  <CheckCircle2 size={18} className="text-success" />
                ) : now ? (
                  <motion.span
                    animate={{ opacity: [1, 0.45, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="block"
                  >
                    <Clock size={18} className="text-brand-luq" />
                  </motion.span>
                ) : (
                  <Circle size={18} className="text-faint" />
                )}
              </span>
              <span
                className={
                  now
                    ? "text-base font-semibold text-fg"
                    : done
                      ? "text-base text-muted"
                      : "text-base text-faint"
                }
              >
                {STAGE_LABEL[s] || s}
              </span>
            </li>
          );
        })}
      </ol>

      {project.files.length > 0 && (
        <div className="mt-6 border-t border-hairline/10 pt-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-faint">Delivered</p>
          <ul className="mt-2 space-y-2">
            {project.files.map((f, i) => (
              <li key={i}>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-base text-brand-luq hover:underline"
                >
                  <FileText size={15} /> {f.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {project.events.length > 0 && (
        <div className="mt-6 border-t border-hairline/10 pt-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-faint">Updates</p>
          <ul className="mt-3 space-y-3">
            {project.events.slice(0, 12).map((e, i) => (
              <li key={i} className="text-base text-muted">
                <span className="mr-2 font-mono text-xs text-faint">
                  {String(e.created_at).slice(0, 10)}
                </span>
                {e.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 border-t border-hairline/10 pt-4">
        <label className="block text-sm font-semibold text-fg">Add something we should know</label>
        <textarea
          className={inputClass + " mt-2 min-h-[5rem]"}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="A change, a question, anything you have remembered…"
        />
        <Button onClick={post} disabled={busy || !note.trim()} className="mt-2">
          <Send size={15} /> {busy ? "Sending…" : "Send"}
        </Button>
      </div>
    </section>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const d = await api("/api/customer/auth", {
      method: "POST",
      body: JSON.stringify({ action: "login", phone, password }),
    });
    setBusy(false);
    if (d.ok && d.token) {
      localStorage.setItem(TOKEN_KEY, d.token);
      onDone();
    } else {
      setMsg("That phone number and password don't match.");
    }
  };

  const forgot = async () => {
    setMsg("");
    const d = await api("/api/customer/auth", {
      method: "POST",
      body: JSON.stringify({ action: "forgot", phone }),
    });
    setMsg(
      d.sent
        ? "If that number has an account, a link is on its way to the email on it."
        : d.note || "Could not send right now."
    );
  };

  return (
    <form onSubmit={submit} className="glass mx-auto mt-10 max-w-md space-y-4 rounded-2xl p-6">
      <h1 className="font-display text-2xl font-bold text-fg">Your project portal</h1>
      <p className="text-base text-muted">
        Sign in to see where your project has got to, every update, and everything delivered.
      </p>
      <input
        className={inputClass}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Your phone number"
        inputMode="numeric"
        autoComplete="username"
      />
      <input
        className={inputClass}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        autoComplete="current-password"
      />
      <Button type="submit" disabled={busy} full>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
      <button
        type="button"
        onClick={forgot}
        className="block w-full text-center text-sm font-semibold text-muted hover:text-fg"
      >
        Email me a link to set my password
      </button>
      {msg && <p className="text-center text-sm text-muted">{msg}</p>}
    </form>
  );
}

function SetPassword({ token, onDone }: { token: string; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const d = await api("/api/customer/auth", {
      method: "POST",
      body: JSON.stringify({ action: "setup", token, password }),
    });
    setBusy(false);
    if (d.ok && d.token) {
      localStorage.setItem(TOKEN_KEY, d.token);
      // Drop the one-time token out of the address bar so it is not left in
      // history, bookmarks, or a shared screenshot.
      window.history.replaceState({}, "", "/portal");
      onDone();
    } else {
      setMsg(d.error === "link_expired" ? "That link has expired. Ask us for a new one." : d.error || "Could not set your password.");
    }
  };

  return (
    <form onSubmit={submit} className="glass mx-auto mt-10 max-w-md space-y-4 rounded-2xl p-6">
      <h1 className="font-display text-2xl font-bold text-fg">Choose your password</h1>
      <p className="text-base text-muted">At least 8 characters. You will use your phone number to sign in.</p>
      <input
        className={inputClass}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password"
        autoComplete="new-password"
      />
      <Button type="submit" disabled={busy || password.length < 8} full>
        {busy ? "Saving…" : "Save and sign in"}
      </Button>
      {msg && <p className="text-center text-sm text-muted">{msg}</p>}
    </form>
  );
}
