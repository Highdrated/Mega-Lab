/* ============================================================
   SCENARIO HELPERS
   ============================================================ */
function devsBy(type){ return Object.values(devices).filter(d => d.type === type); }
function byName(n){ return Object.values(devices).find(d => d.name === n); }
function pingOk(devOrName, ip){
  const d = typeof devOrName === "string" ? byName(devOrName) : devOrName;
  if(!d || !validIp(ip || "")) return false;
  return pingRun(d, ip, {}).ok;
}
function hostAccessVlan(h){
  const entry = linksOf(h.id, "eth0")[0];
  if(!entry) return null;
  const l = entry[1];
  const other = l.a.dev === h.id ? l.b : l.a;
  const sw = devices[other.dev];
  if(!sw || sw.type !== "switch") return null;
  const pc = D(sw).portCfg[other.port];
  if(!pc) return null;
  return pc.mode === "access" ? (pc.vlanNames[0] || null) : null;
}
function nonDefaultVlans(sw){ return Object.keys(D(sw).vlans).filter(v => v !== "default"); }

/* run real config commands + commit on a device (used by scenario setups) */
function cfgDo(devId, cmds){
  const dev = devices[devId];
  dev.cli.mode = "cfg"; dev.cli.editKeys = [];
  for(const c of cmds) cfgExec(dev, c);
  const out = commitCmd(dev, []);
  dev.cli.mode = "op";
  return out;
}
function hostSet(devId, ip, bits, gw){
  const dev = devices[devId];
  dev.cfg.ip = ip; dev.cfg.bits = bits; dev.cfg.gw = gw || null;
}
function cable(aDev, aPort, bDev, bPort, kind){
  links[uid("lk")] = { a: { dev: aDev, port: aPort }, b: { dev: bDev, port: bPort }, kind: kind || "lan" };
}
function wipeLab(){
  devices = {}; links = {}; zones = {}; nextId = 1; openTabs = []; activeDevice = null;
}

/* ============================================================
   SCENARIOS
   ============================================================ */
