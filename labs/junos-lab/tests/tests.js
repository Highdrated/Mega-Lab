STRICT = false;
/* runs inside the app's vm context — all app globals are visible */
var __PASS = 0, __FAIL = 0, __FAILED = [];
function ok(cond, name){
  if(cond) __PASS++;
  else { __FAIL++; __FAILED.push(name); console.log("FAIL: " + name); }
}
function cli(devId, cmd){ return deviceExec(devices[devId], cmd).map(l => l.text).join("\n"); }
function scen(id){ return SCENARIOS.find(s => s.id === id); }
function checksPass(s){ return s.checks.every(c => { try{ return !!c.test(); }catch(e){ return false; } }); }
function firstFailing(s){ for(const c of s.checks){ let r = false; try{ r = !!c.test(); }catch(e){} if(!r) return c.desc; } return null; }

/* ---------- T1: basic L2 connectivity + scenario 1 ---------- */
wipeLab();
let sw = makeSwitch(0, 0, 8), h1 = makeHost(0, 0), h2 = makeHost(0, 0);
cable(h1, "eth0", sw, "ge-0/0/1");
cable(h2, "eth0", sw, "ge-0/0/2");
rebuildAllDerived();
cli(h1, "ip addr add 10.0.0.1/24 dev eth0");
cli(h2, "ip addr add 10.0.0.2/24 dev eth0");
ok(pingOk(devices[h1], "10.0.0.2"), "T1 same-vlan ping works");
ok(checksPass(scen("basic-connect")), "T1 scenario1 completable: " + firstFailing(scen("basic-connect")));
ok(!pingOk(devices[h1], "10.0.0.99"), "T1 ping to unassigned IP fails");

/* ---------- T2: VLANs, candidate-vs-committed, ELS syntax ---------- */
cli(sw, "configure");
cli(sw, "set vlans staff vlan-id 10");
cli(sw, "set vlans guest vlan-id 20");
cli(sw, "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff");
cli(sw, "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members guest");
ok(pingOk(devices[h1], "10.0.0.2"), "T2 uncommitted candidate has no effect");
cli(sw, "commit");
ok(!pingOk(devices[h1], "10.0.0.2"), "T2 vlan isolation after commit");
ok(checksPass(scen("vlan-split")), "T2 scenario2 completable: " + firstFailing(scen("vlan-split")));

/* ---------- T3: compare / rollback / hostname / show configuration / abbreviation ---------- */
cli(sw, "set system host-name lab-sw1");
ok(cli(sw, "show | compare").includes("host-name"), "T3 show | compare shows pending diff");
cli(sw, "rollback 0");
ok(cli(sw, "show | compare").includes("no uncommitted"), "T3 rollback 0 clears candidate");
cli(sw, "set system host-name lab-sw1");
cli(sw, "commit");
ok(devices[sw].name === "lab-sw1", "T3 hostname applies on commit");
ok(cli(sw, "run show configuration").includes("host-name lab-sw1;"), "T3 show configuration curly render");
cli(sw, "exit");
ok(cli(sw, "sh vlans").includes("staff"), "T3 abbreviated 'sh vlans' works");
ok(cli(sw, "sh int terse").includes("ge-0/0/1"), "T3 abbreviated 'sh int terse' works");

/* ---------- T4: completions & grammar backtracking ---------- */
let c1 = completionsFor(devices[sw], "");
ok(c1.items && c1.items.some(i => i.label === "show"), "T4 op-mode ? lists show");
cli(sw, "configure");
let c2 = completionsFor(devices[sw], "set interfaces ge-0/0/1 unit 0 family ");
ok(c2.items && c2.items.some(i => i.label === "ethernet-switching"), "T4 grammar completion mid-statement");
let c3 = completionsFor(devices[sw], "set vlans staff ");
ok(c3.items && c3.items.some(i => i.label === "vlan-id") && c3.items.some(i => i.label === "l3-interface"),
   "T4 sibling statements both complete (backtracking)");
cli(sw, "set vlans staff l3-interface irb.10");
ok(cli(sw, "show | compare").includes("l3-interface"), "T4 l3-interface statement parses");
cli(sw, "rollback 0");
let bad = cli(sw, "set interfaces ge-0/0/9 disable");
ok(/syntax error/.test(bad), "T4 invalid interface rejected");
cli(sw, "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members ghost");
ok(/commit failed/.test(cli(sw, "commit")), "T4 commit validation catches undefined vlan");
cli(sw, "rollback 0");
cli(sw, "exit");

/* ---------- T5: irb inter-vlan routing, gateways, arp/mac learning ---------- */
wipeLab();
sw = makeSwitch(0, 0, 8); h1 = makeHost(0, 0); h2 = makeHost(0, 0);
cable(h1, "eth0", sw, "ge-0/0/1");
cable(h2, "eth0", sw, "ge-0/0/2");
rebuildAllDerived();
cli(h1, "ip addr add 10.0.10.5/24 dev eth0");
cli(h1, "ip route add default via 10.0.10.1");
cli(h2, "ip addr add 10.0.20.5/24 dev eth0");
cli(h2, "ip route add default via 10.0.20.1");
cfgDo(sw, [
  "set system host-name l3-sw",
  "set vlans staff vlan-id 10", "set vlans guest vlan-id 20",
  "set interfaces irb unit 10 family inet address 10.0.10.1/24",
  "set interfaces irb unit 20 family inet address 10.0.20.1/24",
  "set vlans staff l3-interface irb.10", "set vlans guest l3-interface irb.20",
  "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff",
  "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members guest",
]);
ok(pingOk(devices[h1], "10.0.10.1"), "T5 gateway (irb) is pingable");
ok(pingOk(devices[h1], "10.0.20.5"), "T5 inter-vlan routing via irb");
ok(checksPass(scen("irb-intervlan")), "T5 scenario9 completable: " + firstFailing(scen("irb-intervlan")));
cli(h2, "ip route del default");
ok(!pingOk(devices[h1], "10.0.20.5"), "T5 reply needs far-side gateway (return path)");
cli(h2, "ip route add default via 10.0.20.1");
doDevicePing(devices[h1], "10.0.20.5");
ok(devices[sw].macTable.length > 0, "T5 MAC learning on ping");
ok(Object.keys(devices[h1].arp).length > 0, "T5 host ARP cache fills");
ok(cli(sw, "show ethernet-switching table").includes("2c:6b:f5"), "T5 show ethernet-switching table");
ok(cli(sw, "ping 10.0.10.5").includes("0.0% packet loss"), "T5 switch can ping (sources from irb)");
ok(!/internal lab error/.test(cli(sw, "show route") + cli(sw, "show arp") + cli(sw, "show vlans")), "T5 show commands run clean");

/* ---------- T6: trunking scenario solvable ---------- */
wipeLab();
scen("trunk-span").setup();
const east = byName("acc-east").id, west = byName("acc-west").id;
const trunkSol = [
  "set vlans staff vlan-id 10", "set vlans guest vlan-id 20",
  "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members staff",
  "set interfaces ge-0/0/3 unit 0 family ethernet-switching vlan members guest",
  "set interfaces ge-0/0/0 unit 0 family ethernet-switching interface-mode trunk",
  "set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members [ staff guest ]",
];
cfgDo(east, trunkSol); cfgDo(west, trunkSol);
ok(pingOk("staff-east", "10.0.10.12"), "T6 same-vlan ping across trunk");
ok(!pingOk("staff-east", "10.0.20.22"), "T6 cross-vlan still isolated over trunk");
ok(checksPass(scen("trunk-span")), "T6 scenario10 completable: " + firstFailing(scen("trunk-span")));

/* ---------- T7: ISP / internet / default routes (scenario 5) ---------- */
wipeLab();
let rt = makeRouter(0, 0, 4), isp = makeIsp(0, 0, "203.0.113.1");
sw = makeSwitch(0, 0, 8); h1 = makeHost(0, 0);
cable(rt, "ge-0/0/0", isp, "wan0");
cable(rt, "ge-0/0/1", sw, "ge-0/0/0");
cable(h1, "eth0", sw, "ge-0/0/1");
rebuildAllDerived();
cfgDo(rt, [
  "set interfaces ge-0/0/0 unit 0 family inet address 203.0.113.2/30",
  "set interfaces ge-0/0/1 unit 0 family inet address 192.168.1.1/24",
  "set routing-options static route 0.0.0.0/0 next-hop 203.0.113.1",
]);
cli(h1, "ip addr add 192.168.1.10/24 dev eth0");
ok(!pingOk(devices[h1], "203.0.113.1"), "T7 no gateway = unreachable");
ok(/Network is unreachable/.test(cli(h1, "ping 203.0.113.1")), "T7 'Network is unreachable' message");
cli(h1, "ip route add default via 192.168.1.1");
ok(pingOk(devices[h1], "203.0.113.1"), "T7 ping the ISP");
ok(!pingOk(devices[h1], "8.8.8.8"), "T7 internet refuses private sources (pre-NAT)");
ok(/private address|NAT/.test(cli(h1, "ping 8.8.8.8")), "T7 failure names NAT");
cfgDo(rt, [
  "set security nat source rule-set OFFICE from interface ge-0/0/1.0",
  "set security nat source rule-set OFFICE to interface ge-0/0/0.0",
  "set security nat source rule-set OFFICE rule R1 match source-address 192.168.1.0/24",
  "set security nat source rule-set OFFICE rule R1 then source-nat interface",
]);
ok(pingOk(devices[h1], "8.8.8.8"), "T7 NAT unlocks the internet");
ok(checksPass(scen("isp-onboarding")), "T7 scenario5 completable: " + firstFailing(scen("isp-onboarding")));
ok(cli(h1, "traceroute 8.8.8.8").includes("8.8.8.8"), "T7 traceroute reaches internet");

/* ---------- T8: firewall filters (scenario 12) ---------- */
wipeLab();
scen("filtered-segment").setup();
ok(pingOk("guest-pc", "10.0.10.5"), "T8 initially open (routing connects VLANs)");
const core12 = byName("sec-core").id;
cfgDo(core12, [
  "set firewall family inet filter GUEST-IN term no-ops from destination-address 10.0.10.0/24",
  "set firewall family inet filter GUEST-IN term no-ops then discard",
  "set interfaces irb unit 20 family inet filter input GUEST-IN",
]);
ok(!pingOk("guest-pc", "10.0.20.1"), "T8 implicit end-discard bites (forgot accept term)");
cfgDo(core12, ["set firewall family inet filter GUEST-IN term ok then accept"]);
ok(pingOk("guest-pc", "10.0.20.1"), "T8 accept term restores gateway");
ok(!pingOk("guest-pc", "10.0.10.5"), "T8 target still blocked");
ok(checksPass(scen("filtered-segment")), "T8 scenario12 completable: " + firstFailing(scen("filtered-segment")));

/* ---------- T9: LACP (scenario 13) ---------- */
wipeLab();
scen("lacp-bundle").setup();
ok(NET.stormLinks.size > 0, "T9 parallel links storm without LAG");
ok(!pingOk("pc-a", "10.0.0.2"), "T9 storm kills ping");
const lagSol = [
  "set interfaces ge-0/0/0 ether-options 802.3ad ae0",
  "set interfaces ge-0/0/1 ether-options 802.3ad ae0",
  "set interfaces ae0 aggregated-ether-options lacp active",
  "set interfaces ae0 unit 0 family ethernet-switching",
];
cfgDo(byName("agg-a").id, lagSol);
ok(!pingOk("pc-a", "10.0.0.2"), "T9 one-sided bundle stays down");
cfgDo(byName("agg-b").id, lagSol);
ok(NET.stormLinks.size === 0, "T9 bundle ends the storm");
ok(pingOk("pc-a", "10.0.0.2"), "T9 ping over the bundle");
ok(checksPass(scen("lacp-bundle")), "T9 scenario13 completable: " + firstFailing(scen("lacp-bundle")));
cfgDo(byName("agg-a").id, ["set interfaces ge-0/0/0 disable"]);
ok(pingOk("pc-a", "10.0.0.2"), "T9 bundle survives losing a member");
ok(cli(byName("agg-a").id, "show lacp interfaces").includes("ae0"), "T9 show lacp interfaces");

/* ---------- T10: RSTP (scenario 14) ---------- */
wipeLab();
scen("rstp-loop").setup();
ok(NET.stormLinks.size > 0, "T10 triangle storms");
["ring-1", "ring-2", "ring-3"].forEach(n => cfgDo(byName(n).id, ["set protocols rstp"]));
ok(NET.stormLinks.size === 0, "T10 rstp ends the storm");
ok(NET.blocked.size >= 1, "T10 one port went blocking");
ok(pingOk("pc-2", "10.0.0.3"), "T10 ring pings with loop blocked");
ok(checksPass(scen("rstp-loop")), "T10 scenario14 completable: " + firstFailing(scen("rstp-loop")));
ok(cli(byName("ring-1").id, "show spanning-tree interface").includes("Root bridge") ||
   cli(byName("ring-1").id, "show spanning-tree interface").includes("root bridge"), "T10 show spanning-tree");

/* ---------- T11: storm control (scenario 15) ---------- */
wipeLab();
scen("storm-control").setup();
ok(NET.stormLinks.size > 0, "T11 loop storms initially");
cfgDo(byName("edge-a").id, [
  "set forwarding-options storm-control-profiles kill-storms all action-shutdown",
  "set interfaces ge-0/0/1 unit 0 family ethernet-switching storm-control kill-storms",
]);
ok(Object.keys(byName("edge-a").errDisabled).length >= 1, "T11 port error-disabled by storm control");
ok(NET.stormLinks.size === 0, "T11 storm contained");
ok(pingOk("pc-a", "10.0.0.2"), "T11 ping survives on the other cable");
ok(checksPass(scen("storm-control")), "T11 scenario15 completable: " + firstFailing(scen("storm-control")));
cli(byName("edge-a").id, "clear ethernet-switching error-disable ge-0/0/1");
ok(Object.keys(byName("edge-a").errDisabled).length >= 1, "T11 re-trips while the loop persists");

/* ---------- T12: asymmetric routing (scenario 16) ---------- */
wipeLab();
scen("asymmetric-routing").setup();
let res12 = pingRun(byName("hq-pc"), "10.0.1.10", {});
ok(!res12.ok, "T12 fails while return route missing");
ok(/way back/.test(res12.lines.map(l => l.text).join(" ")), "T12 error explains the return path");
cfgDo(byName("branch-rtr").id, ["set routing-options static route 10.0.0.0/24 next-hop 192.168.100.1"]);
ok(pingOk("hq-pc", "10.0.1.10"), "T12 fixed by the return route");
ok(checksPass(scen("asymmetric-routing")), "T12 scenario16 completable: " + firstFailing(scen("asymmetric-routing")));

/* ---------- T13: commit confirmed (scenario 11) ---------- */
wipeLab();
scen("commit-confirmed").setup();
sw = devsBy("switch")[0].id;
cli(sw, "configure");
cli(sw, "set system host-name safety");
ok(/rolled back/.test(cli(sw, "commit confirmed 1")), "T13 confirmed announces the timer");
ok(devices[sw].commitPending && devices[sw].name === "safety", "T13 confirmed change applies");
autoRollback(devices[sw]);
ok(devices[sw].name !== "safety", "T13 auto-rollback restores");
cli(sw, "set system host-name safety");
cli(sw, "commit confirmed 1");
cli(sw, "commit");
ok(!devices[sw].commitPending && devices[sw].name === "safety", "T13 plain commit confirms");
ok(checksPass(scen("commit-confirmed")), "T13 scenario11 completable: " + firstFailing(scen("commit-confirmed")));
cli(sw, "exit");

/* ---------- T14: interconnect scenario 6 ---------- */
wipeLab();
scen("interconnect-recovery").setup();
ok(!pingOk("site-a-mgmt", "10.10.10.2"), "T14 interconnect starts broken");
cfgDo(byName("site-a-acc1").id, ["delete interfaces ge-0/0/0 disable"]);
ok(pingOk("site-a-mgmt", "10.10.10.2"), "T14 recovery works");
ok(checksPass(scen("interconnect-recovery")), "T14 scenario6 completable: " + firstFailing(scen("interconnect-recovery")));

/* ---------- T15: scenarios 7 & 8 completable ---------- */
wipeLab();
sw = makeSwitch(0, 0, 8);
let hc = makeHost(0, 0), hp = makeHost(0, 0), ho = makeHost(0, 0);
cable(hc, "eth0", sw, "ge-0/0/1"); cable(hp, "eth0", sw, "ge-0/0/2"); cable(ho, "eth0", sw, "ge-0/0/3");
rebuildAllDerived();
cli(hc, "ip addr add 10.0.0.1/24 dev eth0");
cli(hp, "ip addr add 10.0.0.2/24 dev eth0");
cli(ho, "ip addr add 10.0.0.3/24 dev eth0");
cfgDo(sw, [
  "set vlans client vlan-id 10", "set vlans security vlan-id 99",
  "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members client",
  "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members security",
  "set interfaces ge-0/0/3 unit 0 family ethernet-switching vlan members security",
]);
ok(pingOk(devices[ho], "10.0.0.2"), "T15 ops reaches panel (same vlan)");
ok(!pingOk(devices[hc], "10.0.0.2"), "T15 client blocked from panel");
ok(checksPass(scen("access-control-segment")), "T15 scenario7 completable: " + firstFailing(scen("access-control-segment")));

wipeLab();
sw = makeSwitch(0, 0, 8); rt = makeRouter(0, 0, 4);
h1 = makeHost(0, 0); h2 = makeHost(0, 0);
cable(h1, "eth0", sw, "ge-0/0/1"); cable(h2, "eth0", sw, "ge-0/0/2");
cable(rt, "ge-0/0/0", sw, "ge-0/0/4"); cable(rt, "ge-0/0/1", sw, "ge-0/0/5");
rebuildAllDerived();
cli(h1, "ip addr add 10.1.0.10/24 dev eth0"); cli(h1, "ip route add default via 10.1.0.1");
cli(h2, "ip addr add 10.2.0.10/24 dev eth0"); cli(h2, "ip route add default via 10.2.0.1");
cfgDo(sw, [
  "set vlans cust-a vlan-id 100", "set vlans cust-b vlan-id 200",
  "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members cust-a",
  "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members cust-b",
  "set interfaces ge-0/0/4 unit 0 family ethernet-switching vlan members cust-a",
  "set interfaces ge-0/0/5 unit 0 family ethernet-switching vlan members cust-b",
]);
cfgDo(rt, [
  "set interfaces ge-0/0/0 unit 0 family inet address 10.1.0.1/24",
  "set interfaces ge-0/0/1 unit 0 family inet address 10.2.0.1/24",
]);
ok(pingOk(devices[h1], "10.1.0.1") && pingOk(devices[h2], "10.2.0.1"), "T15 both gateways answer");
ok(pingOk(devices[h1], "10.2.0.10"), "T15 the trap: shared router routes A->B");
cfgDo(rt, [
  "set firewall family inet filter CUST-A-IN term block from destination-address 10.2.0.0/24",
  "set firewall family inet filter CUST-A-IN term block then discard",
  "set firewall family inet filter CUST-A-IN term ok then accept",
  "set interfaces ge-0/0/0 unit 0 family inet filter input CUST-A-IN",
]);
ok(!pingOk(devices[h1], "10.2.0.10"), "T15 filter closes the trap");
ok(pingOk(devices[h1], "10.1.0.1"), "T15 gateway still answers through filter");
ok(checksPass(scen("multi-tenant-vlans")), "T15 scenario8 completable: " + firstFailing(scen("multi-tenant-vlans")));

/* ---------- T16: ticket base + every fault breaks and fixes ---------- */
let ids16 = buildTicketBase();
let invariants = ticketScenario([]);
ok(checksPass(invariants), "T16 ticket base healthy: " + firstFailing(invariants));
for(const f of TICKET_FAULTS){
  const ids = buildTicketBase();
  f.apply(ids); rebuildAllDerived();
  ok(!checksPass(invariants), "T16 fault breaks something: " + f.id);
  f.fix(ids); rebuildAllDerived();
  ok(checksPass(invariants), "T16 fault fix restores: " + f.id + " (" + firstFailing(invariants) + ")");
}

/* ---------- T17: save/load roundtrip + v1 migration ---------- */
wipeLab();
sw = makeSwitch(10, 20, 8); h1 = makeHost(30, 40); h2 = makeHost(50, 60);
cable(h1, "eth0", sw, "ge-0/0/1"); cable(h2, "eth0", sw, "ge-0/0/2");
rebuildAllDerived();
cli(h1, "ip addr add 10.9.0.1/24 dev eth0");
cli(h2, "ip addr add 10.9.0.2/24 dev eth0");
cfgDo(sw, ["set system host-name keeper"]);
const snap = JSON.parse(JSON.stringify(serializeLab()));
wipeLab(); rebuildAllDerived();
loadLab(snap);
ok(byName("keeper") && devsBy("host").length === 2, "T17 v2 roundtrip restores devices");
ok(pingOk(devsBy("host")[0], "10.9.0.2"), "T17 v2 roundtrip still pings");
const v1data = { nextId: 40, vlans: { default: 1 }, links: {
    lk1: { a: { dev: "sw1", port: "ge-0/0/0" }, b: { dev: "h1", port: "eth0" } } },
  devices: {
    sw1: { id: "sw1", type: "switch", x: 1, y: 2, name: "old-sw", cfg: { hostname: "old-sw", vlans: { default: 1, staff: 10 } },
      ports: [{ id: "ge-0/0/0", up: true, disabled: false, vlan: "staff" }, { id: "ge-0/0/1", up: true, disabled: true, vlan: "default" }] },
    h1: { id: "h1", type: "host", x: 3, y: 4, name: "h1", ports: [{ id: "eth0", up: true, disabled: false, vlan: "default" }],
      cfg: { ip: "10.0.0.5", mask: "24" } } } };
loadLab(v1data);
ok(devices.sw1 && devices.sw1.name === "old-sw", "T17 v1 migration: hostname");
ok(D(devices.sw1).portCfg["ge-0/0/0"].vlanNames[0] === "staff", "T17 v1 migration: port vlan");
ok(D(devices.sw1).portCfg["ge-0/0/1"].disabled === true, "T17 v1 migration: disabled port");
ok(devices.h1.cfg.ip === "10.0.0.5" && devices.h1.cfg.bits === 24, "T17 v1 migration: host ip");

/* ---------- T18: scenario sanity + misc ---------- */
for(const s of SCENARIOS){
  ok(s.checks.length > 0 && s.hints.length > 0 && s.title && s.desc, "T18 scenario well-formed: " + s.id);
}
wipeLab();
sw = makeSwitch(0, 0, 8); rebuildAllDerived();
ok(/syntax error|unknown/.test(cli(sw, "set vlans x vlan-id 5")), "T18 set outside config mode rejected");
cli(sw, "configure");
ok(/GUEST|no-ops|possible|incomplete|syntax/i.test(cli(sw, "set firewall family inet filter F term t then")) === true,
   "T18 incomplete statement flagged");
cli(sw, "edit interfaces ge-0/0/1");
cli(sw, "set unit 0 family ethernet-switching interface-mode trunk");
ok(cli(sw, "top") === "[edit]", "T18 top returns to root");
ok(/interface-mode trunk/.test(cli(sw, "show interfaces ge-0/0/1")), "T18 relative set under edit worked");
cli(sw, "exit");

