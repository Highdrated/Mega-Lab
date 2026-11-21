# Mega Lab nightly log

First line is checked every night: if it reads HOLD, the run changes nothing and stops.

## Deep-check rotation

Top three are next. Tonight's three move to the bottom. Pockle is not in the list (it is checked every night).

1. pyle (needs the CDN, see note)
2. sleeple (needs the CDN, see note)
3. passle (needs the CDN)
4. seqle (needs the CDN)
5. rebble (needs the CDN)
6. modle (20 Nov, morning)
7. opsle (20 Nov, morning)
8. codex (20 Nov, afternoon)
9. mscodex (20 Nov, afternoon)
10. junle (20 Nov, afternoon; the classic terminal this time, the room was 19 Nov)
11. spelle (20 Nov, evening)
12. shelle (20 Nov, evening)
13. junos-lab (20 Nov, evening; LACP, RSTP and VLAN scenarios, three field guides)
14. proxle (21 Nov; walk scripts, 30 real-world variants in five scenarios)
15. meridian (21 Nov; Windows Server module, the time ticket console)
16. hexle (21 Nov; 144 typed drills against their hints and real-world variants)
17. webble (21 Nov, second run; warm-up resume, motion checker messages)
18. syncle (21 Nov, second run; all suites, Memory Corridor screens)
19. git-lab (21 Nov, second run; all 91 mission steps, 40 real-world commands in free flight)

Note for the rotation: the nightly sandbox cannot reach cdn.jsdelivr.net or Google Fonts. Pyle and Sleeple (pyodide), Passle and Rebble (php-wasm) and Seqle (sql.js) cannot run their code here, so a deep pass on them is limited to reading, layout and whatever works without the runtime. Those labs are skipped until a run can reach the CDN (checked again on 21 Nov, both runs: still blocked, 403 from the proxy); the next labs that can run are taken instead.

## Pockle numbers (21 Nov, second run, 390x844, touch)

| Group | Cards | First visit can reach | With sample progress |
|---|---|---|---|
| Juniper Oopsies | 22 (+ live mistakes) | 22 | 22 |
| Junle | 73 | 73 | 73 |
| Junos Lab | 155 | 155 | 155 |
| Proxle | 49 (15 added 21 Nov) | 0 | 15 |
| Meridian | 63 (14 added 21 Nov) | 0 | 14 |
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
| Git Lab | 75 | 0 | 29 |
| Shelle | 81 | 0 | 21 |
| Syncle | 87 (31 added 20 Nov afternoon) | 0 | 11 |
| Modle | 90 | 0 | 30 |

