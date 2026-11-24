# Mega Lab nightly log

First line is checked every night: if it reads HOLD, the run changes nothing and stops.

## Deep-check rotation

Top three are next. Tonight's three move to the bottom. Pockle is not in the list (it is checked every night).

1. pyle (needs the CDN, see note)
2. sleeple (needs the CDN, see note)
3. passle (needs the CDN)
4. seqle (needs the CDN)
5. rebble (needs the CDN)
6. proxle (23 Nov, second run; 11 first-things-an-admin-types commands on a fresh node)
7. meridian (23 Nov, second run; every tab at both sizes, overflow scan)
8. hexle (23 Nov, third run; readability of every lesson text, all tabs clicked at both sizes)
9. webble (23 Nov, third run; readability of briefs and lessons, home and School at both sizes)
10. syncle (23 Nov, third run; readability of stories, blurbs and tasks; every suite after the rebuild)
11. git-lab (23 Nov, fourth run; guided missions M-00 to M-07 autoplayed, revert check, briefing texts read)
12. modle (23 Nov, fourth run; Learn pages read for long sentences, ceil page checked)
13. opsle (23 Nov, fourth run; every mission story, step and expected result checked against the steps)
14. codex (24 Nov, fifth run; Hexle and Passle rulebooks read line by line, search checked at both sizes)
15. mscodex (24 Nov, fifth run; long explanations read and split, search at both sizes)
16. junle (24 Nov, sixth run; field guides and recaps read, Virtual Chassis facts checked against Juniper)
17. spelle (24 Nov, sixth run; learner texts read, nothing over 20 words left)
18. shelle (24 Nov, third run; lessons and tasks read and split, weak-spots label checked)
19. junos-lab (24 Nov, third run; long lesson, ticket and quiz explanations split)

Note for the rotation: the nightly sandbox cannot reach cdn.jsdelivr.net or Google Fonts. Pyle and Sleeple (pyodide), Passle and Rebble (php-wasm) and Seqle (sql.js) cannot run their code here, so a deep pass on them is limited to reading, layout and whatever works without the runtime. Those labs are skipped until a run can reach the CDN (checked again on 23 Nov, fourth run: still blocked, 403); the next labs that can run are taken instead.

## Pockle numbers (24 Nov, second run, 390x844, touch)

| Group | Cards | First visit can reach | With sample progress |
|---|---|---|---|
| Juniper Oopsies | 22 (+ live mistakes) | 22 | 22 |
| Junle | 112 (9 added 24 Nov) | 112 | 112 |
| Junos Lab | 155 | 155 | 155 |
| Proxle | 86 (7 added 23 Nov) | 0 | 31 |
| Meridian | 109 (15 added 23 Nov, third run) | 0 | 33 |
| Subnle Pocket | 106 (10 added 23 Nov, fourth run) | 0 | 38 |
| Pyle | 143 | 0 | 29 |
| Pyle Pocket | 694 | 0 | 226 |
| Sleeple | 106 (7 added 24 Nov) | 0 | 36 |
| Passle | 155 | 0 | 40 |
| Seqle | 105 (17 added 22 Nov, third run) | 0 | 36 |
| Hexle | 124 (14 harbour cards added 23 Nov) | 0 | 10 |
| Webble | 116 | 0 | 22 |
| Spelle | 109 (9 added 24 Nov) | 0 | 24 |
| Rebble | 116 | 0 | 26 |
| Git Lab | 115 (10 added 24 Nov, second run) | 0 | 33 |
| Shelle | 108 (11 added 23 Nov, fourth run) | 0 | 24 |
| Syncle | 126 (20 added 24 Nov, second run) | 0 | 11 |
| Modle | 106 (16 added 23 Nov, second run) | 0 | 33 |

