import os
import asyncio,sys,os
from playwright.async_api import async_playwright
class L:
    async def start(s,sid,w=1700,h=950):
        s.p=await async_playwright().start()
        s.b=await s.p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        s.pg=await s.b.new_page(viewport={'width':w,'height':h})
        s.errs=[];s.pg.on('pageerror',lambda e:s.errs.append(str(e)))
        await s.pg.goto('file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..','..','labs','proxle.html')));await s.pg.wait_for_timeout(400)
        await s.pg.evaluate(f"LAB.load('{sid}')");await s.pg.wait_for_timeout(200)
    async def obj(s): return await s.pg.evaluate("LAB.objIndex()")
    async def click(s,act,**k):
        try: await s.pg.click(f'[data-act="{act}"]',timeout=2500,**k);await s.pg.wait_for_timeout(120);return True
        except Exception as e: print('   !! cannot click',act,'|',str(e).split('\n')[0][:90]);return False
    async def c(s,sel):
        bx=await s.pg.locator(sel).first.bounding_box(timeout=2500);return bx['x']+bx['width']/2,bx['y']+bx['height']/2
    async def drag(s,a,b):
        try:
            x,y=await s.c(a);x2,y2=await s.c(b)
            await s.pg.mouse.move(x,y);await s.pg.mouse.down();await s.pg.mouse.move((x+x2)/2,(y+y2)/2,steps=4);await s.pg.mouse.move(x2,y2,steps=4);await s.pg.mouse.up();await s.pg.wait_for_timeout(200);return True
        except Exception as e: print('   !! cannot drag',a,'->',b,'|',str(e).split('\n')[0][:90]);return False
    async def type(s,line,sel='#cmd'):
        await s.pg.click(sel);await s.pg.fill(sel,line);await s.pg.keyboard.press('Enter');await s.pg.wait_for_timeout(150)
    async def acts(s,scope='body'):
        return await s.pg.evaluate("sc=>[...new Set([...document.querySelector(sc).querySelectorAll('[data-act]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>e.dataset.act))]",scope)
    async def msg(s): return await s.pg.evaluate("LAB.W().inst?LAB.W().inst.msg:''")
    async def step(s,name,want):
        k=await s.obj();ok=(k==want) or (want<0 and k<0)
        print(('ok  ' if ok else 'FAIL'),name,'-> objective index',k,'' if ok else f'(expected {want}) msg={await s.msg()!r}')
        if not ok: await s.pg.screenshot(path=os.path.join(os.path.dirname(os.path.abspath(__file__)),'last.png'))
        return ok
    async def stop(s): 
        print('page errors:',s.errs);await s.b.close();await s.p.stop()
