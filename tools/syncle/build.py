t=open('template.html').read()
for k,f in [('ENGINE','engine.js'),('CONTENT','content.js'),('GRADER','grader.js'),('APP','app.js')]:
    t=t.replace('/*'+k+'*/', open(f).read())
open('../../labs/syncle.html','w').write(t)
print(len(t))
