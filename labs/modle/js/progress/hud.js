import { el } from "../core/dom.js";
import { P, dayStreak } from "../core/profile.js";
import { levelOf, rankOf, comboMult } from "./xp.js";
import { achievements, statsSnapshot, newlyUnlocked } from "./achievements.js";
import { SHAPES } from "./shapes.js";
import { announce } from "./toast.js";
import { save } from "../core/profile.js";
import { allSkillKeys } from "../drill/drill.js";
import { summary } from "../drill/schedule.js";

export function updateHud(leveledUp) {
  const s = el("streak"), sv = el("solved");
  if (s) s.textContent = P.streak;
  if (sv) sv.textContent = P.solved;
  const fl = el("flame");
  if (fl) fl.innerHTML = P.streak >= 3 ? '<span class="flame">▲</span>' : "";
  const m = comboMult(P.streak);
  const cb = el("combo");
  if (cb) cb.textContent = m > 1 ? "×" + m : "";
  const fill = el("xpfill");
  if (fill) fill.style.width = (P.xp % 100) + "%";
  const badge = el("badge");
  if (badge) {
    badge.textContent = "lvl " + levelOf(P.xp);
    if (leveledUp) { badge.classList.remove("up"); void badge.offsetWidth; badge.classList.add("up"); }
  }
  updateRail();
}

export function updateRail() {
  const lvl = levelOf(P.xp);
  const r = el("railLvl");
  if (r) r.textContent = "lvl " + lvl;
  const rk = el("railRank");
  if (rk) rk.textContent = rankOf(lvl);
  const rf = el("railFill");
  if (rf) rf.style.width = (P.xp % 100) + "%";
  const rx = el("railXp");
  if (rx) rx.textContent = P.xp + " xp";
  const rb = el("railBadges");
  if (rb) rb.textContent = P.unlocked.length + "/" + achievements.length;
  const rd = el("railDue"), rdn = el("railDueN");
  if (rd && rdn) {
    const s = summary(allSkillKeys());
    const n = s.due + Math.min(4, s.fresh);
    rdn.textContent = n;
    rd.classList.toggle("hot", n > 0);
  }
  const rs = el("railStreak");
  if (rs) {
    const d = dayStreak();
    rs.textContent = d > 0 ? d + "d" : "—";
  }
}

export function checkAchievements() {
  const snap = statsSnapshot(P, levelOf(P.xp), dayStreak());
  const fresh = newlyUnlocked(P, snap);
  if (fresh.length) { save(); announce(fresh); }
  renderShelf();
  updateRail();
  return fresh;
}

export function renderShelf() {
  const box = el("badges");
  if (!box) return;
  box.innerHTML = "";
  achievements.forEach(a => {
    const got = P.unlocked.includes(a.id);
    const cell = document.createElement("div");
    cell.className = "badge-cell" + (got ? " got" : "");
    cell.innerHTML = '<svg class="badge-ic" viewBox="0 0 40 40">' + SHAPES[a.shape] + '</svg><div class="badge-nm">' + a.name + "</div>";
    box.appendChild(cell);
  });
  const cnt = el("shelfcnt");
  if (cnt) cnt.textContent = P.unlocked.length + " / " + achievements.length;
}
