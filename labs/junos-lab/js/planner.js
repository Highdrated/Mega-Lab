/* ============================================================
   PLANNER — the "simulate before you build it" layer:
   buildings (zones render in ui.js), bill of materials with
   indicative Belgian prices, design rule check, failure-impact
   heatmap, reachability matrix, rack elevations, build packet.
   ============================================================ */

/* indicative Belgian street prices, EUR ex VAT (2026) — verify with a reseller */
const PRICE_EUR = {
  "EX2300-C-12T": 795,
  "EX2300-24P": 1295,
  "EX3400-24T": 2150,
  "EX4300-48T": 4200,
  "EX4300-48P": 5400,
  "MX104": 12000,
  "SRX300": 685,
  "MX204": 27500,
  "AP24": 575,
  "AP34": 925,
  "AP45": 1425,
  "USW-Lite-8-PoE": 119,
  "USW-Pro-24": 429,
  "USW-Pro-24-PoE": 799,
  "USW-Pro-48": 1169,
  "UXG-Lite": 129,
  "UDM-Pro": 379,
  "U6+": 115,
  "U7-Pro": 199,
  "Portable AC 3.5kW": 499,
  "In-row CRAC 10kW": 3900,
  "CRAH 30kW": 9500,
};
/* cabling and optics priced off FS.com (EU ballpark, ex VAT) */
const PRICE_MISC = {
  cableCat6: 3,              // FS.com Cat6 snagless patch lead
  cableDac: 14,              // FS.com 10G SFP+ DAC twinax, in-rack
  cableConsole: 14,          // FS.com USB console cable
  fibreRun: 85,              // FS.com OS2 duplex run + 2x 10G SFP+ optics
  poeInjector: 20,           // FS.com 802.3at PoE+ injector
  ispMonthly: 89,            // business fibre, monthly, BE ballpark
};
/* the catalog prices only real Juniper and Ubiquiti SKUs — endpoints and
   custom no-SKU gear are listed but excluded from the money columns */
function brandOf(model){ return /^(EX|MX|SRX|AP)/.test(model) ? "Juniper" : "Ubiquiti"; }
const VAT_BE = 0.21;

function euro(n){ return "€ " + Math.round(n).toLocaleString("nl-BE"); }

const BOM_CATS = [
  "Juniper — switching & routing",
  "Ubiquiti — switching & routing",
  "Wi-Fi",
  "Servers & compute",
  "Power & cooling",
  "Cables & optics (FS.com)",
  "Services (recurring)",
  "Customer-provided / not priced",
];
function devPrice(dev){
  if(dev.type === "ups")
    return { label: (dev.model || "Rack UPS") + " (generic — estimate)",
      unit: (dev.cfg && dev.cfg.capW) >= 2000 ? 1400 : 700, est: true, cat: "Power & cooling" };
  if(dev.type === "server")
    return { label: "1U rack server (generic — estimate)", unit: 1400, est: true, cat: "Servers & compute" };
  if(dev.type === "crac")
    return { label: dev.model || "Cooling unit", unit: PRICE_EUR[dev.model] || 0,
      est: !PRICE_EUR[dev.model], cat: "Power & cooling" };
  if(dev.type === "ap")
    return dev.model && PRICE_EUR[dev.model]
      ? { label: brandOf(dev.model) + " " + dev.model + " access point", unit: PRICE_EUR[dev.model], cat: "Wi-Fi" }
      : { label: "Access point (no SKU — not priced)", unit: 0, est: true, cat: "Customer-provided / not priced" };
  if(dev.type === "host")
    return { label: "Endpoint (customer-provided — not part of the network BOM)", unit: 0, cat: "Customer-provided / not priced" };
  if(dev.type === "isp")
    return { label: "Business fibre uplink (ISP, monthly)", unit: 0, monthly: PRICE_MISC.ispMonthly, cat: "Services (recurring)" };
  if(dev.model && PRICE_EUR[dev.model])
    return { label: brandOf(dev.model) + " " + dev.model, unit: PRICE_EUR[dev.model],
      cat: brandOf(dev.model) + " — switching & routing" };
  return { label: `Custom ${dev.type}, ${dev.ports.length} ports (no SKU — not priced)`, unit: 0, est: true,
    cat: "Customer-provided / not priced" };
}

