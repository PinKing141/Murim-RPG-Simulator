/* `a` is the live counter of the active generator. It lives on RNG so the
   persistence layer can snapshot and restore the exact RNG position, making a
   loaded sim continue along the same deterministic stream it would have. */
export const RNG = { fn: null, a: 0 };

export function makeRNG(seed) {
  RNG.a = seed >>> 0;
  return function () {
    let a = RNG.a | 0;
    a = a + 0x6D2B79F5 | 0;
    RNG.a = a;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* rebuild a generator that resumes from a saved counter position */
export function restoreRNG(a) {
  RNG.fn = makeRNG(0);   // install a fresh closure that reads RNG.a
  RNG.a = a >>> 0;       // then seat it at the saved position
}

export const rand  = () => RNG.fn();
export const ri    = (lo, hi) => Math.floor(rand() * (hi - lo + 1)) + lo;
export const pick  = arr => arr[Math.floor(rand() * arr.length)];
export const chance = p => rand() < p;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const cap   = s => s.charAt(0).toUpperCase() + s.slice(1);