const SCENARIOS = [
  {
    id: "basic-connect",
    title: "1. Basic Connectivity",
    desc: "Get two hosts talking through a switch. No VLANs, no tricks — just prove the plumbing works.",
    checks: [
      { desc: "At least 1 switch and 2 hosts placed",
        why: "Ping needs at least two endpoints and something to switch frames between them — this is the minimum topology any test can run on.",
        test: () => devsBy("switch").length >= 1 && devsBy("host").length >= 2 },
      { desc: "Both hosts cabled into the switch",
        why: "An uncabled port carries nothing. Physical connectivity always comes before configuration — Junos can't route packets down a wire that isn't there.",
        test: () => devsBy("host").length >= 2 && devsBy("host").every(h => isLinked(h.id, "eth0")) },
      { desc: "Both hosts have an IP in the same /24",
        why: "Two hosts can only ARP for each other directly if they believe they're on the same subnet — different subnets would need a router, not a switch.",
        test: () => { const hs = devsBy("host").filter(h => h.cfg.ip);
          return hs.length >= 2 && new Set(hs.map(h => networkOf(h.cfg.ip, 24))).size === 1; } },
      { desc: "ping succeeds between the two hosts",
        why: "This is the actual proof. Cabling and addressing can look correct and still not work — ping is the only check that confirms it.",
        test: () => { const hs = devsBy("host").filter(h => h.cfg.ip);
          return hs.length >= 2 && pingOk(hs[0], hs[1].cfg.ip); } },
    ],
    hints: [
      "Add a switch and two hosts from the toolbar, then use Cable mode to wire host → switch, host → switch.",
      "Both hosts need an IP: in each host's shell, ip addr add 10.0.0.1/24 dev eth0 (different last number on the second host).",
      "If ping still fails: show interfaces terse on the switch — are both ports up, and in the same VLAN (default is fine)?",
    ],
  },
  {
    id: "vlan-split",
    title: "2. VLAN Isolation",
    desc: "Two hosts, one switch, different VLANs. The goal is for the ping to FAIL — that's success here.",
    checks: [
      { desc: "Two VLANs exist on a switch (not counting default)",
        why: "Without a second VLAN there's nothing to isolate — the whole point of this lab is two separate broadcast domains on one switch.",
        test: () => devsBy("switch").some(sw => nonDefaultVlans(sw).length >= 2) },
      { desc: "The two hosts sit on access ports in different VLANs",
        why: "Isolation happens at the PORT, not the host — a host doesn't know its VLAN, the switch enforces it based on which access port it's plugged into.",
        test: () => { const hs = devsBy("host");
          if(hs.length < 2) return false;
          const vs = hs.map(hostAccessVlan).filter(Boolean);
          return vs.length >= 2 && new Set(vs).size >= 2; } },
      { desc: "Both hosts have IPs configured",
        why: "Addresses in the SAME subnet make the coming failure meaningful — if the ping failed just because of mismatched IPs, it wouldn't prove VLAN isolation at all.",
        test: () => devsBy("host").filter(h => h.cfg.ip).length >= 2 },
      { desc: "Ping between them correctly fails (proves the isolation)",
        why: "A failing ping is the goal here — it's the only evidence that the VLAN boundary is real, not just configured and ignored.",
        test: () => { const hs = devsBy("host").filter(h => h.cfg.ip);
          if(hs.length < 2) return false;
          if(new Set(hs.map(hostAccessVlan).filter(Boolean)).size < 2) return false;
          return !pingOk(hs[0], hs[1].cfg.ip); } },
    ],
    hints: [
      "In configure mode on the switch: set vlans staff vlan-id 10, then set vlans guest vlan-id 20. Commit!",
      "Move each host's switch port: set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members staff (and the other port into guest). Type set interfaces ge-0/0/0 ? and let the CLI walk you there.",
      "Give both hosts IPs in the same subnet anyway — same wire, same subnet, still unreachable: that's what a VLAN does. If ping still works, run show vlans and check which ports really ended up where.",
    ],
  },
  {
    id: "rename-switch",
    title: "3. Day-Zero Basics",
    desc: "Every deployment starts here: config mode, hostname, commit. Nothing is real until you commit.",
    checks: [
      { desc: "A switch has a committed host-name",
        why: "Junos edits a candidate configuration — nothing you type is real until commit activates it. This is the single most important habit the CLI teaches.",
        test: () => devsBy("switch").some(sw => cfgGet(sw.config, ["system", "host-name"])) },
    ],
    hints: [
      "Click a switch, type configure.",
      "set system host-name rack1-access — then look: the canvas label hasn't changed yet. Run show | compare to see your pending change.",
      "commit is what makes it real. Watch the label update the moment you do.",
    ],
  },
  {
    id: "access-distribution",
    title: "4. Access → Distribution Uplink",
    desc: "Classic datacenter shape: a distribution switch uplinked to an access switch, hosts off the access switch.",
    checks: [
      { desc: "2 switches cabled to each other (the uplink)",
        why: "This cable is the uplink — the one link every host on the access switch depends on to reach anything beyond it.",
        test: () => Object.values(links).some(l =>
          devices[l.a.dev] && devices[l.b.dev] &&
          devices[l.a.dev].type === "switch" && devices[l.b.dev].type === "switch") },
      { desc: "At least 2 hosts hanging off the switches",
        why: "You need traffic to actually cross the uplink to prove it works, not just exist.",
        test: () => devsBy("host").length >= 2 },
      { desc: "Hosts share one subnet and ping across the uplink",
        why: "This is the real test: the uplink isn't just plugged in, it's actually carrying traffic between two separate switches.",
        test: () => { const hs = devsBy("host").filter(h => h.cfg.ip);
          return hs.length >= 2 && pingOk(hs[0], hs[1].cfg.ip); } },
      { desc: "Both switches renamed to something real (committed host-name)",
        why: "In a real rack, an unlabelled switch is a liability at 2 AM. Naming devices the moment you deploy them is basic hygiene, not decoration.",
        test: () => devsBy("switch").filter(sw => cfgGet(sw.config, ["system", "host-name"])).length >= 2 },
    ],
    hints: [
      "Two switches, one cable between them — that's your uplink. Hosts plug into one of them.",
      "Factory-default ports are access ports in vlan default, so same-subnet hosts should ping as soon as cables and IPs are right.",
      "Rename both switches like rack labels (dist-1, acc-1) — set system host-name, commit.",
    ],
  },
  {
    id: "isp-onboarding",
    title: "5. Onboard a Client via ISP",
    desc: "A router with a WAN link to an ISP and a LAN link into your switch. Get a brand-new client host to the internet — try pinging 8.8.8.8 once it all works.",
    checks: [
      { desc: "1 router, 1 ISP node, 1 switch, 1 host placed",
        why: "This is the minimum chain a real internet handoff needs: something to deliver service, something to route it, something to distribute it, and something to use it.",
        test: () => devsBy("router").length >= 1 && devsBy("isp").length >= 1 &&
                    devsBy("switch").length >= 1 && devsBy("host").length >= 1 },
      { desc: "Router cabled to both the ISP and the switch",
        why: "The router is the boundary between your network and theirs — it needs a leg on each side, or there's no path for traffic to cross.",
        test: () => { const rt = devsBy("router")[0];
          if(!rt) return false;
          const touches = t => Object.values(links).some(l =>
            [l.a, l.b].some(e => e.dev === rt.id) && [l.a, l.b].some(e => devices[e.dev] && devices[e.dev].type === t));
          return touches("isp") && touches("switch"); } },
      { desc: "Router has an address on both WAN and LAN interfaces",
        why: "An interface with no address can't originate or terminate IP traffic — both sides of the router need an identity before anything can route.",
        test: () => devsBy("router").some(rt => Object.keys(D(rt).l3ports).length >= 2) },
      { desc: "Router has a default route (0.0.0.0/0) at the ISP",
        why: "Without a default route, the router has no idea where to send traffic for destinations it doesn't specifically know — which is almost the entire internet.",
        test: () => devsBy("router").some(rt => D(rt).routes.some(r => r.net === "0.0.0.0" && r.bits === 0)) },
      { desc: "Client host (with a gateway set) pings the ISP",
        why: "This proves the LAN side works end to end before adding NAT to the picture — isolate each layer before stacking the next one on top.",
        test: () => { const isp = devsBy("isp")[0];
          const h = devsBy("host").find(x => x.cfg.ip);
          return isp && h && pingOk(h, isp.cfg.ip); } },
      { desc: "Source NAT configured on the router (the internet won't answer 192.168.x)",
        why: "The internet has no route back to a private address — NAT rewrites the source so replies have somewhere real to go.",
        test: () => devsBy("router").some(rt => (D(rt).natRules || []).length > 0) },
      { desc: "Client host reaches the internet (ping 8.8.8.8)",
        why: "This is the actual deliverable — everything before it was necessary, but this is the only check that proves the service works as sold.",
        test: () => { const h = devsBy("host").find(x => x.cfg.ip);
          return h && pingOk(h, "8.8.8.8"); } },
    ],
    hints: [
      "Layout: Host → Switch → Router(LAN) … Router(WAN) → ISP. Cable it all first.",
      "Router WAN: set interfaces ge-0/0/0 unit 0 family inet address 203.0.113.2/30 (same /30 as the ISP — check its IP with show interfaces terse on the ISP node). Router LAN: another address in your client subnet.",
      "Default route: set routing-options static route 0.0.0.0/0 next-hop 203.0.113.1. Commit.",
      "The host needs an IP in the LAN subnet AND a gateway: ip route add default via <router-lan-ip>. No gateway = 'Network is unreachable'.",
      "Pinging the ISP works, 8.8.8.8 doesn't? The internet can't route replies to private addresses. On the router: set security nat source rule-set OFFICE from interface <lan-if>.0, ... to interface <wan-if>.0, ... rule R1 then source-nat interface. Watch the NAT tag on the animation.",
    ],
  },
  {
    id: "interconnect-recovery",
    title: "6. Site Interconnect Recovery",
    desc: "Two sites, one interconnect, and a ticket: 'site B unreachable'. Bring the link back AND prove it end-to-end — a green port LED is not proof.",
    setup(){
      const swA = makeSwitch(120, 120, 8); cfgDo(swA, ["set system host-name site-a-acc1"]);
      const swB = makeSwitch(520, 120, 8); cfgDo(swB, ["set system host-name site-b-acc1"]);
      const hA = makeHost(120, 300); devices[hA].name = "site-a-mgmt"; hostSet(hA, "10.10.10.1", 24);
      const hB = makeHost(520, 300); devices[hB].name = "site-b-mgmt"; hostSet(hB, "10.10.10.2", 24);
      cable(hA, "eth0", swA, "ge-0/0/1");
      cable(hB, "eth0", swB, "ge-0/0/1");
      cable(swA, "ge-0/0/0", swB, "ge-0/0/0", "remote");
      cfgDo(swA, ["set interfaces ge-0/0/0 disable"]);
    },
    checks: [
      { desc: "Both sites placed with the interconnect between them",
        why: "Reproducing the exact topology behind a real ticket is the first step of any investigation — you can't diagnose what you haven't built.",
        test: () => byName("site-a-acc1") && byName("site-b-acc1") },
      { desc: "The interconnect port is admin-up on both ends",
        why: "An interconnect has two owners and two ends — checking only your own side is how half of these tickets get closed and reopened an hour later.",
        test: () => { const a = byName("site-a-acc1"), b = byName("site-b-acc1");
          return a && b && !D(a).portCfg["ge-0/0/0"].disabled && !D(b).portCfg["ge-0/0/0"].disabled; } },
      { desc: "site-a-mgmt pings site-b-mgmt across the interconnect",
        why: "A port showing 'up' proves the physical layer only. Traffic actually crossing the link is the only proof the ticket is truly resolved.",
        test: () => pingOk("site-a-mgmt", "10.10.10.2") },
    ],
    hints: [
      "Load the setup — the interconnect arrives down, like the ticket says.",
      "On site-a-acc1: show interfaces terse. One port is admin down.",
      "configure, then delete interfaces ge-0/0/0 disable, commit. Check BOTH ends — interconnects have two sides.",
      "Now prove it: from site-a-mgmt's shell, ping 10.10.10.2. Link light ≠ connectivity.",
    ],
  },
  {
    id: "access-control-segment",
    title: "7. Physical Access-Control Segment",
    desc: "Door controllers share switches with client gear but live walled off in their own VLAN. Ops needs to reach them; clients must not.",
    checks: [
      { desc: "Switch has a client VLAN and a separate security VLAN",
        why: "Physical separation isn't enough when devices share a switch — a VLAN is what actually walls the security systems off from client traffic.",
        test: () => devsBy("switch").some(sw => nonDefaultVlans(sw).length >= 2) },
      { desc: "Client host, access-panel host, and ops host placed (3 hosts)",
        why: "You need one device to represent each role — the thing that must be blocked, the thing to protect, and the team that legitimately needs access.",
        test: () => devsBy("host").length >= 3 },
      { desc: "Ops host shares the access-panel's VLAN (non-default)",
        why: "Ops needs to actually reach the panel to manage it — which means being inside its VLAN, not just on the same physical switch.",
        test: () => { const hs = devsBy("host");
          if(hs.length < 3) return false;
          const vs = hs.map(hostAccessVlan);
          return hs.some((h1, i) => hs.some((h2, j) =>
            i !== j && vs[i] && vs[i] === vs[j] && vs[i] !== "default")); } },
      { desc: "The client host CANNOT reach the access-panel",
        why: "This is the actual security requirement. A wall that isn't tested is just a hope.",
        test: () => { const hs = devsBy("host").filter(h => h.cfg.ip);
          if(hs.length < 3) return false;
          for(const h1 of hs) for(const h2 of hs){
            if(h1 === h2) continue;
            const v1 = hostAccessVlan(h1), v2 = hostAccessVlan(h2);
            if(v1 && v2 && v1 !== v2 && !pingOk(h1, h2.cfg.ip)) return true;
          }
          return false; } },
    ],
    hints: [
      "Two non-default VLANs on the switch: set vlans client vlan-id 10, set vlans security vlan-id 99.",
      "Client host's port → vlan client. BOTH the panel's port AND the ops host's port → vlan security. That's what gives ops reachability while clients stay blind.",
      "Full port statement: set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members security — and commit. Then prove it with pings from each host.",
    ],
  },
  {
    id: "multi-tenant-vlans",
    title: "8. Multi-Tenant + the Shared Router Trap",
    desc: "Two customers on one switch, one shared gateway router. Here's the trap: a router with interfaces in both subnets will happily route customer A into customer B. VLANs alone don't save you — you need a firewall filter.",
    checks: [
      { desc: "Switch has two customer VLANs (not counting default)",
        why: "Two tenants sharing hardware absolutely require separate broadcast domains — this is the baseline isolation before the trap even applies.",
        test: () => devsBy("switch").some(sw => nonDefaultVlans(sw).length >= 2) },
      { desc: "Two customer hosts: different VLANs, different subnets, gateways set",
        why: "Different subnets are what make the router relevant at all — without them, this would just be the VLAN-isolation lab again.",
        test: () => { const hs = devsBy("host").filter(h => h.cfg.ip && h.cfg.gw);
          if(hs.length < 2) return false;
          const vs = hs.map(hostAccessVlan).filter(Boolean);
          const nets = new Set(hs.map(h => networkOf(h.cfg.ip, 24)));
          return new Set(vs).size >= 2 && nets.size >= 2; } },
      { desc: "Router has a gateway address in each customer subnet",
        why: "A router can only forward between subnets it has a presence in — one leg per tenant is what lets it cross the VLAN boundary at all.",
        test: () => devsBy("router").some(rt => Object.keys(D(rt).l3ports).length >= 2) },
      { desc: "Each customer can ping their own gateway",
        why: "This confirms basic L3 reachability BEFORE the trap — if a tenant can't even reach their own gateway, the cross-tenant test downstream would be meaningless.",
        test: () => { const rt = devsBy("router")[0];
          const hs = devsBy("host").filter(h => h.cfg.ip);
          if(!rt || hs.length < 2) return false;
          return hs.every(h => Object.values(D(rt).l3ports).some(p => sameSubnet(p.ip, h.cfg.ip, p.bits) && pingOk(h, p.ip))); } },
      { desc: "Customer A cannot reach Customer B — despite the shared router (firewall filter!)",
        why: "This is the whole lesson: routing alone will happily connect two tenants through a shared router. Only a filter, explicitly blocking it, actually enforces the isolation everyone assumes VLANs already provide.",
        test: () => { const hs = devsBy("host").filter(h => h.cfg.ip && h.cfg.gw);
          if(hs.length < 2) return false;
          const [h1, h2] = hs;
          if(networkOf(h1.cfg.ip, 24) === networkOf(h2.cfg.ip, 24)) return false;
          return !pingOk(h1, h2.cfg.ip); } },
    ],
    hints: [
      "Build it open first: two VLANs (cust-a, cust-b), a host in each with its own subnet, router with a leg in each VLAN (each router port goes to an access port of the right VLAN). Set gateways on the hosts, prove each host pings its gateway — then ping A→B and watch it WORK. That's the trap.",
      "Now filter: set firewall family inet filter CUST-A-IN term block-cross from destination-address <cust-b-subnet>/24, …then discard. And the crucial part: set firewall family inet filter CUST-A-IN term allow then accept — a JunOS filter ends in an implicit discard-everything!",
      "Apply it: set interfaces <cust-a-facing-port> unit 0 family inet filter input CUST-A-IN. Commit, re-ping: gateway still answers, A→B dies. That's 'allowed by routing, blocked by policy'.",
    ],
  },
  {
    id: "irb-intervlan",
    title: "9. Inter-VLAN Routing with irb",
    desc: "Real EX switches route between VLANs themselves — no external router. Give each VLAN an irb gateway and get staff talking to guests, deliberately.",
    checks: [
      { desc: "Two VLANs, each bound to an irb L3 interface",
        why: "Without an irb, a VLAN is purely L2 — switching only. Binding it to an irb is what gives the switch itself a routable presence in that VLAN.",
        test: () => devsBy("switch").some(sw =>
          Object.values(D(sw).vlans).filter(v => v.l3).length >= 2) },
      { desc: "Both irb units have addresses (the two gateways)",
        why: "An irb with no address can't be anyone's gateway — hosts need something real to send their inter-VLAN traffic to.",
        test: () => devsBy("switch").some(sw => Object.keys(D(sw).irbs).length >= 2) },
      { desc: "A host in each VLAN, with IP and matching gateway",
        why: "The gateway a host is configured with must actually be its own VLAN's irb, or its inter-VLAN traffic has nowhere to go.",
        test: () => { const hs = devsBy("host").filter(h => h.cfg.ip && h.cfg.gw);
          if(hs.length < 2) return false;
          return new Set(hs.map(hostAccessVlan).filter(Boolean)).size >= 2; } },
      { desc: "Cross-VLAN ping succeeds (through the switch's own irb)",
        why: "This proves the switch itself is doing the routing — no separate router device exists here, which is the point of irb on real EX hardware.",
        test: () => { const hs = devsBy("host").filter(h => h.cfg.ip && h.cfg.gw);
          if(hs.length < 2) return false;
          const [h1, h2] = hs;
          if(hostAccessVlan(h1) === hostAccessVlan(h2)) return false;
          return pingOk(h1, h2.cfg.ip); } },
    ],
    hints: [
      "VLANs first: set vlans staff vlan-id 10 / set vlans guest vlan-id 20, one host access-ported into each, different subnets (10.0.10.x, 10.0.20.x).",
      "The L3 part is two statements per VLAN: set interfaces irb unit 10 family inet address 10.0.10.1/24 and set vlans staff l3-interface irb.10 (commit will refuse one without the other).",
      "Hosts: ip route add default via 10.0.10.1 (their own VLAN's irb). Then ping across. show route on the switch — see the two Direct routes doing the work?",
    ],
  },
  {
    id: "trunk-span",
    title: "10. Trunking Across Switches",
    desc: "Two access switches, VLANs that exist on both, one cable carrying them all — tagged. This is what every uplink in a real building does.",
    setup(){
      const swA = makeSwitch(120, 120, 8); cfgDo(swA, ["set system host-name acc-east"]);
      const swB = makeSwitch(520, 120, 8); cfgDo(swB, ["set system host-name acc-west"]);
      cable(swA, "ge-0/0/0", swB, "ge-0/0/0");
      const mk = (name, x, y, sw, port, ip) => {
        const h = makeHost(x, y); devices[h].name = name; hostSet(h, ip, 24);
        cable(h, "eth0", sw, port);
      };
      mk("staff-east", 40, 300, swA, "ge-0/0/2", "10.0.10.11");
      mk("guest-east", 220, 300, swA, "ge-0/0/3", "10.0.20.21");
      mk("staff-west", 440, 300, swB, "ge-0/0/2", "10.0.10.12");
      mk("guest-west", 620, 300, swB, "ge-0/0/3", "10.0.20.22");
    },
    checks: [
      { desc: "Both switches define the same two VLANs (staff/guest style)",
        why: "A VLAN tag only means something if BOTH switches agree what VLAN 10 and 20 actually are — mismatched definitions silently break the trunk's purpose.",
        test: () => devsBy("switch").filter(sw => nonDefaultVlans(sw).length >= 2).length >= 2 },
      { desc: "The inter-switch link is a trunk on BOTH ends, carrying both VLANs",
        why: "A trunk is a two-sided agreement. One end in trunk mode and the other in access mode is a classic real-world outage, not a working uplink.",
        test: () => Object.values(links).some(l => {
          const a = devices[l.a.dev], b = devices[l.b.dev];
          if(!a || !b || a.type !== "switch" || b.type !== "switch") return false;
          const pa = D(a).portCfg[l.a.port], pb = D(b).portCfg[l.b.port];
          return pa && pb && pa.mode === "trunk" && pb.mode === "trunk" &&
                 pa.vlanIds.length >= 2 && pb.vlanIds.length >= 2; }) },
      { desc: "Same-VLAN hosts ping across the trunk (staff-east → staff-west)",
        why: "This is the actual deliverable of trunking: one VLAN, stretched cleanly across two physical switches over a single cable.",
        test: () => pingOk("staff-east", "10.0.10.12") && pingOk("guest-east", "10.0.20.22") },
      { desc: "Cross-VLAN still fails (the trunk carries VLANs, it doesn't merge them)",
        why: "A trunk transports VLANs, it does not merge them — if cross-VLAN traffic started working here, something would be misconfigured, not improved.",
        test: () => byName("staff-east") && !pingOk("staff-east", "10.0.20.22") },
    ],
    hints: [
      "On BOTH switches: create vlans staff (10) and guest (20), and put ge-0/0/2 in staff, ge-0/0/3 in guest (access ports).",
      "The uplink ge-0/0/0, on both ends: set interfaces ge-0/0/0 unit 0 family ethernet-switching interface-mode trunk, then vlan members [ staff guest ] (yes, the bracket list works).",
      "Commit both sides. An access-mode uplink would only ever carry ONE vlan untagged — the trunk carries both, tagged. show vlans marks trunk ports with *.",
    ],
  },
  {
    id: "commit-confirmed",
    title: "11. Commit Confirmed — the Safety Net",
    desc: "You're changing a switch you can only reach THROUGH itself. One bad commit and it's a car ride to the datacenter. JunOS has a seatbelt: commit confirmed.",
    setup(){
      const sw = makeSwitch(300, 140, 8);
      const h = makeHost(300, 320); devices[h].name = "mgmt-pc"; hostSet(h, "10.0.0.10", 24);
      cable(h, "eth0", sw, "ge-0/0/1");
    },
    checks: [
      { desc: "A change was committed with commit confirmed",
        why: "commit confirmed is the specific safety mechanism for changes to a device you can only reach through itself — an ordinary commit gives you no way back if it locks you out.",
        test: () => devsBy("switch").some(sw => sw.stats.usedCommitConfirmed) },
      { desc: "…and then actually confirmed (no rollback timer left running)",
        why: "The safety net only protects you if you forget to confirm. If you meant the change to stick, confirming it is what makes it permanent instead of temporary.",
        test: () => devsBy("switch").some(sw => sw.stats.usedCommitConfirmed && !sw.commitPending) },
      { desc: "The change survived: switch has a committed host-name",
        why: "This proves the whole mechanism worked end to end — the change went live, you confirmed it, and it's genuinely part of the active configuration now.",
        test: () => devsBy("switch").some(sw => sw.stats.usedCommitConfirmed && cfgGet(sw.config, ["system", "host-name"])) },
    ],
    hints: [
      "Make any change — set system host-name remote-core-1 — but don't plain-commit it.",
      "commit confirmed 1 → the change goes live, AND a 1-minute dead-man timer starts (watch the CLI header). If you'd locked yourself out, doing nothing would undo it.",
      "You're not locked out, so confirm it: type commit before the timer runs out. If you wait instead, watch the hostname snap back — that's the rollback saving you.",
    ],
  },
  {
    id: "filtered-segment",
    title: "12. Allowed by Routing, Blocked by Policy",
    desc: "Everything here pings — guest VLAN, ops VLAN, gateways, all routed by the switch. The ticket: guests must stop reaching the ops server, but must keep working otherwise. That's a firewall filter, not a VLAN change.",
    setup(){
      const sw = makeSwitch(300, 120, 8);
      cfgDo(sw, [
        "set system host-name sec-core",
        "set vlans ops vlan-id 10", "set vlans guest vlan-id 20",
        "set interfaces irb unit 10 family inet address 10.0.10.1/24",
        "set interfaces irb unit 20 family inet address 10.0.20.1/24",
        "set vlans ops l3-interface irb.10", "set vlans guest l3-interface irb.20",
        "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members ops",
        "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members guest",
      ]);
      const s = makeHost(140, 320); devices[s].name = "ops-srv"; hostSet(s, "10.0.10.5", 24, "10.0.10.1");
      const g = makeHost(460, 320); devices[g].name = "guest-pc"; hostSet(g, "10.0.20.7", 24, "10.0.20.1");
      cable(s, "eth0", sw, "ge-0/0/1");
      cable(g, "eth0", sw, "ge-0/0/2");
    },
    checks: [
      { desc: "guest-pc can no longer reach ops-srv (10.0.10.5)",
        why: "This is the actual security requirement from the ticket — everything else in this scenario exists to get here without breaking anything else.",
        test: () => byName("guest-pc") && !pingOk("guest-pc", "10.0.10.5") },
      { desc: "guest-pc still reaches its own gateway (10.0.20.1) — you filtered, not broke",
        why: "A filter that's too broad looks identical to success on the one thing you tested, and silently breaks everything else — this check catches that mistake.",
        test: () => pingOk("guest-pc", "10.0.20.1") },
      { desc: "A firewall filter with a discard/reject term is applied on the switch",
        why: "Confirms the fix is a real, applied filter — not a coincidence of routing, and not a filter that exists in config but was never attached to an interface.",
        test: () => devsBy("switch").some(sw => {
          const applied = JSON.stringify(cfgGet(sw.config, ["interfaces"]) || {}).includes('"filter"');
          const hasDrop = Object.values(D(sw).filters).some(terms => terms.some(t => t.then !== "accept"));
          return applied && hasDrop; }) },
    ],
    hints: [
      "Load the setup and first PROVE the problem: from guest-pc, ping 10.0.10.5 — it works, because irb routing connects the VLANs.",
      "Build the filter on sec-core: set firewall family inet filter GUEST-IN term no-ops from destination-address 10.0.10.0/24, then set … term no-ops then discard.",
      "The classic mistake: commit that alone and EVERYTHING guest dies — JunOS filters end with an implicit discard. Add set firewall family inet filter GUEST-IN term ok then accept.",
      "Apply it where guest traffic enters L3: set interfaces irb unit 20 family inet filter input GUEST-IN. Commit. Guest→ops dead, guest→gateway alive.",
    ],
  },
  {
    id: "lacp-bundle",
    title: "13. Link Aggregation (LACP)",
    desc: "Two parallel cables between two switches. Right now that's a loop — a broadcast storm (look at it flashing). Bundle them into ae0 with LACP: one logical link, double capacity, and it survives losing a member.",
    setup(){
      const swA = makeSwitch(140, 140, 8); cfgDo(swA, ["set system host-name agg-a"]);
      const swB = makeSwitch(540, 140, 8); cfgDo(swB, ["set system host-name agg-b"]);
      cable(swA, "ge-0/0/0", swB, "ge-0/0/0");
      cable(swA, "ge-0/0/1", swB, "ge-0/0/1");
      const hA = makeHost(140, 320); devices[hA].name = "pc-a"; hostSet(hA, "10.0.0.1", 24);
      const hB = makeHost(540, 320); devices[hB].name = "pc-b"; hostSet(hB, "10.0.0.2", 24);
      cable(hA, "eth0", swA, "ge-0/0/3");
      cable(hB, "eth0", swB, "ge-0/0/3");
    },
    checks: [
      { desc: "Both switches: ge-0/0/0 and ge-0/0/1 are members of ae0",
        why: "LACP membership must be configured identically on BOTH ends — a member declared on only one switch has no partner and never joins the bundle.",
        test: () => devsBy("switch").filter(sw => D(sw).aes.ae0 && D(sw).aes.ae0.members.length >= 2).length >= 2 },
      { desc: "LACP is configured on both bundles, and both come up",
        why: "Declaring ports as members isn't enough — the bundle itself needs the lacp active statement, or the two switches never negotiate and nothing forwards.",
        test: () => { const sws = devsBy("switch").filter(sw => D(sw).aes.ae0);
          return sws.length >= 2 && sws.every(sw => NET.aeInfo[sw.id] && NET.aeInfo[sw.id].ae0 && NET.aeInfo[sw.id].ae0.up); } },
      { desc: "No more storm — the loop became one logical link",
        why: "This is the reason LACP exists here at all: two parallel cables were a loop; bundled correctly, they become ONE logical link with no loop at all.",
        test: () => NET.stormLinks.size === 0 && Object.keys(links).length > 0 },
      { desc: "pc-a pings pc-b across the bundle",
        why: "Proves the bundle isn't just administratively up — it's actually forwarding real traffic between the two switches.",
        test: () => pingOk("pc-a", "10.0.0.2") },
    ],
    hints: [
      "See the storm first: two parallel L2 paths = a loop. From pc-a, ping 10.0.0.2 and read the error.",
      "On BOTH switches, put the ports in the bundle: set interfaces ge-0/0/0 ether-options 802.3ad ae0 (and ge-0/0/1 the same).",
      "The bundle itself needs config on BOTH sides: set interfaces ae0 aggregated-ether-options lacp active plus set interfaces ae0 unit 0 family ethernet-switching. Commit. One side only = 'no LACP partner' in show lacp interfaces.",
      "show lacp interfaces should say Collecting distributing on both members. Ping again — then try disabling one member port and ping once more: still up. That's the point of a LAG.",
    ],
  },
  {
    id: "rstp-loop",
    title: "14. The Loop and the Tree (RSTP)",
    desc: "Three switches cabled in a triangle for redundancy — and the whole segment is a broadcast storm, because nothing is breaking the loop. Turn on RSTP and watch it surgically block exactly one port.",
    setup(){
      const s1 = makeSwitch(300, 60, 8); cfgDo(s1, ["set system host-name ring-1"]);
      const s2 = makeSwitch(120, 240, 8); cfgDo(s2, ["set system host-name ring-2"]);
      const s3 = makeSwitch(500, 240, 8); cfgDo(s3, ["set system host-name ring-3"]);
      cable(s1, "ge-0/0/0", s2, "ge-0/0/0");
      cable(s2, "ge-0/0/1", s3, "ge-0/0/1");
      cable(s3, "ge-0/0/0", s1, "ge-0/0/1");
      const hA = makeHost(60, 420); devices[hA].name = "pc-2"; hostSet(hA, "10.0.0.2", 24);
      const hB = makeHost(560, 420); devices[hB].name = "pc-3"; hostSet(hB, "10.0.0.3", 24);
      cable(hA, "eth0", s2, "ge-0/0/4");
      cable(hB, "eth0", s3, "ge-0/0/4");
    },
    checks: [
      { desc: "RSTP enabled on all three switches",
        why: "RSTP only breaks a loop if EVERY switch in it participates — one switch left out keeps flooding regardless of what the other two do.",
        test: () => devsBy("switch").length >= 3 && devsBy("switch").every(sw => D(sw).rstp) },
      { desc: "The storm is gone",
        why: "This is the direct consequence of RSTP doing its job — the loop that was flooding the segment is now broken.",
        test: () => Object.keys(links).length > 0 && NET.stormLinks.size === 0 },
      { desc: "Exactly the redundant path is blocked (a port shows BLK)",
        why: "RSTP doesn't remove the redundant cable, it holds one port in reserve — this confirms the algorithm found and blocked exactly the one path that would complete the loop.",
        test: () => NET.blocked.size >= 1 },
      { desc: "pc-2 pings pc-3 — the ring works, minus the loop",
        why: "This proves the topology is still fully connected — RSTP removed the LOOP, not the redundancy or the connectivity.",
        test: () => pingOk("pc-2", "10.0.0.3") },
    ],
    hints: [
      "Ping from pc-2 first and read the storm error. The flashing links ARE the packet, endlessly.",
      "On each of the three switches: configure, set protocols rstp, commit.",
      "The instant the last one commits, the storm dies and one port goes amber — show spanning-tree interface shows who blocked (ALT/BLK) and who the root bridge is.",
      "Unplug one of the OTHER triangle cables (delete mode) and watch the blocked port take over. That's why the loop was built in the first place.",
    ],
  },
  {
    id: "storm-control",
    title: "15. Storm Control — the Backstop",
    desc: "Same double-cable loop as the LACP lab — but this time you're not allowed to rebuild it. Deploy storm control so the switch protects itself: when the storm hits, the port shuts down.",
    setup(){
      const swA = makeSwitch(140, 140, 8); cfgDo(swA, ["set system host-name edge-a"]);
      const swB = makeSwitch(540, 140, 8); cfgDo(swB, ["set system host-name edge-b"]);
      cable(swA, "ge-0/0/0", swB, "ge-0/0/0");
      cable(swA, "ge-0/0/1", swB, "ge-0/0/1");
      const hA = makeHost(140, 320); devices[hA].name = "pc-a"; hostSet(hA, "10.0.0.1", 24);
      const hB = makeHost(540, 320); devices[hB].name = "pc-b"; hostSet(hB, "10.0.0.2", 24);
      cable(hA, "eth0", swA, "ge-0/0/3");
      cable(hB, "eth0", swB, "ge-0/0/3");
    },
    checks: [
      { desc: "A storm-control profile with action-shutdown exists and is bound to a port",
        why: "A profile that exists in config but isn't bound to an interface protects nothing — storm control has to actually be attached to the port carrying the risk.",
        test: () => devsBy("switch").some(sw =>
          Object.values(D(sw).stormProfiles).some(p => p.shutdown) &&
          Object.values(D(sw).portCfg).some(pc => pc.storm)) },
      { desc: "The backstop fired: a port is error-disabled",
        why: "This confirms storm control actually triggered under real storm conditions, not just that it was configured and never tested.",
        test: () => devsBy("switch").some(sw => Object.keys(sw.errDisabled).length > 0) },
      { desc: "The storm is contained",
        why: "The whole point of the backstop — the runaway traffic causing the storm has been physically stopped at the port level.",
        test: () => Object.keys(links).length > 0 && NET.stormLinks.size === 0 },
      { desc: "pc-a still pings pc-b (over the surviving cable)",
        why: "Storm control shutting down ONE port shouldn't take down the whole network — this proves the fix was surgical, not a bigger outage than the problem.",
        test: () => pingOk("pc-a", "10.0.0.2") },
    ],
    hints: [
      "Define the profile on one switch: set forwarding-options storm-control-profiles kill-storms all action-shutdown.",
      "Bind it to one of the looped ports: set interfaces ge-0/0/1 unit 0 family ethernet-switching storm-control kill-storms. Commit.",
      "The storm slams into the port and the port shuts itself down — show interfaces terse marks it error-disabled. Loop broken, one path survives, hosts still ping.",
      "Recovery, when you fix the physical loop for real: clear ethernet-switching error-disable ge-0/0/1.",
    ],
  },
  {
    id: "asymmetric-routing",
    title: "16. The Reply That Never Came Back",
    desc: "HQ can send packets to the branch — and every ping still times out. Forward path ≠ round trip: the branch router has no route BACK. The nastiest class of ticket there is.",
    setup(){
      const r1 = makeRouter(140, 120, 4); cfgDo(r1, [
        "set system host-name hq-rtr",
        "set interfaces ge-0/0/0 unit 0 family inet address 10.0.0.1/24",
        "set interfaces ge-0/0/1 unit 0 family inet address 192.168.100.1/30",
        "set routing-options static route 10.0.1.0/24 next-hop 192.168.100.2",
      ]);
      const r2 = makeRouter(540, 120, 4); cfgDo(r2, [
        "set system host-name branch-rtr",
        "set interfaces ge-0/0/0 unit 0 family inet address 10.0.1.1/24",
        "set interfaces ge-0/0/1 unit 0 family inet address 192.168.100.2/30",
      ]);
      cable(r1, "ge-0/0/1", r2, "ge-0/0/1", "remote");
      const s1 = makeSwitch(140, 280, 8); const s2 = makeSwitch(540, 280, 8);
      cable(r1, "ge-0/0/0", s1, "ge-0/0/0");
      cable(r2, "ge-0/0/0", s2, "ge-0/0/0");
      const h1 = makeHost(140, 430); devices[h1].name = "hq-pc"; hostSet(h1, "10.0.0.10", 24, "10.0.0.1");
      const h2 = makeHost(540, 430); devices[h2].name = "branch-pc"; hostSet(h2, "10.0.1.10", 24, "10.0.1.1");
      cable(h1, "eth0", s1, "ge-0/0/2");
      cable(h2, "eth0", s2, "ge-0/0/2");
    },
    checks: [
      { desc: "The two-site topology is in place",
        why: "Reproducing the exact topology behind a real ticket is the first step of any investigation — you can't diagnose what you haven't built.",
        test: () => byName("hq-rtr") && byName("branch-rtr") && byName("hq-pc") && byName("branch-pc") },
      { desc: "branch-rtr has a route back to HQ's subnet (10.0.0.0/24)",
        why: "This is the actual missing piece: a router can forward a packet FORWARD perfectly and still have no route to send the reply BACK.",
        test: () => { const r = byName("branch-rtr");
          return r && D(r).routes.some(rt => sameSubnet("10.0.0.10", rt.net, rt.bits)); } },
      { desc: "hq-pc pings branch-pc — the round trip finally closes",
        why: "Ping only succeeds if BOTH directions work — this is the proof that the asymmetry, the classic 'I can send but not receive' fault, is actually fixed.",
        test: () => pingOk("hq-pc", "10.0.1.10") },
    ],
    hints: [
      "From hq-pc: ping 10.0.1.10 and READ the error — it tells you the ping reached the far side and the reply died on the way back.",
      "traceroute 10.0.1.10 from hq-pc gets all the way there. So the forward path is innocent. Now show route on branch-rtr: how would it send anything to 10.0.0.0/24?",
      "The fix is one line on branch-rtr: set routing-options static route 10.0.0.0/24 next-hop 192.168.100.1. Commit. Every ping is two paths — always check the way back.",
    ],
  },
  {
    id: "nat-edge",
    title: "17. NAT at the Edge",
    desc: "Routes are perfect, the gateway answers, the ISP answers — and 8.8.8.8 still times out. Welcome to the most-Googled problem in networking: the internet cannot reply to a private address. Fix it with source NAT.",
    setup(){
      const rt = makeRouter(340, 100, 4); const isp = makeIsp(600, 60, "203.0.113.1");
      const sw = makeSwitch(160, 260, 8); const h = makeHost(160, 420);
      cfgDo(rt, [
        "set system host-name edge-1",
        "set interfaces ge-0/0/0 unit 0 family inet address 203.0.113.2/30",
        "set interfaces ge-0/0/1 unit 0 family inet address 192.168.50.1/24",
        "set routing-options static route 0.0.0.0/0 next-hop 203.0.113.1",
      ]);
      devices[h].name = "client-pc"; hostSet(h, "192.168.50.10", 24, "192.168.50.1");
      cable(rt, "ge-0/0/0", isp, "wan0", "remote");
      cable(rt, "ge-0/0/1", sw, "ge-0/0/0");
      cable(h, "eth0", sw, "ge-0/0/1");
    },
    checks: [
      { desc: "Baseline holds: client-pc pings the ISP edge (203.0.113.1)",
        why: "Confirms routing and the physical path already work, so any failure past this point is specifically a NAT problem, not something more basic.",
        test: () => pingOk("client-pc", "203.0.113.1") },
      { desc: "A source NAT rule-set is committed on the router",
        why: "This is the only fix that makes sense here — routing was already proven to work, so the missing piece has to be translation, not reachability.",
        test: () => devsBy("router").some(rt => (D(rt).natRules || []).length > 0) },
      { desc: "client-pc reaches the internet (8.8.8.8)",
        why: "This is the actual deliverable of NAT — a private address, invisible to the internet, now reaching it because its source is being rewritten to something public.",
        test: () => pingOk("client-pc", "8.8.8.8") },
    ],
    hints: [
      "Reproduce first: from client-pc, ping 203.0.113.1 (works) then 8.8.8.8 (fails). READ the failure — it names the exact problem: a private source address.",
      "On edge-1: set security nat source rule-set OFFICE from interface ge-0/0/1.0, then ... to interface ge-0/0/0.0.",
      "The rule itself: set security nat source rule-set OFFICE rule R1 match source-address 192.168.50.0/24, and ... rule R1 then source-nat interface. Commit.",
      "Ping 8.8.8.8 again and watch the router: the NAT tag shows your source being rewritten to 203.0.113.2 on the way out. show security nat source lists the rule.",
    ],
  },
  {
    id: "dhcp-serve",
    title: "18. DHCP — Stop Typing Addresses",
    desc: "A fresh laptop joins the staff VLAN. Nobody hand-types IPs in a real office: build an address pool on the switch, bind the DHCP server to the VLAN's irb, and let dhclient do the rest.",
    setup(){
      const sw = makeSwitch(300, 140, 8);
      cfgDo(sw, [
        "set system host-name staff-sw",
        "set vlans staff vlan-id 10",
        "set interfaces irb unit 10 family inet address 10.0.10.1/24",
        "set vlans staff l3-interface irb.10",
        "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff",
      ]);
      const h = makeHost(300, 320); devices[h].name = "laptop";
      cable(h, "eth0", sw, "ge-0/0/1");
    },
    checks: [
      { desc: "An address pool is committed (network, a range, and a router option)",
        why: "A DHCP server with no pool has nothing to hand out — the pool IS the promise the server can make to clients.",
        test: () => devsBy("switch").some(sw => (D(sw).pools || []).some(p => p.ranges.length && p.router)) },
      { desc: "The DHCP server is bound to irb.10 (the staff VLAN's gateway)",
        why: "DHCP DISCOVER is a broadcast that never crosses a VLAN boundary — the server has to be listening INSIDE the VLAN it's serving, not just configured somewhere on the box.",
        test: () => devsBy("switch").some(sw => D(sw).dhcpIfs && D(sw).dhcpIfs.has("irb.10")) },
      { desc: "laptop got a lease: address in 10.0.10.0/24 plus a gateway, via DHCP",
        why: "This proves the whole DORA exchange completed correctly — an address alone isn't enough if the gateway never arrived with it.",
        test: () => { const h = byName("laptop");
          return !!(h && h.cfg.viaDhcp && h.cfg.ip && sameSubnet(h.cfg.ip, "10.0.10.0", 24) && h.cfg.gw); } },
      { desc: "laptop pings its gateway (the lease actually works)",
        why: "A lease can be technically valid and still be useless if the address, mask or gateway don't actually work together — this is the real-world test.",
        test: () => pingOk("laptop", "10.0.10.1") },
    ],
    hints: [
      "Try dhclient eth0 on the laptop first — no offers. Nothing is serving this segment yet.",
      "The pool, on staff-sw: set access address-assignment pool STAFF family inet network 10.0.10.0/24, ... range r1 low 10.0.10.100, ... range r1 high 10.0.10.199.",
      "Clients also need to learn their gateway from the lease: set access address-assignment pool STAFF family inet dhcp-attributes router 10.0.10.1.",
      "Turn the server on where the VLAN lives: set system services dhcp-local-server group LAN interface irb.10. Commit, dhclient eth0 again, and watch the DISCOVER/OFFER/REQUEST/ACK dots fly. show dhcp server binding shows the lease.",
    ],
  },
  {
    id: "ospf-backbone",
    title: "19. OSPF — Routes That Route Themselves",
    desc: "Three sites in a triangle. You could hand-write six static routes and update them at every change — or turn on OSPF and let the routers learn the map themselves, including surviving a cut cable.",
    setup(){
      const r1 = makeRouter(140, 100, 4); const r2 = makeRouter(420, 60, 4); const r3 = makeRouter(620, 200, 4);
      cfgDo(r1, ["set system host-name hq-r",
        "set interfaces ge-0/0/1 unit 0 family inet address 10.9.12.1/30",
        "set interfaces ge-0/0/2 unit 0 family inet address 10.9.13.1/30",
        "set interfaces ge-0/0/0 unit 0 family inet address 10.1.0.1/24"]);
      cfgDo(r2, ["set system host-name mid-r",
        "set interfaces ge-0/0/1 unit 0 family inet address 10.9.12.2/30",
        "set interfaces ge-0/0/2 unit 0 family inet address 10.9.23.1/30"]);
      cfgDo(r3, ["set system host-name far-r",
        "set interfaces ge-0/0/2 unit 0 family inet address 10.9.23.2/30",
        "set interfaces ge-0/0/1 unit 0 family inet address 10.9.13.2/30",
        "set interfaces ge-0/0/0 unit 0 family inet address 10.3.0.1/24"]);
      cable(r1, "ge-0/0/1", r2, "ge-0/0/1", "remote");
      cable(r2, "ge-0/0/2", r3, "ge-0/0/2", "remote");
      cable(r1, "ge-0/0/2", r3, "ge-0/0/1", "remote");
      const s1 = makeSwitch(140, 280, 8); const s2 = makeSwitch(620, 360, 8);
      cable(r1, "ge-0/0/0", s1, "ge-0/0/0");
      cable(r3, "ge-0/0/0", s2, "ge-0/0/0");
      const h1 = makeHost(140, 430); devices[h1].name = "hq-pc"; hostSet(h1, "10.1.0.10", 24, "10.1.0.1");
      const h2 = makeHost(620, 500); devices[h2].name = "far-pc"; hostSet(h2, "10.3.0.10", 24, "10.3.0.1");
      cable(h1, "eth0", s1, "ge-0/0/2");
      cable(h2, "eth0", s2, "ge-0/0/2");
    },
    checks: [
      { desc: "OSPF enabled on all three routers (transit links, plus the LANs)",
        why: "OSPF only builds a complete map if every router and every relevant interface participates — leave one out and part of the network stays invisible to it.",
        test: () => devsBy("router").length >= 3 &&
          devsBy("router").every(rt => Object.keys(D(rt).ospf || {}).length >= 2) },
      { desc: "Adjacencies are Full — every router has two neighbors",
        why: "A neighbor relationship stuck below Full means the routers haven't actually synchronized their maps of the network yet — no usable routes come from it.",
        test: () => devsBy("router").every(rt => (D(rt).ospfNeighbors || []).length >= 2) },
      { desc: "hq-r learned the far LAN via OSPF (no statics anywhere)",
        why: "This is the actual point of the lab — proving the route was LEARNED, not typed, which is what lets it survive a topology change automatically.",
        test: () => { const r = byName("hq-r");
          return !!(r && (D(r).ospfRoutes || []).some(x => x.net === "10.3.0.0")); } },
      { desc: "hq-pc pings far-pc across the learned routes",
        why: "The final proof that the dynamically learned routes are not just present in the table, but genuinely usable for real traffic.",
        test: () => pingOk("hq-pc", "10.3.0.10") },
    ],
    hints: [
      "There are zero static routes here — show route on hq-r knows only its own subnets. That's the problem OSPF solves.",
      "On each router, enable OSPF on the transit interfaces: set protocols ospf area 0 interface ge-0/0/1.0 (and ge-0/0/2.0). Commit, then show ospf neighbor — Full means the adjacency formed.",
      "The LANs must be advertised too, but hosts shouldn't hear hellos: set protocols ospf area 0 interface ge-0/0/0.0 passive on hq-r and far-r.",
      "When hq-pc pings far-pc, run traceroute — then unplug the direct hq↔far link and traceroute again. The path re-routes through mid-r by itself. That's the whole point.",
    ],
  },
  {
    id: "rogue-switch",
    title: "20. The Rogue Switch",
    desc: "Someone in accounting plugged a cheap unmanaged switch into the wall port to get more sockets. Port security exists for exactly this: cap the port at one MAC address and let it shut itself down when the second one appears.",
    setup(){
      const sw = makeSwitch(280, 120, 8);
      cfgDo(sw, [
        "set system host-name acc-1",
        "set vlans staff vlan-id 10",
        "set interfaces irb unit 10 family inet address 10.0.10.1/24",
        "set vlans staff l3-interface irb.10",
        "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff",
        "set interfaces ge-0/0/3 unit 0 family ethernet-switching vlan members staff",
      ]);
      const legit = makeHost(120, 300); devices[legit].name = "desk-pc"; hostSet(legit, "10.0.10.5", 24, "10.0.10.1");
      cable(legit, "eth0", sw, "ge-0/0/1");
      const dumb = makeSwitch(480, 300, 5); cfgDo(dumb, ["set system host-name not-ours"]);
      cable(dumb, "ge-0/0/0", sw, "ge-0/0/3");
      const r1 = makeHost(420, 460); devices[r1].name = "rogue-pc1"; hostSet(r1, "10.0.10.201", 24, "10.0.10.1");
      const r2 = makeHost(580, 460); devices[r2].name = "rogue-pc2"; hostSet(r2, "10.0.10.202", 24, "10.0.10.1");
      cable(r1, "eth0", dumb, "ge-0/0/1");
      cable(r2, "eth0", dumb, "ge-0/0/2");
    },
    checks: [
      { desc: "MAC limit of 1 with packet-action shutdown committed on acc-1 ge-0/0/3",
        why: "This is the actual defense — without both the limit AND the shutdown action configured, the switch has no way to notice or react to a second device appearing.",
        test: () => { const sw = byName("acc-1");
          const lim = sw && D(sw).macLimit && D(sw).macLimit["ge-0/0/3"];
          return !!(lim && lim.limit === 1 && lim.shutdown); } },
      { desc: "The trap fired: ge-0/0/3 is error-disabled",
        why: "Configuring the defense isn't enough on its own — this proves it actually activated under a real violation, not just sitting there unused.",
        test: () => { const sw = byName("acc-1"); return !!(sw && sw.errDisabled["ge-0/0/3"]); } },
      { desc: "desk-pc is unaffected and still pings the gateway",
        why: "Port security should punish the specific violating port, not the whole network — this confirms the blast radius was exactly one port.",
        test: () => pingOk("desk-pc", "10.0.10.1") },
    ],
    hints: [
      "Right now both rogue PCs happily ping 10.0.10.1 through the wall port. One port, many MAC addresses — that's the tell.",
      "Arm the port on acc-1: set switch-options interface ge-0/0/3 interface-mac-limit 1 and set switch-options interface ge-0/0/3 packet-action shutdown. Commit.",
      "MAC learning happens on traffic: ping the gateway from rogue-pc1 (first MAC — fine), then from rogue-pc2. The second MAC trips the limit and the port error-disables itself. show log messages on acc-1 tells the story.",
      "Note who did NOT go down: desk-pc. Port security punishes the port, not the network.",
    ],
  },
  {
    id: "wireless-office",
    title: "21. The Wireless Office",
    desc: "No cable for the laptop — it joins the staff VLAN over the air. The AP is just a bridge: same VLAN, same DHCP, same gateway. The radio replaces the patch cable, and nothing else changes.",
    setup(){
      const sw = makeSwitch(220, 120, 8);
      cfgDo(sw, [
        "set system host-name office-sw",
        "set vlans staff vlan-id 10",
        "set interfaces irb unit 10 family inet address 10.0.10.1/24",
        "set vlans staff l3-interface irb.10",
        "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members staff",
        "set access address-assignment pool STAFF family inet network 10.0.10.0/24",
        "set access address-assignment pool STAFF family inet range r1 low 10.0.10.100",
        "set access address-assignment pool STAFF family inet range r1 high 10.0.10.199",
        "set access address-assignment pool STAFF family inet dhcp-attributes router 10.0.10.1",
        "set system services dhcp-local-server group LAN interface irb.10",
      ]);
      const ap = makeAp(520, 170, "office-wifi", "AP34", 165);
      cable(ap, "eth0", sw, "ge-0/0/2");
      const h = makeHost(560, 280);
      devices[h].name = "laptop";
    },
    checks: [
      { desc: "laptop is associated with office-wifi (no cable involved)",
        why: "Association is the wireless equivalent of plugging in a cable — nothing else on this checklist can work until the radio link itself exists.",
        test: () => { const h = byName("laptop"); return !!(h && wifiLinkOf(h.id)); } },
      { desc: "laptop got address and gateway via DHCP, over the air",
        why: "This proves the AP is truly acting as a transparent bridge — the exact same DHCP process that works over copper works identically over the radio link.",
        test: () => { const h = byName("laptop");
          return !!(h && h.cfg.viaDhcp && h.cfg.ip && sameSubnet(h.cfg.ip, "10.0.10.0", 24) && h.cfg.gw); } },
      { desc: "laptop pings its gateway across the wireless bridge",
        why: "The final proof that wireless isn't a separate, special network — it's the same staff VLAN, same gateway, just without a patch cable.",
        test: () => pingOk("laptop", "10.0.10.1") },
    ],
    hints: [
      "On the laptop: wifi scan. The dashed circle around the AP is its coverage — the laptop starts inside it.",
      "wifi join office-wifi associates. The dotted blue line that appears is the wireless link standing in for a cable.",
      "From here it is an ordinary DHCP story: dhclient eth0, then ping 10.0.10.1. For fun, drag the laptop outside the circle, wifi leave, and try joining again.",
    ],
  },
  {
    id: "hot-room",
    title: "22. The Hot Room",
    desc: "The ticket reads: 'core switch and router unreachable since 06:00'. Nothing is miscabled and no config changed — the room simply cooked. Every watt a device draws becomes heat; without cooling, the temperature climbs until the gear protects itself with a thermal shutdown. Fix the room, not the network.",
    setup(){
      const z = { id: uid("zn"), name: "Server room", x: 60, y: 70, w: 540, h: 380, hue: 2, kind: "building" };
      zones[z.id] = z;
      const r = { id: uid("zn"), name: "Rack A1", x: 90, y: 120, w: 190, h: 300, hue: 0, kind: "rack" };
      zones[r.id] = r;
      const sw = makeSwitch(110, 170, 48, "EX4300-48T");
      cfgDo(sw, ["set system host-name core-sw"]);
      const rt = makeRouter(110, 260, 12, "MX204");
      cfgDo(rt, ["set system host-name big-rtr"]);
      const h1 = makeHost(380, 160); devices[h1].name = "crunch-1"; hostSet(h1, "10.0.0.11", 24);
      const h2 = makeHost(380, 260); devices[h2].name = "crunch-2"; hostSet(h2, "10.0.0.12", 24);
      cable(h1, "eth0", sw, "ge-0/0/1");
      cable(h2, "eth0", sw, "ge-0/0/2");
    },
    checks: [
      { desc: "A cooling unit is running inside the server room",
        why: "A CRAC placed outside the room it's meant to cool does nothing for the heat actually building up inside — placement matters as much as capacity.",
        test: () => Object.values(devices).some(d => d.type === "crac" && d.powered !== false && !d.failed &&
          (() => { const z = zoneOf(d.id); return !!(z && z.name === "Server room"); })()) },
      { desc: "Room temperature back under 28°C",
        why: "This is the actual root cause finally addressed — the devices didn't fail from bad config, they thermally protected themselves from an overheating room.",
        test: () => { const z = Object.values(zones).find(z2 => z2.name === "Server room");
          return !!(z && THERMAL.zones[z.id] && THERMAL.zones[z.id].temp <= 28); } },
      { desc: "core-sw and big-rtr powered up and staying up",
        why: "Powering the devices back on before the room is actually cool just trips the same thermal shutdown again — this confirms the fix held, not just that a button was pressed.",
        test: () => { const a = byName("core-sw"), b = byName("big-rtr");
          return !!(a && b && a.powered !== false && b.powered !== false); } },
    ],
    hints: [
      "Open core-sw and read show log messages — chassisd wrote down exactly why it died: TEMPERATURE CRITICAL, thermal shutdown. The building header shows the room temperature live.",
      "Do the arithmetic the room did: the header chip climbs 1 degree for every 25 W of uncooled heat. A 48-port switch, an MX204 and two compute hosts is far more than an uncooled room can shed.",
      "Add > Power & cooling > Cooling unit — and place it INSIDE the Server room walls (a CRAC in the corridor cools the corridor). The in-row 10 kW unit is plenty.",
      "Watch the temperature chip fall, then press the power buttons on core-sw and big-rtr. If you power them up before cooling the room, they will just trip again — which is exactly what real chassis protection does.",
    ],
  },
  {
    id: "name-and-serve",
    title: "23. Name and Serve",
    desc: "Everything so far moved packets. Now make them mean something: a rack server runs DNS and a web page, and a client reaches it BY NAME — which is how every real connection begins. You will learn the two ways 'the site is down' can lie to you.",
    setup(){
      const sw = makeSwitch(240, 120, 8);
      cfgDo(sw, [
        "set system host-name office-sw",
        "set vlans staff vlan-id 10",
        "set interfaces irb unit 10 family inet address 10.0.10.1/24",
        "set vlans staff l3-interface irb.10",
        "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff",
        "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members staff",
      ]);
      const srv = makeServer(460, 120);
      devices[srv].name = "web-1";
      devices[srv].cfg.ip = "10.0.10.80"; devices[srv].cfg.bits = 24; devices[srv].cfg.gw = "10.0.10.1";
      const h = makeHost(240, 300);
      devices[h].name = "client-pc";
      hostSet(h, "10.0.10.21", 24, "10.0.10.1");
      cable(srv, "eth0", sw, "ge-0/0/1");
      cable(h, "eth0", sw, "ge-0/0/2");
    },
    checks: [
      { desc: "web-1 is serving: both dns and http running",
        why: "A server that isn't running the service can be perfectly reachable on the network and still refuse every connection — the service has to actually be listening.",
        test: () => { const s2 = byName("web-1");
          return !!(s2 && s2.cfg.services && s2.cfg.services.dns && s2.cfg.services.http); } },
      { desc: "A DNS record exists: web.lab points at web-1's address",
        why: "Without a record, 'web.lab' is just a string nobody knows how to translate — DNS is the lookup table that makes a name mean an address.",
        test: () => { const s2 = byName("web-1");
          return !!(s2 && s2.cfg.records && s2.cfg.records["web.lab"] === "10.0.10.80"); } },
      { desc: "client-pc knows who to ask: nameserver set to 10.0.10.80",
        why: "A client with no nameserver configured has no one to ask — the name resolution step can't even begin.",
        test: () => { const h2 = byName("client-pc"); return !!(h2 && h2.cfg.ns === "10.0.10.80"); } },
      { desc: "curl web.lab works end to end: resolve, connect, 200 OK",
        why: "This is the real end-to-end test — proving resolution, routing, AND the service itself all worked together, not just one piece in isolation.",
        test: () => { const h2 = byName("client-pc");
          return !!(h2 && curlCheck(h2, "web.lab").ok); } },
    ],
    hints: [
      "On web-1: service start dns and service start http. A server is just a computer that LISTENS — without a service running, a perfectly reachable machine says connection refused.",
      "Publish the name on web-1: dns add web.lab 10.0.10.80. Names are a lookup table somebody wrote — you just became that somebody.",
      "On client-pc: nameserver 10.0.10.80, then nslookup web.lab. Every by-name connection starts with this question, before a single byte goes to the website.",
      "curl web.lab — then break it both ways on purpose: service stop dns (names die while the site runs), service stop http (names resolve, connection refused). Learning to tell those apart is the whole lesson.",
    ],
  },
  {
    id: "ops-production",
    title: "24. Run It Like Production",
    desc: "The network works — now run it the way engineers actually do: manage switches over SSH instead of walking to the rack, and stream every box's log to one server. You will also lock yourself out on purpose, because everyone does it once.",
    setup(){
      const sw = makeSwitch(240, 120, 8);
      cfgDo(sw, [
        "set system host-name office-sw",
        "set vlans staff vlan-id 10",
        "set interfaces irb unit 10 family inet address 10.0.10.1/24",
        "set vlans staff l3-interface irb.10",
        "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff",
        "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members staff",
      ]);
      const srv = makeServer(460, 120);
      devices[srv].name = "ops-1";
      devices[srv].cfg.ip = "10.0.10.90"; devices[srv].cfg.bits = 24; devices[srv].cfg.gw = "10.0.10.1";
      const h = makeHost(240, 300);
      devices[h].name = "admin-pc";
      hostSet(h, "10.0.10.31", 24, "10.0.10.1");
      cable(srv, "eth0", sw, "ge-0/0/1");
      cable(h, "eth0", sw, "ge-0/0/2");
    },
    checks: [
      { desc: "office-sw accepts SSH: system services ssh is committed",
        why: "Without this line committed, the switch simply refuses every SSH connection attempt — it's the on/off switch for remote management entirely.",
        test: () => { const sw2 = byName("office-sw");
          return !!(sw2 && cfgGet(sw2.config, ["system", "services", "ssh"])); } },
      { desc: "admin-pc can actually reach it on port 22",
        why: "Enabling the service on the switch is only half of it — this proves the path between admin-pc and the switch on that specific port genuinely works.",
        test: () => { const sw2 = byName("office-sw"), h2 = byName("admin-pc");
          if(!sw2 || !h2 || !cfgGet(sw2.config, ["system", "services", "ssh"])) return false;
          try{ return pingRun(h2, "10.0.10.1", { proto: "tcp" }).ok; }catch(e){ return false; } } },
      { desc: "office-sw streams its log: syslog host 10.0.10.90, and ops-1 runs the syslog service",
        why: "A switch's own local log disappears the moment it reboots or fails — centralizing it is what lets you investigate an incident AFTER the device that caused it is gone.",
        test: () => { const sw2 = byName("office-sw"), s2 = byName("ops-1");
          return !!(sw2 && s2 && cfgGet(sw2.config, ["system", "syslog", "host", "10.0.10.90"]) &&
            s2.cfg.services && s2.cfg.services.syslog); } },
      { desc: "ops-1 has received at least one line FROM office-sw (make some noise: commit something)",
        why: "Configuring syslog forwarding proves nothing until a real message actually arrives — this is the only check that confirms the pipe is truly flowing.",
        test: () => { const s2 = byName("ops-1");
          return !!(s2 && (s2.syslog || []).some(ln => ln.includes("office-sw"))); } },
    ],
    hints: [
      "On office-sw (console): set system services ssh, commit. Then from admin-pc try ssh 10.0.10.1 — first BEFORE the commit to see connection refused, then after.",
      "On ops-1: service start syslog. On office-sw: set system syslog host 10.0.10.90 any any, commit.",
      "The log only fills when something happens — commit any small change on office-sw, then read log on ops-1 and find the line tagged office-sw.",
      "For the full rite of passage: ssh in from admin-pc, then set interfaces ge-0/0/2 disable, commit. Read what happens. Recover on the console (delete interfaces ge-0/0/2 disable, commit) — and next time, use commit confirmed 5.",
    ],
  },
  {
    id: "speak-bgp",
    title: "25. Speak BGP to Your Provider",
    desc: "Until now you TYPED your default route. Real edges LEARN it: your router and the ISP exchange routes over BGP, the protocol the whole internet runs on. Bring the session up and watch 0.0.0.0/0 arrive on its own.",
    setup(){
      const r = makeRouter(320, 140, 4);
      cfgDo(r, [
        "set system host-name edge-r1",
        "set interfaces ge-0/0/0 unit 0 family inet address 203.0.113.2/30",
        "set interfaces ge-0/0/1 unit 0 family inet address 10.0.50.1/24",
        "set security nat source rule-set OFFICE from interface ge-0/0/1.0",
        "set security nat source rule-set OFFICE to interface ge-0/0/0.0",
        "set security nat source rule-set OFFICE rule R1 match source-address 10.0.50.0/24",
        "set security nat source rule-set OFFICE rule R1 then source-nat interface",
      ]);
      const isp = makeIsp(560, 140, "203.0.113.1");
      const h = makeHost(320, 320);
      devices[h].name = "office-pc";
      hostSet(h, "10.0.50.20", 24, "10.0.50.1");
      cable(r, "ge-0/0/0", isp, "wan0");
      cable(h, "eth0", r, "ge-0/0/1");
    },
    checks: [
      { desc: "edge-r1 has a name in the BGP world: routing-options autonomous-system",
        why: "BGP identifies every network by its AS number — without one, your router has no identity to offer the provider during the session setup.",
        test: () => { const r2 = byName("edge-r1"); return !!(r2 && r2.d && r2.d.as); } },
      { desc: "The session is Established (show bgp summary — and read the reason column while it is not)",
        why: "Nothing else in this scenario can work until the session itself is up — Established is the gate everything downstream depends on.",
        test: () => { const r2 = byName("edge-r1");
          return !!(r2 && r2.d && (r2.d.bgpPeers || []).some(p => p.state === "Established")); } },
      { desc: "A default route was LEARNED, not typed: show route says [BGP/170], and no static default exists",
        why: "This is the entire point of running BGP here — a typed static route can't detect the provider going down; a LEARNED one disappears the instant the session does, protecting you from blackholing traffic.",
        test: () => { const r2 = byName("edge-r1");
          if(!r2) return false;
          if((r2.d.routes || []).some(rt => rt.net === "0.0.0.0")) return false;
          const lk = routeLookup(r2, "8.8.8.8");
          return !!(lk && lk.proto === "bgp"); } },
      { desc: "office-pc reaches 8.8.8.8 across the learned route (NAT is already set up for you)",
        why: "The final proof that the whole chain — BGP session, learned route, and NAT — genuinely delivers working internet access, not just a route sitting unused in a table.",
        test: () => { const h2 = byName("office-pc");
          try{ return !!(h2 && pingRun(h2, "8.8.8.8", {}).ok); }catch(e){ return false; } } },
    ],
    hints: [
      "Ask the provider first: open the ISP node and run show bgp — it literally prints the three statements it expects from you, including its AS number.",
      "On edge-r1: set routing-options autonomous-system 65010 (any private AS 64512-65534 works), then set protocols bgp group EXT type external, set protocols bgp group EXT peer-as 65001, set protocols bgp group EXT neighbor 203.0.113.1, commit.",
      "show bgp summary after every change. Idle means YOUR side is incomplete (the reason column says what is missing); Active means it is trying and failing — wrong peer-as, or no path. Get the peer-as wrong once on purpose and read the mismatch message.",
      "When it says Established: show route. The default is tagged [BGP/170] — learned. Delete nothing, type nothing; from office-pc, ping 8.8.8.8. If the provider ever went away, the route would leave with it. That is the point.",
    ],
  },
  {
    id: "keep-lights-on",
    title: "26. Keep the Lights On",
    desc: "Networks fail physically before they fail logically. This building has two power problems hiding in plain sight: an access point cabled to a switch that cannot feed it, and zero minutes of battery for when the grid blinks. Find both, fix both, then prove it with a live outage drill.",
    setup(){
      const zid = "z_" + uid("scn");
      zones[zid] = { id: zid, name: "HQ", x: 120, y: 60, w: 520, h: 360, hue: 2, kind: "building" };
      const sw = makeSwitch(160, 110, 24);
      devices[sw].model = "EX3400-24T";   // a fine switch — with zero PoE
      cfgDo(sw, [
        "set system host-name hq-sw",
        "set vlans staff vlan-id 10",
        "set interfaces irb unit 10 family inet address 10.0.10.1/24",
        "set vlans staff l3-interface irb.10",
        "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff",
        "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members staff",
      ]);
      const srv = makeServer(160, 240);
      devices[srv].name = "files-1";
      devices[srv].cfg.ip = "10.0.10.80"; devices[srv].cfg.bits = 24; devices[srv].cfg.gw = "10.0.10.1";
      const ap = makeAp(420, 130, "hq-wifi", "AP34", 165);
      const h = makeHost(420, 300);
      devices[h].name = "laptop-1";
      cable(srv, "eth0", sw, "ge-0/0/1");
      cable(ap, "eth0", sw, "ge-0/0/2");
    },
    checks: [
      { desc: "hq-wifi has power (it is drawn dark: NO POWER — a PoE-less switch feeds it nothing)",
        why: "An AP with no power is not a network problem at all — it's a power delivery problem wearing a wireless costume, and no amount of Wi-Fi config fixes it.",
        test: () => { const ap2 = Object.values(devices).find(d => d.type === "ap" && d.cfg.ssid === "hq-wifi");
          return !!(ap2 && !POE.denied[ap2.id]); } },
      { desc: "HQ has a UPS, sized for the whole infrastructure load (open the UPS status to compare)",
        why: "A UPS that's too small for the load it protects fails exactly when you need it — sizing it against the real load is the whole point of buying one.",
        test: () => { const z = Object.values(zones).find(z2 => z2.name === "HQ");
          if(!z) return false;
          const load = z.gridDown ? (z.outageLoad || 0)
            : buildingInfra(z).filter(d => d.powered !== false).reduce((a, d) => a + drawOf(d), 0);
          const cap = upsCapOf(z);
          return cap > 0 && load > 0 && load <= cap; } },
      { desc: "The drill is LIVE: grid power is out right now (the building's grid button)",
        why: "A UPS that has never been tested under a real outage is a UPS you're only hoping works — the drill is what actually proves it.",
        test: () => { const z = Object.values(zones).find(z2 => z2.name === "HQ");
          return !!(z && z.gridDown); } },
      { desc: "And everything survived: switch and server still up on battery",
        why: "This is the actual deliverable of the whole exercise — infrastructure staying online through a power event is the entire reason a UPS exists.",
        test: () => { const sw2 = byName("hq-sw"), s2 = byName("files-1");
          const z = Object.values(zones).find(z2 => z2.name === "HQ");
          return !!(z && z.gridDown && sw2 && s2 && sw2.powered !== false && s2.powered !== false); } },
    ],
    hints: [
      "The AP first: laptop-1's wifi scan finds nothing, and the canvas says NO POWER over the AP. EX3400-24T supplies no PoE. Two real fixes: tap the AP's port and fit an FS.com injector, or replace the switch with a P-model (EX2300-24P). The injector is 20 euro; check show poe interface either way.",
      "Now the battery: Add > UPS, drop it in HQ (click it into the rack if you have one). Open its status — it compares its capacity to the building's real load. The 1000 W unit carries this room; do the arithmetic before you buy, like a real build.",
      "Drill it: click grid on the HQ header. Watch the status row — if you skipped the UPS, everything dies (and the AP dies WITH the switch, injector or not, because the switch behind it is down).",
      "While the outage runs: laptop-1 still works (laptop battery), wifi still works (switch on UPS), files-1 still answers. Click OUTAGE to restore the grid. This drill — load, battery, verify — is exactly what a real ops team does yearly.",
    ],
  },
];
// setups cable things up after their commits — make every setup leave the
// derived network state (NET) consistent, no matter who calls it
SCENARIOS.forEach(s => {
  if(!s.setup) return;
  const orig = s.setup;
  s.setup = function(){ orig.call(this); rebuildAllDerived(); };
});

