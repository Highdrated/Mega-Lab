var EXAM_BANK = [
  { d: "Networking fundamentals", q: "Which address is the broadcast of 172.16.32.0/20?", opts: ["172.16.47.255", "172.16.32.255", "172.16.63.255"], right: 0, why: "/20's magic number in the third octet is 16: block 32\u201347. Broadcast = last address of the block: 172.16.47.255." },
  { d: "Networking fundamentals", q: "How many usable hosts in a /29?", opts: ["6", "8", "14"], right: 0, why: "2^3 = 8 addresses, minus network and broadcast = 6." },
  { d: "Networking fundamentals", typed: true, q: "Type the network address of 10.20.37.66/27:", answer: "10.20.37.64", why: "/27 steps by 32: .0, .32, .64, .96 \u2014 66 snaps down to .64." },
  { d: "Networking fundamentals", q: "A switch port and a VLAN correspond to which domains, respectively?", opts: ["Broadcast / collision", "Collision / broadcast", "Both broadcast"], right: 1, why: "Each switched port is its own collision domain; each VLAN is one broadcast domain." },
  { d: "Networking fundamentals", q: "Which PDU name belongs to layer 2?", opts: ["Packet", "Frame", "Segment"], right: 1, why: "data \u2192 segment (L4) \u2192 packet (L3) \u2192 frame (L2) \u2192 bits (L1)." },
  { d: "Networking fundamentals", q: "MAC addresses are significant...", opts: ["End to end across the internet", "Only within the local layer-2 segment", "Only on trunk ports"], right: 1, why: "Frames are re-addressed at every routed hop; MACs never leave their L2 segment. IPs go end to end." },
  { t: "jncia", d: "Junos OS fundamentals", q: "Which plane forwards transit traffic on a Junos device?", opts: ["Routing Engine", "Packet Forwarding Engine", "mgd"], right: 1, why: "The PFE forwards in hardware using the table the RE compiled; transit traffic never visits the RE." },
  { t: "jncia", d: "Junos OS fundamentals", q: "Which daemon maintains the routing protocols and routing table?", opts: ["mgd", "rpd", "dcd"], right: 1, why: "rpd = routing protocol daemon. mgd is the CLI/config; dcd handles interfaces." },
  { t: "jncia", d: "Junos OS fundamentals", q: "The routing table and the forwarding table relate how?", opts: ["Same table, two names", "RE builds the routing table, derives the forwarding table, pushes it to the PFE", "PFE builds both"], right: 1, why: "Direction matters and the exam tests it: routing table (RE, all known routes) \u2192 forwarding table (best paths) \u2192 PFE." },
  { t: "jncia", d: "Junos OS fundamentals", q: "One Junos trait the exam loves:", opts: ["Different OS per platform family", "One modular OS across routing, switching and security platforms", "GUI-only management"], right: 1, why: "A single Junos with modular daemons runs across EX, MX, SRX \u2014 same CLI, same commit model." },
  { t: "jncia", d: "CLI & configuration", q: "You are at [edit interfaces ge-0/0/1]. Which command returns to the very top of the hierarchy?", opts: ["up", "top", "exit configuration-mode"], right: 1, why: "up climbs one level; top jumps to [edit]. exit from the top leaves configuration mode." },
  { t: "jncia", d: "CLI & configuration", q: "commit confirmed 5 does what?", opts: ["Commits after a 5-minute delay", "Commits now, auto-rolls back in 5 minutes unless you confirm with another commit", "Commits 5 times"], right: 1, why: "The remote-change lifesaver: if your change cuts you off, the box restores itself in 5 minutes." },
  { t: "jncia", d: "CLI & configuration", q: "Which command shows the differences between the candidate and active configuration?", opts: ["show | compare", "show configuration", "compare rollback"], right: 0, why: "show | compare in configuration mode diffs candidate against active \u2014 read it before every commit." },
  { t: "jncia", d: "CLI & configuration", q: "rollback 0 does what?", opts: ["Reboots", "Discards candidate edits by reloading the active config into the candidate", "Restores the rescue config"], right: 1, why: "rollback 0 = 'undo my uncommitted edits'. rollback 1 = previous commit; rollback rescue = your saved snapshot." },
  { t: "jncia", d: "CLI & configuration", q: "In operational mode, how do you run a configuration command without entering configure?", opts: ["You can't", "Prefix it with run", "It's the reverse: run executes OPERATIONAL commands from configuration mode"], right: 2, why: "run works from config mode outward (run show route). There's no inward equivalent \u2014 a favorite trick question." },
  { t: "jncia", d: "CLI & configuration", q: "What does the ? key do at any point in the Junos CLI?", opts: ["Deletes the line", "Context-sensitive help: lists what can come next", "Shows the manual"], right: 1, why: "? lists valid completions at the cursor \u2014 the single most useful key on a Junos box." },
  { t: "jncia", d: "Monitoring & maintenance", q: "Before upgrading Junos, best practice is to run...", opts: ["request system reboot", "request system storage cleanup", "rollback 1"], right: 1, why: "Full /var storage is the classic upgrade failure; cleanup rotates logs and removes old bundles first." },
  { t: "jncia", d: "Monitoring & maintenance", q: "The rescue configuration is...", opts: ["Automatic backup of every commit", "A known-good snapshot YOU save, restorable with rollback rescue", "The factory default"], right: 1, why: "You choose when to save it (request system configuration rescue save); it doesn't move with commit history." },
  { t: "jncia", d: "Monitoring & maintenance", q: "Which login class allows operational actions but no configuration changes?", opts: ["read-only", "operator", "super-user"], right: 1, why: "operator can restart daemons and clear sessions but cannot configure. read-only can only look." },
  { t: "jncia", d: "Monitoring & maintenance", q: "Root logs into a Junos device and sees %. To reach the Junos CLI it must...", opts: ["Reboot", "Type cli", "Type configure"], right: 1, why: "Root lands in the shell; cli starts the CLI. Then configure enters configuration mode." },
  { t: "jncia", d: "Routing fundamentals", q: "Junos route preference: which wins for the same prefix?", opts: ["OSPF internal (10) over static (5)", "Static (5) over OSPF internal (10)", "BGP (170) over both"], right: 1, why: "Lower preference wins: static 5 beats OSPF 10 beats BGP 170. The reason learned routes 'don't work' while a static lingers." },
  { t: "jncia", d: "Routing fundamentals", q: "A route to 0.0.0.0/0 is called...", opts: ["A null route", "The default route", "A martian"], right: 1, why: "The default route: where packets go when nothing more specific matches." },
  { t: "jncia", d: "Routing fundamentals", q: "Longest match rule: traffic to 10.1.1.7 with routes 10.0.0.0/8 and 10.1.1.0/24 in the table uses...", opts: ["10.0.0.0/8", "10.1.1.0/24", "Load-balanced"], right: 1, why: "The most specific (longest) prefix always wins, regardless of protocol preference." },
  { t: "jncia", d: "Routing fundamentals", q: "What must be true before an OSPF adjacency forms on a broadcast link?", opts: ["Same area and matching hello/dead timers", "Same router-id", "BGP configured"], right: 0, why: "Area mismatch or timer mismatch = no adjacency. Matching router-ids would be an error, not a requirement." },
  { t: "jncia", d: "Routing fundamentals", q: "eBGP vs iBGP:", opts: ["eBGP peers between different AS numbers; iBGP within one AS", "eBGP is encrypted", "iBGP uses UDP"], right: 0, why: "The e/i is about AS boundaries. Both ride TCP 179." },
  { t: "jncia", d: "Policy & filters", q: "A packet matches no term in an applied firewall filter. Its fate?", opts: ["Accepted", "Discarded by the implicit rule", "Logged"], right: 1, why: "Every filter ends with an invisible discard-everything. Hence the mandatory final accept term for legitimate traffic." },
  { t: "jncia", d: "Policy & filters", q: "reject differs from discard how?", opts: ["reject notifies the sender (ICMP prohibited); discard is silent", "reject is faster", "discard notifies the sender"], right: 0, why: "Same drop, different courtesy: reject answers, discard leaves the sender to time out." },
  { t: "jncia", d: "Policy & filters", q: "Export policy on a protocol controls...", opts: ["Which routes enter your routing table", "Which routes you advertise to others", "Which packets leave an interface"], right: 1, why: "Export = advertising out; import = accepting in. Packets are firewall-filter business, not policy." },
  { t: "jncia", d: "Policy & filters", q: "By default, BGP advertises to a peer...", opts: ["Everything in the routing table", "Only BGP-learned and BGP-originated routes", "Nothing"], right: 1, why: "Your statics and OSPF routes stay home unless an export policy sends them. The 'why isn't my static advertised' classic." },
  { t: "jncia", d: "Policy & filters", q: "Filter terms are evaluated...", opts: ["All terms, most specific wins", "Top-down, first match wins", "Random order"], right: 1, why: "Order is everything: a broad accept term above a block term neuters the block." },
  { d: "Networking fundamentals", q: "How many bits is an IPv6 address?", opts: ["64", "128", "256"], right: 1, why: "128 bits, written as eight groups of four hex digits. IPv4 is 32 bits." },
  { d: "Networking fundamentals", q: "Which is the correct abbreviation of 2001:0db8:0000:0000:0000:0000:0000:0001?", opts: ["2001:db8::1", "2001:db8::0::1", "2001::db8::1"], right: 0, why: "Drop leading zeros in each group, then replace one run of all-zero groups with :: — and :: may appear only once in an address." },
  { d: "Networking fundamentals", q: "An IPv6 link-local address always begins with...", opts: ["2000::/3", "fe80::/10", "ff00::/8"], right: 1, why: "fe80::/10 is link-local: every IPv6 interface has one, it is never routed off the link. 2000::/3 is global unicast, ff00::/8 is multicast." },
  { d: "Networking fundamentals", q: "Which IPv4 feature does IPv6 deliberately NOT have?", opts: ["Multicast", "Broadcast", "Unicast"], right: 1, why: "IPv6 removed broadcast entirely and uses multicast instead, which is why a message to all nodes on a link goes to ff02::1 rather than to a broadcast address." },
  { d: "Networking fundamentals", q: "In IPv6, which protocol does the job ARP does in IPv4?", opts: ["ICMPv6 Neighbor Discovery", "DHCPv6", "IGMPv6"], right: 0, why: "Neighbor Discovery, carried in ICMPv6, resolves addresses to MACs and also handles router discovery and duplicate address detection." },
  { d: "Networking fundamentals", q: "What is the standard subnet size for an IPv6 LAN?", opts: ["/24", "/64", "/128"], right: 1, why: "/64 is the convention: the upper 64 bits identify the subnet and the lower 64 the interface. /128 is a single host address." },
  { d: "Networking fundamentals", typed: true, q: "Type the IPv6 loopback address in its shortest form:", answer: "::1", why: "::1 is the IPv6 loopback, the equivalent of 127.0.0.1." },
  { d: "Networking fundamentals", typed: true, q: "Type the number of usable host addresses in a /30:", answer: "2", why: "4 addresses minus network and broadcast = 2. The classic point-to-point link size." },
  { d: "Networking fundamentals", q: "Convert 192 to binary (8 bits):", opts: ["11000000", "10000000", "11100000"], right: 0, why: "128 + 64 = 192, so the top two bits are set: 11000000. Worth knowing by sight — it is the /2 boundary in a mask octet." },
  { d: "Networking fundamentals", q: "Which mask does /26 correspond to in dotted decimal?", opts: ["255.255.255.192", "255.255.255.224", "255.255.255.128"], right: 0, why: "/26 = 2 bits into the last octet = 128 + 64 = 192. Blocks of 64: .0, .64, .128, .192." },
  { d: "Networking fundamentals", typed: true, q: "Type the broadcast address of 10.1.1.80/28:", answer: "10.1.1.95", why: "/28 steps by 16: .80 to .95. The last address of the block is the broadcast." },
  { d: "Networking fundamentals", q: "How many subnets does borrowing 3 host bits create?", opts: ["6", "8", "16"], right: 1, why: "2^3 = 8 subnets. The minus-two rule applies to usable HOSTS inside a subnet, not to the number of subnets." },
  { d: "Networking fundamentals", q: "A router receives a frame and forwards the packet. What happens to the layer-2 addresses?", opts: ["They are unchanged end to end", "They are rewritten for the next hop at every routed hop", "They are stripped and not replaced"], right: 1, why: "Each hop builds a new frame with its own MAC as source and the next hop's MAC as destination. The IP addresses stay the same; the MACs change at every hop." },
  { d: "Networking fundamentals", q: "A switch receives a frame for a destination MAC it has never learned. What does it do?", opts: ["Drops it", "Floods it out every port in the VLAN except the one it arrived on", "Sends it to the default gateway"], right: 1, why: "Unknown unicast flooding. The reply teaches the switch where that MAC lives, so the next frame is forwarded rather than flooded." },
  { d: "Networking fundamentals", q: "How does a switch learn MAC addresses?", opts: ["From the DESTINATION address of incoming frames", "From the SOURCE address of incoming frames", "From ARP requests only"], right: 1, why: "A switch learns from the source address of each arriving frame and pairs it with the port it arrived on. Destination addresses are what it looks up, not what it learns from." },
  { d: "Networking fundamentals", q: "Which protocol type describes OSPF?", opts: ["Distance-vector IGP", "Link-state IGP", "Path-vector EGP"], right: 1, why: "OSPF is link-state and an interior gateway protocol: every router builds an identical map of the area and runs Dijkstra on it. RIP is distance-vector; BGP is path-vector and the only EGP in use." },
  { d: "Networking fundamentals", q: "A collision domain and a broadcast domain are separated by which devices, respectively?", opts: ["Switch port and VLAN or router", "Router and switch", "Hub and switch"], right: 0, why: "Each switch port is its own collision domain. A broadcast domain ends at a VLAN boundary or a router — broadcasts are not forwarded between them." },
  { d: "Networking fundamentals", q: "TCP versus UDP, as the exam frames it:", opts: ["TCP is connection-oriented with acknowledged, ordered delivery; UDP is connectionless with neither", "UDP is encrypted", "TCP is faster"], right: 0, why: "TCP sets up a connection, numbers its segments and retransmits what is lost. UDP just sends, which is why it suits voice and video where a late packet is worse than a missing one." },
  { t: "jncia", d: "Junos OS fundamentals", q: "Which component makes the routing decisions and runs the protocols?", opts: ["Packet Forwarding Engine", "Routing Engine", "Chassis daemon"], right: 1, why: "The Routing Engine runs the protocols, builds the routing table and compiles the forwarding table. The PFE then forwards using that table." },
  { t: "jncia", d: "Junos OS fundamentals", q: "A packet arrives destined for the router's own management address. This is...", opts: ["Transit traffic", "Exception traffic, handled by the Routing Engine", "Discarded by default"], right: 1, why: "Traffic addressed TO the box, plus protocol packets and anything needing special handling, is exception traffic and goes up to the RE. Transit traffic passes through the PFE alone." },
  { t: "jncia", d: "Junos OS fundamentals", q: "Which daemon owns interfaces on a Junos device?", opts: ["rpd", "dcd", "mgd"], right: 1, why: "dcd is the device control daemon. rpd handles routing protocols, mgd handles the management interface and configuration." },
  { t: "jncia", d: "Junos OS fundamentals", q: "Which daemon do you talk to every time you type a configuration command?", opts: ["mgd", "rpd", "chassisd"], right: 0, why: "mgd, the management daemon, is the CLI and configuration process. Your candidate configuration lives in mgd until you commit." },
  { t: "jncia", d: "Junos OS fundamentals", q: "Why does the control plane / forwarding plane split matter operationally?", opts: ["It makes the CLI faster", "A busy or rebooting Routing Engine does not stop the PFE forwarding traffic", "It allows two configurations at once"], right: 1, why: "The forwarding table is already in the hardware, so transit traffic keeps moving independently of the RE. This is the basis of graceful Routing Engine switchover on dual-RE systems." },
  { t: "jncia", d: "Junos OS fundamentals", q: "Junos is based on which operating system?", opts: ["Linux", "FreeBSD", "Solaris"], right: 1, why: "Junos has a FreeBSD kernel underneath, which is why root lands at a % shell prompt and why file paths look like /var/log and /config." },
  { t: "jncia", d: "Junos OS fundamentals", q: "Where is the active configuration stored on a Junos device?", opts: ["/var/log/messages", "/config/juniper.conf.gz", "/etc/junos.conf"], right: 1, why: "The active configuration is /config/juniper.conf.gz, with recent rollbacks alongside it. Older rollbacks move to /var/db/config." },
  { t: "jncia", d: "Junos OS fundamentals", q: "What is the single most-cited advantage of one modular Junos across platforms?", opts: ["It is free", "The same CLI, commit model and feature behaviour across routing, switching and security platforms", "It needs no configuration"], right: 1, why: "One OS image family and one CLI means what you learn on an EX transfers to an MX or SRX. Modular daemons also mean one process can fail or restart without taking the box down." },
  { t: "jncia", d: "Junos OS fundamentals", q: "How many Junos software versions does a device typically hold?", opts: ["One only", "Two — the running package and an alternate it can boot from", "Unlimited"], right: 1, why: "Junos keeps a running partition and an alternate one. request system snapshot writes the current software and configuration to the alternate so the box can still boot if an upgrade goes wrong." },
  { t: "jncia", d: "Junos OS fundamentals", q: "What does 'graceful restart' of a Junos daemon give you?", opts: ["A full device reboot", "One process restarts while the rest of the system and forwarding continue", "A configuration rollback"], right: 1, why: "Because daemons are separate processes, restart rpd bounces routing alone. The PFE keeps forwarding on its existing table while rpd comes back." },
  { t: "jncia", d: "Junos OS fundamentals", q: "In Junos release 21.2R1, what does the R stand for?", opts: ["Release — a mainline, generally available build", "Restricted", "Revision of a beta"], right: 0, why: "R is a standard FRS or maintenance release. S builds are service releases for specific fixes, and X builds are special, platform-targeted releases." },
  { t: "jncia", d: "CLI & configuration", q: "Which key gives context-sensitive completion of a partially typed keyword?", opts: ["Tab or Space", "Ctrl-C", "Enter"], right: 0, why: "Tab completes keywords and, unlike Space, also completes user-defined names such as policy and filter names. Space only completes fixed keywords." },
  { t: "jncia", d: "CLI & configuration", q: "What does 'help reference ospf' give you that 'help topic' does not?", opts: ["Nothing, they are aliases", "The configuration statement reference for the hierarchy; help topic gives the conceptual explanation", "A list of commands"], right: 1, why: "help topic explains the concept, help reference gives the statement syntax and options. help syntax shows the syntax of a single statement, and help apropos searches by word." },
  { t: "jncia", d: "CLI & configuration", q: "The candidate configuration is...", opts: ["What the device is running right now", "Your working copy of the configuration, which does nothing until committed", "A backup of the last commit"], right: 1, why: "Edits land in the candidate. The active configuration keeps running untouched until commit swaps them, which is why show | compare before commit is safe and essential." },
  { t: "jncia", d: "CLI & configuration", q: "Two engineers enter configuration mode on the same box with plain 'configure'. What happens?", opts: ["The second is refused", "Both share one candidate configuration and can overwrite each other", "Each gets a private copy"], right: 1, why: "Plain configure shares the candidate, and a commit by either commits BOTH their changes. configure exclusive locks it; configure private gives each a separate candidate." },
  { t: "jncia", d: "CLI & configuration", q: "Which command enters configuration mode so that nobody else can change the candidate?", opts: ["configure private", "configure exclusive", "configure lock"], right: 1, why: "configure exclusive takes the lock outright. configure private gives you your own candidate but does not stop others having theirs." },
  { t: "jncia", d: "CLI & configuration", q: "You are at [edit protocols ospf area 0]. What does 'up 2' do?", opts: ["Moves two levels up, to [edit protocols]", "Exits configuration mode", "Shows two levels of configuration"], right: 0, why: "up takes an optional count. up alone goes one level; up 2 goes two; top goes straight to [edit]." },
  { t: "jncia", d: "CLI & configuration", q: "What does 'commit and-quit' do?", opts: ["Commits and leaves configuration mode in one step", "Commits and reboots", "Queues a commit for later"], right: 0, why: "A convenience for the end of a change: commit, then exit configuration mode, and it only exits if the commit succeeded." },
  { t: "jncia", d: "CLI & configuration", q: "What does 'commit check' do?", opts: ["Commits and asks for confirmation", "Validates the candidate configuration without activating it", "Compares against the rescue config"], right: 1, why: "It runs the full commit validation and reports errors, but changes nothing. The safe way to test a large paste before you make it live." },
  { t: "jncia", d: "CLI & configuration", q: "How do you record WHY a change was made, visible in the commit history?", opts: ["annotate", "commit comment \"text\"", "set system commit-message"], right: 1, why: "commit comment attaches a note to that commit, shown by show system commit. annotate is different: it puts a comment inside the configuration itself, next to a statement." },
  { t: "jncia", d: "CLI & configuration", q: "What is the difference between 'deactivate' and 'delete'?", opts: ["None", "deactivate keeps the statement but marks it inactive so it has no effect; delete removes it", "deactivate removes it on next reboot"], right: 1, why: "A deactivated statement stays in the configuration tagged inactive: and is ignored at commit. activate turns it back on. It is how you disable something you intend to restore." },
  { t: "jncia", d: "CLI & configuration", q: "Which command reorders terms in a firewall filter?", opts: ["insert", "move", "rename"], right: 0, why: "insert <term> before|after <term>. Order is everything in a filter, and insert is the only way to change it without deleting and retyping." },
  { t: "jncia", d: "CLI & configuration", q: "'rollback 1' loads which configuration into the candidate?", opts: ["The rescue configuration", "The configuration active before the most recent commit", "The factory default"], right: 1, why: "rollback 0 is the current active config (discarding your edits); rollback 1 is the one before that. Junos keeps up to 49 previous commits. A commit is still needed to activate a rollback." },
  { t: "jncia", d: "CLI & configuration", q: "How do you restore the rescue configuration?", opts: ["request system configuration rescue load", "rollback rescue, then commit", "load override rescue"], right: 1, why: "rollback rescue loads it into the candidate; it does nothing until you commit. You save it with request system configuration rescue save." },
  { t: "jncia", d: "CLI & configuration", q: "Which output filter shows the configuration as a list of set commands?", opts: ["| display set", "| display inheritance", "| compare"], right: 0, why: "| display set converts the curly-brace configuration into paste-able set commands — the fastest way to copy part of one device's configuration onto another." },
  { t: "jncia", d: "CLI & configuration", q: "What does '| no-more' do?", opts: ["Suppresses all output", "Prints the whole output at once instead of a page at a time", "Shows only the last page"], right: 1, why: "Without it, long output pauses at each screenful. | no-more dumps it all, which is what you want when copying output or piping it onward." },
  { t: "jncia", d: "CLI & configuration", q: "What does '| except error' do?", opts: ["Shows only lines containing error", "Shows every line EXCEPT those containing error", "Stops at the first error"], right: 1, why: "except is the inverse of match. Both take regular expressions, so | except \"(error|drop)\" works too." },
  { t: "jncia", d: "CLI & configuration", q: "What does '| find ge-0/0/10' do in a long output?", opts: ["Highlights that text", "Skips the output until the first matching line, then shows everything after it", "Counts the matches"], right: 1, why: "find jumps you to the first match and keeps going. match filters to matching lines only; find keeps the context after the match." },
  { t: "jncia", d: "CLI & configuration", q: "Which is the correct Junos interface naming convention for a physical port?", opts: ["type-fpc/pic/port", "type-slot/module/port/unit", "type/port/fpc"], right: 0, why: "ge-0/0/1 is media type ge, FPC 0, PIC 0, port 1. The logical unit is added after a dot: ge-0/0/1.0." },
  { t: "jncia", d: "CLI & configuration", q: "Where does an IPv4 address belong in the interface hierarchy?", opts: ["Directly under the physical interface", "Under a logical unit, in family inet", "Under chassis"], right: 1, why: "set interfaces ge-0/0/1 unit 0 family inet address 10.0.0.1/24. Addresses are a property of the logical unit, not the physical port — which is how one port carries several subnets." },
  { t: "jncia", d: "CLI & configuration", q: "Which interface properties are physical rather than logical?", opts: ["IP address and VLAN id", "MTU, link speed, duplex and description of the port itself", "Firewall filters"], right: 1, why: "Physical properties describe the port: speed, duplex, MTU, hold timers. Logical properties live on a unit: addresses, families, VLAN tagging, filters." },
  { t: "jncia", d: "CLI & configuration", q: "What is the management interface called on most Junos devices?", opts: ["lo0", "fxp0 or me0", "irb.0"], right: 1, why: "fxp0 on routers, me0 on EX switches — out-of-band, not part of the forwarding path. lo0 is the loopback, used for router-id and Routing Engine protection filters." },
  { t: "jncia", d: "CLI & configuration", q: "Every user who logs into a Junos device must have...", opts: ["A login class", "An SSH key", "Root access"], right: 0, why: "A user account maps to exactly one login class, and the class carries the permission bits. No class means no login." },
  { t: "jncia", d: "CLI & configuration", q: "Which predefined login class can run operational commands and clear things, but cannot configure?", opts: ["read-only", "operator", "super-user"], right: 1, why: "operator has clear, network, reset, trace and view. read-only has view alone; super-user has all; unauthorized has none." },
  { t: "jncia", d: "CLI & configuration", q: "What is the difference between the 'interface' and 'interface-control' permission bits?", opts: ["None", "interface is read-only; interface-control allows read and write", "interface-control is for physical ports only"], right: 1, why: "Most permission flags come in a plain read-only form and a -control form that adds write. Permissions are not cumulative, so every flag a class needs must be listed." },
  { t: "jncia", d: "CLI & configuration", q: "With no 'authentication-order' configured, how does Junos authenticate a user?", opts: ["It denies all logins", "Local password only", "RADIUS then local"], right: 1, why: "The default is local password authentication. authentication-order [ radius tacplus password ] is what adds external servers." },
  { t: "jncia", d: "CLI & configuration", q: "authentication-order is set to [ radius ] with no password method. The RADIUS server does not respond. What happens?", opts: ["Login fails outright", "Junos falls back to local password authentication anyway", "The user is granted unauthorized class"], right: 1, why: "A server that does not RESPOND always falls back to the local password as a last resort, even when password is not listed. A server that actively REJECTS only falls back if password IS listed. That distinction is a favourite exam trap." },
  { t: "jncia", d: "CLI & configuration", q: "Which statement sets the root password?", opts: ["set system login user root password", "set system root-authentication plain-text-password", "set system password root"], right: 1, why: "Root is special: it lives at [edit system root-authentication], not under login user. A commit is refused on a factory-default box until the root password is set." },
  { t: "jncia", d: "CLI & configuration", q: "What are configuration groups for?", opts: ["Grouping users by permission", "Writing a block of configuration once and inheriting it at many hierarchy levels", "Grouping interfaces into a bundle"], right: 1, why: "Define under [edit groups <name>], then apply with apply-groups. Common uses are a shared baseline across devices and repeated per-interface settings via wildcards." },
  { t: "jncia", d: "CLI & configuration", q: "Which command shows the configuration INCLUDING statements inherited from groups?", opts: ["show configuration", "show configuration | display inheritance", "show groups"], right: 1, why: "Plain show configuration shows only what is configured directly. | display inheritance expands inherited statements and annotates each with the group it came from." },
  { t: "jncia", d: "CLI & configuration", q: "A statement is configured directly AND inherited from a group. Which wins?", opts: ["The group", "The one configured directly at that hierarchy level", "The commit fails"], right: 1, why: "Most specific wins: a direct configuration always overrides an inherited one. Among several groups in apply-groups, the first listed takes priority." },
  { t: "jncia", d: "CLI & configuration", q: "What does 'apply-groups-except' do?", opts: ["Deletes a group", "Stops a group being inherited at that particular hierarchy level", "Applies a group to everything except interfaces"], right: 1, why: "It carves out an exception where a group is applied broadly higher up but must not apply at one spot — cleaner than re-specifying values to override it." },
  { t: "jncia", d: "CLI & configuration", q: "Which statement configures the device to send its configuration to an archive site on every commit?", opts: ["set system archival configuration transfer-on-commit", "set system commit archive", "set system backup on-commit"], right: 0, why: "Under [edit system archival configuration], transfer-on-commit sends it after each commit; transfer-interval sends it periodically instead. archive-sites lists the destinations in priority order." },
  { t: "jncia", d: "CLI & configuration", q: "Which statement enables the J-Web graphical interface over HTTPS?", opts: ["set system services j-web", "set system services web-management https system-generated-certificate", "set system login j-web"], right: 1, why: "J-Web lives under [edit system services web-management], with http or https sub-statements. The system-generated-certificate option makes the device create its own self-signed certificate for HTTPS." },
  { t: "jncia", d: "CLI & configuration", q: "Which statement enables SSH access to the device?", opts: ["set system services ssh", "set system login ssh", "set protocols ssh"], right: 0, why: "Management services are all under [edit system services]: ssh, telnet, ftp, netconf, web-management. None of them is on by default on a factory-default configuration." },
  { t: "jncia", d: "CLI & configuration", q: "To have a device keep accurate time from a server, you configure...", opts: ["set system ntp server <address>", "set system time-server <address>", "set protocols ntp <address>"], right: 0, why: "set system ntp server <ip>. Accurate time matters more than it sounds: log timestamps and commit history are useless for correlating a fault without it." },
  { t: "jncia", d: "CLI & configuration", q: "Which statement sends log messages to a remote syslog collector?", opts: ["set system syslog host 10.1.1.5 any any", "set system logging remote 10.1.1.5", "set protocols syslog host 10.1.1.5"], right: 0, why: "Under [edit system syslog] you pick a destination — host <ip>, file <name>, user, or console — then a facility and a severity. any any means every facility at every severity." },
  { t: "jncia", d: "CLI & configuration", q: "In 'set system syslog file messages any notice', what is 'notice'?", opts: ["The filename", "The severity threshold — messages at this level and MORE severe are logged", "The facility"], right: 1, why: "Severity, from most to least severe: emergency, alert, critical, error, warning, notice, info, debug. Setting notice also captures everything above it." },
  { t: "jncia", d: "CLI & configuration", q: "Which statement configures a read-only SNMP community?", opts: ["set snmp community public authorization read-only", "set system snmp read-only public", "set protocols snmp community public"], right: 0, why: "SNMP has its own top-level hierarchy, [edit snmp]. The authorization option is read-only or read-write; a community with no authorization defaults to read-only." },
  { t: "jncia", d: "CLI & configuration", q: "A factory-default Junos device refuses your first commit. The most likely reason is...", opts: ["No interfaces configured", "The root password has not been set", "No hostname"], right: 1, why: "Junos will not commit until root-authentication is set. It is the first thing you configure on a new box, before the hostname or anything else." },
  { t: "jncia", d: "CLI & configuration", q: "Where do you see who committed what, and when?", opts: ["show log messages", "show system commit", "show configuration | compare"], right: 1, why: "show system commit lists the rollback number, timestamp, user and any commit comment — the audit trail, and how you pick the right number for rollback <n>." },
  { t: "jncia", d: "Monitoring & maintenance", q: "Which command installs a new Junos software package?", opts: ["request system software add <package>", "request system upgrade <package>", "load software <package>"], right: 0, why: "request system software add. The new release does not become active until the device reboots, so the reboot option is usually added." },
  { t: "jncia", d: "Monitoring & maintenance", q: "What does the 'no-validate' option on a software add do?", opts: ["Skips the checksum", "Suppresses the default check of the existing configuration against the new release", "Installs without rebooting"], right: 1, why: "When the package is a different release, Junos validates your configuration against it by default. no-validate skips that — faster, but you lose the warning that a statement you rely on has changed." },
  { t: "jncia", d: "Monitoring & maintenance", q: "What is 'request system snapshot' for?", opts: ["Saving the configuration", "Copying the running software and configuration to the alternate boot media", "Taking a screenshot of the CLI"], right: 1, why: "It writes the current system to the backup partition so the device can still boot if an upgrade fails. The configuration equivalent is the rescue config." },
  { t: "jncia", d: "Monitoring & maintenance", q: "'request system software rollback' reverts what?", opts: ["The configuration to the previous commit", "The software to the previously installed package", "The interface counters"], right: 1, why: "It is the SOFTWARE rollback. Configuration rollback is rollback <n> in configuration mode. Confusing the two is a classic exam trap." },
  { t: "jncia", d: "Monitoring & maintenance", q: "Root password recovery on a Junos device requires...", opts: ["An SSH session as a super-user", "Console access, because you must interrupt the boot sequence", "A TFTP server"], right: 1, why: "You press Space at the loader prompt, boot -s into single-user mode and type recovery. None of that is reachable over the network, which is also why physical access to a switch is a security matter." },
  { t: "jncia", d: "Monitoring & maintenance", q: "During root password recovery, after 'set system root-authentication plain-text-password', what must you do?", opts: ["Nothing, it applies at once", "commit — then exit and reboot", "Run request system snapshot"], right: 1, why: "It is an ordinary configuration change in an unusual situation, so it still needs a commit. People forget this and reboot into the same locked-out box." },
  { t: "jncia", d: "Monitoring & maintenance", q: "Which command zeroes interface counters so your next reading starts clean?", opts: ["clear interfaces statistics", "reset interfaces", "clear counters"], right: 0, why: "clear interfaces statistics, optionally all or one interface. Essential before a fault reproduction — otherwise you cannot tell old errors from new ones." },
  { t: "jncia", d: "Monitoring & maintenance", q: "You suspect an MTU problem. Which ping proves it?", opts: ["ping <host> count 100", "ping <host> size 1472 do-not-fragment", "ping <host> rapid"], right: 1, why: "do-not-fragment sets the DF bit, so a packet too big for the path is dropped rather than fragmented. Walking the size down finds the real MTU." },
  { t: "jncia", d: "Monitoring & maintenance", q: "Which command shows disk usage, and why check it before an upgrade?", opts: ["show system storage — a full /var is the classic upgrade failure", "show chassis hardware", "show system memory"], right: 0, why: "The image has to land somewhere. request system storage cleanup rotates logs and removes old packages to make room." },
  { t: "jncia", d: "Monitoring & maintenance", q: "Which command identifies what is physically cabled to each port?", opts: ["show interfaces terse", "show lldp neighbors", "show arp"], right: 1, why: "LLDP neighbours name the device and port at the other end of each cable — the fastest way to map a patch panel without walking to the rack." },
  { t: "jncia", d: "Monitoring & maintenance", q: "'request system zeroize' does what?", opts: ["Clears counters", "Erases configuration and logs, returning the device to factory default, and reboots", "Zeroes the routing table"], right: 1, why: "A full wipe including keys and logs. It is what you run before a device leaves your custody — and it asks first, because there is no undo." },
  { t: "jncia", d: "Monitoring & maintenance", q: "Which command shows the light levels on a fibre link?", opts: ["show interfaces diagnostics optics", "show chassis environment", "show interfaces extensive"], right: 0, why: "Optical DOM readings: transmit and receive power, laser bias, temperature. A receive level near the low warning threshold is a dirty or failing link before it drops." },
  { t: "jncia", d: "Routing fundamentals", q: "Two routes to the same prefix: static preference 5 and a static with 'preference 7'. Which is active?", opts: ["Preference 5", "Preference 7", "Both, load-shared"], right: 0, why: "Lower preference always wins. Raising a backup static above the primary is exactly how you build a floating static route." },
  { t: "jncia", d: "Routing fundamentals", q: "Which statement overrides the preference of one static route?", opts: ["set routing-options static route 10.0.0.0/8 preference 7", "set routing-options preference static 7", "set protocols static preference 7"], right: 0, why: "preference can be set per route, or under static defaults for all of them. qualified-next-hop sets it per next hop, which is how a primary and backup pair is built on one route." },
  { t: "jncia", d: "Routing fundamentals", q: "A static route with next-hop 'discard' does what to matching packets?", opts: ["Forwards them to the default route", "Drops them silently", "Drops them and sends an ICMP unreachable"], right: 1, why: "discard is a silent black hole; reject drops and replies with ICMP destination unreachable. reject lets an application fail fast, discard makes it time out." },
  { t: "jncia", d: "Routing fundamentals", q: "The default preference of an aggregate route is...", opts: ["5", "130", "170"], right: 1, why: "Aggregate routes install at 130, well above static and the IGPs, because they are a summary rather than a real path. Their default next hop is reject." },
  { t: "jncia", d: "Routing fundamentals", q: "An aggregate route becomes active only when...", opts: ["It is committed", "At least one more specific contributing route is active", "BGP is configured"], right: 1, why: "That conditional behaviour is the point: the summary is advertised only while something behind it is actually reachable, so you do not black-hole traffic for a site that is down." },
  { t: "jncia", d: "Routing fundamentals", q: "What are 'martian' addresses in Junos?", opts: ["Routes with an unreachable next hop", "Prefixes whose routing information is ignored entirely, whatever protocol offers them", "IPv6-only addresses"], right: 1, why: "A martian is filtered before any policy sees it. View them with show route martians; the list is editable under [edit routing-options martians]." },
  { t: "jncia", d: "Routing fundamentals", q: "In a routing instance named 'foo', what is the IPv4 unicast routing table called?", opts: ["inet.0", "foo.inet.0", "foo.0"], right: 1, why: "Instance tables are named <instance>.<family>.<number>. The default instance has no prefix, which is why plain inet.0 is the one you usually read." },
  { t: "jncia", d: "Routing fundamentals", q: "'instance-type virtual-router' differs from 'vrf' how?", opts: ["virtual-router is for IPv6 only", "virtual-router needs no route distinguisher or VRF import and export policies", "They are identical"], right: 1, why: "virtual-router gives you separate routing and forwarding tables for non-VPN use. vrf adds the MPLS Layer 3 VPN machinery: a route distinguisher and vrf-import and vrf-export policies." },
  { t: "jncia", d: "Routing fundamentals", q: "Junos default preference for BGP is...", opts: ["20 for external, 200 for internal", "170 for both internal and external", "100"], right: 1, why: "Unlike Cisco's split administrative distance, Junos uses 170 for both. Choosing between an iBGP and an eBGP path is therefore done by the BGP path-selection algorithm, not by preference." },
  { t: "jncia", d: "Routing fundamentals", q: "A route is in show route but has no star. What does that mean?", opts: ["It is hidden", "It is in the table but not active — something with a lower preference won this destination", "It is a static route"], right: 1, why: "The star marks the active route. An unstarred one is a standby copy, kept so it can take over the moment the winner is withdrawn." },
  { t: "jncia", d: "Routing fundamentals", q: "You configure a static route, commit, and it does not appear in show route at all. Why?", opts: ["The commit failed", "The next hop is not on a subnet this device has a live interface in, so the route is hidden", "Static routes need a routing protocol"], right: 1, why: "An unresolvable next hop means the box cannot work out an outgoing interface, so the route is hidden and plain show route omits it. show route hidden lists it." },
  { t: "jncia", d: "Routing fundamentals", q: "Which is the FIRST tiebreaker when choosing between two routes to overlapping prefixes?", opts: ["Protocol preference", "Longest prefix match", "Metric"], right: 1, why: "Specificity beats trust: a /24 from BGP at preference 170 beats a /8 from a static at 5, because longest match is decided before preference is consulted." },
  { t: "jncia", d: "Policy & filters", q: "What is the default BGP export policy in Junos?", opts: ["Advertise everything in the routing table", "Readvertise active BGP routes only", "Advertise nothing"], right: 1, why: "Your statics, direct and OSPF routes stay home unless an export policy sends them. This is the answer to 'why is my static route not being advertised'." },
  { t: "jncia", d: "Policy & filters", q: "What is the default OSPF export policy?", opts: ["Accept everything", "Reject everything", "There is none"], right: 1, why: "OSPF exports nothing by default. An OSPF export policy is how you inject NON-OSPF routes, such as statics, into OSPF as AS-external routes." },
  { t: "jncia", d: "Policy & filters", q: "Which protocol's default IMPORT policy cannot be changed?", opts: ["BGP", "OSPF", "RIP"], right: 1, why: "OSPF must accept all OSPF routes into the link-state database for the protocol to work — every router needs an identical map. You can only policy-filter OSPF EXTERNAL routes." },
  { t: "jncia", d: "Policy & filters", q: "A route reaches the end of a policy chain without matching a terminating action. What happens?", opts: ["It is rejected", "The protocol's DEFAULT policy decides", "The chain restarts"], right: 1, why: "Falling off the end hands the route to the protocol default — accept for a BGP import, reject for an OSPF export. Note the contrast with firewall filters, which end in an implicit discard." },
  { t: "jncia", d: "Policy & filters", q: "A policy term has a 'from' clause but no 'then' action. What happens to a matching route?", opts: ["It is accepted", "Evaluation continues to the next term", "It is rejected"], right: 1, why: "In a ROUTING POLICY, no action means carry on. In a FIREWALL FILTER, a term with no then means implicitly accept. The two are opposites and the exam exploits that." },
  { t: "jncia", d: "Policy & filters", q: "A policy term with no 'from' clause matches...", opts: ["Nothing", "Every route", "Only direct routes"], right: 1, why: "No match condition means match everything — which is how a final catch-all term is written, exactly like a final accept or reject term in a filter." },
  { t: "jncia", d: "Policy & filters", q: "What does 'then next policy' do?", opts: ["Skips to the next term", "Skips the rest of THIS policy and evaluates the next policy in the chain", "Ends evaluation and accepts"], right: 1, why: "Non-terminating actions in the term still run, but any accept or reject there is skipped and the remaining terms of that policy are too. next term is the smaller version that stays inside the policy." },
  { t: "jncia", d: "Policy & filters", q: "The implicit action at the end of every Junos firewall filter is...", opts: ["accept", "discard", "There is none"], right: 1, why: "Every filter ends in an invisible discard. A filter with one accept term silently drops everything else — including your own SSH session and your routing protocols." },
  { t: "jncia", d: "Policy & filters", q: "A firewall filter term has a 'from' clause but no 'then'. What happens to a matching packet?", opts: ["Accepted", "Discarded", "Counted only"], right: 0, why: "In a filter, no action means implicitly accept. The opposite of routing-policy behaviour, where no action means continue to the next term." },
  { t: "jncia", d: "Policy & filters", q: "You want to protect the Routing Engine itself with a filter. Where do you apply it?", opts: ["To every physical interface", "To lo0, the loopback interface", "Under [edit system services]"], right: 1, why: "Traffic destined for the box passes through lo0 on its way to the RE, so a filter there controls management and protocol traffic in one place rather than on every port." },
  { t: "jncia", d: "Policy & filters", q: "What does the 'count' action in a filter term do?", opts: ["Limits the packet rate", "Increments a named counter, readable with show firewall", "Counts the terms"], right: 1, why: "count is a non-terminating action modifier, so the packet still hits accept or discard. It is the cheapest way to prove whether a term is matching at all." },
  { t: "jncia", d: "Policy & filters", q: "The difference between the filter actions 'log' and 'syslog' is...", opts: ["None", "log writes to a local in-memory buffer only; syslog goes to the system logging infrastructure and can reach a remote server", "syslog is faster"], right: 1, why: "log is read with show firewall log and is lost on a restart. syslog lands in /var/log and can be forwarded off-box, which is what you want for anything you need to keep." },
  { t: "jncia", d: "Policy & filters", q: "What is a policer for?", opts: ["Filtering by source address", "Rate-limiting traffic, with an action for traffic that exceeds the limit", "Logging matches"], right: 1, why: "A policer defines a bandwidth limit and a burst size, then says what happens to out-of-contract traffic: discard, or re-mark its loss priority or forwarding class." },
  { t: "jncia", d: "Policy & filters", q: "In 'from port 23', what does 'port' match?", opts: ["Destination port only", "Source OR destination port", "The physical interface"], right: 1, why: "port is an OR of both directions, so it matches requests and replies. If you mean one direction, use source-port or destination-port — and you cannot combine port with either of those in the same term." },
  { t: "jncia", d: "Policy & filters", q: "Why should a port match always be paired with a protocol match?", opts: ["It is faster", "Without 'protocol tcp' or 'udp' the term can match bytes at that offset in a non-TCP/UDP packet", "The commit fails otherwise"], right: 1, why: "A port number only means something inside a TCP or UDP header. Fragments do not carry one at all, which is the subtler half of the same problem." },
  { t: "jncia", d: "Policy & filters", q: "What does unicast reverse-path-forwarding (RPF) check?", opts: ["That the destination is reachable", "That the packet's SOURCE address arrived on the interface the box would use to reach it", "That the TTL is valid"], right: 1, why: "It is anti-spoofing: a packet claiming a source the box would reach some other way is almost certainly forged, so it is dropped on arrival." },
  { t: "jncia", d: "Policy & filters", q: "Is unicast RPF enabled by default in Junos?", opts: ["Yes, on all interfaces", "No — it is disabled until configured per logical interface", "Only on routers"], right: 1, why: "You enable it with set interfaces <if> unit <n> family inet rpf-check. Juniper also advises against enabling it on core-facing interfaces, where asymmetric paths are normal and legitimate." },
  { t: "jncia", d: "Policy & filters", q: "RPF 'mode loose' differs from the default strict mode how?", opts: ["Loose checks only that the source prefix exists in the routing table, not that it is reachable via the incoming interface", "Loose checks the destination too", "Loose disables the check"], right: 0, why: "Strict demands the right incoming interface, which breaks on asymmetric paths. Loose only catches sources that are unroutable anywhere, so it is safe where traffic can legitimately arrive from several directions." },
  { t: "jncia", d: "Policy & filters", q: "What is the RPF 'fail-filter' option for?", opts: ["Disabling RPF on failure", "Evaluating a firewall filter on packets that FAIL the RPF check, so you can count or log them instead of dropping them silently", "Filtering the routing table"], right: 1, why: "The default on failure is a silent drop, which gives you nothing to diagnose with. A fail-filter lets you count, log or even accept them while you work out whether the drop is legitimate." },
  { t: "jncia", d: "Policy & filters", q: "'import' and 'export' on a routing protocol control...", opts: ["Packets entering and leaving an interface", "Routes accepted INTO the routing table and routes advertised OUT to neighbours", "Configuration loading"], right: 1, why: "Policy is about routes, filters are about packets. Mixing up the two vocabularies is one of the most common JNCIA mistakes." },
  { t: "netplus", d: "Networking concepts", q: "What is the maximum length of a copper twisted-pair channel?", opts: ["55 metres", "100 metres", "185 metres"], right: 1, why: "100 m total channel including patch cords. Cat6 only reaches 10 Gbps within 55 m, but the length limit itself is 100 m." },
  { t: "netplus", d: "Networking concepts", q: "Which fiber type uses a roughly 9-micron core and a laser source for long distances?", opts: ["Multi-mode", "Single-mode", "Both equally"], right: 1, why: "Single-mode has the tiny core and laser source, reaching tens of kilometres. Multi-mode has a wider core, an LED or VCSEL, and far shorter reach." },
  { t: "netplus", d: "Networking concepts", q: "In IaaS, who is responsible for patching the guest operating system?", opts: ["The provider", "You, the customer", "Nobody — it is automatic"], right: 1, why: "IaaS delivers infrastructure; the OS and everything above it is yours. PaaS would manage the OS for you." },
  { t: "netplus", d: "Networking concepts", q: "Which hypervisor type runs directly on bare metal?", opts: ["Type 1", "Type 2", "Both"], right: 0, why: "Type 1 runs directly on the hardware and is the datacenter standard. Type 2 runs as an application on an existing desktop OS." },
  { t: "netplus", d: "Networking concepts", q: "A hybrid cloud combines which two?", opts: ["Two public providers", "Private and public cloud, connected", "Cloud and on-premises backup only"], right: 1, why: "Hybrid means private plus public, linked together. Two public providers would be multi-cloud." },
  { t: "netplus", d: "Network implementation", q: "Which three 2.4 GHz channels do not overlap?", opts: ["1, 5, 9", "1, 6, 11", "2, 7, 12"], right: 1, why: "Only 1, 6 and 11 are spaced far enough apart to avoid overlapping. Any other combination degrades neighbouring APs." },
  { t: "netplus", d: "Network implementation", q: "Which standard is known as Wi-Fi 6?", opts: ["802.11ac", "802.11ax", "802.11n"], right: 1, why: "802.11ax is Wi-Fi 6 (and 6E with the 6 GHz band). 802.11ac is Wi-Fi 5, 802.11n is Wi-Fi 4." },
  { t: "netplus", d: "Network implementation", q: "An enterprise wants per-user wireless credentials rather than a shared passphrase. What is needed?", opts: ["WPA3-Personal", "802.1X with RADIUS", "A hidden SSID"], right: 1, why: "802.1X with a RADIUS server authenticates each user individually, which also allows revoking one user without changing everyone's configuration." },
  { t: "netplus", d: "Network implementation", q: "What does a default gateway do for a host?", opts: ["Resolves names to addresses", "Forwards traffic destined outside the local subnet", "Assigns the host its IP address"], right: 1, why: "Anything not on the local subnet is handed to the default gateway. DNS resolves names; DHCP assigns addresses." },
  { t: "netplus", d: "Network operations", q: "Which protocol reports what is directly cabled to a switch port, vendor-neutrally?", opts: ["CDP", "LLDP", "SNMP"], right: 1, why: "LLDP (802.1AB) is the vendor-neutral neighbour discovery protocol. CDP is Cisco's proprietary equivalent." },
  { t: "netplus", d: "Network operations", q: "Which protocol is used to collect device metrics for monitoring systems?", opts: ["SNMP", "SMTP", "SFTP"], right: 0, why: "SNMP polls devices for counters and state and receives traps. SMTP is mail, SFTP is file transfer." },
  { t: "netplus", d: "Network operations", q: "Why does a network rely on NTP?", opts: ["To speed up DNS", "To keep timestamps consistent so logs across devices can be correlated", "To assign IP addresses"], right: 1, why: "Without synchronised clocks, correlating an event across several devices' logs becomes guesswork, and certificate validation can fail." },
  { t: "netplus", d: "Network operations", q: "What does a syslog server provide that local device logs do not?", opts: ["Faster logging", "Centralised, retained logs that survive a device failure or reboot", "Encrypted storage by default"], right: 1, why: "Centralisation means logs persist beyond the device and can be searched across the estate — essential when the device itself is the thing that failed." },
  { t: "netplus", d: "Network security", q: "An attacker overflows a switch's MAC table so it floods frames to every port. Which attack is this?", opts: ["ARP spoofing", "MAC flooding", "VLAN hopping"], right: 1, why: "MAC flooding exhausts the table and forces the switch to flood, exposing traffic. Port security limiting MACs per port is the defence." },
  { t: "netplus", d: "Network security", q: "Which control specifically blocks a rogue DHCP server on an access port?", opts: ["DHCP snooping", "802.1X", "Port mirroring"], right: 0, why: "DHCP snooping classifies ports as trusted or untrusted and drops server-side DHCP messages from untrusted ports." },
  { t: "netplus", d: "Network security", q: "Which part of the CIA triad does a denial-of-service attack target?", opts: ["Confidentiality", "Integrity", "Availability"], right: 2, why: "DoS does not read or alter data; it makes the service unreachable, which is precisely availability." },
  { t: "netplus", d: "Network security", q: "What is the difference between RADIUS and TACACS+?", opts: ["RADIUS is newer", "TACACS+ separates authentication, authorization and accounting and uses TCP; RADIUS combines authn and authz over UDP", "They are identical"], right: 1, why: "TACACS+ separates all three functions and is favoured for device administration; RADIUS combines authentication and authorization and dominates wireless and network access." },
  { t: "netplus", d: "Network security", q: "Which VPN technology is typically used for site-to-site tunnels?", opts: ["IPsec", "TLS/SSL portal VPN", "SSH"], right: 0, why: "IPsec is the standard for permanent site-to-site tunnels. TLS-based VPNs are more common for individual remote users." },
  { t: "netplus", d: "Network troubleshooting", q: "In the seven-step methodology, what immediately follows testing a theory that proves CORRECT?", opts: ["Document findings", "Establish a plan of action and identify potential effects", "Verify full system functionality"], right: 1, why: "A confirmed theory moves to step 4, planning the action and its likely effects, before implementation in step 5." },
  { t: "netplus", d: "Network troubleshooting", q: "Your theory is disproven by testing. What does the methodology require?", opts: ["Implement a fix anyway", "Establish a new theory, or escalate", "Document and close"], right: 1, why: "A disproven theory returns you to step 2. Acting on a cause you have already ruled out creates new faults." },
  { t: "netplus", d: "Network troubleshooting", q: "Which step is explicitly required after implementing a solution and before documenting?", opts: ["Verify full system functionality and implement preventive measures", "Close the ticket", "Notify the user"], right: 0, why: "Step 6 requires verifying the entire system rather than only the reported symptom, plus prevention where possible. Documentation is step 7." },
  { t: "netplus", d: "Network troubleshooting", q: "A user reports no connectivity. Their link light is on and they have an APIPA address (169.254.x.x). What does that indicate?", opts: ["DNS failure", "The host could not reach a DHCP server", "A routing loop"], right: 1, why: "An APIPA address is self-assigned when no DHCP offer arrives. The physical link is fine, so look at the DHCP path, VLAN membership, or the server itself." },
  { t: "netplus", d: "Network troubleshooting", q: "Which command-line tool shows the path a packet takes toward a destination?", opts: ["ping", "traceroute / tracert", "netstat"], right: 1, why: "Traceroute reveals each hop, so the last responding hop points at where the path breaks. Ping only tells you success or failure end to end." },
];

