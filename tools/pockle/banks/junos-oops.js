POCKET.register({
  id: "junos-oops",
  name: "Juniper Oopsies",
  topic: "Junos",
  href: "junos-lab/index.html",
  keys: ["junoslab-oops", "junle-room-v1-mistakes", "junle_mistakes"],
  units: [{ id: "classic", title: "Classic oopsies" }],
  done() { return []; },
  sample: {},
  sampleDone: [],
  live(get) {
    const out = [], seen = new Set();
    const pool = [];
    const add = (src, want, typed, task, at, n) => {
      want = String(want || "").trim(); typed = String(typed || "").trim();
      if (!want || !typed || want === typed || seen.has(want)) return;
      seen.add(want); pool.push({ src, want, typed, task: task || "", at: at || 1, n: n || 1 });
    };
    const lab = get("junoslab-oops");
    if (lab && lab.items) Object.values(lab.items).forEach(m => add("Junos Lab", m.want, m.typed, m.task, m.at, m.n));
    const room = get("junle-room-v1-mistakes");
    if (room && typeof room === "object") Object.values(room).forEach(m => add("Junle room", m.want, m.typed, m.task, m.at || 1, m.n));
    const jl = get("junle_mistakes");
    if (jl && jl.items) Object.keys(jl.items).forEach(k => { if (!/^quiz:/.test(k)) { const m = jl.items[k]; add("Junle drill", k, m.last, m.task, 1, m.n); } });
    const h = s => { let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return Math.abs(x); };
    pool.forEach((m, i) => {
      const near = (x, y) => { const a = x.split(" "), b = y.split(" "); const same = a.filter((w, k) => b[k] === w).length; return same / Math.max(a.length, b.length) >= 0.6; };
      const others = pool.filter(o => o !== m && o.want !== m.typed && near(o.want, m.want)).map(o => o.want);
      const opts = [m.want, m.typed].concat(others.slice(0, 2));
      const uniq = [...new Set(opts)];
      const r = h(m.want) % uniq.length;
      const o = uniq.slice(1); o.splice(r, 0, m.want);
      out.push({
        u: "classic", ut: "Your oopsies · " + m.src, at: m.at,
        q: (m.task ? m.task + ". " : "") + "You typed this and it failed. What should it have been?",
        code: m.typed, o, a: r,
        why: "The working command is " + m.want + (m.n > 1 ? ". You got this one wrong " + m.n + " times." : ".")
      });
    });
    return out;
  },
  cards: [
    {"u":"classic","q":"On an EX4300 (ELS) this is refused. Why?","code":"set interfaces ge-0/0/1 unit 0 family ethernet-switching port-mode access","o":["Access ports need unit 1","port-mode is old pre-ELS syntax; ELS uses interface-mode","family ethernet-switching does not exist","Nothing is wrong"],"a":1,"why":"ELS switches say interface-mode access. port-mode only worked on old EX code."},
    {"u":"classic","q":"You want a routed VLAN interface on an ELS switch. Which is right?","o":["set vlans STAFF l3-interface irb.10","set vlans STAFF l3-interface vlan.10","set vlans STAFF routing-interface 10","set interfaces vlan unit 10 l3 STAFF"],"a":0,"why":"ELS calls it irb.N. vlan.N is the legacy name."},
    {"u":"classic","q":"You typed set commands, then left config mode. Nothing changed on the switch. What did you forget?","o":["save","write memory","apply","commit"],"a":3,"why":"Junos only activates the candidate config when you commit."},
    {"u":"classic","q":"You ran commit confirmed and walked away. What happens?","o":["Nothing, the change stays","The switch reboots","After the timer (10 minutes by default) Junos rolls back the change","The config is deleted"],"a":2,"why":"commit confirmed needs a second commit to keep the change. That is your safety net."},
    {"u":"classic","q":"Your ae0 bundle will not come up at all. The members are set. What is missing?","code":"set interfaces ge-0/0/2 ether-options 802.3ad ae0\nset interfaces ge-0/0/3 ether-options 802.3ad ae0","o":["set interfaces ae0 enable","set chassis aggregated-devices ethernet device-count 1","set protocols lacp ae0","set vlans ae0"],"a":1,"why":"The chassis has to create ae interfaces first. Without device-count there is no ae0."},
    {"u":"classic","q":"Commit fails on a LACP member port. Why?","code":"set interfaces ge-0/0/2 ether-options 802.3ad ae0\nset interfaces ge-0/0/2 unit 0 family ethernet-switching","o":["A bundle member cannot keep its own unit config","802.3ad needs a speed","ae0 must be ae1","ge-0/0/2 is reserved"],"a":0,"why":"The logical config lives on ae0. Delete unit 0 from the member."},
    {"u":"classic","q":"You are in config mode and type this. Junos says syntax error. Fix?","code":"show interfaces terse","o":["Use display terse","Add | no-more","Commit first","exit first, or put run in front"],"a":3,"why":"Operational commands need run in front while you are in config mode."},
    {"u": "classic", "q": "Junos says syntax error. What is wrong?", "code": "set interfaces ge-0/0/5 descripton uplink", "o": ["description needs quotes", "ge-0/0/5 needs unit 0", "A word is misspelt: description", "description is not allowed"], "a": 2, "why": "Junos accepts short forms like int, but not a misspelt word. Tab completion saves you here."},
    {"u":"classic","q":"You want to switch off a config block for now but keep it. Which?","o":["delete","deactivate","disable","rollback"],"a":1,"why":"deactivate keeps the lines but marks them inactive. activate brings them back."},
    {"u":"classic","q":"You ran rollback 1. The old config is not active. Why?","o":["rollback only loads it into the candidate; you still need commit","rollback 1 is the current config","You need rollback 0","Rollback needs a reboot"],"a":0,"why":"rollback N replaces the candidate. Nothing changes until commit."},
    {"u":"classic","q":"This is a Cisco habit. What is the Junos version?","code":"ip route 0.0.0.0 0.0.0.0 10.0.0.1","o":["set route default 10.0.0.1","set protocols static 0.0.0.0/0 10.0.0.1","set routing-options default-gateway 10.0.0.1","set routing-options static route 0.0.0.0/0 next-hop 10.0.0.1"],"a":3,"why":"Static routes live under routing-options static."},
    {"u":"classic","q":"Your eBGP group will not commit. The error says peer-as is required. Why?","code":"set protocols bgp group ISP type external\nset protocols bgp group ISP neighbor 203.0.113.1","o":["neighbor needs a port","BGP needs OSPF first","type external needs the provider's AS: peer-as","group names must be lowercase"],"a":2,"why":"External peers must say which AS they belong to."},
    {"u":"classic","q":"The BGP session is up, but the provider does not see your prefix. Most likely?","o":["The cable is wrong","No export policy advertising it","The hold time is too short","BGP only sends routes at night"],"a":1,"why":"Junos BGP only advertises active BGP routes by default. Your own prefix needs an export policy."},
    {"u":"classic","q":"You applied this filter and all traffic stopped. Why?","code":"set firewall family inet filter PROTECT term SSH from protocol tcp\nset firewall family inet filter PROTECT term SSH from destination-port ssh\nset firewall family inet filter PROTECT term SSH then accept","o":["Every filter ends with an invisible discard; add a final accept term","ssh must be 22","Filters only work on lo0","then accept is wrong"],"a":0,"why":"Anything that matches no term is dropped. Add a last term that accepts the rest."},
    {"u":"classic","q":"Commit fails on an access port. Why?","code":"set interfaces ge-0/0/4 unit 0 family ethernet-switching interface-mode access\nset interfaces ge-0/0/4 unit 0 family ethernet-switching vlan members [ STAFF GUEST ]","o":["STAFF must be a number","Brackets are not allowed","interface-mode must be trunk for STAFF","Access ports carry one VLAN only"],"a":3,"why":"Two VLANs on one port means trunk. An access port gets exactly one."},
    {"u":"classic","q":"First commit on a factory-new switch fails. The error mentions root-authentication. Fix?","o":["set system login user root","request system zeroize","set system root-authentication plain-text-password","set system services ssh"],"a":2,"why":"Junos will not commit until root has a password."},
    {"u":"classic","q":"commit check said OK. Is the change live?","o":["Yes","No, commit check only validates","Only after a reboot","Only on the backup routing engine"],"a":1,"why":"commit check tests the candidate without activating it. Run commit to apply."},
    {"u":"classic","q":"You are at [edit interfaces ge-0/0/1] and type this. What goes wrong?","code":"set interfaces ge-0/0/1 description server","o":["The path is relative, so this is wrong here; use set description server or top","Nothing","description needs a unit","You must exit first"],"a":0,"why":"set works from where you are. Here, set description server is enough."},
    {"u":"classic","q":"show vlans lists your VLAN, but the port is not in it. You set the member on the port. What is missing?","o":["The VLAN needs a description","show vlans needs extensive","LLDP","commit"],"a":3,"why":"Without commit the port config is only in the candidate."},
    {"u":"classic","q":"OSPF neighbours will not form across a /30 link. Both sides are area 0.0.0.0. Classic cause?","o":["The link is too short","OSPF needs BGP","Different hello or dead timers, or a mismatched MTU","lo0 is missing"],"a":2,"why":"Timers and MTU must match before neighbours go Full."},
    {"u":"classic","q":"You typed exit in config mode with uncommitted changes. What does Junos do?","o":["Commits them","Warns you and asks whether to exit with uncommitted changes","Deletes them silently","Reboots"],"a":1,"why":"It asks first. Answer no, then commit or rollback."},
    {"u":"classic","q":"Trunk port, but the switch next door drops your tagged frames for VLAN 20. What is the classic oopsie?","o":["VLAN 20 is not in vlan members on one side","Trunks only carry VLAN 1","The cable is crossed","VLAN 20 needs irb"],"a":0,"why":"Both ends must allow the VLAN. One missing member and the frames are dropped."},
    {"u": "classic", "q": "Cisco habit. You want the config to survive a reboot. What do you do in Junos?", "code": "copy running-config startup-config", "o": ["write memory", "commit; a committed config already survives a reboot", "request system save", "save /config"], "a": 1, "why": "Junos has no separate startup config. Once you commit, the change is saved."},
    {"u": "classic", "q": "Cisco habit. Which Junos command lists every port and whether it is up?", "code": "show ip interface brief", "o": ["show ip brief", "show ports", "show interfaces terse"], "a": 2, "why": "show interfaces terse gives one line per interface, with its Admin and Link state."},
    {"u": "classic", "q": "Cisco habit. Which command shows the MAC table on an ELS switch?", "code": "show mac address-table", "o": ["show ethernet-switching table", "show mac table", "show mac-address table", "show arp"], "a": 0, "why": "On ELS the MAC table is the ethernet-switching table. show arp maps IP to MAC, which is a different table."},
    {"u": "classic", "q": "Cisco habit. How do you name the switch in Junos?", "code": "hostname CORE1", "o": ["set hostname CORE1", "set system host-name CORE1", "set system name CORE1", "set chassis name CORE1"], "a": 1, "why": "The name lives under system. The word is host-name, with a dash."},
    {"u": "classic", "q": "Cisco habit. How do you reboot a Juniper switch?", "code": "reload", "o": ["reboot now", "restart system", "request system reboot"], "a": 2, "why": "Big actions in operational mode start with request. The switch asks you to confirm first."},
    {"u": "classic", "q": "You want the config as set lines you can copy and paste. What do you add?", "code": "show configuration", "o": ["| display set", "| set", "| no-more", "| display xml"], "a": 0, "why": "show configuration | display set prints every line as a set command."},
    {"u": "classic", "q": "You changed a lot in config mode. How do you see what you changed before you commit?", "o": ["commit check", "show | compare", "show changes", "rollback 1"], "a": 1, "why": "show | compare lists your uncommitted changes. A + marks an added line, a - a removed one."},
    {"u": "classic", "q": "The candidate is a mess. You want to throw away every change since the last commit. Which?", "o": ["delete", "rollback 1", "rollback 0", "exit"], "a": 2, "why": "rollback 0 loads the active config back into the candidate. rollback 1 would load the commit before that."},
    {"u": "classic", "q": "Long output stops at ---(more)--- after one screen. How do you get it all at once?", "o": ["add | no-more", "add | all", "press Ctrl+C", "add extensive"], "a": 0, "why": "| no-more turns the pager off for that one command."},
    {"u": "classic", "q": "You ping the gateway and the replies never stop. What did you leave out?", "code": "ping 10.0.0.1", "o": ["a packet size", "count, like ping 10.0.0.1 count 5", "rapid", "a source address"], "a": 1, "why": "Junos ping runs until you press Ctrl+C. count stops it after that many pings."},
    {"u": "classic", "q": "You set this address. Hosts in 10.1.1.0/24 cannot reach the switch. Why?", "code": "set interfaces irb unit 10 family inet address 10.1.1.1", "o": ["irb needs unit 0", "With no prefix length Junos uses /32, so the subnet is missing", "inet should be inet6", "The address must end in .254"], "a": 1, "why": "Always type the length: 10.1.1.1/24."},
    {"u": "classic", "q": "The irb has an address, but hosts in STAFF cannot ping their gateway. What is missing?", "code": "set vlans STAFF vlan-id 10\nset interfaces irb unit 10 family inet address 10.10.0.1/24", "o": ["set vlans STAFF l3-interface irb.10", "set interfaces irb unit 10 vlan STAFF", "set protocols ospf irb.10", "set vlans STAFF gateway 10.10.0.1"], "a": 0, "why": "The VLAN has to point at its irb unit. Without l3-interface the two are not linked."},
    {"u": "classic", "q": "Someone plugs a small switch into an edge port, and the port shuts down. Why?", "o": ["The cable is too long", "bpdu-block-on-edge saw BPDUs from the small switch", "The VLAN is full", "RSTP is off"], "a": 1, "why": "Edge ports expect end devices only. When BPDUs arrive, the port is blocked to stop a loop."},
    {"u": "classic", "q": "The small switch is gone, but the port stays down. Which command frees it?", "o": ["clear error bpdu interface ge-0/0/5", "request interface ge-0/0/5 up", "set interfaces ge-0/0/5 enable", "commit"], "a": 0, "why": "A port blocked by BPDU protection stays down until you clear the error, or until its disable-timeout runs out."},
    {"u": "classic", "q": "OSPF should advertise the user VLAN but never send hellos to the users. What do you add to this line?", "code": "set protocols ospf area 0 interface irb.10", "o": ["passive", "stub", "disable", "no-hello"], "a": 0, "why": "passive advertises the subnet but forms no neighbours on it."},
    {"u": "classic", "q": "Junos refuses this line. Why?", "code": "set vlans LAB vlan-id 4095", "o": ["VLAN IDs run from 1 to 4094", "The VLAN name must be a number", "LAB is a reserved name", "vlan-id needs quotes"], "a": 0, "why": "0 and 4095 are reserved. Pick a number from 1 to 4094."},
    {"u": "classic", "q": "You want to commit and leave config mode in one go. Which?", "o": ["commit exit", "commit and-quit", "commit quit", "save and-quit"], "a": 1, "why": "commit and-quit commits, then drops you back to operational mode."}
  ]
});
