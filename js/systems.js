import { rand, ri, pick, chance, clamp, cap } from './rng.js';
import { REGIONS, REALMS, REALM_KR, APEX, PATH_FLAVOR, WAR_NAMES, ALIGN, TERRAIN, REGION_TERRAIN, IMPERIAL_REGION, DOCTRINES, artAffinity, artCorruptType, polarityAffinity, TOURNEY_NAMES, RELIC_DEEDS, PERSONALITY_PRINCIPLE_BIAS, ART_PRINCIPLES, ART_COMMENTARY, ART_BRANCH_NAMES, LEGITIMACY_SOURCES, SECT_FACTIONS, LEGENDARY_TITLES, initTitleRef, SUCCESSION_TRADITIONS, GIVEN_MALE, GIVEN_FEMALE } from './data.js';
import { STATE, aliveFigs, aliveSects, figById, makeFigure, makeArt, makeSect, addToSect, recomputeLife, recomputePower, makeByeolho, regionByName, makeRelic, relicById } from './state.js';
import { chron, ref, plainRef, sref, aref, bref, rref, pro, proObj, proPoss } from './chronicle.js';
import {
  addGrudge, decayGrudges, bloodGrudges, dropGrudge, inheritGrudgesOnDeath,
  propagateTaintFrom, genDistance, makeChild, livingChildren
} from './bloodlines.js';
import {
  makeBloc, aliveBlocs, allianceBloc, cultBloc, sectBloc,
  blocLeader, blocSects, strongestIn, bestLeaderIn,
  addBlocGrudge, blocGrudgeAgainst
} from './factions.js';
import { eraIndex } from './metrics.js';

/* give the legendary title announce() closures access to the real ref() helper */
initTitleRef(f => ref(f));

/* nudge a sect's institutional authority, kept in bounds */
function legit(s, d) { if (s) s.legitimacy = clamp(s.legitimacy + d, 0, 100); }

/* gender of a new recruit, shaped by sect bias (but never absolute) */
function recruitGender(s) {
  const bias = s && s.recruitBias;
  if (bias === "female") return chance(.78) ? "female" : "male";
  if (bias === "male")   return chance(.78) ? "male"   : "female";
  return chance(.32) ? "female" : "male";          // default ~32% female
}

/* behavioral doctrine: head personality drives day-to-day conduct;
   fall back to founding doctrine only if the seat is empty */
function headDoc(s) {
  const head = s.headId ? figById(s.headId) : null;
  return (head && head.alive) ? DOCTRINES[head.personality] : DOCTRINES[s.doctrine];
}

/* era-aware contextual phrase for embedding in chronicle entries */
function eraTone() {
  const era = eraIndex();
  const pool = {
    calamity: ["as the Demon's shadow falls over all","while calamity grips the realm","beneath the Heavenly Demon's heel"],
    war:      ["as the realm tears itself apart","while war devours the sects","in this age of open blood"],
    decline:  ["in these hollowed years","while the old order withers","as greatness becomes memory"],
    golden:   ["in the height of a golden age","while the realm breathes easy","in days the songs will recall"],
    fraying:  ["as the great oath unravels","while the alliance splinters from within","in a time of spreading mistrust"],
    settled:  ["in the quiet between storms","while the realm holds its breath","as history gathers itself"]
  };
  return pick(pool[era.key] || pool.settled);
}

/* narrator voice: occasional commentary on the shape of the age */
export function sysEraCommentary() {
  if (!chance(.1)) return;
  const era = eraIndex();
  const sects = aliveSects();
  if (!sects.length) return;
  const pool = {
    calamity: [
      `The brush trembles as it writes: the Murim has not known such shadow since the forgotten ages. Of the ${sects.length} houses still standing, how many will see the Demon fall?`,
      `Even the Gangho has gone quiet. The Heavenly Demon has made fear into a kind of order — and order, of a kind, into law.`
    ],
    war:      [
      `${STATE.activeWars.length} war${STATE.activeWars.length > 1 ? 's burn' : ' burns'} at once. The roads between sects are measured in bodies now, and the neutrals grow fewer.`,
      `History accelerates in wartime. What takes a generation in peace takes a season in war — the rise, and the ruin, both.`
    ],
    decline:  [
      `A century of greatness leaves nothing behind that cannot be lost. The great houses age; the young find no masters worth the oath.`,
      `The martial world is quieter than it has been in living memory — not from peace, but from exhaustion. What was great has thinned.`
    ],
    golden:   [
      `The brush lingers over this season. The sects are at peace; the arts deepen; masters find worthy heirs. These are the years the songs will recall.`,
      `It will not last — it never does. But write it down: the Gangho hums with talent, and the sects hold one another in something like trust.`
    ],
    fraying:  [
      `The great oath holds — barely. Watch the eyes of the 맹주's own lieutenants. The knives are not yet drawn, but they are counted.`,
      `Unity is a story the sects tell each other. The real story is older: pride, power, and slights the great oath was supposed to make everyone forget.`
    ],
    settled:  [
      `Between upheavals, the smaller stories unfold: masters and students, feuds nursed across decades, arts refined in solitude. The chronicle writes them all.`,
      `A settled realm grows complacent — and complacency makes graves. But for now, the Gangho breathes, and no storm is visible on the horizon.`
    ]
  };
  chron("c-era", pick(pool[era.key] || pool.settled), "normal", [], []);
}

/* war, terror and famine bleed a region's people and order */
function scarRegion(r, popHit, stabHit) {
  if (!r) return;
  r.population = clamp(r.population - popHit, 0, 100);
  r.stability  = clamp(r.stability - stabHit, 0, 100);
  r.scarYear = STATE.year;
}

/* the calibre and temperament of disciples a sect's home region yields */
function recruitTraits(s) {
  const r = regionByName(s.region);
  const t = r ? TERRAIN[r.terrain] : null;
  const doc = DOCTRINES[s.doctrine];
  let lo = 15, hi = 72, drift = 0;
  if (t) {
    lo = t.talent[0]; hi = t.talent[1]; drift = t.drift;
    const pf = (r.prosperity - 50) / 50;
    lo = clamp(Math.round(lo + pf * 8), 8, hi - 5);
  }
  if (doc?.talentBonus) { lo = clamp(lo + doc.talentBonus, 8, 95); hi = clamp(hi + doc.talentBonus, lo + 5, 98); }
  return { talent: ri(lo, hi), drift };
}

export function maybeName(f, force, causes = []) {
  if (f.namedAt != null) return null;
  /* the charismatic win a name on thinner deeds; the colourless need more */
  const fameNeed = clamp(18 - (f.charisma || 0) / 10, 9, 18);
  if (force || (f.realm >= 3 && f.fame >= fameNeed)) {
    f.byeolho = makeByeolho();
    f.namedAt = STATE.year;
    return chron("c-rise",
      `${plainRef(f)}${f.sect ? " of " + f.sect.name + " (" + f.sect.kr + ")" : ""} has won renown across the land, now spoken of as <span class="nm">${cap(f.byeolho.en)} (${f.byeolho.kr})</span>.`,
      "major", [f.id], [], causes);
  }
  return null;
}

export function alignShift(f, amount, reason, causes = []) {
  const before = f.align;
  f.alignmentDrift = clamp(f.alignmentDrift + amount, 0, 100);
  let na;
  if (f.alignmentDrift >= 72) na = "demonic";
  else if (f.alignmentDrift >= 42) na = "unorthodox";
  else if (f.alignmentDrift <= 10 && f.align !== "recluse") na = "orthodox";
  else na = f.align;
  if (na !== before && f.align !== "recluse") {
    f.align = na;
    if (na === "demonic") {
      const ev = chron("c-corrupt",
        `${ref(f)} has fallen to the Demonic Path (마도)${reason ? " — " + reason : ""}. The energy about them turns cold and ravenous.`,
        "major", [f.id], [], causes);
      f.fallEvent = ev.id;
      /* a righteous house that harbours a fallen disciple carries the shame —
         and the ideological debt that one day demands purification */
      if (f.sect && f.sect.alive && (f.sect.align === "orthodox" || sectBloc(f.sect.id)?.type === "alliance")) {
        f.sect.doctrinalDebt += ri(8, 16);
        legit(f.sect, -ri(3, 7));
      }
    } else if (na === "unorthodox" && before === "orthodox") {
      if (f.sect && f.sect.alive && f.sect.align === "orthodox") f.sect.doctrinalDebt += ri(3, 7);
      chron("c-corrupt",
        `${ref(f)} forsakes the orthodox canon for unorthodox methods${reason ? " after " + reason : ""}.`,
        "normal", [f.id], [], causes);
    }
    recomputeLife(f);
  }
}

export function killFigure(f, why, causes = [], killerId = null, opts = {}) {
  f.alive = false; f.diedYear = STATE.year; f.killedBy = killerId;
  if (f.sect) { f.sect.members = f.sect.members.filter(id => id !== f.id); }
  if (f.art) f.art.holders = Math.max(0, f.art.holders - 1);
  passLegendaryTitleOnDeath(f);
  let deathEv = null;
  if (f.namedAt != null || f.realm >= 4) {
    const lvl = opts.level || (f.realm >= 6 ? "major" : "normal");
    const html = opts.html ||
      `${ref(f)}${f.sect ? " of " + f.sect.name : ""} ${why}. ${f.realm >= 6 ? "An age ends with them." : ""}`;
    deathEv = chron(opts.cls || "c-death", html, lvl, [f.id], [], causes);
    if (f.isThreat) {
      STATE.threatActive = false;
      STATE.lastThreatFall = deathEv.id;
      /* a Heavenly Demon is a generational calamity — the next is decades away */
      STATE.threatCooldownUntil = STATE.year + ri(25, 50);
      propagateTaintFrom(f);
      const peace = chron("c-peace",
        `With the fall of the Heavenly Demon, the Murim exhales. Yet ${aref(f.art)} was never recovered — and the taint lingers in the blood of their line.`,
        "major", [f.id], [], [deathEv.id]);
      if (f.art) {
        f.art.dormant = true; f.art.lostHolder = f.name; f.art.lostHolderId = f.id;
        f.art.lostEvent = peace.id;
      }
    }
    /* the slain pass their unsettled debts — and a new one against their killer — to their heirs */
    inheritGrudgesOnDeath(f, killerId, deathEv.id);
  }
  /* a relic does not die with its bearer — it is claimed, or it vanishes */
  passRelicsOnDeath(f, killerId, deathEv ? deathEv.id : null);
  return deathEv;
}

/* when a relic-bearer falls, their relic changes hands: to the killer if any,
   else to a worthy heir, else it is lost to the world until rediscovered */
function passRelicsOnDeath(f, killerId, deathEvId) {
  const held = STATE.relics.filter(r => !r.lost && r.holderId === f.id);
  for (const r of held) {
    const killer = killerId != null ? figById(killerId) : null;
    if (killer && killer.alive) {
      recordRelicDeed(r, killer, "was wrested from cooling hands", deathEvId);
      const ev = chron("c-relic",
        `${rref(r)} passes from the fallen ${plainRef(f)} into the grip of ${ref(killer)} — ${pick(["spoils of the victor","claimed atop the corpse","a prize bought in blood"])}.`,
        "major", [killer.id, f.id], [], deathEvId != null ? [deathEvId] : []);
      setRelicHolder(r, killer); r.history[r.history.length - 1].eventId = ev.id;
    } else {
      const heir = livingChildren(f).sort((a, b) => b.power - a.power)[0];
      if (heir && chance(.5)) {
        const ev = chron("c-relic",
          `${rref(r)} passes to ${ref(heir)}, heir to ${plainRef(f)} — the legacy unbroken.`,
          "normal", [heir.id, f.id], [], deathEvId != null ? [deathEvId] : []);
        setRelicHolder(r, heir);
        r.history.push({ year: STATE.year, holderId: heir.id, holderName: heir.name, deed: "was inherited", eventId: ev.id });
      } else {
        const ev = chron("c-relic",
          `With the death of ${plainRef(f)}, ${rref(r)} vanishes from the world — none know where it came to rest.`,
          "major", [f.id], [], deathEvId != null ? [deathEvId] : []);
        r.lost = true; r.lostYear = STATE.year; r.holderId = null;
        r.history.push({ year: STATE.year, holderId: null, holderName: null, deed: "vanished from the world", eventId: ev.id });
      }
    }
  }
}

export function setRelicHolder(r, f) {
  r.holderId = f ? f.id : null;
  r.holderName = f ? f.name : null;
  r.lost = false;
}
export function recordRelicDeed(r, f, deed, eventId) {
  r.history.push({ year: STATE.year, holderId: f ? f.id : null, holderName: f ? f.name : null, deed, eventId });
  if (f) setRelicHolder(r, f);
}

export function loseArt(a, why, causes = []) {
  a.lost = true; a.lostYear = STATE.year; a.holders = 0;
  const ev = chron("c-lost", `${aref(a)} is lost to time — ${why}.`, "normal", [], [], causes);
  a.lostEvent = ev.id;
  return ev;
}

export function dissolveSect(s, why, causes = []) {
  if (!s.alive) return null;
  s.alive = false; s.deadYear = STATE.year;
  const surv = s.members.map(figById).filter(x => x && x.alive);
  for (const f of surv) { f.sect = null; if (chance(.3) && f.align === "orthodox") f.align = "unorthodox"; }
  const ev = chron("c-fall",
    `${sref(s)} is ${why}; its disciples scatter into the Gangho, its halls left to the crows.`,
    "major", [], [s.id], causes);
  s.fallEvent = ev.id;
  if (s.signatureArt && s.signatureArt.holders <= 1 && chance(.5)) {
    loseArt(s.signatureArt, `buried in the ruin of ${s.name}`, [ev.id]);
    /* a sect's fall often means knowledge is only partially preserved */
    if (chance(.45) && s.signatureArt.founderPrinciples) {
      s.signatureArt.isFragment = true;
      const k = pick(ART_PRINCIPLES);
      /* the lost section's knowledge regresses toward uncertainty (50) */
      s.signatureArt.currentInterpretation[k] =
        Math.round((s.signatureArt.currentInterpretation[k] + 50) / 2);
    }
  }
  return ev;
}

export function sectMight(s) { return s.members.map(figById).filter(x => x && x.alive).reduce((t, f) => t + f.power, 0) + s.prestige * 5; }
export function topMember(s) { const m = s.members.map(figById).filter(x => x && x.alive).sort((a, b) => b.power - a.power); return m[0] || null; }
function warExists(a, b) { return STATE.activeWars.some(w => (w.a === a.id && w.b === b.id) || (w.a === b.id && w.b === a.id)); }

