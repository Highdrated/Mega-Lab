var PREP_KEY = "junoslab-prep-v1";
var PREP_PASS = 80;
var PREP_INTERVALS = [1, 3, 7, 14, 30];
var PREP_LAPSE_DAYS = 30;
var PREP_COVERAGE = 20;
var PREP_WARMUP = 3, PREP_COOLDOWN = 2, PREP_DIAG = 21, PREP_WEEKLY = 20;

var PREP_DOMAINS = [
  { id: "nf", name: "Networking Fundamentals", weight: 14 },
  { id: "jof", name: "Junos OS Fundamentals", weight: 14 },
  { id: "ui", name: "User Interfaces", weight: 12 },
  { id: "cb", name: "Configuration Basics", weight: 16 },
  { id: "omm", name: "Operational Monitoring and Maintenance", weight: 16 },
  { id: "rf", name: "Routing Fundamentals", weight: 16 },
  { id: "rpff", name: "Routing Policy and Firewall Filters", weight: 12 },
];
var PREP_DOMAIN_BY_NAME = {};
PREP_DOMAINS.forEach(function(d){ PREP_DOMAIN_BY_NAME[d.name] = d.id; });

var PREP_GUIDE_DOMAIN = {
  osi: "nf", subnetting: "nf",
  "junos-arch": "jof", comments: "jof",
  pipes: "ui", cfgedit: "ui",
  cfgload: "cb", vlan: "cb", rstp: "cb", lacp: "cb", vc: "cb",
  health: "omm", maintenance: "omm", lldp: "omm", dhcp: "omm", troubleshooting: "omm",
  ribfib: "rf", ospf: "rf", dia: "rf", bgp: "rf", vrrp: "rf", ecmp: "rf",
  filters: "rpff",
};

var PREP_UNITS = [
  { id: "osi", g: "osi", dom: "nf" },
  { id: "subnetting", g: "subnetting", s: "basic-connect", dom: "nf" },
  { id: "junos-arch", g: "junos-arch", s: "commit-confirmed", dom: "jof" },
  { id: "comments", g: "comments", dom: "jof" },
  { id: "pipes", g: "pipes", dom: "ui" },
  { id: "cfgedit", g: "cfgedit", dom: "ui" },
  { id: "cfgload", g: "cfgload", dom: "cb" },
  { id: "vlan", g: "vlan", s: "vlan-split", dom: "cb", tickets: ["wrong-vlan", "trunk-missing-vlan", "trunk-down", "acc2-trunk-missing-staff"] },
  { id: "trunk", g: "vlan", s: "trunk-span", dom: "cb", tickets: ["trunk-missing-vlan", "trunk-down"] },
  { id: "irb", g: "vlan", s: "irb-intervlan", dom: "cb", tickets: ["irb-unbound", "wrong-gw"] },
  { id: "rstp", g: "rstp", s: "rstp-loop", dom: "cb" },
  { id: "lacp", g: "lacp", s: "lacp-bundle", dom: "cb" },
  { id: "health", g: "health", dom: "omm" },
  { id: "maintenance", g: "maintenance", dom: "omm" },
  { id: "lldp", g: "lldp", dom: "omm" },
  { id: "dhcp", g: "dhcp", s: "dhcp-serve", dom: "omm" },
  { id: "troubleshooting", g: "troubleshooting", s: "interconnect-recovery", dom: "omm", tickets: ["trunk-down", "no-return"] },
  { id: "ribfib", g: "ribfib", dom: "rf" },
  { id: "ospf", g: "ospf", s: "ospf-backbone", dom: "rf" },
  { id: "dia", g: "dia", s: "isp-onboarding", dom: "rf", tickets: ["no-default", "wrong-gw"] },
  { id: "nat", g: "dia", s: "nat-edge", dom: "rf", tickets: ["nat-missing", "nat-scope-too-narrow", "no-return"] },
  { id: "bgp", g: "bgp", s: "speak-bgp", dom: "rf" },
  { id: "filters", g: "filters", s: "filtered-segment", dom: "rpff", tickets: ["filter-block"] },
];

var PREP_UI_WORDS = /\?|\bpipe\b|\| (?:match|except|find|count|no-more|display|last|compare|save|trim)|'\| |context-sensitive|completion|\bTab\b|\bup 2\b|\btop\b|very top|hierarchy|J-Web|operational mode|run a configuration|help reference|help topic|screen-length|command history|Emacs|Ctrl-|prompt|exclusive|private|permission bits|login class/i;

