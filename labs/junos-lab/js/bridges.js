const BASICS_GROUP = "Basics: start here, in order";
function bridgeHost(name, x, y, os, ip, bits, gw){
  const h = siteHost(name, x, y, os);
  if(ip) hostSet(h, ip, bits, gw || null);
  return h;
}
function bridgeDesc(swName, port){
  const sw = byName(swName);
  const d = sw && cfgGet(sw.config, ["interfaces", port, "description"]);
  return typeof d === "string" ? d : "";
}
function bridgeRtrAddr(name, port, ip){
  const r = byName(name);
  const l3 = r && D(r).l3ports[port];
  return !!(l3 && l3.ip === ip && l3.bits === 24);
}

const BRIDGE_SCENARIOS = [
  {
    after: "basic-connect",
    id: "meet-the-switch",
    group: BASICS_GROUP, kind: "empty",
    title: "1b. Meet the Switch",
    desc: "Before you configure anything, learn to get in and look around. Place one switch and one Linux PC (the engineer's laptop). Run a console cable from the laptop to the switch's CON port, power the switch on, log in as root, type cli, then run show version and show interfaces terse. You change nothing in this scenario.",
    checks: [
      { desc: "1 switch and 1 Linux PC (the engineer's laptop) placed",
        why: "An engineer brings their own laptop to a new switch. Without it there is nothing to type on, because a factory-fresh switch has no network address to reach.",
        test: () => devsBy("switch").length >= 1 && devsBy("host").length >= 1 },
      { desc: "A console cable runs from the laptop to the switch's CON port",
        why: "The console port talks to the switch directly, with no network needed. Without it you have no way in until the switch has an address, and it has none yet.",
        test: () => Object.values(links).some(l => l.kind === "console" &&
          [l.a, l.b].some(e => e.port === "con" && devices[e.dev] && devices[e.dev].type === "switch") &&
          [l.a, l.b].some(e => devices[e.dev] && devices[e.dev].type === "host")) },
      { desc: "The switch is powered on",
        why: "New hardware arrives switched off. Without pressing the power button the console stays silent, which looks exactly like a broken cable.",
        test: () => devsBy("switch").some(sw => sw.powered !== false) },
      { desc: "You are at the Junos prompt: logged in as root, then typed cli",
        why: "Logging in as root lands you in a Unix shell, shown by a % sign. Without typing cli you are not in Junos yet, and Junos commands are refused.",
        test: () => devsBy("switch").some(sw => sw.powered !== false && !sw.cli.stage && (sw.cli.mode === "op" || sw.cli.mode === "cfg")) },
      { desc: "You ran show version on the switch",
        why: "Looking is free and safe: show commands never change anything. Without the habit of looking first, every later ticket starts with a guess.",
        test: () => devsBy("switch").some(sw => sw.cli.sawVersion === true) },
    ],
    hints: [
      "Add a switch and choose Brand new, in the box, so it arrives switched off like real hardware. Then Add > Host and choose Linux PC: an engineer's laptop. Open the Connect menu, choose Console, click the laptop, then click the small CON port at the top of the switch.",
      "Press the PWR button on the switch and click the switch to open its terminal. Wait for login:, type root and press Enter. A factory-fresh switch has no password yet.",
      "The prompt ending in % is a Unix shell, not Junos. Type cli. The prompt changes to root> and you are in Junos operational mode, where show commands live.",
      "Now look around: show version tells you the model and software, show interfaces terse lists every port and whether it is up. Type ? at any time to see what you can type next.",
    ],
  },
  {
    after: "vlan-split",
    id: "read-the-switch",
    group: BASICS_GROUP, kind: "starter",
    title: "3b. Read the Switch Before You Change It",
    tour: { start: ["floor-sw", "pc-ben"] },
    desc: "TICKET: pc-ben (a Mac) has no network. pc-anna (Windows) and the engineer's admin-laptop (Linux) on the same switch are fine. Do not guess. Ask floor-sw which port is down and why, repair it, and then label the three PC ports with a description naming the machine on each, so the next engineer can read it straight from the switch.",
    setup(){
      siteZone("Office floor", 60, 100, 700, 400, "building", 4);
      makeCrac(90, 420, "AC-Floor", 3500);
      const sw = siteRole(makeSwitch(280, 150, 12), "Juniper EX2300 · floor");
      cfgDo(sw, ["set system host-name floor-sw", "set interfaces ge-0/0/2 disable"]);
      const a = bridgeHost("pc-anna", 160, 330, "windows", "10.0.0.11", 24);
      const b = bridgeHost("pc-ben", 320, 330, "macos", "10.0.0.12", 24);
      const c = bridgeHost("admin-laptop", 480, 330, "linux", "10.0.0.13", 24);
      cable(a, "eth0", sw, "ge-0/0/1");
      cable(b, "eth0", sw, "ge-0/0/2");
      cable(c, "eth0", sw, "ge-0/0/3");
    },
    checks: [
      { desc: "Port ge-0/0/2 on floor-sw is no longer shut",
        why: "A port can be switched off in the configuration even though the cable is fine. Without reading the port list you would swap a good cable and change nothing.",
        test: () => { const sw = byName("floor-sw"); const pc = sw && D(sw).portCfg["ge-0/0/2"]; return !!sw && !(pc && pc.disabled); } },
      { desc: "pc-ben pings pc-anna (10.0.0.11)",
        why: "The user's complaint was no network, so the user's machine is where the fix is proven. Without that ping you only know the port light is on.",
        test: () => pingOk("pc-ben", "10.0.0.11") },
      { desc: "Ports ge-0/0/1, ge-0/0/2 and ge-0/0/3 each carry a description naming their PC",
        why: "A description is a label stored on the switch itself. Without it, the next person has to trace three cables by hand to learn what you just learned.",
        test: () => bridgeDesc("floor-sw", "ge-0/0/1").includes("anna") && bridgeDesc("floor-sw", "ge-0/0/2").includes("ben") && bridgeDesc("floor-sw", "ge-0/0/3").includes("admin") },
    ],
    hints: [
      "Start with the question, not the answer: on floor-sw run show interfaces terse. Every port has two states, Admin and Link. Find the one port whose Admin state is down.",
      "Admin down means someone turned it off in the configuration. See how: show configuration interfaces ge-0/0/2. The word disable is the whole fault.",
      "Remove it: configure, then delete interfaces ge-0/0/2 disable, then commit. delete removes exactly the statement you name.",
      "Label the ports: set interfaces ge-0/0/1 description pc-anna, set interfaces ge-0/0/2 description pc-ben, set interfaces ge-0/0/3 description admin-laptop, then commit. show interfaces descriptions lists them.",
    ],
  },
  {
    after: "access-distribution",
    id: "first-router",
    group: BASICS_GROUP, kind: "starter",
    title: "4b. Your First Router",
    tour: { touch: ["office-rtr", "pc-sales", "pc-design"] },
    desc: "TICKET: Sales and Design are two separate networks, 10.0.1.0/24 and 10.0.2.0/24. A switch cannot connect two different networks: that is a router's job. office-rtr is cabled to pc-sales (Windows, 10.0.1.10) on ge-0/0/0 and to pc-design (a Mac, 10.0.2.10) on ge-0/0/1, but it has no addresses yet. Give the router .1 in each network, then tell each PC that the router is its gateway.",
    setup(){
      siteZone("Office", 60, 100, 700, 400, "building", 4);
      makeCrac(90, 420, "AC-Office", 3500);
      const r = siteRole(makeRouter(280, 150, 4), "Juniper SRX300 · office");
      cfgDo(r, ["set system host-name office-rtr"]);
      const a = bridgeHost("pc-sales", 200, 330, "windows", "10.0.1.10", 24);
      const b = bridgeHost("pc-design", 400, 330, "macos", "10.0.2.10", 24);
      cable(a, "eth0", r, "ge-0/0/0");
      cable(b, "eth0", r, "ge-0/0/1");
    },
    checks: [
      { desc: "office-rtr has 10.0.1.1/24 on ge-0/0/0 and 10.0.2.1/24 on ge-0/0/1",
        why: "A router joins networks by having one foot in each. Without an address in a network, the router is not part of it and cannot pass anything along.",
        test: () => bridgeRtrAddr("office-rtr", "ge-0/0/0", "10.0.1.1") && bridgeRtrAddr("office-rtr", "ge-0/0/1", "10.0.2.1") },
      { desc: "Each PC pings its own gateway",
        why: "The gateway is the router's address inside the PC's own network. Without reaching it, the PC has no door to anywhere else.",
        test: () => pingOk("pc-sales", "10.0.1.1") && pingOk("pc-design", "10.0.2.1") },
      { desc: "pc-sales pings pc-design across the router",
        why: "A PC only sends traffic for other networks to its gateway if it has been told one. Without a gateway set on both PCs, the ping or its reply has nowhere to go.",
        test: () => pingOk("pc-sales", "10.0.2.10") },
    ],
    hints: [
      "A router port gets its address directly, with no VLAN in between. On office-rtr: configure, then set interfaces ge-0/0/0 unit 0 family inet address 10.0.1.1/24.",
      "The same for the second network: set interfaces ge-0/0/1 unit 0 family inet address 10.0.2.1/24, then commit. From each PC, ping its own .1 to prove the router answers.",
      "Now try pc-sales to 10.0.2.10: it fails, because neither PC knows where to send traffic for another network. Each needs a gateway, and each system says it differently.",
      "Windows, on pc-sales: netsh interface ip set address \"Ethernet\" static 10.0.1.10 255.255.255.0 10.0.1.1. Mac, on pc-design: networksetup -setmanual \"Ethernet\" 10.0.2.10 255.255.255.0 10.0.2.1. Then ping across.",
    ],
  },
  {
    after: "first-router",
    id: "first-default-route",
    group: BASICS_GROUP, kind: "starter",
    title: "4c. A Way Out: the Default Route",
    tour: { touch: ["edge-rtr", "client-pc", "ISP"] },
    desc: "TICKET: the office network already works: client-pc (Windows, 192.168.10.20) reaches its gateway edge-rtr at 192.168.10.1. The internet line is cabled from edge-rtr ge-0/0/0 to the ISP, and that is all. The provider gave you 203.0.113.2/30 for your side, and their side is 203.0.113.1. Put the address on the line, then give the router a default route: one line that says send everything I do not know to the provider. Prove that client-pc can ping the provider.",
    setup(){
      siteZone("Office", 60, 140, 700, 380, "building", 4);
      makeCrac(90, 440, "AC-Office", 3500);
      const isp = makeIsp(300, 30, "203.0.113.1");
      const r = siteRole(makeRouter(280, 190, 4), "Juniper SRX300 · edge");
      cfgDo(r, ["set system host-name edge-rtr", "set interfaces ge-0/0/1 unit 0 family inet address 192.168.10.1/24"]);
      const a = bridgeHost("client-pc", 300, 360, "windows", "192.168.10.20", 24, "192.168.10.1");
      cable(r, "ge-0/0/0", isp, "wan0", "remote");
      cable(a, "eth0", r, "ge-0/0/1");
    },
    checks: [
      { desc: "edge-rtr has 203.0.113.2/30 on ge-0/0/0 and pings the provider at 203.0.113.1",
        why: "A /30 is a tiny network with room for exactly two devices: you and the provider. Without your half of it, the two routers on one cable cannot talk.",
        test: () => { const r = byName("edge-rtr"); const l3 = r && D(r).l3ports["ge-0/0/0"];
          return !!(l3 && l3.ip === "203.0.113.2" && l3.bits === 30) && pingOk("edge-rtr", "203.0.113.1"); } },
      { desc: "edge-rtr has a default route pointing at the provider",
        why: "A router only knows the networks it is plugged into. Without a default route, a packet for anywhere else is dropped because the router has no idea where it lives.",
        test: () => { const r = byName("edge-rtr"); const d = r && cfgGet(r.config, ["routing-options", "static", "route", "0.0.0.0/0"]); return !!d; } },
      { desc: "client-pc pings the provider at 203.0.113.1",
        why: "This proves the whole path: PC to gateway, gateway out of the line. Without testing from the PC you only know the router works, not the office.",
        test: () => pingOk("client-pc", "203.0.113.1") },
    ],
    hints: [
      "Address the line first: on edge-rtr, configure, then set interfaces ge-0/0/0 unit 0 family inet address 203.0.113.2/30, commit, and ping 203.0.113.1 from the router.",
      "Now the idea: 0.0.0.0/0 means every address there is. A route for it is the catch-all, used when nothing more specific matches. show route before you add it shows only your two connected networks.",
      "Add it: set routing-options static route 0.0.0.0/0 next-hop 203.0.113.1, then commit. The next hop is the provider's side of the line.",
      "On client-pc: ping 203.0.113.1 works. Then try ping 8.8.8.8 and read the reason it fails: the internet will not answer a private 192.168 address. Solving that is called NAT, and it is the new part of scenario 5.",
    ],
  },
  {
    after: "access-control-segment",
    id: "first-filter",
    group: BASICS_GROUP, kind: "starter",
    title: "7b. Your First Firewall Filter",
    tour: { touch: ["office-rtr", "pc-guest"] },
    desc: "TICKET: office-rtr routes between Staff (10.0.1.0/24, pc-staff, Windows) and Guests (10.0.2.0/24, pc-guest, a Mac), and right now a guest can reach staff machines. A router passes everything it has a route for unless a filter says otherwise. Write a filter called GUEST-IN that drops traffic to the staff network and accepts the rest, and apply it where guest traffic enters the router: ge-0/0/1.",
    setup(){
      siteZone("Office", 60, 100, 700, 400, "building", 4);
      makeCrac(90, 420, "AC-Office", 3500);
      const r = siteRole(makeRouter(280, 150, 4), "Juniper SRX300 · office");
      cfgDo(r, ["set system host-name office-rtr",
        "set interfaces ge-0/0/0 unit 0 family inet address 10.0.1.1/24",
        "set interfaces ge-0/0/1 unit 0 family inet address 10.0.2.1/24"]);
      const a = bridgeHost("pc-staff", 200, 330, "windows", "10.0.1.10", 24, "10.0.1.1");
      const b = bridgeHost("pc-guest", 400, 330, "macos", "10.0.2.10", 24, "10.0.2.1");
      cable(a, "eth0", r, "ge-0/0/0");
      cable(b, "eth0", r, "ge-0/0/1");
    },
    checks: [
      { desc: "A filter is applied to traffic entering office-rtr on ge-0/0/1",
        why: "A filter does nothing until it is attached to an interface, in a direction. Without that last line you have written a rule that nobody enforces.",
        test: () => { const r = byName("office-rtr"); const l3 = r && D(r).l3ports["ge-0/0/1"]; return !!(l3 && l3.fIn); } },
      { desc: "pc-guest can no longer reach pc-staff (10.0.1.10)",
        why: "Routing decides where traffic can go, a filter decides whether it may. Without the discard term, the router keeps delivering guests to staff.",
        test: () => !pingOk("pc-guest", "10.0.1.10") },
      { desc: "pc-guest still reaches its own gateway (10.0.2.1)",
        why: "Every Junos filter ends with a hidden rule that drops whatever no term accepted. Without a final accept term, you block the guest from everything, not just from staff.",
        test: () => pingOk("pc-guest", "10.0.2.1") },
    ],
    hints: [
      "See the problem first: on pc-guest, ping 10.0.1.10 answers. A filter is a list of terms read top to bottom. Each term says: if the packet looks like this, then do that.",
      "Term one, the block: on office-rtr, set firewall family inet filter GUEST-IN term no-staff from destination-address 10.0.1.0/24, and set firewall family inet filter GUEST-IN term no-staff then discard.",
      "Term two, everything else: set firewall family inet filter GUEST-IN term ok then accept. Skip this and the hidden last rule drops all guest traffic.",
      "Attach it: set interfaces ge-0/0/1 unit 0 family inet filter input GUEST-IN, then commit. From pc-guest, ping 10.0.1.10 now fails and ping 10.0.2.1 still answers.",
    ],
  },
];
function applyBridges(list){
  const at = id => list.findIndex(s => s.id === id);
  const dz = at("rename-switch"), vl = at("vlan-split");
  if(dz > vl && vl >= 0){
    const d = list.splice(dz, 1)[0];
    list.splice(vl, 0, d);
  }
  BRIDGE_SCENARIOS.forEach(b => {
    const i = at(b.after);
    if(i >= 0) list.splice(i + 1, 0, b);
  });
}
const bridgeExecInner = deviceExec;
deviceExec = function(dev, cmd){
  const out = bridgeExecInner(dev, cmd);
  if(dev && dev.type === "switch" && dev.cli && !dev.cli.stage && /^\s*sh\S*\s+ver\S*\s*$/.test(String(cmd)) && out.some(l => l.cls !== "err"))
    dev.cli.sawVersion = true;
  return out;
};
