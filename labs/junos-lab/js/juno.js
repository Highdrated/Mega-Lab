/* ============================================================
   JUNO — Junos Utility & Network Oracle.
   A local, rule-based copilot in the JARVIS spirit: it answers
   plain-language questions from the lab's own engine (pings,
   DRC, thermal, impact, syslog), sweeps a holographic scan over
   the canvas, and can propose and apply a fix on your go-ahead.
   Entirely offline: no APIs, no keys — the analysis is real.
   ============================================================ */

var junoPendingFix = null;
var junoGreeted = false;
var junoVoiceOn = false;
try{ junoVoiceOn = localStorage.getItem("junoslab-junovoice") === "on"; }catch(e){}

/* ---------- speech (browser-native, optional) ----------
   Browsers ship wildly different voices and default to the worst one.
   Rank what is installed, prefer the premium/natural voices, and let the
   user pick — the picker persists. */
var junoVoiceRate = 1.0, junoVoiceVol = 1.0;
try{ junoVoiceRate = parseFloat(localStorage.getItem("junoslab-junovoice-rate")) || 1.0; }catch(e){}
try{ junoVoiceVol = parseFloat(localStorage.getItem("junoslab-junovoice-vol")) || 1.0; }catch(e){}
const JUNO_PREFERRED = ["ava", "samantha", "aria", "jenny", "sonia", "libby", "karen",
  "serena", "moira", "google uk english female", "google us english", "zira"];
function junoVoiceScore(v){
  const n = String(v.name || "").toLowerCase();
  let s = 0;
  const i = JUNO_PREFERRED.findIndex(p => n.includes(p));
  if(i >= 0) s += (JUNO_PREFERRED.length - i) * 10;
  if(/natural|premium|enhanced/.test(n)) s += 200;
  if(/^en/.test(String(v.lang || ""))) s += 5;
  if(v.localService) s += 1;
  return s;
}
function junoVoices(){
  try{
    if(typeof speechSynthesis === "undefined") return [];
    return (speechSynthesis.getVoices() || []).slice().sort((a, b) => junoVoiceScore(b) - junoVoiceScore(a));
  }catch(e){ return []; }
}
/* one voice: Google UK English Female. Browsers without Google voices
   (Safari, Firefox, iPad) fall back to their best English voice instead of
   going silent — there is nothing to choose, so there is no picker. */
function junoPickVoice(){
  const vs = junoVoices();
  if(!vs.length) return null;
  return vs.find(v => v.name === "Google UK English Female") ||
         vs.find(v => /google uk english female/i.test(String(v.name))) ||
         vs[0];
}
function junoSay(text){
  if(!junoVoiceOn) return;
  try{
    if(typeof speechSynthesis === "undefined" || typeof SpeechSynthesisUtterance === "undefined") return;
    speechSynthesis.cancel();
    const clean = String(text).replace(/\n+/g, ". ").replace(/\s+/g, " ").slice(0, 600);
    // one utterance per sentence: prosody resets, and long answers stop mumbling
    const sentences = clean.match(/[^.!?]+[.!?]*/g) || [clean];
    const voice = junoPickVoice();
    for(const s of sentences){
      const st = s.trim();
      if(!st) continue;
      const u = new SpeechSynthesisUtterance(st);
      if(voice){ u.voice = voice; u.lang = voice.lang; }
      u.rate = junoVoiceRate;
      u.pitch = 1.0;
      u.volume = junoVoiceVol;
      speechSynthesis.speak(u);
    }
  }catch(e){}
}

/* ---------- name / address resolution ---------- */
function junoFindDevice(tok){
  if(!tok) return null;
  const t = tok.toLowerCase().replace(/[?.,!]+$/, "");
  return Object.values(devices).find(d => d.name.toLowerCase() === t) ||
         Object.values(devices).find(d => d.name.toLowerCase().startsWith(t)) || null;
}
function junoFindIp(tok){
  const t = tok.replace(/[?.,!]+$/, "");
  if(validIp(t)) return t;
  const d = junoFindDevice(t);
  if(!d) return null;
  if(d.type === "host" || d.type === "server") return d.cfg.ip;
  if(d.type === "isp") return d.cfg.ip;
  const i = ifacesOf(d)[0];
  return i ? i.ip : null;
}

