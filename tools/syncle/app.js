const KEY = "syncle.v1";
const DAYMS = 864e5;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const PHASES = [["brief", "BRIEF"], ["watch", "WATCH"], ["trace", "TRACE"], ["recall", "RECALL"], ["real", "FOR REAL"]];
const PASS_TXT = { brief: "What it is, why you need it, the traps", watch: "It runs on its own, step by step", trace: "Same idea, a few gaps to fill", recall: "Blank console, new ticket", real: "Read-only, on your own tenant" };
const EARN = { watch: 5, trace: 15, recall: 30, real: 20 };

let S = { v: 1, credits: 0, done: {}, journal: [], review: {}, gate: {}, seqSel: 0, selMem: null };
try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch (e) {}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

const R = { view: "corridor", mem: null, phase: "brief", ctx: null, setup: "none", hist: [], hpos: -1, hint: 0, watchStep: 0, busy: false, gate: false, gatePick: 0, lastRes: null, flagged: {} };

function doneOf(id) { return S.done[id] || (S.done[id] = {}); }
function synced(id) { return !!(S.done[id] && S.done[id].recall); }
function memsOf(seq) { return MEMORIES.filter((m) => m.seq === seq); }
function seqProgress(seq) { const ms = memsOf(seq); return [ms.filter((m) => synced(m.id)).length, ms.length]; }
function gateOpen() { return MEMORIES.every((m) => synced(m.id)); }
function syncPct() { const total = MEMORIES.length + GATE.tickets.length; const n = MEMORIES.filter((m) => synced(m.id)).length + GATE.tickets.filter((t) => S.gate[t.id]).length; return Math.round(n / total * 100); }
function dueReview(id) { const r = S.review[id]; return r && r.due <= Date.now(); }

