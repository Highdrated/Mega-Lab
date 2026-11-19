const KEY = "syncle.v1";
const KEYS = [["Tab", "Complete: unique match, or the longest common part"], ["Tab Tab", "No progress? The second Tab lists every possibility"], ["Ctrl+Space", "Menu of completions, pick with arrows, Enter accepts"], ["Alt+=", "List possible completions without changing the line"], ["Right arrow / Ctrl+F / End", "At the end of the line: accept the grey suggestion from history"], ["Alt+F", "At the end of the line: accept the next word of the suggestion"], ["Up / Down, Ctrl+P / Ctrl+N", "Previous / next command in history"], ["Ctrl+R / Ctrl+S", "Search history backwards / forwards, Enter runs it"], ["Ctrl+A / Ctrl+E", "Start / end of the line"], ["Ctrl+B / Ctrl+F, Alt+B / Alt+F", "Back / forward a character, a word"], ["Ctrl+U / Ctrl+K", "Cut everything before / after the cursor"], ["Ctrl+W / Alt+D", "Cut the word before / after the cursor"], ["Ctrl+Y", "Paste what you cut"], ["Alt+.", "Insert the last argument of the previous command"], ["Ctrl+T", "Swap two characters"], ["Ctrl+_", "Undo"], ["Ctrl+C", "Cancel the line"], ["Ctrl+L", "Clear the screen"], ["Ctrl+D", "Delete character (on an empty line: exit pwsh)"]];
const DAYMS = 864e5;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const PHASES = [["brief", "BRIEF"], ["watch", "WATCH"], ["trace", "TRACE"], ["recall", "RECALL"], ["practice", "PRACTICE"], ["real", "FOR REAL"]];
const PASS_TXT = { brief: "What it is, why you need it, the traps", watch: "It runs on its own, step by step", trace: "Same idea, a few gaps to fill", recall: "Blank console, new ticket", practice: "Five or six more tickets, all different", real: "Read-only, on your own tenant" };
const EARN = { watch: 5, trace: 15, recall: 30, real: 20 };

let S = { v: 1, credits: 0, done: {}, journal: [], review: {}, gate: {}, drills: {}, seqSel: 0, selMem: null };
try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch (e) {}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

const R = { view: "corridor", mem: null, phase: "brief", ctx: null, setup: "none", hist: [], hpos: -1, hint: 0, watchStep: 0, busy: false, gate: false, gatePick: 0, lastRes: null, flagged: {} };

