import { useCallback, useEffect, useState } from "react";
import { TopBar } from "../components/TopBar";
import { Button } from "../components/ui/Button";
import { inputClass } from "../lib/ui";

interface Lead {
  id: number;
  name: string;
  phone: string;
  email?: string;
  role?: string;
  industry?: string;
  cross_sell?: string;
  wants_training?: number;
  ref_code?: string;
  created_at: string;
}

/**
 * Internal admin (token-gated by ADMIN_SECRET, kept in sessionStorage; no
 * customer login). Connect GoLuQ's WhatsApp number (QR scan) + view leads.
 * Not linked in nav. The /admin route stays out of search via robots later.
 */
export function Admin() {
  const [secret, setSecret] = useState(() => sessionStorage.getItem("goluq_admin") || "");
  const [authed, setAuthed] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [waState, setWaState] = useState<string>("");
  const [qr, setQr] = useState<string | null>(null);
  const [pairing, setPairing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadLeads = useCallback(async (sec: string) => {
    const res = await fetch(`/api/admin/leads?secret=${encodeURIComponent(sec)}`);
    const data = await res.json();
    if (!data.ok) {
      setError("Wrong secret or server error.");
      setAuthed(false);
      return false;
    }
    setLeads(data.leads || []);
    setTotal(data.total || 0);
    setAuthed(true);
    setError("");
    return true;
  }, []);

  const loadStatus = useCallback(async (sec: string) => {
    const res = await fetch(`/api/admin/wa-status?secret=${encodeURIComponent(sec)}`);
    const data = await res.json();
    if (data.ok) setWaState(data.configured ? data.state : "not configured");
  }, []);

  useEffect(() => {
    if (secret) {
      loadLeads(secret).then((ok) => {
        if (ok) loadStatus(secret);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async () => {
    sessionStorage.setItem("goluq_admin", secret);
    if (await loadLeads(secret)) loadStatus(secret);
  };

  const connectWhatsApp = async () => {
    setBusy(true);
    setQr(null);
    setPairing(null);
    try {
      const res = await fetch("/api/admin/wa-connect", {
        method: "POST",
        headers: { "x-admin-secret": secret },
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "connect failed");
      } else {
        setQr(data.qr || null);
        setPairing(data.pairingCode || null);
        setWaState(data.state || "connecting");
        // Poll for connection
        let tries = 0;
        const poll = setInterval(async () => {
          tries += 1;
          await loadStatus(secret);
          const r = await fetch(`/api/admin/wa-status?secret=${encodeURIComponent(secret)}`);
          const d = await r.json();
          if (d.state === "open" || tries > 40) {
            clearInterval(poll);
            if (d.state === "open") setQr(null);
          }
        }, 3000);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!authed) {
    return (
      <div className="relative min-h-dvh">
        <TopBar showBack onBack={() => (window.location.href = "/")} showPartnerCta={false} />
        <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-6">
          <h1 className="font-display text-2xl font-bold text-fg">GoLuQ Admin</h1>
          <p className="mt-2 text-muted">Enter the admin secret to continue.</p>
          <input
            type="password"
            className={`${inputClass} mt-4`}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="ADMIN_SECRET"
            onKeyDown={(e) => e.key === "Enter" && signIn()}
          />
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          <Button className="mt-4" full onClick={signIn}>
            Sign in
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh">
      <TopBar showBack onBack={() => (window.location.href = "/")} showPartnerCta={false} />
      <main className="mx-auto w-full max-w-4xl px-5 pb-28 pt-4 sm:px-8">
        {/* WhatsApp connect */}
        <section className="glass rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-fg">WhatsApp connection</h2>
              <p className="mt-1 text-sm text-muted">
                State:{" "}
                <span className={waState === "open" ? "text-success" : "text-warn"}>
                  {waState || "…"}
                </span>
              </p>
            </div>
            <Button variant="ghost" onClick={connectWhatsApp} disabled={busy}>
              {busy ? "Connecting…" : waState === "open" ? "Reconnect" : "Connect WhatsApp"}
            </Button>
          </div>
          {qr && (
            <div className="mt-5 flex flex-col items-center gap-2">
              <img src={qr} alt="WhatsApp QR" className="h-56 w-56 rounded-xl bg-white p-2" />
              <p className="text-sm text-muted">Scan with the GoLuQ WhatsApp number → Linked devices.</p>
            </div>
          )}
          {pairing && <p className="mt-3 text-center font-mono text-lg text-brand-luq">Pairing code: {pairing}</p>}
        </section>

        {/* Leads */}
        <section className="mt-8">
          <h2 className="font-display text-xl font-bold text-fg">Leads ({total})</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-faint">
                <tr className="border-b border-hairline/15">
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Phone</th>
                  <th className="py-2 pr-3">Worker</th>
                  <th className="py-2 pr-3">Industry</th>
                  <th className="py-2 pr-3">Training</th>
                  <th className="py-2 pr-3">Ref</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-b border-hairline/8 text-fg">
                    <td className="py-2 pr-3 text-muted">{l.created_at}</td>
                    <td className="py-2 pr-3 font-semibold">{l.name}</td>
                    <td className="py-2 pr-3">
                      <a className="text-brand-luq" href={`https://wa.me/91${l.phone}`} target="_blank" rel="noreferrer">
                        +91 {l.phone}
                      </a>
                    </td>
                    <td className="py-2 pr-3">{l.role || "—"}</td>
                    <td className="py-2 pr-3">{l.industry || "—"}</td>
                    <td className="py-2 pr-3">{l.wants_training ? "Yes" : "No"}</td>
                    <td className="py-2 pr-3 text-faint">{l.ref_code || "—"}</td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted">
                      No leads yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
