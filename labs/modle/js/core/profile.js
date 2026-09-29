import { store } from "./store.js";
import { allCatKeys } from "./catalog.js";
import { dateKey, todayStr } from "./dates.js";

export const TRACKS = [
  { key: "python", label: "Python", ready: true },
  { key: "web", label: "Web", ready: false },
  { key: "php", label: "PHP", ready: false },
  { key: "cpp", label: "C++", ready: false }
];

function withNewCats(prefs) {
  if (!prefs.enabled || !prefs.enabled.length) return allCatKeys.slice();
  const known = prefs.knownCats || ["basics", "powers", "binary", "strings", "webmath", "modulo", "ranges", "indexing", "stats", "coordinates"];
  const out = prefs.enabled.filter(k => allCatKeys.includes(k));
  allCatKeys.forEach(k => { if (!known.includes(k) && !out.includes(k)) out.push(k); });
  return out.length ? out : allCatKeys.slice();
}

function blank() {
  const d = store.read();
  const prefs = d.prefs || {};
  return {
    xp: d.xp || 0,
    solved: d.solved || 0,
    streak: d.streak || 0,
    maxStreak: d.maxStreak || 0,
    cats: d.cats || {},
    attempts: d.attempts || {},
    catsTried: d.catsTried || [],
    unlocked: d.unlocked || [],
    days: d.days || [],
    daily: d.daily || null,
    dailiesDone: d.dailiesDone || 0,
    perfectDailies: d.perfectDailies || 0,
    bestSprint: d.bestSprint || 0,
    read: d.read || [],
    built: d.built || [],
    srs: d.srs || {},
    bugsSolved: d.bugsSolved || [],
    drillDays: d.drillDays || [],
    bestBugRun: d.bestBugRun || 0,
    syntaxSolved: d.syntaxSolved || [],
    bestWpm: d.bestWpm || 0,
    typedRuns: d.typedRuns || 0,
    mistakes: d.mistakes || [],
    pocketsDone: d.pocketsDone || 0,
    bestPocket: d.bestPocket || 0,
    retriesWon: d.retriesWon || 0,
    prefs: {
      difficulty: prefs.difficulty || "easy",
      enabled: withNewCats(prefs),
      knownCats: allCatKeys.slice(),
      reduceMotion: prefs.reduceMotion || false,
      visual: prefs.visualSet ? !!prefs.visual : true,
      visualSet: !!prefs.visualSet,
      track: prefs.track || "python",
      theme: prefs.theme === "terminal" ? "wheat" : (prefs.theme || "wheat"),
      hat: prefs.hat || "none",
      catOff: prefs.catOff || false
    }
  };
}

export let P = blank();

function heal() {
  allCatKeys.forEach(k => {
    const c = P.cats[k] || 0;
    if ((P.attempts[k] || 0) < c) P.attempts[k] = c;
  });
}
heal();

export const save = () => store.write(P);

export function reset() {
  store.clear();
  P = blank();
  heal();
  return P;
}

export function markPlayedToday() {
  const t = todayStr();
  if (!P.days.includes(t)) {
    P.days.push(t);
    if (P.days.length > 90) P.days = P.days.slice(-90);
  }
}

export function dayStreak() {
  let n = 0;
  const d = new Date();
  for (;;) {
    if (P.days.includes(dateKey(d))) { n++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return n;
}

export function markTried(c) {
  if (!P.catsTried.includes(c)) P.catsTried.push(c);
}

export function markRead(slug) {
  if (!P.read.includes(slug)) { P.read.push(slug); save(); return true; }
  return false;
}

export function markBuilt(slug) {
  if (!P.built.includes(slug)) { P.built.push(slug); save(); return true; }
  return false;
}

export const track = () => P.prefs.track;

export const trackReady = (key) => {
  const t = TRACKS.find(x => x.key === (key || P.prefs.track));
  return !!(t && t.ready);
};

export function setTrack(key) {
  P.prefs.track = key;
  save();
}

export const trackLabel = () => (TRACKS.find(t => t.key === P.prefs.track) || TRACKS[0]).label;
