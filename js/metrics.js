import { STATE, aliveSects, aliveFigs } from './state.js';
import { aliveBlocs, allianceBloc, cultBloc } from './factions.js';

/*
  Read-only instrumentation. Pure functions of STATE — they compute the
  murim's vital signs without touching determinism, so the running world can
  show its own era-shape, polarisation and the legitimacy gap that predicts
  where history is about to turn violent.
*/

const avg = (arr, f) => arr.length ? arr.reduce((t, x) => t + f(x), 0) / arr.length : 0;

/* how much of the martial world is sworn to a bloc vs. standing apart (0..1) */
export function polarisation() {
  const sects = aliveSects();
  if (!sects.length) return 0;
  const alive = new Set(sects.map(s => s.id));
  const sworn = new Set();
  for (const b of aliveBlocs()) for (const sid of b.memberSects) if (alive.has(sid)) sworn.add(sid);
  return Math.min(1, sworn.size / sects.length);
}

/* the average institutional authority across the living houses */
export function avgLegitimacy() {
  return avg(aliveSects(), s => s.legitimacy);
}

/* the gap between raw power and recognised authority among the great houses.
   A wide gap means strong-but-illegitimate powers exist — history is unstable. */
export function legitimacySpread() {
  const sects = aliveSects().filter(s => s.members.length);
  if (sects.length < 2) return 0;
  const ranked = [...sects].sort((a, b) =>
    (b.members.length + b.prestige) - (a.members.length + a.prestige));
  const top = ranked.slice(0, Math.max(2, Math.ceil(ranked.length / 3)));
  const mostPowerful = top[0];
  const mostLegit = [...sects].sort((a, b) => b.legitimacy - a.legitimacy)[0];
  return Math.abs((mostPowerful.legitimacy || 0) - (mostLegit.legitimacy || 0));
}

/* population-weighted: the health of the world is the health of where its
   people actually are, so thriving river valleys count for more than empty wastes */
export function avgRegionHealth() {
  let w = 0, sum = 0;
  for (const r of STATE.regions) {
    const ww = r.population + 5;
    sum += ((r.prosperity + r.stability) / 2) * ww;
    w += ww;
  }
  return w ? sum / w : 0;
}

/*
  The era index — what kind of age the murim is living through. Folds the
  presence of a demon, active wars, alliance cohesion and regional health
  into one reading, so the chronicle has a sense of its own weather.
*/
export function eraIndex() {
  const wars = STATE.activeWars.length;
  const A = allianceBloc(), C = cultBloc();
  const cohesion = A ? A.cohesion : 60;
  const health = avgRegionHealth();
  const leg = avgLegitimacy();
  const pol = polarisation();

  if (STATE.threatActive) return { key: "calamity", label: "Age of Calamity", kr: "겁난", c: "var(--blood)" };
  if (wars >= 2 || (C && C.alive && A && A.alive)) return { key: "war", label: "Age of War", kr: "전란", c: "var(--magyo)" };
  /* hollow institutions or a depleted land, in nominal peace — an age of decline */
  if (wars === 0 && (leg < 44 || health < 50)) return { key: "decline", label: "Age of Decline", kr: "쇠퇴", c: "var(--sapa)" };
  /* healthy land, legitimate houses, and a world not yet split into two camps */
  if (wars === 0 && health > 56 && leg > 54 && pol < 0.6) return { key: "golden", label: "Golden Age", kr: "태평", c: "var(--gold-bright)" };
  if (wars === 0 && cohesion < 35 && A && A.alive) return { key: "fraying", label: "Age of Fraying", kr: "균열", c: "var(--sapa)" };
  return { key: "settled", label: "Settled Age", kr: "안정", c: "var(--jeongpa)" };
}

/* a single snapshot for the readout panel */
export function vitals() {
  return {
    era: eraIndex(),
    polarisation: polarisation(),
    legitimacySpread: legitimacySpread(),
    regionHealth: avgRegionHealth(),
    legitimacy: avgLegitimacy(),
    sects: aliveSects().length,
    figs: aliveFigs().length
  };
}
