import asyncio,re
from lib import L
async def main():
    s=L();await s.start('ready')
    scs=await s.pg.evaluate("SC.filter(x=>!['install','switch'].includes(x.id)).map(x=>({id:x.id,obj:x.obj.map(o=>[o.t,o.h[1]])}))")
    for sc in scs:
        await s.pg.evaluate(f"LAB.load('{sc['id']}')");bad=[]
        async def run(c):
            await s.type(c)
            for _ in range(3):
                pr=await s.pg.evaluate("LAB.W().prompt&&LAB.W().prompt.k")
                if not pr: break
                await s.type('yes' if 'fp' in pr else 'pw')
        for i,(t,h2) in enumerate(sc['obj']):
            if await s.obj()!=i: bad.append(f'objective {i} "{t}" was already {"done" if await s.obj()>i or await s.obj()<0 else "behind"} before its hint');
            if sc['id']=='dies':
                ev={0:0,2:1,4:2}.get(i)
                if ev is not None:
                    btns=await s.pg.evaluate("[...document.querySelectorAll('[data-ev]')].map(b=>b.textContent)")
                    try: await s.pg.click(f'[data-ev="{ev}"]',timeout=2000)
                    except Exception: bad.append(f'objective {i}: event button {ev} not clickable; visible: {btns}')
            if await s.pg.evaluate("LAB.W().host")=='laptop' and not h2.startswith('ssh'): await run('ssh root@192.168.0.201')
            for c in [x.strip() for x in re.split(r'\s+then on pve1:\s+|\s+then\s+|\s{3,}',re.sub(r'\(.*?\)','',h2)) if x.strip()]:
                await run(c)
            k=await s.obj()
            if not(k>i or k<0): bad.append(f'objective {i} "{t}": typing the exact hint [{h2}] did not complete it; last output: '+(await s.pg.inner_text('#term'))[-220:].replace(chr(10),' | '))
            if k<=i and k>=0: break
        print(sc['id'],'OK' if not bad else 'PROBLEMS');[print('   -',b) for b in bad]
    await s.stop()
asyncio.run(main())
