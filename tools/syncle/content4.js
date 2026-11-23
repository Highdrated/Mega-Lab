SEQUENCES[7].open = true; SEQUENCES[8].open = true;
const ATT = "185.220.101.47";
const RW = U("rowenna.harthorn"), TG = U("theodwyn.gallow");
const WEEK = "-StartDate (Get-Date).AddDays(-7) -EndDate (Get-Date)";
const ruleOf = (ctx, mb, name) => ctx.t.rules.find((r) => r.mb === mb && r.Name === name);
const methodsOf = (ctx, n) => ctx.t.auth[U(n)] || [];
const STORY7 = "Monday, 08:40. Hesper (CFO) forwards you a mail: Rowenna Harthorn from Operations asked Finance to change Wyrmlight Logistics' bank details. Rowenna has not worked a shift in three months.";

MEMORIES.push(
{
  id: "signins", seq: 7, name: "Get-MgAuditLogSignIn", tag: "SIGN-IN LOG", title: "Who signed in, from where, and did it work?",
  summary: "Every sign-in is logged with time, app, IP, country and result. Read it, filter it on the server, pull the nested parts up.",
  setup: "inv",
  brief: {
    what: [
      STORY7,
      "Every sign-in to Entra ID lands in the <b>sign-in log</b>: who, when, which app, from which IP, which country, and whether it worked. <b>Get-MgAuditLogSignIn</b> reads it. It needs the scope <b>AuditLog.Read.All</b> and an Entra ID P1 licence in the tenant. Entries stay 30 days.",
      "The useful parts are nested objects. <b>Location</b> holds City and CountryOrRegion, <b>Status</b> holds ErrorCode. <b>ErrorCode 0 means the sign-in worked</b>. 50126 is a wrong password, 50053 a locked account, 50074 'MFA required'. Pull them into columns with a calculated property.",
      "Filter on the server with -Filter. Nested properties use a <b>slash</b> there: <code>status/errorCode eq 0</code>, <code>location/countryOrRegion eq 'BE'</code>. Numbers without quotes, text in single quotes."
    ],
    daily: ["\"I can't log in\" (which error code?)", "\"Did Rowenna sign in this weekend?\"", "Every risky sign-in alert", "Checking a VPN or travel story"],
    parts: [["Connect-MgGraph -Scopes AuditLog.Read.All", "the log has its own scope"], ["Get-MgAuditLogSignIn -Top 5", "the newest five"], ["-Filter \"userPrincipalName eq 'x'\"", "one person, filtered by Graph"], ["@{n='Country';e={$_.Location.CountryOrRegion}}", "pull a nested value up"], ["@{n='Error';e={$_.Status.ErrorCode}}", "0 = success"]],
    flow: [["Connect", "AuditLog.Read.All"], ["Filter", "one user"], ["Shape", "IP, country, error"], ["Read", "0 means it worked"]],
    traps: [["status.errorCode", "Inside -Filter a dot is a syntax error. Graph wants status/errorCode."], ["Quotes", "errorCode is a number: no quotes. userPrincipalName is text: single quotes."], ["A type name in the column", "Location and Status are objects. On screen you see their type name until you pull a value out."], ["403", "User.Read.All is not enough. Reconnect with AuditLog.Read.All added."]]
  },
  watch: [
    { code: "Connect-MgGraph -Scopes User.Read.All,AuditLog.Read.All -NoWelcome", say: "The sign-in log has its own scope." },
    { code: "Get-MgAuditLogSignIn -Top 1", say: "One sign-in, every field. Location, Status and DeviceDetail are objects: you see their type name." },
    { code: "Get-MgAuditLogSignIn -Filter \"userPrincipalName eq '" + RW + "'\" | Select-Object CreatedDateTime,IPAddress,AppDisplayName", say: "Rowenna's sign-ins. One IP, all at night or this week. He has not worked in months." },
    { code: "Get-MgAuditLogSignIn -Filter \"userPrincipalName eq '" + RW + "'\" | Select-Object CreatedDateTime,IPAddress,@{n='Country';e={$_.Location.CountryOrRegion}},@{n='Error';e={$_.Status.ErrorCode}}", say: "Germany. One wrong password (50126), then three that worked (0)." }
  ],
  trace: { ask: "Connect so you can read users and the sign-in log.", setup: "none", tpl: "Connect-MgGraph -Scopes User.Read.All,[[AuditLog.Read.All]] -NoWelcome", after: ["Get-MgAuditLogSignIn -Top 1"], check: { fn: (ctx) => hasScope(ctx, "AuditLog.Read.All") }, wrong: "Which scope opens audit and sign-in logs?" },
  traceHints: ["It is a log you want to read.", "Audit logs, read, all.", "AuditLog.____.___", "Answer: AuditLog.Read.All"],
  recall: { ask: "Show Rowenna Harthorn's sign-ins with CreatedDateTime, IPAddress, a Country column and an Error column.", setup: "read", check: { out: "Get-MgAuditLogSignIn -Filter \"userPrincipalName eq '" + RW + "'\" | Select-Object CreatedDateTime,IPAddress,@{n='Country';e={$_.Location.CountryOrRegion}},@{n='Error';e={$_.Status.ErrorCode}}", refSetup: "inv" }, wrong: "Filter on his UPN, then four columns: two plain, two calculated." },
  recallHints: ["You start with User.Read.All only. What will the first try answer?", "Reconnect with AuditLog.Read.All, then -Filter on userPrincipalName and calculated columns for Location and Status.", "Get-MgAuditLogSignIn -Filter \"userPrincipalName eq '...'\" | Select-Object CreatedDateTime,IPAddress,@{n='Country';e={...}},@{n='Error';e={...}}", "Connect-MgGraph -Scopes User.Read.All,AuditLog.Read.All -NoWelcome, then Get-MgAuditLogSignIn -Filter \"userPrincipalName eq '" + RW + "'\" | Select-Object CreatedDateTime,IPAddress,@{n='Country';e={$_.Location.CountryOrRegion}},@{n='Error';e={$_.Status.ErrorCode}}"],
  real: ["Connect-MgGraph -Scopes AuditLog.Read.All", "Get-MgAuditLogSignIn -Filter \"userPrincipalName eq '<you>'\" -Top 5 | Select-Object CreatedDateTime,IPAddress,@{n='Country';e={$_.Location.CountryOrRegion}}", "Compare the IPs with where you actually were."],
  cheat: [["Get-MgAuditLogSignIn -Filter \"userPrincipalName eq 'x'\"", "One person's sign-ins"], ["-Filter \"status/errorCode eq 0\"", "Only successful ones"], ["@{n='Country';e={$_.Location.CountryOrRegion}}", "Country column"], ["50126 / 50053 / 50074", "Wrong password / locked / MFA needed"]]
},
{
  id: "spray", seq: 7, name: "Password spray", tag: "FIND THE PATTERN", title: "One IP, many accounts: see the attack",
  summary: "Group-Object turns a wall of sign-ins into a pattern: one IP trying many accounts, and the one it got into.",
  setup: "inv",
  brief: {
    what: [
      "A <b>password spray</b> tries one common password against many accounts, slowly, to stay under the lockout limit. In the log it looks like <b>one IP, many different users, error 50126</b> within minutes. Some accounts lock (50053).",
      "The line that matters is the one in between: <b>same IP, ErrorCode 0</b>. That account is now in the attacker's hands. Why that one? Usually: no MFA. Rowenna sits in SG-MFA-Exclusion from the old scanner days.",
      "<b>Group-Object</b> is the tool: group failures by IPAddress, then group one IP's attempts by UserPrincipalName. Patterns jump out of the Count column."
    ],
    daily: ["Security alert: 'unfamiliar sign-in properties'", "A user locked out for no reason", "Weekly check of failed sign-ins"],
    parts: [["-Filter \"status/errorCode eq 50126\"", "only wrong-password attempts"], ["Group-Object IPAddress", "count per IP"], ["-Filter \"ipAddress eq 'x'\"", "everything one IP did"], ["Select-Object UserPrincipalName -Unique", "each account once"]],
    flow: [["Failures", "50126"], ["Group by IP", "one IP stands out"], ["That IP", "who did it hit?"], ["Error 0", "who did it get?"]],
    traps: [["One failure", "People mistype. The pattern is one IP across many users within minutes."], ["Locked looks safe", "50053 means the lockout worked for that account. Look for a 0 on another one."], ["Disabled accounts in the list", "Aldric is disabled and still got tried: attackers use old address lists."]]
  },
  watch: [
    { code: "Get-MgAuditLogSignIn -Filter \"status/errorCode eq 50126\" | Group-Object IPAddress | Select-Object Name,Count", say: "All wrong-password attempts, per IP. One address owns them." },
    { code: "Get-MgAuditLogSignIn -Filter \"ipAddress eq '" + ATT + "'\" | Select-Object CreatedDateTime,UserPrincipalName,@{n='Error';e={$_.Status.ErrorCode}}", say: "Nine accounts in half an hour, then three zeros for Rowenna." },
    { code: "Get-MgAuditLogSignIn -Filter \"ipAddress eq '" + ATT + "' and status/errorCode eq 0\" | Select-Object UserPrincipalName -Unique", say: "Only one account fell. Now find out why him." },
    { code: "Get-MgUserMemberOf -UserId " + RW + " | ForEach-Object { $_.AdditionalProperties.displayName }", say: "SG-MFA-Exclusion. Password only. The handover note warned about it." }
  ],
  trace: { ask: "Group the wrong-password attempts by IP.", tpl: "Get-MgAuditLogSignIn -Filter \"status/errorCode eq 50126\" | [[Group-Object]] IPAddress | Select-Object Name,Count", check: { out: "Get-MgAuditLogSignIn -Filter \"status/errorCode eq 50126\" | Group-Object IPAddress | Select-Object Name,Count" }, wrong: "Which command makes buckets?" },
  traceHints: ["You want a count per value.", "Same command as 'users per city'.", "Group-______", "Answer: Group-Object"],
  recall: { ask: "Which accounts did " + ATT + " actually get into? Show each UserPrincipalName with a successful sign-in from that IP, once.", setup: "inv", check: { out: "Get-MgAuditLogSignIn -Filter \"ipAddress eq '" + ATT + "' and status/errorCode eq 0\" | Select-Object UserPrincipalName -Unique" }, wrong: "Two conditions in the filter: the IP and error 0. Then each name once." },
  recallHints: ["Two conditions in one -Filter, joined with and.", "ipAddress eq '...' and status/errorCode eq 0", "Get-MgAuditLogSignIn -Filter \"ipAddress eq '" + ATT + "' and status/errorCode eq 0\" | Select-Object ... -Unique", "Get-MgAuditLogSignIn -Filter \"ipAddress eq '" + ATT + "' and status/errorCode eq 0\" | Select-Object UserPrincipalName -Unique"],
  real: ["Get-MgAuditLogSignIn -Filter \"status/errorCode eq 50126\" -Top 500 | Group-Object IPAddress | Sort-Object Count -Descending | Select-Object -First 5 Name,Count"],
  cheat: [["Get-MgAuditLogSignIn -Filter \"status/errorCode eq 50126\" | Group-Object IPAddress", "Failures per IP"], ["-Filter \"ipAddress eq 'x' and status/errorCode eq 0\"", "Where the IP got in"]]
},
{
  id: "inboxrule", seq: 7, name: "Get-InboxRule", tag: "MAILBOX RULES", title: "The rule that hides the evidence",
  summary: "Attackers add an inbox rule so replies about the fraud never reach the real user. Find it and read what it does.",
  setup: "inv",
  brief: {
    what: [
      "Once inside a mailbox, attackers create an <b>inbox rule</b> so the real user never sees the replies: anything with invoice, payment or bank gets moved to an obscure folder (RSS Subscriptions, Conversation History), marked read, or deleted. The rule names are often just <b>.</b> or <b>..</b>",
      "<b>Get-InboxRule -Mailbox x</b> lists a mailbox's rules. The columns are true/false and folder paths; the <b>Description</b> property says the whole rule in plain English. It is an Exchange session command: Connect-ExchangeOnline first.",
      "To hunt across the tenant, loop: every mailbox, every rule, keep the suspicious ones."
    ],
    daily: ["\"I never got the reply from the supplier\"", "Every compromised-account case", "Monthly hunt for forwarding and delete rules"],
    parts: [["Get-InboxRule -Mailbox x", "one mailbox's rules"], ["-Identity '..'", "one rule, by name"], ["Format-List Name,Description", "read it like a sentence"], ["Where-Object { $_.DeleteMessage -or $_.ForwardTo }", "the dangerous kind"]],
    flow: [["Mailbox", "-Mailbox"], ["Rules", "names + priority"], ["Description", "plain English"], ["Judge", "would a person make this?"]],
    traps: [["No -Mailbox", "Without it, it looks in your own mailbox. As an admin without a mailbox: 'couldn't be found'."], ["Columns hide the story", "Description is the readable one. Use Format-List."], ["Rules in Outlook only", "Client-side rules do not show here. The ones that hide mail from a phone or webmail do."]]
  },
  watch: [
    { code: "Get-InboxRule -Mailbox " + RW, say: "Two rules. One a person would make. One called '..'." },
    { code: "Get-InboxRule -Mailbox " + RW + " -Identity '..' | Format-List Name,Description", say: "Anything about invoice, payment, bank or IBAN disappears into RSS Subscriptions, already read." },
    { code: "Get-InboxRule -Mailbox " + RW + " -Identity '..' | Select-Object Name,SubjectOrBodyContainsWords,MoveToFolder,MarkAsRead", say: "The same, as properties you can filter on." },
    { code: "Get-EXOMailbox -ResultSize Unlimited -RecipientTypeDetails UserMailbox | ForEach-Object { Get-InboxRule -Mailbox $_.UserPrincipalName } | Where-Object { $_.DeleteMessage -or $_.MoveToFolder -like '*RSS*' } | Select-Object MailboxOwnerId,Name", say: "The tenant-wide hunt. Rowenna is not alone: Theodwyn Gallow has a rule that deletes mail." }
  ],
  trace: { ask: "List Rowenna's inbox rules.", tpl: "[[Get-InboxRule]] -Mailbox " + RW, check: { out: "Get-InboxRule -Mailbox " + RW }, wrong: "Get, Inbox, Rule." },
  traceHints: ["Verb Get.", "The noun is about rules in the inbox.", "Get-______Rule", "Answer: Get-InboxRule"],
  recall: { ask: "Read what Rowenna's '..' rule does: Name and Description, as a list.", setup: "inv", check: { out: "Get-InboxRule -Mailbox " + RW + " -Identity '..' | Format-List Name,Description" }, wrong: "Pick the one rule, then Format-List two properties." },
  recallHints: ["-Mailbox for whose rules, -Identity for which rule.", "Then Format-List with two properties.", "Get-InboxRule -Mailbox ... -Identity '..' | Format-List ...", "Get-InboxRule -Mailbox " + RW + " -Identity '..' | Format-List Name,Description"],
  real: ["Connect-ExchangeOnline", "Get-InboxRule -Mailbox <your own address> | Format-List Name,Description"],
  cheat: [["Get-InboxRule -Mailbox x", "A mailbox's rules"], ["Get-InboxRule -Mailbox x -Identity 'name' | Format-List Name,Description", "Read one rule"], ["... | Where-Object { $_.DeleteMessage -or $_.ForwardTo -or $_.RedirectTo }", "Dangerous rules"]]
},
{
  id: "msgtrace", seq: 7, name: "Get-MessageTraceV2", tag: "MAIL FLOW", title: "What did the account send, and who got it?",
  summary: "Message trace shows sender, recipient, subject and delivery status. Mind the time window.",
  setup: "inv",
  brief: {
    what: [
      "<b>Message trace</b> follows mail through Exchange Online: sender, recipient, subject, time and Status (Delivered, FilteredAsSpam, Quarantined, Failed). <b>Get-MessageTraceV2</b> replaced the retired Get-MessageTrace in 2025.",
      "<b>The time window is the trap.</b> Without -StartDate you only get the last 48 hours. One query can cover at most 10 days, and data goes back 90 days.",
      "Filter with -SenderAddress, -RecipientAddress, -Status and -Subject (with -SubjectFilterType Contains, StartsWith or EndsWith)."
    ],
    daily: ["\"Did my mail arrive?\"", "\"Who else got this phishing mail?\"", "What a compromised account sent"],
    parts: [["Get-MessageTraceV2 -SenderAddress x", "mail sent by x"], ["-StartDate (Get-Date).AddDays(-7) -EndDate (Get-Date)", "the last week"], ["-Subject 'bank' -SubjectFilterType Contains", "subject search"], ["-Status FilteredAsSpam", "only what was caught"]],
    flow: [["Who", "-SenderAddress"], ["When", "-StartDate / -EndDate"], ["What", "subject + status"], ["Who got it", "RecipientAddress"]],
    traps: [["Empty is not 'nothing'", "No -StartDate means 48 hours. Rowenna's mails are three days old."], ["10 days max", "A wider window is refused. Split it into two queries."], ["Old name", "Get-MessageTrace is the retired version. Use V2."]]
  },
  watch: [
    { code: "Get-MessageTraceV2 -SenderAddress " + RW, say: "Nothing? Only the last 48 hours were searched." },
    { code: "Get-MessageTraceV2 -SenderAddress " + RW + " " + WEEK, say: "Ten mails. Two about bank details to Finance, eight 'shift roster' links to Operations." },
    { code: "Get-MessageTraceV2 -SenderAddress " + RW + " " + WEEK + " -Subject 'shift roster' -SubjectFilterType Contains | Select-Object RecipientAddress,Status", say: "Who got the link. Two were caught as spam; six were delivered." }
  ],
  trace: { ask: "Add the time window: the last 7 days.", tpl: "Get-MessageTraceV2 -SenderAddress " + RW + " -[[StartDate]] (Get-Date).AddDays(-7) -EndDate (Get-Date)", check: { out: "Get-MessageTraceV2 -SenderAddress " + RW + " " + WEEK }, wrong: "Which parameter sets the beginning of the window?" },
  traceHints: ["The window has a beginning and an end.", "-EndDate is already there.", "-_____Date", "Answer: StartDate"],
  recall: { ask: "Who received Rowenna's 'shift roster' mail, and was it delivered? Show RecipientAddress and Status.", setup: "inv", check: { out: "Get-MessageTraceV2 -SenderAddress " + RW + " " + WEEK + " -Subject 'shift roster' -SubjectFilterType Contains | Select-Object RecipientAddress,Status" }, wrong: "Sender, a week of window, a subject filter, two columns." },
  recallHints: ["Don't forget the window.", "-Subject 'shift roster' -SubjectFilterType Contains", "Get-MessageTraceV2 -SenderAddress ... -StartDate ... -EndDate ... -Subject ... | Select-Object RecipientAddress,Status", "Get-MessageTraceV2 -SenderAddress " + RW + " " + WEEK + " -Subject 'shift roster' -SubjectFilterType Contains | Select-Object RecipientAddress,Status"],
  real: ["Get-MessageTraceV2 -SenderAddress <you> -StartDate (Get-Date).AddDays(-2) -EndDate (Get-Date) | Select-Object Received,RecipientAddress,Subject,Status"],
  cheat: [["Get-MessageTraceV2 -SenderAddress x -StartDate (Get-Date).AddDays(-7) -EndDate (Get-Date)", "What x sent this week"], ["-RecipientAddress x", "What x received"], ["-Subject 'word' -SubjectFilterType Contains", "Subject search"]]
},
{
  id: "auditlog", seq: 7, name: "Search-UnifiedAuditLog", tag: "AUDIT LOG", title: "Prove who changed what, and from where",
  summary: "The audit log records actions: who created a rule, who logged in, from which IP. The detail sits in JSON: ConvertFrom-Json opens it.",
  setup: "inv",
  brief: {
    what: [
      "The <b>unified audit log</b> records actions across Exchange, Entra ID, SharePoint and Teams: rule created, permission added, login, mail sent. <b>Search-UnifiedAuditLog</b> searches it. <b>-StartDate and -EndDate are mandatory</b>. Default 100 results, -ResultSize up to 5000. Kept 180 days.",
      "Each result has a short summary (CreationDate, UserIds, Operations) and <b>AuditData</b>: one long JSON text with everything else, including <b>ClientIP</b> and the rule's <b>Parameters</b>.",
      "JSON text is not an object yet. <b>$_.AuditData | ConvertFrom-Json</b> turns it into one, and then you can Select-Object and Where-Object on its properties."
    ],
    daily: ["\"Who gave Hesper access to the Finance Inbox?\"", "\"When was this rule created, and from where?\"", "Evidence for an incident report"],
    parts: [["Search-UnifiedAuditLog -StartDate ... -EndDate ...", "the window, mandatory"], ["-UserIds x", "one person's actions"], ["-Operations New-InboxRule", "one kind of action"], ["$_.AuditData | ConvertFrom-Json", "open the detail"]],
    flow: [["Window", "start + end"], ["Narrow", "user, operation, IP"], ["AuditData", "JSON text"], ["ConvertFrom-Json", "real properties"]],
    traps: [["AuditData is text", "$_.AuditData.ClientIP is empty: it is a string until ConvertFrom-Json."], ["Not instant", "New events take 30 minutes to a few hours to appear."], ["Dates in JSON are UTC", "CreationTime inside AuditData is UTC; CreationDate outside is shown in local time."]]
  },
  watch: [
    { code: "Search-UnifiedAuditLog " + WEEK + " -UserIds " + RW + " | Select-Object CreationDate,Operations", say: "Everything 'Rowenna' did this week: a login, mail read, a rule, an MFA registration, mail sent." },
    { code: "Search-UnifiedAuditLog " + WEEK + " -UserIds " + RW + " -Operations New-InboxRule | Select-Object -ExpandProperty AuditData", say: "The raw JSON. Everything is there, nothing is readable." },
    { code: "$e = Search-UnifiedAuditLog " + WEEK + " -UserIds " + RW + " -Operations New-InboxRule; $d = $e.AuditData | ConvertFrom-Json; $d.ClientIP", say: "Converted: one property. The rule was made from the spray IP." },
    { code: "$d.Parameters", say: "The exact parameters the attacker used. That is your proof." }
  ],
  trace: { ask: "Open the AuditData of Rowenna's rule event and show ClientIP and ObjectId.", tpl: "$r = Search-UnifiedAuditLog " + WEEK + " -UserIds " + RW + " -Operations New-InboxRule; $r.AuditData | [[ConvertFrom-Json]] | Select-Object ClientIP,ObjectId", check: { out: "$r = Search-UnifiedAuditLog " + WEEK + " -UserIds " + RW + " -Operations New-InboxRule; $r.AuditData | ConvertFrom-Json | Select-Object ClientIP,ObjectId" }, wrong: "Which command turns JSON text into an object?" },
  traceHints: ["The text is JSON.", "You want to convert from it.", "ConvertFrom-____", "Answer: ConvertFrom-Json"],
  recall: { ask: "Who created inbox rules this week, and from which IP? For every New-InboxRule event show UserId, ClientIP and ObjectId.", setup: "inv", check: { out: "Search-UnifiedAuditLog " + WEEK + " -Operations New-InboxRule | ForEach-Object { $_.AuditData | ConvertFrom-Json } | Select-Object UserId,ClientIP,ObjectId" }, wrong: "Search one operation for everyone, convert each AuditData, three columns." },
  recallHints: ["No -UserIds this time: everyone.", "Convert each event's AuditData inside ForEach-Object.", "Search-UnifiedAuditLog ... -Operations New-InboxRule | ForEach-Object { $_.AuditData | ConvertFrom-Json } | Select-Object ...", "Search-UnifiedAuditLog " + WEEK + " -Operations New-InboxRule | ForEach-Object { $_.AuditData | ConvertFrom-Json } | Select-Object UserId,ClientIP,ObjectId"],
  real: ["Search-UnifiedAuditLog -StartDate (Get-Date).AddDays(-2) -EndDate (Get-Date) -UserIds <you> | Select-Object CreationDate,Operations"],
  cheat: [["Search-UnifiedAuditLog -StartDate (Get-Date).AddDays(-7) -EndDate (Get-Date) -UserIds x", "What x did this week"], ["-Operations New-InboxRule,Set-Mailbox", "Only these actions"], ["$_.AuditData | ConvertFrom-Json", "Open the detail"]]
},
{
  id: "authmethods", seq: 7, name: "Authentication methods", tag: "MFA METHODS", title: "Did the attacker add their own phone?",
  summary: "Attackers register their own MFA method to survive a password reset. List the methods and read their type.",
  setup: "inv",
  brief: {
    what: [
      "A smart attacker registers <b>their own MFA method</b> on the account. Reset the password and they still pass MFA with their phone, or use it to reset the password themselves.",
      "<b>Get-MgUserAuthenticationMethod</b> lists every method on an account. The default view shows only an Id; the type sits in <b>AdditionalProperties['@odata.type']</b>, for example #microsoft.graph.phoneAuthenticationMethod. The password counts as a method too.",
      "Per-type commands show details: <b>Get-MgUserAuthenticationPhoneMethod</b> (number, type) and <b>Get-MgUserAuthenticationMicrosoftAuthenticatorMethod</b> (device name). Scope: <b>UserAuthenticationMethod.Read.All</b>."
    ],
    daily: ["\"I got a new phone\"", "Every compromised-account case", "Checking who still has SMS as a method"],
    parts: [["Get-MgUserAuthenticationMethod -UserId x", "all methods, Ids only"], ["$_.AdditionalProperties['@odata.type']", "which kind each one is"], ["Get-MgUserAuthenticationPhoneMethod -UserId x", "phone numbers"], ["Get-MgUserAuthenticationMicrosoftAuthenticatorMethod -UserId x", "authenticator devices"]],
    flow: [["Methods", "Ids"], ["Type", "@odata.type"], ["Details", "per-type command"], ["Judge", "whose phone is this?"]],
    traps: [["Only Ids", "The default view looks empty. The type is in AdditionalProperties."], ["The password is listed", "passwordAuthenticationMethod is normal on every account."], ["Rowenna had none", "He was excluded from MFA. Any method on his account now, someone else added."]]
  },
  watch: [
    { code: "Get-MgUserAuthenticationMethod -UserId " + RW, say: "Two Ids. Not much to go on yet." },
    { code: "Get-MgUserAuthenticationMethod -UserId " + RW + " | ForEach-Object { $_.AdditionalProperties['@odata.type'] }", say: "A password, and a phone." },
    { code: "Get-MgUserAuthenticationPhoneMethod -UserId " + RW, say: "A US number, added at 04:11 by the audit log. Rowenna lives in Bruges." },
    { code: "Get-MgUserAuthenticationMethod -UserId " + U("elara.wynn") + " | ForEach-Object { $_.AdditionalProperties['@odata.type'] }", say: "For comparison, a normal account: password and the Authenticator app." }
  ],
  trace: { ask: "Show the type of each method on Rowenna's account.", tpl: "Get-MgUserAuthenticationMethod -UserId " + RW + " | ForEach-Object { $_.[[AdditionalProperties]]['@odata.type'] }", check: { out: "Get-MgUserAuthenticationMethod -UserId " + RW + " | ForEach-Object { $_.AdditionalProperties['@odata.type'] }" }, wrong: "The same bag as group members' names." },
  traceHints: ["You have seen this bag before, in group members.", "Extra properties, added on.", "A__________P_________", "Answer: AdditionalProperties"],
  recall: { ask: "Show the phone number and phone type registered on Rowenna's account.", setup: "inv", check: { out: "Get-MgUserAuthenticationPhoneMethod -UserId " + RW + " | Select-Object PhoneNumber,PhoneType" }, wrong: "The phone-specific command, two columns." },
  recallHints: ["There is a command just for phone methods.", "Get-MgUserAuthenticationPhoneMethod", "Get-MgUserAuthenticationPhoneMethod -UserId ... | Select-Object ...", "Get-MgUserAuthenticationPhoneMethod -UserId " + RW + " | Select-Object PhoneNumber,PhoneType"],
  real: ["Connect-MgGraph -Scopes UserAuthenticationMethod.Read.All", "Get-MgUserAuthenticationMethod -UserId <you> | ForEach-Object { $_.AdditionalProperties['@odata.type'] }"],
  cheat: [["Get-MgUserAuthenticationMethod -UserId x | ForEach-Object { $_.AdditionalProperties['@odata.type'] }", "Method types"], ["Get-MgUserAuthenticationPhoneMethod -UserId x", "Phone numbers"], ["Get-MgUserAuthenticationMicrosoftAuthenticatorMethod -UserId x", "Authenticator devices"]]
},
{
  id: "contain", seq: 8, name: "Contain", tag: "FIRST 5 MINUTES", title: "Lock the door before you look around",
  summary: "Block, revoke, reset with a forced change. In that order, before anything else.",
  setup: "resp",
  brief: {
    what: [
      "You know enough: Rowenna's account is in someone else's hands. Investigation can wait five minutes. <b>Containment first</b>, in this order:",
      "1. <b>Block sign-in</b> (AccountEnabled false): no new sign-ins. 2. <b>Revoke sessions</b>: tokens the attacker already has stop working. 3. <b>Reset the password</b> with <b>ForceChangePasswordNextSignIn</b>, so the old one is useless even after you unblock.",
      "Revoke before block and the attacker simply signs in again with the password they have. Reset without revoke and their open session keeps running for up to an hour."
    ],
    daily: ["Every compromised account", "A stolen laptop", "A leaver who left on bad terms"],
    parts: [["Update-MgUser -UserId x -AccountEnabled:$false", "1. block"], ["Revoke-MgUserSignInSession -UserId x", "2. kill sessions"], ["Update-MgUser -UserId x -PasswordProfile @{ Password = '...'; ForceChangePasswordNextSignIn = $true }", "3. new password, must change"]],
    flow: [["Block", "no new sign-ins"], ["Revoke", "old tokens die"], ["Reset", "password useless"], ["Then", "investigate"]],
    traps: [["Wrong order", "Revoke first leaves the door open for a fresh sign-in."], ["Weak password", "Graph refuses passwords that fail complexity rules."], ["PasswordProfile is a hashtable", "@{ Password = '...'; ForceChangePasswordNextSignIn = $true }, not a plain string."]]
  },
  watch: [
    { code: "Update-MgUser -UserId " + RW + " -AccountEnabled:$false", say: "1. Nobody signs in as Rowenna any more." },
    { code: "Revoke-MgUserSignInSession -UserId " + RW, say: "2. The attacker's open sessions are killed." },
    { code: "Update-MgUser -UserId " + RW + " -PasswordProfile @{ Password = 'Tide-Harbour-8812!'; ForceChangePasswordNextSignIn = $true }", say: "3. The stolen password is worthless. Rowenna picks a new one when he is back." },
    { code: "Get-MgUser -UserId " + RW + " -Property DisplayName,AccountEnabled | Select-Object DisplayName,AccountEnabled", say: "Verify. Always read it back." }
  ],
  trace: { ask: "Reset Rowenna's password and force a change at next sign-in.", tpl: "Update-MgUser -UserId " + RW + " -PasswordProfile @{ Password = 'Tide-Harbour-8812!'; [[ForceChangePasswordNextSignIn]] = $true }", check: { fn: (ctx) => { const u = userOf(ctx, "rowenna.harthorn"); return !!u._pwReset && u._pwReset.force; } }, wrong: "Which key forces a new password at next sign-in?" },
  traceHints: ["It forces a change.", "...at the next sign-in.", "Force______Password____Sign__", "Answer: ForceChangePasswordNextSignIn"],
  recall: { ask: "Contain Rowenna Harthorn: block him, revoke his sessions, then reset his password with a forced change.", setup: "resp", check: { fn: (ctx) => { const u = userOf(ctx, "rowenna.harthorn"); const r = ctx.t.revoked[RW]; return u.AccountEnabled === false && !!r && r.afterBlock && !!u._pwReset && u._pwReset.force && u._pwReset.password; } }, wrong: "Three commands, block first." },
  recallHints: ["Block, revoke, reset.", "The reset is Update-MgUser -PasswordProfile with a hashtable.", "Update-MgUser ... -AccountEnabled:$false; Revoke-MgUserSignInSession ...; Update-MgUser ... -PasswordProfile @{ ... }", "Update-MgUser -UserId " + RW + " -AccountEnabled:$false, then Revoke-MgUserSignInSession -UserId " + RW + ", then Update-MgUser -UserId " + RW + " -PasswordProfile @{ Password = 'Tide-Harbour-8812!'; ForceChangePasswordNextSignIn = $true }"],
  real: ["Write the three lines in your notes now, with a placeholder UPN, so you never have to think about the order under stress."],
  cheat: [["Update-MgUser -UserId x -AccountEnabled:$false", "1. Block"], ["Revoke-MgUserSignInSession -UserId x", "2. Revoke"], ["Update-MgUser -UserId x -PasswordProfile @{ Password = '...'; ForceChangePasswordNextSignIn = $true }", "3. Reset, force change"]]
},
{
  id: "cleanmail", seq: 8, name: "Clean the mailbox", tag: "REMOVE PERSISTENCE", title: "Take out the rule, the forwarding, the extra access",
  summary: "Remove-InboxRule takes out the hiding rule. Then check forwarding and mailbox permissions so nothing keeps leaking.",
  setup: "resp",
  brief: {
    what: [
      "The account is locked, but the mailbox still carries the attacker's changes. Rules keep hiding mail once Rowenna is back. Check three things: <b>inbox rules</b>, <b>forwarding</b>, <b>who else has access</b>.",
      "<b>Remove-InboxRule</b> asks for confirmation; in a script add <b>-Confirm:$false</b>. <b>Disable-InboxRule</b> switches it off but keeps it, handy if someone wants to see it later. Pipe the suspicious ones straight in: Get-InboxRule ... | Where-Object ... | Remove-InboxRule -Confirm:$false.",
      "Forwarding: Get-EXOMailbox -Properties ForwardingSmtpAddress. Access: Get-MailboxPermission. Both from the Mailboxes sequence."
    ],
    daily: ["Every compromised mailbox", "\"My mail goes missing\"", "Cleaning up after an old employee"],
    parts: [["Remove-InboxRule -Mailbox x -Identity '..' -Confirm:$false", "remove one rule"], ["Disable-InboxRule -Mailbox x -Identity '..'", "switch off, keep"], ["Get-EXOMailbox -Identity x -Properties ForwardingSmtpAddress", "any forwarding?"], ["Get-MailboxPermission -Identity x", "who else can open it"]],
    flow: [["Rules", "remove the bad one"], ["Forwarding", "should be empty"], ["Permissions", "only SELF"], ["Verify", "read back"]],
    traps: [["The prompt", "Without -Confirm:$false the real console stops and waits for Y."], ["Removing the good rule too", "Pick by -Identity, not by piping every rule."], ["Rule by name", "Two rules can share a name in different mailboxes: always give -Mailbox."]]
  },
  watch: [
    { code: "Remove-InboxRule -Mailbox " + RW + " -Identity '..'", say: "The prompt. In the real console it waits for Y." },
    { code: "Remove-InboxRule -Mailbox " + RW + " -Identity '..' -Confirm:$false", say: "Gone, no questions." },
    { code: "Get-InboxRule -Mailbox " + RW, say: "Only his real rule is left." },
    { code: "Get-EXOMailbox -Identity " + RW + " -Properties ForwardingSmtpAddress | Select-Object DisplayName,ForwardingSmtpAddress", say: "No forwarding. Good." },
    { code: "Get-MailboxPermission -Identity " + RW, say: "Only SELF. Nobody else can open it." }
  ],
  trace: { ask: "Remove Rowenna's '..' rule without the prompt.", tpl: "Remove-InboxRule -Mailbox " + RW + " -Identity '..' -Confirm:[[$false]]", check: { fn: (ctx) => !ruleOf(ctx, "Rowenna Harthorn", "..") && !!ruleOf(ctx, "Rowenna Harthorn", "Shift roster") }, wrong: "Glue the value to -Confirm with a colon." },
  traceHints: ["A switch with a value glued on.", "Same shape as -AccountEnabled:$false.", "-Confirm:$_____", "Answer: $false"],
  recall: { ask: "Theodwyn Gallow's mailbox has a rule that deletes mail. Remove only that one, without a prompt, and leave her other rule alone.", setup: "resp", check: { fn: (ctx) => !ruleOf(ctx, "Theodwyn Gallow", ".") && !!ruleOf(ctx, "Theodwyn Gallow", "Bank statements") } , wrong: "Look first, then remove by -Identity." },
  recallHints: ["Look at her rules first.", "The bad one is called '.'.", "Remove-InboxRule -Mailbox ... -Identity '.' -Confirm:$false", "Remove-InboxRule -Mailbox " + TG + " -Identity '.' -Confirm:$false"],
  real: ["Get-InboxRule -Mailbox <you> | Select-Object Name,Enabled", "Disable-InboxRule and Remove-InboxRule only on a rule you made yourself for testing"],
  cheat: [["Remove-InboxRule -Mailbox x -Identity 'name' -Confirm:$false", "Remove a rule"], ["Disable-InboxRule -Mailbox x -Identity 'name'", "Switch a rule off"], ["Get-InboxRule -Mailbox x | Where-Object { $_.DeleteMessage } | Remove-InboxRule -Confirm:$false", "Remove all delete rules"]]
},
{
  id: "cleanmfa", seq: 8, name: "Clean MFA", tag: "REMOVE PERSISTENCE", title: "Take back the second factor",
  summary: "Remove the attacker's phone method, then close the gap that let them in: the MFA exclusion.",
  setup: "resp",
  brief: {
    what: [
      "The attacker's phone is still registered on Rowenna's account. <b>Remove-MgUserAuthenticationPhoneMethod -UserId x -PhoneAuthenticationMethodId id</b> takes it off. The Id comes from Get-MgUserAuthenticationPhoneMethod. Scope: <b>UserAuthenticationMethod.ReadWrite.All</b>.",
      "Then fix the root cause. Rowenna got sprayed because he had no MFA: he sits in <b>SG-MFA-Exclusion</b>. Take him out (Remove-MgGroupMemberByRef, from Groups). Without that, the next spray gets him again.",
      "When Rowenna is back, he registers his own Authenticator app with you watching."
    ],
    daily: ["After every compromise", "Lost phone", "Cleaning MFA exclusions"],
    parts: [["$p = Get-MgUserAuthenticationPhoneMethod -UserId x", "find the phone method"], ["Remove-MgUserAuthenticationPhoneMethod -UserId x -PhoneAuthenticationMethodId $p.Id", "remove it"], ["Remove-MgGroupMemberByRef -GroupId $g.Id -DirectoryObjectId $u.Id", "out of the exclusion"]],
    flow: [["Find", "phone method Id"], ["Remove", "the attacker's phone"], ["Root cause", "MFA exclusion"], ["Verify", "methods + group"]],
    traps: [["Read scope", "UserAuthenticationMethod.Read.All can look but not remove: 403."], ["Id, not number", "The parameter wants the method Id, not the phone number."], ["Only half done", "Removing the phone but leaving the exclusion keeps the door open."]]
  },
  watch: [
    { code: "$p = Get-MgUserAuthenticationPhoneMethod -UserId " + RW + "; $p", say: "Find it, keep it in $p." },
    { code: "Remove-MgUserAuthenticationPhoneMethod -UserId " + RW + " -PhoneAuthenticationMethodId $p.Id", say: "Gone." },
    { code: "Get-MgUserAuthenticationMethod -UserId " + RW + " | ForEach-Object { $_.AdditionalProperties['@odata.type'] }", say: "Only the password left." },
    { code: "$g = Get-MgGroup -Filter \"displayName eq 'SG-MFA-Exclusion'\"; $u = Get-MgUser -UserId " + RW + "; Remove-MgGroupMemberByRef -GroupId $g.Id -DirectoryObjectId $u.Id", say: "And the root cause: out of the exclusion group." }
  ],
  trace: { ask: "Remove the phone method stored in $p.", pre: [], tpl: "$p = Get-MgUserAuthenticationPhoneMethod -UserId " + RW + "; Remove-MgUserAuthenticationPhoneMethod -UserId " + RW + " -[[PhoneAuthenticationMethodId]] $p.Id", check: { fn: (ctx) => !methodsOf(ctx, "rowenna.harthorn").some((m) => m.kind === "phone") }, wrong: "The parameter name says what kind of Id it wants." },
  traceHints: ["It is the Id of a phone authentication method.", "Phone + Authentication + Method + Id.", "Phone____________MethodId", "Answer: PhoneAuthenticationMethodId"],
  recall: { ask: "Finish Rowenna's MFA cleanup: remove the attacker's phone method and take him out of SG-MFA-Exclusion.", setup: "resp", check: { fn: (ctx) => !methodsOf(ctx, "rowenna.harthorn").some((m) => m.kind === "phone") && !grpHas(ctx, "SG-MFA-Exclusion", "rowenna.harthorn") }, wrong: "Two fixes: the phone, and the group." },
  recallHints: ["Store the phone method, then remove it by Id.", "For the group you need both the group Id and Rowenna's Id.", "$p = ...; Remove-MgUserAuthenticationPhoneMethod ...; $g = ...; $u = ...; Remove-MgGroupMemberByRef ...", "$p = Get-MgUserAuthenticationPhoneMethod -UserId " + RW + "; Remove-MgUserAuthenticationPhoneMethod -UserId " + RW + " -PhoneAuthenticationMethodId $p.Id, then $g = Get-MgGroup -Filter \"displayName eq 'SG-MFA-Exclusion'\"; $u = Get-MgUser -UserId " + RW + "; Remove-MgGroupMemberByRef -GroupId $g.Id -DirectoryObjectId $u.Id"],
  real: ["Get-MgUserAuthenticationMethod -UserId <you> | ForEach-Object { $_.AdditionalProperties['@odata.type'] }", "Look, don't remove: you would lock yourself out."],
  cheat: [["Remove-MgUserAuthenticationPhoneMethod -UserId x -PhoneAuthenticationMethodId $p.Id", "Remove a phone method"], ["Remove-MgGroupMemberByRef -GroupId $g.Id -DirectoryObjectId $u.Id", "Take someone out of a group"]]
},
{
  id: "blast", seq: 8, name: "Blast radius", tag: "WHO ELSE", title: "Who else did it touch?",
  summary: "One account is clean. Now check what spread: other accounts from the same IP, other foreign sign-ins, who got the phishing.",
  setup: "resp",
  brief: {
    what: [
      "A compromised account is rarely the end of it. Ask three questions: <b>did the same IP get into anyone else?</b> <b>Is anyone else signing in from abroad?</b> <b>Who received mail from the attacker, and who might have clicked?</b>",
      "Each is one command you already know. The new trick is combining them: a list of recipients from message trace, then a loop that checks each recipient's sign-ins.",
      "Also tell Finance: the Wyrmlight bank-details mail was fake. That one is a phone call, not a command."
    ],
    daily: ["After every compromise", "Phishing that reached many people", "The report to management"],
    parts: [["-Filter \"location/countryOrRegion ne 'BE' and status/errorCode eq 0\"", "foreign sign-ins that worked"], ["Get-MessageTraceV2 ... -Status Delivered", "who actually got it"], ["foreach ($r in $list) { ... }", "check each recipient"]],
    flow: [["Same IP", "anyone else?"], ["Abroad", "anyone else?"], ["Recipients", "who got the phish"], ["Each one", "check sign-ins"]],
    traps: [["Spam folder is not safe", "FilteredAsSpam still reached the mailbox. People open spam."], ["Failures from abroad", "The spray shows up as foreign sign-ins too. Look at the error code."], ["Too wide", "Keep the time window to the incident, or the noise hides the signal."]]
  },
  watch: [
    { code: "Get-MgAuditLogSignIn -Filter \"location/countryOrRegion ne 'BE' and status/errorCode eq 0\" | Select-Object UserPrincipalName,IPAddress -Unique", say: "Successful sign-ins from abroad. Rowenna, and... Theodwyn Gallow, from a different IP. Keep that in mind." },
    { code: "$to = Get-MessageTraceV2 -SenderAddress " + RW + " " + WEEK + " -Subject 'shift roster' -SubjectFilterType Contains -Status Delivered | Select-Object -ExpandProperty RecipientAddress; $to", say: "Six people got the link in their inbox." },
    { code: "foreach ($r in $to) { Get-MgAuditLogSignIn -Filter \"userPrincipalName eq '$r' and status/errorCode eq 0 and location/countryOrRegion ne 'BE'\" }", say: "None of them signed in from abroad afterwards. The link didn't catch anyone." }
  ],
  trace: { ask: "Foreign sign-ins that worked: add the second condition.", tpl: "Get-MgAuditLogSignIn -Filter \"location/countryOrRegion ne 'BE' [[and]] status/errorCode eq 0\" | Select-Object UserPrincipalName,IPAddress -Unique", check: { out: "Get-MgAuditLogSignIn -Filter \"location/countryOrRegion ne 'BE' and status/errorCode eq 0\" | Select-Object UserPrincipalName,IPAddress -Unique" }, wrong: "Both conditions must be true." },
  traceHints: ["Both must hold.", "Lowercase, OData style.", "a__", "Answer: and"],
  recall: { ask: "List every person who got Rowenna's 'shift roster' mail delivered to their inbox: plain addresses only.", setup: "resp", check: { out: "Get-MessageTraceV2 -SenderAddress " + RW + " " + WEEK + " -Subject 'shift roster' -SubjectFilterType Contains -Status Delivered | Select-Object -ExpandProperty RecipientAddress" }, wrong: "Sender, window, subject, only Delivered, plain values." },
  recallHints: ["Message trace with a status filter.", "-Status Delivered, then -ExpandProperty for plain values.", "Get-MessageTraceV2 ... -Status Delivered | Select-Object -ExpandProperty RecipientAddress", "Get-MessageTraceV2 -SenderAddress " + RW + " " + WEEK + " -Subject 'shift roster' -SubjectFilterType Contains -Status Delivered | Select-Object -ExpandProperty RecipientAddress"],
  real: ["Get-MgAuditLogSignIn -Filter \"location/countryOrRegion ne 'BE' and status/errorCode eq 0\" -Top 50 | Select-Object UserPrincipalName,IPAddress,@{n='Country';e={$_.Location.CountryOrRegion}} -Unique"],
  cheat: [["-Filter \"location/countryOrRegion ne 'BE' and status/errorCode eq 0\"", "Foreign sign-ins that worked"], ["-Status Delivered | Select-Object -ExpandProperty RecipientAddress", "Who got it, plain list"]]
},
{
  id: "evidence", seq: 8, name: "Write it down", tag: "INCIDENT REPORT", title: "A timeline anyone can open in Excel",
  summary: "Turn sign-ins and audit events into one sorted timeline and export it for the report.",
  setup: "resp",
  brief: {
    what: [
      "Management, the insurer and maybe the police will ask the same things: <b>when did it start, what did they do, when was it stopped</b>. Answer with a <b>timeline</b>: one CSV, sorted by time, one row per event.",
      "Build it from pieces you already have. Shape sign-ins and audit events into the <b>same columns</b> (Time, What, IP) with calculated properties. <b>+</b> joins two lists, Sort-Object Time orders them, Export-Csv writes it. Your Mac is Belgian: <b>-Delimiter ';'</b> so Excel opens it in columns.",
      "Run your containment inside <b>Start-Transcript</b> next time: the log is your proof of what you did, and when."
    ],
    daily: ["Every incident report", "Questions from the insurer or DPO", "Lessons learned meetings"],
    parts: [["$s = ... | Select-Object @{n='Time';e={...}},@{n='What';e={...}},@{n='IP';e={...}}", "sign-ins, shaped"], ["$a = ... | Select-Object @{n='Time';...}", "audit events, same shape"], ["$s + $a | Sort-Object Time", "one timeline"], ["Export-Csv ~/Desktop/x.csv -NoTypeInformation -Delimiter ';'", "for Excel"]],
    flow: [["Sign-ins", "shaped"], ["Audit", "same shape"], ["Join + sort", "one list"], ["Export", "Desktop, ;"]],
    traps: [["Different columns", "Two lists with different column names make a messy CSV. Name them the same."], ["Comma CSV on a Belgian Mac", "Everything in column A. Use -Delimiter ';'."], ["Time zones", "Say in the report that times are local (Brussels)."]]
  },
  watch: [
    { code: "$s = Get-MgAuditLogSignIn -Filter \"userPrincipalName eq '" + RW + "'\" | Select-Object @{n='Time';e={$_.CreatedDateTime}},@{n='What';e={'Sign-in, error ' + $_.Status.ErrorCode}},@{n='IP';e={$_.IPAddress}}", say: "Sign-ins in three columns." },
    { code: "$a = Search-UnifiedAuditLog " + WEEK + " -UserIds " + RW + " | Select-Object @{n='Time';e={$_.CreationDate}},@{n='What';e={$_.Operations}},@{n='IP';e={($_.AuditData | ConvertFrom-Json).ClientIP}}", say: "Audit events in the same three columns." },
    { code: "$s + $a | Sort-Object Time | Format-Table", say: "One story, in order: spray, way in, rule, phone, fraud mail. Format-Table keeps the two kinds in one table." },
    { code: "$s + $a | Sort-Object Time | Export-Csv ~/Desktop/rowenna-timeline.csv -NoTypeInformation -Delimiter ';'", say: "On your Desktop. Open it from FILES ON THIS MAC to see it in Excel." }
  ],
  trace: { ask: "Join the two lists and sort them by Time.", pre: [], tpl: "$s = Get-MgAuditLogSignIn -Filter \"userPrincipalName eq '" + RW + "'\" | Select-Object @{n='Time';e={$_.CreatedDateTime}},@{n='What';e={'Sign-in'}}; $a = Search-UnifiedAuditLog " + WEEK + " -UserIds " + RW + " | Select-Object @{n='Time';e={$_.CreationDate}},@{n='What';e={$_.Operations}}; $s + $a | [[Sort-Object]] Time", check: { out: "$s = Get-MgAuditLogSignIn -Filter \"userPrincipalName eq '" + RW + "'\" | Select-Object @{n='Time';e={$_.CreatedDateTime}},@{n='What';e={'Sign-in'}}; $a = Search-UnifiedAuditLog " + WEEK + " -UserIds " + RW + " | Select-Object @{n='Time';e={$_.CreationDate}},@{n='What';e={$_.Operations}}; $s + $a | Sort-Object Time" }, wrong: "Which command orders things?" },
  traceHints: ["Put them in order.", "By the Time column.", "Sort-______", "Answer: Sort-Object"],
  recall: { ask: "Export Rowenna's sign-ins from " + ATT + " to ~/Desktop/rowenna-signins.csv for Excel on your Belgian Mac, with CreatedDateTime, IPAddress and an Error column.", setup: "resp", check: { fn: (ctx) => { const c = csvRows(ctx, "/Users/kaatje/Desktop/rowenna-signins.csv"); return !!c && c.head === "\"CreatedDateTime\";\"IPAddress\";\"Error\"" && c.rows.length === 4; } }, wrong: "Filter on user and IP, three columns, export with a semicolon." },
  recallHints: ["Two conditions in the filter, a calculated Error column.", "Export-Csv with -Delimiter ';' and -NoTypeInformation.", "Get-MgAuditLogSignIn -Filter \"userPrincipalName eq '...' and ipAddress eq '...'\" | Select-Object ... | Export-Csv ~/Desktop/rowenna-signins.csv -NoTypeInformation -Delimiter ';'", "Get-MgAuditLogSignIn -Filter \"userPrincipalName eq '" + RW + "' and ipAddress eq '" + ATT + "'\" | Select-Object CreatedDateTime,IPAddress,@{n='Error';e={$_.Status.ErrorCode}} | Export-Csv ~/Desktop/rowenna-signins.csv -NoTypeInformation -Delimiter ';'"],
  real: ["Get-MgAuditLogSignIn -Filter \"userPrincipalName eq '<you>'\" -Top 20 | Select-Object CreatedDateTime,IPAddress | Export-Csv ~/Desktop/my-signins.csv -NoTypeInformation -Delimiter ';'", "open ~/Desktop/my-signins.csv"],
  cheat: [["$s + $a | Sort-Object Time", "Join two lists, in order"], ["Export-Csv ~/Desktop/x.csv -NoTypeInformation -Delimiter ';'", "CSV for Belgian Excel"], ["Start-Transcript -Path ~/Desktop/incident.log", "Record what you do"]]
}
);

