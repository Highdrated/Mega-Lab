from engine import card, check

NAMES = [("name", "Ada"), ("city", "Ghent"), ("pet", "Roux"), ("drink", "tea"), ("ship", "Verdant"), ("food", "soup")]
WORDS = ["python", "garden", "rocket", "window", "orange", "planet", "lantern", "carpet"]


def l1(b):
    r = b.rng
    for var, val in NAMES:
        b.predict(f'{var} = "{val}"\nprint("{var}")',
                  [f'{var} = "{val}"\nprint({var})', f'print(\'"{var}"\')'],
                  [f"{var} {val}"],
                  why=f'Quotes make it plain text. "{var}" is just the word {var}, not the box.')
        b.predict(f'{var} = "{val}"\nprint({var})',
                  [f'print("{var}")', f'print(\'"{val}"\')'],
                  [f"{var} = {val}"],
                  why=f"No quotes, so Python opens the box called {var} and prints what is inside.")
    for a, c in [(5, 1), (3, 4), (10, 5), (7, 2), (2, 8)]:
        b.predict(f"x = {a}\nx = x + {c}\nprint(x)",
                  [f"x = {a}\nprint(x)", f"x = {c}\nprint(x)", f"print('x')"],
                  [f"{a}{c}"],
                  why=f"Right side first: x + {c} is {a} + {c} = {a + c}. That goes back into x.")
        b.predict(f"x = {a}\nx = {c}\nprint(x)",
                  [f"print({a})", f"print({a + c})", f"print({a}, {c})"],
                  why="A box holds one value. The second = replaces the first.")
    for w, n in [("Age", 30), ("Room", 4), ("Level", 7), ("Floor", 2)]:
        b.predict(f'print("{w}", {n})',
                  [f'print("{w}" + str({n}))', f'print(("{w}", {n}))', f'print("{w}", "\\n", {n})'],
                  [f'"{w}" {n}'],
                  why="A comma between items prints them with one space between.")
    b.predict("a = 1\nb = 2\na = b\nb = a\nprint(a, b)",
              ["print(2, 1)", "print(1, 2)", "print(1, 1)"],
              why="a = b makes a 2. Then b = a copies that 2 back. The 1 is gone.")
    b.predict("a = 4\nb = a\na = 9\nprint(b)",
              ["print(9)", "print(13)", "print('a')"],
              why="b got a copy of 4 earlier. Changing a later does not change b.")
    for var, val in NAMES[:4]:
        b.build(f'{var} = "{val}"', ["print(", var, ")"], [f'"{var}"'],
                ask=f"Print what is inside the box {var}.",
                why=f"print( {var} ) with no quotes opens the box.")
    for a, c in [(5, 7), (3, 9), (8, 4)]:
        b.build(f"a = {a}\nb = {c}", ["print(", '"Total"', ",", "a + b", ")"], ['"a + b"'],
                ask="Print the word Total, then the sum.",
                why="Comma between the text and a + b. The sum gets worked out first.")
    for a, m in [(3, 2), (4, 5), (6, 3)]:
        b.order([f"x = {a}", f"x = x * {m}", "print(x)"],
                why="Make the box, change it, then print. Top to bottom.")
    b.order(['name = "Ada"', 'greeting = "Hi"', "print(greeting, name)"],
            why="Both boxes must exist before print uses them.")
    for var, val in NAMES[:4]:
        b.bug([f'{var} = "{val}"', f"print({var.capitalize()})"], 1, f"print({var})",
              why=f"Names are case-sensitive. {var.capitalize()} and {var} are different boxes, so Python raises NameError.")
    b.bug(['print("Hello)', 'print("World")'], 0, 'print("Hello")',
          why="Every opening quote needs a closing quote.")
    b.bug(["x = 5", "prnt(x)"], 1, "print(x)", why="prnt is not a thing Python knows. Typos give NameError.")
    for var, val in NAMES:
        b.fill(f'{var} = "{val}"\nprint(___)', [var, f'"{var}"', var.capitalize()],
               why=f"Use the box name with no quotes, spelled exactly the same: {var}.")
    return [
        card("print shows things",
             ["`print()` writes one line on the screen.", "Text needs quotes. The quotes themselves are not shown."],
             code='print("hello")',
             check=check('print("Junie")', ['print(\'"Junie"\')'], ["print Junie"],
                         why="The quotes only tell Python where the text starts and stops.")),
        card("A variable is a labelled box",
             ["`=` puts the value on the right into the box on the left.", "Use the name without quotes to get what is inside."],
             code='drink = "tea"\nprint(drink)\nprint("drink")',
             flow=['"tea"', "box called drink", "print(drink) shows tea"],
             check=check('pet = "cat"\nprint(pet)', ['print("pet")'], ['"cat"'],
                         why="No quotes around pet, so Python looks inside the box.")),
        card("Right side first",
             ["Python works out the right side, then stores the result.", "`x = x + 1` means: take x, add 1, put it back in x."],
             code="x = 5\nx = x + 1\nprint(x)",
             trace={"cols": ["line", "x"], "rows": [["x = 5", "5"], ["x = x + 1", "6"], ["print(x)", "6"]]},
             check=check("n = 2\nn = n * 3\nprint(n)", ["print(2)", "print(23)"],
                         why="n * 3 is 2 * 3 = 6, stored back in n.")),
        card("Commas add a space",
             ["`print(a, b)` prints both with one space between.", "Text and numbers can mix with commas."],
             code='print("Age", 30)',
             check=check('print("Room", 4, "B")', ['print("Room4B")'], ["Room, 4, B"],
                         why="Each comma becomes one space in the output.")),
    ]