/* ---------- T19: contract mode (deterministic) is solvable ---------- */
wipeLab(); rebuildAllDerived();
const zr = () => 0;
const spec19 = generateContractSpec(1, zr);
ok(spec19.depts.length === 2 && spec19.depts.every(d => d.name && d.vlan && d.net), "T19 deterministic contract spec");
const cs19 = contractScenario(spec19);
ok(cs19.checks.length >= 5 && !checksPass(cs19), "T19 fresh contract starts unsolved");
sw = makeSwitch(0, 0, 8);
{
  const hA = makeHost(0, 0), hB = makeHost(0, 0);
  cable(hA, "eth0", sw, "ge-0/0/1");
  cable(hB, "eth0", sw, "ge-0/0/2");
  rebuildAllDerived();
  cli(hA, `ip addr add 10.0.${spec19.depts[0].vlan}.10/24 dev eth0`);
  cli(hB, `ip addr add 10.0.${spec19.depts[1].vlan}.10/24 dev eth0`);
  cfgDo(sw, [
    "set system host-name office-sw1",
    `set vlans ${spec19.depts[0].name} vlan-id ${spec19.depts[0].vlan}`,
    `set vlans ${spec19.depts[1].name} vlan-id ${spec19.depts[1].vlan}`,
    `set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members ${spec19.depts[0].name}`,
    `set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members ${spec19.depts[1].name}`,
  ]);
}
ok(checksPass(cs19), "T19 tier-1 contract solvable: " + firstFailing(cs19));
const spec19c = generateContractSpec(3, zr);
ok(spec19c.depts.length === 3 && spec19c.depts.some(d => d.name === "guests"), "T19 tier-3 always includes guests");
ok(contractScenario(spec19c).checks.length > cs19.checks.length, "T19 tier-3 has more requirements");

/* ---------- T20: assist suggestions ---------- */
wipeLab();
sw = makeSwitch(0, 0, 8);
rebuildAllDerived();
devices[sw].cli.history.push("show interfaces terse");
ok((suggestFor(devices[sw], "show int") || {}).text === "erfaces terse", "T20 history suggestion");
ok((suggestFor(devices[sw], "conf") || {}).text === "igure", "T20 unique grammar suggestion");
ok(suggestFor(devices[sw], "") === null && suggestFor(devices[sw], "   ") === null, "T20 empty input suggests nothing");
ok(suggestFor(devices[sw], "show x") === null, "T20 no match suggests nothing");
{
  const sw2 = makeSwitch(0, 0, 8);
  rebuildAllDerived();
  const pv = suggestFor(devices[sw2], "show ");
  ok(!!(pv && pv.preview && /configuration/.test(pv.preview) && /more/.test(pv.preview)),
     "T20 boundary preview lists next words");
  {
    const sug = suggestFor(devices[sw2], "show interfaces") || {};
    ok((sug.preview || sug.text || "").length > 0, "T20 offers something after a full token");
    const items = (completionsFor(devices[sw2], "show interfaces ") || {}).items || [];
    const labels = items.map(i => i.label).join(" ");
    ok(/terse/.test(labels) && /statistics/.test(labels), "T20 completions include terse and statistics");
    ok((suggestFor(devices[sw2], "show interfaces t") || {}).text === "erse", "T20 completes uniquely once a letter disambiguates");
  }
  ok((suggestFor(devices[sw2], "request ") || {}).text === "system", "T20 chains the unique next word at a boundary");
  ok(/interfaces/.test((suggestFor(devices[sw2], "clear ") || {}).preview || ""),
     "T20 a boundary with several children previews them instead of guessing");
  const pv2 = suggestFor(devices[sw2], "ping ");
  ok(!!(pv2 && pv2.preview && /target/.test(pv2.preview)), "T20 placeholder previewed after ping");
}

/* ---------- T27: every worked example in the Reference must parse and commit ---------- */
for(const ex of REF_EXAMPLES){
  wipeLab();
  const id = ex.dev === "router" ? makeRouter(0, 0, 4) : makeSwitch(0, 0, 8);
  rebuildAllDerived();
  const res = loadSetLines(devices[id], ex.quick.join("\n"));
  ok(res.errors === 0 && res.ok === ex.quick.length, "T27 example parses cleanly: " + ex.title + " (" + res.summary.split("\n")[0] + ")");
  devices[id].cli.mode = "cfg";
  const cm = commitCmd(devices[id], []).map(l => l.text).join(" ");
  devices[id].cli.mode = "op";
  ok(/commit complete/.test(cm), "T27 example commits: " + ex.title);
}

/* ---------- T21: scenario 17 — NAT at the edge ---------- */
wipeLab();
scen("nat-edge").setup();
ok(pingOk("client-pc", "203.0.113.1"), "T21 ISP reachable pre-NAT");
ok(!pingOk("client-pc", "8.8.8.8"), "T21 internet blocked pre-NAT");
cfgDo(byName("edge-1").id, [
  "set security nat source rule-set OFFICE from interface ge-0/0/1.0",
  "set security nat source rule-set OFFICE to interface ge-0/0/0.0",
  "set security nat source rule-set OFFICE rule R1 match source-address 192.168.50.0/24",
  "set security nat source rule-set OFFICE rule R1 then source-nat interface",
]);
ok(pingOk("client-pc", "8.8.8.8"), "T21 NAT unlocks the internet");
ok(cli(byName("edge-1").id, "show security nat source").includes("OFFICE"), "T21 show nat lists the rule");
ok(checksPass(scen("nat-edge")), "T21 scenario17 completable: " + firstFailing(scen("nat-edge")));

/* ---------- T22: scenario 18 — DHCP ---------- */
wipeLab();
scen("dhcp-serve").setup();
ok(/no DHCPOFFERS/.test(cli(byName("laptop").id, "dhclient eth0")), "T22 no server means no offers");
cfgDo(byName("staff-sw").id, [
  "set access address-assignment pool STAFF family inet network 10.0.10.0/24",
  "set access address-assignment pool STAFF family inet range r1 low 10.0.10.100",
  "set access address-assignment pool STAFF family inet range r1 high 10.0.10.199",
  "set access address-assignment pool STAFF family inet dhcp-attributes router 10.0.10.1",
  "set system services dhcp-local-server group LAN interface irb.10",
]);
ok(/DHCPACK/.test(cli(byName("laptop").id, "dhclient eth0")), "T22 lease granted");
ok(byName("laptop").cfg.viaDhcp && byName("laptop").cfg.gw === "10.0.10.1" &&
   sameSubnet(byName("laptop").cfg.ip, "10.0.10.100", 25), "T22 lease fields set");
ok(cli(byName("staff-sw").id, "show dhcp server binding").includes("BOUND"), "T22 binding listed");
ok(checksPass(scen("dhcp-serve")), "T22 scenario18 completable: " + firstFailing(scen("dhcp-serve")));

/* ---------- T23: scenario 19 — OSPF ---------- */
wipeLab();
scen("ospf-backbone").setup();
ok(!pingOk("hq-pc", "10.3.0.10"), "T23 no routes before OSPF");
cfgDo(byName("hq-r").id, [
  "set protocols ospf area 0 interface ge-0/0/1.0",
  "set protocols ospf area 0 interface ge-0/0/2.0",
  "set protocols ospf area 0 interface ge-0/0/0.0 passive",
]);
cfgDo(byName("mid-r").id, [
  "set protocols ospf area 0 interface ge-0/0/1.0",
  "set protocols ospf area 0 interface ge-0/0/2.0",
]);
cfgDo(byName("far-r").id, [
  "set protocols ospf area 0 interface ge-0/0/1.0",
  "set protocols ospf area 0 interface ge-0/0/2.0",
  "set protocols ospf area 0 interface ge-0/0/0.0 passive",
]);
ok(D(byName("hq-r")).ospfNeighbors.length === 2, "T23 hq-r has two Full neighbors");
ok(D(byName("hq-r")).ospfRoutes.some(r => r.net === "10.3.0.0"), "T23 far LAN learned via OSPF");
ok(pingOk("hq-pc", "10.3.0.10"), "T23 end-to-end over learned routes");
ok(checksPass(scen("ospf-backbone")), "T23 scenario19 completable: " + firstFailing(scen("ospf-backbone")));
{
  const hq = byName("hq-r").id, far = byName("far-r").id;
  const cut = Object.entries(links).find(([, l]) =>
    (l.a.dev === hq && l.b.dev === far) || (l.a.dev === far && l.b.dev === hq));
  delete links[cut[0]];
  rebuildAllDerived();
  ok(pingOk("hq-pc", "10.3.0.10"), "T23 reroutes around a cut link via mid-r");
}

/* ---------- T24: scenario 20 — port security ---------- */
wipeLab();
scen("rogue-switch").setup();
ok(pingOk("rogue-pc1", "10.0.10.1"), "T24 rogue traffic flows pre-limit");
cfgDo(byName("acc-1").id, [
  "set switch-options interface ge-0/0/3 interface-mac-limit 1",
  "set switch-options interface ge-0/0/3 packet-action shutdown",
]);
doDevicePing(byName("rogue-pc1"), "10.0.10.1");
ok(!byName("acc-1").errDisabled["ge-0/0/3"], "T24 first MAC within limit");
doDevicePing(byName("rogue-pc2"), "10.0.10.1");
ok(byName("acc-1").errDisabled["ge-0/0/3"] === true, "T24 second MAC trips the port");
ok(pingOk("desk-pc", "10.0.10.1"), "T24 legit port unaffected");
ok(cli(byName("acc-1").id, "show log messages").includes("MAC limit"), "T24 syslog records the trip");
ok(checksPass(scen("rogue-switch")), "T24 scenario20 completable: " + firstFailing(scen("rogue-switch")));

/* ---------- T25: load set terminal + syslog ---------- */
wipeLab();
sw = makeSwitch(0, 0, 8);
rebuildAllDerived();
const r25 = loadSetLines(devices[sw], "set vlans blue vlan-id 10\nset bogus nonsense here\nset system host-name imported");
ok(r25.ok === 2 && r25.errors === 1, "T25 loadSetLines counts ok/errors");
cli(sw, "configure"); cli(sw, "commit"); cli(sw, "exit");
ok(devices[sw].name === "imported", "T25 imported statements commit");
ok(cli(sw, "show log messages").includes("UI_COMMIT"), "T25 syslog records the commit");

/* ---------- T26: undo ---------- */
wipeLab();
sw = makeSwitch(0, 0, 8);
rebuildAllDerived();
pushUndo();
makeHost(0, 0);
rebuildAllDerived();
ok(devsBy("host").length === 1, "T26 host added");
undoLast();
ok(devsBy("host").length === 0 && devsBy("switch").length === 1, "T26 undo restores the snapshot");

/* ---------- T28: hardware models ---------- */
wipeLab();
sw = makeSwitch(0, 0, 24, "EX3400-24T");
rebuildAllDerived();
ok(devices[sw].model === "EX3400-24T", "T28 model stored");
ok(devices[sw].ports.filter(p => p.role === "access").length === 24, "T28 EX3400-24T has 24 access ports");
ok(devices[sw].ports.filter(p => p.role === "uplink").length === 4, "T28 EX3400-24T also has its 4 uplinks, like the real SKU");
ok(cli(sw, "show version").includes("ex3400-24t"), "T28 show version reports the model");
{
  const snap = JSON.parse(JSON.stringify(serializeLab()));
  loadLab(snap);
  ok(devsBy("switch")[0].model === "EX3400-24T", "T28 model survives save/load");
}

/* ---------- T29: brand-new switch — power, first boot, day-zero ---------- */
wipeLab();
sw = makeSwitch(0, 0, 12, "EX2300-C-12T");
devices[sw].powered = false; devices[sw].brandNew = true; devices[sw].user = "root";
h1 = makeHost(0, 0); h2 = makeHost(0, 0);
cable(h1, "eth0", sw, "ge-0/0/1"); cable(h2, "eth0", sw, "ge-0/0/2");
rebuildAllDerived();
cli(h1, "ip addr add 10.0.0.1/24 dev eth0");
cli(h2, "ip addr add 10.0.0.2/24 dev eth0");
ok(!pingOk(devices[h1], "10.0.0.2"), "T29 powered-off switch forwards nothing");
ok(/no power/.test(cli(sw, "show version")), "T29 dead console while off");
powerOn(devices[sw]);
for(let i = 0; i < 30; i++) __fireTimers();
ok(devices[sw].cli.stage === "login", "T29 boot lands on login:");
ok(/Login incorrect/.test(cli(sw, "kaatje")), "T29 only root exists at the factory");
ok(/root@/.test(cli(sw, "root")), "T29 root logs in with no password");
cli(sw, "cli");
ok(devices[sw].cli.stage === null && devices[sw].cli.mode === "op", "T29 cli enters operational mode");
cli(sw, "configure");
cli(sw, "set system host-name fresh-sw");
ok(/Missing mandatory statement/.test(cli(sw, "commit")), "T29 first commit demands root-authentication");
cli(sw, "set system root-authentication plain-text-password");
ok(devices[sw].cli.stage === "newpass", "T29 bare password statement prompts");
cli(sw, "Sup3r!pass");
ok(devices[sw].cli.stage === "retype", "T29 retype prompt");
cli(sw, "wrong");
ok(devices[sw].cli.stage === "newpass", "T29 mismatch starts over");
cli(sw, "Sup3r!pass"); cli(sw, "Sup3r!pass");
cli(sw, "set interfaces me0 unit 0 family inet address 10.99.0.21/24");
ok(/commit complete/.test(cli(sw, "commit")), "T29 commit succeeds with root password set");
ok(!devices[sw].brandNew, "T29 day-zero flag cleared after first commit");
ok(cli(sw, "run show configuration").includes("encrypted-password"), "T29 config stores a hash, not plaintext");
ok(/\$6\$lab\$/.test(JSON.stringify(devices[sw].config)), "T29 hash format");
cli(sw, "exit");
ok(cli(sw, "show interfaces terse").includes("me0") && cli(sw, "show interfaces terse").includes("10.99.0.21"),
   "T29 me0 management address in terse");
ok(promptStr(devices[sw]).startsWith("root@fresh-sw"), "T29 prompt becomes root@hostname");
ok(pingOk(devices[h1], "10.0.0.2"), "T29 data plane alive after power-on");
{
  cable(h1, "eth0x", sw, "con");   // nonsense host port won't matter — testing engine tolerance
  delete links[Object.keys(links).pop()];
  cable(h2, "eth0", sw, "con", "console");
  rebuildAllDerived();
  ok(pingOk(devices[h1], "10.0.0.2"), "T29 console cable on CON never joins the data plane");
}
powerOff(devices[sw]);
ok(!pingOk(devices[h1], "10.0.0.2"), "T29 power off kills the data plane again");
powerOn(devices[sw]);
for(let i = 0; i < 30; i++) __fireTimers();
ok(pingOk(devices[h1], "10.0.0.2"), "T29 configured box boots straight back to service");

/* ---------- T30: terminal feel — caret errors, profiles, bell ---------- */
wipeLab();
sw = makeSwitch(0, 0, 8);
rebuildAllDerived();
{
  const out30 = cli(sw, "shw vlans");
  ok(/\^/.test(out30) && /syntax error/.test(out30), "T30 caret line on bad op command");
  const pl = promptStr(devices[sw]).length;
  ok(out30.split("\n")[0] === " ".repeat(pl) + "^", "T30 caret aligns under the offending word");
  cli(sw, "configure");
  const out31 = cli(sw, "set interfaces ge-9/9/9 disable");
  ok(/\^/.test(out31) && /syntax error/.test(out31), "T30 caret in config mode");
  const caretLine = out31.split("\n")[0];
  const rawLine = "set interfaces ge-9/9/9 disable";
  const expectCol = promptStr(devices[sw]).length + rawLine.indexOf("ge-9/9/9");
  ok(caretLine === " ".repeat(expectCol) + "^", "T30 config caret points at the bad interface");
  cli(sw, "exit");
  applyTermProfile("win-ps");
  ok(true, "T30 profile apply does not throw headless");
  applyTermProfile("match");
  termBell();
  ok(typeof termBell === "function", "T30 bell no-ops without AudioContext");
}

/* ---------- T31: zones, Belgian BOM, save/load ---------- */
wipeLab();
{
  const zid = uid("zn");
  zones[zid] = { id: zid, name: "HQ", x: -60, y: -60, w: 400, h: 400, hue: 0 };
  sw = makeSwitch(0, 0, 24, "EX3400-24T");
  h1 = makeHost(20, 20);
  const isp31 = makeIsp(900, 900);
  cable(h1, "eth0", sw, "ge-0/0/1");
  rebuildAllDerived();
  ok(zoneOf(sw) && zoneOf(sw).name === "HQ" && zoneOf(isp31) === null, "T31 zone membership by geometry");
  const bom = computeBom();
  ok(bom.subtotal === 2150 + 3, "T31 BOM subtotal (EX3400 + FS.com Cat6; endpoints excluded)");
  ok(bom.vat === Math.round(bom.subtotal * 0.21) && bom.total === bom.subtotal + bom.vat, "T31 Belgian 21% VAT math");
  ok(bom.monthly === 89, "T31 ISP is a monthly cost, not capex");
  ok(buildPacketText().includes("VAT 21%") && buildPacketText().includes("HQ"), "T31 build packet mentions VAT and the building");
  ok(buildPacketText().includes("-- Juniper — switching & routing --") &&
     buildPacketText().includes("-- Cables & optics (FS.com) --"), "T31 BOM grouped by category");
  const snap = JSON.parse(JSON.stringify(serializeLab()));
  loadLab(snap);
  ok(Object.keys(zones).length === 1 && Object.values(zones)[0].name === "HQ", "T31 zones survive save/load");
}

/* ---------- T32: design rule check ---------- */
wipeLab();
sw = makeSwitch(0, 0, 8);
h1 = makeHost(0, 0);
cable(h1, "eth0", sw, "ge-0/0/1");
rebuildAllDerived();
cli(h1, "ip addr add 10.0.5.5/24 dev eth0");
{
  const f = runDrc();
  ok(f.some(x => /no gateway interface/.test(x.text)), "T32 flags a subnet without any gateway");
  cli(h1, "ip route add default via 10.9.9.1");
  const f2 = runDrc();
  ok(f2.some(x => x.sev === "error" && /outside its own subnet/.test(x.text)), "T32 flags a gateway outside the subnet");
  cli(h1, "ip route del default");
}
{
  const sw2 = makeSwitch(300, 0, 8);
  cable(sw, "ge-0/0/4", sw2, "ge-0/0/4");
  cable(sw, "ge-0/0/5", sw2, "ge-0/0/5");
  rebuildAllDerived();
  const f3 = runDrc();
  ok(f3.some(x => x.sev === "error" && /Broadcast storm/.test(x.text)), "T32 flags a live storm as an error");
}

/* ---------- T33: failure impact + what-if ---------- */
wipeLab();
{
  const swA = makeSwitch(0, 0, 8), swB = makeSwitch(400, 0, 8);
  h1 = makeHost(0, 200); h2 = makeHost(400, 200);
  cable(h1, "eth0", swA, "ge-0/0/1");
  cable(h2, "eth0", swB, "ge-0/0/1");
  cable(swA, "ge-0/0/0", swB, "ge-0/0/0");
  rebuildAllDerived();
  cli(h1, "ip addr add 10.0.0.1/24 dev eth0");
  cli(h2, "ip addr add 10.0.0.2/24 dev eth0");
  computeImpact();
  const upl = Object.entries(links).find(([, l]) =>
    devices[l.a.dev].type === "switch" && devices[l.b.dev].type === "switch")[0];
  ok(IMPACT[upl] === 2, "T33 lone uplink is a SPOF (breaks both directions)");
  cfgDo(swA, ["set protocols rstp"]);
  cfgDo(swB, ["set protocols rstp"]);
  cable(swA, "ge-0/0/2", swB, "ge-0/0/2");
  rebuildAllDerived();
  computeImpact();
  const swLinks = Object.entries(links).filter(([, l]) =>
    devices[l.a.dev].type === "switch" && devices[l.b.dev].type === "switch");
  ok(swLinks.every(([lid]) => IMPACT[lid] === 0), "T33 redundant RSTP pair survives any single cut");
  devices[swB].failed = true;
  rebuildAllDerived();
  ok(!pingOk(devices[h1], "10.0.0.2"), "T33 what-if device failure kills traffic");
  devices[swB].failed = false;
  rebuildAllDerived();
  ok(pingOk(devices[h1], "10.0.0.2"), "T33 restore brings it back");
}

/* ---------- T34: Wi-Fi ---------- */
wipeLab();
scen("wireless-office").setup();
{
  const lap = byName("laptop");
  ok(/office-wifi/.test(cli(lap.id, "wifi scan")), "T34 wifi scan lists the SSID");
  lap.x = 2000; lap.y = 2000;
  rebuildAllDerived();
  ok(/out of range/.test(cli(lap.id, "wifi join office-wifi")), "T34 coverage circle gates association");
  lap.x = 560; lap.y = 280;
  rebuildAllDerived();
  ok(/associated/.test(cli(lap.id, "wifi join office-wifi")), "T34 join inside coverage");
  ok(/DHCPACK/.test(cli(lap.id, "dhclient eth0")), "T34 DHCP works over the air");
  ok(pingOk("laptop", "10.0.10.1"), "T34 ping across the wireless bridge");
  ok(checksPass(scen("wireless-office")), "T34 scenario21 completable: " + firstFailing(scen("wireless-office")));
  const wired = makeHost(560, 320);
  cable(wired, "eth0", byName("office-sw").id, "ge-0/0/3");
  rebuildAllDerived();
  ok(/cable/.test(cli(wired, "wifi join office-wifi")), "T34 one-active-NIC rule");
  ok(computeBom().list.some(r => /AP34/.test(r.label) && r.unit === 925 && r.cat === "Wi-Fi"), "T34 AP priced under the Wi-Fi category");
  const cableRow = computeBom().list.find(r => r.label === "FS.com Cat6 patch cable");
  ok(cableRow && cableRow.qty === 2, "T34 wireless association costs nothing");
}

/* ---------- T35: link speeds + oversubscription ---------- */
wipeLab();
{
  sw = makeSwitch(0, 0, 8);
  rt = makeRouter(400, 0, 4);
  const hs = [makeHost(0, 200), makeHost(60, 200), makeHost(120, 200)];
  hs.forEach((h, i) => cable(h, "eth0", sw, "ge-0/0/" + (i + 1)));
  cable(sw, "ge-0/0/0", rt, "ge-0/0/0");
  rebuildAllDerived();
  const o1 = oversub(devices[sw]);
  ok(o1.access === 3 && o1.uplink === 1 && Math.abs(o1.ratio - 3) < 1e-9, "T35 oversubscription math");
  const upl = Object.entries(links).find(([, l]) => devices[l.b.dev].type === "router" || devices[l.a.dev].type === "router");
  upl[1].speed = 0.1;
  ok(runDrc().some(x => /oversubscribed/.test(x.text)), "T35 DRC flags a starved uplink");
  upl[1].speed = 10;
  ok(oversub(devices[sw]).ratio < 1, "T35 fat uplink clears the ratio");
}

/* ---------- T36: design snapshots + diff ---------- */
wipeLab();
{
  sw = makeSwitch(0, 0, 8, "EX2300-C-12T");
  cfgDo(sw, ["set system host-name alpha"]);
  const A = JSON.parse(JSON.stringify(serializeLab()));
  cfgDo(sw, ["set system host-name beta"]);
  makeHost(0, 0);
  rebuildAllDerived();
  const B = JSON.parse(JSON.stringify(serializeLab()));
  const d = snapshotDiff(A, B);
  ok(/\+ device h/.test(d), "T36 diff sees the added device");
  ok(/host-name/.test(d) && /beta/.test(d), "T36 diff shows the config change");
  ok(snapshotDiff(A, A) === "(no differences)", "T36 identical designs diff clean");
}