/* find the event behind a grudge that links any living member of A to any of B */
function grudgeCauseBetween(A, B) {
  const ma = A.members.map(figById).filter(x => x && x.alive);
  const mb = B.members.map(figById).filter(x => x && x.alive);
  const bSet = new Set(mb.map(f => f.id));
  const aSet = new Set(ma.map(f => f.id));
  for (const f of ma) {
    for (const tid of f.grudges) {
      if (bSet.has(tid) && f.grudgeCause[tid] != null) return f.grudgeCause[tid];
    }
  }
  for (const f of mb) {
    for (const tid of f.grudges) {
      if (aSet.has(tid) && f.grudgeCause[tid] != null) return f.grudgeCause[tid];
    }
  }
  return null;
}

function battle(A, B, pa, pb, w) {
  const winner = pa >= pb ? A : B, loser = pa >= pb ? B : A;
  const slayer = topMember(winner);
  const victims = loser.members.map(figById).filter(x => x && x.alive);
  const killP = clamp(0.6 + (headDoc(winner)?.killMod || 0), 0.1, 0.95);
  if (victims.length > 1 && chance(killP)) {
    const v = pick(victims.sort((x, y) => x.power - y.power).slice(0, Math.ceil(victims.length / 2)));
    if (v) killFigure(v, `falls in battle during ${w.name} (${w.kr})`, w.startEvent != null ? [w.startEvent] : [], slayer ? slayer.id : null);
  }
  const cA = topMember(winner), cB = topMember(loser);
  if (cA && cB && chance(.25)) {
    chron("c-duel",
      `At the height of ${w.name}, ${ref(cA)} crosses blades with ${ref(cB)} — ${pick(["a clash that splits the very air","three hundred exchanges beneath a bleeding moon","steel and naegong until the river ran red"])}.`,
      "normal", [cA.id, cB.id], [], w.startEvent != null ? [w.startEvent] : []);
  }
}

function endWar(w, A, B, winner, loser) {
  STATE.activeWars = STATE.activeWars.filter(x => x !== w);
  if (A) A.atWarWith = A.atWarWith.filter(id => !B || id !== B.id);
  if (B) B.atWarWith = B.atWarWith.filter(id => !A || id !== A.id);
  if (winner && loser) {
    winner.prestige += ri(8, 18); loser.prestige -= ri(15, 30);
    legit(winner, ri(4, 9)); legit(loser, -ri(6, 12));   // victory is its own claim to authority
    /* war scars the land it is fought over — population and order both bleed */
    for (const s of [winner, loser]) scarRegion(regionByName(s.region), ri(8, 16), ri(6, 12), w.startEvent);
    const ev = chron("c-war",
      `${w.name} (${w.kr}) ends. ${sref(winner)} stands victorious; ${sref(loser)} is broken and humbled.`,
      "major", [], [winner.id, loser.id], w.startEvent != null ? [w.startEvent] : []);
    if (loser.prestige <= 8 || chance(.4)) dissolveSect(loser, `shattered in ${w.name}`, [ev.id]);
  }
}

/* ---- tick systems ---- */

export function sysCultivation() {
  for (const f of aliveFigs()) {
    if (f.realm >= APEX) { f.progress = 100; continue; }
    let gain = (f.talent / 30) + rand() * 4;
    if (f.align === "demonic") gain *= 1.25;
    if (f.align === "recluse") gain *= 0.8;
    if (f.sect) gain *= 1.1;
    /* affinity with the art shapes cultivation speed */
    if (f.art) {
      const aff = artAffinity(f, f.art);
      if (aff === "natural")   gain *= 1.18;
      else if (aff === "resistant") gain *= 0.78;
      /* yin/yang polarity: cultural friction, not biological ceiling */
      gain *= polarityAffinity(f, f.art);
    }
    f.progress += gain;
    if (f.progress >= 100) {
      f.progress = 0; f.realm++;
      f.realmHistory.push({ year: STATE.year, realm: f.realm });
      recomputeLife(f); recomputePower(f);
      f.fame += 3 + f.realm;
      const fl = PATH_FLAVOR[f.align];
      /* notability gate: an anonymous disciple's minor breakthrough is not worth
         recording. Log only when the figure is someone the Murim watches — a sect
         head, a named master, the bearer of a blood grudge — or when the realm
         reached is genuinely rare (Form Realm 화경, index 5, and above). */
      const isHead    = f.sect && f.sect.headId === f.id;
      const isNamed   = !!f.byeolho;
      const hasGrudge = (f.grudges && f.grudges.length > 0);
      const rareRealm = f.realm >= 5;
      const notable   = isHead || isNamed || hasGrudge || rareRealm;
      if (f.realm >= 3 && notable) {
        const lvl = f.realm >= 6 ? "major" : "normal";
        chron("c-break",
          `${ref(f)} ${fl.verb} the realm of <b style="color:var(--gold)">${REALMS[f.realm]} (${REALM_KR[f.realm]})</b>, ${pick(fl.via)}.`,
          lvl, [f.id]);
      }
      maybeName(f);
      if (f.realm === APEX) {
        chron("c-break",
          `Heaven itself takes notice: ${ref(f)} has touched the <b style="color:var(--gold-bright)">Nature Realm (자연경)</b>, the apex no mortal is meant to reach.`,
          "epic", [f.id]);
      }
    }
  }
}

export function sysFame() {
  for (const f of aliveFigs()) {
    if (chance(.04)) { f.fame += rand() * 2 * (1 + (f.charisma || 0) / 120); maybeName(f); }
  }
}

export function sysAging() {
  for (const f of aliveFigs()) {
    f.age++;
    const over = f.age - f.lifespan;
    let deathP = over > 0 ? 0.18 + over * 0.05 : (f.age > f.lifespan - 10 ? 0.02 : 0.004);
    if (f.align === "demonic") deathP += 0.01;
    if (chance(deathP)) killFigure(f, "passes from the world, their naegong returning to heaven and earth");
  }
}

export function sysRecruitment() {
  for (const s of aliveSects()) {
    const living = s.members.map(figById).filter(x => x && x.alive);
    const r = regionByName(s.region);
    /* a house mid-succession-crisis cannot attract disciples — who would swear
       to a seat no one yet holds? */
    const crisisMul = s.succession ? 0.3 : 1;
    const recruitP = clamp((0.18 + (r ? r.prosperity / 250 : 0.14)) * crisisMul, 0.04, 0.6);
    if (living.length < 3) {
      for (let i = 0; i < ri(1, 2); i++) {
        const tr = recruitTraits(s);
        const gender = recruitGender(s);
        const f = makeFigure({ align: s.align, sect: s, art: s.signatureArt, realm: 0, age: ri(13,18), talent: tr.talent, gender });
        if (tr.drift) f.alignmentDrift = clamp(f.alignmentDrift + tr.drift, 0, 100);
        addToSect(s, f); STATE.figures.push(f);
        if (s.signatureArt) s.signatureArt.holders++;
      }
    } else if (chance(recruitP) && living.length < 14) {
      const master = pick(living.filter(x => x.realm >= 3)) || pick(living);
      const tr = recruitTraits(s);
      const gender = recruitGender(s);
      const f = makeFigure({ align: s.align, sect: s, art: s.signatureArt, realm: 0, age: ri(12,17), talent: tr.talent, master: master ? master.id : null, gender });
      if (tr.drift) f.alignmentDrift = clamp(f.alignmentDrift + tr.drift, 0, 100);
      addToSect(s, f); STATE.figures.push(f);
      if (s.signatureArt) s.signatureArt.holders++;
      if (f.talent >= 68) {
        chron("c-lineage",
          `A prodigy named ${plainRef(f)} is taken in by ${sref(s)}; the elders whisper of a rare innate root.`,
          "normal", [f.id], [s.id]);
      }
    }
  }
}

/* ---- art evolution: interpretation drift, commentary, branches ---- */

/* recompute how far a tradition's current practice is from its founder's intent */
function artDeviationScore(a) {
  if (!a.founderPrinciples || !a.currentInterpretation) return 0;
  const total = ART_PRINCIPLES.reduce(
    (t, k) => t + Math.abs((a.currentInterpretation[k] ?? 50) - (a.founderPrinciples[k] ?? 50)), 0);
  return clamp(Math.round(total / ART_PRINCIPLES.length), 0, 100);
}

/* fork a new lineage branch from a parent art, seeded by the current interpretation */
function spawnVariant(parentArt, founder, causeId = null) {
  const branchLabel = pick(ART_BRANCH_NAMES);
  /* the variant's alignment can slip if the practice has already darkened enough */
  let variantAlign = parentArt.align;
  if (parentArt.deviationScore > 60) {
    const ci = parentArt.currentInterpretation;
    if (parentArt.align === "orthodox"   && ci.aggression > 65 && ci.mercy < 25) variantAlign = "unorthodox";
    if (parentArt.align === "unorthodox" && ci.aggression > 78 && ci.mercy < 15) variantAlign = "demonic";
  }
  const variant = makeArt(variantAlign);
  variant.name = branchLabel[0] + " " + parentArt.name;
  variant.kr   = branchLabel[1] + parentArt.kr;
  /* the branch's founderPrinciples are the parent's current interpretation —
     this generation's deviation becomes the next generation's orthodoxy */
  variant.founderPrinciples      = { ...parentArt.currentInterpretation };
  variant.currentInterpretation  = { ...parentArt.currentInterpretation };
  variant.deviationScore = 0;
  variant.parentId = parentArt.id;
  variant.lastVariantAt = STATE.year;
  variant.tier = Math.max(1, parentArt.tier + ri(-1, 1));
  variant.holders = 1;
  parentArt.holders = Math.max(0, parentArt.holders - 1);
  parentArt.lastVariantAt = STATE.year;
  founder.art = variant;
  STATE.arts.push(variant);
  const causes = causeId != null ? [causeId] : [];
  chron("c-art",
    `${ref(founder)}'s interpretation of ${aref(parentArt)} has diverged enough to stand as its own lineage — henceforth called <em class="art">${variant.name} (${variant.kr})</em>. The original tradition now carries a branch.`,
    "major", [founder.id], [], causes);
  return variant;
}

export function sysArtEvolution() {
  for (const a of STATE.arts) {
    if (a.lost || a.dormant || !a.founderPrinciples || !a.currentInterpretation) continue;

    const holders = aliveFigs().filter(f => f.art === a);
    if (!holders.length) continue;

    /* aggregate personality pressure from every living practitioner */
    const pressure = Object.fromEntries(ART_PRINCIPLES.map(k => [k, 0]));
    for (const f of holders) {
      const bias = PERSONALITY_PRINCIPLE_BIAS[f.personality];
      if (!bias) continue;
      for (const k of ART_PRINCIPLES) pressure[k] += (bias[k] || 0);
    }

    /* apply a small nudge per year; stored as float to avoid rounding to zero.
       normalise by sqrt(holders) so large diverse sects drift slightly faster than
       a lone practitioner, but not proportionally — one strong master shapes a
       tradition more than a hundred mediocre disciples. */
    for (const k of ART_PRINCIPLES) {
      const norm     = Math.sqrt(Math.max(1, holders.length));
      const nudge    = (pressure[k] / norm) * 0.15;
      const restoring = (a.founderPrinciples[k] - a.currentInterpretation[k]) * 0.02;
      a.currentInterpretation[k] = clamp(a.currentInterpretation[k] + nudge + restoring, 0, 100);
    }
    a.deviationScore = artDeviationScore(a);

    /* commentary: written when a notable practitioner witnesses a clear drift.
       Threshold kept low (12) so drift is visible early; min 14-year gap to avoid
       flooding. Only fires when the art hasn't recently spawned a variant. */
    if (a.deviationScore >= 12 && STATE.year - a.lastCommentaryAt >= 14 &&
        STATE.year - a.lastVariantAt >= 4) {
      const notable = holders.filter(f => f.realm >= 4 || f.namedAt != null);
      /* prefer a named master but allow any notable — single authorship is boring */
      const author = notable.length
        ? (chance(.65) ? notable.sort((a,b) => b.realm - a.realm)[0] : pick(notable))
        : (chance(.35) ? pick(holders) : null);
      if (author) {
        const drifts = ART_PRINCIPLES
          .map(k => ({ k, d: a.currentInterpretation[k] - a.founderPrinciples[k] }))
          .sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
        const top = drifts[0];
        const dir = top.d > 0 ? "_up" : "_down";
        const pool = ART_COMMENTARY[top.k + dir] || ART_COMMENTARY.aggression_up;
        const text = pick(pool);
        const milestone = a.deviationScore >= 50 ? "major" : "normal";
        a.commentaries.push({ year: STATE.year, authorId: author.id, authorName: author.name, text, milestone });
        a.lastCommentaryAt = STATE.year;
        chron("c-art-commentary",
          `${ref(author)} adds a commentary to ${aref(a)}: <em class="ac-inline">"${text}"</em>`,
          milestone, [author.id], []);

        /* a heavily diverged master may declare their interpretation its own tradition —
           but only when the art hasn't branched recently (30-year cooldown per art) */
        if (a.deviationScore >= 50 && author.realm >= 5 && chance(.18) &&
            STATE.year - a.lastVariantAt >= 30) {
          spawnVariant(a, author);
        }
      }
    }

    /* breakthrough: resistant high-talent practitioner discovers something through
       opposition. Very rare (0.6%/year) and requires a 35-year cooldown on the art
       to prevent cascade chains of variants spawning from variants. */
    if (chance(.006) && STATE.year - a.lastVariantAt >= 35) {
      const resistant = holders.filter(
        f => artAffinity(f, a) === "resistant" && f.talent >= 66 && f.realm >= 4);
      if (resistant.length) {
        const genius = pick(resistant);
        const ev = chron("c-art-breakthrough",
          `${ref(genius)}, who struggled for years against the grain of ${aref(a)}, has found an unexpected resonance — mastering the art through resistance rather than harmony. A new branch is born from the friction.`,
          "major", [genius.id], []);
        spawnVariant(a, genius, ev.id);
      }
    }
  }
}

export function sysArtRefinement() {
  for (const a of STATE.arts) {
    if (a.lost || a.dormant) continue;
    const masters = aliveFigs().filter(f => f.art === a && f.realm >= 5);
    const artBonus = masters.reduce((mx, m) => Math.max(mx, DOCTRINES[m.sect?.doctrine]?.artBonus || 0), 0);
    if (masters.length && chance(.12 + artBonus) && a.tier < 9) {
      a.tier++;
      const m = pick(masters);
      const ord = ["","first","second","third","fourth","fifth","sixth","seventh","eighth","ninth"][a.tier];
      chron("c-art",
        `${ref(m)} comprehends a higher layer of ${aref(a)}, refining it to its ${ord} stratum.`,
        a.tier >= 7 ? "major" : "normal", [m.id]);
    }
  }
}

