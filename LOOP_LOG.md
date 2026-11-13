# Improvement loop — 13 Nov 2026

Goal: make the Mega Lab more efficient, immersive and motivating. One focused change per cycle, tested headless, pushed live.

## Done

- **Cycle 1 (15:00)** Launcher star map: labels no longer overlap (auto-nudge), lab subtitles only show on hover, ring sector labels only show when that ring is lit. Health sweep of all 23 labs: no JS errors.
- **Cycle 1b (15:20)** Launcher **Quick run**: one button above Today walks through every due item in order; slim run bar in the tab strip (progress dots, next ›, ×); finish = +3 sparks and a toast. Service worker already caches CDN libraries (sql.js, php-wasm, pyodide) after first online load — offline item closed.
- **Cycle 2 (16:30)** Station **weekly goal**: 7 day-pips (Mon–Sun) on the station strip and in the panel; feeding Junie on 5 days in a week pays a one-time +10 sparks bonus with a toast. Meridian art: `labs/img/meridian/PROMPTS.md` lists the 8 Gemini prompts with exact file names (3 theme backdrops, header strip, 4 crew portraits) — drop the .webp files in and the lab uses them automatically.

## Backlog (next cycles pick from the top)

4. Per-lab "learn first" check: every lab's first screen teaches before it asks (Nov feedback: trying first breaks immersion)
5. Junle room: more ticket NPCs (fantasy names only)