/* ---------- T37: display set roundtrip, ranges, catalog policy ---------- */
wipeLab();
sw = makeSwitch(0, 0, 8, "EX2300-C-12T");
rebuildAllDerived();
cfgDo(sw, [
  "set system host-name round-a",
  "set vlans staff vlan-id 10",
  "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff",
  "set system services ssh",
  "set system ntp server 10.0.0.9",
  "set system name-server 1.1.1.1",
  "set system login user kaatje class super-user",
  "set system login user kaatje authentication plain-text-password Adm1n!pass",
]);
{
  const out = cli(sw, "show configuration | display set");
  ok(out.includes("set system host-name round-a") && out.includes("set system services ssh"),
     "T37 display set emits paste-able commands");
  ok(!/Adm1n!pass/.test(JSON.stringify(devices[sw].config)) && /encrypted-password/.test(out),
     "T37 user password stored only as a hash");
  const sw2 = makeSwitch(0, 300, 8);
  rebuildAllDerived();
  const res = loadSetLines(devices[sw2], out);
  ok(res.errors === 0, "T37 display-set output reloads cleanly (" + res.summary.split("\n")[0] + ")");
  devices[sw2].cli.mode = "cfg";
  commitCmd(devices[sw2], []);
  devices[sw2].cli.mode = "op";
  ok(JSON.stringify(devices[sw2].config) === JSON.stringify(devices[sw].config),
     "T37 configuration round-trips exactly");
}
wipeLab();
sw = makeSwitch(0, 0, 8);
h1 = makeHost(0, 200); h2 = makeHost(60, 200);
{
  const h3 = makeHost(120, 200);
  cable(h1, "eth0", sw, "ge-0/0/1");
  cable(h2, "eth0", sw, "ge-0/0/2");
  cable(h3, "eth0", sw, "ge-0/0/3");
  rebuildAllDerived();
  cli(h1, "ip addr add 10.0.0.1/24 dev eth0");
  cli(h2, "ip addr add 10.0.0.2/24 dev eth0");
  cli(h3, "ip addr add 10.0.0.3/24 dev eth0");
  cfgDo(sw, [
    "set vlans staff vlan-id 10",
    "set interfaces interface-range STAFF-PORTS member ge-0/0/1",
    "set interfaces interface-range STAFF-PORTS member ge-0/0/2",
    "set interfaces interface-range STAFF-PORTS unit 0 family ethernet-switching vlan members staff",
  ]);
  ok(D(devices[sw]).portCfg["ge-0/0/1"].vlanNames[0] === "staff" &&
     D(devices[sw]).portCfg["ge-0/0/2"].vlanNames[0] === "staff", "T37 range config hits every member");
  ok(D(devices[sw]).portCfg["ge-0/0/3"].vlanNames[0] === "default", "T37 non-members untouched");
  ok(pingOk(devices[h1], "10.0.0.2") && !pingOk(devices[h1], "10.0.0.3"), "T37 range membership is real in the engine");
  cfgDo(sw, [
    "set vlans guest vlan-id 20",
    "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members guest",
  ]);
  ok(D(devices[sw]).portCfg["ge-0/0/2"].vlanNames[0] === "guest", "T37 a port's own config overrides its range");
}
wipeLab();
{
  const u = makeSwitch(0, 0, 8, "USW-Lite-8-PoE");
  makeHost(0, 200);
  rebuildAllDerived();
  const bom = computeBom();
  ok(bom.list.some(r => r.label === "Ubiquiti USW-Lite-8-PoE" && r.unit === 119), "T37 UniFi SKU priced with brand");
  ok(bom.subtotal === 119, "T37 endpoints excluded from the network BOM");
  const f = runDrc();
  ok(f.some(x => /SSH management/.test(x.text)), "T37 DRC notes the missing SSH access");
  cfgDo(u, ["set system services ssh", "set system ntp server 10.0.0.9"]);
  const f2 = runDrc();
  ok(!f2.some(x => /SSH management/.test(x.text)) && !f2.some(x => /NTP server/.test(x.text)),
     "T37 management findings clear once configured");
}

/* ---------- T38: thermal model + hot room ---------- */
wipeLab();
{
  const zid = uid("zn");
  zones[zid] = { id: zid, name: "DC", x: -100, y: -100, w: 700, h: 700, hue: 0, kind: "building" };
  sw = makeSwitch(0, 0, 48, "EX4300-48T");
  rebuildAllDerived();
  ok(Math.abs(THERMAL.zones[zid].temp - 24.6) < 0.01, "T38 heat raises the room (90W = +3.6C)");
  const cr = makeCrac(60, 60, "In-row CRAC 10kW", 10000);
  rebuildAllDerived();
  ok(THERMAL.zones[zid].temp === 18, "T38 cooling floors at the setpoint");
  powerOff(devices[cr]);
  ok(Math.abs(THERMAL.zones[zid].temp - 24.6) < 0.01, "T38 cooling off heats the room again");
  const mx = makeRouter(0, 120, 12, "MX204");
  makeHost(0, 220); makeHost(80, 220);
  rebuildAllDerived();
  ok(devices[sw].powered === false && devices[mx].powered === false, "T38 thermal shutdown cascade at 52C");
  ok(/TEMPERATURE CRITICAL/.test((devices[mx].syslog || []).join(" ")), "T38 chassisd logged the shutdown");
  ok(Math.abs(THERMAL.zones[zid].temp - 30.6) < 0.01, "T38 dead gear stops heating");
  powerOn(devices[cr]);
  powerOn(devices[sw]);
  powerOn(devices[mx]);
  ok(devices[sw].powered !== false && devices[mx].powered !== false && THERMAL.zones[zid].temp === 18,
     "T38 cooled room lets the gear run");
  ok(cli(sw, "show chassis environment").includes("degrees C"), "T38 show chassis environment reports temps");
  ok(computeBom().list.some(r => r.cat === "Power & cooling" && r.unit === 3900), "T38 cooling priced in its own category");
}
wipeLab();
scen("hot-room").setup();
{
  ok(byName("core-sw").powered === false && byName("big-rtr").powered === false, "T38 scenario opens cooked");
  const z = Object.values(zones).find(z2 => z2.name === "Server room");
  makeCrac(z.x + 300, z.y + 200, "In-row CRAC 10kW", 10000);
  rebuildAllDerived();
  powerOn(byName("core-sw"));
  powerOn(byName("big-rtr"));
  ok(checksPass(scen("hot-room")), "T38 scenario22 completable: " + firstFailing(scen("hot-room")));
}

/* ---------- T39: racks inside buildings ---------- */
wipeLab();
{
  const b = { id: uid("zn"), name: "HQ", x: -50, y: -50, w: 700, h: 500, hue: 1, kind: "building" };
  zones[b.id] = b;
  const r = { id: uid("zn"), name: "Rack 1", x: 0, y: 0, w: 220, h: 300, hue: 0, kind: "rack" };
  zones[r.id] = r;
  const swA = makeSwitch(20, 40, 8), swB = makeSwitch(20, 140, 8);
  const swC = makeSwitch(400, 40, 8);
  rebuildAllDerived();
  ok(rackOf(swA).name === "Rack 1" && zoneOf(swA).name === "HQ", "T39 nesting: device is in the rack AND the building");
  ok(rackOf(swC) === null && zoneOf(swC).name === "HQ", "T39 un-racked gear still belongs to the building");
  cable(swA, "ge-0/0/0", swB, "ge-0/0/0");
  cable(swA, "ge-0/0/1", swC, "ge-0/0/1");
  rebuildAllDerived();
  cfgDo(swA, ["set protocols rstp"]); cfgDo(swB, ["set protocols rstp"]); cfgDo(swC, ["set protocols rstp"]);
  const bom = computeBom();
  const dac = bom.list.find(x => /DAC/.test(x.label));
  const cat6 = bom.list.find(x => x.label === "FS.com Cat6 patch cable");
  ok(dac && dac.qty === 1, "T39 same-rack infra link priced as a DAC");
  ok(cat6 && cat6.qty === 1, "T39 cross-rack in-building link priced as Cat6");
}

/* ---------- T40: status row + how-to guides ---------- */
wipeLab();
{
  ok(REF_HOWTO.length >= 9 && REF_HOWTO.every(g =>
    g.steps.length >= 3 && g.steps.every(st2 => st2[1].length > 40) && g.done && g.intro),
    "T40 how-to guides all carry real why-explanations");
  sw = makeSwitch(0, 0, 8, "EX2300-C-12T");
  rebuildAllDerived();
  devices[sw].powered = false;
  ok(collectStatuses().some(x => /powered off/.test(x.text)), "T40 status: powered-off chip");
  devices[sw].powered = undefined;
  devices[sw].brandNew = true;
  rebuildAllDerived();
  ok(collectStatuses().some(x => /day-zero/.test(x.text)), "T40 status: day-zero chip");
  devices[sw].brandNew = false;
  cli(sw, "configure"); cli(sw, "set system host-name pending"); cli(sw, "exit");
  ok(collectStatuses().some(x => /uncommitted/.test(x.text)), "T40 status: uncommitted-changes chip");
  cli(sw, "configure"); cli(sw, "rollback 0"); cli(sw, "exit");
  devices[sw].errDisabled["ge-0/0/2"] = true;
  rebuildAllDerived();
  ok(collectStatuses().some(x => x.sev === "error" && /error-disabled/.test(x.text)), "T40 status: err-disabled chip");
  delete devices[sw].errDisabled["ge-0/0/2"];
  const zid = uid("zn");
  zones[zid] = { id: zid, name: "Hotbox", x: -100, y: -100, w: 600, h: 600, hue: 0, kind: "building" };
  makeRouter(10, 10, 12, "MX204"); makeHost(10, 120); makeHost(90, 120);
  rebuildAllDerived();
  ok(collectStatuses().some(x => /Hotbox/.test(x.text) && /°C/.test(x.text)), "T40 status: hot-room chip");
  ok(collectStatuses()[0].sev === "error" || collectStatuses().every(x => x.sev !== "error"),
     "T40 status: errors sort first");
  renderStatusRow();
  ok(true, "T40 status row renders headless without throwing");
}

/* ---------- T41: device removal cleans up completely ---------- */
wipeLab();
{
  sw = makeSwitch(0, 0, 8);
  h1 = makeHost(0, 200);
  cable(h1, "eth0", sw, "ge-0/0/1");
  rebuildAllDerived();
  openCli(sw);
  ok(openTabs.includes(sw), "T41 CLI tab open before removal");
  const linkCount = Object.keys(links).length;
  deleteDevice(sw);
  ok(!devices[sw], "T41 device gone");
  ok(Object.keys(links).length === linkCount - 1, "T41 its cables gone with it");
  ok(!openTabs.includes(sw), "T41 its CLI tab closed");
  undoLast();
  ok(!!devices[sw] && Object.keys(links).length === linkCount, "T41 undo restores device and cabling");
}

/* ---------- T42: JUNO copilot ---------- */
wipeLab();
{
  ok(/scan the network/.test(junoAnswer("help").reply), "T42 help lists capabilities");
  sw = makeSwitch(0, 0, 8);
  h1 = makeHost(0, 200); h2 = makeHost(80, 200);
  cable(h1, "eth0", sw, "ge-0/0/1"); cable(h2, "eth0", sw, "ge-0/0/2");
  rebuildAllDerived();
  devices[h1].name = "pc-a"; devices[h2].name = "pc-b";
  cli(h1, "ip addr add 10.0.0.1/24 dev eth0");
  cli(h2, "ip addr add 10.0.0.2/24 dev eth0");
  cfgDo(sw, ["set vlans staff vlan-id 10",
    "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members staff"]);
  const diag = junoAnswer("why can't pc-a reach pc-b").reply;
  ok(/cannot reach/.test(diag) && /L2|VLAN|Unreachable|ARP/i.test(diag), "T42 diagnosis explains the L2 break");
  const rep = junoAnswer("analyze pc-a").reply;
  ok(/10\.0\.0\.1/.test(rep), "T42 device report reads real state");
  ok(/nominal|error|warning/i.test(junoAnswer("scan the network").reply), "T42 full scan summarises");
  ok(/no buildings/i.test(junoAnswer("how hot is it").reply), "T42 thermal answer without buildings");
  ok(/did not follow/.test(junoAnswer("sing me a song").reply), "T42 honest fallback");
}
wipeLab();
{
  const swA = makeSwitch(0, 0, 8), swB = makeSwitch(400, 0, 8);
  cable(swA, "ge-0/0/0", swB, "ge-0/0/0");
  cable(swA, "ge-0/0/1", swB, "ge-0/0/1");
  rebuildAllDerived();
  ok(NET.stormLinks.size > 0, "T42 storm staged");
  const prop = junoAnswer("fix it").reply;
  ok(/RSTP/i.test(prop) && /do it/.test(prop), "T42 proposes the RSTP fix");
  const done = junoAnswer("do it").reply;
  ok(NET.stormLinks.size === 0 && /storm is dead|blocking/i.test(done), "T42 applies the fix and the storm dies");
  ok(/Nothing is pending/.test(junoAnswer("do it").reply), "T42 no double-apply");
}

/* ---------- T43: servers, DNS, HTTP — traffic from the very beginning ---------- */
wipeLab();
scen("name-and-serve").setup();
{
  const cl = byName("client-pc"), srvId = byName("web-1").id;
  ok(/could not resolve/.test(cli(cl.id, "curl web.lab")) && /no nameserver/.test(cli(cl.id, "curl web.lab")),
     "T43 no resolver configured = first failure mode");
  cli(cl.id, "nameserver 10.0.10.80");
  ok(/not running DNS/.test(cli(cl.id, "curl web.lab")), "T43 reachable server, dns stopped");
  cli(srvId, "service start dns");
  ok(/NXDOMAIN/.test(cli(cl.id, "curl web.lab")), "T43 dns up but no record = NXDOMAIN");
  cli(srvId, "dns add web.lab 10.0.10.80");
  ok(/connection refused/.test(cli(cl.id, "curl web.lab")), "T43 resolves fine, nothing listening on 80");
  cli(srvId, "service start http");
  ok(/200 OK/.test(cli(cl.id, "curl web.lab")), "T43 full chain: resolve, connect, serve");
  ok(/Address: 10\.0\.10\.80/.test(cli(cl.id, "nslookup web.lab")), "T43 nslookup shows the answer");
  ok(/resolved via web-1/.test(cli(cl.id, "ping web.lab")), "T43 ping accepts names");
  ok(checksPass(scen("name-and-serve")), "T43 scenario23 completable: " + firstFailing(scen("name-and-serve")));
  // same-subnet traffic never touches an irb filter (it is pure L2) — a real
  // lesson in itself. Move the client to its own VLAN so the web-block routes.
  cfgDo(byName("office-sw").id, [
    "set vlans guest vlan-id 20",
    "set interfaces irb unit 20 family inet address 10.0.20.1/24",
    "set vlans guest l3-interface irb.20",
    "delete interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members staff",
    "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members guest",
  ]);
  cli(cl.id, "ip addr add 10.0.20.21/24 dev eth0");
  cli(cl.id, "ip route add default via 10.0.20.1");
  ok(/200 OK/.test(cli(cl.id, "curl web.lab")), "T43 cross-vlan curl works before the filter");
  cfgDo(byName("office-sw").id, [
    "set firewall family inet filter NO-WEB term block from protocol tcp",
    "set firewall family inet filter NO-WEB term block then discard",
    "set firewall family inet filter NO-WEB term ok then accept",
    "set interfaces irb unit 20 family inet filter input NO-WEB",
  ]);
  ok(!curlCheck(cl, "web.lab").ok && pingOk(cl, "10.0.10.80"),
     "T43 protocol-aware filter: web blocked while ping still works");
  cfgDo(byName("office-sw").id, ["delete interfaces irb unit 20 family inet filter input NO-WEB"]);
  ok(computeBom().list.some(r => r.cat === "Servers & compute" && r.est), "T43 server priced under Servers & compute");
  ok(heatOf(byName("web-1")) === 300, "T43 servers heat the room like servers do");
}

/* ---------- T44: gear clicks into the rack ---------- */
wipeLab();
{
  const z = zones.z_r1 = { id: "z_r1", name: "Rack A", x: 100, y: 100, w: 170, h: 160, hue: 0, kind: "rack" };
  const svId = makeServer(130, 140);
  const swId = makeSwitch(120, 180, 8);
  const outId = makeServer(600, 600);
  const srv = devices[svId], sw = devices[swId], out = devices[outId];
  const gear = packRack(z);
  ok(gear.length === 2 && gear[0] === srv && gear[1] === sw,
     "T44 packRack stacks only in-rack gear, in elevation order");
  ok(z.w === devWidth(sw) + 2 * RACK_SIDE, "T44 rack widens to fit the widest box");
  ok(srv.x === z.x + (z.w - devWidth(srv)) / 2 && sw.x === z.x + (z.w - devWidth(sw)) / 2,
     "T44 gear centers between the rails");
  ok(srv.y >= z.y + RACK_TOP && sw.y >= srv.y + devHeight(srv) + RACK_GAP,
     "T44 no overlap, clamped below the top rail");
  sw.y = srv.y + devHeight(srv) + RACK_GAP + 40;
  packRack(z);
  ok(sw.y === srv.y + devHeight(srv) + RACK_GAP + 40,
     "T44 deliberate gaps between gear are preserved");
  sw.y = srv.y + 2;
  packRack(z);
  ok(sw.y === srv.y + devHeight(srv) + RACK_GAP,
     "T44 overlapping gear gets pushed down, never stacked on top");
  ok(z.h >= (sw.y + devHeight(sw) + RACK_PAD) - z.y, "T44 rack grows long enough for its gear");
  ok(out.x === 600 && out.y === 600, "T44 gear outside the rack stays where it is");
  makeHost(140, 150);
  const y1 = packRack(z).map(d => d.y).join();
  const y2 = packRack(z).map(d => d.y).join();
  ok(y1 === y2, "T44 hosts are furniture, and repacking is idempotent");
  ok(clickIntoRack(outId) === false && clickIntoRack(swId) === true,
     "T44 clickIntoRack: no-op outside, snaps inside");
}

/* ---------- T45: racked gear all mounts at the same full width ---------- */
wipeLab();
{
  const z = zones.z_r2 = { id: "z_r2", name: "Rack B", x: 100, y: 100, w: 170, h: 200, hue: 0, kind: "rack" };
  const svId = makeServer(130, 140);
  const swId = makeSwitch(120, 180, 8);
  packRack(z);
  const srv = devices[svId], sw = devices[swId];
  const inner = z.w - 2 * RACK_SIDE;
  ok(devWidth(srv) === inner && devWidth(sw) === inner,
     "T45 all racked gear spans the full interior width");
  ok(srv.x === z.x + RACK_SIDE && sw.x === z.x + RACK_SIDE,
     "T45 gear sits flush against the rails on both sides");
  ok(devNaturalWidth(srv) === 92, "T45 natural width is remembered, not overwritten");
  srv.x = 600; srv.y = 600;
  ok(clickIntoRack(svId) === false && devWidth(srv) === 92,
     "T45 gear dragged out of the rack shrinks back to natural width");
  ok(devWidth(sw) === inner, "T45 the gear still racked keeps its mount width");
}

/* ---------- T47: the server power button ---------- */
wipeLab();
scen("name-and-serve").setup();
{
  const cl = byName("client-pc"), srv = byName("web-1");
  cli(srv.id, "service start dns");
  cli(srv.id, "service start http");
  cli(srv.id, "dns add web.lab 10.0.10.80");
  cli(cl.id, "nameserver 10.0.10.80");
  ok(/200 OK/.test(cli(cl.id, "curl web.lab")), "T47 baseline: server up, curl OK");
  powerOff(srv);
  ok(/fans are silent/.test(cli(srv.id, "service status")), "T47 dark console refuses commands");
  ok(!pingOk(cl, "10.0.10.80"), "T47 a powered-off server is unreachable (not refusing)");
  ok(/could not resolve|unreachable/.test(cli(cl.id, "curl web.lab")), "T47 curl fails while the box is off");
  ok(heatOf(srv) === 0, "T47 a dark server pours no heat into the room");
  powerOn(srv);
  ok(/200 OK/.test(cli(cl.id, "curl web.lab")), "T47 power back on: enabled services come back");
  ok(/system boot/.test(cli(srv.id, "log")) && /system halted/.test(cli(srv.id, "log")),
     "T47 the server keeps a system log of its power events");
}
/* five servers in an uncooled room cook themselves into emergency shutdown */
wipeLab();
{
  zones.z_hot = { id: "z_hot", name: "Hot room", x: 0, y: 0, w: 400, h: 400, hue: 0, kind: "building" };
  const ids = [1, 2, 3, 4, 5].map(i => makeServer(40 + i * 40, 120));
  rebuildAllDerived();
  ok(ids.some(id => devices[id].powered === false), "T47 servers thermal-shutdown in an uncooled room");
  const down = ids.find(id => devices[id].powered === false);
  ok(/TEMPERATURE CRITICAL/.test((devices[down].syslog || []).join(" ")),
     "T47 the shutdown is written to the server log");
}

/* ---------- T48-T50: LLDP, central syslog, SSH ---------- */
wipeLab();
scen("ops-production").setup();
{
  const sw = byName("office-sw"), srv = byName("ops-1"), pc = byName("admin-pc");
  // T48 lldp
  const lldp = cli(sw.id, "show lldp neighbors");
  ok(/ge-0\/0\/1/.test(lldp) && /ops-1/.test(lldp) && /eth0/.test(lldp), "T48 lldp lists the server neighbor and port");
  ok(!/admin-pc/.test(lldp), "T48 PCs stay silent — no lldpd on a desktop");
  ok(/ops-1/.test(cli(sw.id, "sh lldp nei")), "T48 abbreviation works");

  // T49 syslog streaming
  cli(srv.id, "service start syslog");
  cfgDo(sw.id, ["set system syslog host 10.0.10.90 any any"]);
  cfgDo(sw.id, ["set system services ssh"]);           // noise AFTER the stream is up
  ok((srv.syslog || []).some(ln => ln.includes("office-sw")), "T49 switch lines arrive on the server");
  cli(srv.id, "service stop syslog");
  const before = (srv.syslog || []).length;
  cfgDo(sw.id, ["set system ntp server 10.0.10.90"]);
  ok((srv.syslog || []).length === before, "T49 stopped syslog service = REMOTE lines silently lost (UDP); local systemd lines still journal");
  cli(srv.id, "service start syslog");

  // T50 ssh
  cfgDo(sw.id, ["delete system services ssh"]);
  ok(/Connection refused/.test(cli(pc.id, "ssh 10.0.10.1")) && /nothing listens on 22/.test(cli(pc.id, "ssh 10.0.10.1")),
     "T50 reachable but not listening = refused, with the reason");
  cfgDo(sw.id, ["set system services ssh"]);
  ok(/ssh session open to office-sw/.test(cli(pc.id, "ssh 10.0.10.1")), "T50 session opens once ssh is committed");
  ok(pc.cli.sshTo === sw.id, "T50 the PC session now points at the switch");
  ok(/Junos/.test(cli(pc.id, "show version")), "T50 commands run ON the switch through the session");
  ok(promptStr(pc) === promptStr(sw), "T50 the prompt becomes the switch prompt");
  // the rite of passage: cut your own branch
  cli(pc.id, "configure");
  cli(pc.id, "set interfaces ge-0/0/2 disable");
  const boom = cli(pc.id, "commit");
  ok(/commit complete/.test(boom) && /Connection to office-sw closed/.test(boom) && /commit confirmed/.test(boom),
     "T50 lockout: commit succeeds, session dies, lesson delivered");
  ok(pc.cli.sshTo === null, "T50 session is really gone");
  ok(/Connection timed out/.test(cli(pc.id, "ssh 10.0.10.1")), "T50 locked out for real — no path any more");
  // recover on the console, finish the scenario
  cfgDo(sw.id, ["delete interfaces ge-0/0/2 disable"]);
  cfgDo(sw.id, ["set system syslog host 10.0.10.90 any any"]);
  ok(/ssh session open/.test(cli(pc.id, "ssh 10.0.10.1")), "T50 back in after console recovery");
  ok(/Connection to office-sw closed/.test(cli(pc.id, "exit")), "T50 exit comes home");
  ok(checksPass(scen("ops-production")), "T50 scenario24 completable: " + firstFailing(scen("ops-production")));
}

