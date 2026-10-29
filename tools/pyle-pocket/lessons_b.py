from engine import card, check


def l6(b):
    for a, c in [(5, 3), (2, 9), (4, 4), (7, 7), (1, 0)]:
        b.predict(f"print({a} > {c})", [f"print({a} < {c})", f"print({a} >= {c} and {a} != {c} or {a} == {c})", "print('yes')"],
                  extra=["True", "False"], why=f"Is {a} bigger than {c}? A comparison always gives True or False.")
        b.predict(f"print({a} == {c})", [f"print({a} != {c})", "print('yes')"], extra=["True", "False"],
                  why="== asks: are these equal?")
        b.predict(f"print({a} != {c})", [f"print({a} == {c})", "print('no')"], extra=["True", "False"],
                  why="!= asks: are these different?")
    for x in [3, 8, 12, 15, 20]:
        b.predict(f"x = {x}\nprint(x > 5 and x < 10)", [f"x = {x}\nprint(x > 5 or x < 10)", "print('maybe')"], extra=["True", "False"],
                  why="and needs BOTH sides True.")
        b.predict(f"x = {x}\nprint(x < 5 or x > 10)", [f"x = {x}\nprint(x < 5 and x > 10)", "print('maybe')"], extra=["True", "False"],
                  why="or needs at least ONE side True.")
    for v in ["True", "False"]:
        b.predict(f"print(not {v})", [f"print({v})", "print('not')"], extra=["None"], why="not flips True and False.")
    b.predict('print(5 == "5")', ["print(5 == 5)", 'print("5")'], extra=["TypeError"],
              why="A number is never equal to text, even if they look alike.")
    b.predict("print(5 == 5.0)", ["print(5 == 6)", "print(5.0)"], extra=["TypeError"], why="Python compares the value: 5 and 5.0 are the same amount.")
    b.predict('print("apple" < "banana")', ['print("apple" > "banana")', 'print("apple")'], extra=["TypeError"],
              why="Text compares like a dictionary: a comes before b.")
    for a, c in [(4, 4), (3, 8), (6, 2)]:
        b.fill(f"a = {a}\nb = {c}\nprint(a ___ b)", ["==", "!=", ">"] if a == c else ["!=", "==", "<="] if a > c else ["<", ">", "=="],
               why="Pick the comparison that matches the output.")
    for x in [12, 3]:
        b.fill(f"x = {x}\nprint(x > 5 ___ x < 10)", ["and", "or"], why="Only one side is True. and needs both, so the answer is False.")
        b.fill(f"x = {x}\nprint(x > 5 ___ x < 10)", ["or", "and"], why="Only one side is True. or is happy with one.")
    b.build("x = 7", ["print(", "x > 5", "and", "x < 10", ")"], ["or", "not"],
            ask="Print whether x is between 5 and 10.", why="Between means bigger than 5 AND smaller than 10.")
    b.build("age = 15", ["print(", "age", ">=", "18", ")"], ["=", "<"], ask="Print whether age is 18 or more.", why=">= means at least.")
    b.bug(["x = 5", "print(x = 5)"], 1, "print(x == 5)", why="= stores a value. == compares. Inside print you want ==.")
    b.bug(["a = 3", "b = 4", "print(a => b)"], 2, "print(a >= b)", why="It is written >= (bigger-or-equal), not =>.")
    return [
        card("Questions that answer True or False",
             ["`==` equal, `!=` not equal.", "`<` `>` `<=` `>=` compare sizes.", "The answer is a bool: True or False."],
             code="print(3 == 3)\nprint(3 != 3)\nprint(2 < 9)",
             check=check("print(4 >= 4)", ["print(4 > 4)"], why=">= is bigger OR equal. 4 equals 4.")),
        card("= is not ==",
             ["`x = 5` STORES 5 in x.", "`x == 5` ASKS whether x is 5."],
             code="x = 5\nprint(x == 5)",
             check=check("x = 2\nprint(x == 3)", ["print(3)"], extra=["2"], why="x is 2, so the question is answered False.")),
        card("and, or, not",
             ["`and`: both must be True.", "`or`: one is enough.", "`not`: flips it."],
             code="print(True and False)\nprint(True or False)\nprint(not True)",
             flow=[{"if": "left True?", "yes": "and: check right side", "no": "and: False straight away"}],
             check=check("x = 8\nprint(x > 5 and x < 10)", ["x = 8\nprint(x > 5 and x > 10)"], why="8 > 5 and 8 < 10: both True.")),
    ]


