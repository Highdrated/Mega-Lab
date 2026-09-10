/* ============================================================
   CLI EXECUTION
   deviceExec(dev, raw) -> [{cls:"out"|"err"|"sys", text}]
   ============================================================ */
const COMMIT_TIMERS = {};   // devId -> timeout handle (not serialized)

function lines(cls, text){ return text === "" ? [] : [{ cls, text }]; }
function pad(s, n){ s = String(s); return s.length >= n ? s + " " : s.padEnd(n); }

function deviceExec(dev, raw){
  const cmd = raw.trim();
  if(!cmd) return [];
  try{
    if(dev.type === "host") return hostExec(dev, cmd);
    if(dev.type === "server") return serverExec(dev, cmd);
    if(dev.type === "isp") return ispExec(dev, cmd);
    if(dev.type === "crac"){
      if(cmd === "?" || cmd === "help" || cmd === "status"){
        const z = (typeof zoneOf === "function") ? zoneOf(dev.id) : null;
        const zt = (typeof THERMAL !== "undefined" && z) ? THERMAL.zones[z.id] : null;
        return lines("out",
          `cooling unit: ${dev.model || "generic"}\n` +
          `capacity: ${((dev.cfg.coolW || 0) / 1000).toFixed(1)} kW\n` +
          `power: ${dev.powered === false ? "OFF" : "on"}\n` +
          (z ? `room: ${z.name} — ${zt ? zt.temp.toFixed(1) : "?"} degrees C (heat ${zt ? zt.heatW : "?"} W / cooling ${zt ? zt.coolW : "?"} W)`
             : "room: not inside a building — this unit is cooling the void"));
      }
      return lines("err", "cooling units have no CLI — try status, or the power button on the card");
    }
    if(dev.type === "ups"){
      if(cmd === "?" || cmd === "help" || cmd === "status"){
        const z = (typeof zoneOf === "function") ? zoneOf(dev.id) : null;
        const load = (z && typeof buildingInfra === "function")
          ? buildingInfra(z).filter(d2 => d2.powered !== false).reduce((a, d2) => a + drawOf(d2), 0) : 0;
        const recent = (dev.syslog || []).slice(-3).join("\n");
        return lines("out",
          `ups: ${dev.model || "generic"}\n` +
          `capacity: ${dev.cfg.capW || 0} W\n` +
          `state: ${z && z.gridDown ? "ON BATTERY — utility power is out" : "standby (utility power ok)"}\n` +
          (z ? `building: ${z.name} — infrastructure load ${load} W of ${dev.cfg.capW || 0} W` +
               (load > (dev.cfg.capW || 0) ? "  OVERSIZED LOAD: an outage right now drops everything" : "")
             : "building: none — a UPS in the car park protects nothing") +
          (recent ? "\n\nrecent events:\n" + recent : ""));
      }
      return lines("err", 'ups units have no CLI — try status, or the "grid" button on the building to drill an outage');
    }
    if(dev.powered === false)
      return lines("err", "(no power — the console is dark. Press the power button on the faceplate.)");
    const stage = dev.cli.stage;
    if(stage === "boot") return lines("out", "(booting — give it a second...)");
    if(stage === "login"){
      if(cmd === "root"){
        dev.cli.stage = "shell";
        return lines("out", "--- JUNOS 23.4R1.10 built 2026-08-27 ---\n(factory defaults — root has no password yet)\nroot@% type cli to enter the CLI");
      }
      return lines("err", "Login incorrect\n(factory boxes have exactly one user: root, no password)\nlogin:");
    }
    if(stage === "shell"){
      if(cmd === "cli"){ dev.cli.stage = null; dev.cli.mode = "op"; dev.user = "root"; return lines("out", "{master:0}"); }
      if(cmd === "exit"){ dev.cli.stage = "login"; return lines("out", "login:"); }
      return lines("err", `sh: ${cmd}: not found  — this is the FreeBSD shell; type cli`);
    }
    if(stage === "newpass"){
      dev.cli.pendingPw = raw;
      dev.cli.stage = "retype";
      return lines("out", "Retype new password:");
    }
    if(stage === "retype"){
      const okPw = dev.cli.pendingPw === raw;
      dev.cli.pendingPw = null;
      if(okPw){
        dev.cli.stage = null;
        cfgSet(dev.candidate, ["system", "root-authentication", "encrypted-password"], pwHash(raw));
        return [];
      }
      dev.cli.stage = "newpass";
      return lines("err", "error: passwords do not match\nNew password:");
    }
    return dev.cli.mode === "cfg" ? cfgExec(dev, cmd) : opExec(dev, cmd);
  }catch(e){
    return lines("err", "internal lab error: " + e.message);
  }
}

