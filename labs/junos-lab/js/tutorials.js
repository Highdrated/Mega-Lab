/* ============================================================
   TUTORIALS — the Learn tab. Little hand-held lessons: every step says
   exactly what to do, explains why it matters, and watches the live lab
   to notice the moment you have actually done it. Scenarios test you;
   these teach you.
   ============================================================ */
var TUT_STATE = { active: null, step: 0, done: {}, hintOn: false };
var TUT_SPOTLIGHT = null;   // {dev, port}: the canvas pulses this jack while a step explains it
function tutSetSpotlight(sp){
  const a = sp ? sp.dev + "/" + sp.port : null;
  const b = TUT_SPOTLIGHT ? TUT_SPOTLIGHT.dev + "/" + TUT_SPOTLIGHT.port : null;
  if(a === b) return;
  TUT_SPOTLIGHT = sp || null;
  try{ if(typeof render === "function") render(); }catch(e){}
}
try{ TUT_STATE.done = JSON.parse(localStorage.getItem("junoslab-tut-done") || "{}"); }catch(e){}

function tutByName(n){ return Object.values(devices).find(d => d.name === n) || null; }
function tutCand(sw, path){ return sw ? cfgGet(sw.candidate, path) : null; }
function tutConf(sw, path){ return sw ? cfgGet(sw.config, path) : null; }
function tutPing(a, ip){ try{ return !!(a && pingRun(a, ip, {}).ok); }catch(e){ return false; } }

