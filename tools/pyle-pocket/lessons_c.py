from engine import card, check

LISTS = [["tea", "soup", "pie"], ["red", "green", "blue", "gold"], ["owl", "cat", "fox"]]
NUMS = [[3, 1, 2], [5, 9, 4, 7], [8, 2, 6]]


def l10(b):
    r = b.rng
    for items in LISTS:
        n = len(items)
        i = r.randint(0, n - 1)
        b.predict(f"items = {items!r}\nprint(items[{i}])", [f"items = {items!r}\nprint(items[{(i + 1) % n}])", f"items = {items!r}\nprint(items[{i - 1}])"],
                  extra=[f"['{items[i]}']"], why="Lists count from 0, just like strings.")
        b.predict(f"items = {items!r}\nprint(items[-1])", [f"items = {items!r}\nprint(items[0])", f"items = {items!r}\nprint(items[-2])"],
                  why="-1 is the last item.")
        b.predict(f"items = {items!r}\nprint(len(items))", [f"print({n - 1})", f"print({n + 1})", f"items = {items!r}\nprint(len(items[0]))"],
                  why="len() counts the items in the list.")
        b.predict(f'items = {items!r}\nitems.append("jam")\nprint(items)',
                  [f'items = {items!r}\nitems.insert(0, "jam")\nprint(items)', f"print({items!r})", f'items = {items!r}\nitems.append("jam")\nprint(len(items))'],
                  why=".append() adds to the end and changes the list itself.")
        b.predict(f"items = {items!r}\nitems.pop()\nprint(items)", [f"items = {items!r}\nitems.pop(0)\nprint(items)", f"print({items!r})"],
                  why=".pop() with nothing in the brackets removes the LAST item.")
        b.predict(f'items = {items!r}\nprint("{items[1]}" in items)', [f'items = {items!r}\nprint("jam" in items)', f'print("{items[1]}")'],
                  why="in checks whether the item is somewhere in the list.")
        b.predict(f"items = {items!r}\nprint(items[{n}])", [f"items = {items!r}\nprint(items[-1])", f"items = {items!r}\nprint(items[{n - 1}])"], extra=["None", "(nothing printed)"],
                  why=f"{n} items means positions 0 to {n - 1}. Past the end is an IndexError.")
    for nums in NUMS:
        b.predict(f"nums = {nums!r}\nnums.sort()\nprint(nums)", [f"print({nums!r})", f"nums = {nums!r}\nnums.sort(reverse=True)\nprint(nums)"],
                  why=".sort() puts the list in order, smallest first.")
        b.predict(f"nums = {nums!r}\nprint(nums.sort())", [f"nums = {nums!r}\nprint(sorted(nums))", f"print({nums!r})"],
                  why=".sort() changes the list but gives back None. Use sorted(nums) to get a sorted copy.")
        b.predict(f"nums = {nums!r}\nprint(sum(nums), max(nums))", [f"nums = {nums!r}\nprint(len(nums), max(nums))", f"nums = {nums!r}\nprint(sum(nums), min(nums))"],
                  why="sum adds them all, max finds the biggest.")
        b.predict(f"nums = {nums!r}\nnums[0] = 100\nprint(nums)", [f"print({nums!r})", f"nums = {nums!r}\nnums.append(100)\nprint(nums)"],
                  why="Lists can change in place. [0] = 100 replaces the first item.")
    b.predict("a = [1, 2]\nb = a\nb.append(3)\nprint(a)", ["print([1, 2])", "print([3])"],
              why="b = a does not copy. Both names point at the SAME list.")
    b.predict("a = [1, 2]\nb = a.copy()\nb.append(3)\nprint(a)", ["print([1, 2, 3])", "print([3])"],
              why=".copy() makes a real second list.")
    for items in LISTS:
        b.fill(f"items = {items!r}\nprint(items[___])", ["0", "1", "-1"], why=f"{items[0]} is the first item, at 0.")
        b.fill(f'items = {items!r}\nitems.___("jam")\nprint(items)', ["append", "remove", "count"], why=".append() adds to the end.")
    for items in LISTS[:2]:
        b.build(f"items = {items!r}", ["print(", "items[-1]", ")"], ["items[1]", "items"], ask="Print the last item.", why="-1 is the last.")
        b.build(f"items = {items!r}", ["print(", "len(items)", ")"], ["items", "len(items) - 1"], ask="Print how many items there are.",
                why="len() counts them.")
    b.order(["items = []", 'items.append("tea")', 'items.append("pie")', "print(items)"], why="Start with an empty list, then add in order.")
    b.order(["nums = [4, 1, 3]", "nums.sort()", "print(nums[0])"], why="Sort first, then the smallest is at [0].")
    b.bug(['items = ["a", "b", "c"]', "print(items[3])"], 1, "print(items[2])", why="Three items: 0, 1, 2. [3] is past the end.")
    b.bug(["nums = [3, 1, 2]", "nums = nums.sort()", "print(nums)"], 1, "nums.sort()", why=".sort() returns None. Storing it wipes your list.")
    return [
        card("A list holds many values",
             ["Square brackets, items split by commas.", "Count from 0. `-1` is the last."],
             code='items = ["tea", "soup", "pie"]\nprint(items[0])\nprint(items[-1])\nprint(len(items))',
             trace={"cols": ['"tea"', '"soup"', '"pie"'], "rows": [["0", "1", "2"], ["-3", "-2", "-1"]]},
             check=check('items = ["a", "b", "c"]\nprint(items[1])', ['items = ["a", "b", "c"]\nprint(items[0])'], why="0 is a, 1 is b.")),
        card("Lists can change",
             ["`.append(x)` adds to the end.", "`.pop()` removes the last.", "`items[0] = x` replaces one."],
             code='items = ["tea"]\nitems.append("pie")\nprint(items)\nitems.pop()\nprint(items)',
             check=check('items = [1]\nitems.append(2)\nprint(items)', ["print([1])", "print([2])"], why="append adds 2 onto the end.")),
        card("Useful tools",
             ["`in` checks membership.", "`sum`, `max`, `min` work on numbers.", "`.sort()` sorts in place. `sorted()` gives a copy."],
             code="nums = [5, 9, 4]\nprint(9 in nums)\nprint(sum(nums), max(nums))\nprint(sorted(nums))",
             check=check("nums = [2, 8]\nprint(max(nums))", ["print(2)", "print(10)"], why="max finds the biggest.")),
    ]


