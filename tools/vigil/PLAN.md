STATUS: BUILD - she said "continue the build" on 24 Nov 2026.
MERGE: WAIT - build on the vigil branch only. Nothing goes to main until this line says MERGE: GO (her call, after she reviews).

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

## Her quality rule (24 Nov 2026, the most important one)
"take your time and each time you finish an output review it yourself for those goals and then once you think you are sure i can review - at the moment you are sending me stuff to review when you already know there are mistakes in there or some stuff not immersive"
- Before anything reaches her: play every path you touched, right and wrong; check every fact against Microsoft Learn; screenshot at 1280x800, 1440x900 and 1920x1080 and actually look; fix overlap, clipping, cut text and anything cheap or plain. Only then report.
- "if it does not work in real life it should not work here": every console, form and admin page refuses what the real one refuses, with the real error text. Real-but-unsimulated commands and parameters say so plainly instead of pretending.

## Short lessons and typing (24 Nov 2026)
- "make sure there isnt too much to learn in one go": each School step is split into short lessons (LESSONS in data.js), at most 3 facts each; every fact still appears once.
- "there is very little typing": every lesson has a typed recall check (TYPED in data.js); cases include typing (search boxes, forms, the PowerShell window). New cases must include typing too.
- Mistakes (wrong typed answers, wrong places, wrong case actions, PowerShell errors) are saved as oopsies (S.miss). They must feed Pockle and Syncle once Vigil lives in the Mega Lab ("i can practice my mistakes there too as well as here and pockle").
- Syncle already teaches Graph PowerShell (connect, users, groups, licences, bulk, investigate). Vigil links to it instead of re-teaching it.

## Look (24 Nov 2026)
- Orbital direction everywhere (see feedback below).
- The Observatory is an advanced technical blueprint, her reference: the Sinbad scene where Eris enters. Constellation line-work (one constellation per skill group), degree scales, gauges, dimension lines, a title block, ring text with the exam name. Paper skin by default, Night chart skin with glowing lines. Keep new screens in this blueprint spirit where it fits.

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
- node tools/vigil/build.js writes tools/vigil/out/vigil-demo.html (demo, key vigil.demo.v1, seeded, case always open for review) and labs/vigil.html (the real lab, key vigil.v1, starts empty). node tools/vigil/build.js <path> writes only the lab, to that path.
- The lab is registered in js/labs.config.js (tag Practice, mid orbit at 77 degrees), tracked in js/station.js (vigil.v1), and sw.js CACHE is workshop-v124 on this branch (labs.config.js ?v=27, station.js ?v=5). At merge time, bump again if main has reached the same number.
- Published demo: https://claude.ai/artifact/SQanZ4NmczQjzyihJJR7jh

