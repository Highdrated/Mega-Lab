function siteZone(name, x, y, w, h, kind, hue){
  const id = uid("zn");
  zones[id] = { id, name, x, y, w, h, hue: hue || 0, kind };
  return id;
}
function siteRole(id, role){ devices[id].role = role; return id; }
function siteHost(name, x, y){
  const h = makeHost(x, y);
  devices[h].name = name;
  return siteRole(h, "Windows PC");
}
function siteServer(name, x, y, role){
  const s = makeServer(x, y);
  devices[s].name = name;
  return siteRole(s, role);
}
function siteFresh(id){
  const d = devices[id];
  d.powered = false; d.brandNew = true; d.user = "root";
  d.role = "Juniper EX2300 · new";
}
function sitePack(){
  if(typeof packRack !== "function") return;
  Object.values(zones).filter(z => z.kind === "rack").forEach(z => packRack(z));
}
function siteLease(names){
  rebuildAllDerived();
  names.forEach(n => { const h = byName(n); if(h) runDhclient(h); });
}
function siteBase(opts){
  opts = opts || {};
  const S = {};
  S.dc = siteZone("Datacenter", 60, 140, 900, 560, "building", 2);
  S.office = siteZone("Office", 1020, 140, 520, 480, "building", 4);
  S.a1 = siteZone("Rack A1", 90, 200, 260, 390, "rack");
  S.a2 = siteZone("Rack A2", 380, 200, 260, 390, "rack");
  S.a3 = siteZone("Rack A3", 670, 200, 260, 390, "rack");
  S.isp = makeIsp(170, 40, "203.0.113.1");
  makeCrac(90, 620, "CRAC-DC", 3500);
  makeCrac(1040, 540, "AC-Office", 3500);
  S.edge = siteRole(makeRouter(107, 240, 4), "Juniper SRX345 · edge");
  S.core = siteRole(makeSwitch(107, 360, 12), "Juniper EX4300 · core");
  S.srv = siteRole(makeSwitch(397, 240, 12), "Juniper EX4300 · servers");
  S.files = siteServer("fileserver-1", 397, 360, "Synology NAS · file share");
  hostSet(S.files, "10.10.20.10", 24, "10.10.20.1");
  S.off = siteRole(makeSwitch(1040, 200, 12), "Juniper EX2300 · office");
  S.pc1 = siteHost("pc-1", 1040, 440);
  S.pc2 = siteHost("pc-2", 1145, 440);
  cable(S.edge, "ge-0/0/0", S.isp, "wan0", "remote");
  cable(S.edge, "ge-0/0/1", S.core, "ge-0/0/0");
  cable(S.core, "ge-0/0/1", S.srv, "ge-0/0/0");
  cable(S.core, "ge-0/0/2", S.off, "ge-0/0/0");
  cable(S.files, "eth0", S.srv, "ge-0/0/1");
  cable(S.pc1, "eth0", S.off, "ge-0/0/1");
  cable(S.pc2, "eth0", S.off, "ge-0/0/2");
  cfgDo(S.edge, [
    "set system host-name edge-rtr",
    "set interfaces ge-0/0/0 unit 0 family inet address 203.0.113.2/30",
    "set interfaces ge-0/0/1 unit 0 family inet address 10.10.99.1/30",
    "set routing-options static route 0.0.0.0/0 next-hop 203.0.113.1",
    "set routing-options static route 10.10.0.0/16 next-hop 10.10.99.2",
    "set security nat source rule-set SITE from interface ge-0/0/1.0",
    "set security nat source rule-set SITE to interface ge-0/0/0.0",
    "set security nat source rule-set SITE rule R1 match source-address 10.10.0.0/16",
    "set security nat source rule-set SITE rule R1 then source-nat interface",
  ]);
  cfgDo(S.core, [
    "set system host-name core-sw",
    "set vlans staff vlan-id 10",
    "set vlans servers vlan-id 20",
    "set vlans transit vlan-id 99",
    "set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members transit",
    "set interfaces ge-0/0/1 unit 0 family ethernet-switching interface-mode trunk",
    "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members servers",
    "set interfaces ge-0/0/2 unit 0 family ethernet-switching interface-mode trunk",
    "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members staff",
    "set interfaces irb unit 10 family inet address 10.10.10.1/24",
    "set interfaces irb unit 20 family inet address 10.10.20.1/24",
    "set interfaces irb unit 99 family inet address 10.10.99.2/30",
    "set vlans staff l3-interface irb.10",
    "set vlans servers l3-interface irb.20",
    "set vlans transit l3-interface irb.99",
    "set routing-options static route 0.0.0.0/0 next-hop 10.10.99.1",
    "set access address-assignment pool STAFF family inet network 10.10.10.0/24",
    "set access address-assignment pool STAFF family inet range r1 low 10.10.10.100",
    "set access address-assignment pool STAFF family inet range r1 high " + (opts.poolHigh || "10.10.10.199"),
    "set access address-assignment pool STAFF family inet dhcp-attributes router 10.10.10.1",
    "set system services dhcp-local-server group STAFF interface irb.10",
  ]);
  cfgDo(S.srv, [
    "set system host-name srv-sw",
    "set vlans servers vlan-id 20",
    "set interfaces ge-0/0/0 unit 0 family ethernet-switching interface-mode trunk",
    "set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members servers",
    "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members servers",
  ]);
  cfgDo(S.off, [
    "set system host-name office-sw",
    "set vlans staff vlan-id 10",
    "set interfaces ge-0/0/0 unit 0 family ethernet-switching interface-mode trunk",
    "set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members staff",
    "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff",
    "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members staff",
  ]);
  return S;
}
function siteFinish(leaseNames){
  sitePack();
  siteLease(["pc-1", "pc-2"].concat(leaseNames || []));
}
function siteCustomer(S, zoneName){
  S.cust = siteZone(zoneName, 1020, 660, 520, 200, "building", 6);
  S.carrier = makeIsp(770, 40, "198.51.100.1");
  devices[S.carrier].name = "Carrier";
  makeCrac(1330, 760, "AC-Acme", 3500);
}

