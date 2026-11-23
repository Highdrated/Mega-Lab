# ComfyUI queue

Prompts waiting for a session that can reach Kaatje's desktop and her local ComfyUI. Newest on top. Mark an item `status: done` once the image is placed and she has approved it. Never name an artist, a copyrighted character or a game asset in a prompt.

## 2026-11-23-1 · Spelle · dungeon panel backdrop
- file: `labs/img/spelle/dungeon-depths.webp`
- why: on the quest screen the small painted map floats in a flat black box (`#dungeon-sheet`, #0d0b09); most of the panel is empty void, so the first quests feel like a tiny strip in the dark.
- size: 1200x1400, no transparency (it sits behind the tiles, which cover the middle)
- existing art to match: top-down painted dungeon tiles in grey stone blocks with moss and cracks, iron rings in the walls, a small green-hooded hero with a staff, a swirling blue portal in a brass ring, warm brazier light; muted, semi-realistic painterly game-tile style.
- positive: top-down view into a deep dark dungeon chamber, rough grey stone walls with moss fading into shadow at every edge, a few distant braziers casting small warm pools of orange light near the corners, scattered rubble and old bones at the margins, faint blue magical haze drifting low, the centre an even calm dark stone floor with no objects, strong vignette to near black at the borders, painterly fantasy game art, soft brushwork, muted grey, moss green and ember orange palette, low contrast so tiles on top stay readable
- negative: text, letters, runes that read as words, logo, watermark, characters, hero, monsters, doors, stairs, bright light in the centre, cartoon, anime, photo, high contrast, saturated colours, perspective side view, frame
- placing: `#dungeon-sheet` in `labs/spelle.html`: keep `background: #0d0b09` as the fallback colour and add `url(img/spelle/dungeon-depths.webp) center / cover`. The grid (`#grid`) stays on top unchanged.
- status: todo

## 2026-11-22-1 · Proxle · Create the cluster scene
- file: `labs/img/proxle/create.jpg`
- why: Create the cluster shows `cluster.jpg`, a hall where every stone is lit, while the story is a cluster of one node; the scene says the opposite of the lesson.
- size: 1400x583, no transparency (JPEG like the other Proxle scenes)
- existing art to match: Proxle's scenes are painted interiors of an ancient temple-like hall: tall dark teal stone pillars with carved knotwork, each with a glowing cyan crystal slot at its heart, warm amber sunlight and candle glow, a sandstone domed ceiling, reflective stone floor, cinematic low camera, soft volumetric light. `ready.jpg` shows one stone awake; `cluster.jpg` shows a ring of them all lit.
- positive: wide painted fantasy interior, a circular stone hall with a ring of tall dark teal carved pillars, only ONE pillar in front glows bright cyan from a crystal slot, with thin faint threads of cyan light reaching from it toward two dark unlit pillars waiting beside it, the rest of the ring in shadow, warm amber light from a high window, candle flames, sandstone dome, polished stone floor reflecting the single glow, low cinematic camera, soft volumetric haze, rich detail, semi-realistic painterly style
- negative: text, letters, runes that read as words, logo, people, characters, modern computers, cables, cartoon, flat vector, emoji, blurry, oversaturated, every pillar lit, watermark, frame
- placing: in `labs/proxle.html`, function `scenePick`, the map entry `create:['cluster', ...]` would become `create:['create', ...]` so the banner (`#scene`, layers `i` with `backgroundImage`) loads `img/proxle/create.jpg`. One-word code change when the image is placed.
- status: todo

## 2026-11-21-3 · Modle · networking hub card icons (set of 4, needs her yes first)
- file: `labs/img/modle/net-terminal.webp`, `net-hardware.webp`, `net-exam.webp`, `net-scenarios.webp`
- why: the Modle networking hub is four dark text cards whose only pictures are typed symbols (`>_`, a box, a diamond, a warning sign); it reads as a placeholder next to the painted labs.
- size: 320x320 each, transparent background
- existing art to match: Modle has no painted art yet; its only character is the small golden-yellow cat drawn in simple shapes. The networking page is near-black (#14161b) with thin grey card borders, amber headings and mono type. Keep the set in the same painterly style as the queued Modle home hero (item 2026-11-20-9) so both fit.
- positive: a single small object as a painterly fantasy icon, centred, slight three-quarter view (swap per file: a brass-framed glowing terminal slate with amber runes, a small rack-mounted network switch with softly glowing port lights and one patch cable, a wax-sealed scroll with an amber diamond seal, a cracked server rack lantern giving off a thin wisp of red smoke), soft brushwork, semi-realistic, warm amber glow against deep navy shadows, gold and violet accents, clean silhouette that reads at 48 px
- negative: text, letters, numbers, logo, brand names, watermark, emoji style, flat vector, cartoon outlines, chibi, photo, background scenery, frame, border, drop shadow box
- placing: would replace the `.app-glyph` div in each `a.app` card in `labs/modle/network/index.html`, styled in `labs/modle/network/net.css`; needs an `<img>` at about 40 px per card, so her yes first.
- status: todo

## 2026-11-21-2 · Webble · path step icons (set of 5, needs her yes first)
- file: `labs/img/junie/step-school.webp`, `step-target.webp`, `step-seal.webp`, `step-replay.webp`, `step-toolbox.webp`
- why: the four "Your path" cards on Home and the Toolbox button use emoji (book, dartboard, arrows, toolbox) where the rest of the page has Junie, the painted axolotl; she dislikes emoji and these are the first thing under the title.
- size: 256x256 each, transparent background
- existing art to match: Junie in `labs/img/junie/` (soft sage-green axolotl with pink gills, gentle painted shading, no hard outlines, cream page #f4f2ee, accent orange-red #ff4d1c).
- positive: a single small object as a soft painted sticker, centred, slight three-quarter view (swap per file: an open book with a ribbon bookmark, a small round archery target with one arrow, a wax seal stamp pressing an orange-red seal, a looping ribbon arrow, a little wooden toolbox with brass corners), gentle storybook illustration, soft brush shading, warm light from the upper left, palette of sage green, cream and orange-red, clean silhouette that reads at 24 px
- negative: text, letters, numbers, logo, watermark, emoji style, flat vector, thick black outlines, photo, background scenery, drop shadow box, clutter
- placing: would replace the emoji in the `.how` cards (`labs/webble.html`, the `['📖','School',...]` list near "Your path", shown in `.how em`, font-size 20px) and the Toolbox button; needs a small wiring change to use `<img>` at about 28 px, so her yes first.
- status: todo

## 2026-11-21-1 · Meridian · ticket queue banner (needs her yes first)
- file: `labs/img/meridian/banner-tickets.webp`
- why: the Tickets tab is two text rows on a plain cream page; it is where she spends her working time in Meridian and has no sense of the ship at all.
- size: 1800x360, no transparency
- existing art to match: no Meridian images exist yet; follow the style line in `labs/img/meridian/PROMPTS.md` and items 2026-11-19-3 and -4 (calm painterly science fiction, cream, brass and muted teal). The interface is cream (#f1f0eb) with dark teal buttons and thin grey rules.
- positive: the operations deck below the bridge of a long-haul starship seen in a wide low view, a long curved desk with soft teal status screens, brass rails, warm cream panels, a slow star field through a long window, ticket slips glowing faintly on a board, quiet early-shift light, wide empty calm area on the right for text, painterly science fiction concept art, calm and elegant, soft cinematic light, muted palette of cream, brass and teal, high detail
- negative: text, letters, numbers, logo, watermark, people, faces, crowd, neon, harsh contrast, clutter, photo, dark gloomy mood
- placing: not wired; would sit above `TICKET QUEUE` on the Tickets tab of `labs/meridian.html`, full width of the 900 px list column, about 180 px tall with `object-fit:cover`. Needs a small wiring change, so her yes first.
- status: todo

## 2026-11-20-12 · Junos Lab · front door backdrop (needs her yes first)
- file: `labs/junos-lab/img/front-door.webp`
- why: the first screen of the Junos Lab is a dark card on plain black; the lab she spends most time in has no world behind it, while Junle's room is fully painted.
- size: 1920x1080, no transparency
- existing art to match: none in this folder. The interface is near-black with thin grey lines, green accents for the start buttons and amber for the rank title, monospaced text. Junle's room (`labs/img/junle-room/`) is the sibling: a warm, painted fantasy tower room with a rack and candle light.
- positive: a quiet night watch room at the top of a stone tower, rows of softly glowing network racks built into carved alcoves like bookshelves, thin green status lights and a few amber ones, cables running in neat bundles along the vaulted ceiling, a large dark empty area in the centre for a card, moonlight through one narrow window, painterly fantasy illustration, soft brushwork, semi-realistic, near-black and deep teal palette with green and amber accents, very low contrast
- negative: text, letters, logo, watermark, people, faces, real brand marks, neon, harsh contrast, photo, clutter, bright centre
- placing: would sit under the front door card as the background of `#resume` in `labs/junos-lab/css/` (line with `#resume{position:fixed;inset:0;...}`), darkened so the card stays readable; not wired, look change.
- status: todo

## 2026-11-20-10 · Codex · volume header strips (set of 10, needs her yes first)
- file: `labs/img/codex/vol-junos.webp`, `vol-python.webp`, `vol-web.webp`, `vol-js.webp`, `vol-php.webp`, `vol-git.webp`, `vol-shell.webp`, `vol-sql.webp`, `vol-hexle.webp`, `vol-passle.webp`
- why: the Codex is the one page in the Workshop with no art at all: grey panels, a white rail and text, which reads as an office manual next to labs that each have a world.
- size: 1600x280 each, no transparency
- existing art to match: none on this page. The interface is a pale blue-grey paper look with a serif title, thin rules and one accent colour per volume (rust for Junos, green for Python, violet for HTML and CSS, amber for JavaScript).
- positive: a wide shelf in an old wizard's library seen straight on, one large leather-bound book standing open in the middle with a single glowing emblem on its page (swap per volume: a small castle switch rack, a coiled garden snake, a stained glass window, a lightning rune, a copper cooking pot, a branching tree, a seashell, a stack of wooden drawers, a witch's hut, a bistro table), dust in a beam of light, painterly fantasy illustration, soft brushwork, semi-realistic, muted blue-grey palette with one warm accent colour, calm empty space on the right third, low contrast so text can sit above it
- negative: text, letters, readable runes, logo, watermark, people, cartoon outlines, anime, photo, neon, harsh contrast, clutter
- placing: would sit behind the title block of each volume (`.vol-head` in `labs/codex.html`), faded toward the text; not wired, look change.
- status: todo

## 2026-11-20-11 · Codex Microsoft · volume header strips (set of 10, needs her yes first)
- file: `labs/img/mscodex/vol-connect.webp`, `vol-pipeline.webp`, `vol-entra.webp`, `vol-tap.webp`, `vol-exchange.webp`, `vol-script.webp`, `vol-sharepoint.webp`, `vol-incident.webp`, `vol-ircmd.webp`, `vol-formulas.webp`
- why: same page shell as the Codex and just as bare; it is the PowerShell companion to Syncle but shares none of its Memory Corridor look.
- size: 1600x280 each, no transparency
- existing art to match: Syncle's backdrop, a white cave of hexagonal cells with thin grey wireframe lines and pale blue light (`labs/img/syncle/`), clean and geometric.
- positive: a bright white corridor built from hexagonal cells, thin grey wireframe edges, pale blue glow from the far end, one floating geometric object in the middle distance (swap per volume: three doors, a glass pipe, a ring of small figures as plain pawns, an hourglass, an envelope, a scroll of lines, a folder stack, a cracked hexagon in red, a toolbox, a set of measuring rods), clean geometric 3D illustration, soft shadows, white and pale grey palette with a single blue accent, calm empty space on the right third
- negative: text, letters, logo, watermark, real brand marks, people, faces, dark background, fantasy forest, clutter, photo, harsh contrast
- placing: would sit behind the title block of each volume (`.vol-head` in `labs/mscodex.html`), faded toward the text; not wired, look change.
- status: todo

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
