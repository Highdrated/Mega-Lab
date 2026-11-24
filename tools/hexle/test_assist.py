import asyncio, json, os
from playwright.async_api import async_playwright

HER = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Observatory</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <h1>Observatory</h1>
  </header>
  <main>
  <figure>
    <img src="img/observatory.png" alt="The witch's hut">
    <figcaption> The tower on Owl Hill</figcaption>
 </figure>

  </main>
</body>
</html>
'''
BAD = '<center><a href="#">x</a></center>\n<title>Document</title>\n<p>ok </p>'
ok = True
URL = 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'labs', 'hexle.html'))


def check(name, got, want):
    global ok
    good = got == want
    ok = ok and good
    print(('PASS ' if good else 'FAIL ') + name)
    if not good:
        print('   got :', json.dumps(got))
        print('   want:', json.dumps(want))


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1440, 'height': 900})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        idx = await pg.evaluate("TARGETS.findIndex(t=>/observatory/i.test(t.name))")
        print('observatory target', idx)
        await pg.evaluate("i=>{S.learned=Object.keys(RULES);S.stage='target';S.t=i;S.memo=null;render()}", idx)
        await pg.wait_for_timeout(600)
        notes = await pg.evaluate("c=>reviewCode(c,'figcaption { color: red }',null).map(x=>x.sev+' '+x.k+' '+x.file+':'+x.line+' '+x.msg)", HER)
        for n in notes:
            print('  ', n)
        notes = await pg.evaluate("c=>reviewCode(c,null,null).map(x=>x.sev+' '+x.k+' '+x.file+':'+x.line+' '+x.msg)", BAD)
        for n in notes:
            print('  ', n)

        async def typed(name, keys, want, start='', caret=None, file=None):
            await pg.evaluate("([v,f])=>{const ed=$('ed');if(f){file=f}ed.value=v;ed._hx=[];ed.focus();ed.selectionStart=ed.selectionEnd=v.length}", [start, file])
            if caret is not None:
                await pg.evaluate("c=>{const ed=$('ed');ed.selectionStart=ed.selectionEnd=c}", caret)
            for k in keys:
                if len(k) > 1 and k[0] == '@':
                    await pg.keyboard.press(k[1:])
                else:
                    await pg.keyboard.type(k)
            got = await pg.evaluate("()=>{const ed=$('ed');return ed.value.slice(0,ed.selectionStart)+'|'+ed.value.slice(ed.selectionStart)}")
            check(name, got, want)

        await typed('h2 tab', ['h2', '@Tab'], '<h2>|</h2>')
        await typed('h2#log tab', ['  h2#log', '@Tab', 'Star log'], '  <h2 id="log">Star log|</h2>')
        await typed('a tab', ['a', '@Tab', '#log'], '<a href="#log|"></a>')
        await typed('img tab', ['img', '@Tab'], '<img src="|" alt="">')
        await typed('ul>li*3', ['  ul>li*3', '@Tab'], '  <ul>\n    <li>|</li>\n    <li></li>\n    <li></li>\n  </ul>')
        await typed('.card', ['.card', '@Tab'], '<div class="card">|</div>')
        await typed('p>a inline', ['p>a', '@Tab'], '<p><a href="|"></a></p>')
        await typed('bang', ['!', '@Tab'], '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  |\n</body>\n</html>')
        await typed('unknown word', ['hello', '@Tab'], 'hello  |')
        await typed('tab in tag', ['<a hr', '@Tab'], '<a hr  |')
        await typed('autoclose', ['<p>'], '<p>|</p>')
        await typed('autoclose attrs', ['<h2 id="log">Star log'], '<h2 id="log">Star log|</h2>')
        await typed('void no close', ['<img src="a.png" alt="An owl">'], '<img src="a.png" alt="An owl">|')
        await typed('br no close', ['<br>'], '<br>|')
        await typed('manual close', ['<p>hi</p>'], '<p>hi</p>|</p>')
        await typed('close slash', ['</'], '<main>\n  <p>x</p>\n</main>|', start='<main>\n  <p>x</p>\n')
        await typed('apostrophe text', ["<p>witch's hat"], "<p>witch's hat|</p>")
        await typed('quote in text', ['<p>say "hi"'], '<p>say "hi"|</p>')
        await typed('enter between', ['<main>', '@Enter', 'x'], '<main>\n  x|\n</main>')
        await typed('enter after open', ['@Enter'], '  <ul>\n    |\n', start='  <ul>\n', caret=6)
        await typed('enter plain', ['<p>a</p>', '@Enter', 'b'], '  <p>a</p>\n  b|</p>', start='  ')
        await typed('backspace pair', ['<a href="', '@Backspace'], '<a href=|')
        await typed('css brace', ['h1 {', '@Enter', 'color: teal;'], 'h1 {\n  color: teal;|\n}', file='css')
        await typed('css brace overtype', ['h1 {}'], 'h1 {}|', file='css')
        await typed('css nested close', ['}'], '@media (min-width: 600px) {\n  h1 { color: teal; }\n}|\n', start='@media (min-width: 600px) {\n  h1 { color: teal; }\n\n', caret=50, file='css')
        await typed('css tab plain', ['h2', '@Tab'], 'h2  |', file='css')
        await typed('js parens', ['console.log("hi")'], 'console.log("hi")|', file='js')
        await typed('js apostrophe', ["const a = 'x';"], "const a = 'x';|", file='js')
        await typed('style block in html', ['<style>', '@Enter', 'h1 {', '@Enter', 'color: red;'], '<style>\n  h1 {\n    color: red;|\n  }\n</style>', file='html')
        await pg.evaluate("()=>{S.assist=false}")
        await typed('assist off', ['h2', '@Tab', '<p>'], 'h2  <p>|', file='html')
        await pg.evaluate("()=>{S.assist=true}")
        print('errors', errs, 'ALL OK' if ok and not errs else 'FAILED')
        await b.close()

asyncio.run(main())
