function nmsServers(){
  return Object.values(devices).filter(d =>
    d.type === "server" && d.powered !== false && d.cfg && d.cfg.services && d.cfg.services.nms);
}
function snmpReachable(from, target){
  if(!from || !target) return false;
  if(target.powered === false) return false;
  if(target.type === "server" || target.type === "host"){
    if(!target.cfg || !target.cfg.ip) return false;
    if(target.type === "server" && !(target.cfg.services && target.cfg.services.snmp)) return false;
    try{ return pingOk(from, target.cfg.ip); }catch(e){ return false; }
  }
  if(target.type === "switch" || target.type === "router"){
    if(!snmpEnabled(target)) return false;
    const ifs = (typeof ifacesOf === "function" ? ifacesOf(target) : []).filter(i => i.ip);
    const me0 = target.d && target.d.me0 && target.d.me0.ip ? [{ ip: target.d.me0.ip }] : [];
    const all = ifs.concat(me0);
    if(!all.length) return false;
    for(const i of all){
      try{ if(pingOk(from, i.ip)) return true; }catch(e){}
    }
    return false;
  }
  return false;
}
function snmpEnabled(dev){
  const c = cfgGet(dev.config, ["snmp", "community"]);
  return !!(c && Object.keys(c).length);
}
function snmpMissingReason(dev){
  if(dev.type === "switch" || dev.type === "router"){
    if(!snmpEnabled(dev)) return "no SNMP community configured";
    const ifs = (typeof ifacesOf === "function" ? ifacesOf(dev) : []).filter(i => i.ip);
    const me0 = dev.d && dev.d.me0 && dev.d.me0.ip;
    if(!ifs.length && !me0) return "no management address";
    return "no SNMP response";
  }
  if(dev.type === "server" && !(dev.cfg && dev.cfg.services && dev.cfg.services.snmp))
    return "snmp service not running";
  return "no SNMP response";
}
function monitorTargets(){
  return Object.values(devices).filter(d =>
    d.type === "switch" || d.type === "router" || d.type === "server" || d.type === "isp");
}
function deviceHealth(dev){
  const issues = [];
  let state = "up";
  if(dev.powered === false){ return { state: "down", issues: ["no power"] }; }
  if(dev.type === "switch" || dev.type === "router"){
    const t = (typeof THERMAL !== "undefined" && THERMAL.devices[dev.id]) || 21;
    if(t >= 45) issues.push("temperature critical " + t.toFixed(0) + "C");
    else if(t >= 35) issues.push("temperature elevated " + t.toFixed(0) + "C");
    for(const pid in (dev.errDisabled || {})) issues.push(pid + " error-disabled");
    const d = D(dev);
    for(const p in (d.portCfg || {})) if(d.portCfg[p].disabled) issues.push(p + " admin down");
    if(typeof NET !== "undefined" && NET.stormLinks && NET.stormLinks.size){
      for(const lid of NET.stormLinks){
        const l = links[lid];
        if(l && (l.a.dev === dev.id || l.b.dev === dev.id)){ issues.push("broadcast storm"); break; }
      }
    }
  }
  for(const lid in links){
    const l = links[lid];
    const mine = l.a.dev === dev.id ? l.a.port : (l.b.dev === dev.id ? l.b.port : null);
    if(mine && l.degraded) issues.push(mine + " receive errors");
  }
  if(dev.type === "server" && dev.cfg && dev.cfg.services){
    const running = Object.keys(dev.cfg.services).filter(k => dev.cfg.services[k]);
    if(!running.length) issues.push("no services running");
  }
  if(issues.some(i => /critical|storm|error-disabled/.test(i))) state = "alarm";
  else if(issues.length) state = "warn";
  return { state, issues };
}
function monitorSnapshot(){
  const nms = nmsServers();
  const rows = [];
  for(const dev of monitorTargets()){
    if(dev.type === "isp") continue;
    const health = deviceHealth(dev);
    let polled = false;
    for(const m of nms){ if(m.id === dev.id || snmpReachable(m, dev)){ polled = true; break; } }
    rows.push({
      id: dev.id,
      name: hostnameOf(dev) || dev.name,
      type: dev.type,
      polled,
      state: !polled ? "unreachable" : health.state,
      issues: polled ? health.issues : [snmpMissingReason(dev)],
    });
  }
  rows.sort((a, b) => {
    const rank = s => s === "alarm" ? 0 : s === "unreachable" ? 1 : s === "warn" ? 2 : 3;
    return rank(a.state) - rank(b.state) || a.name.localeCompare(b.name);
  });
  return { nms: nms.length, rows };
}
let monitorTimer = null;
function closeMonitor(){
  if(monitorTimer){ clearInterval(monitorTimer); monitorTimer = null; }
  const h = document.getElementById("monitor-screen");
  if(h){ h.style.display = "none"; h.innerHTML = ""; }
}
function openMonitor(){
  let h = document.getElementById("monitor-screen");
  if(!h){
    h = document.createElement("div");
    h.id = "monitor-screen";
    document.body.appendChild(h);
  }
  h.style.display = "flex";
  const draw = () => {
    const snap = monitorSnapshot();
    h.innerHTML = "";
    const card = document.createElement("div");
    card.className = "mon-card";
    const top = document.createElement("div");
    top.className = "mon-top";
    const counts = { alarm: 0, warn: 0, up: 0, unreachable: 0 };
    snap.rows.forEach(r => { counts[r.state] = (counts[r.state] || 0) + 1; });
    top.innerHTML = "<span class='mon-title'>Network monitoring</span>" +
      "<span class='mon-pills'>" +
      "<span class='mon-pill mon-alarm'>" + counts.alarm + " alarm</span>" +
      "<span class='mon-pill mon-warn'>" + counts.warn + " warning</span>" +
      "<span class='mon-pill mon-unreach'>" + counts.unreachable + " unreachable</span>" +
      "<span class='mon-pill mon-ok'>" + counts.up + " up</span>" +
      "</span>";
    const close = document.createElement("button");
    close.textContent = "close";
    close.onclick = closeMonitor;
    top.appendChild(close);
    card.appendChild(top);
    if(!snap.nms){
      const warn = document.createElement("div");
      warn.className = "mon-empty";
      warn.textContent = "No monitoring system is running. Place a server, give it an address, then: service start nms " +
        "\u2014 and run service start snmp on the devices you want it to poll. A monitoring screen only ever shows what something is actually polling.";
      card.appendChild(warn);
    }
    if(!snap.rows.length){
      const e = document.createElement("div");
      e.className = "mon-empty";
      e.textContent = "Nothing to monitor yet \u2014 place some devices.";
      card.appendChild(e);
    }
    for(const r of snap.rows){
      const row = document.createElement("div");
      row.className = "mon-row mon-row-" + r.state;
      const dot = document.createElement("span");
      dot.className = "mon-dot mon-dot-" + r.state;
      row.appendChild(dot);
      const nm = document.createElement("span");
      nm.className = "mon-name";
      nm.textContent = r.name;
      row.appendChild(nm);
      const ty = document.createElement("span");
      ty.className = "mon-type";
      ty.textContent = r.type;
      row.appendChild(ty);
      const st = document.createElement("span");
      st.className = "mon-state";
      st.textContent = r.state;
      row.appendChild(st);
      const de = document.createElement("span");
      de.className = "mon-detail";
      de.textContent = r.issues.length ? r.issues.join(" \u00b7 ") : "";
      row.appendChild(de);
      row.onclick = () => { closeMonitor(); if(typeof openCli === "function") openCli(r.id); };
      card.appendChild(row);
    }
    h.appendChild(card);
  };
  draw();
  monitorTimer = setInterval(() => {
    const el = document.getElementById("monitor-screen");
    if(!el || el.style.display === "none"){ closeMonitor(); return; }
    try{ draw(); }catch(e){ closeMonitor(); }
  }, 2500);
}