/* ============================================================
   TICKET GENERATOR (fault injection)
   ============================================================ */
function buildTicketBase(){
  wipeLab();
  const core = makeSwitch(320, 200, 10); const acc1 = makeSwitch(120, 380, 8); const acc2 = makeSwitch(560, 380, 8);
  const edge = makeRouter(340, 60, 4); const isp = makeIsp(600, 40, "203.0.113.1");
  cable(core, "ge-0/0/0", acc1, "ge-0/0/0");
  cable(core, "ge-0/0/1", acc2, "ge-0/0/0");
  cable(core, "ge-0/0/7", edge, "ge-0/0/0");
  cable(edge, "ge-0/0/1", isp, "wan0", "remote");
  const trunkCmds = sw => [
    "set vlans staff vlan-id 10", "set vlans guest vlan-id 20",
    `set interfaces ge-0/0/0 unit 0 family ethernet-switching interface-mode trunk`,
    `set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members staff`,
    `set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members guest`,
  ];
  cfgDo(acc1, ["set system host-name acc-1", ...trunkCmds(acc1),
    "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members staff",
    "set interfaces ge-0/0/3 unit 0 family ethernet-switching vlan members guest"]);
  cfgDo(acc2, ["set system host-name acc-2", ...trunkCmds(acc2),
    "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members staff"]);
  cfgDo(core, [
    "set system host-name core-1",
    "set vlans staff vlan-id 10", "set vlans guest vlan-id 20", "set vlans transit vlan-id 99",
    "set interfaces ge-0/0/0 unit 0 family ethernet-switching interface-mode trunk",
    "set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members [ staff guest ]",
    "set interfaces ge-0/0/1 unit 0 family ethernet-switching interface-mode trunk",
    "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members [ staff guest ]",
    "set interfaces ge-0/0/7 unit 0 family ethernet-switching vlan members transit",
    "set interfaces irb unit 10 family inet address 10.0.10.1/24",
    "set interfaces irb unit 20 family inet address 10.0.20.1/24",
    "set interfaces irb unit 99 family inet address 10.0.99.2/30",
    "set vlans staff l3-interface irb.10", "set vlans guest l3-interface irb.20", "set vlans transit l3-interface irb.99",
    "set routing-options static route 0.0.0.0/0 next-hop 10.0.99.1",
  ]);
  cfgDo(edge, [
    "set system host-name edge-r",
    "set interfaces ge-0/0/0 unit 0 family inet address 10.0.99.1/30",
    "set interfaces ge-0/0/1 unit 0 family inet address 203.0.113.2/30",
    "set routing-options static route 0.0.0.0/0 next-hop 203.0.113.1",
    "set routing-options static route 10.0.10.0/24 next-hop 10.0.99.2",
    "set routing-options static route 10.0.20.0/24 next-hop 10.0.99.2",
    "set security nat source rule-set OFFICE from interface ge-0/0/0.0",
    "set security nat source rule-set OFFICE to interface ge-0/0/1.0",
    "set security nat source rule-set OFFICE rule R1 match source-address 10.0.0.0/8",
    "set security nat source rule-set OFFICE rule R1 then source-nat interface",
  ]);
  const mkpc = (name, x, y, sw, port, ip, gw) => {
    const h = makeHost(x, y); devices[h].name = name; hostSet(h, ip, 24, gw);
    cable(h, "eth0", sw, port);
  };
  mkpc("staff-pc1", 40, 540, acc1, "ge-0/0/2", "10.0.10.11", "10.0.10.1");
  mkpc("guest-pc1", 220, 540, acc1, "ge-0/0/3", "10.0.20.21", "10.0.20.1");
  mkpc("staff-pc2", 560, 540, acc2, "ge-0/0/2", "10.0.10.12", "10.0.10.1");
  rebuildAllDerived();
  return { core, acc1, acc2, edge, isp };
}
const SEVERITY_ORDER = ["routine", "urgent", "critical"];
const SEVERITY_XP = { routine: 20, urgent: 40, critical: 70 };
function ticketMaxSeverity(faults){
  return faults.reduce((best, f) =>
    SEVERITY_ORDER.indexOf(f.severity) > SEVERITY_ORDER.indexOf(best) ? f.severity : best, "routine");
}
function ticketSeverityLabel(faults){
  return ticketMaxSeverity(faults).toUpperCase();
}
function ticketXpValue(faults){
  return faults.reduce((sum, f) => sum + (SEVERITY_XP[f.severity] || 15), 0);
}
const CONTRACT_XP = { 1: 45, 2: 80, 3: 130 };
var xpChallengeToken = null;
var xpChallengeAwarded = false;
const TICKET_FAULTS = [
  { id: "trunk-down",
    severity: "critical",
    ticket: "Rack A is dark — staff-pc1 AND guest-pc1 both report total loss of connectivity. Rack B is fine.",
    apply: ids => cfgDo(ids.acc1, ["set interfaces ge-0/0/0 disable"]),
    fix: ids => cfgDo(ids.acc1, ["delete interfaces ge-0/0/0 disable"]),
    hint: "Both VLANs in one rack at once smells like the uplink, not a VLAN. show interfaces terse on acc-1.",
    reveal: "acc-1's uplink ge-0/0/0 was admin-disabled — delete interfaces ge-0/0/0 disable, commit." },
  { id: "wrong-vlan",
    severity: "routine",
    ticket: "staff-pc1 can't reach anything — not even its own gateway 10.0.10.1. The guest next to it is fine.",
    apply: ids => cfgDo(ids.acc1, [
      "delete interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members staff",
      "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members guest"]),
    fix: ids => cfgDo(ids.acc1, [
      "delete interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members guest",
      "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members staff"]),
    hint: "One machine, gateway unreachable, neighbors fine → look at ITS port. show vlans on acc-1: which VLAN is ge-0/0/2 in?",
    reveal: "staff-pc1's port (acc-1 ge-0/0/2) was moved into vlan guest — its 10.0.10.x address lives in the staff subnet." },
  { id: "trunk-missing-vlan",
    severity: "urgent",
    ticket: "Every guest in rack A is down. Staff in rack A are fine. Rack B unaffected.",
    apply: ids => cfgDo(ids.core, ["delete interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members guest"]),
    fix: ids => cfgDo(ids.core, ["set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members guest"]),
    hint: "One VLAN, one rack → the trunk between them stopped carrying that VLAN. Compare show vlans on core-1 vs acc-1: is guest on BOTH ends of the rack-A trunk?",
    reveal: "core-1's trunk to acc-1 (ge-0/0/0) stopped carrying vlan guest. Re-add it to the members list and commit." },
  { id: "wrong-gw",
    severity: "routine",
    ticket: "staff-pc2 reaches machines in its own subnet, but nothing beyond — no other VLANs, no internet.",
    apply: () => { const h = byName("staff-pc2"); if(h) h.cfg.gw = "10.0.10.254"; },
    fix: () => { const h = byName("staff-pc2"); if(h) h.cfg.gw = "10.0.10.1"; },
    hint: "Local works, remote doesn't → first hop. On staff-pc2: ip route. Does that gateway actually exist?",
    reveal: "staff-pc2's default gateway was 10.0.10.254 — nothing owns that address. The real gateway is 10.0.10.1." },
  { id: "no-default",
    severity: "critical",
    ticket: "Site-wide: everything internal pings fine, but the internet is dead for everyone.",
    apply: ids => cfgDo(ids.core, ["delete routing-options static route 0.0.0.0/0"]),
    fix: ids => cfgDo(ids.core, ["set routing-options static route 0.0.0.0/0 next-hop 10.0.99.1"]),
    hint: "Internal fine + internet dead for ALL VLANs → the shared default route. show route on core-1: where's 0.0.0.0/0?",
    reveal: "core-1 lost its default route toward edge-r (0.0.0.0/0 next-hop 10.0.99.1)." },
  { id: "no-return",
    severity: "urgent",
    ticket: "Guests can ping their gateway and even core addresses, but the internet times out — for guests only.",
    apply: ids => cfgDo(ids.edge, ["delete routing-options static route 10.0.20.0/24"]),
    fix: ids => cfgDo(ids.edge, ["set routing-options static route 10.0.20.0/24 next-hop 10.0.99.2"]),
    hint: "traceroute 8.8.8.8 from guest-pc1 — it LEAVES. So the loss is on the way back. show route on edge-r: can it send anything to 10.0.20.0/24?",
    reveal: "edge-r lost its return route to 10.0.20.0/24 — guest packets got out, the replies had nowhere to go." },
  { id: "filter-block",
    severity: "critical",
    ticket: "Every guest is down hard — gateway unreachable. Staff untouched. It started right after a 'security change'.",
    apply: ids => cfgDo(ids.core, [
      "set firewall family inet filter GUEST-IN term q from source-address 10.0.20.0/24",
      "set firewall family inet filter GUEST-IN term q then discard",
      "set interfaces irb unit 20 family inet filter input GUEST-IN"]),
    fix: ids => cfgDo(ids.core, [
      "delete interfaces irb unit 20 family inet filter input GUEST-IN",
      "delete firewall family inet filter GUEST-IN"]),
    hint: "'After a security change' — show configuration on core-1 and look at the firewall stanza, then at what irb.20 has applied.",
    reveal: "A filter GUEST-IN on core-1 irb.20 discards all guest traffic (and its implicit end-discard eats whatever's left). Remove it or rewrite it with an accept term." },
  { id: "nat-missing",
    severity: "critical",
    ticket: "Internet is dead for the whole site. Internal traffic is fine — and traceroute from any PC LEAVES the building and dies somewhere out there.",
    apply: ids => cfgDo(ids.edge, ["delete security nat source rule-set OFFICE"]),
    fix: ids => cfgDo(ids.edge, [
      "set security nat source rule-set OFFICE from interface ge-0/0/0.0",
      "set security nat source rule-set OFFICE to interface ge-0/0/1.0",
      "set security nat source rule-set OFFICE rule R1 match source-address 10.0.0.0/8",
      "set security nat source rule-set OFFICE rule R1 then source-nat interface"]),
    hint: "Forward path fine, dies beyond the edge, ALL VLANs at once — the internet can't route your private addresses back. What translates them? show security nat source on edge-r.",
    reveal: "edge-r lost its source NAT rule-set — private 10.x sources were leaving untranslated, so no reply could ever return." },

  { id: "irb-unbound",
    severity: "urgent",
    ticket: "Staff can talk to each other fine, but nobody in staff can reach guest, core services, or the internet. Everything else is normal.",
    apply: ids => cfgDo(ids.core, ["delete vlans staff l3-interface irb.10"]),
    fix: ids => cfgDo(ids.core, ["set vlans staff l3-interface irb.10"]),
    hint: "Intra-VLAN fine, everything ROUTED broken, only staff affected \u2192 that VLAN's gateway binding. show vlans on core-1: does vlan staff still point at an l3-interface?",
    reveal: "core-1's vlan staff lost its l3-interface binding to irb.10 \u2014 the VLAN kept switching, but stopped routing. Re-bind it and commit." },
  { id: "acc2-trunk-missing-staff",
    severity: "critical",
    ticket: "Rack B is dark \u2014 every machine there, no exceptions. Rack A is untouched.",
    apply: ids => cfgDo(ids.core, ["delete interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff"]),
    fix: ids => cfgDo(ids.core, ["set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff"]),
    hint: "Whole rack dark, other rack fine \u2192 the trunk feeding that rack. show vlans on core-1 for the acc-2 uplink (ge-0/0/1) \u2014 is staff still a member?",
    reveal: "core-1's trunk to acc-2 (ge-0/0/1) had 'staff' pulled from its VLAN members \u2014 acc-2's only VLAN vanished from the wire." },
  { id: "nat-scope-too-narrow",
    severity: "urgent",
    ticket: "Guests can't reach the internet \u2014 traceroute LEAVES the building and dies out there. Staff are completely fine.",
    apply: ids => cfgDo(ids.edge, [
      "delete security nat source rule-set OFFICE rule R1 match source-address 10.0.0.0/8",
      "set security nat source rule-set OFFICE rule R1 match source-address 10.0.10.0/24"]),
    fix: ids => cfgDo(ids.edge, [
      "delete security nat source rule-set OFFICE rule R1 match source-address 10.0.10.0/24",
      "set security nat source rule-set OFFICE rule R1 match source-address 10.0.0.0/8"]),
    hint: "Forward path leaves fine, only ONE vlan affected, reply never comes back \u2192 NAT is translating some sources but not this one. show security nat source on edge-r \u2014 what does rule R1 actually match?",
    reveal: "edge-r's NAT rule R1 was narrowed to match only 10.0.10.0/24 (staff) \u2014 guest's 10.0.20.0/24 sources were leaving untranslated and dying at the internet's doorstep." },
];
let currentTicket = null;

