const STATION_KEY = "station.v1";
const ST_LOCAL = ["station-device", "station-snap", "station-sync", "station-stamps", "station-pack", "station-queue"];
const ST_TRACK = [
  ["junos-lab", /^junoslab-(xp|quizdone|subnet-streak|wrongq|prep-v1|predict$)/],
  ["junle", /^junle_(review|mix|mastery|stats|mistakes|track|tny_best)$/],
  ["pockle", /^pockle\.v1$/],
  ["pyle-pocket", /^pyle-pocket-v1$/],
  ["pyle", /^pyle-(save-v1|fp-last|git-v1|fs-v1)$/],
  ["subnle-pocket", /^subnle-pocket-v1$/],
  ["sleeple", /^(sleeple|dockle)\.v1$/],
  ["passle", /^passle\.v2$/],
  ["seqle", /^seqle\.v1$/],
  ["hexle", /^hexle\.v1$/],
  ["modle", /^modle-profile$/],
  ["poshle", /^poshle\.v1$/],
  ["shelle", /^shelle\.v1$/],
  ["git-lab", /^gitlab\.(v1|cases)$/],
  ["spelle", /^spelle-lab$/],
  ["webble", /^webble\.v1$/],
  ["rebble", /^rebble\.v1$/],
  ["codex", /^codex\.read$/],
  ["mscodex", /^mscodex\.read$/],
];
const ST_RANKS = [[0, "Cadet"], [50, "Deckhand"], [150, "Technician"], [350, "Engineer"], [700, "Specialist"], [1200, "Officer"], [2000, "Commander"], [3200, "Station Chief"]];
const ST_FEED = 5, ST_CAP = 80, ST_COOLDOWN = 20000;
const ST_THEMES = [
  { id: "slate", name: "Slate", price: 60, sw: ["#0b0c0e", "#c8ced6"] },
  { id: "verdant", name: "Verdant", price: 90, sw: ["#07100c", "#8fc9a3"] },
  { id: "ember", name: "Ember", price: 120, sw: ["#0e0907", "#e8a25c"] },
];
const ST_MOMENTS = [
  { id: "idle", name: "Drifting", price: 0 },
  { id: "sleep", name: "Napping", price: 20 },
  { id: "cheer", name: "Cheering", price: 25 },
  { id: "read", name: "Reading", price: 30 },
  { id: "swim", name: "Swimming", price: 35 },
  { id: "tablet", name: "On the tablet", price: 40 },
  { id: "point", name: "Pointing", price: 45 },
  { id: "crate", name: "Cargo run", price: 50 },
  { id: "blueprint", name: "Blueprints", price: 60 },
  { id: "peek", name: "Peekaboo", price: 70 },
  { id: "confused", name: "Puzzled", price: 80 },
];
const ST_GIST_FILE = "workshop-sync.json", ST_GIST_DESC = "Workshop progress sync";
const stImg = (id) => `labs/img/junie/junie-${id}.webp`;

function stDevice() {
  let d = lsGet("station-device");
  if (!d) { d = Math.random().toString(36).slice(2, 8); lsSet("station-device", d); }
  return d;
}
function stRead() {
  const s = lsParse(STATION_KEY) || {};
  return { days: s.days && typeof s.days === "object" ? s.days : {}, unlocked: Array.isArray(s.unlocked) ? s.unlocked : [], avatar: s.avatar || "idle" };
}
function stWrite(s) { lsSet(STATION_KEY, JSON.stringify(s)); }
function stSum(row) { return Object.values(row || {}).reduce((a, b) => a + (+b || 0), 0); }
function stToday(s) { return stSum(s.days[dayKey(0, true)]); }
function stLifetime(s) { return Object.values(s.days).reduce((a, r) => a + stSum(r), 0); }
function stPrice(id) {
  const t = ST_THEMES.find((x) => "theme:" + x.id === id);
  if (t) return t.price;
  const m = ST_MOMENTS.find((x) => "junie:" + x.id === id);
  return m ? m.price : 0;
}
function stBalance(s) { return stLifetime(s) - s.unlocked.reduce((a, id) => a + stPrice(id), 0); }
function stRank(total) {
  let i = 0;
  while (i + 1 < ST_RANKS.length && total >= ST_RANKS[i + 1][0]) i++;
  const next = ST_RANKS[i + 1];
  return { name: ST_RANKS[i][1], at: ST_RANKS[i][0], next: next ? next[0] : null, nextName: next ? next[1] : null };
}
function stOwns(s, id) { return id === "junie:idle" || s.unlocked.includes(id); }
function stLabOf(key) { const hit = ST_TRACK.find(([, re]) => re.test(key)); return hit ? hit[0] : null; }

