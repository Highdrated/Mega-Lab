/* ============================================================
   DERIVED STATE — what the committed config means
   ============================================================ */
function isLinked(devId, portId){
  return Object.values(links).some(l =>
    (l.a.dev === devId && l.a.port === portId) || (l.b.dev === devId && l.b.port === portId));
}
function linksOf(devId, portId){
  return Object.entries(links).filter(([id, l]) =>
    (l.a.dev === devId && l.a.port === portId) || (l.b.dev === devId && l.b.port === portId));
}

function deriveDev(dev){
  const c = dev.config;
  const d = {
    hostname: hostnameOf(dev),
    portCfg: {}, aes: {}, irbs: {}, irbByVlan: {}, l3ports: {},
    routes: [], vlans: {}, rstp: false, filters: {}, stormProfiles: {},
  };
  // vlans (implicit factory "default" = 1)
  const vcfg = cfgGet(c, ["vlans"]) || {};
  for(const [name, v] of Object.entries(vcfg)){
    const id = v && v["vlan-id"] !== undefined ? +v["vlan-id"] : (name === "default" ? 1 : NaN);
    d.vlans[name] = { id, l3: (v && v["l3-interface"]) || null };
  }
  if(!d.vlans.default) d.vlans.default = { id: 1, l3: null };
  const vlanIdOf = name => d.vlans[name] ? d.vlans[name].id : NaN;
  const allVlanIds = () => Object.values(d.vlans).map(v => v.id).filter(n => !isNaN(n));

  d.rstp = !!cfgGet(c, ["protocols", "rstp"]);

  // storm-control profiles
  const scp = cfgGet(c, ["forwarding-options", "storm-control-profiles"]) || {};
  for(const [name, p] of Object.entries(scp))
    d.stormProfiles[name] = { shutdown: !!(p && p.all && typeof p.all === "object" && p.all["action-shutdown"]) };

  // firewall filters
  const fset = cfgGet(c, ["firewall", "family", "inet", "filter"]) || {};
  for(const [fname, f] of Object.entries(fset)){
    const terms = [];
    for(const [tname, t] of Object.entries((f && f.term) || {})){
      terms.push({
        name: tname,
        src: (cfgGet(t, ["from", "source-address"]) || []).map(parsePrefix).filter(Boolean),
        dst: (cfgGet(t, ["from", "destination-address"]) || []).map(parsePrefix).filter(Boolean),
        proto: cfgGet(t, ["from", "protocol"]) || [],
        then: (t && typeof t.then === "string") ? t.then : "accept",
      });
    }
    d.filters[fname] = terms;
  }

  const ifs = cfgGet(c, ["interfaces"]) || {};
  const esOf = ic => cfgGet(ic, ["unit", "0", "family", "ethernet-switching"]);
  const esInfo = (ic) => {
    const es = esOf(ic);
    const has = es !== undefined;
    const eso = (es && typeof es === "object") ? es : {};
    const mode = eso["interface-mode"] === "trunk" ? "trunk" : "access";
    let names = cfgGet(eso, ["vlan", "members"]) || [];
    if(names.includes("all")) names = Object.keys(d.vlans);
    if(!names.length && mode === "access") names = ["default"];
    const vlanIds = names.includes("all") ? allVlanIds() : names.map(vlanIdOf).filter(n => !isNaN(n));
    return { has, mode, vlanNames: names, vlanIds,
             storm: typeof eso["storm-control"] === "string" ? eso["storm-control"] : null };
  };

  if(dev.type === "switch"){
    // interface-range: a member port without its own switching config
    // inherits the range's (own config wins, like the real box)
    const rangeByPort = {};
    for(const rc of Object.values(ifs["interface-range"] || {}))
      for(const m of (cfgGet(rc, ["member"]) || [])) rangeByPort[m] = rc;
    for(const p of dev.ports){
      const ic = ifs[p.id] || {};
      const ownEs = cfgGet(ic, ["unit", "0", "family", "ethernet-switching"]) !== undefined;
      const es = esInfo(ownEs || !rangeByPort[p.id] ? ic : rangeByPort[p.id]);
      d.portCfg[p.id] = {
        disabled: !!ic.disable, desc: ic.description || null,
        ae: (cfgGet(ic, ["ether-options", "802.3ad"])) || null,
        mode: es.mode, vlanNames: es.vlanNames, vlanIds: es.vlanIds, storm: es.storm,
        esEnabled: true,   // an unconfigured switch port is factory-default access on vlan "default"
      };
    }
    for(const [name, ic] of Object.entries(ifs)){
      if(!/^ae\d+$/.test(name)) continue;
      const es = esInfo(ic);
      const lacpCfg = cfgGet(ic, ["aggregated-ether-options", "lacp"]);
      d.aes[name] = {
        disabled: !!ic.disable, mode: es.mode,
        vlanNames: es.vlanNames, vlanIds: es.vlanIds, storm: es.storm,
        lacp: typeof lacpCfg === "string" ? lacpCfg : null,
        members: dev.ports.filter(p => d.portCfg[p.id] && d.portCfg[p.id].ae === name).map(p => p.id),
      };
    }
    const irbUnits = cfgGet(ifs, ["irb", "unit"]) || {};
    for(const [u, uc] of Object.entries(irbUnits)){
      const addr = (cfgGet(uc, ["family", "inet", "address"]) || []).map(parsePrefix).filter(Boolean)[0];
      if(!addr) continue;
      // which vlan claims irb.<u> as its l3-interface?
      const owner = Object.entries(d.vlans).find(([, v]) => v.l3 === "irb." + u);
      d.irbs[u] = {
        ip: addr.ip, bits: addr.bits,
        vlanName: owner ? owner[0] : null,
        vlanId: owner ? d.vlans[owner[0]].id : NaN,
        fIn: cfgGet(uc, ["family", "inet", "filter", "input"]) || null,
        fOut: cfgGet(uc, ["family", "inet", "filter", "output"]) || null,
      };
      const vg = Object.entries(cfgGet(uc, ["family", "inet", "vrrp-group"]) || {})[0];
      if(vg && vg[1] && vg[1]["virtual-address"])
        d.irbs[u].vrrp = { group: vg[0], vip: vg[1]["virtual-address"],
          prio: parseInt(String(vg[1].priority || "100"), 10) || 100 };
      if(owner) d.irbByVlan[d.vlans[owner[0]].id] = u;
    }
  }

  if(dev.type === "router"){
    for(const p of dev.ports){
      const ic = ifs[p.id] || {};
      d.portCfg[p.id] = { disabled: !!ic.disable, desc: ic.description || null, ae: null };
      const addr = (cfgGet(ic, ["unit", "0", "family", "inet", "address"]) || []).map(parsePrefix).filter(Boolean)[0];
      if(addr) d.l3ports[p.id] = {
        ip: addr.ip, bits: addr.bits,
        fIn: cfgGet(ic, ["unit", "0", "family", "inet", "filter", "input"]) || null,
        fOut: cfgGet(ic, ["unit", "0", "family", "inet", "filter", "output"]) || null,
      };
    }
  }

  const me0a = (cfgGet(ifs, ["me0", "unit", "0", "family", "inet", "address"]) || []).map(parsePrefix).filter(Boolean)[0];
  d.me0 = me0a || null;

  const routes = cfgGet(c, ["routing-options", "static", "route"]) || {};
  for(const [pfx, r] of Object.entries(routes)){
    const p = parsePrefix(pfx);
    const nh = r && r["next-hop"];
    if(p && validIp(nh || "")) d.routes.push({ net: p.ip, bits: p.bits, nh });
  }

  // BGP (eBGP to the provider): local AS + external groups
  d.as = parseInt(String(cfgGet(c, ["routing-options", "autonomous-system"]) || ""), 10) || null;
  d.bgpGroups = [];
  for(const [gname, gCfg] of Object.entries(cfgGet(c, ["protocols", "bgp", "group"]) || {})){
    const nb = (gCfg && gCfg.neighbor) || {};
    d.bgpGroups.push({ name: gname, type: (gCfg && gCfg.type) || null,
      peerAs: parseInt(String((gCfg && gCfg["peer-as"]) || ""), 10) || null,
      neighbors: Array.isArray(nb) ? nb : Object.keys(nb) });
  }

  // OSPF interfaces (any area; this lab treats them as one domain)
  d.ospf = {};
  for(const aCfg of Object.values(cfgGet(c, ["protocols", "ospf", "area"]) || {}))
    for(const [ifn, iCfg] of Object.entries((aCfg && aCfg.interface) || {}))
      d.ospf[ifn] = { passive: !!(iCfg && typeof iCfg === "object" && iCfg.passive) };
  d.ospfRoutes = []; d.ospfNeighbors = [];

  // DHCP server bindings + pools
  d.dhcpIfs = new Set();
  for(const g of Object.values(cfgGet(c, ["system", "services", "dhcp-local-server", "group"]) || {}))
    for(const ifn of Object.keys((g && g.interface) || {})) d.dhcpIfs.add(ifn);
  d.pools = [];
  for(const [pname, p] of Object.entries(cfgGet(c, ["access", "address-assignment", "pool"]) || {})){
    const inet = cfgGet(p, ["family", "inet"]) || {};
    const net = parsePrefix(inet.network || "");
    const ranges = Object.values(inet.range || {})
      .map(r => ({ low: r && r.low, high: r && r.high }))
      .filter(r => validIp(r.low || "") && validIp(r.high || ""));
    const router = cfgGet(inet, ["dhcp-attributes", "router"]);
    const reservations = Object.entries(inet.host || {})
      .map(([hn, hc]) => ({ name: hn, mac: String((hc && hc["hardware-address"]) || "").toLowerCase(),
        ip: hc && hc["ip-address"] }))
      .filter(h2 => h2.mac && validIp(h2.ip || ""));
    if(net) d.pools.push({ name: pname, net, ranges, reservations,
      router: validIp(router || "") ? router : null });
  }

  // per-port MAC limits (port security)
  d.macLimit = {};
  for(const [ifn, sCfg] of Object.entries(cfgGet(c, ["switch-options", "interface"]) || {})){
    const lim = parseInt(sCfg && sCfg["interface-mac-limit"], 10);
    if(!isNaN(lim)) d.macLimit[ifn] = { limit: lim, shutdown: (sCfg["packet-action"] === "shutdown") };
  }

  // source NAT rules (routers)
  d.natRules = [];
  for(const [rsName, r] of Object.entries(cfgGet(c, ["security", "nat", "source", "rule-set"]) || {})){
    const fromIf = cfgGet(r, ["from", "interface"]) || null;
    const toIf = cfgGet(r, ["to", "interface"]) || null;
    for(const [rn, rr] of Object.entries((r && r.rule) || {})){
      if(cfgGet(rr, ["then", "source-nat"]) !== "interface") continue;
      d.natRules.push({ set: rsName, rule: rn, fromIf, toIf,
        match: (cfgGet(rr, ["match", "source-address"]) || []).map(parsePrefix).filter(Boolean) });
    }
  }
  return d;
}
function D(dev){ if(!dev.d) rebuildAllDerived(); return dev.d; }

/* ============================================================
   NETWORK-WIDE COMPUTATION: effective edges, LACP, RSTP, storms
   ============================================================ */
let NET = null;
var LAST_JOURNEY = null;   // the most recent ping, hop by hop, for the inspector

/* ---------- VRRP: one virtual gateway address, owned by whichever
   switch is alive and highest-priority right now ---------- */