function ticketScenario(faults){
  return {
    id: "ticket",
    title: "Trouble Ticket — " + ticketSeverityLabel(faults),
    severity: ticketMaxSeverity(faults),
    desc: faults.map(f => "“" + f.ticket + "”").join("\n\n") +
      "\n\nEverything below should be green when the network is healthy again.",
    isTicket: true,
    checks: [
      { desc: "staff-pc1 ↔ staff-pc2 (cross-rack, same VLAN)", test: () => pingOk("staff-pc1", "10.0.10.12") },
      { desc: "staff-pc1 → guest-pc1 (routed via core irb)", test: () => pingOk("staff-pc1", "10.0.20.21") },
      { desc: "staff-pc1 → internet (8.8.8.8)", test: () => pingOk("staff-pc1", "8.8.8.8") },
      { desc: "staff-pc2 → internet (8.8.8.8)", test: () => pingOk("staff-pc2", "8.8.8.8") },
      { desc: "guest-pc1 → internet (8.8.8.8)", test: () => pingOk("guest-pc1", "8.8.8.8") },
    ],
    hints: [
      "Work the ticket like a real one: reproduce first. Ping from the machine in the complaint and read the exact error — this lab's errors point at the layer that failed.",
      "Then divide: one host or many? One VLAN or all? One rack or the site? Each answer halves the suspects.",
      "show log messages on a suspect device — the most recent commit is usually the crime scene.",
      ...faults.map(f => f.hint),
    ],
  };
}
async function generateTicket(){
  if(Object.keys(devices).length &&
     !(await modalConfirm("Generate a practice ticket?", "This replaces the current canvas with the standard two-rack site, then breaks something. Your scenario progress is kept.", "Break my network")))
    return;
  if(typeof pushUndo === "function") pushUndo();
  const ids = buildTicketBase();
  const n = Math.random() < 0.25 ? 2 : 1;
  const pool = TICKET_FAULTS.slice();
  const faults = [];
  for(let i = 0; i < n; i++)
    faults.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  faults.forEach(f => f.apply(ids));
  rebuildAllDerived();
  currentTicket = { ids, faults };
  currentScenario = ticketScenario(faults);
  xpChallengeToken = "ticket:" + uid("t");
  xpChallengeAwarded = false;
  hintIndex = 0;
  document.getElementById("hint-list").innerHTML = "";
  resetHintBtn();
  document.getElementById("solution-btn").style.display = "block";
  document.getElementById("scenario-select").selectedIndex = -1;
  if(typeof openTablet === "function") openTablet("scen");
  renderScenarioMeta();
  touchState();
}

