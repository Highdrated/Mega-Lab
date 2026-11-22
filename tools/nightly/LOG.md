# Mega Lab nightly log

First line is checked every night: if it reads HOLD, the run changes nothing and stops.

## Deep-check rotation

Top three are next. Tonight's three move to the bottom. Pockle is not in the list (it is checked every night).

1. pyle (needs the CDN, see note)
2. sleeple (needs the CDN, see note)
3. passle (needs the CDN)
4. seqle (needs the CDN)
5. rebble (needs the CDN)
6. meridian (21 Nov; Windows Server module, the time ticket console)
7. hexle (21 Nov; 144 typed drills against their hints and real-world variants)
8. webble (21 Nov, second run; warm-up resume, motion checker messages)
9. syncle (21 Nov, second run; all suites, Memory Corridor screens)
10. git-lab (21 Nov, second run; all 91 mission steps, 40 real-world commands in free flight)
11. modle (21 Nov, third run; 5465 generated puzzles run through real Python, networking hub)
12. opsle (21 Nov, third run; all 18 mission stages checked by hand against real tools, rebuilt)
13. codex (21 Nov, third run; Python, JavaScript, PHP, Git and Shell volumes read line by line)
14. mscodex (21 Nov, fourth run; cmdlet list against the modules, search, read marks, theme, both sizes)
15. junle (21 Nov, fourth run; Virtual Chassis outputs checked against Juniper, room and classic screens)
16. spelle (21 Nov, fourth run; spellbook bar and layout from 360 to 1440 px, first quest)
17. shelle (22 Nov; all scenarios walked with real-world variants)
18. junos-lab (22 Nov; real-mode commit, autosave on close, field-guide timer)
19. proxle (22 Nov; 45 commands in Ready, Create, Join and Backup A)

Note for the rotation: the nightly sandbox cannot reach cdn.jsdelivr.net or Google Fonts. Pyle and Sleeple (pyodide), Passle and Rebble (php-wasm) and Seqle (sql.js) cannot run their code here, so a deep pass on them is limited to reading, layout and whatever works without the runtime. Those labs are skipped until a run can reach the CDN (checked again on 22 Nov: still blocked, 403 from the proxy); the next labs that can run are taken instead.

## Pockle numbers (22 Nov, 390x844, touch)

| Group | Cards | First visit can reach | With sample progress |
|---|---|---|---|
| Juniper Oopsies | 22 (+ live mistakes) | 22 | 22 |
| Junle | 88 (15 added 22 Nov) | 88 | 88 |
| Junos Lab | 155 | 155 | 155 |
| Proxle | 79 (15 added 22 Nov) | 0 | 28 |
| Meridian | 79 (16 added 21 Nov, fourth run) | 0 | 22 |
| Subnle Pocket | 81 (15 added 21 Nov, second run) | 0 | 32 |
| Pyle | 143 | 0 | 29 |
| Pyle Pocket | 694 | 0 | 226 |
| Sleeple | 78 (15 added 21 Nov, second run) | 0 | 30 |
| Passle | 155 | 0 | 40 |
| Seqle | 88 | 0 | 29 |
| Hexle | 110 | 0 | 10 |
| Webble | 116 | 0 | 22 |
| Spelle | 85 | 0 | 20 |
| Rebble | 116 | 0 | 26 |
| Git Lab | 90 (15 added 21 Nov, third run) | 0 | 29 |
| Shelle | 97 (16 added 21 Nov, third run) | 0 | 24 |
| Syncle | 87 (31 added 20 Nov afternoon) | 0 | 11 |
| Modle | 90 | 0 | 30 |

- Total 2453 cards. A first visit on a phone reaches 265, all Juniper; with sample progress in every lab 873 are open. The other 2188 are locked until that lab has progress on the same device, and lab progress lives per device. This is still why it feels empty on the go.
- Due today on a first visit: 0. Today's reviews shows three 5-card warm-ups (15 cards, about three minutes), then nothing new is asked for; Pocket mix and Sprint stay available. After that she runs out of anything but Juniper.
- Python tab: 16 lessons, 1 open on a first visit. Subnetting tab: 16 steps, 1 open. Both tap-only, no typing fields anywhere.
- No blank or dead-end states found. No horizontal scroll. No console errors. Sixteen of nineteen lab rows are greyed out on a first visit; their OPEN button links to the lab.
- Launcher labs with no rehearsal set in Pockle: only the two Codex references. Fewest cards now: Sleeple 78, Meridian 79, Proxle 79, Subnle Pocket 81, Spelle 85, Syncle 87, Junle 88. Spelle already has two or more cards for every one of its 37 quests; Syncle's thinnest units are mailboxes (2), groups and licenses (4 each). Next run: Syncle and Sleeple.
- 22 Nov: Proxle got cards for its thinnest scenarios (Is this server ready, Create, Join, Backup A: log in first, hostname, network before Proxmox, a cluster of one, the fingerprint yes, the shared certificate authority, content backup, HA is not a backup, look at the file). Junle got cards for the drills that had none (show version, show route, exit, description, show vlans, ether-options speed, extensive, router-id, peer-as, advertising-protocol, show ospf neighbor, virtual-address, storage cleanup, monitor traffic, request system snapshot). Junle cards are open on a first visit, so this adds to what she can do on the train today.
- Proxle now has cards for the switch scenario (commit, root password, /32, default VLAN, trunk, MAC table, ssh) and the install basics (certificate warning, local-zfs, BIOS virtualization, ip route, resolv.conf). Meridian now covers Updates, reboots and time (Get-HotFix, RebootPending, the pair restart, the time hierarchy, VMware time sync, w32tm) and more of Roles (Spooler, Manual, WinRM, 3389, SoftwareDistribution, Get-Volume).
- Meridian now has cards for its Basics module too (team and tickets: lines, incident, problem, change, priority; stack and console: layers, maintenance mode, PowerCLI, the ways in, CMDB). They unlock from `meridian.v1` when those lessons are read.
- Already true from her earlier wishes: per-lab Today's reviews, Juniper rehearsals open without lab progress, Juniper Oopsies shown first, recall-first with hidden options, fluency labels (shaky, slow, fluent), one dragon per lab group.
- Git Lab now has a GitHub Desktop unit (15 cards from the eight Desktop tours: empty new repo, the repo list, Publish, switching rewrites the folder, tick boxes are staging, reading the diff, Summary is -m, commit is not push, the four sync button labels, pull first push last, History). It unlocks as soon as one tour is finished. Shelle got 16 cards for steps that had none (ls -1, mv rename, reading -rwxr-xr-x, look before -delete, grep -i, ps aux | grep, ping without -c, nc -z, scp direction, ssh-keygen -C, docker stop, nginx -v, compose ps versus ls, down -v, docker build -t).
- `tools/pockle/test_pockle.py` is flaky (expects a "think first" button on every card kind). `tools/pockle/test.py` is the one to trust; it now also checks that Meridian Basics and the new Syncle units unlock from lab progress.

