// LABS_CONFIG — the rooms shown in the launcher.
//
// To add a lab:
//   1. Drop its folder into /labs/  (it needs its own index.html)
//   2. Add one entry below
//
// Fields:
//   id     unique, no spaces (used for "last opened" memory)
//   name   shown in the list
//   tag    sector the room is grouped under (Network, Code, Reference, Practice)
//   sub    short hint under the name (language / topic)
//   path   relative path to the lab's index.html
//   ring   which orbit the marker sits on: ring-inner | ring-mid | ring-outer
//   angle  degrees around the orbit, 0 = right, -90 = top, 90 = bottom
//   glyph  small 16x16 SVG icon (optional)

const LABS_CONFIG = [
  {
    id: "junos-lab",
    name: "JunOS lab",
    tag: "Network",
    sub: "junos cli",
    path: "labs/junos-lab/index.html",
    ring: "ring-mid",
    angle: -30,
    glyph: '<rect x="1" y="4" width="14" height="8" rx="1.5"/><path d="M4 8h2M7 8h2M10 8h2"/>'
  },
  {
    id: "junle",
    name: "Junle",
    tag: "Network",
    sub: "blueprints",
    path: "labs/junle.html",
    ring: "ring-mid",
    angle: 150,
    glyph: '<path d="M8 2v4M8 10v4M2 8h4M10 8h4"/><circle cx="8" cy="8" r="2"/>'
  },
    {
    id: "pyle",
    name: "Pyle",
    tag: "Code",
    sub: "python",
    path: "labs/pyle.html",
    ring: "ring-outer",
    angle: 100,
    glyph: '<path d="M8 2v4M8 10v4M2 8h4M10 8h4"/><circle cx="8" cy="8" r="2"/>'
  },
    {
    id: "git-lab",
    name: "Git Lab",
    tag: "Practice",
    sub: "git",
    path: "labs/git-lab.html",
    ring: "ring-inner",
    angle: 200,
    glyph: '<path d="M8 2v4M8 10v4M2 8h4M10 8h4"/><circle cx="8" cy="8" r="2"/>'
  },
    {
    id: "spelle",
    name: "Java",
    tag: "Code",
    sub: "javascript",
    path: "labs/spelle.html",
    ring: "ring-outer",
    angle: 180,
    glyph: '<path d="M8 2v4M8 10v4M2 8h4M10 8h4"/><circle cx="8" cy="8" r="2"/>'
  },
    {
    id: "style",
    name: "Style",
    tag: "Code",
    sub: "html / css",
    path: "labs/style.html",
    ring: "ring-outer",
    angle: 300,
    glyph: '<path d="M8 2v4M8 10v4M2 8h4M10 8h4"/><circle cx="8" cy="8" r="2"/>'
  },
    {
    id: "codex",
    name: "Codex",
    tag: "Reference",
    sub: "all labs",
    path: "labs/codex.html",
    ring: "ring-inner",
    angle: 20,
    glyph: '<path d="M3 3h4a2 2 0 0 1 1 1v9a2 2 0 0 0-1-1H3z"/><path d="M13 3H9a2 2 0 0 0-1 1v9a2 2 0 0 1 1-1h4z"/>'
    },
  {
    id: "mscodex",
    name: "Codex Microsoft",
    tag: "Reference",
    sub: "microsoft 365",
    path: "labs/mscodex.html",
    ring: "ring-inner",
    angle: 250,
    glyph: '<rect x="2" y="2" width="5" height="5"/><rect x="9" y="2" width="5" height="5"/><rect x="2" y="9" width="5" height="5"/><rect x="9" y="9" width="5" height="5"/>'
  },
  {
    id: "modle",
    name: "Modle",
    tag: "Practice",
    sub: "math",
    path: "labs/modle/index.html",
    ring: "ring-inner",
    angle: 110,
    glyph: '<circle cx="4.5" cy="4.5" r="2"/><circle cx="11.5" cy="11.5" r="2"/><path d="M13 3L3 13"/>'
  },
  {
    id: "passle",
    name: "Passle",
    tag: "Code",
    sub: "php",
    path: "labs/passle-home.html",
    ring: "ring-outer",
    angle: 240,
    glyph: '<path d="M3 11a5 5 0 0 1 10 0"/><path d="M2 11h12"/><path d="M8 6V5"/>'
  }
];
