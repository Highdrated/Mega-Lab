import { P, save } from "./profile.js";
import { forgetTheme } from "./theme.js";

export const THEMES = [
  { key: "wheat", label: "Wheat", note: "the original — warm gold on slate" },
  { key: "witch", label: "Witch", note: "violet night, candle gold, poison green" },
  { key: "gaming", label: "Arcade", note: "neon cyan and orchid on black, sharp corners" },
  { key: "minimal", label: "Minimal", note: "light, sans-serif, no glow — code stays monospace" }
];

let listeners = [];

export const current = () => P.prefs.theme || "wheat";

export function apply() {
  const key = current();
  if (key === "wheat") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", key);
  forgetTheme();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    if (bg) meta.setAttribute("content", bg);
  }
}

export function set(key) {
  if (!THEMES.some(t => t.key === key)) return;
  P.prefs.theme = key;
  save();
  apply();
  listeners.forEach(fn => fn(key));
}

export function onChange(fn) { listeners.push(fn); }
