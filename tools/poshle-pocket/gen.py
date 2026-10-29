import json, sys, re, importlib
mods = [importlib.import_module(m) for m in ("lessons_a", "lessons_b", "lessons_c")]
out = []
for m in mods:
    for fn in sorted(n for n in dir(m) if re.fullmatch(r"l\d+", n)):
        out.append(getattr(m, fn)())
ids = [L["id"] for L in out]
assert len(ids) == len(set(ids)), ids
json.dump(out, open("data.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(len(out), "lessons", sum(len(L["qs"]) for L in out), "questions", file=sys.stderr)

cards = []
for L in out:
    for q in L["qs"]:
        if q["t"] == "predict":
            cards.append({"u": L["id"], "q": "What does it show?", "code": q["code"], "o": q["choices"], "a": q["a"], "why": q["why"]})
        elif q["t"] == "pick":
            cards.append({"u": L["id"], "q": q["ask"], "o": q["choices"], "a": q["a"], "why": q["why"]})
        elif q["t"] == "fill" and len(q["ok"]) == 1:
            cards.append({"u": L["id"], "q": "Fill the gap. Goal: " + q["target"], "code": q["code"], "o": q["choices"], "a": q["ok"][0], "why": q["why"]})
first = out[0]["id"]
bank = {
    "id": "poshle-pocket", "name": "Poshle Pocket", "topic": "PowerShell", "href": "poshle-pocket.html",
    "keys": ["poshle-pocket-v1"], "units": [{"id": L["id"], "title": L["title"]} for L in out],
    "sample": {"poshle-pocket-v1": json.dumps({"passed": {first: True}})}, "sampleDone": [first], "cards": cards,
}
js = "POCKET.register(Object.assign(" + json.dumps(bank, ensure_ascii=False) + ", { done(get) { try { const s = get('poshle-pocket-v1'); if (!s || typeof s !== 'object' || !s.passed) return []; return this.units.map(u => u.id).filter(id => s.passed[id] === true); } catch (e) { return []; } } }));\n"
open("../pockle/banks/poshle-pocket.js", "w").write(js)
print(len(cards), "cards written to Pockle bank", file=sys.stderr)