def l2(b):
    for a, c in [(7, 2), (9, 4), (17, 5), (10, 3), (13, 4), (20, 6)]:
        b.predict(f"print({a} / {c})", [f"print({a} // {c})", f"print({a} % {c})", f"print(round({a}/{c}))"],
                  why="/ always gives a float, even when it looks like it should be whole.")
        b.predict(f"print({a} // {c})", [f"print({a} / {c})", f"print({a} % {c})", f"print({a} // {c} + 1)"],
                  why=f"// keeps only the whole part: {c} fits into {a} exactly {a // c} times.")
        b.predict(f"print({a} % {c})", [f"print({a} // {c})", f"print({a} / {c})", f"print({c} % {a})"],
                  why=f"% is the leftover: {a} = {c} x {a // c} + {a % c}.")
    for a, c in [(6, 2), (8, 4), (9, 3), (10, 5)]:
        b.predict(f"print({a} / {c})", [f"print({a} // {c})", f"print({a} * {c})", f"print({a} % {c})"],
                  why="/ always gives a float. Even when it divides evenly you see .0")
    for a, c in [(2, 3), (3, 2), (2, 5), (5, 2), (10, 2)]:
        b.predict(f"print({a} ** {c})", [f"print({a} * {c})", f"print({c} ** {a})", f"print({a} ^ {c})"],
                  why=f"** is power: {a} multiplied by itself {c} times.")
    for a, c, d in [(2, 3, 4), (1, 5, 2), (10, 2, 3), (4, 4, 2)]:
        b.predict(f"print({a} + {c} * {d})", [f"print(({a} + {c}) * {d})", f"print({a} * {c} + {d})"],
                  why=f"* happens before +. So {c} * {d} first, then add {a}.")
        b.predict(f"print(({a} + {c}) * {d})", [f"print({a} + {c} * {d})", f"print({a} + {c} + {d})"],
                  why="Brackets go first, like in maths class.")
    for a, c in [(3, 2.0), (5, 0.5), (1, 1.5)]:
        b.predict(f"print({a} + {c})", [f"print(int({a} + {c}))", f"print(str({a}) + str({c}))"],
                  why="int + float gives a float.")
    for a, c in [(17, 5), (23, 4), (14, 3), (11, 2)]:
        b.fill(f"print({a} ___ {c})", ["%", "//", "/", "*"], why=f"The leftover after dividing is %.")
        b.fill(f"print({a} ___ {c})", ["//", "%", "-", "**"], why="The whole-number part of a division is //.")
    for e in [8, 9, 16, 27]:
        base = {8: 2, 9: 3, 16: 2, 27: 3}[e]
        p = {8: 3, 9: 2, 16: 4, 27: 3}[e]
        b.fill(f"print({base} ___ {p})", ["**", "*", "+", "//"], why=f"{base} to the power {p} is {e}.")
    for a, c in [(7, 3), (19, 4), (10, 4)]:
        b.build(f"a = {a}\nb = {c}", ["print(", "a", "%", "b", ")"], ["//"],
                ask="Print the leftover when a is divided by b.", why="% gives the remainder.")
        b.build(f"a = {a}\nb = {c}", ["print(", "a", "//", "b", ")"], ["%", "/"],
                ask="Print how many whole times b fits into a.", why="// gives the whole part.")
    b.order(["total = 10", "total = total // 3", "print(total)"], why="Start, change, print.")
    b.order(["price = 4", "count = 3", "print(price * count)"], why="Both boxes first, then the maths.")
    b.bug(["a = 10", "b = 0", "print(a / b)"], 1, "b = 2",
          why="Dividing by zero is impossible, so Python raises ZeroDivisionError.")
    b.bug(["x = 5", "y = 2", "print(x * * y)"], 2, "print(x ** y)", why="Power is ** with no space between the stars.")
    return [
        card("Two kinds of numbers",
             ["`int` is a whole number: 3, -2, 100.", "`float` has a dot: 3.5, 2.0", "/ always gives a float."],
             code="print(7 / 2)\nprint(6 / 2)",
             check=check("print(8 / 4)", ["print(8 // 4)"], ["2.00"], why="/ always makes a float, so 2.0")),
        card("// and %: whole part and leftover",
             ["`//` keeps the whole part of a division.", "`%` gives the leftover (remainder).", "Think: 7 sweets, 2 kids."],
             code="print(7 // 2)\nprint(7 % 2)",
             flow=["7 sweets, 2 kids", "each kid gets 7 // 2 = 3", "left over: 7 % 2 = 1"],
             check=check("print(10 % 3)", ["print(10 // 3)", "print(10 / 3)"], why="3 + 3 + 3 = 9, one left over.")),
        card("Power and order",
             ["`**` is power: 2 ** 3 is 2 x 2 x 2.", "* and / go before + and -.", "Brackets go first of all."],
             code="print(2 ** 3)\nprint(2 + 3 * 4)\nprint((2 + 3) * 4)",
             check=check("print(1 + 2 * 3)", ["print((1 + 2) * 3)"], why="2 * 3 first, then + 1.")),
    ]


