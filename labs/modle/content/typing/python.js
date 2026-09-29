export const drills = [
  { slug: "t-assign", level: "short", text: "count = 0" },
  { slug: "t-increment", level: "short", text: "count += 1" },
  { slug: "t-print", level: "short", text: "print(total)" },
  { slug: "t-index", level: "short", text: "first = items[0]" },
  { slug: "t-len", level: "short", text: "n = len(values)" },
  { slug: "t-compare", level: "short", text: "if n == 0:" },

  { slug: "t-def", level: "medium", text: "def average(nums):" },
  { slug: "t-for", level: "medium", text: "for i in range(0, 10, 2):" },
  { slug: "t-return", level: "medium", text: "return sum(nums) / len(nums)" },
  { slug: "t-dict", level: "medium", text: "ages = {'ana': 31, 'bo': 24}" },
  { slug: "t-slice", level: "medium", text: "middle = word[1:4]" },
  { slug: "t-modulo", level: "medium", text: "if number % 2 == 0:" },
  { slug: "t-append", level: "medium", text: "results.append(value)" },
  { slug: "t-fstring", level: "medium", text: "print(f'{name} scored {score}')" },

  { slug: "t-comprehension", level: "long", text: "evens = [n for n in nums if n % 2 == 0]" },
  { slug: "t-nested", level: "long", text: "grid = [[0] * width for _ in range(height)]" },
  { slug: "t-ternary", level: "long", text: "label = 'even' if n % 2 == 0 else 'odd'" },
  { slug: "t-unpack", level: "long", text: "for index, item in enumerate(items):" },
  { slug: "t-default", level: "long", text: "def collect(item, bucket=None):" },
  { slug: "t-try", level: "long", text: "except ValueError as error:" },
  { slug: "t-sorted", level: "long", text: "ranked = sorted(scores, reverse=True)" },
  { slug: "t-join", level: "long", text: "line = ', '.join(str(n) for n in nums)" }
];

export const intro = "Type each line exactly, punctuation and all. Brackets, colons and quotes are where most beginner errors live — this is the muscle memory that stops them.";