function stFedDays(s) { return Object.keys(s.days).filter((d) => stSum(s.days[d]) >= ST_FEED).sort(); }
function stMood(s) {
  if (stToday(s) >= ST_FEED) return { img: s.avatar, line: "Fed and happy. Good shift today.", key: "fed" };
  const fed = stFedDays(s);
  const last = fed.length ? fed[fed.length - 1] : null;
  const gap = last ? Math.round((new Date(dayKey(0, true)) - new Date(last)) / 864e5) : 99;
  if (gap <= 1) return { img: "idle", line: "Drifting by the console, waiting for today's practice.", key: "waiting" };
  if (gap <= 3) return { img: "peek", line: "Peeking in. A few minutes in any lab and Junie perks up.", key: "peek" };
  return { img: "sleep", line: "Dozing in the airlock. Any practice wakes Junie up.", key: "asleep" };
}

function stQueue(msg) { const q = lsParse("station-queue") || []; q.push(msg); lsSet("station-queue", JSON.stringify(q.slice(-4))); }
function stationFlush() {
  if (stage.classList.contains("show")) return;
  const q = lsParse("station-queue") || [];
  if (!q.length) return;
  lsSet("station-queue", "[]");
  q.forEach((m, i) => setTimeout(() => toast(m), i * 2400));
}

function stEarn(n) {
  const s = stRead();
  const day = dayKey(0, true), dev = stDevice();
  const today = stToday(s);
  const add = Math.max(0, Math.min(n, ST_CAP - today));
  if (!add) return;
  const rankBefore = stRank(stLifetime(s)).name;
  const row = s.days[day] || (s.days[day] = {});
  row[dev] = (row[dev] || 0) + add;
  stWrite(s);
  if (today < ST_FEED && today + add >= ST_FEED) stQueue("Junie is fed · day logged");
  const rankAfter = stRank(stLifetime(s)).name;
  if (rankAfter !== rankBefore) stQueue("Promoted · " + rankAfter);
  stRender();
  stationFlush();
}

function stHash(v) {
  let h = 5381;
  for (let i = 0; i < v.length; i++) h = ((h << 5) + h + v.charCodeAt(i)) | 0;
  return v.length + ":" + (h >>> 0).toString(36);
}
function stKeys() {
  const keys = [];
  try { for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i)); } catch (e) {}
  return keys.filter((k) => k && !ST_LOCAL.includes(k));
}
function stScan(quiet) {
  const snap = lsParse("station-snap"), first = !snap;
  const stamps = lsParse("station-stamps") || {};
  const next = {}, changed = new Set(), now = Date.now();
  let any = false;
  for (const k of stKeys()) {
    const v = lsGet(k);
    if (v == null) continue;
    const h = stHash(v);
    next[k] = h;
    if (quiet) continue;
    if (first) { if (!stamps[k]) stamps[k] = 1; continue; }
    if (snap[k] !== h) {
      stamps[k] = now;
      any = true;
      const lab = stLabOf(k);
      if (lab) changed.add(lab);
    }
  }
  lsSet("station-snap", JSON.stringify(next));
  if (!quiet) lsSet("station-stamps", JSON.stringify(stamps));
  return { labs: [...changed], any };
}

