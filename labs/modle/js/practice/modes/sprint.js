import { P, save, markPlayedToday } from "../../core/profile.js";
import { generators } from "../generators.js";
import { startSession, refreshChrome, stopSession } from "../engine.js";

const SECONDS = 60;

export function start(onFinish) {
  let left = SECONDS;
  let score = 0;
  let timer = null;
  let over = false;

  const finish = () => {
    if (over) return;
    over = true;
    if (timer) { clearInterval(timer); timer = null; }
    if (score > P.bestSprint) P.bestSprint = score;
    markPlayedToday();
    save();
    stopSession();
    onFinish(score, P.bestSprint);
  };

  timer = setInterval(() => {
    left--;
    refreshChrome();
    if (left <= 0) finish();
  }, 1000);

  startSession({
    kind: "sprint",
    showPicker: false,
    autoAdvance: true,
    meta: () => ({ left: "sprint — <b>" + Math.max(0, left) + "s</b> — " + score + " solved", right: "best: " + P.bestSprint }),
    next: () => {
      if (over) return null;
      const cats = P.prefs.enabled;
      const cat = cats[Math.floor(Math.random() * cats.length)];
      return { pz: generators[cat](P.prefs.difficulty), cat: cat };
    },
    onResult: (correct) => { if (correct) score++; },
    finish: finish,
    cleanup: () => { if (timer) { clearInterval(timer); timer = null; } over = true; }
  });
}