DICTS = [{"tea": 3, "pie": 5}, {"owl": 2, "cat": 4, "fox": 1}, {"red": 10, "blue": 7}]


def l11(b):
    for d in DICTS:
        k = list(d)[0]
        b.predict(f'stock = {d!r}\nprint(stock["{k}"])', [f'stock = {d!r}\nprint(stock["{list(d)[1]}"])', f'print("{k}")', f'stock = {d!r}\nprint(stock)'],
                  why="d[key] looks up the value stored under that key.")
        b.predict(f'stock = {d!r}\nprint(stock["jam"])', [f'stock = {d!r}\nprint(stock.get("jam"))', "print(0)"],
                  why="Asking for a key that is not there raises KeyError.")
        b.predict(f'stock = {d!r}\nprint(stock.get("jam", 0))', [f'stock = {d!r}\nprint(stock["jam"])', f'stock = {d!r}\nprint(stock.get("jam"))'],
                  why=".get(key, default) gives the default instead of crashing.")
        b.predict(f'stock = {d!r}\nstock["jam"] = 9\nprint(len(stock))', [f"print({len(d)})", "print(9)"],
                  why="Assigning to a new key adds it.")
        b.predict(f'stock = {d!r}\nstock["{k}"] = 0\nprint(stock)', [f"print({d!r})", f'stock = {d!r}\nstock["new"] = 0\nprint(stock)'],
                  why="Assigning to an existing key replaces its value.")
        b.predict(f'stock = {d!r}\nprint("{k}" in stock)', [f'stock = {d!r}\nprint({d[k]} in stock)', f'print("{k}")'],
                  why=f"in checks the KEYS. {k} is a key.")
        b.predict(f'stock = {d!r}\nprint({list(d.values())[0]} in stock)', [f'stock = {d!r}\nprint("{k}" in stock)', f'print({list(d.values())[0]})'],
                  why="in only looks at keys, never values.")
        b.predict(f"stock = {d!r}\nfor name, n in stock.items():\n    print(name, n)",
                  [f"stock = {d!r}\nfor name in stock:\n    print(name)", f"print({d!r})"],
                  why=".items() gives key and value together each lap.")
    for d in DICTS:
        k = list(d)[0]
        b.fill(f'stock = {d!r}\nprint(stock.get("jam", ___))', ["0", '"none"', "None"], why="The second argument to .get is what you get back when the key is missing.")
        b.fill(f'stock = {d!r}\nprint(stock[___])', [f'"{k}"', k if False else f'"{list(d)[1]}"', "0"], why="Look up with the key, in quotes.")
    for d in DICTS[:2]:
        k = list(d)[1]
        b.build(f"stock = {d!r}", ["print(", f'stock["{k}"]', ")"], [f'"{k}"', "stock[1]"], ask=f"Print how many {k} there are.",
                why="Look it up by key with square brackets.")
    b.order(["ages = {}", 'ages["Ada"] = 30', 'ages["Kai"] = 25', 'print(ages["Kai"])'], why="Make the dict, fill it, then look up.")
    b.order(['stock = {"tea": 3}', 'stock["tea"] = stock["tea"] + 1', 'print(stock["tea"])'], why="Read the old value, add 1, store it back.")
    b.bug(['stock = {"tea": 3}', 'print(stock["pie"])'], 1, 'print(stock.get("pie", 0))', why="pie is not a key: KeyError. .get with a default is safe.")
    b.bug(['stock = {"tea": 3}', "print(stock[0])"], 1, 'print(stock["tea"])', why="Dicts use keys, not positions. 0 is not a key.")
    return [
        card("A dict links keys to values",
             ["Curly brackets: `{key: value}`.", "Look up with the key: `d[key]`.", "Keys are usually text."],
             code='stock = {"tea": 3, "pie": 5}\nprint(stock["pie"])',
             trace={"cols": ["key", "value"], "rows": [['"tea"', "3"], ['"pie"', "5"]]},
             check=check('ages = {"Ada": 30}\nprint(ages["Ada"])', ['print("Ada")'], why="The value stored under Ada is 30.")),
        card("Add, change, check",
             ["`d[key] = value` adds or replaces.", "`key in d` checks keys only.", "`d.get(key, default)` never crashes."],
             code='stock = {"tea": 3}\nstock["pie"] = 5\nprint("pie" in stock)\nprint(stock.get("jam", 0))',
             check=check('d = {"a": 1}\nprint(d.get("b", 0))', ['d = {"a": 1}\nprint(d["b"])'], why="b is missing, so you get the default 0.")),
        card("Loop over a dict",
             ["`for k in d:` gives keys.", "`for k, v in d.items():` gives both."],
             code='stock = {"tea": 3, "pie": 5}\nfor name, n in stock.items():\n    print(name, n)',
             check=check('d = {"x": 1}\nfor k in d:\n    print(k)', ['print(1)'], why="Looping a dict gives its keys.")),
    ]


