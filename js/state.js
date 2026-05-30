import { rand, ri, pick, chance, clamp } from './rng.js';
import {
  SURNAMES, CLAN_SURNAMES, GIVEN,
  BH_PRE, BH_SUF, SECT_PRE, SECT_SUF, ART_PRE, ART_SUF,
  REGIONS, TERRAIN, REGION_TERRAIN, DOCTRINES, DOCTRINE_KEYS, ALIGN_PERSONALITY_BIAS,
  RELIC_TYPES, RELIC_PRE, RELIC_SUF,
  ART_PRINCIPLES, ALIGN_PRINCIPLES
} from './data.js';

export const STATE = {
  idc: 1, evc: 1, year: 1, season: 0,
  seasonNames: ["Spring","Summer","Autumn","Winter"],
  figures: [], sects: [], arts: [], blocs: [], regions: [], relics: [],
  log: [], eventIndex: new Map(), figIndex: new Map(),
  dirtyLog: true, dirtyPanels: true,
  activeWars: [], threatActive: false, lastThreatFall: null,
  cultCooldownUntil: 0, threatCooldownUntil: 0, seed: 0,
  showHangul: true, eraCompress: true
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
  const pp = ALIGN_PRINCIPLES[align] || ALIGN_PRINCIPLES.orthodox;
  const founderPrinciples = {};
  for (const k of ART_PRINCIPLES) founderPrinciples[k] = ri(pp[k][0], pp[k][1]);
  return {
    id: newId(), kind: "art",
    name: nm.en, kr: nm.kr, roman: nm.roman,
    tier: ri(2, 6),
    align,
    corruption: align === "demonic" ? ri(35,70) : align === "unorthodox" ? ri(15,40) : ri(0,12),
    /* a cursed art spreads corruption passively to ANY holder — the practice
       itself is malevolent regardless of the practitioner's nature */
    cursed: align === "demonic" && chance(.28),
    lost: false, dormant: false,
    holders: 0, origin: STATE.year, lostYear: null,
    lostHolder: null, lostHolderId: null,
    lostEvent: null,
    /* living tradition fields */
    founderPrinciples,
    currentInterpretation: { ...founderPrinciples },
    deviationScore: 0,
    commentaries: [],        // [{year, authorId, authorName, text, milestone}]
    parentId: null,          // set when this art is a variant/branch of another
    isFragment: false,       // partially destroyed; knowledge is incomplete
    isRestoration: false,    // reconstructed from fragments; imperfectly
    lastCommentaryAt: 0,     // year of most recent commentary entry
    lastVariantAt: 0         // year a branch was last spawned from this art
  };
}

let _relicSeq = 0;
export function makeRelicName() {
  const p = pick(RELIC_PRE), s = pick(RELIC_SUF);
  return { roman: p[0] + " " + s[0], kr: p[1] + s[1], en: p[2] + " " + s[2] };
}

/* a legendary object: it has a holder, a history of deeds, and can be lost */
export function makeRelic(opts = {}) {
  const type = opts.type || pick(RELIC_TYPES);
  const nm = makeRelicName();
  return {
    id: newId(), kind: "relic",
    name: nm.en, kr: nm.kr, roman: nm.roman,
    type: type.kind, noun: type.noun, typeKr: type.kr,
    align: opts.align || pick(["orthodox","unorthodox","demonic","demonic"]),
    forgedYear: STATE.year,
    holderId: opts.holderId != null ? opts.holderId : null,
    holderName: null,
    lost: false, lostYear: null,
    seq: ++_relicSeq,
    history: [],     // [{year, holderId, holderName, deed, eventId}]
    originEvent: null
  };
}
export const relicById = id => STATE.relics.find(r => r.id === id) || null;

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
    charisma: opts.charisma != null ? opts.charisma : clamp(ri(8, 64) + (clan ? 12 : 0), 0, 100),
    /* personality — the deep character of this individual. Unlike alignment
       (what path they walk), personality is how they walk it. A Bloodthirsty
       figure seeks war; a Scholarly one seeks mastery; a Scheming one seeks
       leverage. When they lead a sect it overrides the house's founding doctrine
       as the driver of day-to-day behaviour. */
    personality: opts.personality != null ? opts.personality
      : (chance(.65) ? pick(ALIGN_PERSONALITY_BIAS[align] || DOCTRINE_KEYS) : pick(DOCTRINE_KEYS)),
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
  const doctrine = opts.doctrine || pick(DOCTRINE_KEYS);
  const doc = DOCTRINES[doctrine];
  return {
    id: newId(), kind: "sect",
    name: nm.en, kr: nm.kr, roman: nm.roman,
    align,
    doctrine,
    region: opts.region || pick(REGIONS),
    founded: STATE.year,
    prestige: opts.prestige != null ? opts.prestige : ri(25, 55),
    members: [], allMembers: [],
    signatureArt: null,
    headId: null,
    heirId: null,            // publicly groomed successor (set during the head's life)
    founderClan: null,       // surname of the founding house, for bloodline legitimacy
    founderId: null,
    succession: null,        // ongoing crisis: {startYear, claimantIds, factions, heat, resolvePath}
    alive: true, deadYear: null,
    fallEvent: null,
    atWarWith: [],
    stance: opts.stance != null ? opts.stance : (align === "unorthodox" ? ri(-25, 25) : 0),
    blocGrudges: [],
    coerced: false,
    joinedBlocYear: null,
    loyalYears: 0,
    marriedOrthodox: false,
    legitimacy: opts.legitimacy != null ? opts.legitimacy : clamp(ri(35, 62) + (doc ? doc.legitBonus : 0), 5, 92),
    doctrinalDebt: 0,
    reformLean: 0,
    patron: false,
    tensionDebt: 0   // accumulated when head personality clashes with founding doctrine
  };
}

export function makeRegion(name) {
  const key = REGION_TERRAIN[name] || "forest";
  const t = TERRAIN[key];
  const span = ([lo, hi]) => ri(lo, hi);
  return {
    kind: "region", name, terrain: key,
    population: span(t.population),
    prosperity: span(t.prosperity),
    stability: span(t.stability),
    peakPop: 0, scarYear: null, era: "settled"
  };
}
export const regionByName = name => STATE.regions.find(r => r.name === name) || null;

export const aliveFigs  = () => STATE.figures.filter(f => f.alive);
export const aliveSects = () => STATE.sects.filter(s => s.alive);
export const figById    = id => STATE.figIndex.get(id);
