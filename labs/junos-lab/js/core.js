/* ============================================================
   STATE
   ============================================================ */
let devices = {};      // id -> device
let links = {};        // id -> {a:{dev,port}, b:{dev,port}, kind}
let zones = {};        // id -> {id, name, x, y, w, h, hue} — buildings/rooms
let nextId = 1;
let mode = "normal";   // normal | link | delete
let armedPort = null;
let activeDevice = null;   // device id of the active CLI tab
let openTabs = [];         // device ids with an open CLI session
let dragging = null;
let panning = null;
let view = { x: 0, y: 0, scale: 1 };

const LS_AUTOSAVE = "junoslab-autosave-v2";
const LS_PROGRESS = "junoslab-progress-v2";

function uid(prefix){ return prefix + (nextId++); }
const deepClone = o => JSON.parse(JSON.stringify(o === undefined ? null : o));

/* ============================================================
   IP HELPERS
   ============================================================ */
function validIp(ip){
  if(typeof ip !== "string") return false;
  const p = ip.split(".");
  return p.length === 4 && p.every(x => /^\d{1,3}$/.test(x) && +x <= 255);
}
function parsePrefix(s){
  if(typeof s !== "string" || !s.includes("/")) return null;
  const [ip, bits] = s.split("/");
  if(!validIp(ip) || !/^\d{1,2}$/.test(bits) || +bits > 32) return null;
  return { ip, bits: +bits };
}
function ipToInt(ip){
  const p = ip.split(".").map(Number);
  return ((p[0]<<24) | (p[1]<<16) | (p[2]<<8) | p[3]) >>> 0;
}
function maskFor(bits){ return bits <= 0 ? 0 : (~0 << (32 - bits)) >>> 0; }
function sameSubnet(ipA, ipB, bits){
  if(!validIp(ipA) || !validIp(ipB)) return false;
  const m = maskFor(bits);
  return (ipToInt(ipA) & m) === (ipToInt(ipB) & m);
}
function networkOf(ip, bits){
  const n = ipToInt(ip) & maskFor(bits);
  return [(n>>>24)&255, (n>>>16)&255, (n>>>8)&255, n&255].join(".");
}
function isPublicIp(ip){
  if(!validIp(ip)) return false;
  const o = ip.split(".").map(Number);
  if(o[0] === 10 || o[0] === 127) return false;
  if(o[0] === 172 && o[1] >= 16 && o[1] <= 31) return false;
  if(o[0] === 192 && o[1] === 168) return false;
  if(o[0] === 169 && o[1] === 254) return false;
  return true;
}
function intToIp(n){
  return [(n>>>24)&255, (n>>>16)&255, (n>>>8)&255, n&255].join(".");
}
/* per-device event log — the "show log messages" backing store */
/* the canvas is a floor plan: 1 px = 0.25 m. Cable lengths, Wi-Fi coverage
   and the Cat6 100 m rule all use this scale. */
const M_PER_PX = 0.25;
function devLog(dev, text){
  if(!dev || (dev.type !== "switch" && dev.type !== "router" && dev.type !== "crac" && dev.type !== "server" && dev.type !== "ups")) return;
  dev.syslog = dev.syslog || [];
  dev.syslog.push(new Date().toTimeString().slice(0, 8) + "  " + text);
  if(dev.syslog.length > 80) dev.syslog.shift();
  syslogForward(dev, text);
}
/* "set system syslog host <ip> any any" streams a copy of every log line to a
   server running the syslog service. It is UDP in spirit: if the server is
   unreachable, off, or not listening, the line is simply lost — like real life. */
