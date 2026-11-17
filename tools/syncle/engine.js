const PS = (() => {
const TYPE = Symbol("pstype");
const HT = Symbol("hashtable");
const NOW = new Date(); NOW.setSeconds(0, 0);
const DAY = 864e5;
const ago = (d, h) => new Date(NOW.getTime() - d * DAY - (h || 0) * 36e5);
const GM = "Microsoft.Graph.PowerShell.Models.";

function obj(type, props) { const o = {}; Object.defineProperty(o, TYPE, { value: type, writable: true }); return Object.assign(o, props || {}); }
function ht(props, ordered) { const o = obj(ordered ? "System.Collections.Specialized.OrderedDictionary" : "System.Collections.Hashtable", props); Object.defineProperty(o, HT, { value: true }); return o; }
const isHT = (v) => v && typeof v === "object" && v[HT] === true;
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof SB);
class SB { constructor(src, body) { this.src = src; this.body = body; } }

class PSErr extends Error {
  constructor(msg, o) { super(msg); o = o || {}; this.cmd = o.cmd || null; this.term = !!o.term; this.parse = !!o.parse; this.kind = o.kind || "runtime"; }
  text() { return (this.parse ? "ParserError: " : this.cmd ? this.cmd + ": " : "") + this.message; }
}

function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function guid(r) { const h = () => Math.floor(r() * 16).toString(16); let s = ""; for (const n of [8, 4, 4, 4, 12]) { for (let i = 0; i < n; i++) s += h(); s += "-"; } return s.slice(0, -1); }

const SKUS = [
  { part: "SPE_E3", id: "05e9a617-0261-4cee-bb44-138d3ef5d965", prepaid: 40 },
  { part: "EXCHANGESTANDARD", id: "4b9405b0-7788-4568-add1-99614e613b69", prepaid: 15 },
  { part: "POWER_BI_PRO", id: "f8a1db68-be16-40ed-86d5-cb42ce701560", prepaid: 7 },
  { part: "FLOW_FREE", id: "f30db892-07e9-47e9-837c-80727f46fd3d", prepaid: 10000 },
  { part: "TEAMS_EXPLORATORY", id: "710779e8-3d4a-4c88-adb9-386c958d1fdf", prepaid: 100 },
];
const ROLES = [
  { name: "Global Administrator", tpl: "62e90394-69f5-4237-9190-012177145e10", desc: "Can manage all aspects of Microsoft Entra ID and Microsoft services that use Microsoft Entra identities." },
  { name: "User Administrator", tpl: "fe930be7-5e62-47db-91af-98c3a49a38b1", desc: "Can manage all aspects of users and groups, including resetting passwords for limited admins." },
  { name: "Exchange Administrator", tpl: "29232cdf-9323-42fd-ade2-1d097af3e4de", desc: "Can manage all aspects of the Exchange product." },
  { name: "Global Reader", tpl: "f2ef992c-3afb-46b9-b7cf-a126ee74c451", desc: "Can read everything that a Global Administrator can, but not update anything." },
];
const PEOPLE = [
  ["Ysolde", "Marrow", "Finance", "Controller"], ["Brannoc", "Vale", "Sales", "Account Manager"], ["Corvin", "Ashby", "Sales", "Account Manager"],
  ["Elowen", "Thistle", "IT", "IT Lead"], ["Maelis", "Grey", "Operations", "Planner"], ["Tamsin", "Rook", "Finance", "Accountant"],
  ["Oren", "Halloway", "Operations", "Site Coordinator"], ["Isolde", "Fenn", "Legal", "Counsel"], ["Garrick", "Penhale", "Sales", "Sales Director"],
  ["Wren", "Calloway", "Marketing", "Content Lead"], ["Aldric", "Moor", "Operations", "Technician"], ["Seren", "Blackwood", "HR", "HR Partner"],
  ["Lorcan", "Ivers", "IT", "Systems Engineer"], ["Nessa", "Quill", "Marketing", "Designer"], ["Rowan", "Hart", "Operations", "Technician"],
  ["Ilse", "Varga", "Finance", "Payroll"], ["Dorian", "Pike", "Sales", "Account Manager"], ["Fenna", "Lowe", "Operations", "Technician"],
  ["Cassian", "Drake", "IT", "Service Desk"], ["Mirelle", "Stone", "Legal", "Paralegal"], ["Bastian", "Crane", "Operations", "Shift Lead"],
  ["Elara", "Wynn", "Sales", "Inside Sales"], ["Torin", "Ash", "Operations", "Technician"], ["Liora", "Penn", "HR", "Recruiter"],
  ["Hollis", "Reed", "Finance", "CFO"], ["Saoirse", "Vane", "Marketing", "Marketing Manager"], ["Emrys", "Cole", "Operations", "Technician"],
  ["Petra", "Lind", "Sales", "Inside Sales"], ["Caius", "Mercer", "Operations", "Operations Manager"], ["Ondine", "Shaw", "IT", "Service Desk"],
  ["Rhydian", "Bell", "Operations", "Technician"], ["Thea", "Gallow", "Finance", "Accountant"], ["Quillon", "Dunne", "Sales", "Account Manager"],
  ["Anwen", "Frost", "Operations", "Planner"], ["Ludo", "Kerr", "Operations", "Technician"], ["Marisol", "Teague", "Legal", "Counsel"],
  ["Evander", "Holt", "Operations", "Technician"], ["Briar", "Locke", "Marketing", "Social Media"], ["Soren", "Achterberg", "IT", "Network Engineer"],
  ["Ines", "Corrigan", "Sales", "Account Manager"], ["Kestrel", "Wade", "Operations", "Technician"], ["Juniper", "Oakes", "HR", "HR Manager"],
  ["Alaric", "Strand", "Executive", "Managing Director"],
];
const STALE = { 1: 161, 4: 340, 6: 200, 10: 120, 14: 95, 21: 410, 27: 133, 33: 260, 40: 102 };
const DISABLED = new Set([10, 17, 30, 32, 36]);
const NEVER = new Set([36, 41]);

function makeTenant() {
  const r = rng(1789);
  const domain = "halvardco.onmicrosoft.com";
  const users = PEOPLE.map((p, i) => {
    const [g, s, dept, title] = p;
    const upn = (g + "." + s).toLowerCase() + "@" + domain;
    const lic = [];
    if (i % 7 === 3) lic.push(SKUS[1].id); else lic.push(SKUS[0].id);
    if (dept === "Finance" || dept === "Executive" || i === 12) lic.push(SKUS[2].id);
    if (i % 5 === 0) lic.push(SKUS[3].id);
    const last = NEVER.has(i) ? null : STALE[i] ? ago(STALE[i], (i * 3) % 11) : ago(i % 9, (i * 5) % 13);
    return obj(GM + "MicrosoftGraphUser", {
      AccountEnabled: !DISABLED.has(i), AssignedLicenses: lic.map((id) => obj(GM + "MicrosoftGraphAssignedLicense", { DisabledPlans: [], SkuId: id })),
      BusinessPhones: [], City: i % 3 === 0 ? "Bruges" : i % 3 === 1 ? "Ghent" : "Antwerp", CompanyName: "Halvard & Co", Country: "Belgium",
      CreatedDateTime: ago(200 + Math.floor(r() * 1400)), Department: dept, DisplayName: g + " " + s, EmployeeId: String(1000 + i), GivenName: g,
      Id: guid(r), JobTitle: title, Mail: upn, MailNickname: (g + "." + s).toLowerCase(), MobilePhone: null, OfficeLocation: null, OnPremisesSyncEnabled: null,
      PreferredLanguage: "en-US", SignInActivity: obj(GM + "MicrosoftGraphSignInActivity", { LastNonInteractiveSignInDateTime: last, LastSignInDateTime: last, LastSuccessfulSignInDateTime: last }),
      Surname: s, UsageLocation: "BE", UserPrincipalName: upn, UserType: "Member",
    });
  });
  [["Pieter Draaisma", "pdraaisma_partner.example#EXT#@" + domain], ["Nora Bekaert", "nbekaert_audit.example#EXT#@" + domain], ["Sam Okafor", "sokafor_vendor.example#EXT#@" + domain]].forEach(([n, u], k) => {
    const [g, s] = n.split(" ");
    users.push(obj(GM + "MicrosoftGraphUser", {
      AccountEnabled: true, AssignedLicenses: [], BusinessPhones: [], City: null, CompanyName: null, Country: null, CreatedDateTime: ago(300 + k * 90), Department: null,
      DisplayName: n, EmployeeId: null, GivenName: g, Id: guid(r), JobTitle: null, Mail: null, MailNickname: u.split("#")[0], MobilePhone: null, OfficeLocation: null,
      OnPremisesSyncEnabled: null, PreferredLanguage: null, SignInActivity: obj(GM + "MicrosoftGraphSignInActivity", { LastNonInteractiveSignInDateTime: k === 1 ? null : ago(30 + k * 200), LastSignInDateTime: k === 1 ? null : ago(30 + k * 200), LastSuccessfulSignInDateTime: k === 1 ? null : ago(30 + k * 200) }),
      Surname: s, UsageLocation: null, UserPrincipalName: u, UserType: "Guest",
    }));
  });
  const skus = SKUS.map((s) => obj(GM + "MicrosoftGraphSubscribedSku", {
    AccountId: "7d1c3b2a-4e5f-4a6b-9c8d-0e1f2a3b4c5d", AccountName: "Halvard & Co", AppliesTo: "User", CapabilityStatus: "Enabled",
    ConsumedUnits: users.filter((u) => u.AssignedLicenses.some((l) => l.SkuId === s.id)).length, Id: "7d1c3b2a-4e5f-4a6b-9c8d-0e1f2a3b4c5d_" + s.id,
    PrepaidUnits: obj(GM + "MicrosoftGraphLicenseUnitsDetail", { Enabled: s.prepaid, LockedOut: 0, Suspended: 0, Warning: 0 }), ServicePlans: [], SkuId: s.id, SkuPartNumber: s.part,
  }));
  const roleMembers = { "Global Administrator": [3, 12, 24, 42], "User Administrator": [18, 3], "Exchange Administrator": [29], "Global Reader": [38, 13] };
  const roles = ROLES.map((x) => ({ role: obj(GM + "MicrosoftGraphDirectoryRole", { DeletedDateTime: null, Description: x.desc, DisplayName: x.name, Id: guid(r), RoleTemplateId: x.tpl }), members: roleMembers[x.name] }));
  const osList = ["Windows", "Windows", "Windows", "MacMDM", "iOS", "Windows", "Android", "Windows", "iOS", "Windows"];
  const devices = [];
  for (let i = 0; i < 31; i++) {
    const os = osList[i % osList.length];
    const owner = users[(i * 5) % 43];
    const ver = os === "Windows" ? (i % 4 === 0 ? "10.0.19045.4529" : "10.0.22631.4317") : os === "MacMDM" ? "14.6.1" : os === "iOS" ? "17.6.1" : "14";
    devices.push(obj(GM + "MicrosoftGraphDevice", {
      AccountEnabled: i !== 9, ApproximateLastSignInDateTime: ago(i % 6 === 5 ? 120 + i : i % 14), DeletedDateTime: null, DeviceId: guid(r),
      DisplayName: os === "Windows" ? "HLV-" + String(100 + i) : os === "MacMDM" ? owner.GivenName + "s-MacBook" : owner.GivenName + "'s " + (os === "iOS" ? "iPhone" : "Pixel"),
      Id: guid(r), IsCompliant: i % 8 === 6 ? false : i % 11 === 10 ? null : true, IsManaged: i % 11 !== 10, OperatingSystem: os, OperatingSystemVersion: ver,
      TrustType: os === "Windows" ? "AzureAd" : "Workplace",
    }));
  }
  const mailboxes = [];
  users.forEach((u) => { if (u.UserType === "Member" && u.AssignedLicenses.some((l) => l.SkuId === SKUS[0].id || l.SkuId === SKUS[1].id)) mailboxes.push(mbx(r, u.DisplayName, u.UserPrincipalName, "UserMailbox", u.Id)); });
  [["Info", "info"], ["Sales Desk", "sales"], ["Finance Inbox", "finance"], ["Support", "support"], ["Careers", "careers"]].forEach(([n, a]) => mailboxes.push(mbx(r, n, a + "@" + domain, "SharedMailbox", guid(r))));
  [["Boardroom Bruges", "room.bruges"], ["Meeting Room Ghent", "room.ghent"]].forEach(([n, a]) => mailboxes.push(mbx(r, n, a + "@" + domain, "RoomMailbox", guid(r))));
  return { domain, users, skus, roles, devices, mailboxes, tenantId: "7d1c3b2a-4e5f-4a6b-9c8d-0e1f2a3b4c5d" };
}
function mbx(r, name, smtp, kind, id) {
  return obj("Microsoft.Exchange.Management.RestApiClient.ExoMailbox", {
    Alias: smtp.split("@")[0].replace(/\./g, ""), DisplayName: name, EmailAddresses: ["SMTP:" + smtp], ExternalDirectoryObjectId: id, Guid: guid(r), Id: name,
    Identity: name, Name: name, PrimarySmtpAddress: smtp, RecipientType: "UserMailbox", RecipientTypeDetails: kind, UserPrincipalName: smtp,
  });
}

const USER_DEFAULT = ["BusinessPhones", "DisplayName", "GivenName", "Id", "JobTitle", "Mail", "MobilePhone", "OfficeLocation", "PreferredLanguage", "Surname", "UserPrincipalName"];
const PROPTYPES = {
  [GM + "MicrosoftGraphUser"]: { AccountEnabled: "System.Nullable[bool]", AssignedLicenses: GM + "MicrosoftGraphAssignedLicense[]", BusinessPhones: "string[]", CreatedDateTime: "System.Nullable[datetime]", SignInActivity: GM + "MicrosoftGraphSignInActivity", OnPremisesSyncEnabled: "System.Nullable[bool]" },
  [GM + "MicrosoftGraphSignInActivity"]: { LastNonInteractiveSignInDateTime: "System.Nullable[datetime]", LastSignInDateTime: "System.Nullable[datetime]", LastSuccessfulSignInDateTime: "System.Nullable[datetime]" },
  [GM + "MicrosoftGraphAssignedLicense"]: { DisabledPlans: "string[]", SkuId: "string" },
  [GM + "MicrosoftGraphSubscribedSku"]: { ConsumedUnits: "System.Nullable[int]", PrepaidUnits: GM + "MicrosoftGraphLicenseUnitsDetail", ServicePlans: GM + "MicrosoftGraphServicePlanInfo[]" },
  [GM + "MicrosoftGraphLicenseUnitsDetail"]: { Enabled: "System.Nullable[int]", LockedOut: "System.Nullable[int]", Suspended: "System.Nullable[int]", Warning: "System.Nullable[int]" },
  [GM + "MicrosoftGraphDirectoryRole"]: { DeletedDateTime: "System.Nullable[datetime]" },
  [GM + "MicrosoftGraphDirectoryObject"]: { AdditionalProperties: "System.Collections.Generic.IDictionary[string,System.Object]", DeletedDateTime: "System.Nullable[datetime]" },
  [GM + "MicrosoftGraphDevice"]: { AccountEnabled: "System.Nullable[bool]", ApproximateLastSignInDateTime: "System.Nullable[datetime]", DeletedDateTime: "System.Nullable[datetime]", IsCompliant: "System.Nullable[bool]", IsManaged: "System.Nullable[bool]" },
  [GM + "MicrosoftGraphLicenseDetails"]: { ServicePlans: GM + "MicrosoftGraphServicePlanInfo[]" },
  "Microsoft.Exchange.Management.RestApiClient.ExoMailbox": { EmailAddresses: "System.Collections.Generic.List[string]" },
};
const DISPLAY = {
  [GM + "MicrosoftGraphUser"]: ["DisplayName", "Id", "Mail", "UserPrincipalName"],
  [GM + "MicrosoftGraphSubscribedSku"]: ["SkuPartNumber", "SkuId", "ConsumedUnits", "CapabilityStatus"],
  [GM + "MicrosoftGraphDirectoryRole"]: ["DisplayName", "Id", "RoleTemplateId"],
  [GM + "MicrosoftGraphDirectoryObject"]: ["Id", "DeletedDateTime"],
  [GM + "MicrosoftGraphDevice"]: ["DisplayName", "OperatingSystem", "OperatingSystemVersion", "AccountEnabled"],
  [GM + "MicrosoftGraphLicenseDetails"]: ["Id", "SkuId", "SkuPartNumber"],
  "Microsoft.Exchange.Management.RestApiClient.ExoMailbox": ["DisplayName", "PrimarySmtpAddress", "RecipientTypeDetails", "Alias"],
  "Microsoft.PowerShell.Commands.GroupInfo": ["Count", "Name", "Group"],
  "Microsoft.PowerShell.Commands.GroupInfoNoElement": ["Count", "Name"],
  "System.Management.Automation.CmdletInfo": ["CommandType", "Name", "Version", "Source"],
  "FileInfo": ["Mode", "LastWriteTime", "Length", "Name"],
};

function typeName(v) {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return "System.Object[]";
  if (v instanceof Date) return "System.DateTime";
  if (v instanceof SB) return "System.Management.Automation.ScriptBlock";
  if (typeof v === "string") return "System.String";
  if (typeof v === "boolean") return "System.Boolean";
  if (typeof v === "number") return Number.isInteger(v) ? "System.Int32" : "System.Double";
  if (v[TYPE]) return v[TYPE];
  return "System.Management.Automation.PSCustomObject";
}
const shortType = (t) => (t || "").replace(/^System\./, "").replace(/^Management\.Automation\./, "");

function propKey(o, name) {
  if (!o || typeof o !== "object") return null;
  if (Object.prototype.hasOwnProperty.call(o, name)) return name;
  const l = name.toLowerCase();
  for (const k of Object.keys(o)) if (k.toLowerCase() === l) return k;
  return null;
}
function hasProp(o, name) { return propKey(o, name) !== null; }

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function time12(d) { let h = d.getHours(); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return h + ":" + String(d.getMinutes()).padStart(2, "0") + ":" + String(d.getSeconds()).padStart(2, "0") + " " + ap; }
function dateShort(d) { return d.getMonth() + 1 + "/" + d.getDate() + "/" + d.getFullYear() + " " + time12(d); }
function dateLong(d) { return WDAYS[d.getDay()] + ", " + MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear() + " " + time12(d); }
function dateFmt(d, f) {
  const p = (n, w) => String(n).padStart(w || 2, "0");
  const map = { yyyy: d.getFullYear(), MMMM: MONTHS[d.getMonth()], MMM: MONTHS[d.getMonth()].slice(0, 3), MM: p(d.getMonth() + 1), dddd: WDAYS[d.getDay()], dd: p(d.getDate()), HH: p(d.getHours()), mm: p(d.getMinutes()), ss: p(d.getSeconds()), d: d.getDate(), M: d.getMonth() + 1 };
  return f.replace(/yyyy|MMMM|MMM|MM|dddd|dd|HH|mm|ss|d|M/g, (m) => map[m]);
}

function toStr(v, inCell) {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "True" : "False";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  if (v instanceof Date) return dateShort(v);
  if (v instanceof SB) return v.src;
  if (Array.isArray(v)) return inCell ? "{" + v.map((x) => toStr(x, true)).join(", ") + "}" : v.map((x) => toStr(x)).join(" ");
  if (isHT(v)) return "System.Collections.Hashtable";
  const t = typeName(v);
  if (t === "System.Management.Automation.PSCustomObject" || t.startsWith("Selected.")) return "@{" + Object.keys(v).map((k) => k + "=" + toStr(v[k], true)).join("; ") + "}";
  if (t === "ErrorRecord") return v.Exception ? v.Exception.Message : "";
  if (t === "System.Exception") return v.Message;
  return t;
}

function truthy(v) {
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.length === 0 ? false : v.length === 1 ? truthy(v[0]) : true;
  if (typeof v === "string") return v.length > 0;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "boolean") return v;
  return true;
}
function unwrap(arr) { return arr.length === 0 ? null : arr.length === 1 ? arr[0] : arr; }
function flat(v) { return v === null || v === undefined ? [] : Array.isArray(v) ? v : [v]; }

