SEQUENCES.push({ id: 10, name: "Real world", short: "REAL WORLD", open: true, blurb: "What labs usually skip: paging, advanced queries, throttling and the minutes Microsoft 365 needs to catch up with itself." });
const RW_SCOPES = ["User.ReadWrite.All", "Group.ReadWrite.All", "Organization.Read.All"];
const THR = { throttle: { limit: 10, window: 10000 } };
const LAT = { latency: { user: 20000, mailbox: 180000 } };
Object.assign(GRADER.SETUPS, {
  big: { scopes: ["User.Read.All", "Group.Read.All"], exo: false, cwd: "/Users/veyra/Desktop", contractors: 240 },
  thr: { scopes: RW_SCOPES, exo: false, cwd: "/Users/veyra/Desktop", contractors: 240, quirks: THR },
  lat: { scopes: RW_SCOPES, exo: true, cwd: "/Users/veyra/Desktop", contractors: 240, quirks: LAT },
  real: { scopes: RW_SCOPES, exo: true, cwd: "/Users/veyra/Documents/scripts", contractors: 240, quirks: { throttle: THR.throttle, latency: LAT.latency } }
});
const CONQ = "\"department eq 'Contractors'\"";
const contractors = (ctx) => ctx.t.users.filter((u) => u.Department === "Contractors");
const SGC = "$g = Get-MgGroup -Filter \"displayName eq 'SG-Contractors'\"";
const LUNET = U("lunet.verwyn");
const NEWHIRE = "$pw = @{ Password = 'Fenmarsh-Start-2026!'; ForceChangePasswordNextSignIn = $true }; New-MgUser -DisplayName 'Lunet Verwyn' -UserPrincipalName " + LUNET + " -MailNickname lunet.verwyn -AccountEnabled -PasswordProfile $pw -UsageLocation BE -Department Contractors";
const E3 = "$e3 = Get-MgSubscribedSku -All | Where-Object SkuPartNumber -eq 'SPE_E3'";
const STORY10 = "Halvard just took over the warehouse crew of Fenmarsh Freight: 240 contractor accounts landed in the tenant overnight. Everything you learned still works. It just stops being quick, complete and instant.";

