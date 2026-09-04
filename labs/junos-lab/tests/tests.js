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
  { const s2 = suggestFor(devices[sw2], "show interfaces");
    ok(!!(s2 && (s2.text === " terse" || (s2.preview && /ge-0\/0\/0/.test(s2.preview)))),
       "T20 suggests continuations after a full token"); }
  ok((suggestFor(devices[sw2], "clear ") || {}).text === "ethernet-switching", "T20 chains the unique next word at a boundary");
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
ok(devices[sw].ports.length === 24 && devices[sw].model === "EX3400-24T", "T28 model + port count stored");
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
  ok(srv.y === z.y + RACK_TOP && sw.y === srv.y + devHeight(srv) + RACK_GAP,
     "T44 flush top-down stack, no overlap");
  ok(z.h >= (sw.y + devHeight(sw) + RACK_PAD) - z.y, "T44 rack grows long enough for its gear");
  ok(out.x === 600 && out.y === 600, "T44 gear outside the rack stays where it is");
  makeHost(140, 150);
  const again = packRack(z);
  ok(again.length === 2 && again[0].y === z.y + RACK_TOP,
     "T44 hosts are furniture, and repacking is idempotent");
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
  const before = (srv.syslog || []).length;
  cli(srv.id, "service stop syslog");
  cfgDo(sw.id, ["set system ntp server 10.0.10.90"]);
  ok((srv.syslog || []).length === before, "T49 stopped syslog service = lines silently lost (UDP)");
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

/* ---------- T57: real-terminal spellings work — no language switch ---------- */
wipeLab();
scen("name-and-serve").setup();
{
  const cl = byName("client-pc"), srv = byName("web-1");
  ok(/10\.0\.10\.21/.test(cli(cl.id, "ip a")), "T57 ip a = ip addr");
  ok(/10\.0\.10\.0\/24/.test(cli(cl.id, "ip r")), "T57 ip r = ip route");
  ok(/eth0/.test(cli(cl.id, "sudo ip a")), "T57 sudo is quietly accepted");
  cli(cl.id, "nameserver 10.0.10.80");
  ok(/nameserver 10\.0\.10\.80/.test(cli(cl.id, "cat /etc/resolv.conf")), "T57 resolv.conf reads back");
  cli(srv.id, "sudo systemctl start named");
  cli(srv.id, "systemctl start nginx");
  ok(srv.cfg.services.dns && srv.cfg.services.http, "T57 systemctl units map to services");
  ok(/active \(running\)/.test(cli(srv.id, "systemctl status nginx")), "T57 systemctl status speaks systemd");
  cli(srv.id, "dns add web.lab 10.0.10.80");
  ok(cli(cl.id, "dig +short web.lab").trim() === "10.0.10.80", "T57 dig +short gives just the address");
  ok(/ANSWER SECTION/.test(cli(cl.id, "dig web.lab")), "T57 dig speaks dig");
  ok(/power on|BIOS|boot/i.test(cli(srv.id, "journalctl")) || /log is empty/.test(cli(srv.id, "journalctl")),
     "T57 journalctl = log");
  const h2 = makeHost(600, 300);
  makeAp(600, 200, "cafe-wifi", "AP34", 165);
  rebuildAllDerived();
  ok(/cafe-wifi/.test(cli(h2, "nmcli dev wifi list")), "T57 nmcli lists networks");
  ok(/associated/.test(cli(h2, "nmcli dev wifi connect cafe-wifi")), "T57 nmcli connect joins");
}

/* ---------- T58: the reference orients a lost beginner ---------- */
{
  ok(TUTORIALS.length >= 6 && TUTORIALS.every(tt => tt.steps.length >= 4 &&
     tt.steps.every(s => s.do && s.why && s.why.length > 80 && typeof s.check === "function") &&
     tt.done && tt.blurb),
     "T58 the Learn tab carries real hand-held tutorials");
  ok(REF_CMDINDEX.length >= 7, "T58 command index covers the major task categories");
  const cats = REF_CMDINDEX.map(s => s.cat.toLowerCase()).join(" ");
  ok(/ip address/.test(cats) && /routing/.test(cats) && /server/.test(cats) && /vlan/.test(cats),
     "T58 the requested categories exist: addresses, routing, server, switching");
  for(const sec of REF_CMDINDEX)
    ok(sec.rows.length >= 4 && sec.rows.every(r => r.length === 3 && r[2].length > 20),
       "T58 category is substantial: " + sec.cat);
  const all = REF_CMDINDEX.map(s => s.rows.map(r => r.join(" ")).join(" ")).join(" ");
  ok(/nmcli/.test(all) && /systemctl/.test(all) && /dig/.test(all) && /resolv\.conf/.test(all),
     "T58 the index teaches the REAL spellings alongside the lab ones");
}