## Pockle ideas (max five, waiting for her yes or no)

1. Open every lab on the phone. A "try any lab" switch so cards do not wait for lab progress on this device. She would feel: there is always something for the subject I feel like. Size: small.
2. Dragons that grow. XP earned in a lab group feeds that group's dragon through a few stages, shown on the home screen. She would feel: every five minutes on the train makes something bigger. Size: medium (needs art, items go in the ComfyUI queue).
3. A lair instead of a list. A painted roost as the home backdrop with the dragons perched in it, the lab list folded under one button. She would feel: a place to be, not a settings page. Size: medium (backdrop is item 2026-11-19-1 in the queue).
4. Train ride run. One button, five minutes, a clear end, and a small chest of sparks that also counts at the Workshop station. She would feel: a short session that finishes and pays out. Size: small to medium.
5. Bring my progress. When Pockle finds no lab progress on this device, one clear button that explains Send to phone, instead of sixteen greyed-out rows. She would feel: less locked out. Size: small.

## Open findings (listed, not done)

- Push access: the afternoon run of 20 Nov could not push (no repository access for that task). Its commit (`claude/mega-lab-nightly-2026-11-20c.patch`) was re-created on top of main by the evening run of 20 Nov and pushed with it; never re-apply it or any older patch in the project.
- Spelle: after a reload you always land on Lesson 0, quest 1, and choosing a chapter always opens its first quest; "next" only shows after a pass, so reaching quest 3 means redoing 1 and 2. Opening a chapter at its first unsolved quest would save clicks: her call (changes navigation).
- Spelle: the checks want exact names and shapes: `forEach(d => move(d))`, `function dash(d)`, `blocked(direction)`, the counter `i`, `.repeat(n)`, `look("right") === "wall"` in that order, object properties in the quest's order, one `push` per item, `let` (not `const`). Real JavaScript accepts the other forms. Arrays quest 1 done literally (3 moves) ends one tile short; the extra step is only in the hint. Writing Spells 1 wants a `;` after each `stride()` call. Each is a choice about how strict a drill is.
- Shelle: `ssh station` in the sshkey case is still answered "not quite" although the case's own `~/.ssh/config` defines that alias (case engine, not an `alt` list). A GNU-style `sed -i 's/...'` in the restart case gives "(no results)" where a Mac errors ("extra characters at the end of d command"): that error would be the lesson. Solve opens after one command and one of five clues. Mid-scenario position is lost on reload.
- Shelle accuracy, not verified on a Mac so not changed: `ssh` warns "UNPROTECTED PRIVATE KEY FILE" without `-v` too; `ps -p 4312` prints the custom `pid,lstart,command` layout instead of `PID TTY TIME CMD`; `df -h /` on macOS also prints inode columns and `/` is the sealed system volume.
- Shelle: `S.vars` and `k.vars` are written but never read, and the `$x =` pattern is a PowerShell leftover. Dead code, harmless.
- Junos Lab: the predict modal leaves focus in the CLI, so a key typed while it is open lands in the terminal. Small; next Junos pass.
- Junos Lab: 90 of 92 field-guide quiz answers are the middle option and the options are not shuffled (the prep quiz does shuffle), so guessing pays XP. Design choice.
- Junos Lab accuracy, needs a Juniper check before changing: `show spanning-tree interface` never shows a ROOT port (every forwarding port is DESG); `show vlans` uses its own Name/ID layout instead of the ELS Routing instance / VLAN name / Tag / Interfaces layout; `set vlans guest interface ge-0/0/3.0` is refused; the RSTP guide says both "do not assume RSTP is on" and "runs RSTP out of the box"; `vlan-id 4095` gives no range hint.
- Junos Lab: after Resume the tablet shows scenario 1 instead of the one being worked on; at 390 px the tablet covers half the CLI and the toolbar's second row; new hosts spawn on top of each other. `js/course.js` `renderResume` is overridden by the one in `js/prep.js` (dead code).
- Codex Microsoft: the examples use the domain `datacenterunited.com` (15 addresses, 26 mentions) and two full names in addresses, on a public page. Her rule is no real company names and no real colleagues' names. The rest of the page already uses `contoso.com`. Her call, but worth a quick yes.
- Codex Microsoft: search takes the spelling literally: "licence" finds 16 entries, "license" 8. Matching both spellings would be a small search change; her call.
- Proxle: the Create scenario says `pvecm create` makes the cluster's certificate authority. On a real node `pve-root-ca` already exists from the install, and a joining node takes over the cluster's CA. Not verified against pve.proxmox.com yet, so not changed and no Pockle card written for it.
- Junle classic (`junle.html?classic=1`) has no phone layout: at 390 px the terminal text is cut off on the left and the drill panel squeezes it. The launcher opens the room instead. Layout decision.
- Junle: the first wrong answer only says "rejected. retry."; the hint starts at the second miss. Design choice.
- Codex: Python, JavaScript, PHP, Git and Shell volumes now read line by line (21 Nov, third run). Still to read: SQL, the Hexle and Passle rulebooks, Recipes and the Glossary. Small note left alone: Shell says `ssh -v` shows UNPROTECTED PRIVATE KEY FILE, which appears without -v too.
- Git Lab: a mission step wants the exact commit message from the briefing; your own wording commits but the step stays put. `git branch <name>`, `git restore .`, `git restore --staged <file>`, `git merge --no-ff` and options after the ref (`git reset HEAD~1 --soft`) are answered with "unknown command" or a pathspec error although they are real. Adding commands to the simulator is a feature: her call.
- Git Lab: after `git init` the lab always says branch `main`. Real git names the first branch `master` unless `init.defaultBranch` is set or you type `git init -b main`. One line in mission 0 could say so: her call.
- Git Lab: `git add <file>` stages every change, not just that file (the simulator has one staged flag, no per-file index). Real commands still answered "unknown command" in free flight: `git status -s`, `git diff --staged`, `git commit -am`, `git branch -a`, `-v`, `-d`, `git tag`, `git show`, `git stash`, `git rm --cached`, `ls -la`, `git --version`, `git config`, `git help`. `pwd` prints `~/shop` where a real shell prints the full path. Simulator scope: her call.
- Git Lab: `write <file> <text>` and `pr open` are lab-only commands (no real equivalents typed that way). On a phone the console shows only two lines. Detective mode was not played this run.
- Modle: the Web, PHP and C++ buttons can be selected but hold no content yet (only a tooltip says so). The home shows "4 due" on a first visit before anything was practised. The subnet puzzle asks for the "smallest prefix" where it means the longest prefix that still fits.
- Opsle: its bank list lacks proxle, meridian and syncle. No mission needs them yet, so nothing is broken.
- Modle networking: Terminal and Exam open a page that says "Not built yet ... next session's work", while the hub says "5 topics, 1 mastered" and the footer "MASTERED 01 / 05" on a first visit (both are fixed text, not progress). Building them is a feature; changing the fake numbers changes her mock-up. Her call.
- Modle: the "4 due" badge on a first visit counts up to four new puzzles as due (`hud.js`, due + min(4, fresh)). Reads as reviews waiting when nothing was practised; wording choice.
- Opsle: on a first visit all four missions are locked and there is nothing to do on the page.
- Shelle: the prompt always reads `user@mbp ~ %`, also after `cd ~/Projects` and `cd station-site`. A real zsh prompt shows the folder. Fixing it means tracking the folder across steps: engine change, needs her yes.
- Spelle: 22 of 25 example boxes in the brief are wider than the 290 px brief column and scroll sideways, so the first lesson's "name, argument" diagram is cut off. Widening the brief column changes the layout: her decision.
- Webble: 69 emoji of 27 kinds (header buttons, console hints, brief, path cards, easing lab, gym, four lesson texts). She hates emoji; replacing them changes the look, so it waits for her yes.
- Hexle: at 1440 px several labels are cut with an ellipsis ("Target 1 / 43" shows as "TARGE…", plot titles 04, 07, 12, Project VI, the "From memory" button). Fixing it means resizing the bar: look change.
- Hexle: target 1 step 9 "Close every tag" is already green on the starter and on empty input. Two drills show the answer as placeholder text (`function tick() {}`, `function render() {}`). Tourney (flexbox and grid) is open on a first visit, before any CSS is taught. Design choices, her call.
- Webble: between about 760 and 1217 px wide the header runs off the right edge (toolbox, sound and export buttons). The Work screen at phone width is cramped. Both need a layout decision.
- Syncle: the "count" recall accepts a bare `3` (this is the one failing case in `tools/syncle/test.js`). The "connect" recall asks for "without the welcome text" but passes without `-NoWelcome`. Tightening either changes what the drill demands: her call.
- Syncle: several Graph commands take the user as a bare first word (`Update-MgUser x`); the real module wants `-UserId`. Not changed.
- Junle room: the first ticket visitor (Veylin) slides in a second or two after sitting down and covers an app that was just opened (seen with Rehearse and Terminal on a first visit). Not sure it is a bug; the story may want this.
- Junle room: `#wx-mist` is a 400% wide layer that keeps animating at opacity 0. Page scroll is clipped so nothing shows, but it holds a large layer in memory. Not changed (weather design).
- Meridian: event 7040 in the time ticket reads "changed from auto start to auto start"; the real message names two different start types. Story text, left alone.
- Meridian: `backdrop-promenade.webp` and `hero-school.webp` give a 404 on every load; portraits and two more backdrops are missing too. All in the ComfyUI queue (items 2026-11-19-3, 4, 7 to 12).
- Proxle: `ls -l /mnt/pve/backup-a/dump` and `ls -l /etc/pve/nodes` print the short listing; a real `-l` prints permissions, owner, size and date per line. `pveversion --verbose` prints one line (same as `-v`). `uptime`, `df -h` and `free -h` on a node are "not simulated" (honest, but they are the first things an admin types on a new server).
- Proxle, small realism gaps, not changed: `ip -br a` and `ip addr show vmbr0` print the full `ip a` (the real `-br` is a one-line-per-interface table); `vzdump ... --compress zstd` echoes the job line without `--compress zstd`; `ping` without `-c` stops by itself after three replies (a real ping runs until Ctrl+C); `pveversion -v` prints the same single line as `pveversion` (the real one lists every package); `cat /etc/hosts` on the laptop says the file does not exist.
- Pockle bank for Modle holds one Python card (`print("code"[-1])`). Modle has its own Python section, so it was left; say so if Math should stay code-free.
- Repo weight: `labs/img/junle-room/rack-front.png` (4.9 MB), `labs/img/pyle/office-car.png` (1.8 MB) and `labs/img/junle-room/room.png` (1.5 MB) are not referenced by any lab (the labs use the .webp versions). Not deleted; her call.
- `LOOP_LOG.md` and `tools/proxle/LOG.md` still mention old scheduled tasks ("Proxle night loop") that could not be deleted from inside a run. They are disabled; she can delete them by hand.
- Spelle: the four Delve drills have prose hints, not runnable ones; on Delve III the wall follower runs past the 600-step limit without the key. Looks intended for a final challenge; left alone.

