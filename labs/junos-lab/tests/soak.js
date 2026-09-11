#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const order = ["core.js", "sound.js", "grammar.js", "cli.js", "engine.js", "ui.js", "planner.js", "juno.js", "scenarios.js", "protocols.js", "course.js"];
const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(__dirname, "shim.js"), "utf8"), ctx, { filename: "shim.js" });
for(const f of order)
  vm.runInContext(fs.readFileSync(path.join(root, "js", f), "utf8"), ctx, { filename: f });

const ITER = parseInt(process.argv[2] || "30000", 10);
const STEP_MS = 250;

const script = `
(function(){
  const CMDS = [
    "configure", "exit", "commit", "rollback", "show interfaces terse", "show vlans",
    "show lacp interfaces", "show route", "show spanning-tree bridge", "show ospf neighbor",
    "show bgp summary", "show dhcp server binding", "show arp", "show system uptime",
    "set vlans staff vlan-id 10", "set vlans guest vlan-id 20",
    "set interfaces ge-0/0/0 unit 0 family ethernet-switching interface-mode access",
    "set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members staff",
    "set interfaces ge-0/0/7 unit 0 family ethernet-switching interface-mode trunk",
    "set interfaces ge-0/0/1 ether-options 802.3ad ae0",
    "set interfaces ae0 aggregated-ether-options lacp active",
    "set interfaces ae0 unit 0 family ethernet-switching",
    "set chassis aggregated-devices ethernet device-count 2",
    "set protocols rstp", "set protocols ospf area 0 interface ge-0/0/1.0",
    "set routing-options autonomous-system 65010",
    "set routing-options static route 0.0.0.0/0 next-hop 203.0.113.1",
    "set interfaces irb unit 10 family inet address 10.0.10.1/24",
    "set vlans staff l3-interface irb.10",
    "delete vlans staff", "delete protocols rstp", "delete interfaces ae0",
    "set interfaces ge-0/0/1 unit 0 family ethernet-switching port-mode access",
    "set vlans staff l3-interface vlan.10",
    "ping 10.0.10.1", "ping 8.8.8.8", "traceroute 10.0.0.1",
    "ip addr add 10.0.0.5/24 dev eth0", "dhclient eth0", "nameserver 10.0.10.1",
    "sh int te", "?", "help", "", "   ",
    "set", "set interfaces", "garbage command here", "int", "commit confirmed 1",
    "request system reboot", "edit interfaces ge-0/0/2", "top", "up", "run show vlans",
  ];
  const rnd = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rnd(a.length)];
  let devIds = [];
  const results = { iters: 0, execs: 0, worst: 0, errors: [] };

  const step = (i) => {
    const roll = rnd(100);
    devIds = devIds.filter(x => devices[x]);
    if(devIds.length > 40){
      deleteDevice(pick(devIds));
      devIds = devIds.filter(x => devices[x]);
      return;
    }
    if(roll < 6 || devIds.length === 0){
      const kind = rnd(4);
      const id = kind === 0 ? makeSwitch(rnd(900), rnd(600), 8)
        : kind === 1 ? makeRouter(rnd(900), rnd(600), 4)
        : kind === 2 ? makeHost(rnd(900), rnd(600))
        : makeServer(rnd(900), rnd(600));
      devIds.push(id);
      rebuildAllDerived();
    } else if(roll < 10 && devIds.length > 2){
      const id = pick(devIds);
      if(devices[id]){ deleteDevice(id); }
      devIds = devIds.filter(x => devices[x]);
    } else if(roll < 18 && devIds.length > 1){
      const a = devices[pick(devIds)], b = devices[pick(devIds)];
      if(a && b && a.id !== b.id){
        const pa = a.ports[rnd(a.ports.length)], pb = b.ports[rnd(b.ports.length)];
        if(pa && pb && !isLinked(a.id, pa.id) && !isLinked(b.id, pb.id)){
          links[uid("lk")] = { a: { dev: a.id, port: pa.id }, b: { dev: b.id, port: pb.id }, kind: "lan" };
          rebuildAllDerived();
        }
      }
    } else if(roll < 21){
      const lids = Object.keys(links);
      if(lids.length){ delete links[pick(lids)]; rebuildAllDerived(); }
    } else {
      const dev = devices[pick(devIds)];
      if(dev){
        const t0 = Date.now();
        deviceExec(dev, pick(CMDS));
        results.execs++;
        const dt = Date.now() - t0;
        if(dt > results.worst) results.worst = dt;
        if(dt > ${STEP_MS}) results.errors.push("iter " + i + ": command took " + dt + "ms");
      }
    }
    if(i % 500 === 0){
      renderObjectives && renderObjectives();
      PROTO_GUIDES.filter(g => g.ready).forEach(g => (g.prereqs || []).forEach(p => { p.test(); }));
    }
  };

  for(let i = 0; i < ${ITER}; i++){
    results.iters = i;
    try{ step(i); }
    catch(e){
      results.errors.push("iter " + i + ": " + (e && e.stack ? e.stack.split("\\n").slice(0, 3).join(" | ") : e));
      if(results.errors.length >= 10) break;
    }
  }
  return results;
})()
`;

const t0 = Date.now();
const res = vm.runInContext(script, ctx, { timeout: 120000 });
const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log("SOAK: " + (res.iters + 1) + " iterations, " + res.execs + " commands in " + secs + "s, worst single command " + res.worst + "ms, final device count " + vm.runInContext("Object.keys(devices).length", ctx));
if(res.errors.length){
  console.log("PROBLEMS FOUND:");
  res.errors.forEach(e => console.log("  - " + e));
  process.exit(1);
}
console.log("No crashes, no stuck commands. Steady as she goes.");
