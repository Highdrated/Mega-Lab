# Mega Lab nightly log

First line is checked every night: if it reads HOLD, the run changes nothing and stops.

## Deep-check rotation

Top three are next. Tonight's three move to the bottom. Pockle is not in the list (it is checked every night).

1. pyle (needs the CDN, see note)
2. sleeple (needs the CDN, see note)
3. passle (needs the CDN)
4. seqle (needs the CDN)
5. rebble (needs the CDN)
6. codex
7. mscodex
8. junle (19 Nov)
9. spelle (19 Nov)
10. shelle (19 Nov)
11. junos-lab (19 Nov, evening)
12. meridian (19 Nov, evening)
13. proxle (19 Nov, evening)
14. hexle (20 Nov)
15. webble (20 Nov)
16. syncle (20 Nov)
17. git-lab (20 Nov, morning)
18. modle (20 Nov, morning)
19. opsle (20 Nov, morning)

Note for the rotation: the nightly sandbox cannot reach cdn.jsdelivr.net or Google Fonts. Pyle and Sleeple (pyodide), Passle and Rebble (php-wasm) and Seqle (sql.js) cannot run their code here, so a deep pass on them is limited to reading, layout and whatever works without the runtime. Those labs are skipped until a run can reach the CDN (checked again on 20 Nov, morning: still blocked); the next labs that can run are taken instead.

## Pockle numbers (20 Nov morning, 390x844, touch)

| Group | Cards | First visit can reach | With sample progress |
|---|---|---|---|
| Juniper Oopsies | 22 (+ live mistakes) | 22 | 22 |
| Junle | 73 | 73 | 73 |
| Junos Lab | 155 | 155 | 155 |
| Proxle | 34 | 0 | 10 |
| Meridian | 32 | 0 | 14 |
| Subnle Pocket | 66 | 0 | 25 |
| Pyle | 143 | 0 | 29 |
| Pyle Pocket | 694 | 0 | 226 |
| Sleeple | 63 | 0 | 24 |
| Passle | 155 | 0 | 40 |
| Seqle | 88 | 0 | 29 |
| Hexle | 110 | 0 | 10 |
| Webble | 116 | 0 | 22 |
| Spelle | 85 | 0 | 20 |
| Rebble | 116 | 0 | 26 |
| Git Lab | 75 | 0 | 29 |
| Shelle | 81 | 0 | 21 |
| Syncle | 56 (30 added 20 Nov morning) | 0 | 11 |
| Modle | 90 | 0 | 30 |

- Total 2254 cards. A first visit on a phone reaches 250, all Juniper; with sample progress in every lab 816 are open. The other 2004 are locked until that lab has progress on the same device, and lab progress lives per device. This is why it feels empty on the go.
- Due today on a first visit: 0. Today's reviews shows three 5-card warm-ups (15 cards, about three minutes), then nothing new is asked for; Pocket mix and Sprint stay available.
- Python tab: 16 lessons, 1 open on a first visit. Subnetting tab: 16 steps, 1 open. Both tap-only, no typing fields anywhere.
- No blank or dead-end states found. No horizontal scroll. No console errors.
- The OPEN button on a locked lab row is a link to that lab, not a way to unlock its cards. Sixteen of nineteen rows are greyed out on a first visit.
- Launcher labs with no rehearsal set in Pockle: only the two Codex references. Fewest cards now: Meridian 32, Proxle 34, Syncle 56.
- Syncle covers its sequences up to incident response. Sequences 9 (scripts), 10 (real world) and 11 (Teams, added 20 Nov midday) have no cards yet.
- Already true from her earlier wishes: per-lab Today's reviews, Juniper rehearsals open without lab progress, Juniper Oopsies shown first, recall-first with hidden options, fluency labels (shaky, slow, fluent), one dragon per lab group. The Math group shows no Python code any more (one code card in the Modle bank, to recheck).
- `tools/pockle/test_pockle.py` is flaky: it expects a "think first" button on every card, and build, order, bug and trace cards have none. `tools/pockle/test.py` plays every lab and every card kind and ends with ALL OK.

## Pockle ideas (max five, waiting for her yes or no)

1. Open every lab on the phone. A "try any lab" switch so cards do not wait for lab progress on this device. She would feel: there is always something for the subject I feel like. Size: small.
2. Dragons that grow. XP earned in a lab group feeds that group's dragon through a few stages, shown on the home screen. She would feel: every five minutes on the train makes something bigger. Size: medium (needs art, items go in the ComfyUI queue).
3. A lair instead of a list. A painted roost as the home backdrop with the dragons perched in it, the lab list folded under one button. She would feel: a place to be, not a settings page. Size: medium (backdrop is item 2026-11-19-1 in the queue).
4. Train ride run. One button, five minutes, a clear end, and a small chest of sparks that also counts at the Workshop station. She would feel: a short session that finishes and pays out. Size: small to medium.
5. Bring my progress. When Pockle finds no lab progress on this device, one clear button that explains Send to phone, instead of sixteen greyed-out rows. She would feel: less locked out. Size: small.

## Open findings (listed, not done)

