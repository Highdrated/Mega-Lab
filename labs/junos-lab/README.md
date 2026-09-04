# JunOS Lab

A browser-based, Packet-Tracer-style network lab for practicing real JunOS.
No build step, no dependencies — open `index.html` in a browser.

## Layout

| Path | What lives there |
|---|---|
| `index.html` | Markup + script includes (classic scripts, load order matters) |
| `css/style.css` | All styling |
| `js/core.js` | Global state, IP math, device factories, the config-tree engine (set/delete/render/diff) |
| `js/grammar.js` | Placeholder types, the command trie (parsing, `?` completions, abbreviation, backtracking), switch/router config grammars |
| `js/cli.js` | Command execution: operational + configuration modes, commit / commit confirmed / rollback, host & ISP shells |
| `js/engine.js` | The network itself: derived config state, LACP bundle folding, RSTP/storm computation, VLAN-aware L2 reachability, routing, firewall filters, two-way ping/traceroute, MAC/ARP learning, operational `show` commands |
| `js/ui.js` | SVG rendering, pan/zoom, cabling, modals, save/load (+v1 migration), autosave, tabbed CLI with `?`/Tab/history, packet animation |
| `js/tutorials.js` | The Learn tab: hand-held interactive lessons — each step explains itself and watches the live lab to detect completion |
| `js/scenarios.js` | The 27 scenarios, the fault-injection ticket generator, exam mode, progress persistence, boot |
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
- Live-checked **scenarios** (27), a fault-injection **ticket generator** (8
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
- **Cable management**: drawable **trays** (ceiling basket / wall trunking /
  underfloor duct) auto-route nearby cables along their spine — bundled with a
  count, measured with the real up-and-down drops per end, chained around
  corners, checked for overfill by the DRC, and priced per metre on the BOM.
  **Desks** seat PCs in a snapped row and label their runs as outlets in the
  cabling schedule. In-rack DACs stay in the rack.
- **Physical realism**: the canvas is a floor plan (1 px = 0.25 m, scale bar
  bottom-left) — copper runs over 100 m fail the DRC; racks snap gear into
  their rails at full width; servers, switches and CRACs heat their buildings;
  a **UPS** carries a building's infrastructure through grid-outage drills
  (the building header's `grid` button) if you sized it right. Link **speeds** with
  per-switch oversubscription checks, design **snapshots** with plan-A/plan-B
  diffing, and one-click **diagram export** (SVG/PNG).
- **VRRP**: two switches share one virtual gateway; mastership is elected by
  priority, failover is live (scenario 27 has you kill the master mid-ping).
- **Learning layer**: a Learn tab with 13 hand-held tutorials (each step
  auto-detects completion against the live lab) ending in a graded project;
  a **drill mode** with flashcards generated from the command grammar; a notes
  system (highlight anything, pin stickies to the canvas); a traffic ledger
  with a hover **probe** mode, real `show interfaces` **counters** and
  `monitor interface`; an **event timeline** strip of every log line across
  the lab; a **packet inspector** that steps through the last ping hop by hop
  (MACs, IPs, NAT rewrites); named **lab slots**; and JUNO answers for PoE,
  VRRP, BGP, power and traffic. Plus `commit comment` + `show system commit`,
  `rollback rescue`, and DHCP static reservations.
- Two themes (Orbital, Terminal); no emoji anywhere, by decree.
