import { el } from "../core/dom.js";
import { P, dayStreak } from "../core/profile.js";
import { dateKey } from "../core/dates.js";
import { levelOf, rankOf } from "../progress/xp.js";
import { renderShelf } from "../progress/hud.js";
import { doneToday } from "../practice/modes/daily.js";

const demoLines = ["7 * 8", "0b101", "2 ** 5", 'len("drone")', "ceil(53 / 8)", "(9 + 4) % 10"];
const demoVals = { "7 * 8": 56, "0b101": 5, "2 ** 5": 32, 'len("drone")': 5, "ceil(53 / 8)": 7, "(9 + 4) % 10": 3 };
let demoIdx = 0;
let ticker = null;

function cycleDemo() {
  const node = el("demo");
  if (!node) return;
  const line = demoLines[demoIdx % demoLines.length];
  node.classList.remove("swap"); void node.offsetWidth; node.classList.add("swap");
  node.innerHTML = '<span class="arrows">&gt;&gt;&gt; </span>' + line + '<br><span class="val">' + demoVals[line] + "</span>";
  demoIdx++;
}

export function startDemo() {
  if (ticker) return;
  cycleDemo();
  ticker = setInterval(cycleDemo, 2600);
}

function renderCal() {
  const grid = el("calgrid");
  grid.innerHTML = "";
  const today = new Date();
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const c = document.createElement("div");
    c.className = "cal-cell" + (P.days.includes(dateKey(d)) ? " hit" : "") + (i === 0 ? " today" : "");
    grid.appendChild(c);
  }
  const ds = dayStreak();
  el("daystreak").textContent = ds > 0 ? ds + "-day streak" : "play today to start a streak";
}

export function render() {
  el("ranktag").textContent = "lvl " + levelOf(P.xp) + " · " + rankOf(levelOf(P.xp));
  const done = doneToday();
  const btn = el("startdaily");
  btn.classList.toggle("done", done);
  btn.textContent = done ? "Daily complete ✓ (" + P.daily.score + "/5)" : "Daily challenge";
  renderShelf();
  renderCal();
  startDemo();
}