/* ============================================================
   CONTRACT MODE — generated build briefs ("set up an office for…")
   ============================================================ */
const CONTRACT_COMPANIES = [
  "Northwind Logistics", "Blue Harbor Media", "Cedar & Sons Accounting", "Skyline Dental",
  "Ironwood Games", "Bright Path Tutoring", "Marlow Robotics", "Fjord Analytics",
];
const CONTRACT_DEPTS = [
  { name: "engineering", vlan: 10 }, { name: "sales", vlan: 20 }, { name: "finance", vlan: 30 },
  { name: "guests", vlan: 40 }, { name: "ops", vlan: 50 }, { name: "cameras", vlan: 60 },
];
function generateContractSpec(tier, rand){
  rand = rand || Math.random;
  const pick = a => a[Math.floor(rand() * a.length) % a.length];
  const pool = CONTRACT_DEPTS.slice();
  const take = () => pool.splice(Math.floor(rand() * pool.length) % pool.length, 1)[0];
  const nDepts = tier === 3 ? 3 : 2;
  const depts = Array.from({ length: nDepts }, take)
    .map(d => ({ ...d, hosts: 1 + Math.floor(rand() * 2), net: `10.0.${d.vlan}.0` }));
  if(tier === 3 && !depts.some(d => d.name === "guests"))
    depts[nDepts - 1] = { name: "guests", vlan: 40, hosts: 1, net: "10.0.40.0" };
  return { tier, company: pick(CONTRACT_COMPANIES), depts };
}
function contractScenario(spec){
  const { tier, depts, company } = spec;
  const deptHosts = d => devsBy("host").filter(h =>
    h.cfg.ip && sameSubnet(h.cfg.ip, d.net, 24) && hostAccessVlan(h) === d.name);
  const checks = [];
  checks.push({ desc: "A switch is placed and renamed (committed host-name)",
    test: () => devsBy("switch").some(sw => cfgGet(sw.config, ["system", "host-name"])) });
  for(const d of depts){
    checks.push({ desc: `${d.name}: vlan "${d.name}" (id ${d.vlan}) exists on a switch`,
      test: () => devsBy("switch").some(sw => D(sw).vlans[d.name] && D(sw).vlans[d.name].id === d.vlan) });
    checks.push({ desc: `${d.name}: ${d.hosts} host(s) on access ports in vlan ${d.name}, addressed in ${d.net}/24`,
      test: () => deptHosts(d).length >= d.hosts });
    if(d.hosts >= 2) checks.push({ desc: `${d.name}: its hosts can reach each other`,
      test: () => { const hs = deptHosts(d); return hs.length >= 2 && pingOk(hs[0], hs[1].cfg.ip); } });
  }
  if(tier === 1){
    checks.push({ desc: "Departments are isolated from each other (pings fail both ways)",
      test: () => {
        const a = deptHosts(depts[0])[0], b = deptHosts(depts[1])[0];
        return !!(a && b) && !pingOk(a, b.cfg.ip) && !pingOk(b, a.cfg.ip);
      } });
  }
  if(tier >= 2){
    for(const d of depts)
      checks.push({ desc: `${d.name}: online — a ${d.name} host reaches the internet (8.8.8.8)`,
        test: () => deptHosts(d).some(h => pingOk(h, "8.8.8.8")) });
  }
  if(tier === 3){
    checks.push({ desc: "Two switches, one trunk carrying all three vlans (both ends)",
      test: () => Object.values(links).some(l => {
        const a = devices[l.a.dev], b = devices[l.b.dev];
        if(!a || !b || a.type !== "switch" || b.type !== "switch") return false;
        const pa = D(a).portCfg[l.a.port], pb = D(b).portCfg[l.b.port];
        return pa && pb && pa.mode === "trunk" && pb.mode === "trunk" &&
               pa.vlanIds.length >= 3 && pb.vlanIds.length >= 3;
      }) });
    const guests = depts.find(d => d.name === "guests");
    const others = depts.filter(d => d !== guests);
    checks.push({ desc: "guests: walled off from the other departments, but still online",
      test: () => {
        const g = deptHosts(guests)[0];
        if(!g || !pingOk(g, "8.8.8.8")) return false;
        return others.every(o => { const oh = deptHosts(o)[0]; return oh && !pingOk(g, oh.cfg.ip); });
      } });
  }
  const brief = depts.map(d => `  ${d.name} — vlan ${d.vlan}, subnet ${d.net}/24, ${d.hosts} host(s)`).join("\n");
  const tierName = tier === 1 ? "Small office" : tier === 2 ? "Office with internet" : "Two-room campus";
  return {
    id: "contract-tier" + tier,
    title: `Contract: ${company}`,
    isContract: true,
    desc: `${tierName} build for ${company}. Empty canvas, your design.\n\nDepartments:\n${brief}\n\n` + (
      tier === 1 ? "Requirement: each department reaches itself and NOT the other." :
      tier === 2 ? "Requirement: every department gets internet access — router, ISP uplink, gateways, default routes, and source NAT (the internet won't answer private addresses)." :
      "Requirement: everyone online across both rooms, and guests walled off from the other departments by policy (filters), without losing their internet."),
    checks,
    hints: [
      "Sketch the plan before touching the canvas: one vlan + one /24 per department, gateway at .1 by convention.",
      tier === 1
        ? "One switch does it: define the vlans, then put each department's hosts on access ports in their vlan."
        : "Gateways can be irb units on the switch (set vlans <dept> l3-interface irb.<n>) or router legs — irb scales better as departments grow. And don't forget source NAT on the edge router, or 8.8.8.8 will never answer.",
      tier === 3
        ? "Isolation-with-internet means routing exists but policy forbids it: a filter on the guests' gateway — discard toward the other subnets, then accept the rest."
        : "Prove each requirement with pings from the hosts as you build — the objectives update live.",
    ],
  };
}

