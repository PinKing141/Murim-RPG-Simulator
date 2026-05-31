import { RNG, makeRNG, ri, pick, chance } from './rng.js';
import { REGIONS, TERRAIN } from './data.js';
import { STATE, makeArt, makeSect, makeFigure, addToSect, aliveSects, makeRegion, regionByName, makeRelic } from './state.js';
import { chron, ref, sref, aref, rref } from './chronicle.js';
import { maybeName } from './systems.js';

export function genesis(seed) {
  RNG.fn = makeRNG(seed >>> 0);
  Object.assign(STATE, {
    idc: 1, evc: 1, year: 1, season: 0,
    seasonNames: ["Spring","Summer","Autumn","Winter"],
    figures: [], sects: [], arts: [], blocs: [], regions: [], relics: [],
    tournaments: [],
    log: [], eventIndex: new Map(), figIndex: new Map(),
    dirtyLog: true, dirtyPanels: true,
    activeWars: [], threatActive: false, lastThreatFall: null,
    lastTournamentYear: 0,
    cultCooldownUntil: 0, threatCooldownUntil: 0, seed,
    firstFemaleHeadSects: new Set(), firstMaleHeadSects: new Set(),
    firstFemaleRealm8: false, firstFemaleBloc: false, firstFemaleChampion: false
  });

  /* the mortal world first — terrain and the civilisation it sustains */
  for (const name of REGIONS) STATE.regions.push(makeRegion(name));

  const nArt = ri(5, 7);
  for (let i = 0; i < nArt; i++)
    STATE.arts.push(makeArt(pick(["orthodox","orthodox","unorthodox","demonic"])));

  const nSect = ri(5, 7);
  for (let i = 0; i < nSect; i++) {
    /* a house takes root in a region, and the land shapes what it becomes */
    const region = pick(STATE.regions);
    let align;
    if (chance(.6)) {
      align = TERRAIN[region.terrain].align;
      if (align === "recluse") align = chance(.5) ? "orthodox" : "recluse";
    }
    const s = makeSect({ region: region.name, align });
    region.prosperity = Math.min(100, region.prosperity + ri(4, 10));   // a sect enriches its seat
    STATE.sects.push(s);
    const cand = STATE.arts.filter(a => !a.lost && a.align === s.align);
    s.signatureArt = cand.length ? pick(cand) : pick(STATE.arts);
    s.signatureArt.holders++;
    for (let j = 0; j < ri(3, 5); j++) {
      const f = makeFigure({ align: s.align, sect: s, art: s.signatureArt, realm: ri(2,4), age: ri(28,55) });
      addToSect(s, f); STATE.figures.push(f);
    }
    const founder = makeFigure({ align: s.align, sect: s, art: s.signatureArt, realm: ri(4,6), age: ri(48,70), talent: ri(55,90) });
    maybeName(founder, true);
    addToSect(s, founder); STATE.figures.push(founder);
    s.headId = founder.id; s.founderId = founder.id; s.founderClan = founder.clan || null;
    const head = s.align === "demonic" ? "Cult Master (교주)" : s.align === "orthodox" ? "Sect Master (장문인)" : "Lord";
    chron("c-found",
      `${sref(s)} is founded in ${s.region} by ${ref(founder)}, ${head} of the house, who wields ${aref(s.signatureArt)}.`,
      "major", [founder.id], [s.id]);
  }

  for (let i = 0; i < ri(3, 6); i++) {
    const f = makeFigure({ align: pick(["recluse","unorthodox","orthodox"]), realm: ri(1,3), age: ri(20,40) });
    STATE.figures.push(f);
  }

  /* a legendary relic or two already exist when the age begins, held by the mighty */
  const mighty = STATE.figures.filter(f => f.realm >= 4);
  for (let i = 0; i < ri(1, 2); i++) {
    const holder = mighty.length ? pick(mighty) : null;
    const r = makeRelic({ holderId: holder ? holder.id : null, align: holder ? holder.align : undefined });
    r.forgedYear = STATE.year - ri(20, 200);   // forged in a forgotten age
    if (holder) r.holderName = holder.name;
    STATE.relics.push(r);
    const ev = chron("c-relic",
      `${rref(r)}, a ${r.noun} ${pick(["spoken of in legend","forged in a forgotten age","whose origin none can agree upon"])}, ${holder ? `rests in the hands of ${ref(holder)}` : "lies hidden somewhere in the Gangho"}.`,
      "major", holder ? [holder.id] : [], []);
    r.originEvent = ev.id;
    r.history.push({ year: r.forgedYear, holderId: holder ? holder.id : null, holderName: holder ? holder.name : null, deed: "was first spoken of", eventId: ev.id });
  }

  chron("c-peace",
    `The Murim stirs awake. ${STATE.sects.length} great houses stand across the Gangho, and the rivers and lakes brim with ambition.`,
    "epic");
}
