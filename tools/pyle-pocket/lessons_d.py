def x_for(b):
    for n in [3, 4, 5]:
        b.trace(["total = 0"], f"for i in range({n}):", ["    total = total + i"], ["i", "total"],
                why="Each lap: i moves to the next number, then total adds it on.")
    for n in [3, 4]:
        b.trace(["p = 1"], f"for i in range(1, {n + 1}):", ["    p = p * 2"], ["i", "p"],
                why="p doubles every lap.")
    for w in ["cat", "owl", "tea"]:
        b.trace(['s = ""'], f'for ch in "{w}":', ["    s = ch + s"], ["ch", "s"],
                why="Each new letter goes in FRONT, so the word ends up backwards.")
        b.trace(['s = ""'], f'for ch in "{w}":', ["    s = s + ch"], ["ch", "s"],
                why="Each new letter goes on the END, so the word builds up in order.")
    for w, c in [("banana", "a"), ("letter", "t")]:
        b.trace(["count = 0"], f'for ch in "{w[:4]}":', [f'    if ch == "{c}":', "        count = count + 1"], ["ch", "count"],
                why=f"count only goes up on laps where ch is {c}.")


def x_while(b):
    for n in [6, 8, 10]:
        b.trace([f"n = {n}"], "while n > 0:", ["    n = n - 2"], ["n"], why="Each lap takes 2 off. It stops once n > 0 is False.")
    for s in [2, 3]:
        b.trace([f"x = {s}"], "while x < 30:", ["    x = x * 2"], ["x"], why="x doubles until it is no longer below 30.")
    for n in [4, 5]:
        b.trace([f"n = {n}", "steps = 0"], "while n > 1:", ["    n = n - 1", "    steps = steps + 1"], ["n", "steps"],
                why="n goes down by 1 and steps counts the laps.")
    for items in [["a", "b", "c"], ["tea", "pie"]]:
        b.predict(f"items = {items!r}\nwhile items:\n    print(items.pop())", [f"for x in {items!r}:\n    print(x)", f"print({items!r})"],
                  why="An empty list counts as False, so the loop runs until pop() has taken everything. pop takes from the end.")
    for lim in [20, 50, 100]:
        b.predict(f"x = 1\nwhile x < {lim}:\n    x = x * 3\nprint(x)", [f"x = 1\nwhile x < {lim}:\n    x = x * 3\n    print(x)", f"print({lim})"],
                  why="The check happens BEFORE each lap, so x can jump past the limit on its last lap.")
    for n in [3, 5]:
        b.predict(f"n = {n}\nwhile n > 0:\n    n = n - 1\nprint(n)", [f"print({n})", "print(1)", "print(-1)"],
                  why="It stops the moment n > 0 is False. That is when n reaches 0.")
    b.predict("n = 0\nwhile n > 5:\n    print(n)\n    n = n + 1\nprint('end')", ["print(0)\nprint('end')", "print(5)"],
              why="0 > 5 is False at the very first check, so the body never runs.")
    b.fill("x = 1\nwhile x ___ 10:\n    x = x * 2\nprint(x)", ["<", ">", "=="], why="Keep doubling while x is below 10: 1, 2, 4, 8, 16.")
    b.order(["x = 1", "while x < 10:", "    x = x * 2", "print(x)"], why="Start value, loop with its indented body, print after.")
    b.bug(["count = 0", "while count < 3:", "    print(count)", "    count + 1"], 3, "    count = count + 1",
          why="count + 1 works it out but never stores it, so count stays 0 forever.")


def x_lists(b):
    for nums in [[3, 1, 2], [5, 2, 4], [2, 7, 1]]:
        b.trace(["doubled = []"], f"for x in {nums!r}:", ["    doubled.append(x * 2)"], ["x", "doubled"],
                why="append adds one item onto the end every lap.")
        b.trace(["best = 0"], f"for n in {nums!r}:", ["    if n > best:", "        best = n"], ["n", "best"],
                why="best only changes when a bigger number shows up.")


def x_dicts(b):
    for w in ["abba", "noon", "aab"]:
        b.trace(["counts = {}"], f'for ch in "{w}":', ["    counts[ch] = counts.get(ch, 0) + 1"], ["ch", "counts"],
                why=".get(ch, 0) gives the old count, or 0 the first time. Then +1 is stored back.")


