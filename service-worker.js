// Derive VERSION from constants UMD when available; fallback to 0.0.19
const VERSION = (() => {
  try {
    // Load constants to access Packet.data.APP_VERSION if available
    importScripts("src/data/constants.js");
    if (
      self &&
      self.Packet &&
      self.Packet.data &&
      self.Packet.data.APP_VERSION
    ) {
      return self.Packet.data.APP_VERSION;
    }
  } catch (e) {
    console.log("[SW] Could not load constants, using fallback version");
    // ignore, fall back below
  }
  return "0.0.19";
})();

const CACHE_NAME = "packet-clicker-cache-v" + VERSION;
const ASSETS_TO_CACHE = [
  "./",
  "index.html",
  "main.js",
  "style.css",
  "manifest.json",

  // Core data and utilities
  "src/data/constants.js",
  "src/data/i18n.js",
  "src/utils/storage.js",
  "src/logic/bootstrap.js",

  // UI helpers (UMD) and new ES modules
  "src/ui/ui.js",
  "src/ui/hud.mjs",
  "src/ui/render.mjs",
  "src/effects/effects.mjs",
  "src/leaderboard/firebase.mjs",

  // App icons and images
  "src/assets/gem.png",
  "src/assets/vip.png",
  "src/assets/packet.webp",
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
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  // Production strategy:
  // - Network-first for HTML (navigation/doc requests)
  // - Stale-while-revalidate for static assets
  if (event.request.method !== "GET") return;

  const req = event.request;
  const url = new URL(req.url);
  // Do not intercept or cache cross-origin requests (e.g., Firestore/WebChannel, Google APIs)
  if (url.origin !== self.location.origin) {
    return;
  }
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
