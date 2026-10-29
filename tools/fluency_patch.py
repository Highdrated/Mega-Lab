import sys

LIMIT_JS = 'const LIMIT = { predict: 10000, pick: 10000, fill: 8000, bug: 12000, build: 20000, order: 20000, trace: 30000 };'

FLU_JS = r'''
function fluencyOf(L) {
  let n = 0, bad = 0, slow = 0;
  L.qs.forEach((q, i) => { const f = S.flu[`${L.id}:${i}`]; if (!f) return; n++; if (!f.ok) bad++; else if (f.t > (LIMIT[q.t] || 10000)) slow++; });
  if (n < 3) return null;
  if (bad) return "shaky";
  if (slow / n > 0.3) return "slow";
  return "fluent";
}
function gateRecall(q, box) {
  R.t0 = performance.now();
  const ch = box.querySelector("#ch");
  if (!S.recall || !ch || !["predict", "pick", "fill"].includes(q.t)) return;
  ch.classList.add("hide");
  const b = document.createElement("button");
  b.className = "reveal";
  b.innerHTML = `<b>${q.t === "fill" ? "Think of the missing piece" : "Think of the answer"}</b><span>then tap to show options</span>`;
  ch.before(b);
  b.onclick = () => { b.remove(); ch.classList.remove("hide"); };
}
function paintRecall() { $("recallBtn").textContent = S.recall ? "recall on" : "recall off"; $("recallBtn").classList.toggle("on", !!S.recall); }
$("recallBtn").onclick = () => { S.recall = !S.recall; save(); paintRecall(); toast(S.recall ? "Options stay hidden until you have an answer in mind" : "Options show straight away"); };
'''

CSS = '''.reveal { width: 100%; min-height: 64px; margin-top: 12px; border: 1px dashed var(--accent); border-radius: 11px; background: color-mix(in srgb, var(--accent) 7%, var(--panel)); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.reveal b { font-family: var(--serif); font-weight: 500; font-size: 16px; }
.reveal span { font-family: var(--mono); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.hide { display: none !important; }
.chipbtn.on { border-color: var(--accent); color: var(--text); }
.step .st.fluent { color: var(--good); }
.step .st.slow { color: var(--warn); }
.step .st.shaky { color: var(--bad); }
.step.done .st { color: var(--good); }'''


def patch(path):
    s = open(path).read()

    def R(a, b, cnt=1):
        nonlocal s
        n = s.count(a)
        assert n == cnt, (path, a[:60], n)
        s = s.replace(a, b)

    R('.step.done .st { color: var(--good); }', CSS)
    R('<button class="chipbtn" id="themeBtn">orbital</button>', '<button class="chipbtn" id="recallBtn">recall on</button>\n    <button class="chipbtn" id="themeBtn">orbital</button>')
    R('srs: {}, streak: { day: 0, n: 0 }, welcomed: false };\ntry {', 'srs: {}, streak: { day: 0, n: 0 }, welcomed: false, recall: true, flu: {} };\ntry {')
    R('srs: {}, streak: { day: 0, n: 0 }, welcomed: false };\n  save(); goHome();', 'srs: {}, streak: { day: 0, n: 0 }, welcomed: false, recall: S.recall, flu: {} };\n  save(); goHome();')
    R('const DAY = 864e5;', 'const DAY = 864e5;\n' + LIMIT_JS)
    R('\n}\n\nfunction answer(good, why, extra) {', '\n  gateRecall(q, box);\n}\n\nfunction answer(good, why, extra) {')
    R('''  const t = today(), s = S.srs[it.k];
  if (!good) S.srs[it.k]''', '''  const t = today(), s = S.srs[it.k];
  const dt = Math.round(performance.now() - (R.t0 || performance.now())), slow = good && dt > (LIMIT[it.q.t] || 10000);
  S.flu = S.flu || {}; S.flu[it.k] = { ok: good, t: dt };
  if (slow) { S.srs[it.k] = { box: s ? s.box : 0, due: t + 2 * DAY, miss: s ? s.miss : 0, slow: true }; why = why + ` Right, but it took ${Math.round(dt / 1000)}s. It comes back soon to get faster.`; }
  else if (!good) S.srs[it.k]''')
    R('''  else if (s) { const b = Math.min''', '''  else if (s && !slow) { const b = Math.min''')
    R('done: `${S.best[L.id] || 0}/5` }[st];', 'done: fluencyOf(L) || `${S.best[L.id] || 0}/5` }[st];\n    const fc = st === "done" ? (fluencyOf(L) || "") : "";')
    R('<span class="st">${lbl}</span>', '<span class="st ${fc}">${lbl}</span>')
    R('$("pathCount").textContent = `${done}/${DATA.length}`;', 'const fl = DATA.filter((L) => S.passed[L.id] && fluencyOf(L) === "fluent").length;\n  $("pathCount").textContent = fl ? `${fl} fluent · ${done}/${DATA.length}` : `${done}/${DATA.length}`;')
    R('\nfunction paintPath() {', FLU_JS + '\nfunction paintPath() {')
    R('S.theme : "orbital");\ngoHome();', 'S.theme : "orbital");\npaintRecall();\ngoHome();')
    open(path, "w").write(s)
    print("patched", path)


for p in sys.argv[1:]:
    patch(p)