## Her feedback on the demo
- 24 Nov 2026: "something feels missing" - she picked more life on screen and a daily loop, and asked for both to go into this daily run. Added as stages 2 and 3, right after making the lab real.
- 24 Nov 2026: tenant page too long, too little typing, observatory too simple, self-review before sending. DONE 24 Nov: short lessons, typed checks, PowerShell window with real errors, typed site search, blueprint observatory with Paper and Night chart, oopsies log, tools/vigil/test.py (ALL OK).
- 24 Nov 2026: "i like it but it feels heavy theme wise - i love minimal orbital was my favorite because of how minimal it was so could we keep that minimal theme going ... it does not have to match completely but same direction would be nice". DONE 24 Nov: restyled to the Orbital direction (white panels, hairlines, system sans, teal #0f8fa8 and orange #e0701a, charcoal chips with an orange underline, dot-grid background). Keep this direction for everything new.
- 24 Nov 2026: the ladder rule above. DONE 24 Nov in the School (LADDER, builds on, Lumen words, Graph PowerShell split out into step 4).

## Build stages (one per daily run, top unchecked first)
- [x] School in short lessons with typed checks, Lumen words beside the Lens, learning ladder (24 Nov 2026).
- [x] Case "The salary ledger" with a strict SharePoint Online PowerShell window and typed site search (24 Nov 2026).
- [x] 1. (24 Nov 2026) Make the lab real: labs/vigil.html built from tools/vigil (build.js gets an output argument), progress in localStorage key vigil.v1 (lit, seen, read, miss, sl, skin), register it in js/labs.config.js (tag Practice or a new Microsoft tag, check how the launcher groups tags first), track it in js/station.js, add it to sw.js. tools/vigil/test.py must run against the built lab too. Do NOT merge to main while PLAN says MERGE: WAIT.
- [x] 2. (24 Nov 2026, extra run 1) More life on screen (her pick, 24 Nov 2026: "something feels missing"). Keep it calm and Orbital, never busy, no mouse-follow or parallax, everything off under prefers-reduced-motion.
   - Sound: Junle-style soft synth effects made with the Web Audio API (no audio files): tick on a correct typed answer, low thud on a wrong one, a short chime when a star lights, a save click in the admin centers, a soft keyboard tick in the PowerShell window. A sound toggle in the header, off by default, remembered in vigil.v1.
   - Motion: a star that lights up flares and draws its constellation line; gauge needles sweep to their new value; the readiness number counts up; a lesson's progress dot fills; Save in an admin center shows a real-looking "Saving..." then a green "Changes saved" bar, like the real Microsoft 365 admin centers.
   - The case world reacts: characters reply in the ledger after real delays (Magister Thessaly answers the access review, Quillon thanks you), sites show state chips that change (Restricted content discovery: On), and a Copilot test panel lets her ask Copilot the steward's question again before and after the fix and see the answer change.
   - Keeper Mirethil and Lumen react to what she does (a short line after a right streak, after a wrong turn, after a step is finished), plain words, one sentence.
   - Self-review every effect at 1280, 1440 and 1920 in Paper and Night chart; extend test.py (sound off by default, toggle remembered, reduced motion respected, the Copilot answer changes after the fix).
- [ ] 3. A daily loop (her pick, 24 Nov 2026): a Tonight screen that is the first thing she sees.
   - Tonight's watch: oopsies to redo first (her own wrong typed answers, wrong places, wrong case actions and PowerShell errors from vigil.v1 miss), then the next School lesson, then one short case or a 5-question trial round. A clear end: "Watch complete".
   - Spaced review: an oopsie answered right comes back after 1, 3 and 7 days, then leaves the list. Typed again from memory, not multiple choice.
   - Grind: a nightly streak, starlight for each finished watch, ranks, and a small reward at 3, 7 and 14 nights (an unlock such as a new chart skin or a Keeper line).
   - Progress lives in vigil.v1; a missed night breaks the streak but never deletes progress.
   - Self-review and extend test.py (due items appear, a right answer schedules the next review, the streak counts and resets correctly).
- [ ] 4. Pockle bank tools/pockle/banks/vigil.js: tap-only cards for all 11 School steps (recall first, short), plus "Vigil oopsies" from vigil.v1 miss shown first, like Juniper oopsies. Keep tools/pockle/test.py green.
- [ ] 5. Syncle: a new sequence for the AB-650 PowerShell that Syncle lacks: guest invitations (New-MgInvitation), administrative units, PIM role eligibility requests, mail contacts (New-MailContact), SharePoint Online (Connect-SPOService, Set-SPOSite -RestrictContentOrgWideSearch). Vigil oopsies of kind "ps" show up there. Verify every cmdlet, parameter and error text on Microsoft Learn first. Change tools/syncle sources and rebuild with build.py; keep every Syncle test green.
- [ ] 6. Cases for identities and sign-in (the heaviest domain): 6 cases, strict, with typing (forms and PowerShell), each saying which School steps it builds on.
- [ ] 7. Cases for Defender and Purview: 6 cases.
- [ ] 8. Cases for Copilot, agents and Agent 365: 8 cases.
- [ ] 9. Cases for tenant and workloads: 6 cases.
- [ ] 10. Trial question bank: at least 150 questions spread by the exam weights; 50-question timed mock; readiness from mock results; "book the exam" gate at 80% three days in a row.
- [ ] 11. An exam-day checklist, and ComfyUI queue items where art would add immersion.

## Daily run log
(newest first)
- 24 Nov 2026 (extra run 1 of 4): stage 2 done, more life on screen. What she will notice: a Sound button in the header (off by default, remembered in vigil.v1) with soft Web Audio sounds (tick when right, low thud when wrong, chime when stars light, a click on Save, quiet key ticks in PowerShell and Copilot); newly studied or mastered stars flare and their constellation line draws in orange when she comes back to the Observatory; gauge needles sweep, the readiness number counts up and the domain bars grow; a lesson dot fills when the lesson is done; Save in an admin center panel shows Saving... with a spinner, then a green Changes saved bar; a third workstation app, Microsoft 365 Copilot, where she asks the steward's question herself (she is in Everyone except external users too) and sees the wages ledger quoted, then still quoted right after the fix (the index has to catch up), then gone; Quillon and Magister Thessaly reply in the ledger as character lines; Lumen says one line after three right in a row, after a wrong answer and after a finished step; Keeper Mirethil's Observatory line follows what she last finished, and Tonight's watch now points at the first unfinished step. Real-life fixes from Microsoft Learn (restricted-content-discovery page, updated 11 Oct 2026): the site toggle is now named "Restrict content from Microsoft Copilot" (was "Restricted content discovery"); RCD also hides recently used files; large sites (over 500,000 items) can take more than a week, shown in the ledger. Self-review fixes: the exam chip ran off the header at 1440 once the Sound button arrived (subtitle and pass line now only above 1600px); the admin panel slid in again on every click (now only when it opens). Verified: test.py ALL OK on demo and lab, new checks for sound off by default, toggle remembered, no sound while off, reduced motion (no sweep, no line draw, values at once), lines drawn after a step, Copilot answer before / during / after the fix, Quillon's reply, the real toggle name, Saving... then Changes saved, header and side column fit at six sizes; screenshots looked at for School, Observatory (Paper and Night, mid-animation), Copilot before and after, Saving and Saved at 1280, 1440 and 1920. Not verified, kept generic: the exact wording of the save bar ("Saving...", "Changes saved") and the Copilot address shown as https://m365.cloud.microsoft/ (domain only, no deeper path). The Copilot window answers only the steward's question and says so plainly. Needs her: nothing; MERGE: WAIT stays.
- 24 Nov 2026 (daily run): stage 1 done. Vigil is a real lab now: labs/vigil.html, saved in vigil.v1 (lit, seen, read, miss, sl, skin, plus pos for the School lesson she was on and caseDone). Registered in the Workshop under Practice, tracked by the station, CACHE bumped to workshop-v124. What she will notice: the lab starts empty; the salary ledger case is sealed until School steps 5 and 8 are done (a lock screen on the workstation, two progress rows with Open step); the School reopens on the lesson she left; a solved case can be replayed for practice without new starlight; wrong or skipped Trial answers now go to the oopsies (the Trial no longer promises Pockle before stage 4 exists); the trial button says "5-question round", not demo. Fixes found in self-review: the exam chip poked out of the header at 1440 (name now on one line above 1380px); the Observatory side column was clipped inside the Workshop tab at 1280 (compact spacing under 820px tall); disabled Edge/PowerShell/mode buttons now look disabled. Verified: test.py runs every path on both the demo and the lab (ALL OK), plus layout checks at 1280x766/800, 1440x866/900, 1920x1046/1080; screenshots looked at for Observatory (Paper and Night), locked, half-done and open case, case closed, Trial, and the Workshop with Vigil open in its tab at all three sizes. No new exam facts today. The Keeper line after a solved case now names her real next School step instead of always saying agents. Still rough: the demo artifact keeps the case open even though the lab seals it. Needs her: nothing new; MERGE: WAIT stays until she says "merge Vigil".
- 24 Nov 2026 (live session): School split into 53 short lessons (max 3 facts) with a typed check each; blueprint observatory with Paper and Night chart; PowerShell window for Connect-SPOService, Get-SPOSite, Set-SPOSite with real errors (no connection, wrong URL, bad URI, Boolean conversion, ambiguous and unknown parameters, LockState enum); typed site search; oopsies saved; tools/vigil/test.py ALL OK. Checked at 1280, 1440 and 1920.