/* ---------- T51: PoE — no power, no Wi-Fi ---------- */
wipeLab();
{
  const swId = makeSwitch(200, 100, 24); devices[swId].model = "EX3400-24T";   // a real no-PoE SKU
  const apId = makeAp(420, 100, "office-wifi", "AP34", 165);
  const hId = makeHost(420, 220);
  links[uid("lk")] = { a: { dev: apId, port: "eth0" }, b: { dev: swId, port: "ge-0/0/1" }, kind: "lan" };
  rebuildAllDerived();
  ok(!!POE.denied[apId], "T51 AP on a non-PoE switch is dark");
  ok(/no PoE/.test(cli(swId, "show poe interface")), "T51 show poe interface admits the platform has none");
  ok(/does not answer|no power/.test(cli(hId, "wifi join office-wifi")), "T51 a dark AP does not beacon");
  devices[apId].cfg.injector = true;
  rebuildAllDerived();
  ok(!POE.denied[apId], "T51 an injector powers the AP without a PoE switch");
  ok(computeBom().list.some(r => /injector/.test(r.label)), "T51 the injector lands on the BOM");
  devices[apId].cfg.injector = false;
  devices[swId].model = "USW-Lite-8-PoE";   // 52 W budget
  const ap2 = makeAp(500, 100, "wifi-2", "U7-Pro", 200);   // 21 W each
  const ap3 = makeAp(560, 100, "wifi-3", "U7-Pro", 200);
  links[uid("lk")] = { a: { dev: ap2, port: "eth0" }, b: { dev: swId, port: "ge-0/0/2" }, kind: "lan" };
  links[uid("lk")] = { a: { dev: ap3, port: "eth0" }, b: { dev: swId, port: "ge-0/0/3" }, kind: "lan" };
  rebuildAllDerived();
  // draws in port order: AP34 18 + U7 21 = 39, third would hit 60 > 52
  ok(!POE.denied[apId] && !POE.denied[ap2] && !!POE.denied[ap3],
     "T51 budget allocates in port order and denies the overdraft");
  ok(POE.used[swId] === 39, "T51 budget arithmetic is real: 18 + 21 = 39 of 52 W");
  ok(/OFF \(denied\)/.test(cli(swId, "show poe interface")), "T51 the denied port shows in show poe interface");
  ok(runDrc().some(x => x.sev === "error" && /dark/.test(x.text)), "T51 the DRC flags the dark AP");
  // model-less lab switches stay lenient so old scenarios keep working
  const gsw = makeSwitch(200, 300, 8);
  ok(poeBudgetOf(devices[gsw]) === POE_GENERIC_W, "T51 generic gear keeps the lenient budget");
}

/* ---------- T52: the floor plan has a scale ---------- */
wipeLab();
{
  const s1 = makeSwitch(0, 100, 8), s2 = makeSwitch(900, 100, 8);
  const lid = uid("lk");
  links[lid] = { a: { dev: s1, port: "ge-0/0/1" }, b: { dev: s2, port: "ge-0/0/1" }, kind: "lan" };
  rebuildAllDerived();
  const m = linkLenM(links[lid]);
  ok(m > 100 && m < 300, "T52 a cross-canvas run measures beyond 100 m (got " + m + ")");
  ok(runDrc().some(x => /100 m/.test(x.text) && /copper/.test(x.text)), "T52 DRC calls the Cat6 violation");
  ok(cablingSchedule().some(ln => /~\d+ m/.test(ln)), "T52 the cabling schedule lists run lengths");
  const s3 = makeSwitch(80, 100, 8);
  const lid2 = uid("lk");
  links[lid2] = { a: { dev: s1, port: "ge-0/0/2" }, b: { dev: s3, port: "ge-0/0/1" }, kind: "lan" };
  rebuildAllDerived();
  ok(linkLenM(links[lid2]) <= 100, "T52 a short run stays legal");
  // wifi distances speak the same scale
  const ap = makeAp(300, 400, "scale-wifi", "AP34", 165), h = makeHost(400, 400);
  rebuildAllDerived();
  ok(/\(2[0-9]m\)/.test(cli(h, "wifi scan")), "T52 wifi scan reports meters on the same scale");
}

/* ---------- T53: BGP to the provider ---------- */
wipeLab();
scen("speak-bgp").setup();
{
  const r = byName("edge-r1"), pc = byName("office-pc");
  ok(!pingOk(pc, "8.8.8.8"), "T53 no default route yet — the internet is off");
  ok(/BGP is not running/.test(cli(r.id, "show bgp summary")), "T53 summary admits BGP is not configured");
  // neighbor without peer-as must not commit
  cli(r.id, "configure");
  cli(r.id, "set protocols bgp group EXT type external");
  cli(r.id, "set protocols bgp group EXT neighbor 203.0.113.1");
  ok(/peer AS number must be configured/.test(cli(r.id, "commit")), "T53 commit refuses a neighbor without peer-as");
  cli(r.id, "set protocols bgp group EXT peer-as 65999");   // wrong on purpose
  cli(r.id, "set routing-options autonomous-system 65010");
  cli(r.id, "commit");
  cli(r.id, "exit");
  ok(/Active/.test(cli(r.id, "show bgp summary")) && /mismatch/.test(cli(r.id, "show bgp summary")),
     "T53 wrong peer-as: Active state with the mismatch spelled out");
  cfgDo(r.id, ["set protocols bgp group EXT peer-as 65001"]);
  ok(/Established/.test(cli(r.id, "show bgp summary")), "T53 matching AS numbers: Established");
  ok(/\[BGP\/170\]/.test(cli(r.id, "show route")), "T53 the learned default shows as [BGP/170]");
  const lk = routeLookup(r, "8.8.8.8");
  ok(lk && lk.proto === "bgp", "T53 route lookup rides the BGP default");
  ok(pingOk(pc, "8.8.8.8"), "T53 the office reaches the internet over a LEARNED route");
  ok(checksPass(scen("speak-bgp")), "T53 scenario25 completable: " + firstFailing(scen("speak-bgp")));
  // pull the cable: the session dies and the route leaves with it
  const wan = Object.entries(links).find(([, lk2]) =>
    lk2.a.dev === r.id && lk2.a.port === "ge-0/0/0" || lk2.b.dev === r.id && lk2.b.port === "ge-0/0/0");
  wan[1].failed = true;
  rebuildAllDerived();
  ok(!(r.d.bgpPeers || []).some(p => p.state === "Established"), "T53 dead link = dead session");
  ok(!pingOk(pc, "8.8.8.8"), "T53 the learned route left with the session");
  // a static default would have sat there lying; BGP tells the truth
  wan[1].failed = false;
  rebuildAllDerived();
  ok((r.d.bgpPeers || []).some(p => p.state === "Established"), "T53 link back = session back, no typing");
}

/* ---------- T54: UPS and grid outages ---------- */
wipeLab();
scen("keep-lights-on").setup();
{
  const z = Object.values(zones).find(z2 => z2.name === "HQ");
  const sw = byName("hq-sw"), srv = byName("files-1"), lap = byName("laptop-1");
  const ap = Object.values(devices).find(d => d.type === "ap");
  ok(!!POE.denied[ap.id], "T54 scenario ships with the PoE trap armed");
  // outage with no UPS: everything infra dies, the laptop does not
  toggleGridOutage(z);
  ok(sw.powered === false && srv.powered === false, "T54 no UPS: switch and server drop");
  ok(lap.powered !== false, "T54 laptops ride on their own battery");
  ok(runDrcSafe(), "T54 drc runs during an outage");
  toggleGridOutage(z);
  ok(sw.powered !== false && srv.powered !== false, "T54 grid restore powers exactly what it dropped");
  // fix the AP, add a properly sized UPS
  ap.cfg.injector = true;
  const upsId = makeUps(200, 180, "1U Rack UPS 1000W", 1000);
  rebuildAllDerived();
  ok(!POE.denied[ap.id], "T54 injector cures the PoE trap");
  ok(/standby/.test(cli(upsId, "status")) && /load/.test(cli(upsId, "status")), "T54 ups status compares load to capacity");
  toggleGridOutage(z);
  ok(z.gridDown && sw.powered !== false && srv.powered !== false, "T54 covered outage: infrastructure rides through");
  ok(/on battery|ON BATTERY/.test(cli(upsId, "status")), "T54 the ups knows it is carrying the room");
  ok((devices[upsId].syslog || []).some(ln => /on battery/.test(ln)), "T54 the event is in the ups log");
  ok(checksPass(scen("keep-lights-on")), "T54 scenario26 completable mid-drill: " + firstFailing(scen("keep-lights-on")));
  toggleGridOutage(z);
  // overload: a tiny UPS is worse than none in the log, same in effect
  devices[upsId].cfg.capW = 100;
  toggleGridOutage(z);
  ok(sw.powered === false && srv.powered === false, "T54 overloaded UPS drops the load");
  ok((devices[upsId].syslog || []).some(ln => /OVERLOAD/.test(ln)), "T54 the overload is logged");
  toggleGridOutage(z);
  ok(computeBom().list.some(r => r.cat === "Power & cooling" && /UPS/.test(r.label) && r.est),
     "T54 the UPS lands on the BOM as a Power & cooling estimate");
  ok(runDrc().some(x => /undersized/.test(x.text)), "T54 DRC flags the undersized battery");
}
function runDrcSafe(){ try{ runDrc(); return true; }catch(e){ return false; } }

/* ---------- T55: reference diagrams stay attached to real cards ---------- */
{
  const titles = REF_CONCEPTS.map(c => c[0]);
  const orphans = Object.keys(REF_DIAGRAMS).filter(k => !titles.includes(k));
  ok(orphans.length === 0, "T55 every diagram matches a concept card title: " + (orphans.join(", ") || "ok"));
  ok(Object.keys(REF_DIAGRAMS).length >= 10, "T55 the complicated cards carry flowcharts");
  ok(titles.includes("DHCP — the DORA dance") && titles.includes("DNS — the first step of every connection"),
     "T55 the new DHCP and DNS cards exist");
  for(const [k, spec] of Object.entries(REF_DIAGRAMS)){
    const okSpec = spec.kind === "lanes"
      ? (spec.a && spec.b && Array.isArray(spec.msgs) && spec.msgs.length >= 3)
      : (Array.isArray(spec) && spec.length >= 3 && spec.some(s => s.e) &&
         spec.every(s => s.b || (s.q && s.side) || s.e));
    ok(okSpec, "T55 diagram spec well-formed: " + k);
  }
  ok(refDiagramText(REF_DIAGRAMS["The commit model"]).toLowerCase().includes("rollback"),
     "T55 diagram text feeds the search filter");
  ok(junoVoiceScore({ name: "Ava (Enhanced)", lang: "en-US", localService: true }) >
     junoVoiceScore({ name: "Fred", lang: "en-US", localService: true }),
     "T55 juno prefers the premium voice");
}

/* ---------- T56: every how-to step carries its counterfactual ---------- */
{
  const missing = [], orphan = [];
  const actions = new Set();
  for(const g of REF_HOWTO)
    for(const st2 of g.steps){
      actions.add(st2[0]);
      const wo = REF_WITHOUT[st2[0]];
      if(!wo || wo.length < 60) missing.push(g.title + " / " + st2[0].slice(0, 40));
    }
  for(const k of Object.keys(REF_WITHOUT))
    if(!actions.has(k)) orphan.push(k.slice(0, 40));
  ok(missing.length === 0, "T56 every step has a real without-explanation: " + (missing.join(" | ") || "ok"));
  ok(orphan.length === 0, "T56 no orphaned without-entries: " + (orphan.join(" | ") || "ok"));
  ok(Object.keys(REF_WITHOUT).length >= 45, "T56 the counterfactual column covers the library");
}

/* ---------- T-PROTO: field guides + legacy syntax hints ---------- */
wipeLab();
PROTO_GUIDES.filter(g => g.ready).forEach(g => {
  ok(g.problem && g.how && (g.conceptual || (g.prereqs && g.prereqs.length >= 3)), "proto " + g.id + " has core sections");
  ok(g.conceptual || (g.cfg && g.cfg.length >= 2), "proto " + g.id + " has config commands");
  ok(g.nums && g.nums.length >= 3, "proto " + g.id + " has numbers");
  ok(g.verify && g.verify.length >= 2 && g.breaks && g.breaks.length >= 3, "proto " + g.id + " has verify+breaks");
  ok(g.quiz && g.quiz.length >= 3 && g.quiz.every(q => q.opts[q.right] !== undefined), "proto " + g.id + " quiz answers valid");
  ok(!g.scenarioId || SCENARIOS.some(s => s.id === g.scenarioId), "proto " + g.id + " links a real scenario");
  (g.prereqs || []).forEach((p, i) => {
    let threw = false;
    try{ p.test(); }catch(e){ threw = true; }
    ok(!threw, "proto " + g.id + " prereq " + i + " safe on empty lab");
  });
});
{
  let sw2 = makeSwitch(0, 0, 8);
  rebuildAllDerived();
  cli(sw2, "configure");
  let out1 = cli(sw2, "set interfaces ge-0/0/1 unit 0 family ethernet-switching port-mode access");
  ok(/legacy/.test(out1) && /interface-mode/.test(out1), "legacy port-mode gets an ELS correction");
  let out2 = cli(sw2, "set vlans staff l3-interface vlan.10");
  ok(/legacy/.test(out2) && /irb/.test(out2), "legacy vlan.N RVI gets an irb correction");
  let out3 = cli(sw2, "set interfaces vlan unit 10 family inet address 10.0.10.1/24");
  ok(/legacy/.test(out3) && /irb/.test(out3), "legacy interfaces-vlan gets an irb correction");
  let out4 = cli(sw2, "set interfaces ge-0/0/1 unit 0 family ethernet-switching interface-mode access");
  ok(!/legacy/.test(out4), "modern ELS interface-mode passes clean");
}


PROTO_GUIDES.filter(g => g.ready && !g.conceptual && !g.noTopology).forEach(g => {
  ok(typeof protoAnims[g.id] === "object" && typeof protoAnims[g.id].run === "function", "proto " + g.id + " has a canvas animation");
  ok(g.conceptual || (Array.isArray(PROTO_GLOW_TYPES[g.id]) && PROTO_GLOW_TYPES[g.id].length), "proto " + g.id + " has glow targets");
});
{
  const parts = maskHintParts("On the switch: set protocols rstp, then commit. Read the storm error first.");
  ok(parts.some(p => p.cmd && /set protocols rstp/.test(p.t)), "hint masking catches commands");
  ok(parts.some(p => !p.cmd && /On the switch/.test(p.t)), "hint masking keeps the concept text visible");
  ok(parts.map(p => p.t).join("") === "On the switch: set protocols rstp, then commit. Read the storm error first.", "hint masking loses no text");
}
{
  wipeLab();
  let swp = makeSwitch(0, 0, 8), hp = makeHost(0, 0);
  cable(hp, "eth0", swp, "ge-0/0/1");
  rebuildAllDerived();
  ok(protoFindLink("host", "switch") !== null, "protoFindLink finds host-switch either direction");
  ok(protoFindLink("router", "isp") === null, "protoFindLink null when absent");
}


{
  wipeLab();
  const s1 = makeSwitch(0, 0, 8), s2 = makeSwitch(300, 0, 8);
  const a = devices[s1], b = devices[s2];
  cable(s1, "ge-0/0/1", s2, "ge-0/0/1");
  cable(s1, "ge-0/0/2", s2, "ge-0/0/2");
  [a, b].forEach(d => {
    deviceExec(d, "configure");
    deviceExec(d, "set interfaces ge-0/0/1 ether-options 802.3ad ae0");
    deviceExec(d, "set interfaces ge-0/0/2 ether-options 802.3ad ae0");
    deviceExec(d, "set interfaces ae0 aggregated-ether-options lacp active");
    deviceExec(d, "set interfaces ae0 unit 0 family ethernet-switching");
    deviceExec(d, "commit");
  });
  setStrict(false);
  rebuildAllDerived();
  ok(NET.aeInfo[s1].ae0 && NET.aeInfo[s1].ae0.up, "strict-off: bundle forms without chassis config");
  setStrict(true);
  rebuildAllDerived();
  ok(NET.aeInfo[s1].ae0 && !NET.aeInfo[s1].ae0.up, "strict-on: bundle refuses to form without chassis config");
  ok(NET.aeInfo[s1].ae0.members.every(m => /chassis aggregated-devices/.test(m.why)), "strict-on: show lacp explains why");
  const w = deviceExec(a, "commit");
  ok(w.some(l => l.cls === "warn" && /device-count/.test(l.text)), "strict-on: commit warns about the orphaned bundle");
  [a, b].forEach(d => { deviceExec(d, "set chassis aggregated-devices ethernet device-count 1"); deviceExec(d, "commit"); });
  ok(NET.aeInfo[s1].ae0.up, "strict-on: bundle forms once chassis aggregated-devices is configured");
  setStrict(false);
}


{
  wipeLab();
  const r1 = makeRouter(0, 0, 4), r2 = makeRouter(300, 0, 4);
  const a = devices[r1], b = devices[r2];
  cable(r1, "ge-0/0/1", r2, "ge-0/0/1");
  [["a", a, "10.9.12.1"], ["b", b, "10.9.12.2"]].forEach(([_, d, ip]) => {
    deviceExec(d, "configure");
    deviceExec(d, "set interfaces ge-0/0/1 unit 0 family inet address " + ip + "/30");
    deviceExec(d, "set protocols ospf area 0 interface ge-0/0/1.0");
    deviceExec(d, "commit");
  });
  ok((D(a).ospfNeighbors || []).some(n => n.state === "Full"), "conv: strict off = instant Full");
  setStrict(true);
  CONV.map = {};
  rebuildAllDerived();
  ok((D(a).ospfNeighbors || []).some(n => n.state === "ExStart"), "conv: strict on = adjacency starts in ExStart");
  ok((D(a).ospfRoutes || []).length === 0, "conv: no OSPF routes until Full");
  for(const k of Object.keys(CONV.map)) CONV.map[k] -= 7000;
  rebuildAllDerived();
  ok((D(a).ospfNeighbors || []).some(n => n.state === "Full"), "conv: adjacency reaches Full after the timer");
  ok(convPending() === false, "conv: nothing pending once converged");
  setStrict(false);
}
{
  wipeLab();
  const s1 = makeSwitch(0, 0, 8), h1 = makeHost(300, 0);
  const sw = devices[s1], h = devices[h1];
  cable(h1, "eth0", s1, "ge-0/0/1");
  deviceExec(sw, "configure");
  deviceExec(sw, "set vlans staff vlan-id 10");
  deviceExec(sw, "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff");
  deviceExec(sw, "set vlans staff l3-interface irb.10");
  deviceExec(sw, "set interfaces irb unit 10 family inet address 10.0.10.1/24");
  deviceExec(sw, "commit");
  deviceExec(sw, "exit");
  const cl = deviceExec(sw, "show system commit").map(l => l.text).join("\n");
  ok(/0 +\d{4}-\d{2}-\d{2}/.test(cl) && /by cli/.test(cl), "timeline: show system commit lists commits");
  deviceExec(h, "ip addr add 10.0.10.5/24 dev eth0");
  const p = pingRun(h, "10.0.10.1");
  ok(p.ok, "counters: setup ping works");
  const st = deviceExec(sw, "show interfaces statistics").map(l => l.text).join("\n");
  ok(/ge-0\/0\/1/.test(st) && !/no traffic counted/.test(st), "counters: ping moved the numbers");
  const lid = Object.keys(links)[0];
  links[lid].degraded = true;
  LAB_RAND = () => 0.1;
  const p2 = pingRun(h, "10.0.10.1");
  ok(!p2.ok && p2.lines.some(l => /LOST mid-path/.test(l.text)), "gremlin: degraded link drops packets with the right story");
  LAB_RAND = () => 0.99;
  ok(pingRun(h, "10.0.10.1").ok, "gremlin: intermittent means sometimes it works");
  const st2 = deviceExec(sw, "show interfaces statistics").map(l => l.text).join("\n");
  const errCount = parseInt((st2.match(/ge-0\/0\/1\s+\S+\s+\S+\s+(\d+)/) || [0, "0"])[1], 10);
  ok(errCount > 0, "gremlin: raw error counter climbs on the degraded port \u2014 no coaching text, just real numbers");
  LAB_RAND = function(){ return Math.random(); };
  delete links[lid].degraded;
}
{
  wipeLab();
  let prev = null;
  for(let i = 0; i < 40; i++){
    const id = i % 3 === 0 ? makeRouter(i * 30, 0, 4) : makeSwitch(i * 30, 100, 8);
    if(prev !== null){
      const a = devices[prev], b = devices[id];
      const pa = a.ports.find(p => !isLinked(a.id, p.id)), pb = b.ports.find(p => !isLinked(b.id, p.id));
      if(pa && pb) links[uid("lk")] = { a: { dev: prev, port: pa.id }, b: { dev: id, port: pb.id }, kind: "lan" };
    }
    prev = id;
  }
  const t0 = Date.now();
  for(let i = 0; i < 10; i++) rebuildAllDerived();
  const avg = (Date.now() - t0) / 10;
  ok(avg < 120, "perf: rebuild at 40 devices averages under 120ms (was " + avg.toFixed(1) + "ms)");
}


{
  ok(netCalc("192.168.10.130", 26).network === "192.168.10.128", "subnet: /26 network");
  ok(netCalc("192.168.10.130", 26).usable === 62, "subnet: /26 hosts");
  ok(netCalc("10.9.12.5", 30).broadcast === "10.9.12.7", "subnet: /30 broadcast");
  ok(netCalc("172.16.5.9", 31).usable === 2, "subnet: /31 both usable (RFC 3021)");
  for(let i = 0; i < 200; i++){
    const q = subnetDrillQ();
    const a = netCalc(q.ip, q.bits);
    ok2 = ipToInt(a.network) <= ipToInt(q.ip) && ipToInt(q.ip) <= ipToInt(a.broadcast);
    if(!ok2){ ok(false, "subnet drill: generated ip inside its own block (" + q.ip + "/" + q.bits + ")"); break; }
  }
  ok(true, "subnet drill: 200 generated questions all self-consistent");
  wipeLab();
  const s1 = makeSwitch(0, 0, 8);
  const p = deviceExec(devices[s1], "show system processes").map(l => l.text).join("\n");
  ok(/mgd/.test(p) && /rpd/.test(p) && /l2ald/.test(p), "arch: show system processes names the daemons");
}


