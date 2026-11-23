const noRw = (ctx) => !hasScope(ctx, "User.ReadWrite.All") && !hasScope(ctx, "Directory.ReadWrite.All");
const DRILLS = {
  connect: [
    { q: "Fresh window. Connect so you can read users, without the welcome text.", setup: "none", fn: (ctx) => hasScope(ctx, "User.Read.All") && noRw(ctx), sol: ["Connect-MgGraph -Scopes User.Read.All -NoWelcome"], hint: "One scope, one switch to hide the welcome." },
    { q: "Fresh window. You will need to read users and audit logs (AuditLog.Read.All). Connect with both.", setup: "none", fn: (ctx) => hasScope(ctx, "User.Read.All") && hasScope(ctx, "AuditLog.Read.All") && noRw(ctx), sol: ["Connect-MgGraph -Scopes User.Read.All,AuditLog.Read.All -NoWelcome"], hint: "Comma-separated scopes after -Scopes." },
    { q: "You are connected read-only. HR wants a department changed later today. Add the write scope for users to your session.", setup: "read", fn: (ctx) => hasScope(ctx, "User.ReadWrite.All"), sol: ["Connect-MgGraph -Scopes User.ReadWrite.All -NoWelcome"], hint: "Connecting again adds scopes to what you already have." },
    { q: "End of the day. Sign out of Graph.", setup: "read", fn: (ctx) => !ctx.mg, sol: ["Disconnect-MgGraph"], hint: "The opposite of Connect." },
    { q: "Fresh window. Read users and groups (Group.Read.All), then prove it works by listing the first 2 users.", setup: "none", refSetup: "read", out: "Get-MgUser -Top 2", needScopes: ["User.Read.All", "Group.Read.All"], sol: ["Connect-MgGraph -Scopes User.Read.All,Group.Read.All -NoWelcome", "Get-MgUser -Top 2"], hint: "Connect first, then Get-MgUser -Top 2." },
    { q: "Fresh window. Try Get-MgUser -Top 1 before connecting, read the error, then fix it properly.", setup: "none", refSetup: "read", out: "Get-MgUser -Top 1", sol: ["Get-MgUser -Top 1", "Connect-MgGraph -Scopes User.Read.All -NoWelcome", "Get-MgUser -Top 1"], hint: "The error literally tells you which command to run." }
  ],
  context: [
    { q: "Show the full context card of your connection.", out: "Get-MgContext", hint: "No parameters needed." },
    { q: "Show only the account you are signed in with.", out: "(Get-MgContext).Account", hint: "(command).Property" },
    { q: "Show only the authentication type (delegated or app-only).", out: "(Get-MgContext).AuthType", hint: "Look at the property names in the full card." },
    { q: "Show the scopes as a list using Select-Object instead of brackets.", out: "Get-MgContext | Select-Object -ExpandProperty Scopes", hint: "-ExpandProperty unpacks one property into plain values." },
    { q: "Fresh window. Run Get-MgContext and notice it prints nothing. Then connect read-only and run it again.", setup: "none", refSetup: "read", out: "Get-MgContext", sol: ["Get-MgContext", "Connect-MgGraph -Scopes User.Read.All -NoWelcome", "Get-MgContext"], hint: "Silence means not connected." },
    { q: "Show the TenantId and Account side by side in one table.", out: "Get-MgContext | Select-Object TenantId,Account", hint: "Select-Object with two property names." }
  ],
  command: [
    { q: "Find every command with MgGroup in its name.", out: "Get-Command *MgGroup*", hint: "Wildcards on both sides." },
    { q: "List every command the ExchangeOnlineManagement module offers.", out: "Get-Command -Module ExchangeOnlineManagement", hint: "-Module and the exact module name." },
    { q: "List every command that starts with the verb Remove.", out: "Get-Command -Verb Remove", hint: "-Verb" },
    { q: "Find every command whose name contains Mailbox.", out: "Get-Command *Mailbox*", hint: "Same pattern, different word." },
    { q: "Which commands in Microsoft.Graph.Users use the verb Get?", out: "Get-Command -Module Microsoft.Graph.Users -Verb Get", hint: "Combine -Module and -Verb." },
    { q: "Find the command that revokes sign-in sessions. You only know the word Revoke.", out: "Get-Command *Revoke*", hint: "Wildcard search on the one word you know." }
  ],
  help: [
    { q: "Show the examples for Get-MgUser.", out: "Get-Help Get-MgUser -Examples", hint: "Get-Help, command, -Examples." },
    { q: "Show the examples for Get-EXOMailbox.", out: "Get-Help Get-EXOMailbox -Examples", hint: "Works for Exchange commands too." },
    { q: "Show the full help page (not just examples) for Get-MgContext.", out: "Get-Help Get-MgContext", hint: "Leave the switch off." },
    { q: "Show the examples for Where-Object.", out: "Get-Help Where-Object -Examples", hint: "Built-in commands have help too." },
    { q: "Show the examples for Revoke-MgUserSignInSession.", out: "Get-Help Revoke-MgUserSignInSession -Examples", hint: "Same shape." }
  ],
  member: [
    { q: "List every property of a user object, nothing else.", out: "Get-MgUser -Top 1 | Get-Member -MemberType Property", hint: "-MemberType Property" },
    { q: "Show the members of the context object, properties only.", out: "Get-MgContext | Get-Member -MemberType Property", hint: "Pipe Get-MgContext into it." },
    { q: "What type of object does Get-Date return? Show its members.", out: "Get-Date | Get-Member", hint: "Any object can be inspected." },
    { q: "Connected to Exchange. Inspect one mailbox object with Get-Member.", setup: "exo", out: "Get-EXOMailbox -ResultSize 1 | Get-Member", hint: "Get one mailbox, pipe it." },
    { q: "Inspect what Get-Command returns (use Get-MgUser as the command to look up).", out: "Get-Command Get-MgUser | Get-Member", hint: "Even commands are objects." }
  ],
  exo: [
    { q: "Connected to Graph. Connect to Exchange quietly.", fn: (ctx, res) => ctx.exo && !res.host.some((h) => /V3 EXO/.test(h.text || "")), sol: ["Connect-ExchangeOnline -ShowBanner:$false"], hint: "-ShowBanner:$false" },
    { q: "Connect to Exchange quietly, then list 5 mailboxes.", out: "Get-EXOMailbox -ResultSize 5", needExo: true, sol: ["Connect-ExchangeOnline -ShowBanner:$false", "Get-EXOMailbox -ResultSize 5"], hint: "-ResultSize 5" },
    { q: "Connected to Exchange. Disconnect without being asked to confirm.", setup: "exo", fn: (ctx, res) => !ctx.exo && !res.host.some((h) => /Confirm/.test(h.text || "")), sol: ["Disconnect-ExchangeOnline -Confirm:$false"], hint: "-Confirm:$false" },
    { q: "Fresh window. Connect in the safe order: Graph read-only first, then Exchange quietly.", setup: "none", fn: (ctx, res, hist) => hasScope(ctx, "User.Read.All") && ctx.exo && hist.findIndex((h) => /connect-mggraph/i.test(h)) < hist.findIndex((h) => /connect-exchangeonline/i.test(h)), sol: ["Connect-MgGraph -Scopes User.Read.All -NoWelcome", "Connect-ExchangeOnline -ShowBanner:$false"], hint: "Graph first, then Exchange." },
    { q: "Connected to Exchange. Show one mailbox: Elowen Thistle's.", setup: "exo", out: "Get-EXOMailbox -Identity elowen.thistle@" + DOMAIN, hint: "-Identity takes the address." }
  ],
  getuser: [
    { q: "Look up Hesper Reedmire.", out: "Get-MgUser -UserId " + U("hesper.reedmire"), hint: "firstname.lastname@" + DOMAIN },
    { q: "Look up Alaric Strand, the Managing Director.", out: "Get-MgUser -UserId " + U("alaric.strand"), hint: "Same pattern." },
    { q: "Look up Cassian Drake and store him in a variable called $u. Then show $u.", fn: (ctx, res) => { const v = ctx.getVar("u"); return v && v.DisplayName === "Cassian Drake" && res.out.length === 1 && res.out[0] && res.out[0].DisplayName === "Cassian Drake"; }, sol: ["$u = Get-MgUser -UserId " + U("cassian.drake"), "$u"], hint: "$u = Get-MgUser ...  then type $u on its own." },
    { q: "Show only the Id of Ondine Shadewell.", out: "(Get-MgUser -UserId " + U("ondine.shadewell") + ").Id", hint: "(command).Id" },
    { q: "Someone typed isolde.fen@... in a ticket. Look up the real Isolde Fenn.", out: "Get-MgUser -UserId " + U("isolde.fenn"), hint: "The ticket has a typo. Two n's." },
    { q: "Show the UserPrincipalName of Juniper Oakes, nothing else.", out: "(Get-MgUser -UserId " + U("juniper.oakes") + ").UserPrincipalName", hint: "(command).UserPrincipalName" }
  ],
  property: [
    { q: "Show Garrion Penhale's DisplayName and JobTitle.", out: "Get-MgUser -UserId " + U("garrion.penhale") + " -Property DisplayName,JobTitle | Select-Object DisplayName,JobTitle", hint: "Request and select the same two." },
    { q: "Which city does Seren Blackwood work in? Show DisplayName and City.", out: "Get-MgUser -UserId " + U("seren.blackwood") + " -Property DisplayName,City | Select-Object DisplayName,City", hint: "City is not sent by default." },
    { q: "Show Aldric Moor's DisplayName and AccountEnabled.", out: "Get-MgUser -UserId " + U("aldric.moor") + " -Property DisplayName,AccountEnabled | Select-Object DisplayName,AccountEnabled", hint: "AccountEnabled needs -Property." },
    { q: "Show DisplayName, Department and UsageLocation for Lorcan Ivers.", out: "Get-MgUser -UserId " + U("lorcan.ivers") + " -Property DisplayName,Department,UsageLocation | Select-Object DisplayName,Department,UsageLocation", hint: "Three properties, twice." },
    { q: "When was Wren Callowmere's account created? Show DisplayName and CreatedDateTime.", out: "Get-MgUser -UserId " + U("wren.callowmere") + " -Property DisplayName,CreatedDateTime | Select-Object DisplayName,CreatedDateTime", hint: "The property is CreatedDateTime." },
    { q: "Show DisplayName and Department for everyone (all pages), sorted by Department.", out: "Get-MgUser -All -Property DisplayName,Department | Sort-Object Department | Select-Object DisplayName,Department", hint: "-All -Property ... | Sort-Object Department | Select-Object ..." }
  ],
  filter: [
    { q: "Find everyone in Legal.", out: "Get-MgUser -Filter \"department eq 'Legal'\"", hint: "department eq 'Legal'" },
    { q: "Find everyone whose display name starts with 'Is'.", out: "Get-MgUser -Filter \"startswith(displayName,'Is')\"", hint: "startswith(displayName,'Is')" },
    { q: "List every guest account, with DisplayName and UserType.", out: "Get-MgUser -All -Filter \"userType eq 'Guest'\" -Property DisplayName,UserType | Select-Object DisplayName,UserType", hint: "userType eq 'Guest', and request UserType." },
    { q: "Find who has the job title CFO.", out: "Get-MgUser -Filter \"jobTitle eq 'CFO'\"", hint: "jobTitle eq 'CFO'" },
    { q: "List every disabled account (DisplayName and AccountEnabled).", out: "Get-MgUser -All -Filter \"accountEnabled eq false\" -Property DisplayName,AccountEnabled | Select-Object DisplayName,AccountEnabled", hint: "Booleans in OData have no quotes: accountEnabled eq false" },
    { q: "Find everyone in Operations who is based in Ghent. Show DisplayName, Department and City.", out: "Get-MgUser -All -Filter \"department eq 'Operations' and city eq 'Ghent'\" -Property DisplayName,Department,City | Select-Object DisplayName,Department,City", hint: "Two conditions joined with and." }
  ],
  count: [
    { q: "How many accounts are in Sales?", out: "(Get-MgUser -All -Filter \"department eq 'Sales'\").Count", hint: "Filter, -All, .Count" },
    { q: "How many disabled accounts are there?", fn: (ctx, res) => res.out.length === 1 && (res.out[0] === 5 || (res.out[0] && res.out[0].Count === 5)), sol: ["(Get-MgUser -All -Filter \"accountEnabled eq false\").Count"], hint: "accountEnabled eq false" },
    { q: "Count the people per department (one row per department).", out: "Get-MgUser -All -Property Department | Group-Object Department | Select-Object Name,Count", hint: "Group-Object Department, then Select-Object Name,Count" },
    { q: "Use Measure-Object to count everyone in IT.", out: "Get-MgUser -All -Filter \"department eq 'IT'\" | Measure-Object", hint: "Pipe into Measure-Object instead of .Count" },
    { q: "How many accounts have never signed in? (SignInActivity needs AuditLog.Read.All.) Count users whose LastSignInDateTime is empty.", setup: "none", fn: (ctx, res) => res.out.length === 1 && (res.out[0] === 2 || (res.out[0] && res.out[0].Count === 2)), sol: ["Connect-MgGraph -Scopes User.Read.All,AuditLog.Read.All -NoWelcome", "(Get-MgUser -All -Filter \"userType eq 'Member'\" -Property DisplayName,SignInActivity | Where-Object { -not $_.SignInActivity.LastSignInDateTime }).Count"], hint: "Members only, ask for SignInActivity, keep those where LastSignInDateTime is empty: -not $_.SignInActivity.LastSignInDateTime" }
  ],
  update: [
    { q: "Write access is on. Garrion Penhale is now Commercial Director. Update his job title.", setup: "write", fn: (ctx) => userOf(ctx, "garrion.penhale").JobTitle === "Commercial Director", sol: ["Update-MgUser -UserId " + U("garrion.penhale") + " -JobTitle \"Commercial Director\""], hint: "Spaces in the value need quotes." },
    { q: "Read-only connection. Nessa Quill moved to Sales. Update her department (you will need to fix your permissions first).", setup: "read", fn: (ctx) => userOf(ctx, "nessa.quill").Department === "Sales", sol: ["Connect-MgGraph -Scopes User.ReadWrite.All -NoWelcome", "Update-MgUser -UserId " + U("nessa.quill") + " -Department Sales"], hint: "403 first? Reconnect with User.ReadWrite.All." },
    { q: "Write access is on. Set Sorrel Achterwyn's office location to Bruges HQ.", setup: "write", fn: (ctx) => userOf(ctx, "sorrel.achterwyn").OfficeLocation === "Bruges HQ", sol: ["Update-MgUser -UserId " + U("sorrel.achterwyn") + " -OfficeLocation \"Bruges HQ\""], hint: "-OfficeLocation" },
    { q: "Write access is on. Rehearse changing Theodwyn Gallow's title to Senior Accountant with -WhatIf. Do not actually change it.", setup: "write", fn: (ctx, res) => userOf(ctx, "theodwyn.gallow").JobTitle === "Accountant" && res.host.some((h) => /What if/.test(h.text || "")), sol: ["Update-MgUser -UserId " + U("theodwyn.gallow") + " -JobTitle \"Senior Accountant\" -WhatIf"], hint: "Add -WhatIf at the end." },
    { q: "Write access is on. Ludovar Kerr got a new mobile number: +32 470 11 22 33. Update it.", setup: "write", fn: (ctx) => userOf(ctx, "ludovar.kerr").MobilePhone === "+32 470 11 22 33", sol: ["Update-MgUser -UserId " + U("ludovar.kerr") + " -MobilePhone \"+32 470 11 22 33\""], hint: "-MobilePhone with quotes around the number." },
    { q: "Write access is on. Change Briar Locke's department to Sales and title to Social Seller, then read both back to verify.", setup: "write", fn: (ctx, res) => { const u = userOf(ctx, "briar.locke"); return u.Department === "Sales" && u.JobTitle === "Social Seller" && res.out.some((o) => o && o.Department === "Sales" && o.JobTitle === "Social Seller"); }, sol: ["Update-MgUser -UserId " + U("briar.locke") + " -Department Sales -JobTitle \"Social Seller\"", "Get-MgUser -UserId " + U("briar.locke") + " -Property Department,JobTitle | Select-Object Department,JobTitle"], hint: "Update, then Get-MgUser with -Property." }
  ],
  block: [
    { q: "Write access is on. Isra Corvane resigned effective now. Block her and revoke her sessions.", setup: "write", fn: (ctx) => { const r = ctx.t.revoked[U("isra.corvane")]; return userOf(ctx, "isra.corvane").AccountEnabled === false && !!r && r.afterBlock; }, sol: ["Update-MgUser -UserId " + U("isra.corvane") + " -AccountEnabled:$false", "Revoke-MgUserSignInSession -UserId " + U("isra.corvane")], hint: "Block, then revoke." },
    { q: "Write access is on. Aldric Moor is back from long-term leave. Enable his account again.", setup: "write", fn: (ctx) => userOf(ctx, "aldric.moor").AccountEnabled === true, sol: ["Update-MgUser -UserId " + U("aldric.moor") + " -AccountEnabled:$true"], hint: "-AccountEnabled:$true" },
    { q: "Write access is on. Rehearse blocking Ludovar Kerr with -WhatIf only.", setup: "write", fn: (ctx, res) => userOf(ctx, "ludovar.kerr").AccountEnabled === true && res.host.some((h) => /What if/.test(h.text || "")), sol: ["Update-MgUser -UserId " + U("ludovar.kerr") + " -AccountEnabled:$false -WhatIf"], hint: "-WhatIf" },
    { q: "Read-only connection. Security says Petrel Lindgrove's account looks compromised. Lock it down properly.", setup: "read", fn: (ctx) => { const r = ctx.t.revoked[U("petrel.lindgrove")]; return userOf(ctx, "petrel.lindgrove").AccountEnabled === false && !!r && r.afterBlock; }, sol: ["Connect-MgGraph -Scopes User.ReadWrite.All -NoWelcome", "Update-MgUser -UserId " + U("petrel.lindgrove") + " -AccountEnabled:$false", "Revoke-MgUserSignInSession -UserId " + U("petrel.lindgrove")], hint: "Write scope first, then block, then revoke." },
    { q: "Write access is on. Block Dorian Pikeholm, then show his DisplayName and AccountEnabled to prove it.", setup: "write", fn: (ctx, res) => userOf(ctx, "dorian.pikeholm").AccountEnabled === false && res.out.some((o) => o && o.DisplayName === "Dorian Pikeholm" && o.AccountEnabled === false), sol: ["Update-MgUser -UserId " + U("dorian.pikeholm") + " -AccountEnabled:$false", "Get-MgUser -UserId " + U("dorian.pikeholm") + " -Property DisplayName,AccountEnabled | Select-Object DisplayName,AccountEnabled"], hint: "Block, then read it back with -Property." }
  ]
};
