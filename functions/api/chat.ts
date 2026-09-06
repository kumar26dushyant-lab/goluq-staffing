/// <reference types="@cloudflare/workers-types" />

import { getOwnerEmail } from "../lib/settings";
import { mailEnabled, sendMail, type MailEnv } from "../lib/mailer";
import { tgAlertOwner, tgEscape, type TgEnv } from "../lib/telegram";

interface Env extends MailEnv, TgEnv {
  DB: D1Database;
}

const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

/**
 * Visitor side of the live-chat channel.
 *
 *  action "sync"    — poll for anything the owner has sent since `after`
 *  action "handoff" — visitor wants a human; flags the session and fires a
 *                     WhatsApp alert to the owner so they can pick it up from
 *                     their phone without watching the dashboard
 *  action "say"     — persist a visitor/guide turn so the owner can read the
 *                     conversation before joining
 *
 * Everything is best-effort: chat persistence must never break the widget.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  try {
    const b = await request.json<Record<string, unknown>>();
    const sessionId = clip(b.sessionId, 40);
    if (!sessionId) return Response.json({ ok: false, error: "no session" }, { status: 400 });
    const action = clip(b.action, 16) || "sync";

    await env.DB.prepare(
      `INSERT INTO chat_sessions (id, created_at, last_at, page, lang)
       VALUES (?, datetime('now'), datetime('now'), ?, ?)
       ON CONFLICT(id) DO UPDATE SET last_at = datetime('now')`
    )
      .bind(sessionId, clip(b.page, 40), clip(b.lang, 8))
      .run();

    if (action === "say") {
      const role = clip(b.role, 10) === "guide" ? "guide" : "visitor";
      const content = clip(b.content, 2000);
      if (content) {
        await env.DB.prepare(
          `INSERT INTO chat_messages (session_id, role, content, created_at)
           VALUES (?,?,?,datetime('now'))`
        )
          .bind(sessionId, role, content)
          .run();
        if (role === "visitor") {
          await env.DB.prepare(
            `UPDATE chat_sessions SET unread_for_agent = unread_for_agent + 1 WHERE id = ?`
          )
            .bind(sessionId)
            .run();
          // The first thing a visitor types is worth a glance on the phone —
          // it says who is on the site and what they came for. Later turns are
          // not repeated; the handoff below covers the moment they want a person.
          const n = await env.DB.prepare(
            `SELECT COUNT(*) AS n FROM chat_messages WHERE session_id = ? AND role = 'visitor'`
          )
            .bind(sessionId)
            .first<{ n: number }>();
          if ((n?.n ?? 0) === 1) {
            context.waitUntil(
              tgAlertOwner(
                env.DB,
                env,
                `🌐 <b>Website chat</b> · ${tgEscape(clip(b.page, 40) || "home")} · ${tgEscape(clip(b.lang, 8) || "en")}\n\n<i>${tgEscape(content)}</i>\n\n<i>Reply to this message to join the chat.</i>`,
                {
                  kind: "chat",
                  ref: sessionId,
                  buttons: [[
                    { text: "✋ Guide off", data: `chat:off:${sessionId}` },
                    { text: "✔️ Close", data: `chat:close:${sessionId}` },
                  ]],
                }
              ).then(() => undefined)
            );
          }
        }
      }
    }

    if (action === "handoff") {
      const name = clip(b.name, 80);
      const phone = clip(b.phone, 20);
      await env.DB.prepare(
        `UPDATE chat_sessions
            SET needs_human = 1, closed = 0,
                visitor_name = COALESCE(NULLIF(?,''), visitor_name),
                visitor_phone = COALESCE(NULLIF(?,''), visitor_phone)
          WHERE id = ?`
      )
        .bind(name, phone, sessionId)
        .run();

      // Recent turns, shared by both alert channels below.
      const recentRows = await env.DB.prepare(
        `SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY id DESC LIMIT 6`
      )
        .bind(sessionId)
        .all<{ role: string; content: string }>();
      const recentText = (recentRows.results ?? [])
        .reverse()
        .map((m) => `${m.role === "visitor" ? "Them" : "Guide"}: ${m.content}`)
        .join("\n");

      context.waitUntil(
        tgAlertOwner(
          env.DB,
          env,
          `🙋 <b>Website visitor wants a person</b>${name ? ` · ${tgEscape(name)}` : ""}\n` +
            (phone ? `📱 ${tgEscape(phone)}\n` : "") +
            `Page: ${tgEscape(clip(b.page, 40) || "home")}` +
            (recentText ? `\n\n${tgEscape(recentText.slice(0, 1500))}` : "") +
            "\n\n<i>Reply to this message to answer them.</i>",
          {
            kind: "chat",
            ref: sessionId,
            buttons: [[
              { text: "✋ Guide off", data: `chat:off:${sessionId}` },
              { text: "✔️ Close", data: `chat:close:${sessionId}` },
            ]],
          }
        ).then(() => undefined)
      );

      // Email as well. It is the record that survives a phone left in a drawer.
      context.waitUntil(
        (async () => {
          try {
            if (!mailEnabled(env)) return;
            const to = await getOwnerEmail(env.DB);
            if (!to) return;
            const sent = await sendMail(env, {
              to,
              subject: `Someone on goluq.com wants to talk to you${name ? " — " + name : ""}`,
              text: [
                "A visitor asked to speak to a real person.",
                "",
                name ? `Name:  ${name}` : "",
                phone ? `Phone: ${phone}` : "",
                `Page:  ${clip(b.page, 40) || "home"}`,
                "",
                recentText ? `--- Conversation so far ---
${recentText}` : "",
                "",
                "Reply from the cockpit: https://goluq.com/admin (Live chat)",
              ]
                .filter(Boolean)
                .join("\n"),
            });
            if (!sent.ok) console.log("handoff alert email rejected:", sent.error);
          } catch (err) {
            // Logged, not swallowed — see the note in lead.ts. Still never
            // breaks the chat for the visitor.
            console.log("handoff alert email failed:", String(err));
          }
        })()
      );
    }

    // Anything the owner has said since the visitor last checked.
    const after = Number(b.after) || 0;
    const rows = await env.DB.prepare(
      `SELECT id, role, content, created_at FROM chat_messages
        WHERE session_id = ? AND id > ? AND role = 'agent' ORDER BY id LIMIT 30`
    )
      .bind(sessionId, after)
      .all<{ id: number; role: string; content: string }>();

    const sess = await env.DB.prepare(
      `SELECT needs_human, agent_joined, closed FROM chat_sessions WHERE id = ?`
    )
      .bind(sessionId)
      .first<{ needs_human: number; agent_joined: number; closed: number }>();

    return Response.json({
      ok: true,
      messages: rows.results ?? [],
      agentJoined: !!sess?.agent_joined,
      needsHuman: !!sess?.needs_human,
      closed: !!sess?.closed,
    });
  } catch {
    return Response.json({ ok: true, messages: [] });
  }
};
