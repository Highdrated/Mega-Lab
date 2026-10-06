/* minimal DOM shim so the app script evaluates headlessly under node/vm */
function __makeEl(tag){
  const el = {
    tag, children: [], attrs: {}, style: {}, dataset: {},
    listeners: {}, value: "", textContent: "", _innerHTML: "",
    selectedIndex: 0, scrollTop: 0, scrollHeight: 0, disabled: false,
    setAttribute(k, v){ this.attrs[k] = String(v); },
    getAttribute(k){ return this.attrs[k]; },
    appendChild(c){ this.children.push(c); if(c) c.parentNode = this; return c; },
    append(...cs){ cs.forEach(c => this.appendChild(c)); },
    remove(){
      if(this.parentNode && this.parentNode.children){
        const i = this.parentNode.children.indexOf(this);
        if(i >= 0) this.parentNode.children.splice(i, 1);
      }
      this.parentNode = null;
    },
    removeChild(c){
      const i = this.children.indexOf(c);
      if(i >= 0) this.children.splice(i, 1);
      if(c) c.parentNode = null;
      return c;
    },
    insertBefore(node, ref){
      const i = ref ? this.children.indexOf(ref) : -1;
      if(i < 0) this.children.push(node); else this.children.splice(i, 0, node);
      if(node) node.parentNode = this;
      return node;
    },
    prepend(...cs){ cs.reverse().forEach(c => { this.children.unshift(c); if(c) c.parentNode = this; }); },
    replaceChildren(...cs){ this.children = []; cs.forEach(c => this.appendChild(c)); },
    cloneNode(){ return __makeEl(this.tag); },
    querySelector(sel){ return __q(this, sel)[0] || null; },
    querySelectorAll(sel){ return __q(this, sel); },
    closest(sel){
      let n = this;
      while(n){ if(__matches(n, sel)) return n; n = n.parentNode; }
      return null;
    },
    getContext(){ return __ctx2d(); },
    toBlob(cb){ if(typeof cb === "function") cb(new Blob()); },
    contains(){ return false; },
    addEventListener(t, f){ (this.listeners[t] = this.listeners[t] || []).push(f); },
    removeEventListener(){},
    getBoundingClientRect(){ return { left: 0, top: 0, width: 1200, height: 800 }; },
    focus(){}, click(){},
  };
  el._classes = new Set();
  el.classList = {
    add: (...c) => c.forEach(x => el._classes.add(x)),
    remove: (...c) => c.forEach(x => el._classes.delete(x)),
    toggle: (c, force) => {
      const want = force === undefined ? !el._classes.has(c) : !!force;
      if(want) el._classes.add(c); else el._classes.delete(c);
      return want;
    },
    contains: (c) => el._classes.has(c),
  };
  Object.defineProperty(el, "className", {
    get(){ return Array.from(this._classes).join(" "); },
    set(v){ this._classes = new Set(String(v == null ? "" : v).split(/\s+/).filter(Boolean)); },
  });
  Object.defineProperty(el, "innerHTML", {
    get(){ return this._innerHTML; },
    set(v){ this._innerHTML = v; this.children = []; },
  });
  return el;
}
/* minimal selector matching: #id, .class, tag, and tag.class / tag#id */
function __matches(el, sel){
  if(!el || !sel) return false;
  for(const part of String(sel).split(",")){
    const t = part.trim();
    if(!t) continue;
    const m = t.match(/^([a-zA-Z][\w-]*)?(?:#([\w-]+))?((?:\.[\w-]+)*)$/);
    if(!m) continue;
    const [, tag, id, clsRaw] = m;
    if(tag && String(el.tag).replace(/^el#.*/, "") !== tag) continue;
    if(id && (el.attrs || {}).id !== id && el.tag !== "el#" + id) continue;
    const cls = (clsRaw || "").split(".").filter(Boolean);
    if(cls.length && !cls.every(c => el._classes && el._classes.has(c))) continue;
    return true;
  }
  return false;
}
function __q(rootEl, sel){
  const out = [];
  (function walk(n){
    for(const c of (n.children || [])){
      if(__matches(c, sel)) out.push(c);
      walk(c);
    }
  })(rootEl);
  return out;
}
function __ctx2d(){
  const noop = () => {};
  return new Proxy({}, {
    get(t, k){
      if(k === "canvas") return undefined;
      if(k === "measureText") return () => ({ width: 0 });
      if(k === "getImageData") return () => ({ data: [] });
      if(k === "createLinearGradient" || k === "createRadialGradient")
        return () => ({ addColorStop: noop });
      return (k in t) ? t[k] : noop;
    },
    set(t, k, v){ t[k] = v; return true; },
  });
}
var __byId = {};
var document = {
  getElementById: id => __byId[id] || (__byId[id] = __makeEl("el#" + id)),
  createElement: t => __makeEl(t),
  createElementNS: (ns, t) => __makeEl(t),
  createTextNode: t => {
    const n = __makeEl("#text");
    n.nodeType = 3;
    n.textContent = String(t == null ? "" : t);
    return n;
  },
  querySelector(sel){ return this.querySelectorAll(sel)[0] || null; },
  querySelectorAll(sel){
    const seen = new Set(), out = [];
    for(const el of __q(this.body, sel)) if(!seen.has(el)){ seen.add(el); out.push(el); }
    for(const id of Object.keys(__byId)){
      const el = __byId[id];
      if(__matches(el, sel) && !seen.has(el)){ seen.add(el); out.push(el); }
      for(const d of __q(el, sel)) if(!seen.has(d)){ seen.add(d); out.push(d); }
    }
    return out;
  },
  execCommand(){ return true; },
  readyState: "complete",
  addEventListener(){}, removeEventListener(){},
  body: __makeEl("body"),
};
var window = { innerWidth: 1200, innerHeight: 800 };
var localStorage = {
  _m: {},
  getItem(k){ return this._m[k] === undefined ? null : this._m[k]; },
  setItem(k, v){ this._m[k] = String(v); },
  removeItem(k){ delete this._m[k]; },
};
var performance = { now: () => Date.now() };
var __timers = [];
var setTimeout = (fn, ms) => { __timers.push({ fn, ms, dead: false }); return __timers.length; };
var clearTimeout = id => { if(__timers[id - 1]) __timers[id - 1].dead = true; };
var setInterval = () => 0;
var clearInterval = () => {};
var __fireTimers = () => { const t = __timers.slice(); __timers.length = 0; t.forEach(x => { if(!x.dead) x.fn(); }); };
var alert = () => {};
var Blob = function(){ };
var URL = { createObjectURL: () => "blob:x" };
var FileReader = function(){ };