def l7(b):
    for t in [3, 7, 10, 15]:
        b.predict(f'temp = {t}\nif temp > 8:\n    print("warm")\nelse:\n    print("cold")',
                  ['print("warm")', 'print("cold")', 'print("warm")\nprint("cold")'],
                  why=f"{t} > 8 is {t > 8}, so the {'if' if t > 8 else 'else'} side runs.")
    for s in [95, 72, 55, 30]:
        b.predict(f'score = {s}\nif score >= 80:\n    print("A")\nelif score >= 50:\n    print("B")\nelse:\n    print("C")',
                  ['print("A")', 'print("B")', 'print("C")', 'print("A")\nprint("B")'],
                  why="Python checks top to bottom and runs only the FIRST branch that is True.")
    for s in [95, 72]:
        b.predict(f'score = {s}\nif score >= 50:\n    print("pass")\nelif score >= 80:\n    print("great")',
                  ['print("great")', 'print("pass")\nprint("great")'], extra=["(nothing printed)"],
                  why="score >= 50 is checked first and is True, so elif is never looked at. Order matters.")
    for x in [4, 12]:
        b.predict(f'x = {x}\nif x > 10:\n    print("big")\nprint("done")',
                  ['print("big")\nprint("done")', 'print("done")', 'print("big")'],
                  why="print('done') is not indented, so it always runs.")
    for x in [4, 12]:
        b.predict(f'x = {x}\nif x > 10:\n    print("big")\n    print("done")',
                  ['print("big")\nprint("done")', 'print("done")', 'print("big")'], extra=["(nothing printed)"],
                  why="Both prints are indented, so both belong to the if.")
    for n in [4, 7]:
        b.predict(f'n = {n}\nif n % 2 == 0:\n    print("even")\nelse:\n    print("odd")', ['print("even")', 'print("odd")'], extra=["(nothing printed)"],
                  why=f"{n} % 2 is {n % 2}. Even numbers have no leftover.")
    for t in [3, 12]:
        b.order(["temp = %d" % t, "if temp > 8:", '    print("warm")', "else:", '    print("cold")'],
                why="if, its indented line, then else and its indented line.")
    b.order(["score = 70", "if score >= 80:", '    print("A")', "elif score >= 50:", '    print("B")'],
            why="if first, then elif. Each with its own indented line.")
    b.bug(["x = 3", "if x > 1", '    print("yes")'], 1, "if x > 1:", why="An if line always ends with a colon.")
    b.bug(["x = 3", "if x = 3:", '    print("three")'], 1, "if x == 3:", why="= stores, == compares. if needs a question.")
    b.bug(["x = 3", "if x > 1:", 'print("yes")'], 2, '    print("yes")', why="The line under if must be indented by 4 spaces.")
    for t in [5, 20]:
        b.fill(f'temp = {t}\nif temp ___ 10:\n    print("hot")\nelse:\n    print("cool")', [">", "<", "=="] if t > 10 else ["<", ">", "=="],
               why="Pick the comparison that sends this temperature to the right branch.")
    b.fill('x = 12\nif x > 9:\n    print("a")\n___ x > 3:\n    print("b")', ["elif", "if", "and"],
           why="elif adds a second check that only runs if the first was False.")
    b.build('x = 12', ["if", "x > 10", ":", 'print("big")'], ["==", 'print("small")'],
            ask='Print big when x is above 10 (one line).', why="if condition : action. Short ifs can go on one line.")
    return [
        card("if picks a path",
             ["`if` checks a question.", "True: run the indented lines.", "False: skip them."],
             code='x = 12\nif x > 10:\n    print("big")\nprint("done")',
             flow=["x = 12", {"if": "x > 10 ?", "yes": 'print("big")', "no": "skip"}, 'print("done")'],
             check=check('x = 3\nif x > 10:\n    print("big")\nprint("done")', ['print("big")\nprint("done")'], why="3 > 10 is False, so only done.")),
        card("else catches the rest",
             ["`else` runs when the if was False.", "Exactly one of the two runs."],
             code='temp = 5\nif temp > 8:\n    print("warm")\nelse:\n    print("cold")',
             flow=[{"if": "temp > 8 ?", "yes": "warm", "no": "cold"}],
             check=check('temp = 9\nif temp > 8:\n    print("warm")\nelse:\n    print("cold")', ['print("cold")'], why="9 > 8 is True.")),
        card("elif: more than two paths",
             ["Checked top to bottom.", "Only the FIRST True branch runs.", "Put the strictest check first."],
             code='score = 72\nif score >= 80:\n    print("A")\nelif score >= 50:\n    print("B")\nelse:\n    print("C")',
             flow=[{"if": "score >= 80 ?", "yes": "A", "no": "next check"}, {"if": "score >= 50 ?", "yes": "B", "no": "C"}],
             check=check('score = 85\nif score >= 80:\n    print("A")\nelif score >= 50:\n    print("B")', ['print("A")\nprint("B")', 'print("B")'], why="85 hits the first branch, and only that one runs.")),
        card("Indentation is the block",
             ["Lines indented under the if belong to it.", "Use 4 spaces. The colon starts the block."],
             code='x = 1\nif x > 5:\n    print("in the if")\nprint("always")',
             check=check('x = 1\nif x > 5:\n    print("a")\n    print("b")', ['print("b")'], extra=["(nothing printed)"], why="Both prints are inside the if, and the if is False.")),
    ]


