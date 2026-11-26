const DRL = { mode: null, q: [], qi: 0, stage: 0, s0: 0, typed: "", err: 0, tries: 0, t0: 0, ok: 0, keys: 0, ms: 0, res: [], msg: null, rush: null, raf: 0, lock: false };
const DSTAGE = ["GHOST", "FADE", "BLANK"];
const DDAYS = [1, 3, 7, 21, 60];
const DMIN = 6e4;
let DBANK = null;

function drS() { S.drl = S.drl || {}; const d = S.drl; d.cards = d.cards || {}; d.best = d.best || 0; d.runs = d.runs || []; d.vigDone = d.vigDone || []; d.set = d.set || "all"; return d; }
function drBank() {
  if (DBANK) return DBANK;
  const out = [], seen = new Set();
  [...MEMORIES].sort((a, b) => a.seq - b.seq).forEach((m) => {
    (DRILLS[m.id] || []).forEach((d, i) => {
      const cmd = d.sol ? (d.sol.length === 1 ? d.sol[0] : null) : d.out;
      if (!cmd || cmd.length > 140 || /\n/.test(cmd)) return;
      const k = cmd.toLowerCase().replace(/\s+/g, " ").trim(); if (seen.has(k)) return; seen.add(k);
      out.push({ id: m.id + ":" + i, cmd, q: d.q, m, d, seq: m.seq });
    });
  });
  DBANK = out; return out;
}
function drPool() { const s = drS().set; return drBank().filter((c) => s !== "ab" || c.seq >= 12); }
function drPeek(id) { return drS().cards[id] || { lv: 0, due: 0, n: 0, miss: 0 }; }
function drCard(id) { const c = drS().cards; return c[id] || (c[id] = { lv: 0, due: 0, n: 0, miss: 0 }); }
function drVigil() {
  let s = null; try { s = JSON.parse(localStorage.getItem("vigil.v1") || "null"); } catch (e) { s = null; }
  if (!s || !Array.isArray(s.miss) || typeof VIGIL_KIND === "undefined") return [];
  const by = {}, done = drS().vigDone, bank = drBank();
  s.miss.forEach((x) => {
    if (!x || x.kind !== "ps" || !x.ref || done.includes(x.id)) return;
    const k = VIGIL_KIND[x.ref.e]; if (!k || VIGIL_PS[k] == null) return;
    const id = "spo:" + VIGIL_PS[k]; if (!bank.some((c) => c.id === id)) return;
    (by[id] = by[id] || []).push(x.id);
  });
  return Object.keys(by).map((id) => ({ id, ids: by[id] }));
}
function drDueIds() { const now = Date.now(), ids = new Set(drVigil().map((v) => v.id)); drBank().forEach((c) => { const k = drS().cards[c.id]; if (k && k.n && k.due <= now) ids.add(c.id); }); return ids; }
function drBadge() { const n = drDueIds().size, b = $("drillDue"); if (!b) return; b.textContent = n || ""; b.classList.toggle("hide", !n); }

