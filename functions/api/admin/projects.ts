/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";
import { randomToken } from "../../lib/auth";
import { mailEnabled, sendMail, type MailEnv } from "../../lib/mailer";
import { isStage, STAGES } from "../../lib/portal";
import { waConfig, waReady, type WaEnv } from "../../lib/whatsapp";
import { WA_TEMPLATES, sendTemplate } from "../../lib/waTemplates";
import { commissionFor, getRates, PROJECT_KINDS, type ProjectKind } from "../../lib/affiliateRates";

interface Env extends MailEnv, WaEnv {
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

  const commissions = await env.DB.prepare(
    `SELECT id, project_id, affiliate_code, rate, basis_inr, amount_inr, status, created_at
       FROM commissions WHERE project_id IS NOT NULL ORDER BY id DESC LIMIT 300`
  ).all<Record<string, unknown>>();

  return Response.json({
    ok: true,
    stages: STAGES,
    kinds: PROJECT_KINDS,
    customers: customers.results || [],
    projects: projects.results || [],
    events: events.results || [],
    files: files.results || [],
    commissions: commissions.results || [],
  });
};

/**
 * POST { action, ... } — everything the owner does to a project.
 *
 *   addCustomer   { name, phone, email?, company? }  → creates the account and
 *                                                      emails a set-password link
 *   inviteAgain   { customerId }                     → fresh link
 *   addProject    { customerId, title, serviceId?, priceInr?, costInr?, kind?, refCode?, targetDate? }
 *                                                    kind: build | enhancement | maintenance;
 *                                                    refCode defaults to the partner on the
 *                                                    customer's original lead, if any
 *   setMoney      { projectId, priceInr?, costInr?, refCode? }
 *   recordPayment { projectId, amountInr, note? }    → adds to paid, accrues partner
 *                                                    commission on the profit share
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
      const kind = (PROJECT_KINDS as string[]).includes(String(b.kind)) ? (String(b.kind) as ProjectKind) : "build";
      const refCode = clip(b.refCode, 40).toUpperCase() || (await partnerForCustomer(env.DB, customerId));
      const r = await env.DB.prepare(
        `INSERT INTO projects (customer_id, title, service_id, kind, price_inr, cost_inr, ref_code, target_date, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`
      )
        .bind(
          customerId,
          title,
          clip(b.serviceId, 40) || null,
          kind,
          Number(b.priceInr) || 0,
          Number(b.costInr) || 0,
          refCode || null,
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

    if (action === "setMoney") {
      const projectId = Number(b.projectId);
      if (!projectId) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      if (b.priceInr !== undefined) {
        await env.DB.prepare("UPDATE projects SET price_inr = ? WHERE id = ?")
          .bind(Math.max(0, Number(b.priceInr) || 0), projectId).run();
      }
      if (b.costInr !== undefined) {
        await env.DB.prepare("UPDATE projects SET cost_inr = ? WHERE id = ?")
          .bind(Math.max(0, Number(b.costInr) || 0), projectId).run();
      }
      if (b.refCode !== undefined) {
        await env.DB.prepare("UPDATE projects SET ref_code = ? WHERE id = ?")
          .bind(clip(b.refCode, 40).toUpperCase() || null, projectId).run();
      }
      await env.DB.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").bind(projectId).run();
      return Response.json({ ok: true });
    }

    // Money arrived. This is the ONLY place partner commission is created: a
    // share of the profit, in proportion to how much of the price this payment
    // is. Nothing is booked before the customer has actually paid.
    if (action === "recordPayment") {
      const projectId = Number(b.projectId);
      const amount = Math.round(Number(b.amountInr) || 0);
      if (!projectId || amount <= 0) {
        return Response.json({ ok: false, error: "A payment amount is required." }, { status: 400 });
      }
      const p = await env.DB.prepare(
        `SELECT id, customer_id, kind, price_inr, cost_inr, paid_inr, ref_code, created_at FROM projects WHERE id = ?`
      )
        .bind(projectId)
        .first<{ id: number; customer_id: number; kind: string | null; price_inr: number; cost_inr: number | null; paid_inr: number; ref_code: string | null; created_at: string }>();
      if (!p) return Response.json({ ok: false, error: "Project not found." }, { status: 404 });

      await env.DB.prepare("UPDATE projects SET paid_inr = COALESCE(paid_inr,0) + ?, updated_at = datetime('now') WHERE id = ?")
        .bind(amount, projectId)
        .run();
      const note = clip(b.note, 200);
      await logEvent(env.DB, projectId, null, `Payment received: ₹${amount.toLocaleString("en-IN")}${note ? " — " + note : ""}`, 0);

      let commission: Record<string, unknown> = { eligible: false, reason: "No partner on this project." };
      if (p.ref_code) {
        const first = await env.DB.prepare(
          `SELECT created_at FROM projects WHERE customer_id = ? AND kind = 'build' AND id <> ? ORDER BY id ASC LIMIT 1`
        )
          .bind(p.customer_id, projectId)
          .first<{ created_at: string }>();
        const verdict = commissionFor(await getRates(env.DB), {
          kind: (p.kind as ProjectKind) || "build",
          priceInr: Number(p.price_inr) || 0,
          costInr: Number(p.cost_inr) || 0,
          paymentInr: amount,
          firstProjectAt: first?.created_at ?? null,
          projectAt: p.created_at,
        });
        commission = verdict;
        if (verdict.eligible && verdict.amountInr > 0) {
          const period = new Date().toISOString().slice(0, 7);
          await env.DB.prepare(
            `INSERT INTO commissions
               (affiliate_code, lead_id, project_id, customer_ref, period_month, rate, basis_inr, amount_inr, note, status, created_at)
             VALUES (?,?,?,?,?,?,?,?,?,'pending',datetime('now'))`
          )
            .bind(p.ref_code, null, projectId, `customer-${p.customer_id}`, period, verdict.rate, amount, verdict.amountInr, note || null)
            .run();
        }
      }
      return Response.json({ ok: true, paidInr: (Number(p.paid_inr) || 0) + amount, commission });
    }

    return Response.json({ ok: false, error: "unknown_action" }, { status: 400 });
  } catch (e) {
    console.log("admin projects failed:", String(e).slice(0, 300));
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};

/**
 * The partner who introduced this customer, if any — read from the lead they
 * originally arrived as, matched on the last ten digits of the phone.
 */
