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
    remove(){ this.parentNode = null; },
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
  Object.defineProperty(el, "innerHTML", {
    get(){ return this._innerHTML; },
    set(v){ this._innerHTML = v; this.children = []; },
  });
  return el;
}
var __byId = {};
var document = {
  getElementById: id => __byId[id] || (__byId[id] = __makeEl("el#" + id)),
  createElement: t => __makeEl(t),
  createElementNS: (ns, t) => __makeEl(t),
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