const TUTORIALS = [
  {
    id: "build-first",
    title: "1. Build your first network",
    blurb: "Place a switch and two PCs, cable them, open a shell. Five minutes, zero typing knowledge needed.",
    setup: null,   // starts from your empty canvas on purpose
    steps: [
      { do: "Open Add ▾ in the toolbar and place a Switch (pick any model, 'Racked and running').",
        why: "The switch is the room every device plugs into. One switch = one shared hallway; everything else in networking is about dividing and connecting these hallways.",
        hint: "Add ▾ is the first button in the toolbar. Pick EX2300-C-12T if unsure — small and friendly.",
        check: () => Object.values(devices).some(d => d.type === "switch") },
      { do: "Place two PCs (Add ▾ > PC), anywhere near the switch.",
        why: "A network with one machine is a philosophy exercise. Two machines is where traffic begins.",
        hint: "Same Add ▾ menu, under endpoints.",
        check: () => Object.values(devices).filter(d => d.type === "host").length >= 2 },
      { do: "Cable both PCs into the switch: Connect ▾ (leave it on LAN / Data), click a PC's eth0 port, then click any switch port.",
        why: "Ports, not devices, are what you cable — exactly like real hardware. The PC's single jack has a real name, eth0 (Linux for 'first ethernet card'); you will type that name in the next lesson. Click a port again to cancel a half-made cable. Listen for the click: an RJ45 latch seating.",
        hint: "The small circles on each device are ports. First click arms one end, second click completes the run.",
        check: () => {
          const hs = Object.values(devices).filter(d => d.type === "host");
          return hs.length >= 2 && hs.filter(h => isLinked(h.id, "eth0")).length >= 2;
        } },
      { do: "Click one PC (its body or port) to open its shell in the terminal below.",
        why: "Everything from here on happens FROM some machine's point of view. This black window is where you live now — same one real network engineers live in.",
        hint: "Click the PC's port circle; the terminal panel opens with a prompt like pc1$.",
        check: () => { const d = devices[activeDevice]; return !!(d && d.type === "host"); } },
    ],
    done: "You built a physical network: metal, cables, and a place to type. It moves no traffic yet — machines still have no addresses. That is the next lesson.",
    next: "first-address",
  },
  {
    id: "first-address",
    title: "2. Two machines, one street",
    blurb: "Give both PCs an address and make your first ping. The lesson everything else stands on.",
    setup(){
      const sw = makeSwitch(300, 120, 8);
      const a = makeHost(180, 300), b = makeHost(420, 300);
      devices[a].name = "pc-a"; devices[b].name = "pc-b";
      cable(a, "eth0", sw, "ge-0/0/1");
      cable(b, "eth0", sw, "ge-0/0/2");
    },
    steps: [
      { do: "Open pc-a's shell and type:  ip addr add 10.0.10.11/24 dev eth0",
        why: "First, the word nobody explains: see the PULSING ring on pc-a? That jack IS eth0 — Linux's real name for the machine's first wired card (ETHernet, number ZERO). 'dev eth0' just means 'on that jack'. Now the address: 10.0.10.11 is the house, /24 says the first three numbers name the street. Machines on the same street talk directly, no router needed.",
        hint: "Click pc-a, then type the command exactly. ip a afterwards shows what you set.",
        spotlight: { dev: "pc-a", port: "eth0" },
        check: () => { const d = tutByName("pc-a"); return !!(d && d.cfg.ip === "10.0.10.11"); } },
      { do: "Now pc-b:  ip addr add 10.0.10.12/24 dev eth0",
        why: "Same street (10.0.10), different house (.12). If you typed a different street by accident — say 10.0.20.12 — the two machines would be strangers even on the same switch. That typo is a classic real-world ticket.",
        hint: "Click pc-b's port to switch the terminal to it — see the tab bar above the terminal.",
        check: () => { const d = tutByName("pc-b"); return !!(d && d.cfg.ip === "10.0.10.12"); } },
      { do: "From pc-a:  ping 10.0.10.12  — and watch the canvas while it runs.",
        why: "The dot you see travel is the actual computed path, not an animation guess. One ping proves TWO things: your packet arrived, and the reply found its way back. Half of all network debugging is remembering it must work in both directions.",
        hint: "Back on pc-a's tab: ping 10.0.10.12",
        check: () => { const d = tutByName("pc-a"); return !!(d && d.arp && d.arp["10.0.10.12"]); } },
      { do: "Type  arp -a  on pc-a and read what appeared.",
        why: "The ping left a trace: pc-a now remembers which hardware (MAC) address answers for 10.0.10.12. This cache is how streets actually work under the hood — IP finds the street, ARP finds the door. Nothing to pass here; read it and press Next.",
        check: () => true },
    ],
    done: "Two machines, one street, a working ping, and you have seen the round trip with your own eyes. Every network you will ever build is this, repeated with more furniture.",
    next: "assign-ips",
  },
  {
    id: "assign-ips",
    title: "3. Assigning IPs — get it wrong, then right",
    blurb: "The deep dive: choose numbers like a professional, put a machine on the wrong street on purpose, and learn the four maintenance commands.",
    setup(){
      const sw = makeSwitch(300, 120, 8);
      const a = makeHost(160, 300), b = makeHost(300, 300), c = makeHost(440, 300);
      devices[a].name = "pc-a"; devices[b].name = "pc-b"; devices[c].name = "new-pc";
      hostSet(a, "10.0.10.11", 24, null);
      hostSet(b, "10.0.10.12", 24, null);
      cable(a, "eth0", sw, "ge-0/0/1");
      cable(b, "eth0", sw, "ge-0/0/2");
      cable(c, "eth0", sw, "ge-0/0/3");
    },
    steps: [
      { do: "A new machine, new-pc, just got cabled in. First, learn the street from a NEIGHBOR — open pc-a and type:  ip a",
        why: "Rule one of assigning addresses: never guess the street, read it off a machine that already works. pc-a says 10.0.10.11/24 — so the street is 10.0.10, the /24 says the first three numbers name it, and any free house from .2 to .254 outside the DHCP range can be yours.",
        hint: "Click pc-a, type ip a, and read the address before it. That is the whole step.",
        check: () => { const d = devices[activeDevice]; return !!(d && d.name === "pc-a"); } },
      { do: "Now do it WRONG on purpose. On new-pc:  ip addr add 10.0.20.13/24 dev eth0  — then  ping 10.0.10.11",
        why: "One digit off: street 20 instead of 10. The command succeeds — machines never complain about a wrong address, they just quietly fail later. And read HOW it fails: network unreachable, instantly, locally. new-pc did not even try; nothing left the machine. Burn that error message in: it means MY OWN address or route is wrong, not the network.",
        hint: "The point is to see the failure. Type both commands on new-pc and read the ping's answer.",
        spotlight: { dev: "new-pc", port: "eth0" },
        check: () => { const d = tutByName("new-pc"); return !!(d && d.cfg.ip === "10.0.20.13"); } },
      { do: "Fix it:  ip addr add 10.0.10.13/24 dev eth0  — then  ping 10.0.10.11  again.",
        why: "Same command overwrites the old address, exactly like real Linux. Right street, free house, and suddenly the neighbor answers. The difference between a dead machine and a working one was one digit — which is why professionals READ the error instead of re-cabling everything.",
        check: () => { const d = tutByName("new-pc");
          return !!(d && d.cfg.ip === "10.0.10.13" && d.arp && d.arp["10.0.10.11"]); } },
      { do: "Why .13 and not .1? Try to imagine taking .1 — then run the maintenance four on new-pc:\nip a     ip r     cat /etc/resolv.conf     arp -a",
        why: ".1 is the street's DOOR — the gateway lives there, and stealing it breaks everyone. Convention: infrastructure low (.1-.99, assigned by hand), people high (.100+, handed out by DHCP). The four commands you just ran answer: what am I, where is my door, who resolves my names, who have I talked to. They diagnose ninety percent of all 'cannot connect' machines.",
        check: () => true },
      { do: "new-pc has no door yet — ip r proved it (no default line). Give it one anyway, pointing at where a gateway WILL live:  ip route add default via 10.0.10.1",
        why: "Nothing answers at 10.0.10.1 yet — and that is fine: a route is a standing instruction, not a connection. The moment a gateway appears at .1 (next lessons), new-pc is already prepared. Setting address AND gateway together is the complete ritual for every machine you will ever configure by hand.",
        check: () => { const d = tutByName("new-pc"); return !!(d && d.cfg.gw === "10.0.10.1"); } },
    ],
    done: "You can now walk up to any network, read the street off a neighbor, choose a legal house, recover from the classic one-digit disaster, and check a machine's health in four commands. That is the entire manual-addressing trade.",
    next: "first-vlan",
  },
  {
    id: "first-vlan",
    title: "4. Your first VLAN",
    blurb: "Enter JunOS configuration mode, build a room, and learn the draft-then-commit rhythm.",
    setup(){
      const sw = makeSwitch(300, 120, 8);
      devices[sw].name = "sw1";
      const a = makeHost(180, 300), b = makeHost(420, 300);
      devices[a].name = "pc-a"; devices[b].name = "pc-b";
      hostSet(a, "10.0.10.11", 24, null);
      hostSet(b, "10.0.10.12", 24, null);
      cable(a, "eth0", sw, "ge-0/0/1");
      cable(b, "eth0", sw, "ge-0/0/2");
    },
    steps: [
      { do: "Open sw1's CLI and type:  configure",
        why: "The prompt changes from > to #. You are now editing a private DRAFT of the config — the running network cannot see anything you type until you commit. This draft-first rhythm is JunOS's superpower.",
        hint: "Click any port on sw1, then: configure",
        check: () => { const s = tutByName("sw1"); return !!(s && s.cli.mode === "cfg"); } },
      { do: "set vlans staff vlan-id 10",
        why: "You just built a room named staff, numbered 10. The NUMBER is what travels between switches later — the name is only for humans. Nothing on the network changed: this is still the draft.",
        hint: "Type it at the # prompt. A question mark after any word shows what can come next.",
        check: () => { const s = tutByName("sw1"); return !!tutCand(s, ["vlans", "staff"]); } },
      { do: "Put both ports in the room:\nset interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff\nset interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members staff",
        why: "That long spelling is real JunOS ELS syntax, letter for letter — your fingers are learning the real thing. Tab completes, and unique prefixes work: set int ge-0/0/1 un 0 fam eth vlan mem staff.",
        hint: "Two commands, one per port. Arrow-up recalls the previous line for editing.",
        check: () => { const s = tutByName("sw1");
          const m1 = tutCand(s, ["interfaces", "ge-0/0/1", "unit", "0", "family", "ethernet-switching", "vlan", "members"]);
          const m2 = tutCand(s, ["interfaces", "ge-0/0/2", "unit", "0", "family", "ethernet-switching", "vlan", "members"]);
          const has = m => Array.isArray(m) ? m.includes("staff") : !!m;
          return has(m1) && has(m2); } },
      { do: "show | compare",
        why: "The plus signs are your draft's diff against reality. This is the ONLY moment mistakes are free — the network still runs the old config. Real engineers read this before every single commit, forever.",
        check: () => { const s = tutByName("sw1");
          return !!(s && JSON.stringify(s.config) !== JSON.stringify(s.candidate)); } },
      { do: "commit",
        why: "NOW it is real: the draft became the active config and the switch began enforcing the room. Until this word, nothing you typed had touched the network — the most important single fact about JunOS.",
        check: () => { const s = tutByName("sw1"); return !!tutConf(s, ["vlans", "staff"]); } },
      { do: "From pc-a:  ping 10.0.10.12  — still works.",
        why: "Both PCs are in the same room, so nothing broke. But try to imagine a third PC on a port you did NOT add to staff: it would be sealed off completely. That wall is the entire point — next lesson, we put a door in it.",
        check: () => tutPing(tutByName("pc-a"), "10.0.10.12") },
    ],
    done: "You spoke real JunOS: configure, set, show | compare, commit. That rhythm — draft, diff, commit — is what you will do every working day on real Juniper hardware.",
    next: "first-door",
  },
  {
    id: "first-door",
    title: "5. A door between rooms (irb)",
    blurb: "Two VLANs cannot talk — until you give each a gateway and the hosts a default route.",
    setup(){
      const sw = makeSwitch(300, 120, 8);
      devices[sw].name = "sw1";
      cfgDo(sw, [
        "set vlans staff vlan-id 10",
        "set vlans guest vlan-id 20",
        "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff",
        "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members guest",
      ]);
      const a = makeHost(180, 300), b = makeHost(420, 300);
      devices[a].name = "pc-a"; devices[b].name = "pc-b";
      hostSet(a, "10.0.10.11", 24, null);
      hostSet(b, "10.0.20.12", 24, null);
      cable(a, "eth0", sw, "ge-0/0/1");
      cable(b, "eth0", sw, "ge-0/0/2");
    },
    steps: [
      { do: "From pc-a, try:  ping 10.0.20.12  — and read the error carefully.",
        why: "Network unreachable, instantly, locally: pc-a did not even TRY. It is on street 10.0.10, the target is on street 10.0.20, and pc-a has no idea where the door is. The failure is on the sender's own machine — no packet ever left.",
        check: () => { const a2 = tutByName("pc-a"); return !!a2 && !tutPing(a2, "10.0.20.12"); } },
      { do: "On sw1 (configure):\nset interfaces irb unit 10 family inet address 10.0.10.1/24\nset vlans staff l3-interface irb.10",
        why: "irb.10 is a doorway with an address, and the second line bolts it into the staff room's wall. The switch is becoming a router — one box, both jobs, exactly how real office networks are built.",
        hint: "configure first if the prompt shows >.",
        check: () => { const s = tutByName("sw1");
          return !!(tutCand(s, ["interfaces", "irb", "unit", "10"]) && tutCand(s, ["vlans", "staff", "l3-interface"])); } },
      { do: "Same again for guest:\nset interfaces irb unit 20 family inet address 10.0.20.1/24\nset vlans guest l3-interface irb.20\nThen:  commit",
        why: "Traffic needs a door on BOTH sides — a single gateway routes nothing by itself. With one irb, packets could leave staff but guest would have no doorway to receive them through.",
        check: () => { const s = tutByName("sw1");
          return !!(tutConf(s, ["interfaces", "irb", "unit", "20"]) && tutConf(s, ["vlans", "guest", "l3-interface"])); } },
      { do: "Tell each PC where its own door is:\npc-a:  ip route add default via 10.0.10.1\npc-b:  ip route add default via 10.0.20.1",
        why: "Each machine points at the door on ITS OWN street — pc-a cannot use 10.0.20.1, it has no way to reach it. 'Default' means: anything not on my street goes here. Forgetting this line is the most common reason a fresh machine cannot reach anything.",
        check: () => { const a2 = tutByName("pc-a"), b2 = tutByName("pc-b");
          return !!(a2 && b2 && a2.cfg.gw === "10.0.10.1" && b2.cfg.gw === "10.0.20.1"); } },
      { do: "From pc-a:  ping 10.0.20.12  — watch the path on the canvas.",
        why: "The packet goes UP to irb.10, gets routed, and comes DOWN into guest — and the reply makes the same journey mirrored. You just built inter-VLAN routing, the backbone of every office network on earth.",
        check: () => tutPing(tutByName("pc-a"), "10.0.20.12") },
    ],
    done: "Rooms, doors, and a route between them. You now hold the complete core model: L2 rooms (VLANs), L3 doors (gateways), and hosts that must be told where their door is.",
    next: "first-dhcp",
  },
  {
    id: "first-dhcp",
    title: "6. Addresses from thin air (DHCP)",
    blurb: "Stop typing addresses onto machines: build a pool and watch the four-packet DORA dance.",
    setup(){
      const sw = makeSwitch(300, 120, 8);
      devices[sw].name = "sw1";
      cfgDo(sw, [
        "set vlans staff vlan-id 10",
        "set interfaces irb unit 10 family inet address 10.0.10.1/24",
        "set vlans staff l3-interface irb.10",
        "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff",
      ]);
      const a = makeHost(180, 300);
      devices[a].name = "pc-a";
      cable(a, "eth0", sw, "ge-0/0/1");
    },
    steps: [
      { do: "On sw1 (configure):  set access address-assignment pool STAFF family inet network 10.0.10.0/24",
        why: "The pool declares which street this server speaks for. Without it, the switch would hear address requests and stay silent — DHCP only ever answers from a declared pool.",
        check: () => { const s = tutByName("sw1");
          return !!tutCand(s, ["access", "address-assignment", "pool", "STAFF"]); } },
      { do: "set access address-assignment pool STAFF family inet range r1 low 10.0.10.100\nset access address-assignment pool STAFF family inet range r1 high 10.0.10.199",
        why: "The range is which houses it may hand out — 100 to 199. Everything below stays reserved for things you assign by hand: the gateway at .1, servers, printers. Mixing those two worlds is how address conflicts happen in real offices.",
        check: () => { const s = tutByName("sw1");
          return !!tutCand(s, ["access", "address-assignment", "pool", "STAFF", "family", "inet", "range", "r1", "high"]); } },
      { do: "set access address-assignment pool STAFF family inet dhcp-attributes router 10.0.10.1",
        why: "The lease carries more than an address: this line makes every client learn its gateway automatically. Forget it and clients get an address but no door — the classic 'DHCP works but the internet is down' ticket.",
        check: () => { const s = tutByName("sw1");
          return !!tutCand(s, ["access", "address-assignment", "pool", "STAFF", "family", "inet", "dhcp-attributes", "router"]); } },
      { do: "set system services dhcp-local-server group LAN interface irb.10\nThen:  commit",
        why: "The pool was a filing cabinet; this line staffs the desk. The server now listens on irb.10 — the staff room's own doorway — and only there. Commit makes all of it real at once.",
        check: () => { const s = tutByName("sw1");
          return !!tutConf(s, ["system", "services", "dhcp-local-server"]); } },
      { do: "On pc-a:  dhclient eth0  — and watch the canvas.",
        why: "Four packets fly: DISCOVER (who is out there?), OFFER (want .100?), REQUEST (yes please), ACK (yours, with gateway included). That is the DORA dance every phone and laptop does on every network, every day. ip a shows what arrived.",
        check: () => { const a2 = tutByName("pc-a");
          return !!(a2 && a2.cfg.ip && /^10\.0\.10\.1\d\d$/.test(a2.cfg.ip) && a2.cfg.gw === "10.0.10.1"); } },
    ],
    done: "A machine walked onto your network owning nothing and left with an address, a street, and a door — untouched by human hands. This is how every real office runs.",
    next: "first-server",
  },
  {
    id: "first-server",
    title: "7. A real website (DNS + HTTP)",
    blurb: "Traffic with meaning: run a server, publish a name, and fetch a page like a browser would.",
    setup(){
      const sw = makeSwitch(300, 120, 8);
      devices[sw].name = "sw1";
      cfgDo(sw, [
        "set vlans staff vlan-id 10",
        "set interfaces irb unit 10 family inet address 10.0.10.1/24",
        "set vlans staff l3-interface irb.10",
        "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff",
        "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members staff",
      ]);
      const srv = makeServer(460, 120);
      devices[srv].name = "web-1";
      devices[srv].cfg.ip = "10.0.10.80"; devices[srv].cfg.bits = 24; devices[srv].cfg.gw = "10.0.10.1";
      const a = makeHost(180, 300);
      devices[a].name = "pc-a";
      hostSet(a, "10.0.10.11", 24, "10.0.10.1");
      cable(srv, "eth0", sw, "ge-0/0/1");
      cable(a, "eth0", sw, "ge-0/0/2");
    },
    steps: [
      { do: "From pc-a, try it broken first:  curl web.lab",
        why: "could not resolve host — pc-a has no nameserver, so the name means nothing. Every by-name connection starts with a question you never see: what NUMBER is this name? Nobody has told pc-a who to ask.",
        check: () => { const a2 = tutByName("pc-a"); return !!(a2 && !a2.cfg.ns); } },
      { do: "On web-1's shell:  service start dns  and  service start http\n(or the real spellings: systemctl start named, systemctl start nginx)",
        why: "A server is just a computer that LISTENS. Before this, web-1 was reachable but deaf — and a reachable-but-deaf machine answers 'connection refused', which is a completely different failure from 'unreachable'. Learn to hear the difference.",
        check: () => { const s = tutByName("web-1");
          return !!(s && s.cfg.services && s.cfg.services.dns && s.cfg.services.http); } },
      { do: "Still on web-1:  dns add web.lab 10.0.10.80",
        why: "Names are not discovered — they are DECLARED. Somebody writes the phone book, and you just became that somebody. dns list shows your zone.",
        check: () => { const s = tutByName("web-1");
          return !!(s && s.cfg.records && s.cfg.records["web.lab"]); } },
      { do: "On pc-a:  nameserver 10.0.10.80  — then prove it with  nslookup web.lab",
        why: "Now pc-a knows WHO to ask (this writes /etc/resolv.conf — cat it to check, like on real Linux). nslookup asks ONLY the name question, which makes it diagnostic: it separates 'DNS is broken' from 'the website is broken' — identical from a browser.",
        check: () => { const a2 = tutByName("pc-a"); return !!(a2 && a2.cfg.ns === "10.0.10.80"); } },
      { do: "curl web.lab",
        why: "Two journeys in one command: resolve the name (DNS), then connect and fetch (HTTP). 200 OK proves the whole chain. Now break it both ways on purpose — service stop dns, then service stop http — and read how DIFFERENTLY each failure speaks.",
        check: () => { const a2 = tutByName("pc-a");
          try{ return !!(a2 && curlCheck(a2, "web.lab").ok); }catch(e){ return false; } } },
    ],
    done: "Ping was never the goal — a page loading by name is the goal. You now know the full chain and, more valuable, what each broken link in it sounds like.",
    next: "first-filter",
  },
  {
    id: "first-filter",
    title: "8. Break it on purpose (filters)",
    blurb: "Write a firewall filter, fall into the implicit-discard trap deliberately, and climb out.",
    setup(){
      const sw = makeSwitch(300, 120, 8);
      devices[sw].name = "sw1";
      cfgDo(sw, [
        "set vlans staff vlan-id 10",
        "set vlans guest vlan-id 20",
        "set interfaces irb unit 10 family inet address 10.0.10.1/24",
        "set interfaces irb unit 20 family inet address 10.0.20.1/24",
        "set vlans staff l3-interface irb.10",
        "set vlans guest l3-interface irb.20",
        "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff",
        "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members guest",
      ]);
      const a = makeHost(180, 300), b = makeHost(420, 300);
      devices[a].name = "pc-staff"; devices[b].name = "pc-guest";
      hostSet(a, "10.0.10.11", 24, "10.0.10.1");
      hostSet(b, "10.0.20.12", 24, "10.0.20.1");
      cable(a, "eth0", sw, "ge-0/0/1");
      cable(b, "eth0", sw, "ge-0/0/2");
    },
    steps: [
      { do: "Confirm the guest can currently reach staff — from pc-guest:  ping 10.0.10.11",
        why: "Routing connects everything it can; that is its whole personality. Security is the art of then saying no, precisely. First establish the baseline: it works.",
        check: () => tutPing(tutByName("pc-guest"), "10.0.10.11") },
      { do: "On sw1 (configure), write half a filter — the trap:\nset firewall family inet filter GUEST-IN term block from destination-address 10.0.10.0/24\nset firewall family inet filter GUEST-IN term block then discard\nset interfaces irb unit 20 family inet filter input GUEST-IN\ncommit",
        why: "The term reads sensibly: traffic TO the staff street gets discarded. Commit it and see what ACTUALLY happens on the next step — this exact half-filter is one of the most common outages humans cause.",
        check: () => { const s = tutByName("sw1");
          return !!(tutConf(s, ["firewall", "family", "inet", "filter", "GUEST-IN"]) &&
                    tutConf(s, ["interfaces", "irb", "unit", "20", "family", "inet", "filter", "input"])); } },
      { do: "From pc-guest, ping its own gateway's far side or anything at all:  ping 10.0.20.1  works, but  ping 10.0.10.11  AND everything else beyond the router is dead.",
        why: "Every filter ends with an invisible final term: discard EVERYTHING that no term matched. You blocked staff — and the implicit discard silently ate all the rest too. The guests did not lose one street; they lost the world.",
        check: () => { const g = tutByName("pc-guest");
          return !!g && !tutPing(g, "10.0.10.11"); } },
      { do: "Add the line everyone forgets, then commit:\nset firewall family inet filter GUEST-IN term ok then accept",
        why: "An explicit final accept: 'everything I did not name is fine'. Term order matters — block runs first, ok catches the rest. Now the filter does exactly what it says, and nothing more.",
        check: () => { const s = tutByName("sw1");
          return !!tutConf(s, ["firewall", "family", "inet", "filter", "GUEST-IN", "term", "ok"]); } },
      { do: "Verify both halves of the intent — from pc-guest:  ping 10.0.10.11  still blocked,  but the filter no longer strangles everything else.",
        why: "This pair of checks — the thing you meant to block IS blocked, the things you did not mean to block are NOT — is how filter changes are verified on real gear. One without the other is half a test.",
        check: () => { const g = tutByName("pc-guest");
          return !!g && !tutPing(g, "10.0.10.11") && tutPing(g, "10.0.20.1"); } },
    ],
    done: "You wrote policy, fell into the implicit-discard trap with your eyes open, and climbed out. The next time a filter change takes a site down, you will know the shape of the hole before anyone finishes describing it.",
    next: "trunk-two",
  },
  {
    id: "trunk-two",
    title: "9. Two switches, one hallway (trunks)",
    blurb: "Stretch your VLANs across a second switch with one tagged cable — and meet the classic mismatched-number failure.",
    setup(){
      const a = makeSwitch(180, 120, 8), b = makeSwitch(480, 120, 8);
      devices[a].name = "sw-east"; devices[b].name = "sw-west";
      cfgDo(a, ["set system host-name sw-east", "set vlans staff vlan-id 10",
        "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff"]);
      cfgDo(b, ["set system host-name sw-west", "set vlans staff vlan-id 10",
        "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff"]);
      const h1 = makeHost(180, 300), h2 = makeHost(480, 300);
      devices[h1].name = "east-pc"; devices[h2].name = "west-pc";
      hostSet(h1, "10.0.10.11", 24, null);
      hostSet(h2, "10.0.10.12", 24, null);
      cable(h1, "eth0", a, "ge-0/0/1");
      cable(h2, "eth0", b, "ge-0/0/1");
      cable(a, "ge-0/0/0", b, "ge-0/0/0");
    },
    steps: [
      { do: "The switches are already cabled together. From east-pc, try:  ping 10.0.10.12  — same street, same VLAN name on both switches. It fails anyway.",
        why: "The cable between the switches is an ACCESS port right now, sitting in the default room — staff frames arriving at it are simply not carried across. Same metal, wrong door policy. This is the exact confusion trunks exist to solve.",
        check: () => { const h = tutByName("east-pc"); return !!h && !tutPing(h, "10.0.10.12"); } },
      { do: "On sw-east:  set interfaces ge-0/0/0 unit 0 family ethernet-switching interface-mode trunk\nand  set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members staff  — then commit.",
        why: "Trunk mode means: this port carries MANY rooms, each frame wearing a numbered tag (802.1Q). The members list is the guest list — a VLAN not on it silently does not cross, with no error anywhere. Remember that sentence during your first real one-vlan-down ticket.",
        check: () => { const s = tutByName("sw-east");
          const pc2 = tutConf(s, ["interfaces", "ge-0/0/0", "unit", "0", "family", "ethernet-switching", "interface-mode"]);
          return pc2 === "trunk"; } },
      { do: "Same two lines on sw-west, then commit. One end trunking alone is worse than none.",
        why: "Until BOTH ends agree, tagged frames from one side hit an access port on the other and are dropped on the floor — silently, of course. A trunk is a treaty: it exists only when both switches have signed.",
        check: () => { const s = tutByName("sw-west");
          return tutConf(s, ["interfaces", "ge-0/0/0", "unit", "0", "family", "ethernet-switching", "interface-mode"]) === "trunk"; } },
      { do: "From east-pc:  ping 10.0.10.12  — and watch the frame cross between buildings.",
        why: "The tag is stapled on at sw-east's trunk, read and removed at sw-west, and the frame comes out in the right room. The endpoints never see a tag — VLAN numbers live only on the hallway between switches. The staff room now spans two chassis.",
        check: () => tutPing(tutByName("east-pc"), "10.0.10.12") },
    ],
    done: "One cable, many rooms — you stretched a VLAN across hardware. The two rules worth engraving: numbers must MATCH end to end, and the members list is a silent killer.",
    next: "ospf-neighbors",
  },
  {
    id: "ospf-neighbors",
    title: "10. Routers that gossip (OSPF)",
    blurb: "Stop typing routes: two routers discover each other and exchange their networks automatically.",
    setup(){
      const r1 = makeRouter(180, 120, 4), r2 = makeRouter(480, 120, 4);
      cfgDo(r1, ["set system host-name r-north",
        "set interfaces ge-0/0/0 unit 0 family inet address 10.9.12.1/30",
        "set interfaces ge-0/0/1 unit 0 family inet address 10.0.10.1/24"]);
      cfgDo(r2, ["set system host-name r-south",
        "set interfaces ge-0/0/0 unit 0 family inet address 10.9.12.2/30",
        "set interfaces ge-0/0/1 unit 0 family inet address 10.0.20.1/24"]);
      const h1 = makeHost(180, 300), h2 = makeHost(480, 300);
      devices[h1].name = "north-pc"; devices[h2].name = "south-pc";
      hostSet(h1, "10.0.10.21", 24, "10.0.10.1");
      hostSet(h2, "10.0.20.21", 24, "10.0.20.1");
      cable(r1, "ge-0/0/0", r2, "ge-0/0/0");
      cable(h1, "eth0", r1, "ge-0/0/1");
      cable(h2, "eth0", r2, "ge-0/0/1");
    },
    steps: [
      { do: "north-pc cannot reach south-pc: ping 10.0.20.21. Read r-north's table:  show route  — no mention of 10.0.20.0/24 anywhere.",
        why: "Each router knows only what it touches: its connected subnets. You COULD type a static route on each — and on forty routers, eighty statics, wrong within a month. Routing protocols exist because typing does not scale.",
        check: () => { const h = tutByName("north-pc"); return !!h && !tutPing(h, "10.0.20.21"); } },
      { do: "On r-north (configure):\nset protocols ospf area 0 interface ge-0/0/0.0\nset protocols ospf area 0 interface ge-0/0/1.0\ncommit",
        why: "You just told r-north to SPEAK OSPF on both ports: introduce yourself on ge-0/0/0.0 (where another router lives), and advertise the network on ge-0/0/1.0. The .0 names the LOGICAL unit riding on the physical port — JunOS configures L3 on units, not on raw metal. Area 0 is the backbone; with two routers it is the only area you need.",
        check: () => { const r = tutByName("r-north");
          const oi = (r && r.d && r.d.ospf) || {};
          return !!(oi["ge-0/0/0.0"] && oi["ge-0/0/1.0"]); } },
      { do: "Same two lines on r-south, commit — then on either router:  show ospf neighbor",
        why: "The neighbor table is the handshake: each router heard the other's hello on the shared /30 and they became peers. No neighbor listed = no adjacency = no routes will flow, ever. On real tickets this table is where OSPF debugging starts.",
        check: () => { const r = tutByName("r-north");
          return !!(r && r.d && (r.d.ospfNeighbors || []).length); } },
      { do: "show route on r-north — find the line tagged [OSPF/10].",
        why: "10.0.20.0/24 appeared in the table and NOBODY TYPED IT: r-south advertised it, r-north learned it. The /10 is the preference — a static (/5) would still win an argument, which is why stale statics are dangerous around routing protocols.",
        check: () => { const r = tutByName("r-north");
          return !!(r && r.d && (r.d.ospfRoutes || []).some(rt => rt.net === "10.0.20.0")); } },
      { do: "From north-pc:  ping 10.0.20.21",
        why: "End to end across two routers, on routes no human wrote. Now the real magic: imagine a third router joining — you would add two lines on IT, and every other router learns its networks automatically. THAT is why protocols beat typing.",
        check: () => tutPing(tutByName("north-pc"), "10.0.20.21") },
    ],
    done: "Two routers introduced themselves, swapped networks, and built the routing table for you. You have crossed the line between configuring routes and operating a routing PROTOCOL.",
    next: "buy-internet",
  },
  {
    id: "buy-internet",
    title: "11. Buying the internet (BGP)",
    blurb: "The edge grows up: peer with your provider and LEARN your default route instead of typing it.",
    setup(){
      const r = makeRouter(320, 140, 4);
      cfgDo(r, ["set system host-name edge-r1",
        "set interfaces ge-0/0/0 unit 0 family inet address 203.0.113.2/30",
        "set interfaces ge-0/0/1 unit 0 family inet address 10.0.50.1/24",
        "set security nat source rule-set OFFICE from interface ge-0/0/1.0",
        "set security nat source rule-set OFFICE to interface ge-0/0/0.0",
        "set security nat source rule-set OFFICE rule R1 match source-address 10.0.50.0/24",
        "set security nat source rule-set OFFICE rule R1 then source-nat interface"]);
      const isp = makeIsp(560, 140, "203.0.113.1");
      const h = makeHost(320, 320);
      devices[h].name = "office-pc";
      hostSet(h, "10.0.50.20", 24, "10.0.50.1");
      cable(r, "ge-0/0/0", isp, "wan0");
      cable(h, "eth0", r, "ge-0/0/1");
      void isp;
    },
    steps: [
      { do: "No default route exists — office-pc's ping 8.8.8.8 dies at edge-r1. Ask the provider what it wants: open the ISP node and type  show bgp",
        why: "Real onboarding works like this: the provider hands you a sheet with THEIR AS number and the address to peer with. The ISP node literally prints the three statements it expects. Read it before you type anything.",
        check: () => { const h = tutByName("office-pc"); return !!h && !tutPing(h, "8.8.8.8"); } },
      { do: "On edge-r1 (configure):\nset routing-options autonomous-system 65010\nset protocols bgp group EXT type external\nset protocols bgp group EXT peer-as 65001\nset protocols bgp group EXT neighbor 203.0.113.1\ncommit",
        why: "Line one names YOUR network in the BGP world. The group says: this peer is external (another company), it claims AS 65001, and it lives at that address. Commit refuses a neighbor without a peer-as — real JunOS guardrails.",
        check: () => { const r = tutByName("edge-r1");
          return !!(r && r.d && r.d.as === 65010 && (r.d.bgpGroups || []).some(g2 => g2.neighbors.length)); } },
      { do: "show bgp summary — read the State column until it says Established.",
        why: "Idle means your side is incomplete; Active means it is trying and failing, and the Info column tells you exactly why (wrong peer-as, no path). Established means the treaty is live. That one screen is where every 'internet down' investigation starts at a real edge.",
        check: () => { const r = tutByName("edge-r1");
          return !!(r && r.d && (r.d.bgpPeers || []).some(p => p.state === "Established")); } },
      { do: "show route — find 0.0.0.0/0 tagged [BGP/170].",
        why: "A default route you LEARNED. Nobody typed it; the provider advertised it the moment the session established — that is literally what you pay them for. If the session ever dies, the route leaves with it, and that honesty beats a static default that lies while the line is dead.",
        check: () => { const r = tutByName("edge-r1");
          const lk = routeLookup(r, "8.8.8.8");
          return !!(lk && lk.proto === "bgp"); } },
      { do: "From office-pc:  ping 8.8.8.8  — then, for the full lesson, pull the WAN cable (click it, Simulate failure) and run  show bgp summary  and the ping again. Restore the cable after.",
        why: "With the link dead the session drops and the learned default VANISHES — the router tells the truth about being offline. Watch how differently that fails compared to a stale static: fast, visible, and honest in show bgp summary.",
        check: () => { const h = tutByName("office-pc");
          try{ return !!(h && pingRun(h, "8.8.8.8", {}).ok); }catch(e){ return false; } } },
    ],
    done: "You speak the protocol the internet itself runs on: named your network, signed the treaty, and learned your route to everything. The reason column of show bgp summary is now part of your vocabulary.",
    next: "ops-over-itself",
  },
  {
    id: "ops-over-itself",
    title: "12. Run it over itself (SSH + syslog)",
    blurb: "Console cables are for day zero. Manage the switch ACROSS the network — and stream every log to one place.",
    setup(){
      const sw = makeSwitch(240, 120, 8);
      cfgDo(sw, ["set system host-name core-sw",
        "set vlans staff vlan-id 10",
        "set interfaces irb unit 10 family inet address 10.0.10.1/24",
        "set vlans staff l3-interface irb.10",
        "set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members staff",
        "set interfaces ge-0/0/2 unit 0 family ethernet-switching vlan members staff"]);
      const srv = makeServer(460, 120);
      devices[srv].name = "ops-1";
      devices[srv].cfg.ip = "10.0.10.90"; devices[srv].cfg.bits = 24; devices[srv].cfg.gw = "10.0.10.1";
      const h = makeHost(240, 300);
      devices[h].name = "admin-pc";
      hostSet(h, "10.0.10.31", 24, "10.0.10.1");
      cable(srv, "eth0", sw, "ge-0/0/1");
      cable(h, "eth0", sw, "ge-0/0/2");
    },
    steps: [
      { do: "From admin-pc, try to manage the switch remotely:  ssh 10.0.10.1  — and read the refusal.",
        why: "Connection refused: reachable, but nothing listens on port 22. Refused and unreachable are DIFFERENT failures — refused means the network is fine and a service is missing. Management access is a service you switch on, never a right you are owed.",
        check: () => { const s = tutByName("core-sw");
          return !cfgGet(s.config, ["system", "services", "ssh"]); } },
      { do: "On core-sw's console:  set system services ssh  — commit. Then from admin-pc:  ssh 10.0.10.1",
        why: "The prompt becomes the switch's own: you are ON core-sw, across the network, exactly how every real switch is managed after day zero. Type exit at the top prompt to come home to admin-pc.",
        check: () => { const s = tutByName("core-sw");
          return !!cfgGet(s.config, ["system", "services", "ssh"]); } },
      { do: "Central logging, server side first — on ops-1:  service start syslog",
        why: "A server that LISTENS on 514 is the whole trick. Without a listener the switches shout into the void: syslog is UDP, fire-and-forget, and lost lines are simply lost — which you are about to use as a feature for testing.",
        check: () => { const s = tutByName("ops-1");
          return !!(s && s.cfg.services && s.cfg.services.syslog); } },
      { do: "On core-sw:  set system syslog host 10.0.10.90 any any  — commit. Then make some noise (commit any small change) and on ops-1 type  log",
        why: "Every event on core-sw now streams to one screen — commits, flaps, storms, thermal trips, tagged with the switch's name. During a real outage this is the difference between reading six diaries in the dark and reading ONE, in order.",
        check: () => { const s = tutByName("ops-1");
          return !!(s && (s.syslog || []).some(ln => ln.includes("core-sw"))); } },
    ],
    done: "You manage the network across itself and read its whole story in one place. With lesson 12 done, you hold the full operator's toolkit — the capstone project is next, and you are ready for it.",
    next: "project-office",
  },
  {
    id: "project-office",
    title: "13. PROJECT — deliver an office",
    blurb: "The capstone. A client brief, an empty canvas, and the design-rule check as your grader. Everything you learned, in one build.",
    setup(){ /* an empty canvas IS the brief — you build all of it */ },
    steps: [
      { do: "THE BRIEF — NorthPier Consulting, one floor: a building with a rack; staff VLAN 10 (10.0.10.0/24) and guest VLAN 20 (10.0.20.0/24); guest gets DHCP; office Wi-Fi; an intranet server staff reach BY NAME; power and cooling that survive scrutiny.\n\nStart with the shell: Add ▾ a Building, then a Rack, and drag the rack inside the building.",
        why: "Real projects start with walls, not configs. The rack must sit INSIDE the building — it inherits the room's air and power, and the BOM prices in-rack cabling differently. Rename both via their headers if you like; the client will read this drawing.",
        check: () => {
          const b = Object.values(zones).find(z => (z.kind || "building") === "building");
          const r = Object.values(zones).find(z => z.kind === "rack");
          return !!(b && r && r.x + r.w / 2 >= b.x && r.x + r.w / 2 <= b.x + b.w &&
                    r.y + r.h / 2 >= b.y && r.y + r.h / 2 <= b.y + b.h);
        } },
      { do: "Rack a PoE switch: Add ▾ > Switch, pick a P-model (EX2300-24P or USW-Pro-24-PoE), drop it onto the rack.",
        why: "The brief says Wi-Fi, and Wi-Fi means PoE — choose the platform for the LOAD it will carry, not the price tag alone. Watch it click into the rails at full width; hardware that is drawn racked is hardware the installer cannot misplace.",
        check: () => Object.values(devices).some(d => d.type === "switch" &&
          typeof POE_BUDGET_W !== "undefined" && POE_BUDGET_W[d.model] > 0 &&
          typeof rackOf === "function" && rackOf(d.id) && d.powered !== false) },
      { do: "Configure the two departments on the switch and commit:\nvlans staff (10) and guest (20), irb.10 = 10.0.10.1/24, irb.20 = 10.0.20.1/24, each bound with l3-interface.",
        why: "Lessons 4 and 5, at production speed. Use show | compare before the commit like it is a habit — because from this project on, it is.",
        hint: "Six set lines + two l3-interface bindings. The how-to guides in Reference have them verbatim.",
        check: () => Object.values(devices).some(d => {
          if(d.type !== "switch" || !d.d) return false;
          const irbs = d.d.irbs || {};
          return irbs["10"] && irbs["10"].ip === "10.0.10.1" && irbs["20"] && irbs["20"].ip === "10.0.20.1";
        }) },
      { do: "Guest DHCP: a pool for 10.0.20.0/24 (range .100-.199, router 10.0.20.1), dhcp-local-server on irb.20, commit. Then prove it: cable a guest PC to a guest-VLAN access port and dhclient eth0.",
        why: "The client will never hand-type addresses for visitors. And a pool is only DELIVERED when a real machine gets a lease from it — configuration without a witness is a hope, not a service.",
        check: () => Object.values(devices).some(d => d.type === "host" &&
          d.cfg.viaDhcp && /^10\.0\.20\./.test(d.cfg.ip || "")) },
      { do: "Office Wi-Fi: Add ▾ an Access Point, cable its eth0 into a staff access port on your PoE switch.",
        why: "On the P-model the AP powers straight from the port — show poe interface shows the watts flowing. If it says NO POWER, you cabled it somewhere that cannot feed it: that error is the whole reason step 2 chose this switch.",
        check: () => Object.values(devices).some(d => d.type === "ap" &&
          isLinked(d.id, "eth0") && typeof POE !== "undefined" && !POE.denied[d.id]) },
      { do: "The intranet: Add ▾ a Server into the rack, address 10.0.10.80/24 gw 10.0.10.1, start dns and http, and publish:  dns add intranet.lab 10.0.10.80",
        why: "This is what the network is FOR. Everything before this step moved packets; this step gives the packets a destination worth reaching.",
        check: () => Object.values(devices).some(d => d.type === "server" &&
          d.cfg.ip === "10.0.10.80" && d.cfg.services && d.cfg.services.dns && d.cfg.services.http &&
          d.cfg.records && d.cfg.records["intranet.lab"] === "10.0.10.80") },
      { do: "Prove it end to end: a staff PC (10.0.10.x, gw .1, nameserver 10.0.10.80) runs  curl intranet.lab  — and gets 200 OK.",
        why: "The acceptance test a client actually understands: their page, by its name, on their machine. Every earlier step can be green while this one fails — which is exactly why real deliveries end with this command, not with a config printout.",
        check: () => Object.values(devices).some(d => {
          if(d.type !== "host" || !/^10\.0\.10\./.test(d.cfg.ip || "")) return false;
          try{ return curlCheck(d, "intranet.lab").ok; }catch(e){ return false; }
        }) },
      { do: "Keep it alive: a UPS in the rack sized for the load, and a cooling unit INSIDE the building.",
        why: "A server and a switch pour real watts into that room, and the room WILL reach thermal shutdown without cooling — watch the building header. The UPS status screen does your sizing arithmetic; read it before you pick the small one.",
        check: () => {
          const b = Object.values(zones).find(z => (z.kind || "building") === "building");
          if(!b) return false;
          const cap = upsCapOf(b);
          const load = buildingInfra(b).filter(d => d.powered !== false).reduce((a, d) => a + drawOf(d), 0);
          const crac = Object.values(devices).some(d => d.type === "crac" && d.powered !== false &&
            typeof zoneOf === "function" && zoneOf(d.id) && zoneOf(d.id).id === b.id);
          return cap > 0 && load > 0 && load <= cap && crac;
        } },
      { do: "Face the grader: Plan ▾ > Validate. Fix every ERROR it names (single-point-of-failure findings excepted — that is a budget conversation, not a mistake).",
        why: "The design-rule check is the closest thing this lab has to a picky senior engineer. Warnings are judgment calls; errors are things that WILL page someone at night. When this passes, open the Build Packet — that document plus this drawing is literally what you would hand an installer.",
        check: () => {
          try{
            return runDrc().filter(f => f.sev === "error" &&
              !/Single point of failure/.test(f.text)).length === 0 &&
              Object.values(devices).filter(d => d.type === "switch").length > 0;
          }catch(e){ return false; }
        } },
    ],
    done: "That was not an exercise — that was a delivery: brief to building to VLANs to services to power to a passing validation. Generate a contract (Scenarios tab) when you want the same feeling with a brief you have never seen.",
    next: null,
  },
];

