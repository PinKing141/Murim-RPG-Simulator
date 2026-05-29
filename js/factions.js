import { STATE, newId, figById } from './state.js';

/*
  Power blocs — the institutions of the murim.

  Two kinds organise the age:
    - "alliance" (무림맹): orthodox sects band together against a demonic
       threat, led by a 맹주 chosen from the strongest among them.
    - "cult"     (천마신교 / 마교연합): the demonic houses unite under a
       single 교주, prone to bloody succession struggles.

  A bloc holds a balance of terror: it forms in response to its rival,
  wages the great war, and — for the alliance — frays from within once
  the common enemy is gone. This module is pure data + lookups; all the
  event-generating logic lives in systems.js to keep the import graph
  acyclic (factions.js ← systems.js, never the reverse).
*/

export function makeBloc(type, align, name, kr) {
  return {
    id: newId(), kind: 'bloc',
    type, align, name, kr,
    memberSects: [],
    leaderId: null, leaderSectId: null,
    founded: STATE.year, alive: true, dissolvedYear: null,
    formEvent: null, dissolveEvent: null, wonEvent: null,
    cohesion: 78,                 // internal stability; ≤0 → fracture / collapse
    rivalId: null,
    threatLed: false,             // a cult forged around a Heavenly Demon
    peakMembers: 0
  };
}

export const aliveBlocs   = () => STATE.blocs.filter(b => b.alive);
export const blocById     = id => STATE.blocs.find(b => b.id === id) || null;
export const allianceBloc = () => STATE.blocs.find(b => b.alive && b.type === 'alliance') || null;
export const cultBloc     = () => STATE.blocs.find(b => b.alive && b.type === 'cult') || null;
export const sectBloc     = sid => STATE.blocs.find(b => b.alive && b.memberSects.includes(sid)) || null;
export const blocLeader   = b => (b && b.leaderId != null) ? figById(b.leaderId) : null;

/* the living sects currently flying a bloc's banner */
export function blocSects(b) {
  return b.memberSects
    .map(sid => STATE.sects.find(s => s.id === sid))
    .filter(s => s && s.alive);
}

/* combined martial weight of every member sect */
export function blocMight(b) {
  let m = 0;
  for (const s of blocSects(b)) {
    for (const f of s.members.map(figById).filter(x => x && x.alive)) m += f.power;
    m += s.prestige * 5;
  }
  return m;
}

/*
  The unorthodox middle (사파) are political actors, not a weighted coin.
  A 사파 sect carries a persistent `stance` — which banner it currently
  inclines toward — and an institutional memory of how blocs have used it.
  These grievances never simply expire; they are the wedge a rival bloc
  can later exploit.
*/
export function addBlocGrudge(s, bloc, reason, eventId) {
  if (s.blocGrudges.some(g => g.blocId === bloc.id)) return;
  s.blocGrudges.push({ blocId: bloc.id, blocType: bloc.type, reason, event: eventId, year: STATE.year });
}
export function blocGrudgeAgainst(s, bloc) {
  return s.blocGrudges.find(g => g.blocId === bloc.id) ||
         s.blocGrudges.find(g => g.blocType === bloc.type) || null;
}
export const stanceLabel = st =>
  st >=  55 ? "loyal to the orthodox oath" :
  st >=  20 ? "leaning orthodox" :
  st <= -55 ? "in the cult's pocket" :
  st <= -20 ? "leaning demonic" : "stubbornly neutral";

/* the single strongest living martial artist across a set of sects,
   returned with the sect they belong to — the natural candidate for 맹주/교주 */
export function strongestIn(sects) {
  let best = null;
  for (const s of sects) {
    for (const f of s.members.map(figById).filter(x => x && x.alive)) {
      if (!best || f.power > best.f.power) best = { f, s };
    }
  }
  return best;
}
