# Controle (Exam SC-500)

Exam: SC-500, Implementing End-to-End Security Controls for Cloud and AI Workloads.
Purpose: pass SC-500. Nothing else carries over from Vigil: own look, own loop.

## Direction (chosen 25 Nov 2026)
- World: Duskhold, a citadel at dusk. Every lantern on its walls is one exam skill (87).
- Look (25 Nov, after she found the dark theme heavy): light warm paper, dark ink text, colour only where it means something (gold = lit lantern, ember = action or warning). No dark or blue backgrounds. Content first, theme quiet.
- Loop: Day (short forge lessons) -> Night (siege: real attack patterns, set real controls) -> Morning (damage report, oopsies).
- Helper: Wick, the lamplighter, with an Ask Wick hint ladder. Every new lesson must build on an earlier one, and every new term (like VNet) must be explained before a night uses it.
- No mouse-follow or parallax.
- SVG only for small icons, never large drawn buildings or scenes (25 Nov). Big scenery only as painted art.

## Map of the citadel
| Part | Exam area |
|---|---|
| Gatehouse | Entra: PIM, Conditional Access, MFA, app identity, consent, managed identities |
| Vault | Key Vault |
| Keep | Governance: Azure Policy, RBAC, locks, backup, IaC |
| Walls | Storage, databases, networking |
| Towers | AI security, servers and VMs, app platforms |
| Watchtower | Defender for Cloud, Sentinel, Security Copilot |

## Layout (26 Nov)
- Slim icon rail on the left: Days, then the six parts of the citadel with lit counts. Each opens a flyout (skills list, or the day picker).
- Content sits in one calm centred column (max 780px). Roads appear above it during the console, siege and report.
- Motion: screens glide in once per view (never on redraws), the forged answer glows, a rail icon lights up when a night is won. Off under reduced motion.
- Day picker: replay lessons of any reached day, or the night of any day whose lessons are done.

## Code map
- One chapter table, CH, holds each night: lessons, waves, studied and lit lanterns, brief, console, evaluate, report texts. A new night is one CH entry plus its data, nothing else.
- test.py plays every night at 4 sizes; probe.py checks edge cases (reset mid-siege, keyboard flow, answer typing, oopsie counting, old saves).

## Status
- [x] Demo 1: Gatehouse day (5 lessons) and night 1 (password spray, Conditional Access). tests: python3 tools/controle/test.py
- [x] Big drawn citadel replaced by six icon cards with lantern dots, and three road rows for the siege
- [ ] Optional painted backdrop (ComfyUI, see ART.md) once she wants one
- [x] Day 2 and night 2: PIM (eligible vs active, approval, least privilege, emergency keys) against stolen sessions. Outcomes: held, contained, breached
- [x] Day 3 and night 3: consent phishing, delegated vs application, user consent settings, permission classifications, admin consent workflow, old grants
- [x] Day 4 and night 4: managed identities (system vs user-assigned), control vs data plane, smallest scope, deleting a leaked client secret. Gatehouse complete (6/6)
- [x] Day 5 and night 5 (Vault, part one): permission models, Key Vault roles, networking and private endpoint, soft delete, purge protection, Delete lock
- [x] Ask Wick: a hint ladder in every lesson (where to look, first letters, answer) and every night (where to look, what to change, exact fix)
- [ ] Next: Vault part two (keys, secrets and certificates incl. rotation, Defender for Key Vault, secret scanning with Defender CSPM)
- [ ] Into the Workshop, oopsies into Pockle

MERGE: WAIT (goes live when Kaatje says "merge Controle")
