import { P, save } from "../core/profile.js";
import { todayStr } from "../core/dates.js";

const START_EASE = 2.3;
const MIN_EASE = 1.4;
const MAX_EASE = 3.0;
const FIRST_STEPS = [1, 3];

export const skillKey = (cat, diff) => cat + ":" + diff;
export const bugKey = (slug) => "bug:" + slug;

export function parseSkill(key) {
  const bits = key.split(":");
  if (bits[0] === "k") return { kind: "type", cat: bits[1], type: bits[2], diff: (P.srs[key] && P.srs[key].diff) || "medium" };
  return { kind: bits[0] === "bug" ? "bug" : "puzzle", cat: bits[0], diff: bits[1], slug: bits[1] };
}

function addDays(iso, n) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function daysBetween(a, b) {
  const x = new Date(a + "T12:00:00"), y = new Date(b + "T12:00:00");
  return Math.round((y - x) / 86400000);
}

function slot(key) {
  if (!P.srs[key]) {
    P.srs[key] = { ease: START_EASE, interval: 0, reps: 0, lapses: 0, due: todayStr(), last: null };
  }
  const s = P.srs[key];
  if (typeof s.ease !== "number") s.ease = START_EASE;
  if (typeof s.interval !== "number") s.interval = 0;
  if (typeof s.reps !== "number") s.reps = 0;
  if (typeof s.lapses !== "number") s.lapses = 0;
  if (!s.due) s.due = todayStr();
  return s;
}

export function grade(key, correct, diff) {
  const s = slot(key);
  if (diff) s.diff = diff;
  const today = todayStr();

  if (correct) {
    s.reps++;
    if (s.reps <= FIRST_STEPS.length) s.interval = FIRST_STEPS[s.reps - 1];
    else s.interval = Math.max(1, Math.round(s.interval * s.ease));
    s.ease = Math.min(MAX_EASE, s.ease + 0.08);
  } else {
    s.lapses++;
    s.reps = 0;
    s.interval = 0;
    s.ease = Math.max(MIN_EASE, s.ease - 0.25);
  }

  s.last = today;
  s.due = s.interval === 0 ? today : addDays(today, s.interval);
  save();
  return s;
}

export const isDue = (key) => {
  const s = P.srs[key];
  return !s || s.due <= todayStr();
};

export const isNew = (key) => !P.srs[key];

export function due(keys) {
  const t = todayStr();
  return keys
    .filter(k => P.srs[k] && P.srs[k].due <= t)
    .sort((a, b) => (P.srs[a].due < P.srs[b].due ? -1 : P.srs[a].due > P.srs[b].due ? 1 : P.srs[b].lapses - P.srs[a].lapses));
}

export const fresh = (keys) => keys.filter(k => !P.srs[k]);

export function upcoming(keys) {
  const t = todayStr();
  return keys.filter(k => P.srs[k] && P.srs[k].due > t)
    .sort((a, b) => P.srs[a].due < P.srs[b].due ? -1 : 1);
}

export function buildQueue(allKeys, size, newCap) {
  const d = due(allKeys);
  const n = fresh(allKeys).slice(0, newCap === undefined ? 4 : newCap);
  const picked = d.concat(n).slice(0, size);
  return interleave(picked);
}

function interleave(keys) {
  const byCat = {};
  keys.forEach(k => { const c = k.split(":")[0]; (byCat[c] = byCat[c] || []).push(k); });
  const groups = Object.keys(byCat).map(c => byCat[c]);
  const out = [];
  let added = true;
  while (added) {
    added = false;
    groups.forEach(g => { if (g.length) { out.push(g.shift()); added = true; } });
  }
  return out;
}

export function summary(allKeys) {
  const t = todayStr();
  let dueN = 0, newN = 0, learning = 0, strong = 0;
  allKeys.forEach(k => {
    const s = P.srs[k];
    if (!s) { newN++; return; }
    if (s.due <= t) dueN++;
    if (s.interval >= 16) strong++;
    else learning++;
  });
  return { due: dueN, fresh: newN, learning: learning, strong: strong, total: allKeys.length };
}

export function nextDueDate(allKeys) {
  const t = todayStr();
  const later = allKeys.filter(k => P.srs[k] && P.srs[k].due > t).map(k => P.srs[k].due).sort();
  return later.length ? later[0] : null;
}

export function markDrilledToday() {
  const t = todayStr();
  if (!P.drillDays.includes(t)) {
    P.drillDays.push(t);
    if (P.drillDays.length > 400) P.drillDays = P.drillDays.slice(-400);
  }
}

export function retention() {
  let reps = 0, lapses = 0;
  Object.keys(P.srs).forEach(k => { reps += P.srs[k].reps || 0; lapses += P.srs[k].lapses || 0; });
  const total = reps + lapses;
  return total ? Math.round(reps / total * 100) : null;
}