export function sysRivalryAndWar() {
  const sects = aliveSects();
  for (const w of [...STATE.activeWars]) {
    w.years++;
    const A = STATE.sects.find(s => s.id === w.a), B = STATE.sects.find(s => s.id === w.b);
    if (!A || !B || !A.alive || !B.alive) { endWar(w, A, B); continue; }
    const pa = sectMight(A), pb = sectMight(B);
    if (chance(.5)) battle(A, B, pa, pb, w);
    if (w.years >= 2 && (chance(.3) || Math.abs(pa - pb) > pa * 0.6)) {
      const winner = pa >= pb ? A : B, loser = pa >= pb ? B : A;
      endWar(w, A, B, winner, loser);
    }
  }
  if (sects.length >= 2 && STATE.activeWars.length < 2) {
    const a = pick(sects); let b = pick(sects); let g = 0; while (b === a && g++ < 5) b = pick(sects);
    if (a !== b && !warExists(a, b)) {
      const enemyPaths = (a.align === "demonic" && b.align === "orthodox") || (a.align === "orthodox" && b.align === "demonic");
      const aHead = headDoc(a), bHead = headDoc(b);
      const warP = 0.22 + (aHead?.warMod || 0) + (bHead?.warMod || 0) * 0.5;
      if (enemyPaths || chance(warP)) {
        const wn = pick(WAR_NAMES);
        const w = { a: a.id, b: b.id, name: wn[0], kr: wn[1], years: 0, start: STATE.year, startEvent: null };
        STATE.activeWars.push(w);
        a.atWarWith.push(b.id); b.atWarWith.push(a.id);
        const grudgeEv = grudgeCauseBetween(a, b);
        const cause = grudgeEv != null ? "a feud long left to fester" :
          enemyPaths ? "the orthodox cannot abide the demonic" :
          pick(["a stolen manual","an assassinated elder","a contested mountain","an old blood-debt","a marriage betrayed","a duel gone wrong"]);
        const eraSuffix = STATE.activeWars.length >= 2 ? `, ${eraTone()}` : '';
        const warLine = aHead?.warVerb
          ? `${sref(a)} ${aHead.warVerb} ${sref(b)} — ${w.name} (${w.kr}) — over ${cause}${eraSuffix}.`
          : `${pick(["Banners rise","War drums sound","Blood is sworn"])}: ${sref(a)} and ${sref(b)} fall into open war — ${w.name} (${w.kr}) — over ${cause}${eraSuffix}.`;
        const ev = chron("c-war", warLine, "major", [], [a.id, b.id], grudgeEv != null ? [grudgeEv] : []);
        w.startEvent = ev.id;
      }
    }
  }
}

export function sysCorruptionAndThreat() {
  for (const f of aliveFigs()) {
    if (f.align !== "recluse") {
      let drift = 0;
      const causes = [];

      /* art corruption: demonic arts always corrupt; unorthodox arts only corrupt
         the susceptible (resistant personalities suffer more, naturals less) */
      if (f.art) {
        const ct = artCorruptType(f.art);
        const aff = artAffinity(f, f.art);
        if (f.art.cursed) {
          /* a cursed art corrupts EVERY holder, passively and relentlessly —
             personality and affinity grant no protection */
          drift += 1.0 + rand() * 1.4;
          if (f.originEvent != null) causes.push(f.originEvent);
          else if (f.art.lostEvent != null) causes.push(f.art.lostEvent);
        } else if (ct === "always") {
          /* demonic arts are inherently corruptive — resistance slows but never stops */
          const base = rand() * 1.6;
          drift += aff === "resistant" ? base * 0.6 : aff === "natural" ? base * 1.3 : base;
          if (f.originEvent != null) causes.push(f.originEvent);
          else if (f.art.lostEvent != null) causes.push(f.art.lostEvent);
        } else if (ct === "conditional" && aff === "resistant") {
          /* unorthodox art in resistant hands: the friction itself corrupts */
          drift += rand() * 0.9;
          if (f.originEvent != null) causes.push(f.originEvent);
        }
        /* orthodox/recluse arts: no corruption from the art itself */
      }

      if (f.grudges.length) {
        drift += rand() * 1.2;
        for (const tid of f.grudges) { if (f.grudgeCause[tid] != null) { causes.push(f.grudgeCause[tid]); break; } }
      }
      if (STATE.activeWars.length) drift += rand() * 0.6;
      if (drift > 0) alignShift(f, drift, null, causes);

      /* mastery ceiling: resistant figures plateau earlier — past realm 6 progress halves */
      if (f.art && f.realm >= 6 && artAffinity(f, f.art) === "resistant") {
        f.progress = Math.min(f.progress, 70);
      }

      /* chronicle the struggle when a resistant figure persists with a corruptive art */
      if (f.art && artCorruptType(f.art) === "always" && artAffinity(f, f.art) === "resistant"
          && f.alignmentDrift >= 45 && f.alignmentDrift < 48 && chance(.35)) {
        chron("c-corruption",
          `The ${f.art.name} (${f.art.kr}) does not fit ${ref(f)} — yet ${pick(["they refuse to lay it down","the art has already taken root","pride will not let them stop"])}. The meridians ache; the mind darkens.`,
          "normal", [f.id], [], f.originEvent != null ? [f.originEvent] : []);
      }
      /* chronicle the harmony when a natural figure and their art become one */
      if (f.art && artAffinity(f, f.art) === "natural" && f.realm === 5 && f.progress < 5 && chance(.25)) {
        chron("c-affinity",
          `${ref(f)} and the ${f.art.name} (${f.art.kr}) have grown inseparable — the art no longer feels like a manual to be memorised, but a second nature.`,
          "normal", [f.id], [], []);
      }
      /* a cultivator who overcame polarity friction becomes notable for it */
      if (f.art && f.realm === 5 && f.progress < 5 && polarityAffinity(f, f.art) < 1.0) {
        f.fame += 6;
        chron("c-affinity",
          `The Murim takes notice: ${ref(f)} has reached ${REALMS[5]} (${REALM_KR[5]}) in the ${f.art.name} (${f.art.kr}) — an art whose ${f.art.polarity === "yang" ? "yang fire" : "yin depth"} ${proPoss(f)} nature was said to resist. ${f.gender === "female" && f.art.polarity === "yang" ? "The elders who doubted her fall silent." : "Talent proves stronger than tradition."}`,
          "major", [f.id], [], []);
      }
    }
    if (!STATE.threatActive && STATE.year >= STATE.threatCooldownUntil && f.align === "demonic" && f.realm >= 7 && f.alignmentDrift >= 85 && chance(.4)) {
      f.isThreat = true; STATE.threatActive = true;
      /* the demon becomes the wellspring of a taint that will run in their blood */
      if (f.taintSource == null) { f.bloodlineTaint = 100; f.taintSource = f.id; }
      propagateTaintFrom(f);
      maybeName(f);
      const ev = chron("c-threat",
        `A shadow falls over all under heaven: ${ref(f)} ascends as the <b style="color:var(--blood)">Heavenly Demon (천마)</b> and declares the old order finished. ${f.lineage ? `Heir to ${f.lineage}, ` : ""}the Murim trembles.`,
        "epic", [f.id], [], f.fallEvent != null ? [f.fallEvent] : []);
      f.ascendEvent = ev.id;
    }
  }
  if (STATE.threatActive) {
    const threat = aliveFigs().find(f => f.isThreat);
    if (threat && chance(.35)) {
      const heroes = aliveFigs().filter(f => f.align !== "demonic" && f.realm >= 5 && f !== threat);
      if (heroes.length >= 2) {
        const champ = heroes.sort((a, b) => b.power - a.power)[0];
        const threatCause = threat.ascendEvent != null ? [threat.ascendEvent] : [];
        if (champ.power > threat.power * 0.85 && chance(.5)) {
          const death = killFigure(threat, `is at last cut down by ${champ.byeolho ? cap(champ.byeolho.en) : champ.name} and the orthodox alliance (무림맹)`, threatCause, champ.id);
          champ.fame += 20; champ.charisma = clamp(champ.charisma + ri(4, 10), 0, 100);
          legit(champ.sect, ri(10, 20));
          const ab = allianceBloc(); if (ab) ab.legitimacy = clamp(ab.legitimacy + ri(8, 16), 0, 100);
          maybeName(champ);
          chron("c-rise",
            `${ref(champ)} is hailed across the Murim as the hero who slew the Heavenly Demon.`,
            "major", [champ.id], [], death ? [death.id] : []);
        } else {
          killFigure(champ, `is slain confronting the Heavenly Demon`, threatCause, threat.id);
        }
      }
    }
  }
}

export function sysLostAndFound() {
  for (const a of STATE.arts) {
    if (!a.lost && !a.dormant && a.holders <= 0 && chance(.5)) {
      loseArt(a, "its last practitioner dead, the manual mislaid");
    }
  }
  const lost = STATE.arts.filter(a => a.lost || a.dormant);
  if (lost.length && chance(.14)) {
    const a = pick(lost);
    const arch = pick([
      { n: "a destitute beggar",      t: ri(70,95) },
      { n: "an orphaned woodcutter",  t: ri(65,90) },
      { n: "a disgraced servant",     t: ri(60,88) },
      { n: "a wandering mute child",  t: ri(72,96) },
      { n: "a condemned prisoner",    t: ri(60,85) }
    ]);
    const prevHolderId = a.lostHolderId;
    const lostEv = a.lostEvent;
    const wasDormant = a.dormant;
    const f = makeFigure({ align: a.dormant ? "demonic" : (a.align === "demonic" ? "unorthodox" : a.align), realm: 1, age: ri(15,24), talent: arch.t, art: a });
    a.lost = false; a.dormant = false; a.holders = 1;
    if (a.lostHolder) { f.lineage = a.lostHolder + "'s legacy"; f.lineageId = prevHolderId; }
    STATE.figures.push(f);
    const found = chron("c-found2",
      `In ${pick(REGIONS)}, ${arch.n} named ${plainRef(f)} stumbles upon ${aref(a)}, lost ${STATE.year - (a.lostYear || a.origin)} years. Fate chooses strangely.`,
      "major", [f.id], [], lostEv != null ? [lostEv] : []);
    f.originEvent = found.id;
    /* arts recovered after dormancy in demonic hands arrive with the lineage darkened:
       whoever practised it in the vaults left their interpretation behind */
    if (wasDormant && a.founderPrinciples) {
      a.currentInterpretation.aggression = clamp((a.currentInterpretation.aggression || 50) + ri(10, 25), 0, 100);
      a.currentInterpretation.mercy      = clamp((a.currentInterpretation.mercy      || 50) - ri(10, 18), 0, 100);
      a.deviationScore = artDeviationScore(a);
    }
    /* a fragment is reconstructed imperfectly — missing sections create noise */
    if (a.isFragment && a.founderPrinciples) {
      for (const k of ART_PRINCIPLES) {
        a.currentInterpretation[k] = clamp((a.currentInterpretation[k] || 50) + ri(-18, 18), 0, 100);
      }
      a.isRestoration = true;
      a.deviationScore = artDeviationScore(a);
      chron("c-art",
        `${aref(a)}, recovered after ${STATE.year - (a.lostYear || a.origin)} years, is imperfectly restored — the lost sections were reconstructed from memory and hearsay. Some knowledge may be changed. Some may be wrong.`,
        "normal", [f.id], [], [found.id]);
    }
    if (wasDormant || a.align === "demonic") {
      chron("c-corrupt",
        `The manual ${a.isRestoration ? 'was pieced together from fragments' : 'is steeped in old malice'}. Those who hear of it fear what ${plainRef(f)} may become.`,
        "normal", [f.id], [], [found.id]);
    }
  }
}

export function sysSectFortune() {
  for (const s of aliveSects()) {
    s.prestige = clamp(s.prestige + (rand() - 0.45) * 4, 0, 100);
    s.legitimacy = clamp(s.legitimacy + (50 - s.legitimacy) * 0.01, 0, 100);   // authority drifts toward the mean
    if (s.prestige <= 4 && chance(.5)) dissolveSect(s, "withered into obscurity, its halls left empty");
  }
  if (aliveSects().length < 7 && chance(.16)) {
    const wanderers = aliveFigs().filter(f => !f.sect && f.realm >= 5);
    if (wanderers.length) {
      const founder = pick(wanderers);
      const s = makeSect({ align: founder.align, prestige: ri(30,50) });
      s.signatureArt = founder.art || pick(STATE.arts.filter(a => !a.lost)) || null;
      founder.sect = s;
      s.headId = founder.id; s.founderId = founder.id; s.founderClan = founder.clan || null;
      addToSect(s, founder);
      STATE.sects.push(s);
      maybeName(founder, true);
      chron("c-found",
        `From the ashes, ${ref(founder)} establishes ${sref(s)} in ${s.region}. A new power rises where the old fell.`,
        "major", [founder.id], [s.id], founder.originEvent != null ? [founder.originEvent] : []);
    }
  }
}

export function sysHeroicArcs() {
  if (chance(.18)) {
    const figs = aliveFigs().filter(f => f.realm >= 3);
    if (figs.length >= 2) {
      const a = pick(figs); let b = pick(figs); let g = 0; while (b === a && g++ < 4) b = pick(figs);
      if (a !== b) {
        /* choose bond text based on genders */
        const bothMale   = a.gender === "male"   && b.gender === "male";
        const bothFemale = a.gender === "female"  && b.gender === "female";
        const bondLabel  = bothFemale ? "sisterhood" : bothMale ? "brotherhood" : "a sworn bond";
        const bondFlower = bothFemale ? "the plum blossoms" : "the peach blossoms";
        const arc = pick([
          { cls: "c-peace",   kind: "brother",  fn: () => `${ref(a)} and ${ref(b)} swear ${bondLabel} beneath ${bondFlower}, vowing to share fortune and ruin alike.` },
          { cls: "c-duel",    kind: "duel",     fn: () => `A bitter duel: ${ref(a)} defeats ${ref(b)} atop ${pick(["Sword-Testing Cliff","the Frozen Pavilion","Lone Goose Peak","the Drunken Bridge"])}, sparing ${proObj(b)} life — and earning a lifelong grudge.` },
          { cls: "c-lineage", kind: "betray",   fn: () => `${ref(b)} betrays ${ref(a)}, stealing a page of ${proPoss(a)} manual under the new moon.` },
          { cls: "c-lineage", kind: "disciple", fn: () => `${ref(a)} takes ${ref(b)} as a sworn disciple, passing down hard-won insight.` },
          { cls: "c-peace",   kind: "romance",  fn: () => `Rumour spreads that ${ref(a)} has fallen in love with ${ref(b)} — a romance the sects forbid.` }
        ]);
        const html = arc.fn();
        const ev = chron(arc.cls, html, "normal", [a.id, b.id]);
        /* wire relationships, recording the event that birthed each grudge so wars can trace back to it */
        if (arc.kind === "brother") { a.brothers.push(b.id); b.brothers.push(a.id); }
        else if (arc.kind === "betray")  { addGrudge(a, b.id, { event: ev.id }); }
        else if (arc.kind === "duel")    { addGrudge(b, a.id, { event: ev.id }); }
      }
    }
  }
}