Object.assign(DRILLS, {
  signins: [
    { setup: "inv", q: "The newest 5 sign-ins in the tenant: CreatedDateTime, UserPrincipalName, IPAddress.", out: "Get-MgAuditLogSignIn -Top 5 | Select-Object CreatedDateTime,UserPrincipalName,IPAddress", hint: "-Top 5" },
    { setup: "inv", q: "Every sign-in that failed with a wrong password (50126): UserPrincipalName, IPAddress.", out: "Get-MgAuditLogSignIn -Filter \"status/errorCode eq 50126\" | Select-Object UserPrincipalName,IPAddress", hint: "status/errorCode eq 50126, no quotes" },
    { setup: "inv", q: "Every sign-in from outside Belgium: UserPrincipalName, IPAddress and a Country column.", out: "Get-MgAuditLogSignIn -Filter \"location/countryOrRegion ne 'BE'\" | Select-Object UserPrincipalName,IPAddress,@{n='Country';e={$_.Location.CountryOrRegion}}", hint: "location/countryOrRegion ne 'BE'" },
    { setup: "inv", q: "Theodwyn Gallow's sign-ins: CreatedDateTime, IPAddress and a City column.", out: "Get-MgAuditLogSignIn -Filter \"userPrincipalName eq '" + TG + "'\" | Select-Object CreatedDateTime,IPAddress,@{n='City';e={$_.Location.City}}", hint: "$_.Location.City" },
    { setup: "inv", q: "Try filtering Rowenna's successful sign-ins with status.errorCode (a dot). Read the error, then do it right.", fn: (ctx, res, hist) => hist.some((h) => /status\.errorCode/i.test(h)) && !res.error && res.out.length === 3, sol: ["Get-MgAuditLogSignIn -Filter \"userPrincipalName eq '" + RW + "' and status.errorCode eq 0\"", "Get-MgAuditLogSignIn -Filter \"userPrincipalName eq '" + RW + "' and status/errorCode eq 0\""], hint: "A slash, not a dot." },
    { setup: "inv", q: "Count sign-ins per country: make a Country column, group on it, show Name and Count.", out: "Get-MgAuditLogSignIn | Select-Object @{n='Country';e={$_.Location.CountryOrRegion}} | Group-Object Country | Select-Object Name,Count", hint: "Calculate first, then Group-Object Country." },
    { setup: "inv", q: "Which apps did Rowenna's sign-ins use? Each AppDisplayName once.", out: "Get-MgAuditLogSignIn -Filter \"userPrincipalName eq '" + RW + "'\" | Select-Object AppDisplayName -Unique", hint: "-Unique" }
  ],
  spray: [
    { q: "Attempts per account from " + ATT + ": Name and Count.", out: "Get-MgAuditLogSignIn -Filter \"ipAddress eq '" + ATT + "'\" | Group-Object UserPrincipalName | Select-Object Name,Count", hint: "Group-Object UserPrincipalName" },
    { q: "Which accounts got locked out (50053)? UserPrincipalName only.", out: "Get-MgAuditLogSignIn -Filter \"status/errorCode eq 50053\" | Select-Object UserPrincipalName", hint: "status/errorCode eq 50053" },
    { q: "When did the spray start? The oldest attempt from " + ATT + ": CreatedDateTime and UserPrincipalName.", out: "Get-MgAuditLogSignIn -Filter \"ipAddress eq '" + ATT + "'\" | Sort-Object CreatedDateTime | Select-Object -First 1 CreatedDateTime,UserPrincipalName", hint: "Sort oldest first, take one." },
    { q: "How many different accounts did " + ATT + " try? One number.", fn: (ctx, res) => res.out.length === 1 && res.out[0] === 9, sol: ["(Get-MgAuditLogSignIn -Filter \"ipAddress eq '" + ATT + "'\" | Select-Object UserPrincipalName -Unique).Count"], hint: "(... -Unique).Count" },
    { q: "Which groups is Rowenna in? Names only.", out: "Get-MgUserMemberOf -UserId " + RW + " | ForEach-Object { $_.AdditionalProperties.displayName }", hint: "Get-MgUserMemberOf, AdditionalProperties.displayName" },
    { q: "Rowenna's user object says when he last signed in. Show DisplayName and a Last column from SignInActivity.", out: "Get-MgUser -UserId " + RW + " -Property DisplayName,SignInActivity | Select-Object DisplayName,@{n='Last';e={$_.SignInActivity.LastSignInDateTime}}", hint: "The stale report would call him active now." }
  ],
  inboxrule: [
    { q: "Theodwyn Gallow's inbox rules.", out: "Get-InboxRule -Mailbox " + TG, hint: "-Mailbox" },
    { q: "Theodwyn's rules that delete mail: Name and SubjectContainsWords.", out: "Get-InboxRule -Mailbox " + TG + " | Where-Object { $_.DeleteMessage } | Select-Object Name,SubjectContainsWords", hint: "Where-Object { $_.DeleteMessage }" },
    { q: "Hunt: every rule in the tenant that deletes mail. MailboxOwnerId and Name.", out: "Get-EXOMailbox -ResultSize Unlimited -RecipientTypeDetails UserMailbox | ForEach-Object { Get-InboxRule -Mailbox $_.UserPrincipalName } | Where-Object { $_.DeleteMessage } | Select-Object MailboxOwnerId,Name", hint: "Every mailbox, ForEach-Object, Get-InboxRule, Where-Object." },
    { q: "Hunt: rules whose name is only dots (regex '^\\.+$'). MailboxOwnerId and Name.", out: "Get-EXOMailbox -ResultSize Unlimited -RecipientTypeDetails UserMailbox | ForEach-Object { Get-InboxRule -Mailbox $_.UserPrincipalName } | Where-Object { $_.Name -match '^\\.+$' } | Select-Object MailboxOwnerId,Name", hint: "-match '^\\.+$'" },
    { q: "Run Get-InboxRule without -Mailbox and read the error.", fn: (ctx, res) => !!res.error && /couldn't be found/.test(res.error.text()), sol: ["Get-InboxRule"], hint: "Just run it." },
    { q: "How many inbox rules exist in the whole tenant? One number.", fn: (ctx, res) => res.out.length === 1 && res.out[0] === ctx.t.rules.length, sol: ["(Get-EXOMailbox -ResultSize Unlimited -RecipientTypeDetails UserMailbox | ForEach-Object { Get-InboxRule -Mailbox $_.UserPrincipalName }).Count"], hint: "Wrap the hunt in ( ).Count" },
    { q: "Garrion Penhale's 'Clients to folder' rule: Name and Description as a list. Is it normal?", out: "Get-InboxRule -Mailbox " + U("garrion.penhale") + " -Identity 'Clients to folder' | Format-List Name,Description", hint: "Quotes around a name with spaces." }
  ],
  msgtrace: [
    { q: "Mail to finance@" + DOMAIN + " in the last 7 days: Received, SenderAddress, Subject.", out: "Get-MessageTraceV2 -RecipientAddress finance@" + DOMAIN + " " + WEEK + " | Select-Object Received,SenderAddress,Subject", hint: "-RecipientAddress" },
    { q: "How many mails did Rowenna send in the last 7 days? One number.", fn: (ctx, res) => res.out.length === 1 && res.out[0] === 10, sol: ["(Get-MessageTraceV2 -SenderAddress " + RW + " " + WEEK + ").Count"], hint: "( ... ).Count" },
    { q: "Which of Rowenna's mails were caught as spam? RecipientAddress and Subject.", out: "Get-MessageTraceV2 -SenderAddress " + RW + " " + WEEK + " -Status FilteredAsSpam | Select-Object RecipientAddress,Subject", hint: "-Status FilteredAsSpam" },
    { q: "Try a 14-day window for Rowenna. Read the error.", fn: (ctx, res) => !!res.error && /10 days/.test(res.error.text()), sol: ["Get-MessageTraceV2 -SenderAddress " + RW + " -StartDate (Get-Date).AddDays(-14) -EndDate (Get-Date)"], hint: "AddDays(-14)" },
    { q: "Everything from voicemail@halvardco-voice.example in the last 7 days: RecipientAddress and Status.", out: "Get-MessageTraceV2 -SenderAddress voicemail@halvardco-voice.example " + WEEK + " | Select-Object RecipientAddress,Status", hint: "Another sender, same shape." },
    { q: "Any mail with 'bank details' in the subject this week: SenderAddress and RecipientAddress.", out: "Get-MessageTraceV2 " + WEEK + " -Subject 'bank details' -SubjectFilterType Contains | Select-Object SenderAddress,RecipientAddress", hint: "No sender needed: -Subject" }
  ],
  auditlog: [
    { q: "Everything Rowenna's account did this week: CreationDate and Operations.", out: "Search-UnifiedAuditLog " + WEEK + " -UserIds " + RW + " | Select-Object CreationDate,Operations", hint: "-UserIds" },
    { q: "Everything that came from " + ATT + ": UserIds and Operations.", out: "Search-UnifiedAuditLog " + WEEK + " -IPAddresses " + ATT + " | Select-Object UserIds,Operations", hint: "-IPAddresses" },
    { q: "Your own admin actions this week (kaatje@" + DOMAIN + "): CreationDate and Operations.", out: "Search-UnifiedAuditLog " + WEEK + " -UserIds kaatje@" + DOMAIN + " | Select-Object CreationDate,Operations", hint: "Your own UPN" },
    { q: "The parameters the attacker used for Rowenna's rule (Name and Value).", out: "$e = Search-UnifiedAuditLog " + WEEK + " -UserIds " + RW + " -Operations New-InboxRule; ($e.AuditData | ConvertFrom-Json).Parameters", hint: "(... | ConvertFrom-Json).Parameters" },
    { q: "Every failed login this week: UserIds only.", out: "Search-UnifiedAuditLog " + WEEK + " -Operations UserLoginFailed | Select-Object UserIds", hint: "-Operations UserLoginFailed" },
    { q: "Run Search-UnifiedAuditLog with only -UserIds (no dates). Read what PowerShell says.", fn: (ctx, res) => !!res.error, sol: ["Search-UnifiedAuditLog -UserIds " + RW], hint: "The dates are mandatory." }
  ],
  authmethods: [
    { q: "Method types on Elara Wynn's account.", out: "Get-MgUserAuthenticationMethod -UserId " + U("elara.wynn") + " | ForEach-Object { $_.AdditionalProperties['@odata.type'] }", hint: "Same pattern as Rowenna." },
    { q: "Elara's Authenticator app: DisplayName and PhoneAppVersion.", out: "Get-MgUserAuthenticationMicrosoftAuthenticatorMethod -UserId " + U("elara.wynn") + " | Select-Object DisplayName,PhoneAppVersion", hint: "The MicrosoftAuthenticator command" },
    { q: "How many methods does Rowenna have? One number.", fn: (ctx, res) => res.out.length === 1 && res.out[0] === 2, sol: ["(Get-MgUserAuthenticationMethod -UserId " + RW + ").Count"], hint: "( ... ).Count" },
    { q: "Rowenna's phone method Id, as a plain value.", out: "Get-MgUserAuthenticationPhoneMethod -UserId " + RW + " | Select-Object -ExpandProperty Id", hint: "-ExpandProperty Id" },
    { q: "Hunt: which members have a phone method at all? DisplayName only.", out: "Get-MgUser -All -Filter \"userType eq 'Member'\" | ForEach-Object { if (Get-MgUserAuthenticationPhoneMethod -UserId $_.Id) { $_.DisplayName } }", hint: "if (Get-...PhoneMethod ...) inside ForEach-Object" }
  ],
  contain: [
    { q: "Rehearse blocking Theodwyn Gallow with -WhatIf.", fn: (ctx, res) => userOf(ctx, "theodwyn.gallow").AccountEnabled === true && res.host.some((h) => /What if/.test(h.text || "")), sol: ["Update-MgUser -UserId " + TG + " -AccountEnabled:$false -WhatIf"], hint: "-WhatIf" },
    { q: "Try resetting Theodwyn's password to 'abc123'. Read the error.", fn: (ctx, res) => !!res.error && /complexity/.test(res.error.text()), sol: ["Update-MgUser -UserId " + TG + " -PasswordProfile @{ Password = 'abc123'; ForceChangePasswordNextSignIn = $true }"], hint: "Too short on purpose." },
    { q: "Block Theodwyn and revoke her sessions, in the right order, in one line.", fn: (ctx) => { const r = ctx.t.revoked[TG]; return userOf(ctx, "theodwyn.gallow").AccountEnabled === false && !!r && r.afterBlock; }, sol: ["Update-MgUser -UserId " + TG + " -AccountEnabled:$false; Revoke-MgUserSignInSession -UserId " + TG], hint: "Two commands, a semicolon between." },
    { q: "Reset Theodwyn's password to a strong one and force a change.", fn: (ctx) => { const u = userOf(ctx, "theodwyn.gallow"); return !!u._pwReset && u._pwReset.force && u._pwReset.password; }, sol: ["Update-MgUser -UserId " + TG + " -PasswordProfile @{ Password = 'Quay-Lantern-5530!'; ForceChangePasswordNextSignIn = $true }"], hint: "PasswordProfile hashtable" },
    { q: "Verify Rowenna is blocked: DisplayName and AccountEnabled.", pre: ["Update-MgUser -UserId " + RW + " -AccountEnabled:$false"], out: "Get-MgUser -UserId " + RW + " -Property DisplayName,AccountEnabled | Select-Object DisplayName,AccountEnabled", hint: "-Property, then Select-Object." },
    { q: "Contain Theodwyn with a splat for the reset: $p = @{ UserId = ...; PasswordProfile = @{ ... } }; Update-MgUser @p.", fn: (ctx, res, hist) => { const u = userOf(ctx, "theodwyn.gallow"); return !!u._pwReset && u._pwReset.force && hist.some((h) => /@p\b/.test(h)); }, sol: ["$p = @{ UserId = '" + TG + "'; PasswordProfile = @{ Password = 'Quay-Lantern-5530!'; ForceChangePasswordNextSignIn = $true } }; Update-MgUser @p"], hint: "A hashtable inside a hashtable." }
  ],
  cleanmail: [
    { q: "Rehearse removing Rowenna's '..' rule with -WhatIf.", fn: (ctx, res) => !!ruleOf(ctx, "Rowenna Harthorn", "..") && res.host.some((h) => /What if/.test(h.text || "")), sol: ["Remove-InboxRule -Mailbox " + RW + " -Identity '..' -WhatIf"], hint: "-WhatIf" },
    { q: "Disable Theodwyn's '.' rule instead of removing it.", fn: (ctx) => { const r = ruleOf(ctx, "Theodwyn Gallow", "."); return !!r && r.Enabled === false; }, sol: ["Disable-InboxRule -Mailbox " + TG + " -Identity '.'"], hint: "Disable-InboxRule" },
    { q: "Pipe it: remove every rule in Theodwyn's mailbox that deletes mail, no prompt.", fn: (ctx, res, hist) => !ruleOf(ctx, "Theodwyn Gallow", ".") && !!ruleOf(ctx, "Theodwyn Gallow", "Bank statements") && hist.some((h) => /\|\s*remove-inboxrule/i.test(h)), sol: ["Get-InboxRule -Mailbox " + TG + " | Where-Object { $_.DeleteMessage } | Remove-InboxRule -Confirm:$false"], hint: "Get | Where | Remove" },
    { q: "Does Theodwyn's mailbox forward anywhere? DisplayName and ForwardingSmtpAddress.", out: "Get-EXOMailbox -Identity " + TG + " -Properties ForwardingSmtpAddress | Select-Object DisplayName,ForwardingSmtpAddress", hint: "-Properties ForwardingSmtpAddress" },
    { q: "Who can open Rowenna's mailbox?", out: "Get-MailboxPermission -Identity " + RW, hint: "Get-MailboxPermission" },
    { q: "Remove Rowenna's '..' rule, then show the rules that are left.", fn: (ctx, res) => !ruleOf(ctx, "Rowenna Harthorn", "..") && res.out.length === 1 && res.out[0].Name === "Shift roster", sol: ["Remove-InboxRule -Mailbox " + RW + " -Identity '..' -Confirm:$false", "Get-InboxRule -Mailbox " + RW], hint: "Remove, then Get." }
  ],
  cleanmfa: [
    { q: "Remove Rowenna's phone method.", fn: (ctx) => !methodsOf(ctx, "rowenna.harthorn").some((m) => m.kind === "phone"), sol: ["$p = Get-MgUserAuthenticationPhoneMethod -UserId " + RW + "; Remove-MgUserAuthenticationPhoneMethod -UserId " + RW + " -PhoneAuthenticationMethodId $p.Id"], hint: "Store it in $p first." },
    { q: "With read-only access, try to remove Rowenna's phone method. Read the error.", setup: "inv", fn: (ctx, res) => !!res.error && /403|Authorization/.test(res.error.text()), sol: ["Remove-MgUserAuthenticationPhoneMethod -UserId " + RW + " -PhoneAuthenticationMethodId 3179e48a-750b-4051-897c-87b9720928f7"], hint: "You are connected with Read scopes." },
    { q: "After the cleanup, how many methods does Rowenna have? One number.", pre: ["$p = Get-MgUserAuthenticationPhoneMethod -UserId " + RW + "; Remove-MgUserAuthenticationPhoneMethod -UserId " + RW + " -PhoneAuthenticationMethodId $p.Id"], fn: (ctx, res) => res.out.length === 1 && res.out[0] === 1, sol: ["(Get-MgUserAuthenticationMethod -UserId " + RW + ").Count"], hint: "( ... ).Count" },
    { q: "Take Rowenna out of SG-MFA-Exclusion.", fn: (ctx) => !grpHas(ctx, "SG-MFA-Exclusion", "rowenna.harthorn"), sol: ["$g = Get-MgGroup -Filter \"displayName eq 'SG-MFA-Exclusion'\"; $u = Get-MgUser -UserId " + RW + "; Remove-MgGroupMemberByRef -GroupId $g.Id -DirectoryObjectId $u.Id"], hint: "Group Id and user Id." },
    { q: "Rehearse removing the phone method with -WhatIf.", fn: (ctx, res) => methodsOf(ctx, "rowenna.harthorn").some((m) => m.kind === "phone") && res.host.some((h) => /What if/.test(h.text || "")), sol: ["Remove-MgUserAuthenticationPhoneMethod -UserId " + RW + " -PhoneAuthenticationMethodId 3179e48a-750b-4051-897c-87b9720928f7 -WhatIf"], hint: "-WhatIf" }
  ],
  blast: [
    { q: "Did " + ATT + " get into anyone besides Rowenna? UserPrincipalName of successful sign-ins, once.", out: "Get-MgAuditLogSignIn -Filter \"ipAddress eq '" + ATT + "' and status/errorCode eq 0\" | Select-Object UserPrincipalName -Unique", hint: "Same as the spray recall." },
    { q: "How many people got the shift-roster link delivered? One number.", fn: (ctx, res) => res.out.length === 1 && res.out[0] === 6, sol: ["(Get-MessageTraceV2 -SenderAddress " + RW + " " + WEEK + " -Subject 'shift roster' -SubjectFilterType Contains -Status Delivered).Count"], hint: "( ... ).Count" },
    { q: "Every mail this week that came in from the attacker's IP (FromIP): SenderAddress and RecipientAddress.", out: "Get-MessageTraceV2 " + WEEK + " | Where-Object { $_.FromIP -eq '" + ATT + "' } | Select-Object SenderAddress,RecipientAddress", hint: "FromIP is not a parameter: use Where-Object." },
    { q: "Did anyone reply to Rowenna this week? Mail to Rowenna: SenderAddress and Subject.", fn: (ctx, res, hist) => !res.error && res.out.length === 0 && hist.some((h) => /-RecipientAddress\s+rowenna\.harthorn@/i.test(h) && /StartDate/i.test(h)), sol: ["Get-MessageTraceV2 -RecipientAddress " + RW + " " + WEEK + " | Select-Object SenderAddress,Subject"], hint: "-RecipientAddress, with the window. Empty is the answer." },
    { q: "Who got the voicemail phish delivered? Plain addresses.", out: "Get-MessageTraceV2 -SenderAddress voicemail@halvardco-voice.example " + WEEK + " -Status Delivered | Select-Object -ExpandProperty RecipientAddress", hint: "-Status Delivered, -ExpandProperty" },
    { q: "For each voicemail recipient, list their successful sign-ins from abroad (UserPrincipalName, IPAddress).", out: "$to = Get-MessageTraceV2 -SenderAddress voicemail@halvardco-voice.example " + WEEK + " -Status Delivered | Select-Object -ExpandProperty RecipientAddress; foreach ($r in $to) { Get-MgAuditLogSignIn -Filter \"userPrincipalName eq '$r' and status/errorCode eq 0 and location/countryOrRegion ne 'BE'\" | Select-Object UserPrincipalName,IPAddress }", hint: "A loop with the recipient inside the filter." }
  ],
  evidence: [
    { q: "Export Rowenna's audit events (CreationDate, Operations) to ~/Desktop/rowenna-audit.csv for Belgian Excel.", fn: (ctx) => { const c = csvRows(ctx, "/Users/kaatje/Desktop/rowenna-audit.csv"); return !!c && c.head === "\"CreationDate\";\"Operations\"" && c.rows.length === 7; }, sol: ["Search-UnifiedAuditLog " + WEEK + " -UserIds " + RW + " | Select-Object CreationDate,Operations | Export-Csv ~/Desktop/rowenna-audit.csv -NoTypeInformation -Delimiter ';'"], hint: "-Delimiter ';'" },
    { q: "Build the full timeline (Time, What, IP from both sources) and export it to ~/Desktop/rowenna-timeline.csv with ';'.", fn: (ctx) => { const c = csvRows(ctx, "/Users/kaatje/Desktop/rowenna-timeline.csv"); return !!c && c.head === "\"Time\";\"What\";\"IP\"" && c.rows.length === 11; }, sol: ["$s = Get-MgAuditLogSignIn -Filter \"userPrincipalName eq '" + RW + "'\" | Select-Object @{n='Time';e={$_.CreatedDateTime}},@{n='What';e={'Sign-in, error ' + $_.Status.ErrorCode}},@{n='IP';e={$_.IPAddress}}", "$a = Search-UnifiedAuditLog " + WEEK + " -UserIds " + RW + " | Select-Object @{n='Time';e={$_.CreationDate}},@{n='What';e={$_.Operations}},@{n='IP';e={($_.AuditData | ConvertFrom-Json).ClientIP}}", "$s + $a | Sort-Object Time | Export-Csv ~/Desktop/rowenna-timeline.csv -NoTypeInformation -Delimiter ';'"], hint: "Same three column names on both sides." },
    { q: "Record a containment rehearsal (-WhatIf block and revoke for Rowenna) in ~/Desktop/incident.log.", fn: (ctx) => { const t = fsText(ctx, "/Users/kaatje/Desktop/incident.log"); return !ctx.transcript && !!t && /What if/.test(t); }, sol: ["Start-Transcript -Path ~/Desktop/incident.log", "Update-MgUser -UserId " + RW + " -AccountEnabled:$false -WhatIf; Revoke-MgUserSignInSession -UserId " + RW + " -WhatIf", "Stop-Transcript"], hint: "Start, work, Stop." },
    { q: "Read the timeline back: import ~/Desktop/rowenna-timeline.csv (it uses ;) and show the first 3 rows.", pre: ["$s = Get-MgAuditLogSignIn -Filter \"userPrincipalName eq '" + RW + "'\" | Select-Object @{n='Time';e={$_.CreatedDateTime}},@{n='What';e={'Sign-in'}}; $s | Export-Csv ~/Desktop/rowenna-timeline.csv -NoTypeInformation -Delimiter ';'"], fn: (ctx, res) => res.out.length === 3 && !!res.out[0].What, sol: ["Import-Csv ~/Desktop/rowenna-timeline.csv -Delimiter ';' | Select-Object -First 3"], hint: "Import-Csv also needs -Delimiter ';'." },
    { q: "Export every successful foreign sign-in this week (UserPrincipalName, IPAddress, CreatedDateTime) to ~/Desktop/foreign.csv with ';'.", fn: (ctx) => { const c = csvRows(ctx, "/Users/kaatje/Desktop/foreign.csv"); return !!c && c.head === "\"UserPrincipalName\";\"IPAddress\";\"CreatedDateTime\"" && c.rows.length === 5; }, sol: ["Get-MgAuditLogSignIn -Filter \"location/countryOrRegion ne 'BE' and status/errorCode eq 0\" | Select-Object UserPrincipalName,IPAddress,CreatedDateTime | Export-Csv ~/Desktop/foreign.csv -NoTypeInformation -Delimiter ';'"], hint: "Filter, select, export." }
  ]
});

const INCIDENT = {
  id: "incident", name: "Voicemail", seq: 8, kind: "EVENT · LIVE INCIDENT", allow: /theodwyn\.gallow/i, hero: "desync",
  need: (m) => m.seq >= 7 && m.seq <= 8,
  story: "Tuesday, 09:05. Theodwyn Gallow (Finance) calls: she opened a voicemail link yesterday, signed in, and since then Outlook 'acts weird'. She has MFA, so 'it can't be a hack'. It can: the link went through a proxy that stole her session. You are on your own; the console starts with nothing connected.",
  doneMsg: "Theodwyn's account is contained, cleaned and documented. That is a real incident, handled in the right order.",
  tickets: [
    { id: "i1", from: "Theodwyn Gallow", title: "Where did she sign in from?", body: "Show only Theodwyn's sign-ins from outside Belgium. Include the IPAddress.", hint: "Read scope for the log, then -Filter on her UPN and location/countryOrRegion ne 'BE'.",
      check: (ctx, hist, res) => res && res.out.length >= 1 && res.out.every((o) => o && o.IPAddress === "104.28.66.19") },
    { id: "i2", from: "You", title: "Contain her", body: "Block Theodwyn's sign-in and kill her sessions, in the right order.", hint: "Write scope. Update-MgUser -AccountEnabled:$false, then Revoke-MgUserSignInSession.",
      check: (ctx) => { const r = ctx.t.revoked && ctx.t.revoked[TG]; return userOf(ctx, "theodwyn.gallow").AccountEnabled === false && !!r && r.afterBlock; } },
    { id: "i3", from: "You", title: "New password", body: "Reset her password to a strong one she must change at next sign-in.", hint: "-PasswordProfile @{ Password = '...'; ForceChangePasswordNextSignIn = $true }",
      check: (ctx) => { const u = userOf(ctx, "theodwyn.gallow"); return !!u._pwReset && u._pwReset.force && u._pwReset.password; } },
    { id: "i4", from: "Theodwyn Gallow", title: "Security mails never arrive", body: "Something in her mailbox eats every mail about security. Find it and remove it, and only it.", hint: "Connect-ExchangeOnline, Get-InboxRule -Mailbox, Remove-InboxRule -Identity ... -Confirm:$false.",
      check: (ctx) => !ruleOf(ctx, "Theodwyn Gallow", ".") && !!ruleOf(ctx, "Theodwyn Gallow", "Bank statements") },
    { id: "i5", from: "Hesper Reedmire", title: "Who else got that voicemail?", body: "Finance wants to warn the others. List everyone who received a mail from the voicemail sender this week.", hint: "Get-MessageTraceV2 -SenderAddress voicemail@halvardco-voice.example with a 7-day window.",
      check: (ctx, hist, res) => { if (!res) return false; const want = ["theodwyn.gallow", "hesper.reedmire", "tamsin.rookwood", "ysolde.marrow"].map(U); const got = res.out.map((o) => String(o && o.RecipientAddress ? o.RecipientAddress : o).toLowerCase()); return want.every((w) => got.includes(w)) && got.length === 4; } },
    { id: "i6", from: "Insurer", title: "Evidence", body: "Export Theodwyn's sign-ins from 104.28.66.19 to ~/Desktop/theodwyn-incident.csv so Excel on your Belgian Mac opens it in columns.", hint: "Filter on UPN and ipAddress, Export-Csv with -Delimiter ';'.",
      check: (ctx) => { const f = ctx.fs["/Users/kaatje/Desktop/theodwyn-incident.csv"]; if (!f) return false; const l = f.text.split("\n").filter(Boolean); return l.length === 3 && l[0].includes(";") && l.slice(1).every((x) => x.includes("104.28.66.19")); } }
  ]
};
GATE.need = (m) => m.seq <= 1;
GATE.kind = "TAKEOVER · LEVEL 1 · LOGISTICS";
GATE.allow = /corvin\.ashby|liora\.pennywhistle/i;
GATE.hero = "gate";
GATE.doneMsg = "Halvard & Co is mapped, tidied and safe. Mailboxes is the next corridor.";
const GATES = [GATE, INCIDENT];

ERR_HELP.unshift(
  [/Could not find a property named '[^']*' on type 'microsoft\.graph\.signIn'|status\.errorCode|location\.country/i, "Inside a Graph -Filter, nested properties use a slash: status/errorCode, location/countryOrRegion."],
  [/couldn't be found on .*kaatje@/i, "Without -Mailbox, Exchange looks in your own mailbox, and you have none. Add -Mailbox <their address>."],
  [/can't be longer than 10 days/i, "Message trace takes at most 10 days per query. Make the window smaller or split it in two."],
  [/does not comply with password complexity/i, "Too weak. Use 8+ characters with upper, lower, digits and a symbol."],
  [/Conversion from JSON failed/i, "That text is not JSON. ConvertFrom-Json only works on AuditData-style text."]
);
