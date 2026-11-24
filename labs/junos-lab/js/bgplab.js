const BGP_L1 = "BGP step by step: Level 1, bring a session up";
const BGP_L2 = "BGP step by step: Level 2, what a session gives you";
const BGP_L3 = "BGP step by step: Level 3, two providers";
const BGP_L4 = "BGP step by step: Level 4, announce your own network";
const BGP_INTRO = "BGP in one sentence: two routers that know each other's AS number open a session and swap lists of networks they can reach. Here edge-r1 is your edge router, in your own AS 65010. Provider A is AS 65001 and sits at 203.0.113.1 on the other end of ge-0/0/0. Once the session is Established, the provider tells you about the default route 0.0.0.0/0. Then office-pc (10.0.50.20, NAT already set up) gets internet without you typing a route. show bgp summary on edge-r1 is your main tool: Established is good, and for every other state the last column says why. ";
const BGP_INTRO_2 = BGP_INTRO + "This site also has Provider B: AS 65002 at 198.51.100.1 on ge-0/0/2, with addresses and NAT already in place. ";
const BGP_INTRO_PUB = "Your company also owns a block of public addresses, 192.0.2.0/24. It lives on edge-r1 ge-0/0/3, and web-server-1 has 192.0.2.10 with no NAT in front of it. A public address only works if the internet knows where it lives. The only way to tell the internet is to announce the network to your provider over BGP. By default Junos announces nothing of your own: you choose what to announce with an export policy. ";

function bgpBase(opts){
  opts = opts || {};
  const B = {};
  siteZone("Server room", 60, 150, 780, 420, "building", 2);
  makeCrac(90, 490, "AC-Server-room", 3500);
  B.ispA = makeIsp(240, 30, "203.0.113.1");
  devices[B.ispA].name = "Provider A";
  devices[B.ispA].cfg.asn = 65001;
  B.edge = siteRole(makeRouter(260, 200, 4), "Juniper SRX345 · edge");
  B.pc = siteHost("office-pc", 150, 400, "windows");
  hostSet(B.pc, "10.0.50.20", 24, "10.0.50.1");
  cable(B.edge, "ge-0/0/0", B.ispA, "wan0", "remote");
  cable(B.pc, "eth0", B.edge, "ge-0/0/1");
  const cmds = [
    "set system host-name edge-r1",
    "set interfaces ge-0/0/0 unit 0 family inet address 203.0.113.2/30",
    "set interfaces ge-0/0/1 unit 0 family inet address 10.0.50.1/24",
    "set security nat source rule-set OFFICE-A from interface ge-0/0/1.0",
    "set security nat source rule-set OFFICE-A to interface ge-0/0/0.0",
    "set security nat source rule-set OFFICE-A rule R1 match source-address 10.0.50.0/24",
    "set security nat source rule-set OFFICE-A rule R1 then source-nat interface",
  ];
  if(opts.second){
    B.ispB = makeIsp(560, 30, "198.51.100.1");
    devices[B.ispB].name = "Provider B";
    devices[B.ispB].cfg.asn = 65002;
    cable(B.edge, "ge-0/0/2", B.ispB, "wan0", "remote");
    cmds.push(
      "set interfaces ge-0/0/2 unit 0 family inet address 198.51.100.2/30",
      "set security nat source rule-set OFFICE-B from interface ge-0/0/1.0",
      "set security nat source rule-set OFFICE-B to interface ge-0/0/2.0",
      "set security nat source rule-set OFFICE-B rule R1 match source-address 10.0.50.0/24",
      "set security nat source rule-set OFFICE-B rule R1 then source-nat interface");
  }
  if(opts.pub){
    B.web = siteServer("web-server-1", 520, 400, "Linux server · public web");
    hostSet(B.web, "192.0.2.10", 24, "192.0.2.1");
    cable(B.web, "eth0", B.edge, "ge-0/0/3");
    cmds.push("set interfaces ge-0/0/3 unit 0 family inet address 192.0.2.1/24");
  }
  if(opts.as !== false) cmds.push("set routing-options autonomous-system 65010");
  if(opts.a !== false) cmds.push(
    "set protocols bgp group TO-A type external",
    "set protocols bgp group TO-A peer-as " + (opts.aPeerAs || 65001),
    "set protocols bgp group TO-A neighbor " + (opts.aNeighbor || "203.0.113.1"));
  if(opts.second && opts.b) cmds.push(
    "set protocols bgp group TO-B type external",
    "set protocols bgp group TO-B peer-as 65002",
    "set protocols bgp group TO-B neighbor 198.51.100.1");
  if(opts.extra) cmds.push(...opts.extra);
  cfgDo(B.edge, cmds);
  if(opts.staged){
    const dev = devices[B.edge];
    dev.cli.mode = "cfg"; dev.cli.editKeys = [];
    opts.staged.forEach(c => cfgExec(dev, c));
    dev.cli.mode = "op";
  }
  rebuildAllDerived();
  return B;
}
function bgpPeers(){ const r = byName("edge-r1"); return (r && r.d && r.d.bgpPeers) || []; }
function bgpUp(addr){ return bgpPeers().some(p => p.addr === addr && p.state === "Established"); }
function bgpSent(addr){ const p = bgpPeers().find(x => x.addr === addr); return (p && p.state === "Established" && p.sent) || []; }
function bgpDefaultVia(){
  const r = byName("edge-r1");
  if(!r) return null;
  const lk = routeLookup(r, "8.8.8.8");
  return lk && lk.proto === "bgp" ? lk.nh : null;
}
function bgpOnline(name){ return pingOk(name, "8.8.8.8"); }