/* ---- bloodlines & bonds ---- */

const ALIGN_OK = (x, y) => !((x === "orthodox" && y === "demonic") || (x === "demonic" && y === "orthodox"));
const shareParent = (a, b) => a.parents.some(p => b.parents.includes(p));

export function sysBonds() {
  const eligible = aliveFigs().filter(f => f.spouse == null && f.align !== "recluse" && f.age >= 18 && f.age <= 55 && f.realm >= 1);
  if (eligible.length < 2) return;
  for (let i = 0; i < ri(1, 2); i++) {
    if (!chance(.5)) continue;
    const a = pick(eligible);
    if (a.spouse != null) continue;
    const cand = eligible.filter(b =>
      b !== a && b.spouse == null &&
      Math.abs(b.age - a.age) <= 18 &&
      !a.parents.includes(b.id) && !b.parents.includes(a.id) &&
      !shareParent(a, b) &&
      b.gender !== a.gender &&           // traditional marriage pairing
      ALIGN_OK(a.align, b.align));
    if (!cand.length) continue;
    /* a match within a clan, or that marries into one, is favoured — dynasties seek dynasties */
    const clanPref = cand.filter(b => (a.clan && b.clan) || b.clan);
    const b = pick(clanPref.length && chance(.6) ? clanPref : cand);
    a.spouse = b.id; b.spouse = a.id;
    /* a marriage between two houses of the same bloc cements the alliance */
    const ba = a.sect ? sectBloc(a.sect.id) : null;
    const bb = b.sect ? sectBloc(b.sect.id) : null;
    const stateMatch = ba && bb && ba.id === bb.id && a.sect.id !== b.sect.id;
    if (stateMatch) ba.cohesion = clamp(ba.cohesion + ri(3, 8), 0, 100);
    /* a 사파 house that marries into an orthodox line within the alliance
       takes a long step toward becoming orthodox in truth */
    if (stateMatch && ba.type === "alliance") {
      for (const [m, other] of [[a, b], [b, a]]) {
        if (m.sect && m.sect.align === "unorthodox" && other.sect && other.sect.align === "orthodox") {
          m.sect.marriedOrthodox = true;
          m.sect.stance = clamp(m.sect.stance + ri(4, 10), -100, 100);
        }
      }
    }
    /* identify the bride and groom for pronoun-aware text */
    const bride  = a.gender === "female" ? a : b;
    const groom  = a.gender === "female" ? b : a;

    /* diplomatic marriage: sects in different blocs (or no bloc) — forges a new tie */
    const crossBloc = a.sect && b.sect && a.sect.id !== b.sect.id && (!ba || !bb || ba.id !== bb.id);
    if (crossBloc && (a.clan || b.clan || a.namedAt != null || b.namedAt != null) && chance(.55)) {
      /* boost relations between both sects — may nudge toward alliance later */
      a.sect.stance = clamp((a.sect.stance || 0) + ri(3, 8), -100, 100);
      b.sect.stance = clamp((b.sect.stance || 0) + ri(3, 8), -100, 100);
      legit(a.sect, ri(2, 5)); legit(b.sect, ri(2, 5));
      const brideRole = bride.clan ? `of the ${bride.clan}세가` : "";
      chron("c-bond",
        `${ref(bride)}${brideRole ? " " + brideRole : ""} and ${ref(groom)} are wed — a diplomatic union crossing house lines, binding ${sref(a.sect)} to ${sref(b.sect)} by blood.`,
        "major", [a.id, b.id], [a.sect.id, b.sect.id]);
    } else if (a.namedAt != null || b.namedAt != null || a.clan || b.clan || stateMatch) {
      let line = "";
      if (stateMatch) {
        const brideRole = bride.sect && bride.sect.headId === bride.id ? "장문인" : (bride.clan ? `daughter of the ${bride.clan}세가` : "emissary");
        line = ` — a marriage of state (정략혼): ${ref(bride)}, ${brideRole}, goes to ${sref(groom.sect || bride.sect)} to seal the alliance. ${bref(ba)} draws tighter.`;
      } else if (bride.clan || groom.clan) {
        line = ` — a union binding the ${bride.clan || groom.clan} (${(bride.clan||groom.clan)}세가) line`;
      }
      chron("c-bond",
        `${ref(bride)} and ${ref(groom)} are wed${line}.`,
        stateMatch ? "major" : "normal", [a.id, b.id]);
    }
  }
}

export function sysProcreation() {
  for (const f of aliveFigs()) {
    if (f.spouse == null || f.id > f.spouse) continue;     // one pass per couple
    const sp = figById(f.spouse);
    if (!sp || !sp.alive) continue;
    if (f.age < 18 || f.age > 50 || sp.age < 18 || sp.age > 50) continue;
    const shared = f.children.filter(cid => sp.children.includes(cid)).length;
    if (shared >= 3 || !chance(.22)) continue;
    const child = makeChild(f, sp);
    if (child.clan || child.talent >= 82) {
      const note = child.clan ? `, born into the ${child.clan} (${child.clan}세가) line` :
        child.talent >= 90 ? `, said to carry a once-in-an-age root` : `, a child of rare promise`;
      chron("c-birth", `${plainRef(child)} is born to ${ref(f)} and ${ref(sp)}${note}.`, "normal", [child.id, f.id, sp.id]);
    }
  }
}

export function sysVengeance() {
  for (const f of aliveFigs()) {
    if (f.realm < 4) continue;
    const targets = bloodGrudges(f).map(figById).filter(t => t && t.alive);
    if (!targets.length || !chance(.12)) continue;
    const t = pick(targets);
    if (f.power >= t.power * 0.8 && chance(.6)) {
      const meta = f.grudgeMeta[t.id];
      const cause = meta && meta.event != null ? [meta.event] : [];
      const yearsAgo = STATE.year - (meta ? meta.born : STATE.year);
      const originEv = meta && meta.event != null ? STATE.eventIndex.get(meta.event) : null;
      const originRef = originEv
        ? `, a blood debt born in Year ${originEv.year}`
        : (yearsAgo > 0 ? `, a debt ${yearsAgo} years in the making` : '');
      const html = `${ref(f)} hunts down ${ref(t)} at last${originRef} — paid in full in steel. The chronicle closes a chapter the brush has kept open since Year ${originEv ? originEv.year : (STATE.year - yearsAgo)}.`;
      killFigure(t, "", cause, f.id, { cls: "c-vengeance", html, level: "major" });
      dropGrudge(f, t.id);
      f.fame += 8;
    }
  }
}

function genWord(d) {
  return ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"][d] || (d + "th");
}

export function sysBloodlineAwakening() {
  for (const f of aliveFigs()) {
    if (f.awakened || f.taintSource == null || f.bloodlineTaint < 35 || f.realm < 4) continue;
    const ancestor = figById(f.taintSource);
    if (!ancestor || ancestor.alive) continue;
    if (ancestor.diedYear == null || ancestor.diedYear > f.born) continue;  // they could have known them — not the arc
    const dist = genDistance(f, ancestor.id);
    if (dist < 3) continue;                                                 // great-grandchild or deeper
    if (!chance(0.05 + f.bloodlineTaint / 700)) continue;

    f.awakened = true;
    f.align = "demonic";
    f.alignmentDrift = clamp(Math.max(f.alignmentDrift, 82), 0, 100);
    let artNote = "";
    if (ancestor.art) {
      const art = ancestor.art;
      if (art.lost || art.dormant) { art.lost = false; art.dormant = false; }
      art.holders++;
      f.art = art;
      f.lineage = (ancestor.byeolho ? cap(ancestor.byeolho.en) : ancestor.name) + "'s blood";
      f.lineageId = ancestor.id;
      artNote = ` The ${art.name} (${art.kr}) wakes in their meridians as though it never slept.`;
    }
    recomputeLife(f); recomputePower(f);
    const aName = ancestor.byeolho ? `${cap(ancestor.byeolho.en)} (${ancestor.byeolho.kr})` : ancestor.name;
    const aEvent = ancestor.ascendEvent != null ? STATE.eventIndex.get(ancestor.ascendEvent)
                 : ancestor.fallEvent   != null ? STATE.eventIndex.get(ancestor.fallEvent) : null;
    const aEventNote = aEvent ? ` — whose deeds shook the Murim in Year ${aEvent.year}` : '';
    const ev = chron("c-bloodline",
      `The blood remembers: ${ref(f)} — ${genWord(dist)}-generation descendant of ${aName}${aEventNote}, dead ${STATE.year - ancestor.diedYear} years — awakens the taint sleeping in their veins.${artNote}`,
      "epic", [f.id], [], ancestor.ascendEvent != null ? [ancestor.ascendEvent] : (ancestor.fallEvent != null ? [ancestor.fallEvent] : []));
    f.fallEvent = ev.id;
  }
}

/* ---- factions as institutions ---- */

function dissolveBloc(b, why, causes = []) {
  if (!b.alive) return null;
  b.alive = false; b.dissolvedYear = STATE.year;
  /* a fallen cult leaves a vacuum that takes a generation to refill —
     this is also what gives the alliance an enemy-free window to fracture */
  if (b.type === "cult") STATE.cultCooldownUntil = STATE.year + ri(18, 35);
  const ev = chron("c-schism",
    `${bref(b)} ${why}.`,
    "major", b.leaderId != null ? [b.leaderId] : [], b.memberSects, causes);
  b.dissolveEvent = ev.id;
  return ev;
}

/* a bloc whose 맹주/교주 has fallen raises a successor — for the cult,
   in blood. Feeds the causal chain: a leader's death → a succession crisis. */
function ensureBlocLeader(b) {
  const leader = blocLeader(b);
  if (leader && leader.alive) return;
  const sects = blocSects(b);
  /* the alliance raises its 맹주 on legitimacy and presence; the cult's
     throne goes to whoever is strongest enough to hold it */
  const best = b.type === "alliance" ? bestLeaderIn(sects) : strongestIn(sects);
  if (!best) return;
  const prevRef = leader ? ref(leader) : "the empty throne";
  const cause = leader && leader.fallEvent != null ? [leader.fallEvent] : [];
  b.leaderId = best.f.id; b.leaderSectId = best.s.id;

  if (b.type === "cult") {
    b.threatLed = !!best.f.isThreat;
    b.cohesion = clamp(b.cohesion - ri(12, 26), 0, 100);
    /* a throne seized by force, not granted — legitimacy rests on raw charisma */
    b.legitimacy = clamp(Math.round((best.f.charisma + best.f.power / 20) / 2), 0, 80);
    const ev = chron("c-faction",
      `The throne of ${bref(b)} falls vacant${leader ? ` with ${prevRef} slain` : ""}; ${ref(best.f)} seizes the title of 교주 in the succession struggle that follows.`,
      "major", [best.f.id], b.memberSects, cause);
    const rival = sects.flatMap(s => s.members.map(figById))
      .filter(x => x && x.alive && x.id !== best.f.id && x.realm >= 5)
      .sort((a, c) => c.power - a.power)[0];
    /* the weaker a new 교주's legitimacy, the more blood the throne demands */
    if (rival && chance(0.4 + (100 - b.legitimacy) / 250)) {
      killFigure(rival, "", [ev.id], best.f.id, {
        cls: "c-schism",
        html: `${ref(rival)}, who contested the throne of ${bref(b)}, is purged by the new 교주 ${ref(best.f)}.`,
        level: "major"
      });
    }
  } else {
    b.legitimacy = clamp(Math.round((best.s.legitimacy + best.f.charisma) / 2), 0, 100);
    const contested = best.f.charisma < 42 && sects.length >= 3;
    chron("c-faction",
      contested
        ? `With ${prevRef} fallen, the sects of ${bref(b)} reluctantly raise ${ref(best.f)} of ${sref(best.s)} as 맹주 — the strongest blade, though few are warmed by the choice.`
        : `With ${prevRef} fallen, the sects of ${bref(b)} raise ${ref(best.f)} of ${sref(best.s)} as the new 맹주.`,
      "major", [best.f.id], b.memberSects, cause);
  }
  best.f.fame += 8; maybeName(best.f);
}

/* the orthodox alliance, having no enemy left to bind it, dissolves into
   the old rivalries — the pendulum swings back from unity to infighting */
function fractureAlliance(b) {
  if (!b.alive) return;
  b.alive = false; b.dissolvedYear = STATE.year;
  const sects = blocSects(b);
  const cause = [];
  if (b.wonEvent != null) cause.push(b.wonEvent);
  else if (b.formEvent != null) cause.push(b.formEvent);
  const ev = chron("c-schism",
    `With no common enemy left to bind them, ${bref(b)} fractures from within — old rivalries and naked ambition resurface, and the great oath dissolves into mutual suspicion.`,
    "epic", b.leaderId != null ? [b.leaderId] : [], b.memberSects, cause);
  b.dissolveEvent = ev.id;
  const ranked = sects.map(s => ({ s, m: sectMight(s) })).sort((a, c) => c.m - a.m).map(x => x.s);
  if (ranked.length >= 2 && !warExists(ranked[0], ranked[1])) {
    const a = ranked[0], b2 = ranked[1];
    const wn = pick(WAR_NAMES);
    const w = { a: a.id, b: b2.id, name: wn[0], kr: wn[1], years: 0, start: STATE.year, startEvent: null };
    STATE.activeWars.push(w);
    a.atWarWith.push(b2.id); b2.atWarWith.push(a.id);
    const wev = chron("c-war",
      `The first blood of the new disorder: ${sref(a)} and ${sref(b2)}, once sworn brothers of ${bref(b)}, fall into open war — ${w.name} (${w.kr}) — over who should have led.`,
      "major", [], [a.id, b2.id], [ev.id]);
    w.startEvent = wev.id;
  }
}

/* ---- the unorthodox middle in bloc politics ---- */

