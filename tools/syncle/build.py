t=open('template.html').read()
for k,f in [('ENGINE','engine.js'),('CONTENT','content.js'),('DRILLS01','drills01.js'),('CONTENT2','content2.js'),('CONTENT3','content3.js'),('GRADER','grader.js'),('APP','app.js'),('CONSOLE','console.js'),('DESKTOP','desktop.js')]:
    t=t.replace('/*'+k+'*/', open(f).read())
open('../../labs/syncle.html','w').write(t)
print(len(t))
