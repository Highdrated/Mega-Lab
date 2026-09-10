var PROTO_GUIDES = [
  {
    id: "lacp",
    title: "LACP — Link Aggregation",
    tag: "L2 · redundancy",
    ready: true,
    scenarioId: "lacp-bundle",
    problem: {
      text: "One cable between two switches is one point of failure and one lane of traffic. Add a second cable without LACP and you don't get backup — you get a loop, and a broadcast storm. LACP bundles the cables into ONE logical link (ae0): double the capacity, and if a member dies, traffic just keeps flowing over the survivor. Nobody notices. That's the whole point.",
      svg: "lacp-problem"
    },
    how: {
      text: "Both switches run the Link Aggregation Control Protocol. Each bundled port sends little hello packets called LACPDUs to the far end about once a second. Those packets say: 'I'm port ge-0/0/1, I belong to bundle ae0, here's my system ID.' When both ends agree, the ports move to 'Collecting distributing' — actually carrying traffic. If LACPDUs stop arriving (cable cut, far end misconfigured), that member is thrown out of the bundle within seconds and the rest carry on. Modes: 'active' means I send LACPDUs on my own; 'passive' means I only reply. At least ONE side must be active, or nobody ever speaks first.",
      animLabel: "Animate LACPDUs on my canvas"
    },
    prereqs: [
      { desc: "Two switches on the canvas",
        test: function(){ return Object.values(devices).filter(function(d){ return d.type === "switch"; }).length >= 2; } },
      { desc: "Two or more cables between the SAME pair of switches",
        test: function(){
          var count = {};
          for(var lid in links){
            var l = links[lid];
            if(l.kind && l.kind !== "lan") continue;
            var da = devices[l.a.dev], db = devices[l.b.dev];
            if(!da || !db || da.type !== "switch" || db.type !== "switch") continue;
            var k = [l.a.dev, l.b.dev].sort().join("|");
            count[k] = (count[k] || 0) + 1;
          }
          return Object.values(count).some(function(n){ return n >= 2; });
        } },
      { desc: "An ae bundle declared on BOTH switches (set interfaces ae0 ...)",
        test: function(){
          if(typeof NET === "undefined" || !NET.aeInfo) return false;
          var n = 0;
          for(var id in NET.aeInfo) if(Object.keys(NET.aeInfo[id]).length) n++;
          return n >= 2;
        } },
      { desc: "Member ports assigned on both ends (ether-options 802.3ad ae0)",
        test: function(){
          if(typeof NET === "undefined" || !NET.aeInfo) return false;
          var n = 0;
          for(var id in NET.aeInfo)
            for(var ae in NET.aeInfo[id])
              if(NET.aeInfo[id][ae].members.length >= 2){ n++; break; }
          return n >= 2;
        } },
      { desc: "LACP mode set on both bundles — at least one side active",
        test: function(){
          if(typeof NET === "undefined" || !NET.aeInfo) return false;
          var modes = [];
          for(var id in NET.aeInfo)
            for(var ae in NET.aeInfo[id])
              if(NET.aeInfo[id][ae].lacp) modes.push(NET.aeInfo[id][ae].lacp);
          return modes.length >= 2 && modes.indexOf("active") !== -1;
        } },
      { desc: "Bundle is UP — members show 'Collecting distributing'",
        test: function(){
          if(typeof NET === "undefined" || !NET.aeInfo) return false;
          for(var id in NET.aeInfo)
            for(var ae in NET.aeInfo[id])
              if(NET.aeInfo[id][ae].up) return true;
          return false;
        } },
    ],
    cfg: [
      ["set interfaces ge-0/0/1 ether-options 802.3ad ae0", "Port ge-0/0/1 becomes a member of bundle ae0 — repeat for every member cable"],
      ["set interfaces ae0 aggregated-ether-options lacp active", "Run LACP on the bundle, in active mode (send LACPDUs, don't just answer)"],
      ["set interfaces ae0 unit 0 family ethernet-switching", "The bundle itself must be a switching interface, or it forwards nothing"],
      ["commit", "Then do the SAME on the far-end switch — LACP is a two-sided agreement"]
    ],
    nums: [
      ["1 s / 30 s", "LACPDU intervals: fast (default on Junos) vs slow"],
      ["3 missed", "LACPDUs before a member is thrown out — ~3 s in fast mode"],
      ["16 / 8", "Max members you can assign to an ae / max actively forwarding"],
      ["ae0–ae4091", "Bundle naming range on Junos (this lab: ae0–ae99)"]
    ],
    els: [
      ["set chassis aggregated-devices ethernet device-count 2", "Real Junos needs this before any ae exists — the lab auto-creates bundles, real EX switches don't"],
      ["(legacy and ELS mostly agree here)", "LACP config barely changed across the ELS split — the traps are in VLAN and irb syntax, not here"]
    ],
    verify: [
      ["show lacp interfaces", "The truth. Healthy = every member says 'Collecting distributing'. 'Detached' next to a member means that cable or that far-end config is the problem."],
      ["show interfaces terse | match ae", "The bundle itself should be up/up, like any other interface."],
      ["ping <far side>, then disable ONE member, ping again", "The real test: traffic must survive losing a member. If ping dies when a member dies, it was never really a LAG."],
    ],
    breaks: [
      "Both sides passive — nobody sends the first LACPDU, bundle never forms. Classic.",
      "Member on one end, plain access port on the other — 'no LACP partner on the far end'. The engine marks that link lacp-fail.",
      "Mismatched membership: cable moved to a port that isn't in the bundle. LACPDUs from an unexpected port get rejected.",
      "Speed mismatch between members — real switches refuse mixed-speed bundles.",
      "Forgetting family ethernet-switching on the ae itself — bundle forms but switches nothing."
    ],
    answer: "LACP bundles multiple physical cables between two devices into one logical link. The two ends talk to each other with LACPDU packets to agree which ports are in the bundle, which protects you from misconfiguration — a port only joins if BOTH ends agree. You get more bandwidth, and if one cable fails the rest keep forwarding, so a member failure is invisible to users. To test it you check show lacp interfaces for 'Collecting distributing', then kill one member and prove traffic survives.",
    quiz: [
      { q: "Both ends of the bundle are set to LACP passive. What happens?",
        opts: ["The bundle comes up normally", "The bundle never forms — nobody speaks first", "It works but at half speed"],
        right: 1,
        why: "Passive only ANSWERS LACPDUs. With passive on both sides, no one ever sends the first hello, so the ports stay Detached forever. At least one side must be active." },
      { q: "One member cable of a healthy 2-cable ae0 gets cut. What do users notice?",
        opts: ["A short outage while it reconverges", "Nothing — traffic shifts to the surviving member", "The whole bundle goes down"],
        right: 1,
        why: "This is the entire reason LACP exists. LACPDUs stop arriving on the dead member, it's ejected from the bundle in seconds, and the other member keeps forwarding. No outage." },
      { q: "Someone asks: why LACP instead of just plugging in two cables?",
        opts: ["Two bare cables between switches make a loop — broadcast storm", "LACP cables are faster", "Switches only allow one cable without it"],
        right: 0,
        why: "Two parallel L2 paths without aggregation (or spanning tree blocking one) = frames circulating forever = broadcast storm. LACP makes the switch treat both cables as ONE link, so there is no loop." },
    ],
  },
  {
    id: "vlan",
    title: "VLANs & Trunking",
    tag: "L2 · segmentation",
    ready: true,
    scenarioId: "vlan-split",
    problem: {
      text: "One physical switch, many customers or departments — and none of them may see each other's traffic. Buying a switch per tenant is absurd. A VLAN slices one switch into isolated virtual switches: a frame in VLAN 10 can never reach a port in VLAN 20, even on the same box, even in the same subnet. Trunking then carries MANY VLANs over ONE cable between switches, each frame wearing an 802.1Q tag that says which VLAN it belongs to.",
      svg: "vlan-problem"
    },
    how: {
      text: "An ACCESS port belongs to exactly one VLAN — the host plugged in has no idea VLANs exist; frames are untagged. A TRUNK port carries several VLANs at once: on the way out, the switch inserts a 4-byte 802.1Q tag holding the VLAN ID; the far switch reads it, strips it, and floods the frame only to ports of that VLAN. So the tag exists ONLY on trunk cables — hosts never see it. Isolation is absolute at layer 2: to cross VLANs you must route (see the irb pattern in the DHCP guide, or scenario 9)."
    },
    prereqs: [
      { desc: "A switch on the canvas with two hosts cabled in",
        test: function(){ return typeof devsBy === "function" && devsBy("switch").length >= 1 && devsBy("host").length >= 2; } },
      { desc: "Two VLANs defined (beyond default)",
        test: function(){ return devsBy("switch").some(function(sw){ return Object.values(D(sw).vlans || {}).filter(function(v){ return v.id !== 1; }).length >= 2; }); } },
      { desc: "The two hosts sit on access ports in DIFFERENT VLANs",
        test: function(){ if(typeof hostAccessVlan !== "function") return false;
          var vs = devsBy("host").map(hostAccessVlan).filter(Boolean);
          return vs.length >= 2 && new Set(vs).size >= 2; } },
      { desc: "Both hosts have IPs — and ping between them FAILS (that's the proof)",
        test: function(){ var hs = devsBy("host").filter(function(h){ return h.cfg && h.cfg.ip; });
          if(hs.length < 2) return false;
          if(new Set(hs.map(hostAccessVlan).filter(Boolean)).size < 2) return false;
          return !pingOk(hs[0], hs[1].cfg.ip); } },
    ],
    cfg: [
      ["set vlans staff vlan-id 10", "Create the VLAN: a name for humans, an ID for the wire"],
      ["set interfaces ge-0/0/0 unit 0 family ethernet-switching interface-mode access", "This port carries exactly one untagged VLAN"],
      ["set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members staff", "...and that VLAN is staff"],
      ["set interfaces ge-0/0/7 unit 0 family ethernet-switching interface-mode trunk", "The uplink to the next switch becomes a trunk"],
      ["set interfaces ge-0/0/7 unit 0 family ethernet-switching vlan members [ staff guest ]", "The trunk carries these VLANs, tagged — forget one here and that VLAN silently dies at this cable"]
    ],
    nums: [
      ["1–4094", "Usable VLAN ID range (12-bit field; 0 and 4095 are reserved)"],
      ["1", "The default VLAN — every port starts here; production traffic shouldn't"],
      ["4 bytes", "Size of the 802.1Q tag inserted into each trunk frame"],
      ["0x8100", "EtherType that marks a frame as tagged"]
    ],
    els: [
      ["legacy: ...ethernet-switching port-mode access|trunk", "ELS: interface-mode access|trunk — same idea, renamed. The lab CLI corrects you if you type the old one"],
      ["legacy: native-vlan-id under the port", "ELS: set interfaces ge-0/0/7 native-vlan-id 99 at the physical interface level"]
    ],
    verify: [
      ["show vlans", "Which VLANs exist and which interfaces really ended up in each — read this before trusting your memory"],
      ["show ethernet-switching interface", "Per-port mode (access/trunk) and VLAN membership"],
      ["ping across the boundary", "Same subnet, different VLANs, ping must FAIL. If it works, check show vlans — a port is not where you think it is"]
    ],
    breaks: [
      "VLAN missing from the trunk's members list — works on the local switch, dead across the uplink. THE classic multi-switch ticket.",
      "VLAN name exists but IDs differ per switch — tags carry the ID, not the name. staff=10 on one box and staff=20 on the other never talk.",
      "Host moved to a new port, old access config left behind — user 'has no network' because the new port is still in default.",
      "Trunk one side, access the other — tagged frames arrive at a port that doesn't expect tags and get dropped.",
    ],
    answer: "A VLAN partitions one physical switch into isolated layer-2 networks — a frame can only reach ports of its own VLAN, so tenants on the same hardware can't see each other. Access ports put untagged hosts into one VLAN; trunk ports carry many VLANs between switches with an 802.1Q tag naming each frame's VLAN. To test isolation I put two hosts in the same subnet but different VLANs and prove the ping fails; to test a trunk I prove the same VLAN works across two switches and check show vlans on both.",
    quiz: [
      { q: "Two hosts, same switch, same subnet (10.0.0.2 and 10.0.0.3), different VLANs. Ping?",
        opts: ["Works — same subnet", "Fails — VLAN isolation beats subnet math", "Works but slowly"],
        right: 1,
        why: "The frame never leaves VLAN 10, so ARP for 10.0.0.3 gets no answer. Subnets are an L3 concept; the VLAN wall stands at L2, below it." },
      { q: "VLAN 30 works fine on switch A, hosts on switch B in VLAN 30 are dead. First suspect?",
        opts: ["The hosts' IP config", "VLAN 30 missing from the trunk's vlan members", "RSTP blocked the port"],
        right: 1,
        why: "A VLAN must be explicitly allowed onto each trunk. If it isn't a member, frames are dropped at the uplink — everything local works, everything remote doesn't. Check show vlans on both ends." },
      { q: "Where does the 802.1Q tag actually exist?",
        opts: ["On every frame everywhere", "Only on trunk links between switches", "Only inside the switch CPU"],
        right: 1,
        why: "Access ports send/receive untagged frames — hosts are oblivious. The switch adds the tag entering a trunk and strips it leaving one." },
    ],
  },
  {
    id: "rstp",
    title: "RSTP — Rapid Spanning Tree",
    tag: "L2 · loop protection",
    ready: true,
    scenarioId: "rstp-loop",
    problem: {
      text: "Redundant cabling is good engineering — a ring of switches survives any single cable cut. But layer 2 has no TTL: the moment a loop exists, one broadcast frame circulates forever, multiplying at every switch, until the network drowns in its own traffic. That's a broadcast storm, and it takes the segment down in seconds. RSTP lets you KEEP the redundant cables: it logically blocks just enough ports to break every loop, and instantly unblocks them when a working path dies.",
      svg: "rstp-problem"
    },
    how: {
      text: "All switches exchange BPDUs (bridge protocol data units) and first elect a ROOT bridge — lowest priority wins, MAC address breaks ties. Every other switch then computes its cheapest path toward the root and keeps that port forwarding. Any extra path that would form a loop gets its port put in a blocking (ALT/BLK) state: it still listens to BPDUs, it just won't forward traffic. When a forwarding link dies, an alternate port takes over — with RSTP in well under a second, versus 30–50 s for original STP."
    },
    prereqs: [
      { desc: "Three switches cabled in a triangle (a real loop)",
        test: function(){ if(typeof devsBy !== "function" || devsBy("switch").length < 3) return false;
          var n = 0;
          for(var lid in links){ var l = links[lid];
            var a = devices[l.a.dev], b = devices[l.b.dev];
            if(a && b && a.type === "switch" && b.type === "switch") n++; }
          return n >= 3; } },
      { desc: "RSTP enabled on every switch in the loop",
        test: function(){ return devsBy("switch").length >= 3 && devsBy("switch").every(function(sw){ return D(sw).rstp; }); } },
      { desc: "The storm is gone",
        test: function(){ return typeof NET !== "undefined" && Object.keys(links).length > 0 && NET.stormLinks.size === 0 && devsBy("switch").length >= 3; } },
      { desc: "Exactly one redundant port is blocked (BLK on the canvas)",
        test: function(){ return typeof NET !== "undefined" && NET.blocked.size >= 1; } },
    ],
    cfg: [
      ["set protocols rstp", "That's genuinely it for the basics — enable it on EVERY switch in the loop"],
      ["set protocols rstp interface all", "Explicitly run it on all ports (good hygiene)"],
      ["commit", "The moment the last switch in the loop commits, the storm dies and one port goes amber"]
    ],
    nums: [
      ["2 s", "Hello time — how often BPDUs are sent"],
      ["6 s", "Three lost hellos = neighbor declared dead"],
      ["< 1 s", "RSTP reconvergence after a link failure (classic STP: 30–50 s)"],
      ["32768", "Default bridge priority; set lower (steps of 4096) on the switch YOU want as root"],
      ["0–61440", "Priority range — 0 forces a switch to win the root election"]
    ],
    els: [
      ["Old EX code shipped with RSTP enabled by default", "On ELS platforms don't assume — configure it explicitly and check show spanning-tree bridge"],
      ["legacy: set protocols stp (original, slow STP)", "Current practice: rstp (or mstp/vstp for per-VLAN trees) — plain stp is a museum piece"]
    ],
    verify: [
      ["show spanning-tree bridge", "Who is root? If you didn't choose the root, the network chose for you — usually badly"],
      ["show spanning-tree interface", "Port roles: ROOT/DESG forwarding, ALT/BLK blocking. Exactly your redundant paths should be BLK"],
      ["pull a forwarding cable, ping through", "The blocked port must take over — with RSTP the ping barely notices"]
    ],
    breaks: [
      "RSTP on two of three switches — the third floods happily and the storm lives on. It must run on EVERY switch in the loop.",
      "Nobody set a root priority — the oldest, weakest switch wins the election with its low MAC, and all traffic detours through it.",
      "A cheap unmanaged switch (no STP at all) cabled into the ring — it forwards everything, loops included. See scenario 20, the rogue switch.",
      "Blocked port mistaken for a broken port — someone 'fixes' the amber port by recabling, creating a second loop."
    ],
    answer: "Spanning tree protects a switched network from its own redundancy: switches elect a root bridge with BPDU packets, compute their best path to it, and logically block any extra port that would complete a loop — so broadcast frames can't circulate forever as a storm. The blocked ports are hot standbys: RSTP moves one to forwarding in under a second when a live path fails. To verify I read show spanning-tree bridge for the root, check the blocked port is the one I expect, then cut a forwarding link and prove traffic survives.",
    quiz: [
      { q: "Triangle of three switches, RSTP everywhere. How many ports end up blocked?",
        opts: ["None — RSTP load-balances all three", "One — exactly enough to break the single loop", "Three — one per switch"],
        right: 1,
        why: "One loop needs exactly one cut. RSTP blocks a single port and the triangle becomes a loop-free tree with a spare path on standby." },
      { q: "A port shows ALT/BLK amber. A colleague wants to 'fix' the dead link. You say:",
        opts: ["Good catch, replace the cable", "That port is doing its job — it's the standby that breaks the loop", "Reboot the switch"],
        right: 1,
        why: "BLK is a healthy state, not a fault. Remove that block (or 'fix' around it) and you've reintroduced the loop RSTP was preventing." },
      { q: "Why did the network get slow after adding a redundant cable, before RSTP was on?",
        opts: ["The cable was bad", "A broadcast storm — frames looping and multiplying forever", "The switch ran out of ports"],
        right: 1,
        why: "L2 frames have no TTL. One loop turns every broadcast into an infinite, self-multiplying flood that eats all bandwidth and CPU within seconds." },
    ],
  },
  {
    id: "dia",
    title: "DIA — Dedicated Internet Access",
    tag: "WAN · service delivery",
    ready: true,
    scenarioId: "isp-onboarding",
    problem: {
      text: "DIA is not one protocol — it's the PRODUCT a datacenter or carrier sells: your own internet access with guaranteed, non-shared bandwidth. What the customer physically receives is small and precise: a handoff port, usually a VLAN, a /30 (or /31) point-to-point subnet, the provider's gateway IP — and either a static default route or a BGP session. Your job is to turn that handoff into working internet for everything behind it, and to PROVE it works before the customer plugs in.",
      svg: "dia-problem"
    },
    how: {
      text: "The provider puts one address of the /30 on their edge; you put the other on your WAN interface. Traffic out is trivial: a default route pointing at their address. Traffic BACK is the part juniors forget — the internet can't answer private 192.168.x addresses, so your edge router source-NATs everything to its public WAN address. Small handoffs stop there (static default); serious ones run BGP on top so the default route is LEARNED and the session state itself tells both sides the service is alive — that's the BGP guide."
    },
    prereqs: [
      { desc: "The delivery chain placed: host → switch → router → ISP",
        test: function(){ return typeof devsBy === "function" && devsBy("router").length >= 1 && devsBy("isp").length >= 1 && devsBy("switch").length >= 1 && devsBy("host").length >= 1; } },
      { desc: "Router cabled to both the ISP (WAN) and the switch (LAN)",
        test: function(){ var rt = devsBy("router")[0]; if(!rt) return false;
          var touches = function(t){ return Object.values(links).some(function(l){
            return [l.a, l.b].some(function(e){ return e.dev === rt.id; }) &&
                   [l.a, l.b].some(function(e){ return devices[e.dev] && devices[e.dev].type === t; }); }); };
          return touches("isp") && touches("switch"); } },
      { desc: "Both ends of the handoff addressed — WAN in the /30, LAN with a gateway address",
        test: function(){ return devsBy("router").some(function(rt){ return Object.keys(D(rt).l3ports || {}).length >= 2; }); } },
      { desc: "A default route pointing at the provider",
        test: function(){ return devsBy("router").some(function(rt){ return (D(rt).routes || []).some(function(r){ return r.net === "0.0.0.0" && r.bits === 0; }); }); } },
      { desc: "Source NAT on the edge — the internet can't answer 192.168.x",
        test: function(){ return devsBy("router").some(function(rt){ return (D(rt).natRules || []).length > 0; }); } },
      { desc: "The proof: a client host pings 8.8.8.8",
        test: function(){ var h = devsBy("host").find(function(x){ return x.cfg && x.cfg.ip; });
          return !!(h && pingOk(h, "8.8.8.8")); } },
    ],
    cfg: [
      ["set interfaces ge-0/0/0 unit 0 family inet address 203.0.113.2/30", "Your side of the handoff /30 — the provider holds .1"],
      ["set interfaces ge-0/0/1 unit 0 family inet address 192.168.1.1/24", "The LAN side: the gateway your customer's hosts will use"],
      ["set routing-options static route 0.0.0.0/0 next-hop 203.0.113.1", "Everything unknown goes to the provider (the BGP guide replaces this line)"],
      ["set security nat source rule-set OUT from interface ge-0/0/1.0", "NAT: traffic entering from the LAN..."],
      ["set security nat source rule-set OUT to interface ge-0/0/0.0", "...leaving toward the internet..."],
      ["set security nat source rule-set OUT rule R1 match source-address 192.168.1.0/24", "...from the private range..."],
      ["set security nat source rule-set OUT rule R1 then source-nat interface", "...gets rewritten to the public WAN address"]
    ],
    nums: [
      ["/30", "The classic handoff subnet: 4 addresses, 2 usable — one per side"],
      ["/31", "The modern point-to-point: 2 addresses, 0 wasted (RFC 3021)"],
      ["203.0.113.0/24", "TEST-NET-3 — documentation range this lab uses as 'public' space"],
      ["10/8 · 172.16/12 · 192.168/16", "RFC 1918 private ranges — the addresses NAT exists to hide"],
      ["95th percentile", "How carriers usually bill DIA bandwidth — the top 5% of samples is free headroom"]
    ],
    els: [
      ["(DIA is a service recipe, not an ELS matter)", "The syntax that changed under ELS is the switching layer — this guide's routing and NAT commands are the same on old and new code"]
    ],
    verify: [
      ["show route 8.8.8.8", "Does the router even know a way out? Expect the 0.0.0.0/0 static (or [BGP/170])"],
      ["ping 203.0.113.1 from the router", "The handoff itself: if your own WAN can't reach the provider's side of the /30, stop and check addressing"],
      ["ping 8.8.8.8 from a client host", "The full chain: LAN gateway → routing → NAT → provider. This is the test you run BEFORE telling the customer it's live"],
      ["traceroute 8.8.8.8", "When ping fails, this shows how FAR it got — the last responding hop points at the broken segment"]
    ],
    breaks: [
      "Forgot source NAT — packets leave fine, replies to 192.168.x die on the internet's doorstep. Outbound-looking, actually return-path.",
      "Wrong side of the /30 — you configured .1 (the provider's) instead of .2. Both ends now fight for one address.",
      "Default route typo'd to the wrong next-hop — router hands packets into the void; traceroute dies at hop 1.",
      "Handoff VLAN mismatch — provider tags the service on VLAN 100, your port expects untagged. Physically up, logically dead.",
      "Client host has no gateway set — the LAN works, the internet doesn't, and the ticket says 'internet is down'."
    ],
    answer: "DIA is dedicated internet access — a customer's own uncontended internet handoff. What's delivered is a port, usually a VLAN, a /30 with the provider on one address and us on the other, and a route: static default for small handoffs, BGP for serious ones. On our edge that means addressing the WAN, a default route at the provider, and source NAT so private LAN addresses are rewritten to the public one. To test the prerequisites I first ping the provider's side of the /30 to prove the handoff, then ping out from a client host to prove routing and NAT, and traceroute when it fails to see where the path dies.",
    quiz: [
      { q: "Hosts can ping the router, the router pings 8.8.8.8, but hosts can't reach the internet. Most likely?",
        opts: ["The provider is down", "Missing source NAT — replies can't return to private addresses", "The switch is broken"],
        right: 1,
        why: "The router pings out using its own public WAN address, so it works. Host traffic leaves with a 192.168.x source, and the internet has no route back to that — NAT is exactly the missing piece." },
      { q: "The provider hands you 203.0.113.0/30 and says 'we're on .1'. Your WAN address is:",
        opts: [".0 — first in the block", ".2 — the other usable address", ".3 — last in the block"],
        right: 1,
        why: "In a /30, .0 is the network address and .3 the broadcast. The two usable addresses are .1 and .2 — provider took .1, so .2 is yours." },
      { q: "What makes DIA different from ordinary business broadband?",
        opts: ["It uses special cables", "Dedicated, non-shared bandwidth with an SLA — you get what you bought, always", "It's just marketing"],
        right: 1,
        why: "Broadband is contended — you share capacity with the neighborhood. DIA bandwidth is reserved for you end-to-end and backed by an SLA, which is why it costs what it costs." },
    ],
  },
  {
    id: "dhcp",
    title: "DHCP — Address Assignment",
    tag: "L3 · services",
    ready: true,
    scenarioId: "dhcp-serve",
    problem: {
      text: "Nobody hand-types IP addresses onto three hundred laptops — and when someone tries, you get duplicates, wrong gateways and tickets. DHCP hands each machine its address, mask, gateway and DNS automatically from a pool you define once. On an EX switch the elegant part is that the switch ITSELF can be the DHCP server, serving each VLAN from its irb gateway interface.",
      svg: "dhcp-problem"
    },
    how: {
      text: "A machine that wakes up addressless shouts into its broadcast domain and the server answers — four steps called DORA: DISCOVER (the shout), OFFER (here's an address), REQUEST (I'll take it), ACK (it's yours, and here's your gateway and DNS too). That ACK is why one wrong pool breaks three things at once. Leases expire and renew automatically. The server must be reachable at layer 2 — which is why you bind it to the VLAN's own irb; for remote subnets a relay forwards the broadcast (that's what 'dhcp-relay' does on bigger networks). Run dhclient on a lab host and watch all four packets animate."
    },
    prereqs: [
      { desc: "A VLAN with an irb gateway (address on irb.N, l3-interface bound)",
        test: function(){ return typeof devsBy === "function" && devsBy("switch").some(function(sw){ return Object.keys(D(sw).irbs || {}).length >= 1; }); } },
      { desc: "An address pool committed: network, a range, and a router option",
        test: function(){ return devsBy("switch").some(function(sw){ return (D(sw).pools || []).some(function(p){ return p.ranges.length && p.router; }); }); } },
      { desc: "The DHCP server bound to the VLAN's irb interface",
        test: function(){ return devsBy("switch").some(function(sw){ return D(sw).dhcpIfs && D(sw).dhcpIfs.size >= 1; }); } },
      { desc: "A host actually got a lease (dhclient eth0 — address AND gateway, via DHCP)",
        test: function(){ return devsBy("host").some(function(h){ return h.cfg && h.cfg.viaDhcp && h.cfg.ip && h.cfg.gw; }); } },
    ],
    cfg: [
      ["set access address-assignment pool STAFF family inet network 10.0.10.0/24", "The subnet this pool serves — must match the irb's subnet"],
      ["set access address-assignment pool STAFF family inet range r1 low 10.0.10.100", "Hand out addresses from .100..."],
      ["set access address-assignment pool STAFF family inet range r1 high 10.0.10.199", "...to .199 — keep .1–.99 for gear with static addresses"],
      ["set access address-assignment pool STAFF family inet dhcp-attributes router 10.0.10.1", "The gateway that rides along in the ACK — the irb's own address"],
      ["set system services dhcp-local-server group LAN interface irb.10", "Serve DHCP on the staff VLAN's gateway interface"],
      ["commit", "Then on the client: dhclient eth0 — and watch DORA animate"]
    ],
    nums: [
      ["67 / 68", "UDP ports: server listens on 67, client on 68"],
      ["4", "Packets in a lease: Discover, Offer, Request, Ack"],
      ["50% / 87.5%", "Of lease time: when a client tries to renew, then rebinds"],
      ["255.255.255.255", "Where DISCOVER goes — the client has no address yet, so it broadcasts"]
    ],
    els: [
      ["legacy: set system services dhcp pool ...", "The old built-in server. Current Junos uses dhcp-local-server + access address-assignment, as this lab teaches"],
      ["legacy: bound to vlan.N", "ELS: bound to irb.N — same rename as everywhere else in the ELS split"]
    ],
    verify: [
      ["show dhcp server binding", "Every lease this box has handed out — the client's MAC should appear here seconds after dhclient"],
      ["dhclient eth0 (on the host)", "'no DHCPOFFERS' means the server isn't reachable in this VLAN — wrong irb binding, or wrong port VLAN"],
      ["ip addr + ping the gateway (on the host)", "The lease is only real if the address is in the right subnet AND the gateway that came with it answers"]
    ],
    breaks: [
      "Server bound to the wrong irb — the DISCOVER broadcast never reaches it. 'No DHCPOFFERS', every time.",
      "Pool network doesn't match the irb subnet — server can't offer sane addresses for the segment it hears.",
      "dhcp-attributes router forgotten — clients get an address, can ping locally, and 'the internet is down'.",
      "Pool exhausted — range too small for the room; latecomers get nothing. Check the binding count against the range size.",
      "Two DHCP servers on one VLAN — a rogue server races the real one and hands out wrong gateways. Nasty to diagnose."
    ],
    answer: "DHCP automates addressing: a new machine broadcasts a Discover, the server answers with an Offer, the client Requests it and the Ack makes it official — address, mask, gateway and DNS in one exchange, that's DORA. On our EX switches the switch itself serves each VLAN from an address pool, bound to the VLAN's irb gateway interface. To test it I run a fresh client, check it appears in show dhcp server binding, and prove the lease works by pinging the gateway it was handed — and if there are no offers at all, the server isn't reachable in that VLAN.",
    quiz: [
      { q: "A laptop gets an IP, pings everything local, but no internet. The DHCP-shaped suspect?",
        opts: ["The lease expired", "The pool's dhcp-attributes router option is missing or wrong", "DNS is down"],
        right: 1,
        why: "Address works, local works, remote doesn't = no (or wrong) default gateway. The gateway arrives inside the DHCP ACK — if the pool doesn't set it, clients never learn it." },
      { q: "dhclient reports 'no DHCPOFFERS received'. What does that tell you?",
        opts: ["The pool is exhausted", "The DISCOVER broadcast reached no server — wrong VLAN or wrong irb binding", "The cable is bad"],
        right: 1,
        why: "No offers means nobody HEARD the shout. The server serves specific irb interfaces; if the client's port sits in a VLAN whose irb isn't bound, the broadcast dies unheard. (Exhausted pools usually NAK instead.)" },
      { q: "Why does the DHCP server on a switch get bound to irb.10 specifically?",
        opts: ["irb interfaces are faster", "DISCOVER is an L2 broadcast — the server must live inside that VLAN, and irb.10 IS the switch's presence in VLAN 10", "It's just convention"],
        right: 1,
        why: "A broadcast never crosses VLAN boundaries. Binding the server to the VLAN's own L3 interface puts its ear inside the room where clients shout." },
    ],
  },
  {
    id: "ospf",
    title: "OSPF — Interior Routing",
    tag: "L3 · routing",
    ready: true,
    scenarioId: "ospf-backbone",
    problem: {
      text: "Three sites, redundant links, and static routes everywhere: six routes to hand-write, and every topology change means editing every router — miss one and traffic blackholes. OSPF replaces the typing: routers introduce themselves to their neighbors, share what they know, and each one computes the best path to everything. Cut a cable and they recompute around it in seconds, at 3 AM, without you.",
      svg: "ospf-problem"
    },
    how: {
      text: "Routers multicast hello packets on OSPF-enabled interfaces; two routers that hear each other form an adjacency and synchronize their link-state databases — a shared map of every router and link. Each router then runs Dijkstra's shortest-path algorithm over that map independently and installs the results in its routing table. Because everyone has the SAME map, everyone computes consistent, loop-free paths. Interfaces marked passive are advertised into the map but send no hellos — that's for LANs, where hosts shouldn't hear routing chatter."
    },
    prereqs: [
      { desc: "At least two routers with addressed, cabled transit links",
        test: function(){ return typeof devsBy === "function" && devsBy("router").filter(function(r){ return Object.keys(D(r).l3ports || {}).length >= 1; }).length >= 2; } },
      { desc: "OSPF enabled on the transit interfaces of at least two routers",
        test: function(){ return devsBy("router").filter(function(r){ return Object.keys(D(r).ospf || {}).length >= 1; }).length >= 2; } },
      { desc: "An adjacency formed (show ospf neighbor — Full)",
        test: function(){ return devsBy("router").some(function(r){ return (D(r).ospfNeighbors || []).length >= 1; }); } },
      { desc: "A route was LEARNED, not typed ([OSPF/10] in show route)",
        test: function(){ return devsBy("router").some(function(r){ return (D(r).ospfRoutes || []).length >= 1; }); } },
    ],
    cfg: [
      ["set protocols ospf area 0 interface ge-0/0/1.0", "Run OSPF on this transit link — note the .0: OSPF binds to the LOGICAL interface"],
      ["set protocols ospf area 0 interface ge-0/0/2.0", "...and the other transit link. Same lines on each neighbor router"],
      ["set protocols ospf area 0 interface ge-0/0/0.0 passive", "The LAN: advertise its subnet into the map, but send no hellos at the hosts"],
      ["commit", "Then show ospf neighbor — 'Full' means the adjacency formed and databases are synced"]
    ],
    nums: [
      ["10 s / 40 s", "Hello interval / dead interval on broadcast links — mismatched timers = no adjacency"],
      ["[OSPF/10]", "Junos route preference for internal OSPF — beats BGP's 170, loses to static's 5"],
      ["Area 0", "The backbone — every other area must touch it; small networks are just area 0"],
      ["224.0.0.5", "The multicast address hellos are sent to (AllSPFRouters)"],
      ["ref-bw / bandwidth", "Interface cost formula — faster links cost less and attract traffic"]
    ],
    els: [
      ["(routing survived the ELS split untouched)", "OSPF syntax is identical on legacy and current code — the ELS changes live in the switching layer, not here"]
    ],
    verify: [
      ["show ospf neighbor", "The state column is the diagnosis: Full = synced; stuck in Init/ExStart = one-way hearing or MTU mismatch; absent = no hellos arriving"],
      ["show route protocol ospf", "The learned routes, tagged [OSPF/10] — routes you didn't type appearing here is the whole point"],
      ["cut a transit cable, ping through", "The rerouting proof: traffic should find the surviving path within seconds"]
    ],
    breaks: [
      "OSPF enabled on ge-0/0/1 instead of ge-0/0/1.0 — the protocol binds to logical units; the physical name silently does nothing here.",
      "One side in area 0, the other in area 1 — hellos carry the area ID and mismatches are rejected. No adjacency, ever.",
      "LAN interface not passive and not included at all — the subnet never enters the map, and remote sites can't reach it.",
      "Subnet mismatch on the transit /30 — hellos arrive from an 'alien' subnet and are ignored.",
      "A static route left behind shadowing OSPF — static's preference 5 beats OSPF's 10, so the dynamic route never wins. Delete the training wheels."
    ],
    answer: "OSPF is our interior routing protocol: routers discover neighbors with hello packets, form adjacencies and synchronize a shared link-state map of the whole network, then each independently runs shortest-path over that map to build its routing table. The payoff is self-healing — a dead link is recomputed around in seconds with no human editing routes. To verify I check show ospf neighbor for Full state, look for [OSPF/10] routes I never typed, and prove it by cutting a transit link and watching the ping survive on the alternate path.",
    quiz: [
      { q: "show ospf neighbor is empty on both routers of a properly cabled /30. First check?",
        opts: ["Reboot both routers", "Is OSPF enabled on the LOGICAL interface (.0) on both, same area?", "The cable"],
        right: 1,
        why: "The classic pair: OSPF bound to ge-0/0/1 (physical — ignored) instead of ge-0/0/1.0, or an area mismatch. Both mean no valid hellos, which means no neighbor line at all." },
      { q: "Why mark the LAN interface passive instead of leaving it out of OSPF?",
        opts: ["Passive is faster", "Left out = the LAN's subnet isn't advertised; passive = advertised, but no hellos at the hosts", "No difference"],
        right: 1,
        why: "Leaving it out hides the subnet from the map — remote sites can't route to it. Passive includes the subnet in advertisements while sending no protocol chatter into the host segment. You almost always want passive." },
      { q: "A transit cable dies at 3 AM. With OSPF properly deployed, who fixes the routing?",
        opts: ["The on-call engineer, manually", "Every router, automatically — dead neighbor detected, map updated, paths recomputed in seconds", "The provider"],
        right: 1,
        why: "Missed hellos mark the neighbor dead, the topology change floods through the area, and every router re-runs shortest-path. This automatic reconvergence is OSPF's entire sales pitch." },
    ],
  },
  {
    id: "bgp",
    title: "BGP — Speaking to Providers",
    tag: "L3 · routing",
    ready: true,
    scenarioId: "speak-bgp",
    problem: {
      text: "A typed static default route is a promise you made to yourself — the provider could be on fire and your router would keep shoveling packets at them. BGP replaces the promise with a conversation: your edge and the provider's edge hold a session, exchange routes, and the session state itself is the health check. The default route is LEARNED; if the provider dies, the session drops and the route vanishes with it. Every carrier interconnect and every serious DIA handoff speaks BGP — it is the protocol the internet itself runs on.",
      svg: "bgp-problem"
    },
    how: {
      text: "Each network has an AS number — its name in the BGP world. Your router and the provider's peer over TCP port 179: they confirm each other's AS, hold the session open with keepalives, and advertise routes with the AS path they've traveled. eBGP (between different AS numbers) is what you run at a handoff. In this lab the session needs three things on your side: your AS number, a group typed external with the provider's peer-as, and the neighbor's address on the shared /30. Get one wrong and show bgp summary tells you WHY it's down — read the reason column."
    },
    prereqs: [
      { desc: "An edge router cabled to an ISP with the /30 addressed",
        test: function(){ if(typeof devsBy !== "function") return false;
          return devsBy("router").length >= 1 && devsBy("isp").length >= 1 &&
            Object.values(links).some(function(l){
              var a = devices[l.a.dev], b = devices[l.b.dev];
              return a && b && ((a.type === "router" && b.type === "isp") || (a.type === "isp" && b.type === "router")); }); } },
      { desc: "Your router has an AS number (routing-options autonomous-system)",
        test: function(){ return devsBy("router").some(function(r){ return D(r).as; }); } },
      { desc: "The session is Established (show bgp summary)",
        test: function(){ return devsBy("router").some(function(r){ return (D(r).bgpPeers || []).some(function(p){ return p.state === "Established"; }); }); } },
      { desc: "A default route LEARNED, not typed — [BGP/170], with no static default shadowing it",
        test: function(){ return devsBy("router").some(function(r){
          if((D(r).routes || []).some(function(rt){ return rt.net === "0.0.0.0"; })) return false;
          return (D(r).bgpRoutes || []).some(function(rt){ return rt.net === "0.0.0.0"; }) ||
                 (D(r).bgpPeers || []).some(function(p){ return p.state === "Established"; }); }); } },
    ],
    cfg: [
      ["set routing-options autonomous-system 65010", "Your AS number — your name in the BGP world"],
      ["set protocols bgp group ISP type external", "eBGP: this group peers with a DIFFERENT autonomous system"],
      ["set protocols bgp group ISP peer-as 65000", "The provider's AS — must match what they actually are, or the session never opens"],
      ["set protocols bgp group ISP neighbor 203.0.113.1", "Their address on the shared /30"],
      ["delete routing-options static route 0.0.0.0/0", "Remove the training wheels — the learned [BGP/170] default takes over"],
      ["commit", "Then show bgp summary until it says Established"]
    ],
    nums: [
      ["179", "TCP port BGP peers on — a session is literally a TCP connection"],
      ["[BGP/170]", "Junos route preference for learned BGP routes — everything else wins ties, by design"],
      ["64512–65534", "Private AS range (like RFC 1918 for AS numbers) — what labs and internal peerings use"],
      ["90 s / 30 s", "Default hold time / keepalive interval — three silent keepalives and the session drops"],
      ["~1 M routes", "Size of the full internet table a real transit session can offer — edge boxes often take just a default instead"]
    ],
    els: [
      ["(BGP predates and ignores the ELS split)", "Identical syntax on legacy and current code — the ELS renames hit ethernet-switching, not routing protocols"]
    ],
    verify: [
      ["show bgp summary", "THE command. Established = healthy; anything else, read the state/reason — Active/Connect means it can't even reach the peer, Idle means config rejected"],
      ["show route receive-protocol bgp 203.0.113.1", "What the provider is actually advertising to you"],
      ["show route 8.8.8.8", "The proof: the path out should now say [BGP/170] via the learned default — a route nobody typed"]
    ],
    breaks: [
      "peer-as doesn't match the provider's real AS — the OPEN is rejected and the session flaps between Idle and Active forever.",
      "Neighbor address typo'd — TCP to port 179 goes nowhere; state stuck in Connect. Ping the /30 first, always.",
      "Static default left in place — static preference 5 beats BGP 170, so the learned route exists but never wins. Delete the static.",
      "The /30 itself is broken (wrong mask, wrong side) — BGP rides on TCP rides on IP; no IP reachability, no session. Layer 3 before layer BGP.",
      "Session Established but no routes accepted — a policy or the provider filtering; check receive-protocol before blaming your own box."
    ],
    answer: "BGP is how independent networks exchange routes — each has an AS number, sessions run over TCP 179, and routes carry the AS path they took. At a provider handoff we run eBGP: our edge peers with theirs, and instead of typing a default route we LEARN it — so the route lives and dies with the session, and a dead provider takes their route away instead of blackholing our traffic. To test the interconnect I ping across the /30 first, then show bgp summary for Established — reading the reason column when it isn't — and finally prove show route resolves the internet via [BGP/170], a route nobody typed.",
    quiz: [
      { q: "show bgp summary shows the session bouncing Idle/Active, never Established. The /30 pings fine. Prime suspect?",
        opts: ["The cable", "peer-as mismatch — the OPEN message names an AS the far side doesn't accept", "Keepalives too slow"],
        right: 1,
        why: "IP reachability is proven, so it's the BGP negotiation itself. Each side states its AS in the OPEN; if it doesn't match the configured peer-as, the session is refused and retries forever." },
      { q: "The session is Established and a default arrives — but show route still uses your old static default. Why?",
        opts: ["BGP is slow", "Static preference 5 beats BGP 170 — delete the static and the learned route takes over", "The provider blocks it"],
        right: 1,
        why: "Junos prefers lower preference values. A static route (5) always shadows a BGP route (170) for the same prefix. The learned default is sitting right there, waiting for you to remove the typed one." },
      { q: "Why is a BGP-learned default better than a typed static default at a provider handoff?",
        opts: ["It routes faster", "It's tied to the session — provider dies, session drops, route vanishes instead of blackholing", "It's easier to type"],
        right: 1,
        why: "A static route is unconditional trust. The BGP route exists only while the peer is alive and talking — failure detection is built into the protocol, which is exactly what you want from an interconnect." },
    ],
  },
  { id: "vrrp", title: "VRRP — Gateway Redundancy", tag: "L3 · redundancy", ready: false,
    teaser: "Two routers pretending to be one gateway IP, so the default gateway can die without anyone updating a single host. Needs engine support first — on the roadmap." },
  { id: "lldp", title: "LLDP — Neighbor Discovery", tag: "L2 · operations", ready: false,
    teaser: "The protocol that answers 'what is plugged into this port?' without walking to the rack. Needs engine support first — on the roadmap." },
];