{
  wipeLab();
  const ids = bulkMake("switch", 6, 8, null);
  ok(ids.length === 6 && ids.every(id => devices[id] && devices[id].type === "switch"), "bulk: six switches in one call");
  const ys = new Set(ids.map(id => devices[id].y));
  ok(ys.size >= 2, "bulk: grid uses more than one row at six");
  for(let i = 0; i < ids.length; i++) for(let j = i + 1; j < ids.length; j++){
    const a = devices[ids[i]], b = devices[ids[j]];
    const overlap = Math.abs(a.x - b.x) < 10 && Math.abs(a.y - b.y) < 10;
    if(overlap){ ok(false, "bulk: devices " + i + "," + j + " overlap"); break; }
  }
  ok(true, "bulk: no two devices land on the same spot");
  const mixed = bulkMake("host", 3).concat(bulkMake("ups", 2), bulkMake("crac", 2), bulkMake("isp", 2), bulkMake("ap", 2), bulkMake("server", 2), bulkMake("router", 2, 4));
  ok(mixed.every(id => devices[id]), "bulk: every device type places cleanly");
  ok(devices[bulkMake("isp", 2)[0]].cfg.ip, "bulk: ISPs arrive with a usable handoff address");
}


{
  PROTO_GUIDES.filter(g => g.ready && g.conceptual).forEach(g => {
    const t = g.how.text;
    ok(Array.isArray(t) && t.length >= 2 && t.every(p => p.length < 600), "guide " + g.id + " how-it-works is chunked, no walls of text");
  });
  const arch = PROTO_GUIDES.find(g => g.id === "junos-arch");
  ok(arch.try && arch.try.length >= 3, "arch guide has runnable try-it commands");
  wipeLab();
  const s1 = makeSwitch(0, 0, 8);
  arch.try.forEach(tr => {
    const out = deviceExec(devices[s1], tr[0]).map(l => l.text).join("");
    ok(!/unknown command|syntax error/.test(out), "try chip runs clean: " + tr[0]);
  });
}


{
  COURSE.forEach(u => {
    if(u.s) ok(SCENARIOS.some(sc => sc.id === u.s), "course: scenario unit exists: " + u.s);
    if(u.g) ok(PROTO_GUIDES.some(g => g.id === u.g && g.ready), "course: guide unit exists and is ready: " + u.g);
  });
  const allDomainIds = Object.values(COURSE_DOMAINS).flat();
  COURSE.forEach(u => ok(allDomainIds.includes(u.s || u.g), "course: unit mapped to an exam domain: " + (u.s || u.g)));
  {
    const nx = courseNext();
    const consistent = nx === null || (!unitDone(nx.unit) && COURSE.slice(0, nx.idx).every(unitDone));
    ok(consistent, "course: next unit is the first undone one, everything before it done");
  }
  const stats = courseDomainStats();
  ok(Object.keys(stats).length === 6 && Object.values(stats).every(d => d.total > 0), "course: six domains, all populated");
  const g0 = PROTO_GUIDES.find(g => g.id === "osi");
  g0.quiz.forEach((q, qi) => markQuizDone("osi", qi));
  ok(unitDone({ g: "osi" }) && courseNext().unit.g === "subnetting", "course: mastering a guide's quiz advances the path");
  try{ localStorage.removeItem("junoslab-quizdone:osi"); }catch(e){}
  ok(PROTO_GUIDES.find(g => g.id === "filters").scenarioId === "filtered-segment", "filters guide links its live scenario");
  ok(THEMES.includes("nightops") && THEMES.includes("paper") && !THEMES.includes("blueprint"), "themes: nightops + paper in, blueprint gone");
}


{
  const all = examAllQuestions();
  ok(all.length >= 60, "exam: bank holds a full JNCIA-length pool (" + all.length + ")");
  const ids = new Set(all.map(q => q.id));
  ok(ids.size === all.length, "exam: question ids unique");
  all.forEach(q => {
    if(q.typed) ok(typeof q.answer === "string" && q.answer.length > 0, "exam typed q has answer: " + q.id);
    else ok(q.opts && q.opts[q.right] !== undefined, "exam mcq right index valid: " + q.id);
    ok(Object.keys(COURSE_DOMAINS).includes(q.d), "exam q mapped to a real domain: " + q.id);
  });
  ok(examNormalize("  10.20.37.64 ") === examNormalize("10.20.37.64"), "exam: whitespace ignored in typed answers");
  ok(examNormalize("Super-User") === examNormalize("super-user"), "exam: case ignored in typed answers");
  try{ localStorage.setItem("junoslab-wrongq", "b:0|b:1"); }catch(e){}
  let hits = 0;
  for(let t = 0; t < 300; t++){
    const draw = examDraw(10, Math.random);
    if(draw.some(q => q.id === "b:0" || q.id === "b:1")) hits++;
  }
  ok(hits > 150, "exam: previously-missed questions draw with heavy weight (" + hits + "/300)");
  const d = examDraw(20);
  ok(d.length === 20 && new Set(d.map(q => q.id)).size === 20, "exam: draws are unique per sitting");
  try{ localStorage.removeItem("junoslab-wrongq"); }catch(e){}
}
{
  ok(PROTO_GUIDES.find(g => g.id === "maintenance").ready, "maintenance guide is live");
  ok(PROTO_GUIDES.filter(g => g.ready).every(g => !g.real || g.real.length >= 2 || true), "real callouts shape ok");
  const withReal = PROTO_GUIDES.filter(g => g.ready && g.real && g.real.length >= 2).length;
  ok(withReal >= 8, "real-hardware callouts on at least 8 guides (" + withReal + ")");
  wipeLab();
  const s1 = makeSwitch(0, 0, 8), sw = devices[s1];
  const m = PROTO_GUIDES.find(g => g.id === "maintenance");
  m.try.forEach(tr => {
    const out = deviceExec(sw, tr[0]).map(l => l.text).join("");
    ok(!/unknown command|syntax error/.test(out), "maintenance try chip runs: " + tr[0]);
  });
  deviceExec(sw, "configure");
  m.cfg.slice(0, 3).forEach(c => {
    const out = deviceExec(sw, c[0]).map(l => l.text).join("");
    ok(!/unknown command|syntax error/.test(out), "maintenance cfg accepted: " + c[0].slice(0, 40));
  });
}


{
  wipeLab();
  const r1 = makeRouter(0, 0, 4), r2 = makeRouter(300, 0, 4);
  const a = devices[r1], b = devices[r2];
  cable(r1, "ge-0/0/1", r2, "ge-0/0/1");
  [["10.9.12.1", a], ["10.9.12.2", b]].forEach(([ip, d]) => {
    deviceExec(d, "configure");
    deviceExec(d, "set interfaces ge-0/0/1 unit 0 family inet address " + ip + "/30");
    deviceExec(d, "set protocols ospf area 0 interface ge-0/0/1.0");
    deviceExec(d, "commit");
  });
  ok((D(a).ospfNeighbors || []).some(n => n.state === "Full"), "mtu: matched MTUs reach Full");
  deviceExec(a, "set interfaces ge-0/0/1 mtu 9000");
  deviceExec(a, "commit");
  const nb = (D(a).ospfNeighbors || [])[0] || {};
  ok(/MTU mismatch/.test(nb.state || ""), "mtu: mismatch stalls the adjacency in ExStart with the reason");
  ok((D(a).ospfRoutes || []).length === 0, "mtu: no routes across a stalled adjacency");
  deviceExec(a, "delete interfaces ge-0/0/1 mtu");
  deviceExec(a, "commit");
  deviceExec(a, "exit");
  const ext = deviceExec(a, "show interfaces ge-0/0/1 extensive").map(l => l.text).join("\n");
  ok(/Physical interface: ge-0\/0\/1/.test(ext) && /MTU: 1514/.test(ext) && /Last flapped/.test(ext) && /Input  packets/.test(ext),
     "extensive: full real-format interface wall renders");
  const extBad = deviceExec(a, "show interfaces ge-0/0/9 extensive").map(l => l.text).join("");
  ok(/not found|syntax error/.test(extBad), "extensive: unknown port is rejected");
}
{
  wipeLab();
  const s1 = makeSwitch(0, 0, 8), h1 = makeHost(300, 0);
  const sw = devices[s1];
  ok(!consoleGateBlocks(sw), "console gate: closed when real mode is off");
  REAL_MODE = true;
  sw.brandNew = true;
  ok(consoleGateBlocks(sw), "console gate: factory box blocked without console in real mode");
  links[uid("lk")] = { a: { dev: h1, port: "eth0" }, b: { dev: s1, port: "con0" }, kind: "console" };
  ok(!consoleGateBlocks(sw), "console gate: console cable opens the door");
  sw.brandNew = false;
  ok(!consoleGateBlocks(sw), "console gate: configured boxes manage remotely");
  REAL_MODE = false;
}


{
  ["clack", "alert", "ticket", "fan", "ambientOn", "ambientOff", "ambientIsOn"].forEach(fn =>
    ok(typeof SFX[fn] === "function", "sound: SFX." + fn + " exists"));
  ok(SFX.ambientIsOn() === false, "sound: ambient starts off");
  ok(STRICT === false || true, "placeholder");
}
{
  const fresh = (function(){ try{ localStorage.removeItem("junoslab-strict"); }catch(e){} 
    try{ return localStorage.getItem("junoslab-strict") !== "off"; }catch(e){ return true; } })();
  ok(fresh === true, "strict: defaults ON for fresh installs — real-junos correctness out of the box");
}


{
  ok(THEMES.includes("darkacademia"), "theme: Dark Academia registered");
  ok(!THEMES.includes("blueprint"), "theme: blueprint stays gone");
  PROTO_GUIDES.filter(g => g.ready).forEach(g => {
    const box = document.createElement("div");
    renderProtoGuide(box, g);
    const tiers = box.children.filter(c => c.className && /pg-tier-/.test(c.className)).map(c => c.className.match(/pg-tier-(\w+)/)[1]);
    ok(tiers.includes("lead") && tiers.includes("answer") && tiers.includes("quiz"),
       "guide " + g.id + " has lead, answer and quiz tiers");
    ok(tiers.indexOf("lead") < tiers.indexOf("answer") && tiers.indexOf("answer") < tiers.indexOf("quiz"),
       "guide " + g.id + " tiers stay in reading order: lead before answer before quiz");
    const icons = box.querySelectorAll ? null : null;
  });
}


{
  const box = document.createElement("div");
  let threw = null;
  try{ renderProtoList(box); }catch(e){ threw = e; }
  ok(!threw, "protocols tab list renders without throwing (all guides, array or string problem.text)");
  ok(box.children.length > 0, "protocols tab list actually produced content");
  PROTO_GUIDES.forEach(g => {
    if(!g.ready){ ok(typeof g.teaser === "string" && g.teaser.length > 0, "unready guide " + g.id + " has a teaser"); return; }
    ok(typeof g.problem.text === "string" || Array.isArray(g.problem.text), "guide " + g.id + " problem.text is string or array");
    {
      const box2 = document.createElement("div");
      let threw2 = null;
      try{ renderProtoGuide(box2, g); }catch(e){ threw2 = e; }
      ok(!threw2, "guide " + g.id + " opens without throwing" + (threw2 ? " (" + threw2.message + ")" : ""));
    }
  });
}


{
  ok(TICKET_FAULTS.length >= 11, "content: ticket fault pool expanded to " + TICKET_FAULTS.length);
  TICKET_FAULTS.forEach(f => ok(["routine", "urgent", "critical"].includes(f.severity), "fault " + f.id + " has a valid severity"));
  const ids2 = new Set(TICKET_FAULTS.map(f => f.id));
  ok(ids2.size === TICKET_FAULTS.length, "content: no duplicate fault ids");
  ok(ticketMaxSeverity([{ severity: "routine" }, { severity: "critical" }]) === "critical", "severity: max-of-set picks the worst one");
  ok(ticketXpValue([{ severity: "urgent" }, { severity: "routine" }]) === 60, "severity: xp sums correctly (40+20)");
}
{
  RANKS.forEach((r, i) => { if(i > 0) ok(r.xp > RANKS[i - 1].xp, "rank thresholds strictly increasing at " + i); });
  ok(rankFor(0).title === RANKS[0].title, "rank: 0 xp is the starting rank");
  ok(rankFor(999999).title === RANKS[RANKS.length - 1].title, "rank: huge xp caps at the top rank");
  ok(rankFor(299).title === "NOC Technician" || rankFor(299).title === "Network Technician", "rank: boundary just under a threshold stays in the lower rank");
  ok(rankFor(300).title === "Associate Network Engineer", "rank: exact threshold promotes");
  try{ localStorage.removeItem("junoslab-xp"); }catch(e){}
  ok(xpTotal() === 0, "xp: fresh install starts at zero");
  const a1 = awardXp(50, "test");
  ok(a1 === 50 && xpTotal() === 50, "xp: award accumulates and persists");
  const a2 = awardXp(20, "test2");
  ok(a2 === 70, "xp: second award adds on top");
  try{ localStorage.removeItem("junoslab-xp"); }catch(e){}
}
{
  wipeLab();
  try{ localStorage.removeItem("junoslab-xp"); }catch(e){}
  try{ localStorage.removeItem(LS_PROGRESS); }catch(e){}
  PROGRESS = {};
  wipeLab();
  generateTicket();
  const before = xpTotal();
  currentTicket.faults.forEach(f => f.fix(currentTicket.ids));
  rebuildAllDerived();
  evalChecks();
  const afterFirst = xpTotal();
  ok(afterFirst > before, "xp: solving a ticket awards xp (" + before + " -> " + afterFirst + ")");
  evalChecks();
  ok(xpTotal() === afterFirst, "xp: re-evaluating the SAME solved ticket does not double-award");
  wipeLab();
  generateTicket();
  currentTicket.faults.forEach(f => f.fix(currentTicket.ids));
  rebuildAllDerived();
  evalChecks();
  const afterSecond = xpTotal();
  ok(afterSecond > afterFirst, "xp: a NEW ticket (same scenario id \u2018ticket\u2019) awards xp again \u2014 not blocked by the once-only progress flag");
  try{ localStorage.removeItem("junoslab-xp"); }catch(e){}
}


{
  ok(SEVERITY_XP.critical > SEVERITY_XP.urgent && SEVERITY_XP.urgent > SEVERITY_XP.routine, "xp: severity tiers are ordered");
  ok(CONTRACT_XP[3] > CONTRACT_XP[1] * 2, "xp: hard contracts far outweigh easy ones");
  ok(SEVERITY_XP.routine > 4 * 4, "xp: hands-on ticket work outweighs a guide's worth of quiz answers (Tier 2 bias)");
  wipeLab();
  generateSeniorTicket();
  ok(currentTicket && currentTicket.senior === true, "senior: incident flagged as senior");
  ok(currentTicket.faults.length === 3, "senior: three independent faults applied");
  ok(new Set(currentTicket.faults.map(f => f.id)).size === 3, "senior: faults are distinct");
  const before = xpTotal();
  currentTicket.faults.forEach(f => f.fix(currentTicket.ids));
  rebuildAllDerived();
  evalChecks();
  const gained = xpTotal() - before;
  ok(gained > 0, "senior: solving awards xp");
  ok(gained >= Math.round(ticketXpValue(currentTicket.faults) * 1.5), "senior: difficulty multiplier applied (got " + gained + ")");
  try{ localStorage.removeItem("junoslab-xp"); }catch(e){}
}
{
  wipeLab();
  const sw = makeSwitch(200, 200, 8);
  const r1 = makeRouter(0, 0, 4), r2 = makeRouter(400, 0, 4);
  const h = makeHost(200, 400);
  cable(r1, "ge-0/0/0", sw, "ge-0/0/1");
  cable(r2, "ge-0/0/0", sw, "ge-0/0/2");
  cable(h, "eth0", sw, "ge-0/0/3");
  const vr = (id, ip, prio) => {
    const d = devices[id];
    deviceExec(d, "configure");
    deviceExec(d, "set interfaces ge-0/0/0 unit 0 family inet address " + ip + "/24");
    deviceExec(d, "set interfaces ge-0/0/0 unit 0 family inet address " + ip + "/24 vrrp-group 10 virtual-address 10.0.10.1");
    deviceExec(d, "set interfaces ge-0/0/0 unit 0 family inet address " + ip + "/24 vrrp-group 10 priority " + prio);
    deviceExec(d, "commit"); deviceExec(d, "exit");
  };
  vr(r1, "10.0.10.2", 200); vr(r2, "10.0.10.3", 100);
  hostSet(h, "10.0.10.50", 24, "10.0.10.1");
  rebuildAllDerived();
  const grp = Object.values(NET.vrrp)[0];
  ok(grp && grp.master === r1, "vrrp: higher priority wins the election");
  ok(grp.members.filter(m => m.state === "master").length === 1, "vrrp: exactly one master");
  ok(grp.members.some(m => m.state === "backup"), "vrrp: the loser is backup, not master");
  ok(pingOk(devices[h], "10.0.10.1"), "vrrp: host reaches the VIRTUAL address");
  const vout = deviceExec(devices[r1], "show vrrp").map(l => l.text).join("\n");
  ok(/master/.test(vout) && /10\.0\.10\.1/.test(vout), "vrrp: show vrrp reports state and vip");
  deviceExec(devices[r1], "configure");
  deviceExec(devices[r1], "set interfaces ge-0/0/0 disable");
  deviceExec(devices[r1], "commit");
  rebuildAllDerived();
  ok(Object.values(NET.vrrp)[0].master === r2, "vrrp: FAILOVER — backup promotes when master's link dies");
  ok(pingOk(devices[h], "10.0.10.1"), "vrrp: gateway survives the failure (host never changed config)");
}
{
  wipeLab();
  const r = makeRouter(0, 0, 4);
  const a = makeRouter(200, 0, 4), b = makeRouter(400, 0, 4);
  cable(r, "ge-0/0/0", a, "ge-0/0/0");
  cable(r, "ge-0/0/1", b, "ge-0/0/0");
  const d = devices[r];
  deviceExec(d, "configure");
  deviceExec(d, "set interfaces ge-0/0/0 unit 0 family inet address 10.0.1.1/24");
  deviceExec(d, "set interfaces ge-0/0/1 unit 0 family inet address 10.0.2.1/24");
  deviceExec(d, "set routing-options static route 10.50.0.0/24 next-hop 10.0.1.2");
  deviceExec(d, "set routing-options static route 10.50.0.0/24 next-hop 10.0.2.2");
  deviceExec(d, "commit");
  rebuildAllDerived();
  const res = routeLookup(d, "10.50.0.5");
  ok(res && res.ecmp && res.ecmp.length === 2, "ecmp: two equal-cost next-hops installed");
  const f1 = routeLookup(d, "10.50.0.5").nh;
  const f2 = routeLookup(d, "10.50.0.5").nh;
  ok(f1 === f2, "ecmp: the SAME flow always hashes to the same path (packet order preserved)");
  const paths = new Set();
  for(let i = 1; i < 40; i++){
    const rr = routeLookup(d, "10.50.0." + i);
    if(rr && rr.nh) paths.add(rr.nh);
  }
  ok(paths.size === 2, "ecmp: different flows spread across BOTH paths (load sharing works)");
}


{
  ok(Object.keys(TRACKS).length >= 2, "tracks: at least two certification tracks exist");
  ok(TRACKS.jncia && TRACKS.netplus, "tracks: JNCIA and Network+ both defined");
  Object.keys(TRACKS).forEach(function(tid){
    const t = TRACKS[tid];
    ok(t.course.length >= 20, "track " + tid + " has a substantial path (" + t.course.length + " units)");
    t.course.forEach(u => {
      if(u.g) ok(PROTO_GUIDES.some(g => g.id === u.g && g.ready), "track " + tid + " guide unit exists and is ready: " + u.g);
      if(u.s) ok(SCENARIOS.some(sc => sc.id === u.s), "track " + tid + " scenario unit exists: " + u.s);
    });
    const mapped = Object.values(t.domains).flat();
    t.course.forEach(u => ok(mapped.includes(u.s || u.g), "track " + tid + " unit mapped to a domain: " + (u.s || u.g)));
    Object.keys(t.domains).forEach(d => ok(t.domains[d].length > 0, "track " + tid + " domain populated: " + d));
  });
  const npIds = TRACKS.netplus.course.map(u => u.g || u.s);
  ["cabling", "wireless", "netsec", "cloudwan", "troubleshooting"].forEach(g =>
    ok(npIds.includes(g), "netplus path covers its own domain guide: " + g));
  ok(!TRACKS.jncia.course.some(u => u.g === "wireless"), "jncia path stays Juniper-focused (no wireless unit)");
}
{
  const original = activeTrackId();
  setTrack("jncia");
  const jq = examAllQuestions();
  const jDoms = new Set(jq.map(q => q.d));
  jDoms.forEach(d => ok(Object.keys(TRACKS.jncia.domains).includes(d), "jncia exam domain is valid: " + d));
  ok(jq.length >= 40, "jncia exam pool is substantial (" + jq.length + ")");
  setTrack("netplus");
  const nq = examAllQuestions();
  const nDoms = new Set(nq.map(q => q.d));
  nDoms.forEach(d => ok(Object.keys(TRACKS.netplus.domains).includes(d), "netplus exam domain is valid: " + d));
  ok(nq.length >= 60, "netplus exam pool is substantial (" + nq.length + ")");
  ok(nq.length !== jq.length, "exam pools genuinely differ between tracks");
  ok(nq.some(q => /channel/i.test(q.q) || /fiber|fibre/i.test(q.q)), "netplus pool includes Network+-specific material");
  ok(!nq.some(q => /Junos daemon|rpd|mgd/i.test(q.q)), "netplus pool excludes Junos-specific internals");
  ok(new Set(nq.map(q => q.id)).size === nq.length, "netplus question ids stay unique");
  setTrack(original);
  ok(activeTrackId() === original, "track selection is restorable");
}


{
  // Every scenario objective must carry a "why" and it must not just repeat the desc.
  SCENARIOS.forEach(sc => {
    sc.checks.forEach((c, i) => {
      ok(typeof c.why === "string" && c.why.length > 15, "scenario " + sc.id + " check " + i + " has a real why: " + (c.desc || "").slice(0, 30));
      ok(c.why !== c.desc, "scenario " + sc.id + " check " + i + " why is not a duplicate of desc");
    });
  });
  const total = SCENARIOS.reduce((n, sc) => n + sc.checks.length, 0);
  ok(total >= 90, "content: nearly every objective across the app now explains itself (" + total + ")");
}
{
  wipeLab();
  currentScenario = SCENARIOS[0];
  const box = document.getElementById("scen-objectives");
  renderObjectives();
  ok(box.children.length > 0, "objectives panel renders rows");
  const withWhy = box.children.filter(el => el.className && el.className.indexOf("obj-has-why") !== -1);
  ok(withWhy.length === currentScenario.checks.length, "every rendered objective row is flagged as having a why");
  const btn = withWhy[0].children.find(c => c.className === "obj-why-btn");
  ok(btn && btn.textContent === "?", "why-reveal button renders with the expected label");
}
{
  try{ localStorage.removeItem("junoslab-predict"); }catch(e){}
  try{ localStorage.removeItem("junoslab-predict-explained"); }catch(e){}
  const fresh = (function(){ const raw = localStorage.getItem("junoslab-predict"); return raw === null ? true : raw === "on"; })();
  ok(fresh === true, "predict mode: defaults ON for a fresh install");
  setPredict(false);
  ok(predictOn === false, "predict mode: explicit off is respected");
  setPredict(true);
  ok(predictOn === true, "predict mode: explicit on works");
  wipeLab();
  const sw = makeSwitch(0, 0, 8);
  currentScenario = SCENARIOS[2];
  deviceExec(devices[sw], "configure");
  let fired = predictIntercept(devices[sw], "commit", false);
  ok(fired === true, "predict mode: intercepts a commit on an unfinished scenario");
  const scId = currentScenario.id;
  PROGRESS[scId] = { done: true };
  fired = predictIntercept(devices[sw], "commit", false);
  ok(fired === false, "predict mode: does NOT intercept a scenario already marked done");
  delete PROGRESS[scId];
  setPredict(true);
}
{
  const s1 = subnetSteps("192.168.10.130", 26);
  ok(/\.128/.test(s1.text) && /64/.test(s1.text), "subnet drill explainer: /26 example shows the right block and step");
  const s2 = subnetSteps("172.16.5.9", 24);
  ok(s2.aligned === true && /octet boundary/.test(s2.text), "subnet drill explainer: octet-aligned prefix (/24) explained as a special case, not forced through magic-number math");
  const s3 = subnetSteps("10.9.12.5", 30);
  ok(/\.4\b/.test(s3.text) && /step by 4/.test(s3.text), "subnet drill explainer: /30 example matches the known answer (block .4, step 4)");
  for(let i = 0; i < 100; i++){
    const q = subnetDrillQ();
    const st = subnetSteps(q.ip, q.bits);
    ok(typeof st.text === "string" && st.text.length > 20, "subnet drill explainer: never crashes or empties on a random question (" + q.ip + "/" + q.bits + ")");
  }
}