def l3(b):
    for a, c in [("3", "4"), ("1", "2"), ("5", "5"), ("7", "0")]:
        b.predict(f'print("{a}" + "{c}")', [f"print({a} + {c})", f'print("{a}", "{c}")'],
                  why="Text + text glues them together. These are strings, not numbers.")
        b.predict(f'print(int("{a}") + int("{c}"))', [f'print("{a}" + "{c}")', f'print("{a}" + {c})'],
                  why="int() turns text into a real number, so + adds.")
    for w, n in [("ha", 3), ("ab", 2), ("-", 5), ("go", 2)]:
        b.predict(f'print("{w}" * {n})', [f'print("{w}", {n})', f'print("{w}" + str({n}))'],
                  why="text * number repeats the text.")
    for v in ["3", "3.0", '"3"', "True", "[3]"]:
        b.predict(f"print(type({v}))", [f"print(type(3))", "print(type(3.0))", 'print(type("3"))', "print(type(True))"],
                  why="type() tells you what kind of value it is.")
    for n in [30, 7, 12]:
        b.predict(f'print("Age: " + {n})', [f'print("Age: " + str({n}))'], [f"Age:{n}", "ValueError"],
                  why="You cannot + text and a number. Python raises TypeError. Use str() or a comma.")
        b.predict(f'print("Age: " + str({n}))', [f'print("Age: " + {n})', f'print("Age:", "{n}", sep="")'],
                  why="str() turns the number into text, so + can glue them.")
    for s in ['"7.5"', '"abc"', '"twelve"']:
        b.predict(f"print(int({s}))", ["print(7)", "print(int(7.5))", "print(0)"],
                  why="int() only reads text that looks like a whole number. Anything else is a ValueError.")
    for f in [7.9, 3.2, 9.99]:
        b.predict(f"print(int({f}))", [f"print(round({f}))", f"print({f} // 1)", f"print(str({f}))"],
                  why="int() on a float chops off the decimals. It does not round.")
    for f in [7.5, 2.4, 3.6]:
        b.predict(f'print(float("{f}") * 2)', [f'print("{f}" * 2)', f'print(int({f}) * 2)'],
                  why='float() turns "text" into a decimal number.')
    for n in [30, 12, 5]:
        b.fill(f'age = {n}\nprint("Age: " + ___(age))', ["str", "int", "float"],
               why="To glue a number onto text, turn it into text with str().")
    for a, c in [("4", "5"), ("10", "2"), ("6", "3")]:
        b.fill(f'a = "{a}"\nb = "{c}"\nprint(___(a) + ___(b))'.replace("___(b)", "int(b)"), ["int", "str", "len"],
               why="int() turns text into a number so + adds instead of glues.")
    for a, c in [("4", "5"), ("8", "1")]:
        b.build(f'a = "{a}"\nb = "{c}"', ["print(", "int(a)", "+", "int(b)", ")"], ["a", "b"],
                ask="Add a and b as numbers.", why="Both need int() first.")
    for n in [21, 9]:
        b.build(f"age = {n}", ["print(", '"Age: "', "+", "str(age)", ")"], ["age"],
                ask="Print Age: and the number glued on.", why="str(age) makes the number text so + can glue.")
    b.order(['text = "42"', "num = int(text)", "print(num + 8)"], why="Convert first, then do maths.")
    b.order(["n = 3", 'msg = "Score " + str(n)', "print(msg)"], why="Build the message, then print it.")
    for n in [30, 8]:
        b.bug([f"age = {n}", 'print("Age: " + age)'], 1, 'print("Age: " + str(age))',
              why="Text + number is a TypeError. Wrap the number in str().")
    b.bug(['a = "5"', 'b = "6"', "print(a + b)"], 2, "print(int(a) + int(b))",
          why="Without int() Python glues the text: 56, not 11.")
    return [
        card("Every value has a type",
             ["`int` whole number, `float` decimal, `str` text, `bool` True/False.", "`type()` shows the type."],
             code='print(type(5))\nprint(type("5"))',
             check=check("print(type(2.5))", ["print(type(2))", 'print(type("2.5"))'], why="It has a dot, so float.")),
        card("+ means two things",
             ["Numbers: + adds.", "Text: + glues.", "Text + number: error."],
             code='print(3 + 4)\nprint("3" + "4")',
             flow=[{"if": "both numbers?", "yes": "add them", "no": "both text? glue them"}],
             check=check('print("2" + "2")', ["print(2 + 2)"], why="Quotes make them text, so they glue.")),
        card("Converting",
             ['`int("5")` text to whole number.', "`str(5)` number to text.", "`int(7.9)` chops off to 7."],
             code='print(int("5") + 1)\nprint("Lvl " + str(5))\nprint(int(7.9))',
             check=check("print(int(3.99))", ["print(round(3.99))"], why="int() chops, it does not round.")),
    ]


