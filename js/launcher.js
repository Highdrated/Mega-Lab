// Workshop launcher.
// Reads LABS_CONFIG (js/labs.config.js), draws the room list and the orbit,
// launches labs into a full-screen iframe, and can export/import progress.
// No frameworks, no build step.

const SVGNS = "http://www.w3.org/2000/svg";
const RADII = { "ring-inner": 90, "ring-mid": 160, "ring-outer": 230 };
const CX = 450, CY = 310;

const $ = (id) => document.getElementById(id);
const roomsEl = $("rooms");
const markersEl = $("markers");

// ---------- safe localStorage helpers ----------
// localStorage can throw (private mode, sandboxes), so every call is guarded.
function lsGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
function lsSet(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }

// ---------- build the room list + orbit markers ----------
LABS_CONFIG.forEach((lab, i) => {
  const btn = document.createElement("button");
  btn.className = "room";
  btn.dataset.id = lab.id;
  btn.innerHTML = `
    <span class="idx">${String(i + 1).padStart(2, "0")}</span>
    <span>
      <span class="name">${lab.name}<span class="last"></span></span><br>
      <span class="tag">${lab.tag}</span>
    </span>
    <svg class="glyph" viewBox="0 0 16 16">${lab.glyph || ""}</svg>`;
  roomsEl.appendChild(btn);

  // marker on the orbit
  const a = (lab.angle || 0) * Math.PI / 180;
  const r = RADII[lab.ring] || RADII["ring-mid"];
  const x = CX + Math.cos(a) * r, y = CY + Math.sin(a) * r;
  const g = document.createElementNS(SVGNS, "g");
  g.setAttribute("class", "marker");
  g.dataset.id = lab.id;
  g.innerHTML = `
    <path class="bracket" d="M${x-12} ${y-12}h-6v6M${x+12} ${y-12}h6v6M${x-12} ${y+12}h-6v-6M${x+12} ${y+12}h6v-6"/>
    <circle cx="${x}" cy="${y}" r="9"/>
    <circle class="dotm" cx="${x}" cy="${y}" r="2.5"/>`;
  markersEl.appendChild(g);
});

// "add a room" row — a hint, not a real room
const addBtn = document.createElement("button");
addBtn.className = "room add";
addBtn.dataset.id = "__add";
addBtn.innerHTML = `
  <span class="idx">+</span>
  <span><span class="name">Add a room</span><br><span class="tag">js/labs.config.js</span></span>
  <svg class="glyph" viewBox="0 0 16 16"><path d="M8 3v10M3 8h10"/></svg>`;
roomsEl.appendChild(addBtn);
$("nodeCount").textContent = LABS_CONFIG.length;

// ---------- ticks around the outer ring ----------
(function buildTicks() {
  const g = $("ticks"), r = 240;
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2, major = i % 6 === 0, len = major ? 8 : 4;
    const line = document.createElementNS(SVGNS, "line");
    line.setAttribute("x1", CX + Math.cos(a) * r); line.setAttribute("y1", CY + Math.sin(a) * r);
    line.setAttribute("x2", CX + Math.cos(a) * (r + len)); line.setAttribute("y2", CY + Math.sin(a) * (r + len));
    if (major) line.setAttribute("class", "major");
    g.appendChild(line);
  }
})();

// ---------- theme ----------
// "void" = dark, "orbital" = steel. Also writes the JunOS lab's own theme key
// so a lab launched from Orbital opens in its Orbital ("space") theme.
function setTheme(t) {
  document.body.className = t === "orbital" ? "theme-orbital" : "";
  for (const b of document.querySelectorAll("#themeToggle button")) b.classList.toggle("on", b.dataset.theme === t);
  document.querySelector('meta[name="theme-color"]').setAttribute("content", t === "orbital" ? "#b4bcc4" : "#0A0B0D");
  lsSet("workshop-theme", t);
  lsSet("junoslab-theme", t === "orbital" ? "space" : "terminal");
}
for (const b of document.querySelectorAll("#themeToggle button")) b.addEventListener("click", () => setTheme(b.dataset.theme));
setTheme(lsGet("workshop-theme") || "void");

// ---------- hover: list row lights its marker + ring ----------
function setLit(id, on) {
  const lab = LABS_CONFIG.find((l) => l.id === id); if (!lab) return;
  document.querySelector(`.marker[data-id="${id}"]`)?.classList.toggle("lit", on);
  document.querySelector(`.ring.${lab.ring}`)?.classList.toggle("lit", on);
}

// ---------- launching a lab ----------
// Sequence: lock screen (progress bar) -> iframe loads lab -> stage shows.
// The iframe starts loading immediately behind the lock screen, so the
// 1.2s init animation doubles as real load time.
const opened = $("opened"), stage = $("stage"), frame = $("labFrame");
let launchTimer = null;

function launch(lab) {
  $("openedTitle").textContent = lab.name;
  $("openedTag").textContent = lab.tag;
  $("openedState").textContent = "initialising";
  opened.classList.add("show");

  frame.src = lab.path;
  clearTimeout(launchTimer);
  launchTimer = setTimeout(() => {
    $("openedState").textContent = "online";
    stage.classList.add("show");
    opened.classList.remove("show");
  }, 1400);
}

function release() {
  clearTimeout(launchTimer);
  stage.classList.remove("show");
  opened.classList.remove("show");
  frame.src = "about:blank"; // unload the lab so it stops running in the background
}

const lastOpened = lsGet("workshop-last");
if (lastOpened) document.querySelector(`.room[data-id="${lastOpened}"]`)?.classList.add("was-last");

for (const row of document.querySelectorAll(".room")) {
  const id = row.dataset.id;
  row.addEventListener("mouseenter", () => setLit(id, true));
  row.addEventListener("mouseleave", () => setLit(id, false));
  row.addEventListener("click", () => {
    if (id === "__add") { toast("edit js/labs.config.js to add a room"); return; }
    const lab = LABS_CONFIG.find((l) => l.id === id);
    for (const r of document.querySelectorAll(".room")) r.classList.remove("was-last");
    row.classList.add("was-last");
    lsSet("workshop-last", id);
    launch(lab);
  });
}
$("backBtn").addEventListener("click", release);
$("releaseBtn").addEventListener("click", release);

// ---------- export / import progress ----------
// Every lab keeps its state in localStorage. Because the labs load in an
// iframe on the same site, they share this launcher's localStorage — so
// dumping ALL keys captures every lab's progress in one JSON file.
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

// ---------- toast ----------
let toastTimer = null;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

// ---------- boot + PWA ----------
requestAnimationFrame(() => $("scene").classList.add("booted"));

// service worker only works over http(s) — skipped when opened from disk
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
window.addEventListener("offline", () => { $("signal").textContent = "offline"; });
window.addEventListener("online", () => { $("signal").textContent = "stable"; });
if (!navigator.onLine) $("signal").textContent = "offline";