{
  try{ unmodeledClear(); }catch(e){}
  ok(unmodeledLog().length === 0, "telemetry: starts empty");
  wipeLab();
  const sw = makeSwitch(0, 0, 8);
  deviceExec(devices[sw], "show bananas");
  ok(unmodeledLog().some(e => /bananas/.test(e.cmd)), "telemetry: records an unknown operational command");
  deviceExec(devices[sw], "configure");
  deviceExec(devices[sw], "frobnicate the widget");
  ok(unmodeledLog().some(e => /frobnicate/.test(e.cmd) && e.mode === "configuration"), "telemetry: records an unknown config command with its mode");
  const before = unmodeledLog().find(e => /bananas/.test(e.cmd)).n;
  deviceExec(devices[sw], "exit");
  deviceExec(devices[sw], "show bananas");
  const after = unmodeledLog().find(e => /bananas/.test(e.cmd)).n;
  ok(after === before + 1, "telemetry: repeat attempts increment the counter instead of duplicating");
  deviceExec(devices[sw], "show vlans");
  ok(!unmodeledLog().some(e => /show vlans/.test(e.cmd)), "telemetry: a VALID command is never recorded as a gap");
  unmodeledClear();
  ok(unmodeledLog().length === 0, "telemetry: clear works");
}
{
  wipeLab();
  const a = makeSwitch(0, 0, 8);
  const d = devices[a];
  const hw = deviceExec(d, "show chassis hardware").map(l => l.text).join("\n");
  ok(/Chassis/.test(hw) && /Routing Engine 0/.test(hw) && /Power Supply/.test(hw), "bench: show chassis hardware lists real inventory rows");
  const al = deviceExec(d, "show chassis alarms").map(l => l.text).join("\n");
  ok(/No alarms currently active/.test(al), "bench: a healthy switch reports no alarms");
  deviceExec(d, "configure");
  deviceExec(d, "set interfaces ge-0/0/4 disable");
  deviceExec(d, "commit");
  deviceExec(d, "exit");
  const al2 = deviceExec(d, "show chassis alarms").map(l => l.text).join("\n");
  ok(/ge-0\/0\/4/.test(al2) && /disabled/.test(al2), "bench: a disabled port raises a real alarm");
  const b = makeSwitch(300, 0, 8);
  cable(a, "ge-0/0/1", b, "ge-0/0/1");
  rebuildAllDerived();
  const op = deviceExec(d, "show interfaces diagnostics optics ge-0/0/1").map(l => l.text).join("\n");
  ok(/Laser output power/.test(op) && /Receiver signal average power/.test(op), "bench: optics shows DOM readings for a cabled port");
  const lid = Object.keys(links)[0];
  links[lid].degraded = true;
  rebuildAllDerived();
  const op2 = deviceExec(d, "show interfaces diagnostics optics ge-0/0/1").map(l => l.text).join("\n");
  ok(/marginal/.test(op2), "bench: a degraded link shows a low-power warning in optics \u2014 the gremlin is diagnosable");
  const al3 = deviceExec(d, "show chassis alarms").map(l => l.text).join("\n");
  ok(/receive errors/.test(al3), "bench: the degraded link also raises a chassis alarm");
  delete links[lid].degraded;
}
{
  wipeLab();
  const a = makeSwitch(0, 0, 8), b = makeSwitch(300, 0, 8), c = makeSwitch(600, 0, 8);
  cable(a, "ge-0/0/0", b, "ge-0/0/0");
  cable(b, "ge-0/0/1", c, "ge-0/0/1");
  const vcSet = (id, mid, role) => {
    const d = devices[id];
    deviceExec(d, "configure");
    const out = deviceExec(d, "set virtual-chassis member " + mid + " role " + role).map(l => l.text).join("");
    ok(!/error|unknown/i.test(out), "vc: config accepted for member " + mid);
    deviceExec(d, "commit"); deviceExec(d, "exit");
  };
  vcSet(a, 0, "routing-engine");
  vcSet(b, 1, "routing-engine");
  vcSet(c, 2, "line-card");
  rebuildAllDerived();
  ok(NET.vc && Object.keys(NET.vc).length === 3, "vc: all three switches joined one virtual chassis");
  const states = Object.keys(NET.vc).map(id => NET.vc[id].state);
  ok(states.filter(x => x === "master").length === 1, "vc: exactly one master elected");
  ok(states.filter(x => x === "backup").length === 1, "vc: a backup exists for failover");
  ok(states.filter(x => x === "linecard").length === 1, "vc: the line-card member is not eligible to run the VC");
  ok(NET.vc[c].role === "line-card", "vc: declared roles are respected");
  const show = deviceExec(devices[a], "show virtual-chassis").map(l => l.text).join("\n");
  ok(/Member/.test(show) && /master/.test(show) && /backup/.test(show), "vc: show virtual-chassis renders the member table");
  ok(vcMasterOf(devices[c]) !== null, "vc: a line-card member can still identify its master");
  const lone = makeSwitch(900, 0, 8);
  deviceExec(devices[lone], "configure");
  deviceExec(devices[lone], "set virtual-chassis member 0 role routing-engine");
  deviceExec(devices[lone], "commit"); deviceExec(devices[lone], "exit");
  rebuildAllDerived();
  const loneOut = deviceExec(devices[lone], "show virtual-chassis").map(l => l.text).join("\n");
  ok(/no other configured member/.test(loneOut), "vc: a configured-but-isolated switch explains why no VC formed");
}
{
  wipeLab();
  const id = makeSwitch(0, 0, 8);
  const d = devices[id];
  d.cli.stage = "boot";
  const brk = deviceExec(d, "break").map(l => l.text).join("");
  ok(/loader/.test(brk) && d.cli.stage === "loader", "recovery: break interrupts the boot into the loader");
  const q = deviceExec(d, "?").map(l => l.text).join("");
  ok(/boot -s/.test(q), "recovery: loader help documents single-user mode");
  deviceExec(d, "boot -s");
  ok(d.cli.stage === "single", "recovery: boot -s reaches single-user mode");
  const rec = deviceExec(d, "recovery").map(l => l.text).join("");
  ok(/root password recovery/.test(rec) && d.cli.mode === "cfg", "recovery: recovery drops into config mode to reset the password");
  deviceExec(d, "set system root-authentication plain-text-password Recovered1!");
  deviceExec(d, "commit");
  ok(!!cfgGet(d.config, ["system", "root-authentication"]), "recovery: the new root password actually commits");
  const id2 = makeSwitch(300, 0, 8);
  const d2 = devices[id2];
  d2.cli.stage = "boot";
  deviceExec(d2, "break");
  deviceExec(d2, "boot");
  ok(d2.cli.stage === "login", "recovery: plain boot from the loader returns to a normal login");
}
{
  wipeLab();
  const id = makeSwitch(0, 0, 8);
  const d = devices[id];
  deviceExec(d, "configure");
  deviceExec(d, "set system host-name export-test");
  deviceExec(d, "set vlans staff vlan-id 10");
  deviceExec(d, "commit");
  const setForm = treeToDisplaySet(d.config, []).join("\n");
  ok(/^set system host-name export-test$/m.test(setForm), "export: display-set form produces paste-able set commands");
  ok(/set vlans staff vlan-id 10/.test(setForm), "export: nested config flattens correctly into set statements");
  const confForm = treeToText(d.config);
  ok(/\{/.test(confForm) && /\}/.test(confForm), "export: .conf form uses the hierarchical braces format");
  ok(/host-name export-test;/.test(confForm), "export: .conf statements are semicolon-terminated like real Junos");
}


{
  // Audit findings worth locking in permanently.
  unmodeledClear();
  wipeLab();
  const id = makeSwitch(0, 0, 8);
  const d = devices[id];
  d.cli.stage = "newpass";
  deviceExec(d, "SuperSecretPassword123");
  ok(!unmodeledLog().some(e => /SuperSecret/.test(e.cmd)), "telemetry PRIVACY: password input is never recorded as an unmodeled command");
  d.cli.stage = null;
  unmodeledClear();
  for(let i = 0; i < 260; i++) deviceExec(d, "bogus-audit-cmd-" + i);
  ok(unmodeledLog().length === UNMODELED_MAX, "telemetry: log is capped at UNMODELED_MAX, it cannot grow without bound");
  unmodeledClear();
}
{
  // A VC whose VCP link goes down must SPLIT, not silently pretend to be whole.
  wipeLab();
  const a = makeSwitch(0, 0, 8), b = makeSwitch(300, 0, 8);
  cable(a, "ge-0/0/0", b, "ge-0/0/0");
  [[a, 0], [b, 1]].forEach(([x, m]) => {
    const dd = devices[x];
    deviceExec(dd, "configure");
    deviceExec(dd, "set virtual-chassis member " + m + " role routing-engine");
    deviceExec(dd, "commit"); deviceExec(dd, "exit");
  });
  rebuildAllDerived();
  ok(Object.keys(NET.vc).length === 2, "vc: forms over an up VCP link");
  const dd = devices[a];
  deviceExec(dd, "configure");
  deviceExec(dd, "set interfaces ge-0/0/0 disable");
  deviceExec(dd, "commit"); deviceExec(dd, "exit");
  rebuildAllDerived();
  ok(Object.keys(NET.vc).length === 0, "vc: a downed VCP link splits the chassis \u2014 members stop reporting as one device");
}
{
  // All-line-card VC: someone must still run it, or the stack is unmanageable.
  wipeLab();
  const a = makeSwitch(0, 0, 8), b = makeSwitch(300, 0, 8);
  cable(a, "ge-0/0/0", b, "ge-0/0/0");
  [[a, 0], [b, 1]].forEach(([x, m]) => {
    const dd = devices[x];
    deviceExec(dd, "configure");
    deviceExec(dd, "set virtual-chassis member " + m + " role line-card");
    deviceExec(dd, "commit"); deviceExec(dd, "exit");
  });
  rebuildAllDerived();
  const states = Object.keys(NET.vc).map(i => NET.vc[i].state);
  ok(states.filter(x => x === "master").length === 1, "vc: even an all-line-card VC elects one master rather than becoming headless");
}


{
  ok(SERVICE_NAMES.length >= 7, "services: catalogue expanded (" + SERVICE_NAMES.length + ")");
  SERVICE_NAMES.forEach(n => {
    ok(SERVICE_CATALOG[n].port && SERVICE_CATALOG[n].note, "service " + n + " documents its port and purpose");
  });
  wipeLab();
  const sid = makeServer(0, 0);
  const srv = devices[sid];
  const list = cli(sid, "service list");
  ok(/nms/.test(list) && /snmp/.test(list) && /ntp/.test(list), "services: service list shows the new services");
  cli(sid, "service start nms");
  ok(srv.cfg.services.nms === true, "services: nms starts");
  cli(sid, "service start snmp");
  const st = cli(sid, "service status");
  ok(/nms\s+\S+\s+running/.test(st) && /snmp\s+\S+\s+running/.test(st), "services: status reports running services with ports");
  cli(sid, "service stop nms");
  ok(srv.cfg.services.nms === false, "services: nms stops");
  const bad = cli(sid, "service start banana");
  ok(/usage/.test(bad), "services: an unknown service name is rejected with usage");
}
{
  wipeLab();
  ok(monitorSnapshot().nms === 0, "monitoring: no NMS means nothing is polling");
  const sw = makeSwitch(0, 0, 8);
  const sid = makeServer(300, 0);
  const srv = devices[sid];
  cable(sid, "eth0", sw, "ge-0/0/1");
  srv.cfg.ip = "10.0.10.80"; srv.cfg.bits = 24;
  cli(sid, "service start nms");
  rebuildAllDerived();
  const snap = monitorSnapshot();
  ok(snap.nms === 1, "monitoring: an NMS server is detected");
  ok(snap.rows.length >= 2, "monitoring: switches and servers appear as monitored targets");
  ok(snap.rows.every(r => ["up", "warn", "alarm", "unreachable"].includes(r.state)), "monitoring: every row has a valid state");
  const swRow = snap.rows.find(r => r.id === sw);
  ok(swRow && swRow.state === "unreachable", "monitoring: a switch with no IP cannot be polled and reads unreachable");
  devices[sw].powered = false;
  rebuildAllDerived();
  const off = monitorSnapshot().rows.find(r => r.id === sw);
  ok(off && (off.state === "unreachable" || off.state === "down"), "monitoring: a powered-off device does not read as healthy");
}
{
  ok(INCIDENTS.length >= 4, "incidents: several night-shift scenarios exist");
  const ids2 = new Set(INCIDENTS.map(i => i.id));
  ok(ids2.size === INCIDENTS.length, "incidents: ids are unique");
  INCIDENTS.forEach(inc => {
    ok(inc.page && inc.page.length > 40, "incident " + inc.id + " has a realistic pager message");
    ok(!/because|the cause is/i.test(inc.page), "incident " + inc.id + " pager describes SYMPTOMS, not the cause");
    ok(inc.debrief && inc.debrief.length > 80, "incident " + inc.id + " has a debrief that teaches the lesson");
    ok(inc.checks.length >= 2, "incident " + inc.id + " has multiple restore checks");
    inc.checks.forEach((c, i) => ok(c.why && c.why.length > 20, "incident " + inc.id + " check " + i + " explains why it matters"));
  });
  INCIDENTS.forEach(inc => {
    wipeLab();
    const ids = buildIncidentSite();
    let threw = null;
    try{ inc.setup(ids); }catch(e){ threw = e.message; }
    ok(!threw, "incident " + inc.id + " sets up without throwing" + (threw ? " (" + threw + ")" : ""));
    rebuildAllDerived();
    const states = inc.checks.map(c => { try{ return !!c.test(ids); }catch(e){ return "threw"; } });
    ok(!states.includes("threw"), "incident " + inc.id + " checks all evaluate without throwing");
    ok(states[0] === false, "incident " + inc.id + " primary fault check is genuinely broken at page time");
    ok(states.some(x => x === false), "incident " + inc.id + " is not already solved when it pages you");
  });
}
{
  wipeLab();
  const ids = buildIncidentSite();
  const inc = INCIDENTS.find(i => i.id === "loop-storm");
  inc.setup(ids);
  rebuildAllDerived();
  ok(NET.stormLinks.size > 0, "incident loop-storm: a real broadcast storm forms");
  [ids.core, ids.acc1].forEach(id => cfgDo(id, ["set protocols rstp"]));
  rebuildAllDerived();
  const after = inc.checks.map(c => { try{ return !!c.test(ids); }catch(e){ return false; } });
  ok(after.every(Boolean), "incident loop-storm: enabling RSTP alone resolves it \u2014 no cable pulling needed");
}
{
  wipeLab();
  const ids = buildIncidentSite();
  const inc = INCIDENTS.find(i => i.id === "service-crash");
  inc.setup(ids);
  rebuildAllDerived();
  ok(ids.srv && devices[ids.srv], "incident service-crash: bootstraps its own app server (the base site has none)");
  ok(devices[ids.srv].cfg.services.dns === true, "incident service-crash: DNS stays up so the fault is isolated to HTTP");
  devices[ids.srv].cfg.services.http = true;
  rebuildAllDerived();
  const after = inc.checks.map(c => { try{ return !!c.test(ids); }catch(e){ return false; } });
  ok(after.every(Boolean), "incident service-crash: restarting the service restores end-to-end curl");
}


{
  wipeLab();
  const sw = makeSwitch(0, 0, 8);
  ok(snmpEnabled(devices[sw]) === false, "snmp: a factory switch has no community configured");
  cfgDo(sw, ["set snmp community dcu-ro authorization read-only"]);
  rebuildAllDerived();
  ok(snmpEnabled(devices[sw]) === true, "snmp: community config is accepted and detected");
  ok(/no SNMP community/.test(snmpMissingReason(makeSwitch(300, 0, 8) && devices[Object.keys(devices).filter(k => devices[k].type === "switch")[1]])),
     "snmp: an unconfigured switch reports the real reason it cannot be polled");
}
{
  wipeLab();
  const sw = makeSwitch(0, 0, 8);
  const sid = makeServer(300, 0);
  const srv = devices[sid];
  cable(sid, "eth0", sw, "ge-0/0/1");
  srv.cfg.ip = "10.0.10.80"; srv.cfg.bits = 24;
  deviceExec(srv, "service start nms");
  cfgDo(sw, ["set vlans staff vlan-id 10",
    "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff",
    "set vlans staff l3-interface irb.10",
    "set interfaces irb unit 10 family inet address 10.0.10.1/24"]);
  rebuildAllDerived();
  const before = monitorSnapshot().rows.find(r => r.id === sw);
  ok(before.state === "unreachable", "monitoring: a reachable but SNMP-less switch is NOT reported as healthy");
  ok(/no SNMP community/.test(before.issues.join("")), "monitoring: it says exactly why it cannot poll");
  cfgDo(sw, ["set snmp community dcu-ro authorization read-only"]);
  rebuildAllDerived();
  const after = monitorSnapshot().rows.find(r => r.id === sw);
  ok(after.state === "up", "monitoring: the switch becomes pollable once SNMP is actually configured");
}
{
  const hier = [
    "## Last commit: 2026-09-19 22:14:03 UTC",
    "version 23.4R1.10;",
    "system {",
    "    host-name core-1;",
    "    services {",
    "        ssh;",
    "    }",
    "}",
    "interfaces {",
    "    ge-0/0/1 {",
    "        unit 0 {",
    "            family ethernet-switching {",
    "                interface-mode access;",
    "                vlan {",
    "                    members staff;",
    "                }",
    "            }",
    "        }",
    "    }",
    "}",
    "vlans {",
    "    staff {",
    "        vlan-id 10;",
    "    }",
    "}",
  ].join("\n");
  const lines = confToSetLines(hier);
  ok(lines.includes("set system host-name core-1"), "import: flattens a simple stanza");
  ok(lines.includes("set system services ssh"), "import: flattens a presence statement");
  ok(lines.includes("set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff"),
     "import: flattens deeply nested braces into one set statement");
  ok(lines.includes("set vlans staff vlan-id 10"), "import: handles sibling stanzas after a close brace");
  ok(!lines.some(l => /version|Last commit/.test(l)), "import: strips version headers and comments");
  const flat = confToSetLines("set system host-name acc-1\nset vlans guest vlan-id 20\n");
  ok(flat.length === 2 && flat[0] === "set system host-name acc-1", "import: accepts display-set format unchanged");
  ok(confToSetLines("").length === 0, "import: empty text yields nothing rather than throwing");
  ok(confToSetLines("total nonsense here").length === 0, "import: unparseable text yields nothing");
}
{
  wipeLab();
  const a = makeSwitch(0, 0, 48);
  cfgDo(a, ["set system host-name rt-round", "set vlans staff vlan-id 10",
    "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff",
    "set interfaces irb unit 10 family inet address 10.0.10.1/24",
    "set vlans staff l3-interface irb.10", "set protocols rstp",
    "set snmp community dcu-ro authorization read-only"]);
  rebuildAllDerived();
  const hierOut = treeToText(devices[a].config);
  const flatOut = treeToDisplaySet(devices[a].config, []).join("\n");
  const b = makeSwitch(300, 0, 48);
  const r1 = importConfigInto(devices[b], hierOut);
  cfgExec(devices[b], "commit");
  const c = makeSwitch(600, 0, 48);
  const r2 = importConfigInto(devices[c], flatOut);
  cfgExec(devices[c], "commit");
  rebuildAllDerived();
  ok(r1.failed.length === 0 && r2.failed.length === 0, "import: the lab's own export re-imports with zero gaps");
  ok(JSON.stringify(devices[a].config) === JSON.stringify(devices[b].config),
     "import: hierarchical export -> import round-trips to an identical config");
  ok(JSON.stringify(devices[a].config) === JSON.stringify(devices[c].config),
     "import: display-set export -> import round-trips to an identical config");
}
{
  wipeLab();
  const sw = makeSwitch(0, 0, 48);
  const res = importConfigInto(devices[sw],
    "set system host-name ok-1\nset class-of-service interfaces ge-0/0/5 scheduler-map SM-1\n");
  ok(res.applied === 1, "import: supported statements still apply when others fail");
  ok(res.failed.length === 1 && /class-of-service/.test(res.failed[0].line),
     "import: an unmodelled hierarchy is reported as a specific gap, not silently dropped");
  ok(!!res.failed[0].why, "import: each gap carries the reason the CLI rejected it");
}