var VRRP = { byVip: {} };
function computeVrrp(){
  const fresh = { byVip: {} };
  for(const dev of Object.values(devices)){
    if(dev.type !== "switch" || !dev.d) continue;
    for(const [u, irb] of Object.entries(dev.d.irbs || {})){
      if(!irb.vrrp || !irb.vrrp.vip) continue;
      const iface = ifacesOf(dev).find(i => i.name === "irb." + u);
      const up = !!(iface && iface.up) && dev.powered !== false && !dev.failed;
      (fresh.byVip[irb.vrrp.vip] = fresh.byVip[irb.vrrp.vip] || { master: null, all: [] })
        .all.push({ devId: dev.id, unit: u, prio: irb.vrrp.prio, up, group: irb.vrrp.group });
    }
  }
  for(const entry of Object.values(fresh.byVip)){
    const alive = entry.all.filter(x => x.up)
      .sort((a, b) => b.prio - a.prio || String(a.devId).localeCompare(String(b.devId)));
    entry.master = alive.length ? alive[0].devId : null;
  }
  VRRP = fresh;
}
function showVrrpCmd(dev){
  const rows = [];
  for(const [u, irb] of Object.entries((dev.d && dev.d.irbs) || {})){
    if(!irb.vrrp) continue;
    const entry = VRRP.byVip[irb.vrrp.vip];
    const me = entry && entry.all.find(x => x.devId === dev.id && x.unit === u);
    const state = !me || !me.up ? "init" : entry.master === dev.id ? "master" : "backup";
    rows.push("irb." + u + "      " + String(irb.vrrp.group).padEnd(7) + state.padEnd(9) +
      String(irb.vrrp.prio).padEnd(10) + irb.vrrp.vip +
      (state === "backup" && entry.master ? "   (master: " + (devices[entry.master] || {}).name + ")" : ""));
  }
  if(!rows.length) return "VRRP is not configured on this box\n(set interfaces irb unit <u> family inet vrrp-group <g> virtual-address <ip>)";
  return "Interface   Group  State    Priority  Virtual-IP\n" + rows.join("\n");
}
function physPortActive(dev, portId){
  if(dev.failed) return false;                 // what-if failure simulation
  if(dev.type === "host" || dev.type === "isp") return true;
  if(dev.type === "ap") return !POE.denied[dev.id];   // no PoE = no AP
  if(dev.powered === false) return false;
  if(dev.type === "server") return true;
  const pc = D(dev).portCfg[portId];
  if(!pc) return false;
  if(pc.disabled) return false;
  if(dev.errDisabled[portId]) return false;
  return true;
}
function effPortOf(dev, portId){
  if(dev.type === "switch"){
    const pc = D(dev).portCfg[portId];
    if(pc && pc.ae && D(dev).aes[pc.ae]) return pc.ae;
  }
  return portId;
}
function effPortInfo(dev, effPort){   // switch only: {mode, vlanIds, vlanNames, storm}
  const d = D(dev);
  if(d.aes[effPort]) return d.aes[effPort];
  return d.portCfg[effPort];
}

function computeNet(){
  NET = { edgeByPort: {}, linkStatus: {}, blocked: new Set(), stormLinks: new Set(),
          suppressedLinks: new Set(), aeInfo: {}, stpRoot: {}, stpBlockedEdges: [] };

  // ---- collect effective edges ----
  const edges = {};   // key devA:portA|devB:portB (sorted) -> {a:{dev,port}, b:{dev,port}, linkIds, memberLinks}
  for(const [lid, l] of Object.entries(links)){
    const kind = l.kind || "lan";
    const devA = devices[l.a.dev], devB = devices[l.b.dev];
    if(!devA || !devB) continue;
    if(l.failed){ NET.linkStatus[lid] = "down"; continue; }   // what-if failure simulation
    if(kind === "console"){ NET.linkStatus[lid] = "console"; continue; }
    if(l.a.port === "me0" || l.a.port === "con" || l.b.port === "me0" || l.b.port === "con"){
      // dedicated management/console ports live on their own plane — never in the data graph
      const on = devA.powered !== false && devB.powered !== false;
      NET.linkStatus[lid] = on ? "oob" : "down";
      continue;
    }
    const activeA = physPortActive(devA, l.a.port), activeB = physPortActive(devB, l.b.port);
    if(!activeA || !activeB){ NET.linkStatus[lid] = "down"; continue; }
    const ea = { dev: devA.id, port: effPortOf(devA, l.a.port) };
    const eb = { dev: devB.id, port: effPortOf(devB, l.b.port) };
    const aIsAe = ea.port !== l.a.port, bIsAe = eb.port !== l.b.port;
    if(aIsAe !== bIsAe){ NET.linkStatus[lid] = "lacp-fail"; continue; }
    if(aIsAe && bIsAe){
      const aeA = D(devA).aes[ea.port], aeB = D(devB).aes[eb.port];
      if(!aeA.lacp || !aeB.lacp || aeA.disabled || aeB.disabled){ NET.linkStatus[lid] = "lacp-fail"; continue; }
    }
    const key = [ea.dev + ":" + ea.port, eb.dev + ":" + eb.port].sort().join("|");
    if(!edges[key]) edges[key] = { a: ea, b: eb, linkIds: [] };
    edges[key].linkIds.push(lid);
    NET.linkStatus[lid] = "up";
  }

  // ---- ae status for show lacp ----
  for(const dev of Object.values(devices)){
    if(dev.type !== "switch") continue;
    const info = {};
    for(const [ae, aeCfg] of Object.entries(D(dev).aes)){
      const members = aeCfg.members.map(m => {
        const cabled = isLinked(dev.id, m);
        let state = "Detached", why = "no cable";
        if(cabled){
          const [lid] = linksOf(dev.id, m)[0];
          state = NET.linkStatus[lid] === "up" ? "Collecting distributing" : "Detached";
          why = NET.linkStatus[lid] === "lacp-fail" ? "no LACP partner on the far end"
              : NET.linkStatus[lid] === "down" ? "link down" : "";
        }
        return { port: m, state, why };
      });
      info[ae] = { members, up: members.some(m => m.state === "Collecting distributing"), lacp: aeCfg.lacp };
    }
    NET.aeInfo[dev.id] = info;
  }

  // ---- RSTP / storm over the switch-switch graph ----
  const swEdges = Object.values(edges).filter(e =>
    devices[e.a.dev].type === "switch" && devices[e.b.dev].type === "switch" &&
    effPortInfo(devices[e.a.dev], e.a.port) && effPortInfo(devices[e.b.dev], e.b.port));
  const swIds = [...new Set(swEdges.flatMap(e => [e.a.dev, e.b.dev]))];
  const adj = {}; swIds.forEach(id => adj[id] = []);
  swEdges.forEach(e => { adj[e.a.dev].push({ to: e.b.dev, e }); adj[e.b.dev].push({ to: e.a.dev, e }); });
  const seen = new Set();
  for(const start of swIds.sort((x, y) => hostnameOf(devices[x]) < hostnameOf(devices[y]) ? -1 : 1)){
    if(seen.has(start)) continue;
    // component BFS: root = lowest hostname in the component
    const comp = []; const q = [start]; const cseen = new Set([start]);
    while(q.length){ const n = q.shift(); comp.push(n);
      for(const { to } of adj[n]) if(!cseen.has(to)){ cseen.add(to); q.push(to); } }
    comp.forEach(id => seen.add(id));
    const root = comp.slice().sort((x, y) => hostnameOf(devices[x]) < hostnameOf(devices[y]) ? -1 : 1)[0];
    comp.forEach(id => NET.stpRoot[id] = root);
    // BFS tree from root
    const dist = { [root]: 0 }; const treeEdges = new Set();
    const bq = [root];
    while(bq.length){
      const n = bq.shift();
      const nbrs = adj[n].slice().sort((p, q2) => hostnameOf(devices[p.to]) < hostnameOf(devices[q2.to]) ? -1 : 1);
      for(const { to, e } of nbrs){
        if(dist[to] === undefined){ dist[to] = dist[n] + 1; treeEdges.add(e); bq.push(to); }
      }
    }
    for(const e of swEdges){
      if(!comp.includes(e.a.dev)) continue;
      if(treeEdges.has(e)) continue;
      // redundant edge: block one end if anyone runs RSTP, otherwise it's a storm loop
      const aR = D(devices[e.a.dev]).rstp, bR = D(devices[e.b.dev]).rstp;
      let blockEnd = null;
      if(aR && bR) blockEnd = (dist[e.a.dev] > dist[e.b.dev]) ? e.a
                    : (dist[e.b.dev] > dist[e.a.dev]) ? e.b
                    : (hostnameOf(devices[e.a.dev]) > hostnameOf(devices[e.b.dev]) ? e.a : e.b);
      else if(aR) blockEnd = e.a;
      else if(bR) blockEnd = e.b;
      if(blockEnd){
        NET.blocked.add(blockEnd.dev + ":" + blockEnd.port);
        NET.stpBlockedEdges.push(e);
        e.linkIds.forEach(lid => NET.linkStatus[lid] = "blocked");
      } else {
        e.linkIds.forEach(lid => { NET.stormLinks.add(lid); NET.linkStatus[lid] = "storm"; });
      }
    }
  }

  // ---- register edge lookups (skip blocked edges) ----
  for(const e of Object.values(edges)){
    const blocked = NET.blocked.has(e.a.dev + ":" + e.a.port) || NET.blocked.has(e.b.dev + ":" + e.b.port);
    const storm = e.linkIds.some(lid => NET.stormLinks.has(lid));
    const rec = { blocked, storm, linkIds: e.linkIds };
    NET.edgeByPort[e.a.dev + ":" + e.a.port] = { ...rec, other: e.b };
    NET.edgeByPort[e.b.dev + ":" + e.b.port] = { ...rec, other: e.a };
  }
}

