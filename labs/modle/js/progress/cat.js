import { el } from "../core/dom.js";
import { P, save, dayStreak } from "../core/profile.js";
import { levelOf } from "./xp.js";

export const HATS = [
  { id: "none", name: "no hat", need: () => true },
  { id: "party", name: "party hat", need: (s) => s.solved >= 10 },
  { id: "crown", name: "crown", need: (s) => s.level >= 5 },
  { id: "witch", name: "witch hat", need: (s) => s.badges >= 6 },
  { id: "cap", name: "backwards cap", need: (s) => s.streak >= 5 },
  { id: "halo", name: "halo", need: (s) => s.built >= 3 },
  { id: "bow", name: "bow", need: (s) => s.read >= 5 }
];

const MOODS = {
  idle: { eyes: "normal", mouth: "small", tail: 0 },
  happy: { eyes: "happy", mouth: "smile", tail: 1 },
  sad: { eyes: "sad", mouth: "flat", tail: -1 },
  sleep: { eyes: "closed", mouth: "small", tail: 0 },
  proud: { eyes: "stars", mouth: "smile", tail: 1 }
};

let mood = "idle";
let bubbleTimer = null;
let idleTimer = null;

function snap() {
  return {
    solved: P.solved, level: levelOf(P.xp), badges: P.unlocked.length,
    streak: P.streak, built: P.built.length, read: P.read.length, days: dayStreak()
  };
}

export function unlockedHats() {
  const s = snap();
  return HATS.filter(h => h.need(s));
}

export const currentHat = () => P.prefs.hat || "none";

export function setHat(id) {
  P.prefs.hat = id;
  save();
  draw();
}

function hatSvg(id) {
  if (id === "party") return '<path d="M32 16 L24 34 L40 34 Z" fill="var(--wrong)"/><circle cx="32" cy="14" r="3" fill="var(--wheat2)"/>';
  if (id === "crown") return '<path d="M22 32 L22 22 L27 27 L32 19 L37 27 L42 22 L42 32 Z" fill="var(--wheat)"/><circle cx="32" cy="21" r="2" fill="var(--wrong)"/>';
  if (id === "witch") return '<path d="M32 10 L40 34 L24 34 Z" fill="var(--xp)"/><ellipse cx="32" cy="34" rx="16" ry="3.5" fill="var(--xp)"/>';
  if (id === "cap") return '<path d="M20 31 a12 12 0 0 1 24 0 Z" fill="var(--correct)"/><rect x="14" y="29" width="9" height="4" rx="2" fill="var(--correct)"/>';
  if (id === "halo") return '<ellipse cx="32" cy="16" rx="11" ry="3.5" fill="none" stroke="var(--wheat2)" stroke-width="2.5"/>';
  if (id === "bow") return '<path d="M26 28 L20 23 L20 33 Z" fill="var(--wrong)"/><path d="M30 28 L36 23 L36 33 Z" fill="var(--wrong)"/><circle cx="28" cy="28" r="2.5" fill="var(--wheat2)"/>';
  return "";
}

function eyesSvg(kind) {
  if (kind === "closed") return '<path d="M25 45 q3 3 6 0" stroke="var(--bg)" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M37 45 q3 3 6 0" stroke="var(--bg)" stroke-width="2" fill="none" stroke-linecap="round"/>';
  if (kind === "happy") return '<path d="M25 46 q3 -4 6 0" stroke="var(--bg)" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M37 46 q3 -4 6 0" stroke="var(--bg)" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
  if (kind === "sad") return '<circle cx="28" cy="45" r="2.6" fill="var(--bg)"/><circle cx="40" cy="45" r="2.6" fill="var(--bg)"/><path d="M24 40 l7 3" stroke="var(--bg)" stroke-width="1.6" stroke-linecap="round"/><path d="M44 40 l-7 3" stroke="var(--bg)" stroke-width="1.6" stroke-linecap="round"/>';
  if (kind === "stars") return '<path d="M28 41 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2 z" fill="var(--bg)"/><path d="M40 41 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2 z" fill="var(--bg)"/>';
  return '<circle cx="28" cy="44" r="3" fill="var(--bg)"/><circle cx="40" cy="44" r="3" fill="var(--bg)"/><circle cx="29" cy="43" r="1" fill="var(--panel)"/><circle cx="41" cy="43" r="1" fill="var(--panel)"/>';
}

function mouthSvg(kind) {
  if (kind === "smile") return '<path d="M28 52 q4 4 8 0" stroke="var(--bg)" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
  if (kind === "flat") return '<path d="M29 53 l6 0" stroke="var(--bg)" stroke-width="1.8" stroke-linecap="round"/>';
  return '<path d="M30 52 q2 2 4 0" stroke="var(--bg)" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
}

