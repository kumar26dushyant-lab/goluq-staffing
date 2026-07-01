/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";

interface Env {
  DB: D1Database;
  ADMIN_SECRET: string;
}

/** Admin: update or delete a single lead. Body: { id, action, status? }. */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!checkAdmin(request, env)) return unauthorized();
  try {
    const b = await request.json<{ id?: number; action?: string; status?: string }>();
    const id = Number(b.id);
    if (!id) return Response.json({ ok: false, error: "id required" }, { status: 400 });

    if (b.action === "delete") {
      await env.DB.prepare("DELETE FROM leads WHERE id = ?").bind(id).run();
      return Response.json({ ok: true });
    }
    if (b.action === "optout") {
      await env.DB.prepare(
        "UPDATE leads SET opted_out=1, status='opted_out', next_followup_at=NULL WHERE id = ?"
      ).bind(id).run();
      return Response.json({ ok: true });
    }
    if (b.action === "status" && b.status) {
      const allowed = ["new", "engaged", "converted", "opted_out", "done"];
      if (!allowed.includes(b.status)) return Response.json({ ok: false, error: "bad status" }, { status: 400 });
      // Converting/opting-out stops follow-ups.
      const stop = b.status === "converted" || b.status === "opted_out" || b.status === "done";
      await env.DB.prepare(
        `UPDATE leads SET status = ?${stop ? ", next_followup_at = NULL" : ""}${b.status === "opted_out" ? ", opted_out=1" : ""} WHERE id = ?`
      ).bind(b.status, id).run();
      return Response.json({ ok: true });
    }
    return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
  } catch {
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};