/* ---------- PoE: access points are powered BY the switch port ---------- */
var POE = { denied: {}, used: {}, budget: {} };
const POE_BUDGET_W = {   // real spec-sheet budgets
  "EX2300-24P": 370, "EX4300-48P": 900,
  "USW-Lite-8-PoE": 52, "USW-Pro-24-PoE": 400,
};
const POE_GENERIC_W = 140;   // model-less lab gear stays lenient
const POE_DRAW_W = { AP24: 14, AP34: 18, AP45: 22, "U6+": 14, "U7-Pro": 21 };
function poeBudgetOf(dev){
  if(!dev.model) return POE_GENERIC_W;
  return POE_BUDGET_W[dev.model] || 0;
}
function apPoeDraw(ap){ return POE_DRAW_W[ap.model] || 15; }
function computePoe(){
  POE = { denied: {}, used: {}, budget: {} };
  const bySw = {};
  for(const ap of Object.values(devices)){
    if(ap.type !== "ap" || (ap.cfg && ap.cfg.injector)) continue;
    const le = Object.values(links).find(l =>
      (l.a.dev === ap.id && l.a.port === "eth0") || (l.b.dev === ap.id && l.b.port === "eth0"));
    if(!le) continue;   // an uncabled AP has no port to draw from — and nothing to bridge anyway
    const far = le.a.dev === ap.id ? le.b : le.a;
    const sw = devices[far.dev];
    if(!sw) continue;
    if(sw.type !== "switch" && sw.type !== "router"){ POE.denied[ap.id] = "the far end of its cable cannot supply PoE"; continue; }
    if(sw.powered === false){ POE.denied[ap.id] = "the switch feeding it has no power"; continue; }
    (bySw[sw.id] = bySw[sw.id] || []).push({ ap, port: far.port });
  }
  for(const [swId, list] of Object.entries(bySw)){
    const sw = devices[swId];
    const budget = poeBudgetOf(sw);
    POE.budget[swId] = budget;
    if(budget === 0){
      for(const { ap } of list) POE.denied[ap.id] = (sw.model || "that platform") + " supplies no PoE";
      continue;
    }
    list.sort((x, y) => String(x.port).localeCompare(String(y.port), undefined, { numeric: true }));
    let used = 0;
    for(const { ap } of list){
      const draw = apPoeDraw(ap);
      if(used + draw <= budget) used += draw;
      else POE.denied[ap.id] = "PoE budget exceeded on " + sw.name + " (" + budget + " W)";
    }
    POE.used[swId] = used;
  }
}
function showPoeCmd(dev){
  const budget = poeBudgetOf(dev);
  if(budget === 0) return (dev.model || "this platform") + " has no PoE — power devices with an injector or pick a P-model";
  const rows = [];
  for(const l of Object.values(links)){
    const me = l.a.dev === dev.id ? l.a : l.b.dev === dev.id ? l.b : null;
    if(!me) continue;
    const other = devices[(l.a.dev === dev.id ? l.b : l.a).dev];
    if(!other || other.type !== "ap") continue;
    const denied = POE.denied[other.id];
    rows.push(String(me.port).padEnd(14) + "Enabled   " +
      (denied ? "OFF (denied)  0.0W     " : "ON        " + apPoeDraw(other).toFixed(1) + "W    ") + other.name +
      (other.cfg && other.cfg.injector ? "  (external injector)" : ""));
  }
  const used = POE.used[dev.id] || 0;
  return "Interface     Admin     Oper          Power    Device\n" +
    (rows.length ? rows.join("\n") : "(no powered devices on any port)") +
    "\n\nPoE budget: " + used.toFixed(1) + "W used of " + budget.toFixed(1) + "W";
}
function rebuildAllDerived(){
  for(const dev of Object.values(devices))
    if(dev.type === "switch" || dev.type === "router") dev.d = deriveDev(dev);
  computePoe();
  computeNet();

  // storm-control reaction: shutdown-profiles error-disable their port, then everything recomputes
  for(let round = 0; round < 3; round++){
    if(!NET.stormLinks.size) break;
    // switches connected (through active edges) to a storming link
    const stormComp = new Set();
    const grow = (devId) => {
      if(stormComp.has(devId)) return;
      stormComp.add(devId);
      const dev = devices[devId];
      if(!dev || dev.type !== "switch") return;
      for(const key of Object.keys(NET.edgeByPort)){
        if(!key.startsWith(devId + ":")) continue;
        const e = NET.edgeByPort[key];
        if(!e.blocked && devices[e.other.dev] && devices[e.other.dev].type === "switch") grow(e.other.dev);
      }
    };
    for(const lid of NET.stormLinks){
      const l = links[lid];
      if(l){ grow(l.a.dev); grow(l.b.dev); }
    }
    let changed = false, suppressed = false;
    for(const devId of stormComp){
      const dev = devices[devId];
      if(!dev || dev.type !== "switch") continue;
      for(const [port, pc] of Object.entries(D(dev).portCfg)){
        if(!pc.storm || dev.errDisabled[port]) continue;
        const prof = D(dev).stormProfiles[pc.storm];
        if(!prof) continue;
        if(prof.shutdown){
          dev.errDisabled[port] = true;
          devLog(dev, `STORM_CONTROL_IN_EFFECT: broadcast storm on ${port} — port error-disabled (profile ${pc.storm})`);
          changed = true;
        } else suppressed = true;
      }
    }
    if(suppressed && !changed){
      for(const lid of NET.stormLinks) NET.suppressedLinks.add(lid);
      for(const lid of NET.suppressedLinks) NET.linkStatus[lid] = "storm-suppressed";
      break;
    }
    if(!changed) break;
    computeNet();
  }
  computeVrrp();
  computeOspf();
  computeBgp();
  if(computeThermal()){ computeNet(); computeOspf(); computeBgp(); }   // thermal shutdowns change the graph
}

/* ============================================================
   THERMAL — heat load vs cooling per building
   Model: 21 C ambient, +1 C per 25 W of uncooled heat in a room,
   floor 18 C (the AC setpoint). Gear self-heats a little on top and
   thermally shuts down at 52 C, like real chassis protection.
   ============================================================ */
const HEAT_W = {
  "EX2300-C-12T": 30, "EX2300-24P": 40, "EX3400-24T": 45, "EX4300-48T": 90, "EX4300-48P": 100,
  "USW-Lite-8-PoE": 10, "USW-Pro-24": 25, "USW-Pro-24-PoE": 45, "USW-Pro-48": 50,
  "MX104": 250, "SRX300": 25, "MX204": 450, "UXG-Lite": 8, "UDM-Pro": 33,
  "AP24": 12, "AP34": 15, "AP45": 20, "U6+": 9, "U7-Pro": 22,
};
function heatOf(dev){
  if(dev.failed) return 0;
  if(dev.type === "crac" || dev.type === "isp" || dev.type === "ups") return 0;
  if((dev.type === "switch" || dev.type === "router" || dev.type === "server") && dev.powered === false) return 0;
  if(dev.model && HEAT_W[dev.model] !== undefined) return HEAT_W[dev.model];
  if(dev.type === "switch") return 15 + 2 * dev.ports.length;
  if(dev.type === "router") return 40 + 10 * dev.ports.length;
  if(dev.type === "ap") return 12;
  if(dev.type === "server") return 300;
  if(dev.type === "host") return 120;
  return 0;
}
let THERMAL = { zones: {}, devices: {} };
function computeThermal(){
  THERMAL = { zones: {}, devices: {} };
  if(typeof zoneOf !== "function" || typeof zones === "undefined") return false;
  let anyTrip = false;
  for(let round = 0; round < 4; round++){
    THERMAL.zones = {};
    for(const z of Object.values(zones)) THERMAL.zones[z.id] = { heatW: 0, coolW: 0, temp: 21, status: "ok" };
    for(const dev of Object.values(devices)){
      const z = zoneOf(dev.id);
      if(!z) continue;
      const zt = THERMAL.zones[z.id];
      zt.heatW += heatOf(dev);
      if(dev.type === "crac" && dev.powered !== false && !dev.failed) zt.coolW += (dev.cfg.coolW || 0);
    }
    for(const zt of Object.values(THERMAL.zones)){
      zt.temp = Math.max(18, Math.min(70, 21 + (zt.heatW - zt.coolW) / 25));
      zt.status = zt.temp >= 38 ? "crit" : zt.temp >= 30 ? "warn" : "ok";
    }
    let tripped = false;
    for(const dev of Object.values(devices)){
      const z = zoneOf(dev.id);
      const ambient = z ? THERMAL.zones[z.id].temp : 21;
      const t = ambient + heatOf(dev) / 60;
      THERMAL.devices[dev.id] = t;
      if((dev.type === "switch" || dev.type === "router" || dev.type === "server") && dev.powered !== false && t >= 52){
        dev.powered = false;
        if(dev.cli){ dev.cli.stage = null; dev.cli.mode = "op"; dev.cli.editKeys = []; }
        devLog(dev, (dev.type === "server" ? "kernel: CPU TEMPERATURE CRITICAL — emergency shutdown at "
                                           : "chassisd: TEMPERATURE CRITICAL — thermal shutdown at ") + t.toFixed(1) + " degrees C");
        tripped = true;
        anyTrip = true;
      }
    }
    if(!tripped) break;
  }
  return anyTrip;
}

/* ============================================================
   OSPF — adjacency discovery + route propagation
   ============================================================ */
/* ---------- BGP: buy your default route instead of typing it ---------- */
function computeBgp(){
  for(const dev of Object.values(devices)){
    if(dev.type !== "router" && dev.type !== "switch") continue;
    dev.d.bgpRoutes = []; dev.d.bgpPeers = [];
    if(!dev.d.bgpGroups || !dev.d.bgpGroups.length) continue;
    for(const g of dev.d.bgpGroups){
      for(const nip of g.neighbors){
        const peer = { addr: nip, group: g.name, peerAs: g.peerAs, state: "Idle", reason: "" };
        dev.d.bgpPeers.push(peer);
        if(!dev.d.as){ peer.reason = "no local AS — set routing-options autonomous-system"; continue; }
        const conn = ifacesOf(dev).filter(i => i.up).find(i => sameSubnet(nip, i.ip, i.bits));
        if(!conn){ peer.reason = "neighbor is not on a directly connected subnet (eBGP is single-hop)"; continue; }
        const isp = Object.values(devices).find(x => x.type === "isp" && x.cfg && x.cfg.ip === nip);
        if(!isp){ peer.state = "Active"; peer.reason = "nothing speaks BGP at " + nip; continue; }
        let reach = false;
        try{ reach = pingRun(dev, nip, { proto: "tcp" }).ok; }catch(err){}
        if(!reach){ peer.state = "Active"; peer.reason = "no path to the neighbor — TCP 179 cannot connect"; continue; }
        const ispAs = isp.cfg.asn || 65001;
        if(g.peerAs !== ispAs){
          peer.state = "Active";
          peer.reason = "peer AS mismatch: you said " + (g.peerAs || "nothing") + ", the provider answers as AS" + ispAs;
          continue;
        }
        peer.state = "Established";
        if(!dev.d.bgpRoutes.some(r => r.net === "0.0.0.0"))
          dev.d.bgpRoutes.push({ net: "0.0.0.0", bits: 0, nh: nip, fromAs: ispAs });
      }
    }
  }
}
function showBgpCmd(dev){
  const peers = (dev.d && dev.d.bgpPeers) || [];
  if(!peers.length) return "BGP is not running\n(configure routing-options autonomous-system and a protocols bgp group first)";
  const rows = peers.map(p =>
    pad(p.addr, 18) + pad(String(p.peerAs || "-"), 8) + pad(p.state, 14) +
    (p.state === "Established" ? ((dev.d.bgpRoutes || []).length + " routes received (0.0.0.0/0)") : p.reason));
  return "Peer              AS      State         Info\n" + rows.join("\n") +
    "\n\nGroups: " + dev.d.bgpGroups.length + "   Local AS: " + (dev.d.as || "(not set)");
}
function computeOspf(){
  const nodes = [];
  for(const dev of Object.values(devices)){
    if(dev.type !== "switch" && dev.type !== "router") continue;
    dev.d.ospfRoutes = []; dev.d.ospfNeighbors = [];
    const oi = dev.d.ospf || {};
    if(!Object.keys(oi).length) continue;
    for(const iface of ifacesOf(dev)){
      if(!oi[iface.name] || !iface.up) continue;
      nodes.push({ dev, iface, passive: oi[iface.name].passive });
    }
  }
  if(!nodes.length) return;
  const nbrs = new Map();
  const reachCache = new Map();
  const reachOf = n => {
    const key = n.dev.id + "|" + n.iface.name;
    if(!reachCache.has(key)) reachCache.set(key, l2Reach(n.iface.seed));
    return reachCache.get(key);
  };
  for(let i = 0; i < nodes.length; i++) for(let j = i + 1; j < nodes.length; j++){
    const a = nodes[i], b = nodes[j];
    if(a.dev === b.dev || a.passive || b.passive) continue;
    if(!sameSubnet(a.iface.ip, b.iface.ip, Math.min(a.iface.bits, b.iface.bits))) continue;
    const hit = reachOf(a).endpoints.map(endpointL3).filter(Boolean)
      .some(e => e.dev === b.dev && e.ip === b.iface.ip);
    if(!hit) continue;
    if(!nbrs.has(a.dev.id)) nbrs.set(a.dev.id, []);
    if(!nbrs.has(b.dev.id)) nbrs.set(b.dev.id, []);
    nbrs.get(a.dev.id).push({ to: b.dev.id, ifName: a.iface.name, nhIp: b.iface.ip });
    nbrs.get(b.dev.id).push({ to: a.dev.id, ifName: b.iface.name, nhIp: a.iface.ip });
    a.dev.d.ospfNeighbors.push({ addr: b.iface.ip, iface: a.iface.name, name: hostnameOf(b.dev) });
    b.dev.d.ospfNeighbors.push({ addr: a.iface.ip, iface: b.iface.name, name: hostnameOf(a.dev) });
  }
  // every OSPF node advertises the networks of all its OSPF interfaces (incl. passive)
  const advert = new Map();
  for(const n of nodes){
    if(!advert.has(n.dev.id)) advert.set(n.dev.id, []);
    advert.get(n.dev.id).push({ net: networkOf(n.iface.ip, n.iface.bits), bits: n.iface.bits });
  }
  for(const devId of nbrs.keys()){
    const dev = devices[devId];
    const first = new Map();
    const seen = new Set([devId]);
    const q = [[devId, null]];
    while(q.length){
      const [cur, via] = q.shift();
      for(const e of (nbrs.get(cur) || [])){
        if(seen.has(e.to)) continue;
        seen.add(e.to);
        const v = via || { nhIp: e.nhIp, ifName: e.ifName };
        first.set(e.to, v);
        q.push([e.to, v]);
      }
    }
    const own = new Set(ifacesOf(dev).map(i => networkOf(i.ip, i.bits) + "/" + i.bits));
    for(const [target, v] of first){
      for(const s of (advert.get(target) || [])){
        if(own.has(s.net + "/" + s.bits)) continue;
        if(dev.d.ospfRoutes.some(r => r.net === s.net && r.bits === s.bits)) continue;
        dev.d.ospfRoutes.push({ net: s.net, bits: s.bits, nh: v.nhIp, via: v.ifName });
      }
    }
  }
}