function toast(m) { const t = $("toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2600); }
function earn(n, why) { if (n <= 0) return; S.credits += n; save(); hdr(); toast("+" + n + " fragments · " + why); }
function hdr() {
  const p = syncPct();
  $("syncbar").style.width = p + "%"; $("syncnum").textContent = p + "%"; $("credits").textContent = S.credits;
}
function journal(id, kind, detail) {
  S.journal.unshift({ id, kind, detail: String(detail).slice(0, 220), at: Date.now() });
  S.journal = S.journal.slice(0, 120);
  S.review[id] = { due: Date.now() + DAYMS, step: 1 };
  save();
}
function reviewPassed(id) { const r = S.review[id]; if (!r) return; if (r.step >= 3) delete S.review[id]; else S.review[id] = { due: Date.now() + (r.step === 1 ? 3 : 7) * DAYMS, step: r.step + 1 }; save(); }

const POS = [[30, 84, 1], [42, 72, .9], [54, 64, .82], [66, 56, .74], [77, 47, .66], [68, 37, .58], [55, 28, .62]];

function renderCorridor() {
  closeOverlay();
  R.view = "corridor";
  $("corridor").classList.remove("hide"); $("memory").classList.add("hide");
  $("crumb").textContent = "Memory corridor · PowerShell";
  const seq = S.seqSel;
  const sq = SEQUENCES[seq];
  $("stEyebrow").textContent = "SEQUENCE " + seq + " · " + (seq <= 4 ? "DAILY" : seq <= 6 ? "BULK" : seq === 7 ? "INVESTIGATE" : "RESPOND");
  $("stName").textContent = sq.name; $("stBlurb").textContent = sq.blurb;
  let h = "<h4>THE CURVE</h4>";
  const tiers = { 0: "DAILY · ONE USER AT A TIME", 5: "BULK · MANY USERS, SAFELY", 7: "INVESTIGATE", 8: "RESPOND" };
  SEQUENCES.forEach((q) => {
    if (tiers[q.id]) h += '<div class="tier">' + tiers[q.id] + "</div>";
    const pr = q.open ? seqProgress(q.id) : null;
    h += '<button class="seqb' + (q.id === seq ? " on" : "") + '" type="button" data-seq="' + q.id + '"' + (q.open ? "" : " disabled") + '><span class="k">' + q.id + "</span>" + esc(q.name) + '<span class="s">' + (pr ? pr[0] + "/" + pr[1] : "soon") + "</span></button>";
  });
  $("seqs").innerHTML = h;
  $("seqs").querySelectorAll("[data-seq]").forEach((b) => b.onclick = () => { S.seqSel = +b.dataset.seq; S.selMem = null; save(); renderCorridor(); });

  const ms = memsOf(seq);
  const items = ms.map((m) => ({ kind: "mem", m }));
  items.push(seq === 0 ? { kind: "next" } : { kind: "gate" });
  const pts = items.map((_, i) => POS[i]);
  let firstOpen = ms.findIndex((m) => !synced(m.id));
  if (firstOpen < 0) firstOpen = ms.length;
  if (S.selMem === null || S.selMem === undefined || !items[S.selMem]) S.selMem = Math.min(firstOpen, items.length - 1);
  $("pdone").setAttribute("points", pts.slice(0, firstOpen + 1).map((p) => p[0] + "," + p[1]).join(" "));
  $("pahead").setAttribute("points", pts.slice(firstOpen).map((p) => p[0] + "," + p[1]).join(" "));
  const last = pts[pts.length - 1];
  const gb = $("gatebg"); gb.classList.toggle("hide", seq !== 1); gb.style.left = last[0] + "%"; gb.style.top = last[1] + "%";
  let nh = "";
  items.forEach((it, i) => {
    const [x, y, s] = pts[i];
    let st, name, tag, due = false;
    if (it.kind === "mem") { st = synced(it.m.id) ? "done" : i === firstOpen ? "current" : "ahead"; name = it.m.name; tag = it.m.tag; due = dueReview(it.m.id); }
    else if (it.kind === "next") { st = seqProgress(0)[0] === ms.length ? "gate" : "ahead"; name = "Users"; tag = "NEXT SEQUENCE"; }
    else { const open = gateOpen(); const done = GATE.tickets.every((t) => S.gate[t.id]); st = done ? "done" : open ? "gate" : "ahead"; name = GATE.name; tag = open ? "TAKEOVER" : "TAKEOVER · LOCKED"; }
    nh += crystal(i, x, y, s, st, name, tag, i === S.selMem, due);
  });
  $("nodes").innerHTML = nh;
  $("nodes").querySelectorAll(".node").forEach((b) => b.onclick = () => { S.selMem = +b.dataset.i; save(); renderCorridor(); });
  $("nodes").querySelectorAll(".node").forEach((b) => b.ondblclick = () => enterSelected());
  renderDetail(items[S.selMem], ms);
  hdr();
}

function crystal(i, x, y, s, st, name, tag, sel, due) {
  const big = st === "gate";
  const w = Math.round(44 * s * (big ? 1.25 : 1)), h = Math.round(w * 1.6);
  const col = { done: "#1f5fc4", current: "#1f5fc4", ahead: "#8a96a6", gate: "#5d7fb8" }[st];
  const op = { done: [.55, .32, .42, .22], current: [.85, .5, .65, .35], ahead: [.1, .04, .07, .02], gate: [.95, .7, .8, .55] }[st];
  const glow = st === "current" ? "drop-shadow(0 0 10px rgba(31,95,196,.55))" : st === "gate" ? "drop-shadow(0 0 14px rgba(255,255,255,.9)) drop-shadow(0 0 4px rgba(17,22,29,.25))" : st === "done" ? "drop-shadow(0 0 5px rgba(31,95,196,.3))" : "none";
  const lit = st !== "ahead";
  const label = st === "done" ? "synced" : st === "current" ? "next memory" : st === "gate" ? "open" : "ahead";
  return '<button class="node' + (sel ? " sel" : "") + '" type="button" data-i="' + i + '" style="left:' + x + "%;top:" + y + '%" aria-label="' + esc(name + ", " + label) + '">' +
    '<div class="mem" style="width:' + Math.round(w * 2.2) + "px;height:" + Math.round(h * 1.5) + "px;color:" + col + '">' +
    (due ? '<span class="due">REVIEW</span>' : "") +
    '<svg class="ring" viewBox="0 0 100 30" aria-hidden="true" style="width:' + Math.round(w * 2.1) + "px;height:" + Math.round(w * .63) + "px;opacity:" + (lit ? .8 : .4) + '"><ellipse cx="50" cy="15" rx="46" ry="11" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="10 6" style="animation-duration:' + (16 + i * 3) + 's"/></svg>' +
    (lit ? '<div class="beam" style="width:' + Math.round(w * .55) + "px;height:" + Math.round(h * 1.15) + 'px"></div>' : "") +
    (st === "current" ? '<div class="halo"></div><div class="spark" style="left:20%;top:40%"></div><div class="spark" style="left:78%;top:30%;animation-delay:1.7s"></div><div class="spark" style="left:55%;top:70%;animation-delay:3.3s"></div>' : "") +
    '<div class="bob" style="animation-delay:-' + (i * .9).toFixed(1) + 's"><svg class="turn" viewBox="0 0 40 64" aria-hidden="true" style="width:' + w + "px;height:" + h + "px;filter:" + glow + ";animation-duration:" + (14 + i * 2) + "s;animation-delay:-" + (i * 1.7).toFixed(1) + 's">' +
    '<polygon points="20,0 0,26 20,26" fill="currentColor" fill-opacity="' + op[0] + '"/><polygon points="20,0 40,26 20,26" fill="currentColor" fill-opacity="' + op[1] + '"/><polygon points="0,26 20,64 20,26" fill="currentColor" fill-opacity="' + op[2] + '"/><polygon points="40,26 20,64 20,26" fill="currentColor" fill-opacity="' + op[3] + '"/><polygon points="20,0 0,26 20,64 40,26" fill="none" stroke="currentColor" stroke-width="1.2"/>' +
    (lit ? '<polygon points="20,10 10,26 20,46 30,26" fill="none" stroke="#ffffff" stroke-width=".8" opacity=".7"/>' : "") + "</svg></div></div>" +
    '<div class="nlabel" style="font-size:' + Math.max(11, Math.round(14 * s)) + 'px"><b>' + esc(name) + "</b><small>" + esc(tag) + "</small></div></button>";
}

function renderDetail(it, ms) {
  const d = $("detail");
  if (it.kind === "next") {
    const [n, t] = seqProgress(0);
    d.innerHTML = '<div class="l"><span class="eyebrow">NEXT SEQUENCE</span><h3>Users</h3><p>' + esc(SEQUENCES[1].blurb) + '</p><p class="mutetxt">' + (n === t ? "Connect is fully synced. Step through." : n + " of " + t + " Connect memories synced. You can look ahead, but the Users memories assume you can connect and find commands on your own.") + '</p></div><div class="r"><div class="row"><button class="go" type="button" id="goNext">ENTER THE USERS CORRIDOR</button></div></div>';
    $("goNext").onclick = () => { S.seqSel = 1; S.selMem = null; save(); renderCorridor(); };
    return;
  }
  if (it.kind === "gate") {
    const open = gateOpen();
    const done = GATE.tickets.filter((t) => S.gate[t.id]).length;
    d.innerHTML = '<div class="l"><span class="eyebrow">TAKEOVER · LEVEL 1 · LOGISTICS</span><h3>' + esc(GATE.name) + "</h3><p>" + esc(GATE.story) + '</p><p class="mutetxt">' + done + " of " + GATE.tickets.length + " tickets closed</p></div>" +
      '<div class="r"><div class="gatehero" role="img" aria-label="Halvard and Co warehouse, reconstructing"></div><div class="row"><button class="go" type="button" id="goGate"' + (open ? "" : " disabled") + ">" + (open ? "ENTER THE TENANT" : "SYNC ALL 12 MEMORIES TO OPEN") + "</button>" + (open ? "" : '<span class="mutetxt">' + MEMORIES.filter((m) => synced(m.id)).length + " / 12 synced</span>") + "</div></div>";
    if (open) $("goGate").onclick = () => openGate();
    return;
  }
  const m = it.m, dn = S.done[m.id] || {};
  d.innerHTML = '<div class="l"><span class="eyebrow">' + esc(m.tag) + " · " + (synced(m.id) ? "SYNCED" : "NOT SYNCED") + (dueReview(m.id) ? " · REVIEW DUE" : "") + "</span><h3>" + esc(m.name) + "</h3><p>" + esc(m.summary) + '</p><div class="codebox">' + esc(m.cheat[0][0]) + "</div></div>" +
    '<div class="r"><span class="mutetxt" style="letter-spacing:.24em;font-size:11px">ONE MEMORY · FIVE PASSES · ABOUT 8 MINUTES</span><div class="passes">' +
    PHASES.map(([k, l], i) => '<div class="pass' + (dn[k] ? " done" : "") + '"><b>' + (i + 1) + " · " + l + "</b>" + PASS_TXT[k] + "</div>").join("") +
    '</div><div class="row"><button class="go" type="button" id="goMem">' + (synced(m.id) ? (dueReview(m.id) ? "REVIEW THIS MEMORY" : "REPLAY MEMORY") : "ENTER MEMORY") + '</button><span class="mutetxt">Double-click a crystal to enter it</span></div></div>';
  $("goMem").onclick = () => enterSelected();
}

function enterSelected() {
  const ms = memsOf(S.seqSel);
  if (S.selMem < ms.length) openMemory(ms[S.selMem]);
  else if (S.seqSel === 0) { S.seqSel = 1; S.selMem = null; save(); renderCorridor(); }
  else if (gateOpen()) openGate();
}

function resetConsole(setup) {
  R.setup = setup;
  R.ctx = GRADER.makeCtx(setup);
  $("tout").innerHTML = "";
  tline(setup === "none" ? "Fresh pwsh window. Nothing is connected yet." : setup === "write" ? "Lab session: connected to Graph with User.ReadWrite.All." : setup === "exo" ? "Lab session: connected to Graph and Exchange." : "Lab session: connected to Graph with User.Read.All.", "n");
  tstate();
}
function tstate() { const c = R.ctx; $("tstate").textContent = (c.mg ? "GRAPH · " + c.mg.scopes.filter((s) => /\./.test(s) && s !== "User.Read").join(", ") : "NOT CONNECTED") + (c.exo ? " · EXCHANGE" : ""); }
function tline(t, cls) { const o = $("tout"); const d = document.createElement("div"); if (cls) d.className = cls; d.textContent = t; o.appendChild(d); o.scrollTop = o.scrollHeight; }
function tcols() { const w = $("tout").clientWidth - 32; return Math.max(60, Math.floor(w / 7.55)); }

function exec(src, opts) {
  opts = opts || {};
  const o = $("tout");
  const echo = document.createElement("div");
  echo.className = "echo";
  echo.innerHTML = '<span class="p">PS /Users/kaatje&gt; </span><span class="c">' + esc(src) + "</span>";
  o.appendChild(echo);
  const res = PS.run(src, R.ctx);
  for (const h of res.host) { if (h.clear) { o.innerHTML = ""; continue; } if (h.err) tline(h.err, "e"); else if (h.text !== undefined) tline(h.text, "h"); }
  const txt = PS.formatOut(res.out, tcols());
  if (txt && txt.trim()) tline(txt.replace(/^\n+/, "").replace(/\s+$/, "") + "\n", "");
  if (res.error) tline(res.error.text ? res.error.text() : String(res.error.message), "e");
  o.scrollTop = o.scrollHeight;
  R.lastRes = res;
  tstate();
  lastRun(res, src);
  return res;
}
function lastRun(res, src) {
  const el = $("lastrun"); if (!el) return;
  el.textContent = res.error ? "last run: error" : "last run: " + res.out.length + (res.out.length === 1 ? " object" : " objects");
}

function errHelp(text) { for (const [re, msg] of ERR_HELP) if (re.test(text)) return msg; return null; }

function openMemory(m) {
  closeOverlay();
  R.view = "memory"; R.gate = false; R.mem = m; R.hint = 0; R.watchStep = 0;
  $("corridor").classList.add("hide"); $("memory").classList.remove("hide");
  $("crumb").textContent = SEQUENCES[m.seq].name + " · " + m.name;
  const dn = doneOf(m.id);
  R.phase = !dn.brief ? "brief" : !dn.watch ? "watch" : !dn.trace ? "trace" : !dn.recall ? "recall" : dueReview(m.id) ? "recall" : "brief";
  flowband(m.brief.flow, "HOW " + m.name.toUpperCase() + " WORKS");
  setPhase(R.phase);
  $("cmd").focus();
}

function flowband(flow, label) {
  const n = flow.length;
  let h = '<div class="fbg" aria-hidden="true"></div><div class="fline" aria-hidden="true"></div><span class="flowlabel">' + esc(label) + '</span><span class="lastrun" id="lastrun"></span>';
  flow.forEach((f, i) => {
    const x = 10 + (80 / (n - 1)) * i;
    h += '<div class="fnode' + (i === n - 1 ? " lit" : "") + '" style="left:' + x + '%"><div class="d"></div><b>' + esc(f[0]) + "</b><small>" + esc(f[1]) + "</small></div>";
  });
  for (let i = 0; i < 6; i++) h += '<div class="frag" aria-hidden="true" style="animation-delay:' + (i * 2.3).toFixed(1) + 's"></div>';
  $("flowband").innerHTML = h;
}

function setPhase(p) {
  R.phase = p; R.hint = 0;
  const m = R.mem, dn = doneOf(m.id);
  $("tabs").innerHTML = PHASES.map(([k, l]) => '<button class="tab' + (k === p ? " on" : "") + (dn[k] ? " done" : "") + '" role="tab" type="button" data-p="' + k + '" aria-selected="' + (k === p) + '">' + l + "</button>").join("");
  $("tabs").querySelectorAll(".tab").forEach((b) => b.onclick = () => setPhase(b.dataset.p));
  const setup = p === "trace" ? (m.trace.setup || m.setup) : p === "recall" ? m.recall.setup : p === "real" ? "none" : m.setup;
  resetConsole(setup);
  if (p === "brief") renderBrief(m);
  if (p === "watch") renderWatch(m);
  if (p === "trace") renderTrace(m);
  if (p === "recall") renderRecall(m);
  if (p === "real") renderReal(m);
  sidecard(m);
  junie();
}

function renderBrief(m) {
  const b = m.brief;
  $("pbody").innerHTML = "<h5>What it is</h5>" + b.what.map((x) => "<p>" + x + "</p>").join("") +
    "<h5>You will use it</h5><ul>" + b.daily.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>" +
    '<h5>Read it like a sentence</h5><div class="chips">' + b.parts.map(([c, t]) => '<div class="chip"><code>' + esc(c) + "</code><span>" + esc(t) + "</span></div>").join("") + "</div>" +
    '<h5>Traps in a real tenant</h5><div class="traps">' + b.traps.map(([t, x]) => '<div class="trapc"><b>' + esc(t) + "</b>" + esc(x) + "</div>").join("") + "</div>" +
    '<div class="row" style="margin-top:6px"><button class="go" type="button" id="toWatch">I HAVE READ IT · WATCH IT RUN</button></div>';
  $("toWatch").onclick = () => { doneOf(m.id).brief = true; save(); setPhase("watch"); };
  $("cmd").placeholder = "The console is live. Try anything while you read.";
}

function renderWatch(m) {
  const i = R.watchStep, steps = m.watch, st = steps[Math.min(i, steps.length - 1)];
  const fin = i >= steps.length;
  $("pbody").innerHTML = '<div class="steps">' + steps.map((_, k) => "<i" + (k < i ? ' class="on"' : "") + "></i>").join("") + "</div>" +
    '<h5>Step ' + Math.min(i + 1, steps.length) + " of " + steps.length + "</h5>" +
    '<div class="codebox">' + esc(st.code) + '</div><p class="say">' + esc(fin ? "That is the whole memory in motion. Next, you fill in the gaps yourself." : st.say) + "</p>" +
    '<div class="row">' + (fin ? '<button class="go blue" type="button" id="toTrace">GO TO TRACE</button><button class="go ghost" type="button" id="replay">REPLAY</button>' : '<button class="go" type="button" id="play">' + (i === 0 ? "PLAY STEP 1" : "PLAY NEXT STEP") + "</button>") + "</div>" +
    '<p class="mutetxt">You set the pace. Each step types itself into the console and runs for real, errors included.</p>';
  if (fin) { $("toTrace").onclick = () => setPhase("trace"); $("replay").onclick = () => { R.watchStep = 0; resetConsole(m.setup); renderWatch(m); }; }
  else $("play").onclick = () => playStep(m);
  $("cmd").placeholder = "Watching. You can still type here.";
}
function playStep(m) {
  if (R.busy) return;
  const st = m.watch[R.watchStep]; R.busy = true;
  const inp = $("cmd"); $("tin").classList.add("busy");
  let k = 0;
  const tick = () => {
    inp.value = st.code.slice(0, ++k);
    if (k < st.code.length) setTimeout(tick, 18);
    else setTimeout(() => {
      inp.value = ""; $("tin").classList.remove("busy"); R.busy = false;
      exec(st.code);
      R.watchStep++;
      if (R.watchStep >= m.watch.length && !doneOf(m.id).watch) { doneOf(m.id).watch = true; save(); earn(EARN.watch, "watched " + m.name); }
      renderWatch(m); junie();
    }, 260);
  };
  tick();
}

function renderTrace(m) {
  const t = m.trace;
  let gi = 0;
  const tpl = esc(t.tpl).replace(/\[\[([^\]]*)\]\]/g, (_, a) => '<input class="gap" data-g="' + (gi++) + '" style="--w:' + Math.max(90, a.length * 9 + 26) + 'px" aria-label="Gap ' + gi + '" autocomplete="off" spellcheck="false">');
  $("pbody").innerHTML = '<p class="ask">' + esc(t.ask) + '</p><div class="tpl">' + tpl + "</div>" +
    (t.after ? '<p class="mutetxt">Runs afterwards automatically: <code>' + esc(t.after.join("; ")) + "</code></p>" : "") +
    '<div class="row"><button class="go blue" type="button" id="runTrace">RUN</button><span class="mutetxt">Enter in a gap also runs it</span></div>';
  const gaps = $("pbody").querySelectorAll(".gap");
  gaps.forEach((g) => g.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); runTrace(m); } }));
  $("runTrace").onclick = () => runTrace(m);
  if (gaps[0]) gaps[0].focus();
  $("cmd").placeholder = "Fill the gaps on the left, or experiment here first.";
}
function runTrace(m) {
  const t = m.trace;
  const vals = Array.from($("pbody").querySelectorAll(".gap")).map((g) => g.value.trim());
  if (vals.some((v) => !v)) { R.jlineOverride = "Fill every gap first. An empty gap is still a mistake PowerShell would refuse."; junie(); return; }
  const cmd = GRADER.fillTpl(t.tpl, vals);
  resetConsole(t.setup || m.setup);
  let res = exec(cmd);
  if (!res.error) for (const a of t.after || []) { const r2 = exec(a); if (r2.error) res = r2; }
  const ok = GRADER.verdict(t.check, t.setup || m.setup, R.ctx, res);
  if (ok) {
    const first = !doneOf(m.id).trace;
    doneOf(m.id).trace = true; save();
    if (first) earn(Math.max(5, EARN.trace - R.hint * 3), "traced " + m.name);
    synced_overlay("Trace complete", "The command ran exactly as it would in your real tenant. Now the gaps disappear.", () => setPhase("recall"), "GO TO RECALL");
  } else desync(m, cmd, res, t.wrong);
}

