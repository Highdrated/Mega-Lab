const DOMAIN = "halvardco.onmicrosoft.com";
const U = (n) => n + "@" + DOMAIN;
const userOf = (ctx, n) => ctx.t.users.find((x) => x.UserPrincipalName.toLowerCase() === U(n));
const hasScope = (ctx, s) => !!ctx.mg && ctx.mg.scopes.some((x) => x.toLowerCase() === s.toLowerCase());

const SEQUENCES = [
  { id: 0, name: "Connect & look around", short: "CONNECT", open: true, blurb: "Before you touch a tenant, sign in with the right permissions and check where you are. Then learn how to find any command on your own." },
  { id: 1, name: "Users", short: "USERS", open: true, blurb: "The work you do every single day: look people up, read what you need, fix their details, and lock out someone who just left." },
  { id: 2, name: "Mailboxes", short: "MAILBOXES", blurb: "Shared mailboxes, permissions, forwarding, aliases, out-of-office." },
  { id: 3, name: "Groups & lists", short: "GROUPS", blurb: "Who is in what. Distribution lists, Microsoft 365 groups, membership fixes." },
  { id: 4, name: "Licenses", short: "LICENSES", blurb: "Who has what, what is free, and why a new hire has no mailbox." },
  { id: 5, name: "Reports", short: "REPORTS", blurb: "The pipeline: filter, shape, group and export the answers people ask for." },
  { id: 6, name: "Safe bulk changes", short: "BULK", blurb: "CSV in, loop, -WhatIf, try/catch, transcripts. Change 200 users without fear." },
  { id: 7, name: "Investigate", short: "INVESTIGATE", blurb: "Sign-in logs, audit logs, message trace, inbox rules. Find out why." },
  { id: 8, name: "Incident response", short: "RESPOND", blurb: "A colleague got hacked. Contain it in the right order, then prove what happened." }
];