function wildRe(pat) { let s = "^"; for (let i = 0; i < pat.length; i++) { const c = pat[i]; if (c === "*") s += ".*"; else if (c === "?") s += "."; else if (c === "[") { const j = pat.indexOf("]", i); if (j > i) { s += pat.slice(i, j + 1); i = j; } else s += "\\["; } else s += c.replace(/[.+^${}()|\\]/g, "\\$&"); } return new RegExp(s + "$", "i"); }
const hasWild = (s) => /[*?\[]/.test(s);

function coerceLike(left, right) {
  if (right === null || right === undefined) return right;
  if (typeof left === "number") { if (typeof right === "string" && right.trim() !== "" && !isNaN(+right)) return +right; if (typeof right === "boolean") return right ? 1 : 0; return right; }
  if (left instanceof Date) { if (typeof right === "string") { const d = new Date(right); return isNaN(d) ? right : d; } return right; }
  if (typeof left === "boolean") { if (typeof right === "string") return right.length > 0; if (typeof right === "number") return right !== 0; return right; }
  if (typeof left === "string") { if (right instanceof Date) return dateShort(right); if (typeof right !== "string" && !isObj(right)) return toStr(right); }
  return right;
}
function cmpVals(a, b, cs) {
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : -1;
  if (b === null || b === undefined) return 1;
  b = coerceLike(a, b);
  if (a instanceof Date && b instanceof Date) return a - b;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return (a ? 1 : 0) - (b ? 1 : 0);
  const sa = toStr(a), sb = toStr(b);
  if (cs) return sa < sb ? -1 : sa > sb ? 1 : 0;
  return sa.localeCompare(sb, "en", { sensitivity: "base" });
}
function eqVals(a, b, cs) {
  if (a === null || a === undefined) return b === null || b === undefined;
  if (b === null || b === undefined) return false;
  b = coerceLike(a, b);
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (typeof a === "string" && typeof b === "string") return cs ? a === b : a.toLowerCase() === b.toLowerCase();
  if (typeof a === typeof b && typeof a !== "object") return a === b;
  return a === b;
}

class Parser {
  constructor(src) { this.s = src; this.i = 0; }
  err(m) { throw new PSErr(m, { parse: true, term: true, kind: "parse" }); }
  eof() { return this.i >= this.s.length; }
  peek(n) { return this.s[this.i + (n || 0)]; }
  ws(nl) {
    for (;;) {
      const c = this.peek();
      if (c === " " || c === "\t") { this.i++; continue; }
      if (c === "`" && (this.peek(1) === "\n" || this.peek(1) === "\r")) { this.i += 2; continue; }
      if (c === "#") { while (!this.eof() && this.peek() !== "\n") this.i++; continue; }
      if (c === "<" && this.peek(1) === "#") { const j = this.s.indexOf("#>", this.i + 2); this.i = j < 0 ? this.s.length : j + 2; continue; }
      if (nl && (c === "\n" || c === "\r")) { this.i++; continue; }
      break;
    }
  }
  kw(word) { const re = new RegExp("^" + word + "(?=[\\s({]|$)", "i"); const m = re.exec(this.s.slice(this.i)); if (m) { this.i += m[0].length; return true; } return false; }
  expect(ch, msg) { this.ws(true); if (this.peek() !== ch) this.err(msg || "Missing '" + ch + "'."); this.i++; }

  script(end) {
    const out = [];
    for (;;) {
      this.ws(true);
      while (this.peek() === ";") { this.i++; this.ws(true); }
      if (this.eof() || (end && this.peek() === end)) break;
      out.push(this.statement());
      this.ws(false);
      const c = this.peek();
      if (c === ";" || c === "\n" || c === "\r") { this.i++; continue; }
      if (this.eof() || (end && c === end)) break;
      if (c === "}" || c === ")") this.err("Unexpected token '" + c + "' in expression or statement.");
      this.err("Unexpected token '" + this.s.slice(this.i).split(/\s/)[0] + "' in expression or statement.");
    }
    return out;
  }
  block(what) {
    this.ws(true);
    if (this.peek() !== "{") this.err("Missing statement block after " + what + ".");
    this.i++;
    const body = this.script("}");
    if (this.peek() !== "}") this.err("Missing closing '}' in statement block or type definition.");
    this.i++;
    return body;
  }
  statement() {
    const start = this.i;
    if (this.kw("function")) {
      this.ws(false);
      const m = /^[A-Za-z][\w-]*/.exec(this.s.slice(this.i));
      if (!m) this.err("Missing name after function keyword.");
      this.i += m[0].length;
      this.ws(true);
      let params = [];
      if (this.peek() === "(") { this.i++; params = this.paramList(); }
      this.ws(true);
      if (this.peek() !== "{") this.err("Missing function body in function declaration.");
      this.i++;
      this.ws(true);
      if (/^param\s*\(/i.test(this.s.slice(this.i))) { this.i = this.s.indexOf("(", this.i) + 1; params = this.paramList(); }
      const body = this.script("}");
      if (this.peek() !== "}") this.err("Missing closing '}' in statement block or type definition.");
      this.i++;
      return { t: "function", name: m[0], params, body, src: this.s.slice(start, this.i) };
    }
    if (this.kw("foreach")) {
      this.expect("(", "Missing opening '(' after keyword 'foreach'.");
      this.ws(true);
      const v = this.varName();
      if (!v) this.err("Missing variable name after foreach.");
      this.ws(true);
      if (!/^in\b/i.test(this.s.slice(this.i))) this.err("Missing 'in' after variable in foreach loop.");
      this.i += 2;
      const coll = this.pipeline();
      this.expect(")", "Missing closing ')' after expression in 'foreach' statement.");
      const body = this.block("foreach");
      return { t: "foreach", v, coll, body };
    }
    if (this.kw("try")) {
      const body = this.block("try");
      this.ws(true);
      let cbody = null, fbody = null;
      if (this.kw("catch")) cbody = this.block("catch");
      this.ws(true);
      if (this.kw("finally")) fbody = this.block("finally");
      if (!cbody && !fbody) this.err("The Try statement is missing its Catch or Finally block.");
      return { t: "try", body, cbody, fbody };
    }
    if (this.kw("if")) {
      const arms = [];
      this.expect("(", "Missing '(' after 'if' in if statement.");
      let cond = this.pipeline();
      this.expect(")", "Missing closing ')' after expression in 'if' statement.");
      arms.push({ cond, body: this.block("if") });
      let els = null;
      for (;;) {
        const save = this.i;
        this.ws(true);
        if (this.kw("elseif")) { this.expect("("); cond = this.pipeline(); this.expect(")"); arms.push({ cond, body: this.block("elseif") }); continue; }
        if (this.kw("else")) { els = this.block("else"); break; }
        this.i = save; break;
      }
      return { t: "if", arms, els };
    }
    if (this.kw("return")) { this.ws(false); const c = this.peek(); const val = c === undefined || c === "\n" || c === ";" || c === "}" ? null : this.pipeline(); return { t: "return", val }; }
    if (this.peek() === "$") {
      const save = this.i;
      let lv = null;
      try { lv = this.postfix(); } catch (e) { lv = null; }
      if (lv && (lv.t === "idx" || lv.t === "mem")) {
        this.ws(false);
        const m2 = /^(\+=|=)(?!=)/.exec(this.s.slice(this.i));
        if (m2) { this.i += m2[0].length; this.ws(true); const val = this.statementValue(); return { t: "lassign", target: lv, op: m2[1], val, src: this.s.slice(start, this.i) }; }
      }
      this.i = save;
    }
    const am = /^\$([A-Za-z_][\w]*|\{[^}]+\})\s*(\+=|=)(?!=)/.exec(this.s.slice(this.i));
    if (am) { this.i += am[0].length; this.ws(true); const name = am[1].replace(/^\{|\}$/g, ""); const val = this.statementValue(); return { t: "assign", name, op: am[2], val, src: this.s.slice(start, this.i) }; }
    const p = this.pipeline();
    return { t: "pipe", p, src: this.s.slice(start, this.i) };
  }
  statementValue() {
    if (/^(foreach|if)(?=[\s(])/i.test(this.s.slice(this.i))) return { t: "stmtval", st: this.statement() };
    return this.pipeline();
  }
  paramList() {
    const ps = [];
    for (;;) {
      this.ws(true);
      if (this.peek() === ")") { this.i++; break; }
      while (this.peek() === "[") { const j = this.s.indexOf("]", this.i); this.i = j + 1; this.ws(true); }
      const v = this.varName();
      if (!v) this.err("Missing ')' in function parameter list.");
      this.ws(true);
      let def = null;
      if (this.peek() === "=") { this.i++; this.ws(true); def = this.expr(); }
      ps.push({ name: v, def });
      this.ws(true);
      if (this.peek() === ",") { this.i++; continue; }
      if (this.peek() === ")") { this.i++; break; }
      this.err("Missing ')' in function parameter list.");
    }
    return ps;
  }
  varName() { const m = /^\$([A-Za-z_]\w*|\{[^}]+\})/.exec(this.s.slice(this.i)); if (!m) return null; this.i += m[0].length; return m[1].replace(/^\{|\}$/g, ""); }

  pipeline() {
    const els = [];
    const start = this.i;
    els.push(this.element(true));
    for (;;) {
      const save = this.i;
      this.ws(false);
      if (this.peek() === "|" && this.peek(1) !== "|") {
        this.i++; this.ws(true);
        if (this.eof()) this.err("An empty pipe element is not allowed.");
        const e = this.element(false);
        els.push(e);
        continue;
      }
      const look = this.s.slice(this.i);
      const m = /^[\r\n]+\s*\|(?!\|)/.exec(look);
      if (m) { this.i += m[0].length; this.ws(true); els.push(this.element(false)); continue; }
      this.i = save; break;
    }
    return { els, src: this.s.slice(start, this.i).trim() };
  }
  element(first) {
    this.ws(false);
    const start = this.i;
    const c = this.peek();
    if (c === undefined || c === "|" || c === ")" || c === "}" || c === ";") this.err("An empty pipe element is not allowed.");
    const isCmd = /[A-Za-z?%]/.test(c) || (c === "&" && false);
    if (isCmd) {
      const m = /^[A-Za-z?%][\w.-]*/.exec(this.s.slice(this.i));
      const name = m ? m[0] : c;
      this.i += name.length;
      const args = this.cmdArgs();
      return { k: "cmd", name, args, src: this.s.slice(start, this.i).trim() };
    }
    if (!first) this.err("Expressions are only allowed as the first element of a pipeline.");
    const e = this.expr();
    return { k: "expr", e, src: this.s.slice(start, this.i).trim() };
  }
  cmdArgs() {
    const args = [];
    for (;;) {
      this.ws(false);
      const c = this.peek();
      if (c === undefined || c === "|" || c === ";" || c === "\n" || c === "\r" || c === ")" || c === "}") break;
      if (c === "-" && /[A-Za-z]/.test(this.peek(1) || "")) {
        const m = /^-([A-Za-z][\w]*)(:?)/.exec(this.s.slice(this.i));
        this.i += m[0].length;
        if (m[2]) { this.ws(false); args.push({ p: m[1], v: this.argValue(), colon: true }); }
        else args.push({ p: m[1] });
        continue;
      }
      if (c === "@" && /[A-Za-z_]/.test(this.peek(1) || "")) { const m = /^@([A-Za-z_]\w*)/.exec(this.s.slice(this.i)); this.i += m[0].length; args.push({ splat: m[1] }); continue; }
      args.push({ v: this.argValue() });
    }
    return args;
  }
  argValue() {
    const first = this.argAtom();
    const items = [first];
    for (;;) {
      const save = this.i;
      this.ws(false);
      if (this.peek() === ",") { this.i++; this.ws(true); items.push(this.argAtom()); continue; }
      this.i = save; break;
    }
    return items.length === 1 ? first : { t: "arr", items };
  }
  argAtom() {
    const c = this.peek();
    if (c === "$" || c === "(" || c === "@" || c === "'" || c === "\"" || c === "{" || c === "[") return this.postfix();
    if (/[0-9]/.test(c) || (c === "-" && /[0-9]/.test(this.peek(1) || ""))) {
      const m = /^-?\d+(\.\d+)?(?=[\s,|;)}]|$)/.exec(this.s.slice(this.i));
      if (m) { this.i += m[0].length; return { t: "lit", v: +m[0] }; }
    }
    const m = /^[^\s,|;)}]+/.exec(this.s.slice(this.i));
    if (!m) this.err("Missing argument.");
    this.i += m[0].length;
    return { t: "lit", v: m[0], bare: true };
  }

  expr() { return this.logical(); }
  opAhead(list) {
    const m = /^-([A-Za-z]+)(?![\w])/.exec(this.s.slice(this.i));
    if (!m) return null;
    const op = m[1].toLowerCase();
    return list.includes(op) ? { op, len: m[0].length } : null;
  }
  logical() {
    let l = this.comparison();
    for (;;) {
      const save = this.i;
      this.ws(false);
      const o = this.opAhead(["and", "or", "xor"]);
      if (!o) { this.i = save; return l; }
      this.i += o.len; this.ws(true);
      l = { t: "logic", op: o.op, l, r: this.comparison() };
    }
  }
  comparison() {
    const ops = ["eq", "ne", "gt", "ge", "lt", "le", "like", "notlike", "match", "notmatch", "contains", "notcontains", "in", "notin", "ceq", "cne", "ieq", "ine", "clike", "cmatch", "replace", "split", "join", "is", "isnot"];
    let l = this.additive();
    for (;;) {
      const save = this.i;
      this.ws(false);
      const o = this.opAhead(ops);
      if (!o) { this.i = save; return l; }
      this.i += o.len; this.ws(true);
      const nx = this.peek();
      if (nx === undefined || /[A-Za-z})|;\n]/.test(nx)) this.err("You must provide a value expression following the '-" + o.op + "' operator.");
      l = { t: "cmp", op: o.op, l, r: this.additive() };
    }
  }
  additive() {
    let l = this.mult();
    for (;;) {
      const save = this.i;
      this.ws(false);
      const c = this.peek();
      if ((c === "+" || c === "-") && !/[A-Za-z=]/.test(this.peek(1) || "") && this.peek(1) !== "=") { this.i++; this.ws(true); l = { t: "bin", op: c, l, r: this.mult() }; continue; }
      this.i = save; return l;
    }
  }
  mult() {
    let l = this.unary();
    for (;;) {
      const save = this.i;
      this.ws(false);
      const c = this.peek();
      if ((c === "*" || c === "/" || c === "%") && this.peek(1) !== "=") { this.i++; this.ws(true); l = { t: "bin", op: c, l, r: this.unary() }; continue; }
      this.i = save; return l;
    }
  }
  unary() {
    this.ws(false);
    const c = this.peek();
    if (c === "!") { this.i++; this.ws(false); return { t: "not", e: this.unary() }; }
    if (/^-not(?![\w])/i.test(this.s.slice(this.i))) { this.i += 4; this.ws(false); return { t: "not", e: this.unary() }; }
    if (/^-join(?![\w])/i.test(this.s.slice(this.i))) { this.i += 5; this.ws(false); return { t: "ujoin", e: this.unary() }; }
    if (c === "-" && !/[A-Za-z]/.test(this.peek(1) || "")) { this.i++; this.ws(false); return { t: "neg", e: this.unary() }; }
    if (c === "[") {
      const m = /^\[([A-Za-z][\w.\[\]]*?)\](?!\])/.exec(this.s.slice(this.i));
      if (m && this.s[this.i + m[0].length] !== ":") { this.i += m[0].length; this.ws(false); return { t: "cast", type: m[1].toLowerCase(), e: this.unary() }; }
    }
    return this.arrayExpr();
  }
  arrayExpr() {
    const first = this.postfix();
    const items = [first];
    for (;;) {
      const save = this.i;
      this.ws(false);
      if (this.peek() === ",") { this.i++; this.ws(true); items.push(this.postfix()); continue; }
      this.i = save; break;
    }
    return items.length === 1 ? first : { t: "arr", items };
  }
  postfix() {
    let e = this.primary();
    for (;;) {
      const c = this.peek();
      if (c === "." && /[A-Za-z_'"$]/.test(this.peek(1) || "")) {
        this.i++;
        let name;
        if (this.peek() === "'" || this.peek() === "\"") name = this.stringLit().v;
        else { const m = /^[A-Za-z_][\w]*/.exec(this.s.slice(this.i)); name = m[0]; this.i += name.length; }
        if (this.peek() === "(") { this.i++; const args = this.callArgs(); e = { t: "call", o: e, name, args }; }
        else e = { t: "mem", o: e, name };
        continue;
      }
      if (c === ":" && this.peek(1) === ":") {
        this.i += 2;
        const m = /^[A-Za-z_]\w*/.exec(this.s.slice(this.i));
        if (!m) this.err("Missing static member name.");
        this.i += m[0].length;
        if (this.peek() === "(") { this.i++; e = { t: "scall", o: e, name: m[0], args: this.callArgs() }; }
        else e = { t: "smem", o: e, name: m[0] };
        continue;
      }
      if (c === "[" ) { this.i++; this.ws(true); const idx = this.expr(); this.expect("]", "Missing ']' after array index expression."); e = { t: "idx", o: e, idx }; continue; }
      break;
    }
    return e;
  }
  callArgs() {
    const args = [];
    this.ws(true);
    if (this.peek() === ")") { this.i++; return args; }
    for (;;) {
      args.push(this.logicalNoArr());
      this.ws(true);
      if (this.peek() === ",") { this.i++; this.ws(true); continue; }
      if (this.peek() === ")") { this.i++; return args; }
      this.err("Missing ')' in method call.");
    }
  }
  logicalNoArr() { const save = this.arrayExpr; this.arrayExpr = this.postfix; try { return this.logical(); } finally { this.arrayExpr = save; } }
  stringLit() {
    const q = this.peek();
    this.i++;
    let v = "";
    if (q === "'") {
      for (;;) {
        if (this.eof()) this.err("The string is missing the terminator: '.");
        const c = this.s[this.i++];
        if (c === "'") { if (this.peek() === "'") { v += "'"; this.i++; continue; } break; }
        v += c;
      }
      return { t: "lit", v };
    }
    const parts = [];
    let buf = "";
    for (;;) {
      if (this.eof()) this.err("The string is missing the terminator: \".");
      const c = this.s[this.i++];
      if (c === "\"") { if (this.peek() === "\"") { buf += "\""; this.i++; continue; } break; }
      if (c === "`") { const n = this.s[this.i++]; buf += n === "n" ? "\n" : n === "t" ? "\t" : n; continue; }
      if (c === "$") {
        if (this.peek() === "(") {
          this.i++;
          const body = this.script(")");
          if (this.peek() !== ")") this.err("Missing closing ')' in subexpression.");
          this.i++;
          if (buf) parts.push(buf); buf = "";
          parts.push({ t: "sub", body });
          continue;
        }
        const m = /^([A-Za-z_]\w*|\{[^}]+\})/.exec(this.s.slice(this.i));
        if (m) { this.i += m[0].length; if (buf) parts.push(buf); buf = ""; parts.push({ t: "var", name: m[1].replace(/^\{|\}$/g, "") }); continue; }
      }
      buf += c;
    }
    if (buf) parts.push(buf);
    if (parts.every((p) => typeof p === "string")) return { t: "lit", v: parts.join("") };
    return { t: "interp", parts };
  }
  primary() {
    this.ws(false);
    const c = this.peek();
    const rest = this.s.slice(this.i);
    if (c === undefined) this.err("You must provide a value expression following this operator.");
    if (c === "'" || c === "\"") return this.stringLit();
    let m = /^(\d+(\.\d+)?)(kb|mb|gb)?(?![\w])/i.exec(rest);
    if (m) { this.i += m[0].length; let v = +m[1]; const u = (m[3] || "").toLowerCase(); if (u) v *= u === "kb" ? 1024 : u === "mb" ? 1048576 : 1073741824; return { t: "lit", v }; }
    if (c === "$") {
      if (this.peek(1) === "(") { this.i += 2; const body = this.script(")"); if (this.peek() !== ")") this.err("Missing closing ')' in subexpression."); this.i++; return { t: "sub", body }; }
      const v = this.varName();
      if (v === null) { if (/^\$_/.test(rest)) { this.i += 2; return { t: "var", name: "_" }; } this.err("Unexpected token '$'."); }
      return { t: "var", name: v };
    }
    if (c === "(") { this.i++; this.ws(true); const st = this.statementValue(); this.expect(")", "Missing closing ')' in expression."); return { t: "paren", p: st }; }
    if (c === "@" && this.peek(1) === "(") { this.i += 2; const body = this.script(")"); if (this.peek() !== ")") this.err("Missing closing ')' in subexpression."); this.i++; return { t: "arrsub", body }; }
    if (c === "@" && this.peek(1) === "{") { this.i += 2; return this.hashLit(); }
    if (c === "{") {
      const start = this.i;
      this.i++;
      const body = this.script("}");
      if (this.peek() !== "}") this.err("Missing closing '}' in statement block or type definition.");
      this.i++;
      return { t: "sb", body, src: this.s.slice(start, this.i) };
    }
    if (c === "[") {
      m = /^\[([A-Za-z][\w.]*)\]/.exec(rest);
      if (m) { this.i += m[0].length; return { t: "type", name: m[1].toLowerCase() }; }
    }
    const w = /^[^\s|;)}]+/.exec(rest);
    this.err("Unexpected token '" + (w ? w[0] : c) + "' in expression or statement.");
  }
  hashLit() {
    const entries = [];
    for (;;) {
      this.ws(true);
      while (this.peek() === ";") { this.i++; this.ws(true); }
      if (this.peek() === "}") { this.i++; break; }
      let key;
      if (this.peek() === "'" || this.peek() === "\"") key = this.stringLit();
      else { const m = /^[A-Za-z_@][\w.@-]*/.exec(this.s.slice(this.i)); if (!m) this.err("Missing key before '=' in hash literal."); this.i += m[0].length; key = { t: "lit", v: m[0] }; }
      this.ws(false);
      if (this.peek() !== "=") this.err("Missing '=' operator after key in hash literal.");
      this.i++;
      this.ws(true);
      const val = this.statementValue();
      entries.push({ key, val });
      this.ws(false);
      const c = this.peek();
      if (c === ";" || c === "\n" || c === "\r") { this.i++; continue; }
      if (c === "}") { this.i++; break; }
      this.err("The hash literal was incomplete.");
    }
    return { t: "hash", entries };
  }
}

function parse(src) { const p = new Parser(src); const ast = p.script(null); return ast; }

const CMDS = {};
const ALIASES = { where: "Where-Object", "?": "Where-Object", select: "Select-Object", sort: "Sort-Object", group: "Group-Object", measure: "Measure-Object", "%": "ForEach-Object", foreach: "ForEach-Object", ft: "Format-Table", fl: "Format-List", gm: "Get-Member", gcm: "Get-Command", help: "Get-Help", man: "Get-Help", echo: "Write-Output", cat: "Get-Content", gc: "Get-Content", ls: "Get-ChildItem", dir: "Get-ChildItem", gci: "Get-ChildItem", cls: "Clear-Host", clear: "Clear-Host", epcsv: "Export-Csv", ipcsv: "Import-Csv" };
const COMMON = { ErrorAction: { kind: "value" }, WarningAction: { kind: "value" }, Verbose: { kind: "switch" }, Debug: { kind: "switch" }, OutVariable: { kind: "value" } };
const COMMON_ALIAS = { ea: "ErrorAction", ov: "OutVariable", wa: "WarningAction", vb: "Verbose" };

function def(name, spec) { spec.name = name; CMDS[name.toLowerCase()] = spec; }

class Ctx {
  constructor(tenant) {
    this.t = tenant || extendTenant(makeTenant());
    this.scopes = [new Map()];
    this.funcs = {};
    this.mg = null; this.exo = false;
    this.fs = {};
    this.host = [];
    this.errors = [];
    this.history = [];
    this.lastStages = null;
  }
  getVar(n) {
    const l = n.toLowerCase();
    if (l === "true") return true; if (l === "false") return false; if (l === "null") return null;
    if (l === "psitem") return this.getVar("_");
    if (l === "error") return this.errors.slice().reverse();
    if (l === "home") return "/Users/kaatje";
    if (l === "pwd") return "/Users/kaatje";
    for (let i = this.scopes.length - 1; i >= 0; i--) if (this.scopes[i].has(l)) return this.scopes[i].get(l);
    return null;
  }
  hasVar(n) { const l = n.toLowerCase(); for (let i = this.scopes.length - 1; i >= 0; i--) if (this.scopes[i].has(l)) return true; return false; }
  setVar(n, v, local) {
    const l = n.toLowerCase();
    if (["true", "false", "null"].includes(l)) throw new PSErr("Cannot overwrite variable " + n + " because it is read-only or constant.", { term: true });
    if (!local) for (let i = this.scopes.length - 1; i >= 0; i--) if (this.scopes[i].has(l)) { this.scopes[i].set(l, v); return; }
    this.scopes[this.scopes.length - 1].set(l, v);
  }
  push(m) { this.scopes.push(m || new Map()); }
  pop() { this.scopes.pop(); }
  path(p) { p = String(p); if (p.startsWith("~/")) p = "/Users/kaatje/" + p.slice(2); else if (p.startsWith("./")) p = "/Users/kaatje/" + p.slice(2); else if (!p.startsWith("/")) p = "/Users/kaatje/" + p; return p.replace(/\/+/g, "/"); }
}

class Return { constructor(v) { this.v = v; } }

