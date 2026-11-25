import sys
from playwright.sync_api import sync_playwright
import os
os.makedirs('/tmp/controle-shots',exist_ok=True)
url='file://'+os.path.join(os.path.dirname(os.path.abspath(__file__)),'controle-demo.html')
errs=[]
def lessons(pg,wrong=True):
    for i in range(5):
        if wrong and i<2:
            pg.fill('#si','wrong answer');pg.click('#sf button')
            assert 'Not quite' in pg.inner_text('#sfb'),pg.inner_text('#sfb')
        ans=['password spray','Conditional Access','require multi-factor authentication','Report-only','Other clients'][i]
        pg.fill('#si',ans);pg.click('#sf button')
        assert 'Forged' in pg.inner_text('#strikeCard'),('strike',i)
        if wrong and i==0:
            pg.click('.opt[data-i="1"]');assert 'Not that one' in pg.inner_text('#tfb')
        pg.click('.opt[data-i="0"]')
        if i==1: pg.screenshot(path=f'/tmp/controle-shots/{tag}-lesson.png')
        pg.click('#nx')
def edit_first(pg,f):
    pg.click('[data-e="p1"]');f(pg);pg.click('#pf button[type=submit]')
def hold(pg):
    pg.click('#hold');pg.wait_for_selector('#again',timeout=15000)
def results(pg):
    return [t.strip() for t in pg.locator('.res .tag').all_inner_texts()]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    for tag,(w,h) in {'1440':(1440,900),'1280':(1280,800),'1024':(1024,768),'390':(390,844)}.items():
        pg=b.new_page(viewport={'width':w,'height':h})
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.on('console',lambda m:errs.append(m.text) if m.type=='error' and 'fonts' not in m.text else None)
        pg.goto(url);pg.evaluate('localStorage.clear()');pg.reload()
        pg.screenshot(path=f'/tmp/controle-shots/{tag}-intro.png')
        pg.click('#go');lessons(pg,wrong=(tag=='1440'))
        pg.screenshot(path=f'/tmp/controle-shots/{tag}-brief.png')
        pg.click('#go');pg.wait_for_timeout(300)
        pg.screenshot(path=f'/tmp/controle-shots/{tag}-console.png')
        hold(pg);r=results(pg);print(tag,'night1',r);assert r==['Breached']*3,r
        pg.screenshot(path=f'/tmp/controle-shots/{tag}-report-fail.png')
        pg.click('#again')
        def f1(pg):
            pg.check('input[name=state][value=on]')
        edit_first(pg,f1);hold(pg);r=results(pg);print(tag,'on only',r);assert r[:3]==['Held','Breached','Held'],r
        pg.click('#again')
        def f2(pg):
            pg.check('input[name=inc][value=all]');pg.check('input[name=excG][value=ea]')
        edit_first(pg,f2)
        pg.click('#np');pg.click('#pf button[type=submit]');assert 'Name is required' in pg.inner_text('#perr')
        pg.fill('#pf input[name=name]','Block legacy authentication')
        pg.check('input[name=inc][value=all]');pg.check('input[name=excG][value=ea]');pg.check('input[name=res][value=all]')
        pg.check('input[name=ca][value=yes]');pg.check('input[name=apps][value=eas]');pg.check('input[name=apps][value=other]')
        pg.check('input[name=grant][value=block]');pg.check('input[name=state][value=on]')
        pg.screenshot(path=f'/tmp/controle-shots/{tag}-editor.png')
        pg.click('#pf button[type=submit]')
        assert pg.locator('.pol').count()==2
        pg.click('#hold');pg.wait_for_timeout(2600);pg.screenshot(path=f'/tmp/controle-shots/{tag}-siege.png')
        pg.wait_for_selector('#again',timeout=15000)
        r=results(pg);print(tag,'win',r);assert r==['Held','Held','Held','Commended'],r
        assert 'citadel held' in pg.inner_text('#pane')
        pg.screenshot(path=f'/tmp/controle-shots/{tag}-report-win.png')
        lit=pg.locator('#wards .dot.lit').count();assert lit==2,lit
        pg.click('.wcard[data-w="towers"]');pg.screenshot(path=f'/tmp/controle-shots/{tag}-towers.png')
        if tag=='1440':
            pg.click('#again')
            def f3(pg):
                pg.uncheck('input[name=excG][value=ea]')
            edit_first(pg,f3)
            pg.click('[data-e]:not([data-e="p1"])')
            pg.check('input[name=excG][value=ea]');pg.click('#pf button[type=submit]')
            pg.click('#np');pg.fill('#pf input[name=name]','Compliant only')
            pg.check('input[name=inc][value=all]');pg.check('input[name=excG][value=ea]');pg.check('input[name=res][value=all]');pg.check('input[name=ctrl][value=compliant]');pg.check('input[name=state][value=on]');pg.click('#pf button[type=submit]')
            hold(pg);r=results(pg);print('lockout+ea',r);assert 'Locked out' in r and 'Risk' in r,r
            pg.screenshot(path=f'/tmp/controle-shots/{tag}-report-lock.png')
            pg.click('#oopsBtn');pg.wait_for_timeout(300);pg.screenshot(path=f'/tmp/controle-shots/{tag}-oops.png')
        sw=pg.evaluate('document.documentElement.scrollWidth');assert sw<=w,(tag,'overflow',sw)
        pg.close()
    b.close()
print('ERRORS',errs)
print('ALL OK' if not errs else 'ERRORS FOUND')
