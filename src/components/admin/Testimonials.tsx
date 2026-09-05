import { useCallback, useEffect, useState } from "react";
import { Upload, Trash2, Eye, EyeOff, Video } from "lucide-react";
import { Button } from "../ui/Button";
import { inputClass } from "../../lib/ui";
import { adminGet, adminPost, getToken } from "../../lib/adminApi";

interface Row {
  id: number;
  name: string;
  title: string | null;
  company: string | null;
  quote: string;
  video_path: string | null;
  poster_path: string | null;
  lang: string;
  product: string | null;
  live: number;
  sort_order: number;
}

const BLANK = {
  name: "", title: "", company: "", quote: "", video_path: "", poster_path: "",
  lang: "en", product: "", sort_order: 0,
};

/**
 * Testimonials — upload the video here, it appears on the site when switched on.
 *
 * Self-hosted on purpose. A YouTube embed would be blocked by the site's CSP,
 * and even where it is not, it brings ads, "related videos" from competitors,
 * and a play button that says YouTube rather than GoLuQ. A file on our own
 * server does none of that.
 *
 * Nothing is live until the owner flips it. A testimonial is a promise made on
 * someone else's behalf, so it should never appear by accident.
 */
export function Testimonials() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<Record<string, string | number>>(BLANK);
  const [editing, setEditing] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const d = await adminGet("/api/admin/testimonials");
    setRows(d.testimonials || []);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const set = (k: string) => (e: { target: { value: string } }) =>
    setForm({ ...form, [k]: e.target.value });

  // Multipart straight to the server route; the JSON handler never sees bytes.
  const upload = async (file: File, kind: "video" | "poster") => {
    setUploading(true);
    setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "upload failed");
      setForm({ ...form, [kind === "video" ? "video_path" : "poster_path"]: d.path });
      setMsg(`${kind === "video" ? "Video" : "Poster"} uploaded.`);
    } catch (e) {
      setMsg(String((e as Error).message || e));
    }
    setUploading(false);
  };

  const save = async () => {
    setMsg("");
    const d = await adminPost("/api/admin/testimonials", {
      action: "save",
      ...(editing ? { id: editing } : {}),
      ...form,
    });
    if (!d.ok) return setMsg(d.error || "Could not save.");
    setMsg(editing ? "Saved." : "Added — it is hidden until you switch it live.");
    setForm(BLANK);
    setEditing(null);
    await load();
  };

  const toggle = async (r: Row) => {
    await adminPost("/api/admin/testimonials", { action: "live", id: r.id, live: !r.live });
    await load();
  };

  const remove = async (r: Row) => {
    if (!window.confirm(`Delete the testimonial from ${r.name}?`)) return;
    await adminPost("/api/admin/testimonials", { action: "delete", id: r.id });
    await load();
  };

  const edit = (r: Row) => {
    setEditing(r.id);
    setForm({
      name: r.name, title: r.title || "", company: r.company || "", quote: r.quote,
      video_path: r.video_path || "", poster_path: r.poster_path || "",
      lang: r.lang || "en", product: r.product || "", sort_order: r.sort_order || 0,
    });
  };

  return (
    <div className="space-y-6">
      <div className="glass space-y-3 rounded-2xl p-5">
        <p className="flex items-center gap-2 font-display text-base font-bold text-fg">
          <Video size={17} className="text-brand-luq" /> {editing ? "Edit testimonial" : "Add a testimonial"}
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          <input className={inputClass} value={form.name as string} onChange={set("name")} placeholder="Name" />
          <input className={inputClass} value={form.title as string} onChange={set("title")} placeholder="Title, e.g. Managing Director" />
          <input className={inputClass} value={form.company as string} onChange={set("company")} placeholder="Company" />
          <select className={inputClass} value={form.product as string} onChange={set("product")}>
            <option value="">Shown everywhere</option>
            <option value="office">WhatsApp Office page</option>
            <option value="store">WhatsApp Store page</option>
          </select>
        </div>
        <textarea
          className={inputClass + " min-h-[4.5rem]"}
          value={form.quote as string}
          onChange={set("quote")}
          placeholder="One or two sentences in their words. This shows even when the video does not play."
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <select className={inputClass} value={form.lang as string} onChange={set("lang")}>
            <option value="en">English / Hinglish</option>
            <option value="hi">हिन्दी</option>
          </select>
          <input className={inputClass} type="number" value={form.sort_order} onChange={set("sort_order")} placeholder="Order (0 first)" />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="glass glass-interactive flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-sm">
            <span className="flex items-center gap-2 text-fg">
              <Upload size={15} className="text-brand-luq" />
              {form.video_path ? "Replace video" : "Upload video (MP4)"}
            </span>
            <span className="truncate text-xs text-faint">{(form.video_path as string) || "up to 200 MB"}</span>
            <input type="file" accept="video/mp4,video/webm" className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "video")} />
          </label>
          <label className="glass glass-interactive flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-sm">
            <span className="flex items-center gap-2 text-fg">
              <Upload size={15} className="text-brand-luq" />
              {form.poster_path ? "Replace photo" : "Photo (optional)"}
            </span>
            <span className="truncate text-xs text-faint">{(form.poster_path as string) || "shown before play"}</span>
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "poster")} />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={uploading || !form.name || !form.quote}>
            {editing ? "Save changes" : "Add testimonial"}
          </Button>
          {editing && (
            <button type="button" className="text-sm text-muted hover:text-fg"
              onClick={() => { setEditing(null); setForm(BLANK); }}>
              Cancel
            </button>
          )}
          {uploading && <span className="text-sm text-muted">Uploading…</span>}
          {msg && <span className="text-sm text-muted">{msg}</span>}
        </div>
      </div>

      <div className="space-y-3">
        {rows.length === 0 && <p className="text-base text-muted">No testimonials yet.</p>}
        {rows.map((r) => (
          <div key={r.id} className="glass rounded-2xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-base font-bold text-fg">
                  {r.name}
                  {r.title || r.company ? (
                    <span className="ml-2 text-sm font-normal text-muted">
                      {[r.title, r.company].filter(Boolean).join(", ")}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 break-words text-sm text-muted">“{r.quote}”</p>
                <p className="mt-1 text-xs text-faint">
                  {r.video_path ? "video attached" : "no video"} · {r.product || "everywhere"} · {r.lang}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button type="button" onClick={() => toggle(r)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${
                    r.live ? "bg-success/15 text-success ring-success/40" : "bg-panel/40 text-muted ring-hairline/20"
                  }`}>
                  {r.live ? <Eye size={13} /> : <EyeOff size={13} />}
                  {r.live ? "Live" : "Hidden"}
                </button>
                <button type="button" onClick={() => edit(r)} className="rounded-full px-3 py-1.5 text-xs font-semibold text-brand-luq hover:underline">
                  Edit
                </button>
                <button type="button" onClick={() => remove(r)} className="grid h-8 w-8 place-items-center rounded-full text-faint hover:text-danger" aria-label="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