function evalScript(stmts, ctx, out) { for (const s of stmts) execStmt(s, ctx, out); return out; }
function execStmt(s, ctx, out) {
  switch (s.t) {
    case "pipe": { const r = runPipeline(s.p, ctx, null); for (const v of r) out.push(v); return; }
    case "assign": {
      let v = s.val.t === "stmtval" ? unwrap(evalScript([s.val.st], ctx, [])) : pipeValue(s.val, ctx, null);
      if (s.op === "+=") { const cur = ctx.getVar(s.name); v = addVals(cur, v); }
      ctx.setVar(s.name, v); return;
    }
    case "foreach": {
      const coll = flat(unwrap(runPipeline(s.coll, ctx, null)));
      for (const item of coll) { ctx.setVar(s.v, item); evalScript(s.body, ctx, out); }
      return;
    }
    case "if": {
      for (const a of s.arms) if (truthy(unwrap(runPipeline(a.cond, ctx, null)))) { evalScript(a.body, ctx, out); return; }
      if (s.els) evalScript(s.els, ctx, out);
      return;
    }
    case "try": {
      try { evalScript(s.body, ctx, out); }
      catch (e) {
        if (!(e instanceof PSErr) || e.parse || !s.cbody) { if (s.fbody) evalScript(s.fbody, ctx, out); throw e; }
        const rec = errRecord(e);
        ctx.push(new Map([["_", rec]]));
        try { evalScript(s.cbody, ctx, out); } finally { ctx.pop(); }
      }
      if (s.fbody) evalScript(s.fbody, ctx, out);
      return;
    }
    case "lassign": {
      let v = s.val.t === "stmtval" ? unwrap(evalScript([s.val.st], ctx, [])) : pipeValue(s.val, ctx, null);
      const tgt = s.target;
      const o = evalExpr(tgt.o, ctx);
      if (o === null || o === undefined) throw new PSErr(tgt.t === "idx" ? "Cannot index into a null array." : "The property '" + tgt.name + "' cannot be found on this object. Verify that the property exists and can be set.", { term: true });
      if (tgt.t === "idx") {
        const k = evalExpr(tgt.idx, ctx);
        if (Array.isArray(o)) { const n = +k; if (n >= o.length || n < -o.length) throw new PSErr("Index was outside the bounds of the array.", { term: true }); const i = n < 0 ? o.length + n : n; o[i] = s.op === "+=" ? addVals(o[i], v) : v; return; }
        const key = toStr(k); const ek = propKey(o, key) || key; o[ek] = s.op === "+=" ? addVals(o[ek], v) : v; return;
      }
      const ek = propKey(o, tgt.name);
      if (ek === null && !isHT(o)) throw new PSErr("The property '" + tgt.name + "' cannot be found on this object. Verify that the property exists and can be set.", { term: true });
      const kk = ek || tgt.name; o[kk] = s.op === "+=" ? addVals(o[kk], v) : v; return;
    }
    case "function": ctx.funcs[s.name.toLowerCase()] = s; return;
    case "return": { const v = s.val ? runPipeline(s.val, ctx, null) : []; throw new Return(v); }
  }
}
function errRecord(e) {
  const ex = obj("System.Exception", { Message: e.cmd ? e.message.split("\n")[0] : e.message, HResult: -2146233087 });
  const rec = obj("ErrorRecord", { Exception: ex, CategoryInfo: e.kind, FullyQualifiedErrorId: e.cmd || "RuntimeException", InvocationInfo: null });
  return rec;
}
function addVals(a, b) {
  if (a === null || a === undefined) return b;
  if (Array.isArray(a)) return a.concat(flat(b));
  if (typeof a === "string") return a + toStr(b);
  if (typeof a === "number") { const n = coerceLike(0, b); if (typeof n !== "number") throw new PSErr("Cannot convert value \"" + toStr(b) + "\" to type \"System.Int32\". Error: \"The input string '" + toStr(b) + "' was not in a correct format.\"", { term: true }); return a + n; }
  if (a instanceof Date && typeof b === "number") return new Date(a.getTime() + b);
  if (isHT(a) && isHT(b)) { const o = ht(Object.assign({}, a)); for (const k of Object.keys(b)) { if (propKey(o, k)) throw new PSErr("Item has already been added. Key in dictionary: '" + k + "'  Key being added: '" + k + "'", { term: true }); o[k] = b[k]; } return o; }
  throw new PSErr("Method invocation failed because [" + typeName(a) + "] does not contain a method named 'op_Addition'.", { term: true });
}

function runPipeline(p, ctx, record) {
  let data = null;
  const stages = [];
  p.els.forEach((el, idx) => {
    if (record) record.push({ src: el.src, name: el.k === "cmd" ? canonName(el.name) : null, out: null, pending: true });
    if (el.k === "expr") { data = flat(evalExpr(el.e, ctx)); }
    else data = runCommand(el, ctx, idx === 0 ? null : data || [], idx);
    if (record) { const r = record[record.length - 1]; r.out = data; r.pending = false; }
  });
  return data || [];
}
function pipeValue(p, ctx, rec) {
  if (p.els.length === 1 && p.els[0].k === "expr") { const v = evalExpr(p.els[0].e, ctx); if (rec) rec.push({ src: p.els[0].src, name: null, out: flat(v), pending: false }); return v; }
  return unwrap(runPipeline(p, ctx, rec));
}
function canonName(n) { const l = n.toLowerCase(); const a = ALIASES[l]; if (a) return a; const c = CMDS[l]; return c ? c.name : n; }

function bindArgs(spec, args, ctx, cname) {
  const params = Object.assign({}, spec.params || {}, COMMON);
  if (spec.whatif) { params.WhatIf = { kind: "switch" }; params.Confirm = { kind: "switch" }; }
  const names = Object.keys(params);
  const bound = {};
  const positional = [];
  const resolve = (raw) => {
    const l = raw.toLowerCase();
    if (COMMON_ALIAS[l]) return COMMON_ALIAS[l];
    const exact = names.find((n) => n.toLowerCase() === l || (params[n].alias || []).some((a) => a.toLowerCase() === l));
    if (exact) return exact;
    const hits = names.filter((n) => n.toLowerCase().startsWith(l));
    if (hits.length === 1) return hits[0];
    if (hits.length > 1) throw new PSErr("Parameter cannot be processed because the parameter name '" + raw + "' is ambiguous. Possible matches include: " + hits.map((h) => "-" + h).join(" ") + ".", { cmd: cname, term: true });
    throw new PSErr("A parameter cannot be found that matches parameter name '" + raw + "'.", { cmd: cname, term: true });
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.splat) {
      const h = ctx.getVar(a.splat);
      if (isHT(h)) { for (const k of Object.keys(h)) { const n = resolve(k); bound[n] = h[k]; } }
      else if (Array.isArray(h)) positional.push(...h);
      continue;
    }
    if (a.p !== undefined) {
      const n = resolve(a.p);
      const ps = params[n];
      if (ps.kind === "switch") {
        if (a.colon) {
          const sv = evalArg(a.v, ctx);
          if (typeof sv === "string") throw new PSErr("Cannot process argument transformation on parameter '" + n + "'. Cannot convert value \"System.String\" to type \"System.Management.Automation.SwitchParameter\". Boolean parameters accept only Boolean values and numbers, such as $True, $False, 1 or 0.", { cmd: cname, term: true, kind: "switchstr" });
          bound[n] = truthy(sv);
        } else bound[n] = true;
        continue;
      }
      if (a.colon) { bound[n] = evalArg(a.v, ctx); continue; }
      const nx = args[i + 1];
      if (!nx || nx.p !== undefined || nx.splat) throw new PSErr("Missing an argument for parameter '" + n + "'. Specify a parameter of type '" + (ps.type || "System.Object") + "' and try again.", { cmd: cname, term: true });
      bound[n] = evalArg(nx.v, ctx); i++;
      continue;
    }
    positional.push(evalArg(a.v, ctx));
  }
  const posParams = names.filter((n) => params[n].pos !== undefined).sort((x, y) => params[x].pos - params[y].pos);
  for (const v of positional) {
    const n = posParams.find((pn) => !(pn in bound));
    if (!n) throw new PSErr("A positional parameter cannot be found that accepts argument '" + toStr(v, true) + "'.", { cmd: cname, term: true });
    bound[n] = v;
  }
  for (const n of names) if (params[n].req && !(n in bound) && !(params[n].pipe)) throw new PSErr("Cannot process command because of one or more missing mandatory parameters: " + n + ".", { cmd: cname, term: true });
  return bound;
}
function evalArg(v, ctx) {
  if (!v) return null;
  if (v.t === "lit") return v.v;
  if (v.t === "arr") return v.items.map((x) => evalArg(x, ctx));
  return evalExpr(v, ctx);
}

function runCommand(el, ctx, input, idx) {
  const raw = el.name;
  const l = raw.toLowerCase();
  const fn = ctx.funcs[l];
  if (fn) return callFunction(fn, el, ctx, input);
  const cname = ALIASES[l] || raw;
  const spec = CMDS[cname.toLowerCase()];
  if (!spec) throw new PSErr("The term '" + raw + "' is not recognized as a name of a cmdlet, function, script file, or executable program.\nCheck the spelling of the name, or if a path was included, verify that the path is correct and try again.", { cmd: raw, term: true, kind: "notfound" });
  if (input && input.length && !spec.pipe) throw new PSErr("The input object cannot be bound to any parameters for the command either because the command does not take pipeline input or the input and its properties do not match any of the parameters that take pipeline input.", { cmd: spec.name, term: true, kind: "pipeinput" });
  const b = bindArgs(spec, el.args, ctx, spec.name);
  const stop = b.ErrorAction && /^stop$/i.test(String(b.ErrorAction));
  const silent = b.ErrorAction && /^(silentlycontinue|ignore)$/i.test(String(b.ErrorAction));
  const res = [];
  const emitErr = (msg, sub, kind) => {
    const e = new PSErr(msg, { cmd: sub || spec.name, kind: kind || "runtime" });
    if (stop) { e.term = true; throw e; }
    if (!silent) { ctx.errors.push(e); ctx.host.push({ err: e.text() }); }
  };
  const out = spec.run({ ctx, b, input: input || [], hadInput: input !== null, emitErr, res, name: spec.name });
  const r = out === undefined ? res : out;
  if (b.OutVariable) ctx.setVar(String(b.OutVariable), r.slice());
  return r;
}
function callFunction(fn, el, ctx, input) {
  const scope = new Map();
  const pos = [];
  for (let i = 0; i < el.args.length; i++) {
    const a = el.args[i];
    if (a.p !== undefined) {
      const p = fn.params.find((x) => x.name.toLowerCase().startsWith(a.p.toLowerCase()));
      if (!p) throw new PSErr("A parameter cannot be found that matches parameter name '" + a.p + "'.", { cmd: fn.name, term: true });
      if (a.colon) { scope.set(p.name.toLowerCase(), evalArg(a.v, ctx)); continue; }
      const nx = el.args[i + 1];
      if (!nx || nx.p !== undefined) { scope.set(p.name.toLowerCase(), true); continue; }
      scope.set(p.name.toLowerCase(), evalArg(nx.v, ctx)); i++;
    } else if (a.splat) { const h = ctx.getVar(a.splat); if (isHT(h)) for (const k of Object.keys(h)) { const p = fn.params.find((x) => x.name.toLowerCase() === k.toLowerCase()); if (!p) throw new PSErr("A parameter cannot be found that matches parameter name '" + k + "'.", { cmd: fn.name, term: true }); scope.set(p.name.toLowerCase(), h[k]); } }
    else pos.push(evalArg(a.v, ctx));
  }
  for (const p of fn.params) if (!scope.has(p.name.toLowerCase())) { if (pos.length) scope.set(p.name.toLowerCase(), pos.shift()); else scope.set(p.name.toLowerCase(), p.def ? evalExpr(p.def, ctx) : null); }
  scope.set("input", input || []);
  scope.set("args", pos);
  ctx.push(scope);
  const out = [];
  try { evalScript(fn.body, ctx, out); }
  catch (e) { if (e instanceof Return) { ctx.pop(); return out.concat(e.v); } ctx.pop(); throw e; }
  ctx.pop();
  return out;
}

function runSB(sb, ctx, item, extra) {
  const m = new Map();
  if (item !== undefined) m.set("_", item);
  if (extra) for (const k of Object.keys(extra)) m.set(k, extra[k]);
  ctx.push(m);
  const out = [];
  try { evalScript(sb.body, ctx, out); }
  catch (e) { if (e instanceof Return) { ctx.pop(); return out.concat(e.v); } ctx.pop(); throw e; }
  ctx.pop();
  return out;
}

function getMember(o, name) {
  if (o === null || o === undefined) return null;
  const l = name.toLowerCase();
  if (Array.isArray(o)) {
    if (l === "count" || l === "length") return o.length;
    const r = [];
    for (const x of o) { const v = getMember(x, name); if (v !== null && v !== undefined) { if (Array.isArray(v)) r.push(...v); else r.push(v); } }
    return r.length === 0 ? null : r.length === 1 ? r[0] : r;
  }
  if (typeof o === "string") { if (l === "length") return o.length; if (l === "count") return 1; return null; }
  if (o instanceof Date) {
    const map = { year: o.getFullYear(), month: o.getMonth() + 1, day: o.getDate(), hour: o.getHours(), minute: o.getMinutes(), dayofweek: WDAYS[o.getDay()], date: new Date(o.getFullYear(), o.getMonth(), o.getDate()), ticks: o.getTime() * 1e4 };
    if (l in map) return map[l];
    if (l === "count") return 1;
    return null;
  }
  if (typeof o !== "object") { if (l === "count") return 1; return null; }
  const k = propKey(o, name);
  if (k !== null) return o[k];
  if (isHT(o)) { if (l === "count") return Object.keys(o).length; if (l === "keys") return Object.keys(o); if (l === "values") return Object.values(o); return null; }
  if (l === "count") return 1;
  return null;
}
function callMethod(o, name, args, ctx) {
  const l = name.toLowerCase();
  if (o === null || o === undefined) throw new PSErr("You cannot call a method on a null-valued expression.", { term: true, kind: "nullcall" });
  if (l === "tostring") { if (o instanceof Date && args.length) return dateFmt(o, String(args[0])); return toStr(o); }
  if (l === "gettype") return obj("System.RuntimeType", { Name: (typeName(o) || "").split(".").pop(), FullName: typeName(o) });
  if (typeof o === "string") {
    const a0 = args[0], a1 = args[1];
    switch (l) {
      case "tolower": case "tolowerinvariant": return o.toLowerCase();
      case "toupper": case "toupperinvariant": return o.toUpperCase();
      case "trim": return o.trim();
      case "split": return o.split(String(a0));
      case "contains": return o.includes(String(a0));
      case "startswith": return o.toLowerCase().startsWith(String(a0).toLowerCase()) && (args[1] === undefined ? o.startsWith(String(a0)) || true : true);
      case "endswith": return o.endsWith(String(a0));
      case "replace": return o.split(String(a0)).join(String(a1));
      case "substring": return a1 === undefined ? o.substring(a0) : o.substr(a0, a1);
      case "indexof": return o.indexOf(String(a0));
      case "padright": return o.padEnd(a0);
      case "padleft": return o.padStart(a0);
    }
  }
  if (o instanceof Date) {
    const n = +args[0];
    switch (l) {
      case "adddays": return new Date(o.getTime() + n * DAY);
      case "addhours": return new Date(o.getTime() + n * 36e5);
      case "addminutes": return new Date(o.getTime() + n * 6e4);
      case "addmonths": { const d = new Date(o); d.setMonth(d.getMonth() + n); return d; }
      case "addyears": { const d = new Date(o); d.setFullYear(d.getFullYear() + n); return d; }
      case "subtract": { const ms = o - args[0]; return obj("System.TimeSpan", { Days: Math.floor(ms / DAY), TotalDays: ms / DAY, Hours: Math.floor(ms / 36e5) % 24 }); }
    }
  }
  if (isHT(o)) { if (l === "containskey") return propKey(o, String(args[0])) !== null; if (l === "add") { o[String(args[0])] = args[1]; return undefined; } if (l === "remove") { const k = propKey(o, String(args[0])); if (k) delete o[k]; return undefined; } }
  if (Array.isArray(o)) { if (l === "contains") return o.some((x) => eqVals(x, args[0], true)); if (l === "indexof") return o.findIndex((x) => eqVals(x, args[0], true)); }
  throw new PSErr("Method invocation failed because [" + typeName(o) + "] does not contain a method named '" + name + "'.", { term: true, kind: "nomethod" });
}

function evalExpr(e, ctx) {
  switch (e.t) {
    case "lit": return e.v;
    case "var": return ctx.getVar(e.name);
    case "interp": return e.parts.map((p) => typeof p === "string" ? p : p.t === "var" ? toStr(ctx.getVar(p.name)) : toStr(unwrap(evalScript(p.body, ctx, [])))).join("");
    case "sub": return unwrap(evalScript(e.body, ctx, []));
    case "arrsub": return evalScript(e.body, ctx, []);
    case "paren": return e.p.t === "stmtval" ? unwrap(evalScript([e.p.st], ctx, [])) : unwrap(runPipeline(e.p, ctx, null));
    case "arr": return e.items.map((x) => evalExpr(x, ctx));
    case "sb": return new SB(e.src, e.body);
    case "hash": { const o = ht({}); for (const en of e.entries) { const k = toStr(evalExpr(en.key, ctx)); const v = en.val.t === "stmtval" ? unwrap(evalScript([en.val.st], ctx, [])) : unwrap(runPipeline(en.val, ctx, null)); if (propKey(o, k) !== null) throw new PSErr("Duplicate keys '" + k + "' are not allowed in hash literals.", { parse: true, term: true }); o[k] = v; } return o; }
    case "mem": return getMember(evalExpr(e.o, ctx), e.name);
    case "call": { const o = evalExpr(e.o, ctx); const args = e.args.map((a) => evalExpr(a, ctx)); const r = callMethod(o, e.name, args, ctx); return r === undefined ? null : r; }
    case "idx": {
      const o = evalExpr(e.o, ctx); const i = evalExpr(e.idx, ctx);
      if (o === null || o === undefined) throw new PSErr("Cannot index into a null array.", { term: true });
      if (Array.isArray(o)) { if (Array.isArray(i)) return i.map((n) => o[n < 0 ? o.length + n : n]); const n = +i; return o[n < 0 ? o.length + n : n] ?? null; }
      if (typeof o === "string") return o[+i] ?? null;
      if (typeof o === "object") { const k = propKey(o, String(i)); return k === null ? null : o[k]; }
      return null;
    }
    case "not": return !truthy(evalExpr(e.e, ctx));
    case "neg": { const v = evalExpr(e.e, ctx); return -(+v); }
    case "ujoin": return flat(evalExpr(e.e, ctx)).map((x) => toStr(x)).join("");
    case "bin": {
      const a = evalExpr(e.l, ctx), b = evalExpr(e.r, ctx);
      if (e.op === "+") return addVals(a, b);
      if (a instanceof Date && b instanceof Date && e.op === "-") return obj("System.TimeSpan", { Days: Math.floor((a - b) / DAY), TotalDays: (a - b) / DAY });
      const x = +a, y = +coerceLike(0, b);
      if (isNaN(x) || isNaN(y)) throw new PSErr("Method invocation failed because [" + typeName(a) + "] does not contain a method named 'op_" + (e.op === "-" ? "Subtraction" : e.op === "*" ? "Multiply" : "Division") + "'.", { term: true });
      if (e.op === "-") return x - y; if (e.op === "*") return x * y; if (e.op === "/") { if (y === 0) throw new PSErr("Attempted to divide by zero.", { term: true }); return x / y; } return x % y;
    }
    case "logic": {
      const a = truthy(evalExpr(e.l, ctx));
      if (e.op === "and") return a ? truthy(evalExpr(e.r, ctx)) : false;
      if (e.op === "or") return a ? true : truthy(evalExpr(e.r, ctx));
      return a !== truthy(evalExpr(e.r, ctx));
    }
    case "cmp": return compare(e.op, evalExpr(e.l, ctx), evalExpr(e.r, ctx));
    case "cast": return cast(e.type, e.e, ctx);
    case "type": return { __type: e.name };
    case "smem": { const t = evalExpr(e.o, ctx); const tn = t && t.__type; if ((tn === "datetime" || tn === "system.datetime") && /^now$/i.test(e.name)) return new Date(); if ((tn === "datetime" || tn === "system.datetime") && /^today$/i.test(e.name)) { const d = new Date(); d.setHours(0, 0, 0, 0); return d; } if (tn === "math" && /^pi$/i.test(e.name)) return Math.PI; throw new PSErr("The property '" + e.name + "' cannot be found on type [" + tn + "].", { term: true }); }
    case "scall": {
      const t = evalExpr(e.o, ctx); const tn = t && t.__type; const args = e.args.map((a) => evalExpr(a, ctx));
      if (tn === "math" || tn === "system.math") { const f = e.name.toLowerCase(); if (f === "round") { const p = Math.pow(10, args[1] || 0); return Math.round(+args[0] * p) / p; } if (f === "floor") return Math.floor(+args[0]); if (f === "ceiling") return Math.ceil(+args[0]); if (f === "max") return Math.max(+args[0], +args[1]); if (f === "min") return Math.min(+args[0], +args[1]); if (f === "abs") return Math.abs(+args[0]); }
      if ((tn === "string" || tn === "system.string") && /^isnullorempty$/i.test(e.name)) return args[0] === null || args[0] === undefined || args[0] === "";
      if ((tn === "string" || tn === "system.string") && /^join$/i.test(e.name)) return flat(args[1]).map((x) => toStr(x)).join(String(args[0]));
      if ((tn === "datetime" || tn === "system.datetime") && /^parse$/i.test(e.name)) return new Date(args[0]);
      throw new PSErr("Method invocation failed because [" + tn + "] does not contain a method named '" + e.name + "'.", { term: true });
    }
  }
  throw new PSErr("Unsupported expression.", { term: true });
}
function cast(type, e, ctx) {
  if (type === "ordered" ) { if (e.t !== "hash") throw new PSErr("The ordered attribute can be specified only on a hash literal node.", { parse: true, term: true }); const h = evalExpr(e, ctx); return ht(Object.assign({}, h), true); }
  const v = evalExpr(e, ctx);
  switch (type) {
    case "pscustomobject": case "psobject": { if (isHT(v)) return obj("System.Management.Automation.PSCustomObject", Object.assign({}, v)); return v; }
    case "int": case "int32": case "long": { if (v === null) return 0; const n = typeof v === "boolean" ? +v : Math.round(+v); if (isNaN(n)) throw new PSErr("Cannot convert value \"" + toStr(v) + "\" to type \"System.Int32\". Error: \"The input string '" + toStr(v) + "' was not in a correct format.\"", { term: true }); return n; }
    case "double": case "decimal": { const n = +v; if (isNaN(n)) throw new PSErr("Cannot convert value \"" + toStr(v) + "\" to type \"System.Double\".", { term: true }); return n; }
    case "string": return toStr(v);
    case "bool": case "boolean": return truthy(v);
    case "datetime": { if (v instanceof Date) return v; const d = new Date(v); if (isNaN(d)) throw new PSErr("Cannot convert value \"" + toStr(v) + "\" to type \"System.DateTime\". Error: \"String '" + toStr(v) + "' was not recognized as a valid DateTime.\"", { term: true }); return d; }
    case "array": case "object[]": return flat(v);
  }
  throw new PSErr("Unable to find type [" + type + "].", { term: true });
}
function compare(op, a, b) {
  const cs = op.startsWith("c") && op !== "contains";
  const base = op.replace(/^[ci](?=eq|ne|like|match)/, "");
  if (base === "replace") { const [p, r] = flat(b); return toStr(a).replace(new RegExp(String(p), "gi"), r === undefined ? "" : String(r).replace(/\$(\d)/g, "$$$1")); }
  if (base === "split") return toStr(a).split(new RegExp(String(b), "i"));
  if (base === "join") return flat(a).map((x) => toStr(x)).join(String(b));
  if (base === "contains" || base === "notcontains") { const r = flat(a).some((x) => eqVals(x, b, false)); return base === "contains" ? r : !r; }
  if (base === "in" || base === "notin") { const r = flat(b).some((x) => eqVals(x, a, false)); return base === "in" ? r : !r; }
  if (base === "is" || base === "isnot") { const tn = b && b.__type; const t = (typeName(a) || "").toLowerCase(); const r = tn ? t.endsWith(tn.replace(/^system\./, "")) || t === tn : false; return base === "is" ? r : !r; }
  const one = (x) => {
    switch (base) {
      case "eq": return eqVals(x, b, cs);
      case "ne": return !eqVals(x, b, cs);
      case "gt": return x !== null && x !== undefined && cmpVals(x, b, cs) > 0;
      case "ge": return x !== null && x !== undefined && cmpVals(x, b, cs) >= 0;
      case "lt": return x === null || x === undefined ? b !== null && b !== undefined : cmpVals(x, b, cs) < 0;
      case "le": return x === null || x === undefined ? true : cmpVals(x, b, cs) <= 0;
      case "like": return wildRe(toStr(b)).test(toStr(x));
      case "notlike": return !wildRe(toStr(b)).test(toStr(x));
      case "match": return new RegExp(toStr(b), cs ? "" : "i").test(toStr(x));
      case "notmatch": return !new RegExp(toStr(b), cs ? "" : "i").test(toStr(x));
    }
    throw new PSErr("Unknown operator -" + op, { term: true });
  };
  if (Array.isArray(a)) return a.filter(one);
  return one(a);
}

