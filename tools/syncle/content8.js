SEQUENCES.push({ id: 11, name: "Teams", short: "TEAMS", open: true, blurb: "Teams is its own door: who owns what, new teams done right, private channels, and the teams nobody looks after any more." });
const TW_SCOPES = ["User.ReadWrite.All", "Group.ReadWrite.All"];
Object.assign(GRADER.SETUPS, {
  teamsOff: { scopes: ["User.Read.All", "Group.Read.All"], exo: false, teams: "seed" },
  teamsR: { scopes: ["User.Read.All", "Group.Read.All"], exo: false, teams: "on" },
  teamsW: { scopes: TW_SCOPES, exo: false, teams: "on" },
  teamsCap: { scopes: TW_SCOPES, exo: false, teams: "on", cwd: "/Users/veyra/Desktop" }
});
const TQ = (n) => "$t = Get-Team -DisplayName '" + n + "'";
const ADMIN_UPN = "veyra@" + DOMAIN;
const teamOf = (ctx, n) => (ctx.t.teams || []).find((x) => x.DisplayName === n);
const rosterOf = (ctx, n) => { const t = teamOf(ctx, n); return t ? t.roster : []; };
const roleOf = (ctx, n, nick) => { const x = rosterOf(ctx, n).find((r) => r.upn === U(nick)); return x ? x.role : null; };
const ownersOf = (ctx, n) => rosterOf(ctx, n).filter((r) => r.role === "owner").map((r) => r.upn).sort();
const chanOf = (ctx, n, c) => { const t = teamOf(ctx, n); return t ? t.channels.find((x) => x.DisplayName === c) : null; };
const namesOut = (res) => res.out.map((o) => typeof o === "string" ? o : o && o.DisplayName).filter((x) => typeof x === "string").sort();
const deptUsers = (ctx, d, extra) => ctx.t.users.filter((u) => u.UserType === "Member" && u.Department === d && (!extra || extra(u)));
const noEnabledOwner = (ctx, archived) => ctx.t.teams.filter((tm) => tm.Archived === archived && !tm.roster.some((r) => r.role === "owner" && ctx.t.users.some((u) => u.UserPrincipalName === r.upn && u.AccountEnabled))).map((t) => t.DisplayName).sort();
const STORY11 = "Halvard has nine teams. Some were made in a hurry, one has nobody in charge, and the summer party ended months ago. Teams sits on top of everything you know: every team is a Microsoft 365 group, with a mailbox and a SharePoint site behind it.";