def l8(b):
    for n in [3, 4, 5]:
        b.predict(f"for i in range({n}):\n    print(i)",
                  [f"for i in range(1, {n + 1}):\n    print(i)", f"for i in range({n + 1}):\n    print(i)", f"print({n})"],
                  why=f"range({n}) counts 0 up to {n - 1}. It stops BEFORE {n}.")
    for a, c in [(2, 5), (1, 4), (3, 6)]:
        b.predict(f"for i in range({a}, {c}):\n    print(i)",
                  [f"for i in range({a}, {c + 1}):\n    print(i)", f"for i in range({c}):\n    print(i)", f"for i in range({a + 1}, {c + 1}):\n    print(i)"],
                  why=f"Start at {a}, stop before {c}.")
    for a, c, s in [(0, 10, 3), (1, 10, 2), (10, 0, -3)]:
        b.predict(f"for i in range({a}, {c}, {s}):\n    print(i)",
                  [f"for i in range({a}, {c + (1 if s > 0 else -1)}, {s}):\n    print(i)", f"for i in range({a}, {c}):\n    print(i)", f"print({a}, {c}, {s})"],
                  why=f"The third number is the step: jump by {s} each time.")
    for n in [3, 4, 5]:
        b.predict(f"total = 0\nfor i in range({n}):\n    total = total + i\nprint(total)",
                  [f"total = 0\nfor i in range({n + 1}):\n    total = total + i\nprint(total)", f"print({n})", f"total = 0\nfor i in range({n}):\n    total = total + i\n    print(total)"],
                  why=f"Adds 0 + 1 + ... + {n - 1}. print is outside the loop, so it runs once at the end.")
        b.predict(f"total = 0\nfor i in range({n}):\n    total = total + i\n    print(total)",
                  [f"total = 0\nfor i in range({n}):\n    total = total + i\nprint(total)", f"for i in range({n}):\n    print(i)"],
                  why="print is indented, so it runs every lap and shows the running total.")
    for w in ["cat", "owl", "tea"]:
        b.predict(f'for ch in "{w}":\n    print(ch)', [f'print("{w}")', f'for ch in "{w}":\n    print("{w}")'],
                  why="Looping over text gives one character per lap.")
    for items in [["red", "green"], ["tea", "soup", "pie"]]:
        b.predict(f"for x in {items!r}:\n    print(x.upper())", [f"print({items!r})", f"for x in {items!r}:\n    print(x)"],
                  why="x takes each item in turn.")
    for n in [3, 4]:
        b.predict(f'for i in range({n}):\n    print("*" * (i + 1))', [f'for i in range({n}):\n    print("*" * i)', f'for i in range({n}):\n    print("*")'],
                  why="Lap 0 makes 1 star, lap 1 makes 2, and so on.")
    for n, t in [(4, "0 1 2 3"), (5, "0 1 2 3 4")]:
        b.fill(f"for i in range(___):\n    print(i)", [str(n), str(n - 1), str(n + 1)], why=f"range({n}) gives exactly {n} numbers, starting at 0.")
    b.fill("for i in range(1, ___):\n    print(i)", ["4", "3", "5"], why="Stop is one past the last number you want.")
    b.fill("for i in range(0, 10, ___):\n    print(i)", ["5", "2", "10"], why="The step is the jump between numbers.")
    b.order(["total = 0", "for i in range(4):", "    total = total + i", "print(total)"],
            why="Start at 0 before the loop, add inside it, print once after it.")
    b.order(['word = "owl"', "for ch in word:", "    print(ch.upper())"], why="The loop line ends in a colon and its body is indented.")
    b.order(["count = 0", 'for ch in "banana":', '    if ch == "a":', "        count = count + 1", "print(count)"],
            why="Each level of nesting adds 4 spaces.")
    b.bug(["for i in range(3)", "    print(i)"], 0, "for i in range(3):", why="A for line ends with a colon.")
    b.bug(["total = 0", "for i in range(4):", "    total = i", "print(total)"], 2, "    total = total + i",
          why="total = i throws away the old total each lap. Add onto it instead.")
    b.bug(["for i in range(1, 5):", "    print(i)"], 0, "for i in range(1, 6):", why="To print 1 to 5, stop must be 6.")
    b.build("", ["for i in range(3):", "print(i)"], ["for i in range(1, 3):"], ask="Print 0, 1 and 2 using a one-line loop.",
            why="range(3) gives 0, 1, 2.")
    return [
        card("for repeats for each item",
             ["`for x in thing:` gives you one item per lap.", "The indented lines run every lap."],
             code='for ch in "owl":\n    print(ch)',
             flow=[{"loop": "next letter in \"owl\"?", "body": "ch = that letter, print(ch)"}, "done"],
             trace={"cols": ["lap", "ch", "prints"], "rows": [["1", "o", "o"], ["2", "w", "w"], ["3", "l", "l"]]},
             check=check('for ch in "hi":\n    print(ch)', ['print("hi")'], why="One letter per lap, one line each.")),
        card("range makes numbers",
             ["`range(4)` gives 0, 1, 2, 3.", "`range(2, 5)` gives 2, 3, 4.", "It stops BEFORE the stop number."],
             code="for i in range(4):\n    print(i)",
             trace={"cols": ["lap", "i"], "rows": [["1", "0"], ["2", "1"], ["3", "2"], ["4", "3"]]},
             check=check("for i in range(2, 4):\n    print(i)", ["for i in range(2, 5):\n    print(i)"], why="Starts at 2, stops before 4.")),
        card("Collect while you loop",
             ["Make the box BEFORE the loop.", "Change it INSIDE the loop.", "Print it AFTER the loop."],
             code="total = 0\nfor i in range(4):\n    total = total + i\nprint(total)",
             trace={"cols": ["i", "total before", "total after"], "rows": [["0", "0", "0"], ["1", "0", "1"], ["2", "1", "3"], ["3", "3", "6"]]},
             check=check("total = 0\nfor i in range(3):\n    total = total + i\nprint(total)", ["print(6)", "print(0)"], why="0 + 1 + 2 = 3.")),
    ]