/* ---------- operational mode (switch / router) ---------- */
function opExec(dev, cmd){
  const tokens = cmd.split(/\s+/);
  if(cmd === "?" || cmd === "help") return helpLines(dev);
  const trie = OP_TRIE[dev.type];
  const res = trieWalk(trie, tokens, dev);
  if(res.err) return opErr(res, dev, cmd);
  if(!res.node.leaf){
    const items = trieCompletions(res.node, dev, "");
    return [{ cls:"err", text: "syntax error — command is incomplete." },
            { cls:"out", text: completionText(items) }];
  }
  const out = res.node.leaf.fn(dev, res.keys);
  if(out === undefined || out === null || out === "") return [];
  if(typeof out === "string") return lines("out", out);
  return lines(out.err ? "err" : "out", out.text);
}
function tokenCol(raw, at){
  const toks = raw.split(/\s+/);
  if(at == null || at < 0 || at >= toks.length) return -1;
  let idx = 0;
  for(let k = 0; k < at; k++) idx = raw.indexOf(toks[k], idx) + toks[k].length;
  return Math.max(0, raw.indexOf(toks[at], idx));
}
function opErr(res, dev, raw){
  const l = [];
  // the real-JunOS caret: a ^ directly under the word that broke
  if(raw != null && res.at != null){
    const col = tokenCol(raw, res.at);
    if(col >= 0){
      const promptLen = (dev && typeof promptStr === "function") ? promptStr(dev).length : 0;
      l.push({ cls: "err", text: " ".repeat(promptLen + col) + "^" });
    }
  }
  l.push({ cls: "err", text: res.err });
  if(res.expecting && res.expecting.length)
    l.push({ cls: "out", text: "expecting one of: " + res.expecting.join(", ") });
  return l;
}
function helpLines(dev){
  const t = dev.type === "switch"
    ? `Type any command followed by ? to see what can come next — that's the real JunOS way.
Quick reference:
  configure                      enter configuration mode
  show configuration             the committed (active) config
  show interfaces terse          interface / link / address summary
  show vlans                     VLANs and their member ports
  show ethernet-switching table  learned MAC addresses
  show route                     routing table (irb + statics)
  show arp                       ARP cache
  show spanning-tree interface   RSTP port roles and states
  show lacp interfaces           LACP bundle status
  ping <ip> / traceroute <ip>    test reachability from this device`
    : `Type any command followed by ? to see what can come next — that's the real JunOS way.
Quick reference:
  configure                      enter configuration mode
  show configuration             the committed (active) config
  show interfaces terse          interface / link / address summary
  show route                     routing table (connected + static)
  show arp                       ARP cache
  ping <ip> / traceroute <ip>    test reachability from this device`;
  return lines("out", t);
}

/* ---------- configuration mode ---------- */
const CFG_COMMANDS = ["set", "delete", "show", "edit", "up", "top", "exit", "run", "commit", "rollback", "load"];

function cfgBanner(dev){
  return "[edit" + (dev.cli.editKeys.length ? " " + dev.cli.editKeys.join(" ") : "") + "]";
}
function cfgExec(dev, cmd){
  if(cmd === "?" || cmd === "help"){
    return lines("out", "Configuration mode commands:\n" +
      "  set <statement>       add / change a statement (try: set ?)\n" +
      "  delete <statement>    remove a statement (or a whole subtree)\n" +
      "  show                  candidate configuration at this level\n" +
      "  show | compare        diff candidate against the committed config\n" +
      "  edit <path>           descend into a hierarchy level\n" +
      "  up / top              go up one level / back to the top\n" +
      "  commit                make the candidate active\n" +
      "  commit confirmed <m>  commit with automatic rollback unless confirmed\n" +
      "  commit check          validate without committing\n" +
      "  rollback [n]          reset candidate (0 = committed, 1 = previous commit...)\n" +
      "  run <command>         run an operational command from here\n" +
      "  exit                  leave this level / leave configuration mode");
  }
  if(/^show\s*\|\s*compare$/.test(cmd)){
    const d = diffTrees(dev.config, dev.candidate);
    return lines("out", d || "(no uncommitted changes)");
  }
  const tokens = cmd.split(/\s+/);
  const word = tokens[0];
  const matches = CFG_COMMANDS.filter(c => c.startsWith(word));
  const cmdName = CFG_COMMANDS.includes(word) ? word : (matches.length === 1 ? matches[0] : null);
  if(!cmdName){
    if(matches.length > 1) return lines("err", `ambiguous command: "${word}" could be: ${matches.join(", ")}`);
    return lines("err", `unknown command: "${word}" — type ? for configuration mode commands`);
  }
  const rest = tokens.slice(1);
  const legacy = legacySyntaxHint(cmd);
  if(legacy && (cmdName === "set" || cmdName === "delete")) return legacy;
  switch(cmdName){
    case "set": return cfgSetCmd(dev, rest, cmd);
    case "delete": return cfgDeleteCmd(dev, rest);
    case "show": return cfgShowCmd(dev, rest);
    case "edit": return cfgEditCmd(dev, rest);
    case "up":
      dev.cli.editKeys.pop();
      return lines("out", cfgBanner(dev));
    case "top":
      dev.cli.editKeys = [];
      return lines("out", cfgBanner(dev));
    case "exit": {
      if(dev.cli.editKeys.length){ dev.cli.editKeys = []; return lines("out", cfgBanner(dev)); }
      dev.cli.mode = "op";
      const dirty = JSON.stringify(dev.config) !== JSON.stringify(dev.candidate);
      return lines("out", "Exiting configuration mode" +
        (dirty ? "\nwarning: uncommitted changes remain in the candidate configuration (rollback 0 discards them)" : ""));
    }
    case "run": {
      if(!rest.length) return lines("err", "usage: run <operational command>, e.g. run show interfaces terse");
      return opExec(dev, rest.join(" "));
    }
    case "commit": return commitCmd(dev, rest);
    case "rollback": return rollbackCmd(dev, rest);
    case "load": {
      if(!rest.length || !"set".startsWith(rest[0]) || !(rest[1] && "terminal".startsWith(rest[1])))
        return lines("err", "usage: load set terminal — then paste set/delete statements");
      if(typeof modalInput !== "function" || typeof window === "undefined")
        return lines("err", "load set terminal needs the UI (use loadSetLines() headless)");
      setTimeout(async () => {
        const text = await modalInput("load set terminal",
          "Paste set/delete statements, one per line. They load into the candidate — commit afterwards to apply.", "", "textarea");
        if(text === null) return;
        const res = loadSetLines(dev, text);
        dev.cli.log.push({ cls: res.errors ? "err" : "out", text: res.summary });
        if(typeof refreshCliView === "function") refreshCliView();
        touchState();
      }, 0);
      return lines("out", "(paste buffer opened — statements load into the candidate; commit to apply)");
    }
  }
}
function loadSetLines(dev, text){
  let okc = 0, errors = 0; const details = [];
  for(const raw of String(text).split(/\n+/)){
    const line = raw.trim();
    if(!line || line.startsWith("#")) continue;
    const toks = line.split(/\s+/);
    let out;
    if(toks[0] === "set") out = cfgSetCmd(dev, toks.slice(1));
    else if(toks[0] === "delete") out = cfgDeleteCmd(dev, toks.slice(1));
    else { errors++; details.push("skipped (not set/delete): " + line); continue; }
    if(out.some(l => l.cls === "err")){ errors++; details.push(line + "   <- " + out[0].text.split("\n")[0]); }
    else okc++;
  }
  return { ok: okc, errors,
    summary: `load complete (${okc} statement${okc === 1 ? "" : "s"} loaded${errors ? `, ${errors} error${errors === 1 ? "" : "s"}` : ""})` +
      (details.length ? "\n" + details.slice(0, 5).join("\n") : "") };
}

