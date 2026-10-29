/* Sleeple bank. One unit per journey (TARGETS order). A journey counts as done when its ticket is solved
   (sleeple.v1 .done[journeyId] === true) OR its School run is finished (.les[journeyId] >= lessons + drills of that
   journey: 15,18,18,12,12,8,8,8). Falls back to the legacy key dockle.v1 when sleeple.v1 is missing. */
POCKET.register({
  id: 'sleeple',
  name: 'Sleeple',
  topic: 'Python',
  href: 'sleeple.html',
  keys: ['sleeple.v1', 'dockle.v1'],
  units: [
    { id: 'arrivals', title: 'Departures board' },
    { id: 'tag', title: 'Luggage tag' },
    { id: 'loadsheet', title: 'Load sheet' },
    { id: 'clearance', title: 'Departure check' },
    { id: 'hold', title: 'Berth supplies' },
    { id: 'fuel', title: 'Route log' },
    { id: 'trade', title: 'Dining car menu' },
    { id: 'roster', title: 'Guest welcome' }
  ],
  done(get) {
    try {
      const IDS = ['arrivals', 'tag', 'loadsheet', 'clearance', 'hold', 'fuel', 'trade', 'roster'];
      const LEN = { arrivals: 15, tag: 18, loadsheet: 18, clearance: 12, hold: 12, fuel: 8, trade: 8, roster: 8 };
      let s = get('sleeple.v1');
      if (!s || typeof s !== 'object') s = get('dockle.v1');
      if (!s || typeof s !== 'object') return [];
      const dn = s.done && typeof s.done === 'object' ? s.done : {};
      const les = s.les && typeof s.les === 'object' ? s.les : {};
      return IDS.filter(id => dn[id] === true || (typeof les[id] === 'number' && les[id] >= LEN[id]));
    } catch (e) { return []; }
  },
  sample: {
    'sleeple.v1': '{"theme":"night","stage":"school","t":3,"les":{"arrivals":15,"tag":18,"loadsheet":18,"clearance":4},"code":{},"done":{"arrivals":true,"tag":true},"learned":["d1","d2","h1","d3","d4","d5","h2","d6","d7","d8","h3"],"srs":{},"mode":"learn","sfx":true,"help":{},"x":{},"stepsOk":{},"docked":{"arrivals":1761700000000,"tag":1761710000000},"upg":{},"mastered":{},"mstart":{},"rush":{"best":0,"shifts":0,"jobs":0},"frame":1,"cr":120,"life":120}'
  },
  sampleDone: ['arrivals', 'tag', 'loadsheet'],
  cards: [
    { u: 'arrivals', q: 'Which line shows Platform 3 is open?', o: ['Print("Platform 3 is open")', 'print("Platform 3 is open")', 'print "Platform 3 is open"', 'echo("Platform 3 is open")'], a: 1, why: 'Lowercase print, brackets, text in quotes.' },
    { u: 'arrivals', q: 'What does this print?', code: 'print("Mind")\nprint("the gap")', o: ['Mind, then the gap on the next line', 'Mind the gap', 'the gap, then Mind'], a: 0, why: 'Each print() starts a fresh line, top to bottom.' },
    { u: 'arrivals', q: 'Which string is valid?', o: ['"Track 9\'', '\'Track 9"', '"Track 9"', 'Track 9'], a: 2, why: 'Both ends need the same kind of quote.' },
    { u: 'arrivals', q: 'Best way to show the text Guard\'s log?', o: ['print(\'Guard\'s log\')', 'print("Guard\'s log")', 'print(Guard\'s log)'], a: 1, why: 'Double quotes around text that contains an apostrophe.' },
    { u: 'arrivals', q: 'What happens with print(Hello)?', o: ['Python looks for a variable called Hello', 'It shows Hello', 'It shows "Hello"'], a: 0, why: 'Without quotes, Hello is a name, not text.' },
    { u: 'arrivals', q: 'What belongs on line 1 of a journey file?', o: ['def main():', 'A docstring: """What this file does."""', 'main()', 'import print'], a: 1, why: 'The docstring says what the file is for.' },
    { u: 'arrivals', q: 'Fill the blank in the guard.', code: 'if __name__ == "__main__":\n    ___', o: ['main', 'def main():', 'main()', 'return main'], a: 2, why: 'main without brackets does nothing. The call needs ().' },
    { u: 'arrivals', q: 'Spot the bug.', code: 'def main():\nprint("All aboard")', o: ['The print line must be indented 4 spaces', 'print is misspelled', 'main needs a parameter'], a: 0, why: 'Code inside main() is indented 4 spaces.' },
    { u: 'tag', q: 'What does this print?', code: 'train = "Comet"\nprint(train)', o: ['Comet', 'train', '"Comet"'], a: 0, why: 'No quotes, so Python fetches the value in the box.' },
    { u: 'tag', q: 'What does this print?', code: 'train = "Comet"\ntrain = "Vega"\nprint(train)', o: ['Comet', 'Vega', 'Comet Vega'], a: 1, why: 'The box holds only the latest value.' },
    { u: 'tag', q: 'Which value is a float?', o: ['3.5', '12', '"3.5"', '3,5'], a: 0, why: 'A float has a decimal point, a dot, and no quotes.' },
    { u: 'tag', q: 'What does this print?', code: 'print("12" + "3")', o: ['123', '15', 'TypeError'], a: 0, why: 'Two strings glued together, not a sum.' },
    { u: 'tag', q: 'What does this print?', code: 'bags = 12\nprint("Bags:", bags)', o: ['Bags:12', 'Bags:, 12', 'Bags: 12'], a: 2, why: 'print() puts one space between the values.' },
    { u: 'tag', q: 'What does this line give?', code: 'bags = 12\nprint("Bags: " + bags)', o: ['TypeError', 'Bags: 12', 'Bags: bags'], a: 0, why: 'You cannot + text and a number. Use a comma.' },
    { u: 'tag', q: 'Which variable name follows Python style?', o: ['bagsOnBoard', 'bags_on_board', 'BagsOnBoard', 'b'], a: 1, why: 'snake_case: lowercase words joined with underscores.' },
    { u: 'tag', q: 'Why is list = ["tea", "soup"] a bad idea?', o: ['Lists cannot hold text', 'Names must be longer', 'It hides the built-in list() for the rest of the file'], a: 2, why: 'Never reuse a built-in name like list or sum.' },
    { u: 'loadsheet', q: 'What does this print?', code: 'print(10 / 2)', o: ['5', '2', '5.0'], a: 2, why: '/ always gives a float.' },
    { u: 'loadsheet', q: '12 bags, trolleys of 5. Which gives the number of full trolleys?', o: ['12 // 5', '12 / 5', '12 % 5'], a: 0, why: '// keeps only the whole part: 2.' },
    { u: 'loadsheet', q: 'What does this print?', code: 'print(12 % 5)', o: ['2.4', '2', '7', '0'], a: 1, why: '% is the remainder: 2 bags left over.' },
    { u: 'loadsheet', q: 'What does this print?', code: 'bags = 12\nprint(f"{bags * 2} handles")', o: ['{bags * 2} handles', '24 handles', '122 handles'], a: 1, why: 'You can calculate inside the braces of an f-string.' },
    { u: 'loadsheet', q: 'What does this print?', code: 'platform = 3\nprint("Platform {platform}")', o: ['Platform {platform}', 'Platform 3', 'NameError'], a: 0, why: 'Without the f, the braces are printed as-is.' },
    { u: 'loadsheet', q: 'What does this print?', code: 'print(round(2.5))', o: ['3', '2.5', '2'], a: 2, why: 'Exact halves round to the even number.' },
    { u: 'loadsheet', q: 'Which line shows 176.40000000000003 tidied to 2 decimals?', o: ['print(round(fee))', 'print(fee, 2)', 'print(round(fee, 2))'], a: 2, why: 'The second number is how many decimals to keep.' },
    { u: 'loadsheet', q: 'Where do constants like FEE_PER_KG = 4.2 go?', o: ['Inside main()', 'At the top, under the docstring', 'At the very bottom'], a: 1, why: 'Top of the file, so they are easy to find and change.' },
    { u: 'clearance', q: 'What does this print?', code: 'fuel = 18\nprint(fuel < 25)', o: ['18', 'True', 'False'], a: 1, why: 'A comparison answers with a bool.' },
    { u: 'clearance', q: 'What does this print?', code: 'print(12 == "12")', o: ['True', 'False', 'TypeError'], a: 1, why: 'A number never equals text.' },
    { u: 'clearance', q: 'Which line asks whether fuel equals 25?', o: ['fuel = 25', 'fuel == 25', 'fuel === 25', 'fuel =< 25'], a: 1, why: 'One = stores, two == compares.' },
    { u: 'clearance', q: 'What does this print?', code: 'weight = 42\nif weight > 20:\n    print("Medium")\nelif weight > 40:\n    print("Heavy")', o: ['Heavy', 'Medium', 'Medium, then Heavy'], a: 1, why: 'Only the first True branch runs. Put the strictest test first.' },
    { u: 'clearance', q: 'What does this print?', code: 'weight = 12\nif weight > 40:\n    print("Heavy")\nelif weight > 20:\n    print("Medium")\nelse:\n    print("Light")', o: ['Heavy', 'Light', 'Medium'], a: 1, why: 'Both tests are False, so else catches it.' },
    { u: 'clearance', q: 'How does Python spell "else if"?', o: ['else if', 'elseif', 'elif'], a: 2, why: 'Python spells it elif.' },
    { u: 'clearance', q: 'What does this print?', code: 'fuel = 30\nif fuel < 25:\n    print("Refuel")\nprint("Go")', o: ['Refuel, then Go', 'Go', 'Nothing'], a: 1, why: 'Only the indented line belongs to the if.' },
    { u: 'clearance', q: 'Mixing 2 and 4 spaces in one block gives...', o: ['IndentationError', 'It runs fine', 'NameError'], a: 0, why: 'Indentation is the block. Use 4 spaces per level.' },
    { u: 'hold', q: 'What does this print?', code: 'supplies = ["rugs", "pillows", "tea"]\nprint(supplies[1])', o: ['pillows', 'rugs', 'tea'], a: 0, why: 'Counting starts at 0, so [1] is the second item.' },
    { u: 'hold', q: 'What does this print?', code: 'supplies = ["rugs", "pillows", "tea"]\nprint(supplies[-1])', o: ['tea', 'rugs', 'IndexError'], a: 0, why: '-1 is always the last item.' },
    { u: 'hold', q: 'Which line adds "postcards" to the end of supplies?', o: ['supplies.append("postcards")', 'supplies.add("postcards")', 'supplies + "postcards"'], a: 0, why: '.append() adds at the end.' },
    { u: 'hold', q: 'What happens with supplies[5] on a 3-item list?', o: ['It gives None', 'IndexError', 'It gives the last item'], a: 1, why: 'Asking for an index that does not exist fails.' },
    { u: 'hold', q: 'What does this print?', code: 'for berth in ["A1", "A2"]:\n    print("Making up", berth)', o: ['Making up A1, then Making up A2', 'Making up [\'A1\', \'A2\']', 'Making up A2'], a: 0, why: 'The block runs once per item.' },
    { u: 'hold', q: 'Spot the bug.', code: 'for berth in ["A1", "A2"]\n    print(berth)', o: ['The for line needs a colon', 'berth must be in quotes', 'print must not be indented'], a: 0, why: 'The for line ends with a colon.' },
    { u: 'hold', q: 'What does this print?', code: 'print(len("SLEEPER"))', o: ['7', '1', '6'], a: 0, why: 'len() counts characters in a string.' },
    { u: 'hold', q: 'How do you count the items in supplies?', o: ['len(supplies)', 'supplies.len()', 'count(supplies)', 'supplies.size'], a: 0, why: 'len goes in front, the list in brackets.' },
    { u: 'fuel', q: 'Which numbers does range(1, 4) give?', o: ['1, 2, 3, 4', '1, 2, 3', '0, 1, 2, 3'], a: 1, why: 'The stop number is never included.' },
    { u: 'fuel', q: 'Which numbers does range(3) give?', o: ['1, 2, 3', '3', '0, 1, 2'], a: 2, why: 'It starts at 0 and stops before 3.' },
    { u: 'fuel', q: 'What does this print?', code: 'total = 0\nfor leg in [5, 10]:\n    total += leg\nprint(total)', o: ['10', '15', '5'], a: 1, why: '0 + 5 + 10.' },
    { u: 'fuel', q: 'What does this print?', code: 'for leg in [12, 8, 3]:\n    total = 0\n    total += leg\nprint(total)', o: ['23', '3', '0'], a: 1, why: 'total resets every round. Start it before the loop.' },
    { u: 'fuel', q: 'What does total += 5 mean?', o: ['total = 5', 'total = total + 5', 'total == 5'], a: 1, why: 'Add to what is already there.' },
    { u: 'fuel', q: 'Spot the bug in the running total.', code: 'total = 0\nfor leg in [4, 6]:\n    total =+ leg', o: ['total must start at 1', 'leg must be in quotes', '=+ should be +='], a: 2, why: 'The plus comes first: +=. total =+ leg just stores leg.' },
    { u: 'fuel', q: 'Fill the blank to print Hour 1 to Hour 3.', code: 'for hour in range(___):\n    print("Hour", hour)', o: ['1, 4', '3', '1, 3', '0, 3'], a: 0, why: 'Start at 1, stop before 4.' },
    { u: 'trade', q: 'What does this print?', code: 'menu = {"tea": 4, "soup": 9}\nprint(menu["soup"])', o: ['soup', '4', '9'], a: 2, why: 'A dictionary looks things up by key.' },
    { u: 'trade', q: 'What happens with menu["coffee"] when there is no coffee key?', o: ['It gives 0', 'It gives None', 'KeyError'], a: 2, why: 'Reading a missing key fails.' },
    { u: 'trade', q: 'What does this print?', code: 'menu = {"tea": 4}\nmenu["tea"] = 5\nmenu["coffee"] = 7\nprint(menu)', o: ['{\'tea\': 4, \'coffee\': 7}', '{\'tea\': 5, \'coffee\': 7}', 'KeyError'], a: 1, why: 'Assigning changes an existing key or adds a new one.' },
    { u: 'trade', q: 'Spot the bug.', code: 'menu = {"tea": 4}\nprint(menu("tea"))', o: ['Use square brackets: menu["tea"]', 'tea needs no quotes', 'Use menu.tea'], a: 0, why: 'Look up with square brackets, not round ones.' },
    { u: 'trade', q: 'What does this print?', code: 'menu = {"tea": 4}\nprint("tea" in menu, "coffee" in menu)', o: ['False True', 'True False', '4 None'], a: 1, why: 'in checks the keys.' },
    { u: 'trade', q: 'What does this print?', code: 'menu = {"tea": 4, "soup": 9}\nfor dish in menu:\n    print(dish)', o: ['4, then 9', 'tea, then soup', 'tea 4, then soup 9'], a: 1, why: 'Looping a dict without items() gives only the keys.' },
    { u: 'trade', q: 'Fill the blank to get key and value together.', code: 'for dish, price in menu.___:\n    print(dish, price)', o: ['keys()', 'items()', 'values()', 'pairs()'], a: 1, why: 'items() hands out key and value in pairs.' },
    { u: 'trade', q: 'What does this print?', code: 'menu = {"tea": 4}\nprint(4 in menu)', o: ['True', 'False', 'KeyError'], a: 1, why: 'in looks at keys, not values.' },
    { u: 'roster', q: 'What does this print?', code: 'def greet(name):\n    print("Hi", name)\n\nprint("Done")', o: ['Hi name, then Done', 'Done', 'Nothing'], a: 1, why: 'Defining a function does not run it.' },
    { u: 'roster', q: 'What does this print?', code: 'def greet(name):\n    print("Hi", name)\n\ngreet("Bo")\ngreet("Ilsa")', o: ['Hi Ilsa', 'Hi name twice', 'Hi Bo, then Hi Ilsa'], a: 2, why: 'Two calls, two lines, each with its own value.' },
    { u: 'roster', q: 'What does this print?', code: 'def double(n):\n    return n * 2\n\nprint(double(4) + 1)', o: ['8', '9', '10'], a: 1, why: 'double(4) becomes 8, then + 1.' },
    { u: 'roster', q: 'A function has no return. What does a call give back?', o: ['None', '0', 'An empty string'], a: 0, why: 'No return means None.' },
    { u: 'roster', q: 'What does this print?', code: 'def bag_fee(bags, rate):\n    bags * rate\n\nprint(bag_fee(12, 3))', o: ['None', '36', '0'], a: 0, why: 'The result was never sent back with return.' },
    { u: 'roster', q: 'Calling a function before its def line gives...', o: ['None', 'NameError', 'It works anyway'], a: 1, why: 'Python reads top to bottom. The name does not exist yet.' },
    { u: 'roster', q: 'In def announce(platform):, what is platform?', o: ['The function name', 'A parameter, filled in at each call', 'A constant'], a: 1, why: 'Each call fills the parameter with a new value.' },
    { u: 'roster', q: 'Code written after return inside a function...', o: ['never runs', 'runs last', 'runs first'], a: 0, why: 'The function stops at return.' }
  ]
});