MEMORIES.push(
{
  id: "teamsconnect", seq: 11, name: "Connect-MicrosoftTeams", tag: "THIRD DOOR", title: "Teams has its own door, and every team is a group",
  summary: "Teams commands live in the MicrosoftTeams module and need their own sign-in. A team is a Microsoft 365 group with Teams switched on; its GroupId is the group's Id.",
  setup: "teamsOff",
  brief: {
    what: [
      STORY11,
      "Like Exchange, Teams is a <b>separate door</b>: the <b>MicrosoftTeams</b> module and <b>Connect-MicrosoftTeams</b>. Your Graph session does not count. Without it every Teams command answers 'You must call the Connect-MicrosoftTeams cmdlet'.",
      "<b>Get-Team</b> lists teams. Almost every other Teams command wants <b>-GroupId</b>, the team's GUID, and refuses the name. The habit: <code>$t = Get-Team -DisplayName 'Sales Hub'</code>, then <code>-GroupId $t.GroupId</code>. That GUID is the same Id Get-MgGroup shows: a team is a Microsoft 365 group with Teams on top."
    ],
    daily: ["\"Which teams do we even have?\"", "\"Is this team public?\"", "Finding the GroupId for every other Teams command"],
    parts: [["Connect-MicrosoftTeams", "sign in to Teams"], ["Get-Team", "every team"], ["Get-Team -DisplayName 'Sales Hub'", "one team by its exact name"], ["Get-Team -Visibility Public", "only public teams"], ["Get-Team -User x@y", "teams one person is in"], ["$t.GroupId", "the GUID the other commands need"]],
    flow: [["Connect", "Connect-MicrosoftTeams"], ["Find", "Get-Team -DisplayName"], ["Keep", "$t = ..."], ["Use", "-GroupId $t.GroupId"]],
    traps: [["Graph is not enough", "Connect-MgGraph does not sign you in to Teams. Three doors: Graph, Exchange, Teams."], ["Names are not ids", "-GroupId 'Sales Hub' fails. Look the team up first and pass $t.GroupId."], ["Exact names", "-DisplayName matches the whole name, not part of it. 'Sales' does not find 'Sales Hub'."]]
  },
  watch: [
    { code: "Get-Team", say: "Graph is connected, Teams is not. Same message Exchange gives you: third door." },
    { code: "Connect-MicrosoftTeams", say: "One sign-in. It answers with the account and tenant you landed in." },
    { code: "Get-Team | Select-Object DisplayName,Visibility,Archived", say: "Nine teams. Two public, one archived." },
    { code: TQ("Sales Hub") + "; $t.GroupId", say: "Keep the team in $t. Every Teams command after this wants this GUID." },
    { code: "Get-MgGroup -Filter \"displayName eq 'Sales Hub'\" | Select-Object DisplayName,Id,GroupTypes", say: "Same Id in Graph. A team is a Unified group with Teams switched on." }
  ],
  trace: { ask: "Open the Teams door, then count the teams.", tpl: "Connect-[[MicrosoftTeams]]; (Get-Team).Count", check: { fn: (ctx) => ctx.teams === true }, wrong: "The module is called MicrosoftTeams." },
  traceHints: ["Not Graph, not Exchange.", "The product name, as one word, with the company in front.", "Microsoft_____", "Answer: MicrosoftTeams"],
  recall: { ask: "Which teams are public? Show DisplayName and Visibility only.", setup: "teamsR", check: { out: "Get-Team -Visibility Public | Select-Object DisplayName,Visibility" }, wrong: "Only the public teams, and only those two columns." },
  recallHints: ["Get-Team can filter on visibility itself.", "-Visibility Public", "Get-Team -Visibility Public | Select-Object ...", "Get-Team -Visibility Public | Select-Object DisplayName,Visibility"],
  real: ["Install-Module MicrosoftTeams -Scope CurrentUser (once per machine)", "Connect-MicrosoftTeams", "Get-Team | Select-Object DisplayName,Visibility,Archived"],
  cheat: [["Connect-MicrosoftTeams", "The Teams door"], ["$t = Get-Team -DisplayName 'x'", "Keep a team"], ["-GroupId $t.GroupId", "What every Teams command wants"], ["Get-Team -User x@y", "Teams of one person"]]
},
{
  id: "teamuser", seq: 11, name: "Get-TeamUser", tag: "OWNERS & MEMBERS", title: "Owners run the team. Members live in it.",
  summary: "Get-TeamUser shows owners, members and guests. Add-TeamUser adds or promotes, Remove-TeamUser removes or demotes. A team can never lose its last owner.",
  setup: "teamsW",
  brief: {
    what: [
      "Every person in a team has a <b>role</b>: <b>owner</b> (can manage the team, add people, change settings), <b>member</b> or <b>guest</b> (someone from outside). Get-TeamUser prints the role in lower case.",
      "<b>Add-TeamUser</b> adds someone as a member, or with <b>-Role Owner</b> as an owner. On someone who is already a member, -Role Owner <b>promotes</b> them. <b>Remove-TeamUser</b> takes them out of the team; with <b>-Role Owner</b> it only takes the owner role away and they stay a member.",
      "The rule Teams enforces: the <b>last owner can't be removed</b>. Add the new owner first, then remove the old one. Two owners per team is the healthy minimum: holidays and leavers happen."
    ],
    daily: ["\"Can you add Tamsin to Sales Hub?\"", "\"Garrion is leaving, who takes over his team?\"", "\"Who can I ask to get into this team?\""],
    parts: [["Get-TeamUser -GroupId $t.GroupId", "everyone, with their role"], ["-Role Owner", "only the owners"], ["Add-TeamUser -GroupId $t.GroupId -User x@y", "add as member"], ["Add-TeamUser ... -Role Owner", "add or promote to owner"], ["Remove-TeamUser ... -Role Owner", "demote, stays a member"], ["Remove-TeamUser -GroupId $t.GroupId -User x@y", "out of the team"]],
    flow: [["Look", "Get-TeamUser"], ["Add", "Add-TeamUser"], ["Promote", "-Role Owner"], ["Hand over", "new owner first, old one out"]],
    traps: [["Last owner", "Remove-TeamUser refuses the only owner. Promote someone else first."], ["-Role on Remove", "Remove-TeamUser -Role Owner keeps the person in the team. Without -Role they are gone."], ["UPN, not name", "-User wants the UPN (or the Id), not 'Elara Wynn'."]]
  },
  watch: [
    { code: TQ("Sales Hub") + "; Get-TeamUser -GroupId $t.GroupId", say: "One owner, seven members, one guest from a partner company." },
    { code: "Get-TeamUser -GroupId $t.GroupId -Role Owner", say: "Only Garrion. If he leaves, nobody can manage this team." },
    { code: "Add-TeamUser -GroupId $t.GroupId -User " + U("elara.wynn") + " -Role Owner", say: "Elara was a member. -Role Owner promotes her. No output means it worked." },
    { code: "Add-TeamUser -GroupId $t.GroupId -User " + U("tamsin.rookwood"), say: "No -Role: a plain member. She is also in the group in Graph now." },
    { code: "Remove-TeamUser -GroupId $t.GroupId -User " + U("elara.wynn") + " -Role Owner", say: "-Role Owner on Remove only takes the role away. Elara stays a member." },
    { code: "Remove-TeamUser -GroupId $t.GroupId -User " + U("garrion.penhale"), say: "Refused. Garrion is the only owner again, and a team can't lose its last owner." }
  ],
  trace: { ask: "Make Cassian Drake an owner of IT Ops.", tpl: TQ("IT Ops") + "; Add-TeamUser -GroupId $t.GroupId -User " + U("cassian.drake") + " -Role [[Owner]]", check: { fn: (ctx) => roleOf(ctx, "IT Ops", "cassian.drake") === "owner" }, wrong: "The role that can manage the team." },
  traceHints: ["Not Member.", "The person who runs the team.", "O____", "Answer: Owner"],
  recall: { ask: "Sales Hub has one owner. Make Elara Wynn a second owner.", setup: "teamsW", check: { fn: (ctx) => roleOf(ctx, "Sales Hub", "elara.wynn") === "owner" && roleOf(ctx, "Sales Hub", "garrion.penhale") === "owner" }, wrong: "Both Garrion and Elara must be owners afterwards." },
  recallHints: ["Find the team first and keep it in $t.", "Add-TeamUser promotes an existing member with -Role Owner.", TQ("Sales Hub") + "; Add-TeamUser -GroupId $t.GroupId -User ... -Role Owner", TQ("Sales Hub") + "; Add-TeamUser -GroupId $t.GroupId -User " + U("elara.wynn") + " -Role Owner"],
  real: ["$t = Get-Team -DisplayName '<a team you own>'", "Get-TeamUser -GroupId $t.GroupId -Role Owner", "If that shows only one name, you found your first task for Monday."],
  cheat: [["Get-TeamUser -GroupId $t.GroupId -Role Owner", "The owners"], ["Add-TeamUser -GroupId $t.GroupId -User x -Role Owner", "Add or promote"], ["Remove-TeamUser -GroupId $t.GroupId -User x -Role Owner", "Demote only"], ["Remove-TeamUser -GroupId $t.GroupId -User x", "Out of the team"]]
},
{
  id: "newteam", seq: 11, name: "New-Team", tag: "CREATE", title: "One command, four things: group, team, mailbox, site",
  summary: "New-Team creates a Microsoft 365 group, the team, a group mailbox and a SharePoint site. Say who owns it with -Owner, or it will be you.",
  setup: "teamsW",
  brief: {
    what: [
      "<b>New-Team -DisplayName 'x'</b> builds a lot at once: a Microsoft 365 group, the team on top of it, a group mailbox and a SharePoint site for the files. Visibility is <b>Private</b> unless you say <b>-Visibility Public</b>.",
      "<b>-Owner</b> sets the first owner. Leave it out and <b>you</b> become the owner: admins who script teams without -Owner end up owning dozens of teams they never open. If that happened, add the real owner first, then remove yourself.",
      "<b>-MailNickName</b> is the group's mail alias. It must be unique in the whole tenant, so 'saleshub' or 'itops' are already taken. Leave it out and Teams makes one from the name plus a few digits."
    ],
    daily: ["\"We need a team for the new depot\"", "Project teams for every new customer", "Rebuilding a team that was made by hand"],
    parts: [["New-Team -DisplayName 'x' -Visibility Private", "create"], ["-Owner x@y", "the first owner (otherwise you)"], ["-MailNickName x", "the unique alias"], ["Set-Team -GroupId $t.GroupId -DisplayName 'y'", "rename later"], ["Get-MgUser -Filter ... | ForEach-Object { Add-TeamUser ... }", "fill it from Graph"]],
    flow: [["Create", "New-Team -Owner"], ["Find", "$t = Get-Team"], ["Fill", "Graph picks, Add-TeamUser adds"], ["Check", "Get-TeamUser"]],
    traps: [["You as owner", "No -Owner means the account running the script owns the team."], ["Taken alias", "'Another object with the same value for property mailNickname already exists': pick another -MailNickName."], ["Filter in Graph", "City and Department are not in Get-MgUser's default output, so filter with -Filter on the server instead of Where-Object afterwards."]]
  },
  watch: [
    { code: "New-Team -DisplayName 'Zeebrugge Depot' -Description 'Depot crew and shift handover' -Visibility Private -MailNickName zeebruggedepot -Owner " + U("caius.merrowind"), say: "One command: group, team, mailbox and SharePoint site. Caius owns it." },
    { code: TQ("Zeebrugge Depot") + "; Get-TeamUser -GroupId $t.GroupId", say: "Only Caius so far. Without -Owner, this line would show you." },
    { code: "Get-MgUser -All -Filter \"department eq 'Operations' and city eq 'Ghent'\" | ForEach-Object { Add-TeamUser -GroupId $t.GroupId -User $_.UserPrincipalName }", say: "Graph picks the people, Teams adds them. Caius is already owner and stays owner." },
    { code: "(Get-TeamUser -GroupId $t.GroupId).Count", say: "Caius plus five colleagues from the Ghent operations floor." },
    { code: "New-Team -DisplayName 'Sales' -MailNickName saleshub", say: "Refused: saleshub belongs to Sales Hub. Aliases are unique in the tenant." }
  ],
  trace: { ask: "Create Legal Desk with Isolde Fenn as owner, not you.", tpl: "New-Team -DisplayName 'Legal Desk' -Visibility Private -[[Owner]] " + U("isolde.fenn"), check: { fn: (ctx) => { const o = ownersOf(ctx, "Legal Desk"); return o.length === 1 && o[0] === U("isolde.fenn"); } }, wrong: "The parameter that names who runs the team." },
  traceHints: ["Who runs the team?", "Same word as the role.", "-O____", "Answer: Owner"],
  recall: { ask: "Create a private team 'Legal Desk' owned by Isolde Fenn (not you), and add every other Legal colleague as a member.", setup: "teamsW", check: { fn: (ctx) => { const t = teamOf(ctx, "Legal Desk"); if (!t || t.Visibility !== "Private") return false; const o = ownersOf(ctx, "Legal Desk"); if (o.length !== 1 || o[0] !== U("isolde.fenn")) return false; if (t.roster.some((r) => r.upn === ADMIN_UPN)) return false; return deptUsers(ctx, "Legal").every((u) => t.roster.some((r) => r.upn === u.UserPrincipalName)); } }, wrong: "Private, Isolde the only owner, you not in it, and every Legal user inside." },
  recallHints: ["New-Team with -Visibility Private and -Owner.", "Then $t = Get-Team -DisplayName 'Legal Desk'.", "Get-MgUser -All -Filter \"department eq 'Legal'\" | ForEach-Object { Add-TeamUser -GroupId $t.GroupId -User $_.UserPrincipalName }", "New-Team -DisplayName 'Legal Desk' -Visibility Private -Owner " + U("isolde.fenn") + "; " + TQ("Legal Desk") + "; Get-MgUser -All -Filter \"department eq 'Legal'\" | ForEach-Object { Add-TeamUser -GroupId $t.GroupId -User $_.UserPrincipalName }"],
  real: ["Get-Team | Where-Object { Get-TeamUser -GroupId $_.GroupId -Role Owner | Where-Object User -eq '<your UPN>' } | Select-Object DisplayName", "Every team in that list is one you own. Are you supposed to?"],
  cheat: [["New-Team -DisplayName 'x' -Visibility Private -Owner y", "Create with a real owner"], ["-MailNickName x", "Unique alias"], ["Set-Team -GroupId $t.GroupId -DisplayName 'y' -Visibility Public", "Change later"]]
},
{
  id: "teamchannel", seq: 11, name: "New-TeamChannel", tag: "CHANNELS", title: "Standard, private, shared: who sees what",
  summary: "Standard channels are open to the whole team. Private and shared channels have their own members and owner, and only take people who are already in the team (private).",
  setup: "teamsW",
  brief: {
    what: [
      "<b>Get-TeamChannel</b> lists a team's channels. <b>General</b> is always there and can't be deleted.",
      "<b>New-TeamChannel</b> makes a <b>Standard</b> channel by default: everyone in the team sees it. <b>-MembershipType Private</b> makes a channel only the people you add can see, with its own <b>-Owner</b>. <b>Shared</b> works the same way but can include people from other teams.",
      "<b>Add-TeamChannelUser</b> adds someone to a private or shared channel. For a private channel they must already be <b>in the team</b>: team first, then channel. Standard channels have no members of their own, so you can't add anyone to them."
    ],
    daily: ["\"Can we have a channel just for the managers?\"", "\"Why can't Hesper see the Security channel?\"", "Cleaning up channels nobody uses"],
    parts: [["Get-TeamChannel -GroupId $t.GroupId", "all channels"], ["-MembershipType Private", "only private ones"], ["New-TeamChannel -GroupId $t.GroupId -DisplayName 'x'", "standard channel"], ["New-TeamChannel ... -MembershipType Private -Owner x@y", "private channel"], ["Add-TeamChannelUser -GroupId $t.GroupId -DisplayName 'x' -User y", "into a private channel"], ["Get-TeamChannelUser -GroupId $t.GroupId -DisplayName 'x'", "who is in it"]],
    flow: [["Team", "Add-TeamUser first"], ["Channel", "New-TeamChannel -Private"], ["People", "Add-TeamChannelUser"], ["Check", "Get-TeamChannelUser"]],
    traps: [["Not in the team", "Add-TeamChannelUser on a private channel refuses anyone who isn't a team member yet."], ["Standard has no members", "Adding someone to a standard channel fails: they get it by being in the team."], ["Forbidden characters", "~ # % & * { } + / \\ : < > ? | ' \" are not allowed in channel names."]]
  },
  watch: [
    { code: TQ("IT Ops") + "; Get-TeamChannel -GroupId $t.GroupId", say: "General, Changes, On-call. All standard: everyone in IT Ops sees them." },
    { code: "New-TeamChannel -GroupId $t.GroupId -DisplayName 'Patching' -Description 'Monthly patch night'", say: "Standard by default." },
    { code: "New-TeamChannel -GroupId $t.GroupId -DisplayName 'Security' -MembershipType Private -Owner " + U("elowen.thistle"), say: "Private, with Elowen as its owner. She is already in IT Ops, which is required." },
    { code: "Add-TeamChannelUser -GroupId $t.GroupId -DisplayName 'Security' -User " + U("cassian.drake"), say: "Cassian is in the team, so he can join the private channel." },
    { code: "Add-TeamChannelUser -GroupId $t.GroupId -DisplayName 'Security' -User " + U("hesper.reedmire"), say: "Refused: Hesper isn't in IT Ops. Team first, then channel." },
    { code: "Get-TeamChannelUser -GroupId $t.GroupId -DisplayName 'Security'", say: "Two people can see Security. The rest of IT Ops doesn't even see it exists." }
  ],
  trace: { ask: "Make the Security channel in IT Ops private.", tpl: TQ("IT Ops") + "; New-TeamChannel -GroupId $t.GroupId -DisplayName 'Security' -MembershipType [[Private]] -Owner " + U("elowen.thistle"), check: { fn: (ctx) => { const c = chanOf(ctx, "IT Ops", "Security"); return !!c && c.MembershipType === "Private"; } }, wrong: "Only the people you add can see it." },
  traceHints: ["Not Standard.", "Not Shared either.", "P______", "Answer: Private"],
  recall: { ask: "In IT Ops, create a private channel 'Security' owned by Elowen Thistle, then add Cassian Drake and Ondine Shadewell to it.", setup: "teamsW", check: { fn: (ctx) => { const c = chanOf(ctx, "IT Ops", "Security"); if (!c || c.MembershipType !== "Private") return false; const has = (n, r) => c.users.some((x) => x.upn === U(n) && (!r || x.role === r)); return has("elowen.thistle", "owner") && has("cassian.drake") && has("ondine.shadewell"); } }, wrong: "A private Security channel, Elowen owner, Cassian and Ondine in it." },
  recallHints: ["New-TeamChannel with -MembershipType Private and -Owner.", "Then Add-TeamChannelUser, once per person.", TQ("IT Ops") + "; New-TeamChannel -GroupId $t.GroupId -DisplayName 'Security' -MembershipType Private -Owner ...; Add-TeamChannelUser -GroupId $t.GroupId -DisplayName 'Security' -User ...", TQ("IT Ops") + "; New-TeamChannel -GroupId $t.GroupId -DisplayName 'Security' -MembershipType Private -Owner " + U("elowen.thistle") + "; Add-TeamChannelUser -GroupId $t.GroupId -DisplayName 'Security' -User " + U("cassian.drake") + "; Add-TeamChannelUser -GroupId $t.GroupId -DisplayName 'Security' -User " + U("ondine.shadewell")],
  real: ["$t = Get-Team -DisplayName '<a team you own>'", "Get-TeamChannel -GroupId $t.GroupId -MembershipType Private", "Then Get-TeamChannelUser on each: who can see what?"],
  cheat: [["Get-TeamChannel -GroupId $t.GroupId", "Channels"], ["New-TeamChannel -GroupId $t.GroupId -DisplayName 'x' -MembershipType Private -Owner y", "Private channel"], ["Add-TeamChannelUser -GroupId $t.GroupId -DisplayName 'x' -User y", "Into a private channel"], ["Remove-TeamChannel -GroupId $t.GroupId -DisplayName 'x'", "Delete a channel"]]
},
{
  id: "teamhygiene", seq: 11, name: "Ownerless", tag: "LIFECYCLE", title: "Teams outlive the people who made them",
  summary: "Find teams with no owner, or only disabled owners, and give them a living owner. Archive the finished ones. Archiving is reversible and read-only: nothing is deleted.",
  setup: "teamsW",
  brief: {
    what: [
      "People leave, teams stay. A team whose only owner left has <b>nobody</b> who can add people, approve guests or clean it up. A disabled owner still shows up in Get-TeamUser, so count owners <b>and</b> check their account with Get-MgUser.",
      "The audit pattern: loop over <b>Get-Team</b>, ask <b>Get-TeamUser -Role Owner</b> per team, and keep the teams where that list is empty or every owner is disabled. A calculated property gives you an Owners column for a report.",
      "Finished teams don't need deleting. <b>Set-TeamArchivedState -Archived:$true</b> makes the team read-only and keeps every message and file; add <b>-SetSpoSiteReadOnlyForMembers:$true</b> to freeze the files for members too. <b>-Archived:$false</b> brings it back."
    ],
    daily: ["Quarterly governance check", "\"Fenna left, what did she own?\"", "Cleaning up event and project teams"],
    parts: [["Get-Team | Where-Object { -not (Get-TeamUser -GroupId $_.GroupId -Role Owner) }", "no owner at all"], ["@{n='Owners';e={(Get-TeamUser -GroupId $_.GroupId -Role Owner).Count}}", "owner count as a column"], ["Get-MgUser -UserId $o.User -Property AccountEnabled", "is that owner still here?"], ["Set-TeamArchivedState -GroupId $t.GroupId -Archived:$true", "archive"], ["Get-Team -Archived $true", "what is archived"]],
    flow: [["List", "Get-Team"], ["Owners", "Get-TeamUser -Role Owner"], ["Alive?", "Get-MgUser AccountEnabled"], ["Fix", "new owner or archive"]],
    traps: [["Disabled is not gone", "A disabled owner still counts as an owner. Check AccountEnabled in Graph."], ["Archive, don't delete", "Deleting a team deletes its group, mailbox and files. Archiving is reversible."], ["Boolean, not switch", "-Archived wants a value: -Archived:$true or -Archived $true."]]
  },
  watch: [
    { code: "Get-Team | ForEach-Object { [pscustomobject]@{ Team = $_.DisplayName; Owners = (Get-TeamUser -GroupId $_.GroupId -Role Owner).Count } }", say: "Bruges Office: 0. Nobody can manage it." },
    { code: TQ("Finance Close") + "; Get-TeamUser -GroupId $t.GroupId -Role Owner | ForEach-Object { Get-MgUser -UserId $_.User -Property DisplayName,AccountEnabled } | Select-Object DisplayName,AccountEnabled", say: "One owner, but Fenna's account is disabled. Ownerless in practice." },
    { code: "Get-Team -DisplayName 'Summer Party 2025' | Set-TeamArchivedState -Archived:$true -SetSpoSiteReadOnlyForMembers:$true", say: "Archived: messages and files kept, everything read-only. Reversible." },
    { code: "Get-Team -Archived $true | Select-Object DisplayName", say: "Two archived teams now." }
  ],
  trace: { ask: "Archive Summer Party 2025.", tpl: "Get-Team -DisplayName 'Summer Party 2025' | Set-TeamArchivedState -Archived:[[$true]]", check: { fn: (ctx) => { const t = teamOf(ctx, "Summer Party 2025"); return !!t && t.Archived === true; } }, wrong: "A Boolean value after the colon." },
  traceHints: ["It wants a yes.", "PowerShell's yes has a $.", "$t___", "Answer: $true"],
  recall: { ask: "Which active (not archived) teams have no enabled owner? Output their DisplayName only.", setup: "teamsW", check: { fn: (ctx, res) => { const want = noEnabledOwner(ctx, false); const got = namesOut(res); return got.length === want.length && got.every((x, i) => x === want[i]); } }, wrong: "Three teams: one with no owner, two whose owner's account is disabled." },
  recallHints: ["Get-Team -Archived $false, then Where-Object per team.", "Inside: the owners, filtered on (Get-MgUser -UserId $_.User -Property AccountEnabled).AccountEnabled.", "Keep the team when that filtered list is empty: -not $o.", "Get-Team -Archived $false | Where-Object { $o = Get-TeamUser -GroupId $_.GroupId -Role Owner | Where-Object { (Get-MgUser -UserId $_.User -Property AccountEnabled).AccountEnabled }; -not $o } | Select-Object DisplayName"],
  real: ["Get-Team | Select-Object DisplayName,@{n='Owners';e={(Get-TeamUser -GroupId $_.GroupId -Role Owner).Count}} | Sort-Object Owners", "Every 0 or 1 at the top is a team at risk."],
  cheat: [["(Get-TeamUser -GroupId $t.GroupId -Role Owner).Count", "Owner count"], ["Set-TeamArchivedState -GroupId $t.GroupId -Archived:$true", "Archive"], ["-SetSpoSiteReadOnlyForMembers:$true", "Freeze the files too"], ["-Archived:$false", "Bring it back"]]
}
);

