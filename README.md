# Workshop

A private launcher for self-contained browser labs. No build step, no server
needed — but hosting it on GitHub Pages makes it installable on any device.

## Folder layout

    index.html            the launcher
    css/launcher.css      launcher styling (Void + Orbital themes)
    js/labs.config.js     THE ROOM LIST: edit this to add a lab
    js/launcher.js        launcher logic, Today tab
    labs/<lab>.html       single-file labs (Pyle, Passle, Hexle, Sleeple, Seqle, Poshle, Rebble, ...)
    labs/<lab>/           folder labs (junos-lab, modle)
    labs/img/             images per lab (passle, roux, hexle)
    labs/data/            JSON files Hexle fetches in its lessons
    archive/              retired pages (Style, old Passle prototypes)
    sw.js                 service worker (offline support)
    manifest.webmanifest  PWA manifest (install as an app)
    icons/                launcher icons

## Put it on GitHub Pages

1. Create a new repository on GitHub (e.g. `workshop`). Private is fine, but
   note that the published Pages site itself is public.
2. Upload this whole folder to the repo (drag-and-drop on github.com works,
   or `git init`, `git add .`, `git commit`, `git push`).
3. Repo → Settings → Pages → Source: **Deploy from a branch** →
   Branch: `main`, folder: `/ (root)` → Save.
4. Wait a minute. Your launcher is live at
   `https://<your-username>.github.io/<repo-name>/`

Every time you push changes, the site updates. Installed apps pick up the
new version on their next online launch.

## Install on a tablet

Open the Pages URL in the tablet's browser once, then:

- **iPad (Safari)**: Share button → Add to Home Screen
- **Android (Chrome)**: menu (⋮) → Install app / Add to Home screen

After that it opens full-screen like a native app and works offline.

## Add a lab

1. Copy the lab's file or folder into `labs/`
2. Add an entry in `js/labs.config.js`:

| Field | Meaning |
|---|---|
| `id` | unique, no spaces (used for "last opened") |
| `name` | shown in the list |
| `tag` | sector: Network, Code, Practice or Reference |
| `sub` | short hint under the name |
| `path` | path to the lab's HTML file |
| `ring` | orbit: `ring-inner`, `ring-mid` or `ring-outer` |
| `angle` | degrees around the orbit, 0 = right, -90 = top |
| `glyph` | small 16×16 SVG icon (optional) |

3. Push to GitHub

## Today tab

The launcher's **Today** tab reads each lab's saved progress and lists what is due:
reviews (Junle, Pyle, Hexle, Sleeple, Seqle, Poshle and Shelle weak spots), dailies (Modle, Junle mix, Pyle kata, Sleeple telegrams, Seqle specials),
a weekly Detective case (Poshle, Git Lab or Shelle), and where you left off. Each row opens
the lab at the right spot through a link like `poshle.html#case:room`.

Deep links: Poshle and Shelle `#<scenario>` / `#case:<id>` / `#weak`, Git Lab `#case:<id>` /
`#detective` / `#guided` / `#free`, Junle `#review` / `#mix` / `#tourney`,
Pyle `#review` / `#kata`, Sleeple `#school` / `#target` / `#hangar` / `#port` / `#logbook` / `#review`, Seqle `#school` / `#target` / `#dining` / `#till` / `#cookbook` / `#review` / `#target:<id>`, Codex `#<volume>` (e.g. `#sql`), Hexle `#review` / `#tourney` / any stage, Modle `#/practice/daily`.

## Progress and sync

Labs save progress in the browser (`localStorage`). This is per device —
your tablet and your desktop each have their own.

To move progress between devices: **Export progress** in the launcher
downloads a JSON file; **Import** on the other device restores it. It also
doubles as a backup. A NAS-based automatic sync is the planned next step.