def x_functions(b):
    for n in [-3, 0, 5]:
        b.predict(f'def sign(n):\n    if n < 0:\n        return "neg"\n    return "pos"\n\nprint(sign({n}))', ['print("neg")', 'print("pos")', 'print(None)'],
                  why="return leaves straight away. If the first return did not run, the second one does.")
    for nums in [[1, 2, 3], [4, 4], [10, 5, 1]]:
        b.predict(f"def total(nums):\n    t = 0\n    for n in nums:\n        t = t + n\n    return t\n\nprint(total({nums!r}))",
                  [f"def total(nums):\n    t = 0\n    for n in nums:\n        t = t + n\n        return t\n\nprint(total({nums!r}))", f"print(len({nums!r}))"],
                  why="return sits after the loop, so it waits until every number is added.")
        b.predict(f"def total(nums):\n    t = 0\n    for n in nums:\n        t = t + n\n        return t\n\nprint(total({nums!r}))",
                  [f"print(sum({nums!r}))", f"print(len({nums!r}))"],
                  why="return is inside the loop, so the function leaves on the very first lap.")
    for g, n in [("Yo", "Ada"), ("Hey", "Kai")]:
        b.predict(f'def greet(name, greeting="Hi"):\n    return f"{{greeting}}, {{name}}"\n\nprint(greet("{n}", "{g}"))',
                  [f'print("Hi, {n}")', f'print("{n}, {g}")'], why="The second argument replaces the default.")
    for a, c in [(5, 2), (3, 9)]:
        b.predict(f"def lo_hi(a, b):\n    return min(a, b), max(a, b)\n\nprint(lo_hi({a}, {c}))", [f"print({min(a, c)})", f"print([{min(a, c)}, {max(a, c)}])"],
                  why="Returning two values with a comma gives back a tuple.")
    b.predict("def f(a, b):\n    return a + b\n\nprint(f(1))", ["print(1)", "print(None)"], why="f needs two arguments. Giving one is a TypeError.")
    b.predict('def shout(s):\n    return s.upper()\n\ng = shout\nprint(g("hi"))', ['print("hi")', "print(None)"], extra=["shout"],
              why="g = shout gives the function a second name. Calling g calls shout.")
    b.predict('def f(x):\n    print("in")\n    return x * 2\n\nprint(f(f(1)))', ['print("in")\nprint(4)', "print(4)", 'print("in")\nprint(2)'],
              why="The inner f runs first (prints in, gives 2), then the outer f runs (prints in, gives 4).")
    b.fill("def ___(n):\n    return n * n\n\nprint(square(4))", ["square", "n", "print"], why="The name after def is the name you call it by.")
    b.fill("def area(w, h):\n    return w * h\n\nprint(area(___))", ["3, 4", "3", "12"], why="area needs two values: 3 * 4 = 12.")
    b.build('def greet(name):\n    return "Hi " + name', ["print(", "greet(", '"Ada"', ")", ")"], ['"greet"'],
            ask="Print the greeting for Ada.", why="Call greet with Ada inside print.")
    b.order(["def total(nums):", "    t = 0", "    for n in nums:", "        t = t + n", "    return t", "print(total([1, 2]))"],
            why="Box first, loop to add, return after the loop.")
    b.bug(["def total(nums):", "    t = 0", "    for n in nums:", "        t = t + n", "        return t", "print(total([1, 2, 3]))"], 4, "    return t",
          why="return inside the loop leaves after the first number. Move it out by one level.")


def x_errors(b):
    for code, err in [('"abc".push("d")', "AttributeError"), ("len(5)", "TypeError"), ("[].pop()", "IndexError"), ("int('5') + '5'", "TypeError")]:
        b.predict(f"print({code})", ["print(10 / 0)", 'print(int("hi"))', "print(nope)", 'print({"a": 1}["b"])', "print(len(5))"],
                  why=f"{err}: read the error name, it points to the kind of mistake.")
    for v in ["0", "4", '"x"']:
        b.predict(f'try:\n    print(8 / {v})\nexcept ZeroDivisionError:\n    print("zero")\nexcept TypeError:\n    print("type")',
                  ['print("zero")', 'print("type")', "print(2.0)"], why="Python picks the except that matches the error. No error: no except.")
    for code in ["1 / 0", 'int("x")', "[1][5]"]:
        b.predict(f"try:\n    {code}\nexcept Exception as e:\n    print(type(e).__name__)", ['print("Exception")', 'print("e")', "print(None)"],
                  extra=["ZeroDivisionError", "ValueError", "IndexError"], why="except Exception catches almost everything. type(e).__name__ is the error's name.")
    b.predict('try:\n    print("a")\nfinally:\n    print("b")', ['print("a")', 'print("b")'], why="finally runs no matter what.")
    b.fill('try:\n    x = 1 / 0\nexcept ZeroDivisionError:\n    print("oops")\n___:\n    print("always")', ["finally", "else", "except"],
           why="finally runs every time. else would only run if there was no error.")


