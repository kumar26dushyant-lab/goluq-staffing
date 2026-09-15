/// <reference types="@cloudflare/workers-types" />

import { checkAdmin } from "../../lib/admin";
import { sendAgentReply } from "../../lib/agentReply";
import { getSetting } from "../../lib/settings";
import { upcomingBooking } from "../../lib/bookings";
import { waConfig, waReady, waSendProduct, waSendCtaUrl, type WaEnv } from "../../lib/whatsapp";

interface Env extends WaEnv {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

/**
 * Owner side of conversations — WhatsApp, Telegram and website threads in
 * one inbox, shaped for a messaging app rather than a table:
 *
 * GET ?q=&filter=&before=<last_at>&limit=      → inbox page (search, filter, paging)
 * GET ?id=<session>&before=<msgId>             → a page of the transcript, oldest page first on demand
 * GET ?id=<session>&after=<msgId>              → only what arrived since (cheap poll)
 * POST { id, text }                            → reply as the owner
 * POST { id, action: bot|close|reopen|card|calendar, ... }
 *
 * Opening a thread clears its unread badge; polling with `after` does not
 * touch it, so a thread left open in another tab still counts as read.
 */
const PAGE = 50;
const clip = (v: string | null, n: number) => (v || "").slice(0, n);

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return Response.json({ ok: false, error: "unauthorised" }, { status: 401 });
  const url = new URL(request.url);
  const id = clip(url.searchParams.get("id"), 60);

  if (id) {
    const after = Number(url.searchParams.get("after") || 0);
    const before = Number(url.searchParams.get("before") || 0);
    if (after) {
      const msgs = await env.DB.prepare(`SELECT id, role, content, created_at FROM chat_messages WHERE session_id = ? AND id > ? ORDER BY id LIMIT 200`).bind(id, after).all();
      const s = await env.DB.prepare(`SELECT bot_off, closed, needs_human FROM chat_sessions WHERE id = ?`).bind(id).first();
      return Response.json({ ok: true, messages: msgs.results ?? [], session: s });
    }
    const rows = await env.DB.prepare(
      `SELECT id, role, content, created_at FROM chat_messages WHERE session_id = ? ${before ? "AND id < ?" : ""} ORDER BY id DESC LIMIT ?`
    ).bind(...(before ? [id, before, PAGE + 1] : [id, PAGE + 1])).all<any>();
    const list = (rows.results ?? []).reverse();
    const hasMore = list.length > PAGE;
    if (hasMore) list.shift();
    if (!before) await env.DB.prepare(`UPDATE chat_sessions SET unread_for_agent = 0 WHERE id = ?`).bind(id).run();
    const session = await env.DB.prepare(`SELECT * FROM chat_sessions WHERE id = ?`).bind(id).first<any>();
    const phone = id.startsWith("wa:") ? id.slice(3) : session?.visitor_phone || null;
    const booking = await upcomingBooking(env.DB, phone, null);
    const lead = phone
      ? await env.DB.prepare(`SELECT id, name, status, industry, ref_code FROM leads WHERE phone LIKE ? ORDER BY id DESC LIMIT 1`).bind(`%${String(phone).replace(/\D/g, "").slice(-10)}`).first()
      : null;
    const cards = await env.DB.prepare(`SELECT retailer_id, name FROM products WHERE tenant='goluq' AND live=1 ORDER BY sort_order, id`).all();
    return Response.json({ ok: true, session, messages: list, hasMore, booking, lead, cards: cards.results ?? [], bookingUrl: (await getSetting(env.DB, "booking_url")) || "" });
  }

