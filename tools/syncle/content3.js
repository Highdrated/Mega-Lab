SEQUENCES[5].open = true; SEQUENCES[6].open = true;
const fsText = (ctx, f) => { const x = ctx.fs[ctx.path(f)] || ctx.fs["/Users/veyra/Desktop/" + f] || ctx.fs["/Users/veyra/Downloads/" + f]; return x ? x.text : null; };
const csvRows = (ctx, f) => { const t = fsText(ctx, f); if (!t) return null; const l = t.split("\n").filter(Boolean); return { head: l[0], rows: l.slice(1) }; };
const hostText = (res) => res.host.map((h) => h.text || "").join("\n");
const daysAgo = (d) => Math.floor((Date.now() - d.getTime()) / 864e5);

MEMORIES.push(
{
  id: "where", seq: 5, name: "Where-Object", tag: "FILTER", title: "Filter anything, any way",
  summary: "When -Filter can't express it, Where-Object can: contains, wildcards, regex, several conditions.",
  setup: "reports",
  brief: {
    what: [
      "-Filter is fast but limited to what Graph understands. <b>Where-Object</b> runs on your own machine, on objects you already have. So it can test anything: \"contains\", wildcards, regex, nested properties, several conditions at once.",
      "Inside the braces, <b>$_</b> is the object being tested. Comparison operators start with a dash: <b>-eq -ne -gt -lt -like -match</b>. Combine with <b>-and</b>, <b>-or</b>, and flip with <b>-not</b>. They ignore case by default."
    ],
    daily: ["\"Everyone with Manager in their title\"", "\"Accounts whose name contains a typo pattern\"", "Anything -Filter answers with Request_UnsupportedQuery"],
    parts: [["Where-Object { ... }", "keep objects where the block is true"], ["$_", "the current object"], ["-like '*Manager*'", "wildcard match"], ["-match '^[A-C]'", "regex match"], ["-and / -or / -not", "combine conditions"]],
    flow: [["All objects", "from Graph"], ["Where-Object", "test each one"], ["True", "passes"], ["False", "dropped"]],
    traps: [["Ask for the property", "Where-Object { $_.Department -eq 'IT' } on users without -Property Department keeps nobody."], ["Filter left", "For thousands of users, -Filter first, then Where-Object for the rest. Downloading everything to filter locally is slow."], ["-eq on lists", "On a list, -eq filters the list instead of returning true/false. Use -contains to ask 'is X in this list?'."]]
  },
  watch: [
    { code: "Get-MgUser -All -Property DisplayName,JobTitle | Where-Object { $_.JobTitle -like '*Manager*' } | Select-Object DisplayName,JobTitle", say: "Contains Manager anywhere in the title: -Filter can't do contains, Where-Object can." },
    { code: "Get-MgUser -All -Property DisplayName,Department,City | Where-Object { $_.Department -eq 'Operations' -and $_.City -ne 'Bruges' } | Select-Object DisplayName,City", say: "Two conditions: Operations, and not in Bruges." },
    { code: "Get-MgUser -All -Property DisplayName | Where-Object { $_.DisplayName -match '^[A-C]' } | Select-Object DisplayName", say: "Regex: names starting with A, B or C." }
  ],
  trace: { ask: "Find everyone whose title contains Account.", tpl: "Get-MgUser -All -Property DisplayName,JobTitle | Where-Object { $_.JobTitle [[-like]] '*Account*' } | Select-Object DisplayName,JobTitle", check: { out: "Get-MgUser -All -Property DisplayName,JobTitle | Where-Object { $_.JobTitle -like '*Account*' } | Select-Object DisplayName,JobTitle" }, wrong: "Which operator matches with wildcards?" },
  traceHints: ["Stars mean wildcards.", "Not -eq, not -match.", "-l___", "Answer: -like"],
  recall: { ask: "List the DisplayName and JobTitle of every enabled person in Sales whose title contains Manager.", setup: "reports", check: { out: "Get-MgUser -All -Property DisplayName,JobTitle,Department,AccountEnabled | Where-Object { $_.AccountEnabled -and $_.Department -eq 'Sales' -and $_.JobTitle -like '*Manager*' } | Select-Object DisplayName,JobTitle" }, wrong: "Three conditions: enabled, Sales, Manager." },
  recallHints: ["Request every property you test.", "Three conditions joined with -and.", "Where-Object { $_.AccountEnabled -and $_.Department -eq 'Sales' -and $_.JobTitle -like '*Manager*' }", "Get-MgUser -All -Property DisplayName,JobTitle,Department,AccountEnabled | Where-Object { $_.AccountEnabled -and $_.Department -eq 'Sales' -and $_.JobTitle -like '*Manager*' } | Select-Object DisplayName,JobTitle"],
  real: ["Get-MgUser -All -Property DisplayName,JobTitle | Where-Object { $_.JobTitle -like '*Manager*' } | Select-Object DisplayName,JobTitle"],
  cheat: [["Where-Object { $_.JobTitle -like '*Manager*' }", "Contains, with wildcards"], ["Where-Object { $_.A -eq 'x' -and $_.B -ne 'y' }", "Two conditions"], ["Where-Object { $_.DisplayName -match '^[A-C]' }", "Regex"], ["Where-Object { -not $_.AccountEnabled }", "Negate"]]
},
{
  id: "selsort", seq: 5, name: "Select & Sort", tag: "SHAPE", title: "Pick columns, order rows, take the top",
  summary: "Select-Object shapes the result, Sort-Object orders it, -First takes the top.",
  setup: "reports",
  brief: {
    what: [
      "<b>Select-Object</b> chooses columns, and also rows: <b>-First 5</b>, <b>-Last 5</b>, <b>-Unique</b>. With <b>-ExpandProperty</b> it unpacks one property into plain values, ready to use elsewhere.",
      "<b>Sort-Object</b> orders by one or more properties; <b>-Descending</b> flips it. The classic report shape is: get, sort, then take the top N."
    ],
    daily: ["\"The 5 newest accounts\"", "\"Which departments do we have?\" (unique)", "A list of just UPNs to paste somewhere"],
    parts: [["Sort-Object CreatedDateTime -Descending", "newest first"], ["Select-Object -First 5", "the top five rows"], ["Select-Object Department -Unique", "each value once"], ["Select-Object -ExpandProperty UserPrincipalName", "plain values, no header"]],
    flow: [["Objects", "unordered"], ["Sort-Object", "ordered"], ["Select-Object -First", "top N"], ["Columns", "only what matters"]],
    traps: [["Sort on what you asked for", "Sorting on a property you did not request sorts on empty values: nothing moves."], ["-Unique needs sorting in mind", "Select-Object -Unique keeps the first of each value as it comes. Sort first for a neat list."], ["-ExpandProperty takes one", "Only one property can be expanded at a time."]]
  },
  watch: [
    { code: "Get-MgUser -All -Property DisplayName,CreatedDateTime | Sort-Object CreatedDateTime -Descending | Select-Object -First 5 DisplayName,CreatedDateTime", say: "Newest five accounts." },
    { code: "Get-MgUser -All -Property Department | Select-Object Department -Unique | Sort-Object Department", say: "Every department once. The empty line is the guests: they have no department." },
    { code: "Get-MgUser -Filter \"department eq 'IT'\" | Select-Object -ExpandProperty UserPrincipalName", say: "Just the UPNs, no header: ready to copy into a mail." }
  ],
  trace: { ask: "Show the 3 oldest accounts (DisplayName and CreatedDateTime).", tpl: "Get-MgUser -All -Property DisplayName,CreatedDateTime | Sort-Object CreatedDateTime | Select-Object -[[First]] 3 DisplayName,CreatedDateTime", check: { out: "Get-MgUser -All -Property DisplayName,CreatedDateTime | Sort-Object CreatedDateTime | Select-Object -First 3 DisplayName,CreatedDateTime" }, wrong: "Take the top of the sorted list." },
  traceHints: ["Oldest first is the default order. Now take the top.", "The opposite of -Last.", "-F____", "Answer: -First"],
  recall: { ask: "List every Finance UPN as plain values, sorted alphabetically.", setup: "reports", check: { out: "Get-MgUser -Filter \"department eq 'Finance'\" | Sort-Object UserPrincipalName | Select-Object -ExpandProperty UserPrincipalName" }, wrong: "Filter Finance, sort, expand the UPN." },
  recallHints: ["Filter, sort, expand.", "-ExpandProperty for plain values.", "... | Sort-Object UserPrincipalName | Select-Object -ExpandProperty UserPrincipalName", "Get-MgUser -Filter \"department eq 'Finance'\" | Sort-Object UserPrincipalName | Select-Object -ExpandProperty UserPrincipalName"],
  real: ["Get-MgUser -All -Property DisplayName,CreatedDateTime | Sort-Object CreatedDateTime -Descending | Select-Object -First 5 DisplayName,CreatedDateTime"],
  cheat: [["Sort-Object X -Descending | Select-Object -First 5", "Top 5"], ["Select-Object X -Unique", "Each value once"], ["Select-Object -ExpandProperty X", "Plain values"]]
},
{
  id: "groupmeasure", seq: 5, name: "Group & Measure", tag: "COUNT + SUM", title: "Count per value, add things up",
  summary: "Group-Object answers 'how many per...', Measure-Object answers 'how many, how much'.",
  setup: "reports",
  brief: {
    what: [
      "<b>Group-Object</b> puts objects in buckets by a property and counts each bucket: people per department, mailboxes per type, users per city. Its output has <b>Name</b> (the value) and <b>Count</b>.",
      "<b>Measure-Object</b> counts and does maths on one property: <b>-Sum</b>, <b>-Average</b>, <b>-Maximum</b>, <b>-Minimum</b>. Total licenses consumed, average mailbox size, the biggest number."
    ],
    daily: ["Head-count per department for HR", "Total licenses in use for finance", "\"Which city has the most people?\""],
    parts: [["Group-Object Department", "one bucket per department"], ["Select-Object Name,Count", "clean two-column view"], ["Measure-Object -Property ConsumedUnits -Sum", "add one column up"]],
    flow: [["Objects", "many"], ["Group-Object", "buckets"], ["Count", "per bucket"], ["Sort", "biggest first"]],
    traps: [["Group on requested data", "Group-Object Department without -Property Department puts everyone in one empty bucket."], ["Group property is Group", "Each bucket also carries the objects themselves in .Group, handy for drilling down."]]
  },
  watch: [
    { code: "Get-MgUser -All -Property Department | Group-Object Department | Sort-Object Count -Descending | Select-Object Name,Count", say: "People per department, biggest first. The empty name is the guests." },
    { code: "Get-MgSubscribedSku | Measure-Object -Property ConsumedUnits -Sum", say: "Total licenses in use across every SKU." }
  ],
  trace: { ask: "Count people per city.", tpl: "Get-MgUser -All -Property City | [[Group-Object]] City | Select-Object Name,Count", check: { out: "Get-MgUser -All -Property City | Group-Object City | Select-Object Name,Count" }, wrong: "Which command makes buckets?" },
  traceHints: ["Buckets per value.", "Verb Group.", "Group-______", "Answer: Group-Object"],
  recall: { ask: "How many people per department are disabled? Show Name and Count.", setup: "reports", check: { out: "Get-MgUser -All -Filter \"accountEnabled eq false\" -Property Department | Group-Object Department | Select-Object Name,Count" }, wrong: "Filter disabled first, then group." },
  recallHints: ["Filter first, group second.", "accountEnabled eq false, then Group-Object Department.", "Get-MgUser -All -Filter \"accountEnabled eq false\" -Property Department | Group-Object Department | Select-Object Name,Count", "Get-MgUser -All -Filter \"accountEnabled eq false\" -Property Department | Group-Object Department | Select-Object Name,Count"],
  real: ["Get-MgUser -All -Property Department | Group-Object Department | Sort-Object Count -Descending | Select-Object Name,Count"],
  cheat: [["Group-Object Department | Select-Object Name,Count", "Count per value"], ["Measure-Object -Property X -Sum -Average", "Add up / average"]]
},
{
  id: "calc", seq: 5, name: "Calculated columns", tag: "YOUR OWN COLUMNS", title: "Make columns that don't exist yet",
  summary: "@{n='Name';e={...}} turns any expression into a column: days since sign-in, status text, free seats.",
  setup: "reports",
  brief: {
    what: [
      "A <b>calculated property</b> is a hashtable in Select-Object: <b>n</b> is the column name, <b>e</b> a script block that computes the value from <b>$_</b>. It turns raw data into the answer people actually asked for.",
      "Common ones: days since last sign-in <b>((Get-Date) - $_.SignInActivity.LastSignInDateTime).Days</b>, a readable status <b>if ($_.AccountEnabled) {'Enabled'} else {'Disabled'}</b>, and free seats per license."
    ],
    daily: ["\"How long since they last signed in?\"", "Readable status columns for HR", "Anything a manager wants in one glance"],
    parts: [["@{n='Status';e={ ... }}", "a column called Status"], ["$_", "the current object inside e"], ["(Get-Date) - $date", "a time span"], [".Days", "whole days of that span"]],
    flow: [["Raw property", "a date"], ["Expression", "today minus date"], ["New column", "DaysAgo"], ["Report", "answers the question"]],
    traps: [["SignInActivity", "Needs AuditLog.Read.All and -Property SignInActivity. The date lives at $_.SignInActivity.LastSignInDateTime."], ["Never signed in", "Empty dates make the subtraction fail. Filter them out first, or handle them in the expression."], ["Quotes", "n='Name' with quotes; e={...} with braces."]]
  },
  watch: [
    { code: "Get-MgUser -All -Property DisplayName,AccountEnabled | Select-Object DisplayName,@{n='Status';e={ if ($_.AccountEnabled) { 'Enabled' } else { 'Disabled' } }} | Select-Object -First 6", say: "Turn True/False into words." },
    { code: "Get-MgUser -All -Filter \"userType eq 'Member'\" -Property DisplayName,SignInActivity | Where-Object { $_.SignInActivity.LastSignInDateTime } | Select-Object DisplayName,@{n='DaysAgo';e={((Get-Date) - $_.SignInActivity.LastSignInDateTime).Days}} | Sort-Object DaysAgo -Descending | Select-Object -First 5", say: "Days since last sign-in, longest first. Members only, and only those who ever signed in." }
  ],
  trace: { ask: "Show each SKU with a Free column.", tpl: "Get-MgSubscribedSku | Select-Object SkuPartNumber,@{n='Free';[[e]]={$_.PrepaidUnits.Enabled - $_.ConsumedUnits}}", check: { out: "Get-MgSubscribedSku | Select-Object SkuPartNumber,@{n='Free';e={$_.PrepaidUnits.Enabled - $_.ConsumedUnits}}" }, wrong: "Which key holds the expression?" },
  traceHints: ["n is the name. The other key is...", "Short for expression.", "_", "Answer: e"],
  recall: { ask: "For every IT person show DisplayName and a column Mailbox with 'yes' when Mail is filled and 'no' when it is empty.", setup: "reports", check: { out: "Get-MgUser -Filter \"department eq 'IT'\" -Property DisplayName,Mail | Select-Object DisplayName,@{n='Mailbox';e={ if ($_.Mail) { 'yes' } else { 'no' } }}" }, wrong: "An if inside e." },
  recallHints: ["Same shape as the Status example.", "if ($_.Mail) { 'yes' } else { 'no' }", "Select-Object DisplayName,@{n='Mailbox';e={ ... }}", "Get-MgUser -Filter \"department eq 'IT'\" -Property DisplayName,Mail | Select-Object DisplayName,@{n='Mailbox';e={ if ($_.Mail) { 'yes' } else { 'no' } }}"],
  real: ["Connect-MgGraph -Scopes User.Read.All,AuditLog.Read.All", "The DaysAgo example from Watch, on your tenant"],
  cheat: [["@{n='Free';e={$_.PrepaidUnits.Enabled - $_.ConsumedUnits}}", "Free seats"], ["@{n='DaysAgo';e={((Get-Date) - $_.SignInActivity.LastSignInDateTime).Days}}", "Days since sign-in"], ["@{n='Status';e={ if ($_.AccountEnabled) {'Enabled'} else {'Disabled'} }}", "Readable status"]]
},
{
  id: "export", seq: 5, name: "Export-Csv", tag: "HAND IT OVER", title: "Turn any result into a file",
  summary: "Select first, then Export-Csv. Read it back to check.",
  setup: "reports",
  brief: {
    what: [
      "<b>Export-Csv</b> writes objects to a CSV that opens in Excel. Always <b>Select-Object</b> the columns first. Raw Graph objects dump every property. Lists show up as <b>System.Object[]</b>, and anything you did not request shows up as empty cells.",
      "<b>-NoTypeInformation</b> drops an old header line (the default in PowerShell 7, but harmless and still common in scripts). Check the file with <b>Get-Content</b> or read it back as objects with <b>Import-Csv</b>."
    ],
    daily: ["Every report anyone asks for", "Before a bulk change: export what you are about to touch", "Evidence for audits"],
    parts: [["Select-Object A,B", "the columns you want"], ["Export-Csv ./report.csv", "write the file"], ["-NoTypeInformation", "no type header line"], ["Get-Content ./report.csv -TotalCount 3", "peek at it"]],
    flow: [["Get", "objects"], ["Select-Object", "columns"], ["Export-Csv", "file"], ["Get-Content", "check"]],
    traps: [["System.Object[]", "Lists like AssignedLicenses do not fit in a CSV cell. Calculate a readable column instead."], ["Overwrite", "Export-Csv replaces an existing file silently. -Append adds rows instead."], ["Path", "./ means the folder you are in (see the prompt). Reports in this sequence start on your Desktop, so they show up there."], ["Excel on a Belgian Mac", "Excel with Belgian region settings expects ; between columns. A normal comma CSV opens as one long column A. Export with -Delimiter ';' or -UseCulture when the file is for Excel."]]
  },
  watch: [
    { code: "Get-MgUser -Filter \"department eq 'Legal'\" -Property DisplayName,JobTitle | Export-Csv ./legal-raw.csv -NoTypeInformation", say: "Export without Select-Object first..." },
    { code: "Get-Content ./legal-raw.csv -TotalCount 2", say: "...every property, mostly empty, lists as System.Object[]. Not something to send." },
    { code: "Get-MgUser -Filter \"department eq 'Legal'\" -Property DisplayName,JobTitle | Select-Object DisplayName,JobTitle | Export-Csv ./legal.csv -NoTypeInformation", say: "Select first." },
    { code: "Get-Content ./legal.csv", say: "Clean: a header and one row per person." }
  ],
  trace: { ask: "Export the IT team's DisplayName and UserPrincipalName to it.csv.", tpl: "Get-MgUser -Filter \"department eq 'IT'\" | Select-Object DisplayName,UserPrincipalName | [[Export-Csv]] ./it.csv -NoTypeInformation", check: { fn: (ctx) => { const c = csvRows(ctx, "it.csv"); return !!c && c.head === "\"DisplayName\",\"UserPrincipalName\"" && c.rows.length === 5; } }, wrong: "Which command writes a CSV?" },
  traceHints: ["Verb Export.", "Noun Csv.", "Export-___", "Answer: Export-Csv"],
  recall: { ask: "Finance wants every disabled account in a file: DisplayName and UserPrincipalName, in disabled.csv.", setup: "reports", check: { fn: (ctx) => { const c = csvRows(ctx, "disabled.csv"); return !!c && c.head === "\"DisplayName\",\"UserPrincipalName\"" && c.rows.length === 5; } }, wrong: "Filter disabled, select two columns, export." },
  recallHints: ["Three steps: filter, select, export.", "accountEnabled eq false", "... | Select-Object DisplayName,UserPrincipalName | Export-Csv ./disabled.csv -NoTypeInformation", "Get-MgUser -All -Filter \"accountEnabled eq false\" | Select-Object DisplayName,UserPrincipalName | Export-Csv ./disabled.csv -NoTypeInformation"],
  real: ["Get-MgUser -Filter \"department eq '<yours>'\" | Select-Object DisplayName,UserPrincipalName | Export-Csv ~/Desktop/team.csv -NoTypeInformation", "Open it in Excel"],
  cheat: [["... | Select-Object A,B | Export-Csv ./x.csv -NoTypeInformation", "Write a CSV"], ["Get-Content ./x.csv -TotalCount 3", "Peek at a file"], ["Import-Csv ./x.csv", "Read it back as objects"]]
},
{
  id: "stale", seq: 5, name: "Stale accounts", tag: "FULL REPORT", title: "The inactive-accounts report",
  summary: "Everything in this sequence at once: filter, calculate, sort, export.",
  setup: "reports",
  brief: {
    what: [
      "Every tenant needs this report regularly: enabled accounts nobody has used in months. They cost licenses and are a security risk (nobody notices if they get compromised).",
      "It combines every tool from this sequence: -Filter for members, -Property for SignInActivity, Where-Object for the date test, a calculated DaysAgo column, Sort-Object, and Export-Csv. Build it one pipe at a time and look at the output after each step."
    ],
    daily: ["Monthly security hygiene", "License clean-ups", "Audits and NIS2-style evidence"],
    parts: [["$cut = (Get-Date).AddDays(-90)", "the date 90 days ago"], ["$_.SignInActivity.LastSignInDateTime -lt $cut", "signed in before that"], ["-and $_.AccountEnabled", "and still enabled"], ["Export-Csv", "hand it over"]],
    flow: [["Members", "-Filter"], ["Last sign-in", "-Property"], ["Older than 90 days", "Where-Object"], ["stale.csv", "Export-Csv"]],
    traps: [["Never signed in", "An empty LastSignInDateTime is not -lt anything. Decide separately what to do with never-used accounts."], ["Service accounts", "Some 'stale' accounts are scanners or shared logins. Check before you block."]]
  },
  watch: [
    { code: "$cut = (Get-Date).AddDays(-90)", say: "Store the cut-off date." },
    { code: "Get-MgUser -All -Filter \"userType eq 'Member'\" -Property DisplayName,AccountEnabled,SignInActivity | Where-Object { $_.AccountEnabled -and $_.SignInActivity.LastSignInDateTime -and $_.SignInActivity.LastSignInDateTime -lt $cut } | Select-Object DisplayName,@{n='DaysAgo';e={((Get-Date) - $_.SignInActivity.LastSignInDateTime).Days}} | Sort-Object DaysAgo -Descending", say: "Enabled members, signed in before the cut-off, with days ago, longest first." }
  ],
  trace: { ask: "Store the date 90 days ago in $cut.", tpl: "$cut = (Get-Date).[[AddDays]](-90)", check: { fn: (ctx) => { const v = ctx.getVar("cut"); return v instanceof Date && Math.abs(daysAgo(v) - 90) <= 1; } }, wrong: "Which method moves a date by days?" },
  traceHints: ["Dates have Add... methods.", "Days, with a minus number to go back.", "AddD___", "Answer: AddDays"],
  recall: { ask: "Export enabled members who have not signed in for more than 90 days to stale.csv, with DisplayName and DaysAgo, longest first.", setup: "reports", check: { fn: (ctx) => { const c = csvRows(ctx, "stale.csv"); if (!c || c.head !== "\"DisplayName\",\"DaysAgo\"") return false; const nums = c.rows.map((r) => +r.split(",")[1].replace(/"/g, "")); return c.rows.length >= 3 && nums.every((n, i) => n > 90 && (i === 0 || n <= nums[i - 1])); } }, wrong: "Enabled, signed in, older than the cut-off, DaysAgo column, sorted, exported." },
  recallHints: ["Start with $cut.", "Filter members, request SignInActivity and AccountEnabled, test the date.", "... | Select-Object DisplayName,@{n='DaysAgo';e={...}} | Sort-Object DaysAgo -Descending | Export-Csv ./stale.csv -NoTypeInformation", "$cut = (Get-Date).AddDays(-90); Get-MgUser -All -Filter \"userType eq 'Member'\" -Property DisplayName,AccountEnabled,SignInActivity | Where-Object { $_.AccountEnabled -and $_.SignInActivity.LastSignInDateTime -and $_.SignInActivity.LastSignInDateTime -lt $cut } | Select-Object DisplayName,@{n='DaysAgo';e={((Get-Date) - $_.SignInActivity.LastSignInDateTime).Days}} | Sort-Object DaysAgo -Descending | Export-Csv ./stale.csv -NoTypeInformation"],
  real: ["Run the Watch report on your own tenant (needs AuditLog.Read.All)", "Look at the top 5 and ask: who owns these?"],
  cheat: [["$cut = (Get-Date).AddDays(-90)", "A cut-off date"], ["Where-Object { $_.SignInActivity.LastSignInDateTime -lt $cut }", "Older than the cut-off"]]
},
{
  id: "importcsv", seq: 6, name: "Import-Csv", tag: "READ THE TICKET FILE", title: "Read a CSV someone sent you",
  summary: "Every column becomes a property, every row an object.",
  setup: "bulk",
  brief: {
    what: [
      "Bulk tickets arrive as a spreadsheet: \"please move these 6 people\", \"create these 3 new hires\". Saved as CSV, <b>Import-Csv</b> turns it into objects: each row is an object, each column header a property.",
      "Look before you loop. <b>Get-ChildItem</b> shows the files. <b>Get-Content</b> shows the raw text. <b>Import-Csv</b> shows the objects. <b>.Count</b> checks that the number of rows matches the ticket."
    ],
    daily: ["HR's list of new hires", "Department moves after a reorganisation", "Leaver lists"],
    parts: [["cd ~/Downloads", "go to the folder (Set-Location)"], ["Get-ChildItem", "which files are here"], ["Import-Csv ./deptmoves.csv", "rows as objects"], ["$rows = Import-Csv ...", "keep them in a variable"], ["$rows[0]", "the first row"], ["$rows.UPN", "one column from every row"]],
    flow: [["CSV file", "from HR"], ["Import-Csv", "objects"], ["$rows", "stored"], ["Check", "count + first row"]],
    traps: [["Where am I?", "The prompt shows your folder. HR files land in ~/Downloads; ./x.csv only works when you are in that folder. Use cd, or the full path ~/Downloads/x.csv."], ["ls is not Get-ChildItem on a Mac", "In pwsh on macOS, ls and cat run the real Mac programs and print plain text. Get-ChildItem and Get-Content give you objects."], ["Everything is text", "Values from a CSV are strings. 'False' is text, and text counts as true. Compare with -eq 'False'."], ["Header names", "The property names are exactly the headers. A header 'E-mail' becomes $_.'E-mail'."], ["Typos in the data", "The CSV is someone else's typing. Expect typos and plan for them."]]
  },
  watch: [
    { code: "Get-Location", say: "The lab put you in Downloads, where HR's files land. The prompt shows it too." },
    { code: "Get-ChildItem", say: "Three ticket files are waiting." },
    { code: "Get-Content ./deptmoves.csv", say: "The raw text: a header and six rows." },
    { code: "$rows = Import-Csv ./deptmoves.csv", say: "Import into a variable." },
    { code: "$rows", say: "Objects with UPN and Department properties." },
    { code: "$rows.Count", say: "Six. Matches the ticket." }
  ],
  trace: { ask: "Import newhires.csv into $hires.", tpl: "$hires = [[Import-Csv]] ./newhires.csv", check: { fn: (ctx) => { const v = ctx.getVar("hires"); return Array.isArray(v) && v.length === 3; } }, wrong: "Which command reads a CSV into objects?" },
  traceHints: ["The opposite of Export-Csv.", "Verb Import.", "Import-___", "Answer: Import-Csv"],
  recall: { ask: "Show only the UPN column of leavers.csv, as plain values.", setup: "bulk", check: { out: "Import-Csv ./leavers.csv | Select-Object -ExpandProperty UPN" }, wrong: "Import, then expand one column." },
  recallHints: ["Import first.", "Then -ExpandProperty.", "Import-Csv ./leavers.csv | Select-Object -ExpandProperty ___", "Import-Csv ./leavers.csv | Select-Object -ExpandProperty UPN"],
  real: ["Save a small CSV from Excel to ~/Desktop", "Import-Csv ~/Desktop/<file>.csv"],
  cheat: [["Get-ChildItem", "Files in this folder"], ["$rows = Import-Csv ./x.csv", "Read a CSV"], ["$rows.Count / $rows[0] / $rows.UPN", "Check it"]]
},
{
  id: "loop", seq: 6, name: "foreach", tag: "LOOP", title: "Do something for every row",
  summary: "foreach ($r in $rows) { ... } runs your block once per row, with $r as that row.",
  setup: "bulk",
  brief: {
    what: [
      "<b>foreach ($r in $rows) { ... }</b> runs the block once for every row, with <b>$r</b> holding the current row. Inside you use <b>$r.UPN</b>, <b>$r.Department</b>: the column names.",
      "Start every loop by printing, not changing: <b>Write-Host</b> what you would do. Inside double quotes, <b>$($r.UPN)</b> puts a property into the text. When the printed list looks right, swap the Write-Host for the real command."
    ],
    daily: ["Every bulk ticket", "Applying the same change to a list", "Checking each row before acting"],
    parts: [["foreach ($r in $rows) { }", "loop over the rows"], ["$r", "the current row"], ["Write-Host \"...\"", "print a line"], ["$($r.UPN)", "a property inside a string"]],
    flow: [["$rows", "6 rows"], ["foreach", "one at a time"], ["$r", "current row"], ["Write-Host", "dry run first"]],
    traps: [["$r.UPN inside quotes", "\"$r.UPN\" prints the whole row followed by .UPN. Wrap it: \"$($r.UPN)\"."], ["ForEach-Object", "In a pipeline, ForEach-Object with $_ does the same job. foreach with a named variable is easier to read in scripts."]]
  },
  watch: [
    { code: "$rows = Import-Csv ./deptmoves.csv", say: "Rows in." },
    { code: "foreach ($r in $rows) { Write-Host \"$r.UPN\" }", say: "The quotes trap: the whole row is printed, then .UPN." },
    { code: "foreach ($r in $rows) { Write-Host \"$($r.UPN) -> $($r.Department)\" }", say: "With $(...) around each property: a clean dry run." }
  ],
  trace: { ask: "Print each new hire's DisplayName.", tpl: "$hires = Import-Csv ./newhires.csv; foreach ($h [[in]] $hires) { Write-Host \"$($h.DisplayName)\" }", check: { fn: (ctx, res) => /Nimue Clarthorn/.test(hostText(res)) && /Liriel Maewood/.test(hostText(res)) }, wrong: "The keyword between the item and the list." },
  traceHints: ["foreach (item __ list)", "Two letters.", "i_", "Answer: in"],
  recall: { ask: "Dry run for the leavers: print one line per leaver in the form 'Would block <UPN> (last day <LastDay>)'.", setup: "bulk", check: { fn: (ctx, res) => { const t = hostText(res); return /Would block ludovar\.kerr@\S+ \(last day 2026-11-14\)/.test(t) && /Would block isra\.corvane@\S+ \(last day 2026-11-17\)/.test(t); } }, wrong: "One Write-Host per row, both properties inside $()." },
  recallHints: ["Import, then foreach.", "Two properties: UPN and LastDay.", "foreach ($l in $leavers) { Write-Host \"Would block $($l.UPN) (last day $($l.LastDay))\" }", "$leavers = Import-Csv ./leavers.csv; foreach ($l in $leavers) { Write-Host \"Would block $($l.UPN) (last day $($l.LastDay))\" }"],
  real: ["foreach ($n in 1,2,3) { Write-Host \"Item $n\" }"],
  cheat: [["foreach ($r in $rows) { Write-Host \"$($r.UPN)\" }", "Loop + dry run"], ["$rows | ForEach-Object { $_.UPN }", "Pipeline version"]]
},
{
  id: "bulkwhatif", seq: 6, name: "Bulk with -WhatIf", tag: "REHEARSE", title: "Rehearse the whole batch, then run it",
  summary: "Put the real command in the loop with -WhatIf, read every line, then remove -WhatIf.",
  setup: "bulk",
  brief: {
    what: [
      "After the Write-Host dry run, the next safety step is the real command with <b>-WhatIf</b> inside the loop. PowerShell walks the whole list and tells you what it would do, row by row, and changes nothing.",
      "When a row is bad (a typo in a UPN), a normal error does not stop the loop. It prints red and goes on with the next row. That is useful for -WhatIf runs, and dangerous for real ones. Next memory: handling it properly."
    ],
    daily: ["Every bulk change, before running it for real", "Showing a manager what will happen"],
    parts: [["Update-MgUser ... -WhatIf", "describe, don't change"], ["remove -WhatIf", "the real run"], ["red line, loop continues", "a non-terminating error"]],
    flow: [["Write-Host", "dry run"], ["-WhatIf", "rehearsal"], ["Real run", "no -WhatIf"], ["Verify", "read back"]],
    traps: [["Errors keep going", "A 404 on one row prints red, then the loop continues."], ["Verify after", "Read the changed users back. The ticket is done when the data says so."]]
  },
  watch: [
    { code: "$rows = Import-Csv ./deptmoves.csv", say: "The six moves." },
    { code: "foreach ($r in $rows) { Update-MgUser -UserId $r.UPN -Department $r.Department -WhatIf }", say: "Rehearse every row. Note: -WhatIf here does not check if the user exists." },
    { code: "foreach ($r in $rows) { Update-MgUser -UserId $r.UPN -Department $r.Department }", say: "For real. One row fails with a 404: isolde.fen is a typo in the CSV. The others went through." },
    { code: "foreach ($r in $rows) { Get-MgUser -UserId $r.UPN -Property DisplayName,Department -ErrorAction SilentlyContinue | Select-Object DisplayName,Department }", say: "Verify, quietly skipping the bad row." }
  ],
  trace: { ask: "Rehearse the department moves.", tpl: "$rows = Import-Csv ./deptmoves.csv; foreach ($r in $rows) { Update-MgUser -UserId $r.UPN -Department $r.Department [[-WhatIf]] }", check: { fn: (ctx, res) => res.host.filter((h) => /What if/.test(h.text || "")).length === 6 && userOf(ctx, "brannoc.vale").Department === "Sales" }, wrong: "Rehearse, don't change." },
  traceHints: ["The rehearsal switch.", "What if...", "-W_____", "Answer: -WhatIf"],
  recall: { ask: "Apply the department moves from deptmoves.csv for real. One row will fail; that is expected for now.", setup: "bulk", check: { fn: (ctx) => userOf(ctx, "brannoc.vale").Department === "Marketing" && userOf(ctx, "maelis.grey").Department === "Sales" && userOf(ctx, "torin.ash").Department === "Logistics" && userOf(ctx, "petrel.lindgrove").Department === "Marketing" && userOf(ctx, "kestrel.wade").Department === "IT" }, wrong: "Every valid row should have its new department." },
  recallHints: ["Import, then loop.", "Update-MgUser with two values from the row.", "foreach ($r in $rows) { Update-MgUser -UserId $r.UPN -Department $r.Department }", "$rows = Import-Csv ./deptmoves.csv; foreach ($r in $rows) { Update-MgUser -UserId $r.UPN -Department $r.Department }"],
  real: ["Only with a test CSV and -WhatIf on your tenant"],
  cheat: [["foreach ($r in $rows) { Update-MgUser -UserId $r.UPN -Department $r.Department -WhatIf }", "Rehearse a batch"]]
},
{
  id: "trycatch", seq: 6, name: "try / catch", tag: "HANDLE FAILURE", title: "Catch the bad rows, keep a list",
  summary: "-ErrorAction Stop turns a red line into something try/catch can handle.",
  setup: "bulk",
  brief: {
    what: [
      "<b>try { } catch { }</b> runs the try block, and if it throws, jumps to catch. But most cmdlet errors are <b>non-terminating</b>: they print red and do not throw, so catch never runs. Add <b>-ErrorAction Stop</b> to the command to make its errors catchable.",
      "In catch, <b>$_</b> is the error and <b>$_.Exception.Message</b> its text. The pattern for bulk work: collect failures in a list (<b>$failed += $r.UPN</b>) and report them at the end, instead of scrolling back through red text."
    ],
    daily: ["Every serious bulk script", "Reporting back which rows failed and why", "Retrying only the failures"],
    parts: [["try { ... -ErrorAction Stop }", "attempt, and make errors throw"], ["catch { ... }", "runs only on failure"], ["$_.Exception.Message", "what went wrong"], ["$failed = @(); $failed += $x", "collect failures"]],
    flow: [["Row", "try"], ["Success", "next row"], ["Failure", "catch"], ["$failed", "report at the end"]],
    traps: [["No -ErrorAction Stop", "catch never runs for normal cmdlet errors."], ["Start the list empty", "$failed = @() before the loop, or it keeps last run's values."]]
  },
  watch: [
    { code: "try { Get-MgUser -UserId isolde.fen@" + DOMAIN + " } catch { Write-Host \"Caught it\" }", say: "No -ErrorAction Stop: red text, and catch never ran." },
    { code: "try { Get-MgUser -UserId isolde.fen@" + DOMAIN + " -ErrorAction Stop } catch { Write-Host \"Caught: $($_.Exception.Message)\" }", say: "With Stop, catch runs and you hold the message." },
    { code: "$rows = Import-Csv ./deptmoves.csv; $failed = @(); foreach ($r in $rows) { try { Update-MgUser -UserId $r.UPN -Department $r.Department -ErrorAction Stop } catch { $failed += $r.UPN } }; $failed", say: "The full pattern: five succeed silently, the one failure lands in $failed." }
  ],
  trace: { ask: "Make the error catchable.", tpl: "try { Get-MgUser -UserId isolde.fen@" + DOMAIN + " -ErrorAction [[Stop]] } catch { Write-Host \"Not found\" }", check: { fn: (ctx, res) => /Not found/.test(hostText(res)) }, wrong: "Which ErrorAction makes errors throw?" },
  traceHints: ["Continue, SilentlyContinue, Stop...", "The one that halts the command.", "S___", "Answer: Stop"],
  recall: { ask: "Apply deptmoves.csv with try/catch. Collect every failed UPN in $failed, then show $failed.", setup: "bulk", check: { fn: (ctx, res) => { const f = ctx.getVar("failed"); const l = Array.isArray(f) ? f : f ? [f] : []; return l.length === 1 && /isolde\.fen@/.test(String(l[0])) && userOf(ctx, "brannoc.vale").Department === "Marketing" && res.out.some((o) => /isolde\.fen@/.test(String(o))); } }, wrong: "$failed should hold exactly the typo row, and the others should be applied." },
  recallHints: ["$failed = @() first.", "Inside the loop: try { ... -ErrorAction Stop } catch { $failed += $r.UPN }", "... then type $failed on its own.", "$rows = Import-Csv ./deptmoves.csv; $failed = @(); foreach ($r in $rows) { try { Update-MgUser -UserId $r.UPN -Department $r.Department -ErrorAction Stop } catch { $failed += $r.UPN } }; $failed"],
  real: ["try { Get-MgUser -UserId nobody@<yourdomain> -ErrorAction Stop } catch { $_.Exception.Message }"],
  cheat: [["try { X -ErrorAction Stop } catch { $_.Exception.Message }", "Catch an error"], ["$failed = @(); ... catch { $failed += $r.UPN }", "Collect failures"]]
},
{
  id: "splat", seq: 6, name: "Splatting", tag: "READABLE PARAMETERS", title: "Pass parameters as a hashtable",
  summary: "@params instead of one endless line: readable, reusable, easy to build per row.",
  setup: "bulk",
  brief: {
    what: [
      "<b>Splatting</b> passes parameters from a hashtable: build <b>$p = @{ UserId = 'x'; Department = 'Sales' }</b>, then call <b>Update-MgUser @p</b> with an @ instead of a $. Each key becomes a parameter.",
      "It makes long commands like New-MgUser readable, and in a loop you build the hashtable from the row's columns. Switches go in as <b>Name = $true</b>."
    ],
    daily: ["New-MgUser with eight parameters", "Shared settings reused across calls", "Building parameters from CSV columns"],
    parts: [["$p = @{ Key = value; ... }", "the parameters"], ["Update-MgUser @p", "@ not $: splat it"], ["AccountEnabled = $true", "a switch inside a splat"]],
    flow: [["Row", "columns"], ["Hashtable", "keys = parameter names"], ["@p", "splat"], ["Command", "runs"]],
    traps: [["$p vs @p", "Update-MgUser $p passes the whole hashtable as one positional value and fails. Use @p."], ["Key names", "Keys must be real parameter names. A wrong key gives: A parameter cannot be found that matches parameter name."]]
  },
  watch: [
    { code: "$p = @{ UserId = '" + U("elowen.thistle") + "'; Property = 'DisplayName','Department' }", say: "Build the parameters." },
    { code: "Get-MgUser @p | Select-Object DisplayName,Department", say: "Splat them with @." },
    { code: "$hires = Import-Csv ./newhires.csv; foreach ($h in $hires) { $p = @{ DisplayName = $h.DisplayName; UserPrincipalName = $h.UPN; MailNickname = $h.MailNickname; Department = $h.Department; JobTitle = $h.JobTitle; UsageLocation = 'BE'; AccountEnabled = $true; PasswordProfile = @{ Password = 'Halvard-Start-2026!'; ForceChangePasswordNextSignIn = $true } }; New-MgUser @p | Select-Object DisplayName,UserPrincipalName }", say: "The big one: three new hires from a CSV, one readable hashtable per row." }
  ],
  trace: { ask: "Splat the prepared parameters.", tpl: "$p = @{ UserId = '" + U("corvin.ashby") + "'; JobTitle = 'Key Account Manager' }; Update-MgUser [[@p]]", check: { fn: (ctx) => userOf(ctx, "corvin.ashby").JobTitle === "Key Account Manager" }, wrong: "Splat with @, not $." },
  traceHints: ["Not $p.", "The splat character.", "@_", "Answer: @p"],
  recall: { ask: "Create the three people in newhires.csv using a splat per row: all CSV columns, usage location BE, enabled, with a password they must change.", setup: "bulk", check: { fn: (ctx) => ["nimue.clarthorn", "tamlin.jaspermoor", "liriel.maewood"].every((n) => { const u = userOf(ctx, n); return u && u.UsageLocation === "BE" && u.AccountEnabled && u.Department && u.JobTitle; }) }, wrong: "All three, with department, title, BE and enabled." },
  recallHints: ["Import, loop, build $p from $h.", "Keys: DisplayName, UserPrincipalName, MailNickname, Department, JobTitle, UsageLocation, AccountEnabled, PasswordProfile.", "foreach ($h in $hires) { $p = @{ ... }; New-MgUser @p }", "$hires = Import-Csv ./newhires.csv; foreach ($h in $hires) { $p = @{ DisplayName = $h.DisplayName; UserPrincipalName = $h.UPN; MailNickname = $h.MailNickname; Department = $h.Department; JobTitle = $h.JobTitle; UsageLocation = 'BE'; AccountEnabled = $true; PasswordProfile = @{ Password = 'Halvard-Start-2026!'; ForceChangePasswordNextSignIn = $true } }; New-MgUser @p }"],
  real: ["$p = @{ UserId = '<you>'; Property = 'DisplayName','Department' }; Get-MgUser @p"],
  cheat: [["$p = @{ UserId = 'x'; Department = 'Sales' }; Update-MgUser @p", "Splatting"], ["AccountEnabled = $true", "A switch in a splat"]]
},
{
  id: "transcript", seq: 6, name: "Start-Transcript", tag: "KEEP A RECORD", title: "Log everything a bulk run does",
  summary: "Start-Transcript records every command and its output to a file. Your proof of what happened.",
  setup: "bulk",
  brief: {
    what: [
      "<b>Start-Transcript -Path ./run.log</b> records everything from that moment: every command you type and everything it prints, errors included. <b>Stop-Transcript</b> closes the file.",
      "For bulk changes this is your evidence: what ran, when, and what the tenant answered. It is also how you find out afterwards which row failed at 23:40."
    ],
    daily: ["Every bulk change", "Changes done outside office hours", "Anything an auditor might ask about"],
    parts: [["Start-Transcript -Path ./leavers.log", "start recording"], ["... the work ...", "all recorded"], ["Stop-Transcript", "close the file"], ["Get-Content ./leavers.log", "read it back"]],
    flow: [["Start-Transcript", "file opens"], ["Bulk work", "recorded"], ["Stop-Transcript", "file closes"], ["Log", "evidence"]],
    traps: [["Already started", "Starting twice fails: Transcription has already been started."], ["Forgetting to stop", "The file only gets its end marker at Stop-Transcript."]]
  },
  watch: [
    { code: "Start-Transcript -Path ./demo.log", say: "Start recording." },
    { code: "Get-MgUser -UserId " + U("ludovar.kerr") + " -Property DisplayName,AccountEnabled | Select-Object DisplayName,AccountEnabled", say: "Some work..." },
    { code: "Stop-Transcript", say: "Stop." },
    { code: "Get-Content ./demo.log", say: "Header, the command, its output, end marker." }
  ],
  trace: { ask: "Start a transcript to work.log.", tpl: "[[Start-Transcript]] -Path ./work.log", check: { fn: (ctx) => !!ctx.transcript && /work\.log$/.test(ctx.transcript.path) }, wrong: "Which command starts recording?" },
  traceHints: ["Verb Start.", "Noun Transcript.", "Start-__________", "Answer: Start-Transcript"],
  recall: { ask: "Process leavers.csv properly: transcript to ./leavers.log, then for every leaver block sign-in and revoke sessions, then stop the transcript.", setup: "bulk", check: { fn: (ctx) => { const t = fsText(ctx, "leavers.log"); return !ctx.transcript && !!t && /transcript end/.test(t) && ["ludovar.kerr", "bastian.cranefeather", "isra.corvane"].every((n) => { const r = ctx.t.revoked[U(n)]; return userOf(ctx, n).AccountEnabled === false && !!r && r.afterBlock; }); } }, wrong: "Transcript around the loop, block then revoke for each, transcript stopped." },
  recallHints: ["Three parts: start, loop, stop.", "In the loop: Update-MgUser -AccountEnabled:$false, then Revoke-MgUserSignInSession.", "Start-Transcript -Path ./leavers.log; foreach ($l in $leavers) { ...; ... }; Stop-Transcript", "Start-Transcript -Path ./leavers.log; $leavers = Import-Csv ./leavers.csv; foreach ($l in $leavers) { Update-MgUser -UserId $l.UPN -AccountEnabled:$false; Revoke-MgUserSignInSession -UserId $l.UPN }; Stop-Transcript"],
  real: ["Start-Transcript -Path ~/Desktop/test.log", "Get-Date", "Stop-Transcript", "open ~/Desktop/test.log"],
  cheat: [["Start-Transcript -Path ./run.log", "Start recording"], ["Stop-Transcript", "Stop recording"]]
}
);

Object.assign(DRILLS, {
  where: [
    { q: "Everyone whose title contains Technician.", out: "Get-MgUser -All -Property DisplayName,JobTitle | Where-Object { $_.JobTitle -like '*Technician*' } | Select-Object DisplayName,JobTitle", hint: "-like '*Technician*'" },
    { q: "Enabled people in Legal (DisplayName only).", out: "Get-MgUser -All -Property DisplayName,Department,AccountEnabled | Where-Object { $_.AccountEnabled -and $_.Department -eq 'Legal' } | Select-Object DisplayName", hint: "Two conditions." },
    { q: "Everyone whose surname starts with S (DisplayName, Surname).", out: "Get-MgUser -All -Property DisplayName,Surname | Where-Object { $_.Surname -like 'S*' } | Select-Object DisplayName,Surname", hint: "Surname -like 'S*'" },
    { q: "People in IT or HR (DisplayName, Department).", out: "Get-MgUser -All -Property DisplayName,Department | Where-Object { $_.Department -eq 'IT' -or $_.Department -eq 'HR' } | Select-Object DisplayName,Department", hint: "-or" },
    { q: "Enabled people in Bruges who are not in Operations (DisplayName, Department).", out: "Get-MgUser -All -Property DisplayName,Department,City,AccountEnabled | Where-Object { $_.AccountEnabled -and $_.City -eq 'Bruges' -and $_.Department -ne 'Operations' } | Select-Object DisplayName,Department", hint: "Three conditions, one with -ne." },
    { q: "Display names containing a double letter like 'll' or 'nn' (regex (.)\\1).", out: "Get-MgUser -All -Property DisplayName | Where-Object { $_.DisplayName -match '(.)\\1' } | Select-Object DisplayName", hint: "-match '(.)\\1'" }
  ],
  selsort: [
    { q: "The 3 newest accounts (DisplayName, CreatedDateTime).", out: "Get-MgUser -All -Property DisplayName,CreatedDateTime | Sort-Object CreatedDateTime -Descending | Select-Object -First 3 DisplayName,CreatedDateTime", hint: "-Descending, -First 3" },
    { q: "Every distinct job title once, alphabetical.", out: "Get-MgUser -All -Property JobTitle | Sort-Object JobTitle | Select-Object JobTitle -Unique", hint: "Sort, then -Unique" },
    { q: "Sales people sorted by DisplayName, plain DisplayName values.", out: "Get-MgUser -Filter \"department eq 'Sales'\" | Sort-Object DisplayName | Select-Object -ExpandProperty DisplayName", hint: "-ExpandProperty DisplayName" },
    { q: "The last 2 users alphabetically by DisplayName.", out: "Get-MgUser -All | Sort-Object DisplayName | Select-Object -Last 2", hint: "-Last 2" },
    { q: "Sort Operations people by City, then DisplayName (show both).", out: "Get-MgUser -Filter \"department eq 'Operations'\" -Property DisplayName,City | Sort-Object City,DisplayName | Select-Object City,DisplayName", hint: "Sort-Object City,DisplayName" }
  ],
  groupmeasure: [
    { q: "Users per city (Name, Count), biggest first.", out: "Get-MgUser -All -Property City | Group-Object City | Sort-Object Count -Descending | Select-Object Name,Count", hint: "Group, Sort Count -Descending" },
    { q: "Members vs guests: count per UserType.", out: "Get-MgUser -All -Property UserType | Group-Object UserType | Select-Object Name,Count", hint: "Group-Object UserType" },
    { q: "Total prepaid seats across all SKUs (Measure-Object, Sum).", out: "Get-MgSubscribedSku | ForEach-Object { $_.PrepaidUnits.Enabled } | Measure-Object -Sum", hint: "Pull the number out with ForEach-Object, then Measure-Object -Sum" },
    { q: "Job titles in Operations with how many people hold each.", out: "Get-MgUser -Filter \"department eq 'Operations'\" -Property JobTitle | Group-Object JobTitle | Select-Object Name,Count", hint: "Filter, then group on JobTitle" },
    { q: "The largest ConsumedUnits of any SKU (Measure-Object -Maximum).", out: "Get-MgSubscribedSku | Measure-Object -Property ConsumedUnits -Maximum", hint: "-Maximum" }
  ],
  calc: [
    { q: "Each SKU with Bought and Used columns (Used = ConsumedUnits).", out: "Get-MgSubscribedSku | Select-Object SkuPartNumber,@{n='Bought';e={$_.PrepaidUnits.Enabled}},@{n='Used';e={$_.ConsumedUnits}}", hint: "Two calculated columns." },
    { q: "Finance people with DisplayName and a column Upper holding the name in capitals.", out: "Get-MgUser -Filter \"department eq 'Finance'\" | Select-Object DisplayName,@{n='Upper';e={$_.DisplayName.ToUpper()}}", hint: ".ToUpper()" },
    { q: "Everyone with DisplayName and Status Enabled/Disabled, only the disabled ones shown.", out: "Get-MgUser -All -Property DisplayName,AccountEnabled | Select-Object DisplayName,@{n='Status';e={ if ($_.AccountEnabled) { 'Enabled' } else { 'Disabled' } }} | Where-Object { $_.Status -eq 'Disabled' }", hint: "Calculate, then filter on your own column." },
    { q: "IT people with DisplayName and a column Domain holding only the part after the @ of their UPN.", out: "Get-MgUser -Filter \"department eq 'IT'\" | Select-Object DisplayName,@{n='Domain';e={$_.UserPrincipalName.Split('@')[1]}}", hint: ".Split('@')[1]" },
    { q: "Members with DisplayName and AgeDays: days since their account was created, oldest first, top 3.", out: "Get-MgUser -All -Filter \"userType eq 'Member'\" -Property DisplayName,CreatedDateTime | Select-Object DisplayName,@{n='AgeDays';e={((Get-Date) - $_.CreatedDateTime).Days}} | Sort-Object AgeDays -Descending | Select-Object -First 3", hint: "Same shape as DaysAgo, on CreatedDateTime." }
  ],
  export: [
    { q: "Export the Sales team (DisplayName, JobTitle) to sales.csv.", fn: (ctx) => { const c = csvRows(ctx, "sales.csv"); return !!c && c.head === "\"DisplayName\",\"JobTitle\"" && c.rows.length === 8; }, sol: ["Get-MgUser -Filter \"department eq 'Sales'\" -Property DisplayName,JobTitle | Select-Object DisplayName,JobTitle | Export-Csv ./sales.csv -NoTypeInformation"], hint: "Request, select, export." },
    { q: "Export the SKU report with a Free column to licenses.csv.", fn: (ctx) => { const c = csvRows(ctx, "licenses.csv"); return !!c && /"Free"/.test(c.head) && c.rows.length === 5; }, sol: ["Get-MgSubscribedSku | Select-Object SkuPartNumber,@{n='Free';e={$_.PrepaidUnits.Enabled - $_.ConsumedUnits}} | Export-Csv ./licenses.csv -NoTypeInformation"], hint: "Calculated column, then export." },
    { q: "You are on your Desktop. Peek at the first 3 lines of deptmoves.csv, which HR put in your Downloads folder.", out: "Get-Content ~/Downloads/deptmoves.csv -TotalCount 3", hint: "~/Downloads/deptmoves.csv" },
    { q: "Excel on your Belgian Mac wants semicolons. Export the Sales team (DisplayName, JobTitle) to sales-excel.csv so it opens in proper columns.", fn: (ctx) => { const c = csvRows(ctx, "sales-excel.csv"); return !!c && c.head === "\"DisplayName\";\"JobTitle\"" && c.rows.length === 8; }, sol: ["Get-MgUser -Filter \"department eq 'Sales'\" -Property DisplayName,JobTitle | Select-Object DisplayName,JobTitle | Export-Csv ./sales-excel.csv -NoTypeInformation -Delimiter ';'"], hint: "-Delimiter ';' (or -UseCulture)" },
    { q: "Make a folder called reports on your Desktop and export the guests (DisplayName, UserPrincipalName) to guests.csv inside it.", fn: (ctx) => { const x = ctx.fs["/Users/veyra/Desktop/reports/guests.csv"]; return !!x && x.text.split("\n").filter(Boolean).length === 4; }, sol: ["mkdir reports", "Get-MgUser -All -Filter \"userType eq 'Guest'\" | Select-Object DisplayName,UserPrincipalName | Export-Csv ./reports/guests.csv -NoTypeInformation"], hint: "mkdir reports, then ./reports/guests.csv" },
    { q: "Append Hesper Reedmire (DisplayName, JobTitle) to sales.csv after exporting Sales to it.", fn: (ctx) => { const c = csvRows(ctx, "sales.csv"); return !!c && c.rows.length === 9 && c.rows.some((r) => /Hesper Reedmire/.test(r)); }, sol: ["Get-MgUser -Filter \"department eq 'Sales'\" -Property DisplayName,JobTitle | Select-Object DisplayName,JobTitle | Export-Csv ./sales.csv -NoTypeInformation", "Get-MgUser -UserId " + U("hesper.reedmire") + " -Property DisplayName,JobTitle | Select-Object DisplayName,JobTitle | Export-Csv ./sales.csv -NoTypeInformation -Append"], hint: "-Append" },
    { q: "Export the guests (DisplayName, UserPrincipalName) to guests.csv, then read it back with Import-Csv.", fn: (ctx, res) => { const c = csvRows(ctx, "guests.csv"); return !!c && c.rows.length === 3 && res.out.length === 3 && !!res.out[0].DisplayName; }, sol: ["Get-MgUser -All -Filter \"userType eq 'Guest'\" | Select-Object DisplayName,UserPrincipalName | Export-Csv ./guests.csv -NoTypeInformation", "Import-Csv ./guests.csv"], hint: "Export, then Import-Csv." }
  ],
  stale: [
    { q: "Store the date 30 days ago in $cut30.", fn: (ctx) => { const v = ctx.getVar("cut30"); return v instanceof Date && Math.abs(daysAgo(v) - 30) <= 1; }, sol: ["$cut30 = (Get-Date).AddDays(-30)"], hint: "AddDays(-30)" },
    { q: "Members who never signed in (DisplayName).", out: "Get-MgUser -All -Filter \"userType eq 'Member'\" -Property DisplayName,SignInActivity | Where-Object { -not $_.SignInActivity.LastSignInDateTime } | Select-Object DisplayName", hint: "-not on the date." },
    { q: "Guests not seen for over 180 days (DisplayName, DaysAgo).", out: "$c = (Get-Date).AddDays(-180); Get-MgUser -All -Filter \"userType eq 'Guest'\" -Property DisplayName,SignInActivity | Where-Object { $_.SignInActivity.LastSignInDateTime -and $_.SignInActivity.LastSignInDateTime -lt $c } | Select-Object DisplayName,@{n='DaysAgo';e={((Get-Date) - $_.SignInActivity.LastSignInDateTime).Days}}", hint: "Same report, guests, 180 days." },
    { q: "How many enabled members have not signed in for more than 90 days? One number.", fn: (ctx, res) => { const cut = Date.now() - 90 * 864e5; const n = ctx.t.users.filter((u) => u.UserType === "Member" && u.AccountEnabled && u.SignInActivity.LastSignInDateTime && u.SignInActivity.LastSignInDateTime.getTime() < cut).length; return res.out.length === 1 && (res.out[0] === n || (res.out[0] && res.out[0].Count === n)); }, sol: ["$cut = (Get-Date).AddDays(-90); (Get-MgUser -All -Filter \"userType eq 'Member'\" -Property AccountEnabled,SignInActivity | Where-Object { $_.AccountEnabled -and $_.SignInActivity.LastSignInDateTime -and $_.SignInActivity.LastSignInDateTime -lt $cut }).Count"], hint: "Wrap the filtered pipeline in ( ).Count" },
    { q: "Stale report with Department too: DisplayName, Department, DaysAgo for enabled members over 90 days, longest first.", out: "$cut = (Get-Date).AddDays(-90); Get-MgUser -All -Filter \"userType eq 'Member'\" -Property DisplayName,Department,AccountEnabled,SignInActivity | Where-Object { $_.AccountEnabled -and $_.SignInActivity.LastSignInDateTime -and $_.SignInActivity.LastSignInDateTime -lt $cut } | Select-Object DisplayName,Department,@{n='DaysAgo';e={((Get-Date) - $_.SignInActivity.LastSignInDateTime).Days}} | Sort-Object DaysAgo -Descending", hint: "Add Department to -Property and Select-Object." }
  ],
  importcsv: [
    { q: "List the files in the current folder.", out: "Get-ChildItem", hint: "Get-ChildItem" },
    { q: "Where are you right now? Show your location.", out: "Get-Location", hint: "Get-Location (or pwd)" },
    { q: "Go to your Desktop, then jump straight back to where you were.", fn: (ctx, res, hist) => ctx.cwd === "/Users/veyra/Downloads" && hist.some((h) => /^\s*(cd|set-location|sl)\s+~\/desktop/i.test(h)) && hist.some((h) => /^\s*(cd|set-location)\s+-\s*$/i.test(h)), sol: ["cd ~/Desktop", "cd -"], hint: "cd -" },
    { q: "Without leaving Downloads, list what is in your Documents folder.", out: "Get-ChildItem ~/Documents", hint: "Get-ChildItem with a path" },
    { q: "The previous admin left a note in Documents. Read it.", out: "Get-Content ~/Documents/halvard-handover.txt", hint: "Get-Content ~/Documents/<file>" },
    { q: "How many rows does newhires.csv have?", out: "(Import-Csv ./newhires.csv).Count", hint: "(Import-Csv ...).Count" },
    { q: "Show only the first row of deptmoves.csv.", out: "(Import-Csv ./deptmoves.csv)[0]", hint: "[0]" },
    { q: "Show the raw text of leavers.csv.", out: "Get-Content ./leavers.csv", hint: "Get-Content" },
    { q: "Which new hires go to Marketing? (Import, then filter on Department)", out: "Import-Csv ./newhires.csv | Where-Object { $_.Department -eq 'Marketing' }", hint: "Where-Object on the CSV column." }
  ],
  loop: [
    { q: "Print 'Hello <DisplayName>' for every new hire.", fn: (ctx, res) => /Hello Nimue Clarthorn/.test(hostText(res)) && /Hello Tamlin Jaspermoor/.test(hostText(res)) && /Hello Liriel Maewood/.test(hostText(res)), sol: ["$hires = Import-Csv ./newhires.csv; foreach ($h in $hires) { Write-Host \"Hello $($h.DisplayName)\" }"], hint: "\"Hello $($h.DisplayName)\"" },
    { q: "Try printing \"$r.UPN\" (without $()) for each deptmoves row, look at the output, then do it right.", fn: (ctx, res) => /^brannoc\.vale@/m.test(hostText(res)), sol: ["$rows = Import-Csv ./deptmoves.csv; foreach ($r in $rows) { Write-Host \"$r.UPN\" }", "foreach ($r in $rows) { Write-Host \"$($r.UPN)\" }"], hint: "$($r.UPN)" },
    { q: "Same as above but with ForEach-Object and $_: print each leaver's UPN.", fn: (ctx, res) => res.out.length === 3 && /ludovar\.kerr@/.test(String(res.out[0])), sol: ["Import-Csv ./leavers.csv | ForEach-Object { $_.UPN }"], hint: "Import-Csv ... | ForEach-Object { $_.UPN }" },
    { q: "For each deptmoves row, look up the user's current department and print 'UPN: current -> new' (the typo row may show an error).", fn: (ctx, res) => /brannoc\.vale@\S+: Sales -> Marketing/.test(hostText(res)), sol: ["$rows = Import-Csv ./deptmoves.csv; foreach ($r in $rows) { $u = Get-MgUser -UserId $r.UPN -Property Department -ErrorAction SilentlyContinue; Write-Host \"$($r.UPN): $($u.Department) -> $($r.Department)\" }"], hint: "Get-MgUser inside the loop, store it in $u." },
    { q: "Count with a loop: start $n = 0, add 1 for every new hire in Sales, then show $n.", fn: (ctx, res) => res.out.length === 1 && res.out[0] === 1, sol: ["$n = 0; foreach ($h in Import-Csv ./newhires.csv) { if ($h.Department -eq 'Sales') { $n++ } }; $n"], hint: "if inside the loop, $n++" }
  ],
  bulkwhatif: [
    { q: "Rehearse blocking every leaver with -WhatIf.", fn: (ctx, res) => res.host.filter((h) => /What if/.test(h.text || "")).length === 3 && userOf(ctx, "ludovar.kerr").AccountEnabled === true, sol: ["$leavers = Import-Csv ./leavers.csv; foreach ($l in $leavers) { Update-MgUser -UserId $l.UPN -AccountEnabled:$false -WhatIf }"], hint: "-AccountEnabled:$false -WhatIf inside the loop." },
    { q: "Everyone in deptmoves.csv moves to the new office: set OfficeLocation 'Bruges HQ' for each (rehearse first if you like). The typo row will fail.", fn: (ctx) => ["brannoc.vale", "maelis.grey", "torin.ash", "petrel.lindgrove", "kestrel.wade"].every((n) => userOf(ctx, n).OfficeLocation === "Bruges HQ"), sol: ["$rows = Import-Csv ./deptmoves.csv; foreach ($r in $rows) { Update-MgUser -UserId $r.UPN -OfficeLocation 'Bruges HQ' }"], hint: "Update-MgUser -OfficeLocation 'Bruges HQ' in the loop." },
    { q: "After applying deptmoves.csv, verify: show DisplayName and Department of each valid row, skipping the bad one quietly.", fn: (ctx, res) => res.out.length === 5 && res.out.some((o) => o && o.DisplayName === "Brannoc Vale" && o.Department === "Marketing"), sol: ["$rows = Import-Csv ./deptmoves.csv; foreach ($r in $rows) { Update-MgUser -UserId $r.UPN -Department $r.Department }", "foreach ($r in $rows) { Get-MgUser -UserId $r.UPN -Property DisplayName,Department -ErrorAction SilentlyContinue | Select-Object DisplayName,Department }"], hint: "-ErrorAction SilentlyContinue" },
    { q: "Rehearse setting JobTitle 'Sales' for everyone in the Sales department with -WhatIf. Loop over the Get-MgUser -Filter results.", fn: (ctx, res) => res.host.filter((h) => /What if/.test(h.text || "")).length === 8, sol: ["$s = Get-MgUser -Filter \"department eq 'Sales'\"; foreach ($u in $s) { Update-MgUser -UserId $u.Id -JobTitle Sales -WhatIf }"], hint: "Loop over Get-MgUser results, use $u.Id." },
    { q: "The CSV row isolde.fen was a typo for isolde.fenn. Apply her move to Legal with the correct UPN.", fn: (ctx, res, hist) => userOf(ctx, "isolde.fenn").Department === "Legal" && hist.some((h) => /isolde\.fenn@/i.test(h)), sol: ["Update-MgUser -UserId " + U("isolde.fenn") + " -Department Legal"], hint: "Two n's." }
  ],
  trycatch: [
    { q: "Catch a 404: look up isolde.fen@... and print 'Missing' when it fails.", fn: (ctx, res) => /Missing/.test(hostText(res)), sol: ["try { Get-MgUser -UserId isolde.fen@" + DOMAIN + " -ErrorAction Stop } catch { Write-Host \"Missing\" }"], hint: "-ErrorAction Stop" },
    { q: "Print the error message itself for the same lookup.", fn: (ctx, res) => /does not exist/.test(hostText(res)) || res.out.some((o) => /does not exist/.test(String(o))), sol: ["try { Get-MgUser -UserId isolde.fen@" + DOMAIN + " -ErrorAction Stop } catch { $_.Exception.Message }"], hint: "$_.Exception.Message" },
    { q: "Try/catch without -ErrorAction Stop: see that catch does NOT run (print 'Caught' in catch).", fn: (ctx, res) => !/Caught/.test(hostText(res)) && res.host.some((h) => h.err), sol: ["try { Get-MgUser -UserId isolde.fen@" + DOMAIN + " } catch { Write-Host \"Caught\" }"], hint: "Just leave the Stop out and watch." },
    { q: "Block every leaver with try/catch, collecting failures in $failed, then show $failed.Count (0 is the answer).", fn: (ctx, res) => ["ludovar.kerr", "bastian.cranefeather", "isra.corvane"].every((n) => userOf(ctx, n).AccountEnabled === false) && res.out.length === 1 && res.out[0] === 0, sol: ["$failed = @(); foreach ($l in Import-Csv ./leavers.csv) { try { Update-MgUser -UserId $l.UPN -AccountEnabled:$false -ErrorAction Stop } catch { $failed += $l.UPN } }; $failed.Count"], hint: "$failed.Count at the end." },
    { q: "Apply deptmoves.csv with try/catch, printing 'OK <UPN>' on success and 'FAIL <UPN>' on failure.", fn: (ctx, res) => { const t = hostText(res); return /OK brannoc\.vale@/.test(t) && /FAIL isolde\.fen@/.test(t); }, sol: ["foreach ($r in Import-Csv ./deptmoves.csv) { try { Update-MgUser -UserId $r.UPN -Department $r.Department -ErrorAction Stop; Write-Host \"OK $($r.UPN)\" } catch { Write-Host \"FAIL $($r.UPN)\" } }"], hint: "Write-Host after the command inside try runs only when it worked." }
  ],
  splat: [
    { q: "Splat Get-MgUser for Hesper Reedmire with Property DisplayName,JobTitle and show those two.", out: "$p = @{ UserId = '" + U("hesper.reedmire") + "'; Property = 'DisplayName','JobTitle' }; Get-MgUser @p | Select-Object DisplayName,JobTitle", hint: "@{ UserId = ...; Property = ... }" },
    { q: "Try Update-MgUser $p (with a $) and read the error. Then do it right: JobTitle 'Payroll Lead' for Ilsabet Varrow.", fn: (ctx) => userOf(ctx, "ilsabet.varrow").JobTitle === "Payroll Lead", sol: ["$p = @{ UserId = '" + U("ilsabet.varrow") + "'; JobTitle = 'Payroll Lead' }", "Update-MgUser $p", "Update-MgUser @p"], hint: "@p" },
    { q: "A wrong key: try a splat with Dept = 'Marketing' for Petrel Lindgrove, read the error, then use the right key.", fn: (ctx) => userOf(ctx, "petrel.lindgrove").Department === "Marketing", sol: ["$p = @{ UserId = '" + U("petrel.lindgrove") + "'; Dept = 'Marketing' }; Update-MgUser @p", "$p = @{ UserId = '" + U("petrel.lindgrove") + "'; Department = 'Marketing' }; Update-MgUser @p"], hint: "Keys must be real parameter names." },
    { q: "Block Ludovar Kerr with a splat (AccountEnabled = $false).", fn: (ctx) => userOf(ctx, "ludovar.kerr").AccountEnabled === false, sol: ["$p = @{ UserId = '" + U("ludovar.kerr") + "'; AccountEnabled = $false }; Update-MgUser @p"], hint: "A switch value in a splat: AccountEnabled = $false" },
    { q: "Rehearse creating Tamlin Jaspermoor from the CSV with a splat that includes WhatIf = $true.", fn: (ctx, res) => !userOf(ctx, "tamlin.jaspermoor") && res.host.some((h) => /What if/.test(h.text || "")), sol: ["$h = (Import-Csv ./newhires.csv)[1]; $p = @{ DisplayName = $h.DisplayName; UserPrincipalName = $h.UPN; MailNickname = $h.MailNickname; AccountEnabled = $true; PasswordProfile = @{ Password = 'Halvard-Start-2026!'; ForceChangePasswordNextSignIn = $true }; WhatIf = $true }; New-MgUser @p"], hint: "WhatIf = $true inside the hashtable." }
  ],
  transcript: [
    { q: "Start a transcript to audit.log, run Get-Date, stop it.", fn: (ctx) => { const t = fsText(ctx, "audit.log"); return !ctx.transcript && !!t && /Get-Date/i.test(t) && /transcript end/.test(t); }, sol: ["Start-Transcript -Path ./audit.log", "Get-Date", "Stop-Transcript"], hint: "Start, work, Stop." },
    { q: "Start a transcript twice in a row. Read the error, then stop it.", fn: (ctx, res, hist) => !ctx.transcript && hist.filter((h) => /start-transcript/i.test(h)).length >= 2, sol: ["Start-Transcript -Path ./a.log", "Start-Transcript -Path ./a.log", "Stop-Transcript"], hint: "One at a time." },
    { q: "Record the department-move rehearsal (-WhatIf) in rehearsal.log.", fn: (ctx) => { const t = fsText(ctx, "rehearsal.log"); return !ctx.transcript && !!t && /What if/.test(t); }, sol: ["Start-Transcript -Path ./rehearsal.log", "foreach ($r in Import-Csv ./deptmoves.csv) { Update-MgUser -UserId $r.UPN -Department $r.Department -WhatIf }", "Stop-Transcript"], hint: "Transcript around the -WhatIf loop." },
    { q: "Read back the last transcript you made: show demo2.log after recording Get-MgContext in it.", fn: (ctx, res) => res.out.some((o) => /Get-MgContext/i.test(String(o))), sol: ["Start-Transcript -Path ./demo2.log", "Get-MgContext", "Stop-Transcript", "Get-Content ./demo2.log"], hint: "Get-Content ./demo2.log" },
    { q: "Stop-Transcript when none is running: read the error.", fn: (ctx, res) => !!res.error && /not currently transcribing/.test(res.error.text()), sol: ["Stop-Transcript"], hint: "Just run it." }
  ]
});
