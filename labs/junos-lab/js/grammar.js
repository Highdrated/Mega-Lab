/* ============================================================
   GRAMMAR — placeholder types
   ============================================================ */
const PH = {
  ifname: {
    help: "Interface name",
    validate: (t, dev) => dev.ports.some(p => p.id === t) || t === "irb" || t === "me0" || /^ae\d{1,2}$/.test(t),
    complete: dev => {
      const names = dev.ports.map(p => p.id);
      if(dev.type === "switch") names.push("irb", "ae0");
      names.push("me0");
      return names;
    },
  },
  physport: {
    help: "Physical interface",
    validate: (t, dev) => dev.ports.some(p => p.id === t) || t === "me0",
    complete: dev => [...dev.ports.map(p => p.id), "me0"],
  },
  unit: { help: "Logical unit number", validate: t => /^\d{1,4}$/.test(t), complete: () => ["0"] },
  vlanid: { help: "VLAN id (1..4094)", validate: t => /^\d{1,4}$/.test(t) && +t >= 1 && +t <= 4094, complete: () => [] },
  word: { help: "Name", validate: t => /^[\w.-]+$/.test(t), complete: () => [] },
  prefix: { help: "address/prefix (a.b.c.d/nn)", validate: t => !!parsePrefix(t), complete: () => [] },
  ip: { help: "IP address", validate: t => validIp(t), complete: () => [] },
  vlanmember: {
    help: "VLAN name (or all)",
    validate: t => /^[\w.-]+$/.test(t),
    complete: dev => {
      const v = cfgGet(dev.candidate, ["vlans"]) || {};
      return [...Object.keys(v), "all"];
    },
  },
  vlanref: {
    help: "VLAN name",
    validate: t => /^[\w.-]+$/.test(t),
    complete: dev => Object.keys(cfgGet(dev.candidate, ["vlans"]) || {}),
  },
  minutes: { help: "Minutes (1..720)", validate: t => /^\d{1,3}$/.test(t) && +t >= 1 && +t <= 720, complete: () => ["1", "10"] },
  irbref: { help: "irb.<unit>", validate: t => /^irb\.\d{1,4}$/.test(t), complete: () => ["irb.0"] },
  filterref: {
    help: "Firewall filter name",
    validate: t => /^[\w.-]+$/.test(t),
    complete: dev => Object.keys(cfgGet(dev.candidate, ["firewall", "family", "inet", "filter"]) || {}),
  },
  profileref: {
    help: "Storm-control profile name",
    validate: t => /^[\w.-]+$/.test(t),
    complete: dev => Object.keys(cfgGet(dev.candidate, ["forwarding-options", "storm-control-profiles"]) || {}),
  },
  aeref: { help: "Aggregated interface (ae0..ae99)", validate: t => /^ae\d{1,2}$/.test(t), complete: () => ["ae0"] },
  l3if: {
    help: "Logical interface (e.g. ge-0/0/1.0, irb.10)",
    validate: t => /^[\w-]+(\/\d+)*\.\d{1,4}$/.test(t),
    complete: dev => {
      try{ if(typeof ifacesOf === "function" && dev.d) return ifacesOf(dev).map(i => i.name); }catch(e){}
      return [];
    },
  },
  num: { help: "Number", validate: t => /^\d{1,5}$/.test(t), complete: () => [] },
  password: { help: "Password (4+ characters, no spaces)", validate: t => /^\S{4,}$/.test(t), complete: () => [] },
  asn: { help: "Autonomous system number (1-4294967295)", validate: t => /^\d+$/.test(t) && +t >= 1 && +t <= 4294967295, complete: () => [] },
  hashv: { help: "Password hash", validate: t => /^\S+$/.test(t), complete: () => [] },
  loginclass: { help: "Login class", validate: t => ["super-user", "operator", "read-only"].includes(t),
    complete: () => ["super-user", "operator", "read-only"] },
};

/* spec string -> token descriptors */
function parseSpec(str){
  return str.trim().split(/\s+/).map(tok => {
    const m = tok.match(/^<([^:>]+):([^>]+)>$/);
    return m ? { ph: m[2], label: m[1] } : { lit: tok };
  });
}