var PREP_BANK = [
  { d: "nf", q: "Which layer of the OSI model does a switch make its forwarding decision at?", opts: ["Layer 1", "Layer 2", "Layer 3"], right: 1, why: "A switch forwards on destination MAC address, a layer-2 identifier. A router forwards on IP, layer 3." },
  { d: "nf", q: "How many bits are in a MAC address?", opts: ["32", "48", "64"], right: 1, why: "48 bits, written as six hexadecimal pairs. The first three pairs are the vendor OUI." },
  { d: "nf", q: "What does ARP resolve?", opts: ["A hostname to an IP address", "An IPv4 address to a MAC address", "A MAC address to a port number"], right: 1, why: "ARP asks 'who has 10.0.0.5' on the local segment and learns the MAC to put in the frame. DNS resolves names." },
  { d: "nf", q: "How many usable host addresses does a /30 provide?", opts: ["2", "4", "6"], right: 0, why: "A /30 has 4 addresses: network, broadcast and two usable. It is the classic point-to-point size; /31 squeezes that to 2 with none wasted." },
  { d: "nf", q: "Which of these is a private (RFC 1918) address?", opts: ["172.32.1.1", "172.20.1.1", "192.169.1.1"], right: 1, why: "The private ranges are 10/8, 172.16/12 (172.16.0.0 to 172.31.255.255) and 192.168/16. 172.32 and 192.169 are public." },
  { d: "nf", q: "A host has IP 10.0.10.5/24 and wants to reach 10.0.20.9. What does it do first?", opts: ["ARP for 10.0.20.9", "Compare the destination to its own subnet, find it is remote, and ARP for the default gateway", "Broadcast the packet"], right: 1, why: "The mask decides local versus remote. Remote destinations are sent to the gateway's MAC, so the host ARPs for the gateway, never for the far host." },
  { d: "nf", q: "What is the network address of 192.168.1.77/27?", opts: ["192.168.1.64", "192.168.1.72", "192.168.1.96"], right: 0, why: "/27 has a block size of 32: networks at .0, .32, .64, .96. 77 snaps down to 64, broadcast .95, usable .65 to .94." },
  { d: "nf", q: "Which transport protocol gives ordered, acknowledged delivery?", opts: ["UDP", "TCP", "ICMP"], right: 1, why: "TCP sequences, acknowledges and retransmits. UDP is fire-and-forget. ICMP is not a transport at all; it carries control messages like ping." },
  { d: "nf", q: "A VLAN is best described as...", opts: ["A separate collision domain per port", "A separate broadcast domain inside one switch", "A routed subnet"], right: 1, why: "A VLAN bounds broadcasts. Every switch port is already its own collision domain. Routing between VLANs needs a layer-3 interface such as an irb." },
  { d: "nf", q: "Which header field does a router decrement at every hop?", opts: ["Checksum", "TTL", "Sequence number"], right: 1, why: "Time To Live drops by one per router. At zero the packet is discarded and an ICMP time-exceeded goes back, which is exactly how traceroute works." },

  { d: "jof", q: "Which Junos process handles chassis components such as fans, power and environment?", opts: ["chassisd", "rpd", "dcd"], right: 0, why: "chassisd manages the chassis hardware. rpd runs routing protocols; dcd (device control daemon) owns interface configuration." },
  { d: "jof", q: "Exception traffic is...", opts: ["Traffic the PFE drops because of a filter", "Traffic that needs the Routing Engine, such as packets addressed to the device or routing protocol updates", "Traffic that takes an unusual route"], right: 1, why: "Transit traffic is forwarded by the PFE alone. Anything that requires the control plane is punted to the RE over an internal link, rate-limited so it cannot overwhelm it." },
  { d: "jof", q: "How are packets destined to the Routing Engine protected from flooding it?", opts: ["They are not; the RE can be flooded", "The internal link between PFE and RE is rate-limited", "They are dropped unless SSH is enabled"], right: 1, why: "The PFE-to-RE path is rate-limited by design so a flood of exception traffic cannot starve the control plane. A loopback firewall filter adds a second layer." },
  { d: "jof", q: "Which configuration does rollback 1 refer to?", opts: ["The factory default", "The configuration that was active before the most recent commit", "The rescue configuration"], right: 1, why: "Junos keeps rollback 0 (the current active config) through rollback 49. Each commit shifts the previous active config to rollback 1." },
  { d: "jof", q: "How many rollback configurations does Junos keep?", opts: ["10", "50", "100"], right: 1, why: "Fifty: rollback 0 through 49. Rollback 0 is the active configuration, so there are 49 historical copies." },
  { d: "jof", q: "What does the forwarding table on the PFE contain?", opts: ["Every route the protocols have learned", "Only the active routes, copied down from the Routing Engine", "The candidate configuration"], right: 1, why: "The RE picks active routes in its routing table and pushes just those into the forwarding table. The PFE never sees inactive alternatives." },
  { d: "jof", q: "After a fresh install with factory defaults, what must be configured before the first commit succeeds?", opts: ["A hostname", "A root authentication password", "A management IP"], right: 1, why: "Junos refuses to commit a configuration with no root password. Everything else can stay default." },
  { d: "jof", q: "What is the Junos daemon that interprets CLI and management traffic?", opts: ["mgd", "cli", "sshd"], right: 0, why: "mgd, the management daemon. The cli process is the user's front end, and it talks to mgd for every command." },
  { d: "jof", q: "A Junos device is single-image across platforms. What does that buy an operator?", opts: ["Faster hardware", "The same CLI, configuration syntax and behaviour on EX, QFX, MX and SRX", "Free licences"], right: 1, why: "One Junos train means muscle memory transfers between a branch switch and a core router. That consistency is the exam's favourite architecture point." },
  { d: "jof", q: "In the release name 23.4R2-S1, what does S1 denote?", opts: ["A security patch level", "A service release built on R2 for specific fixes", "A special platform build"], right: 1, why: "S releases are service releases layered on a maintenance release. X denotes special platform-specific builds." },
  { d: "jof", q: "Which statement about the candidate configuration is true?", opts: ["It takes effect as soon as you type set", "It is a working copy that only becomes active on commit", "It is stored on the PFE"], right: 1, why: "Edits land in the candidate. Nothing changes on the box until commit succeeds, which is why commit check and commit confirmed exist." },
  { d: "jof", q: "What happens to the forwarding plane if the Routing Engine reboots on a platform without redundancy?", opts: ["Forwarding continues with the last forwarding table until the RE returns", "All traffic stops immediately", "The PFE switches to the rescue configuration"], right: 0, why: "The separation of planes means the PFE keeps forwarding from its installed table while the control plane recovers. Protocol sessions may still time out, which is what graceful restart and NSR address." },
  { d: "jof", q: "Which command loads the factory-default configuration into the candidate?", opts: ["rollback factory", "load factory-default", "request system factory-default"], right: 1, why: "load factory-default replaces the candidate. You then set a root password and commit; the box is otherwise untouched until that commit." },
  { d: "jof", q: "Where do the rollback files 4 through 49 live?", opts: ["/config", "/var/db/config", "/var/tmp"], right: 1, why: "The active config and rollback 1 to 3 are in /config; the older ones are in /var/db/config. Knowing the split explains why a full /var can break commits." },

  { d: "ui", q: "You type 'show int' and press the space bar. What happens?", opts: ["Nothing until you press Tab", "The CLI completes it to 'show interfaces' because the prefix is unique", "An error is printed"], right: 1, why: "Space completes unambiguous keywords. Tab does the same and additionally completes user-defined names such as interface or policy names." },
  { d: "ui", q: "Which pipe shows only the first ten lines of a long output?", opts: ["| last 10", "| head 10", "| trim 10"], right: 1, why: "head shows the first N lines, last shows the final N. trim removes leading columns of characters." },
  { d: "ui", q: "What does 'show configuration | display xml' do?", opts: ["Exports the configuration to a file", "Shows the configuration in XML, the same format NETCONF and automation tools use", "Validates the configuration"], right: 1, why: "Every Junos output has an XML form behind it. display xml reveals it, which is how scripts and NETCONF see the same data." },
  { d: "ui", q: "Which keyboard shortcut moves the cursor to the beginning of the command line?", opts: ["Ctrl-A", "Ctrl-E", "Ctrl-W"], right: 0, why: "Junos uses Emacs-style editing: Ctrl-A start of line, Ctrl-E end of line, Ctrl-W erase the previous word, Ctrl-U erase the line." },
  { d: "ui", q: "You are at [edit interfaces ge-0/0/0 unit 0]. Which single command takes you to [edit interfaces ge-0/0/0]?", opts: ["top", "up", "exit configuration-mode"], right: 1, why: "up climbs one level. top jumps to [edit]. exit from a lower level also moves up one level, but exit configuration-mode leaves config mode entirely." },
  { d: "ui", q: "What does 'configure private' give you?", opts: ["A private copy of the candidate; only your changes are committed", "A read-only session", "Exclusive access that locks everyone else out"], right: 0, why: "Private sessions commit only their own diffs. Exclusive locks the shared candidate. Plain configure shares one candidate with everyone." },
  { d: "ui", q: "Which command shows the active configuration for just one hierarchy?", opts: ["show configuration interfaces ge-0/0/1", "show interfaces ge-0/0/1", "show configuration | match ge-0/0/1"], right: 0, why: "Naming the hierarchy after show configuration prints exactly that branch. show interfaces is operational state, not configuration. match would only print single lines." },
  { d: "ui", q: "In configuration mode, what does 'show' with no arguments display?", opts: ["The entire active configuration", "The candidate configuration from the current hierarchy level down", "The last commit log"], right: 1, why: "show in config mode is relative to where you stand, and it is the candidate, including uncommitted changes." },
  { d: "ui", q: "What does '| count' return?", opts: ["The number of output lines", "The number of matching routes", "The byte count"], right: 0, why: "count prints how many lines the preceding output produced. Paired with match it becomes a quick tally, such as counting up interfaces." },
  { d: "ui", q: "Which command stops the CLI from paging output with ---(more)--- for the whole session?", opts: ["set cli screen-length 0", "set cli no-more", "set system no-more"], right: 0, why: "A screen length of 0 disables paging for the session. | no-more does it for a single command." },
  { d: "ui", q: "A junior types '?' after 'set interfaces'. What appears?", opts: ["A list of configured interfaces and the possible keywords at that point", "A syntax error", "The help topic for interfaces"], right: 0, why: "The question mark lists every valid next token, including existing names. It never executes anything, which makes it safe to use anywhere." },
  { d: "ui", q: "Which command in configuration mode runs 'show interfaces terse' without leaving config?", opts: ["run show interfaces terse", "exec show interfaces terse", "do show interfaces terse"], right: 0, why: "run prefixes any operational command from inside configuration mode. 'do' is the equivalent on other vendors." },

  { d: "cb", q: "What does 'deactivate interfaces ge-0/0/3' do after commit?", opts: ["Deletes the interface configuration", "Keeps the configuration in place but marks it inactive so it is ignored", "Administratively disables the port"], right: 1, why: "Deactivate leaves the statements in the config with an inactive tag. activate brings them back. disable is a different statement that shuts the port down while staying active." },
  { d: "cb", q: "Which load option replaces the whole candidate with the file's contents?", opts: ["load merge", "load override", "load replace"], right: 1, why: "override discards the candidate and loads the file. merge adds to it. replace swaps only the hierarchies marked with replace: tags." },
  { d: "cb", q: "What does 'rename interfaces ge-0/0/1 to ge-0/0/2' do?", opts: ["Changes the physical port name", "Moves the configuration from ge-0/0/1 to ge-0/0/2 in the candidate", "Creates an alias"], right: 1, why: "rename moves a configuration block to a new identifier. It is how you repoint a block after a recabling without retyping it." },
  { d: "cb", q: "Which command moves a firewall term named 'allow-ssh' so it is evaluated before 'deny-all'?", opts: ["insert term allow-ssh before term deny-all", "move term allow-ssh before term deny-all", "reorder term allow-ssh deny-all"], right: 0, why: "insert reorders ordered lists such as filter terms and policy terms. Order matters because the first matching term wins." },
  { d: "cb", q: "What does 'protect' do to a configuration hierarchy?", opts: ["Encrypts it", "Prevents it from being changed or deleted until it is unprotected", "Hides it from show configuration"], right: 1, why: "protect guards critical hierarchies such as system login from accidental edits. Changes to a protected hierarchy fail until you run unprotect." },
  { d: "cb", q: "Which statement makes a user's password be prompted interactively instead of typed in clear text in the command?", opts: ["set system login user kaatje authentication plain-text-password", "set system login user kaatje password", "set system login user kaatje authentication prompt"], right: 0, why: "plain-text-password without a value prompts twice and stores the hash. The hash lands in the config as encrypted-password." },
  { d: "cb", q: "What is the default rollback timer for 'commit confirmed' with no number?", opts: ["1 minute", "10 minutes", "30 minutes"], right: 1, why: "Ten minutes. If no second commit arrives in that window the previous configuration is restored automatically, which is your safety net on remote changes." },
  { d: "cb", q: "Which command schedules a commit for a specific time?", opts: ["commit at 02:00", "commit delay 02:00", "commit schedule 02:00"], right: 0, why: "commit at accepts a time or a date and time. The candidate is checked immediately and activated later; clear system commit cancels it." },
  { d: "cb", q: "A trunk port on an EX switch (ELS) is configured with which statement?", opts: ["set interfaces ge-0/0/10 unit 0 family ethernet-switching port-mode trunk", "set interfaces ge-0/0/10 unit 0 family ethernet-switching interface-mode trunk", "set interfaces ge-0/0/10 trunk"], right: 1, why: "ELS uses interface-mode. port-mode is the legacy, pre-ELS syntax that the EX4300 and newer platforms do not accept." },
  { d: "cb", q: "Which statement gives VLAN 'staff' a routed gateway on an ELS switch?", opts: ["set vlans staff l3-interface irb.10 plus an address on irb unit 10", "set vlans staff ip-address 10.0.10.1/24", "set interfaces vlan unit 10 family inet address 10.0.10.1/24"], right: 0, why: "ELS binds the VLAN to an irb unit with l3-interface and the address lives on that irb unit. The vlan.N interface is the legacy syntax." },
  { d: "cb", q: "What does 'set interfaces ge-0/0/5 disable' do?", opts: ["Removes the interface from the configuration", "Administratively shuts the port; show interfaces terse reports admin down", "Blocks all VLANs on the port"], right: 1, why: "disable is the Junos equivalent of shutdown. The configuration stays, the port is admin down. delete the disable statement to bring it back." },
  { d: "cb", q: "Which statement sets the device hostname?", opts: ["set hostname core1", "set system host-name core1", "set system hostname core1"], right: 1, why: "host-name, with a hyphen, under system. The prompt changes to user@core1 after commit." },

  { d: "omm", q: "Which command shows how long the device has been running and when it last booted?", opts: ["show system uptime", "show chassis uptime", "show version detail"], right: 0, why: "show system uptime prints boot time, uptime, the time the protocols started and the current time. show version shows software, not uptime." },
  { d: "omm", q: "Which command lists the installed hardware, serial numbers and part numbers?", opts: ["show chassis hardware", "show system hardware", "show chassis inventory"], right: 0, why: "show chassis hardware is the inventory command. Add detail or extensive for more. It is also where you read the chassis serial for a support case." },
  { d: "omm", q: "In 'show interfaces terse', a port shows Admin up and Link down. What does that tell you?", opts: ["The port is configured and enabled but has no working physical link", "The port is disabled in configuration", "The port is up and passing traffic"], right: 0, why: "Admin reflects configuration, Link reflects the physical layer. Admin up, link down means check the cable, the far end, or the SFP." },
  { d: "omm", q: "Which command captures packets on an interface, like tcpdump?", opts: ["monitor traffic interface ge-0/0/1", "show interfaces capture ge-0/0/1", "debug packet ge-0/0/1"], right: 0, why: "monitor traffic is the built-in tcpdump. It sees traffic to and from the RE, so it catches control-plane packets such as LLDP and OSPF hellos." },
  { d: "omm", q: "Which command shows live interface statistics updating on screen?", opts: ["monitor interface traffic", "show interfaces statistics live", "watch interfaces"], right: 0, why: "monitor interface traffic refreshes input and output rates for all interfaces. monitor interface ge-0/0/1 focuses on one." },
  { d: "omm", q: "What does 'request system storage cleanup' do?", opts: ["Formats the disk", "Deletes old log files, crash files and software packages to free space", "Removes rollback configurations"], right: 1, why: "It lists and removes files that are safe to delete. Run it before a software upgrade when show system storage shows a full partition." },
  { d: "omm", q: "Which syslog severity is the most severe?", opts: ["emergency", "critical", "alert"], right: 0, why: "From most to least severe: emergency, alert, critical, error, warning, notice, info, debug. A facility logged at notice includes notice and everything above it." },
  { d: "omm", q: "What is the difference between 'show chassis alarms' and 'show system alarms'?", opts: ["There is none", "Chassis alarms are hardware and environment; system alarms are software and configuration, such as a missing rescue config", "Chassis alarms are only on MX"], right: 1, why: "A yellow 'rescue configuration is not set' alarm is a system alarm. A failed fan or power supply is a chassis alarm." },
  { d: "omm", q: "Which command shows CPU and memory usage per process?", opts: ["show system processes extensive", "show chassis routing-engine detail", "show system cpu"], right: 0, why: "show system processes extensive is top for Junos. show chassis routing-engine gives the overall RE load and memory, useful first, then drill into processes." },
  { d: "omm", q: "Which statement enables SNMP reads from a monitoring server?", opts: ["set snmp community monitor authorization read-only", "set system services snmp read-only", "set snmp server monitor"], right: 0, why: "Communities live under snmp. authorization read-only is the default but stating it is the exam's expected form. Pair it with clients to restrict sources." },
  { d: "omm", q: "Which command copies a file from the device to a remote server?", opts: ["file copy /var/log/messages scp://user@host/", "request system file-transfer", "copy file messages scp"], right: 0, why: "file copy works with local paths and scp, ftp or http URLs. file list and file show round out the trio." },
  { d: "omm", q: "Which command shows the Junos version and the device model?", opts: ["show version", "show system version", "show chassis version"], right: 0, why: "show version prints hostname, model and the installed Junos package. It is the first thing a TAC engineer asks for." },
  { d: "omm", q: "Which command reboots the device cleanly?", opts: ["request system reboot", "reboot", "restart chassis"], right: 0, why: "request system reboot asks for confirmation and can be scheduled with at. restart is for individual processes, such as restart routing." },
  { d: "omm", q: "Which command restarts only the routing protocol process?", opts: ["restart routing", "request system restart rpd", "clear routing"], right: 0, why: "restart routing bounces rpd. On a box without graceful restart that drops all protocol adjacencies, so it is a last resort, not a tidy-up." },
  { d: "omm", q: "Which command shows environmental readings such as temperatures and fan speeds?", opts: ["show chassis environment", "show system environment", "show chassis temperature"], right: 0, why: "show chassis environment lists temperature sensors, fans and power. Pair it with show chassis alarms when something looks off." },
  { d: "omm", q: "Why send device logs to a remote syslog server?", opts: ["Local logs are encrypted", "Logs survive a reboot or a compromised box and can be correlated across devices", "Junos cannot store logs locally"], right: 1, why: "Local /var/log/messages rotates and dies with the disk. A collector keeps history and lets you see the same minute on every device." },
  { d: "omm", q: "Which command shows who is logged in to the device right now?", opts: ["show system users", "show cli sessions", "show login"], right: 0, why: "show system users lists sessions, their source and idle time. It is also how you find the session holding a configuration lock." },

  { d: "rf", q: "What is the Junos route preference of a directly connected route?", opts: ["0", "5", "10"], right: 0, why: "Direct is 0, local 0, static 5, OSPF internal 10, IS-IS level 1 internal 15, RIP 100, OSPF external 150, BGP 170. Lower wins." },
  { d: "rf", q: "What is the default route preference for OSPF internal routes?", opts: ["10", "110", "150"], right: 0, why: "OSPF internal is 10 in Junos; OSPF AS external routes are 150. 110 is the Cisco administrative distance, a classic trap." },
  { d: "rf", q: "Which table holds IPv4 unicast routes by default?", opts: ["inet.0", "inet.4", "inet6.0"], right: 0, why: "inet.0 is IPv4 unicast, inet6.0 is IPv6 unicast, inet.3 holds MPLS next hops and mpls.0 the label table." },
  { d: "rf", q: "What does the asterisk next to a route in 'show route' mean?", opts: ["The route is static", "The route is active and installed in the forwarding table", "The route has errors"], right: 1, why: "The star marks the active route for that prefix. Routes without it lost the preference or protocol tie-break and sit idle." },
  { d: "rf", q: "Which statement creates a default static route to 203.0.113.1?", opts: ["set routing-options static route 0.0.0.0/0 next-hop 203.0.113.1", "set protocols static route default 203.0.113.1", "set routing-options default-route 203.0.113.1"], right: 0, why: "Static routes live under routing-options static. 0/0 is accepted shorthand for the default." },
  { d: "rf", q: "A static route with next-hop 'reject' does what?", opts: ["Drops packets silently", "Drops packets and sends an ICMP unreachable back to the source", "Forwards packets to the default route"], right: 1, why: "reject answers with ICMP unreachable; discard is silent. Both are useful for null-routing or for a summary that must never leak traffic." },
  { d: "rf", q: "Two static routes to the same prefix point to different next hops. How does Junos use them by default?", opts: ["Both are installed and traffic is per-flow balanced", "One next hop is chosen; the other stays in the routing table unused", "Round robin per packet"], right: 1, why: "Junos installs one next hop per route unless a load-balance per-packet export policy is applied to the forwarding table." },
  { d: "rf", q: "What does 'qualified-next-hop 10.0.0.2 preference 7' on a static route achieve?", opts: ["A second next hop that is only used when the primary one disappears", "Load balancing", "A higher-priority next hop"], right: 0, why: "The qualified next hop carries its own preference. With 7 against the default 5 it becomes a floating backup that takes over when the primary next hop is unreachable." },
  { d: "rf", q: "What is the difference between a routing table and a forwarding table?", opts: ["They are the same thing", "The routing table holds all learned routes on the RE; the forwarding table holds only active routes, installed on the PFE", "The forwarding table holds static routes only"], right: 1, why: "RIB on the control plane, FIB on the forwarding plane. show route reads the RIB, show route forwarding-table reads the FIB." },
  { d: "rf", q: "Which OSPF area must every other area connect to?", opts: ["Area 1", "Area 0, the backbone", "Area 255"], right: 1, why: "All inter-area traffic transits area 0. A non-backbone area attached only to another non-backbone area needs a virtual link." },
  { d: "rf", q: "Which statement configures a router ID?", opts: ["set routing-options router-id 10.0.0.1", "set protocols ospf router-id 10.0.0.1", "set system router-id 10.0.0.1"], right: 0, why: "router-id is global under routing-options and shared by OSPF and BGP. Without it Junos picks the lowest loopback or interface address." },
  { d: "rf", q: "What is a routing instance of type virtual-router used for?", opts: ["Running a separate routing table and protocol set on the same box, without MPLS VPN labels", "Virtualising the whole device", "A backup routing engine"], right: 0, why: "virtual-router gives a second routing table and its own protocols, like a VRF without the MPLS VPN machinery. The table is named instance.inet.0." },
  { d: "rf", q: "A route is learned from both OSPF and BGP for the same prefix. Which becomes active?", opts: ["BGP, because it is an external protocol", "OSPF, because preference 10 beats BGP's 170", "Whichever was learned first"], right: 1, why: "Preference decides between protocols and lower wins. OSPF internal 10 beats BGP 170 regardless of arrival order." },
  { d: "rf", q: "Which command shows the forwarding table that the PFE actually uses?", opts: ["show route forwarding-table", "show route fib", "show forwarding"], right: 0, why: "show route forwarding-table displays the FIB. Comparing it with show route is the fastest way to prove whether a route made it to the PFE." },
  { d: "rf", q: "What is the function of a default gateway on a host?", opts: ["To resolve DNS names", "To receive packets for any destination outside the host's own subnet", "To assign IP addresses"], right: 1, why: "The host sends everything non-local to the gateway's MAC. A wrong gateway is the classic 'can reach neighbours, nothing else' ticket." },

  { d: "rpff", q: "In a routing policy, what is the difference between 'then accept' and 'then next term'?", opts: ["There is none", "accept is terminating; next term continues evaluating the following term", "next term rejects the route"], right: 1, why: "accept and reject end evaluation. next term and next policy are flow control: the route keeps being evaluated." },
  { d: "rpff", q: "Which statement applies a firewall filter to incoming traffic on an interface?", opts: ["set interfaces ge-0/0/1 unit 0 family inet filter input GUEST-IN", "set firewall filter GUEST-IN apply ge-0/0/1", "set interfaces ge-0/0/1 filter GUEST-IN"], right: 0, why: "Filters are attached per family and per direction under the interface unit. input and output can be different filters." },
  { d: "rpff", q: "Which match condition selects packets from the 10.0.20.0/24 subnet?", opts: ["from source-address 10.0.20.0/24", "from address-source 10.0.20.0/24", "match source 10.0.20.0/24"], right: 0, why: "from source-address, with destination-address for the other side. address matches either direction, which is why source-address is preferred for precision." },
  { d: "rpff", q: "A firewall filter accepts matching packets and does nothing else. Which action is implied if 'then' lists only 'count'?", opts: ["discard", "accept", "reject"], right: 1, why: "A term with non-terminating actions only, such as count or log, implicitly accepts. The implicit discard applies only at the end of the whole filter." },
  { d: "rpff", q: "Where do you apply a routing policy so it controls which routes OSPF advertises?", opts: ["set protocols ospf export MY-POLICY", "set protocols ospf import MY-POLICY", "set routing-options export MY-POLICY"], right: 0, why: "Export policies control what leaves the routing table into a protocol. OSPF import can only filter external routes from entering the table." },
  { d: "rpff", q: "What does a prefix-list give you in a policy?", opts: ["A reusable named set of prefixes referenced by from prefix-list", "A list of allowed interfaces", "A policer"], right: 0, why: "prefix-list under policy-options is reused across policies and filters. route-filter does exact, longer, orlonger and upto matching inline." },
  { d: "rpff", q: "In 'from route-filter 10.0.0.0/8 orlonger', what matches?", opts: ["Only 10.0.0.0/8 exactly", "10.0.0.0/8 and any more specific prefix inside it", "Any prefix that starts with 10"], right: 1, why: "exact matches the one prefix, longer matches more specific but not the prefix itself, orlonger matches both. upto and prefix-length-range bound the length." },
];

