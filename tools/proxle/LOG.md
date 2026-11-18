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

## Her latest feedback (16:00 to 16:15)

- "make the servers look like they do on junos lab and add the variety as well keep it all in juniper".

- "its huge now i feel attacked visually": keep the canvas zoomed out by default and devices small. Never scale the room to fill a wide column.
- "not all servers look like this": the server is one generic 1U diagram with every port on one face. She wants variety and realism in how hardware looks.
- "lets focus on juniper": network gear should be Juniper, drawn and behaving like in her Junos lab (labs/junos-lab: Add menu with real EX and SRX models, port grid, MGT, CON, PWR, link colours, rack that gear snaps into). Juniper does not make servers; servers stay generic x86.

## Backlog
0. The Add menu now places Juniper switches (EX2300-C-12T, EX2300-24P, EX3400-24T, EX4300-48T) and routers or gateways (SRX300, MX104, MX204) on the floor: movable, rack-mountable in a free space without rails, with ge ports, MGT, CON and an AC inlet, link colours, and an Amnesiac serial console. They are physical objects only. Give them a purpose an objective or ticket can check: day-zero setup of a new switch over CON (root password, hostname, management address, a servers VLAN), a second switch for a redundant uplink, an SRX as the site gateway. Use real Junos commands and keep the Junos lab's rule: if real Junos rejects it, the lab rejects it.
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