const stLastEarn = {};
let stScanTimer = null;
function stObserve() {
  clearTimeout(stScanTimer);
  stScanTimer = null;
  const now = Date.now();
  let n = 0;
  const seen = stScan(false);
  for (const lab of seen.labs) {
    if (now - (stLastEarn[lab] || 0) < ST_COOLDOWN) continue;
    stLastEarn[lab] = now;
    n++;
  }
  if (n) stEarn(n);
  if (seen.any) stSyncSoon();
}
window.addEventListener("storage", (e) => {
  if (e.key && ST_LOCAL.includes(e.key)) return;
  if (!stScanTimer) stScanTimer = setTimeout(stObserve, 1500);
});

function stSyncCfg() { return lsParse("station-sync") || {}; }
function stSyncSave(c) { lsSet("station-sync", JSON.stringify(c)); }
let stSyncBusy = false, stSyncTimer = null, stSyncMsg = "";

async function stGh(path, opt) {
  const c = stSyncCfg();
  const headers = { Accept: "application/vnd.github+json", Authorization: "Bearer " + c.token, "X-GitHub-Api-Version": "2022-11-28" };
  if (opt && opt.body) headers["Content-Type"] = "application/json";
  const r = await fetch("https://api.github.com" + path, { ...(opt || {}), headers, cache: "no-store" });
  if (r.status === 401 || r.status === 403) throw new Error("token rejected");
  if (!r.ok) throw new Error("github " + r.status);
  return r.status === 204 ? null : r.json();
}

function stPayload() {
  const data = {};
  for (const k of stKeys()) { const v = lsGet(k); if (v != null) data[k] = v; }
  return { workshop: 2, at: new Date().toISOString(), device: stDevice(), stamps: lsParse("station-stamps") || {}, data };
}

function stMerge(remote) {
  const stamps = lsParse("station-stamps") || {};
  const rst = remote.stamps || {};
  let n = 0;
  for (const [k, v] of Object.entries(remote.data || {})) {
    if (ST_LOCAL.includes(k) || k === STATION_KEY || typeof v !== "string") continue;
    const rs = rst[k] || 0, lt = stamps[k] || 0, cur = lsGet(k);
    if (cur === v) { if (rs > lt) stamps[k] = rs; continue; }
    if (cur == null || rs > lt || (rs === lt && v.length > cur.length)) {
      lsSet(k, v);
      stamps[k] = Math.max(rs, lt);
      n++;
    }
  }
  let r = null;
  try { r = JSON.parse((remote.data || {})[STATION_KEY] || "null"); } catch (e) {}
  if (r && r.days) {
    const s = stRead();
    for (const [d, row] of Object.entries(r.days)) {
      const mine = s.days[d] || (s.days[d] = {});
      for (const [dev, v] of Object.entries(row || {})) mine[dev] = Math.max(mine[dev] || 0, +v || 0);
    }
    s.unlocked = [...new Set(s.unlocked.concat(Array.isArray(r.unlocked) ? r.unlocked : []))];
    if (r.avatar && (rst[STATION_KEY] || 0) > (stamps[STATION_KEY] || 0)) s.avatar = r.avatar;
    stWrite(s);
  }
  lsSet("station-stamps", JSON.stringify(stamps));
  return n;
}

async function stSyncNow(manual) {
  const c = stSyncCfg();
  if (!c.token || !c.gist || stSyncBusy) return;
  if (!navigator.onLine) { if (manual) toast("offline · will sync later"); return; }
  stSyncBusy = true;
  stSyncMsg = "syncing";
  stRender();
  try {
    stObserve();
    const g = await stGh("/gists/" + c.gist);
    const f = g.files && g.files[ST_GIST_FILE];
    let remote = null;
    if (f) {
      let txt = f.content;
      if (f.truncated && f.raw_url) txt = await (await fetch(f.raw_url, { cache: "no-store" })).text();
      try { remote = JSON.parse(txt); } catch (e) {}
    }
    let pulled = 0;
    if (remote && remote.data) {
      pulled = stMerge(remote);
      stScan(true);
      if (pulled) { renderToday(); setTheme(lsGet("workshop-theme") || "void"); }
    }
    await stGh("/gists/" + c.gist, { method: "PATCH", body: JSON.stringify({ files: { [ST_GIST_FILE]: { content: JSON.stringify(stPayload()) } } }) });
    const cfg = stSyncCfg();
    cfg.last = Date.now();
    stSyncSave(cfg);
    stSyncMsg = "";
    if (manual || pulled) toast(pulled ? `synced · ${pulled} update${pulled === 1 ? "" : "s"} pulled in` : "synced");
  } catch (e) {
    stSyncMsg = "failed · " + e.message;
    if (manual) toast("sync failed · " + e.message);
  } finally {
    stSyncBusy = false;
    stRender();
  }
}
function stSyncSoon() {
  const c = stSyncCfg();
  if (!c.token || !c.gist) return;
  clearTimeout(stSyncTimer);
  stSyncTimer = setTimeout(() => stSyncNow(false), 60000);
}