def x_tuples(b):
    for t in [(1, 2, 2, 3), (5, 5, 5), (4, 1, 4)]:
        b.predict(f"t = {t!r}\nprint(t.count({t[1]}))", [f"t = {t!r}\nprint(len(t))", f"print({t[1]})"], extra=["0", "1", "2", "3"], why=".count() tells how often a value appears.")
        b.predict(f"t = {t!r}\nprint(len(t))", [f"print(len(set({t!r})))", f"print({len(t) - 1})"], extra=[str(len(t) + 1)], why="len counts every item, repeats too.")
    for pairs in [[("tea", 3), ("pie", 5)], [("a", 1), ("b", 2), ("c", 3)]]:
        b.predict(f"for name, n in {pairs!r}:\n    print(name, n)", [f"for p in {pairs!r}:\n    print(p)", f"print({pairs!r})"],
                  why="Each tuple is unpacked into two boxes every lap.")
    for nums in [[3, 1, 3, 2], [5, 5, 4]]:
        b.predict(f"print(sorted(set({nums!r})))", [f"print(sorted({nums!r}))", f"print(set({nums!r}))"],
                  why="set drops repeats, sorted gives a sorted list back.")
    b.predict("s = {1, 2}\ns.remove(5)\nprint(s)", ["print({1, 2})", "print({1, 2, 5})"], why="Removing something that is not there raises KeyError.")
    b.predict("print((1, 2) + (3,))", ["print((1, 2, 3, 3))", "print([1, 2, 3])"], why="+ joins two tuples into a new one.")
    b.predict("print(3 in {1, 2, 3})", ["print(3)", "print({3})"], extra=["True", "False"], why="in works on sets too, and it is very fast.")
    b.fill("a, b, c = ___\nprint(b)", ["(1, 2, 3)", "(1, 2)", "1"], why="Three boxes need exactly three values.")
    b.order(["point = (3, 4)", "x, y = point", "print(x + y)"], why="Make the tuple, unpack it, use the boxes.")


def x_comps(b):
    for w in ["abc", "owl", "tea"]:
        b.predict(f'print([ch for ch in "{w}"])', [f'print("{w}")', f'print(["{w}"])'], why="Looping a string gives one character per item.")
        b.predict(f'print([ch.upper() for ch in "{w}"])', [f'print("{w}".upper())', f'print([ch for ch in "{w}"])'], why="Each character gets .upper() on its way in.")
    for nums, k in [([1, 5, 8, 3], 4), ([10, 2, 7], 5), ([6, 1, 9, 4], 5)]:
        b.predict(f"nums = {nums!r}\nprint([n for n in nums if n > {k}])", [f"nums = {nums!r}\nprint([n for n in nums if n < {k}])", f"print({nums!r})"],
                  why=f"Only numbers above {k} pass the filter.")
        b.predict(f"nums = {nums!r}\nprint(len([n for n in nums if n > {k}]))", [f"print(len({nums!r}))", f"nums = {nums!r}\nprint([n for n in nums if n > {k}])"],
                  why="len counts how many passed the filter.")
    for n in [3, 4]:
        b.predict(f'print(["hi" for _ in range({n})])', [f'print("hi" * {n})', f'print(["hi"])'], why="_ just means: I do not need the counter.")
        b.predict(f"print(sum(x * x for x in range({n})))", [f"print([x * x for x in range({n})])", f"print({n} * {n})"], why="sum adds up every square.")
    b.predict("print({x % 3 for x in range(7)})", ["print([x % 3 for x in range(7)])", "print({0, 1, 2, 3})"], why="Curly brackets make a set, so repeats disappear.")
    b.predict('d = {"a": 1, "b": 2}\nprint({k: v * 10 for k, v in d.items()})', ['print({"a": 1, "b": 2})', "print([10, 20])"],
              why="Same keys, every value times 10.")
    b.fill('print([w ___ for w in ["a", "b"]])'.replace("w ___", "w.___()"), ["upper", "lower", "strip"], why="A and B means .upper().")
    b.fill("print([n for n in range(10) if n % 2 ___ 0])", ["==", "!=", ">"], why="Even numbers have remainder 0.")
    b.build("", ["print(", "[w[0]", "for w in", '["owl", "cat"]]', ")"], ["[w", '["owl"]]'], ask="Print the first letter of each word.",
            why="w[0] is the first letter of each w.")
    b.order(['words = ["tea", "jam", "pie"]', "lengths = [len(w) for w in words]", "print(sum(lengths))"], why="Make the list, transform it, add it up.")
    b.bug(["nums = [1, 2, 3]", "print([n * 2 for nums in n])"], 1, "print([n * 2 for n in nums])", why="It is for ITEM in LIST: n in nums, not the other way round.")


