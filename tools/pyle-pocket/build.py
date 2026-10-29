import json
d = open("data.json").read()
t = open("template.html").read()
open("../../labs/pyle-pocket.html", "w").write(t.replace("__DATA__", d))