function needMg(ctx, cmd, sub, any) {
  if (!ctx.mg) throw new PSErr("Authentication needed. Please call Connect-MgGraph.", { cmd: cmd + "_" + sub, term: true, kind: "auth" });
  if (any && !any.some((s) => ctx.mg.scopes.some((x) => x.toLowerCase() === s.toLowerCase()))) throw new PSErr("Insufficient privileges to complete the operation.\n\nStatus: 403 (Forbidden)\nErrorCode: Authorization_RequestDenied", { cmd: cmd + "_" + sub, term: true, kind: "scope" });
}
function clone(o) {
  if (Array.isArray(o)) return o.map(clone);
  if (o instanceof Date) return new Date(o);
  if (o && typeof o === "object") { const c = obj(o[TYPE], {}); if (isHT(o)) Object.defineProperty(c, HT, { value: true }); for (const k of Object.keys(o)) c[k] = clone(o[k]); return c; }
  return o;
}
function project(u, props, defaults) {
  const keys = Object.keys(u);
  const want = props ? props : defaults;
  const c = obj(u[TYPE], {});
  for (const k of keys) c[k] = want.some((w) => w.toLowerCase() === k.toLowerCase()) ? clone(u[k]) : (Array.isArray(u[k]) ? [] : null);
  return c;
}
function propList(b, cname, typeLabel, sample) {
  if (b.Property === undefined) return null;
  const list = flat(b.Property).flatMap((x) => String(x).split(",")).map((x) => x.trim()).filter(Boolean);
  const keys = Object.keys(sample);
  const out = [];
  for (const p of list) {
    if (p === "*") { out.push(...keys); continue; }
    const k = keys.find((x) => x.toLowerCase() === p.toLowerCase());
    if (!k) throw new PSErr("Could not find a property named '" + p + "' on type '" + typeLabel + "'.\n\nStatus: 400 (BadRequest)\nErrorCode: Request_BadRequest", { cmd: cname, term: true, kind: "badprop" });
    out.push(k);
  }
  if (!out.some((x) => x === "Id")) out.push("Id");
  return out;
}
function odataFilter(f, cname) {
  const src = String(f).trim();
  const parts = src.split(/\s+(and|or)\s+/i);
  const tests = [];
  const ops = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) { ops.push(parts[i].toLowerCase()); continue; }
    const p = parts[i].trim();
    let m = /^([A-Za-z]+)\s+(eq|ne)\s+(?:'([^']*)'|(true|false|null))$/i.exec(p);
    if (m) {
      const prop = m[1], op = m[2].toLowerCase(), val = m[3] !== undefined ? m[3] : m[4] === "null" ? null : m[4] === "true";
      if (op === "ne") tests.push({ needsAdv: true, fn: (u) => !eqVals(u[propKey(u, prop)], val) });
      else tests.push({ fn: (u) => { const k = propKey(u, prop); return k !== null && eqVals(u[k], val); }, prop });
      continue;
    }
    m = /^startswith\(\s*([A-Za-z]+)\s*,\s*'([^']*)'\s*\)$/i.exec(p);
    if (m) { const prop = m[1], val = m[2].toLowerCase(); tests.push({ fn: (u) => { const k = propKey(u, prop); return k !== null && u[k] !== null && String(u[k]).toLowerCase().startsWith(val); } }); continue; }
    throw new PSErr("Invalid filter clause: Syntax error at position " + (src.indexOf(p) + 1) + " in '" + src + "'.\n\nStatus: 400 (BadRequest)\nErrorCode: BadRequest", { cmd: cname, term: true, kind: "filter" });
  }
  return { adv: tests.some((t) => t.needsAdv), fn: (u) => { let r = tests[0].fn(u); for (let i = 0; i < ops.length; i++) r = ops[i] === "and" ? r && tests[i + 1].fn(u) : r || tests[i + 1].fn(u); return r; } };
}

const P = (pos, extra) => Object.assign({ kind: "value" }, pos === null ? {} : { pos }, extra || {});
const S = (extra) => Object.assign({ kind: "switch" }, extra || {});

def("Connect-MgGraph", { module: "Microsoft.Graph.Authentication", ver: "2.25.0", ctype: "Cmdlet", params: { Scopes: P(0, { type: "System.String[]" }), TenantId: P(null), NoWelcome: S(), ClientId: P(null), UseDeviceCode: S(), ContextScope: P(null) },
  run({ ctx, b }) {
    const add = flat(b.Scopes).flatMap((s) => String(s).split(",")).map((s) => s.trim()).filter(Boolean);
    const scopes = Array.from(new Set((ctx.mg ? ctx.mg.scopes : ["openid", "profile", "User.Read", "email"]).concat(add)));
    ctx.mg = { scopes, account: "kaatje@" + ctx.t.domain };
    if (!b.NoWelcome) ctx.host.push({ text: "Welcome to Microsoft Graph!\n\nConnected via delegated access using 14d82eec-204b-4c2f-b7e8-296a70dab67e\nReadme: https://aka.ms/graph/sdk/powershell\nSDK Docs: https://aka.ms/graph/sdk/powershell/docs\nAPI Docs: https://aka.ms/graph/docs\n\nNOTE: You can use the -NoWelcome parameter to suppress this message." });
    return [];
  } });
def("Disconnect-MgGraph", { module: "Microsoft.Graph.Authentication", ver: "2.25.0", ctype: "Cmdlet", run({ ctx }) { if (!ctx.mg) throw new PSErr("No application to sign out from.", { cmd: "Disconnect-MgGraph", term: true }); ctx.mg = null; return [obj("Microsoft.Graph.PowerShell.Authentication.AuthContext", { ClientId: "14d82eec-204b-4c2f-b7e8-296a70dab67e", TenantId: ctx.t.tenantId, Account: "kaatje@" + ctx.t.domain })]; } });
def("Get-MgContext", { module: "Microsoft.Graph.Authentication", ver: "2.25.0", ctype: "Cmdlet", run({ ctx }) { if (!ctx.mg) return []; return [obj("Microsoft.Graph.PowerShell.Authentication.AuthContext", { ClientId: "14d82eec-204b-4c2f-b7e8-296a70dab67e", TenantId: ctx.t.tenantId, Scopes: ctx.mg.scopes.slice(), AuthType: "Delegated", Account: ctx.mg.account, AppName: "Microsoft Graph Command Line Tools", ContextScope: "CurrentUser", Environment: "Global" })]; } });

const USER_READ = ["User.Read.All", "User.ReadWrite.All", "Directory.Read.All", "Directory.ReadWrite.All", "User.ReadBasic.All"];
def("Get-MgUser", { module: "Microsoft.Graph.Users", ver: "2.25.0", ctype: "Function", pipe: false, params: { UserId: P(null, { alias: ["Id"] }), All: S(), Property: P(null, { type: "System.String[]", alias: ["Select"] }), Filter: P(null), Top: P(null, { type: "System.Int32" }), ConsistencyLevel: P(null), CountVariable: P(null), Search: P(null), Sort: P(null), ExpandProperty: P(null) },
  run({ ctx, b, name, emitErr }) {
    const sub = b.UserId !== undefined ? "Get" : "List";
    needMg(ctx, name, sub, USER_READ);
    const props = propList(b, name + "_" + sub, "Microsoft.DirectoryServices.User", ctx.t.users[0]);
    if (props && props.some((p) => p === "SignInActivity") && !ctx.mg.scopes.some((s) => /^AuditLog\.Read\.All$/i.test(s))) throw new PSErr("Neither tenant is B2C or tenant doesn't have premium license\n\nStatus: 403 (Forbidden)\nErrorCode: Authentication_RequestFromNonPremiumTenantOrB2CTenant", { cmd: name + "_" + sub, term: true, kind: "scope" });
    if (b.UserId !== undefined) {
      const id = String(b.UserId).toLowerCase();
      const u = ctx.t.users.find((x) => x.Id.toLowerCase() === id || x.UserPrincipalName.toLowerCase() === id);
      if (!u) { emitErr("Resource '" + b.UserId + "' does not exist or one of its queried reference-property objects are not present.\n\nStatus: 404 (NotFound)\nErrorCode: Request_ResourceNotFound", name + "_Get", "notfound404"); return []; }
      return [project(u, props, USER_DEFAULT)];
    }
    let list = ctx.t.users;
    if (b.Filter !== undefined) {
      const f = odataFilter(b.Filter, name + "_List");
      if (f.adv && !b.ConsistencyLevel) throw new PSErr("Unsupported or invalid query filter clause specified for property 'ne' of resource 'User'.\n\nStatus: 400 (BadRequest)\nErrorCode: Request_UnsupportedQuery", { cmd: name + "_List", term: true, kind: "filter" });
      list = list.filter(f.fn);
    }
    if (b.Top !== undefined) list = list.slice(0, +b.Top);
    else if (!b.All) list = list.slice(0, 100);
    return list.map((u) => project(u, props, USER_DEFAULT));
  } });
def("Update-MgUser", { module: "Microsoft.Graph.Users", ver: "2.25.0", ctype: "Function", pipe: true, whatif: true, params: { UserId: P(0, { req: true, pipe: true }), AccountEnabled: S(), Department: P(null), JobTitle: P(null), DisplayName: P(null), UsageLocation: P(null), OfficeLocation: P(null), MobilePhone: P(null), CompanyName: P(null), City: P(null) },
  run({ ctx, b, name, input, emitErr }) {
    needMg(ctx, name, "UpdateExpanded");
    const ids = b.UserId !== undefined ? flat(b.UserId) : input.map((x) => x.Id);
    for (const idv of ids) {
      if (b.WhatIf) { ctx.host.push({ text: "What if: Performing the operation \"Update-MgUser_UpdateExpanded\" on target \"Update-MgUser_UpdateExpanded\"." }); continue; }
      if (!ctx.mg.scopes.some((s) => /^(User\.ReadWrite\.All|Directory\.ReadWrite\.All)$/i.test(s))) throw new PSErr("Insufficient privileges to complete the operation.\n\nStatus: 403 (Forbidden)\nErrorCode: Authorization_RequestDenied", { cmd: name + "_UpdateExpanded", term: true, kind: "scope" });
      const id = String(idv).toLowerCase();
      const u = ctx.t.users.find((x) => x.Id.toLowerCase() === id || x.UserPrincipalName.toLowerCase() === id);
      if (!u) { emitErr("Resource '" + idv + "' does not exist or one of its queried reference-property objects are not present.\n\nStatus: 404 (NotFound)\nErrorCode: Request_ResourceNotFound", name + "_UpdateExpanded", "notfound404"); continue; }
      for (const k of ["AccountEnabled", "Department", "JobTitle", "DisplayName", "UsageLocation", "OfficeLocation", "MobilePhone", "CompanyName", "City"]) if (b[k] !== undefined) u[k] = b[k];
    }
    return [];
  } });
def("Revoke-MgUserSignInSession", { module: "Microsoft.Graph.Users.Actions", ver: "2.25.0", ctype: "Function", pipe: true, whatif: true, params: { UserId: P(0, { req: true, pipe: true }) },
  run({ ctx, b, name, input, emitErr }) {
    needMg(ctx, name, "Revoke");
    const ids = b.UserId !== undefined ? flat(b.UserId) : input.map((x) => x.Id);
    const out = [];
    for (const idv of ids) {
      if (b.WhatIf) { ctx.host.push({ text: "What if: Performing the operation \"Revoke-MgUserSignInSession_Revoke\" on target \"Revoke-MgUserSignInSession_Revoke\"." }); continue; }
      if (!ctx.mg.scopes.some((s) => /^(User\.ReadWrite\.All|Directory\.ReadWrite\.All|User\.RevokeSessions\.All)$/i.test(s))) throw new PSErr("Insufficient privileges to complete the operation.\n\nStatus: 403 (Forbidden)\nErrorCode: Authorization_RequestDenied", { cmd: name + "_Revoke", term: true, kind: "scope" });
      const id = String(idv).toLowerCase();
      const u = ctx.t.users.find((x) => x.Id.toLowerCase() === id || x.UserPrincipalName.toLowerCase() === id);
      if (!u) { emitErr("Resource '" + idv + "' does not exist or one of its queried reference-property objects are not present.\n\nStatus: 404 (NotFound)\nErrorCode: Request_ResourceNotFound", name + "_Revoke", "notfound404"); continue; }
      ctx.t.revoked = ctx.t.revoked || {};
      ctx.t.revoked[u.UserPrincipalName.toLowerCase()] = { afterBlock: u.AccountEnabled === false };
      out.push(true);
    }
    return out;
  } });
def("Disconnect-ExchangeOnline", { module: "ExchangeOnlineManagement", ver: "3.6.0", ctype: "Function", whatif: true, params: {},
  run({ ctx, b }) { if (b.Confirm !== false) ctx.host.push({ text: "Confirm\nAre you sure you want to perform this action?\n(lab: answered Yes. Add -Confirm:$false in scripts so nothing waits for you.)" }); ctx.exo = false; return []; } });
def("Get-MgUserLicenseDetail", { module: "Microsoft.Graph.Users", ver: "2.25.0", ctype: "Function", params: { UserId: P(0, { req: true }), All: S(), Property: P(null) },
  run({ ctx, b, name }) {
    needMg(ctx, name, "List", USER_READ);
    const id = String(b.UserId).toLowerCase();
    const u = ctx.t.users.find((x) => x.Id.toLowerCase() === id || x.UserPrincipalName.toLowerCase() === id);
    if (!u) throw new PSErr("Resource '" + b.UserId + "' does not exist or one of its queried reference-property objects are not present.\n\nStatus: 404 (NotFound)\nErrorCode: Request_ResourceNotFound", { cmd: name + "_List", term: true });
    return u.AssignedLicenses.map((l) => { const s = SKUS.find((x) => x.id === l.SkuId); return obj(GM + "MicrosoftGraphLicenseDetails", { Id: "lic_" + s.part.toLowerCase(), ServicePlans: [], SkuId: s.id, SkuPartNumber: s.part }); });
  } });
def("Get-MgSubscribedSku", { module: "Microsoft.Graph.Identity.DirectoryManagement", ver: "2.25.0", ctype: "Function", params: { All: S(), Property: P(null), SubscribedSkuId: P(null) },
  run({ ctx, name }) { needMg(ctx, name, "List", ["Organization.Read.All", "Directory.Read.All", "Directory.ReadWrite.All", "LicenseAssignment.Read.All"]); return ctx.t.skus.map((s) => { const c = clone(s); c.ConsumedUnits = ctx.t.users.filter((u) => u.AssignedLicenses.some((l) => l.SkuId === s.SkuId)).length; return c; }); } });
def("Get-MgDirectoryRole", { module: "Microsoft.Graph.Identity.DirectoryManagement", ver: "2.25.0", ctype: "Function", params: { DirectoryRoleId: P(null), All: S(), Filter: P(null), Property: P(null) },
  run({ ctx, b, name }) {
    needMg(ctx, name, b.DirectoryRoleId ? "Get" : "List", ["RoleManagement.Read.Directory", "Directory.Read.All", "Directory.ReadWrite.All", "RoleManagement.ReadWrite.Directory"]);
    let roles = ctx.t.roles.map((r) => clone(r.role));
    if (b.DirectoryRoleId) { roles = roles.filter((r) => r.Id === String(b.DirectoryRoleId)); if (!roles.length) throw new PSErr("Resource '" + b.DirectoryRoleId + "' does not exist or one of its queried reference-property objects are not present.\n\nStatus: 404 (NotFound)\nErrorCode: Request_ResourceNotFound", { cmd: name + "_Get", term: true }); }
    if (b.Filter) { const f = odataFilter(b.Filter, name + "_List"); roles = roles.filter(f.fn); }
    return roles;
  } });
def("Get-MgDirectoryRoleMember", { module: "Microsoft.Graph.Identity.DirectoryManagement", ver: "2.25.0", ctype: "Function", params: { DirectoryRoleId: P(0, { req: true }), All: S(), Top: P(null) },
  run({ ctx, b, name }) {
    needMg(ctx, name, "List", ["RoleManagement.Read.Directory", "Directory.Read.All", "Directory.ReadWrite.All", "RoleManagement.ReadWrite.Directory"]);
    const r = ctx.t.roles.find((x) => x.role.Id === String(b.DirectoryRoleId));
    if (!r) throw new PSErr("Resource '" + b.DirectoryRoleId + "' does not exist or one of its queried reference-property objects are not present.\n\nStatus: 404 (NotFound)\nErrorCode: Request_ResourceNotFound", { cmd: name + "_List", term: true });
    return r.members.map((i) => { const u = ctx.t.users[i]; return obj(GM + "MicrosoftGraphDirectoryObject", { DeletedDateTime: null, Id: u.Id, AdditionalProperties: ht({ "@odata.type": "#microsoft.graph.user", displayName: u.DisplayName, userPrincipalName: u.UserPrincipalName, accountEnabled: u.AccountEnabled }) }); });
  } });
def("Get-MgDevice", { module: "Microsoft.Graph.Identity.DirectoryManagement", ver: "2.25.0", ctype: "Function", params: { DeviceId: P(null), All: S(), Filter: P(null), Top: P(null), Property: P(null) },
  run({ ctx, b, name }) {
    needMg(ctx, name, "List", ["Device.Read.All", "Directory.Read.All", "Directory.ReadWrite.All"]);
    let d = ctx.t.devices.map(clone);
    if (b.Filter) { const f = odataFilter(b.Filter, name + "_List"); d = d.filter(f.fn); }
    if (b.Top !== undefined) d = d.slice(0, +b.Top); else if (!b.All) d = d.slice(0, 100);
    return d;
  } });
def("Connect-ExchangeOnline", { module: "ExchangeOnlineManagement", ver: "3.6.0", ctype: "Function", params: { UserPrincipalName: P(null), ShowBanner: S(), Organization: P(null), Device: S() },
  run({ ctx, b }) { ctx.exo = true; if (b.ShowBanner !== false) ctx.host.push({ text: "----------------------------------------------------------------------------------------\nThis V3 EXO PowerShell module contains new REST API backed Exchange Online cmdlets which doesn't require WinRM for Client-Server communication. You can now run these cmdlets after turning off WinRM Basic Auth in your client machine thus making it more secure.\n\nUnlike the EXO* prefixed cmdlets, the cmdlets in this module support full functional parity with the RPS (V1) cmdlets.\n\nV3 cmdlets in the downloaded module are resilient to transient failures, handling retries and throttling errors inherently.\n----------------------------------------------------------------------------------------" }); return []; } });
def("Get-EXOMailbox", { module: "ExchangeOnlineManagement", ver: "3.6.0", ctype: "Function", params: { Identity: P(0), ResultSize: P(null), RecipientTypeDetails: P(null, { type: "System.String[]" }), Properties: P(null), PropertySets: P(null), Filter: P(null) },
  run({ ctx, b, name }) {
    if (!ctx.exo) throw new PSErr("You must call the Connect-ExchangeOnline cmdlet before calling any other cmdlets.", { cmd: name, term: true, kind: "noexo" });
    let m = ctx.t.mailboxes.map(clone);
    if (b.Identity !== undefined) { const id = String(b.Identity).toLowerCase(); m = m.filter((x) => x.PrimarySmtpAddress.toLowerCase() === id || x.DisplayName.toLowerCase() === id || x.Alias.toLowerCase() === id); if (!m.length) throw new PSErr("||The operation couldn't be performed because object '" + b.Identity + "' couldn't be found on '" + "AM6PR01A001DC01.EURPR01A001.PROD.OUTLOOK.COM" + "'.", { cmd: name, term: true }); }
    if (b.RecipientTypeDetails !== undefined) { const kinds = flat(b.RecipientTypeDetails).map((x) => String(x).toLowerCase()); const valid = ["usermailbox", "sharedmailbox", "roommailbox", "equipmentmailbox"]; for (const k of kinds) if (!valid.includes(k)) throw new PSErr("Cannot bind parameter 'RecipientTypeDetails'. Cannot convert value \"" + k + "\" to type \"Microsoft.Exchange.Data.Directory.Recipient.RecipientTypeDetails\".", { cmd: name, term: true }); m = m.filter((x) => kinds.includes(x.RecipientTypeDetails.toLowerCase())); }
    if (b.ResultSize !== undefined && !/^unlimited$/i.test(String(b.ResultSize))) m = m.slice(0, +b.ResultSize);
    return m;
  } });

def("Where-Object", { module: "Microsoft.PowerShell.Core", ver: "7.4.6", ctype: "Cmdlet", pipe: true, params: { FilterScript: P(0), Property: P(null), Value: P(1), EQ: S(), NE: S(), GT: S(), GE: S(), LT: S(), LE: S(), Like: S(), NotLike: S(), Match: S(), NotMatch: S(), Contains: S(), In: S(), CEQ: S(), Not: S() },
  run({ ctx, b, input, name }) {
    let fs = b.FilterScript;
    if (b.Property instanceof SB) { fs = b.Property; delete b.Property; }
    if (fs instanceof SB) return input.filter((x) => truthy(unwrap(runSB(fs, ctx, x))));
    const prop = b.Property !== undefined ? b.Property : fs;
    if (prop === undefined) throw new PSErr("Cannot process command because of one or more missing mandatory parameters: FilterScript.", { cmd: name, term: true });
    const opName = ["EQ", "NE", "GT", "GE", "LT", "LE", "Like", "NotLike", "Match", "NotMatch", "Contains", "In", "CEQ", "Not"].find((o) => b[o]);
    if (opName === "Not") return input.filter((x) => !truthy(getMember(x, String(prop))));
    if (!opName) return input.filter((x) => truthy(getMember(x, String(prop))));
    if (b.Value === undefined) throw new PSErr("The specified operator requires both the -Property and -Value parameters. Provide values for both parameters, and then try the command again.", { cmd: name, term: true });
    return input.filter((x) => truthy(compare(opName.toLowerCase(), getMember(x, String(prop)), b.Value)));
  } });
function calcProps(list, ctx, cname) {
  return flat(list).map((p) => {
    if (isHT(p)) {
      let label = null, ex = null;
      for (const k of Object.keys(p)) {
        const l = k.toLowerCase();
        if (["n", "name", "l", "label"].includes(l)) label = toStr(p[k]);
        else if (["e", "expression"].includes(l)) ex = p[k];
        else throw new PSErr("The \"" + k + "\" key is not valid.", { cmd: cname, term: true });
      }
      if (ex === null) throw new PSErr("The \"expression\" key has a type, System.Object, that is not valid; expected types are {System.String, System.Management.Automation.ScriptBlock}.", { cmd: cname, term: true });
      if (label === null) label = ex instanceof SB ? ex.src.slice(1, -1).trim() : String(ex);
      return { label, get: (o) => ex instanceof SB ? unwrap(runSB(ex, ctx, o)) : getMember(o, String(ex)) };
    }
    if (p instanceof SB) return { label: p.src.slice(1, -1).trim(), get: (o) => unwrap(runSB(p, ctx, o)) };
    return { name: String(p) };
  });
}
function expandNames(specs, sample) {
  const out = [];
  for (const s of specs) {
    if (s.label !== undefined) { out.push(s); continue; }
    if (hasWild(s.name)) { const re = wildRe(s.name); const keys = sample && typeof sample === "object" ? Object.keys(sample) : []; for (const k of keys) if (re.test(k)) out.push({ label: k, get: (o) => getMember(o, k) }); continue; }
    const k = sample && typeof sample === "object" ? propKey(sample, s.name) : null;
    const label = k || s.name;
    out.push({ label, get: (o) => getMember(o, s.name) });
  }
  return out;
}
def("Select-Object", { module: "Microsoft.PowerShell.Utility", ver: "7.0.0.0", ctype: "Cmdlet", pipe: true, params: { Property: P(0, { type: "System.Object[]" }), ExcludeProperty: P(null), ExpandProperty: P(null), First: P(null, { type: "System.Int32" }), Last: P(null, { type: "System.Int32" }), Skip: P(null, { type: "System.Int32" }), Unique: S(), Index: P(null) },
  run({ ctx, b, input, name }) {
    let items = input.slice();
    if (b.Unique && b.Property === undefined) items = items.filter((x, i) => items.findIndex((y) => eqVals(x, y, true) || (isObj(x) && isObj(y) && JSON.stringify(x) === JSON.stringify(y))) === i);
    if (b.Skip !== undefined) items = items.slice(+b.Skip);
    if (b.First !== undefined) items = items.slice(0, +b.First);
    if (b.Last !== undefined) items = items.slice(Math.max(0, items.length - +b.Last));
    if (b.ExpandProperty !== undefined) {
      const ep = String(b.ExpandProperty);
      const res = [];
      for (const x of items) { if (!isObj(x) || !hasProp(x, ep)) throw new PSErr("Property \"" + ep + "\" cannot be found.", { cmd: name, term: false, kind: "expand" }); const v = getMember(x, ep); if (Array.isArray(v)) res.push(...v); else res.push(v); }
      return res;
    }
    if (b.Property === undefined) return items;
    const specs = calcProps(b.Property, ctx, name);
    const ex = b.ExcludeProperty !== undefined ? flat(b.ExcludeProperty).map((x) => wildRe(String(x))) : [];
    const out = items.map((x) => {
      const cols = expandNames(specs, x).filter((c) => !ex.some((re) => re.test(c.label)));
      const t = typeName(x);
      const o = obj("Selected." + (t || "System.Object"), {});
      for (const c of cols) { const v = c.get(x); o[c.label] = v === undefined ? null : v; }
      return o;
    });
    if (b.Unique) return out.filter((x, i) => out.findIndex((y) => JSON.stringify(y) === JSON.stringify(x)) === i);
    return out;
  } });
