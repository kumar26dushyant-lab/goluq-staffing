import { getActiveRef } from "./refAttribution";

const SESSION_KEY = "goluq_sid";
const UTM_KEY = "goluq_utm";

/**
 * First-party, cookie-free analytics.
 *
 * The session id lives in sessionStorage, so it dies with the tab and cannot
 * follow anyone between visits or across sites. Combined with the fact that the
 * server stores no IP and only the referrer HOST, this stays inside what DPDP
 * Act 2023 and GDPR treat as first-party measurement rather than tracking —
 * which is why the site does not need a consent banner to run it.
 *
 * If third-party pixels (Meta, Google Ads) are ever added, that changes and a
 * consent gate becomes mandatory.
 */
export function sessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

interface Utm {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landing?: string;
}

/**
 * Campaign params only appear on the landing URL, but the lead is submitted
 * pages later — so they're captured once and held for the session.
 */
export function captureUtm(): Utm {
  const stored = sessionStorage.getItem(UTM_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as Utm;
    } catch {
      /* fall through and re-capture */
    }
  }
  const p = new URLSearchParams(window.location.search);
  const utm: Utm = {
    utmSource: p.get("utm_source") || undefined,
    utmMedium: p.get("utm_medium") || undefined,
    utmCampaign: p.get("utm_campaign") || undefined,
    landing: window.location.pathname,
  };
  sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
  return utm;
}

function device(): "mobile" | "tablet" | "desktop" {
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

/** Fire-and-forget pageview. Never throws, never blocks navigation. */
export function trackPageview(path: string): void {
  try {
    const utm = captureUtm();
    const body = JSON.stringify({
      sessionId: sessionId(),
      path,
      referrer: document.referrer || "",
      ...utm,
      ref: getActiveRef() || "",
      device: device(),
      lang: document.documentElement.lang || "en",
    });
    // keepalive lets the beacon survive the page being navigated away from.
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* analytics must never break the page */
  }
}

/** Attribution fields attached to every lead, so a lead can be traced to a source. */
export function leadAttribution(): { session_id: string; source: string; landing: string } {
  try {
    const utm = captureUtm();
    const source =
      utm.utmSource ||
      (document.referrer ? new URL(document.referrer).hostname : "") ||
      "direct";
    return {
      session_id: sessionId(),
      source,
      landing: utm.landing || "/",
    };
  } catch {
    return { session_id: "", source: "direct", landing: "/" };
  }
}
