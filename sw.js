const CACHE = "workshop-v35";
const PRECACHE = [
  "./",
  "./index.html",
  "./css/launcher.css?v=13",
  "./js/traffic.config.js?v=1",
  "./js/track.js?v=1",
  "./js/sync.js?v=3",
  "./js/labs.config.js?v=21",
  "./js/launcher.js?v=18",
  "./js/station.js?v=2",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];
const NO_CACHE_HOSTS = ["api.github.com", "gist.githubusercontent.com", "gc.zgo.at"];
const NET_WAIT = 2500;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fallback(req) {
  return caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("./index.html") : Response.error()));
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (NO_CACHE_HOSTS.includes(url.hostname) || url.hostname.endsWith(".goatcounter.com")) return;
  e.respondWith(new Promise((resolve) => {
    let done = false;
    const finish = (res) => { if (!done) { done = true; resolve(res); } };
    const slow = setTimeout(() => { caches.match(req).then((hit) => { if (hit) finish(hit); }); }, NET_WAIT);
    fetch(req, { cache: "no-cache" })
      .then((res) => {
        clearTimeout(slow);
        if (res.ok || res.type === "opaque") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        finish(res);
      })
      .catch(() => { clearTimeout(slow); if (!done) fallback(req).then(finish); });
  }));
});

const REF = /["'`(]((?:\.{1,2}\/)?[\w\-./]+?\.(?:html|js|mjs|css|json|webp|png|jpe?g|svg|gif|mp3|wav|ogg|woff2?|ttf)(?:\?[\w=.&-]*)?)["'`)]/gi;
const TEXTY = /\.(html|js|mjs|css|json)$/i;

async function pack(urls, client) {
  const cache = await caches.open(CACHE);
  const scope = self.registration.scope;
  const seen = new Set();
  const queue = urls.map((u) => { const abs = new URL(u, scope).href; return [abs, 0, abs]; });
  let ok = 0;
  while (queue.length && seen.size < 1200) {
    const [u, depth, page] = queue.shift();
    if (seen.has(u) || !u.startsWith(scope)) continue;
    seen.add(u);
    try {
      const res = await fetch(u, { cache: "no-cache" });
      if (!res.ok) continue;
      await cache.put(u, res.clone());
      ok++;
      if (ok % 25 === 0 && client) client.postMessage({ type: "pack-progress", ok });
      const path = new URL(u).pathname;
      if (depth >= 3 || !TEXTY.test(path)) continue;
      const text = await res.text();
      const root = /\.html$/i.test(path) ? u : page;
      for (const m of text.matchAll(REF)) {
        const ref = m[1];
        if (ref.startsWith("//")) continue;
        const bases = /\.(js|mjs|json)$/i.test(path) ? [u, root] : [u];
        for (const b of bases) {
          let abs;
          try { abs = new URL(ref, b).href; } catch (err) { continue; }
          if (!seen.has(abs)) queue.push([abs, depth + 1, root]);
        }
      }
    } catch (err) {}
  }
  if (client) client.postMessage({ type: "packed", ok, cache: CACHE });
}

self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.type === "pack" && Array.isArray(d.urls)) e.waitUntil(pack(d.urls, e.source));
});
