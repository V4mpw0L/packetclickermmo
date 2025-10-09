const CACHE_NAME = "packet-clicker-cache-v2";
const ASSETS_TO_CACHE = [
  "./",
  "index.html",
  "main.js",
  "style.css",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable.png",
  "screenshot-1.png",
  "https://cdn.jsdelivr.net/gh/vikern/gamesfx/click1.mp3",
  "https://cdn.jsdelivr.net/gh/vikern/gamesfx/crit.mp3",
  "https://cdn.jsdelivr.net/gh/vikern/gamesfx/upgrade.mp3",
  "https://cdn.jsdelivr.net/gh/vikern/gamesfx/achieve.mp3",
  "https://cdn.jsdelivr.net/gh/vikern/gamesfx/coin.mp3",
  "https://cdn.tailwindcss.com", // Cache Tailwind CDN for offline styling
  "https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap", // Cache Google Fonts CSS
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[Service Worker] Caching all assets:", ASSETS_TO_CACHE);
        return cache.addAll(ASSETS_TO_CACHE);
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
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests for navigation and assets
  if (event.request.method === "GET") {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // No cache hit - fetch from network
        return fetch(event.request)
          .then(function (response) {
            // Check if we received a valid response
            if (
              !response ||
              response.status !== 200 ||
              response.type !== "basic"
            ) {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and can only be consumed once. We must clone it so that
            // we can consume the stream twice (one for the cache, one for the browser).
            var responseToCache = response.clone();

            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, responseToCache);
            });

            return response;
          })
          .catch(function (error) {
            console.log(
              "[Service Worker] Fetch failed; returning offline page or generic response:",
              error,
            );
            // You could return an offline page here if you had one
            // For now, it will simply fail the request.
          });
      }),
    );
  }
});