function computeBom(){
  const rows = new Map();
  const add = (key, label, unit, extra) => {
    if(!rows.has(key)) rows.set(key, { label, unit, qty: 0, monthly: 0, est: false, cat: "Cables & optics (FS.com)", ...(extra || {}) });
    rows.get(key).qty++;
  };
  for(const dev of Object.values(devices)){
    const p = devPrice(dev);
    add("d:" + p.label, p.label, p.unit, { monthly: p.monthly || 0, est: !!p.est, cat: p.cat });
  }
  for(const dev of Object.values(devices))
    if(dev.type === "ap" && dev.cfg && dev.cfg.injector)
      add("m:inj", "FS.com PoE+ injector (802.3at)", PRICE_MISC.poeInjector);
  for(const l of Object.values(links)){
    const kind = l.kind || "lan";
    if(kind === "wifi") continue;   // associations are free — that is the point of Wi-Fi
    const a = devices[l.a.dev], b = devices[l.b.dev];
    const infra = d => d && (d.type === "switch" || d.type === "router");
    const crossZone = a && b && zoneOf(a.id) !== zoneOf(b.id) && (zoneOf(a.id) || zoneOf(b.id));
    const sameRack = a && b && infra(a) && infra(b) &&
      typeof rackOf === "function" && rackOf(a.id) && rackOf(a.id) === rackOf(b.id);
    if(kind === "console") add("c:console", "FS.com USB console cable", PRICE_MISC.cableConsole);
    else if(kind === "remote" || crossZone) add("c:fibre", "FS.com OS2 fibre run + 2x SFP+ optics", PRICE_MISC.fibreRun);
    else if(sameRack) add("c:dac", "FS.com 10G DAC twinax (in-rack link)", PRICE_MISC.cableDac);
    else add("c:cat6", "FS.com Cat6 patch cable", PRICE_MISC.cableCat6);
  }
  const TRAY_M_PRICE = { ceiling: 9, wall: 4, underfloor: 12 };
  const TRAY_M_LABEL = {
    ceiling: "Cable basket tray (ceiling), per metre",
    wall: "Wall trunking, per metre",
    underfloor: "Underfloor cable duct, per metre",
  };
  for(const tz of Object.values(zones)){
    if(tz.kind !== "tray") continue;
    const m = Math.max(1, Math.round(Math.max(tz.w, tz.h) * M_PER_PX));
    const lvl = tz.level || "ceiling";
    const key = "t:" + lvl;
    if(!rows.has(key))
      rows.set(key, { label: TRAY_M_LABEL[lvl], unit: TRAY_M_PRICE[lvl], qty: 0, monthly: 0,
        est: true, cat: "Cables & optics (FS.com)" });
    rows.get(key).qty += m;
  }
  let subtotal = 0, monthly = 0;
  const list = [...rows.values()];
  for(const r of list){ subtotal += r.unit * r.qty; monthly += r.monthly * r.qty; }
  const vat = Math.round(subtotal * VAT_BE);
  return { list, subtotal, vat, total: subtotal + vat, monthly };
}

function computeIpPlan(){
  const subnets = new Map();
  for(const dev of Object.values(devices)){
    for(const i of ifacesOf(dev)){
      const key = networkOf(i.ip, i.bits) + "/" + i.bits;
      if(!subnets.has(key)) subnets.set(key, { net: key, gateways: [], vlan: null, dhcp: null, hosts: 0 });
      const sn = subnets.get(key);
      if(dev.type === "host") sn.hosts++;
      else sn.gateways.push(`${i.ip} (${dev.name} ${i.name})`);
      if(dev.type === "switch" && i.name.startsWith("irb.") && dev.d){
        const irb = dev.d.irbs[i.name.slice(4)];
        if(irb && irb.vlanName) sn.vlan = `${irb.vlanName} (${irb.vlanId})`;
      }
    }
    if(dev.type === "switch" || dev.type === "router")
      for(const p of (D(dev).pools || []))
        for(const rg of p.ranges){
          const key = networkOf(p.net.ip, p.net.bits) + "/" + p.net.bits;
          if(subnets.has(key)) subnets.get(key).dhcp = `${rg.low} - ${rg.high}`;
        }
  }
  return [...subnets.values()];
}

function cablingSchedule(){
  const out = [];
  for(const l of Object.values(links)){
    const a = devices[l.a.dev], b = devices[l.b.dev];
    if(!a || !b) continue;
    const zA = zoneOf(a.id), zB = zoneOf(b.id);
    const cross = zA !== zB ? `   crosses: ${zA ? zA.name : "outside"} -> ${zB ? zB.name : "outside"}` : "";
    const len = (l.kind || "lan") === "wifi" ? "" : `  ~${pad(String(linkLenM(l)) + " m", 7)}`;
    const r = (typeof linkRoute === "function") ? linkRoute(l) : null;
    const via = r && r.trayIds.length
      ? `   via ${r.trayIds.map(id2 => (zones[id2] || {}).name).join("+")} (${TRAY_LEVELS[r.level].label})` : "";
    const dsk = (typeof deskOf === "function")
      ? [a, b].map(d => d.type === "host" && deskOf(d.id)).find(Boolean) : null;
    const outlet = dsk ? `   outlet: ${dsk.name}` : "";
    out.push(`${pad(a.name + " " + l.a.port, 26)} <-> ${pad(b.name + " " + l.b.port, 26)} [${l.kind || "lan"}]${len}${via}${outlet}${cross}`);
  }
  return out;
}

function portUtilization(){
  const out = [];
  for(const d of Object.values(devices)){
    if(d.type !== "switch" && d.type !== "router") continue;
    const used = d.ports.filter(p => isLinked(d.id, p.id)).length;
    const pct = d.ports.length ? Math.round(100 * used / d.ports.length) : 0;
    out.push({ name: d.name, used, total: d.ports.length, pct, tight: pct > 80 });
  }
  return out;
}

/* ---------- link speeds: oversubscription per switch ---------- */
function oversub(sw){
  let access = 0, uplink = 0;
  for(const l of Object.values(links)){
    const kind = l.kind || "lan";
    if(kind !== "lan" && kind !== "remote") continue;
    let other = null;
    if(l.a.dev === sw.id) other = devices[l.b.dev];
    else if(l.b.dev === sw.id) other = devices[l.a.dev];
    if(!other) continue;
    const sp = l.speed || 1;
    if(other.type === "switch" || other.type === "router") uplink += sp;
    else access += sp;
  }
  return { access, uplink, ratio: uplink ? access / uplink : null };
}

/* ---------- failure impact (which cable hurts how much) ---------- */
var IMPACT = {};
var impactOn = false;

