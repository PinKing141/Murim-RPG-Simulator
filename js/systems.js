import { rand, ri, pick, chance, clamp, cap } from './rng.js';
import { REGIONS, REALMS, REALM_KR, APEX, PATH_FLAVOR, WAR_NAMES, ALIGN } from './data.js';
import { STATE, aliveFigs, aliveSects, figById, makeFigure, makeSect, addToSect, recomputeLife, recomputePower, makeByeolho } from './state.js';
import { chron, ref, plainRef, sref, aref, bref } from './chronicle.js';
import {
  addGrudge, decayGrudges, bloodGrudges, dropGrudge, inheritGrudgesOnDeath,
  propagateTaintFrom, genDistance, makeChild
} from './bloodlines.js';
import {
  makeBloc, aliveBlocs, allianceBloc, cultBloc, sectBloc,
  blocLeader, blocSects, strongestIn
} from './factions.js';

export function maybeName(f, force, causes = []) {
  if (f.namedAt != null) return null;
  if (force || (f.realm >= 3 && f.fame >= 14)) {
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
    } else if (na === "unorthodox" && before === "orthodox") {
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
  return deathEv;
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
  if (victims.length > 1 && chance(.6)) {
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
    f.progress += gain;
    if (f.progress >= 100) {
      f.progress = 0; f.realm++;
      f.realmHistory.push({ year: STATE.year, realm: f.realm });
      recomputeLife(f); recomputePower(f);
      f.fame += 3 + f.realm;
      const fl = PATH_FLAVOR[f.align];
      if (f.realm >= 3) {
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
    if (chance(.04)) { f.fame += rand() * 2; maybeName(f); }
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
    if (living.length < 3) {
      for (let i = 0; i < ri(1, 2); i++) {
        const f = makeFigure({ align: s.align, sect: s, art: s.signatureArt, realm: 0, age: ri(13,18), talent: ri(15,70) });
        addToSect(s, f); STATE.figures.push(f);
        if (s.signatureArt) s.signatureArt.holders++;
      }
    } else if (chance(.35) && living.length < 14) {
      const master = pick(living.filter(x => x.realm >= 3)) || pick(living);
      const f = makeFigure({ align: s.align, sect: s, art: s.signatureArt, realm: 0, age: ri(12,17), talent: ri(15,75), master: master ? master.id : null });
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

export function sysArtRefinement() {
  for (const a of STATE.arts) {
    if (a.lost || a.dormant) continue;
    const masters = aliveFigs().filter(f => f.art === a && f.realm >= 5);
    if (masters.length && chance(.12) && a.tier < 9) {
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
  if (sects.length >= 2 && STATE.activeWars.length < 2 && chance(.22)) {
    const a = pick(sects); let b = pick(sects); let g = 0; while (b === a && g++ < 5) b = pick(sects);
    if (a !== b && !warExists(a, b)) {
      const enemyPaths = (a.align === "demonic" && b.align === "orthodox") || (a.align === "orthodox" && b.align === "demonic");
      if (enemyPaths || chance(.4)) {
        const wn = pick(WAR_NAMES);
        const w = { a: a.id, b: b.id, name: wn[0], kr: wn[1], years: 0, start: STATE.year, startEvent: null };
        STATE.activeWars.push(w);
        a.atWarWith.push(b.id); b.atWarWith.push(a.id);
        /* a feud between members of the two houses is the seed of the war when one exists */
        const grudgeEv = grudgeCauseBetween(a, b);
        const cause = grudgeEv != null ? "a feud long left to fester" :
          enemyPaths ? "the orthodox cannot abide the demonic" :
          pick(["a stolen manual","an assassinated elder","a contested mountain","an old blood-debt","a marriage betrayed","a duel gone wrong"]);
        const ev = chron("c-war",
          `${pick(["Banners rise","War drums sound","Blood is sworn"])}: ${sref(a)} and ${sref(b)} fall into open war — ${w.name} (${w.kr}) — over ${cause}.`,
          "major", [], [a.id, b.id], grudgeEv != null ? [grudgeEv] : []);
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
      if (f.art && f.art.corruption > 30) {
        drift += rand() * 1.5;
        if (f.originEvent != null) causes.push(f.originEvent);
        else if (f.art.lostEvent != null) causes.push(f.art.lostEvent);
      }
      if (f.grudges.length) {
        drift += rand() * 1.2;
        for (const tid of f.grudges) { if (f.grudgeCause[tid] != null) { causes.push(f.grudgeCause[tid]); break; } }
      }
      if (STATE.activeWars.length) drift += rand() * 0.6;
      if (drift > 0) alignShift(f, drift, null, causes);
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
          champ.fame += 20; maybeName(champ);
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
    const f = makeFigure({ align: a.dormant ? "demonic" : (a.align === "demonic" ? "unorthodox" : a.align), realm: 1, age: ri(15,24), talent: arch.t, art: a });
    a.lost = false; a.dormant = false; a.holders = 1;
    if (a.lostHolder) { f.lineage = a.lostHolder + "'s legacy"; f.lineageId = prevHolderId; }
    STATE.figures.push(f);
    const found = chron("c-found2",
      `In ${pick(REGIONS)}, ${arch.n} named ${plainRef(f)} stumbles upon ${aref(a)}, lost ${STATE.year - (a.lostYear || a.origin)} years. Fate chooses strangely.`,
      "major", [f.id], [], lostEv != null ? [lostEv] : []);
    f.originEvent = found.id;
    if (a.dormant || a.corruption > 50) {
      chron("c-corrupt",
        `The manual is steeped in old malice. Those who hear of it fear what ${plainRef(f)} may become.`,
        "normal", [f.id], [], [found.id]);
    }
  }
}

export function sysSectFortune() {
  for (const s of aliveSects()) {
    s.prestige = clamp(s.prestige + (rand() - 0.45) * 4, 0, 100);
    if (s.prestige <= 4 && chance(.5)) dissolveSect(s, "withered into obscurity, its halls left empty");
  }
  if (aliveSects().length < 7 && chance(.16)) {
    const wanderers = aliveFigs().filter(f => !f.sect && f.realm >= 5);
    if (wanderers.length) {
      const founder = pick(wanderers);
      const s = makeSect({ align: founder.align, prestige: ri(30,50) });
      s.signatureArt = founder.art || pick(STATE.arts.filter(a => !a.lost)) || null;
      founder.sect = s;
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
        const arc = pick([
          { cls: "c-peace",   kind: "brother",  fn: () => `${ref(a)} and ${ref(b)} swear brotherhood beneath the peach blossoms, vowing to share fortune and ruin alike.` },
          { cls: "c-duel",    kind: "duel",     fn: () => `A bitter duel: ${ref(a)} defeats ${ref(b)} atop ${pick(["Sword-Testing Cliff","the Frozen Pavilion","Lone Goose Peak","the Drunken Bridge"])}, sparing their life — and earning a lifelong grudge.` },
          { cls: "c-lineage", kind: "betray",   fn: () => `${ref(b)} betrays ${ref(a)}, stealing a page of their manual under the new moon.` },
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
    if (a.namedAt != null || b.namedAt != null || a.clan || b.clan || stateMatch) {
      const line = stateMatch
        ? ` — a marriage of state (정략혼) knitting two houses of ${bref(ba)} closer`
        : (a.clan || b.clan) ? ` — a union binding the ${a.clan || b.clan} (${(a.clan||b.clan)}세가) line` : "";
      chron("c-bond", `${ref(a)} and ${ref(b)} are wed${line}.`, "normal", [a.id, b.id]);
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
      const kin = (f.parents.includes(t.killedBy) || (figById(t.id) && false)) ? "" : "";
      const html = `${ref(f)} hunts down ${ref(t)} at last — a blood debt, sworn ${STATE.year - (meta ? meta.born : STATE.year)} years past, paid in full in steel.`;
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
    const ev = chron("c-bloodline",
      `The blood remembers: ${ref(f)} — ${genWord(dist)}-generation descendant of the Heavenly Demon ${aName}, dead ${STATE.year - ancestor.diedYear} years before they were ever born — awakens the taint sleeping in their veins.${artNote}`,
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
  const best = strongestIn(sects);
  if (!best) return;
  const prevRef = leader ? ref(leader) : "the empty throne";
  const cause = leader && leader.fallEvent != null ? [leader.fallEvent] : [];
  b.leaderId = best.f.id; b.leaderSectId = best.s.id;

  if (b.type === "cult") {
    b.threatLed = !!best.f.isThreat;
    b.cohesion = clamp(b.cohesion - ri(12, 26), 0, 100);
    const ev = chron("c-faction",
      `The throne of ${bref(b)} falls vacant${leader ? ` with ${prevRef} slain` : ""}; ${ref(best.f)} seizes the title of 교주 in the succession struggle that follows.`,
      "major", [best.f.id], b.memberSects, cause);
    const rival = sects.flatMap(s => s.members.map(figById))
      .filter(x => x && x.alive && x.id !== best.f.id && x.realm >= 5)
      .sort((a, c) => c.power - a.power)[0];
    if (rival && chance(.6)) {
      killFigure(rival, "", [ev.id], best.f.id, {
        cls: "c-schism",
        html: `${ref(rival)}, who contested the throne of ${bref(b)}, is purged by the new 교주 ${ref(best.f)}.`,
        level: "major"
      });
    }
  } else {
    chron("c-faction",
      `With ${prevRef} fallen, the sects of ${bref(b)} raise ${ref(best.f)} of ${sref(best.s)} as the new 맹주.`,
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
      const led = threat || (strongestIn(demonic) || {}).f;
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
      }
    }
  }

  /* the orthodox sects swear the oath of the Murim Alliance against the demonic tide */
  if (!allianceBloc() && (cultBloc() || threatActive)) {
    const orthodox = aliveSects().filter(s => s.align === "orthodox");
    const best = strongestIn(orthodox);
    if (orthodox.length >= 2 && best) {
      const b = makeBloc("alliance", "orthodox", "the Murim Alliance", "무림맹");
      b.memberSects = orthodox.map(s => s.id);
      for (const s of aliveSects().filter(x => x.align === "unorthodox")) if (chance(.45)) b.memberSects.push(s.id);
      b.leaderId = best.f.id; b.leaderSectId = best.s.id;
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
    }
    b.peakMembers = Math.max(b.peakMembers, b.memberSects.length);
    if (!b.memberSects.length) { dissolveBloc(b, "crumbles to nothing, its banners abandoned to the wind"); continue; }
    ensureBlocLeader(b);
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
}

/* ---- sect succession crises ---- */

/* a head's death without a clear heir can shatter a sect — the breakaway
   faction founds a rival house, seeding a future war (a Phase 2 causal chain). */
function fractureSect(s, heir, rival, cause) {
  const splinter = makeSect({ align: s.align, prestige: Math.round(s.prestige * 0.5) });
  splinter.signatureArt = s.signatureArt;
  splinter.founded = STATE.year;
  const living = s.members.map(figById).filter(x => x && x.alive);
  const moved = [];
  for (const f of living) {
    if (f === heir) continue;
    if (f === rival || chance(.4)) {
      s.members = s.members.filter(id => id !== f.id);
      f.sect = splinter; addToSect(splinter, f); moved.push(f);
    }
  }
  rival.sect = splinter; splinter.headId = rival.id;
  s.headId = heir.id;
  STATE.sects.push(splinter);
  const ev = chron("c-schism",
    `Succession strife splits ${sref(s)}: denied the seat of 장문인 that passed to ${ref(heir)}, ${ref(rival)} breaks away with ${moved.length} follower${moved.length === 1 ? "" : "s"} to found ${sref(splinter)}.`,
    "major", [heir.id, rival.id], [s.id, splinter.id], cause);
  splinter.fallEvent = null;
  /* the schism births a mutual grudge — fuel for the wars to come */
  addGrudge(rival, heir.id, { event: ev.id });
  addGrudge(heir, rival.id, { event: ev.id });
  return ev;
}

export function sysSuccession() {
  for (const s of aliveSects()) {
    const living = s.members.map(figById).filter(x => x && x.alive).sort((a, b) => b.power - a.power);
    if (!living.length) { s.headId = null; continue; }
    const top = living[0];
    if (s.headId == null) { s.headId = top.id; continue; }
    const head = figById(s.headId);
    if (head && head.alive) {
      /* a clearly stronger member may eclipse an aging head without crisis */
      if (head.id !== top.id && top.power > head.power * 1.4 && chance(.2)) s.headId = top.id;
      continue;
    }
    /* the 장문인 has died — is there a clear heir? */
    const cause = head && head.fallEvent != null ? [head.fallEvent] : [];
    const heirClear = top.realm >= 4 &&
      (living.length < 2 || top.power >= living[1].power * 1.25) &&
      (top.master === s.headId ||
       (top.clan && head && head.clan && top.clan === head.clan) ||
       chance(.4));
    if (!heirClear && living.length >= 2 && chance(.55)) {
      fractureSect(s, top, living[1], cause);
    } else {
      s.headId = top.id;
      if (top.realm >= 4 && chance(.5)) {
        chron("c-faction",
          `${ref(top)} succeeds as 장문인 of ${sref(s)}, taking up the seat left empty${head ? ` by ${ref(head)}` : ""}.`,
          "normal", [top.id], [s.id], cause);
      }
    }
  }
}

export function sysGrudgeDecay() {
  for (const f of aliveFigs()) decayGrudges(f);
}

export function tick() {
  STATE.season++;
  if (STATE.season > 3) { STATE.season = 0; STATE.year++; }
  const yearTurn = STATE.season === 0;

  sysCultivation();
  sysFame();
  if (yearTurn) {
    sysAging();
    sysSuccession();
    sysRecruitment();
    sysArtRefinement();
    sysRivalryAndWar();
    sysCorruptionAndThreat();
    sysFactions();
    sysLostAndFound();
    sysSectFortune();
    sysHeroicArcs();
    sysBonds();
    sysProcreation();
    sysVengeance();
    sysBloodlineAwakening();
    sysGrudgeDecay();
  }
  STATE.dirtyPanels = true;
}
