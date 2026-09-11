/* JunOS Lab service worker — after one visit over http(s), the whole lab
   works with no server running at all. Network-first so updates land when a
   server IS present; cache answers when it is not. */
const CACHE = "junoslab-v2";
const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-512.png",
  "./css/style.css",
  "./js/core.js",
  "./js/sound.js",
  "./js/grammar.js",
  "./js/cli.js",
  "./js/engine.js",
  "./js/ui.js",
  "./js/planner.js",
  "./js/juno.js",
  "./js/scenarios.js",
  "./js/protocols.js",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if(e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })
        .then(hit => hit || caches.match("./index.html"))));
});