function reachPairs(){
  const hosts = Object.values(devices).filter(h => h.type === "host" && h.cfg.ip && !h.failed);
  const pairs = [];
  for(const a of hosts) for(const b of hosts)
    if(a !== b && pingRun(a, b.cfg.ip, {}).ok) pairs.push([a, b.cfg.ip]);
  return pairs;
}
function computeImpact(){
  IMPACT = {};
  const base = reachPairs();
  if(!base.length) return IMPACT;
  for(const [lid, l] of Object.entries(links)){
    const kind = l.kind || "lan";
    if(kind === "console" || l.failed) continue;
    const st = NET.linkStatus[lid];
    if(st !== "up" && st !== "blocked") continue;
    l.failed = true;
    rebuildAllDerived();
    let broken = 0;
    for(const [a, ip] of base) if(!pingRun(a, ip, {}).ok) broken++;
    IMPACT[lid] = broken;
    l.failed = false;
  }
  rebuildAllDerived();
  return IMPACT;
}
let impactTimer = null;
function onStateTouched(){
  if(!impactOn) return;
  if(impactTimer) clearTimeout(impactTimer);
  impactTimer = setTimeout(() => { computeImpact(); render(); }, 400);
}

/* ---------- design rule check ---------- */
var DRC_DEVS = new Set(), DRC_LINKS = new Set();

function linkDesc(lid){
  const l = links[lid];
  if(!l) return lid;
  const a = devices[l.a.dev], b = devices[l.b.dev];
  return `${a ? a.name : "?"}:${l.a.port} — ${b ? b.name : "?"}:${l.b.port}`;
}
function runDrc(){
  rebuildAllDerived();
  const f = [];
  const push = (sev, text, devIds, linkIds) => f.push({ sev, text, devIds: devIds || [], linkIds: linkIds || [] });
  if(NET.stormLinks.size)
    push("error", "Broadcast storm live right now: a physical loop with no spanning tree.", [], [...NET.stormLinks]);
  for(const d of Object.values(devices)){
    if(d.powered === false) push("warn", `${d.name} is powered off.`, [d.id]);
    if(d.brandNew) push("warn", `${d.name} is factory-fresh — day-zero setup (root password, commit) not completed.`, [d.id]);
    if(d.failed) push("info", `${d.name} is marked failed (what-if simulation is active).`, [d.id]);
  }
  const l3 = [];
  for(const d of Object.values(devices)) if(d.type !== "host") for(const i of ifacesOf(d)) l3.push({ dev: d, i });
  for(const h of Object.values(devices)){
    if(h.type !== "host" || !h.cfg.ip) continue;
    const gwIf = l3.find(x => sameSubnet(x.i.ip, h.cfg.ip, h.cfg.bits));
    if(h.cfg.gw && !sameSubnet(h.cfg.gw, h.cfg.ip, h.cfg.bits))
      push("error", `${h.name}'s gateway ${h.cfg.gw} is outside its own subnet — unreachable by definition.`, [h.id]);
    if(!gwIf) push("warn", `${h.name}'s subnet ${networkOf(h.cfg.ip, h.cfg.bits)}/${h.cfg.bits} has no gateway interface anywhere.`, [h.id]);
    else if(!h.cfg.gw) push("info", `${h.name} has no default gateway (fine if it only talks locally).`, [h.id]);
  }
  const seenNet = new Map();
  for(const x of l3){
    const key = networkOf(x.i.ip, x.i.bits) + "/" + x.i.bits;
    if(seenNet.has(key) && seenNet.get(key) !== x.dev)
      push("warn", `Subnet ${key} has gateway interfaces on both ${seenNet.get(key).name} and ${x.dev.name} — intended redundancy, or a plan clash?`, [seenNet.get(key).id, x.dev.id]);
    else seenNet.set(key, x.dev);
  }
  for(const [lid, l] of Object.entries(links)){
    const a = devices[l.a.dev], b = devices[l.b.dev];
    if(!a || !b || a.type !== "switch" || b.type !== "switch") continue;
    const pa = D(a).portCfg[l.a.port], pb = D(b).portCfg[l.b.port];
    if(!pa || !pb || pa.mode !== "trunk" || pb.mode !== "trunk") continue;
    const bIds = new Set(Object.values(D(b).vlans).map(v => v.id));
    const missing = pa.vlanIds.filter(id => !bIds.has(id));
    if(missing.length)
      push("warn", `Trunk ${a.name}:${l.a.port} carries VLAN id(s) ${missing.join(", ")} that ${b.name} does not define.`, [b.id], [lid]);
  }
  for(const d of Object.values(devices)){
    if(d.type !== "switch" && d.type !== "router") continue;
    for(const p of (D(d).pools || [])) for(const rg of p.ranges)
      for(const h of Object.values(devices))
        if(h.type === "host" && h.cfg.ip && !h.cfg.viaDhcp &&
           ipToInt(h.cfg.ip) >= ipToInt(rg.low) && ipToInt(h.cfg.ip) <= ipToInt(rg.high))
          push("warn", `${h.name}'s static ${h.cfg.ip} sits inside ${d.name}'s DHCP range ${rg.low}-${rg.high} — an address collision waiting to happen.`, [h.id, d.id]);
  }
  const privHosts = Object.values(devices).some(h => h.type === "host" && h.cfg.ip && !isPublicIp(h.cfg.ip));
  const hasIsp = Object.values(devices).some(d => d.type === "isp");
  const hasNat = Object.values(devices).some(d => d.type === "router" && (D(d).natRules || []).length);
  if(privHosts && hasIsp && !hasNat)
    push("warn", "Private hosts and an ISP uplink, but no source NAT on any router — the internet will not answer.", []);
  for(const u of portUtilization())
    if(u.tight) push("info", `${u.name}: ${u.used}/${u.total} ports used (${u.pct}%) — under 20% headroom for growth.`,
      [Object.values(devices).find(d => d.name === u.name)?.id].filter(Boolean));
  for(const d of Object.values(devices)){
    if(d.type !== "switch") continue;
    for(const [name, v] of Object.entries(D(d).vlans)){
      if(name === "default" || isNaN(v.id)) continue;
      const carried = effSwitchPorts(d).some(p => p.vlanIds.includes(v.id));
      if(!carried && D(d).irbByVlan[v.id] === undefined)
        push("info", `${d.name}: VLAN ${name} (${v.id}) is defined but nothing uses it.`, [d.id]);
    }
  }
  for(const d of Object.values(devices)){
    if(d.type !== "switch") continue;
    const o = oversub(d);
    if(o.ratio && o.ratio > 4)
      push("info", `${d.name}: access capacity ${o.access}G vs uplink ${o.uplink}G — ${o.ratio.toFixed(1)}:1 oversubscribed (4:1 is a common ceiling).`, [d.id]);
  }
  for(const [lid, l] of Object.entries(links)){
    const a = devices[l.a.dev], b = devices[l.b.dev];
    const ap = a && a.type === "ap" ? a : (b && b.type === "ap" ? b : null);
    const swd = a && a.type === "switch" ? a : (b && b.type === "switch" ? b : null);
    if(!ap || !swd) continue;
    const port = l.a.dev === swd.id ? l.a.port : l.b.port;
    const pc = D(swd).portCfg[port];
    if(pc && pc.mode === "trunk")
      push("warn", `${ap.name} (AP) is wired to trunk port ${swd.name}:${port} — this lab's APs bridge untagged; use an access port in the Wi-Fi VLAN.`, [ap.id], [lid]);
    if(typeof POE !== "undefined" && POE.denied[ap.id])
      push("error", `${ap.name} (AP) is dark: ${POE.denied[ap.id]}. Fix: a PoE switch (EX2300-24P, EX4300-48P, USW-Pro-24-PoE) or fit an FS.com injector (click the AP's port).`, [ap.id], []);
  }
  // management completeness — the stanzas real deployments always carry
  const noSsh = [], noNtp = [];
  for(const d of Object.values(devices)){
    if(d.type !== "switch" && d.type !== "router") continue;
    if(!cfgGet(d.config, ["system", "services", "ssh"])) noSsh.push(d.name);
    if(!(cfgGet(d.config, ["system", "ntp", "server"]) || []).length) noNtp.push(d.name);
  }
  if(noSsh.length) push("info", `No SSH management access configured on: ${noSsh.join(", ")} (set system services ssh).`, []);
  if(noNtp.length) push("info", `No NTP server on: ${noNtp.join(", ")} — log timestamps will drift.`, []);
  if(typeof THERMAL !== "undefined")
    for(const [zid2, zt] of Object.entries(THERMAL.zones)){
      const zn = zones[zid2] ? zones[zid2].name : zid2;
      if(zt.temp >= 38) push("error", `"${zn}" is at ${zt.temp.toFixed(1)}°C — gear will thermally shut down. Add cooling or shed load.`, []);
      else if(zt.temp >= 30) push("warn", `"${zn}" is running hot (${zt.temp.toFixed(1)}°C, ${zt.heatW} W of heat vs ${zt.coolW} W of cooling) — add a cooling unit before this becomes an incident.`, []);
    }
  for(const d of Object.values(devices))
    if(d.type === "crac" && !zoneOf(d.id))
      push("info", `${d.name} (cooling) sits outside every building — it is cooling the car park.`, [d.id]);
  const imp = computeImpact();
  for(const [lid, n] of Object.entries(imp))
    if(n > 0) push(n >= 2 ? "error" : "warn",
      `Single point of failure: losing cable ${linkDesc(lid)} breaks ${n} host-to-host path(s).`, [], [lid]);
  drcCableLengths(push);
  if(typeof trayFillCounts === "function")
    for(const [tid, n] of Object.entries(trayFillCounts())){
      const tz = zones[tid];
      if(!tz) continue;
      const lvl = TRAY_LEVELS[tz.level || "ceiling"];
      if(n > lvl.cap)
        push("warn", `"${tz.name}" (${lvl.label}) is overfilled: ${n} cables in a ~${lvl.cap}-cable pathway — crushed cables and heat follow. Add a second run or a fatter tray.`, []);
    }
  for(const z of Object.values(zones)){
    if((z.kind || "building") !== "building") continue;
    const infra = buildingInfra(z);
    if(!infra.length) continue;
    const cap = upsCapOf(z);
    const load = infra.filter(d => d.powered !== false).reduce((a, d) => a + drawOf(d), 0);
    if(cap === 0)
      push("info", `"${z.name}" has ${infra.length} infrastructure device(s) and no UPS — a grid outage takes everything down (drill it with the building's grid button).`, infra.map(d => d.id));
    else if(load > cap)
      push("warn", `"${z.name}": UPS is undersized — ${load} W of infrastructure on ${cap} W of battery. An outage right now drops the load anyway.`, infra.map(d => d.id));
  }
  return f;
}