/* ---------- reports ---------- */
function junoFullScan(){
  const st = collectStatuses();
  const f = runDrc();
  const errs = f.filter(x => x.sev === "error"), warns = f.filter(x => x.sev === "warn");
  const bits = [];
  bits.push(`Scan complete. ${Object.keys(devices).length} devices, ${Object.keys(links).length} links, ${Object.keys(zones).length} building(s)/rack(s).`);
  if(!errs.length && !warns.length && !st.length){
    bits.push("Everything I can measure is nominal. Genuinely nothing to report — enjoy it while it lasts.");
  } else {
    if(errs.length) bits.push(`${errs.length} error(s):\n- ` + errs.slice(0, 3).map(x => x.text).join("\n- "));
    if(warns.length) bits.push(`${warns.length} warning(s):\n- ` + warns.slice(0, 3).map(x => x.text).join("\n- "));
    if(errs.length + warns.length > 6) bits.push("The full list is in Plan > Validate design.");
    bits.push('Say "fix it" and I will propose a repair for the worst of it.');
  }
  return bits.join("\n");
}
function junoDeviceReport(d){
  const bits = [`${d.name} — ${d.model || d.type}.`];
  if(d.type === "switch" || d.type === "router"){
    if(d.powered === false) bits.push("It is powered OFF — that would be my first question answered.");
    else {
      const up = d.ports.filter(p => isLinked(d.id, p.id)).length;
      bits.push(`${up}/${d.ports.length} ports cabled.`);
      const t = (typeof THERMAL !== "undefined" && THERMAL.devices[d.id]) || 21;
      bits.push(`Running at ${t.toFixed(1)} degrees${t >= 45 ? " — dangerously hot, this is close to thermal shutdown" : t >= 35 ? " — warm; check the room's cooling" : ", which is comfortable"}.`);
      const nerr = Object.keys(d.errDisabled || {}).length;
      if(nerr) bits.push(`${nerr} port(s) are error-disabled — show log messages on it names the cause.`);
      if(JSON.stringify(d.config) !== JSON.stringify(d.candidate)) bits.push("There are uncommitted changes sitting in its candidate config.");
      if(d.brandNew) bits.push("It is still factory-fresh — day-zero setup was never finished.");
      const logs = (d.syslog || []).slice(-3);
      if(logs.length) bits.push("Recent log entries:\n- " + logs.join("\n- "));
    }
  } else if(d.type === "host" || d.type === "server"){
    bits.push(d.cfg.ip ? `Address ${d.cfg.ip}/${d.cfg.bits}, gateway ${d.cfg.gw || "NOT SET — it can only talk locally"}.` : "No address configured yet.");
    if(d.type === "server"){
      const sv = d.cfg.services || {};
      bits.push(`Services: dns ${sv.dns ? "running" : "stopped"}, http ${sv.http ? "running" : "stopped"}; ${Object.keys(d.cfg.records || {}).length} DNS record(s).`);
    }
  } else if(d.type === "crac"){
    const z = zoneOf(d.id);
    bits.push(`${((d.cfg.coolW || 0) / 1000).toFixed(1)} kW of cooling, ${d.powered === false ? "switched OFF" : "running"}${z ? ", inside " + z.name : " — outside any building, cooling nothing"}.`);
  } else if(d.type === "ap"){
    const assoc = Object.values(links).filter(l => l.kind === "wifi" && (l.a.dev === d.id || l.b.dev === d.id)).length;
    bits.push(`SSID "${d.cfg.ssid}", ${assoc} client(s) associated, coverage ${d.cfg.radius} units.`);
  }
  return bits.join("\n");
}
function junoDiagnose(srcTok, dstTok){
  const src = junoFindDevice(srcTok);
  if(!src) return `I do not know a device called "${srcTok}". Name them like the canvas does.`;
  const ip = junoFindIp(dstTok);
  if(!ip) return `I cannot resolve "${dstTok}" to an address — give me a device name or an IP.`;
  const res = pingRun(src, ip, {});
  if(res.ok){
    if(typeof doDevicePing === "function") doDevicePing(src, ip);
    return `${src.name} reaches ${ip} cleanly — I ran it on the canvas so you can watch the round trip. Whatever you were told is broken, it is not this path.`;
  }
  const detail = res.lines.map(l => l.text).join("\n").split("\n").filter(x => x && !/PING|statistics|packets/.test(x)).join("\n");
  if(typeof doDevicePing === "function") doDevicePing(src, ip);
  return `${src.name} cannot reach ${ip}. I re-ran it on the canvas — watch where the packet dies. The engine's verdict:\n${detail}\nFix that, ask me again, and we will see what breaks next.`;
}
function junoThermal(){
  if(typeof THERMAL === "undefined" || !Object.keys(THERMAL.zones).length)
    return "No buildings on the canvas, so no rooms to overheat. Draw a building and I will start watching its temperature.";
  const bits = [];
  for(const [zid, zt] of Object.entries(THERMAL.zones)){
    const zn = zones[zid] ? zones[zid].name : zid;
    bits.push(`${zn}: ${zt.temp.toFixed(1)} degrees — ${zt.heatW} W of heat vs ${zt.coolW} W of cooling` +
      (zt.status === "crit" ? ". CRITICAL: gear will thermally shut down. Add cooling now." :
       zt.status === "warn" ? ". Running hot — one more device and this becomes an incident." : ". Comfortable."));
  }
  return bits.join("\n");
}
function junoImpact(){
  const imp = computeImpact();
  const spofs = Object.entries(imp).filter(([, n]) => n > 0);
  render();
  if(!spofs.length) return "I failed every cable one at a time and nothing lost connectivity. Your redundancy is real. Well built.";
  return `I failed every cable one at a time. ${spofs.length} of them break something:\n- ` +
    spofs.map(([lid, n]) => `${linkDesc(lid)} — ${n} path(s) die with it`).join("\n- ") +
    "\nTurn on View > Impact heatmap to see them painted on the canvas.";
}
function junoRecent(){
  const all = [];
  for(const d of Object.values(devices))
    for(const line of (d.syslog || [])) all.push(`${line}  [${d.name}]`);
  if(!all.length) return "The logs are empty — nothing has happened yet. Suspiciously quiet, if you ask me.";
  return "The last things that happened, across every device:\n" + all.slice(-8).join("\n");
}

