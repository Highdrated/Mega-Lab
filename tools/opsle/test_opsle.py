import sys, subprocess, time
from playwright.sync_api import sync_playwright
ROOT = "/home/claude/mega-lab"; SHOTS = sys.argv[1] if len(sys.argv) > 1 else "/tmp"
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8768", "-d", ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1243/chrome-linux64/chrome")
        pg = b.new_page(viewport={"width": 390, "height": 844})
        pg.on("pageerror", lambda e: errs.append("pageerror " + str(e)))
        pg.goto("http://127.0.0.1:8768/labs/opsle.html"); pg.evaluate("localStorage.clear()"); pg.reload()
        print("missions", pg.evaluate("MISSIONS.length"), "states", pg.evaluate("MISSIONS.map(missionState).join(',')"))
        if pg.evaluate("MISSIONS.some(m => missionState(m) !== 'locked')"): errs.append("something unlocked with no progress")
        bad = pg.evaluate("MISSIONS.flatMap(m => m.stages.flatMap(s => s.needs.filter(n => !BANK[n.lab] || !BANK[n.lab].units.find(u => u.id === n.unit)).map(n => m.id+':'+n.lab+'/'+n.unit)))")
        if bad: errs.append("unknown needs " + str(bad))
        m0 = pg.evaluate("MISSIONS[0].stages[0].needs")
        samples = pg.evaluate("""(needs) => { const out = {}; for (const n of needs) { const b = BANK[n.lab]; out[n.lab] = b.sample; } return out; }""", m0)
        for lab, smp in samples.items():
            for k, v in smp.items(): pg.evaluate("([k,v]) => localStorage.setItem(k,v)", [k, v])
        pg.reload()
        print("stage 1 needs met with lab samples:", pg.evaluate("MISSIONS[0].stages[0].needs.map(needMet)"))
        pg.evaluate("""() => { const m = MISSIONS[0]; for (const n of m.stages[0].needs) { DONE[n.lab].add(n.unit); } }""")
        pg.evaluate("MISSIONS[0].stages[0].needs.forEach(n => { const b = BANK[n.lab]; const o = b.done; b.done = g => Array.from(new Set(o(g).concat([n.unit]))); })")
        pg.click(".mis >> nth=0")
        st = pg.evaluate("stageState(MISSIONS[0], 0)"); print("stage 1 state", st)
        if st != "ready": errs.append("stage 1 not ready after needs met")
        for j in range(pg.locator(".stage.open .mstep").count()): pg.click(f".stage.open .mstep >> nth={j}")
        pg.screenshot(path=SHOTS + "/opsle-stage.png", full_page=True)
        pg.click(".stage.open .sdone")
        if pg.evaluate("stageState(MISSIONS[0], 0)") != "done": errs.append("stage not done")
        print("xp", pg.evaluate("S.xp"), "stage 2:", pg.evaluate("stageState(MISSIONS[0], 1)"))
        pg.click("#backBtn"); pg.screenshot(path=SHOTS + "/opsle-home.png", full_page=True)
        b.close()
finally:
    srv.terminate()
print("ERRORS:\n" + "\n".join(errs) if errs else "NO ERRORS")