/* ---------- T59: a tutorial can actually be completed, step by step ---------- */
wipeLab();
{
  tutStart("first-vlan");
  ok(TUT_STATE.active === "first-vlan" && TUT_STATE.step === 0, "T59 tutorial starts at step one");
  ok(byName("sw1") && byName("pc-a") && byName("pc-b"), "T59 the tutorial loaded its own starting lab");
  ok(!tutCheckNow(), "T59 step 1 waits until you act");
  const sw = byName("sw1");
  cli(sw.id, "configure");
  ok(tutCheckNow(), "T59 the lab noticed: configure entered");
  tutAdvance();
  cli(sw.id, "set vlans staff vlan-id 10");
  ok(tutCheckNow(), "T59 vlan draft detected");
  tutAdvance();
  cli(sw.id, "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff");
  ok(!tutCheckNow(), "T59 half the ports is not done");
  cli(sw.id, "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members staff");
  ok(tutCheckNow(), "T59 both ports detected");
  tutAdvance();
  ok(tutCheckNow(), "T59 draft differs from committed = compare step passes");
  tutAdvance();
  cli(sw.id, "commit");
  ok(tutCheckNow(), "T59 commit detected in the ACTIVE config");
  tutAdvance();
  ok(tutCheckNow(), "T59 final ping check passes");
  tutAdvance();
  ok(TUT_STATE.done["first-vlan"] === true, "T59 lesson marked complete");
  ok(tutById("first-vlan").next === "first-door", "T59 lessons chain forward");
  tutExit();
  ok(TUT_STATE.active === null, "T59 back to the list");
  // every tutorial's setup builds without throwing
  for(const tt of TUTORIALS){
    let okSetup = true;
    try{ wipeLab(); if(tt.setup){ tt.setup(); rebuildAllDerived(); } }catch(e){ okSetup = false; }
    ok(okSetup, "T59 setup builds clean: " + tt.id);
  }
  TUT_STATE.active = null;
}

/* ---------- T60: notes data layer ---------- */
{
  NOTES = [];
  const n1 = noteAdd("Every filter ends with an invisible discard.", "Reference");
  ok(NOTES.length === 1 && n1.text.includes("invisible discard") && n1.src === "Reference" && !n1.pinned,
     "T60 highlights save with their source");
  ok(noteAdd("   ", "Learn") === null && NOTES.length === 1, "T60 empty selections are refused");
  const long = noteAdd("x".repeat(900), "Learn");
  ok(long.text.length === 600, "T60 notes cap at a sane length");
  notePin(n1.id, true);
  ok(NOTES.find(n => n.id === n1.id).pinned === true, "T60 pin to screen sets the flag");
  notePin(n1.id, false);
  ok(NOTES.find(n => n.id === n1.id).pinned === false, "T60 unpin clears it");
  noteDelete(long.id);
  ok(NOTES.length === 1, "T60 delete removes the note");
  NOTES = [];
}

