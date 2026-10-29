import json, sys, time, collections
from engine import Bank
import lessons_a as A, lessons_b as B, lessons_c as C, lessons_d as D

META = [
    ("vars", "Print and variables", "print, =, names", A.l1),
    ("numbers", "Numbers", "/  //  %  **", A.l2),
    ("types", "Types and converting", "int, float, str", A.l3),
    ("strings", "Strings", "index and slice", A.l4),
    ("strtools", "String tools", "methods, f-strings", A.l5),
    ("bools", "True or False", "==  and  or  not", B.l6),
    ("ifs", "if / elif / else", "choosing a path", B.l7),
    ("for", "for loops", "for, range", B.l8),
    ("while", "while loops", "while, break, continue", B.l9),
    ("lists", "Lists", "index, append, sort", C.l10),
    ("dicts", "Dicts", "keys and values", C.l11),
    ("functions", "Functions", "def, return", C.l12),
    ("errors", "Errors", "try / except", C.l13),
    ("tuples", "Tuples and sets", "fixed and unique", C.l14),
    ("comps", "Comprehensions", "lists in one line", C.l15),
    ("classes", "Classes", "objects and self", C.l16),
]

EXTRA = {"for": D.x_for, "while": D.x_while, "lists": D.x_lists, "dicts": D.x_dicts, "functions": D.x_functions,
         "errors": D.x_errors, "tuples": D.x_tuples, "comps": D.x_comps, "classes": D.x_classes}
FAILS = []


def soft(name):
    orig = getattr(Bank, name)

    def w(self, *a, **k):
        try:
            return orig(self, *a, **k)
        except AssertionError as e:
            FAILS.append((name, str(e)[:300]))
            return {"t": "x", "code": "", "choices": ["a", "b"], "a": 0, "why": ""}
    setattr(Bank, name, w)


for n in ["predict", "fill", "build", "order", "bug", "trace"]:
    soft(n)

out = []
for i, (lid, title, sub, fn) in enumerate(META):
    t = time.time()
    bank = Bank(1000 + i)
    cards = fn(bank)
    extra = EXTRA.get(lid)
    if extra:
        extra(bank)
    kinds = collections.Counter(q["t"] for q in bank.qs)
    print(f"{lid:10} cards={len(cards)} qs={len(bank.qs):3} {dict(kinds)} {time.time() - t:.1f}s", file=sys.stderr)
    out.append({"id": lid, "title": title, "sub": sub, "cards": cards, "qs": bank.qs})

for f in FAILS:
    print("FAIL", f, file=sys.stderr)
if FAILS:
    sys.exit(1)
json.dump(out, open("data.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(sum(len(l["qs"]) for l in out), "questions", file=sys.stderr)
