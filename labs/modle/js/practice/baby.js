import { rand, pick } from "../core/rng.js";

const box = (s) => "<pre><code>" + s + "</code></pre>";
const q = (s) => '"' + s + '"';
const list = (a) => "[" + a.join(", ") + "]";
const bin = (n) => n.toString(2);
const tf = (b) => (b ? "True" : "False");
const asBool = { placeholder: "True or False", inputmode: "text" };
const asText = (v) => ({ answer: String(v), placeholder: "text", inputmode: "text" });
const pair = (a, b, ph) => ({ answer: a + "," + b, placeholder: ph, inputmode: "text" });
const tiny = ["hi", "ok", "go", "up", "cat", "dog", "sun", "bee", "map", "cup"];
const word = () => pick(tiny);
const nums = (n, lo, hi) => Array.from({ length: n }, () => rand(lo, hi));
const P = (code, answer, explain, extra) => Object.assign({ code: code, answer: answer, explain: explain }, extra || {});

export const babies = {
  basics: {
    op() {
      const op = pick(["+", "-", "*", "/"]);
      if (op === "+") { const a = rand(1, 3), b = rand(1, 3); return P(a + " + " + b, a + b, "Plain adding: " + a + " and " + b + " more is <b>" + (a + b) + "</b>.", { viz: { t: "numline", min: 0, max: a + b, base: a, to: a + b } }); }
      if (op === "-") { const b = rand(1, 3), a = b + rand(0, 3); return P(a + " - " + b, a - b, "Start at " + a + ", take " + b + " away: <b>" + (a - b) + "</b>.", { viz: { t: "numline", min: 0, max: a, base: a, to: a - b } }); }
      if (op === "*") { const a = rand(1, 3), b = rand(1, 3); return P(a + " * " + b, a * b, "<code>*</code> is multiply: " + a + " groups of " + b + " = <b>" + (a * b) + "</b>.", { viz: { t: "grid", total: a * b, per: b } }); }
      const b = rand(1, 3), w = rand(1, 3); return P((b * w) + " / " + b, w, "Split " + (b * w) + " into " + b + " equal piles: each pile has <b>" + w + "</b>. Python shows " + w + ".0, both count.", { viz: { t: "grid", total: b * w, per: b } });
    },
    var() { const a = rand(1, 3), b = rand(1, 3); return P("x = " + a + "\n>>> x + " + b, a + b, "x is a box holding " + a + ". Swap it in: " + a + " + " + b + " = <b>" + (a + b) + "</b>."); },
    var2() { const a = rand(1, 3), b = rand(1, 3); return P("x = " + a + "\n>>> y = " + b + "\n>>> x + y", a + b, "x is " + a + ", y is " + b + ". So x + y is " + a + " + " + b + " = <b>" + (a + b) + "</b>."); },
    floordiv() { const w = rand(1, 3), e = rand(0, 1), a = 2 * w + e; return P(a + " // 2", w, "How many whole 2s fit in " + a + "? <b>" + w + "</b>." + (e ? " The 1 left over is thrown away." : " Nothing left over.")); },
    unary() { const a = rand(1, 2), b = rand(1, 3); return P("-" + a + " + " + b, b - a, "Start " + a + " below zero, walk " + b + " up: <b>" + (b - a) + "</b>.", { viz: { t: "numline", min: -a, max: Math.max(b - a, 1), base: -a, to: b - a } }); },
    precedence() { const a = rand(1, 2), c = rand(1, 3); return P(a + " + 2 * " + c, a + 2 * c, "Multiply first, then add." + box("2 * " + c + " = " + (2 * c) + "\n" + a + " + " + (2 * c) + " = " + (a + 2 * c))); },
    paren() { const a = rand(1, 2), c = rand(1, 3); return P("(" + a + " + 1) * " + c, (a + 1) * c, "Brackets first, then multiply." + box("(" + a + " + 1) = " + (a + 1) + "\n" + (a + 1) + " * " + c + " = " + ((a + 1) * c))); },
    chain() { const a = rand(1, 2), b = 1, c = 2; return P("x = " + a + "\n>>> x += " + b + "\n>>> x *= " + c + "\n>>> x", (a + b) * c, "One line at a time." + box("x = " + a + "\nx += 1  →  " + (a + 1) + "\nx *= 2  →  " + ((a + 1) * 2))); },
    mixed() { const a = rand(5, 9), c = rand(1, 2); return P(a + " - 1 * " + c, a - c, "Multiply first: 1 * " + c + " = " + c + ". Then " + a + " - " + c + " = <b>" + (a - c) + "</b>."); }
  },

  powers: {
    basic() { const b = rand(2, 3); return P(b + " ** 2", b * b, "<code>**</code> means copies multiplied: " + b + " × " + b + " = <b>" + (b * b) + "</b>."); },
    square() { const b = rand(1, 4); return P(b + " ** 2", b * b, "Two copies of " + b + " multiplied: " + b + " × " + b + " = <b>" + (b * b) + "</b>.", { viz: { t: "grid", total: b * b, per: b } }); },
    zero() { const b = rand(2, 5); return P(b + " ** 0", 1, "Anything to the power 0 is <b>1</b>. Zero copies, nothing multiplied, the start value 1 stays."); },
    one() { const b = rand(2, 9); return P(b + " ** 1", b, "One copy, nothing to multiply with: <b>" + b + "</b>."); },
    two() { const e = rand(1, 3); return P("2 ** " + e, Math.pow(2, e), "Start at 1 and double " + e + " time" + (e === 1 ? "" : "s") + ": <b>" + Math.pow(2, e) + "</b>."); },
    three() { const b = pick([3, 5]); return P(b + " ** 2", b * b, b + " × " + b + " = <b>" + (b * b) + "</b>. The small number counts copies."); },
    digits() { const e = rand(1, 2); return P("len(str(10 ** " + e + "))", e + 1, "10 ** " + e + " is " + Math.pow(10, e) + ". Count the digits: <b>" + (e + 1) + "</b>."); },
    expadd() { const c = rand(1, 2); return P("2 ** 1 * 2 ** " + c, Math.pow(2, 1 + c), "1 copy of 2 and " + c + " more copies is " + (1 + c) + " copies: 2 ** " + (1 + c) + " = <b>" + Math.pow(2, 1 + c) + "</b>."); },
    sumsq() { const a = rand(1, 3), b = rand(1, 3); return P(a + " ** 2 + " + b + " ** 2", a * a + b * b, "Each power first, then add." + box(a + " ** 2 = " + (a * a) + "\n" + b + " ** 2 = " + (b * b) + "\n" + (a * a) + " + " + (b * b) + " = " + (a * a + b * b))); },
    cube() { const b = rand(1, 3); return P(b + " ** 3", b * b * b, "Three copies: " + b + " × " + b + " × " + b + " = <b>" + (b * b * b) + "</b>."); },
    ten() { const e = rand(1, 2); return P("10 ** " + e, Math.pow(10, e), "A 1 followed by " + e + " zero" + (e === 1 ? "" : "s") + ": <b>" + Math.pow(10, e) + "</b>."); },
    sqrt() { const r = rand(1, 4); return P((r * r) + " ** 0.5", r, "<code>** 0.5</code> asks: what times itself makes " + (r * r) + "? <b>" + r + "</b>. Python shows " + r + ".0, both count."); },
    expsub() { const c = rand(1, 2); return P("2 ** 3 // 2 ** " + c, Math.pow(2, 3 - c), "3 copies on top, " + c + " cancel out: 2 ** " + (3 - c) + " = <b>" + Math.pow(2, 3 - c) + "</b>."); },
    compare() { const a = pick([1, 2, 3]), c = pick([1, 2]); const l = Math.pow(a, c), r = Math.pow(c, a); return P(a + " ** " + c + " > " + c + " ** " + a, tf(l > r), box(a + " ** " + c + " = " + l + "\n" + c + " ** " + a + " = " + r) + "Is " + l + " bigger than " + r + "? <b>" + tf(l > r) + "</b>.", asBool); },
    diffsq() { const b = rand(1, 2); return P("3 ** 2 - " + b + " ** 2", 9 - b * b, box("3 ** 2 = 9\n" + b + " ** 2 = " + (b * b) + "\n9 - " + (b * b) + " = " + (9 - b * b))); },
    nested() { const e = rand(1, 2); return P("(2 ** " + e + ") ** 2", Math.pow(Math.pow(2, e), 2), "Inside first: 2 ** " + e + " = " + Math.pow(2, e) + ". Then " + Math.pow(2, e) + " ** 2 = <b>" + Math.pow(Math.pow(2, e), 2) + "</b>."); },
    neg() { const b = pick([2, 4, 10]); return P(b + " ** -1", 1 / b, "A minus exponent flips it into a fraction: 1 / " + b + " = <b>" + (1 / b) + "</b>."); },
    mask() { const e = rand(1, 3); return P("2 ** " + e + " - 1", Math.pow(2, e) - 1, "2 ** " + e + " = " + Math.pow(2, e) + ", minus 1 = <b>" + (Math.pow(2, e) - 1) + "</b>. In binary: " + "1".repeat(e) + ".", { viz: { t: "bits", bin: "1".repeat(e) } }); }
  },

  binary: {
    read() { const n = rand(1, 7); return P("0b" + bin(n), n, "Slots are worth 4, 2, 1 from left to right. Add the slots with a 1: <b>" + n + "</b>.", { viz: { t: "bits", bin: bin(n) } }); },
    write() { const n = rand(1, 7); return P("bin(" + n + ")[2:]", null, "Use the slots 4, 2, 1. Which ones add up to " + n + "? That gives <b>" + bin(n) + "</b>.", Object.assign(asText(bin(n)), { placeholder: "0s and 1s", viz: { t: "bits", bin: bin(n) } })); },
    ones() { const n = rand(1, 7), c = bin(n).split("1").length - 1; return P("bin(" + n + ").count('1')", c, n + " in binary is " + bin(n) + ". Count the 1s: <b>" + c + "</b>.", { viz: { t: "bits", bin: bin(n) } }); },
    place() { const n = rand(2, 7); return P("0b" + bin(n) + "\n>>> what is the leftmost 1 worth?", Math.pow(2, bin(n).length - 1), "From the right: 1, 2, 4. This has " + bin(n).length + " digits, so the leftmost is worth <b>" + Math.pow(2, bin(n).length - 1) + "</b>.", { viz: { t: "bits", bin: bin(n) } }); },
    add() { const a = rand(1, 3), b = rand(1, 3); return P("0b" + bin(a) + " + 0b" + bin(b), a + b, "0b" + bin(a) + " is " + a + ", 0b" + bin(b) + " is " + b + ". " + a + " + " + b + " = <b>" + (a + b) + "</b>."); },
    power() { const e = rand(1, 2); return P("0b1" + "0".repeat(e), Math.pow(2, e), "A 1 in the slot worth " + Math.pow(2, e) + ", nothing else: <b>" + Math.pow(2, e) + "</b>.", { viz: { t: "bits", bin: "1" + "0".repeat(e) } }); },
    mask() { const e = rand(1, 3); return P("0b" + "1".repeat(e), Math.pow(2, e) - 1, "All slots on: add them up to <b>" + (Math.pow(2, e) - 1) + "</b>.", { viz: { t: "bits", bin: "1".repeat(e) } }); },
    double() { const n = rand(1, 3); return P("0b" + bin(n) + " << 1", n * 2, "Shifting left one slot doubles it: " + n + " → <b>" + (n * 2) + "</b>."); }
  },

  strings: {
    len() { const w = word(); return P("len(" + q(w) + ")", w.length, "Count the letters: " + w.split("").join(" · ") + " → <b>" + w.length + "</b>.", { viz: { t: "boxes", chars: w.split("") } }); },
    char() { const w = word(), i = rand(0, w.length - 1); return P(q(w) + "[" + i + "]", null, "Positions start at 0." + box(w.split("").join(" ") + "\n" + w.split("").map((_, j) => j).join(" ")) + "Position " + i + " is <b>'" + w[i] + "'</b>.", Object.assign(asText(w[i]), { viz: { t: "boxes", chars: w.split(""), hi: [i] } })); },
    count() { const w = pick(["aa", "abba", "noon", "hi", "cat", "dad"]), ch = pick(w.split("")), c = w.split(ch).length - 1; return P(q(w) + ".count(" + q(ch) + ")", c, "How many '" + ch + "' in " + q(w) + "? <b>" + c + "</b>."); },
    upper() { const w = word(); return P("len(" + q(w) + ".upper())", w.length, "Capitals do not change the count: " + q(w.toUpperCase()) + " still has <b>" + w.length + "</b>."); },
    in() { const w = word(), ch = Math.random() < 0.5 ? pick(w.split("")) : pick("xzq".split("")), has = w.indexOf(ch) >= 0; return P(q(ch) + " in " + q(w), tf(has), "Is '" + ch + "' anywhere in " + q(w) + "? <b>" + tf(has) + "</b>.", asBool); },
    concat() { const a = pick(["hi", "ok", "go"]), b = pick(["a", "up", "yo"]); return P("len(" + q(a) + " + " + q(b) + ")", a.length + b.length, q(a) + " + " + q(b) + " is " + q(a + b) + ": <b>" + (a + b).length + "</b> letters."); },
    repeat() { const w = pick(["a", "hi", "ok"]); return P("len(" + q(w) + " * 2)", w.length * 2, q(w) + " * 2 is " + q(w + w) + ": <b>" + (w.length * 2) + "</b> letters."); },
    first() { const w = word(); return P(q(w) + "[0]", null, "[0] is the first letter: <b>'" + w[0] + "'</b>.", asText(w[0])); },
    last() { const w = word(); return P(q(w) + "[-1]", null, "[-1] is the last letter: <b>'" + w[w.length - 1] + "'</b>.", asText(w[w.length - 1])); },
    slicelen() { const w = pick(["cat", "dog", "sun"]), b = rand(1, 3); return P("len(" + q(w) + "[0:" + b + "])", b, "From 0 up to (not including) " + b + ": " + b + " - 0 = <b>" + b + "</b>."); },
    index() { const w = word(), ch = pick(w.split("")); return P(q(w) + ".index(" + q(ch) + ")", w.indexOf(ch), "Where is the first '" + ch + "'? Counting from 0: <b>" + w.indexOf(ch) + "</b>."); },
    replace() { const w = pick(["cat", "dog", "hat"]), ch = w[0], out = w.slice(1); return P(q(w) + ".replace(" + q(ch) + ", " + q("") + ")", null, "Swap '" + ch + "' for nothing: <b>" + q(out) + "</b>.", asText(out)); },
    split() { const n = rand(2, 3), s = ["a", "b", "c"].slice(0, n).join(","); return P("len(" + q(s) + ".split(" + q(",") + "))", n, "Cut at every comma: " + s.split(",").map(q).join(", ") + ". That is <b>" + n + "</b> pieces."); },
    startswith() { const w = word(), yes = Math.random() < 0.6, pre = yes ? w[0] : "z"; return P(q(w) + ".startswith(" + q(pre) + ")", tf(yes), "Does " + q(w) + " begin with '" + pre + "'? <b>" + tf(yes) + "</b>.", asBool); },
    negchar() { const w = pick(["cat", "dog", "sun"]), k = rand(1, 2), ch = w[w.length - k]; return P(q(w) + "[-" + k + "]", null, "-1 is the last, -2 the one before." + box(w.split("").join("  ") + "\n" + w.split("").map((_, j) => "-" + (w.length - j)).join(" ")) + "So <b>'" + ch + "'</b>.", asText(ch)); },
    find() { const w = word(); return P(q(w) + ".find(" + q("z") + ")", -1, "No 'z' in " + q(w) + ", so <code>.find()</code> says <b>-1</b>: not here."); },
    slice() { const w = pick(["cat", "dog", "sun"]), b = rand(1, 2); return P(q(w) + "[0:" + b + "]", null, "From 0 up to (not including) " + b + ": <b>" + q(w.slice(0, b)) + "</b>.", asText(w.slice(0, b))); },
    negslice() { const w = pick(["cat", "dog", "sun"]), k = rand(1, 2); return P("len(" + q(w) + "[-" + k + ":])", k, "The last " + k + " letter" + (k === 1 ? "" : "s") + ": " + q(w.slice(-k)) + ", so <b>" + k + "</b>."); },
    join() { const a = pick(["a", "b"]), b = pick(["c", "d"]), s = a + "-" + b; return P("len(" + q("-") + ".join([" + q(a) + ", " + q(b) + "]))", s.length, "Glue with a dash between: " + q(s) + ", <b>" + s.length + "</b> characters."); },
    strip() { const w = pick(["hi", "ok", "cat"]); return P("len(" + q(" " + w + " ") + ".strip())", w.length, "Strip the spaces off both ends: " + q(w) + ", <b>" + w.length + "</b>."); },
    two() { const w = pick(["cat", "dog", "sun"]), i = rand(0, 1); return P(q(w) + "[" + i + ":" + (i + 2) + "]", null, "Two letters starting at " + i + ": <b>" + q(w.slice(i, i + 2)) + "</b>.", asText(w.slice(i, i + 2))); },
    stepslice() { const w = pick(["ab", "abc", "abcd"]), r = w.split("").filter((_, i) => i % 2 === 0).join(""); return P("len(" + q(w) + "[::2])", r.length, "Every other letter from 0: " + q(r) + ", <b>" + r.length + "</b>."); }
  },

  webmath: {
    pages() { const per = rand(2, 3), total = per + rand(1, per - 1); return P("ceil(" + total + " / " + per + ")", 2, total + " items, " + per + " per page: one full page plus a few left over. Leftovers need a page too: <b>2</b>.", { viz: { t: "cells", n: 2, unit: "page" } }); },
    rows() { const per = rand(2, 3), total = per * rand(1, 2) + 1; const ans = Math.ceil(total / per); return P("ceil(" + total + " / " + per + ")", ans, total + " items in rows of " + per + ". A part-row is still a row: <b>" + ans + "</b>.", { viz: { t: "cells", n: ans, unit: "row" } }); },
    discount() { const price = 2 * rand(1, 5); return P(price + " * (1 - 50/100)", price / 2, "50% off means you pay half: <b>" + (price / 2) + "</b>."); },
    percent() { const base = pick([2, 4, 6, 10, 20]); return P(base + " * 50 / 100", base / 2, "50% is half: <b>" + (base / 2) + "</b>."); },
    total() { const per = rand(1, 3), n = rand(2, 3); return P(per + " * " + n, per * n, n + " items costing " + per + ": <b>" + (per * n) + "</b>."); },
    vat() { const p = pick([10, 100]); return P(p + " * 121 // 100", Math.floor(p * 121 / 100), "21% on top means 121%." + box(p + " * 121 = " + (p * 121) + "\n" + (p * 121) + " // 100 = " + Math.floor(p * 121 / 100))); },
    leftover() { const per = rand(2, 3), total = per + rand(1, per); return P(total + " % " + per, total % per, "Fill one row of " + per + ", what is left? <b>" + (total % per) + "</b>.", { viz: { t: "modclock", b: per, rem: total % per } }); },
    grid() { const c = rand(1, 3), r = rand(1, 3); return P(c + " * " + r, c * r, c + " across, " + r + " down: <b>" + (c * r) + "</b> cells.", { viz: { t: "grid2d", w: c, h: r, from: [0, 0], to: [c - 1, r - 1] } }); },
    ratio() { const w = pick([4, 6, 8, 10]); return P(w + " // 2", w / 2, "Half the width: <b>" + (w / 2) + "</b>."); }
  },

  modulo: {
    rem() { const b = rand(2, 3), a = b + rand(1, 4); return P(a + " % " + b, a % b, "Take out whole " + b + "s from " + a + ". What is left? <b>" + (a % b) + "</b>.", { viz: { t: "modclock", b: b, rem: a % b } }); },
    even() { const n = rand(1, 9); return P(n + " % 2", n % 2, n + " is " + (n % 2 ? "odd, 1 left over" : "even, nothing left over") + ": <b>" + (n % 2) + "</b>.", { viz: { t: "modclock", b: 2, rem: n % 2 } }); },
    smaller() { const b = rand(3, 5), a = rand(1, 2); return P(a + " % " + b, a, b + " does not fit in " + a + " at all, so all of " + a + " is left: <b>" + a + "</b>."); },
    zero() { const b = rand(2, 3), k = rand(1, 3); return P((b * k) + " % " + b, 0, b + " fits in " + (b * k) + " exactly, nothing left: <b>0</b>."); },
    clock() { const h = rand(10, 11), add = rand(1, 3); return P("(" + h + " + " + add + ") % 12", (h + add) % 12, h + " o'clock plus " + add + " hours goes past 12 and wraps: <b>" + ((h + add) % 12) + "</b>.", { viz: { t: "modclock", b: 12, rem: (h + add) % 12 } }); },
    everyn() { const i = rand(1, 6); return P(i + " % 2 == 0", tf(i % 2 === 0), i + " % 2 is " + (i % 2) + ". Is that 0? <b>" + tf(i % 2 === 0) + "</b>.", asBool); },
    lastdigit() { const n = rand(11, 29); return P(n + " % 10", n % 10, "<code>% 10</code> keeps the last digit: <b>" + (n % 10) + "</b>."); },
    negative() { const b = rand(2, 4), a = 1; return P("-" + a + " % " + b, b - 1, "On a circle 0 to " + (b - 1) + ", one step back from 0 lands on <b>" + (b - 1) + "</b>.", { viz: { t: "modclock", b: b, rem: b - 1 } }); },
    wrap() { const x = rand(4, 7); return P(x + " % 4", x % 4, "A loop of 4 spots. Go round once (4), then " + (x % 4) + " more: <b>" + (x % 4) + "</b>.", { viz: { t: "modclock", b: 4, rem: x % 4 } }); },
    divmod() { const k = rand(1, 3), r = rand(0, 1), a = 2 * k + r; return P(a + " // 2 + " + a + " % 2", k + r, box(a + " // 2 = " + k + "\n" + a + " %  2 = " + r + "\n" + k + " + " + r + " = " + (k + r))); }
  },

  ranges: {
    count() { const step = rand(1, 2), c = rand(1, 3); return P("len(range(0, " + (step * c) + ", " + step + "))", c, "Counting: " + Array.from({ length: c }, (_, i) => i * step).join(", ") + ". That is <b>" + c + "</b> numbers."); },
    simple() { const n = rand(1, 4); return P("len(range(" + n + "))", n, "range(" + n + ") gives " + Array.from({ length: n }, (_, i) => i).join(", ") + ": <b>" + n + "</b> numbers."); },
    last() { const n = rand(2, 4); return P("list(range(" + n + "))[-1]", n - 1, "range(" + n + ") stops just before " + n + ", so the last is <b>" + (n - 1) + "</b>."); },
    first() { const s = rand(1, 4); return P("list(range(" + s + ", " + (s + 2) + "))[0]", s, "The start is always included: <b>" + s + "</b>."); },
    sum() { const n = rand(2, 3); return P("sum(range(" + n + "))", n * (n - 1) / 2, "range(" + n + ") is " + Array.from({ length: n }, (_, i) => i).join(", ") + ". Added: <b>" + (n * (n - 1) / 2) + "</b>."); },
    contains() { const n = rand(2, 4), t = rand(0, n); return P(t + " in range(" + n + ")", tf(t < n), "range(" + n + ") is " + Array.from({ length: n }, (_, i) => i).join(", ") + ". Is " + t + " there? <b>" + tf(t < n) + "</b>.", asBool); },
    listout() { const step = rand(1, 2); return P("list(range(0, " + (step * 3) + ", " + step + "))[1]", step, "The list is 0, " + step + ", " + (step * 2) + ". Position 1 is <b>" + step + "</b>."); },
    backwards() { const s = rand(2, 4); return P("len(range(" + s + ", 0, -1))", s, "Counting down: " + Array.from({ length: s }, (_, i) => s - i).join(", ") + ". That is <b>" + s + "</b>."); },
    sumstep() { const c = rand(2, 3), v = Array.from({ length: c }, (_, i) => i * 2); return P("sum(range(0, " + (c * 2) + ", 2))", v.reduce((a, b) => a + b, 0), "Values: " + v.join(", ") + ". Added: <b>" + v.reduce((a, b) => a + b, 0) + "</b>."); },
    empty() { const a = rand(2, 3), b = rand(0, a); return P("len(range(" + a + ", " + b + "))", 0, "Start " + a + ", count up to " + b + "? Already there or past it, so nothing: <b>0</b>."); }
  },

  indexing: {
    get() { const a = nums(3, 1, 9), i = rand(0, 2); return P("arr = " + list(a) + "\n>>> arr[" + i + "]", a[i], "Positions 0, 1, 2. Position " + i + " holds <b>" + a[i] + "</b>.", { viz: { t: "boxes", vals: a, hi: [i] } }); },
    last() { const n = rand(2, 3), a = nums(n, 1, 9); return P("arr = " + list(a) + "\n>>> last valid index of arr?", n - 1, n + " items, numbered from 0, so the last is <b>" + (n - 1) + "</b>."); },
    first() { const a = nums(2, 1, 9); return P("arr = " + list(a) + "\n>>> arr[0]", a[0], "[0] is the first item: <b>" + a[0] + "</b>."); },
    len() { const n = rand(1, 3), a = nums(n, 1, 9); return P("arr = " + list(a) + "\n>>> len(arr)", n, "Count the items: <b>" + n + "</b>."); },
    neg() { const n = rand(2, 3), a = nums(n, 1, 9); return P("arr = " + list(a) + "\n>>> arr[-1] is the same as which index?", n - 1, "-1 is the last one. With " + n + " items that is index <b>" + (n - 1) + "</b>."); },
    slicelen() { const a = nums(3, 1, 9), b = rand(1, 2); return P("arr = " + list(a) + "\n>>> len(arr[0:" + b + "])", b, b + " - 0 = <b>" + b + "</b>."); },
    lastval() { const a = nums(rand(2, 3), 1, 9); return P("arr = " + list(a) + "\n>>> arr[-1]", a[a.length - 1], "[-1] is the last: <b>" + a[a.length - 1] + "</b>."); },
    sum2() { const a = nums(2, 1, 5); return P("arr = " + list(a) + "\n>>> arr[0] + arr[1]", a[0] + a[1], a[0] + " + " + a[1] + " = <b>" + (a[0] + a[1]) + "</b>."); },
    negval() { const a = nums(3, 1, 9), k = rand(1, 2); return P("arr = " + list(a) + "\n>>> arr[-" + k + "]", a[3 - k], "-1 is last, -2 one before. So <b>" + a[3 - k] + "</b>."); },
    sliceval() { const a = nums(3, 1, 9); return P("arr = " + list(a) + "\n>>> arr[0:2][0]", a[0], "arr[0:2] is " + list(a.slice(0, 2)) + ". Its [0] is <b>" + a[0] + "</b>."); },
    step() { const n = rand(2, 4), a = nums(n, 1, 9), c = Math.ceil(n / 2); return P("arr = " + list(a) + "\n>>> len(arr[::2])", c, "Every other item from 0: " + list(a.filter((_, i) => i % 2 === 0)) + ", <b>" + c + "</b>."); },
    nested() { const g = [[1, 2], [3, 4]], r = rand(0, 1), c = rand(0, 1); return P("grid = [[1, 2], [3, 4]]\n>>> grid[" + r + "][" + c + "]", g[r][c], "Row " + r + " is " + list(g[r]) + ", then item " + c + ": <b>" + g[r][c] + "</b>."); },
    oob() { const n = rand(2, 3), a = nums(n, 1, 9); return P("arr = " + list(a) + "\n>>> highest index you can use?", n - 1, "Length " + n + ", minus 1: <b>" + (n - 1) + "</b>."); }
  },

  stats: {
    mean() { const a = rand(1, 5), b = a + 2 * rand(0, 2); return P("sum(" + list([a, b]) + ") / len(" + list([a, b]) + ")", (a + b) / 2, "Total " + (a + b) + ", two numbers: " + (a + b) + " / 2 = <b>" + ((a + b) / 2) + "</b>."); },
    sum() { const a = nums(2, 1, 5); return P("sum(" + list(a) + ")", a[0] + a[1], a[0] + " + " + a[1] + " = <b>" + (a[0] + a[1]) + "</b>."); },
    max() { const a = nums(2, 1, 9); return P("max(" + list(a) + ")", Math.max(a[0], a[1]), "The bigger one: <b>" + Math.max(a[0], a[1]) + "</b>."); },
    min() { const a = nums(2, 1, 9); return P("min(" + list(a) + ")", Math.min(a[0], a[1]), "The smaller one: <b>" + Math.min(a[0], a[1]) + "</b>."); },
    len() { const a = nums(rand(1, 3), 1, 9); return P("len(" + list(a) + ")", a.length, "Count the items: <b>" + a.length + "</b>."); },
    count() { const v = rand(1, 3), a = [v, rand(4, 6), v]; return P(list(a) + ".count(" + v + ")", 2, v + " shows up <b>2</b> times."); },
    spread() { const a = nums(2, 1, 9); return P("max(" + list(a) + ") - min(" + list(a) + ")", Math.abs(a[0] - a[1]), "Biggest minus smallest: <b>" + Math.abs(a[0] - a[1]) + "</b>."); },
    sorted() { const a = nums(2, 1, 9); return P("sorted(" + list(a) + ")[0]", Math.min(a[0], a[1]), "Sorted smallest first, then take the front: <b>" + Math.min(a[0], a[1]) + "</b>."); },
    median() { const a = nums(3, 1, 9), s = a.slice().sort((x, y) => x - y); return P("sorted(" + list(a) + ")[1]", s[1], "Sorted: " + list(s) + ". The middle one: <b>" + s[1] + "</b>."); },
    sumslice() { const a = nums(3, 1, 5); return P("sum(" + list(a) + "[:2])", a[0] + a[1], "[:2] keeps the first two: " + a[0] + " + " + a[1] + " = <b>" + (a[0] + a[1]) + "</b>."); },
    maxminus() { const a = nums(2, 1, 9); return P("max(" + list(a) + ") - 1", Math.max(a[0], a[1]) - 1, "Biggest is " + Math.max(a[0], a[1]) + ", minus 1: <b>" + (Math.max(a[0], a[1]) - 1) + "</b>."); },
    rounded() { const a = nums(2, 1, 5); return P("sum(" + list(a) + ") // 2", Math.floor((a[0] + a[1]) / 2), (a[0] + a[1]) + " // 2 = <b>" + Math.floor((a[0] + a[1]) / 2) + "</b>, decimals chopped."); }
  },

  coordinates: {
    move() { const x = rand(0, 2), y = rand(0, 2); return P("x, y = " + x + ", " + y + "\n>>> x += 1\n>>> y += 1\n>>> (x, y)?", null, "Each one goes up by 1: <b>(" + (x + 1) + ", " + (y + 1) + ")</b>.", pair(x + 1, y + 1, "x, y")); },
    single() { const x = rand(0, 2), d = rand(1, 2); return P("x = " + x + "\n>>> x += " + d + "\n>>> x", x + d, x + " + " + d + " = <b>" + (x + d) + "</b>."); },
    distance() { const a = rand(0, 3), b = rand(0, 3); return P("abs(" + a + " - " + b + ")", Math.abs(a - b), "How far apart are " + a + " and " + b + "? <b>" + Math.abs(a - b) + "</b>."); },
    steps() { const n = rand(2, 5); return P("# 2 steps per row\n>>> " + n + " // 2, " + n + " % 2", null, box(n + " // 2 = " + Math.floor(n / 2) + "   row\n" + n + " %  2 = " + (n % 2) + "   column") + "So <b>" + Math.floor(n / 2) + ", " + (n % 2) + "</b>.", pair(Math.floor(n / 2), n % 2, "row, col")); },
    mirror() { const x = rand(0, 2); return P("# grid 3 wide\n>>> 2 - " + x, 2 - x, "Columns 0, 1, 2. The mirror of " + x + " is <b>" + (2 - x) + "</b>."); },
    wrap() { const x = rand(0, 2), y = rand(0, 2), dx = rand(1, 2), dy = rand(1, 2); return P("# grid 3x3 wraps\n>>> x, y = " + x + ", " + y + "\n>>> x += " + dx + "\n>>> y += " + dy + "\n>>> (x, y)?", null, box("x: " + (x + dx) + " % 3 = " + ((x + dx) % 3) + "\ny: " + (y + dy) + " % 3 = " + ((y + dy) % 3)) + "<b>(" + ((x + dx) % 3) + ", " + ((y + dy) % 3) + ")</b>.", pair((x + dx) % 3, (y + dy) % 3, "x, y")); },
    diag() { const n = rand(1, 2); return P("x, y = 0, 0\n>>> " + n + " times: x += 1 and y += 1\n>>> (x, y)?", null, "Both go up together: <b>(" + n + ", " + n + ")</b>.", pair(n, n, "x, y")); }
  },

  subnets: {
    hosts() { const pre = pick([30, 29]), s = Math.pow(2, 32 - pre); return P("# usable hosts in a /" + pre + "\n>>> 2 ** (32 - " + pre + ") - 2", s - 2, box("32 - " + pre + " = " + (32 - pre) + " host bits\n2 ** " + (32 - pre) + " = " + s + " addresses\n" + s + " - 2 = " + (s - 2) + " usable")); },
    size() { const pre = pick([31, 30, 29]); return P("# addresses in a /" + pre + "\n>>> 2 ** (32 - " + pre + ")", Math.pow(2, 32 - pre), "32 - " + pre + " = " + (32 - pre) + " bits, 2 ** " + (32 - pre) + " = <b>" + Math.pow(2, 32 - pre) + "</b>."); },
    block() { const s = pick([4, 8]); return P("# mask 255.255.255." + (256 - s) + "\n>>> 256 - " + (256 - s), s, "256 - " + (256 - s) + " = <b>" + s + "</b>. Blocks start at 0, " + s + ", " + (2 * s) + "…"); },
    octet() { const pre = pick([30, 29]), s = Math.pow(2, 32 - pre); return P("# last mask number for a /" + pre + "\n>>> 256 - 2 ** (32 - " + pre + ")", 256 - s, "Block is " + s + ". 256 - " + s + " = <b>" + (256 - s) + "</b>."); },
    network() { const h = rand(0, 11), st = Math.floor(h / 4) * 4; return P("# host 10.0.0." + h + " /30  (block 4)\n>>> " + h + " // 4 * 4", st, "Blocks of 4: 0, 4, 8. ." + h + " is in the block starting at <b>." + st + "</b>.", { viz: { t: "blocks", size: 4, host: h } }); },
    offset() { const h = rand(0, 11); return P("# how far into its block of 4 is ." + h + "?\n>>> " + h + " % 4", h % 4, "Remove whole 4s from " + h + ": <b>" + (h % 4) + "</b> left.", { viz: { t: "blocks", size: 4, host: h } }); },
    broadcast() { const h = rand(0, 11), st = Math.floor(h / 4) * 4; return P("# broadcast for 10.0.0." + h + " /30  (block 4)\n>>> " + h + " // 4 * 4 + 4 - 1", st + 3, "Block starts at " + st + ", last address is " + st + " + 3 = <b>" + (st + 3) + "</b>.", { viz: { t: "blocks", size: 4, host: h } }); },
    prefixfor() { const n = pick([1, 2]); return P("# need " + n + " hosts on one subnet\n>>> smallest prefix?", 30, "2 host bits give 2 ** 2 - 2 = 2 usable, enough for " + n + ". 32 - 2 = <b>/30</b>.", { placeholder: "prefix, e.g. 30", inputmode: "numeric" }); },
    and() { const h = rand(4, 15); return P(h + " & 12", h & 12, box(bin(h).padStart(4, "0") + "  " + h + "\n1100  12\n" + bin(h & 12).padStart(4, "0") + "  " + (h & 12)) + "Keep a 1 only where both have one: <b>" + (h & 12) + "</b>."); },
    count() { const k = rand(1, 2); return P("# how many /" + (29 + k) + " fit in one /29\n>>> 2 ** (" + (29 + k) + " - 29)", Math.pow(2, k), k + " extra bit" + (k === 1 ? "" : "s") + ", 2 ** " + k + " = <b>" + Math.pow(2, k) + "</b>."); },
    same() { const a = rand(0, 7), b = rand(0, 7), y = Math.floor(a / 4) === Math.floor(b / 4); return P("# block 4: are ." + a + " and ." + b + " neighbours?\n>>> " + a + " // 4 == " + b + " // 4", tf(y), box(a + " // 4 = " + Math.floor(a / 4) + "\n" + b + " // 4 = " + Math.floor(b / 4)) + "Same block? <b>" + tf(y) + "</b>.", asBool); },
    nth() { const k = rand(1, 2); return P("# first usable host in subnet " + k + " (block 4, counting from 0)\n>>> " + k + " * 4 + 1", k * 4 + 1, "Subnet " + k + " starts at " + (k * 4) + ", first host is <b>" + (k * 4 + 1) + "</b>."); }
  },

  cycles: {
    listwrap() { const c = ["red", "blue"], i = rand(2, 5); return P("c = ['red', 'blue']\n>>> c[" + i + " % len(c)]", null, i + " % 2 = " + (i % 2) + ", so c[" + (i % 2) + "] is <b>'" + c[i % 2] + "'</b>.", asText(c[i % 2])); },
    weekday() { const n = rand(1, 8), r = n % 7; const D = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; return P("# 0 = Mon … 6 = Sun. Today is 0 (Mon)\n>>> (0 + " + n + ") % 7", r, n + " % 7 = " + r + " → <b>" + D[r] + "</b>.", { viz: { t: "modclock", b: 7, rem: r } }); },
    zigzag() { const row = rand(0, 3), d = row % 2 === 0 ? "right" : "left"; return P("row = " + row + "\n>>> 'right' if row % 2 == 0 else 'left'", null, row + " is " + (row % 2 ? "odd" : "even") + ", so <b>'" + d + "'</b>.", asText(d)); },
    nextidx() { const n = rand(2, 3), i = rand(0, n - 1); return P("players = " + n + "\n>>> i = " + i + "\n>>> (i + 1) % players", (i + 1) % n, "(" + i + " + 1) % " + n + " = <b>" + ((i + 1) % n) + "</b>." + (i === n - 1 ? " Back to the start." : ""), { viz: { t: "modclock", b: n, rem: (i + 1) % n } }); },
    wrapleft() { const s = rand(1, 2), r = 4 - s; return P("# grid 4 wide, at column 0, step " + s + " left\n>>> (0 - " + s + ") % 4", r, "Past the left edge you come back on the right: -" + s + " + 4 = <b>" + r + "</b>.", { viz: { t: "modclock", b: 4, rem: r } }); },
    hours() { const h = rand(22, 23), a = rand(1, 3), r = (h + a) % 24; return P("# it is " + h + ":00 — " + a + " hours later?\n>>> (" + h + " + " + a + ") % 24", r, h + " + " + a + " = " + (h + a) + ", past 24 wraps to <b>" + r + "</b>."); },
    minutes() { const m = rand(60, 75); return P(m + " // 60, " + m + " % 60", null, "1 full hour, " + (m - 60) + " minutes over: <b>1, " + (m - 60) + "</b>.", pair(1, m - 60, "hours, minutes")); },
    tens() { const n = rand(10, 99), r = Math.floor(n / 10) % 10; return P(n + " // 10 % 10", r, n + " // 10 = " + Math.floor(n / 10) + ", then % 10 = <b>" + r + "</b>."); },
    toindex() { const w = rand(2, 3), c = rand(0, w - 1); return P("# grid " + w + " wide, row 1, column " + c + " → list index?\n>>> 1 * " + w + " + " + c, w + c, "Skip one full row (" + w + "), then " + c + " more: <b>" + (w + c) + "</b>."); },
    together() { const p = pick([[2, 3], [2, 4], [3, 6], [2, 5]]), l = p[0] * p[1] / (p[1] % p[0] === 0 ? p[0] : 1); return P("# A every " + p[0] + "s, B every " + p[1] + "s, together at 0 — next together?\n>>> first t > 0 where t % " + p[0] + " == 0 and t % " + p[1] + " == 0", l, box("A: " + [1, 2, 3, 4, 5].map(x => x * p[0]).join(", ") + "\nB: " + [1, 2, 3].map(x => x * p[1]).join(", ")) + "First in both: <b>" + l + "</b>."); },
    both() { const t = rand(1, 12), y = t % 2 === 0 && t % 3 === 0; return P(t + " % 2 == 0 and " + t + " % 3 == 0", tf(y), box(t + " % 2 = " + (t % 2) + "\n" + t + " % 3 = " + (t % 3)) + "Both 0? <b>" + tf(y) + "</b>.", asBool); }
  },

  rounding: {
    int() { const a = rand(1, 3), d = rand(1, 9); return P("int(" + a + "." + d + ")", a, "<code>int()</code> chops the decimal off: <b>" + a + "</b>."); },
    round() { const a = rand(1, 3), d = pick([1, 2, 8, 9]), r = d > 5 ? a + 1 : a; return P("round(" + a + "." + d + ")", r, a + "." + d + " is closest to <b>" + r + "</b>."); },
    roundnd() { const a = rand(1, 3), b = rand(1, 8), t = pick([1, 2, 8, 9]); return P("round(" + a + "." + b + "0" + t + ", 2)", (a * 100 + b * 10 + (t > 5 ? 1 : 0)) / 100, "Look at the third decimal (" + t + "): " + (t > 5 ? "round up" : "leave it") + ". So <b>" + ((a * 100 + b * 10 + (t > 5 ? 1 : 0)) / 100) + "</b>."); },
    ceil() { const a = rand(1, 3), d = rand(1, 9); return P("ceil(" + a + "." + d + ")", a + 1, "<code>ceil</code> always goes up: <b>" + (a + 1) + "</b>."); },
    bankers() { const b = rand(0, 2), r = b % 2 === 0 ? b : b + 1; return P("round(" + b + ".5)", r, "Exactly half: Python picks the even one. " + b + " or " + (b + 1) + " → <b>" + r + "</b>."); },
    negfloor() { const a = pick([1, 3, 5]); return P("-" + a + " // 2", Math.floor(-a / 2), "-" + a + " / 2 = " + (-a / 2) + ". <code>//</code> goes down the number line: <b>" + Math.floor(-a / 2) + "</b>.", { viz: { t: "numline", min: -3, max: 0, base: -a / 2, to: Math.floor(-a / 2) } }); },
    negint() { const a = rand(1, 2), d = rand(1, 9); return P("int(-" + a + "." + d + ")", -a, "<code>int()</code> chops towards 0: <b>-" + a + "</b>."); },
    roundneg() { const a = rand(1, 2), d = pick([1, 2, 8, 9]), r = d > 5 ? -(a + 1) : -a; return P("round(-" + a + "." + d + ")", r, "Nearest whole number to -" + a + "." + d + ": <b>" + r + "</b>."); },
    ceiltrick() { const a = pick([3, 5]); return P("-(-" + a + " // 2)", Math.ceil(a / 2), box("-" + a + " // 2 = " + Math.floor(-a / 2) + "\n-(" + Math.floor(-a / 2) + ") = " + Math.ceil(a / 2)) + "Same as rounding " + a + " / 2 up: <b>" + Math.ceil(a / 2) + "</b>."); },
    divmodneg() { const a = pick([1, 3]); const qq = Math.floor(-a / 2), rr = -a - qq * 2; return P("divmod(-" + a + ", 2)", null, box("-" + a + " // 2 = " + qq + "\n-" + a + " %  2 = " + rr) + "<b>(" + qq + ", " + rr + ")</b>.", pair(qq, rr, "q, r")); },
    floatsum() { const p = pick([[0.5, 0.5, "1.0"], [0.25, 0.25, "0.5"], [0.1, 0.2, "0.3"], [1.5, 0.5, "2.0"]]), y = p[0] + p[1] === Number(p[2]); return P(p[0] + " + " + p[1] + " == " + p[2], tf(y), y ? "Halves and quarters are exact in binary: <b>True</b>." : "Tenths are never exact in binary, the sum is a hair off: <b>False</b>.", asBool); },
    roundten() { let n = rand(11, 99); if (n % 10 === 5) n++; const r = Math.round(n / 10) * 10; return P("round(" + n + ", -1)", r, "-1 means round to the nearest 10: <b>" + r + "</b>."); },
    percent() { const b = pick([2, 4, 5, 10]); return P("round(1 / " + b + " * 100)", 100 / b, "1 out of " + b + " is " + (100 / b) + "%: <b>" + (100 / b) + "</b>."); }
  }
};

export function baby(cat, kind) {
  const set = babies[cat];
  const fn = set && set[kind];
  if (!fn) return null;
  const pz = fn();
  if (pz.answer === null) delete pz.answer;
  pz.kind = kind;
  return pz;
}
