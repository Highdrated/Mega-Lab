import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const cfg = readFileSync("js/traffic.config.js", "utf8");
const code = (cfg.match(/goatcounter:\s*"([^"]*)"/) || [])[1] || "";
const token = process.env.GOATCOUNTER_TOKEN || "";

if (!code || !token) {
  console.log("Traffic not configured yet: set goatcounter in js/traffic.config.js and the GOATCOUNTER_TOKEN secret.");
  process.exit(0);
}

const base = `https://${code}.goatcounter.com/api/v0`;
const iso = (d) => d.toISOString().slice(0, 19) + "Z";
const now = new Date();
const daysAgo = (n) => new Date(now.getTime() - n * 864e5);

async function get(path, params) {
  const url = new URL(base + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
    if (res.status === 429) { await new Promise((r) => setTimeout(r, 1500)); continue; }
    if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
    return res.json();
  }
  throw new Error(`${path} -> rate limited`);
}

const pause = () => new Promise((r) => setTimeout(r, 300));
const month = { start: iso(daysAgo(30)), end: iso(now) };
const week = { start: iso(daysAgo(7)), end: iso(now) };

const total30 = await get("/stats/total", month); await pause();
const total7 = await get("/stats/total", week); await pause();
const locations = await get("/stats/locations", { ...month, limit: 40 }); await pause();
const hits = await get("/stats/hits", { ...month, limit: 40 }); await pause();
const refs = await get("/stats/toprefs", { ...month, limit: 15 }); await pause();
const systems = await get("/stats/systems", { ...month, limit: 10 });

const daily = [];
for (const s of total30.stats || []) {
  if (s.day) daily.push({ day: s.day, count: (s.daily != null ? s.daily : (s.hourly || []).reduce((a, b) => a + b, 0)) });
}

const pick = (list) => (list || []).map((s) => ({ id: s.id, name: s.name || s.id || "unknown", count: s.count }));
const pages = [];
const labs = [];
for (const h of hits.hits || []) {
  const row = { path: h.path, title: h.title || "", count: h.count };
  (h.event ? labs : pages).push(row);
}

const out = {
  updated: now.toISOString(),
  window: "30d",
  total30: total30.total || 0,
  total7: total7.total || 0,
  daily,
  countries: pick(locations.stats),
  pages,
  labs: labs.map((l) => ({ ...l, path: l.path.replace(/^\/?lab\//, "") })),
  referrers: pick(refs.stats),
  systems: pick(systems.stats)
};

mkdirSync("data", { recursive: true });
writeFileSync("data/traffic.json", JSON.stringify(out, null, 2) + "\n");
console.log(`Saved: ${out.total30} visits in 30 days from ${out.countries.length} countries.`);