def l4(b):
    r = b.rng
    for w in WORDS:
        i = r.randint(0, len(w) - 1)
        b.predict(f'word = "{w}"\nprint(word[{i}])',
                  [f'word = "{w}"\nprint(word[{i - 1}])', f'word = "{w}"\nprint(word[{(i + 1) % len(w)}])'],
                  why=f"Counting starts at 0, so [{i}] is letter number {i + 1}.")
        k = r.randint(1, 3)
        b.predict(f'word = "{w}"\nprint(word[-{k}])',
                  [f'word = "{w}"\nprint(word[{k}])', f'word = "{w}"\nprint(word[-{k + 1}])', f'word = "{w}"\nprint(word[-{k}:])'],
                  why=f"Negative counts from the end. -1 is the last letter.")
        a = r.randint(0, 2)
        c = r.randint(a + 2, len(w) - 1)
        b.predict(f'word = "{w}"\nprint(word[{a}:{c}])',
                  [f'word = "{w}"\nprint(word[{a}:{c + 1}])', f'word = "{w}"\nprint(word[{a + 1}:{c + 1}])', f'word = "{w}"\nprint(word[{a + 1}:{c}])'],
                  why=f"Start at {a}, stop BEFORE {c}. The stop index is not included.")
        b.predict(f'print(len("{w}"))', [f'print(len("{w}") - 1)', f'print(len("{w}") + 1)'],
                  why="len() counts every character.")
    for w in WORDS[:4]:
        b.predict(f'word = "{w}"\nprint(word[::-1])', [f'print("{w}")', f'word = "{w}"\nprint(word[-1])'],
                  why="[::-1] walks backwards through the whole string.")
        b.predict(f'word = "{w}"\nprint(word[{len(w)}])', [f'word = "{w}"\nprint(word[-1])', f'word = "{w}"\nprint(word[{len(w) - 1}])'], ["(nothing printed)", "None"],
                  why=f"{len(w)} letters means positions 0 to {len(w) - 1}. [{len(w)}] is past the end: IndexError.")
        b.predict(f'word = "{w}"\nprint(word[:3])', [f'word = "{w}"\nprint(word[3:])', f'word = "{w}"\nprint(word[:4])'],
                  why="[:3] means from the start up to (not including) 3.")
    for w in WORDS:
        i = r.randint(0, len(w) - 1)
        opts = [str(i), str(i + 1), str(i - 1) if i > 0 else str(i + 2)]
        b.fill(f'word = "{w}"\nprint(word[___])', opts, why=f"Count from 0: {w[i]} sits at position {i}.")
    for w in WORDS[:5]:
        b.fill(f'word = "{w}"\nprint(word[___])', ["-1", "1", "0"], why="-1 is always the last character.")
    for w in WORDS[:4]:
        b.build(f'word = "{w}"', ["print(", "word[0]", ")"], ["word[1]", "word"],
                ask="Print the first letter.", why="The first letter is at 0.")
        b.build(f'word = "{w}"', ["print(", "word[:3]", ")"], ["word[3:]", "word[0:2]"],
                ask="Print the first 3 letters.", why="[:3] stops before 3, so 0, 1, 2.")
    b.order(['word = "rocket"', "first = word[0]", "last = word[-1]", "print(first, last)"],
            why="Make the word, grab both letters, then print.")
    b.bug(['word = "cat"', "print(word[3])"], 1, "print(word[2])",
          why="cat has positions 0, 1, 2. [3] is past the end: IndexError.")
    b.bug(['word = "garden"', "print(word(0))"], 1, "print(word[0])",
          why="Indexing uses square brackets [ ]. Round brackets try to call it like a function.")
    return [
        card("Strings are numbered from 0",
             ["Each character has a position.", "The first one is `[0]`, not `[1]`.", "`[-1]` is the last one."],
             code='word = "python"\nprint(word[0])\nprint(word[-1])',
             trace={"cols": ["p", "y", "t", "h", "o", "n"], "rows": [["0", "1", "2", "3", "4", "5"], ["-6", "-5", "-4", "-3", "-2", "-1"]]},
             check=check('word = "cat"\nprint(word[1])', ['word = "cat"\nprint(word[0])'], why="0 is c, 1 is a.")),
        card("Slices cut a piece",
             ["`word[start:stop]` takes start up to stop.", "The stop position is NOT included.", "Leave one out to go to the edge."],
             code='word = "python"\nprint(word[1:4])\nprint(word[:2])\nprint(word[2:])',
             check=check('word = "garden"\nprint(word[0:3])', ['word = "garden"\nprint(word[0:4])'], why="0, 1, 2. Stops before 3.")),
        card("len counts",
             ["`len()` gives the number of characters.", "Last position is always len - 1."],
             code='print(len("rocket"))',
             check=check('print(len("tea"))', ['print(len("tea") - 1)'], why="t, e, a: three characters.")),
    ]


