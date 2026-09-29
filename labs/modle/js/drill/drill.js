import { el } from "../core/dom.js";
import { P } from "../core/profile.js";
import { go } from "../core/router.js";
import { catList, diffList } from "../core/catalog.js";
import { skillKey, summary, buildQueue, nextDueDate, retention, daysBetween } from "./schedule.js";
import { todayStr } from "../core/dates.js";

export function allSkillKeys() {
  const keys = [];
  catList.forEach(c => diffList.forEach(d => keys.push(skillKey(c[0], d))));
  return keys;
}

export const todayQueue = (size) => buildQueue(allSkillKeys(), size || 12, 4);

function bar(s) {
  const seg = (n, cls, label) => n > 0
    ? '<span class="mix-seg ' + cls + '" style="flex:' + n + '" title="' + n + ' ' + label + '"></span>'
    : "";
  return '<div class="mix">' + seg(s.due, "due", "due now") + seg(s.fresh, "fresh", "not started") +
    seg(s.learning - s.due, "learning", "learning") + seg(s.strong, "strong", "solid") + "</div>";
}

export function render() {
  const box = el("drillBody");
  const keys = allSkillKeys();
  const s = summary(keys);
  const q = todayQueue(12);
  const ret = retention();
  const nd = nextDueDate(keys);
  const drilledToday = P.drillDays.includes(todayStr());

  const learningOnly = Math.max(0, s.learning - s.due);

  box.innerHTML =
    '<p class="section-intro">Drill decides what you see, not you. Anything you got wrong comes back soon; anything you keep getting right comes back later and later. That gap is where the learning actually happens.</p>' +

    '<div class="mixwrap">' + bar(s) +
      '<div class="mixkey">' +
        '<span><i class="k due"></i>' + s.due + ' due now</span>' +
        '<span><i class="k fresh"></i>' + s.fresh + ' not started</span>' +
        '<span><i class="k learning"></i>' + learningOnly + ' learning</span>' +
        '<span><i class="k strong"></i>' + s.strong + ' solid</span>' +
      "</div></div>" +

    '<div class="drill-cards">' +

      '<a class="drill-card ' + (q.length ? "hot" : "cool") + '" id="drillReview">' +
        '<b>Today\'s review</b>' +
        '<span class="big">' + (q.length ? q.length : "0") + "</span>" +
        "<span>" + (q.length
          ? (s.due ? s.due + " due back, " : "") + Math.min(4, s.fresh) + " new"
          : "nothing due — you are ahead") + "</span></a>" +

      '<a class="drill-card" id="drillBugs"><b>Bug hunt</b>' +
        '<span class="big">' + P.bugsSolved.length + "/16</span>" +
        "<span>find the one broken line, no clock</span></a>" +

      '<a class="drill-card" id="drillBugsTimed"><b>Bug hunt · clock</b>' +
        '<span class="big">' + (P.bestBugRun || 0) + "</span>" +
        "<span>30 seconds a bug — best run so far</span></a>" +

      '<a class="drill-card" id="drillSyntax"><b>Spot the syntax error</b>' +
        '<span class="big">' + P.syntaxSolved.length + "/12</span>" +
        "<span>four cards, one will not run</span></a>" +

      '<a class="drill-card" id="drillTyping"><b>Type it exactly</b>' +
        '<span class="big">' + (P.bestWpm || 0) + "</span>" +
        "<span>best wpm — brackets, colons, quotes</span></a>" +

    "</div>" +

    '<div class="set-block"><h3>How this works</h3>' +
      "<p>Every category-and-difficulty pair is tracked on its own — thirty of them. Get one right and its next review is pushed further out: 1 day, then 3, then roughly two and a half times longer each time. Get it wrong and it resets to today.</p>" +
      "<p>So a short session each day beats a long one each week, and the app quietly spends most of your time on the things you are worst at.</p></div>" +

    '<div class="set-block"><h3>Signal</h3>' +
      "<p>Recall accuracy across every review so far: <b>" + (ret === null ? "no reviews yet" : ret + "%") + "</b>. " +
      (ret === null ? "Come back after a session or two." :
       ret >= 90 ? "High — you can afford more new material or a harder default difficulty." :
       ret >= 70 ? "About right. This is the range where reviews are doing real work." :
       "Low — you are seeing things too late. Shorter, more frequent sessions will help.") + "</p>" +
      (nd && !q.length ? "<p>Next items come due on <b>" + nd + "</b> — that is in " + daysBetween(todayStr(), nd) + " day(s).</p>" : "") +
      (drilledToday ? '<p class="done-note">Reviewed today ✓</p>' : "") +
    "</div>";

  el("drillReview").onclick = () => { if (q.length) go("/drill/review"); };
  el("drillBugs").onclick = () => go("/drill/bugs");
  el("drillBugsTimed").onclick = () => go("/drill/bugs-timed");
  el("drillSyntax").onclick = () => go("/drill/syntax");
  el("drillTyping").onclick = () => go("/drill/typing");
}