function cfgSetCmd(dev, rest, raw){
  if(!rest.length) return lines("err", 'usage: set <statement> — try "set ?" to explore');
  // bracket list syntax: set ... vlan members [ a b c ]
  let values = null, base = rest;
  const bi = rest.indexOf("[");
  if(bi > -1){
    const ei = rest.indexOf("]");
    if(ei === -1 || ei < bi + 1) return lines("err", "syntax error: unterminated [ ... ] list");
    values = rest.slice(bi + 1, ei);
    base = rest.slice(0, bi).concat(values[0] !== undefined ? [values[0]] : []);
    if(!values.length) return lines("err", "syntax error: empty [ ... ] list");
  }
  const full = dev.cli.editKeys.concat(base);
  const res = trieWalk(CFG_TRIE[dev.type], full, dev);
  if(res.err){
    // map the trie token index back into the typed line for the caret
    const clean = raw != null && bi === -1 && res.at != null && res.at >= dev.cli.editKeys.length;
    return opErr(clean ? { ...res, at: res.at - dev.cli.editKeys.length + 1 } : { ...res, at: null }, dev, raw);
  }
  const leaf = res.node.leaf;
  if(!leaf){
    const items = trieCompletions(res.node, dev, "");
    return [{ cls:"err", text: "syntax error — statement is incomplete." },
            { cls:"out", text: completionText(items) }];
  }
  const keys = res.keys;
  // root password: bare statement prompts (like the real box); inline stores a hash
  if(keys.join(" ") === "system root-authentication plain-text-password"){
    dev.cli.stage = "newpass";
    return lines("out", "New password:");
  }
  if(leaf.kind === "value" && keys.length >= 2 && keys[keys.length - 2] === "plain-text-password"){
    // any plain-text-password statement stores only a hash, like the real box
    const pw = keys.pop();
    keys[keys.length - 1] = "encrypted-password";
    cfgSet(dev.candidate, keys, pwHash(pw));
    return [];
  }
  if(leaf.kind === "presence"){ cfgEnsure(dev.candidate, keys); }
  else if(leaf.kind === "enumvalue"){ const v = keys.pop(); cfgSet(dev.candidate, keys, v); }
  else if(leaf.kind === "value"){ const v = keys.pop(); cfgSet(dev.candidate, keys, v); }
  else if(leaf.kind === "list"){
    const v = keys.pop();
    for(const item of (values || [v])) cfgAppend(dev.candidate, keys, item);
  }
  return [];   // silence = success, like the real thing
}

function resolveTreePath(tree, tokens){
  let t = tree; const keys = [];
  for(let i = 0; i < tokens.length; i++){
    const tok = tokens[i];
    if(Array.isArray(t)){
      const item = t.includes(tok) ? tok : t.find(x => String(x).startsWith(tok));
      if(item === undefined || i !== tokens.length - 1) return { err: tok };
      return { keys, arrayItem: item };
    }
    if(!t || typeof t !== "object"){
      // scalar leaf: JunOS lets you name the value in the delete
      // (delete ... filter input GUEST-IN removes the "input" statement)
      if(i === tokens.length - 1 && String(t) === tok) return { keys };
      return { err: tok };
    }
    let k = (tok in t) ? tok : null;
    if(!k){
      const pref = Object.keys(t).filter(x => x.startsWith(tok));
      if(pref.length === 1) k = pref[0];
      else return { err: tok, ambiguous: pref.length > 1 };
    }
    keys.push(k); t = t[k];
  }
  return { keys, node: t };
}

function cfgDeleteCmd(dev, rest){
  if(!rest.length && !dev.cli.editKeys.length)
    return lines("err", "delete what? e.g. delete interfaces ge-0/0/0 disable");
  const full = dev.cli.editKeys.concat(rest);
  const res = resolveTreePath(dev.candidate, full);
  if(res.err !== undefined && res.err !== null && typeof res.err === "string")
    return lines("err", res.ambiguous
      ? `ambiguous statement: "${res.err}" matches more than one thing here`
      : `warning: statement not found: ${full.join(" ")}`);
  if(res.arrayItem !== undefined){
    const arr = cfgGet(dev.candidate, res.keys);
    arr.splice(arr.indexOf(res.arrayItem), 1);
    if(!arr.length) cfgDelete(dev.candidate, res.keys);
    return [];
  }
  cfgDelete(dev.candidate, res.keys);
  return [];
}

function cfgShowCmd(dev, rest){
  const full = dev.cli.editKeys.concat(rest);
  if(!full.length){
    const txt = Object.keys(dev.candidate).length ? treeToText(dev.candidate) : "## (candidate configuration is empty)";
    return lines("out", txt);
  }
  const res = resolveTreePath(dev.candidate, full);
  if(typeof res.err === "string") return lines("out", "## (nothing configured at: " + full.join(" ") + ")");
  const node = res.arrayItem !== undefined ? res.arrayItem : res.node;
  if(node && typeof node === "object" && !Array.isArray(node))
    return lines("out", Object.keys(node).length ? treeToText(node) : "## (empty)");
  return lines("out", String(Array.isArray(node) ? node.join(" ") : node));
}