/* ============================================================
   L2 REACHABILITY (vlan-aware flood over effective edges)
   ============================================================ */
function effSwitchPorts(sw){
  const d = D(sw), out = [];
  for(const p of sw.ports){
    const pc = d.portCfg[p.id];
    if(!pc || pc.disabled || sw.errDisabled[p.id] || pc.ae) continue;
    out.push({ port: p.id, mode: pc.mode, vlanIds: pc.vlanIds });
  }
  for(const [ae, aeCfg] of Object.entries(d.aes)){
    if(aeCfg.disabled) continue;
    out.push({ port: ae, mode: aeCfg.mode, vlanIds: aeCfg.vlanIds });
  }
  return out;
}

/* seeds: {type:"port", dev, port}  or  {type:"vlan", dev, vlanId}
   returns { endpoints:[{dev,port|irbUnit,path}], storm, suppressed } — path = [{link, dev, port}] ingress records */
function l2Reach(seed){
  const res = { endpoints: [], storm: false, suppressed: false };
  const seenEp = new Set(), seenSwVlan = new Set();
  const q = [];

  function traverseEdge(fromDev, fromPort, tagged, vlanId, path){
    const e = NET.edgeByPort[fromDev + ":" + fromPort];
    if(!e || e.blocked) return;
    if(e.storm){
      res.storm = true;
      if(e.linkIds.some(lid => NET.suppressedLinks.has(lid))) res.suppressed = true;
    }
    const { dev: toDevId, port: toPort } = e.other;
    const toDev = devices[toDevId];
    if(!toDev) return;
    const newPath = path.concat([{ link: e.linkIds[0], dev: toDevId, port: toPort, vlanId }]);
    if(toDev.type === "switch"){
      const pi = effPortInfo(toDev, toPort);
      if(!pi) return;
      if(tagged){
        if(pi.mode === "trunk" && pi.vlanIds.includes(vlanId)) enterSwVlan(toDev, vlanId, newPath);
      } else {
        if(pi.mode === "access") enterSwVlan(toDev, pi.vlanIds[0], newPath);
        // untagged into a trunk: dropped (no native vlan in this lab)
      }
    } else if(toDev.type === "ap"){
      // an access point is a dumb untagged bridge between its wired uplink
      // and every associated wireless client
      if(tagged) return;
      const key = toDevId + ":" + toPort;
      if(seenEp.has(key)) return;
      seenEp.add(key);
      for(const l2 of Object.values(links)){
        const side = l2.a.dev === toDevId ? l2.a : (l2.b.dev === toDevId ? l2.b : null);
        if(!side || side.port === toPort) continue;
        q.push(() => traverseEdge(toDevId, side.port, false, vlanId, newPath));
      }
    } else {
      // endpoint devices only accept untagged frames
      if(tagged) return;
      const key = toDevId + ":" + toPort;
      if(seenEp.has(key)) return;
      seenEp.add(key);
      res.endpoints.push({ dev: toDevId, port: toPort, path: newPath });
    }
  }

  function enterSwVlan(sw, vlanId, path){
    if(vlanId === undefined || isNaN(vlanId)) return;
    const key = sw.id + ":" + vlanId;
    if(seenSwVlan.has(key)) return;
    seenSwVlan.add(key);
    const irbUnit = D(sw).irbByVlan[vlanId];
    if(irbUnit !== undefined){
      const ekey = sw.id + ":irb." + irbUnit;
      if(!seenEp.has(ekey)){ seenEp.add(ekey); res.endpoints.push({ dev: sw.id, irbUnit, path }); }
    }
    for(const p of effSwitchPorts(sw)){
      if(p.mode === "access" && p.vlanIds[0] === vlanId)
        q.push(() => traverseEdge(sw.id, p.port, false, vlanId, path));
      else if(p.mode === "trunk" && p.vlanIds.includes(vlanId))
        q.push(() => traverseEdge(sw.id, p.port, true, vlanId, path));
    }
  }

  if(seed.type === "port"){
    const dev = devices[seed.dev];
    if(dev && physPortActive(dev, seed.port)){
      seenEp.add(seed.dev + ":" + seed.port);
      q.push(() => traverseEdge(seed.dev, effPortOf(dev, seed.port), false, undefined, []));
    }
  } else if(seed.type === "vlan"){
    enterSwVlan(devices[seed.dev], seed.vlanId, []);
  }
  let guard = 0;
  while(q.length && guard++ < 5000) q.shift()();
  return res;
}

/* ============================================================
   L3: interfaces, routes, filters, ping, traceroute
   ============================================================ */
function ifacesOf(dev){
  const out = [];
  if(dev.failed) return out;
  if((dev.type === "switch" || dev.type === "router" || dev.type === "server") && dev.powered === false) return out;
  if(dev.type === "host" || dev.type === "server"){
    if(dev.cfg.ip) out.push({ name: "eth0", ip: dev.cfg.ip, bits: dev.cfg.bits, fIn: null, fOut: null,
      seed: { type: "port", dev: dev.id, port: "eth0" }, up: isLinked(dev.id, "eth0"), mac: macOf(dev.id, "eth0") });
  } else if(dev.type === "isp"){
    out.push({ name: "wan0", ip: dev.cfg.ip, bits: dev.cfg.bits, fIn: null, fOut: null,
      seed: { type: "port", dev: dev.id, port: "wan0" }, up: isLinked(dev.id, "wan0"), mac: macOf(dev.id, "wan0") });
  } else if(dev.type === "router"){
    for(const [port, l3] of Object.entries(D(dev).l3ports)){
      const pc = D(dev).portCfg[port];
      out.push({ name: port + ".0", port, ip: l3.ip, bits: l3.bits, fIn: l3.fIn, fOut: l3.fOut,
        seed: { type: "port", dev: dev.id, port }, up: isLinked(dev.id, port) && !(pc && pc.disabled),
        mac: macOf(dev.id, port) });
    }
  } else if(dev.type === "switch"){
    for(const [unit, irb] of Object.entries(D(dev).irbs)){
      if(isNaN(irb.vlanId)) continue;
      const carried = effSwitchPorts(dev).some(p => p.vlanIds.includes(irb.vlanId));
      out.push({ name: "irb." + unit, unit, ip: irb.ip, bits: irb.bits, fIn: irb.fIn, fOut: irb.fOut,
        seed: { type: "vlan", dev: dev.id, vlanId: irb.vlanId }, up: carried, mac: macOf(dev.id, "irb." + unit) });
      if(irb.vrrp && irb.vrrp.vip && VRRP.byVip[irb.vrrp.vip] && VRRP.byVip[irb.vrrp.vip].master === dev.id)
        out.push({ name: "irb." + unit, unit, ip: irb.vrrp.vip, bits: irb.bits, fIn: irb.fIn, fOut: irb.fOut,
          seed: { type: "vlan", dev: dev.id, vlanId: irb.vlanId }, up: carried,
          mac: macOf(dev.id, "vrrp-" + irb.vrrp.group) });
    }
  }
  return out;
}
/* who owns this IP? — used by ssh and friends */
function findDeviceByIp(ip){
  for(const d of Object.values(devices)){
    if((d.type === "host" || d.type === "server" || d.type === "isp") && d.cfg && d.cfg.ip === ip) return d;
    if(d.type === "switch" || d.type === "router"){
      if(ifacesOf(d).some(i => i.ip === ip)) return d;
      if(d.d && d.d.me0 && d.d.me0.ip === ip) return d;
    }
  }
  return null;
}
/* LLDP: the lab knows every cable, so neighbors are simply the live links.
   PCs stay silent (no lldpd), and console leads carry no frames. */
