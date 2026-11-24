const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "data.js"), "utf8").replace(/^const (\w+) =/gm, "D.$1 =");
const D = {};
new Function("D", src)(D);
const { GROUPS, LADDER, LESSONS, TYPED, PORTALS, ERRANDS, CAST, CASEX } = D;
const PORT = Object.fromEntries(PORTALS.map(p => [p.id, p]));
const G = id => GROUPS.find(g => g.id === id);
const h = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };
function mc(u, q, right, wrong, why, extra) {
  const r = h(q + right) % (wrong.length + 1), o = wrong.slice(0, 3);
  o.splice(r, 0, right);
  return Object.assign({ u, q, o, a: r, why }, extra || {});
}

const QFIX = {
  "identities.2": "Which is the lowest Microsoft Entra ID licence that allows dynamic group membership?",
  "identities.3": "Which feature makes an admin role eligible instead of always active?",
  "graph.1": "Which command signs you in with read access to users, and nothing more?",
  "defender.2": "Which feature removes mail after delivery when it turns out to be bad?",
  "defender.3": "Attack simulation training needs which Defender for Office 365 plan?",
  "purview.2": "Which two usage rights must a user have before Copilot can use an encrypted file?",
  "copilot.4": "What is the exact name of the policy that controls web search for Copilot and Copilot Chat?",
  "agents.1": "Which agent can only be blocked for everyone, never limited to chosen users?",
  "agents.6": "Which is the lowest Microsoft Entra ID licence for Conditional Access for agents?",
  "copilot.1": "Copilot showed someone a file. What could that person already do with the file?"
};
const RECALL = {
  tenant: [["Company branding", "Custom themes", "Organization profile", "Conditional Access"], ["TXT", "CNAME", "SRV", "AAAA"], ["Organization profile", "Reports", "Integrated apps", "Search & intelligence"], ["Usage location", "Job title", "Department", "Manager"], ["Exchange mailboxes", "Teams chats", "Entra ID users", "Power BI reports"], ["Incident", "Advisory", "Message center post", "Planned maintenance"]],
  identities: [["30 days", "7 days", "14 days", "90 days"], ["Mail contact", "Guest user", "Mail user", "B2B member"], ["Entra ID P1", "Entra ID Free", "Entra ID P2", "Microsoft 365 Business Basic"], ["Privileged Identity Management", "Administrative units", "Access reviews", "Conditional Access"], ["Administrative unit", "Security group", "Dynamic group", "Access package"]],
  auth: [["Passkey", "SMS", "Temporary Access Pass", "Voice call"], ["10", "3", "5", "20"], ["All", "Enabled", "Required", "Everyone"], ["Report-only", "Audit", "Simulation", "Preview"], ["53003", "50126", "50053", "50057"]],
  graph: [["Microsoft Graph PowerShell", "MSOnline", "AzureAD", "Azure CLI"], ["Connect-MgGraph -Scopes \"User.Read.All\"", "Connect-MgGraph -Scopes \"User.ReadWrite.All\"", "Connect-MgGraph -Scopes \"Directory.ReadWrite.All\"", "Connect-AzureAD"], ["-All", "-Top", "-First", "-PageSize"]],
  workloads: [["50 GB", "10 GB", "20 GB", "100 GB"], ["2", "1", "3", "5"], ["Members", "Owners", "Visitors", "Everyone"], ["Restricted Content Discovery", "Restricted access control", "Site lock: Read-only", "A sensitivity label"], ["Site access review", "Download detailed report", "Site lock", "Sharing report"]],
  defender: [["Incident", "Alert policy", "Advisory", "Submission"], ["Strict", "Standard", "The custom policy", "Built-in protection"], ["Zero-hour auto purge", "Safe Links", "Message trace", "Quarantine"], ["Plan 2", "Plan 1", "Exchange Online Protection", "Any plan"]],
  purview: [["Simulation mode", "Turn it on at once", "Report-only", "Keep it off"], ["Label policy", "Retention policy", "DLP policy", "Auto-labelling policy"], ["View and Extract", "View and Print", "Edit and Print", "Export and Print"], ["Keeping", "Deleting", "The newest policy", "The shortest period"], ["Auditing", "DLP", "Sensitivity labels", "Insider risk management"]],
  copilot: [["72 hours", "24 hours", "48 hours", "7 days"], ["Open it", "Nothing at all", "Only see its name in search", "Only if they own it"], ["Other settings", "Billing", "Connectors", "Agents"], ["Video generation", "Audio generation", "Code generation", "Chart generation"], ["Allow web search in Copilot", "Enable web content in Copilot", "Block Bing search", "Allow web grounding"], ["Microsoft Graph connectors", "Teams connectors", "Power Platform connectors", "Outlook connectors"], ["Copilot Credits", "Azure credits", "Seat licences", "Teams Premium units"]],
  agents: [["Agents", "Copilot", "Integrated apps", "Settings"], ["Researcher", "An agent your organisation built", "An agent from an external publisher", "An agent made with Agent Builder"], ["All users", "No users", "Admins only", "Specific users or groups"], ["Model Context Protocol", "Multi Cloud Platform", "Microsoft Copilot Plugin", "Managed Connector Proxy"], ["Agent blueprint", "Agent template", "Policy template", "Access package"], ["The sponsor", "The owner", "The Global Administrator", "The publisher"], ["Entra ID P1", "Entra ID Free", "Entra ID P2", "Microsoft 365 Business Basic"]],
  agentgov: [["The tools it used", "The user's password", "The device model", "The licence cost"], ["Purview", "Defender", "Intune", "Entra"], ["A one-time action", "A rule that keeps running", "A nightly job", "It runs on every new agent"]],
  monitor: [["Measurement and reporting", "Billing and licensing", "Identity and access", "Training and adoption"], ["Reports Reader", "Global Administrator", "Billing Administrator", "Exchange Administrator"], ["A service", "A licence", "A user", "A Teams policy"]]
};
const strip = q => q.replace(/\s*(One|Two|Three|Four) words?\.$/, "").replace(/\s*Type the number\.$/, "").replace(/\s*Type them with 'and'\.$/, "").replace(/\s*The full name or its three letters\.$/, "").replace(/\s*Its name or its three letters\.$/, "");
const lc1 = s => /^(Copilot|Conditional)\b|^.[A-Z]/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);
const where = (gid, i) => { const w = G(gid).where[i]; return PORT[w[1]].name + " › " + w[2]; };
const pool = GROUPS.flatMap(g => g.where.map((w, i) => ({ g: g.id, i, w })));
function whereCard(u, gid, i, ut) {
  const w = G(gid).where[i], right = where(gid, i), q = "Where do you go for this: " + lc1(w[0]) + "?";
  const rank = p => (p.g === gid ? 0 : G(p.g).d === G(gid).d ? 1 : 2) * 1e10 + h(q + p.g + p.i) % 1e10;
  const cand = pool.filter(p => p.w[2] !== w[2] && p.w[0] !== w[0]).sort((a, b) => rank(a) - rank(b));
  const wrong = [];
  cand.forEach(p => { const t = PORT[p.w[1]].name + " › " + p.w[2]; if (wrong.length < 3 && !wrong.includes(t) && t !== right) wrong.push(t); });
  return mc(u, q, right, wrong, "In the " + PORT[w[1]].name + ", under " + w[2] + ".", ut ? { ut } : null);
}
function recallCard(u, gid, l, ut) {
  const T = TYPED[gid][l], R = RECALL[gid][l];
  return mc(u, QFIX[gid + "." + l] || strip(T.q), R[0], R.slice(1), T.why, ut ? { ut } : null);
}

