import { P, save, markPlayedToday } from "../../core/profile.js";
import { catList } from "../../core/catalog.js";
import { gen } from "../generators.js";
import { startSession, refreshChrome } from "../engine.js";
import { weakSpots } from "../kinds.js";
import { todayStr } from "../../core/dates.js";
import { checkAchievements } from "../../progress/hud.js";

const SIZE = 10;

function weakestCats(n) {
  return catList.map(c => c[0])
    .filter(k => P.prefs.enabled.includes(k) && (P.attempts[k] || 0) >= 3)
    .map(k => ({ k: k, pct: (P.cats[k] || 0) / P.attempts[k] }))
    .filter(x => x.pct < 0.85)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, n)
    .map(x => x.k);
}

export function buildSet() {
  const plan = [];
  const t = todayStr();
  const spots = weakSpots(12);
  spots.filter(w => w.due <= t).concat(spots.filter(w => w.due > t)).slice(0, 5)
    .forEach(w => plan.push({ cat: w.cat, diff: w.diff, kind: w.kind }));
  weakestCats(3).forEach(k => plan.push({ cat: k, diff: P.prefs.difficulty }));
  const pool = P.prefs.enabled.length ? P.prefs.enabled : catList.map(c => c[0]);
  while (plan.length < SIZE) plan.push({ cat: pool[Math.floor(Math.random() * pool.length)], diff: P.prefs.difficulty });
  const out = [];
  const rest = plan.slice(0, SIZE);
  while (rest.length) {
    const last = out.length ? out[out.length - 1].cat : null;
    let i = rest.findIndex(p => p.cat !== last);
    if (i < 0) i = 0;
    out.push(rest.splice(i, 1)[0]);
  }
  return out;
}

const clock = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");

export function start(onFinish) {
  const plan = buildSet();
  let idx = -1, right = 0;
  const t0 = Date.now();
  const secs = () => Math.round((Date.now() - t0) / 1000);
  const tick = setInterval(refreshChrome, 1000);
  document.body.classList.add("pocket");

  startSession({
    kind: "pocket",
    showPicker: false,
    meta: () => ({ left: "pocket — <b>" + Math.min(idx + 1, SIZE) + " of " + SIZE + "</b> · " + right + " right", right: clock(secs()) + (secs() > 300 ? " · take your time" : " / 5:00") }),
    next: () => {
      idx++;
      if (idx >= plan.length) return null;
      const p = plan[idx];
      return { pz: gen(p.cat, p.diff, p.kind), cat: p.cat, diff: p.diff, focus: !!p.kind };
    },
    onResult: (correct) => { if (correct) right++; },
    nextLabel: () => idx === SIZE - 1 ? "Finish →" : "Next →",
    finish: () => {
      clearInterval(tick);
      document.body.classList.remove("pocket");
      P.pocketsDone = (P.pocketsDone || 0) + 1;
      P.bestPocket = Math.max(P.bestPocket || 0, right);
      markPlayedToday();
      checkAchievements();
      save();
      onFinish(right, SIZE, clock(secs()));
    },
    cleanup: () => { clearInterval(tick); document.body.classList.remove("pocket"); }
  });
}
