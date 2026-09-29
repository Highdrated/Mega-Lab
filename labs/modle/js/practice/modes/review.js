import { startSession } from "../engine.js";

export function start(queue, onFinish) {
  if (!queue.length) return false;
  let idx = -1;

  startSession({
    kind: "review",
    showPicker: false,
    meta: () => ({ left: "review — <b>" + Math.min(idx + 1, queue.length) + " of " + queue.length + "</b>", right: "second chances" }),
    next: () => { idx++; return idx < queue.length ? queue[idx] : null; },
    onResult: () => {},
    nextLabel: () => idx === queue.length - 1 ? "Done reviewing →" : "Next puzzle →",
    finish: onFinish
  });
  return true;
}
