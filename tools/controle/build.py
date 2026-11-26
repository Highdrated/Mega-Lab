import os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
src = open(os.path.join(HERE, "controle-demo.html"), encoding="utf-8").read()
swaps = [
    ("const KEY='controle.demo.v1';", "const KEY='controle.v1';"),
    ("This demo covers five days and nights", "So far Controle covers five days and nights"),
    ('<div class="kicker">End of the demo</div>', '<div class="kicker">Still being built</div>'),
]
for a, b in swaps:
    if src.count(a) != 1:
        sys.exit("build.py: expected exactly one of: " + a)
    src = src.replace(a, b)
src = src.replace('src="img/', 'src="img/controle/')
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "labs", "controle.html")
open(out, "w", encoding="utf-8").write(src)
art = os.path.join(os.path.dirname(out), "img", "controle")
os.makedirs(art, exist_ok=True)
for f in os.listdir(os.path.join(HERE, "img")):
    shutil.copy2(os.path.join(HERE, "img", f), os.path.join(art, f))
print("wrote", out)
