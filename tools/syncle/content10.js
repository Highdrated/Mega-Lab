SEQUENCES.push({ id: 13, name: "Delegate with care", short: "AB-650", open: true, blurb: "For Exam AB-650: administrative units to fence a group of people in, and Privileged Identity Management, so admin roles are eligible, not always on." });
Object.assign(GRADER.SETUPS, {
  auR: { scopes: ["User.Read.All"], exo: false },
  auW: { scopes: ["User.Read.All", "AdministrativeUnit.ReadWrite.All"], exo: false },
  pimR: { scopes: ["User.Read.All"], exo: false },
  pimW: { scopes: ["User.Read.All", "RoleManagement.ReadWrite.Directory"], exo: false }
});
const DEL = (() => {
  const E = PS;
  const GMM = "Microsoft.Graph.PowerShell.Models.";
  const T_AU = GMM + "MicrosoftGraphAdministrativeUnit", T_DO = GMM + "MicrosoftGraphDirectoryObject", T_RD = GMM + "MicrosoftGraphUnifiedRoleDefinition", T_REQ = GMM + "MicrosoftGraphUnifiedRoleEligibilityScheduleRequest", T_INST = GMM + "MicrosoftGraphUnifiedRoleEligibilityScheduleInstance";
  E.DISPLAY[T_AU] = ["DisplayName", "Id", "Description"];
  E.DISPLAY[T_RD] = ["DisplayName", "Id", "IsBuiltIn"];
  E.DISPLAY[T_REQ] = ["Id", "Action", "Status", "DirectoryScopeId"];
  E.DISPLAY[T_INST] = ["PrincipalId", "RoleDefinitionId", "DirectoryScopeId", "EndDateTime"];
  const mk = (type, props) => { const o = {}; Object.defineProperty(o, E.TYPE, { value: type, writable: true }); return Object.assign(o, props); };
  const P = (pos, extra) => Object.assign({ kind: "value" }, pos === null ? {} : { pos }, extra || {});
  let seed = 7171;
  const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const gid = () => { const h = () => Math.floor(rnd() * 16).toString(16); let s = ""; for (const n of [8, 4, 4, 4, 12]) { for (let i = 0; i < n; i++) s += h(); s += "-"; } return s.slice(0, -1); };
  const def = (name, spec) => { spec.name = name; E.CMDS[name.toLowerCase()] = spec; };
  const lab = (msg) => new E.PSErr("[Lab] " + msg, { cmd: null, term: true, kind: "labnote" });
  const need = (ctx, name, sub, any) => {
    if (!ctx.mg) throw new E.PSErr("Authentication needed. Please call Connect-MgGraph.", { cmd: name + "_" + sub, term: true, kind: "auth" });
    if (!any.some((s) => ctx.mg.scopes.some((x) => x.toLowerCase() === s.toLowerCase()))) throw new E.PSErr("Insufficient privileges to complete the operation.\n\nStatus: 403 (Forbidden)\nErrorCode: Authorization_RequestDenied", { cmd: name + "_" + sub, term: true, kind: "scope" });
  };
  const AU_R = ["AdministrativeUnit.Read.All", "AdministrativeUnit.ReadWrite.All", "Directory.Read.All", "Directory.ReadWrite.All"];
  const AU_W = ["AdministrativeUnit.ReadWrite.All", "Directory.ReadWrite.All"];
  const RD_R = ["RoleManagement.Read.Directory", "RoleManagement.ReadWrite.Directory", "Directory.Read.All", "Directory.ReadWrite.All", "RoleEligibilitySchedule.Read.Directory", "RoleEligibilitySchedule.ReadWrite.Directory"];
  const EL_W = ["RoleEligibilitySchedule.ReadWrite.Directory", "RoleManagement.ReadWrite.Directory"];
  const EL_R = ["RoleEligibilitySchedule.Read.Directory", "RoleEligibilitySchedule.ReadWrite.Directory", "RoleManagement.Read.Directory", "RoleManagement.ReadWrite.Directory"];
  const ROLEDEFS = [["Global Administrator", "62e90394-69f5-4237-9190-012177145e10"], ["Privileged Role Administrator", "e8611ab8-c189-46e8-94e1-60213ab1f814"], ["User Administrator", "fe930be7-5e62-47db-91af-98c3a49a38b1"], ["Helpdesk Administrator", "729827e3-9c14-49f7-bb1b-9608f156bbb8"], ["Exchange Administrator", "29232cdf-9323-42fd-ade2-1d097af3e4de"], ["SharePoint Administrator", "f28a1f50-f6e7-4571-818b-6a12f2af6b6c"], ["Global Reader", "f2ef992c-3afb-46b9-b7cf-a126ee74c451"]];
  const upn = (t, n) => n + "@" + t.domain;
  const uid = (t, n) => t.users.find((u) => u.UserPrincipalName === upn(t, n)).Id;
  function seed0(ctx) {
    const t = ctx.t;
    if (t._del) return;
    t._del = true;
    t.aus = [{ Id: gid(), DisplayName: "Bruges office", Description: "Staff based in Bruges", members: ["elowen.thistle", "cassian.drake", "elara.wynn"].map((n) => uid(t, n)) }];
    t.elig = [
      { Id: gid(), PrincipalId: uid(t, "lorcan.ivers"), RoleDefinitionId: ROLEDEFS[0][1], DirectoryScopeId: "/", StartDateTime: new Date(E.NOW.getTime() - 40 * 864e5), EndDateTime: new Date(E.NOW.getTime() + 140 * 864e5) },
      { Id: gid(), PrincipalId: uid(t, "elowen.thistle"), RoleDefinitionId: ROLEDEFS[1][1], DirectoryScopeId: "/", StartDateTime: new Date(E.NOW.getTime() - 90 * 864e5), EndDateTime: null }
    ];
  }
  const keyOf = (h, k) => h ? Object.keys(h).find((x) => x.toLowerCase() === k.toLowerCase()) : undefined;
  const get = (h, k) => { const x = keyOf(h, k); return x === undefined ? undefined : h[x]; };
  const hashOut = (props) => { const h = E.run("@{}", new E.Ctx()).out[0]; return Object.assign(h, props); };
  const auOut = (a) => mk(T_AU, { DeletedDateTime: null, Description: a.Description, DisplayName: a.DisplayName, Id: a.Id, IsMemberManagementRestricted: false, MembershipRule: null, MembershipType: null, Visibility: null });
  function findAu(ctx, name, id) {
    if (id === undefined || id === null) throw new E.PSErr("Cannot bind argument to parameter 'AdministrativeUnitId' because it is null.", { cmd: name, term: true, kind: "bind" });
    const s = String(id).toLowerCase();
    const a = ctx.t.aus.find((x) => x.Id === s);
    if (!a) throw lab("Graph finds no administrative unit with the Id '" + id + "'. -AdministrativeUnitId wants the unit's Id (a GUID), not its name. This lab does not show the exact error text.");
    return a;
  }
  def("Get-MgDirectoryAdministrativeUnit", { module: "Microsoft.Graph.Identity.DirectoryManagement", ver: "2.25.0", ctype: "Function", params: { AdministrativeUnitId: P(null), Filter: P(null), All: { kind: "switch" }, Property: P(null), Top: P(null) },
    run({ ctx, b, name }) {
      need(ctx, name, b.AdministrativeUnitId !== undefined ? "Get" : "List", AU_R); seed0(ctx);
      if (b.Property !== undefined || b.Top !== undefined) throw lab("-Property and -Top are real, but this lab does not simulate them here. Use -Filter or -AdministrativeUnitId.");
      let l = ctx.t.aus;
      if (b.AdministrativeUnitId !== undefined) l = [findAu(ctx, name, b.AdministrativeUnitId)];
      if (b.Filter !== undefined) { const m = /^\s*displayName\s+eq\s+'([^']*)'\s*$/i.exec(String(b.Filter)); if (!m) throw lab("This lab only simulates -Filter \"displayName eq '...'\" for administrative units."); l = l.filter((a) => a.DisplayName.toLowerCase() === m[1].toLowerCase()); }
      return l.map(auOut);
    } });
  def("New-MgDirectoryAdministrativeUnit", { module: "Microsoft.Graph.Identity.DirectoryManagement", ver: "2.25.0", ctype: "Function", params: { BodyParameter: P(null), DisplayName: P(null), Description: P(null), Visibility: P(null), MembershipType: P(null), MembershipRule: P(null), MembershipRuleProcessingState: P(null) },
    run({ ctx, b, name }) {
      need(ctx, name, "CreateExpanded", AU_W); seed0(ctx);
      const body = b.BodyParameter;
      if (body !== undefined && !E.isHT(body)) throw lab("-BodyParameter wants a hashtable, like @{ displayName = '...'; description = '...' }.");
      const pick = (k) => body !== undefined ? get(body, k) : b[k];
      for (const k of ["Visibility", "MembershipType", "MembershipRule", "MembershipRuleProcessingState"]) if (pick(k) !== undefined && pick(k) !== null) throw lab(k + " is real (dynamic units, hidden membership), but this lab only simulates displayName and description.");
      const dn = pick("DisplayName");
      if (dn === undefined || dn === null || String(dn).trim() === "") throw lab("Graph refuses an administrative unit without a displayName. This lab does not show the exact error text.");
      const desc = pick("Description");
      const a = { Id: gid(), DisplayName: String(dn), Description: desc === undefined || desc === null ? null : String(desc), members: [] };
      ctx.t.aus.push(a);
      return [auOut(a)];
    } });
  def("New-MgDirectoryAdministrativeUnitMemberByRef", { module: "Microsoft.Graph.Identity.DirectoryManagement", ver: "2.25.0", ctype: "Function", params: { AdministrativeUnitId: P(null), OdataId: P(null), BodyParameter: P(null) },
    run({ ctx, b, name }) {
      need(ctx, name, "CreateExpanded", AU_W); seed0(ctx);
      const a = findAu(ctx, name, b.AdministrativeUnitId);
      const ref = b.BodyParameter !== undefined ? (E.isHT(b.BodyParameter) ? get(b.BodyParameter, "@odata.id") : undefined) : b.OdataId;
      if (ref === undefined || ref === null) throw lab("Which member? Give -OdataId 'https://graph.microsoft.com/v1.0/users/<Id>' (or -BodyParameter @{ '@odata.id' = '...' }). This lab does not show the exact error text.");
      const m = /^https:\/\/graph\.microsoft\.com\/v1\.0\/(users|directoryObjects|groups|devices)\/([^\/\s]+)$/i.exec(String(ref).trim());
      if (!m) throw lab("The member reference must be a full Graph URL, like https://graph.microsoft.com/v1.0/users/<Id>. This lab does not show the exact error text.");
      if (/^(groups|devices)$/i.test(m[1])) throw lab("Groups and devices can be members too, but this lab only simulates users.");
      const u = ctx.t.users.find((x) => x.Id === m[2].toLowerCase());
      if (!u) throw lab("No user with the Id '" + m[2] + "'. Use the user's object Id (a GUID) in the URL, for example $u.Id. This lab does not show the exact error text.");
      if (a.members.includes(u.Id)) throw lab(u.DisplayName + " is already in " + a.DisplayName + ". Graph refuses to add a member twice; this lab does not show the exact error text.");
      a.members.push(u.Id);
      return [];
    } });
  def("Get-MgDirectoryAdministrativeUnitMember", { module: "Microsoft.Graph.Identity.DirectoryManagement", ver: "2.25.0", ctype: "Function", params: { AdministrativeUnitId: P(null), All: { kind: "switch" } },
    run({ ctx, b, name }) {
      need(ctx, name, "List", AU_R); seed0(ctx);
      const a = findAu(ctx, name, b.AdministrativeUnitId);
      return a.members.map((id) => { const u = ctx.t.users.find((x) => x.Id === id); return mk(T_DO, { DeletedDateTime: null, Id: id, AdditionalProperties: hashOut({ "@odata.type": "#microsoft.graph.user", displayName: u.DisplayName, userPrincipalName: u.UserPrincipalName }) }); });
    } });
  const rdOut = (r) => mk(T_RD, { Description: null, DisplayName: r[0], Id: r[1], IsBuiltIn: true, IsEnabled: true, TemplateId: r[1] });
  def("Get-MgRoleManagementDirectoryRoleDefinition", { module: "Microsoft.Graph.Identity.Governance", ver: "2.25.0", ctype: "Function", params: { UnifiedRoleDefinitionId: P(null), Filter: P(null), All: { kind: "switch" } },
    run({ ctx, b, name }) {
      need(ctx, name, "List", RD_R);
      let l = ROLEDEFS;
      if (b.UnifiedRoleDefinitionId !== undefined) { l = l.filter((r) => r[1] === String(b.UnifiedRoleDefinitionId).toLowerCase()); if (!l.length) throw lab("No role definition with that Id. This lab does not show the exact error text."); }
      if (b.Filter !== undefined) { const m = /^\s*displayName\s+eq\s+'([^']*)'\s*$/i.exec(String(b.Filter)); if (!m) throw lab("This lab only simulates -Filter \"displayName eq '...'\" for role definitions."); l = l.filter((r) => r[0].toLowerCase() === m[1].toLowerCase()); }
      return l.map(rdOut);
    } });
  const instOut = (e) => mk(T_INST, { AppScopeId: null, DirectoryScopeId: e.DirectoryScopeId, EndDateTime: e.EndDateTime, Id: e.Id, MemberType: "Direct", PrincipalId: e.PrincipalId, RoleDefinitionId: e.RoleDefinitionId, RoleEligibilityScheduleId: e.Id, StartDateTime: e.StartDateTime });
  def("Get-MgRoleManagementDirectoryRoleEligibilityScheduleInstance", { module: "Microsoft.Graph.Identity.Governance", ver: "2.25.0", ctype: "Function", params: { Filter: P(null), All: { kind: "switch" } },
    run({ ctx, b, name }) {
      need(ctx, name, "List", EL_R); seed0(ctx);
      let l = ctx.t.elig;
      if (b.Filter !== undefined) {
        const parts = String(b.Filter).split(/\s+and\s+/i);
        for (const p of parts) { const m = /^\s*(principalId|roleDefinitionId)\s+eq\s+'([^']*)'\s*$/i.exec(p); if (!m) throw lab("This lab only simulates -Filter \"principalId eq '...'\" and \"roleDefinitionId eq '...'\" here."); const k = m[1].toLowerCase() === "principalid" ? "PrincipalId" : "RoleDefinitionId"; l = l.filter((e) => e[k] === m[2].toLowerCase()); }
      }
      return l.map(instOut);
    } });
  const ACTIONS = ["AdminAssign", "AdminRemove", "AdminUpdate", "AdminExtend", "AdminRenew", "SelfActivate", "SelfDeactivate", "SelfExtend", "SelfRenew"];
  def("New-MgRoleManagementDirectoryRoleEligibilityScheduleRequest", { module: "Microsoft.Graph.Identity.Governance", ver: "2.25.0", ctype: "Function", params: { BodyParameter: P(null), Action: P(null), PrincipalId: P(null), RoleDefinitionId: P(null), DirectoryScopeId: P(null), Justification: P(null), ScheduleInfo: P(null) },
    run({ ctx, b, name }) {
      need(ctx, name, "CreateExpanded", EL_W); seed0(ctx);
      if (b.BodyParameter === undefined) throw lab("The expanded parameters (-Action, -PrincipalId and so on) are real, but this lab simulates -BodyParameter $params, the way Microsoft's PIM tutorial does it.");
      const h = b.BodyParameter;
      if (!E.isHT(h)) throw lab("-BodyParameter wants a hashtable: $params = @{ ... }.");
      const act = ACTIONS.find((a) => a.toLowerCase() === String(get(h, "Action") || "").toLowerCase());
      if (!act) throw lab("Action must be one of " + ACTIONS.join(", ") + ". This lab does not show the exact error text.");
      if (!/^Admin(Assign|Remove)$/.test(act)) throw lab(act + " is real, but this lab only simulates AdminAssign and AdminRemove for eligible roles. Activation (SelfActivate) is a different command, run by the person who is eligible.");
      const pid = String(get(h, "PrincipalId") || "").toLowerCase(), rid = String(get(h, "RoleDefinitionId") || "").toLowerCase(), scope = get(h, "DirectoryScopeId");
      const u = ctx.t.users.find((x) => x.Id === pid);
      if (!u) throw lab("PrincipalId must be the person's object Id (a GUID), for example $u.Id. A name or UPN is refused. This lab does not show the exact error text.");
      const rd = ROLEDEFS.find((r) => r[1] === rid);
      if (!rd) throw lab("RoleDefinitionId must be the role's Id (a GUID), for example $r.Id. This lab does not show the exact error text.");
      if (scope === undefined || scope === null) throw lab("DirectoryScopeId is missing. \"/\" means the whole tenant. This lab does not show the exact error text.");
      if (String(scope) !== "/") throw lab("Other scopes are real, but this lab only simulates DirectoryScopeId \"/\", the whole tenant.");
      const just = get(h, "Justification");
      const cur = ctx.t.elig.find((e) => e.PrincipalId === pid && e.RoleDefinitionId === rid && e.DirectoryScopeId === "/");
      const reqOut = () => [mk(T_REQ, { Action: act.charAt(0).toLowerCase() + act.slice(1), AppScopeId: null, CompletedDateTime: new Date(), CreatedDateTime: new Date(), DirectoryScopeId: "/", Id: gid(), IsValidationOnly: false, Justification: just === undefined ? null : String(just), PrincipalId: pid, RoleDefinitionId: rid, Status: act === "AdminRemove" ? "Revoked" : "Provisioned" })];
      if (act === "AdminRemove") {
        if (!cur) throw lab(u.DisplayName + " is not eligible for " + rd[0] + ", so there is nothing to remove. This lab does not show the exact error text.");
        ctx.t.elig = ctx.t.elig.filter((e) => e !== cur);
        return reqOut();
      }
      if (cur) throw lab(u.DisplayName + " is already eligible for " + rd[0] + ". To change the end date the real action is AdminExtend or AdminUpdate, which this lab does not simulate.");
      const si = get(h, "ScheduleInfo");
      if (!E.isHT(si)) throw lab("ScheduleInfo is missing: a hashtable with StartDateTime and Expiration. This lab does not show the exact error text.");
      const st = get(si, "StartDateTime"), ex = get(si, "Expiration");
      const start = st instanceof Date ? st : st ? new Date(String(st)) : new Date();
      if (!E.isHT(ex)) throw lab("Expiration is missing inside ScheduleInfo: @{ Type = 'AfterDuration'; Duration = 'PT10H' }. This lab does not show the exact error text.");
      const type = String(get(ex, "Type") || "").toLowerCase();
      let end = null;
      if (type === "afterduration") {
        const d = String(get(ex, "Duration") || ""), m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(d);
        if (!m || d === "P" || d === "PT" || !(m[1] || m[2] || m[3])) throw lab("Duration is ISO 8601: PT10H is ten hours, P90D is ninety days. '" + d + "' is not one. This lab does not show the exact error text.");
        end = new Date(start.getTime() + ((+m[1] || 0) * 24 * 60 + (+m[2] || 0) * 60 + (+m[3] || 0)) * 60000);
      } else if (type === "afterdatetime") {
        const e = get(ex, "EndDateTime"); end = e instanceof Date ? e : new Date(String(e));
        if (isNaN(end) || end <= start) throw lab("EndDateTime must be a date after the start. This lab does not show the exact error text.");
      } else throw lab("Expiration Type is AfterDuration (with Duration) or AfterDateTime (with EndDateTime) in this lab. NoExpiration exists in Graph, but this lab does not simulate it.");
      ctx.t.elig.push({ Id: gid(), PrincipalId: pid, RoleDefinitionId: rid, DirectoryScopeId: "/", StartDateTime: start, EndDateTime: end, Justification: just });
      return reqOut();
    } });
  return { seed: seed0, ROLEDEFS };
})();
GRADER.HOOKS.push((ctx) => DEL.seed(ctx));
const auOf = (ctx, n) => ctx.t.aus.find((a) => a.DisplayName === n);
const auHas = (ctx, n, who) => { const a = auOf(ctx, n); const u = userOf(ctx, who); return !!a && !!u && a.members.includes(u.Id); };
const roleId = (n) => DEL.ROLEDEFS.find((r) => r[0] === n)[1];
const eligOf = (ctx, who, role) => { const u = userOf(ctx, who); return u ? ctx.t.elig.find((e) => e.PrincipalId === u.Id && e.RoleDefinitionId === roleId(role)) : null; };
const hoursOf = (e) => e && e.EndDateTime ? Math.round((e.EndDateTime - e.StartDateTime) / 36e5) : null;
const AUQ = (n) => "$au = Get-MgDirectoryAdministrativeUnit -Filter \"displayName eq '" + n + "'\"";
const UQ = (n) => "$u = Get-MgUser -UserId " + U(n);
const ADD_AU = "New-MgDirectoryAdministrativeUnitMemberByRef -AdministrativeUnitId $au.Id -OdataId \"https://graph.microsoft.com/v1.0/users/$($u.Id)\"";
const RQ = (n) => "$r = Get-MgRoleManagementDirectoryRoleDefinition -Filter \"displayName eq '" + n + "'\"";
const PARAMS = (just, exp) => "$params = @{ Action = 'AdminAssign'; PrincipalId = $u.Id; RoleDefinitionId = $r.Id; DirectoryScopeId = '/'; Justification = '" + just + "'; ScheduleInfo = @{ StartDateTime = Get-Date; Expiration = " + exp + " } }";
const ELIG = "New-MgRoleManagementDirectoryRoleEligibilityScheduleRequest -BodyParameter $params";
const STORY13 = "The previous admin gave out roles like sweets: Hesper still has Global Administrator because finance needed it once. Elowen wants two things. The Antwerp service desk should look after Antwerp people only, and nobody should hold a powerful role all day when they need it for an hour.";

