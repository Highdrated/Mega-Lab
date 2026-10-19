requestAnimationFrame(() => document.getElementById("scene").classList.add("booted"));
const SVGNS = "http://www.w3.org/2000/svg";
const RADII = { "ring-inner": 90, "ring-mid": 160, "ring-outer": 230 };
const RING_NAMES = { "ring-inner": "inner orbit", "ring-mid": "mid orbit", "ring-outer": "outer orbit" };
const CX = 450, CY = 310;
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const $ = (id) => document.getElementById(id) || document.createElement("div");
const roomsEl = $("rooms");
const markersEl = $("markers");

function lsGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
function lsSet(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
function lsJson(key) { try { return JSON.parse(lsGet(key)) || {}; } catch (e) { return {}; } }

function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

const labs = LABS_CONFIG.map((lab, i) => {
  const ring = RADII[lab.ring] ? lab.ring : "ring-mid";
  const angle = ((lab.angle || 0) % 360 + 360) % 360;
  const a = angle * Math.PI / 180;
  const r = RADII[ring];
  return { ...lab, ring, index: i, angle, x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r, sector: (lab.tag || "general").trim() };
});

const SECTOR_ORDER = ["network", "code", "practice", "reference"];
const sectors = [];
for (const lab of labs) {
  const key = lab.sector.toLowerCase();
  let s = sectors.find((x) => x.key === key);
  if (!s) { s = { key, name: lab.sector, labs: [] }; sectors.push(s); }
  s.labs.push(lab);
}
const rank = (k) => { const i = SECTOR_ORDER.indexOf(k); return i < 0 ? 99 : i; };
sectors.sort((a, b) => rank(a.key) - rank(b.key));

function bearing(lab) { return String(Math.round((lab.angle + 90) % 360)).padStart(3, "0") + "°"; }

const chipsEl = $("sectorChips");
let activeSector = lsGet("workshop-sector") || "all";
if (activeSector !== "all" && activeSector !== "today" && !sectors.some((s) => s.key === activeSector)) activeSector = "all";
for (const s of [{ key: "all", name: "All", labs }, ...sectors]) {
  const chip = document.createElement("button");
  chip.className = "chip";
  chip.dataset.sector = s.key;
  chip.innerHTML = `${esc(s.name)}<span>${s.labs.length}</span>`;
  chip.addEventListener("click", () => { activeSector = s.key; lsSet("workshop-sector", s.key); applyFilter(); });
  chipsEl.appendChild(chip);
}

let order = 0;
for (const s of sectors) {
  const group = document.createElement("section");
  group.className = "sector-group";
  group.dataset.sector = s.key;
  const head = document.createElement("div");
  head.className = "sector";
  head.style.setProperty("--i", order++);
  head.innerHTML = `<span>${esc(s.name)}</span><span class="count">${s.labs.length}</span>`;
  const grid = document.createElement("div");
  grid.className = "room-grid";
  group.append(head, grid);
  roomsEl.appendChild(group);
  for (const lab of s.labs) {
    const btn = document.createElement("button");
    btn.className = "room";
    btn.dataset.id = lab.id;
    btn.dataset.sector = s.key;
    btn.title = `${lab.name} · ${RING_NAMES[lab.ring]} · ${bearing(lab)}`;
    btn.style.setProperty("--i", order++);
    btn.innerHTML = `
      <svg class="glyph" viewBox="0 0 16 16">${lab.glyph || ""}</svg>
      <span class="body">
        <span class="name">${esc(lab.name)}<span class="last">last</span><span class="open-dot">open</span></span>
        <span class="tag">${esc(lab.sub || lab.sector)}</span>
      </span>
      <span class="idx">${String(lab.index + 1).padStart(2, "0")}</span>`;
    grid.appendChild(btn);
  }
}

const emptyEl = document.createElement("div");
emptyEl.className = "empty";
emptyEl.textContent = "no rooms on that heading";
emptyEl.hidden = true;
roomsEl.appendChild(emptyEl);

labs.forEach((lab, i) => {
  const { x, y } = lab;
  const right = x >= CX - 4;
  const lx = right ? x + 12 : x - 12;
  const anchor = right ? "start" : "end";
  const g = document.createElementNS(SVGNS, "g");
  g.setAttribute("class", "marker");
  g.setAttribute("tabindex", "0");
  g.setAttribute("role", "button");
  g.setAttribute("aria-label", `Open ${lab.name}`);
  g.dataset.id = lab.id;
  g.style.setProperty("--i", i);
  g.innerHTML = `
    <circle class="hit" cx="${x}" cy="${y}" r="20"/>
    <circle class="halo" cx="${x}" cy="${y}" r="10"/>
    <path class="bracket" d="M${x - 9} ${y - 13}h-4v4M${x + 9} ${y - 13}h4v4M${x - 9} ${y + 13}h-4v-4M${x + 9} ${y + 13}h4v-4"/>
    <circle class="planet" cx="${x}" cy="${y}" r="4.5"/>
    <circle class="dotm" cx="${x}" cy="${y}" r="1.4"/>
    <text class="mlabel" x="${lx}" y="${y + 1}" text-anchor="${anchor}">${esc(lab.name)}</text>
    <text class="mtag" x="${lx}" y="${y + 11}" text-anchor="${anchor}">${esc(lab.sub || lab.sector)}</text>`;
  markersEl.appendChild(g);
});

$("nodeCount").textContent = labs.length;
$("sectorCount").textContent = sectors.length;

(function buildRingLabels() {
  const g = $("ringLabels");
  for (const ring of Object.keys(RADII)) {
    const onRing = [...new Set(labs.filter((l) => l.ring === ring).map((l) => l.sector.toLowerCase()))];
    if (!onRing.length) continue;
    const t = document.createElementNS(SVGNS, "text");
    t.setAttribute("class", "ring-label");
    t.setAttribute("data-ring", ring);
    t.setAttribute("x", CX);
    t.setAttribute("y", CY - RADII[ring] - 6);
    t.setAttribute("text-anchor", "middle");
    t.textContent = onRing.join(" / ");
    g.appendChild(t);
  }
})();

(function buildTicks() {
  const g = $("ticks"), r = 240;
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2, major = i % 10 === 0, len = major ? 6 : 2.5;
    const line = document.createElementNS(SVGNS, "line");
    line.setAttribute("x1", CX + Math.cos(a) * r); line.setAttribute("y1", CY + Math.sin(a) * r);
    line.setAttribute("x2", CX + Math.cos(a) * (r + len)); line.setAttribute("y2", CY + Math.sin(a) * (r + len));
    if (major) line.setAttribute("class", "major");
    g.appendChild(line);
  }
})();