/*
  A bloc courts a 사파 house. Whether it joins turns on the sect's own
  stance, its memory of past banners, and — for the alliance — raw leverage.
  An alliance strong enough can compel a weaker unorthodox house into the
  oath, but coercion plants a grudge the cult can later turn. Returns true
  if the sect ends up flying the bloc's banner.
*/
function courtUnorthodox(bloc, s, leaderFig, cause = []) {
  if (s.align !== "unorthodox" || !s.alive) return false;
  if (sectBloc(s.id)) return false;                 // already sworn elsewhere
  const grudge = blocGrudgeAgainst(s, bloc);

  let p = bloc.type === "alliance" ? 0.5 + s.stance / 200 : 0.5 - s.stance / 200;
  if (grudge && grudge.blocType === bloc.type) p -= 0.45;   // they remember this banner
  p = clamp(p, 0.02, 0.95);

  if (chance(p)) {
    bloc.memberSects.push(s.id);
    s.joinedBlocYear = STATE.year; s.coerced = false;
    if (bloc.type === "cult") {
      chron("c-faction",
        `${sref(s)}, long courted with promises of autonomy, throws in with ${bref(bloc)} — the unorthodox find the cult's terms more honest than the orthodox oath.`,
        "major", [], [s.id], cause);
    }
    return true;
  }

  /* the alliance can still compel a weaker 사파 house — at a cost it remembers */
  if (bloc.type === "alliance" && leaderFig && leaderFig.sect) {
    const ls = leaderFig.sect;
    const gap = sectMight(ls) - sectMight(s);
    if (gap > sectMight(s) * 0.4 && ls.prestige > 30 && chance(.55)) {
      bloc.memberSects.push(s.id);
      s.joinedBlocYear = STATE.year; s.coerced = true;
      s.stance = clamp(s.stance - ri(15, 30), -100, 100);
      ls.prestige -= ri(4, 9);
      const ev = chron("c-faction",
        `${sref(s)} is pressed into ${bref(bloc)} under the weight of its 맹주 — a humiliation the unorthodox house swallows, and remembers.`,
        "major", [leaderFig.id], [s.id], cause);
      addBlocGrudge(s, bloc, "strong-armed into the oath", ev.id);
      return true;
    }
  }
  return false;
}

/*
  The unorthodox middle reacts to how it is used: a willing ally warms to the
  oath; a coerced house festers and may defect to the cult; a house generations
  deep and intermarried into righteous lines may shed its 사파 repute entirely.
*/
function driftUnorthodox() {
  const C = cultBloc();
  for (const s of aliveSects()) {
    if (s.align !== "unorthodox") continue;
    const myBloc = sectBloc(s.id);
    if (myBloc && myBloc.type === "alliance") {
      s.loyalYears++;
      s.stance = clamp(s.stance + (s.coerced ? ri(-2, 2) : ri(2, 5)), -100, 100);
      /* a resentful, coerced house with somewhere to run repays the humiliation */
      if (s.coerced && s.stance <= -45 && C && C.alive && chance(.4)) {
        myBloc.memberSects = myBloc.memberSects.filter(id => id !== s.id);
        C.memberSects.push(s.id);
        s.joinedBlocYear = STATE.year; s.coerced = false;
        const g = blocGrudgeAgainst(s, myBloc);
        chron("c-schism",
          `${sref(s)} casts off the oath of ${bref(myBloc)} and defects to ${bref(C)} — an old humiliation repaid in betrayal.`,
          "major", [], [s.id], g && g.event != null ? [g.event] : []);
        myBloc.cohesion = clamp(myBloc.cohesion - ri(5, 12), 0, 100);
        continue;
      }
      /* a loyal, intermarried house, generations deep, becomes orthodox in truth */
      if (!s.coerced && s.marriedOrthodox && s.loyalYears >= 18 && s.stance >= 70 && chance(.25)) {
        s.align = "orthodox";
        chron("c-faction",
          `After generations beneath the orthodox banner — its blood now mingled with righteous houses — ${sref(s)} is reckoned a 정파 house in its own right, shedding the last of its unorthodox repute.`,
          "major", [], [s.id], myBloc.formEvent != null ? [myBloc.formEvent] : []);
      }
    } else if (myBloc && myBloc.type === "cult") {
      s.stance = clamp(s.stance - ri(2, 5), -100, 100);
      s.loyalYears++;
    } else {
      s.stance += s.stance > 0 ? -1 : (s.stance < 0 ? 1 : 0);   // free agents cool toward neutral
      s.loyalYears = 0;
    }
  }
}

export function sysFactions() {
  const threat = aliveFigs().find(f => f.isThreat) || null;
  const threatActive = STATE.threatActive && !!threat;
  const hadCult = cultBloc();

  /* the demonic houses unite under a 교주 — always around a Heavenly Demon,
     and otherwise only when the demonic sects grow truly dominant. A cooldown
     after a cult falls keeps the throne empty for a generation. */
  if (!cultBloc() && (threat || STATE.year >= STATE.cultCooldownUntil)) {
    const demonic = aliveSects().filter(s => s.align === "demonic");
    const canUnion = demonic.length >= 3 && chance(.15);
    if (threat || canUnion) {
      const led = threat || (bestLeaderIn(demonic) || {}).f;
      if (led) {
        const b = makeBloc("cult", "demonic",
          threat ? "the Heavenly Demon Cult" : "the Demonic Union",
          threat ? "천마신교" : "마교연합");
        b.memberSects = demonic.map(s => s.id);
        b.leaderId = led.id; b.leaderSectId = led.sect ? led.sect.id : null;
        b.threatLed = !!threat;
        STATE.blocs.push(b);
        const cause = threat && threat.ascendEvent != null ? [threat.ascendEvent] : [];
        const ev = chron("c-faction",
          `${threat ? `Under the Heavenly Demon ${ref(led)}` : `Led by ${ref(led)}`}, the demonic houses unite as ${bref(b)}. A single 교주 commands the Demonic Path, and all under heaven feel the cold.`,
          threat ? "epic" : "major", [led.id], b.memberSects, cause);
        b.formEvent = ev.id;
        /* the cult buys the disaffected unorthodox with offers of autonomy */
        for (const s of aliveSects().filter(x => x.align === "unorthodox" && x.stance <= -20))
          courtUnorthodox(b, s, led, [ev.id]);
      }
    }
  }

  /* the orthodox sects swear the oath of the Murim Alliance against the demonic tide */
  if (!allianceBloc() && (cultBloc() || threatActive)) {
    const orthodox = aliveSects().filter(s => s.align === "orthodox");
    const best = bestLeaderIn(orthodox);
    if (orthodox.length >= 2 && best) {
      const b = makeBloc("alliance", "orthodox", "the Murim Alliance", "무림맹");
      b.memberSects = orthodox.map(s => s.id);
      b.leaderId = best.f.id; b.leaderSectId = best.s.id;
      b.legitimacy = clamp(Math.round((best.s.legitimacy + best.f.charisma) / 2), 0, 100);
      const cult = cultBloc();
      if (cult) { b.rivalId = cult.id; cult.rivalId = b.id; }
      STATE.blocs.push(b);
      best.f.fame += 14; maybeName(best.f, true);
      const cause = [];
      if (cult && cult.formEvent != null) cause.push(cult.formEvent);
      else if (threat && threat.ascendEvent != null) cause.push(threat.ascendEvent);
      const ev = chron("c-faction",
        `The righteous houses set aside old feuds: ${b.memberSects.length} sects swear the oath of ${bref(b)}, raising ${ref(best.f)} of ${sref(best.s)} as 맹주 to stand against the demonic tide.`,
        "epic", [best.f.id], b.memberSects, cause);
      b.formEvent = ev.id;
      /* the alliance's first test of statecraft: win the unorthodox middle */
      for (const s of aliveSects().filter(x => x.align === "unorthodox"))
        courtUnorthodox(b, s, best.f, [ev.id]);
    }
  }

  /* a fallen Heavenly Demon throws the cult into crisis — it usually shatters
     (the alliance's hour of victory), but a successor may seize the throne and
     the cult endures as an ordinary union. Resolved before the prune below so
     the demon's defeat is narrated, not silently dropped as "no members left". */
  const fallenCult = cultBloc();
  if (fallenCult && fallenCult.threatLed && !threatActive) {
    const ally = allianceBloc();
    if (chance(.7) || !blocSects(fallenCult).length) {
      const cause = STATE.lastThreatFall != null ? [STATE.lastThreatFall] : (fallenCult.formEvent != null ? [fallenCult.formEvent] : []);
      const fell = dissolveBloc(fallenCult, "shatters without its 천마, its sects scattering back to the frontier", cause);
      if (ally && ally.alive && ally.wonEvent == null) {
        ally.wonEvent = chron("c-faction",
          `${bref(ally)} stands triumphant: with the Demonic Path broken, the orthodox world rests — for a season — at peace beneath its 맹주.`,
          "major", ally.leaderId != null ? [ally.leaderId] : [], ally.memberSects, fell ? [fell.id] : cause).id;
      }
    } else {
      fallenCult.threatLed = false;
      fallenCult.leaderId = null;   // force a 교주 succession struggle in the maintain loop
    }
  }

  /* maintain membership and leadership */
  for (const b of aliveBlocs()) {
    b.memberSects = b.memberSects.filter(sid => {
      const s = STATE.sects.find(x => x.id === sid);
      return s && s.alive;
    });
    for (const s of aliveSects()) {
      if (b.memberSects.includes(s.id)) continue;
      if (b.type === "cult" && s.align === "demonic") b.memberSects.push(s.id);
      else if (b.type === "alliance" && s.align === "orthodox" && chance(.5)) b.memberSects.push(s.id);
      else if (s.align === "unorthodox" && chance(.2)) courtUnorthodox(b, s, blocLeader(b), b.formEvent != null ? [b.formEvent] : []);
    }
    b.peakMembers = Math.max(b.peakMembers, b.memberSects.length);
    if (!b.memberSects.length) { dissolveBloc(b, "crumbles to nothing, its banners abandoned to the wind"); continue; }
    ensureBlocLeader(b);
  }

  /* reclusive doctrine sects occasionally slip away from blocs they were swept into */
  for (const b of aliveBlocs()) {
    b.memberSects = b.memberSects.filter(sid => {
      const s = STATE.sects.find(x => x.id === sid);
      if (!s || !s.alive) return true;
      if (DOCTRINES[s.doctrine]?.blocResist && chance(.07)) {
        chron("c-faction",
          `${sref(s)} — true to its reclusive ways — withdraws from ${bref(b)}, returning to the mountain silence it prefers to oaths.`,
          "normal", [], [s.id]);
        return false;
      }
      return true;
    });
  }

  /* the great war between the blocs — a clash of banners */
  const A = allianceBloc(), C = cultBloc();
  if (A && C && chance(.4)) {
    const la = blocLeader(A), lc = blocLeader(C);
    if (la && lc) {
      chron("c-war",
        `The banners of ${bref(A)} and ${bref(C)} clash in the field — ${pick(["ten thousand blades meet beneath a bleeding sky","the righteous and the demonic grind against one another","neither host yields a single pace"])}, and the realm holds its breath.`,
        "normal", [la.id, lc.id], [], A.formEvent != null ? [A.formEvent] : []);
    }
  }

  /* safety net: if a rival cult vanished by any path while the alliance still
     stands, that too is a victory — the prelude to fracturing from within */
  if (hadCult && !hadCult.alive && A && A.alive && A.wonEvent == null) {
    A.wonEvent = chron("c-faction",
      `${bref(A)} stands triumphant: with the Demonic Path broken, the orthodox world rests — for a season — at peace beneath its 맹주.`,
      "major", A.leaderId != null ? [A.leaderId] : [], A.memberSects,
      hadCult.dissolveEvent != null ? [hadCult.dissolveEvent] : []).id;
  }

  /* cohesion: the alliance frays once the common enemy is gone */
  if (A && A.alive) {
    const enemy = (cultBloc() && cultBloc().alive) || threatActive;
    if (enemy) A.cohesion = clamp(A.cohesion + ri(2, 6), 0, 96);
    else {
      A.cohesion -= ri(9, 16);
      if (A.cohesion <= 0) fractureAlliance(A);
    }
  }
  /* the cult rots slowly from within even in victory */
  const C2 = cultBloc();
  if (C2 && C2.alive) {
    C2.cohesion -= ri(2, 5);
    if (C2.cohesion <= 0) dissolveBloc(C2, "collapses into warlord infighting, each 마두 claiming the throne for themselves",
      C2.formEvent != null ? [C2.formEvent] : []);
  }

  /* the unorthodox middle shifts with the winds it has been made to weather */
  driftUnorthodox();
}

/* ---- sect succession crises ---- */

/* a head's death without a clear heir can shatter a sect — the breakaway
   faction founds a rival house, seeding a future war (a Phase 2 causal chain). */
function fractureSect(s, heir, rival, cause) {
  const unorthodox = s.align === "unorthodox";
  const splinter = makeSect({ align: s.align, prestige: Math.round(s.prestige * 0.5) });
  splinter.signatureArt = s.signatureArt;
  splinter.founded = STATE.year;
  const living = s.members.map(figById).filter(x => x && x.alive);
  const moved = [];
  /* unorthodox houses, having no rule of legitimacy, fragment harder —
     crews follow the strongest arm, not the rightful seat */
  const pullP = unorthodox ? 0.5 : 0.4;
  for (const f of living) {
    if (f === heir) continue;
    if (f === rival || chance(pullP)) {
      s.members = s.members.filter(id => id !== f.id);
      f.sect = splinter; addToSect(splinter, f); moved.push(f);
    }
  }
  rival.sect = splinter; splinter.headId = rival.id;
  splinter.founderId = rival.id; splinter.founderClan = rival.clan || null;
  s.headId = heir.id;
  /* a house that splits squanders the authority both halves once shared */
  legit(s, -ri(8, 15));
  splinter.legitimacy = clamp(s.legitimacy - ri(5, 12), 0, 100);
  STATE.sects.push(splinter);
  const ev = chron("c-schism",
    unorthodox
      ? `Might makes the master: with no rule of legitimacy to bind it, ${sref(s)} splits along its strongest arms — ${ref(rival)} carves off ${moved.length} blade${moved.length === 1 ? "" : "s"} into a breakaway crew, ${sref(splinter)}, owing ${ref(heir)} nothing but contempt.`
      : `Succession strife splits ${sref(s)}: denied the seat of 장문인 that passed to ${ref(heir)}, ${ref(rival)} breaks away with ${moved.length} follower${moved.length === 1 ? "" : "s"} to found ${sref(splinter)}.`,
    "major", [heir.id, rival.id], [s.id, splinter.id], cause);
  splinter.fallEvent = null;
  /* the schism births a mutual grudge — fuel for the wars to come */
  addGrudge(rival, heir.id, { event: ev.id });
  addGrudge(heir, rival.id, { event: ev.id });
  return ev;
}

/* ---- legitimacy: a claimant's argued right to the seat ----
   Succession in the murim is not won by the strongest arm but by whoever can
   convince enough of the house that they deserve to lead. Each candidate is
   measured across the sources of legitimacy; factions weigh those sources
   differently, and a seat changes hands when a coalition forms — or fractures
   the house when none can. */