function sortKeys(b, ctx, name) {
  if (b.Property === undefined) return [{ get: (o) => o, desc: !!b.Descending }];
  return flat(b.Property).map((p) => {
    if (isHT(p)) { const ek = Object.keys(p).find((k) => /^(e|expression)$/i.test(k)); const dk = Object.keys(p).find((k) => /^desc/i.test(k)); const ak = Object.keys(p).find((k) => /^asc/i.test(k)); const ex = p[ek]; return { get: (o) => ex instanceof SB ? unwrap(runSB(ex, ctx, o)) : getMember(o, String(ex)), desc: dk ? truthy(p[dk]) : ak ? !truthy(p[ak]) : !!b.Descending }; }
    if (p instanceof SB) return { get: (o) => unwrap(runSB(p, ctx, o)), desc: !!b.Descending };
    return { get: (o) => getMember(o, String(p)), desc: !!b.Descending };
  });
}
def("Sort-Object", { module: "Microsoft.PowerShell.Utility", ver: "7.0.0.0", ctype: "Cmdlet", pipe: true, params: { Property: P(0, { type: "System.Object[]" }), Descending: S(), Unique: S(), Top: P(null), Bottom: P(null), CaseSensitive: S() },
  run({ ctx, b, input, name }) {
    const keys = sortKeys(b, ctx, name);
    const rows = input.map((x, i) => ({ x, i, k: keys.map((k) => k.get(x)) }));
    rows.sort((p, q) => { for (let j = 0; j < keys.length; j++) { const c = cmpVals(p.k[j], q.k[j], !!b.CaseSensitive); if (c) return keys[j].desc ? -c : c; } return p.i - q.i; });
    let out = rows.map((r) => r.x);
    if (b.Unique) out = out.filter((x, i) => i === 0 || keys.some((k) => cmpVals(k.get(x), k.get(out[i - 1])) !== 0));
    if (b.Top !== undefined) out = out.slice(0, +b.Top);
    if (b.Bottom !== undefined) out = out.slice(-(+b.Bottom));
    return out;
  } });
def("Group-Object", { module: "Microsoft.PowerShell.Utility", ver: "7.0.0.0", ctype: "Cmdlet", pipe: true, params: { Property: P(0, { type: "System.Object[]" }), NoElement: S(), AsHashTable: S(), AsString: S(), CaseSensitive: S() },
  run({ ctx, b, input, name }) {
    const keys = b.Property === undefined ? [{ get: (o) => o }] : flat(b.Property).map((p) => p instanceof SB ? { get: (o) => unwrap(runSB(p, ctx, o)) } : isHT(p) ? (() => { const ek = Object.keys(p).find((k) => /^(e|expression)$/i.test(k)); const ex = p[ek]; return { get: (o) => ex instanceof SB ? unwrap(runSB(ex, ctx, o)) : getMember(o, String(ex)) }; })() : { get: (o) => getMember(o, String(p)) });
    const groups = [];
    for (const x of input) {
      const vals = keys.map((k) => k.get(x));
      const gname = vals.map((v) => toStr(v)).join(", ");
      let g = groups.find((gg) => b.CaseSensitive ? gg.name === gname : gg.name.toLowerCase() === gname.toLowerCase());
      if (!g) { g = { name: gname, vals, items: [] }; groups.push(g); }
      g.items.push(x);
    }
    if (b.AsHashTable) { const h = ht({}); for (const g of groups) h[g.name] = g.items.length === 1 ? g.items[0] : g.items; return [h]; }
    return groups.map((g) => b.NoElement ? obj("Microsoft.PowerShell.Commands.GroupInfoNoElement", { Count: g.items.length, Name: g.name }) : obj("Microsoft.PowerShell.Commands.GroupInfo", { Count: g.items.length, Name: g.name, Values: g.vals, Group: g.items }));
  } });
def("Measure-Object", { module: "Microsoft.PowerShell.Utility", ver: "7.0.0.0", ctype: "Cmdlet", pipe: true, params: { Property: P(0, { type: "System.String[]" }), Sum: S(), Average: S(), Maximum: S(), Minimum: S(), AllStats: S(), StandardDeviation: S() },
  run({ b, input, name }) {
    const props = b.Property === undefined ? [null] : flat(b.Property).map(String);
    const all = !!b.AllStats;
    return props.map((p) => {
      const vals = p === null ? input : input.filter((x) => isObj(x) && hasProp(x, p)).map((x) => getMember(x, p));
      if (p !== null && input.length && !vals.length) throw new PSErr("The property \"" + p + "\" cannot be found in the input for any objects.", { cmd: name, term: false, kind: "measure" });
      const need = b.Sum || b.Average || b.Maximum || b.Minimum || all || b.StandardDeviation;
      let nums = [];
      if (need) for (const v of vals) { if (v === null || v === undefined) continue; const n = typeof v === "boolean" ? +v : +v; if (isNaN(n) && !(b.Maximum || b.Minimum) ) throw new PSErr("Input object \"" + toStr(v) + "\" is not numeric.", { cmd: name, term: false, kind: "measure" }); nums.push(isNaN(n) ? v : n); }
      const numeric = nums.filter((n) => typeof n === "number");
      const sum = numeric.reduce((a, c) => a + c, 0);
      const r = obj("Microsoft.PowerShell.Commands.GenericMeasureInfo", { Count: p === null ? input.length : vals.filter((v) => v !== null && v !== undefined).length, Average: null, Sum: null, Maximum: null, Minimum: null, StandardDeviation: null, Property: p });
      if (b.Sum || all) r.Sum = sum;
      if (b.Average || all) r.Average = numeric.length ? sum / numeric.length : null;
      if (b.Maximum || all) r.Maximum = nums.length ? nums.reduce((a, c) => cmpVals(c, a) > 0 ? c : a) : null;
      if (b.Minimum || all) r.Minimum = nums.length ? nums.reduce((a, c) => cmpVals(c, a) < 0 ? c : a) : null;
      if (b.StandardDeviation || all) { const avg = numeric.length ? sum / numeric.length : 0; r.StandardDeviation = numeric.length > 1 ? Math.sqrt(numeric.reduce((a, c) => a + (c - avg) * (c - avg), 0) / (numeric.length - 1)) : null; }
      return r;
    });
  } });
def("ForEach-Object", { module: "Microsoft.PowerShell.Core", ver: "7.4.6", ctype: "Cmdlet", pipe: true, params: { Process: P(0, { type: "System.Management.Automation.ScriptBlock[]" }), Begin: P(null), End: P(null), MemberName: P(0) },
  run({ ctx, b, input, name }) {
    const out = [];
    if (b.Begin instanceof SB) out.push(...runSB(b.Begin, ctx));
    const pr = b.Process !== undefined ? b.Process : b.MemberName;
    if (pr instanceof SB) for (const x of input) out.push(...runSB(pr, ctx, x));
    else if (pr !== undefined) for (const x of input) { const v = getMember(x, String(pr)); if (v !== null) { if (Array.isArray(v)) out.push(...v); else out.push(v); } }
    else if (!(b.End instanceof SB) && !(b.Begin instanceof SB)) throw new PSErr("Cannot process command because of one or more missing mandatory parameters: Process.", { cmd: name, term: true });
    if (b.End instanceof SB) out.push(...runSB(b.End, ctx));
    return out;
  } });
function csvCell(v) { const s = v === null || v === undefined ? "" : typeof v === "object" && !(v instanceof Date) ? (Array.isArray(v) ? "System.Object[]" : toStr(v)) : toStr(v); return "\"" + s.replace(/"/g, "\"\"") + "\""; }
function toCsv(input, delim) {
  if (!input.length) return [];
  const first = input[0];
  const cols = isObj(first) ? Object.keys(first) : ["Length"];
  const lines = [cols.map((c) => "\"" + c + "\"").join(delim)];
  for (const x of input) lines.push(cols.map((c) => csvCell(isObj(x) ? getMember(x, c) : c === "Length" ? toStr(x).length : null)).join(delim));
  return lines;
}
def("Export-Csv", { module: "Microsoft.PowerShell.Utility", ver: "7.0.0.0", ctype: "Cmdlet", pipe: true, params: { Path: P(0, { req: true }), NoTypeInformation: S(), Delimiter: P(null), Append: S(), Force: S(), Encoding: P(null), UseQuotes: P(null) },
  run({ ctx, b, input }) {
    const p = ctx.path(b.Path);
    const lines = toCsv(input, b.Delimiter ? String(b.Delimiter) : ",");
    if (b.Append && ctx.fs[p]) ctx.fs[p] = { text: ctx.fs[p].text + "\n" + lines.slice(1).join("\n"), at: new Date() };
    else ctx.fs[p] = { text: lines.join("\n"), at: new Date() };
    return [];
  } });
def("ConvertTo-Csv", { module: "Microsoft.PowerShell.Utility", ver: "7.0.0.0", ctype: "Cmdlet", pipe: true, params: { NoTypeInformation: S(), Delimiter: P(null) }, run({ b, input }) { return toCsv(input, b.Delimiter ? String(b.Delimiter) : ","); } });
function parseCsvLine(line, d) { const out = []; let cur = "", q = false; for (let i = 0; i < line.length; i++) { const c = line[i]; if (q) { if (c === "\"" && line[i + 1] === "\"") { cur += "\""; i++; } else if (c === "\"") q = false; else cur += c; } else if (c === "\"") q = true; else if (c === d) { out.push(cur); cur = ""; } else cur += c; } out.push(cur); return out; }
def("Import-Csv", { module: "Microsoft.PowerShell.Utility", ver: "7.0.0.0", ctype: "Cmdlet", params: { Path: P(0, { req: true }), Delimiter: P(null), Header: P(null) },
  run({ ctx, b, name }) {
    const p = ctx.path(b.Path);
    const f = ctx.fs[p];
    if (!f) throw new PSErr("Could not find file '" + p + "'.", { cmd: name, term: true, kind: "nofile" });
    const d = b.Delimiter ? String(b.Delimiter) : ",";
    const lines = f.text.split("\n").filter((l) => l.length);
    if (!lines.length) return [];
    const head = b.Header ? flat(b.Header).map(String) : parseCsvLine(lines[0], d);
    return lines.slice(b.Header ? 0 : 1).map((l) => { const v = parseCsvLine(l, d); const o = obj("System.Management.Automation.PSCustomObject", {}); head.forEach((h, i) => { o[h] = v[i] === undefined ? null : v[i]; }); return o; });
  } });
def("Get-Content", { module: "Microsoft.PowerShell.Management", ver: "7.0.0.0", ctype: "Cmdlet", params: { Path: P(0, { req: true }), TotalCount: P(null, { alias: ["First", "Head"] }), Tail: P(null) },
  run({ ctx, b, name }) { const p = ctx.path(b.Path); const f = ctx.fs[p]; if (!f) throw new PSErr("Cannot find path '" + p + "' because it does not exist.", { cmd: name, term: false, kind: "nofile" }); let l = f.text.split("\n"); if (b.TotalCount !== undefined) l = l.slice(0, +b.TotalCount); if (b.Tail !== undefined) l = l.slice(-(+b.Tail)); return l; } });
def("Get-ChildItem", { module: "Microsoft.PowerShell.Management", ver: "7.0.0.0", ctype: "Cmdlet", params: { Path: P(0), Filter: P(null) },
  run({ ctx, b }) { const re = b.Filter ? wildRe(String(b.Filter)) : null; return Object.keys(ctx.fs).sort().filter((p) => !re || re.test(p.split("/").pop())).map((p) => obj("FileInfo", { Mode: "-a---", LastWriteTime: ctx.fs[p].at, Length: ctx.fs[p].text.length, Name: p.split("/").pop(), FullName: p })); } });
def("Get-Date", { module: "Microsoft.PowerShell.Utility", ver: "7.0.0.0", ctype: "Cmdlet", params: { Date: P(0), Format: P(null), Year: P(null), Month: P(null), Day: P(null) },
  run({ b }) { let d = b.Date !== undefined ? (b.Date instanceof Date ? b.Date : new Date(b.Date)) : new Date(); if (isNaN(d)) throw new PSErr("Cannot bind parameter 'Date'. Cannot convert value \"" + b.Date + "\" to type \"System.DateTime\".", { cmd: "Get-Date", term: true }); if (b.Format) return [dateFmt(d, String(b.Format))]; return [d]; } });
def("Write-Output", { module: "Microsoft.PowerShell.Utility", ver: "7.0.0.0", ctype: "Cmdlet", pipe: true, params: { InputObject: P(0) }, run({ b, input }) { return input.length ? input : flat(b.InputObject); } });
def("Write-Host", { module: "Microsoft.PowerShell.Utility", ver: "7.0.0.0", ctype: "Cmdlet", pipe: true, params: { Object: P(0), ForegroundColor: P(null), NoNewline: S(), Separator: P(null) }, run({ ctx, b, input }) { const v = b.Object !== undefined ? flat(b.Object) : input; ctx.host.push({ text: v.map((x) => toStr(x)).join(b.Separator ? String(b.Separator) : " "), color: b.ForegroundColor ? String(b.ForegroundColor) : null }); return []; } });
def("Write-Warning", { module: "Microsoft.PowerShell.Utility", ver: "7.0.0.0", ctype: "Cmdlet", params: { Message: P(0, { req: true }) }, run({ ctx, b }) { ctx.host.push({ warn: "WARNING: " + toStr(b.Message) }); return []; } });
def("Format-Table", { module: "Microsoft.PowerShell.Utility", ver: "7.0.0.0", ctype: "Cmdlet", pipe: true, params: { Property: P(0), AutoSize: S(), Wrap: S() }, run({ ctx, b, input, name }) { if (b.Property === undefined) return input.map((x) => fmtTag(x, "table")); const sel = CMDS["select-object"].run({ ctx, b: { Property: b.Property }, input, name }); return sel.map((x) => { const c = fmtTag(x, "table"); if (isObj(c)) Object.defineProperty(c, "__fmtProps", { value: true }); return c; }); } });
def("Format-List", { module: "Microsoft.PowerShell.Utility", ver: "7.0.0.0", ctype: "Cmdlet", pipe: true, params: { Property: P(0) }, run({ ctx, b, input, name }) { const src = b.Property === undefined ? input : CMDS["select-object"].run({ ctx, b: { Property: b.Property }, input, name }); return src.map((x) => fmtTag(x, "list")); } });
function fmtTag(x, how) { if (!isObj(x)) return x; const c = obj(x[TYPE], Object.assign({}, x)); Object.defineProperty(c, "__fmt", { value: how }); return c; }
def("Out-Null", { module: "Microsoft.PowerShell.Core", ver: "7.4.6", ctype: "Cmdlet", pipe: true, run() { return []; } });
def("Clear-Host", { module: "", ver: "", ctype: "Function", run({ ctx }) { ctx.host.push({ clear: true }); return []; } });

function memberRows(x) {
  const t = typeName(x);
  const rows = [];
  const add = (n, mt, d) => rows.push(obj("Microsoft.PowerShell.Commands.MemberDefinition", { TypeName: t, Name: n, MemberType: mt, Definition: d }));
  if (typeof x === "string") { ["Clone", "CompareTo", "Contains", "EndsWith", "Equals", "GetHashCode", "GetType", "IndexOf", "Insert", "PadLeft", "PadRight", "Replace", "Split", "StartsWith", "Substring", "ToLower", "ToString", "ToUpper", "Trim"].forEach((m) => add(m, "Method", m === "Contains" ? "bool Contains(string value)" : m === "Split" ? "string[] Split(char separator)" : m === "Replace" ? "string Replace(string oldValue, string newValue)" : m === "ToLower" || m === "ToUpper" || m === "Trim" ? "string " + m + "()" : m + "(...)")); add("Length", "Property", "int Length {get;}"); return rows; }
  if (x instanceof Date) { ["AddDays", "AddHours", "AddMonths", "AddYears", "CompareTo", "Equals", "GetType", "Subtract", "ToString"].forEach((m) => add(m, "Method", m.startsWith("Add") ? "datetime " + m + "(double value)" : m + "(...)")); ["Date", "Day", "DayOfWeek", "Hour", "Minute", "Month", "Ticks", "Year"].forEach((p) => add(p, "Property", (p === "Date" ? "datetime" : p === "DayOfWeek" ? "System.DayOfWeek" : p === "Ticks" ? "long" : "int") + " " + p + " {get;}")); return rows; }
  if (typeof x === "number") { ["CompareTo", "Equals", "GetHashCode", "GetType", "ToString"].forEach((m) => add(m, "Method", m + "(...)")); return rows; }
  if (typeof x === "boolean") { ["CompareTo", "Equals", "GetHashCode", "GetType", "ToString"].forEach((m) => add(m, "Method", m + "(...)")); return rows; }
  if (!isObj(x)) return rows;
  const note = t === "System.Management.Automation.PSCustomObject" || (t || "").startsWith("Selected.") || t === "Microsoft.PowerShell.Commands.GroupInfo";
  ["Equals", "GetHashCode", "GetType", "ToString"].forEach((m) => add(m, "Method", m === "Equals" ? "bool Equals(System.Object obj)" : m === "GetHashCode" ? "int GetHashCode()" : m === "GetType" ? "type GetType()" : "string ToString()"));
  if (isHT(x)) { add("Add", "Method", "void Add(System.Object key, System.Object value)"); add("ContainsKey", "Method", "bool ContainsKey(System.Object key)"); add("Remove", "Method", "void Remove(System.Object key)"); add("Count", "Property", "int Count {get;}"); add("Keys", "Property", "System.Collections.ICollection Keys {get;}"); add("Values", "Property", "System.Collections.ICollection Values {get;}"); return rows; }
  const pt = PROPTYPES[t] || {};
  for (const k of Object.keys(x).sort((a, b2) => a.localeCompare(b2))) {
    const v = x[k];
    const vt = pt[k] || (v === null || v === undefined ? "System.Object" : typeName(v));
    const short = vt.replace(/^System\.String$/, "string").replace(/^System\.Int32$/, "int").replace(/^System\.Boolean$/, "bool").replace(/^System\.DateTime$/, "datetime").replace(/^System\.Double$/, "double").replace(/^System\.Object\[\]$/, "Object[]");
    if (note) add(k, "NoteProperty", short + " " + k + "=" + toStr(v, true));
    else add(k, "Property", short + " " + k + " {get;set;}");
  }
  return rows;
}
def("Get-Member", { module: "Microsoft.PowerShell.Utility", ver: "7.0.0.0", ctype: "Cmdlet", pipe: true, params: { Name: P(0), MemberType: P(null), InputObject: P(null), Force: S(), Static: S() },
  run({ b, input, hadInput, name }) {
    const src = b.InputObject !== undefined ? [b.InputObject] : input;
    if (!src.length) throw new PSErr("You must specify an object for the Get-Member cmdlet.", { cmd: name, term: true });
    const seen = new Set(); const rows = [];
    for (const x of src) { const t = typeName(x); if (t === null || seen.has(t)) continue; seen.add(t); rows.push(...memberRows(x)); }
    let out = rows;
    if (b.Name !== undefined) { const res = flat(b.Name).map((n) => wildRe(String(n))); out = out.filter((r) => res.some((re) => re.test(r.Name))); }
    if (b.MemberType !== undefined) { const mts = flat(b.MemberType).map((m) => String(m).toLowerCase()); out = out.filter((r) => mts.some((m) => r.MemberType.toLowerCase() === m || (m === "properties" && /property/i.test(r.MemberType)))); }
    return out;
  } });
function cmdInfo(c) { return obj("System.Management.Automation.CmdletInfo", { CommandType: c.ctype, Name: c.name, Version: c.ver, Source: c.module }); }
def("Get-Command", { module: "Microsoft.PowerShell.Core", ver: "7.4.6", ctype: "Cmdlet", params: { Name: P(0, { type: "System.String[]" }), Module: P(null), Verb: P(null), Noun: P(null), CommandType: P(null), Syntax: S() },
  run({ ctx, b, name }) {
    let list = Object.values(CMDS).filter((c) => c.module);
    if (b.Name !== undefined) {
      const pats = flat(b.Name).map(String);
      const res = [];
      for (const p of pats) {
        const a = ALIASES[p.toLowerCase()];
        if (a && !hasWild(p)) { res.push(obj("System.Management.Automation.AliasInfo", { CommandType: "Alias", Name: p + " -> " + a, Version: "", Source: "" })); continue; }
        const hit = list.filter((c) => wildRe(p).test(c.name));
        if (!hit.length && !hasWild(p)) throw new PSErr("The term '" + p + "' is not recognized as a name of a cmdlet, function, script file, or executable program.\nCheck the spelling of the name, or if a path was included, verify that the path is correct and try again.", { cmd: name, term: false, kind: "notfound" });
        if (b.Syntax) { for (const c of hit) res.push(syntaxOf(c)); continue; }
        res.push(...hit.map(cmdInfo));
      }
      return res;
    }
    if (b.Module !== undefined) { const re = wildRe(String(b.Module)); list = list.filter((c) => re.test(c.module)); }
    if (b.Verb !== undefined) { const re = wildRe(String(b.Verb)); list = list.filter((c) => re.test(c.name.split("-")[0])); }
    if (b.Noun !== undefined) { const re = wildRe(String(b.Noun)); list = list.filter((c) => re.test(c.name.split("-").slice(1).join("-"))); }
    return list.sort((x, y) => x.name.localeCompare(y.name)).map(cmdInfo);
  } });
