const routes = [];
let notFound = null;
let currentPath = null;
let beforeEach = null;

export function route(pattern, handler) {
  const parts = pattern.split("/").filter(Boolean);
  routes.push({ parts, handler, pattern });
}

export function fallback(handler) { notFound = handler; }

function parse(hash) {
  const raw = (hash || "").replace(/^#/, "").replace(/^\//, "");
  return raw.split("/").filter(Boolean);
}

function match(parts) {
  for (const r of routes) {
    if (r.parts.length !== parts.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < r.parts.length; i++) {
      const p = r.parts[i];
      if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(parts[i]);
      else if (p !== parts[i]) { ok = false; break; }
    }
    if (ok) return { handler: r.handler, params };
  }
  return null;
}

export function go(path) {
  const target = "#" + (path.startsWith("/") ? path : "/" + path);
  if (location.hash === target) resolve();
  else location.hash = target;
}

export const here = () => currentPath;

export function before(fn) { beforeEach = fn; }

function resolve() {
  const hq = (location.hash || "").split("?");
  const parts = parse(hq[0]);
  const query = {};
  new URLSearchParams(hq[1] || "").forEach((v, k) => { query[k] = v; });
  const path = "/" + parts.join("/");
  const hit = match(parts);
  if (beforeEach) beforeEach(currentPath, path);
  currentPath = path;
  document.querySelectorAll("[data-nav]").forEach(a => {
    const seg = a.getAttribute("data-nav");
    a.classList.toggle("on", parts[0] === seg || (seg === "" && parts.length === 0));
  });
  if (hit) hit.handler(Object.assign({}, hit.params, { query: query }));
  else if (notFound) notFound(path);
  window.scrollTo(0, 0);
}

export function start() {
  window.addEventListener("hashchange", resolve);
  if (!location.hash) location.replace("#/");
  resolve();
}
