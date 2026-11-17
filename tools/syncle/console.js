const HKEY = "syncle.history";
const CON = { kill: "", undo: [], meta: false, search: null, menu: null, tabState: null, view: "inline" };
try { const h = JSON.parse(localStorage.getItem(HKEY) || "[]"); if (Array.isArray(h)) R.hist = h.slice(-500); R.hpos = R.hist.length; } catch (e) {}
function saveHist() { try { localStorage.setItem(HKEY, JSON.stringify(R.hist.slice(-500))); } catch (e) {} }

const COMMON_PARAMS = ["Verbose", "Debug", "ErrorAction", "WarningAction", "InformationAction", "ProgressAction", "ErrorVariable", "WarningVariable", "InformationVariable", "OutVariable", "OutBuffer", "PipelineVariable"];
const ENUMS = {
  erroraction: ["Break", "Continue", "Ignore", "Inquire", "SilentlyContinue", "Stop", "Suspend"],
  warningaction: ["Break", "Continue", "Ignore", "Inquire", "SilentlyContinue", "Stop", "Suspend"],
  informationaction: ["Break", "Continue", "Ignore", "Inquire", "SilentlyContinue", "Stop", "Suspend"],
  progressaction: ["Break", "Continue", "Ignore", "Inquire", "SilentlyContinue", "Stop", "Suspend"]
};
const PARAM_ENUMS = {
  "get-member": { membertype: ["AliasProperty", "CodeProperty", "Property", "NoteProperty", "ScriptProperty", "Properties", "PropertySet", "Method", "CodeMethod", "ScriptMethod", "Methods", "ParameterizedProperty", "MemberSet", "Event", "Dynamic", "InferredProperty", "All"] },
  "export-csv": { encoding: ["ascii", "ansi", "bigendianunicode", "bigendianutf32", "oem", "unicode", "utf7", "utf8", "utf8BOM", "utf8NoBOM", "utf32"] }
};
const AUTO_VARS = ["true", "false", "null", "HOME", "PWD", "Error", "PSVersionTable", "PROFILE", "Host", "args", "input"];

