# Poshle Pocket lesson spec

Write one Python module per assignment. Each module defines functions `lXX()` that return ONE lesson dict. No imports needed.

lesson = {
  "id": "slug", "title": "Short title", "sub": "tiny subtitle (key words)",
  "cards": [card, ...],          # 4-6 teaching cards
  "qs":   [q, ...],              # 26-36 practice questions
}

card = {
  "h": "Card heading",
  "body": ["1-3 short bullet sentences. Use `backticks` for code words."],
  "code": "optional example (max 6 lines, max 38 chars wide)",
  "out": "what that example shows in the console ('' not allowed; use '(nothing shown)')",   # required if code
  "flow": ["optional", "boxes", {"if": "question?", "yes": "...", "no": "..."}],             # optional mini flowchart
  "check": {"t": "predict", "code": "...", "choices": [3 strings], "a": idx, "why": "..."}   # optional quick check; give it on at least half the cards
}

Question types (mix them; every lesson needs at least 3 of each of predict, pick, fill, build, order, bug):
- predict: {"t":"predict","code":"...","choices":[3-4 outputs],"a":idx,"why":"..."}
- pick:    {"t":"pick","ask":"Which command ...?","choices":[3-4 one-line commands],"a":idx,"why":"..."}
- fill:    {"t":"fill","code":"... ___ ...","target":"what it should show / do","choices":[3-4 tokens],"ok":[idx of every choice that works],"why":"..."}
- build:   {"t":"build","ask":"instruction","setup":"optional lines above, or ''","target":"what it should show / do","tiles":[pieces],"sol":"i,j,k","ok":["i,j,k", ...every other ordering that is ALSO valid],"why":"..."}
           Tiles are joined with ONE space to form one line, so `$_.Name` stays one tile and `(` `)` tiles are fine. Include 1-2 decoy tiles not in sol.
- order:   {"t":"order","lines":[3-6 lines, shown order already shuffled],"target":"what it shows / does","sol":"i,j,k","ok":["i,j,k", ...other valid orders],"why":"..."}
- bug:     {"t":"bug","lines":[2-5 lines],"bad":idx,"fix":"corrected line","expect":"what it should show / do","got":"what it actually shows (short)","why":"..."}

## Rules
- Target is PowerShell 7 (pwsh) on a normal console. Every predicted output must be EXACTLY what pwsh 7 prints: arrays print one item per line; True/False capitalised; $null and empty print nothing -> write "(nothing shown)"; numbers like 3.5 print as 3.5; integer division 7/2 gives 3.5.
- Avoid code whose output is a formatted object table — use strings/numbers/booleans, or ask about a property value.
- Errors: write the choice as "Error: <short reason>" e.g. "Error: term not recognized", "Error: cannot index into a null array". Keep error choices only where the error is certain.
- M365 cmdlets (Exchange Online, Microsoft Graph) can't print predictable output: use pick, fill, build, order, bug with `target` describing the effect (e.g. "Adds Ada to the Sales group"). Parameter names must be real and current (ExchangeOnlineManagement v3, Microsoft.Graph v2).
- Use only fake names: contoso.com, Ada, Bram, Lien, Noor, Sales, Helpdesk. No real company or people.
- Plain beginner English, short. No emoji, no code comments.
- Distractors must be plausible mistakes beginners really make. Exactly one correct answer for predict/pick; for fill list ALL working choices in ok (at least one choice must NOT work).
- Vary the correct index.
- Code lines max 38 characters where possible (phone screen), max 6 lines.
- Run `python3 validate.py <module.py>` from this folder until it prints OK.