function siteOnSwitch(hostName, swName){
  const h = byName(hostName), sw = byName(swName);
  if(!h || !sw) return false;
  return linksOf(h.id, "eth0").some(([id, l]) => {
    const other = l.a.dev === h.id ? l.b : l.a;
    return carriesTraffic(l) && other.dev === sw.id;
  });
}
function siteVlanIdOfHost(hostName){
  const h = byName(hostName);
  if(!h) return NaN;
  const entry = linksOf(h.id, "eth0")[0];
  if(!entry) return NaN;
  const l = entry[1];
  const other = l.a.dev === h.id ? l.b : l.a;
  const sw = devices[other.dev];
  if(!sw || sw.type !== "switch") return NaN;
  const pc = D(sw).portCfg[other.port];
  if(!pc || pc.mode !== "access") return NaN;
  const v = D(sw).vlans[pc.vlanNames[0]];
  return v ? v.id : NaN;
}
function siteLeased(hostName, net){
  const h = byName(hostName);
  return !!(h && h.cfg.viaDhcp && h.cfg.ip && sameSubnet(h.cfg.ip, net, 24) && h.cfg.gw);
}
function siteNeighbor(devName, port){
  const d = byName(devName);
  if(!d) return null;
  const entry = linksOf(d.id, port)[0];
  if(!entry) return null;
  const l = entry[1];
  const other = l.a.dev === d.id ? l.b : l.a;
  return devices[other.dev] || null;
}
function siteDayZero(dev){
  return !!(dev && !dev.brandNew && dev.powered !== false && cfgGet(dev.config, ["system", "host-name"]));
}
function siteTrunk(devName, port){
  const d = byName(devName);
  if(!d) return false;
  const pc = D(d).portCfg[port];
  return !!(pc && pc.mode === "trunk");
}
function sitePoolSize(devName, net){
  const d = byName(devName);
  if(!d) return 0;
  return (D(d).pools || []).filter(p => sameSubnet(p.net.ip, net, 24))
    .reduce((n, p) => n + p.ranges.reduce((m, r) => m + Math.max(0, ipToInt(r.high) - ipToInt(r.low) + 1), 0), 0);
}
function siteDhcpOn(devName, net){
  const d = byName(devName);
  if(!d) return false;
  return (D(d).pools || []).some(p => sameSubnet(p.net.ip, net, 24) && p.ranges.length && p.router) &&
    D(d).dhcpIfs.size > 0;
}
function siteAeUp(dev){
  if(!dev) return false;
  const aes = D(dev).aes || {};
  return Object.keys(aes).some(ae => aes[ae].members.length >= 2 &&
    NET.aeInfo[dev.id] && NET.aeInfo[dev.id][ae] && NET.aeInfo[dev.id][ae].up);
}
function siteDefaultRoute(devName){
  const d = byName(devName);
  return !!(d && cfgGet(d.config, ["routing-options", "static", "route", "0.0.0.0/0"]));
}

const SITE_L1 = "Site work: Level 1, moves and adds";
const SITE_L2 = "Site work: Level 2, new services on existing gear";
const SITE_L3 = "Site work: Level 3, installing new devices";
const SITE_L4 = "Site work: Level 4, full projects";
const SITE_INTRO = "The site is already running: a Datacenter with three racks (edge-rtr and core-sw in A1, srv-sw and the file server fileserver-1 in A2), an Office on office-sw, and an ISP. Staff is VLAN 10 (10.10.10.0/24, DHCP from core-sw), servers are VLAN 20 (10.10.20.0/24). Load the setup, then work the ticket. ";