const INCIDENTS = [
  {
    id: "psu-failure",
    time: "02:14",
    page: "Monitoring lost contact with a core switch. No response to SNMP, no response to ping. Nothing else is alarming yet.",
    setup: ids => { const d = devices[ids.core]; if(d) d.powered = false; },
    checks: [
      { desc: "core-1 is reachable again",
        why: "A device that does not answer is not automatically a dead device \u2014 confirming it is back is the only proof the fix worked.",
        test: ids => devices[ids.core] && devices[ids.core].powered !== false },
      { desc: "A client host can reach its gateway again",
        why: "Restoring the device is not the same as restoring the service. Users care about the second one.",
        test: ids => { const h = devices[ids.pc]; return h && h.cfg && h.cfg.gw && pingOk(h, h.cfg.gw); } },
    ],
    debrief: "A dead core switch takes everything behind it with it. The lesson is the order you work in: confirm power and presence at the device BEFORE touching configuration. Nothing in the config was wrong here, and an engineer who starts with show commands on a box that is not running wastes the outage window.",
  },
  {
    id: "service-crash",
    time: "03:41",
    page: "Users report the internal site is down. The network looks fine \u2014 everything pings, no interface alarms.",
    setup: ids => {
      ensureAppServer(ids);
      const s = devices[ids.srv];
      if(s && s.cfg){ s.cfg.services = s.cfg.services || {}; s.cfg.services.http = false; }
    },
    checks: [
      { desc: "The web service is running again on the server",
        why: "A server that answers ping is only proving its network stack is alive. The service on top is a separate thing that can fail on its own.",
        test: ids => { const s = devices[ids.srv]; return !!(s && s.cfg && s.cfg.services && s.cfg.services.http); } },
      { desc: "A client can actually fetch the site (curl web.lab)",
        why: "End-to-end proof. Resolution, routing and the service all have to work together, and only a real request tests all three at once.",
        test: ids => { const h = devices[ids.pc]; if(!h) return false;
          try{ const r = curlCheck(h, "web.lab"); return !!(r && r.ok); }catch(e){ return false; } } },
    ],
    debrief: "This is the incident that teaches layer discipline. Everything below layer 4 was healthy the whole time, which is exactly why 'the network is down' was the wrong diagnosis. When ping works and the service does not, stop testing the network and go look at what is listening.",
  },
  {
    id: "thermal-event",
    time: "01:58",
    page: "Temperature alarms across a room, then devices dropping off monitoring one by one. Cooling was serviced yesterday.",
    setup: ids => {
      const core = devices[ids.core], acc = devices[ids.acc1];
      if(!core || !acc) return;
      const xs = [core.x, acc.x], ys = [core.y, acc.y];
      const zid = uid("zn");
      zones[zid] = {
        id: zid, name: "Server room", kind: "building",
        x: Math.min.apply(null, xs) - 90, y: Math.min.apply(null, ys) - 90,
        w: Math.abs(core.x - acc.x) + 320, h: Math.abs(core.y - acc.y) + 300, hue: 0,
      };
      const cr = makeCrac(zones[zid].x + 30, zones[zid].y + 30, "CRAC-1", 3500);
      devices[cr].powered = false;
      devices[cr].failed = true;
      for(const id of [ids.core, ids.acc1]){
        const d = devices[id];
        if(d) d.powered = false;
      }
    },
    checks: [
      { desc: "Cooling is running again and the room is under 28C",
        why: "Powering equipment back on before the room is cool just trips the same thermal protection again \u2014 fix the cause before the symptom.",
        test: () => {
          const cracs = Object.values(devices).filter(d => d.type === "crac");
          if(!cracs.some(c => c.powered !== false && !c.failed)) return false;
          const temps = Object.values((typeof THERMAL !== "undefined" && THERMAL.zones) || {}).map(z => z.temp);
          return !temps.length || temps.every(t => t < 28);
        } },
      { desc: "Both switches are powered and staying up",
        why: "Staying up is the point. A device that comes back and then shuts down again means the underlying condition was never addressed.",
        test: ids => [ids.core, ids.acc1].every(id => devices[id] && devices[id].powered !== false) },
    ],
    debrief: "Thermal shutdown is equipment protecting itself, not equipment failing. The trap at 2 AM is treating it as a device fault and power-cycling your way through the night. Cool the room first; the devices will stay up on their own once it is safe for them to.",
  },
  {
    id: "loop-storm",
    time: "04:07",
    page: "An entire segment has gone unusable. Monitoring is timing out intermittently on several devices at once. A contractor was patching cables in that room this evening.",
    setup: ids => {
      const a = devices[ids.core], b = devices[ids.acc1];
      if(!a || !b) return;
      const freeA = a.ports.find(p => !isLinked(a.id, p.id));
      const freeB = b.ports.find(p => !isLinked(b.id, p.id));
      if(freeA && freeB) links[uid("lk")] = { a: { dev: a.id, port: freeA.id }, b: { dev: b.id, port: freeB.id }, kind: "lan" };
      for(const id of [ids.core, ids.acc1]){
        const d = devices[id];
        if(d) cfgDo(d.id, ["delete protocols rstp"]);
      }
    },
    checks: [
      { desc: "The storm is gone",
        why: "A broadcast storm saturates the segment for everyone. Until it stops, nothing else you measure is trustworthy.",
        test: () => typeof NET !== "undefined" && NET.stormLinks && NET.stormLinks.size === 0 },
      { desc: "Spanning tree is protecting the topology",
        why: "Unplugging the extra cable stops today's storm but leaves the network one patch away from the next one. RSTP is the fix that survives the contractor coming back.",
        test: ids => [ids.core, ids.acc1].every(id => devices[id] && D(devices[id]).rstp) },
      { desc: "Traffic flows again between the two switches",
        why: "Breaking the loop must not break the connectivity. If the segment is quiet because nothing can talk, that is a second outage, not a fix.",
        test: ids => { const h = devices[ids.pc]; return h && h.cfg && h.cfg.gw && pingOk(h, h.cfg.gw); } },
    ],
    debrief: "The clue was in the page: someone was patching cables. A redundant cable with no spanning tree is a loop, and a loop at layer 2 is a storm within seconds. Pulling the cable is the fast fix; enabling RSTP is the real one, because it makes the redundancy safe instead of fatal.",
  },
];

