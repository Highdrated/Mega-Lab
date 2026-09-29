import { rand, pick, random } from "../core/rng.js";

const words = [
  "cat", "dog", "sun", "cup", "map", "key", "bug", "log", "pen", "fox",
  "hello", "python", "code", "drone", "farm", "pixel", "array", "index", "loop", "stack",
  "queue", "table", "robot", "cloud", "input", "print", "value", "token", "float", "range",
  "banana", "packet", "server", "kernel", "syntax", "buffer", "cursor", "module", "socket", "thread",
  "variable", "function", "iterator", "database", "protocol", "sequence", "compiler", "operator"
];

const shortWords = words.filter(w => w.length <= 5);
const midWords = words.filter(w => w.length >= 5 && w.length <= 6);
const longWords = words.filter(w => w.length >= 6);

const asText = (v) => ({ answer: String(v), placeholder: "text", inputmode: "text" });
const asBool = () => ({ placeholder: "True or False", inputmode: "text" });

function pyBin(n) { return n.toString(2); }
function bitsOf(n) { const b = pyBin(n); const parts = []; for (let i = 0; i < b.length; i++) if (b[i] === "1") parts.push(Math.pow(2, b.length - 1 - i)); return parts; }
function rangeVals(start, stop, step) { const v = []; if (step > 0) { for (let n = start; n < stop; n += step) v.push(n); } else { for (let n = start; n > stop; n += step) v.push(n); } return v; }
const listLit = (a) => "[" + a.join(", ") + "]";
const q = (s) => '"' + s + '"';

const NAMES = ["base", "n", "value", "size", "count", "total", "x", "num", "step", "scale"];

const box = (s) => "<pre><code>" + s + "</code></pre>";
const cell = (v, w) => String(v).padStart(w).padEnd(w + 2);

function binWorking(n) {
  const bin = pyBin(n);
  const places = bin.split("").map((_, i) => Math.pow(2, bin.length - 1 - i));
  const w = String(places[0]).length;
  const kept = [];
  bin.split("").forEach((d, i) => { if (d === "1") kept.push(places[i]); });
  return "Ignore the <code>0b</code> — that just means binary is coming. Write what each slot is worth underneath, doubling as you go right to left:" +
    box(bin.split("").map(d => cell(d, w)).join("") + "\n" +
        places.map(v => cell(v, w)).join("") + "   what each slot is worth") +
    "Now keep only the slots with a <b>1</b> above them, and add those up: <b>" + kept.join(" + ") + " = " + n + "</b>.";
}

function toBinWorking(n) {
  const bin = pyBin(n);
  const places = bin.split("").map((_, i) => Math.pow(2, bin.length - 1 - i));
  const steps = [];
  let left = n;
  places.forEach(v => {
    if (v <= left) { steps.push("does " + v + " fit into " + left + "? yes → write 1, " + left + " − " + v + " = " + (left - v)); left -= v; }
    else { steps.push("does " + v + " fit into " + left + "? no → write 0"); }
  });
  return "Work downwards through the slot values, biggest first, asking whether each one fits into what is left:" +
    box(steps.join("\n")) + "Reading the answers top to bottom gives <b>" + bin + "</b>.";
}
const FLAGS = ["flags", "mask", "bits", "state", "byte", "n", "raw", "code"];

function named(expr, sym, val, pool) {
  const name = pick(pool || NAMES);
  return name + " = " + val + "\n>>> " + expr.split(String(val)).join(name);
}