function drFlowQueue() {
  const pool = drPool(), bank = drBank(), now = Date.now(), ids = new Set(), q = [];
  const add = (c) => { if (c && !ids.has(c.id) && q.length < 4) { ids.add(c.id); q.push(c); } };
  drVigil().forEach((v) => add(bank.find((c) => c.id === v.id)));
  pool.filter((c) => { const k = drS().cards[c.id]; return k && k.n && k.due <= now; }).sort((a, b) => drPeek(a.id).due - drPeek(b.id).due).forEach(add);
  pool.filter((c) => !drPeek(c.id).n).forEach(add);
  pool.slice().sort((a, b) => drPeek(a.id).due - drPeek(b.id).due).forEach(add);
  return q;
}
function drFade(t) { const m = []; let p = 0; for (let i = 0; i < t.length; i++) { if (t[i] === " ") { p = 0; m.push(true); continue; } m.push(p < 2 || /[|;,(){}$]/.test(t[i])); p++; } return m; }
function drNorm(s) { return String(s).toLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/'/g, '"').replace(/\s+/g, " ").replace(/\s*([,|;=])\s*/g, "$1").trim(); }
function drBlankOK(c, v) {
  if (drNorm(v) === drNorm(c.cmd)) return true;
  try {
    const setup = c.d.setup || c.m.recall.setup, ctx = GRADER.makeCtx(setup, c.d.pre), res = PS.run(v, ctx);
    if (!res || res.error) return false;
    return !!GRADER.verdict(GRADER.drillCheck(c.d), setup, ctx, res, [v], c.d.pre);
  } catch (e) { return false; }
}
function drLine(target, typed, stage) {
  const mask = stage === 1 ? drFade(target) : null, n = Math.max(target.length, typed.length);
  let h = "";
  for (let i = 0; i < n; i++) {
    if (i === typed.length) h += '<i class="dcar"></i>';
    const t = target[i], y = typed[i];
    if (y != null) { const ok = t != null && y.toLowerCase() === t.toLowerCase(); h += '<span class="' + (ok ? "dk" : "dx") + '">' + (y === " " && !ok ? "␣" : esc(y)) + "</span>"; }
    else if (stage === 0) h += '<span class="dg">' + esc(t) + "</span>";
    else if (stage === 1) h += mask[i] ? '<span class="dg">' + esc(t) + "</span>" : '<span class="dh">' + (t === " " ? " " : "·") + "</span>";
  }
  if (typed.length >= n) h += '<i class="dcar"></i>';
  return h;
}
function drSrc(c, vig) { return (vig ? '<b class="dvig">FROM VIGIL · YOU GOT THIS WRONG THERE</b>' : "") + "<span>Sequence " + c.seq + " · " + esc(SEQUENCES[c.seq].name) + " · " + esc(c.m.name) + "</span>"; }

function openDrill() {
  closeOverlay(); if ($("drawer").classList.contains("open")) drawer(false);
  if (R.view === "desktop") $("desktop").classList.add("hide");
  R.view = "drill"; DRL.mode = null; drStopRush();
  $("corridor").classList.add("hide"); $("memory").classList.add("hide"); $("desktop").classList.add("hide"); $("drill").classList.remove("hide");
  $("crumb").textContent = "Drill · muscle memory";
  drLobby();
}
function drLeave() { drStopRush(); $("drill").classList.add("hide"); }
function drLobby() {
  DRL.mode = null; drBadge();
  const d = drS(), bank = drBank(), pool = drPool(), met = bank.filter((c) => drPeek(c.id).n).length, mast = bank.filter((c) => drPeek(c.id).lv >= 3).length, due = drDueIds().size, vig = drVigil().length;
  const runs = d.runs.slice(0, 5);
  $("drill").innerHTML = '<div class="dwrap"><div class="dlead"><small>DRILL · MUSCLE MEMORY</small><h2>Type it until your fingers know it</h2><p>Real commands from the corridor and the AB-650 sequences. No Tab, no paste: every character by hand.</p></div>' +
    '<div class="dstats">' + [["MET", met + " / " + bank.length], ["MASTERED", mast], ["DUE NOW", due], ["FROM VIGIL", vig], ["RUSH BEST", d.best]].map((x) => "<div><small>" + x[0] + "</small><b>" + x[1] + "</b></div>").join("") + "</div>" +
    '<div class="dset"><small>COMMANDS</small><button type="button" data-dset="all" class="' + (d.set === "all" ? "on" : "") + '">ALL SEQUENCES</button><button type="button" data-dset="ab" class="' + (d.set === "ab" ? "on" : "") + '">AB-650 ONLY</button><span class="mutetxt">' + pool.length + " commands</span></div>" +
    '<div class="dmodes"><div class="dmode"><small>FLOW · CALM</small><h3>Ghost, fade, blank</h3><p>Four commands. Each one three times in a row: over the full ghost, over a faded ghost, then from memory. Your blank answer runs in the lab engine, so any form PowerShell accepts counts.</p><div class="dflow"><span>GHOST</span><i></i><span>FADE</span><i></i><span>BLANK</span><i></i><span>BACK IN 1 · 3 · 7 · 21 DAYS</span></div><button class="go" type="button" id="drFlow">START FLOW</button></div>' +
    '<div class="dmode"><small>RUSH · ARCADE</small><h3>Beat the fuse</h3><p>Commands you have met, one after another against a burning fuse. Three lives. Clean lines build a combo. Every six commands the fuse gets shorter and the ghost fades a step.</p><div class="dflow"><span>LEVEL 1-2 GHOST</span><i></i><span>3-4 FADE</span><i></i><span>5+ NO GHOST</span></div><button class="go" type="button" id="drRush">START RUSH</button>' +
    (runs.length ? '<div class="druns">' + runs.map((r, i) => "<div><span>" + (i + 1) + "</span><b>" + r.score + "</b><em>level " + r.lvl + " · " + r.done + " commands</em></div>").join("") + "</div>" : "") + "</div></div></div>";
  $("drill").querySelectorAll("[data-dset]").forEach((b) => (b.onclick = () => { d.set = b.dataset.dset; save(); drLobby(); }));
  $("drFlow").onclick = drStartFlow; $("drRush").onclick = drStartRush;
}

function drStartFlow() {
  DRL.mode = "flow"; DRL.q = drFlowQueue(); DRL.qi = 0; DRL.res = []; DRL.ok = 0; DRL.keys = 0; DRL.ms = 0; DRL.vig = new Set(drVigil().map((v) => v.id));
  if (!DRL.q.length) { toast("No commands in this set yet."); return drLobby(); }
  drNextCard();
}
function drNextCard() {
  const c = DRL.q[DRL.qi]; if (!c) return drFlowEnd();
  const lv = drPeek(c.id).lv; DRL.s0 = DRL.stage = lv >= 2 ? 2 : lv; DRL.tries = 0; DRL.res[DRL.qi] = { c, clean: [], out: null };
  drRep();
}
function drRep() { DRL.typed = ""; DRL.err = 0; DRL.t0 = 0; DRL.msg = null; DRL.lock = false; drFlowView(); }
function drFlowView() {
  const c = DRL.q[DRL.qi], st = DRL.stage, blank = st === 2;
  const pills = DSTAGE.map((s, i) => '<span class="' + (i === st ? "on" : i < st ? "done" : i < DRL.s0 ? "skip" : "") + '">' + s + "</span>").join("<i></i>");
  const acc = DRL.keys ? Math.round(100 * DRL.ok / DRL.keys) : 100, wpm = DRL.ms ? Math.round(DRL.ok / 5 / (DRL.ms / DMIN)) : 0;
  $("drill").innerHTML = '<div class="dwrap dplay"><div class="dtop"><small>FLOW · COMMAND ' + (DRL.qi + 1) + " OF " + DRL.q.length + '</small><div class="dpills">' + pills + '</div><button class="go ghost" type="button" id="drQuit">QUIT</button></div>' +
    '<div class="dsrc">' + drSrc(c, DRL.vig.has(c.id)) + '</div><p class="dtask">' + esc(c.q) + "</p>" +
    (blank ? '<form class="dblank" id="drForm"><span class="dps">PS&gt;</span><input id="drIn" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Type the command from memory" value="' + esc(DRL.typed) + '"' + (DRL.lock ? " disabled" : "") + "></form>" :
      '<div class="dline" id="drLine"><span class="dps">PS&gt;</span><div class="dtxt">' + drLine(c.cmd, DRL.typed, st) + '</div><input id="drIn" class="dcap" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Type over the ghost"></div>') +
    '<div class="dmsg">' + (DRL.msg || (blank ? "From memory. Enter runs it in the lab engine." : st === 0 ? "Type over the ghost. It completes by itself when every character is right." : "Half the ghost is gone. Fill in the rest.")) + "</div>" +
    '<div class="dfoot"><span>ACCURACY <b>' + acc + '%</b></span><span>SPEED <b>' + wpm + ' WPM</b></span><span>THIS LINE <b>' + DRL.err + (DRL.err === 1 ? " slip" : " slips") + "</b></span></div></div>";
  $("drQuit").onclick = drLobby;
  const inp = $("drIn"); drBind(inp, blank);
  if (!DRL.lock) inp.focus();
  if (!blank) $("drLine").onclick = () => inp.focus();
}
function drBind(inp, blank) {
  inp.onpaste = (e) => e.preventDefault(); inp.ondrop = (e) => e.preventDefault();
  inp.onkeydown = (e) => { if (e.key === "Tab") { e.preventDefault(); DRL.msg = "No Tab in the drill: type every character, that is what your fingers remember."; drMsg(); } if (e.key === "Escape") { e.preventDefault(); drLobby(); } };
  if (blank) { $("drForm").onsubmit = (e) => { e.preventDefault(); drBlankSubmit(inp.value); }; inp.oninput = () => { if (!DRL.t0) DRL.t0 = performance.now(); DRL.typed = inp.value; }; return; }
  inp.oninput = () => drTypeInput(inp);
}
function drMsg() { const m = document.querySelector("#drill .dmsg"); if (m && DRL.msg) m.textContent = DRL.msg; }
function drTypeInput(inp) {
  const c = DRL.mode === "rush" ? DRL.rush.card : DRL.q[DRL.qi], t = c.cmd, v = inp.value, prev = DRL.typed;
  if (!DRL.t0) DRL.t0 = performance.now();
  if (v.length > prev.length) {
    for (let i = prev.length; i < v.length; i++) { DRL.keys++; const good = t[i] != null && v[i].toLowerCase() === t[i].toLowerCase() && v.slice(0, i).toLowerCase() === t.slice(0, i).toLowerCase(); if (good) DRL.ok++; else { DRL.err++; if (DRL.mode === "rush") drRushSlip(); } }
  }
  DRL.typed = v;
  if (DRL.mode === "rush") return drRushType(v, t);
  $("drill").querySelector(".dtxt").innerHTML = drLine(t, v, DRL.stage);
  const slips = $("drill").querySelectorAll(".dfoot b"); if (slips[2]) slips[2].textContent = DRL.err + (DRL.err === 1 ? " slip" : " slips");
  if (v.toLowerCase() === t.toLowerCase()) { DRL.ms += performance.now() - DRL.t0; drRepDone(DRL.err === 0); }
}
function drRepDone(clean) {
  const R0 = DRL.res[DRL.qi]; R0.clean.push(DSTAGE[DRL.stage] + (clean ? "" : "*"));
  snd2(clean);
  if (DRL.stage < 2) { if (clean || R0.retry === DRL.stage) { DRL.stage++; R0.retry = null; } else R0.retry = DRL.stage; return setTimeout(drRep, 260); }
}
function drBlankSubmit(v) {
  if (DRL.lock || !v.trim()) return;
  const c = DRL.q[DRL.qi], R0 = DRL.res[DRL.qi]; DRL.typed = v;
  const ok = drBlankOK(c, v); DRL.tries++;
  DRL.keys += v.length; if (ok) DRL.ok += v.length; if (DRL.t0) DRL.ms += performance.now() - DRL.t0; DRL.t0 = 0;
  if (ok) { R0.out = DRL.tries === 1 ? "clean" : "second"; DRL.lock = true; DRL.msg = DRL.tries === 1 ? "Right, from memory." : "Right on the second try."; snd2(true); drFlowView(); return setTimeout(drCardDone, 900); }
  snd2(false);
  if (DRL.tries < 2) { DRL.msg = "Not quite. One more try. It starts with " + c.cmd.split(" ")[0] + "."; DRL.err++; drFlowView(); const i = $("drIn"); i.select(); return; }
  R0.out = "miss"; DRL.lock = true; DRL.msg = "The command: " + c.cmd + ". It comes back next round, over the ghost again."; drFlowView();
  const b = document.createElement("button"); b.className = "go"; b.type = "button"; b.id = "drOn"; b.textContent = "NEXT"; b.onclick = drCardDone; $("drill").querySelector(".dmsg").after(b); b.focus();
}
function drCardDone() {
  const c = DRL.q[DRL.qi], R0 = DRL.res[DRL.qi], k = drCard(c.id), now = Date.now();
  k.n++;
  if (R0.out === "clean") { k.lv = Math.max(k.lv, 2) + 1; k.due = now + DDAYS[Math.min(k.lv - 3, DDAYS.length - 1)] * 864e5; if (DRL.vig.has(c.id)) { const v = drVigil().find((x) => x.id === c.id); if (v) drS().vigDone.push(...v.ids); } }
  else if (R0.out === "second") { k.lv = 2; k.due = now; }
  else { k.lv = 1; k.due = now; k.miss++; }
  R0.lv = k.lv; R0.due = k.due; save();
  DRL.qi++; drNextCard();
}
function drFlowEnd() {
  const clean = DRL.res.filter((r) => r.out === "clean").length, acc = DRL.keys ? Math.round(100 * DRL.ok / DRL.keys) : 100, wpm = DRL.ms ? Math.round(DRL.ok / 5 / (DRL.ms / DMIN)) : 0;
  if (clean) earn(clean * 3, "drill round");
  drBadge();
  const when = (r) => r.out === "clean" ? "back in " + DDAYS[Math.min(r.lv - 3, DDAYS.length - 1)] + (r.lv === 3 ? " day" : " days") : "next round";
  $("drill").innerHTML = '<div class="dwrap dplay"><div class="dtop"><small>FLOW · ROUND DONE</small></div><h2 class="dsum">' + clean + " of " + DRL.res.length + " from memory, first try</h2>" +
    '<div class="dfoot"><span>ACCURACY <b>' + acc + '%</b></span><span>SPEED <b>' + wpm + " WPM</b></span></div>" +
    '<div class="dres">' + DRL.res.map((r) => '<div class="' + r.out + '"><code>' + esc(r.c.cmd) + "</code><span>" + (r.out === "clean" ? "from memory" : r.out === "second" ? "second try" : "missed") + " · " + when(r) + "</span></div>").join("") + "</div>" +
    '<div class="drow"><button class="go" type="button" id="drAgain">ANOTHER ROUND</button><button class="go ghost" type="button" id="drBack">BACK</button><span class="mutetxt">Enter starts another round.</span></div></div>';
  $("drAgain").onclick = drStartFlow; $("drBack").onclick = drLobby; $("drAgain").focus();
}
function snd2(ok) { const l = $("drill").querySelector(".dline,.dblank"); if (!l) return; l.classList.remove("good", "bad"); void l.offsetWidth; l.classList.add(ok ? "good" : "bad"); }

function drStartRush() {
  const pool = drPool(), met = pool.filter((c) => drPeek(c.id).n);
  DRL.mode = "rush"; DRL.keys = 0; DRL.ok = 0;
  DRL.rush = { lives: 3, lvl: 1, score: 0, combo: 0, best: 0, done: 0, recent: [], pool: met.length >= 6 ? met : pool, few: met.length < 6, card: null, fuse: 0, start: 0, paused: 0, hold: false };
  drRushNext();
  DRL.raf = requestAnimationFrame(drRushTick);
}
function drRushStage() { const l = DRL.rush.lvl; return l <= 2 ? 0 : l <= 4 ? 1 : 2; }
function drRushNext() {
  const U = DRL.rush, opts = U.pool.filter((c) => !U.recent.includes(c.id)), list = opts.length ? opts : U.pool;
  U.card = list[Math.floor(Math.random() * list.length)]; U.recent = [U.card.id, ...U.recent].slice(0, Math.min(5, U.pool.length - 1));
  U.fuse = (3000 + U.card.cmd.length * 260) * Math.max(0.5, 1 - (U.lvl - 1) * 0.07); U.start = performance.now(); U.paused = 0; U.hold = false;
  DRL.typed = ""; DRL.err = 0; DRL.t0 = 0; DRL.stage = drRushStage();
  drRushView();
}
function drRushView(note) {
  const U = DRL.rush, c = U.card;
  $("drill").innerHTML = '<div class="dwrap dplay drush"><div class="dtop"><small>RUSH · LEVEL ' + U.lvl + '</small><div class="dlives">' + [0, 1, 2].map((i) => '<i class="' + (i < U.lives ? "on" : "") + '"></i>').join("") + '</div><div class="dscore"><small>SCORE</small><b id="drScore">' + U.score + '</b></div><div class="dscore"><small>COMBO</small><b id="drCombo">x' + U.combo + '</b></div><button class="go ghost" type="button" id="drQuit">END RUN</button></div>' +
    '<div class="dfuse"><i id="drFuse"></i></div><div class="dsrc">' + drSrc(c, false) + '</div><p class="dtask">' + esc(c.q) + "</p>" +
    '<div class="dline" id="drLine"><span class="dps">PS&gt;</span><div class="dtxt">' + drLine(c.cmd, DRL.typed, DRL.stage) + '</div><input id="drIn" class="dcap" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Type the command"></div>' +
    '<div class="dmsg">' + (note || (U.few ? "Rush uses every command in this set until you have met six in Flow." : DRL.stage === 2 ? "No ghost at this level. Wrong characters still show red." : "Clean lines build the combo. A slip resets it.")) + "</div></div>";
  $("drQuit").onclick = () => drRushOver(true);
  const inp = $("drIn"); drBind(inp, false); inp.focus(); $("drLine").onclick = () => inp.focus();
}
function drRushSlip() { const U = DRL.rush; U.combo = 0; const b = $("drCombo"); if (b) b.textContent = "x0"; snd2(false); }
function drRushType(v, t) {
  const U = DRL.rush; if (U.hold) return;
  $("drill").querySelector(".dtxt").innerHTML = drLine(t, v, DRL.stage);
  if (v.toLowerCase() !== t.toLowerCase()) return;
  const left = Math.max(0, 1 - (performance.now() - U.start - U.paused) / U.fuse);
  const pts = Math.round(t.length * U.lvl * (1 + U.combo * 0.1) + t.length * left);
  U.score += pts; if (DRL.err === 0) U.combo++; U.done++; U.best = Math.max(U.best, U.combo); U.paused = 0;
  const k = drCard(U.card.id); if (!k.n) { k.n = 1; k.lv = Math.max(k.lv, 1); k.due = Date.now(); save(); }
  let note = "+" + pts + (DRL.err === 0 ? " · clean" : "");
  if (U.done % 6 === 0) { U.lvl++; note = "Level " + U.lvl + (drRushStage() === 1 && U.lvl === 3 ? " · the ghost fades" : drRushStage() === 2 && U.lvl === 5 ? " · no more ghost" : " · shorter fuse"); }
  snd2(true); U.hold = true; U.paused = 0;
  setTimeout(() => { if (DRL.mode === "rush" && DRL.rush === U) { drRushNext(); drMsgSet(note); } }, 220);
}
function drMsgSet(t) { const m = $("drill").querySelector(".dmsg"); if (m) m.textContent = t; }
function drRushTick(now) {
  const U = DRL.rush; if (DRL.mode !== "rush" || !U || R.view !== "drill") return;
  if (U.lastTick && now - U.lastTick > 250) U.paused += now - U.lastTick;
  U.lastTick = now;
  if (!U.hold && !document.hidden) {
    const f = 1 - (now - U.start - U.paused) / U.fuse, el = $("drFuse");
    if (el) { el.style.width = Math.max(0, f * 100) + "%"; el.classList.toggle("low", f < 0.25); }
    if (f <= 0) {
      U.lives--; U.combo = 0; U.hold = true; const k = drS().cards[U.card.id]; if (k && k.n) { k.due = Date.now(); k.miss++; save(); }
      snd2(false); drMsgSet("Out of time. It was: " + U.card.cmd);
      const l = $("drill").querySelector(".dtxt"); if (l) l.innerHTML = drLine(U.card.cmd, "", 0);
      setTimeout(() => { if (DRL.rush !== U || DRL.mode !== "rush") return; if (U.lives <= 0) drRushOver(false); else drRushNext(); }, 1600);
    }
  }
  DRL.raf = requestAnimationFrame(drRushTick);
}
function drStopRush() { cancelAnimationFrame(DRL.raf); DRL.raf = 0; }
function drRushOver(quit) {
  const U = DRL.rush; drStopRush(); DRL.mode = "rushover";
  const d = drS(), rec = U.score > d.best;
  if (U.score > 0) { d.runs.push({ score: U.score, lvl: U.lvl, done: U.done, at: Date.now() }); d.runs.sort((a, b) => b.score - a.score); d.runs = d.runs.slice(0, 5); }
  if (rec) d.best = U.score; save();
  if (U.score > 0) earn(Math.min(25, Math.max(1, Math.floor(U.score / 250))), "rush run");
  const acc = DRL.keys ? Math.round(100 * DRL.ok / DRL.keys) : 100;
  $("drill").innerHTML = '<div class="dwrap dplay"><div class="dtop"><small>RUSH · ' + (quit ? "RUN ENDED" : "OUT OF LIVES") + "</small></div><h2 class=\"dsum\">" + U.score + (rec ? " · new best" : "") + "</h2>" +
    '<div class="dfoot"><span>LEVEL <b>' + U.lvl + '</b></span><span>COMMANDS <b>' + U.done + '</b></span><span>BEST COMBO <b>x' + U.best + '</b></span><span>ACCURACY <b>' + acc + "%</b></span></div>" +
    '<div class="drow"><button class="go" type="button" id="drAgain">RUN AGAIN</button><button class="go ghost" type="button" id="drBack">BACK</button><span class="mutetxt">Misses go back into Flow, due now.</span></div></div>';
  $("drAgain").onclick = drStartRush; $("drBack").onclick = drLobby; $("drAgain").focus();
}
function drHash() { if (location.hash.replace("#", "") === "drill") openDrill(); }
$("drillbtn").onclick = () => (R.view === "drill" ? (drLeave(), renderCorridor()) : openDrill());
window.addEventListener("hashchange", drHash);
document.addEventListener("keydown", (e) => { if (R.view === "drill" && !DRL.mode && e.key === "Enter" && document.activeElement === document.body) { e.preventDefault(); drStartFlow(); } });
drBadge(); drHash();
