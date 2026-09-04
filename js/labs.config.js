// LABS_CONFIG — the rooms shown in the launcher.
//
// To add a lab:
//   1. Drop its folder into /labs/  (it needs its own index.html)
//   2. Add one entry below
//
// Fields:
//   id     unique, no spaces (used for "last opened" memory)
//   name   shown in the list
//   tag    small label under the name
//   path   relative path to the lab's index.html
//   ring   which orbit the marker sits on: ring-inner | ring-mid | ring-outer
//   angle  degrees around the orbit, 0 = right, -90 = top, 90 = bottom
//   glyph  small 16x16 SVG icon (optional)

const LABS_CONFIG = [
  {
    id: "junos-lab",
    name: "JunOS lab",
    tag: "networking",
    path: "labs/junos-lab/index.html",
    ring: "ring-mid",
    angle: -30,
    glyph: '<rect x="1" y="4" width="14" height="8" rx="1.5"/><path d="M4 8h2M7 8h2M10 8h2"/>'
  }
  // Next room goes here, e.g.:
  // {
  //   id: "python-lab", name: "Python lab", tag: "programming",
  //   path: "labs/python-lab/index.html", ring: "ring-outer", angle: 150,
  //   glyph: '<path d="M6 4l-4 4 4 4M10 4l4 4-4 4"/>'
  // }
];