## Entries

### 2026-11-22

Checked
- Setup: push access works (dry run accepted); remote set to Highdrated/Mega-Lab. Catch-up already done. LOG first line not HOLD. CDN still blocked (403), so pyle, sleeple, passle, seqle and rebble stay skipped; shelle, junos-lab and proxle taken.
- Pockle: first visit and seeded visit at 390x844 with touch, every tab, no errors, no typing fields, no sideways scroll. Numbers above. `tools/pockle/test.py` ALL OK.
- Quick pass: 29 pages at 1440x900 and 390x844 (58 loads). No page errors, no sideways scroll. Only the two known Meridian 404s, the clipped Junle mist, Google Fonts blocked by the sandbox, and a stray favicon request on Codex.
- Service worker: 12 precache entries exist; 20 launcher paths exist. CACHE now workshop-v101. Junos Lab CACHE junoslab-v54, APP_VERSION 3.30.5.
- Suites (after the fixes): proxle ALL OK (new dump-folder check), pockle test ALL OK, sync and typed clean, opsle clean, junos-lab 6472 passed (7 new), no-emoji clean, soak 8000 clean, syncle test2 to test5, t_teams and t_clock clean, syncle test.js 1 known failure.
- Deep pass: shelle (all scenarios walked step by step by script, then again with 18 real-world variants), junos-lab (real-junos commit and typing during it, autosave on page close, the field-guide timer with the tablet open and closed), proxle (45 commands typed in Is this server ready, Create, Join and Backup A, beyond the walk scripts).

