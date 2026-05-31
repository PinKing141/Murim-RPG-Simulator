import { cap } from './rng.js';
import { STATE, newEvId } from './state.js';

export function ref(f) {
  if (!f) return "an unknown";
  if (f.byeolho && f.namedAt != null) return `<span class="nm">${cap(f.byeolho.en)} (${f.byeolho.kr})</span>`;
  return `<span class="nm">${f.name}</span>`;
}

export function plainRef(f) { return `<span class="nm">${f.name}</span>`; }
export function sref(s)  { return s ? `<span class="sn">${s.name} (${s.kr})</span>` : "a vanished house"; }
export function aref(a)  { return a ? `<em class="art">${a.name} (${a.kr})</em>` : "a forgotten art"; }
export function bref(b)  { return b ? `<span class="bn">${b.name} (${b.kr})</span>` : "a broken banner"; }
export function rref(r)  { return r ? `<span class="rn">${r.name} (${r.kr})</span>` : "a lost relic"; }

/* pronoun helpers — gender-aware for chronicle prose */
export function pro(f)  { return f && f.gender === "female" ? "she"  : "he";  }
export function proObj(f) { return f && f.gender === "female" ? "her"  : "him"; }
export function proPoss(f){ return f && f.gender === "female" ? "her"  : "his"; }

/* Look up an event node by its id. */
export const evById = id => STATE.eventIndex.get(id);

/*
  Record a chronicle entry as an event node.
  causes is an array of prior event ids that directly led to this one;
  each cause gets a back-edge into its effects[] so the graph is walkable
  both ways. Returns the new event so callers can wire downstream edges.
*/
export function chron(cls, html, level, figs = [], sects = [], causes = []) {
  const validCauses = causes.filter(id => id != null && STATE.eventIndex.has(id));
  const ev = {
    id: newEvId(),
    year: STATE.year, season: STATE.season,
    cls, html, level: level || "normal",
    figs, sects,
    causes: validCauses,
    effects: []
  };
  STATE.log.push(ev);
  STATE.eventIndex.set(ev.id, ev);
  for (const cid of validCauses) STATE.eventIndex.get(cid).effects.push(ev.id);
  STATE.dirtyLog = true;
  return ev;
}
