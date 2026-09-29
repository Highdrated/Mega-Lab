export const sets = [
  {
    slug: "missing-colon",
    kind: "missing colon",
    bad: "if score > 90\n    print('top marks')",
    fix: "if score > 90:",
    why: "Every block header ends with a colon — if, for, while, def, class, else. The colon is what tells Python a block is about to open. Miss it and nothing after it parses.",
    good: [
      "for i in range(3):\n    print(i)",
      "while count > 0:\n    count -= 1",
      "def greet(name):\n    return 'hi ' + name"
    ]
  },
  {
    slug: "assign-in-if",
    kind: "= instead of ==",
    bad: "if total = 100:\n    print('exact')",
    fix: "if total == 100:",
    why: "One equals sign assigns a value; two compare values. Python refuses assignment inside an if on purpose — in languages that allow it, this typo is a classic source of silent bugs.",
    good: [
      "if total == 100:\n    print('exact')",
      "if name != 'admin':\n    deny()",
      "total = 100"
    ]
  },
  {
    slug: "unclosed-bracket",
    kind: "unbalanced bracket",
    bad: "values = [1, 2, 3\nprint(len(values))",
    fix: "values = [1, 2, 3]",
    why: "The list is opened but never closed, so Python keeps reading the next line as part of it and then falls over. Unbalanced brackets often report the error on the line after the real mistake.",
    good: [
      "values = [1, 2, 3]",
      "pairs = {'a': 1, 'b': 2}",
      "total = sum([1, 2, 3])"
    ]
  },
  {
    slug: "quote-mismatch",
    kind: "mismatched quotes",
    bad: "message = 'hello\"",
    fix: "message = 'hello'",
    why: "A string has to end with the same quote character it started with. Mixing them means Python never sees the string close.",
    good: [
      "message = 'hello'",
      "message = \"hello\"",
      "message = \"it's fine\""
    ]
  },
  {
    slug: "bad-indent",
    kind: "indentation",
    bad: "def total(items):\nreturn sum(items)",
    fix: "    return sum(items)",
    why: "Indentation is real syntax in Python, not decoration. The body of a function has to be indented further than the def line — that indent is how Python knows what belongs inside.",
    good: [
      "def total(items):\n    return sum(items)",
      "if ready:\n    go()",
      "for x in xs:\n    print(x)"
    ]
  },
  {
    slug: "missing-comma",
    kind: "missing comma",
    bad: "point = (3 4)",
    fix: "point = (3, 4)",
    why: "Items in a tuple, list or dict are separated by commas. Without one, Python sees two values jammed together and cannot tell what you meant.",
    good: [
      "point = (3, 4)",
      "sizes = [10, 20, 30]",
      "print(x, y)"
    ]
  },
  {
    slug: "keyword-name",
    kind: "reserved word",
    bad: "class = 'Biology'",
    fix: "class_name = 'Biology'",
    why: "class is a reserved word — it starts a class definition, so it cannot also be a variable name. The same applies to if, for, return, import, lambda and friends.",
    good: [
      "class_name = 'Biology'",
      "klass = 'Biology'",
      "subject = 'Biology'"
    ]
  },
  {
    slug: "bad-def",
    kind: "function definition",
    bad: "def add(a, b)\n    return a + b",
    fix: "def add(a, b):",
    why: "A def line needs both the parentheses and the closing colon. This one has the arguments right and still will not run.",
    good: [
      "def add(a, b):\n    return a + b",
      "def now():\n    return 0",
      "def scale(n, factor=2):\n    return n * factor"
    ]
  },
  {
    slug: "else-alone",
    kind: "orphan else",
    bad: "else:\n    print('nope')",
    fix: "if condition:\n    ...\nelse:",
    why: "else has to be attached to an if, a for or a try. On its own there is nothing for it to be the alternative to.",
    good: [
      "if ok:\n    go()\nelse:\n    stop()",
      "if a:\n    x()\nelif b:\n    y()",
      "try:\n    risky()\nexcept ValueError:\n    pass"
    ]
  },
  {
    slug: "double-operator",
    kind: "stray operator",
    bad: "total = 5 + * 3",
    fix: "total = 5 * 3",
    why: "Two operators cannot sit side by side with nothing between them. Python reaches the * expecting a value and finds another operator instead.",
    good: [
      "total = 5 * 3",
      "total = 5 + 3",
      "total = -5 + 3"
    ]
  },
  {
    slug: "bad-dict",
    kind: "dictionary colon",
    bad: "ages = {'ana' 31, 'bo': 24}",
    fix: "ages = {'ana': 31, 'bo': 24}",
    why: "Each dictionary entry is key colon value. The first pair here is missing its colon, so Python cannot tell key from value.",
    good: [
      "ages = {'ana': 31, 'bo': 24}",
      "empty = {}",
      "counts = dict(a=1, b=2)"
    ]
  },
  {
    slug: "return-outside",
    kind: "return at top level",
    bad: "total = 5\nreturn total",
    fix: "def get_total():\n    return 5",
    why: "return only means something inside a function — it hands a value back to whoever called it. At the top level of a file there is no caller to return to.",
    good: [
      "def get_total():\n    return 5",
      "total = 5\nprint(total)",
      "def f():\n    return"
    ]
  }
];

export const intro = "Four cards. Three of them run. One will not even start — it breaks Python's grammar, so you get an error before a single line executes. Find it.";