function drcCableLengths(push){
  for(const [lid, l] of Object.entries(links)){
    const kind = l.kind || "lan";
    if(kind === "wifi" || kind === "console" || kind === "remote") continue;
    const a = devices[l.a.dev], b = devices[l.b.dev];
    if(!a || !b) continue;
    const zA = zoneOf(a.id), zB = zoneOf(b.id);
    if(zA !== zB && (zA || zB)) continue;   // cross-building runs are already fibre
    const m = linkLenM(l);
    if(m > 100)
      push("error", `${a.name} <-> ${b.name} is ~${m} m of copper — Cat6 tops out at 100 m (signal dies, link flaps). Use fibre for this run, or add a closet switch along the way.`, [a.id, b.id], [lid]);
  }
}
function showDrcModal(){
  const findings = runDrc();
  DRC_DEVS = new Set(); DRC_LINKS = new Set();
  for(const x of findings){ x.devIds.forEach(id => DRC_DEVS.add(id)); x.linkIds.forEach(id => DRC_LINKS.add(id)); }
  render();
  showModal((box, done) => {
    box.classList.add("wide");
    const h = document.createElement("h3"); h.textContent = "Design rule check"; box.appendChild(h);
    if(!findings.length){
      const p = document.createElement("p");
      p.textContent = "No findings. The design passes every rule this lab knows how to check — which is a good sign, not a guarantee.";
      box.appendChild(p);
    }
    for(const sev of ["error", "warn", "info"]){
      const group = findings.filter(x => x.sev === sev);
      if(!group.length) continue;
      const hd = document.createElement("div"); hd.className = "ref-h";
      hd.textContent = sev === "error" ? `Errors (${group.length})` : sev === "warn" ? `Warnings (${group.length})` : `Notes (${group.length})`;
      box.appendChild(hd);
      for(const x of group){
        const row = document.createElement("div");
        row.className = "drc-row drc-" + sev;
        row.textContent = x.text;
        box.appendChild(row);
      }
    }
    const p2 = document.createElement("p");
    p2.textContent = "Findings are highlighted on the canvas until you close this window.";
    box.appendChild(p2);
    const btns = document.createElement("div"); btns.className = "mbtns";
    const close = document.createElement("button"); close.textContent = "Close";
    close.onclick = () => { DRC_DEVS = new Set(); DRC_LINKS = new Set(); render(); done(null); };
    btns.appendChild(close); box.appendChild(btns);
  });
}