/* ---------- fixes: propose, confirm, apply ---------- */
function junoProposeFix(){
  if(NET && NET.stormLinks.size){
    const swIds = [...new Set([...NET.stormLinks].flatMap(lid => {
      const l = links[lid];
      return l ? [l.a.dev, l.b.dev] : [];
    }))].filter(id => devices[id] && devices[id].type === "switch");
    junoPendingFix = { kind: "rstp", swIds };
    return `There is a live broadcast storm — a physical loop with no spanning tree. My fix: enable RSTP on ${swIds.map(id => devices[id].name).join(", ")} (set protocols rstp + commit on each). One redundant port will go to sleep and the loop becomes a spare. Say "do it" and I will apply it.`;
  }
  const errd = Object.values(devices).find(d => Object.keys(d.errDisabled || {}).length);
  if(errd){
    const port = Object.keys(errd.errDisabled)[0];
    junoPendingFix = { kind: "errdis", devId: errd.id, port };
    return `${errd.name} has ${port} error-disabled. If the underlying cause is fixed, I can run clear ethernet-switching error-disable ${port} on it. Say "do it" — but if the loop or rogue device is still there, it will just trip again, and that will be your answer.`;
  }
  const privHosts = Object.values(devices).some(x => x.type === "host" && x.cfg.ip && !isPublicIp(x.cfg.ip));
  const hasIsp = Object.values(devices).some(x => x.type === "isp");
  const natRtr = Object.values(devices).find(x => x.type === "router" && Object.keys(D(x).l3ports).length >= 2 && !(D(x).natRules || []).length);
  if(privHosts && hasIsp && natRtr){
    const ports = Object.entries(D(natRtr).l3ports);
    const wan = ports.find(([, p]) => isPublicIp(p.ip)), lan = ports.find(([, p]) => !isPublicIp(p.ip));
    if(wan && lan){
      junoPendingFix = { kind: "nat", devId: natRtr.id, wanIf: wan[0] + ".0", lanIf: lan[0] + ".0" };
      return `Private hosts, an ISP uplink, and no source NAT on ${natRtr.name} — the internet cannot reply to anyone here. My fix: a source NAT rule-set from ${lan[0]}.0 to ${wan[0]}.0 on ${natRtr.name}. Say "do it".`;
    }
  }
  const f = runDrc().filter(x => x.sev !== "info");
  if(f.length) return `Nothing I can safely fix on my own, but here is what I would look at first:\n- ` +
    f.slice(0, 3).map(x => x.text).join("\n- ");
  return "Nothing to fix that I can see. Either the lab is healthy or the problem is somewhere I cannot measure — which usually means Layer 8.";
}
function junoApplyFix(){
  const fix = junoPendingFix;
  junoPendingFix = null;
  if(!fix) return 'Nothing is pending. Ask me to "fix it" first, then confirm.';
  if(fix.kind === "rstp"){
    for(const id of fix.swIds) cfgDo(id, ["set protocols rstp"]);
    const gone = !NET.stormLinks.size;
    return gone
      ? "Done. RSTP is up on all of them, one port went to blocking, and the storm is dead. show spanning-tree interface shows which port took the hit."
      : "Applied — but a storm is still live, which means part of the loop runs through a switch I did not touch. Run a full scan.";
  }
  if(fix.kind === "errdis"){
    const d = devices[fix.devId];
    if(!d) return "That device is gone.";
    const out = deviceExec(d, `clear ethernet-switching error-disable ${fix.port}`);
    return `Done — ${out.map(l => l.text).join(" ")}. Watch the status row: if it trips again, the cause is still out there.`;
  }
  if(fix.kind === "nat"){
    cfgDo(fix.devId, [
      `set security nat source rule-set OFFICE from interface ${fix.lanIf}`,
      `set security nat source rule-set OFFICE to interface ${fix.wanIf}`,
      "set security nat source rule-set OFFICE rule R1 match source-address 10.0.0.0/8",
      "set security nat source rule-set OFFICE rule R1 match source-address 192.168.0.0/16",
      "set security nat source rule-set OFFICE rule R1 then source-nat interface",
    ]);
    return `Done — source NAT is committed on ${devices[fix.devId].name}. Try pinging 8.8.8.8 from a host and watch the translation tag appear on the router.`;
  }
  return "I lost track of that fix. Ask again.";
}