function legitimacyProfile(s, c, dead) {
  const sources = {};
  /* Founder's Blood — shares the founding surname, or descends from the founder */
  if (s.founderClan && c.clan && c.clan === s.founderClan) sources.founderBlood = 28;
  else if (s.founderId != null && genDistance(c, s.founderId) > 0) sources.founderBlood = 20;
  /* Named Heir — the late head groomed them publicly */
  if (s.heirId === c.id) sources.heirDesignate = 34;
  /* Martial Merit — realm and raw power relative to the house */
  sources.martialMerit = clamp(Math.round(c.realm * 6 + (c.power / 60)), 0, 40);
  /* Elders' Assent — age, loyalty (a direct disciple of the head), service */
  let elder = 0;
  if (c.age >= 45) elder += 8;
  if (dead && c.master === dead.id) elder += 12;
  if (c.realm >= 5) elder += 6;
  if (elder) sources.elderApproval = elder;
  /* Popular Support — charisma wins the disciples' hearts */
  if ((c.charisma || 0) >= 45) sources.popularSupport = clamp(Math.round((c.charisma - 30) / 2.5), 0, 28);
  /* True to Doctrine — personality embodies (or betrays) the founding way */
  const docMatch = c.personality === s.doctrine;
  if (docMatch) sources.doctrineAlign = 22;
  else if (DOCTRINES[c.personality] && DOCTRINES[s.doctrine]) {
    /* a clashing personality actively costs legitimacy in a doctrinal house */
    const clash = (s.align === "orthodox" && (c.personality === "bloodthirsty" || c.personality === "mercenary"));
    if (clash) sources.doctrineAlign = -14;
  }
  /* Succession Tradition — conservative sects resist female heirs; matriarchal sects resist male */
  const tradition = s.successionTradition && SUCCESSION_TRADITIONS[s.successionTradition];
  if (tradition) {
    const bias = c.gender === "female" ? tradition.femaleBonus : tradition.maleBonus;
    if (bias !== 0) sources.traditionBias = bias;
  }
  const total = Object.values(sources).reduce((t, v) => t + v, 0);
  return { total, sources };
}

/* the internal blocs that form around a vacant seat, and which claimant each backs.
   Returns { factionKey: claimantId } — a coalition map. */
function formFactions(s, claimants, profiles, dead) {
  const living = s.members.map(figById).filter(x => x && x.alive);
  const support = {};
  const pickBy = (weigh) => {
    let best = null, bestV = -1e9;
    for (const c of claimants) {
      const v = weigh(c, profiles.get(c.id));
      if (v > bestV) { bestV = v; best = c; }
    }
    return best ? best.id : null;
  };
  /* Elders — value doctrine, the named heir, and the elders' own assent */
  if (living.some(f => f.age >= 50 || f.realm >= 5))
    support.elders = pickBy((c, p) => (p.sources.doctrineAlign || 0) + (p.sources.elderApproval || 0) + (p.sources.heirDesignate || 0) * 0.7);
  /* Young disciples — value strength and charisma; they want glory */
  if (living.some(f => f.age < 35))
    support.youth = pickBy((c, p) => (p.sources.martialMerit || 0) + (p.sources.popularSupport || 0));
  /* Founding family — values blood above all */
  if (s.founderClan && living.some(f => f.clan === s.founderClan))
    support.family = pickBy((c, p) => (p.sources.founderBlood || 0) * 2 + (p.sources.heirDesignate || 0) * 0.3);
  /* The blades — value the strongest fighter, nothing else */
  support.military = pickBy((c) => c.power);
  return support;
}

/* tally faction backing; returns the leading claimant and whether they hold a majority */
function tallyFactions(support) {
  const counts = {};
  for (const cid of Object.values(support)) if (cid != null) counts[cid] = (counts[cid] || 0) + 1;
  const total = Object.values(counts).reduce((t, v) => t + v, 0);
  let leadId = null, leadN = 0;
  for (const [cid, n] of Object.entries(counts)) if (n > leadN) { leadN = n; leadId = +cid; }
  return { counts, leadId, leadN, total, majority: total > 0 && leadN > total / 2 };
}

/* ---- heads age, and so they groom heirs long before they die ---- */
export function sysHeirGrooming() {
  for (const s of aliveSects()) {
    if (!s.headId || s.succession) continue;
    const head = figById(s.headId);
    if (!head || !head.alive) continue;
    /* only when the head feels mortality — old, or past their prime */
    const aging = head.age >= head.lifespan - 18 || head.age >= 55;
    if (!aging) continue;
    const pool = s.members.map(figById).filter(f => f && f.alive && f.id !== head.id && f.realm >= 2 && f.age < head.age - 5);
    if (pool.length < 1) continue;

    /* re-evaluate occasionally; a head may change their favourite */
    if (s.heirId != null && figById(s.heirId)?.alive && !chance(.04)) continue;
    if (!chance(.22)) continue;

    /* the head favours whoever best fits how THEY see the house — their own
       personality colours the choice (a Scholarly head grooms a scholar; a
       Bloodthirsty one grooms a killer), tempered by raw promise */
    const profiles = new Map(pool.map(c => [c.id, legitimacyProfile(s, c, head)]));
    let favourite = null, bestV = -1e9;
    for (const c of pool) {
      const p = profiles.get(c.id);
      let v = p.total + c.power / 40;
      if (c.personality === head.personality) v += 18;       // grooms in their own image
      if (c.master === head.id) v += 10;                      // a direct disciple
      if (s.founderClan && c.clan === s.founderClan) v += 6;
      if (v > bestV) { bestV = v; favourite = c; }
    }
    if (!favourite || favourite.id === s.heirId) continue;

    const prevHeir = s.heirId != null ? figById(s.heirId) : null;
    s.heirId = favourite.id;
    chron("c-faction",
      `${ref(head)}, 장문인 of ${sref(s)}, marks ${ref(favourite)} as successor-in-waiting${prevHeir && prevHeir.alive ? `, passing over ${ref(prevHeir)}` : ""}.`,
      "normal", [favourite.id, head.id], [s.id]);
    /* the passed-over resent it — resentment that ripens into a succession crisis */
    const passedOver = pool.filter(f => f.id !== favourite.id && f.power >= favourite.power * 0.8 && (f.realm >= 4 || (f.charisma||0) >= 55));
    for (const r of passedOver) {
      if (chance(.5)) addGrudge(r, favourite.id, { event: head.fallEvent });
    }
  }
}

export function sysSuccession() {
  for (const s of aliveSects()) {
    /* an active crisis advances on its own clock, independent of new deaths */
    if (s.succession) { advanceSuccessionCrisis(s); continue; }

    const living = s.members.map(figById).filter(x => x && x.alive).sort((a, b) => b.power - a.power);
    if (!living.length) { s.headId = null; continue; }
    const top = living[0];

    /* capture founder identity the first time a head takes the seat */
    if (s.headId == null) {
      s.headId = top.id;
      if (s.founderClan == null) { s.founderClan = top.clan || null; s.founderId = top.id; }
      continue;
    }
    const head = figById(s.headId);
    if (head && head.alive) {
      /* a vastly stronger member may eclipse a frail head without a full crisis,
         but only if the head lacks the legitimacy to hold the seat */
      if (head.id !== top.id && top.power > head.power * 1.5 && s.legitimacy < 55 && chance(.12)) {
        s.headId = top.id;
        chron("c-faction",
          `Power speaks where authority has thinned: ${ref(top)} eclipses ${ref(head)} as the true master of ${sref(s)} in all but name.`,
          "normal", [top.id, head.id], [s.id]);
      }
      continue;
    }

    /* THE SEAT IS VACANT — the head has died. Assemble claimants and weigh legitimacy. */
    openSuccession(s, head, living);
  }
}

/* gather claimants, form factions, and either resolve peacefully or open a crisis */
function openSuccession(s, dead, living) {
  const cause = dead && dead.fallEvent != null ? [dead.fallEvent] : [];
  if (living.length === 1) { s.headId = living[0].id; s.heirId = null; return; }

  /* claimants: the strongest, the most charismatic, the named heir, the blood */
  const ranked = [...living].sort((a, b) => b.power - a.power);
  const set = new Set();
  const claimants = [];
  const consider = f => { if (f && !set.has(f.id)) { set.add(f.id); claimants.push(f); } };
  ranked.slice(0, 3).forEach(consider);                                  // the mighty
  consider([...living].sort((a, b) => (b.charisma||0) - (a.charisma||0))[0]); // the beloved
  if (s.heirId != null) consider(figById(s.heirId));                     // the named heir
  if (s.founderClan) consider([...living].filter(f => f.clan === s.founderClan).sort((a,b)=>b.power-a.power)[0]);
  const cl = claimants.filter(Boolean).slice(0, 5);
  if (cl.length === 1) { s.headId = cl[0].id; s.heirId = null; legit(s, ri(2,5)); return; }

  const profiles = new Map(cl.map(c => [c.id, legitimacyProfile(s, c, dead)]));
  const support = formFactions(s, cl, profiles, dead);
  const tally = tallyFactions(support);

  /* a clear coalition + a legitimacy frontrunner who agrees → orderly succession.
     Low house legitimacy and high tension make consensus far less likely. */
  const frontrunner = [...cl].sort((a, b) => profiles.get(b.id).total - profiles.get(a.id).total)[0];
  const consensus = tally.majority && tally.leadId === frontrunner.id;
  const stabilityRoll = chance(clamp(s.legitimacy / 130 - (s.tensionDebt || 0) / 40, 0.05, 0.85));

  if (consensus && stabilityRoll) {
    /* peaceful — the path is named for why they won */
    const fr = frontrunner, prof = profiles.get(fr.id);
    const topSource = Object.entries(prof.sources).sort((a, b) => b[1] - a[1])[0];
    const why = topSource && LEGITIMACY_SOURCES[topSource[0]] ? LEGITIMACY_SOURCES[topSource[0]].claim : "the house is of one mind";
    s.headId = fr.id; s.heirId = null;
    legit(s, ri(3, 7));
    s.tensionDebt = Math.max(0, (s.tensionDebt || 0) - 3);
    chron("c-faction",
      `${ref(fr)} succeeds as 장문인 of ${sref(s)} — ${why}. The house holds together.`,
      "normal", [fr.id], [s.id], cause);
    return;
  }

  /* NO CONSENSUS — a living succession crisis begins. It will smoulder for years. */
  s.succession = {
    startYear: STATE.year,
    deadId: dead ? dead.id : null,
    claimantIds: cl.map(c => c.id),
    support, heat: 0,
    cause
  };
  legit(s, -ri(4, 9));
  const factionLines = Object.entries(support)
    .filter(([, cid]) => cid != null)
    .map(([fk, cid]) => `${SECT_FACTIONS[fk].label} for ${plainRef(figById(cid))}`);
  chron("c-schism",
    `The seat of 장문인 falls vacant in ${sref(s)}, and no one voice claims it. Factions form: ${factionLines.slice(0, 3).join("; ")}. A succession crisis grips the house.`,
    "major", cl.map(c => c.id), [s.id], cause);
}

/* a succession crisis is a state, not an instant — it builds, then breaks */
function advanceSuccessionCrisis(s) {
  const cr = s.succession;
  const claimants = cr.claimantIds.map(figById).filter(f => f && f.alive);
  /* deaths during the crisis thin the field; if it collapses to one, they win */
  if (claimants.length <= 1) {
    s.headId = claimants.length ? claimants[0].id : (s.members[0] || null);
    s.heirId = null; s.succession = null;
    if (claimants.length) chron("c-faction",
      `The succession crisis in ${sref(s)} ends quietly: ${ref(claimants[0])} alone remains to take the seat.`,
      "normal", claimants.length ? [claimants[0].id] : [], [s.id]);
    return;
  }

  const years = STATE.year - cr.startYear;
  /* heat rises with doctrinal tension and the closeness of the top two rivals */
  const byPower = [...claimants].sort((a, b) => b.power - a.power);
  const closeness = byPower.length >= 2 ? clamp(1 - (byPower[0].power - byPower[1].power) / Math.max(1, byPower[0].power), 0, 1) : 0;
  cr.heat += 1 + closeness * 2 + (s.tensionDebt || 0) / 25;
  legit(s, -ri(1, 3));   // every year of uncertainty bleeds authority

  /* the crisis resolves once it has built enough pressure (or simply dragged on) */
  const resolveP = clamp(cr.heat / 22 + years / 30, 0.05, 0.9);
  if (!chance(resolveP)) {
    /* interludes while the crisis simmers — rivals manoeuvre */
    if (chance(.18)) {
      const a = pick(claimants); let b = pick(claimants); let g=0; while (b===a && g++<4) b=pick(claimants);
      if (a !== b) {
        chron("c-faction",
          `In the long uncertainty gripping ${sref(s)}, ${ref(a)} and ${ref(b)} ${pick(["trade veiled threats in the council hall","gather followers in the night","each claim the founding will favours them"])}.`,
          "normal", [a.id, b.id], [s.id]);
        if (chance(.4)) addGrudge(a, b.id, { event: cr.cause && cr.cause[0] });
      }
    }
    return;
  }

  resolveSuccessionCrisis(s, claimants, byPower, closeness);
}

