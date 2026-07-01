/// <reference types="@cloudflare/workers-types" />

/**
 * Mutable settings stored in D1/SQLite so the admin can change them at runtime
 * (no restart). They override the .env defaults where relevant.
 */
export async function getSetting(db: D1Database, key: string): Promise<string | null> {
  try {
    const v = await db.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first<string>("value");
    return (v as string) ?? null;
  } catch {
    return null;
  }
}

export async function setSetting(db: D1Database, key: string, value: string): Promise<void> {
  await db
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .bind(key, value)
    .run();
}

/** Owner WhatsApp: admin-set setting wins, else the .env default. */
export async function getOwnerWhatsapp(
  db: D1Database,
  env: { OWNER_WHATSAPP?: string }
): Promise<string> {
  return (await getSetting(db, "owner_whatsapp")) || env.OWNER_WHATSAPP || "";
}

/** Follow-ups on by default; admin can pause them. */
export async function followupsEnabled(db: D1Database): Promise<boolean> {
  const v = await getSetting(db, "followups_enabled");
  return v === null ? true : v === "1";
}
