# Proxle improvement log

Lab file: `labs/proxle.html` (single file). Test: `python3 tools/proxle/test.py` must end with `ALL OK`.

## House rules

- Full immersion: if it does not work in real life, it does not work in the lab. Nothing is pre-filled, pre-plugged or pre-named unless the story says someone did it.
- Learning first: every scenario teaches before it asks. Every objective keeps a "why, and what if you skip it" and two hint levels (nudge, then exact steps).
- One focused change per cycle. Test, then push.
- No emojis. No code comments. Orbital theme stays the default. No real company or colleague names.

## Done

- 18 Nov: nine scenarios (Build, Run, Protect). Install scenario has a desk laptop (browser, downloads, USB writer, IP register, planning sheet, terminal), a server room with a movable rack view, cable types, rails, power feeds, console trolley, switch CON port with serial console, server MGT port with remote management page and virtual media.

- 18 Nov 16:10: the server room is now a Junos-lab-style canvas. It opens zoomed out, scroll zooms, dragging the floor pans, minus, plus and Fit buttons. Devices are drawn like the Junos lab (header band, model, name, small ports, lit ports and red or teal links). The switch is a Juniper EX2300-C-12T with ports counted from 0 (ge-0/0/0 to 11), MGT (me0), CON and PWR. Console trolley and laptop are no longer in the room at the start: she brings them in through the Bring in menu.

- 18 Nov 16:35: Add menu with Juniper switch and router models (extra links live in rack.xl, added devices in rack.devs); the server is drawn like the Junos lab server.

- 18 Nov 20:25: new scenario "Set up a new switch" (Build, second). The serial console on a new Juniper device is now a real typed Junos session (login, shell, cli, configure, set, delete, show, show | compare, commit, rollback, run, exit) instead of a fixed text. Day zero is checked by objectives: root password, host-name, me0 address, servers VLAN, reachable from the desk.

- 18 Nov 21:30: the Junos console answers `?` with the real context help, and Tab or space finishes a word.

- 18 Nov 22:15: the switch scenario now ends with ssh from the desk. `set system services ssh`, a user of her own (`set system login user ...`), and a real ssh session to the switch in the desk terminal.

- 18 Nov 23:20: `commit confirmed` with its automatic rollback. Two new objectives at the end of the switch scenario: lock yourself out on purpose and get rescued, then a real change that is confirmed in time.

- 19 Nov 00:20: access ports. `family ethernet-switching` with `interface-mode` and `vlan members` in the Junos engine, `show vlans` lists the ports under each VLAN, one new objective at the end of the switch scenario (now fourteen).

## Her latest feedback (16:00 to 16:15)

- "make the servers look like they do on junos lab and add the variety as well keep it all in juniper".

- "its huge now i feel attacked visually": keep the canvas zoomed out by default and devices small. Never scale the room to fill a wide column.
- "not all servers look like this": the server is one generic 1U diagram with every port on one face. She wants variety and realism in how hardware looks.
- "lets focus on juniper": network gear should be Juniper, drawn and behaving like in her Junos lab (labs/junos-lab: Add menu with real EX and SRX models, port grid, MGT, CON, PWR, link colours, rack that gear snaps into). Juniper does not make servers; servers stay generic x86.

## Backlog
0. Juniper gear, next steps (day-zero setup of a new switch over CON, ssh, `commit confirmed` and access ports are done, see Cycles). Still open: make the link to sw-west-01 a real uplink (a trunk port carrying the servers VLAN), so a server cabled to an access port of sw-west-02 really answers ping; an SRX as the site gateway. sw-west-01's own console is still two buttons: give it the same typed CLI. Keep the Junos lab's rule: if real Junos rejects it, the lab rejects it.
0b. Server variety: she said "not all servers look like this". Juniper makes no servers, so servers stay generic x86, drawn like the Junos lab server (SERVER label, glyph, power button top right). Add a second and third form (2U with more disk bays, a small tower) only where it teaches something, for example which disks go to the system mirror and which to storage.
1. Other eight scenarios still open straight in a terminal with the cluster diagram. Give them the same physical and desk context where it teaches something (add a node, a node dies, backups to the second site).
2. Proxmox web interface on port 8006 (simulated): create cluster, join, add storage and backup jobs by clicking, next to the CLI route.
3. Troubleshooting tickets with an injected fault and no step list: wrong gateway, cable in a guest port, one feed dead, no quorum, full backup storage.
4. Second and third server install with less help each time (spaced practice), ending in a three-node cluster built from boxes.
5. BMC: default DHCP address should be replaced by a fixed one from the register.
6. End-of-scenario recall: three short questions answered from memory before the scenario counts as done.
7. Touch support for dragging; keyboard path for every drag.
8. Launcher Today tab: deep links and a due item for Proxle.
9. Mistake log: what went wrong this run and the real-life consequence.