function prepDay(off){
  var d = new Date(Date.now() + (off || 0) * 864e5);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function prepDaysBetween(a, b){
  return Math.round((new Date(b) - new Date(a)) / 864e5);
}
var PREP = null;
function prepLoad(){
  if(PREP) return PREP;
  var raw = null;
  try{ raw = JSON.parse(localStorage.getItem(PREP_KEY) || "null"); }catch(e){}
  PREP = raw && typeof raw === "object" ? raw : {};
  PREP.cards = PREP.cards || {};
  PREP.units = PREP.units || {};
  PREP.shifts = PREP.shifts || {};
  PREP.mocks = PREP.mocks || [];
  PREP.diag = PREP.diag || null;
  PREP.weekly = PREP.weekly || null;
  return PREP;
}
function prepSave(){
  try{ localStorage.setItem(PREP_KEY, JSON.stringify(prepLoad())); }catch(e){}
}
function prepReset(){ PREP = null; }

function prepClassifyLegacy(b){
  var d = b.d || "";
  if(d === "Networking fundamentals" || d === "Networking concepts") return "nf";
  if(d === "Junos OS fundamentals") return "jof";
  if(d === "Monitoring & maintenance") return "omm";
  if(d === "Routing fundamentals") return "rf";
  if(d === "Policy & filters") return "rpff";
  if(d === "CLI & configuration") return PREP_UI_WORDS.test(b.q) ? "ui" : "cb";
  return null;
}
var PREP_POOL = null;
function prepPool(){
  if(PREP_POOL) return PREP_POOL;
  var out = [];
  EXAM_BANK.forEach(function(b, i){
    if(b.t === "netplus" && b.d !== "Networking concepts") return;
    var dom = prepClassifyLegacy(b);
    if(!dom) return;
    out.push({ id: "b:" + i, dom: dom, q: b.q, opts: b.opts, right: b.right, why: b.why, typed: !!b.typed, answer: b.answer });
  });
  PREP_BANK.forEach(function(b, i){
    out.push({ id: "p:" + i, dom: b.d, q: b.q, opts: b.opts, right: b.right, why: b.why });
  });
  PROTO_GUIDES.forEach(function(g){
    if(!g.quiz) return;
    var dom = PREP_GUIDE_DOMAIN[g.id];
    if(!dom) return;
    g.quiz.forEach(function(q, qi){
      out.push({ id: "g:" + g.id + ":" + qi, dom: dom, q: q.q, opts: q.opts, right: q.right, why: q.why, guide: g.id });
    });
  });
  PREP_POOL = out;
  return out;
}
function prepDomainName(id){
  var d = PREP_DOMAINS.find(function(x){ return x.id === id; });
  return d ? d.name : id;
}
function prepQ(id){ return prepPool().find(function(q){ return q.id === id; }); }

function prepRecord(qid, correct, source){
  var s = prepLoad();
  var c = s.cards[qid] || { ivl: 0, reps: 0, lapses: 0, hist: [] };
  var today = prepDay(0);
  if(correct){
    if(c.hist.length && c.last !== today) c.ivl = Math.min(c.ivl + 1, PREP_INTERVALS.length - 1);
    c.due = prepDay(PREP_INTERVALS[c.ivl]);
  } else {
    c.ivl = 0;
    c.lapses++;
    c.due = prepDay(1);
  }
  c.reps++;
  c.last = today;
  c.hist = (c.hist || []).concat(correct ? 1 : 0).slice(-6);
  c.src = source || "quiz";
  s.cards[qid] = c;
  prepSave();
  if(typeof renderCourseBar === "function" && source !== "silent") renderCourseBar();
}
function prepCardScore(c, today){
  if(!c || !c.hist || !c.hist.length) return null;
  var h = c.hist;
  var score = h.length >= 2 ? h[h.length - 1] * 0.7 + h[h.length - 2] * 0.3 : h[h.length - 1];
  if(c.last && prepDaysBetween(c.last, today) > PREP_LAPSE_DAYS) score *= 0.5;
  return score;
}
function prepDomainReadiness(domId){
  var s = prepLoad(), today = prepDay(0);
  var pool = prepPool().filter(function(q){ return q.dom === domId; });
  var sum = 0, answered = 0;
  pool.forEach(function(q){
    var sc = prepCardScore(s.cards[q.id], today);
    if(sc === null) return;
    answered++;
    sum += sc;
  });
  var target = Math.min(pool.length, PREP_COVERAGE);
  var pct = answered ? Math.round((sum / Math.max(target, answered)) * 100) : 0;
  return { pct: pct, answered: answered, pool: pool.length, target: target };
}
function prepReadiness(){
  var out = {};
  PREP_DOMAINS.forEach(function(d){ out[d.id] = prepDomainReadiness(d.id); });
  return out;
}
function prepOverall(){
  var r = prepReadiness(), tw = 0, sum = 0;
  PREP_DOMAINS.forEach(function(d){ tw += d.weight; sum += r[d.id].pct * d.weight; });
  return Math.round(sum / tw);
}
function prepWeakestDomain(){
  var r = prepReadiness(), best = null;
  PREP_DOMAINS.forEach(function(d){
    if(!best || r[d.id].pct < r[best].pct) best = d.id;
  });
  return best;
}
function prepDueCards(){
  var s = prepLoad(), today = prepDay(0), out = [];
  Object.keys(s.cards).forEach(function(id){
    var c = s.cards[id];
    if(c.due && c.due <= today){
      var q = prepQ(id);
      if(q) out.push({ q: q, c: c });
    }
  });
  out.sort(function(a, b){ return (a.c.due < b.c.due ? -1 : a.c.due > b.c.due ? 1 : 0) || (b.c.lapses - a.c.lapses); });
  return out;
}
function prepFreshQuestions(domId, n, exclude){
  var s = prepLoad(), ex = exclude || {};
  var pool = prepPool().filter(function(q){ return (!domId || q.dom === domId) && !ex[q.id] && !q.typed; });
  var unseen = pool.filter(function(q){ return !s.cards[q.id]; });
  var seen = pool.filter(function(q){ return s.cards[q.id]; }).sort(function(a, b){
    return (prepCardScore(s.cards[a.id], prepDay(0)) || 0) - (prepCardScore(s.cards[b.id], prepDay(0)) || 0);
  });
  return prepShuffle(unseen).concat(seen).slice(0, n);
}
function prepShuffle(a){
  a = a.slice();
  for(var i = a.length - 1; i > 0; i--){
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function prepDiagDraw(){
  var out = [], per = Math.ceil(PREP_DIAG / PREP_DOMAINS.length);
  PREP_DOMAINS.forEach(function(d){
    var pool = prepShuffle(prepPool().filter(function(q){ return q.dom === d.id && !q.typed; }));
    out = out.concat(pool.slice(0, per));
  });
  return prepShuffle(out).slice(0, PREP_DIAG);
}
function prepWeeklyDraw(){
  var out = [], ex = {};
  var total = 0;
  PREP_DOMAINS.forEach(function(d){ total += d.weight; });
  PREP_DOMAINS.forEach(function(d){
    var n = Math.max(2, Math.round(PREP_WEEKLY * d.weight / total));
    var pool = prepShuffle(prepPool().filter(function(q){ return q.dom === d.id && !q.typed; }));
    pool.slice(0, n).forEach(function(q){ if(!ex[q.id]){ ex[q.id] = 1; out.push(q); } });
  });
  prepShuffle(prepPool().filter(function(q){ return !q.typed && !ex[q.id]; })).forEach(function(q){
    if(out.length < PREP_WEEKLY){ ex[q.id] = 1; out.push(q); }
  });
  return prepShuffle(out).slice(0, PREP_WEEKLY);
}

function prepUnitState(u){
  var s = prepLoad();
  var st = s.units[u.id] || { quizDays: [], hands: null, handsClean: false };
  if(!st.quizDays) st.quizDays = [];
  return st;
}
function prepUnitQuizPassed(u){
  var st = prepUnitState(u), today = prepDay(0);
  var days = st.quizDays.filter(function(d){ return prepDaysBetween(d, today) <= PREP_LAPSE_DAYS * 2; });
  return days.length >= 2;
}
function prepUnitQuizToday(u){
  return prepUnitState(u).quizDays.indexOf(prepDay(0)) !== -1;
}
function prepUnitHandsNeeded(u){ return !!u.s; }
function prepUnitHandsDone(u){
  if(!u.s) return true;
  var st = prepUnitState(u);
  return !!st.hands;
}
function prepUnitClean(u){
  if(!u.s) return true;
  return !!prepUnitState(u).handsClean;
}
function prepUnitPassed(u){
  return prepUnitQuizPassed(u) && prepUnitHandsDone(u);
}
function prepUnitTitle(u){
  var g = typeof guideById === "function" ? guideById(u.g) : null;
  var name = g ? g.title : u.g;
  if(u.s){
    var sc = SCENARIOS.find(function(x){ return x.id === u.s; });
    if(sc && sc.title !== name) name += " / " + sc.title;
  }
  return name;
}
function prepNextUnit(){
  for(var i = 0; i < PREP_UNITS.length; i++){
    var u = PREP_UNITS[i];
    if(!prepUnitPassed(u)) return { unit: u, idx: i };
  }
  return null;
}
function prepUnitsPassed(){ return PREP_UNITS.filter(prepUnitPassed).length; }
function prepUnitForScenario(sid){
  return PREP_UNITS.find(function(u){ return u.s === sid; }) || null;
}
function prepUnitsForTicket(faultIds){
  return PREP_UNITS.filter(function(u){ return u.tickets && faultIds.some(function(f){ return u.tickets.indexOf(f) !== -1; }); });
}
function prepMarkQuizDay(u, pct){
  var s = prepLoad();
  var st = prepUnitState(u);
  var today = prepDay(0);
  if(pct >= PREP_PASS && st.quizDays.indexOf(today) === -1) st.quizDays.push(today);
  st.lastQuiz = { day: today, pct: pct };
  s.units[u.id] = st;
  prepSave();
}
function prepOnHandsOn(scenId, info){
  var s = prepLoad();
  var units = [];
  if(info && info.faults && info.faults.length) units = prepUnitsForTicket(info.faults);
  else { var u = prepUnitForScenario(scenId); if(u) units = [u]; }
  if(!units.length) return;
  var clean = !(info && info.hints > 0) && !(info && info.revealed);
  var today = prepDay(0);
  units.forEach(function(u){
    var st = prepUnitState(u);
    if(!st.hands) st.hands = today;
    if(clean && !st.handsClean){ st.handsClean = true; st.cleanDay = today; }
    s.units[u.id] = st;
  });
  prepSave();
  var sh = prepShift();
  if(sh && !sh.done && sh.step === "hands" && units.some(function(u){ return u.id === sh.unit; })){
    sh.active = true;
    sh.handsDone = true;
    sh.handsClean = clean;
    prepSave();
    prepStrictRelease();
    setTimeout(function(){ prepShiftContinue(); }, 900);
  } else if(typeof renderCourseBar === "function") renderCourseBar();
}

var PREP_STRICT_LOCK = false;
var PREP_RESTORE = null;
function prepLockStrict(){ return PREP_STRICT_LOCK; }
function prepStrictEngage(){
  if(PREP_STRICT_LOCK) return;
  PREP_RESTORE = {
    assist: typeof assistOn !== "undefined" ? !!assistOn : null,
    predict: typeof predictOn !== "undefined" ? !!predictOn : null,
    strict: typeof strictOn === "function" ? strictOn() : true,
  };
  if(typeof setStrict === "function" && !PREP_RESTORE.strict) setStrict(true);
  PREP_STRICT_LOCK = true;
  if(typeof setAssist === "function" && PREP_RESTORE.assist) setAssist(false);
  if(typeof setPredict === "function" && PREP_RESTORE.predict) setPredict(false);
  var sol = document.getElementById("solution-btn");
  if(sol) sol.style.display = "none";
  var jt = document.getElementById("tablet-tab-juno");
  if(jt) jt.style.display = "none";
  if(document.body && document.body.classList) document.body.classList.add("shift-mode");
  var tb = document.getElementById("toolbar");
  if(tb && !document.getElementById("shift-chip")){
    var chip = document.createElement("span");
    chip.id = "shift-chip";
    chip.textContent = "shift \u00b7 bench rules";
    chip.title = "Strict Junos locked on, assist and predict off, no fault reveal. Hints allowed but a hinted hands-on is not clean.";
    var hint = document.getElementById("hint");
    if(hint && hint.parentNode === tb) tb.insertBefore(chip, hint); else tb.appendChild(chip);
  }
}
function prepStrictRelease(){
  if(!PREP_STRICT_LOCK) return;
  PREP_STRICT_LOCK = false;
  if(PREP_RESTORE){
    if(typeof setAssist === "function" && PREP_RESTORE.assist) setAssist(true);
    if(typeof setPredict === "function" && PREP_RESTORE.predict) setPredict(true);
  }
  PREP_RESTORE = null;
  var jt = document.getElementById("tablet-tab-juno");
  if(jt && !(typeof realOn === "function" && realOn())) jt.style.display = "";
  if(document.body && document.body.classList) document.body.classList.remove("shift-mode");
  var chip = document.getElementById("shift-chip");
  if(chip && chip.remove) chip.remove();
}

function prepShift(){
  var s = prepLoad();
  var sh = s.shifts[prepDay(0)];
  return sh || null;
}
function prepShiftKind(){
  var s = prepLoad();
  if(!s.diag) return "diag";
  var shiftsDone = Object.keys(s.shifts).filter(function(d){ return s.shifts[d].done; }).length;
  var lastWeekly = s.weekly ? s.weekly.day : null;
  if(shiftsDone >= 3 && (!lastWeekly || prepDaysBetween(lastWeekly, prepDay(0)) >= 7)) return "weekly";
  return "daily";
}
function prepShiftStart(){
  var s = prepLoad();
  var existing = prepShift();
  if(existing && !existing.done){ prepShiftContinue(); return; }
  if(existing && existing.done){ prepFrontDoor(); return; }
  var kind = prepShiftKind();
  var next = prepNextUnit();
  var sh = { kind: kind, active: true, step: "warm", day: prepDay(0), unit: next ? next.unit.id : null, warm: [], cool: [], done: false, handsDone: false };
  if(kind === "daily" || kind === "weekly"){
    sh.warm = prepDueCards().slice(0, PREP_WARMUP).map(function(x){ return x.q.id; });
    if(sh.warm.length < PREP_WARMUP){
      var ex = {}; sh.warm.forEach(function(id){ ex[id] = 1; });
      prepFreshQuestions(prepWeakestDomain(), PREP_WARMUP - sh.warm.length, ex).forEach(function(q){ sh.warm.push(q.id); });
    }
  }
  s.shifts[sh.day] = sh;
  prepSave();
  prepShiftContinue();
}
function prepShiftContinue(){
  var sh = prepShift();
  if(!sh || sh.done){ prepFrontDoor(); return; }
  sh.active = true;
  if(sh.kind === "diag"){ prepRunDiagnostic(); return; }
  if(sh.step === "warm"){
    if(!sh.warm.length){ sh.step = "lesson"; prepSave(); prepShiftContinue(); return; }
    prepRunQuestions(sh.warm.map(prepQ).filter(Boolean), { title: "Warm-up", sub: "Review cards that are due. One answer each.", source: "review" }).then(function(res){
      if(!res) { sh.active = false; prepSave(); renderCourseBar(); return; }
      sh.warmResult = res;
      sh.step = "lesson";
      prepSave();
      prepShiftContinue();
    });
    return;
  }
  if(sh.step === "lesson"){
    var u = PREP_UNITS.find(function(x){ return x.id === sh.unit; });
    if(!u){ sh.step = "cool"; prepSave(); prepShiftContinue(); return; }
    if(!prepUnitQuizPassed(u) && !prepUnitQuizToday(u)){
      prepOpenGuide(u);
      sh.active = false;
      prepSave();
      renderCourseBar();
      return;
    }
    if(prepUnitHandsNeeded(u) && !(prepUnitHandsDone(u) && prepUnitClean(u)) && !sh.handsDone){
      sh.step = "hands";
      prepSave();
      prepShiftContinue();
      return;
    }
    sh.step = "cool";
    prepSave();
    prepShiftContinue();
    return;
  }
  if(sh.step === "hands"){
    var hu = PREP_UNITS.find(function(x){ return x.id === sh.unit; });
    if(!hu || !hu.s || sh.handsDone){ sh.step = "cool"; prepSave(); prepShiftContinue(); return; }
    prepStartHands(hu);
    sh.active = false;
    prepSave();
    renderCourseBar();
    return;
  }
  if(sh.step === "cool"){
    if(sh.kind === "weekly"){
      prepRunQuestions(prepWeeklyDraw(), { title: "Weekly check", sub: PREP_WEEKLY + " questions across all seven domains. No feedback until the end.", source: "weekly", silent: true }).then(function(res){
        if(!res){ sh.active = false; prepSave(); renderCourseBar(); return; }
        var s = prepLoad();
        s.weekly = { day: prepDay(0), pct: res.pct };
        s.mocks.push({ at: Date.now(), pct: res.pct, n: res.total, perDom: res.perDom, kind: "weekly" });
        s.mocks = s.mocks.slice(-20);
        prepSave();
        prepShiftFinish(res);
      });
      return;
    }
    var ex = {};
    sh.warm.forEach(function(id){ ex[id] = 1; });
    var qs = prepFreshQuestions(prepWeakestDomain(), PREP_COOLDOWN, ex);
    if(!qs.length){ prepShiftFinish(null); return; }
    prepRunQuestions(qs, { title: "Cool-down", sub: "Two fresh questions from your weakest domain: " + prepDomainName(prepWeakestDomain()) + ".", source: "cool" }).then(function(res){
      if(!res){ sh.active = false; prepSave(); renderCourseBar(); return; }
      sh.coolResult = res;
      prepSave();
      prepShiftFinish(res);
    });
  }
}
function prepShiftFinish(res){
  var sh = prepShift();
  if(!sh) return;
  sh.done = true;
  sh.active = false;
  sh.step = "done";
  sh.finishedAt = Date.now();
  prepSave();
  prepStrictRelease();
  if(typeof awardXp === "function") awardXp(sh.kind === "weekly" ? 45 : 30, "shift");
  var u = PREP_UNITS.find(function(x){ return x.id === sh.unit; });
  var lines = [];
  if(sh.warmResult) lines.push("Warm-up: " + sh.warmResult.correct + " of " + sh.warmResult.total + " review cards.");
  if(u) lines.push("Lesson: " + prepUnitTitle(u) + (prepUnitPassed(u) ? " passed." : prepUnitQuizPassed(u) ? " quiz passed; hands-on " + (sh.handsDone ? (sh.handsClean ? "clean." : "done with hints, re-prove it later.") : "still open.") : " quiz passed today; pass it again on another day."));
  if(res) lines.push((sh.kind === "weekly" ? "Weekly check: " : "Cool-down: ") + res.correct + " of " + res.total + " (" + res.pct + "%).");
  lines.push("Readiness: " + prepOverall() + "% overall.");
  if(typeof SFX !== "undefined") SFX.fanfare();
  modalConfirm("Shift complete", lines.join("\n"), "Back to the station").then(function(){ prepFrontDoor(); });
  if(typeof renderCourseBar === "function") renderCourseBar();
}
function prepShiftAbandon(){
  var sh = prepShift();
  if(!sh || sh.done) return;
  var s = prepLoad();
  delete s.shifts[sh.day];
  prepSave();
  prepStrictRelease();
  if(typeof renderCourseBar === "function") renderCourseBar();
}

function prepOpenGuide(u){
  var g = typeof guideById === "function" ? guideById(u.g) : null;
  if(!g) return;
  protoView = { page: "guide", guide: g };
  if(typeof openTablet === "function") openTablet("proto");
  else if(typeof setTabletTab === "function") setTabletTab("proto");
  if(typeof renderProtoTab === "function") renderProtoTab();
  setTimeout(function(){
    var body = document.getElementById("tablet-body"), tab = document.getElementById("tab-proto");
    if(body) body.scrollTop = 0;
    if(tab) tab.scrollTop = 0;
    var bn = document.querySelector(".prep-banner");
    if(bn && bn.scrollIntoView) bn.scrollIntoView({ block: "start" });
  }, 80);
}
function prepRunUnitQuiz(u){
  var g = typeof guideById === "function" ? guideById(u.g) : null;
  if(!g || !g.quiz) return Promise.resolve(null);
  var qs = g.quiz.map(function(q, qi){ return prepQ("g:" + g.id + ":" + qi); }).filter(Boolean);
  var extra = prepFreshQuestions(u.dom, Math.max(0, 5 - qs.length), qs.reduce(function(m, q){ m[q.id] = 1; return m; }, {}));
  qs = qs.concat(extra);
  return prepRunQuestions(qs, { title: "Check: " + g.title, sub: "One answer per question. " + PREP_PASS + "% passes. Pass on two different days to master the unit.", source: "unit" }).then(function(res){
    if(!res) return null;
    prepMarkQuizDay(u, res.pct);
    var sh = prepShift();
    if(res.pct >= PREP_PASS){
      if(typeof awardXp === "function") awardXp(prepUnitQuizPassed(u) ? 25 : 10, "unit check");
      if(sh && !sh.done && sh.unit === u.id){ sh.active = true; prepSave(); setTimeout(prepShiftContinue, 400); return res; }
    } else {
      modalConfirm("Not yet: " + res.pct + "%", "Re-read the guide, then take the check again. The questions you missed are now review cards.", "Back to the guide").then(function(){ prepOpenGuide(u); });
    }
    if(typeof renderCourseBar === "function") renderCourseBar();
    return res;
  });
}
function prepStartHands(u){
  prepStrictEngage();
  if(typeof protoJumpToScenario === "function") protoJumpToScenario(u.s);
  var sh = prepShift();
  modalConfirm("Hands-on: " + prepUnitTitle(u), "Bench rules are on for this step: strict Junos, no assist ghost, no predict prompts, no fault reveal. Hints are allowed, but a hands-on with hints is not clean and the unit will ask you to prove it again.\n\nFinish every objective to close the step.", "To the bench");
}

var PREP_RUN = null;
function prepRunHost(){
  var h = document.getElementById("prep-run");
  if(!h){
    h = document.createElement("div");
    h.id = "prep-run";
    document.body.appendChild(h);
  }
  return h;
}
function prepRunQuestions(qs, opt){
  opt = opt || {};
  return new Promise(function(resolve){
    if(!qs.length){ resolve({ correct: 0, total: 0, pct: 0, perDom: {} }); return; }
    PREP_RUN = { qs: qs, i: 0, correct: 0, perDom: {}, missed: [], opt: opt, resolve: resolve };
    prepRenderQuestion();
  });
}
function prepRenderQuestion(){
  var r = PREP_RUN, h = prepRunHost();
  h.innerHTML = "";
  h.style.display = "flex";
  var q = r.qs[r.i];
  var card = document.createElement("div");
  card.className = "mock-card prep-card";
  var top = document.createElement("div");
  top.className = "mock-top";
  top.innerHTML = "<span>" + r.opt.title + " · " + (r.i + 1) + " / " + r.qs.length + "</span><span class='prep-dom'>" + prepDomainName(q.dom) + "</span>";
  var quit = document.createElement("button");
  quit.textContent = "stop";
  quit.onclick = function(){ h.style.display = "none"; h.innerHTML = ""; var res = r.resolve; PREP_RUN = null; res(null); };
  top.appendChild(quit);
  card.appendChild(top);
  if(r.i === 0 && r.opt.sub){
    var sub = document.createElement("div");
    sub.className = "prep-sub";
    sub.textContent = r.opt.sub;
    card.appendChild(sub);
  }
  var qt = document.createElement("div");
  qt.className = "mock-q";
  qt.textContent = q.q;
  card.appendChild(qt);
  var answered = false;
  var settle = function(correct, given){
    if(answered) return;
    answered = true;
    if(correct) r.correct++;
    r.perDom[q.dom] = r.perDom[q.dom] || { c: 0, t: 0 };
    r.perDom[q.dom].t++;
    if(correct) r.perDom[q.dom].c++; else r.missed.push({ q: q, given: given });
    prepRecord(q.id, correct, r.opt.silent ? "silent" : r.opt.source);
    if(typeof examWrongSet === "function"){
      var w = examWrongSet();
      if(correct) w.delete(q.id); else w.add(q.id);
      examSaveWrong(w);
    }
    if(typeof SFX !== "undefined" && !r.opt.silent) (correct ? SFX.ding : SFX.womp)();
    var next = function(){
      r.i++;
      if(r.i >= r.qs.length) prepFinishRun();
      else prepRenderQuestion();
    };
    if(r.opt.silent){ setTimeout(next, 250); return; }
    var fb = document.createElement("div");
    fb.className = correct ? "mock-fb mock-fb-ok" : "mock-fb mock-fb-bad";
    fb.innerHTML = (typeof svgMark === "function" ? svgMark(correct ? "check" : "cross") : "") + " " + q.why;
    card.appendChild(fb);
    var nb = document.createElement("button");
    nb.className = "prep-next";
    nb.textContent = r.i + 1 >= r.qs.length ? "Finish" : "Next";
    nb.onclick = next;
    card.appendChild(nb);
    setTimeout(function(){ nb.focus(); }, 30);
  };
  if(q.typed){
    var inp = document.createElement("input");
    inp.className = "mock-input";
    inp.autocomplete = "off"; inp.spellcheck = false;
    inp.placeholder = "type your answer";
    var sub2 = document.createElement("button");
    sub2.textContent = "Answer";
    sub2.onclick = function(){ settle(examNormalize(inp.value) === examNormalize(q.answer), inp.value); };
    inp.addEventListener("keydown", function(e){ if(e.key === "Enter") sub2.onclick(); });
    card.appendChild(inp);
    card.appendChild(sub2);
    setTimeout(function(){ inp.focus(); }, 50);
  } else {
    var order = q.opts.map(function(o, oi){ return oi; });
    order = prepShuffle(order);
    order.forEach(function(oi){
      var b = document.createElement("button");
      b.className = "mock-opt";
      b.textContent = q.opts[oi];
      b.onclick = function(){
        if(answered) return;
        var correct = oi === q.right;
        if(!r.opt.silent){
          b.classList.add(correct ? "pg-q-right" : "pg-q-wrong");
          card.querySelectorAll(".mock-opt").forEach(function(x){ x.disabled = true; });
        }
        settle(correct, q.opts[oi]);
      };
      card.appendChild(b);
    });
  }
  h.appendChild(card);
}
function prepFinishRun(){
  var r = PREP_RUN, h = prepRunHost();
  var total = r.qs.length;
  var res = { correct: r.correct, total: total, pct: total ? Math.round((r.correct / total) * 100) : 0, perDom: r.perDom, missed: r.missed };
  if(!r.opt.silent){
    h.style.display = "none"; h.innerHTML = "";
    PREP_RUN = null;
    r.resolve(res);
    return;
  }
  h.innerHTML = "";
  var card = document.createElement("div");
  card.className = "mock-card prep-card";
  var head = document.createElement("div");
  head.className = "mock-result " + (res.pct >= PREP_PASS ? "mock-pass" : "mock-fail");
  head.textContent = r.opt.title + ": " + res.pct + "% — " + res.correct + " / " + total;
  card.appendChild(head);
  Object.keys(res.perDom).forEach(function(d){
    var s = res.perDom[d];
    var row = document.createElement("div");
    row.className = "mock-dom";
    var p = Math.round((s.c / s.t) * 100);
    row.innerHTML = "<span>" + prepDomainName(d) + "</span><div class='mock-dombar'><div style='width:" + p + "%' class='" + (p >= PREP_PASS ? "mock-domok" : "mock-dombad") + "'></div></div><span>" + s.c + "/" + s.t + "</span>";
    card.appendChild(row);
  });
  if(res.missed.length){
    var mh = document.createElement("div");
    mh.className = "mock-missed-h";
    mh.textContent = "Missed. These are now review cards:";
    card.appendChild(mh);
    res.missed.forEach(function(m){
      var d = document.createElement("div");
      d.className = "mock-missed";
      d.textContent = m.q.q + "  →  " + m.q.why;
      card.appendChild(d);
    });
  }
  var close = document.createElement("button");
  close.className = "mock-close";
  close.textContent = "Continue";
  close.onclick = function(){ h.style.display = "none"; h.innerHTML = ""; PREP_RUN = null; r.resolve(res); };
  card.appendChild(close);
  h.appendChild(card);
  if(typeof SFX !== "undefined") (res.pct >= PREP_PASS ? SFX.fanfare() : SFX.womp());
}

function prepRunDiagnostic(){
  var sh = prepShift();
  prepRunQuestions(prepDiagDraw(), { title: "Diagnostic", sub: PREP_DIAG + " questions, three per domain, no feedback until the end. This sets your starting readiness; nothing here is held against you.", source: "diag", silent: true }).then(function(res){
    if(!res){ if(sh){ sh.active = false; prepSave(); } renderCourseBar(); return; }
    var s = prepLoad();
    s.diag = { day: prepDay(0), pct: res.pct, perDom: res.perDom };
    if(sh){ sh.done = true; sh.active = false; sh.step = "done"; sh.diagResult = res; }
    prepSave();
    if(typeof awardXp === "function") awardXp(20, "diagnostic");
    prepFrontDoor();
  });
}

function prepReady(){
  var r = prepReadiness();
  var doms = PREP_DOMAINS.every(function(d){ return r[d.id].pct >= PREP_PASS; });
  var s = prepLoad();
  var mocks = s.mocks.slice(-2);
  var mocksOk = mocks.length === 2 && mocks.every(function(m){ return m.pct >= PREP_PASS; });
  return { ready: doms && mocksOk, domains: doms, mocks: mocksOk, mockCount: mocks.length };
}
function prepMockDone(pct, perDom, total){
  var s = prepLoad();
  var pd = {};
  Object.keys(perDom || {}).forEach(function(k){ pd[PREP_DOMAIN_BY_NAME[k] || k] = perDom[k]; });
  s.mocks.push({ at: Date.now(), pct: pct, n: total, perDom: pd, kind: "mock" });
  s.mocks = s.mocks.slice(-20);
  prepSave();
}

function prepShiftLabel(){
  var sh = prepShift();
  var kind = prepShiftKind();
  if(!sh) return { label: kind === "diag" ? "Start: diagnostic" : kind === "weekly" ? "Start shift: weekly check" : "Start shift", sub: kind === "diag" ? "21 questions to place you. About 10 minutes." : kind === "weekly" ? "Warm-up, lesson, then a 20-question check" : "Warm-up, lesson, cool-down. About 10 minutes." };
  if(sh.done) return { label: "Shift done for today", sub: "Free bench. Tickets and scenarios still count." };
  var step = sh.step === "warm" ? "warm-up" : sh.step === "lesson" ? "lesson" : sh.step === "hands" ? "hands-on" : sh.kind === "weekly" ? "weekly check" : "cool-down";
  return { label: "Continue shift: " + step, sub: "Picks up where you stopped." };
}

function prepEl(tag, cls, parent, text){
  var e = document.createElement(tag);
  if(cls) e.className = cls;
  if(text !== undefined) e.textContent = text;
  if(parent) parent.appendChild(e);
  return e;
}
function prepRenderDomains(parent){
  var r = prepReadiness();
  var box = prepEl("div", "resume-domains", parent);
  prepEl("div", "resume-domains-head", box, "Readiness by JNCIA domain (answer accuracy, not units ticked)");
  PREP_DOMAINS.forEach(function(d){
    var row = prepEl("div", "resume-dom", box);
    prepEl("span", "resume-dom-name", row, d.name);
    var mini = prepEl("span", "resume-dom-bar", row);
    var fill = prepEl("span", "resume-dom-fill", mini);
    fill.style.width = r[d.id].pct + "%";
    if(r[d.id].pct >= PREP_PASS) fill.classList.add("prep-ok");
    prepEl("span", "resume-dom-num", row, r[d.id].pct + "%");
  });
}
function renderResume(){
  var h = resumeHost();
  h.innerHTML = "";
  var card = prepEl("div", "resume-card", h);
  prepEl("div", "resume-kicker", card, "Junos Lab · JNCIA-Junos prep");

  var rp = typeof rankProgress === "function" ? rankProgress() : null;
  if(rp){
    var rank = prepEl("div", "resume-rank", card);
    prepEl("span", "resume-rank-title", rank, rp.rank.title);
    prepEl("span", "resume-xp", rank, rp.next ? rp.xp + " XP · " + (rp.next.xp - rp.xp) + " to " + rp.next.title : rp.xp + " XP · top of the ladder");
  }

  var overall = prepOverall();
  var line = prepEl("div", "resume-courseline", card);
  prepEl("span", null, line, prepUnitsPassed() + " of " + PREP_UNITS.length + " units mastered");
  prepEl("span", "resume-pct", line, overall + "% ready");
  var bar = prepEl("div", "resume-bar", card);
  prepEl("div", "resume-bar-fill", bar).style.width = overall + "%";

  var rd = prepReady();
  if(rd.ready){
    var ok = prepEl("div", "prep-ready", card);
    prepEl("div", "prep-ready-h", ok, "Ready to book JN0-105");
    prepEl("div", "prep-ready-t", ok, "Every domain is above " + PREP_PASS + "% and your last two checks passed. Book the JNCIA-Junos exam at Pearson VUE through your Juniper account, then keep doing shifts until exam day.");
  }

  var lbl = prepShiftLabel();
  var go = prepEl("button", "resume-continue", card);
  prepEl("span", "resume-go-label", go, lbl.label);
  prepEl("span", "resume-go-unit", go, lbl.sub);
  go.onclick = function(){ hideResume(); prepShiftStart(); };

  var sh = prepShift();
  if(sh && sh.done){
    var next = prepNextUnit();
    if(next){
      var more = prepEl("button", "resume-continue prep-second", card);
      prepEl("span", "resume-go-label", more, "Keep going");
      prepEl("span", "resume-go-unit", more, prepUnitTitle(next.unit));
      more.onclick = function(){ hideResume(); prepGoUnit(next.unit); };
    }
  }

  prepRenderDomains(card);

  var due = prepDueCards().length;
  prepEl("div", "prep-due", card, due ? due + " review card" + (due === 1 ? "" : "s") + " due" : "No review cards due");

  var alt = prepEl("div", "resume-alt", card);
  var mock = prepEl("button", "resume-altbtn", alt, "Mock exam");
  mock.onclick = function(){ hideResume(); if(typeof startMockExam === "function") startMockExam(); };
  var scen = prepEl("button", "resume-altbtn", alt, "Tickets and scenarios");
  scen.onclick = function(){ hideResume(); if(typeof openTablet === "function") openTablet("scen"); };
  var free = prepEl("button", "resume-altbtn", alt, "Free lab");
  free.onclick = hideResume;
  prepEl("div", "resume-hint", card, "Esc or Free lab goes straight to the bench");
  return h;
}
function prepGoUnit(u){
  if(!prepUnitQuizPassed(u) && !prepUnitQuizToday(u)){ prepOpenGuide(u); return; }
  if(u.s && !(prepUnitHandsDone(u) && prepUnitClean(u))){ prepStartHands(u); return; }
  prepOpenGuide(u);
}
function prepFrontDoor(){
  var h = renderResume();
  h.style.display = "flex";
}

function renderCourseBar(){
  var host = document.getElementById("course-bar");
  if(!host) return;
  host.innerHTML = "";
  var rankHost = document.createElement("div");
  rankHost.id = "rank-badge";
  host.appendChild(rankHost);
  if(typeof renderRankBadge === "function") renderRankBadge();

  var sh = prepShift();
  var next = prepNextUnit();
  var steps = prepEl("div", "prep-steps", host);
  var kind = sh ? sh.kind : prepShiftKind();
  var defs = kind === "diag"
    ? [["diag", "Diagnostic", "21 questions"]]
    : [["warm", "Warm-up", "review cards"], ["lesson", "Lesson", next ? prepUnitTitle(next.unit) : "all units mastered"], ["hands", "Hands-on", "scenario or ticket"], ["cool", kind === "weekly" ? "Weekly check" : "Cool-down", kind === "weekly" ? "20 questions" : "weakest domain"]];
  var order = ["warm", "lesson", "hands", "cool", "done"];
  var cur = sh ? (sh.done ? "done" : sh.step) : null;
  defs.forEach(function(d){
    var row = prepEl("div", "prep-step", steps);
    var state = !sh ? "todo" : sh.done ? "done" : order.indexOf(d[0]) < order.indexOf(cur) ? "done" : d[0] === cur ? "now" : "todo";
    if(d[0] === "hands" && sh && !sh.done && sh.step !== "hands"){
      var u = next && PREP_UNITS.find(function(x){ return x.id === sh.unit; });
      if(u && !u.s) state = "skip";
    }
    row.classList.add("prep-" + state);
    prepEl("span", "prep-step-mark", row, state === "done" ? "✓" : state === "now" ? "▸" : state === "skip" ? "–" : "·");
    prepEl("span", "prep-step-name", row, d[1]);
    prepEl("span", "prep-step-sub", row, d[2]);
  });

  var row2 = prepEl("div", "course-btns", host);
  var lbl = prepShiftLabel();
  var b = prepEl("button", "course-continue", row2, lbl.label);
  b.onclick = function(){
    if(typeof SFX !== "undefined") SFX.tick();
    if(sh && !sh.done && sh.step === "lesson" && !sh.active){
      var u = PREP_UNITS.find(function(x){ return x.id === sh.unit; });
      if(u && !prepUnitQuizPassed(u) && !prepUnitQuizToday(u)){ prepRunUnitQuiz(u); return; }
    }
    if(sh && !sh.done && sh.step === "hands" && !sh.active){ prepShiftContinue(); return; }
    prepShiftStart();
  };
  if(sh && !sh.done && sh.step === "lesson" && !sh.active){
    b.textContent = "Take the check";
  }
  var rb = prepEl("button", null, row2, "Readiness");
  rb.title = "Readiness by exam domain, review cards due, book-the-exam status";
  rb.onclick = prepFrontDoor;
  if(sh && !sh.done){
    var ab = prepEl("button", "prep-abandon", row2, "Abandon shift");
    ab.onclick = function(){ modalConfirm("Abandon today's shift?", "Progress on answered cards is kept. The shift itself resets and can be started again.", "Abandon").then(function(v){ if(v) prepShiftAbandon(); }); };
  }
  var mb = prepEl("button", null, row2, "Mock exam");
  mb.onclick = function(){ if(typeof startMockExam === "function") startMockExam(); };
}
function courseOnComplete(scenId){
  renderCourseBar();
  var host = document.getElementById("course-next");
  if(!host) return;
  host.innerHTML = "";
  var sh = prepShift();
  if(sh && !sh.done) return;
  var next = prepNextUnit();
  if(!next) return;
  var card = prepEl("div", "course-nextcard", host);
  prepEl("div", null, card, "Done. Next unit: " + prepUnitTitle(next.unit));
  var b = prepEl("button", null, card, "Go");
  b.onclick = function(){ host.innerHTML = ""; prepGoUnit(next.unit); };
  setTimeout(function(){ if(host.firstChild === card) host.innerHTML = ""; }, 30000);
}

function prepGuideBanner(g){
  var u = PREP_UNITS.find(function(x){ return x.g === g.id; });
  if(!u) return null;
  var sh = prepShift();
  var st = prepUnitState(u);
  var b = document.createElement("div");
  b.className = "prep-banner";
  var lesson = sh && !sh.done && sh.unit === u.id && sh.step === "lesson";
  var head = document.createElement("div");
  head.className = "prep-banner-h";
  head.textContent = lesson ? "Shift lesson" : prepUnitPassed(u) ? "Unit mastered" : "Unit " + (PREP_UNITS.indexOf(u) + 1) + " of " + PREP_UNITS.length;
  b.appendChild(head);
  var t = document.createElement("div");
  t.className = "prep-banner-t";
  var bits = [];
  bits.push("Check: " + st.quizDays.length + " of 2 passing days");
  if(u.s) bits.push("Hands-on: " + (st.handsClean ? "clean" : st.hands ? "done with hints, prove it again" : "open"));
  t.textContent = (lesson ? "Read it through, then take the check at the bottom. " : "") + bits.join(" \u00b7 ");
  b.appendChild(t);
  var jump = document.createElement("button");
  jump.className = "prep-banner-jump";
  jump.textContent = "Jump to the check";
  jump.onclick = function(){ var el = document.querySelector(".prep-check-btn"); if(el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" }); };
  b.appendChild(jump);
  return b;
}
function prepGuideCheckButton(g){
  var u = PREP_UNITS.find(function(x){ return x.g === g.id; });
  if(!u) return null;
  var b = document.createElement("button");
  b.className = "pg-practice prep-check-btn";
  var st = prepUnitState(u);
  var sh = prepShift();
  b.textContent = prepUnitQuizPassed(u) ? "Unit check passed · retake" : st.quizDays.length === 1 ? "Take the check again (1 of 2 days)" : (sh && !sh.done && sh.unit === u.id ? "Take the check (shift step)" : "Take the check");
  b.onclick = function(){ prepRunUnitQuiz(u); };
  return b;
}

(function(){
  if(typeof examAllQuestions !== "function") return;
  var legacy = examAllQuestions;
  examAllQuestions = function(){
    if(typeof activeTrackId === "function" && activeTrackId() !== "jncia") return legacy();
    return prepPool().map(function(q){
      return { id: q.id, d: prepDomainName(q.dom), q: q.q, opts: q.opts, right: q.right, why: q.why, typed: q.typed, answer: q.answer };
    });
  };
})();
(function(){
  if(typeof activeTrackId === "function" && activeTrackId() !== "jncia" && typeof setTrack === "function") setTrack("jncia");
  if(typeof document === "undefined" || !document.getElementById) return;
  var host = document.getElementById("course-bar");
  if(host) renderCourseBar();
})();
