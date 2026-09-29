const VERSION = "v0.26.4";
const BASE = "https://cdn.jsdelivr.net/pyodide/" + VERSION + "/full/";

let pyodide = null;
let loading = null;

export const isReady = () => pyodide !== null;

export function boot() {
  if (pyodide) return Promise.resolve(pyodide);
  if (loading) return loading;
  loading = import(BASE + "pyodide.mjs")
    .then(m => m.loadPyodide({ indexURL: BASE }))
    .then(py => { pyodide = py; loading = null; return py; })
    .catch(err => { loading = null; throw err; });
  return loading;
}

function pyLiteral(v) {
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "boolean") return v ? "True" : "False";
  if (v === null || v === undefined) return "None";
  return String(v);
}

const CHECK = [
  "def __modle_same(got, want):",
  "    if isinstance(want, bool):",
  "        return isinstance(got, bool) and got == want",
  "    if isinstance(want, float) and isinstance(got, (int, float)) and not isinstance(got, bool):",
  "        return abs(got - want) < 1e-9",
  "    if isinstance(want, int) and isinstance(got, (int, float)) and not isinstance(got, bool):",
  "        return got == want",
  "    return type(got) is type(want) and got == want",
  ""
].join("\n");

export function buildHarness(userCode, tests) {
  const cases = tests.map(t =>
    "    (" + JSON.stringify(t.call) + ", lambda: (" + t.call + "), " + pyLiteral(t.expect) + "),"
  ).join("\n");

  const harness = [
    userCode,
    "",
    "import json as __modle_json",
    "import traceback as __modle_tb",
    CHECK,
    "__modle_cases = [",
    cases,
    "]",
    "__modle_out = []",
    "for __label, __fn, __want in __modle_cases:",
    "    try:",
    "        __got = __fn()",
    "        __modle_out.append({'call': __label, 'got': repr(__got), 'want': repr(__want), 'ok': bool(__modle_same(__got, __want))})",
    "    except Exception as __e:",
    "        __modle_out.append({'call': __label, 'got': type(__e).__name__ + ': ' + str(__e), 'want': repr(__want), 'ok': False})",
    "__modle_json.dumps(__modle_out)"
  ].join("\n");

  return harness;
}

export async function runTests(userCode, tests) {
  const py = await boot();
  const harness = buildHarness(userCode, tests);
  try {
    const out = await py.runPythonAsync(harness);
    return { ok: true, results: JSON.parse(out) };
  } catch (e) {
    const msg = String((e && e.message) || e);
    const lines = msg.trim().split("\n");
    return { ok: false, error: lines.slice(-4).join("\n") };
  }
}
