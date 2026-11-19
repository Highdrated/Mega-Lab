const COLO_HYGIENE = "Multi-tenant datacenter: hygiene";
const COLO_ISOLATION = "Multi-tenant datacenter: isolation";
const COLO_PROVISION = "Multi-tenant datacenter: provisioning";
const COLO_INCIDENT = "Multi-tenant datacenter: incidents";
const COLO_INTRO = "You run a colocation hall shared by three customers. Rack M1 is yours: edge-rtr and colo-core. Each customer has a cage with its own switch and server: Acme (VLAN 110, 10.200.10.0/24, acme-sw, acme-web-1), Borealis (VLAN 120, 10.200.20.0/24, bor-sw, bor-db-1) and Cobalt (VLAN 130, 10.200.30.0/24, cob-sw, cob-app-1). Every customer's gateway is .1 on colo-core, their switch answers on .2, and a filter on each gateway keeps the customers apart. Your NOC sits in its own building (VLAN 99, 10.99.0.0/24): noc-pc is a Windows PC at 10.99.0.20 and noc-monitor-1 is the monitoring server at 10.99.0.50. ";
const COLO_TENANTS = [
  { key: "acme", name: "Acme", vid: 110, net: "10.200.10", sw: "acme-sw", srv: "acme-web-1", srvRole: "Dell server · Acme web", port: "ge-0/0/1", filter: "ACME-IN", rackX: 380 },
  { key: "borealis", name: "Borealis", vid: 120, net: "10.200.20", sw: "bor-sw", srv: "bor-db-1", srvRole: "Dell server · Borealis DB", port: "ge-0/0/2", filter: "BOR-IN", rackX: 670 },
  { key: "cobalt", name: "Cobalt", vid: 130, net: "10.200.30", sw: "cob-sw", srv: "cob-app-1", srvRole: "Dell server · Cobalt app", port: "ge-0/0/3", filter: "COB-IN", rackX: 960 },
];
function coloTenant(key){ return COLO_TENANTS.find(t => t.key === key); }
function coloFilterCmds(t){
  const cmds = [];
  COLO_TENANTS.filter(o => o !== t).forEach(o => {
    cmds.push("set firewall family inet filter " + t.filter + " term no-" + o.key + " from destination-address " + o.net + ".0/24");
    cmds.push("set firewall family inet filter " + t.filter + " term no-" + o.key + " then discard");
  });
  cmds.push("set firewall family inet filter " + t.filter + " term ok then accept");
  cmds.push("set interfaces irb unit " + t.vid + " family inet filter input " + t.filter);
  return cmds;
}
function coloCoreTenantCmds(t){
  return [
    "set vlans " + t.key + " vlan-id " + t.vid,
    "set interfaces irb unit " + t.vid + " family inet address " + t.net + ".1/24",
    "set vlans " + t.key + " l3-interface irb." + t.vid,
    "set interfaces " + t.port + " unit 0 family ethernet-switching interface-mode trunk",
    "set interfaces " + t.port + " unit 0 family ethernet-switching vlan members " + t.key,
  ].concat(coloFilterCmds(t));
}
function coloSwitchCmds(t){
  return [
    "set system host-name " + t.sw,
    "set vlans " + t.key + " vlan-id " + t.vid,
    "set interfaces ge-0/0/0 unit 0 family ethernet-switching interface-mode trunk",
    "set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members " + t.key,
    "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members " + t.key,
    "set interfaces irb unit " + t.vid + " family inet address " + t.net + ".2/24",
    "set vlans " + t.key + " l3-interface irb." + t.vid,
    "set routing-options static route 0.0.0.0/0 next-hop " + t.net + ".1",
  ];
}
function coloBase(opts){
  opts = opts || {};
  const C = { sw: {}, srv: {} };
  C.hall = siteZone("Colo hall", 60, 140, 1190, 580, "building", 2);
  C.noc = siteZone("NOC", 1310, 140, 520, 320, "building", 4);
  siteZone("Rack M1 · provider", 90, 200, 260, 390, "rack");
  COLO_TENANTS.forEach((t, i) => siteZone("Cage " + "ABC"[i] + " · " + t.name, t.rackX, 200, 260, 390, "rack"));
  makeCrac(90, 640, "In-row CRAC 10kW", 10000);
  makeCrac(1600, 380, "AC-NOC", 3500);
  C.isp = makeIsp(170, 40, "203.0.113.1");
  C.edge = siteRole(makeRouter(107, 240, 4), "Juniper SRX345 · edge");
  C.core = siteRole(makeSwitch(107, 360, 12), "Juniper EX4300 · core");
  cable(C.edge, "ge-0/0/0", C.isp, "wan0", "remote");
  cable(C.edge, "ge-0/0/1", C.core, "ge-0/0/0");
  const edgeCmds = [
    "set system host-name edge-rtr",
    "set interfaces ge-0/0/0 unit 0 family inet address 203.0.113.2/30",
    "set interfaces ge-0/0/1 unit 0 family inet address 10.255.0.1/30",
    "set routing-options static route 0.0.0.0/0 next-hop 203.0.113.1",
    "set routing-options static route 10.99.0.0/24 next-hop 10.255.0.2",
    "set security nat source rule-set COLO from interface ge-0/0/1.0",
    "set security nat source rule-set COLO to interface ge-0/0/0.0",
    "set security nat source rule-set COLO rule R1 match source-address 10.0.0.0/8",
    "set security nat source rule-set COLO rule R1 then source-nat interface",
  ];
  COLO_TENANTS.forEach(t => edgeCmds.push("set routing-options static route " + t.net + ".0/24 next-hop 10.255.0.2"));
  cfgDo(C.edge, edgeCmds);
  let coreCmds = [
    "set system host-name colo-core",
    "set vlans transit vlan-id 900",
    "set vlans noc vlan-id 99",
    "set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members transit",
    "set interfaces ge-0/0/8 unit 0 family ethernet-switching vlan members noc",
    "set interfaces ge-0/0/9 unit 0 family ethernet-switching vlan members noc",
    "set interfaces irb unit 900 family inet address 10.255.0.2/30",
    "set interfaces irb unit 99 family inet address 10.99.0.1/24",
    "set vlans transit l3-interface irb.900",
    "set vlans noc l3-interface irb.99",
    "set routing-options static route 0.0.0.0/0 next-hop 10.255.0.1",
  ];
  COLO_TENANTS.forEach(t => {
    const fresh = opts.fresh === t.key;
    if(!fresh) coreCmds = coreCmds.concat(coloCoreTenantCmds(t));
    const sw = makeSwitch(t.rackX + 17, 240, 12);
    const srv = siteServer(t.srv, t.rackX + 17, 360, t.srvRole);
    C.sw[t.key] = sw; C.srv[t.key] = srv;
    cable(sw, "ge-0/0/0", C.core, t.port);
    cable(srv, "eth0", sw, "ge-0/0/1");
    if(fresh){ siteFresh(sw); return; }
    siteRole(sw, "Juniper EX2300 · " + t.name);
    cfgDo(sw, coloSwitchCmds(t));
    hostSet(srv, t.net + ".10", 24, t.net + ".1");
  });
  cfgDo(C.core, coreCmds);
  C.nocpc = siteHost("noc-pc", 1330, 200, "windows");
  hostSet(C.nocpc, "10.99.0.20", 24, "10.99.0.1");
  C.mon = siteServer("noc-monitor-1", 1330, 320, "Linux server · monitoring");
  hostSet(C.mon, "10.99.0.50", 24, "10.99.0.1");
  devices[C.mon].cfg.services = { syslog: true, ntp: true, snmp: true, nms: true };
  cable(C.nocpc, "eth0", C.core, "ge-0/0/8");
  cable(C.mon, "eth0", C.core, "ge-0/0/9");
  sitePack();
  rebuildAllDerived();
  return C;
}
function coloNet(key, last){ return coloTenant(key).net + "." + last; }
function coloOnline(key){ const t = coloTenant(key); return pingOk(t.srv, t.net + ".1") && pingOk(t.srv, "8.8.8.8"); }
function coloApart(a, b){
  const A = coloTenant(a), B = coloTenant(b);
  return !pingOk(A.srv, B.net + ".10") && !pingOk(B.srv, A.net + ".10");
}
function coloTcp(hostName, ip){
  const h = byName(hostName);
  if(!h) return false;
  try{ return pingRun(h, ip, { proto: "tcp" }).ok; }catch(e){ return false; }
}
function coloDesc(swName, port){
  const sw = byName(swName);
  const d = sw && cfgGet(sw.config, ["interfaces", port, "description"]);
  return typeof d === "string" ? d : "";
}
function coloPortOf(devName){
  const d = byName(devName);
  if(!d) return null;
  const entry = linksOf(d.id, "eth0")[0];
  if(!entry) return null;
  const l = entry[1];
  const other = l.a.dev === d.id ? l.b : l.a;
  return { sw: devices[other.dev], port: other.port };
}
function coloHall(){ return Object.values(zones).find(z => z.name === "Colo hall"); }

