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
