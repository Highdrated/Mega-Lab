export const lessons = [
  {
    slug: "variables",
    title: "Variables",
    blurb: "A name that remembers a value.",
    minutes: 2,
    drill: "basics",
    body: `
<p>A variable is a label you stick on a value so you can use it later without retyping it.</p>
<pre><code>x = 7
y = x + 3</code></pre>
<p>Read <code>=</code> as <em>"becomes"</em>, not as "equals". The right side is worked out first, then the answer is stored under the name on the left.</p>
<p>So after those two lines, <code>y</code> holds <code>10</code>. If <code>x</code> changes afterwards, <code>y</code> does <strong>not</strong> follow — it already took its copy.</p>
<h4>The shorthand you'll see everywhere</h4>
<pre><code>x = x + 3
x += 3</code></pre>
<p>Both lines do exactly the same thing. The second is just shorter. There is <code>-=</code>, <code>*=</code> and <code>/=</code> too.</p>`
  },
  {
    slug: "functions",
    title: "Functions",
    blurb: "Wrapping work up so you can use it again.",
    minutes: 4,
    drill: "basics",
    body: `
<p>A function is a bundle of steps with a name on it. You write the steps once, then use the name whenever you need them.</p>
<pre><code>def double(n):
    return n * 2</code></pre>
<p>Reading that line by line:</p>
<ul>
<li><code>def</code> — "I am defining a function"</li>
<li><code>double</code> — what it is called</li>
<li><code>(n)</code> — what it needs handed to it. This is a placeholder name for whatever arrives</li>
<li><code>:</code> — the colon that opens the block, same as with <code>if</code> and <code>for</code></li>
<li>the indented lines — the actual work</li>
</ul>
<h4>Nothing happens until you call it</h4>
<p>Defining a function just teaches Python the recipe. It sits there doing nothing until you use its name with brackets:</p>
<pre><code>double(5)     ->  10
double(100)   ->  200</code></pre>
<p>The value you put in the brackets lands in <code>n</code> for that one run.</p>
<h4>return hands something back</h4>
<p>This is the part people trip over. <code>return</code> gives a value <em>back to whoever called the function</em>. It does not print anything.</p>
<pre><code>def double(n):
    return n * 2

answer = double(5)    # answer is now 10</code></pre>
<p>A function with no <code>return</code> hands back <code>None</code> — Python's word for nothing. If your function seems to "not work", a missing <code>return</code> is the usual culprit.</p>
<h4>return also stops the function dead</h4>
<pre><code>def count_evens(nums):
    count = 0
    for n in nums:
        if n % 2 == 0:
            count += 1
        return count      # WRONG - inside the loop</code></pre>
<p>That <code>return</code> fires on the very first item and the function quits. Move it out one level and it runs to the end first. Indentation is the whole difference.</p>
<h4>Why bother</h4>
<p>Three reasons. You write it once instead of five times. When it is wrong, there is one place to fix. And a good name — <code>pages()</code>, <code>is_even()</code> — explains itself where a wall of maths would not.</p>`
  },
  {
    slug: "operators",
    title: "Arithmetic",
    blurb: "The four symbols, and the one that surprises people.",
    minutes: 2,
    drill: "basics",
    body: `
<p>Python's maths symbols are mostly what you'd expect:</p>
<pre><code>7 + 2   ->  9
7 - 2   ->  5
7 * 2   ->  14
7 / 2   ->  3.5</code></pre>
<p>The one that catches people out is <code>/</code>. It always gives a decimal, even when the division is exact — <code>10 / 5</code> is <code>2.0</code>, not <code>2</code>.</p>
<p>If you want a whole number, use <code>//</code>:</p>
<pre><code>7 // 2  ->  3</code></pre>
<p>That's "divide and throw away the remainder". Which raises an obvious question: where did the remainder go? That's the next lesson.</p>`
  },
  {
    slug: "whitespace",
    title: "Spaces and style",
    blurb: "What Python demands, and what is just good manners.",
    minutes: 3,
    drill: "basics",
    body: `
<p>Two kinds of whitespace in Python, and only one of them is compulsory.</p>
<h4>Spaces around symbols: optional</h4>
<pre><code>x=7
x = 7
x   =   7</code></pre>
<p>All three run. All three do the same thing. Python genuinely does not care.</p>
<p>So why does everyone write <code>x = 7</code>? Because of <strong>PEP 8</strong>, Python's official style guide. It is not enforced by the language — it is enforced by every other person who reads your code.</p>
<p>The guidance: one space either side of <code>=</code>, and either side of <code>+</code>, <code>-</code>, <code>*</code>, <code>==</code> and friends.</p>
<h4>One exception that looks inconsistent</h4>
<pre><code>x = 7                 spaces
def f(a, b=2):        no spaces
f(name="ana")         no spaces</code></pre>
<p>Same symbol, opposite rule. An <code>=</code> that <em>assigns</em> gets spaces. An <code>=</code> that names an argument does not. It reads as one tight unit that way.</p>
<h4>Indentation: not optional</h4>
<p>This one is real syntax. Indentation is how Python knows what sits inside what.</p>
<pre><code>def f():
return 1        # IndentationError</code></pre>
<p>Other languages use curly brackets for this. Python uses the shape of the text, which is why Python code looks tidy — you have no choice.</p>
<p>4 spaces is the convention. 2 works. A tab works. <strong>Mixing them in one file does not</strong>, and the error message will not be kind about it. Set your editor to insert spaces when you press Tab and never think about it again.</p>
<h4>Blank lines</h4>
<p>Two blank lines between functions, one to separate steps inside one. Nothing enforces this either — it just stops your code reading like one long shout.</p>`
  },
  {
    slug: "modulo",
    title: "Modulo",
    blurb: "The leftovers after division — and why they matter.",
    minutes: 3,
    drill: "modulo",
    body: `
<p><code>%</code> gives you the <strong>remainder</strong> after dividing.</p>
<pre><code>17 % 5  ->  2</code></pre>
<p>Why 2? Because 5 fits into 17 three times (that's 15), and 2 is left over.</p>
<h4>What it's actually for</h4>
<p>Modulo answers "is this a multiple of that?" — and the answer is yes when the remainder is <code>0</code>.</p>
<pre><code>n % 2 == 0    even?
n % 3 == 0    every third one?</code></pre>
<p>It also <em>wraps</em> numbers around. On a 10-wide grid, <code>x % 10</code> keeps <code>x</code> between 0 and 9 forever — walk off the right edge and you reappear on the left. That's how Pac-Man works, and it's how clock faces work.</p>`
  },
  {
    slug: "indexing",
    title: "Indexing",
    blurb: "Counting from zero, and counting backwards.",
    minutes: 3,
    drill: "indexing",
    body: `
<p>Lists count from <strong>0</strong>, not 1.</p>
<pre><code>arr = [10, 20, 30, 40]
        0   1   2   3</code></pre>
<p>So <code>arr[0]</code> is <code>10</code> and <code>arr[3]</code> is <code>40</code>. There is no <code>arr[4]</code> — asking for it is an error.</p>
<p>The rule worth memorising: <strong>the last valid index is length minus one.</strong></p>
<h4>Negative indexes</h4>
<p>Python lets you count from the end using minus signs:</p>
<pre><code>arr[-1]  ->  40   the last one
arr[-2]  ->  30   second from last</code></pre>
<p>There's no <code>-0</code>, which is why the end starts at <code>-1</code> rather than <code>0</code>.</p>`
  },
  {
    slug: "slicing",
    title: "Slicing",
    blurb: "Taking a piece out of a string or list.",
    minutes: 3,
    drill: "strings",
    body: `
<p>A slice takes a run of items using <code>[start:stop]</code>.</p>
<pre><code>word = "python"
word[1:4]  ->  "yth"</code></pre>
<p>The critical detail: <strong>stop is not included.</strong> The slice runs up to it and halts.</p>
<p>That sounds annoying until you notice the payoff — the length of a slice is always <code>stop - start</code>. No adding one, no subtracting one. <code>[1:4]</code> gives 3 items, always.</p>
<h4>Leaving parts out</h4>
<pre><code>word[:3]   from the start
word[3:]   to the end
word[:]    the whole thing</code></pre>`
  },
  {
    slug: "ranges",
    title: "range()",
    blurb: "Counting machines, and the off-by-one that isn't.",
    minutes: 3,
    drill: "ranges",
    body: `
<p><code>range(start, stop, step)</code> produces numbers, counting from <code>start</code>, jumping by <code>step</code>, stopping <strong>before</strong> <code>stop</code>.</p>
<pre><code>range(0, 10, 2)  ->  0, 2, 4, 6, 8</code></pre>
<p>Notice 10 is missing. Same rule as slicing — stop is a boundary you never reach.</p>
<p>With one argument, it counts from zero: <code>range(5)</code> gives <code>0 1 2 3 4</code> — exactly five numbers, and exactly the valid indexes of a five-item list. That's not a coincidence, it's the whole design.</p>
<h4>Working out how many</h4>
<p>The count is <code>(stop - start) / step</code>, rounded up. For <code>range(2, 20, 3)</code>: <code>(20-2)/3 = 6</code> numbers.</p>`
  },
  {
    slug: "binary",
    title: "Binary",
    blurb: "Counting with two fingers.",
    minutes: 3,
    drill: "binary",
    body: `
<p>Normal numbers use ten digits and each place is worth ten times the last: 1, 10, 100, 1000.</p>
<p>Binary uses two digits, and each place is worth <strong>twice</strong> the last: 1, 2, 4, 8, 16, 32.</p>
<pre><code>0b1011
  8 4 2 1
  1 0 1 1   ->  8 + 2 + 1 = 11</code></pre>
<p>The <code>0b</code> at the front is just Python saying "what follows is binary". To convert, add up the place values wherever there's a 1.</p>
<h4>Handy ones to know</h4>
<pre><code>0b1111    ->  15
0b10000   ->  16
0b11111111 -> 255</code></pre>
<p>A row of n ones is always one less than the next power of two. That's why so many limits in computing are 255, 1023, 65535.</p>`
  },
  {
    slug: "powers",
    title: "Powers",
    blurb: "Repeated multiplication, and how fast it runs away.",
    minutes: 2,
    drill: "powers",
    body: `
<p><code>**</code> means "to the power of".</p>
<pre><code>3 ** 4  ->  81</code></pre>
<p>That's <code>3 × 3 × 3 × 3</code> — the number multiplied by itself four times.</p>
<p>Watch out for <code>^</code>. In maths it means powers; in Python it means something else entirely (bitwise XOR). Using it by mistake gives a wrong answer rather than an error, which makes it a nasty bug.</p>
<h4>Doubling is brutal</h4>
<pre><code>2 ** 10  ->  1024
2 ** 20  ->  1048576
2 ** 30  ->  1073741824</code></pre>
<p>Ten doublings gets you past a thousand, twenty past a million, thirty past a billion. This is why an algorithm that doubles its work each step is a problem, and why one that halves it is a gift.</p>`
  },
  {
    slug: "aggregates",
    title: "sum, max, min, len",
    blurb: "Four functions that squash a list into one number.",
    minutes: 2,
    drill: "stats",
    body: `
<p>These take a whole list and hand back a single value.</p>
<pre><code>nums = [4, 9, 2, 7]

sum(nums)  ->  22
max(nums)  ->  9
min(nums)  ->  2
len(nums)  ->  4</code></pre>
<h4>Building an average</h4>
<p>There's no <code>average()</code> built in — you make it from two of the others:</p>
<pre><code>sum(nums) / len(nums)  ->  5.5</code></pre>
<p>And the spread of a list is <code>max(nums) - min(nums)</code>. Small pieces, combined. That's most of programming.</p>`
  },
  {
    slug: "ceil",
    title: "Rounding up",
    blurb: "Why pagination always needs ceil().",
    minutes: 2,
    drill: "webmath",
    body: `
<p><code>ceil()</code> rounds <em>up</em> to the next whole number, always — even for 2.01.</p>
<pre><code>ceil(53 / 8)  ->  7</code></pre>
<p>53 items at 8 per page is 6.625 pages. But you cannot have 0.625 of a page, and the leftover items still need somewhere to go — so it's 7.</p>
<p>This is the single most common place beginners ship a bug: use normal rounding and 53 items becomes 7 pages, but 51 items becomes 6 pages and three items vanish off the end of your site.</p>
<h4>Percentages off</h4>
<pre><code>price * (1 - 25/100)</code></pre>
<p>A 25% discount means keeping 75%. Rather than working out the discount and subtracting it, multiply by what's left. One step instead of two.</p>`
  }
];

export const intro = "Short pages. Read one, then drill it — the button at the bottom of each page drops you straight into matching puzzles.";