const COLO_SCENARIOS = [
  {
    id: "colo-named-accounts",
    tour: { touch: ["bor-sw", "noc-pc"] },
    group: COLO_HYGIENE,
    title: "45. Audit Finding: No Named Accounts",
    intro: COLO_INTRO,
    desc: "TICKET: the audit found that bor-sw can only be managed as root at the console. Give it a personal account (user noc-admin, class super-user, with a password), turn on SSH, and prove you can reach it from noc-pc.",
    setup(){ coloBase(); },
    checks: [
      { desc: "bor-sw has a named user with a login class and a password",
        why: "A shared root login leaves no trace of who did what. Without personal accounts the log after an outage only ever says root.",
        test: () => { const sw = byName("bor-sw");
          const us = sw && cfgGet(sw.config, ["system", "login", "user"]);
          return !!us && Object.values(us).some(u => u && u.class && u.authentication); } },
      { desc: "SSH is enabled on bor-sw",
        why: "Without SSH the only way in is a console cable in the cage. That is fine on day zero and useless at 3 a.m. from home.",
        test: () => { const sw = byName("bor-sw"); return !!(sw && cfgGet(sw.config, ["system", "services", "ssh"])); } },
      { desc: "noc-pc reaches bor-sw on port 22 (10.200.20.2)",
        why: "A service that is on but unreachable helps nobody. Without testing from the NOC you do not know the path through the gateway works.",
        test: () => { const sw = byName("bor-sw");
          return !!(sw && cfgGet(sw.config, ["system", "services", "ssh"])) && coloTcp("noc-pc", "10.200.20.2"); } },
      { desc: "Borealis is still online",
        why: "Hardening must never cost the customer their service. Without this check a typo on their switch becomes their outage.",
        test: () => coloOnline("borealis") },
    ],
    hints: [
      "Click bor-sw and look first: show configuration system. No login section and no services means root-at-the-console only.",
      "In configure mode: set system login user noc-admin class super-user, then set system login user noc-admin authentication plain-text-password. Press Enter and Junos asks for the password twice, as it did for root.",
      "Then set system services ssh and commit.",
      "Prove it from the Windows PC: on noc-pc, ssh noc-admin@10.200.20.2. Refused means SSH is off, timed out means the path is broken.",
    ],
  },
  {
    id: "colo-mystery-port",
    tour: { touch: ["cob-sw", "unlabelled-device"] },
    group: COLO_HYGIENE,
    title: "46. What Is Plugged into Port 7?",
    intro: COLO_INTRO,
    desc: "TICKET: a walk-through found a device nobody ordered, cabled to cob-sw port ge-0/0/7 inside Cobalt's cage. Find out what it is from the switch, move that port into a new VLAN quarantine (id 999, no gateway) so it can reach nothing, and label ports ge-0/0/0, ge-0/0/1 and ge-0/0/7 with a description so the next engineer does not have to guess.",
    setup(){
      const C = coloBase();
      const m = siteHost("unlabelled-device", 980, 630, "linux");
      hostSet(m, "10.200.30.77", 24, "10.200.30.1");
      cable(m, "eth0", C.sw.cobalt, "ge-0/0/7");
      cfgDo(C.sw.cobalt, ["set interfaces ge-0/0/7 unit 0 family ethernet-switching vlan members cobalt"]);
    },
    checks: [
      { desc: "cob-sw port ge-0/0/7 sits in VLAN 999",
        why: "An unknown device inside a customer VLAN can talk to that customer's servers. Without moving the port it stays a guest in their network.",
        test: () => siteVlanIdOfHost("unlabelled-device") === 999 },
      { desc: "The unknown device can no longer reach cob-app-1",
        why: "Quarantine only counts if it is proven. Without the test you have a new VLAN name and the same exposure.",
        test: () => !pingOk("unlabelled-device", "10.200.30.10") },
      { desc: "Ports ge-0/0/0, ge-0/0/1 and ge-0/0/7 on cob-sw each have a description",
        why: "A description is the label on the cable, kept where it cannot fall off. Without it every future ticket starts with tracing wires.",
        test: () => ["ge-0/0/0", "ge-0/0/1", "ge-0/0/7"].every(p => coloDesc("cob-sw", p).length > 2) },
      { desc: "Cobalt is still online",
        why: "You are working inside a paying customer's cage. Without checking their server you may have quarantined the wrong port.",
        test: () => coloOnline("cobalt") },
    ],
    hints: [
      "Ask the switch what it sees: show ethernet-switching table lists the MAC address learned on ge-0/0/7, and show lldp neighbors tells you what the uplink and server ports connect to. An empty table only means nothing has talked yet: open the unknown device, ping 10.200.30.1 once, and look again.",
      "Make the dead-end VLAN: set vlans quarantine vlan-id 999. Give it no l3-interface, so nothing routes out of it.",
      "Move the port: delete interfaces ge-0/0/7 unit 0 family ethernet-switching vlan members cobalt, then set interfaces ge-0/0/7 unit 0 family ethernet-switching vlan members quarantine.",
      "Label as you go: set interfaces ge-0/0/7 description unknown-device-quarantined, set interfaces ge-0/0/0 description uplink-colo-core, set interfaces ge-0/0/1 description cob-app-1. Commit.",
    ],
  },
  {
    id: "colo-monitoring-gap",
    tour: { touch: ["cob-sw", "noc-monitor-1"] },
    group: COLO_HYGIENE,
    title: "47. Nothing Shows Up in Monitoring",
    intro: COLO_INTRO,
    desc: "TICKET: Cobalt's switch was installed last week and the NOC screen shows nothing for it: no logs, no clock source, nothing to poll. On cob-sw, send logs to noc-monitor-1 (10.99.0.50), take time from it, and add a read-only SNMP community. One service on the monitoring server itself is also stopped: find it and start it.",
    setup(){
      const C = coloBase();
      devices[C.mon].cfg.services.ntp = false;
    },
    checks: [
      { desc: "cob-sw sends its log to 10.99.0.50",
        why: "A switch keeps its log on itself. Without a copy elsewhere the evidence dies with the box that failed.",
        test: () => { const sw = byName("cob-sw"); return !!(sw && cfgGet(sw.config, ["system", "syslog", "host", "10.99.0.50"])); } },
      { desc: "A log line from cob-sw has arrived on noc-monitor-1",
        why: "Configured is not the same as flowing. Without seeing a real line arrive you are trusting a setting you never tested.",
        test: () => { const s = byName("noc-monitor-1"); return !!(s && (s.syslog || []).some(ln => ln.includes("cob-sw"))); } },
      { desc: "cob-sw takes time from 10.99.0.50, and the NTP service there is running",
        why: "Logs from two devices only line up if their clocks agree. Without a shared time source you cannot say which event came first.",
        test: () => { const sw = byName("cob-sw"), s = byName("noc-monitor-1");
          const n = sw && cfgGet(sw.config, ["system", "ntp", "server"]);
          return !!(n && [].concat(n).includes("10.99.0.50") && s && s.cfg.services && s.cfg.services.ntp); } },
      { desc: "cob-sw has a read-only SNMP community",
        why: "SNMP is how the monitoring screen reads port and health counters. Without read-only you hand every poller the right to change the switch.",
        test: () => { const sw = byName("cob-sw");
          const c = sw && cfgGet(sw.config, ["snmp", "community"]);
          return !!c && Object.values(c).some(v => v && v.authorization === "read-only"); } },
    ],
    hints: [
      "Compare with a neighbour that works: show configuration system and show configuration snmp on cob-sw are almost empty. On noc-monitor-1, service status shows what is running.",
      "On cob-sw: set system syslog host 10.99.0.50 any any and set system ntp server 10.99.0.50.",
      "Also on cob-sw: set snmp community colo-ro authorization read-only. Commit. The commit itself produces the first log line.",
      "On noc-monitor-1 (a Linux server): service start ntp, then log to read what has arrived.",
    ],
  },
  {
    id: "colo-wrong-handover",
    tour: { start: ["bor-db-1", "bor-sw"] },
    group: COLO_HYGIENE,
    title: "48. The Handover Note Is Wrong",
    intro: COLO_INTRO,
    desc: "TICKET: Borealis is down since last night's cable tidy-up. The handover note says bor-db-1 is on bor-sw port ge-0/0/1, and the switch's own description on that port agrees. Believe the switch's live tables, not the note: find where the server really is, bring Borealis back, and correct the port descriptions so the record matches reality.",
    setup(){
      const C = coloBase();
      const entry = linksOf(C.srv.borealis, "eth0")[0];
      delete links[entry[0]];
      cable(C.srv.borealis, "eth0", C.sw.borealis, "ge-0/0/4");
      cfgDo(C.sw.borealis, ["set interfaces ge-0/0/1 description bor-db-1"]);
    },
    checks: [
      { desc: "bor-db-1 reaches its gateway and the internet again",
        why: "The server never changed, only the socket did. Without the right VLAN on the port it is really in, it sits in vlan default with no gateway.",
        test: () => coloOnline("borealis") },
      { desc: "The port bor-db-1 is really cabled to carries a description naming it",
        why: "The description is the documentation that travels with the switch. Without updating it the next engineer repeats tonight's search.",
        test: () => { const p = coloPortOf("bor-db-1");
          return !!(p && p.sw && p.sw.name === "bor-sw" && coloDesc("bor-sw", p.port).includes("bor-db-1")); } },
      { desc: "No other port on bor-sw still claims to be bor-db-1",
        why: "A wrong label is worse than no label, because people trust it. Without removing the stale one the note stays wrong in a new way.",
        test: () => { const p = coloPortOf("bor-db-1"), sw = byName("bor-sw");
          if(!p || !sw) return false;
          return Object.keys(cfgGet(sw.config, ["interfaces"]) || {}).every(ifn => ifn === p.port || !coloDesc("bor-sw", ifn).includes("bor-db-1")); } },
    ],
    hints: [
      "On bor-sw: show interfaces terse. Which access port is up? Then show lldp neighbors: servers announce themselves, so the real port names bor-db-1.",
      "The live answer is ge-0/0/4, sitting in vlan default. Put it in the customer VLAN: set interfaces ge-0/0/4 unit 0 family ethernet-switching vlan members borealis.",
      "Fix the record: set interfaces ge-0/0/4 description bor-db-1 and delete interfaces ge-0/0/1 description (or set it to spare). Commit, then ping from bor-db-1.",
    ],
  },
  {
    id: "colo-tenant-leak",
    tour: { start: ["acme-web-1", "bor-db-1"] },
    group: COLO_ISOLATION,
    title: "49. Customer A Can See Customer B",
    intro: COLO_INTRO,
    desc: "TICKET: Borealis reports connection attempts on their database from an Acme address. Somebody opened the path between the two customers for a migration and never closed it. Find the hole on colo-core and close it in both directions, without cutting either customer off from the internet or from the NOC.",
    setup(){
      const C = coloBase();
      cfgDo(C.core, [
        "delete firewall family inet filter ACME-IN term no-borealis",
        "delete firewall family inet filter BOR-IN term no-acme",
      ]);
    },
    checks: [
      { desc: "acme-web-1 and bor-db-1 cannot reach each other",
        why: "Customers share your switch, not their data. Without a block on each gateway the core happily routes between them like any two VLANs.",
        test: () => coloApart("acme", "borealis") },
      { desc: "Cobalt is still separated from both",
        why: "A firewall edit can open one door while closing another. Without re-testing the customer you did not touch, you cannot know.",
        test: () => coloApart("acme", "cobalt") && coloApart("borealis", "cobalt") },
      { desc: "Acme and Borealis are both still online",
        why: "Filters end in an invisible discard-everything rule. Without the final accept term your fix blocks the internet along with the neighbour.",
        test: () => coloOnline("acme") && coloOnline("borealis") },
      { desc: "noc-pc still reaches both customers' switches",
        why: "You manage their gear from the NOC. Without that path a tidy filter locks out the people who have to maintain it.",
        test: () => pingOk("noc-pc", "10.200.10.2") && pingOk("noc-pc", "10.200.20.2") },
    ],
    hints: [
      "Prove the leak first: from acme-web-1, ping 10.200.20.10. Then compare the three filters on colo-core with show configuration firewall. COB-IN is intact, so it shows what the other two should look like.",
      "ACME-IN lost its term for Borealis: set firewall family inet filter ACME-IN term no-borealis from destination-address 10.200.20.0/24 and set firewall family inet filter ACME-IN term no-borealis then discard.",
      "BOR-IN lost its term for Acme: the same two lines with BOR-IN, no-acme and 10.200.10.0/24.",
      "Order matters in a filter: terms run top to bottom and the accept term must come last. After commit run show configuration firewall. A new term always lands at the bottom, after ok, so move it up: insert firewall family inet filter ACME-IN term no-borealis before term ok.",
    ],
  },
  {
    id: "colo-rogue-switch",
    tour: { touch: ["acme-sw", "acme-laptop-1", "acme-laptop-2"] },
    group: COLO_ISOLATION,
    title: "50. An Unapproved Switch in the Cage",
    intro: COLO_INTRO,
    desc: "TICKET: Acme's contract allows one device per cage port. Their staff plugged a small desktop switch into acme-sw port ge-0/0/5 and hung two laptops off it. Enforce the contract on that port: allow one MAC address and shut the port when a second one appears. Their web server must not notice.",
    setup(){
      const C = coloBase();
      const dumb = siteRole(makeSwitch(397, 450, 5), "Desktop switch · not ours");
      cfgDo(dumb, ["set system host-name acme-desk-switch"]);
      cable(dumb, "ge-0/0/0", C.sw.acme, "ge-0/0/5");
      cfgDo(C.sw.acme, ["set interfaces ge-0/0/5 unit 0 family ethernet-switching vlan members acme"]);
      const a = siteHost("acme-laptop-1", 400, 630, "windows"), b = siteHost("acme-laptop-2", 505, 630, "macos");
      hostSet(a, "10.200.10.51", 24, "10.200.10.1");
      hostSet(b, "10.200.10.52", 24, "10.200.10.1");
      cable(a, "eth0", dumb, "ge-0/0/1");
      cable(b, "eth0", dumb, "ge-0/0/2");
      sitePack();
    },
    checks: [
      { desc: "acme-sw port ge-0/0/5 allows one MAC address and shuts down on a violation",
        why: "The switch counts the devices behind a port by their MAC addresses. Without a limit one cage port quietly becomes ten.",
        test: () => { const sw = byName("acme-sw");
          const lim = sw && D(sw).macLimit && D(sw).macLimit["ge-0/0/5"];
          return !!(lim && lim.limit === 1 && lim.shutdown); } },
      { desc: "The port has tripped: ge-0/0/5 is shut by the limit",
        why: "A rule that never fires is only a line of config. Without traffic from the second laptop you have not seen it work.",
        test: () => { const sw = byName("acme-sw"); return !!(sw && sw.errDisabled["ge-0/0/5"]); } },
      { desc: "acme-web-1 is still online",
        why: "Enforcement should hit the one port that broke the rule. Without this check you do not know the damage stayed that small.",
        test: () => coloOnline("acme") },
    ],
    hints: [
      "See it from the switch: on acme-sw, show ethernet-switching table. One port with several MAC addresses means there is a switch behind it.",
      "Arm the port: set switch-options interface ge-0/0/5 interface-mac-limit 1 and set switch-options interface ge-0/0/5 packet-action shutdown. Commit.",
      "Nothing happens until both laptops talk. Ping the gateway from each: ping 10.200.10.1 on acme-laptop-1 (Windows) and on acme-laptop-2 (Mac). The second one trips the port.",
      "Read the evidence on acme-sw: show log messages records the MAC limit, and show interfaces terse shows the port down.",
    ],
  },
  {
    id: "colo-contractor-filter",
    tour: { touch: ["colo-core", "contractor-mac"] },
    group: COLO_ISOLATION,
    title: "51. A Contractor on Your Network",
    intro: COLO_INTRO,
    desc: "TICKET: an electrician needs internet for a week. His Mac, contractor-mac, is on colo-core port ge-0/0/10 in VLAN contractor (id 98, 10.98.0.0/24, gateway 10.98.0.1) and already online. Right now he can also reach every customer and your NOC. Write a filter on his gateway so he gets the internet and nothing else in the building.",
    setup(){
      const C = coloBase();
      cfgDo(C.core, [
        "set vlans contractor vlan-id 98",
        "set interfaces irb unit 98 family inet address 10.98.0.1/24",
        "set vlans contractor l3-interface irb.98",
        "set interfaces ge-0/0/10 unit 0 family ethernet-switching vlan members contractor",
      ]);
      cfgDo(C.edge, ["set routing-options static route 10.98.0.0/24 next-hop 10.255.0.2"]);
      const m = siteHost("contractor-mac", 1470, 200, "macos");
      hostSet(m, "10.98.0.20", 24, "10.98.0.1");
      cable(m, "eth0", C.core, "ge-0/0/10");
    },
    checks: [
      { desc: "contractor-mac cannot reach any customer server",
        why: "The core routes between every VLAN it has a gateway for. Without a filter a visitor's laptop is one hop from three customers' machines.",
        test: () => COLO_TENANTS.every(t => !pingOk("contractor-mac", t.net + ".10")) },
      { desc: "contractor-mac cannot reach the NOC (10.99.0.50)",
        why: "Your monitoring server knows every device in the hall. Without blocking it, the visitor network can poke at your own tools.",
        test: () => !pingOk("contractor-mac", "10.99.0.50") },
      { desc: "contractor-mac still reaches the internet (8.8.8.8)",
        why: "Every filter ends with a hidden discard. Without a final accept term you solve the ticket by cutting him off completely.",
        test: () => pingOk("contractor-mac", "8.8.8.8") },
      { desc: "The customers and the NOC are unaffected",
        why: "The filter belongs on the contractor's gateway only. Without checking the others you may have attached it to the wrong interface.",
        test: () => COLO_TENANTS.every(t => coloOnline(t.key)) && pingOk("noc-pc", "10.200.10.2") },
    ],
    hints: [
      "See the problem from his side: on contractor-mac, ping 10.200.10.10 and ping 10.99.0.50 both answer. Look at how ACME-IN is built on colo-core for the pattern.",
      "Block the two internal ranges: set firewall family inet filter CONTRACTOR-IN term no-customers from destination-address 10.200.0.0/16. Its action: set firewall family inet filter CONTRACTOR-IN term no-customers then discard. Then the same two lines again as term no-noc for 10.99.0.0/24.",
      "Let the rest through: set firewall family inet filter CONTRACTOR-IN term ok then accept.",
      "Attach it where his traffic enters: set interfaces irb unit 98 family inet filter input CONTRACTOR-IN. Commit, then ping again from the Mac.",
    ],
  },
  {
    id: "colo-onboard-tenant",
    tour: { touch: ["@fresh", "colo-core", "cob-app-1"] },
    group: COLO_PROVISION,
    title: "52. Onboard a New Customer: Cobalt",
    intro: COLO_INTRO.replace("Cobalt (VLAN 130, 10.200.30.0/24, cob-sw, cob-app-1)", "Cobalt, who move in today"),
    desc: "PROJECT: Cage C holds a factory-fresh switch (uplink already cabled to colo-core ge-0/0/3) and the server cob-app-1 on its ge-0/0/1. Build Cobalt exactly like the other two: VLAN cobalt id 130, gateway 10.200.30.1/24 on colo-core, a trunk to the cage, day zero on the switch (name it cob-sw), the server on 10.200.30.10/24, and a filter COB-IN on their gateway that keeps them apart from Acme and Borealis. The edge router already routes 10.200.30.0/24 to the core.",
    setup(){ coloBase({ fresh: "cobalt" }); },
    checks: [
      { desc: "The cage switch is powered, has a root password and a committed host-name",
        why: "A customer's switch goes live named and secured. Without day zero it refuses its first commit and stays a factory box.",
        test: () => siteDayZero(siteNeighbor("colo-core", "ge-0/0/3")) },
      { desc: "cob-app-1 has 10.200.30.10/24 and reaches its gateway 10.200.30.1",
        why: "The gateway lives on colo-core, the server in the cage. Without VLAN 130 on both switches and on the trunk between them, the two never meet.",
        test: () => { const s = byName("cob-app-1"); return !!(s && s.cfg.ip === "10.200.30.10" && s.cfg.bits === 24) && pingOk("cob-app-1", "10.200.30.1"); } },
      { desc: "cob-app-1 reaches the internet",
        why: "This is what Cobalt pays for. Without a default gateway on the server the service ends at your core switch.",
        test: () => pingOk("cob-app-1", "8.8.8.8") },
      { desc: "Cobalt cannot reach Acme or Borealis, and they cannot reach Cobalt",
        why: "A new gateway on the core is routed to every other VLAN the moment it commits. Without COB-IN the new customer arrives wide open.",
        test: () => coloApart("cobalt", "acme") && coloApart("cobalt", "borealis") &&
          (() => { const core = byName("colo-core"); return !!(core && cfgGet(core.config, ["interfaces", "irb", "unit", "130", "family", "inet", "filter", "input"])); })() },
      { desc: "Acme and Borealis are still online",
        why: "You worked on the shared core in the middle of the day. Without this check a slip on your side is their outage.",
        test: () => coloOnline("acme") && coloOnline("borealis") },
    ],
    hints: [
      "Use Acme as the template: on colo-core, show configuration and read everything that mentions acme or 110. Cobalt needs the same lines with cobalt, 130, 10.200.30 and ge-0/0/3.",
      "Core: set vlans cobalt vlan-id 130, irb unit 130 with 10.200.30.1/24, vlans cobalt l3-interface irb.130, and ge-0/0/3 as a trunk with vlan members cobalt.",
      "The cage switch is factory-fresh, so day zero comes first: power it on, log in as root, type cli, then configure, set system host-name cob-sw, set system root-authentication plain-text-password, and commit.",
      "Then the customer's VLAN on the cage switch: set vlans cobalt vlan-id 130, make ge-0/0/0 a trunk that carries it, and put ge-0/0/1 in it as an access port.",
      "The server needs an address and a gateway. On cob-app-1: ip addr add 10.200.30.10/24 dev eth0 and ip route add default via 10.200.30.1.",
      "Filter on the core: COB-IN with term no-acme (destination 10.200.10.0/24, discard), term no-borealis (10.200.20.0/24, discard), term ok then accept, and set interfaces irb unit 130 family inet filter input COB-IN.",
    ],
  },
  {
    id: "colo-decommission",
    tour: { touch: ["colo-core", "edge-rtr"] },
    group: COLO_PROVISION,
    title: "53. A Customer Leaves: Decommission Borealis",
    intro: COLO_INTRO,
    desc: "TICKET: Borealis' contract ended and their cage is being emptied. Remove every trace of them from YOUR equipment: on colo-core the VLAN, the gateway irb.120, the filter BOR-IN and the trunk config on ge-0/0/2 (shut that port), and on edge-rtr the route for 10.200.20.0/24. Acme, Cobalt and the NOC must not notice.",
    setup(){ coloBase(); },
    checks: [
      { desc: "colo-core no longer has VLAN 120 or a gateway on irb.120",
        why: "A leftover gateway keeps answering for a network nobody owns. Without removing it the range cannot be handed to the next customer.",
        test: () => { const core = byName("colo-core");
          return !!core && !Object.values(D(core).vlans).some(v => v.id === 120) && !cfgGet(core.config, ["interfaces", "irb", "unit", "120"]); } },
      { desc: "The filter BOR-IN is gone from colo-core",
        why: "Dead filters make the live ones harder to read. Without clean-up, the config slowly fills with rules nobody dares to delete.",
        test: () => { const core = byName("colo-core"); return !!core && !cfgGet(core.config, ["firewall", "family", "inet", "filter", "BOR-IN"]); } },
      { desc: "colo-core port ge-0/0/2 is shut",
        why: "An empty cage with a live port is an open door into your core. Without disabling it, whoever plugs in next is on your network.",
        test: () => { const core = byName("colo-core"); const pc = core && D(core).portCfg["ge-0/0/2"]; return !!(pc && pc.disabled); } },
      { desc: "edge-rtr no longer routes 10.200.20.0/24",
        why: "The edge would still send that range to the core, which no longer knows it. Without removing the route, stray packets bounce between the two.",
        test: () => { const e = byName("edge-rtr"); return !!e && !cfgGet(e.config, ["routing-options", "static", "route", "10.200.20.0/24"]); } },
      { desc: "Acme, Cobalt and the NOC are unaffected",
        why: "Deleting is the most dangerous kind of change. Without re-testing the neighbours you cannot be sure you removed only Borealis.",
        test: () => coloOnline("acme") && coloOnline("cobalt") && coloApart("acme", "cobalt") && pingOk("noc-pc", "10.200.10.2") },
    ],
    hints: [
      "List before you delete: on colo-core, show configuration | match borealis and show configuration | match 120 give you the full inventory of what belongs to them.",
      "Unhook things in the order they depend on each other: first delete interfaces ge-0/0/2 unit 0, then delete vlans borealis, delete interfaces irb unit 120, delete firewall family inet filter BOR-IN.",
      "Shut the door: set interfaces ge-0/0/2 disable. Use show | compare before you commit and read every line: only Borealis should appear.",
      "On edge-rtr: delete routing-options static route 10.200.20.0/24. Then ping from acme-web-1 and cob-app-1 to prove the neighbours are fine.",
    ],
  },
  {
    id: "colo-tenant-lag",
    tour: { touch: ["colo-core", "acme-sw"] },
    group: COLO_PROVISION,
    title: "54. Upgrade a Customer to a Bundled Uplink",
    intro: COLO_INTRO,
    desc: "TICKET: Acme bought a redundant uplink. The second cable is already run from colo-core ge-0/0/4 to acme-sw ge-0/0/4, with both ports shut so it cannot loop. Turn the two links into one LACP bundle (ae0) that carries VLAN acme, and keep Acme's own switch address 10.200.10.2 reachable from the NOC.",
    setup(){
      const C = coloBase();
      cable(C.core, "ge-0/0/4", C.sw.acme, "ge-0/0/4");
      cfgDo(C.core, ["set interfaces ge-0/0/4 disable"]);
      cfgDo(C.sw.acme, ["set interfaces ge-0/0/4 disable"]);
    },
    checks: [
      { desc: "colo-core and acme-sw each run an LACP bundle with two members, and it is up",
        why: "Both ends must agree that two cables are one link. Without LACP on both sides the second cable is either unused or a loop.",
        test: () => siteAeUp(byName("colo-core")) && siteAeUp(byName("acme-sw")) },
      { desc: "No broadcast storm in the hall",
        why: "In a shared hall a loop does not stay in one cage. Without the bundle, opening the second port floods equipment three customers depend on.",
        test: () => NET.stormLinks.size === 0 },
      { desc: "acme-web-1 is online and noc-pc still reaches acme-sw",
        why: "The trunk settings move from the member ports onto ae0. Without that step the bundle comes up empty and Acme goes dark.",
        test: () => coloOnline("acme") && pingOk("noc-pc", "10.200.10.2") },
      { desc: "Borealis and Cobalt are unaffected",
        why: "You changed the core that all three share. Without checking the others, a mistake in ae0 can hide behind Acme working.",
        test: () => coloOnline("borealis") && coloOnline("cobalt") },
    ],
    hints: [
      "This is the office bundle from scenario 31 on customer gear. Plan both ends before you commit either, and consider commit confirmed 5 on acme-sw.",
      "On both switches: set chassis aggregated-devices ethernet device-count 1.",
      "colo-core: delete interfaces ge-0/0/1 unit 0, delete interfaces ge-0/0/4 disable, put ge-0/0/1 and ge-0/0/4 in ae0 with ether-options 802.3ad ae0, then ae0 with lacp active, interface-mode trunk and vlan members acme.",
      "acme-sw: the same with members ge-0/0/0 and ge-0/0/4. Commit both, then show lacp interfaces.",
    ],
  },
  {
    id: "colo-remote-renumber",
    tour: { touch: ["acme-sw", "noc-pc"] },
    group: COLO_PROVISION,
    title: "55. Renumber a Switch Without Locking Yourself Out",
    intro: COLO_INTRO,
    desc: "TICKET: the address plan changes: customer switches move from .2 to .5. Change acme-sw's own address from 10.200.10.2 to 10.200.10.5. You are in the NOC, the cage is locked, and SSH (user noc-admin) is your only way in, so the address you are changing is the one you are connected through.",
    setup(){
      const C = coloBase();
      cfgDo(C.sw.acme, [
        "set system services ssh",
        "set system login user noc-admin class super-user",
        "set system login user noc-admin authentication plain-text-password Colo!2026",
      ]);
    },
    checks: [
      { desc: "acme-sw answers on 10.200.10.5 and no longer on 10.200.10.2",
        why: "Adding the new address is half the job. Without deleting the old one the switch keeps both and the plan stays broken.",
        test: () => { const sw = byName("acme-sw");
          const a = sw && cfgGet(sw.config, ["interfaces", "irb", "unit", "110", "family", "inet", "address"]);
          const list = a ? [].concat(a) : [];
          return list.includes("10.200.10.5/24") && !list.includes("10.200.10.2/24"); } },
      { desc: "The change is confirmed: no rollback timer is still running",
        why: "commit confirmed undoes itself unless you commit again. Without the second commit your work silently disappears a few minutes later.",
        test: () => { const sw = byName("acme-sw"); return !!sw && !sw.commitPending; } },
      { desc: "noc-pc reaches acme-sw on port 22 at the new address",
        why: "The only proof that you did not lock yourself out is a new session on the new address. Without it you are guessing.",
        test: () => coloTcp("noc-pc", "10.200.10.5") },
      { desc: "acme-web-1 is still online",
        why: "The switch's own address and the customer's traffic are separate things. Without this check you do not know you only touched the first.",
        test: () => coloOnline("acme") },
    ],
    hints: [
      "From noc-pc: ssh noc-admin@10.200.10.2, then configure. Think about what happens to this session the instant the address changes.",
      "Stage both lines before committing: set interfaces irb unit 110 family inet address 10.200.10.5/24 and delete interfaces irb unit 110 family inet address 10.200.10.2/24.",
      "Use the safety net: commit confirmed 5. Your session will die, which is expected. If you made a mistake, the switch puts the old address back by itself after five minutes.",
      "Open a new session on the new address: ssh noc-admin@10.200.10.5. A second commit is what keeps the change, so type configure, and after that commit.",
    ],
  },
  {
    id: "colo-no-internet",
    tour: { start: ["bor-db-1"] },
    group: COLO_INCIDENT,
    title: "56. One Customer Has No Internet",
    intro: COLO_INTRO,
    desc: "INCIDENT: Borealis calls: no internet since this morning's maintenance. Acme and Cobalt are fine. Their server reaches its gateway and you can reach their switch from the NOC. Find where the path breaks and repair it.",
    setup(){
      const C = coloBase();
      cfgDo(C.edge, ["delete routing-options static route 10.200.20.0/24"]);
    },
    checks: [
      { desc: "bor-db-1 reaches the internet (8.8.8.8)",
        why: "A ping needs a road there and a road back. Without a return route on the edge the request leaves and the answer is thrown away.",
        test: () => pingOk("bor-db-1", "8.8.8.8") },
      { desc: "Acme and Cobalt are still online",
        why: "The customers who were fine must stay fine. Without re-testing them a hurried repair can move the outage next door.",
        test: () => coloOnline("acme") && coloOnline("cobalt") },
      { desc: "The customers are still separated from each other",
        why: "Under pressure the tempting repair is a wide route or a removed filter. Without this check that shortcut goes unnoticed.",
        test: () => coloApart("acme", "borealis") && coloApart("borealis", "cobalt") },
    ],
    hints: [
      "Narrow it down with what works: bor-db-1 pings 10.200.20.1, so cage and core are fine. Run traceroute 8.8.8.8 on bor-db-1: it gets out as far as the ISP, so the way there works and the reply is what gets lost.",
      "A reply needs a route back to the customer. Compare a healthy customer with the broken one on the router that faces the internet: on edge-rtr, show route. Acme and Cobalt each have a line. Borealis does not.",
      "On edge-rtr: set routing-options static route 10.200.20.0/24 next-hop 10.255.0.2. Commit and ping again from bor-db-1.",
    ],
  },
  {
    id: "colo-gateway-gone",
    tour: { start: ["acme-web-1"] },
    group: COLO_INCIDENT,
    title: "57. A Customer's Gateway Stopped Answering",
    intro: COLO_INTRO,
    desc: "INCIDENT: Acme is completely down after a colleague's clean-up on colo-core. acme-web-1 cannot even reach its gateway 10.200.10.1, yet the cage switch, the cables and the trunk all look healthy. Find what was removed and restore it.",
    setup(){
      const C = coloBase();
      cfgDo(C.core, ["delete vlans acme l3-interface"]);
    },
    checks: [
      { desc: "acme-web-1 reaches its gateway 10.200.10.1",
        why: "The gateway address lives on irb.110, and an irb only works when a VLAN points at it. Without that link the address exists but is attached to nothing.",
        test: () => pingOk("acme-web-1", "10.200.10.1") },
      { desc: "acme-web-1 reaches the internet",
        why: "The gateway was the only broken piece. Without testing the full path you cannot rule out a second fault from the same clean-up.",
        test: () => pingOk("acme-web-1", "8.8.8.8") },
      { desc: "Acme is still separated from Borealis and Cobalt",
        why: "The filter rides on the same irb you just revived. Without checking it, the customer may have come back without its protection.",
        test: () => coloApart("acme", "borealis") && coloApart("acme", "cobalt") },
    ],
    hints: [
      "Work up the layers. Layer 2 first: on acme-sw and colo-core, show vlans and show interfaces terse. Everything is up and in VLAN acme, so the wire is fine.",
      "Layer 3 next: on colo-core, show interfaces terse and look at the irb lines. irb.110 has its address but is down, while irb.120 and irb.130 are up.",
      "Compare the VLANs: show configuration vlans. borealis and cobalt each have an l3-interface line. acme does not.",
      "On colo-core: set vlans acme l3-interface irb.110. Commit and ping from acme-web-1.",
    ],
  },
  {
    id: "colo-power-drill",
    tour: { touch: ["@ups"] },
    group: COLO_INCIDENT,
    title: "58. Power Drill: Will Three Customers Stay Up?",
    intro: COLO_INTRO,
    desc: "DRILL: the hall has one small UPS in Rack M1, bought when there was one customer. Before the yearly outage test, check whether it can carry everything in the hall. Size the battery for the real load, then run the drill with the hall's grid button and prove all three customers stay online while the grid is out.",
    setup(){
      coloBase();
      makeUps(107, 480, "1U Rack UPS 1000W", 1000);
      sitePack();
    },
    checks: [
      { desc: "The hall's UPS capacity covers the whole infrastructure load",
        why: "A UPS carries only what it was sized for. Without doing the sum first, the outage test becomes the outage.",
        test: () => { const z = coloHall();
          if(!z) return false;
          const load = z.gridDown ? (z.outageLoad || 0)
            : buildingInfra(z).filter(d => d.powered !== false).reduce((a, d) => a + drawOf(d), 0);
          const cap = upsCapOf(z);
          return cap > 0 && load > 0 && load <= cap; } },
      { desc: "The drill is live: grid power to the hall is out right now",
        why: "A battery that has never carried the room is a hope, not a plan. Without a real drill you find out during a real outage.",
        test: () => { const z = coloHall(); return !!(z && z.gridDown); } },
      { desc: "All three customer servers and the core are still powered",
        why: "Every customer in the hall shares this battery. Without enough capacity the drill takes all of them down together.",
        test: () => { const z = coloHall();
          return !!(z && z.gridDown) && ["acme-web-1", "bor-db-1", "cob-app-1", "colo-core", "edge-rtr"].every(n => { const d = byName(n); return !!d && d.powered !== false; }); } },
      { desc: "All three customers are online during the outage",
        why: "Powered is not the same as working. Without a ping through the whole path you only know the lights are on.",
        test: () => { const z = coloHall(); return !!(z && z.gridDown) && COLO_TENANTS.every(t => coloOnline(t.key)); } },
    ],
    hints: [
      "Click the UPS in Rack M1 and open its status: it compares its capacity with the hall's real load. The gap is the size of the problem.",
      "No single UPS model is big enough for this hall, so it takes more than one. Add > UPS, place units inside the Colo hall until the capacity is above the load, then open the status again and check the sum.",
      "Run the drill: click grid on the Colo hall header. If you skipped the sizing, everything in the hall goes dark at once, which is exactly what the drill is meant to reveal.",
      "While the grid is out, ping 8.8.8.8 from all three customer servers. Click the outage button again to restore the grid.",
    ],
  },
];
