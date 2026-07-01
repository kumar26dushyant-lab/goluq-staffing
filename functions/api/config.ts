/// <reference types="@cloudflare/workers-types" />

import { getSetting } from "../lib/settings";

interface Env {
  DB: D1Database;
}

/**
 * Public site config (NO secrets). Currently just the business WhatsApp number
 * shown to visitors (admin-set via Settings). Empty by default → the UI hides
 * any WhatsApp contact option. Nothing is hardcoded.
 */
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const whatsapp = (await getSetting(env.DB, "public_whatsapp")) || "";
  return Response.json({ ok: true, whatsapp });
};