async function partnerForCustomer(db: D1Database, customerId: number): Promise<string> {
  const c = await db.prepare("SELECT phone FROM customers WHERE id = ?").bind(customerId).first<{ phone: string }>();
  const last10 = String(c?.phone || "").replace(/\D/g, "").slice(-10);
  if (last10.length < 10) return "";
  const l = await db
    .prepare(`SELECT ref_code FROM leads WHERE ref_code IS NOT NULL AND ref_code <> '' AND phone LIKE ? ORDER BY id DESC LIMIT 1`)
    .bind(`%${last10}`)
    .first<{ ref_code: string }>();
  return l?.ref_code || "";
}

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

/**
 * Tell the customer their project moved — by email, and on WhatsApp where we
 * have a number. Both are best-effort: the portal shows the change regardless,
 * so a notification failure must never block the owner's workflow.
 *
 * WhatsApp goes as the approved `project_stage_update` template, because a
 * customer mid-build has usually not messaged us in the last 24 hours and free
 * text would simply be refused.
 */
async function notifyCustomer(env: Env, projectId: number, stage: string): Promise<void> {
  const row = await env.DB.prepare(
    `SELECT p.title, c.name, c.email, c.phone FROM projects p JOIN customers c ON c.id = p.customer_id
      WHERE p.id = ?`
  )
    .bind(projectId)
    .first<{ title: string; name: string; email: string | null; phone: string | null }>();
  if (!row) return;

  if (row.email && mailEnabled(env)) {
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

  if (row.phone) {
    const cfg = await waConfig(env.DB, env);
    if (waReady(cfg)) {
      const sent = await sendTemplate(cfg, row.phone, WA_TEMPLATES.projectStage, "en", [
        row.name,
        row.title,
        STAGE_WORDS[stage] ?? stage,
      ]);
      if (!sent.ok) console.log("stage whatsapp not sent:", sent.error);
    }
  }
}

/** Customer-facing stage wording, so the message reads like a sentence. */
const STAGE_WORDS: Record<string, string> = {
  requirements: "requirements",
  blueprint: "blueprint and quote",
  approval: "awaiting your approval",
  build: "build",
  testing: "testing",
  delivery: "delivery",
  support: "support",
};
