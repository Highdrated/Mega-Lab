import { el } from "./core/dom.js";
import { P, save } from "./core/profile.js";
import { route, fallback, before, start as startRouter, go, here } from "./core/router.js";
import { allCatKeys } from "./core/catalog.js";
import { updateHud, renderShelf, updateRail } from "./progress/hud.js";
import * as trackPicker from "./lang/track.js";
import * as themes from "./core/themes.js";
import * as home from "./screens/home.js";
import * as statsScreen from "./screens/stats.js";
import * as settingsScreen from "./screens/settings.js";
import * as learn from "./learn/learn.js";
import * as build from "./build/build.js";
import * as compete from "./compete/compete.js";
import * as engine from "./practice/engine.js";
import * as free from "./practice/modes/free.js";
import * as daily from "./practice/modes/daily.js";
import * as sprint from "./practice/modes/sprint.js";
import * as review from "./practice/modes/review.js";
import * as drillMode from "./practice/modes/drill.js";
import * as pocket from "./practice/modes/pocket.js";
import * as drill from "./drill/drill.js";
import * as bughunt from "./drill/bughunt.js";
import * as cat from "./progress/cat.js";
import * as syntax from "./drill/syntax.js";
import * as typing from "./drill/typing.js";

function show(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("on"));
  const target = el(id);
  if (target) target.classList.add("on");
  document.body.dataset.screen = id;
}

function leavePractice() {
  engine.stopSession();
  free.updateReviewLink();
}

function leaveDrill() { bughunt.stop(); }

let pending = null;

function showResult(opts) { pending = opts; go("/result"); }

function paintResult(opts) {
  show("result");
  el("resultTitle").textContent = opts.title;
  el("resultScore").textContent = opts.score;
  el("resultSub").textContent = opts.sub;
  el("shareMsg").classList.add("hidden");
  el("shareBtn").classList.toggle("hidden", !opts.share);
  if (opts.share) {
    el("shareBtn").onclick = async () => {
      const msg = el("shareMsg");
      msg.classList.remove("hidden");
      try { await navigator.clipboard.writeText(opts.share); msg.textContent = "copied — paste it anywhere"; }
      catch (e) { msg.textContent = opts.share.replace(/\n/g, "  "); }
    };
  }
}

function dailyResult(score) {
  showResult({
    title: "daily complete",
    score: score + " / 5",
    sub: score === 5 ? "Perfect run. See you tomorrow." : "New challenge tomorrow — keep the day streak alive.",
    share: daily.shareText()
  });
}

route("/", () => { show("home"); home.render(); updateHud(false); });

route("/learn", () => { show("learn"); learn.index(); });
route("/learn/:slug", (p) => { show("learn"); learn.page(p.slug); });

route("/practice", () => { show("practice"); free.start(); updateHud(false); });

route("/result", () => {
  if (!pending) { go("/"); return; }
  paintResult(pending);
});

route("/practice/daily", () => {
  if (daily.doneToday()) {
    showResult({
      title: "daily complete",
      score: P.daily.score + " / 5",
      sub: "You already finished today's challenge — new one tomorrow.",
      share: daily.shareText()
    });
    return;
  }
  show("practice");
  daily.start(dailyResult);
  updateHud(false);
});

route("/practice/sprint", () => {
  show("practice");
  sprint.start((score, best) => {
    showResult({
      title: "sprint over",
      score: String(score),
      sub: "solved in 60 seconds — personal best: " + best,
      share: null
    });
  });
  updateHud(false);
});

route("/practice/pocket", () => {
  show("practice");
  pocket.start((right, total, time) => {
    showResult({
      title: "pocket done",
      score: right + " / " + total,
      sub: time + " — " + (right === total ? "flawless. Your weak spots are getting less weak." : "anything you missed is already queued to come back."),
      share: null
    });
  });
  updateHud(false);
});

route("/practice/review", () => {
  const queue = free.takeMistakes();
  if (!queue.length) { go("/practice"); return; }
  show("practice");
  review.start(queue, () => go("/practice"));
  updateHud(false);
});

route("/practice/:cat", (p) => {
  if (!allCatKeys.includes(p.cat)) { go("/practice"); return; }
  show("practice");
  if (!P.prefs.enabled.includes(p.cat)) { P.prefs.enabled.push(p.cat); save(); }
  const q = p.query || {};
  free.start({ cat: p.cat, kind: q.kind, diff: ["easy", "medium", "hard"].includes(q.diff) ? q.diff : undefined });
  updateHud(false);
});

route("/drill", () => { show("drill"); drill.render(); cat.greet(drill.todayQueue(12).length); });

route("/drill/review", () => {
  const queue = drill.todayQueue(12);
  if (!queue.length) { go("/drill"); return; }
  show("practice");
  drillMode.start(queue, (right, total) => {
    showResult({
      title: "review done",
      score: right + " / " + total,
      sub: right === total
        ? "Clean sweep — those all move further out."
        : "The ones you missed come back tomorrow. That is the point.",
      share: null
    });
  });
  updateHud(false);
});

route("/drill/syntax", () => { show("syntax"); syntax.start(); });
route("/drill/typing", () => { show("typing"); typing.start(); });

route("/drill/bugs", () => { show("bughunt"); el("bugHeading").textContent = "bug hunt"; bughunt.start(false); });
route("/drill/bugs-timed", () => { show("bughunt"); el("bugHeading").textContent = "bug hunt · clock"; bughunt.start(true); });

route("/build", () => { show("build"); build.index(); });
route("/build/:slug", (p) => { show("build"); build.page(p.slug); });

route("/compete", () => { show("compete"); compete.render(); });

route("/stats", () => { show("stats"); statsScreen.render(); });
route("/settings", () => { show("settings"); settingsScreen.render(); });

fallback(() => go("/"));

el("start").onclick = () => go("/practice");
el("startdaily").onclick = () => go("/practice/daily");
el("startsprint").onclick = () => go("/practice/sprint");
el("startpocket").onclick = () => go("/practice/pocket");
el("toreview").onclick = () => go("/practice/review");
el("resultHome").onclick = () => go("/");

engine.wire();
cat.wire();
settingsScreen.wire();
settingsScreen.applyMotion();
themes.apply();
themes.onChange(() => { const path = here(); if (path) go(path); });

trackPicker.render();
trackPicker.whenChanged(() => {
  const path = here() || "/";
  if (path.startsWith("/learn")) go("/learn");
  else if (path.startsWith("/build")) go("/build");
});

bughunt.whenDone((right, total) => {
  showResult({
    title: "bug hunt over",
    score: right + " / " + total,
    sub: right === total ? "Every one. That is a good eye." : "Missed ones come back sooner than the rest.",
    share: null
  });
});

syntax.whenDone((right, total) => {
  showResult({
    title: "syntax round done",
    score: right + " / " + total,
    sub: right === total ? "Every broken card spotted." : "The ones you missed come back sooner.",
    share: null
  });
});

typing.whenDone((r) => {
  showResult({
    title: "typing done",
    score: r.wpm + " wpm",
    sub: r.clean + " of " + r.total + " lines clean · " + r.accuracy + "% accuracy · best " + r.best + " wpm",
    share: null
  });
});

before((from, to) => {
  if (from && from.startsWith("/practice") && !to.startsWith("/practice")) leavePractice();
  if (from && from.startsWith("/drill") && !to.startsWith("/drill")) leaveDrill();
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

renderShelf();
updateHud(false);
updateRail();
startRouter();
