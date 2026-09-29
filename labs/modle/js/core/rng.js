let rng = Math.random;
export const setRng = (fn) => { rng = fn; };
export const useSystemRng = () => { rng = Math.random; };
export const random = () => rng();
export const rand = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
export const pick = (arr) => arr[rand(0, arr.length - 1)];
export function mulberry32(a) { return function() { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const dateSeed = (s) => { let h = 0; for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; } return h; };