  const q = clip(url.searchParams.get("q"), 80).trim();
  const filter = clip(url.searchParams.get("filter"), 12);
  const before = clip(url.searchParams.get("before"), 25);
  const where: string[] = ["EXISTS (SELECT 1 FROM chat_messages m WHERE m.session_id = s.id)"];
  const binds: unknown[] = [];
  if (q) {
    where.push(`(s.visitor_name LIKE ? OR s.visitor_phone LIKE ? OR s.id LIKE ? OR EXISTS (SELECT 1 FROM chat_messages m WHERE m.session_id = s.id AND m.content LIKE ? LIMIT 1))`);
    binds.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (filter === "waiting") where.push("s.needs_human = 1 AND s.closed = 0");
  else if (filter === "unread") where.push("s.unread_for_agent > 0");
  else if (filter === "wa") where.push("s.id LIKE 'wa:%'");
  else if (filter === "tg") where.push("s.id LIKE 'tg:%'");
  else if (filter === "web") where.push("s.id NOT LIKE 'wa:%' AND s.id NOT LIKE 'tg:%'");
  else if (filter === "closed") where.push("s.closed = 1");
  if (before) { where.push("s.last_at < ?"); binds.push(before); }
  const rows = await env.DB.prepare(
    `SELECT s.id, s.visitor_name, s.visitor_phone, s.page, s.lang, s.last_at, s.unread_for_agent, s.needs_human, s.bot_off, s.closed, s.ref_code,
            (SELECT content FROM chat_messages m WHERE m.session_id = s.id ORDER BY m.id DESC LIMIT 1) AS last_message,
            (SELECT role FROM chat_messages m WHERE m.session_id = s.id ORDER BY m.id DESC LIMIT 1) AS last_role
       FROM chat_sessions s
      WHERE ${where.join(" AND ")}
      ORDER BY ${filter ? "" : "(s.needs_human = 1 AND s.closed = 0 AND s.last_at >= datetime('now','-7 days')) DESC, "}s.last_at DESC
      LIMIT ${PAGE + 1}`
  ).bind(...binds).all<any>();
  const list = rows.results ?? [];
  const hasMore = list.length > PAGE;
  if (hasMore) list.pop();
  const waiting = await env.DB.prepare(`SELECT COUNT(*) AS n FROM chat_sessions WHERE needs_human = 1 AND closed = 0 AND last_at >= datetime('now','-7 days')`).first<{ n: number }>();
  const unread = await env.DB.prepare(`SELECT COUNT(*) AS n FROM chat_sessions WHERE unread_for_agent > 0 AND last_at >= datetime('now','-30 days')`).first<{ n: number }>();
  return Response.json({ ok: true, chats: list, hasMore, waiting: waiting?.n ?? 0, unread: unread?.n ?? 0 });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return Response.json({ ok: false, error: "unauthorised" }, { status: 401 });
  try {
    const b = await request.json<Record<string, unknown>>();
    const id = String(b.id ?? "").slice(0, 60);
    if (!id) return Response.json({ ok: false, error: "no id" }, { status: 400 });
    const action = String(b.action || "");

    if (action === "bot") {
      const off = b.off === true || b.off === "1" ? 1 : 0;
      await env.DB.prepare("UPDATE chat_sessions SET bot_off = ? WHERE id = ?").bind(off, id).run();
      return Response.json({ ok: true, bot_off: off });
    }
    if (action === "close") {
      await env.DB.prepare(`UPDATE chat_sessions SET closed = 1, needs_human = 0 WHERE id = ?`).bind(id).run();
      return Response.json({ ok: true });
    }
    if (action === "reopen") {
      await env.DB.prepare(`UPDATE chat_sessions SET closed = 0 WHERE id = ?`).bind(id).run();
      return Response.json({ ok: true });
    }
    if (action === "handled") {
      await env.DB.prepare(`UPDATE chat_sessions SET needs_human = 0 WHERE id = ?`).bind(id).run();
      return Response.json({ ok: true });
    }

    // Two things only WhatsApp can carry: a tappable product card and a
    // button to the calendar. Both are recorded in the transcript.
    if (action === "card" || action === "calendar") {
      if (!id.startsWith("wa:")) return Response.json({ ok: false, error: "Cards and buttons only work on WhatsApp threads." });
      const cfg = await waConfig(env.DB, env);
      if (!waReady(cfg)) return Response.json({ ok: false, error: "WhatsApp is not configured." });
      const to = id.slice(3);
      let r: { ok: boolean; error?: string }; let note = "";
      if (action === "card") {
        const rid = String(b.retailerId || "").slice(0, 60);
        const catalog = (await getSetting(env.DB, "wa_catalog_id")) || "";
        if (!rid || !catalog) return Response.json({ ok: false, error: "Pick a card; the catalog must be connected." });
        r = await waSendProduct(cfg, to, catalog, rid, String(b.text || "").slice(0, 1024));
        note = `[Sent product card: ${rid}]`;
      } else {
        const link = (await getSetting(env.DB, "booking_url")) || "";
        if (!link) return Response.json({ ok: false, error: "No booking link in Settings." });
        r = await waSendCtaUrl(cfg, to, String(b.text || "Pick a time that suits you for a 30-minute call with Dushyant:").slice(0, 1024), "Pick a slot", link);
        note = "[Sent the calendar button]";
      }
      if (!r.ok) return Response.json({ ok: false, error: r.error || "not delivered" });
      await env.DB.prepare(`INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (?, 'agent', ?, datetime('now'))`).bind(id, note).run();
      return Response.json({ ok: true });
    }

    const r = await sendAgentReply(env, env.DB, id, String(b.text ?? ""));
    if (!r.ok) return Response.json({ ok: false, error: r.error });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