MEMORIES.push(
{
  id: "adminunit", seq: 13, name: "Administrative units", tag: "FENCES", title: "A fence around a group of people",
  summary: "An administrative unit is a container for users (or groups and devices). A role given on the unit only works for the people inside it. Graph: New-MgDirectoryAdministrativeUnit, then add members one at a time.",
  setup: "auR",
  brief: {
    what: [
      STORY13,
      "An <b>administrative unit</b> (AU) is a fence. Put the Antwerp people inside, give the Antwerp service desk a role <b>on that unit</b>, and they can help Antwerp people only. Builds on Users and Groups: the members are the same Get-MgUser objects. Least privilege, by place instead of by power.",
      "<b>New-MgDirectoryAdministrativeUnit</b> creates one (scope <b>AdministrativeUnit.ReadWrite.All</b>). <b>New-MgDirectoryAdministrativeUnitMemberByRef</b> adds <b>one</b> member at a time: <b>-AdministrativeUnitId</b> is the unit's Id, and the member is a full Graph URL with the user's Id: <code>https://graph.microsoft.com/v1.0/users/&lt;Id&gt;</code>."
    ],
    daily: ["\"Antwerp wants its own service desk\"", "Giving a local IT person power over their office only", "Checking who sits inside a unit"],
    parts: [["Connect-MgGraph -Scopes AdministrativeUnit.ReadWrite.All", "the scope for units"], ["New-MgDirectoryAdministrativeUnit -BodyParameter @{ displayName = 'x' }", "create"], [AUQ("x"), "find it, keep it in $au"], [UQ("x"), "the person, keep in $u"], ["-OdataId \"https://graph.microsoft.com/v1.0/users/$($u.Id)\"", "the member, as a URL"], ["Get-MgDirectoryAdministrativeUnitMember -AdministrativeUnitId $au.Id", "who is inside"]],
    flow: [["Create", "New-...AdministrativeUnit"], ["Keep", "$au, $u"], ["Add", "...MemberByRef, one each"], ["Check", "...UnitMember"]],
    traps: [["Ids, not names", "-AdministrativeUnitId 'Antwerp office' fails. Look the unit up and pass $au.Id."], ["A URL, not a UPN", "The member is https://graph.microsoft.com/v1.0/users/ plus the Id, not the email address."], ["One at a time", "MemberByRef adds one member per call. Many people: ForEach-Object."]]
  },
  watch: [
    { code: "New-MgDirectoryAdministrativeUnit -BodyParameter @{ displayName = 'Antwerp office'; description = 'Staff based in Antwerp' }", say: "User.Read.All can read people, not build fences: 403." },
    { code: "Connect-MgGraph -Scopes AdministrativeUnit.ReadWrite.All -NoWelcome", say: "The scope made for administrative units." },
    { code: "New-MgDirectoryAdministrativeUnit -BodyParameter @{ displayName = 'Antwerp office'; description = 'Staff based in Antwerp' } | Select-Object DisplayName,Id", say: "An empty fence. The Id is what every next command wants." },
    { code: AUQ("Antwerp office") + "; " + UQ("ondine.shadewell"), say: "Keep the unit in $au and Ondine in $u. Look first, then change." },
    { code: ADD_AU, say: "One member, as a Graph URL with her Id. No output means it worked." },
    { code: "Get-MgDirectoryAdministrativeUnitMember -AdministrativeUnitId $au.Id | ForEach-Object { $_.AdditionalProperties.userPrincipalName }", say: "Members come back as directory objects. The name sits in AdditionalProperties." }
  ],
  trace: { ask: "Sign in with the scope that can create administrative units.", setup: "none", tpl: "Connect-MgGraph -Scopes [[AdministrativeUnit]].ReadWrite.All -NoWelcome", check: { fn: (ctx) => hasScope(ctx, "AdministrativeUnit.ReadWrite.All") }, wrong: "The scope is named after the thing you build." },
  traceHints: ["Not Directory: too wide.", "The thing is an administrative unit.", "Administrative____", "Answer: AdministrativeUnit"],
  recall: { ask: "Create an administrative unit 'Antwerp office' and put Ondine Shadewell and Sorrel Achterwyn in it (Antwerp's IT people).", setup: "auW", check: { fn: (ctx) => { const a = auOf(ctx, "Antwerp office"); return !!a && a.members.length === 2 && auHas(ctx, "Antwerp office", "ondine.shadewell") && auHas(ctx, "Antwerp office", "sorrel.achterwyn"); } }, wrong: "One unit called Antwerp office, with exactly those two people." },
  recallHints: ["Create it, then look it up into $au.", "For each person: $u = Get-MgUser, then MemberByRef with the URL.", "New-MgDirectoryAdministrativeUnit -BodyParameter @{ displayName = 'Antwerp office' }; " + AUQ("Antwerp office") + "; " + UQ("...") + "; " + ADD_AU, "New-MgDirectoryAdministrativeUnit -BodyParameter @{ displayName = 'Antwerp office' }; " + AUQ("Antwerp office") + "; " + UQ("ondine.shadewell") + "; " + ADD_AU + "; " + UQ("sorrel.achterwyn") + "; " + ADD_AU],
  real: ["Connect-MgGraph -Scopes AdministrativeUnit.Read.All", "Get-MgDirectoryAdministrativeUnit | Select-Object DisplayName,Description", "Read-only. Does your tenant use any fences yet?"],
  cheat: [["New-MgDirectoryAdministrativeUnit", "Create, with -BodyParameter @{ displayName = 'x' }"], [AUQ("x"), "Keep the unit"], ["New-MgDirectoryAdministrativeUnitMemberByRef", "Add one member"], ["-OdataId \"https://graph.microsoft.com/v1.0/users/$($u.Id)\"", "The member as a URL"], ["Get-MgDirectoryAdministrativeUnitMember -AdministrativeUnitId $au.Id", "Who is inside"]]
},
{
  id: "pimeligible", seq: 13, name: "PIM eligible roles", tag: "JUST IN TIME", title: "Eligible, not always on",
  summary: "Privileged Identity Management makes a role eligible: the person holds nothing until they activate it, with a reason, for a short time. In Graph: an eligibility schedule request with Action AdminAssign.",
  setup: "pimR",
  brief: {
    what: [
      "A <b>permanent</b> admin role is on all day, also when a phishing mail lands. With <b>PIM</b> the role is <b>eligible</b>: the person must <b>activate</b> it with a justification, and it switches off again by itself. Builds on Connect: your Graph session needs <b>RoleManagement.ReadWrite.Directory</b>, the scope Microsoft's PIM tutorial uses.",
      "Everything is an Id. <b>Get-MgRoleManagementDirectoryRoleDefinition -Filter \"displayName eq 'Helpdesk Administrator'\"</b> gives the role, Get-MgUser gives the person. Keep both: <code>$r</code> and <code>$u</code>.",
      "Then a <b>$params</b> hashtable: <b>Action = 'AdminAssign'</b>, PrincipalId, RoleDefinitionId, <b>DirectoryScopeId = '/'</b> (the whole tenant), a Justification, and <b>ScheduleInfo</b> with an Expiration: <code>AfterDuration</code> with <code>PT10H</code> (ten hours) or <code>AfterDateTime</code> with an EndDateTime. <b>AdminRemove</b> takes it away."
    ],
    daily: ["\"Lorcan needs Global Admin for the migration weekend\"", "Turning standing admin roles into eligible ones", "The yearly check: who is eligible for what?"],
    parts: [["Connect-MgGraph -Scopes RoleManagement.ReadWrite.Directory", "the PIM scope"], [RQ("Helpdesk Administrator"), "the role, in $r"], [UQ("x"), "the person, in $u"], ["$params = @{ Action = 'AdminAssign'; ... }", "the request"], ["Expiration = @{ Type = 'AfterDuration'; Duration = 'PT10H' }", "how long"], [ELIG, "send it"], ["Get-MgRoleManagementDirectoryRoleEligibilityScheduleInstance -Filter \"principalId eq '$($u.Id)'\"", "check it"]],
    flow: [["Find", "$r and $u"], ["Build", "$params"], ["Send", "...EligibilityScheduleRequest"], ["Check", "...ScheduleInstance"]],
    traps: [["Eligible is not active", "AdminAssign on the eligibility request makes nobody an admin yet. They activate it themselves (SelfActivate)."], ["Ids everywhere", "PrincipalId and RoleDefinitionId are GUIDs. A UPN or a role name is refused."], ["Duration format", "ISO 8601: PT10H is ten hours, P90D is ninety days. '10 hours' is not."]]
  },
  watch: [
    { code: RQ("Helpdesk Administrator"), say: "Graph is connected with User.Read.All only. Reading roles needs a RoleManagement scope: 403." },
    { code: "Connect-MgGraph -Scopes RoleManagement.ReadWrite.Directory -NoWelcome", say: "The scope from Microsoft's PIM tutorial." },
    { code: RQ("Helpdesk Administrator") + "; " + UQ("ondine.shadewell") + "; $r.Id", say: "The role's Id is the same in every tenant. Ondine is in $u." },
    { code: PARAMS("Antwerp service desk", "@{ Type = 'AfterDuration'; Duration = 'PT10H' }"), say: "The request as a hashtable. Nothing has happened yet." },
    { code: ELIG + " | Format-List Id,Status,Action,Justification", say: "Provisioned: Ondine is eligible for ten hours. She is not an admin until she activates it." },
    { code: "Get-MgRoleManagementDirectoryRoleEligibilityScheduleInstance -Filter \"principalId eq '$($u.Id)'\" | Select-Object RoleDefinitionId,StartDateTime,EndDateTime", say: "Check after you change: one eligible role, and it ends by itself." }
  ],
  trace: { ask: "Fill in the action that makes Cassian Drake eligible for Helpdesk Administrator.", setup: "pimW", tpl: RQ("Helpdesk Administrator") + "; " + UQ("cassian.drake") + "; $params = @{ Action = '[[AdminAssign]]'; PrincipalId = $u.Id; RoleDefinitionId = $r.Id; DirectoryScopeId = '/'; Justification = 'Service desk'; ScheduleInfo = @{ StartDateTime = Get-Date; Expiration = @{ Type = 'AfterDuration'; Duration = 'PT10H' } } }; " + ELIG, check: { fn: (ctx) => !!eligOf(ctx, "cassian.drake", "Helpdesk Administrator") }, wrong: "An admin gives the role: Admin + the verb." },
  traceHints: ["You are the admin doing it.", "Admin plus a verb: give.", "Admin______", "Answer: AdminAssign"],
  recall: { ask: "Make Cassian Drake eligible (not active) for Helpdesk Administrator, for the whole tenant, for 10 hours, with the justification 'Service desk cover'.", setup: "pimW", check: { fn: (ctx) => { const e = eligOf(ctx, "cassian.drake", "Helpdesk Administrator"); return !!e && hoursOf(e) === 10 && e.Justification === "Service desk cover"; } }, wrong: "Cassian, Helpdesk Administrator, scope '/', ten hours, and that exact justification." },
  recallHints: ["Find the role into $r and Cassian into $u.", "Build $params with Action AdminAssign and an AfterDuration of PT10H.", RQ("Helpdesk Administrator") + "; " + UQ("cassian.drake") + "; " + PARAMS("...", "@{ Type = 'AfterDuration'; Duration = '...' }") + "; " + ELIG, RQ("Helpdesk Administrator") + "; " + UQ("cassian.drake") + "; " + PARAMS("Service desk cover", "@{ Type = 'AfterDuration'; Duration = 'PT10H' }") + "; " + ELIG],
  real: ["Connect-MgGraph -Scopes RoleManagement.Read.Directory", "Get-MgRoleManagementDirectoryRoleEligibilityScheduleInstance | Select-Object PrincipalId,RoleDefinitionId,EndDateTime", "Read-only. Who at work is eligible, and does it ever end?"],
  cheat: [["Connect-MgGraph -Scopes RoleManagement.ReadWrite.Directory", "PIM scope"], [RQ("x"), "The role"], ["Action = 'AdminAssign'", "Make eligible"], ["Action = 'AdminRemove'", "Take it away"], ["Expiration = @{ Type = 'AfterDuration'; Duration = 'PT10H' }", "Ten hours"], [ELIG, "Send the request"]]
}
);

