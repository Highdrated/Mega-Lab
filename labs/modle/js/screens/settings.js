import { el } from "../core/dom.js";
import { P, save, reset } from "../core/profile.js";
import { catList, diffList } from "../core/catalog.js";
import { go } from "../core/router.js";
import { updateHud, renderShelf } from "../progress/hud.js";
import { forgetTheme } from "../core/theme.js";
import * as trackPicker from "../lang/track.js";
import * as themes from "../core/themes.js";
import * as cat from "../progress/cat.js";

export function applyMotion() {
  document.body.classList.toggle("no-motion", P.prefs.reduceMotion);
}

export function render() {
  const tbox = el("setTheme");
  if (tbox) {
    tbox.innerHTML = "";
    themes.THEMES.forEach(t => {
      const b = document.createElement("button");
      b.className = "chip theme-chip" + (t.key === themes.current() ? " active" : "");
      b.title = t.note;
      b.innerHTML = '<span class="swatch t-' + t.key + '"></span>' + t.label;
      b.onclick = () => { themes.set(t.key); render(); };
      tbox.appendChild(b);
    });
  }

  const dbox = el("setDiff");
  dbox.innerHTML = "";
  diffList.forEach(d => {
    const b = document.createElement("button");
    b.className = "chip diff" + (d === P.prefs.difficulty ? " active" : "");
    b.textContent = d;
    b.onclick = () => { P.prefs.difficulty = d; save(); render(); };
    dbox.appendChild(b);
  });

  const box = el("setCats");
  box.innerHTML = "";
  catList.forEach(c => {
    const on = P.prefs.enabled.includes(c[0]);
    const b = document.createElement("button");
    b.className = "chip" + (on ? " active" : "");
    b.innerHTML = '<span class="sym">' + c[2] + "</span>" + c[1];
    b.onclick = () => {
      const i = P.prefs.enabled.indexOf(c[0]);
      if (i >= 0) { if (P.prefs.enabled.length > 1) P.prefs.enabled.splice(i, 1); }
      else P.prefs.enabled.push(c[0]);
      save();
      render();
    };
    box.appendChild(b);
  });

  const ct = el("setCat");
  if (ct) {
    ct.classList.toggle("on", !P.prefs.catOff);
    ct.querySelector(".lab").textContent = P.prefs.catOff ? "hidden" : "on";
  }
  const hbox = el("setHat");
  if (hbox) {
    hbox.innerHTML = "";
    const open = cat.unlockedHats().map(h => h.id);
    cat.HATS.forEach(h => {
      const got = open.includes(h.id);
      const b = document.createElement("button");
      b.className = "chip hat-chip" + (h.id === cat.currentHat() ? " active" : "") + (got ? "" : " locked");
      b.textContent = got ? h.name : "locked";
      b.title = got ? h.name : "keep going to unlock this one";
      if (got) b.onclick = () => { cat.setHat(h.id); render(); };
      hbox.appendChild(b);
    });
  }

  const mo = el("setMotion");
  mo.classList.toggle("on", P.prefs.reduceMotion);
  mo.querySelector(".lab").textContent = P.prefs.reduceMotion ? "animations off" : "animations on";

  const vi = el("setVisual");
  vi.classList.toggle("on", P.prefs.visual);
  vi.querySelector(".lab").textContent = P.prefs.visual ? "on" : "off";
}

let resetArmed = false;

export function wire() {
  el("setMotion").onclick = () => { P.prefs.reduceMotion = !P.prefs.reduceMotion; applyMotion(); save(); render(); };
  el("setVisual").onclick = () => { P.prefs.visual = !P.prefs.visual; P.prefs.visualSet = true; save(); render(); };
  el("setStart").onclick = () => go("/practice");
  const ct = el("setCat");
  if (ct) ct.onclick = () => { cat.toggle(); render(); };

  el("setReset").onclick = () => {
    const btn = el("setReset");
    if (!resetArmed) {
      resetArmed = true;
      btn.classList.add("armed");
      btn.textContent = "Tap again to confirm";
      setTimeout(() => { resetArmed = false; btn.classList.remove("armed"); btn.textContent = "Reset all progress"; }, 3000);
      return;
    }
    reset();
    resetArmed = false;
    btn.classList.remove("armed");
    btn.textContent = "Reset all progress";
    applyMotion();
    forgetTheme();
    render();
    renderShelf();
    updateHud(false);
    trackPicker.render();
  };

}