function renderRecall(m) {
  const due = dueReview(m.id) && synced(m.id);
  $("pbody").innerHTML = (due ? '<span class="badge ok">REVIEW · KEEP IT IN MEMORY</span>' : "") + '<h5>New ticket</h5><p class="ask">' + esc(m.recall.ask) + "</p>" +
    '<p class="mutetxt">Type it in the console. Each command runs for real, and Junie checks the result. Explore freely: Get-Command, Get-Help and Get-Member all work.</p>' +
    '<div class="minicard" style="border-style:dashed"><h6>STARTING STATE</h6>' + ({ none: "Fresh window, nothing connected.", read: "Connected to Graph with User.Read.All only.", write: "Connected to Graph with User.ReadWrite.All.", exo: "Connected to Graph and Exchange." }[m.recall.setup]) + "</div>";
  $("cmd").placeholder = "Your turn. No gaps this time.";
  $("cmd").focus();
}
function checkRecall(res) {
  const m = R.mem;
  if (res.error) {
    $("term").classList.remove("flash"); void $("term").offsetWidth; $("term").classList.add("flash");
    const help = errHelp(res.error.text ? res.error.text() : "");
    R.jlineOverride = help ? "That error is real PowerShell talking. " + help : "Read the red text slowly: the first line usually names the problem.";
    R.jstate = "desync";
    const key = m.id + ":" + (res.error.kind || "e");
    if (!R.flagged[key]) { R.flagged[key] = true; journal(m.id, "error", res.error.text ? res.error.text() : ""); }
    junie();
    return;
  }
  const ok = GRADER.verdict(m.recall.check, m.recall.setup, R.ctx, res);
  if (ok) {
    const first = !doneOf(m.id).recall;
    doneOf(m.id).recall = true;
    if (!first) reviewPassed(m.id);
    save();
    earn(first ? Math.max(8, EARN.recall - R.hint * 6) : 10, (first ? "synced " : "reviewed ") + m.name);
    const nxt = nextMemory(m);
    synced_overlay("Synchronized", first ? "Memory " + m.name + " is yours. The For Real pass lets you try it on your own tenant, read-only." : "Review done. This one comes back later, spaced further apart.", () => setPhase("real"), "FOR REAL PASS", nxt ? () => openMemory(nxt) : null);
  }
}
function nextMemory(m) { const i = MEMORIES.indexOf(m); return MEMORIES[i + 1] && MEMORIES[i + 1].seq === m.seq ? MEMORIES[i + 1] : null; }

