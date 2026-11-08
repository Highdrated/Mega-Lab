// Loads every lab page in headless Chromium and fails on JS errors, missing local files
// or a missing ambient layer. Run: node tests/smoke.mjs   (needs `playwright`)
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split("?")[0]));
  if (!f.startsWith(root)) { r.statusCode = 403; return r.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) { r.statusCode = 404; return r.end("nf"); }
  r.setHeader("content-type", types[path.extname(f)] || "application/octet-stream");
  r.end(fs.readFileSync(f));
});
await new Promise((res) => server.listen(0, res));
const base = `http://localhost:${server.address().port}/`;
const pages = ["index.html", "traffic.html",
  ...fs.readdirSync(path.join(root, "labs")).filter((f) => f.endsWith(".html")).map((f) => "labs/" + f),
  "labs/junos-lab/index.html", "labs/modle/index.html", "labs/modle/network/index.html"];
const REDIRECT_STUBS = new Set(["labs/dockle.html"]);
const browser = await chromium.launch();
let bad = 0;
for (const p of pages) {
  const pg = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  const errs = [];
  pg.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  pg.on("response", (r) => { if (r.status() >= 400 && r.url().startsWith(base)) errs.push(r.status() + " " + r.url()); });
  await pg.goto(base + p, { waitUntil: "load" });
  await pg.waitForTimeout(1500);
  if (p.startsWith("labs/") && !REDIRECT_STUBS.has(p) && !p.includes("network/") && !(await pg.$(".soul-tg")) &&
      !["labs/hexle.html", "labs/pyle.html", "labs/junle.html"].includes(p)) errs.push("ambient layer missing");
  console.log((errs.length ? "FAIL " : "ok   ") + p + (errs.length ? "\n   " + [...new Set(errs)].join("\n   ") : ""));
  if (errs.length) bad++;
  await pg.close();
}
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
