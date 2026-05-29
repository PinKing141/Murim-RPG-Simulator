import { cap } from './rng.js';
import { STATE } from './state.js';

export function ref(f) {
  if (!f) return "an unknown";
  if (f.byeolho && f.namedAt != null) return `<span class="nm">${cap(f.byeolho.en)} (${f.byeolho.kr})</span>`;
  return `<span class="nm">${f.name}</span>`;
}

export function plainRef(f) { return `<span class="nm">${f.name}</span>`; }
export function sref(s)  { return s ? `<span class="sn">${s.name} (${s.kr})</span>` : "a vanished house"; }
export function aref(a)  { return a ? `<em class="art">${a.name} (${a.kr})</em>` : "a forgotten art"; }

export function chron(cls, html, level) {
  STATE.log.push({ year: STATE.year, season: STATE.season, cls, html, level: level || "normal" });
  STATE.dirtyLog = true;
}