/* ---------- reachability matrix ---------- */
function showMatrixModal(){
  const hosts = Object.values(devices).filter(h => h.type === "host" && h.cfg.ip);
  showModal((box, done) => {
    box.classList.add("wide");
    const h = document.createElement("h3"); h.textContent = "Reachability matrix"; box.appendChild(h);
    if(hosts.length < 2){
      const p = document.createElement("p");
      p.textContent = "Fewer than two addressed hosts on the canvas — nothing to prove yet.";
      box.appendChild(p);
    } else {
      const p = document.createElement("p");
      p.textContent = "Rows ping columns. Click any cell to run that ping on the canvas with the full animation and failure callout.";
      box.appendChild(p);
      const table = document.createElement("table"); table.className = "matrix";
      const hr = document.createElement("tr");
      hr.appendChild(document.createElement("th"));
      for(const c of hosts){ const th = document.createElement("th"); th.textContent = c.name; hr.appendChild(th); }
      const thN = document.createElement("th"); thN.textContent = "internet"; hr.appendChild(thN);
      table.appendChild(hr);
      for(const r of hosts){
        const tr = document.createElement("tr");
        const th = document.createElement("th"); th.textContent = r.name; tr.appendChild(th);
        const targets = [...hosts.map(c => ({ ip: c.cfg.ip, self: c === r })), { ip: "8.8.8.8", self: false }];
        for(const t of targets){
          const td = document.createElement("td");
          if(t.self){ td.textContent = "—"; td.className = "m-self"; }
          else {
            const ok = pingRun(r, t.ip, {}).ok;
            td.textContent = ok ? "ok" : "no";
            td.className = ok ? "m-ok" : "m-fail";
            td.onclick = () => { done(null); setTimeout(() => { doDevicePing(r, t.ip); }, 60); };
          }
          tr.appendChild(td);
        }
        table.appendChild(tr);
      }
      box.appendChild(table);
    }
    const btns = document.createElement("div"); btns.className = "mbtns";
    const close = document.createElement("button"); close.textContent = "Close"; close.onclick = () => done(null);
    btns.appendChild(close); box.appendChild(btns);
  });
}

/* ---------- rack elevation ---------- */
function showRackModal(zone){
  showModal((box, done) => {
    box.classList.add("wide");
    const h = document.createElement("h3"); h.textContent = zone.name + " — rack elevation"; box.appendChild(h);
    const rackDevs = Object.values(devices)
      .filter(d => (d.type === "switch" || d.type === "router" || d.type === "server") && zoneContains(zone, d))
      .sort((a, b) => (a.y - b.y) || (a.type === b.type ? 0 : a.type === "router" ? -1 : 1));
    const others = Object.values(devices).filter(d =>
      (d.type === "host" || d.type === "isp" || d.type === "ap" || d.type === "crac") && zoneContains(zone, d));
    if(!rackDevs.length){
      const p = document.createElement("p");
      p.textContent = "No rack-mount gear (switches, routers, servers) in here yet — drop some on the rack and it clicks into the rails.";
      box.appendChild(p);
    } else {
      const rack = document.createElement("div"); rack.className = "rack";
      let u = 1;
      for(const d of rackDevs){
        const slot = document.createElement("div");
        slot.className = "rack-slot" + (d.type === "router" ? " r-router" : "") +
          (d.powered === false ? " r-off" : "") + (d.failed ? " r-fail" : "");
        const un = document.createElement("span"); un.className = "rack-u"; un.textContent = "U" + (u++);
        const nm = document.createElement("span"); nm.className = "rack-name";
        nm.textContent = d.name + "  ·  " + (d.model || (d.type === "switch" ? "switch" : "router"));
        const used = d.ports.filter(p => isLinked(d.id, p.id)).length;
        const pu = document.createElement("span"); pu.className = "rack-ports";
        pu.textContent = used + "/" + d.ports.length + " ports";
        slot.append(un, nm, pu);
        const strip = document.createElement("div"); strip.className = "rack-strip";
        d.ports.slice(0, 24).forEach(p => {
          const jack = document.createElement("span");
          jack.className = "rack-jack" + (isLinked(d.id, p.id) ? " used" : "");
          strip.appendChild(jack);
        });
        slot.appendChild(strip);
        rack.appendChild(slot);
      }
      box.appendChild(rack);
    }
    if(others.length){
      const p = document.createElement("p");
      p.textContent = "Not rack-mounted in this building: " + others.map(d => `${d.name} (${d.type})`).join(", ");
      box.appendChild(p);
    }
    const leaving = Object.values(links).filter(l => {
      const inA = zoneContains(zone, devices[l.a.dev]), inB = zoneContains(zone, devices[l.b.dev]);
      return inA !== inB;
    }).length;
    const p2 = document.createElement("p");
    p2.textContent = `Cable runs leaving this building: ${leaving}.`;
    box.appendChild(p2);
    const btns = document.createElement("div"); btns.className = "mbtns";
    const close = document.createElement("button"); close.textContent = "Close"; close.onclick = () => done(null);
    btns.appendChild(close); box.appendChild(btns);
  });
}