const MEMORIES = [
{
  id: "connect", seq: 0, name: "Connect-MgGraph", tag: "SIGN IN", title: "Open the door to the tenant",
  summary: "Sign in to Microsoft Graph and ask only for the permissions you need.",
  setup: "none",
  brief: {
    what: [
      "Microsoft Graph is the API that sits behind Entra ID and most of Microsoft 365. Every command with <b>Mg</b> in its name (Get-<b>Mg</b>User, Update-<b>Mg</b>User) talks to Graph, and none of them work until you are signed in.",
      "Connect-MgGraph opens a browser window, you sign in with your admin account (and MFA), and PowerShell receives a token. That token carries <b>scopes</b>: the exact permissions you asked for. This is called <b>delegated</b> access: Graph acts as you, so you can never do more than your own admin role allows, and never more than the scopes you requested."
    ],
    daily: ["The first line of almost every admin session and script", "Re-run it with extra scopes when a command answers 403 Forbidden", "Read-only scopes for looking, ReadWrite scopes only when you are about to change something"],
    parts: [["Connect-MgGraph", "the command: sign in to Graph"], ["-Scopes", "the parameter that lists the permissions you want"], ["User.Read.All", "read every user. Resource . Action . Range"], ["-NoWelcome", "skip the welcome text (handy in scripts)"]],
    flow: [["You", "kaatje@"], ["Browser sign-in", "password + MFA"], ["Token", "scopes inside"], ["Graph", "answers your commands"]],
    traps: [
      ["Not connected", "Any Mg command before connecting answers: Authentication needed. Please call Connect-MgGraph."],
      ["Scope names are exact", "User.Read.All is a real scope. Users.Read.All is not, and sign-in will fail on it."],
      ["Least privilege", "Asking for ReadWrite when you only read is how accidents happen. Start read-only, reconnect when you need more."],
      ["Mac + Exchange", "If you also use Exchange in the same window, connect to Graph first. The two modules can clash over a shared login library (the 'Method not found' error)."]
    ]
  },
  watch: [
    { code: "Get-MgUser -Top 3", say: "First, what happens if you skip signing in. Watch the error: Graph has no idea who you are yet." },
    { code: "Connect-MgGraph -Scopes User.Read.All -NoWelcome", say: "Now sign in, asking only for User.Read.All: read every user, change nothing. In real life a browser window pops up here for your password and MFA." },
    { code: "Get-MgUser -Top 3", say: "Same command, now it works. Nothing about the command changed, only the connection behind it." }
  ],
  trace: { ask: "Connect so you can read users, and nothing more.", tpl: "Connect-MgGraph -Scopes [[User.Read.All]] -NoWelcome", after: ["Get-MgUser -Top 3"], check: { fn: (ctx) => hasScope(ctx, "User.Read.All") && !hasScope(ctx, "User.ReadWrite.All") }, wrong: "The scope should let you read users and nothing more." },
  traceHints: ["Scopes read like Resource.Action.Range. Which resource are we reading?", "The resource is User, the action is Read, the range is All.", "Shape: User.____.All", "Answer: User.Read.All"],
  recall: { ask: "You need to read users and groups this session. The group scope is Group.Read.All. Connect with both, without the welcome text.", setup: "none", check: { fn: (ctx) => hasScope(ctx, "User.Read.All") && hasScope(ctx, "Group.Read.All") && !hasScope(ctx, "User.ReadWrite.All") }, wrong: "Connect with both read scopes." },
  recallHints: ["One -Scopes parameter can take several scopes.", "Separate them with a comma.", "Connect-MgGraph -Scopes ____,____ -NoWelcome", "Connect-MgGraph -Scopes User.Read.All,Group.Read.All -NoWelcome"],
  real: ["Open Terminal and type pwsh", "Install-Module Microsoft.Graph -Scope CurrentUser   (once per machine)", "Connect-MgGraph -Scopes User.Read.All", "Sign in with your admin account in the browser window"],
  cheat: [["Connect-MgGraph -Scopes User.Read.All -NoWelcome", "Sign in to Graph, read-only"], ["Connect-MgGraph -Scopes User.ReadWrite.All", "Sign in with permission to change users"], ["Disconnect-MgGraph", "Sign out when you are done"]]
},
{
  id: "context", seq: 0, name: "Get-MgContext", tag: "WHERE AM I", title: "Check who and where you are",
  summary: "Confirm the account, tenant and scopes before you run anything that matters.",
  setup: "read",
  brief: {
    what: [
      "Get-MgContext shows the connection you are holding right now: which account signed in, which tenant you are in, and which scopes the token carries.",
      "It is the PowerShell version of glancing at the badge on your lanyard before walking into a room. Admins who look after more than one tenant run it before every change. The scariest mistake is the right command in the wrong tenant."
    ],
    daily: ["Before any change: am I in the right tenant?", "When a command answers 403: which scopes do I actually have?", "In scripts: stop early if the context is not what you expect"],
    parts: [["Get-MgContext", "show the current Graph connection"], ["( ... ).Scopes", "run it, then take one property from the result"], ["Account / TenantId", "who you are and which tenant you are in"]],
    flow: [["Your session", "one connection"], ["Get-MgContext", "reads it"], ["Account", "who"], ["Scopes", "what you may do"]],
    traps: [
      ["Silence means not connected", "Get-MgContext prints nothing at all when you are not signed in. No error, just nothing."],
      ["Scopes add up", "Connecting again with a new scope keeps the old ones too. The list only grows until you disconnect."]
    ]
  },
  watch: [
    { code: "Get-MgContext", say: "The whole connection card. Account is you, TenantId is the tenant, Scopes is the list of permissions in your token." },
    { code: "(Get-MgContext).Account", say: "Brackets first run the command, then .Account takes one property from what came back. You will use this (command).Property shape constantly." },
    { code: "(Get-MgContext).Scopes", say: "And the scopes on their own. openid, profile, email and User.Read are added automatically at every sign-in." }
  ],
  trace: { ask: "Show only the tenant ID you are connected to.", tpl: "(Get-MgContext).[[TenantId]]", check: { out: "(Get-MgContext).TenantId" }, wrong: "Take only the tenant ID from the context." },
  traceHints: ["Which property in the card holds the tenant?", "Look at the names in the full Get-MgContext output.", "It is the one that starts with Tenant.", "Answer: (Get-MgContext).TenantId"],
  recall: { ask: "Show only the list of scopes your token holds.", setup: "read", check: { out: "(Get-MgContext).Scopes" }, wrong: "Show just the scopes list." },
  recallHints: ["Same shape as the last one: run it, then take one property.", "Brackets around the command, then a dot.", "(Get-MgContext).______", "(Get-MgContext).Scopes"],
  real: ["Connect-MgGraph -Scopes User.Read.All", "Get-MgContext", "Check that TenantId matches your organisation before you go further"],
  cheat: [["Get-MgContext", "Who am I, which tenant, which scopes"], ["(Get-MgContext).Scopes", "Just the permissions you hold"], ["(Get-MgContext).TenantId", "Just the tenant"]]
},
{
  id: "command", seq: 0, name: "Get-Command", tag: "FIND", title: "Find any command yourself",
  summary: "Stop guessing names. Search commands by word, verb or module.",
  setup: "read",
  brief: {
    what: [
      "Every PowerShell command is named <b>Verb-Noun</b>: Get-MgUser, Update-MgUser, Revoke-MgUserSignInSession. The verb says what it does (Get reads, Update changes, New creates, Remove deletes) and the noun says what it touches.",
      "Get-Command searches every command you have installed. With a wildcard (*) you can find a command when you only know one word of it. This is the skill that lets you work without memorising everything: you only need to remember how to look."
    ],
    daily: ["\"Is there a command for licenses?\" Get-Command *License*", "\"What can I do to users?\" Get-Command -Module Microsoft.Graph.Users", "\"How do I change something?\" Get-Command -Verb Update"],
    parts: [["Get-Command", "list commands"], ["*License*", "wildcard: anything, then License, then anything"], ["-Module", "only commands from one module"], ["-Verb Update", "only commands that start with Update-"]],
    flow: [["Your question", "one word"], ["Get-Command", "searches installed modules"], ["Matches", "names + module"], ["Get-Help", "learn the one you need"]],
    traps: [
      ["Verb-Noun, singular", "The noun is singular: Get-MgUser, never Get-MgUsers."],
      ["Lab vs real", "The real Microsoft.Graph.Users module holds well over a hundred commands. This lab only lists the ones it can simulate, so expect much longer lists at work."],
      ["Not installed = not found", "Get-Command only sees installed modules. If nothing shows, Install-Module may still be missing."]
    ]
  },
  watch: [
    { code: "Get-Command *MgUser*", say: "Everything with MgUser in its name. The stars mean: anything before, anything after." },
    { code: "Get-Command -Module Microsoft.Graph.Users", say: "Or everything one module offers. The Source column tells you which module a command lives in." },
    { code: "Get-Command -Module Microsoft.Graph.Users -Verb Update", say: "Narrow it down by verb. Update is how Graph commands change things." }
  ],
  trace: { ask: "List every command in the Microsoft.Graph.Users module.", tpl: "Get-Command -Module [[Microsoft.Graph.Users]]", check: { out: "Get-Command -Module Microsoft.Graph.Users" }, wrong: "List the commands of the Users module." },
  traceHints: ["Module names start with Microsoft.Graph.", "The part after that is the area: Users.", "Microsoft.Graph.____", "Answer: Microsoft.Graph.Users"],
  recall: { ask: "Find every command with License anywhere in its name.", setup: "read", check: { out: "Get-Command *License*" }, wrong: "Search with wildcards on both sides of License." },
  recallHints: ["You only know one word. Which character means 'anything'?", "Put a star before and after the word.", "Get-Command *_______*", "Get-Command *License*"],
  real: ["Get-Command -Module Microsoft.Graph.Users | Measure-Object", "Notice how many more commands the real module has", "Get-Command *SignIn*"],
  cheat: [["Get-Command *word*", "Find commands containing a word"], ["Get-Command -Module Microsoft.Graph.Users", "Everything in one module"], ["Get-Command -Verb Update", "Everything that changes something"]]
},
{
  id: "help", seq: 0, name: "Get-Help", tag: "LEARN", title: "Learn a command from its examples",
  summary: "Jump straight to working examples instead of reading the whole manual.",
  setup: "read",
  brief: {
    what: [
      "Get-Help shows the manual for a command. The fastest part is <b>-Examples</b>: real, copyable lines that show the command doing the thing you want.",
      "The habit: find with Get-Command, learn with Get-Help -Examples, then try it with -WhatIf before you change anything for real."
    ],
    daily: ["Before using a command you have not touched in a while", "To see which parameter does what", "To copy a working example and adapt it"],
    parts: [["Get-Help", "show the manual"], ["Update-MgUser", "which command you want help for"], ["-Examples", "only the examples section"]],
    flow: [["Get-Command", "found it"], ["Get-Help -Examples", "see it working"], ["-WhatIf", "rehearse"], ["Run it", "for real"]],
    traps: [
      ["Graph help is thin", "The Graph SDK's built-in help is generated and often short. Get-Help <command> -Online opens the full page on learn.microsoft.com in your browser."],
      ["Update-Help", "On a fresh machine help can be missing. Update-Help downloads it (run once, as admin on Windows)."]
    ]
  },
  watch: [
    { code: "Get-Help Get-MgUser -Examples", say: "Examples only. Each one has a title, the line itself, and why it works." },
    { code: "Get-Help Revoke-MgUserSignInSession -Examples", say: "Works for any command. This one you will meet later in this sequence." }
  ],
  trace: { ask: "Show the examples for Update-MgUser.", tpl: "Get-Help Update-MgUser -[[Examples]]", check: { out: "Get-Help Update-MgUser -Examples" }, wrong: "Ask for the examples section only." },
  traceHints: ["Which part of the manual do you want?", "It is a switch, so just the name with a dash.", "-E_______", "Answer: -Examples"],
  recall: { ask: "Show the examples for Connect-MgGraph.", setup: "read", check: { out: "Get-Help Connect-MgGraph -Examples" }, wrong: "Show only the Connect-MgGraph examples." },
  recallHints: ["Same command as before, different target.", "Get-Help, then the command name, then the switch.", "Get-Help ______________ -Examples", "Get-Help Connect-MgGraph -Examples"],
  real: ["Get-Help Get-MgUser -Online", "Read the page that opens and find the -Filter examples"],
  cheat: [["Get-Help Get-MgUser -Examples", "Working examples only"], ["Get-Help Get-MgUser -Online", "Full docs in the browser"]]
},
{
  id: "member", seq: 0, name: "Get-Member", tag: "LOOK INSIDE", title: "See inside an object",
  summary: "PowerShell hands you objects, not text. Get-Member shows what they hold.",
  setup: "read",
  brief: {
    what: [
      "When Get-MgUser answers, it does not send back text. It sends back <b>objects</b>: one per user, each with dozens of named <b>properties</b> (DisplayName, Department, AccountEnabled, ...). The table you see is just a small preview of them.",
      "Pipe any result into Get-Member and you get the full list of properties, with their type. That list is the menu of everything you can filter, select or change."
    ],
    daily: ["\"What is the property for the office called again?\"", "Before writing a filter: is it a text, a number or a true/false?", "When a column comes back empty and you want to know if it even exists"],
    parts: [["Get-MgUser -Top 1", "get one user object"], ["|", "pipe: hand it to the next command"], ["Get-Member", "list its properties and methods"], ["-MemberType Property", "only the properties"]],
    flow: [["Get-MgUser", "an object"], ["|", "pipe"], ["Get-Member", "inspects it"], ["Property list", "your menu"]],
    traps: [
      ["Listed is not filled", "Get-Member shows every property a user can have, even ones Graph did not fill in. Empty values come later in the Users sequence."],
      ["Types matter", "System.Nullable[bool] means true/false. That is why you compare it with $false, not 'false'."]
    ]
  },
  watch: [
    { code: "Get-MgUser -Top 1 | Get-Member -MemberType Property", say: "One user goes down the pipe. Get-Member lists every property, and the Definition column tells you its type." },
    { code: "Get-MgContext | Get-Member", say: "Works on anything. This is the connection object from earlier, with its methods too." }
  ],
  trace: { ask: "Hand one user to Get-Member.", tpl: "Get-MgUser -Top 1 | [[Get-Member]]", check: { out: "Get-MgUser -Top 1 | Get-Member" }, wrong: "Pipe the user into the command that lists members." },
  traceHints: ["Which command lists what is inside an object?", "Its noun is Member.", "Get-______", "Answer: Get-Member"],
  recall: { ask: "List only the properties of the Get-MgContext object.", setup: "read", check: { out: "Get-MgContext | Get-Member -MemberType Property" }, wrong: "Pipe the context into Get-Member and keep only properties." },
  recallHints: ["Start with the object you want to inspect.", "Pipe it into Get-Member.", "Get-MgContext | Get-Member -MemberType ________", "Get-MgContext | Get-Member -MemberType Property"],
  real: ["Get-MgUser -Top 1 | Get-Member -MemberType Property", "Find the property that holds the office location"],
  cheat: [["<command> | Get-Member", "What is inside this object"], ["<command> | Get-Member -MemberType Property", "Only the properties"]]
},
{
  id: "exo", seq: 0, name: "Connect-ExchangeOnline", tag: "SECOND DOOR", title: "Connect to Exchange the right way",
  summary: "Exchange is a separate connection. Graph first, then Exchange, quietly.",
  setup: "read",
  brief: {
    what: [
      "Mailboxes live in Exchange Online, which has its own module (ExchangeOnlineManagement) and its own connection. Being signed in to Graph does not sign you in to Exchange.",
      "Connect-ExchangeOnline signs you in there. Its fast, modern commands start with <b>Get-EXO</b> (Get-EXOMailbox). On a Mac, connect to Graph <b>first</b>, then Exchange, in a fresh window: the two modules share a login library, and loading Exchange first can break Graph sign-in."
    ],
    daily: ["Any mailbox, permission or mail-flow task", "Scripts that touch both users (Graph) and mailboxes (Exchange)", "End with Disconnect-ExchangeOnline -Confirm:$false so sessions do not pile up"],
    parts: [["Connect-ExchangeOnline", "sign in to Exchange Online"], ["-ShowBanner:$false", "a switch set to false: hide the long banner"], ["Get-EXOMailbox", "the fast, REST-based mailbox command"]],
    flow: [["Graph", "connected first"], ["Connect-ExchangeOnline", "second sign-in"], ["Exchange", "mailboxes"], ["Disconnect", "when done"]],
    traps: [
      ["Not connected", "Get-EXOMailbox before connecting answers: You must call the Connect-ExchangeOnline cmdlet before calling any other cmdlets."],
      ["Switch values need a colon and a $", "-ShowBanner:$false works. -ShowBanner:false fails: false without $ is text, and a switch only accepts true/false or 1/0."],
      ["Order on Mac", "Graph first, then Exchange. If Graph breaks with 'Method not found ... WithLogging', close the window and start over in that order."]
    ]
  },
  watch: [
    { code: "Get-EXOMailbox -ResultSize 2", say: "Signed in to Graph is not signed in to Exchange. Read the error: it tells you exactly what to do." },
    { code: "Connect-ExchangeOnline -ShowBanner:$false", say: "Connect quietly. The colon glues the value to the switch, and $false is the real false value." },
    { code: "Get-EXOMailbox -ResultSize 2", say: "Now Exchange answers. -ResultSize limits how many come back, like -Top in Graph." }
  ],
  trace: { ask: "Connect to Exchange without the banner.", tpl: "Connect-ExchangeOnline -ShowBanner:[[$false]]", check: { fn: (ctx, res) => ctx.exo && !res.host.some((h) => /V3 EXO/.test(h.text || "")) }, wrong: "Connect, and hide the banner." },
  traceHints: ["The switch wants a true/false value.", "True/false values in PowerShell start with a special character.", "-ShowBanner:$_____", "Answer: -ShowBanner:$false"],
  recall: { ask: "Connect to Exchange quietly, then list 3 mailboxes with Get-EXOMailbox.", setup: "read", check: { out: "Get-EXOMailbox -ResultSize 3", needExo: true }, wrong: "Connect first, then ask for exactly 3 mailboxes." },
  recallHints: ["Two commands. Which one has to come first?", "Connect quietly, then the mailbox command.", "Get-EXOMailbox -__________ 3", "Connect-ExchangeOnline -ShowBanner:$false, then Get-EXOMailbox -ResultSize 3"],
  real: ["Install-Module ExchangeOnlineManagement -Scope CurrentUser   (once)", "In a fresh pwsh window: Connect-MgGraph -Scopes User.Read.All", "Connect-ExchangeOnline -ShowBanner:$false", "Get-EXOMailbox -ResultSize 3", "Disconnect-ExchangeOnline -Confirm:$false"],
  cheat: [["Connect-ExchangeOnline -ShowBanner:$false", "Sign in to Exchange quietly"], ["Get-EXOMailbox -ResultSize 3", "A few mailboxes"], ["Disconnect-ExchangeOnline -Confirm:$false", "Sign out without a prompt"]]
},
{
  id: "getuser", seq: 1, name: "Get-MgUser -UserId", tag: "LOOK UP", title: "Look up one person",
  summary: "Fetch a single user by their sign-in name.",
  setup: "read",
  brief: {
    what: [
      "Most tickets start with one person: \"Can you check Corvin's account?\" Get-MgUser -UserId fetches exactly one user. You give it their <b>UPN</b> or their object Id. The UPN (UserPrincipalName) is the sign-in name that looks like an email address.",
      "At Halvard & Co every UPN follows the same pattern: <b>firstname.lastname@halvardco.onmicrosoft.com</b>. Most tenants have a pattern like this, so learning it saves you a search every time."
    ],
    daily: ["The first step of nearly every user ticket", "Checking that an account exists before you change it", "Getting the object Id other commands ask for"],
    parts: [["Get-MgUser", "read users from Entra ID"], ["-UserId", "which one: UPN or object Id"], ["corvin.ashby@halvardco.onmicrosoft.com", "the UPN"]],
    flow: [["Ticket", "\"check Corvin\""], ["UPN", "firstname.lastname@"], ["Get-MgUser -UserId", "one request"], ["One user", "or a 404"]],
    traps: [
      ["404 is a typo, usually", "Resource '...' does not exist means Graph found no one with that exact UPN. Check the spelling before anything else."],
      ["Guests look different", "A guest's UPN looks like name_theirdomain.com#EXT#@yourtenant. Look those up with -Filter instead."],
      ["Mail is not always the UPN", "The email address and the sign-in name are usually the same, but not always. -UserId wants the UPN."]
    ]
  },
  watch: [
    { code: "Get-MgUser -UserId " + U("elowen.thistle"), say: "One user, by UPN. You get the default columns: DisplayName, Id, Mail, UserPrincipalName." },
    { code: "Get-MgUser -UserId " + U("elowen.thistel"), say: "One letter swapped. Graph answers 404: nobody by that exact name. Always suspect spelling first." }
  ],
  trace: { ask: "Look up Corvin Ashby.", tpl: "Get-MgUser -UserId [[corvin.ashby]]@" + DOMAIN, check: { out: "Get-MgUser -UserId " + U("corvin.ashby") }, wrong: "Look up Corvin by his UPN." },
  traceHints: ["UPNs here are firstname.lastname.", "All lower case, a dot between the names.", "______.______@" + DOMAIN, "Answer: corvin.ashby"],
  recall: { ask: "HR asks about Seren Blackwood. Look her up.", setup: "read", check: { out: "Get-MgUser -UserId " + U("seren.blackwood") }, wrong: "Look up Seren with her full UPN." },
  recallHints: ["Same command, new person.", "Build her UPN from the pattern.", "Get-MgUser -UserId seren.______@" + DOMAIN, "Get-MgUser -UserId seren.blackwood@" + DOMAIN],
  real: ["Connect-MgGraph -Scopes User.Read.All", "Get-MgUser -UserId <your own UPN>", "Then look up a colleague you work with"],
  cheat: [["Get-MgUser -UserId first.last@domain", "One user by sign-in name"], ["Get-MgUser -UserId <object-id>", "One user by Id"]]
},
{
  id: "property", seq: 1, name: "-Property", tag: "ASK FOR IT", title: "Ask for what you need, show what you need",
  summary: "Graph only fills the properties you request. Then Select-Object picks the columns.",
  setup: "read",
  brief: {
    what: [
      "This is the most important Graph habit, and the one that catches everyone. To stay fast, Graph only sends a handful of properties by default. Ask for Department and you get an empty column, with <b>no error</b>, unless you requested it with <b>-Property</b>.",
      "Two steps, two jobs: <b>-Property</b> tells Graph what to send. <b>Select-Object</b> decides which columns you see. You usually need both, naming the same properties."
    ],
    daily: ["\"What department is Brannoc in?\"", "\"Is this account enabled?\" (AccountEnabled is not sent by default)", "Every report you will ever build"],
    parts: [["-Property DisplayName,Department", "Graph: please send these"], ["|", "hand the user on"], ["Select-Object DisplayName,Department", "show only these columns"]],
    flow: [["Get-MgUser", "-Property asks"], ["Graph", "fills those fields"], ["|", "pipe"], ["Select-Object", "picks the columns"]],
    traps: [
      ["Empty is not false", "Without -Property AccountEnabled the value is empty ($null). Filters on it then match nobody, silently."],
      ["Select-Object cannot fetch", "Selecting a property you did not request just shows an empty column."],
      ["Names", "-Property uses the same names Get-Member shows: Department, JobTitle, AccountEnabled, OfficeLocation."]
    ]
  },
  watch: [
    { code: "Get-MgUser -UserId " + U("elowen.thistle") + " | Select-Object DisplayName,Department", say: "Department comes back empty. No error, no warning. Graph simply did not send it." },
    { code: "Get-MgUser -UserId " + U("elowen.thistle") + " -Property DisplayName,Department | Select-Object DisplayName,Department", say: "Ask for it with -Property, and it is there. Same Select-Object, different result." }
  ],
  trace: { ask: "Show Corvin's display name and job title.", tpl: "Get-MgUser -UserId " + U("corvin.ashby") + " -Property DisplayName,[[JobTitle]] | Select-Object DisplayName,JobTitle", check: { out: "Get-MgUser -UserId " + U("corvin.ashby") + " -Property DisplayName,JobTitle | Select-Object DisplayName,JobTitle" }, wrong: "Request the same property you select." },
  traceHints: ["What you select must also be requested.", "Look at what Select-Object asks for at the end.", "-Property DisplayName,J_______", "Answer: JobTitle"],
  recall: { ask: "Is Brannoc Vale's account enabled, and what department is he in? Show DisplayName, Department and AccountEnabled.", setup: "read", check: { out: "Get-MgUser -UserId " + U("brannoc.vale") + " -Property DisplayName,Department,AccountEnabled | Select-Object DisplayName,Department,AccountEnabled" }, wrong: "Request all three properties, then select the same three." },
  recallHints: ["Two places need the property names.", "-Property asks Graph, Select-Object shows them.", "Get-MgUser -UserId brannoc.vale@... -Property A,B,C | Select-Object A,B,C", "Get-MgUser -UserId " + U("brannoc.vale") + " -Property DisplayName,Department,AccountEnabled | Select-Object DisplayName,Department,AccountEnabled"],
  real: ["Get-MgUser -UserId <your UPN> | Select-Object DisplayName,Department", "Notice the empty Department", "Run it again with -Property DisplayName,Department"],
  cheat: [["Get-MgUser -UserId x -Property A,B | Select-Object A,B", "Request and show the same properties"], ["-Property AccountEnabled", "Needed before you can check if an account is on"]]
},
{
  id: "filter", seq: 1, name: "-Filter", tag: "SEARCH", title: "Let Graph do the searching",
  summary: "Find people by department or name prefix, filtered on the server.",
  setup: "read",
  brief: {
    what: [
      "When you do not know the exact person, search. <b>-Filter</b> sends your condition to Graph, and Graph returns only the matches. That is far faster than downloading every user and sorting through them yourself, which matters in a tenant with 5,000 people.",
      "The filter is written in <b>OData</b>, Graph's query language, not in PowerShell: the property name, <b>eq</b> (equals), and the value in single quotes. For \"starts with\" there is a function: <b>startswith(displayName,'Ro')</b>. The whole filter goes inside double quotes."
    ],
    daily: ["\"Who is in Finance?\"", "\"I only know her first name starts with Is\"", "\"List all guests\" with userType eq 'Guest'"],
    parts: [["-Filter \"...\"", "the whole condition, in double quotes"], ["department", "the property (OData style)"], ["eq", "equals (OData, not -eq)"], ["'IT'", "the value, in single quotes"]],
    flow: [["Your condition", "OData"], ["Graph", "filters on the server"], ["Only matches", "travel back"], ["You", "fast"]],
    traps: [
      ["Quotes inside quotes", "\"department eq 'IT'\" works. \"department eq IT\" is a 400 Bad Request: the value needs single quotes."],
      ["eq, not -eq", "OData uses eq, ne, startswith. PowerShell's -eq belongs in Where-Object, later."],
      ["Advanced queries", "ne, endswith and counting need -ConsistencyLevel eventual. Without it Graph answers Request_UnsupportedQuery."]
    ]
  },
  watch: [
    { code: "Get-MgUser -Filter \"department eq 'IT'\" -Property DisplayName,Department | Select-Object DisplayName,Department", say: "Everyone in IT, filtered by Graph. Note the -Property again, so Department is filled in." },
    { code: "Get-MgUser -Filter \"startswith(displayName,'El')\"", say: "Name starts with El. Handy when someone says \"it's Ela-something from Sales\"." },
    { code: "Get-MgUser -Filter \"department eq IT\"", say: "Forget the single quotes and Graph refuses the whole query with a 400." }
  ],
  trace: { ask: "Find everyone in Sales.", tpl: "Get-MgUser -Filter \"department eq '[[Sales]]'\"", check: { out: "Get-MgUser -Filter \"department eq 'Sales'\"" }, wrong: "Filter on the Sales department." },
  traceHints: ["Which department do you want?", "The value goes between the single quotes.", "department eq '_____'", "Answer: Sales"],
  recall: { ask: "Someone from Operations called. You only caught that his name starts with Ro. Find him.", setup: "read", check: { out: "Get-MgUser -Filter \"startswith(displayName,'Ro')\"" }, wrong: "Use the starts-with function on displayName." },
  recallHints: ["You know the start of the name, not the whole name.", "OData has a function for that.", "-Filter \"startswith(displayName,'__')\"", "Get-MgUser -Filter \"startswith(displayName,'Ro')\""],
  real: ["Get-MgUser -Filter \"department eq 'IT'\" -Property DisplayName,Department | Select-Object DisplayName,Department", "Try your own department name"],
  cheat: [["Get-MgUser -Filter \"department eq 'IT'\"", "Everyone in a department"], ["Get-MgUser -Filter \"startswith(displayName,'Ro')\"", "Name starts with"], ["Get-MgUser -Filter \"userType eq 'Guest'\" -All", "All guests"]]
},
{
  id: "count", seq: 1, name: "-All & .Count", tag: "HOW MANY", title: "Get everyone, then count",
  summary: "Without -All you only get the first page. Then count the results.",
  setup: "read",
  brief: {
    what: [
      "Graph hands out results in <b>pages</b>. Get-MgUser without -All returns only the first page (100 users). In a small tenant you will not notice; in a real one your report is quietly wrong. <b>-All</b> follows every page until there are no more.",
      "Wrap the command in brackets and add <b>.Count</b> to count what came back. It is the quickest answer to \"how many?\", and the first sanity check before any bulk change: if you expect 12 people and the count says 340, stop."
    ],
    daily: ["\"How many guests do we have?\"", "Checking a filter before a bulk change", "Comparing a report to what HR says"],
    parts: [["( ... )", "run the command first"], ["-All", "every page, not just the first 100"], [".Count", "how many objects came back"]],
    flow: [["Page 1", "100 users"], ["Page 2", "next 100"], ["-All", "keeps going"], [".Count", "one number"]],
    traps: [
      ["The silent 100", "Without -All, counts and reports stop at 100 without telling you."],
      ["-Top vs -All", "-Top 5 is for a quick look. -All is for anything you report on."],
      ["Zero is a valid answer", "A typo in a filter often returns 0, not an error. Sanity-check numbers that look too small."]
    ]
  },
  watch: [
    { code: "(Get-MgUser -All).Count", say: "Every account in the tenant: members and guests together." },
    { code: "(Get-MgUser -All -Filter \"department eq 'Finance'\").Count", say: "Filter plus count: how many people Finance has." }
  ],
  trace: { ask: "How many people work in Operations?", tpl: "(Get-MgUser -All -Filter \"department eq 'Operations'\").[[Count]]", check: { out: "(Get-MgUser -All -Filter \"department eq 'Operations'\").Count" }, wrong: "Count what the filter returns." },
  traceHints: ["Which property tells you how many items a list holds?", "It is a property of the whole result, not of one user.", ".C____", "Answer: .Count"],
  recall: { ask: "Security wants to know: how many guest accounts are in the tenant?", setup: "read", check: { fn: (ctx, res) => { const v = res.out.length === 1 ? res.out[0] : null; return v === 3 || (v && v.Count === 3); } }, wrong: "Filter on guests, get every page, count them." },
  recallHints: ["Guests are users whose userType is Guest.", "Filter, -All, then count.", "(Get-MgUser -All -Filter \"userType eq '_____'\").Count", "(Get-MgUser -All -Filter \"userType eq 'Guest'\").Count"],
  real: ["(Get-MgUser -All).Count", "(Get-MgUser).Count", "If the second one says 100, that is the page limit you just learned about"],
  cheat: [["(Get-MgUser -All).Count", "Total accounts"], ["(Get-MgUser -All -Filter \"...\").Count", "How many match"]]
},
{
  id: "update", seq: 1, name: "Update-MgUser", tag: "CHANGE", title: "Change a user's details",
  summary: "Fix a title or department. Needs write permission, and prints nothing when it works.",
  setup: "read",
  brief: {
    what: [
      "Update-MgUser changes properties on a user: job title, department, office, phone, usage location. It is the command behind half of all HR tickets: \"Petrel moved to Marketing\", \"Corvin is now Head of Sales\".",
      "Two things surprise people. First, your read-only connection is not enough: Graph answers <b>403 Forbidden</b> until you reconnect with <b>User.ReadWrite.All</b>. Second, when it works it prints <b>nothing</b>. Silence is success, so you check the result yourself with Get-MgUser."
    ],
    daily: ["Department or title changes from HR", "Fixing typos in display names", "Setting UsageLocation before giving someone a license"],
    parts: [["Update-MgUser", "change a user"], ["-UserId", "who"], ["-Department Marketing", "property name as parameter, new value after it"], ["-WhatIf", "rehearse: show what would happen"]],
    flow: [["Read scope", "403 Forbidden"], ["Reconnect", "User.ReadWrite.All"], ["Update-MgUser", "silent success"], ["Get-MgUser", "verify"]],
    traps: [
      ["403 Forbidden", "Insufficient privileges means the token lacks a write scope. Reconnect with User.ReadWrite.All."],
      ["Spaces need quotes", "-JobTitle Head of Sales breaks into three arguments. Write -JobTitle \"Head of Sales\"."],
      ["Verify", "No output is normal. Always read the user back to confirm."]
    ]
  },
  watch: [
    { code: "Update-MgUser -UserId " + U("corvin.ashby") + " -Department Marketing", say: "Read-only token, so Graph refuses. 403 always means: right command, wrong permissions." },
    { code: "Connect-MgGraph -Scopes User.ReadWrite.All -NoWelcome", say: "Reconnect with write permission. Your old scopes stay; this one is added." },
    { code: "Update-MgUser -UserId " + U("corvin.ashby") + " -Department Marketing", say: "Silence. That is what success looks like." },
    { code: "Get-MgUser -UserId " + U("corvin.ashby") + " -Property DisplayName,Department | Select-Object DisplayName,Department", say: "And the habit: read it back to prove it." }
  ],
  trace: { ask: "You are already allowed to write. Change Elara Wynn's job title to Account Manager.", setup: "write", tpl: "Update-MgUser -UserId " + U("elara.wynn") + " -[[JobTitle]] \"Account Manager\"", check: { fn: (ctx) => userOf(ctx, "elara.wynn").JobTitle === "Account Manager" }, wrong: "Use the parameter for the job title." },
  traceHints: ["The parameter has the same name as the property.", "Get-Member on a user lists it.", "-J_______", "Answer: -JobTitle"],
  recall: { ask: "HR ticket: Petrel Lindgrove moved to Marketing as Marketing Coordinator. Update both. You start with a read-only connection.", setup: "read", check: { fn: (ctx) => { const u = userOf(ctx, "petrel.lindgrove"); return u.Department === "Marketing" && u.JobTitle === "Marketing Coordinator"; } }, wrong: "Both the department and the title have to change." },
  recallHints: ["Your first attempt will answer 403. What do you need first?", "Reconnect with User.ReadWrite.All, then one Update-MgUser can set both.", "Update-MgUser -UserId petrel.lindgrove@... -Department ________ -JobTitle \"________ ___________\"", "Connect-MgGraph -Scopes User.ReadWrite.All, then Update-MgUser -UserId " + U("petrel.lindgrove") + " -Department Marketing -JobTitle \"Marketing Coordinator\""],
  real: ["Read-only first: Get-MgUser -UserId <test user> -Property JobTitle | Select-Object JobTitle", "Only on a test account: Update-MgUser -UserId <test user> -JobTitle \"Test\" -WhatIf", "Remove -WhatIf only if you are allowed to change that account"],
  cheat: [["Connect-MgGraph -Scopes User.ReadWrite.All", "Permission to change users"], ["Update-MgUser -UserId x -Department Marketing", "Change one property"], ["Update-MgUser -UserId x -JobTitle \"Head of Sales\" -WhatIf", "Rehearse a change"]]
},
{
  id: "block", seq: 1, name: "Block & revoke", tag: "LOCK OUT", title: "Lock out someone who left",
  summary: "Block new sign-ins, then kill the sessions they already have.",
  setup: "write",
  brief: {
    what: [
      "When someone leaves, or an account looks compromised, you lock it in two moves. <b>Update-MgUser -AccountEnabled:$false</b> blocks new sign-ins. But phones and laptops already signed in keep a refresh token that can work for a long time. <b>Revoke-MgUserSignInSession</b> invalidates those, forcing every device to sign in again, which now fails.",
      "Order matters: block first, then revoke. Revoke first and a device can quietly sign back in during the gap. And with a <b>switch</b> like -AccountEnabled, the value is glued on with a colon: <b>-AccountEnabled:$false</b>."
    ],
    daily: ["Leavers, especially sudden ones", "The first two steps when an account is compromised", "Temporarily pausing an account (enable it again with :$true)"],
    parts: [["-AccountEnabled:$false", "switch with a glued-on value: turn sign-in off"], ["Revoke-MgUserSignInSession", "invalidate existing refresh tokens"], ["True", "what Revoke prints when it worked"]],
    flow: [["Block", "-AccountEnabled:$false"], ["Revoke", "kill sessions"], ["Verify", "AccountEnabled False"], ["Mailbox", "kept for now"]],
    traps: [
      ["The space trap", "-AccountEnabled $false (space, no colon) fails with: A positional parameter cannot be found that accepts argument 'False'."],
      ["The text trap", "-AccountEnabled:false (no $) fails: Boolean parameters accept only Boolean values."],
      ["Not instant", "Access tokens already handed out can stay valid for up to about an hour after revoking. Revoking still shortens that window dramatically."],
      ["Do not delete", "Blocking keeps the mailbox and OneDrive for the handover. Deleting is a separate, later decision."]
    ]
  },
  watch: [
    { code: "Update-MgUser -UserId " + U("brannoc.vale") + " -AccountEnabled:$false -WhatIf", say: "Rehearse first. -WhatIf describes the change and does nothing." },
    { code: "Update-MgUser -UserId " + U("brannoc.vale") + " -AccountEnabled:$false", say: "Block. Silent success, as before." },
    { code: "Revoke-MgUserSignInSession -UserId " + U("brannoc.vale"), say: "Then revoke. This one does answer: True means every refresh token was invalidated." },
    { code: "Get-MgUser -UserId " + U("brannoc.vale") + " -Property DisplayName,AccountEnabled | Select-Object DisplayName,AccountEnabled", say: "Verify. AccountEnabled is False." }
  ],
  trace: { ask: "Torin Ash just left. Block him (the revoke line is already written).", tpl: "Update-MgUser -UserId " + U("torin.ash") + " -AccountEnabled:[[$false]]", after: ["Revoke-MgUserSignInSession -UserId " + U("torin.ash")], check: { fn: (ctx) => userOf(ctx, "torin.ash").AccountEnabled === false }, wrong: "Glue the false value onto the switch." },
  traceHints: ["After the colon comes a true/false value.", "Which one turns sign-in off?", "-AccountEnabled:$_____", "Answer: -AccountEnabled:$false"],
  recall: { ask: "Kestrel Wade left this morning. Block his sign-in and kill his existing sessions, in the right order.", setup: "write", check: { fn: (ctx) => { const u = userOf(ctx, "kestrel.wade"); const r = ctx.t.revoked && ctx.t.revoked[U("kestrel.wade")]; return u.AccountEnabled === false && !!r && r.afterBlock; } }, wrong: "Block first, then revoke." },
  recallHints: ["Two commands. Which one stops new sign-ins?", "Block with Update-MgUser, then revoke.", "Update-MgUser -UserId kestrel.wade@... -AccountEnabled:$false   then   Revoke-MgUserSignInSession -UserId ...", "Update-MgUser -UserId " + U("kestrel.wade") + " -AccountEnabled:$false, then Revoke-MgUserSignInSession -UserId " + U("kestrel.wade")],
  real: ["Only on a test account you own", "Update-MgUser -UserId <test user> -AccountEnabled:$false -WhatIf", "Revoke-MgUserSignInSession -UserId <test user> -WhatIf"],
  cheat: [["Update-MgUser -UserId x -AccountEnabled:$false", "Block sign-in"], ["Revoke-MgUserSignInSession -UserId x", "Kill existing sessions"], ["Update-MgUser -UserId x -AccountEnabled:$true", "Unblock"]]
}
];

