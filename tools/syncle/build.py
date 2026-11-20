t=open('template.html').read()
for k,f in [('ENGINE','engine.js'),('CONTENT','content.js'),('DRILLS01','drills01.js'),('CONTENT2','content2.js'),('CONTENT3','content3.js'),('CONTENT4','content4.js'),('CONTENT5','content5.js'),('CONTENT6','content6.js'),('CONTENT7','content7.js'),('CONTENT8','content8.js'),('GRADER','grader.js'),('COMPARE','compare.js'),('APP','app.js'),('CONSOLE','console.js'),('DESKTOP','desktop.js')]:
    t=t.replace('/*'+k+'*/', open(f).read())
open('../../labs/syncle.html','w').write(t)
print(len(t))