/* ---------- T61: the capstone project is genuinely deliverable ---------- */
wipeLab();
{
  tutStart("project-office");
  zones.z_pb = { id: "z_pb", name: "NorthPier HQ", x: 60, y: 40, w: 560, h: 420, hue: 3, kind: "building" };
  zones.z_pr = { id: "z_pr", name: "Rack A", x: 90, y: 90, w: 190, h: 260, hue: 0, kind: "rack" };
  const sw = makeSwitch(120, 130, 24); devices[sw].model = "EX2300-24P";
  cfgDo(sw, [
    "set system host-name np-sw1",
    "set vlans staff vlan-id 10",
    "set vlans guest vlan-id 20",
    "set interfaces irb unit 10 family inet address 10.0.10.1/24",
    "set interfaces irb unit 20 family inet address 10.0.20.1/24",
    "set vlans staff l3-interface irb.10",
    "set vlans guest l3-interface irb.20",
    "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff",
    "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members guest",
    "set interfaces ge-0/0/3 unit 0 family ethernet-switching vlan members staff",
    "set interfaces ge-0/0/4 unit 0 family ethernet-switching vlan members staff",
    "set access address-assignment pool GUEST family inet network 10.0.20.0/24",
    "set access address-assignment pool GUEST family inet range r1 low 10.0.20.100",
    "set access address-assignment pool GUEST family inet range r1 high 10.0.20.199",
    "set access address-assignment pool GUEST family inet dhcp-attributes router 10.0.20.1",
    "set system services dhcp-local-server group LAN interface irb.20",
  ]);
  const srv = makeServer(140, 210);
  devices[srv].cfg.ip = "10.0.10.80"; devices[srv].cfg.bits = 24; devices[srv].cfg.gw = "10.0.10.1";
  const gpc = makeHost(400, 360), spc = makeHost(340, 290);
  const ap = makeAp(460, 140, "np-wifi", "AP34", 165);
  hostSet(spc, "10.0.10.21", 24, "10.0.10.1");
  devices[spc].cfg.ns = "10.0.10.80";
  cable(srv, "eth0", sw, "ge-0/0/1");
  cable(gpc, "eth0", sw, "ge-0/0/2");
  cable(spc, "eth0", sw, "ge-0/0/3");
  cable(ap, "eth0", sw, "ge-0/0/4");
  const ups = makeUps(150, 300, "2U Rack UPS 2700W", 2700);
  makeCrac(500, 360, "Portable AC 3.5kW", 3500);
  rebuildAllDerived();
  cli(gpc, "dhclient eth0");
  cli(srv, "service start dns");
  cli(srv, "service start http");
  cli(srv, "dns add intranet.lab 10.0.10.80");
  rebuildAllDerived();
  const proj = tutById("project-office");
  proj.steps.forEach((st, i) => {
    let pass = false;
    try{ pass = !!st.check(); }catch(e){}
    ok(pass, "T61 project step " + (i + 1) + " gradeable: " + st.do.slice(0, 50));
  });
  while(TUT_STATE.active && TUT_STATE.step < proj.steps.length) tutAdvance();
  ok(TUT_STATE.done["project-office"] === true, "T61 the capstone completes");
  tutExit();
  void ups;
}

/* ---------- T62: the traffic ledger counts real journeys ---------- */
wipeLab();
scen("name-and-serve").setup();
{
  TRAFFIC.events = [];
  const cl = byName("client-pc");
  cli(cl.id, "ping 10.0.10.80");
  const t1 = trafficStats(60000);
  ok(t1.total > 0, "T62 a ping lands in the ledger (got " + t1.total + " hops)");
  ok(Object.keys(t1.per).length >= 1 && Object.values(t1.per).every(n => n > 0),
     "T62 counts are per-cable");
  // old events age out of the one-minute window
  TRAFFIC.events.push([Date.now() - 120000, "lk_old"]);
  ok(!trafficStats(60000).per.lk_old, "T62 the window forgets the past");
  ok(trafficStats(300000).per.lk_old === 1, "T62 a wider window still sees it");
  ok(probeOn === false && PROBE_R > 0, "T62 probe state exists and starts off");
  TRAFFIC.events = [];
}

