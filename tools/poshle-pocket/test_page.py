import sys, subprocess, time
from playwright.sync_api import sync_playwright

ROOT = "/home/claude/mega-lab"
SHOTS = sys.argv[1] if len(sys.argv) > 1 else "/tmp"
PAGE = sys.argv[2] if len(sys.argv) > 2 else "poshle-pocket.html"
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8766", "-d", ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1243/chrome-linux64/chrome")
        pg = b.new_page(viewport={"width": 390, "height": 844})
        pg.on("pageerror", lambda e: errs.append("pageerror " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "serviceWorker" not in m.text and errs.append("console " + m.text))
        pg.goto("http://127.0.0.1:8766/labs/" + PAGE)
        pg.evaluate("localStorage.clear()"); pg.reload()
        n = pg.evaluate("DATA.length")
        print("lessons", n, "questions", pg.evaluate("DATA.reduce((a,L)=>a+L.qs.length,0)"))
        pg.screenshot(path=SHOTS + "/pp-home.png", full_page=True)

        pg.click("#nextUp")
        cards = pg.evaluate("DATA[0].cards.length")
        for k in range(cards):
            if pg.evaluate(f"!!DATA[0].cards[{k}].check"):
                a = pg.evaluate(f"DATA[0].cards[{k}].check.a")
                pg.click(f"#cc .choice >> nth={a}")
            if k == 1: pg.screenshot(path=SHOTS + "/pp-lesson.png", full_page=True)
            pg.click("#lessonNext")

        def solve():
            q = pg.evaluate("R.items[R.at].q")
            t = q["t"]
            if pg.locator(".reveal").count():
                pg.click(".reveal")
            if t in ("predict", "pick"):
                pg.click(f"#ch .choice >> nth={q['a']}")
            elif t == "fill":
                pg.click(f"#ch .chip >> nth={q['ok'][0]}")
            elif t == "build":
                for i in q["sol"].split(","):
                    pg.click(f"#tiles .chip[data-j='{i}']")
                pg.click("#chkB")
            elif t == "order":
                for i in q["sol"].split(","):
                    pg.click(f"#pool .lrow[data-j='{i}']")
                pg.click("#chkB")
            elif t == "trace":
                nc = len(q["cols"])
                for idx in range(len(q["rows"]) * nc):
                    val = q["rows"][idx // nc][idx % nc]
                    pg.click(f"#ch .chip >> nth={q['opts'][idx].index(val)}")
                    pg.wait_for_timeout(260)
            elif t == "bug":
                pg.click(f"#pool .lrow >> nth={q['bad']}")
            ok = pg.evaluate("R.res[R.at]")
            if ok is not True:
                errs.append(f"answered correctly but graded wrong: {t} {q}")
            return t

        seen = set()
        for i in range(5):
            seen.add(solve())
            if i == 0: pg.screenshot(path=SHOTS + "/pp-q.png", full_page=True)
            pg.click("#nextBtn")
        print("lesson 1 practice:", pg.inner_text("#resMsg"))
        if not pg.evaluate("S.passed[DATA[0].id]"): errs.append("lesson 1 not passed")

        total = 0
        for li in range(n):
            qn = pg.evaluate(f"DATA[{li}].qs.length")
            pg.evaluate(f"R = {{ mode:'daily', items: DATA[{li}].qs.map((q,i)=>({{q,k:DATA[{li}].id+':'+i}})), at:0, ok:0, res:[], misses:[] }}; runRound();")
            for qi in range(qn):
                seen.add(solve()); total += 1
                if qi < qn - 1:
                    pg.evaluate("R.at++; renderQ()")
        pg.evaluate("R = { mode:'daily', items:[{q:DATA[0].qs[0],k:DATA[0].id+':0'}], at:0, ok:0, res:[], misses:[] }; runRound(); R.t0 = performance.now() - 60000;")
        solve()
        if not pg.evaluate("S.srs[DATA[0].id+':0'] && S.srs[DATA[0].id+':0'].slow"): errs.append("slow answer not queued")
        if "took" not in pg.inner_text("#fb"): errs.append("slow feedback missing")
        pg.screenshot(path=SHOTS + "/pp-slow.png", full_page=True)
        print("rendered+solved", total, "questions; kinds", sorted(seen))
        pg.evaluate("finish()")
        pg.click("#homeBtn")
        pg.click("#themeBtn"); pg.screenshot(path=SHOTS + "/pp-verdant.png", full_page=True)
        b.close()
finally:
    srv.terminate()
print("ERRORS:\n" + "\n".join(errs[:30]) if errs else "NO ERRORS")
