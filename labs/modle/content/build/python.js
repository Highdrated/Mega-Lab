export const challenges = [
  {
    slug: "double-it",
    uses: ["basics"],
    lesson: "variables",
    hint: "Multiply by 2 with <code>*</code>. The answer is one line.",
    title: "Double it",
    level: "warm-up",
    goal: "Write a function <code>double(n)</code> that gives back <code>n</code> multiplied by two.",
    starter: "def double(n):\n    return n\n",
    tests: [
      { call: "double(4)", expect: 8 },
      { call: "double(0)", expect: 0 },
      { call: "double(-3)", expect: -6 },
      { call: "double(1000)", expect: 2000 }
    ]
  },
  {
    slug: "is-even",
    uses: ["modulo"],
    lesson: "modulo",
    hint: "Use <code>%</code> to get the leftover, then compare it to 0 with <code>==</code>.",
    title: "Even or odd",
    level: "warm-up",
    goal: "Write <code>is_even(n)</code> that returns <code>True</code> when <code>n</code> is even, otherwise <code>False</code>. Modulo is your friend here.",
    starter: "def is_even(n):\n    return False\n",
    tests: [
      { call: "is_even(4)", expect: true },
      { call: "is_even(7)", expect: false },
      { call: "is_even(0)", expect: true },
      { call: "is_even(-2)", expect: true }
    ]
  },
  {
    slug: "pages",
    uses: ["webmath"],
    lesson: "ceil",
    hint: "Whole division <code>//</code> rounds down. You need it to round up — think about adding a bit first, or import <code>math</code> and use <code>math.ceil</code>.",
    title: "Pagination",
    level: "everyday",
    goal: "Write <code>pages(total, per_page)</code> returning how many pages you need. 53 items at 8 per page is 7 pages, not 6.",
    starter: "def pages(total, per_page):\n    return 0\n",
    tests: [
      { call: "pages(53, 8)", expect: 7 },
      { call: "pages(16, 8)", expect: 2 },
      { call: "pages(1, 8)", expect: 1 },
      { call: "pages(0, 8)", expect: 0 }
    ]
  },
  {
    slug: "last-index",
    uses: ["indexing"],
    lesson: "indexing",
    hint: "<code>len()</code> gives the count. The last position is one less than that. Handle the empty list separately.",
    title: "Last index",
    level: "everyday",
    goal: "Write <code>last_index(items)</code> returning the index of the final item. Return <code>-1</code> for an empty list.",
    starter: "def last_index(items):\n    return 0\n",
    tests: [
      { call: "last_index([1, 2, 3])", expect: 2 },
      { call: "last_index(['a'])", expect: 0 },
      { call: "last_index([])", expect: -1 },
      { call: "last_index(list(range(50)))", expect: 49 }
    ]
  },
  {
    slug: "average",
    uses: ["stats"],
    lesson: "aggregates",
    hint: "<code>sum()</code> divided by <code>len()</code>. Check for an empty list first or you divide by zero.",
    title: "Average",
    level: "everyday",
    goal: "Write <code>average(nums)</code> returning the mean. Return <code>0</code> for an empty list rather than crashing.",
    starter: "def average(nums):\n    return 0\n",
    tests: [
      { call: "average([2, 4, 6])", expect: 4 },
      { call: "average([10])", expect: 10 },
      { call: "average([])", expect: 0 },
      { call: "average([1, 2])", expect: 1.5 }
    ]
  },
  {
    slug: "to-binary",
    uses: ["binary"],
    lesson: "binary",
    hint: "Python has <code>bin(n)</code> built in, but it puts <code>0b</code> on the front. A slice can trim that off.",
    title: "Binary string",
    level: "trickier",
    goal: "Write <code>to_binary(n)</code> returning <code>n</code> as a binary string with no <code>0b</code> prefix. Zero should give <code>\"0\"</code>.",
    starter: "def to_binary(n):\n    return \"\"\n",
    tests: [
      { call: "to_binary(5)", expect: "101" },
      { call: "to_binary(0)", expect: "0" },
      { call: "to_binary(255)", expect: "11111111" },
      { call: "to_binary(16)", expect: "10000" }
    ]
  },
  {
    slug: "wrap",
    uses: ["modulo"],
    lesson: "modulo",
    hint: "One operator does this whole job, and it handles negatives correctly too.",
    title: "Wrap around",
    level: "trickier",
    goal: "Write <code>wrap(x, width)</code> so a position that walks off the right edge reappears on the left. Negative values should wrap too.",
    starter: "def wrap(x, width):\n    return x\n",
    tests: [
      { call: "wrap(12, 10)", expect: 2 },
      { call: "wrap(9, 10)", expect: 9 },
      { call: "wrap(-1, 10)", expect: 9 },
      { call: "wrap(20, 10)", expect: 0 }
    ]
  },
  {
    slug: "count-char",
    uses: ["strings"],
    lesson: "slicing",
    hint: "Start a counter at 0, loop over the text with <code>for</code>, and add 1 when the character matches.",
    title: "Count a letter",
    level: "trickier",
    goal: "Write <code>count_char(text, ch)</code> returning how many times <code>ch</code> appears in <code>text</code>. Do it with a loop, not <code>.count()</code>.",
    starter: "def count_char(text, ch):\n    return 0\n",
    tests: [
      { call: "count_char('banana', 'a')", expect: 3 },
      { call: "count_char('banana', 'z')", expect: 0 },
      { call: "count_char('', 'a')", expect: 0 },
      { call: "count_char('aaa', 'a')", expect: 3 }
    ]
  }
];
