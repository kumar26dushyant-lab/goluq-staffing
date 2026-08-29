/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";
import { randomToken } from "../../lib/auth";
import { mailEnabled, sendMail, type MailEnv } from "../../lib/mailer";
import { isStage, STAGES } from "../../lib/portal";

interface Env extends MailEnv {
  DB: D1Database;
  ADMIN_SECRET: string;
}

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

/** GET → every customer and project, for the cockpit's Projects tab. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();

  const customers = await env.DB.prepare(
    `SELECT id, name, phone, email, company, status, created_at,
            (pass_hash IS NOT NULL) AS has_password
       FROM customers ORDER BY id DESC`
  ).all<Record<string, unknown>>();

  const projects = await env.DB.prepare(
    `SELECT p.*, c.name AS customer_name
       FROM projects p JOIN customers c ON c.id = p.customer_id
      ORDER BY p.updated_at DESC`
  ).all<Record<string, unknown>>();

  const events = await env.DB.prepare(
    `SELECT id, project_id, stage, note, author, visible, created_at
       FROM project_events ORDER BY id DESC LIMIT 300`
  ).all<Record<string, unknown>>();

  const files = await env.DB.prepare(
    `SELECT id, project_id, label, url, created_at FROM project_files ORDER BY id DESC LIMIT 300`
  ).all<Record<string, unknown>>();

  return Response.json({
    ok: true,
    stages: STAGES,
    customers: customers.results || [],
    projects: projects.results || [],
    events: events.results || [],
    files: files.results || [],
  });
};

/**
 * POST { action, ... } — everything the owner does to a project.
 *
 *   addCustomer   { name, phone, email?, company? }  → creates the account and
 *                                                      emails a set-password link
 *   inviteAgain   { customerId }                     → fresh link
 *   addProject    { customerId, title, serviceId?, priceInr?, targetDate? }
 *   setStage      { projectId, stage, note? }        → moves it, logs it, emails
 *   addUpdate     { projectId, note, visible }
 *   addFile       { projectId, label, url }
 *   setStatus     { projectId, status }
 *   setPaid       { projectId, paidInr }
 */
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
    if (action === "addCustomer") {
      const name = clip(b.name, 120);
      const phone = digits(b.phone);
      if (!name || phone.length < 10) {
        return Response.json({ ok: false, error: "Name and a valid phone are required." }, { status: 400 });
      }
      const exists = await env.DB.prepare("SELECT id FROM customers WHERE phone = ?")
        .bind(phone)
        .first<{ id: number }>();
      if (exists) return Response.json({ ok: false, error: "That number already has an account." }, { status: 409 });

      const r = await env.DB.prepare(
        `INSERT INTO customers (name, phone, email, company, created_at)
         VALUES (?,?,?,?,datetime('now'))`
      )
        .bind(name, phone, clip(b.email, 200).toLowerCase() || null, clip(b.company, 160) || null)
        .run();
      const id = Number((r as any)?.meta?.last_row_id || 0);
      const invited = await invite(env, id);
      return Response.json({ ok: true, id, invited });
    }

    if (action === "inviteAgain") {
      const invited = await invite(env, Number(b.customerId));
      return Response.json({ ok: true, invited });
    }

    if (action === "addProject") {
      const title = clip(b.title, 160);
      const customerId = Number(b.customerId);
      if (!title || !customerId) {
        return Response.json({ ok: false, error: "Pick a customer and give the project a title." }, { status: 400 });
      }
      const r = await env.DB.prepare(
        `INSERT INTO projects (customer_id, title, service_id, price_inr, target_date, created_at, updated_at)
         VALUES (?,?,?,?,?,datetime('now'),datetime('now'))`
      )
        .bind(
          customerId,
          title,
          clip(b.serviceId, 40) || null,
          Number(b.priceInr) || 0,
          clip(b.targetDate, 20) || null
        )
        .run();
      const id = Number((r as any)?.meta?.last_row_id || 0);
      await logEvent(env.DB, id, "requirements", "Project opened. Gathering requirements.", 1);
      return Response.json({ ok: true, id });
    }

    if (action === "setStage") {
      const projectId = Number(b.projectId);
      const stage = String(b.stage || "");
      if (!projectId || !isStage(stage)) {
        return Response.json({ ok: false, error: "Unknown stage." }, { status: 400 });
      }
      await env.DB.prepare("UPDATE projects SET stage = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(stage, projectId)
        .run();
      await logEvent(env.DB, projectId, stage, clip(b.note, 2000) || `Moved to ${stage}.`, 1);
      await notifyCustomer(env, projectId, stage);
      return Response.json({ ok: true });
    }

    if (action === "addUpdate") {
      const projectId = Number(b.projectId);
      const note = clip(b.note, 4000);
      if (!projectId || !note) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      await logEvent(env.DB, projectId, null, note, b.visible === false ? 0 : 1);
      await env.DB.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?")
        .bind(projectId)
        .run();
      return Response.json({ ok: true });
    }

    if (action === "addFile") {
      const projectId = Number(b.projectId);
      const label = clip(b.label, 160);
      const url = clip(b.url, 500);
      if (!projectId || !label || !/^https?:\/\//i.test(url)) {
        return Response.json({ ok: false, error: "A label and a full https link are required." }, { status: 400 });
      }
      await env.DB.prepare(
        "INSERT INTO project_files (project_id, label, url, created_at) VALUES (?,?,?,datetime('now'))"
      )
        .bind(projectId, label, url)
        .run();
      await logEvent(env.DB, projectId, null, `Delivered: ${label}`, 1);
      return Response.json({ ok: true });
    }

    if (action === "setStatus") {
      const status = String(b.status || "");
      if (!["active", "on_hold", "delivered", "cancelled"].includes(status)) {
        return Response.json({ ok: false, error: "Unknown status." }, { status: 400 });
      }
      await env.DB.prepare("UPDATE projects SET status = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(status, Number(b.projectId))
        .run();
      return Response.json({ ok: true });
    }

    if (action === "setPaid") {
      await env.DB.prepare("UPDATE projects SET paid_inr = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(Number(b.paidInr) || 0, Number(b.projectId))
        .run();
      return Response.json({ ok: true });
    }

    return Response.json({ ok: false, error: "unknown_action" }, { status: 400 });
  } catch (e) {
    console.log("admin projects failed:", String(e).slice(0, 300));
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};

async function logEvent(
  db: D1Database,
  projectId: number,
  stage: string | null,
  note: string,
  visible: number
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO project_events (project_id, stage, note, author, visible, created_at)
       VALUES (?,?,?,'goluq',?,datetime('now'))`
    )
    .bind(projectId, stage, note, visible)
    .run();
}

/** Emails a one-time set-password link. Returns whether it actually went out. */
async function invite(env: Env, customerId: number): Promise<boolean> {
  if (!customerId || !mailEnabled(env)) return false;
  const c = await env.DB.prepare("SELECT name, email FROM customers WHERE id = ?")
    .bind(customerId)
    .first<{ name: string; email: string | null }>();
  if (!c?.email) return false;

  const token = randomToken(24);
  await env.DB.prepare(
    "UPDATE customers SET setup_token = ?, setup_expires = datetime('now', '+7 days') WHERE id = ?"
  )
    .bind(token, customerId)
    .run();

  const sent = await sendMail(env, {
    to: c.email,
    subject: "Your GoLuQ project portal",
    text:
      `Hello ${c.name},\n\n` +
      `You can now follow your project with GoLuQ — what stage it is at, every update, ` +
      `and everything delivered so far.\n\n` +
      `Choose your password here:\nhttps://goluq.com/portal?setup=${token}\n\n` +
      `The link works for seven days and once only.\n\n— GoLuQ\n`,
  });
  // sendMail reports failure in its result rather than throwing, so this has to
  // be read; returning true regardless would tell the owner an invite went out
  // when it never did.
  if (!sent.ok) console.log("portal invite not sent:", sent.error);
  return sent.ok;
}

/** Tell the customer their project moved. Silent failure is fine; the portal shows it anyway. */
async function notifyCustomer(env: Env, projectId: number, stage: string): Promise<void> {
  if (!mailEnabled(env)) return;
  const row = await env.DB.prepare(
    `SELECT p.title, c.name, c.email FROM projects p JOIN customers c ON c.id = p.customer_id
      WHERE p.id = ?`
  )
    .bind(projectId)
    .first<{ title: string; name: string; email: string | null }>();
  if (!row?.email) return;
  const sent = await sendMail(env, {
    to: row.email,
    subject: `${row.title} — now at ${stage}`,
    text:
      `Hello ${row.name},\n\n` +
      `"${row.title}" has moved to the ${stage} stage.\n\n` +
      `See the full history and anything delivered so far:\nhttps://goluq.com/portal\n\n— GoLuQ\n`,
  });
  if (!sent.ok) console.log("stage email not sent:", sent.error);
}
