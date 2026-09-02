import { useCallback, useEffect, useState } from "react";
import { Megaphone, Send, Users, Ban } from "lucide-react";
import { Button } from "../ui/Button";
import { inputClass } from "../../lib/ui";
import { adminGet, adminPost } from "../../lib/adminApi";

/**
 * WhatsApp campaigns — the marketing template, sent to people who gave us their
 * number themselves.
 *
 * Deliberately not a "send to everyone" button. Batches are small because a new
 * number sits in Meta's lowest tier and only climbs on consistent quality; and
 * every screen here shows REPLIES, not just sends, because a campaign that
 * nobody answers is a campaign that did not work — and on WhatsApp, unlike
 * email, the replies land in the same inbox and the guide answers them.
 */
export function Campaigns() {
  const [d, setD] = useState<any>({ campaigns: [], industries: [], statuses: [], batch: 25 });
  const [filters, setFilters] = useState({ status: "", industry: "", sinceDays: "" });
  const [form, setForm] = useState({ name: "", topic: "", lang: "en" });
  const [preview, setPreview] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [targets, setTargets] = useState<any[]>([]);

  const load = useCallback(async () => {
    setD(await adminGet("/api/admin/campaigns"));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const asFilters = () => ({
    status: filters.status || undefined,
    industry: filters.industry || undefined,
    sinceDays: filters.sinceDays ? Number(filters.sinceDays) : undefined,
  });

  const doPreview = async () => {
    setMsg("");
    const r = await adminPost("/api/admin/campaigns", { action: "preview", filters: asFilters() });
    setPreview(r.ok ? r : null);
    if (!r.ok) setMsg(r.error || "Could not build that audience.");
  };

  const create = async () => {
    setBusy(true);
    setMsg("");
    const r = await adminPost("/api/admin/campaigns", {
      action: "create",
      ...form,
      filters: asFilters(),
    });
    setBusy(false);
    if (!r.ok) return setMsg(r.error || "Could not create.");
    setForm({ name: "", topic: "", lang: "en" });
    setPreview(null);
    setMsg(`Created with ${r.total} recipients. Nothing has been sent yet.`);
    await load();
  };

  const sendBatch = async (id: number) => {
    setBusy(true);
    setMsg("");
    const r = await adminPost("/api/admin/campaigns", { action: "send", id });
    setBusy(false);
    setMsg(
      r.ok
        ? r.done
          ? "Finished — everyone has been contacted."
          : `Sent ${r.sentNow}${r.failedNow ? `, ${r.failedNow} failed` : ""} · ${r.remaining} left. Send the next batch when you are ready.`
        : r.error || "Send failed."
    );
    await load();
  };

  const cancel = async (id: number) => {
    await adminPost("/api/admin/campaigns", { action: "cancel", id });
    await load();
  };

  const openTargets = async (id: number) => {
    if (openId === id) return setOpenId(null);
    const r = await adminPost("/api/admin/campaigns", { action: "targets", id });
    setTargets(r.targets || []);
    setOpenId(id);
  };

  return (
    <div className="space-y-6">
      <div className="glass space-y-4 rounded-2xl p-5">
        <div>
          <p className="flex items-center gap-2 font-display text-base font-bold text-fg">
            <Megaphone size={17} className="text-brand-luq" /> New campaign
          </p>
          <p className="mt-1 text-sm text-muted">
            Goes only to people already in your leads — anyone who opted out, or who said STOP on
            WhatsApp, is excluded automatically. Sent {d.batch} at a time, deliberately: a new
            number climbs Meta's sending tiers on good behaviour and loses them on complaints.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <select
            className={inputClass}
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Any status</option>
            {(d.statuses || []).map((s: string) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            className={inputClass}
            value={filters.industry}
            onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
          >
            <option value="">Any industry</option>
            {(d.industries || []).map((s: string) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            className={inputClass}
            value={filters.sinceDays}
            onChange={(e) => setFilters({ ...filters, sinceDays: e.target.value })}
            placeholder="Enquired in last N days"
            inputMode="numeric"
          />
        </div>

        <Button variant="ghost" onClick={doPreview}>
          <Users size={15} /> Who would this reach?
        </Button>

        {preview && (
          <div className="rounded-xl border border-hairline/15 bg-panel/40 p-4 text-sm">
            <p className="font-semibold text-fg">{preview.count} people</p>
            {preview.count > 0 && (
              <ul className="mt-1 space-y-0.5 text-muted">
                {preview.sample.map((p: any, i: number) => (
                  <li key={i}>
                    {p.name} · {p.phone}
                    {p.industry ? ` · ${p.industry}` : ""}
                  </li>
                ))}
                {preview.count > preview.sample.length && <li>…and {preview.count - preview.sample.length} more</li>}
              </ul>
            )}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Campaign name (for you)"
          />
          <select
            className={inputClass}
            value={form.lang}
            onChange={(e) => setForm({ ...form, lang: e.target.value })}
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
          </select>
        </div>
        <input
          className={inputClass}
          value={form.topic}
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
          placeholder="What they asked about, e.g. a WhatsApp automation"
        />
        <p className="text-xs text-faint">
          They will receive: “Hi <b>[their name]</b>, you asked us about <b>{form.topic || "…"}</b> a
          few days ago. If it is still on your list, reply here and we will pick up where we left
          off. If not, reply STOP and we will not message you again.”
        </p>

        <Button onClick={create} disabled={busy || !form.name || !form.topic || !preview?.count}>
          Create campaign
        </Button>
        {msg && <p className="text-sm text-muted">{msg}</p>}
      </div>

      <div className="space-y-3">
        {(d.campaigns || []).map((c: any) => (
          <div key={c.id} className="glass rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-base font-bold text-fg">{c.name}</p>
                <p className="text-sm text-muted">
                  {c.status} · {c.lang === "hi" ? "Hindi" : "English"} · “{c.topic}”
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.status !== "done" && c.status !== "cancelled" && (
                  <Button size="md" onClick={() => sendBatch(c.id)} disabled={busy}>
                    <Send size={15} /> Send next {d.batch}
                  </Button>
                )}
                {c.status !== "cancelled" && c.status !== "done" && (
                  <Button size="md" variant="ghost" onClick={() => cancel(c.id)}>
                    <Ban size={15} /> Cancel
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Stat label="Audience" v={c.total} />
              <Stat label="Sent" v={c.sent} />
              <Stat label="Delivered" v={c.delivered} />
              <Stat label="Read" v={c.read_count} />
              <Stat label="Replied" v={c.replied} accent />
              {c.failed > 0 && <Stat label="Failed" v={c.failed} warn />}
            </div>

            <button
              type="button"
              onClick={() => openTargets(c.id)}
              className="mt-3 text-sm font-semibold text-brand-luq hover:underline"
            >
              {openId === c.id ? "Hide recipients" : "Show recipients"}
            </button>

            {openId === c.id && (
              <ul className="mt-2 max-h-60 space-y-1 overflow-y-auto text-sm text-muted">
                {targets.map((t, i) => (
                  <li key={i}>
                    {t.name} · {t.phone} · <span className="text-fg">{t.status}</span>
                    {t.error ? ` · ${t.error}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {(d.campaigns || []).length === 0 && (
          <p className="text-base text-muted">No campaigns yet.</p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, v, accent, warn }: { label: string; v: number; accent?: boolean; warn?: boolean }) {
  return (
    <span>
      <span
        className={`font-display text-lg font-bold tabular-nums ${
          warn ? "text-warn" : accent ? "text-brand-luq" : "text-fg"
        }`}
      >
        {v ?? 0}
      </span>{" "}
      <span className="text-muted">{label}</span>
    </span>
  );
}