def l12(b):
    for a, c in [(2, 3), (4, 5), (10, 1)]:
        b.predict(f"def add(a, b):\n    return a + b\n\nprint(add({a}, {c}))", [f"print({a}, {c})", f"def add(a, b):\n    print(a + b)\n\nprint(add({a}, {c}))"],
                  why="return hands the answer back to whoever called the function.")
        b.predict(f"def add(a, b):\n    print(a + b)\n\nx = add({a}, {c})\nprint(x)", [f"print({a + c})", f"print({a + c})\nprint({a + c})"], extra=["None"],
                  why="The function prints, but returns nothing. A function with no return gives None.")
    for n in ["Ada", "Kai"]:
        b.predict(f'def greet(name="friend"):\n    return "Hi " + name\n\nprint(greet())', [f'print("Hi {n}")', 'print("Hi name")'],
                  why='No argument given, so the default "friend" is used.')
        b.predict(f'def greet(name="friend"):\n    return "Hi " + name\n\nprint(greet("{n}"))', ['print("Hi friend")', 'print("Hi name")'],
                  why="An argument you pass in replaces the default.")
    b.predict("def double(x):\n    return x * 2\n    print('after')\n\nprint(double(4))", ["print(8)\nprint('after')", "print(4)"],
              why="return ends the function. Lines after it never run.")
    b.predict("def f():\n    y = 5\n\nf()\nprint(y)", ["print(5)", "print(None)"], why="y only lives inside f. Outside it does not exist: NameError.")
    b.predict("x = 1\ndef f():\n    x = 99\n\nf()\nprint(x)", ["print(99)", "print(None)"], why="The x inside f is a separate local box. The outer x stays 1.")
    b.predict("def square(n):\n    return n * n\n\nprint(square(square(2)))", ["print(4)", "print(8)"], why="Inside first: square(2) is 4. Then square(4) is 16.")
    b.predict("def f(a, b):\n    return a - b\n\nprint(f(b=2, a=10))", ["print(-8)", "print(2)"], why="Named arguments match by name, not by order.")
    for a, c in [(3, 4), (6, 2)]:
        b.fill(f"def mul(a, b):\n    ___ a * b\n\nprint(mul({a}, {c}))", ["return", "print", "pass"], why="return gives the value back so print can show it.")
    b.fill('def greet(name):\n    return "Hi " + name\n\nprint(___("Ada"))', ["greet", "name", "print"], why="Call the function by its name.")
    b.build("def add(a, b):\n    return a + b", ["print(", "add(", "2", ",", "3", ")", ")"], ask="Print the result of add with 2 and 3.",
            why="Call it inside print.")
    b.order(["def double(x):", "    return x * 2", "print(double(5))"], why="Define first, call after.")
    b.order(["def area(w, h):", "    a = w * h", "    return a", "print(area(3, 4))"], why="Body lines are indented. The call is not.")
    b.bug(["def add(a, b):", "    a + b", "", "print(add(2, 3))"], 1, "    return a + b", why="Without return, the function gives back None.")
    b.bug(["def greet(name)", '    return "Hi " + name', 'print(greet("Ada"))'], 0, "def greet(name):", why="def lines end with a colon.")
    return [
        card("A function is a reusable recipe",
             ["`def name(inputs):` starts it.", "The indented body is the recipe.", "Call it with `name(values)`."],
             code="def double(x):\n    return x * 2\n\nprint(double(4))\nprint(double(10))",
             flow=["double(4)", "x = 4 inside the function", "return 4 * 2", "8 comes back out"],
             check=check("def add1(n):\n    return n + 1\n\nprint(add1(6))", ["print(6)", "print(1)"], why="n is 6, returns 7.")),
        card("return vs print",
             ["`print` only shows. `return` hands the value back.", "No return means you get `None`."],
             code="def a():\n    print(5)\n\ndef b():\n    return 5\n\nx = a()\ny = b()\nprint(x, y)",
             check=check("def f():\n    print(1)\n\nprint(f())", ["print(1)"], why="f prints 1, then returns None, which the outer print shows.")),
        card("Defaults and names",
             ["`def greet(name=\"friend\"):` gives a default.", "Boxes made inside a function stay inside it."],
             code='def greet(name="friend"):\n    return "Hi " + name\n\nprint(greet())\nprint(greet("Ada"))',
             check=check('def f(n=3):\n    return n * 2\n\nprint(f())', ["print(0)", "print(None)"], why="No argument, so n = 3. 3 * 2 = 6.")),
    ]


