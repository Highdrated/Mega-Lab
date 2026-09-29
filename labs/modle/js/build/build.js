import { el, esc } from "../core/dom.js";
import { P, track, trackLabel, trackReady, markBuilt, save } from "../core/profile.js";
import { go } from "../core/router.js";
import { checkAchievements, updateHud } from "../progress/hud.js";
import { levelOf } from "../progress/xp.js";
import { boot, isReady, runTests } from "./runner.js";
import { buildReadiness } from "../progress/coach.js";
import { catList } from "../core/catalog.js";

const cache = {};
let current = null;

async function load(t) {
  if (!trackReady(t)) return null;
  if (cache[t] !== undefined) return cache[t];
  try { cache[t] = await import("../../content/build/" + t + ".js"); }
  catch (e) { cache[t] = null; }
  return cache[t];
}

function empty() {
  return '<div class="empty"><h3>No challenges for ' + trackLabel() + ' yet</h3>' +
    '<p>Switch the track to Python at the top of the page — that is where the Build challenges live right now.</p></div>';
}

export async function index() {
  const box = el("buildBody");
  box.innerHTML = '<div class="loading">loading…</div>';
  const mod = await load(track());
  if (!mod) { box.innerHTML = empty(); return; }

  const groups = {};
  mod.challenges.forEach(c => { (groups[c.level] = groups[c.level] || []).push(c); });

  const r = buildReadiness();
  let html = '<p class="section-intro">This is the part where you <b>write</b> code instead of reading it. Your Python actually runs, right here in the browser — nothing is sent anywhere. Hidden tests check it and tell you exactly what went wrong.</p>';

  if (r.done === 0) {
    html += '<div class="onramp"><h3>' + (r.ready ? "You're ready for this" : "Worth a warm-up first") + "</h3>" +
      "<p>Practice asks you to <i>predict</i> what code does. Build asks you to <i>write</i> it. That is a real step up, and feeling unprepared the first time is normal — everybody does.</p>" +
      '<div class="onramp-steps">' +
        '<div class="ors ' + (r.read >= 2 ? "done" : "") + '"><b>1</b><span>Read two Learn pages</span><i>' + r.read + ' / 2</i></div>' +
        '<div class="ors ' + (r.solved >= 15 ? "done" : "") + '"><b>2</b><span>Solve 15 puzzles</span><i>' + Math.min(r.solved, 15) + ' / 15</i></div>' +
        '<div class="ors"><b>3</b><span>Start with <i>Double it</i> — one line</span><i>&rarr;</i></div>' +
      "</div>" +
      "<p class=\"onramp-note\">Every challenge below shows what it leans on, and has a nudge button if you get stuck. You cannot break anything — press Run tests as often as you like.</p>" +
      '<div class="onramp-go"><button class="primary" id="orStart">Start with the easiest one</button>' +
      (r.read < 2 ? '<button class="secondary" id="orLearn">Read a Learn page first</button>' : "") + "</div></div>";
  }
  Object.keys(groups).forEach(level => {
    html += '<div class="build-group"><div class="barlabel">' + level + "</div><div class=\"lesson-grid\">";
    html += groups[level].map(c => {
      const done = P.built.includes(c.slug);
      const uses = (c.uses || []).map(u => {
        const meta = catList.find(x => x[0] === u);
        return '<span class="uses-chip">' + (meta ? meta[1] : u) + "</span>";
      }).join("");
      return '<a class="lesson' + (done ? " done" : "") + '" data-slug="' + c.slug + '">' +
        '<div class="lesson-top"><span class="lesson-title">' + c.title + '</span>' +
        '<span class="lesson-time">' + c.tests.length + ' tests' + (done ? ' · passed' : '') + '</span></div>' +
        '<p class="lesson-blurb">' + c.goal.replace(/<[^>]+>/g, "") + '</p>' +
        (uses ? '<div class="uses">uses ' + uses + "</div>" : "") + "</a>";
    }).join("");
    html += "</div></div>";
  });
  box.innerHTML = html;
  box.querySelectorAll(".lesson").forEach(a => {
    a.onclick = () => go("/build/" + a.getAttribute("data-slug"));
  });
  const s1 = el("orStart");
  if (s1) s1.onclick = () => go("/build/" + mod.challenges[0].slug);
  const s2 = el("orLearn");
  if (s2) s2.onclick = () => go("/learn");
}