/* ---------- the build packet ---------- */
function buildPacketText(){
  const out = [];
  const line = (s) => out.push(s);
  line("JUNOS LAB — BUILD PACKET");
  line("generated " + new Date().toISOString().slice(0, 10));
  line("");
  line("== BILL OF MATERIALS (indicative Belgian street prices, EUR) ==");
  const bom = computeBom();
  const cats = [...BOM_CATS, ...new Set(bom.list.map(r => r.cat).filter(c => !BOM_CATS.includes(c)))];
  for(const cat of cats){
    const rows = bom.list.filter(r => r.cat === cat);
    if(!rows.length) continue;
    line("");
    line("  -- " + cat + " --");
    for(const r of rows)
      line(`  ${pad(String(r.qty) + "x", 5)}${pad(r.label, 44)}${r.unit ? pad(euro(r.unit), 12) + pad(euro(r.unit * r.qty), 12) : "—"}${r.monthly ? "  " + euro(r.monthly) + "/month" : ""}${r.est ? "  (estimate)" : ""}`);
    const catSub = rows.reduce((s2, r) => s2 + r.unit * r.qty, 0);
    if(catSub) line(`  ${pad("", 5)}${pad("subtotal — " + cat, 44)}${pad("", 12)}${euro(catSub)}`);
  }
  line("");
  line(`  ${pad("subtotal (ex VAT)", 49)}${euro(bom.subtotal)}`);
  line(`  ${pad("VAT 21% (Belgium)", 49)}${euro(bom.vat)}`);
  line(`  ${pad("TOTAL (incl VAT)", 49)}${euro(bom.total)}`);
  if(bom.monthly) line(`  ${pad("recurring", 49)}${euro(bom.monthly)}/month`);
  line("  prices are 2026 ballpark figures — Juniper/Ubiquiti via your reseller,");
  line("  cabling and optics from FS.com; always verify before ordering");
  line("");
  line("== CABLING SCHEDULE (patch this, in order) ==");
  cablingSchedule().forEach(r => line("  " + r));
  line("");
  line("== IP PLAN ==");
  for(const sn of computeIpPlan())
    line(`  ${pad(sn.net, 20)}${pad(sn.vlan || "-", 16)}gw: ${pad(sn.gateways.join("; ") || "NONE", 42)}dhcp: ${sn.dhcp || "-"}  hosts: ${sn.hosts}`);
  line("");
  line("== PORT UTILIZATION ==");
  for(const u of portUtilization())
    line(`  ${pad(u.name, 20)}${u.used}/${u.total} used (${u.pct}%)${u.tight ? "  ** low headroom" : ""}`);
  line("");
  line("== UPLINK OVERSUBSCRIPTION ==");
  let anyOs = false;
  for(const d of Object.values(devices)){
    if(d.type !== "switch") continue;
    const o = oversub(d);
    if(!o.uplink) continue;
    anyOs = true;
    line(`  ${pad(d.name, 20)}access ${o.access}G / uplink ${o.uplink}G  (${o.ratio.toFixed(1)}:1)`);
  }
  if(!anyOs) line("  (no switch uplinks yet)");
  line("");
  line("== BUILDINGS ==");
  for(const z of Object.values(zones))
    line(`  ${pad(z.name, 20)}${zoneMembers(z).length} device(s)`);
  if(!Object.keys(zones).length) line("  (no buildings drawn — add them with + Building)");
  line("");
  line("== PER-DEVICE CONFIGURATIONS ==");
  for(const dev of Object.values(devices)){
    if(dev.type === "switch" || dev.type === "router"){
      line("");
      line(`## ----- ${hostnameOf(dev)} (${dev.model || dev.type}) -----`);
      line(showConfigCmd(dev));
    }
  }
  return out.join("\n");
}
function showBuildPacket(){
  const text = buildPacketText();
  showModal((box, done) => {
    box.classList.add("wide");
    const h = document.createElement("h3"); h.textContent = "Build packet"; box.appendChild(h);
    const p = document.createElement("p");
    p.textContent = "Everything an installer (or future you) needs: shopping list with Belgian pricing, patch schedule, IP plan, and every config.";
    box.appendChild(p);
    const pre = document.createElement("pre"); pre.className = "ref-quick packet";
    pre.textContent = text;
    box.appendChild(pre);
    const btns = document.createElement("div"); btns.className = "mbtns";
    const dl = document.createElement("button"); dl.textContent = "Download";
    dl.onclick = () => {
      const blob = new Blob([text + "\n"], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "junos-lab-build-packet.txt"; a.click();
    };
    const close = document.createElement("button"); close.textContent = "Close"; close.onclick = () => done(null);
    btns.append(dl, close); box.appendChild(btns);
  });
}

/* ---------- toolbar wiring ---------- */
document.getElementById("add-zone").onclick = async () => {
  const n = await modalInput("New building", "A building is a labeled region — drag devices inside it, drag its header to move everything together, and click 'rack' on it for the elevation view.", "Building " + (Object.keys(zones).length + 1), "text");
  if(n === null || !n.trim()) return;
  pushUndo();
  const c = worldCenter();
  const id = uid("zn");
  zones[id] = { id, name: n.trim(), x: c.x - 170, y: c.y - 140, w: 340, h: 280, hue: Object.keys(zones).length };
  touchState();
};
document.getElementById("validate-btn").onclick = showDrcModal;
document.getElementById("matrix-btn").onclick = showMatrixModal;
document.getElementById("packet-btn").onclick = showBuildPacket;
document.getElementById("impact-btn").onclick = () => {
  impactOn = !impactOn;
  const b = document.getElementById("impact-btn");
  if(b) b.classList.toggle("active", impactOn);
  if(impactOn) computeImpact();
  render();
};

/* ---------- design snapshots + diff ---------- */
function listSnapshots(){
  try{ return JSON.parse(localStorage.getItem("junoslab-snapshots") || "[]") || []; }catch(e){ return []; }
}
function saveSnapshotsList(a){
  try{ localStorage.setItem("junoslab-snapshots", JSON.stringify(a.slice(-10))); }catch(e){}
}
async function takeSnapshot(){
  const name = await modalInput("Snapshot this design",
    "Snapshots live in your browser (up to 10). Compare any two later — or restore one wholesale.",
    "Design " + (listSnapshots().length + 1), "text");
  if(name === null || !name.trim()) return;
  const a = listSnapshots();
  a.push({ name: name.trim(), at: Date.now(), data: serializeLab() });
  saveSnapshotsList(a);
  await modalConfirm("Snapshot saved", `"${name.trim()}" — ${Object.keys(devices).length} devices, ${Object.keys(links).length} links.`, "OK");
}
function snapNames(data){
  const m = {};
  for(const d of (data.devices || [])) m[d.id] = d.name || d.id;
  return m;
}
function snapshotDiff(A, B){
  const out = [];
  const aDevs = new Map((A.devices || []).map(d => [d.id, d]));
  const bDevs = new Map((B.devices || []).map(d => [d.id, d]));
  const aN = snapNames(A), bN = snapNames(B);
  for(const [id, d] of bDevs) if(!aDevs.has(id)) out.push(`+ device ${d.name} (${d.model || d.type})`);
  for(const [id, d] of aDevs) if(!bDevs.has(id)) out.push(`- device ${d.name} (${d.model || d.type})`);
  for(const [id, d] of aDevs){
    const b2 = bDevs.get(id);
    if(!b2) continue;
    if(d.name !== b2.name) out.push(`~ ${d.name} renamed to ${b2.name}`);
    if(d.config || b2.config){
      const diff = diffTrees(d.config || {}, b2.config || {});
      if(diff) out.push(`~ config of ${b2.name || d.name}:`, ...diff.split("\n").map(x => "    " + x));
    }
    if(d.cfg && b2.cfg && JSON.stringify(d.cfg) !== JSON.stringify(b2.cfg))
      out.push(`~ ${b2.name}: settings changed (${JSON.stringify(d.cfg)} -> ${JSON.stringify(b2.cfg)})`);
  }
  const aL = A.links || {}, bL = B.links || {};
  const ldesc = (l, names) => `${names[l.a.dev] || l.a.dev}:${l.a.port} — ${names[l.b.dev] || l.b.dev}:${l.b.port} [${l.kind || "lan"}]`;
  for(const k of Object.keys(bL)) if(!aL[k]) out.push(`+ link ${ldesc(bL[k], bN)}`);
  for(const k of Object.keys(aL)) if(!bL[k]) out.push(`- link ${ldesc(aL[k], aN)}`);
  const aZ = A.zones || {}, bZ = B.zones || {};
  for(const k of Object.keys(bZ)) if(!aZ[k]) out.push(`+ building ${bZ[k].name}`);
  for(const k of Object.keys(aZ)) if(!bZ[k]) out.push(`- building ${aZ[k].name}`);
  return out.length ? out.join("\n") : "(no differences)";
}
async function compareSnapshots(){
  const snaps = listSnapshots();
  if(!snaps.length){
    await modalConfirm("No snapshots yet", "Take one first: Lab > Snapshot this design.", "OK");
    return;
  }
  const opts = snaps.map((s2, i) => ({ value: i, label: s2.name, desc: new Date(s2.at).toLocaleString() }));
  const ai = await modalChoice("Compare: pick the BASE (A)", "The diff reads as: what changed going from A to B.", opts);
  if(ai === null) return;
  const optsB = [{ value: -1, label: "Current canvas", desc: "Whatever is on screen right now" },
    ...opts.filter(o => o.value !== ai)];
  const bi = await modalChoice("Compare: pick B", "", optsB);
  if(bi === null) return;
  const A = snaps[ai].data;
  const B = bi === -1 ? serializeLab() : snaps[bi].data;
  const text = `A: ${snaps[ai].name}\nB: ${bi === -1 ? "current canvas" : snaps[bi].name}\n\n` + snapshotDiff(A, B);
  showModal((box, done) => {
    box.classList.add("wide");
    const h = document.createElement("h3"); h.textContent = "Design diff"; box.appendChild(h);
    const pre = document.createElement("pre"); pre.className = "ref-quick packet"; pre.textContent = text;
    box.appendChild(pre);
    const btns = document.createElement("div"); btns.className = "mbtns";
    const restore = document.createElement("button");
    restore.textContent = "Load A onto the canvas";
    restore.onclick = () => { pushUndo(); loadLab(JSON.parse(JSON.stringify(A))); done(null); };
    const close = document.createElement("button"); close.textContent = "Close"; close.onclick = () => done(null);
    btns.append(restore, close); box.appendChild(btns);
  });
}

/* ---------- diagram export ---------- */
function diagramCss(){
  const v = (n, f) => cssVar(n, f);
  return [
    `text{font-family:Consolas,Menlo,monospace;fill:${v("--text","#dfe8e2")};font-size:11px}`,
    `.label{fill:${v("--dim","#7f9187")};font-size:9px}`,
    `.captag{fill:${v("--amber","#c99a3c")};font-size:7.5px}`,
    `.iplabel{fill:${v("--dim","#7f9187")};font-size:8px}`,
    `.ctl-label{fill:${v("--dim","#7f9187")};font-size:6.5px}`,
    `.speedlbl{fill:${v("--dim","#7f9187")};font-size:8px}`,
    `.aebadge{fill:${v("--amber","#c99a3c")};font-size:9px}`,
    `.zone-name{fill:${v("--text","#dfe8e2")};font-size:11px}`,
    `.zone-meta,.zone-act{fill:${v("--dim","#7f9187")};font-size:9px}`,
    `.device rect.body{fill:${v("--device","#182219")};stroke:${v("--line","#2a3a30")};stroke-width:1.5}`,
    `.device.router rect.body{fill:${v("--router","#141c26")};stroke:${v("--router-border","#2a3a4a")}}`,
    `.device.isp rect.body{fill:${v("--isp","#241a26")};stroke:${v("--isp-border","#3a2a44")};stroke-dasharray:4 2}`,
    `.device.ap rect.body{stroke:#3b9ec9}`,
    `.devband{fill:${v("--btn","#1f2b23")};opacity:.4}`,
    `.divh,.divline{stroke:${v("--line","#2a3a30")}}`,
    `.portstrip{fill:${v("--cli-bg","#0b100d")};opacity:.55;stroke:${v("--line","#2a3a30")}}`,
    `.glyph{stroke:${v("--dim","#7f9187")};fill:none}`,
    `.port,.sport{fill:${v("--port","#26362c")};stroke:${v("--dim","#7f9187")}}`,
    `.port.up,.sport.up{fill:${v("--green","#3ecf6e")}}`,
    `.port.blk{fill:${v("--blk","#5a4516")};stroke:${v("--amber","#c99a3c")}}`,
    `.port.errdis{fill:${v("--errdis","#4a1512")};stroke:${v("--red","#d1554a")}}`,
    `.pwrbtn circle{fill:${v("--obj-done","#173322")};stroke:${v("--green","#3ecf6e")}}`,
    `.pwrglyph{fill:none;stroke:${v("--green","#3ecf6e")}}`,
    `.link{stroke:${v("--red","#d1554a")};stroke-width:2;fill:none}`,
    `.link.up{stroke:${v("--green","#3ecf6e")}}`,
    `.link.mgmt{stroke-dasharray:6 3}`,
    `.link.mgmt.up{stroke:${v("--blue","#4a90d9")}}`,
    `.link.console{stroke-dasharray:2 3;stroke:${v("--dim","#7f9187")}}`,
    `.link.remote{stroke-dasharray:10 4}`,
    `.link.remote.up{stroke:${v("--amber","#c99a3c")}}`,
    `.link.wifi{stroke-dasharray:1.5 5}`,
    `.link.wifi.up{stroke:${v("--blue","#4a90d9")}}`,
    `.link.agg{stroke-width:3.5}`,
    `.link.blocked{stroke:${v("--amber","#c99a3c")};stroke-dasharray:3 5}`,
    `.link.storm{stroke:${v("--storm","#ff7d4d")};stroke-width:3}`,
    `.conduit{stroke:${v("--panel","#16201b")};stroke-width:7;stroke-linecap:round}`,
    `.linkhit,.porthit{fill:none;stroke:none}`,
    `.zone-wall{fill:none;stroke-width:3.5;opacity:.55}`,
    `.zone-inner{opacity:.06}`,
    `.zone-head{opacity:.16}`,
    `.zone-handle{fill:${v("--line","#2a3a30")}}`,
    `.apcov{fill:${v("--blue","#4a90d9")};opacity:.05;stroke:${v("--blue","#4a90d9")};stroke-dasharray:4 7}`,
    `.lensring,.lensbg,.lenswrap{display:none}`,
    `.pkt,.pktfail,.floatlbl{display:none}`,
  ].join("\n");
}
function buildDiagramText(){
  const r = svg.getBoundingClientRect();
  const w = Math.max(400, Math.round(r.width || 1600));
  const hgt = Math.max(300, Math.round(r.height || 900));
  return { w, h: hgt, text:
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}">` +
    `<style>${diagramCss()}</style>` +
    `<rect width="100%" height="100%" fill="${cssVar("--bg", "#0f1512")}"/>` +
    svg.innerHTML + `</svg>` };
}
function exportDiagramSvg(){
  try{
    const d = buildDiagramText();
    const blob = new Blob([d.text], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "junos-lab-diagram.svg"; a.click();
  }catch(err){ modalConfirm("Export failed", String((err && err.message) || err), "OK"); }
}
function exportDiagramPng(){
  try{
    const d = buildDiagramText();
    const url = URL.createObjectURL(new Blob([d.text], { type: "image/svg+xml" }));
    const img = new Image();
    img.onload = () => {
      try{
        const cv = document.createElement("canvas");
        cv.width = d.w * 2; cv.height = d.h * 2;
        const ctx2 = cv.getContext("2d");
        ctx2.scale(2, 2);
        ctx2.drawImage(img, 0, 0);
        cv.toBlob(b => {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(b); a.download = "junos-lab-diagram.png"; a.click();
        });
      }catch(e2){ modalConfirm("PNG export failed", "The browser blocked canvas conversion — use the SVG export instead.", "OK"); }
    };
    img.src = url;
  }catch(err){ modalConfirm("PNG export failed", "Use the SVG export instead. (" + ((err && err.message) || err) + ")", "OK"); }
}