Fixed
- Shelle: "List what is there, one name per line" wanted plain `ls`, which prints columns in a real terminal, and showed the names out of alphabetical order. The step now wants `ls -1`, says why, and lists the names the way a Mac does.
- Shelle: 18 real-world forms now count: `cut -d ' ' -f6` (no space before the number), `df -h`, `lsof -i tcp:8000`, `lsof -nP -i :8000`, `kill %1`, `rsync -anvz` and `--dry-run` at the end, `ping -c4`, `curl --head` (twice), `docker logs --tail=5 web`, `--tail=2 dash`, `docker compose logs --tail=20 app`. Wrong answers still fail (`ping -c 3` checked).
- Junos Lab: in real-junos mode, Enter while a commit is still running ran the next command before "commit complete". Now Enter waits; the typed line stays in the prompt and runs once the commit is done, like a real terminal. New test.
- Junos Lab: a change made less than 0.8 s before closing or reloading the page was lost. A pending autosave is now written when the page closes; nothing is written when no save is pending, so Cancel on "Resume previous lab?" still deletes the save. New test.
- Junos Lab: the field-guide checklist re-ran every prerequisite check every 1.2 s with the tablet closed or the browser tab hidden. It now skips the work while nobody can see it.
- Proxle: `ls /mnt/pve/backup-a/dump` said "No such file or directory", while vzdump had just written its archive there and printed that very path. The mount now lists the backup files with their logs, `ls /mnt/pve/<storage>` shows `dump` or `images` for what the storage allows, and an images-only share still has no dump folder. New check in `tools/proxle/test.py`.
- Pockle: 15 Proxle cards and 15 Junle cards (see Pockle numbers).

Listed
- One art item added to the ComfyUI queue (Proxle Create scene: it reuses the all-lit cluster picture for a cluster of one). 28 open.
- Proxle `ls -l`, `pveversion --verbose`, uptime/df/free; Shelle `ssh station`; Junos Lab predict modal focus: see Open findings.

Needs her decision
- Pockle ideas 1 and 5 (try any lab, bring my progress).
- Codex Microsoft: swap `datacenterunited.com` and the two full names for `contoso.com`, yes or no.

### 2026-11-21, fourth run