export async function page(slug) {
  const box = el("buildBody");
  box.innerHTML = '<div class="loading">loading…</div>';
  const mod = await load(track());
  if (!mod) { box.innerHTML = empty(); return; }
  const c = mod.challenges.find(x => x.slug === slug);
  if (!c) { go("/build"); return; }
  current = c;

  box.innerHTML =
    '<a class="crumb" id="buildBack">← all challenges</a>' +
    '<h2 class="build-title">' + c.title + '</h2>' +
    '<div class="goal">' + c.goal + "</div>" +
    '<div class="prep">' +
      (c.uses || []).map(u => '<a class="prep-chip" data-drill="' + u + '">drill ' + u + '</a>').join("") +
      (c.lesson ? '<a class="prep-chip" data-lesson="' + c.lesson + '">read the page</a>' : "") +
      (c.hint ? '<button class="prep-chip nudge" id="buildHint">stuck? nudge me</button>' : "") +
    "</div>" +
    '<div class="nudgebox hidden" id="buildNudge"></div>' +
    '<div class="editor-wrap"><div class="editor-head"><span>editor</span>' +
    '<button class="mini" id="buildReset">reset</button></div>' +
    '<textarea class="editor" id="buildCode" spellcheck="false"></textarea></div>' +
    '<div class="run-row"><button class="primary" id="buildRun">Run tests</button>' +
    '<span class="run-note" id="buildNote"></span></div>' +
    '<div class="results" id="buildResults"></div>';

  el("buildCode").value = c.starter;
  box.querySelectorAll("[data-drill]").forEach(a => { a.onclick = () => go("/practice/" + a.getAttribute("data-drill")); });
  box.querySelectorAll("[data-lesson]").forEach(a => { a.onclick = () => go("/learn/" + a.getAttribute("data-lesson")); });
  const hb = el("buildHint");
  if (hb) hb.onclick = () => {
    const n = el("buildNudge");
    n.classList.toggle("hidden");
    n.innerHTML = c.hint;
  };
  el("buildBack").onclick = () => go("/build");
  el("buildReset").onclick = () => { el("buildCode").value = c.starter; el("buildResults").innerHTML = ""; };
  el("buildRun").onclick = run;
  el("buildCode").addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const t = e.target, s = t.selectionStart;
    t.value = t.value.slice(0, s) + "    " + t.value.slice(t.selectionEnd);
    t.selectionStart = t.selectionEnd = s + 4;
  });

  el("buildNote").textContent = isReady() ? "Python ready" : "Python loads on first run";
}

async function run() {
  const btn = el("buildRun"), note = el("buildNote"), out = el("buildResults");
  btn.disabled = true;
  out.innerHTML = "";
  note.textContent = isReady() ? "running…" : "downloading Python (a few MB, first time only)…";

  try {
    await boot();
  } catch (e) {
    note.textContent = "";
    out.innerHTML = '<div class="run-error"><b>Could not load Python.</b>' +
      "<span>The runtime is fetched from a CDN, so this needs an internet connection and an unblocked network. Everything else on Modle works offline.</span></div>";
    btn.disabled = false;
    return;
  }

  note.textContent = "running…";
  const res = await runTests(el("buildCode").value, current.tests);
  note.textContent = "";
  btn.disabled = false;

  if (!res.ok) {
    out.innerHTML = '<div class="run-error"><b>Your code did not run.</b><pre>' + esc(res.error) + "</pre></div>";
    return;
  }

  const passed = res.results.filter(r => r.ok).length;
  const all = passed === res.results.length;

  out.innerHTML =
    '<div class="result-head ' + (all ? "pass" : "fail") + '">' + passed + " of " + res.results.length + " tests passing</div>" +
    res.results.map(r =>
      '<div class="test ' + (r.ok ? "pass" : "fail") + '">' +
      '<span class="mark">' + (r.ok ? "✓" : "✗") + "</span>" +
      '<code class="tcall">' + esc(r.call) + "</code>" +
      '<span class="texp">' + (r.ok ? "" : "got " + esc(r.got) + " · wanted " + esc(r.want)) + "</span></div>"
    ).join("");

  if (all) {
    const first = markBuilt(current.slug);
    if (first) {
      const before = levelOf(P.xp);
      P.xp += 50;
      save();
      updateHud(levelOf(P.xp) > before);
      checkAchievements();
      out.innerHTML += '<div class="solved-note">Solved — <b>+50 xp</b></div>';
    } else {
      out.innerHTML += '<div class="solved-note">Solved again. XP only counts the first time.</div>';
    }
  }
}
