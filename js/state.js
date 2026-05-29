import { rand, ri, pick, chance } from './rng.js';
import {
  SURNAMES, CLAN_SURNAMES, GIVEN,
  BH_PRE, BH_SUF, SECT_PRE, SECT_SUF, ART_PRE, ART_SUF,
  REGIONS
} from './data.js';

export const STATE = {
  idc: 1, evc: 1, year: 1, season: 0,
  seasonNames: ["Spring","Summer","Autumn","Winter"],
  figures: [], sects: [], arts: [],
  log: [], eventIndex: new Map(), figIndex: new Map(),
  dirtyLog: true, dirtyPanels: true,
  activeWars: [], threatActive: false, seed: 0
};

export function newId()    { return STATE.idc++; }
export function newEvId()  { return STATE.evc++; }

export function addToSect(s, f) {
  s.members.push(f.id);
  if (!s.allMembers.includes(f.id)) s.allMembers.push(f.id);
}

export function makeName() {
  if (chance(.22)) return pick(CLAN_SURNAMES) + " " + pick(GIVEN);
  return pick(SURNAMES) + " " + pick(GIVEN);
}

export function makeByeolho() {
  const p = pick(BH_PRE), s = pick(BH_SUF);
  return { roman: p[0] + s[0], kr: p[1] + s[1], en: "the " + p[2] + " " + s[2] };
}

export function makeSectName(align) {
  const p = pick(SECT_PRE);
  let s;
  if (align === "demonic") s = chance(.5) ? ["gyo","교","Cult"] : pick(SECT_SUF);
  else s = pick(SECT_SUF);
  return { roman: p[0] + s[0], kr: p[1] + s[1], en: p[2] + " " + s[2] };
}

export function makeArtName() {
  const p = pick(ART_PRE), s = pick(ART_SUF);
  return { roman: p[0] + " " + s[0], kr: p[1] + s[1], en: p[2] + " " + s[2] };
}

export function makeArt(align) {
  const nm = makeArtName();
  return {
    id: newId(), kind: "art",
    name: nm.en, kr: nm.kr, roman: nm.roman,
    tier: ri(2, 6),
    align,
    corruption: align === "demonic" ? ri(35,70) : align === "unorthodox" ? ri(15,40) : ri(0,12),
    lost: false, dormant: false,
    holders: 0, origin: STATE.year, lostYear: null,
    lostHolder: null, lostHolderId: null,
    lostEvent: null
  };
}

export function recomputeLife(f) {
  let base = 58 + f.realm * 22 + Math.floor(f.talent / 4);
  if (f.align === "demonic") base -= 18;
  if (f.align === "recluse") base += 30;
  f.lifespan = base;
}

export function recomputePower(f) {
  let p = f.realm * 100 + f.progress + f.talent * 1.5;
  if (f.art) p += f.art.tier * 30;
  f.power = Math.round(p);
}

export function makeFigure(opts = {}) {
  const align = opts.align || pick(["orthodox","orthodox","unorthodox","demonic","recluse"]);
  const talent = opts.talent != null ? opts.talent : ri(20, 80);
  const name = opts.name || makeName();
  const surname = name.split(" ")[0];
  const clan = opts.clan || (CLAN_SURNAMES.includes(surname) ? surname : null);
  const f = {
    id: newId(), kind: "fig",
    name, surname, clan,
    byeolho: null,
    align, talent,
    realm: opts.realm != null ? opts.realm : 0,
    progress: rand() * 40,
    age: opts.age != null ? opts.age : ri(14, 22),
    lifespan: 0, power: 0,
    fame: opts.fame || ri(0, 8),
    alignmentDrift: align === "demonic" ? ri(40,65) : align === "unorthodox" ? ri(20,40) : ri(0,15),
    sect: opts.sect || null,
    art: opts.art || null,
    master: opts.master || null,
    lineage: opts.lineage || null,
    alive: true, born: STATE.year,
    isThreat: false, namedAt: null,
    grudges: [], brothers: [],
    realmHistory: [], lineageId: null,
    grudgeCause: {}, grudgeMeta: {},
    originEvent: null, fallEvent: null, ascendEvent: null,
    /* bloodline & bonds */
    spouse: null,
    parents: opts.parents || [],
    children: [],
    gen: opts.gen || 0,
    bloodlineTaint: opts.bloodlineTaint || 0,
    taintSource: opts.taintSource || null,
    awakened: false,
    killedBy: null
  };
  recomputeLife(f);
  recomputePower(f);
  STATE.figIndex.set(f.id, f);
  return f;
}

export function makeSect(opts = {}) {
  const align = opts.align || pick(["orthodox","orthodox","orthodox","unorthodox","demonic","recluse"]);
  const nm = makeSectName(align);
  return {
    id: newId(), kind: "sect",
    name: nm.en, kr: nm.kr, roman: nm.roman,
    align,
    region: opts.region || pick(REGIONS),
    founded: STATE.year,
    prestige: opts.prestige != null ? opts.prestige : ri(25, 55),
    members: [], allMembers: [],
    signatureArt: null,
    alive: true, deadYear: null,
    fallEvent: null,
    atWarWith: []
  };
}

export const aliveFigs  = () => STATE.figures.filter(f => f.alive);
export const aliveSects = () => STATE.sects.filter(s => s.alive);
export const figById    = id => STATE.figIndex.get(id);
