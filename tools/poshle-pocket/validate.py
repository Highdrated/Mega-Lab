import importlib.util, sys, re
p = sys.argv[1]
spec = importlib.util.spec_from_file_location("m", p); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
EMO = re.compile("[\U0001F300-\U0001FAFF☀-➿]")
errs = []
fns = sorted(n for n in dir(m) if re.fullmatch(r"l\d+", n))
for fn in fns:
    L = getattr(m, fn)(); tag = L.get("id", fn)
    for k in ("id", "title", "sub", "cards", "qs"):
        if k not in L: errs.append(f"{tag}: missing {k}")
    if not 4 <= len(L["cards"]) <= 6: errs.append(f"{tag}: {len(L['cards'])} cards")
    for i, c in enumerate(L["cards"]):
        if not c.get("h") or not c.get("body"): errs.append(f"{tag} card{i}: h/body")
        if "code" in c and not c.get("out"): errs.append(f"{tag} card{i}: code without out")
        q = c.get("check")
        if q and not (q.get("t") == "predict" and len(q["choices"]) == 3 and 0 <= q["a"] < 3 and len(set(q["choices"])) == 3): errs.append(f"{tag} card{i}: bad check")
    if not 26 <= len(L["qs"]) <= 40: errs.append(f"{tag}: {len(L['qs'])} qs")
    kinds = {}
    for i, q in enumerate(L["qs"]):
        t = q.get("t"); kinds[t] = kinds.get(t, 0) + 1; w = f"{tag} q{i}({t})"
        if not q.get("why"): errs.append(w + " no why")
        if t in ("predict", "pick"):
            ch = q["choices"]
            if not (3 <= len(ch) <= 4 and 0 <= q["a"] < len(ch) and len(set(ch)) == len(ch)): errs.append(w + " choices")
            if t == "pick" and not q.get("ask"): errs.append(w + " ask")
        elif t == "fill":
            ch = q["choices"]
            if "___" not in q["code"] or not q.get("target"): errs.append(w + " code/target")
            if not (3 <= len(ch) <= 4 and q["ok"] and len(q["ok"]) < len(ch) and all(0 <= j < len(ch) for j in q["ok"]) and len(set(ch)) == len(ch)): errs.append(w + " ok")
        elif t == "build":
            n = len(q["tiles"]); sol = [int(x) for x in q["sol"].split(",")]
            if q["sol"] not in q["ok"] or not all(0 <= x < n for x in sol) or len(set(sol)) != len(sol) or len(sol) >= n: errs.append(w + " sol/decoys")
            for o in q["ok"]:
                oo = [int(x) for x in o.split(",")]
                if sorted(q["tiles"][x] for x in oo) != sorted(q["tiles"][x] for x in sol): errs.append(w + " ok uses other tiles")
            if not q.get("ask") or not q.get("target"): errs.append(w + " ask/target")
        elif t == "order":
            n = len(q["lines"]); sol = [int(x) for x in q["sol"].split(",")]
            if sorted(sol) != list(range(n)) or q["sol"] not in q["ok"] or sol == list(range(n)): errs.append(w + " sol (must be a real permutation, not already in order)")
            if not 3 <= n <= 6: errs.append(w + " lines")
        elif t == "bug":
            if not (0 <= q["bad"] < len(q["lines"]) and q["fix"] != q["lines"][q["bad"]] and q.get("expect") and q.get("got")): errs.append(w + " bug fields")
        else:
            errs.append(w + " unknown type")
    for k in ("predict", "pick", "fill", "build", "order", "bug"):
        if kinds.get(k, 0) < 3: errs.append(f"{tag}: only {kinds.get(k, 0)} {k}")
    if EMO.search(repr(L)): errs.append(f"{tag}: emoji")
    print(f"{tag:12} cards={len(L['cards'])} qs={len(L['qs'])} {kinds}")
print("ERRORS\n" + "\n".join(errs) if errs else "OK")