let currentIncident = null;
function incidentIds(){
  const sw = Object.values(devices).filter(d => d.type === "switch");
  const srv = Object.values(devices).filter(d => d.type === "server");
  const pcs = Object.values(devices).filter(d => d.type === "host");
  return {
    core: sw[0] && sw[0].id,
    acc1: sw[1] && sw[1].id,
    srv: srv[0] && srv[0].id,
    pc: pcs[0] && pcs[0].id,
  };
}
function buildIncidentSite(){
  const ids = (typeof buildTicketBase === "function") ? buildTicketBase() : {};
  const pcs = Object.values(devices).filter(d => d.type === "host" && d.cfg && d.cfg.gw);
  ids.pc = pcs[0] && pcs[0].id;
  const srv = Object.values(devices).filter(d => d.type === "server");
  ids.srv = srv[0] && srv[0].id;
  return ids;
}
function ensureAppServer(ids){
  if(ids.srv && devices[ids.srv]) return ids.srv;
  const accId = ids.acc1;
  const acc = devices[accId];
  if(!acc) return null;
  const free = acc.ports.find(p => !isLinked(acc.id, p.id));
  if(!free) return null;
  const sid = makeServer(acc.x + 40, acc.y + 160);
  const srv = devices[sid];
  srv.name = "web-1";
  links[uid("lk")] = { a: { dev: sid, port: "eth0" }, b: { dev: accId, port: free.id }, kind: "lan" };
  cfgDo(accId, [
    "set interfaces " + free.id + " unit 0 family ethernet-switching interface-mode access",
    "set interfaces " + free.id + " unit 0 family ethernet-switching vlan members staff",
  ]);
  srv.cfg.ip = "10.0.10.80"; srv.cfg.bits = 24; srv.cfg.gw = "10.0.10.1";
  srv.cfg.services = { dns: true, http: true };
  srv.cfg.records = { "web.lab": "10.0.10.80" };
  const pc = devices[ids.pc];
  if(pc) pc.cfg.ns = "10.0.10.80";
  ids.srv = sid;
  rebuildAllDerived();
  return sid;
}
async function startIncident(pick){
  if(Object.keys(devices).length &&
     !(await modalConfirm("Start a night-shift incident?",
       "This replaces the canvas with the standard site, then breaks something the way it would break at 3 AM \u2014 with a pager message, not a description of the fault.",
       "Page me")))
    return;
  if(typeof pushUndo === "function") pushUndo();
  const ids = buildIncidentSite();
  const inc = pick || INCIDENTS[Math.floor(Math.random() * INCIDENTS.length)];
  try{ inc.setup(ids); }catch(e){}
  rebuildAllDerived();
  currentIncident = { inc, ids, started: Date.now() };
  currentTicket = null;
  currentScenario = {
    id: "incident",
    title: "Incident " + inc.time + " \u2014 " + inc.id,
    isTicket: true,
    severity: "critical",
    desc: "PAGER " + inc.time + "\n\n\u201c" + inc.page + "\u201d\n\nYou were asleep ten seconds ago. Nobody has told you what is broken \u2014 that is your job.",
    hints: [
      "Start with what you can observe, not what you assume. The monitoring screen (View menu) shows what is reachable right now.",
      "Work the layers upward: is it powered, is it reachable, is the service on top of it running?",
      "Every incident here has a clue in the pager text. Read it again before you change anything.",
    ],
    checks: inc.checks.map(c => ({ desc: c.desc, why: c.why, test: () => { try{ return !!c.test(ids); }catch(e){ return false; } } })),
  };
  xpChallengeToken = "incident:" + uid("i");
  xpChallengeAwarded = false;
  hintIndex = 0;
  document.getElementById("hint-list").innerHTML = "";
  if(typeof resetHintBtn === "function") resetHintBtn();
  document.getElementById("scenario-select").selectedIndex = -1;
  if(typeof openTablet === "function") openTablet("scen");
  renderScenarioMeta();
  touchState();
  if(typeof SFX !== "undefined") SFX.alert();
}
function incidentDebrief(){
  if(!currentIncident) return;
  const inc = currentIncident.inc;
  const mins = Math.max(1, Math.round((Date.now() - currentIncident.started) / 60000));
  modalConfirm("Incident resolved \u2014 " + inc.time,
    "Time to resolution: about " + mins + " minute" + (mins === 1 ? "" : "s") + ".\n\n" + inc.debrief,
    "Back to bed");
  currentIncident = null;
}
async function pickIncident(){
  const v = await modalChoice("Night shift",
    "You are on call. Pick a specific incident, or let it surprise you \u2014 surprise is closer to the real thing.", [
    { value: "random", label: "Random incident", desc: "You will not know what broke until you investigate" },
  ].concat(INCIDENTS.map(i => ({ value: i.id, label: i.time + " \u2014 " + i.id, desc: i.page.slice(0, 70) + "\u2026" }))));
  if(v === null) return;
  if(v === "random") return startIncident(null);
  return startIncident(INCIDENTS.find(i => i.id === v));
}
