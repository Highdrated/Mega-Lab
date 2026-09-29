import { el } from "../core/dom.js";
import { P, dayStreak } from "../core/profile.js";
import { go } from "../core/router.js";
import { levelOf, rankOf } from "../progress/xp.js";
import { doneToday, shareText } from "../practice/modes/daily.js";

export function render() {
  const box = el("competeBody");
  const done = doneToday();
  const ds = dayStreak();

  box.innerHTML =
    '<p class="section-intro">Your streaks and daily results live here. Leaderboards need accounts, which are not wired up yet — everything below is stored on this device only.</p>' +

    '<div class="compete-grid">' +
      '<div class="bigstat"><b>' + ds + '</b><span>day streak</span></div>' +
      '<div class="bigstat"><b>' + P.dailiesDone + '</b><span>dailies done</span></div>' +
      '<div class="bigstat"><b>' + P.perfectDailies + '</b><span>perfect runs</span></div>' +
      '<div class="bigstat"><b>' + P.bestSprint + '</b><span>best sprint</span></div>' +
    "</div>" +

    '<div class="set-block"><h3>Today\'s challenge</h3>' +
      "<p>" + (done ? "Finished — you scored " + P.daily.score + " out of 5." : "Five puzzles, the same five for everybody, new every day.") + "</p>" +
      '<button class="' + (done ? "secondary" : "primary") + '" id="cmpDaily">' +
      (done ? "See today's result" : "Play today's challenge") + "</button>" +
      (done ? '<button class="secondary" id="cmpShare">Copy result</button><div class="hint hidden" id="cmpShareMsg"></div>' : "") +
    "</div>" +

    '<div class="set-block"><h3>Pocket</h3><p>Ten puzzles, about five minutes, your weak spots first. Best: <b>' + (P.bestPocket || 0) + '/10</b> · played ' + (P.pocketsDone || 0) + "×</p>" +
      '<button class="secondary" id="cmpPocket">Start a pocket round</button></div>' +

    '<div class="set-block"><h3>Sprint</h3><p>Sixty seconds, as many as you can. Personal best: <b>' + P.bestSprint + "</b></p>" +
      '<button class="secondary" id="cmpSprint">Start a sprint</button></div>' +

    '<div class="set-block locked"><h3>Leaderboards</h3>' +
      "<p>Global and friends-only tables, ranked by daily score and streak length. Waiting on accounts.</p>" +
      '<div class="lock-row"><span class="lock-pill">needs sign-in</span>' +
      '<span class="lock-pill">not built yet</span></div></div>' +

    '<div class="set-block"><h3>Your rank</h3><p>Level ' + levelOf(P.xp) + " — " + rankOf(levelOf(P.xp)) +
      ". Ranks climb every few levels; there are eight in total.</p></div>";

  el("cmpDaily").onclick = () => go("/practice/daily");
  el("cmpSprint").onclick = () => go("/practice/sprint");
  el("cmpPocket").onclick = () => go("/practice/pocket");
  const sh = el("cmpShare");
  if (sh) sh.onclick = async () => {
    const text = shareText();
    if (!text) return;
    const msg = el("cmpShareMsg");
    msg.classList.remove("hidden");
    try { await navigator.clipboard.writeText(text); msg.textContent = "copied — paste it anywhere"; }
    catch (e) { msg.textContent = text.replace(/\n/g, "  "); }
  };
}
