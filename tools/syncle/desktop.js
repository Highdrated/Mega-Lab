const DK = { prev: null, finder: "/Users/kaatje/Downloads", sel: null, z: 10, region: "BE", open: {} };
const HOME = "/Users/kaatje";
function dctx() { if (!R.ctx) R.ctx = GRADER.makeCtx("none"); return R.ctx; }
function pparent(p) { const i = p.lastIndexOf("/"); return i <= 0 ? "/" : p.slice(0, i); }
function pname(p) { return p.split("/").pop(); }
function kindOf(p, isDir) { if (isDir) return "Folder"; const e = (pname(p).split(".").pop() || "").toLowerCase(); return e === "csv" ? "CSV document" : e === "log" ? "Log file" : e === "txt" ? "Plain text" : "Document"; }
function listDir(dir) {
  const c = dctx();
  const ds = Array.from(c.dirs).filter((d) => d !== dir && pparent(d) === dir).map((d) => ({ p: d, dir: true }));
  const fs = Object.keys(c.fs).filter((f) => pparent(f) === dir).map((f) => ({ p: f, dir: false, at: c.fs[f].at, size: c.fs[f].text.length }));
  return ds.concat(fs).sort((a, b) => pname(a.p).localeCompare(pname(b.p)));
}
function icon(item, size) {
  const s = size || 46;
  if (item.dir) return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 48 48" aria-hidden="true"><path d="M4 12a3 3 0 0 1 3-3h11l4 4h19a3 3 0 0 1 3 3v21a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#7fb3ea"/><path d="M4 17h40v20a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#9ccaf6"/></svg>';
  const ext = (pname(item.p).split(".").pop() || "").toLowerCase();
  const col = ext === "csv" ? "#2f8f5b" : ext === "log" ? "#7a6a52" : "#5a6574";
  return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 48 48" aria-hidden="true"><path d="M11 4h18l9 9v29a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#fff" stroke="#c6ced8"/><path d="M29 4v9h9" fill="#eef1f4" stroke="#c6ced8"/>' +
    (ext === "csv" ? '<g stroke="' + col + '" stroke-width="1.2" fill="none"><path d="M14 20h20M14 25h20M14 30h20M14 35h20M21 18v19M28 18v19"/></g>' : '<g stroke="#9aa4b2" stroke-width="1.4"><path d="M15 20h18M15 25h18M15 30h12"/></g>') +
    '<rect x="8" y="34" width="' + (ext.length * 6 + 8) + '" height="9" rx="1.5" fill="' + col + '"/><text x="12" y="41" font-size="7" font-family="Inter,sans-serif" font-weight="600" fill="#fff">' + esc(ext.toUpperCase()) + "</text></svg>";
}
function openDesktop() {
  if (R.view !== "desktop") DK.prev = R.view;
  R.view = "desktop";
  $("corridor").classList.add("hide"); $("memory").classList.add("hide"); $("desktop").classList.remove("hide");
  $("crumb").textContent = "Lab Mac · " + (R.mem ? "files from this lesson" : "fresh desktop");
  renderDesk();
}
function closeDesktop() {
  $("desktop").classList.add("hide");
  if (DK.prev === "memory") { R.view = "memory"; $("memory").classList.remove("hide"); $("crumb").textContent = R.gate ? gtext().crumb + curGate().name : (R.mem ? SEQUENCES[R.mem.seq].name + " · " + R.mem.name : ""); setPrompt(); $("cmd").focus(); }
  else renderCorridor();
}
function clock() { const d = new Date(); const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; return days[d.getDay()] + " " + d.getDate() + " " + mon[d.getMonth()] + "  " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
function renderDesk() {
  const items = listDir(HOME + "/Desktop");
  $("dkClock").textContent = clock();
  $("dkIcons").innerHTML = items.length ? items.map((it) => '<button class="dicon' + (DK.sel === it.p ? " sel" : "") + '" type="button" data-p="' + esc(it.p) + '" data-dir="' + it.dir + '">' + icon(it) + "<span>" + esc(pname(it.p)) + "</span></button>").join("") : "";
  $("dkEmpty").classList.toggle("hide", items.length > 0);
  bindIcons($("dkIcons"));
  if (DK.open.finder) renderFinder();
}
function bindIcons(root) {
  root.querySelectorAll("[data-p]").forEach((b) => {
    b.onclick = (e) => { DK.sel = b.dataset.p; root.querySelectorAll("[data-p]").forEach((x) => x.classList.toggle("sel", x === b)); e.stopPropagation(); };
    b.ondblclick = () => openItem(b.dataset.p, b.dataset.dir === "true");
    b.onkeydown = (e) => { if (e.key === "Enter") openItem(b.dataset.p, b.dataset.dir === "true"); };
    b.oncontextmenu = (e) => { e.preventDefault(); DK.sel = b.dataset.p; ctxMenu(e.clientX, e.clientY, b.dataset.p, b.dataset.dir === "true"); };
  });
}
function openItem(p, isDir) {
  if (isDir) { DK.finder = p; showWin("finder"); renderFinder(); return; }
  const ext = (pname(p).split(".").pop() || "").toLowerCase();
  if (ext === "csv") openExcel(p); else openText(p);
}
function showWin(id) { const w = $("w-" + id); w.classList.remove("hide"); DK.open[id] = true; w.style.zIndex = ++DK.z; }
function hideWin(id) { $("w-" + id).classList.add("hide"); DK.open[id] = false; }
function renderFinder() {
  const dir = DK.finder;
  const fav = [["Desktop", HOME + "/Desktop"], ["Documents", HOME + "/Documents"], ["Downloads", HOME + "/Downloads"], ["kaatje", HOME]];
  $("fSide").innerHTML = "<small>Favourites</small>" + fav.map(([n, p]) => '<button type="button" class="' + (p === dir ? "on" : "") + '" data-go="' + p + '">' + esc(n) + "</button>").join("");
  $("fSide").querySelectorAll("[data-go]").forEach((b) => b.onclick = () => { DK.finder = b.dataset.go; renderFinder(); });
  $("fTitle").textContent = pname(dir) || "/";
  const items = listDir(dir);
  $("fList").innerHTML = '<div class="frow fh"><span>Name</span><span>Date Modified</span><span>Size</span><span>Kind</span></div>' + (items.length ? items.map((it) => '<button type="button" class="frow' + (DK.sel === it.p ? " sel" : "") + '" data-p="' + esc(it.p) + '" data-dir="' + it.dir + '"><span class="fn">' + icon(it, 18) + esc(pname(it.p)) + "</span><span>" + (it.dir ? "--" : fmtDate(it.at)) + "</span><span>" + (it.dir ? "--" : fmtSize(it.size)) + "</span><span>" + kindOf(it.p, it.dir) + "</span></button>").join("") : '<p class="mutetxt" style="padding:14px">This folder is empty.</p>');
  bindIcons($("fList"));
  $("fBack").disabled = dir === "/";
}
function fmtDate(d) { const t = new Date(d); const today = new Date(); const hh = String(t.getHours()).padStart(2, "0") + ":" + String(t.getMinutes()).padStart(2, "0"); return t.toDateString() === today.toDateString() ? "Today at " + hh : t.getDate() + "/" + (t.getMonth() + 1) + "/" + t.getFullYear() + " " + hh; }
function fmtSize(n) { return n < 1000 ? n + " bytes" : (n / 1000).toFixed(1) + " KB"; }
function splitCsv(line, d) { const out = []; let cur = "", q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === "\"" && line[i + 1] === "\"") { cur += "\""; i++; } else if (ch === "\"") q = false; else cur += ch; } else if (ch === "\"") q = true; else if (ch === d) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out; }
function openExcel(p) {
  const c = dctx(); const f = c.fs[p]; if (!f) return;
  DK.excel = p; showWin("excel"); renderExcel();
}
function renderExcel() {
  const c = dctx(); const p = DK.excel; const f = c.fs[p]; if (!f) { hideWin("excel"); return; }
  $("xTitle").textContent = pname(p);
  const sep = DK.region === "BE" ? ";" : ",";
  const lines = f.text.split("\n").filter((l) => l.length);
  const rows = lines.map((l) => sep === ";" ? (l.includes(";") ? splitCsv(l, ";") : [l]) : splitCsv(l, ","));
  const cols = Math.max(3, ...rows.map((r) => r.length));
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let h = '<table class="xl"><thead><tr><th class="rn"></th>' + Array.from({ length: cols }, (_, i) => "<th>" + letters[i] + "</th>").join("") + "</tr></thead><tbody>";
  rows.slice(0, 400).forEach((r, i) => { h += '<tr><th class="rn">' + (i + 1) + "</th>" + Array.from({ length: cols }, (_, k) => "<td" + (i === 0 ? ' class="hd"' : "") + ">" + esc(r[k] === undefined ? "" : r[k]) + "</td>").join("") + "</tr>"; });
  h += "</tbody></table>";
  $("xGrid").innerHTML = h;
  const commaFile = lines[0] && lines[0].includes(",") && !lines[0].includes(";");
  const bad = DK.region === "BE" && commaFile;
  $("xNote").innerHTML = bad ? "<b>Everything landed in column A.</b> This Mac uses Belgian region settings, so Excel expects <code>;</code> between columns, and this file uses <code>,</code>. Export it again with <code>-Delimiter ';'</code> or <code>-UseCulture</code>." : (DK.region === "BE" && !commaFile ? "Semicolons: exactly what Excel on a Belgian Mac expects." : "Region set to United States: Excel splits on commas.");
  $("xNote").className = "xnote" + (bad ? " bad" : "");
  $("xRegion").textContent = "macOS region: " + (DK.region === "BE" ? "Belgium ( ; )" : "United States ( , )");
}
function openText(p) {
  const c = dctx(); const f = c.fs[p]; if (!f) return;
  DK.text = p; showWin("text"); $("tTitle").textContent = pname(p); $("tBody").textContent = f.text;
}
function ctxMenu(x, y, p, isDir) {
  const m = $("dkMenu");
  const items = [["Open", () => openItem(p, isDir)]];
  if (!isDir) {
    items.push(["Open With Excel", () => openExcel(p)], ["Open With TextEdit", () => openText(p)]);
    items.push(["sep"]);
    items.push(["Copy \"" + pname(p) + "\" as Pathname", () => { copyText(p); toast("Copied " + p + ". Paste it in the console with Cmd+V."); }]);
    items.push(["Download to my real Mac", () => download(p)]);
    items.push(["sep"]);
    items.push(["Move to Trash", () => { const c = dctx(); delete c.fs[p]; DK.sel = null; renderDesk(); if (DK.open.excel && DK.excel === p) hideWin("excel"); if (DK.open.text && DK.text === p) hideWin("text"); toast("Moved to Trash"); }]);
  } else items.push(["Copy \"" + pname(p) + "\" as Pathname", () => { copyText(p); toast("Copied " + p); }]);
  m.innerHTML = items.map(([l], i) => l === "sep" ? "<hr>" : '<button type="button" data-i="' + i + '">' + esc(l) + "</button>").join("");
  m.querySelectorAll("[data-i]").forEach((b) => b.onclick = () => { m.classList.add("hide"); items[+b.dataset.i][1](); });
  m.style.left = Math.min(x, window.innerWidth - 260) + "px"; m.style.top = Math.min(y, window.innerHeight - 260) + "px";
  m.classList.remove("hide");
}
function copyText(t) { try { navigator.clipboard.writeText(t); } catch (e) {} }
function download(p) {
  const f = dctx().fs[p]; if (!f) return;
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([f.text], { type: "text/plain" })); a.download = pname(p); document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function upload(file) {
  if (!file) return;
  if (file.size > 300000) { toast("Too big for the lab: keep uploads under 300 KB."); return; }
  if (!/\.(csv|txt|log)$/i.test(file.name)) { toast("Only .csv, .txt and .log files."); return; }
  const r = new FileReader();
  r.onload = () => { const c = dctx(); const p = DK.finder + "/" + file.name.replace(/[^\w.\- ]/g, "_"); c.fs[p] = { text: String(r.result).replace(/\r\n/g, "\n"), at: new Date() }; renderDesk(); renderFinder(); toast("Copied into the lab Mac: " + p.replace(HOME, "~")); };
  r.readAsText(file);
}
function dragWin(win) {
  const bar = win.querySelector(".wbar");
  bar.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    win.style.zIndex = ++DK.z;
    const r = win.getBoundingClientRect(), host = $("dkArea").getBoundingClientRect();
    const ox = e.clientX - r.left, oy = e.clientY - r.top;
    const mv = (ev) => { win.style.left = Math.max(0, Math.min(host.width - 120, ev.clientX - host.left - ox)) + "px"; win.style.top = Math.max(0, Math.min(host.height - 40, ev.clientY - host.top - oy)) + "px"; };
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  });
  win.addEventListener("pointerdown", () => { win.style.zIndex = ++DK.z; });
}
["finder", "excel", "text"].forEach((id) => { dragWin($("w-" + id)); $("w-" + id).querySelector(".tl.r").onclick = () => hideWin(id); });
$("fBack").onclick = () => { DK.finder = pparent(DK.finder); renderFinder(); };
$("fUpload").onclick = () => $("fFile").click();
$("fFile").onchange = (e) => { upload(e.target.files[0]); e.target.value = ""; };
$("xRegionBtn").onclick = () => { DK.region = DK.region === "BE" ? "US" : "BE"; renderExcel(); };
$("dockTerm").onclick = () => closeDesktop();
$("dockFinder").onclick = () => { showWin("finder"); renderFinder(); };
$("dockExcel").onclick = () => { const c = dctx(); const csvs = Object.keys(c.fs).filter((p) => /\.csv$/i.test(p)).sort((a, b) => c.fs[b].at - c.fs[a].at); if (csvs[0]) openExcel(csvs[0]); else toast("No CSV files on this Mac yet."); };
$("dockText").onclick = () => openText(HOME + "/Documents/halvard-handover.txt");
$("dkArea").addEventListener("click", (e) => { if (!e.target.closest(".dicon") && !e.target.closest(".win")) { DK.sel = null; document.querySelectorAll(".dicon.sel").forEach((x) => x.classList.remove("sel")); } });
document.addEventListener("click", (e) => { if (!e.target.closest("#dkMenu")) $("dkMenu").classList.add("hide"); });
$("deskbtn").onclick = () => (R.view === "desktop" ? closeDesktop() : openDesktop());
$("tDesk").onclick = () => openDesktop();
setInterval(() => { if (R.view === "desktop") $("dkClock").textContent = clock(); }, 30000);
