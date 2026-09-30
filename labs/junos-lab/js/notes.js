/* ============================================================
   FOR CLAUDE — NOTES
   A scratchpad that outlives the session. Jot an idea or a bug the
   moment you hit it; next session, hand the briefing to Claude.
   The store key is deliberately NOT junoslab-prefixed: every lab in
   the Mega Lab shares one origin, so every lab shares one notebook
   and each note remembers which lab it came from.
   ============================================================ */
var NOTES_KEY = "megalab-claude-notes";
var NOTES_LAB = "JunOS Lab";
var NOTE_KINDS = [
  ["bug", "Bug", "Something behaves wrongly or crashes"],
  ["real", "Not real Junos", "The lab accepts or prints something a real box would not"],
  ["idea", "Idea", "A feature or change you want"],
  ["learn", "Learning gap", "Something explained badly, or not at all"],
  ["question", "Question", "Something to ask Claude next session"]
];

function notesRead(){
  try{
    var raw = localStorage.getItem(NOTES_KEY);
    var arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch(e){ return []; }
}
function notesWrite(arr){
  try{ localStorage.setItem(NOTES_KEY, JSON.stringify(arr.slice(-400))); return true; }
  catch(e){ return false; }
}
function notesAll(){ return notesRead(); }
function notesOpen(){ return notesRead().filter(function(n){ return !n.done; }); }
function notesCount(){ return notesOpen().length; }

function noteContext(){
  var bits = [];
  try{
    if(typeof APP_VERSION === "string") bits.push("v" + APP_VERSION);
    if(typeof REAL_MODE !== "undefined") bits.push("real junos: " + (REAL_MODE ? "on" : "off"));
    if(typeof strictOn === "function") bits.push("strict: " + (strictOn() ? "on" : "off"));
    var tabs = { scen: "Scenarios", ref: "Reference", proto: "Protocols", juno: "JUNO" };
    var tabEl = typeof document !== "undefined" && document.getElementById("tablet");
    if(typeof tabletTab === "string" && tabEl && tabEl.classList.contains("open"))
      bits.push("tablet: " + (tabs[tabletTab] || tabletTab));
    if(typeof protoView === "object" && protoView && protoView.page === "guide" && protoView.guide)
      bits.push("guide: " + protoView.guide.id);
    if(typeof currentScenario === "object" && currentScenario && currentScenario.id)
      bits.push("scenario: " + currentScenario.id);
    if(typeof activeDevice !== "undefined" && activeDevice && typeof devices === "object" && devices[activeDevice]){
      var d = devices[activeDevice];
      var who = (typeof hostnameOf === "function" ? hostnameOf(d) : d.id) + (d.model ? " (" + d.model + ")" : "");
      var where = d.cli && d.cli.mode === "cfg"
        ? "[edit" + (d.cli.editKeys && d.cli.editKeys.length ? " " + d.cli.editKeys.join(" ") : "") + "]"
        : "operational mode";
      bits.push("device: " + who + " in " + where);
    }
  }catch(e){}
  return bits.join(" · ");
}

function notesAdd(kind, text, ctx){
  var body = String(text == null ? "" : text).trim();
  if(!body) return null;
  var arr = notesRead();
  var note = {
    id: "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ts: new Date().toISOString(),
    lab: NOTES_LAB,
    kind: NOTE_KINDS.some(function(k){ return k[0] === kind; }) ? kind : "idea",
    text: body,
    ctx: ctx === undefined ? noteContext() : String(ctx || ""),
    done: false
  };
  arr.push(note);
  notesWrite(arr);
  return note;
}
function notesUpdate(id, patch){
  var arr = notesRead(), hit = null;
  for(var i = 0; i < arr.length; i++) if(arr[i].id === id){ hit = arr[i]; break; }
  if(!hit) return false;
  for(var k in patch) if(Object.prototype.hasOwnProperty.call(patch, k)) hit[k] = patch[k];
  notesWrite(arr);
  return true;
}
function notesToggleDone(id){
  var arr = notesRead();
  for(var i = 0; i < arr.length; i++) if(arr[i].id === id){ arr[i].done = !arr[i].done; notesWrite(arr); return arr[i].done; }
  return null;
}
function notesDelete(id){
  var arr = notesRead(), out = arr.filter(function(n){ return n.id !== id; });
  if(out.length === arr.length) return false;
  notesWrite(out);
  return true;
}
function notesClearDone(){
  var arr = notesRead(), out = arr.filter(function(n){ return !n.done; });
  notesWrite(out);
  return arr.length - out.length;
}

function noteKindLabel(kind){
  for(var i = 0; i < NOTE_KINDS.length; i++) if(NOTE_KINDS[i][0] === kind) return NOTE_KINDS[i][1];
  return kind;
}
function noteWhen(ts){
  try{ return String(ts).slice(0, 16).replace("T", " "); }catch(e){ return String(ts); }
}

/* The briefing. This is the whole point of the feature: one block of
   text that tells a fresh session exactly what you found and where. */
function notesForClaude(includeDone){
  var arr = notesRead().filter(function(n){ return includeDone || !n.done; });
  if(!arr.length)
    return "# Notes for Claude\n\nNo open notes.\n";
  var byLab = {};
  arr.forEach(function(n){ (byLab[n.lab || "unknown lab"] = byLab[n.lab || "unknown lab"] || []).push(n); });
  var out = ["# Notes for Claude",
    "",
    "Written while working in the Mega Lab between sessions. " +
    arr.length + " note" + (arr.length === 1 ? "" : "s") + ", oldest first.",
    ""];
  Object.keys(byLab).sort().forEach(function(lab){
    out.push("## " + lab);
    out.push("");
    byLab[lab].sort(function(a, b){ return String(a.ts) < String(b.ts) ? -1 : 1; }).forEach(function(n){
      out.push("- **" + noteKindLabel(n.kind) + "** — " + n.text.replace(/\n+/g, " "));
      var meta = [];
      if(n.ts) meta.push(noteWhen(n.ts));
      if(n.ctx) meta.push(n.ctx);
      if(n.done) meta.push("marked handled");
      if(meta.length) out.push("  - _" + meta.join(" · ") + "_");
    });
    out.push("");
  });
  return out.join("\n");
}

/* ---------- UI ---------- */
function notesBadgeRefresh(){
  if(typeof document === "undefined") return;
  var b = document.getElementById("notes-btn");
  if(!b) return;
  var n = notesCount();
  b.textContent = n ? "Notes (" + n + ")" : "Notes";
  b.classList.toggle("has-notes", n > 0);
}

function openNotes(){
  if(typeof showModal !== "function") return;
  showModal(function(box, done){
    box.classList.add("notes-modal");
    var h = document.createElement("h3");
    h.textContent = "Notes for Claude";
    box.appendChild(h);
    var p = document.createElement("p");
    p.textContent = "Anything you notice while working — a bug, a rough explanation, an idea. " +
      "It is saved in this browser and shared by every lab in the Mega Lab. " +
      "Next session, copy the briefing and tell Claude to check your notes.";
    box.appendChild(p);

    var form = document.createElement("div");
    form.className = "notes-form";
    var sel = document.createElement("select");
    NOTE_KINDS.forEach(function(k){
      var o = document.createElement("option");
      o.value = k[0]; o.textContent = k[1]; o.title = k[2];
      sel.appendChild(o);
    });
    var ta = document.createElement("textarea");
    ta.placeholder = "What did you notice? Plain words are fine — the lab records where you were.";
    ta.rows = 3;
    var addRow = document.createElement("div");
    addRow.className = "notes-addrow";
    var ctxLine = document.createElement("small");
    ctxLine.className = "notes-ctx";
    ctxLine.textContent = noteContext();
    var add = document.createElement("button");
    add.textContent = "Save note";
    add.className = "primary";
    addRow.append(sel, add);
    form.append(ta, addRow, ctxLine);
    box.appendChild(form);

    var list = document.createElement("div");
    list.className = "notes-list";
    box.appendChild(list);

    var foot = document.createElement("div");
    foot.className = "mbtns";
    var copy = document.createElement("button");
    copy.textContent = "Copy for Claude";
    var dl = document.createElement("button");
    dl.textContent = "Download .md";
    var clear = document.createElement("button");
    clear.textContent = "Clear handled";
    var close = document.createElement("button");
    close.textContent = "Close";
    close.className = "primary";
    close.onclick = function(){ done(null); };
    foot.append(copy, dl, clear, close);
    box.appendChild(foot);

    function draw(){
      list.innerHTML = "";
      var arr = notesRead().slice().sort(function(a, b){ return String(b.ts) < String(a.ts) ? -1 : 1; });
      if(!arr.length){
        var none = document.createElement("div");
        none.className = "notes-empty";
        none.textContent = "No notes yet.";
        list.appendChild(none);
        notesBadgeRefresh();
        return;
      }
      arr.forEach(function(n){
        var row = document.createElement("div");
        row.className = "notes-row" + (n.done ? " done" : "");
        var tick = document.createElement("button");
        tick.className = "notes-tick";
        tick.title = n.done ? "Mark as still open" : "Mark as handled";
        tick.innerHTML = n.done && typeof svgMark === "function" ? svgMark("check") : "";
        tick.onclick = function(){ notesToggleDone(n.id); draw(); };
        var body = document.createElement("div");
        body.className = "notes-body";
        var tag = document.createElement("span");
        tag.className = "notes-kind k-" + n.kind;
        tag.textContent = noteKindLabel(n.kind);
        var txt = document.createElement("span");
        txt.className = "notes-text";
        txt.textContent = n.text;
        var meta = document.createElement("small");
        meta.className = "notes-meta";
        meta.textContent = [n.lab, noteWhen(n.ts), n.ctx].filter(Boolean).join(" · ");
        body.append(tag, txt, meta);
        var del = document.createElement("button");
        del.className = "notes-del";
        del.textContent = "×";
        del.title = "Delete this note";
        del.onclick = function(){ notesDelete(n.id); draw(); };
        row.append(tick, body, del);
        list.appendChild(row);
      });
      notesBadgeRefresh();
    }

    function save(){
      var n = notesAdd(sel.value, ta.value);
      if(!n){ ta.focus(); return; }
      ta.value = "";
      ctxLine.textContent = noteContext();
      try{ if(typeof SFX !== "undefined" && SFX.tick) SFX.tick(); }catch(e){}
      draw();
    }
    add.onclick = save;
    ta.onkeydown = function(e){
      if((e.ctrlKey || e.metaKey) && e.key === "Enter"){ e.preventDefault(); save(); }
    };

    copy.onclick = function(){
      var text = notesForClaude(true);
      var ok = function(){ copy.textContent = "Copied"; setTimeout(function(){ copy.textContent = "Copy for Claude"; }, 1400); };
      try{
        if(navigator.clipboard && navigator.clipboard.writeText)
          navigator.clipboard.writeText(text).then(ok, function(){ notesFallbackCopy(text, ok); });
        else notesFallbackCopy(text, ok);
      }catch(e){ notesFallbackCopy(text, ok); }
    };
    dl.onclick = function(){
      try{
        var blob = new Blob([notesForClaude(true)], { type: "text/markdown" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "notes-for-claude.md";
        a.click();
      }catch(e){}
    };
    clear.onclick = function(){
      var n = notesClearDone();
      clear.textContent = n ? "Removed " + n : "Nothing handled";
      setTimeout(function(){ clear.textContent = "Clear handled"; }, 1400);
      draw();
    };

    draw();
    setTimeout(function(){ ta.focus(); }, 30);
  });
}

function notesToast(msg){
  try{
    var t = document.createElement("div");
    t.className = "notes-toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function(){ t.remove(); }, 2600);
  }catch(e){}
}

function notesFallbackCopy(text, ok){
  try{
    var t = document.createElement("textarea");
    t.value = text;
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    document.body.removeChild(t);
    if(ok) ok();
  }catch(e){
    if(typeof modalInput === "function")
      modalInput("Copy this for Claude", "Select all and copy.", text, "textarea");
  }
}

/* Quick capture without opening the panel: the thought survives even
   if you are mid-command and do not want to lose your place. */
function quickNote(){
  if(typeof modalInput !== "function") return;
  var ctx = noteContext();
  modalInput("Quick note for Claude",
    "One line. Saved with where you were: " + (ctx || "no context"),
    "", "text").then(function(v){
      if(v === null) return;
      var n = notesAdd("bug", v, ctx);
      if(n){
        notesBadgeRefresh();
        notesToast("Note saved — " + notesCount() + " open for Claude");
        try{ if(typeof SFX !== "undefined" && SFX.tick) SFX.tick(); }catch(e){}
      }
    });
}

if(typeof document !== "undefined" && document.addEventListener){
  if(document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", notesBadgeRefresh);
  else notesBadgeRefresh();
  document.addEventListener("keydown", function(e){
    if((e.ctrlKey || e.metaKey) && e.shiftKey && String(e.key).toLowerCase() === "n"){
      e.preventDefault();
      quickNote();
    }
  });
}
