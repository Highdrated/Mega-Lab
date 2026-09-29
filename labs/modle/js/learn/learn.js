import { el } from "../core/dom.js";
import { P, track, trackLabel, trackReady, markRead } from "../core/profile.js";
import { go } from "../core/router.js";
import { checkAchievements } from "../progress/hud.js";

const cache = {};

async function load(t) {
  if (!trackReady(t)) return null;
  if (cache[t]) return cache[t];
  try {
    const mod = await import("../../content/learn/" + t + ".js");
    cache[t] = mod;
    return mod;
  } catch (e) {
    cache[t] = null;
    return null;
  }
}

function empty(what) {
  return '<div class="empty"><h3>No ' + what + ' for ' + trackLabel() + ' yet</h3>' +
    '<p>The ' + trackLabel() + ' track is picked, but its content is not written. Switch to Python at the top, or check back later.</p></div>';
}

export async function index() {
  const box = el("learnBody");
  box.innerHTML = '<div class="loading">loading…</div>';
  const mod = await load(track());
  if (!mod) { box.innerHTML = empty("lessons"); return; }

  const cards = mod.lessons.map(l => {
    const done = P.read.includes(l.slug);
    return '<a class="lesson' + (done ? " done" : "") + '" data-slug="' + l.slug + '">' +
      '<div class="lesson-top"><span class="lesson-title">' + l.title + '</span>' +
      '<span class="lesson-time">' + l.minutes + ' min' + (done ? ' · read' : '') + '</span></div>' +
      '<p class="lesson-blurb">' + l.blurb + '</p></a>';
  }).join("");

  box.innerHTML = '<p class="section-intro">' + mod.intro + '</p><div class="lesson-grid">' + cards + '</div>';
  box.querySelectorAll(".lesson").forEach(a => {
    a.onclick = () => go("/learn/" + a.getAttribute("data-slug"));
  });
}

export async function page(slug) {
  const box = el("learnBody");
  box.innerHTML = '<div class="loading">loading…</div>';
  const mod = await load(track());
  if (!mod) { box.innerHTML = empty("lessons"); return; }

  const i = mod.lessons.findIndex(l => l.slug === slug);
  if (i < 0) { go("/learn"); return; }
  const l = mod.lessons[i];
  const nextL = mod.lessons[i + 1];

  if (markRead(l.slug)) checkAchievements();

  box.innerHTML =
    '<a class="crumb" id="learnBack">← all lessons</a>' +
    '<article class="prose"><h2>' + l.title + '</h2>' + l.body + '</article>' +
    '<div class="lesson-foot">' +
    (l.drill ? '<button class="primary" id="learnDrill">Drill this — ' + l.title.toLowerCase() + ' →</button>' : "") +
    (nextL ? '<button class="secondary" id="learnNext">Next: ' + nextL.title + ' →</button>' : "") +
    "</div>";

  el("learnBack").onclick = () => go("/learn");
  const d = el("learnDrill");
  if (d) d.onclick = () => go("/practice/" + l.drill);
  const n = el("learnNext");
  if (n) n.onclick = () => go("/learn/" + nextL.slug);
}
