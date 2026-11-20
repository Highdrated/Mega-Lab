# ComfyUI queue

Prompts waiting for a session that can reach Kaatje's desktop and her local ComfyUI. Newest on top. Mark an item `status: done` once the image is placed and she has approved it. Never name an artist, a copyrighted character or a game asset in a prompt.

## 2026-11-20-7 · Git Lab · hangar backdrop (needs her yes first)
- file: `labs/img/git-lab/hangar.webp`
- why: Git Lab has no art at all; the Flight Path panel is an empty dark box until the first commit, and the whole lab reads as a plain console.
- size: 1920x1080, no transparency
- existing art to match: none in this lab. The interface is charcoal and navy with amber labels and a "nav console" voice (missions, flight path, station).
- positive: the inside of a quiet starship hangar seen from a raised control deck, one small courier ship resting on the pad, amber guide lights along the floor, soft haze, a large dark empty area in the upper centre for a diagram, painterly science fantasy illustration, soft brushwork, charcoal and deep navy palette with warm amber accents, low contrast
- negative: text, letters, logo, watermark, people in the foreground, real brand marks, neon, harsh contrast, photo, clutter
- placing: would sit behind the commit graph in the FLIGHT PATH panel of `labs/git-lab.html`, darkened so the graph stays readable; not wired, look change.
- status: todo

## 2026-11-20-8 · Opsle · mission banners (set of 4)
- file: `labs/img/opsle/mission-ticket-triage.webp`, `mission-site-status.webp`, `mission-onboarding-intake.webp`, `mission-ops-portal.webp`
- why: the four mission cards are grey text boxes; the only art on the page is one small Junie with a wrench, so a locked first visit looks empty.
- size: 960x320 each, no transparency
- existing art to match: `labs/img/junie/junie-wrench.webp`, a small sage-green axolotl with pink gills holding a wrench, soft painterly storybook brushwork on a light background.
- positive: a small sage-green axolotl with pink feathery gills at work (swap per card: sorting a pile of paper tickets into three trays; watching a wall of four glowing status lanterns, one red; welcoming new arrivals at a wooden desk with name tags; loading a crate onto a small cargo boat at a pier), wide banner composition with calm empty space on the right, soft painterly storybook illustration, gentle brushwork, light warm palette with sage and coral
- negative: text, letters, logo, watermark, cartoon outlines, anime, photo, humans, dark background, clutter
- placing: top of each mission card in `tools/opsle/template.html`; needs one `<img>` per card, so ask her first.
- status: todo

## 2026-11-20-9 · Modle · home screen hero
- file: `labs/img/modle/home-hero.webp`
- why: the Modle home is text and buttons on flat navy; the only character is a small drawn cat in the corner, and she finds plain screens dull.
- size: 1200x400, transparent background
- existing art to match: a small golden-yellow cat mascot drawn in simple shapes (`labs/modle/js/progress/cat.js`), navy background, gold and violet accents.
- positive: a small golden-yellow cat sitting on a stack of old books in a wizard's study at night, glowing gold numbers and simple symbols floating up from an open book, a violet lantern, painterly fantasy illustration, soft brushwork, semi-realistic, deep navy and gold palette with violet accents, soft edges that fade out, transparent background
- negative: text that reads as words, logo, watermark, cartoon outlines, chibi, anime, photo, harsh contrast, frame, border
- placing: above the title on the home screen (`labs/modle/js/screens/home.js`); needs one `<img>`, so ask her first.
- status: todo

## 2026-11-20-1 · Hexle · orbital village plots (set of about 8)
- file: `labs/img/hexle/<name>-orbital.webp`, one per plot that has no orbital art yet (use the plot names already in `ART`, line 589 of `labs/hexle.html`)
- why: in the orbital theme only the path, shop, market and witch have art; plots 4 and 6 show as near-black silhouettes and plots 7 to 12 as grey sketches with black smudges, so one village mixes three looks.
- size: 480x480 each, transparent background
- existing art to match: clean dark-grey line illustration on white, flat, no shading, isometric three-quarter view, one small building or object per tile.
- positive: a single small witch-village building (swap per plot: herb hut, well, bridge, cauldron stall, owl tower, bakery, greenhouse, gate), isometric three-quarter view, clean dark grey line illustration, even line weight, flat, no fill, no shading, centred with a little margin, transparent background
- negative: colour, shading, gradients, texture, pixel art, text, letters, watermark, people, ground plane, shadow, photo
- placing: register each file in `ART_O` (line 590 of `labs/hexle.html`); the village already reads from it.
- status: todo

