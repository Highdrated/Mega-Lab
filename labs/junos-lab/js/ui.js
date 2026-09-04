/* ============================================================
   COMPLETIONS ('?' and Tab)
   ============================================================ */
function completionText(items){
  if(!items || !items.length) return "(no completions here)";
  const w = Math.max(...items.map(i => i.label.length)) + 4;
  return "Possible completions:\n" + items.map(i => "  " + pad(i.label, w) + (i.help || "")).join("\n");
}
const HOST_COMPLETIONS = [
  { label: "ip", help: "addresses and routes (ip addr / ip route)" },
  { label: "dhclient", help: "get an address via DHCP (dhclient eth0)" },
  { label: "ping", help: "test reachability" },
  { label: "traceroute", help: "show the L3 path" },
  { label: "arp", help: "show the ARP cache (arp -a)" },
  { label: "hostname", help: "rename this host" },
  { label: "help", help: "quick reference" },
];
function completionsFor(dev, input){
  const endsSpace = /\s$/.test(input) || input.trim() === "";
  const tokens = input.trim() === "" ? [] : input.trim().split(/\s+/);
  const partial = endsSpace ? "" : (tokens.pop() || "");
  if(dev.type === "host" || dev.type === "server"){
    if(dev.cli.sshTo && devices[dev.cli.sshTo]) return completionsFor(devices[dev.cli.sshTo], input);
    const extra = dev.type === "server"
      ? [{ label: "service", help: "start/stop dns, http and syslog" }, { label: "dns", help: "add/del/list name records" }]
      : [];
    return { items: [...HOST_COMPLETIONS, ...extra,
      { label: "nameserver", help: "point this machine at a DNS server" },
      { label: "nslookup", help: "resolve a name via your nameserver" },
      { label: "curl", help: "fetch a web page by name or IP" },
      { label: "ssh", help: "open a CLI session on a switch, router or server" },
    ].filter(i => i.label.startsWith(tokens.length ? "" : partial)) };
  }
  if(dev.type === "isp") return { items: [{ label: "show interfaces terse", help: "this link's public IP" }] };

  if(dev.cli.stage || dev.powered === false) return { items: [] };
  if(dev.cli.mode === "op"){
    const items = trieCompletionsAll(OP_TRIE[dev.type], tokens, dev, partial);
    if(!items.length){ const res = trieWalk(OP_TRIE[dev.type], tokens, dev); return { err: res.err || "no completions" }; }
    return { items };
  }
  // config mode
  if(tokens.length === 0){
    const cmds = [
      ["set", "Add or change a statement"], ["delete", "Remove a statement"],
      ["show", "Candidate config at this level (show | compare = diff)"],
      ["edit", "Descend into a hierarchy level"], ["up", "Up one level"], ["top", "Back to the top level"],
      ["commit", "Activate the candidate (also: confirmed <m>, check, and-quit)"],
      ["rollback", "Reset the candidate (0 = committed config)"],
      ["run", "Run an operational command"], ["exit", "Leave this level / config mode"],
    ];
    return { items: cmds.filter(([c]) => c.startsWith(partial)).map(([c, h]) => ({ label: c, help: h })) };
  }
  const word = tokens[0];
  const matches = CFG_COMMANDS.filter(c => c.startsWith(word));
  const cmdName = CFG_COMMANDS.includes(word) ? word : (matches.length === 1 ? matches[0] : null);
  if(!cmdName) return { err: `unknown command: "${word}"` };
  const rest = tokens.slice(1);
  if(cmdName === "set" || cmdName === "edit"){
    const full = dev.cli.editKeys.concat(rest);
    const items = trieCompletionsAll(CFG_TRIE[dev.type], full, dev, partial);
    if(!items.length){ const res = trieWalk(CFG_TRIE[dev.type], full, dev); return { err: res.err || "no completions" }; }
    return { items };
  }
  if(cmdName === "delete" || cmdName === "show"){
    const res = resolveTreePath(dev.candidate, dev.cli.editKeys.concat(rest));
    if(typeof res.err === "string") return { items: [] };
    const node = res.arrayItem !== undefined ? [] : res.node;
    let items = [];
    if(Array.isArray(node)) items = node.map(v => ({ label: String(v), help: "" }));
    else if(node && typeof node === "object") items = Object.keys(node).map(k => ({ label: k, help: "" }));
    return { items: items.filter(i => i.label.startsWith(partial)) };
  }
  if(cmdName === "run"){
    const items = trieCompletionsAll(OP_TRIE[dev.type], rest, dev, partial);
    if(!items.length){ const res = trieWalk(OP_TRIE[dev.type], rest, dev); return { err: res.err || "no completions" }; }
    return { items };
  }
  if(cmdName === "commit") return { items: [
    { label: "<[Enter]>", help: "Commit the candidate now" },
    { label: "check", help: "Validate without committing" },
    { label: "confirmed", help: "Commit with automatic rollback unless confirmed" },
    { label: "and-quit", help: "Commit, then leave configuration mode" },
  ].filter(i => i.label.startsWith(partial) || i.label.startsWith("<")) };
  if(cmdName === "rollback") return { items: [
    { label: "0", help: "Discard uncommitted changes (candidate = committed)" },
    ...dev.cfgHistory.map((_, i) => ({ label: String(i + 1), help: i === 0 ? "One commit ago" : `${i + 1} commits ago` })),
  ] };
  return { items: [] };
}

/* ============================================================
   SVG RENDER
   ============================================================ */
const svg = document.getElementById("svg");
const NS = "http://www.w3.org/2000/svg";
let worldG = null, animLayer = null;

function portLayout(dev){
  const n = dev.ports.length;
  if(n <= 1) return { rows: 1, cols: 1 };
  const rows = n <= 8 ? 1 : 2;
  return { rows, cols: Math.ceil(n / rows) };
}
function devNaturalWidth(dev){
  if(dev.ports.length <= 1) return 92;
  const { cols } = portLayout(dev);
  return Math.max(178, cols * 18 + 28);
}
/* racked gear stretches to the rack's full interior width, like real 19-inch kit */
function devWidth(dev){ return dev.rackW || devNaturalWidth(dev); }
function devHeaderH(){ return 40; }
function devHeight(dev){
  if(dev.ports.length <= 1) return 58;
  const { rows } = portLayout(dev);
  return devHeaderH() + rows * 16 + 14;
}
function portRelPos(dev, i){
  const { cols } = portLayout(dev);
  const w = devWidth(dev);
  const spacing = (w - 16) / (cols + 1);
  return [8 + spacing * ((i % cols) + 1), devHeaderH() + Math.floor(i / cols) * 16 + 12];
}
function portXY(dev, portId){
  let i = dev.ports.findIndex(p => p.id === portId);
  if(i === -1){
    if(portId === "me0") return [dev.x + devWidth(dev) - 75, dev.y + 12];
    if(portId === "con") return [dev.x + devWidth(dev) - 52, dev.y + 12];
    // effective ports (ae bundles, irb) — anchor to a member port or the device center
    if(dev.type === "switch" && dev.d && dev.d.aes[portId] && dev.d.aes[portId].members.length)
      return portXY(dev, dev.d.aes[portId].members[0]);
    return [dev.x + devWidth(dev) / 2, dev.y + devHeight(dev) / 2];
  }
  const [x, y] = portRelPos(dev, i);
  return [dev.x + x, dev.y + y];
}
function devCenter(dev){ return [dev.x + devWidth(dev) / 2, dev.y + devHeight(dev) / 2]; }
/* ---------- cable pathways: trays route the cables, like real rooms ----------
   A tray is a zone (kind "tray") with a level. Cables near a tray at both ends
   are auto-routed along its spine; the length gains the up-and-down drops
   people forget to estimate. No tray in reach = the old direct line. */
const TRAY_LEVELS = {
  ceiling:    { label: "ceiling basket",  dropM: 2.7, cap: 40 },
  wall:       { label: "wall trunking",   dropM: 0.6, cap: 20 },
  underfloor: { label: "underfloor duct", dropM: 0.3, cap: 50 },
};
const TRAY_PICKUP = 240;
function allTrays(){ return Object.values(zones).filter(z => z.kind === "tray"); }
function traySpine(z){
  return z.w >= z.h
    ? [[z.x + 8, z.y + z.h / 2], [z.x + z.w - 8, z.y + z.h / 2]]
    : [[z.x + z.w / 2, z.y + 8], [z.x + z.w / 2, z.y + z.h - 8]];
}
function nearestOnSeg(p, a, b){
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2));
  return [a[0] + t * dx, a[1] + t * dy];
}
function ptDist(p, q){ return Math.hypot(p[0] - q[0], p[1] - q[1]); }
function traysTouch(t1, t2){
  const s1 = traySpine(t1), s2 = traySpine(t2);
  const near = (p, s) => ptDist(p, nearestOnSeg(p, s[0], s[1])) < 34;
  return near(s1[0], s2) || near(s1[1], s2) || near(s2[0], s1) || near(s2[1], s1);
}
function trayComponents(){
  const ts = allTrays(), seen = new Set(), comps = [];
  for(const t0 of ts){
    if(seen.has(t0.id)) continue;
    const comp = [], stack = [t0];
    seen.add(t0.id);
    while(stack.length){
      const cur = stack.pop();
      comp.push(cur);
      for(const o of ts) if(!seen.has(o.id) && traysTouch(cur, o)){ seen.add(o.id); stack.push(o); }
    }
    comps.push(comp);
  }
  return comps;
}
function trayPath(comp, fromTray, fromPt, toTray, toPt){
  if(fromTray === toTray) return { pts: [fromPt, toPt], chain: [fromTray] };
  const prev = { [fromTray.id]: null };
  const q = [fromTray];
  while(q.length){
    const cur = q.shift();
    if(cur === toTray) break;
    for(const o of comp) if(!(o.id in prev) && traysTouch(cur, o)){ prev[o.id] = cur; q.push(o); }
  }
  if(!(toTray.id in prev)) return null;
  const chain = [];
  for(let cur = toTray; cur; cur = prev[cur.id]) chain.unshift(cur);
  const pts = [fromPt];
  for(let i = 0; i < chain.length - 1; i++){
    const sA = traySpine(chain[i]), sB = traySpine(chain[i + 1]);
    const c0 = nearestOnSeg(sB[0], sA[0], sA[1]), c1 = nearestOnSeg(sB[1], sA[0], sA[1]);
    const jA = ptDist(c0, sB[0]) < ptDist(c1, sB[1]) ? c0 : c1;
    pts.push(jA, nearestOnSeg(jA, sB[0], sB[1]));
  }
  pts.push(toPt);
  return { pts, chain };
}
function linkRoute(l){
  const devA = devices[l.a.dev], devB = devices[l.b.dev];
  if(!devA || !devB) return null;
  const A = portXY(devA, l.a.port), B = portXY(devB, l.b.port);
  const direct = { pts: [A, B], m: Math.round(ptDist(A, B) * M_PER_PX), trayIds: [], level: null };
  const kind = l.kind || "lan";
  if(kind === "wifi" || kind === "console") return direct;
  if(typeof rackOf === "function"){
    const rA = rackOf(l.a.dev), rB = rackOf(l.b.dev);
    if(rA && rA === rB) return direct;   // in-rack DACs never leave the rack
  }
  let best = null;
  for(const comp of trayComponents()){
    let eA = null, eB = null;
    for(const t2 of comp){
      const s = traySpine(t2);
      const pA = nearestOnSeg(A, s[0], s[1]), pB = nearestOnSeg(B, s[0], s[1]);
      if(ptDist(A, pA) < (eA ? ptDist(A, eA.pt) : TRAY_PICKUP)) eA = { tray: t2, pt: pA };
      if(ptDist(B, pB) < (eB ? ptDist(B, eB.pt) : TRAY_PICKUP)) eB = { tray: t2, pt: pB };
    }
    if(!eA || !eB) continue;
    const mid = trayPath(comp, eA.tray, eA.pt, eB.tray, eB.pt);
    if(!mid) continue;
    const pts = [A, ...mid.pts, B];
    let px = 0;
    for(let i = 0; i < pts.length - 1; i++) px += ptDist(pts[i], pts[i + 1]);
    const lvlA = TRAY_LEVELS[eA.tray.level || "ceiling"] || TRAY_LEVELS.ceiling;
    const lvlB = TRAY_LEVELS[eB.tray.level || "ceiling"] || TRAY_LEVELS.ceiling;
    const m = Math.round(px * M_PER_PX + lvlA.dropM + lvlB.dropM);
    if(!best || m < best.m)
      best = { pts, m, trayIds: mid.chain.map(t2 => t2.id), level: eA.tray.level || "ceiling" };
  }
  return best || direct;
}
function trayFillCounts(){
  const fill = {};
  if(!allTrays().length) return fill;
  for(const l of Object.values(links)){
    const r = linkRoute(l);
    if(r) for(const tid of r.trayIds) fill[tid] = (fill[tid] || 0) + 1;
  }
  return fill;
}
function polyMid(pts){
  let total = 0;
  for(let i = 0; i < pts.length - 1; i++) total += ptDist(pts[i], pts[i + 1]);
  let want = total / 2;
  for(let i = 0; i < pts.length - 1; i++){
    const seg = ptDist(pts[i], pts[i + 1]);
    if(want <= seg){
      const t = seg ? want / seg : 0;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t];
    }
    want -= seg;
  }
  return pts[0];
}
function linkLenM(l){
  const r = linkRoute(l);
  return r ? r.m : 0;
}

function el(tag, attrs, parent){
  const e = document.createElementNS(NS, tag);
  for(const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  if(parent) parent.appendChild(e);
  return e;
}

function portTitle(dev, portId){
  if(dev.type === "ap")
    return portId === "eth0"
      ? `eth0 — wired uplink (cable this into an access port of the AP's VLAN)`
      : "wireless association";
  if(portId === "me0") return "me0 — out-of-band management port" +
    (dev.d && dev.d.me0 ? ` (${dev.d.me0.ip}/${dev.d.me0.bits})` : " (no address)") + " — carries no user traffic";
  if(portId === "con") return "CON — serial console port — no network traffic (Console cables go here)";
  if(dev.type === "host" || dev.type === "server")
    return `eth0 — ${dev.cfg.ip ? dev.cfg.ip + "/" + dev.cfg.bits : "no IP"}` +
      (dev.type === "server" ? "  (server)" : "") +
      '\n(this jack IS "eth0" — Linux\'s name for the machine\'s first wired card; "dev eth0" in commands means this)';
  if(dev.type === "isp") return `wan0 — ${dev.cfg.ip}/${dev.cfg.bits} (public)`;
  const d = D(dev);
  if(dev.type === "router"){
    const l3 = d.l3ports[portId];
    const pc = d.portCfg[portId] || {};
    return `${portId} — ${l3 ? l3.ip + "/" + l3.bits : "no address"}${pc.disabled ? " (admin down)" : ""}`;
  }
  const pc = d.portCfg[portId] || {};
  let t = `${portId} — ${pc.mode} [${(pc.vlanNames || []).join(" ")}]`;
  if(pc.ae) t = `${portId} — member of ${pc.ae}`;
  if(pc.disabled) t += " (admin down)";
  if(dev.errDisabled[portId]) t += " (ERROR-DISABLED: storm control)";
  if(NET && NET.blocked.has(dev.id + ":" + portId)) t += " (RSTP blocking)";
  return t;
}

/* ---------- traffic: a rolling one-minute ledger of real packet journeys ---------- */
var TRAFFIC = { events: [], cum: {} };   // cum["lid|toDevId"] = lifetime packets toward that device
var probeOn = false, probePos = null;
const PROBE_R = 150;
function trafficBump(lid, toDevId){
  TRAFFIC.events.push([Date.now(), lid]);
  if(TRAFFIC.events.length > 3000) TRAFFIC.events.splice(0, 800);
  const k = lid + "|" + (toDevId || "?");
  TRAFFIC.cum[k] = (TRAFFIC.cum[k] || 0) + 1;
}
/* lifetime in/out counters for one device's port, real-counter style */
function trafficPortCounters(devId, lid){
  const l = links[lid];
  if(!l) return { input: 0, output: 0 };
  const farDev = l.a.dev === devId ? l.b.dev : l.a.dev;
  return {
    input: TRAFFIC.cum[lid + "|" + devId] || 0,
    output: TRAFFIC.cum[lid + "|" + farDev] || 0,
  };
}
function trafficStats(windowMs){
  const cut = Date.now() - (windowMs || 60000);
  const per = {}; let total = 0;
  for(const [ts, lid] of TRAFFIC.events){
    if(ts < cut) continue;
    total++; per[lid] = (per[lid] || 0) + 1;
  }
  return { total, per };
}
function trafficCount(segs){
  try{ for(const s of (segs || [])) if(s && s.link) trafficBump(s.link, s.dev); }catch(e){}
}
var RENDER_TRAFFIC = { total: 0, per: {} };
var RENDER_TRAYFILL = {};
function render(){
  if(!svg) return;
  svg.innerHTML = "";
  worldG = el("g", { id: "world", transform: `translate(${view.x},${view.y}) scale(${view.scale})` }, svg);
  const zoneLayer = el("g", {}, worldG);
  const zRank = z => ({ building: 0, tray: 1, rack: 2, desk: 2 })[z.kind || "building"] || 0;
  Object.values(zones)
    .sort((a, b) => (zRank(a) - zRank(b)) || (b.w * b.h) - (a.w * a.h))
    .forEach(z => renderZone(z, zoneLayer));
  const linkLayer = el("g", {}, worldG);
  const devLayer = el("g", {}, worldG);
  animLayer = el("g", {}, worldG);
  RENDER_TRAFFIC = trafficStats(60000);
  RENDER_TRAYFILL = (typeof trayFillCounts === "function" && allTrays().length) ? trayFillCounts() : {};
  Object.entries(links).forEach(([lid, l]) => renderLink(lid, l, linkLayer));
  Object.values(devices).forEach(dev => renderDevice(dev, devLayer));
  updateScaleBar();
  renderStatusbar();
  renderVlanLegend();
  renderStatusRow();
  if(lensOn) buildLens();
}
function collectStatuses(){
  const out = [];
  const add = (sev, text, devId) => out.push({ sev, text, devId });
  for(const d of Object.values(devices)){
    if(d.failed){ add("warn", d.name + ": simulated failure (what-if)", d.id); continue; }
    if(d.type === "switch" || d.type === "router"){
      if(d.powered === false) add("warn", d.name + ": powered off", d.id);
      if(d.brandNew && d.powered !== false) add("info", d.name + ": day-zero setup incomplete", d.id);
      if(d.commitPending) add("warn", d.name + ": commit-confirmed rollback timer running", d.id);
      else if(d.powered !== false && JSON.stringify(d.config) !== JSON.stringify(d.candidate))
        add("info", d.name + ": uncommitted changes", d.id);
      const nerr = Object.keys(d.errDisabled || {}).length;
      if(nerr) add("error", d.name + ": " + nerr + " port(s) error-disabled", d.id);
      const t = (typeof THERMAL !== "undefined" && THERMAL.devices[d.id]) || 21;
      if(d.powered !== false && t >= 45) add("error", d.name + ": " + t.toFixed(0) + "°C — near thermal shutdown", d.id);
    }
    if(d.type === "ap" && typeof POE !== "undefined" && POE.denied[d.id])
      add("error", d.name + " (AP): dark — " + POE.denied[d.id], d.id);
    if(d.type === "server"){
      if(d.powered === false) add("warn", d.name + ": powered off — its services are down", d.id);
      else {
        const t = (typeof THERMAL !== "undefined" && THERMAL.devices[d.id]) || 21;
        if(t >= 45) add("error", d.name + ": " + t.toFixed(0) + "°C — near thermal shutdown", d.id);
      }
    }
    if(d.type === "crac" && d.powered === false) add("warn", d.name + " (cooling): switched off", d.id);
  }
  for(const z of Object.values(zones)){
    if((z.kind || "building") !== "building" || !z.gridDown) continue;
    if((z.outagePrev || []).length)
      add("error", `${z.name}: GRID OUTAGE — ${z.outagePrev.length} infrastructure device(s) dark (no or overloaded UPS)`);
    else
      add("warn", `${z.name}: grid outage — riding on UPS (${z.outageLoad || 0} W of ${upsCapOf(z)} W)`);
  }
  if(typeof THERMAL !== "undefined")
    for(const [zid, zt] of Object.entries(THERMAL.zones)){
      const zn = zones[zid] ? zones[zid].name : zid;
      if(zt.status === "crit") add("error", zn + ": " + zt.temp.toFixed(1) + "°C — gear will shut down");
      else if(zt.status === "warn") add("warn", zn + ": " + zt.temp.toFixed(1) + "°C — running hot");
    }
  if(NET && NET.stormLinks.size) add("error", "broadcast storm on " + NET.stormLinks.size + " link(s)");
  const nFailL = Object.values(links).filter(l => l.failed).length;
  if(nFailL) add("warn", nFailL + " link(s) in simulated failure");
  const rank = { error: 0, warn: 1, info: 2 };
  return out.sort((a, b) => rank[a.sev] - rank[b.sev]);
}
function renderStatusRow(){
  const row = document.getElementById("status-row");
  if(!row) return;
  const st = collectStatuses();
  row.innerHTML = "";
  row.style.display = "flex";
  const tchip = document.createElement("span");
  tchip.className = "traffic-chip"; tchip.id = "traffic-chip";
  tchip.textContent = "traffic " + trafficStats(60000).total + " pkt/min";
  tchip.title = "Real packet journeys crossing the lab in the last minute (pings, DHCP, lookups)";
  const pb = document.createElement("button");
  pb.className = "st-chip probe-btn" + (probeOn ? " active" : "");
  pb.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">' +
    '<circle cx="6.5" cy="6.5" r="4.6" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
    '<path d="M10.2 10.2 L14 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
    '<path d="M3.6 6.5 h1.2 l0.9 -2 l1.4 3.8 l0.9 -1.8 h1.3" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/>' +
    '</svg>';
  pb.setAttribute("aria-label", "traffic probe");
  const tb = document.createElement("button");
  tb.className = "st-chip probe-btn" + (timelineOn ? " active" : "");
  tb.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">' +
    '<path d="M1.5 8 h3 l1.5 -4 l2.5 8 l1.5 -4 h4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>' +
    '</svg>';
  tb.setAttribute("aria-label", "event timeline");
  tb.title = timelineOn
    ? "Timeline is ON — every log event across the lab on one strip of time. Click to hide"
    : "Event timeline: every device's log events on one strip at the bottom — commits, flaps, failovers, in order";
  tb.onclick = () => {
    timelineOn = !timelineOn;
    try{ localStorage.setItem("junoslab-timeline", timelineOn ? "on" : "off"); }catch(e){}
    renderStatusRow(); renderTimeline();
  };
  pb.title = probeOn
    ? "Probe is ON — hovering lights up an area and shows its per-cable traffic. Click to switch off"
    : "Traffic probe: grey the whole lab, then hover anywhere to light up that area and read its per-cable traffic";
  pb.onclick = () => {
    probeOn = !probeOn;
    if(!probeOn) probePos = null;
    if(svg) svg.classList.toggle("probe", probeOn);
    renderStatusRow(); render();
  };
  if(typeof LAST_JOURNEY !== "undefined" && LAST_JOURNEY && (LAST_JOURNEY.fwd || []).length){
    const ib = document.createElement("button");
    ib.className = "st-chip";
    ib.textContent = "inspect last ping";
    ib.title = "Step through the last ping hop by hop: MACs, IPs, NAT rewrites — like a capture";
    ib.onclick = openInspector;
    row.append(tchip, pb, ib);
  } else row.append(tchip, pb);
  row.appendChild(tb);
  const shown = st.slice(0, 5);
  for(const x of shown){
    const chip = document.createElement("button");
    chip.className = "st-chip st-" + x.sev;
    chip.textContent = x.text;
    chip.onclick = x.devId
      ? (() => openCli(x.devId))
      : (() => { if(typeof showDrcModal === "function") showDrcModal(); });
    row.appendChild(chip);
  }
  if(st.length > shown.length){
    const more = document.createElement("button");
    more.className = "st-chip st-more";
    more.textContent = "+" + (st.length - shown.length) + " more — validate";
    more.onclick = () => { if(typeof showDrcModal === "function") showDrcModal(); };
    row.appendChild(more);
  }
}
var lensOn = false;
try{ lensOn = localStorage.getItem("junoslab-lens") === "on"; }catch(e){}
const LENS_R = 95, LENS_K = 2.2;
let lastPtr = { x: 320, y: 240 };
let lensClipCircle = null, lensUse = null, lensRing = null;
function buildLens(){
  const defs = el("defs", {}, svg);
  const cp = el("clipPath", { id: "lensClip" }, defs);
  lensClipCircle = el("circle", { cx: lastPtr.x, cy: lastPtr.y, r: LENS_R }, cp);
  const gWrap = el("g", { "clip-path": "url(#lensClip)", class: "lenswrap" }, svg);
  el("rect", { x: -4000, y: -4000, width: 12000, height: 12000, class: "lensbg" }, gWrap);
  lensUse = el("use", { href: "#world" }, gWrap);
  lensRing = el("circle", { cx: lastPtr.x, cy: lastPtr.y, r: LENS_R, class: "lensring" }, svg);
  updateLens();
}
function updateLens(){
  if(!lensOn || !lensUse) return;
  const sx = lastPtr.x, sy = lastPtr.y;
  lensClipCircle.setAttribute("cx", sx); lensClipCircle.setAttribute("cy", sy);
  lensRing.setAttribute("cx", sx); lensRing.setAttribute("cy", sy);
  // #world already carries the pan/zoom transform — the clone inherits it,
  // so the lens only magnifies about the pointer (applying the view again
  // was the bug that made it miss what you pointed at)
  lensUse.setAttribute("transform",
    `translate(${sx},${sy}) scale(${LENS_K}) translate(${-sx},${-sy})`);
}

/* ---------- zones: buildings and rooms on the canvas ---------- */
var zoneDrag = null, zoneResize = null;
function zoneContains(z, devOrId){
  const dev = typeof devOrId === "string" ? devices[devOrId] : devOrId;
  if(!dev) return false;
  const [cx, cy] = devCenter(dev);
  return cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h;
}
function innermostZone(list){
  return list.sort((a, b) => (a.w * a.h) - (b.w * b.h))[0] || null;
}
/* zoneOf = the building a device is in (racks are furniture, not rooms) */
function zoneOf(devId){
  return innermostZone(Object.values(zones).filter(z =>
    (z.kind || "building") === "building" && zoneContains(z, devId)));
}
function rackOf(devId){
  return innermostZone(Object.values(zones).filter(z =>
    z.kind === "rack" && zoneContains(z, devId)));
}
/* ---------- rack click-in: gear snaps between the rails like a real elevation ---------- */
const RACK_TOP = 34, RACK_SIDE = 17, RACK_GAP = 6, RACK_PAD = 10;
var rackHover = null;
function rackMountable(dev){
  return !!dev && (dev.type === "switch" || dev.type === "router" || dev.type === "server" || dev.type === "ups");
}
/* Re-stack every rack-mount device in z flush against the rails, top-down in
   y-order — the "click". Widens/lengthens the rack when the gear needs it.
   Returns the gear in elevation order (index 0 = U1, top of rack). */
function packRack(z){
  const gear = Object.values(devices)
    .filter(d => rackMountable(d) && zoneContains(z, d))
    .sort((a, b) => a.y - b.y);
  for(const d of gear)
    if(z.w < devNaturalWidth(d) + RACK_SIDE * 2) z.w = devNaturalWidth(d) + RACK_SIDE * 2;
  let y = z.y + RACK_TOP;
  for(const d of gear){
    d.rackW = z.w - RACK_SIDE * 2;   // every box the same width — nothing floats
    d.x = z.x + RACK_SIDE;
    d.y = y;
    y += devHeight(d) + RACK_GAP;
  }
  const need = (y - RACK_GAP + RACK_PAD) - z.y;
  if(gear.length && z.h < need) z.h = need;
  return gear;
}
function renderTrayZone(z, parent){
  const horiz = z.w >= z.h;
  const lvl = TRAY_LEVELS[z.level || "ceiling"] || TRAY_LEVELS.ceiling;
  const g = el("g", { class: "zone zone-tray tray-" + (z.level || "ceiling"), transform: `translate(${z.x},${z.y})` }, parent);
  const strip = el("rect", { width: z.w, height: z.h, rx: 6, class: "tray-strip" }, g);
  const s = traySpine(z);
  const fill = (typeof RENDER_TRAYFILL !== "undefined" && RENDER_TRAYFILL[z.id]) || 0;
  el("line", { x1: s[0][0] - z.x, y1: s[0][1] - z.y, x2: s[1][0] - z.x, y2: s[1][1] - z.y,
    class: "tray-bundle", "stroke-width": Math.min(9, 2 + fill * 0.5) }, g);
  const lab = el("text", { x: horiz ? 10 : z.w / 2 + 8, y: horiz ? -5 : 14, class: "tray-lab" }, g);
  lab.textContent = `${z.name} · ${lvl.label} · ${fill ? fill + " cable" + (fill === 1 ? "" : "s") : "empty"}` +
    (fill > lvl.cap ? "  OVERFILLED" : "");
  if(fill > lvl.cap) lab.classList.add("tray-over");
  const lt = el("title", {}, strip);
  lt.textContent = `${z.name} — ${lvl.label}. Cables near both ends route along it automatically ` +
    `(each end pays ~${lvl.dropM} m of drop). Capacity ~${lvl.cap} cables. Click the label to change level; drag to move; corner to resize.`;
  lab.addEventListener("click", (e) => {
    e.stopPropagation();
    if(zoneDrag && zoneDrag.moved) return;
    const order = ["ceiling", "wall", "underfloor"];
    z.level = order[(order.indexOf(z.level || "ceiling") + 1) % order.length];
    floatLabel(z.x + z.w / 2, z.y, z.name + " → " + TRAY_LEVELS[z.level].label);
    touchState();
  });
  strip.addEventListener("pointerdown", (e) => {
    if(mode === "delete") return;
    const pt = toWorld(e);
    zoneDrag = { id: z.id, offX: pt.x - z.x, offY: pt.y - z.y, members: [], memberZones: [], moved: false };
    e.stopPropagation();
  });
  strip.addEventListener("click", (e) => {
    e.stopPropagation();
    if(mode === "delete"){ pushUndo(); delete zones[z.id]; touchState(); }
  });
  const handle = el("rect", { class: "zone-handle", x: z.w - 12, y: z.h - 12, width: 11, height: 11 }, g);
  handle.addEventListener("pointerdown", (e) => { zoneResize = { id: z.id }; e.stopPropagation(); });
}
function deskOf(devId){
  return innermostZone(Object.values(zones).filter(z =>
    z.kind === "desk" && zoneContains(z, devId)));
}
function packDesk(z){
  const seats = Object.values(devices)
    .filter(d => d.type === "host" && zoneContains(z, d))
    .sort((a, b) => a.x - b.x);
  let x = z.x + 12;
  for(const d of seats){
    const w = devWidth(d);
    d.x = x;
    d.y = z.y + 30;
    x += w + 10;
  }
  if(seats.length && z.w < (x + 2) - z.x) z.w = (x + 2) - z.x;
  if(seats.length && z.h < 30 + 58 + 16) z.h = 30 + 58 + 16;
  return seats;
}
function clickIntoRack(devId){
  const dev = devices[devId];
  if(!rackMountable(dev)) return false;
  const rk = rackOf(devId);
  if(!rk){ delete dev.rackW; return false; }
  const gear = packRack(rk);
  render();
  floatLabel(dev.x + devWidth(dev) / 2, dev.y, rk.name + " — U" + (gear.indexOf(dev) + 1));
  if(typeof clickSound === "function") clickSound();
  return true;
}
/* ---------- grid power: outage drills and UPS coverage ---------- */
function buildingInfra(z){
  return zoneMembers(z).map(id => devices[id])
    .filter(d => d && (d.type === "switch" || d.type === "router" || d.type === "server" || d.type === "crac"));
}
function drawOf(dev){
  if(dev.type === "crac") return Math.round((dev.cfg.coolW || 0) * 0.3);
  return heatOf(dev);   // nominal electrical draw; heat is a fair proxy in this lab
}
function upsCapOf(z){
  return zoneMembers(z).map(id => devices[id])
    .filter(d => d && d.type === "ups")
    .reduce((a, d) => a + (d.cfg.capW || 0), 0);
}
/* hosts ride out an outage on their own laptop batteries; the INFRASTRUCTURE
   does not — unless a UPS in the building can carry the whole load. */
function toggleGridOutage(z){
  if(!z || z.kind === "rack") return;
  const upses = () => zoneMembers(z).map(id => devices[id]).filter(d => d && d.type === "ups");
  if(!z.gridDown){
    z.gridDown = true;
    const cap = upsCapOf(z);
    const infra = buildingInfra(z).filter(d => d.powered !== false);
    const load = infra.reduce((a, d) => a + drawOf(d), 0);
    z.outageLoad = load;
    if(cap > 0 && load <= cap){
      z.outagePrev = [];
      for(const u2 of upses())
        devLog(u2, `upsd: utility power LOST — on battery, carrying ${load} W of ${u2.cfg.capW || 0} W`);
    } else {
      z.outagePrev = infra.map(d => d.id);
      for(const u2 of upses())
        devLog(u2, cap > 0
          ? `upsd: utility power LOST — OVERLOAD (${load} W on ${cap} W of battery), dropping the load`
          : "upsd: utility power LOST");
      for(const d of infra) powerOff(d);
    }
  } else {
    z.gridDown = false;
    for(const u2 of upses()) devLog(u2, "upsd: utility power RESTORED");
    for(const id of (z.outagePrev || [])){
      const d = devices[id];
      if(d && d.powered === false) powerOn(d);
    }
    z.outagePrev = [];
  }
  rebuildAllDerived();
  touchState();
}
function zoneMembers(z){
  return Object.values(devices).filter(d => zoneContains(z, d)).map(d => d.id);
}
function containedZoneIds(z){
  return Object.values(zones)
    .filter(z2 => z2 !== z && z2.x + z2.w / 2 >= z.x && z2.x + z2.w / 2 <= z.x + z.w &&
                  z2.y + z2.h / 2 >= z.y && z2.y + z2.h / 2 <= z.y + z.h)
    .map(z2 => z2.id);
}
function renderZone(z, parent){
  if(z.kind === "tray"){ renderTrayZone(z, parent); return; }
  const isRack = z.kind === "rack" || z.kind === "desk";
  const isDesk = z.kind === "desk";
  const color = VLAN_PALETTE[(z.hue || 0) % VLAN_PALETTE.length];
  const g = el("g", { class: "zone" + (isRack ? " zone-rack" : "") +
    (isRack && z.id === rackHover ? " zone-hot" : "") +
    (!isRack && z.gridDown ? " zone-outage" : ""), transform: `translate(${z.x},${z.y})` }, parent);
  const wall = el("rect", { class: "zone-wall", width: z.w, height: z.h, rx: isRack ? 4 : 10 }, g);
  if(!isRack) wall.style.stroke = color;
  const inner = el("rect", { class: "zone-inner", x: 4, y: 4, width: z.w - 8, height: z.h - 8, rx: isRack ? 2 : 7 }, g);
  if(!isRack) inner.style.fill = color;
  const head = el("rect", { class: "zone-head", x: 4, y: 4, width: z.w - 8, height: 24, rx: isRack ? 2 : 7 }, g);
  if(!isRack) head.style.fill = color;
  if(isRack && !isDesk){
    // mounting rails with screw holes — reads as steel, not a room
    el("line", { x1: 11, y1: 32, x2: 11, y2: z.h - 8, class: "zone-rail" }, g);
    el("line", { x1: z.w - 11, y1: 32, x2: z.w - 11, y2: z.h - 8, class: "zone-rail" }, g);
  }
  if(isDesk)
    el("line", { x1: 8, y1: z.h - 10, x2: z.w - 8, y2: z.h - 10, class: "zone-rail" }, g);
  const name = el("text", { x: 14, y: 21, class: "zone-name" }, g);
  name.textContent = z.name;
  const count = zoneMembers(z).length;
  const meta = el("text", { x: z.w - (isRack ? 104 : 134), y: 21, "text-anchor": "end", class: "zone-meta" }, g);
  meta.textContent = count + (count === 1 ? " device" : " devices");
  if(typeof THERMAL !== "undefined" && THERMAL.zones[z.id]){
    const zt = THERMAL.zones[z.id];
    const tt = el("text", { x: z.w - (isRack ? 58 : 88), y: 21, "text-anchor": "end", class: "zone-temp zt-" + zt.status }, g);
    tt.textContent = zt.temp.toFixed(1) + "°C";
  }
  if(!isRack){
    const gridBtn = el("text", { x: z.w - 44, y: 21, "text-anchor": "end",
      class: "zone-act" + (z.gridDown ? " zone-act-down" : "") }, g);
    gridBtn.textContent = z.gridDown ? "OUTAGE" : "grid";
    const gt = el("title", {}, gridBtn);
    gt.textContent = z.gridDown
      ? "Grid outage in progress — click to restore utility power"
      : "Drill a power outage: everything without UPS coverage goes dark";
    gridBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if(zoneDrag && zoneDrag.moved) return;
      pushUndo();
      toggleGridOutage(z);
    });
  }
  const rackBtn = el("text", { x: z.w - 14, y: 21, "text-anchor": "end", class: "zone-act" }, g);
  if(isDesk) rackBtn.style.display = "none";
  rackBtn.textContent = "rack";
  rackBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if(zoneDrag && zoneDrag.moved) return;
    if(typeof showRackModal === "function") showRackModal(z);
  });
  const handle = el("rect", { class: "zone-handle", x: z.w - 14, y: z.h - 14, width: 12, height: 12 }, g);
  head.addEventListener("pointerdown", (e) => {
    if(mode === "delete") return;
    const pt = toWorld(e);
    zoneDrag = { id: z.id, offX: pt.x - z.x, offY: pt.y - z.y, members: zoneMembers(z),
      memberZones: isRack ? [] : containedZoneIds(z), moved: false };
    e.stopPropagation();
  });
  head.addEventListener("click", async (e) => {
    e.stopPropagation();
    if(mode === "delete"){
      pushUndo();
      if(isRack) for(const did of zoneMembers(z)){
        const d2 = devices[did];
        if(d2) delete d2.rackW;
      }
      delete zones[z.id];
      touchState();
      return;
    }
    if(zoneDrag && zoneDrag.moved) return;
    const n = await modalInput(isDesk ? "Rename desk" : isRack ? "Rename rack" : "Rename building",
      isDesk ? "Desks hold PCs (they snap into a row) and act as the cabling OUTLET: their runs are labeled by desk name in the schedule."
        : isRack ? "Racks are furniture inside a building — they move with it, and hold your rack-mount gear."
        : "Buildings group devices and racks; dragging the header moves everything inside.", z.name, "text");
    if(n !== null && n.trim()){ z.name = n.trim(); touchState(); }
  });
  handle.addEventListener("pointerdown", (e) => {
    zoneResize = { id: z.id };
    e.stopPropagation();
  });
}
function renderStatusbar(){
  const sb = document.getElementById("statusbar");
  if(!sb) return;
  const nStorm = NET ? NET.stormLinks.size : 0;
  const nBlk = NET ? NET.blocked.size : 0;
  const nErr = Object.values(devices).reduce((a, d) => a + Object.keys(d.errDisabled || {}).length, 0);
  let s = `NODES ${Object.keys(devices).length}  LINKS ${Object.keys(links).length}`;
  if(nBlk) s += `  STP-BLK ${nBlk}`;
  if(nErr) s += `  ERR-DIS ${nErr}`;
  const nFail = Object.values(devices).filter(d => d.failed).length +
                Object.values(links).filter(l => l.failed).length;
  if(nFail) s += `  SIM-FAIL ${nFail}`;
  let maxT = 0;
  if(typeof THERMAL !== "undefined")
    for(const zt of Object.values(THERMAL.zones)) if(zt.temp > maxT) maxT = zt.temp;
  if(maxT >= 30) s += `  TEMP ${maxT.toFixed(0)}°C`;
  s += nStorm ? `  ** STORM ${nStorm} **` : `  NOMINAL`;
  sb.textContent = s;
  sb.classList.toggle("alert", nStorm > 0 || maxT >= 38);
}