/* ---------- the brain ---------- */
function junoWifi(){
  const aps = Object.values(devices).filter(d => d.type === "ap");
  if(!aps.length) return "No access points on the canvas.";
  const out = [];
  for(const ap of aps){
    if(typeof POE !== "undefined" && POE.denied[ap.id])
      out.push(`${ap.name} (${ap.cfg.ssid}): DARK — ${POE.denied[ap.id]}. Fix: a PoE switch (EX2300-24P, USW-Pro-24-PoE), or fit an FS.com injector via the AP's port popover.`);
    else {
      const le = Object.entries(links).find(([, l]) =>
        (l.a.dev === ap.id && l.a.port === "eth0") || (l.b.dev === ap.id && l.b.port === "eth0"));
      out.push(`${ap.name} (${ap.cfg.ssid}): powered and beaconing` +
        (le ? "" : " — but UNCABLED, so it bridges nothing") +
        ` (draws ${typeof apPoeDraw === "function" ? apPoeDraw(ap) : "?"} W).`);
    }
  }
  for(const sw of Object.values(devices)){
    if(sw.type !== "switch" || typeof POE === "undefined" || !POE.budget[sw.id]) continue;
    out.push(`${sw.name} PoE budget: ${POE.used[sw.id] || 0} W used of ${POE.budget[sw.id]} W.`);
  }
  return out.join("\n");
}
function junoVrrp(){
  if(typeof VRRP === "undefined" || !Object.keys(VRRP.byVip).length)
    return "No VRRP anywhere — every gateway is a single point of failure with a job title. Scenario 27 shows the fix.";
  const out = [];
  for(const [vip, e] of Object.entries(VRRP.byVip)){
    const master = e.master ? (devices[e.master] || {}).name : null;
    out.push(`Virtual gateway ${vip}: ` + (master
      ? `master is ${master}` + (e.all.filter(x => x.up).length > 1 ? `, backup standing by` : ` — and it has NO living backup right now`)
      : "NO living master — every candidate is down. That street has no door."));
  }
  return out.join("\n");
}
function junoBgp(){
  const rows = [];
  for(const d of Object.values(devices))
    for(const p of ((d.d && d.d.bgpPeers) || []))
      rows.push(`${d.name} -> ${p.addr}: ${p.state}` + (p.state === "Established"
        ? " — the provider's default route [BGP/170] is installed."
        : ` — ${p.reason}`));
  if(!rows.length) return "No BGP configured. The edge either has a typed static default, or no internet at all — show route on the router tells you which.";
  return rows.join("\n");
}
function junoPower(){
  const out = [];
  for(const z of Object.values(zones)){
    if((z.kind || "building") !== "building") continue;
    const infra = (typeof buildingInfra === "function") ? buildingInfra(z) : [];
    if(!infra.length) continue;
    const cap = (typeof upsCapOf === "function") ? upsCapOf(z) : 0;
    const load = infra.filter(d => d.powered !== false)
      .reduce((a, d) => a + (typeof drawOf === "function" ? drawOf(d) : 0), 0);
    if(z.gridDown) out.push(`${z.name}: GRID OUTAGE in progress — ` +
      ((z.outagePrev || []).length ? `${z.outagePrev.length} device(s) dark.` : `riding on UPS (${z.outageLoad || 0} W of ${cap} W).`));
    else if(cap === 0) out.push(`${z.name}: ${load} W of infrastructure, NO UPS — an outage takes it all down.`);
    else if(load > cap) out.push(`${z.name}: UPS undersized — ${load} W of load on ${cap} W of battery. An outage drops everything anyway.`);
    else out.push(`${z.name}: ${load} W on a ${cap} W UPS — an outage would be survived.`);
  }
  for(const d of Object.values(devices))
    if((d.type === "server" || d.type === "switch" || d.type === "router") && d.powered === false)
      out.push(`${d.name} is powered OFF — unreachable, which is silence, not refusal.`);
  return out.length ? out.join("\n") : "No buildings with infrastructure — power risk is not measurable yet.";
}
function junoBusiest(){
  if(typeof trafficStats !== "function") return "No traffic ledger available.";
  const t = trafficStats(60000);
  const top = Object.entries(t.per).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if(!top.length) return "Zero packets in the last minute — this lab only counts REAL journeys, so quiet means nothing has moved. Run a ping and ask again.";
  return `${t.total} packet journeys in the last minute. Busiest cables:\n` + top.map(([lid, n]) => {
    const l = links[lid];
    const a = l && devices[l.a.dev], b2 = l && devices[l.b.dev];
    return `- ${a ? a.name : "?"} <-> ${b2 ? b2.name : "?"}: ${n} pkt/min`;
  }).join("\n");
}
function junoAnswer(raw){
  const q = String(raw || "").trim();
  const ql = q.toLowerCase();
  if(!ql) return { reply: "Say something — or press Full scan and I will look at everything." };
  if(/^(help|\?|what can you do)/.test(ql))
    return { reply: [
      "I am JUNO. I read the same engine the lab runs on, so my answers are measurements, not guesses. Try:",
      '- "scan the network" — full health check, with the canvas sweep',
      "- \"why can't hq-pc reach 10.0.20.5\" — I run the ping and explain where it dies",
      '- "analyze core-sw" — one device, in depth',
      "- \"how hot is it\" — every room's temperature and heat budget",
      '- "weak points" — I fail every cable and report what breaks',
      '- "what happened" — recent events across all logs',
      '- "why is the wifi dark" — PoE budgets and dead access points',
      '- "who is the vrrp master" / "is bgp up" / "would we survive an outage"',
      '- "busiest cables" — the traffic ledger, ranked',
      '- "fix it" — I propose a repair; "do it" applies it',
    ].join("\n") };
  if(/^(yes|do it|go ahead|proceed|please do|apply)/.test(ql))
    return { reply: junoPendingFix ? junoApplyFix()
      : 'Nothing is pending. Ask me to "fix it" first, then confirm.' };
  let m = ql.match(/why\s+(?:can'?t|cant|won'?t)\s+(\S+)\s+(?:reach|ping|talk to|see)\s+(\S+)/) ||
          ql.match(/^diagnose\s+(\S+)\s+(\S+)/) || ql.match(/^ping\s+(\S+)\s+(?:to\s+)?(\S+)/);
  if(m) return { reply: junoDiagnose(m[1], m[2]) };
  m = ql.match(/^(?:analy[sz]e|inspect|look at|check)\s+(\S+)/);
  if(m && !/network|lab|everything|all/.test(m[1])){
    const d = junoFindDevice(m[1]);
    if(d) return { reply: junoDeviceReport(d), scanDev: d.id };
    return { reply: `No device called "${m[1]}" on the canvas.` };
  }
  if(/(wifi|wi-fi|access point|\bap\b|dark|beacon|poe)/.test(ql)) return { reply: junoWifi() };
  if(/(vrrp|virtual gateway|master|failover)/.test(ql)) return { reply: junoVrrp() };
  if(/(bgp|provider|internet down|peering|autonomous)/.test(ql)) return { reply: junoBgp() };
  if(/(ups|battery|outage|grid|power)/.test(ql)) return { reply: junoPower() };
  if(/(traffic|busiest|bandwidth|pkt|packets per)/.test(ql)) return { reply: junoBusiest() };
  if(/(scan|analy[sz]e|status|health|check)/.test(ql)) return { reply: junoFullScan(), scan: true };
  if(/(temp|heat|hot|cool|hvac|degrees)/.test(ql)) return { reply: junoThermal() };
  if(/(weak|impact|single point|spof|redundan|what breaks)/.test(ql)) return { reply: junoImpact() };
  if(/(what happened|logs|history|recent|last night)/.test(ql)) return { reply: junoRecent() };
  if(/(fix|repair|solve|sort it)/.test(ql)) return { reply: junoProposeFix() };
  return { reply: 'I did not follow that. I speak measurements, not small talk — try "help" for what I understand.' };
}