var protoView = { page: "list", guide: null };

function protoEl(tag, cls, parent, text){
  var e = document.createElement(tag);
  if(cls) e.className = cls;
  if(text !== undefined) e.textContent = text;
  if(parent) parent.appendChild(e);
  return e;
}

function protoSvg(kind){
  var box = function(x, y, w, label, color){
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="30" rx="5" fill="none" stroke="' + (color || "var(--line)") + '"/>' +
           '<text x="' + (x + w / 2) + '" y="' + (y + 19) + '" fill="var(--text)">' + label + '</text>';
  };
  var open = '<svg viewBox="0 0 560 150" class="pg-svg"><g font-size="11" fill="var(--dim)" text-anchor="middle">';
  var close = '</g></svg>';
  if(kind === "lacp-problem") return open +
    box(20, 45, 70, "SW1") + box(180, 45, 70, "SW2") +
    '<line x1="90" y1="56" x2="180" y2="56" stroke="var(--red)" stroke-width="2"/>' +
    '<line x1="90" y1="70" x2="180" y2="70" stroke="var(--red)" stroke-width="2"/>' +
    '<text x="135" y="35" fill="var(--red)">two bare cables</text>' +
    '<text x="135" y="105" fill="var(--red)">= loop = storm \u26a1</text>' +
    box(310, 45, 70, "SW1") + box(470, 45, 70, "SW2") +
    '<line x1="380" y1="56" x2="470" y2="56" stroke="var(--green)" stroke-width="2"/>' +
    '<line x1="380" y1="70" x2="470" y2="70" stroke="var(--green)" stroke-width="2"/>' +
    '<ellipse cx="425" cy="63" rx="40" ry="17" fill="none" stroke="var(--green)" stroke-dasharray="4 3"/>' +
    '<text x="425" y="35" fill="var(--green)">same cables + LACP</text>' +
    '<text x="425" y="105" fill="var(--green)">= one logical link: ae0 \u2713</text>' + close;
  if(kind === "vlan-problem") return open +
    box(230, 20, 100, "one switch") +
    '<rect x="60" y="80" width="180" height="55" rx="6" fill="none" stroke="var(--blue)" stroke-dasharray="5 3"/>' +
    '<text x="150" y="97" fill="var(--blue)">VLAN 10 \u00b7 staff</text>' +
    '<text x="150" y="123">pc-a \u00b7 pc-b \u00b7 printer</text>' +
    '<rect x="320" y="80" width="180" height="55" rx="6" fill="none" stroke="var(--amber)" stroke-dasharray="5 3"/>' +
    '<text x="410" y="97" fill="var(--amber)">VLAN 20 \u00b7 guest</text>' +
    '<text x="410" y="123">laptop \u00b7 phone</text>' +
    '<line x1="255" y1="50" x2="150" y2="80" stroke="var(--blue)"/>' +
    '<line x1="305" y1="50" x2="410" y2="80" stroke="var(--amber)"/>' +
    '<text x="280" y="75" fill="var(--red)">\u2715 no path between them</text>' + close;
  if(kind === "rstp-problem") return open +
    box(245, 15, 70, "ring-1") + box(90, 100, 70, "ring-2") + box(400, 100, 70, "ring-3") +
    '<line x1="255" y1="45" x2="145" y2="100" stroke="var(--green)" stroke-width="2"/>' +
    '<line x1="305" y1="45" x2="415" y2="100" stroke="var(--green)" stroke-width="2"/>' +
    '<line x1="160" y1="115" x2="400" y2="115" stroke="var(--amber)" stroke-width="2" stroke-dasharray="6 4"/>' +
    '<text x="280" y="132" fill="var(--amber)">BLK \u2014 blocked on standby</text>' +
    '<text x="280" y="90" fill="var(--green)">forwarding</text>' +
    '<text x="470" y="30" fill="var(--dim)">loop broken,</text>' +
    '<text x="470" y="45" fill="var(--dim)">backup kept \u2713</text>' + close;
  if(kind === "dia-problem") return open +
    box(20, 60, 80, "customer") + box(160, 60, 90, "your edge") + box(320, 60, 90, "provider") + box(470, 60, 70, "internet") +
    '<line x1="100" y1="75" x2="160" y2="75" stroke="var(--line)"/>' +
    '<line x1="250" y1="75" x2="320" y2="75" stroke="var(--green)" stroke-width="2"/>' +
    '<line x1="410" y1="75" x2="470" y2="75" stroke="var(--line)"/>' +
    '<text x="285" y="55" fill="var(--green)">the handoff /30</text>' +
    '<text x="285" y="105" fill="var(--dim)">.2 (you) \u2500 .1 (them)</text>' +
    '<text x="205" y="120" fill="var(--amber)">NAT lives here</text>' + close;
  if(kind === "dhcp-problem") return open +
    box(60, 45, 80, "laptop") + box(380, 45, 110, "switch \u00b7 irb.10") +
    '<line x1="140" y1="60" x2="380" y2="60" stroke="var(--line)"/>' +
    '<text x="260" y="30" fill="var(--green)">1 DISCOVER \u2192   3 REQUEST \u2192</text>' +
    '<text x="260" y="95" fill="var(--blue)">\u2190 2 OFFER   \u2190 4 ACK (+ gateway, DNS)</text>' +
    '<text x="260" y="125" fill="var(--dim)">the DORA dance \u2014 four packets, zero typing</text>' + close;
  if(kind === "ospf-problem") return open +
    box(60, 20, 70, "hq-r") + box(245, 20, 70, "mid-r") + box(430, 20, 70, "far-r") +
    '<line x1="130" y1="35" x2="245" y2="35" stroke="var(--green)" stroke-width="2"/>' +
    '<line x1="315" y1="35" x2="430" y2="35" stroke="var(--green)" stroke-width="2"/>' +
    '<path d="M 95 50 Q 280 130 465 50" fill="none" stroke="var(--red)" stroke-width="2" stroke-dasharray="6 4"/>' +
    '<text x="280" y="80" fill="var(--red)">\u2715 cable cut at 3 AM</text>' +
    '<text x="280" y="120" fill="var(--green)">routers recompute the map themselves \u2014 traffic takes the top path in seconds</text>' + close;
  if(kind === "bgp-problem") return open +
    box(80, 45, 110, "edge-r1 \u00b7 AS 65010") + box(360, 45, 110, "ISP \u00b7 AS 65000") +
    '<line x1="190" y1="60" x2="360" y2="60" stroke="var(--green)" stroke-width="2"/>' +
    '<text x="275" y="40" fill="var(--green)">eBGP session (TCP 179) \u2014 Established</text>' +
    '<text x="275" y="90" fill="var(--blue)">\u2190 0.0.0.0/0 arrives as [BGP/170]</text>' +
    '<text x="275" y="120" fill="var(--dim)">provider dies \u2192 session drops \u2192 route vanishes. No blackhole.</text>' + close;
  return "";
}