function doneOf(id) { return S.done[id] || (S.done[id] = {}); }
function synced(id) { return !!(S.done[id] && S.done[id].recall); }
function memsOf(seq) { return MEMORIES.filter((m) => m.seq === seq); }
function seqProgress(seq) { const ms = memsOf(seq); return [ms.filter((m) => synced(m.id)).length, ms.length]; }
function breaksEligible() { S.breaksDone = S.breaksDone || {}; return BREAKS.filter((b) => !S.breaksDone[b.id] && gateNeed(b).every((m) => synced(m.id))); }
function maybeBreak() {
  S.sinceBreak = (S.sinceBreak || 0) + 1;
  if (S.breakPending || S.sinceBreak < 3) return;
  const el = breaksEligible(); if (!el.length || Math.random() > 0.5) return;
  S.breakPending = el[Math.floor(Math.random() * el.length)].id; S.sinceBreak = 0;
}
function pendingBreak() { return S.breakPending ? BREAKS.find((b) => b.id === S.breakPending) || null : null; }
function renderBreakAlert() {
  const b = pendingBreak(), el = $("breakAlert");
  if (!b) { el.classList.add("hide"); return; }
  el.classList.remove("hide");
  el.innerHTML = '<small>' + esc(b.kind) + '</small><b>' + esc(b.name) + '</b><p>' + esc(b.story) + '</p><div class="row"><button class="go" type="button" id="takeBreak">TAKE IT</button><span class="mutetxt">It waits until you do.</span></div>';
  $("takeBreak").onclick = () => openGate(b);
}
const GTEXT = {
  takeover: { crumb: "Takeover · ", done: "Takeover complete", flow: [["Ticket", "what the user says"], ["Look", "Get- first"], ["Change", "only what was asked"], ["Verify", "read it back"]], flowT: "HALVARD & CO · HOW A TAKEOVER TICKET FLOWS", rules: "<h6>TAKEOVER RULES</h6>Look before you change. Read-only first, write scopes only for the tickets that need them. Changes to people who are not in a ticket count as collateral damage.", junie: "Five tickets, one tenant. Read each one twice: the ticket is what the user says, not always what the fix is." },
  incident: { crumb: "Incident · ", done: "Incident closed", flow: [["Signal", "what the user says"], ["Look", "sign-ins first"], ["Contain", "block, revoke, reset"], ["Clean + prove", "rules, recipients, evidence"]], flowT: "LIVE INCIDENT · THE ORDER THAT MATTERS", rules: "<h6>INCIDENT RULES</h6>Look first, then contain in the right order: block, revoke, reset. Touch only Thea. Exchange tickets need Connect-ExchangeOnline. Evidence goes to your Desktop, Belgian Excel style.", junie: "Breathe. Look first, then contain: block, revoke, reset. Then clean, then prove. Same order as Rowan." },
  break: { crumb: "Break · ", done: "Fixed", flow: [["Report", "what they say"], ["Diagnose", "Get- first"], ["Fix", "one change"], ["Verify", "read it back"]], flowT: "SOMETHING BROKE · DIAGNOSE BEFORE YOU FIX", rules: "<h6>BREAK RULES</h6>Something in the tenant changed and nobody told you. Find what, with a Get- command, before you change anything. Fix only that. Nothing is connected yet.", junie: "Don't guess. Look at the thing they complain about first: the answer is usually right there in one property." }
};
function gtext() { const g = curGate(); return g.text || GTEXT[g.type || "takeover"]; }
function gateFor(seq) { return GATES.find((g) => g.seq === seq) || null; }
function curGate() { return R.gateObj || GATE; }
function gateNeed(g) { return MEMORIES.filter(g.need); }
function gateOpen(g) { return gateNeed(g || GATE).every((m) => synced(m.id)); }
function heroImg(g) { if (!g) return ""; const f = g.type === "break" ? "desync" : ({ halvard: "gate-halvard", incident: "gate-voicemail", automate: "gate-handover", polder: "gate-polder" })[g.id] || "gate-halvard"; return "img/syncle/" + f + ".jpg"; }
function gateHero(g) { return ' style="background-image:url(' + heroImg(g) + ')"'; }
function setSeqBg(seq) { const src = "img/syncle/corridor.jpg"; const bgs = document.querySelectorAll("#corridor .bg"); const top = bgs[bgs.length - 1]; if (top.dataset.src === src) return; const n = top.cloneNode(); n.dataset.src = src; n.style.backgroundImage = "url(" + src + ")"; n.style.opacity = "0"; top.after(n); requestAnimationFrame(() => requestAnimationFrame(() => { n.style.opacity = "1"; })); setTimeout(() => { document.querySelectorAll("#corridor .bg").forEach((b) => { if (b !== n) b.remove(); }); }, 1300); }
const JUNIE = '<svg class="jsvg" viewBox="0 0 200 200" aria-hidden="true"><ellipse class="jsh" cx="100" cy="188" rx="34" ry="4.5" fill="rgba(31,95,196,.12)"/><g class="jw"><g class="st s-success jsp"><path d="M40 70l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#1f5fc4" opacity=".55"/><path d="M162 58l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#1f5fc4" opacity=".45"/><path d="M168 132l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="#ef9f8e" opacity=".7"/><path d="M30 138l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ef9f8e" opacity=".6"/></g><g class="st s-desync jsd"><path d="M36 74l9-4-3 10z" fill="#c2412f" opacity=".7"/><path d="M164 70l8 6-10 2z" fill="#c2412f" opacity=".6"/><path d="M170 140l-6 8-2-9z" fill="#c2412f" opacity=".55"/><path d="M28 132l9 2-6 6z" fill="#c2412f" opacity=".5"/></g><path d="M124 150c22 6 40-2 48-22-12 10-30 14-46 10z" fill="#f9fbfe" stroke="#cfd9e8" stroke-width="1.5"/><ellipse cx="100" cy="144" rx="31" ry="32" fill="#f9fbfe" stroke="#cfd9e8" stroke-width="1.5"/><ellipse cx="100" cy="150" rx="18" ry="20" fill="#f7f1ec"/><ellipse cx="84" cy="174" rx="9" ry="6" fill="#f9fbfe" stroke="#cfd9e8" stroke-width="1.5"/><ellipse cx="116" cy="174" rx="9" ry="6" fill="#f9fbfe" stroke="#cfd9e8" stroke-width="1.5"/><ellipse cx="70" cy="142" rx="7" ry="12" transform="rotate(25 70 142)" fill="#f9fbfe" stroke="#cfd9e8" stroke-width="1.5"/><ellipse class="st s-idle s-success s-desync" cx="130" cy="142" rx="7" ry="12" transform="rotate(-25 130 142)" fill="#f9fbfe" stroke="#cfd9e8" stroke-width="1.5"/><g class="st s-hint"><path d="M124 140c10-6 20-14 28-24" stroke="#cfd9e8" stroke-width="15" stroke-linecap="round" fill="none"/><path d="M124 140c10-6 20-14 28-24" stroke="#fbfcfe" stroke-width="12" stroke-linecap="round" fill="none"/><g class="jcr"><path d="M166 88l7 11-7 13-7-13z" fill="rgba(31,95,196,.18)" stroke="#1f5fc4" stroke-width="1.5"/><path d="M159 99h14" stroke="#1f5fc4" stroke-width="1" opacity=".6"/></g></g><g class="jgill jgl-l"><path d="M62 80Q46 68 30 58M58 92Q40 91 21 90M62 103Q46 113 31 123" stroke="#ef9f8e" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M50 71l-1-8M41 65l-2-7M50 71l-8 2M41 65l-8 1M46 91l-1-7M34 91l-1-7M46 91l-1 7M34 90l-1 7M50 109l-7-3M40 115l-7-2M50 109l2 7M40 115l1 7" stroke="#f4b4a6" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M62 80Q46 68 30 58M58 92Q40 91 21 90M62 103Q46 113 31 123" stroke="#fbd9d0" stroke-width="2" stroke-linecap="round" fill="none"/></g><g class="jgill jgl-r"><g transform="matrix(-1 0 0 1 200 0)"><path d="M62 80Q46 68 30 58M58 92Q40 91 21 90M62 103Q46 113 31 123" stroke="#ef9f8e" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M50 71l-1-8M41 65l-2-7M50 71l-8 2M41 65l-8 1M46 91l-1-7M34 91l-1-7M46 91l-1 7M34 90l-1 7M50 109l-7-3M40 115l-7-2M50 109l2 7M40 115l1 7" stroke="#f4b4a6" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M62 80Q46 68 30 58M58 92Q40 91 21 90M62 103Q46 113 31 123" stroke="#fbd9d0" stroke-width="2" stroke-linecap="round" fill="none"/></g></g><ellipse cx="100" cy="92" rx="47" ry="39" fill="#f9fbfe" stroke="#cfd9e8" stroke-width="1.5"/><path d="M88 62l8-4 8 4v9l-8 4-8-4zM104 66l8-4 8 4v9l-8 4-8-4z" fill="none" stroke="rgba(31,95,196,.12)" stroke-width="1"/><ellipse cx="73" cy="104" rx="7" ry="4" fill="#f6b9ad" opacity=".55"/><ellipse cx="127" cy="104" rx="7" ry="4" fill="#f6b9ad" opacity=".55"/><g class="st s-idle s-hint s-desync jeyes"><circle cx="82" cy="92" r="6" fill="#1d232b"/><circle cx="118" cy="92" r="6" fill="#1d232b"/><circle cx="84.5" cy="89.5" r="2" fill="#fff"/><circle cx="120.5" cy="89.5" r="2" fill="#fff"/></g><g class="st s-success"><path d="M75 94q7-9 14 0M111 94q7-9 14 0" stroke="#1d232b" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M90 103q10 13 20 0z" fill="#e98c7c" stroke="#1d232b" stroke-width="2" stroke-linejoin="round"/></g><path class="st s-idle s-hint" d="M93 104q7 6 14 0" stroke="#1d232b" stroke-width="2.2" stroke-linecap="round" fill="none"/><g class="st s-desync"><path d="M75 85l12-5M125 85l-12-5" stroke="#1d232b" stroke-width="2.2" stroke-linecap="round"/><path d="M93 107q3.5-4 7 0t7 0" stroke="#1d232b" stroke-width="2.2" stroke-linecap="round" fill="none"/></g></g></svg>';
function drillKey(m, i) { return m.id + ":" + i; }
function drillsDone(m) { return (DRILLS[m.id] || []).filter((_, i) => S.drills[drillKey(m, i)]).length; }
function syncPct() { const nd = Object.values(DRILLS).reduce((a, x) => a + x.length, 0); const allT = GATES.flatMap((g) => g.tickets); const total = MEMORIES.length * 3 + allT.length + nd; const n = MEMORIES.filter((m) => synced(m.id)).length * 3 + allT.filter((t) => S.gate[t.id]).length + Object.keys(S.drills).length; return Math.min(100, Math.round(n / total * 100)); }
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
  $("corridor").classList.remove("hide"); $("memory").classList.add("hide"); $("desktop").classList.add("hide");
  renderBreakAlert();
  $("crumb").textContent = "Memory corridor · PowerShell";
  const seq = S.seqSel;
  const sq = SEQUENCES[seq];
  setSeqBg(seq);
  $("stEyebrow").textContent = "SEQUENCE " + seq + " · " + (seq <= 4 ? "DAILY" : seq <= 6 ? "BULK" : seq === 7 ? "INVESTIGATE" : seq === 8 ? "RESPOND" : seq === 9 ? "AUTOMATE" : "REAL WORLD");
  $("stName").textContent = sq.name; $("stBlurb").textContent = sq.blurb;
  let h = "<h4>THE CURVE</h4>";
  const tiers = { 0: "DAILY · ONE USER AT A TIME", 5: "BULK · MANY USERS, SAFELY", 7: "INVESTIGATE", 8: "RESPOND", 9: "AUTOMATE", 10: "REAL WORLD" };
  SEQUENCES.forEach((q) => {
    if (tiers[q.id]) h += '<div class="tier">' + tiers[q.id] + "</div>";
    const pr = q.open ? seqProgress(q.id) : null;
    h += '<button class="seqb' + (q.id === seq ? " on" : "") + '" type="button" data-seq="' + q.id + '"' + (q.open ? "" : " disabled") + '><span class="k">' + q.id + "</span>" + esc(q.name) + '<span class="s">' + (pr ? pr[0] + "/" + pr[1] : "soon") + "</span></button>";
  });
  $("seqs").innerHTML = h;
  $("seqs").querySelectorAll("[data-seq]").forEach((b) => b.onclick = () => { S.seqSel = +b.dataset.seq; S.selMem = null; save(); renderCorridor(); });
  const onb = $("seqs").querySelector(".seqb.on"); if (onb && window.innerWidth <= 820) $("seqs").scrollLeft = onb.offsetLeft - 8;

  const ms = memsOf(seq);
  const items = ms.map((m) => ({ kind: "mem", m }));
  const sg = gateFor(seq);
  items.push(sg ? { kind: "gate", g: sg } : { kind: "next", to: seq + 1 });
  const pts = items.map((_, i) => POS[i]);
  let firstOpen = ms.findIndex((m) => !synced(m.id));
  if (firstOpen < 0) firstOpen = ms.length;
  if (S.selMem === null || S.selMem === undefined || !items[S.selMem]) S.selMem = Math.min(firstOpen, items.length - 1);
  $("pdone").setAttribute("points", pts.slice(0, firstOpen + 1).map((p) => p[0] + "," + p[1]).join(" "));
  $("pahead").setAttribute("points", pts.slice(firstOpen).map((p) => p[0] + "," + p[1]).join(" "));
  const last = pts[pts.length - 1];
  const gb = $("gatebg"); gb.classList.toggle("hide", !sg); gb.style.backgroundImage = sg ? "url(" + heroImg(sg) + ")" : ""; gb.style.left = last[0] + "%"; gb.style.top = last[1] + "%";
  let nh = "";
  items.forEach((it, i) => {
    const [x, y, s] = pts[i];
    let st, name, tag, due = false;
    if (it.kind === "mem") { st = synced(it.m.id) ? "done" : i === firstOpen ? "current" : "ahead"; name = it.m.name; tag = it.m.tag; due = dueReview(it.m.id); }
    else if (it.kind === "next") { const nq = SEQUENCES[it.to]; st = nq && nq.open && seqProgress(seq)[0] === ms.length ? "gate" : "ahead"; name = nq ? nq.name : "More soon"; tag = nq && nq.open ? "NEXT SEQUENCE" : "COMING SOON"; }
    else { const g = it.g; const open = gateOpen(g); const done = g.tickets.every((t) => S.gate[t.id]); st = done ? "done" : open ? "gate" : "ahead"; name = g.name; const kw = { takeover: "TAKEOVER", incident: "LIVE INCIDENT", capstone: "CAPSTONE" }[g.type] || "TAKEOVER"; tag = open ? kw : kw + " · LOCKED"; }
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
  const w = Math.round(46 * s * (big ? 1.25 : 1)), h = Math.round(w * 1.6);
  const col = { done: "#1f5fc4", current: "#1f5fc4", ahead: "#7d8a9c", gate: "#4f74b3" }[st];
  const f = { done: [.5, .28, .4, .62, .36, .5], current: [.78, .45, .62, .9, .55, .7], ahead: [.2, .08, .14, .28, .12, .2], gate: [.85, .55, .7, .95, .65, .8] }[st];
  const glow = st === "current" ? "drop-shadow(0 0 12px rgba(31,95,196,.55))" : st === "gate" ? "drop-shadow(0 0 16px rgba(255,255,255,.95)) drop-shadow(0 0 4px rgba(17,22,29,.25))" : st === "done" ? "drop-shadow(0 0 6px rgba(31,95,196,.32))" : "drop-shadow(0 2px 4px rgba(17,22,29,.08))";
  const lit = st !== "ahead";
  const label = st === "done" ? "synced" : st === "current" ? "next memory" : st === "gate" ? "open" : "ahead";
  const id = "cr" + i;
  const fac = [["20,0 1,24 13,28", f[0]], ["20,0 13,28 27,28", f[1]], ["20,0 27,28 39,24", f[2]], ["1,24 13,28 20,64", f[3]], ["13,28 27,28 20,64", f[4]], ["27,28 39,24 20,64", f[5]]];
  return '<button class="node' + (sel ? " sel" : "") + " st-" + st + '" type="button" data-i="' + i + '" style="left:' + x + "%;top:" + y + '%" aria-label="' + esc(name + ", " + label) + '">' +
    '<div class="mem" style="width:' + Math.round(w * 2.2) + "px;height:" + Math.round(h * 1.28) + "px;color:" + col + '">' +
    (due ? '<span class="due">REVIEW</span>' : "") +
    '<svg class="plinth" viewBox="0 0 100 34" aria-hidden="true" style="width:' + Math.round(w * 1.9) + "px;height:" + Math.round(w * .65) + 'px">' +
    (lit ? '<ellipse cx="50" cy="15" rx="44" ry="13" fill="currentColor" opacity=".12"/>' : "") +
    '<polygon points="8,15 50,24 50,30 8,21" fill="#dfe5ee"/><polygon points="92,15 50,24 50,30 92,21" fill="#cdd5e1"/><polygon points="50,6 92,15 50,24 8,15" fill="#f8fafc" stroke="currentColor" stroke-opacity="' + (lit ? .55 : .25) + '" stroke-width=".8"/>' +
    '<polygon points="50,10 74,15 50,20 26,15" fill="currentColor" opacity="' + (lit ? .18 : .06) + '"/>' +
    (st === "current" || st === "gate" ? '<ellipse class="orb" cx="50" cy="15" rx="47" ry="12" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="8 7" opacity=".6" style="animation-duration:' + (16 + i * 3) + 's"/>' : "") + "</svg>" +
    (lit ? '<div class="beam" style="width:' + Math.round(w * .5) + "px;height:" + Math.round(h * .95) + 'px"></div>' : "") +
    (st === "current" ? '<div class="halo"></div><div class="spark" style="left:20%;top:40%"></div><div class="spark" style="left:78%;top:30%;animation-delay:1.7s"></div><div class="spark" style="left:55%;top:70%;animation-delay:3.3s"></div>' : "") +
    '<div class="bob" style="animation-delay:-' + (i * .9).toFixed(1) + 's"><svg class="turn" viewBox="0 0 40 64" aria-hidden="true" style="width:' + w + "px;height:" + h + "px;filter:" + glow + ";animation-duration:" + (9 + (i % 4) * 2) + "s;animation-delay:-" + (i * 1.7).toFixed(1) + 's">' +
    '<defs><clipPath id="' + id + '"><polygon points="20,0 1,24 20,64 39,24"/></clipPath><linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>' +
    '<polygon points="20,0 1,24 20,64 39,24" fill="#ffffff" fill-opacity="' + (lit ? .55 : .7) + '"/>' +
    fac.map(([p, o]) => '<polygon points="' + p + '" fill="currentColor" fill-opacity="' + o + '"/>').join("") +
    '<path d="M1 24L13 28L27 28L39 24M13 28L20 0L27 28M13 28L20 64L27 28" fill="none" stroke="#ffffff" stroke-width=".7" stroke-opacity=".85"/>' +
    '<polygon points="20,0 1,24 20,64 39,24" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>' +
    '<polygon points="20,3 8,22 14,25" fill="#ffffff" fill-opacity=".55"/>' +
    (lit ? '<ellipse class="core" cx="20" cy="30" rx="5" ry="7" fill="#ffffff"/>' : "") +
    '<g clip-path="url(#' + id + ')"><rect class="sheen" x="-30" y="-10" width="14" height="90" fill="url(#' + id + 'g)" transform="rotate(18 20 32)" style="animation-delay:-' + (i * 1.3).toFixed(1) + 's"/></g>' +
    "</svg></div></div>" +
    '<div class="nlabel" style="font-size:' + Math.max(11, Math.round(14 * s)) + 'px"><b>' + esc(name) + "</b><small>" + esc(tag) + "</small></div></button>";
}

function renderDetail(it, ms) {
  const d = $("detail");
  if (it.kind === "next") {
    const cur = SEQUENCES[S.seqSel], nq = SEQUENCES[it.to];
    const [n, t] = seqProgress(S.seqSel);
    if (!nq || !nq.open) { d.innerHTML = '<div class="l"><span class="eyebrow">COMING SOON</span><h3>' + esc(nq ? nq.name : "More") + "</h3><p>" + esc(nq ? nq.blurb : "") + '</p></div><div class="r">' + mixPanel() + "</div>"; bindMix(); return; }
    d.innerHTML = '<div class="l"><span class="eyebrow">NEXT SEQUENCE</span><h3>' + esc(nq.name) + "</h3><p>" + esc(nq.blurb) + '</p><p class="mutetxt">' + (n === t ? esc(cur.name) + " is fully synced. Step through." : n + " of " + t + " " + esc(cur.name) + " memories synced. You can look ahead, but the next corridor assumes these.") + '</p></div><div class="r"><div class="row"><button class="go" type="button" id="goNext">ENTER ' + esc(nq.name.toUpperCase()) + "</button></div>" + mixPanel() + "</div>";
    $("goNext").onclick = () => { S.seqSel = it.to; S.selMem = null; save(); renderCorridor(); };
    bindMix();
    return;
  }
  if (it.kind === "gate") {
    const g = it.g, need = gateNeed(g), open = gateOpen(g);
    const done = g.tickets.filter((t) => S.gate[t.id]).length;
    d.innerHTML = '<div class="l"><span class="eyebrow">' + esc(g.kind) + '</span><h3>' + esc(g.name) + "</h3><p>" + esc(g.story) + '</p><p class="mutetxt">' + done + " of " + g.tickets.length + " tickets closed</p></div>" +
      '<div class="r"><div class="gatehero"' + gateHero(g) + ' role="img" aria-label="' + esc(g.name) + '"></div><div class="row"><button class="go" type="button" id="goGate"' + (open ? "" : " disabled") + ">" + (open ? ({ takeover: "ENTER THE TENANT", incident: "TAKE THE CALL", capstone: "BUILD THE TOOL" }[g.type] || "ENTER") : "SYNC ALL " + need.length + " MEMORIES TO OPEN") + "</button>" + (open ? "" : '<span class="mutetxt">' + need.filter((m) => synced(m.id)).length + " / " + need.length + " synced</span>") + "</div></div>";
    if (open) $("goGate").onclick = () => openGate(g);
    return;
  }
  const m = it.m, dn = S.done[m.id] || {};
  d.innerHTML = '<div class="l"><span class="eyebrow">' + esc(m.tag) + " · " + (synced(m.id) ? "SYNCED" : "NOT SYNCED") + (dueReview(m.id) ? " · REVIEW DUE" : "") + "</span><h3>" + esc(m.name) + "</h3><p>" + esc(m.summary) + '</p><div class="codebox">' + esc(m.cheat[0][0]) + "</div></div>" +
    '<div class="r"><span class="mutetxt" style="letter-spacing:.24em;font-size:11px">ONE MEMORY · SIX PASSES · ' + (DRILLS[m.id] || []).length + ' PRACTICE TICKETS · ' + drillsDone(m) + ' DONE</span><div class="passes">' +
    PHASES.map(([k, l], i) => '<div class="pass' + (dn[k] ? " done" : "") + '"><b>' + (i + 1) + " · " + l + "</b>" + PASS_TXT[k] + "</div>").join("") +
    '</div><div class="row"><button class="go" type="button" id="goMem">' + (synced(m.id) ? (dueReview(m.id) ? "REVIEW THIS MEMORY" : "REPLAY MEMORY") : "ENTER MEMORY") + '</button>' + (synced(m.id) ? '<button class="go ghost" type="button" id="goPrac">PRACTICE ONLY</button>' : '<span class="mutetxt">Double-click a crystal to enter it</span>') + "</div>" + mixPanel() + "</div>";
  $("goMem").onclick = () => enterSelected();
  if (synced(m.id)) $("goPrac").onclick = () => { openMemory(m); setPhase("practice"); };
  bindMix();
}

function mixPool() { const out = []; MEMORIES.filter((m) => synced(m.id)).forEach((m) => (DRILLS[m.id] || []).forEach((d, i) => out.push({ m, d, i }))); return out; }
function mixPanel() { const n = mixPool().length; return '<div class="minicard" style="display:flex;flex-wrap:wrap;align-items:center;gap:14px;justify-content:space-between"><div><h6>DAILY PRACTICE MIX</h6>' + (n ? "10 random tickets from every memory you have synced (" + n + " in the pool). Builds fluency, not just recognition." : "Sync your first memory to unlock the mix.") + '</div><button class="go blue" type="button" id="goMix"' + (n ? "" : " disabled") + ">START MIX</button></div>"; }
function bindMix() { const b = $("goMix"); if (b && !b.disabled) b.onclick = () => startMix(); }
function startMix() {
  const pool = mixPool(); if (!pool.length) return;
  const pick = []; const used = new Set();
  const undone = pool.filter((p) => !S.drills[drillKey(p.m, p.i)]);
  const src = undone.length >= 10 ? undone : pool;
  while (pick.length < Math.min(10, src.length)) { const k = Math.floor(Math.random() * src.length); if (!used.has(k)) { used.add(k); pick.push(src[k]); } }
  R.mix = pick; R.pidx = 0; R.mixScore = 0;
  openMemory(pick[0].m, true); setPhase("practice");
}
function enterSelected() {
  const ms = memsOf(S.seqSel);
  if (S.selMem < ms.length) openMemory(ms[S.selMem]);
  else if (gateFor(S.seqSel)) { if (gateOpen(gateFor(S.seqSel))) openGate(gateFor(S.seqSel)); }
  else if (SEQUENCES[S.seqSel + 1] && SEQUENCES[S.seqSel + 1].open) { S.seqSel = S.seqSel + 1; S.selMem = null; save(); renderCorridor(); }
}

function resetConsole(setup, pre) {
  R.setup = setup; R.pre = pre || null; R.sessHist = [];
  R.ctx = GRADER.makeCtx(setup, pre);
  $("tout").innerHTML = "";
  tline(setup === "none" ? "Fresh pwsh window. Nothing is connected yet." : "Lab session. " + GRADER.describe(setup), "n");
  tstate();
}
function promptStr() { return "PS " + (R.ctx && R.ctx.cwd ? R.ctx.cwd : "/Users/kaatje") + ">"; }
function setPrompt() { const t = $("tprompt"); if (t) t.textContent = promptStr(); }
function tstate() {
  setPrompt(); const c = R.ctx; $("tstate").textContent = (c.mg ? "GRAPH · " + c.mg.scopes.filter((s) => /\./.test(s) && s !== "User.Read").join(", ") : "NOT CONNECTED") + (c.exo ? " · EXCHANGE" : ""); }
function hl(s) {
  let out = "", cmdNext = true, m;
  const re = /(\s+)|('(?:[^']|'')*'?|"(?:[^"`]|`.)*"?)|(\$(?:\{[^}]*\}?|[\w:?]+))|(-(?:eq|ne|gt|ge|lt|le|like|notlike|match|notmatch|contains|notcontains|in|notin|and|or|not|is|isnot|replace|split|join)\b)|(-[A-Za-z][\w]*:?)|(\d+(?:\.\d+)?(?:[kmgt]b)?\b)|(#.*$)|([|;({})\[\],=@+*/%<>!.])|([^\s|;({})\[\],='"$#]+)/gi;
  while ((m = re.exec(s)) !== null) {
    const t = m[0];
    if (m[1]) { out += t; continue; }
    let c = "";
    if (m[2]) c = "hs"; else if (m[3]) c = "hv"; else if (m[4]) c = "ho"; else if (m[5]) c = "hp"; else if (m[6]) c = "hn"; else if (m[7]) c = "hm";
    else if (m[8]) c = "ho";
    else if (m[9]) c = cmdNext ? "hc2" : "";
    out += c ? '<b class="' + c + '">' + esc(t) + "</b>" : esc(t);
    if (m[8]) cmdNext = /[|;({]/.test(t) || (t === "=" ) ; else if (!m[1]) cmdNext = false;
  }
  return out;
}
function scrollCon() { const s = $("tscroll"); if (s) s.scrollTop = s.scrollHeight; }
function tline(t, cls) { const o = $("tout"); const d = document.createElement("div"); if (cls) d.className = cls; d.textContent = t; o.appendChild(d); scrollCon(); }
function tcols() { const w = $("tout").clientWidth - 32; return Math.max(60, Math.floor(w / 8.1)); }

function exec(src, opts) {
  opts = opts || {};
  const o = $("tout");
  const echo = document.createElement("div");
  echo.className = "echo";
  echo.innerHTML = '<span class="p">' + esc(promptStr()) + ' </span><span class="c">' + hl(src) + "</span>";
  o.appendChild(echo);
  const res = PS.run(src, R.ctx);
  for (const h of res.host) { if (h.clear) { o.innerHTML = ""; continue; } if (h.err) tline(h.err, "e"); else if (h.warn) tline(h.warn, "w"); else if (h.text !== undefined) tline(h.text, h.color ? "hc" : "h"); }
  const txt = PS.formatOut(res.out, tcols());
  if (txt && txt.trim()) tline(txt.replace(/^\n+/, "").replace(/\s+$/, "") + "\n", "");
  if (res.error) tline(res.error.text ? res.error.text() : String(res.error.message), "e");
  scrollCon();
  R.lastRes = res;
  if (R.ctx.ui && !R.ctx.ui.done) { const u = R.ctx.ui; u.done = true; openDesktop(); openCode(u.open); }
  tstate();
  lastRun(res, src);
  return res;
}
function lastRun(res, src) {
  const el = $("lastrun"); if (!el) return;
  el.textContent = res.error ? "last run: error" : "last run: " + res.out.length + (res.out.length === 1 ? " object" : " objects");
}

function errHelp(text) { for (const [re, msg] of ERR_HELP) if (re.test(text)) return msg; return null; }

function openMemory(m, keepMix) {
  closeOverlay();
  if (!keepMix) R.mix = null;
  R.view = "memory"; R.gate = false; R.mem = m; R.hint = 0; R.watchStep = 0; R.pidx = keepMix ? R.pidx : firstOpenDrill(m);
  $("corridor").classList.add("hide"); $("memory").classList.remove("hide"); $("desktop").classList.add("hide");
  $("crumb").textContent = SEQUENCES[m.seq].name + " · " + m.name;
  const dn = doneOf(m.id);
  R.phase = !dn.brief ? "brief" : !dn.watch ? "watch" : !dn.trace ? "trace" : !dn.recall ? "recall" : dueReview(m.id) ? "recall" : "brief";
  flowband(m.brief.flow, "HOW " + m.name.toUpperCase() + " WORKS");
  setPhase(R.phase);
  $("cmd").focus();
}

function firstOpenDrill(m) { const ds = DRILLS[m.id] || []; const i = ds.findIndex((_, k) => !S.drills[drillKey(m, k)]); return i < 0 ? 0 : i; }
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
  const setup = p === "trace" ? (m.trace.setup || m.setup) : p === "recall" ? m.recall.setup : p === "real" ? "none" : p === "practice" ? null : m.setup;
  if (setup) resetConsole(setup, p === "recall" ? m.recall.pre : p === "trace" ? m.trace.pre : null);
  if (p === "brief") renderBrief(m);
  if (p === "watch") renderWatch(m);
  if (p === "trace") renderTrace(m);
  if (p === "recall") renderRecall(m);
  if (p === "practice") renderPractice();
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
  const tpl = esc(t.tpl).replace(/\[\[([^\[\]]*)\]\]/g, (_, a) => '<input class="gap" data-g="' + (gi++) + '" style="--w:' + Math.max(90, a.length * 9 + 26) + 'px" aria-label="Gap ' + gi + '" autocomplete="off" spellcheck="false">');
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
  } else desync(m, cmd, res, t.wrong, t.check);
}

