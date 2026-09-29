import { el, esc } from "../core/dom.js";
import { P, save, track, trackReady, trackLabel, markPlayedToday } from "../core/profile.js";
import { levelOf } from "../progress/xp.js";
import { updateHud, checkAchievements } from "../progress/hud.js";
import { markDrilledToday } from "./schedule.js";

const ROUND = 8;
const cache = {};

let items = [];
let idx = 0;
let target = "";
let started = 0;
let strikes = 0;
let totalChars = 0;
let totalErrors = 0;
let times = [];
let onDone = null;

async function load(t) {
  if (!trackReady(t)) return null;
  if (cache[t] !== undefined) return cache[t];
  try { cache[t] = await import("../../content/typing/" + t + ".js"); }
  catch (e) { cache[t] = null; }
  return cache[t];
}

function pick(all) {
  const short = all.filter(d => d.level === "short");
  const med = all.filter(d => d.level === "medium");
  const long = all.filter(d => d.level === "long");
  const seat = P.typedRuns || 0;
  const take = (arr, n) => arr.slice(seat % Math.max(1, arr.length)).concat(arr).slice(0, n);
  return take(short, 2).concat(take(med, 3), take(long, 3)).slice(0, ROUND);
}

export async function start(fn) {
  onDone = fn || onDone;
  const box = el("typeBody");
  box.innerHTML = '<div class="loading">loading…</div>';
  const mod = await load(track());
  if (!mod) {
    box.innerHTML = '<div class="empty"><h3>No typing drills for ' + trackLabel() + ' yet</h3>' +
      "<p>Switch the track to Python at the top of the page.</p></div>";
    return;
  }
  items = pick(mod.drills);
  idx = 0;
  strikes = 0;
  totalChars = 0;
  totalErrors = 0;
  times = [];
  show(mod.intro);
}

function show(intro) {
  if (idx >= items.length) { finish(); return; }
  target = items[idx].text;
  started = 0;

  el("typeBody").innerHTML =
    (intro ? '<p class="section-intro">' + intro + "</p>" : "") +
    '<div class="type-head"><span class="type-count">' + (idx + 1) + " of " + items.length + "</span>" +
    '<span class="type-live" id="typeLive">start typing</span></div>' +
    '<div class="type-target" id="typeTarget"></div>' +
    '<input class="type-input" id="typeInput" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="type the line above" />' +
    '<div class="type-foot"><span class="type-hint">exact match, spaces and punctuation included</span>' +
    '<button class="mini" id="typeSkip">skip</button></div>';

  paint("");
  const inp = el("typeInput");
  inp.value = "";
  inp.oninput = onInput;
  inp.onkeydown = (e) => { if (e.key === "Enter") e.preventDefault(); };
  el("typeSkip").onclick = () => { totalChars += target.length; totalErrors += target.length; next(); };
  inp.focus();
}

function paint(typed) {
  const out = [];
  for (let i = 0; i < target.length; i++) {
    const ch = target[i];
    const shown = ch === " " ? "&nbsp;" : esc(ch);
    let cls = "pending";
    if (i < typed.length) cls = typed[i] === ch ? "hit" : "miss";
    else if (i === typed.length) cls = "cur";
    out.push('<span class="' + cls + '">' + shown + "</span>");
  }
  el("typeTarget").innerHTML = out.join("");
}

function onInput(e) {
  const typed = e.target.value;
  if (!started && typed.length) started = performance.now();
  paint(typed);

  let wrong = 0;
  for (let i = 0; i < typed.length; i++) if (typed[i] !== target[i]) wrong++;

  const live = el("typeLive");
  if (typed.length && started) {
    const mins = (performance.now() - started) / 60000;
    const wpm = Math.max(0, Math.round((typed.length / 5) / Math.max(mins, 0.0001)));
    live.textContent = wpm + " wpm" + (wrong ? " · " + wrong + " off" : "");
    live.classList.toggle("bad", wrong > 0);
  }

  if (typed.length >= target.length) {
    const elapsed = (performance.now() - started) / 1000;
    const clean = typed === target;
    totalChars += target.length;
    totalErrors += wrong;
    if (clean) times.push({ chars: target.length, secs: elapsed });
    e.target.disabled = true;
    finishLine(clean, wrong, elapsed);
  }
}

function finishLine(clean, wrong, secs) {
  const wpm = Math.round((target.length / 5) / Math.max(secs / 60, 0.0001));
  if (clean) {
    strikes++;
    if (wpm > (P.bestWpm || 0)) P.bestWpm = wpm;
  }
  markPlayedToday();
  save();

  const box = document.createElement("div");
  box.className = "type-verdict";
  box.innerHTML =
    '<div class="verdict-head ' + (clean ? "ok" : "no") + '">' +
      (clean ? "clean — " + wpm + " wpm" : wrong + " character" + (wrong === 1 ? "" : "s") + " off") + "</div>" +
    (clean ? "" : '<pre class="fix"><code>' + esc(target) + "</code></pre>") +
    '<button class="next" id="typeNext">' + (idx === items.length - 1 ? "Finish →" : "Next line →") + "</button>";
  el("typeBody").appendChild(box);
  el("typeNext").onclick = next;
  el("typeNext").focus();
}

function next() { idx++; show(null); }

function finish() {
  const acc = totalChars ? Math.round((totalChars - totalErrors) / totalChars * 100) : 0;
  const totSecs = times.reduce((a, t) => a + t.secs, 0);
  const totChars = times.reduce((a, t) => a + t.chars, 0);
  const wpm = totSecs ? Math.round((totChars / 5) / (totSecs / 60)) : 0;

  P.typedRuns = (P.typedRuns || 0) + 1;
  if (strikes === items.length) {
    const before = levelOf(P.xp);
    P.xp += 30;
    updateHud(levelOf(P.xp) > before);
  }
  markDrilledToday();
  save();
  checkAchievements();
  if (onDone) onDone({ clean: strikes, total: items.length, wpm: wpm, accuracy: acc, best: P.bestWpm || 0 });
}

export function whenDone(fn) { onDone = fn; }