function linkClass(lid, l){
  const kind = l.kind || "lan";
  const st = (NET && NET.linkStatus[lid]) || "down";
  let cls = "link";
  if(kind !== "lan") cls += " " + kind;
  if(kind === "console") return cls;
  if(st === "up") cls += " up";
  else if(st === "oob") cls += " up";
  if(typeof impactOn !== "undefined" && impactOn && st === "up" && typeof IMPACT !== "undefined" && IMPACT[lid] !== undefined){
    cls += IMPACT[lid] >= 2 ? " impact-spof" : IMPACT[lid] > 0 ? " impact-warn" : " impact-safe";
  }
  if(typeof DRC_LINKS !== "undefined" && DRC_LINKS.has(lid)) cls += " drc";
  else if(st === "blocked") cls += " blocked";
  else if(st === "storm") cls += " storm";
  else if(st === "storm-suppressed") cls += " storm suppressed";
  // bundle member?
  const devA = devices[l.a.dev];
  if(devA && devA.type === "switch" && devA.d && devA.d.portCfg[l.a.port] && devA.d.portCfg[l.a.port].ae) cls += " agg";
  const devB = devices[l.b.dev];
  if(devB && devB.type === "switch" && devB.d && devB.d.portCfg[l.b.port] && devB.d.portCfg[l.b.port].ae) cls += " agg";
  return cls;
}
function linkStatusLabel(lid){
  const st = (NET && NET.linkStatus[lid]) || "down";
  return { up: "up / forwarding", down: "down (port disabled, error-disabled, or device off)",
    "lacp-fail": "down — LACP bundle mismatch (one side isn't configured for the bundle)",
    blocked: "blocked by RSTP (redundant path)", storm: "BROADCAST STORM — looped segment",
    "storm-suppressed": "storm (suppressed by storm-control)", console: "console — carries no network traffic",
    oob: "out-of-band (management/console plane — no user traffic)" }[st] || st;
}
function renderLink(lid, l, parent){
  const devA = devices[l.a.dev], devB = devices[l.b.dev];
  if(!devA || !devB) return;
  const kind = l.kind || "lan";
  const [ax, ay] = portXY(devA, l.a.port);
  const [bx, by] = portXY(devB, l.b.port);
  // vlan view keeps straight lines: it is about logic, not the physical run
  const route = vlanView ? null : linkRoute(l);
  const pts = route ? route.pts : [[ax, ay], [bx, by]];
  const ptsAttr = pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const hit = el("polyline", { points: ptsAttr, class: "linkhit" }, parent);
  const line = el("polyline", { points: ptsAttr, class: linkClass(lid, l) }, parent);
  const [mx, my] = polyMid(pts);
  const t = el("title", {}, line);
  t.textContent = `${devA.name}:${l.a.port} ↔ ${devB.name}:${l.b.port}  [${kind}]  ${linkStatusLabel(lid)}` +
    (route && route.trayIds.length
      ? `\n~${route.m} m via ${route.trayIds.map(id2 => (zones[id2] || {}).name).join(" + ")} (${TRAY_LEVELS[route.level].label}, drops included)`
      : "");
  if(probeOn && probePos){
    if(Math.hypot(probePos.x - mx, probePos.y - my) < PROBE_R){
      line.classList.add("pr-hot");
      hit.classList.add("pr-hot");
      const n = RENDER_TRAFFIC.per[lid] || 0;
      const tc = el("text", { x: mx, y: my - 7, "text-anchor": "middle", class: "trafcount" }, parent);
      tc.textContent = n ? n + " pkt/min" : "quiet";
    }
  }
  if(vlanView) applyVlanPaint(lid, l, line, parent, ax, ay, bx, by);
  const zA = zoneOf(l.a.dev), zB = zoneOf(l.b.dev);
  if(zA !== zB && (zA || zB) && kind !== "console"){
    const casing = el("polyline", { points: ptsAttr, class: "conduit" }, parent);
    parent.insertBefore ? parent.insertBefore(casing, hit) : null;
  }
  const onClick = (e) => {
    e.stopPropagation();
    if(mode === "delete"){ deleteLink(lid); return; }
    showLinkPopover(e, lid);
  };
  hit.addEventListener("click", onClick);
  line.addEventListener("click", onClick);
  if(l.speed && l.speed !== 1 && kind !== "console" && kind !== "wifi"){
    const sl = el("text", { x: mx, y: my + 11, "text-anchor": "middle", class: "speedlbl" }, parent);
    sl.textContent = speedLabel(l.speed);
  }
  const pcA = devA.type === "switch" && devA.d ? devA.d.portCfg[l.a.port] : null;
  if(pcA && pcA.ae){
    const badge = el("text", { x: mx, y: my - 4, class: "aebadge", "text-anchor": "middle" }, parent);
    badge.textContent = pcA.ae;
  }
}

const SPEED_STEPS = [0.1, 1, 10, 40];
function speedLabel(sp){ return sp === 0.1 ? "100 Mbps" : sp + " Gbps"; }
const GLYPHS = {
  switch: "M2 4 h12 M10 1 l4 3 -4 3 M14 10 h-12 M6 7 l-4 3 4 3",
  router: "M8 1 a7 7 0 1 0 0.01 0 M8 3 v10 M3 8 h10 M8 3 l-2 2 M8 3 l2 2 M8 13 l-2 -2 M8 13 l2 -2",
  host: "M1 2 h12 v8 h-12 z M5 13 h4 M7 10 v3",
  isp: "M4 9 a4 4 0 1 1 1 -6 a4 3 0 0 1 7 1 a3 3 0 0 1 -1 6 z",
  ap: "M8 12.5 a1.2 1.2 0 1 0 .01 0 M5 9.5 a4.5 4.5 0 0 1 6 0 M2.5 6.5 a8 8 0 0 1 11 0",
  crac: "M8 8 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M8 6 L8 1.5 M8 10 L8 14.5 M6 8 L1.5 8 M10 8 L14.5 8 M4.9 4.9 L3 3 M11.1 11.1 L13 13 M11.1 4.9 L13 3 M4.9 11.1 L3 13",
  server: "M1.5 3 h13 v4 h-13 z M1.5 9 h13 v4 h-13 z M3.5 5 h2 M3.5 11 h2 M11.5 5 h1.5 M11.5 11 h1.5",
  ups: "M2 5 h10 v6 h-10 z M12.5 6.8 h1.5 v2.4 h-1.5 z M4 6.5 v3 M6 6.5 v3 M8 6.5 v3",
};
function renderDevice(dev, parent){
  const w = devWidth(dev), h = devHeight(dev);
  const g = el("g", {
    class: "device" + (probeOn && probePos && Math.hypot(probePos.x - devCenter(dev)[0], probePos.y - devCenter(dev)[1]) < PROBE_R ? " pr-hot" : "") +
      (activeDevice === dev.id ? " selected" : "") +
      (dev.type === "router" ? " router" : "") + (dev.type === "isp" ? " isp" : "") +
      (dev.type === "ap" ? " ap" : "") + (dev.type === "crac" ? " crac" : "") +
      (dev.type === "server" ? " server" : "") +
      (dev.powered === false ? " off" : "") + (dev.failed ? " failed" : "") +
      ((typeof DRC_DEVS !== "undefined" && DRC_DEVS.has(dev.id)) ? " drc" : ""),
    transform: `translate(${dev.x},${dev.y})`,
  }, parent);
  if(dev.type === "ap")
    if(typeof POE !== "undefined" && POE.denied[dev.id]){
      const dl = el("text", { x: w / 2, y: -8, "text-anchor": "middle", class: "apdead" }, g);
      dl.textContent = "NO POWER";
    } else
      el("circle", { cx: w / 2, cy: h / 2, r: dev.cfg.radius || 160, class: "apcov" }, g);
  el("rect", { class: "body", width: w, height: h }, g);
  if(dev.type === "switch" || dev.type === "router"){
    el("rect", { x: 1.5, y: 1.5, width: w - 3, height: devHeaderH() - 5, rx: 5, class: "devband" }, g);
    el("line", { x1: 1.5, y1: devHeaderH() - 3, x2: w - 1.5, y2: devHeaderH() - 3, class: "divh" }, g);
  }
  const icon = el("text", { x: 8, y: 15, class: "label" }, g);
  icon.textContent =
    dev.type === "switch" ? (dev.model || "JUNOS SWITCH") :
    dev.type === "router" ? (dev.model || "JUNOS ROUTER") :
    dev.type === "isp" ? "ISP / INTERNET" :
    dev.type === "ap" ? (dev.model ? (/^AP/.test(dev.model) ? "MIST " : "UNIFI ") + dev.model : "ACCESS POINT") :
    dev.type === "crac" ? "COOLING" :
    dev.type === "ups" ? "UPS" :
    dev.type === "server" ? "SERVER" : "HOST";
  if(dev.type === "host" || dev.type === "isp" || dev.type === "ap" || dev.type === "ups")
    el("path", { d: GLYPHS[dev.type], class: "glyph", transform: `translate(${w - 22},6) scale(0.9)` }, g);
  else if(dev.type === "server"){
    el("path", { d: GLYPHS.server, class: "glyph", transform: `translate(${w - 40},6) scale(0.9)` }, g);
    const on = dev.powered !== false;
    const pg = el("g", { class: "pwrbtn" + (on ? " on" : ""), transform: `translate(${w - 14},12)` }, g);
    el("circle", { r: 6 }, pg);
    el("path", { d: "M0 -4.2 L0 -1.3 M-2.5 -2.1 A3.4 3.4 0 1 0 2.5 -2.1", class: "pwrglyph" }, pg);
    const pt = el("title", {}, pg);
    pt.textContent = on ? "Power: on — click to shut down (services die with the box)"
                        : "Power: off — click to boot";
    pg.addEventListener("click", (e) => {
      e.stopPropagation();
      if(mode !== "normal") return;
      if(dev.powered === false) powerOn(dev); else powerOff(dev);
    });
  }
  else if(dev.type === "crac"){
    el("path", { d: GLYPHS.crac, class: "glyph", transform: `translate(${w - 40},4) scale(0.85)` }, g);
    const on = dev.powered !== false;
    const pg = el("g", { class: "pwrbtn" + (on ? " on" : ""), transform: `translate(${w - 14},12)` }, g);
    el("circle", { r: 6 }, pg);
    el("path", { d: "M0 -4.2 L0 -1.3 M-2.5 -2.1 A3.4 3.4 0 1 0 2.5 -2.1", class: "pwrglyph" }, pg);
    const pt = el("title", {}, pg);
    pt.textContent = on ? "Cooling: running — click to switch off" : "Cooling: OFF — click to start";
    pg.addEventListener("click", (e) => {
      e.stopPropagation();
      if(mode !== "normal") return;
      if(dev.powered === false) powerOn(dev); else powerOff(dev);
    });
  }
  else renderChassisControls(dev, g, w);
  const label = el("text", { x: 8, y: 31 }, g);
  label.textContent = dev.type === "crac"
    ? `${dev.model || "unit"} — ${((dev.cfg.coolW || 0) / 1000).toFixed(1)} kW`
    : dev.type === "ups"
    ? `${dev.model || "UPS"} — ${dev.cfg.capW || 0} W`
    : dev.name + ((dev.type === "host" || dev.type === "server") && dev.cfg.ip ? `  ${dev.cfg.ip}` : "");

  if(dev.ports.length > 1){
    const { rows } = portLayout(dev);
    el("rect", { x: 6, y: devHeaderH() - 2, width: w - 12, height: rows * 16 + 10, rx: 3, class: "portstrip" }, g);
  }
  dev.ports.forEach((p, i) => {
    const [px, py] = portRelPos(dev, i);
    if(typeof TUT_SPOTLIGHT !== "undefined" && TUT_SPOTLIGHT &&
       dev.name === TUT_SPOTLIGHT.dev && p.id === TUT_SPOTLIGHT.port)
      el("circle", { cx: px, cy: py, r: 10, class: "spotring" }, g);
    let cls = "port";
    const pcActive = physPortActive(dev, p.id);
    if(pcActive && isLinked(dev.id, p.id)) cls += " up";
    if(armedPort && armedPort.dev === dev.id && armedPort.port === p.id) cls += " armed";
    if(dev.errDisabled && dev.errDisabled[p.id]) cls = "port errdis";
    if(NET && (NET.blocked.has(dev.id + ":" + p.id) || NET.blocked.has(dev.id + ":" + effPortOf(dev, p.id)))) cls = "port blk";
    let vc;
    if(dev.type === "switch" || dev.type === "router"){
      const dense = dev.ports.length > 16;
      const pw2 = dense ? 5 : 8, ph2 = dense ? 4.5 : 6.5;
      vc = el("rect", { x: px - pw2 / 2, y: py - ph2 / 2, width: pw2, height: ph2, rx: 1, class: cls }, g);
    } else {
      vc = el("circle", { cx: px, cy: py, r: 5.5, class: cls }, g);
    }
    if(vlanView && dev.type === "switch" && dev.d && !cls.includes("errdis") && !cls.includes("blk")){
      const pcv = dev.d.portCfg[p.id];
      if(pcv && !pcv.ae && pcv.mode === "access"){
        vc.style.stroke = vlanColor(pcv.vlanIds[0]);
        vc.style.strokeWidth = "2";
      }
    }
    // generous invisible hit target on top — pens and fingers need more than 5px
    const hit = el("circle", { cx: px, cy: py, r: dev.ports.length > 16 ? 8 : 11, class: "porthit" }, g);
    const t = el("title", {}, hit);
    t.textContent = portTitle(dev, p.id);
    hit.addEventListener("click", (e) => {
      if(mode === "delete") return;    // let it bubble to the device's delete click
      e.stopPropagation();
      onPortClick(e, dev.id, p.id);
    });
  });

  // under-card annotations: capability tags + optional IP labels
  let underY = h + 11;
  if(dev.type === "switch" || dev.type === "router"){
    const dd = dev.d || {};
    const tags = [];
    if(dd.rstp) tags.push("RSTP");
    if(dd.ospf && Object.keys(dd.ospf).length) tags.push("OSPF");
    if(dd.dhcpIfs && dd.dhcpIfs.size) tags.push("DHCP");
    if(dd.natRules && dd.natRules.length) tags.push("NAT");
    if(JSON.stringify(cfgGet(dev.config, ["interfaces"]) || {}).includes('"filter"')) tags.push("FW");
    if(tags.length){
      const tt = el("text", { x: 0, y: underY, class: "captag" }, g);
      tt.textContent = tags.join(" · ");
      underY += 11;
    }
  }
  if(ipLabels){
    if(dev.type === "switch" && dev.d){
      for(const [unit, irb] of Object.entries(dev.d.irbs)){
        const t2 = el("text", { x: 0, y: underY, class: "iplabel" }, g);
        t2.textContent = `irb.${unit} ${irb.ip}/${irb.bits}` + (irb.vlanName ? ` (${irb.vlanName})` : "");
        underY += 10;
      }
    }
    if(dev.type === "router" && dev.d){
      dev.ports.forEach((p2, i2) => {
        const l3 = dev.d.l3ports[p2.id];
        if(!l3) return;
        const [lx, ly] = portRelPos(dev, i2);
        const t2 = el("text", { x: lx, y: ly + 14 + (i2 % 2) * 9, "text-anchor": "middle", class: "iplabel" }, g);
        t2.textContent = `${l3.ip}/${l3.bits}`;
      });
    }
    if((dev.type === "host" || dev.type === "server") && dev.cfg.gw){
      const t2 = el("text", { x: 0, y: underY, class: "iplabel" }, g);
      t2.textContent = `gw ${dev.cfg.gw}` + (dev.cfg.viaDhcp ? " (dhcp)" : "");
      underY += 10;
    }
    if(dev.type === "isp"){
      const t2 = el("text", { x: 0, y: underY, class: "iplabel" }, g);
      t2.textContent = `${dev.cfg.ip}/${dev.cfg.bits}`;
      underY += 10;
    }
  }

  g.addEventListener("pointerdown", (e) => {
    if(mode !== "normal") return;
    const pt = toWorld(e);
    dragging = { id: dev.id, offX: pt.x - dev.x, offY: pt.y - dev.y, moved: false,
      fromRack: (rackOf(dev.id) || {}).id || null,
      fromDesk: (typeof deskOf === "function" && (deskOf(dev.id) || {}).id) || null };
    e.stopPropagation();
  });
  g.addEventListener("click", (e) => {
    e.stopPropagation();
    if(dragging && dragging.moved){ return; }
    if(mode === "delete"){ deleteDevice(dev.id); return; }
    if(mode === "normal") openCli(dev.id);
  });
}

function renderChassisControls(dev, g, w){
  // a visually separate control cluster: divider, then MGT / CON / PWR, well spaced
  el("line", { x1: w - 90, y1: 6, x2: w - 90, y2: devHeaderH() - 6, class: "divline" }, g);
  for(const [pid, x, lbl, cls] of [["me0", w - 80, "MGT", "sport me0"], ["con", w - 57, "CON", "sport con"]]){
    const up = isLinked(dev.id, pid) && dev.powered !== false;
    el("rect", { x, y: 7, width: 10, height: 10, rx: 2, class: cls + (up ? " up" : "") }, g);
    const tl = el("text", { x: x + 5, y: 29, "text-anchor": "middle", class: "ctl-label" }, g);
    tl.textContent = lbl;
    const hit = el("circle", { cx: x + 5, cy: 12, r: 11, class: "porthit" }, g);
    const t = el("title", {}, hit);
    t.textContent = portTitle(dev, pid);
    hit.addEventListener("click", (e) => {
      if(mode === "delete") return;
      e.stopPropagation();
      onPortClick(e, dev.id, pid);
    });
  }
  const on = dev.powered !== false;
  const pg = el("g", { class: "pwrbtn" + (on ? " on" : ""), transform: `translate(${w - 22},13)` }, g);
  el("circle", { r: 7 }, pg);
  el("path", { d: "M0 -4.8 L0 -1.5 M-2.8 -2.4 A3.9 3.9 0 1 0 2.8 -2.4", class: "pwrglyph" }, pg);
  const pl = el("text", { x: 0, y: 16, "text-anchor": "middle", class: "ctl-label" }, pg);
  pl.textContent = "PWR";
  const pt = el("title", {}, pg);
  pt.textContent = on ? "Power: on — click to power off" : "Power: off — click to power on";
  pg.addEventListener("click", (e) => {
    e.stopPropagation();
    if(mode !== "normal") return;
    if(dev.powered === false) powerOn(dev); else powerOff(dev);
  });
}

/* ---------- pan / zoom / drag ---------- */
function toWorld(e){
  const r = svg.getBoundingClientRect();
  return { x: (e.clientX - r.left - view.x) / view.scale, y: (e.clientY - r.top - view.y) / view.scale };
}
function worldCenter(){
  const r = svg.getBoundingClientRect();
  return { x: (r.width / 2 - view.x) / view.scale, y: (r.height / 2 - view.y) / view.scale };
}
/* pointer events cover mouse, pen and touch alike; two pointers = pinch zoom */
const activePointers = new Map();
let pinch = null;
svg.addEventListener("pointerdown", (e) => {
  // capture phase: sees every pointer, even when a device handler stops propagation
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if(activePointers.size === 2){
    pinch = null; dragging = null; panning = null;
    svg.classList.remove("panning");
  }
}, true);
svg.addEventListener("pointerdown", (e) => {
  if(e.target === svg || e.target === worldG){ panning = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; svg.classList.add("panning"); }
});
function doPinch(){
  const [p1, p2] = [...activePointers.values()];
  const d = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1;
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  if(!pinch){ pinch = { d0: d, scale0: view.scale, mid0: mid, vx: view.x, vy: view.y }; return; }
  const r = svg.getBoundingClientRect();
  const s = Math.min(2.5, Math.max(0.3, pinch.scale0 * d / pinch.d0));
  view.scale = s;
  view.x = (mid.x - r.left) - ((pinch.mid0.x - r.left) - pinch.vx) * (s / pinch.scale0);
  view.y = (mid.y - r.top) - ((pinch.mid0.y - r.top) - pinch.vy) * (s / pinch.scale0);
  render();
}
svg.addEventListener("pointermove", (e) => {
  {
    const r = svg.getBoundingClientRect();
    lastPtr = { x: e.clientX - r.left, y: e.clientY - r.top };
    if(lensOn) updateLens();
  }
  if(probeOn && !dragging && !panning && !zoneDrag && !zoneResize && activePointers.size < 2){
    probePos = toWorld(e);
    render();
  }
  if(activePointers.has(e.pointerId)) activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if(activePointers.size === 2){ doPinch(); return; }
  if(zoneResize){
    const z = zones[zoneResize.id];
    if(z){
      const pt = toWorld(e);
      z.w = Math.max(180, pt.x - z.x);
      z.h = Math.max(120, pt.y - z.y);
      if(z.kind === "rack") packRack(z);
      render();
    }
    return;
  }
  if(zoneDrag){
    const z = zones[zoneDrag.id];
    if(z){
      const pt = toWorld(e);
      const nx = Math.max(0, pt.x - zoneDrag.offX), ny = Math.max(0, pt.y - zoneDrag.offY);
      const dx = nx - z.x, dy = ny - z.y;
      z.x = nx; z.y = ny;
      for(const did of zoneDrag.members){
        const d2 = devices[did];
        if(d2){ d2.x += dx; d2.y += dy; }
      }
      for(const zid2 of (zoneDrag.memberZones || [])){
        const z2 = zones[zid2];
        if(z2){ z2.x += dx; z2.y += dy; }
      }
      zoneDrag.moved = true;
      render();
    }
    return;
  }
  if(dragging){
    const dev = devices[dragging.id];
    const pt = toWorld(e);
    dev.x = Math.max(0, pt.x - dragging.offX);
    dev.y = Math.max(0, pt.y - dragging.offY);
    dragging.moved = true;
    rackHover = rackMountable(dev) ? ((rackOf(dev.id) || {}).id || null) : null;
    render();
  } else if(panning){
    view.x = panning.vx + (e.clientX - panning.x);
    view.y = panning.vy + (e.clientY - panning.y);
    render();
  }
});
function endDrag(){
  if(dragging && dragging.moved){
    const dev = devices[dragging.id];
    if(dev && dev.type === "host"){
      const dsk = deskOf(dev.id);
      if(dsk){
        const seats = packDesk(dsk);
        render();
        floatLabel(dev.x + devWidth(dev) / 2, dev.y, dsk.name + " — seat " + (seats.indexOf(dev) + 1));
        if(typeof clickSound === "function") clickSound();
      }
      const fromD = dragging.fromDesk;
      if(fromD && zones[fromD] && (!dsk || dsk.id !== fromD)){ packDesk(zones[fromD]); render(); }
    }
    if(rackMountable(dev)){
      const landed = clickIntoRack(dev.id);
      const from = dragging.fromRack;
      if(from && zones[from] && (!landed || (rackOf(dev.id) || {}).id !== from)){
        packRack(zones[from]);   // close the gap it left behind
        render();
      }
    }
  }
  if(rackHover){ rackHover = null; render(); }
  if((dragging && dragging.moved) || (zoneDrag && zoneDrag.moved) || zoneResize) scheduleAutosave();
  setTimeout(() => { dragging = null; zoneDrag = null; zoneResize = null; }, 0);
  panning = null; svg.classList.remove("panning");
}
function endPointer(e){
  activePointers.delete(e.pointerId);
  if(activePointers.size < 2) pinch = null;
  endDrag();
}
svg.addEventListener("pointerup", endPointer);
svg.addEventListener("pointercancel", endPointer);
svg.addEventListener("pointerleave", endPointer);
svg.addEventListener("wheel", (e) => {
  e.preventDefault();
  const r = svg.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  const old = view.scale;
  view.scale = Math.min(2.5, Math.max(0.3, view.scale * (e.deltaY < 0 ? 1.12 : 0.89)));
  view.x = mx - (mx - view.x) * (view.scale / old);
  view.y = my - (my - view.y) * (view.scale / old);
  render();
}, { passive: false });