MEMORIES.push(
{
  id: "paging", seq: 10, name: "-All", tag: "PAGING", title: "Graph hands you page one and says nothing",
  summary: "Without -All, Get-MgUser and Get-MgGroupMember stop at 100 results, silently. Counts and exports are wrong without a single error.",
  setup: "big",
  brief: {
    what: [
      STORY10,
      "Graph answers in <b>pages</b>. Get-MgUser and Get-MgGroupMember return the <b>first 100</b> unless you add <b>-All</b>, which follows every next page for you. There is no warning. Your count says 100, your CSV has 100 rows, and the other 140 people silently do not exist.",
      "With 46 users this never showed. With 286 it does. <b>-All whenever you mean all</b>; <b>-Top n</b> when you deliberately want a few. (Exchange has the same idea: Get-EXOMailbox stops at 1000 unless -ResultSize Unlimited, and it does print a warning.)"
    ],
    daily: ["Licence counts and audits", "Group membership exports", "Anything with 'every' or 'all' in the ticket"],
    parts: [["Get-MgUser", "first 100 only"], ["Get-MgUser -All", "every page"], ["Get-MgUser -Top 5", "deliberately a few"], ["Get-MgGroupMember -GroupId $g.Id -All", "every member"]],
    flow: [["Ask", "Get-MgUser"], ["Page 1", "100 results"], ["-All", "follows next pages"], ["Complete", "every object"]],
    traps: [["Silent truncation", "No error, no warning. 100 exactly is the tell: real numbers are rarely that round."], ["A filter does not help", "-Filter narrows the set, but the 100-per-page limit still applies to what is left."], ["Counting", "(Get-MgUser).Count can never be more than 100."]]
  },
  watch: [
    { code: "(Get-MgUser).Count", say: "100. Suspiciously round." },
    { code: "(Get-MgUser -All).Count", say: "The real number." },
    { code: "(Get-MgUser -Filter " + CONQ + ").Count", say: "Filtered, still capped at 100." },
    { code: SGC + "; (Get-MgGroupMember -GroupId $g.Id).Count; (Get-MgGroupMember -GroupId $g.Id -All).Count", say: "Same story for group members: 100, then 240." },
    { code: "Get-MgUser -Top 3 -Filter " + CONQ + " | Select-Object DisplayName,City", say: "-Top when you only want a sample." }
  ],
  trace: { ask: "Count every contractor, not just page one.", tpl: "(Get-MgUser -[[All]] -Filter " + CONQ + ").Count", check: { out: "(Get-MgUser -All -Filter " + CONQ + ").Count" }, wrong: "The switch that follows every page." },
  traceHints: ["One switch, three letters.", "It means everything.", "-A__", "Answer: All"],
  recall: { ask: "How many members does SG-Contractors really have? One number.", setup: "big", check: { fn: (ctx, res) => res.out.length === 1 && res.out[0] === 240 }, wrong: "Find the group, then count its members with every page." },
  recallHints: ["Get-MgGroup with a displayName filter gives you the Id.", "Get-MgGroupMember needs -All.", SGC + "; (Get-MgGroupMember -GroupId $g.Id ...).Count", SGC + "; (Get-MgGroupMember -GroupId $g.Id -All).Count"],
  real: ["(Get-MgUser).Count", "(Get-MgUser -All).Count", "If the first is exactly 100 and the second is not, every script you have without -All is wrong."],
  cheat: [["Get-MgUser -All", "Every page, not just 100"], ["Get-MgGroupMember -GroupId x -All", "Every member"], ["Get-EXOMailbox -ResultSize Unlimited", "Exchange's version"]]
},
{
  id: "advquery", seq: 10, name: "ConsistencyLevel", tag: "ADVANCED QUERIES", title: "The queries Graph only answers if you ask nicely",
  summary: "ne, endsWith, -Search and counting are 'advanced queries': add -ConsistencyLevel eventual (and -CountVariable for counts).",
  setup: "big",
  brief: {
    what: [
      "Some filters are <b>advanced queries</b> in Graph: <b>ne</b>, <b>not</b>, <b>endsWith()</b>, <b>-Search</b> and <b>counting</b> on the server. They only work with <b>-ConsistencyLevel eventual</b>; without it Graph answers 'Unsupported or invalid query filter clause'. The error even names the property.",
      "<b>-Search '\"displayName:Mosswick\"'</b> finds words that start with Mosswick anywhere in the name, which a plain eq can't do. Mind the quotes: double quotes inside single quotes.",
      "<b>-CountVariable n</b> stores the total in $n (no $ in the parameter). 'Eventual' means the index can be a few seconds behind: an account created a moment ago may not show up yet."
    ],
    daily: ["\"Everyone except the contractors\"", "\"Who has an address ending in our old domain?\"", "Searching by part of a name"],
    parts: [["-Filter \"department ne 'Contractors'\" -ConsistencyLevel eventual", "not equal"], ["-Filter \"endsWith(mail,'@x.com')\" -ConsistencyLevel eventual", "ends with"], ["-Search '\"displayName:Mosswick\"' -ConsistencyLevel eventual", "word search"], ["-CountVariable n", "total in $n"]],
    flow: [["Query", "ne / endsWith / search"], ["400", "unsupported clause"], ["Add", "-ConsistencyLevel eventual"], ["Count", "-CountVariable n"]],
    traps: [["$ in CountVariable", "-CountVariable n, not -CountVariable $n."], ["Search quotes", "'\"displayName:Mosswick\"': the inner double quotes are part of the query."], ["Brand-new objects", "The advanced index lags: a minute-old account may be missing."]]
  },
  watch: [
    { code: "Get-MgUser -All -Filter \"department ne 'Contractors'\"", say: "Refused: ne is an advanced query." },
    { code: "(Get-MgUser -All -Filter \"department ne 'Contractors'\" -ConsistencyLevel eventual).Count", say: "Same filter, one extra parameter: the original Halvard staff." },
    { code: "Get-MgUser -All -Search '\"displayName:Mosswick\"' -ConsistencyLevel eventual | Select-Object DisplayName,City", say: "Everyone with a word starting with Mosswick in their name." },
    { code: "Get-MgUser -All -Filter \"endsWith(userPrincipalName,'.mosswick@" + DOMAIN + "')\" -ConsistencyLevel eventual -CountVariable n | Out-Null; $n", say: "Ends-with plus a server-side count, kept in $n." }
  ],
  trace: { ask: "Make the advanced query work.", tpl: "(Get-MgUser -All -Filter \"department ne 'Contractors'\" -ConsistencyLevel [[eventual]]).Count", check: { out: "(Get-MgUser -All -Filter \"department ne 'Contractors'\" -ConsistencyLevel eventual).Count" }, wrong: "The consistency level advanced queries need." },
  traceHints: ["It isn't strong.", "It catches up... eventually.", "e_______", "Answer: eventual"],
  recall: { ask: "Find everyone with a word starting with 'Hawthorn' in their display name using -Search. Show DisplayName and City.", setup: "big", check: { out: "Get-MgUser -All -Search '\"displayName:Hawthorn\"' -ConsistencyLevel eventual | Select-Object DisplayName,City" }, wrong: "-Search with the quoted query, -ConsistencyLevel eventual, -All, two columns." },
  recallHints: ["-Search, not -Filter.", "'\"displayName:Hawthorn\"' then -ConsistencyLevel eventual.", "Get-MgUser -All -Search '\"displayName:Hawthorn\"' -ConsistencyLevel eventual | Select-Object ...", "Get-MgUser -All -Search '\"displayName:Hawthorn\"' -ConsistencyLevel eventual | Select-Object DisplayName,City"],
  real: ["Get-MgUser -All -Filter \"accountEnabled ne true\" -ConsistencyLevel eventual -CountVariable n | Out-Null; $n"],
  cheat: [["-ConsistencyLevel eventual", "Needed for ne, not, endsWith, search, count"], ["-Search '\"displayName:x\"'", "Word search"], ["-CountVariable n; $n", "Server-side count"]]
},
{
  id: "throttle", seq: 10, name: "429", tag: "THROTTLING", title: "Too many requests: wait, then retry the same item",
  summary: "Graph limits how fast you may write. Read Retry-After, Start-Sleep that long, retry the item you were on. Never skip it.",
  setup: "thr",
  brief: {
    what: [
      "Graph protects itself. If one app writes too fast, it answers <b>429 Too Many Requests</b> with a <b>Retry-After</b> header: the seconds to wait. The Graph SDK quietly retries a 429 a few times on its own; a big loop still runs into it.",
      "This lab allows <b>10 writes per 10 seconds</b> so you meet it quickly. <b>Start-Sleep</b> here moves a lab clock forward instead of making you actually wait. In real life it really waits, which is fine: a script that takes 6 minutes and finishes beats one that takes 1 minute and skips 140 people.",
      "The pattern: per item, <b>try</b> the write; on a 429, <b>Start-Sleep</b>, then <b>try the same item again</b>, up to a limit. Anything else (404, bad value) is a real error: record it and move on."
    ],
    daily: ["Bulk updates of hundreds of users", "Nightly sync scripts", "Licence changes for a whole department"],
    parts: [["catch { if ($_.Exception.Message -match 'Too Many Requests') { ... } }", "recognise throttling (the first line of the error)"], ["Start-Sleep -Seconds 10", "back off"], ["do { ... } until ($ok -or $tries -ge 5)", "retry the same item"], ["$tries++", "count, so it can't loop forever"]],
    flow: [["Write", "item 11"], ["429", "Retry-After: 10"], ["Sleep", "Start-Sleep 10"], ["Retry", "same item"]],
    traps: [["Skipping", "A catch that only writes a warning leaves every throttled user unchanged."], ["Retry forever", "Always cap the attempts."], ["Sleeping every time", "Only sleep when you got a 429. Sleeping on every item makes a 2-minute job take an hour."]]
  },
  watch: [
    { code: "Get-MgUser -All -Filter " + CONQ + " | Select-Object -First 15 | ForEach-Object { Update-MgUser -UserId $_.Id -OfficeLocation 'Zeebrugge Depot' }", say: "Ten go through, the eleventh is refused. Retry-After says how long to back off." },
    { code: "Start-Sleep -Seconds 10; Get-Date", say: "In the lab the clock jumps; in real life you would actually wait." },
    { code: "$users = Get-MgUser -All -Filter " + CONQ + " | Select-Object -First 25\nforeach ($u in $users) {\n    $tries = 0; $ok = $false\n    do {\n        try { Update-MgUser -UserId $u.Id -OfficeLocation 'Zeebrugge Depot'; $ok = $true }\n        catch { if ($_.Exception.Message -match 'Too Many Requests') { $tries++; Start-Sleep -Seconds 10 } else { throw } }\n    } until ($ok -or $tries -ge 5)\n}\n(Get-MgUser -All -Filter " + CONQ + " -Property OfficeLocation | Where-Object OfficeLocation -eq 'Zeebrugge Depot').Count", say: "The retry pattern: 25 updated, none skipped." }
  ],
  trace: { ask: "Back off before retrying.", tpl: "$u = Get-MgUser -All -Filter " + CONQ + " | Select-Object -First 12; foreach ($x in $u) { $done = $false; do { try { Update-MgUser -UserId $x.Id -JobTitle 'Warehouse operator'; $done = $true } catch { [[Start-Sleep]] -Seconds 10 } } until ($done) }", check: { fn: (ctx) => contractors(ctx).slice(0, 12).every((u) => u.JobTitle === "Warehouse operator") }, wrong: "The cmdlet that pauses." },
  traceHints: ["It pauses the script.", "Start-_____", "Start-Sl___", "Answer: Start-Sleep"],
  recall: { ask: "Set OfficeLocation 'Zeebrugge Depot' for all 240 contractors. You will be throttled: back off and retry the same user, skip nobody.", setup: "thr", check: { fn: (ctx) => contractors(ctx).every((u) => u.OfficeLocation === "Zeebrugge Depot") }, wrong: "Every contractor must end up with the new office. Use -All, and retry after a 429." },
  recallHints: ["Loop over Get-MgUser -All with the department filter.", "Inside: do { try { Update-MgUser ...; $ok = $true } catch { Start-Sleep -Seconds 10; $tries++ } } until ($ok -or $tries -ge 5)", "Reset $ok and $tries for each user.", "foreach ($u in Get-MgUser -All -Filter " + CONQ + ") { $ok = $false; $tries = 0; do { try { Update-MgUser -UserId $u.Id -OfficeLocation 'Zeebrugge Depot'; $ok = $true } catch { $tries++; Start-Sleep -Seconds 10 } } until ($ok -or $tries -ge 5) }"],
  real: ["Look up 'Microsoft Graph throttling limits' in the docs: the numbers differ per service. Add a retry loop to the next bulk script you write."],
  cheat: [["catch { if ($_.Exception.Message -match 'Too Many Requests') { Start-Sleep -Seconds 10 } }", "Back off on a 429"], ["do { ... } until ($ok -or $tries -ge 5)", "Retry with a cap"]]
},
{
  id: "latency", seq: 10, name: "Not yet", tag: "REPLICATION", title: "It exists. Just not everywhere yet.",
  summary: "Microsoft 365 is many services syncing. A new user isn't usable everywhere at once, a mailbox appears minutes after the licence. Poll with a timeout.",
  setup: "lat",
  brief: {
    what: [
      "A new account is written to Entra ID first, then copied to the other services. For a few seconds, adding it to a group can fail with 'does not exist'. A <b>mailbox</b> is only created after the <b>licence</b> lands, and that takes minutes (in real life 5 to 30). Scripts that create and immediately use fail at random.",
      "Don't guess with one long Start-Sleep. <b>Poll</b>: check, wait a bit, check again, with a <b>maximum</b>. <code>-ErrorAction SilentlyContinue</code> turns 'not found yet' into an empty result you can test.",
      "In this lab users need 20 seconds before group changes work and mailboxes appear 3 minutes after licensing, on the lab clock."
    ],
    daily: ["Onboarding scripts", "Creating shared mailboxes then setting permissions", "Any create-then-configure step"],
    parts: [["Get-EXOMailbox -Identity $upn -ErrorAction SilentlyContinue", "empty instead of red"], ["do { Start-Sleep -Seconds 30; $m = ... } until ($m -or $tries -ge 20)", "poll with a cap"], ["if (-not $m) { throw 'Mailbox never appeared' }", "fail loudly after the cap"]],
    flow: [["Create", "New-MgUser"], ["Licence", "Set-MgUserLicense"], ["Poll", "is it there yet?"], ["Configure", "Set-Mailbox"]],
    traps: [["One giant sleep", "Start-Sleep 600 'to be safe' wastes time when it's quick and still fails when it's slow."], ["No cap", "A poll without a maximum can hang a nightly job forever."], ["Silent give-up", "When the cap is hit, throw. Don't continue as if it worked."]]
  },
  watch: [
    { code: NEWHIRE, say: "Lunet Verwyn exists in Entra ID." },
    { code: SGC + "; $u = Get-MgUser -UserId " + LUNET + "; New-MgGroupMember -GroupId $g.Id -DirectoryObjectId $u.Id", say: "Immediately into a group: 'does not exist'. She does; the other services don't know yet." },
    { code: "Start-Sleep -Seconds 20; New-MgGroupMember -GroupId $g.Id -DirectoryObjectId $u.Id", say: "Twenty seconds later it works." },
    { code: E3 + "; Set-MgUserLicense -UserId " + LUNET + " -AddLicenses @{SkuId = $e3.SkuId} -RemoveLicenses @() | Out-Null; Get-EXOMailbox -Identity " + LUNET, say: "Licensed. The mailbox isn't there yet." },
    { code: "$tries = 0\ndo {\n    Start-Sleep -Seconds 30\n    $m = Get-EXOMailbox -Identity " + LUNET + " -ErrorAction SilentlyContinue\n    $tries++\n} until ($m -or $tries -ge 20)\n\"Found after $($tries * 30) seconds\"", say: "Poll every 30 seconds, at most 20 times." }
  ],
  trace: { ask: "Turn 'not found' into an empty result inside the poll.", pre: [NEWHIRE, E3 + "; Set-MgUserLicense -UserId " + LUNET + " -AddLicenses @{SkuId = $e3.SkuId} -RemoveLicenses @() | Out-Null"], tpl: "$t = 0; do { Start-Sleep -Seconds 30; $m = Get-EXOMailbox -Identity " + LUNET + " -ErrorAction [[SilentlyContinue]]; $t++ } until ($m -or $t -ge 20); $m.DisplayName", check: { fn: (ctx, res) => !res.error && res.out.length === 1 && res.out[0] === "Lunet Verwyn" }, wrong: "Which ErrorAction hides the error and carries on?" },
  traceHints: ["Not Stop, the opposite.", "Quietly carry on.", "Silently________", "Answer: SilentlyContinue"],
  recall: { ask: "Onboard Lunet Verwyn (" + LUNET + "): create her (password profile is up to you), license her with SPE_E3, wait for her mailbox by polling with a cap, then hide it from the address list.", setup: "lat", check: { fn: (ctx) => { const m = ctx.t.mailboxes.find((x) => x.UserPrincipalName === LUNET); return !!m && m.HiddenFromAddressListsEnabled === true; } }, wrong: "Create, licence, poll until Get-EXOMailbox finds her, then Set-Mailbox -HiddenFromAddressListsEnabled $true." },
  recallHints: ["Four steps: New-MgUser, Set-MgUserLicense, a do/until poll, Set-Mailbox.", "The poll: do { Start-Sleep -Seconds 30; $m = Get-EXOMailbox -Identity ... -ErrorAction SilentlyContinue; $t++ } until ($m -or $t -ge 20)", "Then: Set-Mailbox -Identity " + LUNET + " -HiddenFromAddressListsEnabled $true", NEWHIRE + ", then " + E3 + "; Set-MgUserLicense -UserId " + LUNET + " -AddLicenses @{SkuId = $e3.SkuId} -RemoveLicenses @() | Out-Null, then $t = 0; do { Start-Sleep -Seconds 30; $m = Get-EXOMailbox -Identity " + LUNET + " -ErrorAction SilentlyContinue; $t++ } until ($m -or $t -ge 20), then Set-Mailbox -Identity " + LUNET + " -HiddenFromAddressListsEnabled $true"],
  real: ["Next time you create a shared mailbox and set permissions right after, watch whether the permission step fails the first time. That's this lesson."],
  cheat: [["-ErrorAction SilentlyContinue", "Not found becomes empty"], ["do { Start-Sleep 30; $m = ... } until ($m -or $t -ge 20)", "Poll with a cap"], ["if (-not $m) { throw '...' }", "Fail loudly after the cap"]]
}
);

