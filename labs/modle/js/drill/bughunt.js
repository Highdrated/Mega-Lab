import { el, esc } from "../core/dom.js";
import { P, save, track, trackReady, trackLabel, markPlayedToday } from "../core/profile.js";
import { go } from "../core/router.js";
import { levelOf } from "../progress/xp.js";
import { updateHud, checkAchievements } from "../progress/hud.js";
import { bugKey, grade, due, fresh, markDrilledToday } from "./schedule.js";

const LIMIT = 30;
const cache = {};

let items = [];
let idx = 0;
let timed = false;
let answered = false;
let correctCount = 0;
let runLength = 0;
let left = 0;
let ticker = null;
let onDone = null;

async function load(t) {
  if (!trackReady(t)) return null;
  if (cache[t] !== undefined) return cache[t];
  try { cache[t] = await import("../../content/bugs/" + t + ".js"); }
  catch (e) { cache[t] = null; }
  return cache[t];
}

function pickOrder(all) {
  const keys = all.map(b => bugKey(b.slug));
  const dueKeys = due(keys);
  const newKeys = fresh(keys);
  const rest = keys.filter(k => dueKeys.indexOf(k) < 0 && newKeys.indexOf(k) < 0);
  const order = dueKeys.concat(newKeys, rest);
  return order.map(k => all.find(b => bugKey(b.slug) === k)).filter(Boolean);
}

export function stop() {
  if (ticker) { clearInterval(ticker); ticker = null; }
}

export async function start(isTimed) {
  timed = !!isTimed;
  stop();
  const box = el("bugBody");
  box.innerHTML = '<div class="loading">loading…</div>';

  const mod = await load(track());
  if (!mod) {
    box.innerHTML = '<div class="empty"><h3>No bug hunt for ' + trackLabel() + ' yet</h3>' +
      "<p>Switch the track to Python at the top of the page.</p></div>";
    return;
  }

  items = pickOrder(mod.bugs);
  idx = 0;
  correctCount = 0;
  runLength = 0;
  show();
}

function tick() {
  const t = el("bugClock");
  if (t) t.textContent = left + "s";
  const fill = el("bugClockFill");
  if (fill) fill.style.width = (left / LIMIT * 100) + "%";
  if (left <= 0) {
    stop();
    if (!answered) judge(-1, true);
  }
  left--;
}

function show() {
  stop();
  if (idx >= items.length) { finish(); return; }
  const b = items[idx];
  answered = false;

  const lines = b.lines.map((l, i) =>
    '<button class="codeline" data-i="' + i + '"><span class="ln">' + (i + 1) + "</span>" +
    '<code>' + (l === "" ? "&nbsp;" : esc(l)) + "</code></button>"
  ).join("");

  el("bugBody").innerHTML =
    '<div class="bug-head">' +
      '<span class="bug-count">' + (idx + 1) + " of " + items.length + "</span>" +
      '<span class="bug-title">' + b.title + "</span>" +
      (timed ? '<span class="bug-clock" id="bugClock">' + LIMIT + "s</span>" : '<span class="bug-kind">' + b.kind + "</span>") +
    "</div>" +
    (timed ? '<div class="clockbar"><div class="clockbar-fill" id="bugClockFill"></div></div>' : "") +
    '<p class="bug-ask">One line below is wrong. Click it.</p>' +
    '<div class="codeblock" id="codeblock">' + lines + "</div>" +
    '<div class="bug-verdict" id="bugVerdict"></div>';

  el("codeblock").querySelectorAll(".codeline").forEach(btn => {
    btn.onclick = () => judge(Number(btn.getAttribute("data-i")), false);
  });

  if (timed) {
    left = LIMIT;
    tick();
    ticker = setInterval(tick, 1000);
  }
}

function judge(chosen, ranOut) {
  if (answered) return;
  answered = true;
  stop();

  const b = items[idx];
  const span = b.span || 1;
  const right = chosen >= b.bad && chosen < b.bad + span;

  el("codeblock").querySelectorAll(".codeline").forEach(btn => {
    const i = Number(btn.getAttribute("data-i"));
    btn.disabled = true;
    if (i >= b.bad && i < b.bad + span) btn.classList.add("isbug");
    else if (i === chosen) btn.classList.add("miss");
  });

  grade(bugKey(b.slug), right);
  P.attempts["bughunt"] = (P.attempts["bughunt"] || 0) + 1;

  if (right) {
    correctCount++;
    runLength++;
    if (!P.bugsSolved.includes(b.slug)) {
      P.bugsSolved.push(b.slug);
      const before = levelOf(P.xp);
      P.xp += 25;
      updateHud(levelOf(P.xp) > before);
    }
    if (timed && runLength > (P.bestBugRun || 0)) P.bestBugRun = runLength;
  } else {
    runLength = 0;
  }
  markPlayedToday();
  save();
  checkAchievements();

  el("bugVerdict").innerHTML =
    '<div class="verdict-head ' + (right ? "ok" : "no") + '">' +
      (right ? "found it." : ranOut ? "time — the bug was line " + (b.bad + 1) + "." : "not that one — line " + (b.bad + 1) + " is the bug.") +
    "</div>" +
    '<p class="why">' + b.why + "</p>" +
    '<div class="fixlabel">the fix</div><pre class="fix"><code>' + esc(b.fix) + "</code></pre>" +
    '<button class="next" id="bugNext">' + (idx === items.length - 1 ? "Finish →" : "Next bug →") + "</button>";

  el("bugNext").onclick = () => { idx++; show(); };
  el("bugVerdict").scrollIntoView({ block: "nearest" });
}

function finish() {
  stop();
  markDrilledToday();
  save();
  if (onDone) onDone(correctCount, items.length);
}

export function whenDone(fn) { onDone = fn; }