/* ---------- cabling / deleting ---------- */
const CABLE_KINDS = ["lan", "mgmt", "console", "remote"];
const CABLE_KIND_META = {
  lan: { label: "LAN / Data", desc: "Normal network cable — carries traffic. The default." },
  mgmt: { label: "Management", desc: "Out-of-band admin network (blue dashed). Carries traffic." },
  console: { label: "Console", desc: "Serial access only — carries NO network traffic (dotted gray)." },
  remote: { label: "Remote / WAN", desc: "Long-haul interconnect styling (amber dashes). Carries traffic." },
};
var cableKind = "lan";
try{ const k = localStorage.getItem("junoslab-cable-kind"); if(CABLE_KINDS.includes(k)) cableKind = k; }catch(e){}
function currentCableKind(){ return CABLE_KINDS.includes(cableKind) ? cableKind : "lan"; }
function onPortClick(e, devId, portId){
  if(mode === "normal"){ showPortPopover(e, devId, portId); return; }
  if(mode !== "link") return;
  if(!armedPort){
    armedPort = { dev: devId, port: portId };
    const hintEl = document.getElementById("hint");
    if(hintEl) hintEl.textContent =
      `First end: ${devices[devId].name} ${portId} — now click the far-end port to run a ${CABLE_KIND_META[currentCableKind()].label} connection. Click it again to cancel.`;
    render();
    return;
  }
  if(armedPort.dev === devId && armedPort.port === portId){ armedPort = null; restoreLinkHint(); render(); return; }
  if(isLinked(devId, portId) || isLinked(armedPort.dev, armedPort.port)){
    armedPort = null; restoreLinkHint(); render(); return;
  }
  const firstEnd = armedPort;
  pushUndo();
  links[uid("lk")] = { a: firstEnd, b: { dev: devId, port: portId }, kind: currentCableKind() };
  if(typeof clickSound === "function") clickSound();
  devLog(devices[firstEnd.dev], `SNMP_TRAP_LINK_UP: ${firstEnd.port} — cable connected`);
  devLog(devices[devId], `SNMP_TRAP_LINK_UP: ${portId} — cable connected`);
  armedPort = null;
  restoreLinkHint();
  rebuildAllDerived();
  touchState();
}
function deleteLink(lid){
  const l = links[lid];
  if(l){
    pushUndo();
    devLog(devices[l.a.dev], `SNMP_TRAP_LINK_DOWN: ${l.a.port} — cable unplugged`);
    devLog(devices[l.b.dev], `SNMP_TRAP_LINK_DOWN: ${l.b.port} — cable unplugged`);
  }
  delete links[lid];
  hidePopover();
  rebuildAllDerived();
  touchState();
}
function deleteDevice(devId){
  pushUndo();
  const wasRacked = rackOf(devId);
  Object.entries(links).forEach(([id, l]) => {
    if(l.a.dev === devId || l.b.dev === devId) delete links[id];
  });
  delete devices[devId];
  closeTab(devId);
  if(wasRacked) packRack(wasRacked);
  rebuildAllDerived();
  touchState();
}

/* ---------- the timeline: every log event on one strip of time ---------- */
var timelineOn = false;
try{ timelineOn = localStorage.getItem("junoslab-timeline") === "on"; }catch(e){}
function timelineColor(devId){
  let h = 0;
  for(let i = 0; i < devId.length; i++) h = (h * 31 + devId.charCodeAt(i)) >>> 0;
  return VLAN_PALETTE[h % VLAN_PALETTE.length];
}
function renderTimeline(){
  try{
    const wrap = document.getElementById("canvas-wrap");
    if(!wrap) return;
    let tl = document.getElementById("timeline");
    if(!timelineOn){ if(tl) tl.remove(); return; }
    if(!tl){
      tl = document.createElement("div");
      tl.id = "timeline";
      wrap.appendChild(tl);
    }
    tl.innerHTML = "";
    const now = Date.now();
    const evs = (typeof EVENTS !== "undefined" ? EVENTS : []).filter(ev => now - ev.ts < 15 * 60000);
    const lbl = document.createElement("span"); lbl.className = "tl-lbl";
    if(!evs.length){
      lbl.textContent = "timeline: no events in the last 15 minutes — commits, flaps, boots and trips land here";
      tl.appendChild(lbl);
      return;
    }
    const t0 = Math.min(evs[0].ts, now - 60000);
    const span = Math.max(now - t0, 60000);
    lbl.textContent = "last " + Math.max(1, Math.round(span / 60000)) + " min";
    tl.appendChild(lbl);
    const track = document.createElement("div"); track.className = "tl-track";
    for(const ev of evs){
      const d = devices[ev.devId];
      const dot = document.createElement("span");
      dot.className = "tl-dot";
      dot.style.left = (((ev.ts - t0) / span) * 100).toFixed(2) + "%";
      dot.style.background = timelineColor(ev.devId);
      dot.title = new Date(ev.ts).toTimeString().slice(0, 8) + "  " +
        (d ? d.name : ev.devId) + " — " + ev.text;
      if(d) dot.onclick = (e2) => { e2.stopPropagation(); openCli(ev.devId); };
      track.appendChild(dot);
    }
    const nowMark = document.createElement("span"); nowMark.className = "tl-now";
    nowMark.title = "now";
    track.appendChild(nowMark);
    tl.appendChild(track);
  }catch(e){}
}
try{
  if(typeof requestAnimationFrame === "function" && typeof setInterval === "function")
    setInterval(renderTimeline, 5000);
}catch(e){}
var scaleBarLabel = null;
function updateScaleBar(){
  try{
    const wrap = document.getElementById("canvas-wrap");
    if(!wrap) return;
    if(!scaleBarLabel){
      const bar = document.createElement("div");
      bar.id = "scalebar";
      const line = document.createElement("span"); line.className = "sb-line";
      scaleBarLabel = document.createElement("span"); scaleBarLabel.className = "sb-label";
      bar.appendChild(line); bar.appendChild(scaleBarLabel);
      wrap.appendChild(bar);
    }
    scaleBarLabel.textContent = "~" + Math.round(100 * M_PER_PX / view.scale) + " m";
  }catch(e){ /* headless shim has no real DOM — the scale bar is pure chrome */ }
}

/* ---------- packet inspector: the last ping, hop by hop ---------- */
var inspState = null, inspHl = null;
function inspHops(){
  const j = (typeof LAST_JOURNEY !== "undefined") ? LAST_JOURNEY : null;
  if(!j) return [];
  const out = (j.fwd || []).map(s => ({ s, dir: "request" }));
  if(j.rev) out.push(...j.rev.map(s => ({ s, dir: "reply" })));
  return out.filter(h => h.s && h.s.link);
}
function clearInspHl(){ if(inspHl){ try{ inspHl.remove(); }catch(e){} inspHl = null; } }
function closeInspector(){
  inspState = null; clearInspHl();
  const el2 = document.getElementById("inspector");
  if(el2) el2.remove();
}
function openInspector(){
  if(!inspHops().length) return;
  inspState = { i: 0 };
  renderInspector();
}
function renderInspector(){
  try{
    if(!inspState) return;
    const hops = inspHops();
    if(!hops.length) return closeInspector();
    inspState.i = Math.max(0, Math.min(inspState.i, hops.length - 1));
    let card = document.getElementById("inspector");
    if(!card){ card = document.createElement("div"); card.id = "inspector"; document.body.appendChild(card); }
    card.innerHTML = "";
    const { s, dir } = hops[inspState.i];
    const prev = inspState.i > 0 ? hops[inspState.i - 1] : null;
    const l = links[s.link];
    const toDev = devices[s.dev];
    const fromDev = l ? devices[l.a.dev === s.dev ? l.b.dev : l.a.dev] : null;
    const toPort = l ? (l.a.dev === s.dev ? l.a.port : l.b.port) : null;

    const head = document.createElement("div"); head.className = "insp-head";
    const ht = document.createElement("span");
    ht.textContent = "Packet: hop " + (inspState.i + 1) + " of " + hops.length + " — " + dir;
    const x = document.createElement("button"); x.className = "insp-x"; x.textContent = "✕";
    x.onclick = closeInspector;
    head.append(ht, x);
    card.appendChild(head);

    const route = document.createElement("div"); route.className = "insp-route";
    route.textContent = (fromDev ? fromDev.name : "?") + "  ▸  " + (toDev ? toDev.name : "?") +
      (l && l.kind && l.kind !== "lan" ? "   [" + l.kind + "]" : "");
    card.appendChild(route);

    const grid = document.createElement("div"); grid.className = "insp-grid";
    const field = (k, v, hot) => {
      const kk = document.createElement("div"); kk.className = "insp-k"; kk.textContent = k;
      const vv = document.createElement("div"); vv.className = "insp-v" + (hot ? " hot" : ""); vv.textContent = v;
      grid.append(kk, vv);
    };
    const macChanged = prev && prev.s.srcMac !== s.srcMac;
    const natChanged = prev && prev.dir === dir && prev.s.srcIp !== s.srcIp;
    field("src MAC", s.srcMac || "?", macChanged);
    field("dst MAC", toDev && toPort ? macOf(s.dev, toPort) : "?", macChanged);
    field("src IP", s.srcIp || "?", natChanged);
    field("dst IP", s.dstIp || "?", false);
    card.appendChild(grid);

    const notes = document.createElement("div"); notes.className = "insp-notes";
    const note = t2 => { const n = document.createElement("div"); n.textContent = "• " + t2; notes.appendChild(n); };
    if(inspState.i === 0) note("The journey begins — these are the fields a real capture (tcpdump, Wireshark) would show.");
    if(prev && prev.dir === "request" && dir === "reply") note("The REPLY begins: source and destination swap, and the whole journey must work mirrored.");
    if(natChanged) note("NAT happened here: the source IP was rewritten (" + prev.s.srcIp + " → " + s.srcIp + "). The far side will answer to the NEW address.");
    if(macChanged && !natChanged && prev && prev.dir === dir) note("A routed hop: the MAC addresses changed — MACs are per-street and rewritten by every router — while the IPs ride through unchanged.");
    if(!prev) card.appendChild(notes); else card.appendChild(notes);

    const row = document.createElement("div"); row.className = "insp-btns";
    const bk = document.createElement("button"); bk.textContent = "◂ prev";
    bk.disabled = inspState.i === 0;
    bk.onclick = () => { inspState.i--; renderInspector(); };
    const fw = document.createElement("button"); fw.textContent = "next ▸";
    fw.disabled = inspState.i >= hops.length - 1;
    fw.onclick = () => { inspState.i++; renderInspector(); };
    row.append(bk, fw);
    card.appendChild(row);

    clearInspHl();
    if(l && animLayer && devices[l.a.dev] && devices[l.b.dev]){
      const [x1, y1] = portXY(devices[l.a.dev], l.a.port);
      const [x2, y2] = portXY(devices[l.b.dev], l.b.port);
      inspHl = el("line", { x1, y1, x2, y2, class: "insp-hl" }, animLayer);
    }
  }catch(e){}
}

/* ---------- link popover ---------- */
const popover = document.getElementById("popover");
function showLinkPopover(e, lid){
  const l = links[lid];
  if(!l) return;
  const devA = devices[l.a.dev], devB = devices[l.b.dev];
  popover.innerHTML = "";
  const title = document.createElement("div"); title.className = "pv-title";
  title.textContent = `${devA.name}:${l.a.port} ↔ ${devB.name}:${l.b.port}`;
  const k = document.createElement("div"); k.className = "pv-line";
  k.textContent = "Type: " + ({ lan: "LAN / Data", mgmt: "Management (out-of-band)", console: "Console (no network path)", remote: "Remote / WAN", wifi: "Wireless association" }[l.kind || "lan"]);
  const st = document.createElement("div"); st.className = "pv-line";
  st.textContent = "Status: " + linkStatusLabel(lid);
  const ln = document.createElement("div"); ln.className = "pv-line";
  ln.textContent = "Run length: ~" + linkLenM(l) + " m" +
    (l.kind !== "wifi" && linkLenM(l) > 100 ? "  — over the Cat6 100 m limit!" : "");
  const del = document.createElement("button");
  del.textContent = "Unplug this cable";
  del.onclick = () => deleteLink(lid);
  if((l.kind || "lan") === "lan" || l.kind === "remote"){
    const spd = document.createElement("button");
    const curSpd = () => l.speed || 1;
    spd.textContent = "Speed: " + speedLabel(curSpd()) + " — click to change";
    spd.onclick = (e2) => {
      e2.stopPropagation();
      const i = SPEED_STEPS.indexOf(curSpd());
      l.speed = SPEED_STEPS[(i + 1) % SPEED_STEPS.length];
      spd.textContent = "Speed: " + speedLabel(l.speed) + " — click to change";
      touchState();
    };
    popover.appendChild(spd);
  }
  const fail = document.createElement("button");
  fail.textContent = l.failed ? "Restore (end what-if failure)" : "Simulate failure (what-if)";
  fail.onclick = () => {
    l.failed = !l.failed;
    hidePopover();
    rebuildAllDerived();
    touchState();
  };
  popover.append(title, k, st, fail, del);
  popover.style.display = "block";
  popover.style.left = Math.min(e.clientX + 10, (window.innerWidth || 1200) - 300) + "px";
  popover.style.top = (e.clientY + 10) + "px";
}
function showPortPopover(e, devId, portId){
  const dev = devices[devId];
  if(!dev) return;
  popover.innerHTML = "";
  const title = document.createElement("div"); title.className = "pv-title";
  title.textContent = `${dev.name} — ${portId}`;
  const info = document.createElement("div"); info.className = "pv-line";
  info.textContent = portTitle(dev, portId);
  const open = document.createElement("button");
  open.textContent = "Open device CLI";
  open.onclick = () => { hidePopover(); openCli(devId); };
  const fail = document.createElement("button");
  fail.textContent = dev.failed ? "Restore device (end what-if failure)" : "Simulate device failure (what-if)";
  fail.onclick = () => {
    dev.failed = !dev.failed;
    hidePopover();
    rebuildAllDerived();
    touchState();
  };
  const rm = document.createElement("button");
  rm.className = "pv-danger";
  rm.textContent = "Remove this device (undo-able)";
  rm.onclick = () => { hidePopover(); deleteDevice(devId); };
  if(dev.type === "ap"){
    const inj = document.createElement("button");
    inj.textContent = dev.cfg.injector
      ? "PoE injector: fitted (click to remove)"
      : "PoE injector: none (click to fit one — powers the AP without a PoE switch)";
    inj.onclick = () => {
      dev.cfg.injector = !dev.cfg.injector;
      hidePopover();
      rebuildAllDerived();
      touchState();
    };
    popover.append(title, info, open, inj, fail, rm);
  } else popover.append(title, info, open, fail, rm);
  popover.style.display = "block";
  popover.style.left = Math.min(e.clientX + 10, (window.innerWidth || 1200) - 300) + "px";
  popover.style.top = (e.clientY + 10) + "px";
}
function hidePopover(){ popover.style.display = "none"; }
document.addEventListener("click", (e) => {
  if(!popover.contains(e.target)) hidePopover();
}, true);

/* ============================================================
   MODALS
   ============================================================ */
const modalRoot = document.getElementById("modal-root");
function showModal(build){
  return new Promise(resolve => {
    modalRoot.innerHTML = "";
    modalRoot.classList.add("open");
    const box = document.createElement("div");
    box.className = "modal";
    const done = (v) => { modalRoot.classList.remove("open"); modalRoot.innerHTML = ""; resolve(v); };
    build(box, done);
    modalRoot.appendChild(box);
    modalRoot.onclick = (e) => { if(e.target === modalRoot) done(null); };
    const esc = (e) => { if(e.key === "Escape"){ done(null); document.removeEventListener("keydown", esc); } };
    document.addEventListener("keydown", esc);
  });
}
function modalChoice(title, desc, options){
  return showModal((box, done) => {
    const h = document.createElement("h3"); h.textContent = title; box.appendChild(h);
    if(desc){ const p = document.createElement("p"); p.textContent = desc; box.appendChild(p); }
    let n = 0;
    options.forEach((o) => {
      if(o.header){
        const hd = document.createElement("div");
        hd.className = "cm-head";
        hd.textContent = o.header;
        box.appendChild(hd);
        return;
      }
      n++;
      const row = document.createElement("label");
      row.className = "mrow";
      row.innerHTML = `<b>${n}. ${o.label}</b><small>${o.desc || ""}</small>`;
      row.onclick = () => done(o.value);
      box.appendChild(row);
    });
    const btns = document.createElement("div"); btns.className = "mbtns";
    const cancel = document.createElement("button"); cancel.textContent = "Cancel"; cancel.onclick = () => done(null);
    btns.appendChild(cancel); box.appendChild(btns);
  });
}
function modalInput(title, desc, def, type){
  return showModal((box, done) => {
    const h = document.createElement("h3"); h.textContent = title; box.appendChild(h);
    if(desc){ const p = document.createElement("p"); p.textContent = desc; box.appendChild(p); }
    const isArea = type === "textarea";
    const inp = document.createElement(isArea ? "textarea" : "input");
    if(!isArea) inp.type = type || "text";
    inp.value = def === undefined ? "" : def;
    if(!isArea) inp.onkeydown = (e) => { if(e.key === "Enter") done(inp.value); };
    box.appendChild(inp);
    const btns = document.createElement("div"); btns.className = "mbtns";
    const cancel = document.createElement("button"); cancel.textContent = "Cancel"; cancel.onclick = () => done(null);
    const ok = document.createElement("button"); ok.textContent = "OK"; ok.className = "primary"; ok.onclick = () => done(inp.value);
    btns.append(cancel, ok); box.appendChild(btns);
    setTimeout(() => inp.focus(), 30);
  });
}
function modalConfirm(title, desc, okLabel){
  return showModal((box, done) => {
    const h = document.createElement("h3"); h.textContent = title; box.appendChild(h);
    if(desc){ const p = document.createElement("p"); p.textContent = desc; box.appendChild(p); }
    const btns = document.createElement("div"); btns.className = "mbtns";
    const cancel = document.createElement("button"); cancel.textContent = "Cancel"; cancel.onclick = () => done(false);
    const ok = document.createElement("button"); ok.textContent = okLabel || "OK"; ok.className = "primary"; ok.onclick = () => done(true);
    btns.append(cancel, ok); box.appendChild(btns);
  });
}

/* ============================================================
   TOOLBAR
   ============================================================ */
function spawnPos(dy){
  const c = worldCenter();
  return { x: c.x - 60 + Math.random() * 60, y: c.y - 60 + (dy || 0) + Math.random() * 40 };
}
const SWITCH_MODELS = [
  { header: "Juniper" },
  { value: { model: "EX2300-C-12T", ports: 12 }, label: "EX2300-C-12T — 12 ports", desc: "Compact fanless branch/desk switch" },
  { value: { model: "EX2300-24P", ports: 24 }, label: "EX2300-24P — 24 ports, PoE+", desc: "Access switch that powers APs and phones (370 W PoE budget)" },
  { value: { model: "EX3400-24T", ports: 24 }, label: "EX3400-24T — 24 ports", desc: "The access-layer workhorse (no PoE)" },
  { value: { model: "EX4300-48T", ports: 48 }, label: "EX4300-48T — 48 ports", desc: "Full wiring-closet access switch (no PoE)" },
  { value: { model: "EX4300-48P", ports: 48 }, label: "EX4300-48P — 48 ports, PoE+", desc: "Wiring closet that also powers everything (900 W PoE budget)" },
  { header: "Ubiquiti" },
  { value: { model: "USW-Lite-8-PoE", ports: 8 }, label: "USW-Lite-8-PoE — 8 ports", desc: "Small rooms and desks" },
  { value: { model: "USW-Pro-24", ports: 24 }, label: "USW-Pro-24 — 24 ports", desc: "UniFi office workhorse (no PoE)" },
  { value: { model: "USW-Pro-24-PoE", ports: 24 }, label: "USW-Pro-24-PoE — 24 ports, PoE+", desc: "The UniFi closet standard (400 W PoE budget)" },
  { value: { model: "USW-Pro-48", ports: 48 }, label: "USW-Pro-48 — 48 ports", desc: "UniFi full wiring closet" },
  { header: "Other" },
  { value: "custom", label: "Custom port count", desc: "Not a real SKU — excluded from pricing (1-96 ports)" },
];
const ROUTER_MODELS = [
  { header: "Juniper" },
  { value: { model: "MX104", ports: 4 }, label: "MX104 — 4 ports", desc: "Small aggregation router" },
  { value: { model: "SRX300", ports: 8 }, label: "SRX300 — 8 ports", desc: "Branch services gateway" },
  { value: { model: "MX204", ports: 12 }, label: "MX204 — 12 ports", desc: "Compact high-density core" },
  { header: "Ubiquiti" },
  { value: { model: "UXG-Lite", ports: 2 }, label: "UXG-Lite — 2 ports", desc: "Tiny gateway: one WAN, one LAN" },
  { value: { model: "UDM-Pro", ports: 10 }, label: "UDM-Pro — 10 ports", desc: "All-in-one UniFi gateway" },
  { header: "Other" },
  { value: "custom", label: "Custom port count", desc: "Not a real SKU — excluded from pricing (1-16 ports)" },
];
async function pickAndPlace(kind){
  const isSwitch = kind === "switch";
  const v = await modalChoice(isSwitch ? "New switch" : "New router",
    "Pick a platform — port counts are the real ones, and show version reports the model. Ubiquiti is the budget tier; in this lab every box speaks JunOS.",
    isSwitch ? SWITCH_MODELS : ROUTER_MODELS);
  if(v === null) return;
  let model = null, ports;
  if(v === "custom"){
    const c = await modalInput("Custom " + kind, "How many ports?", isSwitch ? "8" : "4", "number");
    if(c === null) return;
    const n = parseInt(c, 10);
    const max = isSwitch ? 96 : 16;
    ports = isNaN(n) || n < 1 || n > max ? (isSwitch ? 8 : 4) : n;
  } else { model = v.model; ports = v.ports; }
  const cond = await modalChoice("Condition",
    "Brand new is the real first boot: it arrives powered off — power it on, log in as root, and the first commit demands a root password (see Reference: Day zero).", [
    { value: "racked", label: "Racked and running", desc: "Powered on, lab-ready, auto-logged-in — the usual choice" },
    { value: "new", label: "Brand new, in the box", desc: "Powered off, factory defaults, root login, day-zero setup" },
  ]);
  if(cond === null) return;
  const p = spawnPos(isSwitch ? -40 : 0);
  pushUndo();
  const id = isSwitch ? makeSwitch(p.x, p.y, ports, model) : makeRouter(p.x, p.y, ports, model);
  if(cond === "new"){
    const d = devices[id];
    d.powered = false;
    d.brandNew = true;
    d.user = "root";
  }
  rebuildAllDerived(); touchState();
  clickIntoRack(id);
}
document.getElementById("add-switch").onclick = () => pickAndPlace("switch");
document.getElementById("add-router").onclick = () => pickAndPlace("router");
const AP_MODELS = [
  { header: "Juniper Mist" },
  { value: { model: "AP24", radius: 130 }, label: "AP24 — compact", desc: "Small rooms; ~33 m coverage, draws 14 W PoE" },
  { value: { model: "AP34", radius: 165 }, label: "AP34 — standard office", desc: "The default choice; ~41 m coverage, draws 18 W PoE" },
  { value: { model: "AP45", radius: 200 }, label: "AP45 — high density", desc: "Large open spaces; ~50 m coverage, draws 22 W PoE" },
  { header: "Ubiquiti UniFi" },
  { value: { model: "U6+", radius: 140 }, label: "U6+ — budget Wi-Fi 6", desc: "~35 m coverage, draws 14 W PoE; the price-per-desk favourite" },
  { value: { model: "U7-Pro", radius: 200 }, label: "U7-Pro — Wi-Fi 7", desc: "~50 m coverage, draws 21 W PoE; big open spaces" },
];
document.getElementById("add-ap").onclick = async () => {
  const m = await modalChoice("New access point",
    "Cloud-managed Wi-Fi: cable its eth0 into an access port, and hosts inside the dashed coverage circle can wifi join its SSID.", AP_MODELS);
  if(m === null) return;
  const ssid = await modalInput("SSID", "The network name hosts see in wifi scan.", "office-wifi", "text");
  if(ssid === null || !ssid.trim()) return;
  pushUndo();
  const p = spawnPos(30);
  makeAp(p.x, p.y, ssid.trim(), m.model, m.radius);
  rebuildAllDerived(); touchState();
};
document.getElementById("add-rack").onclick = async () => {
  const n = await modalInput("New rack",
    "A steel frame inside a building: drop switches, routers and servers on it and they click into the rails, top-down like a real elevation. In-rack links price as DACs.",
    "Rack A" + (Object.values(zones).filter(z => z.kind === "rack").length + 1), "text");
  if(n === null || !n.trim()) return;
  pushUndo();
  const cpos = worldCenter();
  const id = uid("zn");
  zones[id] = { id, name: n.trim(), x: cpos.x - 80, y: cpos.y - 110, w: 170, h: 230, hue: 0, kind: "rack" };
  touchState();
};
const CRAC_MODELS = [
  { header: "Room / closet" },
  { value: { model: "Portable AC 3.5kW", cool: 3500 }, label: "Portable AC — 3.5 kW", desc: "One hot closet's worth of cooling" },
  { header: "Datacenter" },
  { value: { model: "In-row CRAC 10kW", cool: 10000 }, label: "In-row CRAC — 10 kW", desc: "Serious rack-row cooling" },
  { value: { model: "CRAH 30kW", cool: 30000 }, label: "CRAH — 30 kW", desc: "Chilled-water room unit" },
];
document.getElementById("add-crac").onclick = async () => {
  const m = await modalChoice("New cooling unit",
    "Every powered device pours heat into its building; cooling takes it back out. Place the unit INSIDE the room it should cool — the building header shows the live temperature.", CRAC_MODELS);
  if(m === null) return;
  pushUndo();
  const p = spawnPos(60);
  makeCrac(p.x, p.y, m.model, m.cool);
  rebuildAllDerived(); touchState();
};
const UPS_MODELS = [
  { header: "Rack-mount (generic — estimates)" },
  { value: { model: "1U Rack UPS 1000W", capW: 1000 }, label: "1U rack UPS — 1000 W", desc: "Carries a switch, a server and change through an outage" },
  { value: { model: "2U Rack UPS 2700W", capW: 2700 }, label: "2U rack UPS — 2700 W", desc: "A whole small rack: servers, switches, cooling" },
];
document.getElementById("add-tray").onclick = async () => {
  const lvl = await modalChoice("New cable tray",
    "A shared pathway: every cable whose two ends sit near it routes ALONG it automatically — bundled, measured honestly (the up-and-down drops are charged per end), and checked for overfill.", [
    { value: "ceiling", label: "Ceiling basket", desc: "Above the suspended ceiling; ~2.7 m drop per end; holds ~40 cables" },
    { value: "wall", label: "Wall trunking", desc: "Surface duct at desk height; ~0.6 m per end; ~20 cables" },
    { value: "underfloor", label: "Underfloor duct", desc: "Raised-floor route; ~0.3 m per end; ~50 cables" },
  ]);
  if(lvl === null) return;
  pushUndo();
  const p = spawnPos(0);
  const id = "z_" + uid("tray");
  zones[id] = { id, name: "Tray " + String.fromCharCode(65 + allTrays().length),
    x: p.x - 130, y: p.y - 12, w: 260, h: 24, hue: 0, kind: "tray", level: lvl };
  touchState();
};
document.getElementById("add-desk").onclick = async () => {
  const n = await modalInput("New desk",
    "Furniture for PCs: drop them on it and they snap into a row. The desk is also the cabling OUTLET — its runs are labeled by desk name in the schedule, like a real patch list.",
    "Desk " + (Object.values(zones).filter(z => z.kind === "desk").length + 1), "text");
  if(n === null || !n.trim()) return;
  pushUndo();
  const p = spawnPos(20);
  const id = "z_" + uid("desk");
  zones[id] = { id, name: n.trim(), x: p.x - 110, y: p.y - 50, w: 220, h: 104, hue: 5, kind: "desk" };
  touchState();
};
document.getElementById("add-ups").onclick = async () => {
  const m = await modalChoice("New UPS",
    'A battery between the grid and your gear. Size it against the building\'s infrastructure load (open the UPS status), then drill an outage with the building\'s "grid" button — hosts have laptop batteries, your racks do not.', UPS_MODELS);
  if(m === null) return;
  pushUndo();
  const p = spawnPos(50);
  const id = makeUps(p.x, p.y, m.model, m.capW);
  rebuildAllDerived(); touchState();
  clickIntoRack(id);
};
document.getElementById("add-host").onclick = () => {
  const p = spawnPos(60);
  pushUndo();
  makeHost(p.x, p.y);
  touchState();
};
document.getElementById("add-server").onclick = () => {
  const p = spawnPos(40);
  pushUndo();
  const id = makeServer(p.x, p.y);
  rebuildAllDerived();
  touchState();
  clickIntoRack(id);
};
document.getElementById("add-isp").onclick = async () => {
  const v = await modalInput("New ISP uplink", "Public IP the provider hands you a /30 to. Your router's WAN port must live in the same /30.", "203.0.113.1", "text");
  if(v === null) return;
  const p = spawnPos(-80);
  pushUndo();
  makeIsp(p.x, p.y, validIp(v) ? v : "203.0.113.1");
  touchState();
};
function setMode(m){
  mode = m; armedPort = null;
  ["link-mode", "del-mode"].forEach(id => document.getElementById(id).classList.remove("active"));
  if(m === "link") document.getElementById("link-mode").classList.add("active");
  if(m === "delete") document.getElementById("del-mode").classList.add("active");
  const hint = document.getElementById("hint");
  hint.textContent =
    m === "link" ? LINK_HINT :
    m === "delete" ? "Click a device or a cable to delete it. Click Delete again to stop." :
    "Click a device for its CLI. Drag to move. Wheel = zoom, drag background = pan.";
  render();
}
document.getElementById("link-mode").onclick = () => setMode(mode === "link" ? "normal" : "link");
document.getElementById("del-mode").onclick = () => setMode(mode === "delete" ? "normal" : "delete");
const LINK_HINT = "Click two ports to connect them. Connect ▾ picks the cable type. Click Connect again to stop.";
function restoreLinkHint(){
  const hintEl = document.getElementById("hint");
  if(hintEl && mode === "link") hintEl.textContent = LINK_HINT;
}
function updateConnectLabel(){
  const b = document.getElementById("link-mode");
  if(b) b.textContent = "Connect: " + CABLE_KIND_META[currentCableKind()].label;
}
function hideCableMenu(){
  const m = document.getElementById("cable-menu");
  if(m) m.style.display = "none";
}
function openCableMenu(){
  const m = document.getElementById("cable-menu");
  if(!m) return;
  m.innerHTML = "";
  for(const k of CABLE_KINDS){
    const row = document.createElement("div");
    row.className = "cm-row" + (k === currentCableKind() ? " sel" : "");
    const b = document.createElement("b");
    b.textContent = (k === currentCableKind() ? "✓ " : "") + CABLE_KIND_META[k].label;
    const sm = document.createElement("small");
    sm.textContent = CABLE_KIND_META[k].desc;
    row.append(b, sm);
    row.onclick = (e) => {
      e.stopPropagation();
      cableKind = k;
      try{ localStorage.setItem("junoslab-cable-kind", k); }catch(err){}
      updateConnectLabel();
      hideCableMenu();
      if(mode !== "link") setMode("link");   // picking a cable arms connect mode
      else restoreLinkHint();
    };
    m.appendChild(row);
  }
  m.style.display = "block";
}
document.getElementById("cable-kind-btn").onclick = (e) => {
  e.stopPropagation();
  const m = document.getElementById("cable-menu");
  if(m && m.style.display === "block") hideCableMenu(); else openCableMenu();
};
document.addEventListener("click", (e) => {
  const m = document.getElementById("cable-menu");
  if(m && m.style.display === "block"){
    const wrap = document.getElementById("connect-wrap");
    if(!wrap || !wrap.contains(e.target)) hideCableMenu();
  }
}, true);
updateConnectLabel();

