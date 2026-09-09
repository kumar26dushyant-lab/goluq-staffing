import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Video, Sparkles, RefreshCw, Upload, Plus, X, Check, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "../ui/Button";
import { inputClass } from "../../lib/ui";
import { adminGet, adminPost, getToken } from "../../lib/adminApi";

/**
 * Store — the catalogue behind the WhatsApp catalog, run from a phone.
 *
 * The owner's day: photograph a new item, type a name and a price, tap
 * "Clean photo" if the shot is rough, tap "Sync". That is the whole loop, and
 * it is the same loop a garment trader will run on their own WhatsApp Store,
 * which is why nothing here assumes a desk.
 */
interface Product {
  id: number; retailer_id: string; name: string; description: string | null; price_inr: number;
  image_path: string | null; extra_images: string | null; video_path: string | null; url: string | null;
  category: string | null; availability: string; sort_order: number; live: number; meta_id: string | null;
  synced_at: string | null; sync_error: string | null; updated_at: string;
}
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const pending = (p: Product) => (p.live ? !p.synced_at || p.synced_at < p.updated_at : !!p.meta_id);

async function upload(file: File): Promise<{ ok: boolean; path?: string; error?: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/admin/upload", { method: "POST", headers: { "x-admin-token": getToken() }, body: fd });
  return r.json();
}

export function Store() {
  const [d, setD] = useState<{ products: Product[]; pending: number; catalogId: string }>({ products: [], pending: 0, catalogId: "" });
  const [open, setOpen] = useState<Product | "new" | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => setD(await adminGet("/api/admin/products")), []);
  useEffect(() => { load(); }, [load]);

  const sync = async () => {
    setBusy(true); setMsg("");
    const r = await adminPost("/api/admin/products", { action: "sync" });
    setBusy(false);
    setMsg(r.ok ? `WhatsApp updated — ${r.created} added, ${r.updated} changed, ${r.removed} removed${r.failed ? `, ${r.failed} failed (open the item to see why)` : ""}.` : r.error || "Sync failed.");
    load();
  };
  const importMeta = async () => {
    setBusy(true); setMsg("");
    const r = await adminPost("/api/admin/products", { action: "import" });
    setBusy(false);
    setMsg(r.ok ? `Imported ${r.imported} from WhatsApp.` : r.error || "Import failed.");
    load();
  };

  if (open) return <Editor product={open === "new" ? null : open} onBack={() => { setOpen(null); load(); }} />;

  const live = d.products.filter((p) => p.live);
  const hidden = d.products.filter((p) => !p.live);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setOpen("new")}><Plus size={16} /> Add product</Button>
        <Button variant="secondary" onClick={sync} disabled={busy || !d.catalogId}>
          <Upload size={16} /> Sync to WhatsApp{d.pending ? ` (${d.pending})` : ""}
        </Button>
        {d.products.length === 0 && (
          <Button variant="ghost" onClick={importMeta} disabled={busy || !d.catalogId}><RefreshCw size={16} /> Import from WhatsApp</Button>
        )}
      </div>
      {!d.catalogId && <p className="rounded-xl bg-warn/10 px-4 py-2.5 text-sm text-fg">No catalog is connected yet. Products can be prepared here and pushed once it is.</p>}
      {msg && <p className="rounded-xl bg-teal-glow/10 px-4 py-2.5 text-sm text-fg">{msg}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {live.map((p) => <Card key={p.id} p={p} onOpen={() => setOpen(p)} />)}
        {live.length === 0 && <p className="col-span-full glass rounded-2xl p-6 text-center text-sm text-muted">No products yet. Add one, or import what WhatsApp already has.</p>}
      </div>
      {hidden.length > 0 && (
        <details className="text-sm text-muted">
          <summary className="cursor-pointer">Hidden ({hidden.length})</summary>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {hidden.map((p) => <Card key={p.id} p={p} onOpen={() => setOpen(p)} />)}
          </div>
        </details>
      )}
    </div>
  );
}

