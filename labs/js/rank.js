var RANKS = [
  { title: "Trainee NOC Technician", xp: 0 },
  { title: "NOC Technician", xp: 60 },
  { title: "Network Technician", xp: 150 },
  { title: "Associate Network Engineer", xp: 300 },
  { title: "Network Engineer", xp: 500 },
  { title: "Senior Network Engineer", xp: 750 },
  { title: "Network Architect", xp: 1050 },
  { title: "Principal Network Architect", xp: 1400 },
  { title: "Datacenter Chief Architect", xp: 1800 },
];

function xpTotal(){
  try{ return parseInt(localStorage.getItem("junoslab-xp") || "0", 10) || 0; }catch(e){ return 0; }
}
function xpSave(v){
  try{ localStorage.setItem("junoslab-xp", String(v)); }catch(e){}
}
function rankIndexFor(xp){
  var idx = 0;
  for(var i = 0; i < RANKS.length; i++) if(xp >= RANKS[i].xp) idx = i;
  return idx;
}
function rankFor(xp){
  return RANKS[rankIndexFor(xp)];
}
function rankProgress(){
  var xp = xpTotal();
  var idx = rankIndexFor(xp);
  var cur = RANKS[idx], next = RANKS[idx + 1];
  if(!next) return { xp: xp, rank: cur, next: null, pct: 100 };
  var span = next.xp - cur.xp;
  var into = xp - cur.xp;
  return { xp: xp, rank: cur, next: next, pct: Math.round((into / span) * 100) };
}
function promotionOverlay(oldRank, newRank){
  var h = document.getElementById("mock-exam");
  if(!h){ h = document.createElement("div"); h.id = "mock-exam"; document.body.appendChild(h); }
  var wasShowing = h.style.display === "flex";
  if(wasShowing) return;
  h.innerHTML = "";
  h.style.display = "flex";
  var card = document.createElement("div");
  card.className = "mock-card";
  var head = document.createElement("div");
  head.className = "mock-result mock-pass";
  head.textContent = "Promoted";
  card.appendChild(head);
  var body = document.createElement("div");
  body.className = "mock-q";
  body.style.textAlign = "center";
  body.innerHTML = oldRank.title + "<br><span style='opacity:.55'>\u2193</span><br><b>" + newRank.title + "</b>";
  card.appendChild(body);
  var close = document.createElement("button");
  close.className = "mock-close";
  close.textContent = "Back to it";
  close.onclick = function(){ h.style.display = "none"; h.innerHTML = ""; };
  card.appendChild(close);
  h.appendChild(card);
}
function awardXp(amount, reason){
  if(!amount || amount <= 0) return;
  var before = xpTotal();
  var beforeRank = rankFor(before);
  var after = before + Math.round(amount);
  xpSave(after);
  var afterRank = rankFor(after);
  if(afterRank.title !== beforeRank.title){
    if(typeof SFX !== "undefined") SFX.fanfare();
    setTimeout(function(){ promotionOverlay(beforeRank, afterRank); }, 500);
  }
  if(typeof renderRankBadge === "function") renderRankBadge();
  return after;
}
function renderRankBadge(){
  var host = document.getElementById("rank-badge");
  if(!host) return;
  var p = rankProgress();
  host.innerHTML = "";
  var top = document.createElement("div");
  top.className = "rank-top";
  var title = document.createElement("span");
  title.className = "rank-title";
  title.textContent = p.rank.title;
  top.appendChild(title);
  var xpEl = document.createElement("span");
  xpEl.className = "rank-xp";
  xpEl.textContent = p.xp + " XP";
  top.appendChild(xpEl);
  host.appendChild(top);
  var bar = document.createElement("div");
  bar.className = "rank-bar";
  var fill = document.createElement("div");
  fill.className = "rank-fill";
  fill.style.width = (p.next ? p.pct : 100) + "%";
  bar.appendChild(fill);
  host.appendChild(bar);
  if(p.next){
    var next = document.createElement("div");
    next.className = "rank-next";
    next.textContent = (p.next.xp - p.xp) + " XP to " + p.next.title;
    host.appendChild(next);
  } else {
    var maxed = document.createElement("div");
    maxed.className = "rank-next";
    maxed.textContent = "Top of the ladder";
    host.appendChild(maxed);
  }
}