(function buildGrid() {
  const g = $("grid");
  const lines = [[CX - 300, CY, CX + 300, CY], [CX, CY - 290, CX, CY + 290]];
  for (const d of [45, 135]) {
    const a = d * Math.PI / 180;
    lines.push([CX - Math.cos(a) * 260, CY - Math.sin(a) * 260, CX + Math.cos(a) * 260, CY + Math.sin(a) * 260]);
  }
  for (const [x1, y1, x2, y2] of lines) {
    const l = document.createElementNS(SVGNS, "line");
    l.setAttribute("x1", x1); l.setAttribute("y1", y1); l.setAttribute("x2", x2); l.setAttribute("y2", y2);
    g.appendChild(l);
  }
})();

const starfield = (() => {
  const canvas = $("stars");
  const ctx = canvas.getContext("2d");
  let stars = [], w = 0, h = 0, dpr = 1, px = 0, py = 0, tx = 0, ty = 0, rgb = "230,240,255", raf = null;

  function readColor() { rgb = getComputedStyle(document.body).getPropertyValue("--star").trim() || rgb; }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(420, (w * h) / 4200));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      z: Math.random() ** 2,
      tw: Math.random() * Math.PI * 2,
      sp: 0.4 + Math.random() * 1.6,
    }));
    if (REDUCED) draw(0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    px += (tx - px) * 0.04; py += (ty - py) * 0.04;
    for (const s of stars) {
      const depth = 0.2 + s.z * 0.8;
      let x = s.x + px * depth * 14, y = s.y + py * depth * 10;
      if (!REDUCED) { s.x -= 0.02 * depth; if (s.x < -20) s.x = w + 20; }
      const tw = REDUCED ? 0.8 : 0.55 + 0.45 * Math.sin(t / 1000 * s.sp + s.tw);
      const alpha = (0.18 + s.z * 0.7) * tw;
      const size = 0.4 + s.z * 1.3;
      ctx.fillStyle = `rgba(${rgb},${alpha.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
    }
  }

  function loop(t) { draw(t); raf = requestAnimationFrame(loop); }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", (e) => { tx = e.clientX / w - 0.5; ty = e.clientY / h - 0.5; });
  document.addEventListener("visibilitychange", () => {
    if (REDUCED) return;
    if (document.hidden) { cancelAnimationFrame(raf); raf = null; } else if (!raf) raf = requestAnimationFrame(loop);
  });

  readColor(); resize();
  if (!REDUCED) raf = requestAnimationFrame(loop);
  return {
    recolor() { readColor(); if (REDUCED) draw(0); },
    pause() { cancelAnimationFrame(raf); raf = null; },
    resume() { if (!REDUCED && !raf) raf = requestAnimationFrame(loop); },
  };
})();

function setTheme(t) {
  document.body.className = t === "orbital" ? "theme-orbital" : "";
  for (const b of document.querySelectorAll("#themeToggle button")) b.classList.toggle("on", b.dataset.theme === t);
  document.querySelector('meta[name="theme-color"]').setAttribute("content", t === "orbital" ? "#eef1f4" : "#05070B");
  lsSet("workshop-theme", t);
  lsSet("junoslab-theme", t === "orbital" ? "space" : "terminal");
  starfield.recolor();
}
for (const b of document.querySelectorAll("#themeToggle button")) b.addEventListener("click", () => setTheme(b.dataset.theme));
setTheme(lsGet("workshop-theme") || "void");

function timeAgo(ts) {
  if (!ts) return "never";
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

let litId = null;
function setLit(id, on) {
  const lab = labs.find((l) => l.id === id);
  if (!lab) return;
  if (on && litId && litId !== id) setLit(litId, false);
  document.querySelector(`.marker[data-id="${id}"]`)?.classList.toggle("lit", on);
  document.querySelectorAll(`.room[data-id="${id}"]`).forEach((r) => r.classList.toggle("lit", on));
  document.querySelector(`.ring.${lab.ring}`)?.classList.toggle("lit", on);
  document.querySelector(`.ring-label[data-ring="${lab.ring}"]`)?.classList.toggle("lit", on);
  const course = $("course");
  course.setAttribute("x2", lab.x); course.setAttribute("y2", lab.y);
  course.classList.toggle("on", on);
  $("readout").classList.toggle("on", on);
  if (on) {
    litId = id;
    $("roName").textContent = lab.name;
    $("roSector").textContent = lab.sector;
    $("roOrbit").textContent = `${RING_NAMES[lab.ring]} · r${RADII[lab.ring]}`;
    $("roBearing").textContent = bearing(lab);
    $("roLast").textContent = timeAgo(lsJson("workshop-docked")[id]);
  } else if (litId === id) {
    litId = null;
  }
}

const opened = $("opened"), stage = $("stage"), framesEl = $("frames"), tabsEl = $("tabs");
const MAX_TABS = 6;
const openTabs = [];
let activeTab = null, launchTimers = [];

function tabLab(id) { return labs.find((l) => l.id === id); }

function syncOpenState() {
  for (const row of document.querySelectorAll(".room")) row.classList.toggle("is-open", openTabs.some((t) => t.id === row.dataset.id));
  $("openCount").textContent = openTabs.length;
  $("backToTabs").hidden = !openTabs.length || stage.classList.contains("show");
}

function renderTabs() {
  tabsEl.innerHTML = "";
  for (const t of openTabs) {
    const el = document.createElement("div");
    el.className = "tab" + (t.id === activeTab ? " on" : "");
    el.setAttribute("role", "tab");
    el.setAttribute("aria-selected", t.id === activeTab ? "true" : "false");
    const name = document.createElement("button");
    name.className = "tab-name";
    name.textContent = t.lab.name;
    name.addEventListener("click", () => activate(t.id));
    const x = document.createElement("button");
    x.className = "tab-x";
    x.setAttribute("aria-label", "Close " + t.lab.name);
    x.textContent = "×";
    x.addEventListener("click", (ev) => { ev.stopPropagation(); closeTab(t.id); });
    el.append(name, x);
    tabsEl.appendChild(el);
  }
  syncOpenState();
}

function activate(id) {
  activeTab = id;
  for (const t of openTabs) t.frame.classList.toggle("on", t.id === id);
  stage.classList.add("show");
  starfield.pause();
  renderTabs();
  lsSet("workshop-last", id);
}

function showMap() {
  launchTimers.forEach(clearTimeout);
  renderToday();
  stage.classList.remove("show");
  opened.classList.remove("show");
  starfield.resume();
  syncOpenState();
}

function closeTab(id) {
  const i = openTabs.findIndex((t) => t.id === id);
  if (i < 0) return;
  openTabs[i].frame.remove();
  openTabs.splice(i, 1);
  if (!openTabs.length) { activeTab = null; showMap(); renderTabs(); return; }
  if (activeTab === id) activate(openTabs[Math.min(i, openTabs.length - 1)].id);
  else renderTabs();
}

function launch(lab, hash) {
  if (!lab) return;
  for (const r of document.querySelectorAll(".room, .marker")) r.classList.toggle("was-last", r.dataset.id === lab.id);
  lsSet("workshop-last", lab.id);
  const docked = lsJson("workshop-docked"); docked[lab.id] = Date.now(); lsSet("workshop-docked", JSON.stringify(docked));

  const already = openTabs.find((t) => t.id === lab.id);
  if (already) {
    if (hash) { try { already.frame.contentWindow.location.hash = hash; } catch (e) { already.frame.src = lab.path + "#" + hash; } }
    activate(lab.id);
    return;
  }
  if (openTabs.length >= MAX_TABS) { toast(`max ${MAX_TABS} labs open — close a tab first`); if (activeTab) activate(activeTab); return; }

  const frame = document.createElement("iframe");
  frame.title = lab.name;
  frame.src = lab.path + (hash ? "#" + hash : "");
  framesEl.appendChild(frame);
  openTabs.push({ id: lab.id, lab, frame });

  $("openedTitle").textContent = lab.name;
  $("openedTag").textContent = lab.sector;
  $("openedState").textContent = "approaching";
  $("openedClamps").textContent = "aligning";
  opened.classList.add("show");

  launchTimers.forEach(clearTimeout);
  launchTimers = [
    setTimeout(() => { $("openedClamps").textContent = "engaged"; $("openedState").textContent = "pressurising"; }, 700),
    setTimeout(() => {
      $("openedState").textContent = "docked";
      opened.classList.remove("show");
      activate(lab.id);
    }, 1400),
  ];
}

function abortDocking() {
  launchTimers.forEach(clearTimeout);
  opened.classList.remove("show");
  const pending = openTabs[openTabs.length - 1];
  if (pending && pending.id !== activeTab && !stage.classList.contains("show")) {
    pending.frame.remove(); openTabs.pop();
  }
  renderTabs();
}

const lastOpened = lsGet("workshop-last");
if (lastOpened) for (const el of document.querySelectorAll(`[data-id="${CSS.escape(lastOpened)}"]`)) el.classList.add("was-last");

for (const row of document.querySelectorAll(".room")) {
  const id = row.dataset.id;
  row.addEventListener("mouseenter", () => setLit(id, true));
  row.addEventListener("mouseleave", () => setLit(id, false));
  row.addEventListener("focus", () => setLit(id, true));
  row.addEventListener("blur", () => setLit(id, false));
  row.addEventListener("click", () => launch(labs.find((l) => l.id === id)));
}

for (const m of document.querySelectorAll(".marker")) {
  const id = m.dataset.id;
  m.addEventListener("mouseenter", () => setLit(id, true));
  m.addEventListener("mouseleave", () => setLit(id, false));
  m.addEventListener("focus", () => setLit(id, true));
  m.addEventListener("blur", () => setLit(id, false));
  m.addEventListener("click", () => launch(labs.find((l) => l.id === id)));
  m.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); launch(labs.find((l) => l.id === id)); } });
}

$("backBtn").addEventListener("click", abortDocking);
$("tabHome").addEventListener("click", showMap);
$("tabAdd").addEventListener("click", showMap);
$("backToTabs").addEventListener("click", () => { if (activeTab) activate(activeTab); });

const search = $("search");
function applyFilter() {
  const q = search.value.trim().toLowerCase();
  if (q && activeSector === "today") activeSector = "all";
  const isToday = activeSector === "today";
  todayGroup.hidden = !isToday;
  let shown = 0;
  for (const chip of chipsEl.querySelectorAll(".chip")) chip.classList.toggle("on", chip.dataset.sector === activeSector);
  for (const lab of labs) {
    const inSector = activeSector === "all" || lab.sector.toLowerCase() === activeSector;
    const hit = !isToday && inSector && (!q || lab.name.toLowerCase().includes(q) || lab.sector.toLowerCase().includes(q) || (lab.sub || "").toLowerCase().includes(q) || lab.id.includes(q));
    const row = document.querySelector(`.sector-group .room[data-id="${CSS.escape(lab.id)}"]`);
    row.hidden = !hit;
    const lit = isToday ? todayList.some((t) => t.lab === lab.id) : hit;
    document.querySelector(`.marker[data-id="${CSS.escape(lab.id)}"]`).style.opacity = lit ? "" : "0.18";
    if (hit) shown++;
  }
  for (const group of document.querySelectorAll(".sector-group")) {
    group.hidden = !group.querySelector(".room:not([hidden])");
  }
  emptyEl.hidden = isToday || shown > 0;
}
search.addEventListener("input", applyFilter);
$("addRoom").addEventListener("click", () => toast("edit js/labs.config.js to add a room"));
search.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const first = activeSector === "today" ? todayGroup.querySelector(".room") : document.querySelector(".sector-group .room:not([hidden])");
    if (first) launch(labs.find((l) => l.id === first.dataset.id));
  } else if (e.key === "Escape") {
    search.value = ""; applyFilter(); search.blur();
  }
});

document.addEventListener("keydown", (e) => {
  if (opened.classList.contains("show")) { if (e.key === "Escape") abortDocking(); return; }
  if (stage.classList.contains("show")) { if (e.key === "Escape") showMap(); return; }
  if (e.key === "/" && document.activeElement !== search) { e.preventDefault(); search.focus(); }
});

function exportProgress() {
  const data = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      data[k] = localStorage.getItem(k);
    }
  } catch (e) { toast("storage unavailable"); return; }

  const stamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
  const blob = new Blob([JSON.stringify({ workshop: 1, exported: new Date().toISOString(), data }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `workshop-progress_${stamp}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`exported ${Object.keys(data).length} entries`);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || parsed.workshop !== 1 || typeof parsed.data !== "object") throw new Error("not a workshop file");
      let n = 0;
      for (const [k, v] of Object.entries(parsed.data)) { lsSet(k, v); n++; }
      toast(`imported ${n} entries`);
      setTheme(lsGet("workshop-theme") || "void");
    } catch (e) { toast("import failed: " + e.message); }
  };
  reader.readAsText(file);
}
$("exportBtn").addEventListener("click", exportProgress);
$("importFile").addEventListener("change", (e) => { if (e.target.files[0]) importProgress(e.target.files[0]); e.target.value = ""; });