def l13(b):
    cases = [("print(10 / 0)", "ZeroDivisionError"), ('print(int("hi"))', "ValueError"), ('print("a" + 1)', "TypeError"),
             ("print(nope)", "NameError"), ("print([1, 2][5])", "IndexError"), ('print({"a": 1}["b"])', "KeyError"),
             ('print("abc".upper)', None)]
    pool = ["print(10 / 0)", 'print(int("hi"))', 'print("a" + 1)', "print(nope)", "print([1, 2][5])", 'print({"a": 1}["b"])']
    for code, _ in cases[:6]:
        b.predict(code, [p for p in pool if p != code], why="Read the error name: it tells you what kind of problem it is.")
    for v in ['"12"', '"twelve"', '"3.5"']:
        b.predict(f'try:\n    n = int({v})\n    print(n)\nexcept ValueError:\n    print("not a number")',
                  ['print("not a number")', f'print({v})', 'print(12)'], extra=["12\nnot a number", "ValueError"],
                  why="If the try block crashes, Python jumps to the matching except.")
    for c in [0, 2, 5]:
        b.predict(f'try:\n    print(10 / {c})\nexcept ZeroDivisionError:\n    print("oops")', ['print("oops")', "print(5.0)", "print(0)"],
                  why="except only runs when the error actually happens.")
    b.predict('try:\n    print("a")\n    x = 1 / 0\n    print("b")\nexcept ZeroDivisionError:\n    print("c")',
              ['print("a")\nprint("b")\nprint("c")', 'print("c")', 'print("a")\nprint("b")'],
              why="a prints, then the crash. b is skipped, except prints c.")
    b.predict('try:\n    print(1 / 0)\nexcept ValueError:\n    print("caught")', ['print("caught")', "print(0)"],
              why="except ValueError does not catch a ZeroDivisionError. It still crashes.")
    b.predict('try:\n    x = 5\nexcept:\n    print("bad")\nelse:\n    print("fine")\nfinally:\n    print("end")',
              ['print("bad")\nprint("end")', 'print("fine")', 'print("end")'],
              why="No error: else runs. finally ALWAYS runs.")
    for code, err in [("x = int('a')", "ValueError"), ("x = 1 / 0", "ZeroDivisionError"), ("x = [0][3]", "IndexError")]:
        others = [e for e in ["ValueError", "ZeroDivisionError", "IndexError", "KeyError"] if e != err][:2]
        b.fill(f'try:\n    {code}\nexcept ___:\n    print("caught")', [err] + others, why=f"The error raised here is {err}.")
    b.order(["try:", '    n = int("x")', "except ValueError:", '    print("bad input")'], why="try block, then the except that catches it.")
    b.bug(["try:", "    print(1 / 0)", "except ValueError:", '    print("caught")'], 2, "except ZeroDivisionError:",
          why="Catch the error that actually happens: ZeroDivisionError.")
    b.bug(["try", "    x = 1", "except:", "    pass", "print(x)"], 0, "try:", why="try needs a colon too.")
    return [
        card("Errors have names",
             ["The last line of a crash names the problem.", "That name tells you where to look."],
             code=None,
             trace={"cols": ["error", "means"], "rows": [["NameError", "unknown name (typo?)"], ["TypeError", "wrong kinds mixed"], ["ValueError", "right type, bad value"], ["IndexError", "position past the end"], ["KeyError", "dict key missing"], ["ZeroDivisionError", "divided by 0"]]},
             check=check('print("a" + 1)', ['print(int("a"))', "print(nope)"], why="Text + number: wrong kinds mixed.")),
        card("try / except: plan B",
             ["Put risky code under `try:`.", "If it crashes, `except` runs instead of crashing.", "Name the error you expect."],
             code='try:\n    n = int("hi")\nexcept ValueError:\n    print("not a number")',
             flow=["try: run the risky line", {"if": "did it crash?", "yes": "jump to except", "no": "skip except"}, "carry on"],
             check=check('try:\n    print(10 / 2)\nexcept ZeroDivisionError:\n    print("oops")', ['print("oops")'], why="No crash, so except is skipped.")),
    ]