const retryLoop = (body) => "foreach ($u in Get-MgUser -All -Filter " + CONQ + ") { $ok = $false; $t = 0; do { try { " + body + "; $ok = $true } catch { $t++; Start-Sleep -Seconds 10 } } until ($ok -or $t -ge 5) }";
Object.assign(DRILLS, {
  paging: [
    { q: "How many users are there in the whole tenant? One number.", fn: (ctx, res) => res.out.length === 1 && res.out[0] === ctx.t.users.length, sol: ["(Get-MgUser -All).Count"], hint: "-All" },
    { q: "Contractors per city: Name and Count.", out: "Get-MgUser -All -Filter " + CONQ + " -Property City | Group-Object City | Select-Object Name,Count", hint: "-All, -Property City, Group-Object" },
    { q: "Show the trap: count contractors without -All.", fn: (ctx, res, hist) => res.out.length === 1 && res.out[0] === 100 && !/-All/i.test(hist[hist.length - 1] || ""), sol: ["(Get-MgUser -Filter " + CONQ + ").Count"], hint: "Same command, no -All." },
    { q: "A sample: 5 contractors, DisplayName and City.", out: "Get-MgUser -Top 5 -Filter " + CONQ + " -Property DisplayName,City | Select-Object DisplayName,City", hint: "-Top 5" },
    { q: "Export every contractor (DisplayName, City) to ~/Desktop/contractors.csv for Belgian Excel.", fn: (ctx) => { const c = csvRows(ctx, "/Users/veyra/Desktop/contractors.csv"); return !!c && c.rows.length === 240 && c.head.includes(";"); }, sol: ["Get-MgUser -All -Filter " + CONQ + " -Property DisplayName,City | Select-Object DisplayName,City | Export-Csv ~/Desktop/contractors.csv -NoTypeInformation -Delimiter ';'"], hint: "240 rows, not 100." },
    { q: "Member DisplayNames of SG-Contractors in Zeebrugge? Count them.", fn: (ctx, res) => res.out.length === 1 && res.out[0] === 60, sol: [SGC + "; (Get-MgGroupMember -GroupId $g.Id -All | ForEach-Object { Get-MgUser -UserId $_.Id -Property City } | Where-Object City -eq 'Zeebrugge').Count"], hint: "-All on the members, then look each one up." }
  ],
  advquery: [
    { q: "How many people are NOT contractors? One number.", fn: (ctx, res) => res.out.length === 1 && res.out[0] === ctx.t.users.filter((u) => u.Department !== "Contractors").length, sol: ["(Get-MgUser -All -Filter \"department ne 'Contractors'\" -ConsistencyLevel eventual).Count"], hint: "ne needs eventual." },
    { q: "Try endsWith without ConsistencyLevel and read which property the error names.", fn: (ctx, res) => !!res.error && /property 'mail'/i.test(res.error.text()), sol: ["Get-MgUser -All -Filter \"endsWith(mail,'@" + DOMAIN + "')\""], hint: "endsWith(mail, ...)" },
    { q: "Count users whose UPN ends with '.ashgrove@" + DOMAIN + "' with -CountVariable, then show $n.", fn: (ctx, res, hist) => res.out.length >= 1 && res.out[res.out.length - 1] === 20 && hist.some((h) => /-CountVariable/i.test(h)), sol: ["Get-MgUser -All -Filter \"endsWith(userPrincipalName,'.ashgrove@" + DOMAIN + "')\" -ConsistencyLevel eventual -CountVariable n | Out-Null; $n"], hint: "-CountVariable n, then $n" },
    { q: "Search for 'Mosswick' without ConsistencyLevel. Read the error.", fn: (ctx, res) => !!res.error && /ConsistencyLevel/.test(res.error.text()), sol: ["Get-MgUser -All -Search '\"displayName:Mosswick\"'"], hint: "Leave it out on purpose." },
    { q: "Disabled accounts among the original staff: accountEnabled ne true, DisplayName only.", out: "Get-MgUser -All -Filter \"accountEnabled ne true\" -ConsistencyLevel eventual -Property DisplayName | Select-Object DisplayName", hint: "ne true, eventual" }
  ],
  throttle: [
    { q: "Hit the limit on purpose: update 15 contractors without any retry, and read Retry-After.", fn: (ctx, res) => !!res.error && res.error.kind === "throttle", sol: ["Get-MgUser -All -Filter " + CONQ + " | Select-Object -First 15 | ForEach-Object { Update-MgUser -UserId $_.Id -JobTitle 'Loader' }"], hint: "No try/catch." },
    { q: "Set JobTitle 'Warehouse operator' for the first 40 contractors, with a retry loop.", fn: (ctx) => contractors(ctx).slice(0, 40).every((u) => u.JobTitle === "Warehouse operator"), sol: ["foreach ($u in (Get-MgUser -All -Filter " + CONQ + " | Select-Object -First 40)) { $ok = $false; $t = 0; do { try { Update-MgUser -UserId $u.Id -JobTitle 'Warehouse operator'; $ok = $true } catch { $t++; Start-Sleep -Seconds 10 } } until ($ok -or $t -ge 5) }"], hint: "do/until inside foreach." },
    { q: "Show what skipping does: 30 updates with a catch that only warns. Then count how many really changed (CompanyName 'Fenmarsh Freight BV').", fn: (ctx, res) => res.out.length >= 1 && res.out[res.out.length - 1] < 30 && res.out[res.out.length - 1] > 0, sol: ["Get-MgUser -All -Filter " + CONQ + " | Select-Object -First 30 | ForEach-Object { try { Update-MgUser -UserId $_.Id -CompanyName 'Fenmarsh Freight BV' } catch { Write-Warning 'skipped' } }; (Get-MgUser -All -Filter " + CONQ + " -Property CompanyName | Where-Object CompanyName -eq 'Fenmarsh Freight BV').Count"], hint: "The count is less than 30: that's the bug." },
    { q: "Only back off on a 429: rethrow anything else. Set City 'Zeebrugge' for the first 20 contractors.", fn: (ctx, res, hist) => contractors(ctx).slice(0, 20).every((u) => u.City === "Zeebrugge") && hist.some((h) => /-match\s+'Too Many Requests'/i.test(h)), sol: ["foreach ($u in (Get-MgUser -All -Filter " + CONQ + " | Select-Object -First 20)) { $ok = $false; $t = 0; do { try { Update-MgUser -UserId $u.Id -City 'Zeebrugge'; $ok = $true } catch { if ($_.Exception.Message -match 'Too Many Requests') { $t++; Start-Sleep -Seconds 10 } else { throw } } } until ($ok -or $t -ge 5) }"], hint: "if ($_.Exception.Message -match 'Too Many Requests') { ... } else { throw }" },
    { q: "How long did your last retry run sleep in total? Wrap it in Measure: compare (Get-Date) before and after a 30-user update with retries. Output whole seconds.", fn: (ctx, res) => res.out.length >= 1 && typeof res.out[res.out.length - 1] === "number" && res.out[res.out.length - 1] >= 20, sol: ["$start = Get-Date; " + retryLoop("Update-MgUser -UserId $u.Id -Department 'Contractors'").replace("foreach ($u in Get-MgUser -All -Filter " + CONQ + ")", "foreach ($u in (Get-MgUser -All -Filter " + CONQ + " | Select-Object -First 30))") + "; [int]((Get-Date) - $start).TotalSeconds"], hint: "((Get-Date) - $start).TotalSeconds" }
  ],
  latency: [
    { q: "Create Lunet Verwyn and add her to SG-Contractors right away. Read the error.", fn: (ctx, res) => !!userOf(ctx, "lunet.verwyn") && !!res.error && /does not exist/.test(res.error.text()), sol: [NEWHIRE, SGC + "; $u = Get-MgUser -UserId " + LUNET + "; New-MgGroupMember -GroupId $g.Id -DirectoryObjectId $u.Id"], hint: "Two lines, no wait." },
    { q: "Create her and add her to SG-Contractors with a retry: try, and on failure Start-Sleep 10 and try again, max 6 times.", fn: (ctx) => { const u = userOf(ctx, "lunet.verwyn"); const g = ctx.t.groups.find((x) => x.g.DisplayName === "SG-Contractors"); return !!u && g.members.includes(u.Id); }, sol: [NEWHIRE, SGC + "; $u = Get-MgUser -UserId " + LUNET + "; $ok = $false; $t = 0; do { try { New-MgGroupMember -GroupId $g.Id -DirectoryObjectId $u.Id; $ok = $true } catch { $t++; Start-Sleep -Seconds 10 } } until ($ok -or $t -ge 6)"], hint: "Same retry shape as throttling." },
    { q: "Licence a new user and look for her mailbox straight away, with -ErrorAction SilentlyContinue. Nothing should come back, and nothing red.", pre: [NEWHIRE], fn: (ctx, res, hist) => !res.error && res.out.length === 0 && hist.some((h) => /SilentlyContinue/i.test(h)) && ctx.t.mailboxes.some((m) => m.UserPrincipalName === LUNET), sol: [E3 + "; Set-MgUserLicense -UserId " + LUNET + " -AddLicenses @{SkuId = $e3.SkuId} -RemoveLicenses @() | Out-Null; Get-EXOMailbox -Identity " + LUNET + " -ErrorAction SilentlyContinue"], hint: "SilentlyContinue: empty instead of an error." },
    { q: "Poll for her mailbox every 30 s with a cap of 20, and output how many tries it took.", pre: [NEWHIRE, E3 + "; Set-MgUserLicense -UserId " + LUNET + " -AddLicenses @{SkuId = $e3.SkuId} -RemoveLicenses @() | Out-Null"], fn: (ctx, res) => res.out.length >= 1 && res.out[res.out.length - 1] === 6, sol: ["$t = 0; do { Start-Sleep -Seconds 30; $m = Get-EXOMailbox -Identity " + LUNET + " -ErrorAction SilentlyContinue; $t++ } until ($m -or $t -ge 20); $t"], hint: "Output $t after the loop." },
    { q: "A poll that gives up loudly: cap it at 3 tries and throw 'Mailbox not ready' if it's still missing.", pre: [NEWHIRE, E3 + "; Set-MgUserLicense -UserId " + LUNET + " -AddLicenses @{SkuId = $e3.SkuId} -RemoveLicenses @() | Out-Null"], fn: (ctx, res) => !!res.error && /Mailbox not ready/.test(res.error.text()), sol: ["$t = 0; do { Start-Sleep -Seconds 30; $m = Get-EXOMailbox -Identity " + LUNET + " -ErrorAction SilentlyContinue; $t++ } until ($m -or $t -ge 3); if (-not $m) { throw 'Mailbox not ready' }"], hint: "3 x 30 s isn't 3 minutes." }
  ]
});

