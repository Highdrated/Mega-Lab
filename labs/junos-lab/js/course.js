var TRACKS = {
  jncia: {
    name: "JNCIA-Junos",
    label: "JNCIA path",
    course: [
      { g: "osi" }, { g: "subnetting" }, { s: "basic-connect" },
      { g: "vlan" }, { s: "vlan-split" }, { s: "trunk-span" }, { s: "irb-intervlan" },
      { g: "rstp" }, { s: "rstp-loop" },
      { g: "lacp" }, { s: "lacp-bundle" },
      { g: "junos-arch" }, { s: "commit-confirmed" },
      { g: "dhcp" }, { s: "dhcp-serve" },
      { g: "filters" }, { s: "filtered-segment" },
      { g: "ospf" }, { s: "ospf-backbone" },
      { g: "dia" }, { s: "isp-onboarding" }, { s: "nat-edge" },
      { g: "bgp" }, { s: "speak-bgp" },
      { s: "interconnect-recovery" },
    ],
    domains: {
      "Networking fundamentals": ["osi", "subnetting", "basic-connect"],
      "Junos OS fundamentals": ["junos-arch", "commit-confirmed"],
      "CLI & configuration": ["vlan", "vlan-split", "trunk-span", "irb-intervlan", "rstp", "rstp-loop", "lacp", "lacp-bundle"],
      "Monitoring & maintenance": ["dhcp", "dhcp-serve", "interconnect-recovery"],
      "Routing fundamentals": ["ospf", "ospf-backbone", "dia", "isp-onboarding", "nat-edge", "bgp", "speak-bgp"],
      "Policy & filters": ["filters", "filtered-segment"],
    },
  },
  netplus: {
    name: "CompTIA Network+",
    label: "Network+ path",
    course: [
      { g: "osi" }, { g: "cabling" }, { g: "subnetting" }, { s: "basic-connect" },
      { g: "vlan" }, { s: "vlan-split" }, { s: "irb-intervlan" },
      { g: "rstp" }, { s: "rstp-loop" },
      { g: "lacp" }, { s: "lacp-bundle" },
      { g: "ecmp" },
      { g: "wireless" },
      { g: "dhcp" }, { s: "dhcp-serve" },
      { g: "lldp" },
      { g: "ospf" }, { s: "ospf-backbone" },
      { g: "dia" }, { s: "isp-onboarding" }, { s: "nat-edge" },
      { g: "bgp" },
      { g: "vrrp" },
      { g: "cloudwan" },
      { g: "netsec" }, { g: "filters" }, { s: "filtered-segment" },
      { g: "troubleshooting" }, { s: "interconnect-recovery" },
    ],
    domains: {
      "Networking concepts": ["osi", "subnetting", "cloudwan", "basic-connect"],
      "Network implementation": ["vlan", "vlan-split", "irb-intervlan", "rstp", "rstp-loop", "lacp", "lacp-bundle", "ecmp", "wireless", "ospf", "ospf-backbone", "bgp", "vrrp"],
      "Network operations": ["cabling", "dhcp", "dhcp-serve", "lldp", "dia", "isp-onboarding", "nat-edge"],
      "Network security": ["netsec", "filters", "filtered-segment"],
      "Network troubleshooting": ["troubleshooting", "interconnect-recovery"],
    },
  },
};

function activeTrackId(){
  try{
    var t = localStorage.getItem("junoslab-track");
    return TRACKS[t] ? t : "jncia";
  }catch(e){ return "jncia"; }
}
function activeTrack(){ return TRACKS[activeTrackId()]; }
function setTrack(id){
  if(!TRACKS[id]) return;
  try{ localStorage.setItem("junoslab-track", id); }catch(e){}
  COURSE = TRACKS[id].course;
  COURSE_DOMAINS = TRACKS[id].domains;
  if(typeof renderCourseBar === "function") renderCourseBar();
  if(typeof renderProtoTab === "function" && document.getElementById("tab-proto") &&
     document.getElementById("tab-proto").style.display !== "none") renderProtoTab();
}
var COURSE = TRACKS[activeTrackId()].course;
var COURSE_DOMAINS = TRACKS[activeTrackId()].domains;

