# Workshop

A private launcher for self-contained browser labs. No build step, no server
needed — but hosting it on GitHub Pages makes it installable on any device.

## Folder layout

    index.html            the launcher
    css/launcher.css      styling (Void + Orbital themes)
    js/labs.config.js     THE ROOM LIST — edit this to add a lab
    js/launcher.js        launcher logic
    labs/<lab-name>/      one folder per lab, each with its own index.html
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

1. Copy the lab's folder into `labs/`
2. Add an entry in `js/labs.config.js` (there's a commented example)
3. Push to GitHub

## Progress and sync

Labs save progress in the browser (`localStorage`). This is per device —
your tablet and your desktop each have their own.

To move progress between devices: **Export progress** in the launcher
downloads a JSON file; **Import** on the other device restores it. It also
doubles as a backup. A NAS-based automatic sync is the planned next step.