async function stConnect(token) {
  stSyncSave({ token });
  stSyncMsg = "connecting";
  stRender();
  try {
    const list = await stGh("/gists?per_page=100");
    let hit = (list || []).find((g) => g.files && g.files[ST_GIST_FILE]);
    if (!hit) {
      hit = await stGh("/gists", { method: "POST", body: JSON.stringify({ description: ST_GIST_DESC, public: false, files: { [ST_GIST_FILE]: { content: JSON.stringify(stPayload()) } } }) });
    }
    stSyncSave({ token, gist: hit.id });
    stSyncMsg = "";
    await stSyncNow(true);
  } catch (e) {
    stSyncSave({});
    stSyncMsg = "";
    toast("connect failed · " + e.message);
    stRender();
  }
}

const ST_PACK_EXTRA = ["./", "./index.html", "./manifest.webmanifest", "./css/launcher.css?v=12", "./js/labs.config.js?v=17", "./js/launcher.js?v=17", "./js/station.js?v=2", "./icons/icon-192.png", "./icons/icon-512.png"];
let stPackBusy = false, stPackGuard = null;
function stPackInfo() { return lsParse("station-pack") || {}; }
async function stPack(manual) {
  if (stPackBusy || !("serviceWorker" in navigator)) { if (manual && !("serviceWorker" in navigator)) toast("offline mode not supported here"); return; }
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  const sw = reg && reg.active;
  if (!sw) { if (manual) toast("offline engine still starting · try again"); return; }
  stPackBusy = true;
  stRender();
  clearTimeout(stPackGuard);
  stPackGuard = setTimeout(() => { if (stPackBusy) { stPackBusy = false; stRender(); } }, 120000);
  const urls = ST_PACK_EXTRA.concat(labs.map((l) => "./" + l.path), ST_MOMENTS.map((m) => "./" + stImg(m.id)));
  sw.postMessage({ type: "pack", urls });
}
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (e) => {
    const d = e.data || {};
    if (d.type === "pack-progress") { stPackBusy = true; stPackCount = d.ok; clearTimeout(stPackGuard); stPackGuard = setTimeout(() => { stPackBusy = false; stRender(); }, 120000); stRender(); }
    if (d.type === "packed") {
      stPackBusy = false;
      clearTimeout(stPackGuard);
      lsSet("station-pack", JSON.stringify({ at: Date.now(), files: d.ok, cache: d.cache }));
      stRender();
      toast(`offline ready · ${d.ok} files stored`);
    }
  });
}
let stPackCount = 0;
async function stPackCheck() {
  if (!("caches" in window) || !navigator.onLine) return;
  const p = stPackInfo();
  const keys = await caches.keys().catch(() => []);
  const stale = !p.at || !keys.includes(p.cache) || Date.now() - p.at > 3 * 864e5;
  if (stale) stPack(false);
}

const stStrip = document.createElement("button");
stStrip.className = "station-strip";
stStrip.type = "button";
stStrip.title = "Station · rank, Junie, unlocks, sync";
document.querySelector(".title-block").after(stStrip);

const stPanel = document.createElement("aside");
stPanel.className = "station";
stPanel.hidden = true;
stPanel.setAttribute("aria-label", "Station");
$("scene").appendChild(stPanel);

