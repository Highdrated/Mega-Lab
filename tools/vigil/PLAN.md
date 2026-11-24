STATUS: DEMO - waiting for Kaatje's review of the demo. Do not build new stages yet.

# Vigil - the lab for Exam AB-650

Exam: AB-650, Administering Microsoft 365 and AI Services
Certification: Microsoft 365 Certified: Microsoft 365 and AI Services Administrator Associate
Pass mark 700 of 1000, 100 minutes, renew every 12 months.
Exam page: https://learn.microsoft.com/en-us/credentials/certifications/ai-services-administrator-associate/
Study guide: https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ab-650

Goal in her words: "by the end of the lab i can take the exam and pass". The exam name must stay visible in the lab at all times.

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
The Vigil, a sky observatory of the Halcyon tenant. The brass orrery is the tenant: inner, middle and outer rings are domains 1, 2 and 3; 58 stars are the 58 skills in the study guide. Keeper Mirethil runs the observatory. Lumen the moth gives hints. Cases come from the household: Quillon Ashgrove (steward), Magister Thessaly (treasurer) and others with fantasy names.

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
(add her notes here, dated)

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