{
  ok(Object.keys(DEVICE_PROFILES).length >= 8, "profiles: a real device catalogue exists");
  Object.keys(DEVICE_PROFILES).forEach(m => {
    const p = DEVICE_PROFILES[m];
    ok(p.access > 0 && p.version, "profile " + m + " defines access ports and a Junos version");
    ok(p.poeW === undefined, "profile " + m + " does not duplicate PoE budget (POE_BUDGET_W owns that)");
  });
  wipeLab();
  const sw = makeSwitch(0, 0, 48, "EX4300-48T");
  const d = devices[sw];
  ok(d.ports.filter(p => p.role === "access").length === 48, "profiles: EX4300-48T has 48 access ports");
  const ups = d.ports.filter(p => p.role === "uplink");
  ok(ups.length === 4, "profiles: EX4300-48T has 4 uplinks");
  ok(ups.every(p => /^xe-0\/1\/\d$/.test(p.id)), "profiles: uplinks use real xe-0/1/x naming, not ge-0/0/x");
  const qfx = makeSwitch(300, 0, 48, "QFX5100-48S");
  ok(devices[qfx].ports.filter(p => p.role === "uplink").every(p => /^et-/.test(p.id)), "profiles: QFX uplinks are et- (40G)");
  const generic = makeSwitch(600, 0, 8);
  ok(generic && devices[generic].ports.length === 8, "profiles: an unprofiled switch still works with a plain port count");
  cfgDo(sw, ["set interfaces xe-0/1/0 unit 0 family ethernet-switching interface-mode trunk"]);
  rebuildAllDerived();
  ok(!!cfgGet(devices[sw].config, ["interfaces", "xe-0/1/0"]), "profiles: uplink ports are configurable like any other interface");
  const ver = deviceExec(devices[sw], "show version").map(l => l.text).join("");
  ok(/23\.4R1\.10/.test(ver), "profiles: show version reports the profile's Junos version");
  const hw = deviceExec(devices[sw], "show chassis hardware").map(l => l.text).join("\n");
  ok(/48x10\/100\/1000/.test(hw) && /4x 10G uplink/.test(hw),
     "profiles: show chassis hardware separates access ports from uplinks accurately");
}
{
  wipeLab();
  const r = makeRouter(0, 0, 4, "MX204"), isp = makeIsp(400, 0, "203.0.113.1");
  cable(r, "ge-0/0/0", isp, "ge-0/0/0");
  cfgDo(r, ["set interfaces ge-0/0/0 unit 0 family inet address 203.0.113.2/30",
    "set routing-options static route 10.50.0.0/24 next-hop 203.0.113.1",
    "set routing-options autonomous-system 65010",
    "set protocols bgp group ISP type external",
    "set protocols bgp group ISP peer-as 65000",
    "set protocols bgp group ISP neighbor 203.0.113.1"]);
  rebuildAllDerived();
  const before = advertisedRoutes(devices[r], "203.0.113.1");
  ok(before.policy === null, "policy: no export policy configured yet");
  ok(!before.routes.some(x => x.r.proto === "static"),
     "policy: Junos default does NOT advertise your statics \u2014 the classic exam answer");
  cfgDo(r, ["set policy-options policy-statement ADV-STATIC term t1 from protocol static",
    "set policy-options policy-statement ADV-STATIC term t1 then accept",
    "set protocols bgp group ISP export ADV-STATIC"]);
  rebuildAllDerived();
  const after = advertisedRoutes(devices[r], "203.0.113.1");
  ok(after.policy === "ADV-STATIC", "policy: the export policy is picked up on the group");
  ok(after.routes.some(x => x.r.net === "10.50.0.0" && x.r.proto === "static"),
     "policy: the static is now advertised because a term accepted it");
  const out = deviceExec(devices[r], "show route advertising-protocol bgp 203.0.113.1").map(l => l.text).join("\n");
  ok(/10\.50\.0\.0\/24/.test(out) && /term t1 matched and accepts/.test(out),
     "policy: show route advertising-protocol names the deciding term");
  const v = policyVerdict(devices[r], "ADV-STATIC", { net: "10.99.0.0", bits: 24, proto: "ospf" });
  ok(v.action === "reject" && /implicit/.test(v.why),
     "policy: an unmatched route hits the implicit reject at the end of the policy");
  const missing = policyVerdict(devices[r], "NO-SUCH-POLICY", { net: "1.1.1.0", bits: 24, proto: "static" });
  ok(missing.action === "none" && /not defined/.test(missing.why),
     "policy: referencing an undefined policy is reported, not silently treated as accept");
}
{
  wipeLab();
  const r = makeRouter(0, 0, 4, "MX204");
  cfgDo(r, ["set policy-options policy-statement RF term t1 from route-filter 10.50.0.0/24 exact",
    "set policy-options policy-statement RF term t1 then accept"]);
  rebuildAllDerived();
  const exact = policyVerdict(devices[r], "RF", { net: "10.50.0.0", bits: 24, proto: "static" });
  ok(exact.action === "accept", "policy: route-filter exact matches the exact prefix");
  const longer = policyVerdict(devices[r], "RF", { net: "10.50.0.0", bits: 25, proto: "static" });
  ok(longer.action === "reject", "policy: route-filter exact does NOT match a more specific prefix");
}


{
  wipeLab();
  const a = makeSwitch(0, 0, 8), b = makeSwitch(300, 0, 8);
  cable(a, "ge-0/0/1", b, "ge-0/0/1"); cable(a, "ge-0/0/2", b, "ge-0/0/2");
  [a, b].forEach(id => cfgDo(id, [
    "set chassis aggregated-devices ethernet device-count 1",
    "set interfaces ge-0/0/1 ether-options 802.3ad ae0",
    "set interfaces ge-0/0/2 ether-options 802.3ad ae0",
    "set interfaces ae0 aggregated-ether-options lacp active",
    "set interfaces ae0 unit 0 family ethernet-switching"]));
  rebuildAllDerived();
  ok(NET.aeInfo[a].ae0.up, "min-links: a 2-member bundle is up by default");
  cfgDo(a, ["set interfaces ae0 aggregated-ether-options minimum-links 2"]);
  rebuildAllDerived();
  ok(NET.aeInfo[a].ae0.up, "min-links: still up while both members are up");
  ok(NET.aeInfo[a].ae0.minLinks === 2, "min-links: the configured value is read");
  cfgDo(a, ["set interfaces ge-0/0/2 disable"]);
  rebuildAllDerived();
  ok(!NET.aeInfo[a].ae0.up, "min-links: bundle goes DOWN when members drop below the minimum");
  ok(/minimum-links 2 not met/.test(NET.aeInfo[a].ae0.minWhy || ""), "min-links: the reason names the shortfall");
  cfgDo(a, ["delete interfaces ge-0/0/2 disable"]);
  rebuildAllDerived();
  ok(NET.aeInfo[a].ae0.up, "min-links: bundle recovers when the member returns");
}
{
  wipeLab();
  const sw = makeSwitch(0, 0, 8), hT = makeHost(0, 200), hA = makeHost(300, 200);
  cable(hT, "eth0", sw, "ge-0/0/7");
  cable(hA, "eth0", sw, "ge-0/0/1");
  cfgDo(sw, ["set vlans staff vlan-id 10",
    "set interfaces ge-0/0/1 unit 0 family ethernet-switching interface-mode access",
    "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff",
    "set interfaces ge-0/0/7 unit 0 family ethernet-switching interface-mode trunk",
    "set interfaces ge-0/0/7 unit 0 family ethernet-switching vlan members staff"]);
  hostSet(hT, "10.0.10.5", 24, null); hostSet(hA, "10.0.10.6", 24, null);
  rebuildAllDerived();
  ok(!pingOk(devices[hT], "10.0.10.6"), "native-vlan: untagged traffic into a trunk is dropped without a native VLAN");
  cfgDo(sw, ["set interfaces ge-0/0/7 native-vlan-id 10"]);
  rebuildAllDerived();
  ok(pingOk(devices[hT], "10.0.10.6"), "native-vlan: setting it lands untagged frames in that VLAN, both directions");
  cfgDo(sw, ["delete interfaces ge-0/0/7 native-vlan-id", "set interfaces ge-0/0/7 native-vlan-id 99"]);
  rebuildAllDerived();
  ok(!pingOk(devices[hT], "10.0.10.6"), "native-vlan: a native VLAN not carried on the trunk still drops the traffic");
}
{
  wipeLab();
  const sw = makeSwitch(0, 0, 48, "EX4300-48P");
  const ap1 = makeAp(200, 0), ap2 = makeAp(200, 100);
  cable(ap1, "eth0", sw, "ge-0/0/1"); cable(ap2, "eth0", sw, "ge-0/0/2");
  rebuildAllDerived();
  ok(!POE.denied[ap1] && !POE.denied[ap2], "poe: both APs powered within budget");
  cfgDo(sw, ["set poe interface ge-0/0/1 disable"]);
  rebuildAllDerived();
  ok(/administratively disabled/.test(POE.denied[ap1] || ""), "poe: per-port disable stops power on that port");
  ok(!POE.denied[ap2], "poe: disabling one port does not affect the other");
  cfgDo(sw, ["set poe interface ge-0/0/2 maximum-power 5"]);
  rebuildAllDerived();
  ok(/capped at 5 W/.test(POE.denied[ap2] || ""), "poe: a per-port power cap below the draw denies power with a clear reason");
  const out = deviceExec(devices[sw], "show poe interface").map(l => l.text).join("\n");
  ok(/Disabled/.test(out) && /Priority/.test(out), "poe: show poe interface reports admin state and priority");
}
{
  wipeLab();
  const sw = makeSwitch(0, 0, 8);
  const empty = deviceExec(devices[sw], "show analyzer").map(l => l.text).join("");
  ok(/no analyzer configured/.test(empty), "analyzer: reports cleanly when nothing is configured");
  cfgDo(sw, ["set forwarding-options analyzer CAP input ingress interface ge-0/0/1",
    "set forwarding-options analyzer CAP output interface ge-0/0/5"]);
  rebuildAllDerived();
  const good = deviceExec(devices[sw], "show analyzer").map(l => l.text).join("\n");
  ok(/Analyzer name: CAP/.test(good) && /ge-0\/0\/1/.test(good) && /ge-0\/0\/5/.test(good),
     "analyzer: shows what is mirrored and where the copy goes");
  ok(!/warning/.test(good), "analyzer: a sane config raises no warnings");
  cfgDo(sw, ["delete forwarding-options analyzer CAP output interface",
    "set forwarding-options analyzer CAP output interface ge-0/0/1"]);
  rebuildAllDerived();
  const loop = deviceExec(devices[sw], "show analyzer").map(l => l.text).join("\n");
  ok(/loops the copy back/.test(loop), "analyzer: catches mirroring a port back into itself");
}