function syslogForward(dev, text){
  if(syslogForward._busy) return;
  if(dev.type !== "switch" && dev.type !== "router") return;
  if(typeof pingRun !== "function" || !dev.config) return;
  const hosts = Object.keys(cfgGet(dev.config, ["system", "syslog", "host"]) || {});
  if(!hosts.length) return;
  syslogForward._busy = true;
  try{
    for(const ip of hosts){
      const srv = Object.values(devices).find(x => x.type === "server" && x.cfg && x.cfg.ip === ip);
      if(!srv || srv.powered === false || !(srv.cfg.services && srv.cfg.services.syslog)) continue;
      let ok = false;
      try{ ok = pingRun(dev, ip, {}).ok; }catch(e){}
      if(!ok) continue;
      srv.syslog = srv.syslog || [];
      srv.syslog.push(new Date().toTimeString().slice(0, 8) + "  " + dev.name + "  " + text);
      if(srv.syslog.length > 200) srv.syslog.shift();
    }
  } finally { syslogForward._busy = false; }
}
function macOf(devId, portId){
  let h = 5381;
  const s = devId + "/" + portId;
  for(let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  const b = n => ((h >>> n) & 255).toString(16).padStart(2, "0");
  return `2c:6b:f5:${b(0)}:${b(8)}:${b(16)}`;   // Juniper OUI
}

/* ============================================================
   DEVICE FACTORIES
   ============================================================ */
function freshCli(){ return { mode:"op", editKeys:[], history:[], hIdx:-1, log:[] }; }

var DEVICE_PROFILES = {
  "EX2300-C-12T": { access: 12, uplinks: 2, uplinkKind: "ge", uplinkPic: 1, version: "21.4R3.15", els: true },
  "EX2300-24P":   { access: 24, uplinks: 4, uplinkKind: "ge", uplinkPic: 1, version: "21.4R3.15", els: true },
  "EX3400-24T":   { access: 24, uplinks: 4, uplinkKind: "xe", uplinkPic: 1, version: "21.4R3.15", els: true },
  "EX4300-48T":   { access: 48, uplinks: 4, uplinkKind: "xe", uplinkPic: 1, version: "23.4R1.10", els: true },
  "EX4300-48P":   { access: 48, uplinks: 4, uplinkKind: "xe", uplinkPic: 1, version: "23.4R1.10", els: true },
  "EX4300-24T":   { access: 24, uplinks: 4, uplinkKind: "xe", uplinkPic: 1, version: "23.4R1.10", els: true },
  "QFX5100-48S":  { access: 48, uplinks: 6, uplinkKind: "et", uplinkPic: 1, version: "21.4R3.15", els: true },
  "MX204":        { access: 8, uplinks: 0, uplinkKind: "et", uplinkPic: 1, version: "23.4R1.10", els: true, router: true },
  "SRX300":       { access: 8, uplinks: 0, uplinkKind: "ge", uplinkPic: 1, version: "21.4R3.15", els: true, router: true },
};
function profileFor(model){
  return (model && DEVICE_PROFILES[model]) || null;
}
function buildPorts(model, fallbackCount){
  const p = profileFor(model);
  if(!p){
    const n = fallbackCount || 12;
    return Array.from({ length: n }, (_, i) => ({ id: `ge-0/0/${i}` }));
  }
  const ports = [];
  for(let i = 0; i < p.access; i++) ports.push({ id: `ge-0/0/${i}`, role: "access" });
  for(let i = 0; i < p.uplinks; i++)
    ports.push({ id: `${p.uplinkKind}-0/${p.uplinkPic}/${i}`, role: "uplink", speed: p.uplinkKind === "ge" ? 1000 : (p.uplinkKind === "xe" ? 10000 : 40000) });
  return ports;
}
function makeSwitch(x, y, portCount, model){
  const id = uid("sw");
  const n = portCount || 12;
  devices[id] = {
    id, type:"switch", x, y, name:id, model: model || null,
    ports: buildPorts(model, n),
    config: {}, candidate: {}, cfgHistory: [],
    errDisabled: {}, macTable: [], arp: {}, stats: {},
    commitPending: null, cli: freshCli(),
  };
  return id;
}
function makeRouter(x, y, portCount, model){
  const id = uid("rt");
  const n = portCount || 4;
  devices[id] = {
    id, type:"router", x, y, name:id, model: model || null,
    ports: Array.from({length:n}, (_, i) => ({ id:`ge-0/0/${i}` })),
    config: {}, candidate: {}, cfgHistory: [],
    errDisabled: {}, macTable: [], arp: {}, stats: {},
    commitPending: null, cli: freshCli(),
  };
  return id;
}
function makeHost(x, y){
  const id = uid("h");
  devices[id] = {
    id, type:"host", x, y, name:id,
    ports: [{ id:"eth0" }],
    cfg: { ip:null, bits:null, gw:null }, arp: {}, cli: freshCli(),
  };
  return id;
}
function makeServer(x, y){
  const id = uid("srv");
  devices[id] = {
    id, type:"server", x, y, name:id,
    ports: [{ id:"eth0" }],
    cfg: { ip:null, bits:null, gw:null, ns:null, services:{}, records:{} },
    arp: {}, cli: freshCli(),
  };
  return id;
}
function makeUps(x, y, model, capW){
  const id = uid("ups");
  devices[id] = {
    id, type:"ups", x, y, name:id, model: model || null,
    ports: [],
    cfg: { capW: capW || 1000 }, cli: freshCli(),
  };
  return id;
}
function makeAp(x, y, ssid, model, radius){
  const id = uid("ap");
  devices[id] = {
    id, type:"ap", x, y, name: ssid || "office-wifi", model: model || null,
    ports: [{ id:"eth0" }],
    cfg: { ssid: ssid || "office-wifi", radius: radius || 160 }, cli: freshCli(),
  };
  return id;
}
function makeCrac(x, y, model, coolW){
  const id = uid("cr");
  devices[id] = {
    id, type:"crac", x, y, name: model || "cooling", model: model || null,
    ports: [], cfg: { coolW: coolW || 3500 }, cli: freshCli(),
  };
  return id;
}
function makeIsp(x, y, ip){
  const id = uid("isp");
  devices[id] = {
    id, type:"isp", x, y, name:"ISP",
    ports: [{ id:"wan0" }],
    cfg: { ip: ip || "203.0.113.1", bits: 30, asn: 65001 }, cli: freshCli(),
  };
  return id;
}
function hostnameOf(dev){
  if(dev.type === "switch" || dev.type === "router")
    return (dev.config.system && dev.config.system["host-name"]) || dev.id;
  return dev.name;
}

/* ============================================================
   CONFIG TREE  (candidate/applied are nested plain objects that
   mirror the JunOS hierarchy; keys are tokens, leaves are values)
   ============================================================ */
function cfgGet(tree, keys){
  let t = tree;
  for(const k of keys){
    if(!t || typeof t !== "object" || Array.isArray(t) || !(k in t)) return undefined;
    t = t[k];
  }
  return t;
}
function cfgSet(tree, keys, value){
  let t = tree;
  for(let i = 0; i < keys.length - 1; i++){
    const k = keys[i];
    if(typeof t[k] !== "object" || t[k] === null || Array.isArray(t[k]) || t[k] === true) t[k] = {};
    else if(t[k] === undefined) t[k] = {};
    t = t[k];
  }
  t[keys[keys.length - 1]] = value;
}
function cfgEnsure(tree, keys){       // presence: create path without clobbering
  let t = tree;
  for(let i = 0; i < keys.length; i++){
    const k = keys[i];
    if(typeof t[k] !== "object" || t[k] === null || Array.isArray(t[k])){
      if(i === keys.length - 1){ if(t[k] === undefined) t[k] = true; }
      else t[k] = {};
    }
    if(i < keys.length - 1) t = t[k];
  }
}
function cfgAppend(tree, keys, value){
  const cur = cfgGet(tree, keys);
  if(Array.isArray(cur)){ if(!cur.includes(value)) cur.push(value); }
  else cfgSet(tree, keys, [value]);
}
function cfgDelete(tree, keys){
  if(!keys.length) return;
  if(keys.length === 1){ delete tree[keys[0]]; return; }
  const k = keys[0];
  if(tree[k] && typeof tree[k] === "object" && !Array.isArray(tree[k])){
    cfgDelete(tree[k], keys.slice(1));
    if(Object.keys(tree[k]).length === 0) delete tree[k];
  }
}

/* ------------------------------------------------------------
   CONFIG COMMENTS  (JunOS "annotate")
   Comments hang off a statement, not inside it. They live in one
   flat map at the tree root so that every Object.entries() walk
   over interfaces / vlans / terms keeps seeing only real config.
   ------------------------------------------------------------ */
var ANNOT_KEY = "@annotations";

function annotAll(tree){ return (tree && tree[ANNOT_KEY]) || null; }
function annotGet(tree, keys){
  const m = annotAll(tree);
  return m ? m[keys.join(" ")] : undefined;
}
function annotSet(tree, keys, text){
  if(!tree[ANNOT_KEY]) tree[ANNOT_KEY] = {};
  tree[ANNOT_KEY][keys.join(" ")] = text;
}
function annotClear(tree, keys){
  const m = tree[ANNOT_KEY];
  if(!m) return false;
  const k = keys.join(" ");
  if(!(k in m)) return false;
  delete m[k];
  if(!Object.keys(m).length) delete tree[ANNOT_KEY];
  return true;
}
function annotPrune(tree){
  const m = tree && tree[ANNOT_KEY];
  if(!m) return;
  for(const k of Object.keys(m))
    if(cfgGet(tree, k.split(" ")) === undefined) delete m[k];
  if(!Object.keys(m).length) delete tree[ANNOT_KEY];
}
function cfgIsEmpty(tree){
  if(!tree) return true;
  return Object.keys(tree).filter(k => k !== ANNOT_KEY).length === 0;
}
function annotClean(text){
  return String(text == null ? "" : text)
    .replace(/[\r\n]+/g, " ")
    .replace(/\*\//g, "* /")
    .replace(/\/\*/g, "/ *")
    .trim();
}

/* JunOS-style curly-brace rendering */
function treeToText(t, ind, annots, path){
  ind = ind || "";
  if(annots === undefined){ annots = annotAll(t) || {}; path = []; }
  path = path || [];
  const out = [];
  for(const k of Object.keys(t)){
    if(k === ANNOT_KEY) continue;
    const v = t[k];
    const here = path.concat(k);
    const note = annots[here.join(" ")];
    if(note) out.push(ind + "/* " + note + " */");
    if(v === true) out.push(ind + k + ";");
    else if(Array.isArray(v))
      out.push(ind + k + (v.length === 1 ? " " + v[0] : " [ " + v.join(" ") + " ]") + ";");
    else if(v && typeof v === "object"){
      if(Object.keys(v).length === 0) out.push(ind + k + ";");
      else { out.push(ind + k + " {"); out.push(treeToText(v, ind + "    ", annots, here)); out.push(ind + "}"); }
    }
    else out.push(ind + k + " " + v + ";");
  }
  return out.join("\n");
}
/* Render a subtree but keep the comments, which are stored at the root. */
function treeToTextAt(root, keys, node, ind){
  return treeToText(node, ind || "", annotAll(root) || {}, (keys || []).slice());
}

/* JunOS-style "show | compare" diff */
function diffTrees(applied, cand){
  const out = [];
  function entry(arr, sign, k, v){
    if(v === true) arr.push(sign + "  " + k + ";");
    else if(Array.isArray(v)) arr.push(sign + "  " + k + (v.length === 1 ? " " + v[0] : " [ " + v.join(" ") + " ]") + ";");
    else if(v && typeof v === "object")
      ("" + treeToText({ [k]: v }, "")).split("\n").forEach(l => arr.push(sign + "  " + l));
    else arr.push(sign + "  " + k + " " + v + ";");
  }
  function walk(pa, ca, path){
    const keys = [...new Set([...Object.keys(pa || {}), ...Object.keys(ca || {})])].filter(k => k !== ANNOT_KEY);
    const minus = [], plus = [], sub = [];
    for(const k of keys){
      const av = pa ? pa[k] : undefined, cv = ca ? ca[k] : undefined;
      if(JSON.stringify(av) === JSON.stringify(cv)) continue;
      const oA = av && typeof av === "object" && !Array.isArray(av);
      const oC = cv && typeof cv === "object" && !Array.isArray(cv);
      if(oA && oC){ sub.push([k, av, cv]); continue; }
      if(av !== undefined) entry(minus, "-", k, av);
      if(cv !== undefined) entry(plus, "+", k, cv);
    }
    if(minus.length || plus.length){
      out.push("[edit" + (path.length ? " " + path.join(" ") : "") + "]");
      out.push(...minus, ...plus);
    }
    for(const [k, av, cv] of sub) walk(av, cv, [...path, k]);
  }
  walk(applied, cand, []);
  annotWalk(applied, cand, out);
  return out.join("\n");
}
/* Comment changes get their own hunk, anchored at the parent level and
   echoing the statement underneath, the way "show | compare" prints them. */
function annotWalk(applied, cand, out){
  const am = annotAll(applied) || {}, cm = annotAll(cand) || {};
  const keys = [...new Set([...Object.keys(am), ...Object.keys(cm)])].sort();
  for(const k of keys){
    if(am[k] === cm[k]) continue;
    const parts = k.split(" ");
    const parent = parts.slice(0, -1), leaf = parts[parts.length - 1];
    const v = cfgGet(cand, parts) !== undefined ? cfgGet(cand, parts) : cfgGet(applied, parts);
    out.push("[edit" + (parent.length ? " " + parent.join(" ") : "") + "]");
    if(am[k]) out.push("-   /* " + am[k] + " */");
    if(cm[k]) out.push("+   /* " + cm[k] + " */");
    if(v === true || v === undefined) out.push("    " + leaf + ";");
    else if(Array.isArray(v)) out.push("    " + leaf + (v.length === 1 ? " " + v[0] : " [ " + v.join(" ") + " ]") + ";");
    else if(v && typeof v === "object") out.push("    " + leaf + " { ... }");
    else out.push("    " + leaf + " " + v + ";");
  }
}

var STRICT = true;
try{ STRICT = localStorage.getItem("junoslab-strict") !== "off"; }catch(e){}
function strictOn(){ return STRICT; }
function setStrict(on){
  STRICT = !!on;
  try{ localStorage.setItem("junoslab-strict", STRICT ? "on" : "off"); }catch(e){}
  if(typeof rebuildAllDerived === "function") rebuildAllDerived();
  if(typeof render === "function") render();
  if(typeof refreshCliView === "function") refreshCliView();
}
function chassisAeCount(dev){
  try{
    const v = dev.config && dev.config.chassis && dev.config.chassis["aggregated-devices"]
      && dev.config.chassis["aggregated-devices"].ethernet
      && dev.config.chassis["aggregated-devices"].ethernet["device-count"];
    return v ? parseInt(v, 10) : 0;
  }catch(e){ return 0; }
}

var APP_VERSION = "3.13.0";

function svgMark(kind){
  if(kind === "check") return '<svg class="mk mk-check" viewBox="0 0 14 14"><path d="M2.5 7.5 L5.8 10.8 L11.5 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if(kind === "cross") return '<svg class="mk mk-cross" viewBox="0 0 14 14"><path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  return "";
}

var UNMODELED_MAX = 200;
function unmodeledLog(){
  try{ return JSON.parse(localStorage.getItem("junoslab-unmodeled") || "[]") || []; }
  catch(e){ return []; }
}
function unmodeledRecord(cmd, mode, devType){
  var t = String(cmd || "").trim();
  if(!t || t === "?" || t.length < 3) return;
  if(/^[?\s]+$/.test(t)) return;
  try{
    var log = unmodeledLog();
    var hit = log.find(function(e){ return e.cmd === t && e.mode === mode; });
    if(hit){ hit.n++; hit.last = Date.now(); }
    else log.push({ cmd: t, mode: mode, dev: devType || "?", n: 1, last: Date.now() });
    log.sort(function(a, b){ return b.n - a.n || b.last - a.last; });
    if(log.length > UNMODELED_MAX) log.length = UNMODELED_MAX;
    localStorage.setItem("junoslab-unmodeled", JSON.stringify(log));
  }catch(e){}
}
function unmodeledClear(){
  try{ localStorage.removeItem("junoslab-unmodeled"); }catch(e){}
}