const units = [], cards = [];
LADDER.forEach((gid, n) => LESSONS[gid].forEach((L, l) => {
  const u = gid + l;
  units.push({ id: u, title: "Step " + (n + 1) + " · " + L[0] });
  cards.push(recallCard(u, gid, l));
  L[1].forEach(i => cards.push(whereCard(u, gid, i)));
}));
const errandCard = (u, e) => mc(u, CAST[e.who][0] + ", " + CAST[e.who][1] + ": " + e.msg, e.show, e.o, e.why);
ERRANDS.forEach(e => cards.push(errandCard(e.g + (LESSONS[e.g].length - 1), e)));
LADDER.forEach(gid => { if (RECALL[gid].length !== TYPED[gid].length) throw new Error("RECALL and TYPED differ for " + gid); RECALL[gid].forEach((r, l) => { if (new Set(r).size !== 4) throw new Error("duplicate option " + gid + l); }); });

const OOPS = {
  typed: {}, where: {},
  web: mc("oops", "Copilot must stop using the public web. Where does the real web search policy live?", "The Cloud Policy service, policy Allow web search in Copilot", ["A switch on Copilot > Settings", "Settings > Search & intelligence", "An Edge configuration policy"], "The entry on the Copilot settings page is only a shortcut. The real control is one policy in the Cloud Policy service at config.office.com."),
  trial: [
    mc("oops", "A shared mailbox for the stables holds 38 GB and has no archive or hold. What licence does it need?", "None", ["Exchange Online Plan 1", "Exchange Online Plan 2", "Microsoft 365 E3"], "A shared mailbox needs no licence up to 50 GB, unless it uses an archive or a litigation hold."),
    mc("oops", "Admins must not hold the Exchange Administrator role all the time. They switch it on for a few hours, with MFA and a reason. What do you use?", "Privileged Identity Management", ["An administrative unit", "A Conditional Access policy", "An access review"], "Privileged Identity Management makes the role eligible. The admin activates it for a limited time, with MFA and a justification."),
    mc("oops", "Users must not install agents from external publishers. Agents from Microsoft and your organisation stay allowed. Where do you set this?", "Agents > Settings > Agent and plugin access", ["Copilot > Settings > Data access > AI providers", "Entra ID > Agents > Agent blueprints", "Settings > Integrated apps > Policies"], "Agent and plugin access has a switch for each type of publisher: Microsoft, your organisation and external publishers."),
    mc("oops", "Copilot answers keep quoting files from one confidential site. The site's members must keep their access. What is the fastest fix?", "Turn on Restricted Content Discovery for the site", ["Remove the Copilot licence from the users", "Set the site to Read-only", "Turn off web search for Copilot"], "Restricted Content Discovery hides the site from Copilot and organisation-wide search, and leaves the permissions as they are."),
    mc("oops", "Which role is the least-privileged one that can change the settings on Copilot > Settings?", "AI Administrator", ["Global Administrator", "Global Reader", "Office Apps Administrator"], "AI Administrator can change Copilot settings. Global Reader can only look.")
  ],
  errand: {},
  case: {
    rcd: mc("oops", "Which per-site setting hides a site from Copilot and search, without changing who can open it?", "Restricted Content Discovery", ["Site lock: Read-only", "Remove the Copilot licence", "Turn off web search"], "Locks and licences do not hide a file. Restricted Content Discovery stops discovery and leaves the permissions alone."),
    wrongSite: mc("oops", "In the salary ledger case, which site held the wages ledger?", "Treasury", ["Halcyon Home", "Library Archive", "Council Chamber"], "Change only the site that causes the problem."),
    wrongReport: mc("oops", "Which data access governance report finds sites open to every internal user?", "Everyone except external users", ["Sharing links", "Sensitivity labels applied to files", "Oversharing baseline"], "That group holds every internal account, so whatever is shared with it is open to the whole household."),
    sharing: mc("oops", "Which built-in group holds every account inside the organisation, but no guests?", "Everyone except external users", ["Everyone", "Site members", "All company"], "It is internal, so external sharing settings do not touch it."),
    pick: mc("oops", "In that report, which action asks the site owner to remove the broad access?", "Initiate site access review", ["Download detailed report", "Set the site to Read-only", "Start an Entra access review"], "The owner gets an email and removes the access themselves.")
  },
  ps: {
    connect: mc("oops", "Which command connects this window to SharePoint Online for Halcyon?", "Connect-SPOService -Url https://halcyon-admin.sharepoint.com", ["Connect-SPOService -Url https://halcyon.sharepoint.com", "Connect-SPOService -Url halcyon-admin", "Connect-MgGraph -Scopes Sites.Read.All"], "Connect-SPOService takes the full admin address, the one with admin in its name: halcyon-admin.sharepoint.com."),
    site: mc("oops", "Which command shows the Treasury site?", "Get-SPOSite -Identity https://halcyon.sharepoint.com/sites/treasury", ["Get-SPOSite -Identity Treasury", "Get-SPOSite -Identity https://halcyon-admin.sharepoint.com/sites/treasury", "Get-SPOSite -Name Treasury"], "The Identity parameter takes the full site URL, not the site's name."),
    set: mc("oops", "Which command turns on Restricted Content Discovery for the Treasury site?", "Set-SPOSite -Identity https://halcyon.sharepoint.com/sites/treasury -RestrictContentOrgWideSearch $true", ["Set-SPOSite -Identity https://halcyon.sharepoint.com/sites/treasury -RestrictContentOrgWideSearch true", "Set-SPOSite -Identity https://halcyon.sharepoint.com/sites/treasury -Rest $true", "Set-SPOSite -Identity Treasury -RestrictContentOrgWideSearch $true"], "Boolean parameters take $true or $false. The short name Rest matches more than one parameter, and Identity needs the full URL."),
    lock: mc("oops", "Which LockState value stops all changes but keeps the site readable?", "ReadOnly", ["NoAccess", "NoAdditions", "Unlock"], "ReadOnly blocks changes. NoAccess blocks everyone. NoAdditions is not a value Set-SPOSite takes: it knows Unlock, ReadOnly and NoAccess.")
  }
};
const WJ = c => Object.assign(c, { o: c.o.map(x => x.replace(/ -(?=[A-Za-z])/g, " -\u2060").replace(/\.com\/(?=\S)/g, ".com/\u200b")) });
Object.values(OOPS.ps).forEach(WJ);
cards.forEach(c => { if (c.o.some(x => / -[A-Z]/.test(x))) WJ(c); });
ERRANDS.forEach(e => { OOPS.errand[e.id] = errandCard("oops", e); });
LADDER.forEach(gid => { OOPS.typed[gid] = TYPED[gid].map((_, l) => recallCard("oops", gid, l)); OOPS.where[gid] = G(gid).where.map((_, i) => whereCard("oops", gid, i)); });
const CASEC = {};
Object.entries(CASEX).forEach(([cid, X]) => { CASEC[cid] = { t: "case " + X.no + ", " + X.t, c: {} }; Object.entries(X.redo).forEach(([rid, R]) => { CASEC[cid].c[rid] = mc("oops", R.q, R.show, R.no, R.why); }); });
const PSK = { noconn: "connect", connect: "connect", tconn: "connect", site: "site", tget: "site", set: "set", bool: "set", param: "set", tset: "set", lock: "lock" };

