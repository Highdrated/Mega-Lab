STATUS: DEMO - waiting for Kaatje's review of the demo. Do not build new stages yet.

# Vigil - the lab for Exam AB-650

Exam: AB-650, Administering Microsoft 365 and AI Services
Certification: Microsoft 365 Certified: Microsoft 365 and AI Services Administrator Associate
Pass mark 700 of 1000, 100 minutes, renew every 12 months.
Exam page: https://learn.microsoft.com/en-us/credentials/certifications/ai-services-administrator-associate/
Study guide: https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ab-650

Goal in her words: "by the end of the lab i can take the exam and pass". The exam name must stay visible in the lab at all times.

## Ladder rule (her words, 24 Nov 2026)
"the next lesson is a gradual step from the previous so i should not learn about entra then jump to shell scripts the next ladder step - the user or me should already have a general idea of which direction to go in otherwise the helper nearby"
- The School follows LADDER in data.js, not the exam's order: 1 tenant, 2 identities, 3 sign-in, 4 Graph PowerShell, 5 workloads, 6 Defender, 7 Purview, 8 Copilot, 9 agents, 10 agent guard, 11 monitoring.
- Every step has a "builds on" line naming the earlier steps it rests on, and Lumen's new-words box (gloss) for terms it introduces.
- A new tool (like PowerShell) only comes after the same job was done by hand.
- Cases say which School steps they build on, and only unlock after those steps.
- Inside a step, lessons and checks also go from familiar to new, one idea at a time.

## How she learns best (from Hexle, the Junos lab and Pockle)
- Taught first, then tried. Never thrown in cold.
- Strict: if it would not work in real life, it does not work in the lab.
- Scenarios that start from a half-built world, getting harder by level.
- A visual aid next to the work (the Lens and the scrying glass).
- Grinding: starlight, ranks, stars that light up, coming back.
- Immersion is what she values most: "so immersed it's almost a game". High quality only.
- Pockle for on the go: tap only, recall first.
- No emoji, no code comments, fantasy names only, plain easy sentences.

## The world
The Vigil, a sky observatory of the Halcyon tenant. The brass orrery is the tenant: inner, middle and outer rings are domains 1, 2 and 3; 58 stars are the 58 skills in the study guide. Keeper Mirethil runs the observatory. Lumen the moth gives hints. Stars: orange = studied, teal = mastered, hollow = still dark. Look: Orbital direction (see feedback). Cases come from the household: Quillon Ashgrove (steward), Magister Thessaly (treasurer) and others with fantasy names.

## Screens
- Observatory: the orrery, readiness by domain, tonight's watch, rank.
- School: one lesson per skill group (10), "Where it lives" rows that light up the path in the Lens (a real-looking admin center), Remember, Watch out, Who may do it, recall-first quick check.
- Cases: a letter from a character, goals, a real-looking admin center in the scrying glass, a ledger of actions, Guided or Exam mode, Lumen hints (three per goal).
- Trial: timed mock exam with flags, a score out of 1000 and every answer explained.
- Star chart: all 58 skills by domain and group.

## Sources
- tools/vigil/data.js: exam facts, domains, admin center trees, the 10 lesson groups, the 58 skills.
- tools/vigil/demo.template.html: the demo page.
- node tools/vigil/build.js writes tools/vigil/out/vigil-demo.html.
- Published demo: https://claude.ai/artifact/SQanZ4NmczQjzyihJJR7jh

## Her feedback on the demo
- 24 Nov 2026: "i like it but it feels heavy theme wise - i love minimal orbital was my favorite because of how minimal it was so could we keep that minimal theme going ... it does not have to match completely but same direction would be nice". DONE 24 Nov: restyled to the Orbital direction (white panels, hairlines, system sans, teal #0f8fa8 and orange #e0701a, charcoal chips with an orange underline, dot-grid background). Keep this direction for everything new.
- 24 Nov 2026: the ladder rule above. DONE 24 Nov in the School (LADDER, builds on, Lumen words, Graph PowerShell split out into step 4).

## Build stages (one per daily run, only after STATUS says BUILD)
- [ ] 1. Make the lab real: labs/vigil.html built from tools/vigil (template + data), progress in localStorage key vigil.v1, register it in js/labs.config.js, track it in js/station.js, bump sw.js. Add tools/vigil/test.py (Playwright, ALL OK).
- [ ] 2. School depth: split each group into 2 to 3 short lessons; 6 hand-written recall-first checks per group; spaced review of missed checks.
- [ ] 3. Cases for domain 2 identities and sign-in (the heaviest domain): 6 cases, strict, in the scrying glass.
- [ ] 4. Microsoft Graph PowerShell console for bulk work (Connect-MgGraph with scopes, Get-MgUser -All, New-MgUser, Update-MgUser), real errors for wrong scopes.
- [ ] 5. Cases for Defender and Purview: 6 cases.
- [ ] 6. Cases for Copilot, agents and Agent 365: 8 cases.
- [ ] 7. Cases for domain 1 tenant and workloads: 6 cases.
- [ ] 8. Trial question bank: at least 150 questions spread by the exam weights; 50-question timed mock; readiness from mock results; "book the exam" gate at 80% three days in a row.
- [ ] 9. Pockle bank tools/pockle/banks/vigil.js for on the go.
- [ ] 10. Sound (Junle-style), an exam-day checklist, and ComfyUI queue items for a Keeper portrait and observatory backdrops.

## Daily run log
(newest first)