- Total 2713 cards. A first visit on a phone reaches 289, all Juniper; with sample progress in every lab 960 are open (671 from 16 labs plus 289 Juniper; Today's reviews 0/19). The other cards stay locked until that lab has progress on the same device, and lab progress lives per device. This is still why it feels empty on the go.
- Due today on a first visit: 0. Today's reviews shows three 5-card warm-ups (15 cards, about three minutes), then nothing new is asked for; Pocket mix and Sprint stay available. After that she runs out of anything but Juniper.
- Python tab: 16 lessons, 1 open on a first visit. Subnetting tab: 16 steps, 1 open. Both tap-only, no typing fields anywhere.
- No blank or dead-end states found. No horizontal scroll. No console errors. Sixteen of nineteen lab rows are greyed out on a first visit; their OPEN button links to the lab.
- Launcher labs with no rehearsal set in Pockle: only the two Codex references. Fewest cards now: Proxle 86, Sleeple 106, Modle 106, Seqle 105, Shelle 108. Next run: Sleeple and Modle; Proxle's thin units (add, bkb, dies have 4 cards each) can be filled without touching the CA question.
- 24 Nov, second run: Syncle got 20 cards for its three thinnest units (connect: Get-Member and -MemberType Property, Exchange needs its own sign-in, -ShowBanner:$false, -ResultSize, Disconnect-ExchangeOnline -Confirm:$false, compare a bool with $false not 'false'; users: quotes around a title with spaces, 403 needs a write scope, no output after Update-MgUser is normal, a 0 count often means a typo, a filter value without single quotes is a 400, ne needs -ConsistencyLevel eventual; reports: sorting on a property you did not ask for, System.Object[] in a CSV, Export-Csv overwrites, .Group, Measure-Object -Sum, the e in a calculated column, AuditLog.Read.All for SignInActivity). Git Lab got 10 (ls, git init makes no commit, undo a wrong git init by deleting .git, .gitignore does not untrack a committed file, build/, # is a comment, the >>>>>>> line, git merge --abort, behind by 1 means pull, pull refuses to overwrite unsaved edits). Five long card explanations split (Meridian 3, Syncle 1, Proxle 1).
- 24 Nov: Junle got 9 cards for its two thinnest drills (Virtual Chassis: both ends must be VC ports, default priority 128, no-split-detection for a pair, master/backup/linecard, one device to manage; Layer 2 security: rogue DHCP is stopped by snooping, a trust group with no interface trusts nothing, show dhcp-security binding, a full MAC table floods like a hub). They are open on a first visit. Spelle got 9 (the if branch when it IS a wall, an if with no else, "wall" === "Wall", steps = steps + 1, adding a property, hp + 5, reassigning a const is a TypeError, a line in the outer loop only, "ab".repeat(2)); every snippet run in node. Sleeple got 7 for Berth supplies and Guest welcome (len in an f-string, print with a comma, append adds one, any loop name works, the greet f-string, bag_fee returns 36, multiplying in any order); every snippet run in python3. The default priority was checked against Juniper's docs.
- 23 Nov, fourth run: Shelle got 11 cards (the PID after &, kill %1, irdmi is port 8000's name, ps -p for a port owner, why sudo cannot run a file without x, 100644 versus 100755, dangling <none> images, chmod 700 on ~/.ssh, compose logs for a restarting service, when ports: is needed, sort -h after du). Subnle Pocket got 10 for its two thinnest units (summaries for 16 networks, 6 and 7, why 5 and 6 cannot be one /23, what a /22 covers, /24s in a /21; the end of 172.16/12, 100.100 is CGNAT, /30 and /20 wildcards, link-local is not forwarded). Every subnet answer checked with Python's ipaddress. Spelle already has two or more cards for every one of its 37 quests. Syncle's mailboxes, groups and licenses units now have 13, 8 and 8 cards.
- 23 Nov, third run: Git Lab got 15 cards for its thinnest missions (git add . for two files, untracked, git switch -c and git switch, fast-forward and where both branches point, push, the (fetch) and (push) lines of git remote -v, the team loop order, who merges the PR, checkout -b, why push before a PR, origin after a clone, the classic slip after a clone, git push from a clone). Meridian got 15 (7036, 7000, the Security log, -MaxEvents versus -Newest, Level 3, the first error, no answer below Windows, Get-HotFix sorted, who owns the middle layers, first line, scope sets priority, maintenance mode, the pipe, Tab, rollback plan for Set- and Start-). Four card explanations rewritten to read easier (Junos Lab golden.conf, Spelle if, Sleeple print versus return, Seqle aggregates).
- 23 Nov, second run: Sleeple got 12 cards for its three thinnest journeys (Print is a NameError, the mismatched quote, print("") is an empty line, range(2, 5), range(1, 9) runs 8 times, the running total printed once, range(1, 1) is empty, len of a dict, items() pairs, unpacking without items() is a ValueError, += on a dict value, Tea is not tea). Modle got 16 maths cards for its six thinnest units (1 bits in 13, binary add, << doubles, adding exponents, digits in 10 ** 6, 4 ** 3, .count(), median, sum of a slice, average with //, grid steps, row and column, wrap off the left edge, len - 1, arr[1] + arr[-1], range counting down). Every snippet run in python3.
- 23 Nov: Spelle got 15 cards (a quoted "5" and "north" misfire, let can be re-filled, i += 1, i <= 7 runs eight times, a missing ; still calls, path[3] is undefined, the last item with length - 1, an unset property, const with push, one-parameter arrows, a d6 roll, "3" + 4, the U-turn index, 2 x 5 grabs; every snippet run in node). Proxle got 7 (pvesm status, /etc/pve/nodes, /etc/pve is the cluster file system, openssl -issuer, qm stop pulls the plug, migrate a running VM needs --online, corosync.conf in /etc/pve), all from commands the lab already has.
- 22 Nov, fourth run: Junle got 15 cards for drills that had none (chassis device-count before any ae, delete unit 0 on a member, lacp periodic fast, minimum-links, Defaulted in show lacp interfaces, show poe interface, show arp interface, ping count, backup root 8192, rstp cost, bpdu-block disable-timeout, show spanning-tree bridge, OSPF reference-bandwidth, show ospf interface, clear ospf neighbor); they are open on a first visit. Meridian got 15 cards from the Virtualization lessons (Type 2 hypervisor, vmware.log, local disk ties a VM to a host, overcommit, swapping, losing vcsa-01, Get-Cluster, Storage vMotion, affinity, HA takes minutes, N+1 for three hosts, revert throws the delta away, snapshot names, thick disks, esxcli storage filesystem list).
- 22 Nov, third run: Subnle Pocket got 15 cards (172 and 252 in binary, /29 and /20 masks, blocks for .100/28 and /21, broadcast and network for /25 and /28, last host of a /22, 1000 hosts, /16 into /24s, subnet #4 of /27s, a /22 summary, 172.32 is public, the /28 wildcard; every answer checked with Python's ipaddress). Seqle got 17 cards from its own lesson mistakes (FROM missing, no such column, text without quotes, double quotes are names, two-column ORDER BY, brackets with AND and OR, calculations change nothing, WHERE before GROUP BY, a plain JOIN drops rows, = NULL finds nothing, LIKE 'Moon%', DELETE without WHERE, 1 values for 2 columns, || adds no space, brackets around a subquery, COUNT(*) after LEFT JOIN, ORDER BY only at the end; every one run in SQLite).
- 22 Nov, second run: Syncle got cards for mailboxes (ResultSize Unlimited, -Properties for forwarding, FullAccess, Send As is a recipient permission with -Trustee, the confirmation prompt, clearing forwarding with $null, AutoReplyState, the 50 GB shared limit, @{add=...} for aliases, SMTP versus smtp), groups (already a member, AdditionalProperties.displayName, Get-MgUserMemberOf, the write scope) and licenses (free seats, -RemoveLicenses @(), SPE_E3, restore by Id). Sleeple got cards for print with commas, f-string maths, a missing f, the first true elif, !=, the missing colon, not in, append, and a missing argument; every Python output was checked with python3.
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
- Spelle: the checks want exact names and shapes: `forEach(d => move(d))`, `function dash(d)`, `blocked(direction)`, the counter name `i`, `.repeat(n)`, `look("right") === "wall"` in that order, object properties in the quest's order, one `push` per item, `let` (not `const`). Real JavaScript accepts the other forms. Arrays quest 1 done literally (3 moves) ends one tile short; the extra step is only in the hint. (The `;` after `stride()` and `i += 1` in the first for loop were fixed on 23 Nov.) Each is a choice about how strict a drill is.
- Shelle: `ssh station` in the sshkey case is still answered "not quite" although the case's own `~/.ssh/config` defines that alias (case engine, not an `alt` list). A GNU-style `sed -i 's/...'` in the restart case gives "(no results)" where a Mac errors ("extra characters at the end of d command"): that error would be the lesson. Solve opens after one command and one of five clues. Mid-scenario position is lost on reload.
- Shelle accuracy, not verified on a Mac so not changed: `ssh` warns "UNPROTECTED PRIVATE KEY FILE" without `-v` too; `ps -p 4312` prints the custom `pid,lstart,command` layout instead of `PID TTY TIME CMD`; `df -h /` on macOS also prints inode columns and `/` is the sealed system volume.
- Shelle: `S.vars` and `k.vars` are written but never read, and the `$x =` pattern is a PowerShell leftover. Dead code, harmless.
- Junos Lab: 90 of 92 field-guide quiz answers are the middle option and the options are not shuffled (the prep quiz does shuffle), so guessing pays XP. Design choice.
- Junos Lab accuracy, needs a Juniper check before changing: `show spanning-tree interface` never shows a ROOT port (every forwarding port is DESG); `show vlans` uses its own Name/ID layout instead of the ELS Routing instance / VLAN name / Tag / Interfaces layout; `set vlans guest interface ge-0/0/3.0` is refused; the RSTP guide says both "do not assume RSTP is on" and "runs RSTP out of the box"; `vlan-id 4095` gives no range hint.
- Junos Lab: after Resume the tablet shows scenario 1 instead of the one being worked on; at 390 px the tablet covers half the CLI and the toolbar's second row; new hosts spawn on top of each other. `js/course.js` `renderResume` is overridden by the one in `js/prep.js` (dead code).
- Codex Microsoft: search takes the spelling literally: "licence" finds 16 entries, "license" 8. Matching both spellings would be a small search change; her call.
- Proxle: the Create scenario says `pvecm create` makes the cluster's certificate authority. On a real node `pve-root-ca` already exists from the install, and a joining node takes over the cluster's CA. Not verified against pve.proxmox.com yet, so not changed and no Pockle card written for it.
- Junle classic (`junle.html?classic=1`) has no phone layout: at 390 px the terminal text is cut off on the left and the drill panel squeezes it. The launcher opens the room instead. Layout decision.
- Junle: the first wrong answer only says "rejected. retry."; the hint starts at the second miss. Design choice.
- Codex: Python, JavaScript, PHP, Git, Shell and SQL volumes, Recipes and the Glossary now read line by line (SQL, Recipes and Glossary on 22 Nov, fourth run: nothing wrong found). The Hexle and Passle rulebooks were read on 24 Nov: nothing wrong found, 16 long lines split. Small note left alone: Shell says `ssh -v` shows UNPROTECTED PRIVATE KEY FILE, which appears without -v too.
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
- Hexle: two drills show the answer as placeholder text (`function tick() {}`, `function render() {}`). Tourney (flexbox and grid) is open on a first visit, before any CSS is taught. Design choices, her call (she did not pick these on 23 Nov).
- Webble: between about 760 and 1217 px wide the header runs off the right edge (toolbox, sound and export buttons). The Work screen at phone width is cramped. Both need a layout decision.
- Syncle: the "count" recall accepts a bare `3` (this is the one failing case in `tools/syncle/test.js`). The "connect" recall asks for "without the welcome text" but passes without `-NoWelcome`. Tightening either changes what the drill demands: her call.
- Syncle: several Graph commands take the user as a bare first word (`Update-MgUser x`); the real module wants `-UserId`. Not changed.
- Junle room: the first ticket visitor (Veylin) slides in a second or two after sitting down and covers an app that was just opened (seen with Rehearse and Terminal on a first visit). Not sure it is a bug; the story may want this.
- Junle room: `#wx-mist` keeps animating at opacity 0 (weather design, not changed). Since 23 Nov it is clipped by its window, so it no longer makes the page 5500 px wide.
- Meridian: event 7040 in the time ticket reads "changed from auto start to auto start"; the real message names two different start types. Story text, left alone.
- Meridian: `backdrop-promenade.webp` and `hero-school.webp` give a 404 on every load; portraits and two more backdrops are missing too. All in the ComfyUI queue (items 2026-11-19-3, 4, 7 to 12).
- Proxle: `pveversion` prints `pve-manager/9.2-1/3a1f9c2e`. Since Proxmox VE 8 the manager version uses dots (`pve-manager/8.2.4/...`); `9.2-1` is the ISO's name. Not verified against pve.proxmox.com, so not changed.
- Junle room on a phone: the scene (`.stage`) is cover-cropped wider than the screen (about 970 px at 390), so mobile Chrome's layout viewport grows to 970 px; it renders fine but a pinch could pan sideways. Design of the room; listed only.
- Proxle: `ls -l /mnt/pve/backup-a/dump` and `ls -l /etc/pve/nodes` print the short listing; a real `-l` prints permissions, owner, size and date per line. `pveversion --verbose` prints one line (same as `-v`). `uptime`, `df -h` and `free -h` on a node are "not simulated" (honest, but they are the first things an admin types on a new server).
- Proxle, small realism gaps, not changed: `ip -br a` and `ip addr show vmbr0` print the full `ip a` (the real `-br` is a one-line-per-interface table); `vzdump ... --compress zstd` echoes the job line without `--compress zstd`; `ping` without `-c` stops by itself after three replies (a real ping runs until Ctrl+C); `pveversion -v` prints the same single line as `pveversion` (the real one lists every package); `cat /etc/hosts` on the laptop says the file does not exist.
- Pockle bank for Modle holds one Python card (`print("code"[-1])`). Modle has its own Python section, so it was left; say so if Math should stay code-free.
- Repo weight: `labs/img/junle-room/rack-front.png` (4.9 MB), `labs/img/pyle/office-car.png` (1.8 MB) and `labs/img/junle-room/room.png` (1.5 MB) are not referenced by any lab (the labs use the .webp versions). Not deleted; her call.
- `LOOP_LOG.md` and `tools/proxle/LOG.md` still mention old scheduled tasks ("Proxle night loop") that could not be deleted from inside a run. They are disabled; she can delete them by hand.
- Meridian: `nslookup` is refused as an unknown command in the DNS ticket, and `Get-EventLog` inside a session on dns-02. Both work on a real Windows Server (Get-EventLog is in Windows PowerShell 5.1, which is what a remote session on a server gives you). Adding them to the simulator is a feature: her call.
- Webble: the floating "this screen uses ..." chip is fixed to the bottom right and, at phone width, sits on top of the progress card on Home. Moving or hiding it changes the look: her call.
- Spelle: the four Delve drills have prose hints, not runnable ones; on Delve III the wall follower runs past the 600-step limit without the key. Looks intended for a final challenge; left alone.

- Git Lab, still answered "unknown command" although real (simulator scope, her call): `git diff`, `git fetch`, `git revert HEAD` (the revert quest wants a commit id), `git mv`, `git rm`, `git commit --amend`, `mkdir -p`, `ls -a`, `echo ... > file`. `cd ..` and `cd` print the new path; a real shell prints nothing. `cd /` goes home instead of to the root.
- Junle: every ticket step I read (001 to 007) matches ELS syntax; nothing to change. The rescue save also clearing the minor alarm matches EX behaviour.
- Syncle: script files are found case-sensitively (`./get-staleusers.ps1` for `Get-StaleUsers.ps1` is "not recognized"). A Mac's disk is case-insensitive by default, so a real Mac would run it. Small; engine change.
- Opsle: "Ship the ops portal" promises "a pwsh smoke test" in its story and result, but none of its four stages (Passle, Webble, Shelle, Git Lab) writes one. Adding a Syncle stage is new content: her call.
- Git Lab: AUTOFILL on the revert step fills `git revert LAST`, which the simulator answers with "bad revision"; the step text says to replace LAST with the real id. Looks intended (it makes her read the log); listed only.
- Junle: the Split Chassis scenario shows two masters while one of the two VC ports is still Up (`vcp-255/1/1 Up`). With a link still up the members can see each other, so a real stack would not split. Both outputs would need to show the VC links down. Changing the scenario's output is a story change: listed.
- Junle: the room and the classic drill name the security VLAN `klanten` (Dutch for customers). Not a person name, so left.

## Entries

### 2026-11-24, second run

Checked
- Setup: push access works (dry run accepted); remote set to Highdrated/Mega-Lab. LOG first line not HOLD. CDN still blocked, so pyle, sleeple, passle, seqle and rebble stay skipped; spelle, shelle and junos-lab taken.
- Pockle: first visit and seeded visit at 390x844 with touch, home and the three tabs. No errors, no typing fields, no sideways scroll. Numbers above.
- Quick pass: 25 pages at 1440x900 and 390x844. No page errors. Only the two known Meridian 404s, fonts the sandbox cannot reach, and the known Junle room scene width. Service worker: every precache entry exists (12 and 27).
- Suites (after the changes): proxle ALL OK, pockle ALL OK, sync and typed clean, opsle clean, junos-lab 6472 passed, no-emoji and soak 8000 clean, syncle test2 to test5, t_teams and t_clock FAIL 0, syncle test.js 1 known failure.
- Deep pass: spelle (learner texts scanned: none over 20 words, nothing to fix), shelle (all lessons and tasks read, Processes & ports played, the Practice list checked), junos-lab (lesson, ticket, mock exam and protocol explanations read; timers checked: the tablet and monitor timers stop when hidden).
- CACHE now workshop-v121; Junos Lab APP_VERSION 3.30.8 and junoslab-v57.

Fixed
- Shelle: after one missed step the Practice list said "1 steps you missed before". It now says "1 step".
- Pockle: 20 Syncle and 10 Git Lab cards (see Pockle numbers).

Readability: 40 rewrites
- Junos Lab 25 (BGP lab 6, Bridges 1, Colo 7, Juno 1, mock exam 3, Ops 1, two scenarios, Site work 1, the access-versus-trunk lesson, two protocol explanations). Shelle 10 (tasks and lessons in Search, Docker, SSH, Processes, Permissions, Compose and the keys tip). Pockle 5. No test or check matches any of them; all suites green after.
- Junos Lab, before: "This is the entire point of running BGP here — a typed static route can't detect the provider going down; a LEARNED one disappears the instant the session does, protecting you from blackholing traffic." After: "This is the whole point of running BGP here. A typed static route can't tell that the provider went down. A LEARNED route disappears the moment the session does, so you never send traffic into a black hole."
- Shelle, before: "SSH protects you from yourself: if a private key file can be read by anyone but you, ssh ignores it and the server never sees a key, so you get 'Permission denied (publickey)'." After: "SSH protects you from yourself. Can anyone but you read a private key file? Then ssh ignores it. The server never sees a key, so you get 'Permission denied (publickey)'."
- Junos Lab, before: "IPv6 removed broadcast entirely and uses multicast instead, which is why a message to all nodes on a link goes to ff02::1 rather than to a broadcast address." After: "IPv6 has no broadcast at all. It uses multicast instead. That is why a message to all nodes on a link goes to ff02::1, not to a broadcast address."

Listed
- No new art items: Spelle (2), Shelle (1) and Junos Lab (1) already have items waiting. 33 open.
- Syncle stale report: the trap says an empty LastSignInDateTime "is not -lt anything". In PowerShell `$null -lt <date>` may well be true (null sorts first), which would make never-used accounts count as stale. Could not run pwsh or confirm in Microsoft Learn tonight, so not changed and no Pockle card written for it. The lab's own command filters empty dates out first, so its result is right either way.

Needs her decision
- Pockle ideas 1 and 5 (try any lab, bring my progress).

### 2026-11-24

Checked
- Setup: push access works (dry run accepted). LOG first line not HOLD. CDN still blocked, so pyle, sleeple, passle, seqle and rebble stay skipped; codex, mscodex and junle taken.
- Pockle: first visit and seeded visit at 390x844 with touch, home, every tab and a mix card. No errors, no typing fields, no sideways scroll. Numbers above. Pockle card texts read: none has a sentence over 18 words any more, so no Pockle rewrites were needed.
- Quick pass: 25 pages at 1440x900 and 390x844. No page errors. Only the two known Meridian 404s, fonts the sandbox cannot reach, and the known Junle room scene width. One stray 404 on Pyle and one on Junle came once and did not come back in three reloads (the blocked CDN).
- Service worker: CACHE now workshop-v120 (lab files and Pockle only, no js/ or css/ change).
- Suites (after the changes): proxle ALL OK, pockle ALL OK, sync and typed clean, opsle clean, junos-lab 6472 passed, no-emoji and soak 8000 clean, syncle test2 to test5, t_teams and t_clock FAIL 0, syncle test.js 1 known failure.
- Deep pass: codex (Hexle and Passle rulebooks read, so every Codex volume has now been read; search at both sizes), mscodex (every long explanation read; search at both sizes), junle (field guides, recaps, the rehearsal questions in the room, and the drill texts checked for Junos facts).

Fixed
- Junle: four places said that two Virtual Chassis members with equal priority become two masters ("split brain"), and a quiz question rewarded that answer. Juniper's docs say the opposite: with equal priority, tie-breakers still pick one master (the last master, then the member in the stack longest, then the lowest MAC). Two masters means the members lost each other over the VC links. The guide step, the gotcha, the drill explanation and the quiz question and answer now say so.
- Pockle: 9 Junle, 9 Spelle and 7 Sleeple cards (see Pockle numbers).

Readability: 39 rewrites
- Codex 16 (Hexle rulebook: pre, overflow, box-sizing, cascade order, :checked, absolute; Passle rulebook: regex modifiers, yield, callables, fopen and fgetcsv, fopen modes, sessions, cookies, backed enums, abstract classes, new static). Codex Microsoft 13 (TAP, the Purview role delay, Graph scopes, Where-Object and Select-Object, filter left, the Teams SIP address, careful scripts, recreating a TAP, the investigation order, token replay, the library clash, Behind every team). Junle 10 (eight guide recaps and gotchas, two room ticket texts). No test or check matches any of them. Search still finds every rewritten entry.
- Codex, before: "By default, width is only the content: padding and border are added on top, so a 200px box with 20px padding and a 4px border is 248px wide." After: "By default, width is only the content. Padding and border are added on top. So a 200px box with 20px padding and a 4px border is 248px wide."
- Codex Microsoft, before: "It takes 15 to 60 minutes before the role works, so do it at the start of an incident, not when you need it." After: "The role takes 15 to 60 minutes to start working. So assign it at the start of an incident, not when you need it."
- Junle, before: "VLAN 20 now has a gateway (irb.20), it's correctly bound so the interface is actually up, and a default route lets it reach beyond the switch." After: "VLAN 20 now has a gateway: irb.20. It is bound to its VLAN, so the interface is really up. A default route lets it reach beyond the switch."

Listed
- No new art items: Junle, Codex and Codex Microsoft already have items waiting. 33 open.
- Junle Split Chassis outputs (see Open findings).

Needs her decision
- Pockle ideas 1 and 5 (try any lab, bring my progress).

### 2026-11-23, fourth run

Checked
- Setup: push access works (dry run accepted); remote set to Highdrated/Mega-Lab. LOG first line not HOLD. CDN still blocked (403), so pyle, sleeple, passle, seqle and rebble stay skipped; git-lab, modle and opsle taken.
- Pockle: first visit and seeded visit at 390x844 with touch, every tab, a 10-card mix played to the end screen. No errors, no typing fields, no sideways scroll. Numbers above.
- Quick pass: 25 pages at 1440x900 and 390x844. No page errors. Only the two known Meridian 404s and fonts the sandbox cannot reach; Junle room's 1545 px is the known cover-cropped scene.
- Service worker: every precache entry exists. CACHE now workshop-v119.
- Suites (after the changes): proxle ALL OK, pockle ALL OK, sync and typed clean, opsle clean, junos-lab 6472 passed, no-emoji and soak 8000 clean, syncle test2 to test5, t_teams and t_clock FAIL 0, syncle test.js 1 known failure.
- Deep pass: git-lab (guided missions autoplayed from M-00 to the revert step, then the revert step with a wrong and a right id), modle (all 16 Learn pages scanned for long sentences), opsle (every story, step, hint and expected result read against each other).

Fixed
- Git Lab: the revert step passed for ANY commit id, so `git revert c1` (the wrong commit) moved the mission on. It now passes only when the newest commit was reverted. A wrong id gets a hint: "that undid a different commit. Run git log and revert the top one."
- Opsle: the onboarding raw list still said `BRAM,sales` (missed in the name sweep), while the expected result says Bryndel. A cleaner run would have printed Bram. Now `BRYNDEL,sales`.
- Pockle: 11 Shelle and 10 Subnle Pocket cards (see Pockle numbers).

Readability: 18 rewrites
- Git Lab 5 briefings (conflict markers, .gitignore, reset versus revert, the four undo stages, why restore changes nothing after --soft). Modle 4 Learn lines (ceil bug, banker's rounding, range(5), algorithm explained). Opsle 3 stories and 4 long steps (one step stays one step, so saved ticks still line up). Pockle 2 Passle explanations. No test or check matched any of them.
- Git Lab, before: "One more. Reset only works on commits nobody else has seen. If a bad commit is already pushed, you use revert instead." After: "One more. Only use reset on commits nobody else has seen. Is the bad commit already pushed? Then use revert instead." (The old line was also not true: reset works, it is just unsafe on shared commits.)
- Modle, before: "This is the single most common place beginners ship a bug: use normal rounding and 53 items becomes 7 pages, but 51 items becomes 6 pages and three items vanish off the end of your site." After: "Beginners ship this bug more than any other. Use normal rounding and 53 items gives 7 pages, which is right. But 51 items gives 6 pages, and three items vanish off the end of your site."
- Opsle, before: "Run it detached with port 8080 on your Mac mapped to 80 in the container, named ops-portal." After: "Run it detached and name it ops-portal. Map port 8080 on your Mac to port 80 in the container."

Listed
- No new art items: Git Lab (2026-11-20-7), Modle (2026-11-20-9, 2026-11-21-3) and Opsle (2026-11-20-8) already have items waiting. 33 open.
- Opsle ops portal promises a pwsh smoke test that no stage builds (see Open findings).

Needs her decision
- Pockle ideas 1 and 5 (try any lab, bring my progress).

### 2026-11-23, third run (paused at her request, resumed the same afternoon)

Checked
- Setup: push access works (dry run accepted); remote set to Highdrated/Mega-Lab. LOG first line not HOLD. CDN still blocked, so pyle, sleeple, passle, seqle and rebble stay skipped; hexle, webble and syncle taken.
- Pockle: first visit and seeded visit at 390x844 with touch, every tab, a 10-card mix played to the end screen. No errors, no typing fields, no sideways scroll. Numbers above.
- Quick pass: 25 pages at 1440x900 and 390x844. No page errors. Only the two known Meridian 404s and fonts the sandbox cannot reach. Junle room reports 1545 px of page width at 1440: that is the cover-cropped room scene (`.stage`), already listed; html and body hide it.
- Service worker: precache entries exist, Junos Lab's 27 too. Launcher reaches all 20 labs. CACHE now workshop-v112 (lab files and Pockle, no js/ or css/ change).
- Suites (after the changes): proxle ALL OK, pockle ALL OK, sync and typed clean, opsle clean, junos-lab, no-emoji and soak 8000 clean, syncle test2 to test5, t_teams and t_clock FAIL 0, syncle test.js 1 known failure.
- Deep pass: hexle (every tab clicked at both sizes, all lesson texts read), webble (home, School and the path at both sizes, briefs and lessons read), syncle (stories, blurbs and tasks read; rebuilt and every suite run). No new bugs, no overflow, no stray errors.

Fixed
- No lab bugs found tonight.
- Pockle: 15 Git Lab and 15 Meridian cards (see Pockle numbers).

Readability (new job, first run): 33 rewrites
- Hexle 19 lesson lines, Webble 6 (intro, School, two briefs, the review page), Syncle 4 (the Connect blurb, the Teams story and summary, the Get-JobTitle task), Pockle 4 card explanations. Facts, terms and code left as they were; no test or check matched any of them.
- Hexle, before: "pre is preformatted text: normally HTML squeezes every run of spaces and line breaks into one space, but inside pre every space and every line break stays exactly where you typed it, in a monospace font where every letter is equally wide." After: "pre is preformatted text. Normally HTML squeezes spaces and line breaks into one space. Inside pre, every space and line break stays exactly where you typed it. The font is monospace: every letter is equally wide."
- Webble, before: "Every motion on a site like Moonwright's is the same trick: an element has a state A, something changes it to state B, and the browser animates the in-between." After: "Every motion on a site like Moonwright's is the same trick. An element has a state A. Something changes it to state B. The browser animates the in-between."
- Syncle, before: "Before you touch a tenant you sign in with the right permissions, check where you are, and learn how to find any command on your own." After: "Before you touch a tenant, sign in with the right permissions and check where you are. Then learn how to find any command on your own."
- Most of Webble and Syncle already read in short lines; Hexle's lessons had the longest sentences.

Listed
- No new art items: Hexle and Webble already have 11 items waiting between them; Syncle's Memory Corridor is on theme. 33 open.

Needs her decision
- Pockle ideas 1 and 5 (try any lab, bring my progress).
- Is the readability style right (short sentences, the action first)?

### 2026-11-23, second run

Checked
- Setup: push access works (dry run accepted); remote set to Highdrated/Mega-Lab. Catch-up already done. LOG first line not HOLD. CDN still blocked (403), so pyle, sleeple, passle, seqle and rebble stay skipped; junos-lab, proxle and meridian taken.
- Pockle: first visit and seeded visit at 390x844 with touch, every tab, a 10-card mix, no errors, no typing fields, no sideways scroll. Numbers above.
- Quick pass: 26 pages at 1440x900 and 390x844 (now with mobile emulation). No page errors. Only the two known Meridian 404s and fonts the sandbox cannot reach. Junle room measured 4985 px of hidden page width (fixed, see below).
- Service worker: precache entries exist, Junos Lab's 27 too. CACHE now workshop-v108; Junos Lab APP_VERSION 3.30.6 and junoslab-v55.
- Suites (after the fixes): proxle ALL OK, pockle test, sync and typed clean, opsle clean, junos-lab 6472 passed, no-emoji clean, soak 8000 clean, syncle test2 to test5, t_teams and t_clock clean, syncle test.js 1 known failure.
- Deep pass: junos-lab (where the keyboard goes while a dialog is open), proxle (11 real commands on a fresh node: qm list, pvesm status, pvecm nodes, hostname -f, /etc/hosts, qm status, pct list, pveversion, systemctl, ip -br a), meridian (every tab at both sizes, overflow scan: clean).

Fixed
- Junos Lab: while a dialog was open (Predict before you commit, and every other choice dialog) the keyboard still typed into the CLI behind it, so a stray Enter could send a command. Dialogs now take the focus and hand it back to the CLI when they close.
- Junle room: the mist layer is 400% wide and only its window mask hid it, so the page was 5500 px wide behind the scenes. Its window (`.sky`) now clips it; nothing changes on screen.
- Pockle: 12 Sleeple cards and 16 Modle cards (see Pockle numbers).

Listed
- No new art items: Junos Lab, Proxle and Meridian already have items in the queue. 29 open.
- Proxle `pveversion` format (see Open findings).

Needs her decision
- Pockle ideas 1 and 5 (try any lab, bring my progress).

### 2026-11-23, daytime (asked by Kaatje)

- Names (her rule, 23 Nov: nothing in any lab resembles a real name; fantasy or movie names only): every real-sounding person and company was renamed, keeping first letters so aliases, initials and sort orders still work. Syncle: 33 staff (Tom Jacobs is Tamlin Jaspermoor, Hollis Reed is Hesper Reedmire, Rowan Hart is Rowenna Harthorn, Thea Gallow is Theodwyn Gallow, Garrick Penhale is Garrion Penhale, and so on), the 20 + 12 contractor first and last names, Brightline is Wyrmlight, Polder Freight is Fenmarsh Freight, Project Northwind is Project Northwyrm. Seqle: all 17 guests and staff (Oskar Vale is Osric Valewind; the portrait files keep their old keys). Passle: Madame Ondelle, Monsieur Pettibone, Bastrel, Arvellon, Dellawyn, the Mossbrook family, the Lanternwicks, Miravel, Lucenne, Amaryllis, Jessamine, Lumiel, Hélisande, Corvelle, Thessan, Lirelle, Grimbold. Sleeple: Guard Isolwen Mossbrook, Stationmaster Orrowyn, Driver Saltwick, Baggage master Varrowick, Steward Brix. Meridian: Lunelle Morrow, Morwyn. Junle room: Marrowen, Ondelle, Garrion, Captain Ilsemar, Mirawen. Pyle Pocket, the missions and Opsle: Aeris, Bryndel, Lyriel, Nyxa, Tamlin, Jorin (regenerated by running the Python, so every expected output is real; the strings and comprehension missions got new positions and lengths). Pyle: Ada Lovelace is Aeli Lumewyn (same length and initials). Webble: Marcelo is Moonwright. Junos Lab contract companies all fantasy. contoso.com is ashvale.com in every lab. Kept on purpose: Kaatje, the pets Roux, Kai and Junie, movie places in Rebble, PHP's soundex('Robert') example, Saint-Nicolas and Saint-Valentin, Proust. Every suite green; Junos Lab 3.30.7 (junoslab-v56); CACHE workshop-v111.
- Hexle chapter II, the Harbour (her choice): four new plots in a fourth village row (Lighthouse, Ferry office, Salt Lantern tavern, Fishmonger stall), open once target 13 (the notice boards) is done, also from the target picker. Targets 44 to 47, appended so old saves load unchanged. Eight new rules with lessons, drills and a review each: r89 strong and em, r90 blockquote and pre, r91 radios with fieldset and legend, r92 checkboxes and :checked, r93 details and summary, r94 max-height and overflow, r95 box-sizing: border-box, r96 text-transform and letter-spacing. Every starter is red on every step and every solution green on every step (checked in the browser). The Codex Hexle rulebook has the eight new entries.
- Hexle good-habit training (her choice: both): each harbour target starts with one bad habit (inline style, a field with only a placeholder, two h1, !important) and ends with the step 'the code review shows no Fix notes'. 31 habit drills joined the Review practice, one or two per habit the code review checks, each tied to the rule it belongs to so it appears once that rule is learned.
- Pockle: Hexle bank has two harbour units (targets 44-45 and 46-47) and 14 cards for the new rules (124 Hexle cards).
- ComfyUI: four harbour plot pictures queued (2026-11-23-h1 to h4); until then the harbour plots show the empty fog pool. 33 open. CACHE workshop-v110.
- Hexle review: the page scrolled sideways between 1561 and 1786 px and at 1366 and about 1000 px wide (the top bar was wider than the screen); the compact bar now starts at 1800 px, the small-font step at 1400 and the tightest at 1030. Checked every 17 px from 360 to 2600: no sideways scroll. Plot and Grimoire titles no longer end in an ellipsis: below 1560 px the 'Plot 04 ·' prefix hides (the plate numeral already says it) and titles may take two lines in equal-height headers. The target picker shows the target name first, with the full name as a tooltip. Target 1 step 9 'Close every tag' was green on the empty starter; it now needs a p and an h2 first. CACHE workshop-v109.
- Codex Microsoft: `datacenterunited.com` and `contoso.com` became the fantasy domain `ashvale.com`, and every real-looking person (Jan Peeters, Stijn Raes, Geoffrey Vanderhaegen, Inge Collet, Pascal Paquay, Adelheid Vermeyen, Noor Haddad, Sara Jacobs, Van Laer, johan.security) got a fantasy name with the same initials, so every address formula still gives the same alias. CACHE workshop-v107.
- Still open: Syncle uses Belgian-looking names in its drills (Noor Claes, Tom Jacobs, Sara Wouters, Lien Maes, Jonas Peeters); other labs use `contoso.com`. Her call.

### 2026-11-23

Checked
- Setup: push access works (dry run accepted); remote set to Highdrated/Mega-Lab. Catch-up already done. LOG first line not HOLD. CDN still blocked (403), so pyle, sleeple, passle, seqle and rebble stay skipped; junle, spelle and shelle taken.
- Pockle: first visit and seeded visit at 390x844 with touch, every tab, a 10-card mix, no errors, no typing fields, no sideways scroll. Numbers above. `tools/pockle/test.py` ALL OK.
- Quick pass: 25 pages at 1440x900 and 390x844. No page errors, no sideways scroll. Only the two known Meridian 404s and fonts or CDN the sandbox cannot reach.
- Service worker: precache entries exist. CACHE now workshop-v106 (lab files and Pockle, no js/ or css/ change).
- Suites (after the fixes): proxle ALL OK, pockle test, sync and typed clean, opsle clean, junos-lab 6472 passed, no-emoji clean, soak 8000 clean, syncle test2 to test5, t_teams and t_clock clean, syncle test.js 1 known failure.
- Deep pass: spelle (all 40 quest hints replayed through the lab's own engine in seven forms: as given, single quotes, no semicolons, i += 1, const, spaces inside brackets, one line), shelle (the shortcut panel against zsh's emacs keymap, Esc as Meta, multi-line input), junle (tickets 001 to 007 read against ELS syntax; console, me0, rollback, rescue, show vlans).

Fixed
- Spelle: Writing Spells 1 only counted `stride();` with a semicolon, so `stride()` on its own line (valid JavaScript) never passed "calls it at least twice". It now counts calls with or without `;`, skips the definition and ignores calls in comments.
- Spelle: the first for loop refused `i += 1` and `++i` as "uses a for loop". Both count now; `i += 2` still fails.
- Spelle: `Math.random( )` and `here( )` with a space inside the brackets failed the d20 and sentinel checks. Both pass now.
- Shelle: the panel taught Shift+Enter as "new line without running". In Terminal and zsh, Shift+Return sends a plain Return and runs the line. zsh's real key is Esc then Enter (or Option+Enter with Option as Meta): `self-insert-unmeta`, bound to ESC-^M in emacs mode (zsh manual, Zsh Line Editor). The panel now shows ⌥ Enter, Option or Esc then Enter adds a new line, and Shift+Enter runs the line like the real thing.
- Pockle: 15 Spelle cards and 7 Proxle cards (see Pockle numbers).

Listed
- One art item added to the ComfyUI queue: Spelle's dungeon panel backdrop (the map floats in a flat black box). 29 open.

Needs her decision
- Pockle ideas 1 and 5 (try any lab, bring my progress).
### 2026-11-22, fourth run

Checked
- Setup: push access works (dry run accepted); remote set to Highdrated/Mega-Lab. Catch-up already done. LOG first line not HOLD. CDN still blocked, so pyle, sleeple, passle, seqle and rebble stay skipped; opsle, codex and mscodex taken.
- Pockle: first visit and seeded visit at 390x844 with touch, every tab, a 10-card mix, no errors, no typing fields, no sideways scroll. Numbers above. `tools/pockle/test.py` ALL OK.
- Quick pass: 27 pages at 1440x900 and 390x844. No page errors, no sideways scroll. Only the two known Meridian 404s (and CDN or font requests the sandbox cannot reach).
- Service worker: precache entries exist. CACHE now workshop-v104 (Pockle rebuilt, no js/ or css/ change).
- Suites (after the changes): proxle ALL OK, pockle test, sync and typed clean, opsle clean, junos-lab 6472 passed, no-emoji clean, soak 8000 clean, syncle test2 to test5, t_teams and t_clock clean, syncle test.js 1 known failure.
- Deep pass: opsle (first visit and every lab's sample progress at both sizes, the Ticket triage stage view, overflow scan), codex (SQL volume, 17 recipes and 72 glossary terms read for accuracy; search, Mark read across a reload, both sizes, timers), mscodex (search, read marks across a reload, both sizes). No bugs, no wrong facts, no overflow, no stray timers.

Fixed
- No lab bugs found tonight.
- Pockle: 15 Junle cards and 15 Meridian cards (see Pockle numbers).

Added after the run (her new rule: a clean lab gets content or visual aids)
- Codex SQL: two drawn diagrams replace the text sketches. "Summing up" shows the order SQL runs a query in as a flowchart (WHERE and HAVING outlined). "Joining tables" shows menu and orders with the matching lines and the JOIN and LEFT JOIN results side by side, Crater Pie ending in NULL. Codex concept blocks now take an `svg` field drawn in the page's own muted colours; it follows day and night. CACHE workshop-v105.

Listed
- No new art items: Opsle and both Codex pages already have items in the queue (2026-11-20-8, -10, -11). 28 open.

Needs her decision
- Pockle ideas 1 and 5 (try any lab, bring my progress).
- Codex Microsoft: swap `datacenterunited.com` and the two full names for `contoso.com`, yes or no.

### 2026-11-22, third run

Checked
- Setup: push access works (dry run accepted); remote set to Highdrated/Mega-Lab. Catch-up already done. LOG first line not HOLD. CDN still blocked (403), so pyle, sleeple, passle, seqle and rebble stay skipped; syncle, git-lab and modle taken.
- Pockle: first visit and seeded visit at 390x844 with touch, every tab, no errors, no typing fields, no sideways scroll. Numbers above. `tools/pockle/test.py` ALL OK.
- Quick pass: 26 pages at 1440x900 and 390x844. No page errors, no sideways scroll. Only the two known Meridian 404s.
- Service worker: CACHE now workshop-v103 (lab files only, no js/ or css/ change).
- Suites (after the fixes): proxle ALL OK, pockle test, sync and typed clean, opsle clean, junos-lab 6472 passed, no-emoji clean, soak 8000 clean, syncle test2 to test5, t_teams and t_clock clean, syncle test.js 1 known failure.
- Deep pass: syncle (every drill answer replayed in 17 real-world forms: aliases, lower-case cmdlets and parameters, spacing around pipes, $PSItem; 1826 variants), git-lab (45 commands in free flight from an empty folder to push), modle (every interval and timer, home and networking screens).

Fixed
- Syncle: three drills checked the typed command with capitals. `start-transcript`, `get-date`, `stop-transcript` (and the demo2.log drill with `get-mgcontext`) did the work but never passed, and `./NoBind.ps1 -X a -whatif` gave the right error but failed the check. PowerShell does not care about case, and its error repeats the name the way you typed it, so the checks now ignore case.
- Git Lab: a double space (`git  status`) was "unknown command". A shell splits on any run of spaces, so the lab now does too (spaces inside quotes are kept, so commit messages stay as typed).
- Git Lab: `git status` in a brand-new repo said "working tree clean". Real git says "No commits yet" and "nothing to commit (create/copy files and use "git add" to track)"; the lab now does.
- Modle: the home demo (`>>> 7 * 8`) kept rewriting itself every 2.6 seconds on every screen and in a hidden tab. It now only changes while the home screen is on show.
- Pockle: 15 Subnle Pocket cards and 17 Seqle cards (see Pockle numbers).

Listed, not done
- Git Lab commands outside the simulator and the Syncle case-sensitive script names (see Open findings).
- Visuals: nothing new. Git Lab's empty flight path and the Modle home are already in the queue (2026-11-20-7 and 2026-11-20-9); Syncle's Memory Corridor screens are on theme.

### 2026-11-22, second run

Checked
- Setup: push access works (dry run accepted); remote set to Highdrated/Mega-Lab. Catch-up already done. LOG first line not HOLD. CDN still blocked (403), so pyle, sleeple, passle, seqle and rebble stay skipped; meridian, hexle and webble taken.
- Pockle: first visit and seeded visit at 390x844 with touch, every tab, no errors, no typing fields, no sideways scroll. Numbers above. `tools/pockle/test.py` ALL OK.
- Quick pass: 25 pages at 1440x900 and 390x844 (50 loads). No page errors. Only the two known Meridian 404s and the clipped Junle mist (its scroll width is wider than the screen but html and body hide it).
- Service worker: CACHE now workshop-v102 (lab files only, no js/ or css/ change).
- Suites (after the fixes): proxle ALL OK, pockle test, sync and typed clean, opsle clean, junos-lab 6472 passed, no-emoji clean, soak 8000 clean, syncle test2 to test5, t_teams and t_clock clean, syncle test.js 1 known failure.
- Deep pass: meridian (the frozen cargo ticket and the silent DNS ticket, about 50 commands with real PowerCLI and Windows variants), hexle (lesson texts r1 to r73 read for accuracy, phone layout, timers), webble (home on desktop and phone, every animation loop and interval checked for a stop condition).

Fixed
- Meridian: `Get-Datastore DS-HULL-01 | Get-VM` listed all 30 VMs, whichever datastore you piped in, and `Get-VM cargo-db-01 | Get-Datastore` listed both datastores. Both now follow the pipe, like PowerCLI: 26 VMs on DS-HULL-01, 4 on DS-BOW-01, and only DS-HULL-01 for cargo-db-01. `Get-VM -Datastore <name>` is real PowerCLI and was refused; it now works and a wrong name gives an error.
- Webble: the custom cursor dot sat in the top-left corner of Home until the mouse moved, and on a phone it stayed there for good. It now only shows on a device with a mouse, once the mouse has moved.
- Hexle: rule 36 said "::after behind it", which reads as stacked behind the content. Now: ::before at the start of the element, just before its content, and ::after at the end, just after it.
- Pockle: 19 Syncle cards and 9 Sleeple cards (see Pockle numbers).

Listed
- No new art items: Meridian, Hexle and Webble already have 16 items waiting in the queue between them. 28 open.
- Meridian nslookup and Get-EventLog, Webble chip on phones: see Open findings.

Needs her decision
- Pockle ideas 1 and 5 (try any lab, bring my progress).
- Codex Microsoft: swap `datacenterunited.com` and the two full names for `contoso.com`, yes or no.

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

### Older (folded)

- 2026-11-21: Proxle answers pvesh, pveum and friends as real commands; Meridian takes four real w32tm forms; Hexle accepts attributes in any order and self-closing void tags; 15 Proxle and 14 Meridian Pockle cards.
- 2026-11-20, evening run: Spelle checks ignore comments and find a loop's real closing brace; Shelle kill and sed now change what lsof, docker run and cat show; Junos Lab uplinks keep their names after a reload, Esc keeps the autosave, show interfaces terse ge-0/0/0 works; 17 Meridian Basics Pockle cards.
- 2026-11-20, afternoon run: could not push (patch pushed by the evening run); Syncle file dates hang on the frozen clock (`t_clock.js`); Junle BPDU drill wants `clear error bpdu interface`; Codex recipes wrap on a phone; 31 Syncle Pockle cards.
- 2026-11-20, midday (by hand): the four unpushed runs applied on top of main and pushed; Syncle sequence 11 (Teams) was already on main. CACHE workshop-v95.
- 2026-11-20, morning run: Git Lab took trailing-slash paths, switch, add -A, restore --staged and reset --soft HEAD^; Opsle says git init -b main; 30 Syncle Pockle cards; three art items queued.
- 2026-11-20: Hexle single-quoted attributes and phone fits; Webble Check timing, plain-quote template refused, hidden loops stopped; Syncle Next skip and Get-Member -Type; 16 Proxle and 14 Meridian Pockle cards; six art items queued.
- 2026-11-19, evening run: Meridian lesson footer wraps on phones; new Meridian Pockle bank (18 cards) and Syncle bank to 26; six Meridian art items queued.
- 2026-11-19, first night: quick pass of 31 pages clean apart from the Meridian 404s; new Proxle and Syncle Pockle banks and `tools/pockle/test.py`; Shelle took 25 real-world equivalents; Spelle accepted backtick strings and lost its two header emoji.