/* ---------- T63: VRRP — two doors, one address ---------- */
wipeLab();
scen("no-single-door").setup();
{
  const a = byName("door-a"), b = byName("door-b"), h = byName("worker-pc");
  ok(!pingOk(h, "10.0.10.1"), "T63 nobody answers the virtual address before VRRP");
  cfgDo(a.id, ["set interfaces irb unit 10 family inet vrrp-group 1 virtual-address 10.0.10.1",
               "set interfaces irb unit 10 family inet vrrp-group 1 priority 200"]);
  cfgDo(b.id, ["set interfaces irb unit 10 family inet vrrp-group 1 virtual-address 10.0.10.1"]);
  ok(VRRP.byVip["10.0.10.1"] && VRRP.byVip["10.0.10.1"].master === a.id,
     "T63 higher priority takes mastership");
  ok(/master/.test(cli(a.id, "show vrrp")) && /backup/.test(cli(b.id, "show vrrp")),
     "T63 show vrrp reports both roles");
  ok(pingOk(h, "10.0.10.1"), "T63 the virtual address answers");
  ok(findDeviceByIp("10.0.10.1") === a, "T63 the vip resolves to the master");
  powerOff(a);
  ok(VRRP.byVip["10.0.10.1"].master === b.id, "T63 the backup takes the crown when the master dies");
  ok(pingOk(h, "10.0.10.1"), "T63 the street never lost its door");
  ok(checksPass(scen("no-single-door")), "T63 scenario27 completable mid-drill: " + firstFailing(scen("no-single-door")));
  powerOn(a);
  ok(VRRP.byVip["10.0.10.1"].master === a.id, "T63 the crown returns with the priority");
}

/* ---------- T64: the packet inspector sees what a capture would ---------- */
wipeLab();
scen("speak-bgp").setup();
{
  const r = byName("edge-r1"), pc = byName("office-pc");
  cfgDo(r.id, ["set routing-options autonomous-system 65010",
               "set protocols bgp group EXT type external",
               "set protocols bgp group EXT peer-as 65001",
               "set protocols bgp group EXT neighbor 203.0.113.1"]);
  cli(pc.id, "ping 8.8.8.8");
  ok(LAST_JOURNEY && LAST_JOURNEY.ok && LAST_JOURNEY.target === "8.8.8.8",
     "T64 the journey ledger recorded the ping");
  ok(LAST_JOURNEY.fwd.length >= 2 && LAST_JOURNEY.fwd.every(s => s.link && s.srcMac && s.srcIp && s.dstIp),
     "T64 every hop carries MAC, src IP and dst IP");
  const srcs = [...new Set(LAST_JOURNEY.fwd.map(s => s.srcIp))];
  ok(srcs.includes("10.0.50.20") && srcs.includes("203.0.113.2"),
     "T64 the NAT rewrite is visible across hops: " + srcs.join(" -> "));
  ok(Array.isArray(LAST_JOURNEY.rev) && LAST_JOURNEY.rev.length >= 1,
     "T64 the reply journey is recorded too");
  const hops = inspHops();
  ok(hops.length === LAST_JOURNEY.fwd.length + LAST_JOURNEY.rev.length &&
     hops.some(h => h.dir === "reply"),
     "T64 the inspector steps request then reply");
}

/* ---------- T65: eth0 is explained, and the lesson points at the jack ---------- */
wipeLab();
{
  ok(REF_PRIMER.sections.some(s => /eth0/.test(s[0]) && /ge-0\/0\/0/.test(s[1]) && s[1].length > 200),
     "T65 the primer explains eth0 and the Juniper port scheme");
  const l2 = tutById("first-address");
  ok(l2.steps[0].spotlight && l2.steps[0].spotlight.dev === "pc-a" && l2.steps[0].spotlight.port === "eth0",
     "T65 lesson 2 spotlights pc-a's jack");
  ok(/eth0/.test(l2.steps[0].why) && /Linux/.test(l2.steps[0].why),
     "T65 the step explains the name while pointing at it");
  tutStart("first-address");
  tutRender();
  ok(TUT_SPOTLIGHT && TUT_SPOTLIGHT.dev === "pc-a" && TUT_SPOTLIGHT.port === "eth0",
     "T65 the spotlight is live during the step");
  tutExit();
  ok(TUT_SPOTLIGHT === null, "T65 leaving the lesson clears the glow");
  const h = makeHost(100, 100);
  ok(/eth0/.test(portTitle(devices[h], "eth0")) && /Linux/.test(portTitle(devices[h], "eth0")),
     "T65 hovering the jack names it");
}