function syntaxOf(c) {
  const ps = c.params || {};
  const parts = Object.keys(ps).map((n) => { const p = ps[n]; const t = p.kind === "switch" ? "" : " <" + (p.type || "Object").replace(/^System\./, "") + ">"; const core = "-" + n + t; return p.req ? (p.pos !== undefined ? "[-" + n + "]" + t : core) : "[" + (p.pos !== undefined && p.kind !== "switch" ? "[-" + n + "]" + t : core) + "]"; });
  return "\n" + c.name + " " + parts.join(" ") + (c.whatif ? " [-WhatIf] [-Confirm]" : "") + " [<CommonParameters>]\n";
}
let HELP = {};
def("Get-Help", { module: "Microsoft.PowerShell.Core", ver: "7.4.6", ctype: "Cmdlet", params: { Name: P(0), Examples: S(), Full: S(), Detailed: S(), Parameter: P(null), Online: S() },
  run({ ctx, b, name }) {
    if (b.Name === undefined) return ["\nTOPIC\n    PowerShell Help System\n\nSHORT DESCRIPTION\n    Displays help about PowerShell cmdlets and concepts.\n\n    Get-Help <CmdletName>            Get-Help Get-MgUser\n    Get-Help <CmdletName> -Examples  Get-Help Where-Object -Examples\n"];
    const n = canonName(String(b.Name));
    const c = CMDS[n.toLowerCase()];
    if (!c) throw new PSErr("Get-Help could not find " + b.Name + " in a help file in this session. To download updated help topics type: \"Update-Help\". To get help online, search for the help topic in the TechNet library at https://go.microsoft.com/fwlink/?LinkID=107116.", { cmd: name, term: true, kind: "nohelp" });
    const h = HELP[c.name] || { syn: "", ex: [] };
    if (b.Online) return ["Opened the online help for " + c.name + " in your default browser."];
    if (b.Parameter !== undefined) {
      const pn = Object.keys(c.params || {}).find((k) => k.toLowerCase() === String(b.Parameter).toLowerCase());
      if (!pn) throw new PSErr("No parameter matches criteria " + b.Parameter + ".", { cmd: name, term: true });
      const p = c.params[pn];
      return ["\n-" + pn + (p.kind === "switch" ? "" : " <" + (p.type || "Object") + ">") + "\n    " + ((h.params || {})[pn] || "") + "\n\n    Required?                    " + (p.req ? "true" : "false") + "\n    Position?                    " + (p.pos !== undefined ? p.pos : "Named") + "\n    Accept pipeline input?       " + (c.pipe && pn !== "Path" ? "true (ByValue)" : "false") + "\n    Accept wildcard characters?  false\n"];
    }
    const exText = h.ex.map((e, i) => "    ----------- Example " + (i + 1) + ": " + e[0] + " -----------\n\n    " + e[1].split("\n").join("\n    ") + "\n\n    " + e[2] + "\n").join("\n");
    if (b.Examples) return ["\nNAME\n    " + c.name + "\n\nSYNOPSIS\n    " + h.syn + "\n\n" + exText];
    return ["\nNAME\n    " + c.name + "\n\nSYNOPSIS\n    " + h.syn + "\n\nSYNTAX" + syntaxOf(c) + "\nREMARKS\n    To see the examples, type: \"Get-Help " + c.name + " -Examples\".\n    For more information, type: \"Get-Help " + c.name + " -Detailed\".\n    For technical information, type: \"Get-Help " + c.name + " -Full\".\n"];
  } });

function visibleProps(x) {
  const t = typeName(x);
  if (x.__fmt === "list" || !DISPLAY[t] || (x.__fmt === "table" && x.__fmtProps)) return Object.keys(x);
  return DISPLAY[t];
}
function cell(v) { if (v instanceof Date) return dateShort(v); return toStr(v, true); }
function fmtTable(rows, cols, W) {
  W = W || 118;
  const data = rows.map((r) => cols.map((c) => cell(getMember(r, c))));
  const num = cols.map((c, j) => rows.every((r) => { const v = getMember(r, c); return v === null || typeof v === "number"; }));
  let w = cols.map((c, j) => Math.max(c.length, ...data.map((d) => d[j].length)));
  const total = () => w.reduce((a, b) => a + b, 0) + w.length - 1;
  while (total() > W) { const j = w.indexOf(Math.max(...w)); if (w[j] <= 8) break; w[j]--; }
  const fit = (s, n, right) => { if (s.length > n) s = s.slice(0, Math.max(0, n - 1)) + "…"; return right ? s.padStart(n) : s.padEnd(n); };
  const out = [];
  out.push(cols.map((c, j) => fit(c, w[j], num[j])).join(" ").replace(/\s+$/, ""));
  out.push(cols.map((c, j) => fit("-".repeat(Math.min(c.length, w[j])), w[j], num[j])).join(" ").replace(/\s+$/, ""));
  for (const d of data) out.push(d.map((s, j) => fit(s, w[j], num[j])).join(" ").replace(/\s+$/, ""));
  return out;
}
function fmtList(rows, cols) {
  const out = [];
  const pad = Math.max(...cols.map((c) => c.length));
  rows.forEach((r) => { out.push(""); for (const c of cols) out.push(c.padEnd(pad) + " : " + cell(getMember(r, c))); });
  return out;
}
function formatOut(values, W) {
  const lines = [];
  let i = 0;
  while (i < values.length) {
    const v = values[i];
    if (v === null || v === undefined) { i++; continue; }
    if (!isObj(v)) {
      if (v instanceof Date) lines.push("", dateLong(v), "");
      else lines.push(toStr(v));
      i++; continue;
    }
    const t = typeName(v);
    let j = i;
    while (j < values.length && isObj(values[j]) && typeName(values[j]) === t) j++;
    const run = values.slice(i, j);
    if (t === "Microsoft.PowerShell.Commands.MemberDefinition") {
      let k = 0;
      while (k < run.length) { const tn = run[k].TypeName; let e = k; while (e < run.length && run[e].TypeName === tn) e++; lines.push("", "   TypeName: " + tn, ""); lines.push(...fmtTable(run.slice(k, e), ["Name", "MemberType", "Definition"], W)); k = e; }
      lines.push("");
    } else if (isHT(v)) {
      for (const h of run) { const rows = Object.keys(h).map((k) => obj("kv", { Name: k, Value: h[k] })); lines.push(""); lines.push(...fmtTable(rows, ["Name", "Value"], W)); }
      lines.push("");
    } else {
      const cols = visibleProps(v);
      const forced = v.__fmt;
      if (forced === "list" || (!forced && cols.length > 4 && !DISPLAY[t])) lines.push(...fmtList(run, cols), "");
      else { lines.push(""); lines.push(...fmtTable(run, cols, W)); lines.push(""); }
    }
    i = j;
  }
  return lines.join("\n").replace(/^\n+/, "\n").replace(/\n{3,}/g, "\n\n");
}

const EXO_HOST = "AM0PR04MB1234.EURPRD04.PROD.OUTLOOK.COM";
const T_MBX = "Microsoft.Exchange.Data.Directory.Management.Mailbox";
const T_PERM = "Microsoft.Exchange.Management.RecipientTasks.MailboxAcePresentationObject";
const T_RPERM = "Microsoft.Exchange.Management.RecipientTasks.RecipientPermission";
const T_ARC = "Microsoft.Exchange.Management.StoreTasks.MailboxAutoReplyConfiguration";
const T_STAT = "Microsoft.Exchange.Management.RestApiClient.ExoMailboxStatistics";
const T_DG = "Microsoft.Exchange.Data.Directory.Management.DistributionGroup";
const T_DGM = "Microsoft.Exchange.Data.Directory.Management.ReducedRecipient";
const T_GRP = GM + "MicrosoftGraphGroup";
DISPLAY[T_MBX] = ["Name", "Alias", "Database", "ProhibitSendQuota", "ExternalDirectoryObjectId"];
DISPLAY[T_PERM] = ["Identity", "User", "AccessRights", "IsInherited", "Deny"];
DISPLAY[T_RPERM] = ["Identity", "Trustee", "AccessControlType", "AccessRights", "Inherited"];
DISPLAY[T_ARC] = ["Identity", "AutoReplyState", "StartTime", "EndTime"];
DISPLAY[T_STAT] = ["DisplayName", "ItemCount", "TotalItemSize"];
DISPLAY[T_DG] = ["Name", "DisplayName", "GroupType", "PrimarySmtpAddress"];
DISPLAY[T_DGM] = ["Name", "RecipientType"];
DISPLAY[T_GRP] = ["DisplayName", "Id", "MailNickname", "Description", "GroupTypes"];

function hget(h, k) { if (!h || typeof h !== "object") return undefined; const key = Object.keys(h).find((x) => x.toLowerCase() === k.toLowerCase()); return key === undefined ? undefined : h[key]; }
function upnOf(t, x) {
  const s = String(x).toLowerCase();
  const u = t.users.find((u) => u.UserPrincipalName.toLowerCase() === s || u.Id.toLowerCase() === s || u.DisplayName.toLowerCase() === s || (u.Mail && u.Mail.toLowerCase() === s) || (u.MailNickname && u.MailNickname.toLowerCase() === s));
  return u || null;
}
function userById(t, x) { const s = String(x).toLowerCase(); return t.users.find((u) => u.UserPrincipalName.toLowerCase() === s || u.Id.toLowerCase() === s) || null; }
function needExo(ctx, name) { if (!ctx.exo) throw new PSErr("You must call the Connect-ExchangeOnline cmdlet before calling any other cmdlets.", { cmd: name, term: true, kind: "noexo" }); }
function exoNotFound(id) { return "||The operation couldn't be performed because object '" + id + "' couldn't be found on '" + EXO_HOST + "'."; }
function findMbx(ctx, id) {
  const s = String(id).toLowerCase();
  return ctx.t.mailboxes.find((m) => [m.DisplayName, m.Name, m.Alias, m.PrimarySmtpAddress, m.UserPrincipalName, m.ExternalDirectoryObjectId].some((v) => v && String(v).toLowerCase() === s) || m.EmailAddresses.some((e) => e.toLowerCase().replace(/^smtp:/, "") === s));
}
function findDG(ctx, id) { const s = String(id).toLowerCase(); return ctx.t.dls.find((d) => [d.Name, d.DisplayName, d.Alias, d.PrimarySmtpAddress].some((v) => v.toLowerCase() === s)); }
function findGroup(ctx, id) { const s = String(id).toLowerCase(); return ctx.t.groups.find((g) => g.g.Id.toLowerCase() === s); }
function confirmGate(ctx, b, what, target) {
  if (b.Confirm === false || b.WhatIf) return true;
  ctx.host.push({ text: "\nConfirm\nAre you sure you want to perform this action?\n" + what + " \"" + target + "\".\n[Y] Yes  [A] Yes to All  [N] No  [L] No to All  [?] Help (default is \"Y\"):" });
  ctx.host.push({ err: "(lab) The real console now waits for you to type Y. Nothing was changed. In scripts add -Confirm:$false so it never stops to ask." });
  return false;
}
function sizeStr(mb) { const bytes = Math.round(mb * 1048576); const s = mb >= 1024 ? (mb / 1024).toFixed(2) + " GB" : mb.toFixed(1) + " MB"; return s + " (" + bytes.toLocaleString("en-US") + " bytes)"; }

function extendTenant(t) {
  const r = rng(4242);
  const byName = (dn) => t.users.find((u) => u.DisplayName === dn);
  t.mailboxes.forEach((m, i) => {
    Object.assign(m, { ForwardingSmtpAddress: null, ForwardingAddress: null, DeliverToMailboxAndForward: false, HiddenFromAddressListsEnabled: false, GrantSendOnBehalfTo: [], Database: "EURPR04DG" + (100 + (i % 7)) + "-db0" + (40 + (i % 9)), ProhibitSendQuota: m.RecipientTypeDetails === "SharedMailbox" ? "49.5 GB (53,150,220,288 bytes)" : "99 GB (106,300,440,576 bytes)", IsMailboxEnabled: true });
    m._arc = { AutoReplyState: "Disabled", InternalMessage: null, ExternalMessage: null, StartTime: null, EndTime: null };
    m._stat = { ItemCount: 800 + Math.floor(r() * 24000), MB: 120 + r() * 18000 };
  });
  const dor = t.mailboxes.find((m) => m.DisplayName === "Dorian Pike"); if (dor) { dor.ForwardingSmtpAddress = "smtp:dorian.pike.private@outlook.example"; dor.DeliverToMailboxAndForward = true; }
  const big = t.mailboxes.find((m) => m.DisplayName === "Garrick Penhale"); if (big) big._stat = { ItemCount: 61240, MB: 47600 };
  t.perms = [];
  const give = (mb, dn) => { const u = byName(dn); t.perms.push({ mb, upn: u.UserPrincipalName, rights: ["FullAccess"] }); };
  give("Info", "Elowen Thistle"); give("Info", "Cassian Drake");
  give("Sales Desk", "Brannoc Vale"); give("Sales Desk", "Garrick Penhale"); give("Sales Desk", "Elara Wynn");
  give("Finance Inbox", "Ysolde Marrow"); give("Finance Inbox", "Tamsin Rook"); give("Finance Inbox", "Hollis Reed");
  give("Support", "Cassian Drake"); give("Support", "Ondine Shaw");
  give("Careers", "Juniper Oakes");
  t.sendAs = [{ mb: "Sales Desk", upn: byName("Garrick Penhale").UserPrincipalName }, { mb: "Info", upn: byName("Elowen Thistle").UserPrincipalName }];
  const members = t.users.filter((u) => u.UserType === "Member");
  const dl = (name, alias, list) => ({ Name: name, DisplayName: name, Alias: alias, PrimarySmtpAddress: alias + "@" + t.domain, GroupType: "Universal", ManagedBy: ["Elowen Thistle"], members: list.map((u) => u.UserPrincipalName) });
  t.dls = [
    dl("All Staff", "all", members.filter((u) => u.AccountEnabled && u.DisplayName !== "Rowan Hart")),
    dl("Sales Team", "sales-team", members.filter((u) => u.Department === "Sales")),
    dl("Finance Team", "finance-team", members.filter((u) => u.Department === "Finance")),
    dl("Operations Bruges", "ops-bruges", members.filter((u) => u.Department === "Operations" && u.City === "Bruges")),
    dl("IT Alerts", "it-alerts", members.filter((u) => u.Department === "IT"))
  ];
  const grp = (name, nick, desc, types, sec, list) => ({ g: obj(T_GRP, { Classification: null, CreatedDateTime: new Date(Date.now() - (200 + Math.floor(r() * 900)) * 864e5), Description: desc, DisplayName: name, GroupTypes: types, Id: guid(r), Mail: types.includes("Unified") ? nick + "@" + t.domain : null, MailEnabled: types.includes("Unified"), MailNickname: nick, SecurityEnabled: sec, Visibility: types.includes("Unified") ? "Private" : null }), members: list.map((u) => u.Id) });
  t.groups = [
    grp("Halvard Leadership", "leadership", "Directors and heads of department", ["Unified"], false, ["Alaric Strand", "Hollis Reed", "Garrick Penhale", "Caius Mercer", "Elowen Thistle", "Juniper Oakes"].map(byName)),
    grp("Project Northwind", "northwind", "New warehouse system rollout", ["Unified"], false, ["Caius Mercer", "Lorcan Ivers", "Anwen Frost", "Maelis Grey"].map(byName)),
    grp("SG-VPN-Users", "SG-VPN-Users", "Allowed to use the VPN", [], true, members.filter((u) => ["IT", "Executive", "Finance"].includes(u.Department))),
    grp("SG-Finance-Share", "SG-Finance-Share", "Read/write on the finance file share", [], true, members.filter((u) => u.Department === "Finance")),
    grp("SG-MFA-Exclusion", "SG-MFA-Exclusion", "Temporary: excluded from MFA policy", [], true, ["Scan Station"].map(() => byName("Rowan Hart")))
  ];
  t.revoked = {};
  return t;
}

const GROUP_READ = ["Group.Read.All", "Group.ReadWrite.All", "GroupMember.Read.All", "GroupMember.ReadWrite.All", "Directory.Read.All", "Directory.ReadWrite.All"];
const GROUP_WRITE = ["Group.ReadWrite.All", "GroupMember.ReadWrite.All", "Directory.ReadWrite.All"];
const USER_WRITE = ["User.ReadWrite.All", "Directory.ReadWrite.All"];
const LIC_WRITE = ["User.ReadWrite.All", "Directory.ReadWrite.All", "LicenseAssignment.ReadWrite.All"];
function needWrite(ctx, cmd, any) { if (!ctx.mg.scopes.some((s) => any.some((a) => a.toLowerCase() === s.toLowerCase()))) throw new PSErr("Insufficient privileges to complete the operation.\n\nStatus: 403 (Forbidden)\nErrorCode: Authorization_RequestDenied", { cmd, term: true, kind: "scope" }); }
function dirObj(u) { return obj(GM + "MicrosoftGraphDirectoryObject", { DeletedDateTime: null, Id: u.Id, AdditionalProperties: ht({ "@odata.type": "#microsoft.graph.user", displayName: u.DisplayName, userPrincipalName: u.UserPrincipalName, mail: u.Mail, jobTitle: u.JobTitle }) }); }
function grpObj(g) { return obj(GM + "MicrosoftGraphDirectoryObject", { DeletedDateTime: null, Id: g.Id, AdditionalProperties: ht({ "@odata.type": "#microsoft.graph.group", displayName: g.DisplayName, mailNickname: g.MailNickname, securityEnabled: g.SecurityEnabled }) }); }

def("Get-EXOMailbox", { module: "ExchangeOnlineManagement", ver: "3.6.0", ctype: "Function", params: { Identity: P(0, { pipe: true }), ResultSize: P(null), RecipientTypeDetails: P(null, { type: "System.String[]" }), Properties: P(null, { type: "System.String[]" }), PropertySets: P(null), Filter: P(null) },
  run({ ctx, b, name }) {
    needExo(ctx, name);
    const base = ["Alias", "DisplayName", "EmailAddresses", "ExternalDirectoryObjectId", "Guid", "Id", "Identity", "Name", "PrimarySmtpAddress", "RecipientType", "RecipientTypeDetails", "UserPrincipalName"];
    const extra = flat(b.Properties).flatMap((x) => String(x).split(",")).map((x) => x.trim()).filter(Boolean);
    const sample = ctx.t.mailboxes[0];
    const keys = extra.map((p) => { const k = Object.keys(sample).filter((x) => !x.startsWith("_")).find((x) => x.toLowerCase() === p.toLowerCase()); if (!k) throw new PSErr("||The property '" + p + "' is not a valid property for this cmdlet. Use -PropertySets or check the property name.", { cmd: name, term: true }); return k; });
    let m = ctx.t.mailboxes;
    if (b.Identity !== undefined) { const x = findMbx(ctx, b.Identity); if (!x) throw new PSErr(exoNotFound(b.Identity), { cmd: name, term: true, kind: "exo404" }); m = [x]; }
    if (b.RecipientTypeDetails !== undefined) { const kinds = flat(b.RecipientTypeDetails).map((x) => String(x).toLowerCase()); const valid = ["usermailbox", "sharedmailbox", "roommailbox", "equipmentmailbox"]; for (const k of kinds) if (!valid.includes(k)) throw new PSErr("Cannot bind parameter 'RecipientTypeDetails'. Cannot convert value \"" + k + "\" to type \"Microsoft.Exchange.Data.Directory.Recipient.RecipientTypeDetails\".", { cmd: name, term: true }); m = m.filter((x) => kinds.includes(x.RecipientTypeDetails.toLowerCase())); }
    if (b.ResultSize !== undefined && !/^unlimited$/i.test(String(b.ResultSize))) m = m.slice(0, +b.ResultSize);
    return m.map((x) => { const o = {}; for (const k of base.concat(keys)) o[k] = Array.isArray(x[k]) ? x[k].slice() : x[k]; return obj("Microsoft.Exchange.Management.RestApiClient.ExoMailbox", o); });
  } });
def("Get-Mailbox", { module: "ExchangeOnlineManagement", ver: "3.6.0", ctype: "Function", params: { Identity: P(0, { pipe: true }), ResultSize: P(null), RecipientTypeDetails: P(null, { type: "System.String[]" }), Filter: P(null) },
  run({ ctx, b, name }) {
    needExo(ctx, name);
    let m = ctx.t.mailboxes;
    if (b.Identity !== undefined) { const x = findMbx(ctx, b.Identity); if (!x) throw new PSErr(exoNotFound(b.Identity), { cmd: name, term: true, kind: "exo404" }); m = [x]; }
    if (b.RecipientTypeDetails !== undefined) { const kinds = flat(b.RecipientTypeDetails).map((x) => String(x).toLowerCase()); m = m.filter((x) => kinds.includes(x.RecipientTypeDetails.toLowerCase())); }
    if (b.ResultSize !== undefined && !/^unlimited$/i.test(String(b.ResultSize))) m = m.slice(0, +b.ResultSize);
    return m.map((x) => { const o = {}; for (const k of Object.keys(x)) if (!k.startsWith("_")) o[k] = Array.isArray(x[k]) ? x[k].slice() : x[k]; return obj(T_MBX, o); });
  } });
def("Set-Mailbox", { module: "ExchangeOnlineManagement", ver: "3.6.0", ctype: "Function", whatif: true, pipe: true, params: { Identity: P(0, { req: true, pipe: true }), Type: P(null), ForwardingSmtpAddress: P(null), ForwardingAddress: P(null), DeliverToMailboxAndForward: P(null), HiddenFromAddressListsEnabled: P(null), EmailAddresses: P(null), DisplayName: P(null), GrantSendOnBehalfTo: P(null) },
  run({ ctx, b, name, input }) {
    needExo(ctx, name);
    const ids = b.Identity !== undefined ? flat(b.Identity) : input.map((x) => x.Identity || x.PrimarySmtpAddress);
    for (const id of ids) {
      const m = findMbx(ctx, id);
      if (!m) throw new PSErr(exoNotFound(id), { cmd: name, term: true, kind: "exo404" });
      if (b.WhatIf) { ctx.host.push({ text: "What if: Setting mailbox \"" + m.Name + "\"." }); continue; }
      if (b.Type !== undefined) { const ty = String(b.Type).toLowerCase(); const map = { shared: "SharedMailbox", regular: "UserMailbox", room: "RoomMailbox", equipment: "EquipmentMailbox" }; if (!map[ty]) throw new PSErr("Cannot bind parameter 'Type'. Cannot convert value \"" + b.Type + "\" to type \"Microsoft.Exchange.Management.RecipientTasks.ConvertibleMailboxSubType\". Error: \"Unable to match the identifier name " + b.Type + " to a valid enumerator name. Specify one of the following enumerator names and try again:\nRegular, Room, Equipment, Shared\"", { cmd: name, term: true }); m.RecipientTypeDetails = map[ty]; }
      if (b.ForwardingSmtpAddress !== undefined) m.ForwardingSmtpAddress = b.ForwardingSmtpAddress === null || b.ForwardingSmtpAddress === "" ? null : "smtp:" + String(b.ForwardingSmtpAddress).replace(/^smtp:/i, "");
      if (b.ForwardingAddress !== undefined) m.ForwardingAddress = b.ForwardingAddress;
      for (const k of ["DeliverToMailboxAndForward", "HiddenFromAddressListsEnabled"]) if (b[k] !== undefined) { if (typeof b[k] === "string") throw new PSErr("Cannot process argument transformation on parameter '" + k + "'. Cannot convert value \"System.String\" to type \"System.Boolean\". Boolean parameters accept only Boolean values and numbers, such as $True, $False, 1 or 0.", { cmd: name, term: true, kind: "switchstr" }); m[k] = truthy(b[k]); }
      if (b.DisplayName !== undefined) m.DisplayName = String(b.DisplayName);
      if (b.EmailAddresses !== undefined) {
        const v = b.EmailAddresses;
        if (isHT(v)) {
          for (const a of flat(hget(v, "add"))) { const s = String(a); if (!m.EmailAddresses.some((e) => e.toLowerCase() === s.toLowerCase())) m.EmailAddresses.push(/^smtp:/i.test(s) ? s : "smtp:" + s); }
          for (const a of flat(hget(v, "remove"))) { const s = String(a).toLowerCase().replace(/^smtp:/, ""); if (m.EmailAddresses.some((e) => e.startsWith("SMTP:") && e.slice(5).toLowerCase() === s)) throw new PSErr("||The primary SMTP address can't be removed. Set a different primary address first.", { cmd: name, term: true }); m.EmailAddresses = m.EmailAddresses.filter((e) => e.toLowerCase().replace(/^smtp:/, "") !== s); }
        } else ctx.host.push({ err: "(lab) Setting -EmailAddresses to a plain value replaces every address on the mailbox. Use @{add='smtp:...'} or @{remove='smtp:...'}. Nothing was changed." });
      }
    }
    return [];
  } });
