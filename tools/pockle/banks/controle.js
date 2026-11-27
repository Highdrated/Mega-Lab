POCKET.register({
  id: "controle",
  name: "Controle",
  topic: "SC-500",
  href: "controle.html",
  keys: ["controle.v1"],
  units: [
    {"id":"d1","title":"Day 1 · Password spray and Conditional Access"},
    {"id":"d2","title":"Day 2 · PIM and stolen sessions"},
    {"id":"d3","title":"Day 3 · Consent phishing"},
    {"id":"d4","title":"Day 4 · Managed identities"},
    {"id":"d5","title":"Day 5 · Key Vault"}
  ],
  done: function (get) {
try { var s = get("controle.v1"); if (!s || typeof s !== "object" || !Array.isArray(s.daysDone)) return []; return [1, 2, 3, 4, 5].filter(function (n) { return s.daysDone.indexOf(n) >= 0; }).map(function (n) { return "d" + n; }); } catch (e) { return []; }
},
  sample: {
    "controle.v1": "{\"ch\":3,\"daysDone\":[1,2],\"reached\":3,\"studied\":[],\"lit\":[],\"oops\":[],\"won\":[1,2]}"
  },
  sampleDone: ["d1","d2"],
  cards: [
    {"u":"d1","q":"Why does Entra smart lockout not stop a password spray?","o":["Smart lockout is off by default","It only tries a few passwords on each account","Sprays only target admin accounts"],"a":1,"why":"Each account sees one or two tries. That is far below the lockout limit of 10."},
    {"u":"d1","q":"A Conditional Access policy has three parts. Where do you pick who it applies to?","o":["Target resources","Grant","Users"],"a":2,"why":"Users is the who. Target resources is the what. Grant is the then."},
    {"u":"d1","q":"An MFA policy includes only the Garrison group. Who is not protected?","o":["Everyone outside Garrison","Nobody, MFA covers the whole tenant","Only global admins"],"a":0,"why":"A policy only touches the users it includes. Everyone else signs in with just a password."},
    {"u":"d1","q":"Which accounts do you exclude from every Conditional Access policy?","o":["All global admins","Emergency access accounts","All guest accounts"],"a":1,"why":"A broken policy must not lock everyone out. Only the break-glass accounts stay out, and you alert on every sign-in they make."},
    {"u":"d1","q":"Client apps is set to Browser only. A raider signs in with a legacy client. What happens?","o":["The policy does not apply, so the guessed password gets in","He gets an MFA prompt and fails it","Legacy clients are always blocked"],"a":0,"why":"Once you set Client apps, the policy only covers the boxes you ticked."},
    {"u":"d1","q":"Which client apps option covers legacy protocols other than ActiveSync?","o":["Browser","Mobile apps and desktop clients","Other clients"],"a":2,"why":"Other clients is the box for old protocols like IMAP and POP. Tick it to block legacy sign-ins."},
    {"u":"d2","q":"Why is a permanent Global Administrator risky?","o":["It needs an extra licence","A stolen session gets full control right away","It switches off MFA"],"a":1,"why":"Standing access means nothing is left to stop a thief once the session is taken."},
    {"u":"d2","q":"Which Entra feature hands out admin roles just in time?","o":["Conditional Access","Privileged Identity Management","Access reviews"],"a":1,"why":"PIM makes a role eligible. You activate it when you need it, for a limited time."},
    {"u":"d2","q":"A tenant only has Entra ID P1. Can it use PIM?","o":["Yes, P1 includes PIM","No, PIM needs P2 or Entra ID Governance","Only for Global Administrator"],"a":1,"why":"P1 covers Conditional Access. PIM is a P2 or Entra ID Governance feature."},
    {"u":"d2","q":"A raider holds the stolen session of an eligible Global Administrator. Approval is off. What happens?","o":["PIM blocks every activation at night","The role can never be activated","He can activate the role himself"],"a":2,"why":"Without approval, activation only asks for MFA and a reason. A stolen session may already have both."},
    {"u":"d2","q":"A phished helpdesk account holds Helpdesk Administrator. How bad is it?","o":["As bad as a stolen Global Administrator","Contained: it can reset regular users' passwords, not take over the tenant","Harmless, that role cannot change anything"],"a":1,"why":"Least privilege does not stop the theft. It limits what the thief can do."},
    {"u":"d2","q":"Why are emergency access accounts not made eligible in PIM?","o":["They must work even when PIM or MFA is down","Eligible roles cost more","PIM cannot manage Global Administrator"],"a":0,"why":"Break-glass accounts exist for the day your normal controls fail. So their roles stay active."},
    {"u":"d3","q":"Why does MFA not stop consent phishing?","o":["MFA is off for apps","The app guesses the password","The user signs in and approves the app themselves"],"a":2,"why":"The user is the one who says yes. MFA only proves it really was them."},
    {"u":"d3","q":"A user accepts an app that asks for Mail.Read (delegated). Whose mail can it read?","o":["Every mailbox in the tenant","Only that user's mail","None until an admin approves"],"a":1,"why":"Delegated means the app acts as that one user. It reaches what that user can reach."},
    {"u":"d3","q":"Which permission type lets an app act as itself, with no user signed in?","o":["Delegated","Application","Low impact"],"a":1,"why":"Application permissions work without a user. That is why they always need admin consent."},
    {"u":"d3","q":"Users may consent to verified publishers only. An unverified app asks for Mail.Read. What does the user see?","o":["They can consent, but get a warning","The app is installed silently","They cannot consent and are told to ask an admin"],"a":2,"why":"Outside the policy, users are blocked from consenting and pointed to an admin."},
    {"u":"d3","q":"Someone adds Files.Read.All to the low impact list. What changes?","o":["Any verified app can now read a user's files without an admin","Nothing, the list is only a label","Users lose access to their own files"],"a":0,"why":"The list is exactly what users may grant. Keep it to basic sign-in permissions."},
    {"u":"d3","q":"You switch user consent off today. A bad app got consent last spring. Is it stopped?","o":["Yes, all old consents are removed","No, its old grants work until you revoke them","Yes, but only after 30 days"],"a":1,"why":"The setting only decides future consent. Old grants stay until you remove them."},
    {"u":"d4","q":"What does a raider need to sign in as an app that uses a client secret?","o":["Only the secret and the app's IDs","The app owner's MFA","Access to the VM"],"a":0,"why":"A client secret works from anywhere. That is what makes a leaked one so dangerous."},
    {"u":"d4","q":"Three VMs need the same access to one storage account. Which fits best?","o":["Three system-assigned identities sharing a secret","A client secret on each VM","One user-assigned identity on all three"],"a":2,"why":"One user-assigned identity means one set of role assignments for all three VMs."},
    {"u":"d4","q":"Which managed identity type is deleted together with its resource?","o":["System-assigned","User-assigned","Both"],"a":0,"why":"A system-assigned identity lives and dies with its resource. A user-assigned one is its own resource."},
    {"u":"d4","q":"The app uses the VM's system-assigned identity, but Status is Off. What happens?","o":["It falls back to a client secret","The app cannot get a token and fails","Azure turns it on automatically"],"a":1,"why":"Off means there is no identity to ask a token for."},
    {"u":"d4","q":"An app holds Contributor on a storage account and signs in with Entra. It tries to read a blob. What happens?","o":["It reads the blob, Contributor covers everything","Access is denied, Contributor has no data actions","It can only read blobs in the portal"],"a":1,"why":"Control-plane roles manage the account. Data roles, like Storage Blob Data Reader, read what is inside."},
    {"u":"d4","q":"You removed a leaked client secret from the config file. Is it dead?","o":["Yes, the app stops using it","Yes, after the next restart","No, it works until you delete it in the app registration"],"a":2,"why":"The secret lives in Entra, not in your file. Delete it there."},
    {"u":"d5","q":"Someone can change the vault's network settings. Can they read its secrets?","o":["Yes, the two always go together","Not by itself: that is the control plane, secrets are the data plane","Only if the vault is in the same region"],"a":1,"why":"Two planes, two permissions. Keep them apart."},
    {"u":"d5","q":"Which permission model does Microsoft recommend for Key Vault?","o":["Vault access policies","Azure RBAC","Shared access signatures"],"a":1,"why":"Azure RBAC is the recommended model. With access policies, anyone who can edit the vault can hand themselves the data."},
    {"u":"d5","q":"A vault uses access policies. A developer has Contributor on it. What can they do?","o":["Nothing inside the vault, ever","Only read secret names","Give themselves access to every secret"],"a":2,"why":"Contributor can write access policies, and an access policy is the key to the data."},
    {"u":"d5","q":"Which role lets an app read a secret's value and nothing more?","o":["Key Vault Secrets User","Key Vault Secrets Officer","Key Vault Reader"],"a":0,"why":"Secrets User reads secret values. Secrets Officer can also change them. Reader sees only metadata."},
    {"u":"d5","q":"Public access is disabled and there is no private endpoint. Can an app in your VNet reach the vault?","o":["Yes, VNets always get through","No, there is no way in left","Only with Key Vault Administrator"],"a":1,"why":"With public access disabled, only a private endpoint lets traffic in."},
    {"u":"d5","q":"Soft delete is on, purge protection is off. A raider deletes the vault. Is it safe?","o":["No, he can purge it straight away","Yes, soft delete keeps it no matter what","Yes, Azure always keeps a backup"],"a":0,"why":"Soft delete keeps it only until someone purges it. Purge protection closes that gap."}
  ]
});
