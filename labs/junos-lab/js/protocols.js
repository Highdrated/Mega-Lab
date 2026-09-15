function ipToInt(ip){
  return ip.split(".").reduce(function(a, o){ return (a << 8) + parseInt(o, 10); }, 0) >>> 0;
}
function intToIp(n){
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}
function netCalc(ip, bits){
  var mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  var net = (ipToInt(ip) & mask) >>> 0;
  var bcast = (net | (~mask >>> 0)) >>> 0;
  var usable = bits >= 31 ? (bits === 31 ? 2 : 1) : Math.max(0, bcast - net - 1);
  return {
    network: intToIp(net),
    broadcast: intToIp(bcast),
    first: bits >= 31 ? intToIp(net) : intToIp(net + 1),
    last: bits >= 31 ? intToIp(bcast) : intToIp(bcast - 1),
    usable: usable,
    mask: intToIp(mask)
  };
}
function subnetDrillQ(){
  var bits = 22 + Math.floor(Math.random() * 8);
  var ip = [10 + Math.floor(Math.random() * 180), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), 1 + Math.floor(Math.random() * 254)].join(".");
  return { ip: ip, bits: bits, ans: netCalc(ip, bits) };
}

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
      ["set chassis aggregated-devices ethernet device-count 2", "Real Junos needs this before any ae exists — turn on strict mode below and this lab will demand it too"],
      ["(legacy and ELS mostly agree here)", "LACP config barely changed across the ELS split — the traps are in VLAN and irb syntax, not here"]
    ],
    real: [
      "On your EX4300 the chassis aggregated-devices line is NOT optional — no device-count, no ae0, full stop.",
      "Bench idea: bundle two ports between your EX4300 and anything LACP-capable, then pull one cable mid-ping and watch nothing happen.",
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
    real: [
      "On the real bench: show vlans after every change — the EX4300's default VLAN catches forgotten ports exactly like the lab's does.",
      "Real trunk tip: native-vlan-id mismatches between real switches cause the weirdest one-way problems; the lab keeps this simple, reality doesn't.",
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
    real: [
      "Your EX4300 runs RSTP out of the box — check show spanning-tree bridge BEFORE trusting a factory config.",
      "Bench idea: loop two cables between your switch and a dumb desktop switch and watch the port LEDs during the storm (briefly!). Unforgettable.",
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
    real: [
      "The EX4300 uses the exact dhcp-local-server + address-assignment syntax this lab teaches — configs transfer 1:1.",
      "Real-world catch: a second (rogue) DHCP server on the VLAN wins races the lab doesn't simulate — DCU's office wifi has met this one.",
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
    real: [
      "Real adjacencies take the same seconds strict mode simulates — watch show ospf neighbor climb ExStart \u2192 Full on the bench.",
      "Real gear adds MTU mismatch as a stuck-in-ExStart cause the lab doesn't model — remember it for the exam and for carrier handoffs.",
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
    real: [
      "The DCG interconnect speaks exactly this: eBGP over a /30. The show bgp summary reading habit transfers directly.",
      "On real sessions, hold-timer expiry during flaps (your Gi0/0/23!) shows as last-error in show bgp neighbor — a diagnostic layer the lab simplifies.",
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
  {
    id: "junos-arch",
    title: "Junos Architecture — RE, PFE & daemons",
    tag: "JNCIA \u00b7 fundamentals",
    ready: true,
    conceptual: true,
    problem: {
      text: ["Why does a switch keep forwarding at full speed while you're hammering the CLI? Because a Junos box is really TWO machines in one chassis.", "The ROUTING ENGINE (RE) is the brain — a small computer running the CLI, the config, and the routing protocols. The PACKET FORWARDING ENGINE (PFE) is the muscle — dedicated hardware that moves customer traffic without asking the brain.", "The exam loves this split, and so does troubleshooting: 'control plane problem' and 'forwarding plane problem' are different tickets with different fixes."],
      svg: "arch-problem"
    },
    how: {
      text: ["The brain is not one program — it's a team of daemons, one per job. mgd owns the CLI: every set you type is a conversation with mgd. rpd runs the routing protocols. dcd handles interfaces, chassisd watches fans and temperature, and on switches l2ald learns MAC addresses. (Press the buttons below to meet them on a real device.)", "The two of them share work like this: rpd builds the ROUTING table on the RE, the RE boils it down to a smaller FORWARDING table, and pushes that down into the PFE's hardware. From then on, customer traffic crosses the PFE only.", "Only one kind of packet ever climbs up to the brain: EXCEPTION traffic — packets addressed TO the box itself. Your ssh. Your ping to the switch. An OSPF hello. Everything else stays downstairs.", "That's the whole trick: a busy CLI can't slow customer traffic (different machine), and a commit swaps configs without dropping a packet (the PFE keeps forwarding on the old table until the new one lands)."]
    },
    try: [
      ["show system processes", "Meet the daemon team on a real device — these names ARE exam answers"],
      ["show version", "Model and Junos version — one OS across EX, MX and SRX, the exam's favorite fact"],
      ["show system commit", "The candidate model's paper trail — every commit, timestamped"]
    ],
    nums: [
      ["mgd", "management daemon — CLI, candidate config, commit"],
      ["rpd", "routing protocol daemon — OSPF, BGP, statics; the routing table"],
      ["dcd / chassisd", "interfaces / hardware (fans, power, temperature)"],
      ["l2ald", "MAC learning and ethernet switching (EX switches)"],
      ["2 tables", "routing table (RE, everything known) \u2192 forwarding table (PFE, best paths only)"],
      ["1 candidate", "config model: edit a candidate, commit makes it active — rollback 0 discards"]
    ],
    real: [
      "On the EX4300, show chassis routing-engine shows the actual RE's CPU and memory — the 'brain is a computer' claim, verifiable.",
      "Commit on the real box takes a few seconds (validation is real work); the lab's instant commit is the one friendliness strict mode keeps.",
    ],
    verify: [
      ["show system processes", "Meet the daemons — the exam names them and so do error messages"],
      ["show version", "Model + Junos version; the same Junos runs across EX, MX, SRX — one OS, the exam's favorite fact"],
      ["show chassis environment", "chassisd's world: temperatures and fans"],
      ["show system commit", "The commit model in action — history of activated candidates"]
    ],
    breaks: [
      "Blaming the forwarding plane for a control-plane symptom — 'I can't ssh to the switch' while customer traffic flows fine is an RE/exception-path issue, not a PFE one.",
      "Expecting transit traffic in the RE's logs — the PFE forwards it in hardware; the RE never saw it.",
      "Forgetting the candidate model — typing set and walking away changes NOTHING until commit.",
      "Thinking the routing and forwarding tables are the same thing — the exam will test the direction: RE builds routing \u2192 derives forwarding \u2192 pushes to PFE."
    ],
    answer: "Junos separates the control plane from the forwarding plane. The Routing Engine is a computer running modular daemons — mgd for the CLI and config, rpd for routing protocols, chassisd for hardware — and it builds the routing table. From that it derives a forwarding table and installs it into the Packet Forwarding Engine, dedicated hardware that moves transit traffic without involving the RE. Only traffic addressed to the box itself goes up to the RE. Configuration follows the candidate model: edits go into a candidate that becomes active only at commit, which is also what makes rollback trivial.",
    quiz: [
      { q: "A customer's traffic flows perfectly, but you can't ssh into the switch. Which plane is in trouble?",
        opts: ["Forwarding plane — the PFE is dropping packets", "Control plane — ssh is exception traffic destined for the RE", "Both"],
        right: 1,
        why: "Transit traffic is PFE business and it's fine. Your ssh is addressed TO the box, so it must reach the RE — that path (or the RE itself, or a filter on it) is what's broken." },
      { q: "You type ten set commands and close the laptop. What changed on the network?",
        opts: ["Everything you typed", "Nothing — the candidate was never committed", "Only the interface commands"],
        right: 1,
        why: "Junos edits a candidate configuration. Until commit, the active config — and the network — is untouched. This is the exam's favorite trap and real life's favorite safety net." },
      { q: "Which daemon did you talk to every time you typed a command in this lab?",
        opts: ["rpd", "mgd", "chassisd"],
        right: 1,
        why: "mgd owns the CLI and the candidate config. rpd only cares about routing protocols; chassisd about fans and power." },
    ],
  },
  {
    id: "filters",
    title: "Firewall Filters & Routing Policy",
    tag: "JNCIA \u00b7 traffic control",
    ready: true,
    scenarioId: "filtered-segment",
    problem: {
      text: ["First, defuse the name: on an EX switch, 'firewall' does NOT mean a firewall appliance. It isn't stateful, it doesn't track connections like an SRX would. It's a per-packet checklist — what other vendors call an ACL. Junos just reuses the word in config, and yes, that confuses everyone.", "A FIREWALL FILTER is a bouncer's checklist stapled to ONE interface, in ONE direction. Every packet crossing it walks the list: block the guest VLAN from reaching management, allow only icmp, drop a noisy host.", "ROUTING POLICY is the same checklist idea aimed at a different victim: ROUTES entering or leaving a protocol — what you accept from a BGP peer, what you advertise back. Filters eat packets; policies eat routes. That one sentence is worth an exam point."],
      svg: "filters-problem"
    },
    how: {
      text: ["A filter is a stack of TERMS, read top-down. Each term has a from (the match) and a then (the verdict). First term that matches wins — the packet never sees the terms below it. A term with no from at all matches everything.", "Three verdicts: accept (pass), reject (drop it AND send back 'administratively prohibited'), discard (drop it silently — the sender just waits and times out). Same death, different politeness. The lab's ping tells you which one ate your packet, and on which box.", "Now the foot-gun the exam and real life both adore: every filter ends with an INVISIBLE final rule — discard everything. If your terms only describe what to block, everything else falls off the end and dies too, including your own ssh. So every filter needs a final bare 'then accept' term for the rest of the world. Build it below and lock a ping out on purpose — the prerequisites walk you through it live.", "Routing policy reuses the exact same term/from/then shape, but under policy-options, applied to a protocol as import (what may enter my routing table) or export (what I advertise out). The lab doesn't simulate policy yet, so learn the two defaults the exam asks: BGP exports BGP-learned routes only — never your statics unless a policy says so — and OSPF floods its internal routes regardless; its export policy is for injecting outside routes in."]
    },
    prereqs: [
      { desc: "A filter defined with at least one term (set firewall family inet filter ...)",
        test: function(){ return typeof devsBy === "function" && devsBy("switch").concat(devsBy("router")).some(function(d){
          var f = cfgGet(d.config, ["firewall", "family", "inet", "filter"]) || {};
          return Object.keys(f).length >= 1; }); } },
      { desc: "The filter applied to an interface (family inet filter input ...)",
        test: function(){ return devsBy("switch").concat(devsBy("router")).some(function(d){
          var ifs = cfgGet(d.config, ["interfaces"]) || {};
          return JSON.stringify(ifs).indexOf("\"filter\"") !== -1; }); } },
      { desc: "The proof: a ping that used to work now dies at the filter",
        test: function(){ return typeof NET !== "undefined" && devsBy("host").some(function(h){
          if(!h.cfg || !h.cfg.ip || !h.cfg.gw) return false;
          var r = null;
          try{ r = pingRun(h, h.cfg.gw); }catch(e){ return false; }
          return r && !r.ok && r.lines.some(function(l){ return /firewall filter/.test(l.text); }); }); } },
    ],
    try: [
      ["show configuration | display set", "Read a device's filter back as set commands — term order = evaluation order"]
    ],
    cfg: [
      ["set firewall family inet filter GUEST-BLOCK term t1 from source-address 10.0.20.0/24", "Match packets from the guest subnet..."],
      ["set firewall family inet filter GUEST-BLOCK term t1 then discard", "...and drop them silently (reject would send 'administratively prohibited' back)"],
      ["set firewall family inet filter GUEST-BLOCK term allow-rest then accept", "CRITICAL: without this, the implicit discard-all at the end eats EVERYTHING else too"],
      ["set interfaces irb unit 20 family inet filter input GUEST-BLOCK", "Apply it inbound on the guest gateway — filters do nothing until applied"]
    ],
    nums: [
      ["top-down, first match", "Term evaluation order for filters AND policies — order is everything"],
      ["implicit discard", "What awaits unmatched packets at the end of every filter — forget allow-rest and lock yourself out"],
      ["reject vs discard", "reject answers 'prohibited'; discard says nothing — the sender just times out"],
      ["import / export", "Policy direction: what routes come INTO your table / what you advertise OUT"],
      ["BGP default export", "Advertise BGP-learned (and locally originated BGP) routes — NOT your statics, NOT your OSPF, unless policy says so"],
      ["OSPF default", "Internal routes flood via LSAs regardless; export policy is for injecting OUTSIDE routes (statics) into OSPF"]
    ],
    real: [
      "Golden rule on real gear: NEVER apply a new filter to the interface your own ssh rides on without commit confirmed. The implicit discard has eaten many engineers.",
      "Real filters also count hits per term (show firewall) — the fastest way to prove which term is matching.",
    ],
    verify: [
      ["show configuration | display set", "Read the filter back as set commands — order of terms is order of evaluation"],
      ["ping through it, both actions", "discard = timeout; reject = 'Communication administratively prohibited'. The lab's ping tells you WHICH filter on WHICH box ate it"],
      ["show route (policy side)", "On real gear: is the route even in the table? Import policy runs before the table, export after best-path"]
    ],
    breaks: [
      "No accept-the-rest term — the implicit discard swallows all traffic including your own ssh. The classic self-lockout.",
      "Filter defined but never applied to an interface — a filter in config doing nothing is invisible until you check the interface stanza.",
      "Terms in the wrong order — an accept-all term FIRST means your careful block term below it never runs.",
      "Confusing the two tools — 'block that subnet' is a filter job; 'stop advertising that route to the peer' is policy. Packets vs routes.",
      "Expecting BGP to advertise your static default by itself — the default export policy doesn't; that needs an export policy on real gear."
    ],
    answer: "A firewall filter is packet-level access control: terms evaluated top-down with match conditions and an action — accept, reject, or discard — applied to an interface, with an implicit discard for anything unmatched, which is why every filter needs a final accept term for the rest. Routing policy uses the same term structure but operates on routes, as import or export on a protocol: import decides what enters the routing table, export what gets advertised. The distinction the exam wants is exactly that — filters act on packets crossing an interface, policy acts on routes crossing a protocol boundary.",
    quiz: [
      { q: "Your filter blocks the guest subnet — and suddenly NOBODY can reach the gateway, including staff. Why?",
        opts: ["The guest subnet was too big", "No accept term for other traffic — the implicit discard-all ate everything unmatched", "The filter needs a commit"],
        right: 1,
        why: "Every filter ends with an invisible discard-everything. Your one term matched guests; staff matched nothing, fell through, and got discarded. Always finish with a then accept term for the rest." },
      { q: "Ping dies with 'Communication administratively prohibited'. Which filter action did it hit?",
        opts: ["discard", "reject", "accept"],
        right: 1,
        why: "reject drops the packet AND answers with an ICMP prohibited message — polite but chatty. discard says nothing at all; the sender just times out. Exam loves this pair." },
      { q: "You want to stop advertising a route to your BGP peer. Which tool?",
        opts: ["A firewall filter on the peering interface", "An export routing policy on the BGP session", "Delete the interface"],
        right: 1,
        why: "Routes are policy's territory. A filter would clumsily block packets; an export policy surgically removes the route from what you tell the peer, while traffic keeps flowing." },
    ],
  },
  {
    id: "subnetting",
    title: "IP Subnetting — the drill",
    tag: "JNCIA \u00b7 fundamentals",
    ready: true,
    conceptual: true,
    drill: "subnet",
    problem: {
      text: ["Every exam form has subnetting questions, and every real ticket starts with 'is this address even in that subnet?'.", "You've been USING the answers all along — every /24 LAN, /30 handoff and /31 point-to-point in this lab. Now make the math automatic: any address/prefix \u2192 network, broadcast, usable count, in under 30 seconds, in your head."],
      svg: "subnet-problem"
    },
    how: {
      text: ["The prefix splits an address into street name (network bits) and house numbers (host bits). Everything follows from where that split falls.", "The fast method is the MAGIC NUMBER. Find the interesting octet — the one where the mask isn't 0 or 255 — and compute 256 minus its mask value. Subnets step by that size. A /26 means mask .192, magic number 256\u2212192 = 64: networks sit at .0, .64, .128, .192.", "Snap your address DOWN to the nearest step: that's the network. Add the step size minus one: that's the broadcast. Everything strictly between them is usable, and the count is 2^(host bits) \u2212 2.", "Worked once, slowly: 192.168.10.130/26 \u2192 magic 64 \u2192 130 snaps down to 128 \u2192 network .128, broadcast .128+63 = .191, usable .129\u2013.190, count 62. That's the whole method — the drill below makes it reflex.", "Two exam specials to memorize as exceptions: /31 point-to-point keeps BOTH addresses usable — no network, no broadcast (RFC 3021) — and /32 is a single host."]
    },
    nums: [
      ["/24 = 254 hosts", "The everyday LAN — 256 minus network and broadcast"],
      ["/26 = 62 \u00b7 /27 = 30 \u00b7 /28 = 14", "The magic-number trio the exam recycles endlessly (sizes 64, 32, 16)"],
      ["/30 = 2 hosts", "Classic point-to-point — 4 addresses, 2 usable"],
      ["/31 = 2 hosts, 0 waste", "Modern point-to-point, RFC 3021 — no network or broadcast address at all"],
      ["magic number", "256 \u2212 interesting mask octet = subnet step size"],
      ["2^(32\u2212prefix) \u2212 2", "Usable hosts (except /31 and /32)"]
    ],
    verify: [
      ["the drill below", "Generate questions until the streak stops feeling like effort — that's the exam threshold"],
      ["your own lab", "Every address you've typed here lives in a subnet — check a /30 handoff or an irb /24 against your mental math"]
    ],
    breaks: [
      "Off-by-one on the broadcast — the block ENDS at next-network-minus-one, not at next-network.",
      "Forgetting to subtract 2 for network and broadcast when counting hosts — except on /31.",
      "Doing binary longhand under time pressure — the magic number method is the speed tool; save binary for checking.",
      "Reading the wrong octet — a /22's interesting octet is the THIRD, not the fourth. Prefix 17\u201324 lives in octet three."
    ],
    answer: "Given an address and prefix I find the interesting octet, compute the magic number as 256 minus the mask value there, and snap the address down to the nearest multiple — that's the network. Add the block size minus one for the broadcast, everything between is usable, and the count is two to the power of the host bits minus two. The exceptions worth naming: /31 point-to-point links use both addresses with no broadcast at all, and /32 is a single host route.",
    quiz: [
      { q: "192.168.10.130/26 — which subnet is this address in?",
        opts: ["192.168.10.0/26", "192.168.10.128/26", "192.168.10.192/26"],
        right: 1,
        why: "Magic number: 256\u2212192 = 64, so blocks start at .0, .64, .128, .192. 130 falls in the .128 block: network .128, broadcast .191, usable .129\u2013.190." },
      { q: "A colleague wants 40 hosts per subnet with minimum waste. Which prefix?",
        opts: ["/27 (30 hosts)", "/26 (62 hosts)", "/25 (126 hosts)"],
        right: 1,
        why: "/27 gives 30 — too small. /26 gives 62 — the smallest block that fits 40. Right-sizing subnets is a standing exam pattern." },
      { q: "Why do modern point-to-point links use /31 instead of /30?",
        opts: ["It's faster", "Zero waste — both addresses usable, no network/broadcast (RFC 3021)", "Old routers can't do /30"],
        right: 1,
        why: "A /30 burns half its addresses on network and broadcast. RFC 3021 declared point-to-point links don't need either, so /31 fits two routers in two addresses. You've seen it in the DIA guide's numbers." },
    ],
  },
  {
    id: "osi",
    title: "OSI & TCP/IP — where everything lives",
    tag: "JNCIA \u00b7 fundamentals",
    ready: true,
    conceptual: true,
    problem: {
      text: ["The exam's opening act — and secretly the index of this whole lab, because every feature you've used lives on a layer.", "Naming the layer compresses a whole diagnosis into one sentence: 'that's an L2 problem' instantly rules out routing, NAT and DNS. The model is a filing cabinet; the exam checks the drawers."],
      svg: "osi-problem"
    },
    how: {
      text: ["Seven layers on paper; the working set is 1\u20134, and you've already touched all of them in this lab.", "Layer 1, physical — bits on a wire. Cables, optics, and the gremlin's climbing CRC errors. Layer 2, data link — FRAMES delivered by MAC address. Switching, VLANs, LACP, RSTP. One VLAN = one broadcast domain; that wall is why DHCP can't cross VLANs.", "Layer 3, network — PACKETS delivered by IP. Routing, OSPF, subnetting, ping's ICMP. Layer 4, transport — ports and delivery style: TCP builds connections (BGP rides TCP 179), UDP fires and forgets (DHCP on 67/68). Layers 5\u20137 blur into 'the application': ssh, DNS.", "Each layer gift-wraps the one above on the way down: data \u2192 segment \u2192 packet \u2192 frame \u2192 bits. Those PDU names are exam currency. And the diagnostic habit that makes this practical: climb ONE layer at a time — link light (L1), then ARP/VLAN (L2), then routing (L3), then the service (L4+)."]
    },
    nums: [
      ["L1 bits", "Cables and optics — a dying cable's CRC errors live here"],
      ["L2 frames \u00b7 MAC", "Switching, VLANs, LACP, RSTP — one broadcast domain per VLAN"],
      ["L3 packets \u00b7 IP", "Routing, OSPF, BGP path logic, ICMP ping"],
      ["L4 segments \u00b7 ports", "TCP (connections, BGP:179) vs UDP (fire-and-forget, DHCP:67/68)"],
      ["PDU chain", "data \u2192 segment \u2192 packet \u2192 frame \u2192 bits — each layer wraps the last"],
      ["switch vs router", "Switch = L2 device (frames/MACs); router = L3 (packets/IPs) — the exam's favorite one-liner"]
    ],
    verify: [
      ["your own tickets", "Practice the sentence: 'ping fails but ARP resolves' \u2192 which layer? 'link light off' \u2192 which layer?"],
      ["this lab's tabs", "Sort the protocol guides by layer from memory — LACP, VLAN, RSTP are L2; DIA, OSPF, BGP, DHCP are L3/L4 stories"]
    ],
    breaks: [
      "Calling everything 'the network is down' — layerless diagnosis is why tickets bounce between teams.",
      "Mixing up MAC (L2, local, flat) and IP (L3, routed, hierarchical) — frames are delivered by MAC inside a subnet, packets by IP between them.",
      "Forgetting a VLAN is a broadcast domain — 'why doesn't DHCP cross VLANs' is an L2-boundary question you've already answered in the DHCP guide.",
      "Placing BGP at layer 3 — the protocol MANAGES L3 routes but SPEAKS over TCP at layer 4. Exam trap."
    ],
    answer: "OSI is the shared map: physical bits on layer 1, frames and MAC addresses on layer 2 where switches, VLANs and spanning tree live, IP packets and routing on layer 3, and TCP or UDP transport on layer 4 — with each layer encapsulating the one above as data, segment, packet, frame, bits. Its practical value is diagnostic: a link light is L1, ARP and VLANs are L2, a routing problem is L3, a refused connection is L4 upward — naming the layer is naming the team and the tool that fixes it.",
    quiz: [
      { q: "Hosts in the same VLAN can't ping each other, but both have link lights and correct IPs. Highest layer proven working?",
        opts: ["Layer 3 — IP is configured", "Layer 1 — the cables carry bits; everything above is suspect", "Layer 4"],
        right: 1,
        why: "A link light proves physical only. Configured IPs prove nothing about delivery. Next suspect up the stack is L2 — same VLAN really? MAC learning? A filter? Climb one layer at a time." },
      { q: "BGP operates at which layer?",
        opts: ["Layer 3 — it's a routing protocol", "It manages L3 routes but runs over TCP at layer 4", "Layer 2"],
        right: 1,
        why: "The classic trap. BGP's PAYLOAD is layer-3 routing information, but the protocol itself is a TCP application on port 179 — which is exactly why 'no TCP reachability, no BGP session' was the rule in the BGP guide." },
      { q: "One broadcast domain equals...",
        opts: ["One switch", "One VLAN", "One cable"],
        right: 1,
        why: "A switch can host many broadcast domains (one per VLAN), and one VLAN can span many switches over trunks. The VLAN is the wall a broadcast cannot cross — routers (or irb interfaces) are the doors." },
    ],
  },
  {
    id: "maintenance",
    title: "System Maintenance — users, rescue & the file system",
    tag: "JNCIA \u00b7 maintenance",
    ready: true,
    problem: {
      text: ["The unglamorous exam domain that saves real careers: who can log in, what happens when a config change goes wrong at a remote site, and why upgrades fail on full disks.", "Junos has an answer for each — login classes for access, the rescue config as your known-good parachute, and a file system you can actually inspect and clean. None of it is hard; all of it is asked."],
      svg: "maint-problem"
    },
    how: {
      text: ["ACCESS: every account gets a login CLASS bundling its permissions. Four built-ins to memorize: super-user (everything), operator (reset things, no config), read-only (look, don't touch), unauthorized (nothing). Root is special — set its password with root-authentication, and note root logs into the SHELL first, then starts cli.", "THE PARACHUTE: request system configuration rescue save snapshots your current active config as the rescue config. Weeks later, when a bad change strands a remote box, rollback rescue loads that snapshot into the candidate — commit, and you're back to known-good. Pair it with commit confirmed (scenario 11) for remote changes: belt AND suspenders.", "THE FILE SYSTEM: configs live in /config — the active one plus rollbacks as juniper.conf.N.gz, and rescue.conf.gz if you made one. /var/tmp collects install bundles and junk. Before ANY software upgrade: request system storage cleanup — a full /var is the classic upgrade killer, and the exam knows it."]
    },
    prereqs: [
      { desc: "An admin account committed with a login class (system login user ...)",
        test: function(){ return typeof devsBy === "function" && devsBy("switch").concat(devsBy("router")).some(function(d){
          var u = cfgGet(d.config, ["system", "login", "user"]) || {};
          return Object.keys(u).some(function(name){ return u[name] && u[name].class; }); }); } },
      { desc: "Root password set (system root-authentication)",
        test: function(){ return devsBy("switch").concat(devsBy("router")).some(function(d){
          return !!cfgGet(d.config, ["system", "root-authentication"]); }); } },
      { desc: "A rescue configuration saved (request system configuration rescue save)",
        test: function(){ return devsBy("switch").concat(devsBy("router")).some(function(d){ return !!d.rescueConfig; }); } },
      { desc: "Prove the parachute: make a bad change, commit, rollback rescue, commit — back to known-good",
        test: function(){ return devsBy("switch").concat(devsBy("router")).some(function(d){
          return d.rescueConfig && JSON.stringify(d.config) === JSON.stringify(d.rescueConfig) && (d.cfgHistory || []).length >= 2; }); } },
    ],
    try: [
      ["file list", "Walk the file system — active config, rollbacks, rescue, /var/tmp junk"],
      ["request system configuration rescue save", "Save the parachute (do this on a device you've configured)"],
      ["request system storage cleanup", "The pre-upgrade ritual — watch what it removes"]
    ],
    cfg: [
      ["set system login user kaatje class super-user", "An admin account — class decides ALL its permissions"],
      ["set system login user kaatje authentication plain-text-password Nets4Days!", "Junos stores it hashed, never plaintext"],
      ["set system root-authentication plain-text-password RootPw9!", "Root's password — commit refuses on a factory box until this is set"],
      ["commit", "Then save the parachute: run request system configuration rescue save"]
    ],
    nums: [
      ["super-user / operator / read-only / unauthorized", "The four built-in login classes, in descending power — memorize the order"],
      ["rollback 0\u201349", "0 = discard candidate edits, 1\u201349 = previous commits, rescue = your saved snapshot"],
      ["/config", "Where juniper.conf.gz and the rollback files live"],
      ["/var/tmp", "Where old bundles pile up — storage cleanup's hunting ground"],
      ["shell \u2192 cli", "Root lands in the shell (%) and must type cli — a classic exam question"]
    ],
    els: [
      ["(identical on legacy and current code)", "System maintenance predates the ELS split entirely"]
    ],
    real: [
      "Your EX4300 refuses its very first commit until root-authentication is set — factory behavior the lab's fresh boxes mirror.",
      "Do the rescue-save on the real bench switch too: one bad VLAN commit at OOST1 and rollback rescue is a two-command fix instead of a site visit.",
      "Real upgrades: storage cleanup FIRST, then request system software add — and never over a wobbly power feed."
    ],
    verify: [
      ["show system commit + file list", "History and files — see your commits become juniper.conf.N.gz"],
      ["rollback rescue, then show | compare", "Preview exactly what restoring the parachute would change BEFORE committing it"],
      ["log in as the new user (ssh)", "Classes are only real when tested — read-only should fail at configure"]
    ],
    breaks: [
      "No rescue config saved — rollback rescue has nothing to load. The parachute must be packed BEFORE the jump.",
      "Wrong class handed out — an operator can bounce interfaces but a careless super-user can delete the config. Least privilege.",
      "Upgrading onto a full /var — the install dies halfway. Cleanup first, always.",
      "Confusing rollback 1 (previous commit) with rollback rescue (your chosen known-good) — history moves, the rescue doesn't.",
      "Setting root-authentication but forgetting commit confirmed on remote changes — rescue saves the config, confirmed saves the SESSION."
    ],
    answer: "Junos maintenance is three habits. Access control through login classes — super-user, operator, read-only, unauthorized — so every account has exactly the power it needs, with root set through root-authentication. A rescue configuration saved with request system configuration rescue save, so any box can return to known-good with rollback rescue plus a commit. And file-system hygiene: configs and rollbacks live in /config, junk accumulates in /var/tmp, and request system storage cleanup runs before every upgrade because a full /var is the standard upgrade failure.",
    quiz: [
      { q: "A remote site's switch got a bad config change three weeks of commits ago. Fastest safe recovery?",
        opts: ["rollback 1 and hope", "rollback rescue, review show | compare, commit", "Factory reset"],
        right: 1,
        why: "rollback 1 only steps back ONE commit — the damage is 20 commits deep. The rescue config is the snapshot YOU chose as known-good; load it, preview the diff, commit. That's exactly what it exists for." },
      { q: "An account that may restart daemons and clear sessions but never change configuration gets class...",
        opts: ["super-user", "operator", "read-only"],
        right: 1,
        why: "operator = operational actions without configuration rights. read-only can't act at all; super-user can do everything. The four built-ins in descending power: super-user, operator, read-only, unauthorized." },
      { q: "A Junos software upgrade fails midway with a storage error. What was skipped?",
        opts: ["A reboot", "request system storage cleanup before starting", "Setting the root password"],
        right: 1,
        why: "The install bundle needs room in /var, and old bundles plus unrotated logs eat it. Cleanup before upgrade is the ritual — the exam and every field engineer agree on this one." },
      { q: "You log in as root on a fresh EX and see a % prompt instead of >. What now?",
        opts: ["The switch is broken", "Type cli — root lands in the shell first", "Reboot"],
        right: 1,
        why: "Root logs into the underlying shell (%). Typing cli starts the Junos CLI (>). Everyone hits this once on real hardware; the exam makes sure you hit it on paper first." },
    ],
  },
  {
    id: "vrrp",
    title: "VRRP — Gateway Redundancy",
    tag: "L3 · redundancy",
    ready: true,
    problem: {
      text: ["Every host on a subnet points at ONE default gateway address. Hard-code it in DHCP, put it on three hundred machines, and you have created a single point of failure with three hundred victims.",
             "Replace that router and everyone is offline until you touch every client. Unacceptable in a datacenter.",
             "VRRP solves it by lying, elegantly: two routers share ONE virtual address. Hosts point at the virtual address forever and never learn which physical router is actually answering."],
      svg: "vrrp-problem"
    },
    how: {
      text: ["Both routers join a VRRP group and advertise the same virtual IP. They compare PRIORITY (default 100, higher wins; identical priorities break the tie on the higher real address) and elect one MASTER. Only the master answers ARP for the virtual address and forwards traffic sent to it.",
             "The backup sits silent, listening for the master's advertisements. When those stop — dead link, dead router, dead RE — the backup promotes itself within seconds and starts answering for the same virtual address. Hosts notice nothing: same gateway IP, same ARP entry, new hardware behind it.",
             "PREEMPT decides what happens when the old master returns: with preempt the higher-priority router takes mastership back, without it the current master keeps the job to avoid a second disruption. Both are defensible — know which one you configured."]
    },
    prereqs: [
      { desc: "Two routers cabled to the same switch (the shared segment)",
        test: function(){ return typeof devsBy === "function" && devsBy("router").filter(function(r){
          return Object.values(links).some(function(l){
            return (l.a.dev === r.id && devices[l.b.dev] && devices[l.b.dev].type === "switch") ||
                   (l.b.dev === r.id && devices[l.a.dev] && devices[l.a.dev].type === "switch"); }); }).length >= 2; } },
      { desc: "Both routers have a VRRP group with the SAME virtual address",
        test: function(){ if(typeof NET === "undefined" || !NET.vrrp) return false;
          return Object.keys(NET.vrrp).some(function(k){ return NET.vrrp[k].members.length >= 2; }); } },
      { desc: "One router is elected master, the other is backup",
        test: function(){ if(typeof NET === "undefined" || !NET.vrrp) return false;
          return Object.keys(NET.vrrp).some(function(k){
            var g = NET.vrrp[k];
            return g.master && g.members.some(function(m){ return m.state === "backup"; }); }); } },
      { desc: "A host uses the VIRTUAL address as its gateway and can ping it",
        test: function(){ if(typeof NET === "undefined" || !NET.vrrp) return false;
          var vips = Object.keys(NET.vrrp).map(function(k){ return NET.vrrp[k].vip; });
          return devsBy("host").some(function(h){
            if(!h.cfg || !h.cfg.gw || vips.indexOf(h.cfg.gw) === -1) return false;
            try{ return pingOk(h, h.cfg.gw); }catch(e){ return false; } }); } },
    ],
    try: [
      ["show vrrp", "Who is master right now, and at what priority"]
    ],
    cfg: [
      ["set interfaces ge-0/0/0 unit 0 family inet address 10.0.10.2/24", "The router's OWN address — each router keeps a unique real one"],
      ["set interfaces ge-0/0/0 unit 0 family inet address 10.0.10.2/24 vrrp-group 10 virtual-address 10.0.10.1", "The shared gateway address hosts will point at"],
      ["set interfaces ge-0/0/0 unit 0 family inet address 10.0.10.2/24 vrrp-group 10 priority 200", "Higher priority wins the election — this router becomes master"],
      ["commit", "Then repeat on the second router with ITS own address, the SAME virtual-address, and a lower priority"]
    ],
    nums: [
      ["100", "Default priority — higher wins the election"],
      ["255", "Reserved for the router that literally owns the virtual address as its real one"],
      ["1 s", "Default advertisement interval"],
      ["3 missed adverts", "Roughly when a backup declares the master dead and promotes itself"],
      ["preempt / no preempt", "Whether a returning higher-priority router takes mastership back"]
    ],
    els: [
      ["(VRRP syntax is the same on legacy and ELS code)", "It lives under the interface address, not the switching stanza that ELS renamed"]
    ],
    real: [
      "On real gear you would pair VRRP with a tracked interface: if the router's UPLINK dies, drop its priority so it hands mastership over instead of becoming a black hole.",
      "Bench test worth doing: ping the VIP continuously, then pull the master's cable. Count how many pings you lose — that number is your real-world failover window."
    ],
    verify: [
      ["show vrrp", "State column: exactly one master per group. Two masters means the routers cannot hear each other — a VLAN or trunk problem, not a VRRP problem"],
      ["ping the virtual address from a host", "The real test — hosts must reach the VIP, not just the routers' own addresses"],
      ["disable the master's interface, ping again", "The proof: mastership moves and traffic survives. If the ping dies, the backup never took over"]
    ],
    breaks: [
      "The two routers are not actually on the same L2 segment — different VLANs, or a trunk not carrying the VLAN. Both then think they are alone and BOTH become master.",
      "Hosts pointed at a router's REAL address instead of the virtual one — redundancy exists and protects nobody.",
      "Mismatched virtual addresses between the two routers — two separate groups of one, both master, no redundancy.",
      "No interface tracking on real gear: the master keeps mastership after losing its own uplink, and cheerfully blackholes everything.",
      "Forgetting preempt is off and wondering why the powerful router stayed backup after a reboot."
    ],
    answer: "VRRP lets two routers share one virtual gateway address so hosts never have to care which physical router is alive. They elect a master by priority — higher wins, default 100 — and only the master answers ARP for the virtual address; the backup listens for advertisements and promotes itself within seconds when they stop. Hosts keep the same gateway IP throughout, which is why it protects a whole subnet without touching a single client. To verify I check show vrrp for exactly one master, ping the virtual address from a host, then fail the master's link and prove the ping survives.",
    quiz: [
      { q: "Both routers in a VRRP group report themselves as master. Most likely cause?",
        opts: ["Priorities are identical", "They cannot hear each other — no shared L2 path (VLAN or trunk problem)", "Preempt is disabled"],
        right: 1,
        why: "VRRP elects a master by exchanging advertisements over a shared segment. If those never arrive, each router concludes it is alone and takes the role. Identical priorities would still elect one winner on the address tiebreak. This is an L2 problem wearing an L3 costume." },
      { q: "Hosts are configured with the gateway 10.0.10.2, which is router A's real address. VRRP is running with virtual address 10.0.10.1. Router A dies. What happens?",
        opts: ["VRRP fails over, hosts stay online", "Hosts go offline — they were never pointed at the virtual address", "Router B adopts 10.0.10.2"],
        right: 1,
        why: "The whole mechanism depends on hosts using the VIRTUAL address. Pointed at a real address, they follow that specific router into the grave. Redundancy configured but not used is the most expensive kind of nothing." },
      { q: "Why does a VRRP master typically also track its uplink interface?",
        opts: ["To speed up failover", "So losing its own path upstream lowers its priority and hands mastership over instead of blackholing traffic", "It is required by the protocol"],
        right: 1,
        why: "Without tracking, a router whose uplink died still wins the election on the LAN side and keeps attracting traffic it can no longer forward. Tracking ties mastership to actually being useful." },
    ],
  },
  {
    id: "ecmp",
    title: "ECMP — Load Balancing Across Paths",
    tag: "L3 · load sharing",
    ready: true,
    problem: {
      text: ["You bought two links to the same destination. Without help, routing picks ONE best path and the second sits idle — paid for, racked, powered, doing nothing until the first one dies.",
             "ECMP (Equal-Cost Multi-Path) uses both at once. When two routes to the same prefix have equal cost, the router installs BOTH and shares traffic across them.",
             "This is load balancing at layer 3, and together with LACP at layer 2 it is how datacenter fabrics use every link they own instead of half of them."],
      svg: "ecmp-problem"
    },
    how: {
      text: ["Two routes qualify as equal-cost when they have the same prefix length AND the same protocol preference. Same destination, same specificity, same trust level — no reason to prefer one, so use both.",
             "Traffic is split per FLOW, not per packet. The router hashes fields from the packet (source and destination, typically) and that hash picks the path. Every packet of the same conversation therefore takes the same link, which keeps them in order — out-of-order packets wreck TCP performance, so this matters.",
             "The consequence surprises people: one big file transfer does NOT get double bandwidth, because it is one flow on one link. ECMP scales across MANY conversations, not within one. That is the honest answer to the interview question."]
    },
    prereqs: [
      { desc: "A router with two equal-cost routes to the same destination",
        test: function(){ return typeof devsBy === "function" && devsBy("router").some(function(r){
          var seen = {};
          return (D(r).routes || []).some(function(rt){
            var key = rt.net + "/" + rt.bits;
            if(seen[key] && seen[key] !== rt.nh) return true;
            seen[key] = rt.nh; return false; }); }); } },
      { desc: "Both next-hops are reachable (each has an interface in its subnet)",
        test: function(){ if(typeof NET === "undefined") return false;
          return devsBy("router").some(function(r){
            var byPrefix = {};
            (D(r).routes || []).forEach(function(rt){
              var key = rt.net + "/" + rt.bits;
              (byPrefix[key] = byPrefix[key] || []).push(rt.nh); });
            return Object.keys(byPrefix).some(function(k){
              var nhs = byPrefix[k];
              if(nhs.length < 2) return false;
              var ifs = ifacesOf(r).filter(function(i){ return i.up; });
              return nhs.every(function(nh){ return ifs.some(function(i){ return sameSubnet(nh, i.ip, i.bits); }); }); }); }); } },
      { desc: "Traffic actually resolves over the multi-path route (a ping succeeds through it)",
        test: function(){ return devsBy("router").some(function(r){
          var byPrefix = {};
          (D(r).routes || []).forEach(function(rt){
            var key = rt.net + "/" + rt.bits;
            (byPrefix[key] = byPrefix[key] || []).push(rt.nh); });
          return Object.keys(byPrefix).some(function(k){
            if(byPrefix[k].length < 2) return false;
            var net = k.split("/")[0];
            var probe = net.replace(/\.0$/, ".1");
            try{ var res = routeLookup(r, probe); return !!(res && res.ecmp && res.ecmp.length >= 2); }catch(e){ return false; } }); }); } },
    ],
    try: [
      ["show route", "Look for a prefix with more than one next-hop listed — that is ECMP installed"]
    ],
    cfg: [
      ["set routing-options static route 10.50.0.0/24 next-hop 10.0.1.2", "First path to the destination"],
      ["set routing-options static route 10.50.0.0/24 next-hop 10.0.2.2", "Second path, same prefix, same preference — now they are equal-cost"],
      ["commit", "Both next-hops install; traffic hashes across them per flow"]
    ],
    nums: [
      ["equal prefix + equal preference", "The two conditions that make paths equal-cost"],
      ["per-flow", "How traffic is split — not per-packet, to keep packets in order"],
      ["1 flow = 1 link", "Why a single transfer never exceeds one link's bandwidth"],
      ["L2 vs L3", "LACP load-balances a bundle of cables; ECMP load-balances routed paths"]
    ],
    els: [
      ["(ECMP is routing, untouched by the ELS split)", "Real Junos also needs a load-balance export policy to use all next-hops in forwarding — the lab installs them directly"]
    ],
    real: [
      "On real Junos, installing multiple next-hops in the ROUTING table is not enough — you also apply a per-packet load-balance policy to the FORWARDING table, or the PFE still uses only one. This lab skips that step; the exam does not.",
      "Datacenter fabrics (spine-leaf) are built almost entirely on ECMP — every leaf reaches every spine at equal cost, which is exactly how the fabric scales."
    ],
    verify: [
      ["show route <destination>", "Multiple next-hops under one prefix means ECMP is installed"],
      ["ping from several different sources", "Different flows hash to different paths — that is the load sharing working"],
      ["disable one path, ping again", "Traffic should continue on the survivor — ECMP is redundancy as well as capacity"]
    ],
    breaks: [
      "Routes are not actually equal — different prefix lengths mean longest-match wins and only one path is ever used.",
      "Different protocols for the same prefix (a static plus an OSPF route) — preference decides, no load sharing.",
      "Expecting one download to saturate both links — per-flow hashing puts one conversation on one path, always.",
      "On real gear: forgetting the forwarding-table load-balance policy, so the routing table shows two next-hops while the PFE quietly uses one."
    ],
    answer: "ECMP installs multiple next-hops for the same prefix when the routes are equal cost — same prefix length and same preference — so both links carry traffic instead of one sitting idle. The split is per flow, hashed on source and destination, so packets of a conversation stay in order and a single transfer never exceeds one link's bandwidth; the gain is across many flows. It is the layer-3 counterpart to LACP at layer 2, and it is what lets spine-leaf datacenter fabrics use every path they have. On real Junos the routing table holds both next-hops but a forwarding-table load-balance policy is needed for the hardware to actually use them.",
    quiz: [
      { q: "You enable ECMP across two 1 Gbps links and copy one large file. What throughput do you expect?",
        opts: ["2 Gbps — both links combine", "About 1 Gbps — one flow hashes onto one link", "500 Mbps"],
        right: 1,
        why: "Per-flow hashing keeps a conversation on a single path to preserve packet order. ECMP multiplies capacity across many flows, never within one. This exact question separates people who have read about ECMP from people who have run it." },
      { q: "Two routes to 10.50.0.0/24: one static (preference 5), one OSPF (preference 10). Does ECMP engage?",
        opts: ["Yes — same prefix", "No — unequal preference means the static simply wins", "Only if you enable it"],
        right: 1,
        why: "Equal-cost requires BOTH equal prefix length and equal preference. Different preferences mean a clear winner, so the router installs one path and ignores the other." },
      { q: "How do ECMP and LACP relate?",
        opts: ["They are the same thing at different names", "LACP load-balances physical cables at layer 2; ECMP load-balances routed paths at layer 3", "ECMP replaces LACP"],
        right: 1,
        why: "Both share load and both survive a failure, but at different layers: LACP bundles cables between two devices into one logical link, ECMP spreads routed traffic across independent paths that may cross entirely different devices." },
    ],
  },
  {
    id: "lldp",
    title: "LLDP — Neighbor Discovery",
    tag: "L2 · operations",
    ready: true,
    problem: {
      text: ["It is 2 AM, you are remote, and you need to know what is plugged into ge-0/0/17. The alternatives are walking to the rack, trusting a cable label written in 2019, or trusting a spreadsheet.",
             "LLDP asks the neighbour directly. Every participating device announces itself on every port — name, port, capabilities — and every device remembers what it heard.",
             "It is the single most useful operational command for anyone who inherits someone else's cabling."],
      svg: "lldp-problem"
    },
    how: {
      text: ["LLDP (Link Layer Discovery Protocol, IEEE 802.1AB) is vendor-neutral, unlike Cisco's CDP. Each device periodically sends a frame out every enabled port containing its system name, the port it is sending from, and what it can do.",
             "These frames never cross a switch — they are link-local by design, so a neighbour entry always means a DIRECT cable. That is exactly what makes it trustworthy for cable tracing: if it shows up as a neighbour, it is physically plugged in.",
             "Endpoints usually stay silent (a PC runs no LLDP daemon), so an empty entry does not always mean a dead cable — it may just be a device that does not speak. LLDP-MED extends it for phones and APs to negotiate power and VLAN automatically."]
    },
    prereqs: [
      { desc: "Two switches or routers cabled together",
        test: function(){ return Object.values(links).some(function(l){
          var a = devices[l.a.dev], b = devices[l.b.dev];
          return a && b && (a.type === "switch" || a.type === "router") && (b.type === "switch" || b.type === "router"); }); } },
      { desc: "A neighbour is visible (run show lldp neighbors)",
        test: function(){ return Object.values(links).some(function(l){
          var a = devices[l.a.dev], b = devices[l.b.dev];
          return a && b && (a.type === "switch" || a.type === "router") && (b.type === "switch" || b.type === "router") &&
                 l.kind !== "console" && NET.linkStatus && NET.linkStatus[Object.keys(links).find(function(k){ return links[k] === l; })] === "up"; }); } },
      { desc: "At least two network devices are powered and configured with host-names (so neighbours identify themselves)",
        test: function(){ return devsBy("switch").concat(devsBy("router")).filter(function(d){
          return d.powered !== false && cfgGet(d.config, ["system", "host-name"]); }).length >= 2; } },
    ],
    try: [
      ["show lldp neighbors", "The cable-tracing command — who is on the other end of each port"]
    ],
    cfg: [
      ["set system host-name core-1", "Give the device a name — this is what neighbours will SEE in their LLDP table"],
      ["set protocols lldp interface all", "Run LLDP on every interface (this lab has it on by default; real switches often need it stated)"],
      ["commit", "Then from the neighbour: show lldp neighbors — your new host-name should appear"]
    ],
    nums: [
      ["30 s", "Default advertisement interval"],
      ["120 s", "Default hold time before a stale neighbour is dropped"],
      ["802.1AB", "The IEEE standard — vendor-neutral, unlike CDP"],
      ["link-local", "LLDP frames never cross a switch, so a neighbour is always directly cabled"]
    ],
    els: [
      ["(LLDP predates the ELS split and is unchanged)", "Runs under protocols lldp on both old and current code"]
    ],
    real: [
      "This is the command to run FIRST when you inherit an undocumented rack — it builds your topology map faster than any spreadsheet.",
      "On your bench EX4300, compare show lldp neighbors against the physical cables: the moment they disagree, you have found either a mislabelled cable or a patch-panel surprise."
    ],
    verify: [
      ["show lldp neighbors", "System name and port of whatever is directly cabled to each interface"],
      ["compare against the cable labels", "Where LLDP and the labels disagree, LLDP is right"],
      ["unplug a cable and check again", "The entry should disappear after the hold time — proof it reflects reality, not memory"]
    ],
    breaks: [
      "Expecting neighbours for PCs and servers — most endpoints do not run LLDP, so silence is normal there.",
      "Trusting an entry that has gone stale — they persist for the hold time after a cable is pulled.",
      "Assuming a neighbour means a working data path — LLDP can be fine while the VLAN configuration makes the link useless for traffic.",
      "Looking for CDP output on a Juniper box — wrong vendor's protocol."
    ],
    answer: "LLDP is the vendor-neutral neighbour discovery protocol: every device advertises its name, port and capabilities out each interface, and each device stores what it hears. Because the frames are link-local and never cross a switch, a neighbour entry always means a direct physical cable, which makes show lldp neighbors the fastest way to map an undocumented rack or confirm what is really plugged into a port. Endpoints often stay silent since they run no LLDP daemon, and entries persist for a hold time after a cable is pulled, so it maps cabling rather than guaranteeing a working data path.",
    quiz: [
      { q: "show lldp neighbors is empty for the port your PC is plugged into. What does that prove?",
        opts: ["The cable is dead", "Very little — most PCs do not run LLDP at all", "The port is disabled"],
        right: 1,
        why: "LLDP requires both ends to participate. Network gear speaks it; ordinary endpoints usually do not. Absence of a neighbour is not evidence of a problem on a host port." },
      { q: "Why can an LLDP neighbour entry be trusted to mean a DIRECT cable?",
        opts: ["It includes a cable serial number", "LLDP frames are link-local — switches do not forward them", "It is verified by the routing protocol"],
        right: 1,
        why: "The frames are deliberately never forwarded beyond the link. So if you see a neighbour, there is a cable between you and it, with nothing in between." },
      { q: "You see an LLDP neighbour on a port, but no traffic passes. Contradiction?",
        opts: ["Yes, LLDP proves the link works", "No — LLDP proves physical adjacency, not correct VLAN or L3 configuration", "Yes, restart the port"],
        right: 1,
        why: "LLDP operates below the configuration that carries user traffic. A perfectly cabled link with the wrong VLAN membership shows a healthy neighbour and moves no data. It maps cabling, not correctness." },
    ],
  },
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
    '<text x="135" y="105" fill="var(--red)">= loop = broadcast storm</text>' +
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
  if(kind === "arch-problem") return open +
    box(60, 25, 200, "ROUTING ENGINE (brain)") +
    '<text x="160" y="75" fill="var(--dim)">mgd \u00b7 rpd \u00b7 dcd \u00b7 chassisd</text>' +
    box(60, 95, 200, "PFE (muscle)") +
    '<line x1="160" y1="55" x2="160" y2="95" stroke="var(--amber)" stroke-width="2"/>' +
    '<text x="230" y="80" fill="var(--amber)">forwarding table \u2193</text>' +
    '<line x1="20" y1="110" x2="60" y2="110" stroke="var(--green)" stroke-width="2"/>' +
    '<line x1="260" y1="110" x2="300" y2="110" stroke="var(--green)" stroke-width="2"/>' +
    '<text x="160" y="145" fill="var(--green)">transit traffic crosses the PFE only</text>' +
    '<line x1="380" y1="120" x2="380" y2="45" stroke="var(--blue)" stroke-width="2" stroke-dasharray="5 3"/>' +
    '<text x="452" y="80" fill="var(--blue)">your ssh / ping to the box</text>' +
    '<text x="452" y="98" fill="var(--blue)">= exception traffic \u2192 RE</text>' + close;
  if(kind === "filters-problem") return open +
    box(30, 55, 110, "FILTER") +
    '<text x="85" y="40" fill="var(--dim)">eats PACKETS</text>' +
    '<text x="85" y="110" fill="var(--red)">guest \u2192 mgmt \u2715</text>' +
    box(420, 55, 110, "POLICY") +
    '<text x="475" y="40" fill="var(--dim)">eats ROUTES</text>' +
    '<text x="475" y="110" fill="var(--red)">don\u2019t advertise 10/8 \u2715</text>' +
    '<text x="280" y="60" fill="var(--text)">same term / from / then grammar</text>' +
    '<text x="280" y="80" fill="var(--amber)">different victims</text>' + close;
  if(kind === "subnet-problem") return open +
    '<text x="280" y="30" fill="var(--text)" font-size="13">192.168.10.130 /26</text>' +
    '<rect x="60" y="50" width="110" height="26" rx="4" fill="none" stroke="var(--line)"/>' +
    '<rect x="170" y="50" width="110" height="26" rx="4" fill="none" stroke="var(--line)"/>' +
    '<rect x="280" y="50" width="110" height="26" rx="4" fill="none" stroke="var(--green)" stroke-width="2"/>' +
    '<rect x="390" y="50" width="110" height="26" rx="4" fill="none" stroke="var(--line)"/>' +
    '<text x="115" y="67">.0</text><text x="225" y="67">.64</text>' +
    '<text x="335" y="67" fill="var(--green)">.128 \u2190 .130 lives here</text>' +
    '<text x="445" y="67">.192</text>' +
    '<text x="280" y="100" fill="var(--amber)">magic number: 256 \u2212 192 = 64 \u2192 blocks of 64</text>' +
    '<text x="280" y="125" fill="var(--green)">.130 \u2192 block .128: net .128 \u00b7 bcast .191 \u00b7 62 hosts</text>' + close;
  if(kind === "osi-problem") return open +
    '<g text-anchor="start" font-size="10.5">' +
    '<text x="40" y="30" fill="var(--dim)">L4 segments</text><text x="150" y="30" fill="var(--text)">TCP/UDP \u2014 BGP:179, DHCP:67/68</text>' +
    '<text x="40" y="55" fill="var(--dim)">L3 packets</text><text x="150" y="55" fill="var(--text)">IP \u00b7 routing \u00b7 OSPF \u00b7 ping</text>' +
    '<text x="40" y="80" fill="var(--dim)">L2 frames</text><text x="150" y="80" fill="var(--text)">MAC \u00b7 VLANs \u00b7 LACP \u00b7 RSTP</text>' +
    '<text x="40" y="105" fill="var(--dim)">L1 bits</text><text x="150" y="105" fill="var(--text)">cables \u00b7 optics \u00b7 CRC errors</text>' +
    '<text x="40" y="135" fill="var(--amber)">diagnosis = climbing this ladder one layer at a time</text>' +
    '</g>' + close;
  if(kind === "maint-problem") return open +
    box(40, 30, 150, "login classes") +
    '<text x="115" y="80" fill="var(--dim)">who may do what</text>' +
    box(205, 30, 150, "rescue config") +
    '<text x="280" y="80" fill="var(--green)">the parachute</text>' +
    box(370, 30, 150, "file system") +
    '<text x="445" y="80" fill="var(--dim)">/config \u00b7 /var/tmp</text>' +
    '<text x="280" y="120" fill="var(--amber)">boring on paper \u00b7 priceless at 3 AM at a remote site</text>' + close;
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
  vrrp: { need: "Cable two routers to the same switch first.", run: function(){
    var lk = protoFindLink("router", "switch");
    if(!lk) return false;
    protoVolley([
      { p: [lk.pa, lk.pb], label: "VRRP advert: I am master, priority 200" },
      { p: [lk.pb, lk.pa], label: "backup listens, stays silent" },
    ], "one virtual address, two routers");
    return true;
  } },
  ecmp: { need: "Cable a router to another router first.", run: function(){
    var lk = protoFindLink("router", "router");
    if(!lk) return false;
    protoVolley([
      { p: [lk.pa, lk.pb], label: "flow A hashes to path 1" },
      { p: [lk.pa, lk.pb], label: "flow B hashes to path 2" },
    ], "both links carrying, per flow");
    return true;
  } },
  lldp: { need: "Cable two switches or routers together first.", run: function(){
    var lk = protoFindLink("switch", "switch") || protoFindLink("router", "switch");
    if(!lk) return false;
    protoVolley([
      { p: [lk.pa, lk.pb], label: "LLDP: I am sw-1, port ge-0/0/1" },
      { p: [lk.pb, lk.pa], label: "LLDP: I am sw-2, port ge-0/0/1" },
    ], "neighbours discovered");
    return true;
  } },
};
var PROTO_GLOW_TYPES = {
  lacp: ["switch"], vlan: ["switch"], rstp: ["switch"],
  dia: ["router", "isp"], dhcp: ["switch", "host"],
  ospf: ["router"], bgp: ["router", "isp"],
  filters: ["switch", "router"], maintenance: ["switch", "router"],
  vrrp: ["router"], ecmp: ["router"], lldp: ["switch", "router"],
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
  protoEl("p", "pg-list-sub", box, "One topic per page, always the same shape: the problem, how it works, what must be true first, how to prove it, what breaks it — and the answer you'd give out loud.");
  var exam = protoEl("div", "pg-exam-map", box);
  protoEl("b", null, exam, "JNCIA-Junos coverage map");
  [
    ["Junos OS fundamentals", "junos-arch guide + show system processes on any device"],
    ["CLI & configuration basics", "the whole lab — plus commit/rollback in scenarios 4\u20135 and show system commit"],
    ["Operational monitoring", "show commands everywhere; counters + gremlin hunts (Lab menu)"],
    ["Routing fundamentals", "OSPF + BGP guides, static routes in the DIA guide, route preference in the numbers"],
    ["Routing policy & firewall filters", "filters guide — with a live build-and-block exercise"],
    ["Networking fundamentals", "OSI guide + the subnetting drill"],
  ].forEach(function(r){
    var row = protoEl("div", "pg-exam-row", exam);
    protoEl("span", "pg-exam-dom", row, r[0]);
    protoEl("span", null, row, r[1]);
  });
  if(typeof courseDomainStats === "function"){
    var st = courseDomainStats();
    var rd = protoEl("div", "pg-exam-ready", exam);
    Object.keys(st).forEach(function(dom){
      var d = st[dom];
      var chip = protoEl("span", "pg-ready-chip" + (d.done >= d.total ? " pg-ready-done" : ""), rd,
        dom.split(" ")[0] + " " + d.done + "/" + d.total);
      chip.title = dom;
    });
  }
  var groups = [
    ["Exam fundamentals", PROTO_GUIDES.filter(function(g){ return /JNCIA/.test(g.tag); })],
    ["Protocols", PROTO_GUIDES.filter(function(g){ return !/JNCIA/.test(g.tag); })],
  ];
  groups.forEach(function(gr){
    protoEl("div", "pg-group-h", box, gr[0]);
    gr[1].forEach(function(g){
    var card = protoEl("div", "pg-card" + (g.ready ? "" : " pg-card-soon"), box);
    var top = protoEl("div", "pg-card-top", card);
    protoEl("b", null, top, g.title);
    protoEl("span", "pg-tag", top, g.tag);
    var firstSentence = function(t){
      var s2 = Array.isArray(t) ? (t[0] || "") : t;
      return s2.split(". ")[0] + ".";
    };
    protoEl("div", "pg-card-body", card, g.ready ? firstSentence(g.problem.text) : g.teaser);
    if(g.ready){
      card.onclick = function(){ protoView = { page: "guide", guide: g }; renderProtoTab(); };
    } else {
      protoEl("div", "pg-soon", card, "coming soon");
    }
    });
  });
}

function renderProtoGuide(box, g){
  var back = protoEl("button", "pg-back", box, "\u25c2 All protocols");
  back.onclick = function(){ protoStopTimer(); protoView = { page: "list", guide: null }; renderProtoTab(); };
  protoEl("h3", "pg-title", box, g.title);
  var n = 0;
  var TIER_GLYPH = {
    lead: '<svg viewBox="0 0 14 14"><path d="M2 3.5 Q7 1.5 12 3.5 L12 11 Q7 9.5 2 11 Z" fill="none" stroke="currentColor" stroke-width="1"/><path d="M7 2.2 L7 10.2" stroke="currentColor" stroke-width="1"/></svg>',
    action: '<svg viewBox="0 0 14 14"><path d="M3 2 L11 7 L3 12 Z" fill="currentColor"/></svg>',
    reference: '<svg viewBox="0 0 14 14"><rect x="2.5" y="2.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1"/><path d="M2.5 6 L11.5 6 M6 2.5 L6 11.5" stroke="currentColor" stroke-width=".8"/></svg>',
    answer: '<svg viewBox="0 0 14 14"><path d="M3 4 Q3 2 5 2 L5 5 Q5 6.3 3.7 6.3 L3 6.3" fill="none" stroke="currentColor" stroke-width="1"/><path d="M8 4 Q8 2 10 2 L10 5 Q10 6.3 8.7 6.3 L8 6.3" fill="none" stroke="currentColor" stroke-width="1"/></svg>',
    quiz: '<svg viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="7" cy="7" r="1.3" fill="currentColor"/></svg>',
  };
  var sec = function(title, tier){
    n++;
    tier = tier || "reference";
    var d = protoEl("div", "pg-sec pg-tier-" + tier, box);
    var h = protoEl("div", "pg-sec-h", d);
    var ic = document.createElement("span");
    ic.className = "pg-sec-icon";
    ic.innerHTML = TIER_GLYPH[tier] || TIER_GLYPH.reference;
    h.appendChild(ic);
    var lbl = document.createElement("span");
    lbl.className = "pg-sec-label";
    lbl.textContent = n + " \u00b7 " + title;
    h.appendChild(lbl);
    return d;
  };

  var paras = function(box2, t){
    (Array.isArray(t) ? t : [t]).forEach(function(x){ protoEl("p", null, box2, x); });
  };
  var s1 = sec("The problem it solves", "lead");
  paras(s1, g.problem.text);
  if(g.problem.svg){
    var holder = protoEl("div", null, s1);
    holder.innerHTML = protoSvg(g.problem.svg);
  }

  var s2 = sec("How it works", "lead");
  paras(s2, g.how.text);
  var anim = protoAnims[g.id];
  if(anim){
    var ab = protoEl("button", "pg-anim-btn", s2, "\u25b6 Animate this on my canvas");
    var note = protoEl("div", "pg-anim-note", s2, "");
    ab.onclick = function(){
      var ok = anim.run();
      note.textContent = ok ? "Watch the canvas." : anim.need;
    };
  }

  var rows = [];
  if(g.prereqs && g.prereqs.length){
  var s3 = sec("Prerequisites \u2014 live from YOUR lab", "action");
  protoEl("p", "pg-sub", s3, "These check your actual canvas and configs, and update as you work:");
  var list = protoEl("div", "pg-prereqs", s3);
  rows = g.prereqs.map(function(p){
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
  }

  if(g.drill === "subnet"){
    var sd = sec("The drill \u2014 make it automatic", "action");
    var q = null, streak = 0;
    try{ streak = parseInt(localStorage.getItem("junoslab-subnet-streak") || "0", 10); }catch(e){}
    var head = protoEl("div", "pg-drill-q", sd, "");
    var form = protoEl("div", "pg-drill-form", sd);
    var mk = function(label){
      var w = protoEl("label", "pg-drill-field", form);
      protoEl("span", null, w, label);
      var inp = document.createElement("input");
      inp.type = "text"; inp.autocomplete = "off"; inp.spellcheck = false;
      w.appendChild(inp);
      return inp;
    };
    var fNet = mk("network"), fBc = mk("broadcast"), fN = mk("usable hosts");
    var fb = protoEl("div", "pg-drill-fb", sd, "");
    var sk = protoEl("div", "pg-drill-streak", sd, "streak: " + streak);
    var newQ = function(){
      q = subnetDrillQ();
      head.textContent = q.ip + "/" + q.bits + "  \u2014  network, broadcast, usable hosts?";
      [fNet, fBc, fN].forEach(function(i){ i.value = ""; i.className = ""; });
      fb.textContent = "";
      fNet.focus && fNet.focus();
    };
    var checkBtn = protoEl("button", "pg-anim-btn", sd, "Check");
    var nextBtn = protoEl("button", "pg-anim-btn", sd, "New question");
    checkBtn.onclick = function(){
      if(!q) return;
      var okNet = fNet.value.trim() === q.ans.network;
      var okBc = fBc.value.trim() === q.ans.broadcast;
      var okN = parseInt(fN.value.trim(), 10) === q.ans.usable;
      fNet.className = okNet ? "pg-q-right" : "pg-q-wrong";
      fBc.className = okBc ? "pg-q-right" : "pg-q-wrong";
      fN.className = okN ? "pg-q-right" : "pg-q-wrong";
      if(okNet && okBc && okN){
        streak++;
        fb.textContent = "\u2713 all three — that's the exam speed building";
        if(typeof SFX !== "undefined") SFX.ding();
      } else {
        streak = 0;
        fb.textContent = "answer: network " + q.ans.network + " \u00b7 broadcast " + q.ans.broadcast + " \u00b7 " + q.ans.usable + " hosts (mask " + q.ans.mask + ")";
        if(typeof SFX !== "undefined") SFX.womp();
      }
      try{ localStorage.setItem("junoslab-subnet-streak", String(streak)); }catch(e){}
      sk.textContent = "streak: " + streak;
    };
    nextBtn.onclick = newQ;
    newQ();
  }
  if(g.cfg){
    var s4 = sec("Configure it \u2014 the exact commands", "action");
    g.cfg.forEach(function(c){
      var row = protoEl("div", "pg-verify", s4);
      protoEl("code", null, row, c[0]);
      protoEl("div", null, row, c[1]);
    });
  }
  if(g.try && g.try.length){
    var st = sec("Try it right now", "action");
    protoEl("p", "pg-sub", st, "Each button runs the command on a device on your canvas and opens its terminal \u2014 read the real output next to this guide:");
    g.try.forEach(function(tr){
      var row = protoEl("div", "pg-try", st);
      var b = protoEl("button", "pg-try-btn", row, "\u25b8 " + tr[0]);
      protoEl("div", "pg-try-note", row, tr[1]);
      b.onclick = function(){
        var types = PROTO_GLOW_TYPES[g.id] || ["switch", "router"];
        var dev = devices[activeDevice];
        if(!dev || types.indexOf(dev.type) === -1)
          dev = Object.values(devices).find(function(d){ return types.indexOf(d.type) !== -1; });
        if(!dev){
          modalConfirm("No device yet", "Place a " + types[0] + " first (Add menu), then try again.", "OK");
          return;
        }
        openCli(dev.id);
        runCliCommand(dev, tr[0], false);
        if(typeof SFX !== "undefined") SFX.tick();
      };
    });
  }

  if(g.nums){
    var s5 = sec("The numbers to know", "reference");
    var tbl = protoEl("div", "pg-nums", s5);
    g.nums.forEach(function(r){
      var row = protoEl("div", "pg-num-row", tbl);
      protoEl("b", "pg-num-val", row, r[0]);
      protoEl("span", null, row, r[1]);
    });
  }

  var s6 = sec("Verify it", "reference");
  g.verify.forEach(function(v){
    var row = protoEl("div", "pg-verify", s6);
    protoEl("code", null, row, v[0]);
    protoEl("div", null, row, v[1]);
  });

  var s7 = sec("What breaks it", "reference");
  g.breaks.forEach(function(b){ protoEl("div", "pg-break", s7, "\u2715 " + b); });

  if(g.els){
    var s8 = sec("Legacy vs current CLI (the ELS split)", "reference");
    protoEl("p", "pg-sub", s8, "Junos renamed parts of the switching CLI around 12.3/13.x (\u201cEnhanced Layer 2 Software\u201d). This lab teaches current ELS syntax \u2014 the EX4300 dialect. On an older box you may meet:");
    g.els.forEach(function(r){
      var row = protoEl("div", "pg-verify", s8);
      protoEl("code", null, row, r[0]);
      protoEl("div", null, row, r[1]);
    });
    if(g.id === "lacp" && typeof strictOn === "function"){
      var wrap = protoEl("label", "pg-strict", s8);
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = strictOn();
      cb.onchange = function(){
        setStrict(cb.checked);
        if(typeof SFX !== "undefined") SFX.tick();
      };
      wrap.appendChild(cb);
      protoEl("span", null, wrap, " Strict real-Junos mode — ae bundles refuse to form until chassis aggregated-devices is configured, exactly like a real EX. Commit warns you when a bundle is orphaned. Applies lab-wide, survives refresh.");
    }
  }

  if(g.real && g.real.length){
    var sr = sec("On your real EX4300", "reference");
    g.real.forEach(function(r){ protoEl("div", "pg-real", sr, r); });
  }
  var s9 = sec("The 30-second answer", "answer");
  protoEl("p", "pg-answer", s9, "\u201c" + g.answer + "\u201d");

  var s10 = sec("Check yourself", "quiz");
  g.quiz.forEach(function(q, qi){
    var qbox = protoEl("div", "pg-q", s10);
    protoEl("div", "pg-q-text", qbox, (qi + 1) + ". " + q.q);
    var why = null;
    q.opts.forEach(function(opt, oi){
      var b = protoEl("button", "pg-q-opt", qbox, opt);
      b.onclick = function(){
        var correct = oi === q.right;
        b.classList.add(correct ? "pg-q-right" : "pg-q-wrong");
        if(correct && typeof markQuizDone === "function"){
          var wasNew = !quizDoneSet(g.id).has(String(qi));
          markQuizDone(g.id, qi);
          if(wasNew && typeof awardXp === "function"){
            awardXp(4, g.title + " quiz");
            if(g.quiz && quizDoneSet(g.id).size >= g.quiz.length) awardXp(20, g.title + " mastered");
          }
          if(typeof renderCourseBar === "function") renderCourseBar();
        }
        if(typeof SFX !== "undefined") (correct ? SFX.ding : SFX.womp)();
        if(!why){
          why = protoEl("div", "pg-q-why", qbox, "");
          why.innerHTML = (correct ? svgMark("check") + " " : "Not quite \u2014 ") + q.why;
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