function draw() {
  const host = el("catArt");
  if (!host) return;
  const m = MOODS[mood] || MOODS.idle;
  host.innerHTML =
    '<svg viewBox="0 0 64 64" width="100%" height="100%">' +
      '<path class="cat-tail" d="M46 56 q12 -2 8 -14" stroke="var(--wheat)" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<path d="M20 38 L18 26 L28 32 Z" fill="var(--wheat)"/>' +
      '<path d="M44 38 L46 26 L36 32 Z" fill="var(--wheat)"/>' +
      '<path d="M21 37 L20 30 L26 34 Z" fill="var(--wrong)" opacity="0.55"/>' +
      '<path d="M43 37 L44 30 L38 34 Z" fill="var(--wrong)" opacity="0.55"/>' +
      '<ellipse cx="32" cy="47" rx="17" ry="14" fill="var(--wheat)"/>' +
      eyesSvg(m.eyes) +
      '<path d="M31 49 l2 0 -1 1.6 z" fill="var(--bg)"/>' +
      mouthSvg(m.mouth) +
      '<path d="M12 46 l8 1.5" stroke="var(--bg)" stroke-width="1" opacity="0.5" stroke-linecap="round"/>' +
      '<path d="M12 51 l8 -0.5" stroke="var(--bg)" stroke-width="1" opacity="0.5" stroke-linecap="round"/>' +
      '<path d="M52 46 l-8 1.5" stroke="var(--bg)" stroke-width="1" opacity="0.5" stroke-linecap="round"/>' +
      '<path d="M52 51 l-8 -0.5" stroke="var(--bg)" stroke-width="1" opacity="0.5" stroke-linecap="round"/>' +
      hatSvg(currentHat()) +
    "</svg>";
  host.parentNode.classList.toggle("wag", m.tail > 0);
}

export function say(text, ms, action) {
  const b = el("catSay");
  if (!b || P.prefs.catOff) return;
  b.innerHTML = text + (action ? '<button class="cat-do" id="catDo">' + action.label + "</button>" : "");
  b.classList.toggle("wide", !!action);
  b.style.pointerEvents = action ? "auto" : "none";
  b.classList.add("show");
  if (action) {
    const btn = el("catDo");
    if (btn) btn.onclick = () => { b.classList.remove("show"); b.style.pointerEvents = "none"; action.run(); };
  }
  if (bubbleTimer) clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => { b.classList.remove("show"); b.style.pointerEvents = "none"; }, ms || 4200);
}

export function advise(tip, run) {
  feel("proud", tip.text, 11000, { label: tip.label, run: run });
}

export function feel(next, line, ms, action) {
  mood = next;
  draw();
  if (line) say(line, ms, action);
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { mood = "idle"; draw(); }, 5000);
}

const NUDGE = {
  correct: ["nice one.", "that's it.", "yep, exactly.", "clean.", "you had that one."],
  wrong: ["happens. read the working below.", "worth a second look.", "that one's sneaky.", "no shame, it comes back later."],
  streak: ["three in a row.", "you're on a run.", "don't stop now."],
  level: ["level up!", "new level. tidy."],
  welcome: ["ready when you are.", "let's do a few.", "morning."],
  due: ["you've got reviews waiting.", "some bits are due back."],
  ahead: ["nothing due. you're ahead.", "all caught up."]
};

const one = (k) => NUDGE[k][Math.floor(Math.random() * NUDGE[k].length)];

export function onAnswer(correct) {
  if (correct) {
    if (P.streak > 0 && P.streak % 5 === 0) feel("proud", one("streak"));
    else feel("happy", one("correct"), 2200);
  } else {
    feel("sad", one("wrong"), 3200);
  }
}

export function onLevel() { feel("proud", one("level"), 3600); }

export function greet(dueCount) {
  if (dueCount > 0) feel("idle", one("due"), 4000);
  else feel("sleep", one("ahead"), 3400);
}

export function toggle() {
  P.prefs.catOff = !P.prefs.catOff;
  save();
  render();
}

export function render() {
  const host = el("cat");
  if (!host) return;
  host.classList.toggle("hidden", !!P.prefs.catOff);
  if (P.prefs.catOff) return;
  draw();
}

export function wire() {
  const host = el("cat");
  if (!host) return;
  el("catArt").onclick = () => {
    const s = snap();
    const bits = [];
    if (s.days > 0) bits.push(s.days + "-day streak");
    bits.push("level " + s.level);
    bits.push(s.badges + " badges");
    feel("happy", bits.join(" · "), 3600);
  };
  el("catHide").onclick = (e) => { e.stopPropagation(); toggle(); };
  render();
}
