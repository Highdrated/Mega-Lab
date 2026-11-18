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

## Her latest feedback (16:00)

- "its huge now i feel attacked visually": keep the canvas zoomed out by default and devices small. Never scale the room to fill a wide column.
- "not all servers look like this": the server is one generic 1U diagram with every port on one face. She wants variety and realism in how hardware looks.
- "lets focus on juniper": network gear should be Juniper, drawn and behaving like in her Junos lab (labs/junos-lab: Add menu with real EX and SRX models, port grid, MGT, CON, PWR, link colours, rack that gear snaps into). Juniper does not make servers; servers stay generic x86.

## Backlog
0. Grow the Bring in menu into a Junos-lab-style Add menu with a purpose in the story: a second Juniper switch for a redundant uplink, different server models (1U, 2U with more disks, a small tower) with correct front and rear faces, a UPS. Every added device must have a reason an objective or ticket can check.

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

