export const RNG = { fn: null };

export function makeRNG(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export const rand  = () => RNG.fn();
export const ri    = (lo, hi) => Math.floor(rand() * (hi - lo + 1)) + lo;
export const pick  = arr => arr[Math.floor(rand() * arr.length)];
export const chance = p => rand() < p;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const cap   = s => s.charAt(0).toUpperCase() + s.slice(1);
