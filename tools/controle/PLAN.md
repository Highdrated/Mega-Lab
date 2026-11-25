# Controle (Exam SC-500)

Exam: SC-500, Implementing End-to-End Security Controls for Cloud and AI Workloads.
Purpose: pass SC-500. Nothing else carries over from Vigil: own look, own loop.

## Direction (chosen 25 Nov 2026)
- World: Duskhold, a citadel at dusk. Every lantern on its walls is one exam skill (87).
- Look (25 Nov, after she found the dark theme heavy): light warm paper, dark ink text, colour only where it means something (gold = lit lantern, ember = action or warning). No dark or blue backgrounds. Content first, theme quiet.
- Loop: Day (short forge lessons) -> Night (siege: real attack patterns, set real controls) -> Morning (damage report, oopsies).
- Helper: Wick, the lamplighter.
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

## Status
- [x] Demo 1: Gatehouse day (5 lessons) and night 1 (password spray, Conditional Access). tests: python3 tools/controle/test.py
- [x] Big drawn citadel replaced by six icon cards with lantern dots, and three road rows for the siege
- [ ] Optional painted backdrop (ComfyUI, see ART.md) once she wants one
- [x] Day 2 and night 2: PIM (eligible vs active, approval, least privilege, emergency keys) against stolen sessions. Outcomes: held, contained, breached
- [ ] Next nights: consent phishing and app registrations (Gatehouse), Key Vault leaked secret (Vault)
- [ ] Into the Workshop, oopsies into Pockle

MERGE: WAIT (goes live when Kaatje says "merge Controle")
