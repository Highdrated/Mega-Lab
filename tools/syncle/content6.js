SEQUENCES.push({ id: 9, name: "Scripts", short: "SCRIPTS", open: true, blurb: "From one-liners to .ps1 files: parameters, functions, error handling and dry runs. The way real admin work is kept and repeated." });
const SC = "/Users/kaatje/Documents/scripts";
const STALE_PS1 = "$days = 90\n$cutoff = (Get-Date).AddDays(-$days)\nGet-MgUser -All -Property DisplayName,SignInActivity |\n    Where-Object { $_.SignInActivity.LastSignInDateTime -lt $cutoff } |\n    Select-Object DisplayName,@{n='LastSignIn';e={$_.SignInActivity.LastSignInDateTime}}\n";
const DEPT_PS1 = "<#\n.SYNOPSIS\nLists the users of one department.\n#>\nparam(\n    [Parameter(Mandatory)]\n    [ValidateSet('Sales','Finance','Operations','HR','IT','Logistics')]\n    [string]$Department,\n    [int]$Top = 5,\n    [switch]$IncludeDisabled\n)\n$users = Get-MgUser -All -Filter \"department eq '$Department'\" -Property DisplayName,JobTitle,AccountEnabled\nif (-not $IncludeDisabled) { $users = $users | Where-Object { $_.AccountEnabled } }\n$users | Select-Object -First $Top DisplayName,JobTitle\n";
const SC_FILES = { [SC + "/Get-StaleUsers.ps1"]: STALE_PS1, [SC + "/Get-DeptUsers.ps1"]: DEPT_PS1 };
GRADER.SETUPS.scripts = { scopes: ["User.ReadWrite.All", "Group.ReadWrite.All", "Organization.Read.All", "AuditLog.Read.All"], exo: true, cwd: SC, files: SC_FILES };
GRADER.SETUPS.scriptsHome = { scopes: ["User.ReadWrite.All", "Group.ReadWrite.All", "Organization.Read.All", "AuditLog.Read.All"], exo: true, cwd: "/Users/kaatje", files: SC_FILES };
const scFile = (ctx, n) => { const f = ctx.fs[SC + "/" + n]; return f ? f.text : null; };
function scClone(ctx, cmd, mutate) {
  const c = GRADER.makeCtx("scripts");
  if (mutate) mutate(c);
  for (const k of Object.keys(ctx.fs)) c.fs[k] = { text: ctx.fs[k].text, at: ctx.fs[k].at };
  for (const d of ctx.dirs) c.dirs.add(d);
  c.host = [];
  const res = PS.run(cmd, c);
  return { c, res, txt: PS.formatOut(res.out, 120).trim() };
}
function scRef(cmd, mutate) { const c = GRADER.makeCtx("scripts"); if (mutate) mutate(c); return PS.formatOut(PS.run(cmd, c).out, 120).trim(); }
const parses = (t) => { try { PS.parse("function ScriptBody {\n" + t + "\n}"); return true; } catch (e) { return false; } };