function renderReal(m) {
  const dn = doneOf(m.id);
  $("pbody").innerHTML = '<span class="badge' + (dn.real ? " ok" : "") + '">' + (dn.real ? "DONE ON A REAL TENANT" : "OPTIONAL · READ-ONLY UNLESS IT SAYS TEST ACCOUNT") + "</span>" +
    "<p>Everything in the lab behaves like the real thing. This pass proves it: open pwsh on your Mac and do the same on your own tenant.</p>" +
    '<ol class="realsteps">' + m.real.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ol>" +
    '<p class="mutetxt">Compare what you see with the lab. If anything behaves differently, note it in the journal: the lab has to match reality, not the other way round.</p>' +
    '<div class="row"><button class="go" type="button" id="realDone"' + (dn.real ? " disabled" : "") + ">" + (dn.real ? "DONE" : "I DID IT FOR REAL") + "</button>" + (nextMemory(m) ? '<button class="go ghost" type="button" id="nextMem">NEXT MEMORY</button>' : '<button class="go ghost" type="button" id="backC">BACK TO THE CORRIDOR</button>') + "</div>";
  if (!dn.real) $("realDone").onclick = () => { dn.real = true; save(); earn(EARN.real, "did " + m.name + " for real"); renderReal(m); };
  const nx = nextMemory(m);
  if (nx) $("nextMem").onclick = () => openMemory(nx); else $("backC").onclick = () => renderCorridor();
  $("cmd").placeholder = "This console is the lab. The For Real steps happen in your own Terminal.";
}

