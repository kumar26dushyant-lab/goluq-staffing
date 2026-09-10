/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";
import { geminiEnabled, geminiText, type GeminiEnv } from "../../lib/gemini";
import { tgAlertOwner, tgEscape } from "../../lib/telegram";
import { issuePaymentLink, type PayEnv } from "../../lib/payments";

interface Env extends PayEnv, GeminiEnv {
  ADMIN_SECRET?: string;
}

/**
 * Two owner briefings on Telegram, both driven by cron on the VM:
 *
 *   ?job=calls   (hourly)  → for every call starting in the next 30–90 minutes:
 *                            who, when, what they wrote on the booking form,
 *                            anything they said to the guide before, and a
 *                            suggested opening question.
 *   ?job=weekly  (Monday)  → the funnel for the last 7 days: visitors by
 *                            country and source, chats, enquiries, bookings,
 *                            and which channel produced the enquiries.
 *
 * Numbers only from our own tables; the "suggested opener" is the one line
 * written by the model, and it is labelled as a suggestion.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  const job = new URL(request.url).searchParams.get("job") || "calls";
  try {
    if (job === "weekly") return Response.json(await weekly(env));
    if (job === "payments") return Response.json(await payments(env));
    return Response.json(await calls(env));
  } catch (e) {
    return Response.json({ ok: false, error: String(e).slice(0, 300) }, { status: 500 });
  }
};

const IST = (s: string) =>
  new Date(s.replace(" ", "T") + "Z").toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", hour: "numeric", minute: "2-digit" });

async function calls(env: Env) {
  const rows = await env.DB.prepare(
    `SELECT id, name, email, phone, starts_at, meet_url, note FROM bookings
      WHERE status = 'booked' AND briefed_at IS NULL
        AND starts_at BETWEEN datetime('now','+30 minutes') AND datetime('now','+90 minutes')
      ORDER BY starts_at`
  ).all<{ id: number; name: string; email: string | null; phone: string | null; starts_at: string; meet_url: string | null; note: string | null }>();
  let sent = 0;
  for (const b of rows.results ?? []) {
    // What this person already told the guide, if they came through chat.
    let history = "";
    if (b.phone) {
      const last10 = b.phone.replace(/\D/g, "").slice(-10);
      const msgs = await env.DB.prepare(
        `SELECT m.role, m.content FROM chat_messages m
          WHERE m.session_id LIKE ? ORDER BY m.id DESC LIMIT 6`
      ).bind(`wa:%${last10}`).all<{ role: string; content: string }>();
      history = (msgs.results ?? []).reverse().map((m) => `${m.role === "visitor" ? "Them" : "Guide"}: ${m.content.slice(0, 160)}`).join("\n");
      const lead = await env.DB.prepare(`SELECT industry, role, message, source FROM leads WHERE phone LIKE ? ORDER BY id DESC LIMIT 1`)
        .bind(`%${last10}`).first<{ industry: string | null; role: string | null; message: string | null; source: string | null }>();
      if (lead) history = `Enquiry: ${[lead.industry, lead.role, lead.source].filter(Boolean).join(" · ")}${lead.message ? `\n"${lead.message.slice(0, 200)}"` : ""}\n${history}`;
    }
    let opener = "";
    if (geminiEnabled(env)) {
      opener = (await geminiText(env,
        `You prepare a consultant for a 30-minute discovery call with a small-business owner. From the notes below, write ONE opening question (max 25 words) that shows you read their answer and moves straight to their problem. Plain words, no greeting, no pitch.\n\nBooking form answer: ${b.note || "(none)"}\n${history ? `Earlier conversation:\n${history}` : ""}`,
        80)).trim();
    }
    const lines = [
      `📞 <b>Call in ~1 hour</b> · ${tgEscape(b.name)}`,
      `🕒 ${tgEscape(IST(b.starts_at))} IST`,
      b.phone ? `📱 ${tgEscape(b.phone)}` : "",
      b.email ? `✉️ ${tgEscape(b.email)}` : "",
      b.note ? `\n<b>They wrote:</b> <i>${tgEscape(b.note.slice(0, 600))}</i>` : "",
      history ? `\n<b>Before this:</b>\n${tgEscape(history.slice(0, 700))}` : "",
      opener ? `\n<b>Suggested opener:</b> ${tgEscape(opener)}` : "",
    ].filter(Boolean);
    const r = await tgAlertOwner(env.DB, env, lines.join("\n"), {
      buttons: [[
        ...(b.meet_url ? [{ text: "Join Meet", url: b.meet_url }] : []),
        ...(b.phone ? [{ text: "Open WhatsApp", url: `https://wa.me/${b.phone.replace(/\D/g, "")}` }] : []),
      ]],
    });
    if (r.ok) {
      await env.DB.prepare("UPDATE bookings SET briefed_at = datetime('now') WHERE id = ?").bind(b.id).run();
      sent++;
    }
  }
  return { ok: true, briefed: sent };
}

/**
 * ?job=payments (every 15 minutes): the founder-call link is valid until half
 * an hour after the call. When that passes unpaid, the call is marked done and
 * a fresh 7-day link goes out — once. Anything after that is the owner's call,
 * from the cockpit.
 */
