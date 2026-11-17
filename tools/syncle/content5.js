GATE.type = "takeover"; INCIDENT.type = "incident";
function mkObj(type, props) { const o = {}; Object.defineProperty(o, PS.TYPE, { value: type, writable: true }); return Object.assign(o, props); }
const permHas = (ctx, mb, n) => ctx.t.perms.some((p) => p.mb === mb && p.upn === U(n) && p.rights.includes("FullAccess"));
const ranCmd = (hist, re) => hist.some((h) => re.test(h));
const outHas = (res, f) => !!res && !res.error && res.out.some((o) => { try { return f(o); } catch (e) { return false; } });
const QR_FROM = "it-support@halvardco-helpdesk.example";
const QR_TO = [["Fenna Lowe", "Delivered"], ["Brannoc Vale", "Delivered"], ["Caius Mercer", "Delivered"], ["Ondine Shaw", "Delivered"], ["Juniper Oakes", "Quarantined"]];

const BREAKS = [
  {
    id: "b-locked", type: "break", name: "Locked out", kind: "BREAK · SOMETHING STOPPED WORKING", allow: /elara\.wynn/i, hero: "desync", need: (m) => m.seq <= 1,
    story: "08:02. Elara Wynn (HR) calls: 'It says my account is disabled. I did nothing!' Nobody filed a ticket to block her.",
    doneMsg: "Elara is back in. You looked first, changed one thing, and read it back.",
    mutate: (ctx) => { userOf(ctx, "elara.wynn").AccountEnabled = false; },
    tickets: [
      { id: "b-locked-1", from: "Elara Wynn", title: "Find out why", body: "Look at Elara's account and show whether sign-in is allowed.", hint: "Get-MgUser with -Property DisplayName,AccountEnabled.",
        check: (ctx, hist, res) => outHas(res, (o) => o.AccountEnabled === false && /Elara/.test(o.DisplayName || "")) },
      { id: "b-locked-2", from: "Elara Wynn", title: "Let her back in", body: "Allow sign-in again. Only for her.", hint: "Update-MgUser -AccountEnabled:$true needs a write scope.",
        check: (ctx) => userOf(ctx, "elara.wynn").AccountEnabled === true },
      { id: "b-locked-3", from: "You", title: "Read it back", body: "Show her account again: AccountEnabled should be True now.", hint: "Same Get-MgUser as the first ticket.",
        check: (ctx, hist, res) => outHas(res, (o) => o.AccountEnabled === true && /Elara/.test(o.DisplayName || "")) }
    ]
  },
  {
    id: "b-forward", type: "break", name: "Support went quiet", kind: "BREAK · SOMETHING STOPPED WORKING", allow: /^$/, hero: "desync", need: (m) => m.seq <= 2,
    story: "11:30. Ondine (Support): 'Customers say we never answer, but our Support mailbox has been empty since yesterday.' The mail arrives at Exchange. It just never stays.",
    doneMsg: "Support mail stays in Support again. Forwarding to an outside address is one of the first things to check when mail 'disappears'.",
    mutate: (ctx) => { const m = findMbxT(ctx, "Support"); m.ForwardingSmtpAddress = "smtp:support-desk@helpdesk-mail.example"; m.DeliverToMailboxAndForward = false; },
    tickets: [
      { id: "b-forward-1", from: "Ondine Shaw", title: "Where does it go?", body: "Show the Support mailbox's forwarding settings.", hint: "Get-EXOMailbox -Identity Support -Properties ForwardingSmtpAddress,DeliverToMailboxAndForward",
        check: (ctx, hist, res) => outHas(res, (o) => /helpdesk-mail/.test(String(o.ForwardingSmtpAddress || ""))) },
      { id: "b-forward-2", from: "Ondine Shaw", title: "Stop the forwarding", body: "Nobody asked for this. Remove it.", hint: "Set-Mailbox -Identity Support -ForwardingSmtpAddress $null",
        check: (ctx) => !findMbxT(ctx, "Support").ForwardingSmtpAddress }
    ]
  },
  {
    id: "b-fullaccess", type: "break", name: "Finance Inbox vanished", kind: "BREAK · SOMETHING STOPPED WORKING", allow: /^$/, hero: "desync", need: (m) => m.seq <= 2,
    story: "09:15. Hollis Reed (CFO): 'The Finance Inbox is gone from my Outlook. Ysolde still has it.' Month-end closes Friday.",
    doneMsg: "Hollis has the Finance Inbox back. Comparing who still has access with who lost it is how you spot a removed permission.",
    mutate: (ctx) => { ctx.t.perms = ctx.t.perms.filter((p) => !(p.mb === "Finance Inbox" && p.upn === U("hollis.reed"))); },
    tickets: [
      { id: "b-fullaccess-1", from: "Hollis Reed", title: "Who has access?", body: "Show who has permissions on the Finance Inbox.", hint: "Get-MailboxPermission -Identity \"Finance Inbox\"",
        check: (ctx, hist) => ranCmd(hist, /get-mailboxpermission\b.*finance inbox/i) },
      { id: "b-fullaccess-2", from: "Hollis Reed", title: "Give it back", body: "Give Hollis FullAccess to the Finance Inbox again.", hint: "Add-MailboxPermission -Identity \"Finance Inbox\" -User <Hollis> -AccessRights FullAccess",
        check: (ctx) => permHas(ctx, "Finance Inbox", "hollis.reed") }
    ]
  },
  {
    id: "b-dl", type: "break", name: "No more team mail", kind: "BREAK · SOMETHING STOPPED WORKING", allow: /^$/, hero: "desync", need: (m) => m.seq <= 3,
    story: "14:40. Dorian Pike (Sales): 'Everyone talks about the Sales Team mail from this morning. I never got it.' His mailbox works fine otherwise.",
    doneMsg: "Dorian is back on the Sales Team list. 'I don't get the group mail' is almost always membership.",
    mutate: (ctx) => { const d = ctx.t.dls.find((x) => x.Name === "Sales Team"); d.members = d.members.filter((x) => x !== U("dorian.pike")); },
    tickets: [
      { id: "b-dl-1", from: "Dorian Pike", title: "Is he on the list?", body: "Show the members of the Sales Team distribution list.", hint: "Get-DistributionGroupMember -Identity \"Sales Team\"",
        check: (ctx, hist) => ranCmd(hist, /get-distributiongroupmember\b.*sales team/i) },
      { id: "b-dl-2", from: "Dorian Pike", title: "Put him back", body: "Add Dorian to Sales Team.", hint: "Add-DistributionGroupMember -Identity \"Sales Team\" -Member <Dorian>",
        check: (ctx) => dlHas(ctx, "Sales Team", "dorian.pike") }
    ]
  },
  {
    id: "b-license", type: "break", name: "Licence expired?", kind: "BREAK · SOMETHING STOPPED WORKING", allow: /garrick\.penhale/i, hero: "desync", need: (m) => m.seq <= 4,
    story: "08:30. Garrick Penhale (Operations director): 'Word says my licence is no longer valid and Outlook keeps asking me to sign in.' Someone cleaned up licences last night.",
    doneMsg: "Garrick has Microsoft 365 E3 again. 'Unlicensed product' means look at the user's licences before anything else.",
    mutate: (ctx) => { const u = userOf(ctx, "garrick.penhale"); const s = ctx.t.skus.find((x) => x.SkuPartNumber === "SPE_E3"); u.AssignedLicenses = u.AssignedLicenses.filter((l) => l.SkuId !== s.SkuId); s.ConsumedUnits -= 1; },
    tickets: [
      { id: "b-license-1", from: "Garrick Penhale", title: "What does he have?", body: "Show Garrick's licences (SkuPartNumber).", hint: "Get-MgUserLicenseDetail -UserId <Garrick>",
        check: (ctx, hist) => ranCmd(hist, /get-mguserlicensedetail\b.*garrick/i) },
      { id: "b-license-2", from: "Garrick Penhale", title: "Give E3 back", body: "Assign SPE_E3 to Garrick again.", hint: "$e3 = Get-MgSubscribedSku -All | Where-Object SkuPartNumber -eq 'SPE_E3'; Set-MgUserLicense -UserId ... -AddLicenses @{SkuId = $e3.SkuId} -RemoveLicenses @()",
        check: (ctx) => hasSku(ctx, "garrick.penhale", "SPE_E3") }
    ]
  },
  {
    id: "b-qr", type: "break", name: "QR-code wave", kind: "GLOBAL EVENT · BELGIUM", allow: /^$/, hero: "desync", need: (m) => m.seq <= 7,
    story: "Breaking, 10:00. The Centre for Cybersecurity Belgium warns about a phishing wave: 'Action required: mailbox storage full', with a QR code to scan. It is hitting companies across Flanders this morning. Did it reach Halvard?",
    doneMsg: "You knew within minutes who got it and handed a clean list to the awareness people. That is what a global event asks of an admin.",
    mutate: (ctx) => {
      const now = new Date(PS.NOW.getTime() - 3 * 3600e3);
      QR_TO.forEach(([n, st], i) => ctx.t.msgs.unshift(mkObj("Microsoft.Exchange.Management.FfoReporting.MessageTraceV2", { MessageTraceId: "9d1e" + i + "a7c-2b4f-4e8a-9c3d-5f6e7a8b9c0" + i, MessageId: "<qr" + i + "@halvardco-helpdesk.example>", Received: new Date(now.getTime() + i * 60000), SenderAddress: QR_FROM, RecipientAddress: userOf(ctx, n.toLowerCase().replace(" ", ".")).UserPrincipalName, Subject: "Action required: mailbox storage full", Status: st, FromIP: "91.215.85.14", ToIP: null, Size: 48211 })));
      ctx.t.msgs.sort((a, b) => b.Received - a.Received);
    },
    tickets: [
      { id: "b-qr-1", from: "CCB alert", title: "Did it reach us?", body: "Find every mail this morning with 'mailbox storage full' in the subject.", hint: "Get-MessageTraceV2 -Subject 'mailbox storage full' -SubjectFilterType Contains (last 48 hours is the default).",
        check: (ctx, hist, res) => !!res && !res.error && res.out.length === 5 && res.out.every((o) => o && /storage full/.test(o.Subject || "")) },
      { id: "b-qr-2", from: "Awareness team", title: "Who got it in their inbox?", body: "Export only the delivered recipients (RecipientAddress) to ~/Desktop/qr-wave.csv for Belgian Excel.", hint: "-Status Delivered | Select-Object RecipientAddress | Export-Csv ~/Desktop/qr-wave.csv -NoTypeInformation -Delimiter ';'",
        check: (ctx) => { const c = csvRows(ctx, "/Users/kaatje/Desktop/qr-wave.csv"); return !!c && /RecipientAddress/.test(c.head) && c.rows.length === 4; } },
      { id: "b-qr-3", from: "You", title: "Did anyone fall for it?", body: "For those four, check for successful sign-ins from outside Belgium. Nothing found is a valid answer, as long as you checked.", hint: "foreach ($r in $to) { Get-MgAuditLogSignIn -Filter \"userPrincipalName eq '$r' and status/errorCode eq 0 and location/countryOrRegion ne 'BE'\" }",
        check: (ctx, hist, res) => !!res && !res.error && ranCmd(hist, /get-mgauditlogsignin/i) && ranCmd(hist, /foreach|ForEach-Object|%/i) && ranCmd(hist, /countryOrRegion\s+ne\s+'BE'/i) }
    ]
  }
];
