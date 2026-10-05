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
    routes: [], vlans: {}, rstp: false, filters: {}, stormProfiles: {}, vrrp: [], vc: null,
  };
  const vcCfg = cfgGet(c, ["virtual-chassis"]);
  if(vcCfg){
    const members = [];
    const mcfg = vcCfg.member || {};
    for(const mid in mcfg)
      members.push({ id: parseInt(mid, 10), role: mcfg[mid].role || "line-card", serial: mcfg[mid]["serial-number"] || null });
    members.sort((a, b) => a.id - b.id);
    d.vc = { preprovisioned: !!vcCfg.preprovisioned, members };
  }
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
    const nvRaw = ic && ic["native-vlan-id"];
    const nativeVlan = nvRaw !== undefined ? parseInt([].concat(nvRaw)[0], 10) : null;
    return { has, mode, vlanNames: names, vlanIds, nativeVlan,
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
        disabled: !!ic.disable, desc: ic.description || null, mtu: ic.mtu ? parseInt(ic.mtu, 10) : 1514,
        ae: (cfgGet(ic, ["ether-options", "802.3ad"])) || null,
        mode: es.mode, vlanNames: es.vlanNames, vlanIds: es.vlanIds, storm: es.storm,
        nativeVlan: es.nativeVlan,
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
      if(owner) d.irbByVlan[d.vlans[owner[0]].id] = u;
    }
  }

  if(dev.type === "router"){
    for(const p of dev.ports){
      const ic = ifs[p.id] || {};
      d.portCfg[p.id] = { disabled: !!ic.disable, desc: ic.description || null, ae: null, mtu: ic.mtu ? parseInt(ic.mtu, 10) : 1514 };
      const addrObj = cfgGet(ic, ["unit", "0", "family", "inet", "address"]) || [];
      if(addrObj && !Array.isArray(addrObj)){
        for(const pfx in addrObj){
          const vg = addrObj[pfx] && addrObj[pfx]["vrrp-group"];
          if(!vg) continue;
          for(const gid in vg){
            const g = vg[gid] || {};
            if(!g["virtual-address"]) continue;
            d.vrrp.push({
              port: p.id, group: parseInt(gid, 10), vip: g["virtual-address"],
              priority: g.priority ? parseInt(g.priority, 10) : 100,
              preempt: !!g.preempt, realIp: parsePrefix(pfx) ? parsePrefix(pfx).ip : null,
            });
          }
        }
      }
      const addr = (Array.isArray(addrObj) ? addrObj : Object.keys(addrObj)).map(parsePrefix).filter(Boolean)[0];
      if(addr) d.l3ports[p.id] = {
        ip: addr.ip, bits: addr.bits, mtu: ic.mtu ? parseInt(ic.mtu, 10) : 1514,
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
    if(!p) continue;
    const nhs = r && r["next-hop"];
    for(const nh of (Array.isArray(nhs) ? nhs : [nhs]))
      if(validIp(nh || "")) d.routes.push({ net: p.ip, bits: p.bits, nh });
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
    if(net) d.pools.push({ name: pname, net, ranges, router: validIp(router || "") ? router : null });
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
      if(typeof strictOn === "function" && strictOn()){
        const numA = parseInt(ea.port.replace("ae", ""), 10), numB = parseInt(eb.port.replace("ae", ""), 10);
        if(numA >= chassisAeCount(devA) || numB >= chassisAeCount(devB)){ NET.linkStatus[lid] = "lacp-fail"; continue; }
      }
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
      if(typeof strictOn === "function" && strictOn() && parseInt(ae.replace("ae", ""), 10) >= chassisAeCount(dev)){
        members.forEach(m => { m.state = "Detached"; m.why = "chassis aggregated-devices not configured"; });
      }
      const activeCount = members.filter(m => m.state === "Collecting distributing").length;
      const minCfg = cfgGet(dev.config, ["interfaces", ae, "aggregated-ether-options", "minimum-links"]);
      const minLinks = minCfg ? parseInt([].concat(minCfg)[0], 10) : 1;
      let up = activeCount >= Math.max(1, minLinks);
      let minWhy = null;
      if(activeCount > 0 && !up){
        minWhy = "minimum-links " + minLinks + " not met (" + activeCount + " up)";
        members.forEach(m => { if(m.state === "Collecting distributing"){ m.state = "Detached"; m.why = minWhy; } });
      }
      info[ae] = { members, up, lacp: aeCfg.lacp, minLinks, activeCount, minWhy };
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
    const poeCfg = cfgGet(sw.config, ["poe", "interface"]) || {};
    const prioRank = { critical: 0, high: 1, low: 3 };
    for(let i = list.length - 1; i >= 0; i--){
      const pc = poeCfg[list[i].port];
      if(pc && pc.disable){
        POE.denied[list[i].ap.id] = "PoE is administratively disabled on " + list[i].port;
        list.splice(i, 1);
      }
    }
    list.sort((x, y) => {
      const px = poeCfg[x.port] && poeCfg[x.port].priority;
      const py = poeCfg[y.port] && poeCfg[y.port].priority;
      const rx = prioRank[[].concat(px || "none")[0]] !== undefined ? prioRank[[].concat(px)[0]] : 2;
      const ry = prioRank[[].concat(py || "none")[0]] !== undefined ? prioRank[[].concat(py)[0]] : 2;
      return rx - ry || String(x.port).localeCompare(String(y.port), undefined, { numeric: true });
    });
    let used = 0;
    for(const { ap, port } of list){
      const draw = apPoeDraw(ap);
      const pcap = poeCfg[port] && poeCfg[port]["maximum-power"];
      const cap = pcap ? parseInt([].concat(pcap)[0], 10) : null;
      if(cap !== null && draw > cap){
        POE.denied[ap.id] = "needs " + draw + " W but the port is capped at " + cap + " W";
        continue;
      }
      if(used + draw <= budget) used += draw;
      else POE.denied[ap.id] = "PoE budget exceeded on " + sw.name + " (" + budget + " W)";
    }
    POE.used[swId] = used;
  }
}
function showAnalyzerCmd(dev){
  const an = cfgGet(dev.config, ["forwarding-options", "analyzer"]) || {};
  const names = Object.keys(an);
  if(!names.length) return "(no analyzer configured \u2014 set forwarding-options analyzer <name> input ingress interface <port>)";
  const out = [];
  for(const n of names){
    const a = an[n] || {};
    const ing = cfgGet(a, ["input", "ingress", "interface"]) || [];
    const egr = cfgGet(a, ["input", "egress", "interface"]) || [];
    const dst = cfgGet(a, ["output", "interface"]);
    const dstPort = dst ? [].concat(dst)[0] : null;
    out.push("Analyzer name: " + n);
    out.push("  Mirrored interfaces (ingress): " + ([].concat(ing).join(", ") || "none"));
    out.push("  Mirrored interfaces (egress):  " + ([].concat(egr).join(", ") || "none"));
    out.push("  Output interface:              " + (dstPort || "none \u2014 mirrored traffic has nowhere to go"));
    if(dstPort && !dev.ports.some(p => p.id === dstPort))
      out.push("  warning: output interface is not a port on this device");
    if(dstPort && ([].concat(ing).includes(dstPort) || [].concat(egr).includes(dstPort)))
      out.push("  warning: the output port is also being mirrored \u2014 that loops the copy back on itself");
  }
  return out.join("\n");
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
    const pc = (cfgGet(dev.config, ["poe", "interface", me.port]) || {});
    const admin = pc.disable ? "Disabled" : "Enabled ";
    const prio = pc.priority ? [].concat(pc.priority)[0] : "low";
    rows.push(String(me.port).padEnd(14) + admin + "  " +
      (denied ? "OFF (denied)  0.0W     " : "ON        " + apPoeDraw(other).toFixed(1) + "W    ") +
      String(prio).padEnd(9) + other.name +
      (other.cfg && other.cfg.injector ? "  (external injector)" : "") +
      (denied ? "   [" + denied + "]" : ""));
  }
  const used = POE.used[dev.id] || 0;
  return "Interface     Admin     Oper          Power    Priority Device\n" +
    (rows.length ? rows.join("\n") : "(no powered devices on any port)") +
    "\n\nPoE budget: " + used.toFixed(1) + "W used of " + budget.toFixed(1) + "W";
}
var CONV = { map: {}, seen: new Set() };
var CONV_NOW = function(){ return Date.now(); };
function convAge(key){
  CONV.seen.add(key);
  if(!CONV.map[key]) CONV.map[key] = CONV_NOW();
  return CONV_NOW() - CONV.map[key];
}
function convPrune(){
  for(const k of Object.keys(CONV.map)) if(!CONV.seen.has(k)) delete CONV.map[k];
  CONV.seen = new Set();
}
function convPending(){
  const now = CONV_NOW();
  return Object.values(CONV.map).some(t => now - t < 6000);
}
function rebuildAllDerived(){
  const __post = () => { try{ trackFlaps(); }catch(e){} };
  setTimeout ? null : null;
  for(const dev of Object.values(devices))
    if(dev.type === "switch" || dev.type === "router") dev.d = deriveDev(dev);
  computePoe();
  computeNet();
  computeVrrp();
  computeVc();

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
        if(typeof strictOn === "function" && strictOn()){
          const age = convAge("bgp:" + dev.id + "|" + nip);
          if(age < 2500){ peer.state = "Connect"; peer.reason = "TCP session opening (strict timing)"; continue; }
          if(age < 5000){ peer.state = "OpenConfirm"; peer.reason = "OPEN exchanged, waiting on keepalives (strict timing)"; continue; }
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
    let full = true;
    let mtuA = (a.iface && a.iface.mtu) || 1514, mtuB = (b.iface && b.iface.mtu) || 1514;
    if(mtuA !== mtuB){
      const stA = "ExStart (MTU mismatch: " + mtuA + " vs " + mtuB + ")";
      a.dev.d.ospfNeighbors.push({ addr: b.iface.ip, iface: a.iface.name, name: hostnameOf(b.dev), state: stA });
      b.dev.d.ospfNeighbors.push({ addr: a.iface.ip, iface: b.iface.name, name: hostnameOf(a.dev), state: stA });
      continue;
    }
    if(typeof strictOn === "function" && strictOn()){
      const k = "ospf:" + [a.dev.id + a.iface.name, b.dev.id + b.iface.name].sort().join("|");
      full = convAge(k) >= 6000;
    }
    if(full){
      if(!nbrs.has(a.dev.id)) nbrs.set(a.dev.id, []);
      if(!nbrs.has(b.dev.id)) nbrs.set(b.dev.id, []);
      nbrs.get(a.dev.id).push({ to: b.dev.id, ifName: a.iface.name, nhIp: b.iface.ip });
      nbrs.get(b.dev.id).push({ to: a.dev.id, ifName: b.iface.name, nhIp: a.iface.ip });
    }
    const st = full ? "Full" : "ExStart";
    a.dev.d.ospfNeighbors.push({ addr: b.iface.ip, iface: a.iface.name, name: hostnameOf(b.dev), state: st });
    b.dev.d.ospfNeighbors.push({ addr: a.iface.ip, iface: b.iface.name, name: hostnameOf(a.dev), state: st });
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
    out.push({ port: p.id, mode: pc.mode, vlanIds: pc.vlanIds, nativeVlan: pc.nativeVlan });
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
        else if(pi.mode === "trunk" && pi.nativeVlan !== null && !isNaN(pi.nativeVlan) &&
                pi.vlanIds.includes(pi.nativeVlan)) enterSwVlan(toDev, pi.nativeVlan, newPath);
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
        q.push(() => traverseEdge(sw.id, p.port, p.nativeVlan !== vlanId, vlanId, path));
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
      out.push({ name: port + ".0", port, ip: l3.ip, bits: l3.bits, fIn: l3.fIn, fOut: l3.fOut, mtu: l3.mtu || 1514,
        seed: { type: "port", dev: dev.id, port }, up: isLinked(dev.id, port) && !(pc && pc.disabled),
        mac: macOf(dev.id, port) });
    }
  } else if(dev.type === "switch"){
    for(const [unit, irb] of Object.entries(D(dev).irbs)){
      if(isNaN(irb.vlanId)) continue;
      const carried = effSwitchPorts(dev).some(p => p.vlanIds.includes(irb.vlanId));
      out.push({ name: "irb." + unit, unit, ip: irb.ip, bits: irb.bits, fIn: irb.fIn, fOut: irb.fOut,
        seed: { type: "vlan", dev: dev.id, vlanId: irb.vlanId }, up: carried, mac: macOf(dev.id, "irb." + unit) });
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
      if(isVrrpVip(d, ip)) return d;
      if(d.d && d.d.me0 && d.d.me0.ip === ip) return d;
    }
  }
  return null;
}
/* LLDP: the lab knows every cable, so neighbors are simply the live links.
   PCs stay silent (no lldpd), and console leads carry no frames. */
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
function showVrrpCmd(dev){
  const mine = [];
  for(const k in (NET.vrrp || {})){
    const g = NET.vrrp[k];
    const m = g.members.find(x => x.dev === dev.id);
    if(m) mine.push({ g, m });
  }
  if(!mine.length) return "(no VRRP groups configured on this device)";
  const rows = [["Interface", "Group", "State", "Priority", "Virtual-address"]];
  for(const { g, m } of mine)
    rows.push([m.port, String(g.group), m.state, String(m.priority), g.vip]);
  return rows.map(r => pad(r[0], 14) + pad(r[1], 8) + pad(r[2], 10) + pad(r[3], 10) + r[4]).join("\n") +
    "\n\n(master answers for the virtual address; backup takes over within seconds if the master's link fails)";
}
function computeVc(){
  NET.vc = {};
  const configured = Object.values(devices).filter(dv =>
    dv.type === "switch" && dv.d && dv.d.vc && dv.d.vc.members.length);
  if(!configured.length) return;
  const seen = new Set();
  for(const start of configured){
    if(seen.has(start.id)) continue;
    const group = [];
    const queue = [start];
    seen.add(start.id);
    while(queue.length){
      const cur = queue.shift();
      group.push(cur);
      for(const lid in links){
        const l = links[lid];
        let other = null;
        if(l.a.dev === cur.id) other = devices[l.b.dev];
        else if(l.b.dev === cur.id) other = devices[l.a.dev];
        if(!other || seen.has(other.id)) continue;
        if(other.type !== "switch" || !other.d || !other.d.vc || !other.d.vc.members.length) continue;
        if(NET.linkStatus[lid] !== "up") continue;
        seen.add(other.id);
        queue.push(other);
      }
    }
    if(group.length < 2) continue;
    const slots = [];
    group.forEach((dv, idx) => {
      const declared = dv.d.vc.members[Math.min(idx, dv.d.vc.members.length - 1)];
      slots.push({ dev: dv, id: declared ? declared.id : idx, role: declared ? declared.role : "line-card" });
    });
    slots.sort((a, b) => a.id - b.id);
    const reCapable = slots.filter(sl => sl.role === "routing-engine");
    const master = (reCapable[0] || slots[0]).dev.id;
    const backup = reCapable.length > 1 ? reCapable[1].dev.id : null;
    const vcid = "vc:" + group.map(dv => dv.id).sort().join("+");
    for(const sl of slots){
      NET.vc[sl.dev.id] = {
        vcid, memberId: sl.id, role: sl.role,
        state: sl.dev.id === master ? "master" : (sl.dev.id === backup ? "backup" : "linecard"),
        peers: group.filter(dv => dv.id !== sl.dev.id).map(dv => dv.id),
        size: group.length,
      };
    }
  }
}
function vcMasterOf(dev){
  const info = NET.vc && NET.vc[dev.id];
  if(!info) return null;
  for(const id in NET.vc)
    if(NET.vc[id].vcid === info.vcid && NET.vc[id].state === "master") return devices[id] || null;
  return null;
}
function showVcCmd(dev){
  const info = NET.vc && NET.vc[dev.id];
  const d = D(dev);
  if(!info){
    if(d.vc && d.vc.members.length)
      return "Virtual Chassis is configured on this member, but no other configured member is reachable.\n" +
        "(a VC needs at least two configured switches with an up link between them)";
    return "(virtual-chassis is not configured on this switch)";
  }
  const rows = [["Member", "Role", "State", "Switch"]];
  const ids = Object.keys(NET.vc).filter(id => NET.vc[id].vcid === info.vcid)
    .sort((a, b) => NET.vc[a].memberId - NET.vc[b].memberId);
  for(const id of ids){
    const v = NET.vc[id];
    rows.push([String(v.memberId), v.role, v.state, hostnameOf(devices[id])]);
  }
  return "Virtual Chassis ID: " + info.vcid.replace("vc:", "") +
    (d.vc && d.vc.preprovisioned ? "  (preprovisioned)" : "") + "\n" +
    rows.map(r => pad(r[0], 9) + pad(r[1], 17) + pad(r[2], 11) + r[3]).join("\n") +
    "\n\n" + info.size + " members act as ONE logical switch \u2014 configure the master, and the whole VC follows.";
}
function computeVrrp(){
  NET.vrrp = {};
  const groups = new Map();
  for(const dev of Object.values(devices)){
    if(dev.type !== "router" && dev.type !== "switch") continue;
    for(const g of ((dev.d && dev.d.vrrp) || [])){
      const key = g.vip + "|" + g.group;
      if(!groups.has(key)) groups.set(key, []);
      const pc = (dev.d.portCfg || {})[g.port];
      const linked = isLinked(dev.id, g.port);
      const usable = linked && !(pc && pc.disabled) && dev.powered !== false;
      groups.get(key).push({ dev, g, usable });
    }
  }
  for(const [key, members] of groups){
    const live = members.filter(m => m.usable);
    // Highest priority wins; ties break on highest real address, like real VRRP.
    live.sort((a, b) => b.g.priority - a.g.priority ||
      (ipToInt32(b.g.realIp || "0.0.0.0") - ipToInt32(a.g.realIp || "0.0.0.0")));
    const master = live[0] || null;
    NET.vrrp[key] = {
      vip: members[0].g.vip, group: members[0].g.group,
      master: master ? master.dev.id : null,
      members: members.map(m => ({
        dev: m.dev.id, port: m.g.port, priority: m.g.priority, preempt: m.g.preempt,
        state: !m.usable ? "init" : (master && m.dev.id === master.dev.id ? "master" : "backup"),
      })),
    };
  }
}
function ipToInt32(ip){
  return ip.split(".").reduce((a, o) => (a << 8) + (parseInt(o, 10) || 0), 0) >>> 0;
}
function vrrpMasterFor(vip){
  for(const k in (NET.vrrp || {})){
    const g = NET.vrrp[k];
    if(g.vip === vip && g.master) return devices[g.master] || null;
  }
  return null;
}
function isVrrpVip(dev, ip){
  for(const k in (NET.vrrp || {})){
    const g = NET.vrrp[k];
    if(g.vip === ip && g.master === dev.id) return true;
  }
  return false;
}
function ecmpHash(dev, dstIp, n){
  let h = 0;
  const key = (dev.id || "") + "|" + dstIp;
  for(let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % n;
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
    const equals = cands.filter(c => c.bits === best.bits && c.pref === best.pref && c.nh !== best.nh);
    if(equals.length){
      const set = [best, ...equals];
      const idx = ecmpHash(dev, dstIp, set.length);
      const chosen = set[idx];
      const viaE = up.find(i => sameSubnet(chosen.nh, i.ip, i.bits));
      return { type: "static", nh: chosen.nh, iface: viaE || null, route: chosen, proto: chosen.proto,
               ecmp: set.map(c => c.nh) };
    }
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
    const own = ifacesOf(node).find(i => i.ip === pkt.dst);
    if(own) return { ok: true, hops, segs, deliveredDev: node };
    if((node.type === "router" || node.type === "switch") && isVrrpVip(node, pkt.dst))
      return { ok: true, hops, segs, deliveredDev: node };
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
      : (l3eps.find(e => e.ip === targetIp) ||
         l3eps.find(e => e.dev && isVrrpVip(e.dev, targetIp)));
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
    segs.push(...found.ep.path.map(s => ({ ...s, srcMac: r.iface.mac, srcIp: pkt.src })));
    if(opts.learn) learnPath(node, r.iface, found, pkt);
    if(found.ip === pkt.dst){
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

function showCommitHistCmd(dev){
  const log = dev.commitLog || [];
  if(!log.length) return "(no commits yet on this device)";
  return log.map((c, i) =>
    pad(String(i), 4) + new Date(c.when).toISOString().replace("T", " ").slice(0, 19) + " UTC  by cli" +
    (i === 0 ? "   (current — rollback " + (i + 1) + " returns to the one below)" : "") +
    (c.comment ? "\n      " + c.comment : "")).join("\n") +
    "\n\n" + log.length + " commits kept (max 49) — rollback <n> loads any of them into the candidate";
}
function showIfStatsCmd(dev){
  const c = dev.ctr || {};
  const ports = dev.ports.map(p => p.id).filter(id => c[id]);
  if(!ports.length) return "(no traffic counted yet — pings and DHCP will move these numbers)";
  const rows = [["Interface", "In pkts", "Out pkts", "Errors", ""]];
  for(const id of ports){
    const degraded = Object.values(links).some(l =>
      ((l.a.dev === dev.id && l.a.port === id) || (l.b.dev === dev.id && l.b.port === id)) && l.degraded);
    rows.push([id, String(c[id].rx || 0), String(c[id].tx || 0), String(c[id].err || 0), ""]);
  }
  return rows.map(r => pad(r[0], 12) + pad(r[1], 10) + pad(r[2], 10) + pad(r[3], 9) + r[4]).join("\n");
}
function bumpCtr(dev, port, kind, n){
  if(!dev) return;
  dev.ctr = dev.ctr || {};
  dev.ctr[port] = dev.ctr[port] || { rx: 0, tx: 0, err: 0 };
  dev.ctr[port][kind] += n;
}
var LAB_RAND = function(){ return Math.random(); };
function countSegs(segs, n){
  for(const s of (segs || [])){
    const l = links[s.link];
    if(!l) continue;
    bumpCtr(devices[l.a.dev], l.a.port, "tx", n);
    bumpCtr(devices[l.b.dev], l.b.port, "rx", n);
  }
}
function degradedLoss(segs){
  for(const s of (segs || [])){
    const l = links[s.link];
    if(l && l.degraded && LAB_RAND() < 0.45){
      bumpCtr(devices[l.a.dev], l.a.port, "err", 1);
      bumpCtr(devices[l.b.dev], l.b.port, "err", 1);
      return l;
    }
  }
  return null;
}
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
    return { ok: true, lines: lines("out", pingOkText(target, 64, 0.05, opts)) };
  let srcIp;
  if(opts.source){
    const own = srcIfaces.find(i => i.ip === opts.source);
    if(!own) return { ok: false, lines: lines("err",
      "ping: sendto: Can't assign requested address\n" +
      "  (" + opts.source + " is not an address on this device — source must be one of its own:\n" +
      "   " + (srcIfaces.map(i => i.ip).join(", ") || "none") + ")") };
    srcIp = opts.source;
  } else {
    srcIp = (routeLookup(dev, target) || {}).iface ? routeLookup(dev, target).iface.ip : srcIfaces[0].ip;
  }
  if(opts.dnf){
    const eg = (routeLookup(dev, target) || {}).iface;
    const mtu = (eg && eg.mtu) || 1514;
    const need = pingSize(opts) + 28;
    if(need > mtu)
      return { ok: false, lines: lines("err",
        "ping: sendto: Message too long\n" +
        "  (" + need + " bytes with do-not-fragment set, but " + ((eg && eg.name) || "the egress interface") +
        " has MTU " + mtu + ")\n" +
        "  This is the real path-MTU test: without do-not-fragment the packet would just be\n" +
        "  fragmented and you would never learn the link was too narrow.") };
  }
  const pkt = { src: srcIp, dst: target, proto: opts.proto || "icmp" };
  const natTable = [], natEvents = [];
  const walkOpts = { ...opts, natTable, natEvents };
  const fwd = pingWalk(dev, pkt, walkOpts);
  const head = `PING ${target} (${target}): ${pingSize(opts)} data bytes`;
  if(fwd.ok){
    const gremlin = degradedLoss(fwd.segs);
    if(gremlin){
      countSegs(fwd.segs, 2);
      return { ok: false, lines: [
        { cls: "out", text: head },
        { cls: "err", text: "Request timeout — packets are being LOST mid-path, not blocked.\n(intermittent loss smells like a bad cable or dying optic: run show interfaces statistics and look for climbing errors)" +
          "\n\n" + pingLostText(target, opts) }] };
    }
  }
  const anim = (segs, ok, revSegs, meta) => {
    if(opts.animate && typeof animatePing === "function") animatePing(segs, ok, revSegs, meta);
  };
  if(!fwd.ok){
    anim(fwd.segs, false, null, { short: fwd.short, srcDev: dev, natEvents });
    return { ok: false, lines: [
      { cls: "out", text: head },
      { cls: "err", text: fwd.text + "\n\n" + pingLostText(target, opts) }] };
  }
  countSegs(fwd.segs, 2);
  // reply must be able to route back (to the NAT address, if we were translated)
  const backTo = natTable.length ? natTable[natTable.length - 1].natIp : srcIp;
  const rpkt = { src: target, dst: backTo, proto: opts.proto || "icmp" };
  const rev = pingWalk(fwd.deliveredDev, rpkt, walkOpts);
  if(!rev.ok){
    anim(fwd.segs, false, null, { short: "reply lost: " + (rev.short || "no return path"), srcDev: dev, natEvents });
    return { ok: false, lines: [
      { cls: "out", text: head },
      { cls: "err", text:
        `Request timeout  (your ping REACHED ${target}, but the reply died on the way back:\n  ${rev.text}\n  — asymmetric routing: the far side needs a route back to ${backTo})` +
        "\n\n" + pingLostText(target, opts) }] };
  }
  anim(fwd.segs, true, rev.segs, { natEvents });
  const ttl = 64 - fwd.hops.length;
  return { ok: true, lines: lines("out", pingOkText(target, ttl, 0.2 + fwd.hops.length * 0.17, opts)) };
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
  let ip = server.leases[mac];
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
  server.leaseMeta = server.leaseMeta || {};
  server.leaseMeta[mac] = { at: Date.now(), renewed: false };
  devLog(server, `JDHCPD: DHCPACK — leased ${ip} to ${mac} (pool ${pool.name}, lease 600s)`);
  if(typeof animateDhcp === "function") animateDhcp(srvEp.path);
  touchState();
  return lines("out",
    head +
    `\nDHCPOFFER of ${ip} from ${srvIface.ip}` +
    `\nDHCPREQUEST for ${ip} on eth0` +
    `\nDHCPACK — eth0: ${ip}/${pool.net.bits}` +
    (pool.router ? `, default gateway ${pool.router}` : "  (no router option in the pool — no gateway was set)"));
}
function pingCount(opts){
  const n = parseInt((opts || {}).count, 10);
  return (!isNaN(n) && n >= 1) ? Math.min(n, 50) : 2;
}
function pingSize(opts){
  const n = parseInt((opts || {}).size, 10);
  return (!isNaN(n) && n >= 0) ? Math.min(n, 65468) : 56;
}
function pingStatsText(target, sent, recv){
  const loss = sent ? ((sent - recv) * 100 / sent) : 0;
  return `--- ${target} ping statistics ---\n` +
    `${sent} packets transmitted, ${recv} packets received, ${loss.toFixed(1)}% packet loss`;
}
function pingLostText(target, opts){
  return pingStatsText(target, pingCount(opts), 0);
}
function pingOkText(target, ttl, ms, opts){
  const n = pingCount(opts), size = pingSize(opts), bytes = size + 8;
  const head = `PING ${target} (${target}): ${size} data bytes`;
  const rtt = i => Math.max(0.001, ms * (1 - i * 0.04));
  const stats = pingStatsText(target, n, n);
  const mn = rtt(n - 1), mx = rtt(0), avg = (mn + mx) / 2;
  const summary = `\nround-trip min/avg/max/stddev = ${mn.toFixed(3)}/${avg.toFixed(3)}/${mx.toFixed(3)}/0.0${n % 10} ms`;
  if(opts && opts.rapid)
    return head + "\n" + "!".repeat(n) + "\n\n" + stats + summary;
  const rows = [];
  for(let i = 0; i < n; i++)
    rows.push(`${bytes} bytes from ${target}: icmp_seq=${i} ttl=${ttl} time=${rtt(i).toFixed(3)} ms`);
  return head + "\n" + rows.join("\n") + "\n\n" + stats + summary;
}
function doDevicePing(dev, target, opts){
  const res = pingRun(dev, target, { ...(opts || {}), learn: true, animate: true });
  touchState();
  return res.lines;
}
function pingOptsFrom(keys){
  const o = {};
  for(let i = 2; i < keys.length; i++){
    const k = keys[i];
    if(k === "rapid") o.rapid = true;
    else if(k === "do-not-fragment") o.dnf = true;
    else if(k === "count") o.count = keys[++i];
    else if(k === "size") o.size = keys[++i];
    else if(k === "source") o.source = keys[++i];
  }
  return o;
}
function pingWithOpts(dev, keys){
  return joinLines(doDevicePing(dev, keys[1], pingOptsFrom(keys)));
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
var MAC_SEEN = {};
function showMacTable(dev){
  if(!dev.macTable.length)
    return "(empty — switches learn MAC addresses from traffic; send a ping and look again)";
  const rows = [["Vlan", "MAC address", "Type", "Age", "Interface"]];
  for(const m of dev.macTable){
    const k = dev.id + "|" + m.mac;
    if(!MAC_SEEN[k]) MAC_SEEN[k] = Date.now();
    const age = Math.floor((Date.now() - MAC_SEEN[k]) / 1000);
    rows.push([m.vlan, m.mac, "D", age + "s", m.iface]);
  }
  return rows.map(r => pad(r[0], 12) + pad(r[1], 20) + pad(r[2], 6) + pad(r[3], 8) + r[4]).join("\n") +
    "\n(dynamic entries age out after ~300s of silence on real gear)";
}
function showArpCmd(dev){
  const e = Object.entries(dev.arp || {});
  if(!e.length) return "(empty — the ARP cache fills when traffic flows)";
  const rows = [["MAC Address", "Address", "Name", "Interface"]];
  for(const [ip, a] of e) rows.push([a.mac, ip, arpNameFor(ip), a.iface]);
  return rows.map(r => pad(r[0], 20) + pad(r[1], 17) + pad(r[2], 20) + r[3]).join("\n");
}
function arpNameFor(ip){
  const d = findDeviceByIp(ip);
  return d ? hostnameOf(d) : ip;
}
function showArpNoResolveCmd(dev){
  const e = Object.entries(dev.arp || {});
  if(!e.length) return "(empty — the ARP cache fills when traffic flows)";
  const rows = [["MAC Address", "Address", "Interface"]];
  for(const [ip, a] of e) rows.push([a.mac, ip, a.iface]);
  return rows.map(r => pad(r[0], 20) + pad(r[1], 17) + r[2]).join("\n") +
    "\n\n(no-resolve skips the name lookup. On a real box that lookup is what makes\nshow arp hang when DNS is unreachable, so this is the one you reach for.)";
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
  for(const x of n) rows.push([x.addr, x.iface, x.state || "Full", x.name]);
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
function serialOf(dev){
  var h = 0, k = String(dev.id);
  for(var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
  return (dev.type === "router" ? "JN" : "PE") + String(h % 1000000).padStart(6, "0");
}
function showChassisHardwareCmd(dev){
  const model = dev.model || (dev.type === "switch" ? "EX4300-24T" : "MX204");
  const n = dev.ports.length;
  const ups = dev.ports.filter(p => p.role === "uplink");
  const acc = n - ups.length;
  const rows = [
    ["Item", "Version", "Part number", "Serial number", "Description"],
    ["Chassis", "", "", serialOf(dev), model],
    ["Routing Engine 0", "REV 08", "650-000001", serialOf(dev) + "R", "RE-" + model],
    ["FPC 0", "REV 12", "650-000002", serialOf(dev) + "F", acc + "x10/100/1000 Base-T"],
    ["  PIC 0", "", "BUILTIN", "BUILTIN", acc + "x GE"],
    ["Power Supply 0", "REV 03", "740-000003", serialOf(dev) + "P", "AC " + (dev.type === "router" ? "650W" : "350W")],
    ["Fan Tray 0", "", "", "", "Fan Tray"],
  ];
  if(ups.length){
    const kind = ups[0].id.split("-")[0];
    const rate = kind === "et" ? "40G" : (kind === "xe" ? "10G" : "1G");
    rows.splice(5, 0, ["  PIC 1", "", "BUILTIN", "BUILTIN", ups.length + "x " + rate + " uplink"]);
  }
  return rows.map(r => pad(r[0], 20) + pad(r[1], 9) + pad(r[2], 14) + pad(r[3], 15) + r[4]).join("\n");
}
function showOpticsCmd(dev, keys){
  const port = keys && keys[2];
  const ports = port ? dev.ports.filter(p => p.id === port) : dev.ports;
  if(port && !ports.length) return "error: interface " + port + " not found on this device";
  const out = [];
  let shown = 0;
  for(const p of ports){
    const lid = Object.keys(links).find(k =>
      (links[k].a.dev === dev.id && links[k].a.port === p.id) ||
      (links[k].b.dev === dev.id && links[k].b.port === p.id));
    if(!lid){
      if(port) out.push("Physical interface: " + p.id + "\n  (no transceiver / no link \u2014 optical diagnostics unavailable)");
      continue;
    }
    const l = links[lid];
    const up = NET.linkStatus && (NET.linkStatus[lid] === "up" || NET.linkStatus[lid] === "oob");
    const degraded = !!l.degraded;
    const rx = degraded ? -12.8 : -5.2;
    const tx = degraded ? -4.1 : -2.3;
    out.push([
      "Physical interface: " + p.id,
      "  Laser bias current           :  " + (degraded ? "38.2" : "22.6") + " mA",
      "  Laser output power           :  " + tx.toFixed(2) + " dBm",
      "  Module temperature           :  " + (degraded ? "58" : "34") + " degrees C",
      "  Receiver signal average power:  " + (up ? rx.toFixed(2) + " dBm" : "-40.00 dBm (no signal)"),
      "  Rx power low warning         :  " + (degraded ? "On  \u2014 signal is marginal" : "Off"),
      "  Module temperature high alarm:  " + (degraded ? "On" : "Off"),
    ].join("\n"));
    shown++;
    if(!port && shown >= 8) break;
  }
  if(!out.length) return "(no cabled interfaces \u2014 optical diagnostics need a link)";
  return out.join("\n\n");
}
function showChassisAlarmsCmd(dev){
  const alarms = [];
  const t = (typeof THERMAL !== "undefined" && THERMAL.devices[dev.id]) || 21;
  if(t >= 45) alarms.push(["Major", "Chassis temperature too high (" + t.toFixed(1) + " C)"]);
  else if(t >= 35) alarms.push(["Minor", "Chassis temperature elevated (" + t.toFixed(1) + " C)"]);
  for(const pid in (dev.errDisabled || {}))
    alarms.push(["Major", pid + " error-disabled"]);
  for(const lid in links){
    const l = links[lid];
    const mine = (l.a.dev === dev.id && l.a.port) || (l.b.dev === dev.id && l.b.port);
    if(mine && l.degraded) alarms.push(["Minor", mine + " receive errors \u2014 check cable or optic"]);
  }
  const d = D(dev);
  for(const p in (d.portCfg || {}))
    if(d.portCfg[p].disabled) alarms.push(["Minor", p + " administratively disabled"]);
  if(typeof strictOn === "function" && strictOn() && dev.type === "switch"){
    const cap = chassisAeCount(dev);
    for(const ae in (d.aes || {}))
      if(parseInt(ae.replace("ae", ""), 10) >= cap)
        alarms.push(["Minor", ae + " configured but chassis aggregated-devices not set"]);
  }
  if(!alarms.length) return "No alarms currently active";
  return alarms.length + " alarm" + (alarms.length === 1 ? "" : "s") + " currently active\n" +
    pad("Class", 8) + "Description\n" +
    alarms.map(a => pad(a[0], 8) + a[1]).join("\n");
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
function showProcessesCmd(dev){
  const base = [
    ["mgd", "management daemon — owns the CLI and the candidate config; every set you type talks to mgd"],
    ["rpd", "routing protocol daemon — OSPF, BGP, static routes; builds the routing table on the RE"],
    ["dcd", "device control daemon — interface configuration and state"],
    ["chassisd", "chassis daemon — fans, power, temperature, hardware inventory"],
    ["eventd", "event daemon — collects syslog and system events"],
  ];
  if(dev.type === "switch") base.splice(2, 0, ["l2ald", "layer 2 address learning daemon — MAC tables, VLANs, ethernet switching"]);
  if(cfgGet(dev.config, ["system", "services", "ssh"])) base.push(["sshd", "ssh daemon — remote CLI sessions"]);
  return "PID   Process     What it does\n" + base.map((p, i) =>
    pad(String(1000 + i * 17), 6) + pad(p[0], 12) + p[1]).join("\n") +
    "\n\nAll daemons run on the Routing Engine (control plane); the PFE forwards transit traffic in hardware.";
}
function fileListCmd(dev){
  const rescue = dev.rescueConfig ? "  rescue.conf.gz          " + new Date(dev.rescueWhen || Date.now()).toISOString().slice(0, 10) : null;
  const rows = [
    "/config:",
    "  juniper.conf.gz         (active configuration)",
    "  juniper.conf.1.gz       (rollback 1)",
    "  juniper.conf.2.gz       (rollback 2)",
    rescue,
    "",
    "/var/tmp:",
    "  install-" + (dev.model || "ex") + ".tgz       (old install bundle — storage cleanup would remove this)",
    "  cores/                  (empty, thankfully)",
  ].filter(x => x !== null);
  return rows.join("\n");
}
function storageCleanupCmd(dev){
  dev.cleaned = true;
  return "Currently rotating log files and removing old software bundles...\n" +
    "  /var/tmp/install-" + (dev.model || "ex") + ".tgz   removed\n" +
    "  /var/log/* rotated\n" +
    "Freed: enough. Run this BEFORE a software upgrade — a full /var is the classic upgrade killer.";
}
function rescueSaveCmd(dev){
  dev.rescueConfig = deepClone(committedTree(dev));
  dev.rescueWhen = Date.now();
  return "Saving active configuration to rescue.conf.gz — this is your known-good snapshot.\n" +
    "Restore it any time from configuration mode with: rollback rescue (then commit).";
}
var FLAP = {};
function trackFlaps(){
  for(const lid in NET.linkStatus){
    const st = NET.linkStatus[lid];
    const prev = FLAP[lid];
    if(prev && prev.st !== st){
      FLAP[lid] = { st, at: Date.now() };
      const l = links[lid];
      if(l) [l.a, l.b].forEach(e => {
        const d = devices[e.dev];
        if(d && (d.type === "switch" || d.type === "router"))
          devLog(d, "mib2d: SNMP_TRAP_LINK_" + (st === "up" ? "UP" : "DOWN") + ": ifIndex " + e.port + " \u2014 " + prev.st + " \u2192 " + st);
      });
    } else if(!prev){
      FLAP[lid] = { st, at: Date.now() };
    }
  }
  for(const lid of Object.keys(FLAP)) if(!links[lid]) delete FLAP[lid];
}
function lastFlapOf(dev, port){
  for(const lid in links){
    const l = links[lid];
    if((l.a.dev === dev.id && l.a.port === port) || (l.b.dev === dev.id && l.b.port === port))
      return FLAP[lid] ? FLAP[lid].at : null;
  }
  return null;
}
function agoStr(t){
  if(!t) return "Never";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if(s < 60) return s + "s ago";
  if(s < 3600) return Math.floor(s / 60) + "m " + (s % 60) + "s ago";
  return Math.floor(s / 3600) + "h " + Math.floor((s % 3600) / 60) + "m ago";
}
function showIfExtensive(dev, keys){
  const port = keys[2];
  const p = dev.ports.find(x => x.id === port);
  if(!p) return "error: interface " + port + " not found on this device";
  const pc = (D(dev).portCfg || {})[port] || {};
  const lid = Object.keys(links).find(k => (links[k].a.dev === dev.id && links[k].a.port === port) || (links[k].b.dev === dev.id && links[k].b.port === port));
  const st = lid ? (NET.linkStatus[lid] || "down") : "down";
  const linkUp = st === "up" || st === "oob";
  const ctr = (dev.ctr || {})[port] || { rx: 0, tx: 0, err: 0 };
  const ifc = cfgGet(dev.config, ["interfaces", port]) || {};
  const mtu = ifc.mtu ? parseInt(ifc.mtu, 10) : 1514;
  const out = [];
  out.push("Physical interface: " + port + ", " + (pc.disabled ? "Administratively down" : "Enabled") + ", Physical link is " + (linkUp ? "Up" : "Down"));
  out.push("  Link-level type: Ethernet, MTU: " + mtu + ", Speed: 1000mbps, Duplex: Full-duplex");
  out.push("  Device flags   : Present Running" + (pc.disabled ? " Down" : ""));
  out.push("  Last flapped   : " + agoStr(lastFlapOf(dev, port)));
  out.push("  Statistics last cleared: Never");
  out.push("  Traffic statistics:");
  out.push("   Input  packets: " + (ctr.rx || 0));
  out.push("   Output packets: " + (ctr.tx || 0));
  out.push("   Input  errors : " + (ctr.err || 0) + (ctr.err > 0 ? "   \u2190 climbing errors on a live link smell like a bad cable" : ""));
  const unit = (ifc.unit && ifc.unit["0"]) || null;
  if(unit){
    out.push("");
    out.push("  Logical interface " + port + ".0");
    const fam = unit.family || {};
    if(fam["ethernet-switching"]){
      const es = fam["ethernet-switching"];
      out.push("    Protocol ethernet-switching, Mode: " + (es["interface-mode"] || "access") +
        (es.vlan && es.vlan.members ? ", VLANs: " + [].concat(es.vlan.members).join(" ") : ""));
    }
    if(fam.inet){
      const addr = fam.inet.address ? Object.keys(fam.inet.address).join(", ") : "(none)";
      out.push("    Protocol inet, Addresses: " + addr);
    }
  }
  return out.join("\n");
}
function policyVerdict(dev, policyName, route){
  const pol = cfgGet(dev.config, ["policy-options", "policy-statement", policyName]);
  if(!pol) return { action: "none", term: null, why: "policy " + policyName + " is not defined" };
  const terms = pol.term || {};
  for(const tname of Object.keys(terms)){
    const t = terms[tname] || {};
    const from = t.from || {};
    let matches = true;
    if(from.protocol !== undefined){
      const want = [].concat(from.protocol);
      if(!want.includes(route.proto)) matches = false;
    }
    if(matches && from["route-filter"]){
      const rf = from["route-filter"];
      const keys = Object.keys(rf);
      let hit = false;
      for(const k of keys){
        const p = parsePrefix(k);
        if(!p) continue;
        const mode = typeof rf[k] === "string" ? rf[k] : (rf[k] && rf[k].exact ? "exact" : "orlonger");
        if(mode === "exact"){
          if(p.ip === route.net && p.bits === route.bits) hit = true;
        } else if(sameSubnet(route.net, p.ip, p.bits) && route.bits >= p.bits) hit = true;
      }
      if(!hit) matches = false;
    }
    if(!matches) continue;
    const then = t.then;
    const act = typeof then === "string" ? then : (then && then.accept ? "accept" : (then && then.reject ? "reject" : null));
    if(act === "accept") return { action: "accept", term: tname, why: "term " + tname + " matched and accepts" };
    if(act === "reject") return { action: "reject", term: tname, why: "term " + tname + " matched and rejects" };
    return { action: "none", term: tname, why: "term " + tname + " matched but has no accept/reject" };
  }
  return { action: "reject", term: null, why: "no term matched \u2014 the implicit default at the end of a policy rejects" };
}
function advertisedRoutes(dev, neighbor){
  const groups = cfgGet(dev.config, ["protocols", "bgp", "group"]) || {};
  let policy = null, group = null;
  for(const g in groups){
    const nb = groups[g].neighbor;
    const list = nb ? [].concat(nb) : [];
    if(!neighbor || list.includes(neighbor)){ group = g; policy = groups[g].export; break; }
  }
  const d = D(dev);
  const cands = [];
  (d.routes || []).forEach(r => cands.push({ net: r.net, bits: r.bits, proto: "static" }));
  (d.bgpRoutes || []).forEach(r => cands.push({ net: r.net, bits: r.bits, proto: "bgp" }));
  (d.ospfRoutes || []).forEach(r => cands.push({ net: r.net, bits: r.bits, proto: "ospf" }));
  const out = [];
  for(const r of cands){
    if(!policy){
      if(r.proto === "bgp") out.push({ r, why: "default policy: BGP-learned routes are advertised" });
      continue;
    }
    const v = policyVerdict(dev, [].concat(policy)[0], r);
    if(v.action === "accept") out.push({ r, why: v.why });
  }
  return { group, policy: policy ? [].concat(policy)[0] : null, routes: out, cands };
}
function showAdvertisingCmd(dev, keys){
  const neighbor = keys[keys.length - 1];
  const res = advertisedRoutes(dev, neighbor);
  if(!res.group) return "(no BGP group configured for " + neighbor + ")";
  const head = "Advertising to " + neighbor + " (group " + res.group + ")" +
    (res.policy ? ", export policy " + res.policy : ", no export policy \u2014 Junos defaults apply");
  if(!res.routes.length)
    return head + "\n\n(nothing is being advertised)\n" +
      "Without an export policy, Junos advertises only BGP-learned routes \u2014 your statics and OSPF routes stay home.";
  const rows = res.routes.map(x => pad(x.r.net + "/" + x.r.bits, 22) + pad(x.r.proto, 9) + x.why);
  return head + "\n" + pad("Prefix", 22) + pad("Source", 9) + "Why\n" + rows.join("\n");
}
function showVersionCmd(dev){
  const model = dev.model || (dev.type === "switch" ? "ex4300-48t" : "mx204");
  const prof = typeof profileFor === "function" ? profileFor(dev.model) : null;
  const ver = (prof && prof.version) || "23.4R1.10";
  return `Hostname: ${hostnameOf(dev)}\nModel: ${model.toLowerCase()} (lab)\nJunos: ${ver} (JunOS Lab edition)`;
}
function showConfigCmd(dev){
  const t = committedTree(dev);
  return cfgIsEmpty(t) ? "## Last commit: never\n## (factory-default — empty configuration)" : treeToText(t);
}
function treeToDisplaySet(t, prefix, annots, inacts){
  prefix = prefix || [];
  if(annots === undefined) annots = (typeof annotAll === "function" && annotAll(t)) || {};
  if(inacts === undefined) inacts = (typeof inactAll === "function" && inactAll(t)) || {};
  const out = [];
  for(const [k, v] of Object.entries(t)){
    if(k === ANNOT_KEY || k === INACT_KEY) continue;
    const here = [...prefix, k];
    if(v === true) out.push("set " + here.join(" "));
    else if(Array.isArray(v)) v.forEach(item => out.push("set " + [...here, cfgQuote(item)].join(" ")));
    else if(v && typeof v === "object"){
      if(!Object.keys(v).length) out.push("set " + here.join(" "));
      else out.push(...treeToDisplaySet(v, here, annots, inacts));
    }
    else out.push("set " + [...here, cfgQuote(v)].join(" "));
    const note = annots[here.join(" ")];
    if(note) out.push("annotate " + here.join(" ") + ' "' + note + '"');
    if(inacts[here.join(" ")]) out.push("deactivate " + here.join(" "));
  }
  return out;
}
function showConfigSetCmd(dev){
  const ls = treeToDisplaySet(committedTree(dev));
  return ls.length ? ls.join("\n") : "## (factory-default — empty configuration)";
}

function routeRows(dev){
  const rows = [];
  const up = ifacesOf(dev).filter(i => i.up);
  for(const i of up)
    rows.push({ net: networkOf(i.ip, i.bits), bits: i.bits, proto: "direct",
      pref: 0, iface: i.name, detail: "[Direct/0]  via " + i.name });
  for(const r of routesOf(dev)){
    const via = up.find(i => sameSubnet(r.nh, i.ip, i.bits));
    rows.push({ net: r.net, bits: r.bits, proto: "static", pref: 5, nh: r.nh,
      iface: via ? via.name : null, hidden: !via,
      detail: `[Static/5]  to ${r.nh}` + (via ? ` via ${via.name}` : "") });
  }
  for(const r of ((dev.d && dev.d.ospfRoutes) || []))
    rows.push({ net: r.net, bits: r.bits, proto: "ospf", pref: 10, nh: r.nh, iface: r.via,
      detail: `[OSPF/10]   to ${r.nh} via ${r.via}` });
  for(const r of ((dev.d && dev.d.bgpRoutes) || [])){
    const via = up.find(i => sameSubnet(r.nh, i.ip, i.bits));
    rows.push({ net: r.net, bits: r.bits, proto: "bgp", pref: 170, nh: r.nh, fromAs: r.fromAs,
      iface: via ? via.name : null, hidden: !via,
      detail: `[BGP/170]   to ${r.nh} (learned from AS${r.fromAs})` });
  }
  return markActive(rows);
}
/* Real Junos keeps every route it hears in the table but forwards on exactly
   one per destination: the lowest preference wins, and routes at the same
   preference share the load. A route whose next hop sits on no live subnet
   cannot be resolved, so it is hidden rather than active. */
function markActive(rows){
  const groups = new Map();
  for(const r of rows){
    const key = r.net + "/" + r.bits;
    if(!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const out = [];
  for(const g of groups.values()){
    const live = g.filter(r => !r.hidden);
    const best = live.length ? Math.min.apply(null, live.map(r => r.pref)) : null;
    g.sort((a, b) => (a.hidden ? 1 : 0) - (b.hidden ? 1 : 0) || a.pref - b.pref);
    for(const r of g) r.active = !r.hidden && r.pref === best;
    out.push(...g);
  }
  return out;
}
function routeCounts(rows){
  const shown = rows.filter(r => !r.hidden);
  return {
    dests: new Set(shown.map(r => r.net + "/" + r.bits)).size,
    routes: shown.length,
    active: shown.filter(r => r.active !== false).length,
    hidden: rows.length - shown.length,
  };
}
function routeTableHead(rows){
  const c = routeCounts(Array.isArray(rows) ? rows : []);
  return `inet.0: ${c.dests} destination${c.dests === 1 ? "" : "s"}, ${c.routes} route${c.routes === 1 ? "" : "s"} ` +
    `(${c.active} active, 0 holddown, ${c.hidden} hidden)\n` +
    "+ = Active Route, - = Last Active, * = Both\n";
}
function hiddenFooter(rows){
  const n = rows.filter(r => r.hidden).length;
  if(!n) return "";
  return "\n\n(" + n + " hidden route" + (n === 1 ? "" : "s") + " — the next hop is not on any live subnet of this device," +
    "\nso the route cannot be resolved and is not used. show route hidden lists them.)";
}
function routeBody(rows){
  const out = [];
  let last = null;
  for(const r of rows){
    if(r.hidden) continue;
    const key = r.net + "/" + r.bits;
    const label = key === last ? "" : key;
    last = key;
    out.push(pad(label, 20) + (r.active === false ? " " : "*") + r.detail);
  }
  return out.join("\n");
}
function showRouteCmd(dev){
  const rows = routeRows(dev);
  if(!rows.length) return "inet.0: 0 destinations, 0 routes (0 active, 0 holddown, 0 hidden)\n(no routes yet)";
  return routeTableHead(rows) + routeBody(rows) + hiddenFooter(rows);
}
function showRouteHiddenCmd(dev){
  const rows = routeRows(dev);
  const hid = rows.filter(r => r.hidden);
  if(!hid.length)
    return routeTableHead(rows) +
      "\n(no hidden routes — every route in this table resolved to a live next hop)";
  const body = hid.map(r => pad(r.net + "/" + r.bits, 20) + " " + r.detail +
    "  (next hop " + r.nh + " is on no live subnet of this device)").join("\n");
  return routeTableHead(rows) + body +
    "\n\n(a hidden route is one the box kept but could not resolve. It is not used and it does\n" +
    "not appear in plain show route, which is why a static route can look missing: the\n" +
    "next hop has to sit on a subnet this device already has a live interface in.)";
}
function showRouteDestCmd(dev, keys){
  const target = keys[keys.length - 1];
  const rows = routeRows(dev).filter(r => sameSubnet(target, r.net, r.bits));
  if(!rows.length)
    return "inet.0: 0 destinations, 0 routes (0 active, 0 holddown, 0 hidden)\n" +
      "(nothing in the table matches " + target + " — not even a default route, so a packet for it would be dropped)";
  const best = Math.max.apply(null, rows.map(r => r.bits));
  const hit = rows.filter(r => r.bits === best);
  return routeTableHead(hit) + routeBody(hit) + hiddenFooter(hit) +
    (rows.length > hit.length ? "\n\n(" + (rows.length - hit.length) +
      " less specific route" + (rows.length - hit.length === 1 ? "" : "s") + " also covers " + target +
      " — longest match wins)" : "");
}
function showRouteProtoCmd(dev, keys){
  const proto = keys[keys.length - 1];
  const rows = routeRows(dev).filter(r => r.proto === proto);
  if(!rows.length)
    return "inet.0: 0 destinations, 0 routes (0 active, 0 holddown, 0 hidden)\n(no " + proto + " routes in this table)";
  const inact = rows.filter(r => r.active === false && !r.hidden).length;
  return routeTableHead(rows) + routeBody(rows) + hiddenFooter(rows) +
    (inact ? "\n\n(" + inact + " of these route" + (inact === 1 ? " is" : "s are") + " in the table but not active:\n" +
      "another protocol reached the same destination with a lower preference.)" : "");
}
function showRouteReceiveCmd(dev, keys){
  const peer = keys[keys.length - 1];
  const groups = cfgGet(dev.config, ["protocols", "bgp", "group"]) || {};
  let known = false;
  for(const g in groups){
    const nb = groups[g].neighbor;
    if(nb && [].concat(nb).includes(peer)) known = true;
  }
  if(!known) return { text: "(" + peer + " is not a configured BGP neighbour on this device)", err: true };
  const rows = ((dev.d && dev.d.bgpRoutes) || []).filter(r => r.nh === peer);
  const head = routeTableHead(rows) +
    "  " + pad("Prefix", 24) + pad("Nexthop", 21) + pad("MED", 8) + pad("Lclpref", 11) + "AS path";
  if(!rows.length)
    return head + "\n\n(nothing received from " + peer + " yet — check show bgp summary for the session state)";
  return head + "\n" + rows.map(r =>
    "* " + pad(r.net + "/" + r.bits, 24) + pad(r.nh, 21) + pad("", 8) + pad("", 11) +
    r.fromAs + " I").join("\n");
}

/* The forwarding table is not a second copy of the routing table. The routing
   engine keeps every route it hears in inet.0 and chooses one per destination;
   only those winners are handed to the packet-forwarding engine, already
   resolved down to an outgoing interface. So the FIB is always the shorter
   list, and anything inactive or hidden in show route is simply absent here. */
function fibIndex(dev, key){
  let h = 0;
  const s = (dev.id || "") + "|" + key;
  for(let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return 320 + (h % 200);
}
function broadcastOf(ip, bits){
  const base = ipToInt32(networkOf(ip, bits));
  const host = bits >= 32 ? 0 : (0xFFFFFFFF >>> bits);
  const b = (base + host) >>> 0;
  return [b >>> 24, (b >>> 16) & 255, (b >>> 8) & 255, b & 255].join(".");
}
function fibRows(dev){
  const rows = [];
  const add = (dest, type, rtref, nh, nhtype, netif) =>
    rows.push({ dest, type, rtref, nh: nh || "", nhtype, netif: netif || "",
      index: fibIndex(dev, dest + nhtype) });
  const live = ifacesOf(dev).filter(i => i.up);
  const all = routeRows(dev);
  const def = all.find(r => r.bits === 0 && r.active);
  if(def) add("default", "user", 2, def.nh || "", "ucst", def.iface || "");
  else add("default", "perm", 0, "", "rjct", "");
  add("0.0.0.0/32", "perm", 0, "", "dscd", "");
  for(const i of live){
    const net = networkOf(i.ip, i.bits);
    add(net + "/" + i.bits, "intf", 0, "rslv", "rslv", i.name);
    add(i.ip + "/32", "intf", 0, i.ip, "locl", "");
    if(i.bits < 31) add(broadcastOf(i.ip, i.bits) + "/32", "intf", 0, "", "bcst", i.name);
  }
  for(const [ip, a] of Object.entries(dev.arp || {})){
    if(live.some(i => i.ip === ip)) continue;
    add(ip + "/32", "dest", 0, a.mac, "ucst", a.iface);
  }
  for(const r of all){
    if(!r.active || r.bits === 0) continue;
    if(r.proto === "direct") continue;
    const arp = (dev.arp || {})[r.nh];
    add(r.net + "/" + r.bits, "user", 1, arp ? arp.mac : r.nh, r.iface ? "ucst" : "hold", r.iface || "");
  }
  add("224.0.0.0/4", "perm", 0, "", "mdsc", "");
  add("255.255.255.255/32", "perm", 0, "", "bcst", "");
  return rows;
}
const FIB_LEGEND =
  "\n\nRoute types: perm = built in by the kernel, intf = came with an interface address,\n" +
  "dest = a neighbour this box has ARPed, user = put here by a route you configured or learned.\n" +
  "Next-hop types: ucst = send it to one next hop, locl = this is my own address,\n" +
  "bcst = broadcast, mdsc = multicast discard, rjct = reject, dscd = drop silently,\n" +
  "rslv = ARP for whoever answers, hold = waiting on a next hop that is not resolved yet.";
function fibTable(dev, rows){
  const head = "Routing table: default.inet\nInternet:\n" +
    pad("Destination", 20) + pad("Type", 7) + pad("RtRef", 7) +
    pad("Next hop", 20) + pad("Type", 6) + pad("Index", 7) + pad("NhRef", 7) + "Netif";
  const body = rows.map(r =>
    pad(r.dest, 20) + pad(r.type, 7) + pad(String(r.rtref), 7) +
    pad(r.nhtype === "rslv" ? "" : r.nh, 20) + pad(r.nhtype, 6) +
    pad(String(r.index), 7) + pad("1", 7) + r.netif).join("\n");
  return head + "\n" + body;
}
function showFibCmd(dev){
  const rows = fibRows(dev);
  const all = routeRows(dev);
  const notForwarded = all.filter(r => r.hidden || r.active === false).length;
  return fibTable(dev, rows) + FIB_LEGEND +
    (notForwarded ? "\n\n(" + notForwarded + " route" + (notForwarded === 1 ? "" : "s") +
      " in show route did not make it here: a route is only handed to the\nforwarding " +
      "plane if it won its destination and its next hop resolved.)" : "");
}
function showFibDestCmd(dev, keys){
  const target = keys[keys.length - 1];
  const rows = fibRows(dev).filter(r => {
    if(r.dest === "default") return true;
    const m = r.dest.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/);
    return m && sameSubnet(target, m[1], +m[2]);
  });
  if(!rows.length)
    return { text: "(nothing in the forwarding table covers " + target + " — a packet for it would be dropped)", err: true };
  const best = rows.reduce((a, r) => {
    const bits = r.dest === "default" ? 0 : +r.dest.split("/")[1];
    return bits > a.bits ? { bits, r } : a;
  }, { bits: -1, r: null });
  return fibTable(dev, [best.r]) +
    "\n\n(the forwarding plane does one lookup per packet and takes the longest match,\n" +
    "which for " + target + " is " + best.r.dest + ".)";
}

function showIfExtensiveAll(dev){
  const blocks = dev.ports.map(p => showIfExtensive(dev, [null, null, p.id]));
  return blocks.join("\n\n");
}

function showEthSwIfCmd(dev){
  const d = D(dev);
  const out = ["Routing instance : default-switch",
    "Logical interface flags: (DN - interface down, SCTL - shutdown by storm-control,",
    "                          ED - error-disabled)",
    "",
    pad("Logical", 16) + pad("Vlan", 14) + pad("TAG", 6) + pad("MAC", 8) + pad("STP", 13) + "Logical",
    pad("interface", 16) + pad("members", 14) + pad("", 6) + pad("limit", 8) + pad("state", 13) + "interface flags"];
  const vlanName = id => {
    for(const [n, v] of Object.entries(d.vlans)) if(v.id === id) return n;
    return "vlan-" + id;
  };
  let any = false;
  for(const p of dev.ports){
    const pc = d.portCfg[p.id] || {};
    if(pc.ae) continue;
    const flags = [];
    if(pc.disabled) flags.push("DN");
    if(dev.errDisabled[p.id]) flags.push("ED");
    if(!isLinked(dev.id, p.id) && !pc.disabled) flags.push("DN");
    const limit = (cfgGet(dev.config, ["switch-options", "interface", p.id, "interface-mac-limit"]) || "294912");
    any = true;
    out.push(pad(p.id + ".0", 16) + pad("", 14) + pad("", 6) + pad(String(limit), 8) + pad("", 13) +
      flags.concat([pc.mode === "trunk" ? "tagged" : "untagged"]).join(","));
    const ids = pc.vlanIds || [];
    for(const id of ids){
      const blocked = NET.blocked && NET.blocked.has(dev.id + ":" + p.id);
      out.push(pad("", 16) + pad(vlanName(id), 14) + pad(String(id), 6) + pad("65535", 8) +
        pad(blocked ? "Discarding" : "Forwarding", 13) +
        (pc.mode === "trunk" && id !== pc.nativeVlan ? "tagged" : "untagged"));
    }
  }
  for(const [ae, aeCfg] of Object.entries(d.aes)){
    any = true;
    out.push(pad(ae + ".0", 16) + pad("", 14) + pad("", 6) + pad("294912", 8) + pad("", 13) +
      (aeCfg.mode === "trunk" ? "tagged" : "untagged"));
    for(const id of (aeCfg.vlanIds || []))
      out.push(pad("", 16) + pad(vlanName(id), 14) + pad(String(id), 6) + pad("65535", 8) +
        pad("Forwarding", 13) + (aeCfg.mode === "trunk" ? "tagged" : "untagged"));
  }
  if(!any) return "(no ethernet-switching interfaces on this device)";
  return out.join("\n");
}

function showStpBridgeCmd(dev){
  const d = D(dev);
  if(!d.rstp) return { text: "RSTP is not enabled on this switch.\n(enable it with: set protocols rstp)", err: true };
  const rootId = NET.stpRoot[dev.id];
  const myMac = macOf(dev.id, "chassis");
  const rootMac = rootId ? macOf(rootId, "chassis") : myMac;
  const isRoot = !rootId || rootId === dev.id;
  const out = [];
  out.push("STP bridge parameters");
  out.push(pad("Routing instance name", 34) + ": GLOBAL");
  out.push(pad("Context ID", 34) + ": 0");
  out.push(pad("Enabled protocol", 34) + ": RSTP");
  out.push(pad("  Root ID", 34) + ": 32768." + rootMac);
  out.push(pad("  Hello time", 34) + ": 2 seconds");
  out.push(pad("  Maximum age", 34) + ": 20 seconds");
  out.push(pad("  Forward delay", 34) + ": 15 seconds");
  out.push(pad("  Message age", 34) + ": 0");
  out.push(pad("  Number of topology changes", 34) + ": " + (dev.stpChanges || 0));
  out.push("  Local parameters");
  out.push(pad("    Bridge ID", 34) + ": 32768." + myMac);
  out.push(pad("    Extended system ID", 34) + ": 0");
  out.push("");
  out.push(isRoot
    ? "This switch IS the root bridge — every other switch computes its path towards this one."
    : "Root bridge: " + hostnameOf(devices[rootId]) +
      "  (lowest bridge ID wins the election; priority first, then MAC)");
  return out.join("\n");
}

function showVlansDetailCmd(dev){
  const d = D(dev);
  const names = Object.keys(d.vlans);
  if(!names.length) return "(no VLANs configured)";
  const out = ["Routing instance: default-switch"];
  for(const name of names){
    const v = d.vlans[name];
    const members = effSwitchPorts(dev).filter(p => p.vlanIds.includes(v.id));
    const tagged = members.filter(p => p.mode === "trunk" && p.port !== undefined && v.id !== p.nativeVlan);
    out.push("");
    out.push(pad("VLAN Name: " + name, 34) + "State: Active");
    out.push("Tag: " + v.id);
    out.push("Internal index: " + (names.indexOf(name) + 3) + ", Origin: Static");
    out.push("MAC aging time: 300 seconds");
    if(v.l3) out.push("Layer 3 interface: " + v.l3);
    out.push("Interfaces:");
    if(!members.length) out.push("    (none — a VLAN with no member port carries nothing)");
    for(const m of members){
      const isTag = m.mode === "trunk" && v.id !== m.nativeVlan;
      out.push("    " + m.port + ".0" + (isLinked(dev.id, m.port) ? "*" : "") +
        ", " + (isTag ? "tagged" : "untagged") + ", " + (m.mode || "access"));
    }
    out.push("Number of interfaces: Tagged " + tagged.length + " , Untagged " + (members.length - tagged.length));
    out.push("Total MAC count: " + (dev.macTable || []).filter(m => String(m.vlan) === String(name) || String(m.vlan) === String(v.id)).length);
  }
  out.push("");
  out.push("(* marks an interface whose link is up)");
  return out.join("\n");
}

function showSystemUptimeCmd(dev){
  dev.bootedAt = dev.bootedAt || (Date.now() - 3600000);
  const now = new Date();
  const boot = new Date(dev.bootedAt);
  const secs = Math.max(1, Math.floor((now - boot) / 1000));
  const days = Math.floor(secs / 86400), hrs = Math.floor((secs % 86400) / 3600), mins = Math.floor((secs % 3600) / 60);
  const ago = (days ? days + "d " : "") + String(hrs).padStart(2, "0") + ":" + String(mins).padStart(2, "0");
  const iso = t => new Date(t).toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const last = (dev.commitLog && dev.commitLog[0]) ? dev.commitLog[0].when : null;
  const out = [];
  out.push("Current time: " + iso(now.getTime()));
  out.push("System booted: " + iso(dev.bootedAt) + " (" + ago + " ago)");
  out.push("Protocols started: " + iso(dev.bootedAt + 137000) + " (" + ago + " ago)");
  out.push("Last configured: " + (last ? iso(last) + " by " + (dev.user || "kaatje") : "(never committed)"));
  if(cfgGet(dev.config, ["system", "ntp", "server"])) out.push("Time Source: NTP CLOCK");
  out.push(new Date(now).toISOString().slice(11, 16) + "  up " +
    (days ? days + " day" + (days === 1 ? "" : "s") + ", " : "") + String(hrs).padStart(2, "0") + ":" +
    String(mins).padStart(2, "0") + ", 1 user, load averages: 0.08, 0.05, 0.02");
  return out.join("\n");
}

function clearIfStatsCmd(dev, keys){
  const target = keys[keys.length - 1];
  const one = target !== "statistics" && target !== "all" ? target : null;
  dev.ctr = dev.ctr || {};
  if(one){
    if(!dev.ports.some(p => p.id === one)) return { text: "error: interface " + one + " not found on this device", err: true };
    dev.ctr[one] = { rx: 0, tx: 0, err: 0 };
    dev.statsCleared = dev.statsCleared || {};
    dev.statsCleared[one] = Date.now();
  } else {
    dev.statsCleared = dev.statsCleared || {};
    for(const p of dev.ports){ dev.ctr[p.id] = { rx: 0, tx: 0, err: 0 }; dev.statsCleared[p.id] = Date.now(); }
  }
  if(typeof touchState === "function") touchState();
  return "";
}

function fileShowCmd(dev, keys){
  const name = keys[keys.length - 1];
  const files = dev.files || {};
  if(!(name in files))
    return { text: "error: could not open file '" + name + "': No such file or directory\n" +
      (Object.keys(files).length
        ? "  saved in this session: " + Object.keys(files).join(", ")
        : "  nothing saved yet — write some output first, e.g. show interfaces terse | save iflist.txt"), err: true };
  return files[name] || "(the file is empty)";
}

function showCompareRollbackCmd(dev, keys){
  const n = parseInt(keys[keys.length - 1], 10);
  if(isNaN(n) || n < 1) return { text: "usage: show configuration | compare rollback <n>  (1 = the previous commit)", err: true };
  const h = (dev.cfgHistory || [])[n - 1];
  if(!h) return { text: "rollback " + n + ": no such commit in history (" + (dev.cfgHistory || []).length + " available)", err: true };
  const d = diffTrees(h, committedTree(dev));
  return d || "(the active configuration is identical to rollback " + n + ")";
}

function showConfigPathCmd(dev, path){
  const tree = committedTree(dev);
  if(!path || !path.length) return showConfigCmd(dev);
  if(cfgIsEmpty(tree))
    return "## (factory-default — empty configuration)\n" +
      "## show configuration reads the ACTIVE config; if you only typed set, commit first";
  const res = resolveTreePath(tree, path);
  if(typeof res.err === "string")
    return "## (nothing configured at: " + path.join(" ") + ")\n" +
      "## show configuration reads the ACTIVE config; if you only typed set, commit first";
  const node = res.arrayItem !== undefined ? res.arrayItem : res.node;
  if(node && typeof node === "object" && !Array.isArray(node)){
    const real = Object.keys(node).filter(k => k !== ANNOT_KEY && k !== INACT_KEY);
    return real.length ? treeToTextAt(tree, res.keys, node) : "## (empty)";
  }
  return String(Array.isArray(node) ? node.join(" ") : node);
}

function showIfDescCmd(dev){
  const d = D(dev);
  const rows = [];
  for(const p of dev.ports){
    const pc = d.portCfg[p.id] || {};
    if(!pc.desc) continue;
    const admin = pc.disabled ? "down" : "up";
    const link = (!pc.disabled && !dev.errDisabled[p.id] && isLinked(dev.id, p.id)) ? "up" : "down";
    rows.push([p.id, admin, link, pc.desc]);
  }
  if(!rows.length)
    return "(no interface has a description yet)\n" +
      "Real Junos only lists ports you described: set interfaces ge-0/0/1 description \"uplink to core\"";
  return pad("Interface", 16) + pad("Admin", 7) + pad("Link", 6) + "Description\n" +
    rows.map(r => pad(r[0], 16) + pad(r[1], 7) + pad(r[2], 6) + r[3]).join("\n");
}

function showSystemAlarmsCmd(dev){
  const alarms = [];
  if(!dev.rescueConfig)
    alarms.push(["Minor", "Rescue configuration is not set"]);
  if(!cfgGet(committedTree(dev), ["system", "root-authentication"]))
    alarms.push(["Minor", "Should set root authentication password"]);
  if(!alarms.length) return "No alarms currently active";
  return alarms.length + " alarm" + (alarms.length === 1 ? "" : "s") + " currently active\n" +
    pad("Alarm time", 25) + pad("Class", 8) + "Description\n" +
    alarms.map(a => pad(new Date(dev.bootedAt || Date.now()).toISOString().replace("T", " ").slice(0, 19) + " UTC", 25) +
      pad(a[0], 8) + a[1]).join("\n") +
    "\n\n(these are SYSTEM alarms — software and config hygiene. Hardware faults show up under show chassis alarms)";
}

function showSystemStorageCmd(dev){
  const clean = !!dev.cleaned;
  const usedPct = clean ? 41 : 63;
  const sizeMb = dev.type === "router" ? 3800 : 1900;
  const usedMb = Math.round(sizeMb * usedPct / 100);
  const availMb = sizeMb - usedMb;
  const mb = n => (n >= 1024 ? (n / 1024).toFixed(1) + "G" : n + "M");
  const rows = [
    ["/dev/gpt/junos", mb(sizeMb), mb(usedMb), mb(availMb), usedPct + "%", "/.mount"],
    ["/dev/gpt/config", "95M", clean ? "11M" : "18M", clean ? "84M" : "77M", clean ? "12%" : "19%", "/.mount/config"],
    ["/dev/gpt/var", "500M", clean ? "96M" : "402M", clean ? "404M" : "98M", clean ? "19%" : "80%", "/.mount/var"],
  ];
  return pad("Filesystem", 20) + pad("Size", 10) + pad("Used", 10) + pad("Avail", 10) + pad("Capacity", 11) + "Mounted on\n" +
    rows.map(r => pad(r[0], 20) + pad(r[1], 10) + pad(r[2], 10) + pad(r[3], 10) + pad(r[4], 11) + r[5]).join("\n") +
    "\n\n" + (clean
      ? "/var has room again — request system storage cleanup did its job."
      : "A full /var is the classic upgrade killer: run request system storage cleanup before any software install.");
}

function showSystemUsersCmd(dev){
  dev.bootedAt = dev.bootedAt || (Date.now() - 3600000);
  const secs = Math.max(1, Math.floor((Date.now() - dev.bootedAt) / 1000));
  const days = Math.floor(secs / 86400), hrs = Math.floor((secs % 86400) / 3600), mins = Math.floor((secs % 3600) / 60);
  const hm = t => String(new Date(t).getUTCHours() % 12 || 12) + ":" +
    String(new Date(t).getUTCMinutes()).padStart(2, "0") + (new Date(t).getUTCHours() < 12 ? "AM" : "PM");
  const who = dev.user || "kaatje";
  const extra = Object.keys(cfgGet(dev.config, ["system", "login", "user"]) || {}).filter(u => u !== who);
  const rows = [[who, "u0", "-", hm(dev.cli.since || dev.bootedAt), "-", "cli"]];
  const head = hm(Date.now()) + "  up " +
    (days ? days + " day" + (days === 1 ? "" : "s") + ", " : "") +
    hrs + ":" + String(mins).padStart(2, "0") + ", " + rows.length + " user" + (rows.length === 1 ? "" : "s") +
    ", load averages: 0.08, 0.05, 0.02";
  return head + "\n" +
    pad("USER", 10) + pad("TTY", 9) + pad("FROM", 13) + pad("LOGIN@", 9) + pad("IDLE", 6) + "WHAT\n" +
    rows.map(r => pad(r[0], 10) + pad(r[1], 9) + pad(r[2], 13) + pad(r[3], 9) + pad(r[4], 6) + r[5]).join("\n") +
    (extra.length
      ? "\n\n(" + extra.join(", ") + " " + (extra.length === 1 ? "is" : "are") + " configured but not logged in — this command shows sessions, not accounts)"
      : "");
}

function showReCmd(dev){
  dev.bootedAt = dev.bootedAt || (Date.now() - 3600000);
  const t = (typeof THERMAL !== "undefined" && THERMAL.devices[dev.id]) || 21;
  const reTemp = t + 6;
  const totalMb = dev.type === "router" ? 8192 : 2048;
  const usedPct = 33;
  const secs = Math.max(1, Math.floor((Date.now() - dev.bootedAt) / 1000));
  const days = Math.floor(secs / 86400), hrs = Math.floor((secs % 86400) / 3600), mins = Math.floor((secs % 3600) / 60);
  const iso = x => new Date(x).toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const upt = (days ? days + " day" + (days === 1 ? "" : "s") + ", " : "") +
    hrs + " hour" + (hrs === 1 ? "" : "s") + ", " + mins + " minute" + (mins === 1 ? "" : "s");
  return [
    "Routing Engine status:",
    "  Slot 0:",
    "    Current state                  Master",
    "    Election priority              Master (default)",
    "    Temperature                    " + reTemp.toFixed(0) + " degrees C / " + Math.round(reTemp * 9 / 5 + 32) + " degrees F",
    "    DRAM                           " + totalMb + " MB",
    "    Memory utilization             " + usedPct + " percent",
    "    CPU utilization:",
    "      User                         6 percent",
    "      Background                   0 percent",
    "      Kernel                       4 percent",
    "      Idle                         90 percent",
    "    Model                          RE-" + (dev.model || (dev.type === "switch" ? "EX4300" : "MX204")),
    "    Serial ID                      " + serialOf(dev) + "R",
    "    Start time                     " + iso(dev.bootedAt),
    "    Uptime                         " + upt,
    "    Last reboot reason             0x200:normal shutdown",
    "    Load averages:                 1 minute   5 minute  15 minute",
    "                                       0.08       0.05       0.02",
    "",
    "The Routing Engine is the control plane: it runs the CLI, rpd and the config.",
    "Transit traffic never touches it — that is the PFE, in hardware.",
  ].join("\n");
}

function routeTerseRow(r){
  const flag = (r.active === false ? "  " : "* ");
  const code = r.proto === "direct" ? "D" : r.proto === "static" ? "S" : r.proto === "ospf" ? "O" : r.proto === "bgp" ? "B" : "?";
  const nh = r.nh ? ">" + r.nh : ">" + (r.detail.split("via ")[1] || "");
  return flag + "? " + pad(r.net + "/" + r.bits, 19) + pad(code, 2) + pad(String(r.pref), 6) +
    pad("", 11) + pad("", 11) + pad(nh, 17) + (r.fromAs ? String(r.fromAs) : "");
}
function showRouteTerseCmd(dev){
  const rows = routeRows(dev).filter(r => !r.hidden);
  if(!rows.length) return "inet.0: 0 destinations, 0 routes (0 active, 0 holddown, 0 hidden)\n(no routes yet)";
  return routeTableHead(routeRows(dev)) +
    "A V " + pad("Destination", 19) + pad("P", 2) + pad("Prf", 6) + pad("Metric 1", 11) + pad("Metric 2", 11) +
    pad("Next hop", 17) + "AS path\n" +
    rows.map(routeTerseRow).join("\n") +
    "\n\n(terse is the one-line-per-route view: A = active, P = protocol, Prf = preference.\nLower preference wins, which is why Direct/0 beats Static/5 beats OSPF/10 beats BGP/170.)";
}
function showRouteSummaryCmd(dev){
  const all = routeRows(dev);
  const rows = all.filter(r => !r.hidden);
  const byProto = {}, activeByProto = {};
  for(const r of rows){
    byProto[r.proto] = (byProto[r.proto] || 0) + 1;
    if(r.active !== false) activeByProto[r.proto] = (activeByProto[r.proto] || 0) + 1;
  }
  const rid = (ifacesOf(dev).filter(i => i.up)[0] || {}).ip || null;
  const asn = cfgGet(dev.config, ["routing-options", "autonomous-system"]) || null;
  const out = [];
  if(asn) out.push("Autonomous system number: " + asn);
  out.push("Router ID: " + (rid || "(none — no interface has an address and a live link)"));
  out.push("");
  const c = routeCounts(all);
  out.push("inet.0: " + c.dests + " destination" + (c.dests === 1 ? "" : "s") + ", " +
    c.routes + " route" + (c.routes === 1 ? "" : "s") +
    " (" + c.active + " active, 0 holddown, " + c.hidden + " hidden)");
  const label = { direct: "Direct", static: "Static", ospf: "OSPF", bgp: "BGP", local: "Local" };
  for(const p of ["direct", "static", "ospf", "bgp", "local"]){
    if(!byProto[p]) continue;
    const n = String(byProto[p]);
    const a = String(activeByProto[p] || 0);
    const padL = (t, w) => " ".repeat(Math.max(1, w - String(t).length)) + t;
    out.push(" ".repeat(13) + padL(label[p] + ":", 7) + padL(n, 7) + " routes," + padL(a, 7) + " active");
  }
  if(!rows.length) out.push("              (nothing in the table yet)");
  return out.join("\n");
}

function clearArpCmd(dev){
  const n = Object.keys(dev.arp || {}).length;
  dev.arp = {};
  if(typeof touchState === "function") touchState();
  return n
    ? "(" + n + " ARP entr" + (n === 1 ? "y" : "ies") + " flushed — the next packet re-ARPs for its next hop)"
    : "(the ARP cache was already empty)";
}
function clearLogCmd(dev){
  const n = (dev.syslog || []).length;
  dev.syslog = [];
  if(typeof touchState === "function") touchState();
  return n
    ? "(messages cleared — " + n + " line" + (n === 1 ? "" : "s") + " gone. Clear the log BEFORE you reproduce a fault, so what is left is only the fault.)"
    : "(the log was already empty)";
}

function monitorIfTrafficCmd(dev){
  const c = dev.ctr || {};
  const d = D(dev);
  const rows = [];
  for(const p of dev.ports){
    const pc = d.portCfg[p.id] || {};
    const link = (!pc.disabled && !dev.errDisabled[p.id] && isLinked(dev.id, p.id)) ? "Up" : "Down";
    if(link === "Down" && !c[p.id]) continue;
    const ctr = c[p.id] || { rx: 0, tx: 0 };
    rows.push([p.id, link, String(ctr.rx || 0), "0", String(ctr.tx || 0), "0"]);
  }
  const head = "Interface: all, Enter: bps, Delta: packets\n" +
    hostnameOf(dev) + "   Seconds: 1   Time: " + new Date().toTimeString().slice(0, 8) + "\n\n" +
    pad("Interface", 14) + pad("Link", 6) + pad("Input packets", 18) + pad("(pps)", 8) +
    pad("Output packets", 18) + "(pps)";
  if(!rows.length) return head + "\n(no interface is up and nothing has been counted yet)";
  return head + "\n" +
    rows.map(r => pad(r[0], 14) + pad(r[1], 6) + pad(r[2], 18) + pad(r[3], 8) + pad(r[4], 18) + r[5]).join("\n") +
    "\n\nOn a real box this screen repaints every second until you press q, and the (pps)\n" +
    "columns are the per-second delta. Nothing moves in the lab between your commands,\n" +
    "so the rates read zero — send a ping and run it again to watch the totals climb.";
}

const SYS_FILES = {
  "/var/log/messages": dev => showLogCmd(dev),
  "/config/juniper.conf.gz": dev => showConfigCmd(dev),
  "/config/rescue.conf.gz": dev => dev.rescueConfig
    ? treeToText(dev.rescueConfig)
    : { text: "error: could not open file '/config/rescue.conf.gz': No such file or directory\n" +
        "  no rescue config saved yet — request system configuration rescue save", err: true },
};
function fileShowPathCmd(dev, keys){
  const name = keys[keys.length - 1];
  if(name in SYS_FILES){
    const v = SYS_FILES[name](dev);
    return typeof v === "string" ? (v || "(the file is empty)") : v;
  }
  if(/^\/config\/juniper\.conf\.(\d+)\.gz$/.test(name)){
    const n = parseInt(name.match(/juniper\.conf\.(\d+)\.gz/)[1], 10);
    const h = (dev.cfgHistory || [])[n - 1];
    if(!h) return { text: "error: could not open file '" + name + "': No such file or directory\n" +
      "  only " + (dev.cfgHistory || []).length + " rollback file(s) exist on this box", err: true };
    return treeToText(h) || "## (that commit held an empty configuration)";
  }
  return { text: "error: could not open file '" + name + "': No such file or directory\n" +
    "  real files on this box: " + Object.keys(SYS_FILES).join(", ") + " (see file list)", err: true };
}

const OP_SPECS = {
  switch: [
    ["configure", { help: "Enter configuration mode", fn: dev => { dev.cli.mode = "cfg"; dev.cli.editKeys = []; return "Entering configuration mode\n[edit]"; } }],
    ["show configuration", { help: "The committed (active) configuration", fn: showConfigCmd }],
    ["show configuration | display set", { help: "The active config as set commands (paste-able)", fn: showConfigSetCmd }],
    ["show interfaces terse", { help: "Interface summary", fn: showTerse }],
    ["show vlans", { help: "VLANs and member ports", fn: showVlansCmd }],
    ["show ethernet-switching table", { help: "Learned MAC addresses", fn: showMacTable }],
    ["show route", { help: "Routing table", fn: showRouteCmd }],
    ["show system commit", { help: "Commit history — who committed when, rollback numbers", fn: showCommitHistCmd }],
    ["show route advertising-protocol bgp <neighbor:ip>", { help: "What you are advertising to a peer, and which policy term decided it", fn: showAdvertisingCmd }],
    ["show vrrp", { help: "VRRP groups — who is master for each virtual address", fn: showVrrpCmd }],
    ["show interfaces statistics", { help: "Per-port packet counters and errors", fn: showIfStatsCmd }],
    ["show arp", { help: "ARP cache", fn: showArpCmd }],
    ["show spanning-tree interface", { help: "RSTP port roles and states", fn: showStpCmd }],
    ["show lacp interfaces", { help: "LACP bundle status", fn: showLacpCmd }],
    ["show ospf neighbor", { help: "OSPF adjacencies", fn: showOspfNbrCmd }],
    ["show chassis environment", { help: "Temperatures and fans", fn: showChassisEnvCmd }],
    ["show chassis hardware", { help: "Inventory: model, serials, FPC/PIC, power supplies", fn: showChassisHardwareCmd }],
    ["show virtual-chassis", { help: "VC members, roles and which one is master", fn: showVcCmd }],
    ["show chassis alarms", { help: "Active chassis alarms \u2014 the first command on any incident", fn: showChassisAlarmsCmd }],
    ["show interfaces diagnostics optics", { help: "Optical DOM readings \u2014 light levels, laser bias, temperature", fn: showOpticsCmd }],
    ["show interfaces diagnostics optics <interface:physport>", { help: "Optical DOM readings for one port", fn: (dev, keys) => showOpticsCmd(dev, [null, null, keys[keys.length - 1]]) }],
    ["show dhcp server binding", { help: "Leases handed out by this device", fn: showDhcpBindingCmd }],
    ["show lldp neighbors", { help: "Who is cabled to which port — the cable-tracing tool", fn: showLldpCmd }],
    ["show poe interface", { help: "PoE power per port and the chassis budget", fn: showPoeCmd }],
    ["show analyzer", { help: "Port mirroring \u2014 what is mirrored and where the copy goes", fn: showAnalyzerCmd }],
    ["show log messages", { help: "Recent system events (commits, link flaps, storms)", fn: showLogCmd }],
    ["show version", { help: "Software version", fn: showVersionCmd }],
    ["show system processes", { help: "The Junos daemons and what each one owns", fn: showProcessesCmd }],
    ["show interfaces <interface:physport> extensive", { help: "The full real-Junos interface wall: flags, MTU, last flapped, counters", fn: showIfExtensive }],
    ["file list", { help: "The Junos file system — configs, rollbacks, rescue, /var/tmp", fn: fileListCmd }],
    ["request system storage cleanup", { help: "Free space: rotate logs, remove old bundles — run before upgrades", fn: storageCleanupCmd }],
    ["request system reboot", { help: "Reboot the box \u2014 asks first, and discards the uncommitted candidate", fn: dev => requestConfirm(dev, "reboot", "Reboot the system ? [yes,no] (no)") }],
    ["request system power-off", { help: "Shut the box down \u2014 asks first", fn: dev => requestConfirm(dev, "power-off", "Power Off the system ? [yes,no] (no)") }],
    ["restart <process:daemon>", { help: "Bounce one Junos daemon instead of the whole box", fn: restartDaemonCmd }],
    ["request system configuration rescue save", { help: "Snapshot the active config as the rescue config", fn: rescueSaveCmd }],
    ["ping <target:ip>", { help: "Ping from this device (sources from an irb)", fn: (dev, keys) => { const r = doDevicePing(dev, keys[1]); return joinLines(r); } }],
    ["traceroute <target:ip>", { help: "Trace the L3 path", fn: (dev, keys) => joinLines(doTraceroute(dev, keys[1])) }],
    ["show configuration | compare rollback <n:num>", { help: "What changed between the running config and an older commit", fn: showCompareRollbackCmd }],
    ["show interfaces extensive", { help: "The full interface wall for every port \u2014 pipe it into | match to hunt errors", fn: showIfExtensiveAll }],
    ["show route <destination:ip>", { help: "Which route this destination would actually use (longest match wins)", fn: showRouteDestCmd }],
    ["show route protocol <protocol:rtproto>", { help: "Only the routes one protocol put in the table", fn: showRouteProtoCmd }],
    ["show route receive-protocol bgp <neighbor:ip>", { help: "What a BGP peer sent you, before import policy had its say", fn: showRouteReceiveCmd }],
    ["show system uptime", { help: "How long the box has been up, and when it was last configured", fn: showSystemUptimeCmd }],
    ["clear interfaces statistics", { help: "Zero the interface counters so the next reading is yours", fn: clearIfStatsCmd }],
    ["clear interfaces statistics all", { help: "Zero the counters on every interface", fn: clearIfStatsCmd }],
    ["clear interfaces statistics <interface:physport>", { help: "Zero the counters on one interface", fn: clearIfStatsCmd }],
    ["file show <filename:word>", { help: "Print a file you wrote with | save", fn: fileShowCmd }],
    ["show ethernet-switching interface", { help: "Per-port switching state: VLAN membership, tagging, STP state", fn: showEthSwIfCmd }],
    ["show spanning-tree bridge", { help: "Bridge-wide RSTP: who is root, the timers, topology changes", fn: showStpBridgeCmd }],
    ["show vlans detail", { help: "Each VLAN in long form \u2014 tag, L3 interface, member ports", fn: showVlansDetailCmd }],
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
    ["show route", { help: "Routing table", fn: showRouteCmd }],
    ["show system commit", { help: "Commit history — who committed when, rollback numbers", fn: showCommitHistCmd }],
    ["show route advertising-protocol bgp <neighbor:ip>", { help: "What you are advertising to a peer, and which policy term decided it", fn: showAdvertisingCmd }],
    ["show vrrp", { help: "VRRP groups — who is master for each virtual address", fn: showVrrpCmd }],
    ["show interfaces statistics", { help: "Per-port packet counters and errors", fn: showIfStatsCmd }],
    ["show arp", { help: "ARP cache", fn: showArpCmd }],
    ["show ospf neighbor", { help: "OSPF adjacencies", fn: showOspfNbrCmd }],
    ["show bgp summary", { help: "BGP neighbors and session state", fn: showBgpCmd }],
    ["show security nat source", { help: "Source NAT rules", fn: showNatCmd }],
    ["show chassis environment", { help: "Temperatures and fans", fn: showChassisEnvCmd }],
    ["show chassis hardware", { help: "Inventory: model, serials, FPC/PIC, power supplies", fn: showChassisHardwareCmd }],
    ["show virtual-chassis", { help: "VC members, roles and which one is master", fn: showVcCmd }],
    ["show chassis alarms", { help: "Active chassis alarms \u2014 the first command on any incident", fn: showChassisAlarmsCmd }],
    ["show interfaces diagnostics optics", { help: "Optical DOM readings \u2014 light levels, laser bias, temperature", fn: showOpticsCmd }],
    ["show interfaces diagnostics optics <interface:physport>", { help: "Optical DOM readings for one port", fn: (dev, keys) => showOpticsCmd(dev, [null, null, keys[keys.length - 1]]) }],
    ["show dhcp server binding", { help: "Leases handed out by this device", fn: showDhcpBindingCmd }],
    ["show lldp neighbors", { help: "Who is cabled to which port — the cable-tracing tool", fn: showLldpCmd }],
    ["show log messages", { help: "Recent system events (commits, link flaps)", fn: showLogCmd }],
    ["show version", { help: "Software version", fn: showVersionCmd }],
    ["show system processes", { help: "The Junos daemons and what each one owns", fn: showProcessesCmd }],
    ["show interfaces <interface:physport> extensive", { help: "The full real-Junos interface wall: flags, MTU, last flapped, counters", fn: showIfExtensive }],
    ["file list", { help: "The Junos file system — configs, rollbacks, rescue, /var/tmp", fn: fileListCmd }],
    ["request system storage cleanup", { help: "Free space: rotate logs, remove old bundles — run before upgrades", fn: storageCleanupCmd }],
    ["request system reboot", { help: "Reboot the box \u2014 asks first, and discards the uncommitted candidate", fn: dev => requestConfirm(dev, "reboot", "Reboot the system ? [yes,no] (no)") }],
    ["request system power-off", { help: "Shut the box down \u2014 asks first", fn: dev => requestConfirm(dev, "power-off", "Power Off the system ? [yes,no] (no)") }],
    ["restart <process:daemon>", { help: "Bounce one Junos daemon instead of the whole box", fn: restartDaemonCmd }],
    ["request system configuration rescue save", { help: "Snapshot the active config as the rescue config", fn: rescueSaveCmd }],
    ["show configuration | compare rollback <n:num>", { help: "What changed between the running config and an older commit", fn: showCompareRollbackCmd }],
    ["show interfaces extensive", { help: "The full interface wall for every port \u2014 pipe it into | match to hunt errors", fn: showIfExtensiveAll }],
    ["show route <destination:ip>", { help: "Which route this destination would actually use (longest match wins)", fn: showRouteDestCmd }],
    ["show route protocol <protocol:rtproto>", { help: "Only the routes one protocol put in the table", fn: showRouteProtoCmd }],
    ["show route receive-protocol bgp <neighbor:ip>", { help: "What a BGP peer sent you, before import policy had its say", fn: showRouteReceiveCmd }],
    ["show system uptime", { help: "How long the box has been up, and when it was last configured", fn: showSystemUptimeCmd }],
    ["clear interfaces statistics", { help: "Zero the interface counters so the next reading is yours", fn: clearIfStatsCmd }],
    ["clear interfaces statistics all", { help: "Zero the counters on every interface", fn: clearIfStatsCmd }],
    ["clear interfaces statistics <interface:physport>", { help: "Zero the counters on one interface", fn: clearIfStatsCmd }],
    ["file show <filename:word>", { help: "Print a file you wrote with | save", fn: fileShowCmd }],
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
function rescueDeleteCmd(dev){
  if(!dev.rescueConfig) return { text: "error: no rescue configuration is saved on this box", err: true };
  dev.rescueConfig = null;
  dev.rescueWhen = null;
  if(typeof touchState === "function") touchState();
  return "Rescue configuration deleted.\n" +
    "(nothing to fall back on now — request system configuration rescue save makes a new one)";
}
function showConfigViaTrie(dev, keys){
  return showConfigPathCmd(dev, keys.slice(2));
}
const SHARED_OP_SPECS = [
  ["show configuration <statement:cfgnode>", { help: "One branch of the active configuration, e.g. show configuration interfaces ge-0/0/1", fn: showConfigViaTrie }],
  ["show interfaces descriptions", { help: "Only the ports you described — the fastest way to read a patch panel", fn: showIfDescCmd }],
  ["show system alarms", { help: "System alarms: config and software hygiene (hardware lives under show chassis alarms)", fn: showSystemAlarmsCmd }],
  ["show system storage", { help: "Disk usage per filesystem — check /var before any software upgrade", fn: showSystemStorageCmd }],
  ["show system users", { help: "Who is logged in right now, and for how long", fn: showSystemUsersCmd }],
  ["show chassis routing-engine", { help: "RE health: memory, CPU, temperature, uptime, last reboot reason", fn: showReCmd }],
  ["show route terse", { help: "One line per route — protocol and preference side by side", fn: showRouteTerseCmd }],
  ["show route hidden", { help: "Routes the table kept but could not resolve — the reason a static can look missing", fn: showRouteHiddenCmd }],
  ["show route forwarding-table", { help: "The forwarding table: only the routes that won, resolved down to an outgoing interface", fn: showFibCmd }],
  ["show route forwarding-table destination <destination:ip>", { help: "The one forwarding entry a packet for this address would hit", fn: showFibDestCmd }],
  ["show arp no-resolve", { help: "ARP cache without looking up hostnames — what you use when DNS is slow or wrong", fn: showArpNoResolveCmd }],
  ["show route summary", { help: "How many routes each protocol put in the table", fn: showRouteSummaryCmd }],
  ["clear arp", { help: "Flush the ARP cache — forces a fresh ARP for every next hop", fn: clearArpCmd }],
  ["clear log messages", { help: "Empty the log so what appears next is only your fault reproduction", fn: clearLogCmd }],
  ["monitor interface traffic", { help: "Per-interface packet counters (a real box repaints this until you press q)", fn: monitorIfTrafficCmd }],
  ["request system halt", { help: "Stop the OS without powering down — asks first", fn: dev => requestConfirm(dev, "halt", "Halt the system ? [yes,no] (no)") }],
  ["request system zeroize", { help: "Wipe to factory default and reboot — the real one asks, and means it", fn: dev => requestConfirm(dev, "zeroize", "warning: System will be rebooted and may not boot without configuration\nErase all data, including configuration and log files ? [yes,no] (no)") }],
  ["request system configuration rescue delete", { help: "Throw away the rescue config snapshot", fn: rescueDeleteCmd }],
  ["file show <path:syspath>", { help: "Read a real file on the box: /var/log/messages, /config/juniper.conf.gz", fn: fileShowPathCmd }],
];
const PING_OPT_FORMS = [
  ["ping <target:ip> count <count:num>", "Send exactly n probes instead of running until you stop it"],
  ["ping <target:ip> rapid", "Fire the probes back to back and print one character each"],
  ["ping <target:ip> size <size:num>", "Payload size in bytes (default 56, so 64 on the wire)"],
  ["ping <target:ip> source <source:ip>", "Send from one of this device's own addresses"],
  ["ping <target:ip> do-not-fragment", "Set DF — the packet is dropped rather than fragmented, which is how you find an MTU"],
  ["ping <target:ip> count <count:num> rapid", "n probes, back to back"],
  ["ping <target:ip> rapid count <count:num>", "n probes, back to back"],
  ["ping <target:ip> count <count:num> size <size:num>", "n probes of a given size"],
  ["ping <target:ip> count <count:num> source <source:ip>", "n probes from a chosen source address"],
  ["ping <target:ip> count <count:num> do-not-fragment", "n probes with DF set"],
  ["ping <target:ip> size <size:num> do-not-fragment", "An MTU probe: this size, unfragmented, or nothing"],
  ["ping <target:ip> count <count:num> size <size:num> do-not-fragment", "An MTU probe repeated n times"],
];
["switch", "router"].forEach(function(t){
  SHARED_OP_SPECS.forEach(function(e){ OP_SPECS[t].push([e[0], e[1]]); });
  PING_OPT_FORMS.forEach(function(f){ OP_SPECS[t].push([f[0], { help: f[1], fn: pingWithOpts }]); });
});

const OP_TRIE = {
  switch: buildTrie(OP_SPECS.switch.map(([s, o]) => [s, { ...o, kind: "op" }])),
  router: buildTrie(OP_SPECS.router.map(([s, o]) => [s, { ...o, kind: "op" }])),
};
["switch", "router"].forEach(function(t){
  const cfgNode = OP_TRIE[t].lits["show"] && OP_TRIE[t].lits["show"].lits["configuration"];
  if(!cfgNode) return;
  const edge = cfgNode.phs.find(p => p.ph === "cfgnode");
  if(edge && !edge.node.phs.some(p => p.ph === "cfgnode"))
    edge.node.phs.push({ ph: "cfgnode", label: edge.label, node: edge.node });
});

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
