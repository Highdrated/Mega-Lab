import os, sys, subprocess, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = "8791"
URL = "http://127.0.0.1:" + PORT + "/labs/pockle.html"
srv = subprocess.Popen([sys.executable, "-m", "http.server", PORT, "-d", ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
errs = []


def play(pg):
    kind = pg.evaluate("R.cards[R.i].t || 'mc'")
    if pg.locator(".reveal").count():
        pg.click(".reveal")
    if kind == "mc":
        pg.click(".choice >> nth=0")
    elif kind == "fill":
        pg.click("#ch .chip >> nth=0")
    elif kind == "bug":
        pg.click("#pool .lrow >> nth=0")
    elif kind in ("build", "order"):
        pg.click("#howB")
    elif kind == "trace":
        for _ in range(pg.evaluate("R.cards[R.i].opts.length")):
            pg.click("#ch .chip >> nth=0")
            pg.wait_for_timeout(650)
    pg.wait_for_function("R.answered")
    return kind


try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1243/chrome-linux64/chrome") if os.path.exists("/opt/pw-browsers/chromium-1243/chrome-linux64/chrome") else p.chromium.launch()
        ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True)
        pg = ctx.new_page()
        pg.set_default_timeout(8000)
        pg.on("pageerror", lambda e: errs.append("pageerror " + str(e)))
        pg.on("console", lambda m: m.type == "error" and errs.append("console " + m.text))
        pg.on("response", lambda r: r.status >= 400 and errs.append("http %d %s" % (r.status, r.url)))
        pg.goto(URL)
        pg.evaluate("localStorage.clear()")
        pg.reload()
        assert not pg.is_disabled("#mixBtn"), "a first visit must have something to play"
        assert pg.evaluate("document.documentElement.scrollWidth") <= 390, "home scrolls sideways"
        assert pg.evaluate("document.querySelectorAll('input,textarea').length") == 0, "typing field on home"
        empty = pg.evaluate("POOL.length")

        assert pg.is_visible("#bring"), "a first visit must show the bring-my-progress card"
        assert not pg.is_visible("#bringSteps"), "bring steps start folded"
        pg.click("#howBring")
        assert "Send to phone" in pg.inner_text("#bringSteps"), "bring steps do not explain Send to phone"
        pg.click("#tryAllBtn")
        every = pg.evaluate("POOL.length")
        assert every == pg.evaluate("BANKS.reduce((n,b)=>n+b.cards.length,0)"), "every lab on must open every card"
        assert not pg.is_visible("#bring"), "bring card stays after opening every lab"
        assert pg.evaluate("dayLabs().length") == 3, "trying labs must not add warm-ups to Today's reviews"
        assert pg.evaluate("document.documentElement.scrollWidth") <= 390, "home scrolls sideways with every lab on"
        pg.reload()
        assert pg.evaluate("POOL.length") == every, "every lab switch is not remembered"
        pg.click("#allBtn")
        assert pg.evaluate("POOL.length") == empty, "switching every lab off does not close them"
        assert pg.is_visible("#bring"), "bring card does not come back"
        pg.evaluate("localStorage.clear()")
        pg.reload()

        for t in ("python", "subnet"):
            pg.click('nav.tabs button[data-tab="%s"]' % t)
            fr = pg.frame_locator("#pane-" + t)
            fr.locator("body").wait_for()
            pg.wait_for_timeout(600)
            assert len(fr.locator("body").inner_text()) > 80, "tab " + t + " is blank"
        pg.click('nav.tabs button[data-tab="review"]')

        for s in pg.evaluate("BANKS.map(b=>b.sample)"):
            for k, v in s.items():
                pg.evaluate("([k,v])=>localStorage.setItem(k,v)", [k, v])
        pg.reload()
        seeded = pg.evaluate("POOL.length")
        assert seeded > empty, "seeded lab progress unlocked nothing"
        for lid, got, want in pg.evaluate("LABSTATE.map(l=>[l.b.id,l.units.map(u=>u.id).sort(),l.b.sampleDone.slice().sort()])"):
            if lid not in ("junos-oops", "junle", "junos-lab") and got != want:
                errs.append("unlock mismatch " + lid)

        for key, val, lid, unit in (("meridian.v1", '{"les":{"l0-team":true,"l0-stack":true},"done":{}}', "meridian", "l0-stack"), ("syncle.v1", '{"v":1,"done":{"teamuser":{"recall":1},"paging":{"recall":1},"params":{"recall":1}}}', "syncle", "teams"), ("sleeple.v1", '{"done":{"fuel":true},"les":{}}', "sleeple", "fuel"), ("subnle-pocket-v1", '{"read":[6],"pathDone":[6]}', "subnle-pocket", "summary"), ("gitlab.v1", '{"v":1,"missionIdx":0,"toursDone":{"diff":true}}', "git-lab", "gd")):
            pg.evaluate("([k,v])=>localStorage.setItem(k,v)", [key, val])
            pg.reload()
            if unit not in pg.evaluate("id=>LABSTATE.find(l=>l.b.id===id).units.map(u=>u.id)", lid):
                errs.append("progress in " + key + " does not unlock " + unit)
        pg.evaluate("OPEN_LABS.push(...BANKS.map(b=>b.id)); paintHome()")
        labs = pg.evaluate("LABSTATE.map(l=>[l.b.id,l.cards.length,l.b.cards.length])")
        seen = {}
        for i, (lid, n, total) in enumerate(labs):
            assert n >= total, lid + " does not show all its cards when open"
            pg.evaluate("i=>start('solo', LABSTATE[i].cards.slice(0, 6).concat(['fill','bug','build','order','trace'].map(t=>LABSTATE[i].cards.find(c=>c.t===t)).filter(Boolean)), LABSTATE[i].b.name)", i)
            while True:
                kind = play(pg)
                seen[kind] = seen.get(kind, 0) + 1
                assert pg.evaluate("document.documentElement.scrollWidth") <= 390, lid + " card scrolls sideways"
                last = pg.inner_text("#nextBtn") == "Finish"
                pg.click("#nextBtn")
                if last:
                    break
            assert pg.is_visible("#result"), lid + " shows no result"
            pg.click("#homeBtn")
            print("%-14s %4d cards  ok" % (lid, total))
        print("card kinds played:", seen)

        pg.click("#mixBtn")
        for _ in range(10):
            play(pg)
            pg.click("#nextBtn")
        assert pg.is_visible("#result"), "mix shows no result"
        pg.click("#homeBtn")
        pg.click("#sprintBtn")
        pg.click(".choice, .chip, .lrow >> nth=0")
        pg.click("#quitBtn")
        assert pg.is_visible("#result"), "sprint shows no result"
        pg.click("#homeBtn")
        for _ in range(3):
            pg.click("#themeBtn")
        b.close()
finally:
    srv.terminate()
print("ERRORS:" if errs else "ALL OK", *errs, sep="\n")
sys.exit(1 if errs else 0)
