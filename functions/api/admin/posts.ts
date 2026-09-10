/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";
import { getSetting, setSetting } from "../../lib/settings";
import { waConfig, type WaEnv } from "../../lib/whatsapp";

interface Env extends WaEnv {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

const GRAPH = "https://graph.facebook.com/v21.0";
const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

/**
 * Publish — posts to the Facebook Page (and Instagram, once linked) from the
 * cockpit, with the same Meta token that runs WhatsApp.
 *
 *   GET                         → posts, connection state, assets to pick from
 *   POST { action: "connect" }  → find the Page the token can manage, keep its
 *                                 page token; report what is missing
 *   POST { action: "save", id?, caption, imageUrl, linkUrl, channels }
 *   POST { action: "publish", id } → publish now
 *   POST { action: "delete", id }
 */
/** Cards that exist in Hindi under public/catalog/hi (composed by marketing/catalog-cards/hi). */
const HINDI_CARDS = new Set([
  "whatsappOffice", "whatsappStore", "tollfree", "virtualNumber", "waApi", "voiceCampaign", "txnSms", "promoSms", "missedCall",
  "automation", "whatsapp", "digitalEmployee", "website", "app", "offline", "platform",
  "for_coaching", "for_clinic", "for_ca", "for_garment", "for_distributor", "for_realestate", "for_restaurant", "for_salon", "for_school", "for_logistics",
  "founder", "thankyou",
]);

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  const posts = await env.DB.prepare(`SELECT * FROM posts ORDER BY id DESC LIMIT 100`).all();
  const products = await env.DB.prepare(`SELECT retailer_id, name, image_path FROM products WHERE tenant='goluq' AND live=1 AND image_path IS NOT NULL ORDER BY sort_order, id`).all();
  return Response.json({
    ok: true,
    posts: posts.results ?? [],
    connection: {
      pageId: (await getSetting(env.DB, "fb_page_id")) || "",
      pageName: (await getSetting(env.DB, "fb_page_name")) || "",
      igId: (await getSetting(env.DB, "ig_user_id")) || "",
      note: (await getSetting(env.DB, "fb_connect_note")) || "",
    },
    assets: (products.results ?? []).flatMap((p: any) => [
      { label: p.name, url: `https://goluq.com${p.image_path}` },
      // The Hindi edition of the same card, for India-facing posts.
      ...(HINDI_CARDS.has(p.retailer_id) ? [{ label: `${p.name} · हिंदी`, url: `https://goluq.com/catalog/hi/${p.retailer_id}.jpg` }] : []),
    ]),
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
    if (action === "connect") return Response.json(await connect(env));

    if (action === "save") {
      const caption = clip(b.caption, 2200);
      if (!caption) return Response.json({ ok: false, error: "Write a caption." }, { status: 400 });
      const imageUrl = /^https:\/\//i.test(clip(b.imageUrl, 500)) ? clip(b.imageUrl, 500) : null;
      const linkUrl = /^https:\/\//i.test(clip(b.linkUrl, 500)) ? clip(b.linkUrl, 500) : null;
      const channels = clip(b.channels, 40) || "facebook";
      const id = Number(b.id) || 0;
      if (id) {
        await env.DB.prepare(`UPDATE posts SET caption=?, image_url=?, link_url=?, channels=?, updated_at=datetime('now') WHERE id=?`)
          .bind(caption, imageUrl, linkUrl, channels, id).run();
        return Response.json({ ok: true, id });
      }
      const r = await env.DB.prepare(`INSERT INTO posts (caption, image_url, link_url, channels, created_at, updated_at) VALUES (?,?,?,?,datetime('now'),datetime('now'))`)
        .bind(caption, imageUrl, linkUrl, channels).run();
      return Response.json({ ok: true, id: Number((r as any)?.meta?.last_row_id || 0) });
    }

    if (action === "delete") {
      await env.DB.prepare(`DELETE FROM posts WHERE id = ? AND status <> 'published'`).bind(Number(b.id)).run();
      return Response.json({ ok: true });
    }

    if (action === "publish") return Response.json(await publish(env, Number(b.id)));

    return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
  } catch (e) {
    return Response.json({ ok: false, error: String(e).slice(0, 300) }, { status: 500 });
  }
};

async function graph(token: string, path: string, method = "GET", body?: Record<string, unknown>): Promise<any> {
  const url = `${GRAPH}/${path}`;
  const r = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j?.error?.error_user_msg || j?.error?.message || `http_${r.status}`);
  return j;
}