/* trie */
function newTrieNode(){ return { lits: {}, phs: [], leaf: null }; }
function trieInsert(root, specStr, opts){
  const toks = parseSpec(specStr);
  let node = root;
  for(const t of toks){
    if(t.lit){
      if(!node.lits[t.lit]) node.lits[t.lit] = newTrieNode();
      node = node.lits[t.lit];
    } else {
      let edge = node.phs.find(p => p.ph === t.ph && p.label === t.label);
      if(!edge){ edge = { ph: t.ph, label: t.label, node: newTrieNode() }; node.phs.push(edge); }
      node = edge.node;
    }
  }
  node.leaf = opts;
  return root;
}
function buildTrie(specs){
  const root = newTrieNode();
  for(const [s, opts] of specs) trieInsert(root, s, opts);
  return root;
}

/* walk tokens through a trie with JunOS-style unique-prefix abbreviation.
   Backtracks across placeholder alternatives so sibling statements that share
   a prefix (e.g. vlans <n> vlan-id … / vlans <n> l3-interface …) all resolve.
   returns {node, keys, err, expecting} — keys = tokens with literals expanded */
function trieWalk(root, tokens, dev){
  let bestErr = null;
  function fail(node, i){
    if(!bestErr || bestErr.at <= i)
      bestErr = { err: `syntax error: "${tokens[i]}"`, at: i,
        expecting: [...Object.keys(node.lits), ...node.phs.map(p => `<${p.label}>`)] };
  }
  function step(node, i, keys){
    if(i === tokens.length) return { node, keys };
    const tok = tokens[i];
    const tries = [];
    if(node.lits[tok]) tries.push([node.lits[tok], tok]);
    else {
      const pref = Object.keys(node.lits).filter(l => l.startsWith(tok));
      if(pref.length === 1) tries.push([node.lits[pref[0]], pref[0]]);
      else if(pref.length > 1 && !bestErr)
        bestErr = { err: `ambiguous command: "${tok}" could be: ${pref.join(", ")}`, at: i };
    }
    for(const p of node.phs) if(PH[p.ph].validate(tok, dev)) tries.push([p.node, tok]);
    if(!tries.length){ fail(node, i); return null; }
    for(const [next, key] of tries){
      const r = step(next, i + 1, keys.concat([key]));
      if(r) return r;
    }
    fail(node, i);
    return null;
  }
  const res = step(root, 0, []);
  return res || bestErr || { err: "syntax error" };
}
/* all reachable end-nodes for a token sequence (used by completions, so
   every sibling statement contributes its next tokens) */
function trieWalkAll(root, tokens, dev){
  const ends = [];
  function step(node, i){
    if(i === tokens.length){ ends.push(node); return; }
    const tok = tokens[i];
    if(node.lits[tok]) step(node.lits[tok], i + 1);
    else {
      const pref = Object.keys(node.lits).filter(l => l.startsWith(tok));
      if(pref.length === 1) step(node.lits[pref[0]], i + 1);
    }
    for(const p of node.phs) if(PH[p.ph].validate(tok, dev)) step(p.node, i + 1);
  }
  step(root, 0);
  return ends;
}
function trieCompletionsAll(root, tokens, dev, partial){
  const ends = trieWalkAll(root, tokens, dev);
  const seen = new Map();
  for(const node of ends)
    for(const it of trieCompletions(node, dev, partial))
      if(!seen.has(it.label) || (it.help && !seen.get(it.label).help)) seen.set(it.label, it);
  return [...seen.values()];
}

/* completion candidates at a trie node */
function trieCompletions(node, dev, partial){
  const items = [];
  if(node.leaf) items.push({ label: "<[Enter]>", help: "Execute this command" });
  for(const l of Object.keys(node.lits)){
    const child = node.lits[l];
    items.push({ label: l, help: (child.leaf && child.leaf.help) || peekHelp(child) });
  }
  for(const p of node.phs){
    const opts = PH[p.ph].complete(dev) || [];
    if(opts.length){
      for(const o of opts.slice(0, 24)) items.push({ label: o, help: PH[p.ph].help });
    } else items.push({ label: `<${p.label}>`, help: PH[p.ph].help });
  }
  const filt = partial ? items.filter(it => it.label.startsWith(partial) || it.label.startsWith("<")) : items;
  return filt;
}
function peekHelp(node){
  if(node.leaf && node.leaf.help) return node.leaf.help;
  const ks = Object.keys(node.lits);
  return ks.length ? "" : "";
}