def l9(b):
    for n in [3, 4, 5]:
        b.predict(f"n = {n}\nwhile n > 0:\n    print(n)\n    n = n - 1",
                  [f"n = {n}\nwhile n >= 0:\n    print(n)\n    n = n - 1", f"print({n})", f"for i in range({n}):\n    print(i)"],
                  why="Keeps going while n > 0. When n hits 0 the question is False and it stops.")
    for n in [3, 4]:
        b.predict(f"n = 0\nwhile n < {n}:\n    n = n + 1\nprint(n)", [f"print({n - 1})", f"print({n + 1})", "print(0)"],
                  why=f"Stops the moment n < {n} is False, which is when n reaches {n}.")
    for stop in [3, 4, 6]:
        b.predict(f"for i in range(10):\n    if i == {stop}:\n        break\n    print(i)",
                  [f"for i in range({stop + 1}):\n    print(i)", "for i in range(10):\n    print(i)", f"print({stop})"],
                  why=f"break leaves the loop completely as soon as i is {stop}. {stop} itself is never printed.")
    for skip in [1, 2, 3]:
        b.predict(f"for i in range(5):\n    if i == {skip}:\n        continue\n    print(i)",
                  [f"for i in range({skip}):\n    print(i)", "for i in range(5):\n    print(i)"],
                  why=f"continue skips the rest of THIS lap only. Only {skip} goes missing.")
    b.predict("n = 10\nwhile n > 0:\n    n = n - 3\nprint(n)", ["print(1)", "print(0)", "print(10)"],
              why="10, 7, 4, 1, -2. The loop checks before each lap, so it ends at -2.")
    b.predict("count = 0\nwhile True:\n    count = count + 1\n    if count == 3:\n        break\nprint(count)",
              ["print(2)", "print(4)", "print(0)"], why="while True runs forever until break. break fires when count is 3.")
    b.fill("n = 3\nwhile n ___ 0:\n    print(n)\n    n = n - 1", [">", "<", "=="], why="Keep going while n is above 0.")
    b.fill("for i in range(5):\n    if i == 2:\n        ___\n    print(i)", ["continue", "break", "pass"], why="Only 2 is missing and the loop carries on: continue.")
    b.fill("for i in range(5):\n    if i == 2:\n        ___\n    print(i)".replace("range(5)", "range(6)"), ["break", "continue", "pass"],
           why="It stops for good at 2: break.")
    b.order(["n = 3", "while n > 0:", "    print(n)", "    n = n - 1"], why="The countdown line goes inside the loop, after print.")
    b.order(["for i in range(6):", "    if i == 3:", "        break", "    print(i)"], why="Check first, then print.")
    b.bug(["n = 3", "while n > 0:", "    print(n)", "    n = n + 1"], 3, "    n = n - 1",
          why="n goes up, so n > 0 is True forever: an endless loop. Count down instead.")
    b.bug(["n = 0", "while n < 3", "    n = n + 1", "print(n)"], 1, "while n < 3:", why="while lines end with a colon.")
    return [
        card("while repeats while a question is True",
             ["Checks the question before every lap.", "Something inside must change, or it never stops."],
             code="n = 3\nwhile n > 0:\n    print(n)\n    n = n - 1",
             flow=[{"loop": "n > 0 ?", "body": "print(n), then n = n - 1"}, "done"],
             trace={"cols": ["check", "n > 0?", "prints"], "rows": [["1", "3 > 0 yes", "3"], ["2", "2 > 0 yes", "2"], ["3", "1 > 0 yes", "1"], ["4", "0 > 0 no", "stop"]]},
             check=check("n = 2\nwhile n > 0:\n    print(n)\n    n = n - 1", ["print(2)"], why="2, then 1, then 0 > 0 is False.")),
        card("break and continue",
             ["`break`: leave the loop now.", "`continue`: skip to the next lap."],
             code="for i in range(5):\n    if i == 2:\n        continue\n    if i == 4:\n        break\n    print(i)",
             check=check("for i in range(5):\n    if i == 1:\n        break\n    print(i)", ["for i in range(5):\n    print(i)"], why="Stops before printing 1.")),
    ]