function sidecard(m) {
  if (R.gate) { $("sidecard").innerHTML = "<h6>TAKEOVER RULES</h6>Look before you change. Read-only first, write scopes only for the tickets that need them. Changes to people who are not in a ticket count as collateral damage."; return; }
  $("sidecard").innerHTML = "<h6>IN THE CHEAT SHEET</h6>" + m.cheat.map(([c, d]) => '<div style="margin:6px 0"><code style="font-size:12px;word-break:break-word">' + esc(c) + '</code><div class="mutetxt" style="font-size:12px">' + esc(d) + "</div></div>").join("") + '<button class="hbtn" type="button" id="openCheat" style="margin-top:8px">OPEN FULL SHEET</button>';
  $("openCheat").onclick = () => drawer(true);
}

function hintsFor() {
  if (R.gate) { const t = GATE.tickets[R.gatePick]; return t ? [t.hint] : []; }
  const m = R.mem;
  if (R.phase === "trace") return m.traceHints;
  if (R.phase === "recall") return m.recallHints;
  return [];
}
function junie() {
  const hs = hintsFor(), max = hs.length;
  let cls = "j-idle", step = "STANDING BY", line;
  const m = R.mem;
  if (R.gate) line = "Five tickets, one tenant. Read each one twice: the ticket is what the user says, not always what the fix is.";
  else line = { brief: "Read this first. Everything after it builds on these few ideas, and the traps box is where real tenants bite.", watch: R.watchStep >= (m ? m.watch.length : 0) ? "Seen it all. Ready to try with gaps?" : "Watch what changes between the steps, not just the result.", trace: "Fill the gaps and run. I am here if you get stuck.", recall: "Your turn, no gaps. Ask me if you need a nudge.", real: "Lab and reality should match exactly. This is where you check." }[R.phase];
  if (R.hint > 0) { cls = "j-hint"; step = "HINT " + R.hint + " OF " + max; line = hs[R.hint - 1]; }
  if (R.jlineOverride) { line = R.jlineOverride; cls = R.jstate === "desync" ? "j-desync" : cls; step = R.jstate === "desync" ? "SOMETHING WENT WRONG" : step; R.jlineOverride = null; R.jstate = null; }
  $("jimg").className = "jimg " + cls;
  $("jstep").textContent = "JUNIE · " + step;
  $("jline").textContent = line;
  const b = $("askj");
  b.disabled = max === 0 || R.hint >= max;
  b.textContent = max === 0 ? "NO HINTS NEEDED" : R.hint >= max ? "ALL HINTS USED" : R.hint === 0 ? "ASK JUNIE" : "NEXT HINT";
  $("jleft").textContent = max && R.hint < max ? (max - R.hint) + " left" : "";
}
$("askj").onclick = () => {
  const hs = hintsFor(); if (R.hint >= hs.length) return;
  R.hint++;
  if (!R.gate && R.hint === hs.length) journal(R.mem.id, "answer shown", hs[hs.length - 1]);
  junie();
};

