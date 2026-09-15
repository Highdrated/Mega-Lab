var EXAM_BANK = [
  { d: "Networking fundamentals", q: "Which address is the broadcast of 172.16.32.0/20?", opts: ["172.16.47.255", "172.16.32.255", "172.16.63.255"], right: 0, why: "/20's magic number in the third octet is 16: block 32\u201347. Broadcast = last address of the block: 172.16.47.255." },
  { d: "Networking fundamentals", q: "How many usable hosts in a /29?", opts: ["6", "8", "14"], right: 0, why: "2^3 = 8 addresses, minus network and broadcast = 6." },
  { d: "Networking fundamentals", typed: true, q: "Type the network address of 10.20.37.66/27:", answer: "10.20.37.64", why: "/27 steps by 32: .0, .32, .64, .96 \u2014 66 snaps down to .64." },
  { d: "Networking fundamentals", q: "A switch port and a VLAN correspond to which domains, respectively?", opts: ["Broadcast / collision", "Collision / broadcast", "Both broadcast"], right: 1, why: "Each switched port is its own collision domain; each VLAN is one broadcast domain." },
  { d: "Networking fundamentals", q: "Which PDU name belongs to layer 2?", opts: ["Packet", "Frame", "Segment"], right: 1, why: "data \u2192 segment (L4) \u2192 packet (L3) \u2192 frame (L2) \u2192 bits (L1)." },
  { d: "Networking fundamentals", q: "MAC addresses are significant...", opts: ["End to end across the internet", "Only within the local layer-2 segment", "Only on trunk ports"], right: 1, why: "Frames are re-addressed at every routed hop; MACs never leave their L2 segment. IPs go end to end." },
  { d: "Junos OS fundamentals", q: "Which plane forwards transit traffic on a Junos device?", opts: ["Routing Engine", "Packet Forwarding Engine", "mgd"], right: 1, why: "The PFE forwards in hardware using the table the RE compiled; transit traffic never visits the RE." },
  { d: "Junos OS fundamentals", q: "Which daemon maintains the routing protocols and routing table?", opts: ["mgd", "rpd", "dcd"], right: 1, why: "rpd = routing protocol daemon. mgd is the CLI/config; dcd handles interfaces." },
  { d: "Junos OS fundamentals", q: "The routing table and the forwarding table relate how?", opts: ["Same table, two names", "RE builds the routing table, derives the forwarding table, pushes it to the PFE", "PFE builds both"], right: 1, why: "Direction matters and the exam tests it: routing table (RE, all known routes) \u2192 forwarding table (best paths) \u2192 PFE." },
  { d: "Junos OS fundamentals", q: "One Junos trait the exam loves:", opts: ["Different OS per platform family", "One modular OS across routing, switching and security platforms", "GUI-only management"], right: 1, why: "A single Junos with modular daemons runs across EX, MX, SRX \u2014 same CLI, same commit model." },
  { d: "CLI & configuration", q: "You are at [edit interfaces ge-0/0/1]. Which command returns to the very top of the hierarchy?", opts: ["up", "top", "exit configuration-mode"], right: 1, why: "up climbs one level; top jumps to [edit]. exit from the top leaves configuration mode." },
  { d: "CLI & configuration", q: "commit confirmed 5 does what?", opts: ["Commits after a 5-minute delay", "Commits now, auto-rolls back in 5 minutes unless you confirm with another commit", "Commits 5 times"], right: 1, why: "The remote-change lifesaver: if your change cuts you off, the box restores itself in 5 minutes." },
  { d: "CLI & configuration", q: "Which command shows the differences between the candidate and active configuration?", opts: ["show | compare", "show configuration", "compare rollback"], right: 0, why: "show | compare in configuration mode diffs candidate against active \u2014 read it before every commit." },
  { d: "CLI & configuration", q: "rollback 0 does what?", opts: ["Reboots", "Discards candidate edits by reloading the active config into the candidate", "Restores the rescue config"], right: 1, why: "rollback 0 = 'undo my uncommitted edits'. rollback 1 = previous commit; rollback rescue = your saved snapshot." },
  { d: "CLI & configuration", q: "In operational mode, how do you run a configuration command without entering configure?", opts: ["You can't", "Prefix it with run", "It's the reverse: run executes OPERATIONAL commands from configuration mode"], right: 2, why: "run works from config mode outward (run show route). There's no inward equivalent \u2014 a favorite trick question." },
  { d: "CLI & configuration", q: "What does the ? key do at any point in the Junos CLI?", opts: ["Deletes the line", "Context-sensitive help: lists what can come next", "Shows the manual"], right: 1, why: "? lists valid completions at the cursor \u2014 the single most useful key on a Junos box." },
  { d: "Monitoring & maintenance", q: "Before upgrading Junos, best practice is to run...", opts: ["request system reboot", "request system storage cleanup", "rollback 1"], right: 1, why: "Full /var storage is the classic upgrade failure; cleanup rotates logs and removes old bundles first." },
  { d: "Monitoring & maintenance", q: "The rescue configuration is...", opts: ["Automatic backup of every commit", "A known-good snapshot YOU save, restorable with rollback rescue", "The factory default"], right: 1, why: "You choose when to save it (request system configuration rescue save); it doesn't move with commit history." },
  { d: "Monitoring & maintenance", q: "Which login class allows operational actions but no configuration changes?", opts: ["read-only", "operator", "super-user"], right: 1, why: "operator can restart daemons and clear sessions but cannot configure. read-only can only look." },
  { d: "Monitoring & maintenance", q: "Root logs into a Junos device and sees %. To reach the Junos CLI it must...", opts: ["Reboot", "Type cli", "Type configure"], right: 1, why: "Root lands in the shell; cli starts the CLI. Then configure enters configuration mode." },
  { d: "Routing fundamentals", q: "Junos route preference: which wins for the same prefix?", opts: ["OSPF internal (10) over static (5)", "Static (5) over OSPF internal (10)", "BGP (170) over both"], right: 1, why: "Lower preference wins: static 5 beats OSPF 10 beats BGP 170. The reason learned routes 'don't work' while a static lingers." },
  { d: "Routing fundamentals", q: "A route to 0.0.0.0/0 is called...", opts: ["A null route", "The default route", "A martian"], right: 1, why: "The default route: where packets go when nothing more specific matches." },
  { d: "Routing fundamentals", q: "Longest match rule: traffic to 10.1.1.7 with routes 10.0.0.0/8 and 10.1.1.0/24 in the table uses...", opts: ["10.0.0.0/8", "10.1.1.0/24", "Load-balanced"], right: 1, why: "The most specific (longest) prefix always wins, regardless of protocol preference." },
  { d: "Routing fundamentals", q: "What must be true before an OSPF adjacency forms on a broadcast link?", opts: ["Same area and matching hello/dead timers", "Same router-id", "BGP configured"], right: 0, why: "Area mismatch or timer mismatch = no adjacency. Matching router-ids would be an error, not a requirement." },
  { d: "Routing fundamentals", q: "eBGP vs iBGP:", opts: ["eBGP peers between different AS numbers; iBGP within one AS", "eBGP is encrypted", "iBGP uses UDP"], right: 0, why: "The e/i is about AS boundaries. Both ride TCP 179." },
  { d: "Policy & filters", q: "A packet matches no term in an applied firewall filter. Its fate?", opts: ["Accepted", "Discarded by the implicit rule", "Logged"], right: 1, why: "Every filter ends with an invisible discard-everything. Hence the mandatory final accept term for legitimate traffic." },
  { d: "Policy & filters", q: "reject differs from discard how?", opts: ["reject notifies the sender (ICMP prohibited); discard is silent", "reject is faster", "discard notifies the sender"], right: 0, why: "Same drop, different courtesy: reject answers, discard leaves the sender to time out." },
  { d: "Policy & filters", q: "Export policy on a protocol controls...", opts: ["Which routes enter your routing table", "Which routes you advertise to others", "Which packets leave an interface"], right: 1, why: "Export = advertising out; import = accepting in. Packets are firewall-filter business, not policy." },
  { d: "Policy & filters", q: "By default, BGP advertises to a peer...", opts: ["Everything in the routing table", "Only BGP-learned and BGP-originated routes", "Nothing"], right: 1, why: "Your statics and OSPF routes stay home unless an export policy sends them. The 'why isn't my static advertised' classic." },
  { d: "Policy & filters", q: "Filter terms are evaluated...", opts: ["All terms, most specific wins", "Top-down, first match wins", "Random order"], right: 1, why: "Order is everything: a broad accept term above a block term neuters the block." },
];

