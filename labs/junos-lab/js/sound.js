var SFX = (function(){
  var enabled = true;
  try{
    var saved = localStorage.getItem("junoslab-sound");
    if(saved === null) saved = localStorage.getItem("junoslab-bell");
    enabled = saved !== "off";
  }catch(e){}

  var ctx = null;
  function ac(){
    if(ctx) return ctx;
    var AC = (typeof window !== "undefined") && (window.AudioContext || window.webkitAudioContext);
    if(!AC) return null;
    try{ ctx = new AC(); }catch(e){ return null; }
    return ctx;
  }
  function armed(){
    if(!enabled) return null;
    var c = ac();
    if(!c) return null;
    if(c.state === "suspended"){ try{ c.resume(); }catch(e){} }
    return c;
  }
  function env(c, t0, peak, dur){
    var g = c.createGain();
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    g.connect(c.destination);
    return g;
  }
  function tone(c, t0, type, f0, f1, peak, dur){
    var o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if(f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    o.connect(env(c, t0, peak, dur));
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(c, t0, freq, q, peak, dur){
    var n = Math.max(8, Math.round(c.sampleRate * dur));
    var buf = c.createBuffer(1, n, c.sampleRate);
    var ch = buf.getChannelData(0);
    for(var i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var src = c.createBufferSource();
    src.buffer = buf;
    var bp = c.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = q;
    src.connect(bp); bp.connect(env(c, t0, peak, dur));
    src.start(t0);
  }

  var lastClack = 0;
  function clack(){
    var c = armed(); if(!c) return;
    var now = performance.now();
    if(now - lastClack < 42) return;
    lastClack = now;
    var t0 = c.currentTime;
    noise(c, t0, 2400 + Math.random() * 1400, 2.2, 0.03, 0.018);
    tone(c, t0, "triangle", 620 + Math.random() * 240, 400, 0.012, 0.02);
  }
  function alertChirp(){
    var c = armed(); if(!c) return;
    var t0 = c.currentTime;
    tone(c, t0, "sine", 1560, 1560, 0.06, 0.07);
    tone(c, t0 + 0.11, "sine", 1560, 1560, 0.06, 0.07);
    tone(c, t0 + 0.30, "sine", 1180, 1180, 0.045, 0.1);
  }
  function ticket(){
    var c = armed(); if(!c) return;
    var t0 = c.currentTime;
    noise(c, t0, 1200, 1.0, 0.09, 0.05);
    noise(c, t0 + 0.10, 1200, 1.0, 0.07, 0.05);
    tone(c, t0 + 0.2, "sine", 988, 988, 0.04, 0.12);
  }
  function fan(){
    var c = armed(); if(!c) return;
    var t0 = c.currentTime;
    var n = Math.round(c.sampleRate * 1.4);
    var buf = c.createBuffer(1, n, c.sampleRate);
    var ch = buf.getChannelData(0);
    for(var i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1);
    var src = c.createBufferSource();
    src.buffer = buf;
    var lp = c.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.setValueAtTime(220, t0);
    lp.frequency.exponentialRampToValueAtTime(900, t0 + 0.9);
    lp.frequency.exponentialRampToValueAtTime(500, t0 + 1.4);
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4);
    src.connect(lp); lp.connect(g); g.connect(c.destination);
    src.start(t0);
  }
  var ambient = null;
  function ambientOn(){
    var c = armed(); if(!c || ambient) return;
    var n = Math.round(c.sampleRate * 2);
    var buf = c.createBuffer(1, n, c.sampleRate);
    var ch = buf.getChannelData(0);
    var last = 0;
    for(var i = 0; i < n; i++){
      var w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      ch[i] = last * 3.5;
    }
    var src = c.createBufferSource();
    src.buffer = buf; src.loop = true;
    var lp = c.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 340; lp.Q.value = 0.6;
    var hum = c.createOscillator();
    hum.type = "sine"; hum.frequency.value = 119;
    var hg = c.createGain(); hg.gain.value = 0.006;
    var g = c.createGain(); g.gain.value = 0.028;
    src.connect(lp); lp.connect(g); g.connect(c.destination);
    hum.connect(hg); hg.connect(c.destination);
    src.start(); hum.start();
    ambient = { src: src, hum: hum };
  }
  function ambientOff(){
    if(!ambient) return;
    try{ ambient.src.stop(); ambient.hum.stop(); }catch(e){}
    ambient = null;
  }
  function ambientIsOn(){ return !!ambient; }
  var lastTick = 0;
  function tick(){
    var c = armed(); if(!c) return;
    var now = performance.now();
    if(now - lastTick < 45) return;
    lastTick = now;
    var t0 = c.currentTime;
    noise(c, t0, 3400, 1.6, 0.055, 0.028);
    tone(c, t0, "triangle", 950, 700, 0.028, 0.03);
  }
  function plug(){
    var c = armed(); if(!c) return;
    var t0 = c.currentTime;
    noise(c, t0, 2600, 1.2, 0.14, 0.06);
    tone(c, t0, "triangle", 190, 120, 0.08, 0.08);
  }
  function unplug(){
    var c = armed(); if(!c) return;
    var t0 = c.currentTime;
    noise(c, t0, 1500, 1.1, 0.11, 0.06);
    tone(c, t0, "triangle", 130, 85, 0.07, 0.09);
  }
  function drop(){
    var c = armed(); if(!c) return;
    var t0 = c.currentTime;
    tone(c, t0, "triangle", 160, 95, 0.11, 0.1);
    noise(c, t0 + 0.012, 2200, 1.3, 0.09, 0.05);
  }
  function trash(){
    var c = armed(); if(!c) return;
    var t0 = c.currentTime;
    noise(c, t0, 900, 0.8, 0.1, 0.11);
    tone(c, t0, "sawtooth", 240, 90, 0.05, 0.13);
  }
  function commit(){
    var c = armed(); if(!c) return;
    var t0 = c.currentTime;
    tone(c, t0, "sine", 659, 659, 0.07, 0.09);
    tone(c, t0 + 0.09, "sine", 880, 880, 0.07, 0.13);
  }
  function ding(){
    var c = armed(); if(!c) return;
    var t0 = c.currentTime;
    tone(c, t0, "sine", 1318, 1318, 0.06, 0.16);
    tone(c, t0, "sine", 1976, 1976, 0.02, 0.12);
  }
  function fanfare(){
    var c = armed(); if(!c) return;
    var t0 = c.currentTime;
    var notes = [523.25, 659.25, 783.99, 1046.5];
    for(var i = 0; i < notes.length; i++)
      tone(c, t0 + i * 0.11, "sine", notes[i], notes[i], 0.07, i === notes.length - 1 ? 0.34 : 0.13);
    tone(c, t0 + 0.33, "triangle", 523.25, 523.25, 0.03, 0.3);
  }
  function blip(){
    var c = armed(); if(!c) return;
    tone(c, c.currentTime, "sine", 660, 880, 0.05, 0.07);
  }
  function womp(){
    var c = armed(); if(!c) return;
    tone(c, c.currentTime, "sawtooth", 300, 140, 0.06, 0.18);
  }
  function bell(){
    var c = armed(); if(!c) return;
    tone(c, c.currentTime, "sine", 880, 880, 0.06, 0.12);
  }
  function powerUp(){
    var c = armed(); if(!c) return;
    tone(c, c.currentTime, "sine", 220, 660, 0.06, 0.22);
  }
  function setEnabled(on){
    enabled = !!on;
    if(!enabled) ambientOff();
    try{ localStorage.setItem("junoslab-sound", enabled ? "on" : "off"); }catch(e){}
  }
  function isEnabled(){ return enabled; }

  if(typeof document !== "undefined" && document.addEventListener){
    document.addEventListener("click", function(e){
      var el = e.target && e.target.closest && e.target.closest("button, .tablet-tab, .tb-menu, select, .mrow");
      if(el) tick();
    }, true);
    document.addEventListener("change", function(e){
      if(e.target && e.target.tagName === "SELECT") tick();
    }, true);
  }

  return { tick: tick, plug: plug, unplug: unplug, drop: drop, trash: trash,
           commit: commit, ding: ding, fanfare: fanfare, blip: blip, womp: womp,
           bell: bell, powerUp: powerUp, setEnabled: setEnabled, isEnabled: isEnabled,
           clack: clack, alert: alertChirp, ticket: ticket, fan: fan,
           ambientOn: ambientOn, ambientOff: ambientOff, ambientIsOn: ambientIsOn };
})();
