import json, os
d = open("data.json").read().replace("</", "<\\/").replace("<!--", "<\\!--")
mp = "../missions/pocket_missions.json"
m = json.load(open(mp)).get("pyle-pocket", {}) if os.path.exists(mp) else {}
mj = json.dumps(m, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
t = open("template.html").read()
head, tail = t.split("__DATA__")
tail = tail.replace("__MISSIONS__", mj, 1)
open("../../labs/pyle-pocket.html", "w").write(head + d + tail)