function cfgEditCmd(dev, rest){
  if(!rest.length) return lines("err", "usage: edit <path>, e.g. edit interfaces ge-0/0/0");
  const full = dev.cli.editKeys.concat(rest);
  const res = trieWalk(CFG_TRIE[dev.type], full, dev);
  if(res.err) return opErr(res);
  const hasChildren = Object.keys(res.node.lits).length || res.node.phs.length;
  if(!hasChildren) return lines("err", "cannot edit at this level — that path is a complete statement, not a hierarchy");
  dev.cli.editKeys = res.keys;
  return lines("out", cfgBanner(dev));
}

/* ---------- commit / rollback ---------- */
function validateCandidate(dev){
  const errs = [];
  const c = dev.candidate;
  const vlans = cfgGet(c, ["vlans"]) || {};
  const filters = cfgGet(c, ["firewall", "family", "inet", "filter"]) || {};
  const profiles = cfgGet(c, ["forwarding-options", "storm-control-profiles"]) || {};
  const ifs = cfgGet(c, ["interfaces"]) || {};
  for(const [gn, gCfg] of Object.entries(cfgGet(c, ["protocols", "bgp", "group"]) || {})){
    const nb = (gCfg && gCfg.neighbor) || {};
    const n = Array.isArray(nb) ? nb.length : Object.keys(nb).length;
    if(!n) continue;
    if(!(gCfg && gCfg["peer-as"]))
      errs.push(`BGP group "${gn}": peer AS number must be configured (set protocols bgp group ${gn} peer-as <n>)`);
    if(!cfgGet(c, ["routing-options", "autonomous-system"]))
      errs.push(`BGP group "${gn}" has neighbors but no local AS — set routing-options autonomous-system <n>`);
  }
  for(const [ifName, ifCfg] of Object.entries(ifs)){
    const units = (ifCfg && ifCfg.unit) || {};
    for(const [u, uCfg] of Object.entries(units)){
      const es = cfgGet(uCfg, ["family", "ethernet-switching"]);
      if(es && typeof es === "object"){
        for(const m of (cfgGet(es, ["vlan", "members"]) || []))
          if(m !== "all" && !vlans[m])
            errs.push(`vlan "${m}" (interfaces ${ifName} unit ${u}) is not defined — set vlans ${m} vlan-id <id>`);
        const sc = es["storm-control"];
        if(typeof sc === "string" && !profiles[sc])
          errs.push(`storm-control profile "${sc}" is not defined — set forwarding-options storm-control-profiles ${sc} all`);
      }
      const inet = cfgGet(uCfg, ["family", "inet"]);
      if(inet && dev.type === "switch" && ifName !== "irb" && ifName !== "me0")
        errs.push(`family inet on ${ifName} — in this lab, switch L3 lives on irb units only (set interfaces irb unit <n> family inet address ...)`);
      const fin = cfgGet(uCfg, ["family", "inet", "filter", "input"]);
      const fout = cfgGet(uCfg, ["family", "inet", "filter", "output"]);
      for(const f of [fin, fout]) if(typeof f === "string" && !filters[f])
        errs.push(`firewall filter "${f}" (interfaces ${ifName}) is not defined`);
    }
    const ae = cfgGet(ifCfg, ["ether-options", "802.3ad"]);
    if(typeof ae === "string" && !ifs[ae])
      errs.push(`${ifName} points at bundle ${ae}, but ${ae} has no configuration — set interfaces ${ae} aggregated-ether-options lacp active (plus its family)`);
  }
  for(const [vname, vCfg] of Object.entries(vlans)){
    const l3 = vCfg && vCfg["l3-interface"];
    if(typeof l3 === "string"){
      const u = l3.split(".")[1];
      if(!cfgGet(c, ["interfaces", "irb", "unit", u, "family", "inet", "address"]))
        errs.push(`vlans ${vname} l3-interface ${l3}: interfaces irb unit ${u} has no inet address`);
    }
    if(vCfg && vCfg["vlan-id"] === undefined && vname !== "default")
      errs.push(`vlans ${vname} has no vlan-id`);
  }
  // interface-range sanity
  for(const [rn, rc] of Object.entries(cfgGet(c, ["interfaces", "interface-range"]) || {})){
    for(const m of (cfgGet(rc, ["member"]) || []))
      if(!dev.ports.some(p2 => p2.id === m))
        errs.push(`interface-range ${rn}: member ${m} does not exist on this device`);
    for(const m of (cfgGet(rc, ["unit", "0", "family", "ethernet-switching", "vlan", "members"]) || []))
      if(m !== "all" && !vlans[m])
        errs.push(`vlan "${m}" (interface-range ${rn}) is not defined — set vlans ${m} vlan-id <id>`);
  }
  // NAT sanity
  for(const [rsName, r] of Object.entries(cfgGet(c, ["security", "nat", "source", "rule-set"]) || {})){
    const hasRule = Object.values((r && r.rule) || {}).some(rr => cfgGet(rr, ["then", "source-nat"]));
    if(hasRule && !cfgGet(r, ["to", "interface"]))
      errs.push(`nat rule-set ${rsName} has a rule but no "to interface" — where should translation happen?`);
  }
  // DHCP pool sanity
  for(const [pname, p] of Object.entries(cfgGet(c, ["access", "address-assignment", "pool"]) || {})){
    const inet = cfgGet(p, ["family", "inet"]) || {};
    const net = parsePrefix(inet.network || "");
    for(const rg of Object.values(inet.range || {})){
      const lo = rg && rg.low, hi = rg && rg.high;
      if(net && validIp(lo || "") && !sameSubnet(lo, net.ip, net.bits))
        errs.push(`pool ${pname}: range low ${lo} is outside network ${inet.network}`);
      if(net && validIp(hi || "") && !sameSubnet(hi, net.ip, net.bits))
        errs.push(`pool ${pname}: range high ${hi} is outside network ${inet.network}`);
      if(validIp(lo || "") && validIp(hi || "") && ipToInt(lo) > ipToInt(hi))
        errs.push(`pool ${pname}: range low ${lo} is above high ${hi}`);
    }
  }
  return errs;
}

