import { catList } from "../core/catalog.js";

export const achievements = [
  { id: "first", name: "First Steps", shape: "circle", test: (s) => s.solved >= 1 },
  { id: "fifty", name: "Half Century", shape: "square", test: (s) => s.solved >= 50 },
  { id: "century", name: "Century", shape: "rings", test: (s) => s.solved >= 100 },
  { id: "fire", name: "On Fire", shape: "triangle", test: (s) => s.maxStreak >= 10 },
  { id: "sharp", name: "Sharpshooter", shape: "diamond", test: (s) => s.maxStreak >= 20 },
  { id: "rising", name: "Rising", shape: "pentagon", test: (s) => s.level >= 5 },
  { id: "explorer", name: "Explorer", shape: "hexagon", test: (s) => s.catsTried.length >= catList.length },
  { id: "modmaster", name: "Modulo Master", shape: "split", test: (s) => (s.cats.modulo || 0) >= 25 },
  { id: "week", name: "7-Day Streak", shape: "sun", test: (s) => s.dayStreak >= 7 },
  { id: "daily5", name: "Daily Devotee", shape: "star", test: (s) => s.dailiesDone >= 5 },
  { id: "ten", name: "Ten Up", shape: "plus", test: (s) => s.solved >= 10 },
  { id: "marathon", name: "Marathon", shape: "nested", test: (s) => s.solved >= 250 },
  { id: "legend", name: "Legend", shape: "octagon", test: (s) => s.solved >= 500 },
  { id: "lvl10", name: "Level 10", shape: "arrow", test: (s) => s.level >= 10 },
  { id: "lvl20", name: "Level 20", shape: "crescent", test: (s) => s.level >= 20 },
  { id: "binbrain", name: "Binary Brain", shape: "gem", test: (s) => (s.cats.binary || 0) >= 25 },
  { id: "gridcapt", name: "Grid Captain", shape: "chevrons", test: (s) => (s.cats.coordinates || 0) >= 25 },
  { id: "perfect", name: "Perfect Daily", shape: "target", test: (s) => s.perfectDailies >= 1 },
  { id: "scholar", name: "Scholar", shape: "rings", test: (s) => s.read >= 4 },
  { id: "builder", name: "Builder", shape: "plus", test: (s) => s.built >= 1 },
  { id: "engineer", name: "Engineer", shape: "nested", test: (s) => s.built >= 5 }
]
;

export function statsSnapshot(P, level, dayStreak) {
  return {
    solved: P.solved, maxStreak: P.maxStreak, level: level,
    catsTried: P.catsTried, cats: P.cats, dayStreak: dayStreak,
    dailiesDone: P.dailiesDone, perfectDailies: P.perfectDailies,
    read: P.read.length, built: P.built.length
  };
}

export function newlyUnlocked(P, snap) {
  const fresh = [];
  achievements.forEach(a => {
    if (!P.unlocked.includes(a.id) && a.test(snap)) { P.unlocked.push(a.id); fresh.push(a); }
  });
  return fresh;
}