## Cycles

### 18 Nov 20:25 · Set up a new switch (backlog 0, first slice)
- Changed: new scenario `switch` with nine objectives. New Junos console engine (`jx`, state in `dev.j` with candidate and active configuration). The switch brings its own power cord. IP register lists sw-west-01 (192.168.0.2) and the address kept for sw-west-02 (192.168.0.3). `ping` answers for a switch only when me0 has the address with /24, is committed, powered and cabled to a server port. Desk and hands card show only what this job needs. Also fixed: register addresses no longer wrap in the middle, and one install hint still said "Bring in" where the menu is called Add.
- She will notice: a second Build scenario. She carries the switch in, screws it in, powers it, plugs the console cable, and types everything herself in a black console: `root`, `cli`, `configure`, `set ...`, `commit`. The prompt changes to `root@sw-west-02` after the commit.
- Real-life traps in it: commit without a root password fails with the real message; too short or all-lowercase password is refused; an address without /24 is accepted as /32 and the switch answers nobody; a second `set ... address` adds instead of replaces; pulling power loses everything that was not committed and the switch asks for the password afterwards; VLAN number must be looked up on sw-west-01 by moving the console cable; me0 in a guest port gives no ping.
- Verified: gate ALL OK (11 runs, the new one with the traps above). Real mouse drags for mounting, power cord and console cable, real keyboard typing in the console, screenshots at 1500x900 in both themes.
- Still rough: only the statements above plus `system services ssh`, `system time-zone` and addresses on other interfaces are known; any other valid Junos statement gets "syntax error". No `?` help and no Tab completion in the console (prefixes like `conf` and `sh ver` do work). Factory-default lines are left out of `show configuration`. The servers VLAN has no member ports yet, so the VLAN objective checks the number only. The boxed server sits unused in this scenario. Error wording is from memory of Junos 21.4, not checked on a device.

### 18 Nov 21:30 · Junos console: ? help and word completion (from "still rough" of the 20:25 cycle)
- Changed: typing `?` in the switch console lists what can come next at that exact spot, with the Junos one-line descriptions, and puts the line back so she can keep typing. Tab or space finishes a word when it is unique (`conf` becomes `configure`). Works in operational and configuration mode, after `run`, and inside `set` and `delete`. Learn first got a three-line block "Lost? Ask the switch", the command list got `?`, and the nudge for the root password objective now sends her to `set system ?` instead of naming the statement.
- She will notice: she no longer has to remember a statement. `set system ?` shows host-name, root-authentication, services, time-zone. `set vlans ?` shows that a name comes next. Nothing runs and nothing changes when she asks.
- Real-life traps in it: `set ?` in operational mode gives "No valid completions" because set only exists after `configure`; `show v` + Tab does nothing because version and vlans both fit; at the login and password prompts `?` is an ordinary character, so a password may contain one; in the shell (%) there is no help.
- Verified: gate ALL OK. New scripted checks in the switch run (help text, no change to the candidate, completion results) and a real-keyboard run at the end of the test (type, `?`, Tab, space, Enter, a password with `?` in it). Screenshot at 1500x900 read.
- Still rough: help only knows the statements the lab knows, so the lists are much shorter than on a real switch. Descriptions are from memory of Junos 21.4, not checked on a device. An ambiguous word followed by `?` on a real switch also lists hidden pipes and `<[Enter]>` in more places. sw-west-01's console is still two buttons.

### 18 Nov 22:15 · ssh to the switch from the desk, with a user of her own (backlog 0, second slice)
- Changed: two new objectives in "Set up a new switch" (now eleven). On the console: `set system services ssh` and `set system login user <name> class <class> authentication plain-text-password`. At the desk: `ssh <name>@192.168.0.3` opens a real Junos session inside the laptop terminal (same engine as the console, own mode, shared candidate, `?`, Tab and space work there too). The console login also accepts the new user. `set system services ssh root-login allow|deny|deny-password` exists. Learn first got two lines, the command list one.
- She will notice: after the ping she types ssh at her desk and the prompt turns into `kaatje@sw-west-02>`. From then on she can configure the switch without the cable.
- Real-life traps in it: ssh before the service is on gives "Connection refused" while ping works; root with the right password is still refused over ssh (Junos default is deny-password, checked against the Juniper remote access documentation); an unknown user gets the same "Permission denied" as a wrong password; a user without a class makes the commit fail and nothing of that commit goes live, ssh included; a read-only user gets in but `configure` is an unknown command for her; pulling the me0 cable during a session ends it with "Broken pipe" at the next line; the candidate is shared between the console and the ssh session.
- Verified: gate ALL OK. The switch run plays all traps above; a real-keyboard run types the ssh login, `?`, Tab, space and `conf` in the desk terminal. Screenshot at 1500x900 read.
- Still rough: ssh asks for the password once, a real client asks three times. `show configuration` does not show the `uid` Junos adds to a user. An empty `set system login user x` renders as `user x { }`. Login classes are the four built-in ones only; `full-name`, ssh keys and custom classes are unknown. The wording of the missing class commit error and of the class help lines is from memory, not checked on a device. sw-west-01 (192.168.0.2) still answers ssh with "No route to host". The desk terminal is narrow, so long Junos lines wrap.

