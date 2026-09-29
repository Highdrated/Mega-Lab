import { el } from "../core/dom.js";
import { SHAPES } from "./shapes.js";

let queue = [];
let busy = false;

function run() {
  if (busy || queue.length === 0) return;
  busy = true;
  const a = queue.shift();
  el("toastic").innerHTML = SHAPES[a.shape];
  el("toastnm").textContent = a.name;
  const t = el("toast");
  t.classList.add("show");
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => { busy = false; run(); }, 500);
  }, 2600);
}

export function announce(items) {
  if (!items || !items.length) return;
  queue = queue.concat(items);
  run();
}