function overlay(html) { const o = $("ov"); o.innerHTML = html; o.classList.remove("hide"); const b = o.querySelector("button"); if (b) b.focus(); }
function closeOverlay() { $("ov").classList.add("hide"); $("ov").innerHTML = ""; }
function desync(m, cmd, res, wrong) {
  const err = res.error ? (res.error.text ? res.error.text() : String(res.error.message)) : null;
  const help = err ? errHelp(err) : null;
  const shown = err || (PS.formatOut(res.out, 90) || "").trim() || "(no output)";
  const why = help || (wrong + (err ? "" : " The command ran without an error, but it did not produce what the ticket asked for."));
  journal(m.id, err ? "error" : "wrong result", err || cmd);
  const counts = res.error ? "PowerShell refused to run it." : "It ran, but the result is not what the memory expected.";
  overlay('<div class="ds" role="dialog" aria-label="Desynchronized"><div class="dshero"><div class="dbg" aria-hidden="true"></div><div class="scan" aria-hidden="true"></div><small>MEMORY REJECTED</small><h2>DESYNCHRONIZED</h2><p>' + esc(counts) + "</p></div>" +
    '<div class="dsbody"><div><h5>WHAT YOU RAN</h5><pre>' + esc(cmd) + "</pre><h5>" + (err ? "WHAT POWERSHELL SAID" : "WHAT CAME BACK") + '</h5><pre class="' + (err ? "e" : "") + '">' + esc(shown.slice(0, 900)) + "</pre></div>" +
    '<div style="display:flex;flex-direction:column;gap:14px"><div class="dsj"><div class="jimg j-desync" role="img" aria-label="Junie, a little shaken"></div><div><h5 style="color:var(--red)">JUNIE</h5><p style="margin:0;font-size:14px;line-height:1.55">' + esc(why) + '</p></div></div><p class="mutetxt" style="margin:0">Saved to your journal. This memory comes back for review tomorrow.</p><div class="row"><button class="go" type="button" id="resync">RESYNC</button></div></div></div></div>');
  $("resync").onclick = () => { closeOverlay(); const g = $("pbody").querySelector(".gap"); if (g) g.focus(); };
}
function synced_overlay(title, text, next, nextLabel, alt) {
  overlay('<div class="sy" role="dialog" aria-label="' + esc(title) + '"><div class="jimg j-success" role="img" aria-label="Junie, happy"></div><small>MEMORY ACCEPTED</small><h2>' + esc(title.toUpperCase()) + "</h2><p>" + esc(text) + '</p><div class="row" style="justify-content:center"><button class="go blue" type="button" id="syNext">' + esc(nextLabel) + "</button>" + (alt ? '<button class="go ghost" type="button" id="syAlt">NEXT MEMORY</button>' : "") + '<button class="go ghost" type="button" id="syStay">STAY HERE</button></div></div>');
  $("syNext").onclick = () => { closeOverlay(); next(); };
  if (alt) $("syAlt").onclick = () => { closeOverlay(); alt(); };
  $("syStay").onclick = () => closeOverlay();
}

