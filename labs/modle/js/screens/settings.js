import { el } from "../core/dom.js";
import { P, save, reset } from "../core/profile.js";
import { catList, diffList } from "../core/catalog.js";
import { go } from "../core/router.js";
import { updateHud, renderShelf } from "../progress/hud.js";
import { forgetTheme } from "../core/theme.js";
import * as trackPicker from "../lang/track.js";
import * as themes from "../core/themes.js";
import * as cat from "../progress/cat.js";

const SUGGEST_ACCESS_KEY = "PASTE-YOUR-WEB3FORMS-KEY-HERE";

export function applyMotion() {
  document.body.classList.toggle("no-motion", P.prefs.reduceMotion);
}

const suggestReady = () => SUGGEST_ACCESS_KEY.indexOf("PASTE-") !== 0;

export function render() {
  const fb = el("suggBlock");
  if (fb) fb.classList.toggle("hidden", !suggestReady());
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
  el("setVisual").onclick = () => { P.prefs.visual = !P.prefs.visual; save(); render(); };
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

  el("suggOpen").onclick = () => { el("suggOverlay").classList.remove("hidden"); el("suggMsg").textContent = ""; el("suggText").focus(); };
  el("suggClose").onclick = () => el("suggOverlay").classList.add("hidden");
  el("suggOverlay").onclick = (e) => { if (e.target === el("suggOverlay")) el("suggOverlay").classList.add("hidden"); };
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") el("suggOverlay").classList.add("hidden"); });

  el("suggSend").onclick = async () => {
    const text = el("suggText").value.trim();
    const msg = el("suggMsg"), btn = el("suggSend");
    if (!text) { msg.className = "msg err"; msg.textContent = "write something first"; return; }
    if (SUGGEST_ACCESS_KEY.indexOf("PASTE-") === 0) { msg.className = "msg err"; msg.textContent = "suggestion box not set up yet"; return; }
    btn.disabled = true; msg.className = "msg"; msg.textContent = "sending...";
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ access_key: SUGGEST_ACCESS_KEY, subject: "Modle suggestion", from_name: "Modle suggestion box", message: text })
      });
      const data = await res.json();
      if (data.success) { msg.className = "msg ok"; msg.textContent = "sent — thank you!"; el("suggText").value = ""; }
      else { msg.className = "msg err"; msg.textContent = "sending failed, try again later"; }
    } catch (e) { msg.className = "msg err"; msg.textContent = "sending failed, try again later"; }
    btn.disabled = false;
  };
}