MEMORIES.push(
{
  id: "runscript", seq: 9, name: "Run a .ps1", tag: "SCRIPT FILES", title: "Commands in a file, run on purpose",
  summary: "A script is commands saved in a .ps1 file. You run it by path, it gets its own scope, and dot-sourcing keeps what it made.",
  setup: "scripts",
  brief: {
    what: [
      "Everything you typed so far was gone when the window closed. A <b>script</b> is the same commands saved in a <b>.ps1</b> file, so you can run them again next month, give them to a colleague, or schedule them.",
      "You run a script <b>by path</b>: <code>./Get-StaleUsers.ps1</code> from its folder, or <code>~/Documents/scripts/Get-StaleUsers.ps1</code> from anywhere. Just the name does <b>not</b> work, even in the right folder: PowerShell never runs things from the current folder by name, so a planted file can't hijack a command. Paths with spaces need quotes and the call operator: <code>&amp; '~/My Scripts/x.ps1'</code>.",
      "A script runs in <b>its own scope</b>. Variables it creates are gone when it ends. <b>Dot-sourcing</b> (<code>. ./x.ps1</code>, a dot and a space) runs it in your scope instead, so its variables and functions stay.",
      "On a Mac the execution policy is Unrestricted, so scripts just run. On Windows you'll meet <code>Set-ExecutionPolicy RemoteSigned</code> first."
    ],
    daily: ["Running the monthly stale-account report", "A colleague's script from the shared drive", "Anything you do more than twice"],
    parts: [["./Get-StaleUsers.ps1", "run from its folder"], ["~/Documents/scripts/Get-StaleUsers.ps1", "run from anywhere"], ["& '~/path with space/x.ps1'", "quotes need the & call operator"], [". ./Get-StaleUsers.ps1", "dot-source: keep its variables"], ["code ./Get-StaleUsers.ps1", "open it in the editor"]],
    flow: [["Find it", "Get-ChildItem"], ["Read it", "before you run it"], ["Run it", "./Name.ps1"], ["Keep?", ". ./Name.ps1"]],
    traps: [["Name only", "Get-StaleUsers.ps1 alone is 'not recognized', even in the right folder. Read the Suggestion line: it tells you to add ./"], ["Read before you run", "A script runs with your permissions. Open other people's scripts first."], ["My variable is empty", "The script's $days lived in the script's scope. Dot-source if you need it afterwards."]]
  },
  watch: [
    { code: "Get-ChildItem", say: "You are in ~/Documents/scripts. One script from the previous admin." },
    { code: "Get-Content ./Get-StaleUsers.ps1", say: "Read it first: five lines, one pipeline spread over three. A line ending in | continues on the next." },
    { code: "Get-StaleUsers.ps1", say: "Name only: refused, with a hint at the bottom." },
    { code: "./Get-StaleUsers.ps1", say: "With ./ it runs. Output works like any command's." },
    { code: "$days", say: "Empty. $days lived inside the script." },
    { code: ". ./Get-StaleUsers.ps1 | Out-Null; $days", say: "Dot-sourced: the variables stayed behind in your session." }
  ],
  trace: { ask: "Run the script from its own folder.", tpl: "[[./]]Get-StaleUsers.ps1", check: { out: "./Get-StaleUsers.ps1" }, wrong: "Two characters that mean 'this folder'." },
  traceHints: ["PowerShell wants a path, not a name.", "'This folder' in a path.", "A dot and a slash.", "Answer: ./"],
  recall: { ask: "You are in your home folder. Run Get-StaleUsers.ps1 without changing folders.", setup: "scriptsHome", check: { fn: (ctx, res) => !res.error && ctx.cwd === "/Users/kaatje" && PS.formatOut(res.out, 120).trim() === scRef("./Get-StaleUsers.ps1") }, wrong: "Give the whole path, starting with ~." },
  recallHints: ["No cd. Use the path.", "~ is your home folder.", "~/Documents/scripts/...", "~/Documents/scripts/Get-StaleUsers.ps1"],
  real: ["mkdir ~/Documents/scripts", "code ~/Documents/scripts/Get-Me.ps1, put Get-Date and $PSVersionTable.PSVersion in it, save", "~/Documents/scripts/Get-Me.ps1"],
  cheat: [["./Name.ps1", "Run a script from its folder"], ["& '~/path/Name.ps1'", "Run by path, spaces allowed"], [". ./Name.ps1", "Dot-source: keep variables and functions"], ["code ./Name.ps1", "Open it in the editor"]]
},
{
  id: "firstscript", seq: 9, name: "Your first script", tag: "CODE EDITOR", title: "Write it, save it, run it",
  summary: "Open the editor, write the commands you already know one per line, save with Cmd+S, run with ./",
  setup: "scripts",
  brief: {
    what: [
      "<b>code ./Name.ps1</b> in the console opens the editor (Code in the dock does too). A new name makes a new file. Write the commands you already know, <b>one per line</b>. Save with <b>Cmd+S</b>: the dot in the title means unsaved.",
      "Name scripts like commands: <b>Verb-Noun.ps1</b> (Get-FinanceList.ps1, Set-DeptOffice.ps1). Approved verbs (Get, Set, New, Remove, Add, Test, Export) tell a colleague what it does before they open it.",
      "The status bar checks the syntax while you type, like the PowerShell extension in VS Code. A missing } or ) shows there before you run anything. <b>Run in terminal</b> saves and puts <code>./Name.ps1</code> on your prompt.",
      "A script does not connect for you unless you write that in. In this lab you are already connected; in real scripts put the Connect lines at the top."
    ],
    daily: ["Turning a one-liner you keep retyping into a file", "Monthly reports", "Onboarding steps you always forget one of"],
    parts: [["code ./Get-FinanceList.ps1", "open or create"], ["Cmd+S", "save"], ["line ending in |", "pipeline continues on the next line"], ["./Get-FinanceList.ps1", "run it"]],
    flow: [["code", "open / create"], ["Write", "one command per line"], ["Cmd+S", "status: no problems"], ["Run", "./Name.ps1"]],
    traps: [["Forgot to save", "You run the file on disk, not what is in the editor. Dot in the title = unsaved."], ["Wrong folder", "code ./x.ps1 creates it where you are. Check the prompt."], ["Long lines", "Break after a | and indent. Never break in the middle of a parameter."]]
  },
  watch: [
    { code: "Set-Content ./Get-SalesList.ps1 -Value 'Get-MgUser -All -Filter \"department eq ''Sales''\" -Property DisplayName,JobTitle | Select-Object DisplayName,JobTitle'", say: "Normally you'd type this in the editor. Here the file is written for you: one line, one pipeline." },
    { code: "Get-Content ./Get-SalesList.ps1", say: "That is the whole script." },
    { code: "./Get-SalesList.ps1", say: "And it runs like a command." },
    { code: "code ./Get-SalesList.ps1", say: "The editor: colours, line numbers and a syntax check at the bottom. Close it with the red dot." }
  ],
  trace: { ask: "Open a new file Get-FinanceList.ps1 in the editor from the console.", tpl: "[[code]] ./Get-FinanceList.ps1", check: { fn: (ctx, res) => !res.error && !!ctx.ui && /\/Get-FinanceList\.ps1$/.test(ctx.ui.open || "") }, wrong: "The editor's command-line name." },
  traceHints: ["Same name as the app in the dock.", "Four letters.", "c___", "Answer: code"],
  recall: { ask: "Write ~/Documents/scripts/Get-FinanceList.ps1 that lists Finance users with DisplayName and JobTitle. Save it, then run it.", setup: "scripts", check: { fn: (ctx, res, hist) => { const t = scFile(ctx, "Get-FinanceList.ps1"); if (!t || !parses(t)) return false; return scClone(ctx, "./Get-FinanceList.ps1").txt === scRef("Get-MgUser -All -Filter \"department eq 'Finance'\" -Property DisplayName,JobTitle | Select-Object DisplayName,JobTitle") && hist.some((h) => /Get-FinanceList\.ps1/i.test(h) && !/^code/i.test(h.trim())); } }, wrong: "Is it saved? Does running it give exactly DisplayName and JobTitle for Finance?" },
  recallHints: ["code ./Get-FinanceList.ps1 opens it.", "One line: Get-MgUser with a department filter and -Property, then Select-Object.", "Get-MgUser -All -Filter \"department eq 'Finance'\" -Property DisplayName,JobTitle | Select-Object DisplayName,JobTitle", "In the file: Get-MgUser -All -Filter \"department eq 'Finance'\" -Property DisplayName,JobTitle | Select-Object DisplayName,JobTitle   then Cmd+S, then ./Get-FinanceList.ps1"],
  real: ["code ~/Documents/scripts/Get-MyMailbox.ps1", "Write Get-EXOMailbox -Identity <you> | Select-Object DisplayName,PrimarySmtpAddress", "Save, connect, run it"],
  cheat: [["code ./Name.ps1", "Open or create in the editor"], ["Cmd+S", "Save"], ["... |", "End a line with | to continue on the next"]]
},
{
  id: "params", seq: 9, name: "param()", tag: "PARAMETERS", title: "One script, any department",
  summary: "A param() block turns hard-coded values into -Parameters, with types, defaults, mandatory values and allowed lists.",
  setup: "scripts",
  brief: {
    what: [
      "A script with <code>'Finance'</code> written inside it only does Finance. A <b>param() block</b> at the very top turns that value into a parameter: <code>./Get-DeptUsers.ps1 -Department Sales</code>. Inside the script it is just <code>$Department</code>.",
      "Decorate parameters so PowerShell checks input for you: <b>[Parameter(Mandatory)]</b> refuses to run without it, a <b>type</b> like [string] or [int] converts or refuses, a <b>default</b> (<code>[int]$Top = 5</code>) fills it in, <b>[ValidateSet('Sales','Finance')]</b> allows only those values, <b>[switch]</b> is an on/off flag with no value.",
      "The real console asks you to type a missing mandatory value; scripts run unattended stop with an error. Either way, the bad run never starts."
    ],
    daily: ["One report script for every department", "A -WhatIf-style switch on your own tools", "Scripts other people run"],
    parts: [["param( ... )", "first thing in the file"], ["[Parameter(Mandatory)][string]$Department", "required text"], ["[int]$Top = 5", "number with a default"], ["[ValidateSet('A','B')]", "only these values"], ["[switch]$IncludeDisabled", "flag, no value"]],
    flow: [["param()", "top of the file"], ["Attributes", "Mandatory, type, set"], ["Use", "$Name inside"], ["Call", "-Name value"]],
    traps: [["param() not first", "Anything above it except comments and [CmdletBinding()] breaks it."], ["Commas", "Parameters are separated by commas; the last one has none."], ["Switch with a value", "-IncludeDisabled true is wrong. Just -IncludeDisabled."]]
  },
  watch: [
    { code: "Get-Content ./Get-DeptUsers.ps1", say: "A param block: mandatory department from a fixed list, a number with a default, a switch." },
    { code: "./Get-DeptUsers.ps1", say: "No department: refused before anything runs." },
    { code: "./Get-DeptUsers.ps1 -Department Legal", say: "Not in the list. The message names the allowed values." },
    { code: "./Get-DeptUsers.ps1 -Department Operations -Top 3", say: "Three, enabled only." },
    { code: "./Get-DeptUsers.ps1 -Department Operations -Top 20 -IncludeDisabled", say: "The switch flips the filter off." }
  ],
  trace: { ask: "Run the department script for Finance.", tpl: "./Get-DeptUsers.ps1 -[[Department]] Finance", check: { out: "./Get-DeptUsers.ps1 -Department Finance" }, wrong: "The parameter name is the variable name without the $." },
  traceHints: ["Look at the param block.", "$Department becomes -Department.", "-D_________", "Answer: Department"],
  recall: { ask: "Write Get-CityUsers.ps1 with a mandatory -City parameter that lists DisplayName and Department of the users in that city. Run it for Ghent.", setup: "scripts", check: { fn: (ctx, res, hist) => { const t = scFile(ctx, "Get-CityUsers.ps1"); if (!t || !/param\s*\(/i.test(t)) return false; const ok = scClone(ctx, "./Get-CityUsers.ps1 -City Ghent").txt === scRef("Get-MgUser -All -Filter \"city eq 'Ghent'\" -Property DisplayName,Department | Select-Object DisplayName,Department"); const m = scClone(ctx, "./Get-CityUsers.ps1").res; return ok && !!m.error && /mandatory/i.test(m.error.text()); } }, wrong: "Mandatory -City, a filter on city, two columns. Saved?" },
  recallHints: ["Start the file with param( ... ).", "[Parameter(Mandatory)][string]$City, then use $City in the filter.", "param([Parameter(Mandatory)][string]$City)  then  Get-MgUser -All -Filter \"city eq '$City'\" ...", "param([Parameter(Mandatory)][string]$City)\nGet-MgUser -All -Filter \"city eq '$City'\" -Property DisplayName,Department | Select-Object DisplayName,Department"],
  real: ["Give your Get-MyMailbox.ps1 a mandatory -Identity parameter and run it for a shared mailbox you manage."],
  cheat: [["param([Parameter(Mandatory)][string]$Name)", "Required parameter"], ["[int]$Top = 5", "Default value"], ["[ValidateSet('A','B')]", "Allowed values"], ["[switch]$Force", "On/off flag"]]
},
{
  id: "functions", seq: 9, name: "function", tag: "FUNCTIONS", title: "Your own commands, returning objects",
  summary: "A function is a named block with its own param(). Return objects, not Write-Host text, so the result still pipes.",
  setup: "scripts",
  brief: {
    what: [
      "A <b>function</b> is a mini-script with a name: <code>function Get-UserCard { param($UserId) ... }</code>. Call it like any command: <code>Get-UserCard -UserId x</code>.",
      "<b>Return objects, not text.</b> Whatever a function leaves on the pipeline is its output. <code>[pscustomobject]@{ Name = ...; City = ... }</code> makes a clean object you can Sort, Where, Export-Csv. <b>Write-Host</b> only paints the screen: nothing goes down the pipeline, so Export-Csv gets nothing.",
      "Keep useful functions in one file (a toolbox) and <b>dot-source</b> it: <code>. ./Halvard-Tools.ps1</code> loads the functions into your session without running anything else."
    ],
    daily: ["Get-UserCard for every 'who is this?' question", "Shared toolbox file for the team", "Pieces of a bigger script"],
    parts: [["function Get-UserCard { param([string]$UserId) ... }", "define"], ["[pscustomobject]@{ Name = $u.DisplayName }", "return an object"], ["Write-Host 'x'", "screen only, not output"], [". ./Halvard-Tools.ps1", "load the toolbox"]],
    flow: [["Define", "function Verb-Noun"], ["param()", "inputs"], ["Return", "[pscustomobject]"], ["Load", "dot-source"]],
    traps: [["Write-Host as output", "(Get-X).Count is 0 and the CSV is empty. Output objects instead."], ["Defined after use", "A script runs top to bottom: define functions above the line that calls them."], ["Ran the toolbox with ./", "Its functions vanish with the script's scope. Dot-source it."]]
  },
  watch: [
    { code: "function Get-Hello { Write-Host 'hello' }; (Get-Hello).Count", say: "It printed, but the output is empty: count 0." },
    { code: "function Get-Hello { 'hello' }; (Get-Hello).Count", say: "Leave the value on the pipeline instead: count 1." },
    { code: "function Get-UserCard { param([string]$UserId) $u = Get-MgUser -UserId $UserId -Property DisplayName,Department,City; [pscustomobject]@{ Name = $u.DisplayName; Department = $u.Department; City = $u.City } }", say: "A real function: one parameter, one object out." },
    { code: "Get-UserCard -UserId " + U("elara.wynn"), say: "Called like a cmdlet." },
    { code: "'elara.wynn','dorian.pike' | ForEach-Object { Get-UserCard -UserId \"$_@" + DOMAIN + "\" } | Sort-Object City", say: "And because it returns objects, it pipes." }
  ],
  trace: { ask: "Return an object instead of text.", tpl: "function Get-Card { param([string]$UserId) $u = Get-MgUser -UserId $UserId -Property DisplayName,City; [[[pscustomobject]]]@{ Name = $u.DisplayName; City = $u.City } }; Get-Card -UserId " + U("dorian.pike"), check: { out: "function Get-Card { param([string]$UserId) $u = Get-MgUser -UserId $UserId -Property DisplayName,City; [pscustomobject]@{ Name = $u.DisplayName; City = $u.City } }; Get-Card -UserId " + U("dorian.pike") }, wrong: "The cast that turns a hashtable into an object." },
  traceHints: ["A type name inside the square brackets, before @{ }.", "PowerShell custom object.", "ps____________", "Answer: pscustomobject"],
  recall: { ask: "In ~/Documents/scripts/Halvard-Tools.ps1 write a function Get-UserCard with a -UserId parameter that returns an object with Name, Department and City. Dot-source the file, then run Get-UserCard for Elara Wynn.", setup: "scripts", check: { fn: (ctx, res) => { const t = scFile(ctx, "Halvard-Tools.ps1"); return !!t && !!ctx.funcs["get-usercard"] && !res.error && res.out.length === 1 && res.out[0].Name === "Elara Wynn" && res.out[0].City !== undefined && res.out[0].Department !== undefined; } }, wrong: "Is the function in the file, the file dot-sourced (dot space), and the result an object with three properties?" },
  recallHints: ["function Get-UserCard { param([string]$UserId) ... } in the file.", "Inside: Get-MgUser with -Property, then [pscustomobject]@{ Name = ...; Department = ...; City = ... }", "Save, then: . ./Halvard-Tools.ps1", "In the file: function Get-UserCard { param([string]$UserId) $u = Get-MgUser -UserId $UserId -Property DisplayName,Department,City; [pscustomobject]@{ Name = $u.DisplayName; Department = $u.Department; City = $u.City } }   then . ./Halvard-Tools.ps1; Get-UserCard -UserId " + U("elara.wynn")],
  real: ["Write a Get-MyInfo function in a toolbox file, dot-source it from your PowerShell profile ($PROFILE) so it is there every session."],
  cheat: [["function Verb-Noun { param($X) ... }", "Define a function"], ["[pscustomobject]@{ A = 1; B = 2 }", "Return an object"], [". ./Tools.ps1", "Load functions into the session"]]
},
{
  id: "scripterrors", seq: 9, name: "Errors in scripts", tag: "TRY / CATCH", title: "One bad row must not stop the other 199",
  summary: "Make errors catchable with Stop, catch them per item, collect what failed, report at the end.",
  setup: "scripts",
  brief: {
    what: [
      "Many errors are <b>non-terminating</b>: PowerShell prints red and carries on, and try/catch never sees them. Put <code>$ErrorActionPreference = 'Stop'</code> at the top of a script (or -ErrorAction Stop on the command) to make them catchable.",
      "Wrap <b>each item</b> in its own try/catch inside the loop, not the whole loop: one missing user must not stop the other 199. In catch, <b>$_</b> is the error; <b>$_.Exception.Message</b> is its text.",
      "Report instead of hiding: <b>Write-Warning</b> for the screen, and output a result object per item (<code>[pscustomobject]@{ Upn = $upn; Found = $false }</code>) so the run ends with a list you can export. <b>throw 'reason'</b> stops the whole script on purpose, for example when a required file is missing."
    ],
    daily: ["Every bulk script", "Leavers lists with typos", "Scheduled jobs nobody watches"],
    parts: [["$ErrorActionPreference = 'Stop'", "make errors catchable"], ["foreach ($r in $rows) { try { ... } catch { ... } }", "one try per item"], ["$_.Exception.Message", "the error's text"], ["throw 'No input file'", "stop on purpose"]],
    flow: [["Stop", "errors become catchable"], ["Per item", "try / catch"], ["Record", "result object"], ["End", "list of what failed"]],
    traps: [["catch never runs", "The error was non-terminating. Add Stop."], ["try around the loop", "First failure ends the whole loop."], ["Empty catch", "catch { } swallows the error silently. Always record it."]]
  },
  watch: [
    { code: "Import-Csv ~/Downloads/leavers.csv", say: "Three leavers. Not all of them are in the tenant any more." },
    { code: "foreach ($r in Import-Csv ~/Downloads/leavers.csv) { try { $u = Get-MgUser -UserId $r.UPN -ErrorAction Stop; [pscustomobject]@{ Upn = $r.UPN; Found = $true } } catch { Write-Warning \"$($r.UPN): $($_.Exception.Message)\"; [pscustomobject]@{ Upn = $r.UPN; Found = $false } } }", say: "Every row gets a result. The failures are visible, and the loop finished." },
    { code: "throw 'leavers.csv is empty'", say: "throw stops on purpose. In a script, nothing after it runs." }
  ],
  trace: { ask: "Make the error catchable so the catch block runs.", tpl: "try { Get-MgUser -UserId nobody@" + DOMAIN + " -ErrorAction [[Stop]] } catch { Write-Output \"caught: $($_.Exception.Message)\" }", check: { fn: (ctx, res) => !res.error && res.out.length === 1 && /^caught:/.test(String(res.out[0])) }, wrong: "Which ErrorAction turns an error into a terminating one?" },
  traceHints: ["catch only sees terminating errors.", "The value that halts.", "S___", "Answer: Stop"],
  recall: { ask: "Write Test-Leavers.ps1: for every row in ~/Downloads/leavers.csv try Get-MgUser on the UPN and output [pscustomobject] with Upn and Found ($true/$false). Run it.", setup: "scripts", check: { fn: (ctx, res) => { const t = scFile(ctx, "Test-Leavers.ps1"); if (!t || !/catch/i.test(t)) return false; const r = scClone(ctx, "./Test-Leavers.ps1").res; if (r.error || r.out.length !== 3) return false; const want = ["ludo.kerr", "bastian.crane", "ines.corrigan"].map((n) => !!userOf(GRADER.makeCtx("none"), n)); return r.out.every((o, i) => o && o.Upn && o.Found === want[i]); } }, wrong: "Three rows out, each with Upn and Found. Did you use -ErrorAction Stop inside try?" },
  recallHints: ["foreach over Import-Csv, a try/catch inside.", "In try: Get-MgUser -UserId $r.UPN -ErrorAction Stop, then the Found = $true object.", "In catch: the Found = $false object.", "foreach ($r in Import-Csv ~/Downloads/leavers.csv) {\n    try { Get-MgUser -UserId $r.UPN -ErrorAction Stop | Out-Null; [pscustomobject]@{ Upn = $r.UPN; Found = $true } }\n    catch { [pscustomobject]@{ Upn = $r.UPN; Found = $false } }\n}"],
  real: ["Add $ErrorActionPreference = 'Stop' and a per-item try/catch to the next bulk script you write at work, and export the results to a CSV."],
  cheat: [["$ErrorActionPreference = 'Stop'", "Top of a script"], ["try { ... } catch { $_.Exception.Message }", "Catch and read"], ["throw 'reason'", "Stop on purpose"]]
},
{
  id: "shouldprocess", seq: 9, name: "-WhatIf for your script", tag: "DRY RUN", title: "Give your own script a -WhatIf",
  summary: "[CmdletBinding(SupportsShouldProcess)] gives your script -WhatIf and -Verbose; -WhatIf flows into every cmdlet inside.",
  setup: "scripts",
  brief: {
    what: [
      "Put <b>[CmdletBinding(SupportsShouldProcess)]</b> right above param(). Your script now accepts <b>-WhatIf</b>, <b>-Confirm</b> and <b>-Verbose</b> like a real cmdlet.",
      "-WhatIf <b>flows down</b>: every cmdlet inside that supports it (Update-MgUser, Set-Mailbox, Add-DistributionGroupMember...) rehearses instead of changing. For your own steps, ask first: <code>if ($PSCmdlet.ShouldProcess($target, 'what you will do')) { ... }</code> prints a What if line during a dry run and returns $false.",
      "<b>Write-Verbose</b> lines stay hidden until someone runs with -Verbose. Perfect for progress messages you only want when debugging."
    ],
    daily: ["Every script that changes things", "Showing a manager what a run will do", "Debugging with -Verbose"],
    parts: [["[CmdletBinding(SupportsShouldProcess)]", "above param()"], ["./Set-X.ps1 -WhatIf", "dry run of everything inside"], ["$PSCmdlet.ShouldProcess($u, 'Set office')", "your own guarded step"], ["Write-Verbose \"Doing $u\"", "shown with -Verbose"]],
    flow: [["CmdletBinding", "SupportsShouldProcess"], ["-WhatIf", "first run"], ["Read", "the What if lines"], ["Run", "for real"]],
    traps: [["No CmdletBinding", "-WhatIf on your script is then 'parameter not found'."], ["Write-Host inside ShouldProcess", "Changes without a cmdlet (writing files, counters) need their own ShouldProcess check."], ["Verbose with Write-Host", "Write-Host always prints. Use Write-Verbose for optional detail."]]
  },
  watch: [
    { code: "Set-Content ./Set-DeptOffice.ps1 -Value \"[CmdletBinding(SupportsShouldProcess)]`nparam([Parameter(Mandatory)][string]`$Department, [string]`$Office = 'Bruges HQ')`nforeach (`$u in Get-MgUser -All -Filter `\"department eq '`$Department'`\") { Write-Verbose `\"Setting `$(`$u.DisplayName)`\"; Update-MgUser -UserId `$u.Id -OfficeLocation `$Office }\"", say: "The script (written for you here): CmdletBinding, two parameters, one loop." },
    { code: "./Set-DeptOffice.ps1 -Department Finance -WhatIf", say: "No change. Update-MgUser inherited -WhatIf from the script." },
    { code: "./Set-DeptOffice.ps1 -Department Finance -Verbose", say: "For real, with the progress lines visible." },
    { code: "Get-MgUser -All -Filter \"department eq 'Finance'\" -Property DisplayName,OfficeLocation | Select-Object DisplayName,OfficeLocation", say: "Read it back." }
  ],
  trace: { ask: "Give the script -WhatIf support.", tpl: "function Set-Test { [CmdletBinding([[SupportsShouldProcess]])] param([string]$UserId) Update-MgUser -UserId $UserId -OfficeLocation 'Lab' }; Set-Test -UserId " + U("dorian.pike") + " -WhatIf", check: { fn: (ctx, res) => !res.error && userOf(ctx, "dorian.pike").OfficeLocation !== "Lab" && res.host.some((h) => /What if/.test(h.text || "")) }, wrong: "The CmdletBinding argument that enables -WhatIf." },
  traceHints: ["It 'supports' something.", "Should it process?", "Supports______Process", "Answer: SupportsShouldProcess"],
  recall: { ask: "Write Set-DeptCity.ps1 with SupportsShouldProcess and a mandatory -Department and -City. It sets City for every user in that department. Rehearse it for Finance with -City Antwerp and -WhatIf, then run it for real.", setup: "scripts", check: { fn: (ctx, res, hist) => { const t = scFile(ctx, "Set-DeptCity.ps1"); if (!t || !/SupportsShouldProcess/i.test(t)) return false; const fin = ctx.t.users.filter((u) => u.Department === "Finance"); const wi = hist.findIndex((h) => /Set-DeptCity\.ps1/i.test(h) && /-WhatIf/i.test(h)); const real = hist.findIndex((h, i) => i > wi && /Set-DeptCity\.ps1/i.test(h) && !/-WhatIf/i.test(h)); return wi >= 0 && real > wi && fin.every((u) => u.City === "Antwerp"); } }, wrong: "CmdletBinding(SupportsShouldProcess), two mandatory parameters, a -WhatIf run, then a real run." },
  recallHints: ["Top: [CmdletBinding(SupportsShouldProcess)] then param().", "Loop over Get-MgUser -All -Filter on $Department, Update-MgUser -City $City inside.", "Save, run with -Department Finance -City Antwerp -WhatIf, then without -WhatIf.", "[CmdletBinding(SupportsShouldProcess)]\nparam([Parameter(Mandatory)][string]$Department, [Parameter(Mandatory)][string]$City)\nforeach ($u in Get-MgUser -All -Filter \"department eq '$Department'\") { Update-MgUser -UserId $u.Id -City $City }"],
  real: ["Add [CmdletBinding(SupportsShouldProcess)] to a script of yours that changes something, and always run it with -WhatIf first."],
  cheat: [["[CmdletBinding(SupportsShouldProcess)]", "Script gets -WhatIf/-Confirm/-Verbose"], ["if ($PSCmdlet.ShouldProcess($t, 'action')) { }", "Guard your own step"], ["Write-Verbose 'msg'", "Shown only with -Verbose"]]
}
);

Object.assign(DRILLS, {
  runscript: [
    { setup: "scripts", q: "Run Get-StaleUsers.ps1 from its folder.", out: "./Get-StaleUsers.ps1", hint: "./" },
    { setup: "scripts", q: "Run it by name only and read the Suggestion line.", fn: (ctx, res) => !!res.error && /Suggestion/.test(res.error.text()), sol: ["Get-StaleUsers.ps1"], hint: "No ./" },
    { setup: "scripts", q: "From your Desktop, run it with the call operator and a quoted path.", pre: ["cd ~/Desktop"], fn: (ctx, res, hist) => !res.error && ctx.cwd === "/Users/kaatje/Desktop" && res.out.length > 0 && hist.some((h) => /^&\s*['"]/.test(h.trim())), sol: ["& '~/Documents/scripts/Get-StaleUsers.ps1'"], hint: "& '...'" },
    { setup: "scripts", q: "How many stale users does the script report? One number.", fn: (ctx, res) => res.out.length === 1 && res.out[0] === scClone(ctx, "./Get-StaleUsers.ps1").res.out.length, sol: ["(./Get-StaleUsers.ps1).Count"], hint: "( ... ).Count" },
    { setup: "scripts", q: "Dot-source the script, then show $cutoff.", fn: (ctx, res, hist) => res.out.length === 1 && res.out[0] instanceof Date && hist.some((h) => /^\.\s+\.\//.test(h.trim())), sol: [". ./Get-StaleUsers.ps1 | Out-Null", "$cutoff"], hint: "A dot, a space, then the path." },
    { setup: "scripts", q: "Export the script's output to ~/Desktop/stale.csv for Belgian Excel.", fn: (ctx) => { const c = csvRows(ctx, "/Users/kaatje/Desktop/stale.csv"); return !!c && /DisplayName/.test(c.head) && c.head.includes(";") && c.rows.length === scClone(ctx, "./Get-StaleUsers.ps1").res.out.length; }, sol: ["./Get-StaleUsers.ps1 | Export-Csv ~/Desktop/stale.csv -NoTypeInformation -Delimiter ';'"], hint: "A script's output pipes like any command." }
  ],
  firstscript: [
    { q: "Write Get-DisabledUsers.ps1 that lists DisplayName of disabled accounts, and run it.", fn: (ctx) => { const t = scFile(ctx, "Get-DisabledUsers.ps1"); return !!t && scClone(ctx, "./Get-DisabledUsers.ps1").txt === scRef("Get-MgUser -All -Filter 'accountEnabled eq false' -Property DisplayName | Select-Object DisplayName"); }, sol: ["Set-Content ./Get-DisabledUsers.ps1 -Value \"Get-MgUser -All -Filter 'accountEnabled eq false' -Property DisplayName | Select-Object DisplayName\"", "./Get-DisabledUsers.ps1"], hint: "code ./Get-DisabledUsers.ps1, one line, Cmd+S." },
    { q: "Write Get-SalesCount.ps1 over two lines: line 1 stores Sales users in $users, line 2 outputs $users.Count.", fn: (ctx) => { const t = scFile(ctx, "Get-SalesCount.ps1"); if (!t || t.trim().split("\n").length < 2) return false; const r = scClone(ctx, "./Get-SalesCount.ps1").res; return r.out.length === 1 && r.out[0] === 8; }, sol: ["Set-Content ./Get-SalesCount.ps1 -Value \"`$users = Get-MgUser -All -Filter `\"department eq 'Sales'`\"`n`$users.Count\""], hint: "Two lines, one variable." },
    { q: "Make a script Broken.ps1 with a missing } on purpose. Look at the status bar, then run it and read the ParserError.", fn: (ctx, res) => !!res.error && res.error.parse === true, sol: ["Set-Content ./Broken.ps1 -Value 'if ($true) { Write-Output 1'", "./Broken.ps1"], hint: "if ($true) { ... without the closing brace." },
    { q: "Write Get-OpsCities.ps1 as one pipeline over three lines (each line ending in |): Operations users, group by City, Name and Count.", fn: (ctx) => { const t = scFile(ctx, "Get-OpsCities.ps1"); return !!t && /\|\s*\n/.test(t) && scClone(ctx, "./Get-OpsCities.ps1").txt === scRef("Get-MgUser -All -Filter \"department eq 'Operations'\" -Property City | Group-Object City | Select-Object Name,Count"); }, sol: ["Set-Content ./Get-OpsCities.ps1 -Value \"Get-MgUser -All -Filter `\"department eq 'Operations'`\" -Property City |`n    Group-Object City |`n    Select-Object Name,Count\""], hint: "End lines with |, indent the next one." },
    { q: "List the .ps1 files in your scripts folder: names only.", out: "Get-ChildItem -Filter *.ps1 -Name", hint: "Get-ChildItem -Filter *.ps1 -Name" }
  ],
  params: [
    { q: "Run Get-DeptUsers.ps1 for Sales with the default Top.", out: "./Get-DeptUsers.ps1 -Department Sales", hint: "Only -Department." },
    { q: "Run it with -Top abc and read the error.", fn: (ctx, res) => !!res.error && /Int32/.test(res.error.text()), sol: ["./Get-DeptUsers.ps1 -Department Sales -Top abc"], hint: "A word where a number belongs." },
    { q: "Run it with a splat: $p = @{ Department = 'Operations'; Top = 2 }", out: "$p = @{ Department = 'Operations'; Top = 2 }; ./Get-DeptUsers.ps1 @p", hint: "@p, not $p" },
    { q: "Write Get-JobTitle.ps1 with a mandatory -Title and a [switch]$Count: without the switch it lists DisplayName of users with that JobTitle, with it only the number. Run it for 'Account Manager' -Count.", fn: (ctx) => { const t = scFile(ctx, "Get-JobTitle.ps1"); if (!t || !/\[switch\]/i.test(t)) return false; const a = scClone(ctx, "./Get-JobTitle.ps1 -Title 'Account Manager'").txt === scRef("Get-MgUser -All -Filter \"jobTitle eq 'Account Manager'\" -Property DisplayName | Select-Object DisplayName"); const b = scClone(ctx, "./Get-JobTitle.ps1 -Title 'Account Manager' -Count").res; const n = scClone(ctx, "(Get-MgUser -All -Filter \"jobTitle eq 'Account Manager'\").Count").res.out[0]; return a && b.out.length === 1 && b.out[0] === n; }, sol: ["Set-Content ./Get-JobTitle.ps1 -Value \"param([Parameter(Mandatory)][string]`$Title, [switch]`$Count)`n`$u = Get-MgUser -All -Filter `\"jobTitle eq '`$Title'`\" -Property DisplayName`nif (`$Count) { `$u.Count } else { `$u | Select-Object DisplayName }\""], hint: "if ($Count) { ... } else { ... }" },
    { q: "Add [ValidateSet('Bruges','Ghent','Antwerp')] to -City in Get-CityUsers.ps1, then try -City Paris.", pre: ["Set-Content ./Get-CityUsers.ps1 -Value \"param([Parameter(Mandatory)][string]`$City)`nGet-MgUser -All -Filter `\"city eq '`$City'`\" -Property DisplayName,Department | Select-Object DisplayName,Department\""], fn: (ctx, res) => { const t = scFile(ctx, "Get-CityUsers.ps1"); return !!t && /ValidateSet/i.test(t) && !!res.error && /ValidateSet/.test(res.error.text()); }, sol: ["Set-Content ./Get-CityUsers.ps1 -Value \"param([Parameter(Mandatory)][ValidateSet('Bruges','Ghent','Antwerp')][string]`$City)`nGet-MgUser -All -Filter `\"city eq '`$City'`\" -Property DisplayName,Department | Select-Object DisplayName,Department\"", "./Get-CityUsers.ps1 -City Paris"], hint: "The attribute goes right before [string]$City." }
  ],
  functions: [
    { q: "Define Get-Initials with a -Name parameter that returns the first letter of each word (Elara Wynn → EW), then run it for 'Elara Wynn'.", fn: (ctx, res) => !!ctx.funcs["get-initials"] && res.out.length === 1 && res.out[0] === "EW", sol: ["function Get-Initials { param([string]$Name) ($Name -split ' ' | ForEach-Object { $_.Substring(0,1) }) -join '' }; Get-Initials -Name 'Elara Wynn'"], hint: "-split ' ', first letter of each, -join ''." },
    { q: "Prove the trap: a function that only uses Write-Host, piped into Measure-Object. Show the Count.", fn: (ctx, res) => res.out.length === 1 && res.out[0] && res.out[0].Count === 0, sol: ["function Show-X { Write-Host 'x' }; Show-X | Measure-Object | Select-Object Count"], hint: "Measure-Object counts what came down the pipe." },
    { q: "Define Get-UserCard (Name, Department, City), then export cards for everyone in Finance to ~/Desktop/cards.csv with ';'.", fn: (ctx) => { const c = csvRows(ctx, "/Users/kaatje/Desktop/cards.csv"); return !!c && /Name/.test(c.head) && /City/.test(c.head) && c.rows.length === 5; }, sol: ["function Get-UserCard { param([string]$UserId) $u = Get-MgUser -UserId $UserId -Property DisplayName,Department,City; [pscustomobject]@{ Name = $u.DisplayName; Department = $u.Department; City = $u.City } }", "Get-MgUser -All -Filter \"department eq 'Finance'\" | ForEach-Object { Get-UserCard -UserId $_.Id } | Export-Csv ~/Desktop/cards.csv -NoTypeInformation -Delimiter ';'"], hint: "ForEach-Object calls your function per user." },
    { q: "Run Halvard-Tools.ps1 with ./ (not dot-sourced), then try Get-UserCard. Read the error.", pre: ["Set-Content ./Halvard-Tools.ps1 -Value 'function Get-UserCard { param([string]$UserId) Get-MgUser -UserId $UserId }'"], fn: (ctx, res, hist) => !!res.error && /not recognized/.test(res.error.text()) && hist.some((h) => /^\.\/Halvard-Tools\.ps1/i.test(h.trim())), sol: ["./Halvard-Tools.ps1", "Get-UserCard -UserId " + U("elara.wynn")], hint: "./ runs it in its own scope." },
    { q: "Give a function a default: Get-Team with [string]$Department = 'Sales' returning DisplayName. Run it without arguments.", fn: (ctx, res) => !!ctx.funcs["get-team"] && PS.formatOut(res.out, 120).trim() === scRef("Get-MgUser -All -Filter \"department eq 'Sales'\" -Property DisplayName | Select-Object DisplayName"), sol: ["function Get-Team { param([string]$Department = 'Sales') Get-MgUser -All -Filter \"department eq '$Department'\" -Property DisplayName | Select-Object DisplayName }; Get-Team"], hint: "param([string]$Department = 'Sales')" }
  ],
  scripterrors: [
    { q: "Show that try/catch misses a non-terminating error: Get-Content on a missing file inside try, catch outputs 'caught'. Nothing is caught.", fn: (ctx, res, hist) => !res.out.some((o) => o === "caught") && hist.some((h) => /try\s*\{\s*Get-Content/i.test(h)) && !/ErrorAction\s+Stop/i.test(hist[hist.length - 1] || ""), sol: ["try { Get-Content ./nope.txt } catch { 'caught' }"], hint: "No -ErrorAction Stop this time." },
    { q: "Now make it catchable and output the error message.", fn: (ctx, res) => res.out.length === 1 && /Cannot find path/.test(String(res.out[0])), sol: ["try { Get-Content ./nope.txt -ErrorAction Stop } catch { $_.Exception.Message }"], hint: "-ErrorAction Stop, then $_.Exception.Message" },
    { q: "Write Need-File.ps1 that throws 'Input file missing' when ~/Downloads/newhires2.csv doesn't exist. Run it.", fn: (ctx, res) => { const t = scFile(ctx, "Need-File.ps1"); return !!t && /throw/i.test(t) && !!res.error && /Input file missing/.test(res.error.text()); }, sol: ["Set-Content ./Need-File.ps1 -Value \"if (-not (Test-Path ~/Downloads/newhires2.csv)) { throw 'Input file missing' }\"", "./Need-File.ps1"], hint: "if (-not (Test-Path ...)) { throw '...' }" },
    { q: "Loop over 'elara.wynn','nobody.here','dorian.pike' and output only the DisplayNames that exist, with a Write-Warning for the one that doesn't.", fn: (ctx, res) => res.out.length === 2 && res.out.includes("Elara Wynn") && res.out.includes("Dorian Pike") && res.host.some((h) => /WARNING/.test(h.warn || "")), sol: ["foreach ($n in 'elara.wynn','nobody.here','dorian.pike') { try { (Get-MgUser -UserId \"$n@" + DOMAIN + "\" -ErrorAction Stop).DisplayName } catch { Write-Warning \"$n not found\" } }"], hint: "try per item, Write-Warning in catch." },
    { q: "Collect failures: run the same loop, put each failed name in $failed, and output $failed at the end.", fn: (ctx, res) => res.out.length >= 1 && res.out[res.out.length - 1] === "nobody.here", sol: ["$failed = @(); foreach ($n in 'elara.wynn','nobody.here','dorian.pike') { try { Get-MgUser -UserId \"$n@" + DOMAIN + "\" -ErrorAction Stop | Out-Null } catch { $failed += $n } }; $failed"], hint: "$failed = @() before, $failed += $n in catch." }
  ],
  shouldprocess: [
    { q: "Without CmdletBinding, a script refuses -WhatIf. Write NoBind.ps1 with just param([string]$X) and run it with -WhatIf.", fn: (ctx, res) => !!res.error && /parameter name 'WhatIf'/i.test(res.error.text()), sol: ["Set-Content ./NoBind.ps1 -Value 'param([string]$X) $X'", "./NoBind.ps1 -X a -WhatIf"], hint: "Read the error: no such parameter." },
    { q: "Write Say-Verbose.ps1 with [CmdletBinding()] that does Write-Verbose 'step 1' and outputs 'done'. Run it with -Verbose.", fn: (ctx, res) => res.out.includes("done") && res.host.some((h) => /VERBOSE: step 1/.test(h.warn || "")), sol: ["Set-Content ./Say-Verbose.ps1 -Value \"[CmdletBinding()]`nparam()`nWrite-Verbose 'step 1'`n'done'\"", "./Say-Verbose.ps1 -Verbose"], hint: "[CmdletBinding()] then param() even if empty." },
    { q: "Guard your own step: a function with SupportsShouldProcess that writes a log line with Add-Content only if $PSCmdlet.ShouldProcess allows. Call it with -WhatIf: no file appears.", fn: (ctx, res) => res.host.some((h) => /What if/.test(h.text || "")) && !ctx.fs["/Users/kaatje/Documents/scripts/guard.log"], sol: ["function Write-Log { [CmdletBinding(SupportsShouldProcess)] param([string]$Msg) if ($PSCmdlet.ShouldProcess('guard.log', 'Write log line')) { Add-Content ./guard.log -Value $Msg } }; Write-Log -Msg 'hi' -WhatIf"], hint: "if ($PSCmdlet.ShouldProcess(target, action)) { ... }" },
    { q: "Dry-run Set-DeptOffice.ps1 for Operations with -WhatIf: nothing may change.", pre: ["Set-Content ./Set-DeptOffice.ps1 -Value \"[CmdletBinding(SupportsShouldProcess)]`nparam([Parameter(Mandatory)][string]`$Department, [string]`$Office = 'Bruges HQ')`nforeach (`$u in Get-MgUser -All -Filter `\"department eq '`$Department'`\") { Update-MgUser -UserId `$u.Id -OfficeLocation `$Office }\""], fn: (ctx, res) => !res.error && res.host.filter((h) => /What if/.test(h.text || "")).length >= 5 && !ctx.t.users.some((u) => u.OfficeLocation === "Bruges HQ"), sol: ["./Set-DeptOffice.ps1 -Department Operations -WhatIf"], hint: "-WhatIf on the script." },
    { q: "Run Set-DeptOffice.ps1 for Operations with -Office 'Ghent Depot' for real, then show DisplayName and OfficeLocation of Operations.", pre: ["Set-Content ./Set-DeptOffice.ps1 -Value \"[CmdletBinding(SupportsShouldProcess)]`nparam([Parameter(Mandatory)][string]`$Department, [string]`$Office = 'Bruges HQ')`nforeach (`$u in Get-MgUser -All -Filter `\"department eq '`$Department'`\") { Update-MgUser -UserId `$u.Id -OfficeLocation `$Office }\""], fn: (ctx, res) => ctx.t.users.filter((u) => u.Department === "Operations").every((u) => u.OfficeLocation === "Ghent Depot") && res.out.length >= 10 && res.out.every((o) => o.OfficeLocation === "Ghent Depot"), sol: ["./Set-DeptOffice.ps1 -Department Operations -Office 'Ghent Depot'", "Get-MgUser -All -Filter \"department eq 'Operations'\" -Property DisplayName,OfficeLocation | Select-Object DisplayName,OfficeLocation"], hint: "Run, then read back." }
  ]
});

const SYNC_MUT = (ctx) => { const d = ctx.t.dls.find((x) => x.Name === "Operations Bruges"); d.members = d.members.filter((m) => !/torin\.ash|kestrel\.wade|anwen\.frost/.test(m)); };
const SYNC_CALL = "./Sync-DeptList.ps1 -Department Operations -List 'Operations Bruges'";
const opsWant = (ctx) => ctx.t.users.filter((u) => u.Department === "Operations" && u.AccountEnabled).map((u) => u.UserPrincipalName.toLowerCase());
const opsList = (ctx) => ctx.t.dls.find((x) => x.Name === "Operations Bruges").members.map((m) => m.toLowerCase());
const AUTOMATE = {
  id: "automate", type: "capstone", name: "The handover script", seq: 9, kind: "CAPSTONE · YOUR FIRST REAL TOOL", allow: /operations|torin|kestrel|anwen|maelis|oren|rowan|bastian|emrys|caius|ludo/i, hero: "gate", setup: "scripts",
  need: (m) => m.seq === 9, mutate: SYNC_MUT,
  story: "Garrick: 'Every time someone joins Operations, nobody adds them to the Operations Bruges list, and they miss the shift mails.' He wants a tool the next admin can run without you: Sync-DeptList.ps1 in ~/Documents/scripts. The grader runs your saved script on fresh copies of the tenant, so it has to work every time, not once.",
  doneMsg: "Sync-DeptList.ps1 works on a fresh tenant, rehearses with -WhatIf, survives a second run and logs what it did. That is a tool, not a one-liner.",
  tickets: [
    { id: "a1", from: "Garrick Penhale", title: "Parameters", body: "Create Sync-DeptList.ps1 with mandatory -Department and -List parameters and [CmdletBinding(SupportsShouldProcess)]. Running it without -Department must refuse.", hint: "[CmdletBinding(SupportsShouldProcess)] param([Parameter(Mandatory)][string]$Department, [Parameter(Mandatory)][string]$List)",
      check: (ctx) => { const t = scFile(ctx, "Sync-DeptList.ps1"); if (!t || !/SupportsShouldProcess/i.test(t) || !parses(t)) return false; const r = scClone(ctx, "./Sync-DeptList.ps1 -List 'Operations Bruges'", SYNC_MUT).res; return !!r.error && /mandatory/i.test(r.error.text()); } },
    { id: "a2", from: "Garrick Penhale", title: "Add who is missing", body: "It adds every enabled user of -Department who is not yet on -List. Disabled accounts stay off.", hint: "$have = (Get-DistributionGroupMember -Identity $List).PrimarySmtpAddress; loop over Get-MgUser -Filter department, skip if in $have or not AccountEnabled, else Add-DistributionGroupMember.",
      check: (ctx) => { if (!scFile(ctx, "Sync-DeptList.ps1")) return false; const base = GRADER.makeCtx("scripts"); SYNC_MUT(base); const before = opsList(base); const { c, res } = scClone(ctx, SYNC_CALL, SYNC_MUT); if (res.error) return false; const have = opsList(c); const disabled = c.t.users.filter((u) => !u.AccountEnabled).map((u) => u.UserPrincipalName.toLowerCase()); return opsWant(c).every((u) => have.includes(u)) && !have.some((m) => !before.includes(m) && disabled.includes(m)); } },
    { id: "a3", from: "You", title: "Rehearse", body: "With -WhatIf it changes nothing and says what it would do.", hint: "SupportsShouldProcess makes Add-DistributionGroupMember inherit -WhatIf.",
      check: (ctx) => { if (!scFile(ctx, "Sync-DeptList.ps1")) return false; const { c, res } = scClone(ctx, SYNC_CALL + " -WhatIf", SYNC_MUT); const before = GRADER.makeCtx("scripts"); SYNC_MUT(before); return !res.error && opsList(c).length === opsList(before).length && res.host.some((h) => /What if/.test(h.text || "")); } },
    { id: "a4", from: "Next admin", title: "Safe to run twice", body: "A second run right after the first must finish without errors or warnings: nobody left to add, nothing to complain about.", hint: "Skip people already on the list instead of letting Add-DistributionGroupMember fail.",
      check: (ctx) => { if (!scFile(ctx, "Sync-DeptList.ps1")) return false; const { c } = scClone(ctx, SYNC_CALL, SYNC_MUT); c.host = []; const r2 = PS.run(SYNC_CALL, c); return !r2.error && !r2.host.some((h) => h.err || h.warn); } },
    { id: "a5", from: "Garrick Penhale", title: "Leave a trail", body: "Each added person gets a line in ~/Documents/scripts/sync.log (Add-Content), and nothing is logged during -WhatIf.", hint: "Add-Content ~/Documents/scripts/sync.log -Value \"$(Get-Date) added $($u.UserPrincipalName)\" inside the add branch. Add-Content also respects -WhatIf.",
      check: (ctx) => { if (!scFile(ctx, "Sync-DeptList.ps1")) return false; const a = scClone(ctx, SYNC_CALL, SYNC_MUT).c; const log = a.fs[SC + "/sync.log"]; const prior = ctx.fs[SC + "/sync.log"] ? ctx.fs[SC + "/sync.log"].text.split("\n").filter(Boolean).length : 0; const w = scClone(ctx, SYNC_CALL + " -WhatIf", SYNC_MUT).c; const wl = w.fs[SC + "/sync.log"]; const base = GRADER.makeCtx("scripts"); SYNC_MUT(base); const exp = opsWant(base).filter((u) => !opsList(base).includes(u)).length; const n = log ? log.text.split("\n").filter(Boolean).length - prior : 0; return n === exp && (!wl || wl.text.split("\n").filter(Boolean).length === prior); } }
  ]
};
GATES.push(AUTOMATE);
AUTOMATE.text = { crumb: "Capstone · ", done: "Tool shipped", flow: [["Ticket", "what Garrick needs"], ["Write", "in Code, Cmd+S"], ["Rehearse", "-WhatIf"], ["Prove", "fresh tenant, twice"]], flowT: "CAPSTONE · BUILD A TOOL, NOT A ONE-LINER", rules: "<h6>CAPSTONE RULES</h6>Write Sync-DeptList.ps1 in Code (button above the console). Every ticket is checked by running your saved file on a fresh copy of the tenant. Save before you expect a ticket to close: run anything in the console to re-check.", junie: "Build it in small steps: params first, save, run. Then the loop. Then -WhatIf. Then the log. Each ticket checks one step." };