function examAllQuestions(){
  var all = [];
  EXAM_BANK.forEach(function(b, i){
    all.push({ id: "b:" + i, d: b.d, q: b.q, opts: b.opts, right: b.right, why: b.why, typed: !!b.typed, answer: b.answer });
  });
  var domOf = function(gid){
    for(var dom in COURSE_DOMAINS) if(COURSE_DOMAINS[dom].indexOf(gid) !== -1) return dom;
    return "Routing fundamentals";
  };
  PROTO_GUIDES.forEach(function(g){
    if(!g.ready || !g.quiz) return;
    g.quiz.forEach(function(q, qi){
      all.push({ id: "g:" + g.id + ":" + qi, d: domOf(g.id), q: q.q, opts: q.opts, right: q.right, why: q.why });
    });
  });
  return all;
}
function examWrongSet(){
  try{ return new Set((localStorage.getItem("junoslab-wrongq") || "").split("|").filter(Boolean)); }
  catch(e){ return new Set(); }
}
function examSaveWrong(set){
  try{ localStorage.setItem("junoslab-wrongq", Array.from(set).join("|")); }catch(e){}
}
function examNormalize(t){
  return String(t == null ? "" : t).trim().toLowerCase().replace(/\s+/g, " ");
}
function examDraw(n, rng){
  rng = rng || Math.random;
  var all = examAllQuestions();
  var wrong = examWrongSet();
  var pool = [];
  all.forEach(function(q){
    var w = wrong.has(q.id) ? 5 : 1;
    for(var i = 0; i < w; i++) pool.push(q);
  });
  var picked = [], used = new Set();
  var guard = 0;
  while(picked.length < Math.min(n, all.length) && guard++ < 5000){
    var q = pool[Math.floor(rng() * pool.length)];
    if(used.has(q.id)) continue;
    used.add(q.id);
    picked.push(q);
  }
  return picked;
}