/* show interfaces <port> — counters fed by the real traffic ledger */
function showIfaceDetailCmd(dev, keys){
  const port = keys[2];
  if(!dev.ports.some(p => p.id === port))
    return { text: "error: interface " + port + " not found on this chassis", err: true };
  const le = Object.entries(links).find(([, l]) =>
    (l.a.dev === dev.id && l.a.port === port) || (l.b.dev === dev.id && l.b.port === port));
  const up = le && physPortActive(dev, port) &&
    physPortActive(devices[(le[1].a.dev === dev.id ? le[1].b : le[1].a).dev],
                   (le[1].a.dev === dev.id ? le[1].b : le[1].a).port) && !le[1].failed;
  const ctr = (le && typeof trafficPortCounters === "function")
    ? trafficPortCounters(dev.id, le[0]) : { input: 0, output: 0 };
  const rate = (le && typeof trafficStats === "function")
    ? (trafficStats(60000).per[le[0]] || 0) : 0;
  const speed = le && le[1].speed ? le[1].speed : 1;
  return "Physical interface: " + port + ", Enabled, Physical link is " + (up ? "Up" : "Down") + "\n" +
    "  Link-level type: Ethernet, Speed: " + (speed >= 1 ? speed + "Gbps" : Math.round(speed * 1000) + "Mbps") +
    ", MAC address: " + macOf(dev.id, port) + "\n" +
    (le ? "  Connected to: " + (devices[(le[1].a.dev === dev.id ? le[1].b : le[1].a).dev] || {}).name +
      ":" + (le[1].a.dev === dev.id ? le[1].b : le[1].a).port + "\n" : "  (no cable)\n") +
    "  Traffic statistics (since this session began):\n" +
    "    Input  packets: " + ctr.input + "\n" +
    "    Output packets: " + ctr.output + "\n" +
    "    Last minute:    " + rate + " packets crossed this link\n" +
    "  (counters count REAL journeys — pings, DHCP, lookups you actually ran)";
}
function monitorIfaceCmd(dev, keys){
  const out = showIfaceDetailCmd(dev, ["show", "interfaces", keys[2]]);
  if(out && out.err) return out;
  return String(out) + "\n\n(real JunOS live-updates this screen; the lab gives you a snapshot — run it again to refresh)";
}
function showLldpCmd(dev){
  const rows = [];
  for(const l of Object.values(links)){
    if(l.kind === "console") continue;
    const me = l.a.dev === dev.id ? l.a : l.b.dev === dev.id ? l.b : null;
    if(!me) continue;
    const other = l.a.dev === dev.id ? l.b : l.a;
    const nbr = devices[other.dev];
    if(!nbr || nbr.type === "host") continue;
    if(l.failed) continue;
    if(!physPortActive(dev, me.port) || !physPortActive(nbr, other.port)) continue;
    rows.push(me.port.padEnd(18) + macOf(nbr.id, other.port).padEnd(21) + String(other.port).padEnd(14) + nbr.name);
  }
  if(!rows.length) return "(no LLDP neighbors — nothing live is cabled, or only PCs and console leads)";
  return "Local Interface   Chassis Id           Port info     System Name\n" + rows.join("\n");
}
function routesOf(dev){
  if(dev.type === "switch" || dev.type === "router") return D(dev).routes;
  if(dev.type === "host" || dev.type === "server")
    return dev.cfg.gw ? [{ net: "0.0.0.0", bits: 0, nh: dev.cfg.gw }] : [];
  return [];
}
function routeLookup(dev, dstIp){
  const up = ifacesOf(dev).filter(i => i.up);
  const conn = up.find(i => sameSubnet(dstIp, i.ip, i.bits));
  if(conn) return { type: "connected", iface: conn };
  // longest prefix wins; ties break on protocol preference (static 5 < ospf 10)
  const cands = [];
  for(const r of routesOf(dev))
    if(sameSubnet(dstIp, r.net, r.bits)) cands.push({ ...r, pref: 5, proto: "static" });
  for(const r of ((dev.d && dev.d.ospfRoutes) || []))
    if(sameSubnet(dstIp, r.net, r.bits)) cands.push({ ...r, pref: 10, proto: "ospf" });
  for(const r of ((dev.d && dev.d.bgpRoutes) || []))
    if(sameSubnet(dstIp, r.net, r.bits)) cands.push({ ...r, pref: 170, proto: "bgp" });
  if(cands.length){
    cands.sort((a, b) => b.bits - a.bits || a.pref - b.pref);
    const best = cands[0];
    const via = up.find(i => sameSubnet(best.nh, i.ip, i.bits));
    return { type: "static", nh: best.nh, iface: via || null, route: best, proto: best.proto };
  }
  if(dev.type === "isp"){
    if(isPublicIp(dstIp)) return { type: "internet" };
    // the provider routes your traffic back down the /30 toward the peer
    const w = up[0];
    if(w) return { type: "peer", iface: w };
  }
  return null;
}
function evalFilter(dev, fname, pkt){
  const terms = (D(dev).filters || {})[fname];
  if(!terms) return "accept";       // referencing an undefined filter can't happen post-commit
  for(const t of terms){
    if(t.src.length && !t.src.some(p => sameSubnet(pkt.src, p.ip, p.bits))) continue;
    if(t.dst.length && !t.dst.some(p => sameSubnet(pkt.dst, p.ip, p.bits))) continue;
    if(t.proto.length && !t.proto.includes(pkt.proto)) continue;
    return t.then;
  }
  return "discard";                 // JunOS: implicit discard at the end of every filter
}
/* does this irb endpoint answer for a VRRP virtual address right now? */
function vrrpAnswers(e2, ip){
  if(!e2 || e2.kind !== "irb") return false;
  const irb = D(e2.dev).irbs[e2.ep.irbUnit];
  return !!(irb && irb.vrrp && irb.vrrp.vip === ip &&
    VRRP.byVip[ip] && VRRP.byVip[ip].master === e2.dev.id);
}
function endpointL3(ep){
  const dev = devices[ep.dev];
  if(!dev) return null;
  if(dev.type === "host" || dev.type === "server") return dev.cfg.ip ? { kind:"host", dev, ip: dev.cfg.ip, bits: dev.cfg.bits, fIn:null, iface:"eth0", ep } : null;
  if(dev.type === "isp") return { kind:"isp", dev, ip: dev.cfg.ip, bits: dev.cfg.bits, fIn:null, iface:"wan0", ep };
  if(dev.type === "router"){
    const l3 = D(dev).l3ports[ep.port];
    return l3 ? { kind:"router", dev, ip: l3.ip, bits: l3.bits, fIn: l3.fIn, iface: ep.port + ".0", ep } : null;
  }
  if(dev.type === "switch" && ep.irbUnit !== undefined){
    const irb = D(dev).irbs[ep.irbUnit];
    return irb ? { kind:"irb", dev, ip: irb.ip, bits: irb.bits, fIn: irb.fIn, iface: "irb." + ep.irbUnit, ep } : null;
  }
  return null;
}

/* one direction of a ping. returns {ok, text, short, hops, segs, deliveredDev} */
function pingWalk(startDev, pkt0, opts){
  opts = opts || {};
  let pkt = { ...pkt0 };  // NAT rewrites a local copy
  const hops = [];        // {dev, ip} L3 hops crossed (gateways)
  const segs = [];        // ingress records for animation/learning
  let node = startDev;
  let inIface = null;     // name of the interface the packet arrived on
  const seenL3 = new Set([node.id]);
  const fail = (text, short, extra) => ({ ok: false, hops, segs, text, short, ...(extra || {}) });
  for(let ttl = 0; ttl < 16; ttl++){
    // reply to a NAT address? untranslate and keep routing toward the real source
    if(opts.natTable){
      const ent = opts.natTable.find(en => en.devId === node.id && en.natIp === pkt.dst);
      if(ent) pkt = { ...pkt, dst: ent.orig };
    }
    // does this node own the destination?
    const own = ifacesOf(node).find(i => i.ip === pkt.dst);
    if(own) return { ok: true, hops, segs, deliveredDev: node };
    if(node.type === "isp" && isPublicIp(pkt.dst) &&
       !ifacesOf(node).some(i => i.up && sameSubnet(pkt.dst, i.ip, i.bits))){
      // beyond the provider = "the internet" — but its own /30 routes normally
      if(!isPublicIp(pkt.src))
        return fail(`Request timeout  (the packet reached the internet, but its source ${pkt.src} is a private address — the internet has no route back. Configure source NAT on your edge router.)`, "needs NAT (private source)");
      return { ok: true, hops, segs, deliveredDev: node, internet: true };
    }
    if((node.type === "host" || node.type === "server") && node !== startDev)
      return fail(`${node.name} received the packet but ${pkt.dst} isn't its address — endpoints don't forward traffic`, "host won't forward");

    const r = routeLookup(node, pkt.dst);
    if(!r) return fail(
      node.type === "host"
        ? `connect: Network is unreachable  (${node.name} has no route to ${pkt.dst} — is a default gateway set? try: ip route add default via <gw>)`
        : `no route to ${pkt.dst} on ${hostnameOf(node)} — check "show route" (a static route or default route is missing)`,
      node.type === "host" ? "no gateway" : `no route on ${hostnameOf(node)}`);
    if(r.type === "internet"){
      if(!isPublicIp(pkt.src))
        return fail(`Request timeout  (the packet reached the internet, but its source ${pkt.src} is a private address — the internet has no route back. Configure source NAT on your edge router.)`, "needs NAT (private source)");
      return { ok: true, hops, segs, deliveredDev: node, internet: true };
    }
    const targetIp = r.type === "connected" ? pkt.dst : r.nh;   // (for "peer", resolved below)
    if(!r.iface) return fail(
      `${hostnameOf(node)} has a route via ${r.nh}, but no interface is in ${r.nh}'s subnet — the next-hop is unreachable`,
      "next-hop unreachable");
    // source NAT on the way out of a router
    if(node.type === "router" && opts.natTable){
      const rule = (D(node).natRules || []).find(nr =>
        nr.toIf === r.iface.name &&
        (!nr.fromIf || nr.fromIf === inIface) &&
        (!nr.match.length || nr.match.some(p => sameSubnet(pkt.src, p.ip, p.bits))));
      if(rule && pkt.src !== r.iface.ip){
        opts.natTable.push({ devId: node.id, orig: pkt.src, natIp: r.iface.ip });
        if(opts.natEvents) opts.natEvents.push({ devId: node.id, from: pkt.src, to: r.iface.ip });
        pkt = { ...pkt, src: r.iface.ip };
      }
    }
    if(r.iface.fOut){
      const act = evalFilter(node, r.iface.fOut, pkt);
      if(act !== "accept") return fail(
        filterText(node, r.iface.fOut, r.iface.name, act, "outbound"),
        `filtered (${r.iface.fOut})`,
        { filtered: { dev: node, filter: r.iface.fOut, iface: r.iface.name, act } });
    }
    const reach = l2Reach(r.iface.seed);
    if(reach.storm && !reach.suppressed)
      return fail(`broadcast storm on this segment — 100% packet loss (there's a physical loop with no spanning tree; check the flashing links)`,
        "broadcast storm", { storm: true });
    const l3eps = reach.endpoints.map(endpointL3).filter(Boolean);
    const found = r.type === "peer"
      ? l3eps.find(e => e.ip !== r.iface.ip && sameSubnet(e.ip, r.iface.ip, r.iface.bits))
      : l3eps.find(e2 => e2.ip === targetIp || vrrpAnswers(e2, targetIp));
    if(!found){
      const what = r.type === "connected" ? pkt.dst : r.type === "peer" ? "the provider-side peer" : `next-hop ${r.nh}`;
      return fail(
        `From ${ifaceIpOf(node) || "local"}: Destination Host Unreachable  (ARP for ${what} got no answer out ${r.iface.name} on ${hostnameOf(node)} — no L2 path: check cabling, VLANs and link state)`,
        "no L2 path / ARP failed");
    }
    if(found.fIn){
      const act = evalFilter(found.dev, found.fIn, pkt);
      if(act !== "accept") return fail(
        filterText(found.dev, found.fIn, found.iface, act, "inbound"),
        `filtered (${found.fIn})`,
        { filtered: { dev: found.dev, filter: found.fIn, iface: found.iface, act } });
    }
    segs.push(...found.ep.path.map(s => ({ ...s, srcMac: r.iface.mac, srcIp: pkt.src, dstIp: pkt.dst })));
    if(opts.learn) learnPath(node, r.iface, found, pkt);
    if(found.ip === pkt.dst || vrrpAnswers(found, pkt.dst)){
      // a reply aimed at a NAT address isn't home yet — untranslate and keep routing
      const ent = opts.natTable && opts.natTable.find(en => en.devId === found.dev.id && en.natIp === pkt.dst);
      if(!ent) return { ok: true, hops, segs, deliveredDev: found.dev };
      pkt = { ...pkt, dst: ent.orig };
    }
    // forward through this L3 device
    if(seenL3.has(found.dev.id))
      return fail(`routing loop detected (packet came back to ${hostnameOf(found.dev)}) — check your static routes`, "routing loop");
    seenL3.add(found.dev.id);
    hops.push({ dev: found.dev, ip: found.ip });
    inIface = found.iface;
    node = found.dev;
  }
  return fail("TTL exceeded (too many hops — likely a routing loop)", "TTL exceeded");
}
function ifaceIpOf(dev){ const i = ifacesOf(dev)[0]; return i ? i.ip : null; }
function filterText(dev, fname, iface, act, dir){
  if(act === "reject")
    return `From ${ifaceIpOf(dev)}: Communication administratively prohibited  (firewall filter "${fname}" ${dir} on ${hostnameOf(dev)} ${iface} rejected it)`;
  return `Request timeout  (silently discarded by firewall filter "${fname}" ${dir} on ${hostnameOf(dev)} ${iface} — discard sends nothing back)`;
}
function learnPath(fromNode, viaIface, found, pkt){
  // switches along the way learn the sender's MAC on their ingress port
  for(const s of found.ep.path){
    const sw = devices[s.dev];
    if(!sw || sw.type !== "switch") continue;
    const vlanName = Object.entries(D(sw).vlans).find(([, v]) => v.id === s.vlanId);
    const entry = { vlan: vlanName ? vlanName[0] : (s.vlanId || "-"), mac: viaIface.mac, iface: s.port };
    if(!sw.macTable.some(m => m.mac === entry.mac && m.vlan === entry.vlan))
      sw.macTable.push(entry);
    if(sw.macTable.length > 64) sw.macTable.shift();
    // port security: interface-mac-limit
    const lim = D(sw).macLimit && D(sw).macLimit[s.port];
    if(lim){
      const cnt = sw.macTable.filter(m => m.iface === s.port).length;
      if(cnt > lim.limit){
        devLog(sw, `L2ALD_MAC_LIMIT: MAC limit (${lim.limit}) exceeded on ${s.port}` +
          (lim.shutdown ? " — port error-disabled" : " — excess MACs dropped"));
        if(lim.shutdown && !sw.errDisabled[s.port]){
          sw.errDisabled[s.port] = true;
          rebuildAllDerived();
        }
      }
    }
  }
  // ARP both ways
  const farMac = found.kind === "host" ? macOf(found.dev.id, "eth0")
    : found.kind === "isp" ? macOf(found.dev.id, "wan0")
    : found.kind === "irb" ? macOf(found.dev.id, found.iface)
    : macOf(found.dev.id, found.ep.port);
  const target = found.ip;
  fromNode.arp = fromNode.arp || {};
  fromNode.arp[target] = { mac: farMac, iface: viaIface.name };
  found.dev.arp = found.dev.arp || {};
  found.dev.arp[pkt.src] = { mac: viaIface.mac, iface: found.iface };
}