/* ============================================================
   DRILLS — quick-fire recall. Command cards are GENERATED from the
   grammar (so they can never drift); output-reading cards are curated.
   ============================================================ */
var DRILL_STATS = { asked: 0, correct: 0 };
try{ DRILL_STATS = JSON.parse(localStorage.getItem("junoslab-drill") || "null") || DRILL_STATS; }catch(e){}
const DRILL_CURATED = [
  { q: "show bgp summary says:\n  203.0.113.1   65001   Active\nWhat does Active mean here?",
    correct: "The router is TRYING to connect and failing — check the reason column: wrong peer-as, or no path to the neighbor",
    wrong: ["The session is up and routes are flowing", "BGP is disabled and must be activated", "The peer is active as the VRRP master"] },
  { q: "curl web.lab answers:\n  Connection refused\nWhat is true?",
    correct: "The machine is REACHABLE but nothing listens on that port — a stopped service, not a network problem",
    wrong: ["The network path is broken — check cables and VLANs", "DNS could not resolve the name", "The firewall silently discarded the packet"] },
  { q: "ping answers instantly:\n  connect: Network is unreachable\nWhere is the fault?",
    correct: "On the SENDING machine itself — wrong address or no default gateway; the packet never left",
    wrong: ["On the far-end server", "On the switch between them", "At the ISP"] },
  { q: "A firewall filter has one term:\n  term block ... then discard\nWhat happens to traffic that matches NO term?",
    correct: "The invisible final term discards it — without an explicit accept term, the filter eats everything",
    wrong: ["It is accepted by default", "It is logged and forwarded", "The commit is refused as incomplete"] },
  { q: "Your ping REACHED the server but you see Request timeout. Most likely?",
    correct: "The reply died on the way back — the far side has no route to YOUR address (asymmetric routing)",
    wrong: ["The server is powered off", "Your own gateway is missing", "The name did not resolve"] },
  { q: "You commit a change over SSH and your session dies instantly. What should you have typed instead of commit?",
    correct: "commit confirmed 5 — if you cannot confirm within five minutes, the box rolls back on its own",
    wrong: ["commit check", "commit and-quit", "save rollback"] },
  { q: "An AP is cabled to an EX3400-24T and shows NO POWER. Why?",
    correct: "That switch model supplies no PoE — use a P-model or fit an injector; the AP starves on a perfectly good cable",
    wrong: ["The AP's SSID is not configured", "The cable is a crossover", "The switch port is in the wrong VLAN"] },
  { q: "show vrrp on a switch says: backup. What does that mean for traffic?",
    correct: "Another box currently answers for the virtual gateway address — this one takes over only if the master dies",
    wrong: ["This switch drops all gateway traffic", "VRRP is misconfigured and must be fixed", "Hosts must point at this switch's real address"] },
  { q: "dhclient works, the client has an address — but cannot reach other subnets. The pool is probably missing:",
    correct: "dhcp-attributes router — the lease carried an address but no gateway",
    wrong: ["a bigger range", "a dns record for the client", "an interface-mode trunk statement"] },
  { q: "Two switches, same VLAN names — but staff is vlan-id 10 on one and 20 on the other. Across the trunk:",
    correct: "Frames land in the WRONG room: tags carry numbers, not names, and nobody prints an error",
    wrong: ["The commit fails on the second switch", "The trunk refuses to come up", "Traffic works — names are what matters"] },
];
function drillPool(){
  const pool = DRILL_CURATED.map(c => ({ ...c }));
  const clean = s => String(s).replace(/<(\w[\w-]*):[^>]+>/g, "<$1>");
  const add = (cmd, help) => {
    if(help && help.length > 20) pool.push({ q: "What does this do?\n\n" + cmd, correct: help, wrong: null });
  };
  try{
    SWITCH_CFG_SPECS.forEach(([sp, o]) => add("set " + clean(sp), o.help));
    ROUTER_CFG_SPECS.forEach(([sp, o]) => add("set " + clean(sp), o.help));
    OP_SPECS.switch.forEach(([sp, o]) => add(clean(sp), o.help));
    OP_SPECS.router.forEach(([sp, o]) => add(clean(sp), o.help));
  }catch(e){}
  return pool;
}
function drillDeck(n){
  const pool = drillPool();
  const picked = [];
  const used = new Set();
  // guarantee a few curated output-reading cards per deck
  const cur = DRILL_CURATED.slice().sort(() => Math.random() - 0.5).slice(0, 3);
  picked.push(...cur.map(c => ({ ...c })));
  while(picked.length < (n || 10) && used.size < pool.length){
    const k = Math.floor(Math.random() * pool.length);
    if(used.has(k)) continue;
    used.add(k);
    const c = pool[k];
    if(picked.some(p => p.q === c.q)) continue;
    picked.push({ ...c });
  }
  for(const card of picked){
    let wrong = card.wrong;
    if(!wrong){
      wrong = [];
      const others = pool.filter(p => p.correct !== card.correct);
      while(wrong.length < 3 && others.length){
        const o = others.splice(Math.floor(Math.random() * others.length), 1)[0];
        if(!wrong.includes(o.correct)) wrong.push(o.correct);
      }
    }
    card.choices = [card.correct, ...wrong].sort(() => Math.random() - 0.5);
  }
  return picked.sort(() => Math.random() - 0.5);
}
function drillRecord(ok2){
  DRILL_STATS.asked++;
  if(ok2) DRILL_STATS.correct++;
  try{ localStorage.setItem("junoslab-drill", JSON.stringify(DRILL_STATS)); }catch(e){}
}
function drillStart(){
  TUT_STATE.drill = { deck: drillDeck(10), i: 0, score: 0, answered: null };
  tutRender();
}
function drillExit(){ TUT_STATE.drill = null; tutRender(); }

