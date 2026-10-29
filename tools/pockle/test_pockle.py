import json, sys, subprocess, time
from playwright.sync_api import sync_playwright

ROOT = "/home/claude/mega-lab"
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8765", "-d", ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
URL = "http://127.0.0.1:8765/labs/pockle.html"
errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1243/chrome-linux64/chrome")
        pg = b.new_page(viewport={"width": 390, "height": 844})
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
        pg.goto(URL); pg.evaluate("localStorage.clear()"); pg.reload()
        assert pg.is_disabled("#mixBtn"), "mix should be disabled with no progress"
        print("empty:", pg.inner_text("#welcomeTxt")[:60])
        pg.screenshot(path=sys.argv[1] + "/shot-empty.png", full_page=True)

        info = pg.evaluate("BANKS.map(b=>({id:b.id,n:b.cards.length,sample:b.sample,sd:b.sampleDone}))")
        for bk in info:
            for k, v in bk["sample"].items():
                pg.evaluate("([k,v])=>localStorage.setItem(k,v)", [k, v])
        pg.reload()
        state = pg.evaluate("LABSTATE.map(l=>[l.b.id,l.units.map(u=>u.id),l.cards.length])")
        for (lid, units, n), bk in zip(state, info):
            ok = sorted(units) == sorted(bk["sd"])
            print(f"{lid:14} unlocked {len(units):2} units {n:4} cards / {bk['n']:4}  {'ok' if ok else 'MISMATCH'}")
            if not ok: errs.append("unlock mismatch " + lid)
        pg.screenshot(path=sys.argv[1] + "/shot-home.png", full_page=True)

        pg.click("#mixBtn")
        for i in range(10):
            if i == 0: pg.screenshot(path=sys.argv[1] + "/shot-reveal.png", full_page=True)
            pg.click(".reveal")
            pg.click(".choice >> nth=0")
            if i == 0: pg.screenshot(path=sys.argv[1] + "/shot-q.png", full_page=True)
            pg.click("#nextBtn")
        assert pg.is_visible("#result"), "result not shown"
        print("mix result:", pg.inner_text("#resNum"), pg.inner_text("#resSub"))
        pg.screenshot(path=sys.argv[1] + "/shot-result.png", full_page=True)
        pg.click("#homeBtn")
        print("mistakes:", pg.inner_text("#missSub"))
        pg.click("#missBtn"); pg.click(".reveal"); pg.click(".choice >> nth=1"); pg.click("#quitBtn")
        assert pg.is_visible("#result")
        pg.click("#homeBtn")
        pg.click("#sprintBtn"); pg.click(".choice >> nth=0"); pg.wait_for_timeout(1300); pg.click(".choice >> nth=0"); pg.click("#quitBtn")
        print("sprint:", pg.inner_text("#resSub"), pg.inner_text("#resMsg"))
        pg.click("#homeBtn")
        pg.click(".lab.in .tog >> nth=0")
        print("after toggle:", pg.inner_text("#labCount"))
        print("fluency labels:", pg.evaluate("[...document.querySelectorAll('.lab small b')].map(b=>b.textContent).join(',')"))
        for t in ["verdant", "graphite"]:
            pg.click("#themeBtn"); pg.screenshot(path=sys.argv[1] + f"/shot-{t}.png", full_page=True)
        b.close()
finally:
    srv.terminate()
print("ERRORS:" if errs else "NO ERRORS", *errs, sep="\n")