function commitCmd(dev, rest){
  const sub = rest[0] || "";
  if(sub && !"check".startsWith(sub) && !"confirmed".startsWith(sub) && !"and-quit".startsWith(sub))
    return lines("err", `unknown commit option "${sub}" — try commit, commit check, commit confirmed <minutes>, commit and-quit`);
  const errs = validateCandidate(dev);
  if(dev.brandNew && !cfgGet(dev.candidate, ["system", "root-authentication"]))
    errs.push("Missing mandatory statement: [edit system] root-authentication — a factory-fresh box refuses to commit until root has a password (set system root-authentication plain-text-password)");
  if(errs.length)
    return [{ cls:"err", text: errs.map(e => "error: " + e).join("\n") },
            { cls:"err", text: "commit failed" }];
  if(sub && "check".startsWith(sub)) return lines("out", "configuration check succeeds");

  let confirmedMin = 0;
  if(sub && "confirmed".startsWith(sub)){
    confirmedMin = rest[1] ? parseInt(rest[1], 10) : 10;
    if(isNaN(confirmedMin) || confirmedMin < 1) return lines("err", "usage: commit confirmed <minutes>");
  }
  // an ordinary commit while a confirmed-commit is pending = the confirmation
  let confirmedNow = false;
  if(dev.commitPending && !confirmedMin){
    clearTimeout(COMMIT_TIMERS[dev.id]);
    delete COMMIT_TIMERS[dev.id];
    dev.commitPending = null;
    confirmedNow = true;
  }
  const prev = deepClone(dev.config);
  dev.cfgHistory.unshift(prev);
  if(dev.cfgHistory.length > 8) dev.cfgHistory.length = 8;
  dev.config = deepClone(dev.candidate);
  dev.name = hostnameOf(dev);
  if(confirmedMin){
    dev.stats.usedCommitConfirmed = true;
    dev.commitPending = { minutes: confirmedMin, expiresAt: Date.now() + confirmedMin * 60000 };
    COMMIT_TIMERS[dev.id] = setTimeout(() => autoRollback(dev), confirmedMin * 60000);
  }
  if(dev.brandNew){
    dev.brandNew = false;
    devLog(dev, "day-zero commit — factory-default state cleared");
  }
  devLog(dev, `UI_COMMIT_COMPLETED: commit by ${dev.user || "kaatje"}` + (confirmedMin ? ` (confirmed, ${confirmedMin}m timer)` : ""));
  rebuildAllDerived();
  touchState();
  if(typeof SFX !== "undefined") SFX.commit();
  const out = [];
  if(confirmedMin)
    out.push({ cls:"out", text:
      `commit confirmed will be automatically rolled back in ${confirmedMin} minute${confirmedMin>1?"s":""} unless confirmed\ncommit complete` });
  else out.push({ cls:"out", text: (confirmedNow ? "commit confirmed accepted\n" : "") + "commit complete" });
  if(sub && "and-quit".startsWith(sub)){
    dev.cli.mode = "op"; dev.cli.editKeys = [];
    out.push({ cls:"out", text: "Exiting configuration mode" });
  }
  return out;
}

function autoRollback(dev){
  if(!dev.commitPending) return;
  dev.commitPending = null;
  delete COMMIT_TIMERS[dev.id];
  const prev = dev.cfgHistory.shift();
  if(prev){ dev.config = prev; dev.candidate = deepClone(prev); dev.name = hostnameOf(dev); }
  devLog(dev, "UI_COMMIT_NOT_CONFIRMED: automatic rollback — previous configuration restored");
  rebuildAllDerived();
  dev.cli.log.push({ cls:"sys", text: "Broadcast Message from root@" + hostnameOf(dev) +
    ":\n  commit was not confirmed in time — automatic rollback complete, previous configuration restored" });
  if(typeof refreshCliView === "function") refreshCliView();
  touchState();
}

function rollbackCmd(dev, rest){
  const n = rest.length ? parseInt(rest[0], 10) : 0;
  if(isNaN(n) || n < 0) return lines("err", "usage: rollback <n> (0 = committed config, 1 = one commit ago ...)");
  if(n === 0) dev.candidate = deepClone(dev.config);
  else {
    const h = dev.cfgHistory[n - 1];
    if(!h) return lines("err", `rollback ${n}: no such commit in history (${dev.cfgHistory.length} available)`);
    dev.candidate = deepClone(h);
  }
  return lines("out", "load complete");
}