def("Get-MailboxPermission", { module: "ExchangeOnlineManagement", ver: "3.6.0", ctype: "Function", params: { Identity: P(0, { req: true, pipe: true }), User: P(null) },
  run({ ctx, b, name }) {
    needExo(ctx, name);
    const m = findMbx(ctx, b.Identity); if (!m) throw new PSErr(exoNotFound(b.Identity), { cmd: name, term: true, kind: "exo404" });
    let rows = [{ user: "NT AUTHORITY\\SELF", rights: ["FullAccess, ReadPermission"] }].concat(ctx.t.perms.filter((p) => p.mb === m.Name).map((p) => ({ user: p.upn, rights: p.rights })));
    if (b.User !== undefined) { const u = upnOf(ctx.t, b.User); rows = rows.filter((x) => u && x.user === u.UserPrincipalName); }
    return rows.map((x) => obj(T_PERM, { AccessRights: x.rights.slice(), Deny: false, Identity: m.Name, InheritanceType: "All", IsInherited: false, User: x.user }));
  } });
def("Add-MailboxPermission", { module: "ExchangeOnlineManagement", ver: "3.6.0", ctype: "Function", whatif: true, params: { Identity: P(0, { req: true }), User: P(null, { req: true }), AccessRights: P(null, { req: true }), AutoMapping: P(null), InheritanceType: P(null) },
  run({ ctx, b, name }) {
    needExo(ctx, name);
    const m = findMbx(ctx, b.Identity); if (!m) throw new PSErr(exoNotFound(b.Identity), { cmd: name, term: true, kind: "exo404" });
    const u = upnOf(ctx.t, b.User); if (!u) throw new PSErr(exoNotFound(b.User), { cmd: name, term: true, kind: "exo404" });
    const rights = flat(b.AccessRights).map(String);
    if (!rights.every((x) => /^(FullAccess|ReadPermission|ChangePermission|ChangeOwner|DeleteItem|ExternalAccount|SendAs)$/i.test(x))) throw new PSErr("Cannot bind parameter 'AccessRights'. Cannot convert value \"" + rights.join(",") + "\" to type \"Microsoft.Exchange.Management.RecipientTasks.MailboxRights\".", { cmd: name, term: true });
    if (rights.some((x) => /^SendAs$/i.test(x))) throw new PSErr("||SendAs isn't a mailbox permission in Exchange Online. Use Add-RecipientPermission -AccessRights SendAs instead.", { cmd: name, term: true });
    if (b.WhatIf) { ctx.host.push({ text: "What if: Adding mailbox permission for \"" + u.UserPrincipalName + "\" on \"" + m.Name + "\"." }); return []; }
    if (!ctx.t.perms.some((p) => p.mb === m.Name && p.upn === u.UserPrincipalName)) ctx.t.perms.push({ mb: m.Name, upn: u.UserPrincipalName, rights: ["FullAccess"], automap: b.AutoMapping === undefined ? true : truthy(b.AutoMapping) });
    return [obj(T_PERM, { AccessRights: ["FullAccess"], Deny: false, Identity: m.Name, InheritanceType: "All", IsInherited: false, User: u.UserPrincipalName })];
  } });
def("Remove-MailboxPermission", { module: "ExchangeOnlineManagement", ver: "3.6.0", ctype: "Function", whatif: true, params: { Identity: P(0, { req: true }), User: P(null, { req: true }), AccessRights: P(null, { req: true }), InheritanceType: P(null) },
  run({ ctx, b, name }) {
    needExo(ctx, name);
    const m = findMbx(ctx, b.Identity); if (!m) throw new PSErr(exoNotFound(b.Identity), { cmd: name, term: true, kind: "exo404" });
    const u = upnOf(ctx.t, b.User); if (!u) throw new PSErr(exoNotFound(b.User), { cmd: name, term: true, kind: "exo404" });
    if (!confirmGate(ctx, b, "Removing mailbox permission", m.Name + "\" for user \"" + u.UserPrincipalName)) return [];
    if (b.WhatIf) { ctx.host.push({ text: "What if: Removing mailbox permission for \"" + u.UserPrincipalName + "\" on \"" + m.Name + "\"." }); return []; }
    const before = ctx.t.perms.length; ctx.t.perms = ctx.t.perms.filter((p) => !(p.mb === m.Name && p.upn === u.UserPrincipalName));
    if (before === ctx.t.perms.length) ctx.host.push({ text: "WARNING: Can't remove the access control entry on the object \"" + m.Name + "\" for account \"" + u.UserPrincipalName + "\" because the ACE doesn't exist on the object." });
    return [];
  } });
def("Get-RecipientPermission", { module: "ExchangeOnlineManagement", ver: "3.6.0", ctype: "Function", params: { Identity: P(0, { pipe: true }), Trustee: P(null) },
  run({ ctx, b, name }) {
    needExo(ctx, name);
    const m = findMbx(ctx, b.Identity); if (!m) throw new PSErr(exoNotFound(b.Identity), { cmd: name, term: true, kind: "exo404" });
    return [{ upn: "NT AUTHORITY\\SELF" }].concat(ctx.t.sendAs.filter((p) => p.mb === m.Name)).map((p) => obj(T_RPERM, { AccessControlType: "Allow", AccessRights: ["SendAs"], Identity: m.Name, Inherited: false, Trustee: p.upn }));
  } });
def("Add-RecipientPermission", { module: "ExchangeOnlineManagement", ver: "3.6.0", ctype: "Function", whatif: true, params: { Identity: P(0, { req: true }), Trustee: P(null, { req: true }), AccessRights: P(null, { req: true }) },
  run({ ctx, b, name }) {
    needExo(ctx, name);
    const m = findMbx(ctx, b.Identity); if (!m) throw new PSErr(exoNotFound(b.Identity), { cmd: name, term: true, kind: "exo404" });
    const u = upnOf(ctx.t, b.Trustee); if (!u) throw new PSErr(exoNotFound(b.Trustee), { cmd: name, term: true, kind: "exo404" });
    if (!/^SendAs$/i.test(String(b.AccessRights))) throw new PSErr("Cannot bind parameter 'AccessRights'. Cannot convert value \"" + b.AccessRights + "\" to type \"Microsoft.Exchange.Management.RecipientTasks.MultiValuedProperty`1[Microsoft.Exchange.Management.RecipientTasks.RecipientAccessRight]\".", { cmd: name, term: true });
    if (!confirmGate(ctx, b, "Adding recipient permission 'SendAs' for user", u.UserPrincipalName + "\" on recipient \"" + m.Name)) return [];
    if (b.WhatIf) { ctx.host.push({ text: "What if: Adding recipient permission 'SendAs' for user \"" + u.UserPrincipalName + "\" on recipient \"" + m.Name + "\"." }); return []; }
    if (!ctx.t.sendAs.some((p) => p.mb === m.Name && p.upn === u.UserPrincipalName)) ctx.t.sendAs.push({ mb: m.Name, upn: u.UserPrincipalName });
    return [obj(T_RPERM, { AccessControlType: "Allow", AccessRights: ["SendAs"], Identity: m.Name, Inherited: false, Trustee: u.UserPrincipalName })];
  } });
def("Get-MailboxAutoReplyConfiguration", { module: "ExchangeOnlineManagement", ver: "3.6.0", ctype: "Function", params: { Identity: P(0, { req: true, pipe: true }) },
  run({ ctx, b, name }) { needExo(ctx, name); const m = findMbx(ctx, b.Identity); if (!m) throw new PSErr(exoNotFound(b.Identity), { cmd: name, term: true, kind: "exo404" }); return [obj(T_ARC, Object.assign({ Identity: m.Name, MailboxOwnerId: m.Name }, m._arc))]; } });
def("Set-MailboxAutoReplyConfiguration", { module: "ExchangeOnlineManagement", ver: "3.6.0", ctype: "Function", whatif: true, params: { Identity: P(0, { req: true, pipe: true }), AutoReplyState: P(null), InternalMessage: P(null), ExternalMessage: P(null), StartTime: P(null), EndTime: P(null), ExternalAudience: P(null) },
  run({ ctx, b, name }) {
    needExo(ctx, name);
    const m = findMbx(ctx, b.Identity); if (!m) throw new PSErr(exoNotFound(b.Identity), { cmd: name, term: true, kind: "exo404" });
    if (b.AutoReplyState !== undefined) { const v = String(b.AutoReplyState); const ok = ["Disabled", "Enabled", "Scheduled"].find((x) => x.toLowerCase() === v.toLowerCase()); if (!ok) throw new PSErr("Cannot bind parameter 'AutoReplyState'. Cannot convert value \"" + v + "\" to type \"Microsoft.Exchange.Data.Storage.OofState\". Error: \"Unable to match the identifier name " + v + " to a valid enumerator name. Specify one of the following enumerator names and try again:\nDisabled, Enabled, Scheduled\"", { cmd: name, term: true }); if (!b.WhatIf) m._arc.AutoReplyState = ok; }
    if (b.WhatIf) { ctx.host.push({ text: "What if: Setting automatic replies for \"" + m.Name + "\"." }); return []; }
    for (const k of ["InternalMessage", "ExternalMessage", "StartTime", "EndTime"]) if (b[k] !== undefined) m._arc[k] = b[k];
    return [];
  } });
def("Get-EXOMailboxStatistics", { module: "ExchangeOnlineManagement", ver: "3.6.0", ctype: "Function", params: { Identity: P(0, { req: true, pipe: true }) },
  run({ ctx, b, name, input }) {
    needExo(ctx, name);
    const ids = b.Identity !== undefined ? flat(b.Identity) : input.map((x) => x.UserPrincipalName || x.PrimarySmtpAddress);
    return ids.map((id) => { const m = findMbx(ctx, id); if (!m) throw new PSErr(exoNotFound(id), { cmd: name, term: true, kind: "exo404" }); return obj(T_STAT, { DisplayName: m.DisplayName, ItemCount: m._stat.ItemCount, TotalItemSize: sizeStr(m._stat.MB), MailboxGuid: m.Guid }); });
  } });
def("Get-DistributionGroup", { module: "ExchangeOnlineManagement", ver: "3.6.0", ctype: "Function", params: { Identity: P(0, { pipe: true }), ResultSize: P(null) },
  run({ ctx, b, name }) {
    needExo(ctx, name);
    let l = ctx.t.dls;
    if (b.Identity !== undefined) { const d = findDG(ctx, b.Identity); if (!d) throw new PSErr(exoNotFound(b.Identity), { cmd: name, term: true, kind: "exo404" }); l = [d]; }
    return l.map((d) => obj(T_DG, { DisplayName: d.DisplayName, GroupType: d.GroupType, Alias: d.Alias, ManagedBy: d.ManagedBy.slice(), Name: d.Name, PrimarySmtpAddress: d.PrimarySmtpAddress, RecipientTypeDetails: "MailUniversalDistributionGroup" }));
  } });
def("Get-DistributionGroupMember", { module: "ExchangeOnlineManagement", ver: "3.6.0", ctype: "Function", params: { Identity: P(0, { req: true, pipe: true }), ResultSize: P(null) },
  run({ ctx, b, name }) {
    needExo(ctx, name);
    const d = findDG(ctx, b.Identity); if (!d) throw new PSErr(exoNotFound(b.Identity), { cmd: name, term: true, kind: "exo404" });
    return d.members.map((upn) => { const u = upnOf(ctx.t, upn); return obj(T_DGM, { Name: u.DisplayName, DisplayName: u.DisplayName, PrimarySmtpAddress: u.UserPrincipalName, RecipientType: "UserMailbox", Department: u.Department }); });
  } });
def("Add-DistributionGroupMember", { module: "ExchangeOnlineManagement", ver: "3.6.0", ctype: "Function", whatif: true, params: { Identity: P(0, { req: true }), Member: P(null, { req: true }), BypassSecurityGroupManagerCheck: S() },
  run({ ctx, b, name }) {
    needExo(ctx, name);
    const d = findDG(ctx, b.Identity); if (!d) throw new PSErr(exoNotFound(b.Identity), { cmd: name, term: true, kind: "exo404" });
    const u = upnOf(ctx.t, b.Member); if (!u) throw new PSErr(exoNotFound(b.Member), { cmd: name, term: true, kind: "exo404" });
    if (d.members.includes(u.UserPrincipalName)) throw new PSErr("||The recipient \"" + u.UserPrincipalName + "\" is already a member of the group \"" + d.Name + "\".", { cmd: name, term: true, kind: "already" });
    if (b.WhatIf) { ctx.host.push({ text: "What if: Adding recipient \"" + u.UserPrincipalName + "\" to distribution group \"" + d.Name + "\"." }); return []; }
    d.members.push(u.UserPrincipalName); return [];
  } });
def("Remove-DistributionGroupMember", { module: "ExchangeOnlineManagement", ver: "3.6.0", ctype: "Function", whatif: true, params: { Identity: P(0, { req: true }), Member: P(null, { req: true }), BypassSecurityGroupManagerCheck: S() },
  run({ ctx, b, name }) {
    needExo(ctx, name);
    const d = findDG(ctx, b.Identity); if (!d) throw new PSErr(exoNotFound(b.Identity), { cmd: name, term: true, kind: "exo404" });
    const u = upnOf(ctx.t, b.Member); if (!u) throw new PSErr(exoNotFound(b.Member), { cmd: name, term: true, kind: "exo404" });
    if (!d.members.includes(u.UserPrincipalName)) throw new PSErr("||The recipient \"" + u.UserPrincipalName + "\" isn't a member of the group \"" + d.Name + "\".", { cmd: name, term: true, kind: "notmember" });
    if (!confirmGate(ctx, b, "Removing distribution group member", u.UserPrincipalName + "\" from distribution group \"" + d.Name)) return [];
    if (b.WhatIf) { ctx.host.push({ text: "What if: Removing distribution group member \"" + u.UserPrincipalName + "\" from distribution group \"" + d.Name + "\"." }); return []; }
    d.members = d.members.filter((x) => x !== u.UserPrincipalName); return [];
  } });
def("New-DistributionGroup", { module: "ExchangeOnlineManagement", ver: "3.6.0", ctype: "Function", whatif: true, params: { Name: P(0, { req: true }), DisplayName: P(null), Alias: P(null), PrimarySmtpAddress: P(null), Members: P(null), ManagedBy: P(null), Type: P(null) },
  run({ ctx, b, name }) {
    needExo(ctx, name);
    const nm = String(b.Name);
    if (findDG(ctx, nm)) throw new PSErr("||The name \"" + nm + "\" is being used by another recipient object. Please specify a unique name.", { cmd: name, term: true });
    const alias = b.Alias !== undefined ? String(b.Alias) : nm.replace(/[^A-Za-z0-9.-]/g, "");
    const smtp = b.PrimarySmtpAddress !== undefined ? String(b.PrimarySmtpAddress) : alias + "@" + ctx.t.domain;
    const mem = flat(b.Members).map((x) => { const u = upnOf(ctx.t, x); if (!u) throw new PSErr(exoNotFound(x), { cmd: name, term: true, kind: "exo404" }); return u.UserPrincipalName; });
    if (b.WhatIf) { ctx.host.push({ text: "What if: Creating distribution group \"" + nm + "\"." }); return []; }
    const d = { Name: nm, DisplayName: b.DisplayName !== undefined ? String(b.DisplayName) : nm, Alias: alias, PrimarySmtpAddress: smtp, GroupType: "Universal", ManagedBy: ["kaatje"], members: mem };
    ctx.t.dls.push(d);
    return [obj(T_DG, { DisplayName: d.DisplayName, GroupType: d.GroupType, Alias: alias, ManagedBy: d.ManagedBy, Name: nm, PrimarySmtpAddress: smtp, RecipientTypeDetails: "MailUniversalDistributionGroup" })];
  } });

def("Get-MgGroup", { module: "Microsoft.Graph.Groups", ver: "2.25.0", ctype: "Function", params: { GroupId: P(null), All: S(), Filter: P(null), Top: P(null), Property: P(null), Search: P(null), ConsistencyLevel: P(null) },
  run({ ctx, b, name, emitErr }) {
    needMg(ctx, name, b.GroupId ? "Get" : "List", GROUP_READ);
    let gs = ctx.t.groups.map((x) => x.g);
    if (b.GroupId !== undefined) { const g = findGroup(ctx, b.GroupId); if (!g) { emitErr("Resource '" + b.GroupId + "' does not exist or one of its queried reference-property objects are not present.\n\nStatus: 404 (NotFound)\nErrorCode: Request_ResourceNotFound", name + "_Get", "notfound404"); return []; } gs = [g.g]; }
    if (b.Filter !== undefined) { const f = odataFilter(b.Filter, name + "_List"); gs = gs.filter(f.fn); }
    if (b.Top !== undefined) gs = gs.slice(0, +b.Top);
    return gs.map(clone);
  } });
def("Get-MgGroupMember", { module: "Microsoft.Graph.Groups", ver: "2.25.0", ctype: "Function", params: { GroupId: P(0, { req: true }), All: S(), Top: P(null) },
  run({ ctx, b, name }) {
    needMg(ctx, name, "List", GROUP_READ);
    const g = findGroup(ctx, b.GroupId); if (!g) throw new PSErr("Resource '" + b.GroupId + "' does not exist or one of its queried reference-property objects are not present.\n\nStatus: 404 (NotFound)\nErrorCode: Request_ResourceNotFound", { cmd: name + "_List", term: true, kind: "notfound404" });
    return g.members.map((id) => dirObj(ctx.t.users.find((u) => u.Id === id)));
  } });
def("Get-MgGroupMemberAsUser", { module: "Microsoft.Graph.Groups", ver: "2.25.0", ctype: "Function", params: { GroupId: P(0, { req: true }), All: S(), Property: P(null) },
  run({ ctx, b, name }) {
    needMg(ctx, name, "List", GROUP_READ);
    const g = findGroup(ctx, b.GroupId); if (!g) throw new PSErr("Resource '" + b.GroupId + "' does not exist or one of its queried reference-property objects are not present.\n\nStatus: 404 (NotFound)\nErrorCode: Request_ResourceNotFound", { cmd: name + "_List", term: true, kind: "notfound404" });
    const props = propList(b, name + "_List", "Microsoft.DirectoryServices.User", ctx.t.users[0]);
    return g.members.map((id) => project(ctx.t.users.find((u) => u.Id === id), props, USER_DEFAULT));
  } });
def("New-MgGroupMember", { module: "Microsoft.Graph.Groups", ver: "2.25.0", ctype: "Function", whatif: true, params: { GroupId: P(0, { req: true }), DirectoryObjectId: P(null, { req: true }) },
  run({ ctx, b, name }) {
    needMg(ctx, name, "Create", GROUP_READ.concat(USER_WRITE));
    needWrite(ctx, name + "_Create", GROUP_WRITE);
    const g = findGroup(ctx, b.GroupId); if (!g) throw new PSErr("Resource '" + b.GroupId + "' does not exist or one of its queried reference-property objects are not present.\n\nStatus: 404 (NotFound)\nErrorCode: Request_ResourceNotFound", { cmd: name + "_Create", term: true, kind: "notfound404" });
    const id = String(b.DirectoryObjectId);
    const u = ctx.t.users.find((x) => x.Id.toLowerCase() === id.toLowerCase());
    if (!u) throw new PSErr("Resource '" + id + "' does not exist or one of its queried reference-property objects are not present.\n\nStatus: 404 (NotFound)\nErrorCode: Request_ResourceNotFound", { cmd: name + "_Create", term: true, kind: "notfound404" });
    if (b.WhatIf) { ctx.host.push({ text: "What if: Performing the operation \"New-MgGroupMember_Create\" on target \"New-MgGroupMember_Create\"." }); return []; }
    if (g.members.includes(u.Id)) throw new PSErr("One or more added object references already exist for the following modified properties: 'members'.\n\nStatus: 400 (BadRequest)\nErrorCode: Request_BadRequest", { cmd: name + "_Create", term: true, kind: "already" });
    g.members.push(u.Id); return [];
  } });
def("Remove-MgGroupMemberByRef", { module: "Microsoft.Graph.Groups", ver: "2.25.0", ctype: "Function", whatif: true, params: { GroupId: P(0, { req: true }), DirectoryObjectId: P(null, { req: true }) },
  run({ ctx, b, name }) {
    needMg(ctx, name, "Delete", GROUP_READ.concat(USER_WRITE));
    needWrite(ctx, name + "_Delete", GROUP_WRITE);
    const g = findGroup(ctx, b.GroupId); if (!g) throw new PSErr("Resource '" + b.GroupId + "' does not exist or one of its queried reference-property objects are not present.\n\nStatus: 404 (NotFound)\nErrorCode: Request_ResourceNotFound", { cmd: name + "_Delete", term: true, kind: "notfound404" });
    const id = String(b.DirectoryObjectId);
    if (!g.members.some((m) => m.toLowerCase() === id.toLowerCase())) throw new PSErr("Resource '" + id + "' does not exist or one of its queried reference-property objects are not present.\n\nStatus: 404 (NotFound)\nErrorCode: Request_ResourceNotFound", { cmd: name + "_Delete", term: true, kind: "notfound404" });
    if (b.WhatIf) { ctx.host.push({ text: "What if: Performing the operation \"Remove-MgGroupMemberByRef_Delete\" on target \"Remove-MgGroupMemberByRef_Delete\"." }); return []; }
    g.members = g.members.filter((m) => m.toLowerCase() !== id.toLowerCase()); return [];
  } });
def("Get-MgUserMemberOf", { module: "Microsoft.Graph.Users", ver: "2.25.0", ctype: "Function", params: { UserId: P(0, { req: true }), All: S() },
  run({ ctx, b, name }) {
    needMg(ctx, name, "List", USER_READ);
    const u = userById(ctx.t, b.UserId); if (!u) throw new PSErr("Resource '" + b.UserId + "' does not exist or one of its queried reference-property objects are not present.\n\nStatus: 404 (NotFound)\nErrorCode: Request_ResourceNotFound", { cmd: name + "_List", term: true, kind: "notfound404" });
    return ctx.t.groups.filter((g) => g.members.includes(u.Id)).map((g) => grpObj(g.g));
  } });

