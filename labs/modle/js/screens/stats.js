import { el } from "../core/dom.js";
import { P } from "../core/profile.js";
import { catList, allCatKeys } from "../core/catalog.js";
import { go } from "../core/router.js";

export function render() {
  el("stTotal").textContent = P.solved;
  let att = 0, cor = 0;
  allCatKeys.forEach(k => { att += P.attempts[k] || 0; cor += P.cats[k] || 0; });
  el("stAcc").textContent = att ? Math.min(100, Math.round(cor / att * 100)) + "%" : "-";
  el("stBest").textContent = P.maxStreak;

  const box = el("statrows");
  box.innerHTML = "";
  catList.forEach(c => {
    const a = P.attempts[c[0]] || 0, k = P.cats[c[0]] || 0;
    const pct = a ? Math.min(100, Math.round(k / a * 100)) : 0;
    const row = document.createElement("div");
    row.className = "statrow";
    row.style.cursor = "pointer";
    row.title = "practice " + c[1];
    row.innerHTML = '<div class="nm"><span>' + c[1] + ' <span style="color:var(--wheat)">›</span></span><span><span class="pct">' +
      (a ? pct + "%" : "—") + '</span> <span class="n">' + k + "/" + a + '</span></span></div>' +
      '<div class="statbar"><div class="statfill" style="width:' + pct + '%"></div></div>';
    row.onclick = () => {
      if (!P.prefs.enabled.includes(c[0])) P.prefs.enabled.push(c[0]);
      go("/practice/" + c[0]);
    };
    box.appendChild(row);
  });
}
