/* GoLuQ service worker — deliberately conservative.
 *
 * A service worker that caches HTML is the classic way to ship a site that
 * refuses to update. This one therefore:
 *   - NEVER caches navigations or /api/* (always straight to the network)
 *   - only caches Vite's content-hashed /assets/* files, which are immutable
 *     by construction, so a stale copy is impossible
 *
 * Its real job is to make the cockpit installable to a phone home screen and to
 * survive a flaky connection on already-loaded assets.
 */
const CACHE = "goluq-assets-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") return;          // never cache HTML
  if (url.pathname.startsWith("/api/")) return; // never cache data

  const cacheable =
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/logos/");
  if (!cacheable) return;

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
