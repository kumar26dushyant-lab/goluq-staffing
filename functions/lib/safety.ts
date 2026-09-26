/// <reference types="@cloudflare/workers-types" />

/**
 * What every public door shares: the Telegram customer bot, WhatsApp,
 * Messenger and Instagram all take messages from strangers and feed them to
 * the guide and to the owner's phone. This module is the checkpoint they
 * pass through first.
 *
 *  - Attachments are never downloaded, opened or forwarded. The customer is
 *    asked to write it as text; the owner is told a file arrived, and that
 *    it was not opened.
 *  - Messages that read like a scam (OTP requests, prizes, fees, "your
 *    account will be blocked", executable file names, link shorteners) get
 *    a fixed safety reply, never the guide, and the owner is warned.
 *  - A thread that floods (many messages in minutes) is answered once, then
 *    ignored until it calms down, so one person cannot run up the bill.
 *  - Links in anything forwarded to the owner are defanged so a tap on the
 *    phone cannot open them by accident.
 *  - The guide's own replies are checked on the way out: no links off our
 *    own domains, and never a request for a code, a password or a card.
 */

/** Message types the channels may deliver that are not text. */
export type AttachmentKind = "image" | "document" | "audio" | "video" | "sticker" | "location" | "contact" | "other";

const IS_HI = (lang: string) => lang === "hi";

export function attachmentReply(lang: string, kind: AttachmentKind): string {
  const media = kind === "image" ? (IS_HI(lang) ? "तस्वीर" : "picture") : kind === "audio" ? (IS_HI(lang) ? "ऑडियो" : "voice note") : kind === "video" ? (IS_HI(lang) ? "वीडियो" : "video") : IS_HI(lang) ? "फ़ाइल" : "file";
  return IS_HI(lang)
    ? `आपकी ${media} मिली, पर सुरक्षा के लिए यहाँ फ़ाइलें नहीं खोली जातीं। कृपया बात लिखकर बताइए, या दुष्यंत से WhatsApp +91 83495 04400 पर बात कीजिए, वे ज़रूरत पड़ने पर फ़ाइल माँग लेंगे।`
    : `Your ${media} arrived, but for safety files are not opened here. Please write what it is about, or reach Dushyant on WhatsApp +91 83495 04400 and he will ask for the file if it is needed.`;
}

export function scamReply(lang: string): string {
  return IS_HI(lang)
    ? "एक बात साफ़ कर दें: GoLuQ कभी OTP, पासवर्ड, कार्ड नंबर या कोई फ़ीस चैट में नहीं माँगता, और न ही भेजे गए लिंक या फ़ाइल खोलता है। भुगतान सिर्फ़ goluq.com या दुष्यंत के भेजे आधिकारिक लिंक पर होता है। अगर कोई असली काम है, तो लिखिए कि आपका बिज़नेस क्या है और क्या चाहिए।"
    : "One thing to be clear about: GoLuQ never asks for OTPs, passwords, card numbers or any fee in chat, and never opens links or files sent here. Payments happen only on goluq.com or on an official link from Dushyant. If there is genuine work to discuss, tell us what your business is and what you need.";
}

export function floodReply(lang: string): string {
  return IS_HI(lang)
    ? "बहुत सारे संदेश एक साथ आ गए। थोड़ा रुकिए, एक व्यक्ति जल्द जवाब देगा। तब तक एक ही संदेश में अपनी बात लिख दीजिए।"
    : "That is a lot of messages at once. Please pause; a person will reply shortly. Until then, put what you need into one message.";
}

/**
 * Why a message looks like a scam, or an empty list. Reasons are for the
 * owner's alert, never shown to the sender. Kept deliberately narrow: a
 * customer asking about our OTP login or our fees must not trip it, so the
 * OTP rule needs a request verb and the fee rule needs the scam framing.
 */
