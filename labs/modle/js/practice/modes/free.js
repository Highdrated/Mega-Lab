import { el } from "../../core/dom.js";
import { P, save } from "../../core/profile.js";
import { catList, diffList } from "../../core/catalog.js";
import { generators } from "../generators.js";
import { startSession, advance, activeSession } from "../engine.js";
import * as catNpc from "../../progress/cat.js";
import { go } from "../../core/router.js";

let cat = "basics";
let diff = "easy";
let mistakes = [];

export const picked = () => ({ cat, diff });
export const mistakeCount = () => mistakes.length;
export const takeMistakes = () => { const m = mistakes.slice(); mistakes = []; return m; };

export function setCategory(k) { cat = k; }
export function setDifficulty(k) { diff = k; }

function enabledCats() { return catList.filter(c => P.prefs.enabled.includes(c[0])); }

function buildBar(boxId, items, getKey, getLabel, getSym, extraClass, onChoose, activeKey) {
  const box = el(boxId);
  if (!box) return;
  box.innerHTML = "";
  items.forEach(itemDef => {
    const key = getKey(itemDef);
    const b = document.createElement("button");
    b.className = "chip " + extraClass + (key === activeKey ? " active" : "");
    const sym = getSym(itemDef);
    b.innerHTML = (sym ? '<span class="sym">' + sym + "</span>" : "") + getLabel(itemDef);
    b.onclick = () => {
      box.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      b.classList.add("active");
      onChoose(key);
      if (activeSession()) advance();
    };
    box.appendChild(b);
  });
}

export function rebuildBars() {
  if (!P.prefs.enabled.includes(cat)) cat = P.prefs.enabled[0];
  buildBar("diffs", diffList, d => d, d => d, () => "", "diff", k => { diff = k; }, diff);
  buildBar("cats", enabledCats(), c => c[0], c => c[1], c => c[2], "", k => { cat = k; }, cat);
}

export function updateReviewLink() {
  const wrap = el("reviewwrap");
  if (!wrap) return;
  const s = activeSession();
  wrap.classList.toggle("hidden", mistakes.length === 0 || !s || s.kind !== "free");
  el("toreview").textContent = "review mistakes (" + mistakes.length + ")";
}

export function start(opts) {
  if (opts && opts.cat) cat = opts.cat;
  diff = (opts && opts.diff) || P.prefs.difficulty;
  rebuildBars();
  startSession({
    kind: "free",
    showPicker: true,
    diff: () => diff,
    onCoach: (tip) => {
      catNpc.advise(tip, () => {
        if (tip.act.kind === "difficulty") { diff = tip.act.value; rebuildBars(); advance(); }
        else if (tip.act.kind === "category") { cat = tip.act.value; rebuildBars(); advance(); }
        else if (tip.act.kind === "learn") go("/learn/" + tip.act.value);
        else if (tip.act.kind === "go") go(tip.act.value);
      });
    },
    meta: () => null,
    next: () => ({ pz: generators[cat](diff), cat: cat }),
    onResult: (correct, item) => {
      if (!correct && mistakes.length < 20) mistakes.push({ pz: item.pz, cat: item.cat });
      updateReviewLink();
      save();
    },
    nextLabel: () => "Next puzzle →",
    finish: () => {}
  });
  updateReviewLink();
}
