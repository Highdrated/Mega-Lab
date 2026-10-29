import sys, subprocess, time, json
from playwright.sync_api import sync_playwright

ROOT = "/home/claude/mega-lab"
SHOTS = sys.argv[1] if len(sys.argv) > 1 else "/tmp"
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8767", "-d", ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
BASE = "http://127.0.0.1:8767/"
errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1243/chrome-linux64/chrome")
        laptop = b.new_context(viewport={"width": 1280, "height": 800}).new_page()
        phone = b.new_context(viewport={"width": 390, "height": 844}).new_page()
        for pg in (laptop, phone):
            pg.on("pageerror", lambda e: errs.append("pageerror " + str(e)))

        laptop.goto(BASE + "labs/pockle.html")
        laptop.evaluate("""() => {
          localStorage.setItem('pyle-pocket-v1', JSON.stringify({xp: 300, passed: {vars: true, numbers: true}, learned: {vars: true, numbers: true}, srs: {}}));
          localStorage.setItem('poshle-pocket-v1', JSON.stringify({xp: 120, passed: {cmdlets: true}, learned: {cmdlets: true}}));
          localStorage.setItem('pockle.v1', JSON.stringify({xp: 400, streak: 3, last: 20000, off: [], cards: {}, best: 9}));
        }""")
        laptop.goto(BASE + "index.html")
        laptop.wait_for_timeout(500)
        laptop.click("#sendBtn")
        laptop.wait_for_selector(".msync")
        laptop.wait_for_timeout(1500)
        laptop.screenshot(path=SHOTS + "/sync-send.png")
        url = laptop.evaluate("async () => (await MegaSync.pack()).code")
        print("code length", len(url), "QR shown:", laptop.locator(".msync svg").count() > 0)

        phone.goto(BASE + "labs/pockle.html")
        phone.evaluate("""() => {
          localStorage.setItem('pyle-pocket-v1', JSON.stringify({xp: 50, passed: {strings: true}, learned: {strings: true}, srs: {}}));
          localStorage.setItem('pockle.v1', JSON.stringify({xp: 90, streak: 1, last: 20001, off: ['hexle'], cards: {'x:1': {b: 2, due: 5, ok: true}}, best: 12}));
        }""")
        phone.goto(BASE + "labs/pockle.html#sync=" + url)
        phone.wait_for_selector("#msyncYes")
        phone.screenshot(path=SHOTS + "/sync-receive.png")
        phone.click("#msyncYes")
        phone.wait_for_selector("#msyncOk")
        print("receipt:", phone.inner_text(".msync p"))
        phone.click("#msyncOk")
        py = phone.evaluate("JSON.parse(localStorage.getItem('pyle-pocket-v1'))")
        pk = phone.evaluate("JSON.parse(localStorage.getItem('pockle.v1'))")
        ps = phone.evaluate("JSON.parse(localStorage.getItem('poshle-pocket-v1'))")
        print("pyle passed", sorted(py["passed"]), "xp", py["xp"])
        print("pockle xp", pk["xp"], "best", pk["best"], "off", pk["off"], "cards", list(pk["cards"]))
        print("poshle passed", ps and sorted(ps["passed"]))
        if sorted(py["passed"]) != ["numbers", "strings", "vars"] or py["xp"] != 300: errs.append("pyle merge wrong")
        if pk["best"] != 12 or "x:1" not in pk["cards"] or pk["xp"] != 400: errs.append("pockle merge wrong")
        if not ps or not ps["passed"].get("cmdlets"): errs.append("poshle not copied")
        if "#sync" in phone.url: errs.append("hash not cleared")
        print("pockle cards now:", phone.inner_text("#welcomeTxt")[:80])

        phone.goto(BASE + "labs/pockle.html#sync=" + url)
        phone.click("#msyncYes"); phone.click("#msyncUndo")
        after = phone.evaluate("JSON.parse(localStorage.getItem('pyle-pocket-v1'))")
        print("after resync+undo pyle xp", after["xp"])
        phone.goto(BASE + "labs/pockle.html#sync=broken")
        phone.wait_for_selector(".msync h3")
        print("broken link:", phone.inner_text(".msync h3"))
        b.close()
finally:
    srv.terminate()
print("ERRORS:\n" + "\n".join(errs) if errs else "NO ERRORS")
