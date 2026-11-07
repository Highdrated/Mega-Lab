/* soul.js - ambient life for labs: drifting scenery + in-world voices.
   Usage: <script src="../js/soul.js" data-lab="sleeple" defer></script>
   Every voice line teaches or reinforces a real-world good habit.
   Respects prefers-reduced-motion, pauses while the tab is hidden, and can be muted
   (the choice is remembered). Never blocks clicks (pointer-events: none except the tiny toggle). */
(function () {
  "use strict";
  var me = document.currentScript;
  var lab = (me && me.getAttribute("data-lab")) || "";

  var WORLDS = {
    sleeple: { fx: "stars", who: "Conductor", lines: [
      "Mind the gap between a list and a tuple: one you can change, one you can't.",
      "Every telegram gets read twice before it is sent. Read your code twice before you run it.",
      "Tickets, please. A name that says what it holds is a ticket anyone can read.",
      "Rattle rattle. A good loop, like a good timetable, knows exactly when it stops.",
      "Night porter: 'An except with no type catches everything, even your typos. Name the error.'",
      "A sleeper passenger mumbles: 'f-strings, not string plus string plus string...'",
      "The lamp flickers. Small functions do one job. Small jobs are easy to trust.",
      "Next station: Dictionary Junction. Look things up by key, not by hunting.",
      "Steam hisses. Test with a tiny example before you trust a big one."] },
    seqle: { fx: "steam", who: "Chef", lines: [
      "Chef taps the pass: 'SELECT only the columns you need. Not everything on the shelf.'",
      "A waiter calls: 'WHERE before GROUP BY, HAVING after. Filter early, plate late.'",
      "Chef: 'Always a WHERE on your UPDATE. Always. Check with a SELECT first.'",
      "Sizzle. Parameterise your queries. Never glue user text into SQL.",
      "Chef: 'JOIN on the key, name the table in the ON. A missing ON is a cross join, a kitchen flood.'",
      "A dishwasher hums: 'NULL is not zero. Use IS NULL, never = NULL.'",
      "Chef: 'Index the column you search by. Taste the plan with EXPLAIN.'",
      "Somewhere a timer dings. Run a transaction when two changes must live or die together.",
      "Chef: 'ORDER BY before LIMIT, or you are just picking at random.'"] },
    passle: { fx: "steam", who: "Roux", lines: [
      "Roux, wiping a knife: 'Never trust input. Validate it on the way in, escape it on the way out.'",
      "Bubbling stock. password_hash and password_verify. Never md5 for passwords.",
      "Roux: 'Prepared statements, always. Your SQL and your data never share a bowl.'",
      "A guest laughs in the dining room. Use htmlspecialchars before printing anything a user typed.",
      "Roux: 'declare(strict_types=1) at the top. Surprises belong in desserts, not types.'",
      "The oven ticks. Keep secrets in environment config, never in the repository.",
      "Roux: 'Return early. A flat kitchen is a safe kitchen.'",
      "Clatter from the pantry. Small functions, clear names, one job each.",
      "Roux: 'Log the error for yourself, show a kind message to the guest.'"] },
    poshle: { fx: "bits", who: "Clinic nurse", lines: [
      "Nurse, over the speaker: 'Use -WhatIf before anything that deletes or changes.'",
      "A monitor beeps. Verb-Noun, singular nouns: Get-Mailbox, not getmailboxes.",
      "Nurse: 'Filter left, format right. Where-Object early, Format-Table last.'",
      "Clipboard rustle. Read the error from the bottom up. The cause lives there.",
      "Nurse: 'Get-Help before guessing. Get-Member before assuming.'",
      "Quiet hum. Never store a password in a script. Use Get-Credential or a vault.",
      "Nurse: 'Prefer objects over text. Pipe objects, parse nothing.'",
      "A door swishes. Use try/catch with -ErrorAction Stop, or the catch never fires.",
      "Nurse: 'Test on one account before you run on ten thousand.'"] },
    shelle: { fx: "bits", who: "Dock master", lines: [
      "Dock master: 'Quote your variables: \"$name\". Spaces bite.'",
      "Gulls. rm -i or ls first. Look at what the glob matches before you delete it.",
      "Dock master: 'Never run curl | sh from a stranger. Download, read, then run.'",
      "A crane groans. Containers are cattle: rebuild, don't hand-patch.",
      "Dock master: 'docker run --rm for throwaways, and name what you keep.'",
      "Rope creaks. Never chmod 777. Grant the least permission that works.",
      "Dock master: 'Don't put secrets in an image layer. They live there forever.'",
      "Waves. Read the man page or --help before you reach for sudo.",
      "Dock master: 'set -euo pipefail. Let a script fail loudly, not quietly.'"] },
    "git-lab": { fx: "bits", who: "Nav console", lines: [
      "Console blip: 'git status before everything. Look before you leap.'",
      "Nav console: 'Small commits, clear messages. Future you is the crew.'",
      "Ping. Pull before you push. Never force-push a shared branch.",
      "Console: 'Branch for each change. Main stays sailable.'",
      "Static crackle. Never commit secrets. If you did, rotate them; deleting the commit is not enough.",
      "Nav console: 'git diff before you commit. Read what you are about to sign.'",
      "Beep. A merge conflict is a conversation, not an emergency. Read both sides.",
      "Console: 'git reset --hard is a one-way door. Stash first if unsure.'"] },
    rebble: { fx: "dust", who: "Foreman", lines: [
      "Foreman: 'Build it small, run it, then add the next piece.'",
      "Hammering somewhere. Name things for what they are, not for what you feel.",
      "Foreman: 'If you copy it three times, make it a function.'",
      "Dust in a sunbeam. Commit when it works, not when you are tired.",
      "Foreman: 'Read the error. It is trying to help you.'",
      "A radio crackles. Rebuilding from memory is how it sticks. Don't peek yet.",
      "Foreman: 'Comments say why. Code says what.'"] },
    spelle: { fx: "dust", who: "Grimoire", lines: [
      "The grimoire whispers: 'Spell it out loud once. Your ear catches what your eye forgives.'",
      "Candle flutter. Say the rule, then the exception, then an example.",
      "A page turns by itself. Mistakes are the ink that makes the spell stay.",
      "The grimoire: 'Little and often beats a long night once a month.'",
      "Wind in the stacks. Writing a word beats recognising a word.",
      "The grimoire hums: 'If you missed it, it returns tomorrow. That is the magic.'"] },
    webble: { fx: "dust", who: "Studio", lines: [
      "Studio hum: 'Animate transform and opacity. They are cheap. Layout is not.'",
      "A sketch pins itself up. Respect prefers-reduced-motion. Motion should never hurt anyone.",
      "Studio: 'Ease out for entering, ease in for leaving. Linear is for machines.'",
      "Mouse click somewhere. Keep motion under 400ms for interface feedback.",
      "Studio: 'Never trap focus, never hide the focus ring. Keyboards are users too.'",
      "Paper rustle. Motion explains change. If it explains nothing, cut it.",
      "Studio: 'Test on a slow phone. Your laptop is lying to you.'"] },
    opsle: { fx: "bits", who: "Ops desk", lines: [
      "Ops desk: 'Read the runbook, then run the command. Not the other way round.'",
      "Pager chirp. Back up before you change. Test the restore, not just the backup.",
      "Ops desk: 'Change one thing at a time, or you won't know which one fixed it.'",
      "Fan whirr. Least privilege. If a task needs root, say why in a comment.",
      "Ops desk: 'Write down what you did. The 3 a.m. you will thank you.'",
      "Keyboard clatter. Staging first, production second.",
      "Ops desk: 'Check the logs before you restart the service. A restart erases clues.'"] },
    dockle: { fx: "stars", who: "Night porter", lines: [
      "Porter: 'Short, plain sentences first. Fluency is built from small, certain pieces.'",
      "Lamplight. Say the answer aloud before revealing it. Retrieval beats rereading.",
      "Porter: 'A wrong answer today is a right answer next week. Keep going.'"] },
    "junos-lab": { fx: "bits", who: "NOC", lines: [
      "NOC: 'show before set. Know the state before you change it.'",
      "Fans spin up. Use commit check, then commit confirm 5. Never commit blind on a remote box.",
      "NOC: 'Rollback is your friend. rollback 1, compare, then decide.'",
      "A link light blinks. Describe every interface. The next engineer is you at 3 a.m.",
      "NOC: 'Never leave a default password, a telnet service or an any-any permit behind.'",
      "Cable hiss. Use show | compare to read your change before you commit it.",
      "NOC: 'One change window, one change. Write the back-out plan first.'",
      "Switch fans whine. Annotate with commit comment. Your history should explain itself."] },
    modle: { fx: "bits", who: "Study hall", lines: [
      "Chalk squeak. Predict the output before you run it. That gap is where you learn.",
      "Study hall: 'Say why the answer is right, not just that it is.'",
      "A clock ticks. Short daily practice beats a heroic weekend.",
      "Study hall: 'Off-by-one? Count the first item as 0, then test the edges.'",
      "Pencil tap. Read the error message aloud. It almost always names the line."] },
    codex: { fx: "dust", who: "Archivist", lines: [
      "Archivist: 'Reference is for looking things up. Skill is for not needing to.'",
      "Pages settle. Read the example, close it, then write it yourself from memory.",
      "Archivist: 'Know where the answer lives, and then know it.'"] },
    mscodex: { fx: "dust", who: "Archivist", lines: [
      "Archivist: 'Get-Help -Examples is the quickest teacher on the shelf.'",
      "Paper hush. Test every command on a lab tenant before it touches production.",
      "Archivist: 'Least privilege: the smallest admin role that does the job.'"] },
    "poshle-forge": { fx: "bits", who: "Smith", lines: [
      "Forge crackle. Smith: 'Build the function, then the tests, then the script.'",
      "Smith: 'Parameters, not hard-coded values. A tool should fit many hands.'",
      "Hammer ring. Support -WhatIf on anything that changes state.",
      "Smith: 'Comment-based help is part of the blade, not decoration.'"] },
    "poshle-pocket": { fx: "bits", who: "Clinic", lines: [
      "Nurse: 'Tap it from memory. Hesitation is data.'",
      "Beep. Filter early, format last.",
      "Clinic: '-WhatIf first. Always.'"] },
    "pyle-pocket": { fx: "dust", who: "Porter", lines: [
      "Porter: 'Small steps. One line you understand beats ten you copied.'",
      "Rattle. Name it well and half the comments vanish.",
      "Porter: 'Try to predict the output, then tap.'"] },
    "subnle-pocket": { fx: "bits", who: "Switchboard", lines: [
      "Switchboard: '/24 is 256 addresses, 254 usable. Say it until it is reflex.'",
      "Click-clack. Block size = 256 minus the interesting octet of the mask.",
      "Switchboard: 'Network address first, broadcast last. Neither goes to a host.'",
      "Hum. Plan for growth: size the subnet for twice what you need today."] },
    pockle: { fx: "dust", who: "Pocket", lines: [
      "Pocket: 'Five minutes with attention beats an hour of scrolling.'",
      "Rustle. Missed it? Good. It comes back sooner.",
      "Pocket: 'Answer first, peek second.'"] },
    "junle-room": { fx: "dust", who: "Castle", lines: [
      "Torch crackle. 'show before set' is the old rule of the gate.",
      "Distant clank. commit confirm, so a mistake undoes itself.",
      "A raven shifts on the rafter. Read the whole config before you change a line of it."] }
  };

  var W = WORLDS[lab];
  if (!W) return;
  var KEY = "soul:off";
  var off = false;
  try { off = localStorage.getItem(KEY) === "1"; } catch (e) {}
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var css = document.createElement("style");
  css.textContent =
    ".soul-fx{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:0}" +
    ".soul-fx i{position:absolute;display:block;opacity:0;will-change:transform,opacity;animation-timing-function:linear;animation-iteration-count:infinite}" +
    ".soul-fx .s{width:2px;height:2px;border-radius:50%;background:#fff;animation-name:soulTw}" +
    ".soul-fx .d{width:3px;height:3px;border-radius:50%;background:currentColor;animation-name:soulUp}" +
    ".soul-fx .t{width:8px;height:14px;border-radius:50%;background:currentColor;filter:blur(5px);animation-name:soulUp}" +
    ".soul-fx .b{font:11px/1 ui-monospace,Menlo,monospace;color:currentColor;animation-name:soulDown}" +
    "@keyframes soulTw{0%,100%{opacity:0}50%{opacity:.7}}" +
    "@keyframes soulUp{0%{opacity:0;transform:translate(0,0)}20%{opacity:.35}100%{opacity:0;transform:translate(24px,-70vh)}}" +
    "@keyframes soulDown{0%{opacity:0;transform:translateY(-5vh)}15%{opacity:.25}100%{opacity:0;transform:translateY(105vh)}}" +
    ".soul-say{position:fixed;left:12px;bottom:12px;max-width:min(340px,calc(100vw - 24px));z-index:2147483000;" +
    "background:rgba(20,24,30,.92);color:#f2efe8;border:1px solid rgba(255,255,255,.18);border-radius:10px;" +
    "padding:9px 12px;font:13px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.35);" +
    "opacity:0;transform:translateY(8px);transition:opacity .5s,transform .5s;cursor:pointer}" +
    ".soul-say.on{opacity:1;transform:none}" +
    ".soul-say b{display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;opacity:.65;margin-bottom:2px}" +
    ".soul-tg{position:fixed;right:8px;bottom:6px;z-index:2147483000;font:10px/1 system-ui,sans-serif;" +
    "background:none;border:0;color:inherit;opacity:.35;cursor:pointer;padding:6px}" +
    ".soul-tg:hover,.soul-tg:focus-visible{opacity:.9}";
  document.head.appendChild(css);

  function rnd(a, b) { return a + Math.random() * (b - a); }

  var fx;
  function buildFx() {
    if (reduce) return;
    fx = document.createElement("div");
    fx.className = "soul-fx";
    fx.setAttribute("aria-hidden", "true");
    var n = W.fx === "bits" ? 10 : 14;
    for (var k = 0; k < n; k++) {
      var e = document.createElement("i");
      var cls = W.fx === "stars" ? "s" : W.fx === "steam" ? "t" : W.fx === "bits" ? "b" : "d";
      e.className = cls;
      e.style.left = rnd(2, 98) + "vw";
      if (cls === "s") e.style.top = rnd(2, 70) + "vh";
      else if (cls === "b") { e.style.top = "0"; e.textContent = Math.random() < .5 ? "0" : "1"; }
      else e.style.top = rnd(60, 105) + "vh";
      e.style.animationDuration = (cls === "s" ? rnd(3, 7) : rnd(10, 22)) + "s";
      e.style.animationDelay = "-" + rnd(0, 20) + "s";
      fx.appendChild(e);
    }
    document.body.insertBefore(fx, document.body.firstChild);
    fx.style.color = getComputedStyle(document.body).color;
  }

  var box, timer, hideT, last = -1, tg;
  function say() {
    if (off || document.hidden || !W.lines.length) return schedule();
    var i;
    do { i = Math.floor(Math.random() * W.lines.length); } while (i === last && W.lines.length > 1);
    last = i;
    if (!box) {
      box = document.createElement("div");
      box.className = "soul-say";
      box.setAttribute("role", "status");
      box.setAttribute("aria-live", "polite");
      box.onclick = hide;
      document.body.appendChild(box);
    }
    box.innerHTML = "<b></b><span></span>";
    box.firstChild.textContent = W.who;
    var txt = W.lines[i], m = txt.match(/^[A-Za-z' ]{2,22}: '(.*)'$/);
    box.lastChild.textContent = m ? m[1] : txt;
    requestAnimationFrame(function () { box.classList.add("on"); });
    clearTimeout(hideT);
    hideT = setTimeout(hide, 9000 + W.lines[i].length * 45);
    schedule();
  }
  function hide() { if (box) box.classList.remove("on"); }
  function schedule() { clearTimeout(timer); timer = setTimeout(say, rnd(45000, 95000)); }

  function paintToggle() { tg.textContent = off ? "voices: off" : "voices: on"; tg.setAttribute("aria-pressed", String(!off)); }
  function init() {
    buildFx();
    tg = document.createElement("button");
    tg.className = "soul-tg";
    tg.type = "button";
    tg.title = "Turn the ambient voices on or off";
    tg.onclick = function () {
      off = !off;
      try { localStorage.setItem(KEY, off ? "1" : "0"); } catch (e) {}
      if (off) hide(); else say();
      paintToggle();
    };
    paintToggle();
    document.body.appendChild(tg);
    timer = setTimeout(say, rnd(12000, 22000));
    document.addEventListener("visibilitychange", function () {
      if (fx) fx.style.display = document.hidden ? "none" : "";
    });
  }
  if (document.body) init(); else document.addEventListener("DOMContentLoaded", init);
})();