/** Which Page can this token post to? Records the page token, or says what is missing. */
async function connect(env: Env) {
  const cfg = await waConfig(env.DB, env);
  if (!cfg.accessToken) return { ok: false, error: "No Meta token in Settings → WhatsApp Business API." };
  let pages: any[] = [];
  try {
    pages = (await graph(cfg.accessToken, "me/accounts?fields=id,name,access_token,instagram_business_account")).data || [];
  } catch (e) {
    const note = `The token cannot list Pages: ${String(e).slice(0, 160)}. In Business Settings → Users → System users, add the Page to this system user and regenerate the token with pages_manage_posts, pages_read_engagement, instagram_basic and instagram_content_publish.`;
    await setSetting(env.DB, "fb_connect_note", note);
    return { ok: false, error: note };
  }
  if (!pages.length) {
    const note = "The token can reach Meta but no Page is assigned to it. Business Settings → Users → System users → Add assets → Pages → GoLuQ.com Digital Consultancy (Manage), then regenerate the token.";
    await setSetting(env.DB, "fb_connect_note", note);
    return { ok: false, error: note };
  }
  const page = pages[0];
  await setSetting(env.DB, "fb_page_id", String(page.id));
  await setSetting(env.DB, "fb_page_name", String(page.name || ""));
  await setSetting(env.DB, "fb_page_token", String(page.access_token || ""));
  await setSetting(env.DB, "ig_user_id", String(page.instagram_business_account?.id || ""));
  await setSetting(env.DB, "fb_connect_note", "");
  return { ok: true, pageId: page.id, pageName: page.name, igId: page.instagram_business_account?.id || "" };
}

async function publish(env: Env, id: number) {
  const post = await env.DB.prepare(`SELECT * FROM posts WHERE id = ?`).bind(id).first<any>();
  if (!post) return { ok: false, error: "Post not found." };
  const pageId = (await getSetting(env.DB, "fb_page_id")) || "";
  const pageToken = (await getSetting(env.DB, "fb_page_token")) || "";
  const igId = (await getSetting(env.DB, "ig_user_id")) || "";
  if (!pageId || !pageToken) return { ok: false, error: "Connect the Page first (Connect button)." };

  const channels = String(post.channels || "facebook").split(",").map((s) => s.trim());
  const caption = post.link_url && !String(post.caption).includes(post.link_url) ? `${post.caption}\n\n${post.link_url}` : post.caption;
  const errors: string[] = [];
  let fbId = post.fb_post_id || null, igPostId = post.ig_post_id || null;

  if (channels.includes("facebook") && !fbId) {
    try {
      const r = post.image_url
        ? await graph(pageToken, `${pageId}/photos`, "POST", { url: post.image_url, message: caption })
        : await graph(pageToken, `${pageId}/feed`, "POST", { message: caption, ...(post.link_url ? { link: post.link_url } : {}) });
      fbId = String(r.post_id || r.id || "");
    } catch (e) {
      errors.push(`Facebook: ${String(e).slice(0, 200)}`);
    }
  }
  if (channels.includes("instagram") && !igPostId) {
    if (!igId) errors.push("Instagram: no Instagram account is linked to the Page yet.");
    else if (!post.image_url) errors.push("Instagram: a picture is required.");
    else {
      try {
        const c = await graph(pageToken, `${igId}/media`, "POST", { image_url: post.image_url, caption });
        const p = await graph(pageToken, `${igId}/media_publish`, "POST", { creation_id: c.id });
        igPostId = String(p.id || "");
      } catch (e) {
        errors.push(`Instagram: ${String(e).slice(0, 200)}`);
      }
    }
  }
  const status = errors.length && !fbId && !igPostId ? "failed" : "published";
  await env.DB.prepare(`UPDATE posts SET status=?, fb_post_id=?, ig_post_id=?, error=?, published_at=CASE WHEN ?='published' THEN datetime('now') ELSE published_at END, updated_at=datetime('now') WHERE id=?`)
    .bind(status, fbId, igPostId, errors.join(" | ") || null, status, id).run();
  return { ok: status === "published", status, fbId, igPostId, error: errors.join(" | ") || undefined };
}