/* ---------- visual layers (VLAN colors, IP labels) + undo ---------- */
var vlanView = false, ipLabels = false;
try{
  vlanView = localStorage.getItem("junoslab-vlanview") === "on";
  ipLabels = localStorage.getItem("junoslab-labels") === "on";
}catch(e){}
const VLAN_PALETTE = ["#4f8fd9", "#d97b4f", "#8e6bd9", "#3aa876", "#d9b23a", "#d95f9e", "#46b8c9", "#98b840"];
function vlanColor(id){ return VLAN_PALETTE[((+id) || 0) % VLAN_PALETTE.length]; }
function setLayerBtn(id, on){
  const b = document.getElementById(id);
  if(b) b.classList.toggle("active", on);
  if(typeof updateGroupBtns === "function") updateGroupBtns();
}
document.getElementById("vlan-btn").onclick = () => {
  vlanView = !vlanView;
  try{ localStorage.setItem("junoslab-vlanview", vlanView ? "on" : "off"); }catch(e){}
  setLayerBtn("vlan-btn", vlanView);
  render();
};
document.getElementById("label-btn").onclick = () => {
  ipLabels = !ipLabels;
  try{ localStorage.setItem("junoslab-labels", ipLabels ? "on" : "off"); }catch(e){}
  setLayerBtn("label-btn", ipLabels);
  render();
};
document.getElementById("lens-btn").onclick = () => {
  lensOn = !lensOn;
  try{ localStorage.setItem("junoslab-lens", lensOn ? "on" : "off"); }catch(e){}
  setLayerBtn("lens-btn", lensOn);
  render();
};
setLayerBtn("vlan-btn", vlanView);
setLayerBtn("label-btn", ipLabels);
setLayerBtn("lens-btn", lensOn);

function renderVlanLegend(){
  const lg = document.getElementById("vlan-legend");
  if(!lg) return;
  if(!vlanView){ lg.style.display = "none"; return; }
  const seen = new Map();
  for(const dev of Object.values(devices)){
    if(dev.type !== "switch" || !dev.d) continue;
    for(const [name, v] of Object.entries(dev.d.vlans))
      if(!isNaN(v.id) && !seen.has(name + "/" + v.id)) seen.set(name + "/" + v.id, { name, id: v.id });
  }
  lg.innerHTML = "";
  if(!seen.size){ lg.style.display = "none"; return; }
  lg.style.display = "flex";
  for(const { name, id } of seen.values()){
    const chip = document.createElement("span");
    chip.className = "vl-chip";
    const dot = document.createElement("span");
    dot.className = "vl-dot";
    dot.style.background = vlanColor(id);
    chip.append(dot, document.createTextNode(`${name} (${id})`));
    lg.appendChild(chip);
  }
}
function vlanEndInfo(dev, port){
  if(!dev || dev.type !== "switch" || !dev.d) return null;
  const pc = dev.d.portCfg[port];
  if(!pc || pc.ae) return null;
  if(pc.mode === "trunk") return { trunk: pc.vlanIds };
  return { color: vlanColor(pc.vlanIds[0]), id: pc.vlanIds[0] };
}
function applyVlanPaint(lid, l, line, parent, ax, ay, bx, by){
  const st = (NET && NET.linkStatus[lid]) || "down";
  if(st !== "up") return;
  const eA = vlanEndInfo(devices[l.a.dev], l.a.port);
  const eB = vlanEndInfo(devices[l.b.dev], l.b.port);
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const nx = -(by - ay) / len, ny = (bx - ax) / len;
  for(const [e, fx] of [[eA, 0.24], [eB, 0.76]]){
    if(!e || !e.trunk) continue;
    const x = ax + (bx - ax) * fx, y = ay + (by - ay) * fx;
    e.trunk.slice(0, 5).forEach((vid, i) => {
      const r = el("rect", { x: x + nx * (8 + i * 7) - 2.5, y: y + ny * (8 + i * 7) - 2.5,
        width: 5, height: 5, class: "vlanchip" }, parent);
      r.style.fill = vlanColor(vid);
    });
  }
  const cA = eA && eA.color ? eA : null;
  const cB = eB && eB.color ? eB : null;
  if(cA && cB && cA.id !== cB.id){
    // vlan translation: each half wears its own end's color
    line.style.stroke = cA.color;
    const half = el("line", { x1: (ax + bx) / 2, y1: (ay + by) / 2, x2: bx, y2: by, class: "link up" }, parent);
    half.style.stroke = cB.color;
    half.style.pointerEvents = "none";
  } else if(cA || cB){
    line.style.stroke = (cA || cB).color;
  }
}