Object.assign(DRILLS, {
  teamsconnect: [
    { q: "How many teams are there? One number.", fn: (ctx, res) => res.out.length === 1 && res.out[0] === ctx.t.teams.length, sol: ["(Get-Team).Count"], hint: "(Get-Team).Count" },
    { q: "Which teams are archived? DisplayName only.", out: "Get-Team -Archived $true | Select-Object DisplayName", hint: "-Archived $true" },
    { q: "What is the GroupId of IT Ops? Only the GUID.", fn: (ctx, res) => res.out.length === 1 && res.out[0] === teamOf(ctx, "IT Ops").GroupId, sol: ["(Get-Team -DisplayName 'IT Ops').GroupId"], hint: "(Get-Team -DisplayName ...).GroupId" },
    { q: "Which teams is Seren Blackwood in? DisplayName only.", out: "Get-Team -User " + U("seren.blackwood") + " | Select-Object DisplayName", hint: "-User with her UPN" },
    { q: "Prove a team is a group: get the Id of the Microsoft 365 group 'Wellbeing Club' through Graph, not Teams.", fn: (ctx, res, hist) => res.out.length === 1 && res.out[0] === teamOf(ctx, "Wellbeing Club").GroupId && hist.some((h) => /Get-MgGroup/i.test(h)), sol: ["(Get-MgGroup -Filter \"displayName eq 'Wellbeing Club'\").Id"], hint: "Get-MgGroup -Filter \"displayName eq '...'\"" },
    { q: "Done for today: sign out of Teams.", fn: (ctx) => ctx.teams === false, sol: ["Disconnect-MicrosoftTeams"], hint: "The opposite of Connect." }
  ],
  teamuser: [
    { q: "Who owns Project Northwyrm? Name only.", out: TQ("Project Northwyrm") + "; Get-TeamUser -GroupId $t.GroupId -Role Owner | Select-Object Name", hint: "-Role Owner, then Select-Object Name" },
    { q: "Add Nessa Quill to Wellbeing Club as a member.", fn: (ctx) => roleOf(ctx, "Wellbeing Club", "nessa.quill") === "member", sol: [TQ("Wellbeing Club") + "; Add-TeamUser -GroupId $t.GroupId -User " + U("nessa.quill")], hint: "Add-TeamUser without -Role" },
    { q: "Dorian Pikeholm moved away from sales. Take him out of Sales Hub.", fn: (ctx) => !!teamOf(ctx, "Sales Hub") && roleOf(ctx, "Sales Hub", "dorian.pikeholm") === null, sol: [TQ("Sales Hub") + "; Remove-TeamUser -GroupId $t.GroupId -User " + U("dorian.pikeholm")], hint: "Remove-TeamUser without -Role" },
    { q: "Hand over Wellbeing Club: Wren Callowmere becomes owner, Juniper Oakes stays in the team but is no longer owner.", fn: (ctx) => roleOf(ctx, "Wellbeing Club", "wren.callowmere") === "owner" && roleOf(ctx, "Wellbeing Club", "juniper.oakes") === "member", sol: [TQ("Wellbeing Club") + "; Add-TeamUser -GroupId $t.GroupId -User " + U("wren.callowmere") + " -Role Owner; Remove-TeamUser -GroupId $t.GroupId -User " + U("juniper.oakes") + " -Role Owner"], hint: "New owner first, then demote with -Role Owner." },
    { q: "How many people are in IT Ops, owners included? One number.", fn: (ctx, res) => res.out.length === 1 && res.out[0] === rosterOf(ctx, "IT Ops").length, sol: ["(Get-Team -DisplayName 'IT Ops' | Get-TeamUser).Count"], hint: "Get-Team pipes its GroupId into Get-TeamUser." },
    { q: "Try to remove the only owner of Project Northwyrm, and read why it's refused.", fn: (ctx, res) => !!res.error && /Last owner/.test(res.error.text()), sol: [TQ("Project Northwyrm") + "; Remove-TeamUser -GroupId $t.GroupId -User " + U("caius.merrowind")], hint: "Caius is the only owner." },
    { q: "Add every Marketing colleague to Wellbeing Club.", fn: (ctx) => deptUsers(ctx, "Marketing").every((u) => rosterOf(ctx, "Wellbeing Club").some((r) => r.upn === u.UserPrincipalName)), sol: [TQ("Wellbeing Club") + "; Get-MgUser -All -Filter \"department eq 'Marketing'\" | ForEach-Object { Add-TeamUser -GroupId $t.GroupId -User $_.UserPrincipalName }"], hint: "Graph picks with -Filter, ForEach-Object adds." }
  ],
  newteam: [
    { q: "Create a public team 'Book Club' owned by Briar Locke.", fn: (ctx) => { const t = teamOf(ctx, "Book Club"); return !!t && t.Visibility === "Public" && ownersOf(ctx, "Book Club").join() === U("briar.locke"); }, sol: ["New-Team -DisplayName 'Book Club' -Visibility Public -Owner " + U("briar.locke")], hint: "-Visibility Public -Owner" },
    { q: "Create 'Antwerp Office' (private, alias antwerpoffice), owned by Seren Blackwood, with every enabled colleague in Antwerp as a member.", fn: (ctx) => { const t = teamOf(ctx, "Antwerp Office"); if (!t || t.MailNickName !== "antwerpoffice" || t.Visibility !== "Private") return false; return ctx.t.users.filter((u) => u.UserType === "Member" && u.City === "Antwerp" && u.AccountEnabled).every((u) => t.roster.some((r) => r.upn === u.UserPrincipalName)) && ownersOf(ctx, "Antwerp Office").join() === U("seren.blackwood"); }, sol: ["New-Team -DisplayName 'Antwerp Office' -Visibility Private -MailNickName antwerpoffice -Owner " + U("seren.blackwood") + "; " + TQ("Antwerp Office") + "; Get-MgUser -All -Filter \"city eq 'Antwerp'\" -Property UserPrincipalName,AccountEnabled,UserType | Where-Object { $_.AccountEnabled -and $_.UserType -eq 'Member' } | ForEach-Object { Add-TeamUser -GroupId $t.GroupId -User $_.UserPrincipalName }"], hint: "-Filter on city, -Property AccountEnabled, then Where-Object." },
    { q: "Try to create a team with the alias 'itops' and read the error.", fn: (ctx, res) => !!res.error && /mailNickname already exists/.test(res.error.text()), sol: ["New-Team -DisplayName 'IT Ops 2' -MailNickName itops"], hint: "-MailNickName itops" },
    { q: "Someone created 'Test team' without -Owner, so you own it. Hand it to Lorcan Ivers and take yourself out.", pre: ["New-Team -DisplayName 'Test team' -MailNickName testteam"], fn: (ctx) => { const t = teamOf(ctx, "Test team"); return !!t && ownersOf(ctx, "Test team").join() === U("lorcan.ivers") && !t.roster.some((r) => r.upn === ADMIN_UPN); }, sol: [TQ("Test team") + "; Add-TeamUser -GroupId $t.GroupId -User " + U("lorcan.ivers") + " -Role Owner; Remove-TeamUser -GroupId $t.GroupId -User " + ADMIN_UPN], hint: "New owner first, then remove " + ADMIN_UPN + "." },
    { q: "Rename 'Summer Party 2025' to 'Summer Party' and make it private.", fn: (ctx) => { const t = ctx.t.teams.find((x) => x.MailNickName === "summerparty2025"); return !!t && t.DisplayName === "Summer Party" && t.Visibility === "Private"; }, sol: [TQ("Summer Party 2025") + "; Set-Team -GroupId $t.GroupId -DisplayName 'Summer Party' -Visibility Private"], hint: "Set-Team -GroupId ... -DisplayName ... -Visibility ..." }
  ],
  teamchannel: [
    { q: "List only the private channels of Sales Hub: DisplayName.", out: TQ("Sales Hub") + "; Get-TeamChannel -GroupId $t.GroupId -MembershipType Private | Select-Object DisplayName", hint: "-MembershipType Private" },
    { q: "Add a standard channel 'Wins' with the description 'Closed deals' to Sales Hub.", fn: (ctx) => { const c = chanOf(ctx, "Sales Hub", "Wins"); return !!c && c.MembershipType === "Standard" && c.Description === "Closed deals"; }, sol: [TQ("Sales Hub") + "; New-TeamChannel -GroupId $t.GroupId -DisplayName 'Wins' -Description 'Closed deals'"], hint: "New-TeamChannel with -Description" },
    { q: "Who is in the private channel 'Key accounts' of Sales Hub? Name and Role.", out: TQ("Sales Hub") + "; Get-TeamChannelUser -GroupId $t.GroupId -DisplayName 'Key accounts' | Select-Object Name,Role", hint: "Get-TeamChannelUser" },
    { q: "Corvin Ashby needs the private channel 'Key accounts' in Sales Hub.", fn: (ctx) => { const c = chanOf(ctx, "Sales Hub", "Key accounts"); return !!c && c.users.some((x) => x.upn === U("corvin.ashby")); }, sol: [TQ("Sales Hub") + "; Add-TeamChannelUser -GroupId $t.GroupId -DisplayName 'Key accounts' -User " + U("corvin.ashby")], hint: "He is already in the team." },
    { q: "Theodwyn Gallow needs the private channel 'Board prep' in Halvard Leadership. She isn't in that team yet.", fn: (ctx) => { const c = chanOf(ctx, "Halvard Leadership", "Board prep"); return !!c && c.users.some((x) => x.upn === U("theodwyn.gallow")); }, sol: [TQ("Halvard Leadership") + "; Add-TeamUser -GroupId $t.GroupId -User " + U("theodwyn.gallow") + "; Add-TeamChannelUser -GroupId $t.GroupId -DisplayName 'Board prep' -User " + U("theodwyn.gallow")], hint: "Team first, then channel." },
    { q: "Try to name a channel 'Q4/Q1 plans' in Sales Hub, and read why it's refused.", fn: (ctx, res) => !!res.error && /invalid characters/.test(res.error.text()), sol: [TQ("Sales Hub") + "; New-TeamChannel -GroupId $t.GroupId -DisplayName 'Q4/Q1 plans'"], hint: "The slash." },
    { q: "Nobody uses 'Quotes' in Sales Hub any more. Remove the channel.", fn: (ctx) => !!teamOf(ctx, "Sales Hub") && !chanOf(ctx, "Sales Hub", "Quotes"), sol: [TQ("Sales Hub") + "; Remove-TeamChannel -GroupId $t.GroupId -DisplayName 'Quotes'"], hint: "Remove-TeamChannel" }
  ],
  teamhygiene: [
    { q: "Owner count per team: DisplayName and a column called Owners.", fn: (ctx, res) => res.out.length === ctx.t.teams.length && res.out.every((o) => o && o.DisplayName && o.Owners === ctx.t.teams.find((t) => t.DisplayName === o.DisplayName).roster.filter((r) => r.role === "owner").length), sol: ["Get-Team | Select-Object DisplayName,@{n='Owners';e={(Get-TeamUser -GroupId $_.GroupId -Role Owner).Count}}"], hint: "A calculated property: @{n='Owners';e={...}}" },
    { q: "Which teams have no owner at all? DisplayName only.", fn: (ctx, res) => namesOut(res).join() === ctx.t.teams.filter((t) => !t.roster.some((r) => r.role === "owner")).map((t) => t.DisplayName).sort().join() && res.out.length > 0, sol: ["Get-Team | Where-Object { -not (Get-TeamUser -GroupId $_.GroupId -Role Owner) } | Select-Object DisplayName"], hint: "-not (Get-TeamUser ... -Role Owner)" },
    { q: "Bruges Office has nobody in charge. Make Elowen Thistle its owner.", fn: (ctx) => roleOf(ctx, "Bruges Office", "elowen.thistle") === "owner", sol: [TQ("Bruges Office") + "; Add-TeamUser -GroupId $t.GroupId -User " + U("elowen.thistle") + " -Role Owner"], hint: "Add-TeamUser -Role Owner" },
    { q: "The summer party is over. Archive Summer Party 2025 and make its files read-only for members.", fn: (ctx) => { const t = teamOf(ctx, "Summer Party 2025"); return !!t && t.Archived && t._spoRO; }, sol: ["Get-Team -DisplayName 'Summer Party 2025' | Set-TeamArchivedState -Archived:$true -SetSpoSiteReadOnlyForMembers:$true"], hint: "-SetSpoSiteReadOnlyForMembers:$true" },
    { q: "Someone needs an old file: bring Old Intranet Project back out of the archive.", fn: (ctx) => { const t = teamOf(ctx, "Old Intranet Project"); return !!t && t.Archived === false; }, sol: ["Get-Team -DisplayName 'Old Intranet Project' | Set-TeamArchivedState -Archived:$false"], hint: "-Archived:$false" },
    { q: "Which teams have a guest in them? DisplayName only.", fn: (ctx, res) => namesOut(res).join() === ctx.t.teams.filter((t) => t.roster.some((r) => r.role === "guest")).map((t) => t.DisplayName).sort().join() && res.out.length > 0, sol: ["Get-Team | Where-Object { Get-TeamUser -GroupId $_.GroupId -Role Guest } | Select-Object DisplayName"], hint: "-Role Guest inside Where-Object" }
  ]
});