async function generateSeniorTicket(){
  if(Object.keys(devices).length &&
     !(await modalConfirm("Senior incident?",
       "Multi-fault incident: THREE independent faults at once, no hints about how many. You must rule out layers systematically rather than find one obvious break.\n\nThis replaces the canvas with the standard two-rack site.",
       "Page me in")))
    return;
  if(typeof pushUndo === "function") pushUndo();
  const ids = buildTicketBase();
  const pool = TICKET_FAULTS.slice();
  const faults = [];
  for(let i = 0; i < 3 && pool.length; i++)
    faults.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  faults.forEach(f => f.apply(ids));
  rebuildAllDerived();
  currentTicket = { ids, faults, senior: true };
  currentScenario = ticketScenario(faults);
  currentScenario.title = "Senior Incident \u2014 multi-fault";
  currentScenario.desc = "Multiple independent faults are live at once. Symptoms will overlap and mislead \u2014 fixing one may not visibly change anything until another is also fixed.\n\n" +
    currentScenario.desc +
    "\n\nWork it like a real major incident: establish what DOES work, divide by layer, and re-test after every single change.";
  xpChallengeToken = "senior:" + uid("s");
  xpChallengeAwarded = false;
  hintIndex = 0;
  document.getElementById("hint-list").innerHTML = "";
  resetHintBtn();
  document.getElementById("solution-btn").style.display = "block";
  document.getElementById("scenario-select").selectedIndex = -1;
  if(typeof openTablet === "function") openTablet("scen");
  renderScenarioMeta();
  touchState();
}
async function generateContract(){
  const tier = await modalChoice("New contract", "Pick the job size — the brief is generated, the canvas is yours.", [
    { value: 1, label: "Small office", desc: "One switch, two departments, strict isolation" },
    { value: 2, label: "Office with internet", desc: "Adds a router, ISP uplink, gateways and default routes" },
    { value: 3, label: "Two-room campus", desc: "Two switches, a trunk, three departments, policy-based guest isolation" },
  ]);
  if(tier === null) return;
  if(Object.keys(devices).length &&
     !(await modalConfirm("Clear the canvas?", "Contracts are built from scratch — the current lab will be wiped. Scenario progress is kept.", "Clear and start")))
    return;
  if(typeof pushUndo === "function") pushUndo();
  wipeLab();
  rebuildAllDerived();
  currentScenario = contractScenario(generateContractSpec(tier));
  currentTicket = null;
  xpChallengeToken = "contract:" + uid("c");
  xpChallengeAwarded = false;
  hintIndex = 0;
  document.getElementById("hint-list").innerHTML = "";
  resetHintBtn();
  document.getElementById("scenario-select").selectedIndex = -1;
  if(typeof openTablet === "function") openTablet("scen");
  renderScenarioMeta();
  touchState();
}
document.getElementById("contract-btn").onclick = () => { if(typeof SFX !== "undefined") SFX.ticket(); generateContract(); };

