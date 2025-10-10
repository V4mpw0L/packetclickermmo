const CACHE_NAME = "packet-clicker-cache-v0.0.2";
const VERSION = "0.0.2";
const ASSETS_TO_CACHE = [
  "./",
  "index.html",
  "main.js",
  "src/data/constants.js",
  "src/ui/ui.js",
  "src/logic/bootstrap.js",
  "src/utils/storage.js",
  "style.css",
  "manifest.json",

  "src/assets/gem.png",
  "src/assets/packet-32.png",
  "src/assets/packet-48.png",
  "src/assets/packet-64.png",
  "src/assets/packet-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log(
          "[Service Worker] Caching all assets (best-effort):",
          ASSETS_TO_CACHE,
        );
        const CORE_BUST = new Set([
          "./",
          "index.html",
          "main.js",
          "style.css",
          "manifest.json",
        ]);
        return Promise.allSettled(
          ASSETS_TO_CACHE.map((url) => {
            const req = CORE_BUST.has(url)
              ? new Request(
                  url + (url.includes("?") ? "&" : "?") + "v=" + VERSION,
                  { cache: "reload" },
                )
              : new Request(url, { cache: "reload" });
            return cache.add(req).catch((err) => {
              console.warn("[Service Worker] Skipped caching:", url, err);
            });
          }),
        );
      })
      .catch((error) => {
        console.error(
          "[Service Worker] Failed to cache assets during install:",
          error,
        );
      }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", cache);
            return caches.delete(cache);
          }
        }),
      );
    }),
  );
  self.clients.claim();
  self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
      self.skipWaiting();
    }
  });
});

self.addEventListener("fetch", (event) => {
  // Production strategy:
  // - Network-first for HTML (navigation/doc requests)
  // - Stale-while-revalidate for static assets
  if (event.request.method !== "GET") return;

  const req = event.request;
  const isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    // Network-first for HTML: always try network, fall back to cache/index.html
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (!res || res.status !== 200) {
            // Fallback to cached page
            return (
              caches.match(req, { ignoreSearch: true }) ||
              caches.match("index.html", { ignoreSearch: true })
            );
          }
          const copy = res.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(req, copy))
            .catch(() => {});
          return res;
        })
        .catch(() =>
          caches
            .match(req, { ignoreSearch: true })
            .then(
              (r) => r || caches.match("index.html", { ignoreSearch: true }),
            ),
        ),
    );
    return;
  }

  // Stale-while-revalidate for assets
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          // Cache successful basic/cors responses
          if (
            res &&
            res.status === 200 &&
            (res.type === "basic" || res.type === "cors")
          ) {
            const copy = res.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(req, copy))
              .catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      // Return cache immediately if present, while revalidating in background
      return cached || fetchPromise;
    }),
  );
});
