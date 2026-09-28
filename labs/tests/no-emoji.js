#!/usr/bin/env node
/* Guards against pictographic emoji creeping back into the app.
   Run standalone (not inside the sandboxed test vm) since it needs fs.
   Usage: node tests/no-emoji.js */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const files = [
  "js/core.js", "js/sound.js", "js/grammar.js", "js/cli.js", "js/engine.js",
  "js/ui.js", "js/planner.js", "js/juno.js", "js/scenarios.js",
  "js/protocols.js", "js/course.js", "js/mockexam.js", "index.html",
];

function decodeUnicode(text){
  let t = text.replace(/\\u([dD][89aAbB][0-9a-fA-F]{2})\\u([dD][c-fC-F][0-9a-fA-F]{2})/g,
    (m, hi, lo) => String.fromCodePoint(0x10000 + (parseInt(hi, 16) - 0xD800) * 0x400 + (parseInt(lo, 16) - 0xDC00)));
  t = t.replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => String.fromCodePoint(parseInt(h, 16)));
  return t;
}

const emojiPat = /[\u{1F300}-\u{1FAFF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu;
let bad = 0;
for(const f of files){
  const p = path.join(root, f);
  if(!fs.existsSync(p)) continue;
  const decoded = decodeUnicode(fs.readFileSync(p, "utf8"));
  const hits = decoded.match(emojiPat);
  if(hits){
    bad++;
    console.log(f + ": " + hits.length + " emoji found -> " + [...new Set(hits)].join(" "));
  }
}
if(bad){
  console.log("\nFAILED: pictographic emoji present in " + bad + " file(s). This lab's learning material stays emoji-free — use SVG or plain text instead.");
  process.exit(1);
}
console.log("Clean: no pictographic emoji in any lab file.");
