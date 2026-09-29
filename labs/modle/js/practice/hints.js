export const hints = {

  basics: `
<p><b>The four symbols do what you expect.</b> <code>+</code> add, <code>-</code> subtract, <code>*</code> multiply, <code>/</code> divide. Python uses <code>*</code> instead of × and <code>/</code> instead of ÷ because those are the keys on your keyboard.</p>
<p><b>A variable is a labelled box.</b> <code>x = 7</code> means "put 7 in a box called x". After that, writing <code>x</code> anywhere means 7. So <code>x + 3</code> gives 10.</p>
<p><b>Two dividing symbols, and they are different.</b><br>
<code>7 / 2</code> gives <code>3.5</code> — the exact answer, with decimals.<br>
<code>7 // 2</code> gives <code>3</code> — whole numbers only, anything after the dot is thrown away.</p>
<p><b>Multiplication goes first.</b> <code>2 + 3 * 4</code> is <b>14</b>, not 20. Python does the <code>*</code> first (3×4 = 12), then adds the 2. Brackets beat everything: <code>(2 + 3) * 4</code> is 20.</p>`,

  powers: `
<p><b><code>**</code> means "times itself, this many times".</b></p>
<p><code>3 ** 4</code> is not 3×4. It is <b>3 × 3 × 3 × 3</b> = 81. You write down 3 four times and multiply them all together.</p>
<p>Read it out loud as "three to the power of four".</p>
<p><b>Two rules that look odd but always hold:</b><br>
<code>anything ** 1</code> is just the number itself.<br>
<code>anything ** 0</code> is <b>1</b>. Always. Even <code>99 ** 0</code> is 1.</p>
<p><b>Doubling gets huge fast.</b> <code>2 ** 10</code> is already 1024. <code>2 ** 20</code> is over a million. This is why computers talk about 1024 rather than 1000.</p>
<p><b>Half a power is a square root.</b> <code>25 ** 0.5</code> is 5, because 5×5 = 25.</p>`,

  binary: `
<p><b>Binary is counting when you only have two fingers.</b> The only digits allowed are <b>0</b> and <b>1</b>. That is it.</p>
<p><b>Normally</b>, each place in a number is worth ten times the one to its right: 1, 10, 100, 1000.</p>
<p><b>In binary</b>, each place is worth <b>double</b> the one to its right: 1, 2, 4, 8, 16, 32, 64…</p>
<p><b>To read one, line the values up underneath it.</b> Take <code>0b1011</code> — ignore the <code>0b</code>, that just means "binary is coming".</p>
<pre><code>  1   0   1   1
  8   4   2   1     &lt;- what each slot is worth
  ✓   ✗   ✓   ✓     &lt;- keep it? only where there is a 1</code></pre>
<p>Now add up only the ones you kept: <b>8 + 2 + 1 = 11</b>.</p>
<p>That is the whole trick. Write the doubling values under the digits, ignore every 0, add the rest.</p>
<p><b>Going the other way</b> — turning 11 into binary — ask "does 8 fit? yes. does 4 fit in what's left? no. does 2? yes. does 1? yes" → <code>1011</code>.</p>`,

  strings: `
<p><b>A string is just text</b> — letters, spaces, punctuation — wrapped in quotes. <code>"cat"</code> is a string.</p>
<p><b>Counting starts at 0, not 1.</b> This trips up absolutely everyone at first.</p>
<pre><code>  "p"  "y"  "t"  "h"  "o"  "n"
   0    1    2    3    4    5</code></pre>
<p>So <code>"python"[0]</code> is <code>"p"</code> and <code>"python"[2]</code> is <code>"t"</code>.</p>
<p><b>Minus counts from the end.</b> <code>[-1]</code> is the last letter, <code>[-2]</code> the one before it. There is no <code>-0</code>, which is why the end starts at -1.</p>
<p><b>A slice takes a run of letters:</b> <code>[2:5]</code> means "start at 2, stop <i>before</i> 5". So you get letters 2, 3 and 4 — three of them. The handy part: the length is always the second number minus the first.</p>
<p><b>Common tools:</b><br>
<code>len(s)</code> how many characters<br>
<code>s.count("a")</code> how many times "a" appears<br>
<code>s.index("a")</code> the position of the first "a"<br>
<code>"a" in s</code> True or False, is it there at all</p>`,

  webmath: `
<p><b>ceil means "round up, always".</b> Even 2.1 becomes 3. Even 2.0001 becomes 3.</p>
<p><b>Why you need it:</b> you have 53 photos and fit 8 on a page. 53 ÷ 8 = 6.625 pages. But there is no such thing as 0.625 of a page — and those leftover photos still have to go somewhere. So you need <b>7</b> pages, the last one only part full.</p>
<p>Round the normal way and you get 7 here, but 51 photos would round to 6 and three photos would silently vanish off the end of your website. This is a real bug people ship.</p>
<p><b>Discounts: work out what is left, not what comes off.</b> 25% off means you still pay 75%. Rather than calculating the discount then subtracting it, just multiply by what remains:</p>
<pre><code>price * (1 - 25/100)   is the same as   price * 0.75</code></pre>
<p>One step instead of two, and much harder to get wrong.</p>`,

  modulo: `
<p><b><code>%</code> gives you the leftovers.</b> Not the answer to the division — the bit that would not fit.</p>
<p><code>17 % 5</code>: how many whole 5s fit into 17? Three of them, and 3×5 = 15. That leaves <b>2</b> spare. So the answer is 2.</p>
<pre><code>17 = 5 + 5 + 5 + 2
                  ^ this is what % gives you</code></pre>
<p><b>What it is actually for — three things:</b></p>
<p><b>1. Is this a multiple of that?</b> If the leftover is <code>0</code>, it divided perfectly. <code>n % 2 == 0</code> means n is even. <code>n % 3 == 0</code> means every third one.</p>
<p><b>2. Wrapping round.</b> On a clock, 10 o'clock plus 5 hours is 3, not 15. That is <code>15 % 12</code>. Same idea keeps a Pac-Man on screen: walk off the right edge, reappear on the left.</p>
<p><b>3. The last digit.</b> <code>% 10</code> always hands you the final digit of a number.</p>
<p><b>One surprise:</b> in Python <code>-1 % 10</code> is <b>9</b>, not -1. Python always gives a positive leftover here, which is exactly what you want for wrapping backwards.</p>`,

  ranges: `
<p><b>range is a counting machine.</b> <code>range(start, stop, step)</code> — start here, jump by this much, and <b>stop before</b> the stop value.</p>
<p><code>range(0, 10, 2)</code> gives <b>0, 2, 4, 6, 8</b>. Notice 10 is missing. It stops <i>before</i> 10, it never reaches it.</p>
<p><b>That "stop before" feels wrong until you see the payoff.</b> With one number, <code>range(5)</code> gives 0, 1, 2, 3, 4 — five numbers, and exactly the valid positions of a five-item list. Not a coincidence; that is the whole design.</p>
<p><b>Counting how many it produced:</b> take the distance, divide by the step.</p>
<pre><code>range(2, 20, 3)
distance:  20 - 2  = 18
steps:     18 / 3  = 6 numbers
they are:  2, 5, 8, 11, 14, 17</code></pre>
<p>If it does not divide evenly, round up — the last jump still counts.</p>
<p><b>Two edge cases:</b> a step can be negative to count downwards, and if the start is already past the stop you get nothing at all — an empty range, length 0.</p>`,

  indexing: `
<p><b>A list is a numbered row of boxes.</b> The numbering starts at <b>0</b>.</p>
<pre><code>  arr = [ 10 , 20 , 30 , 40 ]
            0    1    2    3</code></pre>
<p>So <code>arr[0]</code> is 10 and <code>arr[2]</code> is 30.</p>
<p><b>The rule worth memorising:</b> the last valid position is <b>length − 1</b>. Four items means positions 0 to 3. There is no <code>arr[4]</code> — asking for it crashes.</p>
<p><b>Minus counts backwards from the end:</b><br>
<code>arr[-1]</code> is the last item, 40<br>
<code>arr[-2]</code> is the one before, 30</p>
<p>Handy because you do not need to know how long the list is to grab the end of it.</p>
<p><b>Slices take a run:</b> <code>arr[1:3]</code> is "from 1, stop before 3" → 20 and 30. Two items, because 3 − 1 = 2.</p>`,

  stats: `
<p><b>Four tools that squash a whole list down to one number.</b></p>
<pre><code>nums = [4, 9, 2, 7]

sum(nums)   ->  22    add them all up
max(nums)   ->  9     the biggest
min(nums)   ->  2     the smallest
len(nums)   ->  4     how many there are</code></pre>
<p><b>There is no average() built in.</b> You make one out of two others:</p>
<pre><code>sum(nums) / len(nums)   ->  22 / 4  ->  5.5</code></pre>
<p>Total divided by how many. That is all an average is.</p>
<p><b>The spread</b> is <code>max(nums) - min(nums)</code> — how far apart the extremes are.</p>
<p>Small pieces combined into bigger ones. That is most of programming.</p>`,

  coordinates: `
<p><b><code>x += 3</code> just means <code>x = x + 3</code>.</b> Take whatever is in x, add 3, put it back. It is shorthand, nothing more. There is <code>-=</code>, <code>*=</code> and <code>/=</code> too.</p>
<p><b>A position on a grid is two numbers</b>, x and y. x is how far across, y is how far up.</p>
<p>Move by changing them: <code>x += 2</code> shifts right by 2, <code>y -= 1</code> shifts down by 1.</p>
<p><b>Wrapping is where <code>%</code> comes in.</b> On a grid 10 wide, positions only go 0 to 9. Walk to 12 and you should reappear at 2.</p>
<pre><code>12 % 10  ->  2      walked off the right, back on the left
-1 % 10  ->  9      walked off the left, back on the right</code></pre>
<p>One symbol handles both edges. It is how Pac-Man works, and how anything that loops around works.</p>`,

  cycles: `
<p><b>Anything that loops uses <code>%</code>.</b> Days of the week, turns in a game, colours in a pattern, hours on a clock.</p>
<p><b>The pattern is always the same:</b> add as normal, then <code>% size</code> of the loop.</p>
<pre><code>(day + 10) % 7          10 days later, 0-6
(i + 1) % players       next player, back to 0 after the last
colors[i % len(colors)] never runs off the end of the list</code></pre>
<p><b>Going backwards still works.</b> <code>(0 - 1) % 8</code> is <b>7</b>, not -1 — Python always hands back a leftover between 0 and size − 1.</p>
<p><b>// and % are a pair.</b> <code>125 // 60</code> is the full hours (2), <code>125 % 60</code> is the minutes left (5).</p>
<p><b>Even or odd rows</b> — <code>row % 2</code> is 0 or 1, which is how a drone zig-zags across a field.</p>`,

  rounding: `
<p><b>Four tools, four behaviours.</b> Put the number on a number line and ask which way each one moves it.</p>
<pre><code>          -3.7          3.7
int()     -3  (to 0)     3  (to 0)     chop the decimals
//  1     -4  (down)     3  (down)     floor, always down
round()   -4  (nearest)  4  (nearest)
ceil()    -3  (up)       4  (up)</code></pre>
<p><b>The .5 trap:</b> <code>round(2.5)</code> is <b>2</b> and <code>round(3.5)</code> is <b>4</b>. Exact halves go to the nearest <b>even</b> number.</p>
<p><b>Float trap:</b> <code>0.1 + 0.2 == 0.3</code> is <b>False</b> — tenths cannot be stored exactly in binary. Halves and quarters can.</p>
<p><b>Round up without math:</b> <code>-(-a // b)</code> is the same as <code>ceil(a / b)</code>.</p>`,

  subnets: `
<p><b>An IPv4 address is 32 bits.</b> <code>/26</code> means the first 26 are the network and the other <b>6</b> number the hosts.</p>
<pre><code>host bits   32 - 26       = 6
addresses   2 ** 6        = 64
usable      64 - 2        = 62     (lose network + broadcast)
mask        256 - 64      = 192    → 255.255.255.192</code></pre>
<p><b>Block size is the key.</b> Subnets sit side by side, one block each: 0, 64, 128, 192.</p>
<p><b>Which subnet is .77 in?</b> Floor-divide by the block, multiply back:</p>
<pre><code>77 // 64 * 64  = 64     network
77 %  64       = 13     position inside it
64 + 64 - 1    = 127    broadcast</code></pre>
<p><b>Same thing with <code>&amp;</code>:</b> <code>77 &amp; 192</code> = 64. The mask's 1-bits keep the network, the 0-bits wipe the host.</p>`
};