function quizDoneSet(gid){
  try{ return new Set((localStorage.getItem("junoslab-quizdone:" + gid) || "").split(",").filter(Boolean)); }
  catch(e){ return new Set(); }
}
function markQuizDone(gid, qi){
  var set = quizDoneSet(gid);
  set.add(String(qi));
  try{ localStorage.setItem("junoslab-quizdone:" + gid, Array.from(set).join(",")); }catch(e){}
}
function guideById(id){
  return PROTO_GUIDES.find(function(g){ return g.id === id; });
}
function unitDone(u){
  if(u.s) return !!(typeof PROGRESS !== "undefined" && PROGRESS[u.s] && PROGRESS[u.s].done);
  var g = guideById(u.g);
  if(!g || !g.quiz) return false;
  return quizDoneSet(u.g).size >= g.quiz.length;
}
function unitTitle(u){
  if(u.s){
    var sc = SCENARIOS.find(function(x){ return x.id === u.s; });
    return sc ? "Scenario: " + sc.title : u.s;
  }
  var g = guideById(u.g);
  return g ? "Guide: " + g.title : u.g;
}
function courseNext(){
  for(var i = 0; i < COURSE.length; i++) if(!unitDone(COURSE[i])) return { unit: COURSE[i], idx: i };
  return null;
}
function courseDoneCount(){
  return COURSE.filter(unitDone).length;
}
function courseDomainStats(){
  var out = {};
  for(var dom in COURSE_DOMAINS){
    var ids = COURSE_DOMAINS[dom];
    var done = ids.filter(function(id){
      return unitDone(guideById(id) ? { g: id } : { s: id });
    }).length;
    out[dom] = { done: done, total: ids.length };
  }
  return out;
}
function courseGoTo(u){
  if(u.g){
    var g = guideById(u.g);
    if(!g) return;
    protoView = { page: "guide", guide: g };
    if(typeof setTabletTab === "function") setTabletTab("proto");
    if(typeof renderProtoTab === "function") renderProtoTab();
  } else if(u.s){
    if(typeof protoJumpToScenario === "function") protoJumpToScenario(u.s);
  }
}
function renderCourseBar(){
  var host = document.getElementById("course-bar");
  if(!host) return;
  host.innerHTML = "";
  var rankHost = document.createElement("div");
  rankHost.id = "rank-badge";
  host.appendChild(rankHost);
  if(typeof renderRankBadge === "function") renderRankBadge();
  var next = courseNext();
  var done = courseDoneCount();
  var strip = document.createElement("div");
  strip.className = "course-progress";
  var fill = document.createElement("div");
  fill.className = "course-fill";
  fill.style.width = Math.round((done / COURSE.length) * 100) + "%";
  strip.appendChild(fill);
  host.appendChild(strip);
  var label = document.createElement("div");
  label.className = "course-label";
  label.textContent = "JNCIA path \\u00b7 " + done + " / " + COURSE.length + " units";
  host.appendChild(label);
  var row = document.createElement("div");
  row.className = "course-btns";
  if(next){
    var b = document.createElement("button");
    b.className = "course-continue";
    b.textContent = (done === 0 ? "Start: " : "Continue: ") + unitTitle(next.unit);
    b.onclick = function(){ courseGoTo(next.unit); if(typeof SFX !== "undefined") SFX.tick(); };
    row.appendChild(b);
  } else {
    var doneEl = document.createElement("div");
    doneEl.className = "course-label";
    doneEl.textContent = "\\ud83c\\udf93 Path complete — Exam mode is your arena now";
    row.appendChild(doneEl);
  }
  var tsw = document.createElement("button");
  tsw.textContent = "Track: " + activeTrack().name;
  tsw.title = "Switch between the JNCIA-Junos and CompTIA Network+ learning paths";
  tsw.onclick = function(){
    modalChoice("Choose your certification track",
      "Both tracks use the same lab and share progress \u2014 guides and scenarios you have already completed stay completed.", [
      { value: "jncia", label: TRACKS.jncia.name, desc: "Juniper-focused: Junos CLI, architecture, config and routing depth" },
      { value: "netplus", label: TRACKS.netplus.name, desc: "Vendor-neutral: adds cabling, wireless, cloud/WAN, security and troubleshooting methodology" },
    ]).then(function(v){ if(v) setTrack(v); });
  };
  row.appendChild(tsw);
  var qs = document.createElement("button");
  qs.textContent = "15-min session";
  qs.title = "Two subnet drills, one review question, then your next step";
  qs.onclick = quickSession;
  row.appendChild(qs);
  host.appendChild(row);
}
function courseOnComplete(scenId){
  var next = courseNext();
  renderCourseBar();
  var host = document.getElementById("course-next");
  if(!host || !next) return;
  host.innerHTML = "";
  var card = document.createElement("div");
  card.className = "course-nextcard";
  var t = document.createElement("div");
  t.textContent = "\\u2705 Done! Next up: " + unitTitle(next.unit);
  card.appendChild(t);
  var b = document.createElement("button");
  b.textContent = "Go \\u2192";
  b.onclick = function(){ host.innerHTML = ""; courseGoTo(next.unit); };
  card.appendChild(b);
  host.appendChild(card);
  setTimeout(function(){ if(host.firstChild === card) host.innerHTML = ""; }, 30000);
}
function randomReviewQuestion(){
  var pool = [];
  PROTO_GUIDES.forEach(function(g){
    if(!g.ready || !g.quiz) return;
    var done = quizDoneSet(g.id);
    g.quiz.forEach(function(q, qi){ if(done.has(String(qi))) pool.push({ g: g, q: q }); });
  });
  if(!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
function quickSession(){
  var next = courseNext();
  var steps = [
    { value: "drill", label: "1 \\u00b7 Two subnetting drills", desc: "Warm the math up — opens the drill" },
    { value: "review", label: "2 \\u00b7 One review question", desc: "Something you answered before — spaced repetition, the cheap way" },
    { value: "next", label: "3 \\u00b7 " + (next ? unitTitle(next.unit) : "Free practice"), desc: next ? "Your next step on the JNCIA path" : "Path complete — pick any scenario" },
  ];
  modalChoice("15-minute session", "Three steps, in order — small, daily, relentless. Pick where to start:", steps).then(function(v){
    if(v === "drill"){ courseGoTo({ g: "subnetting" }); }
    else if(v === "review"){
      var r = randomReviewQuestion();
      if(!r){ modalConfirm("Nothing to review yet", "Answer some guide quiz questions first — they become your review pool.", "OK"); return; }
      modalChoice("Review \\u00b7 " + r.g.title, r.q.q, r.q.opts.map(function(o, oi){ return { value: oi, label: o }; })).then(function(ans){
        if(ans === null) return;
        var right = ans === r.q.right;
        if(typeof SFX !== "undefined") (right ? SFX.ding : SFX.womp)();
        modalConfirm(right ? "\\u2713 Still got it" : "\\u2715 Worth re-reading", r.q.why, "OK");
      });
    }
    else if(v === "next" && next){ courseGoTo(next.unit); }
  });
}
(function(){
  if(typeof document === "undefined" || !document.getElementById) return;
  var pager = document.getElementById("scen-pager");
  if(!pager || !pager.parentNode) return;
  var bar = document.createElement("div");
  bar.id = "course-bar";
  var nextHost = document.createElement("div");
  nextHost.id = "course-next";
  pager.parentNode.insertBefore(bar, pager);
  pager.parentNode.insertBefore(nextHost, pager);
  renderCourseBar();
})();