/* ---------- engine ---------- */
function tutById(id){ return TUTORIALS.find(t => t.id === id) || null; }
function tutStart(id){
  const t = tutById(id);
  if(!t) return;
  TUT_STATE.active = id; TUT_STATE.step = 0; TUT_STATE.hintOn = false;
  if(t.setup){
    wipeLab();
    t.setup();
    rebuildAllDerived();
    if(typeof touchState === "function") touchState();
  }
  tutRender();
}
function tutCheckNow(){
  const t = tutById(TUT_STATE.active);
  if(!t || TUT_STATE.step >= t.steps.length) return false;
  try{ return !!t.steps[TUT_STATE.step].check(); }catch(e){ return false; }
}
function tutAdvance(){
  const t = tutById(TUT_STATE.active);
  if(!t) return;
  TUT_STATE.step++; TUT_STATE.hintOn = false;
  if(TUT_STATE.step >= t.steps.length){
    TUT_STATE.done[t.id] = true;
    try{ localStorage.setItem("junoslab-tut-done", JSON.stringify(TUT_STATE.done)); }catch(e){}
  }
  tutRender();
}
function tutExit(){ TUT_STATE.active = null; tutSetSpotlight(null); tutRender(); }
function tutTick(){ if(TUT_STATE.active) tutRender(); }