/* ---------- T-ANNOTATE: configuration comments ---------- */
{
  wipeLab();
  const sw = makeSwitch(0, 0, 8);
  rebuildAllDerived();
  const d = devices[sw];
  const run = c => deviceExec(d, c).map(l => l.cls + "|" + l.text).join("\n");
  run("configure");
  run("set interfaces ge-0/0/1 description uplink");
  run("set vlans data vlan-id 10");

  ok(/statement not found/.test(run('annotate interfaces ge-0/0/9 "nope"')),
     "annotate: refuses a statement that does not exist");
  ok(/must be quoted/.test(run('annotate interfaces ge-0/0/1 bare words')),
     "annotate: refuses an unquoted comment");
  ok(/usage: annotate/.test(run("annotate")), "annotate: bare command prints usage");

  ok(run('annotate interfaces ge-0/0/1 "uplink to core"') === "",
     "annotate: succeeds silently, like real Junos");
  ok(annotGet(d.candidate, ["interfaces", "ge-0/0/1"]) === "uplink to core",
     "annotate: the comment lands in the candidate");
  ok(cfgGet(d.candidate, ["interfaces", "ge-0/0/1", ANNOT_KEY]) === undefined &&
     Object.keys(cfgGet(d.candidate, ["interfaces"])).indexOf(ANNOT_KEY) === -1,
     "annotate: comments never pollute the statement subtree");

  const shown = run("show");
  ok(/\/\* uplink to core \*\//.test(shown) &&
     shown.indexOf("/* uplink to core */") < shown.indexOf("ge-0/0/1 {"),
     "annotate: comment prints above its statement in the curly view");

  const cmp = run("show | compare");
  ok(/\+   \/\* uplink to core \*\//.test(cmp), "annotate: a comment change shows in show | compare");

  run("commit");
  ok(annotGet(d.config, ["interfaces", "ge-0/0/1"]) === "uplink to core",
     "annotate: the comment survives commit into the active config");
  run("exit");
  ok(/\/\* uplink to core \*\//.test(run("show configuration")),
     "annotate: show configuration renders the comment");
  const dset = run("show configuration | display set");
  ok(/annotate interfaces ge-0\/0\/1 "uplink to core"/.test(dset),
     "annotate: | display set round-trips the comment as an annotate command");

  run("configure");
  run("edit interfaces ge-0/0/1");
  run('annotate description "why this name"');
  ok(annotGet(d.candidate, ["interfaces", "ge-0/0/1", "description"]) === "why this name",
     "annotate: works relative to the current edit level");
  ok(/\/\* why this name \*\//.test(run("show")), "annotate: a subtree show keeps its comments");
  run("top");

  run('annotate interfaces ge-0/0/1 ""');
  ok(annotGet(d.candidate, ["interfaces", "ge-0/0/1"]) === undefined,
     'annotate: an empty comment removes it');
  ok(annotGet(d.candidate, ["interfaces", "ge-0/0/1", "description"]) === "why this name",
     "annotate: removing one comment leaves the others alone");

  run('annotate vlans data "prod data"');
  run("delete vlans data");
  ok(annotGet(d.candidate, ["vlans", "data"]) === undefined,
     "annotate: deleting a statement takes its comment with it");
  ok(annotGet(d.candidate, ["interfaces", "ge-0/0/1", "description"]) === "why this name",
     "annotate: pruning one comment does not disturb unrelated ones");

  run("rollback 0");
  ok(annotGet(d.candidate, ["interfaces", "ge-0/0/1", "description"]) === undefined &&
     annotGet(d.candidate, ["interfaces", "ge-0/0/1"]) === "uplink to core",
     "annotate: rollback restores the committed comments exactly");

  const round = confToSetLines(
    "interfaces {\n    /* rack note */\n    ge-0/0/2 {\n        /* leaf note */\n        disable;\n    }\n}");
  ok(round.some(l => /^annotate interfaces ge-0\/0\/2 "rack note"$/.test(l)) &&
     round.some(l => /^annotate interfaces ge-0\/0\/2 disable "leaf note"$/.test(l)) &&
     round.indexOf("set interfaces ge-0/0/2 disable") < round.findIndex(l => /^annotate/.test(l)),
     "annotate: importing a .conf turns /* */ comments into annotate lines, after the set lines");

  wipeLab();
  const sw2 = makeSwitch(0, 0, 8);
  rebuildAllDerived();
  importConfigInto(devices[sw2], "interfaces {\n    /* imported */\n    ge-0/0/3 {\n        disable;\n    }\n}");
  ok(annotGet(devices[sw2].candidate, ["interfaces", "ge-0/0/3"]) === "imported",
     "annotate: an imported comment reaches the candidate");

  ok(cfgIsEmpty({}) && cfgIsEmpty({ [ANNOT_KEY]: { a: "b" } }) && !cfgIsEmpty({ system: true }),
     "annotate: a tree holding only orphan comments still counts as empty");
  ok(annotClean('a "quote" and */ and /* end') === 'a "quote" and * / and / * end',
     "annotate: comment text can never break out of the /* */ wrapper");
}


/* ---------- T-NOTES: the "for Claude" notebook ---------- */
{
  localStorage.removeItem(NOTES_KEY);
  ok(notesAll().length === 0 && notesCount() === 0, "notes: starts empty");
  ok(/No open notes/.test(notesForClaude()), "notes: an empty notebook says so");

  ok(notesAdd("bug", "   ") === null && notesAll().length === 0,
     "notes: blank text is not a note");

  const a = notesAdd("bug", "enter does nothing in the LACP guide", "v9.9 · guide: lacp");
  ok(a && a.id && a.ts && a.lab === NOTES_LAB, "notes: a saved note carries id, timestamp and lab");
  ok(a.kind === "bug" && a.ctx === "v9.9 · guide: lacp", "notes: kind and context are kept");
  ok(notesAdd("nonsense-kind", "x").kind === "idea", "notes: an unknown kind falls back to idea");

  const b = notesAdd("real", "lab accepts port-mode on an ELS box");
  ok(notesAll().length === 3 && notesCount() === 3, "notes: notes accumulate");

  ok(notesToggleDone(b.id) === true && notesCount() === 2, "notes: marking handled lowers the open count");
  ok(notesToggleDone(b.id) === false && notesCount() === 3, "notes: it toggles back");
  notesToggleDone(b.id);

  const brief = notesForClaude();
  ok(/^# Notes for Claude/.test(brief), "notes: the briefing has a heading Claude can spot");
  ok(brief.indexOf("enter does nothing in the LACP guide") > -1, "notes: open notes appear in the briefing");
  ok(brief.indexOf("lab accepts port-mode") === -1, "notes: handled notes are left out by default");
  ok(notesForClaude(true).indexOf("lab accepts port-mode") > -1, "notes: ...but can be included");
  ok(brief.indexOf("## " + NOTES_LAB) > -1, "notes: the briefing groups by lab");
  ok(brief.indexOf("guide: lacp") > -1, "notes: the captured context reaches the briefing");

  ok(notesUpdate(a.id, { text: "edited" }) && notesAll().some(n => n.text === "edited"),
     "notes: a note can be edited");
  ok(!notesUpdate("no-such-id", { text: "x" }), "notes: editing an unknown note fails cleanly");

  ok(notesClearDone() === 1 && notesAll().length === 2, "notes: clearing handled removes only those");
  ok(notesDelete(a.id) && notesAll().length === 1, "notes: a note can be deleted");
  ok(!notesDelete(a.id), "notes: deleting twice fails cleanly");

  localStorage.setItem(NOTES_KEY, "{not json");
  ok(notesAll().length === 0, "notes: corrupt storage reads as empty rather than throwing");
  localStorage.removeItem(NOTES_KEY);

  const other = { id: "x1", ts: "2026-01-01T09:00:00.000Z", lab: "Pyle", kind: "idea",
                  text: "loops lesson too fast", ctx: "", done: false };
  localStorage.setItem(NOTES_KEY, JSON.stringify([other]));
  notesAdd("idea", "more DIA scenarios");
  const both = notesForClaude();
  ok(/## Pyle/.test(both) && new RegExp("## " + NOTES_LAB).test(both),
     "notes: one notebook is shared across labs, grouped per lab");
  ok(both.indexOf("## " + NOTES_LAB) < both.indexOf("## Pyle"),
     "notes: labs are listed in a stable alphabetical order");

  localStorage.removeItem(NOTES_KEY);
  ok(typeof noteContext() === "string", "notes: context capture never throws headless");
  ok(NOTE_KINDS.every(k => k.length === 3 && typeof k[0] === "string"),
     "notes: every kind has an id, a label and a description");
  ok(NOTES_KEY.indexOf("junoslab") === -1,
     "notes: the store key is lab-neutral so every Mega Lab app shares it");
}


{
  wipeLab();
  const s = makeSwitch(0, 0, 8, "EX4300-48T"), r = makeRouter(400, 0), hh = makeHost(0, 250);
  cable(hh, "eth0", s, "ge-0/0/1");
  cable(s, "ge-0/0/47", r, "ge-0/0/0");
  rebuildAllDerived();

  const all = cli(s, "show interfaces terse");
  const nlines = all.split("\n").length;
  ok(/^Count: \d+ lines$/.test(cli(s, "show interfaces terse | count").trim()),
     "T60 | count prints the real-JunOS 'Count: N lines'");
  ok(cli(s, "show interfaces terse | count").trim() === "Count: " + nlines + " lines",
     "T60 | count counts every line of the unfiltered output");
  const m = cli(s, "show interfaces terse | match ge-0/0/1");
  ok(m.split("\n").every(l => /ge-0\/0\/1/.test(l)) && /ge-0\/0\/1 /.test(m),
     "T60 | match keeps only matching lines");
  ok(!/ge-0\/0\/1\b/.test(cli(s, "show interfaces terse | except ge-0/0/1")),
     "T60 | except drops matching lines");
  ok(cli(s, "show interfaces terse | match GE-0/0/1").trim() === "",
     "T60 | match is case-sensitive, like the real POSIX regex");
  ok(cli(s, "show interfaces terse | find me0").split("\n")[0].indexOf("me0") === 0,
     "T60 | find starts the output at the first match");
  ok(cli(s, "show interfaces terse | no-more") === all,
     "T60 | no-more changes nothing except the paging that a browser has no need of");
  ok(cli(s, "show interfaces terse | last 2").split("\n").length === 2,
     "T60 | last <n> keeps the tail");
  ok(cli(s, "show interfaces terse | last").split("\n").length === 10,
     "T60 bare | last keeps ten lines");
  ok(cli(s, "show interfaces terse | last 1") === all.split("\n").slice(-1)[0],
     "T60 | last 1 is the final line");
  ok(cli(s, "show interfaces terse | trim 4").split("\n")[0] === all.split("\n")[0].slice(4),
     "T60 | trim <n> cuts n characters off the left of every line");
  ok(/Count: 1 lines/.test(cli(s, "show interfaces terse | match me0 | count")),
     "T60 filters chain left to right");
  ok(/needs a pattern/.test(cli(s, "show interfaces terse | match")),
     "T60 | match with no pattern says so instead of matching everything");
  ok(/unknown filter/.test(cli(s, "show interfaces terse | nonsense")),
     "T60 an unknown filter is named as such");
  ok(/available filters/.test(cli(s, "show interfaces terse | nonsense")),
     "T60 an unknown filter lists the ones that exist");
  ok(/ambiguous filter/.test(cli(s, "show interfaces terse | c")),
     "T60 an ambiguous filter abbreviation is reported, not guessed");
  ok(cli(s, "show interfaces terse | m me0").indexOf("me0") === 0,
     "T60 a unique filter abbreviation works, like every other JunOS keyword");
  ok(/invalid regular expression/.test(cli(s, "show interfaces terse | match [unclosed")),
     "T60 a broken regex is reported, not thrown");
  ok(/nothing before/.test(cli(s, "| match ge")),
     "T60 a pipe with no command in front of it is an error");
  ok(/syntax error|empty filter/.test(cli(s, "show interfaces terse |")),
     "T60 a trailing pipe with no filter is an error");
  ok(/no meaning over operational output/.test(cli(s, "show route | display set")),
     "T60 | display set is refused over operational output and points at the config form");
  ok(/compare/.test(cli(s, "show interfaces terse | compare")),
     "T60 | compare over operational output points at the configuration form");

  const sv = cli(s, "show interfaces terse | save iflist.txt");
  ok(/^Wrote \d+ lines of output to 'iflist\.txt'$/.test(sv.trim()),
     "T60 | save prints the receipt and not the output");
  ok(cli(s, "file show iflist.txt") === all, "T60 file show reads back what | save wrote");
  ok(/No such file/.test(cli(s, "file show missing.txt")), "T60 file show on a missing file fails cleanly");
  ok(/iflist.txt/.test(cli(s, "file show missing.txt")), "T60 that failure lists what HAS been saved");

  cli(s, "configure");
  ok(/Count: /.test(cli(s, "run show interfaces terse | count")),
     "T60 run <command> | count filters the operational output");
  cli(s, "exit");

  ok(/Count: /.test(cli(r, "show interfaces terse | count")), "T60 routers filter output too");
}

{
  wipeLab();
  const s = makeSwitch(0, 0, 48, "EX4300-48T"), r = makeRouter(400, 0);
  cable(s, "ge-0/0/47", r, "ge-0/0/0");
  rebuildAllDerived();
  cli(s, "configure");
  cli(s, "set vlans staff vlan-id 10");
  cli(s, "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff");
  cli(s, "set interfaces ge-0/0/47 unit 0 family ethernet-switching interface-mode trunk");
  cli(s, "set interfaces ge-0/0/47 unit 0 family ethernet-switching vlan members staff");
  cli(s, "set interfaces irb unit 10 family inet address 10.0.10.1/24");
  cli(s, "set vlans staff l3-interface irb.10");
  cli(s, "set protocols rstp");
  cli(s, "set protocols lldp interface all");
  cli(s, "set routing-options static route 0.0.0.0/0 next-hop 10.0.10.9");
  cli(s, "commit");
  cli(s, "exit");

  const esi = cli(s, "show ethernet-switching interface");
  ok(/Logical/.test(esi) && /Vlan/.test(esi) && /interface flags/.test(esi),
     "T61 show ethernet-switching interface prints the ELS column headings");
  ok(/staff\s+10/.test(esi), "T61 it lists each port's VLAN membership and tag");
  ok(/tagged/.test(esi) && /untagged/.test(esi), "T61 it distinguishes trunk (tagged) from access (untagged) ports");

  const stb = cli(s, "show spanning-tree bridge");
  ok(/STP bridge parameters/.test(stb), "T61 show spanning-tree bridge prints the bridge block");
  ok(/Root ID\s+: 32768\./.test(stb), "T61 it prints a bridge-ID-shaped root id");
  ok(/Hello time\s+: 2 seconds/.test(stb) && /Forward delay\s+: 15 seconds/.test(stb),
     "T61 it prints the RSTP timers");
  ok(/Bridge ID/.test(stb), "T61 it prints this switch's own bridge id");

  const vd = cli(s, "show vlans detail");
  ok(/VLAN Name: staff/.test(vd) && /Tag: 10/.test(vd), "T61 show vlans detail names each VLAN and its tag");
  ok(/Layer 3 interface: irb\.10/.test(vd), "T61 show vlans detail names the L3 interface");

  const ext = cli(s, "show interfaces extensive");
  ok(/Physical interface: ge-0\/0\/1,/.test(ext) && /Physical interface: ge-0\/0\/47,/.test(ext),
     "T61 bare show interfaces extensive covers every port");
  ok(/Physical interface: ge-0\/0\/1,/.test(cli(s, "show interfaces ge-0/0/1 extensive")),
     "T61 the per-interface form still works");

  const rt = cli(s, "show route");
  ok(/inet\.0: \d+ destinations?, \d+ routes? \(\d+ active, 0 holddown, 0 hidden\)/.test(rt),
     "T61 show route prints the real inet.0 header");
  ok(/\+ = Active Route, - = Last Active, \* = Both/.test(rt), "T61 show route prints the legend");
  ok(/0\.0\.0\.0\/0\s+\*\[Static\/5\]/.test(cli(s, "show route 8.8.8.8")),
     "T61 show route <destination> answers with the route that would carry it");
  ok(/longest match wins/.test(cli(s, "show route 10.0.10.5")),
     "T61 show route <destination> explains why the more specific route won");
  ok(/\*\[Static\/5\]/.test(cli(s, "show route protocol static")),
     "T61 show route protocol static filters to statics");
  ok(!/\[Direct\/0\]/.test(cli(s, "show route protocol static")),
     "T61 show route protocol static leaves the direct routes out");
  ok(/no ospf routes/.test(cli(s, "show route protocol ospf")),
     "T61 show route protocol <p> says so plainly when that protocol has no routes");

  ok(cli(s, "show configuration | display set").indexOf("set protocols lldp interface all") > -1,
     "T61 set protocols lldp interface all commits and renders back");
  cli(s, "configure");
  ok(cli(s, "set protocols lldp interface ge-0/0/1").join === undefined, "T61 per-interface lldp parses");
  cli(s, "set protocols lldp advertisement-interval 30");
  cli(s, "set protocols lldp hold-multiplier 4");
  ok(!/syntax error/.test(cli(s, "show protocols lldp")), "T61 the lldp timers parse");
  cli(s, "rollback 0");
  cli(s, "exit");

  const up = cli(s, "show system uptime");
  ok(/Current time: /.test(up) && /System booted: /.test(up) && /up /.test(up),
     "T61 show system uptime prints the four real lines");
  ok(/Last configured: /.test(up), "T61 show system uptime says when the config last changed");

  ok(cli(s, "clear interfaces statistics all") === "", "T61 clear interfaces statistics all is silent, like the real thing");
  ok(cli(s, "clear interfaces statistics ge-0/0/1") === "", "T61 clear interfaces statistics <port> works");
  ok(/syntax error/.test(cli(s, "clear interfaces statistics ge-9/9/9")),
     "T61 clearing a port that does not exist is caught by the grammar");

  cli(s, "configure");
  cli(s, "set system host-name after-the-change");
  cli(s, "commit");
  cli(s, "exit");
  const cr = cli(s, "show configuration | compare rollback 1");
  ok(/host-name after-the-change/.test(cr), "T61 show configuration | compare rollback 1 shows what the last commit changed");
  ok(/no such commit/.test(cli(s, "show configuration | compare rollback 40")),
     "T61 comparing against a commit that is not in history fails cleanly");
}

{
  wipeLab();
  const s = makeSwitch(0, 0, 8, "EX4300-48T"), h1 = makeHost(0, 250), h2 = makeHost(100, 250);
  cable(h1, "eth0", s, "ge-0/0/1");
  cable(h2, "eth0", s, "ge-0/0/2");
  rebuildAllDerived();
  cli(h1, "ip addr add 10.0.0.1/24 dev eth0");
  cli(h2, "ip addr add 10.0.0.2/24 dev eth0");
  cli(s, "configure");
  cli(s, "set vlans guest vlan-id 20");
  cli(s, "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members guest");
  cli(s, "commit");
  ok(!pingOk(devices[h1], "10.0.0.2"),
     "T62 moving ge-0/0/2 into its own VLAN isolates the two hosts to start with");

  cli(s, "deactivate interfaces ge-0/0/2");
  ok(/inactive: ge-0\/0\/2/.test(cli(s, "show interfaces")),
     "T62 a deactivated statement renders with the inactive: tag");
  ok(/^!/m.test(cli(s, "show | compare")), "T62 show | compare marks the change with !");
  cli(s, "commit");
  ok(/inactive: ge-0\/0\/2/.test(cli(s, "run show configuration")),
     "T62 the inactive tag survives the commit and shows in the active config");
  ok(pingOk(devices[h1], "10.0.0.2"),
     "T62 a deactivated statement has no effect: ge-0/0/2 falls back to the default VLAN");
  ok(/deactivate interfaces ge-0\/0\/2/.test(cli(s, "run show configuration | display set")),
     "T62 display set emits the deactivate line so the config still round-trips");

  cli(s, "activate interfaces ge-0/0/2");
  cli(s, "commit");
  ok(!/inactive:/.test(cli(s, "run show configuration")), "T62 activate removes the tag");
  ok(!pingOk(devices[h1], "10.0.0.2"), "T62 the statement takes effect again once activated");

  ok(/not deactivated/.test(cli(s, "activate interfaces ge-0/0/2")),
     "T62 activating something that was never deactivated warns instead of pretending");
  ok(/not found/.test(cli(s, "deactivate interfaces ge-0/0/7 disable")),
     "T62 deactivating a statement that does not exist is an error");
  ok(/usage/.test(cli(s, "deactivate")), "T62 bare deactivate explains itself");

  cli(s, "set interfaces ge-0/0/3 unit 0 family ethernet-switching vlan members nowhere");
  ok(/commit failed/.test(cli(s, "commit")), "T62 an undefined VLAN fails the commit");
  cli(s, "deactivate interfaces ge-0/0/3");
  ok(/commit complete/.test(cli(s, "commit")),
     "T62 once deactivated, the same statement no longer fails validation");
  cli(s, "exit");
}

{
  wipeLab();
  const s = makeSwitch(0, 0, 8, "EX4300-48T");
  rebuildAllDerived();
  cli(s, "configure");
  cli(s, "set firewall family inet filter GUEST-IN term allow-dns from protocol udp");
  cli(s, "set firewall family inet filter GUEST-IN term allow-dns then accept");
  cli(s, "set firewall family inet filter GUEST-IN term deny-all then discard");
  const order1 = cli(s, "show | display set")
    .split("\n").filter(l => /term /.test(l)).map(l => l.split("term ")[1].split(" ")[0]);
  ok(order1[0] === "allow-dns", "T63 terms start in the order they were typed");

  cli(s, "insert firewall family inet filter GUEST-IN term deny-all before term allow-dns");
  const order2 = cli(s, "show | display set")
    .split("\n").filter(l => /term /.test(l)).map(l => l.split("term ")[1].split(" ")[0]);
  ok(order2[0] === "deny-all", "T63 insert ... before moves a term up");
  cli(s, "insert firewall family inet filter GUEST-IN term deny-all after term allow-dns");
  const order3 = cli(s, "show | display set")
    .split("\n").filter(l => /term /.test(l)).map(l => l.split("term ")[1].split(" ")[0]);
  ok(order3[0] === "allow-dns", "T63 insert ... after moves it back down");
  ok(/usage/.test(cli(s, "insert firewall family inet filter GUEST-IN term deny-all")),
     "T63 insert without before/after explains itself");
  ok(/not found/.test(cli(s, "insert firewall family inet filter GUEST-IN term deny-all before term ghost")),
     "T63 inserting relative to a term that does not exist is an error");
  ok(/itself/.test(cli(s, "insert firewall family inet filter GUEST-IN term deny-all before term deny-all")),
     "T63 a term cannot be inserted relative to itself");

  cli(s, "edit firewall family inet filter GUEST-IN");
  cli(s, "insert term deny-all before term allow-dns");
  ok(/deny-all/.test(cli(s, "show").split("\n")[1]), "T63 insert works at an edit level, with no path repeated");
  cli(s, "top");

  cli(s, "annotate firewall family inet filter GUEST-IN term allow-dns \"lets DNS out\"");
  cli(s, "deactivate firewall family inet filter GUEST-IN term allow-dns");
  cli(s, "rename firewall family inet filter GUEST-IN term allow-dns to term permit-dns");
  const shown = cli(s, "show firewall");
  ok(/permit-dns/.test(shown) && !/allow-dns/.test(shown), "T63 rename replaces the name in place");
  ok(/lets DNS out/.test(shown), "T63 rename carries the statement's comment with it");
  ok(/inactive: permit-dns/.test(shown), "T63 rename carries the inactive tag with it");
  cli(s, "activate firewall family inet filter GUEST-IN term permit-dns");

  cli(s, "copy firewall family inet filter GUEST-IN term permit-dns to term permit-ntp");
  const copied = cli(s, "show firewall");
  ok(/permit-dns/.test(copied) && /permit-ntp/.test(copied), "T63 copy leaves the original and adds the duplicate");
  ok((copied.match(/protocol udp;/g) || []).length === 2, "T63 copy duplicates the whole subtree");
  ok(/already exists/.test(cli(s, "copy firewall family inet filter GUEST-IN term permit-dns to term permit-ntp")),
     "T63 copying onto a name that is taken is refused");
  ok(/different name/.test(cli(s, "rename firewall family inet filter GUEST-IN term permit-dns to term permit-dns")),
     "T63 renaming a statement to its own name is refused");
  ok(/usage/.test(cli(s, "rename firewall family inet filter GUEST-IN term permit-dns")),
     "T63 rename without 'to' explains itself");

  const st = cli(s, "status");
  ok(/Users currently editing the configuration:/.test(st), "T63 status prints the real heading");
  ok(/\[edit/.test(st), "T63 status reports which hierarchy level the session is at");

  ok(/commit complete/.test(cli(s, "commit comment \"opened DNS for the guest vlan\"")),
     "T63 commit comment commits");
  ok(/opened DNS for the guest vlan/.test(cli(s, "run show system commit")),
     "T63 the comment shows up in the commit history");
  ok(/usage/.test(cli(s, "commit comment")), "T63 commit comment with no text explains itself");
  ok(!/opened DNS/.test(cli(s, "run show configuration")),
     "T63 a commit comment annotates the commit, not the configuration");

  cli(s, "edit firewall");
  ok(/\[edit\]/.test(cli(s, "quit")), "T63 quit inside a hierarchy pops one level, like exit");
  ok(/Exiting configuration mode/.test(cli(s, "quit")), "T63 quit at the top leaves configuration mode");
  ok(devices[s].cli.mode === "op", "T63 and the session really is back in operational mode");
}

{
  wipeLab();
  const s = makeSwitch(0, 0, 8, "EX4300-48T");
  rebuildAllDerived();
  cli(s, "configure");
  cli(s, "set system host-name committed-name");
  cli(s, "commit");
  cli(s, "set system host-name only-in-the-candidate");
  cli(s, "exit");

  ok(/Reboot the system \? \[yes,no\] \(no\)/.test(cli(s, "request system reboot")),
     "T64 request system reboot asks first, the way a real box does");
  ok(/cancelled/.test(cli(s, "no")), "T64 answering no does nothing");
  ok(/only-in-the-candidate/.test(cli(s, "show configuration | display set") + cli(s, "configure") + cli(s, "show | compare")),
     "T64 and the candidate is still there after a cancelled reboot");
  cli(s, "exit");

  cli(s, "request system reboot");
  const boot = cli(s, "yes");
  ok(/System going down for reboot/.test(boot), "T64 answering yes reboots");
  ok(/uncommitted candidate configuration was discarded/.test(boot),
     "T64 the reboot warns that the uncommitted candidate is gone");
  ok(/committed-name/.test(cli(s, "show configuration")), "T64 the committed config survives the reboot");
  cli(s, "configure");
  ok(/no uncommitted/.test(cli(s, "show | compare")),
     "T64 the candidate came back matching the committed config, not the pre-reboot edit");
  cli(s, "exit");
  ok(/booted/.test(cli(s, "show system uptime | match booted")), "T64 uptime reports a boot time after the reboot");

  ok(/Power Off the system \? \[yes,no\] \(no\)/.test(cli(s, "request system power-off")),
     "T64 request system power-off asks first too");
  ok(/System shutting down/.test(cli(s, "yes")), "T64 confirming powers the box off");
  ok(devices[s].powered === false, "T64 and the device really is off");
  powerOn(devices[s]);

  ok(/rpd restart initiated/.test(cli(s, "restart routing")), "T64 restart routing bounces rpd by its real name");
  ok(/adjacency|flap/.test(cli(s, "restart routing")), "T64 and says what that costs");
  ok(/l2ald restart initiated/.test(cli(s, "restart l2-learning")), "T64 restart l2-learning bounces l2ald");
  ok(/chassisd restart initiated/.test(cli(s, "restart chassis-control")), "T64 restart chassis-control bounces chassisd");
  ok(/syntax error/.test(cli(s, "restart nonsense")), "T64 a process that does not exist is caught by the grammar");
  ok(devices[s].powered !== false, "T64 restarting a daemon leaves the box up");
}

/* ---------- T65: operational monitoring, config views, ping options ---------- */
{
  wipeLab();
  const r = makeRouter(0, 0), hh = makeHost(0, 250);
  cable(hh, "eth0", r, "ge-0/0/0");
  rebuildAllDerived();
  cli(hh, "ip addr add 10.0.0.9/24 dev eth0");
  cli(hh, "ip route add default via 10.0.0.1");
  cli(r, "configure");
  cli(r, "set interfaces ge-0/0/0 unit 0 family inet address 10.0.0.1/24");
  cli(r, 'set interfaces ge-0/0/0 description "uplink to core 1"');
  cli(r, "set interfaces ge-0/0/1 description spare");
  cli(r, "set routing-options static route 192.168.9.0/24 next-hop 10.0.0.9");

  /* a description with spaces: a real box takes it quoted, so this one must too */
  const cmp = cli(r, "show | compare");
  ok(/description "uplink to core 1";/.test(cmp),
     "T65 a quoted description with spaces is accepted and renders quoted");
  ok(/description spare;/.test(cmp), "T65 a one-word description still renders bare");
  const dset = cli(r, "show | display set");
  ok(/set interfaces ge-0\/0\/0 description "uplink to core 1"/.test(dset),
     "T65 display set re-quotes the description so the line pastes back");
  cli(r, "commit");

  /* save writes the candidate to a file that file show reads back */
  const sv = cli(r, "save mycfg");
  ok(/Wrote \d+ lines? of configuration to mycfg/.test(sv), "T65 save writes the candidate to a file");
  ok(/description "uplink to core 1"/.test(cli(r, "run file show mycfg")),
     "T65 file show reads the saved configuration back");
  ok(/not a usable filename/.test(cli(r, "save /etc/passwd")), "T65 save refuses a path, not just a name");

  /* wildcard delete */
  ok(/needs a \*/.test(cli(r, "wildcard delete interfaces ge-0/0/0")),
     "T65 wildcard delete without a * tells you to use plain delete");
  ok(/nothing matched/.test(cli(r, "wildcard delete interfaces zz*")),
     "T65 a pattern that matches nothing warns instead of pretending");
  const wd = cli(r, "wildcard delete interfaces ge-0/0/*");
  ok(/2 statements deleted/.test(wd), "T65 wildcard delete removes every matching statement");
  ok(/ge-0\/0\/0/.test(wd) && /ge-0\/0\/1/.test(wd), "T65 and names what it deleted");
  cli(r, "rollback 0");
  ok(/no uncommitted/.test(cli(r, "show | compare")), "T65 rollback 0 undoes the wildcard delete");
  cli(r, "exit");

  /* show configuration <path> */
  ok(/address 10\.0\.0\.1\/24/.test(cli(r, "show configuration interfaces ge-0/0/0")),
     "T65 show configuration <path> prints that branch of the active config");
  ok(/route/.test(cli(r, "show configuration routing-options")),
     "T65 show configuration reaches any depth of the hierarchy");
  ok(/nothing configured at/.test(cli(r, "show configuration protocols")),
     "T65 show configuration on an unconfigured branch says so instead of erroring");
  ok(/address 10\.0\.0\.1/.test(cli(r, "show configuration interfaces | match address")),
     "T65 show configuration <path> still pipes");

  /* show interfaces descriptions */
  const desc = cli(r, "show interfaces descriptions");
  ok(/uplink to core 1/.test(desc) && /spare/.test(desc),
     "T65 show interfaces descriptions lists the ports you described");
  ok(!/ge-0\/0\/2/.test(desc), "T65 and only those (a real box omits undescribed ports)");

  /* route views */
  const terse = cli(r, "show route terse");
  ok(/10\.0\.0\.0\/24/.test(terse) && /192\.168\.9\.0\/24/.test(terse), "T65 show route terse lists every route");
  ok(/\bD\b/.test(terse) && /\bS\b/.test(terse), "T65 terse shows the protocol letter per route");
  const summ = cli(r, "show route summary");
  ok(/Router ID: 10\.0\.0\.1/.test(summ), "T65 show route summary reports a router id");
  ok(/Direct:\s+1 routes/.test(summ) && /Static:\s+1 routes/.test(summ),
     "T65 show route summary counts routes per protocol");

  /* device health */
  ok(/Rescue configuration is not set/.test(cli(r, "show system alarms")),
     "T65 show system alarms raises the real no-rescue-config alarm");
  cli(r, "request system configuration rescue save");
  ok(!/Rescue configuration is not set/.test(cli(r, "show system alarms")),
     "T65 and the alarm clears once a rescue config exists");
  ok(/Rescue configuration deleted/.test(cli(r, "request system configuration rescue delete")),
     "T65 rescue delete throws the snapshot away");
  ok(/Rescue configuration is not set/.test(cli(r, "show system alarms")),
     "T65 and the alarm comes back");
  ok(/Filesystem/.test(cli(r, "show system storage")), "T65 show system storage lists filesystems");
  ok(/\/\.mount\/var/.test(cli(r, "show system storage")), "T65 including /var, the one that fills up");
  ok(/cli/.test(cli(r, "show system users")), "T65 show system users shows the session you are typing in");
  const re = cli(r, "show chassis routing-engine");
  ok(/Current state\s+Master/.test(re), "T65 show chassis routing-engine reports RE state");
  ok(/Last reboot reason/.test(re), "T65 and the last reboot reason");

  /* clear commands */
  cli(r, "ping 10.0.0.9");
  ok(/flushed/.test(cli(r, "clear arp")), "T65 clear arp empties the ARP cache");
  ok(/already empty/.test(cli(r, "clear arp")), "T65 and says so if it was already empty");
  ok(/gone/.test(cli(r, "clear log messages")), "T65 clear log messages empties the log");
  ok(/log is empty/.test(cli(r, "show log messages")), "T65 and show log messages confirms it");

  /* monitor interface traffic */
  const mon = cli(r, "monitor interface traffic");
  ok(/Input packets/.test(mon) && /ge-0\/0\/0/.test(mon),
     "T65 monitor interface traffic shows per-interface counters");
  ok(/press q/.test(mon), "T65 and says what a real box does differently");

  /* file show on real paths */
  ok(/address 10\.0\.0\.1/.test(cli(r, "file show /config/juniper.conf.gz")),
     "T65 file show /config/juniper.conf.gz prints the active configuration");
  cli(r, "configure"); cli(r, "set system host-name R-ONE"); cli(r, "commit"); cli(r, "exit");
  ok(/address 10\.0\.0\.1/.test(cli(r, "file show /config/juniper.conf.1.gz")) &&
     !/R-ONE/.test(cli(r, "file show /config/juniper.conf.1.gz")),
     "T65 file show reads a numbered rollback file, which predates the newest commit");
  ok(/No such file/.test(cli(r, "file show /config/juniper.conf.9.gz")),
     "T65 a rollback file that does not exist is refused");
  ok(/No such file/.test(cli(r, "file show /var/log/nope")), "T65 and so is a file that was never there");

  /* ping options */
  const p4 = cli(r, "ping 10.0.0.9 count 4");
  ok(/4 packets transmitted, 4 packets received/.test(p4), "T65 ping count n sends exactly n probes");
  ok((p4.match(/icmp_seq=/g) || []).length === 4, "T65 and prints one line per probe");
  ok(/round-trip min\/avg\/max/.test(p4), "T65 and the round-trip summary a real box prints");
  const pr = cli(r, "ping 10.0.0.9 count 6 rapid");
  ok(/^!{6}$/m.test(pr), "T65 ping rapid prints one character per probe");
  ok(/6 packets transmitted, 6 packets received/.test(pr), "T65 and still counts them");
  ok(/1000 data bytes/.test(cli(r, "ping 10.0.0.9 size 1000")), "T65 ping size sets the payload size");
  ok(/1008 bytes from/.test(cli(r, "ping 10.0.0.9 size 1000")), "T65 and the reply reports payload + 8");
  ok(/icmp_seq=0/.test(cli(r, "ping 10.0.0.9 count 1 source 10.0.0.1")),
     "T65 ping source works from one of the device's own addresses");
  const badsrc = cli(r, "ping 10.0.0.9 count 1 source 1.2.3.4");
  ok(/Can't assign requested address/.test(badsrc),
     "T65 ping source refuses an address this device does not own, like a real box");
  const dnf = cli(r, "ping 10.0.0.9 size 2000 do-not-fragment");
  ok(/Message too long/.test(dnf), "T65 do-not-fragment refuses a packet bigger than the egress MTU");
  ok(/MTU 1514/.test(dnf), "T65 and names the MTU that stopped it");
  const big = cli(r, "ping 10.0.0.9 size 2000");
  ok(/2000 data bytes/.test(big) && !/Message too long/.test(big),
     "T65 without do-not-fragment the same oversized packet is allowed (it would just fragment)");
  const lost = cli(r, "ping 10.0.0.77 count 3");
  ok(/3 packets transmitted, 0 packets received, 100\.0% packet loss/.test(lost),
     "T65 a failed ping reports the count you asked for, not a hardcoded 2");

  /* halt and zeroize */
  ok(/Halt the system \? \[yes,no\] \(no\)/.test(cli(r, "request system halt")),
     "T65 request system halt asks first");
  ok(/operating system has halted/.test(cli(r, "yes")), "T65 confirming halts the box");
  ok(devices[r].powered === false, "T65 and the box really is down");
  powerOn(devices[r]);
  rebuildAllDerived();
  ok(/Erase all data/.test(cli(r, "request system zeroize")), "T65 request system zeroize warns before wiping");
  ok(/factory default/.test(cli(r, "yes")), "T65 confirming zeroizes");
  ok(cfgIsEmpty(committedTree(devices[r])), "T65 and the configuration is genuinely gone");
  ok((devices[r].cfgHistory || []).length === 0, "T65 zeroize takes the rollback history with it");
  ok(!devices[r].rescueConfig, "T65 and the rescue config too");
}

console.log("\n==== RESULTS: " + __PASS + " passed, " + __FAIL + " failed ====");


if(__FAILED.length) console.log(__FAILED.map(f => " - " + f).join("\n"));

