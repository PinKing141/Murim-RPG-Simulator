import { STATE } from './state.js';
import { RNG, restoreRNG } from './rng.js';

/*
  Persistence layer — save / load / export for the murim.

  The simulation runs entirely in memory, and the world is a graph of mutating
  objects. Two things make a naive JSON.stringify(STATE) unsafe:

    1. Live object references. A figure holds `f.art` and `f.sect` as actual
       object references (not ids); a sect holds `s.signatureArt`. Serialising
       those inline would duplicate the art/sect across every holder and break
       identity (`f.art === a`) on reload. We dehydrate them to id fields on
       save and rewire them on load.

    2. Maps & Sets. STATE.eventIndex and STATE.figIndex are derived indices —
       we drop them on save and rebuild from `log` / `figures`. The milestone
       Sets are stored as plain arrays.

  The object graph is acyclic (figure → art, sect → signatureArt(art); arts and
  sects hold only ids back), so a flat id-based snapshot round-trips cleanly.
*/

const SAVE_KEY     = 'murim:save:v1';
const SETTINGS_KEY = 'murim:settings:v1';
const SAVE_VERSION = 1;

/* ---------- dehydrate: object refs → ids ---------- */

function dehydrateFigure(f) {
  const c = { ...f };
  c.artId  = f.art  ? f.art.id  : null;
  c.sectId = f.sect ? f.sect.id : null;
  delete c.art; delete c.sect;
  return c;
}

function dehydrateSect(s) {
  const c = { ...s };
  c.signatureArtId = s.signatureArt ? s.signatureArt.id : null;
  delete c.signatureArt;
  return c;
}

/* ---------- snapshot ---------- */

export function snapshot() {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    rngA: RNG.a >>> 0,
    state: {
      idc: STATE.idc, evc: STATE.evc,
      year: STATE.year, season: STATE.season, seed: STATE.seed,
      figures: STATE.figures.map(dehydrateFigure),
      sects:   STATE.sects.map(dehydrateSect),
      arts:    STATE.arts,
      blocs:   STATE.blocs,
      regions: STATE.regions,
      relics:  STATE.relics,
      tournaments: STATE.tournaments,
      log:     STATE.log,
      activeWars: STATE.activeWars,
      threatActive: STATE.threatActive,
      lastThreatFall: STATE.lastThreatFall,
      lastTournamentYear: STATE.lastTournamentYear,
      cultCooldownUntil: STATE.cultCooldownUntil,
      threatCooldownUntil: STATE.threatCooldownUntil,
      firstFemaleHeadSects: [...STATE.firstFemaleHeadSects],
      firstMaleHeadSects:   [...STATE.firstMaleHeadSects],
      firstFemaleRealm8: STATE.firstFemaleRealm8,
      firstFemaleBloc: STATE.firstFemaleBloc,
      firstFemaleChampion: STATE.firstFemaleChampion
    }
  };
}

/* ---------- hydrate: ids → object refs, rebuild indices ---------- */

export function restore(save) {
  if (!save || !save.state) throw new Error('Empty or malformed save');
  if (save.version !== SAVE_VERSION) {
    throw new Error(`Save version ${save.version} is not compatible with this build (expects v${SAVE_VERSION}).`);
  }
  const s = save.state;

  /* scalars & arrays first */
  STATE.idc = s.idc; STATE.evc = s.evc;
  STATE.year = s.year; STATE.season = s.season; STATE.seed = s.seed;
  STATE.arts    = s.arts    || [];
  STATE.blocs   = s.blocs   || [];
  STATE.regions = s.regions || [];
  STATE.relics  = s.relics  || [];
  STATE.tournaments = s.tournaments || [];
  STATE.log     = s.log     || [];
  STATE.activeWars = s.activeWars || [];
  STATE.threatActive = !!s.threatActive;
  STATE.lastThreatFall = s.lastThreatFall ?? null;
  STATE.lastTournamentYear = s.lastTournamentYear || 0;
  STATE.cultCooldownUntil = s.cultCooldownUntil || 0;
  STATE.threatCooldownUntil = s.threatCooldownUntil || 0;
  STATE.firstFemaleHeadSects = new Set(s.firstFemaleHeadSects || []);
  STATE.firstMaleHeadSects   = new Set(s.firstMaleHeadSects   || []);
  STATE.firstFemaleRealm8 = !!s.firstFemaleRealm8;
  STATE.firstFemaleBloc = !!s.firstFemaleBloc;
  STATE.firstFemaleChampion = !!s.firstFemaleChampion;

  /* rebuild lookups */
  const artById  = new Map(STATE.arts.map(a => [a.id, a]));
  STATE.sects = (s.sects || []).map(sc => {
    const sect = { ...sc };
    sect.signatureArt = sc.signatureArtId != null ? (artById.get(sc.signatureArtId) || null) : null;
    delete sect.signatureArtId;
    return sect;
  });
  const sectById = new Map(STATE.sects.map(x => [x.id, x]));

  STATE.figIndex = new Map();
  STATE.figures = (s.figures || []).map(fc => {
    const f = { ...fc };
    f.art  = fc.artId  != null ? (artById.get(fc.artId)   || null) : null;
    f.sect = fc.sectId != null ? (sectById.get(fc.sectId) || null) : null;
    delete f.artId; delete f.sectId;
    /* defaults for fields added after a save was written */
    if (f.tournamentsEntered == null) f.tournamentsEntered = 0;
    if (f.tournamentsWon == null) f.tournamentsWon = 0;
    if (!Array.isArray(f.tournamentWins)) f.tournamentWins = [];
    STATE.figIndex.set(f.id, f);
    return f;
  });

  /* event index is a pure id→event map rebuilt from the log */
  STATE.eventIndex = new Map();
  for (const ev of STATE.log) STATE.eventIndex.set(ev.id, ev);

  /* resume the RNG exactly where it left off */
  restoreRNG(save.rngA >>> 0);

  STATE.dirtyLog = true;
  STATE.dirtyPanels = true;
}

/* ---------- localStorage save slot ---------- */

export function saveToStorage() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot()));
    return true;
  } catch (e) {
    console.error('Save failed:', e);
    return false;
  }
}

export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    restore(save);
    return save;
  } catch (e) {
    console.error('Load failed:', e);
    return null;
  }
}

export function hasStoredSave() {
  try { return localStorage.getItem(SAVE_KEY) != null; }
  catch { return false; }
}

export function clearStoredSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

export function storedSaveMeta() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    return { year: save.state?.year, savedAt: save.savedAt, seed: save.state?.seed };
  } catch { return null; }
}

/* ---------- settings (persist across reload independently of the world) ---------- */

export function saveSettings(settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  catch { /* ignore */ }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/* ---------- file export / import ---------- */

export function exportToFile() {
  const data = JSON.stringify(snapshot(), null, 0);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = `y${STATE.year}-${new Date().toISOString().slice(0,10)}`;
  a.href = url;
  a.download = `murim-chronicle-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => { if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url); }, 1000);
}

export function importFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const save = JSON.parse(reader.result);
        restore(save);
        resolve(save);
      } catch (e) { reject(e); }
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsText(file);
  });
}
