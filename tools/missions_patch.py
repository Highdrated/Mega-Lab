import sys

CSS = '''.mcard h3 { font-family: var(--serif); font-weight: 500; font-size: 22px; margin: 4px 0 6px; }
.mcard .kicker { font-family: var(--mono); font-size: 11px; color: var(--accent); letter-spacing: .12em; text-transform: uppercase; display: flex; justify-content: space-between; gap: 8px; }
.mcard .goal { font-size: 15px; line-height: 1.5; margin: 0 0 10px; }
.mcard .safe { display: inline-block; font-family: var(--mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--good); border: 1px solid var(--good); border-radius: 999px; padding: 2px 8px; margin-bottom: 8px; }
.msteps { display: grid; gap: 6px; margin: 6px 0 10px; }
.mstep { display: grid; grid-template-columns: 26px 1fr; gap: 10px; align-items: start; text-align: left; background: var(--panel2); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; font-size: 14px; line-height: 1.45; }
.mstep i { width: 22px; height: 22px; border-radius: 6px; border: 1.5px solid var(--line); display: grid; place-items: center; font-style: normal; font-family: var(--mono); font-size: 11px; color: var(--muted); }
.mstep.on { border-color: var(--good); }
.mstep.on i { background: var(--good); border-color: var(--good); color: var(--panel); }
.mstep code, .mhint code, .mcard .goal code { font-family: var(--mono); background: var(--panel); padding: 1px 5px; border-radius: 4px; font-size: .92em; }
.mhint { margin: 6px 0; font-size: 13px; line-height: 1.5; }
.mhint button { border: 1px dashed var(--line); background: none; border-radius: 9px; padding: 8px 12px; font-size: 12px; font-family: var(--mono); color: var(--muted); width: 100%; text-align: left; }
.mexpect { margin-top: 10px; }
.mexpect .lbl { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); font-weight: 600; margin-bottom: 4px; }
.mexpect pre { margin: 0; background: var(--term-bg); color: var(--term-text); border-radius: 10px; padding: 10px 12px; font-family: var(--mono); font-size: 13px; white-space: pre-wrap; word-break: break-word; line-height: 1.5; }
.step .mtag { color: var(--good); }'''

SCREEN = '''  <section class="screen" id="mission">
    <div class="drillhead"><button class="quit" id="missionBack">‹ path</button><span>field mission</span><span></span></div>
    <div class="card mcard" id="missionBody"></div>
    <div class="spacer16"></div>
    <button class="next on" id="missionDone">Mission done</button>
  </section>

  <section class="screen" id="notes">'''

JS = r'''
function missionOf(i) { return MISSIONS[DATA[i].id] || null; }
function openMission(i) {
  const L = DATA[i], M = missionOf(i);
  if (!M) return;
  S.mtick = S.mtick || {}; S.missions = S.missions || {};
  const ticks = S.mtick[L.id] = S.mtick[L.id] || M.steps.map(() => false);
  const done = !!S.missions[L.id];
  show("mission");
  $("missionBack").onclick = goHome;
  const paint = () => {
    $("missionBody").innerHTML = `<div class="kicker"><span>lesson ${i + 1} · ${esc(L.title)}</span><span>${done ? "done" : "+40 xp"}</span></div>
      <h3>${esc(M.title)}</h3>${M.safe ? `<span class="safe">read-only / -WhatIf</span>` : ""}
      <div class="goal">${inline(M.goal)}</div>
      <div class="ticket"><span>where</span><span>${esc(M.where)}</span></div>
      <div class="msteps">${M.steps.map((s, j) => `<button class="mstep${ticks[j] ? " on" : ""}" data-j="${j}"><i>${ticks[j] ? "ok" : j + 1}</i><span>${inline(s)}</span></button>`).join("")}</div>
      ${(M.hints || []).map((h, j) => `<div class="mhint" data-h="${j}"><button>Hint ${j + 1}</button></div>`).join("")}
      <div class="mexpect"><div class="lbl">you should see</div><pre>${esc(M.expect)}</pre></div>`;
    $("missionBody").querySelectorAll(".mstep").forEach((b) => (b.onclick = () => { ticks[+b.dataset.j] = !ticks[+b.dataset.j]; save(); paint(); }));
    $("missionBody").querySelectorAll(".mhint").forEach((h) => (h.querySelector("button").onclick = () => { h.innerHTML = inline(M.hints[+h.dataset.h]); }));
    const all = ticks.every(Boolean);
    $("missionDone").textContent = done ? "Back to path" : all ? "Mission done" : `Tick all ${M.steps.length} steps`;
    $("missionDone").disabled = !done && !all;
  };
  $("missionDone").onclick = () => {
    if (!S.missions[L.id]) { S.missions[L.id] = true; bumpStreak(); addXp(40); toast("Mission done. +40 xp"); }
    goHome();
  };
  paint();
}
'''


def patch(path):
    s = open(path).read()

    def R(a, b, cnt=1):
        nonlocal s
        n = s.count(a)
        assert n == cnt, (path, a[:70], n)
        s = s.replace(a, b)

    R('.step .st.fluent {', CSS + '\n.step .st.fluent {')
    R('  <section class="screen" id="notes">', SCREEN)
    R('const DATA = __DATA__;', 'const DATA = __DATA__;\nconst MISSIONS = __MISSIONS__;')
    R('''<div class="acts" style="grid-template-columns:1fr 1fr"><button class="btn" id="rl">Reread</button><button class="btn main" id="rp">Practice 5</button></div>`;''',
      '''<div class="acts" style="grid-template-columns:1fr 1fr"><button class="btn" id="rl">Reread</button><button class="btn main" id="rp">Practice 5</button></div>${missionOf(i) ? `<div class="acts" style="grid-template-columns:1fr"><button class="btn${S.missions && S.missions[L.id] ? "" : " main"}" id="rm">${S.missions && S.missions[L.id] ? "Field mission (done)" : "Field mission · on your Mac"}</button></div>` : ""}`;
  if ($("rm")) $("rm").onclick = () => openMission(i);''')
    R('<small>${esc(L.sub)}</small>', '<small>${esc(L.sub)}${S.missions && S.missions[L.id] ? ` · <span class="mtag">mission done</span>` : ""}</small>')
    R('''  $("againBtn").textContent = passedNow ? `Next: ${DATA[R.li + 1].title}` : "Again";''',
      '''  $("againBtn").textContent = passedNow ? `Next: ${DATA[R.li + 1].title}` : "Again";
  const mi = R.mode === "practice" && S.passed[DATA[R.li].id] && missionOf(R.li) && !(S.missions && S.missions[DATA[R.li].id]) ? R.li : -1;
  $("homeBtn").textContent = mi >= 0 ? "Field mission · on your Mac" : "Back to path";
  $("homeBtn").onclick = mi >= 0 ? () => openMission(mi) : goHome;''')
    R('\nfunction paintPath() {', JS + '\nfunction paintPath() {')
    open(path, "w").write(s)
    print("patched", path)


for p in sys.argv[1:]:
    patch(p)