Checked
- Setup: push access works (dry run accepted); remote set to Highdrated/Mega-Lab. Catch-up already done. LOG first line not HOLD. CDN still blocked, so pyle, sleeple, passle, seqle and rebble stay skipped; mscodex, junle and spelle taken.
- Pockle: first visit and seeded visit at 390x844 with touch, every tab, no errors, no typing fields, no sideways scroll. Numbers above. `tools/pockle/test.py` ALL OK.
- Quick pass: 25 pages at 1440x900 and 390x844. No page errors, no sideways scroll. Only the two known Meridian 404s and the clipped Junle mist.
- Service worker: 12 precache entries exist; 20 launcher paths exist. CACHE now workshop-v100.
- Suites: proxle ALL OK, pockle test, sync and typed clean, opsle clean, junos-lab 6465 passed, no-emoji clean, soak 8000 clean, syncle test2 to test5, t_teams and t_clock clean, syncle test.js 1 known failure.
- Deep pass: mscodex (86 cmdlets and their parameters read, Get-MessageTraceV2 already current; search, read marks across a reload, theme at both sizes), junle (room and classic screens; the Virtual Chassis role outputs checked against Juniper's primary-role election page), spelle (spellbook bar and panes at ten widths from 360 to 1440 px, first quest with starter and hint).

Fixed
- Spelle, phone and tablet: the spellbook buttons did not wrap, so between 560 and 600 px and below 410 px the cast button ran past the edge, and on a phone every pane was 410 px wide in a 390 px screen. The buttons now wrap under the label and the panes fit the screen. Desktop unchanged.
- Junle: the split-VC scenario and the sample `show virtual-chassis` output showed the second member of a two-member Virtual Chassis as `Linecard`. Juniper's election picks the backup with the same rules as the primary, so with two members the second one is `Backup`. Outputs and the verify task now say backup.
- Pockle: 15 Proxle cards (install: flashing the stick, pulling it before reboot, A and B feeds, the BMC, choosing and fixing the address; switch: Amnesiac, `cli`, `show | compare`, a second address on me0, VLAN tags; `pvecm expected`, storage on a new node, quorum of 5, Backup B) and 16 Meridian cards (hypervisor types, .vswp, ssh to a host, CPU ready, EVC, DRS levels, Move-VM, what HA does not fix, snapshot age, Get-Snapshot, merge timing, Get-Datastore, System log, Level 2, events 4625 and 41).

Listed
- No new art items: Spelle's title screen and both Codex pages are already in the queue, and the Junle room is fully painted. 27 open.
- Codex Microsoft licence or license search, Proxle certificate authority wording: see Open findings.

Needs her decision
- Pockle ideas 1 and 5 (try any lab, bring my progress).

### 2026-11-21, third run

Checked
- Setup: push access works (dry run accepted); remote set to Highdrated/Mega-Lab. Catch-up already done. LOG first line not HOLD. CDN still blocked (403), so pyle, sleeple, passle, seqle and rebble stay skipped; modle, opsle and codex taken instead.
- Pockle: first visit and seeded visit at 390x844 with touch, every tab, no errors, no typing fields, no sideways scroll. Numbers above. `tools/pockle/test.py` ALL OK.
- Quick pass: 25 pages at 1440x900 and 390x844, plus the four Modle networking pages. No page errors, no sideways scroll. Only the two known Meridian 404s.
- Service worker: 12 precache entries exist; 20 launcher paths exist. CACHE now workshop-v99.
- Suites: proxle ALL OK, pockle test, sync and typed clean, opsle clean, junos-lab 6465 passed, no-emoji clean, soak 8000 clean, syncle test2 to test5, t_teams and t_clock clean, syncle test.js 1 known failure.
- Deep pass: modle (5465 generated practice puzzles from all 13 categories evaluated by real Python 3 and compared with the lab's answers: all match; the answer checker; the networking hub and its four pages), opsle (all four missions, 18 stages, every expected output recomputed by hand, git pull and git init -b checked on git 2.43, seeded progress at both sizes), codex (five volumes read line by line, two claims tested on the command line).

Fixed
- Codex Git: `git pull` was said to make a merge commit when both sides committed. Current Git (2.33 and later, tested on 2.43) stops with "Need to specify how to reconcile divergent branches" unless you say `--no-rebase` or `--rebase`. The entry now says so, which also matches what Git Lab teaches.
- Codex Python: "Four spaces, consistently, or Python refuses to run the file" read as if two spaces were an error. Four is the convention; what Python insists on is the same indentation for every line of a block (IndentationError otherwise). Checked with python3.
- Opsle: the built page was out of step with its sources. Rebuilt; before and after give the same lock state for every stage, empty and seeded. Two hints added where a beginner gets stuck: `mkdir -p` for the first step of Ticket triage (plain mkdir fails when ~/megalab/ops does not exist yet), and that `await` needs an async function in a script loaded with defer (Site status board, Fill it with fetch).
- Pockle: 15 Git Lab cards in a new GitHub Desktop unit (unlocks when a Desktop tour is finished) and 16 Shelle cards. Test now also checks that a finished Desktop tour unlocks that unit.

Listed
- One art item added to the ComfyUI queue (Modle networking hub icons, to replace typed symbols). 27 open.
- Modle networking placeholders and fixed "1 mastered" text, the Modle "4 due" badge: see Open findings.

Needs her decision
- Pockle ideas 1 and 5 (try any lab, bring my progress).
- Modle networking: build Terminal and Exam, or hide those two cards until they exist.

### 2026-11-21, second run

Checked
- Setup: push access works (dry run accepted); remote renamed to Highdrated/Mega-Lab. Catch-up already done. LOG first line not HOLD. CDN still blocked (403), so pyle, sleeple, passle, seqle and rebble stay skipped.
- Pockle: first visit and seeded visit at 390x844 with touch, every tab, no errors, no typing fields, no sideways scroll. Numbers above. `tools/pockle/test.py` ALL OK.
- Quick pass: 25 pages at 1440x900 and 390x844. No page errors, no sideways scroll. Only the two known Meridian 404s.
- Service worker: 12 precache entries exist; 20 launcher paths exist. CACHE now workshop-v98.
- Suites: proxle ALL OK, pockle test, sync and typed clean, opsle clean, junos-lab 6465 passed, no-emoji clean, soak 8000 clean, syncle test2 to test5, t_teams and t_clock clean, syncle test.js 1 known failure.
- Deep pass: webble (School, warm-up across a reload, the motion checker with a snapped and a still answer), syncle (screens and every suite; no new findings), git-lab (all 12 missions, 91 steps walked by script after the fix; 40 real-world commands in free flight).

Fixed
- Webble: a finished warm-up started again at 1 / 10 after a reload or when coming back to School. It now opens on "Warm-up done", with "Warm up again" for another round, and the seal sound only plays the first time.
- Webble: a target answered with no transition (the value jumps straight to the end) was told "doesn't change at all". It now says the value sits at the end the whole time and jumps there with no transition.
- Git Lab: `git add a.txt` for a file that does not exist answered "staged: b.txt" and staged the other file. It now gives git's real error, `fatal: pathspec 'a.txt' did not match any files`, and stages nothing. `git add .`, `-A`, existing files and folders work as before.
- Pockle: 15 Sleeple cards (the "common mistakes" from each journey's lessons) and 15 Subnle Pocket cards (masks, block sizes, broadcast, sizing, splitting, a summary, the 10/8 range). Test now also checks that Sleeple and Subnle Pocket progress unlock their units.

Listed
- One art item added to the ComfyUI queue (Webble path step icons, to replace emoji). 26 open.
- Git Lab simulator gaps and per-file staging: see Open findings.
- Syncle Graph `-UserId`: still not verified against Microsoft Learn (search did not settle whether the parameter is positional), left as is.

Needs her decision
- Pockle ideas 1 and 5 (try any lab, bring my progress).
- Git Lab: add the common real commands above to the simulator, yes or no.

### 2026-11-21

Checked
- Setup: push access works (dry run accepted). The afternoon patch of 20 Nov is on main (commit 7ee3a0c); nothing to catch up. LOG first line not HOLD.
- Pockle: first visit and seeded visit at 390x844 with touch, every tab, no errors, no typing fields, no sideways scroll. Numbers above. `tools/pockle/test.py` ALL OK.
- Quick pass: 25 pages at 1440x900 and 390x844. No page errors. Only the two known Meridian 404s and the clipped Junle mist; one stray `/favicon.ico` 404 (the browser asks for it at the server root, not a lab fault).
- Service worker: 12 precache entries exist. CACHE now workshop-v97. 20 launcher paths exist.
- Suites: proxle ALL OK (one new variant), pockle test, sync and typed clean, opsle clean, junos-lab 6465 passed, no-emoji clean, soak 8000 clean, syncle test2 to test5, t_teams and t_clock clean, syncle test.js 1 known failure.
- Deep pass: proxle (three walk scripts green, about 30 real-world commands typed in Is this server ready, Create, Shared storage, A node dies and Backup A), meridian (Windows Server lessons read, time ticket console played with real `w32tm` variants, Tickets, Missions and Journal screens), hexle (144 typed drills checked against their own hints, attribute order and `/>` variants, wrong values still fail).

Fixed
- Proxle: `pvesh` (and `pveum`, `pveam`, `pvenode`, `pveperf`, `pvereport`, `pvesubscription`, `lscpu`, `lspci`) on a node answered "command not found". They exist on every Proxmox node; the lab now says it is a real command it does not imitate, like it does for sixty other commands. New check in `tools/proxle/test.py`.
- Meridian: the time console refused real `w32tm` forms: `w32tm /query /status /verbose`, `w32tm /resync /nowait`, `/stripchart` with its options in another order, and `w32tm /config /update /syncfromflags:domhier`. All four work now.
- Hexle: typed drills refused valid HTML with the attributes in another order (`<img alt="An owl" src="img/owl.png">`) or a self-closing void tag (`<img ... />`, `<meta charset="UTF-8" />`, `<link ... />`). Both are accepted now; `/>` only on void elements, so `<p/>` still fails.
- Pockle: 15 Proxle cards and 14 Meridian cards, from material in those labs.

Listed
- One art item added to the ComfyUI queue (Meridian ticket queue banner). 25 open.
- Proxle `ip -br a`, the vzdump echo, Meridian event 7040 wording: see Open findings.

Needs her decision
- Pockle ideas 1 and 5 (try any lab, bring my progress).
- Spelle: open a chapter at its first unsolved quest, yes or no.
- Codex Microsoft: swap `datacenterunited.com` and the two full names for `contoso.com`, yes or no.

### 2026-11-20, evening run

Checked
- Setup: push access works from this task (dry run accepted). The afternoon patch (Syncle clock, Junle BPDU drill, Codex phone wrap and Ctrl+U, 31 Syncle Pockle cards, two Codex art items) was re-created on top of main and goes out with this run. That catch-up is now done; later runs skip it.
- Pockle: first visit and seeded visit at 390x844, every tab, no errors, no typing fields, no sideways scroll. Numbers above. `tools/pockle/test.py` ALL OK.
- Quick pass: 26 pages at 1440x900 and 390x844 (52 loads). No page errors. Only the two known Meridian 404s, the Junle mist width (clipped), and Junle classic on a phone (listed).
- Service worker: 12 precache entries exist and match index.html. CACHE workshop-v96. Junos Lab CACHE junoslab-v53, APP_VERSION 3.30.4.
- Suites: proxle ALL OK, junos-lab 6465 passed (2 new), no-emoji clean, soak 8000 clean, opsle, pockle test, sync and typed clean, syncle test2 to test5, t_teams and t_clock clean, syncle test.js 1 known failure.
- Deep pass: spelle (about 77 interactions, all 37 quests run with hint, empty input and starter code, about 70 extra answers), shelle (about 80 interactions, five detective cases, Search, Docker, Ship, gym, recall, weak spots, free terminal, 40 real-world variants), junos-lab (about 190 interactions: LACP, RSTP and VLAN Isolation scenarios end to end, three field guides with quiz, abbreviations, run, commit check, rollback, compare, legacy syntax refused correctly).

Fixed
- Spelle: a code comment could tick a check: `move("right", 4); //move("right", steps)` passed "uses the variable". Checks now ignore comments. Every hint still passes, empty and starter code still fail.
- Spelle: Loops quest 2 refused a correct loop that had an `if { }` inside, because the check stopped at the first `}`. It now finds the loop's real closing brace.
- Spelle: Conditions quest 3 ("loop 6 times") ends one tile short of the stairs; the hint quietly added a last step. The quest text now says "then one last step right".
- Shelle: in the "port is already allocated" case, `kill 4312` said "docker run on 8080 works now", but docker run still failed and lsof still showed php. After the kill, lsof is empty and docker run starts the container.
- Shelle: in the restart case, `cat docker-compose.yml` and `grep DB_HOST` still showed `localhost` after the `sed` that changed it to `db`.
- Shelle: the free terminal ignored the real-world equivalents (`ls -al`, `docker logs -n 5 web` printed nothing). The case intro said "answer like the real tenant, other known cmdlets" (pasted from Syncle); it now says a real Mac and commands.
- Junos Lab: after a reload or an Undo, an EX4300's uplink ports (xe-0/1/0 and so on) came back as ge-0/0/48 to 51, so cables on them broke. They keep their names now (new test).
- Junos Lab: pressing Esc on the front door also closed the hidden "Resume previous lab?" question and deleted the autosave. Esc now keeps the save; only Cancel deletes it.
- Junos Lab: `show interfaces terse ge-0/0/0` was a syntax error; real Junos takes it, like `show interfaces ge-0/0/0 terse`. Both work now (new test).
- Junos Lab: a field-guide quiz kept saying "Not quite" after you then picked the right answer. Every pick updates the text now. Modal Esc listeners no longer pile up when a modal is closed with a button.
- Pockle: 17 Meridian cards for the Basics module (team and tickets, stack and console), two new units. Test extended.

Listed
- One art item added to the ComfyUI queue (Junos Lab front door), plus the two Codex items from the afternoon patch. 24 open.
- New open findings for Spelle, Shelle and Junos Lab above.

Needs her decision
- Pockle ideas 1 and 5 (or 1 and 2).
- Spelle: open a chapter at its first unsolved quest, yes or no.
- Codex Microsoft: swap `datacenterunited.com` and the two full names for `contoso.com`, yes or no.

### 2026-11-20, afternoon run

- Could not push (no repository access for that task); its commit was saved as a patch and pushed by the evening run. Fixed: Syncle file-listing drills failed when typed in a later minute than the ticket opened (file dates now hang on the lab's frozen clock, new test `t_clock.js`); Junle BPDU drill now wants `clear error bpdu interface ge-0/0/47` (ELS); Codex and Codex Microsoft recipes wrap on a phone; Codex Ctrl+U says zsh wipes the whole line, bash only before the cursor; 31 Syncle Pockle cards (scripts, real-world Graph, Teams). Checked and right: `show system rollback 1 compare 0`, speed under `ether-options` on EX4300. Deep pass: codex, mscodex, junle classic.

### 2026-11-20, midday (by hand, daytime session)

- The four unpushed runs (19 Nov night and evening, 20 Nov night and morning) were applied on top of main and pushed: Git Lab, Hexle, Meridian, Opsle, Shelle, Spelle, Webble and Syncle fixes, Pockle banks for Proxle, Meridian and Syncle, `tools/pockle/test.py`, this log, the ComfyUI queue and the CLAUDE.md section. sw.js CACHE workshop-v95.
- Same session, already on main before this: Syncle sequence 11 (Teams, MicrosoftTeams module, 5 memories, 31 drills, capstone "Spring clean"), `$null.Count` is 0, feedback for a clean but wrong practice run, flow band fits at 390 px. The two Syncle findings about the flow band and practice feedback are fixed.

### 2026-11-20, morning run

Checked
- No push access again; remote main is still 1c7a52d. The earlier nights were rebuilt on top of it (see the push note above), together with this run's work.
- Pockle: first visit and seeded visit at 390x844, no errors, no typing fields, no sideways scroll. `tools/pockle/test.py` ALL OK.
- Quick pass: 26 pages at both sizes. No page errors. Only the two known Meridian 404s, the Junle mist width, and CDN or font requests the sandbox cannot reach.
- Service worker: 12 precache entries exist and match the `?v=` numbers in index.html; 20 launcher paths exist.
- Suites: proxle ALL OK, junos-lab 6463 passed, no-emoji clean, soak 8000 clean, opsle, pockle test, sync and typed clean, syncle test2 to test5 clean, syncle test.js 1 known failure.
- Deep pass: git-lab (all 12 missions, 91 steps, played to the end; 25 real-world variants tried at the step where they belong), modle (5850 generated puzzles across 13 categories and 3 difficulties, 5469 of them run in real Python with zero wrong answers, the other 381 read by sample; every screen opened, wrong and empty answers tried), opsle (all 4 missions and 18 stages read and the expected results recalculated by hand).

Fixed
- Git Lab: `cd Desktop/`, `cd ../` and `cd ~/Desktop` answered "no such folder". A trailing slash is what Tab completion gives you in a real shell. Paths with a slash now work.
- Git Lab: mission steps refused correct equivalents the simulator already ran: `git switch -c` and `git switch` for checkout, `git add -A` and `git add --all`, `git restore --staged .`, `git checkout -- file`. They now move the mission on.
- Git Lab: `git reset HEAD`, `git reset --soft HEAD^` and `git push --set-upstream origin main` were refused as unsupported; all three are real and now work like their twins.
- Opsle: the onboarding mission said "run git init" and later expected a branch called `main`. On a Mac without that setting the branch is `master`. The step now says `git init -b main`.
- Opsle source: `tools/missions/ops_missions.json` said "row 8" where the built page already said "line 8"; brought in line.
- Pockle: 30 Syncle cards for safe bulk changes, investigating and incident response, all from material in the lab.

Listed
- Three art items added to the ComfyUI queue (Git Lab, Opsle, Modle). 21 open in total.
- New open findings for Git Lab, Modle and Opsle above.

Needs her decision
- Pockle ideas 1 and 2.
- Rebuild Opsle from its sources, yes or no.
- Git Lab: add `git branch <name>` and `git restore .` to the simulator, and a line about `master` versus `main`.

### 2026-11-20

Checked
- Pockle: first visit and seeded visit at 390x844, no errors, no typing fields, no sideways scroll. `tools/pockle/test.py` ALL OK.
- Quick pass: 30 pages at both sizes. Only the two known Meridian 404s. (Junle reports a wide scrollWidth from the clipped mist layer, already listed.)
- Service worker: 12 precache entries exist; 20 launcher paths exist.
- Suites: proxle ALL OK, junos-lab 6463 passed, no-emoji clean, soak 8000 clean, opsle, pockle sync and typed clean, syncle test2 to test5 clean, syncle test.js 1 failure that was there before (see Open findings).
- Deep pass: hexle (3 lessons, 9 drills, target 1 to 100%, all 43 targets by script, 218 drills self-tested, 88 rule notes read), webble (10 warm-ups, 8 targets, gym, cheat sheet, themes), syncle (memory 1 through every mode, practice, 59 command variants in node; sequences 2 to 9 only through the existing tests).

Fixed
- Hexle: drills refused single-quoted attributes (`<a href='x'>`) and `border: solid 2px teal`; both are valid and now pass. Wrong answers still fail.
- Hexle: placeholder text with quotes in it was cut off (`<div class=`).
- Hexle, phone: Check button sat off-screen, Skills map ran off-screen, Grimoire stayed three narrow columns. All three now fit.
- Webble: pressing Check within 0.8 s of typing made a correct answer wait 9 s and then fail with "Infinite loop?".
- Webble: a pattern drill accepted `'translateX(${x}px)'` in plain quotes, which does not work in real life.
- Webble: Home and Gym squeezed into the top third under 1180 px; cheat sheet scrolled sideways.
- Webble: the easing-lab loop and the two preview frames kept animating behind other screens.
- Syncle: solving a practice ticket and pressing Next within 1.4 s skipped a ticket; going Home still advanced it in the background.
- Syncle: `Get-Member -Type` is accepted (real alias of `-MemberType`).
- Pockle: 16 Proxle cards and 14 Meridian cards, all from material in those labs.

Listed
- Six art items added to the ComfyUI queue (Hexle 3, Webble 3).
- New open findings for Hexle, Webble and Syncle above.

Needs her decision
- Pockle ideas 1 and 2.
- Webble emoji (69 of them).
- Syncle: should the "count" and "connect" drills demand the full command.

### 2026-11-19, evening run (started by hand)

Checked
- Pockle: rebuilt, `tools/pockle/test.py` ALL OK with 19 banks.
- Deep pass: junos-lab (fresh start, lesson 1 from the start card, desktop and phone, no overflow, no errors), meridian (all 12 pages of module 0 read through at both sizes, progress saves, Tickets, Missions and Journal tabs), proxle ("Is this server ready?" played with right, alternative and wrong commands; host key prompt, password, errors and hints behave like the real thing).
- Pyle and Sleeple stay on top of the rotation: they need the CDN this sandbox cannot reach.

Fixed
- Meridian: on a phone the lesson footer pushed "Mark read and go to tickets" off the right edge (cut at "Mark re"). The footer now wraps under 820 px. Desktop unchanged.
- Pockle: new Meridian bank (18 cards: hypervisors, vMotion, DRS, HA, snapshots, thin disks, roles and services, event IDs, time). Unlocks per lesson from `meridian.v1`.
- Pockle: Syncle bank grows from 13 to 26 cards (groups and lists, licenses, reports).

Listed
- Six Meridian art items added to the ComfyUI queue (four crew portraits, two theme backdrops).
- Proxle realism gaps and the Modle Python card, see Open findings.

### 2026-11-19 (first night)

Checked
- Quick pass: 31 pages at 1440x900 and 390x844. No page errors. Only failures: the two Meridian images above, and CDN or font requests the sandbox cannot reach (not a lab fault).
- Launcher: all 20 config paths exist. Not in the launcher by design: dockle (redirect to Sleeple), junle.html, pyle-pocket and subnle-pocket (inside Pockle).
- Service worker: all 12 precache entries exist and match the `?v=` numbers in index.html.
- Suites: proxle ALL OK, junos-lab 6463 passed, no-emoji clean, soak 8000 clean, opsle, pockle sync and typed tests clean.
- Deep pass: junle (room, briefing, every desktop app opened; the ticket itself was not played to the end), spelle (all 37 drills checked by machine: every runnable hint passes its own checks, no empty or starter code passes), shelle (first scenarios played, modes, theme, save and load, weak-spot review, a detective case).

Fixed
- Pockle: new Proxle bank (18 cards, 10 scenarios) and Syncle bank (13 cards: connect, users, mailboxes). Unlock rules read `pvelab.done` and `syncle.v1`.
- Pockle: `tools/pockle/test.py` added.
- Shelle: 25 steps now accept the real-world equivalents (`ls -al`, `head -5`, `tail -3`, `cd ../`, unquoted or single-quoted grep patterns, `cp -R`, `docker logs -n 5`, `nc -vz`, `dig +short name`, `rsync -avzn`, `http://localhost...`). Uses the lab's own `alt` list; nothing was loosened for wrong answers.
- Spelle: checks accept backtick strings (``move(`right`)``) next to single and double quotes.
- Spelle: the two emoji on the header buttons are now the words "map" and "save".