export function scamSignals(text: string): string[] {
  const t = String(text || "").toLowerCase();
  const out: string[] = [];
  const has = (re: RegExp) => re.test(t);
  if (has(/\b(send|share|tell|give|forward|enter|bhejo|bhej|batao|do)\b[^.\n]{0,40}\b(otp|one[- ]time (password|code|pin)|verification code|passcode)\b/) || has(/\b(otp|verification code)\b[^.\n]{0,30}\b(bhejo|bhej do|batao|share karo|send karo)\b/) || /ओटीपी[^।\n]{0,30}(भेज|बता)/.test(t)) out.push("asks for an OTP or code");
  if (has(/\b(processing|registration|activation|release|clearance|advance|token|gst refund) fee\b/) || has(/\b(lottery|jackpot|you (have )?won|winner|prize money|lucky draw)\b/) || /लॉटरी|इनाम जीत|जैकपॉट/.test(t)) out.push("prize or advance-fee lure");
  if (has(/\b(account|number|wallet|sim)\b[^.\n]{0,30}\b(will be|has been|is being|gets?)\s+(blocked|suspended|deactivated|closed|terminated)\b/) || has(/\bkyc\b[^.\n]{0,30}\b(update|expire|pending|verify)/) || /केवाईसी|खाता (बंद|ब्लॉक)/.test(t)) out.push("account-threat phishing");
  if (has(/\b(crypto|bitcoin|usdt|forex|binary option|trading tips|guaranteed returns?|double your money|investment (plan|scheme|opportunity)|passive income guaranteed)\b/)) out.push("investment lure");
  if (has(/\b[\w-]+\.(apk|exe|scr|bat|cmd|com|vbs|js|jar|msi|iso|dmg|zip|rar|7z|hta|lnk)\b/)) out.push("executable or archive file name");
  if (has(/\b(bit\.ly|tinyurl\.com|t\.co|cutt\.ly|rb\.gy|is\.gd|shorturl\.at|tiny\.cc|rebrand\.ly)\//) || has(/https?:\/\/\d{1,3}(\.\d{1,3}){3}/) || has(/https?:\/\/[^\s/]*xn--/)) out.push("shortened, raw-IP or lookalike link");
  if (has(/\b(remote access|anydesk|teamviewer|screen share)\b[^.\n]{0,40}\b(install|download|open|allow)\b/) || has(/\b(install|download|open|allow)\b[^.\n]{0,40}\b(anydesk|teamviewer|remote access)\b/)) out.push("remote-access request");
  return out;
}

/** True when the sender has sent more than `limit` visitor messages in `minutes`. */
export async function messagesSince(db: D1Database, sessionId: string, minutes: number): Promise<number> {
  try {
    const r = await db
      .prepare(`SELECT COUNT(*) AS n FROM chat_messages WHERE session_id = ? AND role = 'visitor' AND created_at >= datetime('now', ?)`)
      .bind(sessionId, `-${Math.max(1, Math.floor(minutes))} minutes`)
      .first<{ n: number }>();
    return Number(r?.n || 0);
  } catch {
    return 0;
  }
}

export const FLOOD_10MIN = 15;
export const FLOOD_DAY = 80;

/**
 * "no": fine. "first": over the line just now, say so once. "silent": still
 * over it, say nothing (the message is stored, the cockpit still shows it).
 * Counted after the current message is stored, so the thresholds are exact.
 */
export async function floodState(db: D1Database, sessionId: string): Promise<"no" | "first" | "silent"> {
  const short = await messagesSince(db, sessionId, 10);
  const day = await messagesSince(db, sessionId, 24 * 60);
  if (short === FLOOD_10MIN + 1 || day === FLOOD_DAY + 1) return "first";
  if (short > FLOOD_10MIN || day > FLOOD_DAY) return "silent";
  return "no";
}

/**
 * Links made un-tappable for the owner's phone: "https://x.com/a" becomes
 * "hxxps://x[.]com/a". Bare domains ("x.com") are dotted too, because
 * Telegram and WhatsApp auto-link those as well.
 */
export function defangLinks(text: string): string {
  return String(text || "").replace(
    /\b((?:https?:\/\/|www\.)[^\s<]+|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|in|io|co|ly|me|app|xyz|top|club|site|online|info|biz|link|click|gy|gd|ru|cn|uk|ae|shop|store|live|tech|dev|cc|to|tv)(?:\/[^\s<]*)?)\b/gi,
    (m) => m.replace(/^https?:\/\//i, (p) => p.replace(/^http/i, "hxxp")).replace(/\./g, "[.]")
  );
}

const OWN_HOSTS = ["goluq.com", "www.goluq.com", "wa.me", "api.whatsapp.com", "t.me", "calendar.app.google", "calendar.google.com", "meet.google.com", "youtube.com", "www.youtube.com", "youtu.be", "instagram.com", "www.instagram.com", "linkedin.com", "www.linkedin.com", "nidaanpartner.com", "sarathi-ai.com", "eagleeye.work"];

/**
 * The guide's reply, made safe to send. Any link whose host is not ours (or
 * the booking host) is replaced by our own domain, so a prompt smuggled in
 * by a customer cannot make the guide hand out a stranger's link. A reply
 * that asks for a code, password or card is replaced outright.
 */
export function guardReply(reply: string, lang: string, extraHosts: string[] = []): string {
  let r = String(reply || "");
  const allow = new Set([...OWN_HOSTS, ...extraHosts.map((h) => h.toLowerCase())]);
  r = r.replace(/https?:\/\/[^\s)>\]]+/gi, (url) => {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return allow.has(host) || allow.has(host.replace(/^www\./, "")) ? url : "goluq.com";
    } catch {
      return "goluq.com";
    }
  });
  if (/\b(otp|one[- ]time (password|code)|cvv|card number|pin code|password|passcode)\b[^.\n]{0,40}\b(send|share|tell|enter|give|type)\b/i.test(r) || /\b(send|share|tell|enter|give|type)\b[^.\n]{0,40}\b(otp|one[- ]time (password|code)|cvv|card number|password|passcode)\b/i.test(r)) {
    return scamReply(lang);
  }
  return r;
}

/** The host of a URL, lowercase, or "" when it is not a URL. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** The owner's one-line note for an attachment alert. */
export function attachmentNote(kind: AttachmentKind): string {
  return `A ${kind} was sent and was NOT opened or forwarded. Never open files from strangers on your phone; ask them to describe it, or request it by email if it is real.`;
}
