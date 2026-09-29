import { el, esc } from "../core/dom.js";
import { P, save, track, trackReady, trackLabel, markPlayedToday } from "../core/profile.js";
import { levelOf } from "../progress/xp.js";
import { updateHud, checkAchievements } from "../progress/hud.js";
import { grade, due, fresh, markDrilledToday } from "./schedule.js";

const cache = {};
let items = [];
let idx = 0;
let answered = false;
let right = 0;
let onDone = null;

export const syntaxKey = (slug) => "syn:" + slug;

async function load(t) {
  if (!trackReady(t)) return null;
  if (cache[t] !== undefined) return cache[t];
  try { cache[t] = await import("../../content/syntax/" + t + ".js"); }
  catch (e) { cache[t] = null; }
  return cache[t];
}

function order(all) {
  const keys = all.map(s => syntaxKey(s.slug));
  const d = due(keys), n = fresh(keys);
  const rest = keys.filter(k => d.indexOf(k) < 0 && n.indexOf(k) < 0);
  return d.concat(n, rest).map(k => all.find(s => syntaxKey(s.slug) === k)).filter(Boolean);
}

function seatFor(slug, count) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
  return Math.abs(h) % count;
}

export async function start(fn) {
  onDone = fn || onDone;
  const box = el("synBody");
  box.innerHTML = '<div class="loading">loading…</div>';
  const mod = await load(track());
  if (!mod) {
    box.innerHTML = '<div class="empty"><h3>No syntax cards for ' + trackLabel() + ' yet</h3>' +
      "<p>Switch the track to Python at the top of the page.</p></div>";
    return;
  }
  items = order(mod.sets);
  idx = 0;
  right = 0;
  show(mod.intro);
}

function show(intro) {
  if (idx >= items.length) { finish(); return; }
  const s = items[idx];
  answered = false;

  const cards = s.good.slice();
  const seat = seatFor(s.slug, cards.length + 1);
  cards.splice(seat, 0, s.bad);

  el("synBody").innerHTML =
    (intro ? '<p class="section-intro">' + intro + "</p>" : "") +
    '<div class="syn-head"><span class="syn-count">' + (idx + 1) + " of " + items.length + "</span>" +
    '<span class="syn-ask">Which one will not run?</span></div>' +
    '<div class="syn-grid" id="synGrid">' +
      cards.map((c, i) =>
        '<button class="syncard" data-i="' + i + '"><span class="syncard-tag">' +
        String.fromCharCode(65 + i) + '</span><pre><code>' + esc(c) + "</code></pre></button>"
      ).join("") +
    "</div><div class=\"syn-verdict\" id=\"synVerdict\"></div>";

  el("synGrid").querySelectorAll(".syncard").forEach(btn => {
    btn.onclick = () => judge(Number(btn.getAttribute("data-i")), seat);
  });
}

function judge(chosen, seat) {
  if (answered) return;
  answered = true;
  const s = items[idx];
  const correct = chosen === seat;

  el("synGrid").querySelectorAll(".syncard").forEach(btn => {
    const i = Number(btn.getAttribute("data-i"));
    btn.disabled = true;
    if (i === seat) btn.classList.add("isbad");
    else if (i === chosen) btn.classList.add("wasok");
    else btn.classList.add("dim");
  });

  grade(syntaxKey(s.slug), correct);
  P.attempts["syntax"] = (P.attempts["syntax"] || 0) + 1;
  if (correct) {
    right++;
    if (!P.syntaxSolved.includes(s.slug)) {
      P.syntaxSolved.push(s.slug);
      const before = levelOf(P.xp);
      P.xp += 20;
      updateHud(levelOf(P.xp) > before);
    }
  }
  markPlayedToday();
  save();
  checkAchievements();

  el("synVerdict").innerHTML =
    '<div class="verdict-head ' + (correct ? "ok" : "no") + '">' +
      (correct ? "right — " : "no — ") + "card " + String.fromCharCode(65 + seat) + " is broken. <span class=\"syn-kind\">" + s.kind + "</span></div>" +
    '<p class="why">' + s.why + "</p>" +
    '<div class="fixlabel">the fix</div><pre class="fix"><code>' + esc(s.fix) + "</code></pre>" +
    '<button class="next" id="synNext">' + (idx === items.length - 1 ? "Finish →" : "Next card set →") + "</button>";

  el("synNext").onclick = () => { idx++; show(null); };
}

function finish() {
  markDrilledToday();
  save();
  if (onDone) onDone(right, items.length);
}

export function whenDone(fn) { onDone = fn; }