function protoFindLink(typeA, typeB){
  for(var lid in links){
    var l = links[lid];
    var da = devices[l.a.dev], db = devices[l.b.dev];
    if(!da || !db) continue;
    if(da.type === typeA && db.type === typeB)
      return { pa: portXY(da, l.a.port), pb: portXY(db, l.b.port) };
    if(da.type === typeB && db.type === typeA)
      return { pa: portXY(db, l.b.port), pb: portXY(da, l.a.port) };
  }
  return null;
}
function protoVolley(steps, doneLabel, doneColor){
  var green = cssVar("--green", "#3ecf6e"), blue = cssVar("--blue", "#4a90d9");
  var i = 0;
  var next = function(){
    if(i >= steps.length){
      if(doneLabel){
        var last = steps[steps.length - 1];
        var mid = [(last.p[0][0] + last.p[1][0]) / 2, (last.p[0][1] + last.p[1][1]) / 2];
        floatLabel(mid[0], mid[1], doneLabel, doneColor || green);
        if(typeof SFX !== "undefined") SFX.commit();
      }
      return;
    }
    var st = steps[i];
    runDot(st.p, st.c || (i % 2 === 0 ? green : blue), function(){
      if(st.label) floatLabel(st.p[1][0], st.p[1][1], st.label, st.c || (i % 2 === 0 ? green : blue));
      i++;
      setTimeout(next, 240);
    });
    if(typeof SFX !== "undefined") SFX.blip();
  };
  next();
}
var protoAnims = {
  lacp: { need: "Cable two switches together first.", run: function(){
    var lk = protoFindLink("switch", "switch");
    if(!lk) return false;
    var f = [lk.pa, lk.pb], r = [lk.pb, lk.pa];
    protoVolley([
      { p: f, label: "LACPDU: I'm in ae0" }, { p: r, label: "LACPDU: me too" },
      { p: f, label: "LACPDU" }, { p: r, label: "LACPDU" },
    ], "Collecting distributing \u2713");
    return true;
  } },
  vlan: { need: "Cable two switches together first (the trunk).", run: function(){
    var lk = protoFindLink("switch", "switch");
    if(!lk) return false;
    protoVolley([
      { p: [lk.pa, lk.pb], label: "802.1Q tag added \u2192 stripped" },
      { p: [lk.pb, lk.pa], label: "tagged the other way too" },
    ], "hosts never see the tag");
    return true;
  } },
  rstp: { need: "Cable at least two switches together first.", run: function(){
    var lk = protoFindLink("switch", "switch");
    if(!lk) return false;
    var amber = cssVar("--amber", "#c99a3c");
    protoVolley([
      { p: [lk.pa, lk.pb], label: "BPDU: my root, my cost" },
      { p: [lk.pb, lk.pa], label: "BPDU: mine is better" },
    ], null);
    setTimeout(function(){
      var end = typeof NET !== "undefined" && NET.blocked && NET.blocked.size ? lk.pb : lk.pb;
      floatLabel(end[0], end[1], NET && NET.blocked && NET.blocked.size ? "loser port \u2192 BLK" : "election decides who forwards", amber);
    }, 1400);
    return true;
  } },
  dia: { need: "Cable a router to an ISP first (the handoff).", run: function(){
    var lk = protoFindLink("router", "isp");
    if(!lk) return false;
    protoVolley([
      { p: [lk.pa, lk.pb], label: "out: NAT'd to public address" },
      { p: [lk.pb, lk.pa], label: "reply finds its way back" },
    ], "handoff proven \u2713");
    return true;
  } },
  dhcp: { need: "Cable a host into a switch first.", run: function(){
    var lk = protoFindLink("host", "switch");
    if(!lk) return false;
    var f = [lk.pa, lk.pb], r = [lk.pb, lk.pa];
    protoVolley([
      { p: f, label: "DISCOVER" }, { p: r, label: "OFFER" },
      { p: f, label: "REQUEST" }, { p: r, label: "ACK + gateway + DNS" },
    ], "lease \u2713");
    return true;
  } },
  ospf: { need: "Cable two routers together first.", run: function(){
    var lk = protoFindLink("router", "router");
    if(!lk) return false;
    protoVolley([
      { p: [lk.pa, lk.pb], label: "hello (224.0.0.5)" },
      { p: [lk.pb, lk.pa], label: "hello \u2014 I hear you" },
      { p: [lk.pa, lk.pb], label: "database sync" },
    ], "adjacency Full \u2713");
    return true;
  } },
  bgp: { need: "Cable a router to an ISP first.", run: function(){
    var lk = protoFindLink("router", "isp");
    if(!lk) return false;
    protoVolley([
      { p: [lk.pa, lk.pb], label: "OPEN: I am AS 65010" },
      { p: [lk.pb, lk.pa], label: "OPEN: AS 65000, accepted" },
      { p: [lk.pa, lk.pb], label: "KEEPALIVE" },
      { p: [lk.pb, lk.pa], label: "0.0.0.0/0 [BGP/170]" },
    ], "Established \u2713");
    return true;
  } },
};
var PROTO_GLOW_TYPES = {
  lacp: ["switch"], vlan: ["switch"], rstp: ["switch"],
  dia: ["router", "isp"], dhcp: ["switch", "host"],
  ospf: ["router"], bgp: ["router", "isp"],
};
function protoGlow(guideId, on){
  if(typeof document.querySelectorAll !== "function") return;
  var types = PROTO_GLOW_TYPES[guideId] || [];
  for(var id in devices){
    if(types.indexOf(devices[id].type) === -1) continue;
    var g = document.querySelector('[data-dev="' + id + '"]');
    if(g) g.classList.toggle("pg-glow", !!on);
  }
}
function protoJumpToScenario(scenId){
  var idx = -1;
  for(var i = 0; i < SCENARIOS.length; i++) if(SCENARIOS[i].id === scenId) idx = i;
  if(idx === -1) return;
  var sel = document.getElementById("scenario-select");
  sel.value = idx;
  sel.onchange();
  if(typeof setTabletTab === "function") setTabletTab("scen");
}