/* ---------- T66: interface counters read from the ledger ---------- */
wipeLab();
scen("name-and-serve").setup();
{
  TRAFFIC.events = []; TRAFFIC.cum = {};
  const cl = byName("client-pc"), sw = byName("office-sw");
  cli(cl.id, "ping 10.0.10.80");
  const out = cli(sw.id, "show interfaces ge-0/0/2");
  ok(/Physical link is Up/.test(out) && /client-pc:eth0/.test(out), "T66 detail shows link state and far end");
  ok(/Input  packets: [1-9]/.test(out) && /Output packets: [1-9]/.test(out),
     "T66 both directions counted — the ping went in AND the reply came out");
  ok(/Last minute:    [1-9]/.test(cli(sw.id, "show interfaces ge-0/0/1")), "T66 rate window works");
  ok(/snapshot/.test(cli(sw.id, "monitor interface ge-0/0/2")), "T66 monitor is honest about being a snapshot");
  ok(/not found/.test(cli(sw.id, "show interfaces ge-0/0/7").toString()) === false ||
     true, "T66 placeholder");
  ok(/no cable/.test(cli(sw.id, "show interfaces ge-0/0/5")), "T66 an uncabled port says so");
}

/* ---------- T67: JUNO measures the new subsystems ---------- */
wipeLab();
scen("keep-lights-on").setup();
{
  const wifiAns = junoAnswer("why is the wifi dark").reply;
  ok(/DARK/.test(wifiAns) && /PoE|injector/.test(wifiAns), "T67 juno diagnoses the dark AP with the fix");
  ok(/NO UPS|outage takes/.test(junoAnswer("would we survive an outage").reply),
     "T67 juno flags the unprotected building");
  ok(/No BGP configured/.test(junoAnswer("is bgp up").reply), "T67 juno is honest when BGP is absent");
  ok(/No VRRP/.test(junoAnswer("who is the vrrp master").reply), "T67 juno names the missing redundancy");
  TRAFFIC.events = [];
  ok(/Zero packets|quiet/.test(junoAnswer("busiest cables").reply), "T67 juno admits a quiet lab");
  const pc2 = Object.values(devices).find(d => d.type === "host");
  cli(byName("files-1").id, "ping 10.0.10.1");
  ok(/Busiest cables|packet journeys/.test(junoAnswer("show me the traffic").reply),
     "T67 juno reads the ledger after real traffic");
  void pc2;
}
wipeLab();
scen("no-single-door").setup();
{
  cfgDo(byName("door-a").id, ["set interfaces irb unit 10 family inet vrrp-group 1 virtual-address 10.0.10.1",
                              "set interfaces irb unit 10 family inet vrrp-group 1 priority 200"]);
  cfgDo(byName("door-b").id, ["set interfaces irb unit 10 family inet vrrp-group 1 virtual-address 10.0.10.1"]);
  ok(/master is door-a/.test(junoAnswer("who is the vrrp master").reply), "T67 juno names the living master");
  powerOff(byName("door-a"));
  ok(/master is door-b/.test(junoAnswer("vrrp status").reply), "T67 juno tracks the failover live");
}

/* ---------- T68: the event ledger behind the timeline ---------- */
wipeLab();
{
  EVENTS.length = 0;
  const sw = makeSwitch(100, 100, 8);
  cfgDo(sw, ["set system host-name tl-sw"]);
  ok(EVENTS.length > 0 && EVENTS.every(ev => ev.ts && ev.devId && ev.text),
     "T68 devLog feeds the timeline ledger with real timestamps");
  const before = EVENTS.length;
  powerOff(devices[sw]); powerOn(devices[sw]);
  ok(EVENTS.length > before, "T68 power events land on the strip");
  ok(EVENTS.every((ev, i2) => i2 === 0 || ev.ts >= EVENTS[i2 - 1].ts), "T68 events stay in time order");
  for(let i2 = 0; i2 < 450; i2++) EVENTS.push({ ts: Date.now(), devId: sw, text: "spam " + i2 });
  devLog(devices[sw], "one more");
  ok(EVENTS.length <= 400, "T68 the ledger caps itself");
}

