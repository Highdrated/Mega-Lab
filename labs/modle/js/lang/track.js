import { el } from "../core/dom.js";
import { TRACKS, track, setTrack } from "../core/profile.js";

let onChange = () => {};

export function whenChanged(fn) { onChange = fn; }

export function render() {
  const box = el("trackPick");
  if (!box) return;
  box.innerHTML = TRACKS.map(t =>
    '<button class="tracksel' + (t.key === track() ? " on" : "") + (t.ready ? "" : " thin") +
    '" data-track="' + t.key + '" title="' + (t.ready ? t.label : t.label + " — content not written yet") + '">' +
    t.label + "</button>"
  ).join("");
  box.querySelectorAll(".tracksel").forEach(b => {
    b.onclick = () => {
      const k = b.getAttribute("data-track");
      if (k === track()) return;
      setTrack(k);
      render();
      onChange(k);
    };
  });
}