### 18 Nov 23:20 · commit confirmed and the automatic rollback (backlog 0, third slice)
- Changed: `commit confirmed [minutes]` in the Junos engine (default 10, range 1 to 65535). The change goes live on trial. A plain `commit` or `commit check` keeps it. Otherwise the switch puts the previous configuration back by itself and prints the broadcast message on the console and in a live ssh session. The configuration prompt shows the countdown line above `[edit]`. One Junos minute is 15 real seconds, said in Learn first. Two new objectives in "Set up a new switch" (now thirteen), a Learn first block of three lines, one command line, one takeaway. `commit c` now says ambiguous instead of syntax error. A command that cuts her own ssh session no longer prints its output first.
- She will notice: at her desk she deletes the me0 address with `commit confirmed 1`. The session dies with Broken pipe, ping says unreachable, and about 15 seconds later ping answers again without anybody touching the rack. Then she sets the time zone with `commit confirmed`, sees the countdown line, and confirms with `commit`.
- Real-life traps in it: forget to confirm a good change and it is gone, with only the broadcast line as a warning; the same delete with a plain `commit` leaves the switch unreachable for good, fixed only at the rack over the console cable; `commit confirmed 0` is out of range; pulling the power during the trial brings the switch back on the old configuration; during a lockout the earlier "me0 address" objective opens again, because it is true again.
- Verified: gate ALL OK. The switch run plays the traps above with a test clock (`LAB.tick(minutes)`), and a real-keyboard run types `commit conf` + `?` + Tab + `1` in the ssh terminal and waits 16 real seconds for the rollback. Screenshots at 1500x900 read (ssh terminal, console, Learn first).
- Still rough: wording of the commit confirmed lines and the broadcast is from memory of Junos 21.4, not checked on a device. Rolling back after a power loss during the trial is what I believe Junos does, not verified. A second `commit confirmed` during a trial rolls back to the first trial, not to the last confirmed state. No `show system commit`, no `rollback 1`. `set system time-zone` accepts any text; real Junos only takes names from its list. The broadcast time uses the lab clock, which only moves when commands run. Waiting 15 seconds with nothing moving on screen may feel like a hang at the desk: a visible lab clock would help. Objectives after the current one are not visible, so she only learns about the safety net objective when she gets there.

### 19 Nov 00:20 · Access ports: put ge ports in the servers VLAN (backlog 0, fourth slice)
- Changed: the Junos engine knows `set interfaces ge-0/0/N unit 0 family ethernet-switching` with `interface-mode access|trunk` and `vlan members <name or number>`, in one line or apart, with `?` help and Tab. `show vlans` now lists the ports under each VLAN, one per line, with a star when a cable is in the port. Ports she has not moved are listed under default, VLAN 1. New last objective in "Set up a new switch": ports ge-0/0/0 and ge-0/0/1 in the servers VLAN, done from her desk over ssh. Learn first got a three-line block, the command list one line, one takeaway.
- She will notice: `run show vlans` shows all twelve ports under default. After two set lines and a commit, ports 0 and 1 have moved under servers.
- Real-life traps in it: a typo in the VLAN name is accepted by `set` and only refused at commit; a second `vlan members` adds a VLAN instead of replacing it, and Junos refuses an access port with two (wording checked: "Access interface can be part of only one vlan", "error: configuration check-out failed"); the VLAN number (20) works as well as the name; me0 cannot be a switch port; deleting a VLAN that a port still uses fails the commit; during a `commit confirmed` trial the job is not done, and after the rollback the ports are back in default, together with everything else in that commit; a port turned into a trunk no longer counts.
- Verified: gate ALL OK. The switch run plays the traps above over ssh and checks the star on the console after cabling port 0. Real-keyboard run types the line with Tab, space and `?` on the console. Screenshots at 1500x900 read (console and desk terminal).
- Still rough: the ports carry no traffic yet. A server cabled to ge-0/0/0 of sw-west-02 still reaches nothing, because there is no uplink to sw-west-01 (next slice: trunk). The wording of the "VLAN ... is not defined" commit error is from memory, not checked on a device. `show vlans` columns are narrower than on a real switch so they fit the desk terminal without wrapping. The console of sw-west-01 shows `show vlans` in an older, simpler layout. `vlan members` with a list in brackets, `interface-range`, `native-vlan-id` and the two SFP uplink ports are unknown. A bare `family ethernet-switching` renders with empty braces. Units other than 0 are accepted for switching.
