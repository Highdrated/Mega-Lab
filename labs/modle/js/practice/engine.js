import { el, esc } from "../core/dom.js";
import { P, save, markPlayedToday, markTried } from "../core/profile.js";
import { levelOf, gainFor } from "../progress/xp.js";
import { updateHud, checkAchievements } from "../progress/hud.js";
import { vizRenderers } from "./viz/renderers.js";
import { hints } from "./hints.js";
import { gen } from "./generators.js";
import { grade } from "../drill/schedule.js";
import { todayStr } from "../core/dates.js";
import { typeKey, kindLabel } from "./kinds.js";
import * as cat from "../progress/cat.js";
import * as coach from "../progress/coach.js";

let session = null;
let item = null;
let answered = false;
let retryNext = null;

export const activeSession = () => session;
export const activeItem = () => item;

const isTF = (ans) => ans === "True" || ans === "False";

export function matches(raw, ans) {
  if (typeof ans === "number") {
    const n = raw.replace(/\s+/g, "").replace(/^[/+]/, "").replace(",", ".").replace(/^−/, "-");
    return n !== "" && Number(n) === ans;
  }
  const norm = (s) => String(s).replace(/[\s()'"\[\]]+/g, "").toLowerCase();
  return norm(raw) === norm(ans);
}

function renderViz(v) {
  const box = el("viz");
  if (!box) return;
  if (!P.prefs.visual || !v) { box.innerHTML = ""; return; }
  const fn = vizRenderers[v.t];
  box.innerHTML = fn ? fn(v) : "";
}

function paintVizBtn() {
  const b = el("vizbtn");
  if (b) { b.classList.toggle("open", !!P.prefs.visual); b.title = P.prefs.visual ? "diagrams on" : "diagrams off"; }
}

export function toggleViz() {
  P.prefs.visual = !P.prefs.visual;
  P.prefs.visualSet = true;
  save();
  paintVizBtn();
  if (answered && item) renderViz(item.pz.viz);
}

export function toggleHint(force) {
  const box = el("hintbox"), btn = el("helpbtn");
  if (!box || !btn) return;
  const show = force !== undefined ? force : box.classList.contains("hidden");
  box.classList.toggle("hidden", !show);
  btn.classList.toggle("open", show);
  if (show) box.innerHTML = (item && hints[item.cat]) || "";
}

function itemDiff(it) {
  return it.diff || (session && session.diff && session.diff()) || P.prefs.difficulty || "easy";
}

function paint() {
  const p = el("prompt");
  p.classList.remove("fresh"); void p.offsetWidth; p.classList.add("fresh");
  p.innerHTML = '<span class="arrows">&gt;&gt;&gt; </span>' + item.pz.code.split("\n>>> ").join('\n<span class="arrows">&gt;&gt;&gt; </span>');
  el("card").className = "card" + (item.retry ? " retrying" : "");
  const tag = el("retrytag");
  tag.classList.toggle("hidden", !item.retry && !item.focus);
  tag.textContent = item.retry ? "one more like it — " + kindLabel(item.cat, item.pz.kind) : item.focus ? "focus — " + kindLabel(item.cat, item.pz.kind) : "";
  el("answer").value = "";
  el("feedback").textContent = "";
  el("feedback").className = "feedback";
  el("viz").innerHTML = "";

  const ans = item.pz.answer;
  const tf = isTF(ans);
  el("ansrow").classList.toggle("hidden", tf);
  el("tfrow").classList.toggle("hidden", !tf);
  el("tfrow").querySelectorAll("button").forEach(b => { b.disabled = false; b.className = "tf"; });
  const numeric = typeof ans === "number";
  el("pmkey").classList.toggle("hidden", !numeric);

  const inp = el("answer");
  inp.placeholder = item.pz.placeholder || "your answer";
  inp.setAttribute("inputmode", numeric ? "decimal" : (item.pz.inputmode || "text"));
  el("next").classList.add("hidden");
  toggleHint(false);
  paintVizBtn();
  if (!tf) inp.focus();
}

function chrome() {
  el("freeui").classList.toggle("hidden", !session.showPicker);
  if (session.kind !== "free") el("focusbar").classList.add("hidden");
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
  retryNext = null;
  chrome();
  advance();
}

export function stopSession() {
  if (session && session.cleanup) session.cleanup();
  session = null;
  item = null;
  answered = false;
  retryNext = null;
}

export function present(nextItem) {
  item = nextItem;
  answered = false;
  markTried(item.cat);
  save();
  paint();
  chrome();
}

function gradeType(correct) {
  if (!item.pz.kind || item.retry) return;
  const key = typeKey(item.cat, item.pz.kind);
  if (item.key === key) return;
  if (!correct) grade(key, false, itemDiff(item));
  else if (P.srs[key] && P.srs[key].due <= todayStr()) grade(key, true, itemDiff(item));
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

  if (isTF(item.pz.answer)) {
    el("tfrow").querySelectorAll("button").forEach(b => {
      b.disabled = true;
      if (b.dataset.v === String(item.pz.answer)) b.classList.add("right");
      else if (b.dataset.v.toLowerCase() === raw.toLowerCase()) b.classList.add("picked");
    });
  }

  if (correct) {
    const before = levelOf(P.xp);
    const gain = gainFor(P.streak);
    P.streak++;
    P.solved++;
    P.maxStreak = Math.max(P.maxStreak, P.streak);
    P.xp += gain;
    P.cats[item.cat] = (P.cats[item.cat] || 0) + 1;
    if (item.retry) P.retriesWon = (P.retriesWon || 0) + 1;
    card.className = "card correct";
    fb.className = "feedback ok";
    fb.innerHTML = '<span class="verdict">' + (item.retry ? "got it this time." : "correct.") + '</span><span class="explain">' + item.pz.explain + "</span>";
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

  gradeType(correct);
  if (!item.retry) session.onResult(correct, item);
  chrome();

  coach.record(item.cat, itemDiff(item), correct);
  if (session.kind === "free" && session.onCoach) {
    const tip = coach.suggest({ cat: item.cat, diff: itemDiff(item), due: 0 });
    if (tip) session.onCoach(tip);
  }

  if (session.autoAdvance) { setTimeout(() => { if (session && session.autoAdvance) advance(); }, 900); return; }

  retryNext = null;
  if (!correct && !item.retry && item.pz.kind && session.allowRetry !== false) {
    const d = itemDiff(item);
    retryNext = { pz: gen(item.cat, d, item.pz.kind), cat: item.cat, diff: d, retry: true };
  }
  el("next").textContent = retryNext ? "Try one like it →" : (session.nextLabel ? session.nextLabel() : "Next puzzle →");
  el("next").classList.remove("hidden");
  if (isTF(item.pz.answer) || matchMedia("(pointer: coarse)").matches) el("next").focus({ preventScroll: true });
}

export function advance() {
  if (!session) return;
  if (retryNext) { const r = retryNext; retryNext = null; present(r); return; }
  const nxt = session.next();
  if (nxt) present(nxt);
  else session.finish();
}

function flipSign() {
  const inp = el("answer");
  const v = inp.value.trim();
  inp.value = v.startsWith("-") ? v.slice(1) : "-" + v;
  inp.focus();
}

export function wire() {
  el("check").onclick = submit;
  el("next").onclick = advance;
  el("helpbtn").onclick = () => toggleHint();
  el("vizbtn").onclick = () => toggleViz();
  el("pmkey").onclick = flipSign;
  el("tfrow").querySelectorAll("button").forEach(b => {
    b.onclick = () => { if (answered) return; el("answer").value = b.dataset.v; submit(); };
  });
  el("answer").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (answered) advance(); else submit();
  });
  document.addEventListener("keydown", (e) => {
    if (!session || !el("practice").classList.contains("on")) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
    if (e.key === "Enter" && answered) { e.preventDefault(); advance(); return; }
    if (!answered && item && isTF(item.pz.answer) && (e.key === "t" || e.key === "f")) {
      el("answer").value = e.key === "t" ? "True" : "False";
      submit();
    }
  });
}
