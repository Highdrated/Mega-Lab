SEQUENCES.push({ id: 12, name: "Guests & SharePoint", short: "AB-650", open: true, blurb: "For Exam AB-650: people from outside as guests or contacts, and SharePoint Online's own door, where one switch hides a site from Copilot." });
const SPO_ADMIN = "https://halvardco-admin.sharepoint.com";
const SPO_ROOT = "https://halvardco.sharepoint.com";
const SITE = (s) => SPO_ROOT + "/sites/" + s;
const REDIRECT = "https://myapps.microsoft.com";
Object.assign(GRADER.SETUPS, {
  guestR: { scopes: ["User.Read.All"], exo: false },
  guestW: { scopes: ["User.Read.All", "User.Invite.All"], exo: false },
  contactOff: { scopes: ["User.Read.All"], exo: false },
  contactOn: { scopes: ["User.Read.All"], exo: true },
  outside: { scopes: ["User.Read.All", "User.Invite.All"], exo: true },
  spoOff: { scopes: ["User.Read.All"], exo: false },
  spoOn: { scopes: ["User.Read.All"], exo: false, spo: true }
});
const AB = (() => {
  const E = PS;
  const T_INV = "Microsoft.Graph.PowerShell.Models.MicrosoftGraphInvitation";
  const T_MC = "Microsoft.Exchange.Data.Directory.Management.MailContact";
  const T_SPO = "Microsoft.Online.SharePoint.PowerShell.SPOSite";
  const T_U = "Microsoft.Graph.PowerShell.Models.MicrosoftGraphUser";
  E.DISPLAY[T_INV] = ["Id", "InvitedUserDisplayName", "InvitedUserEmailAddress", "SendInvitationMessage", "Status"];
  E.DISPLAY[T_MC] = ["Name", "Alias", "RecipientType"];
  E.DISPLAY[T_SPO] = ["Url", "Owner", "StorageQuota"];
  const mk = (type, props) => { const o = {}; Object.defineProperty(o, E.TYPE, { value: type, writable: true }); return Object.assign(o, props); };
  const P = (pos, extra) => Object.assign({ kind: "value" }, pos === null ? {} : { pos }, extra || {});
  const S = () => ({ kind: "switch" });
  let seed = 4242;
  const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const gid = () => { const h = () => Math.floor(rnd() * 16).toString(16); let s = ""; for (const n of [8, 4, 4, 4, 12]) { for (let i = 0; i < n; i++) s += h(); s += "-"; } return s.slice(0, -1); };
  const def = (name, spec) => { spec.name = name; E.CMDS[name.toLowerCase()] = spec; };
  const err = (cmd, msg, kind) => new E.PSErr(msg, { cmd, term: true, kind: kind || "runtime" });
  const has = (ctx, list) => !!ctx.mg && list.some((s) => ctx.mg.scopes.some((x) => x.toLowerCase() === s.toLowerCase()));
  function seed0(ctx) {
    const t = ctx.t;
    if (t._ab) return;
    t._ab = true;
    t.invites = [];
    t.users.forEach((u) => { if (u.ExternalUserState === undefined) u.ExternalUserState = null; });
    t.users.filter((u) => u.UserType === "Guest").forEach((u, k) => { u.ExternalUserState = k === 1 ? "PendingAcceptance" : "Accepted"; if (!u.Mail) u.Mail = u.UserPrincipalName.split("#EXT#")[0].replace(/_([^_]+)$/, "@$1"); });
    t.contacts = [["Brackenford Couriers", "dispatch@brackenford.example"], ["Ironmere Insurance", "claims@ironmere.example"]].map(([n, a]) => ({ Name: n, DisplayName: n, Alias: n.replace(/[^A-Za-z0-9]/g, ""), ExternalEmailAddress: a }));
    const own = (n) => n + "@" + t.domain;
    t.sites = [
      ["", "Communication site", own("elowen.thistle")],
      ["payroll", "Payroll", own("hesper.reedmire")],
      ["board", "Board", own("alaric.strand")],
      ["saleshub", "Sales Hub", own("garrion.penhale")],
      ["itops", "IT Ops", own("elowen.thistle")],
      ["oldintranet", "Old Intranet", own("evander.holtwyrm")]
    ].map(([s, title, o]) => ({ Url: s ? SITE(s) : SPO_ROOT, Title: title, Owner: o, StorageQuota: 26214400, LockState: "Unlock", RestrictContentOrgWideSearch: false }));
  }
  function guestUpn(t, mail) { return mail.toLowerCase().replace("@", "_") + "#EXT#@" + t.domain; }
  def("New-MgInvitation", { module: "Microsoft.Graph.Identity.SignIns", ver: "2.25.0", ctype: "Function", params: { InvitedUserEmailAddress: P(null), InviteRedirectUrl: P(null), InvitedUserDisplayName: P(null), SendInvitationMessage: S(), InvitedUserType: P(null), InvitedUserMessageInfo: P(null), BodyParameter: P(null) },
    run({ ctx, b, name }) {
      if (!ctx.mg) throw err(name + "_CreateExpanded", "Authentication needed. Please call Connect-MgGraph.", "auth");
      if (b.BodyParameter !== undefined || b.InvitedUserMessageInfo !== undefined) throw err(null, "[Lab] -BodyParameter and -InvitedUserMessageInfo are real, but this lab does not simulate them. Use -InvitedUserEmailAddress, -InviteRedirectUrl, -InvitedUserDisplayName and -SendInvitationMessage.", "labnote");
      if (!has(ctx, ["User.Invite.All", "User.ReadWrite.All", "Directory.ReadWrite.All"])) throw err(name + "_CreateExpanded", "Insufficient privileges to complete the operation.\n\nStatus: 403 (Forbidden)\nErrorCode: Authorization_RequestDenied", "scope");
      if (b.InvitedUserEmailAddress === undefined || b.InviteRedirectUrl === undefined) throw err(null, "[Lab] Graph refuses this invitation: InvitedUserEmailAddress and InviteRedirectUrl are both required. This lab does not show the exact error text.", "labinv");
      seed0(ctx);
      const mail = String(b.InvitedUserEmailAddress).trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) throw err(null, "[Lab] Graph refuses this invitation: '" + mail + "' is not an email address. This lab does not show the exact error text.", "labinv");
      const t = ctx.t, upn = guestUpn(t, mail);
      let u = t.users.find((x) => x.UserPrincipalName.toLowerCase() === upn.toLowerCase());
      const dn = b.InvitedUserDisplayName !== undefined ? String(b.InvitedUserDisplayName) : null;
      if (!u) {
        u = mk(T_U, { AccountEnabled: true, AssignedLicenses: [], BusinessPhones: [], City: null, CompanyName: null, Country: null, CreatedDateTime: new Date(), Department: null, DisplayName: dn || mail.split("@")[0], EmployeeId: null, GivenName: null, Id: gid(), JobTitle: null, Mail: mail, MailNickname: upn.split("#")[0], MobilePhone: null, OfficeLocation: null, OnPremisesSyncEnabled: null, PreferredLanguage: null, SignInActivity: null, Surname: null, UsageLocation: null, UserPrincipalName: upn, UserType: "Guest", ExternalUserState: "PendingAcceptance" });
        t.users.push(u);
      }
      const send = !!b.SendInvitationMessage;
      const inv = { Id: gid(), InvitedUserDisplayName: dn, InvitedUserEmailAddress: mail, InviteRedirectUrl: String(b.InviteRedirectUrl), InviteRedeemUrl: "https://login.microsoftonline.com/redeem?rd=https%3a%2f%2finvitations.microsoft.com%2fredeem%2f%3ftenant%3d" + t.tenantId, InvitedUserType: b.InvitedUserType !== undefined ? String(b.InvitedUserType) : "Guest", SendInvitationMessage: send, Status: "PendingAcceptance", InvitedUser: mk("Microsoft.Graph.PowerShell.Models.MicrosoftGraphUser", { Id: u.Id }), ResetRedemption: false, userId: u.Id };
      t.invites.push(inv);
      const o = Object.assign({}, inv); delete o.userId;
      return [mk(T_INV, o)];
    } });
  const needExo = (ctx, name) => { if (!ctx.exo) throw err(name, "You must call the Connect-ExchangeOnline cmdlet before calling any other cmdlets.", "noexo"); };
  const mcOut = (c) => mk(T_MC, { Name: c.Name, DisplayName: c.DisplayName, Alias: c.Alias, ExternalEmailAddress: "SMTP:" + c.ExternalEmailAddress, PrimarySmtpAddress: c.ExternalEmailAddress, RecipientType: "MailContact", RecipientTypeDetails: "MailContact" });
  def("New-MailContact", { module: "tmpEXO", ver: "1.0", ctype: "Function", session: true, params: { Name: P(0, { req: true }), ExternalEmailAddress: P(null, { req: true }), DisplayName: P(null), Alias: P(null), FirstName: P(null), LastName: P(null) },
    run({ ctx, b, name }) {
      needExo(ctx, name); seed0(ctx);
      const n = String(b.Name).trim(), a = String(b.ExternalEmailAddress).replace(/^smtp:/i, "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a)) throw err(null, "[Lab] Exchange refuses '" + a + "': ExternalEmailAddress must be an email address. This lab does not show the exact error text.", "labmc");
      if (ctx.t.contacts.some((c) => c.Name.toLowerCase() === n.toLowerCase() || c.ExternalEmailAddress.toLowerCase() === a.toLowerCase())) throw err(null, "[Lab] Exchange refuses this: a contact with that name or address already exists. This lab does not show the exact error text.", "labmc");
      const c = { Name: n, DisplayName: b.DisplayName !== undefined ? String(b.DisplayName) : n, Alias: b.Alias !== undefined ? String(b.Alias) : n.replace(/[^A-Za-z0-9]/g, ""), ExternalEmailAddress: a };
      ctx.t.contacts.push(c);
      return [mcOut(c)];
    } });
  def("Get-MailContact", { module: "tmpEXO", ver: "1.0", ctype: "Function", session: true, params: { Identity: P(0), ResultSize: P(null) },
    run({ ctx, b, name }) {
      needExo(ctx, name); seed0(ctx);
      let l = ctx.t.contacts;
      if (b.Identity !== undefined) { const s = String(b.Identity).toLowerCase(); l = l.filter((c) => [c.Name, c.DisplayName, c.Alias, c.ExternalEmailAddress].some((x) => x.toLowerCase() === s)); if (!l.length) throw new E.PSErr("||The operation couldn't be performed because object '" + b.Identity + "' couldn't be found on 'AM0PR01A001DC01.EURPR01A001.prod.outlook.com'.", { cmd: name, term: true, kind: "exo404" }); }
      return l.map(mcOut);
    } });
  const MOD = "Microsoft.Online.SharePoint.PowerShell", VER = "16.0.25409.12000";
  const noConn = (name) => err(name, "No connection available. Use Connect-SPOService before running this CmdLet.", "nospo");
  const cleanUrl = (v) => String(v).trim().replace(/\/+$/, "");
  function findSite(ctx, name, v) {
    const u = cleanUrl(v);
    if (!/^https?:\/\//i.test(u)) throw err(name, "Cannot bind parameter 'Identity'. Cannot convert value \"" + v + "\" to type \"Microsoft.Online.SharePoint.PowerShell.SpoSitePipeBind\". Error: \"Invalid URI: The format of the URI could not be determined.\"", "spouri");
    const s = ctx.t.sites.find((x) => x.Url.toLowerCase() === u.toLowerCase());
    if (!s) throw err(name, "Cannot get site " + u + ".", "spo404");
    return s;
  }
  const siteOut = (s) => mk(T_SPO, { Url: s.Url, Owner: s.Owner, Title: s.Title, StorageQuota: s.StorageQuota, LockState: s.LockState, RestrictContentOrgWideSearch: s.RestrictContentOrgWideSearch });
  function boolVal(name, p, v) {
    if (v === true || v === false) return v;
    if (v === 1 || v === 0) return v === 1;
    throw err(name, "Cannot process argument transformation on parameter '" + p + "'. Cannot convert value \"" + E.toStr(v) + "\" to type \"System.Boolean\". Boolean parameters accept only Boolean values and numbers, such as $True, $False, 1 or 0.", "spobool");
  }
  def("Connect-SPOService", { module: MOD, ver: VER, ctype: "Cmdlet", params: { Url: P(0, { req: true }), Credential: P(null), ModernAuth: P(null), AuthenticationUrl: P(null), Region: P(null) },
    run({ ctx, b, name }) {
      const u = cleanUrl(b.Url);
      if (!/^https?:\/\//i.test(u)) throw err(name, "Invalid URI: The format of the URI could not be determined.", "spouri");
      if (u.toLowerCase() !== SPO_ADMIN) throw err(name, "Could not connect to SharePoint Online.", "spoconn");
      seed0(ctx); ctx.spo = true; return [];
    } });
  def("Disconnect-SPOService", { module: MOD, ver: VER, ctype: "Cmdlet", params: {}, run({ ctx, name }) { if (!ctx.spo) throw noConn(name); ctx.spo = false; return []; } });
  def("Get-SPOSite", { module: MOD, ver: VER, ctype: "Cmdlet", pipe: false, params: { Identity: P(0), Limit: P(null), Detailed: S(), Filter: P(null), IncludePersonalSite: P(null), Template: P(null) },
    run({ ctx, b, name }) {
      if (!ctx.spo) throw noConn(name);
      if (b.Filter !== undefined || b.IncludePersonalSite !== undefined || b.Template !== undefined) throw err(null, "[Lab] -Filter, -IncludePersonalSite and -Template are real, but this lab does not simulate them. Use -Identity, -Limit or -Detailed.", "labnote");
      if (b.Identity !== undefined) return [siteOut(findSite(ctx, name, b.Identity))];
      return ctx.t.sites.map(siteOut);
    } });
  def("Set-SPOSite", { module: MOD, ver: VER, ctype: "Cmdlet", params: { Identity: P(0, { req: true }), RestrictContentOrgWideSearch: P(null, { type: "System.Boolean" }), LockState: P(null, { type: "System.String" }), Title: P(null), Owner: P(null), StorageQuota: P(null), SharingCapability: P(null), RestrictedAccessControl: P(null), SensitivityLabel: P(null), DenyAddAndCustomizePages: P(null) },
    run({ ctx, b, name }) {
      if (!ctx.spo) throw noConn(name);
      const s = findSite(ctx, name, b.Identity);
      const sim = ["Identity", "RestrictContentOrgWideSearch", "LockState", "ErrorAction", "WarningAction", "Verbose", "Debug", "OutVariable"];
      const other = Object.keys(b).filter((k) => !sim.includes(k));
      if (other.length) throw err(null, "[Lab] -" + other.join(", -") + (other.length > 1 ? " are" : " is") + " real, but this lab only simulates -RestrictContentOrgWideSearch and -LockState on Set-SPOSite. Nothing was changed.", "labnote");
      let rcd = null, lock = null;
      if (b.RestrictContentOrgWideSearch !== undefined) rcd = boolVal(name, "RestrictContentOrgWideSearch", b.RestrictContentOrgWideSearch);
      if (b.LockState !== undefined) {
        lock = ["Unlock", "ReadOnly", "NoAccess"].find((x) => x.toLowerCase() === String(b.LockState).toLowerCase());
        if (!lock) throw err(null, "[Lab] -LockState takes Unlock, ReadOnly or NoAccess, the three values Microsoft Learn lists. Real SharePoint refuses '" + b.LockState + "' too; this lab does not show its exact error text.", "labnote");
        if (s.Url === SPO_ROOT) throw err(null, "[Lab] SharePoint does not allow a lock on the root site. This lab does not show the exact error text.", "labnote");
      }
      if (rcd !== null) s.RestrictContentOrgWideSearch = rcd;
      if (lock) s.LockState = lock;
      return [];
    } });
  return { seed: seed0, SPO_ADMIN };
})();
GRADER.HOOKS.push((ctx) => AB.seed(ctx));
const siteOf = (ctx, s) => ctx.t.sites.find((x) => x.Url === (s ? SITE(s) : SPO_ROOT));
const guestByMail = (ctx, m) => ctx.t.users.find((u) => u.UserType === "Guest" && (u.Mail || "").toLowerCase() === m);
const inviteFor = (ctx, m) => (ctx.t.invites || []).filter((i) => i.InvitedUserEmailAddress.toLowerCase() === m).pop();
const contactBy = (ctx, a) => (ctx.t.contacts || []).find((c) => c.ExternalEmailAddress.toLowerCase() === a);
const onlyRcd = (ctx, want) => ctx.t.sites.every((x) => x.RestrictContentOrgWideSearch === want.includes(x.Url));
const STORY12 = "Halvard works with people outside the company every day: auditors, couriers, a freelance designer. And Copilot has started quoting the payroll site to people who should never read it. Exam AB-650 asks you to handle both.";
const INV_ORLA = "New-MgInvitation -InvitedUserEmailAddress orla.fenwick@brightwater.example -InvitedUserDisplayName 'Orla Fenwick' -InviteRedirectUrl " + REDIRECT + " -SendInvitationMessage";

MEMORIES.push(
{
  id: "guestinvite", seq: 12, name: "New-MgInvitation", tag: "GUESTS", title: "A guest is an outside person with a sign-in",
  summary: "New-MgInvitation invites someone from outside as a guest (B2B). They get a guest account in your tenant and can use Teams and SharePoint once they accept.",
  setup: "guestR",
  brief: {
    what: [
      STORY12,
      "A <b>guest</b> is a person from another company with an account in <b>your</b> tenant: UserType <b>Guest</b>, and a UPN made from their address: <code>orla.fenwick_brightwater.example#EXT#</code>, then @ and your own domain. Builds on Users: it is a normal Get-MgUser object.",
      "<b>New-MgInvitation</b> needs two things: <b>-⁠InvitedUserEmailAddress</b> and <b>-⁠InviteRedirectUrl</b> (where they land after accepting). Add <b>-⁠SendInvitationMessage</b> to have Microsoft send the email; without it you send the InviteRedeemUrl yourself. The scope with the least power is <b>User.Invite.All</b>."
    ],
    daily: ["\"Our auditor needs the Finance team in Teams\"", "\"Can the freelancer open this SharePoint folder?\"", "Checking who never accepted their invitation"],
    parts: [["Connect-MgGraph -Scopes User.Invite.All", "the smallest scope that can invite"], ["-InvitedUserEmailAddress x@y", "who (required)"], ["-InviteRedirectUrl " + REDIRECT, "where they land (required)"], ["-InvitedUserDisplayName 'x'", "the name people see"], ["-SendInvitationMessage", "Microsoft sends the email"], ["Status: PendingAcceptance", "invited, not accepted yet"]],
    flow: [["Scope", "User.Invite.All"], ["Invite", "New-MgInvitation"], ["Wait", "PendingAcceptance"], ["Check", "Get-MgUser userType eq 'Guest'"]],
    traps: [["Two required values", "No -InviteRedirectUrl, no invitation. Graph refuses it."], ["No email by default", "Without -SendInvitationMessage nobody is told. You must share the redeem link yourself."], ["Not a contact", "A guest can sign in. Someone who only needs to be in the address book is a mail contact (next memory)."]]
  },
  watch: [
    { code: INV_ORLA, say: "Graph is connected with User.Read.All only. Reading users is not inviting them: 403." },
    { code: "Connect-MgGraph -Scopes User.Invite.All -NoWelcome", say: "The smallest scope that can invite. No need for User.ReadWrite.All." },
    { code: INV_ORLA, say: "Invitation made, the email is on its way. Status stays PendingAcceptance until Orla clicks the link." },
    { code: "Get-MgUser -Filter \"userType eq 'Guest'\" | Select-Object DisplayName,UserPrincipalName", say: "She is a user in Halvard now. Look at the UPN: her address with _ instead of @, then #EXT#." }
  ],
  trace: { ask: "Sign in with the smallest scope that can invite guests.", setup: "none", tpl: "Connect-MgGraph -Scopes User.[[Invite]].All -NoWelcome", check: { fn: (ctx) => hasScope(ctx, "User.Invite.All") }, wrong: "The scope is named after the action: inviting." },
  traceHints: ["Not ReadWrite: that can change every user.", "What are you doing to Orla?", "User.I_____.All", "Answer: Invite"],
  recall: { ask: "Invite Orla Fenwick (orla.fenwick@brightwater.example) as a guest. Microsoft should email her, and she lands on " + REDIRECT + ".", setup: "guestW", check: { fn: (ctx) => { const i = inviteFor(ctx, "orla.fenwick@brightwater.example"); const u = guestByMail(ctx, "orla.fenwick@brightwater.example"); return !!i && !!u && i.SendInvitationMessage === true && i.InviteRedirectUrl.replace(/\/+$/, "") === REDIRECT; } }, wrong: "One invitation, with the email sent and the right landing page." },
  recallHints: ["New-MgInvitation, with the two values it can't do without.", "-InvitedUserEmailAddress and -InviteRedirectUrl, plus the switch that sends the email.", "New-MgInvitation -InvitedUserEmailAddress ... -InviteRedirectUrl ... -SendInvitationMessage", INV_ORLA],
  real: ["Connect-MgGraph -Scopes User.Read.All", "Get-MgUser -All -Filter \"userType eq 'Guest'\" -Property DisplayName,Mail,ExternalUserState | Select-Object DisplayName,Mail,ExternalUserState", "Read-only. How many guests never accepted?"],
  cheat: [["New-MgInvitation", "Invite a guest, with the parameters below"], ["-InvitedUserEmailAddress x@y", "Who (required)"], ["-InviteRedirectUrl <url>", "Where they land (required)"], ["-SendInvitationMessage", "Microsoft sends the email"], ["User.Invite.All", "Smallest scope"], ["Get-MgUser -Filter \"userType eq 'Guest'\"", "All guests"], ["ExternalUserState", "Accepted or PendingAcceptance"]]
},
{
  id: "mailcontact", seq: 12, name: "New-MailContact", tag: "CONTACTS", title: "A contact is an outside address, not a person who signs in",
  summary: "New-MailContact puts an outside email address in your address book. A contact has no mailbox, no licence and no sign-in. Exchange door, not Graph.",
  setup: "contactOff",
  brief: {
    what: [
      "Sometimes an outsider only needs to be <b>findable</b>: in the address book, in a distribution list. That is a <b>mail contact</b>. It can't sign in, has no mailbox and needs no licence. If they must open Teams or SharePoint, make them a <b>guest</b> instead (previous memory).",
      "Contacts live in Exchange, so this is the Exchange door from Mailboxes: <b>Connect-ExchangeOnline</b> first. Before that, Exchange commands like New-MailContact are not even loaded.",
      "<b>New-MailContact</b> needs <b>-⁠Name</b> and <b>-⁠ExternalEmailAddress</b>. Leave out -DisplayName and the name is used for it. <b>Get-MailContact</b> lists them; their ExternalEmailAddress shows as <code>SMTP:address</code>."
    ],
    daily: ["\"Put the courier's dispatch desk in the address book\"", "Adding an outside address to a distribution list", "Guest or contact? Deciding which one a request needs"],
    parts: [["Connect-ExchangeOnline -ShowBanner:$false", "the Exchange door"], ["New-MailContact -Name 'x' -ExternalEmailAddress y@z", "create (both required)"], ["-DisplayName 'x'", "a different name in the address book"], ["Get-MailContact", "every contact"], ["Get-MailContact -Identity 'x'", "one contact"]],
    flow: [["Ask", "sign in, or only findable?"], ["Door", "Connect-ExchangeOnline"], ["Create", "New-MailContact"], ["Check", "Get-MailContact"]],
    traps: [["Wrong door", "Graph doesn't make mail contacts. Exchange does."], ["Contact can't sign in", "If they need Teams or files, a contact is the wrong answer: invite a guest."], ["Two required", "-Name and -ExternalEmailAddress, always both."]]
  },
  watch: [
    { code: "New-MailContact -Name 'Saltmere Audit' -ExternalEmailAddress audit@saltmere.example", say: "Not connected to Exchange, so the command isn't even loaded yet." },
    { code: "Connect-ExchangeOnline -ShowBanner:$false", say: "The Exchange door. Now the Exchange commands exist." },
    { code: "New-MailContact -Name 'Saltmere Audit' -ExternalEmailAddress audit@saltmere.example", say: "In the address book. No licence, no mailbox, no sign-in." },
    { code: "Get-MailContact | Select-Object Name,ExternalEmailAddress", say: "Three contacts. Note the SMTP: in front of each address." }
  ],
  trace: { ask: "Add Ferrycourt Legal (legal@ferrycourt.example) to the address book.", setup: "contactOn", tpl: "New-MailContact -Name 'Ferrycourt Legal' -[[ExternalEmailAddress]] legal@ferrycourt.example", check: { fn: (ctx) => !!contactBy(ctx, "legal@ferrycourt.example") }, wrong: "The parameter for the outside address." },
  traceHints: ["Their address, outside Halvard.", "External + Email + Address", "-External____________", "Answer: ExternalEmailAddress"],
  recall: { ask: "The auditors, Saltmere Audit (audit@saltmere.example), must be in the address book. They don't need to sign in to anything.", setup: "contactOff", check: { fn: (ctx) => !!contactBy(ctx, "audit@saltmere.example") && !guestByMail(ctx, "audit@saltmere.example") }, wrong: "A mail contact for audit@saltmere.example, and no guest: they don't sign in." },
  recallHints: ["They only need to be findable: a contact.", "Contacts live behind the Exchange door.", "Connect-ExchangeOnline -ShowBanner:$false; New-MailContact -Name ... -ExternalEmailAddress ...", "Connect-ExchangeOnline -ShowBanner:$false; New-MailContact -Name 'Saltmere Audit' -ExternalEmailAddress audit@saltmere.example"],
  real: ["Connect-ExchangeOnline -ShowBanner:$false", "Get-MailContact -ResultSize Unlimited | Select-Object Name,ExternalEmailAddress", "Read-only. Any contacts for companies you stopped working with?"],
  cheat: [["New-MailContact", "Create a contact, with the two below"], ["-Name 'x'", "Required"], ["-ExternalEmailAddress x@y", "Required"], ["Get-MailContact", "List contacts"], ["Guest", "signs in"], ["Contact", "only findable"]]
},
{
  id: "spo", seq: 12, name: "Set-SPOSite", tag: "SHAREPOINT DOOR", title: "Hide a site from Copilot, keep the door open for its people",
  summary: "SharePoint Online PowerShell has its own door, to the admin address. Set-SPOSite -RestrictContentOrgWideSearch $true hides a site from Copilot and org-wide search; who can open it stays the same.",
  setup: "spoOff",
  brief: {
    what: [
      "SharePoint is the fourth door: <b>Connect-SPOService -Url</b> to the <b>admin</b> address, the one with <b>-⁠admin</b> in it: <code>" + SPO_ADMIN + "</code>. The normal site address fails. Without the door every SPO command says 'No connection available'.",
      "<b>Get-SPOSite</b> lists sites. <b>-⁠Identity</b> wants the <b>full URL</b>, not the site's name: <code>" + SITE("payroll") + "</code>.",
      "<b>Set-SPOSite -RestrictContentOrgWideSearch $true</b> turns on <b>Restricted Content Discovery</b>: Copilot and org-wide search stop finding the site, and permissions don't change. It is a Boolean: <b>$true</b>, not true. The index takes a while to catch up. You met this in Vigil's salary ledger case."
    ],
    daily: ["\"Copilot quoted the payroll files to me!\"", "Hiding a confidential site without breaking access", "Checking a site's settings before you change them"],
    parts: [["Connect-SPOService -Url " + SPO_ADMIN, "the SharePoint door (admin address)"], ["Get-SPOSite", "every site"], ["Get-SPOSite -Identity <full URL>", "one site"], ["Set-SPOSite -Identity <url> -RestrictContentOrgWideSearch $true", "hide from Copilot and search"], ["Get-SPOSite -Identity <url> | Select-Object RestrictContentOrgWideSearch", "check it"], ["-LockState ReadOnly", "readable, nobody can change it"]],
    flow: [["Door", "Connect-SPOService -admin"], ["Look", "Get-SPOSite -Identity"], ["Hide", "-RestrictContentOrgWideSearch $true"], ["Check", "read it back"]],
    traps: [["Admin address", "https://halvardco.sharepoint.com fails. Use https://halvardco-admin.sharepoint.com."], ["Full URL", "-Identity Payroll fails: Invalid URI. Give the whole address."], ["$true, not true", "A bare true is a string, and a Boolean parameter refuses it."]]
  },
  watch: [
    { code: "Get-SPOSite", say: "Graph is connected, SharePoint is not. Fourth door." },
    { code: "Connect-SPOService -Url " + SPO_ROOT, say: "The normal address. Refused: the door is the admin address." },
    { code: "Connect-SPOService -Url " + SPO_ADMIN, say: "With -admin in it. No output means it worked." },
    { code: "Get-SPOSite -Identity " + SITE("payroll") + " | Select-Object Title,RestrictContentOrgWideSearch", say: "Look before you change: False, so Copilot can still find it." },
    { code: "Set-SPOSite -Identity " + SITE("payroll") + " -RestrictContentOrgWideSearch true", say: "A bare true is text. The parameter is a Boolean: refused." },
    { code: "Set-SPOSite -Identity " + SITE("payroll") + " -RestrictContentOrgWideSearch $true", say: "On. Hesper's team can still open Payroll; Copilot stops quoting it once the index catches up." },
    { code: "Get-SPOSite -Identity " + SITE("payroll") + " | Select-Object Title,RestrictContentOrgWideSearch", say: "Check after you change: True." }
  ],
  trace: { ask: "Open the SharePoint door for Halvard.", setup: "spoOff", tpl: "Connect-SPOService -Url https://halvardco-[[admin]].sharepoint.com", check: { fn: (ctx) => ctx.spo === true }, wrong: "The address with the admin centre in it." },
  traceHints: ["Not the normal site address.", "The SharePoint admin centre's address.", "halvardco-a____", "Answer: admin"],
  recall: { ask: "Copilot keeps quoting the Payroll site (" + SITE("payroll") + "). Hide it from Copilot and org-wide search without changing who can open it. Nothing else may change.", setup: "spoOff", check: { fn: (ctx) => !!ctx.t.sites && onlyRcd(ctx, [SITE("payroll")]) && ctx.t.sites.every((x) => x.LockState === "Unlock") }, wrong: "Only Payroll, only Restricted Content Discovery, and no lock." },
  recallHints: ["Open the SharePoint door first, to the admin address.", "Set-SPOSite, with the full URL and a Boolean.", "Connect-SPOService -Url " + SPO_ADMIN + "; Set-SPOSite -Identity ... -RestrictContentOrgWideSearch $true", "Connect-SPOService -Url " + SPO_ADMIN + "; Set-SPOSite -Identity " + SITE("payroll") + " -RestrictContentOrgWideSearch $true"],
  real: ["Connect-SPOService -Url https://<your tenant>-admin.sharepoint.com", "Get-SPOSite -Identity <a site you know> | Select-Object Url,RestrictContentOrgWideSearch", "Read-only. Only look; change nothing at work without a ticket."],
  cheat: [["Connect-SPOService -Url <admin URL>", "The door: https://x-admin.sharepoint.com"], ["Get-SPOSite -Identity <full URL>", "One site"], ["Set-SPOSite -Identity <full URL>", "Then one of the two below"], ["-RestrictContentOrgWideSearch $true", "Hide from Copilot and search"], ["-LockState ReadOnly", "Readable, no changes"]]
}
);

const VIGIL_PS = {
  connect: 0, site: 1, set: 2, lock: 3
};
Object.assign(DRILLS, {
  guestinvite: [
    { q: "How many guests does Halvard have? One number.", fn: (ctx, res) => res.out.length === 1 && res.out[0] === ctx.t.users.filter((u) => u.UserType === "Guest").length, sol: ["(Get-MgUser -All -Filter \"userType eq 'Guest'\").Count"], hint: "-Filter \"userType eq 'Guest'\", then .Count" },
    { q: "Which guests never accepted their invitation? DisplayName only.", setup: "guestR", fn: (ctx, res) => { const want = ctx.t.users.filter((u) => u.UserType === "Guest" && u.ExternalUserState === "PendingAcceptance").map((u) => u.DisplayName).sort().join(); const got = res.out.map((o) => o && o.DisplayName).filter(Boolean).sort().join(); return !!want && got === want && res.out.length === want.split(",").length; }, sol: ["Get-MgUser -All -Filter \"userType eq 'Guest'\" -Property DisplayName,ExternalUserState | Where-Object ExternalUserState -eq 'PendingAcceptance' | Select-Object DisplayName"], hint: "ExternalUserState is not in the default output: ask for it with -Property." },
    { q: "Invite Tobin Marsh (tobin.marsh@ferrycourt.example) as a guest landing on " + REDIRECT + ". Do NOT send the email: you will send him the link yourself.", fn: (ctx) => { const i = inviteFor(ctx, "tobin.marsh@ferrycourt.example"); return !!i && i.SendInvitationMessage === false && !!guestByMail(ctx, "tobin.marsh@ferrycourt.example"); }, sol: ["New-MgInvitation -InvitedUserEmailAddress tobin.marsh@ferrycourt.example -InvitedUserDisplayName 'Tobin Marsh' -InviteRedirectUrl " + REDIRECT], hint: "Leave out -SendInvitationMessage." },
    { q: "You invited Tobin without the email, and an invitation can't be read back later. Invite him again and keep only the InviteRedeemUrl to send him.", pre: ["New-MgInvitation -InvitedUserEmailAddress tobin.marsh@ferrycourt.example -InviteRedirectUrl " + REDIRECT], fn: (ctx, res) => res.out.length === 1 && typeof res.out[0] === "string" && /^https:\/\/login\.microsoftonline\.com\/redeem/.test(res.out[0]), sol: ["(New-MgInvitation -InvitedUserEmailAddress tobin.marsh@ferrycourt.example -InviteRedirectUrl " + REDIRECT + ").InviteRedeemUrl"], hint: "Wrap the command in ( ) and ask for .InviteRedeemUrl" },
    { q: "Try to invite wren.ashdown@quillpress.example without a landing page, and read what Graph says.", fn: (ctx, res) => !!res.error && /InviteRedirectUrl/.test(res.error.text()), sol: ["New-MgInvitation -InvitedUserEmailAddress wren.ashdown@quillpress.example"], hint: "Only -InvitedUserEmailAddress." }
  ],
  mailcontact: [
    { q: "List every mail contact: Name and ExternalEmailAddress.", setup: "contactOn", out: "Get-MailContact | Select-Object Name,ExternalEmailAddress", hint: "Get-MailContact | Select-Object ..." },
    { q: "Add Brackenford Returns (returns@brackenford.example) to the address book, shown as 'Brackenford Couriers - Returns'.", setup: "contactOn", fn: (ctx) => { const c = contactBy(ctx, "returns@brackenford.example"); return !!c && c.DisplayName === "Brackenford Couriers - Returns"; }, sol: ["New-MailContact -Name 'Brackenford Returns' -DisplayName 'Brackenford Couriers - Returns' -ExternalEmailAddress returns@brackenford.example"], hint: "-DisplayName sets the address book name." },
    { q: "Wren Ashdown, a freelance designer (wren.ashdown@quillpress.example), must open files in the Marketing team. Guest or contact? Make the right one, landing on " + REDIRECT + ", with the email sent.", setup: "outside", fn: (ctx) => !!guestByMail(ctx, "wren.ashdown@quillpress.example") && !contactBy(ctx, "wren.ashdown@quillpress.example"), sol: ["New-MgInvitation -InvitedUserEmailAddress wren.ashdown@quillpress.example -InvitedUserDisplayName 'Wren Ashdown' -InviteRedirectUrl " + REDIRECT + " -SendInvitationMessage"], hint: "Opening files means signing in." },
    { q: "How many mail contacts does Halvard have? One number.", setup: "contactOn", fn: (ctx, res) => res.out.length === 1 && res.out[0] === ctx.t.contacts.length, sol: ["(Get-MailContact).Count"], hint: "(Get-MailContact).Count" },
    { q: "Ironmere Insurance's claims desk only needs to be in the address book. Is there a contact for claims@ironmere.example already? Show it.", setup: "contactOn", out: "Get-MailContact -Identity claims@ironmere.example", hint: "Look before you add: Get-MailContact -Identity" }
  ],
  spo: [
    { q: "Open the SharePoint Online door for Halvard.", setup: "spoOff", fn: (ctx) => ctx.spo === true, sol: ["Connect-SPOService -Url " + SPO_ADMIN], hint: "The admin address." },
    { q: "Show the Payroll site. Give the full address.", setup: "spoOn", out: "Get-SPOSite -Identity " + SITE("payroll"), hint: "-Identity wants the whole URL." },
    { q: "Turn on Restricted Content Discovery for the Board site (" + SITE("board") + ").", setup: "spoOn", fn: (ctx) => onlyRcd(ctx, [SITE("board")]), sol: ["Set-SPOSite -Identity " + SITE("board") + " -RestrictContentOrgWideSearch $true"], hint: "$true, not true." },
    { q: "Old Intranet is being moved. Make it read-only: people can still read it, nobody can change it.", setup: "spoOn", fn: (ctx) => { const s = siteOf(ctx, "oldintranet"); return s.LockState === "ReadOnly" && ctx.t.sites.filter((x) => x !== s).every((x) => x.LockState === "Unlock"); }, sol: ["Set-SPOSite -Identity " + SITE("oldintranet") + " -LockState ReadOnly"], hint: "-LockState takes Unlock, ReadOnly or NoAccess." },
    { q: "The board papers are public now. Turn Restricted Content Discovery off again for Board, and check it.", setup: "spoOn", pre: ["Set-SPOSite -Identity " + SITE("board") + " -RestrictContentOrgWideSearch $true"], fn: (ctx, res, hist) => onlyRcd(ctx, []) && (hist || []).some((h) => /Get-SPOSite/i.test(h)), sol: ["Set-SPOSite -Identity " + SITE("board") + " -RestrictContentOrgWideSearch $false; Get-SPOSite -Identity " + SITE("board") + " | Select-Object Url,RestrictContentOrgWideSearch"], hint: "$false, then read it back." }
  ]
});

const VIGIL_KIND = { noconn: "connect", connect: "connect", tconn: "connect", site: "site", tget: "site", set: "set", bool: "set", param: "set", tset: "set", lock: "lock" };
function vigilOops() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem("vigil.v1") || "null"); } catch (e) { s = null; }
  if (!s || !Array.isArray(s.miss)) return [];
  const m = MEMORIES.find((x) => x.id === "spo"), out = [], seen = new Set();
  for (const x of s.miss) {
    if (!x || x.kind !== "ps" || !x.ref) continue;
    const k = VIGIL_KIND[x.ref.e]; if (!k || seen.has(k)) continue;
    seen.add(k);
    const i = VIGIL_PS[k];
    out.push({ m, d: DRILLS.spo[i], i, vigil: k });
  }
  return out.sort((a, b) => a.i - b.i);
}
ERR_HELP.unshift(
  [/No connection available\. Use Connect-SPOService/i, "SharePoint is its own door. Connect-SPOService -Url to the admin address first."],
  [/Could not connect to SharePoint Online/i, "Connect-SPOService wants the admin address: your tenant name with -admin after it, then .sharepoint.com."],
  [/SpoSitePipeBind|Invalid URI/i, "-Identity wants the full site address, starting with https://."],
  [/Cannot get site/i, "No site at that address. Get-SPOSite lists the real ones."],
  [/^\[Lab\]/, "This is the lab speaking, not PowerShell: the real command refuses it too, but the lab does not copy the exact text."]
);
if (typeof HELP !== "undefined") Object.assign(HELP, {
  "New-MgInvitation": { syn: "Invites an external user to your organisation as a guest (B2B).", ex: [["Invite and email", INV_ORLA, "Needs User.Invite.All. Both -InvitedUserEmailAddress and -InviteRedirectUrl are required."]] },
  "New-MailContact": { syn: "Creates a mail contact: an outside address in your address book.", ex: [["New contact", "New-MailContact -Name 'Saltmere Audit' -ExternalEmailAddress audit@saltmere.example", "-Name and -ExternalEmailAddress are required."]] },
  "Get-MailContact": { syn: "Gets mail contacts.", ex: [["All contacts", "Get-MailContact", "Add -Identity for one contact."]] },
  "Connect-SPOService": { syn: "Connects a SharePoint Online administrator to the SharePoint Online admin center.", ex: [["Connect", "Connect-SPOService -Url " + SPO_ADMIN, "The admin address, with -admin in it."]] },
  "Get-SPOSite": { syn: "Gets SharePoint Online site collections.", ex: [["One site", "Get-SPOSite -Identity " + SITE("payroll"), "-Identity is the full URL."]] },
  "Set-SPOSite": { syn: "Sets or updates properties of a SharePoint Online site collection.", ex: [["Restricted Content Discovery", "Set-SPOSite -Identity " + SITE("payroll") + " -RestrictContentOrgWideSearch $true", "Hides the site from Copilot and org-wide search. Permissions stay."], ["Read-only", "Set-SPOSite -Identity " + SITE("oldintranet") + " -LockState ReadOnly", "Unlock, ReadOnly or NoAccess."]] }
});