function Card({ p, onOpen }: { p: Product; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="glass overflow-hidden rounded-2xl text-left">
      <div className="aspect-square bg-base">
        {p.image_path ? <img src={p.image_path} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full place-items-center text-faint"><Camera size={28} /></div>}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold text-fg">{p.name}</p>
        <p className="mt-0.5 flex items-center justify-between text-sm">
          <span className="font-semibold text-fg">{inr(p.price_inr)}</span>
          {p.sync_error ? <AlertTriangle size={14} className="text-danger" /> : pending(p) ? <span className="text-[11px] text-warn">to sync</span> : p.live ? <Check size={14} className="text-success" /> : <span className="text-[11px] text-faint">hidden</span>}
        </p>
        {p.availability === "out of stock" && <p className="text-[11px] text-faint">out of stock</p>}
      </div>
    </button>
  );
}

function Editor({ product, onBack }: { product: Product | null; onBack: () => void }) {
  const [f, setF] = useState({
    id: product?.id || 0,
    name: product?.name || "",
    description: product?.description || "",
    priceInr: product ? String(product.price_inr) : "",
    imagePath: product?.image_path || "",
    videoPath: product?.video_path || "",
    url: product?.url || "",
    category: product?.category || "",
    availability: product?.availability || "in stock",
    live: product ? !!product.live : true,
  });
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState(product?.sync_error ? `Last sync failed: ${product.sync_error}` : "");
  const [candidate, setCandidate] = useState("");
  const [prompt, setPrompt] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: e.target.value });

  const pick = async (file: File | undefined, kind: "image" | "video") => {
    if (!file) return;
    setBusy(kind === "image" ? "Uploading photo…" : "Uploading video…"); setNote("");
    const r = await upload(file);
    setBusy("");
    if (!r.ok || !r.path) { setNote(r.error || "Upload failed."); return; }
    setF((s) => (kind === "image" ? { ...s, imagePath: r.path! } : { ...s, videoPath: r.path! }));
  };

  const generate = async (mode: "clean" | "card" | "prompt") => {
    setBusy(mode === "clean" ? "Making a clean product photo…" : mode === "card" ? "Making a catalogue card…" : "Generating…"); setNote("");
    const r = await adminPost("/api/admin/products/generate", {
      mode, prompt, name: f.name, description: f.description, imagePath: f.imagePath,
    });
    setBusy("");
    if (!r.ok) { setNote(r.error || "Could not generate."); return; }
    setCandidate(r.path);
  };

  const save = async () => {
    setBusy("Saving…"); setNote("");
    const r = await adminPost("/api/admin/products", { action: "save", ...f, priceInr: Number(f.priceInr) || 0 });
    setBusy("");
    if (!r.ok) { setNote(r.error || "Could not save."); return; }
    onBack();
  };
  const remove = async () => {
    if (!f.id || !confirm("Hide this product? It will be removed from WhatsApp on the next sync.")) return;
    await adminPost("/api/admin/products", { action: "delete", id: f.id });
    onBack();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg"><ArrowLeft size={16} /> Store</button>

      {/* Photo first: it is what the customer sees. */}
      <div className="glass overflow-hidden rounded-2xl">
        <div className="relative aspect-square bg-base sm:aspect-[4/3]">
          {(candidate || f.imagePath) ? <img src={candidate || f.imagePath} alt="" className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center text-faint"><Camera size={40} /></div>}
          {candidate && (
            <div className="absolute inset-x-3 bottom-3 flex gap-2 rounded-xl bg-abyss/85 p-2 backdrop-blur">
              <Button size="md" onClick={() => { setF({ ...f, imagePath: candidate }); setCandidate(""); }}><Check size={15} /> Use this</Button>
              <Button size="md" variant="secondary" onClick={() => setCandidate("")}><X size={15} /> Keep old</Button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 p-3">
          <input ref={photoRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files?.[0], "image")} />
          <input ref={videoRef} type="file" accept="video/mp4,video/webm" hidden onChange={(e) => pick(e.target.files?.[0], "video")} />
          <Button size="md" variant="secondary" onClick={() => photoRef.current?.click()}><Camera size={15} /> {f.imagePath ? "Retake photo" : "Take photo"}</Button>
          <Button size="md" variant="secondary" onClick={() => videoRef.current?.click()}><Video size={15} /> {f.videoPath ? "Replace video" : "Add video"}</Button>
          <Button size="md" variant="secondary" disabled={!f.imagePath || !!busy} onClick={() => generate("clean")}><Sparkles size={15} /> Clean photo</Button>
          <Button size="md" variant="secondary" disabled={!f.imagePath || !f.name || !!busy} onClick={() => generate("card")}><Sparkles size={15} /> Catalogue card</Button>
        </div>
        {f.videoPath && <p className="px-3 pb-3 text-xs text-muted">Video attached: sent with the product in chats and broadcasts. <a href={f.videoPath} target="_blank" rel="noreferrer" className="text-brand-luq">Preview</a></p>}
        <div className="flex gap-2 px-3 pb-3">
          <input className={inputClass} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Or describe the picture you want, e.g. navy kurta on a mannequin, white studio background" />
          <Button size="md" variant="secondary" disabled={!prompt.trim() || !!busy} onClick={() => generate("prompt")}><Sparkles size={15} /></Button>
        </div>
      </div>

      <div className="glass space-y-3 rounded-2xl p-4">
        <input className={inputClass} value={f.name} onChange={set("name")} placeholder="Name (what the customer sees)" />
        <div className="grid grid-cols-2 gap-2">
          <input className={inputClass} value={f.priceInr} onChange={set("priceInr")} placeholder="Price ₹" inputMode="numeric" />
          <select className={inputClass} value={f.availability} onChange={set("availability")}>
            <option value="in stock">In stock</option>
            <option value="out of stock">Out of stock</option>
          </select>
        </div>
        <textarea className={inputClass + " min-h-[96px]"} value={f.description} onChange={set("description")} placeholder="Description — fabric, sizes, minimum order, delivery…" />
        <div className="grid grid-cols-2 gap-2">
          <input className={inputClass} value={f.category} onChange={set("category")} placeholder="Category (optional)" />
          <input className={inputClass} value={f.url} onChange={set("url")} placeholder="Link (optional)" />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={f.live} onChange={(e) => setF({ ...f, live: e.target.checked })} /> Show on WhatsApp</label>
      </div>

      {busy && <p className="text-sm text-muted">{busy}</p>}
      {note && <p className="text-sm text-danger">{note}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={save} disabled={!!busy || !f.name}><Check size={16} /> Save</Button>
        {f.id ? <button type="button" onClick={remove} className="text-sm text-faint hover:text-danger">Hide product</button> : null}
        <span className="ml-auto text-xs text-faint">Saved items go to WhatsApp when you press Sync.</span>
      </div>
    </div>
  );
}