const UNDO_STACK = [];
function pushUndo(){
  try{ UNDO_STACK.push(JSON.stringify(serializeLab())); }catch(e){ return; }
  if(UNDO_STACK.length > 20) UNDO_STACK.shift();
  const b = document.getElementById("undo-btn");
  if(b) b.disabled = false;
}
function undoLast(){
  if(!UNDO_STACK.length) return;
  loadLab(JSON.parse(UNDO_STACK.pop()));
  const b = document.getElementById("undo-btn");
  if(b) b.disabled = !UNDO_STACK.length;
}
document.getElementById("undo-btn").onclick = undoLast;
document.getElementById("undo-btn").disabled = true;
document.addEventListener("keydown", (e) => {
  if((e.ctrlKey || e.metaKey) && !e.shiftKey && String(e.key).toLowerCase() === "z"){
    const t = e.target;
    if(t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    e.preventDefault();
    undoLast();
  }
});

/* ---------- themes ---------- */
const THEMES = ["space", "terminal"];
function cssVar(name, fallback){
  try{
    if(typeof getComputedStyle === "function"){
      const v = getComputedStyle(document.body).getPropertyValue(name).trim();
      if(v) return v;
    }
  }catch(e){}
  return fallback;
}
function applyTheme(t){
  if(!THEMES.includes(t)) t = "space";
  document.body.className = t === "terminal" ? "" : "theme-" + t;
  const sel = document.getElementById("theme-select");
  if(sel) sel.value = t;
  try{ localStorage.setItem("junoslab-theme", t); }catch(e){}
  render();
}
document.getElementById("theme-select").onchange = (e) => applyTheme(e.target.value);
(function(){
  let t = null;
  try{ t = localStorage.getItem("junoslab-theme"); }catch(e){}
  applyTheme(t || "space");
})();

/* ============================================================
   SAVE / LOAD / MIGRATE / AUTOSAVE / EXPORT
   ============================================================ */
function serializeLab(){
  const devs = Object.values(devices).map(d => {
    const base = { id: d.id, type: d.type, x: Math.round(d.x), y: Math.round(d.y), name: d.name, portCount: d.ports.length, model: d.model || null };
    if(d.type === "switch" || d.type === "router"){
      base.config = d.config; base.candidate = d.candidate; base.stats = d.stats;
      if(d.powered === false) base.powered = false;
      if(d.brandNew) base.brandNew = true;
      if(d.user) base.user = d.user;
    } else {
      base.cfg = d.cfg;
      if(d.powered === false) base.powered = false;
    }
    return base;
  });
  return { v: 2, nextId, devices: devs, links, zones };
}
function loadLab(data){
  devices = {}; links = {}; zones = {}; openTabs = []; activeDevice = null;
  if(data && data.v === 2){
    nextId = data.nextId || 1;
    for(const s of data.devices || []){
      let dev;
      if(s.type === "switch" || s.type === "router"){
        dev = {
          id: s.id, type: s.type, x: s.x, y: s.y, name: s.name, model: s.model || null,
          ports: Array.from({ length: s.portCount || 4 }, (_, i) => ({ id: `ge-0/0/${i}` })),
          config: s.config || {}, candidate: s.candidate || deepClone(s.config || {}),
          cfgHistory: [], errDisabled: {}, macTable: [], arp: {}, stats: s.stats || {},
          commitPending: null, cli: freshCli(),
          powered: s.powered === false ? false : undefined,
          brandNew: !!s.brandNew, user: s.user || undefined,
        };
        if(dev.brandNew && dev.powered !== false) dev.cli.stage = "login";
      } else if(s.type === "host"){
        dev = { id: s.id, type: "host", x: s.x, y: s.y, name: s.name, ports: [{ id: "eth0" }],
          cfg: s.cfg || { ip: null, bits: null, gw: null }, arp: {}, cli: freshCli() };
      } else if(s.type === "ap"){
        dev = { id: s.id, type: "ap", x: s.x, y: s.y, name: s.name, model: s.model || null, ports: [{ id: "eth0" }],
          cfg: s.cfg || { ssid: s.name, radius: 160 }, cli: freshCli() };
      } else if(s.type === "server"){
        dev = { id: s.id, type: "server", x: s.x, y: s.y, name: s.name, ports: [{ id: "eth0" }],
          cfg: s.cfg || { ip: null, bits: null, gw: null, ns: null, services: {}, records: {} },
          arp: {}, cli: freshCli(),
          powered: s.powered === false ? false : undefined };
      } else if(s.type === "ups"){
        dev = { id: s.id, type: "ups", x: s.x, y: s.y, name: s.name, model: s.model || null, ports: [],
          cfg: s.cfg || { capW: 1000 }, cli: freshCli() };
      } else if(s.type === "crac"){
        dev = { id: s.id, type: "crac", x: s.x, y: s.y, name: s.name, model: s.model || null, ports: [],
          cfg: s.cfg || { coolW: 3500 }, cli: freshCli(),
          powered: s.powered === false ? false : undefined };
      } else {
        dev = { id: s.id, type: "isp", x: s.x, y: s.y, name: s.name || "ISP", ports: [{ id: "wan0" }],
          cfg: s.cfg || { ip: "203.0.113.1", bits: 30 }, cli: freshCli() };
      }
      devices[dev.id] = dev;
    }
    links = data.links || {};
    zones = data.zones || {};
  } else if(data && data.devices){
    migrateV1(data);
  }
  for(const z of Object.values(zones)) if(z.kind === "rack") packRack(z);
  rebuildAllDerived();
  closeCliPanel();
  touchState();
}
function migrateV1(data){
  nextId = data.nextId || 1;
  for(const old of Object.values(data.devices || {})){
    if(old.type === "switch"){
      const id = old.id;
      const cfg = {};
      if(old.cfg && old.cfg.hostname && old.cfg.hostname !== id) cfgSet(cfg, ["system", "host-name"], old.cfg.hostname);
      for(const [vn, vid] of Object.entries((old.cfg && old.cfg.vlans) || {}))
        if(vn !== "default") cfgSet(cfg, ["vlans", vn, "vlan-id"], String(vid));
      (old.ports || []).forEach(p => {
        if(p.disabled) cfgEnsure(cfg, ["interfaces", p.id, "disable"]);
        if(p.vlan && p.vlan !== "default")
          cfgSet(cfg, ["interfaces", p.id, "unit", "0", "family", "ethernet-switching", "vlan", "members"], [p.vlan]);
      });
      devices[id] = { id, type: "switch", x: old.x, y: old.y, name: old.cfg && old.cfg.hostname || id,
        ports: (old.ports || []).map(p => ({ id: p.id })), config: cfg, candidate: deepClone(cfg),
        cfgHistory: [], errDisabled: {}, macTable: [], arp: {}, stats: {}, commitPending: null, cli: freshCli() };
    } else if(old.type === "router"){
      const id = old.id;
      const cfg = {};
      if(old.cfg && old.cfg.hostname && old.cfg.hostname !== id) cfgSet(cfg, ["system", "host-name"], old.cfg.hostname);
      (old.ports || []).forEach(p => {
        if(p.disabled) cfgEnsure(cfg, ["interfaces", p.id, "disable"]);
        if(p.ip) cfgSet(cfg, ["interfaces", p.id, "unit", "0", "family", "inet", "address"], [p.ip + "/" + (p.mask || 24)]);
      });
      ((old.cfg && old.cfg.routes) || []).forEach(r =>
        cfgSet(cfg, ["routing-options", "static", "route", r.destNet + "/" + r.destBits, "next-hop"], r.nextHopIp));
      devices[id] = { id, type: "router", x: old.x, y: old.y, name: old.cfg && old.cfg.hostname || id,
        ports: (old.ports || []).map(p => ({ id: p.id })), config: cfg, candidate: deepClone(cfg),
        cfgHistory: [], errDisabled: {}, macTable: [], arp: {}, stats: {}, commitPending: null, cli: freshCli() };
    } else if(old.type === "host"){
      devices[old.id] = { id: old.id, type: "host", x: old.x, y: old.y, name: old.name, ports: [{ id: "eth0" }],
        cfg: { ip: (old.cfg && old.cfg.ip) || null, bits: old.cfg && old.cfg.mask ? +old.cfg.mask : null, gw: null },
        arp: {}, cli: freshCli() };
    } else if(old.type === "isp"){
      devices[old.id] = { id: old.id, type: "isp", x: old.x, y: old.y, name: old.name || "ISP", ports: [{ id: "wan0" }],
        cfg: { ip: (old.cfg && old.cfg.ip) || "203.0.113.1", bits: 30 }, cli: freshCli() };
    }
  }
  links = data.links || {};
  Object.values(links).forEach(l => { if(!l.kind) l.kind = "lan"; });
}
let autosaveTimer = null;
function scheduleAutosave(){
  if(autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    try{ localStorage.setItem(LS_AUTOSAVE, JSON.stringify(serializeLab())); }catch(e){}
  }, 800);
}
document.getElementById("save").onclick = () => {
  const blob = new Blob([JSON.stringify(serializeLab(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "junos-lab-save.json"; a.click();
};
document.getElementById("load").onclick = () => {
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "application/json";
  inp.onchange = () => {
    const reader = new FileReader();
    reader.onload = () => { try{ pushUndo(); loadLab(JSON.parse(reader.result)); }catch(e){ modalConfirm("Load failed", "That file doesn't look like a JunOS Lab save: " + e.message, "OK"); } };
    reader.readAsText(inp.files[0]);
  };
  inp.click();
};
document.getElementById("export-configs").onclick = () => {
  const parts = [];
  for(const dev of Object.values(devices)){
    if(dev.type === "switch" || dev.type === "router"){
      parts.push(`## ===== ${hostnameOf(dev)} (${dev.type}) =====\n` + showConfigCmd(dev));
    } else if(dev.type === "host"){
      parts.push(`## ===== ${dev.name} (host) =====\n# ip: ${dev.cfg.ip || "-"}/${dev.cfg.bits || "-"}  gw: ${dev.cfg.gw || "-"}`);
    }
  }
  const blob = new Blob([parts.join("\n\n") + "\n"], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "junos-lab-configs.txt"; a.click();
};
document.getElementById("clear").onclick = async () => {
  if(!(await modalConfirm("Wipe the whole lab?", "Every device, cable and config goes. Scenario progress is kept.", "Wipe it"))) return;
  pushUndo();
  devices = {}; links = {}; zones = {}; nextId = 1; openTabs = []; activeDevice = null;
  rebuildAllDerived();
  closeCliPanel();
  touchState();
};

/* ============================================================
   CLI PANEL (tabs, history, ?, Tab-completion)
   ============================================================ */
const cliEl = document.getElementById("cli");
const cliLog = document.getElementById("cli-log");
const cliInput = document.getElementById("cli-input");
const cliPrompt = document.getElementById("cli-prompt");
const cliTabs = document.getElementById("cli-tabs");
const cliCountdown = document.getElementById("cli-countdown");

function promptStr(dev){
  if((dev.type === "host" || dev.type === "server") && dev.cli.sshTo && devices[dev.cli.sshTo])
    return promptStr(devices[dev.cli.sshTo]);
  if(dev.type === "host") return dev.name + "$ ";
  if(dev.type === "isp") return dev.name + "> ";
  if(dev.type === "crac") return "hvac% ";
  if(dev.powered === false) return "";
  const st = dev.cli.stage;
  if(st === "boot") return "";
  if(st === "login") return "login: ";
  if(st === "shell") return "root@% ";
  if(st === "newpass") return "New password: ";
  if(st === "retype") return "Retype new password: ";
  const u = dev.user || "kaatje";
  const named = cfgGet(dev.config, ["system", "host-name"]);
  const base = (u === "root" && !named) ? "root" : u + "@" + hostnameOf(dev);
  return base + (dev.cli.mode === "cfg" ? "# " : "> ");
}
function bannerFor(dev){
  if(dev.type === "crac") return `--- ${dev.model || "cooling unit"} --- (type status)`;
  if((dev.type === "switch" || dev.type === "router") && dev.powered === false)
    return "(the chassis is dark — press the power button on the faceplate to boot it)";
  if((dev.type === "switch" || dev.type === "router") && dev.cli.stage)
    return "";
  if(dev.type === "switch" || dev.type === "router")
    return `login: ${dev.user || "kaatje"}\nPassword:\n--- JUNOS 23.4R1.10 (lab) ---\n` +
      `(every real session authenticates first — the lab auto-logs you in on racked gear; brand-new boxes make you do it for real)\n` +
      `Tip: type ? at any point — it lists what can come next, exactly like the real CLI.`;
  if(dev.type === "isp") return `--- upstream provider link: ${dev.name} (read-only) ---`;
  return `--- ${dev.name} — linux shell (type ? for commands) ---`;
}
function openCli(devId){
  const dev = devices[devId];
  if(!dev) return;
  if(!openTabs.includes(devId)) openTabs.push(devId);
  activeDevice = devId;
  dev.cli = dev.cli || freshCli();
  const ban = bannerFor(dev);
  if(!dev.cli.log.length && ban) dev.cli.log.push({ cls: "sys", text: ban });
  cliEl.classList.add("open");
  refreshCliView();
  cliInput.focus();
  render();
}
function closeTab(devId){
  openTabs = openTabs.filter(id => id !== devId);
  if(activeDevice === devId) activeDevice = openTabs[openTabs.length - 1] || null;
  if(!openTabs.length) closeCliPanel();
  else refreshCliView();
  render();
}
function closeCliPanel(){
  cliEl.classList.remove("open");
  activeDevice = null;
  render();
}
document.getElementById("closecli").onclick = () => { openTabs = []; closeCliPanel(); };

function renderTabs(){
  cliTabs.innerHTML = "";
  for(const id of openTabs){
    const dev = devices[id];
    if(!dev) continue;
    const tab = document.createElement("div");
    tab.className = "cli-tab" + (id === activeDevice ? " active" : "");
    const name = document.createElement("span");
    name.textContent = dev.name + " (" + dev.type + ")";
    const x = document.createElement("span");
    x.className = "x"; x.textContent = "✕";
    x.onclick = (e) => { e.stopPropagation(); closeTab(id); };
    tab.append(name, x);
    tab.onclick = () => { activeDevice = id; refreshCliView(); cliInput.focus(); render(); };
    cliTabs.appendChild(tab);
  }
}
function renderCliLog(){
  cliLog.innerHTML = "";
  const dev = devices[activeDevice];
  if(!dev) return;
  for(const l of dev.cli.log.slice(-400)){
    const div = document.createElement("div");
    div.className = l.cls;
    div.textContent = l.text;
    cliLog.appendChild(div);
  }
  cliLog.scrollTop = cliLog.scrollHeight;
}
function refreshCliView(){
  renderTabs();
  renderCliLog();
  const dev = devices[activeDevice];
  cliPrompt.textContent = dev ? promptStr(dev).trimEnd() : ">";
  updateCountdown();
  if(typeof updateGhost === "function") updateGhost();
}
function updateCountdown(){
  const dev = devices[activeDevice];
  if(dev && dev.commitPending){
    const s = Math.max(0, Math.round((dev.commitPending.expiresAt - Date.now()) / 1000));
    cliCountdown.textContent = `commit confirmed — auto-rollback in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} (type commit to keep it)`;
  } else cliCountdown.textContent = "";
}
setInterval(() => { updateCountdown(); if(typeof updateExamTimer === "function") updateExamTimer(); }, 1000);

cliInput.addEventListener("keydown", (e) => {
  const dev = devices[activeDevice];
  if(!dev) return;
  if(e.key === "Enter"){
    const raw = cliInput.value;
    cliInput.value = "";
    const masked = dev.cli.stage === "newpass" || dev.cli.stage === "retype";
    dev.cli.log.push({ cls: "cmd", text: promptStr(dev) + (masked ? "" : raw) });
    if(dev.cli.mode === "cfg" && raw.trim() && dev.cli.editKeys.length && !dev.cli.stage)
      dev.cli.log.push({ cls: "sys", text: cfgBanner(dev) });
    const out = deviceExec(dev, raw);
    dev.cli.log.push(...out);
    if(out.some(l => l.cls === "err") && typeof termBell === "function") termBell();
    if(raw.trim() && !masked && !dev.cli.stage){ dev.cli.history.push(raw); dev.cli.hIdx = dev.cli.history.length; }
    refreshCliView();
    touchState();
    return;
  }
  if(e.key === "?"){
    e.preventDefault();
    const cur = cliInput.value;
    dev.cli.log.push({ cls: "cmd", text: promptStr(dev) + cur + "?" });
    const res = completionsFor(dev, cur);
    if(res.err){ dev.cli.log.push({ cls: "err", text: res.err }); if(typeof termBell === "function") termBell(); }
    else dev.cli.log.push({ cls: "out", text: completionText(res.items) });
    renderCliLog();
    return;
  }
  if(e.key === "Tab"){
    e.preventDefault();
    const cur = cliInput.value;
    const res = completionsFor(dev, cur);
    if(res.err || !res.items){ if(typeof termBell === "function") termBell(); return; }
    const real = res.items.filter(i => !i.label.startsWith("<"));
    if(!real.length){ if(typeof termBell === "function") termBell(); return; }
    const endsSpace = /\s$/.test(cur) || cur.trim() === "";
    const partial = endsSpace ? "" : cur.trim().split(/\s+/).pop();
    let common = real[0].label;
    for(const i of real) while(!i.label.startsWith(common)) common = common.slice(0, -1);
    if(common.length > partial.length){
      const base = endsSpace ? cur : cur.slice(0, cur.length - partial.length);
      cliInput.value = base + common + (real.length === 1 ? " " : "");
    }
    return;
  }
  if(e.key === "ArrowRight" || e.key === "End"){
    // accept the assist ghost when the caret sits at the end of the line
    if(assistOn && cliInput.selectionStart === cliInput.value.length){
      const sug = suggestFor(dev, cliInput.value);
      if(sug && sug.text){ e.preventDefault(); cliInput.value += sug.text; updateGhost(); }
    }
    return;
  }
  if(e.key === "ArrowUp"){
    e.preventDefault();
    if(dev.cli.hIdx > 0){ dev.cli.hIdx--; cliInput.value = dev.cli.history[dev.cli.hIdx] || ""; }
    updateGhost();
    return;
  }
  if(e.key === "ArrowDown"){
    e.preventDefault();
    if(dev.cli.hIdx < dev.cli.history.length){ dev.cli.hIdx++; cliInput.value = dev.cli.history[dev.cli.hIdx] || ""; }
    return;
  }
});

/* ============================================================
   PACKET ANIMATION
   ============================================================ */
function segPoints(segs){
  const pts = [];
  for(const s of segs){
    const l = links[s.link];
    if(!l) continue;
    const devTo = devices[s.dev];
    const devFrom = devices[l.a.dev === s.dev ? l.b.dev : l.a.dev];
    const portTo = l.a.dev === s.dev ? l.a.port : l.b.port;
    const portFrom = l.a.dev === s.dev ? l.b.port : l.a.port;
    if(!devTo || !devFrom) continue;
    pts.push(portXY(devFrom, portFrom), portXY(devTo, portTo));
  }
  return pts;
}
function animatePing(fwdSegs, ok, revSegs, meta){
  trafficCount(fwdSegs);
  if(ok) trafficCount(revSegs && revSegs.length ? revSegs : fwdSegs);
  if(typeof requestAnimationFrame !== "function" || !animLayer) return;
  meta = meta || {};
  const fwd = segPoints(fwdSegs || []);
  if(meta.natEvents && meta.natEvents.length)
    setTimeout(() => meta.natEvents.forEach(ev => {
      const d = devices[ev.devId];
      if(!d) return;
      const c = devCenter(d);
      floatLabel(c[0], c[1], `NAT ${ev.from} → ${ev.to}`, cssVar("--amber", "#c99a3c"));
    }), 260);
  if(fwd.length < 2){
    if(!ok && meta.srcDev){
      const c = devCenter(meta.srcDev);
      flashFail(c);
      if(meta.short) floatLabel(c[0], c[1], meta.short, cssVar("--red", "#d1554a"));
    }
    return;
  }
  runDot(fwd, ok ? cssVar("--green", "#3ecf6e") : cssVar("--red", "#d1554a"), () => {
    if(!ok){
      const last = fwd[fwd.length - 1];
      flashFail(last);
      if(meta.short) floatLabel(last[0], last[1], meta.short, cssVar("--red", "#d1554a"));
      return;
    }
    const rev = revSegs && revSegs.length ? segPoints(revSegs) : fwd.slice().reverse();
    setTimeout(() => runDot(rev, cssVar("--blue", "#4a90d9"), () => {}), 120);
  });
}
function floatLabel(x, y, text, color){
  if(!animLayer || typeof requestAnimationFrame !== "function") return;
  const t = el("text", { x, y: y - 14, "text-anchor": "middle", class: "floatlbl" }, animLayer);
  t.textContent = text;
  t.style.fill = color || cssVar("--amber", "#c99a3c");
  t.style.stroke = cssVar("--bg", "#0f1512");
  setTimeout(() => t.remove(), 2600);
}
function animateDhcp(pathSegs){
  trafficCount(pathSegs); trafficCount(pathSegs);   // DORA is four passes over the same path
  if(typeof requestAnimationFrame !== "function" || !animLayer) return;
  const fwd = segPoints(pathSegs || []);
  if(fwd.length < 2) return;
  const rev = fwd.slice().reverse();
  const steps = [[fwd, "DISCOVER"], [rev, "OFFER"], [fwd, "REQUEST"], [rev, "ACK"]];
  const green = cssVar("--green", "#3ecf6e"), blue = cssVar("--blue", "#4a90d9");
  let i = 0;
  const next = () => {
    if(i >= steps.length) return;
    const [pts, label] = steps[i];
    const color = i % 2 === 0 ? green : blue;
    const end = pts[pts.length - 1];
    runDot(pts, color, () => {
      floatLabel(end[0], end[1], label, color);
      i++;
      setTimeout(next, 160);
    });
  };
  next();
}
function runDot(pts, color, onDone){
  const dot = el("circle", { r: 5, fill: color, class: "pkt", stroke: cssVar("--bg", "#0f1512"), "stroke-width": 1.5 }, animLayer);
  let total = 0;
  const legs = [];
  for(let i = 0; i < pts.length - 1; i++){
    const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    legs.push({ from: pts[i], to: pts[i + 1], d });
    total += d;
  }
  const dur = Math.max(350, Math.min(2600, total * 2.2));
  const t0 = performance.now();
  function step(t){
    if(!dot.parentNode) return;
    let f = Math.min(1, (t - t0) / dur);
    let dist = f * total, acc = 0;
    for(const leg of legs){
      if(dist <= acc + leg.d || leg === legs[legs.length - 1]){
        const lf = leg.d ? Math.min(1, (dist - acc) / leg.d) : 1;
        dot.setAttribute("cx", leg.from[0] + (leg.to[0] - leg.from[0]) * lf);
        dot.setAttribute("cy", leg.from[1] + (leg.to[1] - leg.from[1]) * lf);
        break;
      }
      acc += leg.d;
    }
    if(f < 1) requestAnimationFrame(step);
    else { dot.remove(); onDone && onDone(); }
  }
  requestAnimationFrame(step);
}
function flashFail(pt){
  if(!animLayer) return;
  if(!pt) return;
  const x = el("text", { x: pt[0], y: pt[1] + 5, class: "pktfail", "text-anchor": "middle" }, animLayer);
  x.textContent = "✕";
  setTimeout(() => x.remove(), 1100);
}

/* ============================================================
   ASSIST — fish-style inline ghost suggestion (history + grammar)
   ============================================================ */
let assistOn = true;
try{ assistOn = localStorage.getItem("junoslab-assist") !== "off"; }catch(e){}

/* returns {text} (acceptable with ArrowRight), {preview} (a peek at the
   options ahead — not insertable), or null */
function suggestFor(dev, cur){
  if(!cur || !cur.trim() || !dev) return null;
  if(dev.cli && (dev.cli.stage || dev.powered === false)) return null;
  // 1) most recent matching history entry wins — that's the muscle-memory path
  const hist = (dev.cli && dev.cli.history) || [];
  for(let i = hist.length - 1; i >= 0; i--){
    if(hist[i].startsWith(cur) && hist[i] !== cur) return { text: hist[i].slice(cur.length) };
  }
  if(dev.type !== "switch" && dev.type !== "router") return null;
  // 2) grammar: finish the current token, then chain next words while the
  //    grammar has exactly one way forward; preview the fork otherwise
  try{
    const endsSpace = /\s$/.test(cur);
    let chain = "", base, sep;
    if(endsSpace){
      base = cur.replace(/\s+$/, "");
      sep = "";
    } else {
      const res = completionsFor(dev, cur);
      if(!res || !res.items) return null;
      const partial = cur.split(/\s+/).pop();
      if(!partial) return null;
      const real = res.items.filter(i => !i.label.startsWith("<") && i.label.startsWith(partial));
      const exact = real.some(i => i.label === partial);
      if(real.length === 1 && real[0].label !== partial){
        chain = real[0].label.slice(partial.length);
        base = cur + chain;
      } else if(exact){
        base = cur;
      } else {
        return real.length > 1 ? { preview: previewOf(real) } : null;
      }
      sep = " ";
    }
    for(let depth = 0; depth < 6; depth++){
      const res2 = completionsFor(dev, base + " ");
      if(!res2 || !res2.items || !res2.items.length) break;
      const opts = res2.items.filter(i => i.label !== "<[Enter]>");
      if(!opts.length) break;
      const real = opts.filter(i => !i.label.startsWith("<"));
      if(real.length === 1 && opts.length === 1){
        chain += sep + real[0].label;
        base += " " + real[0].label;
        sep = " ";
        continue;
      }
      if(!chain) return { preview: previewOf(opts) };
      break;
    }
    return chain ? { text: chain } : null;
  }catch(e){}
  return null;
}
function previewOf(items){
  const labels = items.filter(i => i.label !== "<[Enter]>").map(i => i.label).sort();
  const shown = labels.slice(0, 4);
  return shown.join(" · ") + (labels.length > shown.length ? `  (+${labels.length - shown.length} more — press ?)` : "");
}
function updateGhost(){
  const g = document.getElementById("cli-ghost");
  if(!g) return;
  g.innerHTML = "";
  if(!assistOn) return;
  const dev = devices[activeDevice];
  if(!dev) return;
  const cur = cliInput.value;
  const sug = suggestFor(dev, cur);
  if(!sug) return;
  const pre = document.createElement("span");
  pre.style.visibility = "hidden";
  pre.textContent = cur;
  g.appendChild(pre);
  if(sug.text){
    const acc = document.createElement("span");
    acc.className = "ghost-accept";
    acc.textContent = sug.text;
    acc.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      cliInput.value += sug.text;
      cliInput.focus();
      updateGhost();
    });
    g.appendChild(acc);
  }
  else if(sug.preview){
    const pv = document.createElement("span");
    pv.className = "ghost-preview";
    pv.textContent = "  ▸ " + sug.preview;
    g.appendChild(pv);
  }
}
function setAssist(on){
  assistOn = on;
  try{ localStorage.setItem("junoslab-assist", on ? "on" : "off"); }catch(e){}
  const b = document.getElementById("assist-btn");
  if(b){ b.textContent = "assist " + (on ? "on" : "off"); b.classList.toggle("active", on); }
  updateGhost();
}
document.getElementById("assist-btn").onclick = () => setAssist(!assistOn);
setAssist(assistOn);
cliInput.addEventListener("input", updateGhost);

/* ============================================================
   REFERENCE — searchable in-app library (commands come straight
   from the grammar/op specs, so it can never drift out of date)
   ============================================================ */
/* ---------- reference diagrams: hand-rolled flowcharts, HTML so text wraps ----------
   flow steps: { b:"box" } | { q:"question", side:"branch outcome", sideOk:true/false,
                 sideLabel:"yes", down:"label on the continuing arrow" } | { e:"end", ok:bool }
   lanes: { kind:"lanes", a:"left party", b:"right party", msgs:[["ab"|"ba", "text"], ...] } */
function refFlowEl(steps){
  const wrap = document.createElement("div"); wrap.className = "ref-flow";
  const box = (txt, cls) => {
    const d = document.createElement("div"); d.className = "rf-box" + (cls ? " " + cls : "");
    d.textContent = txt; return d;
  };
  const arrow = lbl => {
    const a = document.createElement("div"); a.className = "rf-arr";
    if(lbl){
      const s = document.createElement("span"); s.className = "rf-arrlbl";
      s.textContent = lbl;
      a.appendChild(s);
    }
    return a;
  };
  steps.forEach((st, i) => {
    if(i > 0 && !st._noArr) wrap.appendChild(arrow(st.down || (steps[i - 1].q ? (steps[i - 1].downLabel || "no") : "")));
    if(st.b) wrap.appendChild(box(st.b));
    else if(st.q){
      const row = document.createElement("div"); row.className = "rf-qrow";
      row.appendChild(box(st.q, "rf-q"));
      const sa = document.createElement("div");
      sa.className = "rf-sidearr " + (st.sideOk === true ? "to-ok" : st.sideOk === false ? "to-err" : "to-dim");
      const sl = document.createElement("span"); sl.className = "rf-sidelbl";
      sl.textContent = st.sideLabel || "yes";
      sa.appendChild(sl);
      row.appendChild(sa);
      row.appendChild(box(st.side, "rf-side " + (st.sideOk === true ? "rf-ok" : st.sideOk === false ? "rf-err" : "")));
      wrap.appendChild(row);
    }
    else if(st.e) wrap.appendChild(box(st.e, "rf-end " + (st.ok ? "rf-ok" : "rf-err")));
  });
  return wrap;
}
function refLanesEl(spec){
  const wrap = document.createElement("div"); wrap.className = "ref-lanes";
  const head = document.createElement("div"); head.className = "rl-head";
  const ha = document.createElement("span"); ha.textContent = spec.a;
  const hb = document.createElement("span"); hb.textContent = spec.b;
  head.append(ha, hb); wrap.appendChild(head);
  for(const [dir, txt] of spec.msgs){
    const m = document.createElement("div"); m.className = "rl-msg " + (dir === "ab" ? "rl-ab" : "rl-ba");
    m.textContent = txt;
    wrap.appendChild(m);
  }
  return wrap;
}
function refDiagramEl(spec){
  try{ return spec.kind === "lanes" ? refLanesEl(spec) : refFlowEl(spec); }
  catch(e){ return null; }
}
function refDiagramText(spec){
  try{
    if(spec.kind === "lanes") return spec.a + " " + spec.b + " " + spec.msgs.map(m => m[1]).join(" ");
    return spec.map(s => [s.b, s.q, s.side, s.e].filter(Boolean).join(" ")).join(" ");
  }catch(e){ return ""; }
}
const REF_DIAGRAMS = {
  "Routes & gateways": [
    { b: "your machine wants to send a packet to 10.0.20.5" },
    { q: "is 10.0.20.5 inside MY OWN subnet?", side: "ARP for its MAC, hand the frame straight over — no router involved", sideOk: true },
    { b: "it is far away: send the packet to my GATEWAY (the router's address on my subnet)" },
    { q: "does the router know a route toward 10.0.20.0/24?", side: "no route, no default: the packet is dropped — network unreachable", sideOk: false, sideLabel: "no" , downLabel: "yes" },
    { b: "forward hop by hop — each router repeats this exact decision" },
    { e: "delivered. Now the REPLY starts the same journey from the far end — see: The return path", ok: true },
  ],
  "The return path": [
    { b: "your ping REACHED the server — half the work is done" },
    { q: "does the far side have a route BACK to your address?", side: "reply dies quietly on the way home: Request timeout — while the forward path was perfect", sideOk: false, sideLabel: "no", downLabel: "yes" },
    { q: "does every filter on the way home also let the reply through?", side: "same timeout, different culprit — filters are checked in BOTH directions", sideOk: false, sideLabel: "no", downLabel: "yes" },
    { e: "reply arrives: that is what one line of ping output actually proves — TWO working directions", ok: true },
  ],
  "The commit model": [
    { b: "set vlans staff vlan-id 10   (any set / delete)" },
    { b: "the CANDIDATE changes — a private draft. The network has not noticed anything." },
    { q: "show | compare — is the draft what you meant?", side: "rollback 0 throws the draft away; the active config never knew", sideOk: null, sideLabel: "no", downLabel: "yes: commit" },
    { q: "commit checks: does the draft make sense as a whole?", side: "commit REFUSES, nothing changes — fix the error it names and try again", sideOk: false, sideLabel: "error", downLabel: "clean" },
    { e: "the draft becomes the ACTIVE config — the network changes NOW. (regret it? rollback 1, commit)", ok: true },
  ],
  "commit confirmed": [
    { b: "commit confirmed 5 — the change goes LIVE with a 5-minute fuse burning" },
    { q: "can you still reach the box after the change?", side: "type plain commit — the fuse is defused, the change stays for good", sideOk: true, sideLabel: "yes", downLabel: "no — locked out" },
    { e: "do nothing. At minute five the box rolls itself back and your session comes home. This is why it exists.", ok: true },
  ],
  "Firewall filters": [
    { b: "a packet arrives at an interface with an input filter" },
    { q: "does it match term one's from conditions?", side: "that term's then happens: accept, or discard — and the story ends", sideOk: null, sideLabel: "yes", downLabel: "no" },
    { b: "try the next term, in order — first match wins" },
    { q: "did ANY term match?", side: "packet accepted or discarded by the term that claimed it", sideOk: null, sideLabel: "yes", downLabel: "no term matched" },
    { e: "IMPLICIT DISCARD: the invisible final term silently eats the packet. Forgetting the accept term is the classic filter accident.", ok: false },
  ],
  "RSTP & broadcast storms": [
    { b: "a broadcast frame enters a physical loop of switches" },
    { b: "every switch repeats it out every port — including back INTO the loop" },
    { q: "is spanning tree running (set protocols rstp)?", side: "copies multiply forever: a broadcast STORM — the flashing links drown the segment", sideOk: false, sideLabel: "no", downLabel: "yes" },
    { e: "the switches elect a root bridge and put ONE port of the loop to sleep (BLK). The circle becomes a standby spare: unplug a live cable and the sleeper wakes.", ok: true },
  ],
  "BGP — buying the internet": [
    { b: "set routing-options autonomous-system 65010, a bgp group with type external + peer-as + neighbor, commit" },
    { q: "is the neighbor on a connected subnet, with a working path?", side: "state: Active — TCP 179 cannot connect. Fix reachability before anything else", sideOk: false, sideLabel: "no", downLabel: "yes" },
    { q: "does your peer-as match the AS the provider actually is?", side: "state: Active — mismatch, spelled out in show bgp summary", sideOk: false, sideLabel: "no", downLabel: "yes" },
    { e: "Established. The provider advertises 0.0.0.0/0 — a default route you LEARNED, [BGP/170] in show route. If the session dies, the route leaves with it.", ok: true },
  ],
  "Heat & cooling": [
    { b: "every powered device pours watts of heat into its building — servers alone are 300 W" },
    { q: "does cooling capacity cover the heat load?", side: "the room holds ~21°C and nobody ever thinks about it — as it should be", sideOk: true, sideLabel: "yes", downLabel: "no" },
    { b: "room temperature climbs — the building header goes amber, then red" },
    { e: "at 52°C gear protects itself: emergency thermal shutdown, logged. Everything it served goes down with it.", ok: false },
  ],
  "Trunks (802.1Q)": [
    { b: "a frame leaves a staff PC — plain ethernet, no tag anywhere" },
    { b: "its ACCESS port knows its room: this port IS staff, no tag needed" },
    { b: "to cross to the other switch it enters the TRUNK — a tag is stapled on: VLAN 10" },
    { b: "the far switch reads the tag, learns which room the frame belongs to, removes the tag" },
    { e: "delivered — but only ever to staff ports. The tag exists ONLY on the trunk; endpoints never see one.", ok: true },
  ],
  "DHCP — the DORA dance": { kind: "lanes", a: "your laptop", b: "dhcp server",
    msgs: [
      ["ab", "DISCOVER — I just woke up with no address. Anyone out there? (shouted to the whole subnet)"],
      ["ba", "OFFER — I have 10.0.10.51 free. Want it?"],
      ["ab", "REQUEST — yes, formally requesting 10.0.10.51"],
      ["ba", "ACK — it is yours for the lease time, along with your gateway and DNS server"],
    ] },
  "DNS — the first step of every connection": [
    { b: "curl web.lab — but the network only ships packets to NUMBERS" },
    { q: "do you even have a nameserver configured?", side: "could not resolve host — the failure is on YOUR machine", sideOk: false, sideLabel: "no", downLabel: "yes" },
    { q: "is that server reachable AND running its dns service?", side: "resolution dies — the website may be perfectly healthy, names are dead", sideOk: false, sideLabel: "no", downLabel: "yes" },
    { q: "does a record for web.lab exist?", side: "NXDOMAIN — the phone book has no such entry", sideOk: false, sideLabel: "no", downLabel: "yes: got 10.0.10.80" },
    { q: "connect to 10.0.10.80 port 80 — is anything LISTENING?", side: "connection refused — reachable machine, stopped service. NOT the same as unreachable", sideOk: false, sideLabel: "no", downLabel: "yes" },
    { e: "HTTP/1.1 200 OK — name lookup, then connection, then content. It can fail at each step, and each failure looks different.", ok: true },
  ],
};
const REF_CONCEPTS = [
  ["VLANs & access ports", "Picture one switch as a building and each VLAN as a room in it. Machines in the same room can talk freely. Machines in different rooms cannot hear each other at all, even though they share the same switch. You create a room with a name and a number: set vlans staff vlan-id 10. An access port is a wall socket that belongs to exactly one room: set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members staff. Whatever you plug into that socket is in the staff room. The computer itself needs no VLAN settings and never even knows VLANs exist."],
  ["Trunks (802.1Q)", "A trunk is the hallway between two buildings (two switches). Traffic from many rooms travels through it at once, so every frame gets a small tag naming its room — that tag is the VLAN number. Two statements make a trunk: interface-mode trunk (keep the tags on) and vlan members [ staff guest ] (the list of rooms allowed through). A room you forget to list simply does not exist on the far side. Access ports remove the tag before handing a frame to a computer, which is why computers never see tags."],
  ["irb — the switch as a router", "Rooms are sealed on purpose. When you DO want staff and guests to exchange messages, someone must carry them between rooms: a router. A switch can be its own router using irb interfaces. Give a room a door with an address: set interfaces irb unit 10 family inet address 10.0.10.1/24. Then tell the room which door is its: set vlans staff l3-interface irb.10. The door's address (10.0.10.1) is what the computers in that room use as their gateway. Give two rooms doors, and the switch carries messages between them."],
  ["The commit model", "JunOS keeps two copies of the settings. The active configuration is what the box is really doing right now. The candidate is your scratch pad. Every set command writes only on the scratch pad — the real world does not change yet. show | compare shows the difference between pad and reality. commit copies the pad onto reality, all at once. rollback 0 wipes the pad and copies reality back onto it. This is why you can prepare a large change calmly, check it, and then apply the whole thing in one step."],
  ["commit confirmed", "A seatbelt for scary changes. commit confirmed 5 applies your change AND starts a five-minute countdown. If you type commit again before time runs out, the change stays. If you do nothing — for example, because the change locked you out and you cannot type anything at all — the box undoes everything by itself, and you are back in. Use it whenever a mistake could cut off your own access to the device you are configuring."],
  ["Routes & gateways", "A route is one line of directions: to reach that street, hand the packet to this address next. Routers (and switches with irb doors) automatically know the streets plugged directly into them. Every other street must be written down: set routing-options static route 0.0.0.0/0 next-hop 203.0.113.1. The odd-looking 0.0.0.0/0 means anything I do not know better — the default route, the way out. Ordinary computers keep it even simpler: ip route add default via 10.0.10.1 means when in doubt, give it to the gateway."],
  ["The return path", "A ping is a round trip. Your request travels out, and a reply must travel back — and each direction needs its own directions. If the far side has no route back to you, your request arrives perfectly and the reply dies quietly. From your chair this looks identical to a broken network. The giveaway: traceroute reaches the target while ping keeps failing. When you see that, stop studying the way out and go check the way back."],
  ["Firewall filters", "A filter is a doorman holding a numbered checklist. The numbered rules are called terms. For every packet, the doorman reads the list from the top and obeys the FIRST line that matches: accept (come in), discard (thrown away, silently), or reject (thrown away, and a not-allowed note goes back). Now the trap everyone falls into exactly once: after your last term there is an invisible final rule that discards EVERYTHING. A filter that only says block guests from ops therefore also blocks guests from everything else — unless you end it with a term that says then accept. Post the doorman on a door with ... family inet filter input NAME."],
  ["LACP bundles", "Two cables between the same two switches, made to behave as one thick cable. Plugged in naively, two parallel cables form a loop and the network storms. Bundled, they give double capacity plus a spare. ether-options 802.3ad ae0 tells a port you are now a limb of bundle ae0 — the limb has no settings of its own anymore. The bundle itself is configured like a normal port under interfaces ae0, plus aggregated-ether-options lacp active so the two switches shake hands. One side alone stays down, and show lacp interfaces says exactly why."],
  ["RSTP & broadcast storms", "A switch repeats every broadcast out of every socket in the room. Connect switches in a circle and one broadcast races around forever, multiplying, until the segment drowns in its own echo — a broadcast storm (the flashing links). Spanning tree is the cure: set protocols rstp on every switch makes them elect a boss (the root bridge) and put exactly one port of each loop to sleep (shown as BLK in show spanning-tree interface). The circle stays useful as a spare: unplug a working cable and the sleeping port wakes up to take over."],
  ["Storm control", "The backstop for when a loop appears anyway — say, someone plugs a cable where it should not go. A storm-control profile with action-shutdown watches a port, and when a storm rides in through it, the port switches itself off (error-disabled). One port is sacrificed; the rest of the network survives. After you fix the loop for real, bring the port back with clear ethernet-switching error-disable <port>."],
  ["DHCP — the DORA dance", "Nobody types addresses onto three hundred laptops. A machine that wakes up addressless shouts into its subnet and a DHCP server answers, in a four-step exchange called DORA — Discover, Offer, Request, Acknowledge. The lab plays it out for real: dhclient eth0 on a host, a pool committed on the switch (see the how-to), and the animation shows all four packets. The ACK carries more than the address: gateway and DNS server ride along, which is why a wrong pool quietly breaks THREE things at once. show dhcp server binding lists every lease this box has handed out."],
  ["BGP — buying the internet", "Inside your network you own every route. At the edge, the internet is somebody else's network — your ISP's — and the two of you exchange routes by TREATY, not by trust. That treaty is BGP. Your network gets a name (set routing-options autonomous-system 65010), you declare who you talk to (set protocols bgp group EXT type external, peer-as 65001, neighbor <isp-ip>), and if everything matches — the AS numbers, the shared subnet, an actual working path — the session goes Established and the provider hands you a default route: 0.0.0.0/0, learned, not typed. Watch it appear in show route as [BGP/170]. When the numbers do NOT match, show bgp summary tells you exactly why it sits in Active, sulking. Every 'my internet is down' at a real company edge starts with reading that one screen."],
  ["DNS — the first step of every connection", "Every by-name connection starts with a question you never see: what NUMBER is this name? Your machine asks its configured nameserver (nameserver <ip> in this lab, /etc/resolv.conf in real life), the server checks its records, and only then does the real connection begin. This means the site can be UP while names are dead, and vice versa — two different failures that look identical from the couch. nslookup asks the question by itself, which is how you prove which half is broken. Run scenario 23 and break it both ways on purpose; the flowchart on this card is the whole debugging path."],
  ["VRRP — two doors, one address", "A gateway is a single point of failure with a job title. VRRP fixes that: two switches carry the SAME virtual gateway address — set interfaces irb unit 10 family inet vrrp-group 1 virtual-address 10.0.10.1 on both, plus a priority (higher wins). Hosts point at the virtual address and never learn there are two boxes behind it. The master answers; when it dies, the backup takes over and nobody's default route changes — show vrrp tells you who is wearing the crown right now. One honesty note: real JunOS nests these statements one level deeper, under the address itself; the lab flattens that by one step, everything else is faithful. Scenario 27 makes you kill the master mid-ping to prove the handover."],
  ["The system log", "Every switch and router keeps a diary: show log messages. Commits, cables plugged and unplugged, storms, DHCP leases, ports shutting themselves off — all with timestamps. On a trouble ticket, read the diary first. The most recent commit is usually the crime scene."],
  ["CLI tricks", "Four habits worth building. One: type ? anywhere, and the box lists everything that can come next. Two: Tab finishes the word you started. Three: you may abbreviate — sh int terse means show interfaces terse. Four: arrow-up replays earlier commands. With assist on, gray ghost text offers the rest of your line (ArrowRight accepts it), and after a complete word it previews the possible next words."],
  ["Real terminals: macOS vs Windows", "Every operating system ships a terminal application that hosts a shell. On macOS it is Terminal.app (settings under Cmd-comma): its default profile Basic is black text on white, and the famous alternatives are Pro (white on black, slightly transparent) and Homebrew (green on black); many people instead install iTerm2 and the Solarized Dark color scheme. On Windows, the elderly Command Prompt is gray-on-black, PowerShell chose a deep blue background on purpose so you would always know which shell you were in, and the modern Windows Terminal uses a dark scheme called Campbell. Fonts differ by tradition too: Menlo and Monaco on the Mac, Consolas and Cascadia on Windows. This lab's terminal header has a profile picker with all of these palettes — and a bell toggle, because real terminals really do beep at errors (the beep is ASCII character 7, called BEL, older than the screen you are reading this on)."],
  ["Wi-Fi in this lab", "An access point is a bridge with a radio. Its eth0 cables into an access port, and every associated laptop behaves exactly as if it were plugged into that same port — same VLAN, same DHCP, same gateway. The dashed circle is coverage: wifi join only works inside it. Deliberately skipped here: channels, interference, roaming, and security handshakes. The lesson that matters: wireless is just the same L2, minus the cable."],
  ["Cable management — trays, drops, honest metres", "Cables do not fly between machines; they walk — up the wall, along a tray above the ceiling or a duct under the floor, and back down. Draw a tray (Add > Cable tray) and every cable whose two ends sit near it routes ALONG it automatically, bundled into one tidy run with a count. The measured length gains the drops people forget: ~2.7 m per end for a ceiling basket, ~0.3 m underfloor — which is exactly how a crow-flies 18 m becomes a 27 m pull, and why first-time estimators always order short. Click a tray's label to change its level; the Validate check objects when a pathway is overfilled (a basket takes roughly 40 Cat6 before crush and heat set in), and the BOM prices the tray by the metre. Desks join the same story: PCs snap onto them in a row, and the cabling schedule names each run by its desk — outlet: Desk 7 — the way a real patch list reads. In-rack DACs stay in the rack, as they should."],
  ["Heat & cooling", "Every watt a device draws becomes heat in its room — a big router is a 450 W space heater that happens to route. This lab models it simply: rooms sit at 21 degrees and rise one degree for every 25 W of uncooled heat; cooling units subtract their capacity; gear protects itself with a thermal shutdown at 52 degrees (read show log messages afterwards — chassisd wrote it down). Watch the temperature on each building's header, check a box with show chassis environment, and size cooling with headroom: the day the AC fails is the day you learn why real rooms have two."],
  ["Console & management ports", "Two special ports sit at the right edge of every switch and router faceplate. CON is the console: a serial socket, the way in when a box has no network settings at all — which is why brand-new boxes are always set up through it. me0 is the management port: a network port reserved for administrators, with its own address (set interfaces me0 unit 0 family inet address ...). Neither one ever carries the users' traffic. Think of them as the staff entrance, never the shop floor."],
];
const REF_HOST_CMDS = [
  ["ip addr add <ip>/<bits> dev eth0", "assign an address"],
  ["dhclient eth0", "get an address (and gateway) via DHCP"],
  ["ip route add default via <gw>", "set the default gateway"],
  ["ip addr / ip route / arp -a", "inspect addresses, routes, ARP"],
  ["ping <ip> / traceroute <ip>", "test reachability / trace the path"],
  ["wifi scan / wifi join <ssid> / wifi leave", "wireless: list networks, associate, drop"],
  ["hostname <name>", "rename this host"],
];
function ipAnatomyEl(){
  const wrap = document.createElement("div"); wrap.className = "ipa";
  const row = document.createElement("div"); row.className = "ipa-row";
  [["10", "net"], [".", "dot"], ["0", "net"], [".", "dot"], ["10", "net"], [".", "dot"], ["23", "host"], ["/24", "mask"]].forEach(([txt, cls]) => {
    const b = document.createElement("span"); b.className = "ipa-" + cls; b.textContent = txt;
    row.appendChild(b);
  });
  wrap.appendChild(row);
  const lab = document.createElement("div"); lab.className = "ipa-labels";
  const l1 = document.createElement("span"); l1.className = "ipa-lab net";
  l1.textContent = "the STREET — every neighbor shares these";
  const l2 = document.createElement("span"); l2.className = "ipa-lab host";
  l2.textContent = "the HOUSE";
  lab.append(l1, l2);
  wrap.appendChild(lab);
  const cap = document.createElement("div"); cap.className = "ipa-cap";
  cap.textContent = "/24 answers one question: how many of the four numbers name the street? " +
    "/24 = the first three (the everyday case). /16 = the first two. /8 = just the first. " +
    "Same street = talk directly. Different street = hand the packet to the gateway.";
  wrap.appendChild(cap);
  return wrap;
}
const NEWHOST_FLOW = [
  { b: "PHYSICAL first: cable the PC's eth0 into a free access port on the switch (Connect ▾, LAN / Data — listen for the click)" },
  { b: "open its shell, give it a house on the right street:  ip addr add 10.0.10.23/24 dev eth0" },
  { q: "will it only ever talk to its own street?", side: "done — same-street neighbors already answer: ping one", sideOk: true, sideLabel: "yes", downLabel: "no, the world" },
  { b: "tell it where the street's door is:  ip route add default via 10.0.10.1" },
  { q: "will it use NAMES like web.lab, not just numbers?", side: "done — everything by IP now works", sideOk: true, sideLabel: "no", downLabel: "yes" },
  { e: "nameserver 10.0.10.80 — then prove it in order: ping 10.0.10.1 (my own door), ping a neighbor, curl web.lab. Or skip ALL the typing with one command: dhclient eth0, if a DHCP pool exists.", ok: true },
];
const REF_PRIMER = {
  title: "IP addresses, from zero",
  intro: "An address like 10.0.10.23 is just a street plus a house number, written as four numbers (each 0-255). The picture below is the whole idea — genuinely all of it. No binary needed to start; the /number is explained under the picture, and beneath that is the exact ritual for plugging in a brand-new machine, physical steps included.",
  table: [
    "what you want to do            where     type this",
    "give this PC an address        PC $      ip addr add 10.0.10.23/24 dev eth0",
    "see my address                 PC $      ip a           (or: ip addr, ifconfig)",
    "set my gateway (the door)      PC $      ip route add default via 10.0.10.1",
    "see my routes                  PC $      ip r",
    "set who answers name lookups   PC $      nameserver 10.0.10.80",
    "read that back                 PC $      cat /etc/resolv.conf",
    "get ALL of the above at once   PC $      dhclient eth0   (needs a DHCP pool)",
    "test my own street and door    PC $      ping 10.0.10.1  (your own gateway FIRST)",
    "who have I actually talked to  PC $      arp -a",
  ].join("\n"),
  sections: [
    ["Reading 10.0.10.23/24 aloud", "Street 10.0.10, house 23, and the /24 says the street is the first three numbers. The only special citizens: .1 is usually the gateway (the door itself), .0 is the street sign and .255 the megaphone — neither is a house you can assign. And /30 is the charming runt of the family: a street with exactly two usable houses, which is why router-to-router cables use it — two ends, two houses, a perfect fit."],
    ["Choosing a number for a new machine", "Three rules. Same street as its neighbors — 10.0.10.x if the room is 10.0.10.0/24. Never .1 — that is almost always the door. Stay out of the DHCP range (this lab hands out .100-.199), or one day the pool leases YOUR number to a laptop and both machines break in maddening, intermittent ways. Infrastructure low (.1-.99, by hand), people high (.100+, by DHCP) is the convention real offices use."],
    ["Checking yourself — the maintenance four", "ip a — what am I? ip r — where is my door? cat /etc/resolv.conf — who do I ask for names? arp -a — who have I actually talked to? A machine that 'cannot connect' is diagnosed by those four questions in about thirty seconds, and they work letter-for-letter on real Linux."],
    ["When it does not work, test in THIS order", "One: ping your OWN gateway — proves your address, cable and door. Two: ping the far machine — proves routing between streets. Three: nslookup the name — proves DNS. The first test that fails names the guilty layer. People who start at step three stay lost the longest, because a name failure LOOKS identical to a network failure until you separate them."],
    ["DHCP or by hand?", "Laptops and phones: DHCP, always — that is what the pool is for. Gateways, servers, printers: by hand, below the pool. The rule is about who needs to be FINDABLE: nobody minds a laptop changing house, but a server that moves breaks everyone's bookmarks — and a gateway that moves breaks the entire street."],
    ["Why commands say eth0 (and switches say ge-0/0/0)", "eth0 is Linux's honest name for the machine's first wired network card — ETHernet, number ZERO. The single jack drawn on every PC and server IS eth0: one thing, two views, and 'dev eth0' in a command just means 'on that jack'. A second card would be eth1; a Wi-Fi radio is wlan0. Switch ports follow Juniper's scheme instead: ge-0/0/0 reads gigabit ethernet, slot 0 / card 0 / port 0 — which is why a 24-port switch counts ge-0/0/0 to ge-0/0/23. One honesty note: modern Linux sometimes renames eth0 to things like enp3s0 (predictable interface naming); the idea is identical, and eth0 remains the classic you will meet in every tutorial ever written. Hover any port in this lab and its tooltip tells you which name it answers to."],
    ["The /number cheat sheet (when you meet other masks)", "/24 = 254 usable houses, the standard office VLAN. /26 = 62, a small VLAN. /29 = 6, a tiny segment. /30 = 2, a point-to-point link. /16 = 65534, a whole campus. You will use /24 and /30 for ninety percent of everything; recognize the rest and look up the arithmetic when you actually need it."],
  ],
};
const REF_COOLING = {
  title: "Cooling & CRACs, from zero",
  intro: "Electronics turn nearly every watt they eat into HEAT, and heat never leaves a room by politeness — it has to be pumped out. A network that is perfect on paper still dies at 52 degrees. This page is the whole physical story: what the units are, how to size them, and how to notice trouble before the log writes TEMPERATURE CRITICAL.",
  table: [
    "unit                     capacity   price      what it is, honestly",
    "Portable AC              3.5 kW     € 499      a beefy room AC on wheels — one hot closet's worth",
    "In-row CRAC              10 kW      € 3,900    Computer Room Air Conditioner: refrigerant, like",
    "                                               your home AC but built to run forever, parked in",
    "                                               the rack row blowing cold straight at the gear",
    "CRAH                     30 kW      € 9,500    Computer Room Air Handler: no refrigerant of its",
    "                                               own — chilled WATER from a plant does the work.",
    "                                               Datacenter scale; overkill for an office closet",
  ].join("\n"),
  sections: [
    ["The arithmetic (this is the entire skill)", "Add up the heat: a small switch ~30-45 W, a big one ~90-100 W, a router 250-450 W, a SERVER 300 W, a PC ~120 W. Your cooling capacity must beat that sum — with roughly 30 percent headroom, because summer exists and so do future servers. One rack with two servers and a switch is already ~700 W: a desk fan will not save it, the 3.5 kW portable will."],
    ["What the lab simulates, exactly", "Every powered device pours its watts into its building; every running cooling unit pumps watts out. The building header shows the live temperature — green under 30, amber to 38, red beyond. At 52 degrees a device performs an emergency thermal shutdown and writes it to its log. Power a device off and its heat stops; that is also why a dark room cools down."],
    ["Placement is not decoration", "A cooling unit only cools the building it stands INSIDE — drop it outside the walls and the lab dryly notes it is cooling the car park. In real rooms position matters even more (hot aisles, cold aisles, blocked vents); the lab compresses all of that into one honest rule: the capacity must live in the same room as the heat."],
    ["Monitoring, from glance to autopsy", "Four layers, cheapest first. The building header: always on screen, live degrees. The status row: warns when a room runs hot or a unit is switched off. Per box: show chassis environment — the room average can look fine while one cooked switch is dying. After the mystery outage: show log messages — the TEMPERATURE CRITICAL line is the confession, timestamped."],
    ["The unit itself", "Click a cooling unit and type status: model, capacity, its room, and the live heat-versus-cooling ledger. It has a real power button — switch it off during an outage drill and understand why the UPS sizing includes it: a CRAC draws serious power (the lab bills it at ~30 percent of its cooling capacity), and a rack that survives a grid outage but loses its cooling only dies more slowly."],
    ["When the DRC nags you about heat", "Validate flags rooms where heat beats cooling BEFORE the thermal shutdown teaches you the hard way — an amber warning at 30 degrees, an error at 38. Treat the warning as a purchase order, not an insult: the fix is a bigger unit or less gear in that room, and the BOM prices both choices."],
  ],
};
const REF_CMDINDEX = [
  { cat: "IP addresses & interfaces", rows: [
    ["ip addr add 10.0.10.5/24 dev eth0", "PC $", "Give this machine an address by hand (ip a shows it back)"],
    ["dhclient eth0", "PC $", "Ask DHCP for an address instead — the DORA exchange"],
    ["set interfaces ge-0/0/1 unit 0 family inet address 10.0.20.1/24", "JunOS #", "Put an address on a router port"],
    ["set interfaces irb unit 10 family inet address 10.0.10.1/24", "JunOS #", "Give a VLAN its gateway address (pair with l3-interface)"],
    ["show interfaces terse", "JunOS >", "Every port, its state, its addresses — the first look at any box"],
    ["ip addr  /  ip a  /  ifconfig", "PC $", "What is my address? (all three spellings work, like real life)"],
  ]},
  { cat: "Routing", rows: [
    ["ip route add default via 10.0.10.1", "PC $", "Tell a PC where its door is — without this, far destinations fail instantly"],
    ["set routing-options static route 0.0.0.0/0 next-hop 203.0.113.1", "JunOS #", "The everything-else route on a JunOS box"],
    ["set protocols ospf area 0 interface irb.10", "JunOS #", "Let routers exchange routes instead of typing them"],
    ["set routing-options autonomous-system 65010", "JunOS #", "Your network's name in the BGP world (then a bgp group: type external, peer-as, neighbor)"],
    ["show route", "JunOS >", "What the box will actually DO with a packet — [Static/5], [OSPF/10], [BGP/170]"],
    ["set interfaces irb unit 10 family inet vrrp-group 1 virtual-address 10.0.10.1", "JunOS #", "Two switches share one gateway address; the backup takes over when the master dies (add priority to pick the master)"],
    ["show vrrp", "JunOS >", "Who is master of the virtual gateway right now — read it before AND after you fail a box"],
    ["show bgp summary  /  show ospf neighbor", "JunOS >", "Are the routing sessions up, and if not, why"],
  ]},
  { cat: "Switching — VLANs & trunks", rows: [
    ["set vlans staff vlan-id 10", "JunOS #", "Build the room before showing people into it"],
    ["set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff", "JunOS #", "Put a port in the room"],
    ["set interfaces ge-0/0/0 unit 0 family ethernet-switching interface-mode trunk", "JunOS #", "Make a port carry MANY rooms, tagged (then list vlan members [ ... ])"],
    ["set vlans staff l3-interface irb.10", "JunOS #", "Bolt the gateway doorway into this room's wall"],
    ["show vlans  /  show ethernet-switching table", "JunOS >", "Which ports are in which room; which MACs were learned where"],
    ["show spanning-tree interface", "JunOS >", "Loop protection: which port is deliberately asleep (BLK)"],
  ]},
  { cat: "Reachability & diagnosis", rows: [
    ["ping 10.0.20.5  (or ping web.lab)", "PC $", "The basic question — remember it proves BOTH directions"],
    ["traceroute 8.8.8.8", "PC $", "WHERE the path dies, hop by hop"],
    ["arp -a", "PC $", "Who this machine has actually talked to on its own street"],
    ["show lldp neighbors", "JunOS >", "Ground truth of what is cabled to which port — believe it over any diagram"],
    ["nslookup web.lab  /  dig +short web.lab", "PC $", "Test the name lookup ALONE — separates DNS problems from web problems"],
    ["curl web.lab", "PC $", "The full chain: resolve, connect, serve — 200 OK closes the ticket"],
    ["show log messages", "JunOS >", "The box's own diary: commits, flaps, storms, shutdowns. Read it first on any ticket"],
  ]},
  { cat: "Server & services", rows: [
    ["service start dns|http|syslog", "server $", "Make the box LISTEN — systemctl start named / nginx / rsyslog also works"],
    ["dns add web.lab 10.0.10.80  /  dns list", "server $", "Write the phone book other machines will ask"],
    ["nameserver 10.0.10.80", "PC $", "Point a client at its DNS server (cat /etc/resolv.conf reads it back)"],
    ["log  /  journalctl", "server $", "This server's events — plus every switch streaming to it via syslog"],
    ["set system syslog host 10.0.10.90 any any", "JunOS #", "Stream this switch's diary to the syslog server"],
    ["ssh 10.0.10.1", "PC $", "Open a switch's CLI across the network — needs set system services ssh committed there"],
  ]},
  { cat: "Wi-Fi", rows: [
    ["wifi scan  /  nmcli dev wifi list", "PC $", "What networks exist here, and how strong (a dark AP does not appear)"],
    ["wifi join office-wifi  /  nmcli dev wifi connect office-wifi", "PC $", "Associate — radio only, still no address"],
    ["dhclient eth0", "PC $", "THEN get the address; the order never changes"],
    ["show poe interface", "JunOS >", "Is the switch actually powering the AP, and how much budget is left"],
  ]},
  { cat: "The config workflow (JunOS's superpower)", rows: [
    ["configure", "JunOS >", "Enter config mode — set/delete edit a private DRAFT, not the network"],
    ["show | compare", "JunOS #", "The diff between draft and reality — the only place mistakes are free"],
    ["commit", "JunOS #", "Make the draft real. Until this, NOTHING has happened"],
    ["commit confirmed 5", "JunOS #", "Commit with a 5-minute fuse: if the change cuts you off, the box rolls back alone"],
    ["rollback 1  (then commit)", "JunOS #", "Undo the last commit; rollback 0 discards the current draft"],
    ["load set terminal", "JunOS #", "Paste a block of set commands (from these guides, or a colleague)"],
  ]},
  { cat: "Power, heat & the physical world", rows: [
    ["show chassis environment", "JunOS >", "This box's own temperature — the room average can lie about one cooked switch"],
    ["status", "UPS", "Click the UPS on the canvas, type status: battery vs the building's real load — read it BEFORE the outage drill"],
    ["status", "cooling", "Click the cooling unit, type status: heat in, cooling out, room degrees now"],
    ["show poe interface", "JunOS >", "Watts granted per port and the chassis budget"],
    ["(the power buttons)", "", "Servers, switches and cooling have real ones — a dark box is unreachable, which is NOT the same as refusing"],
  ]},
];
/* Every how-to step gets a counterfactual: what you would NOT have without it.
   Keyed by the step's exact action text; a test keeps the keys honest. */
const REF_WITHOUT = {
  "Click the host to open its shell": "No shell, no standpoint. Everything in networking is done FROM some machine's point of view — until you stand somewhere, there is nothing to configure and nowhere to ping from.",
  "ip addr add 10.0.10.5/24 dev eth0": "Without an address the host cannot send or receive any IP traffic at all. A cable alone is just copper — the address is what makes the machine exist on the network.",
  "ip addr": "Skip the check and you troubleshoot blind later: a typo here (wrong octet, wrong /bits) looks EXACTLY like a broken network in every later step. Thirty seconds of reading saves an hour of pinging.",
  "ping the neighbor (another host on the same street)": "Without one known-good ping you have no baseline. When something breaks later you cannot tell 'was broken from the start' from 'I just broke it' — the most expensive confusion in troubleshooting.",

  "configure": "In operational mode, set does not exist — the CLI refuses. Changes happen only in configuration mode, on the private candidate draft; without entering it, nothing can even begin.",
  "set vlans staff vlan-id 10": "Ports cannot join a room that has not been built: members of an undefined vlan are a commit error. No vlan, no wall — and no separation to configure.",
  "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff": "Without membership the port stays in the default room. Two PCs on the same switch still cannot talk if only one is in staff — the wall is real even though the metal is shared.",
  "show | compare": "Without the diff you commit blind. This is the ONLY moment mistakes are free — the draft has not touched the network yet. Skipping it is exactly how a stray delete goes live.",
  "commit": "Without commit NOTHING has happened: the network still runs the old config and your work quietly dies with the session. The single most common beginner confusion on real JunOS.",

  "On both switches: create the same VLANs, same numbers": "Tags carry NUMBERS, not names. If staff is 10 here and 20 there, each end files arriving frames into the wrong room — the classic silent trunk failure, with zero error messages.",
  "set interfaces ge-0/0/0 unit 0 family ethernet-switching interface-mode trunk": "Without trunk mode this is an access port: untagged, one room only. The other VLANs simply cannot share the cable, and every room but one is stranded on its own switch.",
  "set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members [ staff guest ]": "A VLAN missing from this list does not cross — no error, no warning, just one room mysteriously dead at one site while everything else works. THE one-vlan-down ticket.",
  "commit on both switches": "Commit only one end and the switches disagree about what the cable is: tagged frames meet an access port and drop on the floor. A trunk only exists when BOTH ends say so.",

  "set interfaces irb unit 10 family inet address 10.0.10.1/24": "Without an irb the switch is pure L2: rooms exist but no doorway has an address — nothing for hosts to aim their default route at, so every VLAN stays a sealed island.",
  "set vlans staff l3-interface irb.10": "Without this binding the address floats unattached — the irb belongs to no room, so it never comes up. A doorway has to be installed in a specific wall.",
  "commit, then repeat both lines for the second VLAN with its own subnet": "One gateway routes nothing by itself: traffic needs a door on BOTH sides. With one irb, packets can leave staff but the far room has no doorway to receive them through.",
  "On each host: ip route add default via 10.0.10.1 (its own room's door)": "Without a default route the HOST gives up without even trying — network unreachable, locally, instantly. The switch never sees the packet; the failure lives on the sender's own machine.",

  "set routing-options static route 0.0.0.0/0 next-hop 203.0.113.1": "Anything not in the routing table is dropped at this box. 0.0.0.0/0 is the everything-else entry — the difference between an office network and an island.",
  "commit, then run show route": "Without reading the table you assume instead of know: an unresolvable next-hop sits there uselessly while the config looks perfect. show route shows what the box will actually DO.",
  "Now think about the reply": "Forget the return path and you earn the lab's signature ticket: your ping ARRIVES and its answer dies on the way home. Half of all 'it does not work' is the other direction.",

  "Cable a Console connection into the CON port, then press the power button": "Without console you cannot reach a box that has no network settings yet — chicken and egg. The CON port is the one door that works before any address exists.",
  "Wait for 'Amnesiac (ttyu0)', log in as root (no password), type cli": "Amnesiac is the proof it is factory-blank. Without root (the only account that exists) and cli, you sit in the raw shell where JunOS commands do not run.",
  "configure, then set system root-authentication plain-text-password": "Without a root password the FIRST commit refuses outright — real JunOS will not put a passwordless box into service. This is the one step you cannot skip even on purpose.",
  "set system host-name, commit, and watch the prompt": "Without a hostname every box is Amnesiac — and in a rack of six identical switches you WILL type the right command into the wrong one. The prompt changing is the box telling you who it is.",

  "set access address-assignment pool STAFF family inet network 10.0.10.0/24": "Without a declared network the server does not know which subnet it speaks for — offers only ever come from a pool. No pool, no answers, and dhclient times out in silence.",
  "set access ... pool STAFF family inet range r1 low 10.0.10.100 (and high .199)": "Without a range the server knows the street but owns no houses on it — nothing to hand out. The range also keeps leases away from the addresses you assigned by hand.",
  "set access ... pool STAFF family inet dhcp-attributes router 10.0.10.1": "Without the router option clients get an address but NO gateway: the subnet works, everything beyond it fails. The classic 'DHCP works but the internet is down' ticket.",
  "set system services dhcp-local-server group LAN interface irb.10, then commit": "Without switching the service on for this interface, the pool is a filing cabinet nobody staffs: perfectly configured, never consulted. DISCOVERs arrive and expire unanswered.",
  "On the host: dhclient eth0": "DHCP is pull, not push — the server never volunteers an address to a machine that did not shout DISCOVER first. Without the client asking, nothing ever happens.",

  "set firewall family inet filter GUEST-IN term no-ops from destination-address 10.0.10.0/24": "The 'from' is the WHO. Without a precise match the term catches everything or nothing you meant — filters are dumb and enthusiastic, and a loose match discards the wrong traffic.",
  "set firewall family inet filter GUEST-IN term no-ops then discard": "Without a 'then', matching means nothing — the term identifies traffic and then shrugs. The action is the entire point: this is the line where packets actually die.",
  "set firewall family inet filter GUEST-IN term ok then accept": "THE forgotten line. Without an explicit accept, the invisible final term discards EVERYTHING that did not match — guests lose all connectivity, not just the bit you meant to block. One missing line, total outage.",
  "set interfaces irb unit 20 family inet filter input GUEST-IN, then commit": "Unapplied, a filter is a beautifully written law no court enforces: it sits in the config doing absolutely nothing while you feel protected. A very common false sense of security.",

  "On the laptop: wifi scan": "Without scanning you guess SSIDs blind — and the scan also proves the AP is alive at all. A dark AP does not beacon (no PoE, no Wi-Fi), and only the scan shows that absence.",
  "wifi join office-wifi": "Without associating there is no link at all — Wi-Fi's version of an unplugged cable. And joining is radio only: you are 'connected' but still addressless and can reach nothing.",
  "dhclient eth0": "Without it you sit associated but addressless — the 'connected, no internet' state everyone has met in an airport. Radio first, THEN the DORA dance; the order never changes.",

  "Place a Server (Add > Server), cable it into the VLAN, give it an address and gateway": "Without address and gateway the server is furniture: services cannot listen on an address that does not exist, and without a gateway its replies cannot leave the subnet — reachable one way, dead the other.",
  "On the server: service start dns, then service start http": "Without a running service a perfectly reachable machine says connection refused — which is NOT unreachable, and telling those apart is half of all troubleshooting. A server is only a server while something listens.",
  "dns add web.lab 10.0.10.80": "Without a record the resolver answers NXDOMAIN — honest and empty. Names are not discovered, they are DECLARED: somebody writes the phone book, and here that somebody is you.",
  "On the client: nameserver 10.0.10.80": "Without knowing WHO to ask, the client resolves nothing — could not resolve host, before a single packet leaves for the website. The failure is on the client; fixing the server cannot help it.",
  "nslookup web.lab": "Without testing resolution alone you cannot tell a DNS problem from a web problem — identical from a browser. nslookup asks ONLY the name question; that isolation is what makes it diagnostic.",
  "curl web.lab": "Without the end-to-end test you never prove the chain: resolve, THEN connect, THEN serve. Every earlier step can pass while the whole still fails — 200 OK is the only sentence that closes the ticket.",

  "On each switch: set system services ssh, then commit": "Without this line the box is reachable but nothing listens on port 22 — connection refused forever. Management access is a service you switch on, not a right you are owed.",
  "From a PC: ssh 10.0.10.1 — you are now ON the switch, over the network": "Without ssh you walk to the rack with a console cable for every typo — fine for one switch, absurd for forty. Managing the network ACROSS the network is the entire trade.",
  "The classic mistake: over ssh, disable the port you came in through, and commit": "Skip the rehearsal and your first lockout happens in production, with the rack forty minutes away. Doing it here on purpose is what turns commit confirmed 5 into a reflex instead of a war story.",
  "show lldp neighbors — the cable-tracing tool": "Without LLDP you trust the diagram — and diagrams lie the moment someone moves one cable. The neighbor table is ground truth; it replaces twenty minutes of cable-tugging in front of a rack.",
  "On a server: service start syslog. On each switch: set system syslog host <server-ip> any any, commit": "Without central logs each box keeps its own diary, and during an outage you read six of them, in the dark. One stream on one server turns 'what happened?' into a thirty-second read.",
  "Break something and watch the central log catch it": "Without a test event you learn whether logging works during a REAL incident — the worst possible moment. And note the silence: a box that lost power sends no death notice; missing lines are data too.",

  "Look at the building header": "Without glancing at the room you find out about heat when gear starts dying at 52 degrees. The header is the cheapest sensor you own — live, and always on screen.",
  "On any switch or router: show chassis environment": "The room average can look fine while one box beside a blocked vent quietly cooks. Without the per-device reading you know the ward but not the patient.",
  "After a mystery outage: show log messages": "Without the log a thermal shutdown looks like gremlins — the box was off and nobody knows why. The TEMPERATURE CRITICAL line is the confession, timestamped.",
  "Add > Power & cooling > Cooling unit — INSIDE the room": "Watts only accumulate; they never leave on their own. And a unit placed outside the walls cools the car park — capacity must live in the same room as the heat.",
};
const REF_HOWTO = [
  {
    title: "Your first IP address (on a host)",
    intro: "The smallest possible win: one computer, one address, one proof that it worked.",
    steps: [
      ["Click the host to open its shell", "Hosts are little Linux machines. There are no settings menus — everything is a command, which is exactly how servers are configured in real life."],
      ["ip addr add 10.0.10.5/24 dev eth0", "One line, three decisions. 10.0.10.5 is the house number; /24 says the first three numbers are the street; dev eth0 says which network card gets it. The /24 is not decoration — it is how this machine will decide, for every packet, whether to shout locally or hand off to a gateway."],
      ["ip addr", "Read back what the machine believes before trusting it. Verification after every change is the habit that separates people who fix networks from people who stare at them."],
      ["ping the neighbor (another host on the same street)", "An address is only proven when somebody answers. Watch the dot cross the canvas — that is your packet, and the reply coming back is the other half of the proof."],
    ],
    done: "ping reports 0.0% packet loss. If it says Destination Host Unreachable instead, one of the two machines is on the wrong street — re-read both /24s.",
  },
  {
    title: "Your first VLAN",
    intro: "You will build a room inside the switch and put one wall socket in it. Nothing here touches the computers — that is the whole point of VLANs.",
    steps: [
      ["configure", "Enter configuration mode. From here on you are writing on a scratch pad (the candidate); the switch keeps running on its old settings until you commit."],
      ["set vlans staff vlan-id 10", "Creates the room: a name for humans, a number for the wire. Committing just this changes nothing observable — an empty room does not affect traffic."],
      ["set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff", "Moves one wall socket into the room. The middle phrase — unit 0 family ethernet-switching — is the one to memorize; it means this port speaks switch-language. Whatever is plugged into ge-0/0/1 is now in staff, and the computer itself needs zero configuration."],
      ["show | compare", "Read your pad before making it real. Every + line is something about to change. This ten-second habit catches most mistakes before they exist."],
      ["commit", "The pad is copied onto reality in one step. Watch the canvas: with VLAN colors on, the port changes color the moment this lands."],
    ],
    done: "show vlans lists staff with your port in it — and a ping from that port's host to a host in ANY other VLAN now fails. The failing ping is the success: the room is sealed.",
  },
  {
    title: "Your first trunk",
    intro: "Two switches, many rooms, one cable. The trunk keeps the room tags on so the far side knows where every frame belongs. Everything here happens TWICE — once per switch.",
    steps: [
      ["On both switches: create the same VLANs, same numbers", "The names are courtesy; the NUMBERS are law. VLAN 10 here must be VLAN 10 there, because the number is what actually travels in the tag."],
      ["set interfaces ge-0/0/0 unit 0 family ethernet-switching interface-mode trunk", "Flips the uplink port from one-room-untagged to many-rooms-tagged. From now on every frame leaving this port wears its room number."],
      ["set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members [ staff guest ]", "The guest list, in real JunOS bracket syntax. A room not on this list simply does not exist across the hallway — forgetting one here is the classic one-VLAN-down-at-one-site ticket."],
      ["commit on both switches", "A trunk is an agreement. One side configured is not half a trunk — it is a broken link for every tagged frame."],
    ],
    done: "show vlans marks the uplink with a star in every room it carries, on both switches — and two same-VLAN hosts on different switches ping each other.",
  },
  {
    title: "A gateway for the VLAN (irb)",
    intro: "Sealed rooms are the goal — until two rooms genuinely need to talk. The switch itself can carry messages between them, through doors called irb interfaces.",
    steps: [
      ["set interfaces irb unit 10 family inet address 10.0.10.1/24", "Builds the door and nails an address onto it. The .1 is convention, not law — but every network follows it, so follow it too."],
      ["set vlans staff l3-interface irb.10", "Tells the staff room: irb.10 is YOUR door. These two statements always travel as a pair — commit one without the other and the commit refuses, naming the missing half."],
      ["commit, then repeat both lines for the second VLAN with its own subnet", "One door routes nothing. Two doors and the switch carries messages between the rooms — that IS inter-VLAN routing."],
      ["On each host: ip route add default via 10.0.10.1 (its own room's door)", "Computers do not discover gateways by magic. This line means: anything not on my street goes to the door."],
    ],
    done: "A staff host pings the guest door (10.0.20.1) and then a guest host itself. show route on the switch shows two Direct lines — the doors doing the work.",
  },
  {
    title: "Your first static route (and the way back)",
    intro: "Routers only know the streets plugged into them. Every other destination needs a written line of directions — and so does the REPLY.",
    steps: [
      ["set routing-options static route 0.0.0.0/0 next-hop 203.0.113.1", "The strange 0.0.0.0/0 means anything I have no better directions for — the default route, the way out. The next-hop must be an address on a street this router is actually plugged into."],
      ["commit, then run show route", "Read the table: Direct lines are streets it touches, Static lines are directions you wrote. If your route shows next-hop unresolvable, the next-hop is not on any of its streets."],
      ["Now think about the reply", "Your packet arriving is half the journey. The far-side router needs directions BACK to your street, or the answer dies quietly out there. Ping fails while traceroute succeeds? That is the signature of a missing return route."],
    ],
    done: "ping succeeds only once BOTH directions have directions. When it does, run traceroute and read your route working, hop by hop.",
  },
  {
    title: "First boot of a brand-new switch",
    intro: "Out of the box, a switch has no name, no config, and exactly one account. The short version — the full config lives in the worked example 'Day zero'.",
    steps: [
      ["Cable a Console connection into the CON port, then press the power button", "A new box has no network to reach it by — the serial console is the only door in. That is why the CON port exists."],
      ["Wait for 'Amnesiac (ttyu0)', log in as root (no password), type cli", "Amnesiac is JunOS for I remember nothing. Root with no password only works here, on the console, on a factory box — and JunOS will refuse to keep it that way."],
      ["configure, then set system root-authentication plain-text-password", "Your FIRST commit will fail until root has a password. That is not the lab nagging — it is real JunOS refusing to put a passwordless box into service."],
      ["set system host-name, commit, and watch the prompt", "root> becoming root@your-name> is the first visible proof a commit landed. Then finish the job: ssh, an admin user, ntp — see the Day zero example."],
    ],
    done: "The prompt carries your hostname and show configuration shows a hash under root-authentication — never your typed password.",
  },
  {
    title: "Your first DHCP pool",
    intro: "Stop typing addresses into computers. The switch can hand them out — address, mask, and gateway, all in one lease.",
    steps: [
      ["set access address-assignment pool STAFF family inet network 10.0.10.0/24", "The pool declares which street it serves. It must match the subnet of the VLAN's irb door."],
      ["set access ... pool STAFF family inet range r1 low 10.0.10.100 (and high .199)", "Fence off which houses get handed out. Keep .1-.99 free: the gateway lives at .1 and fixed-address machines want low numbers."],
      ["set access ... pool STAFF family inet dhcp-attributes router 10.0.10.1", "The most-forgotten line in DHCP. Without it clients get an address, reach their neighbors — and nothing else, because nobody told them where the door is."],
      ["set system services dhcp-local-server group LAN interface irb.10, then commit", "The ON switch: listen for address-shouts at the staff room's door. Pool without binding = silence."],
      ["On the host: dhclient eth0", "Watch the four-step handshake animate: DISCOVER, OFFER, REQUEST, ACK. If you see 'no DHCPOFFERS', the host is not in the room the server listens to."],
    ],
    done: "DHCPACK names an address and gateway; show dhcp server binding shows the lease against the host's hardware address.",
  },
  {
    title: "Your first firewall filter",
    intro: "Routing answers CAN it get there. Filters answer MAY it. You will post a doorman — and learn the one trap everybody falls into once.",
    steps: [
      ["set firewall family inet filter GUEST-IN term no-ops from destination-address 10.0.10.0/24", "Terms are the doorman's checklist, read top to bottom, first match wins. This one matches anything addressed to the ops street."],
      ["set firewall family inet filter GUEST-IN term no-ops then discard", "Throw it away, silently — the sender just sees a timeout. reject would send a not-allowed note back instead; both block, one is quiet, one is honest."],
      ["set firewall family inet filter GUEST-IN term ok then accept", "THE line. After your last term JunOS adds an invisible discard-EVERYTHING. Without this accept, guests lose their gateway, DHCP, internet — all of it. Commit without it once, deliberately, and you will never forget."],
      ["set interfaces irb unit 20 family inet filter input GUEST-IN, then commit", "Post the doorman where guest traffic enters routing — input on the guests' own door. Only guests are inspected; nobody else knows he exists."],
    ],
    done: "Guest-to-ops pings die with a red callout naming your filter; guest-to-gateway still answers. Blocked on purpose, broken nowhere.",
  },
  {
    title: "Joining Wi-Fi",
    intro: "An access point is a bridge with a radio: whoever associates behaves exactly like a machine plugged into the AP's wall socket.",
    steps: [
      ["On the laptop: wifi scan", "Lists every SSID with its signal. The dashed circle around each AP is coverage — outside it, joining simply fails, exactly like the far corner of a real office."],
      ["wifi join office-wifi", "The dotted blue line that appears IS your cable now. Everything you know about the wired network applies unchanged from here."],
      ["dhclient eth0", "Same VLAN, same DHCP server, same gateway as the wired machines — the radio changed nothing except removing the cable."],
    ],
    done: "A lease arrives over the air and the gateway answers your ping. Drag the laptop outside the circle and rejoin to feel the range limit.",
  },
  {
    title: "Your first server (DNS and a web page)",
    intro: "Everything so far moved packets. This is where packets become an APPLICATION — and where you learn the true first step of every connection: the name lookup nobody sees.",
    steps: [
      ["Place a Server (Add > Server), cable it into the VLAN, give it an address and gateway", "A server is just a computer — same ip addr add, same gateway rules. Nothing special has happened yet. It has a real power button on the faceplate: shut it down and it goes silent (unreachable — pings time out), which is NOT the same failure as a stopped service (connection refused). It also pours 300 watts into the room, so give it cooling."],
      ["On the server: service start dns, then service start http", "THIS is what makes it a server: it listens. A stopped service on a reachable machine gives connection refused — a completely different failure from an unreachable machine, and telling those two apart is half of all troubleshooting."],
      ["dns add web.lab 10.0.10.80", "Names are not magic — they are a lookup table somebody wrote. You are now that somebody. The record maps the name people type to the address packets need."],
      ["On the client: nameserver 10.0.10.80", "Every by-name connection starts with a question to a DNS server — before a single byte goes to the website. This line tells the client who to ask."],
      ["nslookup web.lab", "Watch the question get answered: which server was asked, what it returned. When DNS is broken, this is the tool that proves it — the site can be perfectly healthy while names are dead."],
      ["curl web.lab", "Two journeys in one command: resolve the name (DNS), then connect (HTTP). It can fail at either — and the error tells you which. That distinction is the whole lesson."],
    ],
    done: "HTTP/1.1 200 OK, with a note showing which DNS server resolved the name. Now break it both ways on purpose: stop dns (name lookups die, the site is 'down' while running), then stop http (names resolve, connection refused).",
  },
  {
    title: "Operate it like production (SSH, LLDP, syslog)",
    intro: "Console cables are for day zero. After that, real engineers manage every box ACROSS the network itself — which means the network carries its own lifeline, and you can cut it. These three tools are how a working network is actually run.",
    steps: [
      ["On each switch: set system services ssh, then commit", "Until this is committed, the box is reachable but nothing listens on port 22 — connection refused. After it, any host can open its CLI: ssh 10.0.10.1. Try the ssh BEFORE committing to see the refusal with your own eyes."],
      ["From a PC: ssh 10.0.10.1 — you are now ON the switch, over the network", "The prompt changes to the switch's own. Everything works: configure, commit, show. Type exit at the top prompt to come home. This is how all real network work happens — nobody walks to the rack."],
      ["The classic mistake: over ssh, disable the port you came in through, and commit", "The commit succeeds — and your session dies mid-sentence. You are locked out and must walk to the console. THIS is why commit confirmed 5 exists: if you cannot confirm within five minutes (because you cut yourself off), the box rolls back on its own. Do it once on purpose, here, where walking to the rack is free."],
      ["show lldp neighbors — the cable-tracing tool", "Every box announces itself on every live cable. This answers the eternal question in front of a real rack: WHICH port is that cable actually in? If the neighbor table disagrees with your diagram, believe the neighbor table."],
      ["On a server: service start syslog. On each switch: set system syslog host <server-ip> any any, commit", "From now on every event on every switch — commits, link flaps, storms, thermal trips — streams to one place. Read it with log on the server. One screen for the whole network: this is the first thing built in every real operation."],
      ["Break something and watch the central log catch it", "Pull a cable or power-cycle a switch, then read log on the server. Note what is MISSING too: a box that loses power cannot send its own death notice — silence in the log is also information. (Syslog is UDP: lines from an unreachable box are simply lost.)"],
    ],
    done: "You now run the network the way it is actually run: over itself. SSH means never walking to a rack; LLDP means never guessing which port; central syslog means one screen tells you what all your boxes did while you were not looking. And you have locked yourself out once, on purpose — so the day it happens for real, your hands will already know about commit confirmed.",
  },
  {
    title: "Reading the room temperature",
    intro: "Every watt a device draws becomes heat in its building. Rooms that cannot shed heat get hot, and hot gear turns itself off. Monitoring is half of HVAC.",
    steps: [
      ["Look at the building header", "The live temperature chip: green is fine, amber (30°C) is a warning, red (38°C) means shutdowns are coming. This is your first-glance monitor."],
      ["On any switch or router: show chassis environment", "The real JunOS command: chassis and Routing Engine temperatures plus fan state. 'Check' and 'Too hot' escalate as the room does."],
      ["After a mystery outage: show log messages", "If chassisd wrote TEMPERATURE CRITICAL — thermal shutdown, the network did not fail; the ROOM did. Fix cooling before touching a single config."],
      ["Add > Power & cooling > Cooling unit — INSIDE the room", "Rooms rise one degree per 25 W of uncooled heat; a unit subtracts its capacity. A CRAC in the corridor cools the corridor — placement is the whole job."],
    ],
    done: "The chip drops toward 18°C, the gear stays up when you power it back on, and the status row under the toolbar goes quiet.",
  },
];
function refClean(spec){ return spec.replace(/<([^:>]+):[^>]+>/g, "<$1>"); }

/* Worked examples, in the shape of Juniper's documentation examples:
   Overview -> CLI Quick Configuration (complete, paste-able) -> explained
   steps -> Verification. Every quick-config block is validated by the test
   suite against the real grammar, so these can never rot. */
const REF_EXAMPLES = [
  {
    dev: "switch", title: "Day zero: a brand-new switch, out of the box",
    overview: "This is the full unboxing ritual, exactly as the lab simulates it. Rack the switch. Plug a Console connection into the CON port — the serial socket that works even when the box has no network settings, which right now it does not. Press the power button and watch it boot until it says Amnesiac (ttyu0), which is JunOS for I have no configuration and no name. Log in as root — the only account that exists — with no password. Type cli to leave the raw shell, then configure. Now the important part: your FIRST commit will refuse to complete until root has a password. That is real JunOS protecting you from putting a passwordless box into service. Set the password, name the box, give the me0 management port an address, commit — and only then start cabling data ports.",
    quick: [
      "set system root-authentication plain-text-password Fr3sh!Start",
      "set system host-name acc-new-1",
      "set interfaces me0 unit 0 family inet address 10.99.0.21/24",
      "set system services ssh",
      "set system login user kaatje class super-user",
      "set system login user kaatje authentication plain-text-password Adm1n!here",
      "set system ntp server 10.99.0.1",
      "set system name-server 1.1.1.1",
    ],
    steps: [
      ["set system root-authentication plain-text-password", "Typed without a password on the end, this asks you for the password twice, hiding what you type — exactly like the real box. (The lab also accepts the password on the same line, as in the listing above, to make this example paste-able.) Either way, the configuration never stores your actual text: look later and you will find only a scrambled hash under encrypted-password."],
      ["set system host-name acc-new-1", "This names the box. The name shows up in the prompt the moment you commit: root> becomes root@acc-new-1>. Watching the prompt change is your first concrete proof that a commit really landed."],
      ["set interfaces me0 unit 0 family inet address 10.99.0.21/24", "me0 is the management port on the right edge of the faceplate. It gets an address on the management street so administrators can reach the switch even when the normal network is broken — that is its whole job. It never carries the users' traffic."],
      ["ssh + a named admin user + ntp + name-server", "The part every lab skips and every production network needs. SSH is how you will actually reach the box tomorrow; a named account means the logs say who did what (root stays for emergencies); NTP keeps the log timestamps honest; name-server lets the box resolve names. Every password here is stored as a hash — search the config for your typed text and you will not find it."],
    ],
    verify: [
      ["commit (before setting the password)", "It fails, on purpose, with Missing mandatory statement. Read the message — it is the factory refusing to run without a root password."],
      ["show configuration", "Under root-authentication you see encrypted-password and a hash. Your actual password appears nowhere, ever."],
      ["show interfaces terse", "me0 now lists its management address, and con shows the console port you came in through."],
      ["show configuration | display set", "The whole config as paste-able set commands — the format you keep in documentation and feed to the next box."],
    ],
  },
  {
    dev: "switch", title: "A two-VLAN access switch, start to finish",
    overview: "The most common switch build there is. Two rooms (VLANs) called staff and guest, one wall socket in each room, and a door with an address in each room so the switch itself can carry messages between them. Read the listing top to bottom in three chunks: first the rooms are created, then the sockets are placed in them, then the doors are added. Nothing is omitted — these nine lines are the entire configuration.",
    quick: [
      "set system host-name acc-1",
      "set vlans staff vlan-id 10",
      "set vlans guest vlan-id 20",
      "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff",
      "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members guest",
      "set interfaces irb unit 10 family inet address 10.0.10.1/24",
      "set interfaces irb unit 20 family inet address 10.0.20.1/24",
      "set vlans staff l3-interface irb.10",
      "set vlans guest l3-interface irb.20",
    ],
    steps: [
      ["set vlans staff vlan-id 10", "This creates the room and gives it its number. The name (staff) is for humans; the number (10) is what actually rides inside the tags when traffic crosses a trunk. Creating a room changes nothing by itself — nothing is inside it yet."],
      ["set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff", "This puts wall socket ge-0/0/1 inside the staff room. The middle part, unit 0 family ethernet-switching, is the phrase to memorize — it means this port speaks switch-language. From now on, whatever you plug into this socket is in staff automatically. The computer needs no settings of its own."],
      ["set interfaces irb unit 10 ... + set vlans staff l3-interface irb.10", "These two lines always travel as a pair. The first one builds the door and nails the address 10.0.10.1 onto it. The second tells the staff room: irb.10 is YOUR door. Commit one without the other and the commit politely refuses and names the missing half. The door's address is what every staff computer will use as its gateway."],
    ],
    verify: [
      ["show vlans", "each room lists the sockets that belong to it, and the L3 column names its door"],
      ["show route", "two lines marked Direct — one per door. Those two lines are what carry messages from staff to guest and back."],
      ["ping 10.0.20.1 from a staff computer", "give the computer 10.0.10.5/24 and gateway 10.0.10.1 first. If the guest room's door answers, the whole chain works: socket, room, door, and the routing between the doors."],
    ],
  },
  {
    dev: "switch", title: "A trunk that carries both VLANs",
    overview: "One side of the hallway between two switches — the far switch needs these exact same lines with the same room names and numbers. Here is the entire difference between an access port and a trunk: an access port belongs to ONE room and removes the tags; a trunk carries MANY rooms and keeps the tags on, so the far switch can tell which room each frame belongs to.",
    quick: [
      "set vlans staff vlan-id 10",
      "set vlans guest vlan-id 20",
      "set interfaces ge-0/0/0 unit 0 family ethernet-switching interface-mode trunk",
      "set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members [ staff guest ]",
    ],
    steps: [
      ["interface-mode trunk", "This flips the socket from one room, tags off to many rooms, tags on. Every frame leaving this port now wears its room number, and every arriving frame must wear one."],
      ["vlan members [ staff guest ]", "The guest list for the hallway. The square brackets are real JunOS syntax for a list on one line. Any room NOT on this list simply cannot cross to the other switch — and forgetting one room here is the classic one VLAN is broken at one site ticket. When guests-at-rack-B are down and staff are fine, come look at this line."],
    ],
    verify: [
      ["show vlans", "the trunk port now appears inside every room it carries, marked with a star to say tagged"],
      ["show interfaces terse", "the port reads trunk with both room names beside it"],
    ],
  },
  {
    dev: "router", title: "Edge router: internet + source NAT",
    overview: "The box that stands between your office and the internet, complete. It has three jobs, and the listing reads in exactly that order. Job one: addresses — one public address facing the provider, one private address facing the office. Job two: the default route — which way is out. Job three: NAT. Why NAT exists: your office uses private addresses (192.168.x.x), and the internet refuses to deliver replies to private addresses — they are like letters with a made-up return address. So the router crosses out the private return address on every outgoing packet and writes its own public one instead, keeping a note of who really sent it. When the reply arrives, it reads the note and hands the reply to the right computer. Without job three, everything pings except the internet.",
    quick: [
      "set system host-name edge-1",
      "set interfaces ge-0/0/0 unit 0 family inet address 203.0.113.2/30",
      "set interfaces ge-0/0/1 unit 0 family inet address 192.168.50.1/24",
      "set routing-options static route 0.0.0.0/0 next-hop 203.0.113.1",
      "set security nat source rule-set OFFICE from interface ge-0/0/1.0",
      "set security nat source rule-set OFFICE to interface ge-0/0/0.0",
      "set security nat source rule-set OFFICE rule R1 match source-address 192.168.50.0/24",
      "set security nat source rule-set OFFICE rule R1 then source-nat interface",
    ],
    steps: [
      ["set routing-options static route 0.0.0.0/0 next-hop 203.0.113.1", "In plain words: anything I do not have better directions for goes to the provider at 203.0.113.1. The strange-looking 0.0.0.0/0 just means any address at all. Every network with an internet connection has exactly one line like this somewhere."],
      ["from interface ge-0/0/1.0 / to interface ge-0/0/0.0", "The direction rule. Only packets that came IN through the office side and are heading OUT through the internet side get their return address rewritten. Notice both names end in .0 — NAT rules name logical units, not bare ports, so the .0 is required."],
      ["then source-nat interface", "The rewrite itself: replace the sender's private return address with the outgoing port's own public address (203.0.113.2), and remember who really sent it. The reply comes back addressed to the public address; the router checks its notes and delivers it to the original computer. Watch the canvas during a ping — a small tag shows the swap happening on the router."],
    ],
    verify: [
      ["show security nat source", "your rule, its direction, and which senders it applies to"],
      ["ping 8.8.8.8 from an office computer", "with the NAT lines this succeeds and you can see the address-swap tag on the router. Delete the NAT lines and the same ping fails — and the error message tells you precisely that the internet cannot reply to a private address."],
    ],
  },
  {
    dev: "switch", title: "DHCP service for a VLAN",
    overview: "Nobody walks desk to desk typing addresses into computers. Instead, a new computer shouts into its room: does anyone have an address for me? A DHCP server answers with an offer: here is an address, here is your mask, and here is your gateway. This listing builds that server into the same switch that owns the room's door. It has two halves that both must exist: the POOL (what to hand out) and the BINDING (which door to listen at).",
    quick: [
      "set vlans staff vlan-id 10",
      "set interfaces irb unit 10 family inet address 10.0.10.1/24",
      "set vlans staff l3-interface irb.10",
      "set access address-assignment pool STAFF family inet network 10.0.10.0/24",
      "set access address-assignment pool STAFF family inet range r1 low 10.0.10.100",
      "set access address-assignment pool STAFF family inet range r1 high 10.0.10.199",
      "set access address-assignment pool STAFF family inet dhcp-attributes router 10.0.10.1",
      "set system services dhcp-local-server group LAN interface irb.10",
    ],
    steps: [
      ["pool STAFF ... network + range", "The pool says which street it serves (10.0.10.0/24) and which houses it may give away (.100 up to .199). The low numbers are deliberately kept out of the range: .1 belongs to the gateway, and you want a few spare low numbers for machines that need fixed addresses."],
      ["dhcp-attributes router 10.0.10.1", "The most-forgotten line in all of DHCP. It puts the gateway into every offer. Skip it and computers still get addresses, still reach their neighbors — and cannot reach anything beyond the room. That half-working state is a genuinely confusing ticket, so learn to check this line first."],
      ["set system services dhcp-local-server group LAN interface irb.10", "This is the on-switch. It says: listen for those shouts at the staff room's door, irb.10. Without this line there is a pool but no listener, and the computer's shout just echoes. When dhclient reports no offers, check this binding — and check that the computer's socket really is in this room."],
    ],
    verify: [
      ["dhclient eth0 on a host", "watch the four-step conversation animate across the canvas: DISCOVER (the shout), OFFER, REQUEST, ACK"],
      ["show dhcp server binding", "the handed-out address, tied to the computer's hardware address"],
    ],
  },
  {
    dev: "router", title: "OSPF site router (transit + passive LAN)",
    overview: "With static routes, YOU write every line of directions by hand, and rewrite them every time the network changes. OSPF makes the routers do the writing. Routers that share a link introduce themselves to each other (that introduction is called an adjacency), and then teach each other every street they know. When a link dies, they re-teach each other and the directions fix themselves. This listing is one site's router; the other sites get matching lines. The overall shape — protocols, a protocol name, an area, then interface lines — is how Junos configures every routing protocol, so this pattern transfers directly to the others (IS-IS in Juniper's own docs looks almost identical).",
    quick: [
      "set system host-name hq-r",
      "set interfaces ge-0/0/0 unit 0 family inet address 10.1.0.1/24",
      "set interfaces ge-0/0/1 unit 0 family inet address 10.9.12.1/30",
      "set protocols ospf area 0 interface ge-0/0/1.0",
      "set protocols ospf area 0 interface ge-0/0/0.0 passive",
    ],
    steps: [
      ["set protocols ospf area 0 interface ge-0/0/1.0", "OSPF is switched on per PORT, not per router. This enables it on the link toward the next site. When the router at the far end of that cable enables its side too, the two introduce themselves, report Full (friendship complete), and start exchanging maps. Notice what this listing does NOT contain: a single static route."],
      ["set protocols ospf area 0 interface ge-0/0/0.0 passive", "The office network must be IN the shared map, but ordinary computers must never take part in drawing it. passive means exactly that: advertise this street to the other routers, but form no friendships on it. Every port that faces computers instead of routers gets the passive word."],
    ],
    verify: [
      ["show ospf neighbor", "Full beside a neighbor means the introduction finished and maps are flowing"],
      ["show route", "streets learned from the other routers appear, marked OSPF — none of them written by you"],
      ["unplug a transit link, then traceroute again", "the path re-routes through the surviving links, by itself, within a blink. That self-repair is the entire reason OSPF exists."],
    ],
  },
  {
    dev: "switch", title: "Guest filter: routed but forbidden",
    overview: "Both rooms hang off this one switch, and its two doors happily carry messages between them — because routing has no idea that guests should not reach the ops machines. Routing answers CAN it get there; policy answers MAY it. Policy here is a doorman (a filter) posted at the guests' own door. He throws away anything addressed to the ops street and waves everything else through. Read step two with special care: it is the single most important line, and the one everybody forgets exactly once.",
    quick: [
      "set vlans ops vlan-id 10",
      "set vlans guest vlan-id 20",
      "set interfaces irb unit 10 family inet address 10.0.10.1/24",
      "set interfaces irb unit 20 family inet address 10.0.20.1/24",
      "set vlans ops l3-interface irb.10",
      "set vlans guest l3-interface irb.20",
      "set firewall family inet filter GUEST-IN term no-ops from destination-address 10.0.10.0/24",
      "set firewall family inet filter GUEST-IN term no-ops then discard",
      "set firewall family inet filter GUEST-IN term ok then accept",
      "set interfaces irb unit 20 family inet filter input GUEST-IN",
    ],
    steps: [
      ["term no-ops: from destination-address 10.0.10.0/24, then discard", "A filter is the doorman's checklist, and each numbered rule on it is called a term. He reads top to bottom and obeys the FIRST rule that matches. This rule says: a packet addressed to the ops street gets thrown away. discard throws it away silently — the guest just sees their ping time out. The alternative, reject, also throws it away but sends back a note saying not allowed. Both block equally well; discard is quiet, reject is honest. Your choice."],
      ["term ok: then accept", "Here is the trap. After your LAST written rule, JunOS adds an invisible extra rule that throws away EVERYTHING which got that far. So without this line, the doorman blocks the ops street... and then also blocks the gateway, the DHCP answers, the internet — everything the guests do. This line means: everyone I was not told to stop may pass. Do try committing without it once, on purpose, and watch the guests lose everything — you will never forget the invisible rule again."],
      ["set interfaces irb unit 20 family inet filter input GUEST-IN", "This posts the doorman at exactly the right spot. input on irb.20 means: check traffic as it comes FROM the guest room INTO the switch's routing. So only guest traffic is inspected — the ops room, the staff, everyone else never even meets him."],
    ],
    verify: [
      ["ping 10.0.10.5 from a guest — it fails", "and the failure IS the success. Look at the canvas: a red note appears at the exact spot the packet died, and it names this filter. That is how you tell blocked on purpose apart from broken by accident."],
      ["ping 10.0.20.1 from a guest — it works", "the gateway still answers, which proves you filtered one destination instead of breaking the room. If this ping fails too, you forgot the accept term — go reread step two."],
    ],
  },
  {
    dev: "switch", title: "LACP bundle (one side)",
    overview: "Two cables between the same two switches, taught to behave as one thick cable. Why teach them anything? Because plugged in naively, two parallel cables form a loop, and the network storms — you can literally watch it flash. Bundled, the same two cables give you double the capacity and a built-in spare: one can die and nobody notices. This is one switch's half; the far switch needs the mirror image.",
    quick: [
      "set vlans staff vlan-id 10",
      "set vlans guest vlan-id 20",
      "set interfaces ge-0/0/0 ether-options 802.3ad ae0",
      "set interfaces ge-0/0/1 ether-options 802.3ad ae0",
      "set interfaces ae0 aggregated-ether-options lacp active",
      "set interfaces ae0 unit 0 family ethernet-switching interface-mode trunk",
      "set interfaces ae0 unit 0 family ethernet-switching vlan members [ staff guest ]",
    ],
    steps: [
      ["set interfaces ge-0/0/0 ether-options 802.3ad ae0", "This tells a physical port: you are now a limb of bundle ae0. A limb has no opinions of its own anymore — any room settings left on the member port are ignored from here on. Both cables' ports get one of these lines each."],
      ["set interfaces ae0 aggregated-ether-options lacp active", "LACP is the handshake the two switches use to agree that these cables are one bundle. BOTH ends must run it. Configure only one side and that side's bundle stays down — and show lacp interfaces will say no LACP partner, which points you straight at the side that still needs configuring."],
      ["set interfaces ae0 unit 0 family ethernet-switching ...", "All the real settings — trunk mode, the room list — are written on the bundle itself, ae0, exactly as if it were an ordinary port. Which, from now on, it is."],
    ],
    verify: [
      ["show lacp interfaces", "both member cables should read Collecting distributing — bundle-language for working"],
      ["set interfaces ge-0/0/0 disable, commit, then ping across", "traffic keeps flowing over the surviving cable without a hiccup. That calm survival is exactly what you built the bundle for."],
    ],
  },
];

/* prose helper: writes text into el, turning ALL-CAPS emphasis words into <b> */
function refProse(el, text){
  const parts = String(text).split(/([A-Z][A-Z'-]{2,}(?:\s[A-Z][A-Z'-]{2,})*)/g);
  parts.forEach((p, i) => {
    if(!p) return;
    if(i % 2){ const b = document.createElement("b"); b.textContent = p; el.appendChild(b); }
    else el.appendChild(document.createTextNode(p));
  });
  return el;
}
function buildReferenceInto(box){
    box.innerHTML = "";
    const filter = document.createElement("input");
    filter.className = "ref-filter";
    filter.placeholder = "filter — try: vlan, trunk, commit, filter, lacp, nat, dhcp, ospf";
    box.appendChild(filter);
    const body = document.createElement("div"); box.appendChild(body);
    // the book layer: sections become PAGES with a chapter bar and a pager.
    // A search query temporarily flattens the book so results span every page.
    const REF_PAGES = [];
    let refPageIdx = 0;
    try{ refPageIdx = parseInt(localStorage.getItem("junoslab-refpage") || "0", 10) || 0; }catch(e){}
    const chapterBar = document.createElement("div"); chapterBar.className = "ref-chapters";
    body.appendChild(chapterBar);
    const mkPage = (title) => {
      const pg = document.createElement("div"); pg.className = "ref-page";
      pg._title = title;
      REF_PAGES.push(pg);
      body.appendChild(pg);
      return pg;
    };
    const pageFund = mkPage("Fundamentals");
    const pageCmd = mkPage("Command index");
    const pageHow = mkPage("How-to guides");
    const pageCon = mkPage("Concepts");
    const pageEx = mkPage("Worked examples");
    const pageFull = mkPage("Every command");

    // the addressing primer — one fold, opened like a book page
    const prHead = document.createElement("div"); prHead.className = "ref-h"; prHead.textContent = "Fundamentals";
    pageFund.appendChild(prHead);
    const prFold = document.createElement("div"); prFold.className = "ref-fold";
    {
      const head = document.createElement("div"); head.className = "ref-fold-head";
      const chev = document.createElement("span"); chev.className = "ref-chev"; chev.textContent = "▸";
      const label = document.createElement("span"); label.textContent = REF_PRIMER.title;
      const count = document.createElement("span"); count.className = "ref-count"; count.textContent = "primer";
      head.append(chev, label, count);
      const inner = document.createElement("div"); inner.className = "ref-fold-inner";
      const content = document.createElement("div"); content.className = "ref-fold-content";
      inner.appendChild(content);
      const ov = refProse(Object.assign(document.createElement("div"), { className: "ref-ex-overview" }), REF_PRIMER.intro);
      content.appendChild(ov);
      content.appendChild(ipAnatomyEl());
      const fh = document.createElement("div"); fh.className = "ref-ex-h";
      fh.textContent = "Plugging in a brand-new machine — the whole ritual";
      content.appendChild(fh);
      const fl = refDiagramEl(NEWHOST_FLOW);
      if(fl) content.appendChild(fl);
      const th = document.createElement("div"); th.className = "ref-ex-h";
      th.textContent = "Assign, check, maintain — the commands";
      content.appendChild(th);
      const pre = document.createElement("pre"); pre.className = "ref-quick"; pre.textContent = REF_PRIMER.table;
      content.appendChild(pre);
      for(const [term, bodyTxt] of REF_PRIMER.sections){
        const row = document.createElement("div"); row.className = "ref-cmdrow";
        const c = document.createElement("div"); c.className = "ref-t"; c.textContent = term;
        const hl = refProse(Object.assign(document.createElement("div"), { className: "ref-help" }), bodyTxt);
        row.append(c, hl);
        content.appendChild(row);
      }
      head.onclick = () => prFold.classList.toggle("open");
      prFold.append(head, inner);
      prFold._q = (REF_PRIMER.title + " " + REF_PRIMER.intro + " subnet mask count address ip assign check maintenance new host connect " +
        REF_PRIMER.sections.map(x => x.join(" ")).join(" ")).toLowerCase();
      pageFund.appendChild(prFold);
    }

    // cooling, same first-principles treatment
    const coolFold = document.createElement("div"); coolFold.className = "ref-fold";
    {
      const head = document.createElement("div"); head.className = "ref-fold-head";
      const chev = document.createElement("span"); chev.className = "ref-chev"; chev.textContent = "▸";
      const label = document.createElement("span"); label.textContent = REF_COOLING.title;
      const count = document.createElement("span"); count.className = "ref-count"; count.textContent = "primer";
      head.append(chev, label, count);
      const inner = document.createElement("div"); inner.className = "ref-fold-inner";
      const content = document.createElement("div"); content.className = "ref-fold-content";
      inner.appendChild(content);
      content.appendChild(refProse(Object.assign(document.createElement("div"), { className: "ref-ex-overview" }), REF_COOLING.intro));
      const fl = refDiagramEl(REF_DIAGRAMS["Heat & cooling"]);
      if(fl) content.appendChild(fl);
      const th = document.createElement("div"); th.className = "ref-ex-h";
      th.textContent = "The units on the Add menu — and what the names mean";
      content.appendChild(th);
      const pre = document.createElement("pre"); pre.className = "ref-quick"; pre.textContent = REF_COOLING.table;
      content.appendChild(pre);
      for(const [term, bodyTxt] of REF_COOLING.sections){
        const row = document.createElement("div"); row.className = "ref-cmdrow";
        const c = document.createElement("div"); c.className = "ref-t"; c.textContent = term;
        const hl = refProse(Object.assign(document.createElement("div"), { className: "ref-help" }), bodyTxt);
        row.append(c, hl);
        content.appendChild(row);
      }
      head.onclick = () => coolFold.classList.toggle("open");
      coolFold.append(head, inner);
      coolFold._q = (REF_COOLING.title + " crac crah hvac cooling heat temperature thermal aircon watts " +
        REF_COOLING.sections.map(x => x.join(" ")).join(" ")).toLowerCase();
      pageFund.appendChild(coolFold);
    }

    // the command index: what to type, where, for what
    const ciHead = document.createElement("div"); ciHead.className = "ref-h";
    ciHead.textContent = "Command index — by what you are trying to do";
    pageCmd.appendChild(ciHead);
    const ciFolds = [];
    const WHERE_HELP = { "PC $": "type this in a PC's shell", "server $": "type this in a server's shell",
      "JunOS >": "JunOS operational mode (the prompt ends in >)",
      "JunOS #": "JunOS configure mode (type configure first; the prompt ends in #)",
      "UPS": "click the UPS device on the canvas", "cooling": "click the cooling unit on the canvas" };
    const ciCap = document.createElement("div"); ciCap.className = "ref-legend-cap";
    ciCap.textContent = "The decoder ring: $ > # are PROMPTS — printed by the machine while it waits for you, never typed. Each row's chip says which window to stand in.";
    pageCmd.appendChild(ciCap);
    const legend = document.createElement("div"); legend.className = "ref-legend";
    for(const [sym, txt] of [
      ["$", "a Linux shell — PCs and servers"],
      [">", "JunOS operational mode — looking around (show, ping)"],
      ["#", "JunOS configure mode — changing things (type configure to enter, commit to make it real)"],
    ]){
      const s = document.createElement("div"); s.className = "ref-legend-sym"; s.textContent = sym;
      const tx = document.createElement("div"); tx.className = "ref-legend-txt";
      refProse(tx, txt);
      legend.append(s, tx);
    }
    pageCmd.appendChild(legend);
    for(const sec of REF_CMDINDEX){
      const fold = document.createElement("div"); fold.className = "ref-fold";
      const head = document.createElement("div"); head.className = "ref-fold-head";
      const chev = document.createElement("span"); chev.className = "ref-chev"; chev.textContent = "▸";
      const label = document.createElement("span"); label.textContent = sec.cat;
      const count = document.createElement("span"); count.className = "ref-count"; count.textContent = String(sec.rows.length);
      head.append(chev, label, count);
      const inner = document.createElement("div"); inner.className = "ref-fold-inner";
      const content = document.createElement("div"); content.className = "ref-fold-content";
      inner.appendChild(content);
      for(const [cmdT, where, what] of sec.rows){
        const row = document.createElement("div"); row.className = "ref-cmdrow";
        const c = document.createElement("div"); c.className = "ref-cmd";
        if(where){
          const wc = document.createElement("span"); wc.className = "ref-where";
          wc.textContent = where;
          wc.title = WHERE_HELP[where] || "";
          c.appendChild(wc);
        }
        c.appendChild(document.createTextNode(cmdT));
        const hl = refProse(Object.assign(document.createElement("div"), { className: "ref-help" }), what);
        row.append(c, hl);
        content.appendChild(row);
      }
      head.onclick = () => fold.classList.toggle("open");
      fold.append(head, inner);
      fold._q = (sec.cat + " " + sec.rows.map(r => r.join(" ")).join(" ")).toLowerCase();
      pageCmd.appendChild(fold);
      ciFolds.push({ fold });
    }

    // how-to guides: numbered first-time walkthroughs
    const hgHead = document.createElement("div"); hgHead.className = "ref-h";
    hgHead.textContent = "How-to guides — your first time, step by step";
    pageHow.appendChild(hgHead);
    const hgFolds = [];
    for(const gd of REF_HOWTO){
      const fold = document.createElement("div"); fold.className = "ref-fold";
      const head = document.createElement("div"); head.className = "ref-fold-head";
      const chev = document.createElement("span"); chev.className = "ref-chev"; chev.textContent = "▸";
      const label = document.createElement("span"); label.textContent = gd.title;
      const count = document.createElement("span"); count.className = "ref-count"; count.textContent = gd.steps.length + " steps";
      head.append(chev, label, count);
      const inner = document.createElement("div"); inner.className = "ref-fold-inner";
      const content = document.createElement("div"); content.className = "ref-fold-content";
      inner.appendChild(content);
      const ov = document.createElement("div"); ov.className = "ref-ex-overview"; ov.textContent = gd.intro;
      content.appendChild(ov);
      // roadmap: the journey at a glance, snaking like a board-game path
      const shortLbl = s => {
        let t2 = String(s);
        const cut = Math.min(...[" (", " — ", ": ", ", "].map(x => {
          const ix = t2.indexOf(x); return ix < 0 ? 1e9 : ix;
        }));
        if(cut < 1e9) t2 = t2.slice(0, cut);
        return t2.length > 26 ? t2.slice(0, 24) + "…" : t2;
      };
      const road = document.createElement("div"); road.className = "ref-road";
      for(let r = 0; r * 3 < gd.steps.length; r++){
        if(r > 0){
          const down = document.createElement("div");
          down.className = "road-down " + (r % 2 === 1 ? "right" : "left");
          road.appendChild(down);
        }
        const rowEl = document.createElement("div");
        const rev = r % 2 === 1;
        rowEl.className = "road-row" + (rev ? " rev" : "");
        gd.steps.slice(r * 3, r * 3 + 3).forEach((st2, k) => {
          if(k > 0){
            const a = document.createElement("span");
            a.className = "road-arr " + (rev ? "l" : "r");
            rowEl.appendChild(a);
          }
          const chip = document.createElement("span"); chip.className = "road-chip";
          const n = document.createElement("b"); n.textContent = String(r * 3 + k + 1);
          chip.appendChild(n);
          chip.appendChild(document.createTextNode(" " + shortLbl(st2[0])));
          rowEl.appendChild(chip);
        });
        road.appendChild(rowEl);
      }
      content.appendChild(road);
      gd.steps.forEach(([cmd, why], i) => {
        const row = document.createElement("div"); row.className = "ref-cmdrow";
        const c2 = document.createElement("div"); c2.className = "ref-cmd";
        c2.textContent = (i + 1) + ".  " + cmd;
        const grid2 = document.createElement("div"); grid2.className = "ref-whygrid";
        const hl = refProse(Object.assign(document.createElement("div"), { className: "ref-help" }), why);
        grid2.appendChild(hl);
        const wo = REF_WITHOUT[cmd];
        if(wo){
          const wob = document.createElement("div"); wob.className = "ref-without";
          const woh = document.createElement("div"); woh.className = "ref-without-h";
          woh.textContent = "Without this step";
          const wot = document.createElement("div"); wot.textContent = wo;
          wob.append(woh, wot);
          grid2.appendChild(wob);
        }
        row.append(c2, grid2);
        content.appendChild(row);
      });
      const dh = document.createElement("div"); dh.className = "ref-ex-h"; dh.textContent = "How you know it worked";
      content.appendChild(dh);
      const dd = document.createElement("div"); dd.className = "ref-help"; dd.textContent = gd.done;
      content.appendChild(dd);
      head.onclick = () => fold.classList.toggle("open");
      fold.append(head, inner);
      pageHow.appendChild(fold);
      fold._q = (gd.title + " " + gd.intro + " " + gd.steps.map(x =>
        x.join(" ") + " " + (REF_WITHOUT[x[0]] || "")).join(" ")).toLowerCase();
      hgFolds.push({ fold });
    }

    // concepts: a grid of cards that lift like pop-up pages
    const conceptCards = [];
    const cHead = document.createElement("div"); cHead.className = "ref-h"; cHead.textContent = "Concepts";
    pageCon.appendChild(cHead);
    const grid = document.createElement("div"); grid.className = "ref-grid"; pageCon.appendChild(grid);
    REF_CONCEPTS.forEach(([t, b], i) => {
      const card = document.createElement("div"); card.className = "ref-card";
      card.style.borderTopColor = VLAN_PALETTE[i % VLAN_PALETTE.length];
      const tt = document.createElement("div"); tt.className = "ref-card-title"; tt.textContent = t;
      const bb = refProse(Object.assign(document.createElement("div"), { className: "ref-card-body" }), b);
      card.append(tt, bb);
      const spec = REF_DIAGRAMS[t];
      let dgText = "";
      if(spec){
        const dg = refDiagramEl(spec);
        if(dg) card.appendChild(dg);
        dgText = " " + refDiagramText(spec);
      }
      card._q = (t + " " + b + dgText).toLowerCase();
      grid.appendChild(card);
      conceptCards.push(card);
    });

    // command chapters: folding panels that open like book spreads
    const folds = [];
    function chapter(title, rows){
      const fold = document.createElement("div"); fold.className = "ref-fold";
      const head = document.createElement("div"); head.className = "ref-fold-head";
      const chev = document.createElement("span"); chev.className = "ref-chev"; chev.textContent = "▸";
      const label = document.createElement("span"); label.textContent = title;
      const count = document.createElement("span"); count.className = "ref-count"; count.textContent = String(rows.length);
      head.append(chev, label, count);
      const inner = document.createElement("div"); inner.className = "ref-fold-inner";
      const content = document.createElement("div"); content.className = "ref-fold-content";
      inner.appendChild(content);
      const els = rows.map(([a, b]) => {
        const row = document.createElement("div"); row.className = "ref-cmdrow";
        const c = document.createElement("div"); c.className = "ref-cmd"; c.textContent = a;
        row.appendChild(c);
        if(b){ const hl = document.createElement("div"); hl.className = "ref-help"; hl.textContent = b; row.appendChild(hl); }
        row._q = (a + " " + (b || "")).toLowerCase();
        content.appendChild(row);
        return row;
      });
      head.onclick = () => fold.classList.toggle("open");
      fold.append(head, inner);
      pageFull.appendChild(fold);
      folds.push({ fold, els });
    }
    // worked examples — full configs with explained steps
    const exHead = document.createElement("div"); exHead.className = "ref-h"; exHead.textContent = "Worked examples (complete configs)";
    pageEx.appendChild(exHead);
    const exFolds = [];
    for(const ex of REF_EXAMPLES){
      const fold = document.createElement("div"); fold.className = "ref-fold";
      const head = document.createElement("div"); head.className = "ref-fold-head";
      const chev = document.createElement("span"); chev.className = "ref-chev"; chev.textContent = "▸";
      const label = document.createElement("span"); label.textContent = ex.title;
      const count = document.createElement("span"); count.className = "ref-count"; count.textContent = ex.dev + " · " + ex.quick.length + " lines";
      head.append(chev, label, count);
      const inner = document.createElement("div"); inner.className = "ref-fold-inner";
      const content = document.createElement("div"); content.className = "ref-fold-content";
      inner.appendChild(content);
      const ov = document.createElement("div"); ov.className = "ref-ex-overview"; ov.textContent = ex.overview;
      content.appendChild(ov);
      const qh = document.createElement("div"); qh.className = "ref-ex-h"; qh.textContent = "CLI quick configuration";
      content.appendChild(qh);
      const pre = document.createElement("pre"); pre.className = "ref-quick"; pre.textContent = ex.quick.join("\n");
      content.appendChild(pre);
      const tools = document.createElement("div"); tools.className = "ref-ex-tools";
      const copy = document.createElement("button"); copy.textContent = "Copy";
      copy.onclick = async () => {
        try{ await navigator.clipboard.writeText(ex.quick.join("\n") + "\n"); copy.textContent = "Copied"; }
        catch(e){ copy.textContent = "Select the text manually"; }
        setTimeout(() => { copy.textContent = "Copy"; }, 1800);
      };
      const note = document.createElement("span"); note.className = "ref-help";
      note.textContent = "  paste on a " + ex.dev + " via: configure → load set terminal → commit";
      tools.append(copy, note);
      content.appendChild(tools);
      const sh = document.createElement("div"); sh.className = "ref-ex-h"; sh.textContent = "Step by step";
      content.appendChild(sh);
      for(const [snip, why] of ex.steps){
        const row = document.createElement("div"); row.className = "ref-cmdrow";
        const c = document.createElement("div"); c.className = "ref-cmd"; c.textContent = snip;
        const hl = refProse(Object.assign(document.createElement("div"), { className: "ref-help" }), why);
        row.append(c, hl);
        content.appendChild(row);
      }
      const vh = document.createElement("div"); vh.className = "ref-ex-h"; vh.textContent = "Verification";
      content.appendChild(vh);
      for(const [cmd, what] of ex.verify){
        const row = document.createElement("div"); row.className = "ref-cmdrow";
        const c = document.createElement("div"); c.className = "ref-cmd"; c.textContent = cmd;
        const hl = refProse(Object.assign(document.createElement("div"), { className: "ref-help" }), what);
        row.append(c, hl);
        content.appendChild(row);
      }
      head.onclick = () => fold.classList.toggle("open");
      fold.append(head, inner);
      pageEx.appendChild(fold);
      fold._q = (ex.title + " " + ex.overview + " " + ex.quick.join(" ") + " " +
        ex.steps.map(x => x.join(" ")).join(" ")).toLowerCase();
      exFolds.push({ fold });
    }
    const chHead = document.createElement("div"); chHead.className = "ref-h"; chHead.textContent = "Every command (generated from the grammar — it cannot drift)";
    pageFull.appendChild(chHead);
    chapter("Switch — configuration statements", SWITCH_CFG_SPECS.map(([sp, o]) => ["set " + refClean(sp), o.help || ""]));
    chapter("Switch — operational commands", OP_SPECS.switch.map(([sp, o]) => [refClean(sp), o.help || ""]));
    chapter("Router — configuration statements", ROUTER_CFG_SPECS.map(([sp, o]) => ["set " + refClean(sp), o.help || ""]));
    chapter("Router — operational commands", OP_SPECS.router.map(([sp, o]) => [refClean(sp), o.help || ""]));
    chapter("Host shell", REF_HOST_CMDS);

    // book navigation: chapter chips on top, prev/next at the bottom
    const chapBtns = [];
    REF_PAGES.forEach((pg, k) => {
      const b = document.createElement("button");
      b.className = "ref-chap-btn";
      b.textContent = pg._title;
      b.onclick = () => setRefPage(k);
      chapterBar.appendChild(b);
      chapBtns.push(b);
    });
    const pager = document.createElement("div"); pager.className = "ref-pager";
    const pgPrev = document.createElement("button"); pgPrev.textContent = "◂ previous";
    const pgLbl = document.createElement("span"); pgLbl.className = "ref-pager-lbl";
    const pgNext = document.createElement("button"); pgNext.textContent = "next ▸";
    pgPrev.onclick = () => setRefPage(refPageIdx - 1);
    pgNext.onclick = () => setRefPage(refPageIdx + 1);
    pager.append(pgPrev, pgLbl, pgNext);
    body.appendChild(pager);
    function applyRefPages(q){
      REF_PAGES.forEach((pg, k) => { pg.style.display = q || k === refPageIdx ? "" : "none"; });
      chapBtns.forEach((b, k) => b.classList.toggle("active", !q && k === refPageIdx));
      chapterBar.style.display = "";
      pager.style.display = q ? "none" : "flex";
      pgPrev.disabled = refPageIdx === 0;
      pgNext.disabled = refPageIdx >= REF_PAGES.length - 1;
      pgLbl.textContent = "page " + (refPageIdx + 1) + " of " + REF_PAGES.length + "  —  " + REF_PAGES[refPageIdx]._title;
    }
    function setRefPage(k){
      refPageIdx = Math.max(0, Math.min(k, REF_PAGES.length - 1));
      try{ localStorage.setItem("junoslab-refpage", String(refPageIdx)); }catch(e){}
      applyRefPages(filter.value.trim().toLowerCase());
      try{ box.scrollTop = 0; }catch(e){}
    }
    filter.oninput = () => {
      const q = filter.value.trim().toLowerCase();
      applyRefPages(q);
      let anyConcept = false;
      for(const card of conceptCards){
        const show = !q || card._q.includes(q);
        card.style.display = show ? "" : "none";
        if(show) anyConcept = true;
      }
      cHead.style.display = anyConcept ? "" : "none";
      grid.style.display = anyConcept ? "" : "none";
      {
        const showPr = !q || prFold._q.includes(q);
        const showCool = !q || coolFold._q.includes(q);
        prFold.style.display = showPr ? "" : "none";
        coolFold.style.display = showCool ? "" : "none";
        prHead.style.display = showPr || showCool ? "" : "none";
        prFold.classList.toggle("open", !!q && showPr);
        coolFold.classList.toggle("open", !!q && showCool);
      }
      let anyCi = false;
      for(const f of ciFolds){
        const show = !q || f.fold._q.includes(q);
        f.fold.style.display = show ? "" : "none";
        if(show) anyCi = true;
        f.fold.classList.toggle("open", !!q && show);
      }
      ciHead.style.display = anyCi ? "" : "none";
      let anyHg = false;
      for(const f of hgFolds){
        const show = !q || f.fold._q.includes(q);
        f.fold.style.display = show ? "" : "none";
        if(show) anyHg = true;
        f.fold.classList.toggle("open", !!q && show);
      }
      hgHead.style.display = anyHg ? "" : "none";
      let anyEx = false;
      for(const f of exFolds){
        const show = !q || f.fold._q.includes(q);
        f.fold.style.display = show ? "" : "none";
        if(show) anyEx = true;
        f.fold.classList.toggle("open", !!q && show);
      }
      exHead.style.display = anyEx ? "" : "none";
      let anyCh = false;
      for(const f of folds){
        let any = false;
        for(const r of f.els){
          const show = !q || r._q.includes(q);
          r.style.display = show ? "" : "none";
          if(show) any = true;
        }
        if(any) anyCh = true;
        f.fold.style.display = any ? "" : "none";
        f.fold.classList.toggle("open", !!q && any);   // searching unfolds the matching chapters
      }
      chHead.style.display = anyCh ? "" : "none";
    };
    applyRefPages("");   // open the book to the remembered page
}

/* ---------- the tablet: floating window for scenarios + reference ---------- */
/* ============================================================
   NOTES — highlight anything in the tablet, save it, pin it to the screen
   like a sticky. The reading-app habit, for a lab.
   ============================================================ */
var NOTES = [];
try{ NOTES = JSON.parse(localStorage.getItem("junoslab-notes") || "[]"); }catch(e){}
function notesSave(){ try{ localStorage.setItem("junoslab-notes", JSON.stringify(NOTES)); }catch(e){} }
function noteAdd(text, src){
  const n = { id: "n" + Date.now() + "_" + Math.floor(Math.random() * 1e4),
    text: String(text).trim().slice(0, 600), src: src || "", pinned: false, x: 96, y: 96 };
  if(!n.text) return null;
  NOTES.push(n); notesSave();
  renderNotesTab(); renderPinnedNotes();
  return n;
}
function noteDelete(id){
  NOTES = NOTES.filter(n => n.id !== id);
  notesSave(); renderNotesTab(); renderPinnedNotes();
}
function notePin(id, on){
  const n = NOTES.find(x => x.id === id);
  if(!n) return;
  n.pinned = on !== false;
  notesSave(); renderNotesTab(); renderPinnedNotes();
}
function renderNotesTab(){
  try{
    const el = document.getElementById("notes-list");
    if(!el) return;
    el.innerHTML = "";
    const intro = document.createElement("p"); intro.className = "tut-intro";
    intro.textContent = NOTES.length
      ? "Your highlights. 'Pin to screen' puts one on the canvas as a sticky you can drag around while you work."
      : "Select any text in the Reference or Learn tabs and a small 'save to notes' button appears above it. Saved highlights collect here — and can be pinned to the screen as stickies, like leaving yourself a note on the monitor.";
    el.appendChild(intro);
    for(const n of NOTES.slice().reverse()){
      const card = document.createElement("div"); card.className = "note-card";
      const tx = document.createElement("div"); tx.className = "note-text"; tx.textContent = n.text;
      const meta = document.createElement("div"); meta.className = "note-meta";
      meta.textContent = n.src ? "from " + n.src : "";
      const row = document.createElement("div"); row.className = "note-btns";
      const pin = document.createElement("button");
      pin.textContent = n.pinned ? "unpin from screen" : "pin to screen";
      pin.onclick = () => notePin(n.id, !n.pinned);
      const del = document.createElement("button"); del.className = "pv-danger";
      del.textContent = "delete";
      del.onclick = () => noteDelete(n.id);
      row.append(pin, del);
      card.append(tx, meta, row);
      el.appendChild(card);
    }
  }catch(e){}
}
function renderPinnedNotes(){
  try{
    const wrap = document.getElementById("canvas-wrap");
    if(!wrap) return;
    for(const old of wrap.querySelectorAll(".sticky")) old.remove();
    for(const n of NOTES){
      if(!n.pinned) continue;
      const s = document.createElement("div"); s.className = "sticky";
      s.style.left = (n.x || 96) + "px"; s.style.top = (n.y || 96) + "px";
      const x = document.createElement("button"); x.className = "sticky-x"; x.textContent = "✕";
      x.title = "Unpin (the note stays in the Notes tab)";
      x.onclick = () => notePin(n.id, false);
      const tx = document.createElement("div"); tx.className = "sticky-text"; tx.textContent = n.text;
      s.append(x, tx);
      let drag = null;
      s.addEventListener("pointerdown", (e) => {
        if(e.target === x) return;
        drag = { dx: e.clientX - (n.x || 0), dy: e.clientY - (n.y || 0) };
        try{ s.setPointerCapture(e.pointerId); }catch(err){}
        e.stopPropagation();
      });
      s.addEventListener("pointermove", (e) => {
        if(!drag) return;
        n.x = Math.max(0, e.clientX - drag.dx);
        n.y = Math.max(0, e.clientY - drag.dy);
        s.style.left = n.x + "px"; s.style.top = n.y + "px";
      });
      s.addEventListener("pointerup", () => { if(drag){ drag = null; notesSave(); } });
      wrap.appendChild(s);
    }
  }catch(e){}
}
/* the save-selection chip */
var noteChip = null;
function noteChipEl(){
  if(noteChip) return noteChip;
  noteChip = document.createElement("button");
  noteChip.id = "note-chip";
  noteChip.textContent = "save to notes";
  noteChip.style.display = "none";
  noteChip.onclick = () => {
    if(noteChip._text){
      const srcName = { learn: "Learn", scen: "Scenarios", ref: "Reference", juno: "JUNO", notes: "Notes" }[tabletTab] || "the tablet";
      noteAdd(noteChip._text, srcName);
      noteChip.textContent = "saved ✓";
      setTimeout(() => { noteChip.style.display = "none"; noteChip.textContent = "save to notes"; }, 700);
    }
  };
  document.body.appendChild(noteChip);
  return noteChip;
}
function noteCheckSelection(){
  try{
    if(typeof window === "undefined" || !window.getSelection) return;
    const sel = window.getSelection();
    const chip = noteChipEl();
    const txt = sel && !sel.isCollapsed ? String(sel.toString()).trim() : "";
    if(!txt){ if(chip.textContent === "save to notes") chip.style.display = "none"; return; }
    const anchor = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
    if(!anchor || !tabletEl.contains(anchor)){ chip.style.display = "none"; return; }
    const r = sel.getRangeAt(0).getBoundingClientRect();
    chip._text = txt;
    chip.style.left = Math.max(4, Math.min(r.left + r.width / 2 - 46, (window.innerWidth || 1200) - 110)) + "px";
    chip.style.top = Math.max(4, r.top - 32) + "px";
    chip.style.display = "block";
  }catch(e){}
}
try{
  if(typeof document.addEventListener === "function")
    document.addEventListener("pointerup", () => setTimeout(noteCheckSelection, 10));
}catch(e){}

const tabletEl = document.getElementById("tablet");
let tabletTab = "scen";
let refBuilt = false;
function setTabletTab(tab){
  tabletTab = tab;
  for(const t of ["learn", "scen", "ref", "juno", "notes"]){
    const pane = document.getElementById("tab-" + t);
    if(pane) pane.style.display = tab === t ? "" : "none";
    const btn = document.getElementById("tablet-tab-" + t);
    if(btn) btn.classList.toggle("active", tab === t);
  }
  if(tab === "juno" && typeof junoInitTab === "function") junoInitTab();
  if(tab === "learn" && typeof tutRender === "function") tutRender();
  if(tab === "notes") renderNotesTab();
  if(tab === "ref" && !refBuilt){
    buildReferenceInto(document.getElementById("tab-ref"));
    refBuilt = true;
  }
  if(tab === "scen" && typeof renderScenarioMeta === "function") renderScenarioMeta();
  saveTabletState();
}
function openTablet(tab){
  if(tab) setTabletTab(tab);
  tabletEl.classList.add("open");
  saveTabletState();
}
function closeTablet(){ tabletEl.classList.remove("open"); saveTabletState(); }
function toggleTablet(tab){
  if(tabletEl.classList.contains("open") && tabletTab === tab) closeTablet();
  else openTablet(tab);
}
function saveTabletState(){
  try{
    localStorage.setItem("junoslab-tablet", JSON.stringify({
      open: tabletEl.classList.contains("open"), tab: tabletTab,
      left: tabletEl.style.left || null, top: tabletEl.style.top || null,
      w: tabletEl.style.width || null, h: tabletEl.style.height || null,
    }));
  }catch(e){}
}
{ const b = document.getElementById("tablet-tab-learn"); if(b) b.onclick = () => setTabletTab("learn"); }
{ const b = document.getElementById("tablet-tab-notes"); if(b) b.onclick = () => setTabletTab("notes"); }
try{ renderPinnedNotes(); }catch(e){}
document.getElementById("tablet-tab-scen").onclick = () => setTabletTab("scen");
document.getElementById("tablet-tab-ref").onclick = () => setTabletTab("ref");
document.getElementById("tablet-tab-juno").onclick = () => setTabletTab("juno");
document.getElementById("tablet-close").onclick = closeTablet;
document.getElementById("ref-btn").onclick = () => toggleTablet("ref");
(function(){
  // drag by the head; buttons inside still click
  const head = document.getElementById("tablet-head");
  let drag = null;
  head.addEventListener("pointerdown", (e) => {
    if(e.target && e.target.tagName === "BUTTON") return;
    const r = tabletEl.getBoundingClientRect();
    tabletEl.style.left = r.left + "px";
    tabletEl.style.top = r.top + "px";
    tabletEl.style.right = "auto";
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    e.preventDefault();
  });
  document.addEventListener("pointermove", (e) => {
    if(!drag) return;
    tabletEl.style.left = Math.max(0, Math.min((window.innerWidth || 1200) - 140, e.clientX - drag.dx)) + "px";
    tabletEl.style.top = Math.max(0, Math.min((window.innerHeight || 800) - 60, e.clientY - drag.dy)) + "px";
  });
  document.addEventListener("pointerup", () => { if(drag){ drag = null; saveTabletState(); } });
  // restore last position / size / tab / open state
  try{
    const st = JSON.parse(localStorage.getItem("junoslab-tablet") || "null");
    if(st){
      if(st.left){ tabletEl.style.left = st.left; tabletEl.style.right = "auto"; }
      if(st.top) tabletEl.style.top = st.top;
      if(st.w) tabletEl.style.width = st.w;
      if(st.h) tabletEl.style.height = st.h;
      if(st.tab) tabletTab = st.tab;
      if(st.open) openTablet(tabletTab);
    }
  }catch(e){}
})();

/* ============================================================
   TERMINAL FEEL — color profiles, bell, pop-out window
   ============================================================ */
const TERM_PROFILES = ["match", "mac-basic", "mac-pro", "mac-homebrew", "solarized-dark", "win-cmd", "win-ps", "win-campbell"];
function applyTermProfile(p){
  if(!TERM_PROFILES.includes(p)) p = "match";
  for(const t of TERM_PROFILES) if(t !== "match") cliEl.classList.remove("term-" + t);
  if(p !== "match") cliEl.classList.add("term-" + p);
  const sel = document.getElementById("term-profile");
  if(sel) sel.value = p;
  try{ localStorage.setItem("junoslab-termprofile", p); }catch(e){}
}
document.getElementById("term-profile").onchange = (e) => applyTermProfile(e.target.value);
(function(){
  let p = "match";
  try{ p = localStorage.getItem("junoslab-termprofile") || "match"; }catch(e){}
  applyTermProfile(p);
})();

let bellOn = true;
try{ bellOn = localStorage.getItem("junoslab-bell") !== "off"; }catch(e){}
let audioCtx = null;
function termBell(){
  if(!bellOn) return;
  try{
    const AC = (typeof window !== "undefined") && (window.AudioContext || window.webkitAudioContext);
    if(!AC) return;
    audioCtx = audioCtx || new AC();
    const o = audioCtx.createOscillator(), gn = audioCtx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    gn.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
    o.connect(gn); gn.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + 0.13);
  }catch(e){}
}
/* a small mechanical click — gear seating in rack rails, an RJ45 latch.
   Shares the terminal bell's AudioContext and its on/off toggle. */
function clickSound(){
  if(!bellOn) return;
  try{
    const AC = (typeof window !== "undefined") && (window.AudioContext || window.webkitAudioContext);
    if(!AC) return;
    audioCtx = audioCtx || new AC();
    const t0 = audioCtx.currentTime;
    // a short noise burst through a bandpass = the latch itself
    const n = Math.round(audioCtx.sampleRate * 0.05);
    const buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
    const ch = buf.getChannelData(0);
    for(let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const bp = audioCtx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 2600; bp.Q.value = 1.2;
    const gn = audioCtx.createGain();
    gn.gain.setValueAtTime(0.14, t0);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
    src.connect(bp); bp.connect(gn); gn.connect(audioCtx.destination);
    src.start(t0);
    // and a tiny low thud underneath — steel meeting steel
    const o = audioCtx.createOscillator(), g2 = audioCtx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(190, t0);
    o.frequency.exponentialRampToValueAtTime(120, t0 + 0.06);
    g2.gain.setValueAtTime(0.08, t0);
    g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
    o.connect(g2); g2.connect(audioCtx.destination);
    o.start(t0); o.stop(t0 + 0.09);
  }catch(e){}
}
function setBell(on){
  bellOn = on;
  try{ localStorage.setItem("junoslab-bell", on ? "on" : "off"); }catch(e){}
  const b = document.getElementById("bell-btn");
  if(b){ b.textContent = "bell " + (on ? "on" : "off"); b.classList.toggle("active", on); }
}
document.getElementById("bell-btn").onclick = () => setBell(!bellOn);
setBell(bellOn);

let cliFloating = false;
const cliHead = document.getElementById("cli-head");
function applyCliFloat(){
  cliEl.classList.toggle("floating", cliFloating);
  const b = document.getElementById("popout-btn");
  if(b) b.textContent = cliFloating ? "dock" : "pop out";
}
function saveTermWin(){
  try{
    localStorage.setItem("junoslab-termwin", JSON.stringify({
      float: cliFloating, left: cliEl.style.left || null, top: cliEl.style.top || null,
      w: cliEl.style.width || null, h: cliEl.style.height || null }));
  }catch(e){}
}
document.getElementById("popout-btn").onclick = () => {
  cliFloating = !cliFloating;
  if(!cliFloating){
    cliEl.style.left = ""; cliEl.style.top = "";
    cliEl.style.width = ""; cliEl.style.height = "";
  }
  applyCliFloat();
  saveTermWin();
};
(function(){
  let termDrag = null;
  cliHead.addEventListener("pointerdown", (e) => {
    if(!cliFloating) return;
    const t = e.target;
    if(t && (t.tagName === "BUTTON" || t.tagName === "SELECT" || t.tagName === "OPTION")) return;
    if(t && t.className && String(t.className).includes("cli-tab")) return;
    const r = cliEl.getBoundingClientRect();
    cliEl.style.left = r.left + "px";
    cliEl.style.top = r.top + "px";
    cliEl.style.right = "auto";
    cliEl.style.bottom = "auto";
    termDrag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    e.preventDefault();
  });
  document.addEventListener("pointermove", (e) => {
    if(!termDrag) return;
    cliEl.style.left = Math.max(0, Math.min((window.innerWidth || 1200) - 160, e.clientX - termDrag.dx)) + "px";
    cliEl.style.top = Math.max(0, Math.min((window.innerHeight || 800) - 80, e.clientY - termDrag.dy)) + "px";
  });
  document.addEventListener("pointerup", () => { if(termDrag){ termDrag = null; saveTermWin(); } });
  try{
    const st = JSON.parse(localStorage.getItem("junoslab-termwin") || "null");
    if(st){
      cliFloating = !!st.float;
      if(st.left){ cliEl.style.left = st.left; cliEl.style.right = "auto"; cliEl.style.bottom = "auto"; }
      if(st.top) cliEl.style.top = st.top;
      if(st.w) cliEl.style.width = st.w;
      if(st.h) cliEl.style.height = st.h;
      applyCliFloat();
    }
  }catch(e){}
})();

/* ============================================================
   TOOLBAR MENUS — grouped dropdowns over the (hidden) action buttons
   ============================================================ */
const TB_MENUS = [];
function closeToolbarMenus(){ for(const m of TB_MENUS) m.style.display = "none"; }
function updateGroupBtns(){
  const anyView =
    (typeof vlanView !== "undefined" && vlanView) ||
    (typeof ipLabels !== "undefined" && ipLabels) ||
    (typeof lensOn !== "undefined" && lensOn) ||
    (typeof impactOn !== "undefined" && impactOn);
  const vb = document.getElementById("view-btn");
  if(vb) vb.classList.toggle("active", !!anyView);
}
function wireToolbarMenu(btnId, menuId, items){
  const btn = document.getElementById(btnId), menu = document.getElementById(menuId);
  if(!btn || !menu) return;
  const build = () => {
    menu.innerHTML = "";
    for(const it of items){
      if(it.header){
        const hd = document.createElement("div");
        hd.className = "cm-head";
        hd.textContent = it.header;
        menu.appendChild(hd);
        continue;
      }
      const row = document.createElement("div");
      row.className = "cm-row";
      const b = document.createElement("b");
      const on = it.checked ? !!it.checked() : null;
      b.textContent = (on === null ? "" : on ? "✓ " : "\u2003") + it.label;
      const sm = document.createElement("small");
      sm.textContent = it.desc || "";
      row.append(b, sm);
      row.onclick = (e) => {
        e.stopPropagation();
        if(it.target){
          const t = document.getElementById(it.target);
          if(t && typeof t.onclick === "function") t.onclick();
        } else if(it.action) it.action();
        if(it.checked){ build(); updateGroupBtns(); }
        else closeToolbarMenus();
      };
      menu.appendChild(row);
    }
  };
  btn.onclick = (e) => {
    e.stopPropagation();
    const wasOpen = menu.style.display === "block";
    closeToolbarMenus();
    if(typeof hideCableMenu === "function") hideCableMenu();
    if(!wasOpen){ build(); menu.style.display = "block"; }
  };
  TB_MENUS.push(menu);
}
wireToolbarMenu("add-btn", "add-menu", [
  { header: "Networking — Juniper / Ubiquiti" },
  { target: "add-switch", label: "Switch", desc: "EX-series or UniFi — real SKUs with real port counts" },
  { target: "add-router", label: "Router / gateway", desc: "MX, SRX, or UniFi gateways" },
  { header: "Wi-Fi" },
  { target: "add-ap", label: "Access point", desc: "Mist or UniFi — hosts join its SSID inside the coverage circle" },
  { header: "Endpoints & internet" },
  { target: "add-host", label: "Host", desc: "An endpoint PC with a Linux shell" },
  { target: "add-server", label: "Server", desc: "Rack-mount box with a power button; runs services — DNS records, a web page (curl it)" },
  { target: "add-isp", label: "ISP / Internet", desc: "The outside world, handed to you on a /30" },
  { header: "Power & cooling" },
  { target: "add-ups", label: "UPS", desc: "Battery for outages; size it to the building load, drill with the grid button" },
  { target: "add-crac", label: "Cooling unit", desc: "AC / CRAC / CRAH — buildings heat up without one" },
  { header: "Layout" },
  { target: "add-zone", label: "Building", desc: "A room with walls, air, and a temperature — devices and racks live inside" },
  { target: "add-rack", label: "Rack", desc: "A steel frame; dropped gear clicks into the rails, in-rack cabling prices as DACs" },
  { target: "add-tray", label: "Cable tray", desc: "Ceiling basket, wall trunking or underfloor duct — cables auto-route along it, bundled and measured" },
  { target: "add-desk", label: "Desk", desc: "PCs snap into a row; the desk names its cable runs like a real outlet" },
]);
wireToolbarMenu("view-btn", "view-menu", [
  { target: "vlan-btn", label: "VLAN colors", desc: "Color links and ports by VLAN, with a legend", checked: () => typeof vlanView !== "undefined" && vlanView },
  { target: "label-btn", label: "IP labels", desc: "Addresses and gateways drawn on the canvas", checked: () => typeof ipLabels !== "undefined" && ipLabels },
  { target: "lens-btn", label: "Lens", desc: "A magnifying glass follows your pointer", checked: () => typeof lensOn !== "undefined" && lensOn },
  { target: "impact-btn", label: "Impact heatmap", desc: "Colors every cable by what breaks if it dies", checked: () => typeof impactOn !== "undefined" && impactOn },
]);
wireToolbarMenu("plan-btn", "plan-menu", [
  { target: "validate-btn", label: "Validate design", desc: "Design rule check — findings highlighted on the canvas" },
  { target: "matrix-btn", label: "Reachability matrix", desc: "Every host x every host, live; click a cell to run the ping" },
  { target: "packet-btn", label: "Build packet", desc: "BOM with Belgian prices, cabling schedule, IP plan, configs" },
  { target: "export-configs", label: "Export configs", desc: "Just the per-device configurations, as a text file" },
  { action: () => typeof exportDiagramSvg === "function" && exportDiagramSvg(), label: "Export diagram (SVG)", desc: "The canvas as a standalone vector file" },
  { action: () => typeof exportDiagramPng === "function" && exportDiagramPng(), label: "Export diagram (PNG)", desc: "A bitmap snapshot for pasting into documents" },
]);
/* ---------- named lab slots: several labs side by side, in the browser ---------- */
function slotAll(){
  try{ return JSON.parse(localStorage.getItem("junoslab-slots") || "{}") || {}; }catch(e){ return {}; }
}
function slotWrite(all){ try{ localStorage.setItem("junoslab-slots", JSON.stringify(all)); }catch(e){} }
function slotSave(name){
  const n = String(name || "").trim().slice(0, 40);
  if(!n) return false;
  const all = slotAll();
  all[n] = { data: serializeLab(), ts: Date.now(),
    devices: Object.keys(devices).length };
  slotWrite(all);
  return true;
}
function slotLoad(name){
  const all = slotAll();
  if(!all[name]) return false;
  loadLab(all[name].data);
  return true;
}
function slotDelete(name){
  const all = slotAll();
  if(!(name in all)) return false;
  delete all[name];
  slotWrite(all);
  return true;
}
function showSlotsModal(){
  showModal((box, done) => {
    const h = document.createElement("h3"); h.textContent = "Lab slots"; box.appendChild(h);
    const p = document.createElement("p"); p.className = "ref-help";
    p.textContent = "Several labs, side by side, kept in this browser — design A, design B, the practice mess. Loading replaces the canvas (undo can bring it back).";
    box.appendChild(p);
    const list = document.createElement("div");
    const rebuild = () => {
      list.innerHTML = "";
      const all = slotAll();
      const names = Object.keys(all).sort();
      if(!names.length){
        const em = document.createElement("p"); em.className = "ref-help";
        em.textContent = "(no slots yet)";
        list.appendChild(em);
      }
      for(const n of names){
        const row = document.createElement("div"); row.className = "slot-row";
        const lbl = document.createElement("span"); lbl.className = "slot-name";
        lbl.textContent = n;
        const meta = document.createElement("span"); meta.className = "slot-meta";
        meta.textContent = all[n].devices + " devices · " + new Date(all[n].ts).toLocaleDateString();
        const ld = document.createElement("button"); ld.textContent = "load";
        ld.onclick = () => { pushUndo(); slotLoad(n); done(null); };
        const ow = document.createElement("button"); ow.textContent = "overwrite";
        ow.onclick = () => { slotSave(n); rebuild(); };
        const del = document.createElement("button"); del.className = "pv-danger"; del.textContent = "delete";
        del.onclick = () => { slotDelete(n); rebuild(); };
        row.append(lbl, meta, ld, ow, del);
        list.appendChild(row);
      }
    };
    rebuild();
    box.appendChild(list);
    const saveRow = document.createElement("div"); saveRow.className = "slot-saverow";
    const inp = document.createElement("input");
    inp.placeholder = "name this lab (e.g. HQ design B)";
    const sv = document.createElement("button"); sv.textContent = "save current lab as new slot";
    sv.onclick = () => { if(slotSave(inp.value)){ inp.value = ""; rebuild(); } };
    saveRow.append(inp, sv);
    box.appendChild(saveRow);
    const cl = document.createElement("button"); cl.textContent = "close";
    cl.onclick = () => done(null);
    box.appendChild(cl);
  });
}
wireToolbarMenu("lab-btn", "lab-menu", [
  { action: () => showSlotsModal(), label: "Lab slots", desc: "Several labs side by side in this browser — save, load, compare designs" },
  { target: "save", label: "Save lab to file", desc: "Download the whole lab as JSON" },
  { target: "load", label: "Load lab from file", desc: "Restore a saved lab (v1 saves migrate automatically)" },
  { action: () => typeof takeSnapshot === "function" && takeSnapshot(), label: "Snapshot this design", desc: "Keep up to 10 named versions in the browser" },
  { action: () => typeof compareSnapshots === "function" && compareSnapshots(), label: "Compare snapshots", desc: "Plan A vs plan B — or either vs the current canvas" },
  { target: "clear", label: "Clear lab", desc: "Wipe the canvas — undo can bring it back" },
]);
document.addEventListener("click", (e) => {
  let inWrap = false;
  for(const m of TB_MENUS){
    const wrap = m.parentNode;
    if(wrap && wrap.contains && wrap.contains(e.target)) inWrap = true;
  }
  if(!inWrap) closeToolbarMenus();
}, true);
updateGroupBtns();

/* central "something changed" hook */
function touchState(){
  if(typeof tutTick === "function") tutTick();
  if(typeof renderTimeline === "function") renderTimeline();
  scheduleAutosave();
  if(typeof evalChecks === "function") evalChecks();
  if(typeof onStateTouched === "function") onStateTouched();
  render();
}