## 2026-11-20-2 · Hexle · Grimoire project cards I to IV
- file: `labs/img/hexle/project-1.webp` to `project-4.webp`
- why: the four project cards all show the same witch as a stand-in.
- size: 480x480 each, transparent background
- existing art to match: grove theme, detailed pixel art in isometric three-quarter view, moss greens and stone greys, warm amber windows.
- positive: a small themed object for a witch's project (swap per card: a spread of tarot cards on a cloth, a potion shelf, a hanging shop sign, a spell scroll with a wax seal), detailed pixel art, isometric three-quarter view, moss green and stone grey palette with warm amber light, crisp pixels, transparent background
- negative: text, letters, readable runes, watermark, people, smooth painting, blur, photo, background scene
- placing: the `art` of each project target (`tg.art`, resolved through `ART`, line 589 of `labs/hexle.html`).
- status: todo

## 2026-11-20-3 · Hexle · grove finale witch, cheering
- file: `labs/img/hexle/witchcheer.webp`
- why: on the grove finale card the witch renders about 50 px tall beside a 150 px hut, and the grove theme has no cheer pose while the ink theme does.
- size: 312x572, transparent background
- existing art to match: `labs/img/hexle/witchpng.png`, the grove witch in detailed pixel art, moss green robe, pointed hat.
- positive: the same small witch in a moss green robe and pointed hat, full body, both arms raised in a cheer, a few amber sparks above her staff, detailed pixel art, isometric three-quarter view, crisp pixels, transparent background
- negative: text, watermark, extra limbs, second character, smooth painting, blur, photo, background scene
- placing: `.finale .fwitch` in `labs/hexle.html`.
- status: todo

## 2026-11-20-4 · Webble · gym hub header
- file: `labs/img/webble/gym-hero.webp`
- why: the gym hub and all gym screens have no art at all, while Home has Junie swimming next to the title.
- size: 640x400, transparent background
- existing art to match: Junie, a small sage-green axolotl with pink gills and a cream belly, soft painterly storybook brushwork (`labs/img/junie/*.webp`).
- positive: a small sage-green axolotl with pink feathery gills and a cream belly lifting a tiny dumbbell made of two river pebbles, determined happy face, a few bubbles, soft painterly storybook illustration, gentle brushwork, warm off-white and coral accents, transparent background
- negative: text, letters, watermark, cartoon outlines, anime, photo, human, gym machines, dark background
- placing: the `.ghero` block of the gym hub (around line 5446 of `labs/webble.html`); needs one `<img>` there, so ask her first.
- status: todo

## 2026-11-20-5 · Webble · empty console
- file: `labs/img/webble/console-empty.webp`
- why: the Work screen is plain and office-like; the empty console is a blank box.
- size: 480x200, transparent background
- existing art to match: Junie as above.
- positive: a small sage-green axolotl with pink gills asleep on a smooth river stone, a tiny lantern beside it, soft painterly storybook illustration, muted warm palette, lots of empty space on the right, transparent background
- negative: text, letters, watermark, cartoon outlines, anime, photo, bright saturated colours
- placing: background of `#cons` when it has no lines (look change, ask her first).
- status: todo

## 2026-11-20-6 · Webble · sharper Junie on Home
- file: `labs/img/junie/junie-swim@2x.webp`
- why: the Home hero shows Junie at 158 px wide from a 200x119 source, so it is soft on a retina screen.
- size: 400x238, transparent background
- existing art to match: the current swimming Junie on Webble Home; same pose, same colours.
- positive: a small sage-green axolotl with pink feathery gills and a cream belly swimming to the left, tail curved, friendly face, soft painterly storybook illustration, gentle brushwork, transparent background
- negative: text, watermark, cartoon outlines, anime, photo, different pose, background
- placing: `.jnhero` image in `labs/webble.html` (line 81); swap the file name only.
- status: todo

## 2026-11-19-7 · Meridian · portrait of Linnea
- file: `labs/img/meridian/npc-linnea.webp`
- why: the ticket queue shows the initials LM instead of a face; she is the first crew member a new player meets.
- size: 512x512, no transparency
- existing art to match: none yet in this lab; items 3 and 4 below set the look (calm painterly science fiction, cream, brass and navy).
- positive: head and shoulders portrait of a ship's purser, a precise woman in her thirties, neat dark bob, crisp cream uniform jacket, holding a slim tablet, faint polite smile, plain dark backdrop, painterly science fiction concept art, calm and elegant, soft cinematic light, muted palette, high detail
- negative: text, letters, logo, watermark, cartoon, anime, photo, extra people, hands near face, harsh contrast, neon
- placing: already wired; `face()` in `labs/meridian.html` loads `img/meridian/npc-<id>.webp` and falls back to initials.
- status: todo

