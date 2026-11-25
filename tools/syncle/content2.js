SEQUENCES[2].open = true; SEQUENCES[3].open = true; SEQUENCES[4].open = true;
SEQUENCES[4].name = "Licenses & lifecycle";
SEQUENCES[4].blurb = "Who has what, what is free, and the whole life of an account: create it, license it, delete it, bring it back.";

MEMORIES.push(
{
  id: "getmbx", seq: 2, name: "Get-EXOMailbox", tag: "FIND MAILBOXES", title: "Find any mailbox, and what kind it is",
  summary: "List user, shared and room mailboxes, and ask for the extra properties you need.",
  setup: "exo",
  brief: {
    what: [
      "Every mailbox has a <b>RecipientTypeDetails</b>: UserMailbox (a person), SharedMailbox (info@, sales@, no own sign-in), RoomMailbox (a meeting room). Most mailbox tickets start by finding the right one and checking its type.",
      "<b>Get-EXOMailbox</b> is the fast, modern command. Like Graph, it only returns a small set of properties unless you ask for more with <b>-Properties</b>. The older <b>Get-Mailbox</b> returns everything but is slower; you will still meet it in scripts and docs."
    ],
    daily: ["\"Which shared mailboxes do we have?\"", "Checking a mailbox exists before giving someone access", "Finding mailboxes with a setting turned on, like forwarding"],
    parts: [["Get-EXOMailbox", "read mailboxes (fast, REST)"], ["-Identity", "one mailbox: address, name or alias"], ["-RecipientTypeDetails SharedMailbox", "only one kind"], ["-ResultSize Unlimited", "every mailbox, not the first 1000"], ["-Properties ForwardingSmtpAddress", "ask for extra properties"]],
    flow: [["Exchange", "every mailbox"], ["-RecipientTypeDetails", "pick a kind"], ["-Properties", "extra fields"], ["Result", "fast"]],
    traps: [
      ["Empty is not empty", "Without -Properties, ForwardingSmtpAddress and friends come back blank even when they are set. Same trap as Graph's -Property."],
      ["The 1000 limit", "Get-EXOMailbox returns 1000 by default. Use -ResultSize Unlimited for reports."],
      ["Shared needs no license", "Shared mailboxes up to 50 GB need no license, which is why leavers are often converted to shared."]
    ]
  },
  watch: [
    { code: "Get-EXOMailbox -RecipientTypeDetails SharedMailbox", say: "Only the shared mailboxes. These are the team addresses like info@ and sales@." },
    { code: "Get-EXOMailbox -Identity " + U("dorian.pikeholm") + " | Select-Object DisplayName,ForwardingSmtpAddress", say: "Forwarding looks empty..." },
    { code: "Get-EXOMailbox -Identity " + U("dorian.pikeholm") + " -Properties ForwardingSmtpAddress | Select-Object DisplayName,ForwardingSmtpAddress", say: "...until you ask for it. Dorian forwards his mail to an outside address. Remember this one." }
  ],
  trace: { ask: "List only the room mailboxes.", tpl: "Get-EXOMailbox -RecipientTypeDetails [[RoomMailbox]]", check: { out: "Get-EXOMailbox -RecipientTypeDetails RoomMailbox" }, wrong: "Pick the room kind." },
  traceHints: ["Kinds are written as one word: UserMailbox, SharedMailbox...", "Meeting rooms.", "R___Mailbox", "Answer: RoomMailbox"],
  recall: { ask: "Show DisplayName and PrimarySmtpAddress of every shared mailbox.", setup: "exo", check: { out: "Get-EXOMailbox -RecipientTypeDetails SharedMailbox | Select-Object DisplayName,PrimarySmtpAddress" }, wrong: "Shared only, two columns." },
  recallHints: ["Filter on the kind first.", "Then pick two columns.", "Get-EXOMailbox -RecipientTypeDetails ______ | Select-Object ...", "Get-EXOMailbox -RecipientTypeDetails SharedMailbox | Select-Object DisplayName,PrimarySmtpAddress"],
  real: ["Connect-ExchangeOnline -ShowBanner:$false", "Get-EXOMailbox -RecipientTypeDetails SharedMailbox -ResultSize Unlimited | Select-Object DisplayName,PrimarySmtpAddress"],
  cheat: [["Get-EXOMailbox -RecipientTypeDetails SharedMailbox", "All shared mailboxes"], ["Get-EXOMailbox -Identity x -Properties ForwardingSmtpAddress", "Ask for extra properties"], ["Get-EXOMailbox -ResultSize Unlimited", "Every mailbox"]]
},
{
  id: "fullaccess", seq: 2, name: "Mailbox permissions", tag: "FULL ACCESS", title: "Give someone access to a shared mailbox",
  summary: "Read and grant FullAccess, and choose whether Outlook auto-adds the mailbox.",
  setup: "exo",
  brief: {
    what: [
      "<b>FullAccess</b> lets someone open a mailbox and read everything in it. It is the permission behind \"please add me to the Finance mailbox\". Get-MailboxPermission shows who has it; Add-MailboxPermission grants it.",
      "<b>AutoMapping</b> decides whether Outlook adds the mailbox to the person's folder list by itself. It is on by default. Turn it off with -AutoMapping:$false when someone has access to many mailboxes and Outlook gets slow."
    ],
    daily: ["New colleague needs the team mailbox", "\"Who can read the Finance Inbox?\"", "Audits: remove access people no longer need"],
    parts: [["Get-MailboxPermission -Identity \"Finance Inbox\"", "who has access"], ["Add-MailboxPermission", "grant access"], ["-User", "who gets it"], ["-AccessRights FullAccess", "what they get"], ["-AutoMapping:$false", "do not auto-add in Outlook"]],
    flow: [["Ticket", "add me to finance@"], ["Get-MailboxPermission", "already there?"], ["Add-MailboxPermission", "FullAccess"], ["Outlook", "shows up within an hour"]],
    traps: [
      ["NT AUTHORITY\\SELF", "Every mailbox lists SELF: that is the mailbox's own access. Filter it out in reports."],
      ["FullAccess is not Send As", "Reading the mailbox does not let you send as it. That is a separate permission (next memory)."],
      ["Remove asks to confirm", "Remove-MailboxPermission stops and asks Y/N. In scripts add -Confirm:$false."]
    ]
  },
  watch: [
    { code: "Get-MailboxPermission -Identity \"Finance Inbox\"", say: "Who can open the Finance Inbox. SELF is the mailbox itself, the rest are people." },
    { code: "Add-MailboxPermission -Identity \"Finance Inbox\" -User " + U("theodwyn.gallow") + " -AccessRights FullAccess", say: "Grant Theodwyn FullAccess. Exchange answers with the new permission entry." },
    { code: "Get-MailboxPermission -Identity \"Finance Inbox\" -User " + U("theodwyn.gallow"), say: "Check one person's access with -User." }
  ],
  trace: { ask: "Give Ilsabet Varrow FullAccess to the Finance Inbox.", tpl: "Add-MailboxPermission -Identity \"Finance Inbox\" -User " + U("ilsabet.varrow") + " -AccessRights [[FullAccess]]", check: { fn: (ctx) => ctx.t.perms.some((p) => p.mb === "Finance Inbox" && p.upn === U("ilsabet.varrow")) }, wrong: "Grant the full mailbox access right." },
  traceHints: ["Which right lets someone open everything?", "Two words glued together.", "F___A_____", "Answer: FullAccess"],
  recall: { ask: "Nessa Quill joins Support. Give her FullAccess to the Support mailbox, without auto-mapping it in Outlook.", setup: "exo", check: { fn: (ctx) => ctx.t.perms.some((p) => p.mb === "Support" && p.upn === U("nessa.quill") && p.automap === false) }, wrong: "FullAccess on Support, AutoMapping off." },
  recallHints: ["Same command as the trace.", "Add the switch with a glued value.", "... -AccessRights FullAccess -AutoMapping:$_____", "Add-MailboxPermission -Identity Support -User " + U("nessa.quill") + " -AccessRights FullAccess -AutoMapping:$false"],
  real: ["Get-MailboxPermission -Identity <a shared mailbox you manage>", "Look for people who should no longer have access"],
  cheat: [["Get-MailboxPermission -Identity \"Finance Inbox\"", "Who has access"], ["Add-MailboxPermission -Identity x -User y -AccessRights FullAccess", "Grant access"], ["... -AutoMapping:$false", "Do not auto-add in Outlook"], ["Remove-MailboxPermission -Identity x -User y -AccessRights FullAccess -Confirm:$false", "Remove access"]]
},
{
  id: "sendas", seq: 2, name: "Send As", tag: "SEND AS", title: "Let someone send from a shared address",
  summary: "Send As is a recipient permission, and it asks for confirmation.",
  setup: "exo",
  brief: {
    what: [
      "<b>Send As</b> lets someone send mail that looks exactly like it came from the mailbox: the recipient sees sales@, not the person. In Exchange Online it is not a mailbox permission but a <b>recipient</b> permission: Get-RecipientPermission and Add-RecipientPermission.",
      "Add-RecipientPermission stops and asks <b>are you sure?</b>. That is fine at the prompt, but a script will hang on it. Add <b>-Confirm:$false</b>."
    ],
    daily: ["\"I can read sales@ but can't send from it\"", "Team mailboxes for support desks", "Reviewing who can impersonate a shared address"],
    parts: [["Get-RecipientPermission -Identity \"Sales Desk\"", "who has Send As"], ["Add-RecipientPermission", "grant it"], ["-Trustee", "who gets it (not -User!)"], ["-AccessRights SendAs", "the right"], ["-Confirm:$false", "no prompt"]],
    flow: [["FullAccess", "read the mailbox"], ["SendAs", "send as the mailbox"], ["Outlook From field", "pick the address"], ["Recipient", "sees only sales@"]],
    traps: [
      ["-Trustee, not -User", "Mailbox permissions say -User, recipient permissions say -Trustee. Mixing them up is a classic error."],
      ["SendAs on Add-MailboxPermission", "Exchange Online refuses it there. Send As lives on Add-RecipientPermission."],
      ["The prompt", "Without -Confirm:$false the command waits for Y. In the lab nothing changes until you answer the real way."]
    ]
  },
  watch: [
    { code: "Get-RecipientPermission -Identity \"Sales Desk\"", say: "Garrion can send as the Sales Desk. SELF is the mailbox itself." },
    { code: "Add-RecipientPermission -Identity \"Sales Desk\" -Trustee " + U("elara.wynn") + " -AccessRights SendAs", say: "No -Confirm:$false, so it stops and asks. Nothing changed yet." },
    { code: "Add-RecipientPermission -Identity \"Sales Desk\" -Trustee " + U("elara.wynn") + " -AccessRights SendAs -Confirm:$false", say: "With -Confirm:$false it goes straight through." }
  ],
  trace: { ask: "Give Cassian Drake Send As on Support, without the prompt.", tpl: "Add-RecipientPermission -Identity Support -Trustee " + U("cassian.drake") + " -AccessRights SendAs -Confirm:[[$false]]", check: { fn: (ctx) => ctx.t.sendAs.some((p) => p.mb === "Support" && p.upn === U("cassian.drake")) }, wrong: "Answer the confirmation in advance." },
  traceHints: ["-Confirm is a switch with a glued value.", "Which value means: do not ask me?", "-Confirm:$_____", "Answer: -Confirm:$false"],
  recall: { ask: "Tamsin Rookwood should be able to send as the Finance Inbox. Make it so, without a prompt.", setup: "exo", check: { fn: (ctx) => ctx.t.sendAs.some((p) => p.mb === "Finance Inbox" && p.upn === U("tamsin.rookwood")) }, wrong: "SendAs on the Finance Inbox for Tamsin." },
  recallHints: ["Recipient permission, not mailbox permission.", "-Trustee for the person.", "Add-RecipientPermission -Identity \"Finance Inbox\" -Trustee ... -AccessRights SendAs -Confirm:$false", "Add-RecipientPermission -Identity \"Finance Inbox\" -Trustee " + U("tamsin.rookwood") + " -AccessRights SendAs -Confirm:$false"],
  real: ["Get-RecipientPermission -Identity <a shared mailbox>", "Compare it with Get-MailboxPermission for the same mailbox"],
  cheat: [["Get-RecipientPermission -Identity \"Sales Desk\"", "Who can send as"], ["Add-RecipientPermission -Identity x -Trustee y -AccessRights SendAs -Confirm:$false", "Grant Send As"]]
},
{
  id: "forward", seq: 2, name: "Forwarding", tag: "FORWARDING", title: "Find and stop mail forwarding",
  summary: "Forwarding to outside addresses is a classic data leak. Find it, then switch it off.",
  setup: "exo",
  brief: {
    what: [
      "<b>ForwardingSmtpAddress</b> on a mailbox sends a copy (or all) of its mail to another address, often outside the company. Attackers love setting it on a compromised mailbox, and departing employees sometimes set it themselves. Finding it is a standard security check.",
      "To switch it off, set it to <b>$null</b>. <b>DeliverToMailboxAndForward</b> decides whether the original mailbox keeps a copy. Note: unlike switches, these are normal true/false parameters, so they take a space: <b>-DeliverToMailboxAndForward $false</b>."
    ],
    daily: ["Security check: who forwards outside?", "Leavers: forward to their manager for a while", "Compromised accounts: the first thing to check"],
    parts: [["-Properties ForwardingSmtpAddress", "ask for it, or it looks empty"], ["Where-Object { $_.ForwardingSmtpAddress }", "keep only mailboxes where it is set"], ["Set-Mailbox -ForwardingSmtpAddress $null", "switch forwarding off"], ["-DeliverToMailboxAndForward $true", "keep a copy too"]],
    flow: [["All mailboxes", "-ResultSize Unlimited"], ["-Properties", "ask for forwarding"], ["Where-Object", "keep the set ones"], ["Set-Mailbox", "$null to clear"]],
    traps: [
      ["Ask for it", "Without -Properties ForwardingSmtpAddress every mailbox looks clean."],
      ["Bool vs switch", "-DeliverToMailboxAndForward $true is a normal [bool] parameter, so a space works. Switches like -AccountEnabled need the colon."],
      ["Inbox rules too", "Forwarding can also hide in inbox rules (Get-InboxRule). That comes in the Investigate sequence."]
    ]
  },
  watch: [
    { code: "Get-EXOMailbox -ResultSize Unlimited -Properties ForwardingSmtpAddress | Where-Object { $_.ForwardingSmtpAddress } | Select-Object DisplayName,ForwardingSmtpAddress", say: "Every mailbox, ask for forwarding, keep the ones where it is set. Dorian forwards to a private address." },
    { code: "Set-Mailbox -Identity " + U("dorian.pikeholm") + " -ForwardingSmtpAddress $null -DeliverToMailboxAndForward $false", say: "Switch it off. $null clears the value." },
    { code: "Get-EXOMailbox -Identity " + U("dorian.pikeholm") + " -Properties ForwardingSmtpAddress | Select-Object DisplayName,ForwardingSmtpAddress", say: "Verify: empty now, and this time it is really empty." }
  ],
  trace: { ask: "Stop Dorian Pikeholm's forwarding.", tpl: "Set-Mailbox -Identity " + U("dorian.pikeholm") + " -ForwardingSmtpAddress [[$null]]", check: { fn: (ctx) => findMbxT(ctx, "Dorian Pikeholm").ForwardingSmtpAddress === null }, wrong: "Clear the forwarding address." },
  traceHints: ["Which value means: nothing?", "It starts with a $.", "$____", "Answer: $null"],
  recall: { ask: "Hesper Reedmire is on sick leave. Forward his mail to Ysolde Marrow (ysolde.marrow@" + DOMAIN + ") and keep a copy in his own mailbox.", setup: "exo", check: { fn: (ctx) => { const m = findMbxT(ctx, "Hesper Reedmire"); return /ysolde\.marrow@/i.test(m.ForwardingSmtpAddress || "") && m.DeliverToMailboxAndForward === true; } }, wrong: "Set the forwarding address and keep a copy." },
  recallHints: ["One Set-Mailbox with two parameters.", "-ForwardingSmtpAddress and -DeliverToMailboxAndForward", "Set-Mailbox -Identity hesper.reedmire@... -ForwardingSmtpAddress ysolde.marrow@... -DeliverToMailboxAndForward $true", "Set-Mailbox -Identity " + U("hesper.reedmire") + " -ForwardingSmtpAddress " + U("ysolde.marrow") + " -DeliverToMailboxAndForward $true"],
  real: ["Get-EXOMailbox -ResultSize Unlimited -Properties ForwardingSmtpAddress | Where-Object { $_.ForwardingSmtpAddress } | Select-Object DisplayName,ForwardingSmtpAddress", "Every hit should have a reason"],
  cheat: [["Get-EXOMailbox -ResultSize Unlimited -Properties ForwardingSmtpAddress | Where-Object { $_.ForwardingSmtpAddress }", "Who forwards mail"], ["Set-Mailbox -Identity x -ForwardingSmtpAddress $null", "Stop forwarding"], ["Set-Mailbox -Identity x -ForwardingSmtpAddress y -DeliverToMailboxAndForward $true", "Forward and keep a copy"]]
},
{
  id: "oof", seq: 2, name: "Auto-replies", tag: "OUT OF OFFICE", title: "Set someone's out-of-office for them",
  summary: "Turn automatic replies on or off for someone who cannot do it themselves.",
  setup: "exo",
  brief: {
    what: [
      "When someone is suddenly away (sick, left, on leave without setting it), the manager asks IT to set an out-of-office. <b>Set-MailboxAutoReplyConfiguration</b> does it for them; <b>Get-MailboxAutoReplyConfiguration</b> shows the current state.",
      "<b>AutoReplyState</b> is Enabled, Disabled or Scheduled (with -StartTime and -EndTime). Internal and external messages are separate, so customers can get a different text than colleagues."
    ],
    daily: ["Sudden sick leave", "Leavers: \"Anwen no longer works here, please contact...\"", "Checking why someone sends auto-replies"],
    parts: [["Set-MailboxAutoReplyConfiguration", "set the out-of-office"], ["-AutoReplyState Enabled", "on (or Disabled / Scheduled)"], ["-InternalMessage \"...\"", "text for colleagues"], ["-ExternalMessage \"...\"", "text for everyone else"]],
    flow: [["Manager", "\"he's off sick\""], ["Set-...AutoReply...", "Enabled + messages"], ["Get-...AutoReply...", "verify"], ["Senders", "get the reply"]],
    traps: [
      ["Spelling the state", "Enabled, Disabled, Scheduled. Anything else is rejected with a list of valid values."],
      ["Quotes", "Messages contain spaces, so always quote them."],
      ["Shared mailboxes", "Works on shared mailboxes too: handy for info@ during holidays."]
    ]
  },
  watch: [
    { code: "Get-MailboxAutoReplyConfiguration -Identity " + U("hesper.reedmire"), say: "Currently disabled." },
    { code: "Set-MailboxAutoReplyConfiguration -Identity " + U("hesper.reedmire") + " -AutoReplyState Enabled -InternalMessage \"Hesper is out, contact Ysolde.\" -ExternalMessage \"Hesper is out of office. Please contact finance@halvardco.onmicrosoft.com.\"", say: "Switch it on with two messages. Silence means success." },
    { code: "Get-MailboxAutoReplyConfiguration -Identity " + U("hesper.reedmire") + " | Select-Object AutoReplyState,InternalMessage", say: "Verify." }
  ],
  trace: { ask: "Turn on Corvin Ashby's auto-reply (messages already filled in).", tpl: "Set-MailboxAutoReplyConfiguration -Identity " + U("corvin.ashby") + " -AutoReplyState [[Enabled]] -InternalMessage \"Back Monday\" -ExternalMessage \"Back Monday\"", check: { fn: (ctx) => findMbxT(ctx, "Corvin Ashby")._arc.AutoReplyState === "Enabled" }, wrong: "Pick the state that switches it on." },
  traceHints: ["Three possible states.", "Not Disabled, not Scheduled.", "E______", "Answer: Enabled"],
  recall: { ask: "The Careers mailbox has been on holiday auto-reply for weeks. Switch it off.", setup: "exo", pre: ["Set-MailboxAutoReplyConfiguration -Identity Careers -AutoReplyState Enabled -InternalMessage \"Closed\" -ExternalMessage \"Closed\""], check: { fn: (ctx) => findMbxT(ctx, "Careers")._arc.AutoReplyState === "Disabled" }, wrong: "Set the state back to off." },
  recallHints: ["Same command, other state.", "Disabled.", "Set-MailboxAutoReplyConfiguration -Identity Careers -AutoReplyState ________", "Set-MailboxAutoReplyConfiguration -Identity Careers -AutoReplyState Disabled"],
  real: ["Get-MailboxAutoReplyConfiguration -Identity <your own address>"],
  cheat: [["Set-MailboxAutoReplyConfiguration -Identity x -AutoReplyState Enabled -InternalMessage \"...\" -ExternalMessage \"...\"", "Turn on out-of-office"], ["Get-MailboxAutoReplyConfiguration -Identity x", "Check it"], ["... -AutoReplyState Disabled", "Turn it off"]]
},
{
  id: "shared", seq: 2, name: "Convert & aliases", tag: "LEAVERS + ADDRESSES", title: "Convert to shared, add an address",
  summary: "Turn a leaver's mailbox into a shared one, check its size, and manage extra email addresses.",
  setup: "exo",
  brief: {
    what: [
      "When someone leaves, their mailbox is usually <b>converted to a shared mailbox</b> so the team keeps access and the license can be freed. <b>Set-Mailbox -Type Shared</b> does it. A shared mailbox has a 50 GB limit without a license, so check the size first with <b>Get-EXOMailboxStatistics</b>.",
      "Extra addresses (aliases) live in <b>EmailAddresses</b>. Capital <b>SMTP:</b> marks the primary address, lowercase <b>smtp:</b> the aliases. Add or remove one with a hashtable: <b>@{add='smtp:...'}</b>. Setting a plain value would replace every address."
    ],
    daily: ["Leaver: convert, then remove the license", "\"Can I also receive mail on cfo@?\"", "Checking a mailbox's size before moving or converting it"],
    parts: [["Get-EXOMailboxStatistics -Identity x", "size and item count"], ["Set-Mailbox -Type Shared", "convert to shared"], ["-EmailAddresses @{add='smtp:cfo@...'}", "add one alias"], ["@{remove='smtp:...'}", "remove one alias"]],
    flow: [["Leaver", "mailbox"], ["Statistics", "under 50 GB?"], ["-Type Shared", "convert"], ["License", "can be removed"]],
    traps: [
      ["Over 50 GB", "A shared mailbox over 50 GB still needs a license. Check the size first."],
      ["SMTP vs smtp", "Uppercase is the primary address. You cannot remove the primary; set another one first."],
      ["Replace vs add", "-EmailAddresses user@x replaces everything. Always use @{add=...} or @{remove=...}."]
    ]
  },
  watch: [
    { code: "Get-EXOMailboxStatistics -Identity " + U("garrion.penhale"), say: "Garrion's mailbox is 46 GB: under the 50 GB limit, but close." },
    { code: "Set-Mailbox -Identity " + U("garrion.penhale") + " -Type Shared", say: "Convert. Silence again." },
    { code: "Get-EXOMailbox -Identity " + U("garrion.penhale") + " | Select-Object DisplayName,RecipientTypeDetails", say: "Now a SharedMailbox." },
    { code: "Set-Mailbox -Identity " + U("hesper.reedmire") + " -EmailAddresses @{add='smtp:cfo@" + DOMAIN + "'}", say: "Separate task: give Hesper an extra address." },
    { code: "Get-EXOMailbox -Identity " + U("hesper.reedmire") + " | Select-Object -ExpandProperty EmailAddresses", say: "Primary in capitals, the new alias in lowercase." }
  ],
  trace: { ask: "Convert Liora Pennywhistle's mailbox to shared.", tpl: "Set-Mailbox -Identity " + U("liora.pennywhistle") + " -Type [[Shared]]", check: { fn: (ctx) => findMbxT(ctx, "Liora Pennywhistle").RecipientTypeDetails === "SharedMailbox" }, wrong: "Pick the shared type." },
  traceHints: ["The -Type values are Regular, Room, Equipment, Shared.", "Not SharedMailbox here, just the short word.", "S_____", "Answer: Shared"],
  recall: { ask: "Give the Support mailbox an extra address: helpdesk@" + DOMAIN + ".", setup: "exo", check: { fn: (ctx) => findMbxT(ctx, "Support").EmailAddresses.some((e) => e.toLowerCase() === "smtp:helpdesk@" + DOMAIN) }, wrong: "Add, don't replace." },
  recallHints: ["EmailAddresses with a hashtable.", "@{add='smtp:...'}", "Set-Mailbox -Identity Support -EmailAddresses @{add='smtp:helpdesk@...'}", "Set-Mailbox -Identity Support -EmailAddresses @{add='smtp:helpdesk@" + DOMAIN + "'}"],
  real: ["Get-EXOMailboxStatistics -Identity <your address>", "Get-EXOMailbox -Identity <your address> | Select-Object -ExpandProperty EmailAddresses"],
  cheat: [["Get-EXOMailboxStatistics -Identity x", "Mailbox size"], ["Set-Mailbox -Identity x -Type Shared", "Convert to shared"], ["Set-Mailbox -Identity x -EmailAddresses @{add='smtp:a@b'}", "Add an alias"], ["Set-Mailbox -Identity x -EmailAddresses @{remove='smtp:a@b'}", "Remove an alias"]]
},
{
  id: "dl", seq: 3, name: "Distribution lists", tag: "WHO GETS THE MAIL", title: "Read distribution lists and their members",
  summary: "List the mailing lists and see exactly who is on them.",
  setup: "exo",
  brief: {
    what: [
      "A <b>distribution list</b> (DL) is an address that fans out to many people: all@, sales-team@. They live in Exchange, so you use Exchange commands: <b>Get-DistributionGroup</b> and <b>Get-DistributionGroupMember</b>.",
      "Most DL tickets sound like \"I don't get the all@ mails\". The answer is almost always: they are not on the list. Check before you change anything."
    ],
    daily: ["\"I don't receive all@ mails\"", "\"Who is on sales-team@?\"", "Counting members for a newsletter"],
    parts: [["Get-DistributionGroup", "every list"], ["Get-DistributionGroupMember -Identity \"All Staff\"", "who is on one list"], ["(...).Count", "how many"]],
    flow: [["Mail to all@", "one address"], ["Distribution list", "member list"], ["Each member", "gets a copy"], ["Not on it", "gets nothing"]],
    traps: [
      ["Identity", "Use the name, alias or address. Typos give: couldn't be found on ...PROD.OUTLOOK.COM"],
      ["Exchange, not Graph", "Mail-only lists are Exchange objects. Graph's group commands show Microsoft 365 and security groups."]
    ]
  },
  watch: [
    { code: "Get-DistributionGroup", say: "Every distribution list in the tenant." },
    { code: "Get-DistributionGroupMember -Identity \"Finance Team\"", say: "Who is on finance-team@." },
    { code: "(Get-DistributionGroupMember -Identity \"All Staff\").Count", say: "How many people get all@ mails." }
  ],
  trace: { ask: "Show who is on the IT Alerts list.", tpl: "Get-DistributionGroupMember -Identity \"[[IT Alerts]]\"", check: { out: "Get-DistributionGroupMember -Identity \"IT Alerts\"" }, wrong: "Use the list's name." },
  traceHints: ["The name of the list.", "Two words, in quotes.", "IT ______", "Answer: IT Alerts"],
  recall: { ask: "Rowenna Harthorn says he never receives all@ mails. Show the DisplayName and PrimarySmtpAddress of everyone on All Staff, sorted by DisplayName, and see for yourself.", setup: "exo", check: { out: "Get-DistributionGroupMember -Identity \"All Staff\" | Sort-Object DisplayName | Select-Object DisplayName,PrimarySmtpAddress" }, wrong: "Members of All Staff, sorted, two columns." },
  recallHints: ["Members of the list first.", "Then Sort-Object, then Select-Object.", "Get-DistributionGroupMember -Identity \"All Staff\" | Sort-Object DisplayName | Select-Object ...", "Get-DistributionGroupMember -Identity \"All Staff\" | Sort-Object DisplayName | Select-Object DisplayName,PrimarySmtpAddress"],
  real: ["Get-DistributionGroup -ResultSize Unlimited", "Get-DistributionGroupMember -Identity <a list you know>"],
  cheat: [["Get-DistributionGroup", "All lists"], ["Get-DistributionGroupMember -Identity \"All Staff\"", "Members of a list"]]
},
{
  id: "dladd", seq: 3, name: "List membership", tag: "ADD + REMOVE", title: "Add and remove list members",
  summary: "Put people on a list, take them off, and handle the confirmation prompt.",
  setup: "exo",
  brief: {
    what: [
      "<b>Add-DistributionGroupMember</b> puts someone on a list; <b>Remove-DistributionGroupMember</b> takes them off. Adding someone who is already a member gives an error; it does not quietly do nothing. That is useful: it tells you the ticket had another cause.",
      "Remove asks for confirmation, so scripts need <b>-Confirm:$false</b>. Add does not."
    ],
    daily: ["New joiners on team lists", "Leavers off every list", "Fixing \"I don't get the mails\""],
    parts: [["Add-DistributionGroupMember -Identity \"All Staff\" -Member x", "add"], ["Remove-DistributionGroupMember ... -Confirm:$false", "remove without a prompt"]],
    flow: [["Check", "Get-...Member"], ["Add / Remove", "one person"], ["Already a member?", "error tells you"], ["Verify", "Get-...Member again"]],
    traps: [
      ["Already a member", "The recipient ... is already a member of the group: the problem is somewhere else (spam filter, rule, typo in the address)."],
      ["Not a member", "Removing someone who is not on it errors too."],
      ["Prompt", "Remove without -Confirm:$false waits for Y."]
    ]
  },
  watch: [
    { code: "Add-DistributionGroupMember -Identity \"All Staff\" -Member " + U("rowenna.harthorn"), say: "Rowenna was missing from All Staff. Add him." },
    { code: "Add-DistributionGroupMember -Identity \"All Staff\" -Member " + U("rowenna.harthorn"), say: "Run it twice and Exchange tells you he is already a member." },
    { code: "Remove-DistributionGroupMember -Identity \"Finance Team\" -Member " + U("theodwyn.gallow"), say: "Remove asks first. Nothing happens until you answer." },
    { code: "Remove-DistributionGroupMember -Identity \"Finance Team\" -Member " + U("theodwyn.gallow") + " -Confirm:$false", say: "With -Confirm:$false it goes through." }
  ],
  trace: { ask: "Add Nessa Quill to the Sales Team list.", tpl: "Add-DistributionGroupMember -Identity \"Sales Team\" -[[Member]] " + U("nessa.quill"), check: { fn: (ctx) => dlHas(ctx, "Sales Team", "nessa.quill") }, wrong: "Which parameter names the person?" },
  traceHints: ["Identity is the list. The person is the...", "Singular.", "-M_____", "Answer: -Member"],
  recall: { ask: "Briar Locke moved from Marketing to Sales. Add her to Sales Team. (Marketing has no list, so that is all.)", setup: "exo", check: { fn: (ctx) => dlHas(ctx, "Sales Team", "briar.locke") }, wrong: "Briar on the Sales Team list." },
  recallHints: ["One command.", "Add-DistributionGroupMember", "Add-DistributionGroupMember -Identity \"Sales Team\" -Member ...", "Add-DistributionGroupMember -Identity \"Sales Team\" -Member " + U("briar.locke")],
  real: ["Add yourself to a test list, then remove yourself with -Confirm:$false"],
  cheat: [["Add-DistributionGroupMember -Identity x -Member y", "Add to a list"], ["Remove-DistributionGroupMember -Identity x -Member y -Confirm:$false", "Remove from a list"]]
},
{
  id: "newdl", seq: 3, name: "New-DistributionGroup", tag: "CREATE", title: "Create a new mailing list",
  summary: "Make a new list with an address and its first members in one line.",
  setup: "exo",
  brief: {
    what: [
      "<b>New-DistributionGroup</b> creates a list. Give it a <b>-Name</b>, ideally a <b>-PrimarySmtpAddress</b> (otherwise one is made from the name), and optionally the first <b>-Members</b> as a comma list.",
      "Names must be unique across all recipients, not just lists."
    ],
    daily: ["A new team needs an address", "Project lists", "Replacing a list someone made in Outlook"],
    parts: [["New-DistributionGroup -Name \"Legal Team\"", "create"], ["-PrimarySmtpAddress legal-team@...", "its address"], ["-Members a,b,c", "first members"]],
    flow: [["Name", "unique"], ["Address", "chosen"], ["Members", "comma list"], ["List", "ready to use"]],
    traps: [["Name taken", "The name ... is being used by another recipient object."], ["Members must exist", "A typo in -Members stops the whole command."]]
  },
  watch: [
    { code: "New-DistributionGroup -Name \"Legal Team\" -PrimarySmtpAddress legal-team@" + DOMAIN + " -Members " + U("isolde.fenn") + "," + U("mirethe.stonewyrm"), say: "A new list with an address and two members." },
    { code: "Get-DistributionGroupMember -Identity \"Legal Team\"", say: "Check it." }
  ],
  trace: { ask: "Create a list called Marketing Team.", tpl: "New-DistributionGroup -[[Name]] \"Marketing Team\" -PrimarySmtpAddress marketing-team@" + DOMAIN, check: { fn: (ctx) => !!ctx.t.dls.find((d) => d.Name === "Marketing Team") }, wrong: "Which parameter gives the list its name?" },
  traceHints: ["The first parameter.", "-N___", "-Name", "Answer: -Name"],
  recall: { ask: "Create a list HR Team with address hr-team@" + DOMAIN + " and members Seren Blackwood, Liora Pennywhistle and Juniper Oakes.", setup: "exo", check: { fn: (ctx) => { const d = ctx.t.dls.find((x) => x.Name === "HR Team"); return d && d.PrimarySmtpAddress === "hr-team@" + DOMAIN && ["seren.blackwood", "liora.pennywhistle", "juniper.oakes"].every((n) => d.members.includes(U(n))); } }, wrong: "Name, address and the three members." },
  recallHints: ["One New-DistributionGroup.", "-Members takes a comma-separated list of addresses.", "New-DistributionGroup -Name \"HR Team\" -PrimarySmtpAddress hr-team@... -Members a,b,c", "New-DistributionGroup -Name \"HR Team\" -PrimarySmtpAddress hr-team@" + DOMAIN + " -Members " + U("seren.blackwood") + "," + U("liora.pennywhistle") + "," + U("juniper.oakes")],
  real: ["Only in a test tenant or with approval: New-DistributionGroup -Name \"Test List\" -WhatIf"],
  cheat: [["New-DistributionGroup -Name x -PrimarySmtpAddress y -Members a,b", "Create a list"]]
},
{
  id: "mggroup", seq: 3, name: "Get-MgGroup", tag: "365 + SECURITY", title: "Microsoft 365 and security groups",
  summary: "Teams, SharePoint and access live on Graph groups. Find them and tell them apart.",
  setup: "groups",
  brief: {
    what: [
      "Graph has two big kinds of groups. <b>Microsoft 365 groups</b> (GroupTypes contains Unified) sit behind every Team and its SharePoint site. <b>Security groups</b> (SecurityEnabled is True) give access: VPN, file shares, license assignment, Conditional Access exclusions.",
      "<b>Get-MgGroup</b> lists them. Use <b>-Filter</b> to find one by name, and you need a group scope like <b>Group.Read.All</b>."
    ],
    daily: ["\"Which Teams do we have?\"", "Finding the group that grants VPN access", "Reviewing risky groups like MFA exclusions"],
    parts: [["Get-MgGroup -All", "every group"], ["-Filter \"displayName eq 'SG-VPN-Users'\"", "one by name"], ["GroupTypes -contains 'Unified'", "it is a Microsoft 365 group"], ["SecurityEnabled", "it grants access"]],
    flow: [["Get-MgGroup", "all groups"], ["Unified", "Teams + SharePoint"], ["SecurityEnabled", "access"], ["Members", "next memory"]],
    traps: [["Scope", "User.Read.All is not enough: you need Group.Read.All (or GroupMember.Read.All)."], ["GroupTypes is a list", "Use -contains, not -eq, to check for 'Unified'."]]
  },
  watch: [
    { code: "Get-MgGroup -All", say: "Every group. Note the GroupTypes column: {Unified} or empty." },
    { code: "Get-MgGroup -All | Where-Object { $_.GroupTypes -contains 'Unified' } | Select-Object DisplayName", say: "Only Microsoft 365 groups: these have a Team or SharePoint site." },
    { code: "Get-MgGroup -Filter \"displayName eq 'SG-MFA-Exclusion'\"", say: "Find one security group by name. An MFA exclusion group is worth a look in any audit." }
  ],
  trace: { ask: "Find the group called SG-VPN-Users.", tpl: "Get-MgGroup -Filter \"displayName eq '[[SG-VPN-Users]]'\"", check: { out: "Get-MgGroup -Filter \"displayName eq 'SG-VPN-Users'\"" }, wrong: "Filter on the exact name." },
  traceHints: ["The value goes between single quotes.", "Exact name, dashes included.", "SG-___-_____", "Answer: SG-VPN-Users"],
  recall: { ask: "List the DisplayName of every security group.", setup: "groups", check: { out: "Get-MgGroup -All | Where-Object { $_.SecurityEnabled } | Select-Object DisplayName" }, wrong: "Keep the groups where SecurityEnabled is true." },
  recallHints: ["Get every group, then keep some.", "SecurityEnabled is already true/false.", "Get-MgGroup -All | Where-Object { $_._______________ } | Select-Object DisplayName", "Get-MgGroup -All | Where-Object { $_.SecurityEnabled } | Select-Object DisplayName"],
  real: ["Connect-MgGraph -Scopes Group.Read.All", "Get-MgGroup -All | Where-Object { $_.GroupTypes -contains 'Unified' } | Measure-Object"],
  cheat: [["Get-MgGroup -All", "Every group"], ["Get-MgGroup -Filter \"displayName eq 'x'\"", "One group by name"], ["Where-Object { $_.GroupTypes -contains 'Unified' }", "Microsoft 365 groups only"]]
},
{
  id: "mgmember", seq: 3, name: "Group members", tag: "WHO IS IN", title: "See who is in a group, and what someone is in",
  summary: "Get-MgGroupMember hides names in AdditionalProperties. Learn the three ways around it.",
  setup: "groups",
  brief: {
    what: [
      "<b>Get-MgGroupMember</b> returns directory objects: you see only an Id. The names are there, but tucked inside <b>AdditionalProperties</b>. Read them with <b>$_.AdditionalProperties.displayName</b> (lowercase d: it is raw Graph data).",
      "Easier: <b>Get-MgGroupMemberAsUser</b> returns proper user objects you can -Property and Select-Object. And the other direction, every group one person is in: <b>Get-MgUserMemberOf</b>."
    ],
    daily: ["\"Who has VPN access?\"", "\"Why can Rowenna skip MFA?\" (what is he a member of)", "Access reviews"],
    parts: [["$g = Get-MgGroup -Filter ...", "store the group, you need its Id"], ["Get-MgGroupMember -GroupId $g.Id", "members as Ids"], ["$_.AdditionalProperties.displayName", "the hidden name"], ["Get-MgGroupMemberAsUser", "members as real users"], ["Get-MgUserMemberOf -UserId x", "every group x is in"]],
    flow: [["Group name", "-Filter"], ["$g.Id", "the key"], ["Members", "Ids + AdditionalProperties"], ["Names", "readable"]],
    traps: [["Id only", "The member list looks like a column of GUIDs. Nothing is wrong; the name is in AdditionalProperties."], ["GroupId, not name", "-GroupId wants the Id. Store the group in a variable first."]]
  },
  watch: [
    { code: "$g = Get-MgGroup -Filter \"displayName eq 'Project Northwyrm'\"", say: "Store the group. You need its Id for everything that follows." },
    { code: "Get-MgGroupMember -GroupId $g.Id", say: "Just Ids. The names are hidden one level down." },
    { code: "Get-MgGroupMember -GroupId $g.Id | ForEach-Object { $_.AdditionalProperties.displayName }", say: "Reach into AdditionalProperties for each member." },
    { code: "Get-MgGroupMemberAsUser -GroupId $g.Id -Property DisplayName,JobTitle | Select-Object DisplayName,JobTitle", say: "Or ask for them as real users straight away." },
    { code: "Get-MgUserMemberOf -UserId " + U("rowenna.harthorn") + " | ForEach-Object { $_.AdditionalProperties.displayName }", say: "The other direction: everything Rowenna is in. An MFA exclusion. Interesting." }
  ],
  trace: { ask: "Show the names of everyone in Halvard Leadership.", tpl: "$g = Get-MgGroup -Filter \"displayName eq 'Halvard Leadership'\"; Get-MgGroupMember -GroupId $g.Id | ForEach-Object { $_.[[AdditionalProperties]].displayName }", check: { out: "$g = Get-MgGroup -Filter \"displayName eq 'Halvard Leadership'\"; Get-MgGroupMember -GroupId $g.Id | ForEach-Object { $_.AdditionalProperties.displayName }" }, wrong: "Where does Graph hide the name?" },
  traceHints: ["The name is not a normal property here.", "It sits in a bag of extra properties.", "A__________P_________", "Answer: AdditionalProperties"],
  recall: { ask: "Which groups is Caius Merrowind a member of? Show just the names.", setup: "groups", check: { out: "Get-MgUserMemberOf -UserId " + U("caius.merrowind") + " | ForEach-Object { $_.AdditionalProperties.displayName }" }, wrong: "Every group for one user, names only." },
  recallHints: ["The user-to-groups direction.", "Get-MgUserMemberOf, then the same AdditionalProperties trick.", "Get-MgUserMemberOf -UserId caius.merrowind@... | ForEach-Object { ... }", "Get-MgUserMemberOf -UserId " + U("caius.merrowind") + " | ForEach-Object { $_.AdditionalProperties.displayName }"],
  real: ["$g = Get-MgGroup -Filter \"displayName eq '<a group you know>'\"", "Get-MgGroupMemberAsUser -GroupId $g.Id | Select-Object DisplayName"],
  cheat: [["$g = Get-MgGroup -Filter \"displayName eq 'x'\"", "Store a group"], ["Get-MgGroupMember -GroupId $g.Id | ForEach-Object { $_.AdditionalProperties.displayName }", "Member names"], ["Get-MgGroupMemberAsUser -GroupId $g.Id", "Members as users"], ["Get-MgUserMemberOf -UserId x | ForEach-Object { $_.AdditionalProperties.displayName }", "Groups a user is in"]]
},
{
  id: "mgadd", seq: 3, name: "Change members", tag: "ADD + REMOVE", title: "Add and remove group members by Id",
  summary: "Graph group membership works with object Ids, and needs a write scope.",
  setup: "groupsW",
  brief: {
    what: [
      "<b>New-MgGroupMember</b> adds and <b>Remove-MgGroupMemberByRef</b> removes. Both want two Ids: the group's and the user's (<b>-DirectoryObjectId</b>). So the pattern is always: look up both, store them, then change.",
      "You need <b>Group.ReadWrite.All</b> or <b>GroupMember.ReadWrite.All</b>. Adding someone twice gives a long but clear error: added object references already exist."
    ],
    daily: ["VPN access for a new engineer", "Removing a leaver from security groups", "Fixing the MFA exclusion group nobody cleaned up"],
    parts: [["$g = Get-MgGroup -Filter ...", "the group"], ["$u = Get-MgUser -UserId x", "the user"], ["New-MgGroupMember -GroupId $g.Id -DirectoryObjectId $u.Id", "add"], ["Remove-MgGroupMemberByRef -GroupId $g.Id -DirectoryObjectId $u.Id", "remove"]],
    flow: [["$g", "group Id"], ["$u", "user Id"], ["New / Remove", "membership"], ["Verify", "list members"]],
    traps: [["Write scope", "403 Forbidden with only Group.Read.All."], ["Ids, not names", "DirectoryObjectId must be the user's Id, not their UPN."], ["Already exists", "Means the person is already in the group."]]
  },
  watch: [
    { code: "$g = Get-MgGroup -Filter \"displayName eq 'SG-VPN-Users'\"; $u = Get-MgUser -UserId " + U("bastian.cranefeather"), say: "Look up both and store them." },
    { code: "New-MgGroupMember -GroupId $g.Id -DirectoryObjectId $u.Id", say: "Add Bastian (night shift lead) to VPN users." },
    { code: "New-MgGroupMember -GroupId $g.Id -DirectoryObjectId $u.Id", say: "Twice: already exists." },
    { code: "$m = Get-MgGroup -Filter \"displayName eq 'SG-MFA-Exclusion'\"; $r = Get-MgUser -UserId " + U("rowenna.harthorn") + "; Remove-MgGroupMemberByRef -GroupId $m.Id -DirectoryObjectId $r.Id", say: "And clean up: Rowenna out of the MFA exclusion." }
  ],
  trace: { ask: "Add Petrel Lindgrove to Project Northwyrm ($g and $u are prepared in the same line).", tpl: "$g = Get-MgGroup -Filter \"displayName eq 'Project Northwyrm'\"; $u = Get-MgUser -UserId " + U("petrel.lindgrove") + "; New-MgGroupMember -GroupId $g.Id -DirectoryObjectId [[$u.Id]]", check: { fn: (ctx) => grpHas(ctx, "Project Northwyrm", "petrel.lindgrove") }, wrong: "The user's Id, from the variable." },
  traceHints: ["Not the UPN: the Id.", "It is stored in $u.", "$u.__", "Answer: $u.Id"],
  recall: { ask: "Lorcan Ivers no longer needs access to the finance share. Remove him from SG-Finance-Share... wait, check first: is he even in it? If not, remove Ilsabet Varrow instead, who moved to Operations.", setup: "groupsW", check: { fn: (ctx) => !grpHas(ctx, "SG-Finance-Share", "ilsabet.varrow") && grpCount(ctx, "SG-Finance-Share") === 4 }, wrong: "Ilsabet out of SG-Finance-Share, nobody else touched." },
  recallHints: ["List the members first.", "Lorcan is not there. Ilsabet is.", "Remove-MgGroupMemberByRef -GroupId $g.Id -DirectoryObjectId $u.Id", "$g = Get-MgGroup -Filter \"displayName eq 'SG-Finance-Share'\"; $u = Get-MgUser -UserId " + U("ilsabet.varrow") + "; Remove-MgGroupMemberByRef -GroupId $g.Id -DirectoryObjectId $u.Id"],
  real: ["Only on a test group: New-MgGroupMember ... -WhatIf"],
  cheat: [["New-MgGroupMember -GroupId $g.Id -DirectoryObjectId $u.Id", "Add to a group"], ["Remove-MgGroupMemberByRef -GroupId $g.Id -DirectoryObjectId $u.Id", "Remove from a group"]]
},
{
  id: "skus", seq: 4, name: "Get-MgSubscribedSku", tag: "WHAT WE OWN", title: "See which licenses you own and how many are free",
  summary: "List subscriptions and work out the free seats with a calculated column.",
  setup: "lic",
  brief: {
    what: [
      "A <b>SKU</b> is a license product: SPE_E3 (Microsoft 365 E3), EXCHANGESTANDARD, POWER_BI_PRO. <b>Get-MgSubscribedSku</b> lists what the tenant owns: <b>PrepaidUnits.Enabled</b> is how many you bought, <b>ConsumedUnits</b> how many are assigned.",
      "Free seats are not a property. You calculate them with a <b>calculated property</b>: <b>@{n='Free';e={$_.PrepaidUnits.Enabled - $_.ConsumedUnits}}</b>. n is the column name, e the expression. It reads oddly at first and then you use it everywhere."
    ],
    daily: ["\"Can I give the new hire E3?\" (are any free?)", "Finance: what are we paying for?", "Finding SKU Ids for license assignment"],
    parts: [["Get-MgSubscribedSku", "every subscription"], ["SkuPartNumber", "the readable name"], ["SkuId", "the Id you assign with"], ["@{n='Free';e={...}}", "a column you calculate yourself"]],
    flow: [["Bought", "PrepaidUnits.Enabled"], ["Assigned", "ConsumedUnits"], ["Minus", "calculated"], ["Free", "your column"]],
    traps: [["Scope", "Needs Organization.Read.All (or Directory.Read.All). User scopes alone answer 403."], ["Names are cryptic", "SPE_E3 is Microsoft 365 E3. Microsoft publishes a product-name table you will bookmark."]]
  },
  watch: [
    { code: "Get-MgSubscribedSku", say: "Every SKU with its consumed units." },
    { code: "Get-MgSubscribedSku | Select-Object SkuPartNumber,ConsumedUnits,@{n='Free';e={$_.PrepaidUnits.Enabled - $_.ConsumedUnits}}", say: "Add a Free column. Power BI Pro: zero left." }
  ],
  trace: { ask: "Show SkuPartNumber and the number of seats bought.", tpl: "Get-MgSubscribedSku | Select-Object SkuPartNumber,@{n='Bought';e={$_.PrepaidUnits.[[Enabled]]}}", check: { out: "Get-MgSubscribedSku | Select-Object SkuPartNumber,@{n='Bought';e={$_.PrepaidUnits.Enabled}}" }, wrong: "Which property inside PrepaidUnits holds the bought seats?" },
  traceHints: ["PrepaidUnits has Enabled, LockedOut, Suspended, Warning.", "The active ones.", "E______", "Answer: Enabled"],
  recall: { ask: "Show SkuPartNumber, ConsumedUnits and a Free column for every SKU.", setup: "lic", check: { out: "Get-MgSubscribedSku | Select-Object SkuPartNumber,ConsumedUnits,@{n='Free';e={$_.PrepaidUnits.Enabled - $_.ConsumedUnits}}" }, wrong: "Three columns, the last one calculated." },
  recallHints: ["Select-Object with two plain columns and one hashtable.", "n is the name, e the expression.", "@{n='Free';e={$_.PrepaidUnits.Enabled - $_._____________}}", "Get-MgSubscribedSku | Select-Object SkuPartNumber,ConsumedUnits,@{n='Free';e={$_.PrepaidUnits.Enabled - $_.ConsumedUnits}}"],
  real: ["Connect-MgGraph -Scopes Organization.Read.All", "Get-MgSubscribedSku | Select-Object SkuPartNumber,ConsumedUnits,@{n='Free';e={$_.PrepaidUnits.Enabled - $_.ConsumedUnits}}"],
  cheat: [["Get-MgSubscribedSku", "Licenses you own"], ["Select-Object SkuPartNumber,@{n='Free';e={$_.PrepaidUnits.Enabled - $_.ConsumedUnits}}", "Free seats per SKU"]]
},
{
  id: "userlic", seq: 4, name: "Get-MgUserLicenseDetail", tag: "WHO HAS WHAT", title: "See which licenses a person has",
  summary: "One user's licenses, and everyone who holds a given license.",
  setup: "lic",
  brief: {
    what: [
      "<b>Get-MgUserLicenseDetail -UserId x</b> shows one person's licenses with readable SkuPartNumbers.",
      "For the other direction (who holds Power BI Pro?) you filter users on <b>AssignedLicenses</b>, a list of objects with a SkuId each: <b>Where-Object { $_.AssignedLicenses.SkuId -contains $sku.SkuId }</b>."
    ],
    daily: ["\"Does Petrel have Power BI?\"", "\"Who has E3 but left months ago?\"", "Before removing a license: check what else they have"],
    parts: [["Get-MgUserLicenseDetail -UserId x", "one person's licenses"], ["$sku = Get-MgSubscribedSku | Where-Object SkuPartNumber -eq 'POWER_BI_PRO'", "store one SKU"], ["$_.AssignedLicenses.SkuId -contains $sku.SkuId", "has this user got it?"]],
    flow: [["Person", "UserId"], ["LicenseDetail", "readable names"], ["Or a SKU", "SkuId"], ["Everyone with it", "AssignedLicenses"]],
    traps: [["AssignedLicenses needs -Property", "It is not in the default set: -Property DisplayName,AssignedLicenses."], ["Guests", "Guests usually have no licenses: empty is normal."]]
  },
  watch: [
    { code: "Get-MgUserLicenseDetail -UserId " + U("hesper.reedmire"), say: "Hesper has Exchange Online Plan 1 (EXCHANGESTANDARD), Power BI Pro and Power Automate Free." },
    { code: "$sku = Get-MgSubscribedSku | Where-Object SkuPartNumber -eq 'POWER_BI_PRO'; Get-MgUser -All -Property DisplayName,AssignedLicenses | Where-Object { $_.AssignedLicenses.SkuId -contains $sku.SkuId } | Select-Object DisplayName", say: "Everyone who holds Power BI Pro." }
  ],
  trace: { ask: "Show Lorcan Ivers' licenses.", tpl: "Get-MgUserLicenseDetail -[[UserId]] " + U("lorcan.ivers"), check: { out: "Get-MgUserLicenseDetail -UserId " + U("lorcan.ivers") }, wrong: "Which parameter names the user?" },
  traceHints: ["Same as Get-MgUser.", "-U_____", "-UserId", "Answer: -UserId"],
  recall: { ask: "Who holds an EXCHANGESTANDARD license? Show their DisplayName.", setup: "lic", check: { out: "$sku = Get-MgSubscribedSku | Where-Object SkuPartNumber -eq 'EXCHANGESTANDARD'; Get-MgUser -All -Property DisplayName,AssignedLicenses | Where-Object { $_.AssignedLicenses.SkuId -contains $sku.SkuId } | Select-Object DisplayName" }, wrong: "Store the SKU, filter users on AssignedLicenses." },
  recallHints: ["Two steps: the SKU, then the users.", "-Property must include AssignedLicenses.", "Where-Object { $_.AssignedLicenses.SkuId -contains $sku.SkuId }", "$sku = Get-MgSubscribedSku | Where-Object SkuPartNumber -eq 'EXCHANGESTANDARD'; Get-MgUser -All -Property DisplayName,AssignedLicenses | Where-Object { $_.AssignedLicenses.SkuId -contains $sku.SkuId } | Select-Object DisplayName"],
  real: ["Get-MgUserLicenseDetail -UserId <your address>"],
  cheat: [["Get-MgUserLicenseDetail -UserId x", "One person's licenses"], ["Get-MgUser -All -Property DisplayName,AssignedLicenses | Where-Object { $_.AssignedLicenses.SkuId -contains $sku.SkuId }", "Everyone with a SKU"]]
},
{
  id: "setlic", seq: 4, name: "Set-MgUserLicense", tag: "ASSIGN", title: "Give and take licenses",
  summary: "Add and remove licenses, and beat the three classic license errors.",
  setup: "licW",
  brief: {
    what: [
      "<b>Set-MgUserLicense</b> does both adding and removing in one call. <b>-AddLicenses</b> takes a list of hashtables with a SkuId: <b>@{SkuId = $sku.SkuId}</b>. <b>-RemoveLicenses</b> takes a list of SkuIds. Both parameters are <b>required</b>, so when you only add you still pass <b>-RemoveLicenses @()</b>, and when you only remove you pass <b>-AddLicenses @()</b>.",
      "Three errors you will meet for real: the missing @(), <b>invalid usage location</b> (UsageLocation must be set first, e.g. BE), and <b>does not have any available licenses</b> (none free: remove one somewhere first)."
    ],
    daily: ["New hire: E3", "Leaver: remove licenses after converting to shared", "Moving a Power BI seat from one person to another"],
    parts: [["$sku = Get-MgSubscribedSku | Where-Object SkuPartNumber -eq 'SPE_E3'", "find the SKU"], ["-AddLicenses @{SkuId = $sku.SkuId}", "what to add"], ["-RemoveLicenses @()", "nothing to remove (still required)"], ["-RemoveLicenses @($sku.SkuId)", "remove this one"]],
    flow: [["UsageLocation?", "set first"], ["Seats free?", "check SKUs"], ["Set-MgUserLicense", "add + remove"], ["Mailbox", "appears after a few minutes"]],
    traps: [["Both lists", "Leaving out -RemoveLicenses gives: missing parameters ... removeLicenses."], ["Usage location", "Set it with Update-MgUser -UsageLocation BE."], ["Full SKU", "Free a seat first, then assign."], ["Scopes", "Needs Organization.Read.All to look up SKUs and User.ReadWrite.All to assign."]]
  },
  watch: [
    { code: "$pbi = Get-MgSubscribedSku | Where-Object SkuPartNumber -eq 'POWER_BI_PRO'", say: "Store the Power BI SKU." },
    { code: "Set-MgUserLicense -UserId " + U("petrel.lindgrove") + " -AddLicenses @{SkuId = $pbi.SkuId}", say: "Only -AddLicenses: Graph complains removeLicenses is missing." },
    { code: "Set-MgUserLicense -UserId " + U("petrel.lindgrove") + " -AddLicenses @{SkuId = $pbi.SkuId} -RemoveLicenses @()", say: "Both lists now, but no seats free." },
    { code: "Set-MgUserLicense -UserId " + U("lorcan.ivers") + " -AddLicenses @() -RemoveLicenses @($pbi.SkuId)", say: "Lorcan no longer uses Power BI: free his seat." },
    { code: "Set-MgUserLicense -UserId " + U("petrel.lindgrove") + " -AddLicenses @{SkuId = $pbi.SkuId} -RemoveLicenses @()", say: "Now Petrel gets it." }
  ],
  trace: { ask: "Give Theodwyn Gallow an E3 license ($e3 is looked up for you).", tpl: "$e3 = Get-MgSubscribedSku | Where-Object SkuPartNumber -eq 'SPE_E3'; Set-MgUserLicense -UserId " + U("theodwyn.gallow") + " -AddLicenses @{SkuId = $e3.SkuId} -RemoveLicenses [[@()]]", check: { fn: (ctx) => hasSku(ctx, "theodwyn.gallow", "SPE_E3") }, wrong: "Nothing to remove, but the parameter still needs a value." },
  traceHints: ["An empty list.", "@ and brackets.", "@_", "Answer: @()"],
  recall: { ask: "Ysolde Marrow no longer uses Power BI. Move her Power BI Pro seat to Wren Callowmere.", setup: "licW", check: { fn: (ctx) => !hasSku(ctx, "ysolde.marrow", "POWER_BI_PRO") && hasSku(ctx, "wren.callowmere", "POWER_BI_PRO") }, wrong: "Remove from Ysolde first, then add to Wren." },
  recallHints: ["No seats are free, so the order matters.", "Remove from Ysolde with -AddLicenses @(), then add to Wren with -RemoveLicenses @().", "Set-MgUserLicense -UserId ysolde... -AddLicenses @() -RemoveLicenses @($pbi.SkuId)", "$pbi = Get-MgSubscribedSku | Where-Object SkuPartNumber -eq 'POWER_BI_PRO'; Set-MgUserLicense -UserId " + U("ysolde.marrow") + " -AddLicenses @() -RemoveLicenses @($pbi.SkuId); Set-MgUserLicense -UserId " + U("wren.callowmere") + " -AddLicenses @{SkuId = $pbi.SkuId} -RemoveLicenses @()"],
  real: ["Only on a test account: Set-MgUserLicense ... -WhatIf"],
  cheat: [["Set-MgUserLicense -UserId x -AddLicenses @{SkuId = $sku.SkuId} -RemoveLicenses @()", "Add a license"], ["Set-MgUserLicense -UserId x -AddLicenses @() -RemoveLicenses @($sku.SkuId)", "Remove a license"], ["Update-MgUser -UserId x -UsageLocation BE", "Fix 'invalid usage location'"]]
},
{
  id: "newuser", seq: 4, name: "New-MgUser", tag: "CREATE", title: "Create a new account",
  summary: "Every required property, a temporary password, and the usage location for later.",
  setup: "write",
  brief: {
    what: [
      "<b>New-MgUser</b> creates an account. Five things are required: <b>-DisplayName</b>, <b>-UserPrincipalName</b>, <b>-MailNickname</b> (the part before the @), <b>-AccountEnabled</b> (a switch) and <b>-PasswordProfile</b>, a hashtable with the first password.",
      "Set <b>ForceChangePasswordNextSignIn = $true</b> so the person picks their own password, and add <b>-UsageLocation BE</b> now so licensing works straight after."
    ],
    daily: ["Every new hire", "Service accounts", "Bulk onboarding from a CSV (Bulk sequence)"],
    parts: [["$pw = @{Password = '...'; ForceChangePasswordNextSignIn = $true}", "the password profile"], ["-DisplayName \"Nimue Clarthorn\"", "the name people see"], ["-UserPrincipalName nimue.clarthorn@...", "the sign-in name"], ["-MailNickname nimue.clarthorn", "before the @"], ["-AccountEnabled", "switch: allowed to sign in"]],
    flow: [["Password profile", "hashtable"], ["New-MgUser", "five required"], ["Usage location", "BE"], ["License", "next memory"]],
    traps: [["Missing property", "Invalid value specified for property 'mailNickname' ... means a required one is missing."], ["Duplicate", "Another object with the same value for property userPrincipalName already exists."], ["Domain", "The UPN must end in a verified domain of the tenant."], ["Weak password", "Fails complexity: at least 8 characters, mixed."]]
  },
  watch: [
    { code: "New-MgUser -DisplayName \"Nimue Clarthorn\" -UserPrincipalName " + U("nimue.clarthorn") + " -AccountEnabled", say: "Missing pieces: Graph names the first one it trips over." },
    { code: "$pw = @{Password = 'Halvard-Start-2026!'; ForceChangePasswordNextSignIn = $true}", say: "Build the password profile." },
    { code: "New-MgUser -DisplayName \"Nimue Clarthorn\" -UserPrincipalName " + U("nimue.clarthorn") + " -MailNickname nimue.clarthorn -AccountEnabled -PasswordProfile $pw -UsageLocation BE -Department Sales", say: "All five, plus usage location and department." }
  ],
  trace: { ask: "Create Jorin Pellam (jorin.pellam@...). The password profile is ready in $pw.", tpl: "$pw = @{Password = 'Halvard-Start-2026!'; ForceChangePasswordNextSignIn = $true}; New-MgUser -DisplayName \"Jorin Pellam\" -UserPrincipalName " + U("jorin.pellam") + " -MailNickname [[jorin.pellam]] -AccountEnabled -PasswordProfile $pw", check: { fn: (ctx) => !!userOf(ctx, "jorin.pellam") }, wrong: "MailNickname is the part before the @." },
  traceHints: ["Look at the UPN.", "Everything before the @.", "_____.______", "Answer: jorin.pellam"],
  recall: { ask: "New hire: Liriel Maewood, Marketing, Content Writer. Create her with a temporary password she must change, usage location BE.", setup: "write", check: { fn: (ctx) => { const u = userOf(ctx, "liriel.maewood"); return u && u.DisplayName === "Liriel Maewood" && u.Department === "Marketing" && u.JobTitle === "Content Writer" && u.UsageLocation === "BE" && u.AccountEnabled && u._pwChange; } }, wrong: "All required properties plus department, title and usage location." },
  recallHints: ["Password profile first.", "Then New-MgUser with the five required plus -Department, -JobTitle, -UsageLocation.", "New-MgUser -DisplayName ... -UserPrincipalName ... -MailNickname ... -AccountEnabled -PasswordProfile $pw -UsageLocation BE -Department Marketing -JobTitle \"Content Writer\"", "$pw = @{Password = 'Halvard-Start-2026!'; ForceChangePasswordNextSignIn = $true}; New-MgUser -DisplayName \"Liriel Maewood\" -UserPrincipalName " + U("liriel.maewood") + " -MailNickname liriel.maewood -AccountEnabled -PasswordProfile $pw -UsageLocation BE -Department Marketing -JobTitle \"Content Writer\""],
  real: ["Only in a test tenant: New-MgUser ... -WhatIf"],
  cheat: [["$pw = @{Password = '...'; ForceChangePasswordNextSignIn = $true}", "Password profile"], ["New-MgUser -DisplayName x -UserPrincipalName x@d -MailNickname x -AccountEnabled -PasswordProfile $pw -UsageLocation BE", "Create a user"]]
},
{
  id: "removeuser", seq: 4, name: "Remove & restore", tag: "DELETE", title: "Delete an account, and bring it back",
  summary: "Deleted users wait 30 days in the recycle bin. Know how to restore them.",
  setup: "write",
  brief: {
    what: [
      "<b>Remove-MgUser</b> deletes an account. It is a <b>soft delete</b>: the user sits in deleted items for 30 days, with mailbox and OneDrive recoverable. <b>Get-MgDirectoryDeletedItemAsUser</b> lists them and <b>Restore-MgDirectoryDeletedItem</b> brings one back by Id.",
      "The usual leaver order: block, revoke, convert mailbox to shared, remove licenses, and only weeks later delete. Deleting is the last step, never the first."
    ],
    daily: ["Cleaning up accounts after the retention period", "\"I deleted the wrong one\" (restore)", "Test accounts"],
    parts: [["Remove-MgUser -UserId x", "soft delete"], ["Get-MgDirectoryDeletedItemAsUser", "the recycle bin"], ["Restore-MgDirectoryDeletedItem -DirectoryObjectId $id", "bring back"]],
    flow: [["Remove-MgUser", "soft delete"], ["30 days", "recoverable"], ["Restore", "by Id"], ["After 30 days", "gone for good"]],
    traps: [["Restore needs the Id", "The UPN is not enough; take the Id from the deleted items list."], ["Delete last", "Deleting first loses the mailbox handover window. Block first."]]
  },
  watch: [
    { code: "Remove-MgUser -UserId " + U("evander.holtwyrm"), say: "Evander left months ago. Delete." },
    { code: "Get-MgDirectoryDeletedItemAsUser", say: "He is in the recycle bin." },
    { code: "$d = Get-MgDirectoryDeletedItemAsUser | Where-Object UserPrincipalName -eq '" + U("evander.holtwyrm") + "'; Restore-MgDirectoryDeletedItem -DirectoryObjectId $d.Id", say: "Restore by Id." }
  ],
  trace: { ask: "Delete the account of Rhydian Bellweather.", tpl: "[[Remove-MgUser]] -UserId " + U("rhydian.bellweather"), check: { fn: (ctx) => !userOf(ctx, "rhydian.bellweather") }, wrong: "Which command deletes a user?" },
  traceHints: ["Verb Remove.", "Noun MgUser.", "Remove-______", "Answer: Remove-MgUser"],
  recall: { ask: "Someone deleted Fenna Lowmere by mistake an hour ago. Restore her.", setup: "write", pre: ["Remove-MgUser -UserId " + U("fenna.lowmere")], check: { fn: (ctx) => !!userOf(ctx, "fenna.lowmere") }, wrong: "Find her in deleted items, restore by Id." },
  recallHints: ["She is in the recycle bin.", "Get her Id from Get-MgDirectoryDeletedItemAsUser.", "Restore-MgDirectoryDeletedItem -DirectoryObjectId $d.Id", "$d = Get-MgDirectoryDeletedItemAsUser | Where-Object UserPrincipalName -eq '" + U("fenna.lowmere") + "'; Restore-MgDirectoryDeletedItem -DirectoryObjectId $d.Id"],
  real: ["Get-MgDirectoryDeletedItemAsUser (read-only, just look)"],
  cheat: [["Remove-MgUser -UserId x", "Delete (soft)"], ["Get-MgDirectoryDeletedItemAsUser", "Recycle bin"], ["Restore-MgDirectoryDeletedItem -DirectoryObjectId $d.Id", "Restore"]]
}
);