- Push access: the runs of 19 and 20 November could not push. Their work (the patch `claude/mega-lab-nightly-2026-11-20b.patch` in the Mega Lab project) was applied by hand on top of main on 20 Nov midday and pushed, so it is live now; do not re-apply that patch. If a run still cannot push, write the exact git error into this log and the report.
- Git Lab: a mission step wants the exact commit message from the briefing; your own wording commits but the step stays put. `git branch <name>`, `git restore .`, `git restore --staged <file>`, `git merge --no-ff` and options after the ref (`git reset HEAD~1 --soft`) are answered with "unknown command" or a pathspec error although they are real. Adding commands to the simulator is a feature: her call.
- Git Lab: after `git init` the lab always says branch `main`. Real git names the first branch `master` unless `init.defaultBranch` is set or you type `git init -b main`. One line in mission 0 could say so: her call.
- Git Lab: `write <file> <text>` and `pr open` are lab-only commands (no real equivalents typed that way). On a phone the console shows only two lines. Detective mode was not played this run.
- Modle: the Web, PHP and C++ buttons can be selected but hold no content yet (only a tooltip says so). The home shows "4 due" on a first visit before anything was practised. The subnet puzzle asks for the "smallest prefix" where it means the longest prefix that still fits.
- Opsle: `labs/opsle.html` is out of step with its sources. A plain rebuild with `tools/opsle/build.js` changes about 250 lines, because the Pockle banks it bundles (junle, junos-lab, pyle-pocket) were edited after the last Opsle build. Not rebuilt, since the change is too large to check by eye. Its bank list also lacks proxle, meridian and syncle.
- Opsle: on a first visit all four missions are locked and there is nothing to do on the page.
- Shelle: the prompt always reads `user@mbp ~ %`, also after `cd ~/Projects` and `cd station-site`. A real zsh prompt shows the folder. Fixing it means tracking the folder across steps: engine change, needs her yes.
- Spelle: 22 of 25 example boxes in the brief are wider than the 290 px brief column and scroll sideways, so the first lesson's "name, argument" diagram is cut off. Widening the brief column changes the layout: her decision.
- Spelle: the four Delve drills have prose hints, not runnable ones. Looks intended for a final challenge; left alone.
- Webble: 69 emoji of 27 kinds (header buttons, console hints, brief, path cards, easing lab, gym, four lesson texts). She hates emoji; replacing them changes the look, so it waits for her yes.
- Hexle: at 1440 px several labels are cut with an ellipsis ("Target 1 / 43" shows as "TARGE…", plot titles 04, 07, 12, Project VI, the "From memory" button). Fixing it means resizing the bar: look change.
- Hexle: target 1 step 9 "Close every tag" is already green on the starter and on empty input. Two drills show the answer as placeholder text (`function tick() {}`, `function render() {}`). Tourney (flexbox and grid) is open on a first visit, before any CSS is taught. Design choices, her call.
- Webble: between about 760 and 1217 px wide the header runs off the right edge (toolbox, sound and export buttons). The Work screen at phone width is cramped. Both need a layout decision.
- Webble: the warm-up restarts at 1/10 after a reload even when it was finished. A snap with no transition is reported as "opacity doesn't change at all", which misleads.
- Syncle: the "count" recall accepts a bare `3` (this is the one failing case in `tools/syncle/test.js`). The "connect" recall asks for "without the welcome text" but passes without `-NoWelcome`. Tightening either changes what the drill demands: her call.
- Syncle: several Graph commands take the user as a bare first word (`Update-MgUser x`); the real module wants `-UserId`. Not changed.
- Junle room: the first ticket visitor (Veylin) slides in a second or two after sitting down and covers an app that was just opened (seen with Rehearse and Terminal on a first visit). Not sure it is a bug; the story may want this.
- Junle room: `#wx-mist` is a 400% wide layer that keeps animating at opacity 0. Page scroll is clipped so nothing shows, but it holds a large layer in memory. Not changed (weather design).
- Meridian: `backdrop-promenade.webp` and `hero-school.webp` give a 404 on every load; portraits and two more backdrops are missing too. All in the ComfyUI queue (items 2026-11-19-3, 4, 7 to 12).
- Proxle, small realism gaps, not changed: `ping` without `-c` stops by itself after three replies (a real ping runs until Ctrl+C); `pveversion -v` prints the same single line as `pveversion` (the real one lists every package); `cat /etc/hosts` on the laptop says the file does not exist.
- Pockle bank for Modle holds one Python card (`print("code"[-1])`). Modle has its own Python section, so it was left; say so if Math should stay code-free.
- Repo weight: `labs/img/junle-room/rack-front.png` (4.9 MB), `labs/img/pyle/office-car.png` (1.8 MB) and `labs/img/junle-room/room.png` (1.5 MB) are not referenced by any lab (the labs use the .webp versions). Not deleted; her call.
- `LOOP_LOG.md` and `tools/proxle/LOG.md` still mention old scheduled tasks ("Proxle night loop") that could not be deleted from inside a run. They are disabled; she can delete them by hand.

## Entries

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