/* ---------- host shell ---------- */
/* ---------- ssh: manage the network ACROSS the network ---------- */
function sshSessionOk(fromDev, tgt){
  if(!tgt) return { ok: false, why: "the remote host is gone" };
  if(tgt.powered === false || tgt.failed) return { ok: false, why: "the box went dark" };
  if((tgt.type === "switch" || tgt.type === "router") && !cfgGet(tgt.config, ["system", "services", "ssh"]))
    return { ok: false, why: "ssh was removed from the committed config" };
  let reach = false;
  try{ reach = pingRun(fromDev, fromDev.cli.sshIp, { proto: "tcp" }).ok; }catch(e){}
  if(!reach) return { ok: false, why: "no network path to " + fromDev.cli.sshIp + " any more" };
  return { ok: true };
}
function sshForward(dev, cmd){
  if(!dev.cli.sshTo) return null;
  const tgt = devices[dev.cli.sshTo];
  const chk = sshSessionOk(dev, tgt);
  if(!chk.ok){
    dev.cli.sshTo = null; dev.cli.sshIp = null;
    return lines("err", "Connection to " + (tgt ? tgt.name : "remote host") + " closed — " + chk.why + ".");
  }
  if((cmd === "exit" || cmd === "quit") && tgt.cli.mode !== "cfg" && !tgt.cli.stage){
    dev.cli.sshTo = null; dev.cli.sshIp = null;
    return lines("out", "Connection to " + tgt.name + " closed.");
  }
  const out = deviceExec(tgt, cmd);
  const after = sshSessionOk(dev, tgt);
  if(!after.ok){
    dev.cli.sshTo = null; dev.cli.sshIp = null;
    return [...out, ...lines("err",
      "packet_write_wait: Connection to " + tgt.name + " closed — " + after.why + ".\n" +
      '(you just sawed off the branch you were sitting on. This is exactly what "commit confirmed 5" is for:\n' +
      " if you cannot confirm because you locked yourself out, the box rolls back on its own)")];
  }
  return out;
}
function hostExec(dev, cmd){
  const fwd = sshForward(dev, cmd);
  if(fwd) return fwd;
  const parts = cmd.split(/\s+/);
  if(cmd === "?" || cmd === "help")
    return lines("out",
      "ip addr add <ip>/<bits> dev eth0     assign an address\n" +
      "dhclient eth0                        get an address via DHCP\n" +
      "wifi scan / join <ssid> / leave      wireless: list, associate, drop\n" +
      "ip addr                              show the current address\n" +
      "ip route add default via <gw-ip>     set the default gateway\n" +
      "ip route [del default]               show / clear routes\n" +
      "arp -a                               show the ARP cache\n" +
      "nameserver <dns-ip>                  point this machine at a DNS server\n" +
      "nslookup <name> / curl <name>        resolve a name / fetch a web page\n" +
      "ping <ip-or-name>                    test reachability\n" +
      "ssh [user@]<ip-or-name>              open a CLI session on a switch, router or server\n" +
      "traceroute <ip>                      show the L3 path\n" +
      "hostname <name>                      rename this host");
  if(parts[0] === "hostname"){
    if(!parts[1] || !/^[\w.-]+$/.test(parts[1])) return lines("err", "usage: hostname <name>");
    dev.name = parts[1];
    return [];
  }
  if(parts[0] === "wifi"){
    if(parts[1] === "scan") return lines("out", wifiScan(dev));
    if(parts[1] === "join"){
      if(!parts[2]) return lines("err", "usage: wifi join <ssid>   (see wifi scan)");
      const r = wifiJoin(dev, parts[2]);
      return lines(r.err ? "err" : "out", r.text);
    }
    if(parts[1] === "leave"){
      const r = wifiLeave(dev);
      return lines(r.err ? "err" : "out", r.text);
    }
    return lines("err", "usage: wifi scan | wifi join <ssid> | wifi leave");
  }
  if(parts[0] === "dhclient" || (parts[0] === "ip" && parts[1] === "addr" && parts[2] === "dhcp"))
    return runDhclient(dev);
  if(parts[0] === "ip" && parts[1] === "addr"){
    if(parts[2] === "add"){
      const pfx = parsePrefix(parts[3] || "");
      if(!pfx) return lines("err", "usage: ip addr add <ip>/<bits> dev eth0   (e.g. ip addr add 10.0.10.11/24 dev eth0)");
      dev.cfg.ip = pfx.ip; dev.cfg.bits = pfx.bits;
      return lines("out", `eth0: ${pfx.ip}/${pfx.bits} assigned`);
    }
    if(parts[2] === "del"){ dev.cfg.ip = null; dev.cfg.bits = null; return []; }
    return lines("out", dev.cfg.ip
      ? `eth0: ${dev.cfg.ip}/${dev.cfg.bits}  link/ether ${macOf(dev.id, "eth0")}`
      : `eth0: no IP assigned  link/ether ${macOf(dev.id, "eth0")}`);
  }
  if(parts[0] === "ip" && parts[1] === "route"){
    if(parts[2] === "add"){
      if(parts[3] === "default" && parts[4] === "via" && validIp(parts[5] || "")){
        dev.cfg.gw = parts[5];
        return [];
      }
      return lines("err", "usage: ip route add default via <gateway-ip>");
    }
    if(parts[2] === "del"){ dev.cfg.gw = null; return []; }
    const rows = [];
    if(dev.cfg.gw) rows.push(`default via ${dev.cfg.gw} dev eth0`);
    if(dev.cfg.ip) rows.push(`${networkOf(dev.cfg.ip, dev.cfg.bits)}/${dev.cfg.bits} dev eth0 proto kernel scope link src ${dev.cfg.ip}`);
    return lines("out", rows.length ? rows.join("\n") : "(no routes — assign an address first)");
  }
  if(parts[0] === "ifconfig") return hostExec(dev, "ip addr");
  if(parts[0] === "arp"){
    const e = Object.entries(dev.arp);
    return lines("out", e.length
      ? e.map(([ip, a]) => `? (${ip}) at ${a.mac} [ether] on eth0`).join("\n")
      : "(empty — the ARP cache fills when you send traffic)");
  }
  if(parts[0] === "ping"){
    const target = parts.filter(p => p !== "-c" && !/^\d+$/.test(p))[1];
    if(!target) return lines("err", "usage: ping <ip-or-name>");
    if(validIp(target)) return doDevicePing(dev, target);
    const r = resolveName(dev, target);
    if(!r.ok) return lines("err", "ping: cannot resolve " + target + ": " + r.text);
    return [{ cls: "out", text: `PING ${target} (${r.ip}) — resolved via ${r.via}` }, ...doDevicePing(dev, r.ip)];
  }
  if(parts[0] === "nameserver"){
    if(!parts[1]) return lines("out", dev.cfg.ns ? "nameserver " + dev.cfg.ns : "(no nameserver set — nameserver <dns-ip>)");
    if(!validIp(parts[1])) return lines("err", "usage: nameserver <dns-ip>   (writes /etc/resolv.conf)");
    dev.cfg.ns = parts[1];
    return lines("out", "nameserver set to " + parts[1] + " (/etc/resolv.conf updated)");
  }
  if(parts[0] === "nslookup"){
    if(!parts[1]) return lines("err", "usage: nslookup <name>");
    const r = resolveName(dev, parts[1]);
    if(!r.ok) return lines("err", "** server can't find " + parts[1] + ": " + r.text);
    return lines("out", `Server:  ${dev.cfg.ns}\nAddress: ${dev.cfg.ns}#53\n\nName:    ${parts[1]}\nAddress: ${r.ip}`);
  }
  if(parts[0] === "curl"){
    if(!parts[1]) return lines("err", "usage: curl <name-or-ip>");
    const r = curlCheck(dev, parts[1].replace(/^https?:\/\//, ""));
    return lines(r.ok ? "out" : "err", r.text);
  }
  if(parts[0] === "ssh"){
    const target = (parts[1] || "").replace(/^[\w.-]+@/, "");
    if(!target) return lines("err", "usage: ssh [user@]<ip-or-name>");
    let ip = target;
    if(!validIp(ip)){
      const r = resolveName(dev, target);
      if(!r.ok) return lines("err", "ssh: Could not resolve hostname " + target + ": " + r.text);
      ip = r.ip;
    }
    const tgt = findDeviceByIp(ip);
    if(tgt === dev) return lines("err", "ssh: that is this machine — you are already here");
    if(!tgt) return lines("err", "ssh: connect to host " + ip + " port 22: No route to host");
    if(tgt.type === "host")
      return lines("err", "ssh: connect to host " + ip + " port 22: Connection refused\n(PCs in this lab run no SSH daemon)");
    if(tgt.type === "isp")
      return lines("err", "ssh: connect to host " + ip + " port 22: Connection refused\n(the provider does not hand out shells)");
    if(tgt.powered === false || tgt.failed)
      return lines("err", "ssh: connect to host " + ip + " port 22: Connection timed out\n(silence, not refusal — the box is dark. Check power before you check config.)");
    if((tgt.type === "switch" || tgt.type === "router") && !cfgGet(tgt.config, ["system", "services", "ssh"]))
      return lines("err", "ssh: connect to host " + ip + " port 22: Connection refused\n" +
        '(reachable, but nothing listens on 22. Commit "set system services ssh" on it — via its console)');
    let reach = false;
    try{ reach = pingRun(dev, ip, { proto: "tcp" }).ok; }catch(e){}
    if(!reach)
      return lines("err", "ssh: connect to host " + ip + " port 22: Connection timed out\n(no network path — fix reachability first, then worry about services)");
    dev.cli.sshTo = tgt.id; dev.cli.sshIp = ip;
    return lines("out",
      (tgt.type === "server" ? "Welcome to " + tgt.name : "--- JUNOS 23.4R1.10 built 2026-08-27 ---") +
      "\n(ssh session open to " + tgt.name + ' — "exit" at the top prompt comes back to ' + dev.name + ")");
  }
  if(parts[0] === "traceroute"){
    if(!validIp(parts[1] || "")) return lines("err", "usage: traceroute <ip>");
    return doTraceroute(dev, parts[1]);
  }
  return lines("err", `command not found: "${parts[0]}" — type ? or help`);
}

/* ---------- isp ---------- */
function ispExec(dev, cmd){
  if(cmd === "?" || cmd === "help")
    return lines("out",
      "show interfaces terse    this link's public IP\n" +
      "show bgp                 who is peering with the provider (AS " + (dev.cfg.asn || 65001) + ")\n" +
      "(this node is the outside world — once your traffic reaches it, any\n" +
      " public IP like 8.8.8.8 answers. Nothing here is configurable.)");
  if(/^show\s+int/.test(cmd))
    return lines("out", `wan0   up   up   inet   ${dev.cfg.ip}/${dev.cfg.bits}   (upstream provider, AS ${dev.cfg.asn || 65001} — the internet lives behind this)`);
  if(/^show\s+bgp/.test(cmd)){
    const rows = [];
    for(const d of Object.values(devices))
      for(const p of ((d.d && d.d.bgpPeers) || []))
        if(p.addr === dev.cfg.ip)
          rows.push(`peer ${d.name}  AS${(d.d && d.d.as) || "?"}  ${p.state}` + (p.state === "Established" ? "  (we advertise 0.0.0.0/0 to them)" : ""));
    return lines("out", rows.length ? rows.join("\n")
      : "no BGP sessions — customers configure: routing-options autonomous-system, then protocols bgp group <name> type external / peer-as " + (dev.cfg.asn || 65001) + " / neighbor " + dev.cfg.ip);
  }
  return lines("err", 'this is a read-only ISP link — try "show interfaces terse" or ?');
}

/* ============================================================
   POWER — chassis on/off + the factory first-boot sequence
   ============================================================ */
function pwHash(pw){
  let h = 5381;
  for(let i = 0; i < pw.length; i++) h = ((h * 33) ^ pw.charCodeAt(i)) >>> 0;
  return "$6$lab$" + h.toString(16).padStart(8, "0") + "..";
}
function legacySyntaxHint(cmd){
  if(/\bport-mode\b/.test(cmd))
    return lines("err",
      "'port-mode' is legacy (pre-ELS) syntax — it worked on old EX code (Junos 12.x and earlier).\n" +
      "This lab models ELS (Enhanced Layer 2 Software), the CLI on every current EX like the EX4300:\n" +
      "  legacy:  set interfaces ge-0/0/1 unit 0 family ethernet-switching port-mode access\n" +
      "  ELS:     set interfaces ge-0/0/1 unit 0 family ethernet-switching interface-mode access");
  if(/\bl3-interface\s+vlan\./.test(cmd))
    return lines("err",
      "'l3-interface vlan.N' is legacy (pre-ELS) syntax — RVIs were called vlan.N on old EX code.\n" +
      "On ELS (this lab, and every current EX) the routed VLAN interface is irb:\n" +
      "  legacy:  set vlans staff l3-interface vlan.10   (with interfaces vlan unit 10 ...)\n" +
      "  ELS:     set vlans staff l3-interface irb.10    (with interfaces irb unit 10 ...)");
  if(/\binterfaces\s+vlan\s+unit\b/.test(cmd))
    return lines("err",
      "'interfaces vlan unit N' is legacy (pre-ELS) syntax. On ELS the L3-in-a-VLAN interface is irb:\n" +
      "  ELS: set interfaces irb unit 10 family inet address 10.0.10.1/24");
  return null;
}
function powerOn(dev){
  if(dev.powered !== false) return;
  dev.powered = true;
  if(typeof SFX !== "undefined") SFX.powerUp();
  devLog(dev, dev.type === "server" ? "kernel: power button pressed — system boot" : "chassisd: chassis power on");
  if(dev.brandNew){
    dev.cli.stage = "boot";
    const model = dev.model || (dev.type === "switch" ? "EX-series" : "MX-series");
    const linesBoot = [
      "U-Boot 2016.01 (lab build)",
      "Booting JUNOS from /dev/gpt/junos ...",
      `FreeBSD/arm64 — JUNOS 23.4R1.10 on ${model}`,
      "Starting chassisd (chassis manager)",
      "Starting l2ald (ethernet switching)",
      `Detected ${dev.ports.length} x ge interfaces, me0 management, console`,
      "",
      "Amnesiac (ttyu0)",
      "",
      "login:",
    ];
    let i = 0;
    const step = () => {
      if(dev.powered === false) return;      // pulled the plug mid-boot
      dev.cli.log.push({ cls: i >= linesBoot.length - 3 ? "out" : "sys", text: linesBoot[i] });
      if(typeof refreshCliView === "function" && activeDevice === dev.id) refreshCliView();
      i++;
      if(i < linesBoot.length) setTimeout(step, 220);
      else dev.cli.stage = "login";
    };
    setTimeout(step, 200);
  } else {
    dev.cli.log.push({ cls: "sys", text: dev.type === "server"
      ? "(power button pressed — BIOS POST, kernel boots, enabled services come back up)"
      : "(power on — JUNOS boots, session restored)" });
  }
  rebuildAllDerived();
  if(typeof touchState === "function") touchState();
  if(typeof refreshCliView === "function") refreshCliView();
}
function powerOff(dev){
  if(dev.powered === false) return;
  dev.powered = false;
  dev.cli.stage = null;
  dev.cli.pendingPw = null;
  dev.cli.mode = "op";
  dev.cli.editKeys = [];
  dev.cli.log.push({ cls: "sys", text: dev.type === "server"
    ? "(power off — the fans spin down; every service dies with the box)"
    : "(power off — the console goes dark)" });
  devLog(dev, dev.type === "server" ? "kernel: system halted" : "chassisd: chassis power off");
  rebuildAllDerived();
  if(typeof touchState === "function") touchState();
  if(typeof refreshCliView === "function") refreshCliView();
}

/* ---------- server shell: a host that LISTENS ---------- */
const SERVER_HELP =
  "service start dns|http|syslog       start listening (a server is a computer that listens)\n" +
  "service stop dns|http|syslog         stop a service\n" +
  "service status                       what is running\n" +
  "dns add <name> <ip>                  publish a record (e.g. dns add web.lab 10.0.10.80)\n" +
  "dns del <name> / dns list            manage records\n" +
  "log                                  recent system messages (boots, shutdowns)\n" +
  "...plus everything a host can do: ip addr, ip route, ping, curl, nslookup, hostname";
function serverExec(dev, cmd){
  if(dev.powered === false)
    return lines("err", "(no power — the fans are silent. Press the power button on the faceplate.)");
  const fwd = sshForward(dev, cmd);
  if(fwd) return fwd;
  const parts = cmd.split(/\s+/);
  if(cmd === "?" || cmd === "help") return lines("out", SERVER_HELP);
  if(parts[0] === "log")
    return lines("out", (dev.syslog && dev.syslog.length) ? dev.syslog.join("\n") : "(log is empty)");
  if(parts[0] === "wifi") return lines("err", "servers live on cables — no radio in this chassis");
  dev.cfg.services = dev.cfg.services || {};
  dev.cfg.records = dev.cfg.records || {};
  if(parts[0] === "service"){
    if(parts[1] === "start" && (parts[2] === "dns" || parts[2] === "http" || parts[2] === "syslog")){
      dev.cfg.services[parts[2]] = true;
      if(typeof touchState === "function") touchState();
      return lines("out", `* ${parts[2]} started` + (
        parts[2] === "dns" ? " — publish records with: dns add <name> <ip>" :
        parts[2] === "http" ? " — listening on port 80" :
        ' — listening on 514/udp. Point network gear here: set system syslog host <this ip> any any'));
    }
    if(parts[1] === "stop" && (parts[2] === "dns" || parts[2] === "http" || parts[2] === "syslog")){
      dev.cfg.services[parts[2]] = false;
      if(typeof touchState === "function") touchState();
      return lines("out", `* ${parts[2]} stopped`);
    }
    if(parts[1] === "status" || !parts[1])
      return lines("out", ["dns     " + (dev.cfg.services.dns ? "running" : "stopped"),
                           "http    " + (dev.cfg.services.http ? "running" : "stopped"),
                           "syslog  " + (dev.cfg.services.syslog ? "running" : "stopped")].join("\n"));
    return lines("err", "usage: service start|stop dns|http|syslog  —  or service status");
  }
  if(parts[0] === "dns"){
    if(parts[1] === "add" && parts[2] && validIp(parts[3] || "")){
      dev.cfg.records[parts[2].toLowerCase()] = parts[3];
      if(typeof touchState === "function") touchState();
      return lines("out", `record added: ${parts[2].toLowerCase()} -> ${parts[3]}`);
    }
    if(parts[1] === "del" && parts[2]){
      delete dev.cfg.records[parts[2].toLowerCase()];
      return lines("out", "record removed");
    }
    if(parts[1] === "list"){
      const rs = Object.entries(dev.cfg.records);
      return lines("out", rs.length ? rs.map(([n, ip]) => `${pad(n, 24)}A   ${ip}`).join("\n") : "(no records — dns add <name> <ip>)");
    }
    return lines("err", "usage: dns add <name> <ip>  |  dns del <name>  |  dns list");
  }
  return hostExec(dev, cmd);
}
