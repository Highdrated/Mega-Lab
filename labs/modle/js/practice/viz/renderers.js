import { wrapSvg, txt } from "./svg.js";
import { C } from "../../core/theme.js";

export function vizNumline(v) {
const min = v.min, max = Math.max(v.max, (v.ticks ? Math.max.apply(null, v.ticks) : v.max)); const span = (max - min) || 1;
const x0 = 30, x1 = 450, y = 45; const sx = (val) => x0 + (val - min) / span * (x1 - x0);
let s = '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '" stroke="' + C.line + '" stroke-width="2"/>';
const step = Math.max(1, Math.ceil(span / 24));
for (let i = min; i <= max; i += step) { s += '<line x1="' + sx(i) + '" y1="' + (y - 4) + '" x2="' + sx(i) + '" y2="' + (y + 4) + '" stroke="' + C.line + '" stroke-width="1"/>' + txt(sx(i), y + 18, i, C.muted, 10); }
if (v.ticks) { v.ticks.forEach(t => { s += '<circle cx="' + sx(t) + '" cy="' + y + '" r="6" fill="' + C.ok + '"/>'; }); s += txt((x0 + x1) / 2, 20, v.ticks.length + " values", C.ok, 12); }
else { s += '<circle cx="' + sx(v.base) + '" cy="' + y + '" r="6" fill="' + C.muted + '"/>' + '<line x1="' + sx(v.base) + '" y1="' + (y - 16) + '" x2="' + sx(v.to) + '" y2="' + (y - 16) + '" stroke="' + C.wheat + '" stroke-width="2"/>' + '<circle cx="' + sx(v.to) + '" cy="' + y + '" r="7" fill="' + C.ok + '"/>' + txt(sx(v.to), 20, "= " + v.to, C.ok, 13); }
return wrapSvg(s, 72);
}
export function vizGrid(v) { if (v.total > 60) return ""; const per = v.per, r = 7, gap = 22, x0 = 20, y0 = 20; let s = ""; for (let i = 0; i < v.total; i++) { const col = i % per, row = Math.floor(i / per); s += '<circle cx="' + (x0 + col * gap) + '" cy="' + (y0 + row * gap) + '" r="' + r + '" fill="' + C.wheat + '"/>'; } const rows = Math.ceil(v.total / per); return wrapSvg(s, y0 + rows * gap + 4); }
export function vizModclock(v) { const b = v.b, x0 = 24, gap = Math.min(40, 432 / b), y = 34, sz = Math.min(26, gap - 6); let s = ""; for (let i = 0; i < b; i++) { const on = i === v.rem; s += '<rect x="' + (x0 + i * gap) + '" y="' + y + '" width="' + sz + '" height="' + sz + '" rx="4" fill="' + (on ? C.ok : "none") + '" stroke="' + (on ? C.ok : C.line) + '" stroke-width="2"/>' + txt(x0 + i * gap + sz / 2, y + sz + 14, i, on ? C.ok : C.muted, 10); } s += txt(240, 18, "remainder lands on " + v.rem, C.ok, 12); return wrapSvg(s, y + sz + 24); }
export function vizBits(v) { const bin = v.bin, n = bin.length, gap = Math.min(52, 440 / n), x0 = 20, y = 34, sz = Math.min(38, gap - 6); let s = ""; for (let i = 0; i < n; i++) { const on = bin[i] === "1"; const place = Math.pow(2, n - 1 - i); s += txt(x0 + i * gap + sz / 2, y - 8, place, C.muted, 10) + '<rect x="' + (x0 + i * gap) + '" y="' + y + '" width="' + sz + '" height="' + sz + '" rx="5" fill="' + (on ? C.wheat : "none") + '" stroke="' + (on ? C.wheat : C.line) + '" stroke-width="2"/>' + txt(x0 + i * gap + sz / 2, y + sz / 2 + 5, bin[i], on ? C.bg : C.muted, 15); } return wrapSvg(s, y + sz + 12); }
export function vizBoxes(v) { const items = v.vals ? v.vals : v.chars; const n = items.length, gap = Math.min(48, 440 / n), x0 = 20, y = 24, sz = Math.min(38, gap - 6); let s = ""; for (let i = 0; i < n; i++) { let on = false; if (v.hi && v.hi.indexOf(i) >= 0) on = true; if (v.range && i >= v.range[0] && i < v.range[1]) on = true; if (v.hiChar && items[i] === v.hiChar) on = true; s += '<rect x="' + (x0 + i * gap) + '" y="' + y + '" width="' + sz + '" height="' + sz + '" rx="5" fill="' + (on ? C.ok : "none") + '" stroke="' + (on ? C.ok : C.line) + '" stroke-width="2"/>' + txt(x0 + i * gap + sz / 2, y + sz / 2 + 5, items[i], on ? C.bg : C.txt, 14) + txt(x0 + i * gap + sz / 2, y + sz + 14, i, C.muted, 10); } return wrapSvg(s, y + sz + 22); }
export function vizBars(v) { const vals = v.two ? v.two : v.vals; const n = vals.length, maxv = Math.max.apply(null, vals) || 1, gap = Math.min(90, 420 / n), x0 = 30, base = 110, bw = Math.min(54, gap - 12); let s = '<line x1="20" y1="' + base + '" x2="460" y2="' + base + '" stroke="' + C.line + '" stroke-width="1"/>'; vals.forEach((val, i) => { const h = Math.max(6, val / maxv * 80); const x = x0 + i * gap; let col = C.wheat; if (v.kind === "max" && val === maxv) col = C.ok; if (v.kind === "min" && val === Math.min.apply(null, vals)) col = C.ok; if (v.two) col = i === 0 ? C.muted : C.ok; s += '<rect x="' + x + '" y="' + (base - h) + '" width="' + bw + '" height="' + h + '" rx="3" fill="' + col + '"/>' + txt(x + bw / 2, base - h - 5, val, C.txt, 11) + txt(x + bw / 2, base + 14, v.labels ? v.labels[i] : "", C.muted, 10); }); if (v.mean !== undefined) { const y = base - v.mean / maxv * 80; s += '<line x1="20" y1="' + y + '" x2="460" y2="' + y + '" stroke="' + C.xp + '" stroke-width="2" stroke-dasharray="5 4"/>' + txt(440, y - 5, "avg " + v.mean, C.xp, 11); } return wrapSvg(s, 130); }
export function vizChain(v) { const n = v.exp, gap = Math.min(60, 380 / n), x0 = 20, y = 20, sz = Math.min(38, gap - 10); let s = ""; for (let i = 0; i < n; i++) { const x = x0 + i * gap; s += '<rect x="' + x + '" y="' + y + '" width="' + sz + '" height="' + sz + '" rx="5" fill="none" stroke="' + C.wheat + '" stroke-width="2"/>' + txt(x + sz / 2, y + sz / 2 + 5, v.base, C.wheat, 14); if (i < n - 1) s += txt(x + gap - (gap - sz) / 2, y + sz / 2 + 5, "\u00d7", C.muted, 14); } s += txt(x0 + n * gap + 6, y + sz / 2 + 5, "= " + v.result, C.ok, 14, "start"); return wrapSvg(s, y + sz + 12); }
export function vizCells(v) { const n = Math.min(v.n, 20), gap = Math.min(46, 440 / n), x0 = 20, y = 22, sz = Math.min(34, gap - 8); let s = ""; for (let i = 0; i < n; i++) { const last = i === n - 1; s += '<rect x="' + (x0 + i * gap) + '" y="' + y + '" width="' + sz + '" height="' + sz + '" rx="5" fill="' + (last ? "none" : C.wheat) + '" stroke="' + C.wheat + '" stroke-width="2" ' + (last ? 'stroke-dasharray="4 3"' : "") + "/>"; } s += txt(240, 14, v.n + " " + v.unit + (v.n === 1 ? "" : "s"), C.ok, 12); return wrapSvg(s, y + sz + 12); }
export function vizGrid2d(v) { const w = Math.min(v.w, 14), h = Math.min(v.h, 14); const cell = Math.min(30, Math.floor(440 / w)); const x0 = 20, y0 = 8; let s = ""; for (let gy = 0; gy < h; gy++) for (let gx = 0; gx < w; gx++) { s += '<rect x="' + (x0 + gx * cell) + '" y="' + (y0 + (h - 1 - gy) * cell) + '" width="' + (cell - 3) + '" height="' + (cell - 3) + '" rx="2" fill="none" stroke="' + C.line + '" stroke-width="1"/>'; } const dot = (cx, cy, color) => { if (cx < 0 || cx >= w || cy < 0 || cy >= h) return ""; return '<circle cx="' + (x0 + cx * cell + (cell - 3) / 2) + '" cy="' + (y0 + (h - 1 - cy) * cell + (cell - 3) / 2) + '" r="' + Math.max(4, cell / 3) + '" fill="' + color + '"/>'; }; s += dot(v.from[0], v.from[1], C.muted) + dot(v.to[0], v.to[1], C.ok); return wrapSvg(s, y0 + h * cell + 6); }