function renderRecall(m) {
  const due = dueReview(m.id) && synced(m.id);
  $("pbody").innerHTML = (due ? '<span class="badge ok">REVIEW · KEEP IT IN MEMORY</span>' : "") + '<h5>New ticket</h5><p class="ask">' + esc(m.recall.ask) + "</p>" +
    '<p class="mutetxt">Type it in the console. Each command runs for real, and Junie checks the result. Explore freely: Get-Command, Get-Help and Get-Member all work.</p>' +
    '<div class="minicard" style="border-style:dashed"><h6>STARTING STATE</h6>' + esc(GRADER.describe(m.recall.setup)) + "</div>";
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
  const ok = GRADER.verdict(m.recall.check, m.recall.setup, R.ctx, res, R.sessHist, m.recall.pre);
  showCompare(ok ? "" : cmpHTML(m.recall.check, m.recall.setup, m.recall.pre, R.sessHist[R.sessHist.length - 1], res));
  if (ok) {
    const first = !doneOf(m.id).recall;
    doneOf(m.id).recall = true;
    if (!first) reviewPassed(m.id);
    if (first) maybeBreak();
    save();
    earn(first ? Math.max(8, EARN.recall - R.hint * 6) : 10, (first ? "synced " : "reviewed ") + m.name);
    const nxt = nextMemory(m);
    synced_overlay("Synchronized", first ? "Memory " + m.name + " is yours. Now practice it: " + (DRILLS[m.id] || []).length + " different tickets, so it sticks." : "Review done. This one comes back later, spaced further apart.", () => setPhase("practice"), "PRACTICE", nxt ? () => openMemory(nxt) : null);
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

function curDrill() {
  if (R.mix) { const p = R.mix[R.pidx]; return p ? { m: p.m, d: p.d, i: p.i } : null; }
  const ds = DRILLS[R.mem.id] || []; return ds[R.pidx] ? { m: R.mem, d: ds[R.pidx], i: R.pidx } : null;
}
function renderPractice() {
  const cd = curDrill();
  if (!cd) { $("pbody").innerHTML = "<p>No practice tickets for this memory yet.</p>"; return; }
  const { m, d, i } = cd;
  if (R.mix && R.mem !== m) { R.mem = m; $("crumb").textContent = "Practice mix · " + m.name; flowband(m.brief.flow, "HOW " + m.name.toUpperCase() + " WORKS"); sidecard(m); }
  const setup = d.setup || m.recall.setup;
  resetConsole(setup, d.pre);
  const list = R.mix ? R.mix.map((p) => ({ done: !!S.drills[drillKey(p.m, p.i)], label: p.m.name })) : (DRILLS[m.id] || []).map((_, k) => ({ done: !!S.drills[drillKey(m, k)], label: "#" + (k + 1) }));
  const done = !!S.drills[drillKey(m, i)];
  $("pbody").innerHTML = '<div class="steps">' + list.map((x, k) => "<i" + (x.done ? ' class="on"' : "") + (k === R.pidx ? ' style="outline:1px solid var(--ink);outline-offset:2px"' : "") + "></i>").join("") + "</div>" +
    "<h5>" + (R.mix ? "Practice mix · " + (R.pidx + 1) + " of " + R.mix.length + " · " + esc(m.name) : "Practice ticket " + (R.pidx + 1) + " of " + list.length) + (done ? ' · <span style="color:var(--blue)">DONE BEFORE</span>' : "") + "</h5>" +
    '<p class="ask">' + esc(d.q) + "</p>" +
    '<div class="minicard" style="border-style:dashed"><h6>STARTING STATE</h6>' + esc(GRADER.describe(setup)) + (d.pre ? " Something already happened in this tenant today (see the ticket)." : "") + "</div>" +
    '<div class="row"><button class="go ghost" type="button" id="pPrev"' + (R.pidx === 0 ? " disabled" : "") + '>PREVIOUS</button><button class="go ghost" type="button" id="pNext">' + (R.pidx >= list.length - 1 ? (R.mix ? "FINISH MIX" : "BACK TO CORRIDOR") : "SKIP / NEXT") + "</button></div>" +
    '<p class="mutetxt">No gaps, no multiple choice. Junie has one hint and then the answer, which goes to your journal.</p>';
  $("pPrev").onclick = () => { if (R.pidx > 0) { R.pidx--; R.hint = 0; renderPractice(); junie(); } };
  $("pNext").onclick = () => advanceDrill();
  $("cmd").placeholder = "Practice ticket. Type it from memory.";
  $("cmd").focus();
}
function advanceDrill() {
  const n = R.mix ? R.mix.length : (DRILLS[R.mem.id] || []).length;
  if (R.pidx >= n - 1) {
    if (R.mix) { const sc = R.mixScore; R.mix = null; synced_overlay("Mix complete", sc + " of " + n + " tickets solved. Mistakes went to the journal and come back tomorrow.", () => renderCorridor(), "BACK TO THE CORRIDOR"); }
    else renderCorridor();
    return;
  }
  R.pidx++; R.hint = 0; renderPractice(); junie();
}
function checkPractice(res) {
  const cd = curDrill(); if (!cd) return;
  const { m, d, i } = cd;
  const setup = d.setup || m.recall.setup;
  if (res.error) {
    $("term").classList.remove("flash"); void $("term").offsetWidth; $("term").classList.add("flash");
    const help = errHelp(res.error.text ? res.error.text() : "");
    R.jlineOverride = help ? help : "Read the red text slowly: the first line usually names the problem."; R.jstate = "desync"; junie();
  }
  const ok = GRADER.verdict(GRADER.drillCheck(d), setup, R.ctx, res, R.sessHist, d.pre);
  showCompare(ok ? "" : cmpHTML(GRADER.drillCheck(d), setup, d.pre, R.sessHist[R.sessHist.length - 1], res));
  if (!ok) return;
  const k = drillKey(m, i), first = !S.drills[k];
  S.drills[k] = true; if (R.mix) R.mixScore++;
  save();
  if (first) earn(R.hint ? 4 : 8, "practice: " + m.name); else toast("Solved again");
  R.jlineOverride = "Synchronized. Next ticket in a moment."; R.jstate = "ok"; junie();
  clearTimeout(R.advT); R.advT = setTimeout(() => { if (R.phase === "practice") advanceDrill(); }, 1400);
}
function sidecard(m) {
  if (R.gate) { $("sidecard").innerHTML = gtext().rules; return; }
  $("sidecard").innerHTML = "<h6>IN THE CHEAT SHEET</h6>" + m.cheat.map(([c, d]) => '<div style="margin:6px 0"><code style="font-size:12px;word-break:break-word">' + esc(c) + '</code><div class="mutetxt" style="font-size:12px">' + esc(d) + "</div></div>").join("") + '<button class="hbtn" type="button" id="openCheat" style="margin-top:8px">OPEN FULL SHEET</button>';
  $("openCheat").onclick = () => drawer(true);
}

function hintsFor() {
  if (R.gate) { const t = curGate().tickets[R.gatePick]; return t ? [t.hint] : []; }
  const m = R.mem;
  if (R.phase === "trace") return m.traceHints;
  if (R.phase === "recall") return m.recallHints;
  if (R.phase === "practice") { const cd = curDrill(); if (!cd) return []; const s = cd.d.sol || [cd.d.out]; return [cd.d.hint, "Answer: " + s.join("   then   ")]; }
  return [];
}
function junie() {
  const hs = hintsFor(), max = hs.length;
  let cls = "j-idle", step = "STANDING BY", line;
  const m = R.mem;
  if (R.gate) line = gtext().junie;
  else line = { brief: "Read this first. Everything after it builds on these few ideas, and the traps box is where real tenants bite.", watch: R.watchStep >= (m ? m.watch.length : 0) ? "Seen it all. Ready to try with gaps?" : "Watch what changes between the steps, not just the result.", trace: "Fill the gaps and run. I am here if you get stuck.", recall: "Your turn, no gaps. Ask me if you need a nudge.", practice: "Different ticket, same skill. If you blank, one hint, then the answer.", real: "Lab and reality should match exactly. This is where you check." }[R.phase];
  if (R.hint > 0) { cls = "j-hint"; step = "HINT " + R.hint + " OF " + max; line = hs[R.hint - 1]; }
  if (R.jlineOverride) { line = R.jlineOverride; cls = R.jstate === "desync" ? "j-desync" : R.jstate === "ok" ? "j-success" : cls; step = R.jstate === "desync" ? "SOMETHING WENT WRONG" : R.jstate === "ok" ? "SYNCHRONIZED" : step; R.jlineOverride = null; R.jstate = null; }
  if (!$("jimg").firstChild) $("jimg").innerHTML = JUNIE;
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
function cmpHTML(chk, setup, pre, cmd, res, force) {
  if (!chk || !chk.out || res.error) return "";
  let exp; try { exp = GRADER.refText(chk, setup, pre); } catch (e) { return ""; }
  const mine = GRADER.text(res);
  if (!exp || mine === exp) return "";
  if (!force && !CMP.attempted(cmd, chk.out, mine, exp)) return "";
  return CMP.panel(mine, exp, esc);
}
function showCompare(html) {
  let box = $("cmpBox");
  if (!box) { box = document.createElement("div"); box.id = "cmpBox"; $("pbody").appendChild(box); }
  box.innerHTML = html ? '<h5 class="cmpt0">WHY IT DID NOT SYNC</h5>' + html : "";
  if (html) box.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
function desync(m, cmd, res, wrong, chk) {
  const err = res.error ? (res.error.text ? res.error.text() : String(res.error.message)) : null;
  const help = err ? errHelp(err) : null;
  const shown = err || (PS.formatOut(res.out, 90) || "").trim() || "(no output)";
  const why = help || (wrong + (err ? "" : " The command ran without an error, but it did not produce what the ticket asked for."));
  journal(m.id, err ? "error" : "wrong result", err || cmd);
  const counts = res.error ? "PowerShell refused to run it." : "It ran, but the result is not what the memory expected.";
  overlay('<div class="ds" role="dialog" aria-label="Desynchronized"><div class="dshero"><div class="dbg" aria-hidden="true"></div><div class="scan" aria-hidden="true"></div><small>MEMORY REJECTED</small><h2>DESYNCHRONIZED</h2><p>' + esc(counts) + "</p></div>" +
    '<div class="dsbody"><div><h5>WHAT YOU RAN</h5><pre>' + esc(cmd) + "</pre>" + ((!err && chk && cmpHTML(chk, m.trace.setup || m.setup, m.trace.pre, cmd, res, true)) || ("<h5>" + (err ? "WHAT POWERSHELL SAID" : "WHAT CAME BACK") + '</h5><pre class="' + (err ? "e" : "") + '">' + esc(shown.slice(0, 900)) + "</pre>")) + "</div>" +
    '<div style="display:flex;flex-direction:column;gap:14px"><div class="dsj"><div class="jimg j-desync" role="img" aria-label="Junie, a little shaken">' + JUNIE + '</div><div><h5 style="color:var(--red)">JUNIE</h5><p style="margin:0;font-size:14px;line-height:1.55">' + esc(why) + '</p></div></div><p class="mutetxt" style="margin:0">Saved to your journal. This memory comes back for review tomorrow.</p><div class="row"><button class="go" type="button" id="resync">RESYNC</button></div></div></div></div>');
  $("resync").onclick = () => { closeOverlay(); const g = $("pbody").querySelector(".gap"); if (g) g.focus(); };
}
function synced_overlay(title, text, next, nextLabel, alt) {
  overlay('<div class="sy" role="dialog" aria-label="' + esc(title) + '"><div class="jimg j-success" role="img" aria-label="Junie, happy">' + JUNIE + '</div><small>MEMORY ACCEPTED</small><h2>' + esc(title.toUpperCase()) + "</h2><p>" + esc(text) + '</p><div class="row" style="justify-content:center"><button class="go blue" type="button" id="syNext">' + esc(nextLabel) + "</button>" + (alt ? '<button class="go ghost" type="button" id="syAlt">NEXT MEMORY</button>' : "") + '<button class="go ghost" type="button" id="syStay">STAY HERE</button></div></div>');
  $("syNext").onclick = () => { closeOverlay(); next(); };
  if (alt) $("syAlt").onclick = () => { closeOverlay(); alt(); };
  $("syStay").onclick = () => closeOverlay();
}

function openGate(g) {
  g = g || GATE; R.gateObj = g;
  closeOverlay();
  R.view = "memory"; R.gate = true; R.mem = null; R.hint = 0; R.phase = "gate";
  $("corridor").classList.add("hide"); $("memory").classList.remove("hide"); $("desktop").classList.add("hide");
  const gt = gtext();
  $("crumb").textContent = gt.crumb + g.name;
  flowband(gt.flow, gt.flowT);
  $("tabs").innerHTML = '<button class="tab on" type="button">TICKETS</button>';
  resetConsole(g.setup || "none");
  if (g.mutate) g.mutate(R.ctx);
  R.gateBaseline = R.ctx.t.users.map((u) => [u.UserPrincipalName, u.AccountEnabled, u.Department, u.JobTitle].join("|"));
  R.gateHist = [];
  R.gatePick = g.tickets.findIndex((t) => !S.gate[t.id]); if (R.gatePick < 0) R.gatePick = 0;
  renderGate(); sidecard(); junie();
  $("cmd").placeholder = "You are in. Start with ticket 1.";
  $("cmd").focus();
}
function renderGate() {
  const g = curGate();
  $("pbody").innerHTML = '<div class="gatehero"' + gateHero(g) + ' role="img" aria-label="' + esc(g.name) + '"></div><p>' + esc(g.story) + '</p><div class="tickets">' +
    g.tickets.map((t, i) => '<div class="ticket' + (i === R.gatePick ? " on" : "") + (S.gate[t.id] ? " done" : "") + '"><small>TICKET ' + (i + 1) + " · FROM " + esc(t.from.toUpperCase()) + (S.gate[t.id] ? " · CLOSED" : "") + "</small><b>" + esc(t.title) + "</b><p>" + esc(t.body) + "</p></div>").join("") + "</div>" +
    '<p class="mutetxt">The console starts fresh: nothing connected. Each ticket closes the moment your command does what it asks.</p>';
}
function checkGate(res) {
  const g = curGate(); const t = g.tickets[R.gatePick];
  if (res.error) {
    const help = errHelp(res.error.text ? res.error.text() : "");
    R.jlineOverride = help || "Read the red text: the first line usually names the problem."; R.jstate = "desync"; junie();
    $("term").classList.remove("flash"); void $("term").offsetWidth; $("term").classList.add("flash");
  }
  const collateral = R.ctx.t.users.filter((u, i) => {
    const now = [u.UserPrincipalName, u.AccountEnabled, u.Department, u.JobTitle].join("|");
    return now !== R.gateBaseline[i] && !g.allow.test(u.UserPrincipalName);
  });
  if (collateral.length) { R.jlineOverride = "Careful: you changed " + collateral.map((u) => u.DisplayName).join(", ") + ", who is not in any ticket. In a real tenant that is a phone call from someone very confused."; R.jstate = "desync"; junie(); }
  if (!t) return;
  let ok = false; try { ok = t.check(R.ctx, R.gateHist, res); } catch (e) { ok = false; }
  if (ok && !S.gate[t.id]) {
    S.gate[t.id] = true; save(); earn(25, "closed " + t.title);
    const nx = g.tickets.findIndex((x) => !S.gate[x.id]);
    if (nx < 0) { if (g.type === "break") { S.breaksDone = S.breaksDone || {}; S.breaksDone[g.id] = true; if (S.breakPending === g.id) S.breakPending = null; save(); } synced_overlay(gtext().done, g.doneMsg, () => renderCorridor(), "BACK TO THE CORRIDOR"); }
    else { R.gatePick = nx; R.hint = 0; toast("Ticket closed. Next: " + g.tickets[nx].title); }
    renderGate(); junie();
  }
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
  let h = '<div class="dgroup"><h6>CONSOLE KEYS · PWSH 7 ON MAC (PSREADLINE, EMACS MODE)</h6>' + KEYS.filter(([kk, d]) => !q || (kk + " " + d).toLowerCase().includes(q)).map(([kk, d]) => '<div class="centry" style="cursor:default"><code>' + esc(kk) + "</code><span>" + esc(d) + "</span></div>").join("") + '<p class="mutetxt" style="font-size:12px">Alt keys need Terminal > Settings > Profiles > Keyboard > Use Option as Meta key. On Windows pwsh uses Windows mode instead: Tab cycles and Esc clears the line.</p></div><div class="rules"><b>Golden rules</b><ol><li>Read-only scopes to look, ReadWrite only to change.</li><li>Graph first, then Exchange, in a fresh window on Mac.</li><li>Ask Graph for properties with -Property, or they come back empty.</li><li>-All for anything you count or report.</li><li>Switch values glue on: -AccountEnabled:$false.</li><li>-WhatIf before a change, Get- after it to verify.</li><li>Leaver: block first, then revoke sessions.</li></ol></div>';
  h += '<div class="row" style="margin-top:12px"><button class="hbtn" type="button" id="dMix">START A PRACTICE MIX</button></div>';
  SEQUENCES.filter((s) => s.open).forEach((s) => {
    const rows = [];
    memsOf(s.id).forEach((m) => m.cheat.forEach(([c, d]) => { if (!q || (c + " " + d + " " + m.name).toLowerCase().includes(q)) rows.push([c, d, m]); }));
    if (!rows.length) return;
    h += '<div class="dgroup"><h6>SEQUENCE ' + s.id + " · " + esc(s.name.toUpperCase()) + "</h6>" + rows.map(([c, d, m]) => '<button class="centry' + (synced(m.id) ? "" : " locked") + '" type="button" data-c="' + esc(c) + '"><code>' + esc(c) + "</code><span>" + esc(d) + (synced(m.id) ? "" : " · not synced yet") + "</span></button>").join("") + "</div>";
  });
  h += '<p class="mutetxt" style="margin-top:16px">Click a line to put it in the console, or copy it when you are in the corridor.</p>';
  $("dbody").innerHTML = h;
  $("dMix").onclick = () => { drawer(false); startMix(); };
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
  if ((e.key === "k" || e.key === "K") && (e.metaKey || (e.ctrlKey && document.activeElement !== $("cmd")))) { e.preventDefault(); drawer(undefined, "cheat"); return; }
  if (e.key === "Escape" && document.activeElement !== $("cmd")) {
    if (!$("ov").classList.contains("hide")) { closeOverlay(); return; }
    if ($("drawer").classList.contains("open")) { drawer(false); return; }
  }
  if (e.key === "Escape" && !$("ov").classList.contains("hide")) { closeOverlay(); return; }
  if (R.view === "corridor" && document.activeElement && document.activeElement.tagName !== "INPUT") {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const n = memsOf(S.seqSel).length + 1;
      S.selMem = (S.selMem + (e.key === "ArrowRight" ? 1 : -1) + n) % n; save(); renderCorridor(); e.preventDefault();
    }
    if (e.key === "Enter" && document.activeElement === document.body) enterSelected();
  }
});
(function motes() { let h = ""; for (let i = 0; i < 12; i++) h += '<div class="mote" style="left:' + (8 + (i * 37) % 84) + "%;top:" + (40 + (i * 23) % 50) + "%;animation-delay:" + (i * 1.3).toFixed(1) + 's"></div>'; $("motes").innerHTML = h; })();
window.SYNCLE = { S, R, openMemory, openGate, renderCorridor, setPhase, maybeBreak };
renderCorridor();

(function splash() {
  let seen = false; try { seen = sessionStorage.getItem("syncle-splash") === "1"; sessionStorage.setItem("syncle-splash", "1"); } catch (e) {}
  const s = document.getElementById("splash"); if (!s) return;
  if (seen) { s.remove(); return; }
  const go = () => { s.classList.add("out"); setTimeout(() => s.remove(), 900); };
  s.onclick = go; document.addEventListener("keydown", go, { once: true }); setTimeout(go, 2600);
})();