function findMbxT(ctx, dn) { return ctx.t.mailboxes.find((m) => m.DisplayName === dn); }
function dlHas(ctx, name, n) { const d = ctx.t.dls.find((x) => x.Name === name); return !!d && d.members.includes(U(n)); }
function grpOf(ctx, name) { return ctx.t.groups.find((g) => g.g.DisplayName === name); }
function grpHas(ctx, name, n) { const g = grpOf(ctx, name); const u = userOf(ctx, n); return !!g && !!u && g.members.includes(u.Id); }
function grpCount(ctx, name) { return grpOf(ctx, name).members.length; }
function hasSku(ctx, n, part) { const u = userOf(ctx, n); const s = ctx.t.skus.find((x) => x.SkuPartNumber === part); return !!u && u.AssignedLicenses.some((l) => l.SkuId === s.SkuId); }

Object.assign(DRILLS, {
  getmbx: [
    { q: "List every user mailbox.", out: "Get-EXOMailbox -RecipientTypeDetails UserMailbox", hint: "UserMailbox" },
    { q: "Show the PrimarySmtpAddress of the Careers mailbox.", out: "(Get-EXOMailbox -Identity Careers).PrimarySmtpAddress", hint: "(command).Property" },
    { q: "Show the first 4 mailboxes with the classic Get-Mailbox.", out: "Get-Mailbox -ResultSize 4", hint: "-ResultSize works on both." },
    { q: "How many mailboxes exist in total?", out: "(Get-EXOMailbox -ResultSize Unlimited).Count", hint: "-ResultSize Unlimited, then .Count" },
    { q: "Does Dorian Pikeholm's mailbox forward anywhere? Show DisplayName and ForwardingSmtpAddress.", out: "Get-EXOMailbox -Identity " + U("dorian.pikeholm") + " -Properties ForwardingSmtpAddress | Select-Object DisplayName,ForwardingSmtpAddress", hint: "Remember -Properties." },
    { q: "Count mailboxes per type (one row per RecipientTypeDetails).", out: "Get-EXOMailbox -ResultSize Unlimited | Group-Object RecipientTypeDetails | Select-Object Name,Count", hint: "Group-Object RecipientTypeDetails" }
  ],
  fullaccess: [
    { q: "Who can open the Sales Desk mailbox?", out: "Get-MailboxPermission -Identity \"Sales Desk\"", hint: "Get-MailboxPermission" },
    { q: "Show only the people (not SELF) with access to Info, as a single User column.", out: "Get-MailboxPermission -Identity Info | Where-Object { $_.User -ne 'NT AUTHORITY\\SELF' } | Select-Object User", hint: "Filter out NT AUTHORITY\\SELF." },
    { q: "Give Sorrel Achterwyn FullAccess to Info.", fn: (ctx) => ctx.t.perms.some((p) => p.mb === "Info" && p.upn === U("sorrel.achterwyn")), sol: ["Add-MailboxPermission -Identity Info -User " + U("sorrel.achterwyn") + " -AccessRights FullAccess"], hint: "Add-MailboxPermission ... -AccessRights FullAccess" },
    { q: "Elara Wynn moved out of Sales. Remove her FullAccess on Sales Desk, without a prompt.", fn: (ctx) => !ctx.t.perms.some((p) => p.mb === "Sales Desk" && p.upn === U("elara.wynn")), sol: ["Remove-MailboxPermission -Identity \"Sales Desk\" -User " + U("elara.wynn") + " -AccessRights FullAccess -Confirm:$false"], hint: "Remove-MailboxPermission ... -Confirm:$false" },
    { q: "Does Cassian Drake have access to Support? Check with -User.", out: "Get-MailboxPermission -Identity Support -User " + U("cassian.drake"), hint: "-User narrows it to one person." },
    { q: "Give Liora Pennywhistle FullAccess to Careers without auto-mapping.", fn: (ctx) => ctx.t.perms.some((p) => p.mb === "Careers" && p.upn === U("liora.pennywhistle") && p.automap === false), sol: ["Add-MailboxPermission -Identity Careers -User " + U("liora.pennywhistle") + " -AccessRights FullAccess -AutoMapping:$false"], hint: "-AutoMapping:$false" }
  ],
  sendas: [
    { q: "Who can send as Info?", out: "Get-RecipientPermission -Identity Info", hint: "Get-RecipientPermission" },
    { q: "Let Ondine Shadewell send as Support, no prompt.", fn: (ctx) => ctx.t.sendAs.some((p) => p.mb === "Support" && p.upn === U("ondine.shadewell")), sol: ["Add-RecipientPermission -Identity Support -Trustee " + U("ondine.shadewell") + " -AccessRights SendAs -Confirm:$false"], hint: "-Trustee, -AccessRights SendAs, -Confirm:$false" },
    { q: "Try giving Send As with Add-MailboxPermission, read the error, then do it the right way for Brannoc Vale on Sales Desk.", fn: (ctx) => ctx.t.sendAs.some((p) => p.mb === "Sales Desk" && p.upn === U("brannoc.vale")), sol: ["Add-MailboxPermission -Identity \"Sales Desk\" -User " + U("brannoc.vale") + " -AccessRights SendAs", "Add-RecipientPermission -Identity \"Sales Desk\" -Trustee " + U("brannoc.vale") + " -AccessRights SendAs -Confirm:$false"], hint: "The error tells you which command to use." },
    { q: "Give Juniper Oakes both FullAccess and Send As on Careers (no prompts, auto-mapping is fine).", fn: (ctx) => ctx.t.perms.some((p) => p.mb === "Careers" && p.upn === U("juniper.oakes")) && ctx.t.sendAs.some((p) => p.mb === "Careers" && p.upn === U("juniper.oakes")), sol: ["Add-RecipientPermission -Identity Careers -Trustee " + U("juniper.oakes") + " -AccessRights SendAs -Confirm:$false"], hint: "She may already have one of the two. Check first." },
    { q: "Rehearse giving Petrel Lindgrove Send As on Sales Desk with -WhatIf.", fn: (ctx, res) => !ctx.t.sendAs.some((p) => p.upn === U("petrel.lindgrove")) && res.host.some((h) => /What if/.test(h.text || "")), sol: ["Add-RecipientPermission -Identity \"Sales Desk\" -Trustee " + U("petrel.lindgrove") + " -AccessRights SendAs -WhatIf"], hint: "-WhatIf instead of -Confirm:$false" }
  ],
  forward: [
    { q: "Find every mailbox that forwards mail. Show DisplayName and ForwardingSmtpAddress.", out: "Get-EXOMailbox -ResultSize Unlimited -Properties ForwardingSmtpAddress | Where-Object { $_.ForwardingSmtpAddress } | Select-Object DisplayName,ForwardingSmtpAddress", hint: "-Properties, then Where-Object." },
    { q: "Switch off Dorian Pikeholm's forwarding and stop keeping a copy.", fn: (ctx) => { const m = findMbxT(ctx, "Dorian Pikeholm"); return m.ForwardingSmtpAddress === null && m.DeliverToMailboxAndForward === false; }, sol: ["Set-Mailbox -Identity " + U("dorian.pikeholm") + " -ForwardingSmtpAddress $null -DeliverToMailboxAndForward $false"], hint: "$null and $false" },
    { q: "Forward the Careers mailbox to Juniper Oakes, without keeping a copy.", fn: (ctx) => { const m = findMbxT(ctx, "Careers"); return /juniper\.oakes@/i.test(m.ForwardingSmtpAddress || "") && m.DeliverToMailboxAndForward === false; }, sol: ["Set-Mailbox -Identity Careers -ForwardingSmtpAddress " + U("juniper.oakes") + " -DeliverToMailboxAndForward $false"], hint: "-DeliverToMailboxAndForward $false" },
    { q: "Show DeliverToMailboxAndForward for Dorian Pikeholm.", out: "Get-EXOMailbox -Identity " + U("dorian.pikeholm") + " -Properties DeliverToMailboxAndForward | Select-Object DisplayName,DeliverToMailboxAndForward", hint: "Ask for it with -Properties." },
    { q: "Rehearse clearing Dorian's forwarding with -WhatIf.", fn: (ctx, res) => !!findMbxT(ctx, "Dorian Pikeholm").ForwardingSmtpAddress && res.host.some((h) => /What if/.test(h.text || "")), sol: ["Set-Mailbox -Identity " + U("dorian.pikeholm") + " -ForwardingSmtpAddress $null -WhatIf"], hint: "-WhatIf" }
  ],
  oof: [
    { q: "Is Hesper Reedmire's auto-reply on? Show the configuration.", out: "Get-MailboxAutoReplyConfiguration -Identity " + U("hesper.reedmire"), hint: "Get-MailboxAutoReplyConfiguration" },
    { q: "Turn on an auto-reply for Info: internal and external both \"We are closed until Monday.\"", fn: (ctx) => { const a = findMbxT(ctx, "Info")._arc; return a.AutoReplyState === "Enabled" && a.InternalMessage === "We are closed until Monday." && a.ExternalMessage === "We are closed until Monday."; }, sol: ["Set-MailboxAutoReplyConfiguration -Identity Info -AutoReplyState Enabled -InternalMessage \"We are closed until Monday.\" -ExternalMessage \"We are closed until Monday.\""], hint: "Both messages, same text." },
    { q: "Try -AutoReplyState On for Info, read the error, then use the right value.", fn: (ctx) => findMbxT(ctx, "Info")._arc.AutoReplyState === "Enabled", sol: ["Set-MailboxAutoReplyConfiguration -Identity Info -AutoReplyState On", "Set-MailboxAutoReplyConfiguration -Identity Info -AutoReplyState Enabled"], hint: "The error lists the valid names." },
    { q: "Liora Pennywhistle left. Set an external auto-reply: \"Liora no longer works at Halvard. Please contact careers@" + DOMAIN + ".\" (internal can be the same).", fn: (ctx) => { const a = findMbxT(ctx, "Liora Pennywhistle")._arc; return a.AutoReplyState === "Enabled" && /careers@/.test(a.ExternalMessage || ""); }, sol: ["Set-MailboxAutoReplyConfiguration -Identity " + U("liora.pennywhistle") + " -AutoReplyState Enabled -InternalMessage \"Liora no longer works at Halvard. Please contact careers@" + DOMAIN + ".\" -ExternalMessage \"Liora no longer works at Halvard. Please contact careers@" + DOMAIN + ".\""], hint: "Quotes around both messages." },
    { q: "Show only the AutoReplyState of Corvin Ashby.", out: "(Get-MailboxAutoReplyConfiguration -Identity " + U("corvin.ashby") + ").AutoReplyState", hint: "(command).AutoReplyState" }
  ],
  shared: [
    { q: "How big is Ysolde Marrow's mailbox?", out: "Get-EXOMailboxStatistics -Identity " + U("ysolde.marrow"), hint: "Get-EXOMailboxStatistics" },
    { q: "Convert Quillon Dunne's mailbox to shared.", fn: (ctx) => findMbxT(ctx, "Quillon Dunne").RecipientTypeDetails === "SharedMailbox", sol: ["Set-Mailbox -Identity " + U("quillon.dunne") + " -Type Shared"], hint: "-Type Shared" },
    { q: "Give Hesper Reedmire the extra address finance.director@" + DOMAIN + ".", fn: (ctx) => findMbxT(ctx, "Hesper Reedmire").EmailAddresses.some((e) => e.toLowerCase() === "smtp:finance.director@" + DOMAIN), sol: ["Set-Mailbox -Identity " + U("hesper.reedmire") + " -EmailAddresses @{add='smtp:finance.director@" + DOMAIN + "'}"], hint: "@{add='smtp:...'}" },
    { q: "Show every address on the Sales Desk mailbox, one per line.", out: "Get-EXOMailbox -Identity \"Sales Desk\" | Select-Object -ExpandProperty EmailAddresses", hint: "-ExpandProperty EmailAddresses" },
    { q: "Add the alias bookings@ to Info, then remove it again.", fn: (ctx, res, hist) => !findMbxT(ctx, "Info").EmailAddresses.some((e) => /bookings@/i.test(e)) && hist.some((h) => /add\s*=/i.test(h)) && hist.some((h) => /remove\s*=/i.test(h)), sol: ["Set-Mailbox -Identity Info -EmailAddresses @{add='smtp:bookings@" + DOMAIN + "'}", "Set-Mailbox -Identity Info -EmailAddresses @{remove='smtp:bookings@" + DOMAIN + "'}"], hint: "add, then remove." },
    { q: "Info should become a normal mailbox again for a new receptionist. Convert it to a regular user mailbox.", fn: (ctx) => findMbxT(ctx, "Info").RecipientTypeDetails === "UserMailbox", sol: ["Set-Mailbox -Identity Info -Type Regular"], hint: "The value for a normal mailbox is Regular." }
  ],
  dl: [
    { q: "List every distribution list.", out: "Get-DistributionGroup", hint: "No parameters." },
    { q: "Who is on Operations Bruges?", out: "Get-DistributionGroupMember -Identity \"Operations Bruges\"", hint: "-Identity with the name." },
    { q: "How many people are on Sales Team?", out: "(Get-DistributionGroupMember -Identity \"Sales Team\").Count", hint: "(...).Count" },
    { q: "Show the PrimarySmtpAddress of the Finance Team list.", out: "(Get-DistributionGroup -Identity \"Finance Team\").PrimarySmtpAddress", hint: "(command).PrimarySmtpAddress" },
    { q: "List members of All Staff who work in Legal (DisplayName only).", out: "Get-DistributionGroupMember -Identity \"All Staff\" | Where-Object { $_.Department -eq 'Legal' } | Select-Object DisplayName", hint: "Where-Object on Department." }
  ],
  dladd: [
    { q: "Rowenna Harthorn is not on All Staff. Add him.", fn: (ctx) => dlHas(ctx, "All Staff", "rowenna.harthorn"), sol: ["Add-DistributionGroupMember -Identity \"All Staff\" -Member " + U("rowenna.harthorn")], hint: "Add-DistributionGroupMember" },
    { q: "Remove Theodwyn Gallow from Finance Team without a prompt.", fn: (ctx) => !dlHas(ctx, "Finance Team", "theodwyn.gallow"), sol: ["Remove-DistributionGroupMember -Identity \"Finance Team\" -Member " + U("theodwyn.gallow") + " -Confirm:$false"], hint: "-Confirm:$false" },
    { q: "Ilsabet Varrow says she doesn't get finance-team@ mails. Try adding her, and read what Exchange says.", fn: (ctx, res) => !!res.error && /already a member/.test(res.error.text()), sol: ["Add-DistributionGroupMember -Identity \"Finance Team\" -Member " + U("ilsabet.varrow")], hint: "Just run the add. The error is the answer." },
    { q: "Sorrel Achterwyn says he gets no IT Alerts mails. Check whether he is on the IT Alerts list before you add anything.", fn: (ctx, res) => res.out.some((o) => o && o.DisplayName === "Sorrel Achterwyn"), sol: ["Get-DistributionGroupMember -Identity \"IT Alerts\""], hint: "He may already be on it. Then the ticket is done." },
    { q: "Petrel Lindgrove moved from Sales to Marketing. Take her off Sales Team, no prompt.", fn: (ctx) => !dlHas(ctx, "Sales Team", "petrel.lindgrove"), sol: ["Remove-DistributionGroupMember -Identity \"Sales Team\" -Member " + U("petrel.lindgrove") + " -Confirm:$false"], hint: "Remove with -Confirm:$false" }
  ],
  newdl: [
    { q: "Create a list Bruges Office with address bruges@" + DOMAIN + ".", fn: (ctx) => { const d = ctx.t.dls.find((x) => x.Name === "Bruges Office"); return d && d.PrimarySmtpAddress === "bruges@" + DOMAIN; }, sol: ["New-DistributionGroup -Name \"Bruges Office\" -PrimarySmtpAddress bruges@" + DOMAIN], hint: "-Name and -PrimarySmtpAddress" },
    { q: "Try creating a list called Sales Team. Read the error.", fn: (ctx, res) => !!res.error && /being used by another recipient/.test(res.error.text()), sol: ["New-DistributionGroup -Name \"Sales Team\""], hint: "That name already exists." },
    { q: "Rehearse a Project Atlas list with -WhatIf.", fn: (ctx, res) => !ctx.t.dls.some((d) => d.Name === "Project Atlas") && res.host.some((h) => /What if/.test(h.text || "")), sol: ["New-DistributionGroup -Name \"Project Atlas\" -WhatIf"], hint: "-WhatIf" },
    { q: "Create Board with members Alaric Strand and Hesper Reedmire.", fn: (ctx) => { const d = ctx.t.dls.find((x) => x.Name === "Board"); return d && dlHas(ctx, "Board", "alaric.strand") && dlHas(ctx, "Board", "hesper.reedmire"); }, sol: ["New-DistributionGroup -Name Board -Members " + U("alaric.strand") + "," + U("hesper.reedmire")], hint: "-Members a,b" },
    { q: "Create Night Shift, then add Torin Ash to it with a second command.", fn: (ctx) => dlHas(ctx, "Night Shift", "torin.ash"), sol: ["New-DistributionGroup -Name \"Night Shift\"", "Add-DistributionGroupMember -Identity \"Night Shift\" -Member " + U("torin.ash")], hint: "New, then Add." }
  ],
  mggroup: [
    { q: "List every group.", out: "Get-MgGroup -All", hint: "-All" },
    { q: "List the DisplayName of every Microsoft 365 group.", out: "Get-MgGroup -All | Where-Object { $_.GroupTypes -contains 'Unified' } | Select-Object DisplayName", hint: "-contains 'Unified'" },
    { q: "Find the group called Project Northwyrm and show its Description.", out: "(Get-MgGroup -Filter \"displayName eq 'Project Northwyrm'\").Description", hint: "(command).Description" },
    { q: "Find every group whose name starts with SG-.", out: "Get-MgGroup -Filter \"startswith(displayName,'SG-')\"", hint: "startswith(displayName,'SG-')" },
    { q: "Fresh window. Connect with User.Read.All and Group.Read.All, then count all groups.", setup: "none", fn: (ctx, res) => res.out.length === 1 && res.out[0] === 5, sol: ["Connect-MgGraph -Scopes User.Read.All,Group.Read.All -NoWelcome", "(Get-MgGroup -All).Count"], hint: "Group.Read.All is needed." }
  ],
  mgmember: [
    { q: "Show the names of everyone in SG-VPN-Users.", out: "$g = Get-MgGroup -Filter \"displayName eq 'SG-VPN-Users'\"; Get-MgGroupMember -GroupId $g.Id | ForEach-Object { $_.AdditionalProperties.displayName }", hint: "Store $g, then AdditionalProperties.displayName" },
    { q: "Show DisplayName and JobTitle of everyone in Halvard Leadership, as real users.", out: "$g = Get-MgGroup -Filter \"displayName eq 'Halvard Leadership'\"; Get-MgGroupMemberAsUser -GroupId $g.Id -Property DisplayName,JobTitle | Select-Object DisplayName,JobTitle", hint: "Get-MgGroupMemberAsUser with -Property" },
    { q: "Who is in SG-MFA-Exclusion?", out: "$g = Get-MgGroup -Filter \"displayName eq 'SG-MFA-Exclusion'\"; Get-MgGroupMember -GroupId $g.Id | ForEach-Object { $_.AdditionalProperties.displayName }", hint: "Same pattern." },
    { q: "Which groups is Lorcan Ivers in?", out: "Get-MgUserMemberOf -UserId " + U("lorcan.ivers") + " | ForEach-Object { $_.AdditionalProperties.displayName }", hint: "Get-MgUserMemberOf" },
    { q: "How many members does SG-Finance-Share have?", out: "$g = Get-MgGroup -Filter \"displayName eq 'SG-Finance-Share'\"; (Get-MgGroupMember -GroupId $g.Id).Count", hint: "(...).Count" }
  ],
  mgadd: [
    { q: "Cassian Drake asks for VPN access. Check whether he is already in SG-VPN-Users before you change anything.", fn: (ctx, res) => res.out.includes("Cassian Drake"), sol: ["$g = Get-MgGroup -Filter \"displayName eq 'SG-VPN-Users'\"; Get-MgGroupMember -GroupId $g.Id | ForEach-Object { $_.AdditionalProperties.displayName }"], hint: "He is in IT. Is he already a member?" },
    { q: "Add Quillon Dunne to Project Northwyrm.", fn: (ctx) => grpHas(ctx, "Project Northwyrm", "quillon.dunne"), sol: ["$g = Get-MgGroup -Filter \"displayName eq 'Project Northwyrm'\"; $u = Get-MgUser -UserId " + U("quillon.dunne") + "; New-MgGroupMember -GroupId $g.Id -DirectoryObjectId $u.Id"], hint: "$g, $u, New-MgGroupMember" },
    { q: "Remove Rowenna Harthorn from SG-MFA-Exclusion.", fn: (ctx) => !grpHas(ctx, "SG-MFA-Exclusion", "rowenna.harthorn"), sol: ["$g = Get-MgGroup -Filter \"displayName eq 'SG-MFA-Exclusion'\"; $u = Get-MgUser -UserId " + U("rowenna.harthorn") + "; Remove-MgGroupMemberByRef -GroupId $g.Id -DirectoryObjectId $u.Id"], hint: "Remove-MgGroupMemberByRef" },
    { q: "Read-only group scope. Theodwyn Gallow cannot open the finance share. Check whether she is in SG-Finance-Share.", setup: "groups", fn: (ctx, res) => res.out.includes("Theodwyn Gallow"), sol: ["$g = Get-MgGroup -Filter \"displayName eq 'SG-Finance-Share'\"; Get-MgGroupMember -GroupId $g.Id | ForEach-Object { $_.AdditionalProperties.displayName }"], hint: "Check membership first." },
    { q: "Read-only group scope. Add Maelis Grey to Halvard Leadership (you'll need Group.ReadWrite.All).", setup: "groups", fn: (ctx) => grpHas(ctx, "Halvard Leadership", "maelis.grey"), sol: ["Connect-MgGraph -Scopes Group.ReadWrite.All -NoWelcome", "$g = Get-MgGroup -Filter \"displayName eq 'Halvard Leadership'\"; $u = Get-MgUser -UserId " + U("maelis.grey") + "; New-MgGroupMember -GroupId $g.Id -DirectoryObjectId $u.Id"], hint: "Reconnect with Group.ReadWrite.All first." }
  ],
  skus: [
    { q: "List every SKU.", out: "Get-MgSubscribedSku", hint: "No parameters." },
    { q: "Show only the SkuPartNumber of every SKU.", out: "Get-MgSubscribedSku | Select-Object SkuPartNumber", hint: "Select-Object SkuPartNumber" },
    { q: "Show the SkuId of POWER_BI_PRO.", out: "(Get-MgSubscribedSku | Where-Object SkuPartNumber -eq 'POWER_BI_PRO').SkuId", hint: "Where-Object, then .SkuId" },
    { q: "Fresh window, read users only. Try Get-MgSubscribedSku, read the error, then reconnect with the right scope and run it.", setup: "read", refSetup: "lic", out: "Get-MgSubscribedSku", sol: ["Get-MgSubscribedSku", "Connect-MgGraph -Scopes Organization.Read.All -NoWelcome", "Get-MgSubscribedSku"], hint: "Organization.Read.All" },
    { q: "Which SKUs have no free seats? Show their SkuPartNumber.", out: "Get-MgSubscribedSku | Where-Object { $_.PrepaidUnits.Enabled - $_.ConsumedUnits -le 0 } | Select-Object SkuPartNumber", hint: "Where-Object with the same subtraction, -le 0" }
  ],
  userlic: [
    { q: "Which licenses does Hesper Reedmire have?", out: "Get-MgUserLicenseDetail -UserId " + U("hesper.reedmire"), hint: "Get-MgUserLicenseDetail" },
    { q: "Show only the SkuPartNumber of Ysolde Marrow's licenses.", out: "Get-MgUserLicenseDetail -UserId " + U("ysolde.marrow") + " | Select-Object SkuPartNumber", hint: "Select-Object SkuPartNumber" },
    { q: "Who holds POWER_BI_PRO? DisplayName only.", out: "$sku = Get-MgSubscribedSku | Where-Object SkuPartNumber -eq 'POWER_BI_PRO'; Get-MgUser -All -Property DisplayName,AssignedLicenses | Where-Object { $_.AssignedLicenses.SkuId -contains $sku.SkuId } | Select-Object DisplayName", hint: "Store the SKU, filter on AssignedLicenses." },
    { q: "Which disabled accounts still hold any license? DisplayName only.", out: "Get-MgUser -All -Filter \"accountEnabled eq false\" -Property DisplayName,AssignedLicenses | Where-Object { $_.AssignedLicenses.Count -gt 0 } | Select-Object DisplayName", hint: "Filter disabled, then AssignedLicenses.Count -gt 0" },
    { q: "Who holds FLOW_FREE (Power Automate Free)? DisplayName only.", out: "$f = Get-MgSubscribedSku | Where-Object SkuPartNumber -eq 'FLOW_FREE'; Get-MgUser -All -Property DisplayName,AssignedLicenses | Where-Object { $_.AssignedLicenses.SkuId -contains $f.SkuId } | Select-Object DisplayName", hint: "Same pattern as Power BI, other SKU." }
  ],
  setlic: [
    { q: "Give Brannoc Vale a POWER_BI_PRO license (check free seats first!).", fn: (ctx) => hasSku(ctx, "brannoc.vale", "POWER_BI_PRO"), sol: ["$pbi = Get-MgSubscribedSku | Where-Object SkuPartNumber -eq 'POWER_BI_PRO'; Set-MgUserLicense -UserId " + U("lorcan.ivers") + " -AddLicenses @() -RemoveLicenses @($pbi.SkuId); Set-MgUserLicense -UserId " + U("brannoc.vale") + " -AddLicenses @{SkuId = $pbi.SkuId} -RemoveLicenses @()"], hint: "No seats free. Lorcan does not use his." },
    { q: "Remove the E3 license from Evander Holtwyrm (disabled for months).", fn: (ctx) => !hasSku(ctx, "evander.holtwyrm", "SPE_E3"), sol: ["$e3 = Get-MgSubscribedSku | Where-Object SkuPartNumber -eq 'SPE_E3'; Set-MgUserLicense -UserId " + U("evander.holtwyrm") + " -AddLicenses @() -RemoveLicenses @($e3.SkuId)"], hint: "-AddLicenses @() -RemoveLicenses @($e3.SkuId)" },
    { q: "Give Petrel Lindgrove an EXCHANGESTANDARD license.", fn: (ctx) => hasSku(ctx, "petrel.lindgrove", "EXCHANGESTANDARD"), sol: ["$x = Get-MgSubscribedSku | Where-Object SkuPartNumber -eq 'EXCHANGESTANDARD'; Set-MgUserLicense -UserId " + U("petrel.lindgrove") + " -AddLicenses @{SkuId = $x.SkuId} -RemoveLicenses @()"], hint: "Same shape, other SKU." },
    { q: "A guest, Nyssa Bexwyn, needs TEAMS_EXPLORATORY. She has no usage location. Fix it and assign.", fn: (ctx) => { const u = ctx.t.users.find((x) => x.DisplayName === "Nyssa Bexwyn"); const s = ctx.t.skus.find((x) => x.SkuPartNumber === "TEAMS_EXPLORATORY"); return u.AssignedLicenses.some((l) => l.SkuId === s.SkuId); }, sol: ["$n = Get-MgUser -Filter \"displayName eq 'Nyssa Bexwyn'\"; Update-MgUser -UserId $n.Id -UsageLocation BE; $t = Get-MgSubscribedSku | Where-Object SkuPartNumber -eq 'TEAMS_EXPLORATORY'; Set-MgUserLicense -UserId $n.Id -AddLicenses @{SkuId = $t.SkuId} -RemoveLicenses @()"], hint: "Guests have awkward UPNs: use her Id. UsageLocation first." },
    { q: "Rehearse removing EXCHANGESTANDARD from Fenna Lowmere with -WhatIf.", fn: (ctx, res) => hasSku(ctx, "fenna.lowmere", "EXCHANGESTANDARD") && res.host.some((h) => /What if/.test(h.text || "")), sol: ["$x = Get-MgSubscribedSku | Where-Object SkuPartNumber -eq 'EXCHANGESTANDARD'; Set-MgUserLicense -UserId " + U("fenna.lowmere") + " -AddLicenses @() -RemoveLicenses @($x.SkuId) -WhatIf"], hint: "-WhatIf at the end." }
  ],
  newuser: [
    { q: "Create Tamlin Jaspermoor (tamlin.jaspermoor@...), enabled, with a password he must change.", fn: (ctx) => { const u = userOf(ctx, "tamlin.jaspermoor"); return u && u.AccountEnabled && u._pwChange; }, sol: ["$pw = @{Password = 'Halvard-Start-2026!'; ForceChangePasswordNextSignIn = $true}; New-MgUser -DisplayName \"Tamlin Jaspermoor\" -UserPrincipalName " + U("tamlin.jaspermoor") + " -MailNickname tamlin.jaspermoor -AccountEnabled -PasswordProfile $pw"], hint: "Five required parts." },
    { q: "Try creating Elowen Thistle again (same UPN). Read the error.", fn: (ctx, res) => !!res.error && /already exists/.test(res.error.text()), sol: ["$pw = @{Password = 'Halvard-Start-2026!'; ForceChangePasswordNextSignIn = $true}; New-MgUser -DisplayName \"Elowen Thistle\" -UserPrincipalName " + U("elowen.thistle") + " -MailNickname elowen.thistle -AccountEnabled -PasswordProfile $pw"], hint: "Duplicates are refused." },
    { q: "Create a disabled service account svc-scanner@... (DisplayName Scanner Service). Leave out -AccountEnabled? Read what happens, then fix it so the account exists but is disabled.", fn: (ctx) => { const u = userOf(ctx, "svc-scanner"); return u && u.AccountEnabled === false; }, sol: ["$pw = @{Password = 'Scanner-Service-2026!'; ForceChangePasswordNextSignIn = $false}; New-MgUser -DisplayName \"Scanner Service\" -UserPrincipalName " + U("svc-scanner") + " -MailNickname svc-scanner -AccountEnabled:$false -PasswordProfile $pw"], hint: "-AccountEnabled is required, but it can be :$false." },
    { q: "Try a UPN on gmail.com: new user tim@gmail.com. Read the error.", fn: (ctx, res) => !!res.error && /domain portion/.test(res.error.text()), sol: ["$pw = @{Password = 'Halvard-Start-2026!'; ForceChangePasswordNextSignIn = $true}; New-MgUser -DisplayName \"Tim\" -UserPrincipalName tim@gmail.com -MailNickname tim -AccountEnabled -PasswordProfile $pw"], hint: "Only verified domains." },
    { q: "Create Sylvara Woodmere in Finance as Accountant, usage location BE, then give her E3.", setup: "licW", fn: (ctx) => { const u = userOf(ctx, "sylvara.woodmere"); return u && u.Department === "Finance" && hasSku(ctx, "sylvara.woodmere", "SPE_E3"); }, sol: ["$pw = @{Password = 'Halvard-Start-2026!'; ForceChangePasswordNextSignIn = $true}; New-MgUser -DisplayName \"Sylvara Woodmere\" -UserPrincipalName " + U("sylvara.woodmere") + " -MailNickname sylvara.woodmere -AccountEnabled -PasswordProfile $pw -UsageLocation BE -Department Finance -JobTitle Accountant", "$e3 = Get-MgSubscribedSku | Where-Object SkuPartNumber -eq 'SPE_E3'; Set-MgUserLicense -UserId " + U("sylvara.woodmere") + " -AddLicenses @{SkuId = $e3.SkuId} -RemoveLicenses @()"], hint: "Create, then Set-MgUserLicense." }
  ],
  removeuser: [
    { q: "Delete Quillon Dunne.", fn: (ctx) => !userOf(ctx, "quillon.dunne"), sol: ["Remove-MgUser -UserId " + U("quillon.dunne")], hint: "Remove-MgUser" },
    { q: "Show what is in the recycle bin right now (Evander was deleted earlier today).", pre: ["Remove-MgUser -UserId " + U("evander.holtwyrm")], out: "Get-MgDirectoryDeletedItemAsUser", hint: "Get-MgDirectoryDeletedItemAsUser" },
    { q: "Restore Aldric Moor (deleted this morning).", pre: ["Remove-MgUser -UserId " + U("aldric.moor")], fn: (ctx) => !!userOf(ctx, "aldric.moor"), sol: ["$d = Get-MgDirectoryDeletedItemAsUser | Where-Object UserPrincipalName -eq '" + U("aldric.moor") + "'; Restore-MgDirectoryDeletedItem -DirectoryObjectId $d.Id"], hint: "Id from the recycle bin." },
    { q: "Rehearse deleting Rhydian Bellweather with -WhatIf.", fn: (ctx, res) => !!userOf(ctx, "rhydian.bellweather") && res.host.some((h) => /What if/.test(h.text || "")), sol: ["Remove-MgUser -UserId " + U("rhydian.bellweather") + " -WhatIf"], hint: "-WhatIf" },
    { q: "Try restoring Fenna Lowmere with her UPN instead of her Id (she was deleted). Read the error, then do it right.", pre: ["Remove-MgUser -UserId " + U("fenna.lowmere")], fn: (ctx) => !!userOf(ctx, "fenna.lowmere"), sol: ["Restore-MgDirectoryDeletedItem -DirectoryObjectId " + U("fenna.lowmere"), "$d = Get-MgDirectoryDeletedItemAsUser | Where-Object UserPrincipalName -eq '" + U("fenna.lowmere") + "'; Restore-MgDirectoryDeletedItem -DirectoryObjectId $d.Id"], hint: "The restore wants the object Id." }
  ]
});
