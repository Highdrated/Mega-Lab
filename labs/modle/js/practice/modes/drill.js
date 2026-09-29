import { P, save, markPlayedToday } from "../../core/profile.js";
import { gen } from "../generators.js";
import { startSession } from "../engine.js";
import { grade, parseSkill, markDrilledToday } from "../../drill/schedule.js";
import { checkAchievements } from "../../progress/hud.js";

export function start(queue, onFinish) {
  if (!queue.length) return false;
  let idx = -1;
  let right = 0;
  const seen = [];

  startSession({
    kind: "drill",
    showPicker: false,
    meta: () => ({
      left: "review — <b>" + Math.min(idx + 1, queue.length) + " of " + queue.length + "</b>",
      right: right + " right"
    }),
    next: () => {
      idx++;
      if (idx >= queue.length) return null;
      const s = parseSkill(queue[idx]);
      seen.push(queue[idx]);
      return { pz: gen(s.cat, s.diff, s.kind === "type" ? s.type : undefined), cat: s.cat, diff: s.diff, key: queue[idx] };
    },
    onResult: (correct, item) => {
      if (correct) right++;
      grade(item.key, correct, item.diff);
    },
    nextLabel: () => idx === queue.length - 1 ? "Finish review →" : "Next →",
    finish: () => {
      markDrilledToday();
      markPlayedToday();
      checkAchievements();
      save();
      onFinish(right, queue.length);
    }
  });
  return true;
}