async function payments(env: Env) {
  const rows = await env.DB.prepare(
    `SELECT b.id, b.name, b.email, b.phone, b.ends_at, b.starts_at, p.id AS pay_id, p.phone AS pay_phone, p.amount_inr, p.description
       FROM bookings b JOIN payments p ON p.booking_id = b.id AND p.kind = 'call' AND p.status = 'issued'
      WHERE b.status = 'booked'
        AND COALESCE(b.ends_at, datetime(b.starts_at, '+30 minutes')) <= datetime('now','-30 minutes')
        AND NOT EXISTS (SELECT 1 FROM payments q WHERE q.booking_id = b.id AND q.status = 'paid')
      ORDER BY b.id`
  ).all<{ id: number; name: string; email: string | null; phone: string | null; ends_at: string | null; starts_at: string; pay_id: number; pay_phone: string | null; amount_inr: number; description: string }>();
  let renewed = 0;
  for (const b of rows.results ?? []) {
    await env.DB.prepare("UPDATE payments SET status = 'expired' WHERE id = ?").bind(b.pay_id).run();
    await env.DB.prepare("UPDATE bookings SET status = 'done', updated_at = datetime('now') WHERE id = ?").bind(b.id).run();
    const phone = b.pay_phone || b.phone;
    const s = phone ? await env.DB.prepare("SELECT lang FROM chat_sessions WHERE id = ?").bind(`wa:${phone.replace(/\D/g, "")}`).first<{ lang: string | null }>() : null;
    const hi = s?.lang === "hi";
    const r = await issuePaymentLink(env, {
      kind: "call", bookingId: b.id, phone, email: b.email, name: b.name, amountInr: b.amount_inr, description: b.description, lang: s?.lang ?? null, by: "after the call",
      intro: hi
        ? `उम्मीद है दुष्यंत के साथ बातचीत काम की रही। ${b.description} के लिए ₹${b.amount_inr.toLocaleString("en-IN")} का नया पेमेंट लिंक यह रहा — 7 दिन तक चलेगा।`
        : `Hope the conversation with Dushyant was useful. Here is a fresh ₹${b.amount_inr.toLocaleString("en-IN")} payment link for ${b.description} — valid for 7 days.`,
    });
    if (r.ok) renewed++;
    else console.log("renew link failed:", r.error);
  }
  // Calls that ended without any link (free ones) are simply done.
  await env.DB.prepare(
    `UPDATE bookings SET status = 'done', updated_at = datetime('now')
      WHERE status = 'booked' AND COALESCE(ends_at, datetime(starts_at, '+30 minutes')) <= datetime('now','-30 minutes')
        AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.booking_id = bookings.id AND p.status = 'issued')`
  ).run();
  return { ok: true, renewed };
}