/* full round-trip ping with formatted output */
function pingRun(dev, target, opts){
  opts = opts || {};
  if(!validIp(target)) return { ok: false, lines: lines("err", "ping: bad address " + target) };
  const srcIfaces = ifacesOf(dev).filter(i => i.up || dev.type === "host");
  if(!srcIfaces.length){
    const why = dev.type === "host" ? "ping: no IP configured on this host (ip addr add <ip>/<bits> dev eth0)"
      : dev.type === "switch" ? "ping: no source address — this switch has no usable irb interface"
      : "ping: no source address — no interface has an address and a live link";
    return { ok: false, lines: lines("err", why) };
  }
  if(srcIfaces.some(i => i.ip === target))
    return { ok: true, lines: lines("out", pingOkText(target, 64, 0.05)) };
  const srcIp = (routeLookup(dev, target) || {}).iface ? routeLookup(dev, target).iface.ip : srcIfaces[0].ip;
  const pkt = { src: srcIp, dst: target, proto: opts.proto || "icmp" };
  const natTable = [], natEvents = [];
  const walkOpts = { ...opts, natTable, natEvents };
  const fwd = pingWalk(dev, pkt, walkOpts);
  LAST_JOURNEY = { when: Date.now(), target, ok: false, fwd: fwd.segs || [], rev: null, natEvents };
  const head = `PING ${target} (${target}): 56 data bytes`;
  const anim = (segs, ok, revSegs, meta) => {
    if(opts.animate && typeof animatePing === "function") animatePing(segs, ok, revSegs, meta);
  };
  if(!fwd.ok){
    anim(fwd.segs, false, null, { short: fwd.short, srcDev: dev, natEvents });
    return { ok: false, lines: [
      { cls: "out", text: head },
      { cls: "err", text: fwd.text + "\n\n--- " + target + " ping statistics ---\n2 packets transmitted, 0 packets received, 100.0% packet loss" }] };
  }
  // reply must be able to route back (to the NAT address, if we were translated)
  const backTo = natTable.length ? natTable[natTable.length - 1].natIp : srcIp;
  const rpkt = { src: target, dst: backTo, proto: opts.proto || "icmp" };
  const rev = pingWalk(fwd.deliveredDev, rpkt, walkOpts);
  LAST_JOURNEY.rev = rev.segs || null;
  LAST_JOURNEY.ok = !!rev.ok;
  if(!rev.ok){
    anim(fwd.segs, false, null, { short: "reply lost: " + (rev.short || "no return path"), srcDev: dev, natEvents });
    return { ok: false, lines: [
      { cls: "out", text: head },
      { cls: "err", text:
        `Request timeout  (your ping REACHED ${target}, but the reply died on the way back:\n  ${rev.text}\n  — asymmetric routing: the far side needs a route back to ${backTo})` +
        "\n\n--- " + target + " ping statistics ---\n2 packets transmitted, 0 packets received, 100.0% packet loss" }] };
  }
  anim(fwd.segs, true, rev.segs, { natEvents });
  const ttl = 64 - fwd.hops.length;
  return { ok: true, lines: lines("out", pingOkText(target, ttl, 0.2 + fwd.hops.length * 0.17)) };
}

/* ============================================================
   DHCP — dhclient handshake against a bound server pool
   ============================================================ */
function runDhclient(host){
  const head = "DHCPDISCOVER on eth0 to 255.255.255.255 port 67";
  if(!isLinked(host.id, "eth0"))
    return lines("err", head + "\n....no DHCPOFFERS received  (eth0 has no cable)");
  const reach = l2Reach({ type: "port", dev: host.id, port: "eth0" });
  let server = null, srvIface = null, pool = null, srvEp = null;
  for(const ep of reach.endpoints){
    const l3 = endpointL3(ep);
    if(!l3) continue;
    const sd = l3.dev;
    if(sd.type !== "switch" && sd.type !== "router") continue;
    if(!(D(sd).dhcpIfs && D(sd).dhcpIfs.has(l3.iface))) continue;
    const p = (D(sd).pools || []).find(pl => sameSubnet(l3.ip, pl.net.ip, pl.net.bits));
    if(p){ server = sd; srvIface = l3; pool = p; srvEp = ep; break; }
  }
  if(!server)
    return lines("err", head + "\n....no DHCPOFFERS received  (no reachable DHCP server on this segment — is dhcp-local-server bound to this VLAN's interface, and does a pool cover its subnet? Check VLANs and cabling too.)");
  if(!pool.ranges.length)
    return lines("err", head + "\n....DHCPNAK from " + srvIface.ip + "  (pool " + pool.name + " has no range — set ... range r1 low/high)");
  server.leases = server.leases || {};
  const mac = macOf(host.id, "eth0");
  const resv = (pool.reservations || []).find(rv => rv.mac === mac.toLowerCase());
  let ip = resv ? resv.ip : server.leases[mac];
  if(!ip){
    const used = new Set(Object.values(server.leases));
    outer: for(const rg of pool.ranges){
      for(let n = ipToInt(rg.low); n <= ipToInt(rg.high); n++){
        const cand = intToIp(n);
        if(!used.has(cand) && cand !== srvIface.ip){ ip = cand; break outer; }
      }
    }
    if(!ip) return lines("err", head + "\n....DHCPNAK from " + srvIface.ip + "  (pool " + pool.name + " is exhausted)");
    server.leases[mac] = ip;
  }
  host.cfg.ip = ip; host.cfg.bits = pool.net.bits;
  host.cfg.gw = pool.router || null; host.cfg.viaDhcp = true;
  devLog(server, `JDHCPD: DHCPACK — leased ${ip} to ${mac} (pool ${pool.name})`);
  if(typeof animateDhcp === "function") animateDhcp(srvEp.path);
  touchState();
  return lines("out",
    head +
    `\nDHCPOFFER of ${ip} from ${srvIface.ip}` +
    `\nDHCPREQUEST for ${ip} on eth0` +
    `\nDHCPACK — eth0: ${ip}/${pool.net.bits}` +
    (pool.router ? `, default gateway ${pool.router}` : "  (no router option in the pool — no gateway was set)"));
}
function pingOkText(target, ttl, ms){
  const t1 = ms.toFixed(3), t2 = (ms * 0.92).toFixed(3);
  return `PING ${target} (${target}): 56 data bytes\n` +
    `64 bytes from ${target}: icmp_seq=0 ttl=${ttl} time=${t1} ms\n` +
    `64 bytes from ${target}: icmp_seq=1 ttl=${ttl} time=${t2} ms\n\n` +
    `--- ${target} ping statistics ---\n2 packets transmitted, 2 packets received, 0.0% packet loss`;
}
function doDevicePing(dev, target){
  const res = pingRun(dev, target, { learn: true, animate: true });
  touchState();
  return res.lines;
}
function doTraceroute(dev, target){
  if(!validIp(target)) return lines("err", "usage: traceroute <ip>");
  const srcIfaces = ifacesOf(dev).filter(i => i.up || dev.type === "host");
  if(!srcIfaces.length) return lines("err", "traceroute: no source address on this device");
  const srcIp = (routeLookup(dev, target) || {}).iface ? routeLookup(dev, target).iface.ip : srcIfaces[0].ip;
  const fwd = pingWalk(dev, { src: srcIp, dst: target, proto: "icmp" }, {});
  const out = [`traceroute to ${target} (${target}), 16 hops max`];
  let n = 1;
  for(const h of fwd.hops) out.push(` ${n++}  ${hostnameOf(h.dev)} (${h.ip})  ${(n * 0.21).toFixed(3)} ms`);
  if(fwd.ok) out.push(` ${n}  ${target} (${target})  ${(n * 0.23).toFixed(3)} ms`);
  else { out.push(` ${n}  * * *`); out.push(`  ↳ ${fwd.text}`); }
  return lines(fwd.ok ? "out" : "err", out.join("\n"));
}

/* ============================================================
   OPERATIONAL SHOW COMMANDS + OP TRIES
   ============================================================ */
