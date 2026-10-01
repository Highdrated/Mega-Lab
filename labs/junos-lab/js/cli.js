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
    if(stage === "confirm"){
      dev.cli.stage = null;
      const act = dev.cli.confirmAct;
      dev.cli.confirmAct = null;
      if(/^(y|yes)$/i.test(cmd)) return confirmRun(dev, act);
      return lines("out", "(cancelled \u2014 nothing was done)");
    }
    if(stage === "boot"){
      if(/^(break|ctrl\+c|\^c)$/i.test(cmd)){
        dev.cli.stage = "loader";
        dev.bootSlow = false;
        return lines("out", "Type '?' for a list of commands, 'help' for more detailed help.\nloader>");
      }
      return lines("out", "(booting \u2014 give it a second...)\n(type break to interrupt the boot and reach the loader prompt)");
    }
    if(stage === "loader"){
      if(cmd === "?" || cmd === "help")
        return lines("out", "loader commands:\n  boot                    continue booting normally\n  boot -s                 boot into single-user mode (the password-recovery path)\n  reboot                  restart the box");
      if(cmd === "boot"){
        dev.cli.stage = "login";
        return lines("out", "Booting...\n\nAmnesiac (ttyu0)\n\nlogin:");
      }
      if(/^boot\s+-s$/.test(cmd)){
        dev.cli.stage = "single";
        return lines("out",
          "Booting [kernel] in single user mode...\n\n" +
          "Enter full pathname of shell or 'recovery' for root password recovery\n" +
          "or RETURN for /bin/sh:");
      }
      if(cmd === "reboot"){ dev.cli.stage = "login"; return lines("out", "Rebooting...\n\nAmnesiac (ttyu0)\n\nlogin:"); }
      return lines("err", "Unknown command. Type ? for the list.\nloader>");
    }
    if(stage === "single"){
      if(cmd === "recovery"){
        dev.cli.stage = null;
        dev.cli.mode = "cfg";
        dev.user = "root";
        dev.recoveryMode = true;
        return lines("out",
          "Performing filesystem check...\nroot file system: clean\n\n" +
          "Entering Junos configuration mode for root password recovery.\n" +
          "Set a new root password, then commit:\n" +
          "  set system root-authentication plain-text-password\n" +
          "  commit\n\n[edit]");
      }
      return lines("out", "(type recovery to reset the root password \u2014 that is what single-user mode is for here)");
    }
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
  if(cmd === "?" || cmd === "help") return helpLines(dev);
  const seg = pipeSplit(cmd);
  if(seg.length > 1) return opPiped(dev, seg);
  return opRun(dev, cmd);
}
function opPiped(dev, seg){
  if(!seg[0]) return lines("err", 'syntax error: nothing before the "|" \u2014 a filter needs output to filter');
  for(let k = seg.length; k >= 1; k--){
    const base = seg.slice(0, k).join(" | ");
    const res = trieWalk(OP_TRIE[dev.type], base.split(/\s+/), dev);
    if(res.err || !res.node || !res.node.leaf) continue;
    const out = opRun(dev, base);
    const stages = seg.slice(k);
    return stages.length ? pipeRun(dev, out, stages) : out;
  }
  return opRun(dev, seg[0]);
}
function opRun(dev, cmd){
  const tokens = cmd.split(/\s+/);
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
  if(typeof unmodeledRecord === "function") unmodeledRecord(raw, "operational", dev && dev.type);
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
  ping <ip> / traceroute <ip>    test reachability from this device

Filter any output with a pipe:
  ... | match <pattern>          only lines that match (case sensitive)
  ... | except <pattern>         everything but those lines
  ... | find <pattern>           skip forward to the first match
  ... | count                    how many lines, instead of the lines
  ... | last <n>                 the final n lines
  ... | save <file>              write it to a file (file show <file> reads it back)
  show configuration | display set          the config as paste-able set commands
  show configuration | compare rollback <n> what changed since an earlier commit`
    : `Type any command followed by ? to see what can come next — that's the real JunOS way.
Quick reference:
  configure                      enter configuration mode
  show configuration             the committed (active) config
  show interfaces terse          interface / link / address summary
  show route                     routing table (connected + static)
  show arp                       ARP cache
  ping <ip> / traceroute <ip>    test reachability from this device

Filter any output with a pipe:
  ... | match <pattern>          only lines that match (case sensitive)
  ... | except <pattern>         everything but those lines
  ... | find <pattern>           skip forward to the first match
  ... | count                    how many lines, instead of the lines
  ... | last <n>                 the final n lines
  ... | save <file>              write it to a file (file show <file> reads it back)
  show configuration | display set          the config as paste-able set commands
  show configuration | compare rollback <n> what changed since an earlier commit`;
  return lines("out", t);
}

/* ---------- configuration mode ---------- */
const CFG_COMMANDS = ["set", "delete", "show", "edit", "up", "top", "exit", "quit", "run", "commit", "rollback",
  "load", "annotate", "activate", "deactivate", "insert", "rename", "copy", "status", "save", "wildcard"];

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
      "  annotate <stmt> \"<c>\" attach a comment to a statement (\"\" removes it)\n" +
      "  deactivate <stmt>     keep the statement but stop it taking effect (renders inactive:)\n" +
      "  activate <stmt>       switch a deactivated statement back on\n" +
      "  insert <stmt> before|after <stmt>   reorder terms (order decides the verdict)\n" +
      "  rename <stmt> to <new>  rename a statement in place\n" +
      "  copy <stmt> to <new>    duplicate a statement and its whole subtree\n" +
      "  status                who else is editing this configuration\n" +
      "  save <file>           write the candidate to a file (file show <file> reads it back)\n" +
      "  wildcard delete <stmt with *>   delete every statement the pattern matches\n" +
      "  up / top              go up one level / back to the top\n" +
      "  commit                make the candidate active\n" +
      "  commit confirmed <m>  commit with automatic rollback unless confirmed\n" +
      "  commit check          validate without committing\n" +
      "  rollback [n]          reset candidate (0 = committed, 1 = previous commit...)\n" +
      "  run <command>         run an operational command from here\n" +
      "  exit                  leave this level / leave configuration mode");
  }
  const seg = pipeSplit(cmd);
  if(seg.length > 1) return cfgPiped(dev, seg);
  return cfgRun(dev, cmd);
}
function cfgWordOf(w){
  if(CFG_COMMANDS.includes(w)) return w;
  const m = CFG_COMMANDS.filter(c => c.startsWith(w));
  return m.length === 1 ? m[0] : null;
}
function cfgPiped(dev, seg){
  const base = seg[0];
  if(!base) return lines("err", 'syntax error: nothing before the "|" \u2014 a filter needs output to filter');
  const word = cfgWordOf(base.split(/\s+/)[0]);
  if(word === "run") return opExec(dev, seg.join(" | ").replace(/^\s*\S+\s*/, ""));
  if(word !== "show")
    return lines("err", 'error: a | filter needs output to filter \u2014 put it after show (or after run <command>)');
  let stages = seg.slice(1);
  const first = stages.length && stages[0] ? pipeResolve(stages[0].split(/\s+/)[0]) : null;
  let out;
  if(first && first.name === "compare"){
    const a = stages[0].split(/\s+/).slice(1);
    let against = committedTree(dev);
    if(a.length){
      if(!"rollback".startsWith(a[0]) || a.length > 2)
        return lines("err", "usage: show | compare  (or show | compare rollback <n>)");
      const n = a.length === 2 ? parseInt(a[1], 10) : 1;
      if(isNaN(n) || n < 0) return lines("err", "usage: show | compare rollback <n>");
      if(n > 0){
        const h = (dev.cfgHistory || [])[n - 1];
        if(!h) return lines("err", "rollback " + n + ": no such commit in history (" + (dev.cfgHistory || []).length + " available)");
        against = h;
      }
    }
    const d = diffTrees(against, dev.candidate);
    out = lines("out", d || "(no uncommitted changes)");
    stages = stages.slice(1);
  } else if(first && first.name === "display"){
    const sub = stages[0].split(/\s+/).slice(1).join(" ");
    if(!sub || !"set".startsWith(sub))
      return lines("err", 'error: this lab models | display set \u2014 the candidate re-rendered as set commands');
    const full = dev.cli.editKeys.concat(base.split(/\s+/).slice(1));
    const res = full.length ? resolveTreePath(dev.candidate, full) : { keys: [], node: dev.candidate };
    if(typeof res.err === "string") return lines("out", "## (nothing configured at: " + full.join(" ") + ")");
    const node = res.arrayItem !== undefined ? { [full[full.length - 1]]: res.arrayItem } : res.node;
    const ls = (node && typeof node === "object")
      ? treeToDisplaySet(node, res.keys, annotAll(dev.candidate) || {}, inactAll(dev.candidate) || {})
      : ["set " + res.keys.concat([node]).join(" ")];
    out = lines("out", ls.length ? ls.join("\n") : "## (nothing configured here)");
    stages = stages.slice(1);
  } else {
    out = cfgRun(dev, base);
  }
  return stages.length ? pipeRun(dev, out, stages) : out;
}
function cfgTokens(cmd){
  const out = [];
  let cur = "", q = null, started = false;
  for(let i = 0; i < cmd.length; i++){
    const c = cmd[i];
    if(q){
      if(c === q){ q = null; continue; }
      cur += c; continue;
    }
    if(c === '"' || c === "'"){ q = c; started = true; continue; }
    if(/\s/.test(c)){ if(started){ out.push(cur); cur = ""; started = false; } continue; }
    cur += c; started = true;
  }
  if(started) out.push(cur);
  return out.length ? out : [""];
}
function cfgRun(dev, cmd){
  const tokens = cfgTokens(cmd);
  const word = tokens[0];
  const matches = CFG_COMMANDS.filter(c => c.startsWith(word));
  const cmdName = CFG_COMMANDS.includes(word) ? word : (matches.length === 1 ? matches[0] : null);
  if(!cmdName){
    if(matches.length > 1) return lines("err", `ambiguous command: "${word}" could be: ${matches.join(", ")}`);
    if(typeof unmodeledRecord === "function") unmodeledRecord(cmd, "configuration", dev && dev.type);
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
    case "quit":
    case "exit": {
      if(dev.cli.editKeys.length){ dev.cli.editKeys = []; return lines("out", cfgBanner(dev)); }
      dev.cli.mode = "op";
      const dirty = JSON.stringify(committedTree(dev)) !== JSON.stringify(dev.candidate);
      return lines("out", "Exiting configuration mode" +
        (dirty ? "\nwarning: uncommitted changes remain in the candidate configuration (rollback 0 discards them)" : ""));
    }
    case "run": {
      if(!rest.length) return lines("err", "usage: run <operational command>, e.g. run show interfaces terse");
      return opExec(dev, rest.join(" "));
    }
    case "annotate": return cfgAnnotateCmd(dev, cmd);
    case "deactivate": return cfgActivateCmd(dev, rest, false);
    case "activate": return cfgActivateCmd(dev, rest, true);
    case "insert": return cfgInsertCmd(dev, rest);
    case "rename": return cfgMoveCmd(dev, rest, false);
    case "copy": return cfgMoveCmd(dev, rest, true);
    case "status": return cfgStatusCmd(dev);
    case "save": return cfgSaveCmd(dev, rest);
    case "wildcard": return cfgWildcardCmd(dev, rest);
    case "commit": return commitCmd(dev, rest, cmd);
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
    const toks = cfgTokens(line);
    let out;
    if(toks[0] === "set") out = cfgSetCmd(dev, toks.slice(1));
    else if(toks[0] === "delete") out = cfgDeleteCmd(dev, toks.slice(1));
    else if(toks[0] === "annotate") out = cfgAnnotateCmd(dev, line);
    else { errors++; details.push("skipped (not set/delete/annotate): " + line); continue; }
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
    annotPrune(dev.candidate);
    return [];
  }
  cfgDelete(dev.candidate, res.keys);
  annotPrune(dev.candidate);
  return [];
}

function cfgShowCmd(dev, rest){
  const full = dev.cli.editKeys.concat(rest);
  if(!full.length){
    const txt = cfgIsEmpty(dev.candidate) ? "## (candidate configuration is empty)" : treeToText(dev.candidate);
    return lines("out", txt);
  }
  const res = resolveTreePath(dev.candidate, full);
  if(typeof res.err === "string") return lines("out", "## (nothing configured at: " + full.join(" ") + ")");
  const node = res.arrayItem !== undefined ? res.arrayItem : res.node;
  if(node && typeof node === "object" && !Array.isArray(node))
    return lines("out", Object.keys(node).length ? treeToTextAt(dev.candidate, res.keys, node) : "## (empty)");
  return lines("out", String(Array.isArray(node) ? node.join(" ") : node));
}

/* annotate <statement> "comment"  — the comment rides along with the
   candidate, survives commit, and prints above the statement. */
function cfgAnnotateCmd(dev, raw){
  const body = String(raw).replace(/^\s*\S+\s*/, "");
  if(!body.trim())
    return lines("err", 'usage: annotate <statement> "<comment>" — e.g. annotate ge-0/0/1 "uplink to core"');
  const m = body.match(/^([\s\S]*?)\s*(?:"([\s\S]*)"|'([\s\S]*)')\s*$/);
  if(!m)
    return lines("err", 'syntax error: the comment must be quoted — annotate ge-0/0/1 "uplink to core"');
  const stmt = m[1].trim();
  const note = annotClean(m[2] !== undefined ? m[2] : m[3]);
  if(!stmt)
    return lines("err", 'usage: annotate <statement> "<comment>" — name the statement the comment belongs to');
  const path = stmt.split(/\s+/);
  const full = dev.cli.editKeys.concat(path);
  if(cfgGet(dev.candidate, full) === undefined)
    return lines("err", "error: statement not found: " + full.join(" ") +
      "\n  annotate only comments on configuration that already exists — set it first, then annotate it");
  if(!note){
    const had = annotClear(dev.candidate, full);
    if(typeof touchState === "function") touchState();
    return lines("out", had ? "" : "warning: no comment was attached to " + full.join(" "));
  }
  annotSet(dev.candidate, full, note);
  if(typeof touchState === "function") touchState();
  return lines("out", "");
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

function cfgActivateCmd(dev, rest, on){
  const verb = on ? "activate" : "deactivate";
  if(!rest.length) return lines("err", "usage: " + verb + " <statement>, e.g. " + verb + " interfaces ge-0/0/1");
  const full = dev.cli.editKeys.concat(rest);
  const res = resolveTreePath(dev.candidate, full);
  if(typeof res.err === "string")
    return lines("err", res.ambiguous
      ? 'ambiguous statement: "' + res.err + '" matches more than one thing here'
      : "error: statement not found: " + full.join(" ") +
        "\n  " + verb + " only works on configuration that already exists \u2014 set it first");
  if(res.arrayItem !== undefined)
    return lines("err", "error: cannot " + verb + " one item of a list \u2014 name the statement above it");
  const keys = res.keys;
  if(on){
    if(!inactClear(dev.candidate, keys))
      return lines("err", "warning: " + keys.join(" ") + " is not deactivated");
  } else {
    inactSet(dev.candidate, keys);
  }
  if(typeof touchState === "function") touchState();
  return [];
}

function cfgInsertCmd(dev, rest){
  const at = rest.findIndex(t => t === "before" || t === "after");
  if(at < 1 || at === rest.length - 1)
    return lines("err", "usage: insert <statement> before|after <statement>\n" +
      "  e.g. insert term allow-dns before term deny-all");
  const where = rest[at];
  const left = dev.cli.editKeys.concat(rest.slice(0, at));
  const right = rest.slice(at + 1);
  const res = resolveTreePath(dev.candidate, left);
  if(typeof res.err === "string")
    return lines("err", "error: statement not found: " + left.join(" "));
  const keys = res.keys;
  if(keys.length < 2) return lines("err", "error: nothing to reorder at the top level of the hierarchy");
  const parentKeys = keys.slice(0, -1), item = keys[keys.length - 1];
  const parent = cfgGet(dev.candidate, parentKeys);
  if(!parent || typeof parent !== "object" || Array.isArray(parent))
    return lines("err", "error: " + parentKeys.join(" ") + " holds no ordered statements");
  const refName = right[right.length - 1];
  const ref = (refName in parent) ? refName : Object.keys(parent).filter(k => k.startsWith(refName))[0];
  if(!ref || ref === ANNOT_KEY || ref === INACT_KEY)
    return lines("err", "error: statement not found: " + parentKeys.concat(right).join(" "));
  if(ref === item) return lines("err", "error: cannot insert " + item + " relative to itself");
  const order = Object.keys(parent).filter(k => k !== item);
  const idx = order.indexOf(ref) + (where === "after" ? 1 : 0);
  order.splice(idx, 0, item);
  const rebuilt = {};
  for(const k of order) rebuilt[k] = parent[k];
  cfgSet(dev.candidate, parentKeys, rebuilt);
  if(typeof touchState === "function") touchState();
  return [];
}

function cfgMoveCmd(dev, rest, isCopy){
  const verb = isCopy ? "copy" : "rename";
  const at = rest.indexOf("to");
  if(at < 1 || at === rest.length - 1)
    return lines("err", "usage: " + verb + " <statement> to <new-name>\n" +
      "  e.g. " + verb + " term allow-dns to term permit-dns");
  const left = dev.cli.editKeys.concat(rest.slice(0, at));
  const right = rest.slice(at + 1);
  const res = resolveTreePath(dev.candidate, left);
  if(typeof res.err === "string")
    return lines("err", "error: statement not found: " + left.join(" "));
  if(res.arrayItem !== undefined)
    return lines("err", "error: cannot " + verb + " one item of a list");
  const keys = res.keys;
  const parentKeys = keys.slice(0, -1), item = keys[keys.length - 1];
  const parent = parentKeys.length ? cfgGet(dev.candidate, parentKeys) : dev.candidate;
  const dest = right[right.length - 1];
  if(!/^[\w.\/:-]+$/.test(dest)) return lines("err", 'error: "' + dest + '" is not a valid statement name');
  if(dest === item) return lines("err", "error: " + verb + " needs a different name");
  if(dest in parent) return lines("err", "error: " + parentKeys.concat([dest]).join(" ") + " already exists");
  const order = Object.keys(parent);
  const rebuilt = {};
  for(const k of order){
    if(k === item){
      if(isCopy){ rebuilt[k] = parent[k]; rebuilt[dest] = deepClone(parent[k]); }
      else rebuilt[dest] = parent[k];
    } else rebuilt[k] = parent[k];
  }
  if(parentKeys.length) cfgSet(dev.candidate, parentKeys, rebuilt);
  else { for(const k of Object.keys(dev.candidate)) delete dev.candidate[k];
         for(const k of Object.keys(rebuilt)) dev.candidate[k] = rebuilt[k]; }
  moveSideMarks(dev.candidate, keys, parentKeys.concat([dest]), isCopy);
  if(typeof touchState === "function") touchState();
  return [];
}
function moveSideMarks(tree, fromKeys, toKeys, isCopy){
  const from = fromKeys.join(" "), to = toKeys.join(" ");
  for(const key of [ANNOT_KEY, INACT_KEY]){
    const m = tree[key];
    if(!m) continue;
    for(const k of Object.keys(m)){
      if(k !== from && k.indexOf(from + " ") !== 0) continue;
      m[to + k.slice(from.length)] = m[k];
      if(!isCopy) delete m[k];
    }
    if(!Object.keys(m).length) delete tree[key];
  }
}

/* ---------- save / wildcard delete ---------- */
function cfgSaveCmd(dev, rest){
  if(!rest.length)
    return lines("err", "usage: save <filename>\n" +
      "  writes the candidate configuration at this level to a file on the box");
  if(rest.length > 1)
    return lines("err", 'usage: save <filename> — one name, no spaces (got "' + rest.join(" ") + '")');
  const name = rest[0];
  if(!/^[\w.-]+$/.test(name))
    return lines("err", 'error: "' + name + '" is not a usable filename here — letters, digits, dot, dash, underscore');
  const keys = dev.cli.editKeys;
  let node = dev.candidate;
  if(keys.length){
    const res = resolveTreePath(dev.candidate, keys);
    if(typeof res.err === "string") return lines("err", "error: nothing configured at " + keys.join(" "));
    node = res.node;
  }
  const body = (node && typeof node === "object") ? treeToTextAt(dev.candidate, keys, node) : String(node);
  dev.files = dev.files || {};
  dev.files[name] = body || "## (nothing configured at this level)";
  const n = dev.files[name].split("\n").length;
  if(typeof touchState === "function") touchState();
  return lines("out", "Wrote " + n + " line" + (n === 1 ? "" : "s") + " of configuration to " + name + "\n" +
    "  save writes the CANDIDATE, not the active config, and only from the level you are at.\n" +
    "  Read it back with: run file show " + name);
}

function globToRe(pat){
  return new RegExp("^" + pat.split("*").map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
}
function cfgWildcardCmd(dev, rest){
  if(!rest.length || !"delete".startsWith(rest[0]))
    return lines("err", "usage: wildcard delete <statement with *>\n" +
      "  e.g. wildcard delete interfaces ge-0/0/*");
  const path = rest.slice(1);
  if(!path.length)
    return lines("err", "usage: wildcard delete <statement with *>, e.g. wildcard delete interfaces ge-0/0/*");
  const starAt = path.findIndex(t => t.indexOf("*") >= 0);
  if(starAt < 0)
    return lines("err", "error: wildcard delete needs a * in the statement\n" +
      "  without one it is just delete — use that instead");
  if(starAt !== path.length - 1)
    return lines("err", "error: this lab matches the * on the LAST word of the statement\n" +
      "  e.g. wildcard delete interfaces ge-0/0/*  (not  wildcard delete interfaces * unit 0)");
  const parentPath = dev.cli.editKeys.concat(path.slice(0, -1));
  const pat = path[path.length - 1];
  let parent = dev.candidate, parentKeys = [];
  if(parentPath.length){
    const res = resolveTreePath(dev.candidate, parentPath);
    if(typeof res.err === "string")
      return lines("err", "warning: statement not found: " + parentPath.join(" "));
    parent = res.node; parentKeys = res.keys;
  }
  if(!parent || typeof parent !== "object" || Array.isArray(parent))
    return lines("err", "error: " + parentPath.join(" ") + " holds no named statements to match against");
  const re = globToRe(pat);
  const hits = Object.keys(parent).filter(k => k !== ANNOT_KEY && k !== INACT_KEY && re.test(k));
  if(!hits.length)
    return lines("err", "warning: nothing matched " + parentKeys.concat([pat]).join(" ") +
      "\n  candidates here: " + (Object.keys(parent).filter(k => k !== ANNOT_KEY && k !== INACT_KEY).join(", ") || "(none)"));
  for(const k of hits) cfgDelete(dev.candidate, parentKeys.concat([k]));
  annotPrune(dev.candidate);
  inactPrune(dev.candidate);
  if(typeof touchState === "function") touchState();
  return lines("out", hits.length + " statement" + (hits.length === 1 ? "" : "s") + " deleted: " + hits.join(", ") +
    "\n  (nothing is live until you commit — show | compare first)");
}

function cfgStatusCmd(dev){
  const who = dev.user || "kaatje";
  const pid = 40000 + (String(dev.id).split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 20000);
  return lines("out", "Users currently editing the configuration:\n" +
    "  " + who + " terminal p0 (pid " + pid + ") on since " +
    new Date(dev.cli.since || Date.now()).toISOString().replace("T", " ").slice(0, 19) + "\n" +
    "      " + cfgBanner(dev));
}

/* ---------- commit / rollback ---------- */
function validateCandidate(dev){
  const errs = [];
  const c = activeOnly(dev.candidate);
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

function commitCmd(dev, rest, raw){
  let comment = null;
  const ci = rest.indexOf("comment");
  if(ci > -1){
    const m = String(raw == null ? rest.join(" ") : raw).match(/\bcomment\s+(?:"([^"]*)"|'([^']*)'|(\S+))\s*$/);
    if(!m)
      return lines("err", 'usage: commit comment "<text>" — quote the text\n  e.g. commit comment "opened DNS for the guest vlan"');
    comment = annotClean(m[1] !== undefined ? m[1] : (m[2] !== undefined ? m[2] : m[3]));
    if(!comment) return lines("err", 'error: commit comment needs some text');
    rest = rest.slice(0, ci);
  }
  const sub = rest[0] || "";
  if(sub && !"check".startsWith(sub) && !"confirmed".startsWith(sub) && !"and-quit".startsWith(sub))
    return lines("err", `unknown commit option "${sub}" — try commit, commit check, commit confirmed <minutes>, commit and-quit, commit comment "<text>"`);
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
  const prev = deepClone(committedTree(dev));
  dev.cfgHistory.unshift(prev);
  if(dev.cfgHistory.length > 49) dev.cfgHistory.length = 49;
  dev.commitLog = dev.commitLog || [];
  dev.commitLog.unshift({ when: Date.now(), comment: comment || null });
  if(dev.commitLog.length > 49) dev.commitLog.length = 49;
  dev.configFull = deepClone(dev.candidate);
  dev.config = activeOnly(dev.configFull);
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
  if(typeof strictOn === "function" && strictOn() && dev.type === "switch"){
    const aes = Object.keys((typeof D === "function" && D(dev).aes) || {});
    const cap = chassisAeCount(dev);
    const orphans = aes.filter(a => parseInt(a.replace("ae", ""), 10) >= cap);
    if(orphans.length)
      out.push({ cls:"warn", text: "warning: " + orphans.join(", ") + " will not be created — set chassis aggregated-devices ethernet device-count " +
        (Math.max.apply(null, orphans.map(a => parseInt(a.replace("ae", ""), 10))) + 1) + " first (strict mode)" });
  }
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
  if(prev){ dev.configFull = prev; dev.config = activeOnly(prev); dev.candidate = deepClone(prev); dev.name = hostnameOf(dev); }
  devLog(dev, "UI_COMMIT_NOT_CONFIRMED: automatic rollback — previous configuration restored");
  rebuildAllDerived();
  dev.cli.log.push({ cls:"sys", text: "Broadcast Message from root@" + hostnameOf(dev) +
    ":\n  commit was not confirmed in time — automatic rollback complete, previous configuration restored" });
  if(typeof refreshCliView === "function") refreshCliView();
  touchState();
}

function rollbackCmd(dev, rest){
  if(rest.length && rest[0] === "rescue"){
    if(!dev.rescueConfig) return lines("err", "no rescue configuration saved — create one first: run request system configuration rescue save");
    dev.candidate = deepClone(dev.rescueConfig);
    return lines("out", "load complete (rescue configuration loaded into the candidate — commit to activate)");
  }
  const n = rest.length ? parseInt(rest[0], 10) : 0;
  if(isNaN(n) || n < 0) return lines("err", "usage: rollback <n> (0 = committed config, 1 = one commit ago ...)");
  if(n === 0) dev.candidate = deepClone(committedTree(dev));
  else {
    const h = dev.cfgHistory[n - 1];
    if(!h) return lines("err", `rollback ${n}: no such commit in history (${dev.cfgHistory.length} available)`);
    dev.candidate = deepClone(h);
  }
  return lines("out", "load complete");
}

const PIPE_FILTERS = {
  "match":   "pattern",
  "except":  "pattern",
  "find":    "pattern",
  "count":   null,
  "no-more": null,
  "last":    "optnum",
  "trim":    "num",
  "save":    "word",
  "display": "other",
  "compare": "other",
};
function pipeSplit(raw){
  const parts = [];
  let cur = "", q = null;
  for(let i = 0; i < raw.length; i++){
    const c = raw[i];
    if(q){ cur += c; if(c === q) q = null; continue; }
    if(c === '"' || c === "'"){ q = c; cur += c; continue; }
    if(c === "|"){ parts.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  parts.push(cur.trim());
  return parts;
}
function pipeResolve(word){
  if(Object.prototype.hasOwnProperty.call(PIPE_FILTERS, word)) return { name: word };
  const p = Object.keys(PIPE_FILTERS).filter(n => n.startsWith(word));
  if(p.length === 1) return { name: p[0] };
  if(p.length > 1) return { ambiguous: p };
  return { unknown: word };
}
function pipeUnquote(s){
  const t = String(s == null ? "" : s).trim();
  if(t.length > 1 && ((t[0] === '"' && t[t.length - 1] === '"') || (t[0] === "'" && t[t.length - 1] === "'")))
    return t.slice(1, -1);
  return t;
}
function pipeFlatten(ls){
  const out = [];
  for(const l of ls) String(l.text).split("\n").forEach(t => out.push({ cls: l.cls, text: t }));
  return out;
}
function pipeRejoin(flat){
  const out = [];
  for(const l of flat){
    const last = out[out.length - 1];
    if(last && last.cls === l.cls) last.text += "\n" + l.text;
    else out.push({ cls: l.cls, text: l.text });
  }
  return out;
}
function pipeRegex(pat){
  try{ return { re: new RegExp(pat) }; }
  catch(e){ return { err: 'error: invalid regular expression: "' + pat + '"' }; }
}
const PIPE_MENU = "available filters: count, except, find, last, match, no-more, save, trim";

function pipeStage(flat, stage){
  const toks = stage.split(/\s+/).filter(Boolean);
  if(!toks.length) return { err: 'syntax error: empty filter after "|"\n' + PIPE_MENU };
  const r = pipeResolve(toks[0]);
  if(r.ambiguous) return { err: 'ambiguous filter: "' + toks[0] + '" could be: ' + r.ambiguous.join(", ") };
  if(r.unknown) return { err: 'unknown filter: "' + toks[0] + '"\n' + PIPE_MENU };
  const name = r.name;
  const argStr = stage.slice(stage.indexOf(toks[0]) + toks[0].length).trim();
  const kind = PIPE_FILTERS[name];

  if(name === "display")
    return { err: "error: | display " + (argStr || "<what>") +
      " has no meaning over operational output — | display set re-renders CONFIGURATION as set commands.\n" +
      "  operational mode: show configuration | display set      configuration mode: show | display set" };
  if(name === "compare")
    return { err: "error: | compare compares CONFIGURATION, not operational output.\n" +
      "  operational: show configuration | compare rollback <n>      configuration mode: show | compare" };

  if(kind === null && argStr)
    return { err: 'syntax error: "' + argStr + '" — | ' + name + ' takes no argument' };
  if(kind === "pattern" && !argStr)
    return { err: "syntax error: | " + name + " needs a pattern, e.g. | " + name + " ge-0/0/1" };

  if(name === "no-more") return { flat };
  if(name === "count") return { flat: [{ cls: "out", text: "Count: " + flat.length + " lines" }] };
  if(name === "match" || name === "except"){
    const g = pipeRegex(pipeUnquote(argStr));
    if(g.err) return { err: g.err };
    const keep = name === "match";
    return { flat: flat.filter(l => g.re.test(l.text) === keep) };
  }
  if(name === "find"){
    const g = pipeRegex(pipeUnquote(argStr));
    if(g.err) return { err: g.err };
    const i = flat.findIndex(l => g.re.test(l.text));
    return { flat: i === -1 ? [] : flat.slice(i) };
  }
  if(name === "last"){
    if(argStr && !/^\d{1,5}$/.test(argStr))
      return { err: "syntax error: | last <lines> takes a line count, e.g. | last 20" };
    const n = argStr ? parseInt(argStr, 10) : 10;
    return { flat: n <= 0 ? [] : flat.slice(-n) };
  }
  if(name === "trim"){
    if(!/^\d{1,5}$/.test(argStr))
      return { err: argStr && /^-/.test(argStr)
        ? "error: | trim only accepts positive values"
        : "syntax error: | trim <columns> needs a column count, e.g. | trim 4" };
    const n = parseInt(argStr, 10);
    return { flat: flat.map(l => ({ cls: l.cls, text: l.text.slice(n) })) };
  }
  if(name === "save"){
    if(!argStr) return { err: "syntax error: | save <filename>" };
    return { flat, save: pipeUnquote(argStr) };
  }
  return { err: 'unknown filter: "' + name + '"' };
}

function pipeRun(dev, ls, stages){
  let flat = pipeFlatten(ls);
  const notes = [];
  let saved = false;
  for(const st of stages){
    const r = pipeStage(flat, st);
    if(r.err) return lines("err", r.err);
    flat = r.flat;
    if(r.save){
      dev.files = dev.files || {};
      dev.files[r.save] = flat.map(l => l.text).join("\n");
      notes.push({ cls: "out", text: "Wrote " + flat.length + " lines of output to '" + r.save + "'" });
      if(typeof touchState === "function") touchState();
      saved = true;
    }
  }
  return saved ? notes : pipeRejoin(flat).concat(notes);
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
function requestConfirm(dev, act, question){
  dev.cli.stage = "confirm";
  dev.cli.confirmAct = act;
  return question;
}
function confirmRun(dev, act){
  if(act === "reboot"){
    const dirty = JSON.stringify(committedTree(dev)) !== JSON.stringify(dev.candidate);
    devLog(dev, "mgd: UI_REBOOT_EVENT: System reboot requested by " + (dev.user || "kaatje"));
    powerOff(dev);
    dev.candidate = deepClone(committedTree(dev));
    powerOn(dev);
    return lines("out", "Shutdown NOW!\n[pid 1]\n\n*** System going down for reboot ***" +
      (dirty ? "\nwarning: the uncommitted candidate configuration was discarded \u2014 a reboot keeps only what was committed" : ""));
  }
  if(act === "halt"){
    devLog(dev, "mgd: UI_HALT_EVENT: System halt requested by " + (dev.user || "kaatje"));
    powerOff(dev);
    return lines("out", "Shutdown NOW!\n[pid 1]\n\n*** The operating system has halted ***\n" +
      "(a halt stops Junos but leaves the chassis powered — on a real box in a rack you now need\n" +
      " console or a power cycle, which is why nobody halts a switch they cannot touch)");
  }
  if(act === "zeroize"){
    devLog(dev, "mgd: UI_ZEROIZE_EVENT: System zeroize requested by " + (dev.user || "kaatje"));
    dev.config = {};
    dev.configFull = {};
    dev.candidate = {};
    dev.cfgHistory = [];
    dev.commitLog = [];
    dev.syslog = [];
    dev.rescueConfig = null;
    dev.rescueWhen = null;
    dev.files = {};
    dev.cli.editKeys = [];
    dev.cli.mode = "op";
    powerOff(dev);
    powerOn(dev);
    if(typeof rebuildAllDerived === "function") rebuildAllDerived();
    if(typeof touchState === "function") touchState();
    return lines("out", "warning: zeroizing re0\n\n*** System rebooting to factory default ***\n" +
      "Everything is gone: configuration, rollbacks, rescue config, logs.\n" +
      "This is what you run before a box leaves your hands — and never on one in service.");
  }
  if(act === "power-off"){
    devLog(dev, "mgd: UI_POWER_OFF_EVENT: Power off requested by " + (dev.user || "kaatje"));
    powerOff(dev);
    return lines("out", "Shutdown NOW!\n[pid 1]\n\n*** System shutting down ***\n(press the power button on the faceplate to bring it back)");
  }
  return lines("out", "(nothing to confirm)");
}
const DAEMONS = {
  "routing": ["rpd", "routing protocol daemon — OSPF, BGP, the routing table"],
  "l2-learning": ["l2ald", "layer 2 address learning — MAC tables, VLANs"],
  "chassis-control": ["chassisd", "chassis manager — FPCs, power, environment"],
  "management": ["mgd", "management daemon — the CLI you are typing into"],
  "dhcp": ["dhcpd", "DHCP server and relay"],
  "snmp": ["snmpd", "SNMP agent"],
  "interface-control": ["dcd", "device control — interface configuration"],
};
function restartDaemonCmd(dev, keys){
  const name = keys[keys.length - 1];
  const d = DAEMONS[name];
  if(!d) return { text: 'error: "' + name + '" is not a restartable process', err: true };
  const pid = 1000 + Math.floor(Math.random() * 9000);
  devLog(dev, "mgd: UI_RESTART: " + d[0] + " restarted by " + (dev.user || "kaatje"));
  if(typeof touchState === "function") touchState();
  return d[0] + " restart initiated, pid " + pid + "\n" +
    "(" + d[1] + ")\n" +
    (name === "routing"
      ? "Restarting rpd drops every routing adjacency and rebuilds it — OSPF and BGP sessions will flap."
      : name === "l2-learning"
        ? "The MAC table is relearned from traffic, so expect a short burst of flooding."
        : "Only this daemon restarted; the box stayed up and forwarding continued in hardware.");
}

function powerOn(dev){
  dev.bootedAt = Date.now();
  if(dev.powered !== false) return;
  dev.powered = true;
  if(typeof SFX !== "undefined") SFX.powerUp();
  dev.bootSlow = (typeof realOn === "function" && realOn());
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
      if(i < linesBoot.length) setTimeout(step, dev.bootSlow ? 1900 + Math.random() * 1700 : 220);
      else {
        dev.cli.stage = "login";
        if(dev.bootSlow) devLog(dev, "chassisd: boot complete after cold start — real EX switches take minutes; be glad this is the short version");
      }
    };
    setTimeout(step, dev.bootSlow ? 2500 : 200);
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
const SERVICE_CATALOG = {
  dns:    { port: "53/udp",  note: "name resolution — publish records with: dns add <name> <ip>" },
  http:   { port: "80/tcp",  note: "web service — listening on port 80" },
  syslog: { port: "514/udp", note: "log collector — point gear here: set system syslog host <this ip> any any" },
  ntp:    { port: "123/udp", note: "time source — without it, log timestamps across devices cannot be correlated" },
  snmp:   { port: "161/udp", note: "exposes counters and state so a monitoring system can poll this box" },
  radius: { port: "1812/udp", note: "AAA — per-user authentication for 802.1X and device login" },
  nms:    { port: "443/tcp", note: "monitoring system — polls SNMP on everything it can reach (View > Monitoring screen)" },
};
const SERVICE_NAMES = Object.keys(SERVICE_CATALOG);
const SERVER_HELP =
  "service start <name>                 start listening (a server is a computer that listens)\n" +
  "service stop <name>                  stop a service\n" +
  "service status                       what is running, and on which port\n" +
  "service list                         every service this box can run\n" +
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
    if(parts[1] === "list")
      return lines("out", SERVICE_NAMES.map(n =>
        pad(n, 10) + pad(SERVICE_CATALOG[n].port, 11) + SERVICE_CATALOG[n].note).join("\n"));
    if(parts[1] === "start" && SERVICE_NAMES.includes(parts[2])){
      dev.cfg.services[parts[2]] = true;
      if(typeof devLog === "function") devLog(dev, "systemd: started " + parts[2] + " (" + SERVICE_CATALOG[parts[2]].port + ")");
      if(typeof touchState === "function") touchState();
      return lines("out", `* ${parts[2]} started — ` + SERVICE_CATALOG[parts[2]].note);
    }
    if(parts[1] === "stop" && SERVICE_NAMES.includes(parts[2])){
      dev.cfg.services[parts[2]] = false;
      if(typeof devLog === "function") devLog(dev, "systemd: stopped " + parts[2]);
      if(typeof touchState === "function") touchState();
      return lines("out", `* ${parts[2]} stopped`);
    }
    if(parts[1] === "status" || !parts[1])
      return lines("out", SERVICE_NAMES.map(n =>
        pad(n, 10) + pad(SERVICE_CATALOG[n].port, 11) +
        (dev.cfg.services[n] ? "running" : "stopped")).join("\n"));
    return lines("err", "usage: service start|stop <name>  |  service status  |  service list\nservices: " + SERVICE_NAMES.join(", "));
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
