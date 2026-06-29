/**
 * Affiliate attribution (read side). The capture side (writing ?ref= on mount +
 * /api/affiliate/track) lands in Phase F; this helper is already used by the lead
 * form so the wiring is complete end-to-end the moment capture is added.
 * Stored shape: { code, exp }. Returns the code only if not expired (last-click).
 */
const KEY = "goluq_ref";
const ATTRIBUTION_DAYS = 90; // last-click window

export function getActiveRef(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { code, exp } = JSON.parse(raw) as { code: string; exp: number };
    if (!code || typeof exp !== "number" || Date.now() > exp) return null;
    return code;
  } catch {
    return null;
  }
}

/**
 * Capture an affiliate code on app mount (BUILD_SPEC §10A attribution chain):
 * read `?ref=` from the URL → store { code, exp } (last-click wins, overwrite) →
 * fire-and-forget /api/affiliate/track → strip `ref` from the visible URL so the
 * address bar stays clean while attribution is kept. No-op if absent.
 */
export function captureRefFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("ref");
    if (!code) return;

    localStorage.setItem(
      KEY,
      JSON.stringify({ code, exp: Date.now() + ATTRIBUTION_DAYS * 86400000 })
    );

    // Record the click; never block the page on it.
    fetch("/api/affiliate/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
      keepalive: true,
    }).catch(() => {});

    url.searchParams.delete("ref");
    window.history.replaceState({}, "", url.toString());
  } catch {
    /* ignore */
  }
}