function showTerse(dev){
  const rows = [["Interface", "Admin", "Link", "Proto / Notes"]];
  const d = D(dev);
  for(const p of dev.ports){
    const pc = d.portCfg[p.id] || {};
    const admin = pc.disabled ? "down" : "up";
    const errd = dev.errDisabled[p.id];
    const link = (!pc.disabled && !errd && isLinked(dev.id, p.id)) ? "up" : "down";
    let note = "";
    if(dev.type === "switch"){
      note = pc.ae ? `aenet --> ${pc.ae}` : `eth-switching  ${pc.mode} [${pc.vlanNames.join(" ")}]`;
    } else {
      const l3 = d.l3ports[p.id];
      note = l3 ? `inet  ${l3.ip}/${l3.bits}` : "";
    }
    if(errd) note += "   ** error-disabled (storm control) — clear ethernet-switching error-disable " + p.id;
    if(pc.desc) note += `   "${pc.desc}"`;
    rows.push([p.id, admin, link, note]);
  }
  if(dev.type === "switch"){
    for(const [ae, info] of Object.entries((NET && NET.aeInfo[dev.id]) || {}))
      rows.push([ae, d.aes[ae].disabled ? "down" : "up", info.up ? "up" : "down",
        `eth-switching  ${d.aes[ae].mode} [${d.aes[ae].vlanNames.join(" ")}]  (LACP ${d.aes[ae].lacp || "not set"})`]);
    for(const i of ifacesOf(dev))
      if(i.name.startsWith("irb.")) rows.push([i.name, "up", i.up ? "up" : "down", `inet  ${i.ip}/${i.bits}`]);
  }
  rows.push(["me0", "up", isLinked(dev.id, "me0") ? "up" : "down",
    "inet (mgmt)" + (d.me0 ? `  ${d.me0.ip}/${d.me0.bits}` : "") + "   out-of-band management"]);
  rows.push(["con", "up", isLinked(dev.id, "con") ? "up" : "down", "console — serial, carries no network traffic"]);
  return rows.map(r => pad(r[0], 12) + pad(r[1], 6) + pad(r[2], 6) + r[3]).join("\n");
}
function showVlansCmd(dev){
  const d = D(dev);
  const rows = [["Name", "ID", "L3", "Interfaces (* = tagged/trunk)"]];
  for(const [name, v] of Object.entries(d.vlans)){
    const members = [];
    for(const p of effSwitchPorts(dev)){
      if(!p.vlanIds.includes(v.id)) continue;
      members.push(p.port + (p.mode === "trunk" ? "*" : ""));
    }
    rows.push([name, v.id, v.l3 || "-", members.join(" ") || "-"]);
  }
  return rows.map(r => pad(r[0], 14) + pad(r[1], 6) + pad(r[2], 8) + r[3]).join("\n");
}
function showMacTable(dev){
  if(!dev.macTable.length)
    return "(empty — switches learn MAC addresses from traffic; send a ping and look again)";
  const rows = [["Vlan", "MAC address", "Type", "Interface"]];
  for(const m of dev.macTable) rows.push([m.vlan, m.mac, "D", m.iface]);
  return rows.map(r => pad(r[0], 12) + pad(r[1], 20) + pad(r[2], 6) + r[3]).join("\n");
}
function showRouteCmd(dev){
  const out = [];
  for(const i of ifacesOf(dev))
    if(i.up) out.push(pad(networkOf(i.ip, i.bits) + "/" + i.bits, 20) + "*[Direct/0]  via " + i.name);
  for(const r of routesOf(dev)){
    const up = ifacesOf(dev).filter(i => i.up);
    const via = up.find(i => sameSubnet(r.nh, i.ip, i.bits));
    out.push(pad(r.net + "/" + r.bits, 20) + `*[Static/5]  to ${r.nh}` + (via ? ` via ${via.name}` : "  (next-hop currently unresolvable)"));
  }
  for(const r of ((dev.d && dev.d.ospfRoutes) || []))
    out.push(pad(r.net + "/" + r.bits, 20) + `*[OSPF/10]   to ${r.nh} via ${r.via}`);
  for(const r of ((dev.d && dev.d.bgpRoutes) || []))
    out.push(pad(r.net + "/" + r.bits, 20) + `*[BGP/170]   to ${r.nh} (learned from AS${r.fromAs})`);
  if(!out.length) return "inet.0: 0 destinations — no routes yet";
  return `inet.0: ${out.length} destinations\n` + out.join("\n");
}
function showArpCmd(dev){
  const e = Object.entries(dev.arp || {});
  if(!e.length) return "(empty — the ARP cache fills when traffic flows)";
  const rows = [["MAC Address", "Address", "Interface"]];
  for(const [ip, a] of e) rows.push([a.mac, ip, a.iface]);
  return rows.map(r => pad(r[0], 20) + pad(r[1], 17) + r[2]).join("\n");
}
function showStpCmd(dev){
  const d = D(dev);
  if(!d.rstp) return { text: "RSTP is not enabled on this switch.\n(enable it with: set protocols rstp — without spanning tree, a physical loop becomes a broadcast storm)", err: true };
  const root = NET.stpRoot[dev.id];
  const head = root === dev.id ? "This switch is the root bridge." : `Root bridge: ${root ? hostnameOf(devices[root]) : "(no switch-to-switch links)"}`;
  const rows = [["Interface", "Role", "State"]];
  for(const key of Object.keys(NET.edgeByPort)){
    if(!key.startsWith(dev.id + ":")) continue;
    const port = key.slice(dev.id.length + 1);
    const e = NET.edgeByPort[key];
    if(!devices[e.other.dev] || devices[e.other.dev].type !== "switch") continue;
    const blockedHere = NET.blocked.has(key);
    rows.push([port, blockedHere ? "ALT" : "DESG", blockedHere ? "BLK (discarding)" : "FWD (forwarding)"]);
  }
  // blocked ports are excluded from edgeByPort? no — edges are registered with blocked flag; also show blocked keys
  for(const b of NET.blocked){
    if(b.startsWith(dev.id + ":")){
      const port = b.slice(dev.id.length + 1);
      if(!rows.some(r => r[0] === port)) rows.push([port, "ALT", "BLK (discarding)"]);
    }
  }
  if(rows.length === 1) return head + "\n(no switch-to-switch links on this switch)";
  return head + "\n" + rows.map(r => pad(r[0], 12) + pad(r[1], 6) + r[2]).join("\n");
}
function showLacpCmd(dev){
  const info = (NET && NET.aeInfo[dev.id]) || {};
  if(!Object.keys(info).length) return "(no aggregated interfaces configured — set interfaces <port> ether-options 802.3ad ae0)";
  const out = [];
  for(const [ae, i] of Object.entries(info)){
    out.push(`Aggregated interface: ${ae}   LACP: ${i.lacp || "NOT CONFIGURED"}   Status: ${i.up ? "up" : "down"}`);
    for(const m of i.members)
      out.push(`  ${pad(m.port, 12)}${m.state}${m.why ? "  (" + m.why + ")" : ""}`);
    if(!i.members.length) out.push("  (no member ports — set interfaces <port> ether-options 802.3ad " + ae + ")");
  }
  return out.join("\n");
}
function showOspfNbrCmd(dev){
  if(!Object.keys(D(dev).ospf || {}).length)
    return { text: "OSPF is not enabled on this device (set protocols ospf area 0 interface <ifname>)", err: true };
  const n = D(dev).ospfNeighbors || [];
  if(!n.length) return "No OSPF neighbors yet — interfaces are enabled, but nobody reached Full.\n(Neighbors need: same subnet, a working L2 path, and non-passive on both ends.)";
  const rows = [["Address", "Interface", "State", "Neighbor"]];
  for(const x of n) rows.push([x.addr, x.iface, "Full", x.name]);
  return rows.map(r => pad(r[0], 17) + pad(r[1], 14) + pad(r[2], 7) + r[3]).join("\n");
}
function showNatCmd(dev){
  const rules = D(dev).natRules || [];
  if(!rules.length) return "(no source NAT configured — private LANs need it before the internet can reply)";
  return rules.map(r =>
    `rule-set ${r.set} rule ${r.rule}:  from ${r.fromIf || "any"}  to ${r.toIf || "?"}  match [ ${r.match.map(m => m.ip + "/" + m.bits).join(" ") || "any"} ]  then source-nat interface`).join("\n");
}
function showDhcpBindingCmd(dev){
  const leases = Object.entries(dev.leases || {});
  if(!leases.length) return "(no DHCP bindings — leases appear when clients run dhclient)";
  const rows = [["IP address", "MAC address", "State"]];
  for(const [mac, ip] of leases) rows.push([ip, mac, "BOUND"]);
  return rows.map(r => pad(r[0], 17) + pad(r[1], 20) + r[2]).join("\n");
}
function showLogCmd(dev){
  const logl = dev.syslog || [];
  return logl.length ? logl.slice(-50).join("\n") : "(log is empty)";
}
function showChassisEnvCmd(dev){
  const t = (typeof THERMAL !== "undefined" && THERMAL.devices[dev.id]) || 21;
  const st = t >= 45 ? "Too hot" : t >= 35 ? "Check" : "OK";
  return [
    pad("Class", 7) + pad("Item", 18) + pad("Status", 10) + "Measurement",
    pad("Temp", 7) + pad("Chassis ambient", 18) + pad(st, 10) + t.toFixed(1) + " degrees C",
    pad("Temp", 7) + pad("Routing Engine", 18) + pad(st, 10) + (t + 6).toFixed(1) + " degrees C",
    pad("Fans", 7) + pad("Fan tray", 18) + pad("OK", 10) + (t >= 35 ? "full speed" : "spinning normally"),
  ].join("\n");
}
function showCommitCmd(dev){
  const log = dev.commitLog || [];
  if(!log.length) return "no commits recorded this session\n(the history starts when you commit; add a note with: commit comment \"why\")";
  return log.map((c2, i2) =>
    String(i2).padEnd(4) + new Date(c2.ts).toISOString().replace("T", " ").slice(0, 19) + " UTC by " +
    c2.user + " via cli" + (c2.confirmed ? " commit confirmed" : "") +
    (c2.comment ? "\n    " + c2.comment : "")).join("\n");
}
function rescueSaveCmd(dev){
  dev.rescue = deepClone(dev.config);
  devLog(dev, "rescue configuration saved");
  return "rescue configuration saved\n(a known-good config to fall back to: rollback rescue, then commit)";
}
function showVersionCmd(dev){
  const model = dev.model || (dev.type === "switch" ? "ex4300-48t" : "mx204");
  return `Hostname: ${hostnameOf(dev)}\nModel: ${model.toLowerCase()} (lab)\nJunos: 23.4R1.10 (JunOS Lab edition)`;
}
function showConfigCmd(dev){
  return Object.keys(dev.config).length ? treeToText(dev.config) : "## Last commit: never\n## (factory-default — empty configuration)";
}
function treeToDisplaySet(t, prefix){
  prefix = prefix || [];
  const out = [];
  for(const [k, v] of Object.entries(t)){
    if(v === true) out.push("set " + [...prefix, k].join(" "));
    else if(Array.isArray(v)) v.forEach(item => out.push("set " + [...prefix, k, item].join(" ")));
    else if(v && typeof v === "object"){
      if(!Object.keys(v).length) out.push("set " + [...prefix, k].join(" "));
      else out.push(...treeToDisplaySet(v, [...prefix, k]));
    }
    else out.push("set " + [...prefix, k, v].join(" "));
  }
  return out;
}
function showConfigSetCmd(dev){
  const ls = treeToDisplaySet(dev.config);
  return ls.length ? ls.join("\n") : "## (factory-default — empty configuration)";
}