/* ---------- holographic scan sweep ---------- */
function junoScanAnim(devId){
  if(typeof requestAnimationFrame !== "function" || typeof svg === "undefined") return;
  try{
    const r = svg.getBoundingClientRect();
    const W = r.width || 1200, H = r.height || 700;
    if(devId && devices[devId]){
      const [cx, cy] = devCenter(devices[devId]);
      const ring = el("circle", { cx, cy, r: 10, class: "juno-pulse" }, worldG || svg);
      const t0 = performance.now();
      const step = (t) => {
        const f = Math.min(1, (t - t0) / 900);
        ring.setAttribute("r", 10 + f * 90);
        ring.style.opacity = String(0.9 * (1 - f));
        if(f < 1) requestAnimationFrame(step); else ring.remove();
      };
      requestAnimationFrame(step);
      return;
    }
    const line = el("line", { x1: 0, y1: 0, x2: 0, y2: H, class: "juno-scanline" }, svg);
    const t0 = performance.now();
    const step = (t) => {
      const f = Math.min(1, (t - t0) / 1300);
      line.setAttribute("x1", f * W); line.setAttribute("x2", f * W);
      if(f < 1) requestAnimationFrame(step); else line.remove();
    };
    requestAnimationFrame(step);
    Object.values(devices).forEach((d, i) => {
      setTimeout(() => {
        const [cx, cy] = devCenter(d);
        const ring = el("circle", { cx, cy, r: 8, class: "juno-pulse" }, worldG || svg);
        const s0 = performance.now();
        const grow = (t) => {
          const f = Math.min(1, (t - s0) / 600);
          ring.setAttribute("r", 8 + f * 40);
          ring.style.opacity = String(0.8 * (1 - f));
          if(f < 1) requestAnimationFrame(grow); else ring.remove();
        };
        requestAnimationFrame(grow);
      }, 90 * i);
    });
  }catch(e){}
}