def("Set-MgUserLicense", { module: "Microsoft.Graph.Users.Actions", ver: "2.25.0", ctype: "Function", whatif: true, params: { UserId: P(0, { req: true }), AddLicenses: P(null), RemoveLicenses: P(null) },
  run({ ctx, b, name }) {
    needMg(ctx, name, "AssignExpanded");
    if (b.AddLicenses === undefined || b.RemoveLicenses === undefined) throw new PSErr("One or more parameters of the operation 'assignLicense' are missing from the request payload. The missing parameters are: " + (b.AddLicenses === undefined ? "addLicenses" : "removeLicenses") + ".\n\nStatus: 400 (BadRequest)\nErrorCode: Request_BadRequest", { cmd: name + "_AssignExpanded", term: true, kind: "lic-missing" });
    needWrite(ctx, name + "_AssignExpanded", LIC_WRITE);
    const u = userById(ctx.t, b.UserId); if (!u) throw new PSErr("Resource '" + b.UserId + "' does not exist or one of its queried reference-property objects are not present.\n\nStatus: 404 (NotFound)\nErrorCode: Request_ResourceNotFound", { cmd: name + "_AssignExpanded", term: true, kind: "notfound404" });
    const add = flat(b.AddLicenses).map((h) => { const id = isHT(h) ? hget(h, "SkuId") : undefined; if (!id) throw new PSErr("Cannot convert the literal '" + toStr(h) + "' to the expected type 'Edm.Guid'.\n\nStatus: 400 (BadRequest)\nErrorCode: Request_BadRequest", { cmd: name + "_AssignExpanded", term: true, kind: "lic-shape" }); return String(id); });
    const rem = flat(b.RemoveLicenses).map(String);
    for (const id of add.concat(rem)) if (!SKUS.some((s) => s.id === id)) throw new PSErr("License " + id + " does not correspond to a valid company License.\n\nStatus: 400 (BadRequest)\nErrorCode: Request_BadRequest", { cmd: name + "_AssignExpanded", term: true, kind: "lic-bad" });
    if (add.length && !u.UsageLocation) throw new PSErr("License assignment cannot be done for user with invalid usage location.\n\nStatus: 400 (BadRequest)\nErrorCode: Request_BadRequest", { cmd: name + "_AssignExpanded", term: true, kind: "lic-usage" });
    for (const id of add) {
      if (u.AssignedLicenses.some((l) => l.SkuId === id)) continue;
      const s = SKUS.find((x) => x.id === id); const used = ctx.t.users.filter((x) => x.AssignedLicenses.some((l) => l.SkuId === id)).length;
      if (used >= s.prepaid) throw new PSErr("Subscription with SKU " + id + " does not have any available licenses.\n\nStatus: 400 (BadRequest)\nErrorCode: Request_BadRequest", { cmd: name + "_AssignExpanded", term: true, kind: "lic-full" });
    }
    if (b.WhatIf) { ctx.host.push({ text: "What if: Performing the operation \"Set-MgUserLicense_AssignExpanded\" on target \"Set-MgUserLicense_AssignExpanded\"." }); return []; }
    u.AssignedLicenses = u.AssignedLicenses.filter((l) => !rem.includes(l.SkuId));
    for (const id of add) if (!u.AssignedLicenses.some((l) => l.SkuId === id)) u.AssignedLicenses.push(obj(GM + "MicrosoftGraphAssignedLicense", { DisabledPlans: [], SkuId: id }));
    if (u.UserType === "Member" && u.AssignedLicenses.some((l) => l.SkuId === SKUS[0].id || l.SkuId === SKUS[1].id) && !ctx.t.mailboxes.some((m) => m.UserPrincipalName === u.UserPrincipalName)) { const m = mbx(rng(7), u.DisplayName, u.UserPrincipalName, "UserMailbox", u.Id); extendOne(m); ctx.t.mailboxes.push(m); }
    return [project(u, null, USER_DEFAULT)];
  } });
function extendOne(m) { Object.assign(m, { ForwardingSmtpAddress: null, ForwardingAddress: null, DeliverToMailboxAndForward: false, HiddenFromAddressListsEnabled: false, GrantSendOnBehalfTo: [], Database: "EURPR04DG104-db044", ProhibitSendQuota: "99 GB (106,300,440,576 bytes)", IsMailboxEnabled: true }); m._arc = { AutoReplyState: "Disabled", InternalMessage: null, ExternalMessage: null, StartTime: null, EndTime: null }; m._stat = { ItemCount: 0, MB: 0.1 }; }
def("New-MgUser", { module: "Microsoft.Graph.Users", ver: "2.25.0", ctype: "Function", whatif: true, params: { DisplayName: P(null), UserPrincipalName: P(null), MailNickname: P(null), AccountEnabled: S(), PasswordProfile: P(null), UsageLocation: P(null), Department: P(null), JobTitle: P(null), GivenName: P(null), Surname: P(null), City: P(null), OfficeLocation: P(null) },
  run({ ctx, b, name }) {
    needMg(ctx, name, "CreateExpanded");
    needWrite(ctx, name + "_CreateExpanded", USER_WRITE);
    const bad = (p) => { throw new PSErr("Invalid value specified for property '" + p + "' of resource 'User'.\n\nStatus: 400 (BadRequest)\nErrorCode: Request_BadRequest", { cmd: name + "_CreateExpanded", term: true, kind: "newuser-missing" }); };
    if (b.AccountEnabled === undefined) bad("accountEnabled");
    if (!b.DisplayName) bad("displayName");
    if (!b.MailNickname) bad("mailNickname");
    if (!b.UserPrincipalName) bad("userPrincipalName");
    if (!isHT(b.PasswordProfile) || !hget(b.PasswordProfile, "Password")) bad("passwordProfile");
    const upn = String(b.UserPrincipalName);
    if (!upn.toLowerCase().endsWith("@" + ctx.t.domain)) throw new PSErr("The domain portion of the userPrincipalName property is invalid. You must use one of the verified domain names in your organization.\n\nStatus: 400 (BadRequest)\nErrorCode: Request_BadRequest", { cmd: name + "_CreateExpanded", term: true, kind: "newuser-domain" });
    if (ctx.t.users.some((u) => u.UserPrincipalName.toLowerCase() === upn.toLowerCase())) throw new PSErr("Another object with the same value for property userPrincipalName already exists.\n\nStatus: 400 (BadRequest)\nErrorCode: Request_BadRequest", { cmd: name + "_CreateExpanded", term: true, kind: "newuser-dup" });
    if (String(hget(b.PasswordProfile, "Password")).length < 8) throw new PSErr("The specified password does not comply with password complexity requirements. Please provide a different password.\n\nStatus: 400 (BadRequest)\nErrorCode: Request_BadRequest", { cmd: name + "_CreateExpanded", term: true, kind: "newuser-pw" });
    if (b.WhatIf) { ctx.host.push({ text: "What if: Performing the operation \"New-MgUser_CreateExpanded\" on target \"New-MgUser_CreateExpanded\"." }); return []; }
    const r = rng(ctx.t.users.length * 97);
    const u = obj(GM + "MicrosoftGraphUser", { AccountEnabled: !!b.AccountEnabled, AssignedLicenses: [], BusinessPhones: [], City: b.City || null, CompanyName: "Halvard & Co", Country: null, CreatedDateTime: new Date(), Department: b.Department || null, DisplayName: String(b.DisplayName), EmployeeId: null, GivenName: b.GivenName || null, Id: guid(r), JobTitle: b.JobTitle || null, Mail: null, MailNickname: String(b.MailNickname), MobilePhone: null, OfficeLocation: b.OfficeLocation || null, OnPremisesSyncEnabled: null, PreferredLanguage: null, SignInActivity: obj(GM + "MicrosoftGraphSignInActivity", { LastNonInteractiveSignInDateTime: null, LastSignInDateTime: null, LastSuccessfulSignInDateTime: null }), Surname: b.Surname || null, UsageLocation: b.UsageLocation || null, UserPrincipalName: upn, UserType: "Member" });
    u._pwChange = truthy(hget(b.PasswordProfile, "ForceChangePasswordNextSignIn"));
    ctx.t.users.push(u);
    return [project(u, null, USER_DEFAULT)];
  } });
def("Remove-MgUser", { module: "Microsoft.Graph.Users", ver: "2.25.0", ctype: "Function", whatif: true, params: { UserId: P(0, { req: true }) },
  run({ ctx, b, name }) {
    needMg(ctx, name, "Delete");
    needWrite(ctx, name + "_Delete", USER_WRITE);
    const u = ctx.t.users.find((x) => x.UserPrincipalName.toLowerCase() === String(b.UserId).toLowerCase() || x.Id.toLowerCase() === String(b.UserId).toLowerCase());
    if (!u) throw new PSErr("Resource '" + b.UserId + "' does not exist or one of its queried reference-property objects are not present.\n\nStatus: 404 (NotFound)\nErrorCode: Request_ResourceNotFound", { cmd: name + "_Delete", term: true, kind: "notfound404" });
    if (b.WhatIf) { ctx.host.push({ text: "What if: Performing the operation \"Remove-MgUser_Delete\" on target \"Remove-MgUser_Delete\"." }); return []; }
    ctx.t.users = ctx.t.users.filter((x) => x !== u); ctx.t.deleted = (ctx.t.deleted || []).concat([u]);
    return [];
  } });
def("Get-MgDirectoryDeletedItemAsUser", { module: "Microsoft.Graph.Identity.DirectoryManagement", ver: "2.25.0", ctype: "Function", params: { All: S() },
  run({ ctx, name }) { needMg(ctx, name, "List", USER_READ); return (ctx.t.deleted || []).map((u) => project(u, null, USER_DEFAULT)); } });
def("Restore-MgDirectoryDeletedItem", { module: "Microsoft.Graph.Identity.DirectoryManagement", ver: "2.25.0", ctype: "Function", whatif: true, params: { DirectoryObjectId: P(0, { req: true }) },
  run({ ctx, b, name }) {
    needMg(ctx, name, "Restore"); needWrite(ctx, name + "_Restore", USER_WRITE);
    const u = (ctx.t.deleted || []).find((x) => x.Id.toLowerCase() === String(b.DirectoryObjectId).toLowerCase());
    if (!u) throw new PSErr("Resource '" + b.DirectoryObjectId + "' does not exist or one of its queried reference-property objects are not present.\n\nStatus: 404 (NotFound)\nErrorCode: Request_ResourceNotFound", { cmd: name + "_Restore", term: true, kind: "notfound404" });
    ctx.t.deleted = ctx.t.deleted.filter((x) => x !== u); ctx.t.users.push(u);
    return [obj(GM + "MicrosoftGraphDirectoryObject", { DeletedDateTime: null, Id: u.Id })];
  } });

function run(src, ctx) {
  ctx.host = [];
  const result = { out: [], host: [], error: null, stages: null, parsed: null };
  let ast;
  try { ast = parse(src); } catch (e) { result.error = e; result.text = e.text(); return result; }
  result.parsed = ast;
  const out = [];
  let stages = null;
  try {
    for (const st of ast) {
      if (st.t === "pipe" && st.p.els.length) { const rec = []; stages = rec; const r = runPipeline(st.p, ctx, rec); out.push(...r); }
      else if (st.t === "assign" && st.val.els) { const rec = []; rec.assign = st.name; stages = rec; let v = pipeValue(st.val, ctx, rec); if (st.op === "+=") v = addVals(ctx.getVar(st.name), v); ctx.setVar(st.name, v); }
      else execStmt(st, ctx, out);
    }
  } catch (e) {
    if (e instanceof Return) out.push(...e.v);
    else if (e instanceof PSErr) { result.error = e; ctx.errors.push(e); }
    else { result.error = new PSErr(String(e && e.message || e), { term: true }); }
  }
  result.out = out;
  result.host = ctx.host.slice();
  result.stages = stages;
  return result;
}
function render(result) {
  const parts = [];
  for (const h of result.host) if (h.clear) parts.length = 0; else parts.push(h);
  return parts;
}

return { makeTenant, Ctx, parse, run, formatOut, toStr, typeName, shortType, getMember, memberRows, PROPTYPES, DISPLAY, CMDS, ALIASES, setHelp: (h) => { HELP = h; }, isObj, isHT, SB, PSErr, flat, unwrap, eqVals, cmpVals, dateShort, visibleProps, NOW, TYPE };
})();
const HELP = {
  "Get-Command": { syn: "Gets all commands.", ex: [
    ["Find commands by a word in their name", "Get-Command *license*", "Wildcards (*) match any characters. This is the fastest way to discover a command when you only know one word."],
    ["List the commands of a module", "Get-Command -Module Microsoft.Graph.Users", "Shows every command that the Microsoft.Graph.Users module exports."],
    ["Filter by verb and noun", "Get-Command -Verb Get -Noun *Device*", "PowerShell commands are Verb-Noun. Search on either half."]] },
  "Get-Help": { syn: "Displays information about PowerShell commands and concepts.", ex: [
    ["Show examples only", "Get-Help Where-Object -Examples", "Usually the quickest way to see how a command is used."],
    ["Explain one parameter", "Get-Help Select-Object -Parameter Property", "Shows whether a parameter is required, its position and pipeline input."],
    ["Show the syntax", "Get-Help Sort-Object", "The SYNTAX block lists every parameter. [ ] means optional."]] },
  "Get-Member": { syn: "Gets the properties and methods of objects.", ex: [
    ["See what a user object contains", "Get-MgUser -Top 1 | Get-Member", "Lists the TypeName and every property and method of the objects you pipe in."],
    ["Only properties", "Get-MgUser -Top 1 | Get-Member -MemberType Property", "Hides the methods so the property list is easier to read."],
    ["Search members by name", "Get-MgSubscribedSku | Get-Member -Name *Units*", "Wildcards work on member names too."]] },
  "Where-Object": { syn: "Selects objects from a collection based on their property values.", ex: [
    ["Filter with a script block", "Get-MgUser -All -Property DisplayName,AccountEnabled |\n    Where-Object { $_.AccountEnabled -eq $false }", "$_ is the current object in the pipeline. The block must return $true to keep the object."],
    ["Simplified syntax", "Get-MgUser -All -Property Department | Where-Object Department -eq 'Sales'", "Property, operator, value. No braces, no $_. Only one condition."],
    ["Combine conditions", "Where-Object { $_.Department -eq 'Sales' -or $_.Department -eq 'Legal' }", "-and and -or combine conditions. Comparison operators are case-insensitive."]] },
  "Select-Object": { syn: "Selects objects or object properties.", ex: [
    ["Pick properties", "Get-MgUser -All -Property DisplayName,Department | Select-Object DisplayName, Department", "Creates new objects that only contain the properties you name."],
    ["First and last", "Get-MgUser -All | Select-Object -First 5", "-First, -Last and -Skip pick objects by position."],
    ["Calculated property", "Select-Object DisplayName, @{ Name = 'LastSignIn'; Expression = { $_.SignInActivity.LastSignInDateTime } }", "A hashtable with Name and Expression creates a new column from a script block."],
    ["Unwrap one property", "Get-MgSubscribedSku | Select-Object -ExpandProperty SkuPartNumber", "-ExpandProperty outputs the plain values instead of objects."]] },
  "Sort-Object": { syn: "Sorts objects by property values.", ex: [
    ["Sort by a property", "Get-MgUser -All | Sort-Object DisplayName", "Ascending by default."],
    ["Newest first", "Sort-Object LastSignIn -Descending", "-Descending reverses the order."],
    ["Unique values", "Select-Object -ExpandProperty Department | Sort-Object -Unique", "-Unique removes duplicates after sorting."]] },
  "Group-Object": { syn: "Groups objects that contain the same value for specified properties.", ex: [
    ["Count per value", "Get-MgUser -All -Property Department | Group-Object Department", "Each group has Count, Name and Group (the objects inside it)."],
    ["Counts only", "Get-MgDevice -All | Group-Object OperatingSystem -NoElement", "-NoElement drops the Group column. Faster and easier to read."],
    ["Biggest group first", "Group-Object City -NoElement | Sort-Object Count -Descending", "Group, then sort the groups by Count."]] },
  "Measure-Object": { syn: "Calculates the numeric properties of objects, and the characters, words, and lines in string objects.", ex: [
    ["Count objects", "Get-MgUser -All | Measure-Object", "Count is always calculated."],
    ["Sum a property", "(Get-MgSubscribedSku | Measure-Object ConsumedUnits -Sum).Sum", "-Sum, -Average, -Maximum, -Minimum. Wrap in ( ) and read the property you need."],
    ["Oldest date", "(Get-MgUser -All -Property CreatedDateTime | Measure-Object CreatedDateTime -Minimum).Minimum", "-Minimum and -Maximum also work on dates and strings."]] },
  "ForEach-Object": { syn: "Performs an operation against each item in a collection of input objects.", ex: [
    ["Run a block per object", "Get-MgSubscribedSku | ForEach-Object { \"$($_.SkuPartNumber): $($_.ConsumedUnits)\" }", "Whatever the block outputs goes down the pipeline."],
    ["Output one property", "Get-MgUser -All | ForEach-Object UserPrincipalName", "With a property name instead of a block, it outputs that property's value."],
    ["Build report rows", "ForEach-Object { [PSCustomObject]@{ Name = $_.DisplayName; Dept = $_.Department } }", "Combine with [PSCustomObject] to shape your own output."]] },
  "Export-Csv": { syn: "Converts objects into a series of character-separated value (CSV) strings and saves the strings to a file.", ex: [
    ["Export a report", "Get-MgUser -All -Property DisplayName,Department |\n    Select-Object DisplayName, Department |\n    Export-Csv -Path ./users.csv -NoTypeInformation", "Select the columns first. Export-Csv writes every property it finds, including empty ones."],
    ["Append", "Export-Csv -Path ./log.csv -Append", "Adds rows to an existing file."]] },
  "Import-Csv": { syn: "Creates table-like custom objects from the items in a character-separated value (CSV) file.", ex: [
    ["Read a CSV", "Import-Csv ./users.csv", "Every row becomes an object. All values are strings."],
    ["Read and group", "Import-Csv ./users.csv | Group-Object Department -NoElement", "Imported objects work with every pipeline command."]] },
  "Get-Content": { syn: "Gets the content of the item at the specified location.", ex: [["Show a file", "Get-Content ./users.csv", "Outputs one string per line."], ["First lines", "Get-Content ./users.csv -TotalCount 3", "Like head."]] },
  "Get-ChildItem": { syn: "Gets the items and child items in one or more specified locations.", ex: [["List files", "Get-ChildItem", "Aliases: ls, dir, gci."]] },
  "Get-Date": { syn: "Gets the current date and time.", ex: [["Ninety days ago", "(Get-Date).AddDays(-90)", "Use this as the cut-off for stale accounts."], ["Formatted", "Get-Date -Format 'yyyy-MM-dd'", "Handy for file names."]] },
  "Write-Output": { syn: "Writes the specified objects to the pipeline.", ex: [["Output a value", "Write-Output 'done'", "Same as just writing 'done'."]] },
  "Write-Host": { syn: "Writes customized output to a host.", ex: [["Print to the screen", "Write-Host 'Starting discovery' -ForegroundColor Cyan", "Write-Host does not send objects down the pipeline."]] },
  "Format-Table": { syn: "Formats the output as a table.", ex: [["Choose columns", "Get-MgUser -All -Property DisplayName,Department | Format-Table DisplayName, Department", "Format-* is for the screen only. Never pipe it into Export-Csv."]] },
  "Format-List": { syn: "Formats the output as a list of properties in which each property appears on a new line.", ex: [["All properties of one user", "Get-MgUser -Top 1 | Format-List *", "Good for reading one wide object."]] },
  "Connect-MgGraph": { syn: "Connects to Microsoft Graph with the permission scopes you ask for.", ex: [
    ["Read-only discovery", "Connect-MgGraph -Scopes 'User.Read.All','AuditLog.Read.All','Directory.Read.All'", "Ask only for the scopes you need. You can call it again later to add scopes."],
    ["Quiet sign-in", "Connect-MgGraph -Scopes 'User.Read.All' -NoWelcome", "-NoWelcome hides the welcome banner."]] },
  "Get-MgContext": { syn: "Gets details about the current Microsoft Graph session.", ex: [["Check your scopes", "(Get-MgContext).Scopes", "Shows which permissions this session has."]] },
  "Disconnect-MgGraph": { syn: "Signs out of Microsoft Graph.", ex: [["Sign out", "Disconnect-MgGraph", "Ends the session."]] },
  "Get-MgUser": { syn: "Returns users from Microsoft Entra ID through Microsoft Graph.", ex: [
    ["All users", "Get-MgUser -All", "Without -All you get the first page only (100 users)."],
    ["Ask for properties", "Get-MgUser -All -Property DisplayName,Department,AccountEnabled", "Graph only returns a small default set. Properties you do not ask for come back empty."],
    ["Sign-in activity", "Get-MgUser -All -Property DisplayName,SignInActivity", "Needs the AuditLog.Read.All scope."],
    ["One user", "Get-MgUser -UserId brannoc.vale@halvardco.onmicrosoft.com", "Accepts the object Id or the UserPrincipalName."],
    ["Server-side filter", "Get-MgUser -Filter \"department eq 'Sales'\" -Property DisplayName,Department", "OData filter, runs in Graph. Faster than Where-Object on big tenants."]] },
  "Update-MgUser": { syn: "Updates the properties of a user.", ex: [
    ["Preview a change", "Update-MgUser -UserId brannoc.vale@halvardco.onmicrosoft.com -AccountEnabled:$false -WhatIf", "-WhatIf shows what would happen and changes nothing."],
    ["Disable a user", "Update-MgUser -UserId brannoc.vale@halvardco.onmicrosoft.com -AccountEnabled:$false", "Needs User.ReadWrite.All."]] },
  "Get-MgUserLicenseDetail": { syn: "Gets the licences assigned to one user.", ex: [["Licences of one user", "Get-MgUserLicenseDetail -UserId ysolde.marrow@halvardco.onmicrosoft.com", "Shows SkuPartNumber per assigned licence."]] },
  "Get-MgSubscribedSku": { syn: "Gets the licence SKUs the organisation has bought.", ex: [["Licence overview", "Get-MgSubscribedSku | Select-Object SkuPartNumber, ConsumedUnits", "PrepaidUnits.Enabled is how many you bought."]] },
  "Get-MgDirectoryRole": { syn: "Gets the activated directory (admin) roles.", ex: [["List roles", "Get-MgDirectoryRole | Select-Object DisplayName, Id", "Only roles that have been used at least once are activated."]] },
  "Get-MgDirectoryRoleMember": { syn: "Gets the members of a directory role.", ex: [["Members of a role", "Get-MgDirectoryRoleMember -DirectoryRoleId <role Id>", "Members are directory objects. Their name sits in .AdditionalProperties.userPrincipalName."]] },
  "Get-MgDevice": { syn: "Gets devices registered in Microsoft Entra ID.", ex: [["All devices", "Get-MgDevice -All | Select-Object DisplayName, OperatingSystem, IsCompliant", "IsCompliant comes from Intune."]] },
  "Connect-ExchangeOnline": { syn: "Connects to Exchange Online with modern authentication.", ex: [["Connect quietly", "Connect-ExchangeOnline -ShowBanner:$false", "Loads the EXO cmdlets, such as Get-EXOMailbox."]] },
  "Revoke-MgUserSignInSession": { syn: "Invalidates all refresh tokens issued to a user, so existing sessions must sign in again.", ex: [
    ["Kill a leaver's sessions", "Revoke-MgUserSignInSession -UserId brannoc.vale@halvardco.onmicrosoft.com", "Run it right after blocking sign-in. Already-issued access tokens can stay valid for up to about an hour."],
    ["Rehearse first", "Revoke-MgUserSignInSession -UserId brannoc.vale@halvardco.onmicrosoft.com -WhatIf", "Needs User.ReadWrite.All (or User.RevokeSessions.All)."]] },
  "Disconnect-ExchangeOnline": { syn: "Closes your Exchange Online session.", ex: [["End a script cleanly", "Disconnect-ExchangeOnline -Confirm:$false", "-Confirm:$false answers the 'are you sure' prompt so nothing waits for you."]] },
  "Get-EXOMailbox": { syn: "Gets mailbox objects from Exchange Online.", ex: [["All mailboxes", "Get-EXOMailbox -ResultSize Unlimited", "Default ResultSize is 1000."], ["Only shared mailboxes", "Get-EXOMailbox -RecipientTypeDetails SharedMailbox", "Filter on the type of mailbox."]] },
  "Out-Null": { syn: "Hides the output instead of sending it down the pipeline.", ex: [["Discard output", "Get-MgUser -All | Out-Null", "Nothing is shown."]] },
  "ConvertTo-Csv": { syn: "Converts objects into CSV strings.", ex: [["Preview CSV", "Get-MgSubscribedSku | Select-Object SkuPartNumber, ConsumedUnits | ConvertTo-Csv", "Same as Export-Csv but to the screen."]] },
  "Write-Warning": { syn: "Writes a warning message.", ex: [["Warn", "Write-Warning 'No admins found'", "Shown in yellow."]] },
};
PS.setHelp(HELP);
if (typeof module!=="undefined") module.exports=PS;