function openGate() {
  closeOverlay();
  R.view = "memory"; R.gate = true; R.mem = null; R.hint = 0; R.phase = "gate";
  $("corridor").classList.add("hide"); $("memory").classList.remove("hide");
  $("crumb").textContent = "Takeover · " + GATE.name;
  flowband([["Ticket", "what the user says"], ["Look", "Get- first"], ["Change", "only what was asked"], ["Verify", "read it back"]], "HALVARD & CO · HOW A TAKEOVER TICKET FLOWS");
  $("tabs").innerHTML = '<button class="tab on" type="button">TICKETS</button>';
  resetConsole("none");
  R.gateBaseline = R.ctx.t.users.map((u) => [u.UserPrincipalName, u.AccountEnabled, u.Department, u.JobTitle].join("|"));
  R.gateHist = [];
  R.gatePick = GATE.tickets.findIndex((t) => !S.gate[t.id]); if (R.gatePick < 0) R.gatePick = 0;
  renderGate(); sidecard(); junie();
  $("cmd").placeholder = "You are in. Start with ticket 1.";
  $("cmd").focus();
}
function renderGate() {
  $("pbody").innerHTML = '<div class="gatehero" role="img" aria-label="Halvard and Co warehouse"></div><p>' + esc(GATE.story) + '</p><div class="tickets">' +
    GATE.tickets.map((t, i) => '<div class="ticket' + (i === R.gatePick ? " on" : "") + (S.gate[t.id] ? " done" : "") + '"><small>TICKET ' + (i + 1) + " · FROM " + esc(t.from.toUpperCase()) + (S.gate[t.id] ? " · CLOSED" : "") + "</small><b>" + esc(t.title) + "</b><p>" + esc(t.body) + "</p></div>").join("") + "</div>" +
    '<p class="mutetxt">The console starts fresh: nothing connected. Each ticket closes the moment your command does what it asks.</p>';
}
function checkGate(res) {
  const t = GATE.tickets[R.gatePick];
  if (res.error) {
    const help = errHelp(res.error.text ? res.error.text() : "");
    R.jlineOverride = help || "Read the red text: the first line usually names the problem."; R.jstate = "desync"; junie();
    $("term").classList.remove("flash"); void $("term").offsetWidth; $("term").classList.add("flash");
  }
  const collateral = R.ctx.t.users.filter((u, i) => {
    const now = [u.UserPrincipalName, u.AccountEnabled, u.Department, u.JobTitle].join("|");
    return now !== R.gateBaseline[i] && !/corvin\.ashby|liora\.penn/i.test(u.UserPrincipalName);
  });
  if (collateral.length) { R.jlineOverride = "Careful: you changed " + collateral.map((u) => u.DisplayName).join(", ") + ", who is not in any ticket. In a real tenant that is a phone call from someone very confused."; R.jstate = "desync"; junie(); }
  if (!t) return;
  let ok = false; try { ok = t.check(R.ctx, R.gateHist, res); } catch (e) { ok = false; }
  if (ok && !S.gate[t.id]) {
    S.gate[t.id] = true; save(); earn(25, "closed " + t.title);
    const nx = GATE.tickets.findIndex((x) => !S.gate[x.id]);
    if (nx < 0) { synced_overlay("Takeover complete", "Halvard & Co is mapped, tidied and safe. Sequence 2, Mailboxes, is next when it is built.", () => renderCorridor(), "BACK TO THE CORRIDOR"); }
    else { R.gatePick = nx; R.hint = 0; toast("Ticket closed. Next: " + GATE.tickets[nx].title); }
    renderGate(); junie();
  }
}

$("cmd").addEventListener("keydown", (e) => {
  const inp = e.target;
  if (R.busy) { e.preventDefault(); return; }
  if (e.key === "Enter") {
    e.preventDefault();
    const src = inp.value; inp.value = "";
    if (!src.trim()) { const d = document.createElement("div"); d.innerHTML = '<span class="p">PS /Users/kaatje&gt; </span>'; $("tout").appendChild(d); return; }
    R.hist.push(src); R.hpos = R.hist.length;
    if (/^\s*(cls|clear|clear-host)\s*$/i.test(src)) { $("tout").innerHTML = ""; return; }
    const res = exec(src);
    if (R.gate) { R.gateHist.push(src); checkGate(res); }
    else if (R.phase === "recall") checkRecall(res);
    else if (res.error) { const help = errHelp(res.error.text ? res.error.text() : ""); if (help) { R.jlineOverride = help; R.jstate = "desync"; junie(); } }
    return;
  }
  if (e.key === "ArrowUp") { e.preventDefault(); if (R.hpos > 0) { R.hpos--; inp.value = R.hist[R.hpos]; } return; }
  if (e.key === "ArrowDown") { e.preventDefault(); if (R.hpos < R.hist.length - 1) { R.hpos++; inp.value = R.hist[R.hpos]; } else { R.hpos = R.hist.length; inp.value = ""; } return; }
  if (e.key === "Escape") { inp.value = ""; return; }
  if (e.key === "l" && e.ctrlKey) { e.preventDefault(); $("tout").innerHTML = ""; return; }
  if (e.key === "Tab") { e.preventDefault(); complete(inp, e.shiftKey); return; }
  R.tab = null;
});
function complete(inp, back) {
  const v = inp.value, pos = inp.selectionStart;
  if (R.tab && R.tab.full === v) { R.tab.i = (R.tab.i + (back ? -1 : 1) + R.tab.list.length) % R.tab.list.length; apply(); return; }
  const before = v.slice(0, pos), after = v.slice(pos);
  const m = /([\w-]*)$/.exec(before); const word = m[1]; const start = before.length - word.length;
  let list = [];
  if (word.startsWith("-")) {
    const seg = before.slice(0, start).split(/[|;]/).pop().trim();
    const cname = (seg.split(/\s+/)[0] || "").toLowerCase();
    const al = PS.ALIASES[cname]; const spec = PS.CMDS[(al || cname).toLowerCase()];
    if (spec) {
      const names = Object.keys(spec.params || {}).concat(spec.whatif ? ["WhatIf", "Confirm"] : []).concat(["ErrorAction", "OutVariable", "Verbose"]);
      list = names.filter((n) => ("-" + n).toLowerCase().startsWith(word.toLowerCase())).map((n) => "-" + n);
    }
  } else if (word) {
    list = Object.values(PS.CMDS).map((c) => c.name).filter((n) => n.toLowerCase().startsWith(word.toLowerCase())).sort();
  }
  if (!list.length) return;
  R.tab = { list, i: back ? list.length - 1 : 0, start, after, base: before.slice(0, start) };
  apply();
  function apply() { const t = R.tab; const nv = t.base + t.list[t.i] + t.after; inp.value = nv; t.full = nv; const p = (t.base + t.list[t.i]).length; inp.setSelectionRange(p, p); }
}