var MOCK = null;
function startMockExam(){
  modalChoice("Mock exam \u2014 JNCIA format", "Timed, multiple choice, mistakes remembered: questions you miss come back weighted in future exams. Pick a length:", [
    { value: 20, label: "20 questions \u00b7 ~25 min", desc: "Coffee-break exam" },
    { value: 40, label: "40 questions \u00b7 ~50 min", desc: "Serious rehearsal" },
    { value: 65, label: "65 questions \u00b7 ~85 min", desc: "Full JNCIA-length simulation" },
  ]).then(function(n){
    if(n === null) return;
    MOCK = {
      qs: examDraw(n),
      i: 0, correct: 0,
      perDom: {}, missed: [],
      endsAt: Date.now() + n * 78 * 1000,
      timer: null,
    };
    renderMockQuestion();
    MOCK.timer = setInterval(function(){
      var el = document.getElementById("mock-timer");
      if(!el){ return; }
      var left = MOCK.endsAt - Date.now();
      if(left <= 0){ finishMockExam(true); return; }
      var m = Math.floor(left / 60000), s2 = Math.floor((left % 60000) / 1000);
      el.textContent = m + ":" + (s2 < 10 ? "0" : "") + s2;
      el.className = left < 120000 ? "mock-timer mock-timer-low" : "mock-timer";
    }, 500);
  });
}
function mockHost(){
  var h = document.getElementById("mock-exam");
  if(!h){
    h = document.createElement("div");
    h.id = "mock-exam";
    document.body.appendChild(h);
  }
  return h;
}
function renderMockQuestion(){
  var h = mockHost();
  h.innerHTML = "";
  h.style.display = "flex";
  var q = MOCK.qs[MOCK.i];
  var card = document.createElement("div");
  card.className = "mock-card";
  var top = document.createElement("div");
  top.className = "mock-top";
  top.innerHTML = "<span>Question " + (MOCK.i + 1) + " / " + MOCK.qs.length + "</span><span id='mock-timer' class='mock-timer'></span>";
  var quit = document.createElement("button");
  quit.textContent = "abandon";
  quit.onclick = function(){ finishMockExam(false, true); };
  top.appendChild(quit);
  card.appendChild(top);
  var qt = document.createElement("div");
  qt.className = "mock-q";
  qt.textContent = q.q;
  card.appendChild(qt);
  var answered = false;
  var settle = function(correct, givenText){
    if(answered) return;
    answered = true;
    if(typeof SFX !== "undefined") (correct ? SFX.ding : SFX.womp)();
    if(correct) MOCK.correct++;
    MOCK.perDom[q.d] = MOCK.perDom[q.d] || { c: 0, t: 0 };
    MOCK.perDom[q.d].t++;
    if(correct) MOCK.perDom[q.d].c++;
    var wrong = examWrongSet();
    if(correct) wrong.delete(q.id); else { wrong.add(q.id); MOCK.missed.push({ q: q, given: givenText }); }
    examSaveWrong(wrong);
    setTimeout(function(){
      MOCK.i++;
      if(MOCK.i >= MOCK.qs.length) finishMockExam(false);
      else renderMockQuestion();
    }, correct ? 350 : 1200);
    var fb = document.createElement("div");
    fb.className = correct ? "mock-fb mock-fb-ok" : "mock-fb mock-fb-bad";
    fb.innerHTML = svgMark(correct ? "check" : "cross") + (correct ? "" : " " + (q.typed ? "answer: " + q.answer : ""));
    card.appendChild(fb);
  };
  if(q.typed){
    var inp = document.createElement("input");
    inp.className = "mock-input";
    inp.autocomplete = "off"; inp.spellcheck = false;
    inp.placeholder = "type your answer \u2014 case doesn't matter";
    var sub = document.createElement("button");
    sub.textContent = "Answer";
    sub.onclick = function(){ settle(examNormalize(inp.value) === examNormalize(q.answer), inp.value); };
    inp.addEventListener("keydown", function(e){ if(e.key === "Enter") sub.onclick(); });
    card.appendChild(inp);
    card.appendChild(sub);
    setTimeout(function(){ inp.focus(); }, 50);
  } else {
    q.opts.forEach(function(o, oi){
      var b = document.createElement("button");
      b.className = "mock-opt";
      b.textContent = o;
      b.onclick = function(){
        b.classList.add(oi === q.right ? "pg-q-right" : "pg-q-wrong");
        settle(oi === q.right, o);
      };
      card.appendChild(b);
    });
  }
  h.appendChild(card);
}
function finishMockExam(timeUp, abandoned){
  if(MOCK && MOCK.timer) clearInterval(MOCK.timer);
  var h = mockHost();
  if(abandoned){ h.style.display = "none"; h.innerHTML = ""; MOCK = null; return; }
  var total = MOCK.i;
  var pct = total ? Math.round((MOCK.correct / total) * 100) : 0;
  var pass = pct >= 65;
  h.innerHTML = "";
  var card = document.createElement("div");
  card.className = "mock-card";
  var head = document.createElement("div");
  head.className = "mock-result " + (pass ? "mock-pass" : "mock-fail");
  head.textContent = (timeUp ? "\u23f0 Time! " : "") + pct + "% \u2014 " + MOCK.correct + " / " + total + (pass ? "  \u00b7  PASS territory" : "  \u00b7  below the ~65% pass line");
  card.appendChild(head);
  Object.keys(MOCK.perDom).forEach(function(d){
    var s = MOCK.perDom[d];
    var row = document.createElement("div");
    row.className = "mock-dom";
    var p = Math.round((s.c / s.t) * 100);
    row.innerHTML = "<span>" + d + "</span><div class='mock-dombar'><div style='width:" + p + "%' class='" + (p >= 65 ? "mock-domok" : "mock-dombad") + "'></div></div><span>" + s.c + "/" + s.t + "</span>";
    card.appendChild(row);
  });
  if(MOCK.missed.length){
    var mh = document.createElement("div");
    mh.className = "mock-missed-h";
    mh.textContent = "Missed \u2014 these come back weighted next time:";
    card.appendChild(mh);
    MOCK.missed.forEach(function(m){
      var d = document.createElement("div");
      d.className = "mock-missed";
      d.textContent = "\u2715 " + m.q.q + "  \u2192  " + m.q.why;
      card.appendChild(d);
    });
  }
  var close = document.createElement("button");
  close.className = "mock-close";
  close.textContent = "Close";
  close.onclick = function(){ h.style.display = "none"; h.innerHTML = ""; MOCK = null; };
  card.appendChild(close);
  h.appendChild(card);
  if(typeof SFX !== "undefined") (pass ? SFX.fanfare() : SFX.womp());
}
(function(){
  if(typeof document === "undefined" || !document.getElementById) return;
  var tryWire = function(){
    var host = document.getElementById("course-bar");
    if(!host) return false;
    var row = host.querySelector && host.querySelector(".course-btns");
    if(!row) return false;
    if(document.getElementById("mock-btn")) return true;
    var b = document.createElement("button");
    b.id = "mock-btn";
    b.textContent = "Mock exam";
    b.title = "Timed JNCIA-format exam \u2014 your past mistakes come back weighted";
    b.onclick = startMockExam;
    row.appendChild(b);
    return true;
  };
  if(!tryWire()) setTimeout(tryWire, 500);
})();
