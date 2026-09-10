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

function makeSwitch(x, y, portCount, model){
  const id = uid("sw");
  const n = portCount || 12;
  devices[id] = {
    id, type:"switch", x, y, name:id, model: model || null,
    ports: Array.from({length:n}, (_, i) => ({ id:`ge-0/0/${i}` })),
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

/* JunOS-style curly-brace rendering */
function treeToText(t, ind){
  ind = ind || "";
  const out = [];
  for(const k of Object.keys(t)){
    const v = t[k];
    if(v === true) out.push(ind + k + ";");
    else if(Array.isArray(v))
      out.push(ind + k + (v.length === 1 ? " " + v[0] : " [ " + v.join(" ") + " ]") + ";");
    else if(v && typeof v === "object"){
      if(Object.keys(v).length === 0) out.push(ind + k + ";");
      else { out.push(ind + k + " {"); out.push(treeToText(v, ind + "    ")); out.push(ind + "}"); }
    }
    else out.push(ind + k + " " + v + ";");
  }
  return out.join("\n");
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
    const keys = [...new Set([...Object.keys(pa || {}), ...Object.keys(ca || {})])];
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
  return out.join("\n");
}