/* ---------- rendering (shim-safe: everything in try/catch) ---------- */
function tutRender(){
  try{
    const listEl = document.getElementById("tut-list"), actEl = document.getElementById("tut-active");
    if(!listEl || !actEl) return;
    if(TUT_STATE.drill){
      tutSetSpotlight(null);
      listEl.style.display = "none"; actEl.style.display = "";
      drillRenderInto(actEl);
    } else if(!TUT_STATE.active){
      tutSetSpotlight(null);
      listEl.style.display = ""; actEl.style.display = "none";
      tutRenderList(listEl);
    } else {
      listEl.style.display = "none"; actEl.style.display = "";
      tutRenderActive(actEl);
    }
  }catch(e){}
}
function tutProgressEl(){
  const wrap = document.createElement("div"); wrap.className = "tut-dash";
  const mk = (label, doneN, total, nextLabel) => {
    const box = document.createElement("div"); box.className = "tut-meter";
    const h = document.createElement("div"); h.className = "tut-meter-h";
    h.textContent = label + "  " + doneN + " / " + total;
    const bar = document.createElement("div"); bar.className = "tut-bar";
    const fill = document.createElement("div"); fill.className = "tut-bar-fill";
    fill.style.width = (total ? Math.round(100 * doneN / total) : 0) + "%";
    bar.appendChild(fill);
    const nx = document.createElement("div"); nx.className = "tut-meter-next";
    nx.textContent = nextLabel || (doneN >= total ? "all done" : "");
    box.append(h, bar, nx);
    return box;
  };
  const tutsDone = TUTORIALS.filter(x => TUT_STATE.done[x.id]).length;
  const nextTut = TUTORIALS.find(x => !TUT_STATE.done[x.id]);
  wrap.appendChild(mk("Lessons", tutsDone, TUTORIALS.length,
    nextTut ? "next: " + nextTut.title : ""));
  try{
    if(typeof SCENARIOS !== "undefined" && typeof PROGRESS !== "undefined"){
      const scDone = SCENARIOS.filter(s => PROGRESS[s.id] && PROGRESS[s.id].done).length;
      const nextSc = SCENARIOS.find(s => !(PROGRESS[s.id] && PROGRESS[s.id].done));
      wrap.appendChild(mk("Scenarios", scDone, SCENARIOS.length,
        nextSc ? "next: " + nextSc.title : ""));
    }
  }catch(e){}
  return wrap;
}
function drillRenderInto(el){
  el.innerHTML = "";
  const d = TUT_STATE.drill;
  const top = document.createElement("div"); top.className = "tut-top";
  const back = document.createElement("button"); back.className = "tut-back";
  back.textContent = "◂ stop drilling";
  back.onclick = drillExit;
  const h = document.createElement("div"); h.className = "tut-title";
  h.textContent = d.i >= d.deck.length
    ? "Drill complete — " + d.score + " of " + d.deck.length
    : "Question " + (d.i + 1) + " of " + d.deck.length + "   ·   score " + d.score;
  top.append(back, h);
  el.appendChild(top);
  if(d.i >= d.deck.length){
    const box = document.createElement("div"); box.className = "tut-donebox";
    const pct = Math.round(100 * d.score / d.deck.length);
    box.textContent = pct >= 80
      ? "Strong recall (" + pct + " percent). Repetition is how command syntax becomes muscle memory — come back tomorrow, not in an hour."
      : "Recall builds with repetition — " + pct + " percent today is a starting point, not a verdict. The wrong answers you just saw are the exact cards worth re-reading in the Reference.";
    el.appendChild(box);
    const again = document.createElement("button"); again.className = "tut-next";
    again.textContent = "Draw ten more ▸";
    again.onclick = drillStart;
    el.appendChild(again);
    return;
  }
  const card = d.deck[d.i];
  const q = document.createElement("pre"); q.className = "tut-do"; q.textContent = card.q;
  el.appendChild(q);
  card.choices.forEach(ch => {
    const b = document.createElement("button");
    b.className = "drill-choice" +
      (d.answered !== null ? (ch === card.correct ? " right" : ch === d.answered ? " wrong" : " off") : "");
    b.textContent = ch;
    b.disabled = d.answered !== null;
    b.onclick = () => {
      d.answered = ch;
      const okA = ch === card.correct;
      if(okA) d.score++;
      drillRecord(okA);
      tutRender();
    };
    el.appendChild(b);
  });
  if(d.answered !== null){
    const nx = document.createElement("button"); nx.className = "tut-nextstep ready";
    nx.textContent = "next ▸";
    nx.onclick = () => { d.i++; d.answered = null; tutRender(); };
    el.appendChild(nx);
  }
}
function tutRenderList(el){
  el.innerHTML = "";
  el.appendChild(tutProgressEl());
  const intro = document.createElement("p");
  intro.className = "tut-intro";
  intro.textContent = "Little lessons that hold your hand: every step says what to type, why it matters, " +
    "and notices the moment you have done it. Do them in order the first time — each one stands on the last. " +
    "Scenarios (next tab) are the same ideas WITHOUT the hand-holding; graduate there when these feel easy.";
  el.appendChild(intro);
  const dr = document.createElement("div"); dr.className = "tut-card tut-drill-card";
  const drh = document.createElement("div"); drh.className = "tut-card-title";
  drh.textContent = "Drill — ten quick-fire questions";
  const drb = document.createElement("div"); drb.className = "tut-card-blurb";
  drb.textContent = "Flashcards generated from the lab's own command grammar, plus read-the-output puzzles. Scenarios test doing; this tests REMEMBERING — the part that fades first.";
  const drm = document.createElement("div"); drm.className = "tut-card-meta";
  drm.textContent = DRILL_STATS.asked
    ? "lifetime: " + DRILL_STATS.correct + " / " + DRILL_STATS.asked + " (" + Math.round(100 * DRILL_STATS.correct / DRILL_STATS.asked) + " percent)"
    : "no drills yet — first draw is on the house";
  dr.append(drh, drb, drm);
  dr.onclick = drillStart;
  el.appendChild(dr);
  for(const t of TUTORIALS){
    const card = document.createElement("div");
    card.className = "tut-card" + (TUT_STATE.done[t.id] ? " tut-done-card" : "");
    const h = document.createElement("div"); h.className = "tut-card-title";
    h.textContent = t.title + (TUT_STATE.done[t.id] ? "  ✓" : "");
    const b = document.createElement("div"); b.className = "tut-card-blurb"; b.textContent = t.blurb;
    const m = document.createElement("div"); m.className = "tut-card-meta";
    m.textContent = t.steps.length + " steps" + (t.setup ? "  ·  loads its own starting lab" : "  ·  starts on your empty canvas");
    card.append(h, b, m);
    card.onclick = () => {
      if(t.setup && Object.keys(devices).length){
        if(typeof pushUndo === "function") pushUndo();
      }
      tutStart(t.id);
    };
    el.appendChild(card);
  }
}
function tutRenderActive(el){
  const tSpot = tutById(TUT_STATE.active);
  const stSpot = tSpot && tSpot.steps[TUT_STATE.step];
  tutSetSpotlight(stSpot && stSpot.spotlight ? stSpot.spotlight : null);
  el.innerHTML = "";
  const t = tutById(TUT_STATE.active);
  if(!t) return;
  const top = document.createElement("div"); top.className = "tut-top";
  const back = document.createElement("button"); back.className = "tut-back";
  back.textContent = "◂ all lessons";
  back.onclick = tutExit;
  const h = document.createElement("div"); h.className = "tut-title"; h.textContent = t.title;
  top.append(back, h);
  el.appendChild(top);

  const finished = TUT_STATE.step >= t.steps.length;
  const prog = document.createElement("div"); prog.className = "tut-prog";
  for(let i = 0; i < t.steps.length; i++){
    const dot = document.createElement("span");
    dot.className = "tut-dot" + (i < TUT_STATE.step || finished ? " past" : i === TUT_STATE.step ? " now" : "");
    prog.appendChild(dot);
  }
  const pl = document.createElement("span"); pl.className = "tut-proglbl";
  pl.textContent = finished ? "complete" : "step " + (TUT_STATE.step + 1) + " of " + t.steps.length;
  prog.appendChild(pl);
  el.appendChild(prog);

  if(finished){
    const doneBox = document.createElement("div"); doneBox.className = "tut-donebox";
    const dh = document.createElement("div"); dh.className = "tut-doneh"; dh.textContent = "Lesson complete";
    const dt = document.createElement("div"); dt.textContent = t.done;
    doneBox.append(dh, dt);
    el.appendChild(doneBox);
    if(t.next && tutById(t.next)){
      const nb = document.createElement("button"); nb.className = "tut-next";
      nb.textContent = "Next lesson: " + tutById(t.next).title + " ▸";
      nb.onclick = () => tutStart(t.next);
      el.appendChild(nb);
    }
    return;
  }

  const st = t.steps[TUT_STATE.step];
  const passed = tutCheckNow();
  const stepBox = document.createElement("div"); stepBox.className = "tut-step" + (passed ? " pass" : "");
  const doEl = document.createElement("pre"); doEl.className = "tut-do"; doEl.textContent = st.do;
  const whyEl = document.createElement("div"); whyEl.className = "tut-why"; whyEl.textContent = st.why;
  stepBox.append(doEl, whyEl);
  if(TUT_STATE.hintOn && st.hint){
    const hintEl2 = document.createElement("div"); hintEl2.className = "tut-hint"; hintEl2.textContent = "Hint: " + st.hint;
    stepBox.appendChild(hintEl2);
  }
  el.appendChild(stepBox);

  const row = document.createElement("div"); row.className = "tut-btnrow";
  const status = document.createElement("span"); status.className = "tut-status " + (passed ? "ok" : "wait");
  status.textContent = passed ? "done — the lab saw it" : "watching the lab...";
  row.appendChild(status);
  if(st.hint && !TUT_STATE.hintOn && !passed){
    const hb = document.createElement("button"); hb.textContent = "hint";
    hb.onclick = () => { TUT_STATE.hintOn = true; tutRender(); };
    row.appendChild(hb);
  }
  const next = document.createElement("button"); next.className = "tut-nextstep" + (passed ? " ready" : "");
  next.textContent = "Next ▸";
  next.disabled = !passed;
  next.onclick = () => { if(tutCheckNow()) tutAdvance(); };
  row.appendChild(next);
  if(!passed){
    const skip = document.createElement("button"); skip.className = "tut-skip"; skip.textContent = "skip";
    skip.title = "Move on without completing this step (it will not be marked done)";
    skip.onclick = tutAdvance;
    row.appendChild(skip);
  }
  el.appendChild(row);
}

/* live refresh: re-check the current step about once a second (browser only —
   requestAnimationFrame is the tell that a real DOM exists) */
try{
  if(typeof requestAnimationFrame === "function" && typeof setInterval === "function")
    setInterval(tutTick, 900);
}catch(e){}
tutRender();
