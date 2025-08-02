self.addEventListener('install', e => {
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  // Fallback: let network always win, for now (or add cache if quiser offline!)
});
