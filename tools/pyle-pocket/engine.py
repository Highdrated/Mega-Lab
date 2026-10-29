import io, signal, itertools, random
from contextlib import redirect_stdout


class Timeout(Exception):
    pass


def _alarm(*_):
    raise Timeout()


signal.signal(signal.SIGALRM, _alarm)


def run(code):
    buf = io.StringIO()
    err = None
    signal.setitimer(signal.ITIMER_REAL, 0.5)
    try:
        compiled = compile(code, "<pocket>", "exec")
        with redirect_stdout(buf):
            exec(compiled, {"__name__": "__main__"})
    except Timeout:
        err = "Timeout"
    except SyntaxError as e:
        err = type(e).__name__
    except Exception as e:
        err = type(e).__name__
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
    return buf.getvalue().rstrip("\n"), err


def run_lines(code):
    import sys, collections
    src = code.split("\n")
    seen = collections.Counter()

    def tr(frame, event, arg):
        if frame.f_code.co_filename != "<pocket>":
            return None
        if event == "line":
            seen[src[frame.f_lineno - 1].strip()] += 1
        return tr
    sys.settrace(tr)
    try:
        out, err = run(code)
    finally:
        sys.settrace(None)
    return out, err, seen


def label(out, err):
    if err:
        return err
    return out if out != "" else "(nothing printed)"


def lab(code):
    return label(*run(code))


class Bank:
    def __init__(self, seed):
        self.rng = random.Random(seed)
        self.qs = []
        self.seen = set()

    def _add(self, q, key):
        if key in self.seen:
            return
        self.seen.add(key)
        self.qs.append(q)

    def predict(self, code, variants=(), extra=(), why="", n=4, mind=2):
        out, err = run(code)
        assert err != "Timeout", code
        ans = label(out, err)
        pool = []
        for v in variants:
            o, e = run(v)
            if e == "Timeout":
                continue
            pool.append(label(o, e))
        pool += list(extra)
        dist = []
        for p in pool:
            if p != ans and p not in dist:
                dist.append(p)
        assert len(dist) >= mind, (code, ans, dist)
        dist = dist[: n - 1]
        choices = dist + [ans]
        self.rng.shuffle(choices)
        q = {"t": "predict", "code": code, "choices": choices, "a": choices.index(ans), "why": why}
        self._add(q, ("p", code))
        return q

    def fill(self, code, choices, why=""):
        assert "___" in code
        canon = code.replace("___", choices[0])
        out, err = run(canon)
        assert not err, (canon, err)
        target = label(out, err)
        ok = []
        order = list(range(len(choices)))
        self.rng.shuffle(order)
        shown = [choices[i] for i in order]
        for j, c in enumerate(shown):
            o, e = run(code.replace("___", c))
            if not e and label(o, e) == target:
                ok.append(j)
        assert ok
        assert len(ok) < len(shown), (code, shown)
        q = {"t": "fill", "code": code, "target": target, "choices": shown, "ok": ok, "why": why}
        self._add(q, ("f", code, tuple(choices)))
        return q

    def build(self, setup, solution, decoys=(), ask="", why=""):
        tiles = list(solution) + list(decoys)
        prefix = (setup + "\n") if setup else ""
        out, err = run(prefix + " ".join(solution))
        assert not err, (setup, solution, err)
        target = label(out, err)
        order = list(range(len(tiles)))
        while True:
            self.rng.shuffle(order)
            if order[: len(solution)] != list(range(len(solution))):
                break
        shown = [tiles[i] for i in order]
        ok = set()
        n = len(shown)
        need = sorted(solution)
        for k in [len(solution)]:
            for perm in itertools.permutations(range(n), k):
                if sorted(shown[i] for i in perm) != need:
                    continue
                if shown[perm[0]] != solution[0] or shown[perm[-1]] != solution[-1]:
                    continue
                line = " ".join(shown[i] for i in perm)
                try:
                    compile(prefix + line, "<b>", "exec")
                except SyntaxError:
                    continue
                o, e = run(prefix + line)
                if not e and label(o, e) == target:
                    ok.add(",".join(map(str, perm)))
        sol = ",".join(str(order.index(i)) for i in range(len(solution)))
        assert sol in ok, (setup, solution)
        q = {"t": "build", "setup": setup, "target": target, "tiles": shown, "ok": sorted(ok, key=len),
             "sol": sol, "ask": ask, "why": why}
        self._add(q, ("b", setup, tuple(solution)))
        return q

    def order(self, lines, why=""):
        code = "\n".join(lines)
        out, err, trail = run_lines(code)
        assert not err, (code, err)
        target = label(out, err)
        idx = list(range(len(lines)))
        while True:
            self.rng.shuffle(idx)
            if idx != list(range(len(lines))):
                break
        shown = [lines[i] for i in idx]
        ok = set()
        for perm in itertools.permutations(range(len(shown))):
            c = "\n".join(shown[i] for i in perm)
            try:
                compile(c, "<o>", "exec")
            except SyntaxError:
                continue
            o, e, t2 = run_lines(c)
            if not e and label(o, e) == target and t2 == trail:
                ok.add(",".join(map(str, perm)))
        sol = ",".join(str(idx.index(i)) for i in range(len(lines)))
        assert sol in ok
        q = {"t": "order", "lines": shown, "target": target, "ok": sorted(ok), "sol": sol, "why": why}
        self._add(q, ("o", code))
        return q

    def bug(self, lines, bad, fix, why=""):
        broken = "\n".join(lines)
        fixed_lines = list(lines)
        fixed_lines[bad] = fix
        fixed = "\n".join(fixed_lines)
        fo, fe = run(fixed)
        assert not fe, (fixed, fe)
        bo, be = run(broken)
        expect = label(fo, fe)
        got = label(bo, be)
        assert got != expect, (broken,)
        q = {"t": "bug", "lines": lines, "bad": bad, "fix": fix, "expect": expect, "got": got, "why": why}
        self._add(q, ("g", broken))
        return q