## 2026-11-19-8 · Meridian · portrait of Odran
- file: `labs/img/meridian/npc-odran.webp`
- why: initials stand in for the chief engineer, who brings most tickets.
- size: 512x512, no transparency
- existing art to match: none yet in this lab; items 3 and 4 below set the look (calm painterly science fiction, cream, brass and navy).
- positive: head and shoulders portrait of a starship chief engineer, a broad man in his forties with a short beard, rolled sleeves, a grease mark on his cheek, a headset around his neck, friendly but tired, plain dark backdrop, painterly science fiction concept art, calm and elegant, soft cinematic light, muted palette, high detail
- negative: text, letters, logo, watermark, cartoon, anime, photo, extra people, hands near face, harsh contrast, neon
- placing: already wired; `face()` in `labs/meridian.html` loads `img/meridian/npc-<id>.webp` and falls back to initials.
- status: todo

## 2026-11-19-9 · Meridian · portrait of Seraphine
- file: `labs/img/meridian/npc-seraphine.webp`
- why: initials stand in for the captain.
- size: 512x512, no transparency
- existing art to match: none yet in this lab; items 3 and 4 below set the look (calm painterly science fiction, cream, brass and navy).
- positive: head and shoulders portrait of a starship captain, a composed woman in her fifties, silver hair tied back, dark navy uniform with a single brass pin, calm steady eyes, plain dark backdrop, painterly science fiction concept art, calm and elegant, soft cinematic light, muted palette, high detail
- negative: text, letters, logo, watermark, cartoon, anime, photo, extra people, hands near face, harsh contrast, neon
- placing: already wired; `face()` in `labs/meridian.html` loads `img/meridian/npc-<id>.webp` and falls back to initials.
- status: todo

## 2026-11-19-10 · Meridian · portrait of Tamsin
- file: `labs/img/meridian/npc-tamsin.webp`
- why: initials stand in for the comms officer.
- size: 512x512, no transparency
- existing art to match: none yet in this lab; items 3 and 4 below set the look (calm painterly science fiction, cream, brass and navy).
- positive: head and shoulders portrait of a young starship comms officer with cropped auburn hair, a slim softly glowing earpiece, focused expression, layered grey uniform, plain dark backdrop, painterly science fiction concept art, calm and elegant, soft cinematic light, muted palette, high detail
- negative: text, letters, logo, watermark, cartoon, anime, photo, extra people, hands near face, harsh contrast, neon
- placing: already wired; `face()` in `labs/meridian.html` loads `img/meridian/npc-<id>.webp` and falls back to initials.
- status: todo

## 2026-11-19-11 · Meridian · night watch backdrop
- file: `labs/img/meridian/backdrop-nightwatch.webp`
- why: the Night watch theme has no backdrop and falls back to a flat colour.
- size: 1920x1080, no transparency
- existing art to match: none yet in this lab; items 3 and 4 below set the look (calm painterly science fiction, cream, brass and navy).
- positive: a starship observation promenade during the night watch, lights dimmed to deep charcoal, a few amber console glows, stars bright through tall windows, calm and focused, painterly science fiction concept art, calm and elegant, soft cinematic light, muted palette, high detail
- negative: text, letters, logo, watermark, people, clutter, neon, photo
- placing: already wired; the theme backdrop code loads `img/meridian/backdrop-nightwatch.webp`.
- status: todo

## 2026-11-19-12 · Meridian · bridge backdrop
- file: `labs/img/meridian/backdrop-bridge.webp`
- why: the Bridge theme has no backdrop and falls back to a flat colour.
- size: 1920x1080, no transparency
- existing art to match: none yet in this lab; items 3 and 4 below set the look (calm painterly science fiction, cream, brass and navy).
- positive: a starship engineering bridge in deep navy blue, rows of server racks behind glass with tiny status lights, a curved window showing a gas giant, cool and precise, painterly science fiction concept art, calm and elegant, soft cinematic light, muted palette, high detail
- negative: text, letters, logo, watermark, people, clutter, neon, photo
- placing: already wired; the theme backdrop code loads `img/meridian/backdrop-bridge.webp`.
- status: todo

## 2026-11-19-1 · Pockle · home screen backdrop
- file: `labs/img/pockle/lair-night.webp`
- why: the home screen is a flat grey list; the only art is one 80 px dragon badge, so there is no world to open the app for.
- size: 864x1536, no transparency
- existing art to match: four small, skinny, semi-realistic painted dragons (night blue with teal wing membranes, jade, ember, pearl) on round starry badges, soft painterly brushwork, not cartoony.
- positive: a quiet dragon roost high in a stone tower at night, seen in portrait, a round window onto a deep blue starry sky, small perches and nests of woven rope along the walls, a few glowing teal lanterns, scattered scrolls and brass instruments, empty calm space in the upper two thirds for interface cards, painterly fantasy illustration, soft brushwork, semi-realistic, gentle rim light from the lanterns, palette of midnight blue, teal and warm brass, low contrast so text stays readable
- negative: text, letters, logo, watermark, people, cartoon, chibi, anime, photo, harsh contrast, bright white, clutter, frame, border
- placing: new `background-image` on `.app` (or `#home`) in `tools/pockle/pockle.template.html`, darkened with a gradient; needs her yes first because it changes the look (see Pockle ideas in LOG.md).
- status: todo

