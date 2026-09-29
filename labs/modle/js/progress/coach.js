import { P, save } from "../core/profile.js";
import { catList } from "../core/catalog.js";

const LESSON_FOR = {
  basics: "operators", powers: "powers", binary: "binary", strings: "slicing",
  webmath: "ceil", modulo: "modulo", ranges: "ranges", indexing: "indexing",
  stats: "aggregates", coordinates: "variables",
  cycles: "cycles", rounding: "rounding", subnets: "subnets"
};

const NEXT_DIFF = { easy: "medium", medium: "hard" };
const EASIER = { hard: "medium", medium: "easy" };

let recent = [];
let cooldown = 0;
let saidThisSession = {};

export function record(cat, diff, correct) {
  recent.push({ cat: cat, diff: diff, correct: correct });
  if (recent.length > 14) recent.shift();
  if (cooldown > 0) cooldown--;
}

export function reset() { recent = []; cooldown = 0; }

const tailFor = (cat, diff, n) => recent.filter(r => r.cat === cat && r.diff === diff).slice(-n);

function accuracy(cat) {
  const a = P.attempts[cat] || 0, k = P.cats[cat] || 0;
  return a >= 8 ? k / a : null;
}

function weakest(exclude) {
  let worst = null, worstPct = 1;
  catList.forEach(c => {
    const key = c[0];
    if (key === exclude) return;
    if (!P.prefs.enabled.includes(key)) return;
    const a = P.attempts[key] || 0;
    if (a < 5) return;
    const pct = (P.cats[key] || 0) / a;
    if (pct < worstPct) { worstPct = pct; worst = c; }
  });
  return worstPct < 0.75 ? worst : null;
}

function untouched(exclude) {
  const fresh = catList.filter(c => c[0] !== exclude && P.prefs.enabled.includes(c[0]) && (P.attempts[c[0]] || 0) === 0);
  return fresh.length ? fresh[0] : null;
}

const once = (k) => { if (saidThisSession[k]) return false; saidThisSession[k] = true; return true; };

export function suggest(ctx) {
  if (cooldown > 0) return null;
  const cat = ctx.cat, diff = ctx.diff, dueCount = ctx.due || 0;

  const lastFive = tailFor(cat, diff, 5);
  if (lastFive.length === 5 && lastFive.every(r => r.correct) && NEXT_DIFF[diff] && once("up:" + cat + diff)) {
    cooldown = 6;
    return {
      text: "five in a row on " + diff + ". You've got this one — want it harder?",
      label: "try " + NEXT_DIFF[diff],
      act: { kind: "difficulty", value: NEXT_DIFF[diff] }
    };
  }

  const lastFour = tailFor(cat, diff, 4);
  const missed = lastFour.filter(r => !r.correct).length;

  if (lastFour.length === 4 && missed >= 3) {
    const slug = LESSON_FOR[cat];
    if (slug && !P.read.includes(slug) && once("read:" + cat)) {
      cooldown = 8;
      return { text: "this one's fighting back. There's a short page on it — two minutes.", label: "read it", act: { kind: "learn", value: slug } };
    }
    if (EASIER[diff] && once("down:" + cat + diff)) {
      cooldown = 8;
      return { text: "rough patch. No shame in dropping down a level for a bit.", label: "go " + EASIER[diff], act: { kind: "difficulty", value: EASIER[diff] } };
    }
  }

  const acc = accuracy(cat);
  if (acc !== null && acc >= 0.9 && (P.attempts[cat] || 0) >= 15) {
    const weak = weakest(cat);
    if (weak && once("weak:" + weak[0])) {
      cooldown = 8;
      return { text: cat + " is solid — " + Math.round(acc * 100) + "%. Your weakest right now is " + weak[1] + ".", label: "switch to " + weak[1], act: { kind: "category", value: weak[0] } };
    }
    const fresh = untouched(cat);
    if (fresh && once("new:" + fresh[0])) {
      cooldown = 8;
      return { text: "you've got " + cat + " down. Haven't tried " + fresh[1] + " yet.", label: "try " + fresh[1], act: { kind: "category", value: fresh[0] } };
    }
  }

  if (P.solved >= 20 && P.built.length === 0 && once("build")) {
    cooldown = 10;
    return { text: "you've solved " + P.solved + ". Ready to write some real code instead of reading it?", label: "open Build", act: { kind: "go", value: "/build" } };
  }

  if (dueCount >= 10 && once("due")) {
    cooldown = 10;
    return { text: dueCount + " reviews are due. That's where the learning sticks.", label: "go to Drill", act: { kind: "go", value: "/drill" } };
  }

  return null;
}

export function buildReadiness() {
  const solved = P.solved;
  const read = P.read.length;
  const done = P.built.length;
  const ready = solved >= 15 || read >= 2 || done > 0;
  return { ready: ready, solved: solved, read: read, done: done };
}