function examAllQuestions(){
  var all = [];
  var track = typeof activeTrackId === "function" ? activeTrackId() : "jncia";
  var doms = typeof COURSE_DOMAINS !== "undefined" ? COURSE_DOMAINS : {};
  EXAM_BANK.forEach(function(b, i){
    var tagged = b.t ? b.t === track : true;
    var domainFits = Object.keys(doms).indexOf(b.d) !== -1;
    if(!tagged && !domainFits) return;
    if(b.t && b.t !== track && !domainFits) return;
    all.push({ id: "b:" + i, d: domainFits ? b.d : remapDomain(b.d, doms), q: b.q, opts: b.opts, right: b.right, why: b.why, typed: !!b.typed, answer: b.answer });
  });
  var domOf = function(gid){
    for(var dom in doms) if(doms[dom].indexOf(gid) !== -1) return dom;
    return null;
  };
  PROTO_GUIDES.forEach(function(g){
    if(!g.ready || !g.quiz) return;
    var dom = domOf(g.id);
    if(!dom) return;
    g.quiz.forEach(function(q, qi){
      all.push({ id: "g:" + g.id + ":" + qi, d: dom, q: q.q, opts: q.opts, right: q.right, why: q.why });
    });
  });
  return all;
}
function remapDomain(d, doms){
  var keys = Object.keys(doms);
  if(keys.indexOf(d) !== -1) return d;
  var lower = d.toLowerCase();
  for(var i = 0; i < keys.length; i++){
    var k = keys[i].toLowerCase();
    if(lower.indexOf("fundamental") !== -1 && k.indexOf("concept") !== -1) return keys[i];
    if(lower.indexOf("routing") !== -1 && k.indexOf("implementation") !== -1) return keys[i];
    if(lower.indexOf("cli") !== -1 && k.indexOf("implementation") !== -1) return keys[i];
    if(lower.indexOf("monitor") !== -1 && k.indexOf("operations") !== -1) return keys[i];
    if(lower.indexOf("policy") !== -1 && k.indexOf("security") !== -1) return keys[i];
    if(lower.indexOf("junos") !== -1 && k.indexOf("operations") !== -1) return keys[i];
  }
  return keys[0] || d;
}
function examWrongSet(){
  try{ return new Set((localStorage.getItem("junoslab-wrongq") || "").split("|").filter(Boolean)); }
  catch(e){ return new Set(); }
}
function examSaveWrong(set){
  try{ localStorage.setItem("junoslab-wrongq", Array.from(set).join("|")); }catch(e){}
}
function examNormalize(t){
  return String(t == null ? "" : t).trim().toLowerCase().replace(/\s+/g, " ");
}
var EXAM_MISSED_SHARE = 0.4;
function examShuffle(a, rng){
  a = a.slice();
  for(var i = a.length - 1; i > 0; i--){
    var j = Math.floor(rng() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function examDraw(n, rng){
  rng = rng || Math.random;
  var all = examAllQuestions();
  var wrong = examWrongSet();
  n = Math.min(n, all.length);
  var missed = [], rest = [];
  all.forEach(function(q){ (wrong.has(q.id) ? missed : rest).push(q); });
  missed = examShuffle(missed, rng);
  rest = examShuffle(rest, rng);
  var quota = Math.min(missed.length, Math.round(n * EXAM_MISSED_SHARE));
  var picked = missed.slice(0, quota);
  picked = picked.concat(rest.slice(0, n - picked.length));
  if(picked.length < n) picked = picked.concat(missed.slice(quota, quota + (n - picked.length)));
  return examShuffle(picked, rng);
}

var MOCK = null;
function startMockExam(){
  modalChoice("Mock exam \u2014 JNCIA format", "Timed, multiple choice, mistakes remembered: up to 40 percent of every exam is drawn from questions you got wrong before, so they come back until you get them right. Pick a length:", [
    { value: 20, label: "20 questions \u00b7 ~25 min", desc: "Coffee-break exam" },
    { value: 40, label: "40 questions \u00b7 ~50 min", desc: "Serious rehearsal" },
    { value: 65, label: "65 questions \u00b7 ~85 min", desc: "Full JNCIA-length simulation" },
  ]).then(function(n){
    if(n === null) return;
    MOCK = {
      qs: examDraw(n),
      i: 0, correct: 0,
      perDom: {}, missed: [],
      endsAt: Date.now() + n * 78 * 1000,
      timer: null,
    };
    renderMockQuestion();
    MOCK.timer = setInterval(function(){
      var el = document.getElementById("mock-timer");
      if(!el){ return; }
      var left = MOCK.endsAt - Date.now();
      if(left <= 0){ finishMockExam(true); return; }
      var m = Math.floor(left / 60000), s2 = Math.floor((left % 60000) / 1000);
      el.textContent = m + ":" + (s2 < 10 ? "0" : "") + s2;
      el.className = left < 120000 ? "mock-timer mock-timer-low" : "mock-timer";
    }, 500);
  });
}
function mockHost(){
  var h = document.getElementById("mock-exam");
  if(!h){
    h = document.createElement("div");
    h.id = "mock-exam";
    document.body.appendChild(h);
  }
  return h;
}
function renderMockQuestion(){
  var h = mockHost();
  h.innerHTML = "";
  h.style.display = "flex";
  var q = MOCK.qs[MOCK.i];
  var card = document.createElement("div");
  card.className = "mock-card";
  var top = document.createElement("div");
  top.className = "mock-top";
  top.innerHTML = "<span>Question " + (MOCK.i + 1) + " / " + MOCK.qs.length + "</span><span id='mock-timer' class='mock-timer'></span>";
  var quit = document.createElement("button");
  quit.textContent = "abandon";
  quit.onclick = function(){ finishMockExam(false, true); };
  top.appendChild(quit);
  card.appendChild(top);
  var qt = document.createElement("div");
  qt.className = "mock-q";
  qt.textContent = q.q;
  card.appendChild(qt);
  var answered = false;
  var settle = function(correct, givenText){
    if(answered) return;
    answered = true;
    if(typeof SFX !== "undefined") (correct ? SFX.ding : SFX.womp)();
    if(correct) MOCK.correct++;
    MOCK.perDom[q.d] = MOCK.perDom[q.d] || { c: 0, t: 0 };
    MOCK.perDom[q.d].t++;
    if(correct) MOCK.perDom[q.d].c++;
    var wrong = examWrongSet();
    if(correct) wrong.delete(q.id); else { wrong.add(q.id); MOCK.missed.push({ q: q, given: givenText }); }
    examSaveWrong(wrong);
    setTimeout(function(){
      MOCK.i++;
      if(MOCK.i >= MOCK.qs.length) finishMockExam(false);
      else renderMockQuestion();
    }, correct ? 350 : 1200);
    var fb = document.createElement("div");
    fb.className = correct ? "mock-fb mock-fb-ok" : "mock-fb mock-fb-bad";
    fb.innerHTML = svgMark(correct ? "check" : "cross") + (correct ? "" : " " + (q.typed ? "answer: " + q.answer : ""));
    card.appendChild(fb);
  };
  if(q.typed){
    var inp = document.createElement("input");
    inp.className = "mock-input";
    inp.autocomplete = "off"; inp.spellcheck = false;
    inp.placeholder = "type your answer \u2014 case doesn't matter";
    var sub = document.createElement("button");
    sub.textContent = "Answer";
    sub.onclick = function(){ settle(examNormalize(inp.value) === examNormalize(q.answer), inp.value); };
    inp.addEventListener("keydown", function(e){ if(e.key === "Enter") sub.onclick(); });
    card.appendChild(inp);
    card.appendChild(sub);
    setTimeout(function(){ inp.focus(); }, 50);
  } else {
    q.opts.forEach(function(o, oi){
      var b = document.createElement("button");
      b.className = "mock-opt";
      b.textContent = o;
      b.onclick = function(){
        b.classList.add(oi === q.right ? "pg-q-right" : "pg-q-wrong");
        settle(oi === q.right, o);
      };
      card.appendChild(b);
    });
  }
  h.appendChild(card);
}
function finishMockExam(timeUp, abandoned){
  if(MOCK && MOCK.timer) clearInterval(MOCK.timer);
  var h = mockHost();
  if(abandoned){ h.style.display = "none"; h.innerHTML = ""; MOCK = null; return; }
  var total = MOCK.i;
  var pct = total ? Math.round((MOCK.correct / total) * 100) : 0;
  var pass = pct >= 65;
  if(typeof awardXp === "function" && total >= 5){
    var lengthMult = total >= 65 ? 1.5 : total >= 40 ? 1.2 : 1;
    var xp = Math.round((pct / 3) * lengthMult) + (pass ? 25 : 0);
    awardXp(xp, "mock exam (" + total + "q, " + pct + "%)");
  }
  h.innerHTML = "";
  var card = document.createElement("div");
  card.className = "mock-card";
  var head = document.createElement("div");
  head.className = "mock-result " + (pass ? "mock-pass" : "mock-fail");
  head.textContent = (timeUp ? "Time! " : "") + pct + "% \u2014 " + MOCK.correct + " / " + total + (pass ? "  \u00b7  PASS territory" : "  \u00b7  below the ~65% pass line");
  card.appendChild(head);
  Object.keys(MOCK.perDom).forEach(function(d){
    var s = MOCK.perDom[d];
    var row = document.createElement("div");
    row.className = "mock-dom";
    var p = Math.round((s.c / s.t) * 100);
    row.innerHTML = "<span>" + d + "</span><div class='mock-dombar'><div style='width:" + p + "%' class='" + (p >= 65 ? "mock-domok" : "mock-dombad") + "'></div></div><span>" + s.c + "/" + s.t + "</span>";
    card.appendChild(row);
  });
  if(MOCK.missed.length){
    var mh = document.createElement("div");
    mh.className = "mock-missed-h";
    mh.textContent = "Missed \u2014 these come back weighted next time:";
    card.appendChild(mh);
    MOCK.missed.forEach(function(m){
      var d = document.createElement("div");
      d.className = "mock-missed";
      d.textContent = "\u2715 " + m.q.q + "  \u2192  " + m.q.why;
      card.appendChild(d);
    });
  }
  if(typeof rankProgress === "function"){
    var rk = document.createElement("div");
    rk.className = "rank-next";
    rk.style.textAlign = "center";
    rk.style.margin = "10px 0 2px";
    rk.textContent = "Rank: " + rankProgress().rank.title + " (" + rankProgress().xp + " XP)";
    card.appendChild(rk);
  }
  var close = document.createElement("button");
  close.className = "mock-close";
  close.textContent = "Close";
  close.onclick = function(){ h.style.display = "none"; h.innerHTML = ""; MOCK = null; };
  card.appendChild(close);
  h.appendChild(card);
  if(typeof SFX !== "undefined") (pass ? SFX.fanfare() : SFX.womp());
}
(function(){
  if(typeof document === "undefined" || !document.getElementById) return;
  var tryWire = function(){
    var host = document.getElementById("course-bar");
    if(!host) return false;
    var row = host.querySelector && host.querySelector(".course-btns");
    if(!row) return false;
    if(document.getElementById("mock-btn")) return true;
    var b = document.createElement("button");
    b.id = "mock-btn";
    b.textContent = "Mock exam";
    b.title = "Timed JNCIA-format exam \u2014 your past mistakes come back weighted";
    b.onclick = startMockExam;
    row.appendChild(b);
    return true;
  };
  if(!tryWire()) setTimeout(tryWire, 500);
})();
