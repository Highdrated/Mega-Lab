/* soul.js — immersion layer for the Workshop labs.
   One resident NPC per world who talks while you work, reacts to your wins and
   misses, and a little ambient motion so the room feels inhabited.
   Usage: <script src="../js/soul.js" data-lab="shelle"></script>
   Everything here is cosmetic: it never touches lab state, pauses when the tab
   is hidden, respects prefers-reduced-motion, and can be silenced with the
   "quiet" toggle (remembered per device). No emoji, same rule as the labs. */
(function () {
  "use strict";
  var tag = document.currentScript;
  var id = (tag && tag.getAttribute("data-lab")) || "";
  var W = {
    shelle: {
      name: "Mara", role: "harbourmaster", hue: "#0f8a6a", fx: "bubbles",
      hello: ["Tide's in. Containers don't stack themselves.", "Back at the yard? Good. Open a shell."],
      idle: [
        "Tab is your crane. Press it before you type the whole path.",
        "Up-arrow brings back the last command. Ctrl+R searches all of them.",
        "docker ps shows what is running. docker ps -a shows what ever ran.",
        "Never run a script you have not read. Not even if the README says curl | sh.",
        "Quote your variables. \"$file\" survives spaces; $file does not.",
        "rm -i, or ls first. Look at the crate before you drop it in the sea.",
        "A container is disposable. A volume is not. Know which one holds your data.",
        "Least privilege: if it works without sudo, run it without sudo.",
        "Gulls on the radio say the registry is slow today. Pin your image tags anyway.",
        "Read the error top to bottom. The real fault is usually the first line.",
        "man and --help are free. Guessing flags is not.",
        "docker compose down removes containers. Add -v and you remove the volumes too. Careful."
      ],
      win: ["Cargo logged. Clean run.", "That is how a harbourmaster types.", "Tidy. Next crate.", "Right command, right order."],
      miss: ["Not that one. Read the output, it tells you what it wanted.", "Happens to everyone. Check the hint before you guess twice.", "Wrong tide. Look at the clue again."]
    },
    poshle: {
      name: "Ines", role: "night operator", hue: "#1f6feb", fx: "bits",
      hello: ["Floor is quiet. Console's yours.", "Night shift. Coffee's cold, pipeline's warm."],
      idle: [
        "Verb-Noun, always. Get-, Set-, New-, Remove-. If you can guess it, it probably exists.",
        "Get-Help and Get-Member: the two cmdlets that teach you the rest.",
        "Filter left. Where-Object after you have pulled a million rows costs you the whole shift.",
        "-WhatIf before any Remove-. Every time. It is free insurance.",
        "Objects, not text. Select-Object picks properties, it does not slice strings.",
        "Never paste a password into a script. Get-Credential, or a vault.",
        "Invoke-Expression on text you did not write is how incidents start.",
        "Use full cmdlet names in scripts. Aliases are for the console, not the review.",
        "Export what you changed. Future-you will be asked 'what did you touch?'",
        "Test on one account before you run it on four hundred.",
        "Format-Table is for your eyes. Do it last, never before another cmdlet.",
        "The ticket queue blinks. It always blinks. Finish the case you are on."
      ],
      win: ["Case closed. Log it.", "Clean pipeline. I would sign off on that.", "Good. No side effects.", "That is the shape of a real runbook."],
      miss: ["Close. Check the clue board before you retry.", "Read the error as an object: what property failed?", "Not quite. Try Get-Help on it."]
    },
    "git-lab": {
      name: "Orrin", role: "dock chief", hue: "#58a6ff", fx: "stars",
      hello: ["Docking bay seven is clear. Commit when ready.", "Welcome aboard. The log never forgets."],
      idle: [
        "git status first, always. It is the instrument panel.",
        "Small commits, clear messages. Your future crew reads them.",
        "Never rewrite history other people have pulled. Force-push to a shared branch is a mutiny.",
        "If you must force, --force-with-lease. It checks nobody else landed first.",
        "git diff before git add. Know what you are about to ship.",
        "Branches are cheap. Experiment on one, merge when it is proven.",
        "Pull before you push. The remote has been busy while you were out.",
        "Secrets in a commit are secrets forever. Rotate the key, do not just delete the file.",
        "git stash is a locker, not a bin. Check it now and then.",
        "git reflog remembers what you lost. Breathe before you panic.",
        "A merge conflict is two people being right. Read both sides, then decide.",
        "Station lights are dimming for the night cycle. The repo stays up."
      ],
      win: ["Clean history. Dock chief approves.", "Pushed and nothing lost.", "That is a tidy log.", "Good call. Safe, and recoverable."],
      miss: ["Hold. Run git status and see where you really are.", "That would have cost someone their work. Rethink.", "Not that command. Check the clue."]
    },
    seqle: {
      name: "Chef Roux", role: "head chef", hue: "#e08a4a", fx: "steam",
      hello: ["Tables are set. What is the order?", "Ah, you are here. The pass is ready."],
      idle: [
        "SELECT only the columns you need. A star is a lazy cook.",
        "WHERE before you GROUP, HAVING after. Filter the raw first, the groups second.",
        "Always a WHERE on UPDATE and DELETE. Always. Test it as a SELECT first.",
        "Never build a query by gluing user text into a string. Parameters, chef, parameters.",
        "JOIN on keys, and say which kind. LEFT keeps the empty plates.",
        "NULL is not zero and not empty. It is 'we do not know'. Use IS NULL.",
        "Index the column you search by, not the column you read.",
        "ORDER BY without LIMIT on a huge table is a fire in the kitchen.",
        "Wrap risky changes in a transaction. ROLLBACK is the undo you will thank me for.",
        "COUNT(*) counts rows, COUNT(col) skips NULLs. Taste the difference.",
        "Name things clearly. 'orders', not 'tbl1'.",
        "Somebody is flambeing at table four. Eyes on your query."
      ],
      win: ["Magnifique. Plate it.", "Exactly the rows ordered. No more, no less.", "Clean query. The pass is happy.", "Service!"],
      miss: ["Non. Read the error, it is telling you which ingredient is wrong.", "Almost. Check your column names against the schema.", "Taste it again. What did the table actually return?"]
    },
    spelle: {
      name: "Old Pell", role: "dungeon archivist", hue: "#b07a2a", fx: "motes",
      hello: ["Mind the torches. The hero listens to you.", "Another delver. Open the grimoire."],
      idle: [
        "Every spell is a function. Name it for what it does, not how.",
        "const unless you must change it. let when you must. var is a ghost story.",
        "Use === not ==. Loose equality has fed many a skeleton.",
        "A loop that never ends is a hero that never rests. Check your condition.",
        "console.log is a lantern. Print the value before you guess at it.",
        "Arrays count from zero. The first chest is chest 0.",
        "Read the error message. Line number, then the word. It is a map.",
        "Do one thing per function. Small spells break less.",
        "Never trust a scroll from a stranger: validate what comes in.",
        "Something skitters in the walls. Probably a bug. Probably.",
        "Comment the why, not the what. The code already says what.",
        "A key opens a door. A variable holds the key. Name it key."
      ],
      win: ["The stairs hum. Well cast.", "Clean spell. The hero bows.", "Treasure and no traps. Good.", "That is real JavaScript, delver."],
      miss: ["The hero is confused. Check your spell line by line.", "Walls do not move. Rethink the path.", "Read the chronicle below. It says what happened."]
    },
    "subnle-pocket": {
      name: "Wren", role: "cable tech", hue: "#c99a3b", fx: "packets",
      hello: ["Rack's patched. Do the maths with me.", "Switch lights are green. Ready when you are."],
      idle: [
        "Block size is 256 minus the mask octet. Everything else follows from it.",
        "Network address first, broadcast last. Neither goes to a host.",
        "Usable hosts: two to the host bits, minus two.",
        "Write the binary once, slowly. Speed comes from habit, not from skipping steps.",
        "/24 is 255.255.255.0. /25 halves it. Halve again for each bit.",
        "Document every subnet. An unlabelled VLAN is tomorrow's outage.",
        "Plan for growth: leave a gap between subnets, never pack them tight.",
        "Private ranges only: 10/8, 172.16/12, 192.168/16. Never invent your own public space.",
        "Overlapping subnets are a quiet disaster. Check before you assign.",
        "A patch cable clicks in. If it does not click, it is not in.",
        "Fans spin up in rack three. Someone ran a job.",
        "Count the bits in the mask, not the dots."
      ],
      win: ["Right on the boundary.", "Network and broadcast both correct.", "Clean maths. Patch it in.", "That is a subnet plan I would sign."],
      miss: ["Off by one block. Recount the block size.", "Check the borders: network and broadcast.", "Close. Redo it in binary."]
    },
    opsle: {
      name: "Dispatch", role: "ops desk", hue: "#c99a3b", fx: "packets",
      hello: ["Desk is open. Tickets are stacking.", "On call. Pick a fault."],
      idle: [
        "Triage first: what is broken, who is affected, how many?",
        "Check what changed. Most outages start with a change.",
        "Reproduce, then fix. A fix you cannot reproduce is a guess.",
        "Write down what you tried. The next shift will thank you.",
        "Rollback is a fix. A calm rollback beats a clever hotfix.",
        "Never test in production when a copy will do.",
        "Say what you will do before you do it, then say what you did.",
        "Phones ring. Keep to the ticket you are on.",
        "Least privilege, always. Elevate for the task, then drop it.",
        "Logs first, theory second."
      ],
      win: ["Resolved. Close the ticket.", "Good call. Logged."], miss: ["Read the why. It is the runbook."]
    },
    pockle: {
      name: "Pip", role: "pocket courier", hue: "#c99a3b", fx: "packets",
      hello: ["Quick round? I carry the questions.", "Short and often. That is how it sticks."],
      idle: [
        "Retrieval beats rereading. Answer first, then check.",
        "Wrong answers teach more than lucky ones. Read the why.",
        "Five minutes a day outlasts a weekend cram.",
        "Say the answer out loud before you tap it.",
        "Spaced review: the ones you miss come back sooner.",
        "If you guessed, count it as wrong and learn it."
      ],
      win: ["Nice.", "That one is yours now."], miss: ["Read the why, then it is yours."]
    },
    rebble: {
      name: "Forman Tess", role: "build foreman", hue: "#3f8f6a", fx: "bits",
      hello: ["Site is open. Bring the blueprint.", "Hard hat on. We build it from scratch today."],
      idle: [
        "Rebuild it without looking. That is where it becomes yours.",
        "Make it work, make it right, make it small. In that order.",
        "Validate input on the server. The browser is a suggestion.",
        "Escape output, parameterise queries. Every time, no exceptions.",
        "Commit when it works. Small steps you can walk back.",
        "Name things for what they are. Future-you reads this.",
        "Do not copy a snippet you cannot explain.",
        "Scaffold rattles in the wind. Check your foundations: the data model first."
      ],
      win: ["Solid. Set the next beam.", "That passes inspection."], miss: ["Read the error. It names the beam that failed."]
    },
    codex: {
      name: "Keeper Vael", role: "reference keeper", hue: "#8a6bd0", fx: "motes",
      hello: ["The stacks are quiet. Look something up.", "Everything is shelved. Ask."],
      idle: [
        "A reference is for lookup. Fluency comes from the labs, not from rereading.",
        "Close the book and type it from memory, then check.",
        "Official docs beat a random forum answer. Read the source of truth.",
        "Copying a snippet without reading it is how bugs and breaches arrive.",
        "If two entries seem to disagree, test it. Run it and see.",
        "Dust drifts through the lamplight. Nobody has been this deep in a while."
      ],
      win: [], miss: []
    },
    mscodex: {
      name: "Keeper Vael", role: "reference keeper", hue: "#1f6feb", fx: "bits",
      hello: ["Microsoft shelf. Cmdlets in alphabetical order."],
      idle: [
        "Get-Help -Examples is the fastest reference you own.",
        "Find the cmdlet with Get-Command -Verb Get -Noun *User*.",
        "Read-only first: Get- before Set- before Remove-.",
        "-WhatIf and -Confirm exist for a reason. Use them.",
        "Close the page and write it from memory. Then compare.",
        "Never paste a command you do not understand into an admin shell."
      ],
      win: [], miss: []
    },
    sleeple: {
      name: "Captain Brandt", role: "airship master", hue: "#e9b872", fx: "motes",
      hello: ["Engines warm. Telegrams are waiting in the port.", "Welcome to the hangar. Mind the propellers."],
      idle: [
        "Print before you guess. A telegram tells you what the variable really holds.",
        "Indentation is the deck plan. Four spaces, no tabs mixed in.",
        "Read the traceback bottom-up: the last line is the fault, the rest is the route.",
        "Never trust input from the radio. Convert it, check it, then use it.",
        "A function does one job. A crew of small functions beats one giant one.",
        "Catch the specific exception. A bare except hides the leak you need to see.",
        "Use with open(...). The file closes itself, even in a storm.",
        "Do not hard-code secrets into the code. Environment, not the logbook.",
        "Wind picks up over the port. Clouds slide past the windows.",
        "Type it, do not paste it. Hands learn the rigging."
      ],
      win: ["Smooth air. Well flown.", "Telegram delivered.", "That passes inspection, crew."],
      miss: ["Turbulence. Read what the output says.", "Check the logbook and try again.", "Not yet. Trace it line by line."]
    },
    passle: {
      name: "Madam Orla", role: "village witch", hue: "#7a5cc0", fx: "motes",
      hello: ["Kettle's on. Let us brew some PHP.", "The village sleeps. The server does not."],
      idle: [
        "Never trust user input. Validate it coming in, escape it going out.",
        "Prepared statements, always. A string glued into SQL is an open door.",
        "password_hash and password_verify. Never md5, never plain text.",
        "htmlspecialchars on everything you echo from users. Every time.",
        "Turn on strict_types and type your parameters. Fewer surprises.",
        "Compare secrets with hash_equals, not ==.",
        "Do not show raw errors to visitors. Log them, show a kind message.",
        "Keep secrets out of the repository. Config lives outside the web root.",
        "An owl hoots somewhere above the thatch. Nothing to fear but a missing semicolon.",
        "Small functions, clear names, one job each."
      ],
      win: ["A fine brew.", "Spell holds. Well done.", "Clean and safe. I approve."],
      miss: ["The cauldron bubbles wrong. Read the error.", "Not quite. Check the quotes and the semicolons.", "Try again. The parse error names the line."]
    },
    "poshle-pocket": {
      name: "Ines", role: "night operator", hue: "#1f6feb", fx: "bits",
      hello: ["Pocket edition. Same floor, shorter shift."],
      idle: [
        "Verb-Noun. Say it out loud until it is reflex.",
        "-WhatIf first, then for real.",
        "Pipe objects, not strings.",
        "Get-Help is the manual, Get-Member is the x-ray.",
        "Filter early, format late.",
        "Never store passwords in a script.",
        "Short lessons, daily. Fluency is repetition."
      ],
      win: ["Good. Next.", "Reflex building."], miss: ["Read the explanation, then retry."]
    },
    "pyle-pocket": {
      name: "Sable", role: "workshop cat", hue: "#7a6af0", fx: "motes",
      hello: ["Mrrp. Short lesson? Fine."],
      idle: [
        "Indentation is syntax. Four spaces, every time.",
        "Print the value before you guess what it is.",
        "snake_case for names, and names that say what they hold.",
        "Read the traceback from the bottom up.",
        "A list is ordered, a set is unique, a dict is a lookup. Pick on purpose.",
        "Use with open(...) so files close themselves.",
        "Catch the specific exception, never a bare except.",
        "Type it, do not paste it. Fingers learn faster than eyes."
      ],
      win: ["Purr. Correct.", "Clean."], miss: ["Mrow. Read the output again."]
    },
    "poshle-forge": {
      name: "Ines", role: "night operator", hue: "#1f6feb", fx: "bits",
      hello: ["Forge is hot. Build a script, not a one-liner you cannot read."],
      idle: [
        "A script is a function with a name. Give it parameters, not hard-coded values.",
        "Add comment-based help. Future-you will not remember the switches.",
        "Support -WhatIf in anything that changes state.",
        "Throw clear errors. 'Failed' tells nobody anything.",
        "Test with Pester before you trust it."
      ],
      win: ["Solid build."], miss: ["Check the test output line by line."]
    }
  };
  var C = W[id];
  if (!C) return;

  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var OFFKEY = "soul.quiet";
  function getQuiet() { try { return localStorage.getItem(OFFKEY) === "1"; } catch (e) { return false; } }
  function setQuiet(v) { try { localStorage.setItem(OFFKEY, v ? "1" : "0"); } catch (e) {} }
  var quiet = getQuiet();

  function pick(a, avoid) {
    if (!a || !a.length) return "";
    var s = a[Math.floor(Math.random() * a.length)];
    return (a.length > 1 && s === avoid) ? pick(a, avoid) : s;
  }

  var css = ".soul-fx{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:2;opacity:.55}" +
    ".soul-fx i{position:absolute;display:block;will-change:transform,opacity;animation-timing-function:linear;animation-iteration-count:infinite}" +
    ".soul-bubbles i{border:1px solid var(--soul);border-radius:50%;bottom:-20px;animation-name:soulRise}" +
    ".soul-steam i{background:radial-gradient(circle,var(--soul),transparent 70%);border-radius:50%;bottom:-30px;animation-name:soulRise;filter:blur(3px)}" +
    ".soul-bits i{color:var(--soul);font:11px/1 ui-monospace,monospace;top:-20px;animation-name:soulFall}" +
    ".soul-stars i{width:2px;height:2px;border-radius:50%;background:var(--soul);animation-name:soulTwinkle;animation-timing-function:ease-in-out}" +
    ".soul-motes i{width:4px;height:4px;border-radius:50%;background:var(--soul);box-shadow:0 0 8px 2px var(--soul);animation-name:soulDrift;animation-timing-function:ease-in-out;animation-direction:alternate}" +
    ".soul-packets i{width:7px;height:4px;border-radius:1px;background:var(--soul);left:-12px;animation-name:soulAcross}" +
    "@keyframes soulRise{0%{transform:translate(0,0);opacity:0}15%{opacity:.7}100%{transform:translate(var(--dx),-110vh);opacity:0}}" +
    "@keyframes soulFall{0%{transform:translateY(0);opacity:0}15%{opacity:.8}100%{transform:translateY(110vh);opacity:0}}" +
    "@keyframes soulTwinkle{0%,100%{opacity:.1;transform:scale(.6)}50%{opacity:1;transform:scale(1.8)}}" +
    "@keyframes soulDrift{0%{transform:translate(0,0);opacity:.15}50%{opacity:.9}100%{transform:translate(var(--dx),var(--dy));opacity:.2}}" +
    "@keyframes soulAcross{0%{transform:translateX(0);opacity:0}10%,90%{opacity:.8}100%{transform:translateX(calc(100vw + 24px));opacity:0}}" +
    ".soul-npc{position:fixed;left:14px;bottom:14px;z-index:60;display:flex;align-items:flex-end;gap:8px;max-width:min(360px,calc(100vw - 28px));font:13px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;pointer-events:none;transform:translateY(0)}" +
    ".soul-av{pointer-events:auto;cursor:pointer;flex:none;width:38px;height:38px;border-radius:50%;background:var(--soul);color:#fff;display:grid;place-items:center;font-weight:700;font-size:16px;box-shadow:0 2px 10px rgba(0,0,0,.35);border:2px solid rgba(255,255,255,.55);animation:soulBob 3.2s ease-in-out infinite;user-select:none;touch-action:manipulation}" +
    ".soul-av.talk{animation:soulHop .5s ease 1, soulBob 3.2s ease-in-out .5s infinite}" +
    ".soul-av.off{opacity:.45;animation:none;filter:grayscale(1)}" +
    ".soul-bub{pointer-events:auto;background:rgba(18,22,30,.94);color:#eef2f7;border:1px solid var(--soul);border-radius:12px 12px 12px 3px;padding:8px 11px;box-shadow:0 6px 22px rgba(0,0,0,.4);opacity:0;transform:translateY(6px) scale(.98);transition:opacity .35s,transform .35s;cursor:pointer}" +
    ".soul-bub.on{opacity:1;transform:none}" +
    ".soul-bub b{display:block;font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--soul);margin-bottom:2px;filter:brightness(1.4)}" +
    "@keyframes soulBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}" +
    "@keyframes soulHop{0%{transform:translateY(0)}35%{transform:translateY(-10px) rotate(-6deg)}70%{transform:translateY(0) rotate(4deg)}100%{transform:none}}" +
    "@media (prefers-reduced-motion:reduce){.soul-fx{display:none}.soul-av,.soul-av.talk{animation:none}.soul-bub{transition:none}}" +
    "@media print{.soul-fx,.soul-npc{display:none}}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var root = document.createElement("div");
  root.className = "soul-npc";
  root.style.setProperty("--soul", C.hue);
  root.setAttribute("role", "status");
  root.setAttribute("aria-live", "polite");
  var av = document.createElement("div");
  av.className = "soul-av";
  av.textContent = C.name.replace(/^(Chef|Old)\s+/, "").charAt(0);
  av.title = C.name + ", " + C.role + ". Click to " + (quiet ? "wake" : "quiet") + " them.";
  var bub = document.createElement("div");
  bub.className = "soul-bub";
  root.appendChild(av);
  root.appendChild(bub);

  var fxEl = null;
  function buildFx() {
    if (reduce || fxEl) return;
    fxEl = document.createElement("div");
    fxEl.className = "soul-fx soul-" + C.fx;
    fxEl.style.setProperty("--soul", C.hue);
    var n = { bubbles: 14, steam: 8, bits: 16, stars: 40, motes: 18, packets: 8 }[C.fx] || 10;
    var r = Math.random, html = "";
    for (var i = 0; i < n; i++) {
      var d = (8 + r() * 14).toFixed(1), delay = (-r() * 20).toFixed(1), x = (r() * 100).toFixed(1);
      var dx = ((r() - 0.5) * 120).toFixed(0) + "px", dy = ((r() - 0.5) * 120).toFixed(0) + "px";
      var s = "animation-duration:" + d + "s;animation-delay:" + delay + "s;--dx:" + dx + ";--dy:" + dy + ";";
      var inner = "";
      if (C.fx === "bubbles") { var z = (4 + r() * 10).toFixed(0); s += "left:" + x + "%;width:" + z + "px;height:" + z + "px;"; }
      else if (C.fx === "steam") { var q = (30 + r() * 40).toFixed(0); s += "left:" + (10 + r() * 80).toFixed(0) + "%;width:" + q + "px;height:" + q + "px;opacity:.3;"; }
      else if (C.fx === "bits") { s += "left:" + x + "%;"; inner = Math.random() < 0.5 ? "0" : "1"; if (r() < 0.3) inner = ["Get", "Set", "New", "|", "$_"][Math.floor(r() * 5)]; }
      else if (C.fx === "stars") { s += "left:" + x + "%;top:" + (r() * 100).toFixed(1) + "%;animation-duration:" + (2 + r() * 5).toFixed(1) + "s;"; }
      else if (C.fx === "motes") { s += "left:" + x + "%;top:" + (r() * 100).toFixed(1) + "%;animation-duration:" + (6 + r() * 8).toFixed(1) + "s;"; }
      else if (C.fx === "packets") { s += "top:" + (10 + r() * 80).toFixed(1) + "%;animation-duration:" + (6 + r() * 8).toFixed(1) + "s;"; }
      html += '<i style="' + s + '">' + inner + "</i>";
    }
    fxEl.innerHTML = html;
    document.body.appendChild(fxEl);
  }
  function pauseFx(p) { if (fxEl) fxEl.style.display = p ? "none" : ""; }

  var hideT = 0, lastSpoke = 0, lastLine = "", lastAct = Date.now();
  function say(text, ms) {
    if (quiet || !text) return;
    lastSpoke = Date.now();
    lastLine = text;
    bub.innerHTML = "<b></b><span></span>";
    bub.firstChild.textContent = C.name + " · " + C.role;
    bub.lastChild.textContent = text;
    bub.classList.add("on");
    av.classList.remove("talk");
    void av.offsetWidth;
    if (!reduce) av.classList.add("talk");
    clearTimeout(hideT);
    hideT = setTimeout(function () { bub.classList.remove("on"); }, ms || Math.min(14000, 4500 + text.length * 70));
  }
  bub.addEventListener("click", function () { bub.classList.remove("on"); });
  av.addEventListener("click", function () {
    quiet = !quiet; setQuiet(quiet);
    av.classList.toggle("off", quiet);
    av.title = C.name + ", " + C.role + ". Click to " + (quiet ? "wake" : "quiet") + " them.";
    if (quiet) { bub.classList.remove("on"); pauseFx(true); } else { pauseFx(false); say(pick(C.hello)); }
  });
  if (quiet) av.classList.add("off");

  ["pointerdown", "keydown"].forEach(function (e) {
    addEventListener(e, function () { lastAct = Date.now(); }, { passive: true, capture: true });
  });

  /* Idle chatter: only when the tab is visible, the learner has paused for a
     few seconds (never talk over typing) and the last line has had its moment. */
  function tick() {
    if (document.hidden || quiet) return;
    var now = Date.now();
    if (now - lastAct < 6000 || now - lastSpoke < 35000) return;
    say(pick(C.idle, lastLine));
  }

  /* Reactions: watch for the lab's own feedback markup appearing. Each lab
     already marks right and wrong answers with ok/good/err/bad styling, so the
     NPC reacts to real events without any change to lab logic. */
  var WIN = /(^|\s)(ok|good|right|correct|win|pass)(\s|$)/, MISS = /(^|\s)(err|bad|wrong|fail|miss)(\s|$)/;
  var streakMiss = 0, lastReact = 0, bootAt = Date.now();
  function react(kind) {
    var now = Date.now();
    if (quiet || now - lastReact < 7000) return;
    lastReact = now;
    if (kind === "win") { streakMiss = 0; say(pick(C.win, lastLine), 4200); }
    else { streakMiss++; say(streakMiss >= 3 ? pick(C.idle, lastLine) : pick(C.miss, lastLine), 5200); if (streakMiss >= 3) streakMiss = 0; }
  }
  var TXTWIN = /GRABBED|CLUNK|SEALED|CONQUERED|COMPLETE/, TXTMISS = /MISFIRES|LOCKED|NOT YET/;
  function classify(el) {
    if (id === "spelle" && el.parentNode && el.parentNode.id === "log") {
      var t = el.textContent || "";
      return TXTWIN.test(t) ? "win" : TXTMISS.test(t) ? "miss" : "";
    }
    var c = typeof el.className === "string" ? el.className : "";
    if (WIN.test(c)) return "win";
    if (MISS.test(c)) return "miss";
    return "";
  }
  function scan() {
    var obs = new MutationObserver(function (list) {
      if (quiet) return;
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (m.type === "attributes") {
          var t = m.target, p = t.parentNode;
          if (p && p.classList && p.classList.contains("dots") && t.classList.contains("done") && (m.oldValue || "").indexOf("done") < 0) return react("win");
          var k = classify(t); if (k && t.tagName === "BUTTON") return react(k); continue;
        }
        for (var j = 0; j < m.addedNodes.length; j++) {
          var n = m.addedNodes[j];
          if (n.nodeType !== 1 || (n.closest && n.closest(".soul-npc,.soul-fx"))) continue;
          var kk = classify(n);
          if (!kk && n.querySelector) { var h = n.querySelector(".ok,.good,.err,.bad"); if (h) kk = classify(h); }
          if (!kk && Date.now() - bootAt > 3000 && n.classList && n.classList.contains("bhead")) kk = "win";
          if (kk) return react(kk);
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ["class"] });
  }

  function start() {
    document.body.appendChild(root);
    buildFx();
    if (quiet) pauseFx(true);
    scan();
    var h = new Date().getHours();
    var part = h < 5 ? "Late one tonight." : h < 12 ? "Morning." : h < 18 ? "Afternoon." : "Evening.";
    setTimeout(function () { say(part + " " + pick(C.hello), 6500); }, 1800);
    setInterval(tick, 8000);
    document.addEventListener("visibilitychange", function () { pauseFx(document.hidden || quiet); });
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
  window.Soul = { say: say, react: react };
})();