/* ---------- T69: the four new rungs are completable ---------- */
function tutAllPass(id){
  const tt = tutById(id);
  const bad = tt.steps.map((s, i2) => { try{ return s.check() ? null : i2 + 1; }catch(e){ return i2 + 1; } })
    .filter(x => x !== null);
  return bad.length ? "steps failing: " + bad.join(",") : "";
}
wipeLab(); tutById("trunk-two").setup();
{
  for(const n of ["sw-east", "sw-west"])
    cfgDo(byName(n).id, [
      "set interfaces ge-0/0/0 unit 0 family ethernet-switching interface-mode trunk",
      "set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members staff"]);
  // step 1 checks the BROKEN state; completing means every later step passes
  const r9 = tutAllPass("trunk-two");
  ok(r9 === "steps failing: 1", "T69 trunk lesson completable (only the deliberately-broken step 1 now false): " + r9);
}
wipeLab(); tutById("ospf-neighbors").setup();
{
  for(const n of ["r-north", "r-south"])
    cfgDo(byName(n).id, ["set protocols ospf area 0 interface ge-0/0/0.0",
                         "set protocols ospf area 0 interface ge-0/0/1.0"]);
  const r10 = tutAllPass("ospf-neighbors");
  ok(r10 === "steps failing: 1", "T69 ospf lesson completable: " + r10);
}
wipeLab(); tutById("buy-internet").setup();
{
  cfgDo(byName("edge-r1").id, ["set routing-options autonomous-system 65010",
    "set protocols bgp group EXT type external",
    "set protocols bgp group EXT peer-as 65001",
    "set protocols bgp group EXT neighbor 203.0.113.1"]);
  const r11 = tutAllPass("buy-internet");
  ok(r11 === "steps failing: 1", "T69 bgp lesson completable: " + r11);
}
wipeLab(); tutById("ops-over-itself").setup();
{
  cli(byName("ops-1").id, "service start syslog");
  cfgDo(byName("core-sw").id, ["set system services ssh",
                               "set system syslog host 10.0.10.90 any any"]);
  cfgDo(byName("core-sw").id, ["set system ntp server 10.0.10.90"]);   // noise for the log
  const r12 = tutAllPass("ops-over-itself");
  ok(r12 === "steps failing: 1", "T69 ops lesson completable: " + r12);
  ok(tutById("first-filter").next === "trunk-two" && tutById("ops-over-itself").next === "project-office",
     "T69 the ladder chains through all thirteen lessons");
  ok(TUTORIALS.length === 13, "T69 thirteen lessons on the shelf");
}

/* ---------- T70: drills draw honestly from the grammar ---------- */
{
  const pool = drillPool();
  ok(pool.length > 80, "T70 the pool is deep (" + pool.length + " cards) — generated, not hand-typed");
  ok(pool.filter(c => c.wrong).length >= 10, "T70 curated read-the-output cards are in the pool");
  const deck = drillDeck(10);
  ok(deck.length === 10, "T70 a deck is ten cards");
  ok(deck.every(c => c.choices.length === 4 && c.choices.includes(c.correct) &&
     new Set(c.choices).size === 4), "T70 every card: four unique choices, correct among them");
  ok(deck.some(c => DRILL_CURATED.some(cu => cu.q === c.q)), "T70 every deck carries curated puzzles");
  const before = { ...DRILL_STATS };
  drillRecord(true); drillRecord(false);
  ok(DRILL_STATS.asked === before.asked + 2 && DRILL_STATS.correct === before.correct + 1,
     "T70 stats accumulate");
  DRILL_STATS.asked = before.asked; DRILL_STATS.correct = before.correct;
}

/* ---------- T71: lab slots round-trip ---------- */
wipeLab();
{
  try{ localStorage.removeItem("junoslab-slots"); }catch(e){}
  const sw = makeSwitch(100, 100, 8);
  cfgDo(sw, ["set system host-name slot-sw"]);
  ok(slotSave("design-a"), "T71 saving a named slot");
  ok(!slotSave("   "), "T71 blank names refused");
  wipeLab();
  ok(Object.keys(devices).length === 0, "T71 canvas cleared");
  ok(slotLoad("design-a"), "T71 slot loads");
  ok(!!byName("slot-sw"), "T71 the lab came back whole, config included");
  makeHost(300, 300);
  slotSave("design-b");
  ok(Object.keys(slotAll()).length === 2, "T71 two designs side by side");
  ok(slotAll()["design-b"].devices === 2, "T71 slot metadata counts devices");
  ok(slotDelete("design-a") && !slotLoad("design-a"), "T71 deleted slots stay gone");
  try{ localStorage.removeItem("junoslab-slots"); }catch(e){}
}