function drawer(open, tab) {
  const d = $("drawer");
  if (open === undefined) open = !d.classList.contains("open");
  d.classList.toggle("open", open);
  if (tab) R.dtab = tab;
  if (open) { renderDrawer(); $("dsearch").focus(); }
}
function renderDrawer() {
  const tab = R.dtab || "cheat";
  $("dtCheat").classList.toggle("on", tab === "cheat"); $("dtJournal").classList.toggle("on", tab === "journal");
  $("dsearch").classList.toggle("hide", tab !== "cheat");
  if (tab === "journal") {
    const due = Object.keys(S.review).filter((id) => dueReview(id));
    $("dbody").innerHTML = '<div class="dgroup"><h6>REVIEW DUE</h6>' + (due.length ? due.map((id) => { const m = MEMORIES.find((x) => x.id === id); return '<button class="centry" type="button" data-open="' + id + '"><code>' + esc(m ? m.name : id) + "</code><span>Open its recall pass</span></button>"; }).join("") : '<p class="mutetxt">Nothing due. Mistakes come back here a day later.</p>') + "</div>" +
      '<div class="dgroup"><h6>MISTAKES AND ANSWERS SHOWN</h6>' + (S.journal.length ? S.journal.slice(0, 60).map((j) => { const m = MEMORIES.find((x) => x.id === j.id); return '<div class="jentry"><b>' + esc(m ? m.name : j.id) + "</b> · " + esc(j.kind) + "<small>" + esc(j.detail) + " · " + new Date(j.at).toLocaleString() + "</small></div>"; }).join("") : '<p class="mutetxt">Empty so far.</p>') + "</div>";
    $("dbody").querySelectorAll("[data-open]").forEach((b) => b.onclick = () => { const m = MEMORIES.find((x) => x.id === b.dataset.open); drawer(false); openMemory(m); setPhase("recall"); });
    return;
  }
  const q = $("dsearch").value.trim().toLowerCase();
  let h = '<div class="rules"><b>Golden rules</b><ol><li>Read-only scopes to look, ReadWrite only to change.</li><li>Graph first, then Exchange, in a fresh window on Mac.</li><li>Ask Graph for properties with -Property, or they come back empty.</li><li>-All for anything you count or report.</li><li>Switch values glue on: -AccountEnabled:$false.</li><li>-WhatIf before a change, Get- after it to verify.</li><li>Leaver: block first, then revoke sessions.</li></ol></div>';
  SEQUENCES.filter((s) => s.open).forEach((s) => {
    const rows = [];
    memsOf(s.id).forEach((m) => m.cheat.forEach(([c, d]) => { if (!q || (c + " " + d + " " + m.name).toLowerCase().includes(q)) rows.push([c, d, m]); }));
    if (!rows.length) return;
    h += '<div class="dgroup"><h6>SEQUENCE ' + s.id + " · " + esc(s.name.toUpperCase()) + "</h6>" + rows.map(([c, d, m]) => '<button class="centry' + (synced(m.id) ? "" : " locked") + '" type="button" data-c="' + esc(c) + '"><code>' + esc(c) + "</code><span>" + esc(d) + (synced(m.id) ? "" : " · not synced yet") + "</span></button>").join("") + "</div>";
  });
  h += '<p class="mutetxt" style="margin-top:16px">Click a line to put it in the console, or copy it when you are in the corridor.</p>';
  $("dbody").innerHTML = h;
  $("dbody").querySelectorAll("[data-c]").forEach((b) => b.onclick = () => {
    const c = b.dataset.c;
    if (R.view === "memory") { $("cmd").value = c; drawer(false); $("cmd").focus(); }
    else { try { navigator.clipboard.writeText(c); toast("Copied"); } catch (e) { toast(c); } }
  });
}
$("cheatbtn").onclick = () => drawer(undefined, "cheat");
$("dclose").onclick = () => drawer(false);
$("dtCheat").onclick = () => { R.dtab = "cheat"; renderDrawer(); };
$("dtJournal").onclick = () => { R.dtab = "journal"; renderDrawer(); };
$("dsearch").oninput = () => renderDrawer();
$("home").onclick = () => { closeOverlay(); renderCorridor(); };
if (/Mac|iPhone|iPad/.test(navigator.platform)) $("kbdhint").textContent = "Cmd K";
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); drawer(undefined, "cheat"); return; }
  if (e.key === "Escape") {
    if (!$("ov").classList.contains("hide")) { closeOverlay(); return; }
    if ($("drawer").classList.contains("open")) { drawer(false); return; }
  }
  if (R.view === "corridor" && document.activeElement && document.activeElement.tagName !== "INPUT") {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const n = memsOf(S.seqSel).length + 1;
      S.selMem = (S.selMem + (e.key === "ArrowRight" ? 1 : -1) + n) % n; save(); renderCorridor(); e.preventDefault();
    }
    if (e.key === "Enter" && document.activeElement === document.body) enterSelected();
  }
});
(function motes() { let h = ""; for (let i = 0; i < 12; i++) h += '<div class="mote" style="left:' + (8 + (i * 37) % 84) + "%;top:" + (40 + (i * 23) % 50) + "%;animation-delay:" + (i * 1.3).toFixed(1) + 's"></div>'; $("motes").innerHTML = h; })();
window.SYNCLE = { S, R, openMemory, openGate, renderCorridor, setPhase };
renderCorridor();
