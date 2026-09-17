# JunOS Lab

A browser-based, Packet-Tracer-style network lab for practicing real JunOS.
No build step, no dependencies — open `index.html` in a browser.

## Layout

| Path | What lives there |
|---|---|
| `index.html` | Markup + script includes (classic scripts, load order matters) |
| `css/style.css` | All styling |
| `tests/soak.js` | Long-run fuzz test: `node tests/soak.js 30000` hammers random commands, cabling and deletions to hunt freezes and slow paths |
| `js/sound.js` | Synthesized sound effects (Web Audio, no files): ticks, plugs, drops, commit chime, objective dings, fanfare, sound on/off toggle |
| `js/rank.js` | Rank/XP progression — career ladder (Trainee NOC Technician → Datacenter Chief Architect), fed by tickets, contracts, quiz mastery, and mock exams |
| `js/course.js` | Dual certification tracks (JNCIA-Junos and CompTIA Network+) with switchable paths, quiz-mastery tracking, next-up cards, 15-minute sessions |
| `js/course.js` | JNCIA learning path, quiz-mastery tracking, next-up cards, the 15-minute session ritual |
| `js/mockexam.js` | Timed mock exam engine — weighted toward past mistakes, per-domain scoring |
| `tests/no-emoji.js` | Standalone CI guard: fails the build if pictographic emoji creep into any learning material |
| `js/protocols.js` | The Protocols tab: field guides (problem / how / live prereqs / config / numbers / verify / breaks / ELS notes / 30-second answer / quiz), per-protocol canvas animations, prereq-hover device glow, jump-to-scenario |
| `js/core.js` | Global state, IP math, device factories, the config-tree engine (set/delete/render/diff) |
| `js/grammar.js` | Placeholder types, the command trie (parsing, `?` completions, abbreviation, backtracking), switch/router config grammars |
| `js/cli.js` | Command execution: operational + configuration modes, commit / commit confirmed / rollback, host & ISP shells |
| `js/engine.js` | The network itself: derived config state, LACP bundle folding, RSTP/storm computation, VLAN-aware L2 reachability, routing, firewall filters, two-way ping/traceroute, MAC/ARP learning, operational `show` commands |
| `js/ui.js` | SVG rendering, pan/zoom, cabling, modals, save/load (+v1 migration), autosave, tabbed CLI with `?`/Tab/history, packet animation |
| `js/scenarios.js` | The 26 scenarios, the fault-injection ticket generator, exam mode, progress persistence, boot |
| `js/planner.js` | Pre-build tooling: buildings/zones, bill of materials (Belgian prices), design rule check, failure-impact heatmap, reachability matrix, rack elevations, build packet |
| `tests/` | Headless test suite: `node tests/run.js` (DOM shim + end-to-end assertions through the real CLI and engine) |
| `juniper-lab.html` | Redirect stub (the app's old single-file home) |
| `juniper-lab-v1-backup.html` | Frozen pre-rewrite version |

## Conventions

- **No bundler, no npm deps.** Classic `<script src>` tags in dependency order —
  ES modules are deliberately avoided so `file://` double-click keeps working.
- **CLI fidelity first.** Command syntax matches real JunOS (ELS) as closely as
  reasonable: `configure`/`commit`/`rollback`, candidate vs. committed config,
  `show | compare`, context-sensitive `?`, unique-prefix abbreviation,
  `unit 0 family ethernet-switching`, implicit filter discard, etc.
  Muscle memory here should transfer to a real EX switch.
- **Every mechanic is computed, never faked.** Reachability = VLAN-aware L2
  flood + real route lookups + filters + the return path. Scenario checks
  evaluate live against actual state.
- **Every new feature ships as a triad:** the mechanic, a visual cue on the
  canvas, and a scenario that exercises it.
- **Run the tests** after engine or grammar changes: `node tests/run.js`.

## Notable features

- Tabbed JunOS CLIs with `?` completions, abbreviation, history, an **assist**
  ghost-suggestion (ArrowRight accepts), and `load set terminal` paste-import.
- The full protocol set: VLANs/trunks/irb, static routing, **OSPF**, **eBGP**
  to the ISP (sessions genuinely negotiate: AS mismatch sits in Active, and the
  learned default leaves when the session dies), firewall filters, **source
  NAT** (the internet genuinely refuses private sources), **DHCP** (pools +
  dhclient), LACP, RSTP, storm control, **port security**, **LLDP**
  (`show lldp neighbors`), and a per-device syslog (`show log messages`).
- **Operations layer**: manage boxes over the network itself — hosts `ssh` into
  any switch with `system services ssh` committed (lock yourself out and the
  session really drops mid-commit), and switches stream their logs to a server
  running the syslog service (`set system syslog host ... any any`).
- **Servers**: rack-mount boxes that run real services — a DNS zone you edit
  (`dns add`), an HTTP listener, and clients with `nameserver`/`nslookup`/`curl`,
  so traffic can be followed from name lookup to 200 OK (or told apart from
  connection-refused).
- Live-checked **scenarios** (26), a fault-injection **ticket generator** (8
  fault types), and a **contract mode** that generates office-build briefs at
  three tiers.
- Visual-learner layer: VLAN color view with legend, IP label view, capability
  tags on devices, packet/DHCP-handshake animation, NAT translation tags, and
  failure callouts at the exact point a ping died.
- **Reference**: searchable pop-up-book library — concept cards plus every
  command, generated from the grammar so it cannot drift out of date.
- Touch/pen ready: pointer events, pinch-zoom, oversized port hit targets,
  tap-a-port info popovers. Canvas **undo** (Ctrl+Z).
- Pre-build planning: **buildings** as wall-styled canvas zones (drag to move
  contents, per-building rack elevations), a **Validate** design-rule check,
  a failure **Impact** heatmap plus what-if device/cable failures, a live
  **reachability Matrix**, and a **Build Packet** export — BOM with indicative
  Belgian pricing (21% VAT), cabling schedule, IP plan, and every config.
- **Wi-Fi**: Mist and UniFi access points with real coverage circles — hosts
  `wifi scan` / `wifi join`, and DHCP works over the air. APs are powered by
  **PoE**: real per-model switch budgets (`show poe interface`), allocation in
  port order, and dark APs that genuinely stop beaconing (fix: P-model switch
  or an FS.com injector).
- **Physical realism**: the canvas is a floor plan (1 px = 0.25 m, scale bar
  bottom-left) — copper runs over 100 m fail the DRC; racks snap gear into
  their rails at full width; servers, switches and CRACs heat their buildings;
  a **UPS** carries a building's infrastructure through grid-outage drills
  (the building header's `grid` button) if you sized it right. Link **speeds** with
  per-switch oversubscription checks, design **snapshots** with plan-A/plan-B
  diffing, and one-click **diagram export** (SVG/PNG).
- Two themes (Orbital, Terminal); no emoji anywhere, by decree.
