/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";
import { getSetting } from "../../lib/settings";
import { waConfig, type WaEnv } from "../../lib/whatsapp";

interface Env extends WaEnv {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

const TENANT = "goluq";
const ORIGIN = "https://goluq.com";
const GRAPH = "https://graph.facebook.com/v21.0";

const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "item";

/**
 * The Store: products behind the WhatsApp catalog, managed from a phone.
 *
 *   GET                                  → all products, newest first
 *   POST { action: "save", ...fields }   → create or update (id optional)
 *   POST { action: "delete", id }        → hide and remove from Meta on next sync
 *   POST { action: "sync" }              → push every change to the Meta catalog
 *   POST { action: "import" }            → pull what Meta already has (first run)
 *
 * Nothing here talks to Meta except sync/import, so editing is instant and a
 * bad network never loses a change: the row keeps `sync_error` until it goes.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  const rows = await env.DB.prepare(
    `SELECT * FROM products WHERE tenant = ? ORDER BY live DESC, sort_order, id DESC`
  ).bind(TENANT).all();
  const pending = (rows.results ?? []).filter((p: any) => p.live ? (!p.synced_at || p.synced_at < p.updated_at) : !!p.meta_id).length;
  return Response.json({
    ok: true,
    products: rows.results ?? [],
    pending,
    catalogId: (await getSetting(env.DB, "wa_catalog_id")) || "",
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  let b: Record<string, unknown>;
  try {
    b = await request.json<Record<string, unknown>>();
  } catch {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const action = String(b.action || "");

  try {
    if (action === "save") {
      const id = Number(b.id) || 0;
      const name = clip(b.name, 120);
      if (!name) return Response.json({ ok: false, error: "A name is required." }, { status: 400 });
      const price = Math.max(0, Math.round(Number(b.priceInr) || 0));
      const fields = {
        name,
        description: clip(b.description, 4000) || null,
        price_inr: price,
        image_path: clip(b.imagePath, 300) || null,
        extra_images: JSON.stringify(Array.isArray(b.extraImages) ? (b.extraImages as unknown[]).map((x) => clip(x, 300)).filter(Boolean).slice(0, 8) : []),
        video_path: clip(b.videoPath, 300) || null,
        url: clip(b.url, 300) || null,
        category: clip(b.category, 60) || null,
        availability: clip(b.availability, 20) === "out of stock" ? "out of stock" : "in stock",
        sort_order: Number(b.sortOrder) || 0,
        live: b.live === false || b.live === 0 ? 0 : 1,
      };
      if (id) {
        await env.DB.prepare(
          `UPDATE products SET name=?, description=?, price_inr=?, image_path=?, extra_images=?, video_path=?, url=?, category=?,
                  availability=?, sort_order=?, live=?, updated_at=datetime('now') WHERE id=? AND tenant=?`
        ).bind(fields.name, fields.description, fields.price_inr, fields.image_path, fields.extra_images, fields.video_path,
               fields.url, fields.category, fields.availability, fields.sort_order, fields.live, id, TENANT).run();
        return Response.json({ ok: true, id });
      }
      let rid = clip(b.retailerId, 60) || slug(name);
      // Keep retailer ids unique per tenant without making the owner think about it.
      const clash = await env.DB.prepare("SELECT 1 AS x FROM products WHERE tenant=? AND retailer_id=?").bind(TENANT, rid).first();
      if (clash) rid = `${rid}-${Date.now().toString(36).slice(-4)}`;
      const r = await env.DB.prepare(
        `INSERT INTO products (tenant, retailer_id, name, description, price_inr, image_path, extra_images, video_path, url, category,
                               availability, sort_order, live, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`
      ).bind(TENANT, rid, fields.name, fields.description, fields.price_inr, fields.image_path, fields.extra_images, fields.video_path,
             fields.url, fields.category, fields.availability, fields.sort_order, fields.live).run();
      return Response.json({ ok: true, id: Number((r as any)?.meta?.last_row_id || 0), retailerId: rid });
    }

    if (action === "delete") {
      await env.DB.prepare("UPDATE products SET live = 0, updated_at = datetime('now') WHERE id = ? AND tenant = ?")
        .bind(Number(b.id), TENANT).run();
      return Response.json({ ok: true });
    }

    // Meta keeps a catalog in creation order and the WhatsApp store shows it
    // oldest-first (Commerce Manager shows the same list newest-first, which
    // is what misled the first pass). To control what the customer sees,
    // remove everything from Meta and recreate it in sort order, so the
    // founder card is created first and shows first. Local rows are untouched.
    // `order: "desc"` is kept for the day Meta flips it again.
    if (action === "reorder") {
      const cfg = await waConfig(env.DB, env);
      const catalog = (await getSetting(env.DB, "wa_catalog_id")) || "";
      if (!catalog || !cfg.accessToken) return Response.json({ ok: false, error: "No catalog connected yet." });
      const rows = await env.DB.prepare("SELECT id, meta_id FROM products WHERE tenant = ? AND meta_id IS NOT NULL").bind(TENANT).all<any>();
      for (const p of rows.results ?? []) {
        try { await graph(cfg.accessToken, p.meta_id, "DELETE"); } catch { /* already gone */ }
        await env.DB.prepare("UPDATE products SET meta_id = NULL, synced_at = NULL WHERE id = ?").bind(p.id).run();
      }
      await env.DB.prepare("UPDATE products SET updated_at = datetime('now') WHERE tenant = ?").bind(TENANT).run();
      return await syncToMeta(env, true, b.order === "desc" ? "DESC" : "ASC");
    }
    // Collections. The order WhatsApp shows a flat catalog in is Meta's and the
    // app's, not ours (see MASTER §catalog). Product sets are the one thing
    // that gives the customer a structure regardless: they appear as
    // collections at the top of the catalog. Idempotent: existing sets with
    // the same name are updated, so this can run after every sync.
    if (action === "sets") return Response.json(await ensureSets(env));
    if (action === "import") return await importFromMeta(env);
    // force: push every live product again (used after images change on disk).
    if (action === "sync") {
      const r = await syncToMeta(env, b.force === true);
      // Collections ride along with every sync, so the catalog always has its sections.
      const sets = await ensureSets(env).catch((e) => ({ ok: false, created: 0, updated: 0, error: String(e).slice(0, 120) }));
      const j: any = await r.json().catch(() => ({}));
      return Response.json({ ...j, sets });
    }

    return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
  } catch (e) {
    return Response.json({ ok: false, error: String(e).slice(0, 300) }, { status: 500 });
  }
};