function resolveSuccessionCrisis(s, claimants, byPower, closeness) {
  const cause = s.succession.cause || [];
  const profiles = new Map(claimants.map(c => [c.id, legitimacyProfile(s, c, null)]));
  const byLegit = [...claimants].sort((a, b) => profiles.get(b.id).total - profiles.get(a.id).total);
  const champion = byLegit[0];       // most legitimate
  const strongman = byPower[0];      // most powerful
  const rival = byLegit[1] || byPower[1] || claimants.find(c => c !== champion);
  const unorthodox = s.align === "unorthodox";
  const highTension = (s.tensionDebt || 0) >= 5;

  /* choose how it breaks. In the murim a house rarely produces a single winner —
     far more often one side simply leaves. Schism is the default; the bloodier
     and more orderly paths are the exceptions, gated by who the claimants are. */
  let path;
  const strongLowLegit = strongman && profiles.get(strongman.id).total < profiles.get(champion.id).total * 0.7
                         && (strongman.personality === "bloodthirsty" || strongman.personality === "ambitious" || unorthodox);
  /* a peaceful institutional resolution is possible only in a house that has kept
     some authority through the crisis (legitimacy needn't be high, just not gutted) */
  const orderly = s.legitimacy >= 40 && (s.tensionDebt || 0) < 6;
  if (strongLowLegit && chance(.28)) path = "coup";                       // the cruel seize power — but rarely
  else if (orderly && chance(.4)) path = chance(.5) ? "elderVote" : "ritualDuel";  // stable houses settle it
  else if (s.founderClan && champion.clan === s.founderClan && chance(.35)) path = "familyTakeover";
  else if (closeness > 0.5 && (highTension || (s.tensionDebt || 0) >= 3) && chance(.4)) path = "civilWar";  // close + bitter = blood
  else path = chance(.82) ? "schism" : "peaceful";                       // otherwise: the house splits

  s.succession = null;   // the crisis ends here, however it ends

  switch (path) {
    case "coup": {
      /* the strongman seizes the seat by force, killing the rightful claimant */
      const victim = champion.id === strongman.id ? rival : champion;
      s.headId = strongman.id; s.heirId = null;
      legit(s, -ri(10, 20));
      const ev = chron("c-assassin",
        `Steel settles what words could not: ${ref(strongman)} seizes the seat of ${sref(s)} by force, and ${ref(victim)} — the rightful claim — does not survive the night.`,
        "major", [strongman.id, victim.id], [s.id], cause);
      killFigure(victim, "is cut down in the succession coup", [ev.id], strongman.id,
        { cls: "c-assassin", html: `${ref(victim)} falls to ${ref(strongman)}'s blades in the seizing of ${s.name}.` });
      break;
    }
    case "civilWar": {
      /* the house tears itself in two — a schism with blood */
      const ev0 = chron("c-war",
        `${sref(s)} turns its blades inward: the succession dispute between ${ref(champion)} and ${ref(rival)} erupts into open civil war within the house.`,
        "major", [champion.id, rival.id], [s.id], cause);
      const losers = claimants.filter(c => c !== champion && c !== rival);
      for (const l of losers) if (chance(.4)) killFigure(l, "falls in the sect's civil war", [ev0.id], champion.id);
      fractureSect(s, champion, rival, [ev0.id]);
      legit(s, -ri(8, 16));
      break;
    }
    case "schism": {
      fractureSect(s, champion, rival, cause);
      break;
    }
    case "familyTakeover": {
      s.headId = champion.id; s.heirId = null;
      legit(s, ri(2, 6));
      chron("c-faction",
        `The founding family closes ranks: ${ref(champion)}, of the founder's own blood, takes the seat of ${sref(s)} and the dissenters fall silent.`,
        "major", [champion.id], [s.id], cause);
      break;
    }
    case "elderVote": {
      s.headId = champion.id; s.heirId = null;
      legit(s, ri(4, 8));
      s.tensionDebt = Math.max(0, (s.tensionDebt || 0) - 2);
      chron("c-faction",
        `The council of elders convenes and names ${ref(champion)} as 장문인 of ${sref(s)}. The crisis passes without bloodshed.`,
        "major", [champion.id], [s.id], cause);
      break;
    }
    case "ritualDuel": {
      /* the two leading claimants settle it by the blade, before witnesses */
      const winner = strongman, loser = (strongman.id === champion.id) ? rival : champion;
      s.headId = winner.id; s.heirId = null;
      const lethal = chance(.35);
      const ev = chron("c-duel",
        `The seat of ${sref(s)} is decided by ritual duel: ${ref(winner)} defeats ${ref(loser)} before the assembled house${lethal ? ", and does not stay their blade" : " and is acknowledged master"}.`,
        "major", [winner.id, loser.id], [s.id], cause);
      if (lethal) killFigure(loser, "falls in the succession duel", [ev.id], winner.id);
      else addGrudge(loser, winner.id, { event: ev.id });
      legit(s, ri(1, 5));
      break;
    }
    case "outsiderSeizure": {
      s.headId = strongman.id; s.heirId = null;
      legit(s, -ri(4, 10));
      chron("c-faction",
        `${ref(strongman)} takes the seat of ${sref(s)} — a master whose nature the founders would scarcely recognise. The house is changed.`,
        "major", [strongman.id], [s.id], cause);
      break;
    }
    default: {  // peaceful, after a long crisis
      s.headId = champion.id; s.heirId = null;
      legit(s, ri(2, 5));
      chron("c-faction",
        `After years of uncertainty, ${sref(s)} settles on ${ref(champion)} as 장문인. The house exhales.`,
        "normal", [champion.id], [s.id], cause);
    }
  }
}

/* ---- the mortal world: regions as the substrate murim grows inside ---- */

const mid = a => (a[0] + a[1]) / 2;

function classifyRegion(r) {
  let era = "settled";
  if (r.population < 22) era = "emptying";
  else if (r.stability < 35) era = "scarred";
  else if (r.prosperity > 76 && r.stability > 68) era = "flourishing";
  if (era === r.era) return;
  const prev = r.era; r.era = era;
  if (STATE.year - (r.lastEraYear || 0) < 10) return;   // hysteresis against churn
  if (era === "settled" && prev !== "scarred" && prev !== "emptying") return;
  r.lastEraYear = STATE.year;
  const name = cap(r.name);
  const msg = {
    flourishing: `${name} flourishes — its markets swell and its villages send their gifted children to the sects.`,
    scarred:     `${name} lies scarred, its fields fallow and its people wary of every passing blade.`,
    emptying:    `${name} is emptying; those who can flee do, and only the desperate remain.`,
    settled:     `${name} settles into an uneasy quiet once more, its people drifting back to the fields.`
  }[era];
  chron("c-region", msg, era === "settled" ? "normal" : "major", [], []);
}

function pickTerrorRegion(cult) {
  const leader = cult ? blocLeader(cult) : null;
  if (leader && leader.sect) { const r = regionByName(leader.sect.region); if (r) return r; }
  const wild = STATE.regions.filter(r => r.terrain === "frontier" || r.terrain === "forest");
  return pick(wild.length ? wild : STATE.regions);
}

/* the dispossessed of a ruined region drift into the Gangho carrying talent
   and a grudge — tomorrow's unorthodox blades and demonic prodigies */
function spawnRefugee(r) {
  const f = makeFigure({ align: chance(.5) ? "unorthodox" : "demonic", realm: ri(0, 1), age: ri(14, 22), talent: ri(48, 93) });
  f.alignmentDrift = clamp(f.alignmentDrift + ri(8, 22), 0, 100);
  STATE.figures.push(f);
  if (chance(.5)) {
    chron("c-region",
      `Out of the ruin of ${r.name}, a ${pick(["orphaned","dispossessed","vengeful","half-starved"])} child named ${plainRef(f)} drifts into the Gangho with nothing but a grudge against the world.`,
      "normal", [f.id], []);
  }
}

export function sysRegions() {
  const cult = cultBloc();
  for (const r of STATE.regions) {
    const t = TERRAIN[r.terrain];
    r.stability  += (mid(t.stability)  - r.stability)  * 0.04;
    r.prosperity += (mid(t.prosperity) - r.prosperity) * 0.03;
    /* population settles toward what the land's prosperity and order can carry,
       so a scarred region recovers rather than emptying forever */
    const carrying = (r.prosperity + r.stability) / 2;
    r.population = clamp(r.population + (carrying - r.population) * 0.05, 0, 100);
    r.peakPop = Math.max(r.peakPop, r.population);
    classifyRegion(r);
  }
  /* a Heavenly Demon or a standing cult terrorises the land it touches */
  if ((STATE.threatActive || (cult && cult.alive)) && chance(.5)) {
    const target = pickTerrorRegion(cult);
    if (target) {
      scarRegion(target, ri(5, 12), ri(6, 14));
      if (chance(.4)) spawnRefugee(target);
    }
  }
  /* a sect's authority is anchored to the health of the seat it holds */
  for (const s of aliveSects()) {
    const r = regionByName(s.region);
    if (!r) continue;
    if (r.stability > 65 && chance(.1)) legit(s, 1);
    else if (r.stability < 28 && chance(.15)) legit(s, -1);
  }
}

/* ---- ideology: the fault lines that turn doctrine into history ---- */

export function sysIdeology() {
  for (const s of aliveSects()) {
    const living = s.members.map(figById).filter(x => x && x.alive);

    /* a righteous house quietly accrues debt for every disciple whose ki has
       strayed toward the demonic but whom it has not cast out */
    if (s.align === "orthodox") {
      const strayed = living.filter(f => f.alignmentDrift > 52).length;
      if (strayed) s.doctrinalDebt += strayed * 0.8;
    }

    /* doctrinal debt — a righteous house that survived by harbouring forbidden
       power must one day reckon with it: purge (if it still has the standing) or schism */
    const docPurge = DOCTRINES[s.doctrine]?.purgeThreshold || 0;
    if (s.align === "orthodox" && s.doctrinalDebt >= (24 + docPurge) && chance(.3)) {
      const tainted = living.filter(f => f.align !== "orthodox" || f.alignmentDrift > 45)
                            .sort((a, b) => b.alignmentDrift - a.alignmentDrift);
      if (s.legitimacy >= 45 && tainted.length) {
        const v = tainted[0];
        const ev = chron("c-schism",
          `The elders of ${sref(s)} move to cleanse the house: ${ref(v)}, whose methods strayed from the canon, is cast out to settle the debt of doctrine.`,
          "major", [v.id], [s.id]);
        v.sect = null; s.members = s.members.filter(id => id !== v.id);
        if (s.headId && s.headId !== v.id) addGrudge(v, s.headId, { event: ev.id });
        s.doctrinalDebt = Math.max(0, s.doctrinalDebt - ri(20, 35));
        legit(s, ri(3, 7));
      } else if (tainted.length >= 2 && living.length >= 2) {
        const heir = living.find(f => f.align === "orthodox") || living[0];
        const rebel = tainted.find(f => f !== heir) || tainted[0];
        if (heir !== rebel) { fractureSect(s, heir, rebel, []); s.doctrinalDebt = 0; }
      }
    }
    s.doctrinalDebt = Math.max(0, s.doctrinalDebt - 0.5);

    /* reform vs tradition — a renowned non-conformist forces the house's hand */
    const reformer = living.find(f => f.realm >= 4 && f.namedAt != null && !f.reformChecked &&
      ((f.art && f.art.align === "demonic") || (s.align === "orthodox" && f.align !== "orthodox")));
    if (reformer) {
      reformer.reformChecked = true;
      if (s.legitimacy >= 55 && chance(.5)) {
        const ev = chron("c-corrupt",
          `${sref(s)} condemns the unorthodox methods of ${ref(reformer)}; rebuked by a house that fears change, they leave to walk their own road.`,
          "major", [reformer.id], [s.id]);
        reformer.sect = null; s.members = s.members.filter(id => id !== reformer.id);
        if (s.headId && s.headId !== reformer.id) addGrudge(reformer, s.headId, { event: ev.id });
      } else {
        s.reformLean += ri(8, 16);
        if (s.align === "orthodox" && s.reformLean >= 30 && chance(.4)) {
          s.align = "unorthodox";
          chron("c-faction",
            `Year by year, ${sref(s)} has sheltered those the canon would reject; the wider Murim now reckons it an unorthodox house in all but its own telling.`,
            "major", [], [s.id]);
        }
      }
    }
  }
}

/* ---- imperial entanglement: an external claim on legitimacy ---- */

export function sysPatronage() {
  for (const s of aliveSects()) {
    if (s.region !== IMPERIAL_REGION || s.patron || s.align === "demonic" || !s.alive) continue;
    if (s.legitimacy >= 50 && chance(.05)) {
      s.patron = true;
      legit(s, ri(8, 15));
      const r = regionByName(s.region); if (r) r.prosperity = clamp(r.prosperity + ri(4, 8), 0, 100);
      chron("c-faction",
        `${sref(s)} accepts the patronage of the Imperial Court — gold and recognition flow in, but the martial world murmurs that a sword should bow to no throne.`,
        "major", [], [s.id]);
    }
  }
}

export function sysGrudgeDecay() {
  for (const f of aliveFigs()) {
    /* behavior driven by the figure's own personality, not the sect's founding doctrine */
    const pDoc = DOCTRINES[f.personality];
    /* bloodthirsty and wrathful personalities treat every grudge as a blood debt */
    if (pDoc?.bloodGrudge) {
      for (const tid of f.grudges) {
        if (f.grudgeMeta[tid]) f.grudgeMeta[tid].blood = true;
      }
    }
    /* wrathful personalities: nothing fades */
    if (!pDoc?.noForgive) decayGrudges(f);
  }
}

/* drama when a leader's personality clashes with the sect's founding doctrine */
export function sysTension() {
  for (const s of aliveSects()) {
    if (!s.headId) continue;
    const head = figById(s.headId);
    if (!head || !head.alive) continue;
    if (head.personality === s.doctrine) { s.tensionDebt = Math.max(0, s.tensionDebt - 2); continue; }
    s.tensionDebt = (s.tensionDebt || 0) + 1;
    if (s.tensionDebt < 4) continue;
    const foundDoc = DOCTRINES[s.doctrine];
    const headPers = DOCTRINES[head.personality];
    if (!foundDoc || !headPers) continue;
    const lines = [
      `The elders of ${sref(s)} mutter in the cloisters: their house was built as a ${foundDoc.label} institution, yet ${ref(head)} rules it as though ${headPers.label.toLowerCase()} were the only scripture.`,
      `${ref(head)} is not what ${sref(s)} was made for. The house's founding doctrine — ${foundDoc.label} — sits uneasily beside a head whose every action speaks of the ${headPers.label.toLowerCase()} path.`,
      `Tension has settled like sediment in ${sref(s)}. The sect was a ${foundDoc.label} house; its head, ${ref(head)}, walks a ${headPers.label.toLowerCase()} road. The gap between them widens.`
    ];
    const ev = chron("c-doctrine", pick(lines), "normal", [head.id], [s.id], []);
    s.tensionDebt = 0;
    legit(s, -ri(3, 7));
    /* after enough pressure, some members split off */
    if (s.tensionDebt >= 3 && s.members.length >= 4 && chance(.3)) {
      const splinter = s.members.map(figById).filter(f => f && f.alive && f.id !== s.headId);
      if (splinter.length >= 2) {
        const leader = splinter.sort((a, b) => b.power - a.power)[0];
        chron("c-schism",
          `Unable to reconcile the ${headPers.label.toLowerCase()} conduct of ${ref(head)} with the ${foundDoc.label} tradition they were raised in, ${ref(leader)} and a faction of ${sref(s)} break away to walk the old road in silence.`,
          "major", [leader.id], [s.id], [ev.id]);
        legit(s, -ri(5, 12));
      }
    }
  }
}

