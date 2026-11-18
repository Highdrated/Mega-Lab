// Completion rule: units are the Protocols-tab field guides on the lab's default JNCIA-Junos
// path, in course order, plus three hands-on units (dayzero, hostos, ops) that have no guide
// quiz: those count as done once any scenario mapped to them in SCEN is finished. weak()
// reports the units of every scenario that was finished with hints and not yet redone clean
// (localStorage "junoslab-hintlog"), so Pockle puts those cards first.
// Guide units are judged A guide counts as done exactly as the lab's own unitDone() decides:
// every quiz question of that guide answered correctly at least once, i.e. the comma list in
// localStorage "junoslab-quizdone:<guideId>" holds as many distinct indexes as the guide has
// quiz questions. Scenario progress (junoslab-progress-v2) is not used for units.
POCKET.register({
  id: "junos-lab",
  name: "Junos Lab",
  topic: "Junos",
  href: "junos-lab/index.html",
  keys: [
    "junoslab-quizdone:osi", "junoslab-quizdone:subnetting", "junoslab-quizdone:vlan",
    "junoslab-quizdone:rstp", "junoslab-quizdone:lacp", "junoslab-quizdone:lldp",
    "junoslab-quizdone:junos-arch", "junoslab-quizdone:pipes", "junoslab-quizdone:health",
    "junoslab-quizdone:maintenance", "junoslab-quizdone:comments", "junoslab-quizdone:cfgedit",
    "junoslab-quizdone:cfgload", "junoslab-quizdone:dhcp", "junoslab-quizdone:filters",
    "junoslab-quizdone:ribfib", "junoslab-quizdone:ospf", "junoslab-quizdone:dia",
    "junoslab-quizdone:bgp", "junoslab-quizdone:troubleshooting",
    "junoslab-progress-v2", "junoslab-hintlog"
  ],
  scen: {
    "basic-connect": ["osi", "subnetting"], "meet-the-switch": ["dayzero", "health"], "read-the-switch": ["pipes", "troubleshooting"],
    "first-router": ["ribfib", "hostos"], "first-default-route": ["ribfib", "dia"], "first-filter": ["filters"], "vlan-split": ["vlan"], "rename-switch": ["dayzero", "cfgedit"],
    "access-distribution": ["vlan", "dayzero"], "isp-onboarding": ["dia", "ribfib"], "interconnect-recovery": ["troubleshooting", "ribfib"],
    "access-control-segment": ["vlan"], "multi-tenant-vlans": ["vlan"], "irb-intervlan": ["vlan", "ribfib"], "trunk-span": ["vlan"],
    "commit-confirmed": ["cfgedit"], "filtered-segment": ["filters"], "lacp-bundle": ["lacp"], "rstp-loop": ["rstp"], "storm-control": ["rstp"],
    "asymmetric-routing": ["ribfib", "troubleshooting"], "nat-edge": ["dia"], "dhcp-serve": ["dhcp"], "ospf-backbone": ["ospf"],
    "rogue-switch": ["ops"], "wireless-office": ["dhcp"], "hot-room": ["health"], "name-and-serve": ["troubleshooting"],
    "ops-production": ["ops", "lldp"], "speak-bgp": ["bgp"], "keep-lights-on": ["health"],
    "site-new-desk": ["vlan", "dhcp", "hostos"], "site-rack-server": ["vlan", "ribfib"], "site-pool-dry": ["dhcp", "troubleshooting"],
    "site-guest-vlan": ["vlan", "dhcp"], "site-lacp-uplink": ["lacp"], "site-dia-customer": ["dia", "dhcp"],
    "site-new-access-switch": ["dayzero", "vlan"], "site-internal-router": ["ribfib", "dhcp"], "site-rack-extension": ["dayzero", "vlan"],
    "site-new-floor": ["lacp", "vlan", "dhcp", "dayzero"], "site-customer-cage": ["dia", "dayzero", "vlan"], "site-warehouse": ["ribfib", "dia"],
    "desk-dhcp": ["hostos"], "desk-static": ["hostos"], "desk-back-to-dhcp": ["hostos"], "desk-three-faults": ["hostos", "troubleshooting"],
    "desk-dns": ["hostos"], "desk-rename": ["hostos"],
    "colo-named-accounts": ["ops"], "colo-mystery-port": ["ops", "vlan", "lldp"], "colo-monitoring-gap": ["ops"],
    "colo-wrong-handover": ["lldp", "troubleshooting"], "colo-tenant-leak": ["filters"], "colo-rogue-switch": ["ops"],
    "colo-contractor-filter": ["filters"], "colo-onboard-tenant": ["vlan", "filters", "dayzero"], "colo-decommission": ["cfgedit", "filters"],
    "colo-tenant-lag": ["lacp"], "colo-remote-renumber": ["cfgedit"], "colo-no-internet": ["ribfib", "troubleshooting"],
    "colo-gateway-gone": ["vlan", "troubleshooting"], "colo-power-drill": ["health"],
    "bgp-local-as": ["bgp"], "bgp-peer-as": ["bgp"], "bgp-neighbor-address": ["bgp"], "bgp-static-wins": ["bgp", "ribfib"],
    "bgp-link-first": ["bgp", "troubleshooting"], "bgp-second-provider": ["bgp"], "bgp-failover": ["bgp", "ribfib"],
    "bgp-announce": ["bgp", "filters"], "bgp-over-announce": ["bgp", "filters"], "bgp-dual-homed": ["bgp", "filters"]
  },
  units: [
    { id: "osi", title: "OSI & TCP/IP" },
    { id: "subnetting", title: "IP Subnetting" },
    { id: "vlan", title: "VLANs & Trunking" },
    { id: "rstp", title: "RSTP" },
    { id: "lacp", title: "LACP" },
    { id: "lldp", title: "LLDP" },
    { id: "junos-arch", title: "Junos Architecture" },
    { id: "pipes", title: "Reading Output" },
    { id: "health", title: "Reading the Box" },
    { id: "maintenance", title: "System Maintenance" },
    { id: "comments", title: "Commenting Config" },
    { id: "cfgedit", title: "Editing the Candidate" },
    { id: "cfgload", title: "Loading a Config" },
    { id: "dhcp", title: "DHCP" },
    { id: "filters", title: "Filters & Policy" },
    { id: "ribfib", title: "Routing vs Forwarding" },
    { id: "ospf", title: "OSPF" },
    { id: "dia", title: "DIA" },
    { id: "bgp", title: "BGP" },
    { id: "troubleshooting", title: "Troubleshooting" },
    { id: "dayzero", title: "Day Zero" },
    { id: "hostos", title: "Windows, Mac, Linux" },
    { id: "ops", title: "Operations Hygiene" }
  ],
  done(get) {
    try {
      var need = {
        osi: 3, subnetting: 3, vlan: 3, rstp: 3, lacp: 3, lldp: 3, "junos-arch": 3,
        pipes: 4, health: 5, maintenance: 4, comments: 4, cfgedit: 4, cfgload: 6,
        dhcp: 3, filters: 3, ribfib: 5, ospf: 3, dia: 3, bgp: 3, troubleshooting: 3
      };
      var out = [];
      Object.keys(need).forEach(function (id) {
        var v = get("junoslab-quizdone:" + id);
        if (v === null || v === undefined) return;
        var seen = {};
        String(v).split(",").forEach(function (x) { x = x.trim(); if (x) seen[x] = true; });
        if (Object.keys(seen).length >= need[id]) out.push(id);
      });
      var prog = get("junoslab-progress-v2");
      if (prog && typeof prog === "object") {
        var scen = this.scen, hands = { dayzero: true, hostos: true, ops: true };
        Object.keys(scen).forEach(function (sid) {
          if (!prog[sid] || !prog[sid].done) return;
          scen[sid].forEach(function (u) { if (hands[u] && out.indexOf(u) < 0) out.push(u); });
        });
      }
      return out;
    } catch (e) { return []; }
  },
  weak(get) {
    try {
      var log = get("junoslab-hintlog");
      if (!log || typeof log !== "object") return [];
      var scen = this.scen, out = [];
      Object.keys(log).forEach(function (sid) {
        var h = log[sid];
        if (!h || h.clean || !(h.hints > 0 || h.errs >= 5) || !scen[sid]) return;
        scen[sid].forEach(function (u) { out.push({ u: u, at: h.at || 0 }); });
      });
      return out;
    } catch (e) { return []; }
  },
  sample: {
    "junoslab-quizdone:osi": "0,1,2",
    "junoslab-quizdone:subnetting": "2,0,1",
    "junoslab-quizdone:vlan": "0,2",
    "junoslab-quizdone:pipes": "1",
    "junoslab-progress-v2": "{\"basic-connect\":{\"done\":true,\"at\":1761300000000}}"
  },
  sampleDone: ["osi", "subnetting"],
  cards: [
    { u: "bgp", q: "In one line, what does BGP do?", o: ["Hands out IP addresses", "Lets two networks tell each other which networks they can reach", "Blocks loops between switches", "Encrypts traffic"], a: 1, why: "Two routers open a session and swap lists of reachable networks." },
    { u: "bgp", q: "What is an AS number?", o: ["A VLAN id", "The name a whole network uses in BGP", "A port number", "A password"], a: 1, why: "Every network that speaks BGP has one. Yours and your provider's are different." },
    { u: "bgp", q: "Junos refuses to commit a BGP neighbour. The error mentions no local AS. What is missing?", o: ["set protocols bgp enable", "set routing-options autonomous-system", "set system host-name", "set interfaces lo0"], a: 1, why: "The router must know its own AS before it can introduce itself." },
    { u: "bgp", q: "show bgp summary says Active. What does that mean?", o: ["The session is working", "Your side is trying but the other end does not agree or answer", "BGP is switched off", "Routes are being sent"], a: 1, why: "Active is not good news: it keeps trying. A wrong peer-as is the classic cause." },
    { u: "bgp", q: "Which state means routes are being exchanged?", o: ["Idle", "Active", "Connect", "Established"], a: 3, why: "Only Established carries routes. Everything else is a session that is not up." },
    { u: "bgp", q: "Your interface is 203.0.113.2/30. What can the provider's address be?", o: ["203.0.113.1", "203.0.113.11", "203.0.113.254", "203.0.114.1"], a: 0, why: "A /30 has two usable addresses, .1 and .2. An eBGP neighbour sits on the directly connected network." },
    { u: "bgp", q: "A static default (preference 5) and a BGP default (preference 170) both exist. Which is used?", o: ["The BGP one", "The static one", "Both, load-shared", "Neither"], a: 1, why: "For the same destination the lower preference wins, so the typed route beats the learned one." },
    { u: "bgp", q: "The link to the provider goes down. What happens to the default route learned over BGP?", o: ["It stays forever", "It is withdrawn with the session", "It becomes static", "It moves to OSPF"], a: 1, why: "A learned route leaves when the session does. That is what makes failover automatic." },
    { u: "bgp", q: "You have two providers. Why does each need its own BGP group?", o: ["Junos allows one neighbour per group", "Each provider is a different AS, so the peer-as differs", "To use two cables", "For NAT"], a: 1, why: "peer-as is set per group, and each provider answers with its own AS." },
    { u: "bgp", q: "By default, which of your own networks does Junos announce to a BGP neighbour?", o: ["All of them", "Only connected ones", "None", "Only static ones"], a: 2, why: "Without an export policy only BGP-learned routes are passed on. Your own networks stay home." },
    { u: "bgp", q: "What decides which networks you announce to a provider?", o: ["An import policy", "An export policy", "A firewall filter", "The NAT rule"], a: 1, why: "Export is what you tell others. Import is what you accept from them." },
    { u: "bgp", q: "Which command shows what you are telling a neighbour?", o: ["show route receive-protocol bgp <ip>", "show bgp summary", "show route advertising-protocol bgp <ip>", "show route"], a: 2, why: "advertising-protocol is your outgoing list, receive-protocol is the incoming one." },
    { u: "bgp", q: "A server with a public address cannot get replies from the internet. The BGP session is Established. Likely cause?", o: ["Wrong peer-as", "Its network was never announced to the provider", "DHCP is off", "The cable is bad"], a: 1, why: "The internet can only send answers to networks someone has announced." },
    { u: "bgp", q: "Why must you never announce 10.0.0.0/8 style private networks to a provider?", o: ["They are too large", "Every company reuses them, so they are meaningless on the internet", "They are slower", "BGP cannot carry them"], a: 1, why: "An announcement is a promise to carry traffic for that network. Private space cannot be promised." },
    { u: "bgp", q: "A policy has one term with no from part and then accept. What does it match?", o: ["Nothing", "Only static routes", "Every route", "Only the default route"], a: 2, why: "No condition means everything matches. That is how networks get announced by accident." },
    { u: "dayzero", q: "A factory-fresh Junos switch shows Amnesiac at the console. What does that mean?", o: ["It has no configuration yet", "The disk failed", "It lost its license", "It is in rescue mode"], a: 0, why: "Amnesiac is Junos for a box with no host-name and no config." },
    { u: "dayzero", q: "Your first commit on a new switch fails with a missing mandatory statement. What is missing?", o: ["A host-name", "A management address", "A root password", "A VLAN"], a: 2, why: "Junos refuses the first commit until root-authentication is set." },
    { u: "dayzero", q: "Fill the blank.", code: "set system ___ plain-text-password", o: ["root-password", "root-authentication", "login root", "password root"], a: 1, why: "root-authentication holds the root password." },
    { u: "dayzero", q: "Which of these is one valid Junos command?", o: ["set-system-host-name sw1", "set system-hostname sw1", "set hostname sw1", "set system host-name sw1"], a: 3, why: "Words are levels of a tree, split by spaces. Dashes only sit inside one keyword." },
    { u: "dayzero", q: "You typed set system host-name sw1 and the name did not change. Why?", o: ["Reboot needed", "You have not committed", "Names need quotes", "Wrong mode"], a: 1, why: "set edits the candidate. Only commit makes it active." },
    { u: "dayzero", q: "A new switch has no IP address. How do you reach it?", o: ["SSH to its default address", "Through the console port", "Ping its hostname", "Telnet over the uplink"], a: 1, why: "The serial console works with zero config. Everything else needs an address first." },
    { u: "dayzero", q: "The prompt ends in >. What can you do there?", o: ["Run show and ping", "Run set and commit", "Only log out", "Edit files"], a: 0, why: "> is operational mode. # is configuration mode, where set and commit live." },
    { u: "hostos", q: "Which command shows the IP address on a Windows PC?", o: ["ip addr", "ifconfig en0", "ipconfig", "show ip"], a: 2, why: "ipconfig is Windows. ip addr is Linux, ifconfig en0 is a Mac." },
    { u: "hostos", q: "Ask DHCP for a new address on Windows.", o: ["dhclient eth0", "ipconfig /renew", "ipconfig set en0 DHCP", "netsh renew"], a: 1, why: "ipconfig /renew asks the DHCP server again." },
    { u: "hostos", q: "Ask DHCP for an address on a Mac.", o: ["ipconfig /renew", "dhclient en0", "sudo ipconfig set en0 DHCP", "netsh interface ip set address en0 dhcp"], a: 2, why: "On macOS the wired port is en0 and ipconfig set switches it to DHCP." },
    { u: "hostos", q: "Ask DHCP for an address on Linux.", o: ["dhclient eth0", "ipconfig /renew", "networksetup -setdhcp eth0", "ip dhcp"], a: 0, why: "dhclient is the Linux DHCP client." },
    { u: "hostos", q: "ipconfig shows 169.254.x.x on a Windows PC. What happened?", o: ["Static address set", "DHCP did not answer", "DNS is down", "Wrong gateway"], a: 1, why: "169.254 is a self-assigned address. It means no DHCP server replied." },
    { u: "hostos", q: "Fill the blank for a static address on Windows.", code: "netsh interface ip set address \"Ethernet\" ___ 10.0.10.11 255.255.255.0 10.0.10.1", o: ["manual", "fixed", "static", "set"], a: 2, why: "static, then address, mask and gateway in one line." },
    { u: "hostos", q: "Which line sets a static address on a Mac?", o: ["ip addr add 10.0.10.12/24 dev en0", "networksetup -setmanual \"Ethernet\" 10.0.10.12 255.255.255.0 10.0.10.1", "netsh interface ip set address en0 static 10.0.10.12", "ifconfig /static 10.0.10.12"], a: 1, why: "networksetup -setmanual takes address, mask and router." },
    { u: "hostos", q: "On Linux you ran ip addr add 10.0.10.13/24 dev eth0. Other subnets are unreachable. What is missing?", o: ["A DNS server", "A reboot", "A default route", "A hostname"], a: 2, why: "Linux sets the address and the gateway separately: ip route add default via <gw>." },
    { u: "hostos", q: "255.255.255.0 is the same mask as...", o: ["/8", "/16", "/24", "/30"], a: 2, why: "Three full octets of ones is 24 bits." },
    { u: "hostos", q: "ipconfig /renew fails on a Windows PC with a hand-set address. Why?", o: ["The cable is out", "The adapter is static, so there is no lease", "DHCP is full", "Wrong VLAN"], a: 1, why: "Switch the adapter to DHCP first: netsh interface ip set address \"Ethernet\" dhcp." },
    { u: "hostos", q: "Show the path packets take, on Windows.", o: ["traceroute", "tracert", "pathshow", "route trace"], a: 1, why: "tracert on Windows, traceroute on Mac and Linux." },
    { u: "hostos", q: "Clear the terminal screen on Windows.", o: ["clear", "cls", "reset", "wipe"], a: 1, why: "cls on Windows, clear on Mac and Linux." },
    { u: "hostos", q: "Which command renames a Windows PC?", o: ["hostname new-name", "scutil --set HostName new-name", "Rename-Computer -NewName new-name", "set hostname new-name"], a: 2, why: "On Windows hostname only shows the name. Rename-Computer changes it." },
    { u: "hostos", q: "Which system is a Juniper switch closest to under the hood?", o: ["Windows", "A Unix-style system", "macOS", "DOS"], a: 1, why: "Junos is built on FreeBSD, newer Junos Evolved on Linux." },
    { u: "ops", q: "Why give every engineer a personal login instead of sharing root?", o: ["It is faster", "The log shows who did what", "Root is slower", "It saves licenses"], a: 1, why: "With a shared root login every change in the log is just root." },
    { u: "ops", q: "Fill the blank to give a user full rights.", code: "set system login user noc-admin class ___", o: ["admin", "root", "super-user", "operator"], a: 2, why: "super-user is the built-in class with every permission." },
    { u: "ops", q: "SSH to a switch says Connection refused. What does that tell you?", o: ["No network path", "The switch is off", "Reachable, but SSH is not enabled", "Wrong password"], a: 2, why: "Refused means the box answered and nothing listens on port 22. Timed out means no path." },
    { u: "ops", q: "Which line turns SSH on?", o: ["set system services ssh", "set protocols ssh", "set ssh enable", "set system ssh on"], a: 0, why: "Remote access services live under system services." },
    { u: "ops", q: "Why send switch logs to a central server?", o: ["To save disk", "The evidence survives when the switch dies", "It is required for SSH", "To speed up commits"], a: 1, why: "A local log is lost with the box that failed." },
    { u: "ops", q: "Why do all devices need the same time source?", o: ["For DHCP leases", "So logs from different devices line up", "For faster routing", "For VLAN tags"], a: 1, why: "Without NTP you cannot tell which event came first." },
    { u: "ops", q: "Which SNMP access should a monitoring system get?", o: ["read-write", "read-only", "super-user", "none"], a: 1, why: "It only needs to read counters. Read-write lets a poller change the switch." },
    { u: "ops", q: "What is an interface description for?", o: ["It sets the VLAN", "It labels what is plugged in", "It enables the port", "It sets the speed"], a: 1, why: "It is the cable label that cannot fall off." },
    { u: "ops", q: "One access port shows three MAC addresses. What is most likely behind it?", o: ["A broken cable", "A router", "Another switch", "A trunk"], a: 2, why: "Several MACs on one access port means more than one device, usually a small switch." },
    { u: "ops", q: "An unknown device sits in a customer VLAN. What is the safest first move?", o: ["Reboot the switch", "Delete the VLAN", "Move its port to a VLAN with no gateway", "Ignore it"], a: 2, why: "A quarantine VLAN with no gateway cuts it off without touching the customer." },
    { u: "ops", q: "The handover note and show lldp neighbors disagree about a port. Which do you trust?", o: ["The note", "The live table", "Neither", "The newest email"], a: 1, why: "The switch shows what is cabled right now. Then fix the note." },
    { u: "osi", q: "At which OSI layer do switching, VLANs and LACP live?", o: ["Layer 1", "Layer 4", "Layer 3", "Layer 2"], a: 3, why: "Layer 2 delivers frames by MAC address." },
    { u: "osi", q: "BGP runs at which layer?", o: ["Layer 7 only", "Layer 2", "It manages L3 routes but runs over TCP at layer 4", "Layer 1"], a: 2, why: "BGP speaks over TCP port 179." },
    { u: "osi", q: "One VLAN equals one...", o: ["Collision domain", "Broadcast domain", "Subnet mask", "Routing table"], a: 1, why: "That is why DHCP broadcasts cannot cross VLANs." },
    { u: "osi", q: "Pick the PDU chain on the way down.", o: ["data, segment, packet, frame, bits", "data, packet, segment, frame, bits", "bits, frame, packet, segment, data", "segment, data, frame, packet, bits"], a: 0, why: "Each layer wraps the one above." },
    { u: "osi", q: "A switch is a layer __ device; a router is a layer __ device.", o: ["2 and 3", "3 and 2", "1 and 2", "2 and 4"], a: 0, why: "Switches move frames by MAC, routers move packets by IP." },
    { u: "osi", q: "DHCP uses which transport?", o: ["TCP 179", "UDP 53", "TCP 22", "UDP 67/68"], a: 3, why: "DHCP is UDP: server 67, client 68." },
    { u: "subnetting", q: "192.168.10.130/26 sits in which subnet?", o: ["192.168.10.64/26", "192.168.10.130/26", "192.168.10.128/26", "192.168.10.192/26"], a: 2, why: "Magic number 64: 130 snaps down to 128." },
    { u: "subnetting", q: "What is the magic number (block size) for a /26?", o: ["26", "64", "32", "192"], a: 1, why: "256 - 192 = 64." },
    { u: "subnetting", q: "How many usable hosts in a /27?", o: ["32", "30", "14", "62"], a: 1, why: "2^5 - 2 = 30." },
    { u: "subnetting", q: "You need 40 hosts per subnet with minimum waste. Which prefix?", o: ["/26", "/25", "/27", "/24"], a: 0, why: "/27 gives 30, too few; /26 gives 62." },
    { u: "subnetting", q: "Why use /31 on point-to-point links?", o: ["It is faster", "Junos needs it for OSPF", "It allows 4 hosts", "Both addresses usable, no network or broadcast"], a: 3, why: "RFC 3021: zero waste on a two-host link." },
    { u: "subnetting", q: "Broadcast of 192.168.10.130/26?", o: ["192.168.10.255", "192.168.10.192", "192.168.10.191", "192.168.10.190"], a: 2, why: "Network .128 + 64 - 1 = .191." },
    { u: "vlan", q: "Two hosts, same switch, same subnet, different VLANs. Ping?", o: ["Works", "Works only one way", "Fails, VLAN isolation beats subnet math", "Works after ARP"], a: 2, why: "A frame in one VLAN never reaches a port in another." },
    { u: "vlan", q: "Where does the 802.1Q tag exist?", o: ["On every cable", "Only on trunk links", "Only on access ports", "Inside the host NIC"], a: 1, why: "Hosts never see the tag; trunks carry it." },
    { u: "vlan", q: "ELS: fill the blank to make ge-0/0/7 a trunk.", code: "set interfaces ge-0/0/7 unit 0\n  family ethernet-switching\n  ___ trunk", o: ["interface-mode", "port-type", "switchport", "trunk-mode"], a: 0, why: "ELS uses interface-mode access or trunk." },
    { u: "vlan", q: "VLAN 30 works on switch A but is dead on switch B. First suspect?", o: ["Wrong default gateway", "RSTP blocked it", "LLDP is off", "VLAN 30 missing from the trunk's vlan members"], a: 3, why: "The classic multi-switch ticket." },
    { u: "vlan", q: "What is the usable VLAN ID range?", o: ["0-4095", "1-1024", "2-4096", "1-4094"], a: 3, why: "12-bit field; 0 and 4095 are reserved." },
    { u: "vlan", q: "Which command shows which ports really ended up in each VLAN?", o: ["show lldp neighbors", "show route", "show vlans", "show interfaces descriptions"], a: 2, why: "Read show vlans before trusting your memory." },
    { u: "rstp", q: "Without spanning tree, a loop of switches causes...", o: ["Faster forwarding", "A broadcast storm", "A routing loop with TTL expiry", "Nothing"], a: 1, why: "Layer 2 has no TTL, so frames loop forever." },
    { u: "rstp", q: "Triangle of three switches with RSTP. How many ports block?", o: ["One", "None", "Two", "Three"], a: 0, why: "Exactly enough to break the single loop." },
    { u: "rstp", q: "What is the default bridge priority?", o: ["32768", "4096", "0", "61440"], a: 0, why: "Set it lower on the switch you want as root." },
    { u: "rstp", q: "Which command shows who is root?", o: ["show spanning-tree interface", "show route", "show rstp", "show spanning-tree bridge"], a: 3, why: "If you did not choose the root, the network chose for you." },
    { u: "rstp", q: "A port shows ALT/BLK. A colleague wants to fix it. You say:", o: ["Replace the cable", "Disable RSTP", "It is the standby breaking the loop", "Reboot the switch"], a: 2, why: "Blocking is that port doing its job." },
    { u: "rstp", q: "RSTP runs on two of three switches in a ring. Result?", o: ["Works fine", "The storm continues", "The third becomes root", "Only one port blocks"], a: 1, why: "It must run on every switch in the loop." },
    { u: "lacp", q: "Both ends of a bundle are LACP passive. What happens?", o: ["Comes up normally", "Never forms, nobody speaks first", "Works at half speed", "Only one member works"], a: 1, why: "Passive only answers; one side must be active." },
    { u: "lacp", q: "One member of a healthy 2-member ae0 is cut. Users notice...", o: ["Nothing", "The whole bundle drops", "A short outage", "Half the VLANs drop"], a: 0, why: "Traffic shifts to the surviving member." },
    { u: "lacp", q: "On the EX4300, which line must exist before any ae0?", o: ["set vlans ae0", "set interfaces ae0 enable", "set protocols lacp", "set chassis aggregated-devices ethernet device-count 2"], a: 3, why: "No device-count, no ae interfaces." },
    { u: "lacp", q: "Fill the blank to add ge-0/0/1 to ae0.", code: "set interfaces ge-0/0/1\n  ___ 802.3ad ae0", o: ["aggregated-ether-options", "unit 0", "ether-options", "lacp"], a: 2, why: "Member ports join with ether-options 802.3ad." },
    { u: "lacp", q: "Healthy members in show lacp interfaces say...", o: ["Detached", "Waiting", "Collecting distributing", "Up up"], a: 2, why: "Detached means that member or the far end is wrong." },
    { u: "lacp", q: "The bundle forms but switches nothing. What is missing?", o: ["lacp passive", "family ethernet-switching on ae0", "minimum-links", "A second member"], a: 1, why: "The ae itself must be a switching interface." },
    { u: "lldp", q: "show lldp neighbors is empty on your PC's port. That proves...", o: ["Very little, most PCs do not run LLDP", "The cable is dead", "LLDP is off", "The port is in the wrong VLAN"], a: 0, why: "Endpoints are usually silent." },
    { u: "lldp", q: "Why does an LLDP entry mean a direct cable?", o: ["It only works on trunks", "LLDP uses routing", "It needs an IP", "LLDP frames are link-local, switches do not forward them"], a: 3, why: "A neighbour is always directly cabled." },
    { u: "lldp", q: "LLDP neighbour is fine, but no traffic passes. Contradiction?", o: ["Yes, impossible", "No, LLDP blocks traffic", "Yes, LLDP must be wrong", "No, LLDP proves cabling, not VLAN or L3 config"], a: 3, why: "Physical adjacency is not a working data path." },
    { u: "lldp", q: "LLDP is which IEEE standard?", o: ["802.1Q", "802.3ad", "802.1AB", "802.1w"], a: 2, why: "Vendor-neutral, unlike Cisco's CDP." },
    { u: "lldp", q: "Which line runs LLDP on every interface?", o: ["set lldp enable", "set protocols lldp interface all", "set interfaces all lldp", "set system lldp"], a: 1, why: "LLDP lives under protocols lldp." },
    { u: "junos-arch", q: "Traffic flows fine but you cannot SSH to the switch. Which plane?", o: ["Control plane", "Forwarding plane", "Data plane", "Neither"], a: 0, why: "SSH is exception traffic for the RE." },
    { u: "junos-arch", q: "You type ten set lines and close the laptop. What changed?", o: ["Nothing, the candidate was never committed", "Only the hostname", "Everything", "The rescue config"], a: 0, why: "set edits the candidate only." },
    { u: "junos-arch", q: "Which daemon owns the CLI and commit?", o: ["rpd", "chassisd", "dcd", "mgd"], a: 3, why: "mgd is the management daemon." },
    { u: "junos-arch", q: "Which daemon runs OSPF and BGP?", o: ["mgd", "l2ald", "rpd", "dcd"], a: 2, why: "rpd is the routing protocol daemon." },
    { u: "junos-arch", q: "Which way do the tables flow?", o: ["PFE builds routing, pushes to RE", "RE builds routing, derives forwarding, pushes to PFE", "Both build their own from scratch", "Forwarding table feeds the routing table"], a: 1, why: "Customer traffic then only crosses the PFE." },
    { u: "pipes", q: "| match ge-0/0/2 returns eleven lines. Why?", o: ["Bug", "Substring match also hits ge-0/0/20 to 29", "It counts errors", "It shows all units"], a: 1, why: "The pattern is a substring regex, not a wildcard." },
    { u: "pipes", q: "How many config lines mention vlan?", o: ["show configuration | match vlan | count", "show configuration | count vlan", "show vlans | count", "show configuration | find vlan"], a: 0, why: "Filters chain left to right." },
    { u: "pipes", q: "Which filter throws matching lines away?", o: ["match", "count", "find", "except"], a: 3, why: "except is the inverse of match." },
    { u: "pipes", q: "Which filter skips to the first match, then shows the rest?", o: ["match", "except", "find", "last"], a: 2, why: "find jumps into the middle of long output." },
    { u: "pipes", q: "Fill the blank to save output to a file.", code: "show interfaces terse | ___ before.txt", o: ["export", "write", "save", "file"], a: 2, why: "file show before.txt reads it back." },
    { u: "pipes", q: "Does a pipe filter change anything on the device?", o: ["Yes, it edits config", "No, it only changes what reaches your screen", "Only with commit", "Only in config mode"], a: 1, why: "A filter is always safe to try." },
    { u: "health", q: "Traffic drops intermittently. What do you run first?", o: ["show chassis alarms", "show route", "ping", "show bgp summary"], a: 0, why: "Hardware first: fans, power, temperature." },
    { u: "health", q: "Two ping replies. Is the path healthy?", o: ["Yes", "Yes if no timeouts", "Only if rapid", "No, use count for a real sample"], a: 3, why: "Two probes can both get lucky." },
    { u: "health", q: "show configuration interfaces ge-0/0/1 prints nothing after your set. Why?", o: ["Typo", "Needs | display set", "Interface is down", "It is only in the candidate"], a: 3, why: "show configuration reads the active config." },
    { u: "health", q: "Static (5) and OSPF (10) to the same prefix. Which is active?", o: ["OSPF", "Both share load", "Static", "Neither"], a: 2, why: "Lower preference wins." },
    { u: "health", q: "Which ping proves a small MTU somewhere on the path?", o: ["ping rapid", "ping size 1500 do-not-fragment", "ping count 100", "ping source"], a: 1, why: "Without DF the packet just fragments." },
    { u: "health", q: "Software alarms like no rescue config show in...", o: ["show system alarms", "show chassis alarms", "show log messages", "show system storage"], a: 0, why: "Chassis alarms are hardware; system alarms are software." },
    { u: "maintenance", q: "Which class may restart things but never change config?", o: ["operator", "super-user", "read-only", "unauthorized"], a: 0, why: "operator sits below super-user." },
    { u: "maintenance", q: "A bad change was made three weeks of commits ago. Fastest safe fix?", o: ["rollback 1", "rollback 0", "request system zeroize", "rollback rescue, show | compare, commit"], a: 3, why: "The rescue config is your chosen known-good." },
    { u: "maintenance", q: "An upgrade fails with a storage error. What was skipped?", o: ["request system snapshot", "commit check", "request system storage cleanup", "show system alarms"], a: 2, why: "A full /var is the classic upgrade killer." },
    { u: "maintenance", q: "Root on a fresh EX sees a % prompt. Next?", o: ["configure", "cli", "exit", "login"], a: 1, why: "Root lands in the shell first." },
    { u: "maintenance", q: "Where do juniper.conf.N.gz rollback files live?", o: ["/var/tmp", "/config", "/var/log", "/etc"], a: 1, why: "/var/tmp is where old bundles pile up." },
    { u: "comments", q: "annotate on a statement that does not exist yet gives...", o: ["statement not found", "A new empty statement", "A warning only", "It works"], a: 0, why: "annotate decorates config, it cannot create it." },
    { u: "comments", q: "You annotate, then rollback 0. The comment is...", o: ["Kept", "Committed", "Moved to rescue", "Gone"], a: 3, why: "A comment is part of the candidate." },
    { u: "comments", q: "How do you remove a comment but keep the statement?", o: ["delete annotate", "deactivate", "annotate <statement> \"\"", "rollback 1"], a: 2, why: "An empty comment deletes it." },
    { u: "comments", q: "How does a comment print in the curly-brace config?", o: ["# comment", "// comment", "/* comment */ above the statement", "As a description"], a: 2, why: "It sits on its own line above what it describes." },
    { u: "comments", q: "Spot the bug.", code: "annotate interfaces ge-0/0/1\n  uplink to core", o: ["Wrong interface", "Missing quotes around the comment", "Needs commit first", "annotate needs edit mode off"], a: 1, why: "A comment with spaces must be in quotes." },
    { u: "cfgedit", q: "You deactivate ge-0/0/5 and commit. show configuration shows...", o: ["ge-0/0/5 with inactive: in front", "Nothing for ge-0/0/5", "An error", "ge-0/0/5 disabled"], a: 0, why: "The text stays, the effect stops." },
    { u: "cfgedit", q: "deny-all is term 1, allow-dns term 2. DNS is blocked. Best fix?", o: ["Delete and retype both", "deactivate the filter", "rename deny-all", "insert term allow-dns before term deny-all"], a: 3, why: "Term order is the logic." },
    { u: "cfgedit", q: "A broken statement is deactivated. Next commit?", o: ["Still fails", "Asks to confirm", "Deletes it", "Commits, inactive statements are not validated"], a: 3, why: "Commit skips inactive statements." },
    { u: "cfgedit", q: "Why rename instead of set new + delete old?", o: ["Faster to type", "Needed for commit", "Keeps position, comment and inactive tag", "No difference"], a: 2, why: "Retyping loses both." },
    { u: "cfgedit", q: "In show | compare, a deactivate shows with which mark?", o: ["+", "!", "-", "*"], a: 1, why: "The statement is unchanged, only its effect." },
    { u: "cfgload", q: "Ten VLANs in service. You load override one new VLAN and commit. Result?", o: ["Only the new VLAN remains", "Eleven VLANs", "Error", "Nothing changes"], a: 0, why: "Override replaces the whole candidate." },
    { u: "cfgload", q: "Port has members staff. You load merge members guest. Result?", o: ["staff and guest", "staff only", "guest only", "Error"], a: 0, why: "Merge combines lists." },
    { u: "cfgload", q: "Fastest safe way to clone a good switch?", o: ["Retype everything", "rollback 1", "load patch", "save golden.conf, then load override golden.conf on the new one"], a: 3, why: "A saved file is complete by construction." },
    { u: "cfgload", q: "You just ran load merge golden.conf. Next command?", o: ["commit", "rollback 0", "show | compare", "save"], a: 2, why: "Read the diff before committing." },
    { u: "cfgload", q: "What does the replace: tag do?", o: ["Deletes the whole config", "Empties that level before loading into it", "Renames a statement", "Nothing ever"], a: 1, why: "Only load replace reads it." },
    { u: "cfgload", q: "Which loader reads show | compare output?", o: ["load merge", "load patch", "load set", "load override"], a: 1, why: "+ lines are set, - lines are deleted." },
    { u: "dhcp", q: "Laptop gets an IP, pings locally, no internet. DHCP suspect?", o: ["dhcp-attributes router missing or wrong", "Pool too small", "Wrong lease time", "DNS port blocked"], a: 0, why: "The gateway rides along in the ACK." },
    { u: "dhcp", q: "dhclient says no DHCPOFFERS received. Meaning?", o: ["Pool is full", "DNS is down", "Lease expired", "DISCOVER reached no server, wrong VLAN or irb"], a: 3, why: "The server must be inside that broadcast domain." },
    { u: "dhcp", q: "Put DORA in order.", o: ["Offer, Discover, Ack, Request", "Discover, Request, Offer, Ack", "Discover, Offer, Request, Ack", "Request, Offer, Discover, Ack"], a: 2, why: "Four packets per lease." },
    { u: "dhcp", q: "Fill the blank to serve DHCP on the staff VLAN gateway.", code: "set system services dhcp-local-server\n  group LAN interface ___", o: ["ge-0/0/0", "vlan staff", "irb.10", "ae0"], a: 2, why: "irb.10 is the switch's presence in VLAN 10." },
    { u: "dhcp", q: "Where does a DHCP DISCOVER go?", o: ["The gateway IP", "255.255.255.255", "224.0.0.5", "The DNS server"], a: 1, why: "The client has no address yet, so it broadcasts." },
    { u: "filters", q: "Your filter blocks guests, and now nobody reaches the gateway. Why?", o: ["No accept term, the implicit discard ate the rest", "Wrong interface", "Filter needs commit confirmed", "reject used instead of discard"], a: 0, why: "Every filter ends with an invisible discard all." },
    { u: "filters", q: "Ping fails with administratively prohibited. Which action?", o: ["discard", "count", "accept", "reject"], a: 3, why: "discard says nothing; the sender just times out." },
    { u: "filters", q: "Stop advertising a route to a BGP peer. Which tool?", o: ["Firewall filter", "Storm control", "Import routing policy", "Export routing policy"], a: 3, why: "Filters eat packets, policies eat routes." },
    { u: "filters", q: "A filter is defined but blocks nothing. Likely cause?", o: ["Missing reject", "Wrong term order", "Not applied to an interface", "OSPF is off"], a: 2, why: "Filters do nothing until applied." },
    { u: "filters", q: "Fill the blank to apply GUEST-BLOCK inbound on irb.20.", code: "set interfaces irb unit 20\n  family inet filter ___ GUEST-BLOCK", o: ["in", "input", "ingress", "import"], a: 1, why: "filter input applies it to incoming packets." },
    { u: "ribfib", q: "inet.0: 2 destinations, 3 routes (2 active, 0 holddown, 1 hidden). How many forward?", o: ["2", "1", "3", "0"], a: 0, why: "Only active routes forward." },
    { u: "ribfib", q: "A committed static route is missing from show route. Likely?", o: ["Next hop not on a live subnet, so it is hidden", "Commit failed", "OSPF overrides it", "Needs a reboot"], a: 0, why: "Check show route hidden." },
    { u: "ribfib", q: "Static and OSPF to one prefix. show route shows...", o: ["Only OSPF", "Only static", "Both, star on OSPF", "Both, star on the static"], a: 3, why: "The loser stays as a standby copy." },
    { u: "ribfib", q: "Why is the forwarding table shorter than show route?", o: ["It is compressed", "It drops statics", "Only active, resolved routes are pushed", "It is out of date"], a: 2, why: "The PFE only needs the winners." },
    { u: "ribfib", q: "What is BGP's default preference?", o: ["5", "170", "150", "10"], a: 1, why: "Least trusted: it came from another network." },
    { u: "ospf", q: "show ospf neighbor is empty on a good /30. First check?", o: ["Reboot", "OSPF on the logical unit (.0), same area, both sides", "Add a static route", "Disable RSTP"], a: 1, why: "OSPF binds to logical interfaces." },
    { u: "ospf", q: "Why mark the LAN interface passive instead of leaving it out?", o: ["Subnet is advertised, but no hellos to hosts", "Saves CPU", "Makes it area 0", "Speeds convergence"], a: 0, why: "Left out, the subnet is not in the map." },
    { u: "ospf", q: "Neighbor state Full means...", o: ["Too many routes", "Area is full", "Interface is busy", "Adjacency formed and databases synced"], a: 3, why: "Stuck in ExStart often means MTU mismatch." },
    { u: "ospf", q: "What is the default OSPF hello / dead on broadcast links?", o: ["2 s / 6 s", "30 s / 90 s", "10 s / 40 s", "1 s / 3 s"], a: 2, why: "Mismatched timers mean no adjacency." },
    { u: "ospf", q: "Junos preference for internal OSPF routes?", o: ["5", "150", "10", "170"], a: 2, why: "Beats BGP 170, loses to static 5." },
    { u: "dia", q: "Hosts ping the router, router pings 8.8.8.8, hosts cannot. Likely?", o: ["DNS", "Missing source NAT", "Wrong VLAN", "BGP down"], a: 1, why: "The internet cannot reply to private addresses." },
    { u: "dia", q: "Provider gives 203.0.113.0/30 and is on .1. Your WAN address?", o: [".2", ".0", ".3", ".1"], a: 0, why: ".0 is network, .3 is broadcast." },
    { u: "dia", q: "What makes DIA different from business broadband?", o: ["Uses fibre", "Always BGP", "Free public IPs", "Dedicated, non-shared bandwidth with an SLA"], a: 3, why: "You get what you bought, always." },
    { u: "dia", q: "Ping fails to the internet. Which command shows how far it got?", o: ["show route", "show vlans", "show bgp summary", "traceroute 8.8.8.8"], a: 3, why: "The last responding hop points at the broken segment." },
    { u: "dia", q: "Which route sends everything unknown to the provider?", o: ["set interfaces ge-0/0/0 gateway 203.0.113.1", "set routing-options default 203.0.113.1", "set routing-options static route 0.0.0.0/0 next-hop 203.0.113.1", "set protocols static 0/0 203.0.113.1"], a: 2, why: "A static default at the provider's side of the /30." },
    { u: "bgp", q: "Session bounces Idle/Active, /30 pings fine. Prime suspect?", o: ["MTU", "peer-as mismatch", "Hold timer", "No static route"], a: 1, why: "The OPEN names an AS the far side rejects." },
    { u: "bgp", q: "Session Established, default arrives, but the old static still wins. Why?", o: ["Static 5 beats BGP 170", "BGP routes are hidden", "Needs commit confirmed", "Wrong AS"], a: 0, why: "Delete the static and the learned route takes over." },
    { u: "bgp", q: "Why is a BGP-learned default better than a static one?", o: ["Tied to the session, it vanishes if the provider dies", "Faster", "Uses less memory", "No config needed"], a: 0, why: "A static would keep sending into a dead link." },
    { u: "bgp", q: "BGP peers over which transport?", o: ["UDP 179", "IP protocol 89", "TCP 22", "TCP 179"], a: 3, why: "A session is literally a TCP connection." },
    { u: "bgp", q: "Fill the blank for an eBGP group.", code: "set protocols bgp group ISP\n  type ___", o: ["internal", "ebgp", "external", "provider"], a: 2, why: "external peers with a different AS." },
    { u: "troubleshooting", q: "Your theory turns out wrong. What next?", o: ["Implement anyway", "Establish a new theory, or escalate", "Document", "Close the ticket"], a: 1, why: "Step 3 loops back." },
    { u: "troubleshooting", q: "Problem resolved. What comes before documenting?", o: ["Close ticket", "Verify full system functionality", "Escalate", "Form a theory"], a: 1, why: "Fixes can create new faults." },
    { u: "troubleshooting", q: "Which question most reliably shortens an incident?", o: ["What changed recently?", "Who is on call?", "Is it plugged in?", "Which vendor?"], a: 0, why: "The crime scene is usually the latest commit." },
    { u: "troubleshooting", q: "How many steps in the methodology?", o: ["5", "6", "8", "7"], a: 3, why: "Identify, theorise, test, plan, implement, verify, document." },
    { u: "troubleshooting", q: "Why change only one thing at a time?", o: ["Policy", "Commit limits", "Otherwise you cannot tell which change mattered", "Saves time"], a: 2, why: "Two changes make the result uninterpretable." }
  ]
});