/* ============================================================
   CONFIG GRAMMARS
   kind: value    -> last token stored as leaf value
         list     -> last token appended to a leaf array
         presence -> path itself is the statement
   ============================================================ */
const SWITCH_CFG_SPECS = [
  ["chassis aggregated-devices ethernet device-count <count:num>", { kind:"value", help:"How many ae bundles this chassis may create — real EX switches need this before any ae exists" }],
  ["system host-name <hostname:word>", { kind:"value", help:"Set the system hostname" }],
  ["interfaces <interface:ifname> disable", { kind:"presence", help:"Administratively disable this interface" }],
  ["interfaces <interface:ifname> description <text:word>", { kind:"value", help:"Interface description" }],
  ["interfaces <interface:physport> ether-options 802.3ad <bundle:aeref>", { kind:"value", help:"Make this port a member of an aggregated (LACP) bundle" }],
  ["interfaces <interface:ifname> aggregated-ether-options lacp active", { kind:"enumvalue", help:"Run LACP in active mode on this bundle" }],
  ["interfaces <interface:ifname> aggregated-ether-options lacp passive", { kind:"enumvalue", help:"Run LACP in passive mode on this bundle" }],
  ["interfaces <interface:ifname> unit <unit:unit> family ethernet-switching", { kind:"presence", help:"Enable L2 switching on this unit" }],
  ["interfaces <interface:ifname> unit <unit:unit> family ethernet-switching interface-mode access", { kind:"enumvalue", help:"Untagged access port (one VLAN)" }],
  ["interfaces <interface:ifname> unit <unit:unit> family ethernet-switching interface-mode trunk", { kind:"enumvalue", help:"802.1Q trunk port (tagged VLANs)" }],
  ["interfaces <interface:ifname> unit <unit:unit> family ethernet-switching vlan members <vlan:vlanmember>", { kind:"list", help:"VLAN(s) carried by this port" }],
  ["interfaces <interface:ifname> unit <unit:unit> family ethernet-switching storm-control <profile:profileref>", { kind:"value", help:"Bind a storm-control profile to this port" }],
  ["interfaces <interface:ifname> unit <unit:unit> family inet address <address:prefix>", { kind:"list", help:"IPv4 address (irb units only in this lab)" }],
  ["interfaces <interface:ifname> unit <unit:unit> family inet filter input <filter:filterref>", { kind:"value", help:"Apply a firewall filter to inbound traffic" }],
  ["interfaces <interface:ifname> unit <unit:unit> family inet filter output <filter:filterref>", { kind:"value", help:"Apply a firewall filter to outbound traffic" }],
  ["vlans <vlan-name:word> vlan-id <id:vlanid>", { kind:"value", help:"Create a VLAN with this 802.1Q id" }],
  ["vlans <vlan-name:vlanref> l3-interface <irb:irbref>", { kind:"value", help:"Attach an irb unit as this VLAN's L3 gateway" }],
  ["routing-options static route <destination:prefix> next-hop <next-hop:ip>", { kind:"value", help:"Static route (0.0.0.0/0 = default)" }],
  ["protocols rstp", { kind:"presence", help:"Enable Rapid Spanning Tree on this switch" }],
  ["protocols rstp interface all", { kind:"enumvalue", help:"Run RSTP on all interfaces" }],
  ["firewall family inet filter <filter:word> term <term:word> from source-address <address:prefix>", { kind:"list", help:"Match on source address" }],
  ["firewall family inet filter <filter:word> term <term:word> from destination-address <address:prefix>", { kind:"list", help:"Match on destination address" }],
  ["firewall family inet filter <filter:word> term <term:word> from protocol <proto:word>", { kind:"list", help:"Match on protocol (e.g. icmp)" }],
  ["firewall family inet filter <filter:word> term <term:word> then accept", { kind:"enumvalue", help:"Accept matching traffic" }],
  ["firewall family inet filter <filter:word> term <term:word> then discard", { kind:"enumvalue", help:"Silently drop matching traffic" }],
  ["firewall family inet filter <filter:word> term <term:word> then reject", { kind:"enumvalue", help:"Drop and send admin-prohibited" }],
  ["forwarding-options storm-control-profiles <profile:word> all", { kind:"presence", help:"Storm-control profile matching all traffic" }],
  ["forwarding-options storm-control-profiles <profile:word> all action-shutdown", { kind:"presence", help:"Shut the port down when a storm hits (instead of rate-limiting)" }],
  ["protocols ospf area <area:word> interface <interface:l3if>", { kind:"presence", help:"Run OSPF on this L3 interface" }],
  ["protocols ospf area <area:word> interface <interface:l3if> passive", { kind:"presence", help:"Advertise this network without forming adjacencies" }],
  ["system services dhcp-local-server group <group:word> interface <interface:l3if>", { kind:"presence", help:"Serve DHCP on this L3 interface" }],
  ["access address-assignment pool <pool:word> family inet network <network:prefix>", { kind:"value", help:"The subnet this pool serves" }],
  ["access address-assignment pool <pool:word> family inet range <range:word> low <low:ip>", { kind:"value", help:"First address handed out" }],
  ["access address-assignment pool <pool:word> family inet range <range:word> high <high:ip>", { kind:"value", help:"Last address handed out" }],
  ["access address-assignment pool <pool:word> family inet dhcp-attributes router <router:ip>", { kind:"value", help:"Default gateway handed to clients" }],
  ["system root-authentication plain-text-password", { kind:"presence", help:"Set the root password (prompts for it, like the real box)" }],
  ["system root-authentication plain-text-password <password:password>", { kind:"value", help:"Set the root password inline (lab convenience)" }],
  ["system services ssh", { kind:"presence", help:"Enable SSH management access" }],
  ["system ntp server <server:ip>", { kind:"list", help:"Time source — real logs need real clocks" }],
  ["system syslog host <host:ip> any any", { kind:"presence", help:"Stream this box's log to a syslog server (any facility, any severity)" }],
  ["system name-server <server:ip>", { kind:"list", help:"DNS resolver" }],
  ["system login user <user:word> class <class:loginclass>", { kind:"value", help:"Create an admin account with a permission class" }],
  ["system login user <user:word> authentication plain-text-password <password:password>", { kind:"value", help:"Set the user's password (stored as a hash)" }],
  ["system login user <user:word> authentication encrypted-password <hash:hashv>", { kind:"value", help:"Pre-hashed password (used by display-set reloads)" }],
  ["system root-authentication encrypted-password <hash:hashv>", { kind:"value", help:"Pre-hashed root password (used by display-set reloads)" }],
  ["interfaces interface-range <range:word> member <member:physport>", { kind:"list", help:"Add a port to this range — configure the range once, hit every member" }],
  ["interfaces interface-range <range:word> unit <unit:unit> family ethernet-switching interface-mode access", { kind:"enumvalue", help:"All member ports become access ports" }],
  ["interfaces interface-range <range:word> unit <unit:unit> family ethernet-switching interface-mode trunk", { kind:"enumvalue", help:"All member ports become trunks" }],
  ["interfaces interface-range <range:word> unit <unit:unit> family ethernet-switching vlan members <vlan:vlanmember>", { kind:"list", help:"VLAN(s) for every member port" }],
  ["switch-options interface <interface:physport> interface-mac-limit <limit:num>", { kind:"value", help:"Max MAC addresses learned on this port" }],
  ["switch-options interface <interface:physport> packet-action shutdown", { kind:"enumvalue", help:"Error-disable the port when the MAC limit is exceeded" }],
];
const ROUTER_CFG_SPECS = [
  ["system host-name <hostname:word>", { kind:"value", help:"Set the system hostname" }],
  ["interfaces <interface:physport> disable", { kind:"presence", help:"Administratively disable this interface" }],
  ["interfaces <interface:physport> description <text:word>", { kind:"value", help:"Interface description" }],
  ["interfaces <interface:physport> unit <unit:unit> family inet address <address:prefix>", { kind:"list", help:"IPv4 address on this interface" }],
  ["interfaces <interface:physport> unit <unit:unit> family inet filter input <filter:filterref>", { kind:"value", help:"Apply a firewall filter to inbound traffic" }],
  ["interfaces <interface:physport> unit <unit:unit> family inet filter output <filter:filterref>", { kind:"value", help:"Apply a firewall filter to outbound traffic" }],
  ["routing-options static route <destination:prefix> next-hop <next-hop:ip>", { kind:"value", help:"Static route (0.0.0.0/0 = default)" }],
  ["firewall family inet filter <filter:word> term <term:word> from source-address <address:prefix>", { kind:"list", help:"Match on source address" }],
  ["firewall family inet filter <filter:word> term <term:word> from destination-address <address:prefix>", { kind:"list", help:"Match on destination address" }],
  ["firewall family inet filter <filter:word> term <term:word> from protocol <proto:word>", { kind:"list", help:"Match on protocol (e.g. icmp)" }],
  ["firewall family inet filter <filter:word> term <term:word> then accept", { kind:"enumvalue", help:"Accept matching traffic" }],
  ["firewall family inet filter <filter:word> term <term:word> then discard", { kind:"enumvalue", help:"Silently drop matching traffic" }],
  ["firewall family inet filter <filter:word> term <term:word> then reject", { kind:"enumvalue", help:"Drop and send admin-prohibited" }],
  ["protocols ospf area <area:word> interface <interface:l3if>", { kind:"presence", help:"Run OSPF on this L3 interface" }],
  ["protocols ospf area <area:word> interface <interface:l3if> passive", { kind:"presence", help:"Advertise this network without forming adjacencies" }],
  ["system services dhcp-local-server group <group:word> interface <interface:l3if>", { kind:"presence", help:"Serve DHCP on this L3 interface" }],
  ["access address-assignment pool <pool:word> family inet network <network:prefix>", { kind:"value", help:"The subnet this pool serves" }],
  ["access address-assignment pool <pool:word> family inet range <range:word> low <low:ip>", { kind:"value", help:"First address handed out" }],
  ["access address-assignment pool <pool:word> family inet range <range:word> high <high:ip>", { kind:"value", help:"Last address handed out" }],
  ["access address-assignment pool <pool:word> family inet dhcp-attributes router <router:ip>", { kind:"value", help:"Default gateway handed to clients" }],
  ["system root-authentication plain-text-password", { kind:"presence", help:"Set the root password (prompts for it, like the real box)" }],
  ["system root-authentication plain-text-password <password:password>", { kind:"value", help:"Set the root password inline (lab convenience)" }],
  ["system services ssh", { kind:"presence", help:"Enable SSH management access" }],
  ["system ntp server <server:ip>", { kind:"list", help:"Time source — real logs need real clocks" }],
  ["system syslog host <host:ip> any any", { kind:"presence", help:"Stream this box's log to a syslog server (any facility, any severity)" }],
  ["system name-server <server:ip>", { kind:"list", help:"DNS resolver" }],
  ["system login user <user:word> class <class:loginclass>", { kind:"value", help:"Create an admin account with a permission class" }],
  ["system login user <user:word> authentication plain-text-password <password:password>", { kind:"value", help:"Set the user's password (stored as a hash)" }],
  ["system login user <user:word> authentication encrypted-password <hash:hashv>", { kind:"value", help:"Pre-hashed password (used by display-set reloads)" }],
  ["system root-authentication encrypted-password <hash:hashv>", { kind:"value", help:"Pre-hashed root password (used by display-set reloads)" }],
  ["routing-options autonomous-system <as-number:asn>", { kind:"value", help:"This network's AS number — its name in the BGP world" }],
  ["protocols bgp group <group:word> type external", { kind:"enumvalue", help:"eBGP: peer with another autonomous system (your ISP)" }],
  ["protocols bgp group <group:word> peer-as <peer-as:asn>", { kind:"value", help:"The AS number of the far side — must match, or the session never comes up" }],
  ["protocols bgp group <group:word> neighbor <address:ip>", { kind:"list", help:"The peer's address (must be on a directly connected subnet for eBGP)" }],
  ["security nat source rule-set <rule-set:word> from interface <interface:l3if>", { kind:"value", help:"Traffic entering here is a NAT candidate" }],
  ["security nat source rule-set <rule-set:word> to interface <interface:l3if>", { kind:"value", help:"Traffic leaving here gets translated" }],
  ["security nat source rule-set <rule-set:word> rule <rule:word> match source-address <address:prefix>", { kind:"list", help:"Only translate these sources" }],
  ["security nat source rule-set <rule-set:word> rule <rule:word> then source-nat interface", { kind:"enumvalue", help:"Rewrite the source to the egress interface's address" }],
];
const CFG_TRIE = {
  switch: buildTrie(SWITCH_CFG_SPECS),
  router: buildTrie(ROUTER_CFG_SPECS),
};