- Total 2361 cards. A first visit on a phone reaches 250, all Juniper; with sample progress in every lab 834 are open. The other 2111 are locked until that lab has progress on the same device, and lab progress lives per device. This is still why it feels empty on the go.
- Due today on a first visit: 0. Today's reviews shows three 5-card warm-ups (15 cards, about three minutes), then nothing new is asked for; Pocket mix and Sprint stay available. After that she runs out of anything but Juniper.
- Python tab: 16 lessons, 1 open on a first visit. Subnetting tab: 16 steps, 1 open. Both tap-only, no typing fields anywhere.
- No blank or dead-end states found. No horizontal scroll. No console errors. Sixteen of nineteen lab rows are greyed out on a first visit; their OPEN button links to the lab.
- Launcher labs with no rehearsal set in Pockle: only the two Codex references. Fewest cards now: Proxle 49, Meridian 63, Git Lab 75, Sleeple 78. Next run: Git Lab and Shelle (81), since Proxle and Meridian were filled this morning.
- Proxle now has cards for the switch scenario (commit, root password, /32, default VLAN, trunk, MAC table, ssh) and the install basics (certificate warning, local-zfs, BIOS virtualization, ip route, resolv.conf). Meridian now covers Updates, reboots and time (Get-HotFix, RebootPending, the pair restart, the time hierarchy, VMware time sync, w32tm) and more of Roles (Spooler, Manual, WinRM, 3389, SoftwareDistribution, Get-Volume).
- Meridian now has cards for its Basics module too (team and tickets: lines, incident, problem, change, priority; stack and console: layers, maintenance mode, PowerCLI, the ways in, CMDB). They unlock from `meridian.v1` when those lessons are read.
- Already true from her earlier wishes: per-lab Today's reviews, Juniper rehearsals open without lab progress, Juniper Oopsies shown first, recall-first with hidden options, fluency labels (shaky, slow, fluent), one dragon per lab group.
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
- Shelle: real equivalents still answered "not quite": `cut -d ' ' -f6`, `df -h` (the step wants `df -h /`), `docker logs --tail=5 web`, `docker compose logs --tail=20 app`, `curl --head`, `ping -c4`, `rsync -anvz`, `lsof -i tcp:8000`, `kill %1`, and `ssh station` in the sshkey case (its own `~/.ssh/config` defines that alias). Adding them to `alt` is safe but long; next Shelle pass.
- Shelle: "list what is there, one name per line" accepts only `ls`; `ls -1` is the real one-per-line flag. A GNU-style `sed -i 's/...'` in the restart case gives "(no results)" where a Mac errors ("extra characters at the end of d command"): that error would be the lesson. Solve opens after one command and one of five clues. Mid-scenario position is lost on reload.
- Shelle accuracy, not verified on a Mac so not changed: `ssh` warns "UNPROTECTED PRIVATE KEY FILE" without `-v` too; `ps -p 4312` prints the custom `pid,lstart,command` layout instead of `PID TTY TIME CMD`; `df -h /` on macOS also prints inode columns and `/` is the sealed system volume.
- Shelle: `S.vars` and `k.vars` are written but never read, and the `$x =` pattern is a PowerShell leftover. Dead code, harmless.
- Junos Lab: in real-junos mode a command typed right after `commit` runs before "commit complete" (`dev.cli.busy` is set but never read); the predict modal leaves focus in the CLI the same way. Fix touches the CLI input loop: next Junos pass, with a test.
- Junos Lab: the field-guide timer re-runs every prerequisite check every 1.2 s even with the tablet closed (`js/protocols.js`, around line 2849). Autosave waits 800 ms and nothing saves on page close, so a fast reload can lose the last change. Both small; not done tonight to keep the change set checkable.
- Junos Lab: 90 of 92 field-guide quiz answers are the middle option and the options are not shuffled (the prep quiz does shuffle), so guessing pays XP. Design choice.
- Junos Lab accuracy, needs a Juniper check before changing: `show spanning-tree interface` never shows a ROOT port (every forwarding port is DESG); `show vlans` uses its own Name/ID layout instead of the ELS Routing instance / VLAN name / Tag / Interfaces layout; `set vlans guest interface ge-0/0/3.0` is refused; the RSTP guide says both "do not assume RSTP is on" and "runs RSTP out of the box"; `vlan-id 4095` gives no range hint.
- Junos Lab: after Resume the tablet shows scenario 1 instead of the one being worked on; at 390 px the tablet covers half the CLI and the toolbar's second row; new hosts spawn on top of each other. `js/course.js` `renderResume` is overridden by the one in `js/prep.js` (dead code).
- Codex Microsoft: the examples use the domain `datacenterunited.com` (15 addresses, 26 mentions) and two full names in addresses, on a public page. Her rule is no real company names and no real colleagues' names. The rest of the page already uses `contoso.com`. Her call, but worth a quick yes.
- Junle: the scenario "split VC" and two sample outputs show the second member of a two-member Virtual Chassis as `Linecard`. Without preprovisioning a second member with priority 128 is normally `Backup`. Not checked against Juniper yet, so not changed.
- Junle classic (`junle.html?classic=1`) has no phone layout: at 390 px the terminal text is cut off on the left and the drill panel squeezes it. The launcher opens the room instead. Layout decision.
- Junle: the first wrong answer only says "rejected. retry."; the hint starts at the second miss. Design choice.
- Codex: the Python, JavaScript, PHP, Hexle and Passle volumes were not yet read line by line for accuracy. Next time the Codex comes round, start there.
- Git Lab: a mission step wants the exact commit message from the briefing; your own wording commits but the step stays put. `git branch <name>`, `git restore .`, `git restore --staged <file>`, `git merge --no-ff` and options after the ref (`git reset HEAD~1 --soft`) are answered with "unknown command" or a pathspec error although they are real. Adding commands to the simulator is a feature: her call.
- Git Lab: after `git init` the lab always says branch `main`. Real git names the first branch `master` unless `init.defaultBranch` is set or you type `git init -b main`. One line in mission 0 could say so: her call.
- Git Lab: `git add <file>` stages every change, not just that file (the simulator has one staged flag, no per-file index). Real commands still answered "unknown command" in free flight: `git status -s`, `git diff --staged`, `git commit -am`, `git branch -a`, `-v`, `-d`, `git tag`, `git show`, `git stash`, `git rm --cached`, `ls -la`, `git --version`, `git config`, `git help`. `pwd` prints `~/shop` where a real shell prints the full path. Simulator scope: her call.
- Git Lab: `write <file> <text>` and `pr open` are lab-only commands (no real equivalents typed that way). On a phone the console shows only two lines. Detective mode was not played this run.
- Modle: the Web, PHP and C++ buttons can be selected but hold no content yet (only a tooltip says so). The home shows "4 due" on a first visit before anything was practised. The subnet puzzle asks for the "smallest prefix" where it means the longest prefix that still fits.
- Opsle: `labs/opsle.html` is out of step with its sources. A plain rebuild with `tools/opsle/build.js` changes about 250 lines, because the Pockle banks it bundles (junle, junos-lab, pyle-pocket) were edited after the last Opsle build. Not rebuilt, since the change is too large to check by eye. Its bank list also lacks proxle, meridian and syncle.
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
- Proxle, small realism gaps, not changed: `ip -br a` and `ip addr show vmbr0` print the full `ip a` (the real `-br` is a one-line-per-interface table); `vzdump ... --compress zstd` echoes the job line without `--compress zstd`; `ping` without `-c` stops by itself after three replies (a real ping runs until Ctrl+C); `pveversion -v` prints the same single line as `pveversion` (the real one lists every package); `cat /etc/hosts` on the laptop says the file does not exist.
- Pockle bank for Modle holds one Python card (`print("code"[-1])`). Modle has its own Python section, so it was left; say so if Math should stay code-free.
- Repo weight: `labs/img/junle-room/rack-front.png` (4.9 MB), `labs/img/pyle/office-car.png` (1.8 MB) and `labs/img/junle-room/room.png` (1.5 MB) are not referenced by any lab (the labs use the .webp versions). Not deleted; her call.
- `LOOP_LOG.md` and `tools/proxle/LOG.md` still mention old scheduled tasks ("Proxle night loop") that could not be deleted from inside a run. They are disabled; she can delete them by hand.
- Spelle: the four Delve drills have prose hints, not runnable ones; on Delve III the wall follower runs past the 600-step limit without the key. Looks intended for a final challenge; left alone.

## Entries

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