/* ---------- chat UI ---------- */
function junoLogMsg(who, text){
  const log = document.getElementById("juno-log");
  if(!log) return;
  const div = document.createElement("div");
  div.className = "juno-msg " + (who === "you" ? "juno-you" : "juno-bot");
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}
function junoAsk(text){
  if(!String(text || "").trim()) return;
  junoLogMsg("you", text);
  const ans = junoAnswer(text);
  if(ans.scan) junoScanAnim();
  if(ans.scanDev) junoScanAnim(ans.scanDev);
  junoLogMsg("juno", ans.reply);
  junoSay(ans.reply);
}
function junoInitTab(){
  if(junoGreeted) return;
  junoGreeted = true;
  junoLogMsg("juno",
    "JUNO online. I read the same engine this lab runs on — pings, temperatures, logs, design checks — so my answers are measurements, not guesses. " +
    'Ask me why something is broken, or press Full scan. Type "help" for everything I understand.');
  const chips = document.getElementById("juno-chips");
  if(chips && !chips.children.length){
    for(const c of ["scan the network", "how hot is it", "weak points", "what happened", "fix it"]){
      const b = document.createElement("button");
      b.className = "juno-chip";
      b.textContent = c;
      b.onclick = () => junoAsk(c);
      chips.appendChild(b);
    }
  }
}
(function(){
  const inp = document.getElementById("juno-input");
  if(inp) inp.addEventListener("keydown", (e) => {
    if(e.key !== "Enter") return;
    const v = inp.value;
    inp.value = "";
    junoAsk(v);
  });
  const scanBtn = document.getElementById("juno-scan-btn");
  if(scanBtn) scanBtn.onclick = () => junoAsk("scan the network");
  const vb = document.getElementById("juno-voice");
  const setV = (on) => {
    junoVoiceOn = on;
    try{ localStorage.setItem("junoslab-junovoice", on ? "on" : "off"); }catch(e){}
    if(vb){ vb.textContent = "voice " + (on ? "on" : "off"); vb.classList.toggle("active", on); }
  };
  if(vb) vb.onclick = () => setV(!junoVoiceOn);
  setV(junoVoiceOn);
  const rate = document.getElementById("juno-rate");
  if(rate){
    rate.value = junoVoiceRate;
    rate.oninput = () => {
      junoVoiceRate = parseFloat(rate.value) || 1.0;
      try{ localStorage.setItem("junoslab-junovoice-rate", String(junoVoiceRate)); }catch(e){}
    };
    rate.onchange = () => { if(junoVoiceOn) junoSay("Reading at this pace."); };
  }
  const vol = document.getElementById("juno-vol");
  if(vol){
    vol.value = junoVoiceVol;
    vol.oninput = () => {
      junoVoiceVol = parseFloat(vol.value) || 1.0;
      try{ localStorage.setItem("junoslab-junovoice-vol", String(junoVoiceVol)); }catch(e){}
    };
    vol.onchange = () => { if(junoVoiceOn) junoSay("This loud."); };
  }
})();