function stOpen() { stPanel.hidden = false; requestAnimationFrame(() => stPanel.classList.add("show")); stRender(); }
function stClose() { stPanel.classList.remove("show"); setTimeout(() => { if (!stPanel.classList.contains("show")) stPanel.hidden = true; }, 260); }
stStrip.addEventListener("click", () => (stPanel.classList.contains("show") ? stClose() : stOpen()));
document.addEventListener("keydown", (e) => {
  if (stPanel.classList.contains("show") && e.key === "Escape") { e.stopPropagation(); stClose(); }
}, true);

function stAgo(ts) { return ts ? timeAgo(ts) : "never"; }

function stRender() {
  const s = stRead();
  const total = stLifetime(s), bal = stBalance(s), today = stToday(s), r = stRank(total), mood = stMood(s);
  const pct = r.next ? Math.round(((total - r.at) / (r.next - r.at)) * 100) : 100;
  stStrip.classList.toggle("fed", mood.key === "fed");
  stStrip.innerHTML = `<img src="${stImg(mood.img)}" alt="">
    <span class="ss-body"><span class="ss-rank">${esc(r.name)}<span class="ss-sep">·</span><span class="ss-bal">${bal} sparks</span></span>
    <span class="ss-bar"><span style="width:${Math.min(100, (today / ST_FEED) * 100)}%"></span></span></span>
    <span class="ss-state">${mood.key === "fed" ? "fed" : Math.min(today, ST_FEED) + "/" + ST_FEED}</span>`;
  if (stPanel.hidden) return;

  const c = stSyncCfg(), p = stPackInfo();
  const syncLine = !c.token ? "not connected" : stSyncMsg ? stSyncMsg : "last sync " + stAgo(c.last);
  const packLine = stPackBusy ? `storing · ${stPackCount} files` : p.at ? `ready · ${p.files} files · ${stAgo(p.at)}` : "not stored yet";

  stPanel.innerHTML = `
    <div class="notes-head"><p class="eyebrow">station</p><button class="notes-x" data-act="close" aria-label="Close station">×</button></div>
    <div class="st-scroll">
      <section class="st-junie">
        <img src="${stImg(mood.img)}" alt="Junie">
        <div>
          <p class="st-mood">${esc(mood.line)}</p>
          <div class="st-meter"><span style="width:${Math.min(100, (today / ST_FEED) * 100)}%"></span></div>
          <p class="st-sub">${today >= ST_FEED ? `today ${today} sparks · day logged` : `today ${today} of ${ST_FEED} sparks to feed Junie`}</p>
        </div>
      </section>
      <section class="st-block">
        <div class="st-row"><span class="st-k">rank</span><span class="st-v">${esc(r.name)}</span></div>
        <div class="st-meter"><span style="width:${pct}%"></span></div>
        <p class="st-sub">${r.next ? `${total} lifetime · ${r.next - total} to ${esc(r.nextName)}` : `${total} lifetime · top rank`}</p>
        <div class="st-row"><span class="st-k">balance</span><span class="st-v">${bal} sparks</span></div>
        <p class="st-sub">Earn by practising in any lab. Up to ${ST_CAP} a day.</p>
      </section>
      <p class="notes-lab">themes</p>
      <section class="st-list">
        ${ST_THEMES.map((t) => {
          const own = stOwns(s, "theme:" + t.id), on = (lsGet("workshop-theme") || "void") === t.id;
          return `<div class="st-item"><span class="st-swatch" style="background:${t.sw[0]};box-shadow:inset -10px 0 0 ${t.sw[1]}"></span><span class="st-name">${esc(t.name)}</span>
            ${own ? `<button data-act="theme" data-id="${t.id}" class="${on ? "on" : ""}">${on ? "active" : "apply"}</button>` : `<button data-act="buy" data-id="theme:${t.id}" ${bal < t.price ? "disabled" : ""}>${t.price}</button>`}</div>`;
        }).join("")}
      </section>
      <p class="notes-lab">junie moments</p>
      <section class="st-grid">
        ${ST_MOMENTS.map((m) => {
          const id = "junie:" + m.id, own = stOwns(s, id), on = s.avatar === m.id;
          return `<button class="st-moment${own ? " own" : ""}${on ? " on" : ""}" data-act="${own ? "avatar" : "buy"}" data-id="${own ? m.id : id}" ${!own && bal < m.price ? "disabled" : ""} title="${esc(m.name)}">
            <img src="${stImg(m.id)}" alt=""><span>${own ? esc(m.name) : m.price}</span></button>`;
        }).join("")}
      </section>
      <p class="st-sub st-pad">Owned moments show on the strip once Junie is fed.</p>
      <p class="notes-lab">sync between devices</p>
      <section class="st-block">
        <div class="st-row"><span class="st-k">status</span><span class="st-v">${esc(syncLine)}</span></div>
        ${c.token
          ? `<div class="st-actions"><button data-act="sync">Sync now</button><button data-act="unsync">Disconnect</button></div>`
          : `<form class="st-connect" data-act="connect"><input type="password" name="token" placeholder="github token · gist access" autocomplete="off" spellcheck="false"><button type="submit">Connect</button></form>
             <p class="st-sub">One private gist holds your progress. Make a fine-grained token with only Gists read/write, paste it once per device.</p>`}
      </section>
      <p class="notes-lab">offline</p>
      <section class="st-block">
        <div class="st-row"><span class="st-k">labs on this device</span><span class="st-v">${esc(packLine)}</span></div>
        <div class="st-actions"><button data-act="pack" ${stPackBusy ? "disabled" : ""}>Store for offline</button></div>
      </section>
    </div>`;
}

