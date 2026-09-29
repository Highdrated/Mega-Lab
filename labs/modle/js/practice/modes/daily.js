import { setRng, useSystemRng, mulberry32, dateSeed, rand } from "../../core/rng.js";
import { allCatKeys } from "../../core/catalog.js";
import { todayStr } from "../../core/dates.js";
import { P, save, markPlayedToday } from "../../core/profile.js";
import { gen } from "../generators.js";
import { startSession } from "../engine.js";
import { checkAchievements } from "../../progress/hud.js";

const DIFFS = ["easy", "easy", "medium", "medium", "hard"];

export const doneToday = () => !!(P.daily && P.daily.date === todayStr());

function buildSet(t) {
  const set = [];
  setRng(mulberry32(dateSeed("modle-" + t)));
  try {
    const pool = allCatKeys.slice();
    const cats = [];
    while (cats.length < 5) cats.push(pool.splice(rand(0, pool.length - 1), 1)[0]);
    for (let i = 0; i < 5; i++) set.push({ pz: gen(cats[i], DIFFS[i]), cat: cats[i], diff: DIFFS[i] });
  } finally {
    useSystemRng();
  }
  return set;
}

export function shareText() {
  if (!P.daily || !P.daily.marks) return "";
  const squares = P.daily.marks.map(m => m ? "🟩" : "🟥").join("");
  return "Modle " + P.daily.date + " — " + P.daily.score + "/5\n" + squares + "\nmodle.net";
}

export function start(onFinish) {
  const t = todayStr();
  const set = buildSet(t);
  let idx = -1;
  let score = 0;
  const marks = [];

  startSession({
    kind: "daily",
    showPicker: false,
    meta: () => ({ left: "daily challenge — <b>puzzle " + Math.min(idx + 1, 5) + " of 5</b>", right: t }),
    next: () => { idx++; return idx < 5 ? set[idx] : null; },
    onResult: (correct) => {
      marks[idx] = correct;
      if (correct) score++;
    },
    nextLabel: () => idx === 4 ? "Finish daily →" : "Next puzzle →",
    finish: () => {
      P.daily = { date: todayStr(), score: score, marks: marks.slice() };
      P.dailiesDone++;
      if (score === 5) P.perfectDailies++;
      markPlayedToday();
      checkAchievements();
      save();
      onFinish(score, false);
    }
  });
}
