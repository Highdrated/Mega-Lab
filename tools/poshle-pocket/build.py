d = open("data.json").read().replace("</", "<\\/").replace("<!--", "<\\!--")
head, tail = open("template.html").read().split("__DATA__")
open("../../labs/poshle-pocket.html", "w").write(head + d + tail)
