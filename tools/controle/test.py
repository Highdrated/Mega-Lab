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

CH2={"ch":2,"wing":"gate","stage":"lesson","li":0,"strike":False,"temper":False,"tries":0,"studied":["ca","mfa"],"lit":["ca","mfa"],"oops":[],"pol":[],"edit":None,"night":2,"report":None}
def night2(pg,tag):
    import json
    pg.evaluate("s=>localStorage.setItem('controle.demo.v1',s)",json.dumps(CH2));pg.reload()
    for i,ans in enumerate(['Privileged Identity Management','Eligible','Require approval to activate','password administrator','Active']):
        if i==0:
            pg.fill('#si','PIN');pg.click('#sf button');assert 'Not quite' in pg.inner_text('#sfb')
        pg.fill('#si',ans);pg.click('#sf button');assert 'Forged' in pg.inner_text('#strikeCard'),('n2 strike',i)
        pg.click('.opt[data-i="0"]')
        if i==2: pg.screenshot(path=f'/tmp/controle-shots/{tag}-n2-lesson.png')
        pg.click('#nx')
    assert 'scouts are back' in pg.inner_text('#pane')
    pg.screenshot(path=f'/tmp/controle-shots/{tag}-n2-brief.png')
    pg.click('#go');pg.wait_for_timeout(200);pg.screenshot(path=f'/tmp/controle-shots/{tag}-n2-console.png')
    hold(pg);r=results(pg);print(tag,'n2 start',r);assert r==['Breached','Breached','Too much','Risk'],r
    pg.click('#again')
    pg.select_option('select[data-p="maren"][data-k="t"]','eligible')
    hold(pg);r=results(pg);print(tag,'n2 eligible no approval',r);assert r[0]=='Breached',r
    pg.click('#again')
    pg.check('#gs-appr');pg.select_option('select[data-p="tobin"][data-k="r"]','ha');pg.select_option('select[data-p="you"][data-k="t"]','eligible')
    pg.screenshot(path=f'/tmp/controle-shots/{tag}-n2-console-fixed.png')
    pg.click('#hold');pg.wait_for_timeout(1500);pg.screenshot(path=f'/tmp/controle-shots/{tag}-n2-siege.png')
    pg.wait_for_selector('#again',timeout=15000)
    r=results(pg);print(tag,'n2 win',r);assert r==['Held','Contained'],r
    assert 'citadel held' in pg.inner_text('#pane')
    assert pg.locator('#wards .dot.lit').count()==3
    pg.screenshot(path=f'/tmp/controle-shots/{tag}-n2-report-win.png')
    assert pg.inner_text('#end')=='Start day 3'
    if tag=='1440':
        pg.click('#again')
        for x in ['ea1','ea2','maren']:
            pg.select_option(f'select[data-p="{x}"][data-k="t"]','eligible')
        hold(pg);r=results(pg);print('n2 lockout',r);assert 'Locked out' in r and 'Risk' in r,r
        pg.screenshot(path=f'/tmp/controle-shots/{tag}-n2-report-lock.png')
        pg.click('#again');pg.select_option('select[data-p="maren"][data-k="r"]','none')
        hold(pg);r=results(pg);print('n2 blocked',r);assert 'Blocked work' in r,r

CH3={"ch":3,"wing":"gate","stage":"lesson","li":0,"strike":False,"temper":False,"tries":0,"studied":["ca","mfa","pim"],"lit":["ca","mfa","pim"],"oops":[],"pol":[],"edit":None,"night":3,"report":None}
def night3(pg,tag):
    import json
    pg.evaluate("s=>localStorage.setItem('controle.demo.v1',s)",json.dumps(CH3));pg.reload()
    for i,ans in enumerate(['consent phishing','Application','verified','admin consent workflow','Enabled for users to sign-in?']):
        if i==0:
            pg.fill('#si','phishing');pg.click('#sf button');assert 'Not quite' in pg.inner_text('#sfb')
            pg.fill('#si',ans);pg.click('#sf button')
            pg.click('.opt[data-i="2"]');assert 'Not that one' in pg.inner_text('#tfb')
        else:
            pg.fill('#si',ans);pg.click('#sf button')
        assert 'Forged' in pg.inner_text('#strikeCard'),('n3 strike',i)
        pg.click('.opt[data-i="0"]')
        if i==4: pg.screenshot(path=f'/tmp/controle-shots/{tag}-n3-lesson.png')
        pg.click('#nx')
    assert 'scouts are back' in pg.inner_text('#pane')
    pg.screenshot(path=f'/tmp/controle-shots/{tag}-n3-brief.png')
    pg.click('#go');pg.wait_for_timeout(200);pg.screenshot(path=f'/tmp/controle-shots/{tag}-n3-console.png')
    hold(pg);r=results(pg);print(tag,'n3 start',r);assert r==['Breached','Breached','Served'],r
    pg.click('#again');pg.check('input[name=cs][value=verified]')
    hold(pg);r=results(pg);print(tag,'n3 verified only',r);assert r==['Held','Breached','Blocked work'],r
    pg.click('#again');pg.check('#pc-offline_access');pg.check('#pc-User\\.Read');pg.select_option('select[data-a="raven"]','no')
    pg.screenshot(path=f'/tmp/controle-shots/{tag}-n3-console-fixed.png')
    hold(pg);r=results(pg);print(tag,'n3 win',r);assert r==['Held','Held','Served'],r
    assert 'citadel held' in pg.inner_text('#pane')
    assert pg.locator('#wards .dot.lit').count()==5
    pg.screenshot(path=f'/tmp/controle-shots/{tag}-n3-report-win.png')
    pg.click('#end');assert 'rest of the citadel' in pg.inner_text('#pane');pg.click('#bk')
    if tag=='1440':
        pg.click('#again');pg.uncheck('#pc-User\\.Read');pg.check('#wf');pg.check('#pc-Mail\\.Read');pg.select_option('select[data-a="hr"]','no')
        hold(pg);r=results(pg);print('n3 mistakes',r);assert 'Blocked work' in r and 'Risk' in r and 'Served' in r,r
        pg.screenshot(path=f'/tmp/controle-shots/{tag}-n3-report-mistakes.png')
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
        assert pg.locator('#day2').count()==1
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
        night2(pg,tag)
        night3(pg,tag)
        sw=pg.evaluate('document.documentElement.scrollWidth');assert sw<=w,(tag,'overflow',sw)
        pg.close()
    b.close()
print('ERRORS',errs)
print('ALL OK' if not errs else 'ERRORS FOUND')