async function graph(token: string, path: string, method = "GET", body?: unknown): Promise<any> {
  const r = await fetch(`${GRAPH}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j?.error?.error_user_msg || j?.error?.message || `http_${r.status}`);
  return j;
}

/** First run: whatever the Meta catalog already holds becomes local rows. */
async function importFromMeta(env: Env): Promise<Response> {
  const cfg = await waConfig(env.DB, env);
  const catalog = (await getSetting(env.DB, "wa_catalog_id")) || "";
  if (!catalog || !cfg.accessToken) return Response.json({ ok: false, error: "No catalog connected yet." });
  const j = await graph(cfg.accessToken, `${catalog}/products?fields=id,retailer_id,name,description,price,image_url,url,availability&limit=200`);
  let n = 0;
  for (const p of j.data || []) {
    const rid = String(p.retailer_id || slug(String(p.name || "")));
    const exists = await env.DB.prepare("SELECT id FROM products WHERE tenant=? AND retailer_id=?").bind(TENANT, rid).first<{ id: number }>();
    // Prefer the live pricing row (exact rupees) over Meta's formatted string.
    const priced = await env.DB.prepare("SELECT price_inr, offer_price_inr, category FROM pricing WHERE id = ?").bind(rid)
      .first<{ price_inr: number; offer_price_inr: number | null; category: string | null }>();
    const price = priced ? Math.round(Number(priced.offer_price_inr || priced.price_inr)) : Number(String(p.price || "").replace(/[^\d]/g, "").replace(/00$/, "")) || 0;
    const img = String(p.image_url || "").startsWith(ORIGIN) ? String(p.image_url).slice(ORIGIN.length) : String(p.image_url || "");
    const url = String(p.url || "").startsWith(ORIGIN) ? String(p.url).slice(ORIGIN.length) : String(p.url || "");
    if (exists) {
      await env.DB.prepare("UPDATE products SET meta_id = ?, synced_at = datetime('now') WHERE id = ?").bind(String(p.id), exists.id).run();
      continue;
    }
    await env.DB.prepare(
      `INSERT INTO products (tenant, retailer_id, name, description, price_inr, image_path, extra_images, url, category, availability,
                             live, meta_id, synced_at, created_at, updated_at)
       VALUES (?,?,?,?,?,?,'[]',?,?,?,1,?,datetime('now'),datetime('now'),datetime('now'))`
    ).bind(TENANT, rid, clip(p.name, 120), clip(p.description, 4000) || null, price, img || null, url || null,
           priced?.category || null, String(p.availability || "in stock").replace("_", " "), String(p.id)).run();
    n++;
  }
  return Response.json({ ok: true, imported: n });
}

/** Push every local change to Meta: create, update, or remove. */
async function syncToMeta(env: Env, force = false, order: "ASC" | "DESC" = "ASC"): Promise<Response> {
  const cfg = await waConfig(env.DB, env);
  const catalog = (await getSetting(env.DB, "wa_catalog_id")) || "";
  if (!catalog || !cfg.accessToken) return Response.json({ ok: false, error: "No catalog connected yet." });
  const rows = await env.DB.prepare(`SELECT * FROM products WHERE tenant = ? ORDER BY sort_order ${order}, id ${order}`).bind(TENANT).all<any>();
  let created = 0, updated = 0, removed = 0, failed = 0;
  for (const p of rows.results ?? []) {
    const abs = (path: string | null) => (path ? (path.startsWith("http") ? path : ORIGIN + path) : "");
    try {
      if (!p.live) {
        if (p.meta_id) {
          await graph(cfg.accessToken, p.meta_id, "DELETE");
          await env.DB.prepare("UPDATE products SET meta_id = NULL, synced_at = datetime('now'), sync_error = NULL WHERE id = ?").bind(p.id).run();
          removed++;
        }
        continue;
      }
      if (!force && p.synced_at && p.synced_at >= p.updated_at && p.meta_id) continue;
      if (!p.image_path) throw new Error("needs a photo before it can go to WhatsApp");
      const extra = (() => { try { return JSON.parse(p.extra_images || "[]"); } catch { return []; } })();
      // One catalog per WhatsApp number and one language per catalog is Meta's
      // rule. So the Hindi edition of a card is the product's second picture
      // (swipe on the card), and the words say the build comes in any language.
      if (HINDI_CARDS.has(p.retailer_id) && !extra.includes(`/catalog/hi/${p.retailer_id}.jpg`)) extra.unshift(`/catalog/hi/${p.retailer_id}.jpg`);
      // Meta caches a product image by its URL. A changed picture at the same
      // path never shows up, so the URL carries a version stamp.
      const stamp = Date.now().toString(36);
      const versioned = (path: string | null) => (abs(path) ? `${abs(path)}${abs(path).includes("?") ? "&" : "?"}v=${stamp}` : "");
      const data: Record<string, unknown> = {
        name: p.name,
        description: withLanguageLine(p.description || p.name),
        price: Math.round(p.price_inr) * 100,
        currency: "INR",
        availability: p.availability === "out of stock" ? "out of stock" : "in stock",
        condition: "new",
        brand: "GoLuQ.com Digital Consultancy",
        image_url: versioned(p.image_path),
        ...(extra.length ? { additional_image_urls: extra.map((x: string) => versioned(x)) } : {}),
        url: abs(p.url) || `${ORIGIN}/services`,
      };
      if (p.meta_id) {
        await graph(cfg.accessToken, p.meta_id, "POST", data);
        updated++;
      } else {
        const made = await graph(cfg.accessToken, `${catalog}/products`, "POST", { retailer_id: p.retailer_id, ...data });
        await env.DB.prepare("UPDATE products SET meta_id = ? WHERE id = ?").bind(String(made.id), p.id).run();
        created++;
      }
      await env.DB.prepare("UPDATE products SET synced_at = datetime('now'), sync_error = NULL WHERE id = ?").bind(p.id).run();
    } catch (e) {
      failed++;
      await env.DB.prepare("UPDATE products SET sync_error = ? WHERE id = ?").bind(String(e).slice(0, 300), p.id).run();
    }
  }
  return Response.json({ ok: true, created, updated, removed, failed });
}

/** Collection name → retailer ids, in the order the customer should read them. */
const SETS: { name: string; ids: string[] }[] = [
  { name: "Start here", ids: ["founder", "whatsappOffice", "whatsappStore", "thankyou"] },
  { name: "Complete systems", ids: ["whatsappOffice", "officeManaged", "whatsappStore", "storeManaged"] },
  { name: "For your business", ids: ["for_coaching", "for_clinic", "for_ca", "for_garment", "for_distributor", "for_realestate", "for_restaurant", "for_salon", "for_school", "for_logistics"] },
  { name: "By department", ids: ["dept_allinone", "dept_operations", "dept_crm", "dept_billing", "dept_inventory", "dept_hr", "dept_training", "dept_vendors", "dept_support", "dept_field", "dept_dashboard"] },
  { name: "Numbers, calls and SMS", ids: ["tollfree", "virtualNumber", "waApi", "voiceCampaign", "txnSms", "promoSms", "missedCall"] },
  { name: "Software builds", ids: ["automation", "whatsapp", "digitalEmployee", "website", "app", "offline", "platform"] },
];

async function ensureSets(env: Env): Promise<{ ok: boolean; created: number; updated: number; error?: string }> {
  const cfg = await waConfig(env.DB, env);
  const catalog = (await getSetting(env.DB, "wa_catalog_id")) || "";
  if (!catalog || !cfg.accessToken) return { ok: false, created: 0, updated: 0, error: "No catalog connected yet." };
  let existing: { id: string; name: string }[] = [];
  try {
    existing = ((await graph(cfg.accessToken, `${catalog}/product_sets?fields=id,name&limit=100`)).data || []) as { id: string; name: string }[];
  } catch (e) {
    return { ok: false, created: 0, updated: 0, error: String(e).slice(0, 200) };
  }
  let created = 0, updated = 0;
  for (const set of SETS) {
    const filter = { retailer_id: { is_any: set.ids } };
    const found = existing.find((x) => x.name === set.name);
    try {
      if (found) { await graph(cfg.accessToken, found.id, "POST", { name: set.name, filter: JSON.stringify(filter) }); updated++; }
      else { await graph(cfg.accessToken, `${catalog}/product_sets`, "POST", { name: set.name, filter: JSON.stringify(filter) }); created++; }
    } catch (e) {
      return { ok: false, created, updated, error: `${set.name}: ${String(e).slice(0, 160)}` };
    }
  }
  return { ok: true, created, updated };
}

/** Cards that exist in Hindi under public/catalog/hi. */
const HINDI_CARDS = new Set([
  "whatsappOffice", "whatsappStore", "tollfree", "virtualNumber", "waApi", "voiceCampaign", "txnSms", "promoSms", "missedCall",
  "automation", "whatsapp", "digitalEmployee", "website", "app", "offline", "platform",
  "for_coaching", "for_clinic", "for_ca", "for_garment", "for_distributor", "for_realestate", "for_restaurant", "for_salon", "for_school", "for_logistics",
  "founder", "thankyou",
  "dept_allinone", "dept_operations", "dept_crm", "dept_billing", "dept_inventory", "dept_hr", "dept_training", "dept_vendors", "dept_support", "dept_field", "dept_dashboard",
]);
const LANG_LINE = "Built, trained and reported in Hindi, English or any language your customers use. हिंदी में बात करें — हम हिंदी, अंग्रेज़ी या आपकी किसी भी भाषा में बनाते और ट्रेन करते हैं।";
function withLanguageLine(d: string): string {
  return d.includes("any language") ? d : `${d}\n\n${LANG_LINE}`.slice(0, 9999);
}