Object.assign(DRILLS, {
  adminunit: [
    { q: "Which administrative units exist? DisplayName and Description.", setup: "auW", out: "Get-MgDirectoryAdministrativeUnit | Select-Object DisplayName,Description", hint: "Get-MgDirectoryAdministrativeUnit | Select-Object ..." },
    { q: "Who is inside Bruges office? Only their UPNs.", setup: "auW", fn: (ctx, res) => { const want = auOf(ctx, "Bruges office").members.map((id) => ctx.t.users.find((u) => u.Id === id).UserPrincipalName).sort().join(); return res.out.length > 0 && res.out.slice().sort().join() === want; }, sol: [AUQ("Bruges office") + "; Get-MgDirectoryAdministrativeUnitMember -AdministrativeUnitId $au.Id | ForEach-Object { $_.AdditionalProperties.userPrincipalName }"], hint: "The UPN sits in .AdditionalProperties.userPrincipalName" },
    { q: "Create an administrative unit 'Ghent office' with the description 'Staff based in Ghent'.", setup: "auW", fn: (ctx) => { const a = auOf(ctx, "Ghent office"); return !!a && a.Description === "Staff based in Ghent"; }, sol: ["New-MgDirectoryAdministrativeUnit -BodyParameter @{ displayName = 'Ghent office'; description = 'Staff based in Ghent' }"], hint: "-BodyParameter @{ displayName = ...; description = ... }" },
    { q: "Lorcan Ivers works in Bruges. Add him to Bruges office.", setup: "auW", fn: (ctx) => auHas(ctx, "Bruges office", "lorcan.ivers"), sol: [AUQ("Bruges office") + "; " + UQ("lorcan.ivers") + "; " + ADD_AU], hint: "$au, $u, then MemberByRef with the URL" },
    { q: "Fill 'Antwerp office' (it exists, empty) with every enabled member colleague whose City is Antwerp.", setup: "auW", pre: ["New-MgDirectoryAdministrativeUnit -BodyParameter @{ displayName = 'Antwerp office' }"], fn: (ctx) => { const a = auOf(ctx, "Antwerp office"); const want = ctx.t.users.filter((u) => u.UserType === "Member" && u.City === "Antwerp" && u.AccountEnabled).map((u) => u.Id).sort().join(); return !!a && a.members.slice().sort().join() === want; }, sol: [AUQ("Antwerp office") + "; Get-MgUser -All -Filter \"city eq 'Antwerp'\" -Property Id,AccountEnabled,UserType | Where-Object { $_.AccountEnabled -and $_.UserType -eq 'Member' } | ForEach-Object { New-MgDirectoryAdministrativeUnitMemberByRef -AdministrativeUnitId $au.Id -OdataId \"https://graph.microsoft.com/v1.0/users/$($_.Id)\" }"], hint: "Graph filters on city, Where-Object keeps the enabled ones, ForEach-Object adds one each." }
  ],
  pimeligible: [
    { q: "What is the Id of the Privileged Role Administrator role? Only the GUID.", setup: "pimW", fn: (ctx, res) => res.out.length === 1 && res.out[0] === roleId("Privileged Role Administrator"), sol: ["(Get-MgRoleManagementDirectoryRoleDefinition -Filter \"displayName eq 'Privileged Role Administrator'\").Id"], hint: "( ... ).Id" },
    { q: "List every eligible role assignment: PrincipalId, RoleDefinitionId and EndDateTime.", setup: "pimW", out: "Get-MgRoleManagementDirectoryRoleEligibilityScheduleInstance | Select-Object PrincipalId,RoleDefinitionId,EndDateTime", hint: "...EligibilityScheduleInstance | Select-Object ..." },
    { q: "Make Ondine Shadewell eligible for Helpdesk Administrator for 8 hours, justification 'Antwerp service desk'.", setup: "pimW", fn: (ctx) => { const e = eligOf(ctx, "ondine.shadewell", "Helpdesk Administrator"); return !!e && hoursOf(e) === 8 && e.Justification === "Antwerp service desk"; }, sol: [RQ("Helpdesk Administrator") + "; " + UQ("ondine.shadewell") + "; " + PARAMS("Antwerp service desk", "@{ Type = 'AfterDuration'; Duration = 'PT8H' }") + "; " + ELIG], hint: "Duration = 'PT8H'" },
    { q: "Hesper Reedmire may need User Administrator during the HR system move. Make her eligible until 31 December 2026, justification 'HR system move'.", setup: "pimW", fn: (ctx) => { const e = eligOf(ctx, "hesper.reedmire", "User Administrator"); return !!e && e.EndDateTime.getFullYear() === 2026 && e.EndDateTime.getMonth() === 11 && e.EndDateTime.getDate() === 31; }, sol: [RQ("User Administrator") + "; " + UQ("hesper.reedmire") + "; " + PARAMS("HR system move", "@{ Type = 'AfterDateTime'; EndDateTime = [datetime]'2026-12-31' }") + "; " + ELIG], hint: "Type = 'AfterDateTime'; EndDateTime = [datetime]'2026-12-31'" },
    { q: "The migration is done. Take away Lorcan Ivers' eligible Global Administrator role.", setup: "pimW", fn: (ctx) => !eligOf(ctx, "lorcan.ivers", "Global Administrator"), sol: [RQ("Global Administrator") + "; " + UQ("lorcan.ivers") + "; $params = @{ Action = 'AdminRemove'; PrincipalId = $u.Id; RoleDefinitionId = $r.Id; DirectoryScopeId = '/' }; " + ELIG], hint: "Action = 'AdminRemove', no ScheduleInfo needed." }
  ]
});
ERR_HELP.unshift(
  [/AdministrativeUnit\w*_\w+: Insufficient privileges/i, "Insufficient privileges: administrative units need the AdministrativeUnit.ReadWrite.All scope. Connect-MgGraph again with it."],
  [/RoleManagement\w*_\w+: Insufficient privileges/i, "Insufficient privileges: PIM and role definitions need a RoleManagement scope. Connect-MgGraph -Scopes RoleManagement.ReadWrite.Directory."]
);
if (typeof HELP !== "undefined") Object.assign(HELP, {
  "New-MgDirectoryAdministrativeUnit": { syn: "Creates an administrative unit.", ex: [["Create", "New-MgDirectoryAdministrativeUnit -BodyParameter @{ displayName = 'Antwerp office' }", "Needs AdministrativeUnit.ReadWrite.All."]] },
  "New-MgDirectoryAdministrativeUnitMemberByRef": { syn: "Adds a member (user, group or device) to an administrative unit. One member at a time.", ex: [["Add a user", ADD_AU, "The member is a Graph URL with the object Id."]] },
  "Get-MgDirectoryAdministrativeUnitMember": { syn: "Lists the members of an administrative unit.", ex: [["Members", "Get-MgDirectoryAdministrativeUnitMember -AdministrativeUnitId $au.Id", "Names sit in .AdditionalProperties."]] },
  "Get-MgRoleManagementDirectoryRoleDefinition": { syn: "Gets Microsoft Entra role definitions.", ex: [["One role", RQ("Helpdesk Administrator"), "Keep it in $r and use $r.Id."]] },
  "New-MgRoleManagementDirectoryRoleEligibilityScheduleRequest": { syn: "Creates a request to make a role eligible (PIM), or to remove it.", ex: [["Eligible for ten hours", ELIG, "$params holds Action, PrincipalId, RoleDefinitionId, DirectoryScopeId, Justification and ScheduleInfo."]] },
  "Get-MgRoleManagementDirectoryRoleEligibilityScheduleInstance": { syn: "Lists eligible role assignments (PIM).", ex: [["One person", "Get-MgRoleManagementDirectoryRoleEligibilityScheduleInstance -Filter \"principalId eq '$($u.Id)'\"", "Filter on principalId or roleDefinitionId."]] }
});
