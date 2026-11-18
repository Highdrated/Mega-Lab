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

## Her latest feedback (16:00 to 16:15)

- "make the servers look like they do on junos lab and add the variety as well keep it all in juniper".

- "its huge now i feel attacked visually": keep the canvas zoomed out by default and devices small. Never scale the room to fill a wide column.
- "not all servers look like this": the server is one generic 1U diagram with every port on one face. She wants variety and realism in how hardware looks.
- "lets focus on juniper": network gear should be Juniper, drawn and behaving like in her Junos lab (labs/junos-lab: Add menu with real EX and SRX models, port grid, MGT, CON, PWR, link colours, rack that gear snaps into). Juniper does not make servers; servers stay generic x86.

## Backlog
0. Juniper gear, next steps (day-zero setup of a new switch over CON is done, see Cycles). Still open: put ge ports in the servers VLAN and make the link to sw-west-01 a real uplink, so a server cabled to sw-west-02 works; `set system services ssh` and an ssh login to the switch from the desk; `commit confirmed` with its automatic rollback; an SRX as the site gateway. sw-west-01's own console is still two buttons: give it the same typed CLI. Keep the Junos lab's rule: if real Junos rejects it, the lab rejects it.
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