def l14(b):
    for t in [(1, 2), (3, 7, 9), ("tea", "pie")]:
        b.predict(f"point = {t!r}\nprint(point[0])", [f"point = {t!r}\nprint(point[1])", f"print({t!r})"], why="Tuples index like lists.")
        b.predict(f"point = {t!r}\npoint[0] = 5\nprint(point)", [f"print({t!r})", f"point = list({t!r})\npoint[0] = 5\nprint(point)"],
                  why="Tuples cannot change. Assigning raises TypeError.")
    for a, c in [(1, 2), (5, 9)]:
        b.predict(f"a, b = {a}, {c}\na, b = b, a\nprint(a, b)", [f"print({a}, {c})", f"print({c}, {c})"],
                  why="Python packs the right side first, so the swap works in one line.")
    for nums in [[1, 1, 2, 3, 3], [5, 5, 5], [2, 4, 2, 4, 6]]:
        b.predict(f"print(len(set({nums!r})))", [f"print(len({nums!r}))", f"print(set({nums!r}))"],
                  why="A set keeps each value only once.")
    b.predict("a = {1, 2, 3}\nb = {2, 3, 4}\nprint(a & b)", ["a = {1, 2, 3}\nb = {2, 3, 4}\nprint(a | b)", "print({1, 4})"],
              why="& keeps what is in BOTH.")
    b.predict("a = {1, 2, 3}\nb = {2, 3, 4}\nprint(a | b)", ["a = {1, 2, 3}\nb = {2, 3, 4}\nprint(a & b)", "print({1, 4})"],
              why="| combines everything (each once).")
    b.predict("a = {1, 2, 3}\nb = {2, 3, 4}\nprint(a - b)", ["a = {1, 2, 3}\nb = {2, 3, 4}\nprint(b - a)", "print({2, 3})"],
              why="a - b: what a has that b does not.")
    b.predict("s = {3, 1}\ns.add(1)\nprint(len(s))", ["print(3)", "print(1)"], why="1 is already in the set, so nothing changes.")
    b.predict("name, age = (\"Ada\", 30)\nprint(age)", ['print("Ada")', 'print(("Ada", 30))'], why="Unpacking: the first goes to name, the second to age.")
    b.fill("a = {1, 2, 3}\nb = {3, 4}\nprint(a ___ b)", ["&", "|", "-"], why="Only 3 is in both: &.")
    b.fill("x, y = 4, 9\nx, y = ___\nprint(x, y)", ["y, x", "x, y", "y, y"], why="Put them on the right in swapped order.")
    b.order(["nums = [2, 2, 5]", "unique = set(nums)", "print(len(unique))"], why="Make the set, then count it.")
    b.bug(["p = (1, 2)", "p[0] = 9", "print(p)"], 0, "p = [1, 2]", why="Tuples are fixed. Use a list if it must change.")
    return [
        card("Tuples: fixed lists",
             ["Round brackets: `(1, 2)`.", "Index like a list.", "Cannot change after making it."],
             code="p = (4, 7)\nprint(p[1])\nx, y = p\nprint(x, y)",
             check=check("p = (8, 9)\nprint(p[0])", ["print(9)"], why="[0] is the first: 8.")),
        card("Sets: no duplicates",
             ["Curly brackets, no keys: `{1, 2}`.", "Each value once. `set(list)` removes repeats.", "`&` both, `|` either, `-` only the left."],
             code="print(set([1, 1, 2]))\nprint({1, 2} & {2, 3})",
             check=check("print(len({1, 1, 1}))", ["print(3)"], why="Three 1s become one.")),
    ]


