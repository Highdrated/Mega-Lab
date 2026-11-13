# Improvement loop — 13 Nov 2026

Goal: make the Mega Lab more efficient, immersive and motivating. One focused change per cycle, tested headless, pushed live.

## Done

- **Cycle 1 (15:00)** Launcher star map: labels no longer overlap (auto-nudge), lab subtitles only show on hover, ring sector labels only show when that ring is lit. Health sweep of all 23 labs: no JS errors.
- **Cycle 1b (15:20)** Launcher **Quick run**: one button above Today walks through every due item in order; slim run bar in the tab strip (progress dots, next ›, ×); finish = +3 sparks and a toast. Service worker already caches CDN libraries (sql.js, php-wasm, pyodide) after first online load — offline item closed.
- **Cycle 2 (16:30)** Station **weekly goal**: 7 day-pips (Mon–Sun) on the station strip and in the panel; feeding Junie on 5 days in a week pays a one-time +10 sparks bonus with a toast. Meridian art: `labs/img/meridian/PROMPTS.md` lists the 8 Gemini prompts with exact file names (3 theme backdrops, header strip, 4 crew portraits) — drop the .webp files in and the lab uses them automatically.
- **Cycle 3 (17:55)** Learn-first audit of all 23 labs (contact sheet of first screens): almost all teach before asking. Fixed the odd one out — **Poshle Forge** now opens every case with a *Learn first* card (concept, a different worked example, one tip) while the broken script waits blurred; after "Got it" or solving, it folds into a one-line Concept reminder (no hand-holding once flowing).
- **Cycle 4 (19:20)** **Junos Lab** fresh start: next to the 21-question diagnostic there's now an equal "Or: start from lesson 1" button that opens unit 1's reading straight away. Choosing it switches daily shifts on (no diagnostic nagging); a small "Placement test whenever you like" link stays on the card. Junos test suite: 5633 passed, coverage + soak clean.
- **Cycle 5 (20:40)** Launcher **comeback warm-ups**: any lab (not the Codex references) untouched for 4+ days gets a "Warm-up · back after N days" item in Today — the two longest-neglected first, so Quick run naturally rotates through labs you've drifted from. Today no longer says "Diagnostic" for Junos once you chose lessons-first. Phone check at 390px: Quick run and the run bar fit cleanly.

## Backlog (next cycles pick from the top)

5. Junle room: more ticket NPCs (fantasy names only)
8. Check each lab's keyboard flow: Enter/Ctrl+Enter submits everywhere, focus lands in the input after "next"
