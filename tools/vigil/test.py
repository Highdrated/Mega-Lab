import asyncio, os, subprocess, sys
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
subprocess.run(["node", os.path.join(HERE, "build.js")], check=True, stdout=subprocess.DEVNULL)
F = "file://" + os.path.join(HERE, "out", "vigil-demo.html")
FAIL = []


def check(ok, msg):
    if not ok:
        FAIL.append(msg)
        print("FAIL", msg)


async def ps(pg, cmd):
    await pg.fill("#psin", cmd)
    await pg.press("#psin", "Enter")
    await pg.wait_for_timeout(40)


async def last_lines(pg, n=3):
    return (await pg.inner_text("#psw .psb")).strip().split("\n")[-n:]


async def main():
    async with async_playwright() as p:
        exe = "/usr/bin/google-chrome"
        b = await p.chromium.launch(executable_path=exe, args=["--no-sandbox"])
        pg = await b.new_page(viewport={"width": 1440, "height": 900})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        await pg.goto(F)
        await pg.evaluate("localStorage.clear()")
        await pg.reload()
        await pg.wait_for_timeout(600)

        check(await pg.inner_text("#ecode") == "EXAM AB-650", "exam code visible in header")
        check("Administering Microsoft 365 and AI Services" in await pg.inner_text("#ename"), "exam name visible in header")
        check(await pg.locator("#orrery circle.star").count() == 58, "58 stars on the orrery")
        await pg.click("[data-skin=night]")
        check(await pg.get_attribute("#dome", "data-skin") == "night", "night chart switch")
        await pg.click("[data-skin=paper]")

        await pg.click("nav.tabs button[data-view=school]")
        ladder = await pg.evaluate("LADDER")
        check(len(ladder) == 11, "11 school steps")
        for g in ladder:
            n = await pg.evaluate(f"LESSONS['{g}'].length")
            for l in range(n):
                await pg.evaluate(f"school.g='{g}';school.l={l};school.qa=null;renderStrip();renderLesson()")
                facts = await pg.locator("#lesson .facts:not(.blk.watch .facts) li").count()
                check(await pg.locator("#lesson .blk:not(.watch) > .facts li").count() <= 3, f"{g} lesson {l + 1} has at most 3 facts")
                await pg.fill("#tyin", "zzz wrong")
                await pg.press("#tyin", "Enter")
                check("no" in (await pg.get_attribute("#tyin", "class") or ""), f"{g} lesson {l + 1} rejects a wrong typed answer")
                ans = await pg.evaluate(f"TYPED['{g}'][{l}].a[0]")
                await pg.fill("#tyin", ans.upper() + "  ")
                await pg.press("#tyin", "Enter")
                check("ok" in (await pg.get_attribute("#tyin", "class") or ""), f"{g} lesson {l + 1} accepts '{ans}'")
                await pg.click("[data-reveal]")
                a = await pg.evaluate("school.qa.a")
                await pg.click(f"#lesson [data-o='{a}']")
                rows = await pg.locator("#lesson .where tr").count()
                for r in range(rows):
                    await pg.locator("#lesson .where tr").nth(r).click()
                    check(await pg.evaluate("!!document.querySelector('#lens .it.on')"), f"{g} lesson {l + 1} row {r + 1} lights up in the Lens")
        check(await pg.evaluate("S.seen.length+S.lit.length") == 58, "finishing every lesson studies every star")

        await pg.click("nav.tabs button[data-view=case]")
        await pg.click("[data-app=ps]")
        await ps(pg, "Get-SPOSite")
        check("No connection available" in " ".join(await last_lines(pg, 3)), "SPO cmdlet refused before connecting")
        await ps(pg, "Connect-SPOService -Url https://halcyon.sharepoint.com")
        check("Could not connect" in " ".join(await last_lines(pg, 3)), "connect refused without -admin")
        await ps(pg, "Connect-SPOService -Url https://halcyon-admin.sharepoint.com")
        await ps(pg, "Get-SPOSite Treasury")
        check("Invalid URI" in " ".join(await last_lines(pg, 3)), "site name instead of URL refused")
        await ps(pg, "Set-SPOSite -Identity https://halcyon.sharepoint.com/sites/treasury -RestrictContentOrgWideSearch true")
        check("Boolean parameters accept only" in " ".join(await last_lines(pg, 2)), "bare true refused for a Boolean")
        await ps(pg, "Set-SPOSite -Identity https://halcyon.sharepoint.com/sites/treasury -Rest $true")
        check("ambiguous" in " ".join(await last_lines(pg, 2)), "ambiguous short parameter refused")
        check(not await pg.evaluate("C.rcd"), "nothing changed after refused commands")
        await ps(pg, "Set-SPOSite -Identity https://halcyon.sharepoint.com/sites/treasury -RestrictContentOrgWideSearch $true")
        check(await pg.evaluate("C.rcd && C.done.includes('contain')"), "correct PowerShell completes the contain goal")
        await ps(pg, "Get-SPOSite -Identity https://halcyon.sharepoint.com/sites/treasury | Select RestrictContentOrgWideSearch")
        check("True" in " ".join(await last_lines(pg, 3)), "Select shows True with a capital")

        await pg.click("[data-app=browser]")
        await pg.click("#glass [data-pl]")
        await pg.click("[data-pj=spo]")
        await pg.click("#glass [data-pn='spo|active']")
        await pg.type("#psearch", "trea")
        check(await pg.input_value("#psearch") == "trea" and await pg.locator("#glass tr[data-site]").count() == 1, "typed site search filters and keeps focus")
        await pg.click("#glass [data-pn='spo|dag']")
        await pg.click("[data-ca=openReport]")
        await pg.click("[data-rep=treasury]")
        await pg.click("[data-ca=review]")
        await pg.click("[data-ca=sendReview]")
        await pg.wait_for_timeout(4300)
        check(await pg.evaluate("C.done.length") == 3, "case completes")
        check(await pg.locator(".closed").count() == 1, "case closed screen shows")

        await pg.click("[data-closed]")
        await pg.click("nav.tabs button[data-view=trial]")
        await pg.click("[data-exam=start]")
        check("AB-650" in await pg.inner_text("#exam"), "exam code on the trial screen")
        check(not errs, "no console or page errors: " + "; ".join(errs[:3]))
        await b.close()


asyncio.run(main())
print("ALL OK" if not FAIL else f"{len(FAIL)} FAILED")
sys.exit(1 if FAIL else 0)