stPanel.addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (!b || b.tagName === "FORM") return;
  const act = b.dataset.act, id = b.dataset.id;
  if (act === "close") stClose();
  if (act === "buy") {
    const s = stRead(), price = stPrice(id);
    if (stOwns(s, id) || stBalance(s) < price) return;
    s.unlocked.push(id);
    if (id.startsWith("junie:")) s.avatar = id.slice(6);
    stWrite(s);
    if (id.startsWith("theme:")) { stThemeButtons(); setTheme(id.slice(6)); }
    toast("unlocked · " + (ST_THEMES.find((t) => "theme:" + t.id === id) || ST_MOMENTS.find((m) => "junie:" + m.id === id)).name);
    stObserve();
    stRender();
  }
  if (act === "avatar") { const s = stRead(); s.avatar = id; stWrite(s); stObserve(); stRender(); }
  if (act === "theme") { setTheme(id); stRender(); }
  if (act === "sync") stSyncNow(true);
  if (act === "unsync") { stSyncSave({}); stSyncMsg = ""; stRender(); toast("sync disconnected on this device"); }
  if (act === "pack") stPack(true);
});
stPanel.addEventListener("submit", (e) => {
  e.preventDefault();
  const t = (e.target.token && e.target.token.value || "").trim();
  if (t) stConnect(t);
});

function stThemeButtons() {
  const bar = $("themeToggle"), s = stRead();
  bar.querySelectorAll("[data-unlock]").forEach((b) => b.remove());
  for (const t of ST_THEMES) {
    if (!stOwns(s, "theme:" + t.id)) continue;
    const b = document.createElement("button");
    b.dataset.theme = t.id;
    b.dataset.unlock = "1";
    b.textContent = t.name;
    b.addEventListener("click", () => { setTheme(t.id); stRender(); });
    bar.appendChild(b);
  }
  const cur = lsGet("workshop-theme") || "void";
  bar.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.theme === cur));
}

stThemeButtons();
{
  const cur = lsGet("workshop-theme") || "void";
  if (ST_THEMES.some((t) => t.id === cur) && !stOwns(stRead(), "theme:" + cur)) setTheme("void");
  else setTheme(cur);
}
{
  const catchUp = stScan(false);
  if (catchUp.labs.length) stEarn(Math.min(catchUp.labs.length * 2, 10));
}
stRender();
setTimeout(stationFlush, 1600);
setTimeout(() => stSyncNow(false), 1500);
setTimeout(stPackCheck, 4000);
setInterval(() => { if (!document.hidden) stSyncNow(false); }, 5 * 60000);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { stObserve(); stSyncNow(false); }
  else { stObserve(); stRender(); stationFlush(); }
});
window.addEventListener("online", () => stSyncNow(false));