export const generators = {

  basics(diff) {
    const size = { easy: [1, 10], medium: [5, 25], hard: [10, 50] }[diff];
    const cap = { easy: 6, medium: 9, hard: 12 }[diff];
    const kind = pick({
      easy: ["op", "op", "op", "var", "floordiv", "unary"],
      medium: ["op", "op", "var", "var2", "floordiv", "precedence", "paren"],
      hard: ["op", "var2", "precedence", "paren", "floordiv", "chain", "mixed"]
    }[diff]);

    if (kind === "floordiv") {
      const b = rand(2, cap), whole = rand(2, cap), extra = rand(0, b - 1);
      const a = b * whole + extra;
      return { code: a + " // " + b, answer: whole,
        explain: "<code>//</code> is division that only wants whole numbers — anything after the decimal point is thrown away, never rounded.<br>How many whole " + b + "s fit into " + a + "? <b>" + whole + "</b> of them (" + whole + " × " + b + " = " + (whole * b) + "), with " + extra + " left over that gets discarded.<br>Ordinary <code>/</code> would have given " + (Math.round(a / b * 100) / 100) + ".",
        viz: { t: "grid", total: b * whole, per: b } };
    }
    if (kind === "unary") {
      const a = rand(size[0], size[1]), b = rand(size[0], size[1]);
      return { code: "-" + a + " + " + b, answer: b - a,
        explain: "The minus sign in front makes it a negative number — think of it as being " + a + " below zero.<br>Now add " + b + ": start at -" + a + " and count up " + b + " places, landing on <b>" + (b - a) + "</b>.",
        viz: { t: "numline", min: Math.min(-a, b - a, 0), max: Math.max(b - a, 0, b), base: -a, to: b - a } };
    }
    if (kind === "precedence") {
      const a = rand(2, 9), b = rand(2, 9), c = rand(2, 9);
      return { code: a + " + " + b + " * " + c, answer: a + b * c,
        explain: "Python does not just work left to right — <b>multiply and divide happen before add and subtract</b>." + box("step 1:  " + b + " × " + c + " = " + (b * c) + "\nstep 2:  " + a + " + " + (b * c) + " = " + (a + b * c)) + "Going left to right instead would give " + ((a + b) * c) + ", which is wrong.",
        viz: { t: "bars", vals: [a, b * c], labels: ["a", "b*c"] } };
    }
    if (kind === "paren") {
      const a = rand(2, 9), b = rand(2, 9), c = rand(2, 9);
      return { code: "(" + a + " + " + b + ") * " + c, answer: (a + b) * c,
        explain: "<b>Brackets beat everything.</b> Whatever is inside them gets done first, even the multiply." + box("step 1:  (" + a + " + " + b + ") = " + (a + b) + "\nstep 2:  " + (a + b) + " × " + c + " = " + ((a + b) * c)) + "Without the brackets it would be " + (a + b * c) + " instead.",
        viz: { t: "grid", total: Math.min((a + b) * c, 60), per: c } };
    }
    if (kind === "chain") {
      const a = rand(3, 12), b = rand(2, 6), c = rand(2, 6);
      return { code: "x = " + a + "\n>>> x += " + b + "\n>>> x *= " + c + "\n>>> x", answer: (a + b) * c,
        explain: "Follow the box one line at a time. <code>+=</code> means \"add to what is already in there\" and <code>*=</code> means \"multiply what is already in there\"." + box("x starts as   " + a + "\nx += " + b + "  →  " + a + " + " + b + " = " + (a + b) + "\nx *= " + c + "  →  " + (a + b) + " × " + c + " = " + ((a + b) * c)),
        viz: { t: "bars", vals: [a, a + b, (a + b) * c], labels: ["start", "+", "x"] } };
    }
    if (kind === "mixed") {
      const a = rand(10, 40), b = rand(2, 6), c = rand(2, 9);
      return { code: a + " - " + b + " * " + c, answer: a - b * c,
        explain: "The multiply goes first, before the subtraction — that is the rule, regardless of what order they are written in." + box("step 1:  " + b + " × " + c + " = " + (b * c) + "\nstep 2:  " + a + " − " + (b * c) + " = " + (a - b * c)),
        viz: { t: "numline", min: Math.min(0, a - b * c), max: a, base: a, to: a - b * c } };
    }

    const op = pick(["+", "-", "*", "/"]);
    let a, b, ans, viz;
    if (op === "+") { a = rand(size[0], size[1]); b = rand(size[0], size[1]); ans = a + b; viz = { t: "numline", min: 0, max: a + b, base: a, to: a + b }; }
    else if (op === "-") { a = rand(size[0], size[1]); b = rand(size[0], size[1]); if (b > a) { const t = a; a = b; b = t; } ans = a - b; viz = { t: "numline", min: 0, max: a, base: a, to: a - b }; }
    else if (op === "*") { a = rand(2, cap); b = rand(2, cap); ans = a * b; viz = { t: "grid", total: a * b, per: b }; }
    else { const d = rand(2, cap), whole = rand(2, cap); a = d * whole; b = d; ans = whole; viz = { t: "grid", total: d * whole, per: d }; }

    if (kind === "var") {
      return { code: "x = " + a + "\n>>> x " + op + " " + b, answer: ans,
        explain: "<code>x = " + a + "</code> puts " + a + " into a box labelled x. After that, writing <code>x</code> anywhere means " + a + ".<br>So swap the name for its value and work it out: " + a + " " + op + " " + b + " = <b>" + ans + "</b>.", viz: viz };
    }
    if (kind === "var2") {
      return { code: "x = " + a + "\n>>> y = " + b + "\n>>> x " + op + " y", answer: ans,
        explain: "Two boxes this time: x holds " + a + " and y holds " + b + ".<br>Swap both names for their values, then work it out: " + a + " " + op + " " + b + " = <b>" + ans + "</b>.", viz: viz };
    }
    const opName = { "+": "add", "-": "subtract", "*": "multiply", "/": "divide" }[op];
    const opNote = op === "/" ? "<br>Careful: <code>/</code> always gives a decimal in Python, so the real answer is " + ans + ".0 rather than a plain " + ans + ". Both count as correct here." :
      op === "*" ? "<br>Python uses <code>*</code> rather than × because there is no multiply key on a keyboard." :
      op === "+" ? "<br>Adding is the one that behaves exactly like you would expect. Enjoy it while it lasts." :
      "<br>Order matters with subtraction: " + b + " − " + a + " would give something different.";
    return { code: a + " " + op + " " + b, answer: ans, explain: "<code>" + op + "</code> means <b>" + opName + "</b>. So this is " + a + " " + opName + " " + b + ", which comes to <b>" + ans + "</b>." + opNote, viz: viz };
  },

  powers(diff) {
    const kind = pick({
      easy: ["basic", "basic", "square", "square", "zero", "one", "two", "three", "digits", "expadd", "sumsq"],
      medium: ["basic", "basic", "square", "cube", "two", "ten", "sqrt", "three", "digits", "expadd", "expsub", "compare", "sumsq", "diffsq"],
      hard: ["basic", "basic", "two", "ten", "sqrt", "cube", "nested", "neg", "mask", "expadd", "expsub", "compare", "sumsq", "diffsq", "three"]
    }[diff]);

    if (kind === "zero") {
      const b = rand(2, 20);
      return { code: b + " ** 0", answer: 1, explain: "To the power of 0 means <i>zero copies</i> of the number multiplied together — and the answer to that is always <b>1</b>, never 0.<br>It looks strange, but it keeps the pattern working: " + b + "³ ÷ " + b + " = " + b + "², " + b + "² ÷ " + b + " = " + b + "¹, and " + b + "¹ ÷ " + b + " = " + b + "⁰ = 1.", viz: null };
    }
    if (kind === "one") {
      const b = rand(2, 30);
      return { code: b + " ** 1", answer: b, explain: "The exponent counts how many copies to multiply together. One copy has nothing to be multiplied by, so the number comes out untouched: <b>" + b + "</b>.<br>Pair this with the rule that anything to the power of 0 is 1, and the pattern makes sense — each step down divides by the base.", viz: null };
    }
    if (kind === "square") {
      const b = rand(2, diff === "easy" ? 14 : 25);
      if (random() < 0.4) { const nm = pick(NAMES); return { code: nm + " = " + b + "\n>>> " + nm + " ** 2", answer: b * b, explain: "Swap the name for its value first — " + nm + " is " + b + ".<br>Then \"to the power of 2\" means two copies multiplied: <b>" + b + " × " + b + " = " + b * b + "</b>.", viz: { t: "grid", total: Math.min(b * b, 60), per: b } }; }
      return { code: b + " ** 2", answer: b * b, explain: "\"To the power of 2\" means write the number down twice and multiply: <b>" + b + " × " + b + " = " + b * b + "</b>.<br>People say <i>squared</i> because " + b + " rows of " + b + " makes a square.", viz: { t: "grid", total: Math.min(b * b, 60), per: b } };
    }
    if (kind === "cube") {
      const b = rand(2, 9);
      if (random() < 0.4) { const nm = pick(NAMES); return { code: nm + " = " + b + "\n>>> " + nm + " ** 3", answer: b * b * b, explain: "Swap the name for its value — " + nm + " is " + b + " — then multiply three copies together.<br><b>" + b + " × " + b + " × " + b + " = " + b * b * b + "</b>.", viz: { t: "chain", base: b, exp: 3, result: b * b * b } }; }
      return { code: b + " ** 3", answer: b * b * b, explain: "\"To the power of 3\" means three copies multiplied together: <b>" + b + " × " + b + " × " + b + " = " + b * b * b + "</b>.<br>People say <i>cubed</i> because " + b + " × " + b + " × " + b + " fills a cube " + b + " on each side.", viz: { t: "chain", base: b, exp: 3, result: b * b * b } };
    }
    if (kind === "two") {
      const e = rand(diff === "easy" ? 2 : 5, diff === "hard" ? 12 : 9);
      return { code: "2 ** " + e, answer: Math.pow(2, e), explain: "Start at 1 and double it " + e + " times:" + box([1].concat(Array.from({length: e}, (_, i) => Math.pow(2, i + 1))).join(" → ")) + "Landing on <b>" + Math.pow(2, e) + "</b>. Doubling runs away far faster than people expect.", viz: { t: "chain", base: 2, exp: Math.min(e, 8), result: Math.pow(2, e) } };
    }
    if (kind === "ten") {
      const e = rand(2, diff === "hard" ? 7 : 5);
      return { code: "10 ** " + e, answer: Math.pow(10, e), explain: "Powers of 10 are the friendly ones — the exponent is simply how many zeros follow the 1." + box("10 ** " + e + "  →  1 followed by " + e + " zeros  →  " + Math.pow(10, e)) + "This is why 10 ** 3 is a thousand and 10 ** 6 is a million.", viz: null };
    }
    if (kind === "sqrt") {
      const r = rand(2, 15);
      return { code: (r * r) + " ** 0.5", answer: r, explain: "An exponent of <code>0.5</code> means <b>square root</b> — it asks the question backwards.<br>Instead of \"what is " + r + " × " + r + "?\", it asks \"what number times itself gives " + (r * r) + "?\"<br>The answer is <b>" + r + "</b>, because " + r + " × " + r + " = " + (r * r) + ".", viz: { t: "grid", total: Math.min(r * r, 60), per: r } };
    }
    if (kind === "neg") {
      const b = pick([2, 4, 5, 10]);
      return { code: b + " ** -1", answer: 1 / b, explain: "A <b>minus</b> in the exponent does not make the answer negative — it flips the number upside down into a fraction." + box(b + " ** -1  →  1 / " + b + "  →  " + (1 / b)) + "So the answer is <b>" + (1 / b) + "</b>. Bigger base, smaller answer.", viz: null };
    }
    if (kind === "nested") {
      const b = rand(2, 4), e = rand(2, 3);
      return { code: "(" + b + " ** " + e + ") ** 2", answer: Math.pow(Math.pow(b, e), 2),
        explain: "Work outwards from the brackets." + box("inside:  " + b + " ** " + e + " = " + Math.pow(b, e) + "\nthen:    " + Math.pow(b, e) + " ** 2 = " + Math.pow(b, e) + " × " + Math.pow(b, e) + " = " + Math.pow(Math.pow(b, e), 2)) + "Brackets always go first, same as in ordinary arithmetic.", viz: null };
    }
    if (kind === "sumsq") {
      const hi = diff === "easy" ? 9 : diff === "medium" ? 14 : 20;
      const a = rand(2, hi), b = rand(2, hi);
      return { code: a + " ** 2 + " + b + " ** 2", answer: a * a + b * b,
        explain: "Work out each power on its own before adding them — powers always go before plus." + box(a + " ** 2 = " + a + " × " + a + " = " + a * a + "\n" + b + " ** 2 = " + b + " × " + b + " = " + b * b + "\n" + a * a + " + " + b * b + " = " + (a * a + b * b)),
        viz: { t: "bars", vals: [a * a, b * b], labels: [a + "²", b + "²"] } };
    }
    if (kind === "diffsq") {
      const hi = diff === "medium" ? 15 : 22;
      const a = rand(4, hi), b = rand(2, a - 1);
      return { code: a + " ** 2 - " + b + " ** 2", answer: a * a - b * b,
        explain: "Deal with each power separately first, then subtract." + box(a + " ** 2 = " + a + " × " + a + " = " + a * a + "\n" + b + " ** 2 = " + b + " × " + b + " = " + b * b + "\n" + a * a + " − " + b * b + " = " + (a * a - b * b)),
        viz: { t: "bars", vals: [a * a, b * b], labels: [a + "²", b + "²"] } };
    }
    if (kind === "three") {
      const b = pick([3, 5, 6, 7, 11, 12, 13]), e = rand(2, diff === "easy" ? 3 : 4);
      return { code: b + " ** " + e, answer: Math.pow(b, e),
        explain: "Write " + b + " down " + e + " times and multiply them all together:" + box(Array.from({length: e}, () => b).join(" × ") + " = " + Math.pow(b, e)) + "The small number tells you <b>how many copies</b>, not what to multiply by.",
        viz: { t: "chain", base: b, exp: e, result: Math.pow(b, e) } };
    }
    if (kind === "digits") {
      const e = rand(2, 8);
      return { code: "len(str(10 ** " + e + "))", answer: e + 1,
        explain: "<code>str()</code> turns the number into text, then <code>len()</code> counts the characters — so this is really asking how many digits it has." + box("10 ** " + e + "  =  1 followed by " + e + " zeros\ndigits    =  1 (the one) + " + e + " (the zeros) = " + (e + 1)) + "So <b>" + (e + 1) + "</b>. Off-by-one trap: it is not " + e + ".", viz: null };
    }
    if (kind === "expadd") {
      const b = pick([2, 3, 5]), a = rand(2, 4), c = rand(2, 4);
      return { code: b + " ** " + a + " * " + b + " ** " + c, answer: Math.pow(b, a + c),
        explain: "Both sides are the same number, " + b + ", multiplied by itself over and over. One side has " + a + " copies, the other has " + c + ". Put them together and you simply have " + (a + c) + " copies in a row.<br>So you <b>add the exponents</b>: " + a + " + " + c + " = " + (a + c) + ", giving " + b + " ** " + (a + c) + " = <b>" + Math.pow(b, a + c) + "</b>.",
        viz: { t: "chain", base: b, exp: Math.min(a + c, 8), result: Math.pow(b, a + c) } };
    }
    if (kind === "expsub") {
      const b = pick([2, 3, 5]), a = rand(4, 7), c = rand(1, 3);
      return { code: b + " ** " + a + " // " + b + " ** " + c, answer: Math.pow(b, a - c),
        explain: "The top has " + a + " copies of " + b + ", the bottom has " + c + ". Each one on the bottom cancels one on the top, leaving " + (a - c) + " behind.<br>So you <b>subtract the exponents</b>: " + a + " − " + c + " = " + (a - c) + ", giving " + b + " ** " + (a - c) + " = <b>" + Math.pow(b, a - c) + "</b>.",
        viz: { t: "chain", base: b, exp: Math.min(a - c, 8), result: Math.pow(b, a - c) } };
    }
    if (kind === "compare") {
      const a = rand(2, 6), c = rand(2, 6);
      const left = Math.pow(a, c), right = Math.pow(c, a);
      return { code: a + " ** " + c + " > " + c + " ** " + a, answer: left > right ? "True" : "False",
        placeholder: "True or False", inputmode: "text",
        explain: "Order matters with powers — swapping the two numbers usually gives a different answer." + box(a + " ** " + c + " = " + left + "\n" + c + " ** " + a + " = " + right + "\nis " + left + " > " + right + " ?  " + (left > right ? "yes → True" : "no → False")) + (left === right ? "These two happen to tie, which is rare." : "The bigger <i>exponent</i> usually wins over the bigger base."),
        viz: { t: "bars", two: [left, right], labels: [a + "**" + c, c + "**" + a] } };
    }
    if (kind === "mask") {
      const e = rand(4, 9);
      return { code: "2 ** " + e + " - 1", answer: Math.pow(2, e) - 1,
        explain: "2 ** " + e + " = " + Math.pow(2, e) + ", minus 1 = " + (Math.pow(2, e) - 1) + ". A row of " + e + " ones in binary is always one less than the next power of two.",
        viz: { t: "bits", bin: pyBin(Math.pow(2, e) - 1) } };
    }
    const conf = { easy: [2, 9, 2, 3], medium: [2, 14, 2, 4], hard: [2, 20, 2, 5] }[diff];
    const base = rand(conf[0], conf[1]), exp = rand(conf[2], conf[3]);
    if (random() < 0.45) {
      const nm = pick(NAMES);
      return { code: nm + " = " + base + "\n>>> " + nm + " ** " + exp, answer: Math.pow(base, exp),
        explain: "First swap the name for its value: " + nm + " is " + base + ".<br>Then the exponent tells you how many copies to multiply:" + box(Array.from({length: exp}, () => base).join(" × ") + " = " + Math.pow(base, exp)),
        viz: { t: "chain", base: base, exp: exp, result: Math.pow(base, exp) } };
    }
    return { code: base + " ** " + exp, answer: Math.pow(base, exp),
      explain: "The exponent is a count of copies, not a multiplier. " + base + " ** " + exp + " means write " + base + " down " + exp + " times and multiply them:" + box(Array.from({length: exp}, () => base).join(" × ") + " = " + Math.pow(base, exp)) + "A common slip is doing " + base + " × " + exp + " = " + (base * exp) + " instead.",
      viz: { t: "chain", base: base, exp: exp, result: Math.pow(base, exp) } };
  },

  binary(diff) {
    const range = { easy: [1, 31], medium: [16, 127], hard: [64, 511] }[diff];
    const kind = pick({
      easy: ["read", "read", "write", "ones", "place"],
      medium: ["read", "write", "ones", "place", "add", "power"],
      hard: ["read", "write", "ones", "add", "power", "mask", "double"]
    }[diff]);

    if (kind === "write") {
      const n = rand(range[0], range[1]);
      return Object.assign({ code: "bin(" + n + ")[2:]",
        explain: toBinWorking(n),
        viz: { t: "bits", bin: pyBin(n) } }, asText(pyBin(n)), { placeholder: "0s and 1s" });
    }
    if (kind === "ones") {
      const n = rand(range[0], range[1]);
      const c = pyBin(n).split("").filter(x => x === "1").length;
      const onesWhy = "First turn " + n + " into binary — it is <code>" + pyBin(n) + "</code>. Then simply count the 1s in it, ignoring every 0. There are <b>" + c + "</b>.";
      if (random() < 0.4) { const nm = pick(FLAGS); return { code: nm + " = " + n + "\n>>> bin(" + nm + ").count('1')", answer: c, explain: onesWhy, viz: { t: "bits", bin: pyBin(n) } }; }
      return { code: "bin(" + n + ").count('1')", answer: c,
        explain: onesWhy,
        viz: { t: "bits", bin: pyBin(n) } };
    }
    if (kind === "place") {
      const bits = rand(diff === "easy" ? 3 : 4, diff === "hard" ? 8 : 6);
      const n = Math.pow(2, bits - 1) + rand(0, Math.pow(2, bits - 1) - 1);
      return { code: "0b" + pyBin(n) + "\n>>> what is the leftmost 1 worth?", answer: Math.pow(2, pyBin(n).length - 1),
        explain: "Slots double as you move left: the rightmost is worth 1, then 2, then 4, then 8, and so on. This number has " + pyBin(n).length + " digits, so counting those doublings gives the leftmost slot a value of <b>" + Math.pow(2, pyBin(n).length - 1) + "</b>.",
        viz: { t: "bits", bin: pyBin(n) } };
    }
    if (kind === "add") {
      const a = rand(1, diff === "hard" ? 30 : 12), b = rand(1, diff === "hard" ? 30 : 12);
      return { code: "0b" + pyBin(a) + " + 0b" + pyBin(b), answer: a + b,
        explain: "Turn each one into an ordinary number first, then add them like normal.<br><code>0b" + pyBin(a) + "</code> is <b>" + a + "</b> (" + bitsOf(a).join(" + ") + ")<br><code>0b" + pyBin(b) + "</code> is <b>" + b + "</b> (" + bitsOf(b).join(" + ") + ")<br>So " + a + " + " + b + " = <b>" + (a + b) + "</b>.",
        viz: { t: "bars", vals: [a, b, a + b], labels: ["a", "b", "sum"] } };
    }
    if (kind === "power") {
      const e = rand(2, diff === "hard" ? 8 : 5);
      return { code: "0b1" + "0".repeat(e), answer: Math.pow(2, e),
        explain: "A single 1 with " + e + " zeros after it sits in the slot worth 2 doubled " + e + " times. Every other slot holds a 0, so nothing else is added. That makes it exactly <b>" + Math.pow(2, e) + "</b>.",
        viz: { t: "bits", bin: "1" + "0".repeat(e) } };
    }
    if (kind === "mask") {
      const e = rand(3, 8);
      return { code: "0b" + "1".repeat(e), answer: Math.pow(2, e) - 1,
        explain: "Every slot is switched on, so you add all of them: " + bitsOf(Math.pow(2, e) - 1).join(" + ") + " = <b>" + (Math.pow(2, e) - 1) + "</b>.<br>Shortcut worth knowing: a row of ones is always <b>one less</b> than the next slot up. The next slot here is " + Math.pow(2, e) + ", so the answer is " + Math.pow(2, e) + " − 1.",
        viz: { t: "bits", bin: "1".repeat(e) } };
    }
    if (kind === "double") {
      const n = rand(3, 60);
      return { code: "0b" + pyBin(n) + " << 1", answer: n * 2,
        explain: "<code>&lt;&lt; 1</code> slides every digit one slot to the left and puts a 0 on the end. Since each slot is worth double the one to its right, moving everything left <b>doubles</b> the number: " + n + " → <b>" + (n * 2) + "</b>.<br>(In ordinary numbers, adding a zero on the end multiplies by 10. Same idea, but binary doubles instead.)",
        viz: { t: "bits", bin: pyBin(n * 2) } };
    }
    const n = rand(range[0], range[1]);
    if (random() < 0.45) {
      const nm = pick(FLAGS);
      return { code: nm + " = 0b" + pyBin(n) + "\n>>> " + nm, answer: n,
        explain: binWorking(n),
        viz: { t: "bits", bin: pyBin(n) } };
    }
    return { code: "0b" + pyBin(n), answer: n,
      explain: binWorking(n),
      viz: { t: "bits", bin: pyBin(n) } };
  },

  strings(diff) {
    const kind = pick({
      easy: ["len", "len", "char", "count", "upper", "in", "concat", "repeat", "first", "last"],
      medium: ["count", "slicelen", "index", "upper", "concat", "repeat", "replace", "split", "startswith", "negchar", "find"],
      hard: ["slicelen", "slice", "negslice", "replace", "split", "join", "strip", "find", "two", "stepslice"]
    }[diff]);
    const pool = diff === "easy" ? shortWords : diff === "medium" ? midWords : longWords;
    const w = pick(pool.length ? pool : words);

    if (kind === "len") return { code: "len(" + q(w) + ")", answer: w.length, explain: "<code>len</code> counts how many characters are in the text — letters, spaces, punctuation, all of it.<br>Count them one at a time: " + w.split("").join(" · ") + " → <b>" + w.length + "</b>.", viz: { t: "boxes", chars: w.split("") } };

    if (kind === "char") { const i = rand(0, w.length - 1); return Object.assign({ code: q(w) + "[" + i + "]", explain: "Positions in a string start at <b>0</b>, not 1 — this is the single most common thing to get wrong." + box(w.split("").map(ch => cell(ch, 1)).join("") + "\n" + w.split("").map((_, j) => cell(j, 1)).join("")) + "Position " + i + " lands on <b>'" + w[i] + "'</b>. Note it is the " + (i + 1) + (i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th") + " character, because the counting starts at zero.", viz: { t: "boxes", chars: w.split(""), hi: [i] } }, asText(w[i])); }

    if (kind === "first") return Object.assign({ code: q(w) + "[0]", explain: "Position <b>0</b> is always the very first character — not position 1. Here that is <b>'" + w[0] + "'</b>.<br>Think of the number as \"how many steps along from the start\", and the first character is zero steps along.", viz: { t: "boxes", chars: w.split(""), hi: [0] } }, asText(w[0]));

    if (kind === "last") return Object.assign({ code: q(w) + "[-1]", explain: "A minus sign counts <b>backwards from the end</b>. <code>[-1]</code> is the last character, here <b>'" + w[w.length - 1] + "'</b>.<br>Why -1 and not -0? Because -0 and 0 are the same number, and 0 is already taken by the first character.", viz: { t: "boxes", chars: w.split(""), hi: [w.length - 1] } }, asText(w[w.length - 1]));

    if (kind === "negchar") { const k = rand(2, Math.min(4, w.length)); const ch = w[w.length - k]; return Object.assign({ code: q(w) + "[-" + k + "]", explain: "Counting backwards: <code>[-1]</code> is the last character, <code>[-2]</code> the one before, and so on." + box(w.split("").map(c2 => cell(c2, 2)).join("") + "\n" + w.split("").map((_, j) => cell("-" + (w.length - j), 2)).join("")) + "So <code>[-" + k + "]</code> is <b>'" + ch + "'</b>.", viz: { t: "boxes", chars: w.split(""), hi: [w.length - k] } }, asText(ch)); }

    if (kind === "count") { const ch = pick(w.split("")); const c = w.split("").filter(x => x === ch).length; return { code: q(w) + ".count(" + q(ch) + ")", answer: c, explain: "<code>.count()</code> walks through the text and tallies every match.<br>Going through " + q(w) + " letter by letter, <b>'" + ch + "'</b> turns up <b>" + c + "</b> time" + (c === 1 ? "" : "s") + ".", viz: { t: "boxes", chars: w.split(""), hiChar: ch } }; }

    if (kind === "upper") return { code: "len(" + q(w) + ".upper())", answer: w.length, explain: "Careful — this looks like a trick and it is. <code>.upper()</code> shouts the text: " + q(w.toUpperCase()) + ".<br>But swapping a letter for its capital does not add or remove any letters. Same count as before: <b>" + w.length + "</b>.", viz: { t: "boxes", chars: w.toUpperCase().split("") } };

    if (kind === "in") { const yes = random() < 0.5; const missing = "qxzjkv".split("").filter(c => w.indexOf(c) < 0); const ch = yes || !missing.length ? pick(w.split("")) : pick(missing); const has = w.indexOf(ch) >= 0; return Object.assign({ code: q(ch) + " in " + q(w), answer: has ? "True" : "False", explain: "<code>in</code> asks a yes-or-no question: is this character anywhere in the text? It gives back <b>True</b> or <b>False</b>, not a position.<br>'" + ch + "' " + (has ? "<b>does</b> appear" : "<b>does not</b> appear") + " in " + q(w) + " → <b>" + (has ? "True" : "False") + "</b>.", viz: { t: "boxes", chars: w.split(""), hiChar: ch } }, asBool()); }

    if (kind === "concat") { const b = pick(shortWords); return { code: "len(" + q(w) + " + " + q(b) + ")", answer: w.length + b.length, explain: "<code>+</code> on two strings glues them together rather than adding numbers. " + q(w) + " and " + q(b) + " become " + q(w + b) + ".<br>" + w.length + " characters + " + b.length + " characters = <b>" + (w.length + b.length) + "</b>.", viz: { t: "boxes", chars: (w + b).split("") } }; }

    if (kind === "repeat") { const n = rand(2, 4); return { code: "len(" + q(w) + " * " + n + ")", answer: w.length * n, explain: "<code>*</code> on a string repeats it rather than multiplying. " + q(w) + " × " + n + " gives " + q(Array.from({length: n}, () => w).join("")) + ".<br>That is " + w.length + " characters, " + n + " times over = <b>" + (w.length * n) + "</b>.", viz: { t: "cells", n: n, unit: "copy" } }; }

    if (kind === "index") { const ch = pick(w.split("")); return { code: q(w) + ".index(" + q(ch) + ")", answer: w.indexOf(ch), explain: "<code>.index()</code> hunts for the character and reports <b>where</b> it found it, not whether it exists.<br>It stops at the <i>first</i> match. Counting from 0, that is position <b>" + w.indexOf(ch) + "</b>.", viz: { t: "boxes", chars: w.split(""), hi: [w.indexOf(ch)] } }; }

    if (kind === "find") { const missing = "qxzjk".split("").filter(c => w.indexOf(c) < 0); const ch = missing.length ? pick(missing) : "q"; return { code: q(w) + ".find(" + q(ch) + ")", answer: -1, explain: "There is no '" + ch + "' anywhere in " + q(w) + ".<br><code>.find()</code> deals with that quietly by handing back <b>-1</b>, a position that cannot exist. It is a way of saying \"not here\" without crashing.<br>Its stricter cousin <code>.index()</code> would throw an error instead.", viz: { t: "boxes", chars: w.split("") } }; }

    if (kind === "replace") { const ch = pick(w.split("")); const c = w.split("").filter(x => x === ch).length; const out = w.split(ch).join(""); return Object.assign({ code: q(w) + ".replace(" + q(ch) + ", " + q("") + ")", explain: "<code>.replace(old, new)</code> swaps every match. Replacing with <code>\"\"</code> — an empty string — means swapping it for nothing at all, which deletes it.<br>Take all " + c + " '" + ch + "' out of " + q(w) + " and you are left with <b>" + q(out) + "</b>.", viz: { t: "boxes", chars: w.split(""), hiChar: ch } }, asText(out)); }

    if (kind === "split") { const parts = rand(2, 4); const joined = Array.from({ length: parts }, () => pick(shortWords)).join(","); return { code: "len(" + q(joined) + ".split(" + q(",") + "))", answer: parts, explain: "<code>.split(\",\")</code> chops the text wherever it finds a comma and hands back a list of the pieces." + box(q(joined) + "\n" + "→ " + joined.split(",").map(x2 => q(x2)).join(", ")) + "That is <b>" + parts + "</b> pieces. Handy for reading CSV files.", viz: { t: "cells", n: parts, unit: "piece" } }; }

    if (kind === "join") { const n = rand(2, 4); const items = Array.from({ length: n }, () => pick(shortWords)); const joined = items.join("-"); return { code: "len(" + q("-") + ".join(" + listLit(items.map(q)) + "))", answer: joined.length, explain: "<code>.join()</code> is split in reverse — it glues a list together, putting the separator <i>between</i> the pieces.<br>" + items.map(q).join(", ") + " → " + q(joined) + "<br>The words are " + items.reduce((a2, b2) => a2 + b2.length, 0) + " characters. " + n + " pieces have " + (n - 1) + " gaps between them, so " + (n - 1) + " dashes. Total <b>" + joined.length + "</b>.", viz: { t: "boxes", chars: joined.split("") } }; }

    if (kind === "strip") { const pad = " ".repeat(rand(1, 3)); return { code: "len(" + q(pad + w + pad) + ".strip())", answer: w.length, explain: "<code>.strip()</code> trims blank space off both ends and leaves the middle alone. Invisible spaces are still characters, so they count until you remove them.<br>What is left is " + q(w) + " — <b>" + w.length + "</b> characters.", viz: { t: "boxes", chars: w.split("") } }; }

    if (kind === "startswith") { const n = rand(1, 3); const pre = w.slice(0, n); return Object.assign({ code: q(w) + ".startswith(" + q(pre) + ")", answer: "True", explain: "<code>.startswith()</code> only peeks at the front of the text and answers yes or no.<br>" + q(w) + " does begin with " + q(pre) + ", so the answer is <b>True</b>.", viz: { t: "boxes", chars: w.split(""), range: [0, n] } }, asBool()); }

    if (kind === "two") { const i = rand(0, w.length - 2); return Object.assign({ code: q(w) + "[" + i + ":" + (i + 2) + "]", explain: "A slice <code>[from:to]</code> starts at the first number and stops <b>just before</b> the second.<br>From " + i + " up to (but not including) " + (i + 2) + " gives <b>" + q(w.slice(i, i + 2)) + "</b>.<br>The upside of that rule: the length is always the second number minus the first — here " + (i + 2) + " − " + i + " = 2.", viz: { t: "boxes", chars: w.split(""), range: [i, i + 2] } }, asText(w.slice(i, i + 2))); }

    if (kind === "slice") { const a = rand(0, w.length - 2), b = rand(a + 1, w.length); return Object.assign({ code: q(w) + "[" + a + ":" + b + "]", explain: "A slice starts at the first number and stops <b>just before</b> the second — the second one is never included." + box(w.split("").map(c2 => cell(c2, 1)).join("") + "\n" + w.split("").map((_, j) => cell(j >= a && j < b ? "^" : " ", 1)).join("")) + "That gives <b>" + q(w.slice(a, b)) + "</b>, which is " + (b - a) + " characters — always the second number minus the first.", viz: { t: "boxes", chars: w.split(""), range: [a, b] } }, asText(w.slice(a, b))); }

    if (kind === "negslice") { const k = rand(2, Math.min(4, w.length)); return { code: "len(" + q(w) + "[-" + k + ":])", answer: k, explain: "<code>[-" + k + ":]</code> means \"start " + k + " from the end, then run to the end\". You do not need to know how long the text is to grab its tail.<br>That gives " + q(w.slice(w.length - k)) + " — <b>" + k + "</b> characters.", viz: { t: "boxes", chars: w.split(""), range: [w.length - k, w.length] } }; }

    if (kind === "stepslice") { const res = w.split("").filter((_, i) => i % 2 === 0).join(""); return { code: "len(" + q(w) + "[::2])", answer: res.length, explain: "A third number is a <b>step</b> — how far to jump each time. <code>[::2]</code> means \"whole string, but in jumps of 2\", so it takes every other character starting at position 0.<br>" + q(w) + " → <b>" + q(res) + "</b>, which is " + res.length + " characters.", viz: { t: "boxes", chars: w.split(""), hi: w.split("").map((_, i) => i).filter(i => i % 2 === 0) } }; }

    const a = rand(0, w.length - 2), b = rand(a + 1, w.length);
    return { code: "len(" + q(w) + "[" + a + ":" + b + "])", answer: b - a,
      explain: "You do not have to work out the letters to know the length. A slice runs from the first number up to <b>but not including</b> the second, so the count is simply the second minus the first: " + b + " − " + a + " = <b>" + (b - a) + "</b>.<br>(The letters, if you are curious, are " + q(w.slice(a, b)) + ".)",
      viz: { t: "boxes", chars: w.split(""), range: [a, b] } };
  },

  webmath(diff) {
    const big = { easy: 40, medium: 120, hard: 320 }[diff];
    const kind = pick({
      easy: ["pages", "rows", "discount", "percent", "total"],
      medium: ["pages", "rows", "discount", "percent", "total", "vat", "leftover"],
      hard: ["pages", "discount", "percent", "vat", "leftover", "grid", "ratio"]
    }[diff]);

    if (kind === "discount") { const d = pick([10, 20, 25, 50]); const mult = { 10: 10, 20: 5, 25: 4, 50: 2 }[d]; const price = mult * rand(2, Math.floor(big / 4)); const final = price * (100 - d) / 100; return { code: price + " * (1 - " + d + "/100)", answer: final, explain: "The clever bit is working out what is <b>left</b> rather than what comes off. " + d + "% off means you still pay " + (100 - d) + "%." + box("(1 - " + d + "/100)  =  " + ((100 - d) / 100) + "\n" + price + " × " + ((100 - d) / 100) + " = " + final) + "One multiplication instead of a subtraction — fewer chances to slip. Answer <b>€" + final + "</b>.", viz: { t: "bars", two: [price, final], labels: ["price", "after"] } }; }
    if (kind === "percent") { const pct = pick([10, 20, 25, 50, 75]); const base = pick([20, 40, 60, 80, 100, 200]); return { code: base + " * " + pct + " / 100", answer: base * pct / 100, explain: "Per cent literally means \"out of a hundred\". So " + pct + "% is " + pct + " parts out of 100, or " + (pct / 100) + " as a decimal." + box(base + " × " + pct + " ÷ 100 = " + (base * pct / 100)) + "Multiply by the whole, divide by 100. Answer <b>" + (base * pct / 100) + "</b>.", viz: { t: "bars", two: [base, base * pct / 100], labels: ["all", pct + "%"] } }; }
    if (kind === "vat") { const price = pick([10, 20, 50, 100, 200]); const gross = Math.round(price * 121) / 100; return { code: price + " * 121 // 100", answer: Math.floor(price * 121 / 100), explain: "Adding 21% means paying 121% of the price — so multiply by 121 and divide by 100." + box(price + " × 121 = " + (price * 121) + "\n" + (price * 121) + " // 100 = " + Math.floor(price * 121 / 100)) + "<code>//</code> chops the decimals rather than rounding, giving <b>" + Math.floor(price * 121 / 100) + "</b>.", viz: { t: "bars", two: [price, Math.floor(price * 121 / 100)], labels: ["net", "gross"] } }; }
    if (kind === "leftover") { const per = rand(4, 10); const total = rand(per + 1, big); return { code: total + " % " + per, answer: total % per, explain: "<code>%</code> hands you the leftovers. Fill as many complete rows of " + per + " as you can — that is " + Math.floor(total / per) + " full rows using " + (Math.floor(total / per) * per) + " items.<br>" + total + " − " + (Math.floor(total / per) * per) + " = <b>" + (total % per) + "</b> stragglers on the last row.", viz: { t: "modclock", b: per, rem: total % per } }; }
    if (kind === "grid") { const cols = rand(3, 8), rows = rand(2, 7); return { code: cols + " * " + rows, answer: cols * rows, explain: "Count one row: " + cols + " cells. Now there are " + rows + " of those rows stacked up.<br>" + cols + " × " + rows + " = <b>" + (cols * rows) + "</b> cells in total.", viz: { t: "grid2d", w: cols, h: rows, from: [0, 0], to: [cols - 1, rows - 1] } }; }
    if (kind === "ratio") { const w = pick([1920, 1600, 1280, 800]); const factor = pick([2, 4]); return { code: w + " // " + factor, answer: w / factor, explain: "Shrinking an image by a factor of " + factor + " means dividing its width by " + factor + ".<br>" + w + " ÷ " + factor + " = <b>" + (w / factor) + "</b>px.<br><code>//</code> is used rather than <code>/</code> because pixels have to be whole numbers — you cannot have half a pixel.", viz: { t: "bars", two: [w, w / factor], labels: ["before", "after"] } }; }
    if (kind === "total") { const per = rand(3, 12), n = rand(3, 12); return { code: per + " * " + n, answer: per * n, explain: n + " lots of " + per + " means adding " + per + " to itself " + n + " times — which is exactly what multiplication is a shortcut for.<br>" + per + " × " + n + " = <b>" + (per * n) + "</b>.", viz: { t: "grid", total: Math.min(per * n, 60), per: per } }; }

    const total = rand(12, big); const per = rand(4, 10); const ans = Math.ceil(total / per);
    if (kind === "rows") return { code: "ceil(" + total + " / " + per + ")", answer: ans, explain: "Same idea as pages." + box(total + " ÷ " + per + " = " + (Math.round(total / per * 100) / 100) + " rows") + "Part of a row is still a row, so round <b>up</b> to <b>" + ans + "</b>. The final row just has a gap in it.", viz: { t: "cells", n: ans, unit: "row" } };
    return { code: "ceil(" + total + " / " + per + ")", answer: ans, explain: "Divide first, then think about the leftovers." + box(total + " ÷ " + per + " = " + (Math.round(total / per * 100) / 100) + " pages") + "You cannot have part of a page, and those leftover items still need somewhere to sit. So round <b>up</b> to <b>" + ans + "</b>.<br>That last page will only be partly full, and that is fine — this is exactly how pagination works on every website.", viz: { t: "cells", n: ans, unit: "page" } };
  },

  modulo(diff) {
    const range = { easy: [6, 20, 2, 6], medium: [11, 60, 3, 9], hard: [40, 150, 6, 12] }[diff];
    const kind = pick({
      easy: ["rem", "even", "smaller", "zero", "clock", "everyn", "lastdigit"],
      medium: ["rem", "even", "clock", "smaller", "zero", "everyn"],
      hard: ["rem", "clock", "negative", "everyn", "wrap", "lastdigit", "divmod"]
    }[diff]);

    if (kind === "even") { const n = rand(3, 60); return { code: n + " % 2", answer: n % 2, explain: "Dividing by 2 can only ever leave <b>0</b> or <b>1</b> behind — a number either splits evenly in half or it does not.<br>" + n + " is " + (n % 2 === 0 ? "<b>even</b>, so nothing is left over → <b>0</b>" : "<b>odd</b>, so one is left over → <b>1</b>") + ".<br>This is how every program checks odd or even.", viz: { t: "modclock", b: 2, rem: n % 2 } }; }
    if (kind === "smaller") { const b = rand(5, 20), a = rand(1, b - 1); return { code: a + " % " + b, answer: a, explain: "Careful, this one catches people out. " + b + " is <b>bigger</b> than " + a + ", so it does not fit in even once.<br>Nothing gets taken away, which means the whole of " + a + " is still sitting there as the leftover. The answer is <b>" + a + "</b>.", viz: { t: "modclock", b: b, rem: a } }; }
    if (kind === "zero") { const b = rand(2, 12), k = rand(2, 8); return { code: (b * k) + " % " + b, answer: 0, explain: b + " fits into " + (b * k) + " exactly " + k + " times with nothing spare, because " + k + " × " + b + " = " + (b * k) + " precisely.<br>Nothing left over means the answer is <b>0</b> — and a leftover of 0 is exactly how you test whether one number divides another cleanly.", viz: { t: "modclock", b: b, rem: 0 } }; }
    if (kind === "clock") { const h = rand(1, 12), add = rand(3, 30); return { code: "(" + h + " + " + add + ") % 12", answer: (h + add) % 12, explain: "Clock arithmetic. " + h + " o'clock plus " + add + " hours would be " + (h + add) + " — but a clock face only goes to 12, so it wraps round.<br>Take away whole 12s until you cannot any more: " + (h + add) + " − " + (Math.floor((h + add) / 12) * 12) + " = <b>" + ((h + add) % 12) + "</b>.", viz: { t: "modclock", b: 12, rem: (h + add) % 12 } }; }
    if (kind === "everyn") { const n = rand(3, 7), i = rand(1, 30); return { code: i + " % " + n + " == 0", answer: i % n === 0 ? "True" : "False", placeholder: "True or False", inputmode: "text", explain: "A leftover of <b>0</b> means it divided perfectly — which is how you check \"is this every " + n + "th one?\"" + box(i + " % " + n + " = " + (i % n) + "\nis that 0?  " + (i % n === 0 ? "yes → True" : "no → False")) + "Used for striping every other table row, running a job every 5th tick, that sort of thing.", viz: { t: "modclock", b: n, rem: i % n } }; }
    if (kind === "negative") { const b = rand(3, 10), a = rand(1, b - 1); return { code: "-" + a + " % " + b, answer: (b - a) % b, explain: "This one surprises almost everyone. You would expect -" + a + ", but Python gives <b>" + ((b - a) % b) + "</b>.<br>Picture a circle numbered 0 to " + (b - 1) + ". Standing at 0 and stepping <i>backwards</i> " + a + " place" + (a === 1 ? "" : "s") + " lands you at " + ((b - a) % b) + ", coming round the other side.<br>Python always hands back a positive leftover, which is exactly what you want when something walks off the left edge of a screen.", viz: { t: "modclock", b: b, rem: (b - a) % b } }; }
    if (kind === "wrap") { const w = pick([8, 10, 12, 16]); const x = rand(w, w * 3); return { code: x + " % " + w, answer: x % w, explain: "Picture a loop with " + w + " positions, numbered 0 to " + (w - 1) + ". Walking " + x + " steps means going all the way round " + Math.floor(x / w) + " time" + (Math.floor(x / w) === 1 ? "" : "s") + " and then a bit further.<br>Strip out the complete laps — " + Math.floor(x / w) + " × " + w + " = " + (Math.floor(x / w) * w) + " — and <b>" + (x % w) + "</b> steps remain.", viz: { t: "modclock", b: w, rem: x % w } }; }
    if (kind === "lastdigit") { const n = rand(23, 999); return { code: n + " % 10", answer: n % 10, explain: "Taking away whole 10s only ever strips off the tens, hundreds and so on — the final digit is never touched.<br>So <code>% 10</code> is a quick way to grab the last digit of any number. Here that is <b>" + (n % 10) + "</b>.", viz: { t: "modclock", b: 10, rem: n % 10 } }; }
    if (kind === "divmod") { const b = rand(3, 9), k = rand(2, 9), r = rand(0, b - 1); const a = b * k + r; return { code: a + " // " + b + " + " + a + " % " + b, answer: k + r, explain: "These two operators are a pair — one gives the whole part, the other the leftovers." + box(a + " // " + b + " = " + k + "   how many whole " + b + "s fit\n" + a + " %  " + b + " = " + r + "   what could not fit\nadded:      " + k + " + " + r + " = " + (k + r)), viz: { t: "modclock", b: b, rem: r } }; }

    const a = rand(range[0], range[1]), b = rand(range[2], range[3]);
    return { code: a + " % " + b, answer: a % b,
      explain: "<code>%</code> asks: how much is left over once you take out as many whole " + b + "s as you can?" +
        box(Math.floor(a / b) + " whole " + b + (Math.floor(a / b) === 1 ? "" : "s") + " fits into " + a + "\n" + Math.floor(a / b) + " × " + b + " = " + (Math.floor(a / b) * b) + "\n" + a + " − " + (Math.floor(a / b) * b) + " = " + (a % b) + " left over") +
        "So the answer is <b>" + (a % b) + "</b>. Note this is the leftover, not the division itself.",
      viz: { t: "modclock", b: b, rem: a % b } };
  },

  ranges(diff) {
    const kind = pick({
      easy: ["count", "count", "simple", "last", "first", "sum"],
      medium: ["count", "simple", "last", "sum", "contains", "listout"],
      hard: ["count", "last", "contains", "backwards", "listout", "sumstep", "empty"]
    }[diff]);

    if (kind === "simple") { const n = rand(3, 20); return { code: "len(range(" + n + "))", answer: n, explain: "With a single number, range always starts at <b>0</b> and stops before the number you gave it.<br>So it counts 0, 1, 2 … up to " + (n - 1) + ". That looks like it should be " + (n - 1) + " numbers, but starting from 0 means there are exactly <b>" + n + "</b> of them.", viz: { t: "numline", min: 0, max: n, ticks: rangeVals(0, n, 1) } }; }
    if (kind === "first") { const s = rand(1, 9), e = s + rand(2, 8); return { code: "list(range(" + s + ", " + e + "))[0]", answer: s, explain: "The start value is the one place range is not sneaky — it <i>does</i> include it. Only the stop end gets excluded.<br>So the first value out is exactly <b>" + s + "</b>.", viz: { t: "numline", min: s, max: e, ticks: rangeVals(s, e, 1) } }; }
    if (kind === "last") { const s = rand(0, 10), step = pick([1, 2, 3, 4]), c = rand(3, 9); const e = s + step * c; const vals = rangeVals(s, e, step); return { code: "list(range(" + s + ", " + e + ", " + step + "))[-1]", answer: vals[vals.length - 1], explain: "range never actually reaches its stop value — it halts just before." + box("counting: " + vals.join(", ") + "\nnext would be " + (vals[vals.length - 1] + step) + ", which is not below " + e + " — so it stops") + "The final value it does reach is <b>" + vals[vals.length - 1] + "</b>, not " + e + ".", viz: { t: "numline", min: s, max: e, ticks: vals } }; }
    if (kind === "sum") { const n = rand(3, 8); const v = rangeVals(0, n, 1); return { code: "sum(range(" + n + "))", answer: v.reduce((a, b) => a + b, 0), explain: "With one number, range starts at 0 and stops before it — so " + n + " gives " + v.join(", ") + "." + box(v.join(" + ") + " = " + v.reduce((a2, b2) => a2 + b2, 0)), viz: { t: "bars", vals: v } }; }
    if (kind === "sumstep") { const s = rand(1, 4), step = rand(2, 4), c = rand(3, 5); const e = s + step * c; const v = rangeVals(s, e, step); return { code: "sum(range(" + s + ", " + e + ", " + step + "))", answer: v.reduce((a, b) => a + b, 0), explain: "First work out what range actually produces, then add those up." + box("values:  " + v.join(", ") + "\nsum:     " + v.join(" + ") + " = " + v.reduce((a2, b2) => a2 + b2, 0)), viz: { t: "bars", vals: v } }; }
    if (kind === "contains") { const s = rand(0, 4), step = pick([2, 3]), c = rand(3, 6); const e = s + step * c; const v = rangeVals(s, e, step); const inIt = random() < 0.5; const target = inIt ? pick(v) : pick(v) + 1; const has = v.indexOf(target) >= 0; return { code: target + " in range(" + s + ", " + e + ", " + step + ")", answer: has ? "True" : "False", placeholder: "True or False", inputmode: "text", explain: "<code>in</code> asks whether a value is one of the numbers range would produce." + box("range gives: " + v.join(", ") + "\nis " + target + " there?  " + (has ? "yes → True" : "no → False")) + (has ? "" : "It falls between the steps — the jumps skip straight over it."), viz: { t: "numline", min: s, max: e, ticks: v } }; }
    if (kind === "backwards") { const s = rand(8, 20), step = -pick([1, 2, 3]); const c = rand(3, 6); const e = s + step * c; const v = rangeVals(s, e, step); return { code: "len(range(" + s + ", " + e + ", " + step + "))", answer: v.length, explain: "A <b>negative step</b> counts downwards instead of up. The stop rule is the same: halt just before reaching it." + box("counting: " + v.join(", ") + "\nthat is " + v.length + " number" + (v.length === 1 ? "" : "s")), viz: { t: "numline", min: Math.min(e, s), max: Math.max(e, s), ticks: v } }; }
    if (kind === "empty") { const a = rand(5, 12), b = rand(1, a - 1); return { code: "len(range(" + a + ", " + b + "))", answer: 0, explain: "This asks range to start at " + a + " and count <i>upwards</i> until it reaches " + b + " — but " + b + " is already behind it.<br>It cannot go backwards without a negative step, so it gives up straight away and produces nothing. Length <b>0</b>, and no error.", viz: null }; }
    if (kind === "listout") { const s = rand(0, 4), step = pick([2, 3]), c = rand(3, 4); const e = s + step * c; const v = rangeVals(s, e, step); return { code: "list(range(" + s + ", " + e + ", " + step + "))[1]", answer: v[1], explain: "Two steps here. First work out what range produces, then pick a position out of it — remembering positions start at 0." + box("values:    " + v.join(", ") + "\npositions: " + v.map((_, j) => j).join(", ") + "\nposition 1 → " + v[1]), viz: { t: "numline", min: s, max: e, ticks: v } }; }

    const conf = { easy: { start: rand(0, 7), steps: [1, 2, 3], count: [3, 9] }, medium: { start: rand(0, 12), steps: [2, 3, 4, 5], count: [3, 11] }, hard: { start: rand(2, 20), steps: [3, 4, 5, 6, 7], count: [4, 13] } }[diff];
    const start = conf.start, step = pick(conf.steps), count = rand(conf.count[0], conf.count[1]);
    const stop = start + step * count, values = rangeVals(start, stop, step);
    return { code: "len(range(" + start + ", " + stop + ", " + step + "))", answer: count,
      explain: "Start at " + start + " and keep jumping " + step + " at a time, stopping <b>before</b> you reach " + stop + ":" +
        box(values.join(" → ") + "\nthat is " + count + " number" + (count === 1 ? "" : "s")) +
        "Notice " + stop + " itself never appears — range always stops just short of it. Counting what it produced gives <b>" + count + "</b>.",
      viz: { t: "numline", min: start, max: stop, ticks: values } };
  },

  indexing(diff) {
    const size = { easy: rand(3, 7), medium: rand(4, 9), hard: rand(5, 10) }[diff];
    const arr = []; for (let i = 0; i < size; i++) arr.push(rand(1, 20));
    const base = "arr = " + listLit(arr) + "\n>>> ";
    const kind = pick({
      easy: ["last", "get", "get", "first", "len"],
      medium: ["neg", "get", "len", "slicelen", "lastval", "sum2"],
      hard: ["neg", "slicelen", "negval", "sliceval", "step", "nested", "oob"]
    }[diff]);

    if (kind === "len") return { code: base + "len(arr)", answer: size, explain: "<code>len()</code> simply counts how many things are in the list. Just tally them up: <b>" + size + "</b>.<br>Worth noting this is a <i>count</i>, so it starts at 1 — unlike positions, which start at 0. That mismatch is why the last position is always len − 1.", viz: { t: "boxes", vals: arr } };
    if (kind === "first") return { code: base + "arr[0]", answer: arr[0], explain: "Position <b>0</b> is the very first item — not position 1. Read it as \"zero steps along from the start\".<br>Here that is <b>" + arr[0] + "</b>.", viz: { t: "boxes", vals: arr, hi: [0] } };
    if (kind === "last") return { code: base + "last valid index of arr?", answer: size - 1, explain: "The list has " + size + " items, but the positions are numbered from <b>0</b>, not 1." + box(arr.map(v => cell(v, 2)).join("") + "\n" + arr.map((_, j) => cell(j, 2)).join("")) + "So they run 0 to <b>" + (size - 1) + "</b>. The rule to remember: <b>last position = length − 1</b>. Asking for arr[" + size + "] would crash.", viz: { t: "boxes", vals: arr, hi: [size - 1] } };
    if (kind === "neg") return { code: base + "arr[-2] is the same as which index?", answer: size - 2, explain: "Two ways to name the same spot. Counting forwards from 0, or backwards from -1." + box(arr.map(v => cell(v, 3)).join("") + "\n" + arr.map((_, j) => cell(j, 3)).join("") + "\n" + arr.map((_, j) => cell("-" + (size - j), 3)).join("")) + "-2 is the second from the end, which lines up with position <b>" + (size - 2) + "</b>.", viz: { t: "boxes", vals: arr, hi: [size - 2] } };
    if (kind === "lastval") return { code: base + "arr[-1]", answer: arr[size - 1], explain: "<code>[-1]</code> always means the last item, however long the list is. You never need to know the length to reach the end.<br>Here that is <b>" + arr[size - 1] + "</b>.", viz: { t: "boxes", vals: arr, hi: [size - 1] } };
    if (kind === "negval") { const k = rand(2, Math.min(4, size)); return { code: base + "arr[-" + k + "]", answer: arr[size - k], explain: "Negative positions count backwards: -1 is last, -2 is next-to-last, and so on." + box(arr.map(v => cell(v, 3)).join("") + "\n" + arr.map((_, j) => cell("-" + (size - j), 3)).join("")) + "So <code>[-" + k + "]</code> is <b>" + arr[size - k] + "</b>.", viz: { t: "boxes", vals: arr, hi: [size - k] } }; }
    if (kind === "slicelen") { const a = rand(0, size - 2), b = rand(a + 1, size); return { code: base + "len(arr[" + a + ":" + b + "])", answer: b - a, explain: "A slice runs from the first number up to <b>but not including</b> the second.<br>So you do not need to look at the items at all — the count is just " + b + " − " + a + " = <b>" + (b - a) + "</b>.", viz: { t: "boxes", vals: arr, range: [a, b] } }; }
    if (kind === "sliceval") { const a = rand(0, size - 2); return { code: base + "arr[" + a + ":" + (a + 2) + "][0]", answer: arr[a], explain: "A slice makes a <b>new</b> list, and the new one starts its own numbering at 0 again.<br>The slice begins at position " + a + " of the original, so its position 0 holds what used to be at " + a + " — that is <b>" + arr[a] + "</b>.", viz: { t: "boxes", vals: arr, range: [a, a + 2] } }; }
    if (kind === "step") { const picked = arr.filter((_, i) => i % 2 === 0); return { code: base + "len(arr[::2])", answer: picked.length, explain: "<code>[::2]</code> means \"the whole list, in jumps of 2\" — so it takes positions 0, 2, 4 and so on, skipping every other one." + box(arr.map((v, j) => cell(j % 2 === 0 ? v : "·", 3)).join("")) + "That is <b>" + picked.length + "</b> items.", viz: { t: "boxes", vals: arr, hi: arr.map((_, i) => i).filter(i => i % 2 === 0) } }; }
    if (kind === "sum2") return { code: base + "arr[0] + arr[1]", answer: arr[0] + arr[1], explain: "Pull out two items by their positions, then add them like ordinary numbers.<br><code>arr[0]</code> is " + arr[0] + " and <code>arr[1]</code> is " + arr[1] + " — remember, those are the <i>first two</i>, because counting starts at 0.<br>" + arr[0] + " + " + arr[1] + " = <b>" + (arr[0] + arr[1]) + "</b>.", viz: { t: "boxes", vals: arr, hi: [0, 1] } };
    if (kind === "nested") { const r = rand(0, 1), c = rand(0, 1); const g = [[rand(1, 9), rand(1, 9)], [rand(1, 9), rand(1, 9)]]; return { code: "grid = [" + g.map(listLit).join(", ") + "]\n>>> grid[" + r + "][" + c + "]", answer: g[r][c], explain: "A list can hold other lists — a grid. Two positions in a row means \"which row, then which item in it\"." + box("grid[" + r + "]     → " + listLit(g[r]) + "   picks the row\n" + listLit(g[r]) + "[" + c + "]  → " + g[r][c] + "   picks inside it") + "Both still count from 0, so <code>grid[0][0]</code> is the very top-left.", viz: { t: "grid2d", w: 2, h: 2, from: [0, 0], to: [c, 1 - r] } }; }
    if (kind === "oob") return { code: base + "highest index you can use?", answer: size - 1, explain: "The list has " + size + " items, numbered from 0. So the numbering runs 0, 1, 2 … up to <b>" + (size - 1) + "</b>.<br>Reaching for arr[" + size + "] asks for an item that does not exist and Python stops with an IndexError. The rule: <b>highest position = length − 1</b>.", viz: { t: "boxes", vals: arr, hi: [size - 1] } };

    const k = rand(0, size - 1);
    return { code: base + "arr[" + k + "]", answer: arr[k],
      explain: "Positions start at <b>0</b>, so the numbers do not match up with \"first, second, third\"." + box(arr.map(v => cell(v, 2)).join("") + "\n" + arr.map((_, j) => cell(j, 2)).join("")) + "Position " + k + " holds <b>" + arr[k] + "</b> — the " + (k + 1) + (k === 0 ? "st" : k === 1 ? "nd" : k === 2 ? "rd" : "th") + " item along.",
      viz: { t: "boxes", vals: arr, hi: [k] } };
  },

  stats(diff) {
    const kind = pick({
      easy: ["sum", "sum", "max", "min", "len", "count"],
      medium: ["sum", "max", "min", "mean", "len", "spread", "sorted"],
      hard: ["mean", "spread", "sorted", "median", "sumslice", "maxminus", "rounded"]
    }[diff]);
    const size = diff === "easy" ? rand(3, 4) : diff === "medium" ? rand(4, 5) : rand(5, 6);
    const arr = []; for (let i = 0; i < size; i++) arr.push(rand(2, diff === "easy" ? 9 : 20));

    if (kind === "sum") return { code: "sum(" + listLit(arr) + ")", answer: arr.reduce((a, b) => a + b, 0), explain: "<code>sum()</code> adds up everything in the list for you, so you do not have to write a loop." + box(arr.join(" + ") + " = " + arr.reduce((a2, b2) => a2 + b2, 0)), viz: { t: "bars", vals: arr } };
    if (kind === "max") return { code: "max(" + listLit(arr) + ")", answer: Math.max.apply(null, arr), explain: "<code>max()</code> scans the whole list and hands back the largest thing it found.<br>Looking through " + arr.join(", ") + ", the biggest is <b>" + Math.max.apply(null, arr) + "</b>.", viz: { t: "bars", vals: arr, kind: "max" } };
    if (kind === "min") return { code: "min(" + listLit(arr) + ")", answer: Math.min.apply(null, arr), explain: "<code>min()</code> is max's twin — it hands back the smallest.<br>Looking through " + arr.join(", ") + ", the smallest is <b>" + Math.min.apply(null, arr) + "</b>.", viz: { t: "bars", vals: arr, kind: "min" } };
    if (kind === "len") return { code: "len(" + listLit(arr) + ")", answer: size, explain: "<code>len()</code> counts the items — it does not care what they are or how big they are, just how many.<br>Count them up: <b>" + size + "</b>.", viz: { t: "bars", vals: arr } };
    if (kind === "count") { const v = pick(arr); const withDup = arr.concat([v]); const c = withDup.filter(x => x === v).length; return { code: listLit(withDup) + ".count(" + v + ")", answer: c, explain: "<code>.count()</code> walks the list and tallies how many times that exact value shows up.<br>" + v + " turns up <b>" + c + "</b> times.", viz: { t: "bars", vals: withDup } }; }
    if (kind === "spread") return { code: "max(" + listLit(arr) + ") - min(" + listLit(arr) + ")", answer: Math.max.apply(null, arr) - Math.min.apply(null, arr), explain: "The <b>spread</b> tells you how far apart the extremes are — one number describing how varied the data is." + box("biggest:   " + Math.max.apply(null, arr) + "\nsmallest:  " + Math.min.apply(null, arr) + "\nspread:    " + Math.max.apply(null, arr) + " − " + Math.min.apply(null, arr) + " = " + (Math.max.apply(null, arr) - Math.min.apply(null, arr))), viz: { t: "bars", vals: arr, kind: "spread" } };
    if (kind === "sorted") { const s = arr.slice().sort((a, b) => a - b); return { code: "sorted(" + listLit(arr) + ")[0]", answer: s[0], explain: "<code>sorted()</code> hands back a new list in order, smallest first: " + s.join(", ") + ".<br>Taking <code>[0]</code> grabs the front of it, which is <b>" + s[0] + "</b> — the same answer <code>min()</code> would give, just the long way round.", viz: { t: "bars", vals: arr, kind: "min" } }; }
    if (kind === "median") { const odd = arr.length % 2 === 1 ? arr.slice() : arr.slice(0, arr.length - 1); const s = odd.slice().sort((a, b) => a - b); const at = (s.length - 1) / 2; return { code: "sorted(" + listLit(odd) + ")[" + at + "]", answer: s[at], explain: "The <b>median</b> is the value sitting in the middle once everything is lined up in order." + box("sorted:  " + s.join(", ") + "\nmiddle:  position " + at + " → " + s[at]) + "Unlike the average, one freakishly large value cannot drag it around.", viz: { t: "bars", vals: odd } }; }
    if (kind === "sumslice") { const part = arr.slice(0, 3); return { code: "sum(" + listLit(arr) + "[:3])", answer: part.reduce((a, b) => a + b, 0), explain: "<code>[:3]</code> slices off the first three items — positions 0, 1 and 2 — before anything gets added." + box(part.join(" + ") + " = " + part.reduce((a2, b2) => a2 + b2, 0)), viz: { t: "bars", vals: arr } }; }
    if (kind === "maxminus") return { code: "max(" + listLit(arr) + ") - 1", answer: Math.max.apply(null, arr) - 1, explain: "Two steps. Find the biggest first, then subtract." + box("max: " + Math.max.apply(null, arr) + "\nthen: " + Math.max.apply(null, arr) + " − 1 = " + (Math.max.apply(null, arr) - 1)), viz: { t: "bars", vals: arr, kind: "max" } };
    if (kind === "rounded") { const a2 = arr.slice(0, 4); const sum = a2.reduce((a, b) => a + b, 0); return { code: "sum(" + listLit(a2) + ") // len(" + listLit(a2) + ")", answer: Math.floor(sum / a2.length), explain: "An average, but with <code>//</code> instead of <code>/</code>, so any decimal gets chopped off rather than rounded." + box(sum + " ÷ " + a2.length + " = " + (Math.round(sum / a2.length * 100) / 100) + "\nchop the decimals → " + Math.floor(sum / a2.length)), viz: { t: "bars", vals: a2, mean: sum / a2.length } }; }

    const a3 = arr.slice(0, Math.min(4, arr.length));
    let sum = a3.reduce((a, b) => a + b, 0);
    const rem = sum % a3.length;
    if (rem !== 0) { a3[0] += a3.length - rem; sum += a3.length - rem; }
    return { code: "sum(" + listLit(a3) + ") / len(" + listLit(a3) + ")", answer: sum / a3.length,
      explain: "There is no <code>average()</code> in Python — you build one from two pieces you already know." + box("sum(...)  =  " + sum + "        the total\nlen(...)  =  " + a3.length + "         how many\n" + sum + " ÷ " + a3.length + "  =  " + (sum / a3.length)) + "Total divided by how many. That is all an average is.",
      viz: { t: "bars", vals: a3, mean: sum / a3.length } };
  },

  coordinates(diff) {
    const kind = pick({
      easy: ["move", "move", "single", "distance"],
      medium: ["move", "single", "distance", "steps", "mirror"],
      hard: ["wrap", "wrap", "distance", "steps", "mirror", "diag"]
    }[diff]);

    if (kind === "single") { const x = rand(0, 9), dx = rand(1, 6); return { code: "x = " + x + "\n>>> x += " + dx + "\n>>> x", answer: x + dx, explain: "<code>+=</code> is pure shorthand. <code>x += " + dx + "</code> means exactly <code>x = x + " + dx + "</code> — take what is in x, add " + dx + ", put it back.<br>" + x + " + " + dx + " = <b>" + (x + dx) + "</b>.", viz: { t: "numline", min: 0, max: x + dx, base: x, to: x + dx } }; }
    if (kind === "distance") { const a = rand(0, 9), b = rand(0, 9); return { code: "abs(" + a + " - " + b + ")", answer: Math.abs(a - b), explain: "<code>abs()</code> throws away any minus sign — it answers \"how far apart\", never \"which direction\".<br>" + a + " − " + b + " = " + (a - b) + ", and stripping the sign gives <b>" + Math.abs(a - b) + "</b>. Distance is never negative.", viz: { t: "numline", min: Math.min(a, b), max: Math.max(a, b) || 1, base: a, to: b } }; }
    if (kind === "steps") { const w = pick([4, 5, 6]); const n = rand(6, 20); return { code: "# " + w + " steps per row\n>>> " + n + " // " + w + ", " + n + " % " + w, answer: Math.floor(n / w) + "," + (n % w), placeholder: "row, col", inputmode: "text", explain: "Two operators split one number into a grid position." + box(n + " // " + w + " = " + Math.floor(n / w) + "   how many full rows fit → the row\n" + n + " %  " + w + " = " + (n % w) + "   what is left over → the column") + "So step " + n + " sits at <b>row " + Math.floor(n / w) + ", column " + (n % w) + "</b>. This is how any list gets laid out as a grid.", viz: { t: "grid2d", w: w, h: Math.floor(n / w) + 1, from: [0, 0], to: [n % w, 0] } }; }
    if (kind === "mirror") { const w = pick([6, 8, 10]); const x = rand(0, w - 1); return { code: "# grid " + w + " wide\n>>> " + (w - 1) + " - " + x, answer: w - 1 - x, explain: "Flipping left-to-right: whatever distance a column sits from one edge, its mirror sits the same distance from the other.<br>Columns run 0 to " + (w - 1) + ", so the mirror of " + x + " is " + (w - 1) + " − " + x + " = <b>" + (w - 1 - x) + "</b>.", viz: { t: "grid2d", w: w, h: 2, from: [x, 1], to: [w - 1 - x, 0] } }; }
    if (kind === "diag") { const n = rand(2, 6); return { code: "x, y = 0, 0\n>>> " + n + " times: x += 1 and y += 1\n>>> (x, y)?", answer: n + "," + n, placeholder: "x, y", inputmode: "text", explain: "Each pass adds 1 to x and 1 to y, so they climb together and stay equal — a perfect diagonal.<br>After " + n + " passes both have grown by " + n + ", landing on <b>(" + n + ", " + n + ")</b>.", viz: { t: "grid2d", w: n + 1, h: n + 1, from: [0, 0], to: [n, n] } }; }
    if (kind === "wrap") { const w = pick([5, 6, 7, 8, 9, 10, 12]), h = pick([5, 6, 7, 8, 9, 10, 12]); const x = rand(0, w - 1), y = rand(0, h - 1), dx = rand(3, w + 2), dy = rand(3, h + 2); return { code: "# grid " + w + "x" + h + " wraps\n>>> x, y = " + x + ", " + y + "\n>>> x += " + dx + "\n>>> y += " + dy + "\n>>> (x, y)?", answer: ((x + dx) % w) + "," + ((y + dy) % h), placeholder: "x, y", inputmode: "text", explain: "Walk off an edge and you reappear on the opposite side. <code>%</code> does the wrapping for both directions at once." + box("x:  " + x + " + " + dx + " = " + (x + dx) + "   then " + (x + dx) + " % " + w + " = " + ((x + dx) % w) + "\ny:  " + y + " + " + dy + " = " + (y + dy) + "   then " + (y + dy) + " % " + h + " = " + ((y + dy) % h)) + "Landing on <b>(" + ((x + dx) % w) + ", " + ((y + dy) % h) + ")</b>. Exactly how Pac-Man crosses the screen.", viz: { t: "grid2d", w: w, h: h, from: [x, y], to: [(x + dx) % w, (y + dy) % h] } }; }

    const x = rand(0, 7), y = rand(0, 7), dx = rand(1, 5), dy = rand(1, 5);
    const down = diff !== "easy" && random() < 0.5 && y >= dy;
    const ny = down ? y - dy : y + dy;
    return { code: "x, y = " + x + ", " + y + "\n>>> x += " + dx + "\n>>> y " + (down ? "-=" : "+=") + " " + dy + "\n>>> (x, y)?",
      answer: (x + dx) + "," + ny, placeholder: "x, y", inputmode: "text",
      explain: "A position is two numbers: <b>x</b> is how far across, <b>y</b> is how far up. Move by changing them one at a time." + box("x:  " + x + " + " + dx + " = " + (x + dx) + "\ny:  " + y + " " + (down ? "− " + dy : "+ " + dy) + " = " + ny) + "New position: <b>(" + (x + dx) + ", " + ny + ")</b>.",
      viz: { t: "grid2d", w: x + dx + 1, h: Math.max(y, ny) + 1, from: [x, y], to: [x + dx, ny] } };
  }
};
