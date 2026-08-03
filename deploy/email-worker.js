/**
 * Cloudflare Email Worker for goluq.com
 * ─────────────────────────────────────
 * Paste this into Cloudflare → Workers & Pages → Create → Worker, then bind it
 * under Email Routing → Routes as the destination for dushyant@goluq.com
 * (or use a catch-all rule).
 *
 * It does two things with every incoming message:
 *   1. POSTs it to https://goluq.com/api/email/inbound so it appears in the
 *      cockpit Inbox and can be replied to as dushyant@goluq.com
 *   2. Forwards it on to the personal inbox, so a phone notification still
 *      arrives immediately
 *
 * Neither step is allowed to lose mail: if the POST fails the forward still
 * happens, and vice versa.
 *
 * Required Worker variables (Settings → Variables):
 *   INBOUND_SECRET  — must equal INBOUND_SECRET (or ADMIN_SECRET) on the server
 *   FORWARD_TO      — e.g. kumar26.dushyant@gmail.com
 *                     (must be a Verified destination address in Email Routing)
 */

const ENDPOINT = "https://goluq.com/api/email/inbound";
const MAX_BODY = 100_000; // plenty for a business email; guards a giant paste

export default {
  async email(message, env, ctx) {
    // ── 1. Mirror into the cockpit ────────────────────────────────────────
    const mirror = (async () => {
      try {
        const raw = await new Response(message.raw).text();
        const text = extractPlainText(raw).slice(0, MAX_BODY);

        await fetch(ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-inbound-secret": env.INBOUND_SECRET,
          },
          body: JSON.stringify({
            from: message.headers.get("from") || message.from,
            to: message.headers.get("to") || message.to,
            subject: message.headers.get("subject") || "(no subject)",
            text,
            messageId: message.headers.get("message-id") || null,
            inReplyTo: message.headers.get("in-reply-to") || null,
          }),
        });
      } catch (err) {
        // Swallow — a mirroring failure must never bounce the sender's mail.
        console.log("mirror failed:", err);
      }
    })();

    // ── 2. Still deliver to the personal inbox ────────────────────────────
    ctx.waitUntil(mirror);
    if (env.FORWARD_TO) {
      await message.forward(env.FORWARD_TO);
    }
  },
};

/**
 * Minimal MIME reader: prefer the text/plain part, fall back to de-tagged HTML.
 * Good enough for ordinary business email; attachments are ignored on purpose.
 */
function extractPlainText(raw) {
  const boundaryMatch = raw.match(/boundary="?([^"\r\n;]+)"?/i);

  if (boundaryMatch) {
    const parts = raw.split(`--${boundaryMatch[1]}`);
    const plain = parts.find((p) => /content-type:\s*text\/plain/i.test(p));
    if (plain) return decodePart(plain);
    const html = parts.find((p) => /content-type:\s*text\/html/i.test(p));
    if (html) return stripHtml(decodePart(html));
  }

  // Not multipart: body starts after the first blank line.
  const idx = raw.indexOf("\r\n\r\n");
  const body = idx === -1 ? raw : raw.slice(idx + 4);
  return /<[a-z][\s\S]*>/i.test(body) ? stripHtml(body) : body.trim();
}

function decodePart(part) {
  const idx = part.indexOf("\r\n\r\n");
  let body = idx === -1 ? part : part.slice(idx + 4);
  if (/content-transfer-encoding:\s*quoted-printable/i.test(part)) {
    body = body
      .replace(/=\r\n/g, "")
      .replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
  } else if (/content-transfer-encoding:\s*base64/i.test(part)) {
    try {
      body = atob(body.replace(/\s+/g, ""));
    } catch {
      /* leave as-is */
    }
  }
  return body.trim();
}

function stripHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
