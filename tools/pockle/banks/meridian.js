POCKET.register({
  id: "meridian",
  name: "Meridian",
  topic: "Infra",
  href: "meridian.html",
  keys: ["meridian.v1"],
  units: [
    {"id":"l1-hyper","title":"Hosts, VMs and the hypervisor"},
    {"id":"l1-move","title":"vMotion, DRS and HA"},
    {"id":"l1-snap","title":"Snapshots and thin disks"},
    {"id":"l2-roles","title":"Roles, features and services"},
    {"id":"l2-logs","title":"Event logs"},
    {"id":"l2-patch","title":"Updates, reboots and time"}
  ],
  done: function (get) {
try { var s = get("meridian.v1"); if (!s || typeof s !== "object" || !s.les || typeof s.les !== "object") return []; return ["l1-hyper","l1-move","l1-snap","l2-roles","l2-logs","l2-patch"].filter(function (id) { return s.les[id] === true; }); } catch (e) { return []; }
},
  sample: {
    "meridian.v1": "{\"les\":{\"l0-orient\":true,\"l1-hyper\":true,\"l1-move\":true},\"done\":{}}"
  },
  sampleDone: ["l1-hyper","l1-move"],
  cards: [
    {"u":"l1-hyper","q":"A hypervisor that is itself the operating system of the server is which type?","o":["Type 2, hosted","Type 1, bare metal","Type 3, clustered","a container runtime"],"a":1,"why":"Type 1 runs straight on the hardware: ESXi, Hyper-V, Proxmox. Type 2 is an app on a normal OS."},
    {"u":"l1-hyper","q":"A VM has 4 vCPUs. What does it really own?","o":["4 physical cores","4 cores on each host","nothing fixed, it gets turns on the cores","half of the host"],"a":2,"why":"vCPUs are promises. The hypervisor hands out turns, which is why a host can promise more vCPUs than it has cores."},
    {"u":"l1-hyper","q":"A VM is slow and its CPU ready is high. What is often the wrong fix?","o":["right-size it","check what else runs on the host","move it to a quieter host","add more vCPUs"],"a":3,"why":"A VM with more vCPUs waits longer, because it needs that many cores free at once."},
    {"u":"l1-move","q":"vMotion moves a running VM but not its disk. What must both hosts reach?","o":["the same shared storage","the same local disk","the same ISO","the same backup"],"a":0,"why":"The disk stays where it is, so the target host has to reach it too."},
    {"u":"l1-move","q":"Two domain controllers must never sit on the same host. Which rule says that?","o":["an affinity rule","an anti-affinity rule","admission control","EVC mode"],"a":1,"why":"Anti-affinity keeps VMs apart, so one host failure cannot take both."},
    {"u":"l1-move","q":"A host dies. What does HA do with its VMs?","o":["moves them live, nobody notices","restores them from backup","powers them on again on other hosts","nothing until someone clicks"],"a":2,"why":"HA is a restart: the VMs boot again on the surviving hosts. Count on minutes, not seconds."},
    {"u":"l1-move","q":"What keeps spare room free in a cluster so HA has somewhere to restart VMs?","o":["DRS","Fault Tolerance","Storage vMotion","admission control"],"a":3,"why":"Without admission control a cluster can be full, and HA has nowhere to put the VMs."},
    {"u":"l1-snap","q":"Why is a snapshot not a backup?","o":["it lives on the same datastore and needs the base disk","it is too small","it only saves the RAM","it cannot be reverted"],"a":0,"why":"Datastore gone, snapshot gone. Base disk corrupt, snapshot useless."},
    {"u":"l1-snap","q":"You delete a snapshot. What happens to its delta file?","o":["it is thrown away","it is merged into the base disk","it becomes a backup","it is moved to another host"],"a":1,"why":"Deleting merges the changes back. Reverting is what throws the delta away."},
    {"u":"l1-snap","q":"A snapshot was forgotten for months on a busy database. What is the real danger?","o":["the VM loses its licence","the snapshot expires","the delta fills the datastore and VMs on it pause","the host reboots"],"a":2,"why":"The delta grows with every write. A full datastore pauses every VM that wants to write."},
    {"u":"l1-snap","q":"A thin 500 GB disk holds 120 GB of data. How much does it take on the datastore?","o":["500 GB","620 GB","0 GB","about 120 GB"],"a":3,"why":"Thin grows as data is written. Thick claims all 500 GB from day one."},
    {"u":"l2-roles","q":"DNS Server and Print Services are jobs a Windows server does for others. What are they called?","o":["roles","features","services packs","snap-ins"],"a":0,"why":"A role is a job for others. A feature supports the server itself, like Windows Server Backup."},
    {"u":"l2-roles","q":"A service with startup type Automatic is stopped. How do you read that?","o":["normal, it starts when asked","a red flag worth a look","it is disabled","it is delayed"],"a":1,"why":"Automatic means it should run after boot. Stopped is only normal for Manual."},
    {"u":"l2-roles","q":"Which command gives you a prompt on a remote server?","o":["Invoke-WebRequest ad-dc-01","Get-Service ad-dc-01","Enter-PSSession ad-dc-01","Test-NetConnection ad-dc-01"],"a":2,"why":"`Enter-PSSession` opens an interactive remote session over WinRM. `Exit-PSSession` leaves it."},
    {"u":"l2-logs","q":"Which event ID says a service terminated unexpectedly?","o":["4625","1074","6008","7034"],"a":3,"why":"7034 is a service crash. 7036 is a normal start or stop."},
    {"u":"l2-logs","q":"Who restarted this server, and why? Which event ID answers that?","o":["1074","41","4740","2013"],"a":0,"why":"1074 records who or what asked for the restart."},
    {"u":"l2-logs","q":"A service is stopped. What comes before restarting it?","o":["reboot the server","find out why it stopped: the first error in the log","reinstall the role","restart its partner too"],"a":1,"why":"Restarting is the fix only once you know the cause. Otherwise you are back tomorrow."},
    {"u":"l2-patch","q":"Kerberos refuses logons when clocks differ by more than how long?","o":["30 seconds","1 minute","5 minutes","1 hour"],"a":2,"why":"The default tolerance is 5 minutes. A drifting clock quietly breaks domain logons."},
    {"u":"l1-hyper","q":"A VM is a folder of files. What is the .vmx file?","o":["the virtual hard disk","the recipe: vCPUs, RAM, disks, network","a snapshot delta","the memory dump"],"a":1,"why":"The `.vmx` describes the VM. The `.vmdk` is its disk."},
    {"u":"l1-hyper","q":"You want to give a running VM more CPU. What does that need?","o":["nothing, it always works","a snapshot first","hot-add switched on, or the VM powered off","a second host"],"a":2,"why":"CPU and memory changes need the VM off, unless hot-add is on, and then only upwards."},
    {"u":"l1-move","q":"What does N+1 mean for a cluster?","o":["it can lose one host and still run everything","every VM has one backup","one host is always switched off","each VM has one spare vCPU"],"a":0,"why":"N hosts carry the load, plus one of room for a failure or a patch round."},
    {"u":"l1-move","q":"Two hosts each run at 55% memory. Is that N+1?","o":["yes, both are under 60%","yes, HA sorts it out","only with DRS on","no, one host would need 110%"],"a":3,"why":"If one dies, the other must carry both loads. 110% does not fit, so not every VM restarts."},
    {"u":"l1-move","q":"What usually breaks N+1 first?","o":["CPU","memory","network ports","licences"],"a":1,"why":"CPU can be shared and slowed down. Memory cannot."},
    {"u":"l1-move","q":"What do you do with a host before you patch it?","o":["take a snapshot of it","switch HA off","put it in maintenance mode","remove it from the cluster"],"a":2,"why":"A host in maintenance mode runs and starts no VMs, so they move off first."},
    {"u":"l1-move","q":"Which option keeps a live shadow copy of a VM on another host for zero downtime?","o":["Fault Tolerance","HA","DRS","vMotion"],"a":0,"why":"Fault Tolerance is the zero-downtime option. Expensive and rarely used. HA is a restart."},
    {"u":"l2-roles","q":"What is Server Core?","o":["a server with one CPU core","the first domain controller","a licence type","Windows Server without a desktop"],"a":3,"why":"No desktop: you manage it remotely with PowerShell. Fewer parts, fewer patches."},
    {"u":"l2-roles","q":"You want the same check on dns-01 and dns-02 in one go. Which command?","o":["Enter-PSSession dns-01,dns-02","Invoke-Command -ComputerName dns-01,dns-02 -ScriptBlock { ... }","Get-Service -Both","Test-NetConnection dns-01,dns-02"],"a":1,"why":"`Invoke-Command` runs a script block on many servers at once. `Enter-PSSession` is one server, interactive."},
    {"u":"l2-logs","q":"Event 6008 in the System log. What happened?","o":["a logon failed","a service timed out","the previous shutdown was unexpected","a disk is nearly full"],"a":2,"why":"6008 means the server went down without a clean shutdown."},
    {"u":"l2-logs","q":"Which event ID says an account was locked out?","o":["4740","4625","7000","2013"],"a":0,"why":"4740 is a lockout, logged on a domain controller. 4625 is one failed logon."},
    {"u":"l2-logs","q":"Event 2013 is a warning worth acting on. What does it say?","o":["a service crashed","someone asked for a restart","an account was locked out","a disk is at or near capacity"],"a":3,"why":"2013 warns hours before a full disk starts breaking services."},
    {"u":"l2-patch","q":"When does Microsoft ship its monthly security updates?","o":["the first Monday","the second Tuesday","the last Friday","every Sunday night"],"a":1,"why":"Patch Tuesday is the second Tuesday of each month."},
    {"u":"l2-patch","q":"A server is in pending reboot. What does that mean?","o":["it will reboot within a minute","it is broken","updates are installed but only finish at the next restart","it is waiting for a licence"],"a":2,"why":"Until the restart, the server runs a mix of old and new files."}
  ]
});