var protoTimer = null;
function protoStopTimer(){ if(protoTimer){ clearInterval(protoTimer); protoTimer = null; } }

function renderProtoTab(){
  var box = document.getElementById("tab-proto");
  if(!box) return;
  protoStopTimer();
  box.innerHTML = "";
  if(protoView.page === "guide" && protoView.guide) renderProtoGuide(box, protoView.guide);
  else renderProtoList(box);
}

function renderProtoList(box){
  protoEl("h3", "pg-list-title", box, "Field guides");
  protoEl("p", "pg-list-sub", box, "One protocol per page, always the same shape: the problem, how it works, what must be true first, how to prove it, what breaks it — and the answer you'd give out loud.");
  PROTO_GUIDES.forEach(function(g){
    var card = protoEl("div", "pg-card" + (g.ready ? "" : " pg-card-soon"), box);
    var top = protoEl("div", "pg-card-top", card);
    protoEl("b", null, top, g.title);
    protoEl("span", "pg-tag", top, g.tag);
    protoEl("div", "pg-card-body", card, g.ready ? g.problem.text.split(". ")[0] + "." : g.teaser);
    if(g.ready){
      card.onclick = function(){ protoView = { page: "guide", guide: g }; renderProtoTab(); };
    } else {
      protoEl("div", "pg-soon", card, "coming soon");
    }
  });
}

