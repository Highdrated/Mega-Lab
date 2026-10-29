import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
LABS = os.path.join(HERE, "..", "..", "labs")
ERRS = {"TypeError", "ValueError", "NameError", "IndexError", "KeyError", "ZeroDivisionError", "AttributeError", "SyntaxError"}

SRC = {
    "pyle-pocket": {
        "meta": {"id": "pyle-pocket", "name": "Pyle Pocket", "topic": "Python", "href": "pyle-pocket.html", "keys": ["pyle-pocket-v1"],
                 "sample": {"pyle-pocket-v1": "{\"passed\":{\"vars\":true,\"numbers\":true,\"types\":true,\"strings\":true}}"},
                 "sampleDone": ["vars", "numbers", "types", "strings"]},
        "ask": "What does this print?", "tl": "should print", "key": "pyle-pocket-v1",
    },
    "poshle-pocket": {
        "meta": {"id": "poshle-pocket", "name": "Poshle Pocket", "topic": "PowerShell", "href": "poshle-pocket.html", "keys": ["poshle-pocket-v1"],
                 "sample": {"poshle-pocket-v1": "{\"passed\": {\"cmdlets\": true}}"}, "sampleDone": ["cmdlets"]},
        "ask": "What does it show?", "tl": "goal", "key": "poshle-pocket-v1",
    },
}


def lab_data(lab):
    s = open(os.path.join(LABS, lab + ".html"), encoding="utf8").read()
    i = s.index("const DATA = ") + len("const DATA = ")
    return json.JSONDecoder().raw_decode(s, i)[0]


def label(x):
    return x + " (crash)" if x in ERRS else x


def convert(lab):
    cfg = SRC[lab]
    data = lab_data(lab)
    cards = []
    for L in data:
        for q in L["qs"]:
            t, u, why = q["t"], L["id"], q.get("why", "")
            if t == "predict":
                o = [label(c) for c in q["choices"]]
                if len(set(o)) != len(o) or not 2 <= len(o) <= 4:
                    continue
                cards.append({"u": u, "q": cfg["ask"], "code": q["code"], "o": o, "a": q["a"], "why": why})
            elif t == "pick":
                cards.append({"u": u, "q": q["ask"], "o": q["choices"], "a": q["a"], "why": why, "cmd": 1})
            elif t == "fill":
                cards.append({"u": u, "t": "fill", "code": q["code"], "target": q["target"], "tl": cfg["tl"], "o": q["choices"], "ok": q["ok"], "why": why})
            elif t == "build":
                cards.append({"u": u, "t": "build", "ask": q["ask"], "setup": q.get("setup", ""), "target": q["target"], "tl": cfg["tl"],
                              "tiles": q["tiles"], "ok": q["ok"], "sol": q["sol"], "why": why})
            elif t == "order":
                cards.append({"u": u, "t": "order", "lines": q["lines"], "target": q["target"], "tl": cfg["tl"], "ok": q["ok"], "sol": q["sol"], "why": why})
            elif t == "bug":
                cards.append({"u": u, "t": "bug", "lines": q["lines"], "bad": q["bad"], "fix": q["fix"], "expect": q["expect"], "got": label(q["got"]),
                              "tl": cfg["tl"], "why": why})
            elif t == "trace":
                cards.append({"u": u, "t": "trace", "code": q["code"], "cols": q["cols"], "rows": q["rows"], "opts": q["opts"], "why": why})
            else:
                raise SystemExit(f"unknown type {t} in {lab}")
    meta = dict(cfg["meta"])
    meta["units"] = [{"id": L["id"], "title": L["title"]} for L in data]
    meta["cards"] = cards
    body = json.dumps(meta, ensure_ascii=False)
    done = ("{ done(get) { try { const s = get('" + cfg["key"] + "'); if (!s || typeof s !== 'object' || !s.passed) return []; "
            "return this.units.map(u => u.id).filter(id => s.passed[id] === true); } catch (e) { return []; } } }")
    out = "POCKET.register(Object.assign(" + body + ", " + done + "));\n"
    open(os.path.join(HERE, "banks", lab + ".js"), "w", encoding="utf8").write(out)
    kinds = {}
    for c in cards:
        kinds[c.get("t", "mc")] = kinds.get(c.get("t", "mc"), 0) + 1
    print(lab, len(cards), kinds)


for lab in sys.argv[1:] or SRC:
    convert(lab)
