const KEY = "modle-profile";

let mem = {};

export const store = {
  read() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
    catch (e) { return mem; }
  },
  write(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); }
    catch (e) { mem = d; }
  },
  clear() {
    try { localStorage.removeItem(KEY); }
    catch (e) { mem = {}; }
  }
};
