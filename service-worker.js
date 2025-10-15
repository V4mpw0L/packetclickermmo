// Derive VERSION from constants UMD when available; fallback to 0.0.39
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
  return "0.0.39";
})();

// Force update flag uses the same version from constants
const FORCE_UPDATE_VERSION = VERSION;

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
  "src/utils/performance.mjs",
  "src/logic/bootstrap.js",

  // Styles and patches
  "src/styles/inventory-optimized.css",
  "src/patches/performance-integration.mjs",

  // UI helpers (UMD) and new ES modules
  "src/ui/ui.js",
  "src/ui/hud.mjs",
  "src/ui/render.mjs",
  "src/effects/effects.mjs",
  "src/leaderboard/firebase.mjs",
  "src/items/equipment.mjs",
  "src/items/equipment-optimized.mjs",

  // Core app icons and images (packet.webp prioritized)
  "src/assets/packet.webp",
  "src/assets/packet-512.png",
  "src/assets/packet-64.png",
  "src/assets/packet-48.png",
  "src/assets/packet-32.png",
  "src/assets/gem.png",
  "src/assets/gemm.png",
  "src/assets/vip.png",
  "src/assets/settings.webp",

  // Audio
  "src/assets/hit.wav",

  // Cursor/combo effect assets
  "src/assets/green.webp",
  "src/assets/gold.webp",
  "src/assets/blue.webp",
  "src/assets/pink.webp",
  "src/assets/animal.webp",

  // Essential item icons (most commonly used)
  "src/assets/items/I_Sapphire.png",
  "src/assets/items/I_Diamond.png",
  "src/assets/items/I_Ruby.png",
  "src/assets/items/I_Amethist.png",
  "src/assets/items/I_Jade.png",
  "src/assets/items/I_Opal.png",
  "src/assets/items/I_Agate.png",
  "src/assets/items/I_GoldCoin.png",
  "src/assets/items/I_SilverCoin.png",
  "src/assets/items/I_BronzeCoin.png",
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

  // Skip waiting immediately for force updates
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Clear old caches
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

      // Force refresh for clients with old saves
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          // Send message to client to check if force update is needed
          client.postMessage({
            type: "VERSION_UPDATE",
            version: VERSION,
            forceUpdateVersion: FORCE_UPDATE_VERSION,
          });
        });
      }),
    ]),
  );

  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "FORCE_REFRESH") {
    // Clear all caches and force refresh
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              console.log("[Service Worker] Force clearing cache:", cacheName);
              return caches.delete(cacheName);
            }),
          );
        })
        .then(() => {
          // Notify all clients to refresh
          return self.clients.matchAll();
        })
        .then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: "FORCE_RELOAD" });
          });
        }),
    );
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