const BGP_SCENARIOS = [
  {
    id: "bgp-local-as",
    group: BGP_L1,
    title: "59. BGP 1: Who Are You?",
    intro: BGP_INTRO,
    tour: { start: ["edge-r1"] },
    desc: "TICKET: a colleague typed the BGP neighbour into edge-r1 and went home without committing. The lines are still waiting in the candidate configuration, and the office has no internet. Go into configure mode, look at what is waiting, and try to commit it. Junos will refuse and tell you what is missing: the router does not know its own AS number. Give edge-r1 its AS, 65010, and commit.",
    setup(){ bgpBase({ as: false, a: false, staged: [
      "set protocols bgp group TO-A type external",
      "set protocols bgp group TO-A peer-as 65001",
      "set protocols bgp group TO-A neighbor 203.0.113.1",
    ] }); },
    checks: [
      { desc: "edge-r1 knows its own AS number",
        why: "An AS number is the name a network uses in BGP. Without it the router cannot introduce itself, so Junos refuses to commit a BGP neighbour at all.",
        test: () => { const r = byName("edge-r1"); return !!(r && r.d && r.d.as); } },
      { desc: "The session to Provider A is Established",
        why: "Established is the only state in which routes are exchanged. Without it BGP is configured but silent.",
        test: () => bgpUp("203.0.113.1") },
      { desc: "office-pc reaches the internet over the learned default route",
        why: "The default route arrives through the session, nobody typed it. Without the session there is no route out, so the PC is cut off.",
        test: () => bgpDefaultVia() === "203.0.113.1" && bgpOnline("office-pc") },
    ],
    hints: [
      "See what your colleague left behind: on edge-r1 type configure, then show | compare. The lines with a plus are typed but not active yet. show bgp summary confirms that BGP is not running.",
      "Try it: commit. Junos checks the whole configuration first and refuses, and the error says exactly what is missing. The AS number lives under routing-options, not under protocols bgp.",
      "Still in configure mode: set routing-options autonomous-system 65010, then commit. Run show bgp summary until it says Established, then show route to see the default tagged BGP.",
    ],
  },
  {
    id: "bgp-peer-as",
    group: BGP_L1,
    title: "60. BGP 2: Who Is Your Neighbour?",
    intro: BGP_INTRO,
    tour: { start: ["edge-r1", "Provider A"] },
    desc: "TICKET: edge-r1 has its AS and a neighbour, but the session sits in Active and never becomes Established. Each side must name the other's AS correctly. Find out which AS the provider really uses, compare it with what edge-r1 expects, and correct it.",
    setup(){ bgpBase({ aPeerAs: 65100 }); },
    checks: [
      { desc: "edge-r1 expects the provider's real AS number, 65001",
        why: "peer-as is who you expect on the other end. Without the right number the provider's answer is treated as a stranger and refused.",
        test: () => { const r = byName("edge-r1"); return !!r && (r.d.bgpGroups || []).some(g => g.peerAs === 65001); } },
      { desc: "The session to Provider A is Established",
        why: "Both sides check each other's AS when they open the session. Without a match they keep trying forever, which is what Active means.",
        test: () => bgpUp("203.0.113.1") },
      { desc: "office-pc reaches the internet",
        why: "A session that is almost up delivers nothing. Without Established there is no default route, so the test from the PC is the proof.",
        test: () => bgpOnline("office-pc") },
    ],
    hints: [
      "Read both sides. On edge-r1, show bgp summary gives the state and the reason. Click Provider A and run show bgp: the provider says which AS it is.",
      "Active means your side is complete and trying, but the other end does not agree. The reason names two AS numbers that do not match.",
      "On edge-r1: set protocols bgp group TO-A peer-as 65001, then commit. Setting a value that already exists simply replaces it.",
    ],
  },
  {
    id: "bgp-neighbor-address",
    group: BGP_L1,
    title: "61. BGP 3: Where Is Your Neighbour?",
    intro: BGP_INTRO,
    tour: { start: ["edge-r1"] },
    desc: "TICKET: the AS numbers on edge-r1 are right this time, yet the session is still down. A BGP neighbour to a provider must be an address on a network the router is directly plugged into. Compare the neighbour address with the address on ge-0/0/0, find the typo, and replace the wrong neighbour with the right one.",
    setup(){ bgpBase({ aNeighbor: "203.0.113.11" }); },
    checks: [
      { desc: "edge-r1 has Provider A's real address, 203.0.113.1, as its neighbour",
        why: "BGP does not search for neighbours, it calls the exact address you give it. Without the right address it is knocking on an empty door.",
        test: () => bgpPeers().some(p => p.addr === "203.0.113.1") },
      { desc: "The wrong neighbour is gone: every configured neighbour is Established",
        why: "A leftover neighbour that can never come up fills the summary with noise. Without removing it, the next engineer chases a fault that is only a typo.",
        test: () => bgpPeers().length > 0 && bgpPeers().every(p => p.state === "Established") },
      { desc: "office-pc reaches the internet",
        why: "The session is only a means. Without the default route it brings, the office stays offline.",
        test: () => bgpOnline("office-pc") },
    ],
    hints: [
      "Two commands side by side. show bgp summary shows which address the router is calling. show interfaces terse shows the address on ge-0/0/0. The neighbour must be in the same small network as that interface.",
      "ge-0/0/0 is 203.0.113.2/30. A /30 holds exactly two usable addresses, .1 and .2. You are .2, so the provider can only be .1.",
      "A neighbour is a list entry, so setting a new one adds to the list. Remove the wrong one first: delete protocols bgp group TO-A neighbor 203.0.113.11, then set protocols bgp group TO-A neighbor 203.0.113.1, and commit.",
    ],
  },
  {
    id: "bgp-static-wins",
    group: BGP_L2,
    title: "62. BGP 4: The Typed Route That Wins",
    intro: BGP_INTRO,
    tour: { start: ["edge-r1", "office-pc"] },
    desc: "TICKET: BGP on edge-r1 is Established and the provider sends the default route, but office-pc still has no internet. Years ago someone typed a default route by hand, pointing at an old firewall at 10.0.50.254 that no longer exists. Look at show route: two default routes are there. Work out which one the router uses and why, then remove the one that should not be there.",
    setup(){ bgpBase({ extra: ["set routing-options static route 0.0.0.0/0 next-hop 10.0.50.254"] }); },
    checks: [
      { desc: "edge-r1 has no hand-typed default route any more",
        why: "A static route has preference 5 and a BGP route 170, and the lower number wins. Without removing the static one, the learned route sits unused beside it.",
        test: () => { const r = byName("edge-r1"); return !!r && !cfgGet(r.config, ["routing-options", "static", "route", "0.0.0.0/0"]); } },
      { desc: "The default route in use is the one learned over BGP",
        why: "A learned route disappears when the provider does, a typed one stays and sends traffic into nothing. Without the learned one in charge, an outage looks like a mystery.",
        test: () => bgpDefaultVia() === "203.0.113.1" },
      { desc: "office-pc reaches the internet",
        why: "The session was healthy the whole time, so only a real test shows the fix. Without it you would have blamed BGP for a problem a static route caused.",
        test: () => bgpOnline("office-pc") },
    ],
    hints: [
      "Start where it works: show bgp summary says Established, so BGP is not the problem. Now run show route and count the lines for 0.0.0.0/0.",
      "Each route line shows its source and a number, like Static/5 and BGP/170. That number is the preference. When two routes go to the same place, the lower preference is used.",
      "Remove the typed one: delete routing-options static route 0.0.0.0/0, then commit. Run show route again: the BGP route is now the active one.",
    ],
  },
  {
    id: "bgp-link-first",
    group: BGP_L2,
    title: "63. BGP 5: Check the Cable Before the Protocol",
    intro: BGP_INTRO,
    tour: { start: ["edge-r1"] },
    desc: "INCIDENT: internet is down for the office since a maintenance window. The BGP configuration on edge-r1 was not touched and is correct. BGP is a conversation carried over the link to the provider, so it can only be as healthy as that link. Find what is wrong below BGP and repair it.",
    setup(){ bgpBase({ extra: ["set interfaces ge-0/0/0 disable"] }); },
    checks: [
      { desc: "The link to Provider A is up: ge-0/0/0 is no longer disabled",
        why: "BGP runs on top of an ordinary connection between two addresses. Without a working interface underneath, no BGP setting can bring the session up.",
        test: () => { const r = byName("edge-r1"); const pc = r && D(r).portCfg["ge-0/0/0"]; return !!r && !(pc && pc.disabled); } },
      { desc: "The session to Provider A is Established again",
        why: "The session returns by itself once the link is back. Without waiting for Established you cannot tell a link fault from a BGP fault.",
        test: () => bgpUp("203.0.113.1") },
      { desc: "office-pc reaches the internet",
        why: "The default route left when the session dropped and comes back with it. Without that behaviour traffic would keep flowing into a dead link.",
        test: () => bgpOnline("office-pc") },
    ],
    hints: [
      "Work from the bottom up. show bgp summary shows the session is down, but do not change BGP yet. Run show interfaces terse and read the line for ge-0/0/0.",
      "The interface is administratively down: someone shut it during maintenance and never opened it again. show configuration interfaces ge-0/0/0 shows the word that does it.",
      "In configure mode: delete interfaces ge-0/0/0 disable, then commit. Watch show bgp summary go back to Established on its own, and show route get its default back.",
    ],
  },
  {
    id: "bgp-second-provider",
    group: BGP_L3,
    title: "64. BGP 6: Add a Second Provider",
    intro: BGP_INTRO_2,
    tour: { touch: ["edge-r1", "Provider B"] },
    desc: "TICKET: the company bought a second internet line from Provider B. The cable is in ge-0/0/2 and the address 198.51.100.2/30 and NAT are already configured. Add the BGP session to Provider B (AS 65002, neighbour 198.51.100.1) in its own group TO-B, next to the existing one.",
    setup(){ bgpBase({ second: true }); },
    checks: [
      { desc: "The session to Provider A is still Established",
        why: "The first provider carries the office right now. Without leaving its group alone you trade one working line for one new one.",
        test: () => bgpUp("203.0.113.1") },
      { desc: "A second session, to Provider B, is Established",
        why: "Each provider is a different AS, so each needs its own group with its own peer-as. Without that, the router would expect AS 65001 on a line that answers as 65002.",
        test: () => bgpUp("198.51.100.1") },
      { desc: "office-pc reaches the internet",
        why: "Two sessions mean two offers of a default route and the router picks one. Without a test you do not know the choice still works.",
        test: () => bgpOnline("office-pc") },
    ],
    hints: [
      "Copy what works. show configuration protocols bgp shows group TO-A: three lines. Provider B needs the same three lines with its own values. Click Provider B and run show bgp to read its AS.",
      "In configure mode: set protocols bgp group TO-B type external, set protocols bgp group TO-B peer-as 65002, set protocols bgp group TO-B neighbor 198.51.100.1. Commit.",
      "show bgp summary now lists two neighbours, both Established. show route still shows one active default: with two equal offers the router keeps the first.",
    ],
  },
  {
    id: "bgp-failover",
    group: BGP_L3,
    title: "65. BGP 7: Lose a Provider and Stay Online",
    intro: BGP_INTRO_2,
    tour: { touch: ["edge-r1", "office-pc"] },
    desc: "DRILL: both providers are connected and both sessions are Established. Management wants proof that the office survives losing Provider A. Take the line to Provider A down on purpose: disable ge-0/0/0 on edge-r1. Then show that office-pc is still online, and that its traffic now leaves through Provider B. Leave the line down so the result can be checked.",
    setup(){ bgpBase({ second: true, b: true }); },
    checks: [
      { desc: "The line to Provider A is down and its session is no longer Established",
        why: "A failover you never tested is only a diagram. Without really taking the line down, you do not know what the router does when it happens at night.",
        test: () => !bgpUp("203.0.113.1") && bgpPeers().some(p => p.addr === "203.0.113.1") },
      { desc: "The session to Provider B is still Established",
        why: "The two sessions are independent. Without a second one that stays up, losing the first means losing everything.",
        test: () => bgpUp("198.51.100.1") },
      { desc: "The default route now points at Provider B (198.51.100.1)",
        why: "When a session drops, the routes it brought are withdrawn and the next best offer takes over. Without BGP you would have to notice the outage and retype the route yourself.",
        test: () => bgpDefaultVia() === "198.51.100.1" },
      { desc: "office-pc is still online",
        why: "The users are the real test. Without a ping from the office, a clean routing table could still hide a NAT rule that only covered the first line.",
        test: () => bgpOnline("office-pc") },
    ],
    hints: [
      "Record the starting point first. Run show route on edge-r1 and note which provider the default goes to. Then run tracert 8.8.8.8 on office-pc to see the path.",
      "Take the primary line down: in configure mode, set interfaces ge-0/0/0 disable, then commit.",
      "Now watch it heal: show bgp summary shows one session down and one Established, and show route shows the default pointing at 198.51.100.1. Nobody typed that change.",
      "Prove it from the user's side: ping 8.8.8.8 and tracert 8.8.8.8 on office-pc. The path now goes through Provider B.",
    ],
  },
  {
    id: "bgp-announce",
    group: BGP_L4,
    title: "66. BGP 8: Tell the Internet Where You Live",
    intro: BGP_INTRO + BGP_INTRO_PUB,
    tour: { touch: ["edge-r1", "web-server-1"] },
    desc: "TICKET: the BGP session is Established and the office is online, but web-server-1 (192.0.2.10) cannot reach the internet and nobody outside can reach it. You are receiving routes and announcing none. Write an export policy called ANNOUNCE that accepts exactly your network 192.0.2.0/24, attach it to the BGP group, and check what you are announcing.",
    setup(){ bgpBase({ pub: true }); },
    checks: [
      { desc: "edge-r1 announces 192.0.2.0/24 to Provider A",
        why: "BGP works in two directions: what you learn and what you tell. Without telling the provider about your network, the internet has no idea your addresses exist.",
        test: () => bgpSent("203.0.113.1").includes("192.0.2.0/24") },
      { desc: "Provider A has learned the network from you",
        why: "The provider only forwards traffic for networks it has heard about. Without your announcement, packets for 192.0.2.10 are dropped far away from you.",
        test: () => { const a = byName("Provider A"); return !!(a && ispLearned(a, "192.0.2.10")); } },
      { desc: "web-server-1 reaches the internet and gets an answer back",
        why: "The ping leaves either way, it is the reply that needs the announcement. Without a route back, the server sends and never hears anything.",
        test: () => bgpOnline("web-server-1") },
      { desc: "office-pc is still online",
        why: "You changed the session the whole office depends on. Without re-testing it, an export policy mistake could go unnoticed.",
        test: () => bgpOnline("office-pc") },
    ],
    hints: [
      "See both directions separately. show route receive-protocol bgp 203.0.113.1 shows what the provider tells you. show route advertising-protocol bgp 203.0.113.1 shows what you tell the provider: nothing of your own yet. On web-server-1, ping 8.8.8.8 and read the reason.",
      "A policy is a list of terms: if a route matches the from part, do the then part. Describe your network and accept it: set policy-options policy-statement ANNOUNCE term mine from route-filter 192.0.2.0/24 exact, and set policy-options policy-statement ANNOUNCE term mine then accept.",
      "A policy does nothing until it is attached: set protocols bgp group TO-A export ANNOUNCE. Commit.",
      "Check your work: show route advertising-protocol bgp 203.0.113.1 now lists 192.0.2.0/24 and names the term that accepted it. Click Provider A and run show bgp to see it from their side.",
    ],
  },
  {
    id: "bgp-over-announce",
    group: BGP_L4,
    title: "67. BGP 9: Do Not Announce Everything",
    intro: BGP_INTRO + BGP_INTRO_PUB,
    tour: { start: ["edge-r1"] },
    desc: "TICKET: Provider A sent a complaint. edge-r1 announces routes it has no business announcing: its private office network and more. The export policy EVERYTHING accepts every route the router knows. Find out what is being announced, then change the policy so that 192.0.2.0/24 is the only network announced. web-server-1 must stay reachable.",
    setup(){
      bgpBase({ pub: true, extra: [
        "set policy-options policy-statement EVERYTHING term all then accept",
        "set protocols bgp group TO-A export EVERYTHING",
      ] });
    },
    checks: [
      { desc: "edge-r1 announces 192.0.2.0/24 to Provider A and nothing else",
        why: "An announcement is a promise that traffic for that network can be sent to you. Without limiting it, you promise to carry networks that are private or not yours.",
        test: () => { const s = bgpSent("203.0.113.1"); return s.length === 1 && s[0] === "192.0.2.0/24"; } },
      { desc: "The private office network 10.0.50.0/24 is no longer announced",
        why: "Private addresses are reused by every company in the world. Without filtering them out, your provider receives a route that can never be valid on the internet.",
        test: () => bgpUp("203.0.113.1") && !bgpSent("203.0.113.1").includes("10.0.50.0/24") },
      { desc: "web-server-1 and office-pc are both still online",
        why: "Tightening a policy can remove the one route you needed. Without testing both machines you may have fixed the complaint by breaking the service.",
        test: () => bgpOnline("web-server-1") && bgpOnline("office-pc") },
    ],
    hints: [
      "Look at the damage first: show route advertising-protocol bgp 203.0.113.1 lists every announced network with the term that allowed it. show configuration policy-options shows why: one term with no from part matches everything.",
      "A policy ends with an invisible rule that rejects whatever no term accepted. So you only need to accept what you want and delete the term that accepts all.",
      "In configure mode: delete policy-options policy-statement EVERYTHING term all, then set policy-options policy-statement EVERYTHING term mine from route-filter 192.0.2.0/24 exact and set policy-options policy-statement EVERYTHING term mine then accept. Commit.",
      "Run show route advertising-protocol bgp 203.0.113.1 again: one line. Then ping 8.8.8.8 from web-server-1.",
    ],
  },
  {
    id: "bgp-dual-homed",
    group: BGP_L4,
    title: "68. BGP 10: Project, Two Providers and Your Own Network",
    intro: BGP_INTRO_2 + BGP_INTRO_PUB,
    tour: { touch: ["edge-r1", "web-server-1", "office-pc"] },
    desc: "PROJECT: edge-r1 has both provider lines cabled and addressed, and no BGP at all. Build the whole thing: your AS 65010, a session to each provider (TO-A: AS 65001 at 203.0.113.1, TO-B: AS 65002 at 198.51.100.1), and an export policy that announces only 192.0.2.0/24 to both. Then run the failure drill: disable ge-0/0/0 and prove that web-server-1 and office-pc both stay online through Provider B. Leave the line down so the result can be checked.",
    setup(){ bgpBase({ second: true, pub: true, as: false, a: false }); },
    checks: [
      { desc: "edge-r1 has its AS and a BGP group for each provider",
        why: "Everything else rests on these three facts: who you are, and who each neighbour is. Without them no session can start.",
        test: () => { const r = byName("edge-r1");
          return !!(r && r.d && r.d.as) && bgpPeers().some(p => p.addr === "203.0.113.1") && bgpPeers().some(p => p.addr === "198.51.100.1"); } },
      { desc: "Provider B is Established and hears exactly 192.0.2.0/24 from you",
        why: "The backup line must carry the same announcement as the main one. Without it, traffic can leave through Provider B but the answers have no way back.",
        test: () => { const s = bgpSent("198.51.100.1"); return bgpUp("198.51.100.1") && s.length === 1 && s[0] === "192.0.2.0/24"; } },
      { desc: "The drill is live: the line to Provider A is down",
        why: "Redundancy that has never been switched off is untested. Without the drill you learn whether it works on the day it matters.",
        test: () => bgpPeers().some(p => p.addr === "203.0.113.1") && !bgpUp("203.0.113.1") },
      { desc: "web-server-1 is online through Provider B",
        why: "The server has a public address, so it depends on the announcement reaching the internet through the surviving provider. Without announcing to both, it goes dark with the first line.",
        test: () => bgpDefaultVia() === "198.51.100.1" && bgpOnline("web-server-1") },
      { desc: "office-pc is online through Provider B",
        why: "The office uses NAT, so it depends on a NAT rule for the second line as well. Without checking both kinds of traffic you only tested half the building.",
        test: () => bgpOnline("office-pc") },
    ],
    hints: [
      "Build it in the order of scenarios 59 to 67 and test after each layer: identity, sessions, announcement, then the drill. Do not start the drill until show bgp summary shows two Established sessions.",
      "Identity and sessions: set routing-options autonomous-system 65010. Then for each provider a group with type external, peer-as and neighbor: TO-A with 65001 and 203.0.113.1, TO-B with 65002 and 198.51.100.1. Commit and check show bgp summary.",
      "Announcement: policy ANNOUNCE with term mine from route-filter 192.0.2.0/24 exact, then accept. Attach it to both groups: set protocols bgp group TO-A export ANNOUNCE and set protocols bgp group TO-B export ANNOUNCE. Commit and check show route advertising-protocol bgp for each neighbour.",
      "The drill: set interfaces ge-0/0/0 disable, commit. Then show route, and ping 8.8.8.8 from web-server-1 and from office-pc.",
    ],
  },
];
