import { el, esc } from "../core/dom.js";
import { P, save, markPlayedToday, markTried } from "../core/profile.js";
import { levelOf, gainFor } from "../progress/xp.js";
import { updateHud, checkAchievements } from "../progress/hud.js";
import { vizRenderers } from "./viz/renderers.js";
import { hints } from "./hints.js";
import * as cat from "../progress/cat.js";
import * as coach from "../progress/coach.js";

let session = null;
let item = null;
let answered = false;

export const activeSession = () => session;
export const activeItem = () => item;

export function matches(raw, ans) {
  if (typeof ans === "number") return Number(raw) === ans;
  return raw.replace(/[\s()]+/g, "").toLowerCase() === String(ans).replace(/[\s()]+/g, "").toLowerCase();
}

function renderViz(v) {
  const box = el("viz");
  if (!box) return;
  if (!P.prefs.visual || !v) { box.innerHTML = ""; return; }
  const fn = vizRenderers[v.t];
  box.innerHTML = fn ? fn(v) : "";
}

export function toggleHint(force) {
  const box = el("hintbox"), btn = el("helpbtn");
  if (!box || !btn) return;
  const show = force !== undefined ? force : box.classList.contains("hidden");
  box.classList.toggle("hidden", !show);
  btn.classList.toggle("open", show);
  if (show) box.innerHTML = (item && hints[item.cat]) || "";
}

function paint() {
  const p = el("prompt");
  p.classList.remove("fresh"); void p.offsetWidth; p.classList.add("fresh");
  p.innerHTML = '<span class="arrows">&gt;&gt;&gt; </span>' + item.pz.code.split("\n>>> ").join('\n<span class="arrows">&gt;&gt;&gt; </span>');
  el("card").className = "card";
  el("answer").value = "";
  el("feedback").textContent = "";
  el("feedback").className = "feedback";
  el("viz").innerHTML = "";
  const inp = el("answer");
  inp.placeholder = item.pz.placeholder || "your answer";
  inp.setAttribute("inputmode", item.pz.inputmode || "numeric");
  el("next").classList.add("hidden");
  toggleHint(false);
  inp.focus();
}

function chrome() {
  el("freeui").classList.toggle("hidden", !session.showPicker);
  const meta = session.meta ? session.meta() : null;
  el("dailybar").classList.toggle("hidden", !meta);
  if (meta) {
    el("dailyprog").innerHTML = meta.left;
    el("dailydate").textContent = meta.right || "";
  }
}

export function refreshChrome() { if (session) chrome(); }

export function startSession(s) {
  stopSession();
  session = s;
  answered = false;
  chrome();
  advance();
}

export function stopSession() {
  if (session && session.cleanup) session.cleanup();
  session = null;
  item = null;
  answered = false;
}

export function present(nextItem) {
  item = nextItem;
  answered = false;
  markTried(item.cat);
  save();
  paint();
  chrome();
}

export function submit() {
  if (!session || !item || answered) return;
  const raw = el("answer").value.trim();
  if (raw === "") return;
  answered = true;

  const fb = el("feedback"), card = el("card");
  const correct = matches(raw, item.pz.answer);

  P.attempts[item.cat] = (P.attempts[item.cat] || 0) + 1;
  markPlayedToday();

  if (correct) {
    const before = levelOf(P.xp);
    const gain = gainFor(P.streak);
    P.streak++;
    P.solved++;
    P.maxStreak = Math.max(P.maxStreak, P.streak);
    P.xp += gain;
    P.cats[item.cat] = (P.cats[item.cat] || 0) + 1;
    card.className = "card correct";
    fb.className = "feedback ok";
    fb.innerHTML = '<span class="verdict">correct.</span><span class="explain">' + item.pz.explain + "</span>";
    const pop = el("xppop");
    pop.textContent = "+" + gain + " xp";
    pop.classList.remove("show"); void pop.offsetWidth; pop.classList.add("show");
    const leveled = levelOf(P.xp) > before;
    updateHud(leveled);
    checkAchievements();
    if (leveled) cat.onLevel(); else cat.onAnswer(true);
  } else {
    P.streak = 0;
    card.className = "card wrong";
    fb.className = "feedback no";
    fb.innerHTML = '<span class="verdict">not quite — answer was <code>' + esc(String(item.pz.answer)) + '</code></span><span class="explain">' + item.pz.explain + "</span>";
    updateHud(false);
    cat.onAnswer(false);
  }
  save();
  renderViz(item.pz.viz);

  session.onResult(correct, item);
  chrome();

  coach.record(item.cat, item.diff || (session.diff && session.diff()) || "easy", correct);
  if (session.kind === "free" && session.onCoach) {
    const tip = coach.suggest({ cat: item.cat, diff: (session.diff && session.diff()) || "easy", due: 0 });
    if (tip) session.onCoach(tip);
  }

  if (session.autoAdvance) { setTimeout(() => { if (session && session.autoAdvance) advance(); }, 900); return; }
  el("next").textContent = session.nextLabel ? session.nextLabel() : "Next puzzle →";
  el("next").classList.remove("hidden");
}

export function advance() {
  if (!session) return;
  const nxt = session.next();
  if (nxt) present(nxt);
  else session.finish();
}

export function wire() {
  el("check").onclick = submit;
  el("next").onclick = advance;
  el("helpbtn").onclick = () => toggleHint();
  el("answer").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (answered) advance(); else submit();
  });
}