const POLDER = {
  id: "polder", type: "capstone", name: "Fenmarsh Monday", seq: 10, kind: "CAPSTONE · EVERYTHING AT ONCE", allow: /./, hero: "gate", setup: "real",
  need: (m) => m.seq === 10,
  story: "Monday 07:30. The Fenmarsh Freight crew starts today. Garrion needs a list, the accounts need their depot, and a new hire is waiting at the gate. Graph is busy and the tenant is slow. Every lesson in this sequence applies at once.",
  doneMsg: "240 accounts handled, none skipped, a new hire onboarded without guessing. This is what the job actually looks like.",
  text: { crumb: "Capstone · ", done: "Monday handled", flow: [["Count", "-All"], ["Change", "retry on 429"], ["Create", "poll for the mailbox"], ["Verify", "read it back"]], flowT: "CAPSTONE · BIG, SLOW AND THROTTLED", rules: "<h6>CAPSTONE RULES</h6>240 contractors, 10 writes per 10 seconds, mailboxes appear 3 minutes after licensing. You are already connected. Scripts in Code are welcome.", junie: "Same lessons, all at once: -All, retry on 429, poll with a cap. One ticket at a time." },
  tickets: [
    { id: "p1", from: "Garrion Penhale", title: "The full list", body: "Export every contractor (DisplayName, City) to ~/Desktop/polder.csv for Belgian Excel. All of them.", hint: "-All, Select-Object, Export-Csv -Delimiter ';'",
      check: (ctx) => { const c = csvRows(ctx, "/Users/veyra/Desktop/polder.csv"); return !!c && c.rows.length === 240 && /DisplayName/.test(c.head) && c.head.includes(";"); } },
    { id: "p2", from: "Garrion Penhale", title: "Everyone to the depot", body: "Set OfficeLocation 'Zeebrugge Depot' for all 240. Expect throttling; nobody may be skipped.", hint: "foreach + do/until retry with Start-Sleep after a 429.",
      check: (ctx) => contractors(ctx).length === 240 && contractors(ctx).every((u) => u.OfficeLocation === "Zeebrugge Depot") },
    { id: "p3", from: "Gate security", title: "New hire at the gate", body: "Lunet Verwyn (" + LUNET + ") starts now: create her in department Contractors, licence SPE_E3, add her to SG-Contractors, and once her mailbox exists, hide it from the address list.", hint: "Right after the bulk run Graph is still throttling you: even New-MgUser can get a 429, so wait or retry. Then create, retry the group add, licence, poll Get-EXOMailbox with -ErrorAction SilentlyContinue, and Set-Mailbox -HiddenFromAddressListsEnabled $true.",
      check: (ctx) => { const u = userOf(ctx, "lunet.verwyn"); if (!u) return false; const g = ctx.t.groups.find((x) => x.g.DisplayName === "SG-Contractors"); const m = ctx.t.mailboxes.find((x) => x.UserPrincipalName === LUNET); return g.members.includes(u.Id) && !!m && m.HiddenFromAddressListsEnabled === true && u.Department === "Contractors"; } }
  ]
};
GATES.push(POLDER);