const SPRING = {
  id: "spring", type: "capstone", name: "Spring clean", seq: 11, kind: "CAPSTONE · TEAMS SPRING CLEAN", allow: /./, hero: "gate", setup: "teamsCap",
  need: (m) => m.seq === 11,
  story: "Friday, governance day. Elowen wants the Teams mess sorted before the quarter closes. A party team is finished, and a finance team lost its owner. A new depot team must be done right this time. And she wants a report she can show the directors.",
  doneMsg: "Every team has a living owner, the old ones are archived and nothing was deleted. That report is the first thing the directors will ask for next quarter.",
  text: { crumb: "Capstone · ", done: "Teams in order", flow: [["Archive", "what is finished"], ["Owners", "living ones, two if you can"], ["Create", "-Owner, then fill"], ["Report", "Owners per team"]], flowT: "CAPSTONE · OWNERS, CHANNELS, ARCHIVE", rules: "<h6>CAPSTONE RULES</h6>Connected to Graph and Teams. You are in ~/Desktop. Nothing may be deleted: archive instead. Scripts in Code are welcome.", junie: "Find the team, keep it in $t, use $t.GroupId. New owner first, old owner out." },
  tickets: [
    { id: "s1", from: "Juniper Oakes", title: "The party is over", body: "Summer Party 2025 is finished. Keep it for the photos, but archive it and make the files read-only for members.", hint: "Set-TeamArchivedState -Archived:$true -SetSpoSiteReadOnlyForMembers:$true",
      check: (ctx) => { const t = ctx.t.teams.find((x) => x.MailNickName === "summerparty2025"); return !!t && t.Archived && t._spoRO; } },
    { id: "s2", from: "Hesper Reedmire", title: "Finance Close has no working owner", body: "Fenna left and her account is disabled. Make me and Ysolde Marrow owners of Finance Close, then take Fenna out of the team.", hint: "Two Add-TeamUser -Role Owner, then Remove-TeamUser for Fenna.",
      check: (ctx) => { const o = ownersOf(ctx, "Finance Close"); return o.includes(U("hesper.reedmire")) && o.includes(U("ysolde.marrow")) && !rosterOf(ctx, "Finance Close").some((r) => r.upn === U("fenna.lowmere")); } },
    { id: "s3", from: "Caius Merrowind", title: "A depot team, done right", body: "New private team 'Zeebrugge Depot', I'm the owner (you are not in it), with every enabled Operations colleague in Ghent. Plus a private channel 'Shift leads' for just me and Torin Ash.", hint: "New-Team -Owner, fill from Graph with a -Filter, New-TeamChannel -MembershipType Private -Owner, Add-TeamChannelUser.",
      check: (ctx) => { const t = teamOf(ctx, "Zeebrugge Depot"); if (!t || t.Visibility !== "Private" || t.roster.some((r) => r.upn === ADMIN_UPN)) return false; if (ownersOf(ctx, "Zeebrugge Depot").join() !== U("caius.merrowind")) return false; const ops = deptUsers(ctx, "Operations", (u) => u.City === "Ghent" && u.AccountEnabled); if (!ops.every((u) => t.roster.some((r) => r.upn === u.UserPrincipalName))) return false; const c = t.channels.find((x) => x.DisplayName === "Shift leads"); return !!c && c.MembershipType === "Private" && c.users.length === 2 && c.users.some((x) => x.upn === U("caius.merrowind") && x.role === "owner") && c.users.some((x) => x.upn === U("torin.ash")); } },
    { id: "s4", from: "Elowen Thistle", title: "The report for the directors", body: "Export every team with its owner count to ~/Desktop/teams-owners.csv for Belgian Excel: columns DisplayName, Archived and Owners.", hint: "Get-Team | Select-Object DisplayName,Archived,@{n='Owners';e={...}} | Export-Csv -Delimiter ';' -NoTypeInformation",
      check: (ctx) => { const c = csvRows(ctx, "/Users/veyra/Desktop/teams-owners.csv"); return !!c && c.rows.length === ctx.t.teams.length && c.head.includes(";") && /DisplayName/.test(c.head) && /Owners/.test(c.head) && /Archived/.test(c.head); } }
  ]
};
GATES.push(SPRING);
ERR_HELP.unshift(
  [/You must call the Connect-MicrosoftTeams/i, "Teams is its own door too. Run Connect-MicrosoftTeams first."],
  [/Invalid value for GroupId/i, "Teams commands want the GroupId, a GUID, not the team's name. $t = Get-Team -DisplayName 'Name', then -GroupId $t.GroupId."],
  [/Last owner cannot be removed/i, "A team always needs an owner. Add the new owner first, then remove the old one."],
  [/is not a member of the team/i, "Private channels only take people who are already in the team. Add-TeamUser first, then Add-TeamChannelUser."],
  [/mailNickname already exists/i, "That mail alias is taken somewhere in the tenant. Pick another -MailNickName."]
);