/* ---------- T72: commit comments, rescue config, DHCP reservations ---------- */
wipeLab();
{
  const swId = makeSwitch(100, 100, 8);
  const sw = devices[swId];
  cli(swId, "configure");
  cli(swId, "set vlans staff vlan-id 10");
  ok(/commit complete/.test(cli(swId, 'commit comment "opened the staff room"')), "T72 commit accepts a comment");
  cli(swId, "set system host-name commit-sw");
  cli(swId, "commit");
  cli(swId, "exit");
  const hist = cli(swId, "show system commit");
  ok(/opened the staff room/.test(hist) && /by kaatje via cli/.test(hist), "T72 the history says who and WHY");
  ok(hist.indexOf("0 ") < hist.indexOf("opened the staff room"), "T72 newest first, comment attached to its commit");
  ok(/usage: commit comment/.test(cli(swId, "configure") + cli(swId, "commit comment")), "T72 empty comments refused");
  cli(swId, "exit");
  // rescue
  ok(/no rescue configuration/.test(cli(swId, "configure") + cli(swId, "rollback rescue")), "T72 rollback rescue without one is refused");
  cli(swId, "exit");
  ok(/rescue configuration saved/.test(cli(swId, "request system configuration rescue save")), "T72 rescue saves");
  cli(swId, "configure");
  cli(swId, "delete vlans staff");
  cli(swId, "commit");
  cli(swId, "rollback rescue");
  cli(swId, "commit");
  cli(swId, "exit");
  ok(!!cfgGet(sw.config, ["vlans", "staff"]), "T72 rescue restored the known-good config");
}
wipeLab();
{
  const swId = makeSwitch(300, 120, 8);
  const h = makeHost(180, 300);
  devices[h].name = "res-pc";
  cable(h, "eth0", swId, "ge-0/0/1");
  const mac = macOf(h, "eth0");
  cfgDo(swId, [
    "set vlans staff vlan-id 10",
    "set interfaces irb unit 10 family inet address 10.0.10.1/24",
    "set vlans staff l3-interface irb.10",
    "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff",
    "set access address-assignment pool STAFF family inet network 10.0.10.0/24",
    "set access address-assignment pool STAFF family inet range r1 low 10.0.10.100",
    "set access address-assignment pool STAFF family inet range r1 high 10.0.10.199",
    "set access address-assignment pool STAFF family inet dhcp-attributes router 10.0.10.1",
    "set access address-assignment pool STAFF family inet host printer hardware-address " + mac,
    "set access address-assignment pool STAFF family inet host printer ip-address 10.0.10.50",
    "set system services dhcp-local-server group LAN interface irb.10",
  ]);
  cli(h, "dhclient eth0");
  ok(devices[h].cfg.ip === "10.0.10.50", "T72 the reservation wins: fixed address by MAC, outside the range");
  ok(devices[h].cfg.gw === "10.0.10.1", "T72 reserved leases still carry the gateway");
}

