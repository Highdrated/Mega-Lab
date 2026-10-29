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
    glyph: '<rect x="2" y="2" width="12" height="12"/><path d="M2 6h12M6 2v12M9 9h3v3"/>'
  },
  {
    id: "junle-room",
    name: "Junle Room",
    tag: "Network",
    sub: "castle workstation · console",
    path: "labs/junle-room.html",
    ring: "ring-mid",
    angle: 270,
    glyph: '<rect x="1.5" y="3" width="13" height="8" rx="1"/><path d="M6 14h4M8 11v3M4 6.5l2 1.5-2 1.5"/>'
  },
    {
    id: "pyle",
    name: "Pyle",
    tag: "Code",
    sub: "python · academy for Sleeple",
    path: "labs/pyle.html",
    ring: "ring-outer",
    angle: 100,
    glyph: '<path d="M2.5 5l3 3-3 3"/><path d="M7.5 11.5h6"/>'
  },
    {
    id: "sleeple",
    name: "Sleeple",
    tag: "Code",
    sub: "python · night train + dining car",
    path: "labs/sleeple.html",
    ring: "ring-outer",
    angle: 300,
    glyph: '<rect x="2" y="4" width="12" height="7" rx="1.5"/><path d="M4.5 7h2M9.5 7h2M1 14h14M5 11v1.5M11 11v1.5"/>'
  },
  {
    id: "git-lab",
    name: "Git Lab",
    tag: "Practice",
    sub: "git",
    path: "labs/git-lab.html",
    ring: "ring-inner",
    angle: 200,
    glyph: '<circle cx="4" cy="3.5" r="1.5"/><circle cx="4" cy="12.5" r="1.5"/><circle cx="12" cy="6" r="1.5"/><path d="M4 5v6M12 7.5c0 2.5-3 2.5-8 3.5"/>'
  },
    {
    id: "spelle",
    name: "Java",
    tag: "Code",
    sub: "javascript · dungeons",
    path: "labs/spelle.html",
    ring: "ring-outer",
    angle: 180,
    glyph: '<path d="M3 13L11 5"/><path d="M12 1.5v3M10.5 3h3M13.5 7.5v2M12.5 8.5h2M6.5 2v2M5.5 3h2"/>'
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
    sub: "php · the train's dining car",
    path: "labs/passle.html",
    ring: "ring-outer",
    angle: 240,
    glyph: '<path d="M3 11a5 5 0 0 1 10 0"/><path d="M2 11h12"/><path d="M8 6V5"/>'
  },
  {
    id: "seqle",
    name: "Seqle",
    tag: "Code",
    sub: "sql · bistro",
    path: "labs/seqle.html",
    ring: "ring-outer",
    angle: 350,
    glyph: '<rect x="2.5" y="3" width="11" height="10" rx="1"/><path d="M2.5 6.5h11M2.5 9.75h11M6.5 3v10"/>'
  },
  {
    id: "poshle",
    name: "Poshle",
    tag: "Practice",
    sub: "powershell",
    path: "labs/poshle.html",
    ring: "ring-mid",
    angle: 60,
    glyph: '<rect x="1.5" y="2.5" width="13" height="11" rx="1.5"/><path d="M4 6.5l2.5 1.8L4 10.1M8 10.5h4"/>'
  },
  {
    id: "shelle",
    name: "Shelle",
    tag: "Practice",
    sub: "zsh · docker",
    path: "labs/shelle.html",
    ring: "ring-mid",
    angle: 250,
    glyph: '<path d="M2.5 4l3.5 3-3.5 3"/><path d="M7.5 11.5h6"/>'
  },
  {
    id: "hexle",
    name: "Hexle",
    tag: "Code",
    sub: "html · css · js",
    path: "labs/hexle.html",
    ring: "ring-outer",
    angle: 40,
    glyph: '<path d="M8 1.5l5.5 3.2v6.6L8 14.5l-5.5-3.2V4.7z"/><path d="M8 5l3 1.7v3.6L8 12l-3-1.7V6.7z"/>'
  },
  {
    id: "webble",
    name: "Webble",
    tag: "Code",
    sub: "motion · css + js",
    path: "labs/webble.html",
    ring: "ring-outer",
    angle: 140,
    glyph: '<path d="M2 11c2-6 4-6 6 0s4 6 6 0"/><circle cx="8" cy="5" r="1.5"/>'
  },
  {
    id: "subnle-pocket",
    name: "Subnle Pocket",
    tag: "Network",
    sub: "ip · subnetting · 21 drills",
    path: "labs/subnle-pocket.html",
    ring: "ring-mid",
    angle: 200,
    glyph: '<path d="M2 4h12M2 8h12M2 12h12"/><path d="M6 2v12M10 2v12"/>'
    },
  {
    id: "pyle-pocket",
    name: "Pyle Pocket",
    tag: "Code",
    sub: "python · tap only · on the go",
    path: "labs/pyle-pocket.html",
    ring: "ring-outer",
    angle: 210,
    glyph: '<rect x="4" y="1.5" width="8" height="13" rx="1.5"/><path d="M6 6l1.5 1.5L6 9M8.5 9.5h1.5"/>'
  },
  {
    id: "poshle-pocket",
    name: "Poshle Pocket",
    tag: "Practice",
    sub: "powershell · tap only · on the go",
    path: "labs/poshle-pocket.html",
    ring: "ring-mid",
    angle: 110,
    glyph: '<rect x="4" y="1.5" width="8" height="13" rx="1.5"/><path d="M6 6l1.5 1.5L6 9M8.5 9.5h1.5"/>'
  },
  {
    id: "opsle",
    name: "Opsle",
    tag: "Practice",
    sub: "ops missions · labs chained · on your Mac",
    path: "labs/opsle.html",
    ring: "ring-inner",
    angle: 290,
    glyph: '<circle cx="4" cy="8" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="12" cy="12" r="2"/><path d="M6 7l4-2M6 9l4 2"/>'
  },
  {
    id: "rebble",
    name: "Rebble",
    tag: "Practice",
    sub: "rebuild your projects",
    path: "labs/rebble.html",
    ring: "ring-inner",
    angle: 320,
    glyph: '<rect x="2" y="2" width="12" height="12" rx="1.5"/><path d="M2 6h12M6 6v8"/>'
  },
  {
    id: "pockle",
    name: "Pockle",
    tag: "Practice",
    sub: "pocket mix · all labs · tap only",
    path: "labs/pockle.html",
    ring: "ring-inner",
    angle: 160,
    glyph: '<rect x="4" y="1.5" width="8" height="13" rx="1.5"/><path d="M6 5.5h4M6 8h4M6 10.5h2"/>'
  }
];