/* ============================================================
   SCENARIO PANEL / PROGRESS / EXAM MODE
   ============================================================ */
let currentScenario = SCENARIOS[0];
let hintIndex = 0;
let PROGRESS = {};
try{ PROGRESS = JSON.parse(localStorage.getItem(LS_PROGRESS) || "{}") || {}; }catch(e){ PROGRESS = {}; }
let examState = { active: false, start: 0 };

const scenSelect = document.getElementById("scenario-select");
function renderScenSelect(){
  const idx = SCENARIOS.indexOf(currentScenario);
  scenSelect.innerHTML = "";
  SCENARIOS.forEach((s, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = (PROGRESS[s.id] && PROGRESS[s.id].done ? "✓ " : "") + s.title;
    scenSelect.appendChild(opt);
  });
  scenSelect.selectedIndex = currentScenario.isTicket ? -1 : idx;
}
function renderScenarioMeta(){
  document.getElementById("scen-title").textContent = currentScenario.title;
  document.getElementById("scen-desc").textContent = currentScenario.desc;
  document.getElementById("load-setup-btn").style.display =
    (currentScenario.setup && !examState.active) ? "block" : "none";
  document.getElementById("hint-btn").style.display = examState.active ? "none" : "block";
  document.getElementById("solution-btn").style.display = currentScenario.isTicket ? "block" : "none";
  const pn = document.getElementById("scen-pageno");
  if(pn){
    const i = SCENARIOS.indexOf(currentScenario);
    pn.textContent = i >= 0 ? `page ${i + 1} of ${SCENARIOS.length}`
      : currentScenario.isTicket ? "active ticket" : "active contract";
  }
  renderObjectives();
}
let sfxObjState = { id: null, done: 0 };
function renderObjectives(){
  const objDiv = document.getElementById("scen-objectives");
  objDiv.innerHTML = "";
  let all = currentScenario.checks.length > 0;
  let doneCount = 0;
  currentScenario.checks.forEach(c => {
    let done = false;
    try{ done = !!c.test(); }catch(e){ done = false; }
    if(done) doneCount++;
    if(!done) all = false;
    const el2 = document.createElement("div");
    el2.className = "obj" + (done ? " done" : "") + (c.why ? " obj-has-why" : "");
    const dot = document.createElement("div"); dot.className = "dot";
    const span = document.createElement("span"); span.textContent = c.desc;
    el2.append(dot, span);
    if(c.why){
      const q = document.createElement("button");
      q.className = "obj-why-btn";
      q.type = "button";
      q.textContent = "?";
      q.title = "Why does this matter?";
      const whyEl = document.createElement("div");
      whyEl.className = "obj-why";
      whyEl.textContent = c.why;
      whyEl.style.display = "none";
      q.onclick = (e) => {
        e.stopPropagation();
        const open = whyEl.style.display !== "none";
        whyEl.style.display = open ? "none" : "block";
        q.classList.toggle("obj-why-open", !open);
        if(!open && typeof SFX !== "undefined") SFX.tick();
      };
      el2.appendChild(q);
      el2.appendChild(whyEl);
    }
    objDiv.appendChild(el2);
  });
  if(sfxObjState.id !== currentScenario.id){
    sfxObjState = { id: currentScenario.id, done: doneCount };
  } else {
    if(doneCount > sfxObjState.done && !all && typeof SFX !== "undefined") SFX.ding();
    sfxObjState.done = doneCount;
  }
  return all;
}
function evalChecks(){
  if(!document.getElementById("tab-scen")) return;
  const all = renderObjectives();
  if(all && (currentScenario.isTicket || currentScenario.isContract) && !xpChallengeAwarded){
    xpChallengeAwarded = true;
    if(typeof awardXp === "function"){
      if(currentScenario.isTicket)
        awardXp(Math.round(ticketXpValue(currentTicket.faults) * (currentTicket.senior ? 1.5 : 1)), currentScenario.title);
      else awardXp(CONTRACT_XP[currentScenario.id.replace("contract-tier", "")] || 30, currentScenario.title);
    }
  }
  if(all && Object.keys(devices).length){
    const id = currentScenario.id;
    const first = !(PROGRESS[id] && PROGRESS[id].done);
    if(first){
      PROGRESS[id] = { done: true, at: Date.now() };
      if(examState.active){
        PROGRESS[id].examSeconds = Math.round((Date.now() - examState.start) / 1000);
      }
      try{ localStorage.setItem(LS_PROGRESS, JSON.stringify(PROGRESS)); }catch(e){}
      renderScenSelect();
      if(typeof SFX !== "undefined") SFX.fanfare();
      if(typeof courseOnComplete === "function") setTimeout(function(){ courseOnComplete(currentScenario.id); }, 400);
      if(typeof awardXp === "function" && !(currentScenario.isTicket || currentScenario.isContract))
        awardXp(20, currentScenario.title);
      document.getElementById("scen-objectives").classList.add("done-flash");
      setTimeout(() => document.getElementById("scen-objectives").classList.remove("done-flash"), 1100);
    }
    if(examState.active){
      const secs = Math.round((Date.now() - examState.start) / 1000);
      examState.active = false;
      document.getElementById("exam-btn").classList.remove("active");
      document.getElementById("exam-timer").style.display = "none";
      modalConfirm("Exam passed", `"${currentScenario.title}" completed in ${Math.floor(secs / 60)}m ${secs % 60}s — with no hints and no pre-built setup.`, "Nice");
      renderScenarioMeta();
    }
  }
}
function resetHintBtn(){
  const b = document.getElementById("hint-btn");
  b.disabled = false;
  b.textContent = "Give me a hint";
}
scenSelect.onchange = () => {
  currentScenario = SCENARIOS[scenSelect.value] || SCENARIOS[0];
  currentTicket = null;
  hintIndex = 0;
  document.getElementById("hint-list").innerHTML = "";
  resetHintBtn();
  if(examState.active){
    examState.active = false;
    document.getElementById("exam-btn").classList.remove("active");
    document.getElementById("exam-timer").style.display = "none";
  }
  renderScenarioMeta();
};
document.getElementById("toggle-scenario").onclick = () => {
  if(typeof toggleTablet === "function") toggleTablet("scen");
};
function gotoScenario(i){
  const n = SCENARIOS.length;
  scenSelect.selectedIndex = ((i % n) + n) % n;
  scenSelect.onchange();
}
document.getElementById("scen-prev").onclick = () => {
  const i = SCENARIOS.indexOf(currentScenario);
  gotoScenario((i < 0 ? 0 : i) - 1);
};
document.getElementById("scen-next").onclick = () => {
  const i = SCENARIOS.indexOf(currentScenario);
  gotoScenario((i < 0 ? -1 : i) + 1);
};
function maskHintParts(text){
  const re = /((?:set|delete|show|run|dhclient|traceroute|ip)\s+[^.!?]*)/g;
  const parts = [];
  let last = 0, m;
  while((m = re.exec(text))){
    if(m.index > last) parts.push({ t: text.slice(last, m.index), cmd: false });
    parts.push({ t: m[1], cmd: true });
    last = m.index + m[1].length;
  }
  if(last < text.length) parts.push({ t: text.slice(last), cmd: false });
  return parts;
}
document.getElementById("hint-btn").onclick = () => {
  if(hintIndex >= currentScenario.hints.length) return;
  const div = document.createElement("div");
  div.className = "hint-line";
  const parts = maskHintParts(`Hint ${hintIndex + 1}: ${currentScenario.hints[hintIndex]}`);
  parts.forEach(p => {
    if(!p.cmd){ div.appendChild(document.createTextNode(p.t)); return; }
    const sp = document.createElement("span");
    sp.className = "hint-cmd";
    sp.textContent = p.t;
    sp.title = "Try it from the idea first — click to reveal the command";
    sp.onclick = () => sp.classList.add("revealed");
    div.appendChild(sp);
  });
  document.getElementById("hint-list").appendChild(div);
  hintIndex++;
  if(hintIndex >= currentScenario.hints.length){
    const b = document.getElementById("hint-btn");
    b.textContent = "No more hints — you've got everything";
    b.disabled = true;
  }
};
document.getElementById("load-setup-btn").onclick = async () => {
  if(!currentScenario.setup) return;
  if(Object.keys(devices).length &&
     !(await modalConfirm("Load this scenario's setup?", "This replaces whatever is on the canvas with the scenario's starting topology.", "Load it")))
    return;
  if(typeof pushUndo === "function") pushUndo();
  wipeLab();
  currentScenario.setup();
  rebuildAllDerived();
  touchState();
};
document.getElementById("exam-btn").onclick = () => {
  examState.active = !examState.active;
  document.getElementById("exam-btn").classList.toggle("active", examState.active);
  document.getElementById("exam-timer").style.display = examState.active ? "block" : "none";
  if(examState.active){
    examState.start = Date.now();
    document.getElementById("hint-list").innerHTML = "";
    hintIndex = 0;
    resetHintBtn();
  }
  renderScenarioMeta();
};
function updateExamTimer(){
  if(!examState.active) return;
  const s = Math.round((Date.now() - examState.start) / 1000);
  document.getElementById("exam-timer").textContent =
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} — no hints, no setup. All objectives green = pass.`;
}
document.getElementById("ticket-btn").onclick = () => { if(typeof SFX !== "undefined") SFX.ticket(); generateTicket(); };
document.getElementById("senior-btn").onclick = () => { if(typeof SFX !== "undefined") SFX.alert(); generateSeniorTicket(); };
document.getElementById("solution-btn").onclick = () => {
  if(!currentTicket) return;
  modalConfirm("The fault(s)", currentTicket.faults.map(f => "• " + f.reveal).join("\n"), "Got it");
};

/* ============================================================
   BOOT
   ============================================================ */
function boot(){
  rebuildAllDerived();
  renderScenSelect();
  renderScenarioMeta();
  render();
  let saved = null;
  try{ saved = JSON.parse(localStorage.getItem(LS_AUTOSAVE) || "null"); }catch(e){}
  if(saved && saved.devices && saved.devices.length){
    modalConfirm("Resume previous lab?", "An autosaved lab from your last session is available. Resume it, or start fresh?", "Resume")
      .then(yes => {
        if(yes) loadLab(saved);
        else { try{ localStorage.removeItem(LS_AUTOSAVE); }catch(e){} }
      });
  }
}
boot();

let predictOn = true;
try{
  const raw = localStorage.getItem("junoslab-predict");
  // Defaults ON for anyone who hasn't explicitly chosen — this is the strongest
  // "why" mechanism in the lab, and it was easy to never discover while off.
  predictOn = raw === null ? true : raw === "on";
}catch(e){}
function setPredict(on){
  predictOn = on;
  try{ localStorage.setItem("junoslab-predict", on ? "on" : "off"); }catch(e){}
  const b = document.getElementById("predict-btn");
  if(b){ b.textContent = "Predict mode: " + (on ? "on" : "off"); b.classList.toggle("active", on); }
}
function passingCount(){
  if(!currentScenario || !currentScenario.checks) return 0;
  return currentScenario.checks.filter(c => { try{ return !!c.test(); }catch(e){ return false; } }).length;
}
function predictIntercept(dev, raw, masked){
  if(!predictOn || examState.active) return false;
  if(!dev || dev.cli.mode !== "cfg" || dev.cli.stage) return false;
  const t = raw.trim();
  if(!/^com(m(it?)?)?(\s+confirmed(\s+\d+)?)?$/.test(t) && !/^commit(\s+and-quit)?$/.test(t)) return false;
  if(!currentScenario || !currentScenario.checks || !currentScenario.checks.length) return false;
  // Once you've finished a scenario before, the friction has done its job —
  // don't re-ask on a repeat run.
  if(currentScenario.id && PROGRESS[currentScenario.id] && PROGRESS[currentScenario.id].done) return false;
  const before = passingCount();
  if(before >= currentScenario.checks.length) return false;
  let firstEver = false;
  try{ firstEver = !localStorage.getItem("junoslab-predict-explained"); }catch(e){}
  if(firstEver){ try{ localStorage.setItem("junoslab-predict-explained", "1"); }catch(e){} }
  const intro = firstEver
    ? "First time seeing this: before every commit in a scenario you haven't finished yet, the lab asks you to predict the effect. Guessing wrong is fine \u2014 it's the fastest way to find a gap in your mental model. (Toggle it off any time with the Predict mode button.)\n\n"
    : "";
  modalChoice("Predict before you commit",
    intro + "What do you expect this commit to change for \u201c" + currentScenario.title + "\u201d?", [
    { value: "more", label: "Progress \u2014 more objectives will pass", desc: "The config I staged moves the scenario forward" },
    { value: "same", label: "No visible change yet", desc: "Necessary groundwork, but no objective flips on its own" },
    { value: "less", label: "Something will break", desc: "I am knowingly committing something disruptive" },
  ]).then(pred => {
    runCliCommand(dev, raw, masked);
    if(pred === null) return;
    setTimeout(() => {
      const after = passingCount();
      const actual = after > before ? "more" : after < before ? "less" : "same";
      const right = pred === actual;
      const what = actual === "more" ? `objectives went ${before} \u2192 ${after} \u2014 progress`
        : actual === "less" ? `objectives went ${before} \u2192 ${after} \u2014 something regressed`
        : `objectives stayed at ${before}`;
      if(typeof SFX !== "undefined") (right ? SFX.ding : SFX.womp)();
      const div = document.createElement("div");
      div.className = "hint-line " + (right ? "predict-right" : "predict-wrong");
      div.innerHTML = (right ? svgMark("check") + " Called it: " : svgMark("cross") + " Prediction missed: ") + what +
        (right ? "" : ". A missed prediction is a gap in the mental model \u2014 worth a look at show | compare before the next one.");
      document.getElementById("hint-list").prepend(div);
    }, 60);
  });
  return true;
}
(function(){
  const row = typeof document.querySelector === "function" ? document.querySelector(".scen-toprow") : null;
  if(row){
    const b = document.createElement("button");
    b.id = "predict-btn";
    b.title = "Before each commit in a scenario, guess the effect \u2014 then see if you were right";
    b.onclick = () => setPredict(!predictOn);
    row.appendChild(b);
  }
  setPredict(predictOn);
})();