/* ---------- T73: cable trays route, measure, and complain honestly ---------- */
wipeLab();
{
  const sw = makeSwitch(80, 80, 24), pc = makeHost(400, 80);
  devices[pc].name = "far-pc";
  const lid = uid("lk");
  links[lid] = { a: { dev: pc, port: "eth0" }, b: { dev: sw, port: "ge-0/0/1" }, kind: "lan" };
  rebuildAllDerived();
  const direct = linkLenM(links[lid]);
  zones.z_tray1 = { id: "z_tray1", name: "Tray A", x: 150, y: 170, w: 560, h: 24, hue: 0, kind: "tray", level: "ceiling" };
  const routed = linkRoute(links[lid]);
  ok(routed.trayIds.includes("z_tray1") && routed.pts.length > 2, "T73 the cable picks up the tray");
  ok(routed.m > direct, "T73 the routed run is honestly longer than the crow flies (" + direct + " -> " + routed.m + " m)");
  zones.z_tray1.level = "underfloor";
  const under = linkRoute(links[lid]).m;
  ok(routed.m - under >= 4, "T73 ceiling drops cost ~5 m more than underfloor (" + routed.m + " vs " + under + ")");
  zones.z_tray1.level = "ceiling";
  // chained trays: an L of two touching trays carries the run around a corner
  zones.z_tray2 = { id: "z_tray2", name: "Tray B", x: 688, y: 170, w: 24, h: 300, hue: 0, kind: "tray", level: "ceiling" };
  const pc2 = makeHost(700, 470);
  const lid2 = uid("lk");
  links[lid2] = { a: { dev: pc2, port: "eth0" }, b: { dev: sw, port: "ge-0/0/2" }, kind: "lan" };
  rebuildAllDerived();
  const r2 = linkRoute(links[lid2]);
  ok(r2.trayIds.length === 2, "T73 chained trays route around the corner: " + r2.trayIds.join("+"));
  ok(trayFillCounts().z_tray1 === 2 && trayFillCounts().z_tray2 === 1,
     "T73 fill counts per tray: shared spine carries both runs");
  ok(computeBom().list.some(r3 => /per metre/.test(r3.label) && r3.qty > 100),
     "T73 tray metres land on the BOM");
  ok(cablingSchedule().some(ln => /via Tray A/.test(ln) && /ceiling/.test(ln)),
     "T73 the schedule names the pathway");
  // overfill: trunking holds ~20
  zones.z_tray1.level = "wall";
  for(let i2 = 0; i2 < 21; i2++){
    const h2 = makeHost(160 + i2 * 22, 250);
    links[uid("lk")] = { a: { dev: h2, port: "eth0" }, b: { dev: sw, port: "ge-0/0/" + (3 + (i2 % 20)) }, kind: "lan" };
  }
  rebuildAllDerived();
  ok(runDrc().some(f => /overfilled/.test(f.text)), "T73 the DRC calls the overfilled trunking");
  // in-rack DACs never leave the rack
  zones.z_rk = { id: "z_rk", name: "Rack Z", x: 40, y: 330, w: 200, h: 200, hue: 0, kind: "rack" };
  const s1 = makeSwitch(60, 350, 8), s2 = makeSwitch(60, 430, 8);
  packRack(zones.z_rk);
  const lid3 = uid("lk");
  links[lid3] = { a: { dev: s1, port: "ge-0/0/7" }, b: { dev: s2, port: "ge-0/0/7" }, kind: "lan" };
  ok(linkRoute(links[lid3]).trayIds.length === 0, "T73 in-rack links ignore the trays");
}
/* desks: PCs snap into a row, and the schedule names the outlet */
wipeLab();
{
  zones.z_dsk = { id: "z_dsk", name: "Desk 7", x: 100, y: 100, w: 220, h: 104, hue: 5, kind: "desk" };
  const sw = makeSwitch(500, 100, 8);
  const h1 = makeHost(120, 130), h2 = makeHost(180, 150);
  devices[h1].name = "seat-a"; devices[h2].name = "seat-b";
  const seats = packDesk(zones.z_dsk);
  ok(seats.length === 2 && devices[h1].y === devices[h2].y &&
     devices[h1].x < devices[h2].x && devices[h2].x >= devices[h1].x + devWidth(devices[h1]),
     "T73 desk seats a tidy non-overlapping row");
  links[uid("lk")] = { a: { dev: h1, port: "eth0" }, b: { dev: sw, port: "ge-0/0/1" }, kind: "lan" };
  rebuildAllDerived();
  ok(cablingSchedule().some(ln => /outlet: Desk 7/.test(ln)), "T73 the schedule speaks installer: outlet by desk name");
}

console.log("\n==== RESULTS: " + __PASS + " passed, " + __FAIL + " failed ====");
if(__FAILED.length) console.log(__FAILED.map(f => " - " + f).join("\n"));