function renderProtoGuide(box, g){
  var back = protoEl("button", "pg-back", box, "\u25c2 All protocols");
  back.onclick = function(){ protoStopTimer(); protoView = { page: "list", guide: null }; renderProtoTab(); };
  protoEl("h3", "pg-title", box, g.title);
  var n = 0;
  var sec = function(title){
    n++;
    var d = protoEl("div", "pg-sec", box);
    protoEl("div", "pg-sec-h", d, n + " \u00b7 " + title);
    return d;
  };

  var s1 = sec("The problem it solves");
  protoEl("p", null, s1, g.problem.text);
  if(g.problem.svg){
    var holder = protoEl("div", null, s1);
    holder.innerHTML = protoSvg(g.problem.svg);
  }

  var s2 = sec("How it works");
  protoEl("p", null, s2, g.how.text);
  var anim = protoAnims[g.id];
  if(anim){
    var ab = protoEl("button", "pg-anim-btn", s2, "\u25b6 Animate this on my canvas");
    var note = protoEl("div", "pg-anim-note", s2, "");
    ab.onclick = function(){
      var ok = anim.run();
      note.textContent = ok ? "Watch the canvas." : anim.need;
    };
  }

  var s3 = sec("Prerequisites \u2014 live from YOUR lab");
  protoEl("p", "pg-sub", s3, "These check your actual canvas and configs, and update as you work:");
  var list = protoEl("div", "pg-prereqs", s3);
  var rows = g.prereqs.map(function(p){
    var row = protoEl("div", "obj pg-linked", list);
    protoEl("div", "dot", row);
    protoEl("span", null, row, p.desc);
    row.onmouseenter = function(){ protoGlow(g.id, true); };
    row.onmouseleave = function(){ protoGlow(g.id, false); };
    return { row: row, test: p.test, was: false };
  });
  var refresh = function(first){
    rows.forEach(function(r){
      var ok = false;
      try{ ok = !!r.test(); }catch(e){}
      r.row.className = "obj" + (ok ? " done" : "");
      if(!first && ok && !r.was && typeof SFX !== "undefined") SFX.ding();
      r.was = ok;
    });
  };
  refresh(true);
  protoTimer = setInterval(function(){
    var tp = document.getElementById("tab-proto");
    if(!tp || tp.style.display === "none"){ protoStopTimer(); return; }
    refresh(false);
  }, 1200);

  if(g.cfg){
    var s4 = sec("Configure it \u2014 the exact commands");
    g.cfg.forEach(function(c){
      var row = protoEl("div", "pg-verify", s4);
      protoEl("code", null, row, c[0]);
      protoEl("div", null, row, c[1]);
    });
  }

  if(g.nums){
    var s5 = sec("The numbers to know");
    var tbl = protoEl("div", "pg-nums", s5);
    g.nums.forEach(function(r){
      var row = protoEl("div", "pg-num-row", tbl);
      protoEl("b", "pg-num-val", row, r[0]);
      protoEl("span", null, row, r[1]);
    });
  }

  var s6 = sec("Verify it");
  g.verify.forEach(function(v){
    var row = protoEl("div", "pg-verify", s6);
    protoEl("code", null, row, v[0]);
    protoEl("div", null, row, v[1]);
  });

  var s7 = sec("What breaks it");
  g.breaks.forEach(function(b){ protoEl("div", "pg-break", s7, "\u2715 " + b); });

  if(g.els){
    var s8 = sec("Legacy vs current CLI (the ELS split)");
    protoEl("p", "pg-sub", s8, "Junos renamed parts of the switching CLI around 12.3/13.x (\u201cEnhanced Layer 2 Software\u201d). This lab teaches current ELS syntax \u2014 the EX4300 dialect. On an older box you may meet:");
    g.els.forEach(function(r){
      var row = protoEl("div", "pg-verify", s8);
      protoEl("code", null, row, r[0]);
      protoEl("div", null, row, r[1]);
    });
  }

  var s9 = sec("The 30-second answer \ud83c\udfa4");
  protoEl("p", "pg-answer", s9, "\u201c" + g.answer + "\u201d");

  var s10 = sec("Check yourself");
  g.quiz.forEach(function(q, qi){
    var qbox = protoEl("div", "pg-q", s10);
    protoEl("div", "pg-q-text", qbox, (qi + 1) + ". " + q.q);
    var why = null;
    q.opts.forEach(function(opt, oi){
      var b = protoEl("button", "pg-q-opt", qbox, opt);
      b.onclick = function(){
        var correct = oi === q.right;
        b.classList.add(correct ? "pg-q-right" : "pg-q-wrong");
        if(typeof SFX !== "undefined") (correct ? SFX.ding : SFX.womp)();
        if(!why){
          why = protoEl("div", "pg-q-why", qbox, (correct ? "\u2713 " : "Not quite \u2014 ") + q.why);
        }
        if(correct){
          qbox.querySelectorAll(".pg-q-opt").forEach(function(x){ x.disabled = true; });
        }
      };
    });
  });

  if(g.scenarioId){
    var pb = protoEl("button", "pg-practice", box, "Practice this → scenario");
    pb.onclick = function(){ protoJumpToScenario(g.scenarioId); };
  }
}
