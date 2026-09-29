import { P } from "../core/profile.js";
import { catList } from "../core/catalog.js";

const L = {
  basics: { op: "the four operators", var: "one variable", var2: "two variables", floordiv: "floor division //", unary: "negative start", precedence: "× before +", paren: "brackets first", chain: "+= and *= chains", mixed: "− with × mixed" },
  powers: { basic: "powers", square: "squares", zero: "power of 0", one: "power of 1", two: "powers of 2", three: "odd bases", digits: "digits in 10 ** n", expadd: "adding exponents", sumsq: "sum of squares", cube: "cubes", ten: "powers of 10", sqrt: "** 0.5 roots", expsub: "subtracting exponents", compare: "a**b vs b**a", diffsq: "difference of squares", nested: "power of a power", neg: "negative exponent", mask: "2 ** n − 1" },
  binary: { read: "reading binary", write: "writing binary", ones: "counting 1 bits", place: "slot values", add: "adding binary", power: "1 followed by 0s", mask: "all ones", double: "<< shift" },
  strings: { len: "len()", char: "s[i]", count: ".count()", upper: ".upper() length", in: "in", concat: "+ joining", repeat: "* repeating", first: "s[0]", last: "s[-1]", slicelen: "slice length", index: ".index()", replace: ".replace()", split: ".split()", startswith: ".startswith()", negchar: "negative index", find: ".find() miss", slice: "slices", negslice: "tail slices", join: ".join()", strip: ".strip()", two: "two-char slice", stepslice: "[::2] steps" },
  webmath: { pages: "pagination ceil", rows: "rows needed", discount: "discounts", percent: "percentages", total: "totals", vat: "21% VAT", leftover: "leftover items", grid: "grid cells", ratio: "image scaling" },
  modulo: { rem: "remainders", even: "odd / even", smaller: "small % big", zero: "clean division", clock: "12-hour clock", everyn: "every nth", lastdigit: "last digit", negative: "negative modulo", wrap: "wrap-around loop", divmod: "// and % pair" },
  ranges: { count: "range length", simple: "range(n)", last: "last value", first: "first value", sum: "sum(range)", contains: "in range", listout: "picking from range", backwards: "negative step", sumstep: "stepped sums", empty: "empty ranges" },
  indexing: { get: "arr[i]", last: "last index", first: "arr[0]", len: "len(arr)", neg: "negative ↔ positive", slicelen: "slice length", lastval: "arr[-1]", sum2: "adding items", negval: "negative index", sliceval: "slice then index", step: "[::2] steps", nested: "grid[r][c]", oob: "highest index" },
  stats: { mean: "averages", sum: "sum()", max: "max()", min: "min()", len: "len()", count: ".count()", spread: "spread", sorted: "sorted()[0]", median: "median", sumslice: "sum of a slice", maxminus: "max − 1", rounded: "average with //" },
  coordinates: { move: "moving x, y", single: "x += n", distance: "abs() distance", steps: "index → row, col", mirror: "mirroring", wrap: "wrapping grid", diag: "diagonals" },
  cycles: { listwrap: "c[i % len(c)]", weekday: "days of the week", zigzag: "zig-zag rows", nextidx: "next turn", wrapleft: "wrap left past 0", hours: "24-hour clock", minutes: "minutes → h, m", tens: "tens digit", toindex: "row, col → index", together: "when timers meet", both: "every a AND every b" },
  rounding: { int: "int() chops", round: "round()", roundnd: "round(x, 2)", ceil: "ceil()", bankers: "round(.5) to even", negfloor: "negative //", negint: "int() of negatives", ceiltrick: "-(-a // b) round up", roundneg: "round() negatives", divmodneg: "divmod negatives", floatsum: "float == trap", roundten: "round(n, -k)", percent: "rounded percentages" },
  subnets: { hosts: "usable hosts", size: "addresses in /n", block: "block size", octet: "mask number", network: "network address", offset: "position in block", broadcast: "broadcast address", prefixfor: "prefix for n hosts", and: "& with a mask", count: "subnets in a subnet", same: "same subnet?", nth: "nth subnet" }
};

export const catName = (cat) => { const c = catList.find(x => x[0] === cat); return c ? c[1] : cat; };
export const kindLabel = (cat, kind) => (L[cat] && L[cat][kind]) || kind;
export const typeKey = (cat, kind) => "k:" + cat + ":" + kind;
export const isTypeKey = (k) => k.startsWith("k:");
export const typeKeys = () => Object.keys(P.srs).filter(isTypeKey);

export function weakSpots(n) {
  return typeKeys()
    .map(k => { const b = k.split(":"); const s = P.srs[k]; return { key: k, cat: b[1], kind: b[2], lapses: s.lapses || 0, interval: s.interval || 0, due: s.due, diff: s.diff || "medium" }; })
    .filter(w => w.interval < 16)
    .sort((a, b) => (b.lapses - a.lapses) || (a.interval - b.interval))
    .slice(0, n || 6);
}
