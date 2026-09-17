var EXAM_BANK = [
  { d: "Networking fundamentals", q: "Which address is the broadcast of 172.16.32.0/20?", opts: ["172.16.47.255", "172.16.32.255", "172.16.63.255"], right: 0, why: "/20's magic number in the third octet is 16: block 32\u201347. Broadcast = last address of the block: 172.16.47.255." },
  { d: "Networking fundamentals", q: "How many usable hosts in a /29?", opts: ["6", "8", "14"], right: 0, why: "2^3 = 8 addresses, minus network and broadcast = 6." },
  { d: "Networking fundamentals", typed: true, q: "Type the network address of 10.20.37.66/27:", answer: "10.20.37.64", why: "/27 steps by 32: .0, .32, .64, .96 \u2014 66 snaps down to .64." },
  { d: "Networking fundamentals", q: "A switch port and a VLAN correspond to which domains, respectively?", opts: ["Broadcast / collision", "Collision / broadcast", "Both broadcast"], right: 1, why: "Each switched port is its own collision domain; each VLAN is one broadcast domain." },
  { d: "Networking fundamentals", q: "Which PDU name belongs to layer 2?", opts: ["Packet", "Frame", "Segment"], right: 1, why: "data \u2192 segment (L4) \u2192 packet (L3) \u2192 frame (L2) \u2192 bits (L1)." },
  { d: "Networking fundamentals", q: "MAC addresses are significant...", opts: ["End to end across the internet", "Only within the local layer-2 segment", "Only on trunk ports"], right: 1, why: "Frames are re-addressed at every routed hop; MACs never leave their L2 segment. IPs go end to end." },
  { d: "Junos OS fundamentals", q: "Which plane forwards transit traffic on a Junos device?", opts: ["Routing Engine", "Packet Forwarding Engine", "mgd"], right: 1, why: "The PFE forwards in hardware using the table the RE compiled; transit traffic never visits the RE." },
  { d: "Junos OS fundamentals", q: "Which daemon maintains the routing protocols and routing table?", opts: ["mgd", "rpd", "dcd"], right: 1, why: "rpd = routing protocol daemon. mgd is the CLI/config; dcd handles interfaces." },
  { d: "Junos OS fundamentals", q: "The routing table and the forwarding table relate how?", opts: ["Same table, two names", "RE builds the routing table, derives the forwarding table, pushes it to the PFE", "PFE builds both"], right: 1, why: "Direction matters and the exam tests it: routing table (RE, all known routes) \u2192 forwarding table (best paths) \u2192 PFE." },
  { d: "Junos OS fundamentals", q: "One Junos trait the exam loves:", opts: ["Different OS per platform family", "One modular OS across routing, switching and security platforms", "GUI-only management"], right: 1, why: "A single Junos with modular daemons runs across EX, MX, SRX \u2014 same CLI, same commit model." },
  { d: "CLI & configuration", q: "You are at [edit interfaces ge-0/0/1]. Which command returns to the very top of the hierarchy?", opts: ["up", "top", "exit configuration-mode"], right: 1, why: "up climbs one level; top jumps to [edit]. exit from the top leaves configuration mode." },
  { d: "CLI & configuration", q: "commit confirmed 5 does what?", opts: ["Commits after a 5-minute delay", "Commits now, auto-rolls back in 5 minutes unless you confirm with another commit", "Commits 5 times"], right: 1, why: "The remote-change lifesaver: if your change cuts you off, the box restores itself in 5 minutes." },
  { d: "CLI & configuration", q: "Which command shows the differences between the candidate and active configuration?", opts: ["show | compare", "show configuration", "compare rollback"], right: 0, why: "show | compare in configuration mode diffs candidate against active \u2014 read it before every commit." },
  { d: "CLI & configuration", q: "rollback 0 does what?", opts: ["Reboots", "Discards candidate edits by reloading the active config into the candidate", "Restores the rescue config"], right: 1, why: "rollback 0 = 'undo my uncommitted edits'. rollback 1 = previous commit; rollback rescue = your saved snapshot." },
  { d: "CLI & configuration", q: "In operational mode, how do you run a configuration command without entering configure?", opts: ["You can't", "Prefix it with run", "It's the reverse: run executes OPERATIONAL commands from configuration mode"], right: 2, why: "run works from config mode outward (run show route). There's no inward equivalent \u2014 a favorite trick question." },
  { d: "CLI & configuration", q: "What does the ? key do at any point in the Junos CLI?", opts: ["Deletes the line", "Context-sensitive help: lists what can come next", "Shows the manual"], right: 1, why: "? lists valid completions at the cursor \u2014 the single most useful key on a Junos box." },
  { d: "Monitoring & maintenance", q: "Before upgrading Junos, best practice is to run...", opts: ["request system reboot", "request system storage cleanup", "rollback 1"], right: 1, why: "Full /var storage is the classic upgrade failure; cleanup rotates logs and removes old bundles first." },
  { d: "Monitoring & maintenance", q: "The rescue configuration is...", opts: ["Automatic backup of every commit", "A known-good snapshot YOU save, restorable with rollback rescue", "The factory default"], right: 1, why: "You choose when to save it (request system configuration rescue save); it doesn't move with commit history." },
  { d: "Monitoring & maintenance", q: "Which login class allows operational actions but no configuration changes?", opts: ["read-only", "operator", "super-user"], right: 1, why: "operator can restart daemons and clear sessions but cannot configure. read-only can only look." },
  { d: "Monitoring & maintenance", q: "Root logs into a Junos device and sees %. To reach the Junos CLI it must...", opts: ["Reboot", "Type cli", "Type configure"], right: 1, why: "Root lands in the shell; cli starts the CLI. Then configure enters configuration mode." },
  { d: "Routing fundamentals", q: "Junos route preference: which wins for the same prefix?", opts: ["OSPF internal (10) over static (5)", "Static (5) over OSPF internal (10)", "BGP (170) over both"], right: 1, why: "Lower preference wins: static 5 beats OSPF 10 beats BGP 170. The reason learned routes 'don't work' while a static lingers." },
  { d: "Routing fundamentals", q: "A route to 0.0.0.0/0 is called...", opts: ["A null route", "The default route", "A martian"], right: 1, why: "The default route: where packets go when nothing more specific matches." },
  { d: "Routing fundamentals", q: "Longest match rule: traffic to 10.1.1.7 with routes 10.0.0.0/8 and 10.1.1.0/24 in the table uses...", opts: ["10.0.0.0/8", "10.1.1.0/24", "Load-balanced"], right: 1, why: "The most specific (longest) prefix always wins, regardless of protocol preference." },
  { d: "Routing fundamentals", q: "What must be true before an OSPF adjacency forms on a broadcast link?", opts: ["Same area and matching hello/dead timers", "Same router-id", "BGP configured"], right: 0, why: "Area mismatch or timer mismatch = no adjacency. Matching router-ids would be an error, not a requirement." },
  { d: "Routing fundamentals", q: "eBGP vs iBGP:", opts: ["eBGP peers between different AS numbers; iBGP within one AS", "eBGP is encrypted", "iBGP uses UDP"], right: 0, why: "The e/i is about AS boundaries. Both ride TCP 179." },
  { d: "Policy & filters", q: "A packet matches no term in an applied firewall filter. Its fate?", opts: ["Accepted", "Discarded by the implicit rule", "Logged"], right: 1, why: "Every filter ends with an invisible discard-everything. Hence the mandatory final accept term for legitimate traffic." },
  { d: "Policy & filters", q: "reject differs from discard how?", opts: ["reject notifies the sender (ICMP prohibited); discard is silent", "reject is faster", "discard notifies the sender"], right: 0, why: "Same drop, different courtesy: reject answers, discard leaves the sender to time out." },
  { d: "Policy & filters", q: "Export policy on a protocol controls...", opts: ["Which routes enter your routing table", "Which routes you advertise to others", "Which packets leave an interface"], right: 1, why: "Export = advertising out; import = accepting in. Packets are firewall-filter business, not policy." },
  { d: "Policy & filters", q: "By default, BGP advertises to a peer...", opts: ["Everything in the routing table", "Only BGP-learned and BGP-originated routes", "Nothing"], right: 1, why: "Your statics and OSPF routes stay home unless an export policy sends them. The 'why isn't my static advertised' classic." },
  { d: "Policy & filters", q: "Filter terms are evaluated...", opts: ["All terms, most specific wins", "Top-down, first match wins", "Random order"], right: 1, why: "Order is everything: a broad accept term above a block term neuters the block." },
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
    // A question belongs to the active track if it is tagged for it, or if its
    // domain exists in this track's domain map (shared fundamentals).
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
    // Only guides that are part of the ACTIVE track contribute questions, so a
    // Network+ sitting never asks Junos-specific material and vice versa.
    var dom = domOf(g.id);
    if(!dom) return;
    g.quiz.forEach(function(q, qi){
      all.push({ id: "g:" + g.id + ":" + qi, d: dom, q: q.q, opts: q.opts, right: q.right, why: q.why });
    });
  });
  return all;
}
function remapDomain(d, doms){
  // Shared questions keep their meaning across tracks; fall back to the first
  // domain so nothing is ever orphaned in a per-domain score breakdown.
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
function examDraw(n, rng){
  rng = rng || Math.random;
  var all = examAllQuestions();
  var wrong = examWrongSet();
  var pool = [];
  all.forEach(function(q){
    var w = wrong.has(q.id) ? 5 : 1;
    for(var i = 0; i < w; i++) pool.push(q);
  });
  var picked = [], used = new Set();
  var guard = 0;
  while(picked.length < Math.min(n, all.length) && guard++ < 5000){
    var q = pool[Math.floor(rng() * pool.length)];
    if(used.has(q.id)) continue;
    used.add(q.id);
    picked.push(q);
  }
  return picked;
}

var MOCK = null;
function startMockExam(){
  modalChoice("Mock exam \u2014 JNCIA format", "Timed, multiple choice, mistakes remembered: questions you miss come back weighted in future exams. Pick a length:", [
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