const SITE_SCENARIOS = [
  {
    id: "site-new-desk",
    group: SITE_L1,
    title: "27. New Desk at the Office",
    desc: SITE_INTRO + "TICKET: a new colleague starts today. Patch new-pc into office-sw port ge-0/0/3, put it in the staff VLAN and let it take its address from DHCP.",
    setup(){
      const S = siteBase();
      siteHost("new-pc", 1300, 440);
      siteFinish();
    },
    checks: [
      { desc: "new-pc is patched into office-sw with a LAN cable",
        why: "Nothing else can happen before the physical link exists. Without it the PC sends its DHCP request into an empty socket.",
        test: () => siteOnSwitch("new-pc", "office-sw") },
      { desc: "Its switch port is an access port in the staff VLAN",
        why: "A fresh port sits in vlan default. Without this step the PC is on a VLAN that has no gateway and no DHCP server, so it gets nothing.",
        test: () => siteVlanIdOfHost("new-pc") === 10 },
      { desc: "new-pc holds a DHCP lease in 10.10.10.0/24",
        why: "The lease proves the request crossed the trunk to core-sw and came back. Without DHCP you would type the address by hand and risk a duplicate.",
        test: () => siteLeased("new-pc", "10.10.10.0") },
      { desc: "new-pc reaches the internet (ping 8.8.8.8)",
        why: "An address is not the goal, working access is. Without this test you close the ticket on a guess.",
        test: () => pingOk("new-pc", "8.8.8.8") },
    ],
    hints: [
      "Start by looking, not typing: on office-sw run show vlans and show interfaces terse. See which ports are already in staff and copy that pattern.",
      "Cable new-pc to ge-0/0/3 with a LAN / Data cable. Then on office-sw: set interfaces ge-0/0/3 unit 0 family ethernet-switching vlan members staff, and commit.",
      "On new-pc: dhclient eth0. If there are no offers, run show vlans on office-sw and check that ge-0/0/3 really landed in staff.",
    ],
  },
  {
    id: "site-rack-server",
    group: SITE_L1,
    title: "28. Rack a New Server",
    desc: SITE_INTRO + "TICKET: backup-nas-1 is mounted in Rack A2 but not connected. Cable it to srv-sw port ge-0/0/2 in the servers VLAN and give it the static address 10.10.20.20/24 with gateway 10.10.20.1. Servers never use DHCP here.",
    setup(){
      const S = siteBase();
      siteServer("backup-nas-1", 397, 450, "Synology NAS · backups");
      siteFinish();
    },
    checks: [
      { desc: "backup-nas-1 is cabled to srv-sw and its port is in the servers VLAN",
        why: "The server VLAN is where the gateway 10.10.20.1 lives. Without the right VLAN on the port, the server sits alone in vlan default.",
        test: () => siteOnSwitch("backup-nas-1", "srv-sw") && siteVlanIdOfHost("backup-nas-1") === 20 },
      { desc: "backup-nas-1 has the static address 10.10.20.20/24",
        why: "Other machines find a server by a fixed address. Without a static IP the address could change and every backup job pointing at it would break.",
        test: () => { const s = byName("backup-nas-1"); return !!(s && s.cfg.ip === "10.10.20.20" && s.cfg.bits === 24 && !s.cfg.viaDhcp); } },
      { desc: "backup-nas-1 pings fileserver-1 (same VLAN)",
        why: "This tests layer 2 only: cable, port and VLAN. Without it you cannot tell a VLAN mistake from a routing mistake later.",
        test: () => pingOk("backup-nas-1", "10.10.20.10") },
      { desc: "pc-1 in the Office pings backup-nas-1 (other VLAN)",
        why: "This needs the gateway on the server. Without a default gateway the server hears the ping but has no way to send the reply back to another subnet.",
        test: () => pingOk("pc-1", "10.10.20.20") },
    ],
    hints: [
      "On srv-sw, look at how fileserver-1 is connected: show vlans. Port ge-0/0/1 is in servers. Do the same for ge-0/0/2.",
      "Cable backup-nas-1 to srv-sw ge-0/0/2, then on srv-sw: set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members servers, and commit.",
      "On backup-nas-1: ip addr add 10.10.20.20/24 dev eth0, then ip route add default via 10.10.20.1. The second command is the one people forget.",
    ],
  },
  {
    id: "site-pool-dry",
    group: SITE_L1,
    title: "29. The Pool Ran Dry",
    desc: SITE_INTRO + "TICKET: new-pc is patched in and its port is correct, but it gets no address. pc-1 and pc-2 work fine. Find out why DHCP refuses it and fix the cause on core-sw. The staff range should run from 10.10.10.100 to 10.10.10.199.",
    setup(){
      const S = siteBase({ poolHigh: "10.10.10.101" });
      const n = siteHost("new-pc", 1300, 440);
      cable(n, "eth0", S.off, "ge-0/0/3");
      cfgDo(S.off, ["set interfaces ge-0/0/3 unit 0 family ethernet-switching vlan members staff"]);
      siteFinish();
    },
    checks: [
      { desc: "The STAFF pool on core-sw holds at least 50 addresses",
        why: "The range is the number of machines the VLAN can serve. Without enough addresses every new device is refused, however perfect its cabling is.",
        test: () => sitePoolSize("core-sw", "10.10.10.0") >= 50 },
      { desc: "new-pc holds a DHCP lease in 10.10.10.0/24",
        why: "This confirms the fix reached the client. Without re-running dhclient the PC keeps waiting with no address.",
        test: () => siteLeased("new-pc", "10.10.10.0") },
      { desc: "pc-1 and pc-2 still reach their gateway",
        why: "You changed a live service. Without checking the existing users you cannot know whether your fix broke them.",
        test: () => pingOk("pc-1", "10.10.10.1") && pingOk("pc-2", "10.10.10.1") },
    ],
    hints: [
      "Read the error first: on new-pc run dhclient eth0. The server answers, and tells you exactly what is wrong.",
      "On core-sw: show dhcp server binding lists who holds a lease, and show configuration access shows the pool. Compare the range with the number of clients.",
      "In configure mode on core-sw: set access address-assignment pool STAFF family inet range r1 high 10.10.10.199, commit, then dhclient eth0 on new-pc again.",
    ],
  },
  {
    id: "site-guest-vlan",
    group: SITE_L2,
    title: "30. Guest VLAN with its own DHCP",
    desc: SITE_INTRO + "TICKET: visitors need internet without touching staff machines. Build VLAN guest (id 30, 10.10.30.0/24, gateway 10.10.30.1 on core-sw), carry it over the existing uplink to office-sw, and serve it by DHCP from core-sw. guest-pc is already patched into office-sw ge-0/0/4.",
    setup(){
      const S = siteBase();
      const g = siteHost("guest-pc", 1300, 440);
      cable(g, "eth0", S.off, "ge-0/0/4");
      siteFinish();
    },
    checks: [
      { desc: "VLAN id 30 exists on both core-sw and office-sw",
        why: "A VLAN is local to each switch. Without creating it on both, one switch drops the frames because it has never heard of VLAN 30.",
        test: () => ["core-sw", "office-sw"].every(n => { const d = byName(n);
          return !!d && Object.values(D(d).vlans).some(v => v.id === 30); }) },
      { desc: "guest-pc sits on an access port in VLAN 30",
        why: "The port decides the VLAN, the PC does not. Without this the guest lands in vlan default and never reaches the guest gateway.",
        test: () => siteVlanIdOfHost("guest-pc") === 30 },
      { desc: "core-sw serves DHCP for 10.10.30.0/24",
        why: "Each VLAN is its own broadcast domain, so the staff DHCP service cannot hear guests. Without a pool and a server binding on irb.30, guests get no offer.",
        test: () => siteDhcpOn("core-sw", "10.10.30.0") },
      { desc: "guest-pc holds a lease in 10.10.30.0/24 and reaches the internet",
        why: "The lease proves VLAN 30 crosses the trunk. Without adding guest to the trunk on both ends, the request dies on the uplink.",
        test: () => siteLeased("guest-pc", "10.10.30.0") && pingOk("guest-pc", "8.8.8.8") },
      { desc: "Staff still works: pc-1 reaches its gateway",
        why: "You edited a trunk that staff depends on. Without this check you may have replaced the VLAN list instead of adding to it.",
        test: () => pingOk("pc-1", "10.10.10.1") },
    ],
    hints: [
      "Plan it as four parts: the VLAN on two switches, the trunk on both ends, the gateway (irb.30) on core-sw, and DHCP. Copy how staff is built: show configuration on core-sw.",
      "On both switches: set vlans guest vlan-id 30. Add it to the uplink on both ends: core-sw ge-0/0/2 and office-sw ge-0/0/0, with set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members guest. On office-sw also put ge-0/0/4 in guest.",
      "Gateway on core-sw: set interfaces irb unit 30 family inet address 10.10.30.1/24 and set vlans guest l3-interface irb.30.",
      "DHCP on core-sw: set access address-assignment pool GUEST family inet network 10.10.30.0/24, a range r1 low and high, dhcp-attributes router 10.10.30.1, then set system services dhcp-local-server group GUEST interface irb.30. Commit and run dhclient eth0 on guest-pc.",
    ],
  },
  {
    id: "site-lacp-uplink",
    group: SITE_L2,
    title: "31. Bundle the Office Uplink (LACP)",
    desc: SITE_INTRO + "TICKET: the Office hangs on one cable. A second cable is already run from core-sw ge-0/0/3 to office-sw ge-0/0/5, with both ports shut so it cannot loop. Turn the two links into one LACP bundle (ae0) that still carries the staff VLAN.",
    setup(){
      const S = siteBase();
      cable(S.core, "ge-0/0/3", S.off, "ge-0/0/5");
      cfgDo(S.core, ["set interfaces ge-0/0/3 disable"]);
      cfgDo(S.off, ["set interfaces ge-0/0/5 disable"]);
      siteFinish();
    },
    checks: [
      { desc: "core-sw and office-sw each have a bundle with two member ports",
        why: "A bundle is built from both ends. Without members on both switches there is no partner, and the link never joins.",
        test: () => ["core-sw", "office-sw"].every(n => { const d = byName(n);
          return !!d && Object.values(D(d).aes || {}).some(a => a.members.length >= 2); }) },
      { desc: "LACP is up on both bundles",
        why: "LACP is the handshake that proves both ends agree. Without it a miscabled port can silently send traffic into the wrong place.",
        test: () => siteAeUp(byName("core-sw")) && siteAeUp(byName("office-sw")) },
      { desc: "No broadcast storm on the site",
        why: "Two plain parallel cables are a loop. Without the bundle, enabling the second link floods the Office until nothing works.",
        test: () => NET.stormLinks.size === 0 },
      { desc: "pc-1 still reaches its gateway and the internet over the bundle",
        why: "The VLAN settings now live on ae0, not on the member ports. Without moving the trunk config to ae0 the bundle is up but carries no staff traffic.",
        test: () => pingOk("pc-1", "10.10.10.1") && pingOk("pc-1", "8.8.8.8") },
    ],
    hints: [
      "Order matters, because users are on this link. Build the whole change in the candidate on each switch and commit once, or use commit confirmed 5 as a safety net.",
      "On both switches the bundle must be allowed to exist: set chassis aggregated-devices ethernet device-count 1.",
      "Member ports cannot keep their own VLAN config. On core-sw: delete interfaces ge-0/0/2 unit 0, delete interfaces ge-0/0/3 disable, then set interfaces ge-0/0/2 ether-options 802.3ad ae0 and the same for ge-0/0/3. On office-sw the members are ge-0/0/0 and ge-0/0/5.",
      "Then the bundle itself, on both: set interfaces ae0 aggregated-ether-options lacp active, set interfaces ae0 unit 0 family ethernet-switching interface-mode trunk, and vlan members staff. Commit, then show lacp interfaces.",
    ],
  },
  {
    id: "site-dia-customer",
    group: SITE_L2,
    title: "32. Deliver DIA to a Customer",
    desc: SITE_INTRO + "TICKET: customer Acme rents space in Rack A3 and bought Dedicated Internet Access. Their router acme-rtr is racked and their office PC is cabled to its ge-0/0/1. The carrier handoff is the Carrier node: their side is 198.51.100.1/30, yours is 198.51.100.2/30. Cable the handoff to ge-0/0/0, give Acme a LAN of 192.168.50.0/24 (gateway .1) with DHCP from the router, and get acme-pc online.",
    setup(){
      const S = siteBase();
      siteCustomer(S, "Acme office");
      const r = siteRole(makeRouter(687, 240, 4), "Juniper SRX300 · customer");
      cfgDo(r, ["set system host-name acme-rtr"]);
      const p = siteHost("acme-pc", 1040, 720);
      cable(p, "eth0", r, "ge-0/0/1");
      siteFinish();
    },
    checks: [
      { desc: "acme-rtr ge-0/0/0 is cabled to the Carrier and pings 198.51.100.1",
        why: "The /30 is the handoff: two usable addresses, one per side. Without the right address on the WAN port the carrier is not even a neighbour.",
        test: () => { const n = siteNeighbor("acme-rtr", "ge-0/0/0");
          return !!(n && n.type === "isp") && pingOk("acme-rtr", "198.51.100.1"); } },
      { desc: "acme-rtr has a default route",
        why: "A router only knows the networks it is plugged into. Without a default route every packet for the internet is dropped as unknown.",
        test: () => siteDefaultRoute("acme-rtr") },
      { desc: "acme-pc holds a DHCP lease in 192.168.50.0/24 from acme-rtr",
        why: "The customer's users should plug in and work. Without DHCP on the LAN side, every device needs hand-typed settings.",
        test: () => siteLeased("acme-pc", "192.168.50.0") },
      { desc: "acme-pc reaches the internet (ping 8.8.8.8)",
        why: "192.168.x addresses are private and the internet will not answer them. Without source NAT the ping leaves but the reply never comes back.",
        test: () => pingOk("acme-pc", "8.8.8.8") },
    ],
    hints: [
      "Work outside-in: WAN first, then routing, then the LAN, then NAT. Cable acme-rtr ge-0/0/0 to the Carrier, then set interfaces ge-0/0/0 unit 0 family inet address 198.51.100.2/30, commit, and run ping 198.51.100.1.",
      "Routing and LAN: set routing-options static route 0.0.0.0/0 next-hop 198.51.100.1 and set interfaces ge-0/0/1 unit 0 family inet address 192.168.50.1/24.",
      "DHCP on a router is the same as on a switch, bound to the LAN interface: a pool ACME with network 192.168.50.0/24, a range, dhcp-attributes router 192.168.50.1, then set system services dhcp-local-server group ACME interface ge-0/0/1.0.",
      "NAT: set security nat source rule-set ACME from interface ge-0/0/1.0, to interface ge-0/0/0.0, rule R1 match source-address 192.168.50.0/24, rule R1 then source-nat interface. Commit, dhclient eth0 on acme-pc, ping 8.8.8.8.",
    ],
  },
  {
    id: "site-new-access-switch",
    group: SITE_L3,
    title: "33. Install a New Access Switch",
    desc: SITE_INTRO + "TICKET: the Office is out of ports. A factory-fresh switch stands next to office-sw, its uplink already cabled from its ge-0/0/0 to core-sw ge-0/0/4, with desk-1 and desk-2 on its ge-0/0/1 and ge-0/0/2. Power it on, do day zero (name it office-sw2), and get both desks onto the staff VLAN with DHCP.",
    setup(){
      const S = siteBase();
      const n = makeSwitch(1300, 200, 12);
      siteFresh(n);
      const d1 = siteHost("desk-1", 1300, 440), d2 = siteHost("desk-2", 1405, 440);
      cable(n, "ge-0/0/0", S.core, "ge-0/0/4");
      cable(d1, "eth0", n, "ge-0/0/1");
      cable(d2, "eth0", n, "ge-0/0/2");
      siteFinish();
    },
    checks: [
      { desc: "The new switch is powered, has a root password and a committed host-name",
        why: "A factory box refuses its first commit without a root password. Without day zero nothing else you type ever becomes real.",
        test: () => siteDayZero(siteNeighbor("core-sw", "ge-0/0/4")) },
      { desc: "core-sw ge-0/0/4 is a trunk",
        why: "The uplink has two ends and you only installed one of them. Without the trunk on core-sw the new switch talks into a port in vlan default.",
        test: () => siteTrunk("core-sw", "ge-0/0/4") },
      { desc: "desk-1 and desk-2 sit on access ports in VLAN 10",
        why: "The new switch starts with no VLANs at all. Without creating staff with id 10 the tag on the trunk matches nothing on core-sw.",
        test: () => siteVlanIdOfHost("desk-1") === 10 && siteVlanIdOfHost("desk-2") === 10 },
      { desc: "Both desks hold a DHCP lease and reach the internet",
        why: "This is the customer's view of the job. Without it you have a switch that is configured but not proven.",
        test: () => ["desk-1", "desk-2"].every(n => siteLeased(n, "10.10.10.0") && pingOk(n, "8.8.8.8")) },
    ],
    hints: [
      "Press the power button on the new switch, log in as root, type cli, then configure. In REAL JUNOS mode you need a console cable from a PC to its CON port first.",
      "Day zero: set system host-name office-sw2, set system root-authentication plain-text-password, commit.",
      "On office-sw2: set vlans staff vlan-id 10, make ge-0/0/0 a trunk with vlan members staff, and put ge-0/0/1 and ge-0/0/2 in staff as access ports.",
      "Do not forget the other end. On core-sw: set interfaces ge-0/0/4 unit 0 family ethernet-switching interface-mode trunk and vlan members staff. Commit, then dhclient eth0 on both desks.",
    ],
  },
  {
    id: "site-internal-router",
    group: SITE_L3,
    title: "34. Install an Internal Router for the Test Lab",
    desc: SITE_INTRO + "TICKET: the test lab needs its own routed network behind lab-rtr (racked in A3, cabled from its ge-0/0/0 to core-sw ge-0/0/5, lab-pc on its ge-0/0/1). Use transit 10.10.98.0/30 (core-sw .1 on a new VLAN lab-transit id 98, lab-rtr .2) and lab LAN 10.10.40.0/24 (gateway .1, DHCP from lab-rtr). lab-pc must reach fileserver-1 and the internet.",
    setup(){
      const S = siteBase();
      S.lab = siteZone("Test lab", 1020, 660, 520, 200, "building", 6);
      const r = siteRole(makeRouter(687, 240, 4), "Juniper SRX300 · test lab");
      cfgDo(r, ["set system host-name lab-rtr"]);
      const p = siteHost("lab-pc", 1040, 720);
      cable(r, "ge-0/0/0", S.core, "ge-0/0/5");
      cable(p, "eth0", r, "ge-0/0/1");
      siteFinish();
    },
    checks: [
      { desc: "lab-rtr pings core-sw across the transit (10.10.98.1)",
        why: "The transit is the only road between the lab and the site. Without both ends addressed in the same /30, neither box can use the other as a next hop.",
        test: () => pingOk("lab-rtr", "10.10.98.1") },
      { desc: "lab-rtr has a default route",
        why: "lab-rtr knows only its two connected networks. Without a default route it cannot send lab traffic towards the rest of the site.",
        test: () => siteDefaultRoute("lab-rtr") },
      { desc: "lab-pc holds a DHCP lease in 10.10.40.0/24 from lab-rtr",
        why: "The DHCP service on core-sw cannot see behind a router. Without a pool on lab-rtr the lab segment has no server at all.",
        test: () => siteLeased("lab-pc", "10.10.40.0") },
      { desc: "lab-pc pings fileserver-1 (10.10.20.10)",
        why: "The ping arrives, but the reply needs a road back. Without a route for 10.10.40.0/24 on core-sw the answer goes to the edge and is lost.",
        test: () => pingOk("lab-pc", "10.10.20.10") },
      { desc: "lab-pc reaches the internet (ping 8.8.8.8)",
        why: "This proves every hop knows the lab network in both directions. Without it one missing route can hide behind a working local ping.",
        test: () => pingOk("lab-pc", "8.8.8.8") },
    ],
    hints: [
      "Draw the path on paper first: lab-pc, lab-rtr, core-sw, edge-rtr, ISP. Every box on that path needs a route there AND a route back.",
      "Transit on core-sw: set vlans lab-transit vlan-id 98, put ge-0/0/5 in it, set interfaces irb unit 98 family inet address 10.10.98.1/30, set vlans lab-transit l3-interface irb.98. On lab-rtr: set interfaces ge-0/0/0 unit 0 family inet address 10.10.98.2/30.",
      "On lab-rtr: set routing-options static route 0.0.0.0/0 next-hop 10.10.98.1, set interfaces ge-0/0/1 unit 0 family inet address 10.10.40.1/24, then a pool LAB plus set system services dhcp-local-server group LAB interface ge-0/0/1.0.",
      "The road back, on core-sw: set routing-options static route 10.10.40.0/24 next-hop 10.10.98.2. The edge already routes all of 10.10.0.0/16 to core-sw, so nothing is needed there.",
    ],
  },
  {
    id: "site-rack-extension",
    group: SITE_L3,
    title: "35. Extend the Server Row into Rack A3",
    desc: SITE_INTRO + "TICKET: Rack A2 is full. A factory-fresh switch is mounted in Rack A3, cabled from its ge-0/0/0 to srv-sw ge-0/0/7, with the new database server db-server-1 on its ge-0/0/1. Do day zero (name it srv-sw2), extend the servers VLAN to it, and give db-server-1 the address 10.10.20.30/24 with gateway 10.10.20.1.",
    setup(){
      const S = siteBase();
      const n = makeSwitch(687, 240, 12);
      siteFresh(n);
      const db = siteServer("db-server-1", 687, 360, "Dell server · database");
      cable(n, "ge-0/0/0", S.srv, "ge-0/0/7");
      cable(db, "eth0", n, "ge-0/0/1");
      siteFinish();
    },
    checks: [
      { desc: "The new switch is powered, has a root password and a committed host-name",
        why: "A named, secured box is the minimum for anything that goes into a rack. Without it the first commit fails and the switch stays factory-fresh.",
        test: () => siteDayZero(siteNeighbor("srv-sw", "ge-0/0/7")) },
      { desc: "srv-sw ge-0/0/7 is a trunk",
        why: "Traffic now crosses three switches in a row. Without a trunk at every hop the servers VLAN stops at the first switch that does not carry it.",
        test: () => siteTrunk("srv-sw", "ge-0/0/7") },
      { desc: "db-server-1 sits on an access port in VLAN 20 with address 10.10.20.30/24",
        why: "The VLAN id must match across all switches, the name does not have to. Without id 20 on the new switch the tag is unknown and dropped.",
        test: () => { const s = byName("db-server-1");
          return siteVlanIdOfHost("db-server-1") === 20 && !!s && s.cfg.ip === "10.10.20.30" && s.cfg.bits === 24; } },
      { desc: "db-server-1 pings fileserver-1, and pc-1 in the Office pings db-server-1",
        why: "The first ping proves the chain of trunks, the second proves the gateway. Without both you only know half the path works.",
        test: () => pingOk("db-server-1", "10.10.20.10") && pingOk("pc-1", "10.10.20.30") },
    ],
    hints: [
      "Power on the new switch, log in as root, cli, configure. Day zero: host-name srv-sw2, root-authentication plain-text-password, commit.",
      "On srv-sw2: set vlans servers vlan-id 20, make ge-0/0/0 a trunk with vlan members servers, and put ge-0/0/1 in servers.",
      "On srv-sw: make ge-0/0/7 a trunk with vlan members servers. The link from srv-sw up to core-sw already carries servers.",
      "On db-server-1: ip addr add 10.10.20.30/24 dev eth0 and ip route add default via 10.10.20.1.",
    ],
  },
  {
    id: "site-new-floor",
    group: SITE_L4,
    title: "36. Project: a New Floor",
    desc: SITE_INTRO + "PROJECT: a second floor opens. A factory-fresh switch is in place with TWO uplinks already cabled: its ge-0/0/10 to core-sw ge-0/0/4 and its ge-0/0/11 to core-sw ge-0/0/5 (both shut on core-sw so they cannot loop). fl2-staff is on its ge-0/0/1 and fl2-guest on its ge-0/0/2. Deliver: day zero (name it floor2-sw), an LACP bundle to core-sw, the staff VLAN, and a new guest VLAN (id 30, 10.10.30.0/24, gateway 10.10.30.1 and DHCP on core-sw).",
    setup(){
      const S = siteBase();
      const n = makeSwitch(1300, 200, 12);
      siteFresh(n);
      const a = siteHost("fl2-staff", 1300, 440), b = siteHost("fl2-guest", 1405, 440);
      cable(n, "ge-0/0/10", S.core, "ge-0/0/4");
      cable(n, "ge-0/0/11", S.core, "ge-0/0/5");
      cable(a, "eth0", n, "ge-0/0/1");
      cable(b, "eth0", n, "ge-0/0/2");
      cfgDo(S.core, ["set interfaces ge-0/0/4 disable", "set interfaces ge-0/0/5 disable"]);
      siteFinish();
    },
    checks: [
      { desc: "The new switch is powered, has a root password and a committed host-name",
        why: "Every project starts with a box you can log in to and recognise. Without day zero the rest of the plan has nothing to commit to.",
        test: () => siteDayZero(siteNeighbor("core-sw", "ge-0/0/4")) },
      { desc: "An LACP bundle with two members is up on both core-sw and the new switch",
        why: "Two uplinks give the floor a spare. Without bundling them they are a loop, and without LACP a half-working link goes unnoticed.",
        test: () => siteAeUp(byName("core-sw")) && siteAeUp(siteNeighbor("core-sw", "ge-0/0/4")) && NET.stormLinks.size === 0 },
      { desc: "fl2-staff holds a lease in 10.10.10.0/24",
        why: "Staff must work on the new floor exactly as on the old one. Without staff in the bundle's VLAN list the existing DHCP service never hears this floor.",
        test: () => siteLeased("fl2-staff", "10.10.10.0") },
      { desc: "fl2-guest holds a lease in 10.10.30.0/24",
        why: "Guests get their own subnet so they stay apart from staff. Without a gateway and pool for VLAN 30 on core-sw, the guest port is a dead socket.",
        test: () => siteLeased("fl2-guest", "10.10.30.0") },
      { desc: "Both reach the internet, and the Office still works",
        why: "A project is finished when the new part works and the old part is unharmed. Without checking pc-1 you do not know what your change cost.",
        test: () => pingOk("fl2-staff", "8.8.8.8") && pingOk("fl2-guest", "8.8.8.8") && pingOk("pc-1", "8.8.8.8") },
    ],
    hints: [
      "Write the plan before you touch anything: 1 day zero, 2 bundle on both ends, 3 VLANs on both ends, 4 guest gateway and DHCP on core-sw, 5 access ports, 6 test. Scenarios 30, 31 and 33 each cover one part.",
      "Bundle: on both switches set chassis aggregated-devices ethernet device-count 1, add the two ports with ether-options 802.3ad ae0, set interfaces ae0 aggregated-ether-options lacp active. On core-sw also delete the disable on ge-0/0/4 and ge-0/0/5.",
      "VLANs: staff (10) and guest (30) on the new switch, guest on core-sw. Make ae0 a trunk on both ends with vlan members staff and guest.",
      "On core-sw: irb unit 30 with 10.10.30.1/24, vlans guest l3-interface irb.30, a pool GUEST and dhcp-local-server group GUEST interface irb.30. Then the access ports on the new switch, and dhclient eth0 on both PCs.",
    ],
  },
  {
    id: "site-customer-cage",
    group: SITE_L4,
    title: "37. Project: Onboard a Customer End to End",
    desc: SITE_INTRO + "PROJECT: customer Acme moves in. In Rack A3: acme-rtr (named, otherwise empty) and a factory-fresh switch, cabled from its ge-0/0/0 to acme-rtr ge-0/0/1. In the Acme office: acme-pc1 and acme-pc2 on the switch's ge-0/0/1 and ge-0/0/2. Deliver: DIA on acme-rtr ge-0/0/0 (carrier 198.51.100.1/30, you .2), LAN 192.168.50.0/24 with gateway .1 and DHCP from the router, day zero on the switch (name it acme-sw), and all three switch ports in a VLAN acme with id 50.",
    setup(){
      const S = siteBase();
      siteCustomer(S, "Acme office");
      const r = siteRole(makeRouter(687, 240, 4), "Juniper SRX300 · customer");
      cfgDo(r, ["set system host-name acme-rtr"]);
      const n = makeSwitch(687, 340, 12);
      siteFresh(n);
      const a = siteHost("acme-pc1", 1040, 720), b = siteHost("acme-pc2", 1145, 720);
      cable(n, "ge-0/0/0", r, "ge-0/0/1");
      cable(a, "eth0", n, "ge-0/0/1");
      cable(b, "eth0", n, "ge-0/0/2");
      siteFinish();
    },
    checks: [
      { desc: "acme-rtr is cabled to the Carrier, pings 198.51.100.1 and has a default route",
        why: "The handoff is what the customer pays for. Without the /30 address and a default route their router has no way out.",
        test: () => { const n = siteNeighbor("acme-rtr", "ge-0/0/0");
          return !!(n && n.type === "isp") && pingOk("acme-rtr", "198.51.100.1") && siteDefaultRoute("acme-rtr"); } },
      { desc: "The customer switch is powered, has a root password and a committed host-name",
        why: "You hand over a switch the customer can manage. Without day zero it is an unnamed box with an open root login.",
        test: () => siteDayZero(siteNeighbor("acme-rtr", "ge-0/0/1")) },
      { desc: "acme-pc1 and acme-pc2 sit on access ports in VLAN 50",
        why: "A dedicated VLAN keeps the customer's traffic off vlan default. Without it any device plugged into a spare port shares their network.",
        test: () => siteVlanIdOfHost("acme-pc1") === 50 && siteVlanIdOfHost("acme-pc2") === 50 },
      { desc: "Both PCs hold a DHCP lease in 192.168.50.0/24 from acme-rtr",
        why: "The router port is untagged, so the switch uplink must be an access port in the same VLAN. Without that the DHCP request never reaches the router.",
        test: () => siteLeased("acme-pc1", "192.168.50.0") && siteLeased("acme-pc2", "192.168.50.0") },
      { desc: "Both PCs reach the internet (ping 8.8.8.8)",
        why: "This is the service being sold. Without source NAT the private addresses leave the building and no reply ever returns.",
        test: () => pingOk("acme-pc1", "8.8.8.8") && pingOk("acme-pc2", "8.8.8.8") },
    ],
    hints: [
      "Split it in two jobs: the router (WAN, default route, LAN, DHCP, NAT) is scenario 32 again. The switch (day zero, one VLAN, three access ports) is new. Do the router first so you can test from it.",
      "Router: cable ge-0/0/0 to the Carrier, address 198.51.100.2/30, static default to 198.51.100.1, ge-0/0/1 as 192.168.50.1/24, a pool plus dhcp-local-server on ge-0/0/1.0, and a source NAT rule-set from ge-0/0/1.0 to ge-0/0/0.0.",
      "Switch: power on, root, cli, configure, host-name acme-sw, root-authentication, commit. Then set vlans acme vlan-id 50.",
      "The uplink to the router is an ACCESS port here, not a trunk, because the router interface is untagged: put ge-0/0/0, ge-0/0/1 and ge-0/0/2 all in acme. Commit, then dhclient eth0 on both PCs.",
    ],
  },
  {
    id: "site-warehouse",
    group: SITE_L4,
    title: "38. Project: Bring the Warehouse Online",
    desc: SITE_INTRO + "PROJECT: a Warehouse joins the site. wh-rtr and wh-sw are in place, wh-pc1 and wh-pc2 are cabled to wh-sw, and a long-haul link runs from wh-rtr ge-0/0/0 to edge-rtr ge-0/0/2. Deliver: interconnect 10.10.97.0/30 (edge-rtr .1, wh-rtr .2), warehouse LAN 10.20.10.0/24 on wh-rtr ge-0/0/1 (gateway .1, DHCP from wh-rtr), and routing so the warehouse reaches fileserver-1 and the internet.",
    setup(){
      const S = siteBase();
      S.wh = siteZone("Warehouse", 1020, 660, 520, 300, "building", 6);
      const r = siteRole(makeRouter(1040, 710, 4), "Juniper SRX300 · router");
      makeCrac(1040, 880, "AC-Warehouse", 3500);
      cfgDo(r, ["set system host-name wh-rtr"]);
      const w = siteRole(makeSwitch(1300, 710, 12), "Juniper EX2300 · access");
      cfgDo(w, ["set system host-name wh-sw"]);
      const a = siteHost("wh-pc1", 1300, 860), b = siteHost("wh-pc2", 1405, 860);
      cable(r, "ge-0/0/0", S.edge, "ge-0/0/2", "remote");
      cable(r, "ge-0/0/1", w, "ge-0/0/0");
      cable(a, "eth0", w, "ge-0/0/1");
      cable(b, "eth0", w, "ge-0/0/2");
      siteFinish();
    },
    checks: [
      { desc: "wh-rtr pings edge-rtr across the interconnect (10.10.97.1)",
        why: "The interconnect is the only link between the two buildings. Without matching /30 addresses on both ends, no route can point across it.",
        test: () => pingOk("wh-rtr", "10.10.97.1") },
      { desc: "wh-pc1 and wh-pc2 hold a DHCP lease in 10.20.10.0/24 from wh-rtr",
        why: "The warehouse is a new subnet behind its own router. Without a local pool the site's DHCP service cannot reach it.",
        test: () => siteLeased("wh-pc1", "10.20.10.0") && siteLeased("wh-pc2", "10.20.10.0") },
      { desc: "wh-pc1 pings fileserver-1 (10.10.20.10)",
        why: "Three routers sit on this path and each needs to know both ends. Without a route for 10.20.10.0/24 on edge-rtr the reply has nowhere to go.",
        test: () => pingOk("wh-pc1", "10.10.20.10") },
      { desc: "pc-1 in the Office pings wh-pc1",
        why: "Traffic must also start from the old side. Without this test a one-way route can look like a working link.",
        test: () => { const h = byName("wh-pc1"); return !!(h && h.cfg.ip) && pingOk("pc-1", h.cfg.ip); } },
      { desc: "wh-pc1 reaches the internet (ping 8.8.8.8)",
        why: "The existing NAT rule only covers 10.10.0.0/16 arriving from core-sw. Without a rule for the warehouse range the internet never answers it.",
        test: () => pingOk("wh-pc1", "8.8.8.8") },
    ],
    hints: [
      "List every device on the path and ask the same question of each: does it know how to reach 10.20.10.0/24, and how to reach the rest? wh-rtr, edge-rtr and core-sw all have a say.",
      "Interconnect: on edge-rtr set interfaces ge-0/0/2 unit 0 family inet address 10.10.97.1/30, on wh-rtr set interfaces ge-0/0/0 unit 0 family inet address 10.10.97.2/30. On wh-rtr also set routing-options static route 0.0.0.0/0 next-hop 10.10.97.1.",
      "Warehouse LAN on wh-rtr: ge-0/0/1 as 10.20.10.1/24, a pool WH for 10.20.10.0/24 with a range and router 10.20.10.1, and set system services dhcp-local-server group WH interface ge-0/0/1.0.",
      "On edge-rtr: set routing-options static route 10.20.10.0/24 next-hop 10.10.97.2, and a second NAT rule-set from interface ge-0/0/2.0 to interface ge-0/0/0.0 matching 10.20.10.0/24 with source-nat interface. core-sw already sends everything unknown to the edge.",
    ],
  },
];