export function vizBlocks(v) {
  const n = Math.round(256 / v.size), x0 = 20, x1 = 460, y = 30, hgt = 26, w = (x1 - x0) / n;
  const hit = (h) => h >= 0 ? Math.floor(h / v.size) : -1;
  const b1 = hit(v.host), b2 = v.host2 !== undefined ? hit(v.host2) : -1;
  let s = "";
  for (let i = 0; i < n; i++) {
    const on = i === b1 || i === b2;
    s += '<rect x="' + (x0 + i * w + 0.5) + '" y="' + y + '" width="' + Math.max(1, w - 1.5) + '" height="' + hgt + '" rx="' + Math.min(3, w / 4) + '" fill="' + (on ? C.ok : "none") + '" stroke="' + (on ? C.ok : C.line) + '" stroke-width="1.2"/>';
  }
  const mark = (h, col) => { const x = x0 + (h + 0.5) / 256 * (x1 - x0); return '<line x1="' + x + '" y1="' + (y - 6) + '" x2="' + x + '" y2="' + (y + hgt + 6) + '" stroke="' + col + '" stroke-width="2"/>' + txt(x, y - 10, "." + h, col, 11); };
  if (v.host >= 0) s += mark(v.host, C.wheat);
  if (v.host2 !== undefined) s += mark(v.host2, C.xp);
  s += txt(x0, y + hgt + 16, "0", C.muted, 10, "start") + txt(x1, y + hgt + 16, "255", C.muted, 10, "end");
  if (b1 >= 0) { const st = b1 * v.size; s += txt(x0 + (b1 + 0.5) * w, y + hgt + 16, st + "–" + (st + v.size - 1), C.ok, 11); }
  else s += txt((x0 + x1) / 2, y + hgt + 16, n + " blocks of " + v.size, C.ok, 11);
  return wrapSvg(s, y + hgt + 24);
}

export const vizRenderers = { numline: vizNumline, grid: vizGrid, modclock: vizModclock, bits: vizBits, boxes: vizBoxes, bars: vizBars, chain: vizChain, cells: vizCells, grid2d: vizGrid2d, blocks: vizBlocks };
