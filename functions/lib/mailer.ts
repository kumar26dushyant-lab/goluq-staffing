/// <reference types="@cloudflare/workers-types" />

/**
 * Outbound email, sent AS the domain — never from the owner's personal address.
 *
 * Cloudflare Email Routing (which currently holds goluq.com's MX) can RECEIVE
 * but cannot SEND. So replies go through a transactional provider. Resend is the
 * default because its free tier is enough for this volume and DKIM setup is
 * three DNS records; the adapter below is the only place that knows that, so
 * swapping to Brevo/Mailgun/Postmark is a one-function change.
 *
 * Inert until MAIL_API_KEY is set — the cockpit shows sending as unavailable
 * rather than silently dropping replies.
 */
export interface MailEnv {
  MAIL_API_KEY?: string;
  MAIL_FROM?: string;      // e.g. "GoLuQ <dushyant@goluq.com>"
  MAIL_PROVIDER?: string;  // "resend" (default)
}

export function mailEnabled(env: MailEnv): boolean {
  return !!env.MAIL_API_KEY && !!env.MAIL_FROM;
}

export interface SendArgs {
  to: string;
  subject: string;
  text: string;
  /** Set both so the visitor's client threads the reply under the original. */
  inReplyTo?: string | null;
  references?: string | null;
  replyTo?: string;
}

export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export async function sendMail(env: MailEnv, args: SendArgs): Promise<SendResult> {
  if (!mailEnabled(env)) {
    return { ok: false, error: "Sending is not configured yet (MAIL_API_KEY / MAIL_FROM)." };
  }
  const provider = (env.MAIL_PROVIDER || "resend").toLowerCase();

  if (provider !== "resend") {
    return { ok: false, error: `Unsupported MAIL_PROVIDER "${provider}".` };
  }

  const headers: Record<string, string> = {};
  if (args.inReplyTo) headers["In-Reply-To"] = args.inReplyTo;
  if (args.references) headers["References"] = args.references;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.MAIL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [args.to],
        subject: args.subject,
        text: args.text,
        reply_to: args.replyTo || env.MAIL_FROM,
        ...(Object.keys(headers).length ? { headers } : {}),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      return { ok: false, error: data.message || `Provider returned ${res.status}` };
    }
    return { ok: true, messageId: data.id };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