const sample = { "vigil.v1": JSON.stringify({ lit: [], seen: [], sl: 40, read: ["tenant0", "tenant1"], miss: [{ id: "typed:{\"g\":\"tenant\",\"l\":2}", kind: "typed", g: "tenant", t: TYPED.tenant[2].q, ref: { g: "tenant", l: 2 }, at: 1, st: 0, due: 1 }], skin: "paper" }) };
const bank = `POCKET.register({
  id: "vigil",
  name: "Vigil · Exam AB-650",
  topic: "Microsoft 365",
  href: "vigil.html",
  keys: ["vigil.v1"],
  units: ${JSON.stringify(units)},
  done(get) {
    const s = get("vigil.v1");
    if (!s || !Array.isArray(s.read)) return [];
    const ids = new Set(this.units.map(u => u.id));
    return [...new Set(s.read.filter(k => ids.has(k)))];
  },
  live(get) {
    const s = get("vigil.v1"), O = ${JSON.stringify(OOPS)}, K = ${JSON.stringify(PSK)}, X = ${JSON.stringify(CASEC)};
    if (!s || !Array.isArray(s.miss)) return [];
    const out = [], seen = new Set(), src = { typed: "a School check", where: "a School check", trial: "the Trial", "case": "the salary ledger case", ps: "the PowerShell window", errand: "an errand" };
    s.miss.forEach(m => {
      const r = m && m.ref; if (!r) return;
      let c = null;
      if (m.kind === "typed" && O.typed[r.g]) c = O.typed[r.g][r.l];
      if (m.kind === "where") c = r.web ? O.web : O.where[r.g] && O.where[r.g][r.w];
      if (m.kind === "trial") c = O.trial[r.i];
      if (m.kind === "case") c = r.c ? X[r.c] && X[r.c].c[r.id] : O["case"][r.id];
      if (m.kind === "ps") c = O.ps[K[r.e]];
      if (m.kind === "errand") c = O.errand[r.id];
      if (!c || seen.has(c.o[c.a])) return;
      seen.add(c.o[c.a]);
      out.push(Object.assign({}, c, { u: "oops", ut: "Your oopsies", why: c.why + " You got this wrong in " + (m.kind === "case" && r.c && X[r.c] ? X[r.c].t : src[m.kind]) + ".", at: Math.max(1, m.st ? 1 : 2) }));
    });
    return out;
  },
  sample: ${JSON.stringify(sample)},
  sampleDone: ["tenant0", "tenant1"],
  cards: ${JSON.stringify(cards)}
});
`;
const out = path.join(__dirname, "..", "pockle", "banks", "vigil.js");
fs.writeFileSync(out, bank);
console.log("wrote", out, units.length, "lessons,", cards.length, "cards");