def l15(b):
    for n in [3, 4, 5]:
        b.predict(f"print([x * 2 for x in range({n})])", [f"print([x for x in range({n})])", f"print([x * 2 for x in range(1, {n + 1})])", f"print(list(range({n})) * 2)"],
                  why="For each x, put x * 2 in the new list.")
        b.predict(f"print([x for x in range({n * 2}) if x % 2 == 0])", [f"print([x for x in range({n * 2}) if x % 2 == 1])", f"print(list(range({n * 2})))"],
                  why="The if at the end filters: only even x get in.")
    for words in [["tea", "pie"], ["owl", "cat", "fox"]]:
        b.predict(f"print([w.upper() for w in {words!r}])", [f"print({words!r})", f"print([w[0] for w in {words!r}])"],
                  why="Each word gets .upper() and goes in the new list.")
        b.predict(f"print([len(w) for w in {words!r}])", [f"print(len({words!r}))", f"print([w for w in {words!r}])"],
                  why="The new list holds the length of each word.")
    b.predict("print(sum([x for x in range(4)]))", ["print([0, 1, 2, 3])", "print(4)"], why="The list is 0, 1, 2, 3. sum adds them: 6.")
    b.predict('print({w: len(w) for w in ["hi", "tea"]})', ['print(["hi", "tea"])', 'print([2, 3])'], why="A dict comprehension makes key: value pairs.")
    b.fill("print([x ___ 3 for x in range(3)])", ["*", "+", "-"], why="0, 3, 6 means each x times 3.")
    b.fill("print([x for x in range(6) if x ___ 3])", [">", "<", "=="], why="Only 4 and 5 pass, so x > 3.")
    b.build("", ["print(", "[x * x", "for x in", "range(4)]", ")"], ["range(5)]", "[x + x"], ask="Print the squares 0, 1, 4, 9.",
            why="x * x for each x from 0 to 3.")
    b.order(["nums = [1, 2, 3, 4]", "evens = [n for n in nums if n % 2 == 0]", "print(evens)"], why="Make the list, filter it, print it.")
    b.bug(["nums = [1, 2, 3]", "doubled = [n * 2 for n in nums", "print(doubled)"], 1, "doubled = [n * 2 for n in nums]",
          why="Close the square bracket.")
    return [
        card("A list in one line",
             ["`[what for x in source]`.", "Read it: make `what`, for each x in source."],
             code="squares = [x * x for x in range(4)]\nprint(squares)",
             trace={"cols": ["x", "x * x"], "rows": [["0", "0"], ["1", "1"], ["2", "4"], ["3", "9"]]},
             check=check("print([x + 1 for x in range(3)])", ["print([0, 1, 2])"], why="0+1, 1+1, 2+1.")),
        card("Add a filter",
             ["`[x for x in source if test]`.", "Only items that pass the test get in."],
             code="print([x for x in range(10) if x % 3 == 0])",
             flow=[{"loop": "next x?", "body": "if test True: add x"}, "new list"],
             check=check("print([x for x in range(5) if x > 2])", ["print([0, 1, 2])"], why="Only 3 and 4 are above 2.")),
    ]