let toastTimer = null;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

function tick() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now - start) / 86400000);
  $("stardate").textContent = `${now.getFullYear()}.${String(day).padStart(3, "0")}`;
  $("clock").textContent = now.toTimeString().slice(0, 8);
}
tick();
setInterval(tick, 1000);


function dayKey(off, pad) {
  const d = new Date(Date.now() + (off || 0) * 864e5);
  const m = d.getMonth() + 1, day = d.getDate();
  return d.getFullYear() + "-" + (pad ? String(m).padStart(2, "0") : m) + "-" + (pad ? String(day).padStart(2, "0") : day);
}
function lsParse(key) { try { return JSON.parse(lsGet(key)); } catch (e) { return null; } }
const WEEK = 7 * 864e5;
const POSHLE_CASES = ["alladds", "vanished", "graphlogin", "stuckmail", "skus", "leaverlic", "forward", "room"];
const GIT_CASES = ["detached", "secret", "rejected", "ignored", "markers"];
const SHELLE_CASES = ["port", "disk", "exec", "sshkey", "restart"];

function todayItems() {
  const out = [];
  const add = (lab, text, kind, hash, weight) => { if (labs.some((l) => l.id === lab)) out.push({ lab, text, kind, hash, weight }); };

  const jr = lsParse("junle_review");
  if (jr && jr.items) {
    const n = Object.values(jr.items).filter((x) => x && x.due <= Date.now()).length;
    if (n) add("junle", n + (n === 1 ? " review due" : " reviews due"), "review", "review", 10);
  }
  const py = lsParse("pyle-save-v1");
  if (py) {
    const n = (py.missed || []).filter((m) => (m[3] || dayKey(0, true)) <= dayKey(0, true)).length;
    if (n) add("pyle", n + (n === 1 ? " drill to review" : " drills to review"), "review", "review", 10);
  }
  const ps = lsParse("poshle.v1");
  const sh = lsParse("shelle.v1");
  for (const [lab, st] of [["poshle", ps], ["shelle", sh]]) {
    if (!st || !st.steps) continue;
    const n = Object.entries(st.steps).filter(([k, r]) => r && r.miss > 0 && !/^(gym|start):/.test(k) && (r.clean || 0) < r.miss).length;
    if (n) add(lab, Math.min(n, 10) + (n === 1 ? " weak spot" : " weak spots"), "review", "weak", 9);
  }

  const hx = lsParse("hexle.v1");
  if (hx && hx.srs) {
    const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);
    const n = Object.values(hx.srs).filter((x) => x && x.due <= day).length;
    if (n) add("hexle", n + (n === 1 ? " skill to review" : " skills to review"), "review", "review", 8);
  }

  const dk = lsParse("dockle.v1");
  if (dk && dk.srs) {
    const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);
    const n = Object.values(dk.srs).filter((x) => x && x.due <= day).length;
    if (n) add("dockle", n + (n === 1 ? " drill to review" : " drills to review"), "review", "review", 8);
  }

  const md = lsParse("modle-profile");
  if (!(md && md.daily && md.daily.date === dayKey(0, true))) add("modle", "Daily challenge", "daily", "/practice/daily", 6);
  const mix = lsParse("junle_mix");
  if (mix && mix.last !== dayKey(0, false)) add("junle", "Daily mix" + (mix.streak ? " · streak " + mix.streak : ""), "daily", "mix", 6);
  if (py && py.kata && py.kata.last !== dayKey(0, true)) add("pyle", "Daily kata" + (py.kata.streak ? " · streak " + py.kata.streak : ""), "daily", "kata", 5);

  const DET = [
    { lab: "poshle", ids: POSHLE_CASES, rec: (ps && ps.cases) || {} },
    { lab: "git-lab", ids: GIT_CASES, rec: lsParse("gitlab.cases") || {} },
    { lab: "shelle", ids: SHELLE_CASES, rec: (sh && sh.cases) || {} },
  ].filter((d) => labs.some((l) => l.id === d.lab));
  const lastAt = (rec) => Math.max(0, ...Object.values(rec).map((r) => (r && r.at) || 0));
  if (Date.now() - Math.max(0, ...DET.map((d) => lastAt(d.rec))) > WEEK) {
    const open = DET.map((d) => ({ ...d, open: d.ids.filter((id) => !(d.rec[id] && d.rec[id].solved)), last: lastAt(d.rec) })).filter((d) => d.open.length).sort((a, b) => a.last - b.last);
    if (open.length) add(open[0].lab, "Detective case of the week", "weekly", "case:" + open[0].open[0], 4);
    else { const d = DET[Math.floor(Date.now() / WEEK) % DET.length]; add(d.lab, "Re-solve a Detective case", "weekly", "case:" + d.ids[Math.floor(Date.now() / WEEK) % d.ids.length], 3); }
  }

  const gl = lsParse("gitlab.v1");
  if (gl && gl.missions && gl.missionIdx < gl.missions && !gl.detective) add("git-lab", "Mission " + (gl.missionIdx + 1) + " of " + gl.missions, "next", "", 2);
  if (dk && dk.done) {
    const DOCKLE_N = 8, n = Object.keys(dk.done).length;
    if (n < DOCKLE_N) add("dockle", "Contract " + (n + 1) + " of " + DOCKLE_N + " waiting", "next", "target", 2);
  } else add("dockle", "Your first cargo contract", "next", "school", 2);
  if (hx && typeof hx.t === "number" && !(hx.done && hx.done[hx.t])) add("hexle", "Target " + (hx.t + 1) + " waiting", "next", "", 2);

  return out.sort((a, b) => b.weight - a.weight).slice(0, 6);
}