## 2026-11-19-2 · Pockle · result screen dragon
- file: `labs/img/pockle/dragon-night-cheer.webp`
- why: the result screen reuses the idle badge, so a clean run and a bad run look the same.
- size: 512x512, no transparency (round starry badge like the others)
- existing art to match: `labs/img/pockle/dragon-night.webp`, a small skinny night-blue dragon with teal wing membranes on a round starry badge.
- positive: the same small, skinny night-blue dragon with teal wing membranes, wings half spread, head lifted, a tiny spark of teal fire at its mouth, proud and pleased, centred on a round badge with a deep starry sky behind it, painterly fantasy illustration, semi-realistic, soft brushwork, cool blue and teal palette with one warm highlight
- negative: text, letters, watermark, cartoon, chibi, anime, big eyes, fat body, extra limbs, extra wings, photo, frame
- placing: `#resImg` in `tools/pockle/pockle.template.html` when accuracy is 90% or more.
- status: todo

## 2026-11-19-3 · Meridian · promenade backdrop
- file: `labs/img/meridian/backdrop-promenade.webp`
- why: the lab requests this file on every load and gets a 404; the default theme falls back to a plain colour.
- size: 1920x1080, no transparency
- existing art to match: none yet in this lab; the style is set in `labs/img/meridian/PROMPTS.md` (calm painterly science fiction, muted palette).
- positive: the observation promenade of a long-haul starship, warm cream walls and brushed brass rails, tall windows onto a slow star field, a quiet systems console in the foreground, morning light, light and airy, painterly science fiction concept art, calm and elegant, soft cinematic light, muted palette, high detail
- negative: text, letters, logo, watermark, people, crowd, clutter, neon, harsh contrast, photo
- placing: already wired; the theme backdrop rule in `labs/meridian.html` loads `img/meridian/backdrop-promenade.webp`.
- status: todo

## 2026-11-19-4 · Meridian · lesson header strip
- file: `labs/img/meridian/hero-school.webp`
- why: 404 on every load; the lesson header shows a drawn placeholder shape instead of art.
- size: 1720x300, no transparency
- existing art to match: same style line as item 3.
- positive: a long horizontal view along the hull of a sleek long-haul carrier ship drifting past a pale planet, small lit windows along the side, wide empty space on the left for text, soft and minimal, painterly science fiction concept art, calm and elegant, soft cinematic light, muted palette
- negative: text, letters, logo, watermark, people, busy detail on the left third, neon, photo
- placing: already wired; `heroArt()` in `labs/meridian.html` uses `img/meridian/hero-school.webp`.
- status: todo

## 2026-11-19-5 · Spelle · title screen
- file: `labs/img/spelle/title-grimoire.webp`
- why: the title screen is a plain parchment card with no art, while the dungeon behind it has painted stone tiles, a hooded hero and a glowing portal.
- size: 1600x900, no transparency
- existing art to match: top-down painted dungeon tiles in grey stone with moss, a small green-hooded hero with a staff, a swirling blue portal in a brass ring.
- positive: an open spellbook on a worn stone lectern at the mouth of a dungeon stair, a green-hooded apprentice with a staff seen from behind looking down the steps, a faint swirling blue portal glow far below, torchlight on grey mossy stone, parchment and warm candle tones in the foreground, painterly fantasy illustration, soft brushwork, centre left kept calm for a title card
- negative: text, letters, runes that read as words, logo, watermark, cartoon, anime, photo, gore, bright saturated colours
- placing: `background-image` behind the title card (the first full-screen overlay in `labs/spelle.html`), under the existing parchment card.
- status: todo

## 2026-11-19-6 · Shelle · backdrop (needs her yes first)
- file: `labs/img/shelle/backdrop-harbor.webp`
- why: Shelle is a white, office-style page with no art at all; she finds plain scenes dull. No element uses an image yet, so this is a look change and waits for her decision.
- size: 1920x1080, no transparency
- existing art to match: none in this lab. Suggested world: a fantasy harbour, because the lab ships containers.
- positive: a fantasy harbour at dusk seen from a harbourmaster's desk, wooden cranes lifting rune-marked cargo crates onto tall ships, lanterns along the quay, calm water, a large dark empty area in the centre for a terminal window, painterly fantasy illustration, soft brushwork, deep teal and amber palette, low contrast
- negative: text, letters, logo, watermark, modern ships, real brand marks, people in the foreground, photo, harsh contrast
- placing: would sit behind the terminal in night theme only; not wired.
- status: todo
