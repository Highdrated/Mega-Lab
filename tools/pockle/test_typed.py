import json, os, sys, subprocess, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SHOTS = sys.argv[1] if len(sys.argv) > 1 else "/tmp/pockle-shots"
os.makedirs(SHOTS, exist_ok=True)
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8766", "-d", ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
errs, fails = [], []


def solve(pg, c):
    t = c.get("t")
    if not t:
        if pg.locator(".reveal").count():
            pg.click(".reveal")
        pg.locator(f'.choice[data-k="{c["a"]}"]').click()
    elif t == "fill":
        if pg.locator(".reveal").count():
            pg.click(".reveal")
        pg.locator(f'#ch .chip[data-j="{c["ok"][0]}"]').click()
    elif t in ("build", "order"):
        for j in c["sol"].split(","):
            pg.locator(f'#pool [data-j="{j}"]').click()
        pg.click("#chkB")
    elif t == "bug":
        pg.locator(f'#pool .lrow[data-j="{c["bad"]}"]').click()
    elif t == "trace":
        n = len(c["cols"])
        for k in range(len(c["opts"])):
            r, col = divmod(k, n)
            j = c["opts"][k].index(c["rows"][r][col])
            pg.locator(f'#ch .chip[data-j="{j}"]').click()
            pg.wait_for_timeout(220)


try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
        pg.goto("http://127.0.0.1:8766/labs/pockle.html")
        pg.evaluate("localStorage.clear()")
        pg.evaluate("""() => {
          for (const b of BANKS) for (const [k, v] of Object.entries(b.sample)) localStorage.setItem(k, v);
          for (const id of ['pyle-pocket', 'poshle-pocket']) {
            const b = BANKS.find(x => x.id === id), passed = {};
            b.units.forEach(u => passed[u.id] = true);
            localStorage.setItem(b.keys[0], JSON.stringify({ passed }));
          }
        }""")
        pg.reload()
        pg.screenshot(path=f"{SHOTS}/home.png", full_page=True)
        typed = pg.evaluate("POOL.filter(c => c.lab === 'pyle-pocket' || c.lab === 'poshle-pocket').length")
        ids = pg.evaluate("POOL.length === new Set(POOL.map(c => c.id)).size")
        print("pool", pg.evaluate("POOL.length"), "pocket cards", typed, "unique ids", ids)
        if not ids:
            fails.append("duplicate card ids")
        n = pg.evaluate("POOL.length")
        shot = set()
        for i in range(n):
            c = pg.evaluate(f"(() => {{ const c = POOL[{i}]; R = {{ mode: 'mix', label: 'x', cards: [c], i: 0, ok: 0, xp: 0, miss: [], answered: false, timer: null, newM: 0, guesses: 0 }}; show('drill'); render(); return c; }})()")
            t = c.get("t", "mc")
            if t not in shot:
                pg.screenshot(path=f"{SHOTS}/{t}-before.png", full_page=True)
            solve(pg, c)
            if pg.locator(".verdict.good").count() != 1:
                fails.append(f"{c['lab']} {i} {t} not accepted")
            if pg.evaluate("document.documentElement.scrollWidth > innerWidth"):
                fails.append(f"{c['lab']} {i} {t} sideways scroll")
            if t not in shot:
                pg.screenshot(path=f"{SHOTS}/{t}-after.png", full_page=True)
                shot.add(t)
        print("cards answered", n, "types", sorted(shot))

        pg.evaluate("S.cards = {}; save(); paintHome(); show('home')")
        c = pg.evaluate("(() => { const c = POOL.find(c => !c.t && c.lab === 'pyle-pocket'); R = { mode: 'mix', cards: [c], i: 0, ok: 0, xp: 0, miss: [], answered: false, newM: 0, guesses: 0 }; show('drill'); render(); return c; })()")
        pg.click(".reveal")
        pg.click("#guessBtn")
        pg.locator(f'.choice[data-k="{c["a"]}"]').click()
        pg.screenshot(path=f"{SHOTS}/guess.png", full_page=True)
        s = pg.evaluate(f"S.cards['{c['id']}']")
        print("after right guess:", s, "in mistakes:", pg.evaluate(f"missCards(POOL).some(x => x.id === '{c['id']}')"))
        if not (s["g"] and s["b"] == 1):
            fails.append("guess not recorded")
        early = pg.evaluate(f"(() => {{ const c = POOL.find(x => x.id === '{c['id']}'); R = {{ mode: 'mix', cards: [c], i: 0, ok: 0, xp: 0, miss: [], answered: false, newM: 0, guesses: 0 }}; render(); return S.cards[c.id].b; }})()")
        pg.click(".reveal")
        pg.locator(f'.choice[data-k="{c["a"]}"]').click()
        eb = pg.evaluate(f"S.cards['{c['id']}'].b")
        print("early review level:", early, "->", eb)
        if eb != early:
            fails.append("early review levelled up")
        for k in range(4):
            pg.evaluate(f"S.cards['{c['id']}'].due = 0")
            pg.evaluate(f"(() => {{ const c = POOL.find(x => x.id === '{c['id']}'); R = {{ mode: 'mix', cards: [c], i: 0, ok: 0, xp: 0, miss: [], answered: false, newM: 0, guesses: 0 }}; render(); }})()")
            pg.click(".reveal")
            pg.locator(f'.choice[data-k="{c["a"]}"]').click()
        m = pg.evaluate(f"mastered(POOL.find(x => x.id === '{c['id']}'))")
        print("mastered after guess + 4 sure answers:", m)
        if not m:
            fails.append("mastery not reached")
        pg.click("#nextBtn")
        print("result msg:", pg.inner_text("#resMsg"))
        pg.click("#homeBtn")
        print("lab count:", pg.inner_text("#labCount"))
        pg.screenshot(path=f"{SHOTS}/home-after.png", full_page=True)
        pg.click("#sprintBtn")
        kinds = pg.evaluate("R.cards.map(c => c.t || 'mc')")
        if any(k in ("build", "order", "trace") for k in kinds):
            fails.append("slow types in sprint")
        if pg.locator("#guessBtn").count():
            fails.append("guess toggle in sprint")
        pg.click("#quitBtn")
        if pg.is_visible("#result"):
            pg.click("#homeBtn")
        pg.click("#mixBtn")
        for i in range(10):
            c = pg.evaluate("R.cards[R.i]")
            if i % 3 == 0:
                if c.get("t") in ("build", "order"):
                    pg.click("#howB")
                elif not c.get("t"):
                    if pg.locator(".reveal").count():
                        pg.click(".reveal")
                    pg.locator(f'.choice:not([data-k="{c["a"]}"]) >> nth=0').click()
                else:
                    solve(pg, c)
            else:
                solve(pg, c)
            pg.click("#nextBtn")
        pg.screenshot(path=f"{SHOTS}/result.png", full_page=True)
        b.close()
finally:
    srv.terminate()
print("errors:", errs[:10])
print("fails:", len(fails), fails[:20])
