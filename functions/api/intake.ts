/// <reference types="@cloudflare/workers-types" />

import { geminiEnabled, geminiJson, geminiTranscribe, type GeminiEnv } from "../lib/gemini";
import { sendMail, mailEnabled, type MailEnv } from "../lib/mailer";
import { getOwnerEmail, getSetting } from "../lib/settings";
import { customerFromRequest, notLoggedIn } from "../lib/portal";
import { tgAlertOwner, tgEscape, type TgEnv } from "../lib/telegram";
import { upcomingBooking } from "../lib/bookings";

interface Env extends GeminiEnv, MailEnv, TgEnv {
  DB: D1Database;
}

/**
 * Self-service intake — the client tells us what slows their business down,
 * in their own words, by voice or text, and leaves with a written plan.
 *
 *   POST { action: "transcribe", mime, audio }                  → { text }
 *   POST { action: "ask", ctx, history }                        → { question | null, done }
 *   POST { action: "draft", ctx, history }                      → { brd }
 *   POST { action: "submit", ctx, history, brd, contact, source } → { id, bookingUrl }
 *   GET                                                          → my briefs
 *
 * ctx = { lang, businessType, departments[], text }
 * history = [{ q, a }]  — the guide's follow-up questions and the answers.
 * Everything requires a signed-in customer (see /api/auth/otp, /api/auth/google).
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const me = await customerFromRequest(env.DB, request);
  if (!me) return notLoggedIn();
  let b: any;
  try { b = await request.json(); } catch { return Response.json({ ok: false, error: "bad_request" }, { status: 400 }); }
  const action = String(b.action || "");
  const ctx = cleanCtx(b.ctx);
  const history = cleanHistory(b.history);

  if (action === "transcribe") {
    if (!geminiEnabled(env)) return Response.json({ ok: false, error: "unavailable" }, { status: 503 });
    const audio = String(b.audio || "");
    const mime = String(b.mime || "audio/webm").slice(0, 60);
    if (!audio || audio.length > 12_000_000) return Response.json({ ok: false, error: "bad_audio" }, { status: 400 });
    const text = await geminiTranscribe(env, mime, audio, ctx.lang);
    return Response.json({ ok: true, text });
  }

  if (action === "ask") {
    if (history.length >= 4 || !geminiEnabled(env)) return Response.json({ ok: true, question: null, done: true });
    const out = await geminiJson<{ question?: string; done?: boolean }>(env, askPrompt(ctx, history), 300);
    const q = String(out?.question || "").trim();
    return Response.json({ ok: true, question: out?.done || !q ? null : q, done: Boolean(out?.done) || !q });
  }

  if (action === "draft") {
    if (!geminiEnabled(env)) return Response.json({ ok: false, error: "unavailable" }, { status: 503 });
    const brd = await geminiJson<Brd>(env, draftPrompt(ctx, history), 1800);
    if (!brd || !brd.summary) return Response.json({ ok: false, error: "draft_failed" }, { status: 502 });
    return Response.json({ ok: true, brd: cleanBrd(brd) });
  }

  if (action === "submit") {
    const brd = cleanBrd(b.brd || {});
    const c = b.contact || {};
    const name = String(c.name || me.name || "").trim().slice(0, 120);
    let phone = String(c.phone || "").replace(/\D/g, "").replace(/^0+/, "");
    if (phone.length === 10) phone = "91" + phone;
    const email = String(c.email || me.email || "").trim().toLowerCase().slice(0, 200);
    const company = String(c.company || "").trim().slice(0, 160);
    if (!name || phone.length < 11) return Response.json({ ok: false, error: "need_name_phone" }, { status: 400 });
    const source = String(b.source || "").slice(0, 200);

    const ins = await env.DB.prepare(
      `INSERT INTO briefs (customer_id, lang, business_type, departments, raw_text, history, brd, name, phone, email, company, source, status, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'new',datetime('now'),datetime('now'))`
    ).bind(me.id, ctx.lang, ctx.businessType, JSON.stringify(ctx.departments), ctx.text, JSON.stringify(history), JSON.stringify(brd), name, phone, email || null, company || null, source).run();
    const id = Number((ins as any)?.meta?.last_row_id || 0);

    // The customer row learns the real number and name; the lead list gets a
    // row so follow-ups and the Enquiries screen see this person like any other.
    const taken = await env.DB.prepare("SELECT id FROM customers WHERE phone = ? AND id <> ?").bind(phone, me.id).first();
    await env.DB.prepare(`UPDATE customers SET name = ?, company = COALESCE(NULLIF(?, ''), company), email = COALESCE(email, ?)${taken ? "" : ", phone = ?"} WHERE id = ?`)
      .bind(...(taken ? [name, company, email || null, me.id] : [name, company, email || null, phone, me.id])).run();
    await env.DB.prepare(
      `INSERT INTO leads (name, phone, email, message, industry, source, landing, created_at, status)
       VALUES (?,?,?,?,?,?,?,datetime('now'),'engaged')`
    ).bind(name, phone, email || null, `[Intake #${id}] ${brd.summary}`.slice(0, 2000), ctx.businessType, source || "intake", "/start").run().catch(() => {});

    const bookingUrl = (await getSetting(env.DB, "booking_url")) || "";
    const hi = ctx.lang === "hi";

    await tgAlertOwner(env.DB, env, [
      `📝 <b>New brief</b> · ${tgEscape(name)}${company ? ` · ${tgEscape(company)}` : ""}`,
      `${tgEscape(ctx.businessType || "business")} · ${tgEscape(ctx.departments.join(", ") || "—")}`,
      `📱 ${tgEscape(phone)}${email ? ` · ✉️ ${tgEscape(email)}` : ""}`,
      "",
      `<b>${tgEscape(brd.title || "Plan")}</b>`,
      tgEscape(brd.summary.slice(0, 700)),
      brd.goals.length ? `\n<b>Goals:</b> ${tgEscape(brd.goals.slice(0, 4).join(" · "))}` : "",
      brd.open_questions.length ? `\n<b>Open:</b> ${tgEscape(brd.open_questions.slice(0, 3).join(" · "))}` : "",
    ].filter((l) => l !== "").join("\n"), {
      buttons: [[{ text: "Open WhatsApp", url: `https://wa.me/${phone}` }, { text: "Cockpit", url: "https://goluq.com/admin#briefs" }]],
    }).catch(() => {});

    if (mailEnabled(env)) {
      const owner = await getOwnerEmail(env.DB);
      if (owner) {
        await sendMail(env, { to: owner, subject: `New brief: ${name} — ${brd.title || ctx.businessType}`, text: brdText(brd, { name, phone, email, company, businessType: ctx.businessType, departments: ctx.departments }) }).catch(() => {});
      }
      if (email) {
        await sendMail(env, {
          to: email,
          subject: hi ? `आपका GoLuQ प्लान — ${brd.title || "आपकी ज़रूरत"}` : `Your GoLuQ plan — ${brd.title || "what you told us"}`,
          text: [
            hi ? `नमस्ते ${name},` : `Hi ${name},`,
            "",
            hi ? "आपने जो बताया, उसका लिखित प्लान नीचे है। दुष्यंत ने इसे पढ़ लिया है और अगला कदम 30 मिनट की कॉल है — वहीं तय कोटेशन मिलेगा।" : "Here is the written plan from what you told us. Dushyant has it, and the next step is a 30-minute call, where you get a fixed quote.",
            bookingUrl ? (hi ? `समय चुनें: ${bookingUrl}` : `Pick a time: ${bookingUrl}`) : "",
            "",
            brdText(brd),
            "",
            hi ? "— दुष्यंत शर्मा, GoLuQ.com Digital Consultancy" : "— Dushyant Sharma, GoLuQ.com Digital Consultancy",
          ].filter((l) => l !== "").join("\n"),
        }).catch(() => {});
      }
    }
    const booking = await upcomingBooking(env.DB, phone, email || null);
    return Response.json({ ok: true, id, bookingUrl, booking });
  }

  return Response.json({ ok: false, error: "unknown_action" }, { status: 400 });
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const me = await customerFromRequest(env.DB, request);
  if (!me) return notLoggedIn();
  const rows = await env.DB.prepare("SELECT id, business_type, brd, status, created_at FROM briefs WHERE customer_id = ? ORDER BY id DESC LIMIT 20").bind(me.id).all<any>();
  const booking = await upcomingBooking(env.DB, me.phone.startsWith("email:") ? null : me.phone, me.email);
  return Response.json({ ok: true, customer: me, booking, briefs: (rows.results ?? []).map((r) => ({ ...r, brd: parse(r.brd) })) });
};

// ── shapes ─────────────────────────────────────────────────────────────────

interface Ctx { lang: string; businessType: string; departments: string[]; text: string }
export interface Brd {
  title: string;
  summary: string;
  goals: string[];
  users: string[];
  scenarios: { name: string; steps: string[] }[];
  integrations: string[];
  timeline: string;
  open_questions: string[];
}

function cleanCtx(v: any): Ctx {
  return {
    lang: String(v?.lang || "en").startsWith("hi") ? "hi" : "en",
    businessType: String(v?.businessType || "").slice(0, 80),
    departments: Array.isArray(v?.departments) ? v.departments.map((d: unknown) => String(d).slice(0, 60)).slice(0, 12) : [],
    text: String(v?.text || "").slice(0, 6000),
  };
}
function cleanHistory(v: any): { q: string; a: string }[] {
  return Array.isArray(v) ? v.slice(0, 6).map((h: any) => ({ q: String(h?.q || "").slice(0, 400), a: String(h?.a || "").slice(0, 2000) })) : [];
}
const strs = (v: any, n = 12, len = 300) => (Array.isArray(v) ? v.map((x) => String(typeof x === "string" ? x : x?.name || x?.text || "").trim().slice(0, len)).filter(Boolean).slice(0, n) : []);
function cleanBrd(v: any): Brd {
  return {
    title: String(v?.title || "").slice(0, 120),
    summary: String(v?.summary || "").slice(0, 1500),
    goals: strs(v?.goals),
    users: strs(v?.users),
    scenarios: Array.isArray(v?.scenarios)
      ? v.scenarios.slice(0, 8).map((s: any) => ({ name: String(s?.name || "").slice(0, 120), steps: strs(s?.steps, 8, 200) })).filter((s: any) => s.name)
      : [],
    integrations: strs(v?.integrations),
    timeline: String(v?.timeline || "").slice(0, 300),
    open_questions: strs(v?.open_questions, 8),
  };
}
function parse(s: string) { try { return JSON.parse(s); } catch { return null; } }

function brdText(brd: Brd, who?: { name: string; phone: string; email: string; company: string; businessType: string; departments: string[] }): string {
  const L: string[] = [];
  if (who) L.push(`${who.name}${who.company ? ` · ${who.company}` : ""} · ${who.businessType} · ${who.departments.join(", ")}`, `${who.phone}${who.email ? ` · ${who.email}` : ""}`, "");
  L.push(brd.title ? brd.title.toUpperCase() : "PLAN", "", brd.summary, "");
  if (brd.goals.length) L.push("Goals:", ...brd.goals.map((g) => `• ${g}`), "");
  if (brd.users.length) L.push("Who uses it:", ...brd.users.map((g) => `• ${g}`), "");
  for (const s of brd.scenarios) L.push(`Scenario — ${s.name}:`, ...s.steps.map((x, i) => `  ${i + 1}. ${x}`), "");
  if (brd.integrations.length) L.push("Connects to:", ...brd.integrations.map((g) => `• ${g}`), "");
  if (brd.timeline) L.push(`Timeline: ${brd.timeline}`, "");
  if (brd.open_questions.length) L.push("Still to decide:", ...brd.open_questions.map((g) => `• ${g}`));
  return L.join("\n");
}

// ── prompts ────────────────────────────────────────────────────────────────

const RULES = `You are the GoLuQ guide — a consultant's assistant at GoLuQ.com Digital Consultancy (Indore), which builds software, apps, WhatsApp systems, voice and toll-free lines for small and mid-size businesses, at a fixed price, delivered in weeks. Plain words a shop owner would use. Never call yourself an AI, bot or chatbot. Never invent facts, prices, competitor names or statistics. Never promise a price: pricing is a fixed quote after a 30-minute call.`;

function describe(ctx: Ctx, history: { q: string; a: string }[]): string {
  return [
    `Business type: ${ctx.businessType || "not said"}`,
    `Departments that hurt: ${ctx.departments.join(", ") || "not said"}`,
    `In their words:\n"""${ctx.text}"""`,
    history.length ? `Follow-up so far:\n${history.map((h) => `Q: ${h.q}\nA: ${h.a}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
}

function askPrompt(ctx: Ctx, history: { q: string; a: string }[]): string {
  return `${RULES}

${describe(ctx, history)}

You may ask at most ${4 - history.length} more question(s) in total. Ask ONE question that fills the single biggest gap for writing a build plan: who will use it day to day, how they work today (paper, Excel, Tally, another app), how many people or branches, what must connect (WhatsApp, Tally, existing website, payment), or by when. Do not ask what they already answered. If you have enough for a plan, set done to true.
Write the question in ${ctx.lang === "hi" ? "Hindi (Devanagari)" : "English"}, one sentence, friendly.
Return JSON only: {"question": string, "done": boolean}`;
}

function draftPrompt(ctx: Ctx, history: { q: string; a: string }[]): string {
  return `${RULES}

${describe(ctx, history)}

Write a short, honest requirements plan (BRD) for what GoLuQ would build for this person, in ${ctx.lang === "hi" ? "Hindi (Devanagari; keep product names like WhatsApp, Tally in Latin)" : "English"}. Only use what they said; put anything unknown under open_questions rather than guessing. Timeline in weeks, realistic for a small team. No prices.
Return JSON only:
{"title": string (max 8 words), "summary": string (3-5 sentences, second person: "you"), "goals": [string], "users": [string], "scenarios": [{"name": string, "steps": [string]}] (2-4 concrete day-to-day flows), "integrations": [string], "timeline": string, "open_questions": [string]}`;
}