const GATE = {
  id: "halvard", name: "Halvard & Co", seq: 1,
  story: "A logistics firm just joined the group. Their IT person left last month and nobody documented anything. Today is your first day in their tenant. Five tickets are waiting. Use only what you learned in Connect and Users.",
  tickets: [
    { id: "t1", from: "You", title: "Get in, read-only", body: "Connect to the tenant with read permission only, and confirm which account and tenant you are using.", hint: "Connect-MgGraph with a read scope, then Get-MgContext.",
      check: (ctx, hist) => hasScope(ctx, "User.Read.All") && hist.some((h) => /^\s*\(?\s*get-mgcontext/i.test(h)) },
    { id: "t2", from: "Group HR", title: "Who runs IT?", body: "The org chart is gone. Find who has the job title IT Lead and show their DisplayName and JobTitle.", hint: "-Filter on jobTitle, request JobTitle with -Property, then select both.",
      check: (ctx, hist, res) => res && res.out.length >= 1 && res.out.length <= 3 && res.out.some((o) => o && o.DisplayName === "Elowen Thistle" && o.JobTitle === "IT Lead") },
    { id: "t3", from: "Group finance", title: "How many disabled accounts?", body: "Finance is paying for licenses. How many accounts are disabled right now? A single number, please.", hint: "Filter accountEnabled eq false, get all, count.",
      check: (ctx, hist, res) => { const n = ctx.t.users.filter((u) => u.AccountEnabled === false).length; return res && res.out.length === 1 && (res.out[0] === n || (res.out[0] && res.out[0].Count === n)); } },
    { id: "t4", from: "Halvard HR", title: "Corvin moved to Marketing", body: "Corvin Ashby is now in Marketing, same job title. Update his department.", hint: "Write permission first, then Update-MgUser -Department.",
      check: (ctx) => userOf(ctx, "corvin.ashby").Department === "Marketing" },
    { id: "t5", from: "Halvard HR", title: "Liora left in a hurry", body: "Liora Pennywhistle (Recruiter) walked out this morning and still has the company phone. Lock her out properly.", hint: "Block, then revoke.",
      check: (ctx) => { const r = ctx.t.revoked && ctx.t.revoked[U("liora.pennywhistle")]; return userOf(ctx, "liora.pennywhistle").AccountEnabled === false && !!r && r.afterBlock; } }
  ]
};

const ERR_HELP = [
  [/Authentication needed/i, "Not connected yet. Every Mg command needs Connect-MgGraph first."],
  [/Insufficient privileges|403/i, "You are connected, but your token has no scope that allows this. Reconnect with the scope that fits, for changes usually User.ReadWrite.All."],
  [/You must call the Connect-ExchangeOnline/i, "Exchange is a separate door. Run Connect-ExchangeOnline first."],
  [/positional parameter cannot be found that accepts argument 'False'|positional parameter cannot be found that accepts argument 'True'/i, "A switch takes its value glued on with a colon: -AccountEnabled:$false. With a space, PowerShell sees $false as a separate, unexpected argument."],
  [/Boolean parameters accept only Boolean/i, "false without $ is just text. Switches want $true or $false."],
  [/value expression following/i, "PowerShell could not read the right side of the comparison. True and false need a $ in front: $true, $false."],
  [/does not exist or one of its queried/i, "Graph found nobody with that exact name. Check the UPN spelling: firstname.lastname@" + DOMAIN + "."],
  [/The term '(Get|Set|Add|Remove|New)-(Mailbox|MailboxPermission|RecipientPermission|MailboxAutoReplyConfiguration|DistributionGroup|DistributionGroupMember)' is not recognized/i, "That is an Exchange session command. It only exists after Connect-ExchangeOnline: the module creates it when you connect."],
  [/is not recognized as a name of a cmdlet/i, "That command name does not exist. Get-Command *word* finds the real name."],
  [/Invalid filter clause|BadRequest/i, "The OData filter could not be read. The value needs single quotes, the whole filter double quotes: \"department eq 'IT'\"."],
  [/UnsupportedQuery/i, "That filter needs an advanced query: add -ConsistencyLevel eventual."]
];
