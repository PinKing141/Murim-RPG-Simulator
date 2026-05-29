import { RNG, makeRNG, ri, pick, chance } from './rng.js';
import { STATE, makeArt, makeSect, makeFigure, aliveSects } from './state.js';
import { chron, ref, sref, aref } from './chronicle.js';
import { maybeName } from './systems.js';

function addToSect(s, f) {
  s.members.push(f.id);
  if (!s.allMembers.includes(f.id)) s.allMembers.push(f.id);
}

export function genesis(seed) {
  RNG.fn = makeRNG(seed >>> 0);
  Object.assign(STATE, {
    idc: 1, evc: 1, year: 1, season: 0,
    seasonNames: ["Spring","Summer","Autumn","Winter"],
    figures: [], sects: [], arts: [],
    log: [], eventIndex: new Map(),
    dirtyLog: true, dirtyPanels: true,
    activeWars: [], threatActive: false, seed
  });

  const nArt = ri(5, 7);
  for (let i = 0; i < nArt; i++)
    STATE.arts.push(makeArt(pick(["orthodox","orthodox","unorthodox","demonic"])));

  const nSect = ri(5, 7);
  for (let i = 0; i < nSect; i++) {
    const s = makeSect();
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
    const head = s.align === "demonic" ? "Cult Master (교주)" : s.align === "orthodox" ? "Sect Master (장문인)" : "Lord";
    chron("c-found",
      `${sref(s)} is founded in ${s.region} by ${ref(founder)}, ${head} of the house, who wields ${aref(s.signatureArt)}.`,
      "major", [founder.id], [s.id]);
  }

  for (let i = 0; i < ri(3, 6); i++) {
    const f = makeFigure({ align: pick(["recluse","unorthodox","orthodox"]), realm: ri(1,3), age: ri(20,40) });
    STATE.figures.push(f);
  }

  chron("c-peace",
    `The Murim stirs awake. ${STATE.sects.length} great houses stand across the Gangho, and the rivers and lakes brim with ambition.`,
    "epic");
}
