export const bugs = [
  {
    slug: "avg-count",
    title: "Average of a list",
    kind: "off-by-one",
    lines: [
      "def average(nums):",
      "    total = 0",
      "    for i in range(len(nums) - 1):",
      "        total += nums[i]",
      "    return total / len(nums)"
    ],
    bad: 2,
    why: "range(len(nums) - 1) stops one short, so the last number never gets added. The list is read correctly everywhere else, which is what makes this hard to spot — the answer is just quietly a bit too small.",
    fix: "    for i in range(len(nums)):"
  },
  {
    slug: "swap-temp",
    title: "Swapping two values",
    kind: "logic",
    lines: [
      "def swap(pair):",
      "    a = pair[0]",
      "    pair[0] = pair[1]",
      "    pair[1] = pair[0]",
      "    return pair"
    ],
    bad: 3,
    why: "By line 4, pair[0] has already been overwritten — so pair[1] gets the value that was just copied in, not the original. Both slots end up holding the same thing.",
    fix: "    pair[1] = a"
  },
  {
    slug: "mutate-loop",
    title: "Removing items while looping",
    kind: "mutation",
    lines: [
      "def drop_zeros(nums):",
      "    for n in nums:",
      "        if n == 0:",
      "            nums.remove(n)",
      "    return nums"
    ],
    bad: 1,
    why: "Removing from a list while iterating over it shifts every later item down one, so the loop skips the element right after each removal. Two zeros in a row and one survives. Looping over a copy leaves the positions stable.",
    fix: "    for n in nums[:]:"
  },
  {
    slug: "default-list",
    title: "Default argument",
    kind: "shared-state",
    lines: [
      "def collect(item, bucket=[]):",
      "    bucket.append(item)",
      "    return bucket",
      "",
      "first = collect(1)",
      "second = collect(2)"
    ],
    bad: 0,
    why: "A default argument is created once, when the function is defined — not each time it is called. So every call without a bucket shares the same list, and second comes back as [1, 2]. The cure is a None default plus a guard, which is why this fix is two lines.",
    fix: "def collect(item, bucket=None):\n    if bucket is None:\n        bucket = []"
  },
  {
    slug: "int-div",
    title: "Splitting into pages",
    kind: "rounding",
    lines: [
      "def pages(total, per_page):",
      "    return total // per_page",
      "",
      "print(pages(53, 8))"
    ],
    bad: 1,
    why: "// rounds down, so 53 items at 8 per page gives 6 — and the last 5 items have no page to live on. Pagination always needs rounding up.",
    fix: "    return (total + per_page - 1) // per_page"
  },
  {
    slug: "and-or",
    title: "Range check",
    kind: "operator",
    lines: [
      "def in_range(n):",
      "    if n > 0 or n < 100:",
      "        return True",
      "    return False"
    ],
    bad: 1,
    why: "or is true when either side is true, so every number passes — 500 is greater than 0, and -20 is less than 100. Both conditions must hold at once.",
    fix: "    if n > 0 and n < 100:"
  },
  {
    slug: "is-equals",
    title: "Comparing values",
    kind: "identity",
    lines: [
      "def check(text):",
      "    total = int(text)",
      "    if total is 1000:",
      "        return 'exact'",
      "    return 'other'"
    ],
    bad: 2,
    why: "is asks whether two names point at the same object, not whether they hold the same value. Written as a bare literal it can appear to work, because Python reuses small constants — but the moment the number is computed or parsed at runtime it is a different object, and the check silently fails.",
    fix: "    if total == 1000:"
  },
  {
    slug: "last-index",
    title: "Reading the final item",
    kind: "off-by-one",
    lines: [
      "def last(items):",
      "    n = len(items)",
      "    return items[n]"
    ],
    bad: 2,
    why: "Indexes stop one below the length — a 4-item list runs 0 to 3, so items[4] is off the end. This one at least crashes loudly, which makes it kinder than most.",
    fix: "    return items[n - 1]"
  },
  {
    slug: "string-concat",
    title: "Building a total",
    kind: "types",
    lines: [
      "def add_all(values):",
      "    total = ''",
      "    for v in values:",
      "        total += v",
      "    return total"
    ],
    bad: 1,
    why: "total starts as text, so += glues the values together instead of adding them. Passing ['1', '2'] returns '12' rather than 3 — and it never raises an error.",
    fix: "    total = 0"
  },
  {
    slug: "return-in-loop",
    title: "Counting matches",
    kind: "control-flow",
    lines: [
      "def count_evens(nums):",
      "    count = 0",
      "    for n in nums:",
      "        if n % 2 == 0:",
      "            count += 1",
      "        return count"
    ],
    bad: 5,
    why: "The return sits inside the loop, so the function stops after examining the very first item. Indentation is the entire bug — the logic above it is correct.",
    fix: "    return count"
  },
  {
    slug: "shadow-builtin",
    title: "Shadowed name",
    kind: "shadowing",
    lines: [
      "def unique_count(rows):",
      "    list = []",
      "    for r in rows:",
      "        list.append(r)",
      "    return len(list(set(list)))"
    ],
    bad: 1,
    span: 4,
    why: "Naming a variable list hides Python's own list. Everything looks fine until the last line tries to call list() and gets the variable instead, failing with a baffling error about a list not being callable.",
    fix: "    items = []\n    for r in rows:\n        items.append(r)\n    return len(list(set(items)))"
  },
  {
    slug: "range-step",
    title: "Every second item",
    kind: "off-by-one",
    lines: [
      "def evens_up_to(n):",
      "    out = []",
      "    for i in range(0, n, 2):",
      "        out.append(i)",
      "    return out",
      "",
      "print(evens_up_to(10))"
    ],
    bad: 2,
    why: "range stops before its endpoint, so 10 itself is never included. If the caller expects evens up to and including n, the stop value needs to be n + 1.",
    fix: "    for i in range(0, n + 1, 2):"
  },
  {
    slug: "copy-list",
    title: "Copying a list",
    kind: "reference",
    lines: [
      "def with_extra(items):",
      "    copy = items",
      "    copy.append('new')",
      "    return copy"
    ],
    bad: 1,
    why: "This gives the same list a second name rather than making a copy, so appending changes the caller's original list too. The function looks pure and quietly is not.",
    fix: "    copy = items[:]"
  },
  {
    slug: "float-equal",
    title: "Checking a total",
    kind: "floats",
    lines: [
      "def is_whole(price):",
      "    if price * 3 == 0.3:",
      "        return True",
      "    return False",
      "",
      "print(is_whole(0.1))"
    ],
    bad: 1,
    why: "0.1 * 3 is 0.30000000000000004 in binary floating point, so the comparison fails. Decimals that look exact on paper rarely are exact in memory.",
    fix: "    if abs(price * 3 - 0.3) < 1e-9:"
  },
  {
    slug: "negative-mod",
    title: "Wrapping backwards",
    kind: "modulo",
    lines: [
      "def wrap(x, width):",
      "    if x >= width:",
      "        return x - width",
      "    return x",
      "",
      "print(wrap(-1, 10))"
    ],
    bad: 1,
    span: 3,
    why: "Only the right-hand edge is handled. A negative position falls straight through and comes back as -1 instead of wrapping round to 9. Modulo handles both ends at once.",
    fix: "    return x % width"
  },
  {
    slug: "append-extend",
    title: "Merging two lists",
    kind: "collections",
    lines: [
      "def merge(a, b):",
      "    out = a[:]",
      "    out.append(b)",
      "    return out"
    ],
    bad: 2,
    why: "append adds b as a single item, so merging [1,2] with [3,4] gives [1, 2, [3, 4]] — a list hiding inside a list. extend adds the elements one by one.",
    fix: "    out.extend(b)"
  }
];

export const intro = "One line in each snippet is wrong. Not typos — these are the quiet kind that run without complaining and give you the wrong answer.";