function inp() { return $("cmd"); }
function visibleCmds() { return Object.values(PS.CMDS).filter((c) => c.module && (!c.session || (R.ctx && R.ctx.exo))).map((c) => c.name); }
function moduleNames() { return Array.from(new Set(Object.values(PS.CMDS).filter((c) => c.module && (!c.session || (R.ctx && R.ctx.exo))).map((c) => c.module))).sort(); }
function lcp(list) { if (!list.length) return ""; let p = list[0]; for (const x of list) { let i = 0; while (i < p.length && i < x.length && p[i].toLowerCase() === x[i].toLowerCase()) i++; p = p.slice(0, i); } return p; }
function matchPrefix(list, word) {
  if (/[*?]/.test(word)) { const re = new RegExp("^" + word.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i"); return list.filter((x) => re.test(x)); }
  return list.filter((x) => x.toLowerCase().startsWith(word.toLowerCase()));
}

function completions(text, pos) {
  const before = text.slice(0, pos);
  const m = /[^\s|;({,]*$/.exec(before);
  const word = m[0];
  const start = pos - word.length;
  const segStart = Math.max(before.lastIndexOf("|"), before.lastIndexOf(";"), before.lastIndexOf("{"), before.lastIndexOf("("));
  const seg = before.slice(segStart + 1, start);
  const segWords = seg.trim() ? seg.trim().split(/\s+/) : [];
  const res = (list) => ({ start, word, list: Array.from(new Set(list)) });
  if (word.startsWith("$")) {
    const dot = word.indexOf(".");
    if (dot > 0) {
      const vpart = word.slice(1, dot), rest = word.slice(dot + 1);
      if (rest.includes(".")) return res([]);
      const vm = /^(\w+)(?:\[(\d+)\])?$/.exec(vpart);
      if (!vm) return res([]);
      let v = R.ctx.getVar(vm[1]);
      if (vm[2] !== undefined) v = Array.isArray(v) ? v[+vm[2]] : undefined;
      const o = Array.isArray(v) ? v[0] : v;
      if (!o || typeof o !== "object") return res([]);
      const props = Object.keys(o).filter((k) => !k.startsWith("_"));
      return res(matchPrefix(props, rest).map((p) => word.slice(0, dot + 1) + p));
    }
    const names = [];
    for (const sc of R.ctx.scopes) for (const k of sc.keys()) names.push(k);
    return res(matchPrefix(names.concat(AUTO_VARS), word.slice(1)).map((n) => "$" + n));
  }
  if (!segWords.length) {
    if (word.startsWith("./") || word.startsWith("~/") || word.startsWith("/")) return res(fileCands(word));
    if (!word) return res([]);
    const names = visibleCmds().concat(Object.keys(PS.ALIASES).filter((a) => /^[a-z]/i.test(a))).concat(Object.keys(R.ctx.funcs || {}));
    const hits = matchPrefix(names, word);
    return res(hits.length ? hits.sort((a, b) => a.localeCompare(b)) : fileCands(word));
  }
  const cmdName = segWords[0].toLowerCase();
  const canon = (PS.ALIASES[cmdName] || cmdName).toLowerCase();
  const spec = PS.CMDS[canon] && (!PS.CMDS[canon].session || R.ctx.exo) ? PS.CMDS[canon] : null;
  const fn = R.ctx.funcs && R.ctx.funcs[cmdName];
  if (word.startsWith("-")) {
    let names = [];
    if (spec) names = Object.keys(spec.params || {}).concat(spec.whatif ? ["WhatIf", "Confirm"] : []).concat(COMMON_PARAMS);
    else if (fn) names = fn.params.map((p) => p.name);
    return res(matchPrefix(names, word.slice(1)).map((n) => "-" + n));
  }
  const prev = segWords[segWords.length - 1] || "";
  if (prev.startsWith("-") && spec) {
    const pn = prev.slice(1).toLowerCase();
    const e = (PARAM_ENUMS[canon] || {})[pn] || ENUMS[pn];
    if (e) return res(matchPrefix(e, word));
    if (pn === "module" && (canon === "get-command")) return res(matchPrefix(moduleNames(), word));
    if (pn === "name" && (canon === "get-command" || canon === "get-help")) return res(matchPrefix(visibleCmds(), word));
    return res(fileCands(word));
  }
  if ((canon === "get-help" || canon === "get-command") && segWords.length === 1 && word) return res(matchPrefix(visibleCmds(), word).sort());
  return res(fileCands(word));
}
function fileCands(word) {
  const ctx = R.ctx; if (!ctx) return [];
  let w = word, shown = "./";
  const slash = w.lastIndexOf("/");
  let dirTyped = "", rest = w;
  if (slash >= 0) { dirTyped = w.slice(0, slash + 1); rest = w.slice(slash + 1); shown = dirTyped; }
  const base = slash >= 0 ? ctx.path(dirTyped === "/" ? "/" : dirTyped.replace(/\/$/, "") || "/") : ctx.cwd;
  const kids = Array.from(ctx.dirs).filter((d) => d !== base && d.slice(0, d.lastIndexOf("/") || 1) === base).map((d) => d.split("/").pop())
    .concat(Object.keys(ctx.fs || {}).filter((p) => p.slice(0, p.lastIndexOf("/") || 1) === base).map((p) => p.split("/").pop()));
  return matchPrefix(kids, rest).sort((a, b) => a.localeCompare(b)).map((f) => shown + f);
}

function setVal(v, caret) { const i = inp(); CON.undo.push([i.value, i.selectionStart]); if (CON.undo.length > 100) CON.undo.shift(); i.value = v; const c = caret === undefined ? v.length : caret; i.setSelectionRange(c, c); ghost(); }
function suggestion() {
  const v = inp().value;
  if (!v || inp().selectionStart !== v.length || CON.search || CON.menu) return "";
  for (let k = R.hist.length - 1; k >= 0; k--) { const h = R.hist[k]; if (h.length > v.length && h.toLowerCase().startsWith(v.toLowerCase())) return h.slice(v.length); }
  return "";
}
function ghost() {
  const g = $("tghost"); if (!g) return;
  const sug = suggestion();
  g.innerHTML = sug ? "<span>" + esc(inp().value) + "</span><i>" + esc(sug) + "</i>" : "";
}
function acceptSuggestion(wordOnly) {
  const sug = suggestion(); if (!sug) return false;
  const v = inp().value;
  if (wordOnly) { const m = /^\s*\S+/.exec(sug); setVal(v + (m ? m[0] : sug)); } else setVal(v + sug);
  return true;
}
function wordLeft(v, p) { let i = p; while (i > 0 && /\s/.test(v[i - 1])) i--; while (i > 0 && !/\s/.test(v[i - 1])) i--; return i; }
function wordRight(v, p) { let i = p; while (i < v.length && /\s/.test(v[i])) i++; while (i < v.length && !/\s/.test(v[i])) i++; return i; }

function printList(list) {
  const o = $("tout");
  const w = Math.max(...list.map((x) => x.length)) + 2;
  const cols = Math.max(1, Math.floor(tcols() / w));
  let lines = [];
  for (let i = 0; i < list.length; i += cols) lines.push(list.slice(i, i + cols).map((x) => x.padEnd(w)).join("").trimEnd());
  const echo = document.createElement("div"); echo.className = "echo"; echo.innerHTML = '<span class="p">' + esc(promptStr()) + ' </span><span class="c">' + esc(inp().value) + "</span>"; o.appendChild(echo);
  tline(lines.join("\n"), "h");
}
function tabComplete() {
  const i = inp(), v = i.value, pos = i.selectionStart;
  const c = completions(v, pos);
  if (!c.list.length) { flashNo(); return; }
  if (c.list.length === 1) { const t = c.list[0]; setVal(v.slice(0, c.start) + t + v.slice(pos), c.start + t.length); CON.tabState = null; return; }
  const p = lcp(c.list);
  if (p.length > c.word.length && !/[*?]/.test(c.word)) { const t = c.list.find((x) => x.toLowerCase().startsWith(p.toLowerCase())).slice(0, p.length); setVal(v.slice(0, c.start) + t + v.slice(pos), c.start + t.length); CON.tabState = { v: inp().value }; return; }
  if (CON.tabState && CON.tabState.v === v) { printList(c.list); CON.tabState = null; return; }
  CON.tabState = { v };
  flashNo();
}
function flashNo() { const t = $("tin"); t.classList.remove("bell"); void t.offsetWidth; t.classList.add("bell"); }

function menuOpen() {
  const i = inp(), v = i.value, pos = i.selectionStart;
  const c = completions(v, pos);
  if (!c.list.length) { flashNo(); return; }
  if (c.list.length === 1) { setVal(v.slice(0, c.start) + c.list[0] + v.slice(pos), c.start + c.list[0].length); return; }
  CON.menu = { list: c.list, idx: 0, start: c.start, orig: v, origPos: pos, after: v.slice(pos) };
  menuApply(); renderMenu();
}
function menuApply() { const m = CON.menu; const t = m.list[m.idx]; const nv = m.orig.slice(0, m.start) + t + m.after; inp().value = nv; const c = m.start + t.length; inp().setSelectionRange(c, c); ghost(); }
function renderMenu() {
  const el = $("tmenu"); const m = CON.menu;
  if (!m) { el.classList.add("hide"); el.innerHTML = ""; return; }
  const w = Math.max(...m.list.map((x) => x.length)) + 2;
  el.innerHTML = m.list.map((x, k) => '<span class="' + (k === m.idx ? "on" : "") + '" style="min-width:' + w + 'ch">' + esc(x) + "</span>").join("") + '<div class="tmtip">' + esc(m.list[m.idx]) + "</div>";
  el.classList.remove("hide");
}
function menuClose(accept) { if (!CON.menu) return; if (!accept) { inp().value = CON.menu.orig; inp().setSelectionRange(CON.menu.origPos, CON.menu.origPos); } CON.menu = null; renderMenu(); ghost(); }

function searchStart(dir) {
  if (!CON.search) CON.search = { dir, q: "", idx: R.hist.length, orig: inp().value, found: "" };
  else { CON.search.dir = dir; searchStep(true); }
  renderSearch();
}
function searchStep(next) {
  const s = CON.search; if (!s.q) return;
  const ql = s.q.toLowerCase();
  let k = s.idx;
  const step = s.dir === "bck" ? -1 : 1;
  if (!next) k = s.dir === "bck" ? Math.min(s.idx, R.hist.length - 1) : Math.max(s.idx, 0); else k += step;
  for (; k >= 0 && k < R.hist.length; k += step) if (R.hist[k].toLowerCase().includes(ql)) { s.idx = k; s.found = R.hist[k]; return; }
  flashNo();
}
function renderSearch() {
  const s = CON.search;
  $("tprompt").textContent = s ? (s.dir === "bck" ? "bck-i-search: " : "fwd-i-search: ") + s.q + "_" : promptStr();
  if (s) { inp().value = s.found || s.orig; ghost(); }
}
function searchEnd(keep) { const s = CON.search; if (!s) return; CON.search = null; const v = keep ? (s.found || s.orig) : s.orig; renderSearch(); inp().value = v; inp().setSelectionRange(v.length, v.length); ghost(); }

function submitLine() {
  const i = inp();
  const src = i.value;
  i.value = ""; ghost(); CON.undo = []; CON.tabState = null;
  if (!src.trim()) { const d = document.createElement("div"); d.innerHTML = '<span class="p">' + esc(promptStr()) + ' </span>'; $("tout").appendChild(d); return; }
  if (R.hist[R.hist.length - 1] !== src) R.hist.push(src);
  R.hpos = R.hist.length; saveHist();
  (R.sessHist = R.sessHist || []).push(src);
  if (/^\s*(cls|clear|clear-host)\s*$/i.test(src)) { $("tout").innerHTML = ""; return; }
  const res = exec(src);
  if (R.gate) { R.gateHist.push(src); checkGate(res); }
  else if (R.phase === "recall") checkRecall(res);
  else if (R.phase === "practice") checkPractice(res);
  else if (res.error) { const help = errHelp(res.error.text ? res.error.text() : ""); if (help) { R.jlineOverride = help; R.jstate = "desync"; junie(); } }
}

function conKey(e) {
  const i = inp();
  if (R.busy) { e.preventDefault(); return; }
  const k = e.key, code = e.code;
  let alt = e.altKey || CON.meta;
  const ctrl = e.ctrlKey && !e.metaKey;
  if (e.metaKey) return;
  if (CON.meta && k !== "Escape") CON.meta = false;
  const v = i.value, p = i.selectionStart;
  const keyL = code && code.startsWith("Key") ? code.slice(3).toLowerCase() : k.toLowerCase();

  if (CON.menu) {
    const m = CON.menu;
    if (k === "Tab" || k === "ArrowRight" || k === "ArrowDown") { e.preventDefault(); m.idx = (m.idx + (k === "Tab" && e.shiftKey ? -1 : 1) + m.list.length) % m.list.length; menuApply(); renderMenu(); return; }
    if (k === "ArrowLeft" || k === "ArrowUp") { e.preventDefault(); m.idx = (m.idx - 1 + m.list.length) % m.list.length; menuApply(); renderMenu(); return; }
    if (k === "Enter") { e.preventDefault(); menuClose(true); return; }
    if (k === "Escape") { e.preventDefault(); menuClose(false); return; }
    menuClose(true);
  }
  if (CON.search) {
    const s = CON.search;
    if (ctrl && keyL === "r") { e.preventDefault(); s.dir = "bck"; searchStep(true); renderSearch(); return; }
    if (ctrl && keyL === "s") { e.preventDefault(); s.dir = "fwd"; searchStep(true); renderSearch(); return; }
    if (ctrl && keyL === "g") { e.preventDefault(); searchEnd(false); return; }
    if (k === "Backspace") { e.preventDefault(); s.q = s.q.slice(0, -1); s.idx = R.hist.length; s.found = ""; if (s.q) searchStep(false); renderSearch(); return; }
    if (k === "Enter") { e.preventDefault(); searchEnd(true); submitLine(); return; }
    if (k.length === 1 && !ctrl && !alt) { e.preventDefault(); s.q += k; searchStep(false); renderSearch(); return; }
    if (k === "Shift") return;
    searchEnd(true);
    if (k === "Escape") { e.preventDefault(); return; }
  }
  if (k !== "Tab") CON.tabState = null;

  if (k === "Escape") { e.preventDefault(); CON.meta = true; return; }
  if (k === "Enter") { e.preventDefault(); submitLine(); return; }
  if (k === "Tab") { e.preventDefault(); tabComplete(); return; }
  if (ctrl && (k === " " || code === "Space")) { e.preventDefault(); menuOpen(); return; }
  if (k === "ArrowUp" || (ctrl && keyL === "p")) { e.preventDefault(); if (R.hpos > 0) { R.hpos--; setVal(R.hist[R.hpos]); } return; }
  if (k === "ArrowDown" || (ctrl && keyL === "n")) { e.preventDefault(); if (R.hpos < R.hist.length - 1) { R.hpos++; setVal(R.hist[R.hpos]); } else { R.hpos = R.hist.length; setVal(""); } return; }
  if (k === "ArrowRight" && !alt && !ctrl) { if (p === v.length && acceptSuggestion(false)) { e.preventDefault(); } return; }
  if (k === "End") { if (acceptSuggestion(false)) e.preventDefault(); return; }
  if (ctrl) {
    switch (keyL) {
      case "a": e.preventDefault(); i.setSelectionRange(0, 0); return;
      case "e": e.preventDefault(); if (!acceptSuggestion(false)) i.setSelectionRange(v.length, v.length); return;
      case "b": e.preventDefault(); i.setSelectionRange(Math.max(0, p - 1), Math.max(0, p - 1)); return;
      case "f": e.preventDefault(); if (p === v.length) acceptSuggestion(false); else i.setSelectionRange(p + 1, p + 1); return;
      case "k": e.preventDefault(); CON.kill = v.slice(p); setVal(v.slice(0, p), p); return;
      case "u": e.preventDefault(); CON.kill = v.slice(0, p); setVal(v.slice(p), 0); return;
      case "w": e.preventDefault(); { const s = wordLeft(v, p); CON.kill = v.slice(s, p); setVal(v.slice(0, s) + v.slice(p), s); } return;
      case "y": e.preventDefault(); setVal(v.slice(0, p) + CON.kill + v.slice(p), p + CON.kill.length); return;
      case "h": e.preventDefault(); if (p > 0) setVal(v.slice(0, p - 1) + v.slice(p), p - 1); return;
      case "d": e.preventDefault(); if (!v) tline("(lab) Ctrl+D on an empty line closes pwsh. The lab stays open.", "n"); else if (p < v.length) setVal(v.slice(0, p) + v.slice(p + 1), p); return;
      case "t": e.preventDefault(); if (p > 0 && v.length > 1) { const q = p === v.length ? p - 1 : p; setVal(v.slice(0, q - 1) + v[q] + v[q - 1] + v.slice(q + 1), q + 1); } return;
      case "l": e.preventDefault(); $("tout").innerHTML = ""; return;
      case "c": e.preventDefault(); { const d = document.createElement("div"); d.className = "echo"; d.innerHTML = '<span class="p">' + esc(promptStr()) + ' </span><span class="c">' + esc(v) + '</span><span class="e">^C</span>'; $("tout").appendChild(d); setVal(""); } return;
      case "r": e.preventDefault(); searchStart("bck"); return;
      case "s": e.preventDefault(); searchStart("fwd"); return;
      case "g": e.preventDefault(); return;
      case "-": case "_": e.preventDefault(); { const u = CON.undo.pop(); if (u) { i.value = u[0]; i.setSelectionRange(u[1], u[1]); ghost(); } } return;
    }
    if (k === "_" || code === "Minus") { e.preventDefault(); const u = CON.undo.pop(); if (u) { i.value = u[0]; i.setSelectionRange(u[1], u[1]); ghost(); } return; }
  }
  if (alt) {
    CON.meta = false;
    if (keyL === "b") { e.preventDefault(); const s = wordLeft(v, p); i.setSelectionRange(s, s); return; }
    if (keyL === "f") { e.preventDefault(); if (p === v.length) acceptSuggestion(true); else { const s = wordRight(v, p); i.setSelectionRange(s, s); } return; }
    if (keyL === "d") { e.preventDefault(); const s = wordRight(v, p); CON.kill = v.slice(p, s); setVal(v.slice(0, p) + v.slice(s), p); return; }
    if (k === "Backspace") { e.preventDefault(); const s = wordLeft(v, p); CON.kill = v.slice(s, p); setVal(v.slice(0, s) + v.slice(p), s); return; }
    if (k === "." || code === "Period") { e.preventDefault(); const last = (R.hist[R.hist.length - 1] || "").trim().split(/\s+/).pop() || ""; setVal(v.slice(0, p) + last + v.slice(p), p + last.length); return; }
    if (k === "=") { e.preventDefault(); const c = completions(v, p); if (c.list.length) printList(c.list); return; }
  }
  if (k === "F2") { e.preventDefault(); tline("(lab) F2 switches predictions between inline and list view in real pwsh. This lab shows the inline view only.", "n"); return; }
}
inp().addEventListener("keydown", conKey);
inp().addEventListener("input", () => { CON.undo.push([inp().value, inp().selectionStart]); ghost(); });
inp().addEventListener("click", ghost);
inp().addEventListener("blur", () => { if (CON.menu) menuClose(true); });
