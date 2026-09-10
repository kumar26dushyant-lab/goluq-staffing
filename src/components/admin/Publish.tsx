import { useCallback, useEffect, useState } from "react";
import { Send, Plus, Trash2, Link2, CheckCircle2, AlertTriangle, Facebook, Instagram } from "lucide-react";
import { Button } from "../ui/Button";
import { inputClass } from "../../lib/ui";
import { adminGet, adminPost } from "../../lib/adminApi";

/**
 * Publish — Facebook and Instagram posts from the cockpit.
 *
 * Pick a picture (any catalogue card, or a URL you pasted), write the caption,
 * publish. The connection uses the same Meta token as WhatsApp; until the Page
 * is assigned to it, the screen says exactly what to click in Business
 * Settings rather than failing quietly.
 */
interface Post { id: number; caption: string; image_url: string | null; link_url: string | null; channels: string; status: string; fb_post_id: string | null; ig_post_id: string | null; error: string | null; created_at: string; published_at: string | null }
interface Conn { pageId: string; pageName: string; igId: string; note: string }

export function Publish() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [conn, setConn] = useState<Conn>({ pageId: "", pageName: "", igId: "", note: "" });
  const [assets, setAssets] = useState<{ label: string; url: string }[]>([]);
  const [f, setF] = useState({ id: 0, caption: "", imageUrl: "", linkUrl: "https://goluq.com", channels: "facebook" });
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const d = await adminGet("/api/admin/posts");
    setPosts(d.posts || []); setConn(d.connection || conn); setAssets(d.assets || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  const connect = async () => {
    setBusy("Connecting…"); setMsg("");
    const r = await adminPost("/api/admin/posts", { action: "connect" });
    setBusy(""); setMsg(r.ok ? `Connected to ${r.pageName}${r.igId ? " and its Instagram account" : " (no Instagram linked yet)"}.` : r.error || "Could not connect.");
    load();
  };
  const save = async (thenPublish = false) => {
    setBusy(thenPublish ? "Publishing…" : "Saving…"); setMsg("");
    const r = await adminPost("/api/admin/posts", { action: "save", ...f });
    if (!r.ok) { setBusy(""); setMsg(r.error || "Could not save."); return; }
    if (thenPublish) {
      const p = await adminPost("/api/admin/posts", { action: "publish", id: r.id });
      setMsg(p.ok ? "Published." : p.error || "Publish failed.");
    } else setMsg("Saved as draft.");
    setBusy("");
    setF({ id: 0, caption: "", imageUrl: "", linkUrl: "https://goluq.com", channels: "facebook" });
    load();
  };
  const publish = async (id: number) => {
    setBusy("Publishing…"); setMsg("");
    const p = await adminPost("/api/admin/posts", { action: "publish", id });
    setBusy(""); setMsg(p.ok ? "Published." : p.error || "Publish failed."); load();
  };
  const remove = async (id: number) => {
    if (!confirm("Delete this draft?")) return;
    await adminPost("/api/admin/posts", { action: "delete", id }); load();
  };

  const connected = !!conn.pageId;
  return (
    <div className="space-y-5">
      <div className={`rounded-2xl p-4 ${connected ? "glass" : "glass-bright"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-fg">
              {connected ? <>Facebook Page: {conn.pageName || conn.pageId}</> : "Facebook Page not connected"}
              {connected && (conn.igId ? <span className="ml-2 text-sm text-success">· Instagram linked</span> : <span className="ml-2 text-sm text-warn">· Instagram not linked</span>)}
            </p>
            {conn.note && <p className="mt-1 max-w-2xl text-sm text-muted">{conn.note}</p>}
          </div>
          <Button size="md" variant={connected ? "secondary" : "primary"} onClick={connect} disabled={!!busy}>{connected ? "Reconnect" : "Connect"}</Button>
        </div>
      </div>

      <div className="glass space-y-3 rounded-2xl p-4">
        <p className="font-display text-base font-bold text-fg">New post</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <div className="space-y-3">
            <textarea className={`${inputClass} min-h-[120px]`} value={f.caption} onChange={(e) => setF({ ...f, caption: e.target.value })} placeholder="Caption. Say the problem, then what changes, then where to tap." />
            <div className="grid gap-2 sm:grid-cols-2">
              <select className={inputClass} value={f.imageUrl} onChange={(e) => setF({ ...f, imageUrl: e.target.value })}>
                <option value="">Picture: choose a catalogue card…</option>
                {assets.map((a) => <option key={a.url} value={a.url}>{a.label}</option>)}
              </select>
              <input className={inputClass} value={f.imageUrl} onChange={(e) => setF({ ...f, imageUrl: e.target.value })} placeholder="…or paste a picture URL (https)" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className={inputClass} value={f.linkUrl} onChange={(e) => setF({ ...f, linkUrl: e.target.value })} placeholder="Link (https)" />
              <select className={inputClass} value={f.channels} onChange={(e) => setF({ ...f, channels: e.target.value })}>
                <option value="facebook">Facebook</option>
                <option value="facebook,instagram">Facebook + Instagram</option>
                <option value="instagram">Instagram</option>
              </select>
            </div>
          </div>
          <div className="aspect-square overflow-hidden rounded-xl bg-base">
            {f.imageUrl ? <img src={f.imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm text-faint">Preview</div>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => save(true)} disabled={!!busy || !f.caption.trim() || !connected}><Send size={16} /> Publish now</Button>
          <Button variant="secondary" onClick={() => save(false)} disabled={!!busy || !f.caption.trim()}><Plus size={16} /> Save draft</Button>
          {busy && <span className="text-sm text-muted">{busy}</span>}
          {msg && <span className="text-sm text-fg">{msg}</span>}
        </div>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        <p className="border-b border-hairline/10 px-4 py-3 font-display text-base font-bold text-fg">Posts</p>
        {posts.length === 0 && <p className="px-4 py-4 text-sm text-muted">Nothing yet.</p>}
        <div className="divide-y divide-hairline/8">
          {posts.map((p) => (
            <div key={p.id} className="flex gap-3 px-4 py-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-base">{p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}</div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm text-fg">{p.caption}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                  {p.status === "published" ? <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 size={12} /> published</span> : p.status === "failed" ? <span className="inline-flex items-center gap-1 text-danger"><AlertTriangle size={12} /> failed</span> : <span>draft</span>}
                  {p.channels.includes("facebook") && <Facebook size={12} />}
                  {p.channels.includes("instagram") && <Instagram size={12} />}
                  {p.link_url && <span className="inline-flex items-center gap-1"><Link2 size={12} /> link</span>}
                  <span className="font-mono">{String(p.published_at || p.created_at).slice(0, 16)}</span>
                </p>
                {p.error && <p className="mt-1 text-xs text-danger">{p.error}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {p.status !== "published" && <button type="button" onClick={() => publish(p.id)} className="text-sm font-semibold text-brand-luq hover:underline" disabled={!connected}>Publish</button>}
                {p.status !== "published" && <button type="button" onClick={() => remove(p.id)} className="text-faint hover:text-danger" aria-label="Delete"><Trash2 size={14} /></button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