def l5(b):
    r = b.rng
    for w in ["hello", "Junie", "night train", "MiXeD"]:
        b.predict(f'print("{w}".upper())', [f'print("{w}".lower())', f'print("{w}".title())', f'print("{w}")'],
                  why=".upper() gives a new string in capitals.")
        b.predict(f's = "{w}"\ns.upper()\nprint(s)', [f'print("{w}".upper())', f'print("{w}".lower())', f'print("{w}".title())'], ["None"],
                  why="Strings never change in place. s.upper() made a new string that nobody stored.")
    for w in ["  tea  ", "   hi", "ok   "]:
        b.predict(f'print("[" + "{w}".strip() + "]")', [f'print("[" + "{w}" + "]")', f'print("[" + "{w}".lstrip() + "]")'], [w.strip(), "None"],
                  why=".strip() removes spaces at both ends.")
    for s, a, c in [("cats and cats", "cats", "dogs"), ("1-2-3", "-", "+"), ("tea time", "t", "T")]:
        b.predict(f'print("{s}".replace("{a}", "{c}"))', [f'print("{s}".replace("{a}", "{c}", 1))', f'print("{s}")'],
                  why=".replace() swaps every match, not just the first.")
    for s, sep in [("a,b,c", ","), ("red green blue", " "), ("1-2-3-4", "-")]:
        b.predict(f'print("{s}".split("{sep}"))', [f'print("{s}".split())', f'print("{s}")', f'print(list("{s}"))'],
                  why=".split() cuts the text at each separator and gives a list.")
    for parts, sep in [(["a", "b", "c"], "-"), (["x", "y"], ", "), (["night", "train"], " ")]:
        b.predict(f'print("{sep}".join({parts!r}))', [f'print({parts!r})', f'print("".join({parts!r}))'],
                  why="The text before .join is put between every item.")
    for n, a in [("Ada", 30), ("Roux", 4), ("Junie", 2)]:
        b.predict(f'name = "{n}"\nage = {a}\nprint(f"{{name}} is {{age}}")',
                  [f'name = "{n}"\nage = {a}\nprint("{{name}} is {{age}}")', f'print("name is age")'],
                  why="The f before the quotes fills in each {box}.")
    for s, ch in [("banana", "a"), ("letter", "t"), ("mississippi", "s")]:
        b.predict(f'print("{s}".count("{ch}"))', [f'print("{s}".find("{ch}"))', f'print(len("{s}"))'], ["1", "True"],
                  why=".count() tells how many times it appears.")
    for n in ["Ada", "Roux", "Kai"]:
        b.fill(f'name = "{n}"\nprint(___"Hi {{name}}")', ["f", "", "r"], why="An f-string needs the f before the quote.")
    for w in ["hello", "night"]:
        b.fill(f'print("{w}".___())', ["upper", "lower", "strip"], why=".upper() gives capitals.")
    for s in ["a,b,c", "1,2,3"]:
        b.fill(f'print("{s}".___(","))', ["split", "strip", "count"], why=".split(\",\") cuts at each comma.")
    for n in ["Ada", "Roux"]:
        b.build(f'name = "{n}"', ["print(", 'f"Hi {name}"', ")"], ['"Hi {name}"', '"Hi name"'],
                ask="Greet the name using an f-string.", why="Only the f-string fills in {name}.")
        b.build(f'name = "{n}"', ["print(", "name.upper()", ")"], ["name.lower()", "name"],
                ask="Print the name in capitals.", why=".upper() makes capitals.")
    b.order(['raw = "  tea  "', "clean = raw.strip()", "print(clean.upper())"], why="Clean first, then shout.")
    b.order(['line = "a,b,c"', 'parts = line.split(",")', "print(len(parts))"], why="Split into a list, then count.")
    b.bug(['s = "quiet"', "s.upper()", "print(s)"], 1, "s = s.upper()",
          why="Store the new string: s = s.upper(). Strings never change in place.")
    b.bug(['name = "Ada"', 'print("Hi {name}")'], 1, 'print(f"Hi {name}")', why="Without the f, {name} is printed as plain text.")
    return [
        card("Methods are actions on a string",
             ["Write a dot and the action: `s.upper()`.", "They give back a NEW string. The old one stays the same."],
             code='s = "tea"\nprint(s.upper())\nprint(s)',
             check=check('s = "hi"\ns.upper()\nprint(s)', ['print("HI")'], why="Nobody stored the new string, so s is still hi.")),
        card("Handy methods",
             ["`.strip()` trims spaces at the ends.", "`.replace(a, b)` swaps every a for b.", "`.split(sep)` cuts into a list.", '`sep.join(list)` glues a list back.'],
             code='print("  hi ".strip())\nprint("a-b".replace("-", "+"))\nprint("a,b".split(","))\nprint("-".join(["x", "y"]))',
             check=check('print("1,2".split(","))', ['print("1,2")'], why="split gives a list of the pieces.")),
        card("f-strings fill in boxes",
             ["Put an `f` before the quotes.", "Write boxes inside `{ }`.", "Python fills in the value."],
             code='name = "Ada"\nage = 30\nprint(f"{name} is {age}")',
             check=check('n = 3\nprint(f"Level {n}")', ['print("Level {n}")'], why="The f fills {n} with 3.")),
    ]