async function weekly(env: Env) {
  const n = async (sql: string) => (await env.DB.prepare(sql).first<number>("c")) ?? 0;
  const list = async (sql: string) => ((await env.DB.prepare(sql).all<{ k: string; c: number }>()).results ?? []);
  const wk = "datetime('now','-7 days')";
  const sessions = await n(`SELECT COUNT(DISTINCT session_id) AS c FROM visits WHERE created_at >= ${wk}`);
  const prevSessions = await n(`SELECT COUNT(DISTINCT session_id) AS c FROM visits WHERE created_at >= datetime('now','-14 days') AND created_at < ${wk}`);
  const countries = await list(`SELECT COALESCE(NULLIF(country,''),'?') AS k, COUNT(DISTINCT session_id) AS c FROM visits WHERE created_at >= ${wk} GROUP BY k ORDER BY c DESC LIMIT 6`);
  const sources = await list(`SELECT COALESCE(NULLIF(utm_source,''), NULLIF(referrer_host,''), 'direct') AS k, COUNT(DISTINCT session_id) AS c FROM visits WHERE created_at >= ${wk} GROUP BY k ORDER BY c DESC LIMIT 6`);
  const chatsWa = await n(`SELECT COUNT(DISTINCT session_id) AS c FROM chat_messages WHERE role='visitor' AND session_id LIKE 'wa:%' AND created_at >= ${wk}`);
  const chatsWeb = await n(`SELECT COUNT(DISTINCT session_id) AS c FROM chat_messages WHERE role='visitor' AND session_id NOT LIKE 'wa:%' AND created_at >= ${wk}`);
  const leads = await n(`SELECT COUNT(*) AS c FROM leads WHERE created_at >= ${wk}`);
  const leadSources = await list(`SELECT COALESCE(NULLIF(source,''),'direct') AS k, COUNT(*) AS c FROM leads WHERE created_at >= ${wk} GROUP BY k ORDER BY c DESC LIMIT 5`);
  const bookings = await n(`SELECT COUNT(*) AS c FROM bookings WHERE created_at >= ${wk} AND status <> 'cancelled'`);
  const converted = await n(`SELECT COUNT(*) AS c FROM leads WHERE converted_at >= ${wk}`);
  const paid = (await env.DB.prepare(`SELECT COALESCE(SUM(amount_inr),0) AS s FROM commissions WHERE created_at >= ${wk}`).first<number>("s")) ?? 0;
  const pending = await n(`SELECT COUNT(*) AS c FROM leads WHERE COALESCE(status,'new') IN ('new','engaged') AND created_at >= datetime('now','-30 days')`);

  const row = (xs: { k: string; c: number }[]) => xs.map((x) => `${tgEscape(x.k)} ${x.c}`).join(" · ") || "—";
  const delta = prevSessions ? ` (${sessions >= prevSessions ? "+" : ""}${Math.round(((sessions - prevSessions) / prevSessions) * 100)}% vs last week)` : "";
  const text = [
    `📊 <b>GoLuQ week</b> · last 7 days`,
    "",
    `👀 Visitors <b>${sessions}</b>${delta}`,
    `   by country: ${row(countries)}`,
    `   by source: ${row(sources)}`,
    `💬 Conversations: WhatsApp <b>${chatsWa}</b> · website <b>${chatsWeb}</b>`,
    `🟢 Enquiries <b>${leads}</b> — from: ${row(leadSources)}`,
    `📅 Calls booked <b>${bookings}</b> · Customers won <b>${converted}</b>`,
    paid ? `🤝 Partner commission booked ₹${Math.round(paid).toLocaleString("en-IN")}` : "",
    `⏳ Open opportunities (30 days): <b>${pending}</b>`,
    "",
    leads === 0 && sessions > 0
      ? "<i>Visitors without enquiries: the story is being seen but not acted on. Check which pages they leave from on the Visitors tab.</i>"
      : "<i>The channel producing enquiries is the one to spend on this week.</i>",
  ].filter((l) => l !== "");
  const r = await tgAlertOwner(env.DB, env, text.join("\n"));
  return { ok: r.ok, sessions, leads, bookings };
}
