const varOf = {
  line: "--line", muted: "--muted", wheat: "--wheat",
  ok: "--correct", no: "--wrong", txt: "--text", xp: "--xp", bg: "--bg"
};

const cache = {};

export const C = {};

Object.keys(varOf).forEach(k => {
  Object.defineProperty(C, k, {
    enumerable: true,
    get() {
      if (cache[k] === undefined) {
        cache[k] = getComputedStyle(document.documentElement).getPropertyValue(varOf[k]).trim();
      }
      return cache[k];
    }
  });
});

export const forgetTheme = () => Object.keys(cache).forEach(k => delete cache[k]);
