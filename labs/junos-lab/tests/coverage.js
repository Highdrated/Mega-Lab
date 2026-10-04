#!/usr/bin/env node
/* Teaching-coverage audit.

   The lab's worst possible failure is telling the user to type a command
   and then rejecting it — she cannot tell whether she got it wrong or the
   lab did, and that doubt is exactly what she cannot afford in an exam.

   This harvests every literal command the learning material teaches and
   runs it through the real CLI. A command is allowed to work on ANY device
   type (a switch has no BGP; a router has no ethernet-switching), so it
   only fails when no device accepts it.

   Usage: node tests/coverage.js [--verbose]
   Exits non-zero if the lab rejects anything it teaches. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const order = ["core.js", "rank.js", "sound.js", "grammar.js", "cli.js", "engine.js", "ui.js",
  "planner.js", "juno.js", "scenarios.js", "protocols.js", "course.js", "mockexam.js", "ops.js", "notes.js"];
const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(__dirname, "shim.js"), "utf8"), ctx, { filename: "shim.js" });
for(const f of order)
  vm.runInContext(fs.readFileSync(path.join(root, "js", f), "utf8"), ctx, { filename: f });

const VERBOSE = process.argv.includes("--verbose");

/* A literal command starts with a Junos verb and carries no English filler
   and no placeholder. Everything else in these arrays is prose for a human. */
const VERB = /^(set|delete|show|run|edit|commit|rollback|annotate|activate|deactivate|insert|rename|copy|wildcard|replace|protect|save|load|top|up|exit|quit|status|configure|request|restart|clear|monitor|file|start|test|ping|traceroute)\b/;
const FILLER = /\b(the|a|an|from|across|through|both|your|until|before|after|with|on|in|into|it|its|then|and|or|to|that|this|each|any|side|again|first|next|one|two)\b/i;
const PLACEHOLDER = /[<>()…]|\.\.\.|\+/;

function isCommand(s){
  s = String(s || "").trim();
  if(!s || !VERB.test(s)) return false;
  if(PLACEHOLDER.test(s)) return false;
  if(FILLER.test(s.replace(/^\S+\s*/, ""))) return false;
  return true;
}

const taught = new Map();
function harvest(list, src){
  (list || []).forEach(row => {
    const c = Array.isArray(row) ? row[0] : row;
    if(isCommand(c) && !taught.has(String(c).trim())) taught.set(String(c).trim(), src);
  });
}
const GUIDES = vm.runInContext("PROTO_GUIDES", ctx);
GUIDES.forEach(g => {
  harvest(g.try, "guide:" + g.id + " try-it");
  harvest(g.cfg, "guide:" + g.id + " config");
  harvest(g.verify, "guide:" + g.id + " verify");
});

/* A bench with one of everything, so device-specific commands have a home. */
function bench(){
  return vm.runInContext(`(function(){
    wipeLab();
    var sw = makeSwitch(0, 0, 48, "EX4300-48T");
    var rt = makeRouter(400, 0);
    var h  = makeHost(0, 250);
    var sv = makeServer(200, 250);
    cable(h, "eth0", sw, "ge-0/0/1");
    cable(sv, "eth0", sw, "ge-0/0/2");
    cable(sw, "ge-0/0/47", rt, "ge-0/0/0");
    rebuildAllDerived();
    return { sw: sw, rt: rt };
  })()`, ctx);
}

function tryOn(devId, cmd){
  ctx.__cmd = cmd;
  ctx.__dev = devId;
  return vm.runInContext(`(function(){
    var d = devices[__dev];
    d.cli = freshCli();
    d.cli.stage = null;
    d.cli.mode = "op";
    var cfgWord = /^(set|delete|edit|commit|rollback|annotate|activate|deactivate|insert|rename|copy|wildcard|replace|protect|save|load|run|top|up|status|quit)\\b/;
    if(cfgWord.test(__cmd) || /^show\\s*\\|/.test(__cmd)) deviceExec(d, "configure");
    var out = deviceExec(d, __cmd).map(function(l){ return l.cls + "|" + l.text; }).join("\\n");
    return out;
  })()`, ctx);
}

const REJECTED = /unknown command|syntax error|is not a recognized/i;
const failures = [];
const ok = [];

for(const [cmd, src] of taught){
  const b = bench();
  let accepted = false, lastOut = "";
  for(const devId of [b.sw, b.rt]){
    let out = "";
    try{ out = tryOn(devId, cmd); }
    catch(e){ out = "err|threw: " + e.message; }
    lastOut = out;
    if(!REJECTED.test(out)){ accepted = true; break; }
  }
  if(accepted) ok.push(cmd);
  else failures.push([cmd, src, (lastOut.split("\n")[1] || lastOut.split("\n")[0] || "").slice(0, 100)]);
}

console.log("Teaching-coverage audit");
console.log("  literal commands taught : " + taught.size);
console.log("  accepted by the lab     : " + ok.length);
console.log("  REJECTED                : " + failures.length);
if(VERBOSE) ok.forEach(c => console.log("    ok  " + c));
if(failures.length){
  console.log("\nThe lab teaches these and then refuses them:");
  failures.forEach(([c, src, why]) => console.log("  " + c + "\n      " + src + "  ->  " + why));
  console.log("\nEither implement the command or correct the guide. Never ship this gap:");
  console.log("a learner cannot tell whether she typed it wrong or the lab is incomplete.");
  process.exit(1);
}
console.log("\nClean: every command the lab teaches, the lab accepts.");
