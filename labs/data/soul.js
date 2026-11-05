/* Soul: a shared immersion layer for the Mega Lab.
   Adds (1) drifting ambient motion that fits each lab's world, (2) a resident
   NPC who chats while you work, and (3) real-world good-habit reminders.
   No dependencies, no emoji, respects reduced motion, pauses in hidden tabs.
   Usage: <script src="data/soul.js" data-world="shelle"></script>
   API: Soul.say("text") lets a lab make the resident speak; Soul.mute(bool). */
(function () {
  "use strict";
  var me = document.currentScript;
  var key = (me && me.getAttribute("data-world")) || "generic";
  var KEY = "soul.mute";
  var reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  /* ---- worlds -------------------------------------------------------- */
  var W = {
    shelle: { npc: "Wren", role: "harbour dockmaster", color: "#3fcf9f", mote: "#7fe8c8", motion: "drift",
      chat: ["Containers stack neatly when every one has a label. Name yours.", "Tide is in. Good time to practise a pipe or two.", "A ship that sails without a manifest gets lost. Read the man page first.", "Smaller crates, faster cranes: keep each command doing one job.", "Tab completion is the harbour pilot. Let it steer you."],
      habit: ["Habit: never run rm -rf with a variable you have not echoed first. Real harbours lose cargo that way.", "Habit: quote your variables. Spaces in names sink more scripts than storms.", "Habit: docker ps -a before you prune. Know what is aboard before you sink it.", "Habit: history is a logbook, not a secret. Never type passwords on the command line."] },
    poshle: { npc: "Vesna", role: "night-shift sysadmin", color: "#5aa9ff", mote: "#9cc8ff", motion: "scan",
      chat: ["Servers hum at three in the morning. You hear it once you listen.", "Tickets pile up, but a good one-liner clears a floor of them.", "Get-Help is the break-room manual. Everyone forgets it exists.", "The pipeline is a conveyor belt. Objects ride it, not text.", "Coffee's cold again. At least the output is warm."],
      habit: ["Habit: run with -WhatIf before anything that deletes or changes many objects.", "Habit: read the red text. Errors tell you the line, the command and usually the fix.", "Habit: never paste a script you have not read, even from a colleague.", "Habit: filter left. Where-Object after Get-ADUser is slow; -Filter is fast."] },
    "poshle-pocket": { alias: "poshle" }, "poshle-forge": { npc: "Brand", role: "forge smith", color: "#ff9a4d", mote: "#ffb870", motion: "embers",
      chat: ["Hot iron, steady hand. Same as a clean script.", "Strike while it is hot, then test while it cools.", "A blade without a test is a rumour.", "Pounding out the same error twice means you skipped reading it."],
      habit: ["Habit: write the Pester test first. If you cannot test it, you do not understand it.", "Habit: small functions, one verb-noun name, one job.", "Habit: -ErrorAction Stop in try blocks, or the catch never fires."] },
    "git-lab": { npc: "Archivist Imre", role: "station archivist", color: "#4de0c1", mote: "#8af0da", motion: "scan",
      chat: ["Every commit is a page in the station log. Write it like someone will read it.", "Branches are side corridors. Merge them back before they get lost.", "The reflog remembers what you wish you had not done. And can undo it.", "Conflicts are two crew writing on the same wall. Talk, then decide."],
      habit: ["Habit: git status and git diff before every commit. Always know what you are about to record.", "Habit: never force-push a shared branch. Use --force-with-lease if you must.", "Habit: never commit secrets. Once pushed, treat the key as burned and rotate it.", "Habit: commit small, message in the imperative: Fix login timeout, not stuff."] },
    spelle: { npc: "Oriel", role: "grimoire keeper", color: "#c59bff", mote: "#e0c8ff", motion: "drift",
      chat: ["Candles gutter when a spell has a stray comma.", "A good incantation reads clearly aloud. So does good code.", "The console is a crystal ball. Use it often.", "Each spell you master dims one more shadow in the library."],
      habit: ["Habit: use === not ==. Loose equality is a trickster spirit.", "Habit: const by default, let when it must change, never var.", "Habit: never trust input from outside. Validate before you cast.", "Habit: never use eval on user text. That is how towers burn."] },
    "subnle-pocket": { npc: "Cartographer Neve", role: "network surveyor", color: "#6fd3ff", mote: "#a9e6ff", motion: "grid",
      chat: ["Every border on this map is a power of two. Beautiful, really.", "Blocks nest like boxes; the mask just says how deep.", "A /24 is a village, a /30 is a handshake between two routers.", "Draw it on paper first. Surveyors always do."],
      habit: ["Habit: plan address space with room to grow; renumbering later hurts.", "Habit: document every subnet in one place the team can find.", "Habit: reserve network and broadcast addresses; do not hand them to hosts.", "Habit: use private ranges (RFC 1918) internally and never invent public ones."] },
    "pyle-pocket": { npc: "Conductor Tamsin", role: "pocket-car conductor", color: "#e9b872", mote: "#f6d9a6", motion: "rail",
      chat: ["Rails click under the floor. Keep tapping, you are on schedule.", "Next stop: one more correct answer.", "Short trips beat no trips. Two minutes counts.", "Snacks in the galley, bugs in the luggage rack. Check both."],
      habit: ["Habit: name things for what they hold, not for how you feel about them.", "Habit: read the traceback bottom first. The last line is the answer.", "Habit: never use a mutable default argument; it remembers between calls.", "Habit: use with open(...) so files are always closed."] },
    sleeple: { npc: "Night porter Odo", role: "night-train porter", color: "#e9b872", mote: "#ffe3a8", motion: "rail",
      chat: ["Lamps sway, wheels sing. A good hour to study.", "The telegram office never sleeps and neither does that one bug.", "Hot cocoa in the dining car if you finish this stage.", "Dark windows, bright rails: watch the stations go by."],
      habit: ["Habit: test with an empty input and a huge input before you call it done.", "Habit: handle the error you can predict; do not swallow the one you cannot.", "Habit: print less, log more. And never log a password."] },
    seqle: { npc: "Chef Roux", role: "bistro chef", color: "#ff8f5a", mote: "#ffc79f", motion: "steam",
      chat: ["Mise en place: select your columns before you cook.", "A clean WHERE is like a sharp knife. Fewer tears.", "The till does not lie. Count your rows.", "Order of operations in the kitchen: FROM, WHERE, GROUP, SELECT."],
      habit: ["Habit: always write the WHERE first on UPDATE and DELETE. Run it as SELECT before you commit.", "Habit: use parameters, never glue user text into SQL. Injection ruins dinner.", "Habit: begin a transaction for risky changes so you can roll back.", "Habit: name your columns; SELECT * in production is a lazy cook."] },
    rebble: { npc: "Foreman Dax", role: "workshop foreman", color: "#ffb347", mote: "#ffd9a0", motion: "sparks",
      chat: ["Building beats watching. Put hands on it.", "Sawdust on the floor means progress.", "Measure twice, ship once.", "The blueprint is the map; the browser is the building inspector."],
      habit: ["Habit: commit working steps, not finished projects. Roll back to the last good one.", "Habit: open dev tools early. Console errors are free advice.", "Habit: build mobile-first; the narrow screen is the honest one."] },
    codex: { npc: "Librarian Pell", role: "reference librarian", color: "#9bb8ff", mote: "#c9d8ff", motion: "dust",
      chat: ["Shhh. The best knowledge is quiet and well indexed.", "Look it up, then close the book and try from memory.", "Dust motes in the lamplight. Somewhere, a page turns.", "Reading is half; typing it yourself is the other half."],
      habit: ["Habit: read the official docs first, forum answers second.", "Habit: write down why a fix works, not only what you typed.", "Habit: look it up every time until you do not need to. No shame."] },
    mscodex: { alias: "codex" },
    opsle: { npc: "Controller Ines", role: "ops-room controller", color: "#7ee0a5", mote: "#b0f0cb", motion: "scan",
      chat: ["All lights green. That is when we check twice.", "Missions queue up. Pick the one that matters, not the loud one.", "A runbook is a gift to tomorrow's you at 3 a.m.", "Quiet rooms are good rooms."],
      habit: ["Habit: change one thing at a time and write down what you changed.", "Habit: have a rollback before you have a change.", "Habit: confirm the host name before you run anything destructive.", "Habit: leave the system better documented than you found it."] },
    pockle: { npc: "Pip", role: "pocket sprite", color: "#ffd166", mote: "#ffe6a0", motion: "drift",
      chat: ["Tiny questions, big muscles. Keep going.", "Streaks are made of boring Tuesdays.", "I sit in your pocket and cheer. It is a good job.", "Wrong answers are just early answers to the next question."],
      habit: ["Habit: spaced practice beats cramming. A little, often.", "Habit: say the answer before you tap it.", "Habit: when you miss one, explain it to yourself aloud."] },
    "pyle-office": { alias: "pyle-pocket" }, generic: { npc: "Guide", role: "lab guide", color: "#8ab4ff", mote: "#c0d4ff", motion: "drift",
      chat: ["Keep going, you are doing fine.", "Small steps, every day."], habit: ["Habit: if it is not allowed in real life, it is not allowed in the lab."] }
  };
  var cfg = W[key] || W.generic;
  if (cfg.alias) cfg = W[cfg.alias];

  /* shared pieces: time of day, welcome-back, idle nudges, typing, wins */
  function hour() { return new Date().getHours(); }
  function greet() {
    var h = hour();
    var part = h < 5 ? "Burning the midnight oil, are we?" : h < 12 ? "Good morning." : h < 18 ? "Good afternoon." : "Good evening.";
    return part + " I am " + cfg.npc + ", " + cfg.role + ". Pull up a chair.";
  }
  var rand = function (a) { return a[Math.floor(Math.random() * a.length)]; };
  var muted = false;
  try { muted = localStorage.getItem(KEY) === "1"; } catch (e) {}

  /* ---- DOM ----------------------------------------------------------- */
  var css = document.createElement("style");
  css.textContent =
    ".soul-bub{position:fixed;left:12px;bottom:12px;z-index:2147483000;max-width:min(340px,calc(100vw - 24px));display:flex;gap:9px;align-items:flex-end;font:13px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;pointer-events:none;opacity:0;transform:translateY(8px);transition:opacity .35s,transform .35s}" +
    ".soul-bub.on{opacity:1;transform:none;pointer-events:auto}" +
    ".soul-av{flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-weight:700;color:#10131a;background:var(--soul-c,#8ab4ff);box-shadow:0 0 0 2px rgba(255,255,255,.25),0 4px 14px rgba(0,0,0,.35);animation:soulbob 3.2s ease-in-out infinite}" +
    ".soul-tx{background:rgba(18,22,30,.94);color:#eef2f8;border:1px solid var(--soul-c,#8ab4ff);border-radius:12px 12px 12px 3px;padding:8px 11px;box-shadow:0 6px 22px rgba(0,0,0,.35)}" +
    ".soul-tx b{display:block;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--soul-c,#8ab4ff);margin-bottom:2px}" +
    ".soul-tx button{all:unset;cursor:pointer;margin-left:8px;font-size:11px;opacity:.6;text-decoration:underline}" +
    ".soul-tx button:hover{opacity:1}" +
    ".soul-tx i{font-style:normal;color:#ffd27a}" +
    ".soul-btn{position:fixed;left:12px;bottom:12px;z-index:2147482999;width:34px;height:34px;border-radius:50%;border:1px solid var(--soul-c,#8ab4ff);background:rgba(18,22,30,.82);color:var(--soul-c,#8ab4ff);font:700 14px system-ui;cursor:pointer;opacity:.55}" +
    ".soul-btn:hover{opacity:1}" +
    ".soul-cv{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147482990;opacity:.55}" +
    "@keyframes soulbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}" +
    "@media (prefers-reduced-motion:reduce){.soul-av{animation:none}.soul-bub{transition:none}}" +
    "@media print{.soul-bub,.soul-btn,.soul-cv{display:none!important}}";
  document.head.appendChild(css);

  var bub = document.createElement("div");
  bub.className = "soul-bub";
  bub.setAttribute("role", "status");
  bub.setAttribute("aria-live", "polite");
  bub.style.setProperty("--soul-c", cfg.color);
  var av = document.createElement("div"); av.className = "soul-av"; av.textContent = cfg.npc.replace(/^(Archivist|Cartographer|Conductor|Night porter|Chef|Foreman|Librarian|Controller)\s+/, "").charAt(0);
  var tx = document.createElement("div"); tx.className = "soul-tx";
  bub.appendChild(av); bub.appendChild(tx);
  var btn = document.createElement("button");
  btn.className = "soul-btn"; btn.type = "button"; btn.style.setProperty("--soul-c", cfg.color);
  btn.title = "Bring back " + cfg.npc; btn.setAttribute("aria-label", "Bring back the lab resident"); btn.textContent = av.textContent; btn.hidden = !muted;

  function attach() { document.body.appendChild(bub); document.body.appendChild(btn); }

  var hideT = 0;
  function say(text, opts) {
    if (muted && !(opts && opts.force)) return;
    tx.textContent = "";
    var b = document.createElement("b"); b.textContent = cfg.npc + " · " + cfg.role; tx.appendChild(b);
    var s = document.createElement("span"); s.textContent = text; tx.appendChild(s);
    var h = document.createElement("button"); h.type = "button"; h.textContent = "hush"; h.onclick = function () { mute(true); }; tx.appendChild(h);
    bub.classList.add("on");
    clearTimeout(hideT);
    hideT = setTimeout(function () { bub.classList.remove("on"); }, Math.max(6500, text.length * 85));
  }
  function mute(v) {
    muted = !!v; try { localStorage.setItem(KEY, muted ? "1" : "0"); } catch (e) {}
    btn.hidden = !muted; if (muted) bub.classList.remove("on");
    if (!muted) say("Back again. Where were we?", { force: true });
  }
  btn.onclick = function () { mute(false); };

  /* ---- ambient motion ------------------------------------------------ */
  var cv, cx, parts = [], raf = 0, W_, H_, last = 0;
  function mkPart(init) {
    var m = cfg.motion, p = { x: Math.random() * W_, y: Math.random() * H_, r: 1 + Math.random() * 1.8, a: 0.15 + Math.random() * 0.5, t: Math.random() * 6.28 };
    if (m === "embers" || m === "sparks") { p.vx = (Math.random() - .5) * 14; p.vy = -(12 + Math.random() * 30); if (!init) p.y = H_ + 5; }
    else if (m === "steam") { p.vx = (Math.random() - .5) * 8; p.vy = -(8 + Math.random() * 14); p.r = 2 + Math.random() * 4; p.a *= .45; if (!init) p.y = H_ + 5; }
    else if (m === "rail") { p.vx = -(30 + Math.random() * 70); p.vy = 0; p.r = 0.8 + Math.random(); p.len = 8 + Math.random() * 22; if (!init) p.x = W_ + 20; }
    else if (m === "scan") { p.vx = 0; p.vy = 10 + Math.random() * 25; p.r = 1; p.a *= .6; if (!init) p.y = -5; }
    else if (m === "grid") { p.vx = (Math.random() < .5 ? -1 : 1) * (8 + Math.random() * 14); p.vy = 0; p.y = Math.round(p.y / 40) * 40; if (!init) p.x = p.vx > 0 ? -5 : W_ + 5; }
    else if (m === "dust") { p.vx = (Math.random() - .5) * 6; p.vy = 3 + Math.random() * 6; p.a *= .6; if (!init) p.y = -5; }
    else { p.vx = (Math.random() - .5) * 12; p.vy = (Math.random() - .5) * 10; }
    return p;
  }
  function resize() { W_ = innerWidth; H_ = innerHeight; cv.width = W_; cv.height = H_; }
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(.05, (ts - last) / 1000); last = ts;
    cx.clearRect(0, 0, W_, H_);
    cx.fillStyle = cfg.color; cx.strokeStyle = cfg.color;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i]; p.t += dt;
      p.x += (p.vx + (cfg.motion === "drift" ? Math.sin(p.t) * 6 : 0)) * dt; p.y += p.vy * dt;
      if (p.x < -30 || p.x > W_ + 30 || p.y < -30 || p.y > H_ + 30) { parts[i] = p = mkPart(false); }
      var tw = cfg.motion === "drift" || cfg.motion === "dust" ? 0.55 + 0.45 * Math.sin(p.t * 2) : 1;
      cx.globalAlpha = p.a * tw;
      if (cfg.motion === "rail") { cx.lineWidth = p.r; cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(p.x + p.len, p.y); cx.stroke(); }
      else { cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill(); }
    }
    cx.globalAlpha = 1;
  }
  function startMotion() {
    if (reduce) return;
    cv = document.createElement("canvas"); cv.className = "soul-cv"; cv.setAttribute("aria-hidden", "true");
    document.body.appendChild(cv); cx = cv.getContext("2d"); if (!cx) return;
    resize(); addEventListener("resize", resize);
    var n = Math.round(Math.min(46, Math.max(16, (innerWidth * innerHeight) / 30000)));
    for (var i = 0; i < n; i++) parts.push(mkPart(true));
    last = performance.now(); raf = requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    });
  }

  /* ---- the resident's behaviour -------------------------------------- */
  var keys = 0, lastAct = Date.now(), lastSay = 0, wins = 0, seen = [];
  function pickNew(pool) { var a = pool.filter(function (x) { return seen.indexOf(x) < 0; }); if (!a.length) { seen = []; a = pool; } var s = rand(a); seen.push(s); return s; }
  function chatter() {
    var now = Date.now();
    if (document.hidden || now - lastSay < 40000) return;
    var idle = now - lastAct > 90000;
    var line = idle ? "Still there? Take a breath, then try one more. Short breaks help memory." : (Math.random() < .45 ? pickNew(cfg.habit) : pickNew(cfg.chat));
    lastSay = now; say(line);
  }
  addEventListener("keydown", function (e) {
    lastAct = Date.now();
    if (e.key && e.key.length === 1 && ++keys % 120 === 0) { lastSay = Date.now(); say(rand(["Good rhythm. Your fingers are learning this.", "Keys clacking nicely. That is muscle memory forming.", "Steady typing. Speed follows accuracy, so keep it clean."])); }
  }, true);
  addEventListener("pointerdown", function () { lastAct = Date.now(); }, true);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && Date.now() - lastAct > 300000) { lastSay = Date.now(); say("Welcome back. A quick recap before you dive in: try the last thing from memory."); lastAct = Date.now(); }
  });

  /* react to wins and slips the labs already show on screen */
  function watchResults() {
    var re = /\b(correct|well done|nice work|passed|cleared|solved|perfect|right!?)\b/i, bad = /\b(incorrect|not quite|try again|wrong|error|failed)\b/i, t = 0;
    var mo = new MutationObserver(function (list) {
      if (Date.now() - lastSay < 12000) return;
      for (var i = 0; i < list.length; i++) {
        var n = list[i].addedNodes;
        for (var j = 0; j < n.length; j++) {
          var nd = n[j]; if (nd.nodeType !== 1 || (nd.className && String(nd.className).indexOf("soul") >= 0)) continue;
          var txt = (nd.textContent || "").slice(0, 160);
          if (txt.length < 4) continue;
          clearTimeout(t);
          if (re.test(txt) && !bad.test(txt)) { t = setTimeout(function () { wins++; lastSay = Date.now(); say(wins % 5 === 0 ? "That is " + wins + " good ones this session. Quietly impressive." : rand(["Clean. That is how it is done.", "Yes. Do it once more from memory and it is yours.", "Nicely handled.", "That one will stick."])); }, 700); return; }
          if (bad.test(txt) && txt.length < 140) { t = setTimeout(function () { lastSay = Date.now(); say(rand(["A miss is information. Read what it told you.", "Slow down, read the message, adjust one thing.", "Every expert has made this exact mistake. Try again.", "Close. What did the error actually say?"])); }, 900); return; }
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  function boot() {
    attach(); startMotion();
    setTimeout(function () { lastSay = Date.now(); say(greet()); }, 2500);
    setInterval(chatter, 25000);
    watchResults();
  }
  if (document.body) boot(); else document.addEventListener("DOMContentLoaded", boot);

  window.Soul = { say: say, mute: mute, world: key };
})();