/* ---- legendary relics: forging, deeds, loss, rediscovery ---- */
export function sysRelics() {
  /* a new relic is forged or surfaces now and then */
  if (chance(.05) && STATE.relics.filter(r => !r.lost).length < 8) {
    const mighty = aliveFigs().filter(f => f.realm >= 4);
    const holder = mighty.length && chance(.7) ? pick(mighty) : null;
    const r = makeRelic({ holderId: holder ? holder.id : null, align: holder ? holder.align : undefined });
    if (holder) r.holderName = holder.name;
    STATE.relics.push(r);
    const ev = chron("c-relic",
      holder
        ? `A master smith completes ${rref(r)}; ${ref(holder)} takes it up, and the Gangho takes note.`
        : `${rref(r)} surfaces in the markets of ${pick(REGIONS)} — a ${r.noun} of fearsome repute, owner unknown.`,
      "major", holder ? [holder.id] : [], []);
    r.originEvent = ev.id;
    r.history.push({ year: STATE.year, holderId: holder ? holder.id : null, holderName: holder ? holder.name : null, deed: holder ? "was forged for" : "surfaced", eventId: ev.id });
    return;
  }

  /* a held relic occasionally performs a deed, or a lost one is rediscovered */
  for (const r of STATE.relics) {
    if (r.lost) {
      /* rediscovery: a lost relic resurfaces with its history intact */
      if (chance(.04)) {
        const cand = aliveFigs().filter(f => f.realm >= 2);
        if (!cand.length) continue;
        const finder = pick(cand);
        const lastDeed = r.history.length ? r.history[r.history.length - 1] : null;
        const age = STATE.year - (r.lostYear || r.forgedYear);
        const ev = chron("c-relic",
          `${rref(r)}, lost ${age} year${age === 1 ? '' : 's'}, is unearthed by ${ref(finder)}${lastDeed && lastDeed.holderName ? ` — the same ${r.noun} that once ${pick(RELIC_DEEDS)} ${lastDeed.holderName}'s age` : ''}. History stirs.`,
          "major", [finder.id], [], lastDeed && lastDeed.eventId != null ? [lastDeed.eventId] : (r.originEvent != null ? [r.originEvent] : []));
        setRelicHolder(r, finder);
        r.lostYear = null;
        r.history.push({ year: STATE.year, holderId: finder.id, holderName: finder.name, deed: "was rediscovered", eventId: ev.id });
      }
      continue;
    }
    /* keep holder pointer valid; if holder died without the death-hook firing, mark lost */
    const holder = r.holderId != null ? figById(r.holderId) : null;
    if (r.holderId != null && (!holder || !holder.alive)) { r.lost = true; r.lostYear = STATE.year; r.holderId = null; continue; }
    if (!holder) continue;
    /* a deed: tie the relic to a war the holder's sect is fighting */
    if (chance(.06) && STATE.activeWars.length) {
      const w = pick(STATE.activeWars);
      const ev = chron("c-relic",
        `In ${w.name} (${w.kr}), ${rref(r)} ${pick(["cuts a legend into the battlefield","turns the tide","drinks deep once more"])} in the hands of ${ref(holder)}.`,
        "normal", [holder.id], [], w.startEvent != null ? [w.startEvent] : []);
      r.history.push({ year: STATE.year, holderId: holder.id, holderName: holder.name, deed: "turned the tide of " + w.name, eventId: ev.id });
    }
  }
}

/* ---- tournaments: a public gathering where rankings shift ---- */
export function sysTournament() {
  if (!chance(.07)) return;
  const contenders = aliveFigs().filter(f => f.realm >= 3 && f.age < 70);
  if (contenders.length < 4) return;
  const tn = pick(TOURNEY_NAMES);
  const field = [...contenders].sort((a, b) => b.power - a.power).slice(0, Math.min(8, contenders.length));
  /* the strongest usually win, but talent and luck let an underdog break through */
  field.sort((a, b) => (b.power + b.talent * 2 + rand() * 240) - (a.power + a.talent * 2 + rand() * 240));
  const champ = field[0], runnerUp = field[1];
  const open = chron("c-tourney",
    `${tn[0]} (${tn[1]}) is convened — the mighty gather from across the Gangho to test their arts before the eyes of the world.`,
    "major", field.slice(0, 4).map(f => f.id), []);
  champ.fame += ri(8, 16); maybeName(champ);
  if (champ.sect) { champ.sect.prestige = clamp(champ.sect.prestige + ri(5, 12), 0, 100); legit(champ.sect, ri(2, 6)); }
  const upset = field.indexOf(contenders.sort((a, b) => b.power - a.power)[0]) > 1;
  const firstFemWin = champ.gender === "female" && !STATE.firstFemaleChampion;
  if (firstFemWin) STATE.firstFemaleChampion = true;
  chron("c-tourney",
    `${ref(champ)} stands victorious at ${tn[0]}, defeating ${ref(runnerUp)} in the final bout${upset ? " — an upset that will be spoken of for years" : ""}. ${champ.sect ? sref(champ.sect) + " basks in the glory." : "A wanderer's name echoes through the Gangho."}${firstFemWin ? ` The Murim falls quiet a moment — no woman has ever taken this stage before.` : ""}`,
    "major", [champ.id, runnerUp.id], champ.sect ? [champ.sect.id] : [], [open.id]);
  /* a grudge is born of a public defeat */
  if (chance(.4)) addGrudge(runnerUp, champ.id, { event: open.id });
}

/* ---- assassinations: a covert alternative to open war ---- */
export function sysAssassination() {
  const plotters = aliveFigs().filter(f => f.grudges.length && f.realm >= 3 &&
    (f.align !== "orthodox" || (DOCTRINES[f.personality] && (f.personality === "scheming" || f.personality === "mercenary" || f.personality === "wrathful"))));
  if (!plotters.length || !chance(.16)) return;
  const killer = pick(plotters);
  const targetId = pick(killer.grudges);
  const target = figById(targetId);
  if (!target || !target.alive) return;
  const cause = killer.grudgeCause[targetId] != null ? [killer.grudgeCause[targetId]] : [];
  /* the deadlier and more cunning the killer relative to the target, the better the odds */
  const edge = (killer.power + killer.talent * 3) / Math.max(1, target.power + target.talent * 3 + (target.realm >= 6 ? 400 : 0));
  const succeeds = chance(clamp(0.18 + edge * 0.32, 0.08, 0.7));
  if (succeeds) {
    killFigure(target, `is found slain in the night — a blade between the ribs, no witnesses`, cause, killer.id,
      { cls: "c-assassin", level: target.realm >= 5 ? "major" : "normal",
        html: `${ref(target)}${target.sect ? " of " + target.sect.name : ""} is found slain in the night, struck down by an unseen hand. Whispers name ${ref(killer)}.` });
  } else {
    const ev = chron("c-assassin",
      `An assassin's blade seeks ${ref(target)} in the dark — but the strike fails. ${pick(["The would-be killer flees into the night","Blood is shed, but not the blood intended","The attempt only sharpens the feud"])}, and suspicion falls on ${ref(killer)}.`,
      "normal", [target.id, killer.id], [], cause);
    addGrudge(target, killer.id, { event: ev.id, blood: true });
  }
}

/* ---- wandering hermits: figures who refuse all sects, becoming power vacuums ---- */
export function sysHermits() {
  /* a powerful figure occasionally renounces the sects to wander alone */
  if (chance(.05)) {
    const cand = aliveFigs().filter(f => f.sect && f.realm >= 5 && f.align !== "demonic" && f.age >= 40);
    if (cand.length) {
      const f = pick(cand);
      const oldSect = f.sect;
      oldSect.members = oldSect.members.filter(id => id !== f.id);
      f.sect = null; f.align = chance(.5) ? "recluse" : f.align;
      recomputeLife(f);
      chron("c-hermit",
        `${ref(f)} renounces ${sref(oldSect)} and all ties to the sects, vanishing into ${pick(["the deep mountains","the misted wilds","a nameless peak","the bamboo sea"])} to walk the path alone.`,
        "major", [f.id], [oldSect.id]);
      legit(oldSect, -ri(3, 8));
    }
  }
  /* a renowned wanderer becomes a gravity well — sects court them, or fear them.
     at most one such story surfaces in a given year, and only rarely */
  if (chance(.12)) {
    const hermits = aliveFigs().filter(f => !f.sect && f.realm >= 6 && f.namedAt != null);
    if (hermits.length) {
      const h = pick(hermits);
      const suitors = aliveSects().filter(s => s.alive && (s.align === h.align || h.align === "recluse"));
      if (suitors.length && chance(.4)) {
        const s = suitors.sort((a, b) => sectMight(b) - sectMight(a))[0];
        chron("c-hermit",
          `${sref(s)} sends envoys deep into the wilds, beseeching the hermit ${ref(h)} to lend their strength. ${pick(["The mountain does not answer","Whether they will descend, none can say","The offer hangs unanswered in the mist"])}.`,
          "normal", [h.id], [s.id]);
      } else {
        chron("c-hermit",
          `Travellers speak in hushed tones of ${ref(h)}, the hermit whose power rivals any sect master — a storm that bows to no banner.`,
          "normal", [h.id], []);
      }
    }
  }
}

/* ── Legendary Titles ──────────────────────────────────────────────────────
   Each title has at most one living holder. Once per year we check whether
   anyone has crossed the threshold. The Heavenly Demon (천마) is handled
   separately by sysCorruptionAndThreat; we only sync its legendaryTitle here.
   Titles are stripped on death by killFigure (via passLegendaryTitleOnDeath).
   ──────────────────────────────────────────────────────────────────────── */
export function sysLegendaryTitles() {
  const alive = aliveFigs();

  /* sync Heavenly Demon — whoever has isThreat is the Heavenly Demon */
  for (const f of alive) {
    if (f.isThreat && (!f.legendaryTitle || f.legendaryTitle.kind !== "heavenly-demon")) {
      f.legendaryTitle = { kind: "heavenly-demon", en: "Heavenly Demon", kr: "천마" };
    }
    if (!f.isThreat && f.legendaryTitle && f.legendaryTitle.kind === "heavenly-demon") {
      f.legendaryTitle = null;
    }
  }

  /* collect which title kinds are already held */
  const held = new Set(alive.filter(f => f.legendaryTitle).map(f => f.legendaryTitle.kind));

  for (const title of LEGENDARY_TITLES) {
    if (held.has(title.kind)) continue;          // seat occupied
    if (!chance(.15)) continue;                  // only check ~15% of years per title

    /* find candidates: realm, path, alignment all must qualify */
    const candidates = alive.filter(f => {
      if (f.realm < title.realmMin) return false;
      if (title.alignReq && !title.alignReq.includes(f.align)) return false;
      if (title.pathReq) {
        const artPath = f.art ? f.art.path : "inner";
        if (!title.pathReq.includes(artPath)) return false;
      }
      if (f.legendaryTitle) return false;        // can't hold two titles
      return title.test(f, STATE);
    });

    if (!candidates.length) continue;

    /* pick the most powerful / famous candidate */
    const winner = candidates.sort((a, b) => (b.power + b.fame * 0.5) - (a.power + a.fame * 0.5))[0];
    winner.legendaryTitle = { kind: title.kind, en: title.en, kr: title.kr };
    winner.fame += 25;
    maybeName(winner);

    chron("c-rise",
      title.announce(winner),
      title.realmMin >= 8 ? "epic" : "major",
      [winner.id]);

    held.add(title.kind);
  }
}

/* strip legendary title on death (called inside killFigure) */
/* ── Historic Firsts ──────────────────────────────────────────────────────
   Detects and records moments that break gender expectations for the first
   time in this world's history: first female sect head in a patriarchal
   house, first female Nature Realm cultivator, first female bloc leader.
   ──────────────────────────────────────────────────────────────────────── */
export function sysFirstMoments() {
  /* 1. sect heads */
  for (const s of aliveSects()) {
    if (!s.headId) continue;
    const head = figById(s.headId);
    if (!head) continue;
    if (head.gender === "female" && !STATE.firstFemaleHeadSects.has(s.id)) {
      STATE.firstFemaleHeadSects.add(s.id);
      const isPatriarchal = s.successionTradition === "patriarchal";
      const note = isPatriarchal
        ? `, breaking the patriarchal tradition (부계) of the house`
        : s.successionTradition === "matriarchal" ? ""
        : `, a first in the history of the house`;
      chron("c-rise",
        `${ref(head)} takes the seat of 장문인 in ${sref(s)}${note}. History turns a quiet page.`,
        "major", [head.id], [s.id]);
      if (isPatriarchal) {
        /* conservative elders resist — legitimacy dips and tension rises */
        legit(s, ri(-18, -10));
        s.tensionDebt = clamp((s.tensionDebt || 0) + ri(8, 14), 0, 100);
        if (s.legitimacy < 35 && !s.succession) {
          chron("c-faction",
            `The elders of ${sref(s)} mutter against ${ref(head)}'s authority. A house divided between tradition and the weight of her talent.`,
            "normal", [head.id], [s.id]);
        }
      }
    }
    if (head.gender === "male" && s.successionTradition === "matriarchal" && !STATE.firstMaleHeadSects.has(s.id)) {
      STATE.firstMaleHeadSects.add(s.id);
      chron("c-rise",
        `${ref(head)} takes the seat of 장문인 in ${sref(s)}, the first man to lead a house that has always passed its seat to women.`,
        "major", [head.id], [s.id]);
    }
  }

  /* 2. Nature Realm (apex) — has any woman reached it? */
  if (!STATE.firstFemaleRealm8) {
    const apex = aliveFigs().find(f => f.gender === "female" && f.realm >= 8);
    if (apex) {
      STATE.firstFemaleRealm8 = true;
      apex.fame += 20;
      chron("c-break",
        `Heaven itself takes notice for a second reason: ${ref(apex)} has reached the <b style="color:var(--gold-bright)">Nature Realm (자연경)</b> — and the Murim, which has always spoken of this pinnacle in the voice of men, finds it has no words ready.`,
        "epic", [apex.id]);
    }
  }

  /* 3. Bloc / alliance leader */
  if (!STATE.firstFemaleBloc) {
    for (const b of aliveBlocs()) {
      if (!b.leaderId) continue;
      const leader = figById(b.leaderId);
      if (leader && leader.gender === "female") {
        STATE.firstFemaleBloc = true;
        leader.fame += 14;
        chron("c-rise",
          `${ref(leader)} stands at the head of ${bref(b)} — the first woman to hold the title of 맹주 in a generation that doubted it possible.`,
          "epic", [leader.id]);
        break;
      }
    }
  }
}

function passLegendaryTitleOnDeath(f) {
  if (!f.legendaryTitle) return;
  const t = f.legendaryTitle;
  if (t.kind === "heavenly-demon") return; // already handled by threat system
  chron("c-fall",
    `With the death of ${ref(f)}, the seat of <b class="leg-title">${t.en} (${t.kr})</b> stands empty. The Murim will not soon forget.`,
    "major", [f.id]);
  f.legendaryTitle = null;
}

export function tick() {
  STATE.season++;
  if (STATE.season > 3) { STATE.season = 0; STATE.year++; }
  const yearTurn = STATE.season === 0;

  sysCultivation();
  sysFame();
  if (yearTurn) {
    sysAging();
    sysRegions();          // the mortal world breathes first; recruitment reads it
    sysHeirGrooming();
    sysSuccession();
    sysRecruitment();
    sysArtEvolution();
    sysArtRefinement();
    sysRivalryAndWar();
    sysTournament();
    sysAssassination();
    sysCorruptionAndThreat();
    sysHermits();
    sysRelics();
    sysLegendaryTitles();
    sysFirstMoments();
    sysFactions();
    sysIdeology();
    sysPatronage();
    sysLostAndFound();
    sysSectFortune();
    sysHeroicArcs();
    sysBonds();
    sysProcreation();
    sysVengeance();
    sysBloodlineAwakening();
    sysEraCommentary();
    sysGrudgeDecay();
    sysTension();
  }
  STATE.dirtyPanels = true;
}