const KIND_LABEL = { review: "due", daily: "daily", weekly: "weekly", next: "next" };
const todayGroup = document.createElement("section");
todayGroup.className = "today-group";
todayGroup.hidden = true;
roomsEl.prepend(todayGroup);
const todayChip = document.createElement("button");
todayChip.className = "chip today-chip";
todayChip.dataset.sector = "today";
chipsEl.prepend(todayChip);
todayChip.addEventListener("click", () => { activeSector = "today"; lsSet("workshop-sector", "today"); search.value = ""; applyFilter(); });
let todayList = [];
function renderToday() {
  todayList = todayItems();
  todayChip.innerHTML = `Today<span>${todayList.length}</span>`;
  todayGroup.innerHTML = "";
  if (!todayList.length) { todayGroup.innerHTML = '<p class="today-empty">nothing due · pick any room</p>'; }
  todayList.forEach((it, i) => {
    const lab = labs.find((l) => l.id === it.lab);
    const b = document.createElement("button");
    b.className = "room today-room k-" + it.kind;
    b.dataset.id = lab.id;
    b.style.setProperty("--i", i);
    b.innerHTML = `<svg class="glyph" viewBox="0 0 16 16">${lab.glyph || ""}</svg>
      <span class="body"><span class="name">${esc(it.text)}</span><span class="tag">${esc(lab.name)}</span></span>
      <span class="kind">${KIND_LABEL[it.kind]}</span>`;
    b.addEventListener("mouseenter", () => setLit(lab.id, true));
    b.addEventListener("mouseleave", () => setLit(lab.id, false));
    b.addEventListener("focus", () => setLit(lab.id, true));
    b.addEventListener("blur", () => setLit(lab.id, false));
    b.addEventListener("click", () => launch(lab, it.hash));
    todayGroup.appendChild(b);
  });
  if (activeSector === "today") applyFilter();
}
let todayTimer = null;
window.addEventListener("storage", () => { clearTimeout(todayTimer); todayTimer = setTimeout(renderToday, 300); });
document.addEventListener("visibilitychange", () => { if (!document.hidden) renderToday(); });
renderToday();
if (lsGet("workshop-today-seen") !== dayKey(0, true)) {
  lsSet("workshop-today-seen", dayKey(0, true));
  if (todayList.length) { activeSector = "today"; lsSet("workshop-sector", "today"); }
}
applyFilter();

if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
window.addEventListener("offline", () => { $("signal").textContent = "offline"; });
window.addEventListener("online", () => { $("signal").textContent = "stable"; });
if (!navigator.onLine) $("signal").textContent = "offline";