def x_classes(b):
    for name, n in [("Roux", 2), ("Junie", 3), ("Kai", 1)]:
        b.predict(f'class Counter:\n    def __init__(self):\n        self.n = 0\n    def tick(self):\n        self.n = self.n + 1\n        return self.n\n\nc = Counter()\n' + "c.tick()\n" * n + "print(c.tick())",
                  [f"print({n})", "print(1)", f"print({n + 2})"], why="Every tick adds 1 to this counter's n and returns it.")
        b.predict(f'class Cat:\n    def __init__(self, name, age=1):\n        self.name = name\n        self.age = age\n\nc = Cat("{name}")\nprint(c.name, c.age)',
                  [f'print("{name}")', f'print("{name}", None)'], why="age was not given, so the default 1 is used.")
        b.predict(f'class Cat:\n    def __init__(self, name):\n        self.name = name\n    def __str__(self):\n        return "Cat " + self.name\n\nprint(Cat("{name}"))',
                  [f'print("{name}")', 'print("Cat")'], extra=["<__main__.Cat object>"], why="__str__ decides what print shows for the object.")
    b.predict('class Owl:\n    kind = "bird"\n\na = Owl()\nb = Owl()\nprint(a.kind, b.kind)', ['print("bird")', 'print("Owl Owl")'],
              why="A class attribute is shared by every object made from the class.")
    b.predict('class Cat:\n    def __init__(self, name):\n        self.name = name\n\nc = Cat("Roux")\nprint(c.nme)', ['print("Roux")', "print(None)"],
              why="nme is a typo. The object has no such attribute: AttributeError.")
    b.predict('class Cat:\n    def __init__(self, name):\n        self.name = name\n\ncats = [Cat("Roux"), Cat("Tom")]\nprint(cats[1].name)', ['print("Roux")', 'print("cats")'],
              why="A list can hold objects. [1] is the second cat.")
    b.predict('class Box:\n    def __init__(self, v):\n        self.v = v\n    def double(self):\n        return self.v * 2\n    def quad(self):\n        return self.double() * 2\n\nprint(Box(3).quad())',
              ["print(6)", "print(3)"], why="quad calls double on the same object: 3 * 2 * 2.")
    b.predict('class Cat:\n    def __init__(self, name):\n        self.name = name\n\nprint(Cat())', ['print("Cat")', "print(None)"],
              why="__init__ needs a name. Making Cat() without one is a TypeError.")
    b.fill('class Dog:\n    def bark(___):\n        return "woof"\n\nprint(Dog().bark())', ["self", "", "self, x"], why="Every method's first parameter is self, and bark takes nothing else.")
    b.fill('class Cat:\n    def __init__(self, name):\n        self.name = name\n\nc = Cat("Roux")\nprint(c.___)', ["name", "self", "Roux"], why="Read the attribute with a dot: c.name.")
    b.build('class Cat:\n    def __init__(self, name):\n        self.name = name\nc = Cat("Roux")', ["print(", "c.name", ")"], ['"name"', "Cat.name"],
            ask="Print the cat's name.", why="object.attribute reads it.")
    b.order(["class Counter:", "    def __init__(self):", "        self.n = 0", "c = Counter()", "c.n = c.n + 5", "print(c.n)"],
            why="Class, object, change it, print it.")
    b.bug(["class Dog:", "    def speak():", '        return "woof"', "print(Dog().speak())"], 1, "    def speak(self):",
          why="Methods need self as the first parameter.")