def l16(b):
    for n, s in [("Roux", 3), ("Junie", 5), ("Kai", 2)]:
        b.predict(f'class Cat:\n    def __init__(self, name):\n        self.name = name\n\nc = Cat("{n}")\nprint(c.name)',
                  ['print("name")', 'print("Cat")'], extra=["<Cat object>"],
                  why="__init__ stores the name on the object. c.name reads it.")
        b.predict(f'class Train:\n    def __init__(self, speed):\n        self.speed = speed\n    def faster(self):\n        self.speed = self.speed + 1\n\nt = Train({s})\nt.faster()\nt.faster()\nprint(t.speed)',
                  [f"print({s})", f"print({s + 1})", f"print({s * 2})"], why="Each call to faster adds 1 to this train's speed.")
    b.predict('class Box:\n    def __init__(self, v):\n        self.v = v\n\na = Box(1)\nb = Box(2)\na.v = 9\nprint(b.v)', ["print(9)", "print(1)"],
              why="Each object has its own boxes. Changing a does not touch b.")
    b.predict('class Dog:\n    def speak(self):\n        return "woof"\n\nd = Dog()\nprint(d.speak())', ['print("speak")', "print(None)"],
              why="Call the method on the object with brackets.")
    b.predict('class Dog:\n    def speak():\n        return "woof"\n\nd = Dog()\nprint(d.speak())', ['print("woof")', "print(None)"],
              why="Methods need self as their first parameter. Without it Python raises TypeError.")
    b.fill('class Cat:\n    def __init__(self, name):\n        ___.name = name\n\nprint(Cat("Roux").name)', ["self", "Cat", "name"],
           why="self is this object. self.name stores the name on it.")
    b.order(["class Owl:", "    def __init__(self, name):", "        self.name = name", 'o = Owl("Hoot")', "print(o.name)"],
            why="Class first, then make an object, then use it.")
    b.bug(["class Cat:", "    def __init__(self, name):", "        name = name", 'c = Cat("Roux")', "print(c.name)"], 2, "        self.name = name",
          why="Without self. the name is a local box that disappears. AttributeError.")
    return [
        card("A class is a blueprint",
             ["`class Name:` describes a kind of thing.", "`Name(...)` makes one object from it.", "`__init__` sets it up. `self` is the object itself."],
             code='class Cat:\n    def __init__(self, name):\n        self.name = name\n\nc = Cat("Roux")\nprint(c.name)',
             flow=['Cat("Roux")', "new empty object = self", 'self.name = "Roux"', "object stored in c"],
             check=check('class P:\n    def __init__(self, x):\n        self.x = x\n\nprint(P(4).x)', ['print("x")'], extra=["None"], why="P(4) stores 4 in self.x.")),
        card("Methods are functions on the object",
             ["Defined inside the class, first parameter `self`.", "Called with a dot: `obj.method()`."],
             code='class Train:\n    def __init__(self):\n        self.speed = 0\n    def go(self):\n        self.speed = self.speed + 10\n\nt = Train()\nt.go()\nprint(t.speed)',
             check=check('class C:\n    def __init__(self):\n        self.n = 1\n    def up(self):\n        self.n = self.n * 2\n\nc = C()\nc.up()\nc.up()\nprint(c.n)', ["print(2)", "print(1)"], why="1, then 2, then 4.")),
    ]