def card(h, body, code=None, flow=None, trace=None, check=None):
    c = {"h": h, "body": body}
    if code is not None:
        out, err = run(code)
        c["code"] = code
        c["out"] = label(out, err)
    if flow:
        c["flow"] = flow
    if trace:
        c["trace"] = trace
    if check:
        c["check"] = check
    return c


def check(code, variants=(), extra=(), why=""):
    import zlib
    b = Bank(zlib.crc32(code.encode()))
    return b.predict(code, variants, extra, why, n=3, mind=1)


def _trace(self, setup, header, body, cols, why=""):
    import zlib
    shown = setup + [header] + body
    code = "\n".join(shown)
    out, err = run(code)
    assert not err, (code, err)
    snaps = []
    ind = " " * (len(body[0]) - len(body[0].lstrip()))
    inst = "\n".join(setup + [header] + body + [ind + "__snap__(" + ", ".join(cols) + ")"])
    g = {"__name__": "__main__", "__snap__": lambda *v: snaps.append([repr(x) for x in v])}
    buf = io.StringIO()
    with redirect_stdout(buf):
        exec(compile(inst, "<t>", "exec"), g)
    assert 2 <= len(snaps) <= 5, (code, len(snaps))
    first = []
    gi = {"__name__": "__main__"}
    with redirect_stdout(io.StringIO()):
        exec(compile("\n".join(setup), "<s>", "exec"), gi)
    for c in cols:
        first.append(repr(gi[c]) if c in gi else None)
    cells = []
    for r, row in enumerate(snaps):
        for c, val in enumerate(row):
            pool = []
            if r > 0:
                pool.append(snaps[r - 1][c])
            if r + 1 < len(snaps):
                pool.append(snaps[r + 1][c])
            if first[c] is not None:
                pool.append(first[c])
            try:
                v = eval(val)
                if isinstance(v, int) and not isinstance(v, bool):
                    pool += [repr(v + 1), repr(v - 1), repr(v * 2)]
                if isinstance(v, str):
                    pool += [repr(v[::-1]), repr(v[:-1]), repr(v.upper())]
                if isinstance(v, list):
                    pool += [repr(v[:-1]), repr(v[1:] + v[:1])]
                if isinstance(v, dict):
                    pool += [repr({k: x + 1 for k, x in v.items()}) if all(isinstance(x, int) for x in v.values()) else "{}"]
            except Exception:
                pass
            opts = []
            for p in pool:
                if p != val and p not in opts and p is not None:
                    opts.append(p)
            assert len(opts) >= 2, (code, val, pool)
            pick = opts[:2]
            choice = pick + [val]
            self.rng.shuffle(choice)
            cells.append(choice)
    q = {"t": "trace", "code": code, "cols": cols, "rows": snaps, "opts": cells, "why": why}
    self._add(q, ("t", code))
    return q


Bank.trace = _trace