const OP_SPECS = {
  switch: [
    ["configure", { help: "Enter configuration mode", fn: dev => { dev.cli.mode = "cfg"; dev.cli.editKeys = []; return "Entering configuration mode\n[edit]"; } }],
    ["show configuration", { help: "The committed (active) configuration", fn: showConfigCmd }],
    ["show configuration | display set", { help: "The active config as set commands (paste-able)", fn: showConfigSetCmd }],
    ["show interfaces terse", { help: "Interface summary", fn: showTerse }],
    ["show interfaces <interface:physport>", { help: "One port in detail: link state, MAC, real traffic counters", fn: showIfaceDetailCmd }],
    ["monitor interface <interface:physport>", { help: "Traffic counters for one port (snapshot)", fn: monitorIfaceCmd }],
    ["show vlans", { help: "VLANs and member ports", fn: showVlansCmd }],
    ["show ethernet-switching table", { help: "Learned MAC addresses", fn: showMacTable }],
    ["show route", { help: "Routing table", fn: showRouteCmd }],
    ["show arp", { help: "ARP cache", fn: showArpCmd }],
    ["show spanning-tree interface", { help: "RSTP port roles and states", fn: showStpCmd }],
    ["show vrrp", { help: "Virtual gateway groups: who is master right now", fn: showVrrpCmd }],
    ["show lacp interfaces", { help: "LACP bundle status", fn: showLacpCmd }],
    ["show ospf neighbor", { help: "OSPF adjacencies", fn: showOspfNbrCmd }],
    ["show chassis environment", { help: "Temperatures and fans", fn: showChassisEnvCmd }],
    ["show dhcp server binding", { help: "Leases handed out by this device", fn: showDhcpBindingCmd }],
    ["show lldp neighbors", { help: "Who is cabled to which port — the cable-tracing tool", fn: showLldpCmd }],
    ["show poe interface", { help: "PoE power per port and the chassis budget", fn: showPoeCmd }],
    ["show log messages", { help: "Recent system events (commits, link flaps, storms)", fn: showLogCmd }],
    ["show system commit", { help: "Commit history: when, by whom, and the comment that says WHY", fn: showCommitCmd }],
    ["request system configuration rescue save", { help: "Keep the current config as the known-good fallback (rollback rescue)", fn: rescueSaveCmd }],
    ["show version", { help: "Software version", fn: showVersionCmd }],
    ["ping <target:ip>", { help: "Ping from this device (sources from an irb)", fn: (dev, keys) => { const r = doDevicePing(dev, keys[1]); return joinLines(r); } }],
    ["traceroute <target:ip>", { help: "Trace the L3 path", fn: (dev, keys) => joinLines(doTraceroute(dev, keys[1])) }],
    ["clear ethernet-switching table", { help: "Flush learned MACs", fn: dev => { dev.macTable = []; return "ethernet-switching table flushed"; } }],
    ["clear ethernet-switching error-disable <interface:physport>", { help: "Recover a storm-control-disabled port", fn: (dev, keys) => {
      const port = keys[3];
      if(!dev.errDisabled[port]) return { text: port + " is not error-disabled", err: true };
      delete dev.errDisabled[port];
      devLog(dev, `L2ALD: ${port} recovered from error-disable by kaatje`);
      rebuildAllDerived(); touchState();
      return port + " recovered";
    } }],
    ["exit", { help: "(sessions close from the tab bar)", fn: () => "(this is the operational prompt — close the session from the tab bar or ✕)" }],
  ],
  router: [
    ["configure", { help: "Enter configuration mode", fn: dev => { dev.cli.mode = "cfg"; dev.cli.editKeys = []; return "Entering configuration mode\n[edit]"; } }],
    ["show configuration", { help: "The committed (active) configuration", fn: showConfigCmd }],
    ["show configuration | display set", { help: "The active config as set commands (paste-able)", fn: showConfigSetCmd }],
    ["show interfaces terse", { help: "Interface summary", fn: showTerse }],
    ["show interfaces <interface:physport>", { help: "One port in detail: link state, MAC, real traffic counters", fn: showIfaceDetailCmd }],
    ["monitor interface <interface:physport>", { help: "Traffic counters for one port (snapshot)", fn: monitorIfaceCmd }],
    ["show route", { help: "Routing table", fn: showRouteCmd }],
    ["show arp", { help: "ARP cache", fn: showArpCmd }],
    ["show ospf neighbor", { help: "OSPF adjacencies", fn: showOspfNbrCmd }],
    ["show bgp summary", { help: "BGP neighbors and session state", fn: showBgpCmd }],
    ["show security nat source", { help: "Source NAT rules", fn: showNatCmd }],
    ["show chassis environment", { help: "Temperatures and fans", fn: showChassisEnvCmd }],
    ["show dhcp server binding", { help: "Leases handed out by this device", fn: showDhcpBindingCmd }],
    ["show lldp neighbors", { help: "Who is cabled to which port — the cable-tracing tool", fn: showLldpCmd }],
    ["show log messages", { help: "Recent system events (commits, link flaps)", fn: showLogCmd }],
    ["show system commit", { help: "Commit history: when, by whom, and the comment that says WHY", fn: showCommitCmd }],
    ["request system configuration rescue save", { help: "Keep the current config as the known-good fallback (rollback rescue)", fn: rescueSaveCmd }],
    ["show version", { help: "Software version", fn: showVersionCmd }],
    ["ping <target:ip>", { help: "Ping from this device", fn: (dev, keys) => joinLines(doDevicePing(dev, keys[1])) }],
    ["traceroute <target:ip>", { help: "Trace the L3 path", fn: (dev, keys) => joinLines(doTraceroute(dev, keys[1])) }],
    ["exit", { help: "(sessions close from the tab bar)", fn: () => "(this is the operational prompt — close the session from the tab bar or ✕)" }],
  ],
};
function joinLines(ls){
  if(!ls.length) return "";
  const err = ls.some(l => l.cls === "err");
  return { text: ls.map(l => l.text).join("\n"), err };
}
const OP_TRIE = {
  switch: buildTrie(OP_SPECS.switch.map(([s, o]) => [s, { ...o, kind: "op" }])),
  router: buildTrie(OP_SPECS.router.map(([s, o]) => [s, { ...o, kind: "op" }])),
};

/* ============================================================
   WI-FI — association helpers (APs are cloud-managed: no CLI)
   ============================================================ */
function apDistance(host, ap){
  const [hx, hy] = devCenter(host), [ax, ay] = devCenter(ap);
  return Math.hypot(hx - ax, hy - ay);
}
function apInRange(host, ap){
  return apDistance(host, ap) <= (ap.cfg.radius || 160);
}
function wifiLinkOf(hostId){
  return Object.entries(links).find(([, l]) =>
    (l.kind === "wifi") && (l.a.dev === hostId || l.b.dev === hostId)) || null;
}
function wifiScan(host){
  const aps = Object.values(devices).filter(d => d.type === "ap" && !POE.denied[d.id]);
  if(!aps.length) return "no wireless networks found" +
    (Object.values(devices).some(d => d.type === "ap")
      ? " (there IS an access point — but a dark AP does not beacon. Check its PoE.)"
      : " (no access points on the canvas)");
  return aps.map(ap => {
    const d = Math.round(apDistance(host, ap) * M_PER_PX);
    const inR = apInRange(host, ap);
    return `${pad(ap.cfg.ssid, 22)}${pad(ap.model || "AP", 8)}signal: ${inR ? (d < (ap.cfg.radius || 160) * M_PER_PX / 2 ? "strong" : "ok") : "OUT OF RANGE"} (${d}m)`;
  }).join("\n");
}
function wifiJoin(host, ssid){
  const ap = Object.values(devices).find(d => d.type === "ap" && d.cfg.ssid === ssid);
  if(!ap) return { err: true, text: `no such network "${ssid}" — try wifi scan` };
  if(POE.denied[ap.id])
    return { err: true, text: `"${ssid}" does not answer — that AP has no power (${POE.denied[ap.id]}). No PoE, no Wi-Fi.` };
  if(isLinked(host.id, "eth0") && !wifiLinkOf(host.id))
    return { err: true, text: "eth0 has a cable plugged in — unplug it first (this lab's hosts have one active NIC)" };
  if(!apInRange(host, ap))
    return { err: true, text: `"${ssid}" is out of range — move closer (the dashed circle around the AP is its coverage)` };
  const old = wifiLinkOf(host.id);
  if(old) delete links[old[0]];
  const n = Object.values(links).filter(l => l.kind === "wifi" && (l.a.dev === ap.id || l.b.dev === ap.id)).length;
  links[uid("lk")] = { a: { dev: host.id, port: "eth0" }, b: { dev: ap.id, port: "wlan" + n }, kind: "wifi" };
  rebuildAllDerived();
  if(typeof touchState === "function") touchState();
  return { err: false, text: `associated with "${ssid}" — now get an address: dhclient eth0` };
}
function wifiLeave(host){
  const old = wifiLinkOf(host.id);
  if(!old) return { err: true, text: "not associated with any network" };
  delete links[old[0]];
  rebuildAllDerived();
  if(typeof touchState === "function") touchState();
  return { err: false, text: "disassociated" };
}

/* ============================================================
   SERVICES — DNS resolution and HTTP, the real start of traffic
   ============================================================ */
function resolveName(host, name){
  if(validIp(name)) return { ok: true, ip: name };
  const ns = host.cfg.ns;
  if(!ns) return { ok: false, text: "no nameserver configured on this machine — set one first: nameserver <dns-ip>" };
  const srv = Object.values(devices).find(d => d.type === "server" && d.cfg.ip === ns);
  if(!srv) return { ok: false, text: `nameserver ${ns} exists in the config, but nothing at that address is a DNS server` };
  if(!pingRun(host, ns, {}).ok)
    return { ok: false, text: `nameserver ${ns} is unreachable — every by-name connection starts with DNS, so fix the path to it first` };
  if(!srv.cfg.services || !srv.cfg.services.dns)
    return { ok: false, text: `${srv.name} is reachable but not running DNS (on it: service start dns)` };
  const rec = (srv.cfg.records || {})[String(name).toLowerCase()];
  if(!rec) return { ok: false, text: `NXDOMAIN — ${srv.name} has no record for "${name}" (on it: dns add ${name} <ip>)` };
  return { ok: true, ip: rec, via: srv.name };
}
function curlCheck(host, target){
  const r = resolveName(host, target);
  if(!r.ok) return { ok: false, text: `curl: could not resolve host: ${target}\n  ${r.text}` };
  const reach = pingRun(host, r.ip, { proto: "tcp" });
  if(!reach.ok){
    const why = reach.lines.filter(l => l.cls === "err").map(l => l.text.split("\n")[0]).join(" ");
    return { ok: false, text: `curl: connect to ${r.ip} port 80 failed\n  ${why}` };
  }
  const srv = Object.values(devices).find(d => d.type === "server" && d.cfg.ip === r.ip);
  if(!srv || !srv.cfg.services || !srv.cfg.services.http)
    return { ok: false, text: `curl: connection refused by ${r.ip} — the network path works, but nothing is listening on port 80` };
  return { ok: true, text:
    `HTTP/1.1 200 OK\nServer: ${srv.name}\n\n<h1>It works — served by ${srv.name}</h1>` +
    (r.via ? `\n(resolved ${target} -> ${r.ip} via ${r.via})` : "") };
}
